import React from 'react';
import { Filter, FlaskConical, Activity, TrendingUp, Briefcase, RotateCcw } from 'lucide-react';
import { COLUMN_KEYS } from '../data/mockData';
import { uniqueValues } from '../utils/format';

const SelectChip = ({ icon: Icon, label, value, onChange, options }) => (
  <div className="relative">
    <label className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3 text-pharma-600" />
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm bg-white border border-ink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-300 focus:border-pharma-400 shadow-sm appearance-none cursor-pointer pr-8"
    >
      <option value="__ALL__">All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
    <svg
      className="w-3.5 h-3.5 text-ink-500 absolute right-2.5 bottom-2.5 pointer-events-none"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

export default function FilterBar({ rows, filters, setFilters, onReset }) {
  const therapies = uniqueValues(rows, COLUMN_KEYS.THERAPY);
  const launchTypes = uniqueValues(rows, COLUMN_KEYS.LAUNCH_TYPE);
  const buyers = uniqueValues(rows, COLUMN_KEYS.BUYER);
  const sellers = uniqueValues(rows, COLUMN_KEYS.SELLER);
  const chronicity = uniqueValues(rows, COLUMN_KEYS.CHRONIC_ACUTE);
  const dealTypes = uniqueValues(rows, COLUMN_KEYS.DEAL_TYPE);

  const set = (k) => (v) => setFilters((prev) => ({ ...prev, [k]: v }));
  const anyActive = Object.values(filters).some((v) => v && v !== '__ALL__');

  return (
    <div className="bg-white border border-ink-100 rounded-2xl shadow-card px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-pharma-50 flex items-center justify-center">
            <Filter className="w-4 h-4 text-pharma-600" />
          </div>
          <h3 className="text-sm font-semibold text-ink-900">Filters</h3>
          <span className="text-xs text-ink-500">Applied to table & all derived visuals</span>
        </div>
        {anyActive && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-pharma-700 hover:text-pharma-800 bg-pharma-50 hover:bg-pharma-100 px-2.5 py-1.5 rounded-md transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SelectChip icon={FlaskConical} label="Therapy" value={filters.therapy} onChange={set('therapy')} options={therapies} />
        <SelectChip icon={TrendingUp} label="Launch Type" value={filters.launchType} onChange={set('launchType')} options={launchTypes} />
        <SelectChip icon={Briefcase} label="Buyer" value={filters.buyer} onChange={set('buyer')} options={buyers} />
        <SelectChip icon={Briefcase} label="Seller" value={filters.seller} onChange={set('seller')} options={sellers} />
        <SelectChip icon={Activity} label="Chronic / Acute" value={filters.chronicAcute} onChange={set('chronicAcute')} options={chronicity} />
        <SelectChip icon={Briefcase} label="Deal Type" value={filters.dealType} onChange={set('dealType')} options={dealTypes} />
      </div>
    </div>
  );
}
