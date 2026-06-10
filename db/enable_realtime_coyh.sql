-- Habilitar Supabase Realtime en las tablas del COyH
-- Ejecutar una sola vez en el SQL Editor de Supabase

-- Agregar ambas tablas a la publicación de replicación de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.coyh_asistencia;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coyh_confirmaciones;
