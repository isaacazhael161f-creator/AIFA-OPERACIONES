-- =========================================================
-- Función RPC: add_missing_columns
-- Permite al frontend añadir columnas nuevas a una tabla
-- cuando el Excel importado tiene más campos que la tabla.
-- Tipo por defecto: TEXT (siempre seguro para datos de Excel).
-- SECURITY DEFINER: corre con permisos del owner de la tabla.
-- =========================================================

CREATE OR REPLACE FUNCTION add_missing_columns(
    p_table  text,
    p_cols   text[]
)
RETURNS text[]          -- devuelve las columnas que se añadieron
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    col       text;
    added     text[] := '{}';
BEGIN
    -- Solo permite operar sobre tablas "Base de Datos Manifiestos …"
    -- para evitar que se use como vector de inyección en otras tablas.
    IF p_table NOT ILIKE 'Base de Datos Manifiestos%' THEN
        RAISE EXCEPTION 'Tabla no permitida: %', p_table;
    END IF;

    FOREACH col IN ARRAY p_cols LOOP
        -- Ignorar nombres vacíos o muy largos
        IF col = '' OR length(col) > 120 THEN
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = p_table
              AND column_name  = col
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I text',
                p_table, col
            );
            added := array_append(added, col);
        END IF;
    END LOOP;

    RETURN added;
END;
$$;

-- Permitir que los roles de servicio (authenticated) ejecuten la función
GRANT EXECUTE ON FUNCTION add_missing_columns(text, text[]) TO authenticated;
