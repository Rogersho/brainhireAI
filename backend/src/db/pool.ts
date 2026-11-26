import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env.js';

const requiresSsl =
  env.databaseUrl.includes('sslmode=require') ||
  env.databaseUrl.includes('neon.tech') ||
  env.isProd;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected idle client error:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function checkDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
