import React, { useMemo, useState } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KPICards from './components/KPICards';
import Charts from './components/Charts';
import MainTable from './components/MainTable';
import InsightWidgets from './components/InsightWidgets';
import { LAUNCH_TRACKER_ROWS, UNIQUE_BUYERS, COLUMN_KEYS } from './data/mockData';

const INITIAL_FILTERS = {
  therapy: '__ALL__',
  launchType: '__ALL__',
  buyer: '__ALL__',
  seller: '__ALL__',
  chronicAcute: '__ALL__',
  dealType: '__ALL__',
};

// Returns the earliest date (start of quarter) that should be included for a
// preset of "N calendar quarters inclusive of the current quarter". 3Q is the
// default: ~Q(curr) + 2 prior quarters.
function cutoffForQuarters(n) {
  if (n === null || n === undefined) return null;
  const now = new Date();
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), qStartMonth - 3 * (n - 1), 1);
}

const TIMELINE_PRESETS = {
  '3Q': { label: 'Last 3Q', quarters: 3 },
  '6Q': { label: 'Last 6Q', quarters: 6 },
  '2Y': { label: 'Last 2Y', quarters: 8 },
  '5Y': { label: 'Last 5Y', quarters: 20 },
  ALL: { label: 'All time', quarters: null },
};

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('__ALL__');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [timeline, setTimeline] = useState('3Q');

  const timelineCutoff = useMemo(
    () => cutoffForQuarters(TIMELINE_PRESETS[timeline]?.quarters),
    [timeline]
  );

  const filteredRows = useMemo(() => {
    return LAUNCH_TRACKER_ROWS.filter((r) => {
      if (timelineCutoff) {
        const d = new Date(r[COLUMN_KEYS.DATE]);
        if (isNaN(d.getTime()) || d < timelineCutoff) return false;
      }
      if (selectedCompany !== '__ALL__' && r[COLUMN_KEYS.BUYER] !== selectedCompany) return false;
      if (filters.therapy !== '__ALL__' && r[COLUMN_KEYS.THERAPY] !== filters.therapy) return false;
      if (filters.launchType !== '__ALL__' && r[COLUMN_KEYS.LAUNCH_TYPE] !== filters.launchType) return false;
      if (filters.buyer !== '__ALL__' && r[COLUMN_KEYS.BUYER] !== filters.buyer) return false;
      if (filters.seller !== '__ALL__' && r[COLUMN_KEYS.SELLER] !== filters.seller) return false;
      if (filters.chronicAcute !== '__ALL__' && r[COLUMN_KEYS.CHRONIC_ACUTE] !== filters.chronicAcute) return false;
      if (filters.dealType !== '__ALL__' && r[COLUMN_KEYS.DEAL_TYPE] !== filters.dealType) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          r[COLUMN_KEYS.BRAND],
          r[COLUMN_KEYS.MOLECULE],
          r[COLUMN_KEYS.INDICATION],
          r[COLUMN_KEYS.THERAPY],
          r[COLUMN_KEYS.BUYER],
          r[COLUMN_KEYS.SELLER],
          r[COLUMN_KEYS.EXISTING_BRAND],
          r[COLUMN_KEYS.DEAL_TYPE],
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' | ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCompany, filters, timelineCutoff]);

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setTimeline('3Q');
  };

  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());
  const lastUpdated = lastRefreshAt.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRefresh = () => setLastRefreshAt(new Date());

  return (
    <div className="min-h-screen">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCompany={selectedCompany}
        onCompanyChange={setSelectedCompany}
        companies={UNIQUE_BUYERS}
        totalRows={LAUNCH_TRACKER_ROWS.length}
        filteredRows={filteredRows.length}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <FilterBar
          rows={LAUNCH_TRACKER_ROWS}
          filters={filters}
          setFilters={setFilters}
          onReset={resetFilters}
          timeline={timeline}
          setTimeline={setTimeline}
          timelinePresets={TIMELINE_PRESETS}
          timelineCutoff={timelineCutoff}
        />

        <section aria-label="KPI summary">
          <KPICards rows={filteredRows} />
        </section>

        <section aria-label="Summary charts">
          <Charts rows={filteredRows} />
        </section>

        <section aria-label="Core table">
          <MainTable rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        <section aria-label="Investor insights">
          <InsightWidgets rows={filteredRows} />
        </section>

        <footer className="pt-4 pb-8 text-center text-[11px] text-ink-500">
          Frontend-only demo · All KPIs, charts, and insights are derived from the same filtered
          core table. Mock data for illustration.
        </footer>
      </main>
    </div>
  );
}
