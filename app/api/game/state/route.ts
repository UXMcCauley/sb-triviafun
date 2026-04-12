import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { QuestionModel } from '@/lib/models/question';
import { getShuffledQuestion } from '@/lib/game-helpers';

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

    // Populate all questions to build sanitized list
    const questionDocs = await QuestionModel.find({
      _id: { $in: game.questions },
    });

    // Create a map for quick lookup preserving order
    const questionMap = new Map(
      questionDocs.map((q) => [q._id.toString(), q])
    );

    // Sanitize: don't send correct answers for active games (future questions)
    const sanitizedQuestions = game.questions.map((qId, i) => {
      const q = questionMap.get(qId.toString());
      if (!q) return null;

      const optionOrder = game.shuffledOptionOrders[i];
      const shuffled = getShuffledQuestion(q, optionOrder);

      return {
        questionText: shuffled.questionText,
        options: shuffled.options,
        category: shuffled.category,
        difficulty: shuffled.difficulty,
        // Only reveal correct answer for past questions
        ...(game.status === 'finished' || i < game.currentQuestionIndex
          ? { correctAnswerIndex: game.shuffledCorrectAnswers[i] }
          : {}),
      };
    }).filter(Boolean);

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
      timerDuration: game.settings.timerSeconds,
    });
  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}
