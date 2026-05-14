// PDF export for the Drug Launch Tracker dashboard.
//
// Produces a CEO-grade A4 landscape report:
//   • Cover page  — title, scope, generation timestamp, headline KPIs.
//   • Section pages — one section per <section data-pdf-section> on the page,
//     each with a branded page header (section title + subtitle) and a
//     numbered footer.
//
// Page-break rules (the "no chart/table cut in half" requirement):
//   1. Each chart / KPI section is captured as its own canvas, never
//      spanning a break with arbitrary content.
//   2. A captured section ≤ one page tall is placed on a single page;
//      two short sections may be packed onto one page.
//   3. A section up to ~1.35× a page tall is uniformly scaled down to
//      fit one page — keeps charts intact.
//   4. The Drug Launch Tracker table (data-pdf-table) is NOT captured as
//      an image. It is drawn natively with jspdf-autotable — the same
//      renderer the standalone table export uses — so all 17 columns fit
//      one landscape page width and rows paginate cleanly with the column
//      header repeated on every page.

// jsPDF + html2canvas-pro are heavy (~600 KB minified combined) and only
// needed when the user clicks Export PDF. Defer their load with dynamic
// import so the initial dashboard bundle stays lean.
import { COLUMN_KEYS, groupAcquisitionRows } from '../data/mockData';

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

// Force every section to render at this width during capture. The
// dashboard's outer container is `max-w-[1840px]`, so this width matches
// the layout at full desktop breakpoint — Tailwind's `lg:` / `xl:` /
// `2xl:` classes activate and nothing flex-wraps to a vertical stack just
// because the user happened to take the export at a 1280-wide window.
const FORCED_CAPTURE_WIDTH = 1600;

// Vertical gap between two packed sections on the same page.
const PACK_GAP_PT = 18;

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

// ────────────
// Cover page
// ────────────
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

// ────────────
// Section page chrome (header + footer)
// ────────────
function drawPageChrome(pdf, { title, subtitle, generatedAt, continuation }) {
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

  // Footer text. The page number is stamped separately in a final pass
  // (drawPageNumber) once the true total page count is known — the Drug
  // Launch Tracker table self-paginates via autoTable, so the total
  // isn't known while chrome is being drawn.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COL.ink500);
  pdf.text(`Generated ${safe(generatedAt)}  ·  Confidential`, MARGIN, PAGE_H - MARGIN - 6);
}

// Stamp "Page X of Y" bottom-right. Run as a final pass over every
// content page after the whole document is laid out, so Y reflects the
// real total including the table's self-paginated continuation pages.
function drawPageNumber(pdf, pageNum, totalPages) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COL.ink500);
  const pageText = `Page ${pageNum} of ${totalPages}`;
  const ptw = pdf.getTextWidth(pageText);
  pdf.text(pageText, PAGE_W - MARGIN - ptw, PAGE_H - MARGIN - 6);
}

// ────────────
// Capture helpers
// ────────────

// Pin the dashboard layout to its full desktop width and lift internal
// scroll containers (data-pdf-scroller) for the duration of measurement +
// capture. Without this, captures taken on a narrow viewport flex-wrap
// the section's controls into a vertical stack and leave huge gaps on
// the PDF page. Returns a restore function — always call it in finally.
function lockWideLayoutAndLiftRestraints(section) {
  const restorers = [];

  const lockEl = (el, styles) => {
    const orig = {};
    for (const k of Object.keys(styles)) orig[k] = el.style[k];
    Object.assign(el.style, styles);
    restorers.push(() => Object.assign(el.style, orig));
  };

  // Pin the section AND its <main> ancestor to a fixed wide width so
  // responsive utilities resolve at the desktop breakpoint, not the
  // user's actual viewport.
  const main = section.closest('main') || document.querySelector('main');
  if (main) {
    lockEl(main, {
      width: `${FORCED_CAPTURE_WIDTH}px`,
      minWidth: `${FORCED_CAPTURE_WIDTH}px`,
      maxWidth: `${FORCED_CAPTURE_WIDTH}px`,
    });
  }
  lockEl(section, {
    width: `${FORCED_CAPTURE_WIDTH - 32}px`,
    minWidth: `${FORCED_CAPTURE_WIDTH - 32}px`,
  });

  // Hide the body scrollbar so the user doesn't briefly see the dashboard
  // overflow horizontally when we widen the layout beyond their viewport.
  lockEl(document.body, { overflow: 'hidden' });

  // Lift internal scroll containers (e.g. the table's max-h-[640px]).
  section.querySelectorAll('[data-pdf-scroller]').forEach((el) => {
    lockEl(el, {
      maxHeight: 'none',
      overflow: 'visible',
      overflowX: 'visible',
      overflowY: 'visible',
    });
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
    // Tell the cloned document its viewport is FORCED_CAPTURE_WIDTH so
    // CSS media queries (Tailwind responsive utilities) match the
    // desktop breakpoint regardless of the user's actual window size.
    windowWidth: FORCED_CAPTURE_WIDTH,
    windowHeight: Math.max(section.scrollHeight, 900) + 200,
    width: section.offsetWidth,
    height: section.scrollHeight,
    onclone: (doc, cloned) => {
      cloned.classList.add('pdf-export-clone');
      doc.querySelectorAll('[data-pdf-no-capture]').forEach((el) => {
        el.style.display = 'none';
      });
      if (doc.body) doc.body.style.background = '#ffffff';
    },
  });
}

// ────────────
// Slice composition (vertical strips for tall captured sections)
// ────────────

// Slice a tall section's canvas into vertical strips that each fit one
// page. Used for chart sections that exceed ~1.35× a page; the data
// table is never sliced this way — it is drawn natively instead.
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

// ────────────
// Capture pipeline
// ────────────

// Walk the dashboard sections in document order. Every section is
// rasterised with html2canvas EXCEPT the Drug Launch Tracker table
// (data-pdf-table): that one is emitted as a lightweight marker and
// drawn natively later, so its 17 columns fit one landscape page width
// instead of being captured as a column-cropping image.
async function captureAll(sections) {
  const items = [];
  for (const sec of sections) {
    if (sec.hasAttribute('data-pdf-table')) {
      items.push({
        isNativeTable: true,
        // isTable also stops planPages from packing an image section
        // onto the same page as the table.
        isTable: true,
        title: sec.getAttribute('data-pdf-title') || 'Drug Launch Tracker',
        subtitle: sec.getAttribute('data-pdf-subtitle') || '',
      });
      continue;
    }
    const restore = lockWideLayoutAndLiftRestraints(sec);
    try {
      const canvas = await captureSection(sec);
      items.push({
        title: sec.getAttribute('data-pdf-title') || '',
        subtitle: sec.getAttribute('data-pdf-subtitle') || '',
        isTable: false,
        canvas,
      });
    } finally {
      restore();
    }
  }
  return items;
}

// Natural draw height of a canvas at full PDF content width, in pt.
const naturalDrawHpt = (cap) =>
  CONTENT_W * (cap.canvas.height / cap.canvas.width);

// Plan how each capture lays out. A page can hold one tall section (or
// slice of one), one short section anchored to the top, or two short
// sections stacked. The packing logic prevents the wasteful "single
// short section centered on a near-empty page" output.
function planPages(items) {
  const jobs = [];
  let i = 0;
  while (i < items.length) {
    const cap = items[i];

    // The Drug Launch Tracker table is drawn natively and self-paginates
    // — emit a single job; the emitter runs the autotable renderer, which
    // adds however many pages the row count needs.
    if (cap.isNativeTable) {
      jobs.push({ kind: 'nativeTable', cap });
      i++;
      continue;
    }

    const naturalH = naturalDrawHpt(cap);

    // Tall section that won't fit one page → shrink content that is only
    // modestly over a page, or slice very tall content into clean strips.
    if (naturalH > CONTENT_H) {
      if (naturalH <= CONTENT_H * 1.35) {
        jobs.push({ kind: 'single', cap, fit: 'shrink' });
        i++;
        continue;
      }
      const pxPerPt = cap.canvas.width / CONTENT_W;
      const maxSlicePxH = CONTENT_H * pxPerPt;
      const slices = genericSlices(cap.canvas, maxSlicePxH);
      slices.forEach((sliceCanvas, idx) => {
        jobs.push({
          kind: 'slice',
          cap,
          sliceCanvas,
          continuation: idx > 0,
        });
      });
      i++;
      continue;
    }

    // Section fits on one page — see if we can pack the next short
    // section onto the same page underneath it. The native table marker
    // carries isTable, so it is never packed onto another section's page.
    const next = items[i + 1];
    if (next && !next.isTable) {
      const nextH = naturalDrawHpt(next);
      if (nextH <= CONTENT_H && naturalH + PACK_GAP_PT + nextH <= CONTENT_H) {
        jobs.push({ kind: 'pair', cap1: cap, cap2: next });
        i += 2;
        continue;
      }
    }

    jobs.push({ kind: 'single', cap, fit: 'natural' });
    i++;
  }
  return jobs;
}

// Place a single captured image on the page. Top-anchored — empty space
// (when content is shorter than the page) drops to the bottom where it
// reads as deliberate breathing room rather than a broken layout.
function placeImage(pdf, sourceCanvas, fit, opts = {}) {
  const ratio = sourceCanvas.height / sourceCanvas.width;
  let drawW = CONTENT_W;
  let drawH = drawW * ratio;
  const maxH = opts.maxH ?? CONTENT_H;
  if (drawH > maxH) {
    const s = maxH / drawH;
    drawH = maxH;
    drawW = drawW * s;
  } else if (fit === 'shrink' && drawH > maxH) {
    const s = maxH / drawH;
    drawH = maxH;
    drawW = drawW * s;
  }
  const x = CONTENT_X + (CONTENT_W - drawW) / 2;
  const y = (opts.top ?? CONTENT_TOP);
  const dataUrl = sourceCanvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');
  return { drawW, drawH, x, y };
}

// Two stacked images on a single page: top-anchored, equal-priority
// presentation. A thin divider rule sits between them so the page doesn't
// read as one continuous block.
function placePair(pdf, cap1, cap2) {
  const placed1 = placeImage(pdf, cap1.canvas, 'natural', {
    top: CONTENT_TOP,
    maxH: CONTENT_H,
  });
  const dividerY = placed1.y + placed1.drawH + PACK_GAP_PT / 2;
  pdf.setDrawColor(COL.ink300);
  pdf.setLineWidth(0.4);
  pdf.line(CONTENT_X + 40, dividerY, CONTENT_X + CONTENT_W - 40, dividerY);
  placeImage(pdf, cap2.canvas, 'natural', {
    top: placed1.y + placed1.drawH + PACK_GAP_PT,
    maxH: CONTENT_H - placed1.drawH - PACK_GAP_PT,
  });
}

// ────────────
// Public entry
// ────────────

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
    // Kick off the heavy-module loads in parallel with section captures.
    // drawTrackerTable lives in exportPdf.js and is shared with the
    // standalone table export — lazy-imported so it stays out of the
    // initial dashboard bundle.
    const jsPDFLoad = loadJsPDF();
    const trackerLoad = import('./exportPdf').then((m) => m.drawTrackerTable);
    const items = await captureAll(sections);
    const jobs = planPages(items);

    const JsPDF = await jsPDFLoad;
    const drawTrackerTable = await trackerLoad;
    pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });

    // The Drug Launch Tracker section is drawn natively, so build the
    // parent-anchored row hierarchy its renderer expects. Top-level rows
    // go date-descending to match the dashboard's default table sort;
    // children stay in input order under their parent.
    const grouped = groupAcquisitionRows(rows);
    const topLevelRows = [...grouped.topLevel].sort(
      (a, b) =>
        new Date(b[COLUMN_KEYS.DATE]).getTime() -
        new Date(a[COLUMN_KEYS.DATE]).getTime()
    );
    const childrenByKey = grouped.childrenByKey;

    // Page 1: cover.
    drawCover(pdf, {
      company,
      timelineLabel,
      generatedAt,
      kpis,
      filteredCount,
      totalCount,
    });

    // Pages 2..N — one page per image job; the native-table job draws
    // itself and may span several continuation pages.
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      pdf.addPage();

      if (job.kind === 'nativeTable') {
        // autoTable self-paginates; its didDrawPage hook draws the page
        // chrome on every page it produces (first + continuations).
        let tablePage = 0;
        await drawTrackerTable(pdf, {
          topLevelRows,
          childrenByKey,
          // Scale all 17 columns to fill the content width — the fix:
          // columns fit one landscape page width, never cropped.
          tableWidth: CONTENT_W - 6,
          startY: CONTENT_TOP,
          margin: {
            top: CONTENT_TOP,
            bottom: PAGE_H - CONTENT_BOTTOM,
            left: MARGIN + 3,
            right: MARGIN + 3,
          },
          unit: 'pt',
          didDrawPage: () => {
            drawPageChrome(pdf, {
              title: job.cap.title,
              subtitle: job.cap.subtitle,
              generatedAt,
              continuation: tablePage > 0,
            });
            tablePage += 1;
          },
        });
        continue;
      }

      if (job.kind === 'pair') {
        drawPageChrome(pdf, {
          title: `${job.cap1.title}  +  ${job.cap2.title}`,
          subtitle: job.cap1.subtitle || job.cap2.subtitle || '',
          generatedAt,
          continuation: false,
        });
        placePair(pdf, job.cap1, job.cap2);
        continue;
      }

      drawPageChrome(pdf, {
        title: job.cap.title,
        subtitle: job.cap.subtitle,
        generatedAt,
        continuation: !!job.continuation,
      });
      if (job.kind === 'single') {
        placeImage(pdf, job.cap.canvas, job.fit);
      } else {
        placeImage(pdf, job.sliceCanvas, 'slice');
      }
    }

    // Final pass: stamp "Page X of Y" on every page after the cover, now
    // that the true total — including the table's self-paginated pages —
    // is known.
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      pdf.setPage(p);
      drawPageNumber(pdf, p, totalPages);
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
