import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth/session';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });

  const rows = (await sql`
    select id::text as id, default_username, avatar_url, email
    from users
    where id = ${userId}::uuid
    limit 1
  `) as Array<{ id: string; default_username: string | null; avatar_url: string | null; email: string | null }>;
  const user = rows[0];
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: user.id,
      defaultUsername: user.default_username,
      avatarUrl: user.avatar_url,
      email: user.email,
    },
  });
}

