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

  const gradient = `linear-gradient(to bottom,
    color-mix(in oklab, ${pack.themeColor} 78%, ${mix} 22%),
    color-mix(in oklab, ${pack.themeColor} 88%, var(--md-sys-color-primary) 12%),
    color-mix(in oklab, ${pack.themeColor} 72%, var(--md-sys-color-tertiary) 28%)
  )`;
  const titleColor = `color-mix(in oklab, var(--md-sys-color-primary) 55%, ${pack.themeColor} 45%)`;

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
        'border',
        'shadow-[0_1px_0_rgba(0,0,0,0.10)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
        'transition-all',
        disabled && 'opacity-40 cursor-not-allowed',
        selected && !disabled && 'ring-2 ring-[color-mix(in_oklab,var(--md-sys-color-primary)_45%,transparent)]',
      )}
      aria-disabled={disabled || undefined}
    >
      {/* inner inset panel (replaces :before) */}
      <div
        className="absolute inset-px rounded-[15px] z-2"
        style={{ background: 'var(--md-sys-color-surface)' }}
      />

      {/* container background + outline in M3 terms */}
      <div
        className="absolute inset-0"
        style={{
          background: 'var(--md-sys-color-surface-container)',
          borderColor: selected
            ? 'color-mix(in oklab, var(--md-sys-color-primary) 55%, var(--md-sys-color-outline-variant) 45%)'
            : 'var(--md-sys-color-outline-variant)',
        }}
      />

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
        style={{
          background:
            'radial-gradient(circle closest-side at center, color-mix(in oklab, var(--md-sys-color-primary) 80%, white 20%), transparent)',
        }}
      />
      <div
        className={cx(
          'absolute z-3 w-80 h-80 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-out',
          'pointer-events-none',
        )}
        style={{
          background:
            'radial-gradient(circle closest-side at center, color-mix(in oklab, var(--md-sys-color-tertiary) 70%, white 30%), transparent)',
        }}
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
                'text-sm leading-snug line-clamp-2',
                'transition-transform duration-300 ease-out',
                'group-hover:translate-x-1',
              )}
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {pack.tagline}
            </div>
          </div>
        </div>

        <div
          className={cx(
            'mt-3 text-sm leading-relaxed line-clamp-2',
            'transition-transform duration-300 ease-out',
            'group-hover:translate-x-1',
          )}
          style={{ color: 'color-mix(in oklab, var(--md-sys-color-on-surface-variant) 80%, var(--md-sys-color-on-surface) 20%)' }}
        >
          {pack.description}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs" style={{ color: 'var(--md-sys-color-outline)' }}>
            {disabled ? 'No questions yet' : `${pack.questionCount} questions`}
          </span>
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
                    ? 'hover:opacity-90'
                    : 'hover:opacity-90',
                )}
                aria-label={favored ? 'Unfavorite pack' : 'Favorite pack'}
                style={
                  favored
                    ? {
                        borderColor: 'color-mix(in oklab, var(--md-sys-color-tertiary) 45%, transparent)',
                        background: 'color-mix(in oklab, var(--md-sys-color-tertiary-container) 55%, transparent)',
                        color: 'var(--md-sys-color-on-tertiary-container)',
                      }
                    : {
                        borderColor: 'var(--md-sys-color-outline-variant)',
                        background: 'color-mix(in oklab, var(--md-sys-color-surface-container-high) 55%, transparent)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                      }
                }
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
                  'hover:opacity-90',
                )}
                aria-label={pinned ? 'Unpin pack' : 'Pin pack'}
                style={
                  pinned
                    ? {
                        borderColor: 'color-mix(in oklab, var(--md-sys-color-secondary) 45%, transparent)',
                        background: 'color-mix(in oklab, var(--md-sys-color-secondary-container) 55%, transparent)',
                        color: 'var(--md-sys-color-on-secondary-container)',
                      }
                    : {
                        borderColor: 'var(--md-sys-color-outline-variant)',
                        background: 'color-mix(in oklab, var(--md-sys-color-surface-container-high) 55%, transparent)',
                        color: 'var(--md-sys-color-on-surface-variant)',
                      }
                }
              >
                {pinned ? 'Pinned' : 'Pin'}
              </button>
            ) : null}
            {rightBadges}
            <span
              className={cx(
                'text-xs font-semibold rounded-full px-2 py-1 border',
                'select-none',
              )}
              style={
                selected
                  ? {
                      borderColor: 'color-mix(in oklab, var(--md-sys-color-primary) 55%, transparent)',
                      background: 'color-mix(in oklab, var(--md-sys-color-primary-container) 65%, transparent)',
                      color: 'var(--md-sys-color-on-primary-container)',
                    }
                  : {
                      borderColor: 'var(--md-sys-color-outline-variant)',
                      background: 'color-mix(in oklab, var(--md-sys-color-surface-container-high) 55%, transparent)',
                      color: 'var(--md-sys-color-on-surface-variant)',
                    }
              }
            >
              {selected ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

