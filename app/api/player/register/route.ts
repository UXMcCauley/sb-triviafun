import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { PlayerStatsModel } from '@/lib/models/playerStats';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { phone, displayName } = await request.json();

    if (!phone || !displayName) {
      return NextResponse.json({ error: 'Phone and name required' }, { status: 400 });
    }

    // Normalize phone (strip non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Upsert — create or update display name
    const stats = await PlayerStatsModel.findOneAndUpdate(
      { phone: normalizedPhone },
      { $set: { displayName }, $setOnInsert: { phone: normalizedPhone } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      phone: stats.phone,
      displayName: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      totalScore: stats.totalScore,
      bestScore: stats.bestScore,
      correctAnswers: stats.correctAnswers,
      totalAnswers: stats.totalAnswers,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
