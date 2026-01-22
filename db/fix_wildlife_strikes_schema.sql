-- Fix missing column in wildlife_strikes table
ALTER TABLE public.wildlife_strikes ADD COLUMN IF NOT EXISTS impact_zone_remains text;

-- Ensure RLS is enabled just in case
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;

-- Re-apply policies (safe to run multiple times usually, or use drop if exists)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.wildlife_strikes;
CREATE POLICY "Enable read access for all users" ON public.wildlife_strikes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable insert for authenticated users only" ON public.wildlife_strikes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable update for authenticated users only" ON public.wildlife_strikes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable delete for authenticated users only" ON public.wildlife_strikes FOR DELETE USING (auth.role() = 'authenticated');
