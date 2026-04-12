'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import type {
  NewQuestionEvent,
  AnswerRevealEvent,
  GameFinishedEvent,
} from '@/lib/models/types';
import QuestionCard from '@/components/QuestionCard';
import Countdown from '@/components/Countdown';
import Leaderboard from '@/components/Leaderboard';

type Phase = 'join' | 'lobby' | 'question' | 'answered' | 'reveal' | 'finished';

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

  const [currentQuestion, setCurrentQuestion] = useState<NewQuestionEvent | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);

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
    if (selectedAnswer !== null || !currentQuestion) return;
    setSelectedAnswer(answerIndex);
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
  }, [selectedAnswer, currentQuestion, gameCode, playerId]);

  // Subscribe to Pusher
  useEffect(() => {
    if (!gameCode || phase === 'join') return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('game-started', () => {
      // Game is starting — will receive new-question soon
    });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      setWasCorrect(null);
      setPhase('question');
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayers(data.players);
      if (selectedAnswer !== null) {
        setWasCorrect(selectedAnswer === data.correctAnswerIndex);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, phase === 'join']);

  const myRank = players.findIndex((p) => p.id === playerId) + 1;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
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
                <span className="font-bold text-xl">#{myRank}</span>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 mt-2">
                <span className="text-white/60">Score</span>
                <span className="font-mono font-bold text-yellow-300 text-xl">{myScore.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINISHED PHASE */}
      {phase === 'finished' && (
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

          <div className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-white/60 mb-3">Final Standings</h3>
            <Leaderboard players={players} highlightId={playerId} compact />
          </div>
        </div>
      )}
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
