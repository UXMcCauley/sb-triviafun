import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'seinfeld_session';
const OAUTH_STATE_COOKIE = 'seinfeld_oauth_state';

type SessionPayload = {
  userId: string;
  exp: number; // unix seconds
};

function base64UrlEncode(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? '='.repeat(4 - pad) : '');
  return Buffer.from(padded, 'base64');
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Missing SESSION_SECRET');
  return secret;
}

function sign(data: string) {
  return base64UrlEncode(crypto.createHmac('sha256', getSecret()).update(data).digest());
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function setSessionCookie(userId: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload: SessionPayload = { userId, exp };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const sig = sign(payloadB64);
  const value = `${payloadB64}.${sig}`;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [payloadB64, sig] = raw.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const payloadJson = base64UrlDecodeToBuffer(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (!payload?.userId || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

export async function setOauthState(state: string, maxAgeSeconds = 10 * 60) {
  const sig = sign(state);
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, `${state}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function consumeOauthState(expectedState: string): Promise<{ returnTo: string } | null> {
  const jar = await cookies();
  const raw = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.set(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  if (!raw) return null;
  const [savedState, sig] = raw.split('.');
  if (!savedState || !sig) return null;
  const expected = sign(savedState);
  if (!timingSafeEqual(sig, expected)) return null;

  const [state, returnToEncoded] = savedState.split(':');
  if (!state || !returnToEncoded) return null;
  if (state !== expectedState) return null;

  const returnTo = decodeURIComponent(returnToEncoded);
  if (!returnTo.startsWith('/')) return { returnTo: '/play' };
  return { returnTo };
}

