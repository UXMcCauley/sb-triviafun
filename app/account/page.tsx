'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SiteShell from '@/components/SiteShell';
import { authClient } from '@/lib/auth/client';

interface PackInfo {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questionCount: number;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function AccountPage() {
  const [user, setUser] = useState<{ id: string; email: string | null; name: string | null; image?: string | null } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [defaultUsername, setDefaultUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [phone, setPhone] = useState('');
  const [stats, setStats] = useState<null | {
    phone: string;
    displayName: string;
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    bestScore: number;
    correctAnswers: number;
    totalAnswers: number;
    winRate: number;
  }>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [fav, setFav] = useState<Record<string, { pinned: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        const u = data?.user || null;
        setUser(u);
        setDefaultUsername((u?.name || '').toString());
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        if (cancelled) return;
        setPacks(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/packs/favorites')
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, { pinned: boolean }> = {};
        for (const f of (data?.favorites || []) as Array<{ packId: string; pinned: boolean }>) {
          next[f.packId] = { pinned: Boolean(f.pinned) };
        }
        setFav(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const favoritePacks = useMemo(() => {
    const favIds = new Set(Object.keys(fav));
    const items = packs.filter((p) => favIds.has(p.id));
    items.sort((a, b) => {
      const ap = Boolean(fav[a.id]?.pinned);
      const bp = Boolean(fav[b.id]?.pinned);
      if (ap !== bp) return ap ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return items;
  }, [packs, fav]);

  const saveProfile = async () => {
    setMsg(null);
    if (!user) {
      setMsg({ kind: 'err', text: 'You’re not signed in.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultUsername }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to update profile');
      setUser(data?.user || user);
      setMsg({ kind: 'ok', text: 'Profile updated.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed to update profile' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2400);
    }
  };

  const signOut = async () => {
    setMsg(null);
    try {
      await authClient.signOut();
    } catch {}
    // Ensure cookie/session state is reflected across API routes.
    setUser(null);
    setFav({});
    setDefaultUsername('');
    setMsg({ kind: 'ok', text: 'Signed out.' });
    setTimeout(() => setMsg(null), 1800);
  };

  const fetchStats = async () => {
    setMsg(null);
    setStats(null);
    const normalized = phone.replace(/\D/g, '');
    if (!normalized) {
      setMsg({ kind: 'err', text: 'Enter a phone number to look up player stats.' });
      return;
    }
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/player/stats?phone=${encodeURIComponent(normalized)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not fetch stats');
      setStats(data);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not fetch stats' });
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <SiteShell
      title="Account"
      subtitle="Profile tweaks, game stats, and your carefully curated collection of trivia packs."
      rightSlot={
        <>
          <Link href="/packs" className="trivia-pill-browse">
            Packs
          </Link>
          <Link href="/report" className="trivia-pill-browse">
            Report
          </Link>
          {user ? (
            <button type="button" onClick={signOut} className="trivia-pill-browse">
              Sign out
            </button>
          ) : (
            <Link href="/auth/sign-in" className="trivia-btn-coral trivia-sheen inline-block py-2.5 px-5 text-sm">
              Sign in
            </Link>
          )}
        </>
      }
    >
      {msg ? (
        <div
          className={cx(
            'mb-6 rounded-2xl border px-4 py-3 text-sm',
            msg.kind === 'ok'
              ? 'border-green-500/25 bg-green-500/10 text-green-100'
              : 'border-red-500/25 bg-red-500/10 text-red-100',
          )}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="trivia-card-join p-6">
          <h2 className="text-xl font-black">Profile</h2>
          <p className="mt-2 text-sm text-white/60">
            {loadingUser ? 'Loading…' : user ? `Signed in as ${user.email || user.name || 'Account'}` : 'Not signed in.'}
          </p>

          <div className="mt-5 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Display name</span>
              <input
                value={defaultUsername}
                onChange={(e) => setDefaultUsername(e.target.value)}
                placeholder="2–20 characters"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-trivia-gold/40"
                disabled={!user || saving}
              />
            </label>
            <button
              type="button"
              onClick={saveProfile}
              disabled={!user || saving}
              className={cx(
                'rounded-2xl px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide transition',
                user
                  ? 'trivia-btn-coral trivia-sheen disabled:opacity-50'
                  : 'bg-white/10 text-white/30 cursor-not-allowed',
              )}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {!user ? (
              <p className="text-sm text-white/45">
                Sign in at <Link className="underline" href="/auth">/auth</Link> to save profile + favorites.
              </p>
            ) : null}
          </div>
        </section>

        <section className="trivia-card-join p-6">
          <h2 className="text-xl font-black">Game stats</h2>
          <p className="mt-2 text-sm text-white/60">
            This is keyed by the phone number used when joining games (separate from your sign-in account).
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-trivia-gold/40"
            />
            <button
              type="button"
              onClick={fetchStats}
              disabled={loadingStats}
              className="shrink-0 rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-extrabold text-white/85 transition hover:bg-white/10 disabled:opacity-60"
            >
              {loadingStats ? 'Looking…' : 'Look up'}
            </button>
          </div>

          {stats ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Games played', stats.gamesPlayed],
                ['Games won', stats.gamesWon],
                ['Win rate', `${stats.winRate}%`],
                ['Best score', stats.bestScore],
                ['Total score', stats.totalScore],
                ['Accuracy', stats.totalAnswers > 0 ? `${Math.round((stats.correctAnswers / stats.totalAnswers) * 100)}%` : '0%'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="text-xs font-bold text-white/45 uppercase tracking-wider">{label}</div>
                  <div className="mt-1 text-lg font-black">{String(value)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/45">
              No stats loaded yet. (If you’ve never joined a game with that phone, we won’t have anything to show.)
            </p>
          )}
        </section>
      </div>

      <section className="trivia-card-join mt-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Your packs</h2>
            <p className="mt-2 text-sm text-white/60">
              Favorites and pins are stored per signed-in user. Purchased packs will show here once purchasing is wired.
            </p>
          </div>
          <Link
            href="/packs"
            className="text-sm font-extrabold text-trivia-gold hover:text-trivia-gold/90 underline decoration-trivia-gold/30 underline-offset-2"
          >
            Browse packs
          </Link>
        </div>

        {user ? (
          favoritePacks.length ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {favoritePacks.map((pack) => {
                const pinned = Boolean(fav[pack.id]?.pinned);
                return (
                  <div key={pack.id} className="trivia-card-join p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                        style={{ backgroundColor: `${pack.themeColor}26` }}
                      >
                        {pack.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-lg leading-tight truncate">{pack.name}</p>
                          {pinned ? (
                            <span className="text-[11px] font-bold rounded-full px-2 py-0.5 border border-purple-400/30 bg-purple-500/15 text-purple-200">
                              Pinned
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-white/55 leading-snug line-clamp-2">{pack.tagline}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-white/45 leading-relaxed line-clamp-3">{pack.description}</p>
                    <div className="mt-4 text-xs text-white/35">{pack.questionCount} questions</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/45">
              No favorites yet. Go to <Link className="underline" href="/packs">Packs</Link> and star a few.
            </p>
          )
        ) : (
          <p className="mt-4 text-sm text-white/45">
            Sign in to track favorites and purchased packs. Without sign-in, you’re living dangerously.
          </p>
        )}
      </section>

      <section className="trivia-card-join mt-6 p-6">
        <h2 className="text-lg font-black">Game history (coming next)</h2>
        <p className="mt-2 text-sm text-white/60">
          We’ll add signed-in history for win/loss streaks, high games, big-loser games, and series performance. Right now the underlying
          game data exists, but it’s not mapped to user accounts yet.
        </p>
      </section>
    </SiteShell>
  );
}

