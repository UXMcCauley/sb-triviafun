import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { QuestionModel } from '@/lib/models/question';
import { getPusherServer } from '@/lib/pusher';
import questionsJson from '@/data/questions.json';

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function randomizeOptions(q: any) {
  const indexed: { opt: string; isCorrect: boolean }[] = q.options.map((opt: string, i: number) => ({ opt, isCorrect: i === q.correctAnswerIndex }));
  const shuffled = shuffleArray(indexed);
  return {
    ...q,
    options: shuffled.map((s) => s.opt),
    correctAnswerIndex: shuffled.findIndex((s) => s.isCorrect),
  };
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode } = await request.json();

    const oldGame = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!oldGame) {
      return NextResponse.json({ error: 'Original game not found' }, { status: 404 });
    }

    const numQuestions = oldGame.questions.length;
    const timerDuration = oldGame.timerDuration;
    const seriesId = oldGame.seriesId;
    const seriesIndex = (oldGame.seriesIndex || 0) + 1;

    // Pull questions from DB or fallback to JSON
    let rawQuestions: Array<Record<string, unknown>>;
    const dbCount = await QuestionModel.countDocuments();
    if (dbCount > 0) {
      const sampled = await QuestionModel.aggregate([
        { $sample: { size: Math.min(numQuestions, dbCount) } },
      ]);
      rawQuestions = sampled.map((q) => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        category: q.category,
        difficulty: q.difficulty,
        season: q.season,
        episode: q.episode,
        funFact: q.funFact,
        source: q.source,
      }));
    } else {
      rawQuestions = shuffleArray([...questionsJson]).slice(0, Math.min(numQuestions, questionsJson.length));
    }

    const selectedQuestions = rawQuestions.map(randomizeOptions);

    // Generate new game code
    let newGameCode = generateGameCode();
    let exists = await GameModel.findOne({ gameCode: newGameCode, status: { $ne: 'finished' } });
    while (exists) {
      newGameCode = generateGameCode();
      exists = await GameModel.findOne({ gameCode: newGameCode, status: { $ne: 'finished' } });
    }

    // Same players, reset scores
    const newPlayers = oldGame.players.map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
      score: 0,
      answers: [],
    }));

    await GameModel.create({
      gameCode: newGameCode,
      status: 'lobby',
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      players: newPlayers,
      questionStartedAt: null,
      timerDuration,
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

    // Notify clients
    const pusher = getPusherServer();
    await pusher.trigger(`game-${gameCode.toUpperCase()}`, 'game-replay', {
      newGameCode,
      players: newPlayers.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      seriesHistory,
    });

    return NextResponse.json({ newGameCode, timerDuration, seriesHistory });
  } catch (error) {
    console.error('Replay error:', error);
    return NextResponse.json({ error: 'Failed to create replay' }, { status: 500 });
  }
}
