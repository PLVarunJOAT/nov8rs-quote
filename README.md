# nov8rs quote builder

Visitors fill in the GHL pop-up form on nov8rs.io, land here, tap the services they want on one page (prices update live), see their quote, then book a call with Brett. Every finished quote is saved to their GHL contact.

Only choices that change the price are asked. Everything else (goals, ad spend, website address, timeline) is for Brett's call, and visitors can add it in the optional "Anything Brett should know?" box.

## What's in here

| File | What it does |
|---|---|
| `public/index.html` | The page and its styling |
| `public/app.js` | How the page behaves |
| `public/flow.js` | The service cards and their options (no prices) |
| `lib/catalog.js` | **All prices and package rules. Edit this to change pricing.** |
| `lib/pricing.js` | Turns answers into line items (runs on the server only) |
| `lib/ghl.js` | GHL connection |
| `api/session.js` | Checks the visitor came through the GHL form |
| `api/quote.js` | Returns the priced quote |
| `api/finish.js` | Saves the quote to GHL (note, tags, opportunity) |

## 1. Put it on GitHub

1. github.com → **New repository** → name it `nov8rs-quote` → **Private** → Create.
2. Click **uploading an existing file**, drag in everything inside this folder (not the folder itself), **Commit changes**.

## 2. Deploy on Vercel

1. vercel.com → **Add New → Project** → import `nov8rs-quote`.
2. Leave every setting as it is → **Deploy**.
3. Open `https://YOUR-PROJECT.vercel.app/?email=test@test.com`. You'll see a **Preview mode** badge: the builder works, but nothing is saved to GHL yet. Click through a few quotes to check it.

## 3. Get these from GHL

| What | Where |
|---|---|
| Private Integration token | Settings → Private Integrations → Create. Give it: View/Edit Contacts, View/Edit Opportunities |
| Location ID | Settings → Business Profile |
| Pipeline ID + "Quote built" stage ID | Create a pipeline "Quote" with stages: Quote started → Quote built → Call booked → Paid |
| Brett's calendar link | Calendars → Brett's calendar → share link |

## 4. Add them to Vercel

Vercel → your project → **Settings → Environment Variables**. Add each one:

| Name | Value |
|---|---|
| `GHL_TOKEN` | the Private Integration token |
| `GHL_LOCATION_ID` | location ID |
| `GHL_PIPELINE_ID` | pipeline ID |
| `GHL_STAGE_QUOTE_BUILT` | stage ID for "Quote built" |
| `BRETT_CALENDAR_URL` | Brett's booking link |
| `SITE_URL` | `https://nov8rs.io` |
| `SESSION_SECRET` | any long random string (mash the keyboard, 40+ characters) |

Then **Deployments → ⋯ → Redeploy**. The Preview mode badge disappears.

Never paste the token into GitHub, chat or the page.

## 5. Point the GHL pop-up form here

In the form's on-submit settings, choose **Open URL / redirect** and use:

```
https://YOUR-PROJECT.vercel.app/?email={{contact.email}}&first_name={{contact.first_name}}&company={{contact.company_name}}
```

**Test this first.** Submit the form with your own email. The builder should open and say "Here's your pricing, [your name]" on the quote screen. If it shows "Start your quote on nov8rs.io", the email didn't come through in the link: check whether GHL filled in the `{{ }}` fields, or whether the form has an option to pass form fields as URL parameters instead.

Only the `email` is required. The builder checks that email exists as a GHL contact before showing any prices, so people can't skip the pop-up.

## 6. Use your own domain

Vercel → **Settings → Domains** → add `quote.nov8rs.io`. Vercel shows one DNS record (a CNAME). Add it where nov8rs.io's DNS is managed. Then update the form redirect to `https://quote.nov8rs.io/...`.

## What lands in GHL

When someone reaches their quote:
- **Note** on the contact with the quote ID, every line item and price, totals and all their answers.
- **Tags:** `quote-built`, plus `quote-ready` or `quote-needs-review`, and `on-pack`, `pack-offer-shown`, `pack-offer-accepted` where they apply.
- **Opportunity** moved to "Quote built", valued at one-time + 12 months of monthly.

When they click "Talk to Brett": tag `wants-call`, and Brett's calendar opens on the page.

Build GHL workflows off these tags: reminders for `quote-built` without a booking, a heads-up to Brett on `wants-call`, team review on `quote-needs-review`.

## Changing prices

Open `lib/catalog.js` on GitHub → pencil icon → edit the number → **Commit changes**. Vercel redeploys in about a minute.

## Pricing assumptions to confirm

- Final one-time and monthly totals are rounded to the nearest amount ending in 7 (2,994 → 2,997 · 3,999 → 3,997). A "Rounding" line on the quote keeps the table adding up. Turn it off with `roundToSeven: false` in `lib/catalog.js`.
- Prices are the PL Fulfilment 10-26 sheet.
- Packs: Traffic for 1 ad platform, Convert for 2–5. A pack is never used when it would cost less than ad management alone (`packNeverBelowAdsOnly`), so 4–5 platforms + GAS-EO are priced separately.
- Each ad platform counts as one campaign.
- Packs include the GAS-EO setup.
- Launch fee is charged per platform; management starts month 2.
- AI Storefront / Salesforce include the website; page add-ons aren't charged on top.
- Clients already on the Profit Lifter CRM aren't charged the $297/mo platform again.
- More than 15 pages, more than 5 platforms, non-local GAS-EO scopes, custom work, VA talent, and list building go to review.

## Phase 2

Stripe payment ("Pay now") on the quote screen, a kickoff-call booking page after payment, and the payment → GHL update.
