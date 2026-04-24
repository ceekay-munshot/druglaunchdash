import React from 'react';
import {
  Trophy,
  Users,
  FlaskConical,
  HeartPulse,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
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

export default function InsightWidgets({ rows }) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Widget icon={Trophy} title="Largest Market Brands" subtitle="Top ₹Cr India market size">
        <LeaderList items={byMarket} right={(it) => fmtINRPlain(it.value)} />
      </Widget>

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

      <Widget icon={HeartPulse} title="Chronic Portfolio Mix" subtitle="Chronic skew of selection">
        <div className="flex flex-col justify-center h-full">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-pharma-700">{chronicPct}%</span>
            <span className="text-xs text-ink-500 mb-1">Chronic share</span>
          </div>
          <div className="mt-3 h-2.5 bg-ink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pharma-500 to-teal-accent rounded-full"
              style={{ width: `${chronicPct}%` }}
            />
          </div>
          <p className="text-[11px] text-ink-500 mt-2">
            {chronic} chronic · {total - chronic} acute launches in view
          </p>
        </div>
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
