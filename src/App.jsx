import React, { useMemo, useState, useEffect } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import KPICards from './components/KPICards';
import Charts from './components/Charts';
import MainTable from './components/MainTable';
import InsightWidgets from './components/InsightWidgets';
import InsightRibbon from './components/InsightRibbon';
import PeerBenchmark from './components/PeerBenchmark';
import PatentCliffs from './components/PatentCliffs';
import BriefingHero from './components/BriefingHero';
import ActionRequired from './components/ActionRequired';
import WhitespaceMatrix from './components/WhitespaceMatrix';
import TimeMachineSlider from './components/TimeMachineSlider';
import {
  LAUNCH_TRACKER_ROWS,
  UNIQUE_BUYERS,
  COLUMN_KEYS,
  mergeLaunchRows,
  enrichRowsWithPrices,
  enrichRowsWithTAM,
  enrichRowsWithPreExistingBrand,
  enrichRowsWithDealValue,
  enrichRowsWithGeoRights,
  enrichRowsWithRegStatus,
  isAcquisitionParent,
} from './data/mockData';
import { exportDashboardPdf } from './utils/exportDashboardPdf';
import IPMInsights from './components/IPMInsights';
import TherapyComparison from './components/TherapyComparison';

const LAUNCHES_ENDPOINT = '/launches.json';
const PATENT_CLIFFS_ENDPOINT = '/patentCliffs.json';

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
  '2Q': { label: 'Last 2 Quarters', quarters: 2 },
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
  'Natco Pharma',
  "Dr. Reddy's",
  'Glenmark',
  'Lupin',
  'Zydus Lifesciences',
  'Abbott India',
  'Aurobindo',
  'Intas',
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
  const [timeline, setTimeline] = useState('2Q');
  const [archivedCompanies, setArchivedCompanies] = useState(loadInitialArchived);
  // Time-machine viewing date (epoch ms). null = live (today). When set
  // to a past timestamp, every downstream view filters out rows whose
  // Date > viewingDate, recomputing as if the dashboard were rendered
  // on that day.
  const [viewingDate, setViewingDate] = useState(null);
  const isLiveView = viewingDate == null;

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

  // Auto-reset the time-machine cap when the user leaves the All-time
  // preset. The slider only renders on `timeline === 'ALL'`; if they
  // switch to a narrower preset while in past mode, the slider would
  // disappear but the cap would silently stay in effect — which is the
  // exact "why is half my data missing?" footgun we want to avoid.
  useEffect(() => {
    if (timeline !== 'ALL' && viewingDate != null) {
      setViewingDate(null);
    }
  }, [timeline, viewingDate]);

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
  // Live patent-cliff overlay (public/patentCliffs.json) — events array per
  // molecule + auto-discovery review queue. Refreshed on the same Refresh
  // button so a manual pull picks up both layers.
  const [livePatentCliffs, setLivePatentCliffs] = useState(null);

  const fetchScraped = async () => {
    setIsRefreshing(true);
    try {
      const [launchRes, cliffRes] = await Promise.all([
        fetch(`${LAUNCHES_ENDPOINT}?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`${PATENT_CLIFFS_ENDPOINT}?t=${Date.now()}`, { cache: 'no-store' }),
      ]);
      if (launchRes.ok) {
        const data = await launchRes.json();
        setScrapedRows(Array.isArray(data.rows) ? data.rows : []);
        setScrapeGeneratedAt(data.generatedAt || null);
      }
      if (cliffRes.ok) {
        const data = await cliffRes.json();
        setLivePatentCliffs(data && typeof data === 'object' ? data : null);
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
    () =>
      enrichRowsWithRegStatus(
        enrichRowsWithGeoRights(
          enrichRowsWithDealValue(
            enrichRowsWithPreExistingBrand(
              enrichRowsWithTAM(
                enrichRowsWithPrices(
                  mergeLaunchRows(LAUNCH_TRACKER_ROWS, scrapedRows)
                )
              )
            )
          )
        )
      ),
    [scrapedRows]
  );

  // Rows visible under the time-machine cap. We apply the viewingDate
  // filter BEFORE the user-facing filteredRows pipeline so every
  // downstream consumer (KPIs, charts, table, whitespace matrix, patent
  // cliffs' "your 7 positioning" pill) sees the same as-of-date snapshot.
  const timeMachineRows = useMemo(() => {
    if (viewingDate == null) return allRows;
    return allRows.filter((r) => {
      const d = r[COLUMN_KEYS.DATE];
      if (!d) return true; // un-dated rows always survive
      const t = new Date(d).getTime();
      if (isNaN(t)) return true;
      return t <= viewingDate;
    });
  }, [allRows, viewingDate]);

  const filteredRows = useMemo(() => {
    return timeMachineRows.filter((r) => {
      if (timelineCutoff) {
        const d = new Date(r[COLUMN_KEYS.DATE]);
        if (isNaN(d.getTime()) || d < timelineCutoff) return false;
      }
      // Hide rows for archived companies when viewing "All Companies".
      if (selectedCompany === '__ALL__' && archivedCompanies.includes(r[COLUMN_KEYS.BUYER])) return false;
      if (selectedCompany !== '__ALL__' && r[COLUMN_KEYS.BUYER] !== selectedCompany) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = [
          r[COLUMN_KEYS.BRAND],
          r[COLUMN_KEYS.MOLECULE],
          r[COLUMN_KEYS.INDICATION],
          r[COLUMN_KEYS.THERAPY],
          r[COLUMN_KEYS.BUYER],
          r[COLUMN_KEYS.SELLER],
          r[COLUMN_KEYS.PRE_EXISTING_BRAND],
          r[COLUMN_KEYS.COMPETITOR_BRANDS],
          r[COLUMN_KEYS.DEAL_TYPE],
          r[COLUMN_KEYS.GEO_RIGHTS],
          r[COLUMN_KEYS.REG_STATUS],
        ]
          .map((v) => String(v ?? '').toLowerCase())
          .join(' | ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCompany, timelineCutoff, archivedCompanies, timeMachineRows]);

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

  const [exportingPdf, setExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportDashboardPdf({
        rows: filteredRows,
        allRows,
        company: selectedCompany === '__ALL__' ? 'All Companies' : selectedCompany,
        timelineLabel: TIMELINE_PRESETS[timeline]?.label || timeline,
        generatedAt: new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Boardroom-grade PowerPoint export. Lazy-imports pptxgenjs (~600KB
  // minified) so it stays out of the initial bundle and only loads when
  // the user clicks the button.
  const [exportingPptx, setExportingPptx] = useState(false);
  const handleExportPptx = async () => {
    if (exportingPptx) return;
    setExportingPptx(true);
    try {
      const { exportPptx } = await import('./utils/exportPptx');
      await exportPptx({
        rows: filteredRows,
        company: selectedCompany === '__ALL__' ? 'All Companies' : selectedCompany,
        timelineLabel: TIMELINE_PRESETS[timeline]?.label || timeline,
        generatedAt: new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (err) {
      console.error('PPTX export failed', err);
      alert('PowerPoint export failed. Please try again.');
    } finally {
      setExportingPptx(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pharma-50/40 via-white to-teal-50/30 bg-fixed">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCompany={selectedCompany}
        onCompanyChange={setSelectedCompany}
        companies={activeCompanies}
        archivedCompanies={archivedCompanies}
        onUnarchive={unarchiveCompany}
        onArchive={archiveCompany}
        totalRows={allRows.filter((r) => !isAcquisitionParent(r)).length}
        filteredRows={filteredRows.filter((r) => !isAcquisitionParent(r)).length}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        onExportPdf={handleExportPdf}
        exportingPdf={exportingPdf}
        onExportPptx={handleExportPptx}
        exportingPptx={exportingPptx}
      />

      <main className="max-w-[1840px] mx-auto px-4 py-4 space-y-4">
        <FilterBar
          timeline={timeline}
          setTimeline={setTimeline}
          timelinePresets={TIMELINE_PRESETS}
          timelineCutoff={timelineCutoff}
        />

        {/* Time-machine date scrubber. Only relevant on the All-time
            timeline preset — at narrower windows (Last 2 Quarters etc.)
            the timeline preset already caps the visible row range, so
            the time machine would just compete with it. When pulled
            back, every section below renders against the as-of-date
            row set, and the real-time-only sections (briefing, action
            panel) hide. */}
        {timeline === 'ALL' && (
          <TimeMachineSlider
            allRows={allRows}
            viewingDate={viewingDate}
            onChange={setViewingDate}
          />
        )}

        {/* "Since you last looked" briefing — only meaningful when the
            user is viewing live data. In time-machine mode the diff
            against last-visit is incoherent, so we hide the card. */}
        {isLiveView && <BriefingHero allRows={allRows} />}

        <InsightRibbon rows={filteredRows} />

        {/* Action Required panel — same logic: real-time alerts about
            imminent patent cliffs and peer activity don't make sense
            when looking at a past snapshot, so hide in time-machine mode. */}
        {isLiveView && (
          <ActionRequired allRows={timeMachineRows} companies={activeCompanies} />
        )}

        <section
          aria-label="KPI summary"
          data-pdf-section
          data-pdf-title="Executive Summary"
          data-pdf-subtitle="Headline KPIs across launches in scope"
        >
          <KPICards rows={filteredRows} />
        </section>

        {/* Peer Benchmark only renders on the All-Companies + All-time view.
            Any narrower selection produces tiny per-company samples that
            make percentages misleading (e.g. "100% chronic" on N=1). */}
        {selectedCompany === '__ALL__' && timeline === 'ALL' && (
          <section
            aria-label="Peer benchmark"
            data-pdf-section
            data-pdf-title="Peer Benchmark"
            data-pdf-subtitle="Cross-company portfolio mix and launch tempo"
          >
            <PeerBenchmark rows={filteredRows} companies={activeCompanies} />
          </section>
        )}

        {/* Charts section is hidden when the user filters narrowly to a
            single company AND the default Last-2-Quarters timeline — at
            that scope the dataset is usually too thin (often 1–2 rows) for
            charts to be informative. The KPIs, table, and insight widgets
            still render. Switching to "All time" or "All Companies"
            restores the charts. */}
        {!(selectedCompany !== '__ALL__' && timeline === '2Q') && (
          <section
            aria-label="Summary charts"
            data-pdf-section
            data-pdf-title="Portfolio Analytics"
            data-pdf-subtitle="Therapy mix, launch type and quarterly cadence"
          >
            <Charts rows={filteredRows} selectedCompany={selectedCompany} timeline={timeline} />
          </section>
        )}

        {/* Company-vs-IPM therapy comparison — sits right beside the therapy
            split so launch activity can be read against where the India
            Pharma Market is actually growing. */}
        <section
          aria-label="Therapy mix vs IPM"
          data-pdf-section
          data-pdf-title="Therapy Mix vs IPM"
          data-pdf-subtitle="Where this company launches vs where the India Pharma Market is growing"
        >
          <TherapyComparison rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        <section
          aria-label="Patent cliff calendar"
          data-pdf-section
          data-pdf-title="Patent Cliff Calendar"
          data-pdf-subtitle="Upcoming originator expiries and India opportunity windows"
        >
          <PatentCliffs
            allRows={timeMachineRows}
            companies={activeCompanies}
            livePatentCliffs={livePatentCliffs}
          />
        </section>

        {/* Whitespace matrix — molecule × tracked-company grid showing
            launched (✓) vs whitespace (—) for every patent-cliff
            molecule. Sorted to surface the cells with the most strategic
            whitespace at the top. */}
        <section
          aria-label="Whitespace matrix"
          data-pdf-section
          data-pdf-title="Whitespace Matrix"
          data-pdf-subtitle="Patent-cliff molecules × tracked companies"
        >
          <WhitespaceMatrix allRows={timeMachineRows} companies={activeCompanies} />
        </section>

        <section
          aria-label="Core table"
          data-pdf-section
          data-pdf-table
          data-pdf-title="Drug Launch Tracker"
          data-pdf-subtitle="Single source of truth — all launches in scope"
        >
          <MainTable
            rows={filteredRows}
            allRows={timeMachineRows}
            selectedCompany={selectedCompany}
          />
        </section>

        <section
          aria-label="Investor insights"
          data-pdf-section
          data-pdf-title="Investor Insights"
          data-pdf-subtitle="Concentration, deal flow and pricing signals"
        >
          <InsightWidgets rows={filteredRows} selectedCompany={selectedCompany} />
        </section>

        {/* India Pharma Market context band — periodic IIFL/AWACS data. */}
        <IPMInsights />

      </main>

      {/* Full-screen overlay shown during PDF export. Hidden from the
          captured snapshot via data-pdf-no-capture (the export utility's
          html2canvas onclone handler removes any element with this
          attribute from the cloned tree). */}
      {exportingPdf && (
        <div
          data-pdf-no-capture
          className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="bg-white rounded-2xl border border-pharma-200 shadow-cardHover px-7 py-6 flex items-center gap-4 max-w-md mx-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pharma-500 to-teal-accent flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6 text-white animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">Generating PDF briefing…</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Capturing each section at full resolution. Your download will start automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
