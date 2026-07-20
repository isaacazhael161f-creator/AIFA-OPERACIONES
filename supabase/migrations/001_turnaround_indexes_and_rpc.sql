-- =============================================================================
-- AIFA-OPERACIONES — Optimización AODB Turnaround
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ESTRATEGIA DE INDEXACIÓN
-- Los 7 campos de fecha se almacenan como TEXT con formato "DDMON HH:MM"
-- (ej: "12JUL 13:25").  Un B-tree index soporta búsquedas LIKE 'prefix%'
-- siempre que el patrón no empiece con wildcard → cobertura perfecta para
-- los Casos A y B del filtro de turnaround.
-- -----------------------------------------------------------------------------

-- Campos de Llegada (Inbound)
CREATE INDEX IF NOT EXISTS idx_vpo_arr_sibt ON vuelos_parte_operaciones_csv ("[Arr] SIBT");
CREATE INDEX IF NOT EXISTS idx_vpo_arr_aibt ON vuelos_parte_operaciones_csv ("[Arr] AIBT");
CREATE INDEX IF NOT EXISTS idx_vpo_arr_aldt ON vuelos_parte_operaciones_csv ("[Arr] ALDT");

-- Campos de Salida (Outbound)
CREATE INDEX IF NOT EXISTS idx_vpo_dep_sobt ON vuelos_parte_operaciones_csv ("[Dep] SOBT");
CREATE INDEX IF NOT EXISTS idx_vpo_dep_aobt ON vuelos_parte_operaciones_csv ("[Dep] AOBT");
CREATE INDEX IF NOT EXISTS idx_vpo_dep_atot ON vuelos_parte_operaciones_csv ("[Dep] ATOT");
CREATE INDEX IF NOT EXISTS idx_vpo_dep_attt ON vuelos_parte_operaciones_csv ("[Dep] ATTT");

-- Índice compuesto (Llegada+Salida) para el Caso C (estancia larga / overnight)
-- Permite al planner evaluar ambas condiciones con un solo index scan.
CREATE INDEX IF NOT EXISTS idx_vpo_sibt_sobt
    ON vuelos_parte_operaciones_csv ("[Arr] SIBT", "[Dep] SOBT");

-- -----------------------------------------------------------------------------
-- 2. RPC: search_turnaround_day
--
-- Diseño con UNION (no OR) para evitar Full Table Scan:
--   • Cada rama del UNION puede usar su propio índice independiente.
--   • Con OR el planner suele caer en Seq Scan porque no puede combinar
--     dos índices de columnas distintas eficientemente.
--   • UNION (sin ALL) elimina duplicados al hacer merge de los conjuntos,
--     equivalente a una deduplicación barata sobre PKs enteras.
--
-- Parámetros:
--   p_day  TEXT  — prefijo de día, ej: '12JUL'
--   p_prev TEXT  — día anterior, ej: '11JUL'  (para Caso C - estancia larga)
--   p_next TEXT  — día siguiente, ej: '13JUL' (para Caso C - estancia larga)
--
-- Retorna: tabla de IDs únicos que cumplen al menos uno de los 3 casos.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_turnaround_day(
    p_day  TEXT,
    p_prev TEXT DEFAULT '',
    p_next TEXT DEFAULT ''
)
RETURNS TABLE(id BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    -- CASO A: Llegada en el día filtro
    -- (El avión aterrizó/entró a bloque en p_day, salga cuando sea)
    SELECT id FROM vuelos_parte_operaciones_csv
    WHERE "[Arr] SIBT" LIKE (p_day || ' %')
       OR "[Arr] AIBT" LIKE (p_day || ' %')
       OR "[Arr] ALDT" LIKE (p_day || ' %')

    UNION

    -- CASO B: Salida en el día filtro — Overnight / Pernocta
    -- (El avión llegó ayer pero sale hoy; ningún campo de llegada es p_day)
    SELECT id FROM vuelos_parte_operaciones_csv
    WHERE "[Dep] SOBT" LIKE (p_day || ' %')
       OR "[Dep] AOBT" LIKE (p_day || ' %')
       OR "[Dep] ATOT" LIKE (p_day || ' %')
       OR "[Dep] ATTT" LIKE (p_day || ' %')

    UNION

    -- CASO C: Estancia larga — avión llegó ANTES del día y sale DESPUÉS
    -- (Permanece en plataforma todo el día; ningún campo toca p_day)
    -- Solo se evalúa cuando se proveen p_prev y p_next.
    SELECT id FROM vuelos_parte_operaciones_csv
    WHERE p_prev <> '' AND p_next <> ''
      AND (
          "[Arr] SIBT" LIKE (p_prev || ' %') OR
          "[Arr] AIBT" LIKE (p_prev || ' %') OR
          "[Arr] ALDT" LIKE (p_prev || ' %')
      )
      AND (
          "[Dep] SOBT" LIKE (p_next || ' %') OR
          "[Dep] AOBT" LIKE (p_next || ' %') OR
          "[Dep] ATOT" LIKE (p_next || ' %')
      )
$$;

-- Dar acceso al rol anon (cliente Supabase público)
GRANT EXECUTE ON FUNCTION search_turnaround_day(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION search_turnaround_day(TEXT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPC: get_flights_page (Paginación eficiente — Keyset Pagination)
--
-- En lugar de OFFSET (que escanea desde el inicio cada vez),
-- Keyset usa el último id visto como cursor → O(1) sin importar la página.
-- El frontend guarda el último id de la página anterior y lo pasa como cursor.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_flights_page(
    p_ids     BIGINT[],    -- array de IDs válidos (resultado del filtro de turnaround)
    p_cursor  BIGINT DEFAULT 0,   -- último id de la página anterior (0 = inicio)
    p_limit   INT    DEFAULT 100  -- filas por página
)
RETURNS SETOF vuelos_parte_operaciones_csv
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT *
    FROM vuelos_parte_operaciones_csv
    WHERE id = ANY(p_ids)
      AND id > p_cursor
    ORDER BY id ASC
    LIMIT p_limit
$$;

GRANT EXECUTE ON FUNCTION get_flights_page(BIGINT[], BIGINT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_flights_page(BIGINT[], BIGINT, INT) TO authenticated;
