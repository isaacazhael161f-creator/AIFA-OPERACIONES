-- ================================================================
--  SSEI · Registro de Emergencias en Pista
--  Tabla principal + bucket de fotos + RLS + datos históricos
--  Ejecutar en: Supabase -> SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- 1) TABLA
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergencias_pista (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_at     timestamptz NOT NULL DEFAULT now(),
    uploaded_by     text,
    no_consecutivo  integer,
    fecha_evento    date NOT NULL,
    pista           text,
    tipo_aeronave   text,
    operador        text,
    descripcion     text,
    clasificacion   text CHECK (clasificacion IN ('Accidente', 'Incidente')),
    fotos           jsonb NOT NULL DEFAULT '[]'::jsonb   -- arreglo de URLs públicas
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_emerg_fecha    ON public.emergencias_pista (fecha_evento);
CREATE INDEX IF NOT EXISTS idx_emerg_pista    ON public.emergencias_pista (pista);
CREATE INDEX IF NOT EXISTS idx_emerg_operador ON public.emergencias_pista (operador);
CREATE INDEX IF NOT EXISTS idx_emerg_clasif   ON public.emergencias_pista (clasificacion);

-- ----------------------------------------------------------------
-- 2) RLS de la tabla
-- ----------------------------------------------------------------
ALTER TABLE public.emergencias_pista ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='emergencias_pista' AND policyname='emerg_select_public') THEN
    CREATE POLICY "emerg_select_public" ON public.emergencias_pista FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='emergencias_pista' AND policyname='emerg_insert_auth') THEN
    CREATE POLICY "emerg_insert_auth" ON public.emergencias_pista FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='emergencias_pista' AND policyname='emerg_update_auth') THEN
    CREATE POLICY "emerg_update_auth" ON public.emergencias_pista FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='emergencias_pista' AND policyname='emerg_delete_auth') THEN
    CREATE POLICY "emerg_delete_auth" ON public.emergencias_pista FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 3) BUCKET de fotos (evidencia fotográfica de cada evento)
--    Sube tus imágenes aquí o desde el botón "Nuevo Registro".
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergencias-fotos',
  'emergencias-fotos',
  true,
  10485760,                                   -- límite 10 MB por imagen
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='emerg_fotos_select_public') THEN
    CREATE POLICY "emerg_fotos_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'emergencias-fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='emerg_fotos_insert') THEN
    CREATE POLICY "emerg_fotos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'emergencias-fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='emerg_fotos_update_auth') THEN
    CREATE POLICY "emerg_fotos_update_auth" ON storage.objects FOR UPDATE USING (bucket_id = 'emergencias-fotos' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='emerg_fotos_delete_auth') THEN
    CREATE POLICY "emerg_fotos_delete_auth" ON storage.objects FOR DELETE USING (bucket_id = 'emergencias-fotos' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 4) Datos iniciales (9 eventos · 2022-2026)
--    NOTA: el registro #4 venía como "11/'2/2025" (con un apóstrofo
--    espurio); se interpreta como 2025-02-11 por orden cronológico.
--    El arreglo "fotos" queda vacío: súbelas desde el módulo y se
--    guardarán automáticamente como URLs públicas.
-- ----------------------------------------------------------------
INSERT INTO public.emergencias_pista
    (no_consecutivo, fecha_evento, pista, tipo_aeronave, operador, clasificacion, descripcion)
VALUES
    (1, '2022-08-26', '04C', 'C-310J',    'Escuela de aviación en Atizapan de Zaragoza', 'Accidente',
     'La aeronave con matrícula XB-ONB declaró una emergencia en vuelo debido a una falla en el tren de aterrizaje. Tras el aterrizaje, la aeronave terminó detenida en el segundo tercio de la pista. No se reportaron personas lesionadas.'),
    (2, '2023-06-27', '04C', 'G-II',       'FGR', 'Accidente',
     'La aeronave con matrícula XC-LPY declaró una emergencia en vuelo debido a falla del tren de aterrizaje; tras el aterrizaje, la aeronave terminó detenida en el tercer tercio de pista. No se reportaron personas lesionadas.'),
    (3, '2024-04-24', '04L', 'BE-350I',    'FAM', 'Accidente',
     'La aeronave Z5210, que realizaba maniobras de toques y despegues, presentó una presunta pérdida de potencia en los motores, lo que ocasionó que terminara en la zona de seguridad de extremo de pista (RESA) de la pista 22R. No se reportaron personas lesionadas.'),
    (4, '2025-02-11', '04C', 'C-130',      'FAM', 'Incidente',
     'La aeronave Z3616 presentó la ponchadura de un neumático del tren de aterrizaje principal durante el aterrizaje, quedando detenida en el segundo tercio de la pista. No se reportaron personas lesionadas.'),
    (5, '2025-02-13', '04L', 'A-319',      'Volaris', 'Incidente',
     'Excursión de pista durante el aterrizaje terminando en el área verde entre rodajes A10 y A9; la tripulación no declaró emergencia, se desalojó a los pasajeros, tripulación y carga sin que hubiera lesionados.'),
    (6, '2025-02-19', '04L', 'ERJ-145LR',  'TAR Airlines (Mexicana)', 'Incidente',
     'La aeronave XA-PFL, que cubría la ruta NLU–IZT, solicitó retornar al aeropuerto de origen minutos después del despegue debido a la incertidumbre de haber sufrido la ponchadura de un neumático del tren de aterrizaje de nariz. La aeronave aterrizó sin contratiempos, constatándose que se trató de desprendimiento de la capa superior de caucho; no se reportaron personas lesionadas.'),
    (7, '2025-09-09', '04R', 'C-295',      'FAM', 'Accidente',
     'La aeronave Z3204 presentó una presunta pérdida de potencia en los motores, lo que ocasionó un aterrizaje forzoso. Como consecuencia, la aeronave sufrió daños estructurales en el fuselaje y el empenaje. Se reportaron dos personas lesionadas, quienes requirieron el uso de un chaleco de extricación para ser evacuadas de la aeronave.'),
    (8, '2026-01-15', '04C', 'C-130',      'FAM', 'Incidente',
     'La aeronave Z3616, que había despegado minutos antes de este aeropuerto, activó el código de emergencia 7700 y solicitó retornar a la estación debido a una pérdida de potencia en el motor No. 4. La aeronave aterrizó sin contratiempos y no se reportaron personas lesionadas.'),
    (9, '2026-02-15', '04C', 'B-737-9',    'Aeromexico', 'Incidente',
     'La aeronave XA-GQS con ruta PVR–MEX solicitó desviarse a este aeropuerto por presentar problemas en los flaps y calentamiento de frenos en rueda 1 y 2 del tren principal; aterrizó sin contratiempos y continuó su ruta después de recargar combustible. No se reportaron personas lesionadas.')
ON CONFLICT DO NOTHING;

-- ================================================================
--  URL pública de una foto (referencia):
--  https://<PROJECT_REF>.supabase.co/storage/v1/object/public/emergencias-fotos/<archivo>
-- ================================================================
