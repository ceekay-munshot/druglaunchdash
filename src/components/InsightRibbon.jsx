import React, { useMemo } from 'react';
import { Clock, IndianRupee, AlertTriangle } from 'lucide-react';
import { COLUMN_KEYS, isAcquisitionParent, acquisitionDealKey } from '../data/mockData';
import { PATENT_CLIFFS } from '../data/patentCliffs';
import { fmtDate } from '../utils/format';

// Three deliberately-distinct insights:
//   1. Latest event   — most recent acquisition or in-licensing in view
//   2. Biggest deal   — largest disclosed consideration in view
//   3. Patent cliffs  — global signal of upcoming generic opportunities
// No overlap with the KPI cards (which already show counts + therapy +
// chronic %). Each insight pulls a different lever for the investor.

// Most-recent acquisition or in-licensing. Own-launched rows are excluded
// because their dates are often legacy estimates ("2002-01-01") that would
// never qualify but skew the calculation if included.
function pickLatestEvent(rows) {
  const candidates = rows.filter((r) => {
    const t = r[COLUMN_KEYS.LAUNCH_TYPE];
    return t === 'Acquired' || t === 'In-licensed';
  });
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestT = new Date(best[COLUMN_KEYS.DATE]).getTime();
  for (const r of candidates) {
    const t = new Date(r[COLUMN_KEYS.DATE]).getTime();
    if (!isNaN(t) && t > bestT) {
      best = r;
      bestT = t;
    }
  }
  if (isNaN(bestT)) return null;
  return best;
}

// Largest disclosed deal-consideration in the current view. We look at the
// parent of multi-brand deals (because that's where DEAL_VALUE lives) plus
// any standalone-acquired rows.
function pickBiggestDeal(rows) {
  let best = null;
  let bestVal = -Infinity;
  for (const r of rows) {
    const v = Number(r[COLUMN_KEYS.DEAL_VALUE]);
    if (!Number.isFinite(v) || v <= 0) continue;
    if (v > bestVal) {
      best = r;
      bestVal = v;
    }
  }
  return best;
}

// Patent cliffs landing within the next 6 calendar months from today.
// Independent of any buyer/seller filter — it's a market-level signal.
function countCliffsInNext6Months() {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  const monthIndex = (m) =>
    ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf((m || '').toLowerCase().slice(0, 3));
  let n = 0;
  for (const c of PATENT_CLIFFS) {
    if (!c.expiryYear) continue;
    const m = c.expiryMonth ? monthIndex(c.expiryMonth) : 0;
    if (m < 0) continue;
    const d = new Date(c.expiryYear, m, 1);
    if (d >= now && d < cutoff) n += 1;
  }
  return n;
}

// Pretty short company-only seller (drops "(via Ranbaxy)" etc.)
function shortPartner(name) {
  if (!name || name === '—') return '';
  return String(name).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function InsightItem({ icon: Icon, label, primary, secondary }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-pharma-600 shrink-0" />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-500 shrink-0">
        {label}
      </span>
      <span className="text-xs font-semibold text-ink-900 truncate">{primary}</span>
      {secondary && (
        <span className="text-xs text-ink-500 truncate hidden md:inline">{secondary}</span>
      )}
    </span>
  );
}

export default function InsightRibbon({ rows }) {
  const insights = useMemo(() => {
    const latest = pickLatestEvent(rows);
    const biggest = pickBiggestDeal(rows);
    const cliffs = countCliffsInNext6Months();
    return { latest, biggest, cliffs };
  }, [rows]);

  // If there's literally nothing to say, hide the ribbon — better than
  // shipping a row of empty placeholders.
  const hasAnything =
    insights.latest || insights.biggest || insights.cliffs > 0;
  if (!hasAnything) return null;

  return (
    <div className="rounded-xl border border-pharma-100/80 bg-white/70 backdrop-blur-sm shadow-card px-4 py-2.5">
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {/* "LIVE" indicator — pulsing dot signals "auto-updating tracker"
            rather than "static snapshot". */}
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pharma-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pharma-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-pharma-700">
            Live
          </span>
        </span>

        <span className="h-3 w-px bg-ink-100 hidden md:inline" />

        {insights.latest && (
          <InsightItem
            icon={Clock}
            label="Latest"
            primary={`${insights.latest[COLUMN_KEYS.BRAND]} → ${shortPartner(insights.latest[COLUMN_KEYS.BUYER])}`}
            secondary={fmtDate(insights.latest[COLUMN_KEYS.DATE])}
          />
        )}

        {insights.biggest && (
          <>
            <span className="h-3 w-px bg-ink-100 hidden md:inline" />
            <InsightItem
              icon={IndianRupee}
              label="Biggest deal"
              primary={`₹${Number(insights.biggest[COLUMN_KEYS.DEAL_VALUE]).toLocaleString('en-IN')} Cr`}
              secondary={`${shortPartner(insights.biggest[COLUMN_KEYS.SELLER])} → ${shortPartner(insights.biggest[COLUMN_KEYS.BUYER])}`}
            />
          </>
        )}

        {insights.cliffs > 0 && (
          <>
            <span className="h-3 w-px bg-ink-100 hidden md:inline" />
            <InsightItem
              icon={AlertTriangle}
              label="Patents"
              primary={`${insights.cliffs} cliff${insights.cliffs === 1 ? '' : 's'}`}
              secondary="expiring in next 6 months"
            />
          </>
        )}
      </div>
    </div>
  );
}
