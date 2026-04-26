'use client';

import { useEffect, useId, useState } from 'react';

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  // If the layout pre-hydration script already decided, trust it.
  if (document?.documentElement?.classList?.contains('dark')) return 'dark';
  if (document?.documentElement?.style?.colorScheme === 'light') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export default function LightDarkToggle({ size = 18 }: { size?: number }) {
  const id = useId();
  const [mode, setMode] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
  }, [mode]);

  const setTheme = (next: ThemeMode) => {
    setMode(next);
    try {
      window.localStorage.setItem('theme', next);
    } catch {}
  };

  return (
    <div
      className="inline-flex items-center"
      style={
        {
          // `md-switch` sizes itself; we scale via font-size to match layouts.
          fontSize: `${size}px`,
        } as React.CSSProperties
      }
    >
      <md-switch
        id={id}
        selected={mode === 'dark'}
        aria-label="Dark mode"
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          e.preventDefault();
          setTheme(mode === 'dark' ? 'light' : 'dark');
        }}
      />
    </div>
  );
}

