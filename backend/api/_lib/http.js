const crypto = require('node:crypto');

function getAllowedOrigin() {
  return process.env.FRONTEND_ORIGIN || '*';
}

function setCors(res, requestOrigin) {
  const allowed = getAllowedOrigin();
  const origin = allowed === '*' ? '*' : requestOrigin === allowed ? allowed : '';
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function rejectOrigin(res, requestOrigin) {
  const allowed = getAllowedOrigin();
  return allowed !== '*' && requestOrigin && requestOrigin !== allowed;
}

function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  res.status(204).end();
  return true;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function hashValue(value) {
  const salt = process.env.RATE_LIMIT_SALT || 'development-salt';
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function getCountry(req, bodyCountry) {
  // A deliberate manual selection wins over IP detection. This lets users
  // correct VPN/proxy geolocation while still providing an automatic default.
  const manual = String(bodyCountry || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(manual)) return manual;
  const detected = String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || 'XX').toUpperCase();
  return /^[A-Z]{2}$/.test(detected) ? detected : 'XX';
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

module.exports = {
  setCors,
  rejectOrigin,
  handleOptions,
  getClientIp,
  hashValue,
  getCountry,
  normalizeEmail
};
