/**
 * import_bhs_dashboard.js
 * ──────────────────────────────────────────────────────────────────────────
 * Bulk-imports all BHS Excel files from  dashboard/dashboard/  into Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=<key> node scripts/import_bhs_dashboard.js
 *   SUPABASE_SERVICE_KEY=<key> node scripts/import_bhs_dashboard.js --dry-run
 *   SUPABASE_SERVICE_KEY=<key> node scripts/import_bhs_dashboard.js --date 2026-01-15
 *   SUPABASE_SERVICE_KEY=<key> node scripts/import_bhs_dashboard.js --month 2026-06
 *   SUPABASE_SERVICE_KEY=<key> node scripts/import_bhs_dashboard.js --type arrivals
 *
 * Get your service_role key from: Supabase Dashboard → Settings → API → service_role
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase config ──────────────────────────────────────────────────────
// Provide SUPABASE_SERVICE_KEY env var (service_role key from Supabase dashboard
// Settings → API) so the script can bypass RLS. If omitted, falls back to the
// anon key (will fail on tables that require authentication to insert).
const SUPABASE_URL          = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';
const SUPABASE_KEY          = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const supabase              = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Paths ────────────────────────────────────────────────────────────────
const DASHBOARD_ROOT = path.join(__dirname, '..', 'dashboard', 'dashboard');

// ── CLI flags ────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const ONLY_DATE   = args.includes('--date')  ? args[args.indexOf('--date')  + 1] : null;
const ONLY_MONTH  = args.includes('--month') ? args[args.indexOf('--month') + 1] : null;
const ONLY_TYPE   = args.includes('--type')  ? args[args.indexOf('--type')  + 1] : null;

// ── Month name → zero-padded number ──────────────────────────────────────
const MONTH_MAP = {
  JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06',
  JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12'
};

// ── Parse date from filename (e.g.  "ARRIVALS - 01JAN.xlsx" → "2026-01-01") ──
function parseDateFromFilename(filename) {
  // Match pattern: two digits + 3-letter month abbreviation
  const m = String(filename).toUpperCase().match(/(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/);
  if (!m) return null;
  const day   = m[1];
  const month = MONTH_MAP[m[2]];
  // All files in this dataset are 2026
  return `2026-${month}-${day}`;
}

// ── Determine BHS type from filename ────────────────────────────────────
function typeFromFilename(filename) {
  const u = String(filename).toUpperCase();
  if (u.startsWith('ARRIVALS'))         return 'arrivals';
  if (u.startsWith('DEPARTURES'))       return 'departures';
  if (u.startsWith('BAGSW') || u.startsWith('BAGSWITHOUTFLIGHT')) return 'bwf';
  return null;
}

// ── Collect all .xlsx files recursively ──────────────────────────────────
function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) { console.error('Folder not found:', dir); process.exit(1); }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (entry.name.toLowerCase().endsWith('.xlsx') || entry.name.toLowerCase().endsWith('.xls')) {
      results.push(full);
    }
  }
  return results;
}

// ── Excel helpers (mirrors browser bhsProcess logic) ────────────────────
const HDR_KEYWORDS = ['cia','vuelo','flight','tag','hora','plat','dest','proc',
                      'term','tras','maleta','origen','destino','compan','primera','ultima','etd'];

function norm(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findHeader(rawRows) {
  let bestIdx = 0, bestScore = -1;
  for (let ri = 0; ri < Math.min(rawRows.length, 15); ri++) {
    let score = 0;
    for (const cell of rawRows[ri]) {
      const c = norm(String(cell));
      HDR_KEYWORDS.forEach(kw => { if (c.includes(kw)) score += 3; });
      if (c.length > 1 && c.length < 40) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestIdx = ri; }
  }
  return bestIdx;
}

function findCol(row, candidates) {
  const keys = Object.keys(row);
  for (const c of candidates)
    for (const k of keys)
      if (norm(k) === norm(c) || norm(k).includes(norm(c))) return k;
  return null;
}

function cellTime(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toTimeString().slice(0, 5);
  const s = String(v).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) return s.slice(0, 5);
  return null;
}

function timeToMinutes(t) {
  if (!t) return null;
  const parts = String(t).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// ── Parse functions (identical logic to browser) ─────────────────────────
function parseArrivals(rows, fecha) {
  return rows.map(r => {
    const cComp  = findCol(r, ['compania','company','aerolinea','airline','cia']);
    const cProc  = findCol(r, ['procedencia','origen','origin','proc']);
    const cPlat  = findCol(r, ['plat','posicion','stand','gate']);
    const cVuelo = findCol(r, ['vuelo','flight','flt','nro']);
    const cTotal = findCol(r, ['total','total_maletas','bags','maletas']);
    const cTerm  = findCol(r, ['terminacion','term','local','dest']);
    const cTras  = findCol(r, ['tras','transito','transit','transfer']);
    const cHora  = findCol(r, ['hora','sta','eta','arrival','llegada','hora_llegada','hora llegada','arr','scheduled']);
    return {
      fecha,
      vuelo:         cVuelo ? String(r[cVuelo]).trim() : '',
      compania:      cComp  ? String(r[cComp]).trim().toUpperCase() : '',
      procedencia:   cProc  ? String(r[cProc]).trim().toUpperCase() : '',
      plat:          cPlat  ? String(r[cPlat]).trim() : '',
      total_maletas: parseInt(r[cTotal]) || 0,
      terminacion:   parseInt(r[cTerm])  || 0,
      tras:          parseInt(r[cTras])  || 0,
    };
  }).filter(r => r.compania);
}

function parseDepartures(rows, fecha) {
  return rows.map(r => {
    const cComp    = findCol(r, ['compania','company','aerolinea','airline','cia']);
    const cVuelo   = findCol(r, ['vuelo','flight','flt','nro']);
    const cHora    = findCol(r, ['hora','hora_prog','scheduled','std','sched']);
    const cDest    = findCol(r, ['destino','dest','destination']);
    const cPlat    = findCol(r, ['plat','posicion','stand','gate']);
    const cPrimera = findCol(r, ['1a','primera','first','1ª','1a maleta','primera maleta']);
    const cUltima  = findCol(r, ['ultima','last','ult','última','ultima maleta']);
    const cEtd     = findCol(r, ['etd','estimated','est']);

    const horaProg = cellTime(cHora    ? r[cHora]    : null);
    const primera  = cellTime(cPrimera ? r[cPrimera] : null);
    const ultima   = cellTime(cUltima  ? r[cUltima]  : null);
    const etd      = cellTime(cEtd     ? r[cEtd]     : null);

    let minPrimera = null, minUltima = null;
    if (horaProg && primera)
      minPrimera = timeToMinutes(horaProg) - timeToMinutes(primera);
    if (etd && ultima)
      minUltima = timeToMinutes(etd) - timeToMinutes(ultima);
    else if (horaProg && ultima)
      minUltima = timeToMinutes(horaProg) - timeToMinutes(ultima);

    return {
      fecha,
      vuelo:               cVuelo ? String(r[cVuelo]).trim() : '',
      compania:            cComp  ? String(r[cComp]).trim().toUpperCase() : '',
      hora_programada:     horaProg,
      destino:             cDest  ? String(r[cDest]).trim().toUpperCase() : '',
      plat:                cPlat  ? String(r[cPlat]).trim() : '',
      primera_maleta:      primera,
      ultima_maleta:       ultima,
      etd,
      min_anticip_primera: minPrimera,
      min_anticip_ultima:  minUltima,
    };
  }).filter(r => r.compania);
}

// Tag prefix → IATA
const TAG_PREFIX = {
  '3139':'AM','0036':'Y4','0333':'VB','3713':'XN','0181':'DM','0723':'ZV'
};
function iataFromTag(tag) {
  const t = String(tag).replace(/\D/g, '');
  for (const [pfx, iata] of Object.entries(TAG_PREFIX))
    if (t.startsWith(pfx)) return iata;
  return '';
}

function parseBWF(rows, fecha) {
  return rows.map(r => {
    const cTag    = findCol(r, ['tag','etiqueta','label','bag tag']);
    const cComp   = findCol(r, ['compania','company','aerolinea','airline','cia']);
    const cVuelo  = findCol(r, ['vuelo','flight','flt','nro']);
    const cOrigen = findCol(r, ['origen','origin','proc','from']);
    const cDest   = findCol(r, ['destino','dest','destination','to']);
    const tagVal  = cTag ? String(r[cTag]).trim() : '';
    let compRaw   = cComp ? String(r[cComp]).trim() : '';
    if (!compRaw) compRaw = iataFromTag(tagVal);
    return {
      fecha,
      tag:      tagVal,
      compania: compRaw.toUpperCase(),
      vuelo:    cVuelo  ? String(r[cVuelo]).trim()  : '',
      origen:   cOrigen ? String(r[cOrigen]).trim().toUpperCase() : '',
      destino:  cDest   ? String(r[cDest]).trim().toUpperCase()   : '',
    };
  }).filter(r => r.tag || r.compania);
}

// ── Read and parse a single Excel file ───────────────────────────────────
function readExcel(filePath, type, fecha) {
  const buf = fs.readFileSync(filePath);
  const wb  = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!raw.length) return [];

  const hdrIdx  = findHeader(raw);
  const headers = raw[hdrIdx].map(h => String(h).trim());
  const rows    = [];
  for (let i = hdrIdx + 1; i < raw.length; i++) {
    const dr = raw[i];
    if (dr.every(c => String(c).trim() === '')) continue;
    const obj = {};
    headers.forEach((h, ci) => { obj[h] = dr[ci] !== undefined ? dr[ci] : ''; });
    rows.push(obj);
  }

  if (type === 'arrivals')   return parseArrivals(rows, fecha);
  if (type === 'departures') return parseDepartures(rows, fecha);
  return parseBWF(rows, fecha);
}

// ── Save to Supabase (delete-then-insert, batched 500) ───────────────────
const TABLE = { arrivals: 'bhs_arrivals', departures: 'bhs_departures', bwf: 'bhs_bags_without_flight' };

async function saveToDB(type, fecha, records) {
  const table = TABLE[type];
  const { error: delErr } = await supabase.from(table).delete().eq('fecha', fecha);
  if (delErr) throw new Error(`Delete error (${table}, ${fecha}): ${delErr.message}`);
  if (!records.length) return 0;
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from(table).insert(records.slice(i, i + 500));
    if (error) throw new Error(`Insert error (${table}, ${fecha}): ${error.message}`);
  }
  return records.length;
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🧳  BHS Dashboard Importer  ${DRY_RUN ? '[DRY-RUN — no DB writes]' : ''}`);
  console.log(`   Source: ${DASHBOARD_ROOT}`);
  if (!DRY_RUN && !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('\n⚠  WARNING: SUPABASE_SERVICE_KEY env var not set.');
    console.warn('   BHS tables require the service_role key to bypass RLS.');
    console.warn('   Get it from: Supabase Dashboard → Settings → API → service_role\n');
    console.warn('   Run as: $env:SUPABASE_SERVICE_KEY="<key>" ; node scripts/import_bhs_dashboard.js\n');
  }
  console.log();

  const allFiles = collectFiles(DASHBOARD_ROOT);
  const tasks    = [];

  for (const fullPath of allFiles) {
    const filename = path.basename(fullPath);
    const type     = typeFromFilename(filename);
    const fecha    = parseDateFromFilename(filename);

    if (!type)  { console.warn(`  ⚠ Skipping (unknown type): ${filename}`); continue; }
    if (!fecha) { console.warn(`  ⚠ Skipping (no date):      ${filename}`); continue; }

    // CLI filters
    if (ONLY_DATE  && fecha !== ONLY_DATE)            continue;
    if (ONLY_MONTH && !fecha.startsWith(ONLY_MONTH))  continue;
    if (ONLY_TYPE  && type  !== ONLY_TYPE)             continue;

    tasks.push({ fullPath, filename, type, fecha });
  }

  // Sort by date asc, then type for clean output
  tasks.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.type.localeCompare(b.type));

  if (!tasks.length) { console.log('No files matched the given filters.'); return; }

  console.log(`Found ${tasks.length} file(s) to process.\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const { fullPath, filename, type, fecha } of tasks) {
    process.stdout.write(`  [${fecha}] ${type.padEnd(12)} ${filename.padEnd(40)} `);
    try {
      const records = readExcel(fullPath, type, fecha);
      if (!records.length) {
        console.log('0 records — skipped');
        skipped++;
        continue;
      }
      if (DRY_RUN) {
        console.log(`${records.length} records (dry-run)`);
        ok++;
        continue;
      }
      const saved = await saveToDB(type, fecha, records);
      console.log(`✓ ${saved} records`);
      ok++;
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  ✓ OK:      ${ok}`);
  console.log(`  – Skipped: ${skipped}`);
  console.log(`  ✗ Failed:  ${failed}`);
  console.log(`─────────────────────────────────────────────\n`);

  if (failed) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
