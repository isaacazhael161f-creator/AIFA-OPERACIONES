-- Ensure TRC (Torreon) is always classified as NATIONAL when weekly frequencies
-- are generated from weekly_flights_detailed.

-- 1) INTERNATIONAL generator: explicitly exclude TRC
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
            WHEN det.route_code = 'PTY' THEN 6
            WHEN det.route_code = 'IAH' THEN 7
            ELSE 999
        END as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        COALESCE(cat.pais, 'Internacional') as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo,
        al.color,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday_detail,
        COUNT(*) as weekly_total
    FROM weekly_flights_detailed det
    LEFT JOIN catalogo_aeropuertos cat ON det.route_code = cat.iata
    LEFT JOIN catalogo_aerolineas al ON det.airline_code = al.codigo_iata
    WHERE (det.flight_date AT TIME ZONE 'America/Mexico_City')::date >= p_start_date
      AND (det.flight_date AT TIME ZONE 'America/Mexico_City')::date <= p_end_date
      AND (cat.orden_id IS NULL OR cat.orden_id > 50)
      AND upper(coalesce(det.route_code, '')) <> 'TRC'
      AND det.route_code != 'LAX'
    GROUP BY det.route_code, cat.ciudad, cat.pais, det.airline_code, al.nombre_aerolinea, al.logo, al.color;
END;
$$ LANGUAGE plpgsql;

-- 2) NATIONAL generator: explicitly include TRC
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
        COALESCE(NULLIF(cat.estado, ''), CASE WHEN upper(coalesce(det.route_code, '')) = 'TRC' THEN 'Coahuila' ELSE '' END) as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        al.logo,
        al.color,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 1) as monday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 2) as tuesday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 3) as wednesday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 4) as thursday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 5) as friday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 6) as saturday_detail,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday,
        string_agg(concat(det.flight_number, ' ', to_char(det.flight_date AT TIME ZONE 'America/Mexico_City', 'HH24:MI')), E'<br>' ORDER BY det.flight_date) FILTER (WHERE EXTRACT(DOW FROM det.flight_date AT TIME ZONE 'America/Mexico_City') = 0) as sunday_detail,
        COUNT(*) as weekly_total
    FROM weekly_flights_detailed det
    LEFT JOIN catalogo_aeropuertos cat ON det.route_code = cat.iata
    LEFT JOIN catalogo_aerolineas al ON det.airline_code = al.codigo_iata
    WHERE (det.flight_date AT TIME ZONE 'America/Mexico_City')::date >= p_start_date
      AND (det.flight_date AT TIME ZONE 'America/Mexico_City')::date <= p_end_date
      AND ((cat.orden_id <= 50) OR upper(coalesce(det.route_code, '')) = 'TRC')
    GROUP BY det.route_code, cat.ciudad, cat.estado, cat.orden_id, det.airline_code, al.nombre_aerolinea, al.logo, al.color;
END;
$$ LANGUAGE plpgsql;
