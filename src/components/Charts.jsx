import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LabelList,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Layers,
  Heart,
  Handshake,
  IndianRupee,
} from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { countBy, sumBy, fmtINRPlain } from '../utils/format';

// Unified green → teal brand palette, ordered from strongest to lightest. Used
// for ranked data (therapies, buyers, sellers). Bars with more items simply
// wrap the palette.
const PALETTE = [
  '#16a34a',
  '#0d9488',
  '#22c55e',
  '#14b8a6',
  '#4ade80',
  '#2dd4bf',
  '#10b981',
  '#84cc16',
  '#5eead4',
  '#a3e635',
  '#34d399',
  '#6ee7b7',
];

// Separate palette for binary categories so Chronic vs Acute reads clearly
const CHRONIC_ACUTE_COLORS = { Chronic: '#16a34a', Acute: '#f59e0b' };

// Tricolour palette for Launch Type donut (Acquired / In-licensed / Own Launched)
const LAUNCH_TYPE_COLORS = {
  Acquired: '#0d9488',
  'In-licensed': '#22c55e',
  'Own Launched': '#16a34a',
};

function ChartCard({ icon: Icon, title, subtitle, children, accent = 'green' }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card hover:shadow-cardHover transition-shadow p-4 flex flex-col">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            accent === 'teal' ? 'bg-teal-50' : accent === 'amber' ? 'bg-amber-50' : 'bg-pharma-50'
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              accent === 'teal'
                ? 'text-teal-accent'
                : accent === 'amber'
                  ? 'text-amber-600'
                  : 'text-pharma-600'
            }`}
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1 min-h-[240px]">{children}</div>
    </div>
  );
}

// Clean custom tooltip with consistent styling and optional value formatter
function CustomTooltip({ active, payload, label, formatter, labelPrefix }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const raw = item.value;
  const formatted = formatter ? formatter(raw) : raw;
  return (
    <div className="bg-white border border-ink-100 rounded-lg shadow-cardHover px-3 py-2 text-xs">
      <p className="font-semibold text-ink-900 leading-tight">{label ?? item.name}</p>
      <p className="text-ink-500 mt-0.5">
        {labelPrefix ? `${labelPrefix}: ` : ''}
        <span className="font-semibold text-pharma-700 tabular-nums">{formatted}</span>
      </p>
    </div>
  );
}

const gridStyle = { stroke: '#eef2f7' };
const axisTick = { fontSize: 11, fill: '#64748b' };
const catTick = { fontSize: 11, fill: '#334155' };

// Compact horizontal bar chart — used for Therapy, Buyer, Seller, Deal-Type,
// and Market-Size-by-Therapy (all of which have long category labels). Height
// is dynamically sized to the number of bars so they always have breathing
// room (no overlapping labels even with 8-12 bars).
function HBar({ data, valueFormatter, tooltipLabel, height, categoryWidth = 140, labelFormatter }) {
  const computed = height ?? Math.max(240, data.length * 36 + 40);
  return (
    <ResponsiveContainer width="100%" height={computed}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={gridStyle.stroke} />
        <XAxis type="number" tick={axisTick} allowDecimals={false} tickFormatter={labelFormatter} />
        <YAxis
          type="category"
          dataKey="name"
          width={categoryWidth}
          tick={catTick}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          content={<CustomTooltip formatter={valueFormatter} labelPrefix={tooltipLabel} />}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={labelFormatter || ((v) => v)}
            style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Charts({ rows, selectedCompany, timeline }) {
  const singleCompanyView = selectedCompany && selectedCompany !== '__ALL__';
  // Activity-over-time only makes sense across a long horizon; hide it on the
  // default Last-2-Quarters window since the line collapses to 1–2 points.
  const showActivityChart = !singleCompanyView && timeline !== '2Q';
  const total = rows.length;

  const therapy = countBy(rows, COLUMN_KEYS.THERAPY).sort((a, b) => b.value - a.value).slice(0, 10);
  const launchType = countBy(rows, COLUMN_KEYS.LAUNCH_TYPE).sort((a, b) => b.value - a.value);
  const sellerCount = countBy(rows, COLUMN_KEYS.SELLER)
    .filter((d) => d.name && d.name !== '—')
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Compact a sorted descending list to top-N + an "Other (k)" bucket so
  // long-tail categories don't clog the chart.
  const compactTopN = (arr, n) => {
    if (arr.length <= n) return arr;
    const top = arr.slice(0, n);
    const rest = arr.slice(n);
    const otherSum = rest.reduce((s, d) => s + (Number(d.value) || 0), 0);
    if (otherSum > 0) top.push({ name: `Other (${rest.length})`, value: otherSum });
    return top;
  };

  const marketByTherapy = compactTopN(
    sumBy(rows, COLUMN_KEYS.THERAPY, COLUMN_KEYS.MARKET_SIZE)
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
    8
  );
  const chronicAcute = countBy(rows, COLUMN_KEYS.CHRONIC_ACUTE);
  const chronicCount = chronicAcute.find((d) => d.name === 'Chronic')?.value ?? 0;
  const acuteCount = chronicAcute.find((d) => d.name === 'Acute')?.value ?? 0;
  const chronicPct = total ? Math.round((chronicCount / total) * 100) : 0;
  const acutePct = total ? 100 - chronicPct : 0;
  const dealType = compactTopN(
    countBy(rows, COLUMN_KEYS.DEAL_TYPE).sort((a, b) => b.value - a.value),
    8
  );

  const yearMap = new Map();
  rows.forEach((r) => {
    const d = new Date(r[COLUMN_KEYS.DATE]);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      yearMap.set(y, (yearMap.get(y) || 0) + 1);
    }
  });
  const activityByYear = Array.from(yearMap.entries())
    .map(([name, value]) => ({ name: String(name), value }))
    .sort((a, b) => Number(a.name) - Number(b.name));

  // Centered total label for Launch-Type donut
  const launchTypeTotal = launchType.reduce((s, d) => s + d.value, 0);

  // Activity-over-time is the only conditional chart now (Buyer-wise was
  // promoted into PeerBenchmark). Without Activity, 6 charts → 3 cols for
  // even rows; with Activity, 7 charts → 4 cols (last row has one empty
  // slot, but still cleaner than 3-col with an orphan).
  const gridCols = showActivityChart
    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {/* Therapy Split — horizontal bar ranked (long labels render cleanly) */}
      <ChartCard icon={PieIcon} title="Therapy Split" subtitle="Top 10 therapies by brand count">
        {therapy.length ? (
          <HBar data={therapy} tooltipLabel="Brands" categoryWidth={150} />
        ) : (
          <EmptyChart msg="No therapy data." />
        )}
      </ChartCard>

      {/* Launch Type Mix — donut with centre total */}
      <ChartCard
        icon={Layers}
        title="Launch Type Mix"
        subtitle="Acquired · In-licensed · Own Launched"
        accent="teal"
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={launchType}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={3}
              stroke="#fff"
              strokeWidth={2}
            >
              {launchType.map((d, i) => (
                <Cell key={i} fill={LAUNCH_TYPE_COLORS[d.name] || PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              content={
                <CustomTooltip
                  labelPrefix="Brands"
                  formatter={(v) =>
                    `${v} (${launchTypeTotal ? Math.round((v / launchTypeTotal) * 100) : 0}%)`
                  }
                />
              }
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              iconType="circle"
              iconSize={8}
            />
            {/* Centre total label */}
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 22, fontWeight: 700, fill: '#0f172a' }}
            >
              {launchTypeTotal}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 10, fill: '#64748b', letterSpacing: 0.5 }}
            >
              TOTAL
            </text>
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chronic vs Acute — progress-bar style with big % + count row */}
      <ChartCard icon={Heart} title="Chronic vs Acute" subtitle="Therapy profile of portfolio" accent="amber">
        {total ? (
          <div className="flex flex-col justify-center h-full px-1 py-2 space-y-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-pharma-700 tabular-nums">{chronicPct}%</span>
              <div className="flex flex-col pb-1">
                <span className="text-xs font-semibold text-ink-700">Chronic share</span>
                <span className="text-[11px] text-ink-500">{chronicCount} of {total} launches</span>
              </div>
            </div>
            <div className="h-4 w-full bg-amber-50 rounded-full overflow-hidden flex border border-ink-100">
              <div
                className="h-full bg-gradient-to-r from-pharma-500 to-teal-accent"
                style={{ width: `${chronicPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="px-3 py-2 rounded-lg bg-pharma-50 border border-pharma-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-pharma-700">Chronic</p>
                <p className="mt-0.5 font-bold text-ink-900 tabular-nums">{chronicCount} <span className="text-ink-500 font-medium">· {chronicPct}%</span></p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Acute</p>
                <p className="mt-0.5 font-bold text-ink-900 tabular-nums">{acuteCount} <span className="text-ink-500 font-medium">· {acutePct}%</span></p>
              </div>
            </div>
          </div>
        ) : (
          <EmptyChart msg="No data in view." />
        )}
      </ChartCard>

      {/* Seller-wise Transactions — horizontal bar */}
      <ChartCard
        icon={Handshake}
        title="Seller-wise Transactions"
        subtitle="Top originators / licensors"
        accent="teal"
      >
        {sellerCount.length ? (
          <HBar data={sellerCount} tooltipLabel="Deals" categoryWidth={160} />
        ) : (
          <EmptyChart msg="No seller-side counterparties in view." />
        )}
      </ChartCard>

      {/* India TAM by Therapy — top 8 + 'Other' bucket so long-tail
          categories don't crowd the chart */}
      <ChartCard
        icon={IndianRupee}
        title="India TAM by Therapy"
        subtitle="Top 8 therapies by addressable market (₹Cr)"
      >
        {marketByTherapy.length ? (
          <HBar
            data={marketByTherapy}
            tooltipLabel="TAM"
            valueFormatter={fmtINRPlain}
            labelFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}K` : `₹${v}`)}
            categoryWidth={170}
          />
        ) : (
          <EmptyChart msg="TAM data not available for this selection — requires public estimates from broker / industry coverage." />
        )}
      </ChartCard>

      {/* Deal Type Breakdown — top 8 + 'Other' bucket */}
      <ChartCard
        icon={BarChart3}
        title="Deal Type Breakdown"
        subtitle="Top 8 transaction structures"
      >
        {dealType.length ? (
          <HBar data={dealType} tooltipLabel="Deals" categoryWidth={190} />
        ) : (
          <EmptyChart msg="No deal-type data." />
        )}
      </ChartCard>

      {/* Launch Activity Over Time — area chart with gradient fill */}
      {showActivityChart && (
        <ChartCard
          icon={Activity}
          title="Launch Activity Over Time"
          subtitle="Brand launches by year"
          accent="teal"
        >
          {activityByYear.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={activityByYear} margin={{ left: 0, right: 12, top: 10, bottom: 4 }}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip labelPrefix="Launches" />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#activityFill)"
                  dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart msg="No dated launches in view." />
          )}
        </ChartCard>
      )}
    </div>
  );
}

function EmptyChart({ msg }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-xs text-ink-500 text-center px-4">
      {msg}
    </div>
  );
}
