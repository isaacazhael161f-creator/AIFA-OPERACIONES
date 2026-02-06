-- 1. Create structure for Cargo Frequencies
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

-- 2. Enable Security (RLS)
ALTER TABLE public.weekly_frequencies_cargo ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable read access for all users" ON public.weekly_frequencies_cargo FOR SELECT USING (true);

-- Allow authenticated users to modify
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable insert for authenticated users only" ON public.weekly_frequencies_cargo FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable update for authenticated users only" ON public.weekly_frequencies_cargo FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.weekly_frequencies_cargo;
CREATE POLICY "Enable delete for authenticated users only" ON public.weekly_frequencies_cargo FOR DELETE USING (true);

-- 3. Create Function to Generate Cargo Frequencies
CREATE OR REPLACE FUNCTION generate_weekly_frequencies_cargo(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    -- Delete existing data for this week to avoid duplicates
    DELETE FROM weekly_frequencies_cargo WHERE week_label = p_week_label;

    INSERT INTO weekly_frequencies_cargo (
        week_label,
        valid_from,
        valid_to,
        route_id, 
        city,
        state,
        iata,
        airline,
        logo,
        color,
        monday, monday_detail,
        tuesday, tuesday_detail,
        wednesday, wednesday_detail,
        thursday, thursday_detail,
        friday, friday_detail,
        saturday, saturday_detail,
        sunday, sunday_detail,
        weekly_total
    )
    SELECT 
        p_week_label,
        p_start_date,
        p_end_date,
        999 as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        COALESCE(cat.estado, cat.pais, 'N/A') as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo,
        al.color,
        -- LUNES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday_detail,
        -- MARTES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday_detail,
        -- MIERCOLES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday_detail,
        -- JUEVES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday_detail,
        -- VIERNES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday_detail,
        -- SABADO
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday_detail,
        -- DOMINGO
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday_detail,

        COUNT(*) as weekly_total
    FROM 
        weekly_flights_detailed det
    LEFT JOIN 
        catalogo_aeropuertos cat ON det.route_code = cat.iata
    LEFT JOIN 
        catalogo_aerolineas al ON det.airline_code = al.codigo_iata
    WHERE 
        det.flight_date >= p_start_date 
        AND det.flight_date <= p_end_date + INTERVAL '1 day'
    GROUP BY 
        det.route_code, 
        cat.ciudad, 
        cat.estado, 
        cat.pais,
        det.route_code,
        al.nombre_aerolinea,
        det.airline_code,
        al.logo,
        al.color;
END;
$$ LANGUAGE plpgsql;
