import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { COLUMN_KEYS, isAcquisitionParent } from '../data/mockData';
import { fmtINR, fmtDate } from '../utils/format';

// localStorage key for tracking the row-set the user saw on their last
// visit. We compare against this on next mount to derive a "since you
// last looked" briefing — no network, no LLM, fully deterministic.
const STORAGE_KEY = 'dlt.briefingState.v1';

function rowKey(r) {
  return [
    String(r?.[COLUMN_KEYS.BRAND] ?? '').trim().toLowerCase(),
    String(r?.[COLUMN_KEYS.DATE] ?? '').trim(),
    String(r?.[COLUMN_KEYS.SELLER] ?? '').trim().toLowerCase(),
    String(r?.[COLUMN_KEYS.BUYER] ?? '').trim().toLowerCase(),
  ].join('|');
}

function loadLastSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !Array.isArray(parsed.rowKeys)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(rowKeys) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), rowKeys })
    );
  } catch {
    /* localStorage may be unavailable; ignore */
  }
}

function fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const day = 86_400_000;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < day) return `${Math.round(diff / 3_600_000)} hours ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)} days ago`;
  if (diff < 30 * day) return `${Math.round(diff / (7 * day))} weeks ago`;
  return `${Math.round(diff / (30 * day))} months ago`;
}

// Pick the most CEO-readable highlights from a set of new-since-last-visit
// rows. We deliberately limit to 3 lines so the briefing reads like a
// punchy email summary, not a database dump.
function summarizeNewRows(newRows) {
  if (newRows.length === 0) return [];
  const highlights = [];

  // Highlight 1: most active acquirer
  const buyerCounts = new Map();
  for (const r of newRows) {
    if (isAcquisitionParent(r)) continue;
    const b = r[COLUMN_KEYS.BUYER];
    if (!b) continue;
    buyerCounts.set(b, (buyerCounts.get(b) || 0) + 1);
  }
  const topBuyer = [...buyerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topBuyer && topBuyer[1] >= 2) {
    highlights.push(
      `${topBuyer[0]} added ${topBuyer[1]} launches`
    );
  }

  // Highlight 2: biggest deal
  let biggest = null;
  let biggestVal = 0;
  for (const r of newRows) {
    const v = Number(r[COLUMN_KEYS.DEAL_VALUE]);
    if (Number.isFinite(v) && v > biggestVal) {
      biggest = r;
      biggestVal = v;
    }
  }
  if (biggest && biggestVal > 0) {
    highlights.push(
      `New deal: ${biggest[COLUMN_KEYS.BRAND]} → ${biggest[COLUMN_KEYS.BUYER]} · ${fmtINR(biggestVal)}`
    );
  }

  // Highlight 3: dominant therapy
  const therapyCounts = new Map();
  for (const r of newRows) {
    if (isAcquisitionParent(r)) continue;
    const t = r[COLUMN_KEYS.THERAPY];
    if (!t || t === '—') continue;
    therapyCounts.set(t, (therapyCounts.get(t) || 0) + 1);
  }
  const topTherapy = [...therapyCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topTherapy && topTherapy[1] >= 2) {
    highlights.push(
      `${topTherapy[1]} new ${topTherapy[0]} launches`
    );
  }

  // Fallback if none of the rich highlights triggered
  if (highlights.length === 0) {
    const r = newRows[0];
    highlights.push(
      `${r[COLUMN_KEYS.BRAND]} → ${r[COLUMN_KEYS.BUYER]}`
    );
  }

  return highlights.slice(0, 3);
}

export default function BriefingHero({ allRows }) {
  const [dismissed, setDismissed] = useState(false);
  const [snapshot] = useState(() => loadLastSnapshot());

  const allKeysSet = useMemo(
    () => new Set(allRows.map(rowKey)),
    [allRows]
  );

  // Compute the briefing payload. Memoized on the snapshot+rows tuple so
  // it stays stable across renders (otherwise the highlights would shimmer
  // when other state changes).
  const briefing = useMemo(() => {
    if (!snapshot) {
      // First-ever visit: welcome the user with the dataset size rather
      // than nothing — gives them a hook to come back and see deltas.
      return {
        kind: 'welcome',
        rowCount: allRows.length,
      };
    }
    const lastKeys = new Set(snapshot.rowKeys);
    const newRows = allRows.filter((r) => !lastKeys.has(rowKey(r)));
    if (newRows.length === 0) {
      return {
        kind: 'unchanged',
        sinceTs: snapshot.timestamp,
      };
    }
    return {
      kind: 'delta',
      sinceTs: snapshot.timestamp,
      newCount: newRows.length,
      highlights: summarizeNewRows(newRows),
      newRows,
    };
  }, [snapshot, allRows]);

  // Persist the current row-set as the new "last seen" snapshot, but only
  // after the user has actually had a moment to read the briefing. A 30s
  // dwell ensures a quick refresh doesn't immediately overwrite the
  // baseline before the user noticed any deltas.
  useEffect(() => {
    if (!allKeysSet.size) return;
    const t = setTimeout(() => {
      saveSnapshot(Array.from(allKeysSet));
    }, 30_000);
    return () => clearTimeout(t);
  }, [allKeysSet]);

  if (dismissed) return null;
  if (!briefing) return null;
  // "Unchanged" briefing is intentionally suppressed — surfacing
  // "nothing new" every visit becomes noise quickly.
  if (briefing.kind === 'unchanged') return null;

  const isWelcome = briefing.kind === 'welcome';

  return (
    <div className="relative bg-gradient-to-br from-pharma-50 via-white to-teal-50/50 border border-pharma-200 rounded-2xl shadow-card overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] bg-gradient-to-br from-pharma-600 to-teal-accent pointer-events-none" />
      <div className="relative px-5 py-4 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pharma-500 to-teal-accent flex items-center justify-center shadow-card shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] uppercase tracking-widest font-bold text-pharma-700">
              {isWelcome ? 'Briefing' : 'Since you last looked'}
            </p>
            {!isWelcome && briefing.sinceTs && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                <Clock className="w-3 h-3" />
                {fmtRelative(briefing.sinceTs)}
              </span>
            )}
          </div>
          {isWelcome ? (
            <>
              <h2 className="text-lg font-bold text-ink-900 mt-1 leading-tight">
                Welcome back to the launch tracker
              </h2>
              <p className="text-sm text-ink-700 mt-1.5 leading-snug">
                Tracking{' '}
                <span className="font-semibold text-pharma-700 tabular-nums">
                  {briefing.rowCount.toLocaleString('en-IN')}
                </span>{' '}
                launch & deal events across India pharma. Come back any time — we'll
                surface what changed since your last visit.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-ink-900 mt-1 leading-tight flex items-center gap-2 flex-wrap">
                <TrendingUp className="w-4 h-4 text-pharma-600" />
                <span className="tabular-nums">{briefing.newCount}</span>{' '}
                new event{briefing.newCount === 1 ? '' : 's'}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {briefing.highlights.map((h, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-ink-700 leading-snug"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-pharma-500 mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss briefing"
          className="w-7 h-7 rounded-lg hover:bg-ink-100/60 flex items-center justify-center text-ink-500 shrink-0 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
