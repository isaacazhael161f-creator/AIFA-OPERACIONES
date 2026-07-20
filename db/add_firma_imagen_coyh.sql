-- =============================================================
--  Agrega columna firma_imagen a coyh_asistencia
--  Ejecutar en: Supabase > SQL Editor
-- =============================================================
ALTER TABLE public.coyh_asistencia
    ADD COLUMN IF NOT EXISTS firma_imagen TEXT;   -- base64 PNG de la firma dibujada

COMMENT ON COLUMN public.coyh_asistencia.firma_imagen IS
    'Imagen PNG de la firma autógrafa en base64 (data:image/png;base64,...)';
