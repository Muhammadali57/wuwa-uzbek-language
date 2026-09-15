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
    const [totalResult, countryResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM supporters'),
      pool.query(`
        SELECT country_code AS country, COUNT(*)::int AS count
        FROM supporters
        GROUP BY country_code
        ORDER BY count DESC, country_code ASC
      `)
    ]);

    return res.status(200).json({
      ok: true,
      total: totalResult.rows[0].total,
      countries: countryResult.rows
    });
  } catch (error) {
    console.error('stats failed', error);
    return res.status(500).json({ ok: false, error: 'Could not load campaign statistics' });
  }
};
