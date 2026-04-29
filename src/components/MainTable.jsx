import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Search,
  Table as TableIcon,
  Download,
} from 'lucide-react';
import {
  COLUMN_KEYS,
  COLUMN_ORDER,
  acquisitionDealKey,
  groupAcquisitionRows,
  isAcquisitionParent,
} from '../data/mockData';
import { fmtINRPlain, fmtDate } from '../utils/format';
import RowDetailDrawer from './RowDetailDrawer';

// Strip the trailing "(parent)" annotation from a brand label when we render
// the parent row — the chevron + child count already conveys the rollup,
// "Bharat Serums & Vaccines (parent)" reads cleaner as "Bharat Serums & Vaccines".
const stripParentSuffix = (s) => String(s ?? '').replace(/\s*\(parent\)\s*$/i, '');

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
  [COLUMN_KEYS.PRE_EXISTING_BRAND]: 'min-w-[180px]',
  [COLUMN_KEYS.COMPETITOR_BRANDS]: 'min-w-[200px]',
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
  // dealKeys whose children are user-expanded. Parents start collapsed by
  // default; an active table search auto-expands matching deals separately.
  const [expandedDeals, setExpandedDeals] = useState(() => new Set());

  const toggleDeal = (key) => {
    setExpandedDeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // Sort comparator shared by top-level row sort and child-row sort within
  // a deal group. Sorted top-level keeps parent rows anchored at the parent
  // date; children render under their parent regardless of natural order.
  const sortRows = (arr) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...arr].sort((a, b) => {
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
  };

  const matchesQuery = (row, q) =>
    COLUMN_ORDER.some((k) => String(row[k] ?? '').toLowerCase().includes(q));

  // Build the parent-anchored hierarchy from the App-level filtered rows,
  // then apply the in-table search and sort. Children stay attached to
  // their parent regardless of sort. When a search query matches a child,
  // the parent is auto-included (and auto-expanded) so the row has context.
  const { topLevelRows, childrenByKey, autoExpandedKeys, totalRowCount } = useMemo(() => {
    const grouped = groupAcquisitionRows(rows);
    const q = tableQuery.trim().toLowerCase();

    let visibleChildren = grouped.childrenByKey;
    let visibleTop = grouped.topLevel;
    const autoExpanded = new Set();

    if (q) {
      const filteredChildren = new Map();
      for (const [key, kids] of grouped.childrenByKey) {
        const m = kids.filter((r) => matchesQuery(r, q));
        if (m.length) {
          filteredChildren.set(key, m);
          autoExpanded.add(key);
        }
      }
      visibleChildren = filteredChildren;
      visibleTop = grouped.topLevel.filter((r) => {
        if (matchesQuery(r, q)) return true;
        // Keep parent visible if any of its children matched.
        if (isAcquisitionParent(r) && filteredChildren.has(acquisitionDealKey(r))) return true;
        return false;
      });
    }

    let totalCount = visibleTop.length;
    for (const arr of visibleChildren.values()) totalCount += arr.length;

    return {
      topLevelRows: sortRows(visibleTop),
      childrenByKey: visibleChildren,
      autoExpandedKeys: autoExpanded,
      totalRowCount: totalCount,
    };
  }, [rows, tableQuery, sortKey, sortDir]);

  const isExpanded = (key) => expandedDeals.has(key) || autoExpandedKeys.has(key);

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
      return <span className="font-semibold text-ink-900">{stripParentSuffix(v)}</span>;
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
    // Export the full hierarchy flat — parent + all its children, regardless
    // of whether the user has the deal expanded in the UI. Brand-level data
    // is the whole point of the export; collapsing is a viewing aid only.
    const flat = [];
    for (const r of topLevelRows) {
      flat.push(r);
      if (isAcquisitionParent(r)) {
        const kids = childrenByKey.get(acquisitionDealKey(r)) || [];
        for (const k of kids) flat.push(k);
      }
    }
    const body = flat.map((r) => COLUMN_ORDER.map((k) => escape(r[k])).join(',')).join('\n');
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
              Single source of truth · {totalRowCount} row{totalRowCount === 1 ? '' : 's'}
              {childrenByKey.size > 0 && (
                <>
                  {' · '}
                  {childrenByKey.size} multi-brand deal{childrenByKey.size === 1 ? '' : 's'}
                </>
              )}
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
            {topLevelRows.map((r, i) => {
              const stripeBg = i % 2 === 1 ? 'bg-ink-100/20' : 'bg-white';
              const isParent = isAcquisitionParent(r);
              const dealKey = isParent ? acquisitionDealKey(r) : null;
              const kids = isParent ? childrenByKey.get(dealKey) || [] : [];
              const expanded = isParent && isExpanded(dealKey);
              const Chevron = expanded ? ChevronDown : ChevronRight;

              return (
                <React.Fragment key={`${r[COLUMN_KEYS.BRAND]}-${i}`}>
                  <tr
                    onClick={() => setActiveRow(r)}
                    className={`group cursor-pointer transition-colors hover:bg-pharma-50/60 ${stripeBg}`}
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col}
                        className={`px-4 py-2.5 align-middle leading-snug border-b border-ink-100/60 ${alignClass(col)} ${
                          WIDTH_HINT[col] || ''
                        }`}
                      >
                        {col === COLUMN_KEYS.BRAND && isParent && kids.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDeal(dealKey);
                              }}
                              className="shrink-0 w-5 h-5 inline-flex items-center justify-center rounded hover:bg-pharma-100 text-pharma-700"
                              aria-label={expanded ? 'Collapse deal' : 'Expand deal'}
                            >
                              <Chevron className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-semibold text-ink-900 truncate">
                              {stripParentSuffix(r[COLUMN_KEYS.BRAND])}
                            </span>
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-pharma-50 text-pharma-700 border border-pharma-200 whitespace-nowrap">
                              {kids.length} brand{kids.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        ) : (
                          renderCell(r, col)
                        )}
                      </td>
                    ))}
                  </tr>

                  {expanded &&
                    sortRows(kids).map((c, ci) => (
                      <tr
                        key={`${dealKey}-child-${c[COLUMN_KEYS.BRAND]}-${ci}`}
                        onClick={() => setActiveRow(c)}
                        className="group cursor-pointer transition-colors hover:bg-pharma-50/60 bg-pharma-50/20"
                      >
                        {visibleColumns.map((col) => (
                          <td
                            key={col}
                            className={`px-4 py-2 align-middle leading-snug border-b border-ink-100/60 text-[13px] ${alignClass(col)} ${
                              WIDTH_HINT[col] || ''
                            }`}
                          >
                            {col === COLUMN_KEYS.BRAND ? (
                              <div className="flex items-center gap-2 pl-6">
                                <span
                                  className="text-pharma-300 select-none"
                                  aria-hidden="true"
                                >
                                  └
                                </span>
                                <span className="font-medium text-ink-800">
                                  {c[COLUMN_KEYS.BRAND]}
                                </span>
                              </div>
                            ) : (
                              renderCell(c, col)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
            {topLevelRows.length === 0 && (
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
