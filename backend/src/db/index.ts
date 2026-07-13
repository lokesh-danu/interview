import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/workspace',
});

export const db = drizzle(pool, { schema });

// Export pool for raw queries if needed
export { pool };

// Helper to close connections
export async function closeDb() {
  await pool.end();
}
