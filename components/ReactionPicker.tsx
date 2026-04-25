'use client';

const EMOJIS = ['🔥', '😂', '😬', '👏', '💀', '🤯', '😡', '🫠', '🧠', '🍿', '🏆'] as const;

export default function ReactionPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className || ''}`}>
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-lg flex items-center justify-center transition-all active:scale-95"
          aria-label={`React ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

