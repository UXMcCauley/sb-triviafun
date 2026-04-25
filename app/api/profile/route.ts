import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const defaultUsername = typeof body.defaultUsername === 'string' ? body.defaultUsername.trim() : null;

  if (defaultUsername !== null && (defaultUsername.length < 2 || defaultUsername.length > 20)) {
    return NextResponse.json({ error: 'Username must be 2-20 characters' }, { status: 400 });
  }

  const { data } = await auth.updateUser({
    name: defaultUsername || undefined,
  } as any);

  const user = data?.user || session.user;
  return NextResponse.json({
    user: user
      ? { id: user.id, email: user.email ?? null, name: user.name ?? null, image: (user as any).image ?? null }
      : null,
  });
}

