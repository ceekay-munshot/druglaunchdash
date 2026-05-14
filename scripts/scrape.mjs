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
 *
 * Two-pass pipeline:
 *   1) Press-release extraction (per source URL) → captures launches but
 *      rarely yields an MRP because press releases seldom quote retail price.
 *   2) Price hydration (per NEW row) → second Firecrawl /scrape against
 *      1mg.com/search/all?name=<brand> to fill the price field. Only runs
 *      for newly-discovered rows so existing rows (and budget) are unaffected.
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

// ── Companies to scrape (the 8 active ones) ──────────────────────
const SOURCES = [
  { company: 'Mankind Pharma',     url: 'https://www.mankindpharma.com/media/press-release/' },
  { company: 'Eris Lifesciences',  url: 'https://eris.co.in/press-release/' },
  { company: 'Sun Pharma',         url: 'https://sunpharma.com/media/' },
  { company: 'Cipla',              url: 'https://www.cipla.com/press-releases-statements/' },
  { company: 'Alkem',              url: 'https://www.alkemlabs.com/investors/press-release' },
  { company: 'Corona Remedies',    url: 'https://www.coronaremedies.com/news/' },
  { company: 'Torrent Pharma',     url: 'https://www.torrentpharma.com/investors-media.html' },
  { company: 'Natco Pharma',       url: 'https://www.natcopharma.co.in/insights/news-and-announcements' },
];

// ── Schema Firecrawl is asked to populate per URL ───────────────────
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
    existingBrand: { type: 'string', description: 'Name of a COMPETITOR market-leading brand for the same molecule (from any company OTHER than the buyer). Dash (—) if none. The buyer\'s own pre-existing brand on this molecule is auto-derived in the dashboard — do NOT include it here.' },
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

════════════════════════════════════════════════════════════════════════
STRICT NO-GUESS MODE — APPLIES TO EVERY FIELD
════════════════════════════════════════════════════════════════════════
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
  • existingBrand: COMPETITOR brands only — i.e., a market-leading brand
    from a company OTHER than the buyer that already sells the same
    molecule (e.g., "Telma" for Glenmark when reporting a Mankind launch
    of telmisartan). Do NOT include the buyer's own pre-existing brand
    here — that's auto-derived by the dashboard. Otherwise "—".
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

// ── Price-lookup (1mg) — fills MRP for new rows whose press release didn't
// quote a price. Strict no-guess: returns null if 1mg has no exact-brand
// match, so we never write a fabricated number into launches.json.
const PRICE_LOOKUP_SCHEMA = {
  type: 'object',
  properties: {
    price: {
      type: ['string', 'null'],
      description: 'Retail MRP string for the smallest typical pack, formatted like "₹190 / strip of 10 (625 mg)" preserving currency, pack size, and strength. Null if no exact-brand match on the page.',
    },
  },
  required: ['price'],
};

const PRICE_LOOKUP_PROMPT_TEMPLATE = `You are reading 1mg.com's search-results page for the brand "<<BRAND>>".

TASK: Find the listing whose displayed brand name matches "<<BRAND>>"
(case-insensitive; ignore punctuation, hyphens, and dosage suffixes). Return
the MRP for the smallest typical pack.

OUTPUT FORMAT for the \`price\` field:
  • A string like "₹190 / strip of 10 (625 mg)" — preserve the displayed
    currency, pack-size, and strength so the dashboard can show the unit.
  • If multiple strengths are listed, pick the LOWEST-strength pack.
  • If the page shows "No results", or only shows loosely-related brands
    that don't match the query, return null.

STRICT NO-GUESS: a null is far better than a wrong number. Do NOT estimate,
infer, or fabricate. Only return a price you can read directly from a
matching listing on the page.`;

// Reduce a brand string down to its lead token for searching. Examples:
//   'Telmikind / Telmikind-H'        → 'Telmikind'
//   'Manforce (condoms + rx)'        → 'Manforce'
//   'Yurpeak (tirzepatide)'          → 'Yurpeak'
function cleanBrandForSearch(brand) {
  if (!brand) return '';
  return String(brand).split(/[/(+]/)[0].trim();
}

async function lookupPriceOn1mg(brand) {
  const search = cleanBrandForSearch(brand);
  if (!search) return null;
  const url = `https://www.1mg.com/search/all?name=${encodeURIComponent(search)}`;
  const body = {
    url,
    formats: ['json'],
    jsonOptions: {
      schema: PRICE_LOOKUP_SCHEMA,
      prompt: PRICE_LOOKUP_PROMPT_TEMPLATE.replace(/<<BRAND>>/g, search),
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
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const price = json?.data?.json?.price;
  if (!price || typeof price !== 'string' || !price.trim()) return null;
  return price.trim();
}

function priceIsEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'number') return false;
  const s = String(v).trim();
  return s === '' || s === '—' || s === '-';
}

// Generalised "is this field blank?" check used by the merge-fill pass.
// Press releases often arrive in tranches — first the headline ("Sun
// acquires brands from Organon"), then days later the molecule list, the
// indication, the chronic/acute marker, etc. We treat null / "" / em-dash /
// hyphen as blank so a richer subsequent extraction can fill them in.
function fieldIsEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'number') return false;
  const s = String(v).trim();
  return s === '' || s === '—' || s === '-';
}

// Merge a fresh extraction into an existing row: keep every non-empty field
// from `existing`, and fill in only the slots that were blank with whatever
// `fresh` has. Returns { merged, filledKeys } where filledKeys lists the
// fields that just got hydrated (used for logging + retry-price-lookup).
function mergeRow(existing, fresh) {
  const out = { ...existing };
  const filledKeys = [];
  for (const [k, v] of Object.entries(fresh)) {
    if (fieldIsEmpty(out[k]) && !fieldIsEmpty(v)) {
      out[k] = v;
      filledKeys.push(k);
    }
  }
  return { merged: out, filledKeys };
}

// ── Helpers ─────────────────────────────────────────────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function rowKey(row) {
  return `${(row.brand || '').trim().toLowerCase()}|${(row.date || '').trim()}|${(row.seller || '').trim().toLowerCase()}|${(row.buyer || '').trim().toLowerCase()}`;
}

// Mirror of src/data/mockData.js's isJunkScrapedRow. Drops obviously-bogus
// LLM extractions at ingestion so they never make it into launches.json.
// Keep this list in sync with the frontend constant on every change.
const JUNK_BRAND_PATTERNS = [
  /^—+$|^-+$|^n\/a$/i,
  /^\[.*\]$/,
  /^new drug [a-z]\b/i,
  /^acquired brand [a-z]\b/i,
  /^biosimilar drug [a-z]\b/i,
  /^in[- ]?license[d]? (drug|product) [a-z]\b/i,
  /^company [a-z]( |\b)/i,
  /^(brandx|brandy)\b/i,
  /^(acmebio|novelgen|healthplus|healmax|medicore|nutricare)\b/i,
  /^eye care products$/i,
  /^gsk['’]?s?\s+(brands|portfolio)$/i,
  /^glaxosmithkline brands$/i,
  /^novel antibiotic( combination)?$/i,
  /^alkem (antibiotic combo|ophthalmology products)$/i,
  /^cipla\b.*(acquisition of generic|in[- ]?licensing|new (cardiovascular|antihypertensive|antibiotic))/i,
  /'s new (cardiovascular|antihypertensive|antibiotic|generic)\b/i,
  /^api stake in/i,
  /^(alkem|pharmazz inc\.?|novartis india)$/i,
];
const JUNK_SOURCE_HOSTS = new Set([
  'example.com', 'www.example.com',
  'examplepharma.com', 'www.examplepharma.com',
  'company.com', 'www.company.com',
  'pharmaceuticalcompany.com', 'www.pharmaceuticalcompany.com',
]);
// See src/data/mockData.js for context on each entry. Mirror this list
// when updating the frontend filter — the scraper applies it at ingestion.
const JUNK_SOURCE_URLS = new Set([
  'https://www.mankindpharma.com/products/new-gst-prices/',
  'https://www.mankindpharma.com/press-release/levomilnacipran-launch',
  'https://www.mankindpharma.com/press-release/lizardin-launch',
  'https://www.cipla.com/press-releases/expedition-launch',
]);
function junkSourceUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (JUNK_SOURCE_URLS.has(trimmed)) return true;
  try {
    return JUNK_SOURCE_HOSTS.has(new URL(trimmed).hostname.toLowerCase());
  } catch {
    return false;
  }
}
function isJunkScrapedRow(raw) {
  if (!raw || typeof raw !== 'object') return true;
  const brand = String(raw.brand ?? '').trim();
  if (!brand) return true;
  if (JUNK_BRAND_PATTERNS.some((re) => re.test(brand))) return true;
  if (junkSourceUrl(raw.sourceUrl)) return true;
  return false;
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

// ── Pass 1.5: stub-targeted detail-page enrichment ──────────────────
// Index-page extractions sometimes only catch the deal headline ("Sun
// Pharma acquires Organon brands") and leave molecule / therapy /
// indication / chronic-acute / pricing blank. The detail page (or its
// linked PDF) usually carries more detail, but blanket-scraping every
// detail page would 50× the Firecrawl bill. So we only re-scrape rows
// that are actually empty AND were last attempted ≥ENRICH_RETRY_DAYS ago,
// capped at MAX_DETAIL_SCRAPES_PER_RUN per run for predictable spend.

const ENRICH_RETRY_DAYS = 7;
const MAX_DETAIL_SCRAPES_PER_RUN = 10;
// Number of empty descriptive fields that qualifies a row as a "stub"
// — must match the threshold in src/data/mockData.js's isStubRow.
const STUB_BLANKS_THRESHOLD = 3;
// Camel-case scrape-side equivalents of the dashboard's stub-detection
// fields. (The frontend uses Excel column labels; the scraper uses the
// camelCase originals from the rowItemSchema.)
const STUB_FIELDS_SCRAPE = ['molecule', 'therapy', 'indication', 'chronicAcute', 'existingBrand', 'price'];

function countBlanks(row) {
  let n = 0;
  for (const k of STUB_FIELDS_SCRAPE) if (fieldIsEmpty(row[k])) n += 1;
  return n;
}

function isStubScrapeRow(row) {
  return countBlanks(row) >= STUB_BLANKS_THRESHOLD;
}

// Set of index URLs Pass 1 already covers; skipping these in Pass 1.5
// avoids burning credits re-doing index extractions.
const SOURCE_URLS = new Set(SOURCES.map((s) => s.url));

function shouldRetryStub(row, now = Date.now()) {
  if (!row.sourceUrl || typeof row.sourceUrl !== 'string') return false;
  if (SOURCE_URLS.has(row.sourceUrl.trim())) return false;
  if (!row.lastEnrichmentAttempt) return true;
  const last = new Date(row.lastEnrichmentAttempt).getTime();
  if (isNaN(last)) return true;
  return now - last >= ENRICH_RETRY_DAYS * 86_400_000;
}

// Same Firecrawl /scrape call as scrapeOne(), but pointed at a single
// press-release URL instead of a company index. The extraction prompt and
// schema are identical — Firecrawl/LLM sees fewer rows to extract because
// the page is one event, but everything else stays the same.
async function scrapeDetailPage(url) {
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
  return json?.data?.json?.rows || [];
}

// Operates on the byKey insertion-ordered map from main(): identifies
// stale stub rows, re-scrapes their sourceUrl, and merges any newly-
// disclosed fields back into the same row (or appends genuine new
// brand-rows the press release reveals). Returns the list of rows that
// gained at least one field on this run, so Pass 2 can retry price-
// hydration on them too.
async function passEnrichStubs(byKey) {
  if ((process.env.SCRAPE_STUB_ENRICHMENT || 'on').toLowerCase() === 'off') {
    console.log('▶ Pass 1.5 (stub enrichment): SKIPPED (SCRAPE_STUB_ENRICHMENT=off)');
    return [];
  }

  const now = Date.now();
  const candidates = [];
  for (const r of byKey.values()) {
    if (isStubScrapeRow(r) && shouldRetryStub(r, now)) candidates.push(r);
  }
  // Oldest-attempted first so each weekly run cycles through the backlog
  // rather than getting stuck on the same 10 rows.
  candidates.sort((a, b) => {
    const aT = a.lastEnrichmentAttempt ? new Date(a.lastEnrichmentAttempt).getTime() : 0;
    const bT = b.lastEnrichmentAttempt ? new Date(b.lastEnrichmentAttempt).getTime() : 0;
    return aT - bT;
  });
  const limit = candidates.slice(0, MAX_DETAIL_SCRAPES_PER_RUN);
  console.log(
    `▶ Pass 1.5 (stub enrichment): ${candidates.length} eligible · re-scraping top ${limit.length} ` +
      `(cap ${MAX_DETAIL_SCRAPES_PER_RUN}/run, retry every ${ENRICH_RETRY_DAYS} days)`
  );

  const enrichedRows = [];
  for (const stub of limit) {
    const url = stub.sourceUrl;
    const tag = `📋 ${stub.brand} (${stub.buyer})`;
    // Mark the attempt regardless of outcome so a flaky URL doesn't burn
    // budget on every subsequent run.
    stub.lastEnrichmentAttempt = new Date().toISOString();
    try {
      const detailRows = await scrapeDetailPage(url);
      let mergedCount = 0;
      let addedCount = 0;
      for (const r of detailRows) {
        if (!r.brand || !r.date) continue;
        if (isJunkScrapedRow(r)) continue;
        // Carry over the buyer from the stub — detail-page extractions
        // sometimes don't echo the buyer back, but we know it from context.
        if (!r.buyer) r.buyer = stub.buyer;
        const k = rowKey(r);
        if (byKey.has(k)) {
          const cur = byKey.get(k);
          const { merged, filledKeys } = mergeRow(cur, r);
          if (filledKeys.length > 0) {
            byKey.set(k, merged);
            mergedCount += 1;
            enrichedRows.push(merged);
          }
        } else {
          // The detail page revealed a brand that wasn't on the index —
          // append it. Seed lastEnrichmentAttempt so we don't immediately
          // re-scrape the same URL on the next run.
          if (!r.lastEnrichmentAttempt) r.lastEnrichmentAttempt = stub.lastEnrichmentAttempt;
          byKey.set(k, r);
          addedCount += 1;
        }
      }
      console.log(
        `  ${tag} → extracted ${detailRows.length} (merged ${mergedCount}, added ${addedCount})`
      );
    } catch (err) {
      console.error(`  ${tag} FAILED: ${err.message}`);
    }
    // Gentle rate-limit between detail scrapes
    await sleep(1200);
  }
  return enrichedRows;
}

async function main() {
  console.log(`▶ Scraping ${SOURCES.length} sources with Firecrawl …`);
  const existing = await loadExisting();
  // Insertion-ordered map keyed by rowKey. Initial seed = current contents
  // of launches.json so subsequent merges don't shuffle existing rows
  // around. New keys get appended to the end as we encounter them.
  const byKey = new Map();
  let purgedExisting = 0;
  for (const r of existing) {
    if (isJunkScrapedRow(r)) {
      purgedExisting += 1;
      continue;
    }
    byKey.set(rowKey(r), r);
  }
  console.log(
    `  existing scraped rows: ${existing.length}` +
      (purgedExisting > 0 ? ` (purged ${purgedExisting} junk rows)` : '')
  );

  // Track rows that were either freshly added OR materially enriched by a
  // re-scrape. Pass 2 (price hydration) retargets these so a stub Organon-
  // style row has its 1mg price re-attempted the moment richer extraction
  // fills in the brand identity.
  const newRows = [];           // never-seen-before keys
  const enrichedRows = [];      // existing rows that just gained ≥1 field

  let freshRowCount = 0;
  let mergedRowCount = 0;
  let filledFieldCount = 0;

  for (const src of SOURCES) {
    const tag = `[${src.company}]`;
    try {
      const rows = await scrapeOne(src);
      console.log(`  ${tag} extracted ${rows.length} rows`);
      freshRowCount += rows.length;
      for (const r of rows) {
        if (!r.brand || !r.date) continue;
        if (isJunkScrapedRow(r)) continue;
        const k = rowKey(r);
        if (!byKey.has(k)) {
          // Brand-new row — append to the end of the map and queue for
          // price hydration in Pass 2. Seed lastEnrichmentAttempt so the
          // weekly-cadence stub re-scrape in Pass 1.5 doesn't immediately
          // hit the detail page for a row we just added (we already have
          // what the source page said today).
          if (!r.lastEnrichmentAttempt) r.lastEnrichmentAttempt = new Date().toISOString();
          byKey.set(k, r);
          newRows.push(r);
        } else {
          // Same dealKey already on file. Merge fresh fields into any blank
          // slots in the existing row — this is what lets a 2-day-old
          // "Organon: brand=—, molecule=—, therapy=—" stub auto-enrich
          // when Sun Pharma's release is re-scraped after the company
          // discloses the actual brand list. Non-empty existing fields are
          // preserved (we never clobber curated / previously-scraped data).
          const cur = byKey.get(k);
          const { merged, filledKeys } = mergeRow(cur, r);
          if (filledKeys.length > 0) {
            byKey.set(k, merged);
            mergedRowCount += 1;
            filledFieldCount += filledKeys.length;
            enrichedRows.push(merged);
            console.log(
              `  ${tag} merged ${filledKeys.length} field${filledKeys.length === 1 ? '' : 's'} into "${merged.brand}" (${filledKeys.join(', ')})`
            );
          }
        }
      }
    } catch (err) {
      console.error(`  ${tag} FAILED: ${err.message}`);
    }
    // Gentle rate-limit between sources
    await sleep(1500);
  }

  console.log(
    `  pass 1 summary: ${newRows.length} new · ${mergedRowCount} merged ` +
      `(${filledFieldCount} fields filled) · ${freshRowCount} extracted total`
  );

  // ── Pass 1.5: stub-targeted detail-page enrichment ─────────────────
  // Re-scrapes the press-release URL of stub rows (≥3 blanks, last attempt
  // ≥7 days ago), capped at 10 detail-scrapes per run. Any newly-disclosed
  // fields merge back into the same row; brand-rows the press release
  // reveals (that weren't on the index summary) get appended.
  const stubEnriched = await passEnrichStubs(byKey);
  enrichedRows.push(...stubEnriched);

  // ── Pass 2: price hydration ────────────────────────────────────────
  // Looks up retail MRP on 1mg for any row that's still missing one — both
  // brand-new rows AND existing rows that just got enriched (their brand
  // identity may have only just become known on this run, so a previous
  // 1mg lookup would have failed). Rows whose price was already populated
  // are skipped to keep Firecrawl budget under control.
  const priceCandidates = [...newRows, ...enrichedRows].filter(
    (r) => priceIsEmpty(r.price) && !fieldIsEmpty(r.brand)
  );
  if (priceCandidates.length > 0) {
    console.log(`▶ Hydrating prices for ${priceCandidates.length} rows via 1mg.com …`);
    let filled = 0;
    for (const row of priceCandidates) {
      try {
        const price = await lookupPriceOn1mg(row.brand);
        if (price) {
          row.price = price;
          filled += 1;
          console.log(`  ₹ ${row.brand} → ${price}`);
        } else {
          console.log(`  ₹ ${row.brand} → no match on 1mg`);
        }
      } catch (err) {
        console.error(`  ₹ ${row.brand} lookup failed: ${err.message}`);
      }
      await sleep(800);
    }
    console.log(`✔ price hydration: filled ${filled}/${priceCandidates.length} rows`);
  }

  const allRows = [...byKey.values()];
  const payload = {
    generatedAt: new Date().toISOString(),
    rowCount: allRows.length,
    rows: allRows,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `✔ wrote ${OUT_PATH} · ${allRows.length} rows total ` +
      `(+${newRows.length} new, ${mergedRowCount} enriched)`
  );
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});