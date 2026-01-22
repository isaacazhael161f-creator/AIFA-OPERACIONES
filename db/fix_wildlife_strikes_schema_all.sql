-- Fix specific reported missing column
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS remains_count integer default 0;

-- Proactively add other columns that might be missing based on the full schema definition
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS proactive_measures text;
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS weather_conditions text;
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS observations text;

-- Ensure RLS is enabled
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;
