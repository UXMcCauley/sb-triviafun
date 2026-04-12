'use client';

interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardProps {
  players: LeaderboardPlayer[];
  highlightId?: string;
  compact?: boolean;
}

export default function Leaderboard({ players, highlightId, compact }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  if (compact) {
    return (
      <div className="space-y-1">
        {sorted.slice(0, 5).map((player, i) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
              player.id === highlightId
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-white/5 text-white/70'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-white/40 w-4 text-right">{i + 1}</span>
              <span className="truncate max-w-[120px]">{player.name}</span>
            </span>
            <span className="font-mono font-bold">{player.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((player, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between px-6 py-3 rounded-xl transition-all duration-500 ${
              player.id === highlightId
                ? 'bg-yellow-500/20 border border-yellow-500/50 scale-105'
                : i < 3
                  ? 'bg-white/10 border border-white/10'
                  : 'bg-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl w-10 text-center">
                {medal || <span className="text-white/40 text-lg">{i + 1}</span>}
              </span>
              <span className="text-xl font-semibold text-white truncate max-w-[200px]">
                {player.name}
              </span>
            </div>
            <span className="text-2xl font-mono font-bold text-yellow-300">
              {player.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
