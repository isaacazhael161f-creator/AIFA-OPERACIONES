-- =============================================================================
-- Migración: convertir columna `ganancia` de GENERATED ALWAYS a numeric normal
-- Tabla: atencion_derrames
-- Fecha: 2026-07-14
--
-- INSTRUCCIONES:
--   1. Abre el SQL Editor en https://supabase.com/dashboard/project/fgstncvuuhpgyzmjceyr/sql
--   2. Pega este script completo y ejecútalo.
--   3. Los registros existentes NO se eliminarán; solo cambia la definición de la columna.
--
-- PROBLEMA:
--   `ganancia` estaba definida como GENERATED ALWAYS AS (cobro_realizado - costo_operativo)
--   lo que impide insertar valores explícitos desde la aplicación.
--
-- SOLUCIÓN:
--   Eliminar la columna generada y recrearla como numeric regular, conservando
--   los valores actuales calculados y permitiendo inserts/updates manuales.
-- =============================================================================

BEGIN;

-- Paso 1: Guardar los valores actuales de ganancia en una tabla temporal
CREATE TEMP TABLE _ganancia_backup AS
SELECT id, (cobro_realizado - costo_operativo) AS ganancia_val
FROM atencion_derrames
WHERE cobro_realizado IS NOT NULL AND costo_operativo IS NOT NULL;

-- Paso 2: Eliminar la columna generada
ALTER TABLE atencion_derrames DROP COLUMN IF EXISTS ganancia;

-- Paso 3: Agregar la columna como numeric normal (editable, permite NULL)
ALTER TABLE atencion_derrames ADD COLUMN ganancia numeric;

-- Paso 4: Restaurar los valores calculados en los registros existentes
UPDATE atencion_derrames a
SET ganancia = b.ganancia_val
FROM _ganancia_backup b
WHERE a.id = b.id;

-- Paso 5: (Opcional) Agregar comentario descriptivo
COMMENT ON COLUMN atencion_derrames.ganancia IS
    'Ganancia neta del servicio (cobro_realizado - costo_operativo). Editable manualmente.';

COMMIT;

-- Verificación: confirmar que la columna ya no es generada
SELECT column_name, data_type, is_generated
FROM information_schema.columns
WHERE table_name = 'atencion_derrames' AND column_name = 'ganancia';
-- Debe mostrar: is_generated = 'NEVER'
