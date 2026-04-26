'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SiteShell from '@/components/SiteShell';

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

export default function PacksPage() {
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | null; name: string | null } | null>(null);
  const [fav, setFav] = useState<Record<string, { pinned: boolean }>>({});
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/packs')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PackInfo[]) => {
        if (cancelled) return;
        setPacks(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (cancelled) return;
        setUser(data?.user || null);
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

  const sortedPacks = useMemo(() => {
    const withRank = packs.map((p, idx) => ({
      p,
      idx,
      pinned: Boolean(fav[p.id]?.pinned),
      favored: Boolean(fav[p.id]),
    }));
    withRank.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.favored !== b.favored) return a.favored ? -1 : 1;
      return a.idx - b.idx;
    });
    return withRank.map((x) => x.p);
  }, [packs, fav]);

  const toggleFavorite = async (packId: string) => {
    if (!user) {
      setToast('Sign in to favorite packs.');
      setTimeout(() => setToast(''), 1800);
      return;
    }
    const isFav = Boolean(fav[packId]);
    const next = { ...fav };
    if (isFav) delete next[packId];
    else next[packId] = { pinned: false };
    setFav(next);
    await fetch('/api/packs/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, action: isFav ? 'unfavorite' : 'favorite' }),
    }).catch(() => {});
  };

  const togglePin = async (packId: string) => {
    if (!user) return;
    if (!fav[packId]) return;
    const pinned = !fav[packId]?.pinned;
    setFav((prev) => ({ ...prev, [packId]: { pinned } }));
    await fetch('/api/packs/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, action: pinned ? 'pin' : 'unpin' }),
    }).catch(() => {});
  };

  const buyDisabled = () => {
    setToast('Purchasing isn’t wired yet — this page is the storefront shell.');
    setTimeout(() => setToast(''), 2200);
  };

  return (
    <SiteShell
      title="Theme packs"
      subtitle="Browse packs, favorite what you love, and (soon) buy new packs without selling your soul to trivia capitalism."
      rightSlot={
        <>
          <Link href="/how-to-play" className="trivia-pill-browse">
            How to play
          </Link>
          <Link href="/account" className="trivia-pill-browse">
            Account
          </Link>
        </>
      }
    >
      {toast ? (
        <div className="trivia-card-join mb-5 px-4 py-3 text-sm text-white/70">
          {toast}
        </div>
      ) : null}

      <div className="trivia-card-join p-5 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-white/60">
            {loading ? 'Loading packs…' : `${packs.length} packs`} ·{' '}
            {user ? (
              <span>
                Signed in as <span className="text-white/80 font-semibold">{user.email || user.name || 'Account'}</span>
              </span>
            ) : (
              <span>
                Not signed in · favorites are local vibes only until you <Link className="underline" href="/auth">sign in</Link>
              </span>
            )}
          </div>
          <Link
            href="/"
            className="text-sm font-extrabold text-trivia-gold hover:text-trivia-gold/90 underline decoration-trivia-gold/30 underline-offset-2"
          >
            Back to host
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedPacks.map((pack) => {
          const isEmpty = pack.questionCount === 0;
          const isFav = Boolean(fav[pack.id]);
          const isPinned = Boolean(fav[pack.id]?.pinned);
          return (
            <div
              key={pack.id}
              className={cx(
                'trivia-card-join transition duration-200',
                'hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]',
                isEmpty && 'opacity-45',
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: `${pack.themeColor}26` }}
                  >
                    {pack.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-lg leading-tight truncate">{pack.name}</p>
                    <p className="text-sm text-white/55 leading-snug line-clamp-2">{pack.tagline}</p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-white/45 leading-relaxed line-clamp-3">{pack.description}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-white/35">
                    {isEmpty ? 'No questions yet' : `${pack.questionCount} questions`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(pack.id)}
                      className={cx(
                        'text-xs font-semibold rounded-full px-2 py-1 border transition',
                        isFav
                          ? 'border-yellow-400/30 bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/20'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                      )}
                      aria-label={isFav ? 'Unfavorite pack' : 'Favorite pack'}
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                    {isFav ? (
                      <button
                        type="button"
                        onClick={() => togglePin(pack.id)}
                        className={cx(
                          'text-xs font-semibold rounded-full px-2 py-1 border transition',
                          isPinned
                            ? 'border-purple-400/30 bg-purple-500/15 text-purple-200 hover:bg-purple-500/20'
                            : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10',
                        )}
                        aria-label={isPinned ? 'Unpin pack' : 'Pin pack'}
                      >
                        {isPinned ? 'Pinned' : 'Pin'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={buyDisabled}
                    className="rounded-2xl bg-green-500/20 hover:bg-green-500/25 border border-green-400/25 px-4 py-2 text-sm font-extrabold text-green-200"
                  >
                    Buy pack
                  </button>
                  <span className="text-xs text-white/35">
                    {pack.isDefault ? 'Included' : 'Premium (soon)'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="trivia-card-join mt-10 p-6">
        <h2 className="text-lg font-black">Want a pack that doesn’t exist yet?</h2>
        <p className="mt-2 text-sm text-white/60">
          Send a suggestion (themes, difficulty, formats). Bonus points if you include example questions that won’t start a small war.
        </p>
        <div className="mt-4">
          <Link href="/report" className="trivia-pill-browse">
            Suggest a pack
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}

