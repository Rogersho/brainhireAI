import app from './app.js';
import { env } from './config/env.js';
import { checkDbConnection } from './db/pool.js';

async function start() {
  try {
    await checkDbConnection();
    console.log('[DB] PostgreSQL connected successfully.');
  } catch (err) {
    console.error('[DB] Warning: Could not connect to PostgreSQL on startup:', (err as Error).message);
    console.error('[DB] Make sure PostgreSQL is running and DATABASE_URL is configured in backend/.env');
  }

  app.listen(env.port, () => {
    console.log(`[Server] Brainhire AI Backend listening on http://localhost:${env.port}`);
  });
}

start();
