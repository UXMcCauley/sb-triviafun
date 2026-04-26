'use client';

import React, { use } from 'react';
import { NeonAuthUIProvider, AuthView } from '@neondatabase/auth/react/ui';
import { authClient } from '@/lib/auth/client';
import { TriviaFunLogo, TriviaGameSurface } from '@/components/TriviaDecor';

export default function AuthPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = use(params);
  const pathname = view === 'sign-up' ? 'sign-up' : 'sign-in';
  return (
    <TriviaGameSurface>
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <TriviaFunLogo className="mb-8" subtitle={pathname === 'sign-up' ? 'Create account' : 'Welcome back'} />
        <div className="trivia-card-join w-full max-w-md p-6">
          <NeonAuthUIProvider authClient={authClient as unknown as never}>
            <AuthView pathname={pathname as 'sign-in' | 'sign-up'} />
          </NeonAuthUIProvider>
        </div>
      </div>
    </TriviaGameSurface>
  );
}

