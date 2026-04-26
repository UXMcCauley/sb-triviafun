'use client';

import { createAuthClient } from '@neondatabase/neon-js/auth';
import { v4 as uuidv4 } from 'uuid';

// `crypto.randomUUID()` is not available in all non-secure contexts (e.g. http://127.0.0.1.nip.io).
// Neon auth client expects it, so we shim it for local dev reliability.
if (typeof globalThis !== 'undefined') {
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!c) {
    (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto = { randomUUID: uuidv4 };
  } else if (typeof c.randomUUID !== 'function') {
    c.randomUUID = uuidv4;
  }
}

export const authClient = createAuthClient(process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL!);

