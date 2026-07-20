-- Force permissions for Fauna tables
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescued_wildlife ENABLE ROW LEVEL SECURITY;

-- Clear existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.wildlife_strikes;

-- Create unified policies
CREATE POLICY "Enable read access for all users" ON public.wildlife_strikes FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.wildlife_strikes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.wildlife_strikes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.wildlife_strikes FOR DELETE USING (auth.role() = 'authenticated');

-- Repeat for rescued_wildlife
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.rescued_wildlife;

CREATE POLICY "Enable read access for all users" ON public.rescued_wildlife FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.rescued_wildlife FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.rescued_wildlife FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.rescued_wildlife FOR DELETE USING (auth.role() = 'authenticated');
