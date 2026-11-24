import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[DB] Applying PostgreSQL schema...');
  await pool.query(sql);
  console.log('[DB] Schema applied successfully.');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[DB] Migration failed:', err);
    process.exit(1);
  });
