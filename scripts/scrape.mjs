#!/usr/bin/env node
/**
 * scripts/scrape.mjs
 *
 * Daily scraper. For each tracked company's press-release URL, calls
 * Firecrawl's /v1/scrape endpoint with JSON-extraction mode + our row schema,
 * deduplicates against existing public/launches.json, writes fresh output.
 *
 * Runs in GitHub Actions (see .github/workflows/scrape-launches.yml) OR
 * locally with FIRECRAWL_API_KEY set:
 *     FIRECRAWL_API_KEY=fc_... node scripts/scrape.mjs
 *
 * Append-only: does NOT touch src/data/mockData.js (the curated baseline).
 * Emits public/launches.json — the frontend fetches and merges it over the
 * bundled baseline at mount time (and on Refresh-button click).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'launches.json');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!FIRECRAWL_API_KEY) {
  console.error('✖ FIRECRAWL_API_KEY env var not set');
  process.exit(1);
}

// ── Companies to scrape (the 7 active ones) ──────────────────────────────
const SOURCES = [
  { company: 'Mankind Pharma',     url: 'https://www.mankindpharma.com/media/press-release/' },
  { company: 'Eris Lifesciences',  url: 'https://eris.co.in/press-release/' },
  { company: 'Sun Pharma',         url: 'https://sunpharma.com/media/' },
  { company: 'Cipla',              url: 'https://www.cipla.com/press-releases-statements/' },
  { company: 'Alkem',              url: 'https://www.alkemlabs.com/investors/press-release' },
  { company: 'Corona Remedies',    url: 'https://www.coronaremedies.com/news/' },
  { company: 'Torrent Pharma',     url: 'https://www.torrentpharma.com/investors-media.html' },
];

// ── Schema Firecrawl is asked to populate per URL ─────────────────────────
const rowItemSchema = {
  type: 'object',
  properties: {
    brand: { type: 'string', description: 'Brand / product name being launched, acquired, or in-licensed.' },
    launchType: {
      type: 'string',
      enum: ['Acquired', 'In-licensed', 'Own Launched'],
      description: 'Own Launched for own NCE / generic / line-extension; Acquired for brand or company acquisition; In-licensed for patent licence or co-marketing.',
    },
    date: { type: 'string', description: 'ISO YYYY-MM-DD date of the event. If only month/year known, pick day 01.' },
    seller: { type: 'string', description: 'Counterparty who sold / licensed the asset. Dash (—) for own-launched.' },
    dealType: { type: 'string', description: 'Brand Acquisition, Company Acquisition, Brand Portfolio Acquisition, In-license (India), Co-marketing, NCE Launch, Generic Launch, Biosimilar Launch, Line Extension, Consumer Launch, etc.' },
    molecule: { type: 'string', description: 'Active molecule(s) involved. If combination, use plus-separated list.' },
    therapy: { type: 'string', description: 'Therapy area: Cardiology / Anti-Diabetic / Anti-Infectives / Gastroenterology / Dermatology / Oncology / Respiratory / Neurology / CNS / Women\'s Health / Urology / Nephrology / Immunology / Nutraceuticals / Pain Management / Consumer Health etc.' },
    indication: { type: 'string', description: 'Disease / clinical indication.' },
    existingBrand: { type: 'string', description: 'Name of an existing market-leading brand for the same molecule, if known. Dash (—) if none.' },
    chronicAcute: {
      type: ['string', 'null'],
      enum: ['Chronic', 'Acute', '—', null],
      description: 'Chronic / Acute. Only fill if the release explicitly indicates the duration of therapy. If unstated, return null or "—" — do NOT guess.',
    },
    price: {
      type: ['string', 'number', 'null'],
      description: 'Retail MRP in INR for the smallest typical pack. Numeric preferred. If only available as a non-unit launch price like "Rs 84,375 / injection", pass the full string. Null if no verifiable MRP from the 6 listed Indian pharmacy sources.',
    },
    sourceUrl: { type: 'string', description: 'Direct URL of the press release / news item.' },
  },
  required: ['brand', 'launchType', 'date', 'dealType', 'molecule', 'therapy', 'chronicAcute'],
};

const extractionSchema = {
  type: 'object',
  properties: { rows: { type: 'array', items: rowItemSchema } },
};

const extractionPrompt = `You are reading a pharmaceutical company's press-release index page.

EXTRACT every announcement that is ONE of:
  • a new drug / brand launch (own NCE, generic launch, biosimilar launch, line extension, device launch)
  • a brand or company acquisition (Indian market)
  • an in-licensing or co-marketing deal (Indian market)

SKIP operational / corporate news (earnings releases, investor-day briefings,
appointments, dividends, CSR events, manufacturing-facility openings, awards,
partnerships that are NOT product-related, general strategic commentary).

For India focus: prefer India-market events. Include global events only if they
are likely to reach India (e.g., US FDA approval of a drug the Indian company
owns globally).

═══════════════════════════════════════════════════════════════════════════
STRICT NO-GUESS MODE — APPLIES TO EVERY FIELD
═══════════════════════════════════════════════════════════════════════════
For every field below, populate it ONLY if the press release / linked PDF
states the value EXPLICITLY (verbatim or near-verbatim). If the press
release does not say it, set the field to "—" (em-dash) for strings or
null for numbers. NEVER infer, guess, fabricate, or fill from background
knowledge.

Specific guardrails:
  • indication: only fill if the disease / condition is named in the
    release. Do NOT infer indication from the molecule name. Example:
    "semaglutide" alone is NOT enough to write "Type 2 Diabetes" — the
    release must say so. If unstated, use "—".
  • therapy: only fill if the release uses a clear therapy-area phrase
    (e.g., "anti-diabetic", "oncology", "respiratory"). Do NOT infer
    from the brand name pattern. If unstated, use "—".
  • molecule: only fill if explicitly named (active ingredient, INN, or
    generic name). Do NOT guess from brand. If unstated, use "—".
  • dealType: pick the closest match from the canonical list (NCE Launch,
    Generic Launch, Biosimilar Launch, Line Extension, Device Launch,
    Brand Acquisition, Brand Portfolio Acquisition, Company Acquisition,
    In-license (India), Co-marketing, Consumer Launch). If the release
    is ambiguous, use "—".
  • chronicAcute: only fill if the release explicitly indicates duration
    (e.g., "chronic disease", "long-term therapy", "acute infection").
    If unstated, use "—" (the schema enum allows this — return null).
  • date: must come from the release date or an explicit launch date in
    the body. If the release has no date, SKIP the row entirely.
  • existingBrand: only fill if the release names a competitor / leading
    brand for the same molecule. Otherwise "—".
  • sourceUrl: MUST be the exact URL of the specific press release
    announcing THIS brand. Do NOT reuse a sourceUrl across multiple rows.
    If you can't find a unique press-release URL for the brand, drop the
    row.

Quality bar: a partially-filled row with honest "—"s is far better than
a confidently-wrong fabricated row. The dashboard treats "—" as "data
not available" and renders it gracefully.

PRICE SOURCING RULES for the \`price\` field:
  • Populate \`price\` with retail MRP in INR for the smallest typical pack
    (strip of 10 tablets / 1 vial / 1 injection / 1 inhaler), sourced ONLY
    from these Indian pharmacy URLs (cross-check at least one when feasible):
      - https://www.1mg.com/
      - https://www.netmeds.com/
      - https://pharmeasy.in/
      - https://www.apollopharmacy.in/
      - https://www.medplusmart.com/
      - https://www.medindia.net/drug-price/brand/index.htm
  • If the press release quotes a launch MRP directly (e.g., "priced at
    Rs 84,375 per injection"), you may use that figure and pass it as a
    string ("Rs 84,375 / injection").
  • If no verifiable MRP can be found across the 6 sources above, leave
    \`price\` as null. Do NOT estimate or guess.

Use \`sourceUrl\` to link back to the specific press-release page for each
event (not the index page). Dates must be ISO YYYY-MM-DD.`;

// ── Helpers ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function rowKey(row) {
  return `${(row.brand || '').trim().toLowerCase()}|${(row.date || '').trim()}|${(row.seller || '').trim().toLowerCase()}|${(row.buyer || '').trim().toLowerCase()}`;
}

async function loadExisting() {
  try {
    const raw = await fs.readFile(OUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.rows) ? parsed.rows : [];
  } catch {
    return [];
  }
}

// Firecrawl /v1/scrape with JSON extraction mode
async function scrapeOne({ company, url }) {
  const body = {
    url,
    formats: ['json'],
    jsonOptions: {
      schema: extractionSchema,
      prompt: extractionPrompt,
    },
    onlyMainContent: true,
    waitFor: 2500,
  };

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firecrawl ${res.status} for ${url}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const rows = json?.data?.json?.rows || [];
  return rows.map((r) => ({ ...r, buyer: company }));
}

async function main() {
  console.log(`▶ Scraping ${SOURCES.length} sources with Firecrawl …`);
  const existing = await loadExisting();
  const existingKeys = new Set(existing.map(rowKey));
  console.log(`  existing scraped rows: ${existing.length}`);

  const newRows = [];
  for (const src of SOURCES) {
    const tag = `[${src.company}]`;
    try {
      const rows = await scrapeOne(src);
      console.log(`  ${tag} extracted ${rows.length} rows`);
      for (const r of rows) {
        if (!r.brand || !r.date) continue;
        if (!existingKeys.has(rowKey(r))) {
          newRows.push(r);
          existingKeys.add(rowKey(r));
        }
      }
    } catch (err) {
      console.error(`  ${tag} FAILED: ${err.message}`);
    }
    // Gentle rate-limit between sources
    await sleep(1500);
  }

  const allRows = [...existing, ...newRows];
  const payload = {
    generatedAt: new Date().toISOString(),
    rowCount: allRows.length,
    rows: allRows,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✔ wrote ${OUT_PATH} · ${allRows.length} rows (+${newRows.length} new)`);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
