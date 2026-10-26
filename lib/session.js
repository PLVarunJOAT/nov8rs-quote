/* Signed session token: proves the visitor came through the GHL form. */
import crypto from 'node:crypto';

const secret = () => process.env.SESSION_SECRET || process.env.GHL_TOKEN || 'preview-only-secret';
const b64 = s => Buffer.from(s).toString('base64url');
const sig = data => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function sign(payload, days = 7) {
  const data = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }));
  return `${data}.${sig(data)}`;
}

export function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [data, s] = token.split('.');
  const good = sig(data);
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

export function quoteId() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `Q-${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${rand}`;
}
