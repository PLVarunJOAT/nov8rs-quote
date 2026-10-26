/* nov8rs quote builder · the choices on the page
   Shared by the browser (to draw the page) and the server (to drop anything invalid or hidden).
   Only choices that change the price are asked. No prices live in this file (see lib/catalog.js). */

export const has = (a, v) => Array.isArray(a) && a.includes(v);
export const isAny = (x, arr) => arr.includes(x);
export const on = (a, id) => has(a.picks, id);
export const pkgOn = a => on(a, 'ai') && isAny(a.infra_pkg, ['std', 'sf']);
export const adsOngoing = a => on(a, 'ads') && isAny(a.ads_mode, ['launch', 'manage']);
export const needsCrm = a => on(a, 'ai') || (on(a, 'web') && a.web_kind === 'ess');

/* One card per service. Tapping a card turns it on and opens its options (pre-filled with sensible defaults). */
export const CARDS = [
  { id: 'web', title: 'Website', desc: 'A new site or a rebuild of the one you have', controls: [
    { id: 'web_kind', type: 'seg', label: 'Type', def: 'ai', opts: [
      { v: 'ai', l: 'Fast AI site', d: 'Template-based, mobile ready, basic SEO, contact form. 1 page included.' },
      { v: 'ess', l: 'Site + CRM system', d: 'AI site with 7 pages included, plus the CRM and essential add-ons.' },
      { v: 'custom', l: 'Fully custom', d: 'Custom layout and design with full AI and CRM integration. Scoped with you on a call.' } ] },
    { id: 'web_pages', type: 'stepper', label: 'Pages', def: 5, min: 1, max: 30, show: a => isAny(a.web_kind, ['ai', 'ess']) } ] },

  { id: 'kit', title: 'Brand identity kit', desc: 'Logo, business card, letterhead, social headers, templates and brand guidelines', controls: [] },

  { id: 'ads', title: 'Paid ads', desc: 'Google, Meta, YouTube, TikTok, LinkedIn and more', controls: [
    { id: 'ads_mode', type: 'seg', label: 'What you need', def: 'launch', opts: [
      { v: 'launch', l: 'Launch new', d: 'Setup, creative pack and the first month of management, then monthly management.' },
      { v: 'manage', l: 'Manage existing', d: 'Weekly optimization, A/B testing and a monthly report.' },
      { v: 'build', l: 'Build only', d: 'An AI-built campaign with no ongoing management.' } ] },
    { id: 'ads_platforms', type: 'chips', label: 'Platforms', def: ['google'], req: true, show: a => isAny(a.ads_mode, ['launch', 'manage']),
      help: 'Each platform runs as its own campaign.', opts: [
      { v: 'google', l: 'Google' }, { v: 'meta', l: 'Facebook & Instagram' }, { v: 'youtube', l: 'YouTube' },
      { v: 'tiktok', l: 'TikTok' }, { v: 'linkedin', l: 'LinkedIn' }, { v: 'bing', l: 'Microsoft / Bing' } ] },
    { id: 'ads_funnel', type: 'toggle', label: 'Add a landing page and follow-up sequence' } ] },

  { id: 'seo', title: 'GAS-EO', desc: 'Get found on Google, in answer boxes and in AI tools like ChatGPT', controls: [
    { id: 'seo_scope', type: 'seg', label: 'Your customers', def: 'local', opts: [
      { v: 'local', l: 'One location' }, { v: 'multi', l: 'Several locations' },
      { v: 'national', l: 'Regional / national' }, { v: 'ecom', l: 'Online store' } ] } ] },

  { id: 'social', title: 'Social media management', desc: '12–16 posts a month with a content calendar, captions and scheduling', controls: [
    { id: 'so_more', type: 'toggle', label: 'I need more than 16 posts a month' } ] },

  { id: 'cold', title: 'Cold email outreach', desc: 'Done-for-you outbound email: infrastructure, setup, launch and management', controls: [
    { id: 'ce_build', type: 'toggle', label: 'Build me a list of prospects too' } ] },

  { id: 'ai', title: 'AI & automation', desc: 'AI receptionist, sales bots, callbots, CRM and automations', controls: [
    { id: 'infra_pkg', type: 'seg', label: 'Start with', def: 'std', opts: [
      { v: 'std', l: 'AI Storefront', d: 'Website, AI receptionist, AI sales bot, CRM and add-ons in one system.' },
      { v: 'sf', l: 'AI Salesforce', d: 'Everything in AI Storefront plus outbound AI callbots and the full sales bot suite.' },
      { v: 'pick', l: 'Pick tools', d: 'Choose individual AI tools.' } ] },
    { id: 'ai_tools', type: 'chips', label: 'Tools', req: true, show: a => a.infra_pkg === 'pick', opts: [
      { v: 'rec', l: 'Answer calls 24/7' }, { v: 'sbi', l: 'Follow up new leads' }, { v: 'sbo', l: 'Call leads back' },
      { v: 'sup', l: 'Customer support bot' }, { v: 'call', l: 'Outbound call campaigns' } ] },
    { id: 'ai_support', type: 'toggle', label: 'Add an AI support bot', show: a => isAny(a.infra_pkg, ['std', 'sf']) } ] },

  { id: 'va', title: 'Creative & marketing talent', desc: 'On-demand designers, editors, writers and specialists. Rates confirmed on a call.', controls: [
    { id: 'va_roles', type: 'chips', label: 'Roles', req: true, opts: [
      { v: 'design', l: 'Graphic Designer' }, { v: 'video', l: 'Video Editor' }, { v: 'writer', l: 'Content Writer' },
      { v: 'smm', l: 'Social Media Manager' }, { v: 'ppc', l: 'PPC Specialist' }, { v: 'email', l: 'Email Marketing' },
      { v: 'leadgen', l: 'Lead Generation' }, { v: 'wp', l: 'WordPress Developer' }, { v: 'fullstack', l: 'Full Stack Developer' },
      { v: 'auto', l: 'Automation / AI Specialist' }, { v: 'assist', l: 'Marketing Assistant' } ] } ] },

  { id: 'custom', title: 'Something else', desc: 'Tell us what you need and we’ll price it with you', controls: [
    { id: 'custom_text', type: 'text', label: 'What do you need?', req: true, ph: 'Example: packaging design for 3 products' } ] }
];

/* Asked under the cards, only when relevant. */
export const EXTRAS = [
  { id: 'crm_now', type: 'seg', label: 'Do you already use a CRM?', req: true, show: needsCrm, opts: [
    { v: 'pl', l: 'Profit Lifter CRM' }, { v: 'none', l: 'No CRM' }, { v: 'other', l: 'Another CRM' } ] },
  { id: 'notes', type: 'textarea', label: 'Anything Brett should know?', ph: 'Your current website, goals, questions. Optional.' }
];

export const CONTROLS = Object.fromEntries([...CARDS.flatMap(c => c.controls.map(q => [q.id, { ...q, card: c.id }])), ...EXTRAS.map(q => [q.id, q])]);
export const visible = (q, a) => (!q.card || on(a, q.card)) && (!q.show || q.show(a));

function clean(q, v) {
  if (v == null) return undefined;
  if (q.type === 'chips') {
    if (!Array.isArray(v)) return undefined;
    const ok = [...new Set(v.filter(x => q.opts.some(o => o.v === x)))];
    return ok.length ? ok : undefined;
  }
  if (q.type === 'seg') return q.opts.some(o => o.v === v) ? v : undefined;
  if (q.type === 'toggle') return v === true ? true : undefined;
  if (q.type === 'stepper') { const n = parseInt(v, 10); return Number.isFinite(n) && n >= q.min && n <= q.max ? n : undefined; }
  const s = String(v).trim().slice(0, 2000);
  return s || undefined;
}

/* Keep only valid answers to choices that are actually on screen. */
export function prune(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const picks = Array.isArray(src.picks) ? [...new Set(src.picks.filter(p => CARDS.some(c => c.id === p)))] : [];
  const a = { picks };
  for (let i = 0; i < 3; i++) {
    for (const [id, q] of Object.entries(CONTROLS)) {
      const v = visible(q, a) ? clean(q, src[id]) : undefined;
      if (v === undefined) delete a[id]; else a[id] = v;
    }
  }
  return a;
}

/* Missing required answers (used by the browser before showing the quote). */
export function missing(q, a) {
  if (!q.req || !visible(q, a)) return false;
  const v = a[q.id];
  if (q.type === 'chips') return !(v && v.length);
  return !(v && String(v).trim());
}
