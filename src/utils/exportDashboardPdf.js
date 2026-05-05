// PDF export for the Drug Launch Tracker dashboard.
//
// Produces a CEO-grade A4 landscape report:
//   • Cover page  — title, scope, generation timestamp, headline KPIs.
//   • Section pages — one section per <section data-pdf-section> on the page,
//     each with a branded page header (section title + subtitle) and a
//     numbered footer.
//
// Page-break rules (the "no chart/table cut in half" requirement):
//   1. Every section is captured as its own canvas, never spanning a break
//      with arbitrary content.
//   2. If the captured section is ≤ one page tall, it is centered on a
//      single page.
//   3. If a section is up to ~1.35× a page tall AND not the data table,
//      it is uniformly scaled down to fit one page — keeps charts intact.
//   4. The data table (data-pdf-table) is always sliced at <tr> row
//      boundaries so a row never gets split across pages. The card header
//      and column-header strip are repeated on every continuation page.

// jsPDF + html2canvas-pro are heavy (~600 KB minified combined) and only
// needed when the user clicks Export PDF. Defer their load with dynamic
// import so the initial dashboard bundle stays lean.
import { COLUMN_KEYS } from '../data/mockData';

// A4 landscape in pt (1pt = 1/72in). 297mm × 210mm → 842pt × 595pt.
const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 36;
const HEADER_H = 48;
const FOOTER_H = 24;
const CONTENT_X = MARGIN;
const CONTENT_TOP = MARGIN + HEADER_H;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_H - MARGIN - FOOTER_H;
const CONTENT_H = CONTENT_BOTTOM - CONTENT_TOP;

const COL = {
  ink900: '#0f172a',
  ink700: '#334155',
  ink500: '#64748b',
  ink300: '#cbd5e1',
  ink100: '#f1f5f9',
  green: '#16a34a',
  greenDark: '#15803d',
  greenSoft: '#dcfce9',
  teal: '#0d9488',
  off: '#f7fbf8',
  white: '#ffffff',
};

const CAPTURE_SCALE = 2;

// Helvetica (jsPDF's built-in font) doesn't ship the rupee glyph. Replace
// it with "Rs " for any text we draw natively into the PDF (cover page,
// page header, KPI tiles). Captured canvases keep ₹ correctly because
// they're rasterized.
const safe = (v) => String(v ?? '').replace(/₹/g, 'Rs ');

// Number → integer string with Indian grouping. Used for the cover KPI
// "Total India Market" which we format ourselves so we have full control
// over the glyphs (vs reusing the dashboard's ₹-prefixed formatter).
function fmtINRCr(crores) {
  if (crores === null || crores === undefined || isNaN(crores)) return 'NA';
  if (crores >= 100000) return `Rs ${(crores / 100000).toFixed(2)} L Cr`;
  return `Rs ${Math.round(crores).toLocaleString('en-IN')} Cr`;
}

// ────────────────────────────────────────────────────────────────────────
// Cover page
// ────────────────────────────────────────────────────────────────────────
function drawCover(pdf, ctx) {
  const { company, timelineLabel, generatedAt, kpis } = ctx;

  // Off-white field
  pdf.setFillColor(COL.off);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Right-side vertical band — soft mint, with a darker teal edge.
  pdf.setFillColor(COL.greenSoft);
  pdf.rect(PAGE_W - 56, 0, 56, PAGE_H, 'F');
  pdf.setFillColor(COL.teal);
  pdf.rect(PAGE_W - 8, 0, 8, PAGE_H, 'F');

  // Top accent stripe.
  pdf.setFillColor(COL.green);
  pdf.rect(0, 0, PAGE_W, 6, 'F');

  // Logo mark — rounded square with "Rx" in white.
  const logoX = MARGIN;
  const logoY = MARGIN + 38;
  pdf.setFillColor(COL.green);
  pdf.roundedRect(logoX, logoY, 56, 56, 12, 12, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(COL.white);
  pdf.text('Rx', logoX + 14, logoY + 38);

  // Eyebrow.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(COL.teal);
  pdf.text('INVESTOR BRIEFING  ·  CONFIDENTIAL', MARGIN, logoY + 86);

  // Title.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(38);
  pdf.setTextColor(COL.ink900);
  pdf.text('Drug Launch Tracker', MARGIN, logoY + 124);

  // Subtitle.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(18);
  pdf.setTextColor(COL.ink500);
  pdf.text('India Pharma — Launch, In-Licensing & Acquisition Intelligence', MARGIN, logoY + 152);

  // Scope panel.
  let cy = logoY + 196;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(COL.ink500);
  pdf.text('SCOPE', MARGIN, cy);
  pdf.setDrawColor(COL.ink300);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN + 42, cy - 3, MARGIN + 320, cy - 3);
  cy += 18;

  const rows = [
    ['Company', company],
    ['Period', timelineLabel],
    ['Launches in scope', `${ctx.filteredCount} of ${ctx.totalCount}`],
    ['Generated', generatedAt],
  ];
  for (const [k, v] of rows) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(COL.ink500);
    pdf.text(k.toUpperCase(), MARGIN, cy);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(13);
    pdf.setTextColor(COL.ink900);
    pdf.text(safe(v), MARGIN + 130, cy);
    cy += 22;
  }

  // KPI tiles (4 across) anchored to the bottom-left.
  const tileH = 110;
  const tileGap = 12;
  const tileY = PAGE_H - MARGIN - tileH - 16;
  const tileBandW = PAGE_W - MARGIN * 2 - 64; // leave room for the right band
  const tileW = (tileBandW - tileGap * 3) / 4;

  kpis.slice(0, 4).forEach((k, i) => {
    const x = MARGIN + i * (tileW + tileGap);
    pdf.setFillColor(COL.white);
    pdf.roundedRect(x, tileY, tileW, tileH, 10, 10, 'F');
    pdf.setDrawColor(COL.ink300);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, tileY, tileW, tileH, 10, 10, 'S');
    pdf.setFillColor(i % 2 === 0 ? COL.green : COL.teal);
    pdf.rect(x, tileY, tileW, 4, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(COL.ink500);
    pdf.text(safe(k.label).toUpperCase(), x + 14, tileY + 28);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(COL.ink900);
    pdf.text(safe(k.value), x + 14, tileY + 64);

    if (k.sub) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(COL.ink500);
      pdf.text(safe(k.sub), x + 14, tileY + 86);
    }
  });

  // Cover footer.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COL.ink500);
  pdf.text(
    'Prepared for executive review  ·  All figures derive from the same filtered launch dataset.',
    MARGIN,
    PAGE_H - MARGIN
  );
}

// ────────────────────────────────────────────────────────────────────────
// Section page chrome (header + footer)
// ────────────────────────────────────────────────────────────────────────
function drawPageChrome(pdf, { title, subtitle, pageNum, totalPages, generatedAt, continuation }) {
  // Top accent.
  pdf.setFillColor(COL.green);
  pdf.rect(0, 0, PAGE_W, 4, 'F');

  // Brand line (left).
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(COL.ink900);
  pdf.text('Drug Launch Tracker', MARGIN, MARGIN + 6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(COL.ink500);
  pdf.text('India Pharma  ·  Investor Briefing', MARGIN, MARGIN + 20);

  // Section title (right).
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(COL.ink900);
  const titleText = safe(continuation ? `${title}  (continued)` : title);
  const titleW = pdf.getTextWidth(titleText);
  pdf.text(titleText, PAGE_W - MARGIN - titleW, MARGIN + 6);

  if (subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(COL.ink500);
    const subText = safe(subtitle);
    const subW = pdf.getTextWidth(subText);
    pdf.text(subText, PAGE_W - MARGIN - subW, MARGIN + 20);
  }

  // Header divider.
  pdf.setDrawColor(COL.ink300);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, MARGIN + HEADER_H - 10, PAGE_W - MARGIN, MARGIN + HEADER_H - 10);

  // Footer divider.
  pdf.setDrawColor(COL.ink300);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, PAGE_H - MARGIN - FOOTER_H + 4, PAGE_W - MARGIN, PAGE_H - MARGIN - FOOTER_H + 4);

  // Footer text.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COL.ink500);
  pdf.text(`Generated ${safe(generatedAt)}  ·  Confidential`, MARGIN, PAGE_H - MARGIN - 6);
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const ptw = pdf.getTextWidth(pageText);
  pdf.text(pageText, PAGE_W - MARGIN - ptw, PAGE_H - MARGIN - 6);
}

// ────────────────────────────────────────────────────────────────────────
// Capture helpers
// ────────────────────────────────────────────────────────────────────────

// Lift internal scroll containers (data-pdf-scroller) for the duration of
// measurement + capture so html2canvas sees the full content. Returns a
// restore function — always call it in finally.
function liftRestraints(section) {
  const restorers = [];
  section.querySelectorAll('[data-pdf-scroller]').forEach((el) => {
    const orig = {
      maxHeight: el.style.maxHeight,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
    };
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
    el.style.overflowX = 'visible';
    el.style.overflowY = 'visible';
    restorers.push(() => Object.assign(el.style, orig));
  });
  // Force reflow.
  // eslint-disable-next-line no-unused-expressions
  section.offsetHeight;
  return () => restorers.forEach((fn) => fn());
}

let _html2canvasPromise = null;
function loadHtml2Canvas() {
  if (!_html2canvasPromise) {
    _html2canvasPromise = import('html2canvas-pro').then((m) => m.default);
  }
  return _html2canvasPromise;
}

let _jsPDFPromise = null;
function loadJsPDF() {
  if (!_jsPDFPromise) {
    _jsPDFPromise = import('jspdf').then((m) => m.default || m.jsPDF);
  }
  return _jsPDFPromise;
}

async function captureSection(section) {
  const html2canvas = await loadHtml2Canvas();
  return html2canvas(section, {
    scale: CAPTURE_SCALE,
    backgroundColor: COL.white,
    useCORS: true,
    logging: false,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: Math.max(section.scrollHeight, document.documentElement.clientHeight) + 200,
    height: section.scrollHeight,
    onclone: (doc, cloned) => {
      cloned.classList.add('pdf-export-clone');
      // Body-level overlays (the "Generating PDF…" curtain) overlap the
      // captured section's bbox and would otherwise appear in the snapshot.
      doc.querySelectorAll('[data-pdf-no-capture]').forEach((el) => {
        el.style.display = 'none';
      });
      // Body gradient bleeds into outer padding around the section card —
      // force flat white so PDF page margins read clean.
      if (doc.body) doc.body.style.background = '#ffffff';
    },
  });
}

// ────────────────────────────────────────────────────────────────────────
// Slice composition (table-aware row splitting)
// ────────────────────────────────────────────────────────────────────────

// For non-table tall sections, slice the canvas into vertical strips that
// each fit one page. No DOM awareness — used as a generic fallback.
function genericSlices(canvas, maxSlicePxH) {
  const slices = [];
  let y = 0;
  while (y < canvas.height) {
    const h = Math.min(maxSlicePxH, canvas.height - y);
    slices.push(makeSliceCanvas(canvas, 0, y, canvas.width, h));
    y += h;
  }
  return slices;
}

// Composite a single slice canvas: pulls a rectangle from the source and
// paints it onto a new canvas of that size (against a white background so
// JPEG encoding doesn't bleed grey).
function makeSliceCanvas(src, sx, sy, sw, sh) {
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext('2d');
  ctx.fillStyle = COL.white;
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

// Composite a "topmatter + rows" slice for a table page. Topmatter is
// rows 0..topmatterPxH of the source (card header + column-header strip)
// and is repeated on every continuation page so the table never appears
// to start mid-stream.
function makeTableSlice(src, topmatterPxH, rowFromPx, rowToPx) {
  const sw = src.width;
  const rowsH = rowToPx - rowFromPx;
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = topmatterPxH + rowsH;
  const ctx = out.getContext('2d');
  ctx.fillStyle = COL.white;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0, sw, topmatterPxH, 0, 0, sw, topmatterPxH);
  ctx.drawImage(src, 0, rowFromPx, sw, rowsH, 0, topmatterPxH, sw, rowsH);
  return out;
}

// Build table slices. rowEdges[i] = { top, bottom } in canvas pixels for
// each <tbody> row. topmatterPxH is the y at which the first row starts.
// Each slice (after the first) repeats topmatter.
function buildTableSlices(canvas, rowEdges, topmatterPxH, maxSlicePxH) {
  if (rowEdges.length === 0) {
    return [makeSliceCanvas(canvas, 0, 0, canvas.width, canvas.height)];
  }

  const slices = [];

  // First slice: starts at canvas top (already includes topmatter inline).
  let i = 0;
  let firstSliceEnd = topmatterPxH;
  while (i < rowEdges.length && rowEdges[i].bottom - 0 <= maxSlicePxH) {
    firstSliceEnd = rowEdges[i].bottom;
    i++;
  }
  if (i === 0) {
    // First row alone is taller than a page (vanishingly unlikely) — force
    // include it even though it overflows; better than an empty page.
    firstSliceEnd = rowEdges[0].bottom;
    i = 1;
  }
  slices.push(makeSliceCanvas(canvas, 0, 0, canvas.width, firstSliceEnd));

  // Continuation slices: each starts with the topmatter band, then rows.
  while (i < rowEdges.length) {
    const rowFrom = rowEdges[i].top;
    let rowToIdx = i;
    let rowToBottom = rowEdges[i].bottom;
    // How many rows fit after the topmatter strip?
    const availForRows = maxSlicePxH - topmatterPxH;
    while (
      rowToIdx + 1 < rowEdges.length &&
      rowEdges[rowToIdx + 1].bottom - rowFrom <= availForRows
    ) {
      rowToIdx += 1;
      rowToBottom = rowEdges[rowToIdx].bottom;
    }
    slices.push(makeTableSlice(canvas, topmatterPxH, rowFrom, rowToBottom));
    i = rowToIdx + 1;
  }

  return slices;
}

// ────────────────────────────────────────────────────────────────────────
// Capture pipeline
// ────────────────────────────────────────────────────────────────────────

async function captureAll(sections) {
  const captures = [];
  for (const sec of sections) {
    const restore = liftRestraints(sec);
    try {
      const sectionRect = sec.getBoundingClientRect();
      const sectionTop = sectionRect.top;

      const isTable = sec.hasAttribute('data-pdf-table');
      let rowMetrics = null;
      let topmatterCss = 0;
      if (isTable) {
        const rows = Array.from(sec.querySelectorAll('tbody > tr'));
        rowMetrics = rows.map((r) => {
          const rr = r.getBoundingClientRect();
          return {
            top: rr.top - sectionTop,
            bottom: rr.top - sectionTop + rr.height,
          };
        });
        if (rowMetrics.length > 0) {
          topmatterCss = rowMetrics[0].top;
        }
      }

      const canvas = await captureSection(sec);
      const cssToCanvas = canvas.width / sectionRect.width;

      captures.push({
        title: sec.getAttribute('data-pdf-title') || '',
        subtitle: sec.getAttribute('data-pdf-subtitle') || '',
        isTable,
        canvas,
        cssToCanvas,
        rowMetrics,
        topmatterCss,
      });
    } finally {
      restore();
    }
  }
  return captures;
}

// Plan how each capture lays out (single page, fit-to-page, or sliced).
// Returns an array of "page jobs" describing what to draw on each page.
function planPages(captures) {
  const jobs = [];

  for (const cap of captures) {
    const ratio = cap.canvas.height / cap.canvas.width; // h/w in canvas px
    // At full content width, draw height in pt:
    const naturalDrawH = CONTENT_W * ratio;

    if (naturalDrawH <= CONTENT_H) {
      jobs.push({ kind: 'single', cap, fit: 'natural' });
      continue;
    }

    if (!cap.isTable && naturalDrawH <= CONTENT_H * 1.35) {
      jobs.push({ kind: 'single', cap, fit: 'shrink' });
      continue;
    }

    // Multi-page split.
    if (cap.isTable && cap.rowMetrics && cap.rowMetrics.length > 0) {
      const topmatterPx = cap.topmatterCss * cap.cssToCanvas;
      const rowEdgesPx = cap.rowMetrics.map((r) => ({
        top: r.top * cap.cssToCanvas,
        bottom: r.bottom * cap.cssToCanvas,
      }));
      // Convert page-content height (pt) into canvas px at our display width.
      const pxPerPt = cap.canvas.width / CONTENT_W;
      const maxSlicePxH = CONTENT_H * pxPerPt;
      const slices = buildTableSlices(cap.canvas, rowEdgesPx, topmatterPx, maxSlicePxH);
      slices.forEach((sliceCanvas, idx) => {
        jobs.push({
          kind: 'slice',
          cap,
          sliceCanvas,
          isFirstSlice: idx === 0,
          continuation: idx > 0,
        });
      });
    } else {
      // Generic vertical slicing for non-table tall sections.
      const pxPerPt = cap.canvas.width / CONTENT_W;
      const maxSlicePxH = CONTENT_H * pxPerPt;
      const slices = genericSlices(cap.canvas, maxSlicePxH);
      slices.forEach((sliceCanvas, idx) => {
        jobs.push({
          kind: 'slice',
          cap,
          sliceCanvas,
          isFirstSlice: idx === 0,
          continuation: idx > 0,
        });
      });
    }
  }

  return jobs;
}

function placeImage(pdf, sourceCanvas, fit) {
  const ratio = sourceCanvas.height / sourceCanvas.width;
  let drawW = CONTENT_W;
  let drawH = drawW * ratio;
  if (fit === 'shrink' && drawH > CONTENT_H) {
    const s = CONTENT_H / drawH;
    drawH = CONTENT_H;
    drawW = drawW * s;
  } else if (drawH > CONTENT_H) {
    // For slices: shouldn't normally exceed, but clamp defensively.
    const s = CONTENT_H / drawH;
    drawH = CONTENT_H;
    drawW = drawW * s;
  }
  const x = CONTENT_X + (CONTENT_W - drawW) / 2;
  const y = CONTENT_TOP + (CONTENT_H - drawH) / 2;
  const dataUrl = sourceCanvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
}

// ────────────────────────────────────────────────────────────────────────
// Public entry
// ────────────────────────────────────────────────────────────────────────

export async function exportDashboardPdf({ rows, allRows, company, timelineLabel, generatedAt }) {
  const sections = Array.from(document.querySelectorAll('[data-pdf-section]'));
  if (sections.length === 0) {
    throw new Error('No exportable sections found.');
  }

  // Cover-page KPIs derived from the same filtered set the dashboard shows.
  const totalCount = allRows.length;
  const filteredCount = rows.length;
  const acquired = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Acquired').length;
  const marketVals = rows
    .map((r) => Number(r[COLUMN_KEYS.MARKET_SIZE]))
    .filter((v) => !isNaN(v));
  const totalMarket = marketVals.length ? marketVals.reduce((a, b) => a + b, 0) : null;
  const chronic = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const chronicPct = filteredCount ? Math.round((chronic / filteredCount) * 100) : 0;

  const kpis = [
    { label: 'Launches in scope', value: String(filteredCount), sub: `${totalCount} tracked overall` },
    { label: 'Acquired launches', value: String(acquired), sub: filteredCount ? `${Math.round((acquired / filteredCount) * 100)}% of scope` : '' },
    { label: 'Total India market', value: totalMarket ? fmtINRCr(totalMarket) : 'NA', sub: 'public-data brands only' },
    { label: 'Chronic share', value: `${chronicPct}%`, sub: `${chronic} chronic launches` },
  ];

  document.body.classList.add('pdf-export-active');
  let pdf;
  try {
    // Kick off the jsPDF load in parallel with section captures.
    const jsPDFLoad = loadJsPDF();
    const captures = await captureAll(sections);
    const jobs = planPages(captures);

    const JsPDF = await jsPDFLoad;
    pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });

    const totalPages = 1 + jobs.length;

    // Page 1: cover.
    drawCover(pdf, {
      company,
      timelineLabel,
      generatedAt,
      kpis,
      filteredCount,
      totalCount,
    });

    // Pages 2..N
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      pdf.addPage();
      drawPageChrome(pdf, {
        title: job.cap.title,
        subtitle: job.cap.subtitle,
        pageNum: i + 2,
        totalPages,
        generatedAt,
        continuation: !!job.continuation,
      });
      if (job.kind === 'single') {
        placeImage(pdf, job.cap.canvas, job.fit);
      } else {
        placeImage(pdf, job.sliceCanvas, 'slice');
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const safeCompany = String(company || 'all-companies')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    pdf.save(`drug-launch-tracker-${safeCompany}-${stamp}.pdf`);
  } finally {
    document.body.classList.remove('pdf-export-active');
  }
}
