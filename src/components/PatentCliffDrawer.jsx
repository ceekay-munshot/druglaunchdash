import React, { useEffect, useMemo, useRef } from 'react';
import {
  X,
  CalendarClock,
  IndianRupee,
  Building2,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { fmtINR, fmtDate } from '../utils/format';

// Same matchers as PatentCliffs — duplicated here so the drawer can pull
// per-company brand+date detail without lifting helpers up to App.jsx.
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

const CONFIDENCE_STYLES = {
  high: { dot: 'bg-pharma-500', label: 'High confidence' },
  medium: { dot: 'bg-amber-500', label: 'Medium confidence' },
  low: { dot: 'bg-ink-300', label: 'Low confidence' },
};

function fmtExpiry(p) {
  return p.expiryMonth ? `${p.expiryMonth} ${p.expiryYear}` : String(p.expiryYear);
}

function monthsUntil(p) {
  const now = new Date();
  const target = new Date(
    p.expiryYear,
    p.expiryMonth ? new Date(`${p.expiryMonth} 1, ${p.expiryYear}`).getMonth() : 5,
    1
  );
  const diff = (target.getFullYear() - now.getFullYear()) * 12
    + (target.getMonth() - now.getMonth());
  return diff;
}

export default function PatentCliffDrawer({ cliff, allRows = [], companies = [], onClose }) {
  const open = Boolean(cliff);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // For each tracked company, find their earliest matching launch (if any).
  // Used to render "Launched [Brand] · [Date]" detail lines instead of just
  // a binary "launched / not launched" status.
  const positioning = useMemo(() => {
    if (!cliff) return [];
    return companies.map((company) => {
      const matches = allRows
        .filter(
          (r) =>
            r[COLUMN_KEYS.BUYER] === company &&
            moleculeMatchesCliff(r[COLUMN_KEYS.MOLECULE], cliff.molecule)
        )
        .sort(
          (a, b) =>
            new Date(a[COLUMN_KEYS.DATE]).getTime() -
            new Date(b[COLUMN_KEYS.DATE]).getTime()
        );
      const earliest = matches[0];
      return {
        company,
        launched: Boolean(earliest),
        brand: earliest?.[COLUMN_KEYS.BRAND] || null,
        date: earliest?.[COLUMN_KEYS.DATE] || null,
        launchType: earliest?.[COLUMN_KEYS.LAUNCH_TYPE] || null,
        totalLaunches: matches.length,
      };
    });
  }, [cliff, allRows, companies]);

  if (!open) return null;

  const launched = positioning.filter((p) => p.launched);
  const absent = positioning.filter((p) => !p.launched);
  const conf = CONFIDENCE_STYLES[cliff.confidence] || CONFIDENCE_STYLES.medium;
  const months = monthsUntil(cliff);
  const horizonLabel = months <= 0
    ? 'Already in the market'
    : months <= 12
      ? `Imminent · ${months} months out`
      : months <= 24
      ? `Near-term · ${months} months out`
      : `Future · ${months} months out`;

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={`Patent cliff detail for ${cliff.molecule}`}
    >
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-ink-100 flex flex-col animate-slide-in-right">
        <div className="px-5 pt-5 pb-4 border-b border-ink-100 bg-gradient-to-b from-pharma-50/60 to-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-pharma-700">
                Patent Cliff
              </p>
              <h2 className="text-xl font-bold text-ink-900 leading-tight mt-0.5 break-words">
                {cliff.molecule}
              </h2>
              {cliff.brand && (
                <p className="text-xs text-ink-600 mt-0.5">
                  Originator brand: <span className="font-semibold">{cliff.brand}</span>
                  {' · '}
                  <span className="text-ink-500">{cliff.innovator}</span>
                </p>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white text-ink-700 border border-ink-100">
                  <CalendarClock className="w-3 h-3 text-ink-500" />
                  India expiry: {fmtExpiry(cliff)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-white text-ink-700 border border-ink-100">
                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                  {conf.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-pharma-100 text-pharma-800 border border-pharma-200">
                  {horizonLabel}
                </span>
              </div>
            </div>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close detail panel"
              className="w-8 h-8 rounded-lg bg-white border border-ink-100 hover:bg-ink-100/60 flex items-center justify-center text-ink-700 shrink-0 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          {/* Opportunity overview */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="w-4 h-4 text-pharma-600" />
              <h3 className="text-[10px] uppercase tracking-wider font-bold text-ink-700">
                The opportunity
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-pharma-50 border border-pharma-100">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-pharma-700">
                  India TAM
                </p>
                <p className="text-xl font-bold text-ink-900 tabular-nums mt-0.5">
                  {fmtINR(cliff.indiaTAM_Cr)}
                </p>
                <p className="text-[10px] text-ink-500 mt-0.5">
                  Addressable Indian market
                </p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-teal-accent">
                  Therapy
                </p>
                <p className="text-sm font-bold text-ink-900 mt-0.5">{cliff.therapy}</p>
                <p className="text-[10px] text-ink-500 mt-0.5">{cliff.indication}</p>
              </div>
            </div>
          </section>

          {/* Plain-English narrative */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-pharma-600" />
              <h3 className="text-[10px] uppercase tracking-wider font-bold text-ink-700">
                What this means
              </h3>
            </div>
            <div className="text-[12px] text-ink-700 leading-relaxed bg-ink-50/60 border border-ink-100 rounded-lg p-3">
              <p>
                <span className="font-semibold">{cliff.molecule}</span> ({cliff.indication})
                is held by {cliff.innovator}; its India product patent is estimated to
                expire in <span className="font-semibold">{fmtExpiry(cliff)}</span>.
                Once that protection drops, the {fmtINR(cliff.indiaTAM_Cr)} Indian market
                opens to generic entrants.
              </p>
              <p className="mt-2">
                Of your {companies.length} tracked companies,{' '}
                <span className="font-semibold text-pharma-700">
                  {launched.length}
                </span>{' '}
                {launched.length === 1 ? 'has' : 'have'} already launched a matching brand
                {launched.length > 0 && (
                  <>
                    {' '}({launched.map((p) => p.company.replace(/\s+(Pharma|Lifesciences|Pharmaceuticals|Remedies)\s*$/i, '')).join(', ')})
                  </>
                )}
                .{' '}
                {absent.length > 0 ? (
                  <>
                    The remaining{' '}
                    <span className="font-semibold text-amber-700">{absent.length}</span>{' '}
                    {absent.length === 1 ? 'company has' : 'companies have'} no
                    matching launch on record — competitive whitespace if any of them
                    can file ahead of expiry.
                  </>
                ) : (
                  <>The Indian market is fully covered by your tracked names — saturated.</>
                )}
              </p>
            </div>
          </section>

          {/* Per-company positioning */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-pharma-600" />
              <h3 className="text-[10px] uppercase tracking-wider font-bold text-ink-700">
                Your {companies.length} companies — competitive positioning
              </h3>
            </div>
            <ul className="space-y-1.5">
              {positioning.map((p) => (
                <li
                  key={p.company}
                  className={`flex items-start gap-3 px-3 py-2 rounded-lg border ${
                    p.launched
                      ? 'bg-pharma-50/40 border-pharma-100'
                      : 'bg-white border-ink-100'
                  }`}
                >
                  {p.launched ? (
                    <CheckCircle2 className="w-4 h-4 text-pharma-600 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-300 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${p.launched ? 'text-ink-900' : 'text-ink-500'}`}>
                      {p.company}
                    </p>
                    {p.launched ? (
                      <p className="text-[11px] text-ink-600 mt-0.5">
                        Launched <span className="font-semibold">{p.brand}</span>
                        {p.launchType && (
                          <span className="text-ink-500"> · {p.launchType}</span>
                        )}
                        {p.date && (
                          <span className="text-ink-500"> · {fmtDate(p.date)}</span>
                        )}
                        {p.totalLaunches > 1 && (
                          <span className="text-ink-500">
                            {' '}(+{p.totalLaunches - 1} more brand{p.totalLaunches > 2 ? 's' : ''})
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-ink-400 mt-0.5">
                        No matching launch on record · competitive whitespace
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Notes / context */}
          {cliff.notes && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-ink-700">
                  Context
                </h3>
              </div>
              <div className="text-[12px] text-ink-700 leading-relaxed bg-amber-50/40 border border-amber-100 rounded-lg p-3">
                {cliff.notes}
              </div>
            </section>
          )}

          <p className="text-[10px] text-ink-400 leading-relaxed pt-2 border-t border-ink-100">
            Estimates compiled from public sources (USFDA Orange Book, IPO DRHPs,
            broker initiation notes). India-specific litigation can move effective
            expiry dates. Verify with patent counsel before acting on any
            opportunity.
          </p>
        </div>
      </aside>
    </div>
  );
}
