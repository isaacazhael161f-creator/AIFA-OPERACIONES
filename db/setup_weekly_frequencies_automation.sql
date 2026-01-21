-- 1. Tabla para almacenar el detalle de vuelos (Raw Data del CSV)
CREATE TABLE IF NOT EXISTS weekly_flights_detailed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_label TEXT NOT NULL,          -- Ej: "2026-W04" o "19-25 Ene 2026"
    route_code TEXT NOT NULL,          -- Ej: "ACA", "TIJ"
    airline_code TEXT,                 -- Ej: "VB", "AM"
    flight_number TEXT,                -- Ej: "VB 1234"
    flight_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Fecha y hora exacta (SOBT)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aseguramos que existan los catálogos (Si ya existen, esto no afecta)
CREATE TABLE IF NOT EXISTS catalogo_aeropuertos (
    iata TEXT PRIMARY KEY,
    ciudad TEXT NOT NULL,
    estado TEXT,
    pais TEXT DEFAULT 'México'
);

CREATE TABLE IF NOT EXISTS catalogo_aerolineas (
    codigo_iata TEXT PRIMARY KEY,
    nombre_aerolinea TEXT NOT NULL
);

-- 3. Función para procesar y alimentar la tabla de frecuencias semanales (weekly_frequencies)
-- Esta función toma un rango de fechas y una etiqueta de semana, borra lo anterior de esa semana y recalcula.
CREATE OR REPLACE FUNCTION generate_weekly_frequencies(
    p_week_label TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
BEGIN
    -- A. Eliminar datos existentes en la tabla resumen para esa semana (para evitar duplicados al recargar)
    DELETE FROM weekly_frequencies WHERE week_label = p_week_label;

    -- B. Insertar datos agregados
    INSERT INTO weekly_frequencies (
        week_label,
        valid_from,
        valid_to,
        route_id, -- Se generará o se dejará null si no es crítico
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
        NULL as route_id, -- Opcional: Lógica para ID de ruta si es necesario
        COALESCE(cat.ciudad, 'Desconocido') as city,
        COALESCE(cat.estado, '') as state,
        det.route_code as iata,
        COALESCE(al.nombre_aerolinea, det.airline_code) as airline,
        -- Conteo por día de la semana (PostgreSQL: 0=Domingo, 1=Lunes, ..., 6=Sábado)
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
        AND det.flight_date <= p_end_date + INTERVAL '1 day' -- Asegurar cobertura completa del último día
    GROUP BY 
        det.route_code, 
        cat.ciudad, 
        cat.estado, 
        det.airline_code,
        al.nombre_aerolinea;

END;
$$ LANGUAGE plpgsql;
