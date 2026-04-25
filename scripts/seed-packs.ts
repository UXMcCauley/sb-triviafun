import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if DATABASE_URL not already set
if (!process.env.DATABASE_URL) {
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

interface PackFileQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  category?: string;
  difficulty: string;
  season?: number;
  episode?: string;
  source: { url: string; description: string };
  funFact?: string;
}

interface PackFile {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questions: PackFileQuestion[];
}

async function seed() {
  const { sql } = await import('../lib/db');
  const packsDir = path.join(__dirname, '..', 'data', 'packs');
  const packFiles = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${packFiles.length} pack files.`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const file of packFiles) {
    const raw = fs.readFileSync(path.join(packsDir, file), 'utf-8');
    const packData: PackFile = JSON.parse(raw);

    console.log(`\nProcessing pack: ${packData.name} (${packData.slug})`);

    // Upsert the pack
    const packRows = await sql`
      insert into packs (slug, name, tagline, description, theme_color, icon, is_default)
      values (${packData.slug}, ${packData.name}, ${packData.tagline}, ${packData.description}, ${packData.themeColor}, ${packData.icon}, ${packData.isDefault})
      on conflict (slug) do update set
        name = excluded.name,
        tagline = excluded.tagline,
        description = excluded.description,
        theme_color = excluded.theme_color,
        icon = excluded.icon,
        is_default = excluded.is_default
      returning id
    `;
    const packId = (packRows[0] as { id: string } | undefined)?.id;
    if (!packId) throw new Error(`Failed to upsert pack ${packData.slug}`);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const q of packData.questions) {
      try {
        const qRows = await sql`
          insert into questions (
            question_text,
            options,
            correct_answer_index,
            category,
            difficulty,
            season,
            episode,
            source,
            fun_fact
          ) values (
            ${q.questionText},
            ${JSON.stringify(q.options)}::jsonb,
            ${q.correctAnswerIndex},
            ${q.category ?? null},
            ${q.difficulty},
            ${q.season ?? null},
            ${q.episode ?? null},
            ${JSON.stringify(q.source)}::jsonb,
            ${q.funFact ?? null}
          )
          on conflict (question_text) do update set
            options = excluded.options,
            correct_answer_index = excluded.correct_answer_index,
            category = excluded.category,
            difficulty = excluded.difficulty,
            season = excluded.season,
            episode = excluded.episode,
            source = excluded.source,
            fun_fact = excluded.fun_fact
          returning id, (xmax = 0) as inserted
        `;

        const row = qRows[0] as { id: string; inserted: boolean } | undefined;
        if (!row?.id) throw new Error("Question upsert returned no id");
        if (row.inserted) created++;
        else updated++;

        await sql`
          insert into pack_questions (pack_id, question_id)
          values (${packId}, ${row.id})
          on conflict do nothing
        `;
      } catch (err: unknown) {
        errors++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  Error upserting "${q.questionText.slice(0, 50)}...": ${message}`);
      }
    }

    console.log(`  Questions - Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
    totalCreated += created;
    totalUpdated += updated;
    totalErrors += errors;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total questions created: ${totalCreated}`);
  console.log(`Total questions updated: ${totalUpdated}`);
  console.log(`Total errors: ${totalErrors}`);

  const [{ count: qCount }] = (await sql`select count(*)::int as count from questions`) as Array<{ count: number }>;
  const [{ count: pCount }] = (await sql`select count(*)::int as count from packs`) as Array<{ count: number }>;
  console.log(`Total questions in DB: ${qCount}`);
  console.log(`Total packs in DB: ${pCount}`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
