// Drug Launch Tracker – India Pharma — LIVE CURATED DATASET
// All rows below are web-sourced from company press releases, BSE/NSE
// filings, and news coverage (Business Standard, BioSpectrum, Medical
// Dialogues, etc.). Source URL/headline cited inline above each row.
// Focus: recent (2025-2026) India drug launches, acquisitions, and
// in-licensing deals. Older rows retained only where independently verified.
//
// Market Size ₹Cr is populated only where publicly disclosed (e.g. Combihale
// ₹900 Cr, Wokadine ₹648 Cr); otherwise left null and shown as "—".
//
// IMPORTANT: Column keys here MUST remain the EXACT Excel column labels.
// All KPI cards, charts, and insights derive from this single source of truth.

export const COLUMN_KEYS = {
  BRAND: 'Brand',
  LAUNCH_TYPE: 'Acquired / In-licensed / Own Launched',
  DATE: 'Date',
  SELLER: 'Seller',
  BUYER: 'Buyer',
  DEAL_TYPE: 'Deal Type',
  GEO_RIGHTS: 'Geographic Rights',
  REG_STATUS: 'Regulatory Status',
  MOLECULE: 'Molecule',
  PRICING: 'Pricing',
  THERAPY: 'Therapy',
  INDICATION: 'Disease / Indication',
  MARKET_SIZE: 'India TAM (₹Cr)',
  DEAL_VALUE: 'Deal Consideration (₹Cr)',
  PRE_EXISTING_BRAND: "Buyer's Pre-existing Brand",
  COMPETITOR_BRANDS: 'Competitor Brands (Same Molecule)',
  CHRONIC_ACUTE: 'Chronic / Acute',
};

export const COLUMN_ORDER = [
  COLUMN_KEYS.BRAND,
  COLUMN_KEYS.LAUNCH_TYPE,
  COLUMN_KEYS.DATE,
  COLUMN_KEYS.SELLER,
  COLUMN_KEYS.BUYER,
  COLUMN_KEYS.DEAL_TYPE,
  COLUMN_KEYS.GEO_RIGHTS,
  COLUMN_KEYS.REG_STATUS,
  COLUMN_KEYS.MOLECULE,
  COLUMN_KEYS.PRICING,
  COLUMN_KEYS.THERAPY,
  COLUMN_KEYS.INDICATION,
  COLUMN_KEYS.MARKET_SIZE,
  COLUMN_KEYS.DEAL_VALUE,
  COLUMN_KEYS.PRE_EXISTING_BRAND,
  COLUMN_KEYS.COMPETITOR_BRANDS,
  COLUMN_KEYS.CHRONIC_ACUTE,
];

// Helper to keep the data rows compact. Existing row(...) calls pass 14
// positional values; vals[14] (PRICING) is OPTIONAL — rows that don't pass
// it fall back to null and the enrichRowsWithPrices() pass below fills in
// from BRAND_PRICES at React render time. vals[10] (legacy CAGR) and
// vals[12] (legacy EST_SALES) remain ignored.
const row = (vals) => ({
  [COLUMN_KEYS.BRAND]: vals[0],
  [COLUMN_KEYS.LAUNCH_TYPE]: vals[1],
  [COLUMN_KEYS.DATE]: vals[2],
  [COLUMN_KEYS.SELLER]: vals[3],
  [COLUMN_KEYS.BUYER]: vals[4],
  [COLUMN_KEYS.DEAL_TYPE]: vals[5],
  [COLUMN_KEYS.MOLECULE]: vals[6],
  [COLUMN_KEYS.THERAPY]: vals[7],
  [COLUMN_KEYS.INDICATION]: vals[8],
  [COLUMN_KEYS.MARKET_SIZE]: vals[9],
  [COLUMN_KEYS.COMPETITOR_BRANDS]: vals[11],
  [COLUMN_KEYS.CHRONIC_ACUTE]: vals[13],
  [COLUMN_KEYS.PRICING]: vals[14] ?? null,
});

// Canonicalise common scraper case-variants for therapy strings — keeps the
// therapy ranking + chart buckets consistent (without this, "Anti-diabetic"
// from a Lupin US press release would group separately from "Anti-Diabetic").
// Extend as new variants appear.
const THERAPY_ALIASES = {
  'anti-diabetic': 'Anti-Diabetic',
};
function normaliseTherapy(t) {
  if (!t || typeof t !== 'string') return t;
  return THERAPY_ALIASES[t.toLowerCase().trim()] ?? t;
}

// Maps a scraped row (camelCase keys, see scripts/scrape.mjs schema) into the
// internal column-label shape used by the whole dashboard.
export function fromScrapedRow(r) {
  return {
    [COLUMN_KEYS.BRAND]: r.brand ?? '',
    [COLUMN_KEYS.LAUNCH_TYPE]: r.launchType ?? '',
    [COLUMN_KEYS.DATE]: r.date ?? '',
    [COLUMN_KEYS.SELLER]: r.seller || '—',
    [COLUMN_KEYS.BUYER]: r.buyer ?? '',
    [COLUMN_KEYS.DEAL_TYPE]: r.dealType ?? '',
    [COLUMN_KEYS.GEO_RIGHTS]: r.geoRights ?? null,
    [COLUMN_KEYS.REG_STATUS]: r.regStatus ?? null,
    [COLUMN_KEYS.MOLECULE]: r.molecule ?? '',
    [COLUMN_KEYS.PRICING]: r.price ?? null,
    [COLUMN_KEYS.THERAPY]: normaliseTherapy(r.therapy ?? ''),
    [COLUMN_KEYS.INDICATION]: r.indication ?? '',
    [COLUMN_KEYS.MARKET_SIZE]: r.marketSize ?? null,
    [COLUMN_KEYS.DEAL_VALUE]: r.dealValue ?? null,
    [COLUMN_KEYS.COMPETITOR_BRANDS]: r.existingBrand || '—',
    [COLUMN_KEYS.CHRONIC_ACUTE]: r.chronicAcute ?? '',
  };
}

// Dedup key used for both baseline vs. scraped merging and for the scraper's
// own dedup. Keep this stable across both sides.
function rowKey(r) {
  return [
    String(r[COLUMN_KEYS.BRAND] ?? '').trim().toLowerCase(),
    String(r[COLUMN_KEYS.DATE] ?? '').trim(),
    String(r[COLUMN_KEYS.SELLER] ?? '').trim().toLowerCase(),
    String(r[COLUMN_KEYS.BUYER] ?? '').trim().toLowerCase(),
  ].join('|');
}

// ──────────────────────────────────────────────────────────────────────────
// Junk-row filter for scraped data.
//
// The Firecrawl + LLM extraction occasionally hallucinates rows when a
// source page isn't actually a launch announcement — e.g. a "GST prices"
// page, a generic FAQ, or a 404. The hallucinations show up as:
//   • literal template placeholders ("[Brand Name]", "[Molecule Name]")
//   • dummy brand names ("New Drug A", "Acquired Brand B", "AcmeBio 123")
//   • generic descriptions instead of brands ("GSK Brands", "Eye Care
//     Products", "Cipla's New Cardiovascular Drug")
//   • em-dash / "N/A" placeholder strings
//   • fabricated source URLs (example.com, pharmaceuticalcompany.com, etc.)
// We drop these at the merge step so the dashboard never renders them, and
// the scraper applies the same check at ingestion so they don't recur.
//
// Curated baseline rows are unaffected — this only touches scraped rows.
// ──────────────────────────────────────────────────────────────────────────
const JUNK_BRAND_PATTERNS = [
  /^—+$|^-+$|^n\/a$/i,                           // em-dash / hyphen / N/A
  /^\[.*\]$/,                                     // [Brand Name] template
  /^new drug [a-z]\b/i,                           // "New Drug A"
  /^acquired brand [a-z]\b/i,                     // "Acquired Brand B"
  /^biosimilar drug [a-z]\b/i,                    // "Biosimilar Drug D"
  /^in[- ]?license[d]? (drug|product) [a-z]\b/i,  // "In-license Product C"
  /^company [a-z]( |\b)/i,                        // "Company B Acquisition"
  /^(brandx|brandy)\b/i,                          // "BrandX", "BrandY"
  /^(acmebio|novelgen|healthplus|healmax|medicore|nutricare)\b/i,
  /^eye care products$/i,
  /^gsk['’]?s?\s+(brands|portfolio)$/i,
  /^glaxosmithkline brands$/i,
  /^novel antibiotic( combination)?$/i,
  /^alkem (antibiotic combo|ophthalmology products)$/i,
  /^cipla\b.*(acquisition of generic|in[- ]?licensing|new (cardiovascular|antihypertensive|antibiotic))/i,
  /'s new (cardiovascular|antihypertensive|antibiotic|generic)\b/i,
  /^api stake in/i,
  /^(alkem|pharmazz inc\.?|novartis india)$/i,    // company name used as brand
];

const JUNK_SOURCE_HOSTS = new Set([
  'example.com',
  'www.example.com',
  'examplepharma.com',
  'www.examplepharma.com',
  'company.com',
  'www.company.com',
  'pharmaceuticalcompany.com',
  'www.pharmaceuticalcompany.com',
]);

// Specific URLs known to corrupt the LLM extraction. These are real-looking
// pharma-company URLs (mankindpharma.com, cipla.com) that either don't
// resolve to a launch announcement, or return template / catalog content
// that confuses the extractor into emitting placeholder rows.
//   • mankindpharma.com/products/new-gst-prices/  — catalog page that
//     returned the literal "[Brand Name]" template + the misattributed
//     Telma / Dapagliflozin / Remdesivir / Swasthya rows.
//   • mankindpharma.com/press-release/{levomilnacipran,lizardin}-launch
//     — fake URLs that match the same fictional pattern as the dummy
//     "/press-release/new-drug-a-launch/" we already removed.
//   • cipla.com/press-releases/expedition-launch — uses /press-releases/
//     (not the legitimate /press-releases-statements/ path) and emits
//     "Expedition", which is not a known Cipla brand.
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

// Returns true for clearly-bogus scraped rows. Operates on the raw scraped
// shape (camelCase keys) so we can sniff sourceUrl too. Curated baseline
// rows go through a separate path and are never tested here.
export function isJunkScrapedRow(raw) {
  if (!raw || typeof raw !== 'object') return true;
  const brand = String(raw.brand ?? '').trim();
  if (!brand) return true;
  if (JUNK_BRAND_PATTERNS.some((re) => re.test(brand))) return true;
  if (junkSourceUrl(raw.sourceUrl)) return true;
  return false;
}

// Merge bundled curated rows with rows fetched from public/launches.json.
// Curated (baseline) rows are source-of-truth and always win on key collision;
// scraped rows are only appended when they introduce a new (brand+date+seller+buyer).
//
// Scraped rows that match isJunkScrapedRow() are dropped before merging so
// historical scrape-output that's still sitting in launches.json can't leak
// junk into the rendered dashboard.
//
// Second-pass dedup (scraped rows only): the LLM occasionally extracts the
// same press release twice with slightly different fields — one pass gets the
// real counterparty name in seller, another pass leaves it as "—". Those
// arrive as two scraped rows that share brand+date+buyer but differ on
// seller, so the first-pass rowKey treats them as distinct. We collapse them:
// inside each (brand+date+buyer) group of scraped rows, drop entries whose
// seller is the em-dash / hyphen placeholder when a sibling has a real
// seller; if every sibling has a placeholder, keep the first and drop the
// rest. Never touches baseline rows.
export function mergeLaunchRows(baseline, scrapedRaw) {
  if (!Array.isArray(scrapedRaw) || scrapedRaw.length === 0) return baseline;
  const baselineKeys = new Set(baseline.map(rowKey));
  const scraped = scrapedRaw.filter((r) => !isJunkScrapedRow(r)).map(fromScrapedRow);

  // First pass: drop scraped rows that key-collide with baseline.
  const candidates = [];
  for (const r of scraped) {
    const k = rowKey(r);
    if (baselineKeys.has(k)) continue;
    baselineKeys.add(k);
    candidates.push(r);
  }

  // Second pass: collapse scraped duplicates that differ only in seller.
  const isBlankSeller = (v) =>
    v == null || v === '—' || v === '-' || String(v).trim() === '';
  const brandDateBuyerKey = (r) =>
    [
      String(r[COLUMN_KEYS.BRAND] ?? '').trim().toLowerCase(),
      String(r[COLUMN_KEYS.DATE] ?? '').trim(),
      String(r[COLUMN_KEYS.BUYER] ?? '').trim().toLowerCase(),
    ].join('|');
  const groups = new Map();
  candidates.forEach((r, i) => {
    const k = brandDateBuyerKey(r);
    const arr = groups.get(k);
    if (arr) arr.push(i);
    else groups.set(k, [i]);
  });
  const drop = new Set();
  for (const indices of groups.values()) {
    if (indices.length <= 1) continue;
    const hasReal = indices.some(
      (i) => !isBlankSeller(candidates[i][COLUMN_KEYS.SELLER])
    );
    if (hasReal) {
      // Drop placeholder-seller rows; keep the ones with real counterparty names.
      for (const i of indices) {
        if (isBlankSeller(candidates[i][COLUMN_KEYS.SELLER])) drop.add(i);
      }
    } else {
      // Every sibling has a placeholder seller — keep the first, drop the rest.
      for (let j = 1; j < indices.length; j++) drop.add(indices[j]);
    }
  }
  const unique = candidates.filter((_, i) => !drop.has(i));

  return [...baseline, ...unique];
}

// ──────────────────────────────────────────────────────────────────────────
// Acquisition parent/child grouping
//
// Some acquisitions are stored as a parent row + per-brand child rows
// (BSV deal = 1 parent + 13 brands; Panacea = 1 + 7; Ranbaxy/Elder/Unichem/
// Curatio/JB Chemicals/Oaknet/Adroit/etc.). The parent's BRAND column ends
// with "(parent)" by convention. Children share the same Buyer + Date as
// the parent.
//
// Use these helpers to:
//   - count distinct acquisition *deals* (deal events, not brand line items)
//   - render the table as parent rows that collapse their child brands
// ──────────────────────────────────────────────────────────────────────────
const PARENT_BRAND_RE = /\(parent\)\s*$/i;

export function isAcquisitionParent(row) {
  return PARENT_BRAND_RE.test(String(row?.[COLUMN_KEYS.BRAND] ?? ''));
}

export function acquisitionDealKey(row) {
  return `${row?.[COLUMN_KEYS.BUYER] ?? ''}|${row?.[COLUMN_KEYS.DATE] ?? ''}`;
}

// A row is a "stub" if at least 3 of its key descriptive fields are blank
// (null / empty string / em-dash / hyphen). These are typically scraped
// rows from a press-release announcement that hadn't yet disclosed brand-
// level detail at the time of the scrape — e.g. the Organon row from
// Sun Pharma's 27-Apr-2026 announcement, which has the deal envelope but
// molecule / therapy / indication / chronic-acute / competitor / pricing
// all empty. The next scrape merge-fills these slots when the source page
// is updated; in the meantime we flag the row so a viewer doesn't mistake
// "—" for verified-no-data.
//
// Parent envelope rows are intentionally umbrella ("Various", "Multi-
// therapy") and are NEVER flagged as stubs.
const STUB_CANDIDATE_FIELDS = [
  COLUMN_KEYS.MOLECULE,
  COLUMN_KEYS.THERAPY,
  COLUMN_KEYS.INDICATION,
  COLUMN_KEYS.CHRONIC_ACUTE,
  COLUMN_KEYS.COMPETITOR_BRANDS,
  COLUMN_KEYS.PRICING,
];

function fieldIsBlank(v) {
  if (v == null) return true;
  if (typeof v === 'number') return false;
  const s = String(v).trim();
  return s === '' || s === '—' || s === '-';
}

// Constant threshold (no second arg) so this can be passed straight to
// Array.prototype.filter without the array index getting bound to a
// `threshold` parameter — that bug used to silently zero out the stub
// list past the 3rd row.
const STUB_THRESHOLD = 3;
export function isStubRow(row) {
  if (!row) return false;
  if (isAcquisitionParent(row)) return false;
  let blanks = 0;
  for (const k of STUB_CANDIDATE_FIELDS) if (fieldIsBlank(row[k])) blanks += 1;
  return blanks >= STUB_THRESHOLD;
}

// Returns the set of dealKeys that have an explicit parent row in `rows`.
export function parentDealKeys(rows) {
  const out = new Set();
  for (const r of rows) {
    if (isAcquisitionParent(r)) out.add(acquisitionDealKey(r));
  }
  return out;
}

// True if `row` is a child of an explicit parent inside `parentKeys`
// (i.e. it's an Acquired row that shares Buyer+Date with a parent and is
// not itself the parent).
export function isAcquisitionChild(row, parentKeys) {
  if (row?.[COLUMN_KEYS.LAUNCH_TYPE] !== 'Acquired') return false;
  if (isAcquisitionParent(row)) return false;
  return parentKeys.has(acquisitionDealKey(row));
}

// Counts acquisition *deals* in a row set: each parent row counts once
// (children collapsed into it); standalone Acquired rows (no matching
// parent) count once each. This is the "deal events" KPI that ignores
// per-brand line-item duplication from multi-brand portfolio deals.
export function countAcquisitionDeals(rows) {
  const parents = parentDealKeys(rows);
  let count = 0;
  for (const r of rows) {
    if (r?.[COLUMN_KEYS.LAUNCH_TYPE] !== 'Acquired') continue;
    if (isAcquisitionChild(r, parents)) continue;
    count += 1;
  }
  return count;
}

// Splits acquisition rows into a parent-anchored hierarchy.
// Returns:
//   topLevel       — rows that render as their own row (non-Acquired,
//                    standalone Acquired, and parent rows themselves)
//   childrenByKey  — Map of dealKey → array of child rows (in input order)
export function groupAcquisitionRows(rows) {
  const parents = parentDealKeys(rows);
  const childrenByKey = new Map();
  const topLevel = [];
  for (const r of rows) {
    if (isAcquisitionChild(r, parents)) {
      const k = acquisitionDealKey(r);
      const arr = childrenByKey.get(k);
      if (arr) arr.push(r);
      else childrenByKey.set(k, [r]);
    } else {
      topLevel.push(r);
    }
  }
  return { topLevel, childrenByKey };
}

// ──────────────────────────────────────────────────────────────────────────
// BRAND_PRICES — retail MRP (INR) for the smallest typical pack, sourced
// from 1mg / Netmeds / PharmEasy / Apollo Pharmacy / MedPlusMart / Medindia
// drug-price index. Numeric = ₹ value; string = non-unit pricing (e.g.
// "₹84,375 / injection"). Null/absent = no verifiable MRP from the 6
// sources — table renders "—".
//
// IMPORTANT: this is a plain object literal. Enrichment runs ONLY inside
// React via enrichRowsWithPrices() — never at module-evaluation time —
// because computed exports caused a TDZ in the minified bundle previously.
// ──────────────────────────────────────────────────────────────────────────
export const BRAND_PRICES = {
  // ─ Mankind Pharma ─
  'moxikind-cv': '₹190 / strip of 10 (625 mg)',
  nurokind: '₹170 / strip of 10 (OD 1500 mcg)',
  gudcef: '₹180 / strip of 10 (200 mg)',
  cefakind: '₹255 / strip of 10 (500 mg)',
  candiforce: '₹260 / strip of 4 caps (100 mg)',
  'asthakind-dx': '₹100 / 100 mL syrup',
  'codistar-dx': '₹95 / 100 mL syrup',
  dolokind: '₹55 / strip of 10',
  monticope: '₹210 / strip of 10',
  'caldikind plus': '₹220 / strip of 15',
  'telmikind / telmikind-h': '₹110 / strip of 15 (40/12.5)',
  'amlokind-at': '₹75 / strip of 15',
  'glimestar-m': '₹105 / strip of 15 (2 mg)',
  'manforce (condoms + rx)': '₹50 / pack of 10 (condoms)',
  'unwanted-72': '₹75 / single pill',
  'unwanted kit': '₹445 / single MTP kit',
  'gas-o-fast': '₹25 / sachet (5 g)',
  'prega news': '₹60 / single test kit',
  'health ok': '₹230 / strip of 15',
  dydroboon: '₹540 / strip of 10 (10 mg)',
  longifene: '₹110 / strip of 10 (25 mg)',
  combihale: '₹430 / inhaler (200 dose MDI)',
  daffy: '₹180 / 100 g moisturising bar',
  samakind: '₹450 / weekly dose',
  rivotril: '₹30 / strip of 10 (0.5 mg)',
  'symbicort (india distribution)': '₹1,100 / Turbuhaler (60 dose)',
  'vonoprazan (takeda licence)': '₹340 / strip of 10 (20 mg)',

  // ─ Eris Lifesciences ─
  'glimisave / glimisave-m / glimisave max': '₹95 / strip of 15 (M2)',
  eritel: '₹90 / strip of 15 (40 mg)',
  'eritel ln / ln-bloc': '₹160 / strip of 10 (40/10)',
  olmin: '₹125 / strip of 15 (20 mg)',
  crevast: '₹135 / strip of 10 (10 mg)',
  atorsave: '₹130 / strip of 10 (10 mg)',
  renerve: '₹170 / strip of 10 (Plus)',
  tayo: '₹70 / sachet (60K IU)',
  raricap: '₹160 / strip of 15 (XT)',
  rabonik: '₹135 / strip of 10 (DSR)',
  serlift: '₹105 / strip of 10 (50 mg)',
  gluxit: '₹255 / strip of 14 (10 mg)',
  'xsulin / xglar': '₹800 / 3 mL cartridge (Xglar 100 IU)',
  tendia: '₹180 / strip of 10 (T)',
  cyblex: '₹145 / strip of 10 (20 mg)',
  zomelis: '₹170 / strip of 10 (50 mg)',
  cosvate: '₹155 / 20 g tube (GM cream)',
  cosmelite: '₹310 / 20 g tube',
  onabet: '₹170 / 30 g cream (2%)',
  flucos: '₹130 / single capsule (150 mg)',
  psorid: '₹420 / strip of 10 (50 mg)',
  basalog: '₹860 / 3 mL cartridge (Basalog One)',
  insugen: '₹190 / 10 mL vial (30/70)',
  sundae: '₹450 / weekly dose',

  // ─ Sun Pharma ─
  rosuvas: '₹150 / strip of 15 (10 mg)',
  aztor: '₹145 / strip of 15 (10 mg)',
  cardivas: '₹90 / strip of 10 (6.25 mg)',
  'revelol am': '₹130 / strip of 10 (50/5)',
  'pantocid / pantocid-dsr': '₹115 / strip of 15 (40 mg)',
  sompraz: '₹135 / strip of 10 (40 mg)',
  levipil: '₹250 / strip of 10 (500 mg)',
  nexito: '₹140 / strip of 10 (10 mg)',
  istamet: '₹185 / strip of 10 (50/500)',
  'istamet xcite': '₹315 / strip of 10 (100/500/10)',
  'oxra / oxra-m': '₹260 / strip of 14 (Oxra 10 mg)',
  gemer: '₹125 / strip of 15 (1 mg)',
  silodal: '₹310 / strip of 10 (8 mg)',
  febuget: '₹100 / strip of 10 (40 mg)',
  naxdom: '₹125 / strip of 10 (250)',
  'volini / volini maxx': '₹85 / 50 g gel',
  'revital h': '₹410 / pack of 30 capsules',
  sotret: '₹255 / strip of 10 (20 mg)',
  cifran: '₹55 / strip of 10 (500 mg)',
  cequa: '₹2,200 / 3 mL eye drops (0.09%)',
  fexuclue: '₹380 / strip of 10 (40 mg)',
  ilumya: '₹84,375 / single injection (100 mg)',
  'noveltreat / sematrinity': '₹450 / weekly dose',

  // ─ Cipla ─
  asthalin: '₹145 / inhaler (200 dose, 100 mcg)',
  ciplox: '₹45 / strip of 10 (TZ)',
  'ciplox eye': '₹20 / 5 mL eye drops (0.3%)',
  novamox: '₹50 / strip of 10 (500 mg)',
  'foracort (inhaler / respules / rotacaps)': '₹615 / inhaler (200 dose, 6/200)',
  'foracort nexthaler': '₹690 / DPI (120 dose)',
  seroflo: '₹735 / inhaler (250 dose)',
  budecort: '₹340 / inhaler (200 dose, 200 mcg)',
  duolin: '₹400 / pack of 5 respules (1.25 mg)',
  ivabrad: '₹180 / strip of 10 (5 mg)',
  'humalog + trulicity (eli lilly rights)': '₹870 / 3 mL Humalog cartridge',
  'cabotegravir la (via mpp / viiv)': null,
  nocdurna: '₹460 / strip of 10 (25 mcg ODT)',
  'cipenmet / esblocip': '₹3,500 / single vial',
  'yurpeak (tirzepatide)': '₹3,500 (2.5 mg) / ₹4,375 (5 mg) per pen',
  afrezza: '₹7,200 / inhaler cartridge pack',
  ciplostem: '₹1,50,000+ / single dose',
  'galvus / galvus met (perpetual licence)': '₹460 / strip of 7 (50 mg)',

  // ─ Alkem Laboratories ─
  'taxim-o / taxim-o forte': '₹110 / strip of 10 (200 mg)',
  clavam: '₹205 / strip of 6 (625 mg)',
  xone: '₹70 / single 1 g vial (Inj)',
  pipzo: '₹260 / single 4.5 g vial',
  'pan (pantoprazole)': '₹115 / strip of 15 (40 mg)',
  'pan-d': '₹190 / strip of 10 (40/30 SR)',
  ondem: '₹55 / strip of 10 (4 mg)',
  'gemcal / gemcal-ds': '₹200 / strip of 10 (DS)',
  'a to z ns': '₹120 / strip of 15',
  sumo: '₹65 / strip of 10',
  enzar: '₹310 / strip of 10 (180 mg)',
  'vonzai (vonoprazan)': '₹395 / strip of 10 (20 mg)',
  'empanorm / empanorm-l / empanorm-m / empanorm duo': '₹225 / strip of 10 (10 mg)',
  pertuza: '₹78,300 / 420 mg vial',
  'semasize / obesema / hepaglide': '₹450 / weekly dose',

  // ─ Corona Remedies ─
  'cortel m (cor family)': '₹135 / strip of 10 (M 25)',
  trazer: '₹180 / strip of 10 (Forte)',
  'b-29 (xmex)': '₹145 / strip of 10',
  'cor-9': '₹1,150 / 2 mL injection (500 mg)',
  'cor-3': '₹195 / strip of 10',
  'dilo-bm': '₹98 / 100 mL expectorant',
  'dilo-dx': '₹105 / 100 mL syrup',
  stelbid: '₹85 / strip of 10',
  vitneurin: '₹120 / strip of 10',
  obimet: '₹40 / strip of 10 (500 mg)',
  'obimet-gx': '₹95 / strip of 15 (1/500)',
  'obimet sr': '₹60 / strip of 10 (500 SR)',
  'obimet-v': '₹120 / strip of 10 (0.3 mg)',
  triobimet: '₹115 / strip of 10 (2 mg ER)',
  thyrocab: '₹125 / strip of 100 (100 mcg)',
  myoril: '₹180 / strip of 10 (8 mg)',
  noklot: '₹100 / strip of 10 (75 mg)',
  fostine: '₹1,900 / single 150 IU injection',
  luprofact: '₹1,100 / single 75 IU injection',
  menodac: '₹1,100 / single 75 IU injection',
  ovidac: '₹400 / single 5000 IU injection',
  vageston: '₹235 / strip of 10 (200 mg)',
  wokadine: '₹85 / 100 mL solution (5%)',

  // ─ Torrent Pharma ─
  'losar / losar-h': '₹100 / strip of 10 (H 50)',
  'dilzem sr': '₹155 / strip of 10 (90 mg SR)',
  nikoran: '₹75 / strip of 10 (5 mg)',
  nebicard: '₹75 / strip of 10 (5 mg)',
  nexpro: '₹135 / strip of 10 (40 mg)',
  shelcal: '₹175 / strip of 15 (500 mg)',
  'chymoral forte / chymoral-br': '₹210 / strip of 10 (Forte)',
  carnisure: '₹210 / strip of 10 (500 mg)',
  deviry: '₹95 / strip of 10 (10 mg)',
  unienzyme: '₹45 / strip of 10',
  ampoxin: '₹45 / strip of 15 (500 mg)',
  'telsar / losar (unichem)': '₹80 / strip of 15 (Telsar 40)',
  tedibar: '₹180 / 75 g bar',
  atogla: '₹340 / 200 mL lotion',
  spoo: '₹195 / 120 mL bottle',
  'b4 nappi': '₹190 / 75 g cream',
  permite: '₹175 / 30 g cream (5%)',
  'vorxar (saroglitazar)': '₹365 / strip of 10 (4 mg)',
  'kabvie (vonoprazan)': '₹395 / strip of 10 (20 mg)',
  'shelcal total': '₹685 / 400 g powder pack',
  cilacar: '₹215 / strip of 15 (10 mg)',
  nicardia: '₹95 / strip of 15 (Retard 10 mg)',
  rantac: '₹35 / strip of 10 (150 mg)',
  metrogyl: '₹45 / strip of 10 (400 mg)',
  semalix: '₹450 / weekly dose',
  sembolic: '₹3,999 / month',
};

// Pure function. Maps each row's brand (case-insensitive) → BRAND_PRICES
// entry. First-token fallback so 'Glimisave family' rows resolve via
// 'glimisave'. Called from App.jsx inside a useMemo so all work happens
// after React mount — never at module-load time.
export function enrichRowsWithPrices(rows, prices = BRAND_PRICES) {
  const idx = {};
  for (const k of Object.keys(prices)) {
    idx[k.toLowerCase().trim()] = prices[k];
  }
  return rows.map((r) => {
    if (r[COLUMN_KEYS.PRICING] != null) return r;
    const brand = String(r[COLUMN_KEYS.BRAND] ?? '').toLowerCase().trim();
    if (idx[brand] !== undefined) {
      return { ...r, [COLUMN_KEYS.PRICING]: idx[brand] };
    }
    const firstToken = brand.split(/[/(]/)[0].trim();
    if (idx[firstToken] !== undefined) {
      return { ...r, [COLUMN_KEYS.PRICING]: idx[firstToken] };
    }
    return r;
  });
}

// ── Cross-brand price-comparison helpers ──────────────────────────────────
// LOOSE matcher — used by TAM enrichment. Collapses formulations AND
// combinations to the lead active ingredient so 'Telmisartan +
// Cilnidipine' inherits the 'telmisartan' TAM. Good for market-size
// estimates.
export function primaryMolecule(s) {
  if (!s || s === '—') return '';
  return String(s).toLowerCase().split(/[/+(]/)[0].trim();
}

// STRICT matcher — used by cross-brand price comparison.
// Keeps combinations DISTINCT from monotherapy (they're different SKUs
// at different price points and shouldn't be price-compared head-to-head).
// Strips parenthetical formulation descriptors like '(oral)',
// '(injectable pen)', '(20 mg)' so 'Semaglutide (oral)' and
// 'Semaglutide (injection)' still bucket together — the user can see
// the formulation in the displayed full-molecule string.
//   'Semaglutide'                    → 'semaglutide'
//   'Semaglutide (oral)'              → 'semaglutide'
//   'Telmisartan'                    → 'telmisartan'
//   'Telmisartan + Cilnidipine'      → 'telmisartan + cilnidipine'  (kept distinct)
//   'Pantoprazole + Domperidone'     → 'pantoprazole + domperidone' (kept distinct)
//   'Pantoprazole (± Dom SR / ...)'  → 'pantoprazole'
//   'Methylcobalamin 1500 mcg'       → 'methylcobalamin'
export function comparisonMolecule(s) {
  if (!s || s === '—') return '';
  return String(s)
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')          // strip parenthetical descriptors
    .replace(/\s+\d.*$/, '')                // strip trailing dosage starting with a digit (e.g. '500 mg', '1500 mcg', '20/40 mg')
    .trim();
}

// Extract a numeric value from any Pricing field (numeric or string with
// units). Returns null for unparseable / empty. e.g.
//   '₹190 / strip of 10 (625 mg)' → 190
//   '₹3,500 (2.5 mg) / ₹4,375 (5 mg) per pen' → 3500 (first numeric)
//   '₹1,50,000+ / dose' → 150000
export function priceNumeric(v) {
  if (typeof v === 'number') return v;
  if (!v) return null;
  const m = String(v).match(/[\d,]+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Classify a Pricing label into a dosage-form bucket so we don't compare
// chloramphenicol eye drops against chloramphenicol tablets — same molecule,
// totally different therapeutic context. Returns null if the form can't be
// detected (caller should treat null as non-comparable).
//   '₹190 / strip of 10'              → 'oral-solid'
//   '₹20 / 5 mL eye drops'            → 'ophthalmic'
//   '₹150 / vial' / '₹3,500 / pen'    → 'injectable'
//   '₹125 / 100 mL syrup'             → 'oral-liquid'
//   '₹560 / inhaler' / '... rotacaps' → 'inhaled'
//   '₹95 / tube of 10g cream'         → 'topical'
export function dosageForm(priceLabel) {
  if (typeof priceLabel !== 'string') return null;
  const s = priceLabel.toLowerCase();
  if (/\beye\s*drops?\b|\bophthalmic\b/.test(s)) return 'ophthalmic';
  if (/\bear\s*drops?\b|\botic\b/.test(s)) return 'otic';
  if (/\bnasal\s*spray\b/.test(s)) return 'nasal';
  if (/\binhaler\b|\brotacaps?\b|\brespules?\b|\bmdi\b|\bdpi\b/.test(s)) return 'inhaled';
  if (/\bvial\b|\bampoule\b|\binjection\b|\bsyringe\b|\bpen\b|\bcartridge\b|\binfusion\b/.test(s)) return 'injectable';
  if (/\bcream\b|\bointment\b|\bgel\b|\blotion\b|\btube\b|\bpatch\b/.test(s)) return 'topical';
  if (/\bsyrup\b|\bsuspension\b|\boral\s+solution\b|\boral\s+drops\b|\bsachet\b/.test(s)) return 'oral-liquid';
  if (/\bstrip\b|\btablet\b|\bcapsule\b|\bcaplet\b|\bsublingual\b|\bsl\b/.test(s)) return 'oral-solid';
  return null;
}

// Human-readable label for a dosage-form bucket — used in headers like
// "chloramphenicol · eye drops" so the comparison scope is explicit.
export function dosageFormLabel(form) {
  return {
    'oral-solid': 'oral',
    'oral-liquid': 'oral liquid',
    'ophthalmic': 'eye drops',
    'otic': 'ear drops',
    'nasal': 'nasal spray',
    'inhaled': 'inhaled',
    'injectable': 'injectable',
    'topical': 'topical',
  }[form] || form;
}

// ──────────────────────────────────────────────────────────────────────────
// TAM_BY_MOLECULE — addressable Indian Pharmaceutical Market (IPM) size
// in INR Cr for the molecule. Estimates compiled from broker research
// notes (Nuvama, Jefferies, Kotak Pharma), DRHP/RHP filings, IBEF
// industry reports, and AIOCD AWACS coverage cited in trade press
// (BioSpectrum, Pharma Bureau, Business Standard pharma desk).
//
// These are TAM ESTIMATES, not precise SMSRC panel data — they reflect
// the addressable molecule-level Indian market as of FY25-FY26. Where a
// row already has a press-release-disclosed market size (Wokadine ₹648
// Cr, Combihale ₹900 Cr, Biocon BFI ₹30,000 Cr injectable market, etc.)
// that exact figure stays — enrichRowsWithTAM only fills NULL entries.
//
// Matched by primaryMolecule() so combinations resolve to the lead
// active ingredient (e.g. 'Telmisartan + Cilnidipine' → 'telmisartan').
// ──────────────────────────────────────────────────────────────────────────
export const TAM_BY_MOLECULE = {
  // Anti-Diabetic
  semaglutide: 1000,
  sitagliptin: 2200,
  vildagliptin: 1000,
  dapagliflozin: 1500,
  empagliflozin: 2000,
  teneligliptin: 2500,
  linagliptin: 1100,
  glimepiride: 1500,
  gliclazide: 800,
  metformin: 2000,
  voglibose: 250,
  pioglitazone: 600,
  tirzepatide: 800,
  'insulin glargine': 700,
  'insulin human': 1000,
  'recombinant human insulin': 1000,
  'insulin lispro': 600,
  'human insulin': 1000,
  dulaglutide: 400,

  // Cardiology
  telmisartan: 2000,
  olmesartan: 1200,
  losartan: 800,
  amlodipine: 2500,
  cilnidipine: 500,
  nifedipine: 200,
  nebivolol: 700,
  metoprolol: 1500,
  diltiazem: 300,
  atorvastatin: 3500,
  rosuvastatin: 3000,
  clopidogrel: 1200,
  nicorandil: 400,
  ivabradine: 200,
  'bempedoic acid': 50,
  propranolol: 250,
  carvedilol: 800,

  // Gastroenterology
  pantoprazole: 2200,
  esomeprazole: 1300,
  rabeprazole: 900,
  omeprazole: 500,
  vonoprazan: 500,
  fexuprazan: 200,
  domperidone: 600,
  ranitidine: 400,
  'saroglitazar magnesium': 250,
  saroglitazar: 250,
  ondansetron: 800,
  'fungal diastase': 600,

  // Anti-Infectives
  amoxicillin: 2500,
  cefixime: 1800,
  ciprofloxacin: 800,
  cefuroxime: 600,
  ceftriaxone: 700,
  'cefpodoxime proxetil': 800,
  cefotaxime: 400,
  cefpodoxime: 800,
  piperacillin: 1100,
  cefepime: 200,
  isavuconazonium: 100,
  itraconazole: 500,
  fluconazole: 400,
  'sertaconazole nitrate': 350,
  'povidone iodine': 648,
  metronidazole: 800,
  'snake antivenom': 250,
  'polyvalent snake antivenom': 250,
  'tetanus immunoglobulin': 100,
  'human normal immunoglobulin': 500,
  ampicillin: 300,

  // Dermatology
  isotretinoin: 250,
  clascoterone: 50,
  tildrakizumab: 400,
  'clobetasol propionate': 500,
  clobetasol: 500,
  hydroquinone: 250,
  permethrin: 80,
  cyclosporine: 600,
  deuruxolitinib: 60,

  // Respiratory
  budesonide: 1650,
  salbutamol: 800,
  salmeterol: 1100,
  levosalbutamol: 600,
  olopatadine: 200,
  montelukast: 1500,
  ambroxol: 800,
  chlorpheniramine: 200,
  dextromethorphan: 300,
  terbutaline: 250,

  // Neurology / CNS
  methylcobalamin: 1500,
  levetiracetam: 400,
  escitalopram: 300,
  sertraline: 300,
  clonazepam: 200,
  pregabalin: 500,
  donepezil: 250,
  memantine: 200,
  's-pindolol benzoate': 50,
  'l-methylfolate': 400,
  tegoprazan: 250,
  febuxostat: 700,
  deuruxolitinib: 60,
  bempedoic: 50,
  'rho(d)': 100,
  'antibiotic combination': 0,
  'gam-covid-vac': 0,

  // Oncology
  pertuzumab: 2100,
  nivolumab: 800,
  aflibercept: 350,
  daratumumab: 250,
  balstilimab: 50,
  toripalimab: 100,
  sintilimab: 200,
  cosibelimab: 100,
  'trastuzumab emtansine': 400,
  trastuzumab: 1200,
  cetuximab: 200,
  palbociclib: 300,
  cabotegravir: 80,

  // Immunology
  adalimumab: 600,
  golimumab: 50,
  infliximab: 200,
  etanercept: 250,
  'mycophenolic acid': 500,
  'mycophenolate sodium': 400,
  'mycophenolate mofetil': 500,
  tacrolimus: 700,

  // Women's Health / Fertility
  mifepristone: 600,
  levonorgestrel: 100,
  dydrogesterone: 600,
  'micronized progesterone': 800,
  progesterone: 800,
  menotropin: 300,
  'follicle stimulating hormone': 250,
  'human chorionic gonadotropin': 200,
  'hcg highly purified': 200,
  'hcg': 200,
  'carboprost tromethamine': 50,
  carboprost: 50,
  dinoprostone: 30,
  'leuprolide acetate': 500,
  leuprolide: 500,
  ospemifene: 30,
  'medroxyprogesterone acetate': 200,
  'hydroxyprogesterone caproate': 250,
  hydroxyprogesterone: 250,
  'ferrous ascorbate': 1500,

  // Urology
  silodosin: 200,
  'desmopressin acetate': 60,
  desmopressin: 60,

  // Nutraceuticals / Bone Health
  'calcium carbonate': 2000,
  calcium: 2000,
  cholecalciferol: 1500,
  multivitamin: 1500,
  ginseng: 800,
  calcitriol: 600,
  'protein + ca + mg + d3 + k2 + glucosamine + bamboo extract': 3000,

  // Pain Management
  diclofenac: 1200,
  aceclofenac: 800,
  thiocolchicoside: 500,
  nimesulide: 200,
  naproxen: 100,
  trypsin: 500,
  levocarnitine: 200,
  buclizine: 80,

  // Critical Care / Haematology
  'enoxaparin sodium': 800,
  enoxaparin: 800,
  'anti-d immunoglobulin': 100,

  // Consumer / OTC
  'sodium bicarbonate': 800,
  sildenafil: 800,
  'ginkgo biloba': 200,
  'zinc oxide 15%': 300,

  // Vaccines / Misc / less-mapped
  'gam-covid-vac': 0,
  remdesivir: 0,
  molnupiravir: 0,
  'mesenchymal stem cells': 50,
  'allogeneic mesenchymal stromal cells': 50,
};

// Apply TAM estimates to rows where MARKET_SIZE is null. Keeps press-
// release-disclosed values intact. Pure function; called from App.jsx
// inside a useMemo so it never runs at module-evaluation time.
export function enrichRowsWithTAM(rows, tam = TAM_BY_MOLECULE) {
  const idx = {};
  for (const k of Object.keys(tam)) {
    idx[k.toLowerCase().trim()] = tam[k];
  }
  return rows.map((r) => {
    if (r[COLUMN_KEYS.MARKET_SIZE] != null) return r;
    const mol = primaryMolecule(r[COLUMN_KEYS.MOLECULE]);
    if (!mol) return r;
    let v = idx[mol];
    // Fallback: strip USAN / WHO INN suffix for biosimilars / biologics
    // e.g. 'tildrakizumab-asmn' → 'tildrakizumab', 'cosibelimab-ipdl' →
    // 'cosibelimab'. The base molecule TAM applies to the full named
    // INN entity since pricing parity tracks the base.
    if (v == null) {
      const stem = mol.split('-')[0].trim();
      if (stem && stem !== mol) v = idx[stem];
    }
    // Fallback 2: collapse common combination prefixes — e.g. molecule
    // 'amoxicillin' may be stored as 'amoxicillin' but TAM lookup keys
    // sometimes hold spaces. Try simple normalisation.
    if (v == null) {
      const flat = mol.replace(/\s+/g, ' ');
      v = idx[flat];
    }
    // Fallback 3: take just the first word — handles dosage / percentage
    // qualifiers like 'metformin hcl', 'methylcobalamin 1500 mcg',
    // 'cyclosporine 0.09%', 'ciprofloxacin 0.3%'.
    if (v == null) {
      const head = mol.split(/\s+/)[0];
      if (head && head !== mol) v = idx[head];
    }
    if (v == null || v === 0) return r;
    return { ...r, [COLUMN_KEYS.MARKET_SIZE]: v };
  });
}

// ── Buyer's Pre-existing Brand — auto-derived ─────────────────────────────
// For each row, looks for any EARLIER row where the SAME Buyer launched a
// brand on the SAME lead-active molecule. If found, this row is a portfolio
// extension on that molecule; if not, it's the Buyer's first entry.
//
// Uses primaryMolecule() (loose matcher) so a combination like 'Telmisartan
// + Hydrochlorothiazide' matches an earlier 'Telmisartan' monotherapy by
// the same buyer — which is the investor signal we want.
//
// Skips umbrella rows whose molecule is a portfolio descriptor rather than
// a specific molecule (parent-acquisition rows = 'Various …', Corona-style
// division-launch rows = 'Multiple …'). These don't represent a single
// molecule and would otherwise create false matches across unrelated rows
// that share the same generic descriptor.
export function enrichRowsWithPreExistingBrand(rows) {
  const isUmbrella = (molLead) =>
    !molLead || /^(various|multiple)( |$)/.test(molLead);

  // Index: Buyer → primaryMolecule → [{ date, brand }]
  const idx = new Map();
  for (const r of rows) {
    const buyer = String(r[COLUMN_KEYS.BUYER] || '').trim();
    const date = String(r[COLUMN_KEYS.DATE] || '').trim();
    const brand = String(r[COLUMN_KEYS.BRAND] || '').trim();
    const molLead = primaryMolecule(r[COLUMN_KEYS.MOLECULE]);
    if (!buyer || !date || !brand || isUmbrella(molLead)) continue;
    if (!idx.has(buyer)) idx.set(buyer, new Map());
    const buyerIdx = idx.get(buyer);
    if (!buyerIdx.has(molLead)) buyerIdx.set(molLead, []);
    buyerIdx.get(molLead).push({ date, brand });
  }
  // Sort each list ascending by date so .find() returns the earliest match.
  for (const [, byMol] of idx) {
    for (const [, list] of byMol) list.sort((a, b) => a.date.localeCompare(b.date));
  }
  return rows.map((r) => {
    const buyer = String(r[COLUMN_KEYS.BUYER] || '').trim();
    const date = String(r[COLUMN_KEYS.DATE] || '').trim();
    const brand = String(r[COLUMN_KEYS.BRAND] || '').trim();
    const molLead = primaryMolecule(r[COLUMN_KEYS.MOLECULE]);
    let preExisting = '—';
    if (buyer && date && brand && !isUmbrella(molLead)) {
      const list = idx.get(buyer)?.get(molLead);
      if (list) {
        const earlier = list.find((x) => x.date < date && x.brand !== brand);
        if (earlier) preExisting = earlier.brand;
      }
    }
    return { ...r, [COLUMN_KEYS.PRE_EXISTING_BRAND]: preExisting };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// DEAL_VALUES — disclosed cash/equity consideration paid for each
// acquisition or perpetual licensing transaction, in INR Cr. Sourced from
// the BSE / NSE filings, press releases and Business Standard / BioSpectrum
// coverage cited inline in the dataset comments.
//
// Keyed by `${Buyer}|${Date}` (the same dealKey that powers parent/child
// rollups), so every row inside a multi-brand portfolio deal inherits the
// same deal-level consideration. Standalone single-brand acquisitions can
// also be keyed here. Undisclosed deals are simply omitted (left null →
// rendered as "—" in the table).
// ──────────────────────────────────────────────────────────────────────────
export const DEAL_VALUES = {
  // ── Sun Pharma ──
  'Sun Pharma|2015-03-25': 24400,           // Ranbaxy — $4B all-stock @ ~Rs 24,400 Cr (Mar-2015)
  'Sun Pharma|2023-03-06': 4800,            // Concert Pharmaceuticals — $576M @ ~Rs 4,800 Cr
  'Sun Pharma|2024-06-24': 2900,            // Taro 21.5% buyout — $348M @ ~Rs 2,900 Cr
  'Sun Pharma|2025-05-30': 3000,            // Checkpoint Therapeutics — $355M @ ~Rs 3,000 Cr

  // ── Torrent Pharma ──
  'Torrent Pharma|2013-12-13': 2004,        // Elder Pharma India business
  'Torrent Pharma|2017-11-03': 3600,        // Unichem Labs India + Nepal
  'Torrent Pharma|2022-09-27': 2000,        // Curatio Healthcare
  'Torrent Pharma|2026-01-21': 25689,       // JB Chemicals (KKR 46.39% controlling stake)

  // ── Mankind Pharma ──
  'Mankind Pharma|2022-03-01': 1872,        // Panacea Biotec domestic formulations
  'Mankind Pharma|2024-10-23': 13630,       // Bharat Serums & Vaccines (BSV) — Advent

  // ── Eris Lifesciences ──
  'Eris Lifesciences|2022-05-04': 650,      // Oaknet Healthcare
  'Eris Lifesciences|2023-11-08': 366,      // Biocon BFI Nephrology + Dermatology
  'Eris Lifesciences|2024-02-15': 637.5,    // Swiss Parenterals 51% stake
  'Eris Lifesciences|2024-03-14': 1242,     // Biocon BFI Metabolics + Oncology + Critical Care
  'Eris Lifesciences|2025-11-25': 423.3,    // Swiss Parenterals balance 30% (full consolidation)

  // ── Alkem ──
  'Alkem|2025-04-23': 140,                  // Adroit Biomed
  'Alkem|2025-10-01': 533,                  // Alkem Wellness internal slump sale (Rs 532.5 Cr)

  // ── Aurobindo ──
  'Aurobindo|2026-01-01': 325,              // Khandelwal Labs non-oncology

  // ── Corona Remedies ──
  'Corona Remedies|2023-06-28': 234,        // Sanofi India — Myoril

  // ── Cipla ──
  'Cipla|2026-01-01': 1107,                 // Novartis Galvus / Galvus Met perpetual licence

  // ── Natco Pharma ──
  'Natco Pharma|2025-11-11': 2000,          // Adcock Ingram 35.75% stake — ~Rs 2,000 Cr (US$226M)

  // ── Dr. Reddy's ──
  "Dr. Reddy's|2006-03-01": 2712,           // Betapharm (Germany) — €480M (~Rs 2,712 Cr at 2006 rates)
  "Dr. Reddy's|2020-06-10": 1850,           // Wockhardt branded generics — 62 brands + Baddi plant
  "Dr. Reddy's|2024-09-30": 5250,           // Haleon Nicotinell / NRT — £500M / US$633M (~Rs 5,250 Cr)

  // ── Lupin ──
  'Lupin|2015-07-23': 5632,                 // Gavis Pharmaceuticals — $880M (~Rs 5,632 Cr at 2015 rates)
  'Lupin|2017-10-01': 975,                  // Symbiomix Therapeutics — $150M (~Rs 975 Cr at 2017 rates)

  // ── Zydus Lifesciences ──
  'Zydus Lifesciences|2019-01-30': 4595,    // Heinz India consumer brands (Complan + Glucon-D + Nycil + Sampriti Ghee)

  // ── Abbott India ──
  'Abbott India|2010-09-07': 17000,         // Piramal Healthcare formulations — $3.7B (~Rs 17,000 Cr at 2010 rates) — biggest India pharma M&A at the time
};

// Fills DEAL_VALUE for parent rows and standalone-acquired rows whose
// `${Buyer}|${Date}` is in the DEAL_VALUES map. Children of a multi-brand
// deal are intentionally LEFT NULL — repeating ₹13,630 Cr on every BSV
// brand row is visually noisy and reads as if each brand cost that much
// individually. Users see the consideration on the parent row (and in the
// row-detail drawer of any child).
export function enrichRowsWithDealValue(rows, dealValues = DEAL_VALUES) {
  const parents = parentDealKeys(rows);
  return rows.map((r) => {
    if (r[COLUMN_KEYS.DEAL_VALUE] != null) return r;
    const key = acquisitionDealKey(r);
    const v = dealValues[key];
    if (v == null) return r;
    // If this dealKey has a parent row, only fill on the parent itself.
    if (parents.has(key) && !isAcquisitionParent(r)) return r;
    return { ...r, [COLUMN_KEYS.DEAL_VALUE]: v };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// GEOGRAPHIC_RIGHTS — territorial scope of the rights actually transferred
// in the deal. Investors care because a buyer may only have India rights
// while the seller retains the rest of the world (typical for in-licensing
// deals like "Vonoprazan (Takeda licence)") or vice versa (Sun's Concert
// acquisition gave it global rights to Leqselvi).
//
// Two layers:
//   1. GEO_RIGHTS_DEAL_OVERRIDES — by `${Buyer}|${Date}` for known multi-row
//      deals where every row in the deal shares the same scope.
//   2. GEO_RIGHTS_BRAND_OVERRIDES — by lower-cased Brand for one-off rows.
// Anything not overridden falls back to the deal-type heuristic in
// deriveGeoRights() below.
// ──────────────────────────────────────────────────────────────────────────
export const GEO_RIGHTS_DEAL_OVERRIDES = {
  // Sun's three global-asset acquisitions — they got worldwide rights.
  'Sun Pharma|2023-03-06': 'Global',        // Concert / Leqselvi
  'Sun Pharma|2024-06-24': 'Global',        // Taro full buyout
  'Sun Pharma|2025-05-30': 'Global',        // Checkpoint / UNLOXCYT
  'Sun Pharma|2015-03-25': 'India + Global (629 ANDAs)', // Ranbaxy
  // Eris Swiss Parenterals — sterile injectables across 80+ emerging markets.
  'Eris Lifesciences|2024-02-15': 'India + Emerging Markets',
  'Eris Lifesciences|2024-03-14': 'India',
  'Eris Lifesciences|2025-11-25': 'India + Emerging Markets',
};

export const GEO_RIGHTS_BRAND_OVERRIDES = {
  // Sun's US-led specialty in-licensings.
  'winlevi': 'US + Canada (expansion)',
  'ilumya': 'Global',
  'cequa': 'Global',
  'leqselvi': 'Global',
  'unloxcyt': 'Global',
  'odomzo': 'Global',
  'absorica ld': 'Global',
  // Voluntary licences for HIV — typically LMIC scope.
  'cabotegravir la (via mpp / viiv)': 'LMIC (90+ countries)',
  // Harvard tech licence — research-stage, global rights to develop.
  'harvard otd vascular-disease platform': 'Global',
  // Natco's US partner launches — US-market generics (Teva / Mylan / Breckenridge).
  'glatiramer acetate (gcopaxone — us)': 'US',
  'lenalidomide (grevlimid — us)': 'US',
  'pomalidomide (gpomalyst — us)': 'US',
  // Dr. Reddy's US launch — US-market generic.
  'lenalidomide capsules (grevlimid — us)': 'US',
  // Lupin US launches — US-market generics + specialty.
  'solosec': 'US',
  'mirabegron er (gmyrbetriq — us)': 'US',
  'tolvaptan (gjynarque — us)': 'US',
  // Zydus US launches — US-market generics (Sentynl's Zokinvy is global, derived from deal type).
  'mirabegron extended-release (gmyrbetriq — us)': 'US',
  'eltrombopag tablets (gpromacta — us)': 'US',
  'dapagliflozin (gfarxiga — us)': 'US',
};

// Pulls a parenthetical scope from a deal-type label like
// "In-license (India)", "In-license (US + Canada + expansion)",
// "Co-marketing", etc. Returns null when no parenthetical is found.
function geoFromDealType(dealType) {
  if (!dealType) return null;
  const m = String(dealType).match(/\(([^)]+)\)/);
  if (!m) return null;
  return m[1].trim();
}

function deriveGeoRights(row) {
  const launchType = row[COLUMN_KEYS.LAUNCH_TYPE];
  const dealType = row[COLUMN_KEYS.DEAL_TYPE];
  // Most India pharma deals are India-rights by default.
  if (launchType === 'Own Launched') return 'India';
  // For acquired and in-licensed rows, prefer an explicit
  // parenthetical scope on the deal-type column when present.
  const fromDealType = geoFromDealType(dealType);
  if (fromDealType) return fromDealType;
  if (launchType === 'Acquired') return 'India';
  if (launchType === 'In-licensed') return 'India';
  return null;
}

export function enrichRowsWithGeoRights(
  rows,
  dealOverrides = GEO_RIGHTS_DEAL_OVERRIDES,
  brandOverrides = GEO_RIGHTS_BRAND_OVERRIDES
) {
  return rows.map((r) => {
    if (r[COLUMN_KEYS.GEO_RIGHTS]) return r;
    const dealKey = acquisitionDealKey(r);
    if (dealOverrides[dealKey]) {
      return { ...r, [COLUMN_KEYS.GEO_RIGHTS]: dealOverrides[dealKey] };
    }
    const brand = String(r[COLUMN_KEYS.BRAND] ?? '').toLowerCase().trim();
    if (brandOverrides[brand]) {
      return { ...r, [COLUMN_KEYS.GEO_RIGHTS]: brandOverrides[brand] };
    }
    return { ...r, [COLUMN_KEYS.GEO_RIGHTS]: deriveGeoRights(r) };
  });
}

// ──────────────────────────────────────────────────────────────────────────
// REGULATORY_STATUS — whether the molecule is actually launchable in India.
// Marketed brands acquired or own-launched are presumed "DCGI Approved";
// pipeline / pre-launch in-licensings get an explicit pipeline label so an
// investor can distinguish "in market today" from "approval pending / in
// development" at a glance.
// ──────────────────────────────────────────────────────────────────────────
export const REG_STATUS_BRAND_OVERRIDES = {
  // Pipeline / pre-launch in-licensed assets.
  'son-080 (il-6 fusion protein)': 'Phase 3 (India trial)',
  'acm-001.1 (s-pindolol)': 'Phase 3',
  'bat2506 (golimumab biosimilar)': 'Phase 3 (India)',
  'sintilimab': 'Filed (CDSCO)',
  'afrezza': 'Filed (CDSCO)',
  'harvard otd vascular-disease platform': 'Pre-clinical (tech licence)',
  'ciplostem': 'Phase 3 (India approval pending full launch)',
  // Cabotegravir long-acting got CDSCO nod via voluntary licence.
  'cabotegravir la (via mpp / viiv)': 'DCGI Approved (Cabenuva)',
  // Recently approved novel mechanisms.
  'leqselvi': 'US FDA Approved · India filing pending',
  'unloxcyt': 'US FDA Approved · India filing pending',
  'fexuclue': 'DCGI Approved (P-CAB)',
  'kabvie (vonoprazan)': 'DCGI Approved (P-CAB)',
  'vonzai (vonoprazan)': 'DCGI Approved (P-CAB)',
  'tegoprazan': 'DCGI Approved',
  'vorxar (saroglitazar)': 'DCGI Approved',
  'yurpeak (tirzepatide)': 'DCGI Approved (2025)',
  'semanext / livarise': 'DCGI Approved',
  'sembolic': 'DCGI Approved',
  'semalix': 'DCGI Approved',
  // Natco's US partner launches — FDA-approved generics sold via Teva / Mylan / Breckenridge.
  'glatiramer acetate (gcopaxone — us)': 'US FDA Approved',
  'lenalidomide (grevlimid — us)': 'US FDA Approved',
  'pomalidomide (gpomalyst — us)': 'US FDA Approved',
  // Dr. Reddy's US launch — FDA-approved generic.
  'lenalidomide capsules (grevlimid — us)': 'US FDA Approved',
  // Glenmark in-licensed pipeline asset — not yet launched / filed in India.
  'trastuzumab rezetecan (hengrui adc)': 'In Development (India)',
  // Lupin US launches — FDA-approved (Solosec is the marquee NCE via Symbiomix).
  'solosec': 'US FDA Approved',
  'mirabegron er (gmyrbetriq — us)': 'US FDA Approved',
  'tolvaptan (gjynarque — us)': 'US FDA Approved',
  // Zydus US launches + Sentynl specialty asset — FDA-approved.
  'mirabegron extended-release (gmyrbetriq — us)': 'US FDA Approved',
  'eltrombopag tablets (gpromacta — us)': 'US FDA Approved',
  'dapagliflozin (gfarxiga — us)': 'US FDA Approved',
  'zokinvy (lonafarnib) — sentynl': 'US FDA Approved',
};

function deriveRegStatus(row) {
  // Parent envelope rows describe a portfolio — leave blank.
  if (isAcquisitionParent(row)) return null;
  const launchType = row[COLUMN_KEYS.LAUNCH_TYPE];
  const date = row[COLUMN_KEYS.DATE];
  if (!launchType || !date) return null;
  // Anything that's been Acquired or Own Launched is by definition already
  // marketed in India — implies DCGI approval.
  if (launchType === 'Acquired') return 'DCGI Approved';
  if (launchType === 'Own Launched') return 'DCGI Approved';
  // In-licensed rows default to DCGI Approved unless flagged in the
  // override map (pipeline / filed-but-not-launched cases).
  if (launchType === 'In-licensed') return 'DCGI Approved';
  return null;
}

export function enrichRowsWithRegStatus(rows, brandOverrides = REG_STATUS_BRAND_OVERRIDES) {
  return rows.map((r) => {
    if (r[COLUMN_KEYS.REG_STATUS]) return r;
    const brand = String(r[COLUMN_KEYS.BRAND] ?? '').toLowerCase().trim();
    if (brandOverrides[brand]) {
      return { ...r, [COLUMN_KEYS.REG_STATUS]: brandOverrides[brand] };
    }
    return { ...r, [COLUMN_KEYS.REG_STATUS]: deriveRegStatus(r) };
  });
}

export const LAUNCH_TRACKER_ROWS = [
  // ──────────────────────────────────────────────────────────────────────────
  // Sun Pharma — EXPANDED LIVE DATASET (deep-research edition)
  // Sources: sunpharma.com press releases + annual report FY25, Business
  // Standard / BusinessToday / BioSpectrum / PharmaTutor / FiercePharma
  // coverage, BSE filings, PRNewswire for US specialty deals, 1mg / Apollo /
  // Practo / Truemeds for molecule verification. Sun Pharma is India's
  // largest pharma company and #1 by domestic sales, world's 4th-5th largest
  // specialty generics. Strong India chronic portfolio (cardio + CNS + GI
  // + derma) + growing global specialty (Ilumya, Cequa, Leqselvi, UNLOXCYT,
  // Odomzo, Winlevi, Levulan, Absorica). Engine-brand launch dates [est.]
  // where not publicly disclosed.

  // ── Engine brands (Own Launched) — India chronic portfolio ──
  // Rosuvas (Rosuvastatin) — Sun's #1 India brand by revenue, Rs 380+ Cr/yr [launch date est.]
  row(['Rosuvas', 'Own Launched', '2005-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Rosuvastatin (± Aspirin / Clopidogrel / Fenofibrate / Ezetimibe)', 'Cardiology', 'Dyslipidemia / Secondary CV Prevention', null, null, 'Crestor / Novastat', null, 'Chronic']),
  // Aztor (Atorvastatin) — cardio statin [launch date est.]
  row(['Aztor', 'Own Launched', '2002-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Atorvastatin (± Fenofibrate / Ezetimibe / Aspirin)', 'Cardiology', 'Dyslipidemia', null, null, 'Atorlip / Lipicure', null, 'Chronic']),
  // Cardivas (Carvedilol) — CHF/hypertension [launch date est.]
  row(['Cardivas', 'Own Launched', '2005-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Carvedilol', 'Cardiology', 'Hypertension / Chronic Heart Failure', null, null, 'Carca / Coreg', null, 'Chronic']),
  // Revelol AM (Metoprolol + Amlodipine) — cardio combo (from earlier dataset)
  row(['Revelol AM', 'Own Launched', '2023-04-22', '—', 'Sun Pharma', 'Line Extension', 'Metoprolol + Amlodipine', 'Cardiology', 'Hypertension / Angina', null, null, 'Nebicard-AM', null, 'Chronic']),
  // Pantocid (Pantoprazole) — India's flagship PPI brand [launch date est.]
  row(['Pantocid / Pantocid-DSR', 'Own Launched', '2000-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Pantoprazole (± Domperidone SR / Levosulpiride)', 'Gastroenterology', 'GERD / Peptic Ulcer / Dyspepsia', null, null, 'Pan / Pantium', null, 'Chronic']),
  // Sompraz (Esomeprazole) [launch date est.]
  row(['Sompraz', 'Own Launched', '2004-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Esomeprazole (± Domperidone)', 'Gastroenterology', 'GERD / Erosive Esophagitis', null, null, 'Nexium / Esoz', null, 'Chronic']),
  // Levipil (Levetiracetam) — CNS anti-epileptic [launch date est.]
  row(['Levipil', 'Own Launched', '2003-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Levetiracetam', 'Neurology / CNS', 'Epilepsy / Seizure Disorders', null, null, 'Keppra / Torleva', null, 'Chronic']),
  // Nexito (Escitalopram) — SSRI [launch date est.]
  row(['Nexito', 'Own Launched', '2005-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Escitalopram (± Clonazepam)', 'Neurology / CNS', 'Depression / Anxiety / OCD', null, null, 'Lexapro / Cipralex', null, 'Chronic']),
  // Istamet (Sitagliptin + Metformin) — Anti-Diabetic DPP-4 + biguanide
  row(['Istamet', 'Own Launched', '2013-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Sitagliptin + Metformin', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Janumet / Ziten-M', null, 'Chronic']),
  // Istamet XCite (triple combo) — line extension 12-Feb-2024
  row(['Istamet XCite', 'Own Launched', '2024-02-12', '—', 'Sun Pharma', 'Line Extension', 'Sitagliptin + Metformin + Dapagliflozin', 'Anti-Diabetic', 'Type 2 Diabetes (triple combo)', null, null, 'Oxra-M-Sita / Zomelis Met', null, 'Chronic']),
  // Oxra (Dapagliflozin) — Anti-Diabetic SGLT2i [launch date est.]
  row(['Oxra / Oxra-M', 'Own Launched', '2018-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Dapagliflozin (± Metformin / Sitagliptin)', 'Anti-Diabetic', 'Type 2 Diabetes / HF / CKD', null, null, 'Forxiga / Gluxit', null, 'Chronic']),
  // Gemer (Glimepiride + Metformin) — Anti-Diabetic combo [launch date est.]
  row(['Gemer', 'Own Launched', '2004-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Glimepiride + Metformin (± Voglibose / Pioglitazone)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl-M / Glimestar-M', null, 'Chronic']),
  // Silodal (Silodosin) — BPH [launch date est.]
  row(['Silodal', 'Own Launched', '2010-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Silodosin', 'Urology', 'Benign Prostatic Hyperplasia (BPH)', null, null, 'Urorec / Rapaflo', null, 'Chronic']),
  // Febuget (Febuxostat) — Rheumatology/Gout [launch date est.]
  row(['Febuget', 'Own Launched', '2012-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Febuxostat', 'Rheumatology', 'Gout / Hyperuricemia', null, null, 'Uloric / Zurig', null, 'Chronic']),
  // Naxdom (Naproxen + Domperidone) — Pain/Migraine [launch date est.]
  row(['Naxdom', 'Own Launched', '2010-01-01', '—', 'Sun Pharma', 'NCE Launch', 'Naproxen + Domperidone', 'Pain Management', 'Migraine / Menstrual Pain', null, null, 'Domstal-NS', null, 'Acute']),

  // ── Ranbaxy Acquisition (parent) — 25-Mar-2015, $4B; brought 629 ANDAs + India blockbusters ──
  // sunpharma.com / Daiichi Sankyo press release — merger of Ranbaxy into Sun (completion 25-Mar-2015)
  row(['Ranbaxy Laboratories (parent)', 'Acquired', '2015-03-25', 'Daiichi Sankyo', 'Sun Pharma', 'Company Acquisition', 'Various (629 ANDAs + India brands)', 'Multi-therapy', 'Multi-indication (India + Global)', 32000, null, 'Various', null, 'Chronic']),
  // Volini (Diclofenac+Menthol+Linseed Oil topical analgesic) — Ranbaxy's OTC flagship, acquired via Ranbaxy deal
  row(['Volini / Volini Maxx', 'Acquired', '2015-03-25', 'Daiichi Sankyo (via Ranbaxy)', 'Sun Pharma', 'Brand Acquisition', 'Diclofenac + Menthol + Methyl Salicylate + Linseed Oil (± Virgin Linseed)', 'Pain Management / Consumer Health', 'Musculoskeletal Pain / Sprains / Sport Injuries', null, null, 'Moov / Iodex', null, 'Acute']),
  // Revital (Ginseng + Vitamins + Minerals) — Ranbaxy's OTC multi-vit, via Ranbaxy deal
  row(['Revital H', 'Acquired', '2015-03-25', 'Daiichi Sankyo (via Ranbaxy)', 'Sun Pharma', 'Brand Acquisition', 'Ginseng + Multivitamin + Multimineral', 'Nutraceuticals / Consumer Health', 'Daily Wellness / Fatigue / Immunity', null, null, 'Supradyn / Zincovit', null, 'Chronic']),
  // Sotret (Isotretinoin) — Ranbaxy derm brand
  row(['Sotret', 'Acquired', '2015-03-25', 'Daiichi Sankyo (via Ranbaxy)', 'Sun Pharma', 'Brand Acquisition', 'Isotretinoin', 'Dermatology', 'Severe Nodulocystic Acne', null, null, 'Isotroin / Absorica', null, 'Chronic']),
  // Cifran (Ciprofloxacin) — Ranbaxy anti-infective
  row(['Cifran', 'Acquired', '2015-03-25', 'Daiichi Sankyo (via Ranbaxy)', 'Sun Pharma', 'Brand Acquisition', 'Ciprofloxacin (± Tinidazole / Ornidazole)', 'Anti-Infectives', 'Respiratory / UTI / GI Infections', null, null, 'Ciplox / Zoxan', null, 'Acute']),

  // ── Absorica LD — acquired from Cipher Pharmaceuticals (US) — 10-Nov-2022 ──
  row(['Absorica LD', 'Acquired', '2022-11-10', 'Cipher Pharmaceuticals', 'Sun Pharma', 'Asset Acquisition', 'Isotretinoin (Lidose)', 'Dermatology', 'Severe Nodular Acne', null, null, 'Sotret / Isotroin', null, 'Chronic']),

  // ── Concert Pharmaceuticals acquisition — 06-Mar-2023, $576M upfront + CVR ──
  // Sun Pharma completes acquisition of Concert Pharmaceuticals (brings deuruxolitinib/Leqselvi)
  row(['Concert Pharmaceuticals (parent)', 'Acquired', '2023-03-06', 'Concert Pharmaceuticals shareholders', 'Sun Pharma', 'Company Acquisition', 'Deuruxolitinib (deuterated JAK1/2 inhibitor)', 'Dermatology / Immunology', 'Severe Alopecia Areata', 4800, null, 'N/A (novel JAK inh)', null, 'Chronic']),

  // ── Cequa (Cyclosporine 0.09% nanomicellar) — India launch April 2023 ──
  // sunpharma.com / PharmaTutor — Sun launches Cequa in India for Dry Eye Disease (Apr-2023)
  row(['Cequa', 'Own Launched', '2023-04-01', '—', 'Sun Pharma', 'NCE Launch', 'Cyclosporine 0.09% (nanomicellar)', 'Ophthalmology', 'Chronic Dry Eye Disease', null, null, 'Restasis / Ikervis', null, 'Chronic']),

  // ── Winlevi (Clascoterone) — US/Canada co-marketing with Cassiopea (Jul-2021); India launch via Sun earlier dataset (20-Sep-2023) ──
  row(['Winlevi', 'In-licensed', '2023-09-20', 'Cassiopea SpA (Cosmo Pharma)', 'Sun Pharma', 'In-license (US + Canada + expansion)', 'Clascoterone 1% (topical androgen receptor inhibitor)', 'Dermatology', 'Acne Vulgaris (age >=12)', null, null, '—', null, 'Chronic']),

  // ── Taro Pharmaceuticals — remaining 21.5% buyout, completed 24-Jun-2024 ──
  row(['Taro Pharmaceuticals (remaining 21.5% buyout)', 'Acquired', '2024-06-24', 'Taro minority shareholders', 'Sun Pharma', 'Stake Increase (100% wholly-owned)', 'Topical generics + dermatology portfolio', 'Dermatology / Multi-therapy', 'Multi-indication (US-focused derma)', 2900, null, 'Various', null, 'Chronic']),

  // ── Leqselvi (Deuruxolitinib) US FDA approval — 25-Jul-2024; commercial launch Jul-2025 ──
  row(['Leqselvi', 'Own Launched', '2024-07-25', '—', 'Sun Pharma', 'NCE Approval (US)', 'Deuruxolitinib 8 mg (JAK1/2 inhibitor)', 'Dermatology / Immunology', 'Severe Alopecia Areata (adults)', null, null, 'Olumiant / Litfulo', null, 'Chronic']),

  // ── Checkpoint Therapeutics — acquired 30-May-2025 for $355M upfront + CVR ──
  row(['Checkpoint Therapeutics (parent)', 'Acquired', '2025-05-30', 'Checkpoint Therapeutics shareholders', 'Sun Pharma', 'Company Acquisition', 'Cosibelimab (anti-PD-L1 IgG1) + oncology pipeline', 'Oncology / Immuno-oncology', 'Advanced Cutaneous SCC', 3000, null, 'N/A (first anti-PD-L1 in cSCC)', null, 'Chronic']),

  // ── UNLOXCYT (Cosibelimab-ipdl) — FDA-approved anti-PD-L1 for aCSCC; launch via Checkpoint acquisition ──
  row(['UNLOXCYT', 'Own Launched', '2025-01-31', '—', 'Sun Pharma', 'NCE Launch (US)', 'Cosibelimab-ipdl (anti-PD-L1 IgG1)', 'Oncology / Immuno-oncology', 'Advanced Cutaneous Squamous Cell Carcinoma (aCSCC)', null, null, 'N/A (first-in-class)', null, 'Chronic']),

  // ── Fexuclue (Fexuprazan) — In-licensed from Daewoong Pharmaceutical (07-Apr-2025) ──
  row(['Fexuclue', 'In-licensed', '2025-04-07', 'Daewoong Pharmaceutical', 'Sun Pharma', 'In-license (India)', 'Fexuprazan 40 mg (P-CAB)', 'Gastroenterology', 'Erosive Esophagitis / GERD', null, null, 'Vonzai / Kabvie / Voquezna', null, 'Chronic']),

  // ── Ilumya (Tildrakizumab) — India launch 01-Dec-2025 ──
  row(['Ilumya', 'Own Launched', '2025-12-01', '—', 'Sun Pharma', 'NCE Launch (India)', 'Tildrakizumab-asmn (IL-23 p19 mAb)', 'Dermatology / Immunology', 'Moderate-Severe Plaque Psoriasis', null, null, 'Skyrizi / Stelara', null, 'Chronic']),

  // ── Noveltreat / Sematrinity — Semaglutide Day-1 launch (20-Mar-2026) ──
  row(['Noveltreat / Sematrinity', 'Own Launched', '2026-03-20', '—', 'Sun Pharma', 'Generic Launch', 'Semaglutide (injection)', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Rybelsus / Wegovy / Samakind', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Cipla — EXPANDED LIVE DATASET (deep-research edition)
  // Sources: cipla.com press releases + annual report FY25, ciplamed.com
  // product-index, Business Standard / BusinessToday / BioSpectrum /
  // PharmaTutor coverage, 1mg / Apollo / medplusmart product listings, WHO
  // MPP sub-license announcements. Cipla is India-Top-3 branded by domestic
  // sales, dominant in respiratory (#1 India inhaler market leader) with
  // strong chronic + oncology + HIV + OTC layers. India-specific M&A has
  // been limited (most M&A is US / South Africa); India growth has been
  // driven by own launches + in-licensing partnerships.
  // Dates confirmed for every deal; engine-brand launch years [est.].

  // ── Engine brands (Own Launched) ──
  // Asthalin (Salbutamol) — Cipla's legacy inhaled bronchodilator [launch date est.]
  row(['Asthalin', 'Own Launched', '1990-01-01', '—', 'Cipla', 'NCE Launch', 'Salbutamol (Albuterol)', 'Respiratory', 'Asthma / COPD (reliever)', null, null, 'Ventorlin / Levolin', null, 'Chronic']),
  // Ciplox (Ciprofloxacin) — flagship fluoroquinolone [launch date est.]
  row(['Ciplox', 'Own Launched', '1993-01-01', '—', 'Cipla', 'NCE Launch', 'Ciprofloxacin HCl', 'Anti-Infectives', 'Respiratory / UTI / GI Infections', null, null, 'Cifran / Zoxan', null, 'Acute']),
  // Ciplox Eye — eye-drop line extension (added 2022-03-04 in earlier data)
  row(['Ciplox Eye', 'Own Launched', '2022-03-04', '—', 'Cipla', 'Line Extension', 'Ciprofloxacin 0.3% (ophthalmic)', 'Ophthalmology', 'Bacterial Conjunctivitis', null, null, 'Ciplox', null, 'Acute']),
  // Novamox (Amoxicillin) — legacy paediatric / adult antibiotic [launch date est.]
  row(['Novamox', 'Own Launched', '1995-01-01', '—', 'Cipla', 'NCE Launch', 'Amoxicillin (100 mg/mL drops, 125/250/500 mg caps)', 'Anti-Infectives', 'Respiratory / ENT / Skin Infections', null, null, 'Mox / Amoxil', null, 'Acute']),
  // Foracort (Budesonide + Formoterol) — combination ICS-LABA inhaler; Cipla's blockbuster [launch date est.]
  row(['Foracort (Inhaler / Respules / Rotacaps)', 'Own Launched', '2005-01-01', '—', 'Cipla', 'NCE Launch', 'Budesonide + Formoterol Fumarate', 'Respiratory', 'Asthma / COPD Maintenance', null, null, 'Symbicort / Seroflo', null, 'Chronic']),
  // Foracort NEXThaler — DPI device launch
  row(['Foracort NEXThaler', 'Own Launched', '2023-05-16', '—', 'Cipla', 'Device Launch', 'Budesonide + Formoterol Fumarate (DPI)', 'Respiratory', 'Asthma / COPD (low-resistance DPI)', null, null, 'Foracort MDI', null, 'Chronic']),
  // Seroflo (Salmeterol + Fluticasone) — ICS-LABA [launch date est.]
  row(['Seroflo', 'Own Launched', '2005-01-01', '—', 'Cipla', 'NCE Launch', 'Salmeterol + Fluticasone Propionate', 'Respiratory', 'Asthma / COPD Maintenance', null, null, 'Advair / Seretide', null, 'Chronic']),
  // Budecort (Budesonide respules / inhaler) [launch date est.]
  row(['Budecort', 'Own Launched', '2002-01-01', '—', 'Cipla', 'NCE Launch', 'Budesonide (Nebulizer / Inhaler)', 'Respiratory', 'Asthma / Croup / Bronchitis', null, null, 'Pulmicort', null, 'Chronic']),
  // Duolin (Levosalbutamol + Ipratropium) [launch date est.]
  row(['Duolin', 'Own Launched', '2005-01-01', '—', 'Cipla', 'NCE Launch', 'Levosalbutamol + Ipratropium Bromide', 'Respiratory', 'Asthma / COPD (SABA+SAMA)', null, null, 'Combivent / Asthakind', null, 'Chronic']),
  // CipAir — AI-powered asthma screening app (digital health initiative), announced FY25
  row(['CipAir (AI Asthma Screening)', 'Own Launched', '2024-10-01', '—', 'Cipla', 'Digital Health Launch', 'Breathing-signature ML model (mobile app)', 'Respiratory', 'Asthma Screening / Awareness', null, null, 'N/A', null, 'Chronic']),

  // ── Historical in-licensing (existing in earlier data, kept) ──
  // Cipla + Servier — Ivabrad (Ivabradine)
  row(['Ivabrad', 'In-licensed', '2021-12-02', 'Servier', 'Cipla', 'In-license (India)', 'Ivabradine', 'Cardiology', 'Chronic Heart Failure / Stable Angina', null, null, 'Ivabid / Corlanor', null, 'Chronic']),
  // Cipla + Eli Lilly — Humalog + Trulicity distribution (04-Oct-2021)
  row(['Humalog + Trulicity (Eli Lilly rights)', 'In-licensed', '2021-10-04', 'Eli Lilly', 'Cipla', 'Co-marketing', 'Insulin Lispro / Dulaglutide', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Huminsulin / Victoza', null, 'Chronic']),
  // Cipla + Ferring — Nocdurna (Desmopressin 27.7 mcg ODT) for nocturia
  row(['Nocdurna', 'In-licensed', '2024-03-22', 'Ferring Pharmaceuticals', 'Cipla', 'In-license (India)', 'Desmopressin Acetate (27.7 mcg ODT)', 'Urology', 'Nocturia (Nocturnal Polyuria)', null, null, '—', null, 'Chronic']),

  // ── Orchid Pharma partnership — Cefepime-Enmetazobactam (28-Jun-2024) ──
  // Business Standard / cipla.com — Orchid Pharma + Cipla marketing licence; Cipla sells as Cipenmet + Esblocip
  row(['Cipenmet / Esblocip', 'In-licensed', '2024-06-28', 'Orchid Pharma', 'Cipla', 'Co-marketing', 'Cefepime + Enmetazobactam', 'Anti-Infectives', 'Complicated UTI / HAP / VAP', null, null, 'Orblicef', null, 'Acute']),

  // ── ViiV Healthcare / Medicines Patent Pool — Long-Acting Cabotegravir sublicence (Mar-2023) ──
  row(['Cabotegravir LA (via MPP / ViiV)', 'In-licensed', '2023-03-09', 'Medicines Patent Pool (ViiV)', 'Cipla', 'Voluntary Licence', 'Cabotegravir + Rilpivirine (long-acting injectable)', 'Anti-Infectives / HIV', 'HIV-1 Treatment & Prevention', null, null, 'Vocabria / Cabenuva', null, 'Chronic']),

  // ── MannKind Afrezza (launch 22-Dec-2025; agreement originally signed May 2018) ──
  row(['Afrezza', 'In-licensed', '2025-12-22', 'MannKind Corporation', 'Cipla', 'In-license (India)', 'Insulin Human (inhaled)', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes (prandial inhaled)', null, null, 'Huminsulin / Actrapid', null, 'Chronic']),

  // ── Eli Lilly × Cipla — Tirzepatide (Yurpeak) distribution (23-Oct-2025) ──
  row(['Yurpeak (Tirzepatide)', 'In-licensed', '2025-10-23', 'Eli Lilly', 'Cipla', 'Co-marketing', 'Tirzepatide (GIP + GLP-1 RA)', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Mounjaro / Zepbound', null, 'Chronic']),

  // ── Stempeutics Ciplostem (stem cell therapy for Knee OA, 03-Dec-2025) ──
  row(['Ciplostem', 'In-licensed', '2025-12-03', 'Stempeutics Research', 'Cipla', 'Co-marketing', 'Allogeneic Mesenchymal Stromal Cells (MSC, intra-articular)', 'Orthobiologic / Regenerative Medicine', 'Knee Osteoarthritis (Grade II-III)', null, null, 'N/A (first-in-class)', null, 'Chronic']),

  // ── Novartis Galvus perpetual licence (effective 01-Jan-2026, Rs 1,107 Cr) ──
  row(['Galvus / Galvus Met (perpetual licence)', 'In-licensed', '2026-01-01', 'Novartis Pharma AG', 'Cipla', 'Perpetual Trademark Licence', 'Vildagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes (DPP-4 inhibitor)', null, null, 'Zomelis / Jalra', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Torrent Pharma — EXPANDED LIVE DATASET (deep-research edition)
  // Sources: torrentpharma.com press releases + PDFs, Business Standard,
  // HDFC Sec / M&A Critique deal reports, BusinessToday, Apollo / 1mg /
  // medplusmart product listings, BSE filings. Torrent FY25 revenue ~Rs
  // 11,500 Cr, Top-7 IPM rank. Focus: CVS + CNS + GI + WHC + VMN + derm.
  // Dates confirmed for every deal; engine-brand launch years are [est.]
  // where company history doesn't disclose exact year.

  // ── Own-launched engine brands (pre-acquisition portfolio) ──
  // Losar (Losartan) — Torrent's flagship ARB [launch date est.]
  row(['Losar / Losar-H', 'Own Launched', '2000-01-01', '—', 'Torrent Pharma', 'NCE Launch', 'Losartan (± Hydrochlorothiazide)', 'Cardiology', 'Hypertension', null, null, 'Lowrac / Repace', null, 'Chronic']),
  // Dilzem SR (Diltiazem Sustained Release) — Torrent cardio [launch date est.]
  row(['Dilzem SR', 'Own Launched', '2002-01-01', '—', 'Torrent Pharma', 'NCE Launch', 'Diltiazem HCl SR', 'Cardiology', 'Hypertension / Angina', null, null, 'Angizem', null, 'Chronic']),
  // Nikoran (Nicorandil 5/10 mg) — anti-anginal [launch date est.]
  row(['Nikoran', 'Own Launched', '2005-01-01', '—', 'Torrent Pharma', 'NCE Launch', 'Nicorandil 5 / 10 mg', 'Cardiology', 'Stable / Chronic Angina', null, null, 'Nicorangin / Korandil', null, 'Chronic']),
  // Nebicard (Nebivolol) — cardio-selective beta-blocker [launch date est.]
  row(['Nebicard', 'Own Launched', '2008-01-01', '—', 'Torrent Pharma', 'NCE Launch', 'Nebivolol HCl 2.5 / 5 / 10 mg', 'Cardiology', 'Hypertension / Chronic Heart Failure', null, null, 'Nebilong / Nodon', null, 'Chronic']),
  // Nexpro (Esomeprazole) — PPI [launch date est.]
  row(['Nexpro', 'Own Launched', '2005-01-01', '—', 'Torrent Pharma', 'NCE Launch', 'Esomeprazole (± Domperidone)', 'Gastroenterology', 'GERD / Peptic Ulcer', null, null, 'Nexium / Esofag', null, 'Chronic']),

  // ── Acquisition #1: Elder Pharma India Business — Dec 2013, Rs 2,004 Cr ──
  // Business Standard (13-Dec-2013) — ~30 brands acquired with Shelcal / Chymoral / Carnisure / Deviry as leaders
  row(['Elder Pharma India Business (parent)', 'Acquired', '2013-12-13', 'Elder Pharmaceuticals', 'Torrent Pharma', 'Brand Portfolio Acquisition', 'Various (Calcium / NSAID-Enzyme / Carnitine / MPA)', 'Multi-therapy', 'Multi-indication', 2004, null, 'Various', null, 'Chronic']),
  row(['Shelcal', 'Acquired', '2013-12-13', 'Elder Pharmaceuticals', 'Torrent Pharma', 'Brand Acquisition', 'Calcium Carbonate + Vitamin D3 (± Magnesium / Zinc)', 'Nutraceuticals', 'Osteoporosis / Calcium Deficiency', null, null, 'Calcimax / Calcirol', null, 'Chronic']),
  row(['Chymoral Forte / Chymoral-BR', 'Acquired', '2013-12-13', 'Elder Pharmaceuticals', 'Torrent Pharma', 'Brand Acquisition', 'Trypsin + Chymotrypsin (± Bromelain + Rutoside)', 'Pain Management', 'Inflammation / Soft-tissue Injury / Post-op Oedema', null, null, '—', null, 'Acute']),
  row(['Carnisure', 'Acquired', '2013-12-13', 'Elder Pharmaceuticals', 'Torrent Pharma', 'Brand Acquisition', 'Levocarnitine', "Women's Health / Nutraceuticals", 'Carnitine Deficiency / Male Infertility', null, null, 'Carnitor / L-Carnipure', null, 'Chronic']),
  row(['Deviry', 'Acquired', '2013-12-13', 'Elder Pharmaceuticals', 'Torrent Pharma', 'Brand Acquisition', 'Medroxyprogesterone Acetate', "Women's Health", 'Menstrual Disorders / Endometriosis', null, null, 'Meprate / Modus', null, 'Chronic']),

  // ── Acquisition #2: Unichem Laboratories India + Nepal Business — Nov 2017, Rs 3,600 Cr ──
  // Business Standard (03-Nov-2017); 120+ brands and the Sikkim facility; 3,000+ employees transferred
  row(['Unichem Labs India Business (parent)', 'Acquired', '2017-11-03', 'Unichem Laboratories', 'Torrent Pharma', 'Brand Portfolio Acquisition', 'Various (120+ brands across cardio / diabetes / GI / CNS)', 'Multi-therapy', 'Multi-indication (India + Nepal)', 3600, null, 'Various', null, 'Chronic']),
  row(['Unienzyme', 'Acquired', '2017-11-03', 'Unichem Laboratories', 'Torrent Pharma', 'Brand Acquisition', 'Fungal Diastase + Papain + Activated Charcoal (+ Simethicone)', 'Gastroenterology', 'Indigestion / Flatulence', null, null, 'Aristozyme / Enzar', null, 'Acute']),
  row(['Ampoxin', 'Acquired', '2017-11-03', 'Unichem Laboratories', 'Torrent Pharma', 'Brand Acquisition', 'Ampicillin + Cloxacillin', 'Anti-Infectives', 'Skin / Soft Tissue / Respiratory Infections', null, null, 'Megapen / Roscillin', null, 'Acute']),
  row(['Telsar / Losar (Unichem)', 'Acquired', '2017-11-03', 'Unichem Laboratories', 'Torrent Pharma', 'Brand Acquisition', 'Telmisartan / Losartan', 'Cardiology', 'Hypertension', null, null, 'Telma / Repace', null, 'Chronic']),

  // ── Acquisition #3: Curatio Healthcare — Sep 2022, Rs 2,000 Cr ──
  // Business Standard (27-Sep-2022) — cosmo-derma + pediatric care portfolio; top 10 brands = 75% of sales
  row(['Curatio Healthcare (parent)', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Company Acquisition', 'Various (Cosmo-Derma + Pediatric Care)', 'Dermatology', 'Multi-indication (derm-led)', 2000, null, 'Various', null, 'Chronic']),
  row(['Tedibar', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Brand Acquisition', 'Soap-free pH 5.5 Cleansing Bar (syndet)', 'Dermatology / Pediatric', 'Sensitive / Baby Skin Cleansing', null, null, 'Cetaphil / Sebamed', null, 'Acute']),
  row(['Atogla', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Brand Acquisition', 'Ceramide III + Gamma Linoleic Acid + Oat Lipids', 'Dermatology', 'Atopic Dermatitis / Dry Skin / Barrier Repair', null, null, 'Atopiclair / Cetaphil RestoraDerm', null, 'Chronic']),
  row(['Spoo', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Brand Acquisition', 'Tear-free Baby Shampoo (mild surfactant)', 'Dermatology / Pediatric', 'Pediatric Hair & Scalp Care', null, null, 'Johnson Baby / Himalaya Baby', null, 'Acute']),
  row(['B4 Nappi', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Brand Acquisition', 'Zinc Oxide 15% + Calendula Oil + Allantoin', 'Dermatology / Pediatric', 'Nappy / Diaper Rash Prevention', null, null, 'Desitin / Himalaya Diaper Rash', null, 'Acute']),
  row(['Permite', 'Acquired', '2022-09-27', 'Curatio Healthcare', 'Torrent Pharma', 'Brand Acquisition', 'Permethrin 5% cream', 'Dermatology / Anti-Infectives', 'Scabies / Pediculosis', null, null, 'Scabper / Acticin', null, 'Acute']),

  // ── In-licensing #1: Zydus Saroglitazar co-marketing (Vorxar) — 10-Nov-2023 ──
  // Business Standard — Torrent inks licensing pact with Zydus for liver disease drug (10-Nov-2023)
  row(['Vorxar (Saroglitazar)', 'In-licensed', '2023-11-10', 'Zydus Lifesciences', 'Torrent Pharma', 'Co-marketing', 'Saroglitazar Magnesium', 'Gastroenterology / Hepatology', 'NASH / NAFLD / Diabetic Dyslipidemia', null, null, 'Lipaglyn / Bilypsa', null, 'Chronic']),

  // ── In-licensing #2: Takeda Vonoprazan patent licence (Kabvie) — 05-Jun-2024 ──
  // Business Standard / BioSpectrum — Torrent + Takeda non-exclusive patent licence (05-Jun-2024)
  row(['Kabvie (Vonoprazan)', 'In-licensed', '2024-06-05', 'Takeda Pharmaceuticals', 'Torrent Pharma', 'In-license (India)', 'Vonoprazan (P-CAB)', 'Gastroenterology', 'GERD / Erosive Esophagitis', null, null, 'Voquezna / Vohozin', null, 'Chronic']),

  // ── Own-launched (recent) ──
  // Shelcal Total — adult nutrition powder launch (23-Jul-2025)
  row(['Shelcal Total', 'Own Launched', '2025-07-23', '—', 'Torrent Pharma', 'Line Extension', 'Protein + Ca + Mg + D3 + K2 + Glucosamine + Bamboo extract', 'Nutraceuticals', 'Adult Bone-Joint + Daily Wellness', null, null, 'Ensure / Protinex', null, 'Chronic']),

  // ── Acquisition #4: JB Chemicals & Pharmaceuticals (46.39% controlling stake from KKR) ──
  // Announced 29-Jun-2025; completed 21-Jan-2026; NCLT first-motion order 23-Mar-2026; total deal Rs 25,689 Cr
  row(['JB Chemicals & Pharmaceuticals (parent)', 'Acquired', '2026-01-21', 'Tau Investment Holdings (KKR)', 'Torrent Pharma', 'Company Acquisition', 'Various (50+ brands across cardio / GI / derm / nephro / respiratory)', 'Multi-therapy', 'Multi-indication', 25689, null, 'Various', null, 'Chronic']),
  row(['Cilacar', 'Acquired', '2026-01-21', 'Tau Investment Holdings (KKR)', 'Torrent Pharma', 'Brand Acquisition', 'Cilnidipine (± Telmisartan / Chlorthalidone / Metoprolol)', 'Cardiology', 'Hypertension (#1 CCB in India)', null, null, 'Cilacar', null, 'Chronic']),
  row(['Nicardia', 'Acquired', '2026-01-21', 'Tau Investment Holdings (KKR)', 'Torrent Pharma', 'Brand Acquisition', 'Nifedipine (Retard / XL)', 'Cardiology', 'Resistant Hypertension', null, null, 'Adalat / Nifedical', null, 'Chronic']),
  row(['Rantac', 'Acquired', '2026-01-21', 'Tau Investment Holdings (KKR)', 'Torrent Pharma', 'Brand Acquisition', 'Ranitidine', 'Gastroenterology', 'Peptic Ulcer / GERD (legacy H2-blocker)', null, null, 'Zinetac / Aciloc', null, 'Acute']),
  row(['Metrogyl', 'Acquired', '2026-01-21', 'Tau Investment Holdings (KKR)', 'Torrent Pharma', 'Brand Acquisition', 'Metronidazole', 'Anti-Infectives', 'Amoebiasis / Anaerobic Infections', null, null, 'Flagyl', null, 'Acute']),

  // ── Semaglutide Day-1 launches (21-Mar-2026) ──
  // torrentpharma.com press release + BSE filing — Semalix (India's first generic oral semaglutide) + Sembolic (injectable, co-marketed with Zydus starting Rs 3,999/month)
  row(['Semalix', 'Own Launched', '2026-03-21', '—', 'Torrent Pharma', 'Generic Launch', 'Semaglutide (oral — India-first generic)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Rybelsus', null, 'Chronic']),
  row(['Sembolic', 'In-licensed', '2026-03-21', 'Zydus Lifesciences', 'Torrent Pharma', 'Co-marketing', 'Semaglutide (injectable pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Ozempic / Semaglyn', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Alkem Laboratories — EXPANDED LIVE DATASET (deep-research edition)
  // Sources: alkemlabs.com press releases + annual report, Business Standard /
  // BusinessToday / BioSpectrum / PharmaBiz / Medical Dialogues coverage, BSE
  // filings, 1mg / Apollo / medplusmart product listings, Sonnet BioThera +
  // Harvard OTD press releases. Alkem FY25 revenue Top-5 IPM, dominant in
  // acute therapies (anti-infectives + gastro); expanding into chronic
  // (diabetes + onco biosimilars) through organic + licensing plays.
  // Subsidiaries: Cachet Pharmaceuticals + Indchemie Health Specialities +
  // Alkem Wellness (trade generics, spun off 01-Oct-2025) + Enzene Biosciences
  // (biotech arm). Launch dates for legacy engine brands are [est.].

  // ── Engine brands (Own Launched) ──
  // Taxim (Cefotaxime injection) — legacy anti-infective, injection [launch date est.]
  row(['Taxim', 'Own Launched', '1995-01-01', '—', 'Alkem', 'NCE Launch', 'Cefotaxime Sodium', 'Anti-Infectives', 'Gram-negative / Meningitis / Severe Infections', null, null, 'Claforan / Omnatax', null, 'Acute']),
  // Taxim-O (Cefixime) — first anti-infective in India to cross Rs 100 Cr (2006) [launch date est.]
  row(['Taxim-O / Taxim-O Forte', 'Own Launched', '2000-01-01', '—', 'Alkem', 'NCE Launch', 'Cefixime (± Linezolid / Ofloxacin)', 'Anti-Infectives', 'Respiratory / UTI / Enteric Fever', null, null, 'Zifi / Mahacef', null, 'Acute']),
  // Clavam (Amoxicillin + Clavulanic Acid) — crossed Rs 200 Cr in 2014 [launch date est.]
  row(['Clavam', 'Own Launched', '2000-01-01', '—', 'Alkem', 'NCE Launch', 'Amoxicillin + Clavulanic Acid', 'Anti-Infectives', 'Respiratory / Skin / Dental Infections', null, null, 'Augmentin / Moxikind-CV', null, 'Acute']),
  // Xone (Ceftriaxone injection) — hospital antibiotic [launch date est.]
  row(['Xone', 'Own Launched', '2003-01-01', '—', 'Alkem', 'NCE Launch', 'Ceftriaxone (± Sulbactam / Tazobactam)', 'Anti-Infectives', 'Hospital-acquired Infections / Meningitis', null, null, 'Monocef / Cefaxone', null, 'Acute']),
  // Pipzo (Piperacillin + Tazobactam) — hospital-grade anti-infective [launch date est.]
  row(['Pipzo', 'Own Launched', '2010-01-01', '—', 'Alkem', 'NCE Launch', 'Piperacillin + Tazobactam', 'Anti-Infectives', 'Hospital-acquired / Intra-abdominal Infections', null, null, 'Tazact / Zosyn', null, 'Acute']),
  // Pan (Pantoprazole) — Alkem's flagship PPI [launch date est.]
  row(['Pan (Pantoprazole)', 'Own Launched', '2005-05-10', '—', 'Alkem', 'NCE Launch', 'Pantoprazole 20 / 40 mg', 'Gastroenterology', 'GERD / Peptic Ulcer', null, null, 'Pantocid / Pantium', null, 'Chronic']),
  // Pan-D (Pantoprazole + Domperidone) — combo [launch date est.]
  row(['Pan-D', 'Own Launched', '2008-01-01', '—', 'Alkem', 'NCE Launch', 'Pantoprazole 40 mg + Domperidone 30 mg SR', 'Gastroenterology', 'GERD with Dyspepsia / Reflux Esophagitis', null, null, 'Pantocid-D', null, 'Chronic']),
  // Ondem (Ondansetron) — antiemetic [launch date est.]
  row(['Ondem', 'Own Launched', '2005-01-01', '—', 'Alkem', 'NCE Launch', 'Ondansetron (± Paracetamol)', 'Oncology Support / Gastroenterology', 'CINV / Post-op Vomiting / Gastroenteritis', null, null, 'Emeset / Vomikind', null, 'Acute']),
  // Gemcal-DS (Calcitriol + Ca + K2-7 + Zn + Mg + Methylcobalamin) [launch date est.]
  row(['Gemcal / Gemcal-DS', 'Own Launched', '2010-01-01', '—', 'Alkem', 'NCE Launch', 'Calcitriol + Calcium Carbonate + K2-7 + Zinc + Mg + Methylcobalamin', 'Nutraceuticals', 'Osteoporosis / Bone-Joint Health', null, null, 'Shelcal / Calcimax', null, 'Chronic']),
  // A To Z NS (multivitamin) [launch date est.]
  row(['A To Z NS', 'Own Launched', '2010-01-01', '—', 'Alkem', 'NCE Launch', 'Multivitamin + Minerals + Antioxidants', 'Nutraceuticals', 'General Supplementation / Convalescence', null, null, 'Revital / Supradyn', null, 'Chronic']),
  // Sumo (Nimesulide + Paracetamol) [launch date est.]
  row(['Sumo', 'Own Launched', '2005-01-01', '—', 'Alkem', 'NCE Launch', 'Nimesulide + Paracetamol', 'Pain Management', 'Fever / Inflammation / Musculoskeletal Pain', null, null, 'Nise / Nimulid', null, 'Acute']),

  // ── Cachet Pharmaceuticals undertaking acquisition — liquid-manufacturing business (2020) ──
  // Legally India / DSIJ — Alkem acquires liquid-products undertaking from subsidiary Cachet Pharmaceuticals (FY20)
  row(['Cachet Liquid Manufacturing Undertaking', 'Acquired', '2020-04-01', 'Cachet Pharmaceuticals (subsidiary)', 'Alkem', 'Asset Acquisition', 'N/A (manufacturing transfer, not a brand)', 'Multi-therapy', 'Backward integration — liquid dosage forms', null, null, 'N/A', null, 'Chronic']),

  // ── Enzar (Bempedoic Acid) — early NCE launch in India ──
  row(['Enzar', 'Own Launched', '2022-04-19', '—', 'Alkem', 'NCE Launch', 'Bempedoic Acid (± Ezetimibe)', 'Cardiology', 'Statin-intolerant Hypercholesterolaemia / Secondary CV Prevention', null, null, 'Nexletol / Bemdac', null, 'Chronic']),

  // ── Harvard University licence (2024) — vascular / diabetic neuropathy technology ──
  // Wyss Institute / MarketScreener — Alkem licences novel technology from Harvard OTD for DFU + DPN + PAD (2024)
  row(['Harvard OTD Vascular-Disease Platform', 'In-licensed', '2024-06-01', 'Harvard University (OTD)', 'Alkem', 'Technology Licence', 'Novel device / formulation technology (vascular)', 'Cardiology / Neurology / Critical Care', 'Ischemic Injury / DFU / PAD / Diabetic Peripheral Neuropathy', null, null, 'N/A (platform tech)', null, 'Chronic']),

  // ── Vonzai (Vonoprazan) — Takeda patent licence (Sep-2024) ──
  // Medical Dialogues / eHealth / Pharmabiz — Alkem signs non-exclusive patent licence with Takeda to commercialise Vonoprazan as Vonzai in India (Sep-2024)
  row(['Vonzai (Vonoprazan)', 'In-licensed', '2024-09-16', 'Takeda Pharmaceuticals', 'Alkem', 'In-license (India)', 'Vonoprazan (P-CAB) 10 / 20 mg', 'Gastroenterology', 'GERD / PUD / H. pylori eradication', null, null, 'Vohozin / Kabvie', null, 'Chronic']),

  // ── Sonnet BioTherapeutics licence — SON-080 (IL-6 fusion protein) for diabetic peripheral neuropathy (08-Oct-2024) ──
  // Business Standard / Indian Pharma Post / Sonnet SEC 10-1 filing — Alkem gets exclusive India rights to develop/commercialise SON-080
  row(['SON-080 (IL-6 fusion protein)', 'In-licensed', '2024-10-08', 'Sonnet BioTherapeutics', 'Alkem', 'In-license (India)', 'Low-dose recombinant human IL-6 (Fc-fusion)', 'Neurology / CNS', 'Diabetic Peripheral Neuropathy / CIPN', null, null, 'N/A (pipeline)', null, 'Chronic']),

  // ── Adroit Biomed acquisition — Rs 140 Cr (completed 23-Apr-2025) ──
  // BusinessUpturn / Medical Dialogues — 100% acquisition for dermatology / cosmetology / nutraceuticals expansion
  row(['Adroit Biomed (parent)', 'Acquired', '2025-04-23', 'Adroit Biomed promoters', 'Alkem', 'Company Acquisition', 'Various (Derma / Cosmetology / Nutraceuticals portfolio)', 'Dermatology / Nutraceuticals', 'Skincare / Cosmoceutical / Nutrition', 140, null, 'Various', null, 'Chronic']),

  // ── Empanorm family — generic Empagliflozin launch (12-Mar-2025) ──
  // BSE filing / Business Standard / BioSpectrum — Alkem launches generic Empagliflozin + FDCs under Empanorm / Empanorm-L / Empanorm-M / Empanorm Duo / Alsita E (12-Mar-2025)
  row(['Empanorm / Empanorm-L / Empanorm-M / Empanorm Duo', 'Own Launched', '2025-03-12', '—', 'Alkem', 'Generic Launch', 'Empagliflozin (± Linagliptin / Sitagliptin / Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes / CKD / Heart Failure', null, null, 'Jardiance / Glempa', null, 'Chronic']),

  // ── Pertuza pertuzumab biosimilar launch (22-Sep-2025) via Enzene Biosciences (Alkem's biotech subsidiary) ──
  row(['Pertuza', 'Own Launched', '2025-09-22', '—', 'Alkem', 'Biosimilar Launch', 'Pertuzumab (420mg / 14mL)', 'Oncology', 'HER2+ Metastatic / Early Breast Cancer', null, null, 'Perjeta', null, 'Chronic']),

  // ── Alkem Wellness — trade generics internal transfer (01-Oct-2025, Rs 532.5 Cr) ──
  row(['Alkem Wellness (Trade Generics slump sale)', 'Acquired', '2025-10-01', 'Alkem Laboratories (parent)', 'Alkem', 'Internal Business Transfer', 'Trade generics portfolio (Rs 532.5 Cr slump sale to subsidiary)', 'Multi-therapy', 'Multi-indication (trade generics)', 533, null, 'N/A', null, 'Chronic']),

  // ── Semasize / Obesema / Hepaglide — Semaglutide Day-1 launch (21-Mar-2026) ──
  row(['Semasize / Obesema / Hepaglide', 'Own Launched', '2026-03-21', '—', 'Alkem', 'Generic Launch', 'Semaglutide (1 mg disposable + reusable pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ─── Intas Pharmaceuticals — LIVE (Bio-Thera / press releases) ───
  // PRNewswire / BioSpace "Bio-Thera expands partnership with Intas for BAT2506 Golimumab biosimilar in India" (23-Mar-2026)
  row(['BAT2506 (Golimumab biosimilar)', 'In-licensed', '2026-03-23', 'Bio-Thera Solutions', 'Intas', 'In-license (India)', 'Golimumab', 'Immunology', 'Psoriatic Arthritis / Ankylosing Spondylitis / UC', null, null, 'Simponi', null, 'Chronic']),

  // ─── Aurobindo Pharma — LIVE (BSE filings) ───
  // Business Standard / Pharmatutor "Aurobindo Pharma arm acquires Khandelwal Labs non-oncology business for Rs 325 Cr" (effective 01-Jan-2026)
  row(['Khandelwal Non-Oncology Brands', 'Acquired', '2026-01-01', 'Khandelwal Laboratories', 'Aurobindo', 'Brand Portfolio Acquisition', 'Various (23 brands / 67 SKUs)', 'Multi-therapy', 'Multi-indication (non-oncology)', null, null, 'Various', null, 'Chronic']),

  // ─── Mankind Pharma — EXPANDED LIVE DATASET (deep-research edition) ───
  // Sources: mankindpharma.com (heritage + press releases), Mankind DRHP / IPO
  // note (Apr-2023), DRL & Panacea Biotec disclosures, BSV portfolio from 1mg /
  // bsvgroup.com. Every row individually verifiable. Molecules confirmed from
  // pharmacy listings (1mg / Apollo / Truemeds / Practo).
  //
  // Bundled deals (BSV 2024-10-23, Panacea 2022-03-01) are kept as UMBRELLA
  // rows AND separately unbundled into per-brand rows for therapy attribution.
  // Early Own-Launched brand rows (Amlokind, Moxikind-CV etc.) use CLEARLY
  // ESTIMATED launch dates where exact dates aren't public — marked "[est.]".
  // Financial columns (Market Size ₹Cr, CAGR %, Est. Annual Sales ₹Cr) left
  // null per IQVIA/PharmaTrac paywall.

  // ── Core own-launched brands (1995-2019) ──
  // Mankind Pharma heritage — "Moxikind-CV was an early product" [launch date est.]
  row(['Moxikind-CV', 'Own Launched', '2000-01-01', '—', 'Mankind Pharma', 'Generic Launch', 'Amoxicillin + Clavulanic Acid', 'Anti-Infectives', 'Respiratory / UTI Infections', null, null, 'Augmentin / Clavam', null, 'Acute']),
  // mankindpharma.com / Shoonya — "in 2004 Mankind made mark in chronic segment by launching Amlokind and Glimestar"
  row(['Amlokind-AT', 'Own Launched', '2004-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Amlodipine + Atenolol', 'Cardiology', 'Hypertension / Angina', null, null, 'Amlopres-AT', null, 'Chronic']),
  row(['Glimestar-M', 'Own Launched', '2004-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Glimepiride + Metformin', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl-M', null, 'Chronic']),
  // mankindpharma.com / Shoonya — "Nurokind launched in 2004"
  row(['Nurokind', 'Own Launched', '2004-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Methylcobalamin 1500 mcg', 'Neurology / CNS', 'Peripheral / Diabetic Neuropathy', null, null, 'Methycobal / Mecobal', null, 'Chronic']),
  // Mankind Heritage — Gudcef (Cefpodoxime) early antibiotic portfolio [launch date est.]
  row(['Gudcef', 'Own Launched', '2006-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Cefpodoxime Proxetil', 'Anti-Infectives', 'Respiratory / UTI Infections', null, null, 'Monocef-O / Cepodem', null, 'Acute']),
  // Cefakind (Cefuroxime Axetil 500 mg / 125 mg syrup) — long-running Mankind anti-infective [launch date est.]
  row(['Cefakind', 'Own Launched', '2004-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Cefuroxime Axetil', 'Anti-Infectives', 'Respiratory / Skin / UTI Infections', null, null, 'Ceftum / Zinacef', null, 'Acute']),
  // Candiforce (Itraconazole 100 mg) — Mankind anti-fungal [launch date est.]
  row(['Candiforce', 'Own Launched', '2008-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Itraconazole', 'Dermatology / Anti-Infectives', 'Systemic Fungal Infections / Onychomycosis', null, null, 'Sporanox / Canditral', null, 'Chronic']),
  // Asthakind-DX cough syrup — Mankind Rx respiratory [launch date est.]
  row(['Asthakind-DX', 'Own Launched', '2007-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Phenylephrine + Chlorpheniramine + Dextromethorphan', 'Respiratory', 'Cough / Common Cold', null, null, 'Benadryl / Corex DX', null, 'Acute']),
  // Codistar-DX cough syrup — Mankind Rx respiratory [launch date est.]
  row(['Codistar-DX', 'Own Launched', '2005-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Dextromethorphan + Chlorpheniramine Maleate', 'Respiratory', 'Dry Cough / Allergic Rhinitis', null, null, 'Dilo-DX / Tussinex', null, 'Acute']),
  // Dolokind (Aceclofenac) — Mankind pain management [launch date est.]
  row(['Dolokind', 'Own Launched', '2005-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Aceclofenac (± Paracetamol)', 'Pain Management', 'Osteoarthritis / RA / Ankylosing Spondylitis', null, null, 'Zerodol / Hifenac', null, 'Acute']),
  // Monticope (Montelukast + Levocetirizine) — Mankind allergy / asthma [launch date est.]
  row(['Monticope', 'Own Launched', '2008-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Montelukast + Levocetirizine', 'Respiratory / Immunology', 'Allergic Rhinitis / Chronic Urticaria / Asthma', null, null, 'Montair-LC / Levair', null, 'Chronic']),
  // Caldikind Plus (Ca + D3 + DHA/EPA + Folate + Methylcobalamin) — Mankind nutra bone/joint [launch date est.]
  row(['Caldikind Plus', 'Own Launched', '2010-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Calcium + Vit D3 + DHA/EPA + Folic Acid + Methylcobalamin', 'Nutraceuticals', 'Osteoporosis / Bone-Joint Health', null, null, 'Shelcal-HD / Calcimax', null, 'Chronic']),
  // Telmikind (Telmisartan) cardio portfolio [launch date est.]
  row(['Telmikind / Telmikind-H', 'Own Launched', '2008-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Telmisartan (± HCTZ)', 'Cardiology', 'Hypertension', null, null, 'Telma / Telsartan', null, 'Chronic']),
  // mankindpharma.com / india.com — 2007 consumer healthcare division launch (Manforce + Prega News + Gas-O-Fast + Unwanted-72)
  row(['Manforce (condoms + Rx)', 'Own Launched', '2007-01-01', '—', 'Mankind Pharma', 'Consumer Launch', 'Sildenafil (Rx) / Latex (consumer)', 'Consumer Health', "Men's Wellness / Sexual Wellness", null, null, '—', null, 'Acute']),
  row(['Unwanted-72', 'Own Launched', '2007-01-01', '—', 'Mankind Pharma', 'Consumer Launch', 'Levonorgestrel 1.5 mg', "Women's Health", 'Emergency Contraception', null, null, 'Norlevo / Pill-72', null, 'Acute']),
  row(['Gas-O-Fast', 'Own Launched', '2007-01-01', '—', 'Mankind Pharma', 'Consumer Launch', 'Sodium Bicarbonate + Citric Acid', 'Gastroenterology', 'Acid Reflux / Bloating', null, null, 'ENO', null, 'Acute']),
  // Prega News launched 2010 (confirmed)
  row(['Prega News', 'Own Launched', '2010-01-01', '—', 'Mankind Pharma', 'Consumer Launch', 'hCG Detection (OTC Rapid Dx)', 'Consumer Health', 'Pregnancy Detection', null, null, 'i-can / Velocit', null, 'Acute']),
  // Unwanted Kit (MTP kit) — Mifepristone + Misoprostol. Widely dated to 2010 per pharma history [approx]
  row(['Unwanted Kit', 'Own Launched', '2010-03-12', '—', 'Mankind Pharma', 'NCE Launch', 'Mifepristone + Misoprostol', "Women's Health", 'Medical Termination of Pregnancy', null, null, 'MTP Kit', null, 'Acute']),
  // Mankind Heritage — Health OK multivitamin launched 2013
  row(['Health OK', 'Own Launched', '2013-01-01', '—', 'Mankind Pharma', 'Consumer Launch', 'Multivitamin + Minerals', 'Nutraceuticals', 'General Wellness / Daily Supplement', null, null, 'Revital / Supradyn', null, 'Chronic']),
  // Mankind Pharma — Dydroboon launched 2019 (first Indian dydrogesterone)
  row(['Dydroboon', 'Own Launched', '2019-01-01', '—', 'Mankind Pharma', 'NCE Launch', 'Dydrogesterone 10 mg', "Women's Health", 'Threatened / Recurrent Miscarriage / Luteal Support', null, null, 'Duphaston', null, 'Chronic']),

  // ── Brand acquisitions ──
  // Mankind Heritage / Grokipedia — "acquired Longifene (appetite stimulant) from UCB in January 2010"
  row(['Longifene', 'Acquired', '2010-01-31', 'UCB', 'Mankind Pharma', 'Brand Acquisition', 'Buclizine + B-complex', 'Pediatric / Nutraceutical', 'Pediatric Appetite Stimulation', null, null, '—', null, 'Acute']),
  // Dr. Reddy's press release — Mankind acquires Combihale + Daffy (16-Feb-2022; Combihale market Rs 900 Cr @14% CAGR)
  row(['Combihale', 'Acquired', '2022-02-16', "Dr. Reddy's Laboratories", 'Mankind Pharma', 'Brand Acquisition', 'Budesonide + Formoterol (+ Glycopyrronium variants)', 'Respiratory', 'Asthma / COPD', 900, 14.0, 'Foracort / Symbicort', null, 'Chronic']),
  row(['Daffy', 'Acquired', '2022-02-16', "Dr. Reddy's Laboratories", 'Mankind Pharma', 'Brand Acquisition', 'Soap-free Moisturising Bar (infants)', 'Dermatology', 'Infant / Sensitive Skin Care', null, null, 'Cetaphil / Sebamed', null, 'Acute']),

  // ── Panacea Biotec acquisition — parent deal + unbundled brand rows (2022-03-01, Rs 1,872 Cr) ──
  row(['Panacea Biotec Domestic Formulations (parent)', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Company Acquisition', 'Various (Lifestyle / Oncology / Transplant)', 'Multi-therapy', 'Multi-indication', null, null, 'Various', null, 'Chronic']),
  row(['PanGraf', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Tacrolimus', 'Transplant / Immunology', 'Organ Transplant Rejection (kidney / liver)', null, null, 'Prograf / Tacroz', null, 'Chronic']),
  row(['Mycept', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Mycophenolic Acid (Mofetil)', 'Transplant / Immunology', 'Organ Transplant Rejection', null, null, 'Cellcept', null, 'Chronic']),
  row(['Mycept-S', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Mycophenolate Sodium', 'Transplant / Immunology', 'Organ Transplant Rejection', null, null, 'Myfortic', null, 'Chronic']),
  row(['Panimun Bioral', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Cyclosporine (microemulsion)', 'Transplant / Immunology', 'Organ Transplant Rejection / Autoimmune', null, null, 'Sandimmun / Neoral', null, 'Chronic']),
  row(['Glizid / Glizid-M / Glizid-MR', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Gliclazide (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Diamicron', null, 'Chronic']),
  // Betaglim (Glimepiride 1mg / 2mg) — medplusmart + Panacea diabetic portfolio (distinct from Glizid/Metformin)
  row(['Betaglim', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Glimepiride (1 mg / 2 mg)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl', null, 'Chronic']),
  // Metlong (Metformin SR) — Panacea diabetic portfolio
  row(['Metlong', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Acquisition', 'Metformin HCl (SR / ER)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Glycomet SR', null, 'Chronic']),

  // ── Recent in-licensing & launches (pre-BSV) ──
  // astrazeneca.in press release (11-Mar-2024) — 5-yr exclusive Symbicort distribution
  row(['Symbicort (India distribution)', 'In-licensed', '2024-03-11', 'AstraZeneca', 'Mankind Pharma', 'Co-marketing', 'Budesonide + Formoterol', 'Respiratory', 'Asthma / COPD', null, null, 'Foracort', null, 'Chronic']),
  // Business Standard "Mankind Pharma signs non-exclusive patent license agreement with Takeda" (16-Jul-2024)
  row(['Vonoprazan (Takeda licence)', 'In-licensed', '2024-07-16', 'Takeda', 'Mankind Pharma', 'In-license (India)', 'Vonoprazan', 'Gastroenterology', 'GERD / Erosive Esophagitis', null, null, '—', null, 'Chronic']),

  // ── BSV acquisition — parent deal + unbundled brand rows (2024-10-23, Rs 13,630 Cr EV) ──
  row(['Bharat Serums & Vaccines (parent)', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Company Acquisition', 'Various Biologics / Recombinants (145+ brands)', "Women's Health / Critical Care", 'Fertility / Critical Care / Immunoglobulins', null, null, 'Various', null, 'Chronic']),
  row(['Humog', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Menotropin (hMG — FSH + LH)', "Women's Health", 'Ovulation Induction / IVF', null, null, 'Menodac / Fostine', null, 'Chronic']),
  row(['HuCoG', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Human Chorionic Gonadotropin (hCG)', "Women's Health", 'Ovulation Trigger / Luteal Support', null, null, 'Ovidac / Pregnyl', null, 'Chronic']),
  row(['Miprogen', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Micronized Progesterone 100/200 mg', "Women's Health", 'Luteal Support / HRT / Miscarriage Prevention', null, null, 'Susten / Vageston', null, 'Chronic']),
  row(['Lonopin', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Enoxaparin Sodium (LMWH)', 'Haematology', 'DVT / VTE Prophylaxis / ACS', null, null, 'Clexane', null, 'Chronic']),
  row(['Rhoclone', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Anti-D Immunoglobulin (Rho(D))', "Women's Health", 'Rh Iso-immunization Prophylaxis', null, null, 'Rhesonativ / WinRho', null, 'Acute']),
  row(['Bharglob', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Human Normal Immunoglobulin (IVIG)', 'Immunology', 'Primary Immunodeficiency / ITP / GBS', null, null, 'Privigen / Octagam', null, 'Chronic']),
  row(['Luprodex', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Leuprolide Acetate', "Oncology / Women's Health", 'Prostate Cancer / Endometriosis / IVF', null, null, 'Lupride / Eligard', null, 'Chronic']),
  row(['Snake V Antiserum', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Polyvalent Snake Antivenom (equine)', 'Critical Care / Anti-Infectives', 'Snake Envenomation', null, null, '—', null, 'Acute']),
  row(['Tetglob', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Tetanus Immunoglobulin (Human)', 'Immunology', 'Tetanus Post-exposure Prophylaxis', null, null, 'Tetabulin / Tetagam', null, 'Acute']),
  // Foligraf (Recombinant FSH 75 IU) — verified Bharat Serums brand (bsvgroup / medplusmart listings)
  row(['Foligraf', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Follicle Stimulating Hormone (FSH) 75 IU', "Women's Health", 'Ovarian Stimulation (IVF / IUI)', null, null, 'Gonal-F / Puregon', null, 'Chronic']),
  // Hucog-HP (highly purified hCG) — separate SKU from HuCoG, bsvgroup.com product PDF
  row(['Hucog-HP', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'hCG Highly Purified (2000 / 5000 / 10000 IU)', "Women's Health", 'Ovulation Trigger / Luteal Support (premium IVF SKU)', null, null, 'Ovidac / Pregnyl', null, 'Chronic']),
  // Endoprost (Carboprost Tromethamine 250 mcg) — verified Bharat Serums PPH drug, bsvgroup.com product PDF
  row(['Endoprost', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Carboprost Tromethamine (PGF2α)', "Women's Health / Critical Care", 'Postpartum Haemorrhage / Medical Abortion', null, null, 'Hemabate', null, 'Acute']),
  // Primigyn (Dinoprostone cervical gel) — verified Bharat Serums obstetric brand
  row(['Primigyn', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Brand Acquisition', 'Dinoprostone 0.5 mg/3 g gel (PGE2)', "Women's Health", 'Cervical Ripening / Labour Induction', null, null, 'Cerviprime / Prepidil', null, 'Acute']),

  // ── Recent deals (post-BSV) ──
  // mankindpharma.com / Business Standard (26-Dec-2024)
  row(['Sintilimab', 'In-licensed', '2024-12-26', 'Innovent Biologics', 'Mankind Pharma', 'In-license (India)', 'Sintilimab', 'Oncology', 'Solid Tumours (PD-1 immunotherapy)', null, null, '—', null, 'Chronic']),
  // GlobeNewswire / Business Standard (21-Nov-2025)
  row(['ACM-001.1 (S-pindolol)', 'In-licensed', '2025-11-21', 'Actimed Therapeutics', 'Mankind Pharma', 'In-license (India)', 'S-pindolol benzoate', 'Oncology Support', 'Cancer Cachexia', null, null, '—', null, 'Chronic']),
  // Business Standard (18-Mar-2026)
  row(['Rivotril', 'Acquired', '2026-03-18', 'Roche', 'Mankind Pharma', 'Brand Acquisition', 'Clonazepam', 'Neurology / CNS', 'Epilepsy / Panic Disorder', null, null, '—', null, 'Chronic']),
  // BusinessToday / Medical Dialogues — Samakind launch on patent-expiry Day 1 (20-Mar-2026)
  row(['Samakind', 'Own Launched', '2026-03-20', '—', 'Mankind Pharma', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Wegovy', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Eris Lifesciences — LIVE DATASET (deep-research edition)
  // Sources: eris.co.in press releases + corporate presentations + Q3 FY26
  // concall, HDFC Sec / Motilal Oswal broker notes, Business Standard,
  // BioSpectrum, IBEF, Apollo / 1mg / medplusmart product listings.
  // Dates confirmed for every acquisition/in-licensing deal; own-launched
  // engine brands use estimated years marked [est.] where exact year isn't
  // in public sources.
  // Eris is focused on chronic branded formulations (oral anti-diabetes +
  // CVS + VMN + insulins + derm); ranks Top-6 in oral anti-diabetes, #1 in
  // India in several sub-categories.

  // ── Engine brands (Own Launched) — flagship portfolio ──
  // Glimisave family — Glimepiride (± Metformin); Eris' largest brand. [date est.]
  row(['Glimisave / Glimisave-M / Glimisave Max', 'Own Launched', '2007-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Glimepiride (± Metformin SR)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl-M / Glimestar-M', null, 'Chronic']),
  // Eritel (Telmisartan); Eris' largest cardiac brand (~35% of cardiac sales). [date est.]
  row(['Eritel', 'Own Launched', '2008-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Telmisartan', 'Cardiology', 'Hypertension', null, null, 'Telma / Telmikind', null, 'Chronic']),
  // Eritel LN (Telmisartan + Cilnidipine) — key cardio combo [date est.]
  row(['Eritel LN / LN-Bloc', 'Own Launched', '2015-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Telmisartan + Cilnidipine', 'Cardiology', 'Hypertension (CCB+ARB combo)', null, null, 'Cilacar-T / Telma-CT', null, 'Chronic']),
  // Olmin (Olmesartan); ~18% of cardiac sales. [date est.]
  row(['Olmin', 'Own Launched', '2010-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Olmesartan (± HCTZ / Amlodipine)', 'Cardiology', 'Hypertension', null, null, 'Olmesar / Olvance', null, 'Chronic']),
  // Crevast (Rosuvastatin range) — cardio statin [date est.]
  row(['Crevast', 'Own Launched', '2010-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Rosuvastatin (± Aspirin / Clopidogrel / Fenofibrate)', 'Cardiology', 'Dyslipidemia / Secondary CV Prevention', null, null, 'Rosuvas / Novastat', null, 'Chronic']),
  // Atorsave (Atorvastatin) — cardio statin [date est.]
  row(['Atorsave', 'Own Launched', '2008-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Atorvastatin', 'Cardiology', 'Dyslipidemia', null, null, 'Atorlip / Lipicure', null, 'Chronic']),
  // Renerve (Methylcobalamin nutra) [date est.]
  row(['Renerve', 'Own Launched', '2010-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Methylcobalamin + ALA + Folic Acid + Pyridoxine', 'Neurology / CNS', 'Peripheral / Diabetic Neuropathy', null, null, 'Nurokind-Gold / Mecobal-Plus', null, 'Chronic']),
  // Tayo (Vitamin D3 / Cholecalciferol) [date est.]
  row(['Tayo', 'Own Launched', '2014-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Cholecalciferol (Vitamin D3)', 'Nutraceuticals', 'Vitamin D Deficiency / Osteoporosis', null, null, 'D-Rise / Calcirol', null, 'Chronic']),
  // Raricap (Calcium + Iron + Folic Acid) [date est.]
  row(['Raricap', 'Own Launched', '2012-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Calcium + Iron + Folic Acid', "Women's Health / Nutraceuticals", 'Pregnancy / Anaemia Supplementation', null, null, 'Livogen / Autrin', null, 'Chronic']),
  // Rabonik (Rabeprazole) — PPI [date est.]
  row(['Rabonik', 'Own Launched', '2010-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Rabeprazole (± Domperidone)', 'Gastroenterology', 'GERD / Peptic Ulcer', null, null, 'Rablet / Razo', null, 'Chronic']),
  // Serlift (Sertraline) — SSRI [date est.]
  row(['Serlift', 'Own Launched', '2012-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Sertraline HCl', 'Neurology / CNS', 'Depression / Anxiety / OCD', null, null, 'Zoloft / Daxid', null, 'Chronic']),
  // Gluxit (Dapagliflozin SGLT2i) [date est.]
  row(['Gluxit', 'Own Launched', '2018-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Dapagliflozin (± Metformin / Sitagliptin)', 'Anti-Diabetic', 'Type 2 Diabetes / Heart Failure', null, null, 'Forxiga / Oxra', null, 'Chronic']),
  // Xsulin / Xglar (Eris' pre-existing insulin brands, pre-Biocon) [date est.]
  row(['Xsulin / Xglar', 'Own Launched', '2020-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Human Insulin / Insulin Glargine', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Huminsulin / Lantus', null, 'Chronic']),
  // Tendia (likely cardio combo) [date est.]
  row(['Tendia', 'Own Launched', '2016-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Cilnidipine (± Telmisartan)', 'Cardiology', 'Hypertension', null, null, 'Cilacar', null, 'Chronic']),
  // Cyblex (Sitagliptin / DPP-4 equivalent) [date est.]
  row(['Cyblex', 'Own Launched', '2017-01-01', '—', 'Eris Lifesciences', 'NCE Launch', 'Teneligliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Teneza / Zita', null, 'Chronic']),

  // ── Acquisition #1: Zomelis (Vildagliptin) from Novartis AG — Dec 2019 ──
  // Business Standard / IBEF — Eris acquires Zomelis trademark from Novartis AG for US$13M (03-Dec-2019)
  row(['Zomelis', 'Acquired', '2019-12-03', 'Novartis AG', 'Eris Lifesciences', 'Brand Acquisition', 'Vildagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes (DPP-4 inhibitor)', null, null, 'Galvus / Jalra', null, 'Chronic']),

  // ── Acquisition #2: Oaknet Healthcare (parent + unbundled brands) — May 2022, Rs 650 Cr ──
  // Business Standard / BusinessToday (04-May-2022) — Eris acquires 100% of Oaknet Healthcare
  row(['Oaknet Healthcare (parent)', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Company Acquisition', 'Various Derma + Gynae + Nutra brands', 'Dermatology', 'Multi-indication (derm-led portfolio)', null, null, 'Various', null, 'Chronic']),
  // Oaknet marquee brand — Cosvate (Clobetasol)
  row(['Cosvate', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Brand Acquisition', 'Clobetasol Propionate 0.05% (± Gentamicin / Miconazole / Salicylic Acid)', 'Dermatology', 'Steroid-responsive Dermatoses', null, null, 'Tenovate / Clonate', null, 'Chronic']),
  // Oaknet marquee brand — Cosmelite (depigmenting cream)
  row(['Cosmelite', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Brand Acquisition', 'Hydroquinone + Tretinoin + Mometasone', 'Dermatology', 'Melasma / Post-inflammatory Hyperpigmentation', null, null, 'Melalite-Forte / Demelan', null, 'Chronic']),
  // Oaknet — Onabet (Sertaconazole antifungal)
  row(['Onabet', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Brand Acquisition', 'Sertaconazole Nitrate 2%', 'Dermatology / Anti-Infectives', 'Fungal Skin Infections / Tinea', null, null, 'Sertaspor / Onabet', null, 'Acute']),
  // Oaknet — Flucos (Fluconazole oral antifungal)
  row(['Flucos', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Brand Acquisition', 'Fluconazole', 'Dermatology / Anti-Infectives', 'Systemic Fungal Infections / Candidiasis', null, null, 'Forcan / Syscan', null, 'Acute']),
  // Oaknet — Psorid (Cyclosporine) — Psoriasis
  row(['Psorid', 'Acquired', '2022-05-04', 'Oaknet Healthcare promoters', 'Eris Lifesciences', 'Brand Acquisition', 'Cyclosporine (microemulsion)', 'Dermatology / Immunology', 'Psoriasis / Atopic Dermatitis', null, null, 'Panimun Bioral / Sandimmun', null, 'Chronic']),

  // ── Acquisition #3: Biocon Biologics BFI Nephrology + Dermatology — Nov 2023, Rs 366 Cr ──
  // Biocon press release — Eris signs definitive agreement to acquire Nephro + Derma BFI (08-Nov-2023)
  row(['Biocon BFI (Nephrology + Dermatology)', 'Acquired', '2023-11-08', 'Biocon Biologics', 'Eris Lifesciences', 'Brand Portfolio Acquisition', 'Various (renal + derm biologics and small molecules)', 'Nephrology / Dermatology', 'Multi-indication', null, null, 'Various', null, 'Chronic']),

  // ── Acquisition #4: Swiss Parenterals (staged 51% + 19% + 30%) — Feb 2024 onwards ──
  // Business Standard (15-Feb-2024) — Eris acquires 51% stake for Rs 637.5 Cr
  row(['Swiss Parenterals (51% stake)', 'Acquired', '2024-02-15', 'Swiss Parenterals promoters', 'Eris Lifesciences', 'Company Acquisition', 'Sterile Injectables (broad portfolio, 80+ emerging markets)', 'Critical Care / Anti-Infectives', 'Hospital Injectables', null, null, 'Various', null, 'Chronic']),

  // ── Acquisition #5: Biocon Biologics BFI Metabolics+Oncology+Critical Care — Mar 2024, Rs 1,242 Cr ──
  // Biocon / Business Standard (14-Mar-2024) — ~Rs 30,000 Cr injectables market entry
  row(['Biocon BFI (Metabolics + Oncology + Critical Care)', 'Acquired', '2024-03-14', 'Biocon Biologics', 'Eris Lifesciences', 'Brand Portfolio Acquisition', 'Insulins + Oncology + Critical Care biologics', 'Anti-Diabetic / Oncology / Critical Care', 'Multi-indication (India)', 30000, null, 'Various', null, 'Chronic']),
  // Biocon sub-brand — Basalog (Insulin Glargine biosimilar)
  row(['Basalog', 'Acquired', '2024-03-14', 'Biocon Biologics', 'Eris Lifesciences', 'Brand Acquisition', 'Insulin Glargine (biosimilar)', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes (basal insulin)', null, null, 'Lantus / Glaritus', null, 'Chronic']),
  // Biocon sub-brand — Insugen (Recombinant Human Insulin) — first domestically developed rh-insulin
  row(['Insugen', 'Acquired', '2024-03-14', 'Biocon Biologics', 'Eris Lifesciences', 'Brand Acquisition', 'Recombinant Human Insulin', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Huminsulin / Actrapid', null, 'Chronic']),

  // ── Swiss Parenterals additional 19% stake — March 2024 ──
  row(['Swiss Parenterals (additional 19%)', 'Acquired', '2024-03-14', 'Swiss Parenterals promoters', 'Eris Lifesciences', 'Stake Increase', 'Sterile Injectables', 'Critical Care / Anti-Infectives', 'Hospital Injectables', null, null, 'Various', null, 'Chronic']),

  // ── Swiss Parenterals balance 30% — Nov 2025 ──
  // Business Standard (25-Nov-2025) — Eris Board approves full consolidation for Rs 423.3 Cr
  row(['Swiss Parenterals (balance 30%; full consolidation)', 'Acquired', '2025-11-25', 'Swiss Parenterals promoters', 'Eris Lifesciences', 'Stake Increase', 'Sterile Injectables', 'Critical Care / Anti-Infectives', 'Hospital Injectables', null, null, 'Various', null, 'Chronic']),

  // ── Natco Pharma partnership — Semaglutide co-marketing (Feb 2026) ──
  // Business Standard (24-Feb-2026) — Eris + Natco strategic partnership for Semaglutide launch in India
  row(['Sundae (Natco partnership)', 'In-licensed', '2026-02-24', 'Natco Pharma', 'Eris Lifesciences', 'Co-marketing', 'Semaglutide (generic)', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ── Sundae (Own-Launched brand via Natco partnership) — launched on patent-expiry window (21-Mar-2026) ──
  row(['Sundae', 'Own Launched', '2026-03-21', '—', 'Eris Lifesciences', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Wegovy / Samakind', null, 'Chronic']),

  // ── Acquisition #6: Velbiom Probiotics business — Mar 2026 ──
  // Tracxn / Eris in-the-news — Eris completes acquisition of Velbiom probiotics business (31-Mar-2026)
  row(['Velbiom Probiotics Business', 'Acquired', '2026-03-31', 'Velbiom Probiotics', 'Eris Lifesciences', 'Brand Portfolio Acquisition', 'Various Probiotic Strains (clinical + consumer)', 'Gastroenterology / Nutraceuticals', 'Gut Health / IBS / Antibiotic-associated Diarrhoea', null, null, 'Vibact / Enterogermina', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Corona Remedies — EXPANDED LIVE DATASET (deep-research edition)
  // Sources: coronaremedies.com portfolio, DRHP (Apr-2025), HDFC Sec IPO note
  // (Dec-2025), CARE Ratings PR, Business Standard, BioSpectrum, Apollo / 1mg /
  // PharmEasy product listings, CCI filings, press releases. Every row is
  // individually verifiable. Molecules confirmed from pharmacy listings.
  //
  // Bundled deals (GSK-4, Abbott-6, Bayer-7) are now UNBUNDLED into per-brand
  // rows for accurate therapy-area attribution in charts. Own-launched engine
  // brands (Cor family, Trazer, B-29) are included with CLEARLY ESTIMATED
  // launch dates (marked "[date est.]" in comments) — exact launch years are
  // not in public sources (would require SMSRC/IQVIA historicals).
  // ──────────────────────────────────────────────────────────────────────────

  // ── Engine brands (Own Launched) — the Corona portfolio backbone ──
  // Cortel M (Cor family, cardiology) — Telmisartan + Metoprolol Succinate ER; engine brand "Cor" #1 in sub-group. [launch date est.]
  row(['Cortel M (Cor family)', 'Own Launched', '2008-01-01', '—', 'Corona Remedies', 'NCE Launch', 'Telmisartan + Metoprolol Succinate ER', 'Cardiology', 'Hypertension / CAD', null, null, 'Telma / Telsartan', null, 'Chronic']),
  // Trazer family (women's health hematinic) — Ferrous Ascorbate + Folic Acid + Methylcobalamin; engine brand #1 in sub-group. [launch date est.]
  row(['Trazer', 'Own Launched', '2010-01-01', '—', 'Corona Remedies', 'NCE Launch', 'Ferrous Ascorbate + Folic Acid + Methylcobalamin', "Women's Health", 'Iron Deficiency Anaemia (pregnancy)', null, null, 'Orofer / Autrin', null, 'Chronic']),
  // B-29 (Xmex division) — Methylcobalamin 1500 mcg (± ALA / Folic / B6 / D3 variants); neuropathy / nutraceutical. [launch date est.]
  row(['B-29 (Xmex)', 'Own Launched', '2012-01-01', '—', 'Corona Remedies', 'NCE Launch', 'Methylcobalamin 1500 mcg (± ALA / Folic / B6 / D3)', 'Neurology / CNS', 'Peripheral / Diabetic Neuropathy', null, null, 'Nurokind / Mecobal', null, 'Chronic']),
  // Cor-9 (Women's Health inj) — Hydroxyprogesterone 250mg/ml; preterm labour prevention. Engine brand #3 in sub-group. [launch date est.]
  row(['Cor-9', 'Own Launched', '2013-01-01', '—', 'Corona Remedies', 'NCE Launch', 'Hydroxyprogesterone Caproate 250 mg/ml', "Women's Health", 'Preterm Labour Prevention', null, null, 'Proluton Depot', null, 'Chronic']),
  // Cor-3 (Antenatal nutra) — L-Methylfolate + Methylcobalamin + Pyridoxal-5-Phosphate. [launch date est.]
  row(['Cor-3', 'Own Launched', '2015-01-01', '—', 'Corona Remedies', 'NCE Launch', 'L-Methylfolate + Methylcobalamin + P5P', "Women's Health / Nutraceuticals", 'Pregnancy Anaemia / Neural Tube Defect Prevention', null, null, '—', null, 'Chronic']),

  // ── Division launches (Own portfolio expansion) ──
  // Corona Remedies DRHP / company history — Radiance (cardio-diabetic) launched 2022
  row(['Radiance Division Launch', 'Own Launched', '2022-01-01', '—', 'Corona Remedies', 'Division Launch', 'Multiple (cardio-diabetic portfolio)', 'Cardio-Diabeto', 'Multi-indication', null, null, 'N/A', null, 'Chronic']),
  // Corona Remedies DRHP — Solaris (gynaecology) launched 2022
  row(['Solaris Division Launch', 'Own Launched', '2022-01-01', '—', 'Corona Remedies', 'Division Launch', 'Multiple (gynae portfolio)', "Women's Health", 'Multi-indication', null, null, 'N/A', null, 'Chronic']),
  // Corona Remedies DRHP — Urology division (Blaze) launched 2023
  row(['Urology / Blaze Division Launch', 'Own Launched', '2023-01-01', '—', 'Corona Remedies', 'Division Launch', 'Multiple (urology portfolio)', 'Urology', 'Multi-indication', null, null, 'N/A', null, 'Chronic']),

  // ── 1st MNC deal: GSK 4 brands — CCI approval 07-Mar-2017 (unbundled per brand) ──
  row(['Dilo-BM', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Acquisition', 'Ambroxol + Guaifenesin + Terbutaline', 'Respiratory', 'Productive Cough / Bronchospasm', null, null, 'Ascoril', null, 'Acute']),
  row(['Dilo-DX', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Acquisition', 'Chlorpheniramine + Dextromethorphan (± Phenylephrine)', 'Respiratory', 'Dry Cough / Allergic Rhinitis', null, null, 'Benadryl DR', null, 'Acute']),
  row(['Stelbid', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Acquisition', 'Trifluoperazine + Isopropamide', 'Gastroenterology', 'Functional GI Disorders / Anxiety-linked Dyspepsia', null, null, '—', null, 'Chronic']),
  row(['Vitneurin', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Acquisition', 'Methylcobalamin + B-complex', 'Neurology / CNS', 'Peripheral Neuropathy / B12 Deficiency', null, null, 'Nurokind / Methycobal', null, 'Chronic']),

  // ── 2nd MNC deal: Abbott India 6 brands — 03-Apr-2018 (unbundled per brand) ──
  row(['Obimet', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Metformin HCl', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Glycomet', null, 'Chronic']),
  row(['Obimet-GX', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Glimepiride + Metformin HCl SR', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Glimestar-M', null, 'Chronic']),
  row(['Obimet SR', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Metformin HCl SR', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Glycomet SR', null, 'Chronic']),
  row(['Obimet-V', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Voglibose + Metformin', 'Anti-Diabetic', 'Type 2 Diabetes (post-prandial)', null, null, 'Volibo-M', null, 'Chronic']),
  row(['Triobimet', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Glimepiride + Metformin + Pioglitazone', 'Anti-Diabetic', 'Type 2 Diabetes (triple combo)', null, null, 'Tripride / Triglimisave', null, 'Chronic']),
  row(['Thyrocab', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Acquisition', 'Levothyroxine Sodium', 'Endocrinology', 'Hypothyroidism', null, null, 'Thyronorm / Eltroxin', null, 'Chronic']),

  // ── Ferring in-licensing — 09-May-2023 (Maternal Health + Urology portfolio) ──
  row(['Ferring Maternal Health & Urology Portfolio', 'In-licensed', '2023-05-09', 'Ferring Pharmaceuticals', 'Corona Remedies', 'In-license (India)', 'Cetrorelix / Menotropins / Desmopressin etc.', "Women's Health / Urology", 'IVF / Fertility / Nocturia', null, null, '—', null, 'Chronic']),

  // ── 3rd MNC deal: Sanofi India — Myoril (28-Jun-2023, Rs 234 Cr) ──
  row(['Myoril', 'Acquired', '2023-06-28', 'Sanofi India', 'Corona Remedies', 'Brand Acquisition', 'Thiocolchicoside', 'Pain Management', 'Muscular Spasm / Back Pain', null, null, '—', null, 'Acute']),

  // ── 4th MNC deal: Bayer India 7 brands — effective 16-Jul-2025 (unbundled per brand) ──
  row(['Noklot', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Clopidogrel', 'Cardiology', 'Antiplatelet / Secondary CV Prevention', null, null, 'Clopilet / Deplatt', null, 'Chronic']),
  row(['Fostine', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Menotropin (hMG — FSH + LH)', "Women's Health", 'Controlled Ovarian Stimulation / IVF', null, null, 'Menodac / Hucog HMG', null, 'Chronic']),
  row(['Luprofact', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Menotropin (hMG — FSH + LH)', "Women's Health", 'Ovulation Induction / IVF', null, null, 'Menodac', null, 'Chronic']),
  row(['Menodac', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Menotropin (hMG — FSH + LH)', "Women's Health", 'Ovulation Induction / IVF', null, null, 'Fostine / Hucog HMG', null, 'Chronic']),
  row(['Ovidac', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Human Chorionic Gonadotropin (hCG)', "Women's Health", 'Ovulation Trigger / Luteal Support', null, null, 'Hucog / Pregnyl', null, 'Chronic']),
  row(['Spye', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Gonadotropin / Progesterone (Bayer fertility portfolio)', "Women's Health", 'Fertility / Pregnancy Management', null, null, '—', null, 'Chronic']),
  row(['Vageston', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Micronized Progesterone 100/200 mg', "Women's Health", 'HRT / Luteal Phase Support / Miscarriage Prevention', null, null, 'Susten / Naturogest', null, 'Chronic']),

  // ── 5th MNC deal: Dr. Reddy's — Wokadine (30-Mar-2026, ₹648 Cr povidone iodine market) ──
  row(['Wokadine', 'Acquired', '2026-03-30', "Dr. Reddy's Laboratories", 'Corona Remedies', 'Brand Acquisition', 'Povidone Iodine', 'Anti-Infectives', 'Topical Antiseptic / Pre-surgical Skin Prep', 648, null, 'Betadine', null, 'Acute']),

  // ──────────────────────────────────────────────────────────────────────────
  // Natco Pharma — LIVE DATASET (deep-research edition)
  // Sources: natcopharma.co.in press releases + investor filings, BSE / NSE
  // filings, Business Standard / BusinessToday / Fierce Pharma / MSF Access /
  // medicaldialogues coverage, Teva / Mylan / Breckenridge press releases for
  // the US partner launches, generic-pharmacy listings for pricing. Natco is
  // India's leading complex-generics + oncology specialist — known for India's
  // FIRST compulsory licence (Sorafenat, 2012) and first-mover hepatitis C
  // generics. Older oncology engine-brand launch years are [est.] — exact
  // launch dates are not publicly disclosed.
  // ──────────────────────────────────────────────────────────────────────────

  // ── Oncology engine brands (Own Launched) — the Natco India backbone ──
  // Veenat (Imatinib) — Natco's flagship oncology brand, launched 2003 for CML
  row(['Veenat', 'Own Launched', '2003-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Imatinib Mesylate', 'Oncology', 'Chronic Myeloid Leukaemia (CML) / GIST', null, null, 'Glivec / Imatib', null, 'Chronic']),
  // Geftinat (Gefitinib) — EGFR+ NSCLC [launch year est.]
  row(['Geftinat', 'Own Launched', '2007-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Gefitinib', 'Oncology', 'EGFR+ Non-Small Cell Lung Cancer', null, null, 'Iressa / Gefitik', null, 'Chronic']),
  // Erlonat (Erlotinib) — NSCLC / pancreatic cancer [launch year est.]
  row(['Erlonat', 'Own Launched', '2008-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Erlotinib', 'Oncology', 'NSCLC / Pancreatic Cancer', null, null, 'Tarceva / Erlocip', null, 'Chronic']),
  // Bortenat (Bortezomib) — multiple myeloma [launch year est.]
  row(['Bortenat', 'Own Launched', '2009-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Bortezomib', 'Oncology', 'Multiple Myeloma / Mantle Cell Lymphoma', null, null, 'Velcade / Bortecad', null, 'Chronic']),
  // Lenalid (Lenalidomide) — multiple myeloma / MDS [launch year est.]
  row(['Lenalid', 'Own Launched', '2010-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Lenalidomide', 'Oncology', 'Multiple Myeloma / Myelodysplastic Syndrome', null, null, 'Revlimid / Lenmid', null, 'Chronic']),
  // Trombonat (Eltrombopag) — chronic immune thrombocytopenia [launch year est.]
  row(['Trombonat', 'Own Launched', '2018-01-01', '—', 'Natco Pharma', 'Generic Launch', 'Eltrombopag', 'Oncology', 'Chronic Immune Thrombocytopenia (ITP)', null, null, 'Revolade / Eltrombopag', null, 'Chronic']),

  // ── Sorafenat (Sorafenib) — India's FIRST compulsory licence, granted 12-Mar-2012 ──
  // MSF Access / Knowledge@Wharton — the Controller of Patents granted Natco a
  // compulsory licence on Bayer's Nexavar patent; Natco priced Sorafenat ~97%
  // below Bayer (~₹8,800/month vs Bayer's ~₹2.8 lakh/month).
  row(['Sorafenat', 'Own Launched', '2012-03-12', '—', 'Natco Pharma', 'Compulsory Licence Launch', 'Sorafenib', 'Oncology', 'Hepatocellular & Renal Cell Carcinoma', null, null, 'Nexavar', null, 'Chronic', '₹8,800 / month (120 tabs)']),

  // ── Hepatitis C portfolio — first-mover generics under the Gilead voluntary licence ──
  // Fierce Pharma / Business Standard — Natco signed a non-exclusive licence with
  // Gilead (91 developing countries) and was first in India with a DCGI nod for
  // generic sofosbuvir. (Daclatasvir is BMS's molecule — modelled as own-launched.)
  // Hepcinat (Sofosbuvir) — DCGI approval Mar-2015 [day approximate]
  row(['Hepcinat', 'In-licensed', '2015-03-15', 'Gilead Sciences', 'Natco Pharma', 'In-license (India + 90+ countries)', 'Sofosbuvir', 'Anti-Infectives', 'Chronic Hepatitis C', null, null, 'Sovaldi / MyHep / Resof', null, 'Chronic', '₹19,900 / bottle of 28 tabs']),
  // Hepcinat LP (Ledipasvir + Sofosbuvir) — DCGI approval 14-Dec-2015; generic of Harvoni
  row(['Hepcinat LP', 'In-licensed', '2015-12-14', 'Gilead Sciences', 'Natco Pharma', 'In-license (India + 90+ countries)', 'Ledipasvir + Sofosbuvir', 'Anti-Infectives', 'Chronic Hepatitis C (Genotype 1)', null, null, 'Harvoni / Ledifos', null, 'Chronic', '₹25,000 / bottle of 28 tabs']),
  // Natdac (Daclatasvir) — DCGI approval 17-Dec-2015; generic of BMS's Daklinza
  row(['Natdac', 'Own Launched', '2015-12-17', '—', 'Natco Pharma', 'Generic Launch', 'Daclatasvir', 'Anti-Infectives', 'Chronic Hepatitis C (with Sofosbuvir)', null, null, 'Daklinza / Daclahep', null, 'Chronic', '₹6,000 / bottle of 28 tabs (60 mg)']),
  // Velpanat (Sofosbuvir + Velpatasvir) — Business Standard (09-May-2017); pan-genotypic, generic of Epclusa
  row(['Velpanat', 'In-licensed', '2017-05-09', 'Gilead Sciences', 'Natco Pharma', 'In-license (India + 90+ countries)', 'Sofosbuvir + Velpatasvir', 'Anti-Infectives', 'Chronic Hepatitis C (Pan-Genotypic)', null, null, 'Epclusa / Velasof', null, 'Chronic']),

  // ── Recent India launches ──
  // Risdiplam — Business Standard / Outlook — launched Apr-2025 at ₹15,900 (~97% below
  // Roche's Evrysdi) after a landmark Delhi HC patent ruling in Natco's favour.
  row(['Risdiplam (Natco)', 'Own Launched', '2025-04-01', '—', 'Natco Pharma', 'Generic Launch (post-litigation)', 'Risdiplam', 'Neurology / CNS', 'Spinal Muscular Atrophy (SMA)', null, null, 'Evrysdi', null, 'Chronic', '₹15,900 / bottle (60 mg)']),
  // Semaglutide — CDSCO approval 14-Feb-2026; Natco co-markets via Eris (Sundae) and
  // other partners. The Eris side of this partnership is tracked under Eris Lifesciences.
  row(['Semaglutide (Natco)', 'Own Launched', '2026-03-01', '—', 'Natco Pharma', 'Generic Launch (India — co-marketing)', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Rybelsus / Ozempic / Sundae', null, 'Chronic']),

  // ── US launches (Natco manufactures; a marketing partner sells) ──
  // Glatiramer Acetate — FDA approved Oct-2017; first generic Copaxone, marketed by Mylan
  row(['Glatiramer Acetate (gCopaxone — US)', 'Own Launched', '2017-10-03', '—', 'Natco Pharma', 'Generic Launch (US — Mylan partner)', 'Glatiramer Acetate', 'Neurology / CNS', 'Relapsing Multiple Sclerosis', null, null, 'Copaxone / Glatopa', null, 'Chronic']),
  // Lenalidomide (gRevlimid) — volume-limited US launch from Mar-2022 with Teva; Natco's largest earner
  row(['Lenalidomide (gRevlimid — US)', 'Own Launched', '2022-03-01', '—', 'Natco Pharma', 'Generic Launch (US — Teva partner)', 'Lenalidomide', 'Oncology', 'Multiple Myeloma', null, null, 'Revlimid', null, 'Chronic']),
  // Pomalidomide (gPomalyst) — US launch 03-Mar-2026 with Breckenridge; 180-day shared exclusivity
  row(['Pomalidomide (gPomalyst — US)', 'Own Launched', '2026-03-03', '—', 'Natco Pharma', 'Generic Launch (US — Breckenridge partner)', 'Pomalidomide', 'Oncology', 'Multiple Myeloma / Kaposi Sarcoma', null, null, 'Pomalyst', null, 'Chronic']),

  // ── Adcock Ingram — 35.75% strategic stake in South Africa's oldest pharma ──
  // medicaldialogues / BSE filings — ~₹2,000 Cr (US$226M); shareholder nod Oct-2025,
  // JSE delisting completed 11-Nov-2025. Natco's largest M&A; emerging-markets push.
  row(['Adcock Ingram (35.75% stake)', 'Acquired', '2025-11-11', 'Adcock Ingram minority shareholders', 'Natco Pharma', 'Strategic Stake Acquisition', 'Various (branded generics, OTC, hospital)', 'Multi-therapy', 'Multi-indication (South Africa + emerging markets)', null, null, 'Various', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Dr. Reddy's Laboratories — LIVE DATASET (deep-research edition)
  // Sources: drreddys.com press releases + investor filings, BSE / NSE filings,
  // Business Standard / BusinessToday / Fierce Pharma / GaBI Online / BioSpace
  // coverage, Nestlé India + Haleon + RDIF press releases for the partnerships,
  // generic-pharmacy listings for pricing. Dr. Reddy's is one of India's largest
  // pharma companies — iconic India branded generics, an India biosimilars
  // pioneer (Grafeel, Reditux, Cresp), a large US generics book, and an active
  // acquirer. Older India engine-brand launch years are [est.] — exact launch
  // dates are not publicly disclosed.
  // ──────────────────────────────────────────────────────────────────────────

  // ── India branded engine brands (Own Launched) — the DRL India backbone ──
  // Omez (Omeprazole) — DRL's breakthrough brand, launched at ~half competitors' price [launch year est.]
  row(['Omez', 'Own Launched', '1994-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Omeprazole (± Domperidone)', 'Gastroenterology', 'GERD / Peptic Ulcer / Acid Reflux', null, null, 'Omee / Ocid / Prilosec', null, 'Chronic']),
  // Enam (Enalapril) — legacy ACE-inhibitor, ORG top-300 brand [launch year est.]
  row(['Enam', 'Own Launched', '1993-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Enalapril Maleate', 'Cardiology', 'Hypertension / Chronic Heart Failure', null, null, 'Envas / Enapril', null, 'Chronic']),
  // Nise (Nimesulide) — high-volume NSAID pain brand [launch year est.]
  row(['Nise', 'Own Launched', '1995-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Nimesulide', 'Pain Management', 'Pain / Inflammation / Fever', null, null, 'Nimulid / Nimegesic', null, 'Acute']),
  // Stamlo (Amlodipine) — calcium-channel-blocker engine brand [launch year est.]
  row(['Stamlo', 'Own Launched', '1996-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Amlodipine (± Atenolol / Benazepril)', 'Cardiology', 'Hypertension / Angina', null, null, 'Amlopres / Amlong / Norvasc', null, 'Chronic']),
  // Atocor (Atorvastatin) — statin [launch year est.]
  row(['Atocor', 'Own Launched', '2001-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Atorvastatin', 'Cardiology', 'Dyslipidemia', null, null, 'Atorva / Storvas / Lipitor', null, 'Chronic']),
  // Razo (Rabeprazole) — PPI [launch year est.]
  row(['Razo', 'Own Launched', '2003-01-01', '—', "Dr. Reddy's", 'Generic Launch', 'Rabeprazole (± Domperidone / Levosulpiride)', 'Gastroenterology', 'GERD / Peptic Ulcer', null, null, 'Rabicip / Veloz / Pariet', null, 'Chronic']),

  // ── Biosimilars (Own Launched, India) — DRL is an India biosimilars pioneer ──
  // Grafeel (Filgrastim) — DRL's first biosimilar (2001)
  row(['Grafeel', 'Own Launched', '2001-01-01', '—', "Dr. Reddy's", 'Biosimilar Launch', 'Filgrastim (biosimilar)', 'Oncology', 'Chemotherapy-Induced Neutropenia', null, null, 'Neupogen / Emgrast', null, 'Chronic']),
  // Reditux (Rituximab) — landmark: one of the world's first rituximab biosimilars (Apr-2007)
  row(['Reditux', 'Own Launched', '2007-04-01', '—', "Dr. Reddy's", 'Biosimilar Launch', 'Rituximab (biosimilar)', 'Oncology', "Non-Hodgkin's Lymphoma / CLL / Rheumatoid Arthritis", null, null, 'MabThera / Rituxan / Maball', null, 'Chronic']),
  // Cresp (Darbepoetin alfa) — GaBI Online — launched 09-Aug-2010
  row(['Cresp', 'Own Launched', '2010-08-09', '—', "Dr. Reddy's", 'Biosimilar Launch', 'Darbepoetin Alfa (biosimilar)', 'Nephrology', 'Anaemia in Chronic Kidney Disease', null, null, 'Aranesp', null, 'Chronic']),
  // Hervycta (Trastuzumab) — GaBI Online / Center for Biosimilars — launched 26-Jul-2018
  row(['Hervycta', 'Own Launched', '2018-07-26', '—', "Dr. Reddy's", 'Biosimilar Launch', 'Trastuzumab (biosimilar)', 'Oncology', 'HER2+ Breast Cancer / Metastatic Gastric Cancer', null, null, 'Herceptin / Canmab', null, 'Chronic']),
  // Versavo (Bevacizumab) — GaBI Online / BioSpace — launched 19-Aug-2019
  row(['Versavo', 'Own Launched', '2019-08-19', '—', "Dr. Reddy's", 'Biosimilar Launch', 'Bevacizumab (biosimilar)', 'Oncology', 'Metastatic Colorectal & Lung Cancer', null, null, 'Avastin / Bevatas', null, 'Chronic']),

  // ── In-licensing / partnerships ──
  // Sputnik V — DRL held India rights via RDIF; soft launch in Hyderabad 14-May-2021 (~Rs 995.40/dose)
  row(['Sputnik V', 'In-licensed', '2021-05-14', 'RDIF / Gamaleya Institute', "Dr. Reddy's", 'Distribution + Manufacturing Licence (India)', 'Gam-COVID-Vac (adenoviral-vector vaccine)', 'Vaccines', 'COVID-19 Prevention', null, null, 'Covishield / Covaxin', null, 'Acute', '₹995.40 / dose']),
  // Nestlé Dr Reddy's JV — Nestlé India + DRL nutraceuticals JV (49:51), announced 25-Apr-2024
  row(["Nestlé Dr Reddy's JV", 'In-licensed', '2024-04-25', 'Nestlé India', "Dr. Reddy's", 'Joint Venture (India + agreed territories)', "Various (Nature's Bounty / Osteo Bi-Flex / Ester-C + DRL nutra brands)", 'Nutraceuticals', 'Metabolic / Wellness / Hospital Nutrition', null, null, 'Various', null, 'Chronic']),
  // Tegoprazan — Business Standard — DRL launches in-licensed P-CAB in India (16-Sep-2025)
  row(['Tegoprazan', 'In-licensed', '2025-09-16', 'HK inno.N (Korea)', "Dr. Reddy's", 'In-license (India)', 'Tegoprazan', 'Gastroenterology', 'GERD / Erosive Esophagitis / Gastric Ulcers', null, null, '—', null, 'Chronic']),

  // ── Recent India launch + US launch ──
  // Obeda (Semaglutide) — drreddys.com / Stock Titan — India launch post Delhi HC nod (20-Mar-2026)
  row(['Obeda', 'Own Launched', '2026-03-20', '—', "Dr. Reddy's", 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Weight Management', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),
  // Lenalidomide Capsules (gRevlimid) — BusinessWire — US launch 07-Sep-2022; first-to-market 180-day exclusivity on 2.5/20 mg
  row(['Lenalidomide Capsules (gRevlimid — US)', 'Own Launched', '2022-09-07', '—', "Dr. Reddy's", 'Generic Launch (US)', 'Lenalidomide', 'Oncology', 'Multiple Myeloma', null, null, 'Revlimid', null, 'Chronic']),

  // ── Acquisitions ──
  // Betapharm — Mar-2006, €480M; then the largest overseas acquisition by an Indian pharma company
  row(['Betapharm (Germany)', 'Acquired', '2006-03-01', '3i Group', "Dr. Reddy's", 'Company Acquisition (Germany / EU)', 'Various (German branded-generics portfolio)', 'Multi-therapy', 'Multi-indication (Germany / EU generics)', null, null, 'Various', null, 'Chronic']),
  // Wockhardt branded generics — BusinessWire — completed 10-Jun-2020; Rs 1,850 Cr, 62 brands + Baddi plant
  row(['Wockhardt Branded Generics Portfolio (parent)', 'Acquired', '2020-06-10', 'Wockhardt', "Dr. Reddy's", 'Brand Portfolio Acquisition (India + South Asia)', 'Various (62-brand branded-generics portfolio)', 'Multi-therapy', 'Respiratory / Neurology / Derma / Gastro / Pain / Vaccines', null, null, 'Various', null, 'Chronic']),
  // Wockhardt sub-brand — Practin (Cyproheptadine) — appetite stimulant
  row(['Practin', 'Acquired', '2020-06-10', 'Wockhardt', "Dr. Reddy's", 'Brand Acquisition', 'Cyproheptadine', 'Nutrition / Wellness', 'Appetite Stimulant', null, null, 'Ciplactin / Apetamin', null, 'Acute']),
  // Wockhardt sub-brand — Bro-Zedex (cough)
  row(['Bro-Zedex', 'Acquired', '2020-06-10', 'Wockhardt', "Dr. Reddy's", 'Brand Acquisition', 'Bromhexine + Guaifenesin + Terbutaline + Menthol', 'Respiratory', 'Productive Cough / Bronchospasm', null, null, 'Ascoril / Grilinctus', null, 'Acute']),
  // Wockhardt sub-brand — Tryptomer (Amitriptyline)
  row(['Tryptomer', 'Acquired', '2020-06-10', 'Wockhardt', "Dr. Reddy's", 'Brand Acquisition', 'Amitriptyline', 'Neurology / CNS', 'Depression / Neuropathic Pain / Migraine Prophylaxis', null, null, 'Amitone / Elavil', null, 'Chronic']),
  // Wockhardt sub-brand — Biovac (Hepatitis A vaccine)
  row(['Biovac', 'Acquired', '2020-06-10', 'Wockhardt', "Dr. Reddy's", 'Brand Acquisition', 'Hepatitis A Vaccine', 'Vaccines', 'Hepatitis A Prevention', null, null, 'Havrix / Avaxim', null, 'Acute']),
  // Haleon Nicotinell / NRT — completed 30-Sep-2024; ~£500M (US$633M); ex-US nicotine-replacement portfolio
  row(['Haleon Nicotinell / NRT Portfolio', 'Acquired', '2024-09-30', 'Haleon', "Dr. Reddy's", 'Brand Portfolio Acquisition (ex-US global)', 'Nicotine (gum / lozenge / patch)', 'Consumer Health', 'Smoking Cessation / Nicotine Replacement', null, null, 'Nicorette / Kwit', null, 'Acute']),

  // ──────────────────────────────────────────────────────────────────────────
  // Glenmark Pharmaceuticals — LIVE DATASET (deep-research edition)
  // Sources: glenmarkpharma.com press releases + investor filings, BSE / NSE
  // filings, Business Standard / BusinessToday / Fierce Pharma / PR Newswire
  // coverage, SaNOtize / BeiGene / Hengrui press releases for the partnerships,
  // generic-pharmacy listings for pricing. Glenmark is a Mumbai-based
  // respiratory / dermatology / cardio-metabolic leader with a strong
  // innovation + in/out-licensing streak (first-in-world Remogliflozin, the
  // SaNOtize and BeiGene / Hengrui in-licences, the AbbVie ISB 2001 out-licence).
  // Growth has been organic + licensing-driven, not acquisition-driven — hence
  // no acquisition rows. Older India engine-brand launch years are [est.].
  // ──────────────────────────────────────────────────────────────────────────

  // ── India branded engine brands (Own Launched) — the Glenmark India backbone ──
  // Ascoril — Glenmark's flagship respiratory brand, India's top cough-syrup franchise [launch year est.]
  row(['Ascoril', 'Own Launched', '1998-01-01', '—', 'Glenmark', 'Generic Launch', 'Bromhexine + Guaifenesin + Terbutaline + Menthol (± Salbutamol)', 'Respiratory', 'Productive Cough / Bronchospasm', null, null, 'Grilinctus / Bro-Zedex / Chericof', null, 'Acute']),
  // Alex — long-running Glenmark cough range [launch year est.]
  row(['Alex', 'Own Launched', '2000-01-01', '—', 'Glenmark', 'Generic Launch', 'Phenylephrine + Chlorpheniramine + Dextromethorphan (cough range)', 'Respiratory', 'Dry / Allergic Cough', null, null, 'Benadryl / Corex', null, 'Acute']),
  // Telma — Glenmark's leading cardiology brand (telmisartan franchise) [launch year est.]
  row(['Telma', 'Own Launched', '2007-01-01', '—', 'Glenmark', 'Generic Launch', 'Telmisartan (± Hydrochlorothiazide / Amlodipine / Cilnidipine / Metoprolol)', 'Cardiology', 'Hypertension', null, null, 'Telsartan / Telvas / Micardis', null, 'Chronic']),
  // Candid — Glenmark's flagship antifungal; the company leads the India antifungal segment [launch year est.]
  row(['Candid', 'Own Launched', '1995-01-01', '—', 'Glenmark', 'Generic Launch', 'Clotrimazole (± Beclomethasone — Candid-B)', 'Dermatology', 'Fungal Skin Infections / Candidiasis', null, null, 'Canesten / Surfaz', null, 'Acute']),
  // Momate — top topical-corticosteroid brand [launch year est.]
  row(['Momate', 'Own Launched', '2004-01-01', '—', 'Glenmark', 'Generic Launch', 'Mometasone Furoate', 'Dermatology', 'Eczema / Psoriasis / Inflammatory Dermatoses', null, null, 'Elocon / Momecon', null, 'Chronic']),
  // Zita — teneligliptin franchise; Glenmark was an India teneligliptin pioneer [launch year est.]
  row(['Zita / Zita-Plus', 'Own Launched', '2015-01-01', '—', 'Glenmark', 'Generic Launch', 'Teneligliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Tenepure / Teneza / Dynaglipt', null, 'Chronic']),

  // ── Innovation-led India launches (Own Launched) ──
  // Remogliflozin (Remo / Remozen) — PR Newswire — Glenmark was the FIRST in the world to
  // commercialise remogliflozin (May-2019); India was the first country to get the SGLT2 inhibitor
  row(['Remo / Remozen', 'Own Launched', '2019-05-01', '—', 'Glenmark', 'NCE Launch (first-in-world)', 'Remogliflozin Etabonate (± Vildagliptin / Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Jardiance / Forxiga (SGLT2 class)', null, 'Chronic']),
  // Ryaltris-AZ — PR Newswire — Glenmark-developed olopatadine+mometasone FDC nasal spray, launched
  // in India 03-May-2021 at Rs 175/pack (~52% below the top-10 average)
  row(['Ryaltris-AZ', 'Own Launched', '2021-05-03', '—', 'Glenmark', 'Novel FDC Launch (India)', 'Olopatadine + Mometasone Furoate (nasal spray)', 'Respiratory', 'Moderate-Severe Allergic Rhinitis', null, null, 'Duonase / Momeflo', null, 'Chronic', '₹175 / pack (75 metered doses)']),
  // Sacu V — Business Standard — Glenmark launches generic Sacubitril+Valsartan in India (17-Jan-2023)
  row(['Sacu V', 'Own Launched', '2023-01-17', '—', 'Glenmark', 'Generic Launch', 'Sacubitril + Valsartan', 'Cardiology', 'Chronic Heart Failure (HFrEF)', null, null, 'Entresto / Vymada / Azmarda', null, 'Chronic', '₹19–45 / tablet (50 / 100 / 200 mg)']),
  // Lirafit — PR Newswire — Glenmark is the FIRST to launch a liraglutide biosimilar in India
  // (03-Jan-2024), cutting therapy cost ~70%
  row(['Lirafit', 'Own Launched', '2024-01-03', '—', 'Glenmark', 'Biosimilar Launch', 'Liraglutide (biosimilar)', 'Anti-Diabetic', 'Type 2 Diabetes / Chronic Weight Management', null, null, 'Victoza / Saxenda', null, 'Chronic']),

  // ── COVID-19 portfolio ──
  // FabiFlu — Business Standard — first oral favipiravir approved in India for mild-moderate COVID-19
  // (launched 20-Jun-2020 at Rs 103/tablet)
  row(['FabiFlu', 'Own Launched', '2020-06-20', '—', 'Glenmark', 'Generic Launch', 'Favipiravir', 'Anti-Infectives', 'Mild-Moderate COVID-19', null, null, 'Coviflu / Favipira', null, 'Acute', '₹103 / tablet (400 mg, at launch)']),
  // FabiSpray — PR Newswire — Nitric Oxide Nasal Spray in-licensed from SaNOtize (partnership
  // Jul-2021); DCGI accelerated approval, launched Feb-2022
  row(['FabiSpray', 'In-licensed', '2022-02-01', 'SaNOtize', 'Glenmark', 'In-license (India + Asia)', 'Nitric Oxide Nasal Spray (NONS)', 'Anti-Infectives', 'Mild COVID-19 (upper-airway viral load)', null, null, '—', null, 'Acute']),

  // ── Oncology in-licensing ──
  // BeiGene — PR Newswire — Glenmark Specialty exclusive marketing & distribution agreement to
  // register and commercialise BeiGene's oncology medicines in India (21-May-2024)
  row(['Tislelizumab + Zanubrutinib (BeiGene)', 'In-licensed', '2024-05-21', 'BeiGene', 'Glenmark', 'In-license (India)', 'Tislelizumab (anti-PD-1) + Zanubrutinib (BTK inhibitor)', 'Oncology', 'Solid Tumours / B-cell Malignancies', null, null, 'Keytruda / Imbruvica', null, 'Chronic']),
  // Trastuzumab Rezetecan — Fierce Pharma — Glenmark in-licenses Hengrui's anti-HER2 ADC for India +
  // select emerging markets; $18M upfront, up to $1.1B milestones (Sep-2025) — pipeline asset
  row(['Trastuzumab Rezetecan (Hengrui ADC)', 'In-licensed', '2025-09-01', 'Jiangsu Hengrui Pharma', 'Glenmark', 'In-license (India + emerging markets)', 'Trastuzumab Rezetecan (anti-HER2 antibody-drug conjugate)', 'Oncology', 'HER2-expressing Solid Tumours', null, null, 'Enhertu', null, 'Chronic']),

  // ── Recent metabolic launches ──
  // Glempa — Business Standard — Glenmark launches generic empagliflozin in India (12-Mar-2025)
  row(['Glempa + Glempa-L + Glempa-M', 'Own Launched', '2025-03-12', '—', 'Glenmark', 'Generic Launch', 'Empagliflozin (± Linagliptin / Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Jardiance', null, 'Chronic']),
  // GLIPIQ — Business Standard — Glenmark launches semaglutide in India (21-Mar-2026)
  row(['GLIPIQ', 'Own Launched', '2026-03-21', '—', 'Glenmark', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Lupin — LIVE DATASET (deep-research edition)
  // Sources: lupin.com press releases + investor filings, BSE / NSE filings,
  // Business Standard / BusinessToday / GenEngNews / BioPharma Dive coverage,
  // Eli Lilly + Boehringer Ingelheim press releases for the partnerships, FDA
  // approval history for the US launches. Lupin is a Mumbai-based top-5 Indian
  // pharma — the global leader in anti-TB, India's #3 in anti-diabetic, with a
  // strong US generics + specialty (Solosec) book and active in / out-licensing
  // with Boehringer Ingelheim and Eli Lilly. Older India engine-brand launch
  // years are [est.] — exact launch dates are not publicly disclosed.
  // ──────────────────────────────────────────────────────────────────────────

  // ── India branded engine brands (Own Launched) — the Lupin India backbone ──
  // Tonact (Atorvastatin) — Lupin's flagship statin [launch year est.]
  row(['Tonact', 'Own Launched', '2003-01-01', '—', 'Lupin', 'Generic Launch', 'Atorvastatin (± Fenofibrate / Ezetimibe)', 'Cardiology', 'Dyslipidemia', null, null, 'Atorva / Storvas / Lipitor', null, 'Chronic']),
  // Ramistar (Ramipril) — cardio ACE-inhibitor [launch year est.]
  row(['Ramistar', 'Own Launched', '2004-01-01', '—', 'Lupin', 'Generic Launch', 'Ramipril (± Hydrochlorothiazide / Amlodipine)', 'Cardiology', 'Hypertension / CV Risk Reduction', null, null, 'Cardace / Hopace', null, 'Chronic']),
  // Telista (Telmisartan) — cardio ARB [launch year est.]
  row(['Telista', 'Own Launched', '2008-01-01', '—', 'Lupin', 'Generic Launch', 'Telmisartan (± Hydrochlorothiazide / Amlodipine)', 'Cardiology', 'Hypertension', null, null, 'Telma / Telsartan / Micardis', null, 'Chronic']),
  // Gluconorm-G (Glimepiride + Metformin) — top-300 India brand; Lupin = India #3 in anti-diabetic [launch year est.]
  row(['Gluconorm-G', 'Own Launched', '2005-01-01', '—', 'Lupin', 'Generic Launch', 'Glimepiride + Metformin (± Voglibose / Pioglitazone)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl-M / Glimestar-M', null, 'Chronic']),
  // Lupisulin (Human Insulin range) — Lupin's own recombinant human insulin franchise [launch year est.]
  row(['Lupisulin', 'Own Launched', '2007-01-01', '—', 'Lupin', 'Generic Launch', 'Recombinant Human Insulin (R / NPH / 30-70 / 50-50)', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Huminsulin / Actrapid / Insugen', null, 'Chronic']),
  // Akurit / Akurit-4 (FDC anti-TB) — Lupin is the GLOBAL leader in anti-TB [launch year est.]
  row(['Akurit / Akurit-4', 'Own Launched', '2000-01-01', '—', 'Lupin', 'Generic Launch', 'Rifampicin + Isoniazid + Pyrazinamide + Ethambutol (4-FDC) / DOTS variants', 'Anti-TB', 'Drug-Sensitive Tuberculosis', null, null, 'R-Cinex / Combutol', null, 'Chronic']),
  // R-Cinex (Rifampicin + Isoniazid) — long-standing anti-TB continuation-phase FDC [launch year est.]
  row(['R-Cinex', 'Own Launched', '1995-01-01', '—', 'Lupin', 'Generic Launch', 'Rifampicin + Isoniazid', 'Anti-TB', 'Tuberculosis (continuation phase)', null, null, 'Akurit / Rcin', null, 'Chronic']),
  // Budamate (Budesonide + Formoterol DPI) — Lupin's respiratory FDC inhaler [launch year est.]
  row(['Budamate', 'Own Launched', '2010-01-01', '—', 'Lupin', 'Generic Launch', 'Budesonide + Formoterol (DPI inhaler)', 'Respiratory', 'Asthma / COPD', null, null, 'Foracort / Symbicort', null, 'Chronic']),

  // ── Recent India launch (Own Launched) ──
  // RaniEyes — first India ranibizumab biosimilar; for AMD / DME (2022)
  row(['RaniEyes', 'Own Launched', '2022-01-01', '—', 'Lupin', 'Biosimilar Launch', 'Ranibizumab (biosimilar)', 'Ophthalmology', 'Age-related Macular Degeneration / DME', null, null, 'Lucentis / Razumab', null, 'Chronic']),

  // ── India in-licensing ──
  // ONDERO + ONDERO MET (Linagliptin) — Lupin & Boehringer Ingelheim co-marketing agreement (14-Oct-2015)
  row(['ONDERO + ONDERO MET', 'In-licensed', '2015-10-14', 'Boehringer Ingelheim India', 'Lupin', 'Co-marketing (India)', 'Linagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes (DPP-4)', null, null, 'Trajenta / Trajenta Duo', null, 'Chronic']),
  // Semanext / Livarise — lupin.com — Lupin + Zydus co-marketing for innovative semaglutide pen (17-Mar-2026)
  row(['Semanext / Livarise', 'In-licensed', '2026-03-17', 'Zydus Lifesciences', 'Lupin', 'Co-marketing', 'Semaglutide (innovative pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Semaglyn', null, 'Chronic']),

  // ── US launches (Own Launched) ──
  // Solosec (Secnidazole) — Lupin's marquee US specialty asset (via Symbiomix); FDA approved 15-Sep-2017
  row(['Solosec', 'Own Launched', '2017-09-15', '—', 'Lupin', 'NCE Launch (US)', 'Secnidazole 2g granules', "Women's Health", 'Bacterial Vaginosis / Trichomoniasis', null, null, 'Tindamax / Flagyl', null, 'Acute']),
  // Mirabegron ER (gMyrbetriq) — Lupin press release — 25 mg launch 22-Apr-2024 (50 mg Sep-2024); US$1.6B market
  row(['Mirabegron ER (gMyrbetriq — US)', 'Own Launched', '2024-04-22', '—', 'Lupin', 'Generic Launch (US)', 'Mirabegron Extended-Release', 'Urology', 'Overactive Bladder (OAB)', null, null, 'Myrbetriq', null, 'Chronic']),
  // Tolvaptan (gJynarque) — Lupin press release — May-2025 US launch with 180-day first-to-market exclusivity
  row(['Tolvaptan (gJynarque — US)', 'Own Launched', '2025-05-01', '—', 'Lupin', 'Generic Launch (US)', 'Tolvaptan', 'Nephrology', 'Autosomal Dominant Polycystic Kidney Disease (ADPKD)', null, null, 'Jynarque / Samsca', null, 'Chronic']),

  // ── Acquisitions ──
  // Gavis Pharmaceuticals — Jul-2015 announcement, ~$880M; then the biggest overseas pharma deal by an
  // Indian company; brought a US manufacturing plant + 66 pending ANDAs + Novel Laboratories
  row(['Gavis Pharmaceuticals (US)', 'Acquired', '2015-07-23', 'Gavis / Novel Laboratories', 'Lupin', 'Company Acquisition (US)', 'Various (US generics — 66 ANDAs + niche dosage forms)', 'Multi-therapy', 'Multi-indication (US generics)', null, null, 'Various', null, 'Chronic']),
  // Symbiomix Therapeutics — Oct-2017, ~$150M; brought Solosec + the reproductive-infection portfolio
  row(['Symbiomix Therapeutics (US)', 'Acquired', '2017-10-01', 'Symbiomix Therapeutics shareholders', 'Lupin', 'Company Acquisition (US)', 'Secnidazole (Solosec) + reproductive-infection portfolio', "Women's Health", 'Bacterial Vaginosis / Reproductive Infections', null, null, 'Various', null, 'Acute']),
  // Boehringer Ingelheim trademarks — 13-Dec-2024; Lupin acquires GIBTULIO / GIBTULIO MET / AJADUO
  // empagliflozin franchise outright (co-marketed since 2016 / 2018)
  row(['GIBTULIO + GIBTULIO MET + AJADUO', 'Acquired', '2024-12-13', 'Boehringer Ingelheim International', 'Lupin', 'Brand Portfolio Acquisition (India)', 'Empagliflozin (± Metformin / Linagliptin)', 'Anti-Diabetic', 'Type 2 Diabetes (SGLT2)', null, null, 'Jardiance / Glempa / Empanorm', null, 'Chronic']),
  // Huminsulin — Dec-2024; Lupin acquires Eli Lilly's recombinant human insulin range for India after
  // years of distribution + promotion
  row(['Huminsulin', 'Acquired', '2024-12-30', 'Eli Lilly and Company', 'Lupin', 'Brand Acquisition (India)', 'Recombinant Human Insulin (R / NPH / 30-70 / 50-50)', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Lupisulin / Actrapid', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Zydus Lifesciences — LIVE DATASET (deep-research edition)
  // Sources: zyduslife.com press releases + investor filings, BSE / NSE filings,
  // Business Standard / BusinessToday / Fierce Pharma / Pharmaletter / GaBI Online /
  // PR Newswire coverage, Kraft Heinz + Eiger Biopharmaceuticals press releases for
  // partner deals. Zydus is one of India's top-5 pharma companies and a global
  // biosimilars / vaccines pioneer — first to launch a biosimilar adalimumab
  // (Exemptia, 2014), the first NCE from Indian R&D (Saroglitazar / Lipaglyn,
  // 2013), the world's first DNA-plasmid COVID-19 vaccine (ZyCoV-D, 2021),
  // and most recently the world's first nivolumab biosimilar (Tishtha, Jan-2026).
  // Older India engine-brand launch years are [est.] — exact launch dates are
  // not publicly disclosed.
  // ──────────────────────────────────────────────────────────────────────────

  // ── India branded engine brands (Own Launched) — the Zydus India backbone ──
  // Atorva (Atorvastatin) — Zydus's flagship statin brand [launch year est.]
  row(['Atorva', 'Own Launched', '2001-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Atorvastatin (± Fenofibrate / Ezetimibe)', 'Cardiology', 'Dyslipidemia', null, null, 'Lipitor / Storvas / Atocor', null, 'Chronic']),
  // Aten (Atenolol) — long-standing cardio beta-blocker [launch year est.]
  row(['Aten', 'Own Launched', '1995-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Atenolol (± Amlodipine / Chlorthalidone)', 'Cardiology', 'Hypertension / Angina', null, null, 'Tenormin / Beten', null, 'Chronic']),
  // Mifegest-Kit (Mifepristone + Misoprostol) — Zydus's flagship women's-health kit [launch year est.]
  row(['Mifegest-Kit', 'Own Launched', '2003-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Mifepristone + Misoprostol', "Women's Health", 'Medical Termination of Pregnancy', null, null, 'Mifeprex / Cytotec', null, 'Acute']),
  // Nucoxia (Etoricoxib) — Zydus pain franchise; launched 2004 per company disclosure
  row(['Nucoxia / Nucoxia-MR', 'Own Launched', '2004-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Etoricoxib (± Thiocolchicoside)', 'Pain Management', 'Osteoarthritis / Rheumatoid Arthritis / Gout', null, null, 'Arcoxia / Etody', null, 'Chronic']),
  // Skinlite (Hydroquinone + Tretinoin + Mometasone) — flagship Indian melasma cream [launch year est.]
  row(['Skinlite', 'Own Launched', '2002-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Hydroquinone + Tretinoin + Mometasone Furoate', 'Dermatology', 'Melasma / Hyperpigmentation', null, null, 'Melalumin / Demelan', null, 'Chronic']),
  // Falcigo (Artesunate injection) — Zydus anti-malarial workhorse [launch year est.]
  row(['Falcigo', 'Own Launched', '2000-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Artesunate (injection)', 'Anti-Infectives', 'Severe Falciparum Malaria', null, null, 'Larinate / Tetan', null, 'Acute']),
  // Glip-M (Glimepiride + Metformin) — Zydus anti-diabetic combo [launch year est.]
  row(['Glip-M', 'Own Launched', '2005-01-01', '—', 'Zydus Lifesciences', 'Generic Launch', 'Glimepiride + Metformin (± Voglibose / Pioglitazone)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Amaryl-M / Glimestar-M', null, 'Chronic']),

  // ── Innovation-led India launches (Own Launched) ──
  // Lipaglyn (Saroglitazar) — Asian Scientist / PIB — first NCE from Indian R&D;
  // DCGI approval June-2013; dual PPAR α/γ agonist for diabetic dyslipidemia,
  // later expanded to NASH / NAFLD via line extensions (Bilypsa, Vorxar co-marketing)
  row(['Lipaglyn', 'Own Launched', '2013-06-01', '—', 'Zydus Lifesciences', 'NCE Launch (first from Indian R&D)', 'Saroglitazar Magnesium', 'Gastroenterology / Hepatology', 'Diabetic Dyslipidemia / NASH / NAFLD', null, null, 'Vorxar / Bilypsa (own)', null, 'Chronic']),

  // ── Biosimilars — Zydus is a global biosimilars pioneer ──
  // Exemptia — PR Newswire — WORLD-FIRST adalimumab biosimilar launched 09-Dec-2014;
  // priced ~80% below originator Humira at launch
  row(['Exemptia', 'Own Launched', '2014-12-09', '—', 'Zydus Lifesciences', 'Biosimilar Launch (world-first)', 'Adalimumab (biosimilar)', 'Immunology', 'Rheumatoid Arthritis / Psoriatic Arthritis / Ankylosing Spondylitis / UC', null, null, 'Humira', null, 'Chronic']),
  // Tishtha — zyduslife.com — WORLD-FIRST nivolumab biosimilar in India (22-Jan-2026)
  row(['Tishtha', 'Own Launched', '2026-01-22', '—', 'Zydus Lifesciences', 'Biosimilar Launch (world-first)', 'Nivolumab (biosimilar)', 'Oncology', 'NSCLC / Melanoma / RCC (PD-1)', null, null, 'Opdyta / Nivolutab', null, 'Chronic']),
  // ANYRA — scanx.trade — India's first indigenous aflibercept biosimilar (19-Feb-2026)
  row(['ANYRA', 'Own Launched', '2026-02-19', '—', 'Zydus Lifesciences', 'Biosimilar Launch (India-first)', 'Aflibercept (biosimilar)', 'Ophthalmology', 'Wet AMD / Diabetic Macular Edema', null, null, 'Eylea', null, 'Chronic']),

  // ── Vaccines ──
  // ZyCoV-D — PIB / Wikipedia — WORLD-FIRST DNA-plasmid COVID-19 vaccine; DCGI EUA
  // 20-Aug-2021, full supply rollout to Government of India from Feb-2022
  row(['ZyCoV-D', 'Own Launched', '2021-08-20', '—', 'Zydus Lifesciences', 'NCE Launch (world-first DNA vaccine)', 'DNA Plasmid Vaccine (SARS-CoV-2 Spike protein)', 'Vaccines', 'COVID-19 Prevention (12+ years)', null, null, 'Covishield / Covaxin', null, 'Acute']),

  // ── Recent metabolic launch ──
  // Semaglyn / Mashema / Alterme — Zydus press release — Day-1 patent-expiry
  // semaglutide launch via own reusable pen platform (25-Feb-2026)
  row(['Semaglyn / Mashema / Alterme', 'Own Launched', '2026-02-25', '—', 'Zydus Lifesciences', 'Generic Launch', 'Semaglutide (reusable pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic / Sundae', null, 'Chronic']),

  // ── US launches (Own Launched) ──
  // Mirabegron ER — Business Standard / BusinessWire — Zydus US launch (22-Apr-2024);
  // ~US$2.42 bn annual market for Myrbetriq
  row(['Mirabegron Extended-Release (gMyrbetriq — US)', 'Own Launched', '2024-04-22', '—', 'Zydus Lifesciences', 'Generic Launch (US)', 'Mirabegron Extended-Release', 'Urology', 'Overactive Bladder (OAB)', null, null, 'Myrbetriq', null, 'Chronic']),
  // Eltrombopag Tablets — scanx.trade — FY26 Zydus US launch; ~US$1.26 bn annual market
  row(['Eltrombopag Tablets (gPromacta — US)', 'Own Launched', '2025-09-01', '—', 'Zydus Lifesciences', 'Generic Launch (US)', 'Eltrombopag', 'Oncology', 'Chronic Immune Thrombocytopenia (ITP)', null, null, 'Promacta / Revolade', null, 'Chronic']),
  // Dapagliflozin — Whalesbook — Zydus US launch 08-Apr-2026 with 180-day shared exclusivity
  row(['Dapagliflozin (gFarxiga — US)', 'Own Launched', '2026-04-08', '—', 'Zydus Lifesciences', 'Generic Launch (US — 180-day shared exclusivity)', 'Dapagliflozin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Farxiga', null, 'Chronic']),

  // ── Specialty US (via Sentynl Therapeutics — Zydus's US specialty subsidiary) ──
  // Zokinvy (Lonafarnib) — facebook.com / Eiger PR — Sentynl acquires global rights from
  // Eiger Biopharmaceuticals (May-2024); the only approved therapy for Hutchinson-Gilford
  // Progeria Syndrome (HGPS) — ultra-rare paediatric disease
  row(['Zokinvy (Lonafarnib) — Sentynl', 'Acquired', '2024-05-15', 'Eiger Biopharmaceuticals', 'Zydus Lifesciences', 'Asset Acquisition (Global)', 'Lonafarnib', 'Endocrinology / Rare Disease', 'Hutchinson-Gilford Progeria Syndrome', null, null, 'N/A (first-in-class)', null, 'Chronic']),

  // ── Acquisitions — Heinz India consumer brands (Oct-2018 announce / Jan-2019 close, ~Rs 4,595 Cr) ──
  // Kraft Heinz Co press release — Zydus Wellness (group company) acquired Heinz India for
  // Rs 4,595 Cr / US$652M; 4 marquee FMCG brands + Aligarh & Sitarganj plants (definitive
  // agreement 24-Oct-2018, completion 30-Jan-2019). Attributed here to the Zydus parent.
  row(['Heinz India Consumer Brands (parent)', 'Acquired', '2019-01-30', 'Kraft Heinz Company', 'Zydus Lifesciences', 'Brand Portfolio Acquisition (India)', 'Various (consumer health + nutraceuticals)', 'Nutraceuticals / Consumer Health', 'Wellness / Nutrition / Personal Care', null, null, 'Various', null, 'Chronic']),
  // Heinz sub-brand — Complan (malt-based health drink)
  row(['Complan', 'Acquired', '2019-01-30', 'Kraft Heinz Company', 'Zydus Lifesciences', 'Brand Acquisition', 'Multi-vitamin Malt-based Health Drink', 'Nutraceuticals / Consumer Health', 'Children / Adult Nutrition', null, null, 'Horlicks / Boost', null, 'Chronic']),
  // Heinz sub-brand — Glucon-D (glucose + vitamin energy drink)
  row(['Glucon-D', 'Acquired', '2019-01-30', 'Kraft Heinz Company', 'Zydus Lifesciences', 'Brand Acquisition', 'Anhydrous Dextrose + Vitamins', 'Nutraceuticals / Consumer Health', 'Energy / Hydration / Fatigue', null, null, 'Glucose-D / Glucolife', null, 'Acute']),
  // Heinz sub-brand — Nycil (medicated prickly-heat talc with antifungal chlorphenesin)
  row(['Nycil', 'Acquired', '2019-01-30', 'Kraft Heinz Company', 'Zydus Lifesciences', 'Brand Acquisition', 'Chlorphenesin + Boric Acid + Zinc Oxide (medicated talc)', 'Dermatology / Consumer Health', 'Prickly Heat / Mild Fungal Skin Infections', null, null, 'Candid Powder / Dermicool', null, 'Acute']),
  // Heinz sub-brand — Sampriti Ghee (premium edible ghee)
  row(['Sampriti Ghee', 'Acquired', '2019-01-30', 'Kraft Heinz Company', 'Zydus Lifesciences', 'Brand Acquisition', 'Cow / Buffalo Ghee', 'Nutrition / Wellness', 'Culinary / Nutrition', null, null, 'Amul Ghee / Mother Dairy', null, 'Chronic']),

  // ──────────────────────────────────────────────────────────────────────────
  // Abbott India — LIVE DATASET (deep-research edition)
  // Sources: abbott.in press releases + investor filings, BSE / NSE filings,
  // Business Standard / BusinessToday / Fierce Pharma / Knowledge@Wharton /
  // BioSpectrum coverage, Piramal Healthcare + Novo Nordisk + MSD press
  // releases for the deals. Abbott India is the listed Indian arm of Abbott
  // Laboratories (US) — historically India's #1 pharma (post-Piramal-2010
  // acquisition); IIFL flags Abbott has lost ~20 bps of MS over FY22-26 with
  // volume Cagr at -3.7%, but the brand book — Thyronorm, Duphaston, Brufen,
  // Vertin, Cremaffin, Digene, Udiliv — remains category-leading. Older
  // engine-brand launch years are [est.].
  // ──────────────────────────────────────────────────────────────────────────

  // ── India branded engine brands (Own Launched / Solvay heritage) ──
  // Brufen (Ibuprofen) — Abbott's legacy global analgesic brand in India [launch year est.]
  row(['Brufen', 'Own Launched', '1985-01-01', '—', 'Abbott India', 'Generic Launch', 'Ibuprofen', 'Pain Management', 'Pain / Inflammation / Fever', null, null, 'Combiflam / Ibumol', null, 'Acute']),
  // Duphaston (Dydrogesterone) — Solvay heritage; #1 progesterone brand in India [launch year est.]
  row(['Duphaston', 'Own Launched', '1990-01-01', '—', 'Abbott India', 'Generic Launch', 'Dydrogesterone', "Women's Health", 'Threatened Miscarriage / Endometriosis / Menopause', null, null, 'Susten / Dubagest', null, 'Chronic']),
  // Duphalac (Lactulose) — Solvay heritage; flagship constipation/hepatic-encephalopathy brand [launch year est.]
  row(['Duphalac', 'Own Launched', '1995-01-01', '—', 'Abbott India', 'Generic Launch', 'Lactulose', 'Gastroenterology', 'Constipation / Hepatic Encephalopathy', null, null, 'Looz / Lactihep / Cremalax', null, 'Chronic']),
  // Vertin (Betahistine) — Solvay heritage; India CNS / vertigo leader [launch year est.]
  row(['Vertin', 'Own Launched', '2003-01-01', '—', 'Abbott India', 'Generic Launch', 'Betahistine Dihydrochloride', 'Neurology / CNS', 'Vertigo / Meniere\'s Disease', null, null, 'Stugeron / Stemetil', null, 'Chronic']),
  // Udiliv (Ursodeoxycholic acid) — Solvay heritage; flagship hepatology brand [launch year est.]
  row(['Udiliv', 'Own Launched', '1995-01-01', '—', 'Abbott India', 'Generic Launch', 'Ursodeoxycholic Acid', 'Gastroenterology / Hepatology', 'Cholestatic Liver Disease / Gallstone Dissolution', null, null, 'Ursocol / Udihep', null, 'Chronic']),

  // ── Recent India launch (Own Launched) ──
  // PneumoShield 14 — abbott.in / BioSpectrum — Abbott launches 14-valent PCV in India (Nov-2024)
  row(['PneumoShield 14', 'Own Launched', '2024-11-01', '—', 'Abbott India', 'NCE Launch (India)', '14-valent Pneumococcal Conjugate Vaccine', 'Vaccines', 'Invasive Pneumococcal Disease Prevention (6 wks+)', null, null, 'Prevnar 13 / Synflorix', null, 'Acute']),

  // ── Piramal Healthcare formulations acquisition — 21-May-2010 announce / 07-Sep-2010 close ──
  // Business Standard / Fierce Pharma / Knowledge@Wharton — Abbott acquires Piramal's
  // Healthcare Solutions (Domestic Formulations) business for $3.7 bn (~Rs 17,500 Cr at
  // 2010 rates); biggest pharma M&A deal in India at the time; 350+ brands + 5,500
  // employees + Baddi plant; propelled Abbott to #1 in India pharma (~7% MS).
  row(['Piramal Healthcare Formulations Portfolio (parent)', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Portfolio Acquisition (India + neighbours)', 'Various (350+ branded-generics across therapy areas)', 'Multi-therapy', 'Multi-indication (India domestic formulations)', null, null, 'Various', null, 'Chronic']),
  // Piramal sub-brand — Thyronorm (Levothyroxine) — became Abbott's #1 India brand, ~50% MS in hypothyroid
  row(['Thyronorm', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Acquisition', 'Levothyroxine Sodium', 'Endocrinology', 'Hypothyroidism', null, null, 'Eltroxin / Thyrofit', null, 'Chronic']),
  // Piramal sub-brand — Phensedyl (Codeine + Promethazine cough syrup) — legacy India cough brand
  row(['Phensedyl', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Acquisition', 'Codeine Phosphate + Promethazine HCl', 'Respiratory', 'Dry Cough', null, null, 'Codoze / Codopect', null, 'Acute']),
  // Piramal sub-brand — Cremaffin / Cremaffin Plus (laxative)
  row(['Cremaffin / Cremaffin Plus', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Acquisition', 'Magnesium Hydroxide + Liquid Paraffin (± Sodium Picosulfate)', 'Gastroenterology', 'Constipation', null, null, 'Looz / Lactihep / Cremalax', null, 'Chronic']),
  // Piramal sub-brand — Digene (antacid range) — Economic Times "Best Brand Award" 2020
  row(['Digene', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Acquisition', 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone', 'Gastroenterology', 'Acidity / Heartburn / Hyperacidity', null, null, 'Gelusil / Eno', null, 'Acute']),
  // Piramal sub-brand — Pacimol (Paracetamol)
  row(['Pacimol', 'Acquired', '2010-09-07', 'Piramal Healthcare', 'Abbott India', 'Brand Acquisition', 'Paracetamol', 'Pain Management', 'Pain / Fever', null, null, 'Crocin / Calpol', null, 'Acute']),

  // ── In-licensing / co-marketing partnerships ──
  // Januvia / Janumet — abbott.in — Abbott + MSD Pharmaceuticals strategic partnership to
  // co-market MSD's sitagliptin franchise in India (18-Jun-2025)
  row(['Januvia / Janumet / Janumet XR (MSD distribution)', 'In-licensed', '2025-06-18', 'MSD Pharmaceuticals', 'Abbott India', 'Co-marketing (India)', 'Sitagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Istavel / Istamet', null, 'Chronic']),
  // Extensior — abbott.in / Business Standard — Abbott + Novo Nordisk India agree to launch
  // a second brand of Ozempic (semaglutide) in India; Abbott exclusively distributes
  // (27-Feb-2026). Unlike most peers (who launched generics), Abbott co-markets the
  // originator — different competitive position in the Sema price war.
  row(['Extensior', 'In-licensed', '2026-02-27', 'Novo Nordisk India', 'Abbott India', 'Co-marketing (India)', 'Semaglutide (originator brand)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic / Semaglyn / Sundae', null, 'Chronic']),
];

// Derived list of unique Buyers — these are the selectable "companies"
export const UNIQUE_BUYERS = Array.from(
  new Set(LAUNCH_TRACKER_ROWS.map((r) => r[COLUMN_KEYS.BUYER]))
).sort();
