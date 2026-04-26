'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import GameQRCode from '@/components/GameQRCode';
import DisplayPageClient from '@/app/display/DisplayPageClient';
import ShareLinks from '@/components/ShareLinks';
import ThemePackCard from '@/components/ThemePackCard';
import LightDarkToggle from '@/components/LightDarkToggle';
import { authClient } from '@/lib/auth/client';

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
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
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

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch {}
    setUser(null);
    setFav({});
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
      // Lets `/display` auto-fill the room code if opened from this browser session.
      (globalThis as unknown as { __TRIVIAFUN_DISPLAY_CODE__?: string }).__TRIVIAFUN_DISPLAY_CODE__ = String(
        data.gameCode || ''
      ).toUpperCase();
      setTransitioning(true);
      setTimeout(() => setFlow('lobby'), 180);
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
      setTransitioning(true);
      setFlow('display');
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
    <div className="w-dvw min-h-dvh overflow-x-hidden bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-7xl font-ultralight tracking-tight">
              <span className="text-white">Trivia</span>
              <span className="text-pink-600 font-black">Fun</span>

            </h1>
            <p className="text-white/60 max-w-2xl">
              Time to have a relentless nerdy brain-off with whoever agrees to hang out with you.
            </p>
            {user ? (
              <p className="text-white/35 text-sm">
                Signed in as <span className="text-white/55">{user.email || user.name || 'Account'}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/how-to-play"
                className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
              >
                How to play
              </Link>
              <Link
                href="/packs"
                className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
              >
                Packs
              </Link>
              <Link
                href="/account"
                className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
              >
                Account
              </Link>
              <Link
                href="/report"
                className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
              >
                Report
              </Link>
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/auth/sign-in"
                  className="rounded-full border border-yellow-400/30 bg-yellow-500/20 hover:bg-yellow-500/25 px-3 py-1.5 text-xs font-extrabold text-yellow-100"
                >
                  Sign in
                </Link>
              )}
              <div className="ml-1 inline-flex items-center">
                <LightDarkToggle size={16} />
              </div>
            </div>
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
                    <ThemePackCard
                      key={pack.id}
                      pack={pack}
                      disabled={isEmpty}
                      selected={isSelected}
                      favored={isFav}
                      pinned={isPinned}
                      onClick={() => togglePack(pack.id)}
                      onToggleFavorite={user ? () => toggleFavorite(pack.id) : undefined}
                      onTogglePin={user ? () => togglePin(pack.id) : undefined}
                    />
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
              'fixed inset-0 z-40 transition-all duration-500 ease-out',
              flow === 'display'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none select-none',
            )}
          >
            <div
              className={cx(
                'h-dvh w-dvw flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
                'bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white',
                transitioning && 'opacity-100',
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-white/70 text-sm font-semibold">
                  Room <span className="text-yellow-300 font-mono tracking-widest">{gameCode}</span>
                </div>
                <button
                  type="button"
                  onClick={resetToSetup}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/60"
                >
                  Back to setup
                </button>
              </div>

              <div className="mt-6 flex-1 min-h-0 overflow-hidden">
                {flow === 'display' && gameCode ? (
                  <DisplayPageClient embedded hostGameCode={gameCode} key={gameCode} />
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={cx(
              'fixed inset-0 z-30 transition-all duration-500 ease-out',
              flow === 'lobby' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none select-none',
            )}
          >
            <div className="flex h-dvh w-dvw flex-col overflow-hidden bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-4 sm:px-6 sm:pt-8 lg:px-8">
                <div>
                  <Link href="/" className="inline-flex items-baseline gap-2 font-black tracking-tight">
                    <span className="text-2xl sm:text-3xl">
                      <span className="text-yellow-400">Trivia</span>Fun
                    </span>
                  </Link>
                  <div className="mt-1 text-sm text-white/55">
                    <span className="font-semibold text-white/70">
                      {selectedPackIds.length === 1
                        ? packs.find((p) => p.id === selectedPackIds[0])?.name || 'Trivia'
                        : `${selectedPackIds.length} packs`}
                    </span>{' '}
                    · {numQuestions} rounds · {players.length} players
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] lg:items-stretch">
                  <div className="rounded-3xl border border-white/10 bg-white/4 p-8 min-w-0">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-black">Lobby</h2>
                        <p className="text-white/55 mt-2">
                          Start game opens TV mode on this device. For a projector or second machine, use the TV display URL below.
                        </p>
                      </div>
                      <button
                        onClick={startGame}
                        disabled={players.length === 0 || loadingAction === 'start'}
                        className="rounded-2xl bg-green-500 hover:bg-green-400 text-black font-extrabold px-6 py-3 disabled:opacity-50"
                      >
                        {loadingAction === 'start' ? 'Starting…' : 'Start game'}
                      </button>
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

                    <div className="mt-8 flex justify-start">
                      <button
                        type="button"
                        onClick={resetToSetup}
                        className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/60"
                      >
                        New game
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[200px] w-full items-center justify-center py-2 lg:min-h-0 lg:h-full lg:min-w-0 lg:py-0 lg:sticky lg:top-4 lg:self-stretch">
                    <GameQRCode fit gameCode={gameCode} size={200} />
                  </div>
                </div>
              </div>

              <footer className="shrink-0 w-full border-t border-white/10 bg-white/6 px-4 py-5 sm:px-6 lg:px-8 rounded-t-2xl rounded-b-none">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Share links</h3>
                <ShareLinks gameCode={gameCode} variant="lobbyStrip" />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
