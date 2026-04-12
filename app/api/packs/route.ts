import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { PackModel } from '@/lib/models/pack';

export async function GET() {
  try {
    await connectDB();

    const packs = await PackModel.find().select(
      'slug name tagline description themeColor icon isDefault questions'
    );

    const result = packs.map((p) => ({
      id: p._id.toString(),
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      themeColor: p.themeColor,
      icon: p.icon,
      isDefault: p.isDefault,
      questionCount: p.questions.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get packs error:', error);
    return NextResponse.json({ error: 'Failed to get packs' }, { status: 500 });
  }
}
