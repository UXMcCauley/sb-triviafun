import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { gameCode, paused } = await request.json();

    const upperCode = gameCode.toUpperCase();
    const rows = (await sql`
      select game_code, status
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{ game_code: string; status: string }>;
    const game = rows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const pusher = getPusherServer();
    await pusher.trigger(`game-${game.game_code}`, 'game-paused', { paused });

    return NextResponse.json({ success: true, paused });
  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json({ error: 'Failed to pause/resume' }, { status: 500 });
  }
}
