import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { gameCode, questionIndex, reportedBy, reason } = await request.json();

    if (!gameCode || questionIndex === undefined || !reportedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up the question ObjectId from the game
    const upperCode = gameCode.toUpperCase();
    const gameRows = (await sql`
      select question_ids
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{ question_ids: string[] }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const questionId = game.question_ids[questionIndex];
    if (!questionId) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await sql`
      insert into reports (question_id, reported_by, game_code, reason)
      values (
        ${questionId}::uuid,
        ${reportedBy},
        ${upperCode},
        ${reason || 'Incorrect answer marked as correct'}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to report' }, { status: 500 });
  }
}
