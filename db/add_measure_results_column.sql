-- Fix missing measure_results column in wildlife_strikes table
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS measure_results text;

-- Ensure RLS is enabled just in case (redundant but safe)
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;
