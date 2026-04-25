import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getPusherServer } from '@/lib/pusher';
import { getShuffledQuestion } from '@/lib/game-helpers';
import type { PlayerResult } from '@/lib/models/types';

export async function POST(request: Request) {
  try {
    const { gameCode, action } = await request.json();

    const upperCode = gameCode.toUpperCase();
    const gameRows = (await sql`
      select
        id,
        game_code,
        status,
        question_ids,
        shuffled_option_orders,
        shuffled_correct_answers,
        current_question_index,
        question_started_at,
        settings
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{
      id: string;
      game_code: string;
      status: string;
      question_ids: string[];
      shuffled_option_orders: number[][];
      shuffled_correct_answers: number[];
      current_question_index: number;
      question_started_at: number | null;
      settings: { timerSeconds?: number } | null;
    }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const pusher = getPusherServer();
    const timerSeconds = game.settings?.timerSeconds ?? 15;

    // action: 'reveal' — reveal the current answer and show who got it right
    // action: 'advance' (or undefined for backward compat) — send the next question
    if (action === 'advance') {
      const nextIndex = game.current_question_index + 1;

      if (nextIndex >= game.question_ids.length) {
        // Game over
        await sql`
          update games
          set status = ${"finished"}, question_started_at = ${null}
          where id = ${game.id}::uuid
        `;

        const sortedPlayers = (await sql`
          select player_id::text as id, name, score
          from game_players
          where game_id = ${game.id}::uuid
          order by score desc
        `) as Array<{ id: string; name: string; score: number }>;

        const winner = sortedPlayers[0] || { id: '', name: 'No one', score: 0 };
        await pusher.trigger(`game-${game.game_code}`, 'game-finished', {
          players: sortedPlayers,
          winner,
        });

        return NextResponse.json({ finished: true, winner });
      }

      // Advance to next question — need to populate the question
      const questionId = game.question_ids[nextIndex];
      const qRows = (await sql`
        select
          id,
          question_text,
          options,
          category,
          difficulty,
          source
        from questions
        where id = ${questionId}::uuid
        limit 1
      `) as Array<{
        id: string;
        question_text: string;
        options: string[];
        category: string | null;
        difficulty: string;
        source: { url: string; description: string } | null;
      }>;
      const question = qRows[0];
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 500 });
      }

      const now = Date.now();
      await sql`
        update games
        set current_question_index = ${nextIndex}, question_started_at = ${now}
        where id = ${game.id}::uuid
      `;

      const optionOrder = game.shuffled_option_orders[nextIndex];
      const shuffled = getShuffledQuestion(
        {
          questionText: question.question_text,
          options: question.options,
          category: question.category,
          difficulty: question.difficulty,
          source: question.source,
        },
        optionOrder
      );

      await pusher.trigger(`game-${game.game_code}`, 'new-question', {
        questionIndex: nextIndex,
        questionText: shuffled.questionText,
        options: shuffled.options as any,
        category: shuffled.category,
        difficulty: shuffled.difficulty,
        totalQuestions: game.question_ids.length,
        startedAt: now,
        timerDuration: timerSeconds,
      });

      return NextResponse.json({ finished: false, nextIndex });
    }

    // Default: reveal answer
    const qIdx = game.current_question_index;
    const correctAnswerIndex = game.shuffled_correct_answers[qIdx];

    // Populate the question for source info
    const questionId = game.question_ids[qIdx];
    const currentQuestionRows = (await sql`
      select source, fun_fact
      from questions
      where id = ${questionId}::uuid
      limit 1
    `) as Array<{ source: any; fun_fact: string | null }>;
    const currentQuestion = currentQuestionRows[0];

    // Get source and fun fact from the question
    const source = currentQuestion?.source ?? null;
    const funFact = currentQuestion?.fun_fact ?? null;

    // Build per-player results sorted by speed (fastest correct first, then incorrect)
    const playerRows = (await sql`
      select player_id::text as id, name, score, answers
      from game_players
      where game_id = ${game.id}::uuid
    `) as Array<{ id: string; name: string; score: number; answers: any }>;

    const playerResults: PlayerResult[] = playerRows.map((p) => {
      const answers: Array<{ questionIndex: number; timeToAnswer: number; correct: boolean }> =
        Array.isArray(p.answers) ? p.answers : [];
      const answer = answers.find((a) => a.questionIndex === qIdx);
      if (!answer) {
        return {
          id: p.id,
          name: p.name,
          correct: false,
          timeToAnswer: timerSeconds,
          pointsEarned: 0,
          totalScore: p.score,
        };
      }
      const timeRemaining = Math.max(0, timerSeconds - answer.timeToAnswer);
      const pointsEarned = answer.correct
        ? 1000 + Math.round((timeRemaining / timerSeconds) * 500)
        : 0;
      return {
        id: p.id,
        name: p.name,
        correct: answer.correct,
        timeToAnswer: answer.timeToAnswer,
        pointsEarned,
        totalScore: p.score,
      };
    });

    // Sort: correct answers first (by speed), then incorrect
    playerResults.sort((a, b) => {
      if (a.correct && !b.correct) return -1;
      if (!a.correct && b.correct) return 1;
      if (a.correct && b.correct) return a.timeToAnswer - b.timeToAnswer;
      return 0;
    });

    const sortedPlayers = [...playerRows]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    await pusher.trigger(`game-${game.game_code}`, 'answer-reveal', {
      questionIndex: qIdx,
      correctAnswerIndex,
      playerResults,
      players: sortedPlayers,
      source,
      funFact,
    });

    const isLastQuestion = game.current_question_index + 1 >= game.question_ids.length;
    return NextResponse.json({ revealed: true, isLastQuestion });
  } catch (error) {
    console.error('Next question error:', error);
    return NextResponse.json({ error: 'Failed to advance' }, { status: 500 });
  }
}
