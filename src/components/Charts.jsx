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
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { PieChart as PieIcon, BarChart3, Activity, Layers } from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { countBy, sumBy, fmtINRPlain } from '../utils/format';

const PALETTE = ['#16a34a', '#0d9488', '#22c55e', '#0ea5e9', '#a3e635', '#14b8a6', '#84cc16', '#10b981', '#4ade80', '#2dd4bf'];

function ChartCard({ icon: Icon, title, subtitle, children, accent = 'green' }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            accent === 'teal' ? 'bg-teal-50' : 'bg-pharma-50'
          }`}
        >
          <Icon className={`w-4 h-4 ${accent === 'teal' ? 'text-teal-accent' : 'text-pharma-600'}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1 min-h-[220px]">{children}</div>
    </div>
  );
}

const cardTooltipStyle = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
  fontSize: 12,
};

export default function Charts({ rows }) {
  const therapy = countBy(rows, COLUMN_KEYS.THERAPY).sort((a, b) => b.value - a.value);
  const launchType = countBy(rows, COLUMN_KEYS.LAUNCH_TYPE);
  const buyerCount = countBy(rows, COLUMN_KEYS.BUYER).sort((a, b) => b.value - a.value).slice(0, 8);
  const sellerCount = countBy(rows, COLUMN_KEYS.SELLER)
    .filter((d) => d.name && d.name !== '—')
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const marketByTherapy = sumBy(rows, COLUMN_KEYS.THERAPY, COLUMN_KEYS.MARKET_SIZE)
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const chronicAcute = countBy(rows, COLUMN_KEYS.CHRONIC_ACUTE);
  const dealType = countBy(rows, COLUMN_KEYS.DEAL_TYPE).sort((a, b) => b.value - a.value);

  // Activity by year derived from Date column
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ChartCard icon={PieIcon} title="Therapy Split" subtitle="Share of brands by therapy">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={therapy}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {therapy.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={cardTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={Layers} title="Launch Type Mix" subtitle="Acquired / In-licensed / Own Launched" accent="teal">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={launchType}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {launchType.map((_, i) => (
                <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={cardTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={Activity} title="Chronic vs Acute" subtitle="Distribution across filtered rows">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chronicAcute}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {chronicAcute.map((d, i) => (
                <Cell key={i} fill={d.name === 'Chronic' ? '#16a34a' : '#f59e0b'} />
              ))}
            </Pie>
            <Tooltip contentStyle={cardTooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={BarChart3} title="Buyer-wise Brand Count" subtitle="Top acquiring/launching companies">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={buyerCount} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#334155' }} />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="value" fill="#16a34a" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={BarChart3} title="Seller-wise Transactions" subtitle="Top originators / licensors" accent="teal">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={sellerCount} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="value" fill="#0d9488" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={BarChart3} title="India Market Size by Therapy" subtitle="Sum of ₹Cr per therapy area">
        {marketByTherapy.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marketByTherapy} margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontSize: 10, fill: '#334155' }}
                angle={-20}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={cardTooltipStyle}
                formatter={(v) => [fmtINRPlain(v), 'Market Size']}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-xs text-ink-500 text-center px-4">
            Market-size data not in public sources for this selection — requires
            IQVIA / PharmaTrac / AIOCD AWACS subscription.
          </div>
        )}
      </ChartCard>

      <ChartCard icon={BarChart3} title="Deal Type Breakdown" subtitle="Distribution of transaction structures">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dealType} layout="vertical" margin={{ left: 12, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: '#334155' }} />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Bar dataKey="value" fill="#16a34a" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={Activity} title="Launch Activity Over Time" subtitle="Brand launches by year" accent="teal">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={activityByYear} margin={{ left: 0, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip contentStyle={cardTooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
