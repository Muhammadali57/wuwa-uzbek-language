const { setCors, rejectOrigin, handleOptions, getClientIp } = require('./_lib/http');

module.exports = async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (handleOptions(req, res)) return;
  if (rejectOrigin(res, req.headers.origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const country = String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'XX').toUpperCase();
  const valid = /^[A-Z]{2}$/.test(country) ? country : 'XX';
  return res.status(200).json({ ok: true, country: valid, detected: valid !== 'XX' });
};
