# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NRSS generates publicly accessible RSS feeds for NRK's podcasts by proxying NRK's
[psapi](https://psapi.nrk.no/documentation/). It's a Deno [Fresh](https://fresh.deno.dev/)
app deployed to Deno Deploy ([nrss.deno.dev](https://nrss.deno.dev/)), with an optional
Vipps-based donation flow.

## Commands

- `deno task start` — run the dev server with file watching (http://localhost:8000)
- `deno task test` — run all tests (`deno test -A`)
- `deno test -A lib/caching.test.ts` — run a single test file
- `deno task check` — fmt check + lint + typecheck; this is what CI (`.github/workflows/test.yaml`) runs alongside tests on every push
- `deno task types:nrk` — regenerate NRK API types from their OpenAPI specs (see below)

There is no separate build step; Deno Deploy runs `main.ts` directly.

## Architecture

Request flow for a feed (`GET /api/feeds/:seriesId`):

1. **Route** `routes/api/feeds/[seriesId].ts` — checks a Deno `caches` HTTP cache first.
   Note: Deno's cache API does not honor `Expires`/`Cache-Control` for expiry, so expiry
   is checked manually via the `Expires` header (`isExpired`). See the linked Deno issue
   in that file before "fixing" this.
2. **Caching layer** `lib/caching.ts` — `caching.getSeries` is the read-through cache over
   Deno KV. On miss it does an `initialFetch`; if the stored copy is older than
   `SYNC_INTERVAL_HOURS` (1h) it does an `updateFetch` that merges new episodes and re-sorts
   descending by date.
3. **NRK client** `lib/nrk/nrk.ts` — `nrkRadio.getSeries` fetches from psapi and maps NRK's
   shapes into the app's `Series`/`Episode` types via `parseSeries`. It tries the `podcast`
   catalog endpoints first, then falls back to `series` endpoints. "Umbrella" series are
   expanded across their seasons. Each episode needs a second `playback/manifest` call to get
   the actual audio download URL (`getEpisodeWithDownloadLink`).
4. **RSS assembly** `lib/rss.ts` — `rss.assembleFeed` builds the XML via the `serialize-xml`
   library. Episode descriptions get a Vipps donation promo appended
   (`descriptionWithDonationPromotion`). Includes a `podcast:chapters` link pointing at the
   chapters endpoint.
5. **Chapters** `routes/api/feeds/[seriesId]/[episodeId]/chapters.ts` — serves per-episode
   chapter JSON derived from NRK `indexPoints`.

Domain types `Series`, `Episode`, `VippsAgreement` and all persistence live in
`lib/storage.ts`. Storage is **Deno KV** (`Deno.openKv()`), keyed by `[collection, id]`,
with `read`/`write` factories per collection (`series`, `vipps-agreements`). KV has a
**64KB per-value limit**, so `lib/caching.ts` `trimSeriesToSize` recursively drops the
oldest episodes until a series fits. This is why feeds only contain recent episodes, not the
full archive.

The frontend is the search page `routes/index.tsx` (renders `docs/what.md` as markdown via
`$gfm`) plus a Vipps donation island. Donations: `routes/api/trigger-donation/vipps.ts`
creates a recurring agreement via `lib/vipps/vipps.ts` and redirects to Vipps; the
`donations-success`/`-cancel`/`-error` routes handle the return. Vipps config comes entirely
from env vars (see `.env.example`) and `lib/vipps/vipps.ts` throws on startup if any are missing.

## NRK API types

The files `lib/nrk/nrk-catalog.ts`, `nrk-playback.ts`, and `nrk-search.ts` are **generated**
from NRK's OpenAPI specs by `generate-types.ts` (run via `deno task types:nrk`). Don't edit
them by hand. When NRK changes their API, regenerate rather than patching.

## Conventions

- Modules export a single grouped object (e.g. `export const nrkRadio = {...}`,
  `export const storage = {...}`) rather than many loose functions. Internal helpers needed by
  tests are exposed under `export const forTestingOnly = {...}`.
- Tests are co-located (`lib/foo.ts` + `lib/foo.test.ts`) using `Deno.test` and `$std/assert`.
  Use `testUtils.generateSeries` / `generateEpisode` from `lib/test-utils.ts` for fixtures.
- `getHostUrl()` in `lib/utils.ts` resolves the base URL across local / tunnel / Deno Deploy;
  use it instead of hardcoding URLs in anything that ends up in a feed.
- Formatting: 2-space indent, 120 line width (`deno fmt`). Lint uses the `fresh` + `recommended`
  rule sets.
