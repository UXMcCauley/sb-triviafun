'use client';

import { createAuthClient } from '@neondatabase/neon-js/auth/next';

// Next.js client: talks to this app's `/api/auth/*` handler,
// which is what sets the app-origin session cookie.
export const authClient = createAuthClient();

