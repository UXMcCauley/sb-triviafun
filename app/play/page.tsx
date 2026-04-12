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

type Phase = 'login' | 'join' | 'lobby' | 'question' | 'answered' | 'reveal' | 'waiting' | 'finished';

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

  // Game state
  const [phase, setPhase] = useState<Phase>('login');
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
  const [reported, setReported] = useState(false);

  const selectedAnswerRef = useRef<number | null>(null);
  useEffect(() => { selectedAnswerRef.current = selectedAnswer; }, [selectedAnswer]);

  // Check localStorage for saved phone
  useEffect(() => {
    const saved = localStorage.getItem('seinfeld_phone');
    const name = localStorage.getItem('seinfeld_name');
    if (saved && name) {
      setPhone(saved);
      setSavedName(name);
      setPlayerName(name);
      setIsLoggedIn(true);
      setPhase('join');
      // Fetch stats
      fetch(`/api/player/stats?phone=${encodeURIComponent(saved)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setPlayerStats(data); });
    }
  }, []);

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
      setPlayerId(data.playerId);
      setGameCode(data.gameCode);
      setPhase('lobby');
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
          questionText: currentQuestion.questionText,
          options: currentQuestion.options,
          correctAnswerIndex: correctAnswer,
          reportedBy: playerName,
          gameCode,
        }),
      });
    } catch (err) { console.error('Report failed:', err); }
  };

  // Pusher
  useEffect(() => {
    if (!gameCode || phase === 'login' || phase === 'join') return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`game-${gameCode}`);

    channel.bind('game-started', () => { /* pregame countdown handled by display */ });

    channel.bind('new-question', (data: NewQuestionEvent) => {
      setCurrentQuestion(data);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setReported(false);
      setPhase('question');
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setCorrectAnswer(data.correctAnswerIndex);
      setPlayers(data.players);
      const sel = selectedAnswerRef.current;
      setWasCorrect(sel !== null ? sel === data.correctAnswerIndex : null);
      setPhase('reveal');
      setTimeout(() => setPhase('waiting'), 5000);
    });

    channel.bind('game-paused', (data: GamePausedEvent) => { setPaused(data.paused); });

    channel.bind('game-finished', (data: GameFinishedEvent) => {
      setPlayers(data.players);
      setWinner(data.winner);
      setPhase('finished');
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

    channel.bind('game-replay', (data: { newGameCode: string; players: { id: string; name: string }[] }) => {
      setGameCode(data.newGameCode);
      setPlayers(data.players.map((p) => ({ ...p, score: 0 })));
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setCorrectAnswer(null);
      setWasCorrect(null);
      setWinner(null);
      setReported(false);
      setPhase('lobby');
    });

    return () => { channel.unbind_all(); pusher.unsubscribe(`game-${gameCode}`); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, phase === 'login', phase === 'join']);

  const myRank = players.findIndex((p) => p.id === playerId) + 1;
  const myScore = players.find((p) => p.id === playerId)?.score || 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-indigo-950 to-gray-900 text-white">
      {/* PAUSE OVERLAY */}
      {paused && phase !== 'login' && phase !== 'join' && phase !== 'lobby' && phase !== 'finished' && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="text-center space-y-4"><div className="text-6xl">⏸️</div><h2 className="text-3xl font-black text-yellow-400">Paused</h2></div>
        </div>
      )}

      {/* LOGIN — phone number */}
      {phase === 'login' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-black"><span className="text-yellow-400">Seinfeld</span> Trivia</h1>
              <p className="text-white/50 mt-2">Sign in to track your game history</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Phone Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg placeholder:text-white/20 focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-sm text-white/60 block mb-1">Display Name</label>
                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" maxLength={20} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg placeholder:text-white/20 focus:outline-none focus:border-yellow-500" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button onClick={handleLogin} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button onClick={() => { setPhase('join'); setIsLoggedIn(false); }} className="w-full text-white/40 text-sm py-2 hover:text-white/60">
                Skip — play as guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN */}
      {phase === 'join' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-black"><span className="text-yellow-400">Seinfeld</span> Trivia</h1>
              {isLoggedIn && <p className="text-white/50 mt-2">Welcome back, {savedName}!</p>}
              {playerStats && (
                <div className="flex justify-center gap-4 mt-3">
                  <span className="text-xs text-white/40">{playerStats.gamesPlayed} played</span>
                  <span className="text-xs text-green-400">{playerStats.gamesWon} won</span>
                  <span className="text-xs text-yellow-400">Best: {playerStats.bestScore.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/60 block mb-1">Game Code</label>
                <input type="text" value={gameCode} onChange={(e) => setGameCode(e.target.value.toUpperCase())} placeholder="ABCD" maxLength={4} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl text-center font-mono tracking-widest uppercase placeholder:text-white/20 focus:outline-none focus:border-yellow-500" />
              </div>
              {!isLoggedIn && (
                <div>
                  <label className="text-sm text-white/60 block mb-1">Your Name</label>
                  <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" maxLength={20} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-lg placeholder:text-white/20 focus:outline-none focus:border-yellow-500" />
                </div>
              )}
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button onClick={handleJoin} disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOBBY */}
      {phase === 'lobby' && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-6">
            <div className="text-6xl">📺</div>
            <h2 className="text-3xl font-bold">You&apos;re in!</h2>
            <p className="text-xl text-white/60">Game <span className="font-mono text-yellow-400">{gameCode}</span></p>
            <p className="text-white/40">Waiting for the host to start...</p>
            <div className="animate-pulse text-4xl">⏳</div>
          </div>
        </div>
      )}

      {/* QUESTION */}
      {(phase === 'question' || phase === 'answered') && currentQuestion && (
        <div className="min-h-screen flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <Countdown startedAt={currentQuestion.startedAt} duration={currentQuestion.timerDuration} size="sm" />
            <div className="text-right">
              <div className="text-sm text-white/50">Score</div>
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
          {phase === 'answered' && <div className="text-center py-4"><p className="text-white/50">Answer locked in!</p></div>}
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
            <Leaderboard players={players} highlightId={playerId} compact />
          </div>
          <p className="text-white/30 text-sm text-center">Waiting for host to start next round...</p>
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-linear-to-br from-gray-900 via-indigo-950 to-gray-900 text-white flex items-center justify-center"><div className="animate-pulse text-2xl">Loading...</div></div>}>
      <PlayContent />
    </Suspense>
  );
}
