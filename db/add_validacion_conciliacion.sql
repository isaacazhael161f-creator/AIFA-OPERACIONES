-- ============================================================
-- Columna de Conciliación/Validación en vuelos_parte_operaciones_csv
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columna id (clave primaria) si no existe.
--    BIGSERIAL asigna valores automáticamente a todas las filas existentes.
ALTER TABLE public.vuelos_parte_operaciones_csv
  ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

-- 2. Agregar las columnas de validación
ALTER TABLE public.vuelos_parte_operaciones_csv
  ADD COLUMN IF NOT EXISTS validado        BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validado_por    TEXT,
  ADD COLUMN IF NOT EXISTS validado_at     TIMESTAMPTZ;

-- 3. Índice para filtrar rápido por estado de validación
CREATE INDEX IF NOT EXISTS idx_vuelos_poc_validado
  ON public.vuelos_parte_operaciones_csv (validado);

-- 4. La política RLS existente (FOR ALL) ya cubre el UPDATE.
--    No se necesita agregar nada más.

-- 5. Verificar resultado:
--    SELECT id, validado, validado_por, validado_at
--    FROM public.vuelos_parte_operaciones_csv LIMIT 5;
