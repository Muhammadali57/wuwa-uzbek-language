const { getPool } = require('./_lib/db');
const {
  setCors,
  rejectOrigin,
  handleOptions,
  getClientIp,
  hashValue,
  getCountry,
  normalizeEmail
} = require('./_lib/http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 5;

module.exports = async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (handleOptions(req, res)) return;

  if (rejectOrigin(res, req.headers.origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  if (!body) {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  // Honeypot for simple bots. Legitimate clients never send this field.
  if (body.website) {
    return res.status(400).json({ ok: false, error: 'Invalid submission' });
  }

  const email = normalizeEmail(body.email);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address' });
  }

  try {
    const pool = getPool();
    const ipHash = hashValue(getClientIp(req));
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (RATE_WINDOW_MINUTES * 60 * 1000)) * (RATE_WINDOW_MINUTES * 60 * 1000)
    );

    // Rate-limit attempts independently from the supporter insert so duplicate
    // emails and rejected requests still count toward the abuse limit.
    const rateResult = await pool.query(
      `INSERT INTO rate_limit_buckets (bucket_key, window_start, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (bucket_key, window_start)
       DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
       RETURNING request_count`,
      [ipHash, windowStart]
    );

    if (rateResult.rows[0].request_count > MAX_REQUESTS_PER_WINDOW) {
      res.setHeader('Retry-After', String(RATE_WINDOW_MINUTES * 60));
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
    }

    // Keep the rate-limit table small over time.
    await pool.query(
      `DELETE FROM rate_limit_buckets WHERE window_start < NOW() - INTERVAL '2 hours'`
    );

    const country = getCountry(req, body.country);

    try {
      const result = await pool.query(
        `INSERT INTO supporters (email, email_normalized, country_code)
         VALUES ($1, $1, $2)
         RETURNING id, country_code, created_at`,
        [email, country]
      );

      const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM supporters');

      return res.status(201).json({
        ok: true,
        message: 'Support recorded successfully',
        supporter: {
          id: result.rows[0].id,
          country: result.rows[0].country_code,
          createdAt: result.rows[0].created_at
        },
        total: countResult.rows[0].total
      });
    } catch (error) {
      if (error && error.code === '23505') {
        return res.status(409).json({ ok: false, error: 'This email has already supported the campaign' });
      }
      throw error;
    }
  } catch (error) {
    console.error('vote failed', error);
    return res.status(500).json({ ok: false, error: 'Could not record your support' });
  }
};

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
