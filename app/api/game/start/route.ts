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

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    if (game.players.length === 0) {
      return NextResponse.json({ error: 'Need at least one player' }, { status: 400 });
    }

    game.status = 'active';
    game.currentQuestionIndex = -1; // will be set to 0 when first question is advanced
    await game.save();

    const pusher = getPusherServer();
    await pusher.trigger(`game-${game.gameCode}`, 'game-started', {
      totalQuestions: game.questions.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
