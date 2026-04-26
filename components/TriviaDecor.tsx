import type { ReactNode } from 'react';

const STAR_LAYERS = [
  'radial-gradient(2px 2px at 12% 18%,rgba(255,214,100,0.5),transparent 60%)',
  'radial-gradient(1.5px 1.5px at 88% 14%,rgba(100,200,255,0.45),transparent 55%)',
  'radial-gradient(1.5px 1.5px at 40% 82%,rgba(255,220,100,0.4),transparent 55%)',
  'radial-gradient(1px 1px at 72% 48%,rgba(150,180,255,0.35),transparent 50%)',
  'radial-gradient(2px 2px at 6% 88%,rgba(255,200,64,0.3),transparent 55%)',
  'radial-gradient(1px 1px at 55% 30%,rgba(100,255,200,0.2),transparent 50%)',
].join(', ');

type SurfaceProps = { children: ReactNode; className?: string; /** Inside host page — no full-bleed bg */ embedded?: boolean };

/** Full-bleed dark game backdrop with subtle star scatters, or a transparent panel when embedded. */
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
      className={`relative isolate min-h-dvh w-full overflow-x-hidden bg-trivia-navy text-white ${className}`}
      style={{ backgroundImage: STAR_LAYERS }}
    >
      <div className="relative z-1 flex min-h-dvh w-full flex-col">{children}</div>
    </div>
  );
}

type LogoProps = { className?: string; subtitle?: string };

const logoShadow = `
2px 2px 0 #ff4d5a,
4px 4px 0 #c12f3d,
6px 6px 0 #6a1520,
0 0 40px rgba(255, 214, 64, 0.28)`;

/**
 * Stacked 3D wordmark: chunky caps, warm extrusion, star on the A (reference UI).
 */
export function TriviaFunLogo({ className = '', subtitle }: LogoProps) {
  return (
    <div className={`text-center ${className}`}>
      <h1
        className="font-black uppercase leading-[0.92] tracking-tight"
        style={{ color: '#ffffff', textShadow: logoShadow }}
      >
        <span className="block text-[2rem] sm:text-[2.75rem]">
          Trivi
          <span className="relative inline-block">
            a
            <span
              className="pointer-events-none absolute -right-0.5 -top-1.5 text-base text-[#ffeb3b] drop-shadow-[0_0_6px_rgba(255,235,100,0.7)] sm:-top-2 sm:text-2xl"
              aria-hidden
            >
              ★
            </span>
          </span>
        </span>
        <span className="mt-0.5 block text-[2rem] sm:text-[2.75rem]">Fun!</span>
      </h1>
      {subtitle ? (
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.2em] text-white/40">{subtitle}</p>
      ) : null}
    </div>
  );
}
