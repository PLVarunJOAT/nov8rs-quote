/* POST /api/quote  { token, answers }  →  priced quote. Prices never leave the server any other way. */
import { verify, readBody } from '../lib/session.js';
import { publicQuote } from '../lib/pricing.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { token, answers } = readBody(req);
  if (!verify(token)) return res.status(401).json({ ok: false, reason: 'session' });
  return res.json({ ok: true, quote: publicQuote(answers) });
}
