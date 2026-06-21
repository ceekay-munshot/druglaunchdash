#!/usr/bin/env node
/**
 * scripts/enrich-bse.mjs  —  BSE-based field enrichment (FREE-TIER ONLY)
 *
 * GOAL: fill the blank fields (molecule / therapy / indication / chronic-acute /
 * competitor brand / dealType / seller) on the dashboard's rows by harvesting the
 * full press-release / filing PDFs from BSE corporate announcements and reading
 * them with an LLM. Output lands in a SIDECAR file (public/enrichment.json) that
 * the dashboard overlays — the existing scrapers and public/launches.json are
 * NEVER touched.
 *
 * Services (ALL free tier):
 *   • Scrape.do  — fetch BSE API JSON + filing PDFs (gets past BSE anti-bot)
 *   • Gemini     — primary extractor (reads PDF natively, JSON output)
 *   • Groq       — fast classifier + fallback extractor (text)
 *   • Mistral    — second fallback extractor (text)
 * NEVER calls Firecrawl (paid) or OpenAI (no free tier).
 *
 * ── PROBE MODE (current) ────────────────────────────────────────────────────
 *   node scripts/enrich-bse.mjs --probe
 * Read-only end-to-end plumbing check. Writes NO files. Validates:
 *   1) Scrape.do reachability + BSE scrip-code sanity (getScripHeaderData)
 *   2) BSE announcements API (AnnGetData) for one company
 *   3) one filing PDF → Gemini structured extraction
 *   4) Groq + Mistral JSON-mode sanity pings (fallback providers)
 * Every step is wrapped so one failure still lets the others report — the goal
 * is to learn about ALL four services in a single Actions run.
 */

// ── Keys (from GitHub Actions secrets; never printed) ───────────────────────
const SCRAPEDO_API_KEY = process.env.SCRAPEDO_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

// ── The 14 BSE-listed companies (Corona Remedies + Intas are private). ──────
// Codes verified against getScripHeaderData in Step 1 of the probe.
const COMPANIES = [
  { name: 'Sun Pharma',         scrip: '524715' },
  { name: 'Cipla',              scrip: '500087' },
  { name: "Dr. Reddy's",        scrip: '500124' },
  { name: 'Lupin',              scrip: '500257' },
  { name: 'Glenmark',           scrip: '532296' },
  { name: 'Aurobindo',          scrip: '524804' },
  { name: 'Torrent Pharma',     scrip: '500420' },
  { name: 'Natco Pharma',       scrip: '524816' },
  { name: 'Zydus Lifesciences', scrip: '532321' },
  { name: 'Abbott India',       scrip: '500488' },
  { name: 'Alkem',              scrip: '539523' },
  { name: 'Eris Lifesciences',  scrip: '540596' },
  { name: 'Mankind Pharma',     scrip: '543904' },
  { name: 'Wockhardt',          scrip: '532300' },
];

// ── tiny helpers ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const snippet = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n);
const yyyymmdd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

function banner(title) {
  console.log('\n' + '═'.repeat(74));
  console.log('  ' + title);
  console.log('═'.repeat(74));
}

// Scrape.do returns its own JSON error envelope on failure; detect it so we
// don't treat an error page as a successful BSE payload.
function looksLikeScrapedoError(text) {
  if (!text) return true;
  const t = text.trim();
  if (/"Message"\s*:/.test(t) && /scrape\.do|token|target|credit/i.test(t)) return true;
  return false;
}

// fetch() has NO default timeout — a single non-returning proxy/PDF connection
// would otherwise stall the whole job. Hard-abort every request.
async function fetchWithTimeout(url, opts = {}, ms = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Core Scrape.do call. render=false (1 credit, cheapest) by default; geoCode
// routes through an India IP when BSE blocks foreign datacenters; customHeaders
// forwards Referer/Origin so BSE's API accepts the request.
async function scrapedo(targetUrl, { geoCode = null, headers = {}, binary = false, timeoutMs = 30000 } = {}) {
  if (!SCRAPEDO_API_KEY) throw new Error('SCRAPEDO_API_KEY missing');
  const params = new URLSearchParams({ token: SCRAPEDO_API_KEY, url: targetUrl });
  if (geoCode) params.set('geoCode', geoCode);
  const fwd = Object.keys(headers).length > 0;
  if (fwd) params.set('customHeaders', 'true');

  const res = await fetchWithTimeout(
    `https://api.scrape.do/?${params.toString()}`,
    { headers: fwd ? headers : undefined },
    timeoutMs
  );
  if (binary) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf };
  }
  const body = await res.text();
  return { status: res.status, body };
}

// Once we learn which Scrape.do mode reaches BSE, lock it so every later call
// makes ONE request instead of retrying no-geo→geo (halves credits + time).
let LOCKED_GEO; // undefined = not yet determined

// Scrape.do against BSE runs 30-60s/call and throws the odd 502, so use a
// generous timeout and retry transient failures twice per mode. Auto-adapts
// then locks the working geo mode: try the locked mode if known, else no-geo
// first (cheapest) then India geo-routing, remembering whichever worked.
const SCRAPEDO_TIMEOUT_MS = 90000;
async function bseGet(url, { binary = false } = {}) {
  const headers = {
    Referer: 'https://www.bseindia.com/',
    Origin: 'https://www.bseindia.com',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  };
  const modes = LOCKED_GEO !== undefined ? [LOCKED_GEO] : [null, 'in'];
  for (const geo of modes) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await scrapedo(url, { geoCode: geo, headers, binary, timeoutMs: SCRAPEDO_TIMEOUT_MS });
        const ok = r.status === 200 && (binary ? r.buf?.length > 0 : r.body && !looksLikeScrapedoError(r.body));
        if (ok) {
          if (LOCKED_GEO === undefined) LOCKED_GEO = geo; // lock on first success
          return { ...r, geo };
        }
        console.log(
          `    ↳ ${geo || 'no-geo'} a${attempt}: status ${r.status}` +
            (binary ? `, ${r.buf?.length || 0} bytes` : `, body=${snippet(r.body, 140)}`)
        );
        if (![429, 500, 502, 503, 504].includes(r.status)) break; // non-transient → next mode
      } catch (e) {
        console.log(`    ↳ ${geo || 'no-geo'} a${attempt}: ${e.name === 'AbortError' ? 'timed out' : 'threw ' + e.message}`);
      }
      await sleep(1500 * attempt);
    }
  }
  return null;
}

// ── BSE endpoints ───────────────────────────────────────────────────────────
const bseHeaderUrl = (scrip) =>
  `https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${scrip}&seriesid=`;

const bseAnnUrl = (scrip, fromD, toD) =>
  `https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?pageno=1&strCat=-1&strPrevDate=${fromD}` +
  `&strScrip=${scrip}&strSearch=P&strToDate=${toD}&strType=C`;

const bsePdfUrl = (attachName) =>
  `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${attachName}`;

// ── Gemini: extract structured rows from a filing PDF ───────────────────────
const EXTRACTION_PROMPT = `You are reading an Indian pharmaceutical company's BSE corporate-filing PDF.

Extract every announcement in this document that is ONE of:
  • a new drug / brand launch (own NCE, generic, biosimilar, line extension, device)
  • a brand or company acquisition (India market)
  • an in-licensing or co-marketing deal (India market)

SKIP pure corporate/financial news (results, board meetings, dividends, voting
results, appointments, credit ratings, facility/CSR/award news).

Return STRICT JSON: { "rows": [ { ...fields } ] }. If the document has no such
product event, return { "rows": [] }.

Fields per row:
  brand, launchType ("Own Launched"|"Acquired"|"In-licensed"),
  date (ISO YYYY-MM-DD), seller (counterparty; "—" if own launch),
  dealType, molecule, therapy, indication,
  existingBrand (a COMPETITOR market-leading brand for the same molecule, from a
    company OTHER than the filer; "—" if none), chronicAcute ("Chronic"|"Acute"|"—").

CAREFUL-INFERENCE MODE (this is allowed and wanted):
  • Prefer values stated in the document. When the document does not state
    therapy / indication / chronicAcute / molecule explicitly, you MAY infer
    them from well-established medical knowledge of the named molecule or brand
    (e.g. semaglutide → Anti-Diabetic, Chronic). Only infer when you are highly
    confident; otherwise use "—". Never invent a brand, date, or counterparty.`;

async function geminiExtractFromPdf(base64pdf) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_PROMPT },
          { inlineData: { mimeType: 'application/pdf', data: base64pdf } },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };
  const res = await fetchWithTimeout(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    60000
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${snippet(text, 240)}`);
  const json = JSON.parse(text);
  const out = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return out;
}

// ── Groq / Mistral JSON-mode sanity pings (OpenAI-compatible) ───────────────
async function chatJson({ endpoint, key, model, prompt }) {
  const res = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    },
    45000
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${snippet(text, 240)}`);
  const json = JSON.parse(text);
  return json?.choices?.[0]?.message?.content ?? '';
}

// ════════════════════════════════════════════════════════════════════════════
// PROBE
// ════════════════════════════════════════════════════════════════════════════
async function probe() {
  banner('KEY PRESENCE');
  for (const [k, v] of Object.entries({
    SCRAPEDO_API_KEY,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    MISTRAL_API_KEY,
  })) {
    console.log(`  ${k.padEnd(18)} ${v ? `set (${v.length} chars)` : '✖ MISSING'}`);
  }

  // ── Step 1: reachability spot-check (all 14 codes already verified 14/14) ──
  banner('STEP 1 — Scrape.do → BSE reachability (spot-check 3 scrips)');
  let okCodes = 0;
  for (const c of COMPANIES.slice(0, 3)) {
    const r = await bseGet(bseHeaderUrl(c.scrip));
    if (!r) {
      console.log(`  ✖ ${c.name.padEnd(20)} ${c.scrip} → no response`);
      continue;
    }
    let ltp = '?';
    try { ltp = JSON.parse(r.body)?.CurrRate?.LTP ?? '?'; } catch { ltp = snippet(r.body, 60); }
    okCodes += 1;
    console.log(`  ✓ ${c.name.padEnd(20)} ${c.scrip} → LTP ${ltp}  [${r.geo || 'no-geo'}]`);
    await sleep(400);
  }
  console.log(`\n  reachable: ${okCodes}/3 · locked geo: ${LOCKED_GEO === undefined ? '(none)' : LOCKED_GEO || 'no-geo'}`);

  // ── Step 2: BSE announcements API — RAW diagnosis of the empty result ──────
  banner('STEP 2 — BSE announcements (AnnGetData) — RAW diagnosis for Sun Pharma');
  const to = new Date();
  const from = new Date(Date.now() - 180 * 86400000);
  let firstPdfAttachment = null;
  const annVariants = [
    { label: 'with dates (YYYYMMDD)', url: bseAnnUrl('524715', yyyymmdd(from), yyyymmdd(to)) },
    {
      label: 'empty dates',
      url: 'https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?pageno=1&strCat=-1&strPrevDate=&strScrip=524715&strSearch=P&strToDate=&strType=C',
    },
  ];
  for (const v of annVariants) {
    console.log(`  • variant: ${v.label}`);
    const r = await bseGet(v.url);
    if (!r) {
      console.log('    ✖ no response');
      continue;
    }
    console.log(`    raw[0..500]: ${snippet(r.body, 500)}`);
    try {
      const j = JSON.parse(r.body);
      const rows = Array.isArray(j?.Table) ? j.Table : [];
      console.log(`    parsed Table rows: ${rows.length} · top-level keys: ${Object.keys(j).join(', ')}`);
      for (const a of rows.slice(0, 6)) {
        const att = a.ATTACHMENTNAME || '—';
        console.log(`      - [${a.CATEGORYNAME || a.NEWS_DT || '?'}] ${snippet(a.HEADLINE || a.NEWSSUB, 80)} (pdf: ${att})`);
        if (!firstPdfAttachment && /\.pdf$/i.test(att)) firstPdfAttachment = att;
      }
    } catch (e) {
      console.log(`    (not JSON: ${e.message})`);
    }
    await sleep(500);
  }

  // ── Step 3: Gemini PDF extraction ─────────────────────────────────────────
  // Decoupled from Step 2: prefer a real BSE filing if one surfaced, else fall
  // back to a KNOWN Sun Pharma press-release PDF so PDF-extraction is validated
  // even while AnnGetData is being fixed.
  banner('STEP 3 — Gemini PDF extraction (BSE filing if found, else known PR)');
  const KNOWN_PDF = 'https://sunpharma.com/wp-content/uploads/2026/01/UNLOXCYT-Commercial-Launch-Press-Release.pdf';
  try {
    let pdfBuf = null;
    let srcLabel = '';
    if (firstPdfAttachment) {
      srcLabel = `BSE: ${firstPdfAttachment}`;
      const r = await bseGet(bsePdfUrl(firstPdfAttachment), { binary: true });
      if (r?.buf?.length) pdfBuf = r.buf;
    }
    if (!pdfBuf) {
      srcLabel = `known PR: ${KNOWN_PDF.split('/').pop()}`;
      const r = await scrapedo(KNOWN_PDF, { binary: true, timeoutMs: SCRAPEDO_TIMEOUT_MS });
      if (r?.status === 200 && r?.buf?.length) pdfBuf = r.buf;
      else console.log(`    scrape.do status ${r?.status}, ${r?.buf?.length || 0} bytes`);
    }
    if (!pdfBuf) {
      console.log('  ✖ could not fetch any PDF');
    } else {
      console.log(`  ✓ fetched ${pdfBuf.length} bytes (${srcLabel})`);
      const out = await geminiExtractFromPdf(pdfBuf.toString('base64'));
      console.log(`  ✓ Gemini (${GEMINI_MODEL}) extracted:`);
      console.log('    ' + snippet(out, 700));
    }
  } catch (e) {
    console.log(`  ✖ PDF→Gemini failed: ${e.message}`);
  }

  // ── Step 4: Groq + Mistral pings ──────────────────────────────────────────
  banner('STEP 4 — Groq + Mistral JSON-mode pings (fallback extractors)');
  const pingPrompt =
    'From this text return JSON {"brand":..,"molecule":..,"therapy":..}: ' +
    '"Acme Pharma launched Glycomet-GP, a metformin + glimepiride combination for type 2 diabetes."';
  try {
    const g = await chatJson({
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      key: GROQ_API_KEY,
      model: GROQ_MODEL,
      prompt: pingPrompt,
    });
    console.log(`  ✓ Groq (${GROQ_MODEL}): ${snippet(g, 200)}`);
  } catch (e) {
    console.log(`  ✖ Groq failed: ${e.message}`);
  }
  try {
    const m = await chatJson({
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      key: MISTRAL_API_KEY,
      model: MISTRAL_MODEL,
      prompt: pingPrompt,
    });
    console.log(`  ✓ Mistral (${MISTRAL_MODEL}): ${snippet(m, 200)}`);
  } catch (e) {
    console.log(`  ✖ Mistral failed: ${e.message}`);
  }

  banner('PROBE COMPLETE');
  console.log('  Review each step above. ✓ across all four services = ready for Phase 2.\n');
}

// ── entry ───────────────────────────────────────────────────────────────────
const mode = process.argv.includes('--probe') ? 'probe' : 'probe'; // only probe implemented in Phase 1
if (mode === 'probe') {
  probe().catch((err) => {
    console.error('FATAL', err);
    process.exit(1);
  });
}
