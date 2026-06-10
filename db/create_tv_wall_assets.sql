-- ================================================================
-- AIFA OPERACIONES - Activos para pantalla 4 cuadrantes
-- 1) Bucket para rol catorcenal (PDF)
-- 2) Tabla de notas operativas para TV wall
-- ================================================================

-- Storage bucket para el rol catorcenal
INSERT INTO storage.buckets (id, name, public)
VALUES ('rol_catorcenal', 'rol_catorcenal', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura publica de objetos del bucket
DROP POLICY IF EXISTS "rol_catorcenal_public_read" ON storage.objects;
CREATE POLICY "rol_catorcenal_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'rol_catorcenal');

-- Escritura solo para roles admin/superadmin/editor
DROP POLICY IF EXISTS "rol_catorcenal_write_admin" ON storage.objects;
CREATE POLICY "rol_catorcenal_write_admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rol_catorcenal'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin', 'editor')
  )
);

DROP POLICY IF EXISTS "rol_catorcenal_update_admin" ON storage.objects;
CREATE POLICY "rol_catorcenal_update_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rol_catorcenal'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin', 'editor')
  )
)
WITH CHECK (
  bucket_id = 'rol_catorcenal'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin', 'editor')
  )
);

DROP POLICY IF EXISTS "rol_catorcenal_delete_admin" ON storage.objects;
CREATE POLICY "rol_catorcenal_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rol_catorcenal'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin', 'editor')
  )
);

-- Tabla de notas de pantalla
CREATE TABLE IF NOT EXISTS public.tv_notas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo text NOT NULL,
  nota text NOT NULL,
  prioridad int NOT NULL DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
  activa boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tv_notas_activa_prioridad
  ON public.tv_notas (activa, prioridad DESC, updated_at DESC);

ALTER TABLE public.tv_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_notas_read_auth" ON public.tv_notas;
CREATE POLICY "tv_notas_read_auth"
ON public.tv_notas FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "tv_notas_write_admin_editor" ON public.tv_notas;
CREATE POLICY "tv_notas_write_admin_editor"
ON public.tv_notas FOR ALL TO authenticated
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

COMMENT ON TABLE public.tv_notas IS
'Notas operativas para despliegue en pantalla dividida de operaciones.';
