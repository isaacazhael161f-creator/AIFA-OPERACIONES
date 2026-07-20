-- ================================================================
-- AIFA OPERACIONES - Calendario de inauguracion de rutas
-- Tabla principal + bitacora de envios de recordatorios
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.route_launch_calendar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_code text,
    route_name text NOT NULL,
    airline text NOT NULL,
    scope text NOT NULL DEFAULT 'nacional' CHECK (scope IN ('nacional', 'internacional', 'carga')),
    launch_date date NOT NULL,
    reminder_days int[] NOT NULL DEFAULT ARRAY[30,14,7,3,1,0],
    status text NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'programada', 'pospuesta', 'cancelada')),
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_launch_calendar_launch_date
    ON public.route_launch_calendar (launch_date);

CREATE INDEX IF NOT EXISTS idx_route_launch_calendar_scope_status
    ON public.route_launch_calendar (scope, status);

CREATE INDEX IF NOT EXISTS idx_route_launch_calendar_active
    ON public.route_launch_calendar (is_active)
    WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.route_launch_reminder_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.route_launch_calendar(id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    destination text NOT NULL,
    reminder_day int NOT NULL,
    sent_on date NOT NULL DEFAULT (now()::date),
    payload_preview text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, channel, destination, reminder_day, sent_on)
);

CREATE INDEX IF NOT EXISTS idx_route_launch_reminder_log_sent_on
    ON public.route_launch_reminder_log (sent_on DESC);

ALTER TABLE public.route_launch_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_launch_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "route_launch_calendar_select_auth" ON public.route_launch_calendar;
CREATE POLICY "route_launch_calendar_select_auth"
ON public.route_launch_calendar
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "route_launch_calendar_write_admin_editor" ON public.route_launch_calendar;
CREATE POLICY "route_launch_calendar_write_admin_editor"
ON public.route_launch_calendar
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'superadmin', 'editor')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'superadmin', 'editor')
    )
);

DROP POLICY IF EXISTS "route_launch_reminder_log_read_admin" ON public.route_launch_reminder_log;
CREATE POLICY "route_launch_reminder_log_read_admin"
ON public.route_launch_reminder_log
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'superadmin', 'editor')
    )
);

COMMENT ON TABLE public.route_launch_calendar IS
'Calendario de inauguraciones de nuevas rutas para generar recordatorios automaticos.';

COMMENT ON TABLE public.route_launch_reminder_log IS
'Bitacora diaria de envios de recordatorios de inauguracion (WhatsApp y correo).';
