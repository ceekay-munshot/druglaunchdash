import React, { useState, useRef, useEffect } from 'react';
import { Pill, Search, Building2, Sparkles, RefreshCw, Archive, Plus, X } from 'lucide-react';

export default function Header({
  searchQuery,
  onSearchChange,
  selectedCompany,
  onCompanyChange,
  companies,
  archivedCompanies = [],
  onUnarchive,
  onArchive,
  totalRows,
  filteredRows,
  lastUpdated,
  onRefresh,
  refreshing = false,
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archiveRef = useRef(null);

  // Refresh button spins while the parent's fetch is in-flight; guarantees a
  // minimum 400ms animation so quick cache-hits still give visual feedback.
  const [minSpin, setMinSpin] = useState(false);
  const spinning = refreshing || minSpin;
  const handleRefresh = () => {
    if (spinning) return;
    setMinSpin(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setMinSpin(false), 400);
  };

  // Close the archive popover on outside click / Escape.
  useEffect(() => {
    if (!archiveOpen) return;
    const onDocClick = (e) => {
      if (archiveRef.current && !archiveRef.current.contains(e.target)) setArchiveOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setArchiveOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [archiveOpen]);

  return (
    <header className="grad-header border-b border-pharma-100">
      <div className="max-w-[1840px] mx-auto px-4 py-3">
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

            {/* Archive popover: lists archived companies with an "Add" button per row. */}
            <div className="relative" ref={archiveRef}>
              <button
                onClick={() => setArchiveOpen((v) => !v)}
                title="Archived companies — click a company's Add button to move it back into the tracked list"
                className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-lg border transition w-full sm:w-auto ${
                  archiveOpen
                    ? 'bg-pharma-50 text-pharma-700 border-pharma-300'
                    : 'bg-white text-ink-700 border-ink-100 hover:border-pharma-300 hover:text-pharma-700'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Archive</span>
                <span className="text-[11px] font-semibold text-ink-500 bg-ink-100 rounded-full px-1.5">
                  {archivedCompanies.length}
                </span>
              </button>
              {archiveOpen && (
                <div className="absolute right-0 mt-2 w-80 z-30 bg-white rounded-xl border border-ink-100 shadow-cardHover overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 bg-pharma-50/40">
                    <div>
                      <p className="text-xs font-semibold text-ink-900">Archived companies</p>
                      <p className="text-[11px] text-ink-500">Hidden from the tracker. Add back to restore.</p>
                    </div>
                    <button
                      onClick={() => setArchiveOpen(false)}
                      className="w-6 h-6 rounded-md hover:bg-ink-100 flex items-center justify-center text-ink-500"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-auto scrollbar-thin">
                    {archivedCompanies.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-ink-500 text-center">
                        No archived companies. All tracked.
                      </p>
                    ) : (
                      <ul className="py-1">
                        {archivedCompanies.map((c) => (
                          <li
                            key={c}
                            className="group flex items-center justify-between gap-2 px-4 py-2 hover:bg-pharma-50/50"
                          >
                            <span className="text-sm text-ink-900 truncate">{c}</span>
                            <button
                              onClick={() => onUnarchive && onUnarchive(c)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-pharma-600 hover:bg-pharma-700 rounded-md px-2.5 py-1 transition shrink-0"
                              title={`Add ${c} back to the tracked list`}
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {companies.length > 0 && (
                    <div className="border-t border-ink-100 bg-ink-100/30">
                      <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                        Currently tracked ({companies.length})
                      </p>
                      <ul className="pb-2 max-h-48 overflow-auto scrollbar-thin">
                        {companies.map((c) => (
                          <li
                            key={c}
                            className="group flex items-center justify-between gap-2 px-4 py-1.5 hover:bg-ink-100/40"
                          >
                            <span className="text-xs text-ink-700 truncate">{c}</span>
                            <button
                              onClick={() => onArchive && onArchive(c)}
                              className="inline-flex items-center gap-1 text-[11px] text-ink-500 hover:text-pharma-700 transition opacity-0 group-hover:opacity-100"
                              title={`Archive ${c}`}
                            >
                              <Archive className="w-3 h-3" />
                              Archive
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={spinning}
              title="Reloads the view. Data is curated from press releases / BSE filings. Auto-refresh requires API integration (Firecrawl / scheduled job)."
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-br from-pharma-600 to-teal-accent text-white shadow-card hover:shadow-cardHover transition disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
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
            Source: curated baseline + daily Firecrawl scrape · Refresh pulls latest launches.json
          </span>
        </div>
      </div>
    </header>
  );
}
