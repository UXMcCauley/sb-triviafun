import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white flex items-center justify-center">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-7xl font-black tracking-tight">
          <span className="text-yellow-400">Seinfeld</span> Trivia
        </h1>
        <p className="text-2xl text-white/60 max-w-lg mx-auto">
          The real-time multiplayer trivia game about nothing... and everything.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            href="/display"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl px-8 py-4 rounded-2xl transition-all active:scale-95"
          >
            TV Display
          </Link>
          <Link
            href="/play"
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xl px-8 py-4 rounded-2xl transition-all active:scale-95"
          >
            Join Game
          </Link>
          <Link
            href="/watch"
            className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-bold text-xl px-8 py-4 rounded-2xl transition-all active:scale-95"
          >
            Watch (Spectator)
          </Link>
          <Link
            href="/host"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-bold text-xl px-8 py-4 rounded-2xl transition-all active:scale-95"
          >
            Host Controls
          </Link>
        </div>

        <div className="mt-12 text-white/30 text-sm max-w-md mx-auto">
          <p>Open <strong>/display</strong> on a TV or projector, then have players join on their phones via <strong>/play</strong>.</p>
        </div>
      </div>
    </div>
  );
}
