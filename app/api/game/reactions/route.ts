import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameCode = (searchParams.get('gameCode') || '').toUpperCase();
  if (!gameCode) return NextResponse.json({ error: 'Missing gameCode' }, { status: 400 });

  const gameRows = (await sql`
    select
      id,
      game_code,
      coalesce((settings->>'audienceEnabled')::boolean, true) as audience_enabled
    from games
    where game_code = ${gameCode}
    limit 1
  `) as Array<{ id: string; game_code: string; audience_enabled: boolean }>;
  const game = gameRows[0];
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (!game.audience_enabled) return NextResponse.json({ reactions: [] });

  const rows = (await sql`
    select target_type, target_key, emoji
    from reactions
    where game_id = ${game.id}::uuid
      and created_at > now() - interval '2 hours'
    order by created_at desc
    limit 500
  `) as Array<{ target_type: 'question' | 'player'; target_key: string; emoji: string }>;

  return NextResponse.json({ reactions: rows });
}

