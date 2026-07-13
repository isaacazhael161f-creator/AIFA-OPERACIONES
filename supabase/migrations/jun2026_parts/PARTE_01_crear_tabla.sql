-- ============================================================
-- MIGRACION 002: Tabla Manifiestos Junio 2026
-- 4589 registros de la hoja DATA
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS "Manifiestos Junio 2026" (
    id              bigserial PRIMARY KEY,
    created_at      timestamptz DEFAULT now(),
    "MES"                                       text,
    "FECHA"                                     text,
    "TIPO DE MANIFIESTO"                        text,
    "TIPO DE OPERACION"                         text,
    "AEROLINEA"                                 text,
    "# DE VUELO"                                numeric,
    "DESTINO / ORIGEN"                          text,
    "AERONAVE"                                  text,
    "MATRICULA"                                 text,
    "ESTATUS MATRICULA"                         text,
    "SLOT ASIGNADO"                             text,
    "SLOT COORDINADO"                           text,
    "HR DE INICIO O TERMINO DE PERNOCTA"        text,
    "HR DE EMBARQUE O DESEMBARQUE"              text,
    "HR DE OPERACION"                           text,
    "HR MAXIMA DE ENTREGA"                      text,
    "HR DE RECEPCION"                           text,
    "HRS CUMPLIDAS"                             numeric,
    "PUNTUALIDAD CANCELACION"                   text,
    "TOTAL PAX"         numeric DEFAULT 0,
    "DIPLOMATICOS"      numeric DEFAULT 0,
    "EN COMISION"       numeric DEFAULT 0,
    "INFANTES"          numeric DEFAULT 0,
    "TRANSITOS"         numeric DEFAULT 0,
    "CONEXIONES"        numeric DEFAULT 0,
    "OTROS EXENTOS"     numeric DEFAULT 0,
    "TOTAL EXENTOS"     numeric DEFAULT 0,
    "PAX QUE PAGAN TUA" numeric DEFAULT 0,
    "KGS DE EQUIPAJE"   numeric DEFAULT 0
);

ALTER TABLE "Manifiestos Junio 2026" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read_mj26"   ON "Manifiestos Junio 2026" FOR SELECT USING (true);
CREATE POLICY "allow_insert_mj26" ON "Manifiestos Junio 2026" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_delete_mj26" ON "Manifiestos Junio 2026" FOR DELETE TO authenticated USING (true);
GRANT SELECT ON "Manifiestos Junio 2026" TO anon;
GRANT SELECT, INSERT, DELETE ON "Manifiestos Junio 2026" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "Manifiestos Junio 2026_id_seq" TO authenticated;