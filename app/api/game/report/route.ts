import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ReportModel } from '@/lib/models/report';
import { GameModel } from '@/lib/models/game';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode, questionIndex, reportedBy, reason } = await request.json();

    if (!gameCode || questionIndex === undefined || !reportedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up the question ObjectId from the game
    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const questionId = game.questions[questionIndex];
    if (!questionId) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await ReportModel.create({
      questionId,
      reportedBy,
      gameCode: gameCode.toUpperCase(),
      reason: reason || 'Incorrect answer marked as correct',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to report' }, { status: 500 });
  }
}
