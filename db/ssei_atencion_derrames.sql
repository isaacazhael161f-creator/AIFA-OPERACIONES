-- ================================================================
--  SSEI · Atención a Derrames en Plataforma
--  Tabla principal + índices + RLS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.atencion_derrames (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_at         timestamptz NOT NULL DEFAULT now(),
    uploaded_by         text,
    mes                 text NOT NULL,
    fecha               date NOT NULL,
    quien_activo        text,
    hora_activacion     time,
    empresa             text,
    sitio               text,
    hora_llegada        time,
    tiempo_respuesta_min numeric(6,2),
    cantidad_m2         numeric(10,2),
    cobro_realizado     numeric(12,2)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_derrames_fecha    ON public.atencion_derrames (fecha);
CREATE INDEX IF NOT EXISTS idx_derrames_mes      ON public.atencion_derrames (mes);
CREATE INDEX IF NOT EXISTS idx_derrames_empresa  ON public.atencion_derrames (empresa);

-- RLS
ALTER TABLE public.atencion_derrames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "derrames_select_public"
    ON public.atencion_derrames FOR SELECT
    USING (true);

CREATE POLICY "derrames_insert_auth"
    ON public.atencion_derrames FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "derrames_update_auth"
    ON public.atencion_derrames FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "derrames_delete_auth"
    ON public.atencion_derrames FOR DELETE
    USING (auth.role() = 'authenticated');

-- ================================================================
--  Datos iniciales (historico 2022-2026)
-- ================================================================

INSERT INTO public.atencion_derrames
    (mes, fecha, quien_activo, hora_activacion, empresa, sitio, hora_llegada, tiempo_respuesta_min, cantidad_m2, cobro_realizado)
VALUES
    ('OCTUBRE', '2022-10-17', 'CCO', '21:36:00', 'AVIACIÓN PRIVADA', 'Aeronave A-320 Coca Cola FBO', '21:43:00', 7, 3, 1800),
    ('FEBRERO', '2023-02-17', 'CCO', '10:47:00', 'ASA', 'PIV A combustible', '10:57:00', 10, 3, NULL),
    ('FEBRERO', '2023-02-28', 'CCO', '20:29:00', 'ASA', 'Pos 112 hidráulico', '20:35:00', 6, 5, NULL),
    ('FEBRERO', '2023-02-28', 'CCO', '20:29:00', 'FBO', 'Derrame FBO', '20:35:00', 6, 16, 9600),
    ('ABRIL',   '2023-04-07', 'CCO', '17:00:00', 'AIFA GCIA Electromecanica', 'Diesel subestación #4', '17:05:00', 5, 7.5, NULL),
    ('ABRIL',   '2023-04-17', 'AFAC', '10:34:00', 'AVIACIÓN PRIVADA', 'Pos 703 combustible', '10:48:00', 14, 10.5, 6300),
    ('AGOSTO',  '2023-08-13', 'CCO', '23:21:00', 'MAS AIR CARGO', 'Pos 605A combustible', '23:35:00', 14, 130, 78000),
    ('AGOSTO',  '2023-08-14', 'CCO', '04:46:00', 'MAS AIR CARGO', 'Pos 605A combustible', '04:52:00', 6, 130, 78000),
    ('OCTUBRE', '2023-10-30', 'CCO', '22:55:00', 'ATLAS AIR', 'Pos 604 combustible', '23:01:00', 6, 16, 9600),
    ('SEPTIEMBRE', '2024-09-05', 'CCO', '00:58:00', 'CHINA SOUTHERN CARGO', 'Pos 605A hidráulico', '01:15:00', 17, 20, 12000),
    ('OCTUBRE', '2024-10-08', 'CCO', '14:30:00', 'AVIACIÓN PRIVADA', 'TWY A10/B/704B hidráulico', '14:50:00', 20, 120, 72000),
    ('ENERO',   '2025-01-22', 'CCO', '18:32:00', 'VIVA', 'TWY H hidráulico', '18:40:00', 8, 12, 7200),
    ('ABRIL',   '2025-04-04', 'CCO', '13:22:00', 'VIVA', 'Pos 107B combustible', '13:30:00', 8, 24, 14400),
    ('ABRIL',   '2025-04-25', 'CCO', '08:35:00', 'VIVA', 'Pos 505 hidráulico', '08:41:00', 6, 69, 41400),
    ('JULIO',   '2025-07-01', 'CCO', '10:22:00', 'UPS', 'Pos 602A combustible', '10:30:00', 8, 20, 12000),
    ('SEPTIEMBRE', '2025-09-21', 'CCO', '21:27:00', 'VIVA', 'Pos 503 combustible', '21:35:00', 8, 2.25, 1350),
    ('DICIEMBRE', '2025-12-28', 'CCO', '11:50:00', 'Milenium Air', 'Pos 701 combustible', '11:55:00', 5, 32, 19200),
    ('ABRIL',   '2026-04-29', 'CCO', '08:50:00', 'VIVA', 'TWY J4/K/K3/J/P hidráulico', '08:53:00', 3, 1134, 680400)
ON CONFLICT DO NOTHING;
