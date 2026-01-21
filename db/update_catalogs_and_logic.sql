
-- 1. Actualizar estructura de los catálogos para incluir el ID de ordenamiento y datos de estilo
ALTER TABLE catalogo_aeropuertos ADD COLUMN IF NOT EXISTS orden_id INTEGER;
ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS color TEXT;

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
('MZT', 'Mazatlán', 'Sinaloa', 11),
('PVR', 'Puerto Vallarta', 'Jalisco', 12),
('GDL', 'Guadalajara', 'Jalisco', 13),
('MTY', 'Monterrey', 'Nuevo León', 14),
('CUN', 'Cancún', 'Quintana Roo', 15),
('MID', 'Mérida', 'Yucatán', 16),
('VER', 'Veracruz', 'Veracruz', 17),
('ACA', 'Acapulco', 'Guerrero', 18),
('OAX', 'Oaxaca', 'Oaxaca', 19),
('HUX', 'Huatulco', 'Oaxaca', 20),
('PXM', 'Puerto Escondido', 'Oaxaca', 21),
('SJD', 'San José del Cabo', 'Baja California Sur', 22),
('ZCL', 'Zacatecas', 'Zacatecas', 23),
('TAM', 'Tampico', 'Tamaulipas', 24),
('VSA', 'Villahermosa', 'Tabasco', 25),
('TGZ', 'Tuxtla Gutiérrez', 'Chiapas', 26),
('CPE', 'Campeche', 'Campeche', 27),
('CTM', 'Chetumal', 'Quintana Roo', 28),
('TLC', 'Toluca', 'Estado de México', 29),
('BJX', 'León/Bajío', 'Guanajuato', 30),
('AGU', 'Aguascalientes', 'Aguascalientes', 31),
('SLP', 'San Luis Potosí', 'San Luis Potosí', 32),
('QRO', 'Querétaro', 'Querétaro', 33),
('MLM', 'Morelia', 'Michoacán', 34),
('ZIH', 'Ixtapa Zihuatanejo', 'Guerrero', 35),
('TAP', 'Tapachula', 'Chiapas', 36),
('MXL', 'Mexicali', 'Baja California', 37),
('TPQ', 'Tepic', 'Nayarit', 38),
('UPN', 'Uruapan', 'Michoacán', 39),
('PQM', 'Palenque', 'Chiapas', 40),
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
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        sunday,
        weekly_total
    )
    SELECT 
        p_week_label,
        p_start_date,
        p_end_date,
        COALESCE(cat.orden_id, 999) as route_id, -- Usar el ID de orden del catálogo
        COALESCE(cat.ciudad, det.route_code) as city, -- Usar nombre de ciudad del catálogo
        COALESCE(cat.estado, '') as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline, -- Nombre bonito de aerolínea
         -- Conteo por día de la semana
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 1) as monday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 2) as tuesday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 3) as wednesday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 4) as thursday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 5) as friday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 6) as saturday,
        COUNT(*) FILTER (WHERE EXTRACT(DOW FROM det.flight_date) = 0) as sunday,
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
        al.nombre_aerolinea;

END;
$$ LANGUAGE plpgsql;
