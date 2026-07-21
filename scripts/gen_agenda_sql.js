/**
 * Generador SQL: update_agenda_2026.sql
 * Lee la hoja "Activos" de Agenda 2026.xlsx y produce:
 *   1. ALTER TABLE para columnas nuevas
 *   2. UPSERT (INSERT ON CONFLICT DO UPDATE) para cada colaborador activo
 */

const xlsx = require('xlsx');
const fs   = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'Agenda 2026.xlsx');
const OUT   = path.join(ROOT, 'update_agenda_2026.sql');

const wb  = xlsx.readFile(INPUT);
const ws  = wb.Sheets['Activos'];
const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

// Fila 0 = números (ignorar), Fila 1 = encabezados reales, Fila 2+ = datos
const headers  = raw[1];
const dataRows = raw.slice(2);

// ── Conversión fecha Excel serial → YYYY-MM-DD ──────────────────────
function excelDateToISO(serial) {
  if (typeof serial !== 'number' || serial < 1) return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// Índices de columna (0-based) que contienen fechas como seriales de Excel
const DATE_COLS = new Set([
  2,   // Fecha de alta
  20,  // Anexo A Fecha de activación
  22,  // Anexo B Fecha de activación
  25,  // Fecha de nacimiento
  // 30 NO: Vigencia de INE guarda año (ej. 2032), no serial de fecha
  59,  // Vigencia de la TIA  (serial de fecha)
  // 63 NO: Licencia Vigencia guarda texto ("Permanente") o 0
  66,  // Cumpleaños          (serial de fecha)
]);

// Índices numéricos (se emiten sin comillas en SQL)
const NUM_COLS = new Set([
  3,   // Sueldo Bruto
  4,   // Plaza
  17,  // Amonestaciones (contador)
  23,  // Antigüedad (años)
  24,  // Días de vacaciones disponibles
  65,  // Edad
]);

// Escapar apóstrofes para SQL
function esc(v) {
  return String(v).replace(/'/g, "''");
}

// Limpiar nombre de columna: normalizar cualquier espacio/salto de línea a espacio simple
// (después de ejecutar 00b_rename_cols.sql, el DB ya tiene nombres con espacio)
function cleanColName(h) {
  return String(h).replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim();
}

// Construir literal SQL para un valor en columna colIdx
function sqlLiteral(colIdx, val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).trim();
  if (s === '' || s === '----' || s === '#N/D' || s.toUpperCase() === 'N/A') return 'NULL';

  if (DATE_COLS.has(colIdx)) {
    const ds = excelDateToISO(val);
    return ds ? `'${ds}'` : 'NULL';
  }

  if (NUM_COLS.has(colIdx)) {
    const n = Number(val);
    return isNaN(n) ? `'${esc(s)}'` : String(n);
  }

  return `'${esc(s)}'`;
}

// ── Mapeo header → nombre de columna real en la DB ─────────────────
// Excepciones donde el nombre en el DB difiere del header Excel:
function dbColName(h) {
  const c = cleanColName(h);
  // "Sueldo Bruto" en Excel → "Sueldo_Bruto" (guión bajo) en el DB
  if (c === 'Sueldo Bruto') return 'Sueldo_Bruto';
  // Licencia Vigencia: cleanColName deja el \n → coincide con el nombre real del DB
  return c;
}

// Índice de "No. Empleado"
const numColIdx = headers.findIndex(h => h && cleanColName(h) === 'No. Empleado');
if (numColIdx === -1) throw new Error('No se encontró columna "No. Empleado"');

// ── Generar SQL ──────────────────────────────────────────────────────
const lines = [];

lines.push('-- =================================================================');
lines.push('-- ACTUALIZACIÓN: public.agenda_2026');
lines.push('-- Archivo fuente: Agenda 2026.xlsx → hoja "Activos"');
lines.push(`-- Fecha de generación: ${new Date().toISOString().split('T')[0]}`);
lines.push('-- =================================================================');
lines.push('');

// ── PASO 1: Nuevas columnas ──────────────────────────────────────────
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('-- PASO 1: Columnas nuevas detectadas en el archivo actualizado');
lines.push('--   • "Dir. Orgánica"     — Dirección orgánica del colaborador');
lines.push('--   • "RUSP"              — Número RUSP');
lines.push('--   • "Licencia Vigencia" — Vigencia de licencia (renombrada de "Vigencia")');
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('');
lines.push('ALTER TABLE public.agenda_2026');
lines.push('  ADD COLUMN IF NOT EXISTS "Dir. Orgánica"     TEXT,');
lines.push('  ADD COLUMN IF NOT EXISTS "RUSP"              TEXT,');
lines.push('  ADD COLUMN IF NOT EXISTS "Licencia Vigencia" TEXT;');
lines.push('');
lines.push('COMMENT ON COLUMN public.agenda_2026."Dir. Orgánica"     IS \'Dirección orgánica del colaborador\';');
lines.push('COMMENT ON COLUMN public.agenda_2026."RUSP"              IS \'Número de registro RUSP\';');
lines.push('COMMENT ON COLUMN public.agenda_2026."Licencia Vigencia" IS \'Vigencia de licencia de manejo (columna renombrada de "Vigencia")\';');
lines.push('');

// ── PASO 2: Índice único en No. Empleado ────────────────────────────
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('-- PASO 2: Índice único en "No. Empleado" (necesario para ON CONFLICT)');
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('');
lines.push('DO $do$ BEGIN');
lines.push('  IF NOT EXISTS (');
lines.push('    SELECT 1 FROM pg_indexes');
lines.push('    WHERE schemaname = \'public\'');
lines.push('      AND tablename  = \'agenda_2026\'');
lines.push('      AND indexname  = \'agenda_2026_num_empleado_unique\'');
lines.push('  ) THEN');
lines.push('    CREATE UNIQUE INDEX agenda_2026_num_empleado_unique');
lines.push('      ON public.agenda_2026 ("No. Empleado");');
lines.push('  END IF;');
lines.push('END $do$;');
lines.push('');

// ── PASO 3: UPSERT por cada colaborador ─────────────────────────────
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('-- PASO 3: UPSERT — Insertar nuevos / Actualizar existentes');
lines.push('-- Se usa ON CONFLICT ("No. Empleado") DO UPDATE');
lines.push('-- Columnas con valor NULL en el Excel no sobreescriben datos previos');
lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push('');

let processed = 0;
let skipped   = 0;

for (let ri = 0; ri < dataRows.length; ri++) {
  const row    = dataRows[ri];
  const numRaw = row[numColIdx];

  // Omitir VACANTEs y filas sin número de empleado
  if (numRaw === null || numRaw === undefined) { skipped++; continue; }
  const numStr = String(numRaw).trim();
  if (!numStr || numStr.toUpperCase() === 'VACANTE') { skipped++; continue; }

  processed++;

  const nombre = row[1] ? String(row[1]).trim() : 'sin nombre';

  // Construir listas de columnas y valores
  const insertCols = [];
  const insertVals = [];
  const updateSets = [];

  headers.forEach((h, i) => {
    if (!h) return;
    const dbCol = dbColName(h);
    const lit   = sqlLiteral(i, row[i]);

    const quotedCol = `"${dbCol.replace(/"/g, '""')}"`;
    insertCols.push(quotedCol);
    insertVals.push(lit);

    if (dbCol !== 'No. Empleado') {
      // COALESCE: si el nuevo valor no es NULL, usar el nuevo; si es NULL, mantener el actual
      updateSets.push(`  ${quotedCol} = COALESCE(EXCLUDED.${quotedCol}, ${quotedCol})`);
    }
  });

  lines.push(`-- [${processed}] Emp: ${numStr} — ${nombre}`);
  lines.push('INSERT INTO public.agenda_2026 (');
  lines.push('  ' + insertCols.join(',\n  '));
  lines.push(') VALUES (');
  lines.push('  ' + insertVals.join(',\n  '));
  lines.push(') ON CONFLICT ("No. Empleado") DO UPDATE SET');
  lines.push(updateSets.join(',\n') + ';');
  lines.push('');
}

lines.push('-- ─────────────────────────────────────────────────────────────────');
lines.push(`-- FIN: ${processed} colaboradores procesados, ${skipped} filas omitidas (VACANTE/sin número)`);
lines.push('-- =================================================================');

const sql = lines.join('\n');
fs.writeFileSync(OUT, sql, 'utf8');

const stats = fs.statSync(OUT);
console.log(`✓ Archivo generado: update_agenda_2026.sql`);
console.log(`  Colaboradores procesados: ${processed}`);
console.log(`  Filas omitidas (VACANTE): ${skipped}`);
console.log(`  Tamaño del archivo: ${(stats.size / 1024).toFixed(1)} KB`);
