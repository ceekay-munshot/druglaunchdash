import React, { useMemo, useEffect, useRef, useState } from 'react';
import { History, Play, Pause, RotateCcw } from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';

// "Time machine" — drag the slider to view the dashboard as it would have
// looked on a past date. Implementation is just a max-date cap on the row
// stream: rows whose Date > viewingDate are filtered out at the App level.
//
// The trick that makes this feel like a movie scrubber rather than a
// filter is: we expose viewingDate as a number (epoch ms) and let App's
// filteredRows re-derive on every change. React's reconciliation on a
// stable row identity keeps the table from re-mounting, so KPIs animate
// smoothly as the slider moves.

const STEP_MS = 86_400_000; // 1 day — slider resolution

function fmtDate(ms) {
  return new Date(ms).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function fmtMonth(ms) {
  return new Date(ms).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
  });
}

export default function TimeMachineSlider({ allRows, viewingDate, onChange }) {
  // Slider is always visible by default — the previous "click the icon to
  // expand" affordance was invisible to first-time users. The collapse
  // toggle still exists if a user wants to compact the bar.
  const [collapsed, setCollapsed] = useState(false);

  // Slider range = earliest dated row → today. We snap min back a month so
  // the leftmost slider position is meaningfully empty (not "1 row visible").
  const { minMs, maxMs } = useMemo(() => {
    let earliest = Date.now();
    for (const r of allRows) {
      const d = r[COLUMN_KEYS.DATE];
      if (!d) continue;
      const t = new Date(d).getTime();
      if (!isNaN(t) && t < earliest) earliest = t;
    }
    // Cushion: if the earliest row is in 2017 we let the slider start at
    // 2016-12 so day 0 shows an empty board ("before the data begins").
    earliest = earliest - 30 * STEP_MS;
    return { minMs: earliest, maxMs: Date.now() };
  }, [allRows]);

  const isLive = viewingDate == null || viewingDate >= maxMs;
  const sliderValue = isLive ? maxMs : viewingDate;

  // ── Auto-play scrubber ──────────────────────────────────────────────
  // Animates the slider from current position → today over ~6s. Lets the
  // user "watch the market evolve" without dragging. Stops automatically
  // when it reaches today.
  const [playing, setPlaying] = useState(false);
  const playRef = useRef({ startTime: 0, fromMs: 0 });

  useEffect(() => {
    if (!playing) return;
    const total = maxMs - sliderValue;
    if (total <= 0) {
      setPlaying(false);
      return;
    }
    const PLAY_DURATION_MS = 6000;
    playRef.current = { startTime: performance.now(), fromMs: sliderValue };
    let raf;
    const step = (now) => {
      const elapsed = now - playRef.current.startTime;
      const t = Math.min(1, elapsed / PLAY_DURATION_MS);
      const next = playRef.current.fromMs + total * t;
      if (next >= maxMs - STEP_MS) {
        onChange(null);
        setPlaying(false);
        return;
      }
      onChange(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
    // sliderValue intentionally captured at play-start via playRef rather
    // than depended-on (otherwise every onChange retriggers the effect
    // and resets the animation start time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const reset = () => {
    setPlaying(false);
    onChange(null);
  };

  return (
    <div
      className={`relative rounded-2xl border shadow-card transition-all overflow-hidden ${
        isLive
          ? 'bg-white border-ink-100'
          : 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-300'
      }`}
    >
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition shrink-0 ${
            isLive
              ? 'bg-pharma-50 text-pharma-600 hover:bg-pharma-100'
              : 'bg-amber-200 text-amber-800'
          }`}
          title={collapsed ? 'Expand time machine' : 'Collapse'}
          aria-label={collapsed ? 'Expand time machine' : 'Collapse'}
        >
          <History className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-ink-900">Time Machine</h3>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-pharma-700">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pharma-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pharma-500" />
                </span>
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                As of {fmtDate(sliderValue)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Drag the slider below to rewind the entire dashboard to a past date — KPIs, charts, table all re-render as of then. Hit ▶ to auto-advance.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={isLive}
            title={playing ? 'Pause' : 'Auto-advance to today'}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition ${
              isLive
                ? 'bg-ink-50 text-ink-300 border-ink-100 cursor-not-allowed'
                : playing
                  ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
            }`}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={reset}
            disabled={isLive}
            title="Reset to live"
            className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border text-xs font-semibold transition ${
              isLive
                ? 'bg-ink-50 text-ink-300 border-ink-100 cursor-not-allowed'
                : 'bg-white text-pharma-700 border-pharma-200 hover:bg-pharma-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Live
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          <input
            type="range"
            min={minMs}
            max={maxMs}
            step={STEP_MS}
            value={sliderValue}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPlaying(false);
              // Snap to "live" when the user drags within 1 day of today —
              // otherwise the slider could land at "today minus 6 hours"
              // and the dashboard would still hide one or two same-day
              // events that should be visible in live view.
              if (v >= maxMs - STEP_MS) onChange(null);
              else onChange(v);
            }}
            className={`w-full appearance-none h-2 rounded-full cursor-pointer accent-amber-500 ${
              isLive ? 'accent-pharma-500' : 'accent-amber-500'
            }`}
            aria-label="Time machine date"
          />
          <div className="flex justify-between text-[10px] text-ink-500 mt-1.5 px-0.5 tabular-nums">
            <span>{fmtMonth(minMs)}</span>
            <span className={isLive ? 'text-pharma-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {fmtDate(sliderValue)}
            </span>
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
