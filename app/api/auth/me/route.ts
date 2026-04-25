import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      image: (session.user as any).image ?? null,
    },
    session: {
      // access token is needed for Data API; name varies by provider/version
      accessToken:
        (session.session as any)?.accessToken ??
        (session.session as any)?.access_token ??
        null,
    },
  });
}

