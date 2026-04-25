import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const limit = Math.max(1, Math.min(30, Number(searchParams.get('limit') || 10)));

  const rows = region
    ? ((await sql`
        select winner_name, winner_score, game_code, finished_at
        from game_results
        where region = ${region}
        order by finished_at desc
        limit ${limit}
      `) as Array<{ winner_name: string; winner_score: number; game_code: string; finished_at: string }>)
    : ((await sql`
        select winner_name, winner_score, game_code, finished_at
        from game_results
        order by finished_at desc
        limit ${limit}
      `) as Array<{ winner_name: string; winner_score: number; game_code: string; finished_at: string }>);

  return NextResponse.json({
    winners: rows.map((r) => ({
      winnerName: r.winner_name,
      winnerScore: r.winner_score,
      gameCode: r.game_code,
      finishedAt: r.finished_at,
    })),
  });
}

