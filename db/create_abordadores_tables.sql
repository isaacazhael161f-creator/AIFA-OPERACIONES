-- =============================================================
--  ABORDADORES MECÁNICOS — Tablas de Digitalización
--  Creado: 2026-04-07
-- =============================================================

-- ── 1. ORDENES DE SERVICIO AEROCARES (COBUS) ──────────────────

CREATE TABLE IF NOT EXISTS ordenes_servicio_aerocares (
    id                  BIGSERIAL PRIMARY KEY,
    folio               TEXT,
    fecha               DATE NOT NULL,
    h_programada        TIME,
    tipo_vuelo          TEXT CHECK (tipo_vuelo IN ('nacional','internacional','mixto')) DEFAULT 'nacional',
    tipo_operacion      TEXT CHECK (tipo_operacion IN ('salida','llegada')) DEFAULT 'llegada',
    base                TEXT,
    posicion            TEXT,
    no_vuelo            TEXT NOT NULL,
    origen_destino      TEXT,
    aerolinea           TEXT,
    matricula           TEXT,
    h_solicitud         TIME,
    h_entrega           TIME,
    -- Array JSON de operaciones:
    -- [{aerocar, h_sal_edif, h_abordaje, h_ter_serv, no_pax, operador}]
    operaciones         JSONB DEFAULT '[]',
    obs_aerolinea       TEXT,
    obs_operador        TEXT,
    nombre_conformidad  TEXT,
    nombre_coordinador  TEXT,
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_osa_fecha       ON ordenes_servicio_aerocares (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_osa_no_vuelo    ON ordenes_servicio_aerocares (no_vuelo);
CREATE INDEX IF NOT EXISTS idx_osa_aerolinea   ON ordenes_servicio_aerocares (aerolinea);

-- RLS
ALTER TABLE ordenes_servicio_aerocares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "osa_select_authed" ON ordenes_servicio_aerocares
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "osa_insert_authed" ON ordenes_servicio_aerocares
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solo admin / editor pueden modificar/eliminar
CREATE POLICY "osa_update_admin" ON ordenes_servicio_aerocares
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor')
        )
    );

CREATE POLICY "osa_delete_admin" ON ordenes_servicio_aerocares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor')
        )
    );


-- ── 2. REGISTROS DE SERVICIO AEROPASILLOS ─────────────────────

CREATE TABLE IF NOT EXISTS registros_servicio_aeropasillos (
    id                      BIGSERIAL PRIMARY KEY,
    folio                   TEXT,
    fecha                   DATE NOT NULL,
    tipo_vuelo              TEXT CHECK (tipo_vuelo IN ('nacional','internacional','mixto')) DEFAULT 'nacional',
    posicion                TEXT NOT NULL,          -- Ej: R07, 107
    aeropasillo_numero      TEXT,                   -- Número del pasillo (1, 2, …)
    aeropasillo_dedo        TEXT CHECK (aeropasillo_dedo IN ('A','B',NULL)),
    matricula               TEXT,
    linea_aerea             TEXT,
    aeronave                TEXT,
    empleado_acople         TEXT,
    -- LLEGADA
    lleg_no_vuelo           TEXT,
    lleg_origen             TEXT,
    lleg_h_calzos           TIME,
    lleg_auth_acople        TIME,
    lleg_h_acople           TIME,
    lleg_no_pax             TEXT,                   -- puede ser "N/A"
    lleg_empleado_desacople TEXT,
    -- SALIDA
    sal_no_vuelo            TEXT,
    sal_destino             TEXT,
    sal_no_pax              TEXT,
    sal_cierre_puerta       TIME,
    sal_h_desacople         TIME,
    sal_h_salida            TIME,
    sal_tiempo_total        TEXT,                   -- Ej: "64 min"
    -- SERVICIOS
    gpu_h_inicio            TIME,
    gpu_h_termino           TIME,
    gpu_tiempo_total        TEXT,
    gpu_encargado           TEXT,
    pca_h_inicio            TIME,
    pca_h_termino           TIME,
    pca_tiempo_total        TEXT,
    pca_encargado           TEXT,
    -- OBSERVACIONES
    obs_aerolinea_nombre    TEXT,
    obs_operador_nombre     TEXT,
    observaciones           TEXT,
    nombre_coordinador      TEXT,
    created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rsa_fecha    ON registros_servicio_aeropasillos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rsa_posicion ON registros_servicio_aeropasillos (posicion);
CREATE INDEX IF NOT EXISTS idx_rsa_vuelo    ON registros_servicio_aeropasillos (lleg_no_vuelo, sal_no_vuelo);

-- RLS
ALTER TABLE registros_servicio_aeropasillos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsa_select_authed" ON registros_servicio_aeropasillos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "rsa_insert_authed" ON registros_servicio_aeropasillos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "rsa_update_admin" ON registros_servicio_aeropasillos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor')
        )
    );

CREATE POLICY "rsa_delete_admin" ON registros_servicio_aeropasillos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor')
        )
    );
