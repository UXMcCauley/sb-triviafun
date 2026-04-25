'use client';

import ReactionCluster, { type ReactionCounts } from '@/components/ReactionCluster';

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardProps {
  players: LeaderboardPlayer[];
  highlightId?: string;
  compact?: boolean;
  maxVisible?: number;
  reactionsByPlayerId?: Record<string, ReactionCounts>;
}

export default function Leaderboard({ players, highlightId, compact, maxVisible, reactionsByPlayerId }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const limit = maxVisible || (compact ? 5 : sorted.length);
  const visible = sorted.slice(0, limit);

  if (compact) {
    return (
      <div className="space-y-1 overflow-y-auto max-h-[300px]">
        {visible.map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
              player.id === highlightId
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-white/5 text-white/70'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-white/40 w-4 text-right flex-shrink-0">{i + 1}</span>
              <span className="truncate">{player.name}</span>
            </span>
            <span className="flex items-center gap-2 flex-shrink-0 ml-2">
              <ReactionCluster counts={reactionsByPlayerId?.[player.id]} />
              <span className="font-mono font-bold">{player.score.toLocaleString()}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[70vh]">
      {visible.map((player, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-500 ${
              player.id === highlightId
                ? 'bg-yellow-500/20 border border-yellow-500/50 scale-105'
                : i < 3
                  ? 'bg-white/10 border border-white/10'
                  : 'bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl w-8 text-center flex-shrink-0">
                {medal || <span className="text-white/40 text-base">{i + 1}</span>}
              </span>
              <span className="text-lg font-semibold text-white truncate">
                {player.name}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              <ReactionCluster counts={reactionsByPlayerId?.[player.id]} />
              <span className="text-xl font-mono font-bold text-yellow-300">
                {player.score.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
      {sorted.length > limit && (
        <p className="text-center text-white/30 text-sm">+{sorted.length - limit} more</p>
      )}
    </div>
  );
}
