-- ============================================================
-- committee_sessions: sesiones personalizadas por área
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.committee_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  date        date NOT NULL,
  time        text NOT NULL DEFAULT '10:00',
  area        text NOT NULL,
  obs         text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);

-- RLS: cualquier usuario autenticado puede leer todas las sesiones
ALTER TABLE public.committee_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all"
  ON public.committee_sessions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo el creador (su email) puede eliminar su propia sesión
CREATE POLICY "Creator can delete own sessions"
  ON public.committee_sessions FOR DELETE
  USING (created_by = auth.jwt() ->> 'email');

-- Usuarios autenticados pueden insertar
CREATE POLICY "Authenticated users can insert"
  ON public.committee_sessions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
