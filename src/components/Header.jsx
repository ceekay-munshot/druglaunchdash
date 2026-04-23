import React from 'react';
import { Pill, Search, Building2, Sparkles } from 'lucide-react';

export default function Header({
  searchQuery,
  onSearchChange,
  selectedCompany,
  onCompanyChange,
  companies,
  totalRows,
  filteredRows,
  lastUpdated,
}) {
  return (
    <header className="grad-header border-b border-pharma-100">
      <div className="max-w-[1600px] mx-auto px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-card">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-ink-900 tracking-tight">
                Drug Launch Tracker
                <span className="text-blue-600"> – India Pharma</span>
              </h1>
              <p className="text-xs md:text-sm text-ink-500 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-pharma-500" />
                Investor-grade launch, in-licensing & acquisition intelligence
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search brand, molecule, indication…"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-ink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-300 focus:border-pharma-400 shadow-sm placeholder:text-ink-500"
              />
            </div>

            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Building2 className="w-4 h-4 text-ink-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCompany}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-ink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pharma-300 focus:border-pharma-400 shadow-sm appearance-none cursor-pointer"
              >
                <option value="__ALL__">All Companies (Buyer)</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <svg
                className="w-4 h-4 text-ink-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="grad-chip px-2.5 py-1 rounded-full font-medium">
            {filteredRows} of {totalRows} launches
          </span>
          {selectedCompany !== '__ALL__' && (
            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 font-medium">
              Company: {selectedCompany}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white text-ink-500 border border-ink-100">
            Last refresh • {lastUpdated}
          </span>
          <span className="ml-auto text-ink-500 hidden md:inline">
            Source: internal deal tracker • Mock dataset
          </span>
        </div>
      </div>
    </header>
  );
}
