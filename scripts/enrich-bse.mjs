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

// BSE fetch that auto-adapts then locks: try the locked mode if known; else try
// no-geo first (cheapest), fall back to India geo-routing, and remember whichever
// worked. Per-call timeouts mean a dead endpoint fails fast instead of hanging.
async function bseGet(url, { binary = false } = {}) {
  const headers = {
    Referer: 'https://www.bseindia.com/',
    Origin: 'https://www.bseindia.com',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  };
  const modes = LOCKED_GEO !== undefined ? [LOCKED_GEO] : [null, 'in'];
  for (const geo of modes) {
    try {
      const r = await scrapedo(url, { geoCode: geo, headers, binary, timeoutMs: binary ? 45000 : 30000 });
      const ok = r.status === 200 && (binary ? r.buf?.length > 0 : r.body && !looksLikeScrapedoError(r.body));
      if (ok) {
        if (LOCKED_GEO === undefined) LOCKED_GEO = geo; // lock on first success
        return { ...r, geo };
      }
      console.log(
        `    ↳ ${geo || 'no-geo'}: status ${r.status}` +
          (binary ? `, ${r.buf?.length || 0} bytes` : `, body=${snippet(r.body, 160)}`)
      );
    } catch (e) {
      console.log(`    ↳ ${geo || 'no-geo'}: ${e.name === 'AbortError' ? 'timed out' : 'threw ' + e.message}`);
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

  // ── Step 1: Scrape.do → BSE scrip-code sanity ─────────────────────────────
  banner('STEP 1 — Scrape.do reachability + BSE scrip codes (getScripHeaderData)');
  let workingGeo = null;
  let okCodes = 0;
  for (const c of COMPANIES) {
    const r = await bseGet(bseHeaderUrl(c.scrip));
    if (!r) {
      console.log(`  ✖ ${c.name.padEnd(20)} ${c.scrip} → no response`);
      continue;
    }
    workingGeo = r.geo;
    let issuer = '?';
    try {
      const j = JSON.parse(r.body);
      issuer = j?.Header?.[0]?.Scrip_Name || j?.Header?.[0]?.FullN || j?.Header?.[0]?.ISIN_NUMBER || JSON.stringify(j).slice(0, 80);
    } catch {
      issuer = snippet(r.body, 80);
    }
    okCodes += 1;
    console.log(`  ✓ ${c.name.padEnd(20)} ${c.scrip} → ${issuer}  [${r.geo || 'no-geo'}]`);
    await sleep(400);
  }
  console.log(`\n  scrip codes resolved: ${okCodes}/${COMPANIES.length} · working mode: ${workingGeo || 'no-geo'}`);

  // ── Step 2: BSE announcements API ─────────────────────────────────────────
  banner('STEP 2 — BSE announcements (AnnGetData) for Sun Pharma, last 180 days');
  const to = new Date();
  const from = new Date(Date.now() - 180 * 86400000);
  let firstPdfAttachment = null;
  try {
    const r = await bseGet(bseAnnUrl('524715', yyyymmdd(from), yyyymmdd(to)));
    if (!r) {
      console.log('  ✖ no response from AnnGetData');
    } else {
      const j = JSON.parse(r.body);
      const rows = Array.isArray(j?.Table) ? j.Table : [];
      console.log(`  ✓ ${rows.length} announcements  [${r.geo || 'no-geo'}]`);
      for (const a of rows.slice(0, 8)) {
        const att = a.ATTACHMENTNAME || '—';
        console.log(`    • [${a.CATEGORYNAME || '?'}] ${snippet(a.HEADLINE || a.NEWSSUB, 90)}  (pdf: ${att})`);
        if (!firstPdfAttachment && att && att !== '—' && /\.pdf$/i.test(att)) firstPdfAttachment = att;
      }
    }
  } catch (e) {
    console.log(`  ✖ AnnGetData failed: ${e.message}`);
  }

  // ── Step 3: PDF → Gemini extraction ───────────────────────────────────────
  banner('STEP 3 — fetch one filing PDF + Gemini extraction');
  if (!firstPdfAttachment) {
    console.log('  (skipped — no PDF attachment found in Step 2)');
  } else {
    try {
      console.log(`  fetching PDF: ${firstPdfAttachment}`);
      const pdf = await bseGet(bsePdfUrl(firstPdfAttachment), { binary: true });
      if (!pdf || !pdf.buf?.length) {
        console.log('  ✖ PDF fetch returned no bytes');
      } else {
        console.log(`  ✓ PDF ${pdf.buf.length} bytes [${pdf.geo || 'no-geo'}]`);
        const b64 = pdf.buf.toString('base64');
        const out = await geminiExtractFromPdf(b64);
        console.log(`  ✓ Gemini (${GEMINI_MODEL}) returned:`);
        console.log('    ' + snippet(out, 600));
      }
    } catch (e) {
      console.log(`  ✖ PDF→Gemini failed: ${e.message}`);
    }
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
