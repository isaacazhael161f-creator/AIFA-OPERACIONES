-- ─────────────────────────────────────────────────────────────
-- CORRECCIÓN: RLS SELECT en agenda_2026
-- Problema: la política anterior no incluía 'superadmin',
-- 'control_fauna', 'servicio_medico', 'operaciones', 'abordadores',
-- lo que podría bloquear lecturas a usuarios con esos roles.
-- Solución: ampliar la lista de roles permitidos para lectura.
-- ─────────────────────────────────────────────────────────────

-- Eliminar política anterior restrictiva
DROP POLICY IF EXISTS "agenda_2026: lectura roles colab" ON public.agenda_2026;
DROP POLICY IF EXISTS "agenda_2026: lectura autenticados" ON public.agenda_2026;

-- Nueva política: cualquier usuario autenticado puede leer el directorio.
-- Esto es coherente con que el directorio es información interna visible
-- para todos los colaboradores autenticados en la plataforma.
CREATE POLICY "agenda_2026: lectura todos autenticados"
    ON public.agenda_2026
    FOR SELECT
    TO authenticated
    USING (true);

-- La política de escritura (INSERT/UPDATE/DELETE) se mantiene restringida
-- a los roles con permiso de edición (no se modifica).
-- Si la política de edición no existe aún, crearla también:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'agenda_2026'
          AND policyname = 'agenda_2026: edicion colab_editor'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "agenda_2026: edicion colab_editor"
                ON public.agenda_2026
                FOR ALL
                TO authenticated
                USING (
                    public.get_my_role() IN ('admin', 'editor', 'colab_editor', 'superadmin')
                )
                WITH CHECK (
                    public.get_my_role() IN ('admin', 'editor', 'colab_editor', 'superadmin')
                )
        $policy$;
    END IF;
END;
$$;
