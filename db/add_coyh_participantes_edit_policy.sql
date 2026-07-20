-- =============================================================
--  RLS: Permitir edicion del directorio COyH (admin / editor)
--  Ejecutar en: Supabase > SQL Editor
-- =============================================================

-- Habilitar RLS si no esta activo
ALTER TABLE public.coyh_participantes ENABLE ROW LEVEL SECURITY;

-- Politica de lectura: cualquier usuario autenticado puede leer
DROP POLICY IF EXISTS "coyh_participantes: lectura autenticados" ON public.coyh_participantes;
CREATE POLICY "coyh_participantes: lectura autenticados"
    ON public.coyh_participantes
    FOR SELECT
    TO authenticated
    USING (true);

-- Politica de escritura (INSERT / UPDATE / DELETE): solo admin y editor
DROP POLICY IF EXISTS "coyh_participantes: escritura admin editor" ON public.coyh_participantes;
CREATE POLICY "coyh_participantes: escritura admin editor"
    ON public.coyh_participantes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'editor')
        )
    );
