import React from 'react';
import {
  Users,
  FlaskConical,
  CalendarClock,
  Sparkles,
  Scale,
} from 'lucide-react';
import {
  COLUMN_KEYS,
  primaryMolecule,
  priceNumeric,
} from '../data/mockData';
import { countBy, fmtINRPlain, fmtDate } from '../utils/format';

function Widget({ icon: Icon, title, subtitle, children, accent = 'green' }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4 flex flex-col">
      <div className="flex items-start gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            accent === 'teal' ? 'bg-teal-50' : accent === 'amber' ? 'bg-amber-50' : 'bg-pharma-50'
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              accent === 'teal'
                ? 'text-teal-accent'
                : accent === 'amber'
                  ? 'text-amber-600'
                  : 'text-pharma-600'
            }`}
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function LeaderList({ items, right }) {
  if (!items.length)
    return <p className="text-xs text-ink-500">No data for current selection.</p>;
  const max = Math.max(...items.map((x) => Number(x.value) || 0), 1);
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={`${it.name}-${i}`} className="group">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-900 truncate pr-2">{it.name}</span>
            <span className="text-ink-700 font-semibold tabular-nums">{right(it)}</span>
          </div>
          <div className="mt-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pharma-400 to-teal-accent rounded-full"
              style={{ width: `${((Number(it.value) || 0) / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InsightWidgets({ rows, selectedCompany }) {
  const singleCompanyView = selectedCompany && selectedCompany !== '__ALL__';
  const hasNum = (v) => v !== null && v !== undefined && !isNaN(Number(v));

  const byMarket = rows
    .filter((r) => hasNum(r[COLUMN_KEYS.MARKET_SIZE]))
    .sort(
      (a, b) => Number(b[COLUMN_KEYS.MARKET_SIZE]) - Number(a[COLUMN_KEYS.MARKET_SIZE])
    )
    .slice(0, 5)
    .map((r) => ({ name: r[COLUMN_KEYS.BRAND], value: Number(r[COLUMN_KEYS.MARKET_SIZE]) }));

  const buyers = countBy(rows, COLUMN_KEYS.BUYER).sort((a, b) => b.value - a.value);
  const topBuyer = buyers[0];
  const therapies = countBy(rows, COLUMN_KEYS.THERAPY).sort((a, b) => b.value - a.value);
  const topTherapy = therapies[0];

  const total = rows.length;
  const chronic = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const chronicPct = total ? Math.round((chronic / total) * 100) : 0;

  const recent = [...rows]
    .filter((r) => !isNaN(new Date(r[COLUMN_KEYS.DATE]).getTime()))
    .sort(
      (a, b) => new Date(b[COLUMN_KEYS.DATE]).getTime() - new Date(a[COLUMN_KEYS.DATE]).getTime()
    )
    .slice(0, 5);

  // ── Cross-company molecule pricing ────────────────────────────────────
  // Group rows by primary molecule. For each molecule with 2+ priced
  // brands across 2+ buyers, compute min/max/spread% so the user can
  // see "Mankind Rs X vs Corona Rs Y for the same molecule" at a glance.
  const moleculeBuckets = (() => {
    const map = new Map();
    rows.forEach((r) => {
      const mol = primaryMolecule(r[COLUMN_KEYS.MOLECULE]);
      const price = priceNumeric(r[COLUMN_KEYS.PRICING]);
      if (!mol || price == null) return;
      if (!map.has(mol)) map.set(mol, []);
      map.get(mol).push({
        brand: r[COLUMN_KEYS.BRAND],
        buyer: r[COLUMN_KEYS.BUYER],
        price,
        priceLabel: r[COLUMN_KEYS.PRICING],
      });
    });
    return Array.from(map.entries())
      .map(([mol, list]) => {
        const buyers = new Set(list.map((x) => x.buyer));
        const min = Math.min(...list.map((x) => x.price));
        const max = Math.max(...list.map((x) => x.price));
        return {
          mol,
          list: [...list].sort((a, b) => a.price - b.price),
          buyersCount: buyers.size,
          min,
          max,
          spreadPct: min ? Math.round(((max - min) / min) * 100) : 0,
        };
      })
      .filter((b) => b.buyersCount >= 2 && b.max > b.min)
      .sort((a, b) => b.spreadPct - a.spreadPct)
      .slice(0, 5);
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Cross-company price comparison — molecules with 2+ priced brands
          across 2+ buyers, ranked by widest price spread. Hidden on
          single-company view because by definition the data only has
          one company in scope, so cross-company spreads can't be computed. */}
      {!singleCompanyView && (
      <Widget
        icon={Scale}
        title="Same molecule — biggest price spreads"
        subtitle="Cheapest vs most expensive brand per molecule"
        accent="amber"
      >
        {moleculeBuckets.length ? (
          <ul className="space-y-3">
            {moleculeBuckets.map((b) => {
              const cheapest = b.list[0];
              const dearest = b.list[b.list.length - 1];
              return (
                <li
                  key={b.mol}
                  className="border border-ink-100/70 rounded-lg p-2.5 bg-white"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold text-ink-900 capitalize truncate">
                      {b.mol}
                    </p>
                    <span className="text-[10px] font-semibold tabular-nums text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-px">
                      +{b.spreadPct}%
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-700 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-emerald-700 font-semibold">↓</span>{' '}
                        <span className="font-medium">{cheapest.brand}</span>
                        <span className="text-ink-500"> · {cheapest.buyer}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-emerald-700 whitespace-nowrap">
                        ₹{cheapest.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="text-amber-700 font-semibold">↑</span>{' '}
                        <span className="font-medium">{dearest.brand}</span>
                        <span className="text-ink-500"> · {dearest.buyer}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-amber-700 whitespace-nowrap">
                        ₹{dearest.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">
            No molecule has 2+ priced brands across 2+ companies in the current view. Try
            broadening the timeline or company filter.
          </p>
        )}
      </Widget>
      )}

      {!singleCompanyView && (
        <Widget icon={Users} title="Most Active Buyer" subtitle="Launch / acquisition volume">
          {topBuyer ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-ink-900 truncate">{topBuyer.name}</p>
                <span className="text-xs text-pharma-700 font-semibold bg-pharma-50 px-2 py-0.5 rounded-full border border-pharma-100">
                  {topBuyer.value} launches
                </span>
              </div>
              <LeaderList items={buyers.slice(0, 5)} right={(it) => `${it.value}`} />
            </div>
          ) : (
            <p className="text-xs text-ink-500">No buyer data.</p>
          )}
        </Widget>
      )}

      <Widget
        icon={FlaskConical}
        title="Most Common Therapy"
        subtitle="Therapy concentration"
        accent="teal"
      >
        {topTherapy ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-ink-900 truncate">{topTherapy.name}</p>
              <span className="text-xs text-teal-accent font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {topTherapy.value} brands
              </span>
            </div>
            <LeaderList items={therapies.slice(0, 5)} right={(it) => `${it.value}`} />
          </div>
        ) : (
          <p className="text-xs text-ink-500">No therapy data.</p>
        )}
      </Widget>

      <Widget
        icon={CalendarClock}
        title="Recent Launch Activity"
        subtitle="Latest 5 by Date"
        accent="teal"
      >
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((r, i) => (
              <li
                key={`${r[COLUMN_KEYS.BRAND]}-${i}`}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{r[COLUMN_KEYS.BRAND]}</p>
                  <p className="text-ink-500 truncate">
                    {r[COLUMN_KEYS.BUYER]} · {r[COLUMN_KEYS.THERAPY]}
                  </p>
                </div>
                <span className="text-ink-700 font-medium tabular-nums whitespace-nowrap">
                  {fmtDate(r[COLUMN_KEYS.DATE])}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No dated launches in view.</p>
        )}
      </Widget>

      <Widget icon={Sparkles} title="Portfolio Signal" subtitle="Auto-generated from filtered rows">
        <ul className="text-xs text-ink-700 space-y-2 list-disc list-inside">
          <li>
            <span className="font-semibold text-ink-900">{topTherapy?.name || '—'}</span>{' '}
            dominates with{' '}
            <span className="font-semibold text-pharma-700">
              {total ? Math.round(((topTherapy?.value || 0) / total) * 100) : 0}%
            </span>{' '}
            of brands.
          </li>
          <li>
            Chronic skew at{' '}
            <span className="font-semibold text-pharma-700">{chronicPct}%</span> — signals
            annuity-style revenue.
          </li>
          <li>
            Largest market opportunity:{' '}
            <span className="font-semibold text-ink-900">{byMarket[0]?.name || '—'}</span> —{' '}
            {fmtINRPlain(byMarket[0]?.value)}.
          </li>
          <li>
            Most active acquirer:{' '}
            <span className="font-semibold text-ink-900">{topBuyer?.name || '—'}</span>{' '}
            with <span className="font-semibold text-pharma-700">{topBuyer?.value || 0}</span>{' '}
            launches in view.
          </li>
        </ul>
      </Widget>
    </div>
  );
}
