import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getShuffledQuestion } from '@/lib/game-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode')?.toUpperCase();

    if (!gameCode) {
      return NextResponse.json({ error: 'Game code required' }, { status: 400 });
    }

    const gameRows = (await sql`
      select
        id,
        game_code,
        status,
        pack_ids,
        current_question_index,
        question_ids,
        shuffled_option_orders,
        shuffled_correct_answers,
        question_started_at,
        settings,
        series_id,
        series_index
      from games
      where game_code = ${gameCode}
      limit 1
    `) as Array<{
      id: string;
      game_code: string;
      status: string;
      pack_ids: string[];
      current_question_index: number;
      question_ids: string[];
      shuffled_option_orders: number[][];
      shuffled_correct_answers: number[];
      question_started_at: number | null;
      settings: { timerSeconds?: number; questionCount?: number } | null;
      series_id: string | null;
      series_index: number;
    }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const packs = (await sql`
      select id::text as id, slug, name, tagline, description, theme_color, icon, is_default
      from packs
      where id = any(${game.pack_ids}::uuid[])
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      tagline: string;
      description: string;
      theme_color: string;
      icon: string;
      is_default: boolean;
    }>;

    // Populate all questions to build sanitized list
    const questionDocs = (await sql`
      select id, question_text, options, category, difficulty
      from questions
      where id = any(${game.question_ids}::uuid[])
    `) as Array<{
      id: string;
      question_text: string;
      options: string[];
      category: string | null;
      difficulty: string;
    }>;

    // Create a map for quick lookup preserving order
    const questionMap = new Map(
      questionDocs.map((q) => [q.id, q])
    );

    // Sanitize: don't send correct answers for active games (future questions)
    const sanitizedQuestions = game.question_ids.map((qId, i) => {
      const q = questionMap.get(qId);
      if (!q) return null;

      const optionOrder = game.shuffled_option_orders[i];
      const shuffled = getShuffledQuestion(
        {
          questionText: q.question_text,
          options: q.options,
          category: q.category,
          difficulty: q.difficulty,
        },
        optionOrder
      );

      return {
        questionText: shuffled.questionText,
        options: shuffled.options,
        category: shuffled.category,
        difficulty: shuffled.difficulty,
        // Only reveal correct answer for past questions
        ...(game.status === 'finished' || i < game.current_question_index
          ? { correctAnswerIndex: game.shuffled_correct_answers[i] }
          : {}),
      };
    }).filter(Boolean);

    const players = (await sql`
      with ranked as (
        select
          ps.display_name,
          u.avatar_url,
          rank() over (order by ps.total_score desc) as global_rank
        from player_stats ps
        left join users u on u.id = ps.user_id
      )
      select
        gp.player_id::text as id,
        gp.name,
        gp.score,
        r.avatar_url,
        r.global_rank::int as global_rank
      from game_players gp
      left join ranked r on r.display_name = gp.name
      where gp.game_id = ${game.id}::uuid
    `) as Array<{ id: string; name: string; score: number; avatar_url: string | null; global_rank: number | null }>;

    const seriesHistory =
      game.status === 'finished' && game.series_id
        ? ((await sql`
            select id, game_code, series_index
            from games
            where series_id = ${game.series_id}::uuid and status = ${"finished"}
            order by series_index asc
          `) as Array<{ id: string; game_code: string; series_index: number }>)
        : [];

    const seriesHistoryWithResults =
      seriesHistory.length > 1
        ? await Promise.all(
            seriesHistory.map(async (g) => {
              const rows = (await sql`
                select player_id::text as id, name, score
                from game_players
                where game_id = ${g.id}::uuid
              `) as Array<{ id: string; name: string; score: number }>;
              return {
                gameIndex: g.series_index || 0,
                gameCode: g.game_code,
                results: [...rows]
                  .sort((a, b) => b.score - a.score)
                  .map((p, rank) => ({ id: p.id, name: p.name, score: p.score, rank: rank + 1 })),
              };
            })
          )
        : null;

    return NextResponse.json({
      gameCode: game.game_code,
      status: game.status,
      packIds: game.pack_ids,
      packs: packs.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        themeColor: p.theme_color,
        icon: p.icon,
        isDefault: p.is_default,
      })),
      currentQuestionIndex: game.current_question_index,
      totalQuestions: game.question_ids.length,
      questions: sanitizedQuestions,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        avatarUrl: p.avatar_url,
        globalRank: p.global_rank,
      })),
      questionStartedAt: game.question_started_at,
      timerDuration: game.settings?.timerSeconds ?? 15,
      seriesId: game.series_id,
      seriesIndex: game.series_index ?? 0,
      seriesHistory: seriesHistoryWithResults,
    });
  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}
