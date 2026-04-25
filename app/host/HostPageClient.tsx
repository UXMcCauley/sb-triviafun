'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type { PlayerJoinedEvent, AnswerRevealEvent, GameFinishedEvent, GamePausedEvent } from '@/lib/models/types';
import WinnersTicker from '@/components/WinnersTicker';
import GameQRCode from '@/components/GameQRCode';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

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

export type HostPageInitial = {
  packs?: string[];
  questions?: number;
  timer?: number;
  maxPlayers?: number;
};

export default function HostPageClient({ initial }: { initial: HostPageInitial }) {
  const [gameCode, setGameCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'lobby' | 'active' | 'finished'>('idle');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState('');

  const [numQuestions, setNumQuestions] = useState(() => initial.questions ?? 15);
  const [timerDuration, setTimerDuration] = useState(() => initial.timer ?? 15);
  const [maxPlayers, setMaxPlayers] = useState(() => initial.maxPlayers ?? 12);

  const [showWinnersTicker, setShowWinnersTicker] = useState(false);
  const [volume, setVolume] = useState(70);
  const [emojiCommentsEnabled, setEmojiCommentsEnabled] = useState(true);
  const [audienceEnabled, setAudienceEnabled] = useState(true);
  const [publicResults, setPublicResults] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [paused, setPaused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(() => initial.packs ?? []);
  const [packScrollIndex, setPackScrollIndex] = useState(0);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hostError, setHostError] = useState('');
  const packCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        setPacks(data);
        const defaults = data.filter((p) => p.isDefault).map((p) => p.id);
        setSelectedPackIds((prev) => (prev.length ? prev : defaults));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = packCarouselRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [packs.length]);

  const togglePack = (packId: string) => {
    setSelectedPackIds((prev) => {
      if (prev.includes(packId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== packId);
      }
      return [...prev, packId];
    });
  };

  /** When hosting on LAN / phone: set to your deployed origin so the QR opens production, not localhost. */
  const playUrlBase = process.env.NEXT_PUBLIC_PLAY_BASE_URL?.replace(/\/$/, '');

  const createGame = async () => {
    setHostError('');
    setLoading('create');
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
    if (!res.ok) {
      setHostError((data as { error?: string }).error || 'Failed to create game');
      setLoading('');
      return;
    }
    setGameCode(data.gameCode);
    setStatus('lobby');
    setLoading('');
  };

  const playAgain = async () => {
    if (!gameCode) return;
    setHostError('');
    setLoading('replay');
    try {
      const res = await fetch('/api/game/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });
      const data = (await res.json()) as { error?: string; players?: { id: string; name: string }[] };
      if (!res.ok) {
        setHostError(data.error || 'Could not start another round');
        setLoading('');
        return;
      }
      setStatus('lobby');
      setPlayers((data.players ?? []).map((p) => ({ ...p, score: 0 })));
      setRevealed(false);
      setPaused(false);
      setQuestionIndex(0);
    } catch {
      setHostError('Could not start another round');
    }
    setLoading('');
  };

  const startGame = async () => {
    setLoading('start');
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode }),
    });
    setStatus('active');
    setLoading('');
  };

  const revealAnswer = async () => {
    setLoading('reveal');
    await fetch('/api/game/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, action: 'reveal' }),
    });
    setRevealed(true);
    setLoading('');
  };

  const advanceQuestion = async () => {
    setLoading('advance');
    await fetch('/api/game/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, action: 'advance' }),
    });
    setRevealed(false);
    setLoading('');
  };

  const togglePause = async () => {
    const newPaused = !paused;
    setPaused(newPaused);
    await fetch('/api/game/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode, paused: newPaused }),
    });
  };

  useEffect(() => {
    if (!gameCode) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('player-joined', (data: PlayerJoinedEvent) => {
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
    });

    channel.bind('new-question', (data: { questionIndex: number; totalQuestions: number }) => {
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setRevealed(false);
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setPlayers(data.players);
      setRevealed(true);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => {
      setPaused(data.paused);
    });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setStatus('finished');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
    };
  }, [gameCode]);

  const canProceedToAdvanced = selectedPackIds.length > 0;
  const coreSummary = useMemo(() => {
    const packsLabel = selectedPackIds.length ? `${selectedPackIds.length} pack${selectedPackIds.length === 1 ? '' : 's'}` : 'No packs';
    return `${packsLabel} · ${numQuestions} Q · ${timerDuration}s · max ${maxPlayers}`;
  }, [maxPlayers, numQuestions, selectedPackIds.length, timerDuration]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-black mb-8">
        <span className="text-yellow-400">Host</span> Controls
      </h1>

      {status === 'idle' && (
        <div className="space-y-6 max-w-6xl">
          {packs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">Packs</h3>
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    const el = packCarouselRef.current;
                    if (!el) return;
                    const cardWidth = 252;
                    const currentCard = Math.round(el.scrollLeft / cardWidth);
                    const target = Math.max(0, currentCard - 1) * cardWidth;
                    el.scrollTo({ left: target, behavior: 'smooth' });
                  }}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all mr-3 disabled:opacity-20 disabled:cursor-default"
                  disabled={packScrollIndex === 0}
                >
                  ◀
                </button>

                <div
                  ref={packCarouselRef}
                  className="flex-1 min-w-0 flex items-stretch gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    setPackScrollIndex(Math.round(el.scrollLeft / 252));
                  }}
                >
                  {packs.map((pack) => {
                    const isEmpty = pack.questionCount === 0;
                    const isSelected = selectedPackIds.includes(pack.id);
                    return (
                      <button
                        key={pack.id}
                        onClick={() => !isEmpty && togglePack(pack.id)}
                        disabled={isEmpty}
                        className={`shrink-0 w-60 text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-start ${
                          isEmpty
                            ? 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                            : isSelected
                              ? 'border-white/40 bg-white/10'
                              : 'border-white/10 bg-white/5 opacity-60 hover:opacity-80'
                        }`}
                        style={isSelected && !isEmpty ? { borderColor: pack.themeColor + '80' } : undefined}
                      >
                        <p className="text-xs text-white/30">{isEmpty ? 'No questions yet' : `${pack.questionCount} questions`}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xl">{pack.icon}</span>
                          <span className="font-bold text-base whitespace-nowrap">{pack.name}</span>
                          {isEmpty && (
                            <span className="text-[10px] uppercase tracking-wider text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">{pack.description}</p>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    const el = packCarouselRef.current;
                    if (!el) return;
                    el.scrollTo({ left: el.scrollLeft + 260, behavior: 'smooth' });
                  }}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all ml-3 disabled:opacity-20 disabled:cursor-default"
                  disabled={!canScrollRight}
                >
                  ▶
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/4 p-6 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold">Setup</h2>
                <p className="text-sm text-white/55">{coreSummary}</p>
              </div>

              {!showAdvanced ? (
                <button
                  type="button"
                  disabled={!canProceedToAdvanced}
                  onClick={() => setShowAdvanced(true)}
                  className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm font-bold text-white/70 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to advanced
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdvanced(false)}
                  className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/60"
                >
                  Hide advanced
                </button>
              )}
            </div>

            <div className="mt-6 flex items-end gap-6 flex-wrap">
              <div>
                <label className="text-sm text-white/50 block mb-1">Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                >
                  {[10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n} className="bg-gray-900">{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/50 block mb-1">Timer (seconds)</label>
                <select
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                >
                  {[10, 15, 20, 30].map((n) => (
                    <option key={n} value={n} className="bg-gray-900">{n}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-[220px]">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white/50 block mb-1">Max players</label>
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
              </div>

              <button
                type="button"
                onClick={() => setShowWinnersTicker((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  showWinnersTicker
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300'
                    : 'bg-white/5 border-white/15 text-white/50 hover:text-white/70'
                }`}
              >
                <span className={`w-7 h-4 rounded-full relative transition-colors ${showWinnersTicker ? 'bg-yellow-400' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-black/80 transition-all ${showWinnersTicker ? 'left-3.5' : 'left-0.5'}`} />
                </span>
                Winners ticker
              </button>

              <button
                onClick={createGame}
                disabled={loading === 'create' || selectedPackIds.length === 0}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-50"
              >
                {loading === 'create' ? 'Creating...' : 'Create Game'}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">Volume</p>
                    <span className="text-sm font-mono text-white/60">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="mt-3 w-full accent-yellow-400"
                  />
                  <p className="mt-2 text-xs text-white/40">Stored with the game. Up to you if the TV actually listens.</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white/80">Emoji comments</span>
                    <input
                      type="checkbox"
                      checked={emojiCommentsEnabled}
                      onChange={(e) => setEmojiCommentsEnabled(e.target.checked)}
                      className="h-5 w-5 accent-yellow-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white/80">Enable audience</span>
                    <input
                      type="checkbox"
                      checked={audienceEnabled}
                      onChange={(e) => setAudienceEnabled(e.target.checked)}
                      className="h-5 w-5 accent-yellow-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white/80">Make results public</span>
                    <input
                      type="checkbox"
                      checked={publicResults}
                      onChange={(e) => setPublicResults(e.target.checked)}
                      className="h-5 w-5 accent-yellow-400"
                    />
                  </label>
                  <p className="text-xs text-white/40">These are broad-stroke flags for iteration; backend accepts them now.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {hostError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200" role="alert">
          {hostError}
        </div>
      )}

      {status === 'lobby' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-8 lg:items-start lg:gap-12">
            <div className="bg-white/10 rounded-xl p-6 inline-block shrink-0">
              <p className="text-sm text-white/50">Game Code</p>
              <p className="text-5xl font-mono font-bold tracking-widest text-yellow-400">{gameCode}</p>
              <p className="text-xs text-white/35 mt-3 max-w-xs">
                Same code until you finish and tap <span className="text-white/50">Play again</span>. Use{' '}
                <span className="text-white/50">New game</span> for a new room, link, and QR.
              </p>
            </div>
            {gameCode && (
              <div className="rounded-xl border border-white/10 bg-white/3 p-6">
                <p className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Join from a phone</p>
                <GameQRCode gameCode={gameCode} size={192} playUrlOverride={playUrlBase} />
              </div>
            )}
          </div>

          <div>
            <p className="text-white/60 mb-2">Players ({players.length})</p>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => (
                <span key={p.id} className="bg-white/10 px-3 py-1 rounded-full">{p.name}</span>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={players.length === 0 || loading === 'start' || loading === 'replay'}
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-50"
          >
            {loading === 'start' ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      )}

      {status === 'active' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-4 inline-block">
              <p className="text-sm text-white/50">Question</p>
              <p className="text-2xl font-bold">{questionIndex + 1} / {totalQuestions}</p>
            </div>
            {paused && (
              <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-bold">PAUSED</span>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            {!revealed ? (
              <button
                onClick={revealAnswer}
                disabled={loading === 'reveal'}
                className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
              >
                {loading === 'reveal' ? 'Revealing...' : 'Reveal Answer'}
              </button>
            ) : (
              <button
                onClick={advanceQuestion}
                disabled={loading === 'advance'}
                className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50"
              >
                {loading === 'advance' ? 'Advancing...' : 'Next Question'}
              </button>
            )}

            <button
              onClick={togglePause}
              className={`font-bold px-6 py-3 rounded-xl ${
                paused
                  ? 'bg-green-500 hover:bg-green-400 text-black'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </div>

          <div>
            <p className="text-white/60 mb-2">Scores</p>
            <div className="space-y-1 max-w-sm">
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex justify-between bg-white/5 px-3 py-1.5 rounded">
                  <span>{i + 1}. {p.name}</span>
                  <span className="font-mono text-yellow-300">{p.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/30 mt-4">
            <p>Note: Display view auto-advances through reveal → scoreboard → next question.</p>
            <p>Use these controls to manually trigger if needed.</p>
          </div>
        </div>
      )}

      {status === 'finished' && (
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-yellow-400">Game Over!</h2>
          <div className="space-y-1 max-w-sm">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className="flex justify-between bg-white/5 px-4 py-2 rounded-lg">
                <span className="font-semibold">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}
                </span>
                <span className="font-mono text-yellow-300">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={playAgain}
              disabled={loading === 'replay' || !gameCode}
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-50"
            >
              {loading === 'replay' ? 'Setting up...' : 'Play again'}
            </button>
            <button
              onClick={() => {
                setStatus('idle');
                setGameCode('');
                setPlayers([]);
                setRevealed(false);
                setPaused(false);
                setHostError('');
                setQuestionIndex(0);
                setTotalQuestions(0);
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
            >
              New game
            </button>
          </div>
          <p className="text-sm text-white/40 max-w-md">
            <span className="text-white/60">Play again</span> keeps this room and code (same people).{' '}
            <span className="text-white/60">New game</span> returns to setup and issues a new code, QR, and link.
          </p>
        </div>
      )}

      <WinnersTicker enabled={showWinnersTicker && status !== 'idle'} />
    </div>
  );
}

