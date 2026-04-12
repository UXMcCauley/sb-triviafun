import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode')?.toUpperCase();

    if (!gameCode) {
      return NextResponse.json({ error: 'Game code required' }, { status: 400 });
    }

    const game = await GameModel.findOne({ gameCode });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Sanitize: don't send correct answers for active games
    const sanitizedQuestions = game.questions.map((q, i) => ({
      questionText: q.questionText,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
      // Only reveal correct answer for past questions
      ...(game.status === 'finished' || i < game.currentQuestionIndex
        ? { correctAnswerIndex: q.correctAnswerIndex }
        : {}),
    }));

    return NextResponse.json({
      gameCode: game.gameCode,
      status: game.status,
      currentQuestionIndex: game.currentQuestionIndex,
      totalQuestions: game.questions.length,
      questions: sanitizedQuestions,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
      })),
      questionStartedAt: game.questionStartedAt,
      timerDuration: game.timerDuration,
    });
  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}
