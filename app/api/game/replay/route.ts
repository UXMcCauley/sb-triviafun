import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';
import questions from '@/data/questions.json';

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

function randomizeOptions(q: typeof questions[0]) {
  const indexed = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correctAnswerIndex }));
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

    // Find the old game to copy settings and players
    const oldGame = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!oldGame) {
      return NextResponse.json({ error: 'Original game not found' }, { status: 404 });
    }

    const numQuestions = oldGame.questions.length;
    const timerDuration = oldGame.timerDuration;

    // Pick new random questions with randomized answer order
    const selectedQuestions = shuffleArray(questions)
      .slice(0, Math.min(numQuestions, questions.length))
      .map(randomizeOptions);

    // Generate new unique game code
    let newGameCode = generateGameCode();
    let exists = await GameModel.findOne({ gameCode: newGameCode, status: { $ne: 'finished' } });
    while (exists) {
      newGameCode = generateGameCode();
      exists = await GameModel.findOne({ gameCode: newGameCode, status: { $ne: 'finished' } });
    }

    // Create new game with same players (scores reset)
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
    });

    // Notify all clients on the old channel to redirect
    const pusher = getPusherServer();
    await pusher.trigger(`game-${gameCode.toUpperCase()}`, 'game-replay', {
      newGameCode,
      players: newPlayers.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
    });

    return NextResponse.json({ newGameCode, timerDuration });
  } catch (error) {
    console.error('Replay error:', error);
    return NextResponse.json({ error: 'Failed to create replay' }, { status: 500 });
  }
}
