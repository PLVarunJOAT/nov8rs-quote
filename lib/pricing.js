/* Pricing engine. Runs only on the server. Turns choices into line items. */
import { CATALOG as C, RULES as R } from './catalog.js';
import { prune, has, on, pkgOn, adsOngoing } from '../public/flow.js';

export const fmt = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

/* Nearest amount ending in 7: 2994 → 2997, 3999 → 3997, 0 stays 0. */
export const roundToSeven = x => (x <= 0 ? 0 : Math.round((x - 7) / 10) * 10 + 7);

export function choosePack(n) {
  if (!n || n > R.maxCampaigns) return null;
  const p = R.packs.find(p => n >= p.min && n <= p.max);
  if (!p) return null;
  if (R.packNeverBelowAdsOnly && C[p.sku].mo < C['PL-ADS-MGMT'].mo * n) return null;
  return p.sku;
}

export function build(raw) {
  const a = prune(raw), L = [];
  let platform = false;
  const add = (card, g, sku, o = {}) => {
    const c = C[sku], qty = o.qty || 1;
    if (c.platform) platform = true;
    L.push({
      card, g, sku, name: o.name || c.name, qty,
      once: o.once ?? (c.once || 0) * qty, mo: o.mo ?? (c.mo || 0) * qty,
      from: !!c.from, contact: !!c.contact, review: !!(o.review || c.review),
      note: o.note || '', m2: !!o.m2
    });
  };
  const included = (card, g, name, note) => L.push({ card, g, sku: '', name, qty: 1, once: 0, mo: 0, included: note });
  const pkg = pkgOn(a);

  /* Website */
  if (on(a, 'web') && a.web_kind) {
    const g = 'Website';
    if (a.web_kind === 'custom') add('web', g, 'PL-WEB-CUSTOM', { note: 'Starting price. Final scope confirmed on a call.' });
    else {
      const pages = a.web_pages || 1, incl = R.includedPages[a.web_kind];
      if (pkg) included('web', g, 'Website', `Included in ${a.infra_pkg === 'sf' ? 'AI Salesforce' : 'AI Storefront'}`);
      else add('web', g, a.web_kind === 'ess' ? 'PL-WEB-ESS' : 'PL-WEB-AISETUP', { note: `${incl} page${incl > 1 ? 's' : ''} included` });
      if (pages > R.maxPages) add('web', g, 'PL-CUSTOM', { name: `${pages}-page site`, note: 'Page count confirmed on a call' });
      else if (!pkg && pages > incl) add('web', g, 'PL-WEB-PAGE', { qty: pages - incl, name: `Extra pages × ${pages - incl}` });
    }
  }

  /* Brand kit */
  if (on(a, 'kit')) add('kit', 'Branding', 'PL-BR-START');

  /* Ads (+ pack with GAS-EO) */
  const ongoing = adsOngoing(a);
  const n = ongoing ? Math.max(1, (a.ads_platforms || []).length) : 0;
  const launch = ongoing && a.ads_mode === 'launch';
  const pack = on(a, 'seo') && ongoing ? choosePack(n) : null;
  const tooMany = n > R.maxCampaigns;
  if (on(a, 'ads') && a.ads_mode) {
    const g = 'Paid ads';
    if (a.ads_mode === 'build') add('ads', g, 'PL-AI-ADS');
    if (launch) add('ads', g, 'PL-ADS-PPC', { qty: n, name: n > 1 ? `PPC Full Launch Package × ${n}` : undefined, note: 'Setup, creative pack and the first month of management' });
    if (ongoing && !pack) add('ads', g, 'PL-ADS-MGMT', {
      qty: n, name: n > 1 ? `Paid Ad Campaign Management × ${n}` : undefined, review: tooMany, m2: launch,
      note: [n > 1 ? `${fmt(C['PL-ADS-MGMT'].mo)} per platform` : '', launch ? 'Starts month 2' : '', tooMany ? 'Confirmed on a call' : ''].filter(Boolean).join(' · ')
    });
    if (a.ads_funnel) add('ads', g, 'PL-ADS-FUNNEL');
  }

  /* GAS-EO */
  let packSave = 0;
  if (on(a, 'seo') && a.seo_scope) {
    const g = 'GAS-EO', scopeReview = a.seo_scope !== 'local';
    if (pack) {
      packSave = Math.max(0, C['PL-ADS-MGMT'].mo * n + C['PL-SEO-FULL'].mo - C[pack].mo);
      add('seo', g, pack, {
        review: scopeReview, m2: launch,
        note: [`Ad management on ${n} platform${n > 1 ? 's' : ''} + GAS-EO setup and management`, launch ? 'Starts month 2' : '', scopeReview ? 'Scope confirmed on a call' : ''].filter(Boolean).join(' · ')
      });
    } else add('seo', g, 'PL-SEO-FULL', { review: scopeReview, note: 'Setup + monthly management' + (scopeReview ? ' · Scope confirmed on a call' : '') });
  }

  /* Social */
  if (on(a, 'social')) add('social', 'Social media', 'PL-SOC-MGMT', { review: !!a.so_more, note: a.so_more ? 'Extra posts confirmed on a call' : '12–16 posts a month' });

  /* Cold email */
  if (on(a, 'cold')) {
    add('cold', 'Cold email', 'PL-EM-COLD', { note: 'Setup, launch and the first month of management' });
    add('cold', 'Cold email', 'PL-EM-MGMT', { m2: true, note: 'Starts month 2' });
    if (a.ce_build) add('cold', 'Cold email', 'PL-CUSTOM', { name: 'Prospect list building', note: 'Priced on a call' });
  }

  /* AI & automation */
  if (on(a, 'ai') && a.infra_pkg) {
    const g = 'AI & automation';
    if (a.infra_pkg === 'std') add('ai', g, 'PL-AI-STORE');
    if (a.infra_pkg === 'sf') add('ai', g, 'PL-AI-SFORCE');
    if (pkg && a.ai_support) add('ai', g, 'PL-AI-SUP');
    if (a.infra_pkg === 'pick') {
      const t = a.ai_tools || [];
      if (has(t, 'rec')) add('ai', g, 'PL-AI-REC');
      if (has(t, 'sbo')) add('ai', g, 'PL-AI-SBIO'); else if (has(t, 'sbi')) add('ai', g, 'PL-AI-SBI');
      if (has(t, 'sup')) add('ai', g, 'PL-AI-SUP');
      if (has(t, 'call')) add('ai', g, 'PL-AI-CALL');
      if (a.crm_now === 'none') platform = true;
      if (a.crm_now === 'other') add('ai', g, 'PL-CUSTOM', { name: 'Connect your current CRM', note: 'Priced on a call' });
    }
  }

  /* Talent */
  if (on(a, 'va') && (a.va_roles || []).length) {
    const r = a.va_roles.length;
    add('va', 'Creative talent', 'PL-VA', { name: `On-Demand VA Talent (${r} role${r > 1 ? 's' : ''})`, note: 'Rates confirmed on a call' });
  }

  /* Custom */
  if (on(a, 'custom') && a.custom_text) add('custom', 'Custom', 'PL-CUSTOM', { name: 'Custom request', note: a.custom_text.slice(0, 120) });

  /* CRM platform: charged once, skipped if they already have it */
  if (platform) {
    if (a.crm_now === 'pl') included('platform', 'Platform', 'Profit Lifter CRM platform', 'Already on your account');
    else add('platform', 'Platform', 'PL-PLATFORM', { note: 'One subscription covers everything that uses the CRM' });
  }

  const rawOnce = L.reduce((s, x) => s + x.once, 0), rawMo = L.reduce((s, x) => s + x.mo, 0);
  const once = R.roundToSeven ? roundToSeven(rawOnce) : rawOnce;
  const mo = R.roundToSeven ? roundToSeven(rawMo) : rawMo;
  return {
    answers: a, lines: L, once, mo, adjOnce: once - rawOnce, adjMo: mo - rawMo,
    reviewCount: L.filter(x => x.review).length,
    hasFrom: L.some(x => x.from), hasM2: L.some(x => x.m2),
    pack, packName: pack ? C[pack].name : '', packSave, adsOn: on(a, 'ads'), n
  };
}

/* Pack upsell shown on the quote when the client has ads OR GAS-EO, but not both. */
export function packOffer(raw) {
  const r = build(raw), a = r.answers;
  if (r.pack) return null;
  const hasSeo = on(a, 'seo'), ongoing = adsOngoing(a), mgmt = C['PL-ADS-MGMT'].mo, seo = C['PL-SEO-FULL'];
  if (ongoing && !hasSeo) {
    const sku = choosePack(r.n);
    if (!sku) return null;
    const p = C[sku].mo, now = mgmt * r.n, sep = now + seo.mo;
    const sim = build({ ...a, picks: [...a.picks, 'seo'], seo_scope: 'local' });
    return {
      kind: 'addSeo', card: 'seo', sku, save: sep - p,
      head: `Add GAS-EO for ${fmt(sim.mo - r.mo)}/mo more`,
      body: `The ${C[sku].name} covers your ad management${r.n > 1 ? ` on ${r.n} platforms` : ''} plus GAS-EO setup and management for ${fmt(p)}/mo. Bought separately, that’s ${fmt(sep)}/mo plus a ${fmt(seo.once)} GAS-EO setup.`,
      cta: `Add GAS-EO`
    };
  }
  if (hasSeo && !ongoing) {
    const sku = 'PL-PK-TRAFFIC', p = C[sku].mo, now = seo.mo, sep = now + mgmt;
    const sim = build({ ...a, picks: [...a.picks.filter(x => x !== 'ads'), 'ads'], ads_mode: 'manage', ads_platforms: ['google'] });
    return {
      kind: 'addAds', card: 'ads', sku, save: sep - p,
      head: `Add ad management on one platform for ${fmt(sim.mo - r.mo)}/mo more`,
      body: `The Traffic Pack covers your GAS-EO plus ad management on one platform for ${fmt(p)}/mo, and the GAS-EO setup is included. Bought separately, that’s ${fmt(sep)}/mo plus the ${fmt(seo.once)} setup.`,
      cta: 'Add paid ads'
    };
  }
  return null;
}

/* What the browser is allowed to see. */
export function publicQuote(raw) {
  const r = build(raw);
  return {
    lines: r.lines.map(({ card, g, sku, name, qty, once, mo, from, contact, review, note, m2, included }) =>
      ({ card, g, sku, name, qty, once, mo, from, contact, review, note, m2, included })),
    once: r.once, mo: r.mo, adjOnce: r.adjOnce, adjMo: r.adjMo,
    reviewCount: r.reviewCount, hasFrom: r.hasFrom, hasM2: r.hasM2,
    packName: r.packName, packSave: r.packSave, adsOn: r.adsOn, offer: packOffer(raw)
  };
}
