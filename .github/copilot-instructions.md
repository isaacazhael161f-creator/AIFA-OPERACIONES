# Copilot project instructions for AIFA-OPERACIONES

Guidance for coding agents working inside this repo. Keep edits surgical and respect the existing DOM IDs/events—they are used heavily across modules.

## Platform & runtimes
- SPA served by `server.js` (Express + static root). Run locally with `npm start` and browse http://localhost:3000 (file:// blocks JSON/CSV fetches; the UI warns but still renders partials).
- Front-end stack: vanilla JS + Bootstrap + Chart.js. Most logic lives in `script.js`; section-specific helpers reside under `js/`.
- Data lives in `data/` JSON files and `data/master/` CSV catalogs. The server forces `Cache-Control: no-store`, so `fetch` always sees fresh disk edits.

## Data & analytics model
- `data/aviacion_analytics.json` is the single source of truth for yearly/monthly aviation KPIs. `setAviationAnalyticsDatasetFromPayload` normalizes it, stores the signature, and calls `syncOperationsDataFromAnalyticsDataset` so both the Operations summary tab and the dedicated Aviación tabs stay in sync.
- Auto-refresh: `startAviationAnalyticsAutoRefresh` polls every 2 min and re-renders via `rerenderAviationAnalyticsModules(true)` + `renderOperacionesTotales()`. If you add new consumers, hook into that same pipeline.
- Weekly drilldowns come from the hard-coded `WEEKLY_OPERATIONS_DATASETS` catalog; update it when a new week closes.

## Front-end structure
- `index.html` contains all sections (`*-section`) and tab panes. Navigation is driven by data attributes in `js/navigation.js`.
- `renderOperacionesTotales()` builds the “Operaciones Totales” charts/summary using `staticData`, which is now kept in sync with analytics. Destroy existing Chart.js instances before drawing new ones; reuse `destroyOpsCharts()` and `applyOpsTooltipsStateToCharts()` helpers.
- The Aviación Commercial/General/Carga tabs rely on `AVIATION_ANALYTICS_UI` configs. When adding controls, update the config (select IDs, summary containers, etc.) and the switch logic inside `renderAviationAnalyticsModule`.

## Other key areas
- Manifiestos tooling lives in `js/manifiestos.js` (OCR via PDF.js/Tesseract, localStorage persistence, catalog pickers). Preserve element IDs (`mf-*`) and helper contracts such as `_mfAttachCatalogButton` and `applyManifestDirection`.
- Custom Parte de Operaciones capture is stored in `data/custom_parte_operaciones.json` through the Express API (`/api/parte-operaciones/custom`). Respect the sanitizers in `server.js` when adjusting payloads.
- Authentication/UI gating runs client-side. Password hashes are generated at boot (`ensureAuthHashes()`); do not reintroduce plain-text secrets.

## Tooling & tests
- Install deps once (`npm install`). Run unit tests with `npm test` (Jest + jsdom; current coverage targets manifest catalog initialization).
- Chart or navigation regressions are easiest to spot by running the dev server and watching the browser console—`renderOperacionesTotales` and analytics modules log warnings if redraws fail.

