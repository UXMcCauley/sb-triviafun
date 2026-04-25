import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher';
import { sql } from '@/lib/db';
import {
  selectQuestionsForGame,
  generateShuffleMappings,
} from '@/lib/game-helpers';

export async function POST(request: Request) {
  try {
    const { gameCode } = await request.json();
    const upperCode = gameCode.toUpperCase();

    const oldGameRows = (await sql`
      select
        id,
        game_code,
        status,
        pack_ids,
        question_ids,
        settings,
        series_id,
        series_index
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{
      id: string;
      game_code: string;
      status: string;
      pack_ids: string[];
      question_ids: string[];
      settings: { timerSeconds?: number } | null;
      series_id: string | null;
      series_index: number;
    }>;
    const oldGame = oldGameRows[0];
    if (!oldGame) {
      return NextResponse.json({ error: 'Original game not found' }, { status: 404 });
    }

    const oldPlayers = (await sql`
      select player_id::text as id, name, score
      from game_players
      where game_id = ${oldGame.id}::uuid
    `) as Array<{ id: string; name: string; score: number }>;

    // Snapshot the finished game's results for series history before we reset it
    const finishedResults = [...oldPlayers]
      .sort((a, b) => b.score - a.score)
      .map((p, rank: number) => ({
        id: p.id, name: p.name, score: p.score, rank: rank + 1,
      }));

    const numQuestions = oldGame.question_ids.length;
    const timerSeconds = oldGame.settings?.timerSeconds ?? 15;
    const seriesId = oldGame.series_id;
    const seriesIndex = (oldGame.series_index || 0) + 1;

    // Pull questions from the same packs as the original game
    const questions = await selectQuestionsForGame(oldGame.pack_ids, numQuestions);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions available' }, { status: 400 });
    }

    const { shuffledOptionOrders, shuffledCorrectAnswers } = generateShuffleMappings(
      questions.map((q) => ({ options: q.options, correctAnswerIndex: q.correct_answer_index }))
    );

    // Same players, reset scores
    await sql`
      update game_players
      set score = 0, answers = ${"[]"}::jsonb
      where game_id = ${oldGame.id}::uuid
    `;
    const newPlayers = oldPlayers.map((p) => ({ id: p.id, name: p.name }));

    // Reset the same game document in-place — keeps the same gameCode
    await sql`
      update games
      set
        status = ${"lobby"},
        question_ids = ${questions.map((q) => q.id)}::uuid[],
        shuffled_option_orders = ${JSON.stringify(shuffledOptionOrders)}::jsonb,
        shuffled_correct_answers = ${JSON.stringify(shuffledCorrectAnswers)}::jsonb,
        current_question_index = ${0},
        question_started_at = ${null},
        settings = ${JSON.stringify({ timerSeconds, questionCount: numQuestions })}::jsonb,
        series_index = ${seriesIndex}
      where id = ${oldGame.id}::uuid
    `;

    // Build series history from previous rounds stored client-side + current finished round
    // Also fetch any other finished games from this series (in case of reconnect)
    const seriesGames =
      seriesId
        ? ((await sql`
            select id, game_code, series_index
            from games
            where series_id = ${seriesId}::uuid and status = ${"finished"} and id <> ${oldGame.id}::uuid
            order by series_index asc
          `) as Array<{ id: string; game_code: string; series_index: number }>)
        : [];

    const seriesHistory = [
      ...(await Promise.all(
        seriesGames.map(async (g) => {
          const players = (await sql`
            select player_id::text as id, name, score
            from game_players
            where game_id = ${g.id}::uuid
          `) as Array<{ id: string; name: string; score: number }>;
          return {
            gameIndex: g.series_index || 0,
            gameCode: g.game_code,
            results: [...players]
              .sort((a, b) => b.score - a.score)
              .map((p, rank) => ({ id: p.id, name: p.name, score: p.score, rank: rank + 1 })),
          };
        })
      )),
      {
        gameIndex: oldGame.series_index || 0,
        gameCode: upperCode,
        results: finishedResults,
      },
    ].sort((a, b) => a.gameIndex - b.gameIndex);

    // Notify clients — same channel since code is reused
    const pusher = getPusherServer();
    await pusher.trigger(`game-${upperCode}`, 'game-replay', {
      gameCode: upperCode,
      players: newPlayers.map((p) => ({ id: p.id, name: p.name })),
      seriesHistory,
    });

    return NextResponse.json({ gameCode: upperCode, timerDuration: timerSeconds, seriesHistory });
  } catch (error) {
    console.error('Replay error:', error);
    return NextResponse.json({ error: 'Failed to create replay' }, { status: 500 });
  }
}
