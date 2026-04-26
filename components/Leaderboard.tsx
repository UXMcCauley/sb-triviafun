'use client';

import ReactionCluster, { type ReactionCounts } from '@/components/ReactionCluster';

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
}

const RING = ['ring-[#ffd54f]', 'ring-trivia-cyan', 'ring-trivia-mint', 'ring-trivia-coral'] as const;

interface LeaderboardProps {
  players: LeaderboardPlayer[];
  highlightId?: string;
  compact?: boolean;
  maxVisible?: number;
  reactionsByPlayerId?: Record<string, ReactionCounts>;
  /** Wider "TV" style with PLAYERS header and rank trophies */
  variant?: 'default' | 'gameboard';
  /** e.g. "4/4" in the header badge; omit to show only current count */
  capacityLabel?: string;
}

export default function Leaderboard({
  players,
  highlightId,
  compact,
  maxVisible,
  reactionsByPlayerId,
  variant = 'default',
  capacityLabel,
}: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const limit = maxVisible || (compact ? 5 : sorted.length);
  const visible = sorted.slice(0, limit);
  const cap = capacityLabel ?? String(visible.length);

  if (compact) {
    return (
      <div className="max-h-[300px] space-y-1 overflow-y-auto">
        {visible.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
              player.id === highlightId ? 'bg-trivia-gold/15 text-trivia-gold' : 'bg-white/5 text-white/75'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-right text-white/35">{i + 1}</span>
              <span className="truncate">{player.name}</span>
            </span>
            <span className="ml-2 flex shrink-0 items-center gap-2">
              <ReactionCluster counts={reactionsByPlayerId?.[player.id]} />
              <span className="font-mono font-bold text-trivia-gold">{player.score.toLocaleString()}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'gameboard') {
    return (
      <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-0.5">
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-xs font-extrabold tracking-[0.2em] text-white/50">Players</h3>
          <span className="rounded-full border border-trivia-cyan/40 bg-trivia-cyan/15 px-2.5 py-0.5 text-xs font-extrabold text-trivia-cyan">
            {cap}
          </span>
        </div>
        {visible.map((player, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const ring = RING[i % RING.length];
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between gap-2 rounded-2xl border border-white/10 px-3 py-2.5 transition-all ${
                player.id === highlightId
                  ? 'border-trivia-gold/50 bg-trivia-gold/10 shadow-[0_0_0_1px_rgba(255,213,79,0.2)]'
                  : 'bg-trivia-navy-mid/60'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="w-7 shrink-0 text-center text-lg leading-none">
                  {medal || <span className="text-sm font-bold text-white/40">{i + 1}</span>}
                </span>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trivia-navy font-black text-xs text-white/90 ring-4 ${ring} ring-inset`}
                >
                  {player.name
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-white">{player.name}</p>
                  <p className="text-xs font-bold text-trivia-gold/90">{player.score.toLocaleString()} pts</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <ReactionCluster counts={reactionsByPlayerId?.[player.id]} />
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    player.id === highlightId
                      ? 'bg-trivia-mint shadow-[0_0_8px_2px_rgba(105,240,174,0.5)]'
                      : 'bg-white/15'
                  }`}
                  title={player.id === highlightId ? 'You' : ''}
                />
              </div>
            </div>
          );
        })}
        {sorted.length > limit && (
          <p className="pt-1 text-center text-sm text-white/30">+{sorted.length - limit} more</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] space-y-2 overflow-y-auto">
      {visible.map((player, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-500 ${
              player.id === highlightId
                ? 'border border-trivia-gold/50 bg-trivia-gold/10 scale-105'
                : i < 3
                  ? 'border border-white/10 bg-white/8'
                  : 'bg-white/5'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-8 shrink-0 text-center text-xl">
                {medal || <span className="text-base text-white/40">{i + 1}</span>}
              </span>
              <span className="truncate text-lg font-bold text-white">{player.name}</span>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-3">
              <ReactionCluster counts={reactionsByPlayerId?.[player.id]} />
              <span className="font-mono text-xl font-bold text-trivia-gold">{player.score.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
      {sorted.length > limit && (
        <p className="text-center text-sm text-white/30">+{sorted.length - limit} more</p>
      )}
    </div>
  );
}
