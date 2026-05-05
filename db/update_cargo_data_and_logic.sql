-- 1. Actualizar Catálogo de Aerolíneas con nombres correctos (Upsert)
-- Se asume clave primaria codigo_iata
INSERT INTO catalogo_aerolineas (codigo_iata, nombre_aerolinea) VALUES
('YQ', 'TAR'),
('DM', 'Arajet'),
('GB', 'ABX Air'),
('CX', 'Cathay Pacific'),
('PQ', 'Personas Y Paquetes Por Air'),
('RE', 'Aeroregional'),
('5D', 'Aeromexico Connect'),
('FX', 'FEDEX'),
('VB', 'Viva'),
('V0', 'Conviasa'),
('CA', 'Air China'),
('LZ', 'Legend Airways LLC'),
('ZV', 'Aerus'),
('CI', 'China Airlines'),
('OK', 'Czech Airlines'),
('JU', 'USA Jet Airlines'),
('YA', 'Berry Aviation'),
('GA', 'Garuda Indonesia'),
('A8', 'Ameriflight'),
('U7', 'Uniworld Air Cargo'),
('Y8', 'Suparna Airlines'),
('LX', 'Swiss International Air Lines'),
('MI', 'Taxi Aéreo Monterrey, SA DE CV'),
('TE', 'Sky Taxi'),
('NZ', 'Air New Zealand'),
('2D', 'Eastern Airlines'),
('AU', 'Canada Jetlines'),
('G3', 'City Connexion Airlines'),
('GH', 'Galistair Trading Limited'),
('1A', 'FBONLU'),
('LY', 'El Al Israel Airlines'),
('6R', 'Aerotransporte de Carga Unión'),
('Q6', 'Volaris CostaRica'),
('TP', 'TAP Portugal'),
('N3', 'Volaris ElSalvador'),
('MD', 'McNeely Charter Services'),
('OS', 'Austrian Airlines'),
('EU', 'Eurus Aviation'),
('QF', 'Qantas Airways'),
('VS', 'Virgin Atlantic'),
('AR', 'Aerolíneas Argentinas'),
('G2', 'GullivAir'),
('KE', 'Korean Air'),
('YO', 'TAR AEROLINEAS.'),
('6N', 'AEROSUCRE S.A'),
('SU', 'Aeroflot Russian Airlines'),
('VZ', 'Air Class Líneas Aéreas'),
('WT', 'SWIFT AIR LLC'),
('E9', 'Iberojet'),
('WH', 'La Nueva Aerolínea'),
('W2', 'World to Fly'),
('AY', 'Finnair'),
('UJ', 'MAGNICHARTERS'),
('UC', 'Lan Cargo S.A.'),
('SK', 'Scandinavian Airlines'),
('SM', 'TSM Airline'),
('JL', 'Japan Airlines'),
('AD', 'Linea Aerea Azul'),
('UX', 'Air Europa'),
('N8', 'National Airlines Cargo'),
('SY', 'Sun Country Airlines'),
('G6', 'Global Crossing'),
('W8', 'Cargojet Airways'),
('Y4', 'Volaris'),
('VH', 'Aeropostal Alas de Venezuela'),
('VW', 'Aeromar'),
('TN', 'Air Tahiti Nui'),
('UA', 'United Airlines'),
('IF', 'IFL Group'),
('5V', 'Everts Air'),
('BA', 'British Airways'),
('FP', 'Fly Pro'),
('TK', 'Turkish Airlines'),
('CM', 'Copa Airlines'),
('PU', 'Plus Ultra'),
('AM', 'Aeromexico'),
('KD', 'Western Global Airlines'),
('AV', 'Avianca'),
('XL', 'LATAM Ecuador'),
('QR', 'Qatar Airways'),
('E7', 'Estafeta'),
('L3', 'DHL Guatemala'),
('ZT', 'Titan Airways'),
('NH', 'All Nippon Airways'),
('M3', 'ABSA'),
('WS', 'WestJet'),
('CV', 'Cargolux'),
('GN', 'General aviation'),
('AF', 'Air France'),
('XN', 'Mexicana'),
('M6', 'Amerijet International'),
('7L', 'Silk Way West Airlines'),
('M7', 'MasAir'),
('GG', 'Sky Lease Cargo'),
('AA', 'American Airlines'),
('A7', 'Awesome Cargo'),
('AC', 'Air Canada'),
('XR', 'CORENDON AIRLINES EUROPE'),
('K9', 'KALITTA CHARTERS II, LLC.'),
('5X', 'United Parcel Service'),
('5Y', 'Atlas Air'),
('LH', 'Lufthansa'),
('KL', 'KLM Airways'),
('LA', 'LATAM Chile'),
('IB', 'Iberia Airlines'),
('SV', 'Saudi Arabian Airlines Cargo'),
('K4', 'Kalitta Air'),
('L7', 'LATAM Cargo Colombia'),
('L2', 'Lynden Air Cargo'),
('G4', 'Allegiant Air LLC'),
('ET', 'Ethiopian Airlines'),
('FV', 'Pulkovo Aviation Enterprise'),
('5R', 'Rutaca Airlines'),
('DL', 'Delta Air Lines'),
('OY', 'Omni Air International'),
('EK', 'Emirates Airlines'),
('CZ', 'China Southerrn')
ON CONFLICT (codigo_iata) DO UPDATE 
SET nombre_aerolinea = EXCLUDED.nombre_aerolinea;


-- 2. Actualizar función de Carga para generar IDs y usar nombres completos
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
        -- Generar ID dinámico basado en el código de ruta (alfabético)
        DENSE_RANK() OVER (ORDER BY det.route_code) as route_id,
        COALESCE(cat.ciudad, det.route_code) as city,
        COALESCE(cat.estado, cat.pais, 'N/A') as state,
        det.route_code as iata,
        -- Usar nombre del catálogo o fallback al código
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
    
    -- Agrupación revisada para incluir columnas ID y Nombres
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
