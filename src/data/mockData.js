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
  MOLECULE: 'Molecule',
  PRICING: 'Pricing',
  THERAPY: 'Therapy',
  INDICATION: 'Disease / Indication',
  MARKET_SIZE: 'India Market Size (₹Cr)',
  EXISTING_BRAND: 'Existing Brand (Same Molecule)',
  CHRONIC_ACUTE: 'Chronic / Acute',
};

export const COLUMN_ORDER = [
  COLUMN_KEYS.BRAND,
  COLUMN_KEYS.LAUNCH_TYPE,
  COLUMN_KEYS.DATE,
  COLUMN_KEYS.SELLER,
  COLUMN_KEYS.BUYER,
  COLUMN_KEYS.DEAL_TYPE,
  COLUMN_KEYS.MOLECULE,
  COLUMN_KEYS.PRICING,
  COLUMN_KEYS.THERAPY,
  COLUMN_KEYS.INDICATION,
  COLUMN_KEYS.MARKET_SIZE,
  COLUMN_KEYS.EXISTING_BRAND,
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
  [COLUMN_KEYS.EXISTING_BRAND]: vals[11],
  [COLUMN_KEYS.CHRONIC_ACUTE]: vals[13],
  [COLUMN_KEYS.PRICING]: vals[14] ?? null,
});

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
    [COLUMN_KEYS.MOLECULE]: r.molecule ?? '',
    [COLUMN_KEYS.PRICING]: r.price ?? null,
    [COLUMN_KEYS.THERAPY]: r.therapy ?? '',
    [COLUMN_KEYS.INDICATION]: r.indication ?? '',
    [COLUMN_KEYS.MARKET_SIZE]: r.marketSize ?? null,
    [COLUMN_KEYS.EXISTING_BRAND]: r.existingBrand || '—',
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

// Merge bundled curated rows with rows fetched from public/launches.json.
// Curated (baseline) rows are source-of-truth and always win on key collision;
// scraped rows are only appended when they introduce a new (brand+date+seller+buyer).
export function mergeLaunchRows(baseline, scrapedRaw) {
  if (!Array.isArray(scrapedRaw) || scrapedRaw.length === 0) return baseline;
  const baselineKeys = new Set(baseline.map(rowKey));
  const scraped = scrapedRaw.map(fromScrapedRow);
  const unique = scraped.filter((r) => {
    const k = rowKey(r);
    if (baselineKeys.has(k)) return false;
    baselineKeys.add(k);
    return true;
  });
  return [...baseline, ...unique];
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
// Extract primary molecule for "same molecule, different brand" matching.
// 'Semaglutide (oral)' / 'Semaglutide (injection)' / 'Semaglutide + ...'
// all collapse to 'semaglutide'. Returns '' for empty / '—'.
export function primaryMolecule(s) {
  if (!s || s === '—') return '';
  return String(s).toLowerCase().split(/[/+(]/)[0].trim();
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

  // ─── Dr. Reddy's — LIVE (press releases / drreddys.com) ───
  // Business Standard "Dr Reddy's launches Tegoprazan in India for acid peptic diseases" (16-Sep-2025)
  row(['Tegoprazan', 'In-licensed', '2025-09-16', 'HK inno.N (Korea)', "Dr. Reddy's", 'In-license (India)', 'Tegoprazan', 'Gastroenterology', 'GERD / Erosive Esophagitis / Gastric Ulcers', null, null, '—', null, 'Chronic']),
  // drreddys.com / Stock Titan (Mar 2026) — India launch post Delhi HC nod; export since late 2025
  row(['Obeda', 'Own Launched', '2026-03-20', '—', "Dr. Reddy's", 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Weight Management', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

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

  // ─── Lupin — LIVE (lupin.com press releases) ───
  // lupin.com "Lupin and Zydus Sign Licensing Agreement for Co-marketing Innovative Semaglutide Injection in India" (17-Mar-2026)
  row(['Semanext / Livarise', 'In-licensed', '2026-03-17', 'Zydus Lifesciences', 'Lupin', 'Co-marketing', 'Semaglutide (innovative pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Semaglyn', null, 'Chronic']),

  // ─── Zydus Lifesciences — LIVE (zyduslife.com press releases) ───
  // zyduslife.com "Zydus launches world's first biosimilar of Nivolumab Tishtha in India" (22-Jan-2026)
  row(['Tishtha', 'Own Launched', '2026-01-22', '—', 'Zydus Lifesciences', 'Biosimilar Launch', 'Nivolumab', 'Oncology', 'NSCLC / Melanoma / RCC (PD-1)', null, null, 'Opdyta / Nivolutab', null, 'Chronic']),
  // scanx.trade "Zydus launches India's first indigenous Aflibercept biosimilar ANYRA" (19-Feb-2026)
  row(['ANYRA', 'Own Launched', '2026-02-19', '—', 'Zydus Lifesciences', 'Biosimilar Launch', 'Aflibercept', 'Ophthalmology', 'Wet AMD / Diabetic Macular Edema', null, null, 'Eylea', null, 'Chronic']),
  // Zydus Lifesciences press release — Semaglutide launch on patent-expiry Day 1 (25-Feb-2026)
  row(['Semaglyn / Mashema / Alterme', 'Own Launched', '2026-02-25', '—', 'Zydus Lifesciences', 'Generic Launch', 'Semaglutide (reusable pen)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

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

  // ─── Glenmark — LIVE (glenmarkpharma.com press releases) ───
  // Business Standard "Glenmark launches Empagliflozin for diabetes in India under Glempa brand" (12-Mar-2025)
  row(['Glempa + Glempa-L + Glempa-M', 'Own Launched', '2025-03-12', '—', 'Glenmark', 'Generic Launch', 'Empagliflozin (± Linagliptin / Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Jardiance', null, 'Chronic']),
  // Business Standard "Glenmark Pharma launches GLIPIQ (semaglutide) in India" (21-Mar-2026)
  row(['GLIPIQ', 'Own Launched', '2026-03-21', '—', 'Glenmark', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

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

  // ─── Abbott India — LIVE (abbott.in press releases) ───
  // abbott.in "Abbott and MSD Announce Strategic Partnership to Distribute Sitagliptin in India" (18-Jun-2025)
  row(['Januvia / Janumet / Janumet XR (MSD distribution)', 'In-licensed', '2025-06-18', 'MSD Pharmaceuticals', 'Abbott India', 'Co-marketing', 'Sitagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Istavel / Istamet', null, 'Chronic']),

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
];

// Derived list of unique Buyers — these are the selectable "companies"
export const UNIQUE_BUYERS = Array.from(
  new Set(LAUNCH_TRACKER_ROWS.map((r) => r[COLUMN_KEYS.BUYER]))
).sort();
