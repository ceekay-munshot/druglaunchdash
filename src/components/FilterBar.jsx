import React from 'react';
import { CalendarRange } from 'lucide-react';
import { fmtDate } from '../utils/format';

export default function FilterBar({
  timeline,
  setTimeline,
  timelinePresets,
  timelineCutoff,
}) {
  return (
    <div className="bg-white border border-ink-100 rounded-2xl shadow-card px-4 py-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pharma-50 flex items-center justify-center">
            <CalendarRange className="w-4 h-4 text-pharma-600" />
          </div>
          <h3 className="text-sm font-semibold text-ink-900">Timeline</h3>
          <span className="text-xs text-ink-500">
            {timelineCutoff
              ? `Showing launches from ${fmtDate(timelineCutoff)} onwards`
              : 'Showing all launches (no date filter)'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {timelinePresets &&
            Object.entries(timelinePresets).map(([key, cfg]) => {
              const active = timeline === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimeline(key)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition ${
                    active
                      ? 'bg-pharma-600 text-white border-pharma-600 shadow-sm'
                      : 'bg-white text-ink-700 border-ink-100 hover:border-pharma-300 hover:text-pharma-700'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
