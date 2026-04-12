import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';
import {
  selectQuestionsForGame,
  generateShuffleMappings,
} from '@/lib/game-helpers';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode } = await request.json();
    const upperCode = gameCode.toUpperCase();

    const oldGame = await GameModel.findOne({ gameCode: upperCode });
    if (!oldGame) {
      return NextResponse.json({ error: 'Original game not found' }, { status: 404 });
    }

    const numQuestions = oldGame.questions.length;
    const timerSeconds = oldGame.settings.timerSeconds;
    const seriesId = oldGame.seriesId;
    const seriesIndex = (oldGame.seriesIndex || 0) + 1;

    // Pull questions from the same packs as the original game
    const questions = await selectQuestionsForGame(oldGame.packIds, numQuestions);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 400 });
    }

    const { shuffledOptionOrders, shuffledCorrectAnswers } = generateShuffleMappings(questions);

    // Same players, reset scores
    const newPlayers = oldGame.players.map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
      score: 0,
      answers: [],
    }));

    // Delete the old finished game and create new one with the same code
    await GameModel.deleteOne({ _id: oldGame._id });

    await GameModel.create({
      gameCode: upperCode,
      status: 'lobby',
      packIds: oldGame.packIds,
      questions: questions.map((q) => q._id),
      shuffledOptionOrders,
      shuffledCorrectAnswers,
      currentQuestionIndex: 0,
      players: newPlayers,
      questionStartedAt: null,
      settings: {
        timerSeconds,
        questionCount: numQuestions,
      },
      seriesId,
      seriesIndex,
    });

    // Fetch series history for all games in this series
    const seriesGames = await GameModel.find(
      { seriesId, status: 'finished' },
      { gameCode: 1, seriesIndex: 1, players: 1 }
    ).sort({ seriesIndex: 1 });

    const seriesHistory = seriesGames.map((g) => ({
      gameIndex: g.seriesIndex || 0,
      gameCode: g.gameCode,
      results: [...g.players]
        .sort((a, b) => b.score - a.score)
        .map((p, rank) => ({ id: p.id, name: p.name, score: p.score, rank: rank + 1 })),
    }));

    // Notify clients — same channel since code is reused
    const pusher = getPusherServer();
    await pusher.trigger(`game-${upperCode}`, 'game-replay', {
      gameCode: upperCode,
      players: newPlayers.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      seriesHistory,
    });

    return NextResponse.json({ gameCode: upperCode, timerDuration: timerSeconds, seriesHistory });
  } catch (error) {
    console.error('Replay error:', error);
    return NextResponse.json({ error: 'Failed to create replay' }, { status: 500 });
  }
}
