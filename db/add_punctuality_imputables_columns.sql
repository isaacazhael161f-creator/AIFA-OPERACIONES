-- ============================================================
-- Migración: Nuevas columnas de imputables en punctuality_stats
-- Ejecutar en Supabase SQL Editor (Dashboard)
-- ============================================================

ALTER TABLE public.punctuality_stats
  ADD COLUMN IF NOT EXISTS imputable_airline   INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_imputable INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_imputable     INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.punctuality_stats.imputable_airline   IS 'Demoras/cancelaciones imputables a la aerolínea';
COMMENT ON COLUMN public.punctuality_stats.cancelled_imputable IS 'Cancelados imputables a la aerolínea';
COMMENT ON COLUMN public.punctuality_stats.total_imputable     IS 'Total imputables (demoras + cancelados) a la aerolínea';
