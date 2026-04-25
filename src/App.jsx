import React, { useMemo, useState, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KPICards from './components/KPICards';
import Charts from './components/Charts';
import MainTable from './components/MainTable';
import InsightWidgets from './components/InsightWidgets';
import {
  LAUNCH_TRACKER_ROWS,
  UNIQUE_BUYERS,
  COLUMN_KEYS,
  mergeLaunchRows,
  enrichRowsWithPrices,
} from './data/mockData';

const LAUNCHES_ENDPOINT = '/launches.json';

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

// Companies the client actively tracks — everything in UNIQUE_BUYERS NOT in
// this set starts as archived. Users can unarchive via the "Archive" popover
// in the Header (which moves a company back to the active list).
const DEFAULT_ACTIVE_COMPANIES = [
  'Mankind Pharma',
  'Eris Lifesciences',
  'Sun Pharma',
  'Cipla',
  'Alkem',
  'Corona Remedies',
  'Torrent Pharma',
];

const ARCHIVE_STORAGE_KEY = 'dlt.archivedCompanies.v1';

function loadInitialArchived() {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore storage errors, fall through */
  }
  return UNIQUE_BUYERS.filter((c) => !DEFAULT_ACTIVE_COMPANIES.includes(c));
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('__ALL__');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [timeline, setTimeline] = useState('3Q');
  const [archivedCompanies, setArchivedCompanies] = useState(loadInitialArchived);

  const activeCompanies = useMemo(
    () => UNIQUE_BUYERS.filter((c) => !archivedCompanies.includes(c)),
    [archivedCompanies]
  );

  // Persist archive list so it survives refresh.
  useEffect(() => {
    try {
      window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedCompanies));
    } catch {
      /* ignore */
    }
  }, [archivedCompanies]);

  const unarchiveCompany = (name) =>
    setArchivedCompanies((prev) => prev.filter((c) => c !== name));
  const archiveCompany = (name) => {
    setArchivedCompanies((prev) => (prev.includes(name) ? prev : [...prev, name]));
    // If user archives the currently-selected company, reset the dropdown.
    setSelectedCompany((prev) => (prev === name ? '__ALL__' : prev));
  };

  const timelineCutoff = useMemo(
    () => cutoffForQuarters(TIMELINE_PRESETS[timeline]?.quarters),
    [timeline]
  );

  // ── Live data: bundled baseline + fetched scrape, merged ────────────────
  // Baseline = LAUNCH_TRACKER_ROWS (curated, hand-verified). Fetched rows
  // come from /launches.json which the daily GitHub Actions workflow writes.
  // Merge policy: baseline wins on key collision; fetched rows are appended.
  //
  // IMPORTANT: this block MUST come before `filteredRows` — the filter
  // useMemo depends on `allRows`, and declaring `allRows` below
  // `filteredRows` causes a TDZ (ReferenceError) in the minified production
  // bundle because React evaluates the deps array at render time but the
  // const binding hasn't been initialised yet in the function-body scope.
  const [scrapedRows, setScrapedRows] = useState([]);
  const [scrapeGeneratedAt, setScrapeGeneratedAt] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());

  const fetchScraped = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${LAUNCHES_ENDPOINT}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setScrapedRows(Array.isArray(data.rows) ? data.rows : []);
        setScrapeGeneratedAt(data.generatedAt || null);
      }
    } catch {
      /* swallow; we fall back to bundled baseline silently */
    } finally {
      setLastRefreshAt(new Date());
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScraped();
  }, []);

  const allRows = useMemo(
    () => enrichRowsWithPrices(mergeLaunchRows(LAUNCH_TRACKER_ROWS, scrapedRows)),
    [scrapedRows]
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (timelineCutoff) {
        const d = new Date(r[COLUMN_KEYS.DATE]);
        if (isNaN(d.getTime()) || d < timelineCutoff) return false;
      }
      // Hide rows for archived companies when viewing "All Companies".
      if (selectedCompany === '__ALL__' && archivedCompanies.includes(r[COLUMN_KEYS.BUYER])) return false;
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
  }, [searchQuery, selectedCompany, filters, timelineCutoff, archivedCompanies, allRows]);

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setTimeline('3Q');
  };

  // "Last refresh" shows the scrape timestamp when we have one, otherwise the
  // last time the button was pressed / page loaded.
  const lastUpdatedDate = scrapeGeneratedAt && new Date(scrapeGeneratedAt).getTime() > 0
    ? new Date(scrapeGeneratedAt)
    : lastRefreshAt;
  const lastUpdated = lastUpdatedDate.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRefresh = () => {
    fetchScraped();
  };

  return (
    <div className="min-h-screen">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCompany={selectedCompany}
        onCompanyChange={setSelectedCompany}
        companies={activeCompanies}
        archivedCompanies={archivedCompanies}
        onUnarchive={unarchiveCompany}
        onArchive={archiveCompany}
        totalRows={allRows.length}
        filteredRows={filteredRows.length}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <FilterBar
          rows={allRows}
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
          <Charts rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        <section aria-label="Core table">
          <MainTable rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        <section aria-label="Investor insights">
          <InsightWidgets rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        <footer className="pt-4 pb-8 text-center text-[11px] text-ink-500">
          Curated baseline in <code className="text-ink-700">src/data/mockData.js</code> merged
          with daily scrape in <code className="text-ink-700">public/launches.json</code>.
          All KPIs, charts, and insights derive from the same filtered core table.
        </footer>
      </main>
    </div>
  );
}
