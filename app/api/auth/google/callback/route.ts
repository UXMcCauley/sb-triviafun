import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { setSessionCookie, consumeOauthState } from '@/lib/auth/session';

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type TokenInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: string;
  error_description?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code/state' }, { status: 400 });
  }

  const oauth = await consumeOauthState(state);
  if (!oauth) {
    return NextResponse.json({ error: 'Invalid oauth state' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing Google OAuth env vars' }, { status: 500 });
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', url.origin).toString();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const token = (await tokenRes.json()) as TokenResponse;
  if (!tokenRes.ok || token.error || !token.id_token) {
    return NextResponse.json(
      { error: token.error_description || token.error || 'OAuth exchange failed' },
      { status: 400 }
    );
  }

  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token.id_token)}`
  );
  const info = (await infoRes.json()) as TokenInfoResponse;
  if (!infoRes.ok || !info.sub) {
    return NextResponse.json({ error: info.error_description || 'Invalid id_token' }, { status: 400 });
  }

  const email = typeof info.email === 'string' ? info.email : null;

  const rows = (await sql`
    insert into users (google_sub, email)
    values (${info.sub}, ${email})
    on conflict (google_sub) do update
      set email = excluded.email,
          updated_at = now()
    returning id::text as id, default_username, avatar_url
  `) as Array<{ id: string; default_username: string | null; avatar_url: string | null }>;
  const user = rows[0];
  if (!user) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });

  await setSessionCookie(user.id);

  return NextResponse.redirect(new URL(oauth.returnTo || '/play', url.origin).toString());
}

