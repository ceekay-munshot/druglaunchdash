import ExcelJS from 'exceljs';
import {
  COLUMN_KEYS,
  COLUMN_ORDER,
  acquisitionDealKey,
  isAcquisitionParent,
} from '../data/mockData.js';

// Tailwind palette → ARGB hex (FF prefix = full opacity). Mirrors the on-
// screen chips so the spreadsheet feels like a printed version of the
// dashboard rather than a raw CSV dump.
const C = {
  ink900:     'FF0F172A',
  ink700:     'FF334155',
  ink500:     'FF64748B',
  ink100:     'FFE2E8F0',
  white:      'FFFFFFFF',
  bandRow:    'FFFAFBFC',
  parentBg:   'FFEEF2F6',
  pharma50:   'FFECFDF5',
  pharma700:  'FF047857',
  teal50:     'FFF0FDFA',
  teal100:    'FFCCFBF1',
  teal700:    'FF0F766E',
  lime50:     'FFF7FEE7',
  lime700:    'FF4D7C0F',
  amber50:    'FFFFFBEB',
  amber700:   'FFB45309',
  emerald50:  'FFECFDF5',
  emerald700: 'FF047857',
  orange50:   'FFFFF7ED',
  orange700:  'FFC2410C',
  rose50:     'FFFFF1F2',
  rose700:    'FFBE123C',
  slate50:    'FFF8FAFC',
};

const COLUMN_WIDTHS = {
  [COLUMN_KEYS.BRAND]:              30,
  [COLUMN_KEYS.LAUNCH_TYPE]:        16,
  [COLUMN_KEYS.DATE]:               14,
  [COLUMN_KEYS.SELLER]:             28,
  [COLUMN_KEYS.BUYER]:              22,
  [COLUMN_KEYS.DEAL_TYPE]:          24,
  [COLUMN_KEYS.GEO_RIGHTS]:         24,
  [COLUMN_KEYS.REG_STATUS]:         26,
  [COLUMN_KEYS.MOLECULE]:           36,
  [COLUMN_KEYS.PRICING]:            34,
  [COLUMN_KEYS.THERAPY]:            26,
  [COLUMN_KEYS.INDICATION]:         34,
  [COLUMN_KEYS.MARKET_SIZE]:        18,
  [COLUMN_KEYS.DEAL_VALUE]:         20,
  [COLUMN_KEYS.PRE_EXISTING_BRAND]: 24,
  [COLUMN_KEYS.COMPETITOR_BRANDS]:  28,
  [COLUMN_KEYS.CHRONIC_ACUTE]:      14,
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

const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const thin = (argb = C.ink100) => ({ style: 'thin', color: { argb } });
const allBorders = (argb = C.ink100) => ({
  top: thin(argb), bottom: thin(argb), left: thin(argb), right: thin(argb),
});

// Single chip-column post-pass that applies background + bold text in the
// chip's accent colour, on top of the row's existing fill/font.
function applyChip(cell, fill) {
  if (!fill) return;
  cell.fill = solidFill(fill.bg);
  cell.font = { ...cell.font, bold: true, color: { argb: fill.fg } };
}

export async function exportXlsx({
  topLevelRows,
  childrenByKey,
  fileName = 'drug_launch_tracker.xlsx',
  generatedAt = new Date(),
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Drug Launch Tracker';
  wb.lastModifiedBy = 'Drug Launch Tracker';
  wb.created = generatedAt;
  wb.modified = generatedAt;

  // Freeze the top 4 rows (title + subtitle + spacer + header) and the
  // Brand column so investors can scroll horizontally without losing
  // context on which brand they're looking at.
  const sheet = wb.addWorksheet('Launches', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    properties: { defaultRowHeight: 18 },
  });

  // ── Row 1: Title ──
  sheet.addRow(['Drug Launch Tracker — India Pharma']);
  sheet.mergeCells(1, 1, 1, COLUMN_ORDER.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.teal700 } };
  titleCell.fill = solidFill(C.teal50);
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 32;

  // ── Row 2: Subtitle ──
  // Count rows in the actual flattened export (parent + children).
  let exportCount = 0;
  for (const r of topLevelRows) {
    exportCount += 1;
    if (isAcquisitionParent(r)) {
      exportCount += (childrenByKey.get(acquisitionDealKey(r)) || []).length;
    }
  }
  const niceDate = generatedAt.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
  sheet.addRow([
    `Generated ${niceDate} · ${exportCount} row${exportCount === 1 ? '' : 's'} · curated baseline + daily scrape`,
  ]);
  sheet.mergeCells(2, 1, 2, COLUMN_ORDER.length);
  const subCell = sheet.getCell(2, 1);
  subCell.font = { name: 'Calibri', size: 10.5, italic: true, color: { argb: C.ink500 } };
  subCell.fill = solidFill(C.teal50);
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 18;

  // ── Row 3: thin spacer for visual breathing room ──
  sheet.addRow([]);
  sheet.getRow(3).height = 6;

  // ── Row 4: Column headers ──
  const headerRow = sheet.addRow(COLUMN_ORDER);
  headerRow.height = 34;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: C.white } };
    cell.fill = solidFill(C.ink900);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: thin(C.ink900),
      left: thin(C.ink900),
      right: thin(C.ink900),
      bottom: { style: 'medium', color: { argb: C.teal700 } },
    };
  });

  // ── Data rows ──
  // Flatten parent + children in display order so the workbook reads top-
  // to-bottom the same way the dashboard does.
  const flat = [];
  for (const r of topLevelRows) {
    flat.push({ row: r, isChild: false });
    if (isAcquisitionParent(r)) {
      const kids = childrenByKey.get(acquisitionDealKey(r)) || [];
      for (const k of kids) flat.push({ row: k, isChild: true });
    }
  }

  flat.forEach(({ row, isChild }, idx) => {
    const isParent = isAcquisitionParent(row);
    const banded = idx % 2 === 1;

    const values = COLUMN_ORDER.map((col) => {
      const v = row[col];
      if (v === null || v === undefined || v === '' || v === '—') return '-';
      // Keep Market Size / Deal Value as numbers so Excel sorts them as
      // numbers and the custom ₹ format applies.
      if (col === COLUMN_KEYS.MARKET_SIZE || col === COLUMN_KEYS.DEAL_VALUE) {
        const n = Number(v);
        return Number.isFinite(n) ? n : '-';
      }
      // Date as Date object so the dd-mmm-yyyy numFmt applies.
      if (col === COLUMN_KEYS.DATE) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v) : d;
      }
      // Pricing comes through as either a number or a free-text string
      // ("₹190 / strip of 10"). Either way we render as text — Excel can't
      // do mixed-format columns cleanly.
      return String(v).replace(/—/g, '-');
    });

    const r = sheet.addRow(values);
    r.height = isParent ? 22 : 19;

    r.eachCell((cell, colIdx) => {
      const colKey = COLUMN_ORDER[colIdx - 1];

      // Body defaults — overridden below per column / chip rules.
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: C.ink700 } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.border = allBorders();

      // Row-level fill: parent rows get a tinted band; non-parent rows get
      // soft alternating banding for readability across long rows.
      if (isParent) {
        cell.fill = solidFill(C.parentBg);
      } else if (banded) {
        cell.fill = solidFill(C.bandRow);
      }

      // Brand — bold; children indented 2 levels under their parent.
      if (colKey === COLUMN_KEYS.BRAND) {
        cell.font = {
          name: 'Calibri',
          size: 11,
          bold: true,
          color: { argb: isParent ? C.ink900 : C.ink700 },
        };
        cell.alignment = { ...cell.alignment, indent: isChild ? 2 : 0 };
      }

      // Date — centered + dd-mmm-yyyy format.
      if (colKey === COLUMN_KEYS.DATE) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
        if (cell.value instanceof Date) cell.numFmt = 'dd-mmm-yyyy';
      }

      // ₹Cr columns — right-aligned with custom format. "₹13,630 Cr"
      if (colKey === COLUMN_KEYS.MARKET_SIZE || colKey === COLUMN_KEYS.DEAL_VALUE) {
        cell.alignment = { ...cell.alignment, horizontal: 'right' };
        if (typeof cell.value === 'number') cell.numFmt = '"₹"#,##0" Cr"';
      }

      // Pricing — right-aligned text.
      if (colKey === COLUMN_KEYS.PRICING) {
        cell.alignment = { ...cell.alignment, horizontal: 'right' };
      }

      // Centered chip / discrete-value columns.
      if (
        colKey === COLUMN_KEYS.LAUNCH_TYPE ||
        colKey === COLUMN_KEYS.GEO_RIGHTS ||
        colKey === COLUMN_KEYS.REG_STATUS ||
        colKey === COLUMN_KEYS.CHRONIC_ACUTE ||
        colKey === COLUMN_KEYS.THERAPY ||
        colKey === COLUMN_KEYS.DEAL_TYPE
      ) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      }

      // Chip-fill overrides — only on real-data (non-parent) rows so the
      // tinted parent band doesn't get fragmented by chips.
      if (!isParent) {
        if (colKey === COLUMN_KEYS.LAUNCH_TYPE) applyChip(cell, launchTypeFill(row[colKey]));
        if (colKey === COLUMN_KEYS.CHRONIC_ACUTE) applyChip(cell, chronicFill(row[colKey]));
        if (colKey === COLUMN_KEYS.REG_STATUS) applyChip(cell, regStatusFill(row[colKey]));
        if (colKey === COLUMN_KEYS.GEO_RIGHTS && row[colKey] && row[colKey] !== '-') {
          applyChip(cell, { bg: C.pharma50, fg: C.pharma700 });
        }
      }
    });
  });

  // Column widths.
  COLUMN_ORDER.forEach((col, i) => {
    sheet.getColumn(i + 1).width = COLUMN_WIDTHS[col] || 18;
  });

  // Auto-filter on the header row + data range so investors can slice by
  // any column in Excel directly.
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to:   { row: 4 + flat.length, column: COLUMN_ORDER.length },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
