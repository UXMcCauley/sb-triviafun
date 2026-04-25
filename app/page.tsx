'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import GameQRCode from '@/components/GameQRCode';
import DisplayPageClient from '@/app/display/DisplayPageClient';
import ShareLinks from '@/components/ShareLinks';

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

type LobbyPlayer = { id: string; name: string; score: number };

export default function Home() {
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [showWinnersTicker, setShowWinnersTicker] = useState(false);
  const [volume, setVolume] = useState(70);
  const [emojiCommentsEnabled, setEmojiCommentsEnabled] = useState(true);
  const [audienceEnabled, setAudienceEnabled] = useState(true);
  const [publicResults, setPublicResults] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [flow, setFlow] = useState<'setup' | 'lobby' | 'display'>('setup');
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [hostError, setHostError] = useState('');
  const [loadingAction, setLoadingAction] = useState<'create' | 'start' | ''>('');
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string | null; name: string | null } | null>(null);
  const [fav, setFav] = useState<Record<string, { pinned: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        if (cancelled) return;
        setPacks(data);
        // No default pack selection — user chooses intentionally.
        setSelectedPackIds([]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        setUser(data?.user || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/packs/favorites')
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, { pinned: boolean }> = {};
        for (const f of (data?.favorites || []) as Array<{ packId: string; pinned: boolean }>) {
          next[f.packId] = { pinned: Boolean(f.pinned) };
        }
        setFav(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const selectedCount = selectedPackIds.length;
  const canCreate = selectedCount > 0;

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) => {
      if (prev.includes(packId)) return prev.filter((id) => id !== packId);
      return [...prev, packId];
    });
  };

  const toggleFavorite = async (packId: string) => {
    if (!user) return;
    const isFav = Boolean(fav[packId]);
    const next = { ...fav };
    if (isFav) delete next[packId];
    else next[packId] = { pinned: false };
    setFav(next);
    await fetch('/api/packs/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, action: isFav ? 'unfavorite' : 'favorite' }),
    }).catch(() => {});
  };

  const togglePin = async (packId: string) => {
    if (!user) return;
    if (!fav[packId]) return;
    const pinned = !fav[packId]?.pinned;
    setFav((prev) => ({ ...prev, [packId]: { pinned } }));
    await fetch('/api/packs/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, action: pinned ? 'pin' : 'unpin' }),
    }).catch(() => {});
  };

  const sortedPacks = useMemo(() => {
    const withRank = packs.map((p, idx) => ({
      p,
      idx,
      pinned: Boolean(fav[p.id]?.pinned),
      favored: Boolean(fav[p.id]),
    }));
    withRank.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.favored !== b.favored) return a.favored ? -1 : 1;
      return a.idx - b.idx;
    });
    return withRank.map((x) => x.p);
  }, [packs, fav]);

  const createGame = async () => {
    if (!canCreate) return;
    setHostError('');
    setLoadingAction('create');
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            settingsVersion: 1,
            questionCount: numQuestions,
            timerSeconds: timerDuration,
            showWinnersTicker,
            maxPlayers,
            volume,
            emojiCommentsEnabled,
            audienceEnabled,
            publicResults,
          },
          packIds: selectedPackIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to create game');
      setGameCode(String(data.gameCode || '').toUpperCase());
      setPlayers([]);
      // Immediately transition into the TV gameplay runtime (intro → countdown once started).
      (globalThis as unknown as { __TRIVIAFUN_DISPLAY_CODE__?: string }).__TRIVIAFUN_DISPLAY_CODE__ = String(
        data.gameCode || ''
      ).toUpperCase();
      setTransitioning(true);
      setTimeout(() => setFlow('display'), 180);
    } catch (e) {
      setHostError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoadingAction('');
    }
  };

  const startGame = async () => {
    if (!gameCode) return;
    setHostError('');
    setLoadingAction('start');
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to start game');
    } catch (e) {
      setHostError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setLoadingAction('');
    }
  };

  useEffect(() => {
    if (flow !== 'lobby' || !gameCode) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    // Prime from server state (includes existing players)
    fetch(`/api/game/state?gameCode=${encodeURIComponent(gameCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rows = (data?.players || []) as Array<{ id: string; name: string; score: number }>;
        if (rows.length) setPlayers(rows);
      })
      .catch(() => {});

    channel.bind('player-joined', (data: { players: Array<{ id: string; name: string }> }) => {
      setPlayers((prev) => data.players.map((p) => ({ id: p.id, name: p.name, score: prev.find((x) => x.id === p.id)?.score ?? 0 })));
    });

    channel.bind('answer-reveal', (data: { players: Array<{ id: string; name: string; score: number }> }) => {
      setPlayers(data.players);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
    };
  }, [flow, gameCode]);

  const resetToSetup = () => {
    setFlow('setup');
    setGameCode('');
    setPlayers([]);
    setHostError('');
    setLoadingAction('');
    setTransitioning(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              <span className="text-yellow-400">TriviaFun</span> host setup
            </h1>
            <p className="text-white/60 max-w-2xl">
              Pick packs, tune the knobs, and we’ll drop you straight into TV mode.
            </p>
            {user ? (
              <p className="text-white/35 text-sm">
                Signed in as <span className="text-white/55">{user.email || user.name || 'Account'}</span>
              </p>
            ) : null}
          </div>
        </div>

        {hostError ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {hostError}
          </div>
        ) : null}

        <div className="relative mt-8">
          <div
            className={cx(
              'transition-all duration-500 ease-out',
              flow === 'setup' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none select-none',
            )}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedPacks.map((pack) => {
                  const isEmpty = pack.questionCount === 0;
                  const isSelected = selectedPackIds.includes(pack.id);
                  const isFav = Boolean(fav[pack.id]);
                  const isPinned = Boolean(fav[pack.id]?.pinned);
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
                          <div className="flex items-center gap-2">
                            {user ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleFavorite(pack.id);
                                }}
                                className={cx(
                                  'text-xs font-semibold rounded-full px-2 py-1 border transition',
                                  isFav
                                    ? 'border-yellow-400/30 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/20'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                                )}
                                aria-label={isFav ? 'Unfavorite pack' : 'Favorite pack'}
                              >
                                {isFav ? '★' : '☆'}
                              </button>
                            ) : null}
                            {user && isFav ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePin(pack.id);
                                }}
                                className={cx(
                                  'text-xs font-semibold rounded-full px-2 py-1 border transition',
                                  isPinned
                                    ? 'border-purple-400/30 bg-purple-500/15 text-purple-200 hover:bg-purple-500/20'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                                )}
                                aria-label={isPinned ? 'Unpin pack' : 'Pin pack'}
                              >
                                {isPinned ? 'Pinned' : 'Pin'}
                              </button>
                            ) : null}
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
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-white/10 bg-white/4 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <div className="p-6 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold">Game settings</h2>
                  <p className="text-sm text-white/55">Set the basics, then optionally tweak the chaos knobs.</p>
                  <p className="text-sm text-white/45">
                    {loading ? 'Loading packs…' : `${packs.length} packs`} ·{' '}
                    <span className={selectedCount ? 'text-yellow-200 font-semibold' : ''}>{selectedCount} selected</span>
                  </p>
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

                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 text-sm font-bold text-white/70 flex items-center justify-between"
                >
                  <span>More options</span>
                  <span className="text-white/40">{moreOpen ? '−' : '+'}</span>
                </button>

                {moreOpen ? (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/3 p-4">
                    <label className="space-y-2 block">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Volume</span>
                        <span className="text-sm font-mono text-white/70">{volume}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full accent-yellow-400"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white/80">Emoji comments</span>
                      <input
                        type="checkbox"
                        checked={emojiCommentsEnabled}
                        onChange={(e) => setEmojiCommentsEnabled(e.target.checked)}
                        className="h-5 w-5 accent-yellow-400"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white/80">Enable audience</span>
                      <input
                        type="checkbox"
                        checked={audienceEnabled}
                        onChange={(e) => setAudienceEnabled(e.target.checked)}
                        className="h-5 w-5 accent-yellow-400"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white/80">Make results public</span>
                      <input
                        type="checkbox"
                        checked={publicResults}
                        onChange={(e) => setPublicResults(e.target.checked)}
                        className="h-5 w-5 accent-yellow-400"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white/80">Winners ticker</span>
                      <input
                        type="checkbox"
                        checked={showWinnersTicker}
                        onChange={(e) => setShowWinnersTicker(e.target.checked)}
                        className="h-5 w-5 accent-yellow-400"
                      />
                    </label>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={createGame}
                  disabled={loadingAction === 'create' || !canCreate}
                  className={cx(
                    'w-full text-center rounded-2xl px-5 py-3 font-extrabold transition',
                    canCreate
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black disabled:opacity-50'
                      : 'bg-white/10 text-white/30 cursor-not-allowed',
                  )}
                >
                  {loadingAction === 'create' ? 'Creating…' : 'Create game'}
                </button>

                <ShareLinks variant="full" className="mt-2" />
              </div>
            </aside>
          </div>
          </div>

          <div
            className={cx(
              'absolute inset-0 transition-all duration-500 ease-out',
              flow === 'display'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none select-none',
            )}
          >
            <div className={cx('transition-opacity duration-500', transitioning && 'opacity-100')}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">
                    Hosting <span className="text-yellow-300 font-mono tracking-widest">{gameCode}</span>
                  </h2>
                  <p className="text-white/55 text-sm">You’re now in TV mode. Players join; then hit Start game in the intro.</p>
                </div>
                <button
                  type="button"
                  onClick={resetToSetup}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/60"
                >
                  Back to setup
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/4 overflow-hidden">
                <DisplayPageClient />
              </div>
            </div>
          </div>

          <div
            className={cx(
              'absolute inset-0 transition-all duration-500 ease-out',
              flow === 'lobby' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none select-none',
            )}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black">
                    Game code{' '}
                    <span className="font-mono tracking-widest text-yellow-300">{gameCode}</span>
                  </h2>
                  <p className="text-white/55 mt-2">Leave this on the host device. TV runs `/display`.</p>
                </div>
                <button
                  type="button"
                  onClick={resetToSetup}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/60"
                >
                  New game
                </button>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                <button
                  onClick={startGame}
                  disabled={players.length === 0 || loadingAction === 'start'}
                  className="rounded-2xl bg-green-500 hover:bg-green-400 text-black font-extrabold px-6 py-3 disabled:opacity-50"
                >
                  {loadingAction === 'start' ? 'Starting…' : 'Start game'}
                </button>
                <Link
                  href={`/display`}
                  className="rounded-2xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-400/25 px-6 py-3 font-bold text-yellow-200"
                >
                  Open TV display
                </Link>
              </div>

              <div className="mt-8">
                <p className="text-sm text-white/60 mb-2">Players ({players.length})</p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <span key={p.id} className="bg-white/10 px-3 py-1 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>
                {players.length === 0 ? (
                  <p className="mt-3 text-sm text-white/40">Waiting for at least one player to join…</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Join from phone</h3>
              <GameQRCode gameCode={gameCode} size={220} />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
