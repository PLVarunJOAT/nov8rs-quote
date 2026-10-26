/* =====================================================================
   PRICE LIST — the only file you edit to change prices.
   Source: PL Fulfilment Pricing 10-26.
   once = one-time price · mo = monthly price
   platform: true  → includes the CRM platform subscription
   from: true      → shown as "from $X" (starting price)
   contact: true   → "Contact for rates"
   review: true    → always flagged for a quick review before invoicing
   ===================================================================== */
export const CATALOG = {
  'PL-WEB-AISETUP': { name: 'AI Website Setup', once: 97 },
  'PL-WEB-PAGE':    { name: 'Website Page Add-On', once: 50 },
  'PL-WEB-ESS':     { name: 'Essentials Bundle', once: 497, platform: true },
  'PL-WEB-CUSTOM':  { name: 'Custom Website', once: 4997, from: true, review: true },
  'PL-AI-REC':      { name: 'AI Receptionist', once: 997 },
  'PL-AI-SBI':      { name: 'AI Sales Bot (Inbound)', once: 997 },
  'PL-AI-SBIO':     { name: 'AI Sales Bot (In + Outbound)', once: 997 },
  'PL-AI-SUP':      { name: 'AI Support Bot', once: 997 },
  'PL-AI-CALL':     { name: 'AI Callbot Campaign', once: 997 },
  'PL-AI-ADS':      { name: 'AI Ad Campaign Creation', once: 997 },
  'PL-AI-STORE':    { name: 'AI Storefront', once: 2997, platform: true },
  'PL-AI-SFORCE':   { name: 'AI Salesforce Bundle', once: 4997, platform: true },
  'PL-PLATFORM':    { name: 'Profit Lifter CRM platform', mo: 297 },
  'PL-BR-START':    { name: 'Complete Branding Starter Pack', once: 297 },
  'PL-SEO-FULL':    { name: 'Full Visibility Bundle (GAS-EO)', once: 1497, mo: 1497 },
  'PL-SOC-MGMT':    { name: 'Social Media Management', mo: 497 },
  'PL-ADS-MGMT':    { name: 'Paid Ad Campaign Management', mo: 997 },
  'PL-ADS-FUNNEL':  { name: 'Ad Campaign Funnel', once: 1197 },
  'PL-ADS-PPC':     { name: 'PPC Full Launch Package', once: 1497 },
  'PL-EM-COLD':     { name: 'Cold Email Full System', once: 2997 },
  'PL-EM-MGMT':     { name: 'Cold Email Management', mo: 1497 },
  'PL-PK-TRAFFIC':  { name: 'Traffic Pack', mo: 1997 },
  'PL-PK-CONVERT':  { name: 'Convert Pack', mo: 2997 },
  'PL-VA':          { name: 'On-Demand VA Talent', contact: true, review: true },
  'PL-CUSTOM':      { name: 'Custom request', review: true }
};

export const RULES = {
  // Pages included before Website Page Add-On kicks in.
  includedPages: { ai: 1, ess: 7 },
  // More pages than this goes to review instead of being priced.
  maxPages: 15,

  // Ad management + GAS-EO packs, by number of platforms (= campaigns).
  packs: [
    { sku: 'PL-PK-TRAFFIC', min: 1, max: 1 },
    { sku: 'PL-PK-CONVERT', min: 2, max: 5 }
  ],
  // true = never use a pack that costs less than ad management alone.
  // Stops 4–5 campaigns + GAS-EO from undercutting ads-only pricing.
  packNeverBelowAdsOnly: true,
  // More campaigns than this goes to review.
  maxCampaigns: 5,

  // Round the final one-time and monthly totals to the nearest amount ending in 7
  // (2,994 → 2,997 · 3,999 → 3,997). A "Rounding" line keeps the table adding up.
  roundToSeven: true,

  // Opportunity value in GHL = one-time + (monthly × this many months).
  opportunityMonths: 12
};
