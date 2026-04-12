import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode } = await request.json();

    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const pusher = getPusherServer();
    const currentQuestion = game.questions[game.currentQuestionIndex];

    // First, reveal the answer for the current question
    const sortedPlayers = [...game.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    await pusher.trigger(`game-${game.gameCode}`, 'answer-reveal', {
      questionIndex: game.currentQuestionIndex,
      correctAnswerIndex: currentQuestion.correctAnswerIndex,
      players: sortedPlayers,
    });

    // Check if there are more questions
    const nextIndex = game.currentQuestionIndex + 1;
    if (nextIndex >= game.questions.length) {
      // Game over
      game.status = 'finished';
      game.questionStartedAt = null;
      await game.save();

      const winner = sortedPlayers[0] || { id: '', name: 'No one', score: 0 };
      await pusher.trigger(`game-${game.gameCode}`, 'game-finished', {
        players: sortedPlayers,
        winner,
      });

      return NextResponse.json({ finished: true, winner });
    }

    // Advance to next question after a brief delay (client handles visual delay)
    const now = Date.now();
    game.currentQuestionIndex = nextIndex;
    game.questionStartedAt = now + 5000; // 5 second delay for reveal animation
    await game.save();

    // Send next question after delay
    const nextQuestion = game.questions[nextIndex];
    setTimeout(async () => {
      await pusher.trigger(`game-${game.gameCode}`, 'new-question', {
        questionIndex: nextIndex,
        questionText: nextQuestion.questionText,
        options: nextQuestion.options,
        category: nextQuestion.category,
        difficulty: nextQuestion.difficulty,
        totalQuestions: game.questions.length,
        startedAt: now + 5000,
        timerDuration: game.timerDuration,
      });
    }, 5000);

    return NextResponse.json({ finished: false, nextIndex });
  } catch (error) {
    console.error('Next question error:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
