import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { fmtINR } from '../utils/format';

// Strip noise suffixes so 7 columns fit comfortably on widescreen.
function shortName(name) {
  return name
    .replace(/\s+(Pharma|Lifesciences|Pharmaceuticals|Remedies)\s*$/i, '')
    .trim();
}

function computeCompanyMetrics(rows) {
  const launchCount = rows.length;
  const acquired = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Acquired').length;
  const ownLaunched = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Own Launched').length;
  const inLicensed = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'In-licensed').length;

  const chronic = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const acute = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Acute').length;
  const chronicDenom = chronic + acute;
  const chronicPct = chronicDenom ? Math.round((chronic / chronicDenom) * 100) : null;

  const therapyCounts = new Map();
  rows.forEach((r) => {
    const t = r[COLUMN_KEYS.THERAPY];
    if (!t) return;
    therapyCounts.set(t, (therapyCounts.get(t) || 0) + 1);
  });
  const therapyEntries = [...therapyCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topTherapy = therapyEntries[0]
    ? {
        name: therapyEntries[0][0],
        count: therapyEntries[0][1],
        pct: launchCount ? Math.round((therapyEntries[0][1] / launchCount) * 100) : 0,
      }
    : null;

  const sellerCounts = new Map();
  rows.forEach((r) => {
    const s = r[COLUMN_KEYS.SELLER];
    if (!s || s === '—') return;
    sellerCounts.set(s, (sellerCounts.get(s) || 0) + 1);
  });
  const sellerEntries = [...sellerCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCounterparty = sellerEntries[0]
    ? { name: sellerEntries[0][0], count: sellerEntries[0][1] }
    : null;

  const tamVals = rows
    .map((r) => r[COLUMN_KEYS.MARKET_SIZE])
    .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
    .map(Number);
  const tamExposure = tamVals.length ? tamVals.reduce((s, v) => s + v, 0) : null;

  return {
    launchCount,
    acquired,
    ownLaunched,
    inLicensed,
    chronicPct,
    topTherapy,
    topCounterparty,
    tamExposure,
  };
}

function StackedMix({ acquired, own, inLic, total }) {
  if (!total) return <span className="text-[11px] text-ink-400">—</span>;
  const pa = (acquired / total) * 100;
  const po = (own / total) * 100;
  const pi = (inLic / total) * 100;
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
        <div style={{ width: `${pa}%` }} className="bg-teal-500" title={`Acquired ${acquired}`} />
        <div style={{ width: `${po}%` }} className="bg-pharma-500" title={`Own Launched ${own}`} />
        <div style={{ width: `${pi}%` }} className="bg-pharma-300" title={`In-licensed ${inLic}`} />
      </div>
      <div className="text-[10px] text-ink-500 mt-1 tabular-nums">
        {acquired}/{own}/{inLic}
      </div>
    </div>
  );
}

function HighlightCell({ children, isBest }) {
  return (
    <td
      className={`px-3 py-2.5 text-center align-middle ${
        isBest ? 'bg-pharma-50/70' : ''
      }`}
    >
      {children}
    </td>
  );
}

export default function PeerBenchmark({ rows, companies }) {
  // Keep companies in their canonical order (DEFAULT_ACTIVE_COMPANIES from
  // App.jsx) so the columns don't reshuffle on every render.
  const perCompany = useMemo(() => {
    const map = new Map();
    companies.forEach((c) => map.set(c, []));
    rows.forEach((r) => {
      const b = r[COLUMN_KEYS.BUYER];
      if (map.has(b)) map.get(b).push(r);
    });
    return companies.map((c) => ({ name: c, metrics: computeCompanyMetrics(map.get(c) || []) }));
  }, [rows, companies]);

  if (!perCompany.length) return null;

  const totalLaunches = perCompany.reduce((s, c) => s + c.metrics.launchCount, 0);

  // For numeric rows, identify which column has the highest value so we can
  // softly highlight it. Returns the company name with the max, or null if no
  // company has data.
  const bestBy = (selector) => {
    let bestName = null;
    let bestVal = -Infinity;
    perCompany.forEach((c) => {
      const v = selector(c.metrics);
      if (v != null && v > bestVal) {
        bestVal = v;
        bestName = c.name;
      }
    });
    return bestName;
  };

  const bestLaunches = bestBy((m) => m.launchCount);
  const bestChronic = bestBy((m) => m.chronicPct);
  const bestTAM = bestBy((m) => m.tamExposure);

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pharma-50">
          <Users className="w-4 h-4 text-pharma-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Peer Benchmark</h3>
          <p className="text-[11px] text-ink-500">
            Tracked-company scorecard · {totalLaunches} launches in view
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold py-2 pr-4 w-[180px] border-b border-ink-100" />
              {perCompany.map((c) => (
                <th
                  key={c.name}
                  className={`text-center px-3 py-2 border-b border-ink-100 ${
                    c.name === bestLaunches ? 'bg-pharma-50/70' : ''
                  }`}
                >
                  <div className="text-xs font-semibold text-ink-900 truncate">
                    {shortName(c.name)}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5 tabular-nums">
                    {c.metrics.launchCount} launches
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60">
                Strategy mix
                <div className="text-[10px] normal-case tracking-normal text-ink-400 font-normal mt-0.5">
                  Acq / Own / In-lic
                </div>
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-3 text-center align-middle border-b border-ink-100/60">
                  <StackedMix
                    acquired={c.metrics.acquired}
                    own={c.metrics.ownLaunched}
                    inLic={c.metrics.inLicensed}
                    total={c.metrics.launchCount}
                  />
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60">
                Chronic share
              </td>
              {perCompany.map((c) => (
                <HighlightCell key={c.name} isBest={c.name === bestChronic && c.metrics.chronicPct != null}>
                  {c.metrics.chronicPct == null ? (
                    <span className="text-[11px] text-ink-400">—</span>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-ink-900 tabular-nums">
                        {c.metrics.chronicPct}%
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pharma-500 to-teal-accent"
                          style={{ width: `${c.metrics.chronicPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </HighlightCell>
              ))}
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60">
                Top therapy
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-3 text-center align-middle border-b border-ink-100/60">
                  {c.metrics.topTherapy ? (
                    <div>
                      <div className="text-xs font-semibold text-ink-900 truncate">
                        {c.metrics.topTherapy.name}
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5 tabular-nums">
                        {c.metrics.topTherapy.pct}% of book
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60">
                Top counterparty
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-3 text-center align-middle border-b border-ink-100/60">
                  {c.metrics.topCounterparty ? (
                    <div>
                      <div className="text-xs font-semibold text-ink-900 truncate">
                        {c.metrics.topCounterparty.name}
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5 tabular-nums">
                        {c.metrics.topCounterparty.count} deal
                        {c.metrics.topCounterparty.count > 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-3 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
                TAM exposure
                <div className="text-[10px] normal-case tracking-normal text-ink-400 font-normal mt-0.5">
                  Sum of India TAM
                </div>
              </td>
              {perCompany.map((c) => (
                <HighlightCell key={c.name} isBest={c.name === bestTAM && c.metrics.tamExposure != null}>
                  {c.metrics.tamExposure == null ? (
                    <span className="text-[11px] text-ink-400">—</span>
                  ) : (
                    <span className="text-sm font-semibold text-ink-900 tabular-nums">
                      {fmtINR(c.metrics.tamExposure)}
                    </span>
                  )}
                </HighlightCell>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
