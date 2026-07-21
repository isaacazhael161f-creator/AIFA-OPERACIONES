/**
 * gen_fresh.js — Generador SQL para agenda_2026
 * Versión limpia desde cero — 2026-07-21
 *
 * Genera archivos SQL en sql_fresh/ para:
 *   1. Diagnosticar el estado actual de la tabla
 *   2. Hacer UPSERT de los 459 colaboradores activos del Excel
 *   3. Validar el resultado final
 *
 * Requisitos previos en Supabase (ya ejecutados):
 *   - agenda_2026_00_schema.sql        → columnas Dir. Orgánica, RUSP, índice único
 *   - agenda_2026_00b_rename_cols.sql  → renombró columnas con \n a espacio simple
 *
 * Mapeo de columnas Excel → DB:
 *   - Todos los headers normalizan \r\n a espacio simple y colapsan espacios múltiples
 *   - Excepción: "Sueldo Bruto" → "Sueldo_Bruto" (la DB usa guión bajo)
 */

'use strict';

const xlsx = require('xlsx');
const fs   = require('fs');
const path = require('path');

// ── Rutas ────────────────────────────────────────────────────────────
const ROOT    = path.resolve(__dirname, '..');
const INPUT   = path.join(ROOT, 'Agenda 2026.xlsx');
const OUT_DIR = path.join(ROOT, 'sql_fresh');
const CHUNK   = 50; // registros por archivo

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Leer Excel ───────────────────────────────────────────────────────
const wb  = xlsx.readFile(INPUT);
const ws  = wb.Sheets['Activos'];
if (!ws) throw new Error('Hoja "Activos" no encontrada en el Excel');

const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });
// raw[0] = fila de números (ignorar)
// raw[1] = encabezados
// raw[2+] = datos
const HEADERS  = raw[1];
const DATA     = raw.slice(2);

// ── Normalización de nombres ─────────────────────────────────────────
/**
 * Normaliza un encabezado del Excel al nombre de columna en la DB.
 * Pasos:
 *   1. \r\n, \r, \n  → espacio
 *   2. múltiples espacios → espacio simple
 *   3. trim
 *   4. Mapeo especial si aplica
 */
function toDbCol(excelHeader) {
  if (!excelHeader) return null;
  const normalized = String(excelHeader)
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Excepciones: nombre en Excel ≠ nombre en DB
  if (normalized === 'Sueldo Bruto') return 'Sueldo_Bruto';

  return normalized;
}

// ── Columnas con fecha serial de Excel (índice 0-based) ──────────────
const DATE_COLS = new Set([
  2,   // Fecha de alta
  20,  // Anexo A Fecha de activación
  22,  // Anexo B Fecha de activación
  25,  // Fecha de nacimiento
  59,  // Vigencia de la TIA
  66,  // Cumpleaños
]);

// ── Columnas numéricas (sin comillas en SQL) ─────────────────────────
const NUM_COLS = new Set([
  3,   // Sueldo Bruto → Sueldo_Bruto
  4,   // Plaza
  17,  // Amonestaciones
  23,  // Antigüedad
  24,  // Días de vacaciones disponibles
  65,  // Edad
]);

// ── Valores que deben tratarse como NULL ─────────────────────────────
const NULL_STRINGS = new Set(['', '----', '#n/d', 'n/a', 'na', '#value!', '#ref!']);

// ── Convertir serial de fecha Excel → 'YYYY-MM-DD' ──────────────────
function serialToISO(serial) {
  if (typeof serial !== 'number' || serial < 1) return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  const y  = d.getUTCFullYear();
  const m  = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ── Escapar comillas simples para SQL ────────────────────────────────
function esc(v) { return String(v).replace(/'/g, "''"); }

// ── Convertir valor de celda a literal SQL ───────────────────────────
function toSql(colIdx, val) {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val).trim();
  if (NULL_STRINGS.has(str.toLowerCase())) return 'NULL';

  // Fecha serial de Excel
  if (DATE_COLS.has(colIdx)) {
    const iso = serialToISO(val);
    return iso ? `'${iso}'` : 'NULL';
  }

  // Numérico
  if (NUM_COLS.has(colIdx)) {
    const n = Number(val);
    return isNaN(n) ? `'${esc(str)}'` : String(n);
  }

  // Texto
  return `'${esc(str)}'`;
}

// ── Localizar columna "No. Empleado" ────────────────────────────────
const EMP_IDX = HEADERS.findIndex(h => toDbCol(h) === 'No. Empleado');
if (EMP_IDX === -1) throw new Error('Columna "No. Empleado" no encontrada en el Excel');

// ── Filtrar colaboradores activos (no VACANTE, con número) ──────────
const ACTIVOS = DATA.filter(row => {
  const v = row[EMP_IDX];
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== '' && s.toUpperCase() !== 'VACANTE';
});

const OMITIDOS = DATA.length - ACTIVOS.length;
console.log(`\nExcel → ${DATA.length} filas totales`);
console.log(`  Activos:  ${ACTIVOS.length}`);
console.log(`  Omitidos: ${OMITIDOS} (VACANTE o sin número)\n`);

// ── Generar sentencia UPSERT para un colaborador ─────────────────────
function upsertSQL(row, seq) {
  const empNum = String(row[EMP_IDX]).trim();
  const nombre = row[1] ? String(row[1]).trim() : '?';

  const insertCols = [];
  const insertVals = [];
  const updateSets = [];

  HEADERS.forEach((h, i) => {
    if (!h) return;
    const dbCol  = toDbCol(h);
    if (!dbCol)  return;

    const quoted = `"${dbCol.replace(/"/g, '""')}"`;
    const lit    = toSql(i, row[i]);

    insertCols.push(quoted);
    insertVals.push(lit);

    // El campo clave no se actualiza en el ON CONFLICT
    if (dbCol !== 'No. Empleado') {
      // COALESCE: conserva valor existente si el nuevo es NULL
      updateSets.push(`  ${quoted} = COALESCE(EXCLUDED.${quoted}, ${quoted})`);
    }
  });

  return [
    `-- [${seq}] No. Empleado: ${empNum}  |  ${nombre}`,
    'INSERT INTO public.agenda_2026 (',
    '  ' + insertCols.join(',\n  '),
    ') VALUES (',
    '  ' + insertVals.join(',\n  '),
    ') ON CONFLICT ("No. Empleado") DO UPDATE SET',
    updateSets.join(',\n') + ';',
    '',
  ].join('\n');
}

// ── Archivo 00: Diagnóstico previo ───────────────────────────────────
const DIAG = `-- =================================================================
-- DIAGNÓSTICO: Verificar estado de agenda_2026 ANTES de cargar datos
-- Ejecutar primero para confirmar que la estructura es correcta
-- =================================================================

-- 1) Total de colaboradores ya en la tabla
SELECT COUNT(*) AS total_actual FROM public.agenda_2026;

-- 2) Columnas actuales (ordenadas por posición)
SELECT ordinal_position        AS pos,
       column_name             AS columna,
       data_type               AS tipo
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
ORDER  BY ordinal_position;

-- 3) Verificar columnas críticas para el UPSERT
--    Todas deben aparecer en el resultado; si falta alguna, no ejecutes los _data.sql
SELECT column_name
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
  AND  column_name IN (
    'No. Empleado',
    'Sueldo_Bruto',
    'Dir. Orgánica',
    'RUSP',
    'Licencia Vigencia',
    'Anexo "A" Turno especial',
    'Anexo "A"  Fecha de activación',
    'Anexo "B" Riesgos',
    'Anexo "B"  Fecha de activación',
    'Contacto de emergencia 1 Nombre completo',
    'Contacto de emergencia 2 Nombre completo'
  )
ORDER  BY column_name;

-- 4) Verificar índice único (necesario para ON CONFLICT)
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  schemaname = 'public'
  AND  tablename  = 'agenda_2026'
  AND  indexname  = 'agenda_2026_num_empleado_unique';

-- 5) Verificar que NO haya columnas con salto de línea (deben ser 0)
SELECT COUNT(*) AS columnas_con_newline
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
  AND  column_name LIKE '%' || chr(10) || '%';
`;

fs.writeFileSync(path.join(OUT_DIR, '00_diagnostico.sql'), DIAG, 'utf8');
console.log('✓ 00_diagnostico.sql');

// ── Archivos de datos (chunks) ───────────────────────────────────────
const TOTAL_CHUNKS = Math.ceil(ACTIVOS.length / CHUNK);

for (let c = 0; c < TOTAL_CHUNKS; c++) {
  const start   = c * CHUNK;
  const end     = Math.min(start + CHUNK, ACTIVOS.length);
  const slice   = ACTIVOS.slice(start, end);
  const fileNum = String(c + 1).padStart(2, '0');

  const lines = [];
  lines.push('-- =================================================================');
  lines.push(`-- agenda_2026 — UPSERT lote ${fileNum}/${TOTAL_CHUNKS}`);
  lines.push(`-- Colaboradores ${start + 1} al ${end} de ${ACTIVOS.length}`);
  lines.push('-- Estrategia: ON CONFLICT ("No. Empleado") DO UPDATE');
  lines.push('--   COALESCE: si el Excel tiene NULL, conserva el valor actual del DB');
  lines.push('-- =================================================================');
  lines.push('');

  slice.forEach((row, i) => {
    lines.push(upsertSQL(row, start + i + 1));
  });

  lines.push(`-- ── Validación lote ${fileNum} ──────────────────────────────────────`);
  lines.push(`SELECT COUNT(*) AS total_en_tabla FROM public.agenda_2026;`);
  lines.push(`-- FIN lote ${fileNum}/${TOTAL_CHUNKS} — ${end - start} registros procesados`);

  const content  = lines.join('\n');
  const filePath = path.join(OUT_DIR, `${fileNum}_data.sql`);
  fs.writeFileSync(filePath, content, 'utf8');

  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`✓ ${fileNum}_data.sql  (${sizeKB} KB | ${end - start} registros)`);
}

// ── Archivo de validación final ──────────────────────────────────────
const VALIDACION = `-- =================================================================
-- VALIDACIÓN FINAL: Ejecutar después de todos los lotes de datos
-- =================================================================

-- 1) Total de colaboradores cargados
SELECT COUNT(*) AS total_colaboradores FROM public.agenda_2026;
-- Esperado: 459

-- 2) Colaboradores con Dir. Orgánica llena (columna nueva)
SELECT COUNT(*) AS con_dir_organica
FROM public.agenda_2026
WHERE "Dir. Orgánica" IS NOT NULL AND "Dir. Orgánica" <> '';

-- 3) Colaboradores con RUSP lleno (columna nueva)
SELECT COUNT(*) AS con_rusp
FROM public.agenda_2026
WHERE "RUSP" IS NOT NULL AND "RUSP" <> '';

-- 4) Registros duplicados por No. Empleado (debe ser 0)
SELECT "No. Empleado", COUNT(*) AS ocurrencias
FROM public.agenda_2026
GROUP BY "No. Empleado"
HAVING COUNT(*) > 1;

-- 5) Registros sin nombre (debe ser 0)
SELECT COUNT(*) AS sin_nombre
FROM public.agenda_2026
WHERE "Nombre" IS NULL OR "Nombre" = '';

-- 6) Últimos 10 colaboradores insertados/modificados
SELECT "No. Empleado", "Nombre", "Dir. Orgánica", "RUSP"
FROM public.agenda_2026
ORDER BY "No. Empleado" DESC
LIMIT 10;
`;

fs.writeFileSync(path.join(OUT_DIR, 'validacion_final.sql'), VALIDACION, 'utf8');
console.log('✓ validacion_final.sql');

// ── Resumen ──────────────────────────────────────────────────────────
console.log(`\n✅ Archivos generados en: sql_fresh/`);
console.log(`   Orden de ejecución en Supabase SQL Editor:`);
console.log(`   1. 00_diagnostico.sql      ← verificar estructura ANTES`);
for (let c = 1; c <= TOTAL_CHUNKS; c++) {
  console.log(`   ${c + 1}. ${String(c).padStart(2,'0')}_data.sql`);
}
console.log(`   ${TOTAL_CHUNKS + 2}. validacion_final.sql    ← verificar resultado DESPUÉS`);
console.log(`\n   IMPORTANTE: copiar desde disco, no desde el editor VS Code`);
console.log(`   Usa PowerShell: Get-Content sql_fresh\\01_data.sql -Raw | Set-Clipboard`);
