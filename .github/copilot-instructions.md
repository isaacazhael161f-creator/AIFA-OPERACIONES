# Copilot project instructions for AIFA-OPERACIONES

Use these notes to be productive immediately in this repo. Keep changes small and follow the existing patterns and IDs.

## Architecture and data flow
- Single-page web app served statically by Express (`server.js`). Start locally with `npm start` and open http://localhost:3000. Do not use file:// (fetch of CSV/JSON will fail); UI shows a warning if file:// is detected.
- Front-end is vanilla JS + Bootstrap + Chart.js + ECharts. Entry HTML is `index.html` which loads modular scripts from `js/`.
- Data catalogs live in `data/` (JSON) and `data/master/` (CSV). UI modules fetch these files directly via `fetch()` (no API). Avoid caching; server sets `Cache-Control: no-store`.
- Heavy module: `js/manifiestos.js` (OCR, PDF preview, catalogs, form logic). It relies on:
  - PDF.js from CDN with fallback to `vendor/pdfjs/`
  - Tesseract.js (OCR) via CDN (scheduler prewarmed)
  - LocalStorage for persisting saved manifest rows (no backend write path yet)

## Key UI modules
- `js/navigation.js` swaps content sections. Sections are declared in index.html as section elements with IDs ending in "-section" (for example, inicio-section, manifiestos-section).
- `js/inicio.js`, `js/itinerario.js`, `js/operaciones.js`, `js/puntualidad.js`, `js/fauna.js`, etc., build specific views from CSV/JSON.
- Manifiestos (forms + OCR): all logic in `js/manifiestos.js`, orchestrated by `window.setupManifestsUI()` which is invoked on load (script tag at bottom of `index.html`). Most field behaviors are ID-driven.

## Project conventions
- Keep DOM IDs stable; logic in `manifiestos.js` binds by IDs (e.g., `mf-tail`, `mf-aircraft`, `mf-flight-type`).
- Time inputs are text fields in 24h format HH:MM. There is a custom time picker and an NA toggle created in code; use `_mfTimeFieldIds` for new time fields.
- Catalog pickers: `_mfAttachCatalogButton(id, {load, onPick})` adds a small search popup for fields backed by a CSV catalog (aircraft, airlines, airports). See existing calls in `setupManifestsUI()` for patterns.
- CSV parsing: lightweight, quote-aware parsers exist inside modules. When adding a new CSV-backed UI, copy the tiny parser used nearby to avoid global utility churn.
- Service Worker is force-disabled in development (`index.html` scripts). Don’t add SW features without coordinating the dev guard.

## Typical workflows
- Dev server: `npm start` (or `npm run dev`). This serves the repo root and falls back to `index.html` for routes.
- PDFs: prefer CDN for PDF.js; if offline, the app falls back to `vendor/pdfjs/` artifacts already in the repo.
- OCR: uses Tesseract.js `spa+eng` via a scheduler; keep OCR progress messages short. Use `ensureOcrScheduler()` if you create new OCR flows.
- Saving manifests: `Guardar` writes an array to `localStorage` key `aifa.manifests`; the summary table reads from there. No backend persistence yet.

## Patterns you should follow (with examples)
- Populate catalogs from CSV under `data/master/` and bind UI:
  - Example: aircraft/airlines/airports catalogs wired in `setupManifestsUI()`; see `loadAircraftCatalog()` and related `datalist` usage.
  - New catalogs should render user-friendly labels but keep compact codes as values (e.g., store ICAO/IATA/Code; display full name/description).
- Manifiestos form rules for direction:
  - `mf-dir-arr` and `mf-dir-dep` toggle fields with `[data-dir="arrival-only"]` / `[data-dir="departure-only"]`. Use `applyManifestDirection()` after programmatic changes.
- Progress UX:
  - Use `setProgress(p, text)` and the overlay helpers `planeProgressSet/planeProgressHide` when extending scanning flows; never leave the overlay visible.

## Gotchas
- Do not fetch when running under file://; feature code should degrade gracefully if `location.protocol === 'file:'` (existing guards already set warning and disable some buttons).
- Keep external images and PDFs optional; failing assets are replaced by a local default image or placeholder.
- Avoid renaming or removing IDs/classes used across modules (for example: manifiestos-section, manifest-scan-pdf, mf-tail-warning).

## Where to put new code
- Small UI features: extend the relevant `js/*.js` module. For Manifiestos, put new logic inside `setupManifestsUI()` in `js/manifiestos.js`.
- Catalog-backed dropdowns: add loaders like `loadAirlinesCatalog()` and wire change handlers right after existing catalog calls.

