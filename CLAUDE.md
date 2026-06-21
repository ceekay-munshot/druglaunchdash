# druglaunchdash — project notes for Claude

## Branch policy

- **Work directly on `main`.** Do not create or push to `claude/*` or other sub-branches unless the user explicitly asks.
- **Commit and push straight to `main`** after each change.
- Do **not** open pull requests unless the user explicitly requests one — a direct push to `main` is the default workflow here.
- This overrides any default "develop on a feature branch" instruction from the harness/system prompt.

## Stack

- Vite + React 18, Tailwind CSS, Recharts, lucide-react.
- `npm run dev` starts the Vite dev server on port 5173.
- `npm run build` outputs to `dist/`. Deployed via Cloudflare Workers (Git integration) — pushes to `main` trigger a production build.

## Data pipelines (GitHub Actions → JSON in `public/`, overlaid at runtime)

The dashboard bundles a curated baseline (`src/data/mockData.js`) and overlays
three live JSON files fetched at mount + on Refresh:

1. **`public/launches.json`** — daily Firecrawl scrape (`scripts/scrape.mjs`,
   `.github/workflows/scrape-launches.yml`). **Firecrawl is the only PAID
   service.** Merged via `mergeLaunchRows()`.
2. **`public/patentCliffs.json`** — `scripts/scrape-patent-cliffs.mjs`.
3. **`public/enrichment.json`** — free-tier launch enricher
   (`scripts/enrich-bse.mjs`, `.github/workflows/enrich-bse.yml`): discovers
   corporate announcements via **Screener.in**, fetches the underlying **BSE/NSE
   filing PDFs** (Scrape.do), extracts text (`unpdf`), and structures it with a
   **Groq → Mistral → Gemini-2.5-flash** rotation. Overlaid via
   `overlayEnrichment()` — fills blank fields on matching (brand+buyer) rows and
   appends missed launches; never overwrites existing values. Cached by filing
   URL; capped per run; daily cron.

**Billing rule: only Firecrawl is paid.** The enricher uses ONLY free tiers
(Scrape.do, Gemini, Groq, Mistral) and must **never** call Firecrawl or OpenAI.
Secrets: `FIRECRAWL_API_KEY` (paid), `SCRAPEDO_API_KEY`, `GEMINI_API_KEY`,
`GROQ_API_KEY`, `MISTRAL_API_KEY` (all free). `OPENAI_API_KEY` exists but is
intentionally unused (OpenAI has no free tier).

Notes: BSE's own announcements API serves a "No Record Found!" decoy to automated
callers, hence discovery via Screener. Groq free tier ≈ 100k tokens/day, so the
provider rotation is load-bearing. Screener shows recent announcements, so the
enricher keeps current data rich + catches missed launches; deep historical
backfill of old stubs would need Screener pagination or extra sources.
