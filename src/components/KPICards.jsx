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
import {
  COLUMN_KEYS,
  countAcquisitionDeals,
  isAcquisitionParent,
} from '../data/mockData';
import { sum, countBy, fmtINR } from '../utils/format';
import { useAnimatedNumber } from '../utils/animation';

// Wrapper that animates a numeric value from 0 → target on mount, then
// formats it via the supplied `format` callback (default: locale-grouped
// integer). Strings (e.g. "₹2.5K Cr", "Oncology") render as-is.
function AnimatedValue({ value, format }) {
  const isNumeric = typeof value === 'number' && Number.isFinite(value);
  const animated = useAnimatedNumber(isNumeric ? value : 0);
  if (!isNumeric) return <>{value}</>;
  const display = format ? format(animated) : Math.round(animated).toLocaleString('en-IN');
  return <span className="tabular-nums">{display}</span>;
}

function KpiCard({ icon: Icon, label, value, sub, accent = 'green', tint, why, format }) {
  const accents = {
    green: 'from-pharma-500 to-pharma-600',
    teal: 'from-teal-500 to-teal-accent',
    slate: 'from-slate-500 to-slate-600',
    amber: 'from-amber-500 to-orange-500',
  };
  // The native title= tooltip is the cheapest way to ship the trend
  // explainer ("Top Therapy is X because Y") without pulling in a tooltip
  // library — works on hover desktop, and surfaces via long-press on
  // touch devices. The card itself gets a subtle help-cursor when a
  // `why` tooltip is present, signalling "there's more here".
  return (
    <div
      title={why || undefined}
      className={`group relative bg-white rounded-2xl border border-ink-100 shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
        why ? 'cursor-help' : ''
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent]}`} />
      <div className="p-4 flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
            tint || 'bg-pharma-50'
          }`}
        >
          <Icon className={`w-5 h-5 ${accent === 'teal' ? 'text-teal-accent' : 'text-pharma-600'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">{label}</p>
          <p className="text-xl font-bold text-ink-900 mt-0.5 leading-tight truncate">
            <AnimatedValue value={value} format={format} />
          </p>
          {sub && <p className="text-[11px] text-ink-500 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// Build a one-line "why" tooltip for each KPI from the data the card
// already has. Phrasing aims at the CEO scan: short, declarative, and
// pointing at the dominant driver — not a full audit trail.
function buildExplainers({ total, ownLaunched, inLicensed, acquired, acquiredBrands,
  marketVals, totalMarket, chronic, acute, chronicPct,
  topTherapy, therapyConcentration, therapyCounts,
  uniqueBuyers, uniqueSellers }) {
  return {
    totalBrands:
      `${total} distinct brands in scope · ` +
      `${ownLaunched} own-launched, ${acquired} acquired, ${inLicensed} in-licensed`,
    acquired:
      acquired === 0
        ? 'No acquisition deals in scope'
        : acquiredBrands && acquiredBrands !== acquired
          ? `${acquired} deal${acquired === 1 ? '' : 's'} captured ${acquiredBrands} brand line-items — multi-brand portfolios collapsed into one deal each`
          : `Each of the ${acquired} acquisition${acquired === 1 ? ' is' : 's are'} a single-brand event`,
    ownLaunched:
      total === 0
        ? 'No launches in scope'
        : `${ownLaunched} of ${total} brands are own-launched (vs acquired/in-licensed)`,
    market:
      marketVals.length === 0
        ? 'India TAM not disclosed publicly for any brand in scope'
        : `Sum of disclosed India TAM across ${marketVals.length} of ${total} brands · remaining ${total - marketVals.length} have no public estimate`,
    chronic:
      total === 0
        ? 'No launches in scope'
        : `${chronic} chronic, ${acute} acute, ${total - chronic - acute} unclassified · chronic skew signals annuity-style revenue`,
    topTherapy:
      !topTherapy
        ? 'No therapy assigned in any row'
        : therapyCounts.length === 1
          ? `Only ${topTherapy.name} represented in scope`
          : `${topTherapy.value} brands in ${topTherapy.name} (${therapyConcentration}% of portfolio) · 2nd: ${therapyCounts[1]?.name} (${therapyCounts[1]?.value})`,
    buyers:
      `${uniqueBuyers} buyer compan${uniqueBuyers === 1 ? 'y' : 'ies'} active · ${uniqueSellers} unique seller${uniqueSellers === 1 ? '' : 's'} on the other side`,
  };
}

export default function KPICards({ rows }) {
  // Parent rows are deal envelopes (e.g. "Bharat Serums & Vaccines (parent)"),
  // not real brands. They use placeholder values like Therapy='Multi-therapy'
  // and MARKET_SIZE=deal-EV-not-TAM, which would skew per-brand KPIs. Filter
  // them out for everything except the deal count.
  const brandRows = rows.filter((r) => !isAcquisitionParent(r));
  const total = brandRows.length;
  // "Acquired Launches" counts deal events: one parent row collapses all its
  // child brand lines into a single deal, so the BSV ₹13,630 Cr deal counts
  // as 1, not 14.
  const acquired = countAcquisitionDeals(rows);
  const acquiredBrands = brandRows.filter(
    (r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Acquired'
  ).length;
  const ownLaunched = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'Own Launched').length;
  const inLicensed = brandRows.filter((r) => r[COLUMN_KEYS.LAUNCH_TYPE] === 'In-licensed').length;

  const isNum = (v) => v !== null && v !== undefined && !isNaN(Number(v));
  const marketVals = brandRows.map((r) => r[COLUMN_KEYS.MARKET_SIZE]).filter(isNum).map(Number);
  const totalMarket = marketVals.length ? sum(marketVals) : null;

  const chronic = brandRows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Chronic').length;
  const acute = brandRows.filter((r) => r[COLUMN_KEYS.CHRONIC_ACUTE] === 'Acute').length;
  const chronicPct = total ? Math.round((chronic / total) * 100) : 0;

  // Drop placeholder therapy values ("—", "-", blank) before ranking so the
  // KPI card never surfaces an em-dash as the "top" therapy when scraped
  // rows haven't yet disclosed a real one. Charts.jsx already does the same.
  const isRealTherapy = (d) => {
    const s = String(d?.name ?? '').trim();
    return s !== '' && s !== '—' && s !== '-';
  };
  const therapyCounts = countBy(brandRows, COLUMN_KEYS.THERAPY)
    .filter(isRealTherapy)
    .sort((a, b) => b.value - a.value);
  const topTherapy = therapyCounts[0];
  const therapyConcentration = total && topTherapy ? Math.round((topTherapy.value / total) * 100) : 0;

  const uniqueBuyers = new Set(brandRows.map((r) => r[COLUMN_KEYS.BUYER])).size;
  const uniqueSellers = new Set(
    brandRows.map((r) => r[COLUMN_KEYS.SELLER]).filter((v) => v && v !== '—')
  ).size;

  const why = buildExplainers({
    total, ownLaunched, inLicensed, acquired, acquiredBrands,
    marketVals, totalMarket, chronic, acute, chronicPct,
    topTherapy, therapyConcentration, therapyCounts,
    uniqueBuyers, uniqueSellers,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
      <KpiCard
        icon={Package}
        label="Total Brands"
        value={total}
        sub={`${inLicensed} in-licensed`}
        accent="green"
        why={why.totalBrands}
      />
      <KpiCard
        icon={ShoppingBag}
        label="Acquired Launches"
        value={acquired}
        sub={
          acquiredBrands && acquiredBrands !== acquired
            ? `${acquiredBrands} brands across ${acquired} deal${acquired === 1 ? '' : 's'}`
            : `${acquired} deal${acquired === 1 ? '' : 's'}`
        }
        accent="teal"
        tint="bg-teal-50"
        why={why.acquired}
      />
      <KpiCard
        icon={Rocket}
        label="Own Launched"
        value={ownLaunched}
        sub={`${total ? Math.round((ownLaunched / total) * 100) : 0}% of portfolio`}
        accent="green"
        why={why.ownLaunched}
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
        why={why.market}
      />
      <KpiCard
        icon={HeartPulse}
        label="Chronic vs Acute"
        value={chronicPct}
        format={(n) => `${Math.round(n)}% Chronic`}
        sub={`${chronic} chronic · ${acute} acute`}
        accent="green"
        why={why.chronic}
      />
      <KpiCard
        icon={FlaskConical}
        label="Top Therapy"
        value={topTherapy ? topTherapy.name : '—'}
        sub={topTherapy ? `${therapyConcentration}% of portfolio` : ''}
        accent="teal"
        tint="bg-teal-50"
        why={why.topTherapy}
      />
      <KpiCard
        icon={Users}
        label="Unique Buyers"
        value={uniqueBuyers}
        sub={`${uniqueSellers} unique sellers`}
        accent="green"
        why={why.buyers}
      />
    </div>
  );
}
