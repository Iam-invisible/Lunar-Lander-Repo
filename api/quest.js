import pg from 'pg';
import { questHandoff } from '../web/worker/quest.mjs';
import { sessionStore } from '../web/worker/postgres-sessions.mjs';

const existingQuestOrigin = 'https://moon.shailmp2009.chatgpt.site';
let store;

export default {
  async fetch(request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return new Response(null, { status: 403 });

    const action = url.pathname === '/api/quest'
      ? url.searchParams.get('action')
      : /^\/api\/quest\/([a-z-]+)$/.exec(url.pathname)?.[1];
    if (!action || !/^[a-z-]+$/.test(action)) return new Response(null, { status: 404 });
    const path = '/api/quest/' + action;
    if (process.env.DATABASE_URL) {
      store ??= sessionStore(new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 }));
      return questHandoff(new Request(new URL(path, url), request), store);
    }

    // Reuse the original shared rooms until this deployment has its own database.
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const auth = request.headers.get('authorization');
    if (auth) headers.set('Authorization', auth);
    const result = await fetch(new URL(path, existingQuestOrigin), {
      method: 'POST', headers, body: await request.arrayBuffer(), redirect: 'error', signal: request.signal,
    });
    return new Response(result.body, { status: result.status, headers: {
      'Content-Type': result.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    } });
  },
};
