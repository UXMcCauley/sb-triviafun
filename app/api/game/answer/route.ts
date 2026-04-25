import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { gameCode, playerId, questionIndex, selectedAnswer } = await request.json();

    const upperCode = gameCode.toUpperCase();
    const gameRows = (await sql`
      select
        id,
        status,
        current_question_index,
        question_started_at,
        settings,
        shuffled_correct_answers
      from games
      where game_code = ${upperCode}
      limit 1
    `) as Array<{
      id: string;
      status: string;
      current_question_index: number;
      question_started_at: number | null;
      settings: { timerSeconds?: number } | null;
      shuffled_correct_answers: number[] | null;
    }>;
    const game = gameRows[0];
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    if (questionIndex !== game.current_question_index) {
      return NextResponse.json({ error: 'Wrong question' }, { status: 400 });
    }

    const playerRows = (await sql`
      select player_id::text as id, score, answers
      from game_players
      where game_id = ${game.id}::uuid and player_id = ${playerId}::uuid
      limit 1
    `) as Array<{ id: string; score: number; answers: unknown }>;
    const player = playerRows[0];
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if already answered
    const existingAnswers: Array<{ questionIndex: number }> = Array.isArray(player.answers)
      ? player.answers
      : [];
    const alreadyAnswered = existingAnswers.some((a) => a.questionIndex === questionIndex);
    if (alreadyAnswered) {
      return NextResponse.json({ error: 'Already answered' }, { status: 400 });
    }

    // Calculate time and score
    const now = Date.now();
    const timerSeconds = game.settings?.timerSeconds ?? 15;
    const timeToAnswer = game.question_started_at
      ? (now - game.question_started_at) / 1000
      : timerSeconds;

    // Check if within time limit
    if (timeToAnswer > timerSeconds + 1) {
      return NextResponse.json({ error: 'Time expired' }, { status: 400 });
    }

    // Use shuffled correct answer from the game's parallel array
    const correctAnswerIndex = (game.shuffled_correct_answers ?? [])[questionIndex];
    const correct = selectedAnswer === correctAnswerIndex;

    // Score: 1000 base + up to 500 speed bonus
    let points = 0;
    if (correct) {
      const timeRemaining = Math.max(0, timerSeconds - timeToAnswer);
      points = 1000 + Math.round((timeRemaining / timerSeconds) * 500);
    }

    const newAnswer = {
      questionIndex,
      selectedAnswer,
      timeToAnswer: Math.round(timeToAnswer * 10) / 10,
      correct,
    };

    const updatedAnswers = [...existingAnswers, newAnswer];
    await sql`
      update game_players
      set answers = ${JSON.stringify(updatedAnswers)}::jsonb,
          score = score + ${points}
      where game_id = ${game.id}::uuid and player_id = ${playerId}::uuid
    `;

    // Don't reveal correct answer yet — just confirm receipt
    return NextResponse.json({
      received: true,
      playerId,
      questionIndex,
    });
  } catch (error) {
    console.error('Answer error:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
