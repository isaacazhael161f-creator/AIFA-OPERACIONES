-- ══════════════════════════════════════════════════════════════
--  TABLA: colab_cursos
--  Almacena los cursos y capacitaciones de cada colaborador.
--  Los cursos pueden ser de una sola vez o recurrentes.
--  Si es recurrente, frecuencia_dias indica cada cuántos días
--  se debe repetir el curso (365 = anual, 180 = semestral, etc.)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.colab_cursos (
    id               uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
    num_empleado     text              NOT NULL,
    nombre           text              NOT NULL,
    descripcion      text,
    fecha_realizacion date,
    es_recurrente    boolean           NOT NULL DEFAULT false,
    frecuencia_dias  integer,          -- null si no es recurrente; 365=anual, 180=semestral, 730=bianual
    pdf_url          text,
    creado_por       text,
    creado_en        timestamptz       NOT NULL DEFAULT now(),
    updated_at       timestamptz       NOT NULL DEFAULT now()
);

-- Índice por empleado para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_colab_cursos_empleado
    ON public.colab_cursos (num_empleado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colab_cursos_updated_at ON public.colab_cursos;
CREATE TRIGGER trg_colab_cursos_updated_at
    BEFORE UPDATE ON public.colab_cursos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.colab_cursos ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado puede leer
CREATE POLICY "colab_cursos_select"
    ON public.colab_cursos FOR SELECT
    TO authenticated
    USING (true);

-- Insertar / Actualizar / Eliminar: solo admins y colab_editors
CREATE POLICY "colab_cursos_insert"
    ON public.colab_cursos FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

CREATE POLICY "colab_cursos_update"
    ON public.colab_cursos FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

CREATE POLICY "colab_cursos_delete"
    ON public.colab_cursos FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

-- ── BUCKET DE STORAGE para PDFs de cursos ──────────────────────
-- Ejecutar manualmente en el dashboard de Supabase > Storage:
--   1. Crear bucket "colab-cursos-pdfs" (público para lecturas)
--   2. O bien ejecutar la sentencia siguiente si tu Supabase lo permite:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'colab-cursos-pdfs',
    'colab-cursos-pdfs',
    true,
    15728640,   -- 15 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política de lectura pública
CREATE POLICY "colab_cursos_pdfs_public_read"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'colab-cursos-pdfs' );

-- Política de escritura para colab_editors y admins
CREATE POLICY "colab_cursos_pdfs_write"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'colab-cursos-pdfs'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );

CREATE POLICY "colab_cursos_pdfs_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'colab-cursos-pdfs'
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'superadmin', 'editor', 'colab_editor')
        )
    );
