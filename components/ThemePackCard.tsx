import type { CSSProperties, ReactNode } from 'react';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function hashToIndex(input: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

export type ThemePackCardModel = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: ReactNode;
  questionCount: number;
};

export default function ThemePackCard({
  pack,
  disabled,
  selected,
  favored,
  pinned,
  onClick,
  onToggleFavorite,
  onTogglePin,
  rightBadges,
}: {
  pack: ThemePackCardModel;
  disabled?: boolean;
  selected?: boolean;
  favored?: boolean;
  pinned?: boolean;
  onClick?: () => void;
  onToggleFavorite?: () => void;
  onTogglePin?: () => void;
  rightBadges?: ReactNode;
}) {
  const accentMixes = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#e11d48'];
  const mix = accentMixes[hashToIndex(pack.id || pack.name, accentMixes.length)];

  const gradient = `linear-gradient(to bottom, color-mix(in oklab, ${pack.themeColor} 80%, ${mix} 20%), ${pack.themeColor}, color-mix(in oklab, ${pack.themeColor} 75%, #ffffff 25%))`;
  const titleColor = `color-mix(in oklab, ${pack.themeColor} 88%, #ffffff 12%)`;

  const style = {
    ['--packGradient' as string]: gradient,
    ['--packTitle' as string]: titleColor,
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={style}
      className={cx(
        'group text-left',
        'relative isolate overflow-hidden rounded-2xl',
        'bg-[#29292c] border border-white/10',
        'shadow-[0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
        'transition-all',
        disabled && 'opacity-40 cursor-not-allowed',
        selected && !disabled && 'border-white/25',
      )}
    >
      {/* inner inset panel (replaces :before) */}
      <div className="absolute inset-px rounded-[15px] bg-[#18181b] z-2" />

      {/* left gradient bar (replaces :after) */}
      <div
        className={cx(
          'absolute z-4 w-1',
          'top-[0.65rem] bottom-[0.65rem] left-2',
          'rounded-sm',
          'transition-transform duration-300 ease-out',
          'group-hover:translate-x-[0.15rem]',
        )}
        style={{ background: 'var(--packGradient)' }}
      />

      {/* glow layers */}
      <div
        className={cx(
          'absolute z-1 w-80 h-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-out',
          'pointer-events-none',
        )}
        style={{ background: 'radial-gradient(circle closest-side at center, white, transparent)' }}
      />
      <div
        className={cx(
          'absolute z-3 w-80 h-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-out',
          'pointer-events-none',
        )}
        style={{ background: 'radial-gradient(circle closest-side at center, white, transparent)' }}
      />

      <div className="relative z-5 p-5">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `color-mix(in oklab, ${pack.themeColor} 18%, transparent)` }}
          >
            {pack.icon}
          </div>
          <div className="min-w-0">
            <div
              className={cx(
                'font-semibold text-lg leading-tight truncate',
                'transition-transform duration-300 ease-out',
                'group-hover:translate-x-[0.15rem]',
              )}
              style={{ color: 'var(--packTitle)' }}
            >
              {pack.name}
            </div>
            <div
              className={cx(
                'text-sm text-white/55 leading-snug line-clamp-2',
                'transition-transform duration-300 ease-out',
                'group-hover:translate-x-1',
              )}
            >
              {pack.tagline}
            </div>
          </div>
        </div>

        <div
          className={cx(
            'mt-3 text-sm text-white/45 leading-relaxed line-clamp-2',
            'transition-transform duration-300 ease-out',
            'group-hover:translate-x-1',
          )}
        >
          {pack.description}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-white/35">{disabled ? 'No questions yet' : `${pack.questionCount} questions`}</span>
          <div className="flex items-center gap-2">
            {typeof onToggleFavorite === 'function' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={cx(
                  'text-xs font-semibold rounded-full px-2 py-1 border transition',
                  favored
                    ? 'border-yellow-400/30 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/20'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                )}
                aria-label={favored ? 'Unfavorite pack' : 'Favorite pack'}
              >
                {favored ? '★' : '☆'}
              </button>
            ) : null}
            {typeof onTogglePin === 'function' && favored ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin();
                }}
                className={cx(
                  'text-xs font-semibold rounded-full px-2 py-1 border transition',
                  pinned
                    ? 'border-purple-400/30 bg-purple-500/15 text-purple-200 hover:bg-purple-500/20'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                )}
                aria-label={pinned ? 'Unpin pack' : 'Pin pack'}
              >
                {pinned ? 'Pinned' : 'Pin'}
              </button>
            ) : null}
            {rightBadges}
            <span
              className={cx(
                'text-xs font-semibold rounded-full px-2 py-1 border',
                selected ? 'border-white/20 bg-white/10 text-white/80' : 'border-white/10 bg-white/5 text-white/50',
              )}
            >
              {selected ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

