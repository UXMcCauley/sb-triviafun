import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
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

// Randomize option order while tracking the correct answer
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

    const body = await request.json().catch(() => ({}));
    const numQuestions = Math.min(body.numQuestions || 15, questions.length);
    const timerDuration = body.timerDuration || 15;

    // Pick random questions and randomize answer order
    const selectedQuestions = shuffleArray(questions)
      .slice(0, numQuestions)
      .map(randomizeOptions);

    // Generate unique game code
    let gameCode = generateGameCode();
    let exists = await GameModel.findOne({ gameCode, status: { $ne: 'finished' } });
    while (exists) {
      gameCode = generateGameCode();
      exists = await GameModel.findOne({ gameCode, status: { $ne: 'finished' } });
    }

    const game = await GameModel.create({
      gameCode,
      status: 'lobby',
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      players: [],
      questionStartedAt: null,
      timerDuration,
    });

    return NextResponse.json({ gameCode: game.gameCode, timerDuration });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
