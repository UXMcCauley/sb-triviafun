import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { GameModel } from '@/lib/models/game';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { gameCode, playerId, questionIndex, selectedAnswer } = await request.json();

    const game = await GameModel.findOne({ gameCode: gameCode.toUpperCase() });
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    if (questionIndex !== game.currentQuestionIndex) {
      return NextResponse.json({ error: 'Wrong question' }, { status: 400 });
    }

    const player = game.players.find((p: { id: string }) => p.id === playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if already answered
    const alreadyAnswered = player.answers.some(
      (a: { questionIndex: number }) => a.questionIndex === questionIndex
    );
    if (alreadyAnswered) {
      return NextResponse.json({ error: 'Already answered' }, { status: 400 });
    }

    // Calculate time and score
    const now = Date.now();
    const timerSeconds = game.settings.timerSeconds;
    const timeToAnswer = game.questionStartedAt
      ? (now - game.questionStartedAt) / 1000
      : timerSeconds;

    // Check if within time limit
    if (timeToAnswer > timerSeconds + 1) {
      return NextResponse.json({ error: 'Time expired' }, { status: 400 });
    }

    // Use shuffled correct answer from the game's parallel array
    const correctAnswerIndex = game.shuffledCorrectAnswers[questionIndex];
    const correct = selectedAnswer === correctAnswerIndex;

    // Score: 1000 base + up to 500 speed bonus
    let points = 0;
    if (correct) {
      const timeRemaining = Math.max(0, timerSeconds - timeToAnswer);
      points = 1000 + Math.round((timeRemaining / timerSeconds) * 500);
    }

    player.answers.push({
      questionIndex,
      selectedAnswer,
      timeToAnswer: Math.round(timeToAnswer * 10) / 10,
      correct,
    });
    player.score += points;

    await game.save();

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
