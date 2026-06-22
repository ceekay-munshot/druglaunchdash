#!/usr/bin/env node
/**
 * scripts/enrich-bse.mjs — free-tier launch-enrichment harvester
 *
 * GOAL: fill the blank fields on the dashboard's rows (and surface launches the
 * daily Firecrawl scraper missed) by harvesting the FULL filing PDFs behind each
 * company's corporate announcements and reading them with an LLM. Output lands in
 * a SIDECAR file (public/enrichment.json) that the dashboard overlays — the
 * existing scrapers and public/launches.json are NEVER touched.
 *
 * PIPELINE (all free-tier services):
 *   1) discover  — Screener.in company page → BSE/NSE announcement filing links
 *                  (BSE's own announcements API serves a "No Record Found!" decoy
 *                   to automated callers, so we discover via Screener but still
 *                   pull the underlying BSE filing PDFs).        [Scrape.do]
 *   2) filter    — keep only launch / acquisition / in-license / approval titles,
 *                  drop results/AGM/dividend/rating noise (saves tokens).
 *   3) fetch     — download each relevant filing PDF.            [Scrape.do]
 *   4) text      — extract text locally.                         [unpdf, pure JS]
 *   5) extract   — structured rows via a provider rotation that survives any one
 *                  provider's daily cap.       [Groq → Mistral → Gemini-2.5-flash]
 *   6) write     — public/enrichment.json (cached by filing URL so re-runs only
 *                  process NEW announcements; bounded by MAX_DOCS_PER_RUN).
 *
 * NEVER calls Firecrawl (paid) or OpenAI (no free tier).
 *
 * Usage:
 *   node scripts/enrich-bse.mjs --dry-run            # discover+filter, 1 extraction, write nothing
 *   node scripts/enrich-bse.mjs --limit=24           # full run, cap docs this run
 *   node scripts/enrich-bse.mjs --company=Sun        # restrict to matching companies
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'public', 'enrichment.json');

// ── keys (GitHub Actions secrets; never printed) ────────────────────────────
const SCRAPEDO_API_KEY = process.env.SCRAPEDO_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ── CLI ─────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const LIMIT_ARG = ARGS.find((a) => a.startsWith('--limit='));
const MAX_DOCS_PER_RUN = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : DRY_RUN ? 3 : 24;
const COMPANY_ARG = (ARGS.find((a) => a.startsWith('--company=')) || '').split('=')[1] || '';
// Cap announcements inspected per company so one busy filer can't eat the run.
const MAX_ANN_PER_COMPANY = 60;
// Backfill phase: re-read existing stub rows' own sourceUrl to fill old launches.
const RUN_BACKFILL = ARGS.includes('--backfill') || ARGS.includes('--backfill-only');
const BACKFILL_ONLY = ARGS.includes('--backfill-only');
const BACKFILL_CAP_ARG = ARGS.find((a) => a.startsWith('--backfill-cap='));
const BACKFILL_CAP = BACKFILL_CAP_ARG ? parseInt(BACKFILL_CAP_ARG.split('=')[1], 10) : 120;
const LAUNCHES_PATH = path.join(ROOT, 'public', 'launches.json');

// ── companies (Screener accepts the BSE scrip code as the slug) ──────────────
// Corona Remedies + Intas are privately held → no exchange filings; they stay
// on the existing website scraper.
const COMPANIES = [
  { name: 'Sun Pharma', scrip: '524715' },
  { name: 'Cipla', scrip: '500087' },
  { name: "Dr. Reddy's", scrip: '500124' },
  { name: 'Lupin', scrip: '500257' },
  { name: 'Glenmark', scrip: '532296' },
  { name: 'Aurobindo', scrip: '524804' },
  { name: 'Torrent Pharma', scrip: '500420' },
  { name: 'Natco Pharma', scrip: '524816' },
  { name: 'Zydus Lifesciences', scrip: '532321' },
  { name: 'Abbott India', scrip: '500488' },
  { name: 'Alkem', scrip: '539523' },
  { name: 'Eris Lifesciences', scrip: '540596' },
  { name: 'Mankind Pharma', scrip: '543904' },
  { name: 'Wockhardt', scrip: '532300' },
];

// ── tiny helpers ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const snippet = (s, n = 200) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const BSE_HEADERS = { Referer: 'https://www.bseindia.com/', 'User-Agent': UA };
function banner(title) {
  console.log('\n' + '═'.repeat(74) + `\n  ${title}\n` + '═'.repeat(74));
}

// fetch() has no default timeout — abort so one dead connection can't hang CI.
async function fetchWithTimeout(url, opts = {}, ms = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const SCRAPEDO_TIMEOUT_MS = 90000;
// Scrape.do fetch. render/super(residential)/geoCode/session are available but
// Screener + BSE PDFs work on the cheapest default (no-geo, no render).
async function scrapedo(targetUrl, { geoCode = null, headers = {}, binary = false, timeoutMs = SCRAPEDO_TIMEOUT_MS, render = false, superProxy = false } = {}) {
  if (!SCRAPEDO_API_KEY) throw new Error('SCRAPEDO_API_KEY missing');
  const params = new URLSearchParams({ token: SCRAPEDO_API_KEY, url: targetUrl });
  if (geoCode) params.set('geoCode', geoCode);
  if (render) params.set('render', 'true');
  if (superProxy) params.set('super', 'true');
  const fwd = Object.keys(headers).length > 0;
  if (fwd) params.set('customHeaders', 'true');
  const res = await fetchWithTimeout(`https://api.scrape.do/?${params.toString()}`, { headers: fwd ? headers : undefined }, timeoutMs);
  if (binary) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
  return { status: res.status, body: await res.text() };
}

// Scrape.do + one transient retry (Scrape.do/BSE throw the odd 502).
async function scrapedoRetry(url, opts = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await scrapedo(url, opts);
      const ok = r.status === 200 && (opts.binary ? r.buf?.length > 0 : r.body?.length > 0);
      if (ok) return r;
      if (![429, 500, 502, 503, 504].includes(r.status)) return r;
    } catch (e) {
      if (attempt === 2) throw e;
    }
    await sleep(1500 * attempt);
  }
  return null;
}

// ── discovery: Screener.in company page → BSE/NSE filing PDF links ──────────
async function fetchScreener(scrip) {
  return scrapedoRetry(`https://www.screener.in/company/${scrip}/`, { timeoutMs: SCRAPEDO_TIMEOUT_MS });
}

// BSE filing PDFs surface as AnnPdfOpen.aspx?Pname=<id>.pdf (live) or
// corpfiling/Attach(His|Live)/<id>.pdf; NSE as nsearchives/archives links.
// Annual reports (/AnnualReport/) and IR decks are intentionally NOT matched.
const ANN_LINK_RE =
  /<a[^>]+href="(https?:\/\/[^"]*?(?:AnnPdfOpen\.aspx\?Pname=[^"]+\.pdf|corpfiling\/Attach(?:His|Live)\/[^"]+\.pdf|nsearchives\.nseindia\.com\/[^"]+\.pdf|archives\.nseindia\.com\/[^"]+\.pdf))"[^>]*>([\s\S]*?)<\/a>/gi;

function discoverFromHtml(html) {
  const seen = new Set();
  const out = [];
  let m;
  while ((m = ANN_LINK_RE.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    if (seen.has(url)) continue;
    seen.add(url);
    const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ url, title });
  }
  return out;
}

// ── title filter — keep product events, drop corporate/financial noise ──────
// Screener titles look like "<SEBI Reg-30 category> <date> - <headline>", so we
// match on BOTH the category label and the headline. DROP is checked first.
// (Note: \bnce\b must be bounded — unbounded "nce" matches inside "announcement".)
const DROP_RE =
  /(newspaper (?:publication|advert)|allotment of (?:esop|equity|share)|\besop\b|\besps\b|stock option|stock appreciation|sweat equity|financial result|quarterly result|un-?audited|audited (?:financial|result)|annual report|integrated report|from bse|transcript|earnings|\bppt\b|investor (?:presentation|meet|call|day)|analyst meet|conference call|concall|\bagm\b|\begm\b|postal ballot|voting result|scrut[ie]niz|trading window|dividend|record date|book closure|interest payment|board meeting|outcome of (?:the )?board|corporate action|credit rating|change in (?:management|director|kmp|auditor|cfo|company secretary|registrar)|resignation|re-?appointment|appointment of|cessation|corrigendum|compliance certificate|certificate under|regulation 7[34]|duplicate|loss of (?:share|certificate)|sub-?division|inspection|intimation of|fund ?rais|\bqip\b|rights issue|debenture|\bncd\b)/i;
const KEEP_RE =
  /(launch|introduc|unveil|roll[- ]?out|acquir|acquisition|amalgamat|\bmerger\b|scheme of arrangement|in[- ]?licens|\blicens|licence|co[- ]?market|distribution (?:agreement|arrangement|pact|rights)|definitive agreement|enters? into|signs? (?:an? )?(?:agreement|pact|deal|mou)|joint venture|\bjv\b|biosimilar|\bgeneric|new drug|\bnce\b|line extension|receives? (?:approval|nod)|approval (?:for|of|from|to)|us ?fda approval|usfda approval|marketing authoriz|commercial(?:is|iz)|press release|media release|\bproduct\b|stake in|investment in)/i;

function isRelevantTitle(t) {
  if (!t) return false;
  if (DROP_RE.test(t)) return false;
  return KEEP_RE.test(t);
}

// ── PDF → text (pure-JS, no native deps; installed in CI via `npm i unpdf`) ──
async function pdfToText(buf) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(doc, { mergePages: true });
  return text || '';
}

// Crude HTML → text for backfill source pages (company PR pages / news articles).
function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch a source document (PDF or HTML) and return its text. Sniffs %PDF magic
// bytes so it works regardless of the URL extension.
async function fetchDocText(url) {
  const r = await scrapedoRetry(url, { binary: true, headers: { 'User-Agent': UA }, timeoutMs: SCRAPEDO_TIMEOUT_MS });
  if (!r?.buf?.length) return { ok: false, status: r?.status };
  const isPdf = r.buf.slice(0, 5).toString('latin1').startsWith('%PDF') || /\.pdf(\?|$)/i.test(url);
  try {
    const text = isPdf ? await pdfToText(r.buf) : htmlToText(r.buf.toString('utf8'));
    return { ok: true, text, kind: isPdf ? 'pdf' : 'html' };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

// ── extraction prompt (careful-inference mode ON, per product spec) ─────────
const EXTRACTION_PROMPT = `You are reading an Indian pharmaceutical company's corporate-filing / press-release PDF.

Extract every announcement in this document that is ONE of:
  • a new drug / brand launch (own NCE, generic, biosimilar, line extension, device)
  • a brand or company acquisition (India market)
  • an in-licensing / co-marketing / distribution deal (India market)

SKIP pure corporate/financial news (results, board meetings, dividends, voting
results, appointments, credit ratings, facility/CSR/award news). If the document
has no such product event, return {"rows": []}.

Return STRICT JSON: {"rows":[{...}]}. Fields per row:
  brand, launchType ("Own Launched"|"Acquired"|"In-licensed"),
  date (ISO YYYY-MM-DD), seller (counterparty; "—" if own launch),
  dealType, molecule, therapy, indication,
  existingBrand (a COMPETITOR market-leading brand for the same molecule, from a
    company OTHER than the filer; "—" if none), chronicAcute ("Chronic"|"Acute"|"—").

CAREFUL-INFERENCE MODE (allowed and wanted): prefer values stated in the
document; when therapy / indication / chronicAcute / molecule / existingBrand are
not stated, you MAY infer them from well-established medical knowledge of the
named molecule or brand (e.g. semaglutide → Anti-Diabetic, Chronic; for a
well-known molecule you may name the established market-leading competitor brand
in India). Only infer when highly confident; otherwise use "—". NEVER invent a
brand, date, or counterparty that the document does not support.`;

// ── LLM providers (OpenAI-compatible chat for Groq/Mistral; REST for Gemini) ─
async function chatJson(endpoint, key, model, prompt) {
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
    },
    60000
  );
  const t = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${snippet(t, 160)}`);
  return JSON.parse(t)?.choices?.[0]?.message?.content ?? '';
}

async function geminiJson(model, prompt) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) },
    60000
  );
  const t = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${snippet(t, 160)}`);
  return JSON.parse(t)?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

const PROVIDERS = [
  { name: 'groq', run: (p) => chatJson('https://api.groq.com/openai/v1/chat/completions', GROQ_API_KEY, GROQ_MODEL, p), ok: () => !!GROQ_API_KEY },
  { name: 'mistral', run: (p) => chatJson('https://api.mistral.ai/v1/chat/completions', MISTRAL_API_KEY, MISTRAL_MODEL, p), ok: () => !!MISTRAL_API_KEY },
  { name: 'gemini', run: (p) => geminiJson(GEMINI_MODEL, p), ok: () => !!GEMINI_API_KEY },
];
let rrStart = 0; // round-robin cursor so load spreads across daily caps
async function llmExtract(prompt) {
  const usable = PROVIDERS.filter((p) => p.ok());
  for (let i = 0; i < usable.length; i++) {
    const prov = usable[(rrStart + i) % usable.length];
    try {
      const out = await prov.run(prompt);
      rrStart = (rrStart + i + 1) % usable.length;
      return { out, provider: prov.name };
    } catch (e) {
      console.log(`      (${prov.name} unavailable: ${snippet(e.message, 70)})`);
    }
  }
  return { out: null, provider: null };
}

// ── row hygiene ─────────────────────────────────────────────────────────────
const blank = (v) => v == null || ['', '-', '—', 'n/a', 'null'].includes(String(v).trim().toLowerCase());
const JUNK_BRAND = [/^—+$|^-+$|^n\/a$/i, /^\[.*\]$/, /^(brandx|brandy|acmebio|novelgen)\b/i, /^new (drug|brand)\b/i];
function isJunkBrand(b) {
  const s = String(b ?? '').trim();
  return !s || JUNK_BRAND.some((re) => re.test(s));
}
function parseRows(out) {
  if (!out) return [];
  try {
    const j = JSON.parse(out);
    const rows = Array.isArray(j?.rows) ? j.rows : Array.isArray(j) ? j : [];
    return rows.filter((r) => r && !isJunkBrand(r.brand));
  } catch {
    return [];
  }
}
function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = `${String(r.brand).trim().toLowerCase()}|${r.date || ''}|${String(r.buyer || '').toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

async function loadEnrichment() {
  try {
    const j = JSON.parse(await fs.readFile(OUT_PATH, 'utf8'));
    return { rows: Array.isArray(j.rows) ? j.rows : [], processedUrls: Array.isArray(j.processedUrls) ? j.processedUrls : [] };
  } catch {
    return { rows: [], processedUrls: [] };
  }
}

// ── backfill: re-read existing stub rows' own source documents ──────────────
// 206/210 launches.json stubs already carry their sourceUrl (PDFs, company PR
// pages, news articles). Re-read each, extract, and lock identity to the stub
// (brand+buyer+date) so the dashboard overlay fills that exact row. Other rows
// the doc reveals (e.g. siblings of a multi-brand acquisition) are emitted too.
const STUB_FIELDS_BF = ['molecule', 'therapy', 'indication', 'chronicAcute', 'existingBrand'];
const isStubRow = (r) => STUB_FIELDS_BF.filter((f) => blank(r[f])).length >= 3;
const brandToken = (s) =>
  String(s ?? '').toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function backfillStubs(processed, rows, cap) {
  let launches = [];
  try {
    launches = JSON.parse(await fs.readFile(LAUNCHES_PATH, 'utf8')).rows || [];
  } catch (e) {
    console.log(`  ✖ cannot read launches.json: ${e.message}`);
    return 0;
  }
  const stubs = launches.filter(
    (r) => isStubRow(r) && r.sourceUrl && /^https?:/i.test(r.sourceUrl) && !processed.has(r.sourceUrl)
  );
  banner(`BACKFILL — ${stubs.length} stub rows with unprocessed source URLs (cap ${cap})`);

  // FILL-ONLY: only emit rows that map to an existing launches row (the target
  // stub locked to its identity + any sibling the doc reveals that ALREADY
  // exists). Never append unknown brands here — that's the harvester's job — so
  // portfolio/news docs can't bloat the dashboard with empty sibling rows.
  const normK = (x) => String(x ?? '').toLowerCase().replace(/[®™]/g, '').replace(/\s+/g, ' ').trim();
  const launchKeys = new Set(launches.map((L) => `${normK(L.brand)}|${normK(L.buyer)}`));

  let done = 0;
  let produced = 0;
  let consecutiveBusy = 0;
  for (const s of stubs) {
    if (done >= cap) break;
    let d;
    try {
      d = await fetchDocText(s.sourceUrl);
    } catch (e) {
      processed.add(s.sourceUrl);
      done += 1;
      console.log(`    ✖ ${snippet(s.brand, 30)}: ${e.message}`);
      continue;
    }
    if (!d.ok || !d.text || d.text.replace(/\s/g, '').length < 120) {
      processed.add(s.sourceUrl); // doc unusable (dead link / scanned) — don't retry
      done += 1;
      console.log(`    ⚠ ${snippet(s.brand, 30)} → little/no text (${d.status || d.err || d.kind || 'n/a'})`);
      continue;
    }
    const prompt = `${EXTRACTION_PROMPT}\n\nThis document concerns the launch/deal of brand "${s.brand}" by ${s.buyer}. Extract that event (and any other product events present).\n\nDOCUMENT TEXT:\n${d.text.slice(0, 14000)}`;
    const { out, provider } = await llmExtract(prompt);
    if (out === null) {
      // every provider is rate-limited — leave this stub UNcached so a later run
      // retries it, and stop early so we don't burn fetches we can't extract.
      consecutiveBusy += 1;
      console.log(`    … ${snippet(s.brand, 30)} → all providers busy`);
      if (consecutiveBusy >= 3) {
        console.log('  ⏸ providers rate-limited — stopping backfill (resumes next run)');
        break;
      }
      continue;
    }
    consecutiveBusy = 0;
    processed.add(s.sourceUrl); // real attempt completed → don't reprocess
    done += 1;
    const ex = parseRows(out);
    const tok = brandToken(s.brand);
    const target = ex.find((r) => { const b = brandToken(r.brand); return b && tok && (b.includes(tok) || tok.includes(b)); }) || ex[0];
    let emitted = 0;
    for (const r of ex) {
      const isTarget = r === target;
      const buyer = blank(r.buyer) ? s.buyer : r.buyer;
      if (!isTarget && !launchKeys.has(`${normK(r.brand)}|${normK(buyer)}`)) continue; // fill-only
      rows.push({
        brand: isTarget ? s.brand : r.brand,
        launchType: r.launchType || (isTarget ? s.launchType : undefined),
        date: isTarget ? s.date || r.date : r.date,
        seller: r.seller,
        dealType: r.dealType,
        molecule: r.molecule,
        therapy: r.therapy,
        indication: r.indication,
        existingBrand: r.existingBrand,
        chronicAcute: r.chronicAcute,
        buyer,
        sourceUrl: s.sourceUrl,
        _title: `backfill:${s.brand}`,
        _provider: provider,
        _harvestedAt: new Date().toISOString(),
      });
      emitted += 1;
    }
    produced += emitted;
    const m = target || {};
    console.log(`    [${provider}] ${snippet(s.brand, 30)} ← ${d.kind} · mol=${m.molecule || '—'} ther=${m.therapy || '—'} ca=${m.chronicAcute || '—'} (${emitted}/${ex.length} kept)`);
    await sleep(700);
  }
  console.log(`  backfill: ${done} docs processed · ${produced} rows produced`);
  return produced;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶ enrich-bse ${DRY_RUN ? '(DRY RUN)' : ''} · cap ${MAX_DOCS_PER_RUN} docs/run · providers: ${PROVIDERS.filter((p) => p.ok()).map((p) => p.name).join(', ')}`);
  for (const k of ['SCRAPEDO_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY', 'GEMINI_API_KEY']) {
    if (!process.env[k]) console.log(`  ⚠ ${k} not set`);
  }

  const cache = await loadEnrichment();
  const processed = new Set(cache.processedUrls);
  const rows = DRY_RUN ? [] : [...cache.rows];
  console.log(`  cache: ${cache.rows.length} rows, ${processed.size} processed URLs`);

  const companies = COMPANY_ARG
    ? COMPANIES.filter((c) => c.name.toLowerCase().includes(COMPANY_ARG.toLowerCase()))
    : COMPANIES;

  let docsDone = 0;
  let newRows = 0;
  for (const c of BACKFILL_ONLY ? [] : companies) {
    if (docsDone >= MAX_DOCS_PER_RUN) break;
    banner(`${c.name} (${c.scrip})`);

    let html = '';
    try {
      const r = await fetchScreener(c.scrip);
      html = r?.body || '';
      console.log(`  screener: status ${r?.status} · ${html.length} bytes`);
    } catch (e) {
      console.log(`  ✖ screener failed: ${e.message}`);
      continue;
    }
    const anns = discoverFromHtml(html).slice(0, MAX_ANN_PER_COMPANY);
    const kept = anns.filter((a) => isRelevantTitle(a.title));
    console.log(`  announcements: ${anns.length} found · ${kept.length} relevant`);
    if (DRY_RUN) {
      for (const a of anns.slice(0, 16)) {
        console.log(`    ${isRelevantTitle(a.title) ? '✓' : '·'} ${snippet(a.title, 78)}`);
      }
    }

    for (const a of kept) {
      if (docsDone >= MAX_DOCS_PER_RUN) break;
      if (processed.has(a.url)) continue;
      processed.add(a.url);
      docsDone += 1;
      try {
        const pr = await scrapedoRetry(a.url, { binary: true, headers: BSE_HEADERS, geoCode: 'in', timeoutMs: SCRAPEDO_TIMEOUT_MS });
        if (!pr?.buf?.length) {
          console.log(`    ✖ [${snippet(a.title, 46)}] pdf status ${pr?.status}`);
          continue;
        }
        const text = await pdfToText(pr.buf);
        if (!text || text.replace(/\s/g, '').length < 120) {
          console.log(`    ⚠ [${snippet(a.title, 46)}] little text (${text.length} chars; scanned?) — skipping`);
          continue;
        }
        const prompt = `${EXTRACTION_PROMPT}\n\nFILER (likely buyer): ${c.name}\nANNOUNCEMENT TITLE: ${a.title}\n\nDOCUMENT TEXT:\n${text.slice(0, 14000)}`;
        const { out, provider } = await llmExtract(prompt);
        const extracted = parseRows(out).map((r) => ({
          brand: r.brand, launchType: r.launchType, date: r.date, seller: r.seller,
          dealType: r.dealType, molecule: r.molecule, therapy: r.therapy, indication: r.indication,
          existingBrand: r.existingBrand, chronicAcute: r.chronicAcute,
          buyer: blank(r.buyer) ? c.name : r.buyer, sourceUrl: a.url,
          _title: a.title, _provider: provider, _harvestedAt: new Date().toISOString(),
        }));
        rows.push(...extracted);
        newRows += extracted.length;
        console.log(`    [${provider || 'none'}] ${extracted.length} row(s) ← ${snippet(a.title, 46)}`);
        for (const r of extracted) console.log(`        • ${r.brand} | ${r.molecule || '—'} | ${r.therapy || '—'} | ${r.dealType || '—'} | ${r.chronicAcute || '—'}`);
      } catch (e) {
        console.log(`    ✖ [${snippet(a.title, 46)}] ${e.message}`);
      }
      await sleep(700);
    }
    await sleep(600);
  }

  if (RUN_BACKFILL) await backfillStubs(processed, rows, BACKFILL_CAP);

  const deduped = dedupeRows(rows);
  console.log(`\n▶ Screener: ${docsDone} new docs, +${newRows} rows · ${deduped.length} total after dedupe`);

  if (DRY_RUN) {
    console.log('DRY RUN — wrote nothing.');
    return;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    rowCount: deduped.length,
    rows: deduped,
    processedUrls: [...processed],
  };
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✔ wrote ${OUT_PATH} · ${deduped.length} rows · ${processed.size} processed URLs`);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
