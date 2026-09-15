const { getPool } = require('./_lib/db');
const { setCors, rejectOrigin, handleOptions } = require('./_lib/http');

module.exports = async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (rejectOrigin(res, req.headers.origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return res.status(200).json({ ok: true, service: 'wuwa-uzbek-language-api' });
  } catch (error) {
    console.error('health check failed', error);
    return res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
};
