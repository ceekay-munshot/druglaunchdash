import React, { useMemo, useState } from 'react';
import {
  Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  ChartNoAxesColumn, Layers, ShieldAlert, Syringe, Trophy, Info, ChevronDown,
} from 'lucide-react';
import {
  IPM_REPORT_META, IPM_HEADLINE, THERAPY_AREAS, COMPANIES, IPM_AVG,
  SEMA_SHARE_MAR26, TIRZ_SHARE_MAR26, GLP1_OUTLOOK, ANALYST_TAKES,
} from '../data/ipmReport';

// ── Visual primitives ───────────────────────────────────────────────────────

// Section wrapper — keeps every scene's chrome consistent with the Launch
// Tracker dashboard's existing card style.
function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-pharma-50 shrink-0">
          <Icon className="w-4.5 h-4.5 text-pharma-700" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// "So what" caption that frames each chart in plain English. Sits below the
// visual so the reader's eye lands on the chart first, then the takeaway.
function Caption({ children }) {
  return (
    <p className="text-[12px] text-ink-600 mt-3 leading-relaxed bg-ink-50/60 rounded-lg px-3 py-2 border border-ink-100/60">
      <Info className="w-3.5 h-3.5 inline-block text-ink-400 mr-1.5 -mt-0.5" />
      {children}
    </p>
  );
}

// Big-number tile for headline KPIs.
function KpiTile({ label, value, sub, tone = 'default' }) {
  const accentBg =
    tone === 'positive' ? 'bg-gradient-to-br from-pharma-500 to-teal-accent'
    : tone === 'caution' ? 'bg-gradient-to-br from-amber-400 to-amber-500'
    : tone === 'negative' ? 'bg-gradient-to-br from-rose-400 to-rose-500'
    : 'bg-gradient-to-br from-ink-300 to-ink-400';
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4 relative overflow-hidden">
      <span className={`absolute top-0 left-0 right-0 h-1 ${accentBg}`} />
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mt-1">{label}</div>
      <div className="text-2xl font-bold text-ink-900 mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-ink-500 mt-1 leading-snug">{sub}</div>}
    </div>
  );
}

// Inline horizontal bar — a thin div whose width encodes the value. Used in
// the scoreboard, NLEM heat, chronic-shift rows, etc.
function Bar({ pct, color, height = 'h-2', track = 'bg-ink-100' }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className={`w-full ${track} rounded-full overflow-hidden ${height}`}>
      <div className={`h-full ${color} rounded-full transition-[width]`} style={{ width: `${w}%` }} />
    </div>
  );
}

// Tone-graded chip used in analyst cards / segment labels.
function ToneTag({ tone, children }) {
  const cls =
    tone === 'positive' ? 'bg-pharma-50 text-pharma-700 border-pharma-200'
    : tone === 'caution' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : tone === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-ink-50 text-ink-700 border-ink-100';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

// ── Scene 1 — Market Pulse ──────────────────────────────────────────────────
function MarketPulse() {
  const h = IPM_HEADLINE;
  const mkt = `Rs ${(h.sizeFY26Cr / 1000).toFixed(0)}K Cr`;
  return (
    <Section
      icon={Activity}
      title="The Indian Pharma Market right now"
      subtitle="FY26 size, growth trajectory, and what's actually inside the market"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Market size (FY26)"
          value={mkt}
          sub="Rs 2.46 lakh crore — India Pharma Market, FY26"
          tone="positive"
        />
        <KpiTile
          label="Growth (FY26)"
          value={`+${h.fy26GrowthYoY}%`}
          sub={`Accelerating from ${h.fy22_26Cagr}% 4-yr Cagr`}
          tone="positive"
        />
        <KpiTile
          label="Chronic share"
          value={`${h.chronicShareFY26}%`}
          sub="Long-term medicines (diabetes, heart, asthma)"
          tone="positive"
        />
        <KpiTile
          label="Acute share"
          value={`${h.acuteShareFY26}%`}
          sub="Short-course medicines (antibiotics, cough)"
          tone="caution"
        />
      </div>

      {/* Stacked bar visualising the Chronic / Sub-Chronic / Acute split. */}
      <div className="mt-4">
        <div className="text-[11px] text-ink-500 mb-2">Market mix · FY26</div>
        <div className="flex h-3 rounded-full overflow-hidden bg-ink-100">
          <div className="bg-gradient-to-r from-pharma-500 to-teal-accent" style={{ width: `${h.chronicShareFY26}%` }}
               title={`Chronic ${h.chronicShareFY26}% · ${h.chronicCagrFY22_26}% Cagr`} />
          <div className="bg-pharma-300" style={{ width: `${h.subChronicShareFY26}%` }}
               title={`Sub-Chronic ${h.subChronicShareFY26}% · ${h.subChronicCagrFY22_26}% Cagr`} />
          <div className="bg-amber-300" style={{ width: `${h.acuteShareFY26}%` }}
               title={`Acute ${h.acuteShareFY26}% · ${h.acuteCagrFY22_26}% Cagr`} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-pharma-500 mr-1.5" />
            <span className="font-semibold text-ink-900">Chronic {h.chronicShareFY26}%</span>
            <span className="text-ink-500"> · growing {h.chronicCagrFY22_26}%</span>
          </div>
          <div className="text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-pharma-300 mr-1.5" />
            <span className="font-semibold text-ink-900">Sub-Chronic {h.subChronicShareFY26}%</span>
            <span className="text-ink-500"> · growing {h.subChronicCagrFY22_26}%</span>
          </div>
          <div className="text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-300 mr-1.5" />
            <span className="font-semibold text-ink-900">Acute {h.acuteShareFY26}%</span>
            <span className="text-ink-500"> · growing {h.acuteCagrFY22_26}%</span>
          </div>
        </div>
      </div>

      <Caption>
        Half the market (chronic + sub-chronic) is long-term medicines like cardiac, diabetes and respiratory —
        growing at ~10% a year. The other half is short-course (antibiotics, cough/cold) and stagnant at ~6.7%.
        Companies leaning into the green half are gaining a valuation premium.
      </Caption>
    </Section>
  );
}

// ── Scene 2 — Scoreboard ────────────────────────────────────────────────────
function Scoreboard() {
  const [expanded, setExpanded] = useState(false);
  // This-year ranking (FY22-26), sorted by composite score desc.
  const fy26Ranked = useMemo(
    () =>
      [...COMPANIES]
        .sort((a, b) => b.compositeFY22_26 - a.compositeFY22_26 || a.short.localeCompare(b.short))
        .map((c, i) => ({ ...c, fy26Rank: i + 1 })),
    []
  );

  // Last-year ranking (FY23-25) — only across companies that had a previous score.
  // Torrent+JB merged didn't exist; Emcure wasn't in last year's analysis.
  const fy25RankByName = useMemo(() => {
    const previous = COMPANIES.filter((c) => c.compositeFY23_25 != null);
    const sorted = [...previous].sort(
      (a, b) => b.compositeFY23_25 - a.compositeFY23_25 || a.short.localeCompare(b.short)
    );
    const m = new Map();
    sorted.forEach((c, i) => m.set(c.name, i + 1));
    return m;
  }, []);

  // Tier tint — left-border accent + soft row background, no abstract score bar.
  const tierTint = (score) =>
    score >= 65 ? 'bg-pharma-50/40 border-l-2 border-pharma-400'
    : score >= 45 ? 'border-l-2 border-ink-200'
    : 'bg-rose-50/30 border-l-2 border-rose-300';

  // Collapsed to the top 10; the rest reveal behind a button.
  const visible = expanded ? fy26Ranked : fy26Ranked.slice(0, 10);
  const hiddenCount = fy26Ranked.length - 10;

  return (
    <Section
      icon={Trophy}
      title="The scoreboard — rank movers"
      subtitle="IIFL's 21-company composite ranking. This year's rank, last year's rank, and the movement."
    >
      <div className="grid grid-cols-[40px_1fr_70px_120px] md:grid-cols-[56px_1fr_90px_140px] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-ink-500 border-b border-ink-100">
        <div>Rank</div>
        <div>Company</div>
        <div className="text-right">Was</div>
        <div className="text-right">Change</div>
      </div>
      <div>
        {visible.map((c) => {
          const lastRank = fy25RankByName.get(c.name);
          const isNew = c.compositeFY23_25 == null;
          const delta = isNew ? null : lastRank - c.fy26Rank;

          let changeNode;
          if (isNew) {
            changeNode = (
              <span className="text-[10px] font-bold text-pharma-700 bg-pharma-50 px-2 py-0.5 rounded border border-pharma-200">
                NEW
              </span>
            );
          } else if (delta === 0) {
            changeNode = <span className="text-xs text-ink-400">─ no change</span>;
          } else if (delta > 0) {
            const fire = delta >= 5;
            changeNode = (
              <span className={`inline-flex items-center gap-1 text-xs font-bold text-pharma-700 ${fire ? 'bg-pharma-50 px-2 py-0.5 rounded' : ''}`}>
                {fire && <span>🔥</span>}
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+{delta} {fire ? '' : 'spot' + (delta === 1 ? '' : 's')}</span>
              </span>
            );
          } else {
            const warn = delta <= -5;
            changeNode = (
              <span className={`inline-flex items-center gap-1 text-xs font-bold text-rose-700 ${warn ? 'bg-rose-50 px-2 py-0.5 rounded' : ''}`}>
                {warn && <span>⚠️</span>}
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{delta} {warn ? '' : 'spot' + (delta === -1 ? '' : 's')}</span>
              </span>
            );
          }

          return (
            <div
              key={c.name}
              className={`grid grid-cols-[40px_1fr_70px_120px] md:grid-cols-[56px_1fr_90px_140px] gap-3 px-3 py-2.5 items-center ${tierTint(c.compositeFY22_26)} ${c.fy26Rank > 1 ? 'border-t border-ink-100/50' : ''}`}
            >
              <div className="text-sm font-bold text-ink-900 tabular-nums">#{c.fy26Rank}</div>
              <div className="text-sm font-medium text-ink-900 truncate" title={c.name}>{c.short}</div>
              <div className="text-xs text-ink-500 tabular-nums text-right">
                {isNew ? '—' : `#${lastRank}`}
              </div>
              <div className="flex justify-end">{changeNode}</div>
            </div>
          );
        })}
      </div>
      {hiddenCount > 0 && (
        <div className="flex justify-center mt-2.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-pharma-700 bg-pharma-50 hover:bg-pharma-100 border border-pharma-200 rounded-full px-3.5 py-1.5 transition-colors"
          >
            {expanded ? 'Show top 10 only' : `Show ${hiddenCount} more companies`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] text-ink-500">
        <div className="flex items-center gap-1.5"><span className="w-2 h-3 rounded-sm bg-pharma-400" />Top tier (score ≥65)</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-3 rounded-sm bg-ink-200" />Middle pack</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-3 rounded-sm bg-rose-300" />Bottom (&lt;45)</div>
        <div className="ml-auto">🔥 big climber · ⚠️ big slip (≥5 spots)</div>
      </div>
      <Caption>
        The movement column tells the story. Big climbers this year: <b>Alkem (+8), Mankind (+7), Torrent (+6)</b> — all
        moving into the top tier. Big slippers: <b>Ipca (−13), Abbott (−10), FDC (−9)</b> — significant fall-offs
        worth investigating if any of these are in a portfolio.
      </Caption>
    </Section>
  );
}

// ── Scene 3 — Quality of Growth (volume vs price) ───────────────────────────
// Small "where the market is heading" trend tile. The IIFL report only gives
// per-company Cagr in aggregate — no year-by-year decomposition — but it DOES
// give the FY22-25 vs FY26 breakdown for the IPM as a whole, which answers
// the "what's the trend" question at market level.
function TrendTile({ label, oldVal, newVal, direction }) {
  const c =
    direction === 'up'   ? { newCls: 'text-pharma-700', tagCls: 'text-pharma-700', tag: '↑ accelerating' }
    : direction === 'down' ? { newCls: 'text-rose-700',   tagCls: 'text-rose-700',   tag: '↓ decelerating' }
    : { newCls: 'text-ink-700', tagCls: 'text-ink-500', tag: '→ flat' };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-500">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-sm text-ink-400 tabular-nums">{oldVal}</span>
        <span className="text-ink-400 text-xs">→</span>
        <span className={`text-lg font-bold tabular-nums ${c.newCls}`}>{newVal}</span>
      </div>
      <div className={`text-[10px] font-semibold mt-0.5 ${c.tagCls}`}>{c.tag}</div>
    </div>
  );
}

function GrowthQuality() {
  const h = IPM_HEADLINE;
  const volumeLed = useMemo(
    () => [...COMPANIES].filter((c) => c.volContPct >= 25 && c.volCagrFY22_26 > 0)
      .sort((a, b) => b.volCagrFY22_26 - a.volCagrFY22_26)
      .slice(0, 7),
    []
  );
  const priceLed = useMemo(
    () => [...COMPANIES].filter((c) => c.volContPct < 25 && c.priceNICagrFY22_26 > 0)
      .sort((a, b) => b.priceNICagrFY22_26 - a.priceNICagrFY22_26)
      .slice(0, 7),
    []
  );
  const maxVol = Math.max(...volumeLed.map((c) => c.volCagrFY22_26), 1);
  const maxPrice = Math.max(...priceLed.map((c) => c.priceNICagrFY22_26), 1);

  return (
    <Section
      icon={ChartNoAxesColumn}
      title="How they're growing — units vs price"
      subtitle="Volume-led growth = more patients buying. Price-led = same patients, costlier prescription."
    >
      {/* Where the market is heading — IPM-level trend tile */}
      <div className="bg-ink-50/60 rounded-xl p-4 mb-4 border border-ink-100/80">
        <div className="text-xs font-semibold text-ink-900 mb-3 flex items-center gap-1.5">
          📊 Where the market is heading <span className="text-[10px] text-ink-500 font-normal">(FY22-25 4-yr average → FY26 latest year)</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <TrendTile label="Volume"       oldVal={`+${h.fy22_25_volumeCagr}%`}     newVal={`+${h.fy26_volumeYoY}%`}     direction="up" />
          <TrendTile label="Price"        oldVal={`+${h.fy22_25_priceCagr}%`}      newVal={`+${h.fy26_priceYoY}%`}      direction="flat" />
          <TrendTile label="New launches" oldVal={`+${h.fy22_25_newLaunchCagr}%`}  newVal={`+${h.fy26_newLaunchYoY}%`}  direction="flat" />
        </div>
        <div className="text-[11px] text-ink-600 mt-3 leading-relaxed">
          The market shift is real: <b>volume growth is accelerating sharply</b> (GLP-1 wave + LoEs falling out of base);
          <b> price growth has plateaued</b> (NLEM caps + Jan Aushadhi pressure). Companies still leaning on price hikes
          are running an aging playbook.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-pharma-50/40 rounded-xl p-4 border border-pharma-100/60">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-pharma-700" />
            <div>
              <div className="text-xs font-semibold text-ink-900">Growing by selling more units</div>
              <div className="text-[10px] text-ink-500">Volume-led · sustainable demand · aligned with market trend</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {volumeLed.map((c) => {
              const gap = (c.volCagrFY22_26 - IPM_AVG.volCagrFY22_26).toFixed(1);
              return (
                <div key={c.name} className="grid grid-cols-[90px_1fr_82px] items-center gap-2">
                  <div className="text-[11px] font-medium text-ink-900 truncate" title={c.name}>{c.short}</div>
                  <Bar pct={(c.volCagrFY22_26 / maxVol) * 100} color="bg-pharma-500" height="h-2" />
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-pharma-700 tabular-nums leading-none">+{c.volCagrFY22_26}%</div>
                    <div className="text-[9px] text-ink-500 tabular-nums mt-0.5">+{gap} pp vs mkt</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-ink-500 mt-3">Volume Cagr FY22-26 · IPM avg <b className="text-ink-700">+{IPM_AVG.volCagrFY22_26}%</b></div>
        </div>

        <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-100/60">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-700" />
            <div>
              <div className="text-xs font-semibold text-ink-900">Growing by raising prices</div>
              <div className="text-[10px] text-ink-500">Price + new launches · limited headroom · old playbook</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {priceLed.map((c) => {
              const gap = (c.priceNICagrFY22_26 - IPM_AVG.priceNICagrFY22_26).toFixed(1);
              const gapSign = gap >= 0 ? '+' : '';
              return (
                <div key={c.name} className="grid grid-cols-[90px_1fr_82px] items-center gap-2">
                  <div className="text-[11px] font-medium text-ink-900 truncate" title={c.name}>{c.short}</div>
                  <Bar pct={(c.priceNICagrFY22_26 / maxPrice) * 100} color="bg-amber-500" height="h-2" />
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-amber-700 tabular-nums leading-none">+{c.priceNICagrFY22_26}%</div>
                    <div className="text-[9px] text-ink-500 tabular-nums mt-0.5">{gapSign}{gap} pp vs mkt</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-ink-500 mt-3">Price + new-launch Cagr FY22-26 · IPM avg <b className="text-ink-700">+{IPM_AVG.priceNICagrFY22_26}%</b></div>
        </div>
      </div>

      <Caption>
        The market is rotating toward <b>volume-led growth</b> (top panel shows volume accelerating from +0.7% to +2.7%).
        Corona, Ajanta, Cipla, Glenmark, Alkem and FDC are riding that wave — getting more patients on their products.
        Torrent+JB, Zydus, Abbott have grown almost entirely on price — fine while the market allowed it, but price headroom
        is shrinking and that well is starting to run dry.
      </Caption>
    </Section>
  );
}

// ── Scene 4 — Chronic Shift ─────────────────────────────────────────────────
function ChronicShift() {
  const ranked = useMemo(
    () => [...COMPANIES]
      .filter((c) => c.chronicSubMSGainBps != null)
      .sort((a, b) => b.chronicSubMSGainBps - a.chronicSubMSGainBps),
    []
  );
  const top = ranked.slice(0, 6);
  const bottom = ranked.slice(-5).reverse();

  const Row = ({ c, isGainer }) => {
    const bps = c.chronicSubMSGainBps;
    return (
      <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 py-1.5">
        <div className="text-xs font-medium text-ink-900 truncate" title={c.name}>{c.short}</div>
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <span className="text-ink-500">{c.chronicSubMSFY22.toFixed(1)}%</span>
          {isGainer
            ? <ArrowUpRight className="w-3.5 h-3.5 text-pharma-600" />
            : <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />}
          <span className="font-semibold text-ink-900">{c.chronicSubMSFY26.toFixed(1)}%</span>
        </div>
        <div className={`text-[11px] font-bold tabular-nums text-right ${isGainer ? 'text-pharma-700' : 'text-rose-700'}`}>
          {bps > 0 ? '+' : ''}{bps} bps
        </div>
      </div>
    );
  };

  return (
    <Section
      icon={Layers}
      title="Who's winning the chronic shift"
      subtitle="Change in Chronic + Sub-Chronic market share, FY22 → FY26 (the segment that drives the highest valuations)"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold text-pharma-700 uppercase tracking-wider mb-1">▲ Gaining share</div>
          {top.map((c) => <Row key={c.name} c={c} isGainer={true} />)}
        </div>
        <div>
          <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider mb-1">▼ Losing share</div>
          {bottom.map((c) => <Row key={c.name} c={c} isGainer={false} />)}
        </div>
      </div>
      <Caption>
        Chronic + Sub-Chronic medicines = 56% of the market but ~70% of the growth. Companies gaining share here are compounding
        the most valuable revenue line. <b>Sun, Torrent+JB, Mankind, Corona</b> are the standouts. <b>Emcure, Abbott, Lupin</b> are
        leaking the franchise faster than the rest of their business can compensate.
      </Caption>
    </Section>
  );
}

// ── Scene 5 — Pricing freedom (NLEM risk, plain-English framing) ────────────
function NlemRisk() {
  // Sort by capped % descending — most squeezed at top.
  const ranked = useMemo(
    () => [...COMPANIES].sort((a, b) => b.nlemExposurePct - a.nlemExposurePct),
    []
  );

  // Severity grade by the share of revenue under government price control.
  const grade = (pct) =>
    pct >= 25 ? { bar: 'bg-rose-500', text: 'text-rose-700' }
    : pct >= 12 ? { bar: 'bg-amber-500', text: 'text-amber-700' }
    : { bar: 'bg-pharma-500', text: 'text-pharma-700' };

  return (
    <Section
      icon={ShieldAlert}
      title="Pricing freedom — who can raise prices, who's stuck"
      subtitle="Each bar is the share of a company's sales under government price control (NLEM). Shorter bar = more freedom to raise prices."
    >
      <div className="space-y-1.5">
        {ranked.map((c) => {
          const g = grade(c.nlemExposurePct);
          return (
            <div key={c.name} className="grid grid-cols-[110px_1fr_44px] items-center gap-3">
              <div className="text-[11px] font-medium text-ink-900 truncate" title={c.name}>{c.short}</div>
              <Bar pct={c.nlemExposurePct} color={g.bar} height="h-2.5" />
              <div className={`text-[11px] font-bold tabular-nums text-right ${g.text}`}>
                {c.nlemExposurePct}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[10px] text-ink-500">
        <span className="font-semibold text-ink-600">Share of sales under price control:</span>
        <div className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-rose-500" />High · 25%+</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-amber-500" />Medium · 12–24%</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm bg-pharma-500" />Low · under 12%</div>
        <div className="ml-auto">IPM avg <b className="text-ink-700">{IPM_AVG.nlemExposurePct}%</b></div>
      </div>
    </Section>
  );
}

// ── Scene 6 — GLP-1 Wave ────────────────────────────────────────────────────
function GlpWave() {
  const semaSorted = [...SEMA_SHARE_MAR26].sort((a, b) => b.share - a.share);
  const tirzSorted = [...TIRZ_SHARE_MAR26].sort((a, b) => b.share - a.share);

  const semaTotal = semaSorted.reduce((s, x) => s + x.share, 0);

  return (
    <Section
      icon={Syringe}
      title="The GLP-1 wave — single biggest thing happening"
      subtitle="Semaglutide (Ozempic/Wegovy) generics launched Mar-26; Tirzepatide (Mounjaro) is a different game"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiTile
          label="Market opening (2-3 yr)"
          value="~Rs 10,000 cr"
          sub={`~4.5% of current IPM · IPM growth +${GLP1_OUTLOOK.ipmGrowthAccelerationBpsFromSema} bps potential`}
          tone="positive"
        />
        <KpiTile
          label="Generic Sema launchers"
          value={GLP1_OUTLOOK.semaCompaniesLaunching}
          sub={`Pricing ${GLP1_OUTLOOK.semaGenericDiscount} below Novo's Wegovy → price war ahead`}
          tone="caution"
        />
        <KpiTile
          label="Tirzepatide co-marketers"
          value="Only 2"
          sub="Eli Lilly + Cipla — oligopoly, not price war"
          tone="positive"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-ink-50/60 rounded-xl p-4 border border-ink-100">
          <div className="text-xs font-semibold text-ink-900 mb-1">Semaglutide market share · Mar-26</div>
          <div className="text-[10px] text-ink-500 mb-3">First month after generic launch (Novo still dominant; Torrent leads generics)</div>
          {semaSorted.map((row) => (
            <div key={row.company} className="grid grid-cols-[110px_1fr_44px] items-center gap-2 py-1">
              <div className="text-[11px] font-medium text-ink-900 truncate">{row.company}</div>
              <Bar
                pct={(row.share / 100) * 100}
                color={row.kind === 'innovator' ? 'bg-ink-700' : 'bg-pharma-500'}
                height="h-2"
              />
              <div className="text-[11px] font-bold text-ink-900 tabular-nums text-right">{row.share}%</div>
            </div>
          ))}
          {semaTotal < 100 && (
            <div className="grid grid-cols-[110px_1fr_44px] items-center gap-2 py-1">
              <div className="text-[11px] font-medium text-ink-500 truncate">Others (&lt;1% each)</div>
              <Bar pct={100 - semaTotal} color="bg-ink-300" height="h-2" />
              <div className="text-[11px] font-medium text-ink-500 tabular-nums text-right">{100 - semaTotal}%</div>
            </div>
          )}
        </div>

        <div className="bg-ink-50/60 rounded-xl p-4 border border-ink-100">
          <div className="text-xs font-semibold text-ink-900 mb-1">Tirzepatide market share · Mar-26</div>
          <div className="text-[10px] text-ink-500 mb-3">Mounjaro / Zepbound — only innovator + co-marketer; no generics yet</div>
          {tirzSorted.map((row) => (
            <div key={row.company} className="grid grid-cols-[110px_1fr_44px] items-center gap-2 py-1">
              <div className="text-[11px] font-medium text-ink-900 truncate">{row.company}</div>
              <Bar
                pct={row.share}
                color={row.kind === 'innovator' ? 'bg-ink-700' : 'bg-pharma-500'}
                height="h-2"
              />
              <div className="text-[11px] font-bold text-ink-900 tabular-nums text-right">{row.share}%</div>
            </div>
          ))}
          <div className="mt-4 p-3 rounded-lg bg-pharma-50/60 border border-pharma-100">
            <div className="text-[11px] font-semibold text-pharma-700 mb-1">💎 Hidden upside</div>
            <div className="text-[11px] text-ink-700 leading-relaxed">
              <b>Cipla</b> is the only Indian company with Tirzepatide co-marketing rights. While 30+ companies fight over Sema generics,
              Cipla operates in an oligopoly — better margins, better defensibility.
            </div>
          </div>
        </div>
      </div>

      <Caption>
        Two molecules, two completely different stocks-stories. <b>Semaglutide</b> = volume war — 30+ launchers driving prices down 40-80% from Novo's brand.
        Torrent currently leads the generic share at 8%. <b>Tirzepatide</b> = oligopoly — only Eli Lilly + Cipla. The companies that benefit are
        very different in each case.
      </Caption>
    </Section>
  );
}

// ── Scene 7 — Buy-side analyst takes ────────────────────────────────────────
function AnalystTakes() {
  const toneCard = {
    positive: 'border-pharma-200 bg-gradient-to-br from-pharma-50/40 to-white',
    caution:  'border-amber-200 bg-gradient-to-br from-amber-50/40 to-white',
    negative: 'border-rose-200 bg-gradient-to-br from-rose-50/40 to-white',
  };
  return (
    <Section
      icon={TrendingUp}
      title="The buy-side take — six one-line stories"
      subtitle="Headlines an analyst would put on a one-pager, supported by the data above. Not recommendations — observations."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ANALYST_TAKES.map((t) => (
          <div
            key={t.company}
            className={`rounded-xl border p-4 ${toneCard[t.tone] ?? toneCard.positive}`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xl leading-none mt-0.5">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-ink-900 uppercase tracking-wider">{t.company}</div>
                <ToneTag tone={t.tone}>
                  {t.tone === 'positive' ? 'Constructive' : t.tone === 'caution' ? 'Watch list' : 'Avoid'}
                </ToneTag>
              </div>
            </div>
            <div className="text-sm font-semibold text-ink-900 leading-snug mb-2">{t.headline}</div>
            <ul className="space-y-1.5">
              {t.bullets.map((b, i) => (
                <li key={i} className="text-[11.5px] text-ink-600 leading-snug flex gap-2">
                  <span className="text-ink-400 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Public component ────────────────────────────────────────────────────────

export default function IPMInsights() {
  return (
    <>
      {/* In-page band divider — marks the start of the IPM market-context
          section within the single unified dashboard (no longer a tab). */}
      <div className="bg-gradient-to-r from-pharma-600 to-teal-accent rounded-2xl shadow-card p-5 mt-1">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ChartNoAxesColumn className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">India Pharma Market — buy-side scorecard</h2>
            <p className="text-[12px] text-white/90 mt-1 leading-relaxed">
              The market backdrop the launch activity above plays out against. Compares 21 pharma companies across
              17 operating parameters — who's compounding, who's leaking share, where the price-control risk sits,
              and what the GLP-1 wave means for the next 2-3 years.
            </p>
          </div>
          <div className="text-[10px] text-white/85 text-right shrink-0">
            <div className="font-semibold text-white">IPM data · {IPM_REPORT_META.asOf}</div>
            <div>AIOCD AWACS · IIFL research</div>
            <div className="italic">Periodic snapshot · monthly cycle</div>
          </div>
        </div>
      </div>

      <MarketPulse />
      <Scoreboard />
      <GrowthQuality />
      <ChronicShift />
      <NlemRisk />
      <GlpWave />
      <AnalystTakes />

      {/* Provenance footer */}
      <div className="bg-ink-50 rounded-2xl border border-ink-100 p-4 text-[11px] text-ink-600 leading-relaxed">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-ink-400 mt-0.5 shrink-0" />
          <div>
            <b className="text-ink-900">Provenance:</b> {IPM_REPORT_META.primarySource}, {IPM_REPORT_META.reportDate}
            (Rahul Jeewani et al.). Earlier reference report: IIFL FY23-FY25 analysis, 23-Apr-2025.{' '}
            {IPM_REPORT_META.basis} This is a <b>periodic snapshot</b> — the AIOCD AWACS audit publishes monthly,
            so this section refreshes on that cycle (not daily, by design — unlike the live launch tracker above).
            FY26-28 figures in the analyst-take cards are IIFL forward estimates, clearly labelled. All data is
            presented as observations for the reader to interpret — none of it constitutes a recommendation.
          </div>
        </div>
      </div>
    </>
  );
}
