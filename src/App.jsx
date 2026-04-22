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

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('__ALL__');
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredRows = useMemo(() => {
    return LAUNCH_TRACKER_ROWS.filter((r) => {
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
  }, [searchQuery, selectedCompany, filters]);

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const lastUpdated = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

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
      />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <FilterBar
          rows={LAUNCH_TRACKER_ROWS}
          filters={filters}
          setFilters={setFilters}
          onReset={resetFilters}
        />

        <section aria-label="KPI summary">
          <KPICards rows={filteredRows} />
        </section>

        <section aria-label="Summary charts">
          <Charts rows={filteredRows} />
        </section>

        <section aria-label="Core table">
          <MainTable rows={filteredRows} />
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
