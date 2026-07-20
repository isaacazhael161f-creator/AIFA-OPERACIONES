-- Agrega la columna horario_fijo a la tabla agenda_comites
-- Indica que el comité siempre sesiona en las mismas fechas (se muestra con ícono de reloj ⏰)

ALTER TABLE public.agenda_comites
    ADD COLUMN IF NOT EXISTS horario_fijo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.agenda_comites.horario_fijo IS
    'Indica que el comité siempre se programa en las mismas fechas cada año (horario preestablecido). Se visualiza con un ícono de reloj en el calendario y en la lista de comités.';
