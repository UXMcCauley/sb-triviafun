import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  // Lightweight .env.local loader (mirrors seed-packs.ts)
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      value = value.replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: Set DATABASE_URL environment variable');
  process.exit(1);
}

async function seed() {
  const { sql } = await import('../lib/db');
  const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
  const raw = fs.readFileSync(questionsPath, 'utf-8');
  const questions = JSON.parse(raw);

  console.log(`Found ${questions.length} questions in seed file.`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      const rows = await sql`
        insert into questions (
          question_text,
          options,
          correct_answer_index,
          category,
          difficulty,
          season,
          episode,
          fun_fact,
          source
        ) values (
          ${q.questionText},
          ${JSON.stringify(q.options)}::jsonb,
          ${q.correctAnswerIndex},
          ${q.category ?? null},
          ${q.difficulty},
          ${q.season ?? null},
          ${q.episode ?? null},
          ${q.funFact ?? null},
          ${JSON.stringify(q.source)}::jsonb
        )
        on conflict (question_text) do update set
          options = excluded.options,
          correct_answer_index = excluded.correct_answer_index,
          category = excluded.category,
          difficulty = excluded.difficulty,
          season = excluded.season,
          episode = excluded.episode,
          fun_fact = excluded.fun_fact,
          source = excluded.source
        returning (xmax = 0) as inserted
      `;
      const inserted = Boolean((rows[0] as { inserted?: boolean } | undefined)?.inserted);
      if (inserted) created++;
      else updated++;
    } catch (err: unknown) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error upserting "${q.questionText.slice(0, 50)}...": ${message}`);
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
  const [{ count }] = (await sql`select count(*)::int as count from questions`) as Array<{ count: number }>;
  console.log(`Total questions in DB: ${count}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
