-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: Demoras
-- Operaciones de vuelo mensuales con registro de demoras para AIFA
-- Ejecutar en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Crear tabla si no existe
-- Los nombres de columna coinciden exactamente con los del archivo Excel mensual.
-- Las columnas de fecha/hora se almacenan como TIMESTAMPTZ (el JS convierte seriales Excel a ISO).

CREATE TABLE IF NOT EXISTS public."Demoras" (
    id                          BIGSERIAL        PRIMARY KEY,

    -- Identificador de fila dentro del mes
    "No"                        INTEGER,

    -- Fecha/hora del movimiento (Excel serial → ISO timestamp)
    "Aterrizaje_Despegue"       TIMESTAMPTZ,

    -- Datos del vuelo
    "Aerolinea"                 TEXT,
    "Tipo_Avion"                TEXT,
    "Matricula"                 TEXT,
    "No_Vuelo"                  TEXT,
    "Ruta"                      TEXT,

    -- Horas programada y real
    "Hora_Programada"           TIMESTAMPTZ,
    "Hora_Actual"               TIMESTAMPTZ,

    -- Demora en minutos (negativo = adelantado)
    "Tiempo_Demora"             INTEGER,
    "Codigo_Demora"             TEXT,

    -- Pasajeros a bordo
    "Pasajeros"                 INTEGER,

    -- Clasificación
    "Domestic_International"    TEXT,
    "Tipo_Servicio"             TEXT,
    "Motivo"                    TEXT,
    "Estatus"                   TEXT,
    "Llegada_Salida"            TEXT,

    -- Código posición / AFAC
    "Codigo_AFAC_AIFA"          TEXT,
    "Totales_Servicio"          TEXT,
    "Demoras_col"               TEXT,    -- columna "Demoras" del Excel (renombrada para evitar conflicto con tabla)
    "Puntualidad"               TEXT,
    "Puntualidad_Compania"      TEXT,
    "Posicion"                  TEXT,

    -- Periodo (enteros para indexar)
    "MES"                       SMALLINT   NOT NULL,
    "ANIO"                      SMALLINT   NOT NULL,

    created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para mejorar rendimiento de consultas por periodo
CREATE INDEX IF NOT EXISTS idx_demoras_mes_anio
    ON public."Demoras" ("ANIO", "MES");

CREATE INDEX IF NOT EXISTS idx_demoras_aerolinea
    ON public."Demoras" ("Aerolinea");

CREATE INDEX IF NOT EXISTS idx_demoras_estatus
    ON public."Demoras" ("Estatus");

-- 3. Habilitar RLS
ALTER TABLE public."Demoras" ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Lectura: cualquier usuario autenticado
CREATE POLICY "demoras_select_auth"
    ON public."Demoras" FOR SELECT
    TO authenticated
    USING (true);

-- Escritura (INSERT / UPDATE / DELETE): solo roles admin, superadmin, editor
CREATE POLICY "demoras_insert_privileged"
    ON public."Demoras" FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor')
        )
    );

CREATE POLICY "demoras_delete_privileged"
    ON public."Demoras" FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor')
        )
    );

CREATE POLICY "demoras_update_privileged"
    ON public."Demoras" FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor')
        )
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- NOTA: Si la tabla ya existe con columnas de nombre diferente (p. ej. con
-- acentos o espacios), ejecuta las siguientes sentencias ALTER TABLE para
-- alinear los nombres con lo que espera el módulo de importación.
-- Ajusta según los nombres reales de tu tabla existente.
--
-- Ejemplo:
--   ALTER TABLE public."Demoras" RENAME COLUMN "Aerolínea" TO "Aerolinea";
--   ALTER TABLE public."Demoras" RENAME COLUMN "Hora Actual " TO "Hora_Actual";
-- ══════════════════════════════════════════════════════════════════════════════
