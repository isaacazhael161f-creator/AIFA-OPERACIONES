-- ============================================================
-- gtrans_mantenimientos_schema.sql
-- Módulo: Gerencia de Transformación (GTRANS) · Subdirección SGE
-- Ejecutar en Supabase → Database → SQL editor
--
-- Crea las tablas de mantenimientos preventivos / correctivos
-- de baja tensión, la meta anual de preventivos, vistas para
-- gráficos, RLS por sección y carga los datos reales 2026
-- (FEB–MAY) tomados del cuadro del área.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0) Función de updated_at compartida
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gtrans_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 1) MANTENIMIENTOS DE BAJA TENSIÓN  (registro mensual)
-- ════════════════════════════════════════════════════════════
-- Refleja el cuadro:
--   "Mantenimientos preventivos y correctivos del servicio de
--    mantenimiento y conservación para la utilización de la
--    energía eléctrica en baja tensión."
--
-- Columnas:
--   preventivos_realizados   -- contadas en el mes
--   preventivos_programados  -- programadas en el mes (plan)
--   correctivos_luminarias   -- luminarias reemplazadas
CREATE TABLE IF NOT EXISTS public.gtrans_mantenimientos_bt (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio                     SMALLINT NOT NULL,
    mes_num                  SMALLINT NOT NULL CHECK (mes_num BETWEEN 1 AND 12),
    mes_nombre               TEXT NOT NULL,
    preventivos_realizados   INTEGER NOT NULL DEFAULT 0 CHECK (preventivos_realizados   >= 0),
    preventivos_programados  INTEGER NOT NULL DEFAULT 0 CHECK (preventivos_programados  >= 0),
    correctivos_luminarias   INTEGER NOT NULL DEFAULT 0 CHECK (correctivos_luminarias   >= 0),
    observaciones            TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (anio, mes_num)
);

CREATE INDEX IF NOT EXISTS idx_gtrans_bt_anio     ON public.gtrans_mantenimientos_bt (anio);
CREATE INDEX IF NOT EXISTS idx_gtrans_bt_anio_mes ON public.gtrans_mantenimientos_bt (anio, mes_num);

DROP TRIGGER IF EXISTS trg_gtrans_bt_updated ON public.gtrans_mantenimientos_bt;
CREATE TRIGGER trg_gtrans_bt_updated
    BEFORE UPDATE ON public.gtrans_mantenimientos_bt
    FOR EACH ROW EXECUTE FUNCTION public.gtrans_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 2) META ANUAL  (programa anual de preventivos)
-- ════════════════════════════════════════════════════════════
-- Una fila por año. Sirve para calcular el "% de avance" mostrado
-- en el resumen del área (p.ej. 23 / 40 = 57.50 % a mayo).
CREATE TABLE IF NOT EXISTS public.gtrans_meta_anual (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio                        SMALLINT NOT NULL UNIQUE,
    preventivos_anual_meta      INTEGER NOT NULL DEFAULT 0 CHECK (preventivos_anual_meta >= 0),
    correctivos_anual_meta      INTEGER,                       -- opcional, NULL si no se traza meta
    observaciones               TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_gtrans_meta_updated ON public.gtrans_meta_anual;
CREATE TRIGGER trg_gtrans_meta_updated
    BEFORE UPDATE ON public.gtrans_meta_anual
    FOR EACH ROW EXECUTE FUNCTION public.gtrans_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 3) DATOS REALES 2026
-- ════════════════════════════════════════════════════════════
INSERT INTO public.gtrans_mantenimientos_bt
    (anio, mes_num, mes_nombre, preventivos_realizados, preventivos_programados, correctivos_luminarias) VALUES
    (2026, 2, 'FEBRERO', 8, 8, 37),
    (2026, 3, 'MARZO',   8, 8, 25),
    (2026, 4, 'ABRIL',   4, 4, 66),
    (2026, 5, 'MAYO',    3, 3, 67)
ON CONFLICT (anio, mes_num) DO UPDATE SET
    preventivos_realizados  = EXCLUDED.preventivos_realizados,
    preventivos_programados = EXCLUDED.preventivos_programados,
    correctivos_luminarias  = EXCLUDED.correctivos_luminarias,
    mes_nombre              = EXCLUDED.mes_nombre,
    updated_at              = NOW();

INSERT INTO public.gtrans_meta_anual (anio, preventivos_anual_meta) VALUES (2026, 40)
ON CONFLICT (anio) DO UPDATE SET
    preventivos_anual_meta = EXCLUDED.preventivos_anual_meta,
    updated_at             = NOW();


-- ════════════════════════════════════════════════════════════
-- 4) VISTAS PARA GRÁFICOS / KPIs
-- ════════════════════════════════════════════════════════════

-- 4.1 Cumplimiento mensual: Realizados / Programados ----------
CREATE OR REPLACE VIEW public.v_gtrans_cumplimiento_mensual AS
SELECT
    anio,
    mes_num,
    mes_nombre,
    preventivos_realizados,
    preventivos_programados,
    correctivos_luminarias,
    CASE WHEN preventivos_programados > 0
         THEN ROUND(100.0 * preventivos_realizados / preventivos_programados, 2)
         ELSE NULL END                                          AS pct_cumplimiento
FROM public.gtrans_mantenimientos_bt;

-- 4.2 Resumen anual + avance vs meta (tarjetas KPI) -----------
CREATE OR REPLACE VIEW public.v_gtrans_resumen_anual AS
WITH tot AS (
    SELECT
        anio,
        SUM(preventivos_realizados)   AS realizados_ytd,
        SUM(preventivos_programados)  AS programados_ytd,
        SUM(correctivos_luminarias)   AS luminarias_ytd,
        COUNT(*)                       AS meses_con_dato
    FROM public.gtrans_mantenimientos_bt
    GROUP BY anio
)
SELECT
    t.anio,
    t.realizados_ytd,
    t.programados_ytd,
    t.luminarias_ytd,
    t.meses_con_dato,
    m.preventivos_anual_meta,
    CASE WHEN COALESCE(m.preventivos_anual_meta,0) > 0
         THEN ROUND(100.0 * t.realizados_ytd / m.preventivos_anual_meta, 2)
         ELSE NULL END                                         AS pct_avance_anual,
    CASE WHEN t.programados_ytd > 0
         THEN ROUND(100.0 * t.realizados_ytd / t.programados_ytd, 2)
         ELSE NULL END                                         AS pct_cumplimiento_ytd
FROM tot t
LEFT JOIN public.gtrans_meta_anual m ON m.anio = t.anio
ORDER BY t.anio DESC;

-- 4.3 Vista larga (formato Chart.js) --------------------------
CREATE OR REPLACE VIEW public.v_gtrans_unificada AS
SELECT anio, mes_num, mes_nombre, 'preventivos_realizados'::TEXT  AS metrica, preventivos_realizados  AS valor FROM public.gtrans_mantenimientos_bt
UNION ALL
SELECT anio, mes_num, mes_nombre, 'preventivos_programados',                       preventivos_programados FROM public.gtrans_mantenimientos_bt
UNION ALL
SELECT anio, mes_num, mes_nombre, 'correctivos_luminarias',                        correctivos_luminarias  FROM public.gtrans_mantenimientos_bt;


-- ════════════════════════════════════════════════════════════
-- 5) ROW LEVEL SECURITY
-- Sección lógica: 'gtrans-energia'
-- Requiere public.user_can_access_section(text) ya definida.
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.gtrans_mantenimientos_bt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtrans_meta_anual        ENABLE ROW LEVEL SECURITY;

-- 5.1 Lectura -------------------------------------------------
DROP POLICY IF EXISTS "gtrans_bt_select" ON public.gtrans_mantenimientos_bt;
CREATE POLICY "gtrans_bt_select"
    ON public.gtrans_mantenimientos_bt FOR SELECT TO authenticated
    USING (public.user_can_access_section('gtrans-energia'));

DROP POLICY IF EXISTS "gtrans_meta_select" ON public.gtrans_meta_anual;
CREATE POLICY "gtrans_meta_select"
    ON public.gtrans_meta_anual FOR SELECT TO authenticated
    USING (public.user_can_access_section('gtrans-energia'));

-- 5.2 Escritura (admin / superadmin / editor con la sección) --
CREATE OR REPLACE FUNCTION public.gtrans_can_write()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('admin','superadmin') THEN RETURN TRUE; END IF;
    IF v_role = 'editor' AND public.user_can_access_section('gtrans-energia') THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gtrans_can_write() TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['gtrans_mantenimientos_bt','gtrans_meta_anual']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.gtrans_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.gtrans_can_write()) WITH CHECK (public.gtrans_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.gtrans_can_write())', t, t);
    END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- 6) VERIFICACIÓN RÁPIDA (opcional)
-- ════════════════════════════════════════════════════════════
-- SELECT * FROM public.v_gtrans_cumplimiento_mensual ORDER BY anio, mes_num;
-- SELECT * FROM public.v_gtrans_resumen_anual;
-- SELECT * FROM public.v_gtrans_unificada            ORDER BY anio, metrica, mes_num;

-- Fin del fichero
