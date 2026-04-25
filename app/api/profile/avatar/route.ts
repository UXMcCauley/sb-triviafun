import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

export const runtime = 'nodejs';

type UserUpdateInput = { name?: string; image?: string };
type UpdateResult = { data?: { user?: { id: string; email?: string | null; name?: string | null; image?: string | null } } };

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function isImage(mime: string) {
  return mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/webp';
}

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const result = (await auth.updateUser({
    image: avatarUrl,
  } as UserUpdateInput)) as unknown as UpdateResult;

  const user = result?.data?.user || session.user;
  return NextResponse.json({
    user: user
      ? { id: user.id, email: user.email ?? null, name: user.name ?? null, image: (user as { image?: string | null }).image ?? null }
      : null,
  });
}

