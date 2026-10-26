/* HighLevel (GHL) API helpers. The token stays on the server. */
const BASE = 'https://services.leadconnectorhq.com';
const LOC = () => process.env.GHL_LOCATION_ID;

export const ghlReady = () => !!(process.env.GHL_TOKEN && process.env.GHL_LOCATION_ID);

async function ghl(path, { method = 'GET', body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_TOKEN}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) {
    const e = new Error(`GHL ${method} ${path.split('?')[0]} → ${r.status}`);
    e.status = r.status; e.body = json; throw e;
  }
  return json;
}

export async function findContactByEmail(email) {
  const q = new URLSearchParams({ locationId: LOC(), email });
  const j = await ghl(`/contacts/search/duplicate?${q}`);
  return j.contact || null;
}

export const addTags = (contactId, tags) =>
  ghl(`/contacts/${contactId}/tags`, { method: 'POST', body: { tags: tags.filter(Boolean) } });

export const addNote = (contactId, body) =>
  ghl(`/contacts/${contactId}/notes`, { method: 'POST', body: { body } });

export const upsertOpportunity = o =>
  ghl('/opportunities/upsert', { method: 'POST', body: { locationId: LOC(), status: 'open', ...o } });
