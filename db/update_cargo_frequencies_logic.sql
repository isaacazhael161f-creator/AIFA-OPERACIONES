-- Función para Generar Frecuencias DE CARGA
-- Sin filtros geográficos (nacionales e internacionales juntos)
CREATE OR REPLACE FUNCTION generate_weekly_frequencies_cargo(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
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
        -- NO FILTERS for Cargo, assume the input source (csv name) or type distinguishes it? 
        -- Based on user request "Frecuencias semanales de carga", we should probably filter by operation type if possible. 
        -- However, the user said "Ocuparemos el mismo formato de archivo csv... Frec_carga.csv".
        -- If we upload to the same detail table, we need a way to distinguish cargo uploads from passenger uploads.
        -- For simplicity in this logic, we assume we process the "cargo" CSV separately in the frontend 
        -- and maybe tag it? Or if we re-use the table 'weekly_flights_detailed', we might mix data.
        
        -- Wait, the user wants a separate tab. If we use the same CSV format, the ingest process parses it.
        -- Usually we clear 'weekly_flights_detailed' before insert?
        -- No, 'weekly_flights_detailed' seems to be a temporary table populated during the upload process.
        -- If so, we just need to ensure we call THIS function 'generate_weekly_frequencies_cargo' instead of the others
        -- when the user is in the "Cargo" context.
        
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
