// ────────────────────────────────────────────────────────────────────────────
// IPM Insights — static snapshot from IIFL Capital Services research.
//
// Sources:
//   • "Comparative analysis of India Formulations businesses FY22-26"
//     IIFL Capital Services, 30-Apr-2026 (Rahul Jeewani et al.)
//   • "Comparative analysis of India Formulations businesses FY23-25"
//     IIFL Capital Services, 23-Apr-2025
//
// Data here is NOT updated by the scraper — it is a curated extraction
// from the two IIFL reports baked into the codebase. The IPM Insights tab
// displays this data with full provenance attribution; users see a "Data
// as of 30-Apr-2026 · IIFL" footer so the staleness is explicit.
// ────────────────────────────────────────────────────────────────────────────

export const IPM_REPORT_META = {
  primarySource:
    'IIFL Capital Services — Comparative analysis of India Formulations businesses (FY22-FY26)',
  reportDate: '2026-04-30',
  authors: 'Rahul Jeewani, Naman Bagrecha, Aman Goyal, Vighnesh Indure',
  periodCovered: 'FY22-FY26',
  // The India Pharma Market data is a PERIODIC snapshot — the AIOCD AWACS
  // audit publishes on a fixed date each month; the latest cut here is the
  // FY26 year-end (Apr-2026) release. It is "data as of [date]", refreshed
  // on the monthly AWACS cycle — it is not stale, and is not meant to update
  // daily the way the launch scraper does.
  asOf: 'FY26 · year ending Mar-2026',
  cadence: 'Monthly — AIOCD AWACS release cycle',
  basis:
    'India Pharma Market figures are from the AIOCD AWACS audit, as analysed in IIFL Capital Services research.',
};

// ── IPM headline numbers ────────────────────────────────────────────────────
// Pulled from IIFL Figure 6, 9 (newer report).
export const IPM_HEADLINE = {
  // Market size
  sizeFY26Cr: 245943,        // Rs Cr — ~Rs 2,459 bn / ~Rs 2.46 lakh cr
  // Growth
  fy26GrowthYoY: 10,         // % — FY26 ~10% YoY (acceleration)
  fy22_26Cagr: 8.5,          // % — 4-year Cagr
  fy22_25Cagr: 7.9,          // % — pre-FY26 baseline
  // FY22-25 growth decomposition
  fy22_25_volumeCagr: 0.7,
  fy22_25_priceCagr: 4.6,
  fy22_25_newLaunchCagr: 2.6,
  // FY26 YoY shift — volume picks up, price moderates
  fy26_volumeYoY: 2.7,
  fy26_priceYoY: 4.4,
  fy26_newLaunchYoY: 2.8,
  // Chronic / Sub-Chronic / Acute mix (FY26)
  acuteShareFY26: 43.8,
  chronicShareFY26: 35.3,
  subChronicShareFY26: 20.9,
  // Segment Cagrs FY22-26
  acuteCagrFY22_26: 6.7,
  chronicCagrFY22_26: 10.1,
  subChronicCagrFY22_26: 9.8,
  chronicYoYFY26: 13.7,
  acuteYoYFY26: 7.6,
};

// ── Therapy area sales + Cagrs (IIFL Figure 10) ─────────────────────────────
// 19 therapy areas with the full FY22→FY26 sales series (Rs Cr), so the
// dashboard can show real year-on-year growth, not just a 4-year Cagr.
// contFY26 = % of total IPM in FY26; cagrFY22_26 = 4-year Cagr.
export const THERAPY_AREAS = [
  { name: 'Cardiac',           salesByYear: { fy22: 22634, fy23: 24595, fy24: 27173, fy25: 30074, fy26: 34297 }, salesFY26Cr: 34297, contFY26: 13.9, cagrFY22_26: 10.9, segment: 'Chronic' },
  { name: 'Gastro Intestinal', salesByYear: { fy22: 20825, fy23: 22980, fy24: 25078, fy25: 27759, fy26: 28894 }, salesFY26Cr: 28894, contFY26: 11.7, cagrFY22_26: 8.5,  segment: 'Sub-Chronic' },
  { name: 'Anti-Infectives',   salesByYear: { fy22: 24671, fy23: 23637, fy24: 24914, fy25: 26407, fy26: 27821 }, salesFY26Cr: 27821, contFY26: 11.3, cagrFY22_26: 3.1,  segment: 'Acute' },
  { name: 'Anti-Diabetic',     salesByYear: { fy22: 16842, fy23: 17700, fy24: 19029, fy25: 20706, fy26: 23051 }, salesFY26Cr: 23051, contFY26: 9.4,  cagrFY22_26: 8.2,  segment: 'Chronic' },
  { name: 'VMN',               salesByYear: { fy22: 16298, fy23: 17649, fy24: 19055, fy25: 20444, fy26: 21845 }, salesFY26Cr: 21845, contFY26: 8.9,  cagrFY22_26: 7.6,  segment: 'Acute' },
  { name: 'Respiratory',       salesByYear: { fy22: 14713, fy23: 15979, fy24: 16874, fy25: 17330, fy26: 19270 }, salesFY26Cr: 19270, contFY26: 7.8,  cagrFY22_26: 7.0,  segment: 'Chronic' },
  { name: 'Pain / Analgesics', salesByYear: { fy22: 11796, fy23: 13192, fy24: 14540, fy25: 15735, fy26: 16757 }, salesFY26Cr: 16757, contFY26: 6.8,  cagrFY22_26: 9.2,  segment: 'Acute' },
  { name: 'Neuro / CNS',       salesByYear: { fy22: 11095, fy23: 12509, fy24: 13768, fy25: 15059, fy26: 16580 }, salesFY26Cr: 16580, contFY26: 6.7,  cagrFY22_26: 10.6, segment: 'Chronic' },
  { name: 'Derma',             salesByYear: { fy22: 10806, fy23: 12117, fy24: 13281, fy25: 14810, fy26: 15923 }, salesFY26Cr: 15923, contFY26: 6.5,  cagrFY22_26: 10.2, segment: 'Sub-Chronic' },
  { name: 'Gynaecological',    salesByYear: { fy22: 5180,  fy23: 6324,  fy24: 6956,  fy25: 7232,  fy26: 7781 },  salesFY26Cr: 7781,  contFY26: 3.2,  cagrFY22_26: 10.7, segment: 'Sub-Chronic' },
  { name: 'Blood Related',     salesByYear: { fy22: 5090,  fy23: 5611,  fy24: 6256,  fy25: 6774,  fy26: 7260 },  salesFY26Cr: 7260,  contFY26: 3.0,  cagrFY22_26: 9.3,  segment: 'Sub-Chronic' },
  { name: 'Anti-Neoplastics',  salesByYear: { fy22: 3430,  fy23: 4494,  fy24: 4720,  fy25: 5341,  fy26: 5810 },  salesFY26Cr: 5810,  contFY26: 2.4,  cagrFY22_26: 14.1, segment: 'Chronic' },
  { name: 'Ophthal',           salesByYear: { fy22: 3102,  fy23: 3710,  fy24: 4124,  fy25: 4273,  fy26: 4538 },  salesFY26Cr: 4538,  contFY26: 1.8,  cagrFY22_26: 10.0, segment: 'Sub-Chronic' },
  { name: 'Urology',           salesByYear: { fy22: 2655,  fy23: 2995,  fy24: 3334,  fy25: 3839,  fy26: 4424 },  salesFY26Cr: 4424,  contFY26: 1.8,  cagrFY22_26: 13.6, segment: 'Chronic' },
  { name: 'Hormones',          salesByYear: { fy22: 2864,  fy23: 3037,  fy24: 3332,  fy25: 3682,  fy26: 3933 },  salesFY26Cr: 3933,  contFY26: 1.6,  cagrFY22_26: 8.3,  segment: 'Sub-Chronic' },
  { name: 'Vaccines',          salesByYear: { fy22: 1748,  fy23: 1700,  fy24: 1912,  fy25: 2027,  fy26: 2434 },  salesFY26Cr: 2434,  contFY26: 1.0,  cagrFY22_26: 8.6,  segment: 'Acute' },
  { name: 'Stomatologicals',   salesByYear: { fy22: 1150,  fy23: 1280,  fy24: 1423,  fy25: 1560,  fy26: 1696 },  salesFY26Cr: 1696,  contFY26: 0.7,  cagrFY22_26: 10.2, segment: 'Acute' },
  { name: 'Sex Stimulants',    salesByYear: { fy22: 833,   fy23: 1014,  fy24: 1100,  fy25: 1235,  fy26: 1294 },  salesFY26Cr: 1294,  contFY26: 0.5,  cagrFY22_26: 11.6, segment: 'Acute' },
  { name: 'Anti Malarials',    salesByYear: { fy22: 620,   fy23: 531,   fy24: 595,   fy25: 642,   fy26: 654 },   salesFY26Cr: 654,   contFY26: 0.3,  cagrFY22_26: 1.4,  segment: 'Acute' },
];

// Maps Launch-Tracker therapy strings (the dataset's COLUMN_KEYS.THERAPY values)
// onto IPM therapy-area names so the two datasets can be compared. The
// comparison component splits compound strings like "Gastroenterology /
// Hepatology" on " / " and looks up the first (primary) token here.
// Launch-tracker therapies with no clean IPM equivalent (Nephrology,
// Immunology, Rheumatology, Multi-therapy, …) are intentionally absent —
// they simply won't get an IPM comparison row.
export const LAUNCH_TO_IPM_THERAPY = {
  'Cardiology': 'Cardiac',
  'Anti-Diabetic': 'Anti-Diabetic',
  'Gastroenterology': 'Gastro Intestinal',
  'Anti-Infectives': 'Anti-Infectives',
  'Anti-TB': 'Anti-Infectives',
  'Respiratory': 'Respiratory',
  'Neurology': 'Neuro / CNS',
  'Dermatology': 'Derma',
  'Pain Management': 'Pain / Analgesics',
  'Oncology': 'Anti-Neoplastics',
  "Women's Health": 'Gynaecological',
  'Ophthalmology': 'Ophthal',
  'Urology': 'Urology',
  'Vaccines': 'Vaccines',
  'Endocrinology': 'Hormones',
  'Nutraceuticals': 'VMN',
};

// ── Per-company scorecard (IIFL Figures 1, 3, 4, 5) ─────────────────────────
// 21 distinct entries — note Torrent appears twice as IIFL tracks the standalone
// Torrent Pharma figures AND the merged Torrent+JB Pharma entity separately.
// `compositeFY22_26` is the equal-weighted score across 16 metrics (0-100).
// `compositeFY23_25` is from the previous IIFL report (Apr-2025) — used as
// the YoY rank-movement reference; null where not directly comparable
// (e.g. Torrent+JB merged entity didn't exist in FY23-25).
export const COMPANIES = [
  {
    name: 'Sun Pharma', short: 'Sun', ipmRankFY26: 1, compositeFY22_26: 88, compositeFY23_25: 86,
    valueMSFY22: 7.7, valueMSFY26: 8.4, msGainBps: 78,
    chronicMixFY26: 46, subChronicMixFY26: 16, chronicSubMixFY26: 62,
    chronicSubMSFY22: 8.6, chronicSubMSFY26: 9.4, chronicSubMSGainBps: 72, chronicSubOutperfBps: 221,
    salesCagrFY22_26: 11.2, outperfVsIpmBps: 267,
    volCagrFY22_26: 2.8, priceNICagrFY22_26: 8.4, volContPct: 25,
    chronicSubRevCagr: 12.2,
    top25CagrFY22_26: 11, top25ContribFY26: 41, brandsOver1bn: 45,
    nlemExposurePct: 11,
    mrCountFY26: 15109, indiaSalesFY26Cr: 191730,
    pcpmFY23: 8.9, pcpmFY26: 10.6, pcpm3YrCagr: 5.8,
    salesCagrOrganicFY20_26: 12.0, salesCagrOrganicFY26_28ii: 11.7,
  },
  {
    name: 'Cipla', short: 'Cipla', ipmRankFY26: 2, compositeFY22_26: 70, compositeFY23_25: 51,
    valueMSFY22: 5.9, valueMSFY26: 5.9, msGainBps: -5,
    chronicMixFY26: 53, subChronicMixFY26: 10, chronicSubMixFY26: 62,
    chronicSubMSFY22: 6.4, chronicSubMSFY26: 6.5, chronicSubMSGainBps: 10, chronicSubOutperfBps: 41,
    salesCagrFY22_26: 8.3, outperfVsIpmBps: -22,
    volCagrFY22_26: 5.2, priceNICagrFY22_26: 3.1, volContPct: 63,
    chronicSubRevCagr: 10.4,
    top25CagrFY22_26: 10, top25ContribFY26: 55, brandsOver1bn: 31,
    nlemExposurePct: 27,
    mrCountFY26: 9210, indiaSalesFY26Cr: 125572,
    pcpmFY23: 8.8, pcpmFY26: 8.5, pcpm3YrCagr: -1.0,
    salesCagrOrganicFY20_26: 10.7, salesCagrOrganicFY26_28ii: 11.0,
  },
  {
    name: 'Mankind Pharma', short: 'Mankind', ipmRankFY26: 3, compositeFY22_26: 68, compositeFY23_25: 44,
    valueMSFY22: 5.5, valueMSFY26: 5.5, msGainBps: 3,
    chronicMixFY26: 30, subChronicMixFY26: 23, chronicSubMixFY26: 53,
    chronicSubMSFY22: 4.9, chronicSubMSFY26: 5.2, chronicSubMSGainBps: 33, chronicSubOutperfBps: 182,
    salesCagrFY22_26: 8.6, outperfVsIpmBps: 15,
    volCagrFY22_26: 2.2, priceNICagrFY22_26: 6.4, volContPct: 26,
    chronicSubRevCagr: 11.8,
    top25CagrFY22_26: 10, top25ContribFY26: 52, brandsOver1bn: 30,
    nlemExposurePct: 19,
    mrCountFY26: 15055, indiaSalesFY26Cr: 121026,
    pcpmFY23: 6.0, pcpmFY26: 6.7, pcpm3YrCagr: 3.8,
    salesCagrOrganicFY20_26: 11.2, salesCagrOrganicFY26_28ii: 10.6,
  },
  {
    name: 'Torrent + JB', short: 'Torrent+JB', ipmRankFY26: 4, compositeFY22_26: 80, compositeFY23_25: null,
    valueMSFY22: 4.3, valueMSFY26: 4.9, msGainBps: 54,
    chronicMixFY26: 50, subChronicMixFY26: 25, chronicSubMixFY26: 75,
    chronicSubMSFY22: 5.8, chronicSubMSFY26: 6.5, chronicSubMSGainBps: 61, chronicSubOutperfBps: 278,
    salesCagrFY22_26: 11.7, outperfVsIpmBps: 324,
    volCagrFY22_26: -1.7, priceNICagrFY22_26: 13.5, volContPct: -15,
    chronicSubRevCagr: 12.8,
    top25CagrFY22_26: 12, top25ContribFY26: 58, brandsOver1bn: 27,
    nlemExposurePct: 7,
    mrCountFY26: 9300, indiaSalesFY26Cr: 96591,
    pcpmFY23: 7.3, pcpmFY26: 8.7, pcpm3YrCagr: 6.0,
    salesCagrOrganicFY20_26: 12.4, salesCagrOrganicFY26_28ii: 11.8,
  },
  {
    name: 'Alkem', short: 'Alkem', ipmRankFY26: 5, compositeFY22_26: 62, compositeFY23_25: 33,
    valueMSFY22: 3.9, valueMSFY26: 4.1, msGainBps: 23,
    chronicMixFY26: 14, subChronicMixFY26: 28, chronicSubMixFY26: 42,
    chronicSubMSFY22: 2.9, chronicSubMSFY26: 3.1, chronicSubMSGainBps: 19, chronicSubOutperfBps: 177,
    salesCagrFY22_26: 10.0, outperfVsIpmBps: 154,
    volCagrFY22_26: 3.8, priceNICagrFY22_26: 6.2, volContPct: 38,
    chronicSubRevCagr: 11.8,
    top25CagrFY22_26: 10, top25ContribFY26: 71, brandsOver1bn: 19,
    nlemExposurePct: 28,
    mrCountFY26: 13000, indiaSalesFY26Cr: 98760,
    pcpmFY23: 4.4, pcpmFY26: 5.1, pcpm3YrCagr: 4.4,
    salesCagrOrganicFY20_26: 10.4, salesCagrOrganicFY26_28ii: 10.0,
  },
  {
    name: 'Torrent Pharma', short: 'Torrent', ipmRankFY26: 6, compositeFY22_26: 81, compositeFY23_25: 51,
    valueMSFY22: 3.2, valueMSFY26: 3.7, msGainBps: 54,
    chronicMixFY26: 49, subChronicMixFY26: 28, chronicSubMixFY26: 77,
    chronicSubMSFY22: 4.6, chronicSubMSFY26: 5.1, chronicSubMSGainBps: 52, chronicSubOutperfBps: 301,
    salesCagrFY22_26: 12.8, outperfVsIpmBps: 431,
    volCagrFY22_26: 2.1, priceNICagrFY22_26: 10.7, volContPct: 16,
    chronicSubRevCagr: 13.0,
    top25CagrFY22_26: 13, top25ContribFY26: 59, brandsOver1bn: 22,
    nlemExposurePct: 6,
    mrCountFY26: 6900, indiaSalesFY26Cr: 71598,
    pcpmFY23: 7.6, pcpmFY26: 8.6, pcpm3YrCagr: 4.6,
    salesCagrOrganicFY20_26: 11.4, salesCagrOrganicFY26_28ii: 12.0,
  },
  {
    name: 'Lupin', short: 'Lupin', ipmRankFY26: 7, compositeFY22_26: 53, compositeFY23_25: 44,
    valueMSFY22: 3.8, valueMSFY26: 3.5, msGainBps: -30,
    chronicMixFY26: 58, subChronicMixFY26: 15, chronicSubMixFY26: 73,
    chronicSubMSFY22: 5.1, chronicSubMSFY26: 4.5, chronicSubMSGainBps: -55, chronicSubOutperfBps: -311,
    salesCagrFY22_26: 6.3, outperfVsIpmBps: -221,
    volCagrFY22_26: -0.2, priceNICagrFY22_26: 6.5, volContPct: -4,
    chronicSubRevCagr: 6.9,
    top25CagrFY22_26: 7, top25ContribFY26: 50, brandsOver1bn: 17,
    nlemExposurePct: 15,
    mrCountFY26: 8900, indiaSalesFY26Cr: 80540,
    pcpmFY23: 7.2, pcpmFY26: 7.5, pcpm3YrCagr: 1.4,
    salesCagrOrganicFY20_26: 7.8, salesCagrOrganicFY26_28ii: 10.0,
  },
  {
    name: 'Abbott India', short: 'Abbott', ipmRankFY26: 8, compositeFY22_26: 50, compositeFY23_25: 65,
    valueMSFY22: 3.4, valueMSFY26: 3.2, msGainBps: -20,
    chronicMixFY26: 49, subChronicMixFY26: 19, chronicSubMixFY26: 68,
    chronicSubMSFY22: 4.5, chronicSubMSFY26: 3.9, chronicSubMSGainBps: -63, chronicSubOutperfBps: -405,
    salesCagrFY22_26: 6.9, outperfVsIpmBps: -158,
    volCagrFY22_26: -3.7, priceNICagrFY22_26: 10.6, volContPct: -53,
    chronicSubRevCagr: 5.9,
    top25CagrFY22_26: 7, top25ContribFY26: 85, brandsOver1bn: 21,
    nlemExposurePct: 20,
    mrCountFY26: 3018, indiaSalesFY26Cr: 66979,
    pcpmFY23: 8.7, pcpmFY26: 11.1, pcpm3YrCagr: 8.6,
    salesCagrOrganicFY20_26: 8.9, salesCagrOrganicFY26_28ii: 8.0,
  },
  {
    name: "Dr. Reddy's", short: "Dr. Reddy's", ipmRankFY26: 9, compositeFY22_26: 55, compositeFY23_25: 51,
    valueMSFY22: 3.2, valueMSFY26: 3.2, msGainBps: -2,
    chronicMixFY26: 26, subChronicMixFY26: 18, chronicSubMixFY26: 45,
    chronicSubMSFY22: 2.7, chronicSubMSFY26: 2.5, chronicSubMSGainBps: -20, chronicSubOutperfBps: -203,
    salesCagrFY22_26: 8.3, outperfVsIpmBps: -16,
    volCagrFY22_26: 0.7, priceNICagrFY22_26: 7.6, volContPct: 9,
    chronicSubRevCagr: 8.0,
    top25CagrFY22_26: 8, top25ContribFY26: 57, brandsOver1bn: 24,
    nlemExposurePct: 11,
    mrCountFY26: 7600, indiaSalesFY26Cr: 61266,
    pcpmFY23: 5.9, pcpmFY26: 6.7, pcpm3YrCagr: 4.5,
    salesCagrOrganicFY20_26: 9.9, salesCagrOrganicFY26_28ii: 12.0,
  },
  {
    name: 'Zydus', short: 'Zydus', ipmRankFY26: 10, compositeFY22_26: 59, compositeFY23_25: 46,
    valueMSFY22: 3.2, valueMSFY26: 3.2, msGainBps: -3,
    chronicMixFY26: 33, subChronicMixFY26: 21, chronicSubMixFY26: 54,
    chronicSubMSFY22: 3.0, chronicSubMSFY26: 3.0, chronicSubMSGainBps: 7, chronicSubOutperfBps: 60,
    salesCagrFY22_26: 8.2, outperfVsIpmBps: -27,
    volCagrFY22_26: -3.3, priceNICagrFY22_26: 11.5, volContPct: -40,
    chronicSubRevCagr: 10.6,
    top25CagrFY22_26: 12, top25ContribFY26: 45, brandsOver1bn: 18,
    nlemExposurePct: 19,
    mrCountFY26: 7700, indiaSalesFY26Cr: 65153,
    pcpmFY23: 5.8, pcpmFY26: 7.1, pcpm3YrCagr: 6.4,
    salesCagrOrganicFY20_26: 9.8, salesCagrOrganicFY26_28ii: 11.0,
  },
  {
    name: 'Emcure', short: 'Emcure', ipmRankFY26: 14, compositeFY22_26: 35, compositeFY23_25: null,
    valueMSFY22: 2.8, valueMSFY26: 2.5, msGainBps: -39,
    chronicMixFY26: 31, subChronicMixFY26: 22, chronicSubMixFY26: 52,
    chronicSubMSFY22: 2.9, chronicSubMSFY26: 2.3, chronicSubMSGainBps: -64, chronicSubOutperfBps: -658,
    salesCagrFY22_26: 4.6, outperfVsIpmBps: -394,
    volCagrFY22_26: -3.2, priceNICagrFY22_26: 7.8, volContPct: -71,
    chronicSubRevCagr: 3.4,
    top25CagrFY22_26: 4, top25ContribFY26: 54, brandsOver1bn: 10,
    nlemExposurePct: 18,
    mrCountFY26: 5040, indiaSalesFY26Cr: 41183,
    pcpmFY23: 6.4, pcpmFY26: 6.8, pcpm3YrCagr: 2.3,
    salesCagrOrganicFY20_26: 7.7, salesCagrOrganicFY26_28ii: 10.0,
  },
  {
    name: 'GSK', short: 'GSK', ipmRankFY26: 15, compositeFY22_26: 28, compositeFY23_25: 20,
    valueMSFY22: 2.5, valueMSFY26: 2.1, msGainBps: -38,
    chronicMixFY26: 13, subChronicMixFY26: 25, chronicSubMixFY26: 38,
    chronicSubMSFY22: 1.6, chronicSubMSFY26: 1.4, chronicSubMSGainBps: -22, chronicSubOutperfBps: -390,
    salesCagrFY22_26: 4.1, outperfVsIpmBps: -438,
    volCagrFY22_26: -4.4, priceNICagrFY22_26: 8.5, volContPct: -107,
    chronicSubRevCagr: 6.1,
    top25CagrFY22_26: 5, top25ContribFY26: 90, brandsOver1bn: 12,
    nlemExposurePct: 41,
    mrCountFY26: 2000, indiaSalesFY26Cr: 37360,
    pcpmFY23: null, pcpmFY26: 12.5, pcpm3YrCagr: null,
    salesCagrOrganicFY20_26: 3.8, salesCagrOrganicFY26_28ii: null,
  },
  {
    name: 'Glenmark', short: 'Glenmark', ipmRankFY26: 16, compositeFY22_26: 58, compositeFY23_25: 68,
    valueMSFY22: 2.2, valueMSFY26: 2.1, msGainBps: -13,
    chronicMixFY26: 46, subChronicMixFY26: 12, chronicSubMixFY26: 58,
    chronicSubMSFY22: 1.9, chronicSubMSFY26: 2.2, chronicSubMSGainBps: 21, chronicSubOutperfBps: 288,
    salesCagrFY22_26: 6.9, outperfVsIpmBps: -159,
    volCagrFY22_26: 4.0, priceNICagrFY22_26: 2.9, volContPct: 58,
    chronicSubRevCagr: 12.9,
    top25CagrFY22_26: 14, top25ContribFY26: 82, brandsOver1bn: 6,
    nlemExposurePct: 17,
    mrCountFY26: 5600, indiaSalesFY26Cr: 37974,
    pcpmFY23: 7.1, pcpmFY26: 7.3, pcpm3YrCagr: 1.1,
    salesCagrOrganicFY20_26: 8.1, salesCagrOrganicFY26_28ii: 10.0,
  },
  {
    name: 'Ipca', short: 'Ipca', ipmRankFY26: 18, compositeFY22_26: 47, compositeFY23_25: 71,
    valueMSFY22: 1.9, valueMSFY26: 1.9, msGainBps: 0,
    chronicMixFY26: 33, subChronicMixFY26: 8, chronicSubMixFY26: 41,
    chronicSubMSFY22: 1.5, chronicSubMSFY26: 1.4, chronicSubMSGainBps: -11, chronicSubOutperfBps: -206,
    salesCagrFY22_26: 8.5, outperfVsIpmBps: 2,
    volCagrFY22_26: -1.6, priceNICagrFY22_26: 10.1, volContPct: -19,
    chronicSubRevCagr: 7.9,
    top25CagrFY22_26: 9, top25ContribFY26: 78, brandsOver1bn: 8,
    nlemExposurePct: 14,
    mrCountFY26: 7245, indiaSalesFY26Cr: 38120,
    pcpmFY23: 3.8, pcpmFY26: 4.4, pcpm3YrCagr: 4.7,
    salesCagrOrganicFY20_26: 12.2, salesCagrOrganicFY26_28ii: 12.0,
  },
  {
    name: 'Eris Lifesciences', short: 'Eris', ipmRankFY26: 20, compositeFY22_26: 54, compositeFY23_25: 60,
    valueMSFY22: 1.4, valueMSFY26: 1.3, msGainBps: -12,
    chronicMixFY26: 59, subChronicMixFY26: 24, chronicSubMixFY26: 83,
    chronicSubMSFY22: 2.1, chronicSubMSFY26: 1.9, chronicSubMSGainBps: -24, chronicSubOutperfBps: -332,
    salesCagrFY22_26: 6.1, outperfVsIpmBps: -236,
    volCagrFY22_26: 0.9, priceNICagrFY22_26: 5.3, volContPct: 14,
    chronicSubRevCagr: 6.7,
    top25CagrFY22_26: 8, top25ContribFY26: 63, brandsOver1bn: 6,
    nlemExposurePct: 17,
    mrCountFY26: 4120, indiaSalesFY26Cr: 27742,
    pcpmFY23: 4.2, pcpmFY26: 5.6, pcpm3YrCagr: 9.8,
    salesCagrOrganicFY20_26: 9.5, salesCagrOrganicFY26_28ii: 11.5,
  },
  {
    name: 'Alembic Pharma', short: 'Alembic', ipmRankFY26: 21, compositeFY22_26: 40, compositeFY23_25: 26,
    valueMSFY22: 1.3, valueMSFY26: 1.1, msGainBps: -14,
    chronicMixFY26: 27, subChronicMixFY26: 21, chronicSubMixFY26: 49,
    chronicSubMSFY22: 1.0, chronicSubMSFY26: 1.0, chronicSubMSGainBps: 3, chronicSubOutperfBps: 86,
    salesCagrFY22_26: 5.4, outperfVsIpmBps: -307,
    volCagrFY22_26: -2.5, priceNICagrFY22_26: 7.9, volContPct: -46,
    chronicSubRevCagr: 10.8,
    top25CagrFY22_26: 6, top25ContribFY26: 72, brandsOver1bn: 4,
    nlemExposurePct: 15,
    mrCountFY26: 5500, indiaSalesFY26Cr: 24677,
    pcpmFY23: 3.1, pcpmFY26: 3.7, pcpm3YrCagr: 6.2,
    salesCagrOrganicFY20_26: 9.6, salesCagrOrganicFY26_28ii: 7.2,
  },
  {
    name: 'FDC', short: 'FDC', ipmRankFY26: 24, compositeFY22_26: 32, compositeFY23_25: 46,
    valueMSFY22: 0.9, valueMSFY26: 0.8, msGainBps: -9,
    chronicMixFY26: 6, subChronicMixFY26: 12, chronicSubMixFY26: 18,
    chronicSubMSFY22: 0.4, chronicSubMSFY26: 0.3, chronicSubMSGainBps: -9, chronicSubOutperfBps: -746,
    salesCagrFY22_26: 5.7, outperfVsIpmBps: -280,
    volCagrFY22_26: 5.4, priceNICagrFY22_26: 0.3, volContPct: 94,
    chronicSubRevCagr: 2.5,
    top25CagrFY22_26: 7, top25ContribFY26: 90, brandsOver1bn: 3,
    nlemExposurePct: 58,
    mrCountFY26: 3600, indiaSalesFY26Cr: 17976,
    pcpmFY23: null, pcpmFY26: 4.2, pcpm3YrCagr: null,
    salesCagrOrganicFY20_26: 9.2, salesCagrOrganicFY26_28ii: null,
  },
  {
    name: 'Sanofi', short: 'Sanofi', ipmRankFY26: 26, compositeFY22_26: 33, compositeFY23_25: 31,
    valueMSFY22: 1.0, valueMSFY26: 0.8, msGainBps: -21,
    chronicMixFY26: 37, subChronicMixFY26: 3, chronicSubMixFY26: 40,
    chronicSubMSFY22: 0.9, chronicSubMSFY26: 0.6, chronicSubMSGainBps: -35, chronicSubOutperfBps: -1240,
    salesCagrFY22_26: 2.3, outperfVsIpmBps: -616,
    volCagrFY22_26: 3.6, priceNICagrFY22_26: -1.3, volContPct: 155,
    chronicSubRevCagr: -2.4,
    top25CagrFY22_26: 3, top25ContribFY26: 100, brandsOver1bn: 7,
    nlemExposurePct: 33,
    mrCountFY26: 658, indiaSalesFY26Cr: 15115,
    pcpmFY23: 9.8, pcpmFY26: 19.1, pcpm3YrCagr: 25.0,
    salesCagrOrganicFY20_26: 1.7, salesCagrOrganicFY26_28ii: 7.0,
  },
  {
    name: 'Ajanta', short: 'Ajanta', ipmRankFY26: 27, compositeFY22_26: 57, compositeFY23_25: 53,
    valueMSFY22: 0.7, valueMSFY26: 0.8, msGainBps: 9,
    chronicMixFY26: 47, subChronicMixFY26: 12, chronicSubMixFY26: 59,
    chronicSubMSFY22: 0.8, chronicSubMSFY26: 0.8, chronicSubMSGainBps: 3, chronicSubOutperfBps: 94,
    salesCagrFY22_26: 12.0, outperfVsIpmBps: 349,
    volCagrFY22_26: 5.5, priceNICagrFY22_26: 6.5, volContPct: 46,
    chronicSubRevCagr: 10.9,
    top25CagrFY22_26: 11, top25ContribFY26: 69, brandsOver1bn: 2,
    nlemExposurePct: 11,
    mrCountFY26: 3750, indiaSalesFY26Cr: 16667,
    pcpmFY23: null, pcpmFY26: 3.7, pcpm3YrCagr: null,
    salesCagrOrganicFY20_26: 13.8, salesCagrOrganicFY26_28ii: null,
  },
  {
    name: 'Corona Remedies', short: 'CORONA', ipmRankFY26: 29, compositeFY22_26: 69, compositeFY23_25: 65,
    valueMSFY22: 0.5, valueMSFY26: 0.7, msGainBps: 18,
    chronicMixFY26: 25, subChronicMixFY26: 45, chronicSubMixFY26: 70,
    chronicSubMSFY22: 0.6, chronicSubMSFY26: 0.8, chronicSubMSGainBps: 24, chronicSubOutperfBps: 988,
    salesCagrFY22_26: 17.6, outperfVsIpmBps: 912,
    volCagrFY22_26: 10.3, priceNICagrFY22_26: 7.3, volContPct: 58,
    chronicSubRevCagr: 19.9,
    top25CagrFY22_26: 22, top25ContribFY26: 75, brandsOver1bn: 1,
    nlemExposurePct: 9,
    mrCountFY26: 2747, indiaSalesFY26Cr: 13334,
    pcpmFY23: 3.0, pcpmFY26: 4.0, pcpm3YrCagr: 10.1,
    salesCagrOrganicFY20_26: 17.4, salesCagrOrganicFY26_28ii: 15.5,
  },
  {
    name: 'Indoco Remedies', short: 'Indoco', ipmRankFY26: 31, compositeFY22_26: 33, compositeFY23_25: 31,
    valueMSFY22: 0.6, valueMSFY26: 0.6, msGainBps: -2,
    chronicMixFY26: 2, subChronicMixFY26: 13, chronicSubMixFY26: 15,
    chronicSubMSFY22: 0.2, chronicSubMSFY26: 0.2, chronicSubMSGainBps: -2, chronicSubOutperfBps: -308,
    salesCagrFY22_26: 7.3, outperfVsIpmBps: -114,
    volCagrFY22_26: 0.3, priceNICagrFY22_26: 7.1, volContPct: 3,
    chronicSubRevCagr: 6.9,
    top25CagrFY22_26: 8, top25ContribFY26: 85, brandsOver1bn: 4,
    nlemExposurePct: 9,
    mrCountFY26: 3000, indiaSalesFY26Cr: 8575,
    pcpmFY23: null, pcpmFY26: 2.4, pcpm3YrCagr: null,
    salesCagrOrganicFY20_26: 3.8, salesCagrOrganicFY26_28ii: null,
  },
];

// Industry average (the dashed line on each chart for reference).
export const IPM_AVG = {
  short: 'IPM Avg',
  compositeFY22_26: 55,
  chronicSubMixFY26: 56,
  salesCagrFY22_26: 8.5,
  volCagrFY22_26: 0.7,
  priceNICagrFY22_26: 7.8,
  chronicSubRevCagr: 10.0,
  top25CagrFY22_26: 12,
  nlemExposurePct: 17,
  pcpmFY26: 6.2,
  pcpm3YrCagr: 1.6,
  salesCagrOrganicFY20_26: 8.5,
};

// ── Sema / Tirzepatide market share (IIFL Figure 11) ────────────────────────
// March 2026 share — first month of generic Sema launches in India.
export const SEMA_SHARE_MAR26 = [
  { company: 'Novo Nordisk',  share: 76, kind: 'innovator' },
  { company: 'Torrent',       share: 8,  kind: 'generic' },
  { company: "Dr. Reddy's",   share: 3,  kind: 'generic' },
  { company: 'Zydus',         share: 2,  kind: 'generic' },
  { company: 'Lupin',         share: 2,  kind: 'generic' },
  { company: 'Sun Pharma',    share: 2,  kind: 'generic' },
  { company: 'Emcure',        share: 1,  kind: 'generic' },
  { company: 'Alkem',         share: 1,  kind: 'generic' },
  { company: 'USV',           share: 1,  kind: 'generic' },
  { company: 'Eris',          share: 1,  kind: 'generic' },
];

export const TIRZ_SHARE_MAR26 = [
  { company: 'Eli Lilly', share: 87, kind: 'innovator' },
  { company: 'Cipla',     share: 13, kind: 'co-marketer' },
];

export const GLP1_OUTLOOK = {
  semaIndiaMarketRsCrIn2_3Yr: 10000,        // ~Rs 100bn / 4.5% of current IPM
  semaCompaniesLaunching: '30-40',
  semaGenericDiscount: '40-80%',
  ipmGrowthAccelerationBpsFromSema: '100-200', // IIFL estimate
};

// ── Analyst takeaway cards (the buy-side one-pager tiles) ───────────────────
// Headlines + supporting data. The data shows; the headline frames the "so what".
export const ANALYST_TAKES = [
  {
    company: 'Sun Pharma', emoji: '🚀', tone: 'positive',
    headline: 'Compounding at scale — rare combo.',
    bullets: [
      '+78 bps market share gained over FY22-26 (largest in the cohort).',
      'PCPM Rs 10.6L/month — best ex-MNC sales-force productivity in India.',
      '45 mother brands with sales > Rs 1 bn each — brand depth other India players don’t match.',
    ],
  },
  {
    company: 'CORONA',     emoji: '🚀', tone: 'positive',
    headline: 'Fastest growth in industry. Also the biggest concentration risk.',
    bullets: [
      '17.6% sales Cagr FY22-26 — ~900 bps above IPM — best in the cohort.',
      'Volume growth at 10.3% Cagr is the highest in the cohort by a wide margin.',
      'But: only 1 mother brand > Rs 1 bn; top-25 brands = 75% of sales — portfolio is concentrated.',
    ],
  },
  {
    company: 'Torrent + JB', emoji: '💎', tone: 'positive',
    headline: 'Best chronic mix and lowest NLEM exposure. But volumes are flat — watch this.',
    bullets: [
      'Chronic + Sub-Chronic mix at 75% (vs IPM avg 56%) — premium quality of revenue.',
      'NLEM exposure only 7% — lowest in the cohort — least price-control risk.',
      'But volume Cagr is –1.7% over FY22-26 — growth has been entirely price + new-launch led.',
    ],
  },
  {
    company: 'Lupin', emoji: '⚠️', tone: 'caution',
    headline: 'Losing share in chronic medicines. Forecasts may be optimistic.',
    bullets: [
      '–55 bps Chronic + Sub-Chronic MS lost over FY22-26 (largest chronic-share loss in the cohort).',
      'Volume Cagr at –0.2% — declining patient demand at the franchise level.',
      'IIFL projects 10% India Cagr FY26-28ii vs the FY22-26 actual of 6.3% — the inflection needs to be validated.',
    ],
  },
  {
    company: 'Glenmark', emoji: '🚨', tone: 'caution',
    headline: 'Big expectations are baked in. Validate before paying for them.',
    bullets: [
      'IIFL projects ~24.9% reported India Cagr FY26-28ii vs ~8.1% organic historical (FY20-26) — the largest projection-vs-history gap in the cohort.',
      'Top-25 brand Cagr at 14% (above IPM avg of 12%) — the engine is moving.',
      'But composite ranking dropped from 68 (FY23-25) to 58 (FY22-26) — IIFL flagged Glenmark as having "fallen off the charts".',
    ],
  },
  {
    company: 'GSK · FDC · Sanofi · Indoco', emoji: '🐌', tone: 'negative',
    headline: 'Structurally challenged — not cyclical. Acute-heavy + high NLEM exposure.',
    bullets: [
      'Composite scores 28-33 (out of 100) — bottom of the cohort.',
      'NLEM exposure 33-58% — hit hardest when NPPA freezes essential-drug pricing.',
      'Volumes declining at 2.5-4.4% Cagr — the trend is the headwind, not the cycle.',
    ],
  },
];
