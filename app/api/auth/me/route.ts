import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

type SessionWithToken = {
  user?: { id: string; email?: string | null; name?: string | null; image?: string | null };
  session?: { accessToken?: string | null; access_token?: string | null };
};

export async function GET() {
  const { data: session } = (await auth.getSession()) as { data: SessionWithToken | null };
  if (!session?.user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
    session: {
      // access token is needed for Data API; name varies by provider/version
      accessToken:
        session.session?.accessToken ??
        session.session?.access_token ??
        null,
    },
  });
}

