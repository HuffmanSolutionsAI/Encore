// Minimal migration runner. Applies every *.sql file under api/migrations/
// in lexicographic order, tracking applied versions in a `_migrations` table
// so the script is safe to re-run.
//
// Run via `npm run migrate` (loads .env via dotenv-cli).

import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Pool } from "pg";

const MIGRATIONS_DIR = resolve(__dirname, "..", "migrations");

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL not set — see api/.env.example");
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();

  try {
    await client.query(`
      create table if not exists _migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set<string>(
      (await client.query<{ name: string }>("select name from _migrations")).rows.map(
        (r) => r.name,
      ),
    );

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`✓ ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`→ ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into _migrations (name) values ($1)", [file]);
        await client.query("commit");
        ran++;
      } catch (err) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    console.log(
      ran === 0 ? "Nothing to apply." : `Applied ${ran} migration${ran === 1 ? "" : "s"}.`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
