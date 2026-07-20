-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla: colab_historial
-- Registra cada cambio efectuado en los datos de un colaborador (agenda_2026)
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS colab_historial (
    id              BIGSERIAL PRIMARY KEY,
    num_empleado    TEXT        NOT NULL,       -- No. de empleado (clave de búsqueda)
    campo           TEXT        NOT NULL,       -- nombre semántico del campo (e.g. 'nivel')
    valor_anterior  TEXT,                       -- valor antes del cambio (NULL si estaba vacío)
    valor_nuevo     TEXT,                       -- valor después del cambio (NULL si se borró)
    usuario_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_nombre  TEXT,                       -- nombre legible del usuario que editó
    fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida por colaborador
CREATE INDEX IF NOT EXISTS idx_colab_historial_num
    ON colab_historial (num_empleado);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_colab_historial_fecha
    ON colab_historial (fecha DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE colab_historial ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer el historial
CREATE POLICY "auth_can_read_historial"
    ON colab_historial FOR SELECT
    USING (auth.role() = 'authenticated');

-- Cualquier usuario autenticado puede insertar (el control real es en la app)
CREATE POLICY "auth_can_insert_historial"
    ON colab_historial FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Sólo el service_role puede eliminar (para auditoría no se borra desde el cliente)
-- (No se define política DELETE para rol authenticated → queda bloqueado por RLS)
