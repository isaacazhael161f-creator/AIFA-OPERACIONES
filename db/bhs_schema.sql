-- ============================================================
-- BHS (Baggage Handling System) — GOET / Ed. Terminal
-- 3 tablas: llegadas, salidas, maletas sin vuelo
-- ============================================================

-- ─── LLEGADAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bhs_arrivals (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha         date        NOT NULL,
    uploaded_at   timestamptz DEFAULT now(),
    uploaded_by   text,

    -- columnas del Excel
    vuelo         text,
    compania      text,           -- código IATA aerolínea
    procedencia   text,           -- origen IATA
    plat          text,           -- posición plataforma
    total_maletas integer DEFAULT 0,
    terminacion   integer DEFAULT 0,  -- maletas que quedaron en AIFA
    tras          integer DEFAULT 0   -- maletas en tránsito
);

CREATE INDEX IF NOT EXISTS idx_bhs_arr_fecha     ON bhs_arrivals(fecha);
CREATE INDEX IF NOT EXISTS idx_bhs_arr_compania  ON bhs_arrivals(compania);

ALTER TABLE bhs_arrivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bhs_arrivals_read"
    ON bhs_arrivals FOR SELECT USING (true);

CREATE POLICY "bhs_arrivals_insert"
    ON bhs_arrivals FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bhs_arrivals_delete"
    ON bhs_arrivals FOR DELETE
    USING (auth.role() = 'authenticated');


-- ─── SALIDAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bhs_departures (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha                 date        NOT NULL,
    uploaded_at           timestamptz DEFAULT now(),
    uploaded_by           text,

    -- columnas del Excel
    vuelo                 text,
    compania              text,       -- código IATA aerolínea
    hora_programada       time,       -- hora programada del vuelo
    destino               text,       -- destino IATA
    plat                  text,       -- posición plataforma
    primera_maleta        time,       -- hora de la 1ª maleta
    ultima_maleta         time,       -- hora de la última maleta
    etd                   time,       -- Estimated Time of Departure

    -- campos calculados al insertar
    min_anticip_primera   integer,    -- minutos antes de hora_programada que llegó 1ª maleta
    min_anticip_ultima    integer     -- minutos antes de ETD que llegó la última maleta
);

CREATE INDEX IF NOT EXISTS idx_bhs_dep_fecha     ON bhs_departures(fecha);
CREATE INDEX IF NOT EXISTS idx_bhs_dep_compania  ON bhs_departures(compania);

ALTER TABLE bhs_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bhs_departures_read"
    ON bhs_departures FOR SELECT USING (true);

CREATE POLICY "bhs_departures_insert"
    ON bhs_departures FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bhs_departures_delete"
    ON bhs_departures FOR DELETE
    USING (auth.role() = 'authenticated');


-- ─── MALETAS SIN VUELO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bhs_bags_without_flight (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha       date        NOT NULL,
    uploaded_at timestamptz DEFAULT now(),
    uploaded_by text,

    -- columnas del Excel
    tag         text,       -- número de tag de la maleta
    compania    text,       -- código IATA aerolínea (si aplica)
    vuelo       text,
    origen      text,       -- IATA origen
    destino     text        -- IATA destino
);

CREATE INDEX IF NOT EXISTS idx_bhs_bwf_fecha    ON bhs_bags_without_flight(fecha);
CREATE INDEX IF NOT EXISTS idx_bhs_bwf_compania ON bhs_bags_without_flight(compania);

ALTER TABLE bhs_bags_without_flight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bhs_bwf_read"
    ON bhs_bags_without_flight FOR SELECT USING (true);

CREATE POLICY "bhs_bwf_insert"
    ON bhs_bags_without_flight FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bhs_bwf_delete"
    ON bhs_bags_without_flight FOR DELETE
    USING (auth.role() = 'authenticated');


-- ─── VISTA: resumen de llegadas por fecha + aerolínea ───────
CREATE OR REPLACE VIEW bhs_arrivals_summary AS
SELECT
    fecha,
    compania,
    COUNT(*)            AS vuelos,
    SUM(total_maletas)  AS total_maletas,
    SUM(terminacion)    AS terminacion,
    SUM(tras)           AS transit
FROM bhs_arrivals
GROUP BY fecha, compania
ORDER BY fecha DESC, total_maletas DESC;

-- ─── VISTA: resumen de salidas + tiempos de anticipación ────
CREATE OR REPLACE VIEW bhs_departures_summary AS
SELECT
    fecha,
    compania,
    COUNT(*)                            AS vuelos,
    ROUND(AVG(min_anticip_primera))     AS avg_min_anticip_primera,
    ROUND(AVG(min_anticip_ultima))      AS avg_min_anticip_ultima,
    MIN(min_anticip_primera)            AS min_anticip_primera_min,
    MAX(min_anticip_primera)            AS min_anticip_primera_max
FROM bhs_departures
WHERE min_anticip_primera IS NOT NULL
GROUP BY fecha, compania
ORDER BY fecha DESC;

-- ─── VISTA: resumen maletas sin vuelo por fecha + aerolínea ─
CREATE OR REPLACE VIEW bhs_bwf_summary AS
SELECT
    fecha,
    compania,
    COUNT(*) AS total_manual
FROM bhs_bags_without_flight
GROUP BY fecha, compania
ORDER BY fecha DESC, total_manual DESC;
