'use client';

export type ReactionCounts = Record<string, number>;

export default function ReactionCluster({ counts }: { counts: ReactionCounts | undefined }) {
  const entries = counts ? Object.entries(counts).filter(([, c]) => c > 0) : [];
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 4);

  return (
    <div className="flex items-center gap-1.5">
      {top.map(([emoji, count]) => (
        <span
          key={emoji}
          className="text-xs bg-black/30 border border-white/10 rounded-full px-2 py-0.5 font-semibold text-white/80"
          title={`${count} ${emoji}`}
        >
          {emoji} {count}
        </span>
      ))}
    </div>
  );
}

