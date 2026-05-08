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

// Build the India-relevance search query for a molecule. We bias the LLM-
// powered search engine toward Indian patent / generic-launch / CL / NPPA
// coverage by stacking query terms; Firecrawl's /v1/search uses Google as
// the underlying engine and ranks accordingly.
function buildSearchQuery(molecule) {
  return `"${molecule}" India (patent OR generic OR launch OR "compulsory licence" OR NPPA OR Cipla OR Sun OR Mankind OR Torrent OR DCGI)`;
}

const HOST_TO_PUBLICATION = {
  'health.economictimes.indiatimes.com': 'ET Health World',
  'economictimes.indiatimes.com': 'Economic Times',
  'www.pharmabiz.com': 'Pharmabiz',
  'pharmabiz.com': 'Pharmabiz',
  'www.livemint.com': 'LiveMint',
  'livemint.com': 'LiveMint',
  'www.business-standard.com': 'Business Standard',
  'www.thehindubusinessline.com': 'BusinessLine',
  'www.expresspharma.in': 'Express Pharma',
  'www.moneycontrol.com': 'Moneycontrol',
  'www.bloomberg.com': 'Bloomberg',
  'www.reuters.com': 'Reuters',
  'www.thelancet.com': 'The Lancet',
};

function publicationFromUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (HOST_TO_PUBLICATION[host]) return HOST_TO_PUBLICATION[host];
    // Strip www. and TLD for a presentable fallback.
    return host.replace(/^www\./, '').split('.')[0]
      .replace(/^./, (c) => c.toUpperCase());
  } catch {
    return '—';
  }
}

// Heuristic classifier — keyword-matches the headline+description to one of
// our 7 event kinds. Cheap and deterministic; a stricter LLM pass can be
// re-introduced later if the noise-floor matters more than spend.
function classifyKind(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(compulsory licen[cs]e|cl grant|cl applicat|cl petit)\b/.test(t)) return 'compulsoryLicence';
  if (/\b(court|injunct|revok|infring|settlement|interim order|stay order|high court|supreme court|delhi hc)\b/.test(t)) return 'litigation';
  if (/\b(biosimilar)\b/.test(t)) return 'biosimilarLaunch';
  if (/\b(nppa|price cap|price cut|nlem|drug price control|dpco)\b/.test(t)) return 'priceCut';
  if (/\b(patent expir|patent expiry|term extension|patent term)\b/.test(t)) return 'expiryUpdate';
  if (/\b(generic launch|launches|launching|launched|introduces|rolls out)\b/.test(t)) return 'genericLaunch';
  return 'other';
}

// Try to pull a YYYY-MM-DD date from common URL patterns
// (e.g. /2026/04/15/, /news/2026-04-15-..., /article-20260415.cms).
function dateFromUrl(url) {
  if (!url) return null;
  const slashed = url.match(/\/(20\d{2})[/-](\d{1,2})(?:[/-](\d{1,2}))?(?:\/|$|-)/);
  if (slashed) {
    const [, y, mo, d] = slashed;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d || '01').padStart(2, '0')}`;
  }
  const compact = url.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) {
    const [, y, mo, d] = compact;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

// Drug INNs almost always end in a recognized stem: -ib, -mab, -nib, -pril,
// -sartan, -azole, -gliflozin, -gliptin, -prazole, -coxib, -caine, etc. We
// use this to filter discovery candidates so genes (CYP2R1), viruses (H5N1),
// and diseases (COVID-19) don't end up in the review queue.
const DRUG_NAME_STEMS = [
  'mab', 'nib', 'tinib', 'rafenib', 'parib', 'lisib', 'cinib',
  'gliflozin', 'gliptin', 'glutide', 'glitazone',
  'prazole', 'coxib', 'pril', 'sartan', 'olol', 'pine', 'statin',
  'caine', 'azole', 'mycin', 'cycline', 'cillin', 'penem', 'floxacin',
  'vudine', 'navir', 'ciclovir', 'tegravir', 'asvir', 'previr',
  'mustine', 'rubicin', 'taxel', 'platin',
  'etine', 'oxetine', 'pram', 'azepam', 'zepine',
];

function looksLikeDrugName(name) {
  const s = String(name || '').toLowerCase().trim();
  if (s.length < 5 || s.length > 40) return false;
  // Reject obvious non-drugs: anything with digits (H5N1, COVID-19),
  // anything ALL-CAPS-LIKE in original (gene symbols).
  if (/\d/.test(s)) return false;
  if (/^[a-z]+$/.test(s) === false) return false;
  return DRUG_NAME_STEMS.some((stem) => s.endsWith(stem));
}

async function scrapeMolecule(molecule) {
  const body = {
    query: buildSearchQuery(molecule),
    limit: 8,
  };

  const res = await fetch('https://api.firecrawl.dev/v1/search', {
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
  const results = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.results)
      ? json.results
      : [];

  const events = [];
  const relatedSet = new Set();

  const moleculeLower = molecule.toLowerCase();
  for (const r of results) {
    const headline = r.title || r.metadata?.title || '';
    const url = r.url || r.metadata?.sourceURL || '';
    const description = r.description || r.metadata?.description || r.snippet || '';
    if (!headline || !url) continue;

    const indiaRelevant = /\bindia|delhi|mumbai|nppa|dcgi|cdsco|pharm[aex]|ipo\b/i.test(
      `${headline} ${description}`
    );
    const moleculeMentioned =
      headline.toLowerCase().includes(moleculeLower) ||
      description.toLowerCase().includes(moleculeLower);
    if (!moleculeMentioned || !indiaRelevant) {
      // Mine the result for OTHER drug-like names (still useful for discovery)
      const tokens = `${headline} ${description}`.match(/\b[A-Z][a-z]{4,}\b/g) || [];
      for (const tok of tokens) {
        if (looksLikeDrugName(tok) && tok.toLowerCase() !== moleculeLower) {
          relatedSet.add(tok);
        }
      }
      continue;
    }

    events.push({
      headline,
      summary: description || '',
      sourceUrl: url,
      publication: publicationFromUrl(url),
      kind: classifyKind(`${headline} ${description}`),
      date: dateFromUrl(url),
    });
  }

  // Cap related to top 5 by alphabetic order (deterministic across runs).
  const related = [...relatedSet].sort().slice(0, 5);
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
