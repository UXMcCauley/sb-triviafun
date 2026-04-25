import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getPusherServer } from '@/lib/pusher';
import { getSessionUserId } from '@/lib/auth/session';

const rate = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = rate.get(key);
  if (!entry || entry.resetAt <= now) {
    rate.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

const allowedEmoji = new Set(['🔥', '😂', '😬', '👏', '💀', '🤯', '😡', '🫠', '🧠', '🍿', '🏆']);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const gameCode = String(body.gameCode || '').toUpperCase();
    const targetType = body.targetType === 'question' || body.targetType === 'player' ? body.targetType : null;
    const targetKey = typeof body.targetKey === 'string' ? body.targetKey : String(body.targetKey ?? '');
    const emoji = typeof body.emoji === 'string' ? body.emoji : '';
    const guestId = typeof body.guestId === 'string' ? body.guestId : null;

    if (!gameCode || gameCode.length < 4) return NextResponse.json({ error: 'Missing gameCode' }, { status: 400 });
    if (!targetType) return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    if (!targetKey) return NextResponse.json({ error: 'Missing targetKey' }, { status: 400 });
    if (!allowedEmoji.has(emoji)) return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });

    const userId = await getSessionUserId();
    if (!userId && !guestId) return NextResponse.json({ error: 'Missing guestId' }, { status: 400 });

    const rateKey = `${gameCode}:${userId || guestId}`;
    if (!rateLimit(rateKey, 12, 10_000)) {
      return NextResponse.json({ error: 'Slow down' }, { status: 429 });
    }

    const gameRows = (await sql`
      select id, game_code
      from games
      where game_code = ${gameCode}
      limit 1
    `) as Array<{ id: string; game_code: string }>;
    const game = gameRows[0];
    if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

    const rows = (await sql`
      insert into reactions (game_id, target_type, target_key, emoji, user_id, guest_id)
      values (${game.id}::uuid, ${targetType}, ${targetKey}, ${emoji}, ${userId}::uuid, ${guestId})
      returning id::text as id, created_at
    `) as Array<{ id: string; created_at: string }>;
    const reaction = rows[0];

    const pusher = getPusherServer();
    await pusher.trigger(`game-${game.game_code}`, 'reaction-added', {
      id: reaction?.id,
      targetType,
      targetKey,
      emoji,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json({ error: 'Failed to react' }, { status: 500 });
  }
}

