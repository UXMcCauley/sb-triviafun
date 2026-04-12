import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import {
  generateGameCode,
  selectQuestionsForGame,
  generateShuffleMappings,
  resolvePackIds,
} from '@/lib/game-helpers';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const numQuestions = body.numQuestions || 15;
    const timerDuration = body.timerDuration || 15;
    const rawPackIds: string[] | undefined = body.packIds;

    // Resolve pack IDs (from slugs or ObjectId strings)
    const packIds = rawPackIds && rawPackIds.length > 0
      ? await resolvePackIds(rawPackIds)
      : undefined;

    // Select random questions from the specified packs
    const questions = await selectQuestionsForGame(packIds, numQuestions);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available for selected packs' }, { status: 400 });
    }

    // Generate per-game shuffle mappings
    const { shuffledOptionOrders, shuffledCorrectAnswers } = generateShuffleMappings(questions);

    // Generate unique game code
    let gameCode = generateGameCode();
    let exists = await GameModel.findOne({ gameCode, status: { $ne: 'finished' } });
    while (exists) {
      gameCode = generateGameCode();
      exists = await GameModel.findOne({ gameCode, status: { $ne: 'finished' } });
    }

    const seriesId = uuidv4();
    const game = await GameModel.create({
      gameCode,
      status: 'lobby',
      packIds: packIds || [],
      questions: questions.map((q) => q._id),
      shuffledOptionOrders,
      shuffledCorrectAnswers,
      currentQuestionIndex: 0,
      players: [],
      questionStartedAt: null,
      settings: {
        timerSeconds: timerDuration,
        questionCount: numQuestions,
      },
      seriesId,
      seriesIndex: 0,
    });

    return NextResponse.json({
      gameCode: game.gameCode,
      timerDuration,
      seriesId,
    });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
