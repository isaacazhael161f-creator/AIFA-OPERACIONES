-- ══════════════════════════════════════════════════════════════
--  MIGRACIÓN: agregar columna categoria a colab_cursos
--  Permite organizar los cursos en carpetas temáticas por empleado.
--  EJECUTAR en: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.colab_cursos
    ADD COLUMN IF NOT EXISTS categoria text;

-- Índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_colab_cursos_categoria
    ON public.colab_cursos (num_empleado, categoria);

COMMENT ON COLUMN public.colab_cursos.categoria IS
    'Carpeta temática del curso, ej: "CURSOS TÉCNICOS", "SERVIDOR PÚBLICO". NULL = Sin carpeta.';
