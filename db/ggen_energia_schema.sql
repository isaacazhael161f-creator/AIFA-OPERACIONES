-- ============================================================
-- ggen_energia_schema.sql
-- Módulo: Gerencia de Generación (GGEN) · Subdirección SGE
-- Ejecutar en Supabase → Database → SQL editor
--
-- Crea 3 tablas mensuales (eléctrica, térmica, gas natural),
-- vistas auxiliares para gráficos, RLS por sección y carga
-- los datos reales de 2026 (ENE–MAY).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0) Función de updated_at compartida
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ggen_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════
-- 1) ENERGÍA ELÉCTRICA  (generación propia vs consumo CFE)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ggen_energia_electrica (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio              SMALLINT NOT NULL,
    mes_num           SMALLINT NOT NULL CHECK (mes_num BETWEEN 1 AND 12),
    mes_nombre        TEXT NOT NULL,
    generada_kwh      NUMERIC(16,2) NOT NULL DEFAULT 0,
    consumo_cfe_kwh   NUMERIC(16,2) NOT NULL DEFAULT 0,
    observaciones     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (anio, mes_num)
);

CREATE INDEX IF NOT EXISTS idx_ggen_elec_anio      ON public.ggen_energia_electrica (anio);
CREATE INDEX IF NOT EXISTS idx_ggen_elec_anio_mes  ON public.ggen_energia_electrica (anio, mes_num);

DROP TRIGGER IF EXISTS trg_ggen_elec_updated ON public.ggen_energia_electrica;
CREATE TRIGGER trg_ggen_elec_updated
    BEFORE UPDATE ON public.ggen_energia_electrica
    FOR EACH ROW EXECUTE FUNCTION public.ggen_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 2) ENERGÍA TÉRMICA PRODUCIDA  (TRh)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ggen_energia_termica (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio              SMALLINT NOT NULL,
    mes_num           SMALLINT NOT NULL CHECK (mes_num BETWEEN 1 AND 12),
    mes_nombre        TEXT NOT NULL,
    trh               NUMERIC(16,2) NOT NULL DEFAULT 0,
    observaciones     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (anio, mes_num)
);

CREATE INDEX IF NOT EXISTS idx_ggen_term_anio      ON public.ggen_energia_termica (anio);
CREATE INDEX IF NOT EXISTS idx_ggen_term_anio_mes  ON public.ggen_energia_termica (anio, mes_num);

DROP TRIGGER IF EXISTS trg_ggen_term_updated ON public.ggen_energia_termica;
CREATE TRIGGER trg_ggen_term_updated
    BEFORE UPDATE ON public.ggen_energia_termica
    FOR EACH ROW EXECUTE FUNCTION public.ggen_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 3) CONSUMO DE GAS NATURAL  (Gigajoules)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ggen_consumo_gas (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anio              SMALLINT NOT NULL,
    mes_num           SMALLINT NOT NULL CHECK (mes_num BETWEEN 1 AND 12),
    mes_nombre        TEXT NOT NULL,
    gigajoules        NUMERIC(16,4) NOT NULL DEFAULT 0,
    observaciones     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (anio, mes_num)
);

CREATE INDEX IF NOT EXISTS idx_ggen_gas_anio      ON public.ggen_consumo_gas (anio);
CREATE INDEX IF NOT EXISTS idx_ggen_gas_anio_mes  ON public.ggen_consumo_gas (anio, mes_num);

DROP TRIGGER IF EXISTS trg_ggen_gas_updated ON public.ggen_consumo_gas;
CREATE TRIGGER trg_ggen_gas_updated
    BEFORE UPDATE ON public.ggen_consumo_gas
    FOR EACH ROW EXECUTE FUNCTION public.ggen_set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 4) DATOS REALES 2026 (ENE–MAY)
-- ════════════════════════════════════════════════════════════

INSERT INTO public.ggen_energia_electrica
    (anio, mes_num, mes_nombre, generada_kwh, consumo_cfe_kwh) VALUES
    (2026, 1, 'ENERO',   5222470.98, 1442040.00),
    (2026, 2, 'FEBRERO', 4493335.54, 2409550.00),
    (2026, 3, 'MARZO',         0.00, 7477310.00),
    (2026, 4, 'ABRIL',   3160952.51, 4265650.00),
    (2026, 5, 'MAYO',    5296442.14, 2697210.00)
ON CONFLICT (anio, mes_num) DO UPDATE SET
    generada_kwh    = EXCLUDED.generada_kwh,
    consumo_cfe_kwh = EXCLUDED.consumo_cfe_kwh,
    mes_nombre      = EXCLUDED.mes_nombre,
    updated_at      = NOW();

INSERT INTO public.ggen_energia_termica
    (anio, mes_num, mes_nombre, trh) VALUES
    (2026, 1, 'ENERO',    728374.99),
    (2026, 2, 'FEBRERO',  672185.32),
    (2026, 3, 'MARZO',   1076116.83),
    (2026, 4, 'ABRIL',    982976.14),
    (2026, 5, 'MAYO',     978340.07)
ON CONFLICT (anio, mes_num) DO UPDATE SET
    trh        = EXCLUDED.trh,
    mes_nombre = EXCLUDED.mes_nombre,
    updated_at = NOW();

INSERT INTO public.ggen_consumo_gas
    (anio, mes_num, mes_nombre, gigajoules) VALUES
    (2026, 1, 'ENERO',   74139.2700),
    (2026, 2, 'FEBRERO', 57133.8200),
    (2026, 3, 'MARZO',     690.1213),
    (2026, 4, 'ABRIL',   40545.0600),
    (2026, 5, 'MAYO',    64724.5900)
ON CONFLICT (anio, mes_num) DO UPDATE SET
    gigajoules = EXCLUDED.gigajoules,
    mes_nombre = EXCLUDED.mes_nombre,
    updated_at = NOW();


-- ════════════════════════════════════════════════════════════
-- 5) VISTAS PARA GRÁFICOS
-- ════════════════════════════════════════════════════════════

-- 5.1 Balance eléctrico mensual (autogeneración vs CFE) -------
-- Útil para barras agrupadas + KPI de % autogenerado.
CREATE OR REPLACE VIEW public.v_ggen_balance_electrico AS
SELECT
    anio,
    mes_num,
    mes_nombre,
    generada_kwh,
    consumo_cfe_kwh,
    (generada_kwh - consumo_cfe_kwh)                       AS neto_kwh,
    (generada_kwh + consumo_cfe_kwh)                       AS demanda_total_kwh,
    CASE WHEN (generada_kwh + consumo_cfe_kwh) > 0
         THEN ROUND(100.0 * generada_kwh
                          / (generada_kwh + consumo_cfe_kwh), 2)
         ELSE 0 END                                        AS pct_autogenerada
FROM public.ggen_energia_electrica;

-- 5.2 Vista unificada (formato largo) -------------------------
-- Pensada para Chart.js: filtras por `metrica` y obtienes
-- (mes_num, valor) listo para graficar.
CREATE OR REPLACE VIEW public.v_ggen_energia_unificada AS
SELECT anio, mes_num, mes_nombre,
       'electrica_generada'::TEXT     AS metrica,
       'kWh'::TEXT                    AS unidad,
       generada_kwh                   AS valor
  FROM public.ggen_energia_electrica
UNION ALL
SELECT anio, mes_num, mes_nombre,
       'electrica_consumo_cfe', 'kWh', consumo_cfe_kwh
  FROM public.ggen_energia_electrica
UNION ALL
SELECT anio, mes_num, mes_nombre,
       'termica_trh', 'TRh', trh
  FROM public.ggen_energia_termica
UNION ALL
SELECT anio, mes_num, mes_nombre,
       'gas_gigajoules', 'GJ', gigajoules
  FROM public.ggen_consumo_gas;

-- 5.3 Resumen YTD / acumulados por año -----------------------
-- Para tarjetas KPI (totales + promedios).
CREATE OR REPLACE VIEW public.v_ggen_resumen_anual AS
WITH anios AS (
    SELECT DISTINCT anio FROM public.ggen_energia_electrica
    UNION SELECT DISTINCT anio FROM public.ggen_energia_termica
    UNION SELECT DISTINCT anio FROM public.ggen_consumo_gas
)
SELECT
    a.anio,
    COALESCE((SELECT SUM(generada_kwh)    FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) AS total_generada_kwh,
    COALESCE((SELECT SUM(consumo_cfe_kwh) FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) AS total_consumo_cfe_kwh,
    COALESCE((SELECT AVG(NULLIF(generada_kwh,0))    FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) AS prom_generada_kwh,
    COALESCE((SELECT AVG(NULLIF(consumo_cfe_kwh,0)) FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) AS prom_consumo_cfe_kwh,
    COALESCE((SELECT SUM(trh)        FROM public.ggen_energia_termica WHERE anio = a.anio), 0) AS total_trh,
    COALESCE((SELECT AVG(NULLIF(trh,0)) FROM public.ggen_energia_termica WHERE anio = a.anio), 0) AS prom_trh,
    COALESCE((SELECT SUM(gigajoules)        FROM public.ggen_consumo_gas WHERE anio = a.anio), 0) AS total_gigajoules,
    COALESCE((SELECT AVG(NULLIF(gigajoules,0)) FROM public.ggen_consumo_gas WHERE anio = a.anio), 0) AS prom_gigajoules,
    -- Equivalencias útiles
    COALESCE((SELECT SUM(generada_kwh) FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) / 1000.0 AS total_generada_mwh,
    COALESCE((SELECT SUM(consumo_cfe_kwh) FROM public.ggen_energia_electrica WHERE anio = a.anio), 0) / 1000.0 AS total_consumo_cfe_mwh
FROM anios a
ORDER BY a.anio DESC;

-- 5.4 Comparativo YoY (variaciones contra el año previo) ------
-- Útil para indicadores +/− % en tarjetas y gráficos de variación.
CREATE OR REPLACE VIEW public.v_ggen_yoy AS
SELECT
    cur.anio,
    cur.mes_num,
    cur.mes_nombre,
    cur.generada_kwh                                       AS generada_actual,
    prev.generada_kwh                                      AS generada_previa,
    CASE WHEN COALESCE(prev.generada_kwh,0) > 0
         THEN ROUND(100.0 * (cur.generada_kwh - prev.generada_kwh)
                          / prev.generada_kwh, 2)
         ELSE NULL END                                     AS pct_yoy_generada,
    cur.consumo_cfe_kwh                                    AS consumo_actual,
    prev.consumo_cfe_kwh                                   AS consumo_previo,
    CASE WHEN COALESCE(prev.consumo_cfe_kwh,0) > 0
         THEN ROUND(100.0 * (cur.consumo_cfe_kwh - prev.consumo_cfe_kwh)
                          / prev.consumo_cfe_kwh, 2)
         ELSE NULL END                                     AS pct_yoy_consumo
FROM public.ggen_energia_electrica cur
LEFT JOIN public.ggen_energia_electrica prev
       ON prev.anio = cur.anio - 1
      AND prev.mes_num = cur.mes_num;


-- ════════════════════════════════════════════════════════════
-- 6) ROW LEVEL SECURITY
-- Sección lógica: 'ggen-energia' (agregar a AU_SUBDIRECCIONES.SGE en script.js)
-- Requiere public.user_can_access_section(text) definido en db/rls_section_permissions.sql
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.ggen_energia_electrica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ggen_energia_termica   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ggen_consumo_gas       ENABLE ROW LEVEL SECURITY;

-- 6.1 Lectura ------------------------------------------------
DROP POLICY IF EXISTS "ggen_elec_select" ON public.ggen_energia_electrica;
CREATE POLICY "ggen_elec_select"
    ON public.ggen_energia_electrica FOR SELECT TO authenticated
    USING (public.user_can_access_section('ggen-energia'));

DROP POLICY IF EXISTS "ggen_term_select" ON public.ggen_energia_termica;
CREATE POLICY "ggen_term_select"
    ON public.ggen_energia_termica FOR SELECT TO authenticated
    USING (public.user_can_access_section('ggen-energia'));

DROP POLICY IF EXISTS "ggen_gas_select" ON public.ggen_consumo_gas;
CREATE POLICY "ggen_gas_select"
    ON public.ggen_consumo_gas FOR SELECT TO authenticated
    USING (public.user_can_access_section('ggen-energia'));

-- 6.2 Escritura (solo admin / superadmin / editor con la sección) ----
-- Helper inline reutilizable
CREATE OR REPLACE FUNCTION public.ggen_can_write()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid();
    IF v_role IS NULL THEN RETURN FALSE; END IF;
    IF v_role IN ('admin','superadmin') THEN RETURN TRUE; END IF;
    IF v_role = 'editor' AND public.user_can_access_section('ggen-energia') THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ggen_can_write() TO authenticated;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['ggen_energia_electrica','ggen_energia_termica','ggen_consumo_gas']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.ggen_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (public.ggen_can_write()) WITH CHECK (public.ggen_can_write())', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (public.ggen_can_write())', t, t);
    END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════
-- 7) VERIFICACIÓN RÁPIDA (opcional, ejecutar a mano)
-- ════════════════════════════════════════════════════════════
-- SELECT * FROM public.v_ggen_balance_electrico        ORDER BY anio, mes_num;
-- SELECT * FROM public.v_ggen_resumen_anual;
-- SELECT * FROM public.v_ggen_energia_unificada        ORDER BY anio, metrica, mes_num;
-- SELECT * FROM public.v_ggen_yoy                      ORDER BY anio, mes_num;

-- Fin del fichero
