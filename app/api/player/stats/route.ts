import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET — fetch stats by phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.replace(/\D/g, '');

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const rows = (await sql`
      select
        phone,
        display_name,
        games_played,
        games_won,
        total_score,
        best_score,
        correct_answers,
        total_answers
      from player_stats
      where phone = ${phone}
      limit 1
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
    if (!stats) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({
      phone: stats.phone,
      displayName: stats.display_name,
      gamesPlayed: stats.games_played,
      gamesWon: stats.games_won,
      totalScore: stats.total_score,
      bestScore: stats.best_score,
      correctAnswers: stats.correct_answers,
      totalAnswers: stats.total_answers,
      winRate: stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

// POST — record game results
export async function POST(request: Request) {
  try {
    const { phone, score, correctAnswers, totalAnswers, won } = await request.json();

    const normalizedPhone = phone?.replace(/\D/g, '');
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const currentRows = (await sql`
      select best_score
      from player_stats
      where phone = ${normalizedPhone}
      limit 1
    `) as Array<{ best_score: number }>;
    const current = currentRows[0];
    if (!current) {
      return NextResponse.json({ error: 'Player not registered' }, { status: 404 });
    }

    const newBest = Math.max(current.best_score ?? 0, score || 0);

    await sql`
      update player_stats
      set
        games_played = games_played + 1,
        games_won = games_won + ${won ? 1 : 0},
        total_score = total_score + ${score || 0},
        correct_answers = correct_answers + ${correctAnswers || 0},
        total_answers = total_answers + ${totalAnswers || 0},
        best_score = ${newBest},
        last_played_at = now()
      where phone = ${normalizedPhone}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Record stats error:', error);
    return NextResponse.json({ error: 'Failed to record stats' }, { status: 500 });
  }
}
