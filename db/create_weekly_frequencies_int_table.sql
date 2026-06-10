CREATE TABLE IF NOT EXISTS public.weekly_frequencies_int (
    id SERIAL PRIMARY KEY,
    week_label text,
    valid_from date,
    valid_to date,
    route_id integer,
    city text,
    state text,
    iata text,
    airline text,
    monday integer DEFAULT 0,
    tuesday integer DEFAULT 0,
    wednesday integer DEFAULT 0,
    thursday integer DEFAULT 0,
    friday integer DEFAULT 0,
    saturday integer DEFAULT 0,
    sunday integer DEFAULT 0,
    weekly_total integer DEFAULT 0,
    is_template boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_frequencies_int ENABLE ROW LEVEL SECURITY;

-- Creating policies (simulated for now as we don't know the full auth setup, but usually allow all for this demo app)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.weekly_frequencies_int;
CREATE POLICY "Enable read access for all users" ON public.weekly_frequencies_int FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekly_frequencies_int;
CREATE POLICY "Enable insert for authenticated users only" ON public.weekly_frequencies_int FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekly_frequencies_int;
CREATE POLICY "Enable update for authenticated users only" ON public.weekly_frequencies_int FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekly_frequencies_int;
CREATE POLICY "Enable delete for authenticated users only" ON public.weekly_frequencies_int FOR DELETE USING (true);
