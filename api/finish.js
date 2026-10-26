/* POST /api/finish  { token, answers, action: 'built' | 'call', quoteId?, offerShown?, offerTaken? }
   built → saves the quote to the GHL contact as a note, tags it and moves the opportunity to "Quote built".
   call  → tags the contact "wants-call" (Brett's calendar booking takes it from there). */
import { verify, readBody, quoteId as newId } from '../lib/session.js';
import { build, fmt } from '../lib/pricing.js';
import { CATALOG, RULES } from '../lib/catalog.js';
import { ghlReady, addNote, addTags, upsertOpportunity } from '../lib/ghl.js';
import { CARDS, CONTROLS } from '../public/flow.js';

function answerText(a) {
  const picked = `Services: ${(a.picks || []).map(id => CARDS.find(c => c.id === id)?.title || id).join(', ')}`;
  return [picked, ...Object.entries(a).map(([k, v]) => {
    const q = CONTROLS[k]; if (!q) return null;
    const label = x => (q.opts || []).find(o => o.v === x)?.l || x;
    const val = v === true ? 'Yes' : Array.isArray(v) ? v.map(label).join(', ') : label(v);
    return `${q.label}: ${val}`;
  })].filter(Boolean).join('\n');
}

function noteText(id, r, extra) {
  const lines = r.lines.map(l => {
    if (l.included) return `• ${l.name}: included (${l.included})`;
    const p = l.contact ? 'contact for rates'
      : [l.once ? (l.from ? 'from ' : '') + fmt(l.once) + ' one-time' : '', l.mo ? fmt(l.mo) + '/mo' : ''].filter(Boolean).join(' + ') || 'priced after review';
    return `• ${l.name}: ${p}${l.m2 ? ' (starts month 2)' : ''}${l.review ? ' [NEEDS REVIEW]' : ''}`;
  });
  if (r.adjOnce || r.adjMo) lines.push(`• Rounding: ${[r.adjOnce ? fmt(r.adjOnce) + ' one-time' : '', r.adjMo ? fmt(r.adjMo) + '/mo' : ''].filter(Boolean).join(' + ')}`);
  return [
    `QUOTE ${id} · ${r.reviewCount ? 'NEEDS REVIEW' : 'READY'}`,
    `One-time: ${fmt(r.once)}${r.hasFrom ? ' (includes starting prices)' : ''} · Monthly: ${fmt(r.mo)}`,
    ...(r.pack ? [`On ${CATALOG[r.pack].name}, saving ${fmt(r.packSave)}/mo`] : []),
    ...(extra ? [extra] : []),
    '', ...lines, '', 'ANSWERS', answerText(r.answers)
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const b = readBody(req);
  const s = verify(b.token);
  if (!s) return res.status(401).json({ ok: false, reason: 'session' });

  const id = /^Q-\d{6}-[A-F0-9]{6}$/.test(b.quoteId || '') ? b.quoteId : newId();
  const valid = sku => (sku && CATALOG[sku] ? sku : '');
  const offerShown = valid(b.offerShown), offerTaken = valid(b.offerTaken);
  const r = build(b.answers);

  if (!ghlReady() || !s.cid) return res.json({ ok: true, quoteId: id, saved: false, preview: true });

  try {
    if (b.action === 'call') {
      await addTags(s.cid, ['wants-call']);
    } else {
      const extra = [offerShown ? `Pack offer shown: ${CATALOG[offerShown].name}` : '',
        offerTaken ? `Pack offer accepted: ${CATALOG[offerTaken].name}` : ''].filter(Boolean).join(' · ');
      await addNote(s.cid, noteText(id, r, extra));
      await addTags(s.cid, [
        'quote-built', r.reviewCount ? 'quote-needs-review' : 'quote-ready',
        r.pack ? 'on-pack' : '', offerShown ? 'pack-offer-shown' : '', offerTaken ? 'pack-offer-accepted' : ''
      ]);
      if (process.env.GHL_PIPELINE_ID && process.env.GHL_STAGE_QUOTE_BUILT) {
        await upsertOpportunity({
          contactId: s.cid, pipelineId: process.env.GHL_PIPELINE_ID, pipelineStageId: process.env.GHL_STAGE_QUOTE_BUILT,
          name: `Quote ${id}${s.name ? ' · ' + s.name : ''}`,
          monetaryValue: Math.round(r.once + r.mo * RULES.opportunityMonths)
        });
      }
    }
    return res.json({ ok: true, quoteId: id, saved: true });
  } catch (err) {
    console.error('finish', err.message, JSON.stringify(err.body || {}));
    return res.json({ ok: true, quoteId: id, saved: false });
  }
}
