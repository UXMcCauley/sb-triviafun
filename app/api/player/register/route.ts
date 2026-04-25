import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { phone, displayName } = await request.json();

    if (!phone || !displayName) {
      return NextResponse.json({ error: 'Phone and name required' }, { status: 400 });
    }

    // Normalize phone (strip non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const userId = await getSessionUserId();

    // Upsert — create or update display name
    const rows = (await sql`
      insert into player_stats (phone, display_name, user_id, updated_at)
      values (${normalizedPhone}, ${displayName}, ${userId}::uuid, now())
      on conflict (phone) do update
        set display_name = excluded.display_name,
            user_id = coalesce(excluded.user_id, player_stats.user_id),
            updated_at = now()
      returning
        phone,
        display_name,
        games_played,
        games_won,
        total_score,
        best_score,
        correct_answers,
        total_answers
    `) as Array<{
      phone: string;
      display_name: string;
      games_played: number;
      games_won: number;
      total_score: number;
      best_score: number;
      correct_answers: number;
      total_answers: number;
    }>;
    const stats = rows[0];

    return NextResponse.json({
      phone: stats.phone,
      displayName: stats.display_name,
      gamesPlayed: stats.games_played,
      gamesWon: stats.games_won,
      totalScore: stats.total_score,
      bestScore: stats.best_score,
      correctAnswers: stats.correct_answers,
      totalAnswers: stats.total_answers,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
