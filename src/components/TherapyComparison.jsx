import React, { useMemo } from 'react';
import { Layers, Info } from 'lucide-react';
import { COLUMN_KEYS, isAcquisitionParent } from '../data/mockData';
import { THERAPY_AREAS, LAUNCH_TO_IPM_THERAPY, IPM_REPORT_META } from '../data/ipmReport';

// ── IPM reference figures (computed once from the therapy table) ────────────
const ipmByName = new Map(THERAPY_AREAS.map((t) => [t.name, t]));
const yoyOf = (t) => ((t.salesByYear.fy26 - t.salesByYear.fy25) / t.salesByYear.fy25) * 100;
// IPM overall FY25→FY26 YoY — the reference line. Computed from the same
// therapy table so it stays internally consistent with the per-row YoY.
const _tot = THERAPY_AREAS.reduce(
  (a, t) => ({ fy25: a.fy25 + t.salesByYear.fy25, fy26: a.fy26 + t.salesByYear.fy26 }),
  { fy25: 0, fy26: 0 }
);
const IPM_OVERALL_YOY = ((_tot.fy26 - _tot.fy25) / _tot.fy25) * 100;

// Map a Launch-Tracker therapy string to an IPM therapy area (or null).
function ipmTherapyFor(launchTherapy) {
  if (!launchTherapy) return null;
  const primary = String(launchTherapy).split('/')[0].trim();
  const ipmName = LAUNCH_TO_IPM_THERAPY[primary];
  return ipmName ? ipmByName.get(ipmName) : null;
}

// Company-vs-IPM therapy comparison. The launch side counts launches (live
// data); the IPM side is market value + YoY growth (periodic AWACS data).
// Different metrics by design — the value is the OVERLAY: "is this company
// launching into therapy areas the market is actually rewarding?"
export default function TherapyComparison({ rows, selectedCompany }) {
  const data = useMemo(() => {
    const brandRows = rows.filter((r) => !isAcquisitionParent(r));
    const counts = new Map();
    let mapped = 0;
    brandRows.forEach((r) => {
      const ipm = ipmTherapyFor(r[COLUMN_KEYS.THERAPY]);
      if (!ipm) return;
      mapped += 1;
      counts.set(ipm.name, (counts.get(ipm.name) || 0) + 1);
    });
    const ranked = [...counts.entries()]
      .map(([name, count]) => {
        const ipm = ipmByName.get(name);
        return { name, count, ipm, yoy: yoyOf(ipm), fast: yoyOf(ipm) >= IPM_OVERALL_YOY };
      })
      .sort((a, b) => b.count - a.count);
    const aboveMarket = ranked.filter((x) => x.fast).reduce((s, x) => s + x.count, 0);
    // Fast-growing IPM areas the company has no launches in (the whitespace).
    const present = new Set(counts.keys());
    const whitespace = THERAPY_AREAS
      .filter((t) => !present.has(t.name) && yoyOf(t) >= IPM_OVERALL_YOY)
      .map((t) => ({ name: t.name, yoy: yoyOf(t) }))
      .sort((a, b) => b.yoy - a.yoy);
    return { ranked, mapped, aboveMarket, whitespace };
  }, [rows]);

  const isAll = !selectedCompany || selectedCompany === '__ALL__';
  const who = isAll ? 'All tracked companies' : selectedCompany;
  const { ranked, mapped, aboveMarket, whitespace } = data;
  const abovePct = mapped ? Math.round((aboveMarket / mapped) * 100) : 0;
  const maxCount = Math.max(1, ...ranked.map((x) => x.count));

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pharma-50 shrink-0">
          <Layers className="w-4 h-4 text-pharma-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">Therapy Mix — Company vs IPM</h3>
          <p className="text-[11px] text-ink-500 leading-snug">
            Where {isAll ? 'tracked companies are' : `${who} is`} launching, set against where the India Pharma
            Market is actually growing
          </p>
        </div>
      </div>

      {/* Headline takeaway */}
      {mapped > 0 ? (
        <div className="mt-3 mb-4 rounded-xl bg-pharma-50/50 border border-pharma-100 px-4 py-3">
          <span className="text-2xl font-bold text-pharma-700 tabular-nums">{abovePct}%</span>
          <span className="text-sm text-ink-800">
            {' '}of {isAll ? 'tracked' : `${who}’s`} launches land in therapy areas growing{' '}
            <b>faster than the overall IPM</b> (IPM grew {IPM_OVERALL_YOY.toFixed(1)}% YoY in FY26).
          </span>
        </div>
      ) : (
        <div className="mt-3 mb-4 text-[12px] text-ink-500">
          No launches in the current filter — showing IPM therapy growth for reference.
        </div>
      )}

      {/* Comparison table */}
      <div className="grid grid-cols-[1fr_120px_148px_88px] gap-3 px-2 pb-1.5 text-[10px] uppercase tracking-wider font-semibold text-ink-500 border-b border-ink-100">
        <div>Therapy</div>
        <div>Launches</div>
        <div className="text-right">IPM size · YoY growth</div>
        <div className="text-right">Signal</div>
      </div>
      {ranked.map((x) => (
        <div
          key={x.name}
          className="grid grid-cols-[1fr_120px_148px_88px] gap-3 px-2 py-2 items-center border-b border-ink-100/50"
        >
          <div className="text-xs font-medium text-ink-900 truncate" title={x.name}>{x.name}</div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-pharma-500 rounded-full"
                style={{ width: `${(x.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-ink-700 tabular-nums w-4 text-right">{x.count}</span>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold tabular-nums ${x.fast ? 'text-pharma-700' : 'text-amber-700'}`}>
              {x.yoy >= 0 ? '↑' : '↓'} {Math.abs(x.yoy).toFixed(1)}% YoY
            </div>
            <div className="text-[10px] text-ink-500 tabular-nums">{x.ipm.contFY26}% of IPM value</div>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                x.fast
                  ? 'bg-pharma-50 text-pharma-700 border-pharma-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {x.fast ? '✓ growing' : 'slow'}
            </span>
          </div>
        </div>
      ))}

      {/* Whitespace — fast-growing IPM areas with no launches here */}
      {whitespace.length > 0 && (
        <div className="mt-3 rounded-lg bg-ink-50/70 border border-ink-100 px-3 py-2 text-[11px] text-ink-600 leading-relaxed">
          <b className="text-ink-800">Fast-growing IPM areas with no {isAll ? 'tracked' : who} launches:</b>{' '}
          {whitespace.slice(0, 6).map((w) => `${w.name} (↑${w.yoy.toFixed(1)}%)`).join('  ·  ')}
        </div>
      )}

      <p className="text-[12px] text-ink-600 mt-3 leading-relaxed bg-ink-50/60 rounded-lg px-3 py-2 border border-ink-100/60">
        <Info className="w-3.5 h-3.5 inline-block text-ink-400 mr-1.5 -mt-0.5" />
        Bars show where the launches sit by therapy (live data). The IPM YoY growth (FY25→FY26) and value share show
        whether that therapy area is actually expanding in the real market. Launches into{' '}
        <b className="text-pharma-700">growing</b> areas support a brand-acquisition thesis;{' '}
        <b className="text-amber-700">slow</b> areas are weaker bets. IPM data — {IPM_REPORT_META.asOf},
        AIOCD AWACS.
      </p>
    </div>
  );
}
