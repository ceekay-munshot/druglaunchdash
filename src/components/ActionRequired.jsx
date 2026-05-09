import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  TrendingDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { COLUMN_KEYS, isAcquisitionParent } from '../data/mockData';
import { PATENT_CLIFFS } from '../data/patentCliffs';
import { fmtINR } from '../utils/format';

// Reuse the same molecule fuzzy-match used in PatentCliffs.jsx so a row
// like "Vildagliptin + Metformin" still matches a "Vildagliptin" cliff.
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

const MONTH_INDEX = (m) =>
  ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .indexOf((m || '').toLowerCase().slice(0, 3));

function cliffExpiryDate(c) {
  if (!c.expiryYear) return null;
  const m = c.expiryMonth ? MONTH_INDEX(c.expiryMonth) : 0;
  if (m < 0) return null;
  return new Date(c.expiryYear, m, 1);
}

// Severity coding: high = expires <30 days OR price gap >50%, medium = 30-90 day cliff
// or 25-50% price gap, low = informational (recent peer activity).
const SEVERITY_STYLES = {
  high: 'bg-rose-50 text-rose-800 border-rose-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-pharma-50 text-pharma-800 border-pharma-200',
};

const ICON_BY_TYPE = {
  cliff: ShieldAlert,
  peer: Zap,
  pricing: TrendingDown,
};

export default function ActionRequired({ allRows = [], companies = [] }) {
  const items = useMemo(() => {
    const out = [];
    const now = Date.now();
    const day = 86_400_000;

    // ── 1. Imminent patent cliffs (<90 days) where coverage is sparse ────
    // Surfaces "you've got a window" opportunities. We show cliffs where
    // fewer than half the tracked companies have launched, ranked by how
    // soon expiry hits (shortest window first).
    for (const c of PATENT_CLIFFS) {
      const expiry = cliffExpiryDate(c);
      if (!expiry) continue;
      const daysUntil = Math.round((expiry.getTime() - now) / day);
      if (daysUntil <= 0 || daysUntil > 90) continue;

      const launched = new Set();
      allRows.forEach((r) => {
        if (!moleculeMatchesCliff(r[COLUMN_KEYS.MOLECULE], c.molecule)) return;
        const buyer = r[COLUMN_KEYS.BUYER];
        if (companies.includes(buyer)) launched.add(buyer);
      });
      const launchedCount = launched.size;
      const totalTracked = companies.length || 1;
      const whitespacePct = 1 - launchedCount / totalTracked;
      // Only flag the cliff if at least half your tracked set is whitespace
      if (whitespacePct < 0.5) continue;

      out.push({
        type: 'cliff',
        severity: daysUntil < 30 ? 'high' : 'medium',
        sortKey: daysUntil,
        title: `${c.molecule} patent expires in ${daysUntil} days`,
        sub: `${fmtINR(c.indiaTAM_Cr)} TAM · ${launchedCount} of ${totalTracked} tracked launched`,
        deepLink: () =>
          window.dispatchEvent(
            new CustomEvent('focus-patent-cliffs', { detail: { window: '6mo' } })
          ),
      });
    }

    // ── 2. Recent peer activity (last 14 days) ───────────────────────────
    // Catches the "competitor moved this week" signal. We surface a
    // single rolled-up item per buyer to avoid spam if one player did a
    // multi-brand acquisition.
    const recentByBuyer = new Map();
    for (const r of allRows) {
      if (isAcquisitionParent(r)) continue;
      const dateStr = r[COLUMN_KEYS.DATE];
      if (!dateStr) continue;
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) continue;
      const daysAgo = (now - t) / day;
      if (daysAgo < 0 || daysAgo > 14) continue;
      const buyer = r[COLUMN_KEYS.BUYER];
      if (!buyer || !companies.includes(buyer)) continue;
      const cur = recentByBuyer.get(buyer) || { count: 0, latestRow: r, latestT: t };
      cur.count += 1;
      if (t > cur.latestT) {
        cur.latestRow = r;
        cur.latestT = t;
      }
      recentByBuyer.set(buyer, cur);
    }
    for (const [buyer, info] of recentByBuyer) {
      const daysAgo = Math.max(1, Math.round((now - info.latestT) / day));
      out.push({
        type: 'peer',
        severity: 'low',
        sortKey: daysAgo,
        title: `${buyer} ${info.count > 1 ? `made ${info.count} moves` : 'launched'} this fortnight`,
        sub: `Latest: ${info.latestRow[COLUMN_KEYS.BRAND]} (${info.latestRow[COLUMN_KEYS.THERAPY] || '—'}) · ${daysAgo}d ago`,
        deepLink: () =>
          window.dispatchEvent(
            new CustomEvent('focus-launch-row', {
              detail: {
                brand: info.latestRow[COLUMN_KEYS.BRAND],
                date: info.latestRow[COLUMN_KEYS.DATE],
                seller: info.latestRow[COLUMN_KEYS.SELLER],
                buyer: info.latestRow[COLUMN_KEYS.BUYER],
              },
            })
          ),
      });
    }

    // Sort by severity (high → medium → low) then by sortKey (smaller = more
    // urgent — fewer days until expiry / more recent).
    const sevRank = { high: 0, medium: 1, low: 2 };
    out.sort((a, b) => {
      const s = sevRank[a.severity] - sevRank[b.severity];
      if (s !== 0) return s;
      return a.sortKey - b.sortKey;
    });
    return out;
  }, [allRows, companies]);

  if (items.length === 0) return null;

  // Cap at 4 items — beyond that the panel becomes a list, not a brief.
  const visible = items.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Action Required</h3>
          <p className="text-[11px] text-ink-500">
            {items.length} item{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} review
            {items.length > visible.length && ` · showing top ${visible.length}`}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {visible.map((it, i) => {
          const Icon = ICON_BY_TYPE[it.type] || AlertTriangle;
          return (
            <li
              key={`${it.type}-${i}`}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition cursor-pointer hover:shadow-sm ${SEVERITY_STYLES[it.severity]}`}
              onClick={() => it.deepLink && it.deepLink()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && it.deepLink) {
                  e.preventDefault();
                  it.deepLink();
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">
                  {it.title}
                </p>
                <p className="text-[11px] mt-0.5 opacity-80 truncate">{it.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100 transition" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
