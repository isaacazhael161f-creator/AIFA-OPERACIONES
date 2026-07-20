-- ══════════════════════════════════════════════════════════════
--  ALERTAS AUTOMÁTICAS DE CURSOS POR VENCER — pg_cron + pg_net
--  Ejecutar en el SQL Editor del Dashboard de Supabase
-- ══════════════════════════════════════════════════════════════
--
--  PRERREQUISITOS (activar en Dashboard → Database → Extensions):
--    1.  pg_cron   — para programar tareas
--    2.  pg_net    — para hacer llamadas HTTP desde SQL
--
--  Sustituir [CRON_SECRET] con el mismo valor que configures
--  en la Edge Function como variable de entorno CRON_SECRET.
--  Se recomienda una cadena aleatoria de 32+ caracteres.
-- ══════════════════════════════════════════════════════════════

-- 1. Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Programar el job: lunes a viernes a las 14:00 UTC (08:00 CST / 09:00 CDT)
SELECT cron.schedule(
  'alertar-cursos-vencimientos',
  '0 14 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://fgstncvuuhpgyzmjceyr.supabase.co/functions/v1/alertar-cursos',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer [CRON_SECRET]'
               ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── Verificar que el job quedó registrado ───────────────────────
SELECT jobid, jobname, schedule, command
FROM   cron.job
WHERE  jobname = 'alertar-cursos-vencimientos';

-- ══════════════════════════════════════════════════════════════
--  COMANDOS ÚTILES DE MANTENIMIENTO
-- ══════════════════════════════════════════════════════════════

-- Ver historial de ejecuciones recientes:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'alertar-cursos-vencimientos') ORDER BY start_time DESC LIMIT 20;

-- Cambiar horario (ej: 13:00 UTC todos los días):
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'alertar-cursos-vencimientos'), schedule := '0 13 * * *');

-- Suspender temporalmente:
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'alertar-cursos-vencimientos'), active := false);

-- Reactivar:
-- SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'alertar-cursos-vencimientos'), active := true);

-- Eliminar el job completamente:
-- SELECT cron.unschedule('alertar-cursos-vencimientos');
