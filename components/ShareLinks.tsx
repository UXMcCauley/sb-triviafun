'use client';

import { useMemo } from 'react';

type Props = {
  gameCode?: string;
  variant?: 'full' | 'prominent' | 'discreet' | 'lobbyStrip';
  className?: string;
};

function normalizeBase(base: string) {
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

export default function ShareLinks({ gameCode, variant = 'discreet', className }: Props) {
  // Must be deterministic during SSR/hydration; for full links set NEXT_PUBLIC_APP_URL.
  const base = process.env.NEXT_PUBLIC_APP_URL || '';

  const urls = useMemo(() => {
    const b = normalizeBase(base);
    const code = (gameCode || '').toUpperCase();
    const withCode = (path: string) => (code ? `${b}${path}${encodeURIComponent(code)}` : `${b}${path}`);
    return {
      play: withCode('/play?code='),
      watch: withCode('/watch?code='),
      display: `${b}/display`,
    };
  }, [base, gameCode]);

  const isFull = variant === 'full';
  const isLobbyStrip = variant === 'lobbyStrip';
  const isProminent = variant === 'prominent' || isLobbyStrip;

  const container = isLobbyStrip
    ? ['w-full rounded-none border-0 bg-transparent p-0', className || ''].filter(Boolean).join(' ')
    : [
        'rounded-2xl border border-white/10 bg-white/4',
        isProminent ? 'p-5' : isFull ? 'p-4' : 'px-4 py-3',
        className || '',
      ].join(' ');

  const labelClass = isProminent
    ? 'text-xs font-bold text-white/50 uppercase tracking-wider'
    : 'text-[11px] font-bold text-white/35 uppercase tracking-wider';

  const valueClass = isProminent
    ? 'mt-1 font-mono text-sm text-white/85 break-all select-all'
    : 'mt-1 font-mono text-xs text-white/60 break-all select-all';

  return (
    <div className={container}>
      <div className={isProminent ? 'grid gap-4 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-3'}>
        <div>
          <div className={labelClass}>Join (Play)</div>
          <div className={valueClass}>{urls.play}</div>
        </div>
        <div>
          <div className={labelClass}>Audience (Watch)</div>
          <div className={valueClass}>{urls.watch}</div>
        </div>
        <div>
          <div className={labelClass}>TV Display</div>
          <div className={valueClass}>{urls.display}</div>
        </div>
      </div>
    </div>
  );
}

