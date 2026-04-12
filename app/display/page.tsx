'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  PlayerJoinedEvent,
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
} from '@/lib/models/types';
import GameQRCode from '@/components/GameQRCode';
import QuestionCard from '@/components/QuestionCard';
import Countdown from '@/components/Countdown';
import Leaderboard from '@/components/Leaderboard';

type Phase = 'create' | 'lobby' | 'question' | 'reveal' | 'finished';

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
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const [numQuestions, setNumQuestions] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getPusherClient>['subscribe']> | null>(null);

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

  const handleNextQuestion = useCallback(async () => {
    try {
      await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode }),
      });
    } catch (err) {
      console.error('Failed to advance:', err);
    }
  }, [gameCode]);

  // Subscribe to Pusher events
  useEffect(() => {
    if (!gameCode) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);
    channelRef.current = channel;

    channel.bind('player-joined', (data: PlayerJoinedEvent) => {
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
    });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      setCurrentQuestion(data);
      setCorrectAnswer(null);
      setPhase('question');
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayers(data.players);
      setPhase('reveal');
    });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
    };
  }, [gameCode]);

  // Auto-advance timer: when question phase, advance after timer expires
  const handleTimerExpire = useCallback(() => {
    // Small delay then advance
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  }, [handleNextQuestion]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
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
          {/* Main content */}
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

          {/* Sidebar */}
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

      {/* REVEAL PHASE */}
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
          <div className="w-80 bg-black/30 border-l border-white/10 p-6 flex flex-col">
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 flex items-center justify-center text-4xl font-bold text-green-400">
                ✓
              </div>
            </div>
            <h3 className="text-lg font-bold text-white/60 mb-4 uppercase tracking-wider">Scores</h3>
            <Leaderboard players={players} />
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
                setWinner(null);
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
