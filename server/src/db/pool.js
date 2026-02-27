import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://songbook:songbook@localhost:5450/songbook',
});

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, 'migrations');
    let files;
    try {
      files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    } catch {
      console.log('No migrations directory found, skipping');
      return;
    }

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (rows.length > 0) continue;

      console.log(`Running migration: ${file}`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    }
  } finally {
    client.release();
  }
}
