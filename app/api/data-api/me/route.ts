import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export async function GET() {
  const { data: session } = await auth.getSession();
  const token =
    (session?.session as any)?.accessToken ??
    (session?.session as any)?.access_token ??
    null;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    token,
    dataApiBaseUrl: process.env.NEON_DATA_API_BASE_URL || null,
  });
}

