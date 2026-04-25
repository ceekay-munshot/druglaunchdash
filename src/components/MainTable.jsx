import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Table as TableIcon, Download } from 'lucide-react';
import { COLUMN_KEYS, COLUMN_ORDER } from '../data/mockData';
import { fmtINRPlain, fmtDate } from '../utils/format';
import RowDetailDrawer from './RowDetailDrawer';

const LAUNCH_TYPE_STYLES = {
  Acquired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In-licensed': 'bg-teal-50 text-teal-700 border-teal-200',
  'Own Launched': 'bg-lime-50 text-lime-700 border-lime-200',
};

const CHRONIC_STYLES = {
  Chronic: 'bg-pharma-50 text-pharma-700 border-pharma-200',
  Acute: 'bg-amber-50 text-amber-700 border-amber-200',
};

const NUMERIC_COLS = new Set([COLUMN_KEYS.MARKET_SIZE, COLUMN_KEYS.PRICING]);

// Per-column min-width — keeps long-text columns from collapsing while
// short columns (Date, Chronic/Acute) stay tight.
const WIDTH_HINT = {
  [COLUMN_KEYS.BRAND]: 'min-w-[170px]',
  [COLUMN_KEYS.LAUNCH_TYPE]: 'min-w-[140px]',
  [COLUMN_KEYS.DATE]: 'min-w-[120px]',
  [COLUMN_KEYS.SELLER]: 'min-w-[180px]',
  [COLUMN_KEYS.BUYER]: 'min-w-[160px]',
  [COLUMN_KEYS.DEAL_TYPE]: 'min-w-[180px]',
  [COLUMN_KEYS.MOLECULE]: 'min-w-[230px]',
  [COLUMN_KEYS.PRICING]: 'min-w-[260px]',
  [COLUMN_KEYS.THERAPY]: 'min-w-[240px]',
  [COLUMN_KEYS.INDICATION]: 'min-w-[210px]',
  [COLUMN_KEYS.MARKET_SIZE]: 'min-w-[140px]',
  [COLUMN_KEYS.EXISTING_BRAND]: 'min-w-[180px]',
  [COLUMN_KEYS.CHRONIC_ACUTE]: 'min-w-[120px]',
};

// Per-column alignment. Discrete-value columns (Date, Launch Type,
// Chronic/Acute) are centered for a clean grid; numeric columns are
// right-aligned for tabular comparison; text columns stay left-aligned.
// Headers and cells share the same alignment so the table reads as a
// crisp aligned grid.
const ALIGN = {
  [COLUMN_KEYS.LAUNCH_TYPE]: 'center',
  [COLUMN_KEYS.DATE]: 'center',
  [COLUMN_KEYS.DEAL_TYPE]: 'center',
  [COLUMN_KEYS.THERAPY]: 'center',
  [COLUMN_KEYS.PRICING]: 'right',
  [COLUMN_KEYS.MARKET_SIZE]: 'right',
  [COLUMN_KEYS.CHRONIC_ACUTE]: 'center',
};

const alignClass = (col) => {
  const a = ALIGN[col];
  if (a === 'right') return 'text-right';
  if (a === 'center') return 'text-center';
  return 'text-left';
};

const headerJustify = (col) => {
  const a = ALIGN[col];
  if (a === 'right') return 'justify-end';
  if (a === 'center') return 'justify-center';
  return 'justify-start';
};

export default function MainTable({ rows, allRows, selectedCompany }) {
  const [tableQuery, setTableQuery] = useState('');
  const [sortKey, setSortKey] = useState(COLUMN_KEYS.DATE);
  const [sortDir, setSortDir] = useState('desc');
  const [activeRow, setActiveRow] = useState(null);

  // When a specific company is selected from the Header dropdown, the Buyer
  // column is redundant (every row has the same Buyer = selected company), so
  // we hide it. When "All Companies" is selected, we show it.
  const visibleColumns = selectedCompany && selectedCompany !== '__ALL__'
    ? COLUMN_ORDER.filter((c) => c !== COLUMN_KEYS.BUYER)
    : COLUMN_ORDER;

  const onSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(NUMERIC_COLS.has(k) || k === COLUMN_KEYS.DATE ? 'desc' : 'asc');
    }
  };

  // Extract a numeric value from a price field. Prices are strings like
  // "₹190 / strip of 10" or numbers like 190 — pull the first numeric run
  // (with thousand-separator handling) so the Pricing column still sorts
  // ascending/descending in a sensible order.
  const priceNumeric = (v) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const m = String(v).match(/[\d,]+(?:\.\d+)?/);
    return m ? Number(m[0].replace(/,/g, '')) : 0;
  };

  const visibleRows = useMemo(() => {
    let r = rows;
    const q = tableQuery.trim().toLowerCase();
    if (q) {
      r = r.filter((row) =>
        COLUMN_ORDER.some((k) => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === COLUMN_KEYS.DATE) {
        return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
      }
      if (sortKey === COLUMN_KEYS.PRICING) {
        return (priceNumeric(av) - priceNumeric(bv)) * dir;
      }
      if (NUMERIC_COLS.has(sortKey)) return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return sorted;
  }, [rows, tableQuery, sortKey, sortDir]);

  const renderCell = (row, col) => {
    const v = row[col];
    if (col === COLUMN_KEYS.LAUNCH_TYPE) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            LAUNCH_TYPE_STYLES[v] || 'bg-ink-100 text-ink-700 border-ink-100'
          }`}
        >
          {v}
        </span>
      );
    }
    if (col === COLUMN_KEYS.CHRONIC_ACUTE) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
            CHRONIC_STYLES[v] || 'bg-ink-100 text-ink-700 border-ink-100'
          }`}
        >
          {v}
        </span>
      );
    }
    if (col === COLUMN_KEYS.MARKET_SIZE) {
      return <span className="tabular-nums font-medium text-ink-900">{fmtINRPlain(v)}</span>;
    }
    if (col === COLUMN_KEYS.PRICING) {
      if (v === null || v === undefined || v === '') {
        return <span className="text-ink-300">—</span>;
      }
      // Numeric → ₹ formatted with Indian grouping; string → render as-is
      // (used for non-unit pricing like "₹84,375 / injection").
      if (typeof v === 'number') {
        return (
          <span className="tabular-nums font-medium text-ink-900">
            ₹{v.toLocaleString('en-IN')}
          </span>
        );
      }
      return (
        <span className="tabular-nums font-medium text-ink-900 whitespace-nowrap">{v}</span>
      );
    }
    if (col === COLUMN_KEYS.DATE) {
      return <span className="tabular-nums text-ink-700">{fmtDate(v)}</span>;
    }
    if (col === COLUMN_KEYS.BRAND) {
      return <span className="font-semibold text-ink-900">{v}</span>;
    }
    if (v === null || v === undefined || v === '') return <span className="text-ink-300">—</span>;
    return <span className="text-ink-700">{v}</span>;
  };

  const exportCsv = () => {
    const header = COLUMN_ORDER.join(',');
    const escape = (val) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = visibleRows.map((r) => COLUMN_ORDER.map((k) => escape(r[k])).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drug_launch_tracker.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-ink-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pharma-50 flex items-center justify-center">
            <TableIcon className="w-4 h-4 text-pharma-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Drug Launch Tracker — Core Table</h3>
            <p className="text-[11px] text-ink-500">
              Single source of truth · {visibleRows.length} row{visibleRows.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={tableQuery}
              onChange={(e) => setTableQuery(e.target.value)}
              placeholder="Search within table…"
              className="pl-8 pr-3 py-2 text-sm bg-white border border-ink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-300 focus:border-pharma-400 w-64"
            />
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-pharma-700 bg-pharma-50 hover:bg-pharma-100 border border-pharma-200 px-3 py-2 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div
        className="max-h-[640px] overflow-auto scrollbar-thin"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-white table-sticky-shadow">
            <tr>
              {visibleColumns.map((col) => {
                const isSorted = sortKey === col;
                const Icon = isSorted ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={col}
                    className={`text-[11px] font-semibold uppercase tracking-wider text-ink-700 px-4 py-2 bg-gradient-to-b from-pharma-50/80 to-white border-b border-pharma-100 ${alignClass(col)} ${
                      WIDTH_HINT[col] || ''
                    }`}
                  >
                    <button
                      onClick={() => onSort(col)}
                      className={`inline-flex items-center gap-1 w-full hover:text-pharma-700 transition ${headerJustify(col)}`}
                    >
                      <span className="whitespace-nowrap">{col}</span>
                      <Icon className={`w-3 h-3 shrink-0 ${isSorted ? 'text-pharma-600' : 'text-ink-300'}`} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, i) => (
              <tr
                key={`${r[COLUMN_KEYS.BRAND]}-${i}`}
                onClick={() => setActiveRow(r)}
                className={`group cursor-pointer transition-colors hover:bg-pharma-50/60 ${
                  i % 2 === 1 ? 'bg-ink-100/20' : 'bg-white'
                }`}
              >
                {visibleColumns.map((col) => (
                  <td
                    key={col}
                    className={`px-4 py-2.5 align-middle leading-snug border-b border-ink-100/60 ${alignClass(col)} ${
                      WIDTH_HINT[col] || ''
                    }`}
                  >
                    {renderCell(r, col)}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="text-center text-sm text-ink-500 py-12"
                >
                  No launches match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <RowDetailDrawer
        row={activeRow}
        allRows={allRows ?? rows}
        onClose={() => setActiveRow(null)}
      />
    </div>
  );
}
