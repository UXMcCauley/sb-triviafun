import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { PlayerStatsModel } from '@/lib/models/playerStats';

// GET — fetch stats by phone
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.replace(/\D/g, '');

    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const stats = await PlayerStatsModel.findOne({ phone });
    if (!stats) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({
      phone: stats.phone,
      displayName: stats.displayName,
      gamesPlayed: stats.gamesPlayed,
      gamesWon: stats.gamesWon,
      totalScore: stats.totalScore,
      bestScore: stats.bestScore,
      correctAnswers: stats.correctAnswers,
      totalAnswers: stats.totalAnswers,
      winRate: stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

// POST — record game results
export async function POST(request: Request) {
  try {
    await connectDB();
    const { phone, score, correctAnswers, totalAnswers, won } = await request.json();

    const normalizedPhone = phone?.replace(/\D/g, '');
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      $inc: {
        gamesPlayed: 1,
        totalScore: score || 0,
        correctAnswers: correctAnswers || 0,
        totalAnswers: totalAnswers || 0,
        ...(won ? { gamesWon: 1 } : {}),
      },
      $set: { lastPlayedAt: new Date() },
    };

    // Update best score if this one is higher
    const stats = await PlayerStatsModel.findOne({ phone: normalizedPhone });
    if (stats && score > stats.bestScore) {
      (update.$set as Record<string, unknown>).bestScore = score;
    } else if (!stats) {
      return NextResponse.json({ error: 'Player not registered' }, { status: 404 });
    }

    await PlayerStatsModel.findOneAndUpdate({ phone: normalizedPhone }, update);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Record stats error:', error);
    return NextResponse.json({ error: 'Failed to record stats' }, { status: 500 });
  }
}
