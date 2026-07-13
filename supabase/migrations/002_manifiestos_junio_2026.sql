-- =============================================================================
-- MIGRACIÓN 002: Tabla "Manifiestos Junio 2026"
-- Corresponde al archivo: TUA y REPORTE GENERAL JUNIO 2026.xlsx
-- Hoja: DATA (4 869 filas, 29 columnas)
--
-- INSTRUCCIONES:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Pegar y ejecutar este script completo
-- =============================================================================

-- Si la tabla ya existe (de una ejecución anterior), corregir tipo de # DE VUELO:
ALTER TABLE IF EXISTS "Manifiestos Junio 2026"
    ALTER COLUMN "# DE VUELO" TYPE text USING "# DE VUELO"::text;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS "Manifiestos Junio 2026" (
    id              bigserial PRIMARY KEY,
    created_at      timestamptz DEFAULT now(),
    "MES"           text,
    "FECHA"         text,
    "TIPO DE MANIFIESTO"   text,
    "TIPO DE OPERACIÓN"    text,
    "AEROLINEA"     text,
    "# DE VUELO"    text,
    "DESTINO / ORIGEN" text,
    "AERONAVE"              text,
    "MATRICULA"             text,
    "ESTATUS MATRÍCULA"     text,
    "SLOT ASIGNADO"                         text,
    "SLOT COORDINADO"                       text,
    "HR. DE INICIO O TERMINO DE PERNOCTA"   text,
    "HR. DE EMBARQUE O DESEMBARQUE"         text,
    "HR. DE OPERACIÓN"                      text,
    "HR. MÁXIMA DE ENTREGA"                 text,
    "HR. DE RECEPCIÓN"                      text,
    "HRS. CUMPLIDAS"                        numeric,
    "PUNTUALIDAD / CANCELACIÓN"  text,
    "TOTAL PAX"         numeric DEFAULT 0,
    "DIPLOMATICOS"      numeric DEFAULT 0,
    "EN COMISION"       numeric DEFAULT 0,
    "INFANTES"          numeric DEFAULT 0,
    "TRANSITOS"         numeric DEFAULT 0,
    "CONEXIONES"        numeric DEFAULT 0,
    "OTROS EXENTOS"     numeric DEFAULT 0,
    "TOTAL EXENTOS"     numeric DEFAULT 0,
    "PAX QUE PAGAN TUA" numeric DEFAULT 0,
    "KGS. DE EQUIPAJE"  numeric DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS "idx_mj26_fecha"     ON "Manifiestos Junio 2026" ("FECHA");
CREATE INDEX IF NOT EXISTS "idx_mj26_mes"       ON "Manifiestos Junio 2026" ("MES");
CREATE INDEX IF NOT EXISTS "idx_mj26_aerolinea" ON "Manifiestos Junio 2026" ("AEROLINEA");
CREATE INDEX IF NOT EXISTS "idx_mj26_tipo_man"  ON "Manifiestos Junio 2026" ("TIPO DE MANIFIESTO");
CREATE INDEX IF NOT EXISTS "idx_mj26_tipo_op"   ON "Manifiestos Junio 2026" ("TIPO DE OPERACIÓN");

-- Row Level Security
ALTER TABLE "Manifiestos Junio 2026" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_manifiestos_jun2026"   ON "Manifiestos Junio 2026";
DROP POLICY IF EXISTS "allow_insert_manifiestos_jun2026" ON "Manifiestos Junio 2026";
DROP POLICY IF EXISTS "allow_delete_manifiestos_jun2026" ON "Manifiestos Junio 2026";

CREATE POLICY "allow_read_manifiestos_jun2026"
    ON "Manifiestos Junio 2026" FOR SELECT USING (true);
CREATE POLICY "allow_insert_manifiestos_jun2026"
    ON "Manifiestos Junio 2026" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_delete_manifiestos_jun2026"
    ON "Manifiestos Junio 2026" FOR DELETE TO authenticated USING (true);

-- Permisos
GRANT SELECT                 ON "Manifiestos Junio 2026" TO anon;
GRANT SELECT, INSERT, DELETE ON "Manifiestos Junio 2026" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "Manifiestos Junio 2026_id_seq" TO authenticated;
