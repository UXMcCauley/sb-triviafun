'use client';

import { useState, useEffect } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import type { PlayerJoinedEvent, AnswerRevealEvent, GameFinishedEvent } from '@/lib/models/types';

interface PlayerInfo {
  id: string;
  name: string;
  score: number;
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

  const createGame = async () => {
    setLoading('create');
    const res = await fetch('/api/game/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numQuestions, timerDuration }),
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

  const nextQuestion = async () => {
    setLoading('next');
    await fetch('/api/game/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode }),
    });
    setLoading('');
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
    });

    channel.bind('answer-reveal', (data: AnswerRevealEvent) => {
      setPlayers(data.players);
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
        <div className="space-y-4 max-w-sm">
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
            onClick={createGame}
            disabled={loading === 'create'}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
          >
            {loading === 'create' ? 'Creating...' : 'Create Game'}
          </button>
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
          <div className="bg-white/10 rounded-xl p-4 inline-block">
            <p className="text-sm text-white/50">Question</p>
            <p className="text-2xl font-bold">{questionIndex + 1} / {totalQuestions}</p>
          </div>

          <div>
            <button
              onClick={nextQuestion}
              disabled={loading === 'next'}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-3 rounded-xl disabled:opacity-50"
            >
              {loading === 'next' ? 'Advancing...' : 'Reveal Answer & Next'}
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
            }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
