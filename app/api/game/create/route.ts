import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@/lib/db';
import {
  generateGameCode,
  selectQuestionsForGame,
  generateShuffleMappings,
  resolvePackIds,
} from '@/lib/game-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const numQuestions = body.numQuestions || 15;
    const timerDuration = body.timerDuration || 15;
    const rawPackIds: string[] | undefined = body.packIds;

    // Resolve pack IDs (from slugs or ObjectId strings)
    const packIds =
      rawPackIds && rawPackIds.length > 0 ? await resolvePackIds(rawPackIds) : undefined;

    // Select random questions from the specified packs
    const questions = await selectQuestionsForGame(packIds, numQuestions);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available for selected packs' }, { status: 400 });
    }

    // Generate per-game shuffle mappings
    const { shuffledOptionOrders, shuffledCorrectAnswers } = generateShuffleMappings(
      questions.map((q) => ({ options: q.options, correctAnswerIndex: q.correct_answer_index }))
    );

    // Generate unique game code
    let gameCode = generateGameCode();
    // Avoid colliding with non-finished games
    // (finished games can be reused if desired, but we keep the original semantics)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = (await sql`
        select 1 from games where game_code = ${gameCode} and status <> 'finished' limit 1
      `) as Array<{ "?column?": number }>;
      if (exists.length === 0) break;
      gameCode = generateGameCode();
    }

    const seriesId = uuidv4();
    await sql`
      insert into games (
        game_code,
        status,
        pack_ids,
        question_ids,
        shuffled_option_orders,
        shuffled_correct_answers,
        current_question_index,
        question_started_at,
        settings,
        series_id,
        series_index
      ) values (
        ${gameCode},
        ${"lobby"},
        ${packIds ?? []}::uuid[],
        ${questions.map((q) => q.id)}::uuid[],
        ${JSON.stringify(shuffledOptionOrders)}::jsonb,
        ${JSON.stringify(shuffledCorrectAnswers)}::jsonb,
        ${0},
        ${null},
        ${JSON.stringify({ timerSeconds: timerDuration, questionCount: numQuestions })}::jsonb,
        ${seriesId}::uuid,
        ${0}
      )
    `;

    return NextResponse.json({
      gameCode,
      timerDuration,
      seriesId,
    });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
