-- =================================================================
-- DIAGNÓSTICO: Verificar estado de agenda_2026 ANTES de cargar datos
-- Ejecutar primero para confirmar que la estructura es correcta
-- =================================================================

-- 1) Total de colaboradores ya en la tabla
SELECT COUNT(*) AS total_actual FROM public.agenda_2026;

-- 2) Columnas actuales (ordenadas por posición)
SELECT ordinal_position        AS pos,
       column_name             AS columna,
       data_type               AS tipo
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
ORDER  BY ordinal_position;

-- 3) Verificar columnas críticas para el UPSERT
--    Todas deben aparecer en el resultado; si falta alguna, no ejecutes los _data.sql
SELECT column_name
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
  AND  column_name IN (
    'No. Empleado',
    'Sueldo_Bruto',
    'Dir. Orgánica',
    'RUSP',
    'Licencia Vigencia',
    'Anexo "A" Turno especial',
    'Anexo "A"  Fecha de activación',
    'Anexo "B" Riesgos',
    'Anexo "B"  Fecha de activación',
    'Contacto de emergencia 1 Nombre completo',
    'Contacto de emergencia 2 Nombre completo'
  )
ORDER  BY column_name;

-- 4) Verificar índice único (necesario para ON CONFLICT)
SELECT indexname, indexdef
FROM   pg_indexes
WHERE  schemaname = 'public'
  AND  tablename  = 'agenda_2026'
  AND  indexname  = 'agenda_2026_num_empleado_unique';

-- 5) Verificar que NO haya columnas con salto de línea (deben ser 0)
SELECT COUNT(*) AS columnas_con_newline
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'agenda_2026'
  AND  column_name LIKE '%' || chr(10) || '%';
