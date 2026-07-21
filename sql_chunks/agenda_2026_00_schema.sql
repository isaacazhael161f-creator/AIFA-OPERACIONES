-- =================================================================
-- ACTUALIZACIÓN: public.agenda_2026
-- Archivo fuente: Agenda 2026.xlsx → hoja "Activos"
-- Fecha de generación: 2026-07-21
-- =================================================================

-- ─────────────────────────────────────────────────────────────────
-- PASO 1: Columnas nuevas detectadas en el archivo actualizado
--   • "Dir. Orgánica"     — Dirección orgánica del colaborador
--   • "RUSP"              — Número RUSP
--   • "Licencia Vigencia" — Vigencia de licencia (renombrada de "Vigencia")
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.agenda_2026
  ADD COLUMN IF NOT EXISTS "Dir. Orgánica"     TEXT,
  ADD COLUMN IF NOT EXISTS "RUSP"              TEXT,
  ADD COLUMN IF NOT EXISTS "Licencia Vigencia" TEXT;

COMMENT ON COLUMN public.agenda_2026."Dir. Orgánica"     IS 'Dirección orgánica del colaborador';
COMMENT ON COLUMN public.agenda_2026."RUSP"              IS 'Número de registro RUSP';
COMMENT ON COLUMN public.agenda_2026."Licencia Vigencia" IS 'Vigencia de licencia de manejo (columna renombrada de "Vigencia")';

-- ─────────────────────────────────────────────────────────────────
-- PASO 2: Índice único en "No. Empleado" (necesario para ON CONFLICT)
-- ─────────────────────────────────────────────────────────────────

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'agenda_2026'
      AND indexname  = 'agenda_2026_num_empleado_unique'
  ) THEN
    CREATE UNIQUE INDEX agenda_2026_num_empleado_unique
      ON public.agenda_2026 ("No. Empleado");
  END IF;
END $do$;

-- ─────────────────────────────────────────────────────────────────
