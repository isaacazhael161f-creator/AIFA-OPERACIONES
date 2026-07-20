-- ════════════════════════════════════════════════════════════════════
--  Tabla: whatsapp_alertas
--  Almacena los números de WhatsApp que recibirán las alertas diarias
--  de cursos por vencer. Solo admins/superadmins pueden gestionar.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_alertas (
    id         serial PRIMARY KEY,
    nombre     text    NOT NULL,
    telefono   text    NOT NULL,   -- formato internacional sin +, ej: 521XXXXXXXXXX
    apikey     text    NOT NULL,   -- API key personal de CallMeBot
    activo     boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice útil para filtrar solo activos
CREATE INDEX IF NOT EXISTS idx_whatsapp_alertas_activo ON public.whatsapp_alertas (activo);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.whatsapp_alertas ENABLE ROW LEVEL SECURITY;

-- Solo admin y superadmin pueden ver, insertar, actualizar y eliminar
CREATE POLICY "whatsapp_alertas_admin_all"
ON public.whatsapp_alertas
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'superadmin')
    )
);

-- ── Comentarios de columnas ─────────────────────────────────────────
COMMENT ON TABLE  public.whatsapp_alertas IS 'Números WhatsApp que reciben alertas diarias de cursos por vencer vía CallMeBot';
COMMENT ON COLUMN public.whatsapp_alertas.telefono IS 'Número internacional sin +, ej: 521XXXXXXXXXX para México';
COMMENT ON COLUMN public.whatsapp_alertas.apikey   IS 'API key personal obtenida al activar CallMeBot en ese número de WhatsApp';
