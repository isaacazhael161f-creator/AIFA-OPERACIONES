-- =====================================================================
-- VACACIONES EN agenda_2026
-- Agrega una columna JSONB "vacaciones" a la tabla existente.
-- Cada empleado almacena su historial de períodos en esa columna.
--
-- Estructura de cada período dentro del array:
-- {
--   "id":           "timestamp-random",   -- identificador único local
--   "anio":         2026,
--   "periodo_num":  1,                    -- 1, 2, 3 o 4
--   "fecha_inicio": "2026-01-15",
--   "fecha_fin":    "2026-01-24",
--   "dias_totales": 10,                   -- calculado en la app
--   "estado":       "programado",         -- programado | disfrutado | cancelado
--   "observaciones": null,
--   "creado_por":   "usuario@email",
--   "creado_en":    "2026-01-01T00:00:00Z"
-- }
-- No hay restricción de días por período; el límite total es 20 días/año.
-- =====================================================================

-- 1. Agregar columna a la tabla existente
ALTER TABLE public.agenda_2026
    ADD COLUMN IF NOT EXISTS vacaciones JSONB DEFAULT '[]'::jsonb;

-- 2. Índice GIN para búsquedas dentro del array JSONB (recomendado)
CREATE INDEX IF NOT EXISTS idx_agenda_vacaciones
    ON public.agenda_2026 USING GIN (vacaciones);

-- =====================================================================
-- INSTRUCCIONES
-- =====================================================================
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Pega y ejecuta este archivo completo
-- 3. Verifica en Table Editor que "agenda_2026" tiene la nueva
--    columna "vacaciones" (tipo jsonb, valor por defecto [])
-- 4. ¡Listo! No se necesita tabla adicional.
-- =====================================================================
