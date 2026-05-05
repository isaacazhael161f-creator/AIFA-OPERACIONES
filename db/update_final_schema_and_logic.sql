
-- 1. Actualizar estructura de los catálogos para incluir el ID de ordenamiento y datos de estilo
ALTER TABLE catalogo_aeropuertos ADD COLUMN IF NOT EXISTS orden_id INTEGER;
ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS color TEXT;

-- NUEVO: Agregar columnas de estilo a la tabla final para persistencia
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS color TEXT;

-- NUEVO: Agregar columnas de detalle (num vuelo + horario)
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS monday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS tuesday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS wednesday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS thursday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS friday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS saturday_detail TEXT;
ALTER TABLE weekly_frequencies ADD COLUMN IF NOT EXISTS sunday_detail TEXT;

-- 2. Poblar/Actualizar Catálogo de Aeropuertos (Destinos) con el orden ID especificado
-- Usamos ON CONFLICT para actualizar si ya existe.
INSERT INTO catalogo_aeropuertos (iata, ciudad, estado, orden_id) VALUES
('TIJ', 'Tijuana', 'Baja California', 1),
('HMO', 'Hermosillo', 'Sonora', 2),
('CJS', 'Ciudad Juárez', 'Chihuahua', 3),
('CEN', 'Ciudad Obregón', 'Sonora', 4),
('CUU', 'Chihuahua', 'Chihuahua', 5),
('NLD', 'Nuevo Laredo', 'Tamaulipas', 6),
('REX', 'Reynosa', 'Tamaulipas', 7),
('LAP', 'La Paz', 'Baja California Sur', 8),
('CUL', 'Culiacán', 'Sinaloa', 9),
('DGO', 'Durango', 'Durango', 10),
('MTY', 'Monterrey', 'Nuevo León', 11),
('CVM', 'Ciudad Victoria', 'Tamaulipas', 12),
('MAM', 'Matamoros', 'Tamaulipas', 13),
('SJD', 'San José del Cabo', 'Baja California Sur', 14),
('MZT', 'Mazatlán', 'Sinaloa', 15),
('TPQ', 'Tepic', 'Nayarit', 16),
('SLP', 'San Luis Potosí', 'San Luis Potosí', 17),
('TAM', 'Tampico', 'Tamaulipas', 18),
('PVR', 'Puerto Vallarta', 'Jalisco', 19),
('GDL', 'Guadalajara', 'Jalisco', 20),
('BJX', 'Bajío', 'Guanajuato', 21),
('CLQ', 'Colima', 'Colima', 22),
('ZIH', 'Zihuatanjeo', 'Guerrero', 23),
('ACA', 'Acapulco', 'Guerrero', 24),
('OAX', 'Oaxaca', 'Oaxaca', 25),
('VER', 'Veracruz', 'Veracruz', 26),
('VSA', 'Villahermosa', 'Tabasco', 27),
('CPE', 'Campeche', 'Campeche', 28),
('MID', 'Mérida', 'Yucatán', 29),
('TQO', 'Tulum', 'Quintana Roo', 30),
('CUN', 'Cancún', 'Quintana Roo', 31),
('PXM', 'Puerto Escondido', 'Oaxaca', 32),
('HUX', 'Huatulco', 'Oaxaca', 33),
('IZT', 'Ixtepec', 'Oaxaca', 34),
('TGZ', 'Tuxtla Gutiérrez', 'Chiapas', 35),
('SLW', 'Saltillo', 'Coahuila', 36),
('PQM', 'Palenque', 'Chiapas', 37),
('CTM', 'Chetumal', 'Quintana Roo', 38),
('NLU', 'AIFA', 'Estado de México', 99)
ON CONFLICT (iata) DO UPDATE SET
    ciudad = EXCLUDED.ciudad,
    estado = EXCLUDED.estado,
    orden_id = EXCLUDED.orden_id;

-- 3. Poblar/Actualizar Catálogo de Aerolíneas con nombres oficiales y logos
INSERT INTO catalogo_aerolineas (codigo_iata, nombre_aerolinea, logo, color) VALUES
('VB', 'Viva Aerobus', 'logo_viva.png', '#00a850'),
('AM', 'Aeroméxico', 'logo_aeromexico.png', '#0b2161'),
('Y4', 'Volaris', 'logo_volaris.png', '#a300e6'),
('XN', 'Mexicana', 'logo_mexicana.png', '#008375'),
('G3', 'Gol', 'logo_gol.png', '#ff7f00'),
('CM', 'Copa Airlines', 'logo_copa.png', '#00529b'),
('AV', 'Avianca', 'logo_avianca.png', '#da291c'),
('V0', 'Conviasa', 'logo_conviasa.png', '#e65300'),
('DM', 'Arajet', 'logo_arajet.png', '#632683'),
('UJ', 'Magnicharters', 'logo_magnicharters.png', '#1d3c6e'),
('ZV', 'Aerus', 'logo_aerus.png', '#bed62f')
ON CONFLICT (codigo_iata) DO UPDATE SET
    nombre_aerolinea = EXCLUDED.nombre_aerolinea,
    logo = EXCLUDED.logo,
    color = EXCLUDED.color;


-- 4. Actualizar la función generadora para usar estos catálogos enriquecidos
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
        logo,    -- NUEVO
        color,   -- NUEVO
        monday,
        monday_detail, -- NUEVO
        tuesday,
        tuesday_detail, -- NUEVO
        wednesday,
        wednesday_detail, -- NUEVO
        thursday,
        thursday_detail, -- NUEVO
        friday,
        friday_detail, -- NUEVO
        saturday,
        saturday_detail, -- NUEVO
        sunday,
        sunday_detail, -- NUEVO
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
        al.logo,  -- Traer logo del catalogo
        al.color, -- Traer color del catalogo
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
