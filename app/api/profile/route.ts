import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

type UserUpdateInput = { name?: string; image?: string };
type UpdateResult = { data?: { user?: { id: string; email?: string | null; name?: string | null; image?: string | null } } };

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const defaultUsername = typeof body.defaultUsername === 'string' ? body.defaultUsername.trim() : null;

  if (defaultUsername !== null && (defaultUsername.length < 2 || defaultUsername.length > 20)) {
    return NextResponse.json({ error: 'Username must be 2-20 characters' }, { status: 400 });
  }

  const result = (await auth.updateUser({
    name: defaultUsername || undefined,
  } as UserUpdateInput)) as unknown as UpdateResult;

  const user = result?.data?.user || session.user;
  return NextResponse.json({
    user: user
      ? { id: user.id, email: user.email ?? null, name: user.name ?? null, image: (user as { image?: string | null }).image ?? null }
      : null,
  });
}

