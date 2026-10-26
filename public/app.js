/* nov8rs quote builder · one-page configurator */
import { CARDS, EXTRAS, CONTROLS, visible, missing, has, isAny, on, adsOngoing } from './flow.js';

const $ = s => document.querySelector(s);
const fmt = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function post(url, body) {
  const r = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  try { return await r.json(); } catch { return { ok:false }; }
}

/* Who the visitor is, passed from the GHL form redirect */
const P = new URLSearchParams(location.search);
const who = {
  email: (P.get('email') || '').trim(),
  first: P.get('first_name') || P.get('firstName') || P.get('name') || '',
  company: P.get('company') || P.get('company_name') || P.get('companyName') || ''
};

let S = { token:null, config:{ siteUrl:'https://nov8rs.io' }, preview:false };
let A = { picks:[] }, view = 'build', showErr = false;
let Qt = null, prevTotals = null, qSeq = 0, qTimer = null, busy = false, delta = null, deltaTimer = null;
let quoteId = null, offerShown = null, offerTaken = null, calOpen = false, lastFinish = '', flashCard = null;

/* Save and resume (per email, this browser only) */
const KEY = () => 'nov8rs-quote-v2:' + who.email.toLowerCase();
function save() { try { localStorage.setItem(KEY(), JSON.stringify({ A, quoteId })); } catch {} }
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY()) || 'null'); if (s && s.A && Array.isArray(s.A.picks)) { A = s.A; quoteId = s.quoteId || null; } } catch {}
}

/* ---------- Start ---------- */
async function boot() {
  if (!/^\S+@\S+\.\S+$/.test(who.email)) return gate('start');
  gate('loading');
  let r = null;
  for (let i = 0; i < 4; i++) {
    r = await post('/api/session', { email: who.email }).catch(() => null);
    if (r && r.ok) break;
    if (r && r.reason !== 'not_found') break;
    await sleep(1500);   // the GHL contact can take a moment to appear after the form
  }
  if (r && r.config) S.config = { ...S.config, ...r.config };
  if (!r || !r.ok) return gate(r && r.reason === 'ghl' ? 'error' : 'start');
  S = { ...S, token: r.token, preview: !!r.preview };
  if (r.contact?.firstName) who.first = r.contact.firstName;
  if (r.contact?.company) who.company = r.contact.company;
  $('#preview').hidden = !S.preview;
  load();
  render();
  fetchQuote();
}

function gate(kind) {
  $('#rail').innerHTML = ''; $('#mbar').classList.remove('show'); $('.grid').classList.add('full');
  const site = esc(S.config.siteUrl);
  $('#panel').innerHTML = {
    loading: `<div class="center"><div class="spinner" aria-hidden="true"></div><h1>Getting your quote ready</h1><p class="lede">This takes a second.</p></div>`,
    start: `<div class="center"><h1>Start your quote on nov8rs.io</h1><p class="lede">Add your details there first, so we can save your quote and send you a copy. It takes 20 seconds.</p><a class="btn primary" href="${site}">Go to nov8rs.io ↗</a></div>`,
    error: `<div class="center"><h1>We couldn’t load your quote</h1><p class="lede">Something went wrong on our side. Refresh the page to try again.</p><button class="btn primary" onclick="location.reload()">Refresh</button></div>`
  }[kind];
}

/* ---------- Pricing (always from the server) ---------- */
async function fetchQuote() {
  const my = ++qSeq; setBusy(true);
  try {
    const r = await post('/api/quote', { token: S.token, answers: A });
    if (r.reason === 'session') return boot();
    if (my === qSeq && r.ok) {
      if (prevTotals && (r.quote.once !== prevTotals.once || r.quote.mo !== prevTotals.mo)) showDelta(r.quote.once - prevTotals.once, r.quote.mo - prevTotals.mo);
      Qt = r.quote; prevTotals = { once: Qt.once, mo: Qt.mo };
    }
  } catch {}
  if (my === qSeq) { setBusy(false); view === 'quote' ? render() : (renderRail(), paintCardPrices()); }
}
function requestQuote() { clearTimeout(qTimer); qTimer = setTimeout(fetchQuote, 200); }
function setBusy(b) { busy = b; const d = $('#busy'); if (d) d.classList.toggle('on', b); }
function showDelta(dOnce, dMo) {
  const parts = [dMo ? `${dMo > 0 ? '+' : ''}${fmt(dMo)}/mo` : '', dOnce ? `${dOnce > 0 ? '+' : ''}${fmt(dOnce)}` : ''].filter(Boolean);
  delta = { text: parts.join(' · '), down: dMo + dOnce < 0 };
  clearTimeout(deltaTimer); deltaTimer = setTimeout(() => { delta = null; document.querySelectorAll('.delta').forEach(d => d.classList.remove('show')); }, 1800);
}

/* ---------- Builder ---------- */
const priceText = (once, mo) => [once ? fmt(once) : '', mo ? fmt(mo) + '/mo' : ''].filter(Boolean).join(' + ');
function cardPrice(id) {
  if (!Qt) return '';
  const ls = Qt.lines.filter(l => l.card === id);
  if (!ls.length) return '';
  if (ls.some(l => l.contact)) return 'Rates on a call';
  const once = ls.reduce((s, l) => s + l.once, 0), mo = ls.reduce((s, l) => s + l.mo, 0);
  if (!once && !mo) return ls.some(l => l.included) ? 'Included' : 'Priced on a call';
  return (ls.some(l => l.from) ? 'from ' : '') + priceText(once, mo);
}
function paintCardPrices() { document.querySelectorAll('[data-price]').forEach(el => { el.textContent = cardPrice(el.dataset.price); }); }

function tipFor(id) {
  if (id === 'ads' && adsOngoing(A) && !on(A, 'seo')) return 'Add GAS-EO too and you may qualify for a pack that costs less than buying both. Your quote shows the numbers.';
  if (id === 'seo' && !adsOngoing(A)) return 'Add paid ad management and GAS-EO can move onto a pack that costs less than buying both. Your quote shows the numbers.';
  return '';
}

function ctlHTML(q) {
  const v = A[q.id], bad = showErr && missing(q, A);
  let h = `<div class="ctl${bad ? ' bad' : ''}">`;
  if (q.type !== 'toggle') h += `<div class="ctl-l" id="l_${q.id}">${esc(q.label)}${!q.req && (q.type === 'textarea') ? ' <span class="opt-note">(optional)</span>' : ''}</div>`;
  if (q.type === 'seg') {
    h += `<div class="seg" role="group" aria-labelledby="l_${q.id}">${q.opts.map(o => `<button type="button" data-k="${q.id}:${o.v}" data-set="${q.id}" data-v="${esc(o.v)}" aria-pressed="${v === o.v}">${esc(o.l)}</button>`).join('')}</div>`;
    const sel = q.opts.find(o => o.v === v);
    if (sel && sel.d) h += `<p class="ctl-d">${esc(sel.d)}</p>`;
  } else if (q.type === 'chips') {
    if (q.help) h += `<p class="ctl-d" style="margin-top:-4px">${esc(q.help)}</p>`;
    h += `<div class="seg" role="group" aria-labelledby="l_${q.id}">${q.opts.map(o => `<button type="button" class="chip" data-k="${q.id}:${o.v}" data-chip="${q.id}" data-v="${esc(o.v)}" aria-pressed="${has(v, o.v)}">${esc(o.l)}</button>`).join('')}</div>`;
  } else if (q.type === 'stepper') {
    const n = v ?? q.def;
    h += `<div class="stepper"><button type="button" data-k="${q.id}:-" data-step="${q.id}" data-d="-1" aria-label="Fewer" ${n <= q.min ? 'disabled' : ''}>−</button><input type="number" inputmode="numeric" data-k="${q.id}:n" data-num="${q.id}" min="${q.min}" max="${q.max}" value="${n}" aria-labelledby="l_${q.id}"><button type="button" data-k="${q.id}:+" data-step="${q.id}" data-d="1" aria-label="More" ${n >= q.max ? 'disabled' : ''}>+</button></div>`;
  } else if (q.type === 'toggle') {
    h += `<label class="switch"><input type="checkbox" data-k="${q.id}:t" data-bool="${q.id}" ${v ? 'checked' : ''}><span class="sw" aria-hidden="true"></span>${esc(q.label)}</label>`;
  } else if (q.type === 'textarea') {
    h += `<textarea class="txt" rows="3" data-k="${q.id}:x" data-text="${q.id}" aria-labelledby="l_${q.id}" placeholder="${esc(q.ph || '')}">${esc(v || '')}</textarea>`;
  } else {
    h += `<input class="txt" type="text" data-k="${q.id}:x" data-text="${q.id}" aria-labelledby="l_${q.id}" placeholder="${esc(q.ph || '')}" value="${esc(v || '')}">`;
  }
  if (bad) h += `<div class="err">${q.type === 'chips' ? 'Pick at least one.' : q.type === 'seg' ? 'Pick one.' : 'Tell us a little about it.'}</div>`;
  return h + '</div>';
}

function cardHTML(c) {
  const isOn = on(A, c.id);
  const ctls = isOn ? c.controls.filter(q => visible({ ...q, card: c.id }, A)) : [];
  const bad = showErr && ctls.some(q => missing({ ...q, card: c.id }, A));
  const tip = isOn ? tipFor(c.id) : '';
  return `<div class="card${isOn ? ' on' : ''}${bad ? ' bad' : ''}${flashCard === c.id ? ' flash' : ''}" id="card_${c.id}">
    <button type="button" class="card-head" data-k="card:${c.id}" data-card="${c.id}" aria-pressed="${isOn}" aria-expanded="${isOn}">
      <span class="tick" aria-hidden="true"></span>
      <span class="t"><b>${esc(c.title)}</b><small>${esc(c.desc)}</small></span>
      <span class="price" data-price="${c.id}">${esc(isOn ? cardPrice(c.id) : '')}</span>
    </button>
    ${ctls.length || tip ? `<div class="card-body">${ctls.map(q => ctlHTML({ ...q, card: c.id })).join('')}${tip ? `<p class="hint">${esc(tip)}</p>` : ''}</div>` : ''}
  </div>`;
}

function renderBuilder() {
  const extras = EXTRAS.filter(q => visible(q, A));
  const noPick = showErr && !A.picks.length;
  $('#panel').innerHTML = `<p class="kicker">Build your quote</p>
    <h1>What do you need${who.first ? ', ' + esc(who.first) : ''}?</h1>
    <p class="lede">Tap everything that applies. Your price updates as you go.</p>
    <div class="cards">${CARDS.map(cardHTML).join('')}</div>
    ${noPick ? '<p class="err" style="margin-top:12px">Pick at least one service.</p>' : ''}
    ${A.picks.length ? `<div class="extras">${extras.map(ctlHTML).join('')}</div>` : ''}
    <div class="nav" style="justify-content:flex-end"><button class="btn primary" id="next" data-k="next">See my quote ↗</button></div>`;
  flashCard = null;
}

function render() {
  const focusKey = document.activeElement?.dataset?.k;
  $('.grid').classList.toggle('full', view === 'quote');
  if (view === 'quote') renderQuote(); else renderBuilder();
  renderRail(); save();
  if (focusKey) document.querySelector(`[data-k="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
}

function setDefaults(c) {
  for (const q of c.controls) if (A[q.id] === undefined && q.def !== undefined) A[q.id] = Array.isArray(q.def) ? [...q.def] : q.def;
}
function change(fn) { const y = window.scrollY; fn(); render(); window.scrollTo(0, y); requestQuote(); }

$('#panel').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.card) return change(() => {
    const id = t.dataset.card; showErr = false;
    if (on(A, id)) A.picks = A.picks.filter(p => p !== id);
    else { A.picks = [...A.picks, id]; setDefaults(CARDS.find(c => c.id === id)); }
  });
  if (t.dataset.set) return change(() => { A[t.dataset.set] = t.dataset.v; });
  if (t.dataset.chip) return change(() => {
    const id = t.dataset.chip, s = new Set(A[id] || []);
    s.has(t.dataset.v) ? s.delete(t.dataset.v) : s.add(t.dataset.v); A[id] = [...s];
  });
  if (t.dataset.step) return change(() => {
    const q = CONTROLS[t.dataset.step], n = (A[q.id] ?? q.def) + +t.dataset.d;
    A[q.id] = Math.min(q.max, Math.max(q.min, n));
  });
  if (t.id === 'next') return goQuote();
});
$('#panel').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.bool) change(() => { if (t.checked) A[t.dataset.bool] = true; else delete A[t.dataset.bool]; });
  if (t.dataset.num) change(() => { const q = CONTROLS[t.dataset.num]; const n = parseInt(t.value, 10); A[q.id] = Number.isFinite(n) ? Math.min(q.max, Math.max(q.min, n)) : q.def; });
});
$('#panel').addEventListener('input', e => {
  const t = e.target; if (!t.dataset.text) return;
  A[t.dataset.text] = t.value; save(); requestQuote();
});

function invalid() {
  if (!A.picks.length) return true;
  return Object.values(CONTROLS).some(q => missing(q, A));
}
function goQuote() {
  if (invalid()) {
    showErr = true; render();
    const el = $('#panel .card.bad, #panel .ctl.bad, #panel .err');
    el && el.scrollIntoView({ block:'center', behavior:'smooth' });
    return;
  }
  showErr = false; view = 'quote'; render(); toTop(); enterQuote();
}
function toTop() { try { window.scrollTo({ top:0, behavior:'smooth' }); } catch { window.scrollTo(0, 0); } }

/* ---------- Running total ---------- */
function linePrice(l) {
  if (l.included) return 'Included';
  if (l.contact) return 'On a call';
  return (l.from ? 'from ' : '') + (priceText(l.once, l.mo) || 'On a call');
}
function renderRail() {
  const lines = Qt?.lines || [], empty = !A.picks.length || !lines.length;
  const d = delta ? `<span class="delta show${delta.down ? ' down' : ''}">${esc(delta.text)}</span>` : '';
  $('#rail').innerHTML = view === 'quote' ? '' : `<div class="panel"><h3>Your price <span class="busy${busy ? ' on' : ''}" id="busy" aria-hidden="true"></span></h3>
    ${empty ? '<p class="empty">Tap a service to see its price.</p>' :
      `<ul class="plan">${lines.map(l => `<li class="${l.review ? 'rv' : ''}"><span>${esc(l.name)}</span><span>${esc(linePrice(l))}</span></li>`).join('')}</ul>
       <div class="tots"><div class="tot"><small>One-time${Qt.hasFrom ? ' (from)' : ''}</small><span class="money">${fmt(Qt.once)}</span></div>
       <div class="tot"><small>Monthly ${d}</small><span class="money">${fmt(Qt.mo)}</span></div></div>`}</div>`;
  const m = $('#mbar');
  if (view === 'quote' || empty) { m.classList.remove('show'); document.body.style.paddingBottom = ''; return; }
  m.innerHTML = `<div><small>One-time${Qt.hasFrom ? ' (from)' : ''}</small><span class="money">${fmt(Qt.once)}</span></div>
    <div class="mid">${d}</div>
    <div style="text-align:right"><small>Monthly</small><span class="money">${fmt(Qt.mo)}</span></div>`;
  m.classList.add('show');
  document.body.style.paddingBottom = matchMedia('(max-width:900px)').matches ? '76px' : '';
}

/* ---------- Quote ---------- */
async function enterQuote() {
  await fetchQuote();
  const sig = JSON.stringify(A);
  if (sig === lastFinish) return;
  lastFinish = sig;
  const r = await post('/api/finish', { token:S.token, answers:A, action:'built', quoteId, offerShown, offerTaken }).catch(() => null);
  if (r && r.quoteId) { quoteId = r.quoteId; save(); if (view === 'quote') render(); }
}

function renderQuote() {
  const panel = $('#panel');
  if (!Qt) { panel.innerHTML = `<div class="center"><div class="spinner" aria-hidden="true"></div><h1>Pricing your quote</h1></div>`; return; }
  const r = Qt, groups = [...new Set(r.lines.map(l => l.g))];
  const cell = (v, l) => l.contact ? '<span class="soft">On a call</span>' : v ? (l.from ? '<span class="soft">from </span>' : '') + fmt(v) : '<span class="soft dash">–</span>';
  let rows = '';
  for (const g of groups) {
    rows += `<tr class="grp"><td colspan="3">${esc(g)}</td></tr>`;
    for (const l of r.lines.filter(x => x.g === g)) {
      if (l.included) { rows += `<tr><td>${esc(l.name)}<small>${esc(l.included)}</small></td><td class="money soft" data-label="">Included</td><td class="money"></td></tr>`; continue; }
      const noPrice = !l.once && !l.mo && !l.contact;
      rows += `<tr><td>${esc(l.name)}${l.review ? ' <span class="flag">· needs review</span>' : ''}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td>
        <td class="money" data-label="One-time">${noPrice ? '<span class="soft">On a call</span>' : cell(l.once, l)}</td><td class="money" data-label="Monthly">${l.contact || noPrice ? '' : cell(l.mo, l)}</td></tr>`;
    }
  }
  if (r.adjOnce || r.adjMo) rows += `<tr class="adj"><td>Rounding</td><td class="money" data-label="One-time">${r.adjOnce ? fmt(r.adjOnce) : '<span class="dash"></span>'}</td><td class="money" data-label="Monthly">${r.adjMo ? fmt(r.adjMo) : '<span class="dash"></span>'}</td></tr>`;
  rows += `<tr class="sum"><td>Total</td><td class="money" data-label="One-time">${r.hasFrom ? '<span class="soft">from </span>' : ''}${fmt(r.once)}</td><td class="money" data-label="Monthly">${fmt(r.mo)}</td></tr>`;

  const o = r.offer;
  if (o) offerShown = o.sku;
  const cal = S.config.calendarUrl;
  panel.innerHTML = `<div class="qhead"><div><p class="kicker">${quoteId ? 'Quote ' + esc(quoteId) : 'Your quote'}</p>
      <h1>${who.company ? esc(who.company) + ' project quote' : 'Your project quote'}</h1>
      <p class="lede" style="margin:0">Here’s your pricing${who.first ? ', ' + esc(who.first) : ''}. ${r.reviewCount ? 'A few items need a quick review before we finalize them.' : 'Everything is priced and ready to go.'}</p></div>
      <span class="status ${r.reviewCount ? 'review' : 'ready'}">${r.reviewCount ? 'Needs quick review' : 'Ready to start'}</span></div>
    <div class="bigtots"><div><small>One-time${r.hasFrom ? ' (from)' : ''}</small><span class="money">${fmt(r.once)}</span></div>
      <div><small>Monthly</small><span class="money">${fmt(r.mo)}</span></div></div>
    ${r.packSave ? `<p class="saving">You’re saving ${fmt(r.packSave)}/mo with the ${esc(r.packName)}, and the GAS-EO setup is included.</p>` : ''}
    ${o ? `<div class="offer"><span class="ot">Recommended · save ${fmt(o.save)}/mo</span><h2>${esc(o.head)}</h2><p>${esc(o.body)}</p>
      <div class="row"><button class="btn primary" id="take">${esc(o.cta)}</button></div></div>` : ''}
    <div class="tablewrap"><table class="lines"><thead><tr><th>Product</th><th class="r">One-time</th><th class="r">Monthly</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="notes">
      ${r.reviewCount ? '<p>Items marked “needs review” depend on details we confirm with you. Totals don’t include anything priced on a call.</p>' : ''}
      ${r.hasM2 ? '<p>Items marked “starts month 2” begin after your first month, which is included in the setup price.</p>' : ''}
      ${r.adsOn ? '<p>Ad spend is paid directly to the ad platforms and isn’t part of this quote.</p>' : ''}
    </div>
    <div class="actions">
      <button class="btn primary" id="book">Talk to Brett about this quote ↗</button>
      <button class="btn" id="edit">Change my services</button>
      <button class="btn" id="copy">Copy quote</button>
    </div>
    <p class="toast" id="toast" hidden></p>
    <section class="cal" id="cal" ${calOpen ? '' : 'hidden'}>
      <h2>Pick a time with Brett</h2>
      <p class="lede">He’ll have your quote in front of him, so you can go straight to your questions.</p>
      ${cal ? `<iframe src="${esc(cal)}" title="Book a call with Brett" loading="lazy"></iframe>` : '<p class="lede">The booking calendar isn’t connected yet.</p>'}
    </section>`;

  $('#edit').onclick = () => { view = 'build'; render(); toTop(); };
  $('#book').onclick = () => {
    const first = !calOpen; calOpen = true; render();
    $('#cal').scrollIntoView({ behavior:'smooth', block:'start' });
    if (first) post('/api/finish', { token:S.token, answers:A, action:'call', quoteId }).catch(() => {});
  };
  $('#copy').onclick = () => copyQuote(r);
  const t = $('#take'); if (t) t.onclick = () => takeOffer(o);
}

/* Taking the pack offer turns the missing service on and shows it, ready to tweak. */
function takeOffer(o) {
  offerTaken = o.sku;
  const c = CARDS.find(x => x.id === o.card);
  if (!on(A, c.id)) A.picks = [...A.picks, c.id];
  setDefaults(c);
  if (c.id === 'ads' && !isAny(A.ads_mode, ['launch', 'manage'])) A.ads_mode = 'manage';
  view = 'build'; flashCard = c.id; render(); requestQuote();
  setTimeout(() => $('#card_' + c.id)?.scrollIntoView({ block:'center', behavior:'smooth' }), 50);
}

function copyQuote(r) {
  const text = [
    `nov8rs quote${quoteId ? ' ' + quoteId : ''}${who.company ? ': ' + who.company : ''}`, '',
    ...r.lines.map(l => `${l.name}: ${linePrice(l)}${l.review ? ' (needs review)' : ''}`), '',
    `One-time: ${r.hasFrom ? 'from ' : ''}${fmt(r.once)}`, `Monthly: ${fmt(r.mo)}`
  ].join('\n');
  const t = $('#toast');
  navigator.clipboard.writeText(text).then(() => { t.hidden = false; t.textContent = 'Quote copied.'; })
    .catch(() => { t.hidden = false; t.innerHTML = `<textarea class="txt" rows="8" readonly>${esc(text)}</textarea>`; t.querySelector('textarea').select(); });
}

window.addEventListener('resize', () => renderRail());
boot();
