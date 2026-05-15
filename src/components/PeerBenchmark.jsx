import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { CompanyAvatar } from './CompanyAvatar';
import {
  COLUMN_KEYS,
  countAcquisitionDeals,
  isAcquisitionParent,
} from '../data/mockData';

// Strip noise suffixes so 7 columns fit comfortably on widescreen.
function shortName(name) {
  return name
    .replace(/\s+(Pharma|Lifesciences|Pharmaceuticals|Remedies)\s*$/i, '')
    .trim();
}

// Rolling-12-month window cut-off used for the deal-velocity row. We pick
// 12 months specifically because it strips out launch-cadence seasonality
// (companies tend to cluster launches around fiscal-year-end pushes) while
// still being recent enough to feel like a "current pace" reading.
const VELOCITY_WINDOW_DAYS = 365;

function computeCompanyMetrics(rows) {
  // Parent rows are deal envelopes (e.g. "Bharat Serums & Vaccines (parent)"),
  // not individual brands — drop them so per-brand counts and chronic-share
  // aren't inflated by the deal header. Acquired deals are counted separately
  // via countAcquisitionDeals so a 14-row BSV deal contributes 1, not 14.
  const brandRows = rows.filter((r) => !isAcquisitionParent(r));
  const launchCount = brandRows.length;
  const acquired = countAcquisitionDeals(rows);
  const ownLaunched = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Own Launched').length;
  const inLicensed = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'In-licensed').length;

  // Deal velocity = brand-level events in the rolling 12-month window. We
  // use brand rows (not deal events) so multi-brand acquisitions reflect
  // the actual portfolio breadth a company brought online.
  const cutoff = Date.now() - VELOCITY_WINDOW_DAYS * 86_400_000;
  const recent = brandRows.filter((r) => {
    const t = new Date(r[COLUMN_KEYS.DATE]).getTime();
    return !isNaN(t) && t >= cutoff;
  }).length;

  const chronic = brandRows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const acute = brandRows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Acute').length;
  const chronicDenom = chronic + acute;
  const chronicPct = chronicDenom ? Math.round((chronic / chronicDenom) * 100) : null;

  const therapyCounts = new Map();
  brandRows.forEach((r) => {
    const t = r[COLUMN_KEYS.THERAPY];
    // Skip rows that have no real therapy value — the em-dash / hyphen
    // sentinels come in via scraped stub rows and shouldn't be ranked
    // alongside actual therapy areas.
    if (!t || t === '—' || t === '-') return;
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
  brandRows.forEach((r) => {
    const s = r[COLUMN_KEYS.SELLER];
    if (!s || s === '—') return;
    sellerCounts.set(s, (sellerCounts.get(s) || 0) + 1);
  });
  const sellerEntries = [...sellerCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCounterparty = sellerEntries[0]
    ? { name: sellerEntries[0][0], count: sellerEntries[0][1] }
    : null;

  return {
    launchCount,
    acquired,
    ownLaunched,
    inLicensed,
    chronicPct,
    topTherapy,
    topCounterparty,
    velocity12mo: recent,
  };
}

function StackedMix({ acquired, own, inLic, total }) {
  if (!total) return <span className="text-[11px] text-ink-400">—</span>;
  const pa = (acquired / total) * 100;
  const po = (own / total) * 100;
  const pi = (inLic / total) * 100;
  // Compact one-line summary — dropping zero-count buckets and using the
  // short Acq / Own / InL labels matches the row's subtitle and keeps the
  // line from wrapping in narrow columns.
  const parts = [];
  if (acquired) parts.push(`Acq ${acquired}`);
  if (own) parts.push(`Own ${own}`);
  if (inLic) parts.push(`InL ${inLic}`);
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-ink-100">
        <div style={{ width: `${pa}%` }} className="bg-teal-500" title={`${acquired} acquired`} />
        <div style={{ width: `${po}%` }} className="bg-pharma-500" title={`${own} own launched`} />
        <div style={{ width: `${pi}%` }} className="bg-pharma-300" title={`${inLic} in-licensed`} />
      </div>
      <div className="text-[10px] text-ink-500 mt-1.5 tabular-nums whitespace-nowrap">
        {parts.join(' · ')}
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
  const bestVelocity = bestBy((m) => m.velocity12mo);

  // Peer median for the deal-velocity row — drives the "above / below
  // median" annotation on each cell. We use median (not mean) so a single
  // outlier deal-flow burst doesn't drag the reference line up.
  const velocities = perCompany.map((c) => c.metrics.velocity12mo).sort((a, b) => a - b);
  const peerMedian = velocities.length
    ? velocities.length % 2
      ? velocities[Math.floor(velocities.length / 2)]
      : (velocities[velocities.length / 2 - 1] + velocities[velocities.length / 2]) / 2
    : 0;
  const velocityMax = Math.max(1, ...velocities);

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
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
              <th className="text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold py-2 pr-4 w-[180px] border-b border-ink-100 sticky left-0 z-10 bg-white border-r border-ink-100" />
              {perCompany.map((c) => (
                <th
                  key={c.name}
                  className={`text-center px-3 py-2 border-b border-ink-100 min-w-[150px] ${
                    c.name === bestLaunches ? 'bg-pharma-50/70' : ''
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 min-w-0">
                    <CompanyAvatar name={c.name} size="md" />
                    <span className="text-xs font-semibold text-ink-900 truncate">
                      {shortName(c.name)}
                    </span>
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
              <td className="py-2.5 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60 sticky left-0 z-10 bg-white border-r border-ink-100/60">
                Strategy mix
                <div className="text-[10px] normal-case tracking-normal text-ink-400 font-normal mt-0.5">
                  Acq / Own / In-lic
                </div>
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-2.5 text-center align-middle border-b border-ink-100/60">
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
              <td className="py-2.5 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60 sticky left-0 z-10 bg-white border-r border-ink-100/60">
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
              <td className="py-2.5 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60 sticky left-0 z-10 bg-white border-r border-ink-100/60">
                Top therapy
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-2.5 text-center align-middle border-b border-ink-100/60">
                  {c.metrics.topTherapy ? (
                    <div>
                      <div
                        className="text-xs font-semibold text-ink-900 truncate max-w-[140px] mx-auto"
                        title={c.metrics.topTherapy.name}
                      >
                        {c.metrics.topTherapy.name}
                      </div>
                      <div className="text-[10px] text-ink-500 mt-0.5 tabular-nums">
                        {c.metrics.topTherapy.pct}% of launches
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-400">—</span>
                  )}
                </td>
              ))}
            </tr>

            <tr>
              <td className="py-2.5 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60 sticky left-0 z-10 bg-white border-r border-ink-100/60">
                Deal velocity
                <div className="text-[10px] normal-case tracking-normal text-ink-400 font-normal mt-0.5">
                  Last 12mo · peer median {peerMedian}
                </div>
              </td>
              {perCompany.map((c) => {
                const v = c.metrics.velocity12mo;
                const delta = v - peerMedian;
                const pctOfMax = velocityMax ? (v / velocityMax) * 100 : 0;
                const medianPct = velocityMax ? (peerMedian / velocityMax) * 100 : 0;
                const isBest = c.name === bestVelocity && v > 0;
                return (
                  <HighlightCell key={c.name} isBest={isBest}>
                    <div className="text-sm font-semibold text-ink-900 tabular-nums">{v}</div>
                    <div className="relative mt-1 h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          delta >= 0
                            ? 'bg-gradient-to-r from-pharma-500 to-teal-accent'
                            : 'bg-gradient-to-r from-amber-400 to-amber-500'
                        }`}
                        style={{ width: `${pctOfMax}%` }}
                      />
                      {/* Peer-median tick — vertical hairline overlaid on
                          every bar so cells read as "where you stand vs
                          the group" at a glance. */}
                      {peerMedian > 0 && (
                        <span
                          className="absolute top-[-2px] bottom-[-2px] w-px bg-ink-700/50"
                          style={{ left: `calc(${medianPct}% - 0.5px)` }}
                          title={`Peer median: ${peerMedian}`}
                        />
                      )}
                    </div>
                    <div
                      className={`text-[10px] mt-1 font-medium tabular-nums ${
                        delta > 0 ? 'text-pharma-700' : delta < 0 ? 'text-amber-700' : 'text-ink-500'
                      }`}
                    >
                      {delta > 0 ? `↑ +${delta} vs median` : delta < 0 ? `↓ ${delta} vs median` : 'at median'}
                    </div>
                  </HighlightCell>
                );
              })}
            </tr>

            <tr>
              <td className="py-2.5 pr-4 text-[11px] uppercase tracking-wider text-ink-500 font-semibold border-b border-ink-100/60 sticky left-0 z-10 bg-white border-r border-ink-100/60">
                Top counterparty
              </td>
              {perCompany.map((c) => (
                <td key={c.name} className="px-3 py-2.5 text-center align-middle border-b border-ink-100/60">
                  {c.metrics.topCounterparty ? (
                    <div>
                      <div
                        className="text-xs font-semibold text-ink-900 truncate max-w-[140px] mx-auto"
                        title={c.metrics.topCounterparty.name}
                      >
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

          </tbody>
        </table>
      </div>
    </div>
  );
}
