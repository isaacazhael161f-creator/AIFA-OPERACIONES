-- Migration to update daily_flights_ops table for new 12-column PDF format

-- 1. Add 'observaciones' column
ALTER TABLE public.daily_flights_ops 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 2. Add 'diferencia_tiempo' column if we want to store "+00:13" separately from status
-- For now, the JS maps this to 'estatus', but let's add a proper column for clarity if needed later.
-- We will stick to the requested columns.
ALTER TABLE public.daily_flights_ops 
ADD COLUMN IF NOT EXISTS diferencia_tiempo TEXT;

-- 3. Ensure passengers is nullable or default 0 (it is integer already)
ALTER TABLE public.daily_flights_ops 
ALTER COLUMN pasajeros SET DEFAULT 0;
