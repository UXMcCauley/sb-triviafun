'use client';

import { useEffect, useMemo, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';

type WinnerItem = {
  winnerName: string;
  winnerScore: number;
  gameCode: string;
  finishedAt: string;
};

export default function WinnersTicker({
  enabled,
  region,
}: {
  enabled: boolean;
  region?: string;
}) {
  const [items, setItems] = useState<WinnerItem[]>([]);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (region) u.set('region', region);
    u.set('limit', '10');
    return u.toString();
  }, [region]);

  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/winners/recent?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setItems(Array.isArray(data?.winners) ? data.winners : []))
      .catch(() => {});
  }, [enabled, qs]);

  useEffect(() => {
    if (!enabled) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe('global-winners');
    channel.bind('recent-winner', (data: WinnerItem) => {
      setItems((prev) => [data, ...prev].slice(0, 10));
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('global-winners');
    };
  }, [enabled]);

  if (!enabled || items.length === 0) return null;

  const text = items
    .map((w) => `🏆 ${w.winnerName} (${w.winnerScore.toLocaleString()} pts)`)
    .join('  •  ');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/60 border-t border-white/10 backdrop-blur-sm">
      <div className="px-4 py-2 overflow-hidden">
        <div className="whitespace-nowrap animate-[ticker_30s_linear_infinite] text-sm text-white/70">
          {text}
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

