import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local for tsx scripts (same pattern as init-db)
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

async function main() {
  const { sql } = await import('../lib/db');
  const rows = (await sql`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('users', 'player_stats', 'reactions')
    order by table_name, ordinal_position
  `) as Array<{ table_name: string; column_name: string; data_type: string }>;

  // eslint-disable-next-line no-console
  console.table(rows);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

