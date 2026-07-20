-- Migration to support full DateTime and extra columns (Pax, Matricula)

-- 1. Ensure columns exist
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS pasajeros_llegada INTEGER DEFAULT 0;
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS pasajeros_salida INTEGER DEFAULT 0;
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS matricula TEXT;

-- 2. Modify Time columns to be TIMESTAMP to support Date + Time
-- NOTE: If you already have data, casting might fail if format doesn't match. 
-- Using TEXT is safer if we just want to store "DD/MM/YYYY HH:MM" exactly as string.
-- However, User requested "recibir hora y fecha". TIMESTAMP is the correct SQL type.

-- Option A: Add NEW columns of type TIMESTAMP (Recommended to avoid data loss during migration)
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS fecha_hora_prog_llegada TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS fecha_hora_real_llegada TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS fecha_hora_prog_salida TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.daily_flights_ops ADD COLUMN IF NOT EXISTS fecha_hora_real_salida TIMESTAMP WITHOUT TIME ZONE;

-- Comment: You can use these new columns to store the full date-time.
