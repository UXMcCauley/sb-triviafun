import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ReportModel } from '@/lib/models/report';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { questionText, options, correctAnswerIndex, reportedBy, gameCode, reason } = await request.json();

    if (!questionText || !reportedBy || !gameCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await ReportModel.create({
      questionText,
      options,
      correctAnswerIndex,
      reportedBy,
      gameCode,
      reason: reason || 'Incorrect answer marked as correct',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to report' }, { status: 500 });
  }
}
