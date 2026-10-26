/* POST /api/session  { email }
   Checks the visitor exists in GHL (they came through the pop-up form) and returns a signed token. */
import { sign, readBody } from '../lib/session.js';
import { ghlReady, findContactByEmail } from '../lib/ghl.js';

const config = () => ({
  calendarUrl: process.env.BRETT_CALENDAR_URL || '',
  siteUrl: process.env.SITE_URL || 'https://nov8rs.io'
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const { email } = readBody(req);
  const e = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e) || e.length > 200) return res.status(400).json({ ok: false, reason: 'email', config: config() });

  if (!ghlReady()) {
    // Preview mode: GHL keys not added yet. Lets you test the builder right after deploying.
    return res.json({ ok: true, preview: true, token: sign({ cid: null, email: e }), contact: {}, config: config() });
  }
  try {
    const c = await findContactByEmail(e);
    if (!c) return res.status(404).json({ ok: false, reason: 'not_found', config: config() });
    return res.json({
      ok: true, preview: false,
      token: sign({ cid: c.id, email: e, name: [c.firstName, c.lastName].filter(Boolean).join(' ') }),
      contact: { firstName: c.firstName || '', company: c.companyName || '' },
      config: config()
    });
  } catch (err) {
    console.error('session', err.message, JSON.stringify(err.body || {}));
    return res.status(502).json({ ok: false, reason: 'ghl', config: config() });
  }
}
