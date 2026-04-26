'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import SiteShell from '@/components/SiteShell';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type Mode = 'bug' | 'question' | 'suggestion';

export default function ReportPage() {
  const [mode, setMode] = useState<Mode>('bug');

  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const [gameCode, setGameCode] = useState('');
  const [questionIndex, setQuestionIndex] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [reason, setReason] = useState('');

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');

  const canSend = useMemo(() => {
    if (mode === 'question') {
      return Boolean(gameCode.trim()) && questionIndex.trim() !== '' && Boolean(reportedBy.trim());
    }
    return Boolean(details.trim()) || Boolean(title.trim());
  }, [mode, gameCode, questionIndex, reportedBy, title, details]);

  const send = async () => {
    setStatus(null);
    if (!canSend) return;

    setSending(true);
    try {
      if (mode === 'question') {
        const idx = Number(questionIndex);
        if (!Number.isFinite(idx) || idx < 0) {
          throw new Error('Question number must be 0 or higher (0-based index).');
        }
        const res = await fetch('/api/game/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameCode: gameCode.trim(),
            questionIndex: idx,
            reportedBy: reportedBy.trim(),
            reason: reason.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to submit report');
        setStatus({ kind: 'ok', text: 'Reported. Thanks — we’ll review it.' });
        setReason('');
        return;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          title: title.trim() || null,
          details: details.trim(),
          email: email.trim() || null,
          meta: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            href: typeof window !== 'undefined' ? window.location.href : null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to send feedback');

      setStatus({ kind: 'ok', text: 'Sent. You are officially part of the QA department now.' });
      setTitle('');
      setDetails('');
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : 'Failed to send' });
    } finally {
      setSending(false);
      setTimeout(() => setStatus(null), 3500);
    }
  };

  return (
    <SiteShell
      title="Report / Feedback"
      subtitle="Bugs, incorrect questions/answers, feature requests. If it’s broken, weird, or biased, we want to know."
      rightSlot={
        <div className="flex flex-wrap gap-2">
          <Link href="/how-to-play" className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/70">
            How to play
          </Link>
          <Link href="/packs" className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/70">
            Packs
          </Link>
          <Link href="/account" className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm font-bold text-white/70">
            Account
          </Link>
        </div>
      }
    >
      {status ? (
        <div
          className={cx(
            'mb-6 rounded-2xl border px-4 py-3 text-sm',
            status.kind === 'ok'
              ? 'border-green-500/25 bg-green-500/10 text-green-100'
              : 'border-red-500/25 bg-red-500/10 text-red-100',
          )}
        >
          {status.text}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-white/4 p-2 shadow-[0_1px_0_rgba(255,255,255,0.08)] inline-flex flex-wrap gap-2">
        {([
          ['bug', 'Bug / issue'],
          ['question', 'Incorrect question / answer'],
          ['suggestion', 'Suggestion'],
        ] as Array<[Mode, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cx(
              'rounded-2xl px-4 py-2 text-sm font-extrabold transition border',
              mode === id ? 'bg-yellow-500 text-black border-yellow-400/30' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'question' ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/4 p-6 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-black">Report an incorrect question/answer</h2>
          <p className="mt-2 text-sm text-white/60">
            This hooks into your existing in-game reporting endpoint. Use the room code and the question index.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Game code</span>
              <input
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                placeholder="ABCD"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Question index (0-based)</span>
              <input
                value={questionIndex}
                onChange={(e) => setQuestionIndex(e.target.value)}
                placeholder="0"
                inputMode="numeric"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Reported by</span>
              <input
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                placeholder="Your name (or phone if that’s your canonical identity here)"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Reason</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What’s wrong? Wrong correct answer? Biased wording? Bad data? Duplicate question?"
                rows={4}
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={sending || !canSend}
              className="rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 text-sm font-extrabold disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Submit report'}
            </button>
            <p className="text-sm text-white/45">
              Tip: for general bugs or feature ideas, use the other tabs.
            </p>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/4 p-6 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
          <h2 className="text-xl font-black">
            {mode === 'bug' ? 'Report a bug' : 'Make a suggestion'}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {mode === 'bug'
              ? 'Tell us what you expected, what happened instead, and how to reproduce it.'
              : 'Theme packs, rules tweaks, accessibility improvements, fairness fixes — all welcome.'}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Title (optional)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'bug' ? '“Lobby freezes after start”' : '“Add a Seinfeld pack (obviously)”'}
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Details</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  mode === 'bug'
                    ? 'Steps to reproduce, what device/browser, screenshots if you have them…'
                    : 'What should exist, who it helps, and how we should avoid making it weird or biased…'
                }
                rows={6}
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Email (optional)</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="If you want a follow-up"
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={sending || !canSend}
              className="rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 text-sm font-extrabold disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
            <p className="text-sm text-white/45">
              If this is a question/answer problem from a live game, use the “Incorrect question/answer” tab.
            </p>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-lg font-black">Fairness / bias note</h2>
        <p className="mt-2 text-sm text-white/60">
          If a question is culturally narrow, ambiguous, discriminatory, or punches down, flag it. Trivia that “technically” has an answer but
          still harms people is just a different kind of wrong.
        </p>
      </section>
    </SiteShell>
  );
}

