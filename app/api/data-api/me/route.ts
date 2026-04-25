import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

type SessionWithToken = {
  session?: { accessToken?: string | null; access_token?: string | null };
};

export async function GET() {
  const { data: session } = (await auth.getSession()) as { data: SessionWithToken | null };
  const token =
    session?.session?.accessToken ??
    session?.session?.access_token ??
    null;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    token,
    dataApiBaseUrl: process.env.NEON_DATA_API_BASE_URL || null,
  });
}

