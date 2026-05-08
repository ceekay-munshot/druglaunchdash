#!/usr/bin/env node
/**
 * scripts/scrape-patent-cliffs.mjs
 *
 * Bi-daily Firecrawl pass that overlays "live" India patent-cliff signal on
 * top of the curated baseline in src/data/patentCliffs.js. The baseline owns
 * expiry years, TAMs, and confidence (only humans change those). This script
 * only ADDS:
 *   • events[]   — recent India-relevant litigation / generic-launch /
 *                  compulsory-licence / price-cut headlines per molecule
 *   • lastCheckedAt — when this molecule was last refreshed
 *   • pendingDiscovery[] — molecule names appearing in news but NOT in our
 *                  curated 33; surfaced for human review (gated, never
 *                  auto-promoted into the tracked list).
 *
 * Output: public/patentCliffs.json — fetched and merged at runtime by the
 * dashboard exactly like public/launches.json.
 *
 * Runs in GitHub Actions (.github/workflows/scrape-patent-cliffs.yml), or
 * locally with FIRECRAWL_API_KEY=fc_... node scripts/scrape-patent-cliffs.mjs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'patentCliffs.json');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!FIRECRAWL_API_KEY) {
  console.error('✖ FIRECRAWL_API_KEY env var not set');
  process.exit(1);
}

const cliffsModuleUrl = pathToFileURL(
  path.join(ROOT, 'src', 'data', 'patentCliffs.js')
).href;
const { PATENT_CLIFFS } = await import(cliffsModuleUrl);

// Per-run cap on Firecrawl extractions. The schedule runs every 2 days, so
// 33 molecules / run is sustainable. Exposed via env in case we ever need
// to dial it down for budget.
const MAX_MOLECULES_PER_RUN = Number(process.env.PATENT_CLIFFS_MAX || 40);

// Each event comes from a single India-news-search result. Schema is the
// shape Firecrawl is asked to populate per molecule.
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: {
            type: ['string', 'null'],
            description: 'ISO YYYY-MM-DD if a published date is visible on the article snippet. YYYY-MM if only month/year known. Null if no verifiable date.',
          },
          headline: { type: 'string', description: 'Article title verbatim.' },
          kind: {
            type: 'string',
            enum: [
              'litigation',
              'compulsoryLicence',
              'genericLaunch',
              'expiryUpdate',
              'priceCut',
              'biosimilarLaunch',
              'other',
            ],
            description: 'Closest single category. litigation=court orders / injunctions / revocations / settlements. compulsoryLicence=CL applied/granted/denied. genericLaunch=Indian generic launched. expiryUpdate=patent term-extension / shortening news. priceCut=NPPA / NLEM action. biosimilarLaunch=Indian biosimilar launched. other=use sparingly.',
          },
          summary: {
            type: 'string',
            description: 'ONE sentence, India-specific, factual. NO speculation.',
          },
          sourceUrl: { type: 'string', description: 'Direct article URL (not the search-results page).' },
          publication: { type: 'string', description: 'Outlet name (e.g., "ET Health World", "Pharmabiz", "LiveMint").' },
        },
        required: ['headline', 'kind', 'sourceUrl'],
      },
    },
    relatedMolecules: {
      type: 'array',
      items: { type: 'string' },
      description: 'OTHER molecule INNs mentioned in the search results that look patent-relevant in India (e.g., a court ruling on a different drug). Cap to 5. EXCLUDE the queried molecule.',
    },
  },
};

const buildPrompt = (molecule) => `You are reading the search-results page for "${molecule}" on an Indian pharma news outlet.

EXTRACT a list of NEWS EVENTS that bear directly on ${molecule}'s Indian patent / generic-launch / compulsory-licence / pricing situation.

INCLUDE:
  • Court orders, injunctions, patent revocations, infringement settlements
  • Compulsory-licence applications / grants / denials by IP India
  • Indian generic / biosimilar launches of ${molecule}
  • NPPA / NLEM price-cap actions on ${molecule}
  • Term-extension or expiry-shift announcements

EXCLUDE:
  • Articles older than 24 months from today
  • Articles not actually about ${molecule}
  • Generic industry-wide commentary that doesn't reference ${molecule}
  • Non-India market events (FDA approvals, EU launches, etc.) UNLESS they
    directly affect Indian availability

For each event:
  • date: YYYY-MM-DD from the article's published date if visible, else YYYY-MM,
    else null. NEVER use today's date as a fallback.
  • headline: article title verbatim.
  • kind: pick the closest single enum value. Use 'other' sparingly.
  • summary: ONE plain-English sentence focused on the India-market impact.
  • sourceUrl: the exact article URL (NOT the search page).
  • publication: outlet name as displayed.

STRICT NO-GUESS: a missing field set to "—" / null is far better than a
fabricated value. If you can't find an article-level URL, drop the event.

Also extract relatedMolecules: any OTHER molecule INNs mentioned in the
result snippets that look patent-relevant in India. EXCLUDE ${molecule}
itself. Cap to top 5. These feed our auto-discovery review queue.`;

async function loadExisting() {
  try {
    const raw = await fs.readFile(OUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Search-results URL for a molecule. ET Health World is a broad India pharma
// outlet that covers court rulings, generic launches, NPPA actions, and
// compulsory-licence news — single-source for now to keep Firecrawl spend
// predictable. If coverage gets thin we can add Pharmabiz as a fallback.
function searchUrlFor(molecule) {
  const q = encodeURIComponent(molecule);
  return `https://health.economictimes.indiatimes.com/searchresult.cms?q=${q}`;
}

async function scrapeMolecule(molecule) {
  const body = {
    url: searchUrlFor(molecule),
    formats: ['json'],
    jsonOptions: {
      schema: EXTRACTION_SCHEMA,
      prompt: buildPrompt(molecule),
    },
    onlyMainContent: true,
    waitFor: 2500,
  };

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firecrawl ${res.status} for "${molecule}": ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const data = json?.data?.json || {};
  const events = Array.isArray(data.events) ? data.events : [];
  const related = Array.isArray(data.relatedMolecules) ? data.relatedMolecules : [];
  return { events, related };
}

// Stable event identity so re-runs don't multiply duplicates. Two events are
// "the same" if their sourceUrl matches (preferred), else if their headline
// matches case-insensitively.
function eventKey(e) {
  if (e.sourceUrl) return `url:${String(e.sourceUrl).trim().toLowerCase()}`;
  return `hl:${String(e.headline || '').trim().toLowerCase()}`;
}

function mergeEvents(existing = [], fresh = []) {
  const byKey = new Map();
  for (const e of existing) byKey.set(eventKey(e), e);
  for (const e of fresh) {
    const k = eventKey(e);
    // New events wins on overlap so we pick up any corrected metadata.
    byKey.set(k, { ...byKey.get(k), ...e });
  }
  // Sort by date desc; null dates last.
  return [...byKey.values()].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

// Lightweight: drop events older than 24 months so the published JSON
// stays focused on current signal even as the underlying source's archive
// grows. Events without a date are kept (we can't tell how old they are).
function pruneStale(events) {
  const cutoff = Date.now() - 24 * 30 * 86_400_000;
  return events.filter((e) => {
    if (!e.date) return true;
    const t = new Date(e.date).getTime();
    if (isNaN(t)) return true;
    return t >= cutoff;
  });
}

const TRACKED_NORMALIZED = new Set(
  PATENT_CLIFFS.flatMap((p) =>
    String(p.molecule || '')
      .toLowerCase()
      .split(/[/+]/)
      .map((s) => s.trim())
      .filter(Boolean)
  )
);

function isAlreadyTracked(name) {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return true;
  for (const t of TRACKED_NORMALIZED) {
    if (n.includes(t) || t.includes(n)) return true;
  }
  return false;
}

async function main() {
  console.log(`▶ Patent-cliff live refresh: ${PATENT_CLIFFS.length} molecules tracked`);

  const existing = await loadExisting();
  const existingMolecules = existing.molecules || {};
  const existingPending = Array.isArray(existing.pendingDiscovery)
    ? existing.pendingDiscovery
    : [];

  const moleculeOut = {};
  const discoveryByName = new Map();
  // Seed pending-discovery state with prior runs so we accumulate evidence
  // (firstSeen / mentionCount / sampleHeadlines) over time.
  for (const d of existingPending) {
    if (d && d.name) discoveryByName.set(String(d.name).toLowerCase(), { ...d });
  }

  // Round-robin order: oldest-checked first so each run cycles through the
  // backlog rather than re-hitting the same molecules every time.
  const order = [...PATENT_CLIFFS].sort((a, b) => {
    const aT = existingMolecules[a.molecule]?.lastCheckedAt
      ? new Date(existingMolecules[a.molecule].lastCheckedAt).getTime()
      : 0;
    const bT = existingMolecules[b.molecule]?.lastCheckedAt
      ? new Date(existingMolecules[b.molecule].lastCheckedAt).getTime()
      : 0;
    return aT - bT;
  });
  const target = order.slice(0, MAX_MOLECULES_PER_RUN);
  console.log(`  scraping top ${target.length} (cap ${MAX_MOLECULES_PER_RUN}/run)`);

  let totalEvents = 0;
  let totalNewEvents = 0;

  for (const cliff of target) {
    const tag = `[${cliff.molecule}]`;
    const prior = existingMolecules[cliff.molecule] || { events: [] };
    const checkedAt = new Date().toISOString();
    try {
      const { events, related } = await scrapeMolecule(cliff.molecule);
      const merged = pruneStale(mergeEvents(prior.events || [], events));
      const newCount = merged.length - (prior.events?.length || 0);
      totalEvents += merged.length;
      totalNewEvents += Math.max(0, newCount);
      moleculeOut[cliff.molecule] = {
        lastCheckedAt: checkedAt,
        events: merged,
      };
      console.log(`  ${tag} ${events.length} extracted · ${merged.length} retained · +${Math.max(0, newCount)} new`);

      // Auto-discovery: any related molecule NOT already in our tracked list
      // accumulates a mentionCount. Surfaced for human review; never auto-
      // promoted into PATENT_CLIFFS.
      for (const name of related) {
        const clean = String(name || '').trim();
        if (!clean) continue;
        if (isAlreadyTracked(clean)) continue;
        const k = clean.toLowerCase();
        const cur = discoveryByName.get(k) || {
          name: clean,
          firstSeenAt: checkedAt,
          mentionCount: 0,
          sampleHeadlines: [],
        };
        cur.mentionCount = (cur.mentionCount || 0) + 1;
        cur.lastSeenAt = checkedAt;
        // Keep up to 3 sample headlines for human triage.
        const headline = events[0]?.headline || '';
        if (headline && cur.sampleHeadlines.length < 3 && !cur.sampleHeadlines.includes(headline)) {
          cur.sampleHeadlines.push(headline);
        }
        discoveryByName.set(k, cur);
      }
    } catch (err) {
      console.error(`  ${tag} FAILED: ${err.message}`);
      // Preserve prior events if today's call failed; just bump lastCheckedAt
      // so the round-robin moves on.
      moleculeOut[cliff.molecule] = {
        lastCheckedAt: checkedAt,
        events: prior.events || [],
        lastError: err.message.slice(0, 200),
      };
    }
    await sleep(1500);
  }

  // Untouched molecules carry their prior state forward unchanged.
  for (const cliff of PATENT_CLIFFS) {
    if (!moleculeOut[cliff.molecule] && existingMolecules[cliff.molecule]) {
      moleculeOut[cliff.molecule] = existingMolecules[cliff.molecule];
    }
  }

  const pendingDiscovery = [...discoveryByName.values()]
    .filter((d) => d.mentionCount >= 1)
    .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0));

  const payload = {
    generatedAt: new Date().toISOString(),
    moleculeCount: Object.keys(moleculeOut).length,
    molecules: moleculeOut,
    pendingDiscovery,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(
    `✔ wrote ${OUT_PATH} · ${payload.moleculeCount} molecules · ${totalEvents} events ` +
      `(${totalNewEvents} new) · ${pendingDiscovery.length} discovery candidates`
  );
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
