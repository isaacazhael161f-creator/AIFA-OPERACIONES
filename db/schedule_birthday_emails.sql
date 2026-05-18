-- ================================================================
-- AIFA OPERACIONES — Programar envío automático de emails de cumpleaños
--
-- Requiere: pg_cron y pg_net habilitados en Supabase
-- (Dashboard → Database → Extensions)
--
-- Ejecutar este script UNA VEZ en el SQL Editor de Supabase.
-- ================================================================

-- 1. Habilitar extensiones si no están activas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Programar la función para ejecutarse todos los días a las 08:00 hora México (UTC-6 = 14:00 UTC)
-- Formato cron: minuto hora día_mes mes día_semana
SELECT cron.schedule(
    'birthday-emails-daily',           -- nombre del job (único)
    '0 14 * * *',                      -- 14:00 UTC = 08:00 hora Ciudad de México
    $$
    SELECT net.http_post(
        url     := (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-birthday-emails',
        headers := jsonb_build_object(
            'Content-Type',   'application/json',
            'Authorization',  'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_KEY')
        ),
        body    := '{}'::jsonb
    );
    $$
);

-- Para verificar que quedó registrado:
-- SELECT * FROM cron.job WHERE jobname = 'birthday-emails-daily';

-- Para eliminar el job si necesitas cambiarlo:
-- SELECT cron.unschedule('birthday-emails-daily');

-- ================================================================
-- ALTERNATIVA: Si no tienes acceso a vault.secrets, usa los valores directos:
-- ================================================================
-- SELECT cron.schedule(
--     'birthday-emails-daily',
--     '0 14 * * *',
--     $$
--     SELECT net.http_post(
--         url     := 'https://TU-PROYECTO.supabase.co/functions/v1/send-birthday-emails',
--         headers := jsonb_build_object(
--             'Content-Type',  'application/json',
--             'Authorization', 'Bearer TU-SERVICE-ROLE-KEY'
--         ),
--         body    := '{}'::jsonb
--     );
--     $$
-- );
