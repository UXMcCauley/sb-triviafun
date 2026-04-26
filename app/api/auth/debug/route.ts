import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const h = await headers();
  const cookie = h.get('cookie');
  const host = h.get('host');
  const xfh = h.get('x-forwarded-host');
  const xfp = h.get('x-forwarded-proto');

  const { data: session } = await auth.getSession();

  const res = NextResponse.json({
    request: {
      host,
      forwardedHost: xfh,
      forwardedProto: xfp,
      hasCookieHeader: Boolean(cookie && cookie.length > 0),
      cookieHeaderLength: cookie?.length ?? 0,
    },
    session: {
      hasUser: Boolean(session?.user),
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    },
  });
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return res;
}

