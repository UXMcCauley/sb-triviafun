import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth/session';

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const defaultUsername = typeof body.defaultUsername === 'string' ? body.defaultUsername.trim() : null;

  if (defaultUsername !== null && (defaultUsername.length < 2 || defaultUsername.length > 20)) {
    return NextResponse.json({ error: 'Username must be 2-20 characters' }, { status: 400 });
  }

  const rows = (await sql`
    update users
    set default_username = ${defaultUsername},
        updated_at = now()
    where id = ${userId}::uuid
    returning id::text as id, default_username, avatar_url, email
  `) as Array<{ id: string; default_username: string | null; avatar_url: string | null; email: string | null }>;

  const user = rows[0];
  return NextResponse.json({
    user: user
      ? { id: user.id, defaultUsername: user.default_username, avatarUrl: user.avatar_url, email: user.email }
      : null,
  });
}

