'use client';

import React, { use } from 'react';
import { NeonAuthUIProvider, AuthView } from '@neondatabase/auth/react/ui';
import { authClient } from '@/lib/auth/client';

export default function AuthPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = use(params);
  const pathname = view === 'sign-up' ? 'sign-up' : 'sign-in';
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6">
        <NeonAuthUIProvider authClient={authClient as unknown as never}>
          <AuthView pathname={pathname as 'sign-in' | 'sign-up'} />
        </NeonAuthUIProvider>
      </div>
    </div>
  );
}

