-- Agrega columna de observaciones a la tabla de vuelos CSV
-- Ejecutar una sola vez en Supabase SQL Editor

ALTER TABLE public.vuelos_parte_operaciones_csv
    ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Actualizar la política RLS existente (no requiere cambios)
-- La columna hereda automáticamente la política vigente
