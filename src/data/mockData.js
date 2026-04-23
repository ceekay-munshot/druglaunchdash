// Drug Launch Tracker – India Pharma — LIVE CURATED DATASET
// All rows below are web-sourced from company press releases, BSE/NSE
// filings, and news coverage (Business Standard, BioSpectrum, Medical
// Dialogues, etc.). Source URL/headline cited inline above each row.
// Focus: recent (2025-2026) India drug launches, acquisitions, and
// in-licensing deals. Older rows retained only where independently verified.
//
// Financial columns (Market Size ₹Cr, Market CAGR %, Est. Annual Sales ₹Cr)
// are paywalled (IQVIA SMSRC / PharmaTrac / AIOCD AWACS) and intentionally
// left null. Table shows "—"; KPIs auto-skip nulls in their aggregations.
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
  THERAPY: 'Therapy',
  INDICATION: 'Disease / Indication',
  MARKET_SIZE: 'India Market Size (₹Cr)',
  CAGR: 'Market CAGR %',
  EXISTING_BRAND: 'Existing Brand (Same Molecule)',
  EST_SALES: 'Est. Annual Sales (₹Cr)',
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
  COLUMN_KEYS.THERAPY,
  COLUMN_KEYS.INDICATION,
  COLUMN_KEYS.MARKET_SIZE,
  COLUMN_KEYS.CAGR,
  COLUMN_KEYS.EXISTING_BRAND,
  COLUMN_KEYS.EST_SALES,
  COLUMN_KEYS.CHRONIC_ACUTE,
];

// Helper to keep the data rows compact but strictly schema-faithful
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
  [COLUMN_KEYS.CAGR]: vals[10],
  [COLUMN_KEYS.EXISTING_BRAND]: vals[11],
  [COLUMN_KEYS.EST_SALES]: vals[12],
  [COLUMN_KEYS.CHRONIC_ACUTE]: vals[13],
});

export const LAUNCH_TRACKER_ROWS = [
  // ─── Sun Pharma — LIVE (press releases / sunpharma.com) ───
  // sunpharma.com "Sun Pharma introduces Fexuclue (Fexuprazan) in India" (07-Apr-2025)
  row(['Fexuclue', 'In-licensed', '2025-04-07', 'Daewoong Pharmaceutical', 'Sun Pharma', 'In-license (India)', 'Fexuprazan', 'Gastroenterology', 'Erosive Esophagitis / GERD', null, null, '—', null, 'Chronic']),
  // sunpharma.com "Sun Pharma introduces its global innovative drug Ilumya in India" (01-Dec-2025)
  row(['Ilumya', 'Own Launched', '2025-12-01', '—', 'Sun Pharma', 'NCE Launch', 'Tildrakizumab', 'Dermatology', 'Moderate-Severe Plaque Psoriasis', null, null, '—', null, 'Chronic']),
  // BusinessToday (19-Mar-2026) — Sun Pharma launches generic semaglutide in India on patent-expiry Day 1
  row(['Noveltreat / Sematrinity', 'Own Launched', '2026-03-20', '—', 'Sun Pharma', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Wegovy', null, 'Chronic']),

  // ─── Dr. Reddy's — LIVE (press releases / drreddys.com) ───
  // Business Standard "Dr Reddy's launches Tegoprazan in India for acid peptic diseases" (16-Sep-2025)
  row(['Tegoprazan', 'In-licensed', '2025-09-16', 'HK inno.N (Korea)', "Dr. Reddy's", 'In-license (India)', 'Tegoprazan', 'Gastroenterology', 'GERD / Erosive Esophagitis / Gastric Ulcers', null, null, '—', null, 'Chronic']),
  // drreddys.com / Stock Titan (Mar 2026) — India launch post Delhi HC nod; export since late 2025
  row(['Obeda', 'Own Launched', '2026-03-20', '—', "Dr. Reddy's", 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Weight Management', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ─── Cipla — LIVE (cipla.com press releases) ───
  // cipla.com "Cipla Launches India's Only Inhaled Insulin, Afrezza" (22-Dec-2025)
  row(['Afrezza', 'In-licensed', '2025-12-22', 'MannKind Corporation', 'Cipla', 'In-license (India)', 'Insulin Human (inhaled)', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', null, null, 'Huminsulin', null, 'Chronic']),

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

  // ─── Torrent Pharma — LIVE (scanx.trade / Medical Dialogues) ───
  // Torrent is first Indian company to launch ORAL semaglutide post-patent-expiry (Mar-2026)
  row(['Sembolic', 'Own Launched', '2026-03-20', '—', 'Torrent Pharma', 'Generic Launch', 'Semaglutide (oral)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Rybelsus', null, 'Chronic']),
  row(['Semalix', 'Own Launched', '2026-03-20', '—', 'Torrent Pharma', 'Generic Launch', 'Semaglutide (injectable)', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Ozempic', null, 'Chronic']),

  // ─── Glenmark — LIVE (glenmarkpharma.com press releases) ───
  // Business Standard "Glenmark launches Empagliflozin for diabetes in India under Glempa brand" (12-Mar-2025)
  row(['Glempa + Glempa-L + Glempa-M', 'Own Launched', '2025-03-12', '—', 'Glenmark', 'Generic Launch', 'Empagliflozin (± Linagliptin / Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Jardiance', null, 'Chronic']),
  // Business Standard "Glenmark Pharma launches GLIPIQ (semaglutide) in India" (21-Mar-2026)
  row(['GLIPIQ', 'Own Launched', '2026-03-21', '—', 'Glenmark', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ─── Alkem Laboratories — LIVE (BSE filings / bseindia.com) ───
  // Business Standard "Alkem launches pertuzumab biosimilar for breast cancer in India" (22-Sep-2025)
  row(['Pertuza', 'Own Launched', '2025-09-22', '—', 'Alkem', 'Biosimilar Launch', 'Pertuzumab', 'Oncology', 'HER2+ Breast Cancer', null, null, 'Perjeta', null, 'Chronic']),
  // BSE filing / scanx "Alkem Laboratories Launches Semaglutide Injection" (21-Mar-2026) — brands Semasize / Obesema / Hepaglide
  row(['Semasize / Obesema / Hepaglide', 'Own Launched', '2026-03-21', '—', 'Alkem', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Ozempic', null, 'Chronic']),

  // ─── Intas Pharmaceuticals — LIVE (Bio-Thera / press releases) ───
  // PRNewswire / BioSpace "Bio-Thera expands partnership with Intas for BAT2506 Golimumab biosimilar in India" (23-Mar-2026)
  row(['BAT2506 (Golimumab biosimilar)', 'In-licensed', '2026-03-23', 'Bio-Thera Solutions', 'Intas', 'In-license (India)', 'Golimumab', 'Immunology', 'Psoriatic Arthritis / Ankylosing Spondylitis / UC', null, null, 'Simponi', null, 'Chronic']),

  // ─── Aurobindo Pharma — LIVE (BSE filings) ───
  // Business Standard / Pharmatutor "Aurobindo Pharma arm acquires Khandelwal Labs non-oncology business for Rs 325 Cr" (effective 01-Jan-2026)
  row(['Khandelwal Non-Oncology Brands', 'Acquired', '2026-01-01', 'Khandelwal Laboratories', 'Aurobindo', 'Brand Portfolio Acquisition', 'Various (23 brands / 67 SKUs)', 'Multi-therapy', 'Multi-indication (non-oncology)', null, null, 'Various', null, 'Chronic']),

  // ─── Abbott India — LIVE (abbott.in press releases) ───
  // abbott.in "Abbott and MSD Announce Strategic Partnership to Distribute Sitagliptin in India" (18-Jun-2025)
  row(['Januvia / Janumet / Janumet XR (MSD distribution)', 'In-licensed', '2025-06-18', 'MSD Pharmaceuticals', 'Abbott India', 'Co-marketing', 'Sitagliptin (± Metformin)', 'Anti-Diabetic', 'Type 2 Diabetes', null, null, 'Istavel / Istamet', null, 'Chronic']),

  // ─── Mankind Pharma — LIVE DATA (web-sourced from press releases / company filings) ───
  // Financial columns (Market Size ₹Cr, CAGR %, Est. Annual Sales ₹Cr) are paywalled
  // (IQVIA / PharmaTrac / AIOCD AWACS) and are intentionally left null. Table will
  // show "—" for these fields; KPIs auto-skip nulls in their aggregations.
  // Sources cited inline above each row.
  // mankindpharma.com press release "Mankind Pharma Completes Landmark Acquisition of BSV"
  row(['Bharat Serums & Vaccines', 'Acquired', '2024-10-23', 'Advent International', 'Mankind Pharma', 'Company Acquisition', 'Various Biologics / Recombinants', "Women's Health / Critical Care", 'Fertility, Critical Care, Immunoglobulins', null, null, 'Various', null, 'Chronic']),
  // mankindpharma.com / Business Standard "Mankind Pharma inks pact with Innovent for immunotherapy drug" (26-Dec-2024)
  row(['Sintilimab', 'In-licensed', '2024-12-26', 'Innovent Biologics', 'Mankind Pharma', 'In-license (India)', 'Sintilimab', 'Oncology', 'Solid Tumours (PD-1 immunotherapy)', null, null, '—', null, 'Chronic']),
  // Business Standard "Mankind Pharma signs non-exclusive patent license agreement with Takeda" (16-Jul-2024)
  row(['Vonoprazan (Takeda licence)', 'In-licensed', '2024-07-16', 'Takeda', 'Mankind Pharma', 'In-license (India)', 'Vonoprazan', 'Gastroenterology', 'GERD / Erosive Esophagitis', null, null, '—', null, 'Chronic']),
  // astrazeneca.in press release / Business Standard (11-Mar-2024) — 5-yr exclusive distribution
  row(['Symbicort (India distribution)', 'In-licensed', '2024-03-11', 'AstraZeneca', 'Mankind Pharma', 'Co-marketing', 'Budesonide + Formoterol', 'Respiratory', 'Asthma / COPD', null, null, 'Foracort', null, 'Chronic']),
  // GlobeNewswire / Business Standard "Mankind Pharma inks licencing pact with Actimed for cachexia" (21-Nov-2025)
  row(['ACM-001.1 (S-pindolol)', 'In-licensed', '2025-11-21', 'Actimed Therapeutics', 'Mankind Pharma', 'In-license (India)', 'S-pindolol benzoate', 'Oncology Support', 'Cancer Cachexia', null, null, '—', null, 'Chronic']),
  // Business Standard "Mankind Pharma shares gain 3% on acquiring Rivotril brand rights from Roche" (18-Mar-2026)
  row(['Rivotril', 'Acquired', '2026-03-18', 'Roche', 'Mankind Pharma', 'Brand Acquisition', 'Clonazepam', 'Neurology / CNS', 'Epilepsy / Panic Disorder', null, null, '—', null, 'Chronic']),
  // BusinessToday / Medical Dialogues — Samakind (generic semaglutide) launch on patent-expiry Day 1 (20-Mar-2026)
  row(['Samakind', 'Own Launched', '2026-03-20', '—', 'Mankind Pharma', 'Generic Launch', 'Semaglutide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', null, null, 'Rybelsus / Wegovy', null, 'Chronic']),
  // Business Today / Panacea Biotec disclosure — definitive agreement Feb 2022; closing Mar-2022
  row(['Panacea Biotec Domestic Brands', 'Acquired', '2022-03-01', 'Panacea Biotec', 'Mankind Pharma', 'Brand Portfolio Acquisition', 'Various (Lifestyle / Oncology / Transplant)', 'Multi-therapy', 'Multi-indication', null, null, 'Various', null, 'Chronic']),

  // Corona Remedies — LIVE DATA (web-sourced; financial columns left null where not public)
  // Business Standard / CCI — Corona–GSK deal cleared Mar 7 2017 (Dilo-BM, Dilo-DX, Stelbid, Vitneurin)
  row(['GSK India Brand Portfolio', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Terbutaline+Guaiphenesin+Ambroxol (Dilo) / Trifluoperazine+Isopropamide (Stelbid) / Methylcobalamin (Vitneurin)', 'Multi-therapy', 'Respiratory / GI Spasm / Neuro-nutraceutical', null, null, 'Various', null, 'Chronic']),
  // Business Standard / The Week — Corona acquires Obimet & Thyrocab from Abbott India (3-Apr-2018)
  row(['Obimet + Thyrocab (Abbott)', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Metformin + Levothyroxine range', 'Anti-Diabetic / Endocrinology', 'Type 2 Diabetes / Hypothyroidism', null, null, 'Glycomet / Thyronorm', null, 'Chronic']),
  // Business Standard press release / BioSpectrum (9-May-2023)
  row(['Ferring Maternal Health & Urology Portfolio', 'In-licensed', '2023-05-09', 'Ferring Pharmaceuticals', 'Corona Remedies', 'In-license (India)', 'Various (Gonadotropins, OAB, ED)', "Women's Health / Urology", 'Maternal Health / Overactive Bladder / ED', null, null, '—', null, 'Chronic']),
  // BioSpectrum / ET "Corona Remedies buys Myoril from Sanofi for ₹234 Cr" (28-Jun-2023)
  row(['Myoril', 'Acquired', '2023-06-28', 'Sanofi India', 'Corona Remedies', 'Brand Acquisition', 'Thiocolchicoside', 'Pain Management', 'Muscular Spasm / Back Pain', null, null, '—', null, 'Acute']),
  // Business Standard "Corona Remedies acquires 7 brands from Bayer India" (effective 16-Jul-2025)
  row(['Noklot (Bayer)', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Clopidogrel', 'Cardiology', 'Anti-platelet / Secondary CV Prevention', null, null, 'Clopilet / Deplatt', null, 'Chronic']),
  row(['Bayer Women’s Health Portfolio (6 brands)', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Gonadotropins + Progesterone (Fostine, Luprofact, Menodac, Ovidac, Spye, Vageston)', "Women's Health", 'Infertility / Pregnancy Management', null, null, 'Various', null, 'Chronic']),
  // Business Standard / Medical Dialogues "Corona Remedies acquires Wokadine from Dr Reddy's" (30-Mar-2026); #2 in ₹648 Cr povidone iodine market
  row(['Wokadine', 'Acquired', '2026-03-30', "Dr. Reddy's Laboratories", 'Corona Remedies', 'Brand Acquisition', 'Povidone Iodine', 'Anti-Infectives', 'Topical Antiseptic', 648, null, 'Betadine', null, 'Acute']),
];

// Derived list of unique Buyers — these are the selectable "companies"
export const UNIQUE_BUYERS = Array.from(
  new Set(LAUNCH_TRACKER_ROWS.map((r) => r[COLUMN_KEYS.BUYER]))
).sort();
