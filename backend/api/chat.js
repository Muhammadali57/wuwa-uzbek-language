const { getPool } = require('./_lib/db');
const { setCors, rejectOrigin, handleOptions, getClientIp, hashValue, getCountry } = require('./_lib/http');

const WINDOW_MINUTES = 10;
const MAX_MESSAGES = 30;
const MAX_MESSAGES_PER_PAGE = 50;
let initPromise;

async function ensureTable(pool) {
  if (!initPromise) {
    initPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        nickname VARCHAR(32) NOT NULL,
        message VARCHAR(500) NOT NULL,
        country_code CHAR(2) NOT NULL DEFAULT 'XX',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at DESC);
    `).catch(error => { initPromise = null; throw error; });
  }
  return initPromise;
}

module.exports = async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (handleOptions(req, res)) return;
  if (rejectOrigin(res, req.headers.origin)) return res.status(403).json({ ok: false, error: 'Origin not allowed' });

  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const pool = getPool();
    await ensureTable(pool);

    if (req.method === 'GET') {
      const result = await pool.query(`
        SELECT id, nickname, message, country_code AS country, created_at AS "createdAt"
        FROM chat_messages
        ORDER BY id DESC
        LIMIT $1
      `, [MAX_MESSAGES_PER_PAGE]);
      return res.status(200).json({ ok: true, messages: result.rows.reverse() });
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
    if (!body) return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    if (body.website) return res.status(400).json({ ok: false, error: 'Invalid submission' });

    const nickname = cleanText(body.nickname, 32) || 'Anonymous Rover';
    const message = cleanText(body.message, 500);
    if (message.length < 1) return res.status(400).json({ ok: false, error: 'Message cannot be empty' });

    const ipHash = hashValue(`chat:${getClientIp(req)}`);
    const now = new Date();
    const windowStart = new Date(Math.floor(now.getTime() / (WINDOW_MINUTES * 60 * 1000)) * (WINDOW_MINUTES * 60 * 1000));
    const rate = await pool.query(`
      INSERT INTO rate_limit_buckets (bucket_key, window_start, request_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (bucket_key, window_start)
      DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
      RETURNING request_count
    `, [ipHash, windowStart]);

    if (rate.rows[0].request_count > MAX_MESSAGES) {
      res.setHeader('Retry-After', String(WINDOW_MINUTES * 60));
      return res.status(429).json({ ok: false, error: 'Too many messages. Please try again later.' });
    }

    const country = getCountry(req, body.country);
    const result = await pool.query(`
      INSERT INTO chat_messages (nickname, message, country_code)
      VALUES ($1, $2, $3)
      RETURNING id, nickname, message, country_code AS country, created_at AS "createdAt"
    `, [nickname, message, country]);

    await pool.query(`DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY id DESC LIMIT 1000)`);
    return res.status(201).json({ ok: true, message: result.rows[0] });
  } catch (error) {
    console.error('chat failed', error);
    return res.status(500).json({ ok: false, error: 'Chat service unavailable' });
  }
};

function cleanText(value, max) {
  return String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function safeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}
