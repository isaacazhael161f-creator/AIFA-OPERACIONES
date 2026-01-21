-- 1. Actualizar tabla weekly_frequencies_int para soportar detalles y estilos
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS monday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS tuesday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS wednesday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS thursday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS friday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS saturday_detail TEXT;
ALTER TABLE weekly_frequencies_int ADD COLUMN IF NOT EXISTS sunday_detail TEXT;

-- 2. Función para Generar Frecuencias INTERNACIONALES
-- Filtra destinos cuyo 'orden_id' sea NULL o mayor a 50 (considerados internacionales)
CREATE OR REPLACE FUNCTION generate_weekly_frequencies_int(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    DELETE FROM weekly_frequencies_int WHERE week_label = p_week_label;

    INSERT INTO weekly_frequencies_int (
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
        CASE 
            WHEN det.route_code = 'HAV' THEN 1
            WHEN det.route_code = 'PUJ' THEN 2
            WHEN det.route_code = 'SDQ' THEN 3
            WHEN det.route_code = 'BOG' THEN 4
            WHEN det.route_code = 'CCS' THEN 5
            WHEN det.route_code = 'PTY' THEN 6 -- Copa/Panamá usually important too
            WHEN det.route_code = 'IAH' THEN 7
            ELSE 999 
        END as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        COALESCE(cat.pais, 'Internacional') as state, -- Usamos País en lugar de Estado
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo,
        al.color,
        -- LUNES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 1) as monday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 1) as monday_detail,
        -- MARTES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 2) as tuesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 2) as tuesday_detail,
        -- MIERCOLES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 3) as wednesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 3) as wednesday_detail,
        -- JUEVES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 4) as thursday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 4) as thursday_detail,
        -- VIERNES
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 5) as friday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 5) as friday_detail,
        -- SABADO
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 6) as saturday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 6) as saturday_detail,
        -- DOMINGO
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 0) as sunday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 0) as sunday_detail,

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
        AND (cat.orden_id IS NULL OR cat.orden_id > 50) -- FILTRO INTERNACIONAL
    GROUP BY 
        det.route_code, 
        cat.ciudad, 
        cat.pais,
        det.airline_code,
        al.nombre_aerolinea,
        al.logo,
        al.color;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar Función Generadora NACIONAL (para excluir internacionales)
CREATE OR REPLACE FUNCTION generate_weekly_frequencies(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    DELETE FROM weekly_frequencies WHERE week_label = p_week_label;

    INSERT INTO weekly_frequencies (
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
        COALESCE(cat.orden_id, 999) as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        COALESCE(cat.estado, '') as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo,
        al.color,
        
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 1) as monday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 1) as monday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 2) as tuesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 2) as tuesday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 3) as wednesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 3) as wednesday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 4) as thursday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 4) as thursday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 5) as friday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 5) as friday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 6) as saturday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 6) as saturday_detail,

        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 0) as sunday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 0) as sunday_detail,

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
        AND (cat.orden_id <= 50) -- FILTRO NACIONAL
    GROUP BY 
        det.route_code, 
        cat.ciudad, 
        cat.estado,
        cat.orden_id,
        det.airline_code,
        al.nombre_aerolinea,
        al.logo,
        al.color;

END;
$$ LANGUAGE plpgsql;
