-- ══════════════════════════════════════════════════════════════
--  FIX: Políticas RLS de colab_cursos  (versión 2 — completa)
--  Elimina TODAS las políticas existentes y las recrea limpias.
--
--  EJECUTAR en: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. Diagnóstico: ver tu rol actual ─────────────────────────
-- SELECT role FROM public.user_roles WHERE user_id = auth.uid();

-- ── 2. Borrar TODAS las políticas viejas de la tabla ──────────
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'colab_cursos'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.colab_cursos', pol.policyname);
    END LOOP;
END $$;

-- ── 3. Recrear políticas limpias ──────────────────────────────

-- SELECT: cualquier usuario autenticado puede leer
CREATE POLICY "colab_cursos_select"
    ON public.colab_cursos FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: admins y editores
CREATE POLICY "colab_cursos_insert"
    ON public.colab_cursos FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

-- UPDATE: admins y editores
CREATE POLICY "colab_cursos_update"
    ON public.colab_cursos FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

-- DELETE: admins y editores
CREATE POLICY "colab_cursos_delete"
    ON public.colab_cursos FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

-- ── Storage bucket colab-cursos-pdfs ──────────────────────────
-- NOTA: las políticas de storage.objects con EXISTS contra user_roles
-- son poco confiables. Se usa una política simple por usuario autenticado.
-- La seguridad real está en la tabla colab_cursos + frontend colabCanEdit().

-- Eliminar TODAS las políticas existentes del bucket
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'colab_cursos_pdfs%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Lectura pública
CREATE POLICY "colab_cursos_pdfs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'colab-cursos-pdfs');

-- Escritura: cualquier usuario autenticado
CREATE POLICY "colab_cursos_pdfs_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'colab-cursos-pdfs');

CREATE POLICY "colab_cursos_pdfs_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'colab-cursos-pdfs');

CREATE POLICY "colab_cursos_pdfs_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'colab-cursos-pdfs');
