import React, { useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, Info } from 'lucide-react';
import { PATENT_CLIFFS, PATENT_CLIFF_THERAPIES } from '../data/patentCliffs';
import { COLUMN_KEYS } from '../data/mockData';
import { fmtINR } from '../utils/format';

// Strip dosage / parens / combo separators so we can fuzzy-match a launch-row
// molecule against a cliff molecule. Combo cliffs like "Vilanterol/Fluticasone"
// require ALL components to be present in the row's molecule string.
function normalizeMolecule(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+\d[\d./\s\w%-]*$/, '')
    .replace(/[/+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function moleculeMatchesCliff(rowMol, cliffMol) {
  const r = normalizeMolecule(rowMol);
  const parts = normalizeMolecule(cliffMol)
    .split(/\s+/)
    .filter((p) => p.length > 3);
  if (!r || !parts.length) return false;
  return parts.every((p) => r.includes(p));
}

// Strip suffix words ("Pharma", "Lifesciences", etc.) so chip labels stay
// compact across 7 columns of pills.
function shortName(name) {
  return name
    .replace(/\s+(Pharma|Lifesciences|Pharmaceuticals|Remedies)\s*$/i, '')
    .trim();
}

const SORT_OPTIONS = {
  expiry: { label: 'Expiry date', cmp: (a, b) => a.expiryYear - b.expiryYear },
  tam: { label: 'India TAM (largest first)', cmp: (a, b) => b.indiaTAM_Cr - a.indiaTAM_Cr },
  therapy: { label: 'Therapy area', cmp: (a, b) => a.therapy.localeCompare(b.therapy) },
};

const CONFIDENCE_STYLES = {
  high: { dot: 'bg-pharma-500', label: 'High confidence' },
  medium: { dot: 'bg-amber-500', label: 'Medium confidence' },
  low: { dot: 'bg-ink-300', label: 'Low confidence' },
};

const YEAR_TINT = {
  2026: 'bg-pharma-50/40',
  2027: 'bg-teal-50/40',
  2028: 'bg-amber-50/40',
};

function fmtExpiry(p) {
  return p.expiryMonth ? `${p.expiryMonth} ${p.expiryYear}` : String(p.expiryYear);
}

export default function PatentCliffs({ allRows = [], companies = [] }) {
  const [therapy, setTherapy] = useState('__ALL__');
  const [sortKey, setSortKey] = useState('expiry');
  const [expandedId, setExpandedId] = useState(null);

  // For each cliff molecule, derive which tracked companies have already
  // launched a matching brand (cross-reference with allRows). Companies not in
  // the launched set are flagged as competitive whitespace.
  const filersByMolecule = useMemo(() => {
    const map = new Map();
    PATENT_CLIFFS.forEach((p) => {
      const launched = new Set();
      allRows.forEach((r) => {
        if (!moleculeMatchesCliff(r[COLUMN_KEYS.MOLECULE], p.molecule)) return;
        const buyer = r[COLUMN_KEYS.BUYER];
        if (companies.includes(buyer)) launched.add(buyer);
      });
      const launchedList = companies.filter((c) => launched.has(c));
      const absentList = companies.filter((c) => !launched.has(c));
      map.set(p.molecule, { launched: launchedList, absent: absentList });
    });
    return map;
  }, [allRows, companies]);

  const filtered = useMemo(() => {
    const base = therapy === '__ALL__'
      ? PATENT_CLIFFS
      : PATENT_CLIFFS.filter((p) => p.therapy === therapy);
    return [...base].sort(SORT_OPTIONS[sortKey].cmp);
  }, [therapy, sortKey]);

  const totalTAM = useMemo(
    () => filtered.reduce((s, p) => s + (p.indiaTAM_Cr || 0), 0),
    [filtered]
  );

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pharma-50">
            <CalendarClock className="w-4 h-4 text-pharma-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Patent Cliff Calendar</h3>
            <p className="text-[11px] text-ink-500">
              High-value molecules going generic in India · 2026-2028 ·{' '}
              <span className="font-semibold text-ink-700 tabular-nums">
                {fmtINR(totalTAM)}
              </span>{' '}
              addressable opportunity in view
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={therapy}
              onChange={(e) => setTherapy(e.target.value)}
              className="appearance-none text-xs bg-white border border-ink-200 rounded-lg pl-3 pr-7 py-1.5 text-ink-700 font-medium focus:outline-none focus:ring-2 focus:ring-pharma-200"
            >
              <option value="__ALL__">All therapies</option>
              {PATENT_CLIFF_THERAPIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="appearance-none text-xs bg-white border border-ink-200 rounded-lg pl-3 pr-7 py-1.5 text-ink-700 font-medium focus:outline-none focus:ring-2 focus:ring-pharma-200"
            >
              {Object.entries(SORT_OPTIONS).map(([k, v]) => (
                <option key={k} value={k}>Sort: {v.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-ink-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
              <th className="text-left py-2 pl-5 pr-3 border-b border-ink-100 w-[200px]">Molecule</th>
              <th className="text-left py-2 px-3 border-b border-ink-100">Therapy</th>
              <th className="text-left py-2 px-3 border-b border-ink-100">Indication</th>
              <th className="text-left py-2 px-3 border-b border-ink-100">Tracked positioning</th>
              <th className="text-center py-2 px-3 border-b border-ink-100 w-[120px]">India expiry</th>
              <th className="text-right py-2 px-3 pr-5 border-b border-ink-100 w-[120px]">India TAM</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const id = `${p.molecule}-${idx}`;
              const isExpanded = expandedId === id;
              const tint = YEAR_TINT[p.expiryYear] || '';
              const conf = CONFIDENCE_STYLES[p.confidence] || CONFIDENCE_STYLES.medium;
              const filers = filersByMolecule.get(p.molecule) || { launched: [], absent: [] };
              return (
                <React.Fragment key={id}>
                  <tr
                    className={`group cursor-pointer hover:bg-ink-50/60 transition-colors ${tint}`}
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                  >
                    <td className="py-2.5 pl-5 pr-3 border-b border-ink-100/70">
                      <div className="text-xs font-semibold text-ink-900">{p.molecule}</div>
                      {p.brand && (
                        <div className="text-[10px] text-ink-500 mt-0.5">{p.brand}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-b border-ink-100/70 text-xs text-ink-700">
                      {p.therapy}
                    </td>
                    <td className="py-2.5 px-3 border-b border-ink-100/70 text-xs text-ink-600">
                      {p.indication}
                    </td>
                    <td className="py-2.5 px-3 border-b border-ink-100/70">
                      {filers.launched.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-pharma-700 bg-pharma-50 border border-pharma-200 rounded-full px-2 py-0.5">
                          Whitespace · 0 of {companies.length} launched
                        </span>
                      ) : filers.absent.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500 bg-ink-50 border border-ink-200 rounded-full px-2 py-0.5">
                          Saturated · all {companies.length} launched
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {filers.launched.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center text-[10px] font-semibold text-pharma-800 bg-pharma-100 border border-pharma-200 rounded px-1.5 py-0.5"
                              title={`${c} has launched a matching brand`}
                            >
                              {shortName(c)}
                            </span>
                          ))}
                          <span className="text-[10px] text-ink-300 px-0.5">|</span>
                          {filers.absent.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center text-[10px] font-medium text-ink-400 bg-ink-50 border border-ink-100 rounded px-1.5 py-0.5"
                              title={`${c} has not launched — competitive whitespace`}
                            >
                              {shortName(c)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 border-b border-ink-100/70 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${conf.dot}`}
                          title={conf.label}
                        />
                        <span className="text-xs font-semibold text-ink-900 tabular-nums">
                          {fmtExpiry(p)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 pr-5 border-b border-ink-100/70 text-right">
                      <span className="text-xs font-semibold text-ink-900 tabular-nums">
                        {fmtINR(p.indiaTAM_Cr)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={tint}>
                      <td colSpan={6} className="px-5 py-2.5 border-b border-ink-100/70">
                        <div className="flex items-start gap-2 text-[11px] text-ink-600 bg-white/60 rounded-md px-3 py-2 border border-ink-100">
                          <Info className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
                          <span>
                            <span className="font-semibold text-ink-700">Innovator:</span>{' '}
                            {p.innovator}
                            {p.notes && (
                              <>
                                <span className="text-ink-300"> · </span>
                                {p.notes}
                              </>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-ink-500">
                  No molecules match the current therapy filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-ink-500 px-1 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-pharma-500" /> High confidence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium confidence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-300" /> Low confidence
        </span>
        <span className="text-ink-400">
          · Click any row for context. Dates are best-estimate from public
          sources; verify with patent counsel before acting.
        </span>
      </div>
    </div>
  );
}
