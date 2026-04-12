import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode, paused } = await request.json();

    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const pusher = getPusherServer();
    await pusher.trigger(`game-${game.gameCode}`, 'game-paused', { paused });

    return NextResponse.json({ success: true, paused });
  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json({ error: 'Failed to pause/resume' }, { status: 500 });
  }
}
