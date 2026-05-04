import {
  COLUMN_KEYS,
  COLUMN_ORDER,
  acquisitionDealKey,
  isAcquisitionParent,
} from '../data/mockData.js';

// CEO-level PDF export of the Drug Launch Tracker. Landscape A4 so all 17
// columns fit on one page row. Header (title + subtitle) draws once at the
// top of every page; column headers repeat at the top of each data page so
// the reader never loses context. Page numbers in the footer.
//
// Lazy-loads jsPDF + autotable on click (~110KB gz) so the main bundle
// stays slim — same pattern as the Excel export.
//
// Brand colour mirrors the dashboard: dark teal title band, dark navy
// column-header band, soft alternating row banding. Categorical columns
// (Launch Type, Regulatory Status, Chronic/Acute, Geographic Rights) get
// chip-style fills matching the on-screen colour code so an investor
// scanning the printout reads exactly the same visual hierarchy.

// ── Colour palette (RGB triples for jsPDF) ────────────────────────────
const C = {
  ink900:    [15, 23, 42],
  ink700:    [51, 65, 85],
  ink500:    [100, 116, 139],
  ink100:    [226, 232, 240],
  ink50:     [248, 250, 252],
  white:     [255, 255, 255],
  parentBg:  [238, 242, 246],
  bandRow:   [250, 251, 252],
  teal700:   [15, 118, 110],
  teal50:    [240, 253, 250],
  pharma50:  [236, 253, 245],
  pharma600: [22, 163, 74],
  pharma700: [4, 120, 87],
  emerald50: [236, 253, 245],
  emerald700:[4, 120, 87],
  amber50:   [255, 251, 235],
  amber700:  [180, 83, 9],
  orange50:  [255, 247, 237],
  orange700: [194, 65, 12],
  rose50:    [255, 241, 242],
  rose700:   [190, 18, 60],
  lime50:    [247, 254, 231],
  lime700:   [77, 124, 15],
};

const launchTypeFill = (t) => {
  if (t === 'Acquired')     return { bg: C.emerald50, fg: C.emerald700 };
  if (t === 'In-licensed')  return { bg: C.teal50,    fg: C.teal700 };
  if (t === 'Own Launched') return { bg: C.lime50,    fg: C.lime700 };
  return null;
};

const chronicFill = (t) => {
  if (t === 'Chronic') return { bg: C.pharma50, fg: C.pharma700 };
  if (t === 'Acute')   return { bg: C.amber50,  fg: C.amber700 };
  return null;
};

const regStatusFill = (t) => {
  if (!t) return null;
  if (/Approved/i.test(t))                              return { bg: C.emerald50, fg: C.emerald700 };
  if (/^Filed/i.test(t) || /^Pending/i.test(t))         return { bg: C.amber50,   fg: C.amber700 };
  if (/^Phase 3/i.test(t) || /^Phase 2/i.test(t))       return { bg: C.orange50,  fg: C.orange700 };
  if (/^Phase 1/i.test(t) || /^Pre-clinical/i.test(t))  return { bg: C.rose50,    fg: C.rose700 };
  return null;
};

// Per-column width (mm). Total budget for landscape A4 with 10mm side
// margins is 277mm; we aim for ~265 so cell padding + borders never push
// the table off the page (which was cropping the right edge in v1).
//
// PDF_COLUMN_ORDER deliberately drops two columns from the Excel/screen
// view: Pricing (specific MRP — insider detail) and Pre-existing Brand
// (buyer's earlier brand for the same molecule — useful in the table
// drawer but cluttering in a CEO print summary). The on-screen table and
// the Excel export still carry all 17; the PDF is the curated print
// deliverable. Drop list lives here so it's easy to flip a column back
// in if a stakeholder asks.
const PDF_COLUMN_ORDER = COLUMN_ORDER.filter(
  (c) => c !== COLUMN_KEYS.PRICING && c !== COLUMN_KEYS.PRE_EXISTING_BRAND
);

const COLUMN_WIDTHS_MM = {
  [COLUMN_KEYS.BRAND]:              26,
  [COLUMN_KEYS.LAUNCH_TYPE]:        17,
  [COLUMN_KEYS.DATE]:               14,
  [COLUMN_KEYS.SELLER]:             24,
  [COLUMN_KEYS.BUYER]:              17,
  [COLUMN_KEYS.DEAL_TYPE]:          19,
  [COLUMN_KEYS.GEO_RIGHTS]:         18,
  [COLUMN_KEYS.REG_STATUS]:         22,
  [COLUMN_KEYS.MOLECULE]:           26,
  [COLUMN_KEYS.THERAPY]:            20,
  [COLUMN_KEYS.INDICATION]:         24,
  [COLUMN_KEYS.MARKET_SIZE]:        13,
  [COLUMN_KEYS.DEAL_VALUE]:         15,
  [COLUMN_KEYS.COMPETITOR_BRANDS]:  16,
  [COLUMN_KEYS.CHRONIC_ACUTE]:      14,
};

// Short header label override for narrow columns whose full Excel-style
// label ("Acquired / In-licensed / Own Launched") wouldn't fit at 7pt.
const HEADER_OVERRIDES = {
  [COLUMN_KEYS.LAUNCH_TYPE]:        'Launch Type',
  [COLUMN_KEYS.MARKET_SIZE]:        'India TAM\n(₹Cr)',
  [COLUMN_KEYS.DEAL_VALUE]:         'Deal Value\n(₹Cr)',
  [COLUMN_KEYS.PRE_EXISTING_BRAND]: "Buyer's Pre-\nexisting Brand",
  [COLUMN_KEYS.COMPETITOR_BRANDS]:  'Competitor\nBrands',
  [COLUMN_KEYS.GEO_RIGHTS]:         'Geographic\nRights',
  [COLUMN_KEYS.REG_STATUS]:         'Regulatory\nStatus',
  [COLUMN_KEYS.INDICATION]:         'Disease /\nIndication',
  [COLUMN_KEYS.CHRONIC_ACUTE]:      'Chronic /\nAcute',
};

// Strip em-dash / null / undefined into a plain hyphen for print legibility
// (some PDF fonts choke on the wide en-dash glyph at small point sizes).
function cellText(v) {
  if (v === null || v === undefined || v === '' || v === '—') return '-';
  if (typeof v === 'string') return v.replace(/—/g, '-');
  return String(v);
}

// Numeric ₹Cr format that matches the dashboard's currency style.
function fmtRupeeCr(v) {
  if (v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return cellText(v);
  return `₹${n.toLocaleString('en-IN')} Cr`;
}

// Date column: render as the same "DD MMM YYYY" the dashboard uses.
function fmtDateCell(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}

// Right-align $/numeric columns; centre chip / discrete-value columns;
// left-align everything else. autoTable applies this per-column.
function alignFor(col) {
  if (
    col === COLUMN_KEYS.MARKET_SIZE ||
    col === COLUMN_KEYS.DEAL_VALUE ||
    col === COLUMN_KEYS.PRICING
  ) return 'right';
  if (
    col === COLUMN_KEYS.LAUNCH_TYPE ||
    col === COLUMN_KEYS.DATE ||
    col === COLUMN_KEYS.GEO_RIGHTS ||
    col === COLUMN_KEYS.REG_STATUS ||
    col === COLUMN_KEYS.CHRONIC_ACUTE ||
    col === COLUMN_KEYS.DEAL_TYPE
  ) return 'center';
  return 'left';
}

export async function exportPdf({
  topLevelRows,
  childrenByKey,
  fileName = 'drug_launch_tracker.pdf',
  generatedAt = new Date(),
}) {
  // Lazy-load both libraries. jspdf-autotable v5 changed its API: the
  // default export is a function `autoTable(doc, opts)` that applies the
  // plugin per-call rather than attaching to the jsPDF prototype, so
  // `doc.autoTable(...)` is undefined under modern bundlers.
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;

  // Flatten parent + children into a single ordered list. Mirrors the
  // Excel export so both deliverables represent the same row sequence.
  const flat = [];
  for (const r of topLevelRows) {
    flat.push({ row: r, isChild: false });
    if (isAcquisitionParent(r)) {
      const kids = childrenByKey.get(acquisitionDealKey(r)) || [];
      for (const k of kids) flat.push({ row: k, isChild: true });
    }
  }

  // Build the autotable input. Body cell values go through cellText / the
  // per-column formatter; styling decisions happen in didParseCell so we
  // can react to the actual value.
  const head = [
    PDF_COLUMN_ORDER.map((c) => HEADER_OVERRIDES[c] || c),
  ];
  const body = flat.map(({ row, isChild }) =>
    PDF_COLUMN_ORDER.map((col) => {
      const v = row[col];
      if (col === COLUMN_KEYS.DATE) return fmtDateCell(v);
      if (col === COLUMN_KEYS.MARKET_SIZE || col === COLUMN_KEYS.DEAL_VALUE) {
        return fmtRupeeCr(v);
      }
      if (col === COLUMN_KEYS.BRAND) {
        // Indent child rows under their parent so the tree relationship
        // survives the print, same as the on-screen "└" marker.
        return `${isChild ? '  ↳ ' : ''}${cellText(v).replace(/\s*\(parent\)\s*$/i, '')}`;
      }
      return cellText(v);
    })
  );

  // Per-column style spec for autoTable (column widths + alignment).
  const columnStyles = {};
  PDF_COLUMN_ORDER.forEach((col, i) => {
    columnStyles[i] = {
      cellWidth: COLUMN_WIDTHS_MM[col] || 16,
      halign: alignFor(col),
    };
  });

  // Title band — drawn once per page via the didDrawPage hook so it
  // repeats automatically on continuation pages.
  const drawHeader = () => {
    doc.setFillColor(...C.teal50);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(...C.teal700);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Drug Launch Tracker — India Pharma', marginX, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.ink500);
    const subtitle = `Generated ${generatedAt.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: '2-digit',
    })}  ·  ${flat.length} row${flat.length === 1 ? '' : 's'}  ·  curated baseline + daily scrape`;
    doc.text(subtitle, marginX, 15);
  };

  const drawFooter = (data) => {
    const total = doc.internal.getNumberOfPages();
    doc.setFontSize(7.5);
    doc.setTextColor(...C.ink500);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Source: company press releases · BSE / NSE filings · 1mg.com pricing',
      marginX,
      pageHeight - 5
    );
    const pageLabel = `Page ${data.pageNumber} of ${total}`;
    const w = doc.getTextWidth(pageLabel);
    doc.text(pageLabel, pageWidth - marginX - w, pageHeight - 5);
  };

  autoTable(doc, {
    head,
    body,
    startY: 22,
    margin: { top: 22, right: marginX, bottom: 12, left: marginX },
    theme: 'grid',
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
      lineColor: C.ink100,
      lineWidth: 0.1,
      textColor: C.ink700,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: C.ink900,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      lineColor: C.ink900,
      cellPadding: { top: 2.5, right: 1.5, bottom: 2.5, left: 1.5 },
    },
    alternateRowStyles: { fillColor: C.bandRow },
    columnStyles,
    didParseCell: (data) => {
      // Body-only styling — leave header rows alone.
      if (data.section !== 'body') return;
      const colKey = PDF_COLUMN_ORDER[data.column.index];
      const flatIndex = data.row.index;
      const meta = flat[flatIndex];
      if (!meta) return;
      const { row, isChild } = meta;
      const isParent = isAcquisitionParent(row);

      // Parent rows get a tinted band + bold across the whole row so the
      // deal envelope reads as a header for its children below.
      if (isParent) {
        data.cell.styles.fillColor = C.parentBg;
        data.cell.styles.fontStyle = 'bold';
      }

      // Brand column always bold; child rows slightly dimmer.
      if (colKey === COLUMN_KEYS.BRAND) {
        data.cell.styles.fontStyle = 'bold';
        if (isChild) data.cell.styles.textColor = C.ink700;
      }

      // Chip-fill overrides — only on real-data (non-parent) rows so the
      // tinted parent band doesn't get fragmented by chip colours.
      if (!isParent) {
        const v = row[colKey];
        let fill = null;
        if (colKey === COLUMN_KEYS.LAUNCH_TYPE) fill = launchTypeFill(v);
        else if (colKey === COLUMN_KEYS.CHRONIC_ACUTE) fill = chronicFill(v);
        else if (colKey === COLUMN_KEYS.REG_STATUS) fill = regStatusFill(v);
        else if (colKey === COLUMN_KEYS.GEO_RIGHTS && v && v !== '—' && v !== '-') {
          fill = { bg: C.pharma50, fg: C.pharma700 };
        }
        if (fill) {
          data.cell.styles.fillColor = fill.bg;
          data.cell.styles.textColor = fill.fg;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      drawHeader();
      drawFooter(data);
    },
  });

  doc.save(fileName);
}
