-- Tabla de notas personales por usuario (cuadrante "Mis Notas" del OpsWall)
-- Ejecutar una sola vez en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.user_notes (
  id          bigserial PRIMARY KEY,
  user_id     uuid        NOT NULL DEFAULT auth.uid(),
  titulo      text        NOT NULL,
  nota        text,
  fecha       date,                          -- fecha opcional para marcar en calendario
  activa      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user  ON public.user_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_fecha ON public.user_notes (fecha);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_user_notes_updated_at ON public.user_notes;
CREATE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: cada usuario ve y gestiona solo sus propias notas
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notes: lectura propia"   ON public.user_notes;
DROP POLICY IF EXISTS "user_notes: insertar propia"  ON public.user_notes;
DROP POLICY IF EXISTS "user_notes: actualizar propia" ON public.user_notes;

CREATE POLICY "user_notes: lectura propia"
  ON public.user_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_notes: insertar propia"
  ON public.user_notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notes: actualizar propia"
  ON public.user_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
