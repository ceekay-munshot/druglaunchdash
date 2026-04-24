import React, { useEffect, useMemo, useRef } from 'react';
import {
  X,
  CalendarDays,
  Building2,
  Briefcase,
  FlaskConical,
  Activity,
  Target,
  Tag,
  IndianRupee,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { COLUMN_KEYS, LAUNCH_TRACKER_ROWS } from '../data/mockData';
import { fmtDate, fmtINRPlain } from '../utils/format';

const LAUNCH_TYPE_STYLES = {
  Acquired: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In-licensed': 'bg-teal-50 text-teal-700 border-teal-200',
  'Own Launched': 'bg-lime-50 text-lime-700 border-lime-200',
};

const CHRONIC_STYLES = {
  Chronic: 'bg-pharma-50 text-pharma-700 border-pharma-200',
  Acute: 'bg-amber-50 text-amber-700 border-amber-200',
};

function Field({ icon: Icon, label, value, mono = false, dim = false }) {
  const empty = value === null || value === undefined || value === '' || value === '—';
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-pharma-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-pharma-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-500">{label}</p>
        <p
          className={`text-sm leading-snug ${mono ? 'tabular-nums' : ''} ${
            empty || dim ? 'text-ink-400' : 'text-ink-900'
          }`}
        >
          {empty ? '—' : value}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase tracking-wider font-bold text-ink-700">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export default function RowDetailDrawer({ row, onClose }) {
  const open = Boolean(row);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Move focus to close button for accessibility / keyboard users.
    closeRef.current?.focus();
    // Prevent background scroll while drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const relatedByBuyer = useMemo(() => {
    if (!row) return [];
    const buyer = row[COLUMN_KEYS.BUYER];
    return LAUNCH_TRACKER_ROWS.filter(
      (r) => r[COLUMN_KEYS.BUYER] === buyer && r !== row
    )
      .sort(
        (a, b) =>
          new Date(b[COLUMN_KEYS.DATE]).getTime() - new Date(a[COLUMN_KEYS.DATE]).getTime()
      )
      .slice(0, 5);
  }, [row]);

  if (!open) return null;

  const launchType = row[COLUMN_KEYS.LAUNCH_TYPE];
  const chronic = row[COLUMN_KEYS.CHRONIC_ACUTE];

  return (
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label={`Launch detail for ${row[COLUMN_KEYS.BRAND]}`}
    >
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full sm:w-[460px] bg-white shadow-2xl border-l border-ink-100 flex flex-col animate-slide-in-right">
        <div className="px-5 pt-5 pb-4 border-b border-ink-100 bg-gradient-to-b from-pharma-50/60 to-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-pharma-700">
                Launch Detail
              </p>
              <h2 className="text-xl font-bold text-ink-900 leading-tight mt-0.5 break-words">
                {row[COLUMN_KEYS.BRAND]}
              </h2>
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                {launchType && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      LAUNCH_TYPE_STYLES[launchType] ||
                      'bg-ink-100 text-ink-700 border-ink-100'
                    }`}
                  >
                    {launchType}
                  </span>
                )}
                {chronic && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                      CHRONIC_STYLES[chronic] ||
                      'bg-ink-100 text-ink-700 border-ink-100'
                    }`}
                  >
                    {chronic}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-white text-ink-700 border border-ink-100">
                  <CalendarDays className="w-3 h-3 text-ink-500" />
                  {fmtDate(row[COLUMN_KEYS.DATE])}
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

          <div className="flex items-center gap-2 mt-4 text-xs">
            <span className="font-medium text-ink-700 truncate">
              {row[COLUMN_KEYS.SELLER] || '—'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-pharma-600 shrink-0" />
            <span className="font-semibold text-ink-900 truncate">
              {row[COLUMN_KEYS.BUYER] || '—'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin">
          <Section title="Deal">
            <Field icon={Tag} label="Deal Type" value={row[COLUMN_KEYS.DEAL_TYPE]} />
            <Field
              icon={IndianRupee}
              label="India Market Size"
              value={fmtINRPlain(row[COLUMN_KEYS.MARKET_SIZE])}
              mono
              dim={
                row[COLUMN_KEYS.MARKET_SIZE] === null ||
                row[COLUMN_KEYS.MARKET_SIZE] === undefined
              }
            />
            <Field icon={Building2} label="Buyer" value={row[COLUMN_KEYS.BUYER]} />
            <Field icon={Briefcase} label="Seller" value={row[COLUMN_KEYS.SELLER]} />
          </Section>

          <Section title="Science">
            <Field icon={FlaskConical} label="Molecule" value={row[COLUMN_KEYS.MOLECULE]} />
            <Field icon={Activity} label="Therapy" value={row[COLUMN_KEYS.THERAPY]} />
            <Field
              icon={Target}
              label="Disease / Indication"
              value={row[COLUMN_KEYS.INDICATION]}
            />
            <Field
              icon={Layers}
              label="Existing Brand (Same Molecule)"
              value={row[COLUMN_KEYS.EXISTING_BRAND]}
            />
          </Section>

          {relatedByBuyer.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-ink-700 mb-3">
                Other launches by {row[COLUMN_KEYS.BUYER]}
              </h4>
              <ul className="space-y-1.5">
                {relatedByBuyer.map((r, i) => (
                  <li
                    key={`${r[COLUMN_KEYS.BRAND]}-${i}`}
                    className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg border border-ink-100/70 bg-white hover:bg-pharma-50/40 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900 truncate">
                        {r[COLUMN_KEYS.BRAND]}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate">
                        {r[COLUMN_KEYS.THERAPY] || '—'}
                        {r[COLUMN_KEYS.MOLECULE] ? ` · ${r[COLUMN_KEYS.MOLECULE]}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[11px] text-ink-700 tabular-nums whitespace-nowrap">
                        {fmtDate(r[COLUMN_KEYS.DATE])}
                      </span>
                      {r[COLUMN_KEYS.LAUNCH_TYPE] && (
                        <span
                          className={`mt-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${
                            LAUNCH_TYPE_STYLES[r[COLUMN_KEYS.LAUNCH_TYPE]] ||
                            'bg-ink-100 text-ink-700 border-ink-100'
                          }`}
                        >
                          {r[COLUMN_KEYS.LAUNCH_TYPE]}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-ink-100 bg-ink-100/30 text-[11px] text-ink-500">
          Press <kbd className="px-1.5 py-0.5 rounded border border-ink-100 bg-white font-mono text-[10px]">Esc</kbd> to close · click outside panel to dismiss
        </div>
      </aside>
    </div>
  );
}
