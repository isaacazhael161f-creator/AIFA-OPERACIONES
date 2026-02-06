-- 1. Agregar columna 'operation_type' a 'weekly_flights_detailed'
-- 'P' = Pasajeros (Default)
-- 'C' = Carga
ALTER TABLE weekly_flights_detailed ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'P';

-- 2. Actualizar registros existentes (asumimos que lo anterior era Pasajeros si no se especifica, o mixto, pero para limpieza mejor marcamos todo P por ahora)
-- UPDATE weekly_flights_detailed SET operation_type = 'P' WHERE operation_type IS NULL;

-- 3. Actualizar función CARGO para filtrar por tipo 'C'
CREATE OR REPLACE FUNCTION generate_weekly_frequencies_cargo(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    -- Limpiar datos previos
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
        -- Generar ID dinámico
        DENSE_RANK() OVER (ORDER BY det.route_code) as route_id,
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
        AND det.operation_type = 'C' -- Filtrar solo carga
    
    GROUP BY 
        det.route_code, 
        cat.ciudad, 
        cat.estado, 
        cat.pais,
        al.nombre_aerolinea,
        det.airline_code,
        al.logo,
        al.color;
END;
$$ LANGUAGE plpgsql;


-- 4. Actualizar función PASAJEROS (Nacional e Internacional) para filtrar por 'P'
--    Nota: Podríamos necesitar recrear 'generate_weekly_frequencies' y 'generate_weekly_frequencies_int'
--    con la misma lógica de filtro.

CREATE OR REPLACE FUNCTION generate_weekly_frequencies(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    DELETE FROM weekly_frequencies WHERE week_label = p_week_label;

    INSERT INTO weekly_frequencies (
        week_label, valid_from, valid_to, route_id,
        city, state, iata, airline, logo, color,
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
        p_week_label, p_start_date, p_end_date,
        DENSE_RANK() OVER (ORDER BY det.route_code) as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        cat.estado,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo, al.color,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0),
        COUNT(*)
    FROM weekly_flights_detailed det
    LEFT JOIN catalogo_aeropuertos cat ON det.route_code = cat.iata
    LEFT JOIN catalogo_aerolineas al ON det.airline_code = al.codigo_iata
    WHERE det.flight_date >= p_start_date 
      AND det.flight_date <= p_end_date + INTERVAL '1 day'
      AND det.operation_type = 'P' -- SOLO PASAJEROS
      AND cat.pais = 'México' -- Solo nacionales
    GROUP BY det.route_code, cat.ciudad, cat.estado, det.airline_code, al.nombre_aerolinea, al.logo, al.color;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_weekly_frequencies_int(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    DELETE FROM weekly_frequencies_int WHERE week_label = p_week_label;

    INSERT INTO weekly_frequencies_int (
        week_label, valid_from, valid_to, route_id,
        city, country, iata, airline, logo, color,
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
        p_week_label, p_start_date, p_end_date,
        DENSE_RANK() OVER (ORDER BY det.route_code) as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        cat.pais as country,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo, al.color,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6),
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0),
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0),
        COUNT(*)
    FROM weekly_flights_detailed det
    LEFT JOIN catalogo_aeropuertos cat ON det.route_code = cat.iata
    LEFT JOIN catalogo_aerolineas al ON det.airline_code = al.codigo_iata
    WHERE det.flight_date >= p_start_date 
      AND det.flight_date <= p_end_date + INTERVAL '1 day'
      AND det.operation_type = 'P' -- SOLO PASAJEROS
      AND cat.pais != 'México' -- Solo internacionales
    GROUP BY det.route_code, cat.ciudad, cat.pais, det.airline_code, al.nombre_aerolinea, al.logo, al.color;
END;
$$ LANGUAGE plpgsql;
