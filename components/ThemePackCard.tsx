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
  arcade = false,
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
  /** Bouncy scale hover + pop (host grid). */
  arcade?: boolean;
}) {
  const accentMixes = ['#22d3ee', '#a855f7', '#f97316', '#22c55e', '#e11d48'];
  const mix = accentMixes[hashToIndex(pack.id || pack.name, accentMixes.length)];

  // M3 state layer opacity targets (hover/pressed) for surface interactions.
  // Use on-surface as the state layer color so it works in light + dark.
  const stateLayer = 'color-mix(in oklab, var(--md-sys-color-on-surface) 10%, transparent)';

  const gradient = `linear-gradient(to bottom,
    color-mix(in oklab, ${pack.themeColor} 78%, ${mix} 22%),
    color-mix(in oklab, ${pack.themeColor} 88%, var(--md-sys-color-primary) 12%),
    color-mix(in oklab, ${pack.themeColor} 72%, var(--md-sys-color-tertiary) 28%)
  )`;
  const titleColor = `color-mix(in oklab, var(--md-sys-color-primary) 55%, ${pack.themeColor} 45%)`;

  const style = {
    ['--packGradient' as string]: gradient,
    ['--packTitle' as string]: titleColor,
    ['--mdCardElevRest' as string]: 'var(--md-sys-elevation-level1)',
    ['--mdCardElevHover' as string]: 'var(--md-sys-elevation-level2)',
  } as CSSProperties;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...style,
        boxShadow: 'var(--mdCardElevRest)',
      }}
      className={cx(
        'group text-left',
        // M3 card shape: 12dp corner radius
        'relative isolate overflow-hidden rounded-xl',
        // M3 elevation: level 1 rest, level 2 hover
        'transition-[transform,box-shadow] duration-200 ease-out',
        arcade && 'trivia-arcade-pack rounded-2xl',
        arcade && selected && 'ring-2 ring-trivia-gold/70 ring-offset-2 ring-offset-trivia-navy',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      aria-disabled={disabled || undefined}
    >
      {/* M3 surface + outline */}
      <div
        className="absolute inset-0 z-1"
        style={{
          background: 'var(--md-sys-color-surface-container-low)',
          outline: `1px solid ${selected
            ? 'color-mix(in oklab, var(--md-sys-color-primary) 55%, var(--md-sys-color-outline-variant) 45%)'
            : 'var(--md-sys-color-outline-variant)'}`,
          outlineOffset: '-1px',
        }}
      />

      {/* M3 state layer */}
      <div
        className="absolute inset-0 z-2 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-[0.08] group-active:opacity-[0.12]"
        style={{ background: stateLayer }}
      />

      {/* left gradient bar (replaces :after) */}
      <div
        className={cx(
          'absolute z-4 w-1',
          'top-3 bottom-3 left-3',
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

      <div
        className="relative z-5 px-4 py-4"
        style={{
          // Elevation change on hover without Tailwind shadow classes.
          // We use inline style so this stays token-driven.
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `color-mix(in oklab, ${pack.themeColor} 18%, transparent)` }}
          >
            {pack.icon}
          </div>
          <div className="min-w-0">
            <div
              className={cx(
                'truncate',
                'transition-transform duration-300 ease-out',
                'group-hover:translate-x-[0.15rem]',
              )}
              style={{
                color: 'var(--packTitle)',
                fontSize: 'var(--md-sys-typescale-title-medium-font-size)',
                lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
                fontWeight: 'var(--md-sys-typescale-title-medium-font-weight)' as unknown as number,
                letterSpacing: 'var(--md-sys-typescale-title-medium-letter-spacing)',
              }}
            >
              {pack.name}
            </div>
            <div
              className={cx(
                'line-clamp-2',
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
            'mt-3 line-clamp-2',
            'transition-transform duration-300 ease-out',
            'group-hover:translate-x-1',
          )}
          style={{
            color: 'var(--md-sys-color-on-surface-variant)',
            fontSize: 'var(--md-sys-typescale-body-medium-font-size)',
            lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
            fontWeight: 'var(--md-sys-typescale-body-medium-font-weight)' as unknown as number,
            letterSpacing: 'var(--md-sys-typescale-body-medium-letter-spacing)',
          }}
        >
          {pack.description}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className="uppercase"
            style={{
              color: 'var(--md-sys-color-on-surface-variant)',
              fontSize: 'var(--md-sys-typescale-label-small-font-size)',
              lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
              fontWeight: 'var(--md-sys-typescale-label-small-font-weight)' as unknown as number,
              letterSpacing: 'var(--md-sys-typescale-label-small-letter-spacing)',
            }}
          >
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

      {/* hover elevation bump */}
      <style jsx>{`
        button:hover {
          box-shadow: var(--mdCardElevHover);
        }
        button:active {
          box-shadow: var(--md-sys-elevation-level1);
        }
      `}</style>
    </button>
  );
}

