'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  AnswerRevealEvent,
  GameFinishedEvent,
  GamePausedEvent,
  GameStartedEvent,
  NewQuestionEvent,
  PlayerResult,
} from '@/lib/models/types';
import QuestionCard from '@/components/QuestionCard';
import Leaderboard from '@/components/Leaderboard';
import ShareLinks from '@/components/ShareLinks';

type Props = {
  /** When true, render as an embedded panel inside another page (no 100vw/100vh sizing). */
  embedded?: boolean;
  /** When embedded on the host page, join this room (avoids stale one-shot global injection). */
  hostGameCode?: string;
};

type Phase =
  | 'join'
  | 'intro'
  | 'countdown'
  | 'question-stinger'
  | 'question-prompt'
  | 'question-answers'
  | 'reveal'
  | 'answer-scores'
  | 'rankings'
  | 'finished';

type DisplayPlayer = {
  id: string;
  name: string;
  score: number;
  avatarUrl?: string | null;
  globalRank?: number | null;
};

type Pack = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
};

type SeriesGame = {
  gameIndex: number;
  gameCode: string;
  results: Array<{ id: string; name: string; score: number; rank: number }>;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export default function DisplayPageClient({ embedded = false, hostGameCode }: Props) {
  const [phase, setPhase] = useState<Phase>('join');
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);

  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);

  const [packs, setPacks] = useState<Pack[]>([]);
  const [players, setPlayers] = useState<DisplayPlayer[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);

  const [seriesHistory, setSeriesHistory] = useState<SeriesGame[] | null>(null);

  const tickingRef = useRef<number | null>(null);
  const revealRequestedRef = useRef(false);
  const advanceRequestedRef = useRef(false);

  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!phaseEndsAt) return;
    const id = window.setInterval(() => setNowMs(Date.now() + serverOffsetMs), 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt, serverOffsetMs]);

  const secondsLeft = phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - nowMs) / 1000)) : null;

  const isLastQuestion = useMemo(() => {
    if (!currentQuestion) return false;
    return currentQuestion.questionIndex + 1 >= currentQuestion.totalQuestions;
  }, [currentQuestion]);

  const coreSubtitle = useMemo(() => {
    const packNames = packs.slice(0, 3).map((p) => p.name).join(' · ');
    const more = packs.length > 3 ? ` +${packs.length - 3}` : '';
    const packLine = packs.length ? `${packNames}${more}` : 'Packs';
    return `${packLine} · ${totalQuestions || '—'} rounds · ${players.length} players`;
  }, [packs, players.length, totalQuestions]);

  const setTimedPhase = (p: Phase, seconds: number) => {
    setPhase(p);
    setPhaseEndsAt(Date.now() + serverOffsetMs + seconds * 1000);
  };

  const fetchState = async (code: string) => {
    const res = await fetch(`/api/game/state?gameCode=${encodeURIComponent(code.toUpperCase())}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Game not found');
    if (typeof data?.serverNow === 'number') {
      setServerOffsetMs(data.serverNow - Date.now());
    }
    setPacks(data.packs || []);
    setPlayers(data.players || []);
    setTotalQuestions(data.totalQuestions || 0);
    setSeriesHistory(data.seriesHistory || null);
    return data as {
      serverNow?: number;
      status: 'lobby' | 'active' | 'finished';
      currentQuestionIndex: number;
      questionStartedAt: number | null;
      timerDuration: number;
      totalQuestions: number;
    };
  };

  const startGameNow = async () => {
    if (!gameCode) return;
    setStarting(true);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to start game');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setStarting(false);
    }
  };

  const requestAdvance = async () => {
    if (!gameCode) return;
    if (advanceRequestedRef.current) return;
    advanceRequestedRef.current = true;
    try {
      await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, action: 'advance' }),
      });
    } finally {
      // allow future advances; new-question will drive the next phases
      setTimeout(() => {
        advanceRequestedRef.current = false;
      }, 1500);
    }
  };

  const requestReveal = async () => {
    if (!gameCode) return;
    if (revealRequestedRef.current) return;
    revealRequestedRef.current = true;
    try {
      await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, action: 'reveal' }),
      });
    } finally {
      setTimeout(() => {
        revealRequestedRef.current = false;
      }, 1500);
    }
  };

  const handleJoin = async () => {
    setError('');
    const code = gameCode.trim().toUpperCase();
    if (!code) {
      setError('Enter a game code');
      return;
    }
    try {
      const data = await fetchState(code);
      setGameCode(code);
      if (data.status === 'lobby') {
        setTimedPhase('intro', 9999); // stays until game-started
      } else if (data.status === 'active') {
        // If game already active, we’ll wait for events; show stinger now.
        setTimedPhase('question-stinger', 3);
      } else {
        setPhase('finished');
        setPhaseEndsAt(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const injectedCode = useMemo(() => {
    return (globalThis as unknown as { __TRIVIAFUN_DISPLAY_CODE__?: string }).__TRIVIAFUN_DISPLAY_CODE__ || '';
  }, []);

  useEffect(() => {
    if (!embedded || !hostGameCode?.trim()) return;
    const code = hostGameCode.trim().toUpperCase();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setError('');
      if (!cancelled) setGameCode(code);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState(code)
      .then((data) => {
        if (cancelled) return;
        if (data.status === 'lobby') setTimedPhase('intro', 9999);
        else if (data.status === 'active') setTimedPhase('question-stinger', 3);
        else {
          setPhase('finished');
          setPhaseEndsAt(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, hostGameCode]);

  useEffect(() => {
    if (embedded && hostGameCode?.trim()) return;
    if (!injectedCode || gameCode) return;
    const code = String(injectedCode).toUpperCase();
    // Defer state update to avoid "setState in effect body" lint rule.
    queueMicrotask(() => setGameCode(code));
    fetch(`/api/game/state?gameCode=${encodeURIComponent(code)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || 'Game not found');
        if (typeof j?.serverNow === 'number') setServerOffsetMs(j.serverNow - Date.now());
        setPacks(j.packs || []);
        setPlayers(j.players || []);
        setTotalQuestions(j.totalQuestions || 0);
        setSeriesHistory(j.seriesHistory || null);

        if (j.status === 'lobby') setTimedPhase('intro', 9999);
        else if (j.status === 'active') setTimedPhase('question-stinger', 3);
        else setPhase('finished');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, [embedded, hostGameCode, gameCode, injectedCode, setTimedPhase]);

  // Subscribe to realtime events after joining
  useEffect(() => {
    if (!gameCode || phase === 'join') return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('player-joined', (data: { players: Array<{ id: string; name: string }> }) => {
      // Re-fetch to enrich avatars/ranks
      fetchState(gameCode).catch(() => {});
      setPlayers((prev) => {
        const existing = new Map(prev.map((p) => [p.id, p]));
        for (const p of data.players) {
          if (!existing.has(p.id)) existing.set(p.id, { id: p.id, name: p.name, score: 0 });
        }
        return [...existing.values()];
      });
    });

    channel.bind('game-started', async (data: GameStartedEvent) => {
      await fetchState(gameCode).catch(() => {});
      if (data?.startedAt && data?.countdownSeconds) {
        setServerOffsetMs(data.startedAt - Date.now());
        setPhase('countdown');
        setPhaseEndsAt(data.startedAt + data.countdownSeconds * 1000);
      } else {
        setTimedPhase('countdown', 15);
      }
    });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      if (typeof data?.startedAt === 'number') setServerOffsetMs(data.startedAt - Date.now());
      setCurrentQuestion(data);
      setCorrectAnswer(null);
      setPlayerResults([]);
      setTotalQuestions(data.totalQuestions);
      // Keep TV + players aligned: start answer window immediately.
      setPhase('question-answers');
      setPhaseEndsAt(data.startedAt + data.timerDuration * 1000);
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayerResults(data.playerResults);
      setPlayers((data.players || []).map((p) => ({ id: p.id, name: p.name, score: p.score })));
      setTimedPhase('reveal', 10);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => {
      setPaused(data.paused);
    });

    channel.bind('game-finished', async (data: GameFinishedEvent) => {
      setPlayers((data.players || []).map((p) => ({ id: p.id, name: p.name, score: p.score })));
      setPhase('finished');
      setPhaseEndsAt(null);
      // pick up series table if there were multiple games
      await fetchState(gameCode).catch(() => {});
    });

    channel.bind('game-replay', (data: { seriesHistory?: SeriesGame[]; players?: Array<{ id: string; name: string }> }) => {
      if (data.seriesHistory) setSeriesHistory(data.seriesHistory);
      if (data.players) setPlayers(data.players.map((p) => ({ id: p.id, name: p.name, score: 0 })));
      setPhase('intro');
      setPhaseEndsAt(null);
      setCurrentQuestion(null);
      setCorrectAnswer(null);
      setPlayerResults([]);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
    };
  }, [gameCode, phase]);

  // Phase progression timer
  useEffect(() => {
    if (tickingRef.current) window.clearInterval(tickingRef.current);
    if (!phaseEndsAt || paused) return;

    tickingRef.current = window.setInterval(() => {
      const t = Date.now() + serverOffsetMs;
      if (phaseEndsAt && t >= phaseEndsAt) {
        // advance phase
        if (phase === 'countdown') {
          requestAdvance().catch(() => {});
          setPhase('intro');
          setPhaseEndsAt(null);
        } else if (phase === 'question-answers') {
          requestReveal().catch(() => {});
          // Wait for the reveal event rather than looping.
          setPhase('reveal');
          setPhaseEndsAt(null);
        } else if (phase === 'reveal') {
          setTimedPhase('answer-scores', 15);
        } else if (phase === 'answer-scores') {
          setTimedPhase('rankings', 15);
        } else if (phase === 'rankings') {
          requestAdvance().catch(() => {});
          setPhase('intro');
          setPhaseEndsAt(null);
        }
      }
    }, 250);

    return () => {
      if (tickingRef.current) window.clearInterval(tickingRef.current);
      tickingRef.current = null;
    };
  }, [currentQuestion, paused, phase, phaseEndsAt, serverOffsetMs]);

  // JOIN
  if (phase === 'join') {
    return (
      <div
        className={[
          embedded ? 'w-full h-full' : 'w-dvw h-dvh',
          embedded
            ? 'bg-transparent text-white flex flex-col overflow-x-hidden'
            : 'bg-linear-to-br from-gray-950 via-indigo-950 to-gray-950 text-white flex flex-col overflow-x-hidden',
        ].join(' ')}
      >
        <div className="flex-1 min-h-0 px-6 sm:px-8 py-8">
          <div className="rounded-3xl border border-white/10 bg-white/4 p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-[260px_1fr_220px] items-center">
              <input
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={4}
                className="w-full rounded-2xl bg-white/8 border border-white/15 px-5 py-4 text-4xl font-mono tracking-widest text-center placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <div className="text-sm text-white/50">
                Tip: you can create a game on the host screen and it’ll jump here automatically.
                {error ? <p className="mt-1 text-red-300">{error}</p> : null}
              </div>
              <button
                onClick={handleJoin}
                className="w-full rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xl py-4 transition active:scale-[0.99]"
              >
                Show game
              </button>
            </div>
          </div>
          <div className="mt-6">
            <ShareLinks variant="discreet" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        embedded ? 'w-full h-full' : 'w-dvw h-dvh',
        embedded
          ? 'bg-transparent text-white flex flex-col overflow-x-hidden'
          : 'bg-gray-950 text-white flex flex-col overflow-x-hidden',
      ].join(' ')}
    >
      {/* Header */}
      <div className="p-6 sm:p-8 flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">
              Trivia Room <span className="text-yellow-400 font-mono tracking-widest">{gameCode}</span>
            </span>
            {paused ? (
              <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 text-sm font-bold text-yellow-200">
                PAUSED
              </span>
            ) : null}
          </div>
          <p className="text-white/50">{coreSubtitle}</p>
        </div>

        {secondsLeft !== null ? (
          <div className="rounded-2xl border border-white/10 bg-white/4 px-6 py-4 text-center">
            <div className="text-xs text-white/40 uppercase tracking-wider font-bold">Next</div>
            <div className="text-4xl font-black tabular-nums">{secondsLeft}</div>
          </div>
        ) : null}
      </div>

      {/* Host-only controls (shown while waiting to start / between phases) */}
      {(phase === 'intro' || phase === 'countdown') && gameCode ? (
        <div className="px-6 sm:px-8 mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startGameNow}
            disabled={starting || players.length === 0 || phase === 'countdown'}
            className="rounded-2xl bg-green-500 hover:bg-green-400 text-black font-extrabold px-5 py-3 disabled:opacity-50"
          >
            {starting ? 'Starting…' : phase === 'countdown' ? 'Starting…' : 'Start game'}
          </button>
          <span className="text-sm text-white/45">
            {players.length === 0 ? 'Waiting for at least one player.' : 'TV will run the full flow once started.'}
          </span>
        </div>
      ) : null}

      {/* Main */}
      <div className="flex-1 min-h-0 px-6 sm:px-8 py-6 overflow-auto">
        {(phase === 'intro' || phase === 'countdown') && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black tracking-tight">
                  {packs.length ? (
                    <>
                      <span className="text-yellow-400">Tonight’s</span> packs
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-400">Waiting</span> to start
                    </>
                  )}
                </h2>
                {phase === 'countdown' ? (
                  <div className="text-right">
                    <p className="text-white/40 text-sm uppercase tracking-wider font-bold">Starting in</p>
                    <p className="text-6xl font-black tabular-nums text-yellow-300">{secondsLeft ?? 15}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packs.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/3 p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${p.themeColor}26` }}>
                        {p.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-extrabold truncate">{p.name}</p>
                        <p className="text-sm text-white/55 line-clamp-2">{p.tagline}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!packs.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-white/60">
                    Waiting for the host to press <span className="text-white/80 font-semibold">Start Game</span>.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Players</h3>
              <div className="mt-4 space-y-3">
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white/3 border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center font-black text-white/70">
                          {initials(p.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-xs text-white/40">Global rank: {p.globalRank ? `#${p.globalRank}` : '—'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Score</p>
                      <p className="font-mono font-black text-yellow-300">{p.score.toLocaleString()}</p>
                    </div>
                    <div className="text-white/35 font-mono w-8 text-right">{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(phase === 'question-stinger' || phase === 'question-prompt' || phase === 'question-answers') && currentQuestion && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-10">
              {phase === 'question-stinger' ? (
                <div className="text-center py-16 space-y-4">
                  <p className="text-white/50 text-sm uppercase tracking-wider font-bold">
                    {isLastQuestion ? 'Final Question' : 'Up next'}
                  </p>
                  <h2 className="text-7xl font-black tracking-tight">
                    Question <span className="text-yellow-400">{currentQuestion.questionIndex + 1}</span>
                  </h2>
                  <p className="text-white/50 text-xl">
                    {currentQuestion.totalQuestions} total · lock in your answer fast.
                  </p>
                </div>
              ) : phase === 'question-prompt' ? (
                <div className="space-y-6">
                  <p className="text-white/40 text-sm uppercase tracking-wider font-bold">Listen up</p>
                  <h2 className="text-5xl font-black leading-tight">{currentQuestion.questionText}</h2>
                  <p className="text-white/45 text-lg">Answers appear in a moment…</p>
                </div>
              ) : (
                <QuestionCard
                  size="display"
                  questionText={currentQuestion.questionText}
                  options={currentQuestion.options}
                  questionIndex={currentQuestion.questionIndex}
                  totalQuestions={currentQuestion.totalQuestions}
                  category={currentQuestion.category}
                  difficulty={currentQuestion.difficulty}
                  correctAnswer={correctAnswer}
                  disabled
                />
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Overall</h3>
              <div className="mt-4">
                <Leaderboard players={players} maxVisible={10} />
              </div>
            </div>
          </div>
        )}

        {phase === 'reveal' && currentQuestion && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-10">
              <QuestionCard
                size="display"
                questionText={currentQuestion.questionText}
                options={currentQuestion.options}
                questionIndex={currentQuestion.questionIndex}
                totalQuestions={currentQuestion.totalQuestions}
                category={currentQuestion.category}
                difficulty={currentQuestion.difficulty}
                correctAnswer={correctAnswer}
                disabled
              />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Fastest correct</h3>
              <div className="mt-4 space-y-2">
                {playerResults.filter((r) => r.correct).slice(0, 6).map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/3 border border-white/10 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">
                        {i + 1}. {r.name}
                      </p>
                      <p className="text-xs text-white/40">{r.timeToAnswer.toFixed(1)}s · +{r.pointsEarned}</p>
                    </div>
                    <p className="font-mono font-black text-yellow-300">{r.totalScore.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'answer-scores' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-10">
              <h2 className="text-4xl font-black">Answer scores</h2>
              <p className="text-white/50 mt-2">This round’s points, in order.</p>
              <div className="mt-6 space-y-2">
                {playerResults.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl bg-white/3 border border-white/10 px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-white/40 font-mono w-8 text-right">{i + 1}</span>
                      <span className="font-bold truncate">{r.name}</span>
                      <span className={r.correct ? 'text-green-300 text-sm' : 'text-red-300 text-sm'}>
                        {r.correct ? '✓' : '×'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white/40">+{r.pointsEarned}</p>
                      <p className="font-mono font-black text-yellow-300">{r.totalScore.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/4 p-8">
              <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Overall</h3>
              <div className="mt-4">
                <Leaderboard players={players} />
              </div>
            </div>
          </div>
        )}

        {phase === 'rankings' && (
          <div className="rounded-3xl border border-white/10 bg-white/4 p-10">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-5xl font-black">Leaderboard</h2>
                <p className="text-white/50 mt-2">Overall rankings after that question.</p>
              </div>
              {isLastQuestion ? (
                <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 px-4 py-2 font-bold text-yellow-200">
                  Final question next
                </span>
              ) : null}
            </div>
            <div className="mt-8">
              <Leaderboard players={players} />
            </div>
          </div>
        )}

        {phase === 'finished' && (
          <div className="rounded-3xl border border-white/10 bg-white/4 p-10">
            <h2 className="text-6xl font-black tracking-tight">
              Game <span className="text-yellow-400">over</span>
            </h2>
            <p className="text-white/55 mt-3 text-xl">Host can run it back or start fresh.</p>

            <div className="mt-10 grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">
              <div className="rounded-3xl border border-white/10 bg-white/3 p-8">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Final standings</h3>
                <div className="mt-4">
                  <Leaderboard players={players} />
                </div>
              </div>

              {seriesHistory && seriesHistory.length > 1 ? (
                <div className="rounded-3xl border border-white/10 bg-white/3 p-8 overflow-x-auto">
                  <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Series results</h3>
                  <p className="text-white/45 mt-2">Multiple games played in this room.</p>
                  <div className="mt-6 min-w-[700px]">
                    <table className="w-full text-sm">
                      <thead className="text-white/50">
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 pr-4">Player</th>
                          {seriesHistory.map((g) => (
                            <th key={g.gameIndex} className="text-right py-2 px-3">
                              Game {g.gameIndex + 1}
                            </th>
                          ))}
                          <th className="text-right py-2 pl-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => {
                          const byGame = seriesHistory.map((g) => g.results.find((r) => r.id === p.id)?.score ?? 0);
                          const total = byGame.reduce((a, b) => a + b, 0);
                          return (
                            <tr key={p.id} className="border-b border-white/5">
                              <td className="py-3 pr-4 font-semibold">{p.name}</td>
                              {byGame.map((s, idx) => (
                                <td key={idx} className="py-3 px-3 text-right font-mono text-white/75">
                                  {s.toLocaleString()}
                                </td>
                              ))}
                              <td className="py-3 pl-4 text-right font-mono font-black text-yellow-300">
                                {total.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/3 p-8">
                  <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Next</h3>
                  <p className="text-white/55 mt-2 text-lg">
                    Host chooses <span className="text-white/80 font-semibold">Play again</span> or <span className="text-white/80 font-semibold">New game</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 sm:px-8 pb-6">
        <ShareLinks gameCode={gameCode} variant="discreet" />
      </div>
    </div>
  );
}


