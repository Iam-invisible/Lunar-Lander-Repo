import pg from 'pg';

if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('craterview_sessions'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS craterview_sessions (
        key text PRIMARY KEY, body text NOT NULL, etag text NOT NULL, metadata jsonb
      )
    `);
    await client.query('COMMIT');
  } finally {
    await client.end();
  }
}
