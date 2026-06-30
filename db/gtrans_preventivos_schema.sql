-- ============================================================
-- gtrans_preventivos_schema.sql
-- Módulo: Gerencia de Transformación → Preventivos Programados
-- Submódulo de SGE/GTRANS. Sección lógica: 'gtrans-preventivos'.
--
-- Modela el "Servicio de Mantenimiento Preventivo (Programado)":
--   8 tipos de equipo × 12 meses × (programado, ejecutado).
--
-- Diseño:
--   • gtrans_equipo_tipo        → catálogo de equipos (lookup)
--   • gtrans_preventivo_mensual → datos mensuales (FK a catálogo)
--   • Vistas para gráficas/tabla pivote y % de avance.
--
-- Ejecutar en Supabase → Database → SQL editor.
-- Requiere public.user_can_access_section(text) ya definida.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0) Función de updated_at compartida (reutiliza si ya existe)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gtrans_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 1) CATÁLOGO DE TIPOS DE EQUIPO
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gtrans_equipo_tipo (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo     TEXT    NOT NULL UNIQUE,
    nombre     TEXT    NOT NULL,
    orden      INTEGER NOT NULL DEFAULT 0,
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_gtrans_equipo_updated ON public.gtrans_equipo_tipo;
CREATE TRIGGER trg_gtrans_equipo_updated
    BEFORE UPDATE ON public.gtrans_equipo_tipo
    FOR EACH ROW EXECUTE FUNCTION public.gtrans_set_updated_at();

INSERT INTO public.gtrans_equipo_tipo (codigo, nombre, orden) VALUES
    ('TR_PED',  'Transformador tipo pedestal',          1),
    ('TR_SECO', 'Transformador tipo seco encapsulado',  2),
    ('TR_SUB',  'Transformador tipo subestación',       3),
    ('TR_POT',  'Transformador de potencia',            4),
    ('SEC_PED', 'Seccionador tipo pedestal',            5),
    ('CMT',     'Celda de media tensión',               6),
    ('RECT',    'Rectificador de voltaje',              7),
    ('TBL_MC',  'Tablero metalclad',                    8)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    orden  = EXCLUDED.orden,
    updated_at = NOW();


-- ════════════════════════════════════════════════════════════
-- 2) DATOS MENSUALES (programado / ejecutado)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.gtrans_preventivo_mensual (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio          SMALLINT NOT NULL,
    mes_num       SMALLINT NOT NULL CHECK (mes_num BETWEEN 1 AND 12),
    mes_nombre    TEXT     NOT NULL,
    equipo_id     BIGINT   NOT NULL REFERENCES public.gtrans_equipo_tipo(id) ON DELETE CASCADE,
    programado    INTEGER  NOT NULL DEFAULT 0 CHECK (programado >= 0),
    ejecutado     INTEGER  NOT NULL DEFAULT 0 CHECK (ejecutado  >= 0),
    observaciones TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (anio, mes_num, equipo_id)
);

CREATE INDEX IF NOT EXISTS idx_gtrans_prev_anio        ON public.gtrans_preventivo_mensual (anio);
CREATE INDEX IF NOT EXISTS idx_gtrans_prev_anio_mes    ON public.gtrans_preventivo_mensual (anio, mes_num);
CREATE INDEX IF NOT EXISTS idx_gtrans_prev_equipo      ON public.gtrans_preventivo_mensual (equipo_id);

DROP TRIGGER IF EXISTS trg_gtrans_prev_updated ON public.gtrans_preventivo_mensual;
CREATE TRIGGER trg_gtrans_prev_updated
    BEFORE UPDATE ON public.gtrans_preventivo_mensual
    FOR EACH ROW EXECUTE FUNCTION public.gtrans_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 3) DATOS REALES 2026  (extraídos del cuadro)
-- ════════════════════════════════════════════════════════════
-- Se cargan solo las filas con programado>0 (ó ejecutado>0).
-- El resto queda implícito = 0 vía COALESCE en las vistas.
WITH meses(num, nombre) AS (VALUES
    (1,'ENERO'),(2,'FEBRERO'),(3,'MARZO'),(4,'ABRIL'),
    (5,'MAYO'),(6,'JUNIO'),(7,'JULIO'),(8,'AGOSTO'),
    (9,'SEPTIEMBRE'),(10,'OCTUBRE'),(11,'NOVIEMBRE'),(12,'DICIEMBRE')),
datos(codigo, mes_num, programado, ejecutado) AS (VALUES
    -- Transformador tipo pedestal
    ('TR_PED',  1, 31, 31), ('TR_PED',  2, 26, 26), ('TR_PED',  3, 24, 24),
    ('TR_PED',  4,  8,  8), ('TR_PED',  6, 79, 79), ('TR_PED',  7, 50,  0),
    ('TR_PED',  8, 68,  0), ('TR_PED',  9, 26,  0),
    -- Transformador tipo seco encapsulado
    ('TR_SECO', 4,  1,  1), ('TR_SECO', 7,  2,  0), ('TR_SECO', 8,  1,  0),
    ('TR_SECO', 9,  7,  0), ('TR_SECO',10, 15,  0), ('TR_SECO',11, 18,  0),
    -- Transformador tipo subestación
    ('TR_SUB',  7,  2,  0), ('TR_SUB',  9,  3,  0),
    -- Transformador de potencia
    ('TR_POT',  1,  1,  1),
    -- Seccionador tipo pedestal
    ('SEC_PED', 1,  6,  6), ('SEC_PED', 2,  3,  3), ('SEC_PED', 3, 12, 12),
    ('SEC_PED', 4, 10, 10), ('SEC_PED', 5,  4,  4), ('SEC_PED', 6,  3,  3),
    ('SEC_PED', 7,  4,  0), ('SEC_PED', 8,  1,  0), ('SEC_PED', 9,  3,  0),
    -- Celda de media tensión
    ('CMT',     9, 39,  0), ('CMT',    10, 32,  0), ('CMT',    11, 25,  0),
    -- Rectificador de voltaje
    ('RECT',    5, 11, 11),
    -- Tablero metalclad
    ('TBL_MC',  9,  2,  0))
INSERT INTO public.gtrans_preventivo_mensual
    (anio, mes_num, mes_nombre, equipo_id, programado, ejecutado)
SELECT 2026, d.mes_num, m.nombre, e.id, d.programado, d.ejecutado
FROM   datos d
JOIN   meses m                       ON m.num    = d.mes_num
JOIN   public.gtrans_equipo_tipo e   ON e.codigo = d.codigo
ON CONFLICT (anio, mes_num, equipo_id) DO UPDATE SET
    programado = EXCLUDED.programado,
    ejecutado  = EXCLUDED.ejecutado,
    mes_nombre = EXCLUDED.mes_nombre,
    updated_at = NOW();


-- ════════════════════════════════════════════════════════════
-- 4) VISTAS PARA GRÁFICOS / TABLA
-- ════════════════════════════════════════════════════════════

-- 4.1 Vista pivote: 1 fila por (anio, equipo), 12×2 columnas ----
-- Útil para reproducir el cuadro original tal cual.
CREATE OR REPLACE VIEW public.v_gtrans_preventivo_pivot AS
SELECT
    e.id              AS equipo_id,
    e.codigo,
    e.nombre,
    e.orden,
    p.anio,
    SUM(CASE WHEN p.mes_num=1  THEN p.programado END) AS p_ene, SUM(CASE WHEN p.mes_num=1  THEN p.ejecutado END) AS e_ene,
    SUM(CASE WHEN p.mes_num=2  THEN p.programado END) AS p_feb, SUM(CASE WHEN p.mes_num=2  THEN p.ejecutado END) AS e_feb,
    SUM(CASE WHEN p.mes_num=3  THEN p.programado END) AS p_mar, SUM(CASE WHEN p.mes_num=3  THEN p.ejecutado END) AS e_mar,
    SUM(CASE WHEN p.mes_num=4  THEN p.programado END) AS p_abr, SUM(CASE WHEN p.mes_num=4  THEN p.ejecutado END) AS e_abr,
    SUM(CASE WHEN p.mes_num=5  THEN p.programado END) AS p_may, SUM(CASE WHEN p.mes_num=5  THEN p.ejecutado END) AS e_may,
    SUM(CASE WHEN p.mes_num=6  THEN p.programado END) AS p_jun, SUM(CASE WHEN p.mes_num=6  THEN p.ejecutado END) AS e_jun,
    SUM(CASE WHEN p.mes_num=7  THEN p.programado END) AS p_jul, SUM(CASE WHEN p.mes_num=7  THEN p.ejecutado END) AS e_jul,
    SUM(CASE WHEN p.mes_num=8  THEN p.programado END) AS p_ago, SUM(CASE WHEN p.mes_num=8  THEN p.ejecutado END) AS e_ago,
    SUM(CASE WHEN p.mes_num=9  THEN p.programado END) AS p_sep, SUM(CASE WHEN p.mes_num=9  THEN p.ejecutado END) AS e_sep,
    SUM(CASE WHEN p.mes_num=10 THEN p.programado END) AS p_oct, SUM(CASE WHEN p.mes_num=10 THEN p.ejecutado END) AS e_oct,
    SUM(CASE WHEN p.mes_num=11 THEN p.programado END) AS p_nov, SUM(CASE WHEN p.mes_num=11 THEN p.ejecutado END) AS e_nov,
    SUM(CASE WHEN p.mes_num=12 THEN p.programado END) AS p_dic, SUM(CASE WHEN p.mes_num=12 THEN p.ejecutado END) AS e_dic
FROM public.gtrans_equipo_tipo e
LEFT JOIN public.gtrans_preventivo_mensual p ON p.equipo_id = e.id
WHERE e.activo
GROUP BY e.id, e.codigo, e.nombre, e.orden, p.anio
ORDER BY p.anio NULLS LAST, e.orden;

-- 4.2 Totales mensuales y porcentaje vs programa anual ---------
CREATE OR REPLACE VIEW public.v_gtrans_preventivo_resumen AS
WITH tot_mes AS (
    SELECT
        anio,
        mes_num,
        MAX(mes_nombre)         AS mes_nombre,
        SUM(programado)         AS programado_mes,
        SUM(ejecutado)          AS ejecutado_mes
    FROM public.gtrans_preventivo_mensual
    GROUP BY anio, mes_num
),
tot_anio AS (
    SELECT anio,
           SUM(programado_mes) AS programado_anual,
           SUM(ejecutado_mes)  AS ejecutado_anual
    FROM tot_mes GROUP BY anio
)
SELECT
    m.anio,
    m.mes_num,
    m.mes_nombre,
    m.programado_mes,
    m.ejecutado_mes,
    a.programado_anual,
    a.ejecutado_anual,
    CASE WHEN a.programado_anual > 0
         THEN ROUND(100.0 * m.programado_mes / a.programado_anual, 4)
         ELSE NULL END AS pct_programado_mes,
    CASE WHEN a.programado_anual > 0
         THEN ROUND(100.0 * m.ejecutado_mes  / a.programado_anual, 4)
         ELSE NULL END AS pct_ejecutado_mes,
    CASE WHEN m.programado_mes > 0
         THEN ROUND(100.0 * m.ejecutado_mes  / m.programado_mes, 2)
         ELSE NULL END AS pct_cumplimiento_mes
FROM tot_mes m
JOIN tot_anio a ON a.anio = m.anio
ORDER BY m.anio DESC, m.mes_num;

-- 4.3 KPI anual: avance global vs programa ---------------------
CREATE OR REPLACE VIEW public.v_gtrans_preventivo_avance AS
SELECT
    anio,
    SUM(programado)                          AS programado_anual,
    SUM(ejecutado)                           AS ejecutado_anual,
    COUNT(DISTINCT equipo_id)                AS equipos_con_plan,
    COUNT(DISTINCT mes_num)
        FILTER (WHERE ejecutado > 0)         AS meses_con_ejecucion,
    CASE WHEN SUM(programado) > 0
         THEN ROUND(100.0 * SUM(ejecutado) / SUM(programado), 2)
         ELSE NULL END                       AS pct_avance_anual
FROM public.gtrans_preventivo_mensual
GROUP BY anio
ORDER BY anio DESC;

-- 4.4 Programa anual por tipo de equipo (para doughnut) --------
CREATE OR REPLACE VIEW public.v_gtrans_preventivo_por_equipo AS
SELECT
    p.anio,
    e.id    AS equipo_id,
    e.codigo,
    e.nombre,
    e.orden,
    SUM(p.programado) AS programado_anual,
    SUM(p.ejecutado)  AS ejecutado_anual,
    CASE WHEN SUM(p.programado) > 0
         THEN ROUND(100.0 * SUM(p.ejecutado) / SUM(p.programado), 2)
         ELSE NULL END AS pct_avance
FROM public.gtrans_equipo_tipo e
LEFT JOIN public.gtrans_preventivo_mensual p ON p.equipo_id = e.id
WHERE e.activo
GROUP BY p.anio, e.id, e.codigo, e.nombre, e.orden
ORDER BY p.anio DESC NULLS LAST, e.orden;


-- ════════════════════════════════════════════════════════════
-- 5) ROW LEVEL SECURITY
-- Sección lógica: 'gtrans-preventivos'
-- Reutiliza el helper public.gtrans_can_write() pero
-- aplicado a la nueva sección (se crea variante específica).
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.gtrans_equipo_tipo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtrans_preventivo_mensual  ENABLE ROW LEVEL SECURITY;

-- 5.1 Lectura --------------------------------------------------
DROP POLICY IF EXISTS "gtrans_eq_select" ON public.gtrans_equipo_tipo;
CREATE POLICY "gtrans_eq_select"
    ON public.gtrans_equipo_tipo FOR SELECT TO authenticated
    USING (public.user_can_access_section('gtrans-preventivos'));

DROP POLICY IF EXISTS "gtrans_prev_select" ON public.gtrans_preventivo_mensual;
CREATE POLICY "gtrans_prev_select"
    ON public.gtrans_preventivo_mensual FOR SELECT TO authenticated
    USING (public.user_can_access_section('gtrans-preventivos'));

-- 5.2 Helper específico para escritura -------------------------
CREATE OR REPLACE FUNCTION public.gtrans_prev_can_write()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('admin','superadmin') THEN RETURN TRUE; END IF;
    IF v_role = 'editor' AND public.user_can_access_section('gtrans-preventivos') THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gtrans_prev_can_write() TO authenticated;

-- 5.3 Escritura ------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['gtrans_equipo_tipo','gtrans_preventivo_mensual']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.gtrans_prev_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.gtrans_prev_can_write()) WITH CHECK (public.gtrans_prev_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.gtrans_prev_can_write())', t, t);
    END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- 6) VERIFICACIÓN RÁPIDA (opcional)
-- ════════════════════════════════════════════════════════════
-- SELECT * FROM public.v_gtrans_preventivo_pivot     WHERE anio = 2026;
-- SELECT * FROM public.v_gtrans_preventivo_resumen   WHERE anio = 2026 ORDER BY mes_num;
-- SELECT * FROM public.v_gtrans_preventivo_avance;
-- SELECT * FROM public.v_gtrans_preventivo_por_equipo WHERE anio = 2026;

-- Fin del fichero
