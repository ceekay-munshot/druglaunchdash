// Boardroom-grade PowerPoint export. Generates a 4-slide deck (cover,
// executive summary KPIs, top-10 launches table, peer scorecard) so the
// CEO can paste this directly into a board update.
//
// Lazy-loaded from MainTable / Header on click — pptxgenjs is ~600KB
// minified and not worth shipping in the initial bundle.

import {
  COLUMN_KEYS,
  isAcquisitionParent,
  countAcquisitionDeals,
  groupAcquisitionRows,
} from '../data/mockData';

// Brand palette — keep in sync with tailwind.config.js so the deck looks
// like a continuation of the dashboard, not a generic template.
const PALETTE = {
  pharmaPrimary: '15803D',   // pharma-700
  pharmaAccent:  '0F766E',   // teal-700
  ink900:        '0F172A',
  ink700:        '334155',
  ink500:        '64748B',
  ink100:        'E2E8F0',
  white:         'FFFFFF',
  amber:         'B45309',
};

const PAGE = { w: 13.333, h: 7.5 }; // 16:9 landscape

function fmtINR(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1000) return `Rs ${(n / 1000).toFixed(2)}K Cr`;
  return `Rs ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
}

function shortDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function addHeaderBand(slide, title, subtitle) {
  // Top accent band — same gradient direction as the dashboard's KPI cards
  slide.addShape('rect', {
    x: 0, y: 0, w: PAGE.w, h: 0.06,
    fill: { color: PALETTE.pharmaPrimary }, line: { color: PALETTE.pharmaPrimary },
  });
  slide.addText(title, {
    x: 0.5, y: 0.18, w: PAGE.w - 1, h: 0.5,
    fontSize: 22, bold: true, color: PALETTE.ink900, fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.6, w: PAGE.w - 1, h: 0.35,
      fontSize: 12, color: PALETTE.ink500, fontFace: 'Calibri',
    });
  }
}

function addFooter(slide, page, total, generatedAt) {
  slide.addText(
    [
      { text: 'Drug Launch Tracker — India Pharma', options: { color: PALETTE.ink500 } },
      { text: '   ·   ', options: { color: PALETTE.ink100 } },
      { text: `Generated ${generatedAt}`, options: { color: PALETTE.ink500 } },
      { text: '   ·   ', options: { color: PALETTE.ink100 } },
      { text: `Slide ${page} of ${total}`, options: { color: PALETTE.ink500 } },
    ],
    {
      x: 0.5, y: PAGE.h - 0.35, w: PAGE.w - 1, h: 0.25,
      fontSize: 9, fontFace: 'Calibri',
    }
  );
}

// ── Slide 1: Cover ────────────────────────────────────────────────────────
function buildCoverSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.white };
  // Big diagonal brand block on the left
  slide.addShape('rect', {
    x: 0, y: 0, w: 4.5, h: PAGE.h,
    fill: { color: PALETTE.pharmaPrimary }, line: { color: PALETTE.pharmaPrimary },
  });
  slide.addText('DLT', {
    x: 0.7, y: 0.7, w: 3, h: 0.7,
    fontSize: 28, bold: true, color: PALETTE.white, fontFace: 'Calibri',
  });
  slide.addText('Drug Launch Tracker', {
    x: 0.7, y: 2.5, w: 3.5, h: 1.2,
    fontSize: 32, bold: true, color: PALETTE.white, fontFace: 'Calibri',
  });
  slide.addText('India Pharma Briefing', {
    x: 0.7, y: 3.8, w: 3.5, h: 0.6,
    fontSize: 16, italic: true, color: PALETTE.white, fontFace: 'Calibri',
  });
  // Right side: meta
  slide.addText('Boardroom briefing', {
    x: 5.2, y: 1.2, w: 7.5, h: 0.5,
    fontSize: 11, color: PALETTE.ink500, fontFace: 'Calibri',
    bold: true, charSpacing: 4,
  });
  slide.addText(ctx.company, {
    x: 5.2, y: 1.7, w: 7.5, h: 0.9,
    fontSize: 36, bold: true, color: PALETTE.ink900, fontFace: 'Calibri',
  });
  slide.addText(ctx.timelineLabel, {
    x: 5.2, y: 2.7, w: 7.5, h: 0.5,
    fontSize: 16, color: PALETTE.ink700, fontFace: 'Calibri',
  });
  slide.addText(`Generated ${ctx.generatedAt}`, {
    x: 5.2, y: 6.7, w: 7.5, h: 0.4,
    fontSize: 11, color: PALETTE.ink500, fontFace: 'Calibri',
  });
}

// ── Slide 2: Executive KPIs ───────────────────────────────────────────────
function buildKpiSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.white };
  addHeaderBand(slide, 'Executive Summary', `Headline KPIs · ${ctx.timelineLabel}`);

  const brandRows = ctx.rows.filter((r) => !isAcquisitionParent(r));
  const total = brandRows.length;
  const acquired = countAcquisitionDeals(ctx.rows);
  const ownLaunched = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Own Launched').length;
  const inLicensed = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'In-licensed').length;
  const chronic = brandRows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const chronicPct = total ? Math.round((chronic / total) * 100) : 0;
  const isNum = (v) => v !== null && v !== undefined && !isNaN(Number(v));
  const totalMarket = brandRows
    .map((r) => Number(r[COLUMN_KEYS.MARKET_SIZE]))
    .filter(isNum)
    .reduce((s, v) => s + v, 0);

  const therapyCounts = new Map();
  brandRows.forEach((r) => {
    const t = r[COLUMN_KEYS.THERAPY];
    if (!t || t === '—') return;
    therapyCounts.set(t, (therapyCounts.get(t) || 0) + 1);
  });
  const topTherapy = [...therapyCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const tiles = [
    { label: 'Total Brands', value: String(total), sub: `${inLicensed} in-licensed` },
    { label: 'Acquired Deals', value: String(acquired), sub: `${acquired === 1 ? '1 deal' : acquired + ' deals'}` },
    { label: 'Own Launched', value: String(ownLaunched), sub: `${total ? Math.round((ownLaunched/total)*100) : 0}% of portfolio` },
    { label: 'India TAM (disclosed)', value: fmtINR(totalMarket || null), sub: 'Sum of public estimates' },
    { label: 'Chronic Share', value: `${chronicPct}%`, sub: 'Annuity-style revenue signal' },
    { label: 'Top Therapy', value: topTherapy ? topTherapy[0] : '—', sub: topTherapy ? `${topTherapy[1]} brands` : '' },
  ];

  // 3 × 2 grid of tiles
  const cols = 3, rows = 2;
  const padX = 0.5, padY = 0.3;
  const tileW = (PAGE.w - 2 * padX - (cols - 1) * 0.3) / cols;
  const tileH = 1.7;
  const gridTop = 1.4;
  tiles.forEach((t, i) => {
    const cx = i % cols, cy = Math.floor(i / cols);
    const x = padX + cx * (tileW + 0.3);
    const y = gridTop + cy * (tileH + padY);
    slide.addShape('roundRect', {
      x, y, w: tileW, h: tileH,
      rectRadius: 0.12,
      fill: { color: PALETTE.white },
      line: { color: PALETTE.ink100, width: 1 },
    });
    // Top accent strip
    slide.addShape('rect', {
      x, y, w: tileW, h: 0.06,
      fill: { color: i % 2 ? PALETTE.pharmaAccent : PALETTE.pharmaPrimary },
      line: { color: i % 2 ? PALETTE.pharmaAccent : PALETTE.pharmaPrimary },
    });
    slide.addText(t.label.toUpperCase(), {
      x: x + 0.25, y: y + 0.2, w: tileW - 0.5, h: 0.3,
      fontSize: 9, bold: true, color: PALETTE.ink500, fontFace: 'Calibri', charSpacing: 4,
    });
    slide.addText(t.value, {
      x: x + 0.25, y: y + 0.55, w: tileW - 0.5, h: 0.7,
      fontSize: 28, bold: true, color: PALETTE.ink900, fontFace: 'Calibri',
    });
    slide.addText(t.sub || '', {
      x: x + 0.25, y: y + 1.25, w: tileW - 0.5, h: 0.35,
      fontSize: 10, color: PALETTE.ink500, fontFace: 'Calibri',
    });
  });
}

// ── Slide 3: Top 10 launches table ────────────────────────────────────────
function buildTopLaunchesSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.white };
  addHeaderBand(slide, 'Recent Launches', 'Top 10 most recent in scope');

  const brandRows = ctx.rows.filter((r) => !isAcquisitionParent(r));
  const recent = [...brandRows]
    .filter((r) => !isNaN(new Date(r[COLUMN_KEYS.DATE]).getTime()))
    .sort(
      (a, b) => new Date(b[COLUMN_KEYS.DATE]).getTime() - new Date(a[COLUMN_KEYS.DATE]).getTime()
    )
    .slice(0, 10);

  const headerRow = [
    { text: 'Brand',         options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Buyer',         options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Type',          options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Therapy',       options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Indication',    options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Date',          options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
  ];
  const dataRows = recent.map((r, i) => {
    const stripeFill = i % 2 ? 'F8FAFC' : PALETTE.white;
    const cell = (text) => ({ text: String(text || '—'), options: { color: PALETTE.ink700, fill: stripeFill } });
    return [
      cell(r[COLUMN_KEYS.BRAND]),
      cell(r[COLUMN_KEYS.BUYER]),
      cell(r[COLUMN_KEYS.LAUNCH_TYPE]),
      cell(r[COLUMN_KEYS.THERAPY]),
      cell(r[COLUMN_KEYS.INDICATION]),
      cell(shortDate(r[COLUMN_KEYS.DATE])),
    ];
  });

  if (dataRows.length === 0) {
    slide.addText('No dated launches in current scope.', {
      x: 0.5, y: 1.5, w: PAGE.w - 1, h: 0.5,
      fontSize: 12, italic: true, color: PALETTE.ink500, fontFace: 'Calibri',
    });
    return;
  }

  slide.addTable([headerRow, ...dataRows], {
    x: 0.5, y: 1.2, w: PAGE.w - 1,
    colW: [2.2, 1.9, 1.6, 1.9, 3.2, 1.5],
    fontSize: 10, fontFace: 'Calibri',
    border: { type: 'solid', color: PALETTE.ink100, pt: 0.5 },
    valign: 'middle',
    rowH: 0.4,
  });
}

// ── Slide 4: Peer scorecard ──────────────────────────────────────────────
function buildPeerSlide(pptx, ctx) {
  const slide = pptx.addSlide();
  slide.background = { color: PALETTE.white };
  addHeaderBand(slide, 'Peer Benchmark', 'Tracked-company scorecard');

  const buyerCounts = new Map();
  const therapyByBuyer = new Map();
  ctx.rows.forEach((r) => {
    if (isAcquisitionParent(r)) return;
    const b = r[COLUMN_KEYS.BUYER];
    if (!b) return;
    buyerCounts.set(b, (buyerCounts.get(b) || 0) + 1);
    const tMap = therapyByBuyer.get(b) || new Map();
    const t = r[COLUMN_KEYS.THERAPY];
    if (t && t !== '—') tMap.set(t, (tMap.get(t) || 0) + 1);
    therapyByBuyer.set(b, tMap);
  });

  const ranked = [...buyerCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    slide.addText('No buyer activity in current scope.', {
      x: 0.5, y: 1.5, w: PAGE.w - 1, h: 0.5,
      fontSize: 12, italic: true, color: PALETTE.ink500, fontFace: 'Calibri',
    });
    return;
  }

  const headerRow = [
    { text: 'Company',        options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Launches',       options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary, align: 'right' } },
    { text: 'Top Therapy',    options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary } },
    { text: 'Therapy Brands', options: { bold: true, color: PALETTE.white, fill: PALETTE.pharmaPrimary, align: 'right' } },
  ];
  const tableRows = ranked.slice(0, 10).map(([buyer, count], i) => {
    const stripeFill = i % 2 ? 'F8FAFC' : PALETTE.white;
    const tMap = therapyByBuyer.get(buyer) || new Map();
    const top = [...tMap.entries()].sort((a, b) => b[1] - a[1])[0];
    return [
      { text: buyer, options: { bold: true, color: PALETTE.ink900, fill: stripeFill } },
      { text: String(count), options: { color: PALETTE.ink700, fill: stripeFill, align: 'right' } },
      { text: top ? top[0] : '—', options: { color: PALETTE.ink700, fill: stripeFill } },
      { text: top ? String(top[1]) : '—', options: { color: PALETTE.ink700, fill: stripeFill, align: 'right' } },
    ];
  });

  slide.addTable([headerRow, ...tableRows], {
    x: 0.5, y: 1.2, w: PAGE.w - 1,
    colW: [4.5, 1.8, 4.5, 1.5],
    fontSize: 11, fontFace: 'Calibri',
    border: { type: 'solid', color: PALETTE.ink100, pt: 0.5 },
    valign: 'middle',
    rowH: 0.42,
  });
}

export async function exportPptx({ rows, company = 'All Companies', timelineLabel = '', generatedAt }) {
  // Dynamic import keeps pptxgenjs out of the initial bundle.
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 × 7.5 inches, 16:9
  pptx.title = 'Drug Launch Tracker — India Pharma';
  pptx.author = 'Drug Launch Tracker';
  pptx.company = 'Drug Launch Tracker';

  const ctx = {
    rows,
    company,
    timelineLabel,
    generatedAt: generatedAt || new Date().toLocaleString('en-IN'),
  };

  buildCoverSlide(pptx, ctx);
  buildKpiSlide(pptx, ctx);
  buildTopLaunchesSlide(pptx, ctx);
  buildPeerSlide(pptx, ctx);

  // Footer pass — done at the end so we know the final page count.
  // pptxgenjs doesn't expose a slide-count helper, so we re-walk via
  // pptx.slides (the internal collection) and add footers in order.
  const slides = pptx.slides || pptx._slides || [];
  const total = slides.length;
  slides.forEach((s, idx) => {
    if (idx === 0) return; // skip cover slide
    addFooter(s, idx + 1, total, ctx.generatedAt);
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const slug = company === 'All Companies'
    ? 'all-companies'
    : company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await pptx.writeFile({ fileName: `drug_launch_tracker_${slug}_${dateStamp}.pptx` });
}
