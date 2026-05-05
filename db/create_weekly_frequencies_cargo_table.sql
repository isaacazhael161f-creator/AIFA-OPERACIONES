CREATE TABLE IF NOT EXISTS public.weekly_frequencies_cargo (
    id SERIAL PRIMARY KEY,
    week_label text,
    valid_from date,
    valid_to date,
    route_id integer,
    city text,
    state text,
    iata text,
    airline text,
    logo text,
    color text,
    
    monday integer DEFAULT 0,
    monday_detail text,
    
    tuesday integer DEFAULT 0,
    tuesday_detail text,
    
    wednesday integer DEFAULT 0,
    wednesday_detail text,
    
    thursday integer DEFAULT 0,
    thursday_detail text,
    
    friday integer DEFAULT 0,
    friday_detail text,
    
    saturday integer DEFAULT 0,
    saturday_detail text,
    
    sunday integer DEFAULT 0,
    sunday_detail text,
    
    weekly_total integer DEFAULT 0,
    
    is_template boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_frequencies_cargo ENABLE ROW LEVEL SECURITY;

-- Creating policies 
DROP POLICY IF EXISTS "Enable read access for all users" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable read access for all users" ON public.weekly_frequencies_cargo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable insert for authenticated users only" ON public.weekly_frequencies_cargo FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable update for authenticated users only" ON public.weekly_frequencies_cargo FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable delete for authenticated users only" ON public.weekly_frequencies_cargo FOR DELETE USING (true);
