-- =================================================================
-- VALIDACIÓN FINAL: Ejecutar después de todos los lotes de datos
-- =================================================================

-- 1) Total de colaboradores cargados
SELECT COUNT(*) AS total_colaboradores FROM public.agenda_2026;
-- Esperado: 459

-- 2) Colaboradores con Dir. Orgánica llena (columna nueva)
SELECT COUNT(*) AS con_dir_organica
FROM public.agenda_2026
WHERE "Dir. Orgánica" IS NOT NULL AND "Dir. Orgánica" <> '';

-- 3) Colaboradores con RUSP lleno (columna nueva)
SELECT COUNT(*) AS con_rusp
FROM public.agenda_2026
WHERE "RUSP" IS NOT NULL AND "RUSP" <> '';

-- 4) Registros duplicados por No. Empleado (debe ser 0)
SELECT "No. Empleado", COUNT(*) AS ocurrencias
FROM public.agenda_2026
GROUP BY "No. Empleado"
HAVING COUNT(*) > 1;

-- 5) Registros sin nombre (debe ser 0)
SELECT COUNT(*) AS sin_nombre
FROM public.agenda_2026
WHERE "Nombre" IS NULL OR "Nombre" = '';

-- 6) Últimos 10 colaboradores insertados/modificados
SELECT "No. Empleado", "Nombre", "Dir. Orgánica", "RUSP"
FROM public.agenda_2026
ORDER BY "No. Empleado" DESC
LIMIT 10;
