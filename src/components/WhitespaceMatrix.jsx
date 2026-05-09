import React, { useMemo, useState } from 'react';
import { Grid3x3, ChevronDown, Info } from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { PATENT_CLIFFS } from '../data/patentCliffs';
import { fmtINR } from '../utils/format';
import { CompanyAvatar } from './CompanyAvatar';

// Same fuzzy molecule match used by PatentCliffs.jsx — combo cliffs like
// "Vilanterol/Fluticasone" require ALL components to be in the row's
// molecule string before we count it as covered.
function normalizeMolecule(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+\d[\d./\s\w%-]*$/, '')
    .replace(/[/+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function moleculeMatches(rowMol, cliffMol) {
  const r = normalizeMolecule(rowMol);
  const parts = normalizeMolecule(cliffMol).split(/\s+/).filter((p) => p.length > 3);
  if (!r || !parts.length) return false;
  return parts.every((p) => r.includes(p));
}

const MONTH_INDEX = (m) =>
  ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .indexOf((m || '').toLowerCase().slice(0, 3));

function cliffExpiryMs(c) {
  if (!c.expiryYear) return Infinity;
  const m = c.expiryMonth ? MONTH_INDEX(c.expiryMonth) : 0;
  if (m < 0) return Infinity;
  return new Date(c.expiryYear, m, 1).getTime();
}

const DEFAULT_VISIBLE = 8;

export default function WhitespaceMatrix({ allRows = [], companies = [] }) {
  const [showAll, setShowAll] = useState(false);

  // For each cliff molecule × each company, look up whether the company
  // already has a launched brand on that molecule. The result is used both
  // to colour the cell and to drive the per-row "X of N covered" footer.
  const matrix = useMemo(() => {
    const now = Date.now();
    const day = 86_400_000;

    // Pre-bucket rows by buyer so the per-cell scan is O(rows-of-buyer)
    // instead of O(allRows) for every cell. Saves real time once the
    // dataset grows.
    const rowsByBuyer = new Map();
    for (const r of allRows) {
      const b = r[COLUMN_KEYS.BUYER];
      if (!b) continue;
      const arr = rowsByBuyer.get(b);
      if (arr) arr.push(r);
      else rowsByBuyer.set(b, [r]);
    }

    const out = PATENT_CLIFFS.map((c) => {
      const cells = companies.map((co) => {
        const rows = rowsByBuyer.get(co) || [];
        const has = rows.some((r) => moleculeMatches(r[COLUMN_KEYS.MOLECULE], c.molecule));
        return { company: co, has };
      });
      const launchedCount = cells.filter((cell) => cell.has).length;
      const expiryMs = cliffExpiryMs(c);
      const daysUntil = isFinite(expiryMs) ? Math.round((expiryMs - now) / day) : null;
      return { cliff: c, cells, launchedCount, daysUntil };
    });

    // Sort by whitespace severity: more uncovered companies first; ties
    // broken by soonest-expiring cliff. That puts the most strategically
    // important cells (big TAM, no one has it, expiring soon) at the top.
    out.sort((a, b) => {
      const aGap = companies.length - a.launchedCount;
      const bGap = companies.length - b.launchedCount;
      if (aGap !== bGap) return bGap - aGap;
      // Cliffs already-expired sink to the bottom; future ones rise.
      const aF = a.daysUntil != null && a.daysUntil > 0 ? a.daysUntil : Infinity;
      const bF = b.daysUntil != null && b.daysUntil > 0 ? b.daysUntil : Infinity;
      return aF - bF;
    });

    return out;
  }, [allRows, companies]);

  const visible = showAll ? matrix : matrix.slice(0, DEFAULT_VISIBLE);
  const hidden = matrix.length - visible.length;

  const totalCells = matrix.length * companies.length;
  const filledCells = matrix.reduce((s, r) => s + r.launchedCount, 0);
  const coverage = totalCells ? Math.round((filledCells / totalCells) * 100) : 0;

  const cellTitle = (cell, cliff) =>
    cell.has
      ? `${cell.company} has launched a brand on ${cliff.molecule}`
      : `${cell.company} has NOT launched on ${cliff.molecule} (whitespace)`;

  if (companies.length === 0 || matrix.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pharma-50 flex items-center justify-center">
            <Grid3x3 className="w-4 h-4 text-pharma-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              Whitespace Matrix
            </h3>
            <p className="text-[11px] text-ink-500">
              Patent-cliff molecules × tracked companies · click any cell for context · current portfolio coverage{' '}
              <span className="font-semibold text-ink-700 tabular-nums">{coverage}%</span>
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[10px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-pharma-500" /> Launched
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-50 border border-rose-200" /> Whitespace
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Info className="w-3 h-3" /> Soonest first
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              <th className="text-left py-2 pl-4 pr-3 border-b border-ink-100 sticky left-0 bg-white z-10">
                Molecule
              </th>
              <th className="text-center py-2 px-2 border-b border-ink-100 whitespace-nowrap">
                Expiry
              </th>
              <th className="text-right py-2 px-2 border-b border-ink-100 whitespace-nowrap">
                TAM
              </th>
              {companies.map((c) => (
                <th
                  key={c}
                  className="text-center py-2 px-1.5 border-b border-ink-100 align-bottom"
                  title={c}
                >
                  <div className="flex flex-col items-center gap-1">
                    <CompanyAvatar name={c} size="xs" />
                    <span className="text-[10px] font-semibold text-ink-700 truncate max-w-[68px]">
                      {c.split(' ')[0]}
                    </span>
                  </div>
                </th>
              ))}
              <th className="py-2 pr-4 pl-2 border-b border-ink-100 text-right whitespace-nowrap">
                Coverage
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ cliff, cells, launchedCount, daysUntil }, idx) => {
              const expiryLabel = cliff.expiryMonth
                ? `${cliff.expiryMonth} ${cliff.expiryYear}`
                : `${cliff.expiryYear || '—'}`;
              const urgent =
                daysUntil != null && daysUntil > 0 && daysUntil < 90;
              const stripe = idx % 2 === 1 ? 'bg-ink-50/40' : 'bg-white';
              const rowGap = companies.length - launchedCount;
              return (
                <tr key={`${cliff.molecule}-${idx}`} className={`group transition ${stripe}`}>
                  <td className="py-2 pl-4 pr-3 border-b border-ink-100/70 align-middle sticky left-0 bg-inherit">
                    <div className="text-xs font-semibold text-ink-900 truncate max-w-[180px]">
                      {cliff.molecule}
                    </div>
                    <div className="text-[10px] text-ink-500 truncate max-w-[180px]">
                      {cliff.therapy}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-b border-ink-100/70 align-middle text-center">
                    <span
                      className={`text-xs font-semibold tabular-nums whitespace-nowrap ${
                        urgent ? 'text-rose-700' : 'text-ink-700'
                      }`}
                      title={daysUntil != null ? `${daysUntil} days from today` : ''}
                    >
                      {expiryLabel}
                    </span>
                  </td>
                  <td className="py-2 px-2 border-b border-ink-100/70 align-middle text-right">
                    <span className="text-xs font-medium text-ink-700 tabular-nums whitespace-nowrap">
                      {fmtINR(cliff.indiaTAM_Cr)}
                    </span>
                  </td>
                  {cells.map((cell) => (
                    <td
                      key={cell.company}
                      className="py-2 px-1.5 border-b border-ink-100/70 align-middle text-center"
                    >
                      <div
                        title={cellTitle(cell, cliff)}
                        className={`mx-auto w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold transition cursor-default ${
                          cell.has
                            ? 'bg-pharma-500 text-white shadow-sm'
                            : 'bg-rose-50 text-rose-400 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {cell.has ? '✓' : '—'}
                      </div>
                    </td>
                  ))}
                  <td className="py-2 pr-4 pl-2 border-b border-ink-100/70 align-middle text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${
                        rowGap === companies.length
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : rowGap === 0
                            ? 'bg-ink-50 text-ink-500 border-ink-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {launchedCount} / {companies.length}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pharma-700 bg-pharma-50 hover:bg-pharma-100 border border-pharma-200 rounded-full px-3 py-1.5 transition"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Show {hidden} more {hidden === 1 ? 'molecule' : 'molecules'}
          </button>
        </div>
      )}
      {showAll && matrix.length > DEFAULT_VISIBLE && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setShowAll(false)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 transition"
          >
            Collapse to top {DEFAULT_VISIBLE}
          </button>
        </div>
      )}
    </div>
  );
}
