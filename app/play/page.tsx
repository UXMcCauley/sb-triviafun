'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
  GamePausedEvent,
} from '@/lib/models/types';
import QuestionCard from '@/components/QuestionCard';
import Countdown from '@/components/Countdown';
import Leaderboard from '@/components/Leaderboard';

type Phase = 'join' | 'lobby' | 'question' | 'answered' | 'reveal' | 'waiting' | 'finished';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
}

function PlayContent() {
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get('code') || '';

  const [phase, setPhase] = useState<Phase>('join');
  const [gameCode, setGameCode] = useState(prefillCode);
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);

  // Use a ref to track selectedAnswer for the Pusher callback
  const selectedAnswerRef = useRef<number | null>(null);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);

  const handleJoin = async () => {
    if (!gameCode.trim() || !playerName.trim()) {
      setError('Please enter both game code and your name');
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
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        setLoading(false);
        return;
      }
      setPlayerId(data.playerId);
      setGameCode(data.gameCode);
      setPhase('lobby');
    } catch {
      setError('Network error');
    }
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
        body: JSON.stringify({
          gameCode,
          playerId,
          questionIndex: currentQuestion.questionIndex,
          selectedAnswer: answerIndex,
        }),
      });
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  }, [currentQuestion, gameCode, playerId]);

  // Subscribe to Pusher
  useEffect(() => {
    if (!gameCode || phase === 'join') return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('game-started', () => {});

    channel.bind('new-question', (data: NewQuestionEvent) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setPhase('question');
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayers(data.players);
      const currentSelected = selectedAnswerRef.current;
      if (currentSelected !== null) {
        setWasCorrect(currentSelected === data.correctAnswerIndex);
      } else {
        setWasCorrect(null); // didn't answer
      }
      setPhase('reveal');

      // After reveal, move to waiting state (until next question arrives)
      setTimeout(() => setPhase('waiting'), 5000);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => {
      setPaused(data.paused);
    });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
    });

    channel.bind('game-replay', (data: { newGameCode: string; players: { id: string; name: string }[] }) => {
      // Auto-join the new game — switch channel
      setGameCode(data.newGameCode);
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setWinner(null);
      setPhase('lobby');
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${gameCode}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, phase === 'join']);

  const myRank = players.findIndex((p) => p.id === playerId) + 1;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
      {/* PAUSE OVERLAY */}
      {paused && phase !== 'join' && phase !== 'lobby' && phase !== 'finished' && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">⏸️</div>
            <h2 className="text-3xl font-black text-yellow-400">Paused</h2>
          </div>
        </div>
      )}

      {/* JOIN PHASE */}
      {phase === 'join' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-black">
                <span className="text-yellow-400">Seinfeld</span> Trivia
              </h1>
              <p className="text-white/50 mt-2">Join the game!</p>
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
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center font-mono tracking-widest uppercase placeholder:text-white/20 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg placeholder:text-white/20 focus:outline-none focus:border-yellow-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY PHASE */}
      {phase === 'lobby' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-6">
            <div className="text-6xl">📺</div>
            <h2 className="text-3xl font-bold">You&apos;re in!</h2>
            <p className="text-xl text-white/60">
              Game <span className="font-mono text-yellow-400">{gameCode}</span>
            </p>
            <p className="text-white/40">Waiting for the host to start the game...</p>
            <div className="animate-pulse text-4xl">⏳</div>
          </div>
        </div>
      )}

      {/* QUESTION PHASE */}
      {(phase === 'question' || phase === 'answered') && currentQuestion && (
        <div className="min-h-screen flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <Countdown
              startedAt={currentQuestion.startedAt}
              duration={currentQuestion.timerDuration}
              size="sm"
            />
            <div className="text-right">
              <div className="text-sm text-white/50">Your Score</div>
              <div className="font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <QuestionCard
              questionText={currentQuestion.questionText}
              options={currentQuestion.options}
              questionIndex={currentQuestion.questionIndex}
              totalQuestions={currentQuestion.totalQuestions}
              category={currentQuestion.category}
              difficulty={currentQuestion.difficulty}
              selectedAnswer={selectedAnswer}
              onSelect={handleSelectAnswer}
              disabled={phase === 'answered'}
              size="player"
            />
          </div>

          {phase === 'answered' && (
            <div className="text-center py-4">
              <p className="text-white/50">Answer locked in! Waiting for timer...</p>
            </div>
          )}
        </div>
      )}

      {/* REVEAL PHASE */}
      {phase === 'reveal' && currentQuestion && (
        <div className="min-h-screen flex flex-col p-4">
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {wasCorrect !== null && (
              <div className={`text-6xl ${wasCorrect ? 'animate-bounce' : 'animate-shake'}`}>
                {wasCorrect ? '✅' : '❌'}
              </div>
            )}
            {wasCorrect === null && (
              <div className="text-6xl">⏰</div>
            )}
            <p className="text-2xl font-bold">
              {wasCorrect === true && 'Correct!'}
              {wasCorrect === false && 'Wrong!'}
              {wasCorrect === null && "Time's up!"}
            </p>
            <p className="text-lg text-white/60">
              Correct answer: <span className="text-green-400 font-semibold">
                {currentQuestion.options[correctAnswer!]}
              </span>
            </p>

            <div className="w-full max-w-sm mt-4">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-white/60">Your rank</span>
                <span className="font-bold text-xl">#{myRank || '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mt-2">
                <span className="text-white/60">Score</span>
                <span className="font-mono font-bold text-yellow-300 text-xl">{myScore.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WAITING PHASE — between scoreboard and next question */}
      {phase === 'waiting' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="animate-pulse text-5xl">🎬</div>
            <p className="text-xl text-white/60">Next question coming up...</p>
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-white/60">Rank</span>
                <span className="font-bold">#{myRank || '—'}</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mt-2">
                <span className="text-white/60">Score</span>
                <span className="font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINISHED PHASE */}
      {phase === 'finished' && (
        <FinishedScreen
          winner={winner}
          myScore={myScore}
          myRank={myRank}
          players={players}
          playerId={playerId}
          gameCode={gameCode}
        />
      )}
    </div>
  );
}

// Finished screen with optional phone number save
function FinishedScreen({
  winner, myScore, myRank, players, playerId, gameCode,
}: {
  winner: { id: string; name: string; score: number } | null;
  myScore: number;
  myRank: number;
  players: { id: string; name: string; score: number }[];
  playerId: string;
  gameCode: string;
}) {
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ gamesPlayed: number; gamesWon: number; bestScore: number } | null>(null);

  const handleSave = async () => {
    if (!phone.trim()) return;
    setSaving(true);

    const myPlayer = players.find((p) => p.id === playerId);
    const won = winner?.id === playerId;
    const correctCount = 0; // simplified — server could track this

    try {
      // Register/update player
      await fetch('/api/player/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, displayName: myPlayer?.name || 'Player' }),
      });

      // Record game result
      await fetch('/api/player/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          score: myScore,
          correctAnswers: correctCount,
          totalAnswers: 0,
          won,
        }),
      });

      // Fetch updated stats
      const res = await fetch(`/api/player/stats?phone=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }

      setSaved(true);
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-6">
      <h1 className="text-4xl font-black text-yellow-400">Game Over!</h1>

      {winner && (
        <div className="text-center space-y-1">
          <p className="text-white/60">Winner</p>
          <p className="text-3xl font-bold">{winner.name} 🏆</p>
        </div>
      )}

      <div className="bg-white/10 rounded-xl px-6 py-4 text-center">
        <p className="text-white/60 text-sm">Your final score</p>
        <p className="text-3xl font-mono font-bold text-yellow-300">{myScore.toLocaleString()}</p>
        <p className="text-white/60">Rank #{myRank} of {players.length}</p>
      </div>

      {/* Save stats with phone */}
      {!saved ? (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-sm text-white/50 text-center">Save your stats to track wins/losses</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleSave}
              disabled={saving || !phone.trim()}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      ) : stats ? (
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <p className="text-sm text-white/50 text-center">Your all-time stats</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-yellow-300">{stats.gamesPlayed}</p>
              <p className="text-xs text-white/40">Played</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{stats.gamesWon}</p>
              <p className="text-xs text-white/40">Won</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-400">{stats.bestScore.toLocaleString()}</p>
              <p className="text-xs text-white/40">Best</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full max-w-sm">
        <h3 className="text-lg font-bold text-white/60 mb-3">Final Standings</h3>
        <Leaderboard players={players} highlightId={playerId} compact />
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white flex items-center justify-center">
        <div className="animate-pulse text-2xl">Loading...</div>
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
