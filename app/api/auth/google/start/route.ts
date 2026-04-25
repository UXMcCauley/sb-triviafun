import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { setOauthState } from '@/lib/auth/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/play';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID' }, { status: 500 });
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', url.origin).toString();

  const state = crypto.randomBytes(16).toString('hex');
  await setOauthState(`${state}:${encodeURIComponent(returnTo)}`);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl.toString());
}

