// Mock dataset for Drug Launch Tracker – India Pharma
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
  // Sun Pharma
  row(['Istamet XCite', 'Own Launched', '2024-02-12', '—', 'Sun Pharma', 'NCE Launch', 'Sitagliptin + Metformin + Dapagliflozin', 'Anti-Diabetic', 'Type 2 Diabetes', 1820, 11.5, 'Istamet', 58, 'Chronic']),
  row(['Volini Maxx', 'Own Launched', '2023-08-04', '—', 'Sun Pharma', 'Line Extension', 'Diclofenac + Linseed Oil', 'Pain Management', 'Musculoskeletal Pain', 960, 9.0, 'Volini', 42, 'Acute']),
  row(['Revelol AM', 'Own Launched', '2023-04-22', '—', 'Sun Pharma', 'Line Extension', 'Metoprolol + Amlodipine', 'Cardiology', 'Hypertension', 1540, 8.2, 'Revelol', 34, 'Chronic']),
  row(['Concizumab', 'In-licensed', '2024-06-18', 'Novo Nordisk', 'Sun Pharma', 'In-license (India)', 'Concizumab', 'Haematology', 'Haemophilia A/B', 420, 18.0, '—', 24, 'Chronic']),
  row(['Absorica LD', 'Acquired', '2022-11-10', 'Cipher Pharma', 'Sun Pharma', 'Asset Acquisition', 'Isotretinoin', 'Dermatology', 'Severe Acne', 280, 7.4, 'Isotroin', 18, 'Chronic']),
  row(['Winlevi', 'In-licensed', '2023-09-20', 'Cassiopea', 'Sun Pharma', 'In-license (India)', 'Clascoterone', 'Dermatology', 'Acne Vulgaris', 310, 14.5, '—', 22, 'Chronic']),

  // Dr. Reddy's
  row(["Sputnik V", 'In-licensed', '2021-05-14', 'RDIF (Gamaleya)', "Dr. Reddy's", 'In-license (India)', 'Gam-COVID-Vac', 'Vaccines', 'COVID-19', 1200, -5.0, '—', 8, 'Acute']),
  row(['Senshio', 'In-licensed', '2024-01-30', 'Shionogi', "Dr. Reddy's", 'In-license (India)', 'Ospemifene', "Women's Health", 'Dyspareunia (PMP)', 210, 16.0, '—', 9, 'Chronic']),
  row(['Toripalimab', 'In-licensed', '2023-10-05', 'Junshi Biosciences', "Dr. Reddy's", 'In-license (India)', 'Toripalimab', 'Oncology', 'NSCLC / Nasopharyngeal Ca', 620, 22.0, '—', 28, 'Chronic']),
  row(['Wockhardt Brands', 'Acquired', '2020-06-25', 'Wockhardt', "Dr. Reddy's", 'Brand Portfolio Acquisition', 'Various', 'Multi-therapy', 'Multi-indication', 1800, 6.5, 'Various', 140, 'Chronic']),
  row(['Rozucor Trio', 'Own Launched', '2023-12-14', '—', "Dr. Reddy's", 'Line Extension', 'Rosuvastatin + Aspirin + Clopidogrel', 'Cardiology', 'Secondary CV Prevention', 980, 10.5, 'Rozucor', 36, 'Chronic']),
  row(['Remdac', 'Own Launched', '2021-08-11', '—', "Dr. Reddy's", 'NCE Launch', 'Remdesivir', 'Anti-Infectives', 'COVID-19', 540, -3.0, 'Cipremi', 15, 'Acute']),

  // Cipla
  row(['Cipremi', 'Own Launched', '2020-07-20', '—', 'Cipla', 'NCE Launch', 'Remdesivir', 'Anti-Infectives', 'COVID-19', 540, -3.0, 'Remdac', 21, 'Acute']),
  row(['Ciplox Eye', 'Own Launched', '2022-03-04', '—', 'Cipla', 'Line Extension', 'Ciprofloxacin', 'Ophthalmology', 'Bacterial Conjunctivitis', 230, 7.8, 'Ciplox', 11, 'Acute']),
  row(['Foracort NEXThaler', 'Own Launched', '2023-05-16', '—', 'Cipla', 'Device Launch', 'Formoterol + Budesonide', 'Respiratory', 'Asthma / COPD', 1650, 11.2, 'Foracort', 72, 'Chronic']),
  row(['Actor Pharma Brands', 'Acquired', '2022-09-01', 'Actor Pharma', 'Cipla', 'Company Acquisition', 'Various OTC', 'Consumer Health', 'Multi-indication', 420, 13.0, 'Various', 38, 'Acute']),
  row(['Nocdurna', 'In-licensed', '2024-03-22', 'Ferring', 'Cipla', 'In-license (India)', 'Desmopressin', 'Urology', 'Nocturia', 160, 17.5, '—', 7, 'Chronic']),
  row(['Ivabrad', 'In-licensed', '2021-12-02', 'Servier', 'Cipla', 'In-license (India)', 'Ivabradine', 'Cardiology', 'Chronic Heart Failure', 380, 12.4, 'Ivabid', 19, 'Chronic']),

  // Lupin
  row(['Ondero', 'In-licensed', '2022-07-18', 'Boehringer Ingelheim', 'Lupin', 'Co-marketing', 'Linagliptin', 'Anti-Diabetic', 'Type 2 Diabetes', 1480, 10.8, 'Trajenta', 44, 'Chronic']),
  row(['Ajaduo', 'In-licensed', '2023-02-09', 'Boehringer Ingelheim', 'Lupin', 'Co-marketing', 'Empagliflozin + Linagliptin', 'Anti-Diabetic', 'Type 2 Diabetes', 720, 19.5, '—', 32, 'Chronic']),
  row(['Gavis Brands', 'Acquired', '2015-07-23', 'Gavis Pharma', 'Lupin', 'Company Acquisition', 'Various Generics', 'Multi-therapy', 'Multi-indication', 1100, 5.5, 'Various', 95, 'Chronic']),
  row(['Namzaric', 'In-licensed', '2024-04-11', 'Allergan', 'Lupin', 'In-license (India)', 'Memantine + Donepezil', 'Neurology / CNS', "Alzheimer's Disease", 290, 15.0, 'Admenta', 12, 'Chronic']),
  row(['Huminsulin R', 'Own Launched', '2022-10-05', '—', 'Lupin', 'NCE Launch', 'Human Insulin', 'Anti-Diabetic', 'Type 1 / Type 2 Diabetes', 860, 8.4, 'Huminsulin', 41, 'Chronic']),

  // Zydus Lifesciences
  row(['Lipaglyn', 'Own Launched', '2013-09-05', '—', 'Zydus Lifesciences', 'NCE Launch', 'Saroglitazar', 'Anti-Diabetic', 'Diabetic Dyslipidemia / NASH', 510, 14.2, '—', 66, 'Chronic']),
  row(['Ujvira', 'Own Launched', '2021-11-12', '—', 'Zydus Lifesciences', 'Biosimilar Launch', 'Trastuzumab Emtansine', 'Oncology', 'HER2+ Breast Cancer', 420, 20.0, 'Kadcyla', 29, 'Chronic']),
  row(['Sentynl Brands', 'Acquired', '2017-01-17', 'Sentynl Therapeutics', 'Zydus Lifesciences', 'Company Acquisition', 'Various Pain', 'Pain Management', 'Multi-indication', 540, 6.2, 'Various', 38, 'Acute']),
  row(['Vynfinity', 'In-licensed', '2023-07-14', 'Agenus', 'Zydus Lifesciences', 'In-license (India)', 'Balstilimab', 'Oncology', 'Cervical Cancer', 180, 23.5, '—', 6, 'Chronic']),
  row(['Exemptia', 'Own Launched', '2014-12-10', '—', 'Zydus Lifesciences', 'Biosimilar Launch', 'Adalimumab', 'Immunology', 'Rheumatoid Arthritis / Psoriasis', 620, 13.5, 'Humira', 54, 'Chronic']),

  // Torrent Pharma
  row(['Curatio Brands', 'Acquired', '2022-11-08', 'Curatio Healthcare', 'Torrent Pharma', 'Company Acquisition', 'Various Derma', 'Dermatology', 'Multi-indication', 520, 12.4, 'Various', 58, 'Chronic']),
  row(['Dahlia', 'Acquired', '2021-06-30', 'Elder Pharma', 'Torrent Pharma', 'Brand Acquisition', 'Drospirenone + Ethinyl Estradiol', "Women's Health", 'Contraception', 180, 8.8, '—', 14, 'Chronic']),
  row(['Shelcal XT Forte', 'Own Launched', '2023-03-15', '—', 'Torrent Pharma', 'Line Extension', 'Calcium + Vit D3 + K2-7', 'Nutraceuticals', 'Osteoporosis / Bone Health', 980, 10.0, 'Shelcal', 62, 'Chronic']),
  row(['Unichem Brands (India)', 'Acquired', '2017-11-29', 'Unichem Laboratories', 'Torrent Pharma', 'Brand Portfolio Acquisition', 'Various', 'Multi-therapy', 'Multi-indication', 1260, 7.2, 'Various', 120, 'Chronic']),

  // Glenmark
  row(['Remogliflozin', 'Own Launched', '2019-05-28', '—', 'Glenmark', 'NCE Launch', 'Remogliflozin', 'Anti-Diabetic', 'Type 2 Diabetes', 740, 17.0, '—', 48, 'Chronic']),
  row(['Akynzeo', 'In-licensed', '2022-08-22', 'Helsinn', 'Glenmark', 'In-license (India)', 'Netupitant + Palonosetron', 'Oncology Support', 'CINV', 220, 14.0, '—', 11, 'Acute']),
  row(['Ryaltris', 'Own Launched', '2021-04-09', '—', 'Glenmark', 'NCE Launch', 'Olopatadine + Mometasone', 'Respiratory', 'Allergic Rhinitis', 510, 13.2, 'Nasonex', 36, 'Chronic']),
  row(['Ichnos Sciences JV', 'In-licensed', '2023-01-18', 'Ichnos Sciences', 'Glenmark', 'In-license (India)', 'ISB 830', 'Immunology', 'Atopic Dermatitis', 160, 21.0, '—', 4, 'Chronic']),

  // Mankind Pharma — LIVE DATA (web-sourced from press releases / company filings)
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

  // Alkem
  row(['Enzar', 'Own Launched', '2022-04-19', '—', 'Alkem', 'NCE Launch', 'Bempedoic Acid', 'Cardiology', 'Dyslipidemia', 210, 19.0, '—', 9, 'Chronic']),
  row(['Pan 40', 'Own Launched', '2005-05-10', '—', 'Alkem', 'NCE Launch', 'Pantoprazole', 'Gastroenterology', 'GERD / Peptic Ulcer', 1640, 7.5, '—', 260, 'Chronic']),
  row(['Indchemie Brands', 'Acquired', '2021-12-22', 'Indchemie', 'Alkem', 'Brand Portfolio Acquisition', 'Various', 'Multi-therapy', 'Multi-indication', 540, 6.8, 'Various', 62, 'Chronic']),
  row(['Taxim-O Forte', 'Own Launched', '2017-10-02', '—', 'Alkem', 'Line Extension', 'Cefixime', 'Anti-Infectives', 'Respiratory / UTI Infections', 880, 9.8, 'Taxim-O', 102, 'Acute']),

  // Intas
  row(['Udibat', 'Own Launched', '2022-11-20', '—', 'Intas', 'Biosimilar Launch', 'Daratumumab', 'Oncology', 'Multiple Myeloma', 320, 22.0, 'Darzalex', 18, 'Chronic']),
  row(['Enbrel India', 'In-licensed', '2020-03-18', 'Pfizer', 'Intas', 'In-license (India)', 'Etanercept', 'Immunology', 'Rheumatoid Arthritis', 260, 11.0, 'Intacept', 12, 'Chronic']),
  row(['Celltrion Brands', 'Acquired', '2023-05-30', 'Celltrion Healthcare (India assets)', 'Intas', 'Brand Acquisition', 'Infliximab + Rituximab biosimilars', 'Immunology / Oncology', 'Multi-indication', 380, 15.5, 'Various', 22, 'Chronic']),

  // Aurobindo / Eugia
  row(['Cresemba', 'In-licensed', '2023-08-11', 'Pfizer', 'Aurobindo', 'In-license (India)', 'Isavuconazonium', 'Anti-Infectives', 'Invasive Aspergillosis', 130, 18.5, '—', 5, 'Acute']),
  row(['Sandoz Oral Solids (India share)', 'Acquired', '2018-09-06', 'Novartis (Sandoz)', 'Aurobindo', 'Asset Acquisition', 'Various Generics', 'Multi-therapy', 'Multi-indication', 1420, 5.2, 'Various', 110, 'Chronic']),
  row(['Eugia Steriles', 'Own Launched', '2022-06-15', '—', 'Aurobindo', 'NCE Launch', 'Various Injectables', 'Critical Care', 'Hospital Use', 620, 12.0, '—', 38, 'Acute']),

  // Abbott India
  row(['Mounjaro', 'In-licensed', '2024-10-02', 'Eli Lilly', 'Abbott India', 'In-license (India)', 'Tirzepatide', 'Anti-Diabetic', 'Type 2 Diabetes / Obesity', 1100, 28.0, 'Rybelsus', 46, 'Chronic']),
  row(['Udiliv', 'Own Launched', '2002-04-10', '—', 'Abbott India', 'NCE Launch', 'Ursodeoxycholic Acid', 'Gastroenterology', 'Cholestatic Liver Disease', 620, 10.5, '—', 165, 'Chronic']),
  row(['Thyronorm', 'Own Launched', '2005-06-21', '—', 'Abbott India', 'NCE Launch', 'Levothyroxine', 'Endocrinology', 'Hypothyroidism', 1480, 9.8, 'Eltroxin', 520, 'Chronic']),
  row(['Piramal OTC', 'Acquired', '2020-12-07', 'Piramal Healthcare', 'Abbott India', 'Brand Portfolio Acquisition', 'Various OTC', 'Consumer Health', 'Multi-indication', 740, 11.5, 'Various', 64, 'Acute']),

  // Corona Remedies — LIVE DATA (web-sourced; financial columns left null where not public)
  // Business Standard / CCI — Corona–GSK deal cleared Mar 7 2017 (Dilo-BM, Dilo-DX, Stelbid, Vitneurin)
  row(['GSK India Brand Portfolio', 'Acquired', '2017-03-07', 'GlaxoSmithKline India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Dextromethorphan / Dicyclomine / B-complex', 'Multi-therapy', 'Respiratory / GI / Nutraceuticals', null, null, 'Various', null, 'Chronic']),
  // Business Standard / The Week — Corona acquires Obimet & Thyrocab from Abbott India (3-Apr-2018)
  row(['Obimet + Thyrocab (Abbott)', 'Acquired', '2018-04-03', 'Abbott India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Metformin + Levothyroxine range', 'Anti-Diabetic / Endocrinology', 'Type 2 Diabetes / Hypothyroidism', null, null, 'Glycomet / Thyronorm', null, 'Chronic']),
  // Business Standard press release / BioSpectrum (9-May-2023)
  row(['Ferring Maternal Health & Urology Portfolio', 'In-licensed', '2023-05-09', 'Ferring Pharmaceuticals', 'Corona Remedies', 'In-license (India)', 'Various (Gonadotropins, OAB, ED)', "Women's Health / Urology", 'Maternal Health / Overactive Bladder / ED', null, null, '—', null, 'Chronic']),
  // BioSpectrum / ET "Corona Remedies buys Myoril from Sanofi for ₹234 Cr" (28-Jun-2023)
  row(['Myoril', 'Acquired', '2023-06-28', 'Sanofi India', 'Corona Remedies', 'Brand Acquisition', 'Thiocolchicoside', 'Pain Management', 'Muscular Spasm / Back Pain', null, null, '—', null, 'Acute']),
  // Business Standard "Corona Remedies acquires 7 brands from Bayer India" (effective 16-Jul-2025)
  row(['Noklot (Bayer)', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Acquisition', 'Clopidogrel', 'Cardiology', 'Anti-platelet / Secondary CV Prevention', null, null, 'Clopilet / Deplatt', null, 'Chronic']),
  row(['Bayer Women’s Health Portfolio (6 brands)', 'Acquired', '2025-07-16', 'Bayer India', 'Corona Remedies', 'Brand Portfolio Acquisition', 'Gonadotropins + Progesterone (Fostine, Luprofact, Menodac, Ovidac, Spye, Vageston)', "Women's Health", 'Infertility / Pregnancy Management', null, null, 'Various', null, 'Chronic']),
];

// Derived list of unique Buyers — these are the selectable "companies"
export const UNIQUE_BUYERS = Array.from(
  new Set(LAUNCH_TRACKER_ROWS.map((r) => r[COLUMN_KEYS.BUYER]))
).sort();
