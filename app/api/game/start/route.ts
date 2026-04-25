import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getPusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { gameCode } = await request.json();
    const upperCode = gameCode.toUpperCase();

    const rows = (await sql`
      select id, game_code, status, question_ids
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{ id: string; game_code: string; status: string; question_ids: string[] }>;
    const game = rows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 });
    }

    const players = (await sql`
      select 1 from game_players where game_id = ${game.id}::uuid limit 1
    `) as Array<{ "?column?": number }>;
    if (players.length === 0) {
      return NextResponse.json({ error: 'Need at least one player' }, { status: 400 });
    }

    await sql`
      update games
      set status = ${"active"}, current_question_index = ${-1}, question_started_at = ${null}
      where id = ${game.id}::uuid
    `;

    const pusher = getPusherServer();
    await pusher.trigger(`game-${game.game_code}`, 'game-started', {
      totalQuestions: game.question_ids.length,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
