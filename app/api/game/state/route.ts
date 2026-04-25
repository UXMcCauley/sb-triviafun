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
        current_question_index,
        question_ids,
        shuffled_option_orders,
        shuffled_correct_answers,
        question_started_at,
        settings
      from games
      where game_code = ${gameCode}
      limit 1
    `) as Array<{
      id: string;
      game_code: string;
      status: string;
      current_question_index: number;
      question_ids: string[];
      shuffled_option_orders: number[][];
      shuffled_correct_answers: number[];
      question_started_at: number | null;
      settings: { timerSeconds?: number } | null;
    }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

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
      select player_id::text as id, name, score
      from game_players
      where game_id = ${game.id}::uuid
    `) as Array<{ id: string; name: string; score: number }>;

    return NextResponse.json({
      gameCode: game.game_code,
      status: game.status,
      currentQuestionIndex: game.current_question_index,
      totalQuestions: game.question_ids.length,
      questions: sanitizedQuestions,
      players,
      questionStartedAt: game.question_started_at,
      timerDuration: game.settings?.timerSeconds ?? 15,
    });
  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}
