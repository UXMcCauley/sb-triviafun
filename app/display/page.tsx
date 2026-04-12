'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  PlayerJoinedEvent,
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
  PlayerResult,
  GamePausedEvent,
} from '@/lib/models/types';
import GameQRCode from '@/components/GameQRCode';
import QuestionCard from '@/components/QuestionCard';
import Countdown from '@/components/Countdown';
import Leaderboard from '@/components/Leaderboard';

type Phase = 'create' | 'lobby' | 'question' | 'reveal' | 'scoreboard' | 'getready' | 'finished';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

export default function DisplayPage() {
  const [phase, setPhase] = useState<Phase>('create');
  const [gameCode, setGameCode] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const [numQuestions, setNumQuestions] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleCreateGame = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numQuestions, timerDuration }),
      });
      const data = await res.json();
      if (data.gameCode) {
        setGameCode(data.gameCode);
        setPhase('lobby');
      }
    } catch (err) {
      console.error('Failed to create game:', err);
    }
    setLoading(false);
  };

  const handleStartGame = async () => {
    try {
      await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  // Reveal answer for current question
  const handleRevealAnswer = useCallback(async () => {
    try {
      const res = await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, action: 'reveal' }),
      });
      const data = await res.json();
      setIsLastQuestion(data.isLastQuestion);
    } catch (err) {
      console.error('Failed to reveal:', err);
    }
  }, [gameCode]);

  // Advance to the next question
  const handleAdvance = useCallback(async () => {
    try {
      await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, action: 'advance' }),
      });
    } catch (err) {
      console.error('Failed to advance:', err);
    }
  }, [gameCode]);

  const handleTogglePause = async () => {
    const newPaused = !paused;
    setPaused(newPaused);
    try {
      await fetch('/api/game/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, paused: newPaused }),
      });
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  // Phase transitions with pause awareness
  const scheduleTransition = useCallback((callback: () => void, delayMs: number) => {
    clearTimers();
    const startTime = Date.now();
    let remaining = delayMs;

    const tick = () => {
      if (pausedRef.current) {
        // Check again in 200ms
        timerRef.current = setTimeout(tick, 200);
        return;
      }
      const elapsed = Date.now() - startTime;
      remaining = delayMs - elapsed;
      if (remaining <= 0) {
        callback();
      } else {
        // Simplified: just wait remaining time, pause checks happen via interval
        timerRef.current = setTimeout(() => {
          if (!pausedRef.current) {
            callback();
          } else {
            // Re-schedule if paused at the moment
            tick();
          }
        }, Math.min(remaining, 500));
      }
    };

    tick();
  }, []);

  // Subscribe to Pusher events
  useEffect(() => {
    if (!gameCode) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('player-joined', (data: PlayerJoinedEvent) => {
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
    });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      setCurrentQuestion(data);
      setCorrectAnswer(null);
      setPlayerResults([]);
      setPhase('question');
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayerResults(data.playerResults);
      setPlayers(data.players);
      setPhase('reveal');
    });

    channel.bind('game-paused', (data: GamePausedEvent) => {
      setPaused(data.paused);
    });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      clearTimers();
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
      clearTimers();
    };
  }, [gameCode]);

  // Phase-driven auto-transitions
  useEffect(() => {
    if (phase === 'reveal') {
      // Show correct answer for 5 seconds, then move to scoreboard
      scheduleTransition(() => setPhase('scoreboard'), 5000);
    } else if (phase === 'scoreboard') {
      // Show scoreboard for 8 seconds, then either finish or get ready
      scheduleTransition(() => {
        if (isLastQuestion) {
          handleAdvance(); // triggers game-finished
        } else {
          setPhase('getready');
        }
      }, 8000);
    } else if (phase === 'getready') {
      // 5 second countdown before next question
      scheduleTransition(() => {
        handleAdvance();
      }, 5000);
    }

    return () => clearTimers();
  }, [phase, isLastQuestion, scheduleTransition, handleAdvance]);

  // Auto-reveal when question timer expires
  const handleTimerExpire = useCallback(() => {
    setTimeout(() => handleRevealAnswer(), 500);
  }, [handleRevealAnswer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white relative">
      {/* PAUSE OVERLAY */}
      {paused && phase !== 'create' && phase !== 'lobby' && phase !== 'finished' && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="text-8xl">⏸️</div>
            <h2 className="text-5xl font-black text-yellow-400">Game Paused</h2>
            <p className="text-xl text-white/60">Click resume to continue</p>
          </div>
        </div>
      )}

      {/* PAUSE BUTTON — always visible during active game */}
      {phase !== 'create' && phase !== 'lobby' && phase !== 'finished' && (
        <button
          onClick={handleTogglePause}
          className="fixed bottom-6 right-6 z-50 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-5 py-3 text-sm font-semibold transition-all flex items-center gap-2"
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      )}

      {/* CREATE PHASE */}
      {phase === 'create' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8">
            <h1 className="text-7xl font-black tracking-tight">
              <span className="text-yellow-400">Seinfeld</span> Trivia
            </h1>
            <p className="text-2xl text-white/60">The game about nothing... and everything.</p>

            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="flex gap-8">
                <div className="text-left">
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
                <div className="text-left">
                  <label className="text-sm text-white/50 block mb-1">Timer (sec)</label>
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
              </div>

              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-2xl px-12 py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY PHASE */}
      {phase === 'lobby' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 max-w-4xl mx-auto px-8">
            <h1 className="text-5xl font-black">
              <span className="text-yellow-400">Game Code:</span>{' '}
              <span className="font-mono text-6xl tracking-widest">{gameCode}</span>
            </h1>
            <p className="text-xl text-white/60">Scan the QR code or go to this URL to join</p>

            <GameQRCode gameCode={gameCode} size={250} />

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">
                Players ({players.length})
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {players.map((p) => (
                  <span
                    key={p.id}
                    className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-lg animate-fadeIn"
                  >
                    {p.name}
                  </span>
                ))}
                {players.length === 0 && (
                  <span className="text-white/40 text-lg">Waiting for players...</span>
                )}
              </div>
            </div>

            {players.length > 0 && (
              <button
                onClick={handleStartGame}
                className="mt-8 bg-green-500 hover:bg-green-400 text-black font-bold text-2xl px-12 py-4 rounded-2xl transition-all active:scale-95"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUESTION PHASE */}
      {phase === 'question' && currentQuestion && (
        <div className="flex min-h-screen">
          <div className="flex-1 flex flex-col justify-center px-12 py-8">
            <QuestionCard
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              questionIndex={currentQuestion.questionIndex}
              totalQuestions={currentQuestion.totalQuestions}
              category={currentQuestion.category}
              difficulty={currentQuestion.difficulty}
              size="display"
              disabled
            />
          </div>
          <div className="w-80 bg-black/30 border-l border-white/10 p-6 flex flex-col">
            <div className="flex justify-center mb-8">
              <Countdown
                startedAt={currentQuestion.startedAt}
                duration={currentQuestion.timerDuration}
                onExpire={handleTimerExpire}
                size="lg"
              />
            </div>
            <h3 className="text-lg font-bold text-white/60 mb-4 uppercase tracking-wider">Leaderboard</h3>
            <Leaderboard players={players} />
          </div>
        </div>
      )}

      {/* REVEAL PHASE — show correct answer for 5 seconds */}
      {phase === 'reveal' && currentQuestion && (
        <div className="flex min-h-screen">
          <div className="flex-1 flex flex-col justify-center px-12 py-8">
            <QuestionCard
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              questionIndex={currentQuestion.questionIndex}
              totalQuestions={currentQuestion.totalQuestions}
              category={currentQuestion.category}
              difficulty={currentQuestion.difficulty}
              correctAnswer={correctAnswer}
              size="display"
              disabled
            />
          </div>
          <div className="w-80 bg-black/30 border-l border-white/10 p-6 flex flex-col items-center">
            <div className="w-32 h-32 flex items-center justify-center">
              <div className="text-6xl animate-bounce">✅</div>
            </div>
            <p className="text-lg text-white/50 mt-2 mb-6">Correct Answer!</p>
            <h3 className="text-lg font-bold text-white/60 mb-4 uppercase tracking-wider w-full">Leaderboard</h3>
            <Leaderboard players={players} />
          </div>
        </div>
      )}

      {/* SCOREBOARD PHASE — show who answered correctly, in order, for 8 seconds */}
      {phase === 'scoreboard' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-3xl px-8 space-y-8">
            <h2 className="text-4xl font-black text-center text-yellow-400">Results</h2>

            {/* Player results — who got it right */}
            <div className="space-y-3">
              {playerResults.map((pr, i) => (
                <div
                  key={pr.id}
                  className={`flex items-center justify-between px-6 py-4 rounded-xl animate-fadeIn ${
                    pr.correct
                      ? 'bg-green-500/15 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{pr.correct ? '✅' : '❌'}</span>
                    <div>
                      <span className="text-xl font-semibold">{pr.name}</span>
                      {pr.correct && (
                        <span className="text-sm text-white/40 ml-3">
                          {pr.timeToAnswer.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xl font-mono font-bold ${
                    pr.correct ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {pr.correct ? `+${pr.pointsEarned.toLocaleString()}` : '+0'}
                  </span>
                </div>
              ))}
            </div>

            {/* Overall leaderboard */}
            <div className="mt-6">
              <h3 className="text-lg font-bold text-white/60 mb-3 uppercase tracking-wider">Overall Standings</h3>
              <Leaderboard players={players} />
            </div>
          </div>
        </div>
      )}

      {/* GET READY PHASE — 5 second countdown before next question */}
      {phase === 'getready' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-bold text-white/60">Next Question In...</h2>
            <GetReadyCountdown duration={5} />
            <p className="text-lg text-white/30">Get ready!</p>
          </div>
        </div>
      )}

      {/* FINISHED PHASE */}
      {phase === 'finished' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-8 max-w-2xl mx-auto px-8">
            <h1 className="text-6xl font-black text-yellow-400 animate-bounce">
              Game Over!
            </h1>
            {winner && (
              <div className="space-y-2">
                <p className="text-3xl text-white/60">Winner</p>
                <p className="text-5xl font-bold">{winner.name}</p>
                <p className="text-3xl font-mono text-yellow-300">
                  {winner.score.toLocaleString()} pts
                </p>
              </div>
            )}
            <div className="mt-8">
              <Leaderboard players={players} />
            </div>
            <button
              onClick={() => {
                setPhase('create');
                setGameCode('');
                setPlayers([]);
                setCurrentQuestion(null);
                setCorrectAnswer(null);
                setPlayerResults([]);
                setWinner(null);
                setPaused(false);
                setIsLastQuestion(false);
              }}
              className="mt-8 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-8 py-3 rounded-xl transition-all active:scale-95"
            >
              New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple countdown number for the "get ready" phase
function GetReadyCountdown({ duration }: { duration: number }) {
  const [count, setCount] = useState(duration);

  useEffect(() => {
    setCount(duration);
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="text-9xl font-black text-yellow-400 tabular-nums animate-pulse">
      {count}
    </div>
  );
}
