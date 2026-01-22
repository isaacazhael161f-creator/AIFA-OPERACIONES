-- Fix permissions for wildlife_strikes
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.wildlife_strikes;
CREATE POLICY "Enable read access for all users" ON public.wildlife_strikes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable insert for authenticated users only" ON public.wildlife_strikes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable update for authenticated users only" ON public.wildlife_strikes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.wildlife_strikes;
CREATE POLICY "Enable delete for authenticated users only" ON public.wildlife_strikes FOR DELETE USING (auth.role() = 'authenticated');

-- Fix permissions for rescued_wildlife (just in case)
ALTER TABLE public.rescued_wildlife ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.rescued_wildlife;
CREATE POLICY "Enable read access for all users" ON public.rescued_wildlife FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.rescued_wildlife;
CREATE POLICY "Enable insert for authenticated users only" ON public.rescued_wildlife FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.rescued_wildlife;
CREATE POLICY "Enable update for authenticated users only" ON public.rescued_wildlife FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.rescued_wildlife;
CREATE POLICY "Enable delete for authenticated users only" ON public.rescued_wildlife FOR DELETE USING (auth.role() = 'authenticated');
