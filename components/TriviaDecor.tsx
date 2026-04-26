import type { ReactNode } from 'react';

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  /** Inside host page — no full-bleed bg */
  embedded?: boolean;
};

/** Blurred color blobs; pair with a navy background. */
export function TriviaAmbientOrbs() {
  return (
    <>
      <div className="trivia-ambient-orb-1" aria-hidden />
      <div className="trivia-ambient-orb-2" aria-hidden />
      <div className="trivia-ambient-orb-3" aria-hidden />
    </>
  );
}

/**
 * Full-bleed game shell: twinkling specks + orbs (when not embedded) + child content.
 */
export function TriviaGameSurface({ children, className = '', embedded = false }: SurfaceProps) {
  if (embedded) {
    return (
      <div className={`relative flex h-full min-h-0 w-full flex-col overflow-x-hidden text-white ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={`trivia-surface-animated relative isolate min-h-dvh w-full overflow-x-hidden bg-trivia-navy text-white ${className}`}
    >
      <TriviaAmbientOrbs />
      <div className="relative z-10 flex min-h-dvh w-full flex-col">{children}</div>
    </div>
  );
}

type LogoProps = { className?: string; subtitle?: string; size?: 'sm' | 'md' | 'lg'; align?: 'left' | 'center' };

const logoShadow = `
2px 2px 0 #ff4d5a,
4px 4px 0 #c12f3d,
6px 6px 0 #6a1520,
0 0 40px rgba(255, 214, 64, 0.28)`;

/**
 * 3D wordmark: extruded warm shadow, star on the A.
 */
export function TriviaFunLogo({ className = '', subtitle, size = 'md', align = 'center' }: LogoProps) {
  const line =
    size === 'lg'
      ? 'text-[2.35rem] sm:text-4xl md:text-5xl'
      : size === 'sm'
        ? 'text-lg sm:text-xl'
        : 'text-[2rem] sm:text-[2.75rem]';
  const star =
    size === 'sm'
      ? 'text-[10px] -right-0.5 -top-0.5 sm:text-xs sm:-top-1'
      : 'text-base -right-0.5 -top-1.5 sm:-top-2 sm:text-2xl';
  return (
    <div className={`animate-trivia-pop ${align === 'left' ? 'text-left' : 'text-center'} ${className}`}>
      <h1
        className={`font-black uppercase leading-[0.92] tracking-tight ${line}`}
        style={{ color: '#ffffff', textShadow: size === 'sm' ? '2px 2px 0 #ff4d5a, 3px 3px 0 #c12f3d' : logoShadow }}
      >
        <span className="block">
          Trivi
          <span className="relative inline-block">
            a
            <span
              className={`animate-trivia-float pointer-events-none absolute text-[#ffeb3b] drop-shadow-[0_0_8px_rgba(255,235,100,0.65)] ${star}`}
              aria-hidden
            >
              ★
            </span>
          </span>
        </span>
        <span className="mt-0.5 block">Fun!</span>
      </h1>
      {subtitle ? (
        <p
          className={`mt-3 font-extrabold uppercase tracking-[0.2em] text-white/40 ${
            size === 'sm' ? 'text-[0.6rem]' : 'text-xs'
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/** Marketing / host page: orbs on top of twinkling star field (sits behind `relative` content). */
export function TriviaAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-trivia-navy trivia-surface-animated"
      aria-hidden
    >
      <TriviaAmbientOrbs />
    </div>
  );
}
