import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { QuestionModel } from '@/lib/models/question';
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

// Randomize option order while tracking the correct answer
function randomizeOptions(q: { options: string[]; correctAnswerIndex: number; [key: string]: unknown }) {
  const indexed = q.options.map((opt: string, i: number) => ({ opt, isCorrect: i === q.correctAnswerIndex }));
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
    const numQuestions = body.numQuestions || 15;
    const timerDuration = body.timerDuration || 15;

    // Try to pull from Question collection first
    let rawQuestions: Array<{
      questionText: string;
      options: string[];
      correctAnswerIndex: number;
      category?: string;
      difficulty: string;
      season?: number;
      episode?: string;
      funFact?: string;
      source?: { url: string; description: string };
    }>;

    const dbCount = await QuestionModel.countDocuments();
    if (dbCount > 0) {
      // Use MongoDB $sample for random selection
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
      // Fallback to JSON file
      rawQuestions = shuffleArray([...questionsJson]).slice(0, Math.min(numQuestions, questionsJson.length));
    }

    // Randomize answer order
    const selectedQuestions = rawQuestions.map(randomizeOptions);

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
