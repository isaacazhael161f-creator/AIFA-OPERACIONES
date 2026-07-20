-- Agrega agenda de cursos por colaborador usando JSONB en agenda_2026
ALTER TABLE public.agenda_2026
ADD COLUMN IF NOT EXISTS cursos_programados jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Indice GIN para acelerar filtros por contenido JSONB
CREATE INDEX IF NOT EXISTS idx_agenda_2026_cursos_programados_gin
ON public.agenda_2026 USING GIN (cursos_programados);

COMMENT ON COLUMN public.agenda_2026.cursos_programados IS
'Lista de cursos programados por colaborador: session_id, curso, fecha, hora, modalidad, lugar, notas, creado_en y creado_por.';
