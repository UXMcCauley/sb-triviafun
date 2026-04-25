import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = (await sql`
      select
        p.id,
        p.slug,
        p.name,
        p.tagline,
        p.description,
        p.theme_color,
        p.icon,
        p.is_default,
        coalesce(count(pq.question_id), 0)::int as question_count
      from packs p
      left join pack_questions pq on pq.pack_id = p.id
      group by p.id
      order by p.created_at asc
    `) as Array<{
      id: string;
      slug: string;
      name: string;
      tagline: string;
      description: string;
      theme_color: string;
      icon: string;
      is_default: boolean;
      question_count: number;
    }>;

    const result = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      themeColor: p.theme_color,
      icon: p.icon,
      isDefault: p.is_default,
      questionCount: p.question_count,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get packs error:', error);
    return NextResponse.json({ error: 'Failed to get packs' }, { status: 500 });
  }
}
