'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface PackInfo {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questionCount: number;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function Home() {
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [maxPlayers, setMaxPlayers] = useState(12);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        if (cancelled) return;
        setPacks(data);
        const defaults = data.filter((p) => p.isDefault).map((p) => p.id);
        setSelectedPackIds(defaults.length ? defaults : data.slice(0, 3).map((p) => p.id));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCount = selectedPackIds.length;
  const canContinue = selectedCount > 0;

  const hostHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedPackIds.length) params.set('packs', selectedPackIds.join(','));
    params.set('questions', String(numQuestions));
    params.set('timer', String(timerDuration));
    params.set('maxPlayers', String(maxPlayers));
    return `/host?${params.toString()}`;
  }, [maxPlayers, numQuestions, selectedPackIds, timerDuration]);

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) => {
      if (prev.includes(packId)) return prev.filter((id) => id !== packId);
      return [...prev, packId];
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Pick your <span className="text-yellow-400">trivia themes</span>
            </h1>
            <p className="text-white/60 max-w-2xl">
              Material-ish, projector-friendly, and built for quick iteration. Choose packs, set the basics, then jump into host configuration.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/play"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              Join game
            </Link>
            <Link
              href="/watch"
              className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-500/20 transition"
            >
              Watch
            </Link>
            <Link
              href="/display"
              className="rounded-xl border border-yellow-400/25 bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/25 transition"
            >
              TV display
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">
                {loading ? 'Loading packs…' : `${packs.length} packs`} · {selectedCount} selected
              </p>
              <button
                type="button"
                onClick={() => setSelectedPackIds(packs.filter((p) => p.isDefault).map((p) => p.id))}
                className="text-sm text-white/50 hover:text-white/70 transition"
                disabled={loading}
              >
                Reset to defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {packs.map((pack) => {
                const isEmpty = pack.questionCount === 0;
                const isSelected = selectedPackIds.includes(pack.id);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => !isEmpty && togglePack(pack.id)}
                    disabled={isEmpty}
                    className={cx(
                      'group text-left rounded-2xl border transition-all',
                      'bg-white/4 hover:bg-white/6',
                      'shadow-[0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
                      isEmpty && 'opacity-40 cursor-not-allowed',
                      isSelected ? 'border-white/35' : 'border-white/10',
                    )}
                    style={
                      isSelected && !isEmpty
                        ? { borderColor: `${pack.themeColor}80`, boxShadow: `0 0 0 1px ${pack.themeColor}40 inset` }
                        : undefined
                    }
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: `${pack.themeColor}26` }}
                        >
                          {pack.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-lg leading-tight truncate">{pack.name}</p>
                          <p className="text-sm text-white/55 leading-snug line-clamp-2">{pack.tagline}</p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-white/45 leading-relaxed line-clamp-3">{pack.description}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-white/35">
                          {isEmpty ? 'No questions yet' : `${pack.questionCount} questions`}
                        </span>
                        <span
                          className={cx(
                            'text-xs font-semibold rounded-full px-2 py-1 border',
                            isSelected ? 'border-white/20 bg-white/10 text-white/80' : 'border-white/10 bg-white/5 text-white/50',
                          )}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-white/10 bg-white/4 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold">Game basics</h2>
                <p className="text-sm text-white/55">Pick the stuff you’ll want before you’re staring at a room full of people.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Questions</span>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  >
                    {[10, 15, 20, 25, 30].map((n) => (
                      <option key={n} value={n} className="bg-gray-950">
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Timer</span>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number(e.target.value))}
                    className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  >
                    {[10, 15, 20, 30].map((n) => (
                      <option key={n} value={n} className="bg-gray-950">
                        {n}s
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2 block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Max players</span>
                  <span className="text-sm font-mono text-white/70">{maxPlayers}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={40}
                  step={1}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </label>

              <Link
                href={hostHref}
                aria-disabled={!canContinue}
                tabIndex={canContinue ? 0 : -1}
                className={cx(
                  'block text-center rounded-2xl px-5 py-3 font-extrabold transition',
                  canContinue
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    : 'bg-white/10 text-white/30 cursor-not-allowed',
                )}
              >
                Continue to host setup
              </Link>

              <p className="text-xs text-white/35 leading-relaxed">
                You’ll open <span className="text-white/50">/display</span> on the TV and players join from phones via{' '}
                <span className="text-white/50">/play</span>. This page just gets the “don’t-make-me-think” decisions out of the way.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
