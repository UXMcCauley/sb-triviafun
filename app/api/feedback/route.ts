import { NextResponse } from 'next/server';

type FeedbackBody = {
  kind?: 'bug' | 'suggestion';
  title?: string | null;
  details?: string;
  email?: string | null;
  meta?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as FeedbackBody;
    const kind = body?.kind === 'suggestion' ? 'suggestion' : 'bug';
    const title = typeof body?.title === 'string' ? body.title.slice(0, 160) : '';
    const details = typeof body?.details === 'string' ? body.details.slice(0, 8000) : '';
    const email = typeof body?.email === 'string' ? body.email.slice(0, 320) : null;

    if (!details && !title) {
      return NextResponse.json({ error: 'Missing details' }, { status: 400 });
    }

    // Intentionally lightweight: we don't assume any DB schema exists yet.
    // This still gives you a stable API contract for the UI.
    console.log('[feedback]', {
      kind,
      title,
      details,
      email,
      meta: body?.meta ?? null,
      at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

