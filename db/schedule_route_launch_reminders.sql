-- ================================================================
-- AIFA OPERACIONES - Programar recordatorios de inauguracion de rutas
-- Ejecuta la edge function send-route-launch-reminders cada dia
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
    'route-launch-reminders-daily',
    '0 14 * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-route-launch-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SUPABASE_SERVICE_KEY')
        ),
        body := jsonb_build_object('source', 'pg_cron')
    );
    $$
);

-- Verificar:
-- SELECT * FROM cron.job WHERE jobname = 'route-launch-reminders-daily';

-- Desactivar:
-- SELECT cron.unschedule('route-launch-reminders-daily');
