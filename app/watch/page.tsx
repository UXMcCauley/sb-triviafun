'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  PlayerJoinedEvent,
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
  PlayerResult,
  GamePausedEvent,
  ReactionAddedEvent,
} from '@/lib/models/types';
import QuestionCard from '@/components/QuestionCard';
import Leaderboard from '@/components/Leaderboard';
import ReactionPicker from '@/components/ReactionPicker';

type Phase = 'join' | 'lobby' | 'question' | 'reveal' | 'scoreboard' | 'finished';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

function WatchContent() {
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get('code') || '';

  const [phase, setPhase] = useState<Phase>('join');
  const [gameCode, setGameCode] = useState(prefillCode);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [reactionsByTarget, setReactionsByTarget] = useState<Record<string, Record<string, number>>>({});

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
        body: JSON.stringify({ gameCode, targetType, targetKey, emoji, guestId: getGuestId() }),
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

  const handleJoinWatch = async () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    // Verify game exists
    try {
      const res = await fetch(`/api/game/state?gameCode=${gameCode.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Game not found');
        return;
      }
      setPlayers(data.players || []);
      if (data.status === 'lobby') setPhase('lobby');
      else if (data.status === 'active') setPhase('question');
      else if (data.status === 'finished') setPhase('finished');
    } catch {
      setError('Network error');
    }
  };

  useEffect(() => {
    if (phase === 'join' || !gameCode) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode.toUpperCase()}`);

    fetch(`/api/game/reactions?gameCode=${encodeURIComponent(gameCode.toUpperCase())}`)
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

      // Auto move to scoreboard after 5s
      setTimeout(() => setPhase('scoreboard'), 5000);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => {
      setPaused(data.paused);
    });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
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

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode.toUpperCase()}`);
    };
  }, [gameCode, phase === 'join']);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-950 to-gray-900 text-white relative">
      {/* Audience badge */}
      <div className="fixed top-4 right-4 z-50 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 text-sm text-purple-300 font-semibold">
        👀 Watching
      </div>

      {/* PAUSE OVERLAY */}
      {paused && phase !== 'join' && phase !== 'finished' && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">⏸️</div>
            <h2 className="text-3xl font-black text-yellow-400">Paused</h2>
          </div>
        </div>
      )}

      {/* JOIN */}
      {phase === 'join' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-black">
                <span className="text-purple-400">Watch</span> the Game
              </h1>
              <p className="text-white/50 mt-2">Spectate without playing</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Game Code</label>
                <input
                  type="text"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center font-mono tracking-widest uppercase placeholder:text-white/20 focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinWatch()}
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                onClick={handleJoinWatch}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold text-xl py-4 rounded-xl transition-all active:scale-95"
              >
                Start Watching
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY */}
      {phase === 'lobby' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">Game <span className="font-mono text-yellow-400">{gameCode}</span></h2>
            <p className="text-white/60">Waiting for the game to start...</p>
            <div>
              <p className="text-white/40 mb-2">Players joined: {players.length}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {players.map((p) => (
                  <span key={p.id} className="bg-white/10 px-3 py-1 rounded-full text-sm">{p.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {phase === 'question' && currentQuestion && (
        <div className="min-h-screen flex flex-col p-6">
          <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
            <QuestionCard
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              questionIndex={currentQuestion.questionIndex}
              totalQuestions={currentQuestion.totalQuestions}
              category={currentQuestion.category}
              difficulty={currentQuestion.difficulty}
              size="player"
              disabled
              reactions={reactionsForQuestion}
            />
          </div>
          <div className="max-w-3xl mx-auto w-full mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-white/50 font-bold uppercase tracking-wider mb-2">React</p>
            <ReactionPicker onPick={(emoji) => sendReaction('question', String(currentQuestion.questionIndex), emoji)} />
          </div>
          <div className="mt-4">
            <Leaderboard players={players} compact reactionsByPlayerId={reactionsByPlayerId} />
          </div>
        </div>
      )}

      {/* REVEAL */}
      {phase === 'reveal' && currentQuestion && (
        <div className="min-h-screen flex flex-col p-6">
          <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
            <QuestionCard
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              questionIndex={currentQuestion.questionIndex}
              totalQuestions={currentQuestion.totalQuestions}
              category={currentQuestion.category}
              difficulty={currentQuestion.difficulty}
              correctAnswer={correctAnswer}
              size="player"
              disabled
            />
          </div>
        </div>
      )}

      {/* SCOREBOARD */}
      {phase === 'scoreboard' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-6">
          <h2 className="text-3xl font-black text-yellow-400">Results</h2>
          <div className="w-full max-w-md space-y-2">
            {playerResults.map((pr, i) => (
              <div
                key={pr.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  pr.correct ? 'bg-green-500/15 border border-green-500/30' : 'bg-red-500/10 border border-red-500/20'
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span>{pr.correct ? '✅' : '❌'}</span>
                  <span className="font-semibold">{pr.name}</span>
                  {pr.correct && <span className="text-xs text-white/40">{pr.timeToAnswer.toFixed(1)}s</span>}
                </div>
                <span className={`font-mono font-bold ${pr.correct ? 'text-green-400' : 'text-red-400'}`}>
                  {pr.correct ? `+${pr.pointsEarned}` : '+0'}
                </span>
              </div>
            ))}
          </div>
          <Leaderboard players={players} compact />
        </div>
      )}

      {/* FINISHED */}
      {phase === 'finished' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
          <h1 className="text-4xl font-black text-yellow-400">Game Over!</h1>
          {winner && (
            <div className="text-center">
              <p className="text-white/60">Winner</p>
              <p className="text-3xl font-bold">{winner.name} 🏆</p>
              <p className="font-mono text-yellow-300 text-xl">{winner.score.toLocaleString()} pts</p>
            </div>
          )}
          <Leaderboard players={players} compact reactionsByPlayerId={reactionsByPlayerId} />
        </div>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-950 to-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-2xl">Loading...</div>
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
