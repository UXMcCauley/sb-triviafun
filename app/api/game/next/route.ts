import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { QuestionModel } from '@/lib/models/question';
import { getPusherServer } from '@/lib/pusher';
import { getShuffledQuestion } from '@/lib/game-helpers';
import type { PlayerResult } from '@/lib/models/types';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode, action } = await request.json();

    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const pusher = getPusherServer();
    const timerSeconds = game.settings.timerSeconds;

    // action: 'reveal' — reveal the current answer and show who got it right
    // action: 'advance' (or undefined for backward compat) — send the next question
    if (action === 'advance') {
      const nextIndex = game.currentQuestionIndex + 1;

      if (nextIndex >= game.questions.length) {
        // Game over
        game.status = 'finished';
        game.questionStartedAt = null;
        await game.save();

        const sortedPlayers = [...game.players]
          .sort((a, b) => b.score - a.score)
          .map((p) => ({ id: p.id, name: p.name, score: p.score }));

        const winner = sortedPlayers[0] || { id: '', name: 'No one', score: 0 };
        await pusher.trigger(`game-${game.gameCode}`, 'game-finished', {
          players: sortedPlayers,
          winner,
        });

        return NextResponse.json({ finished: true, winner });
      }

      // Advance to next question — need to populate the question
      const questionId = game.questions[nextIndex];
      const question = await QuestionModel.findById(questionId);
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 500 });
      }

      const now = Date.now();
      game.currentQuestionIndex = nextIndex;
      game.questionStartedAt = now;
      await game.save();

      const optionOrder = game.shuffledOptionOrders[nextIndex];
      const shuffled = getShuffledQuestion(question, optionOrder);

      await pusher.trigger(`game-${game.gameCode}`, 'new-question', {
        questionIndex: nextIndex,
        questionText: shuffled.questionText,
        options: shuffled.options,
        category: shuffled.category,
        difficulty: shuffled.difficulty,
        totalQuestions: game.questions.length,
        startedAt: now,
        timerDuration: timerSeconds,
      });

      return NextResponse.json({ finished: false, nextIndex });
    }

    // Default: reveal answer
    const qIdx = game.currentQuestionIndex;
    const correctAnswerIndex = game.shuffledCorrectAnswers[qIdx];

    // Populate the question for source info
    const questionId = game.questions[qIdx];
    const currentQuestion = await QuestionModel.findById(questionId);

    // Get source from the shuffled question
    const source = currentQuestion?.source || null;

    // Build per-player results sorted by speed (fastest correct first, then incorrect)
    const playerResults: PlayerResult[] = game.players.map((p) => {
      const answer = p.answers.find(
        (a: { questionIndex: number }) => a.questionIndex === qIdx
      );
      if (!answer) {
        return {
          id: p.id,
          name: p.name,
          correct: false,
          timeToAnswer: timerSeconds,
          pointsEarned: 0,
          totalScore: p.score,
        };
      }
      const timeRemaining = Math.max(0, timerSeconds - answer.timeToAnswer);
      const pointsEarned = answer.correct
        ? 1000 + Math.round((timeRemaining / timerSeconds) * 500)
        : 0;
      return {
        id: p.id,
        name: p.name,
        correct: answer.correct,
        timeToAnswer: answer.timeToAnswer,
        pointsEarned,
        totalScore: p.score,
      };
    });

    // Sort: correct answers first (by speed), then incorrect
    playerResults.sort((a, b) => {
      if (a.correct && !b.correct) return -1;
      if (!a.correct && b.correct) return 1;
      if (a.correct && b.correct) return a.timeToAnswer - b.timeToAnswer;
      return 0;
    });

    const sortedPlayers = [...game.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    await pusher.trigger(`game-${game.gameCode}`, 'answer-reveal', {
      questionIndex: qIdx,
      correctAnswerIndex,
      playerResults,
      players: sortedPlayers,
      source,
    });

    const isLastQuestion = game.currentQuestionIndex + 1 >= game.questions.length;
    return NextResponse.json({ revealed: true, isLastQuestion });
  } catch (error) {
    console.error('Next question error:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
