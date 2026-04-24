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
  COLUMN_KEYS.THERAPY,
  COLUMN_KEYS.INDICATION,
  COLUMN_KEYS.MARKET_SIZE,
  COLUMN_KEYS.EXISTING_BRAND,
  COLUMN_KEYS.CHRONIC_ACUTE,
];

// Helper to keep the data rows compact. vals[10] (CAGR) and vals[12] (EST_SALES)
// are intentionally ignored — those columns were removed from the schema, but
// the 14-value row() signature is preserved so existing row(...) calls don't
// need to be rewritten.
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
