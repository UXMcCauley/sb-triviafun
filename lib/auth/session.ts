import { auth } from '@/lib/auth/server';

export async function getSessionUserId(): Promise<string | null> {
  // Source of truth: Neon Auth session cookie.
  // Audience reactions and registration should never depend on a separate app-specific secret.
  const { data: session } = await auth.getSession();
  return session?.user?.id ?? null;
}

