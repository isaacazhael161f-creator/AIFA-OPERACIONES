-- ============================================================
-- Columna de Conciliación/Validación en vuelos_parte_operaciones_csv
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar las columnas de validación (idempotente con IF NOT EXISTS)
ALTER TABLE public.vuelos_parte_operaciones_csv
  ADD COLUMN IF NOT EXISTS validado        BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validado_por    TEXT,
  ADD COLUMN IF NOT EXISTS validado_at     TIMESTAMPTZ;

-- 2. Asegurarse de que la tabla tenga una columna id (clave primaria)
--    para que el UPDATE pueda identificar la fila exacta.
--    Si la tabla YA tiene un id (serial/uuid) puedes saltar este bloque.
--    Si NO tiene id, agrégala así:
--
--    ALTER TABLE public.vuelos_parte_operaciones_csv
--      ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;
--
--    Supabase suele agregar "id" automáticamente con BIGSERIAL.
--    Verifica con: \d public.vuelos_parte_operaciones_csv

-- 3. Índice para filtrar rápido por estado de validación
CREATE INDEX IF NOT EXISTS idx_vuelos_poc_validado
  ON public.vuelos_parte_operaciones_csv (validado);

-- 4. Política RLS — ya existe "Permitir gestión total de vuelos CSV" (FOR ALL).
--    Esa política ya cubre el UPDATE, por lo que no se necesita agregar nada más.
--    Si en el futuro restringes la política general, crea una específica:
--
-- DROP POLICY IF EXISTS "manifiestos_can_validate" ON public.vuelos_parte_operaciones_csv;
-- CREATE POLICY "manifiestos_can_validate"
--   ON public.vuelos_parte_operaciones_csv
--   FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);

-- 5. Verificar resultado:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'vuelos_parte_operaciones_csv'
--    ORDER BY ordinal_position;
