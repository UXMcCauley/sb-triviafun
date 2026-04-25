import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth/session';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function isImage(mime: string) {
  return mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp';
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  if (!isImage(file.type)) {
    return NextResponse.json({ error: 'Only PNG/JPEG/WEBP allowed' }, { status: 400 });
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Max file size is 2MB' }, { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const outPath = path.join(UPLOAD_DIR, filename);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(outPath, Buffer.from(arrayBuffer));

  const avatarUrl = `/uploads/${filename}`;
  const rows = (await sql`
    update users
    set avatar_url = ${avatarUrl},
        updated_at = now()
    where id = ${userId}::uuid
    returning id::text as id, default_username, avatar_url, email
  `) as Array<{ id: string; default_username: string | null; avatar_url: string | null; email: string | null }>;

  const user = rows[0];
  return NextResponse.json({
    user: user
      ? { id: user.id, defaultUsername: user.default_username, avatarUrl: user.avatar_url, email: user.email }
      : null,
  });
}

