-- =================================================================
-- PASO PREVIO: Renombrar columnas con saltos de línea (\n)
-- a nombres con espacio simple (compatibles con el SQL Editor)
-- Ejecutar ANTES de los archivos _data.sql
-- =================================================================

DO $$
DECLARE
  col     TEXT;
  new_col TEXT;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'agenda_2026'
      AND column_name LIKE '%' || chr(10) || '%'
    ORDER BY ordinal_position
  LOOP
    -- Normalizar: reemplazar cualquier secuencia de espacios/newline con un espacio
    new_col := trim(regexp_replace(col, '\s+', ' ', 'g'));

    IF new_col = col THEN CONTINUE; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'agenda_2026'
        AND column_name  = new_col
    ) THEN
      -- El nombre nuevo no existe → renombrar directamente
      EXECUTE format('ALTER TABLE public.agenda_2026 RENAME COLUMN %I TO %I', col, new_col);
      RAISE NOTICE 'Renombrado: [%] → [%]', col, new_col;
    ELSE
      -- El nombre nuevo ya existe (columna duplicada) → copiar datos y borrar la vieja
      EXECUTE format(
        'UPDATE public.agenda_2026 SET %I = %I WHERE %I IS NULL AND %I IS NOT NULL',
        new_col, col, new_col, col
      );
      EXECUTE format('ALTER TABLE public.agenda_2026 DROP COLUMN %I', col);
      RAISE NOTICE 'Fusionado y eliminado duplicado: [%]', col;
    END IF;
  END LOOP;
END $$;
