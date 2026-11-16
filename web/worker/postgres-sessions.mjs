// Implements the conditional operations used by questHandoff against a pooled PostgreSQL database.
import { randomUUID } from 'node:crypto';

export function sessionStore(pool) {
  const query = (sql, args) => pool.query(sql, args);

  return {
    async get(key) {
      const { rows: [row] } = await query('SELECT body, etag FROM craterview_sessions WHERE key = $1', [key]);
      return row && { etag: row.etag, json: () => JSON.parse(row.body) };
    },
    async put(key, body, { onlyIf, customMetadata } = {}) {
      const etag = randomUUID();
      const args = [key, body, etag, customMetadata ?? null];
      let result;
      if (onlyIf?.etagMatches) {
        result = await query('UPDATE craterview_sessions SET body=$2, etag=$3, metadata=$4 WHERE key=$1 AND etag=$5',
          [...args, onlyIf.etagMatches]);
      } else {
        const conflict = onlyIf?.etagDoesNotMatch === '*' ? 'DO NOTHING' :
          'DO UPDATE SET body=EXCLUDED.body, etag=EXCLUDED.etag, metadata=EXCLUDED.metadata';
        result = await query('INSERT INTO craterview_sessions (key,body,etag,metadata) VALUES ($1,$2,$3,$4) ON CONFLICT (key) ' + conflict, args);
      }
      return result.rowCount ? { etag } : null;
    },
    async list({ prefix, limit, cursor = '' }) {
      const { rows } = await query(`
        SELECT key, etag, metadata AS "customMetadata" FROM craterview_sessions
        WHERE starts_with(key, $1) AND key > $2 ORDER BY key LIMIT $3
      `, [prefix, cursor, limit + 1]);
      const objects = rows.slice(0, limit);
      return { objects, truncated: rows.length > limit, cursor: objects.at(-1)?.key };
    },
    async delete(keys) {
      await query('DELETE FROM craterview_sessions WHERE key = ANY($1::text[])', [Array.isArray(keys) ? keys : [keys]]);
    },
  };
}
