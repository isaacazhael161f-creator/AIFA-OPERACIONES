/**
 * Divide update_agenda_2026.sql en archivos pequeños para Supabase SQL Editor
 * - Archivo 00: solo ALTER TABLE + CREATE UNIQUE INDEX (schema)
 * - Archivos 01-NN: lotes de 50 UPSERT por archivo (~450 KB c/u)
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const INPUT  = path.join(ROOT, 'update_agenda_2026.sql');
const OUTDIR = path.join(ROOT, 'sql_chunks');

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

const content = fs.readFileSync(INPUT, 'utf8');

// ── Separar el bloque de schema (PASOS 1 y 2) ───────────────────────
const paso3marker = '-- PASO 3: UPSERT';
const paso3idx    = content.indexOf(paso3marker);
const schemaBlock = content.slice(0, paso3idx).trimEnd();
const upsertBlock = content.slice(paso3idx);

// ── Extraer sentencias individuales (separadas por línea vacía tras el ;) ─
// Cada UPSERT empieza con "-- [N] Emp:"
const upsertStatements = [];
const regex = /-- \[\d+\] Emp:[\s\S]+?;\n/g;
let m;
while ((m = regex.exec(upsertBlock)) !== null) {
  upsertStatements.push(m[0]);
}

console.log(`Total UPSERT encontrados: ${upsertStatements.length}`);

// ── Escribir archivo 00 (schema) ─────────────────────────────────────
const file00 = path.join(OUTDIR, 'agenda_2026_00_schema.sql');
fs.writeFileSync(file00, schemaBlock + '\n', 'utf8');
console.log(`✓ agenda_2026_00_schema.sql  (${(fs.statSync(file00).size/1024).toFixed(1)} KB)`);

// ── Dividir en lotes de 50 ───────────────────────────────────────────
const BATCH = 50;
const total  = upsertStatements.length;
const numFiles = Math.ceil(total / BATCH);

for (let i = 0; i < numFiles; i++) {
  const chunk = upsertStatements.slice(i * BATCH, (i + 1) * BATCH);
  const from  = i * BATCH + 1;
  const to    = Math.min((i + 1) * BATCH, total);

  const header = [
    '-- =================================================================',
    `-- agenda_2026 — UPSERT lote ${String(i+1).padStart(2,'0')}/${numFiles}`,
    `-- Colaboradores ${from} al ${to} de ${total}`,
    `-- Ejecutar DESPUÉS de agenda_2026_00_schema.sql`,
    '-- =================================================================',
    '',
  ].join('\n');

  const footer = `\n-- FIN lote ${i+1}/${numFiles} — registros ${from}-${to}\n`;

  const filename = `agenda_2026_${String(i+1).padStart(2,'0')}_data.sql`;
  const filepath = path.join(OUTDIR, filename);
  fs.writeFileSync(filepath, header + chunk.join('\n') + footer, 'utf8');
  const kb = (fs.statSync(filepath).size / 1024).toFixed(1);
  console.log(`✓ ${filename}  (${kb} KB, ${chunk.length} registros)`);
}

console.log(`\n✅ ${numFiles + 1} archivos generados en: sql_chunks/`);
console.log('   Orden de ejecución en Supabase SQL Editor:');
console.log('   1. agenda_2026_00_schema.sql');
for (let i = 1; i <= numFiles; i++) {
  console.log(`   ${i+1}. agenda_2026_${String(i).padStart(2,'0')}_data.sql`);
}
