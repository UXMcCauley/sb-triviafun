import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';
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

      // Advance to next question
      const now = Date.now();
      game.currentQuestionIndex = nextIndex;
      game.questionStartedAt = now;
      await game.save();

      const nextQuestion = game.questions[nextIndex];
      await pusher.trigger(`game-${game.gameCode}`, 'new-question', {
        questionIndex: nextIndex,
        questionText: nextQuestion.questionText,
        options: nextQuestion.options,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty,
        totalQuestions: game.questions.length,
        startedAt: now,
        timerDuration: game.timerDuration,
      });

      return NextResponse.json({ finished: false, nextIndex });
    }

    // Default: reveal answer
    const currentQuestion = game.questions[game.currentQuestionIndex];
    const qIdx = game.currentQuestionIndex;

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
          timeToAnswer: game.timerDuration,
          pointsEarned: 0,
          totalScore: p.score,
        };
      }
      const timeRemaining = Math.max(0, game.timerDuration - answer.timeToAnswer);
      const pointsEarned = answer.correct
        ? 1000 + Math.round((timeRemaining / game.timerDuration) * 500)
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
      correctAnswerIndex: currentQuestion.correctAnswerIndex,
      playerResults,
      players: sortedPlayers,
    });

    const isLastQuestion = game.currentQuestionIndex + 1 >= game.questions.length;
    return NextResponse.json({ revealed: true, isLastQuestion });
  } catch (error) {
    console.error('Next question error:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
