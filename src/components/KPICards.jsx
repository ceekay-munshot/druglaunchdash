import React from 'react';
import {
  Package,
  ShoppingBag,
  Rocket,
  IndianRupee,
  HeartPulse,
  FlaskConical,
  Users,
} from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { sum, countBy, fmtINR } from '../utils/format';

function KpiCard({ icon: Icon, label, value, sub, accent = 'green', tint }) {
  const accents = {
    green: 'from-pharma-500 to-pharma-600',
    teal: 'from-teal-500 to-teal-accent',
    slate: 'from-slate-500 to-slate-600',
    amber: 'from-amber-500 to-orange-500',
  };
  return (
    <div className="group relative bg-white rounded-2xl border border-ink-100 shadow-card hover:shadow-cardHover transition-all overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent]}`} />
      <div className="p-4 flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            tint || 'bg-pharma-50'
          }`}
        >
          <Icon className={`w-5 h-5 ${accent === 'teal' ? 'text-teal-accent' : 'text-pharma-600'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">{label}</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5 leading-tight truncate">{value}</p>
          {sub && <p className="text-[11px] text-ink-500 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function KPICards({ rows }) {
  const total = rows.length;
  const acquired = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Acquired').length;
  const ownLaunched = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Own Launched').length;
  const inLicensed = rows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'In-licensed').length;

  const isNum = (v) => v !== null && v !== undefined && !isNaN(Number(v));
  const marketVals = rows.map((r) => r[COLUMN_KEYS.MARKET_SIZE]).filter(isNum).map(Number);
  const totalMarket = marketVals.length ? sum(marketVals) : null;

  const chronic = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const acute = rows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Acute').length;
  const chronicPct = total ? Math.round((chronic / total) * 100) : 0;

  const therapyCounts = countBy(rows, COLUMN_KEYS.THERAPY).sort((a, b) => b.value - a.value);
  const topTherapy = therapyCounts[0];
  const therapyConcentration = total && topTherapy ? Math.round((topTherapy.value / total) * 100) : 0;

  const uniqueBuyers = new Set(rows.map((r) => r[COLUMN_KEYS.BUYER])).size;
  const uniqueSellers = new Set(
    rows.map((r) => r[COLUMN_KEYS.SELLER]).filter((v) => v && v !== '—')
  ).size;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      <KpiCard
        icon={Package}
        label="Total Brands"
        value={total}
        sub={`${inLicensed} in-licensed`}
        accent="green"
      />
      <KpiCard
        icon={ShoppingBag}
        label="Acquired Launches"
        value={acquired}
        sub={`${total ? Math.round((acquired / total) * 100) : 0}% of portfolio`}
        accent="teal"
        tint="bg-teal-50"
      />
      <KpiCard
        icon={Rocket}
        label="Own Launched"
        value={ownLaunched}
        sub={`${total ? Math.round((ownLaunched / total) * 100) : 0}% of portfolio`}
        accent="green"
      />
      <KpiCard
        icon={IndianRupee}
        label="Total India Market"
        value={fmtINR(totalMarket)}
        sub={
          marketVals.length
            ? `${marketVals.length} of ${total} brands · public data`
            : 'Not in public sources'
        }
        accent="green"
      />
      <KpiCard
        icon={HeartPulse}
        label="Chronic vs Acute"
        value={`${chronicPct}% Chronic`}
        sub={`${chronic} chronic · ${acute} acute`}
        accent="green"
      />
      <KpiCard
        icon={FlaskConical}
        label="Top Therapy"
        value={topTherapy ? topTherapy.name : '—'}
        sub={topTherapy ? `${therapyConcentration}% of portfolio` : ''}
        accent="teal"
        tint="bg-teal-50"
      />
      <KpiCard
        icon={Users}
        label="Unique Buyers"
        value={uniqueBuyers}
        sub={`${uniqueSellers} unique sellers`}
        accent="green"
      />
    </div>
  );
}
