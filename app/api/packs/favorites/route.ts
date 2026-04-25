import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth/server';

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!userId || !isUuid(userId)) return null;
  return userId;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ favorites: [] });

  const rows = (await sql`
    select pack_id::text as "packId", pinned
    from pack_favorites
    where user_id = ${userId}::uuid
    order by pinned desc, created_at asc
  `) as Array<{ packId: string; pinned: boolean }>;

  return NextResponse.json({ favorites: rows });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const packId = typeof body?.packId === 'string' ? body.packId : '';
  const action = typeof body?.action === 'string' ? body.action : '';

  if (!isUuid(packId)) return NextResponse.json({ error: 'Invalid packId' }, { status: 400 });

  if (action === 'favorite') {
    await sql`
      insert into pack_favorites (user_id, pack_id, pinned)
      values (${userId}::uuid, ${packId}::uuid, false)
      on conflict (user_id, pack_id) do update set pinned = pack_favorites.pinned
    `;
    return NextResponse.json({ ok: true });
  }

  if (action === 'unfavorite') {
    await sql`delete from pack_favorites where user_id = ${userId}::uuid and pack_id = ${packId}::uuid`;
    return NextResponse.json({ ok: true });
  }

  if (action === 'pin') {
    await sql`
      insert into pack_favorites (user_id, pack_id, pinned)
      values (${userId}::uuid, ${packId}::uuid, true)
      on conflict (user_id, pack_id) do update set pinned = true
    `;
    return NextResponse.json({ ok: true });
  }

  if (action === 'unpin') {
    await sql`
      update pack_favorites
      set pinned = false
      where user_id = ${userId}::uuid and pack_id = ${packId}::uuid
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

