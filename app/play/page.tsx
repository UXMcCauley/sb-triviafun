'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
  GamePausedEvent,
  ReactionAddedEvent,
  GameStartedEvent,
} from '@/lib/models/types';
import QuestionCard from '@/components/QuestionCard';
import Countdown from '@/components/Countdown';
import Leaderboard from '@/components/Leaderboard';
import ReactionPicker from '@/components/ReactionPicker';
import ShareLinks from '@/components/ShareLinks';
import { TriviaFunLogo, TriviaGameSurface } from '@/components/TriviaDecor';

type Phase =
  | 'login'
  | 'join'
  | 'lobby'
  | 'countdown'
  | 'question-stinger'
  | 'question-prompt'
  | 'question-answers'
  | 'answered'
  | 'reveal'
  | 'answer-scores'
  | 'rankings'
  | 'waiting'
  | 'finished';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

function PlayContent() {
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get('code') || '';

  // Auth state
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedName, setSavedName] = useState('');
  const [playerStats, setPlayerStats] = useState<{ gamesPlayed: number; gamesWon: number; bestScore: number } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string | null; name: string | null; image: string | null } | null>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Game state
  const [phase, setPhase] = useState<Phase>('login');
  const [gameCode, setGameCode] = useState(prefillCode);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [lobbyCountdownEndsAt, setLobbyCountdownEndsAt] = useState<number | null>(null);
  const [lobbySecondsLeft, setLobbySecondsLeft] = useState<number | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const [reported, setReported] = useState(false);
  const [reactionsByTarget, setReactionsByTarget] = useState<Record<string, Record<string, number>>>({});

  const selectedAnswerRef = useRef<number | null>(null);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);

  // Check localStorage for saved phone
  useEffect(() => {
    const run = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meData = (meRes.ok ? await meRes.json() : { user: null }) as {
          user: { id: string; email: string | null; name: string | null; image: string | null } | null;
        };
        if (meData?.user) {
          setUser(meData.user);
          setProfileUsername(meData.user.name || '');
          if (meData.user.name && !localStorage.getItem('seinfeld_name')) {
            setPlayerName(meData.user.name);
          }
        }
      } catch {}

      const saved = localStorage.getItem('seinfeld_phone');
      const name = localStorage.getItem('seinfeld_name');
      if (saved && name) {
        setPhone(saved);
        setSavedName(name);
        setPlayerName(name);
        setIsLoggedIn(true);
        setPhase('join');
        try {
          const statsRes = await fetch(`/api/player/stats?phone=${encodeURIComponent(saved)}`);
          const statsData = statsRes.ok ? await statsRes.json() : null;
          if (statsData) setPlayerStats(statsData);
        } catch {}
      }
    };
    queueMicrotask(run);
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultUsername: profileUsername }),
      });
      const data = await res.json();
      if (data?.user) {
        setUser(data.user);
        if (data.user.name) setPlayerName(data.user.name);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
    const data = await res.json();
    if (data?.user) setUser(data.user);
  };

  const getGuestId = () => {
    const key = 'seinfeld_guest_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  };

  const sendReaction = async (targetType: 'question' | 'player', targetKey: string, emoji: string) => {
    try {
      await fetch('/api/game/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          targetType,
          targetKey,
          emoji,
          guestId: getGuestId(),
        }),
      });
    } catch {}
  };

  const reactionsForQuestion = currentQuestion
    ? reactionsByTarget[`question:${currentQuestion.questionIndex}`]
    : undefined;

  const reactionsByPlayerId = players.reduce<Record<string, Record<string, number>>>((acc, p) => {
    acc[p.id] = reactionsByTarget[`player:${p.id}`] || {};
    return acc;
  }, {});

  const handleLogin = async () => {
    if (!phone.trim() || !playerName.trim()) {
      setError('Enter your phone number and name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/player/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, displayName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
      localStorage.setItem('seinfeld_phone', phone.replace(/\D/g, ''));
      localStorage.setItem('seinfeld_name', playerName.trim());
      setSavedName(playerName.trim());
      setIsLoggedIn(true);
      setPlayerStats(data);
      setPhase('join');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!gameCode.trim() || !playerName.trim()) {
      setError('Please enter the game code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: gameCode.toUpperCase(), playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to join'); setLoading(false); return; }
      if (typeof data?.serverNow === 'number') {
        setServerOffsetMs(data.serverNow - Date.now());
      }
      setPlayerId(data.playerId);
      setGameCode(data.gameCode);
      setPhase('lobby');

      // Pull initial roster + any active question metadata (also refreshes server offset).
      fetch(`/api/game/state?gameCode=${encodeURIComponent(data.gameCode)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((state) => {
          if (!state) return;
          if (typeof state?.serverNow === 'number') setServerOffsetMs(state.serverNow - Date.now());
          if (Array.isArray(state?.players)) setPlayers(state.players);
        })
        .catch(() => {});
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleSelectAnswer = useCallback(async (answerIndex: number) => {
    if (selectedAnswerRef.current !== null || !currentQuestion) return;
    setSelectedAnswer(answerIndex);
    selectedAnswerRef.current = answerIndex;
    setPhase('answered');
    try {
      await fetch('/api/game/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, questionIndex: currentQuestion.questionIndex, selectedAnswer: answerIndex }),
      });
    } catch (err) { console.error('Failed to submit:', err); }
  }, [currentQuestion, gameCode, playerId]);

  const handleReport = async () => {
    if (!currentQuestion || reported) return;
    setReported(true);
    try {
      await fetch('/api/game/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          questionIndex: currentQuestion.questionIndex,
          reportedBy: playerName,
        }),
      });
    } catch (err) { console.error('Report failed:', err); }
  };

  // Pusher
  useEffect(() => {
    if (!gameCode || phase === 'login' || phase === 'join') return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    fetch(`/api/game/reactions?gameCode=${encodeURIComponent(gameCode)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rows = data?.reactions as Array<{ target_type: 'question' | 'player'; target_key: string; emoji: string }> | undefined;
        if (!rows) return;
        setReactionsByTarget((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            const key = `${row.target_type}:${row.target_key}`;
            next[key] = { ...(next[key] || {}), [row.emoji]: ((next[key] || {})[row.emoji] || 0) + 1 };
          }
          return next;
        });
      })
      .catch(() => {});

    channel.bind('player-joined', (data: { players: Array<{ id: string; name: string }> }) => {
      setPlayers((prev) => {
        const existing = new Map(prev.map((p) => [p.id, p]));
        for (const p of data.players || []) {
          if (!existing.has(p.id)) existing.set(p.id, { id: p.id, name: p.name, score: 0 });
        }
        return [...existing.values()];
      });
    });

    channel.bind('game-started', (data: GameStartedEvent) => {
      if (data?.startedAt && data?.countdownSeconds) {
        setServerOffsetMs(data.startedAt - Date.now());
        setLobbyCountdownEndsAt(data.startedAt + data.countdownSeconds * 1000);
        setPhase('countdown');
        setPhaseEndsAt(data.startedAt + data.countdownSeconds * 1000);
      } else {
        setLobbyCountdownEndsAt((Date.now() + serverOffsetMs) + 15_000);
        setPhase('countdown');
        setPhaseEndsAt((Date.now() + serverOffsetMs) + 15_000);
      }
    });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      if (typeof data?.startedAt === 'number') setServerOffsetMs(data.startedAt - Date.now());
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setReported(false);
      setLobbyCountdownEndsAt(null);
      setPhase('question-answers');
      setPhaseEndsAt(data.startedAt + data.timerDuration * 1000);
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayers(data.players);
      const sel = selectedAnswerRef.current;
      setWasCorrect(sel !== null ? sel === data.correctAnswerIndex : null);
      setPhase('reveal');
      const now = Date.now() + serverOffsetMs;
      setPhaseEndsAt(now + 10_000);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => { setPaused(data.paused); });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
      setPhaseEndsAt(null);
      // Record stats
      if (isLoggedIn && phone) {
        const won = data.winner?.id === playerId;
        fetch('/api/player/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, score: data.players.find((p) => p.id === playerId)?.score || 0, won, correctAnswers: 0, totalAnswers: 0 }),
        });
      }
    });

    channel.bind('reaction-added', (data: ReactionAddedEvent) => {
      setReactionsByTarget((prev) => {
        const key = `${data.targetType}:${data.targetKey}`;
        const existing = prev[key] || {};
        return {
          ...prev,
          [key]: { ...existing, [data.emoji]: (existing[data.emoji] || 0) + 1 },
        };
      });
    });

    channel.bind('game-replay', (data: { gameCode?: string; newGameCode?: string; players: { id: string; name: string }[] }) => {
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setWinner(null);
      setReported(false);
      setPhase('lobby');
      setPhaseEndsAt(null);
    });

    return () => { channel.unbind_all(); pusher.unsubscribe(`game-${gameCode}`); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, phase === 'login', phase === 'join', serverOffsetMs]);

  // Lobby countdown tick (server-synced)
  useEffect(() => {
    if (!lobbyCountdownEndsAt) {
      queueMicrotask(() => setLobbySecondsLeft(null));
      return;
    }
    const tick = () => {
      const now = Date.now() + serverOffsetMs;
      const left = Math.max(0, Math.ceil((lobbyCountdownEndsAt - now) / 1000));
      setLobbySecondsLeft(left);
      if (left <= 0) setLobbyCountdownEndsAt(null);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [lobbyCountdownEndsAt, serverOffsetMs]);

  // Phase countdown tick + phase progression (server-synced)
  useEffect(() => {
    if (!phaseEndsAt || paused) {
      queueMicrotask(() => setPhaseSecondsLeft(null));
      return;
    }

    const tick = () => {
      const now = Date.now() + serverOffsetMs;
      const left = Math.max(0, Math.ceil((phaseEndsAt - now) / 1000));
      setPhaseSecondsLeft(left);

      if (now < phaseEndsAt) return;

      if (phase === 'countdown') {
        setPhase('waiting');
        setPhaseEndsAt(null);
        return;
      }

      if (phase === 'question-stinger') {
        setPhase('question-answers');
        if (currentQuestion) {
          setPhaseEndsAt(currentQuestion.startedAt + currentQuestion.timerDuration * 1000);
        } else {
          setPhaseEndsAt(null);
        }
        return;
      }

      if (phase === 'question-prompt') {
        setPhase('question-answers');
        if (currentQuestion) setPhaseEndsAt(currentQuestion.startedAt + currentQuestion.timerDuration * 1000);
        else setPhaseEndsAt(null);
        return;
      }

      if (phase === 'question-answers') {
        // Answer window ended; wait for host reveal.
        setPhase('answered');
        setPhaseEndsAt(null);
        return;
      }

      if (phase === 'reveal') {
        setPhase('answer-scores');
        setPhaseEndsAt(phaseEndsAt + 15_000);
        return;
      }

      if (phase === 'answer-scores') {
        setPhase('rankings');
        setPhaseEndsAt(phaseEndsAt + 15_000);
        return;
      }

      if (phase === 'rankings') {
        setPhase('waiting');
        setPhaseEndsAt(null);
        return;
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [currentQuestion, paused, phase, phaseEndsAt, serverOffsetMs]);

  const myRank = players.findIndex((p) => p.id === playerId) + 1;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  return (
    <TriviaGameSurface>
      {/* PAUSE OVERLAY */}
      {paused && phase !== 'login' && phase !== 'join' && phase !== 'lobby' && phase !== 'finished' && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-center space-y-4"><div className="text-6xl">⏸️</div><h2 className="text-3xl font-black text-yellow-400">Paused</h2></div>
        </div>
      )}

      {/* LOGIN — phone number */}
      {phase === 'login' && (
        <div className="flex min-h-dvh flex-1 items-center justify-center p-4">
          <div className="trivia-card-join w-full max-w-sm space-y-6 p-6 sm:p-8">
            <TriviaFunLogo subtitle="Sign in · stat tracking" />
            <div className="space-y-4">
              <Link
                href="/auth/sign-in"
                className="block w-full rounded-2xl border border-white/15 bg-white/8 py-3 text-center text-sm font-extrabold text-white/90 transition hover:bg-white/12"
              >
                Neon Auth
              </Link>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-trivia-gold">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="trivia-input-pill py-3.5 text-left text-base"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-trivia-cyan">Display name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="How we&apos;ll call you"
                  maxLength={20}
                  className="trivia-input-pill py-3.5 text-left text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              {error && <p className="text-center text-sm text-red-300">{error}</p>}
              <button type="button" onClick={handleLogin} disabled={loading} className="trivia-btn-coral w-full text-lg">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhase('join');
                  setIsLoggedIn(false);
                }}
                className="w-full py-2 text-sm font-bold text-white/40 transition hover:text-white/65"
              >
                Skip — guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN */}
      {phase === 'join' && (
        <div className="flex min-h-dvh flex-1 items-center justify-center p-4">
          <div className="trivia-card-join w-full max-w-sm space-y-5 p-6 sm:p-8">
            <TriviaFunLogo />
            {isLoggedIn && <p className="text-center text-sm font-bold text-white/50">Back again, {savedName}.</p>}
            {user && (
              <p className="text-center text-xs text-white/40">
                {user.email || user.name || 'Signed in'}
              </p>
            )}
            {playerStats && (
              <div className="flex justify-center gap-3 text-[11px] font-bold uppercase tracking-wider text-white/45">
                <span>{playerStats.gamesPlayed} games</span>
                <span className="text-trivia-mint">{playerStats.gamesWon} W</span>
                <span className="text-trivia-gold">Hi {playerStats.bestScore.toLocaleString()}</span>
              </div>
            )}

            <div className="space-y-4">
              {!user && (
                <Link
                  href="/auth/sign-in"
                  className="block w-full rounded-2xl border border-white/12 bg-white/6 py-2.5 text-center text-sm font-extrabold text-white/85"
                >
                  Sign in (optional)
                </Link>
              )}
              {user && (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-trivia-navy/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/8">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl text-white/40">👤</span>
                      )}
                    </div>
                    <label className="text-xs text-white/50">
                      <span className="font-bold text-white/70">Avatar</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="mt-1 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white/12 file:px-3 file:py-1.5 file:font-bold file:text-white/80"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAvatar(f);
                        }}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-white/55">Default name</label>
                    <input
                      type="text"
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      maxLength={20}
                      className="trivia-input-pill text-left text-base"
                      placeholder="Lobby default"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="w-full rounded-2xl border border-white/12 bg-white/8 py-2.5 text-sm font-extrabold text-white/90 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-trivia-gold">Room code</label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="WXYZ"
                  maxLength={4}
                  className="trivia-input-pill font-mono text-3xl tracking-[0.35em]"
                />
              </div>
              {!isLoggedIn && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-trivia-cyan">Nickname</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your nickname"
                    maxLength={20}
                    className="trivia-input-pill text-left text-lg"
                  />
                </div>
              )}
              {error && <p className="text-center text-sm text-red-300">{error}</p>}
              <button type="button" onClick={handleJoin} disabled={loading} className="trivia-btn-coral w-full text-lg">
                {loading ? 'Joining…' : 'Join game ★'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY */}
      {phase === 'lobby' && (
        <div className="flex min-h-dvh flex-1 items-center justify-center p-4">
          <div className="trivia-card-join w-full max-w-sm animate-fadeIn space-y-6 p-6 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-white/45">You&apos;re in</p>
            <p className="font-mono text-3xl font-extrabold tracking-widest text-trivia-gold">{gameCode}</p>
            {lobbySecondsLeft !== null ? (
              <div className="rounded-2xl border border-trivia-gold/30 bg-trivia-navy/60 py-4">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-white/50">Starting in</p>
                <p className="text-6xl font-extrabold tabular-nums text-trivia-gold">{lobbySecondsLeft}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-bold text-white/45">Waiting for host…</p>
                <div className="animate-pulse text-4xl">⏳</div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/40">In the lobby ({players.length})</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {players.length ? (
                  [...players]
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p, i) => (
                      <div key={p.id} className="flex w-[4.5rem] flex-col items-center">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-full bg-trivia-navy font-extrabold text-white ring-4 ring-inset ${
                            ['ring-trivia-gold', 'ring-trivia-cyan', 'ring-trivia-mint', 'ring-trivia-coral'][i % 4]
                          }`}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="mt-1.5 w-full truncate text-center text-xs font-extrabold text-white/90">
                          {p.name}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-white/40">Solo for now. Share the code.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COUNTDOWN */}
      {phase === 'countdown' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-sm text-center space-y-6 animate-fadeIn">
            <div className="text-6xl">🎬</div>
            <h2 className="text-3xl font-bold">Game starting</h2>
            <p className="text-white/45">Eyes up on the TV. Thumbs ready.</p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-white/50 text-sm uppercase tracking-wider font-bold">Starting in</p>
              <p className="text-6xl font-black tabular-nums text-yellow-300">{phaseSecondsLeft ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION FLOW (mirrors TV) */}
      {(phase === 'question-stinger' || phase === 'question-prompt' || phase === 'question-answers' || phase === 'answered') && currentQuestion && (
        <div className="min-h-screen flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <Countdown startedAt={currentQuestion.startedAt} duration={currentQuestion.timerDuration} size="sm" showPointsBar nowOffsetMs={serverOffsetMs} />
            <div className="text-right">
              <div className="text-sm text-white/50">Score</div>
              <div className="font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            {phase === 'question-stinger' ? (
              <div className="text-center space-y-4 animate-fadeIn">
                <p className="text-white/50 text-sm uppercase tracking-wider font-bold">Up next</p>
                <h2 className="text-5xl font-black tracking-tight">
                  Question <span className="text-yellow-400">{currentQuestion.questionIndex + 1}</span>
                </h2>
                <p className="text-white/45">{currentQuestion.totalQuestions} total · lock in fast.</p>
              </div>
            ) : phase === 'question-prompt' ? (
              <div className="space-y-5 animate-fadeIn">
                <p className="text-white/40 text-sm uppercase tracking-wider font-bold">Listen up</p>
                <h2 className="text-3xl font-black leading-tight">{currentQuestion.questionText}</h2>
                <p className="text-white/45">Answers appear in a moment…</p>
              </div>
            ) : (
              <QuestionCard
                questionText={currentQuestion.questionText}
                options={currentQuestion.options}
                questionIndex={currentQuestion.questionIndex}
                totalQuestions={currentQuestion.totalQuestions}
                category={currentQuestion.category}
                difficulty={currentQuestion.difficulty}
                selectedAnswer={selectedAnswer}
                onSelect={handleSelectAnswer}
                disabled={phase !== 'question-answers'}
                size="player"
                reactions={reactionsForQuestion}
              />
            )}
          </div>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">Audience reactions</p>
            <ReactionPicker
              onPick={(emoji) => sendReaction('question', String(currentQuestion.questionIndex), emoji)}
            />
          </div>
          {phase === 'answered' && (
            <div className="text-center py-4 animate-fadeIn">
              <p className="text-white/55">Answer locked in. Or time ran out. Either way: no take-backs.</p>
            </div>
          )}
        </div>
      )}

      {/* REVEAL */}
      {phase === 'reveal' && currentQuestion && (
        <div className="min-h-screen flex flex-col p-4">
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {wasCorrect !== null && <div className={`text-6xl ${wasCorrect ? 'animate-bounce' : 'animate-shake'}`}>{wasCorrect ? '✅' : '❌'}</div>}
            {wasCorrect === null && <div className="text-6xl">⏰</div>}
            <p className="text-2xl font-bold">
              {wasCorrect === true && 'Correct!'}
              {wasCorrect === false && 'Wrong!'}
              {wasCorrect === null && "Time's up!"}
            </p>
            <p className="text-lg text-white/60">
              Answer: <span className="text-green-400 font-semibold">{currentQuestion.options[correctAnswer!]}</span>
            </p>
            <div className="w-full max-w-sm mt-4 space-y-2">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-white/60">Rank</span><span className="font-bold text-xl">#{myRank || '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-white/60">Score</span><span className="font-mono font-bold text-yellow-300 text-xl">{myScore.toLocaleString()}</span>
              </div>
            </div>
            {/* Report button */}
            <button
              onClick={handleReport}
              disabled={reported}
              className={`mt-4 text-sm px-4 py-2 rounded-lg transition-all ${reported ? 'bg-red-500/20 text-red-300 cursor-default' : 'bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-300 border border-white/10'}`}
            >
              {reported ? '⚠️ Reported' : '⚠️ Report Wrong Answer'}
            </button>
          </div>
        </div>
      )}

      {/* WAITING */}
      {phase === 'waiting' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="animate-pulse text-5xl">🎬</div>
            <p className="text-xl text-white/60">Next question coming up...</p>
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3"><span className="text-white/60">Rank</span><span className="font-bold">#{myRank || '—'}</span></div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3"><span className="text-white/60">Score</span><span className="font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ANSWER SCORES */}
      {phase === 'answer-scores' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-4 animate-fadeIn">
            <h2 className="text-3xl font-black">Answer scores</h2>
            <p className="text-white/50">Where you landed on that one.</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Rank</span>
                <span className="font-bold text-xl">#{myRank || '—'}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-white/60">Score</span>
                <span className="font-mono font-black text-yellow-300 text-xl">{myScore.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RANKINGS */}
      {phase === 'rankings' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-4 animate-fadeIn">
            <h2 className="text-3xl font-black">Leaderboard</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <Leaderboard players={players} highlightId={playerId} compact reactionsByPlayerId={reactionsByPlayerId} />
            </div>
            <p className="text-white/35 text-sm">Next question soon. Try not to panic-scroll.</p>
          </div>
        </div>
      )}

      {/* FINISHED */}
      {phase === 'finished' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
          <h1 className="text-4xl font-black text-yellow-400">Game Over!</h1>
          {winner && <div className="text-center"><p className="text-white/60">Winner</p><p className="text-3xl font-bold">{winner.name} 🏆</p></div>}
          <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
            <p className="text-white/60 text-sm">Your final score</p>
            <p className="text-3xl font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</p>
            <p className="text-white/60">Rank #{myRank} of {players.length}</p>
          </div>
          <div className="w-full max-w-sm">
            <Leaderboard players={players} highlightId={playerId} compact reactionsByPlayerId={reactionsByPlayerId} />
          </div>
          <p className="text-white/30 text-sm text-center">Waiting for host to start next round...</p>
        </div>
      )}

      {/* Discreet footer links */}
      <div className="mt-auto p-4">
        <ShareLinks gameCode={gameCode} variant="discreet" />
      </div>
    </TriviaGameSurface>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-trivia-navy text-lg font-extrabold text-white/50">
          <div className="animate-pulse">Loading…</div>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
