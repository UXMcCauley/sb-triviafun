'use client';

import { useState, useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type { PlayerJoinedEvent, AnswerRevealEvent, GameFinishedEvent, GamePausedEvent } from '@/lib/models/types';
import WinnersTicker from '@/components/WinnersTicker';

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

export default function HostPage() {
  const [gameCode, setGameCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'lobby' | 'active' | 'finished'>('idle');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState('');
  const [numQuestions, setNumQuestions] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [showWinnersTicker, setShowWinnersTicker] = useState(false);
  const [paused, setPaused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
  const [packScrollIndex, setPackScrollIndex] = useState(0);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const packCarouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        setPacks(data);
        const defaults = data.filter((p) => p.isDefault).map((p) => p.id);
        setSelectedPackIds(defaults);
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

  const createGame = async () => {
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
        },
        packIds: selectedPackIds,
      }),
    });
    const data = await res.json();
    setGameCode(data.gameCode);
    setStatus('lobby');
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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-black mb-8">
        <span className="text-yellow-400">Host</span> Controls
      </h1>

      {status === 'idle' && (
        <div className="space-y-6 max-w-5xl">
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

          <div className="flex items-end gap-6 flex-wrap">
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
        </div>
      )}

      {status === 'lobby' && (
        <div className="space-y-6">
          <div className="bg-white/10 rounded-xl p-6 inline-block">
            <p className="text-sm text-white/50">Game Code</p>
            <p className="text-5xl font-mono font-bold tracking-widest text-yellow-400">{gameCode}</p>
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
            disabled={players.length === 0 || loading === 'start'}
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
          <button
            onClick={() => {
              setStatus('idle');
              setGameCode('');
              setPlayers([]);
              setRevealed(false);
              setPaused(false);
            }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
          >
            New Game
          </button>
        </div>
      )}

      <WinnersTicker enabled={showWinnersTicker && status !== 'idle'} />
    </div>
  );
}
