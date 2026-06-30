-- ================================================================
--  Ingeniería Civil · ETP — Vidrios y Filtraciones
--  Origen: "Datos ETP SLOTS.xlsx" (5 pestañas)
--  2 tablas + RLS + vistas de gráficos + datos históricos
--  Ejecutar en: Supabase -> SQL Editor
-- ================================================================

-- ================================================================
--  TABLA 1 · VIDRIOS DEL ETP  (2023 · 2024 · 2025 · 2026)
--  Consolidado de vidrios atendidos y pendientes del polígono
--  aeroportuario (ETP Cubierta/Fachada/Zona Estéril/Plaza Mexicana,
--  Área Pública, FBO, Edificio de Servicios, CC Santa Lucía, etc.)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vidrios_etp (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_at           timestamptz NOT NULL DEFAULT now(),
    uploaded_by           text,
    no_consecutivo        integer,                 -- No. (consecutivo del año)
    anio                  integer,                 -- 2023..2026 (derivado de fecha de reporte)
    fecha_reporte         date,
    ubicacion             text,                    -- ETP Cubierta / Fachada / Zona Estéril / Plaza Mexicana / Área Pública / FBO ...
    nivel                 text,                    -- mixto: 29, 19.9, 5.25, 10.5, "PB", "3er nivel", "N/A"
    descripcion           text,
    cantidad              integer DEFAULT 1,
    hallazgo              text,
    tiempo_atencion_dias  integer,                 -- meta de atención (días)
    entidad_reporta       text,
    fecha_atencion        date,                    -- NULL si está pendiente
    dias_atencion         integer,                 -- días reales transcurridos
    estatus               text CHECK (estatus IN ('Atendido','Pendiente')),
    observaciones         text
);

CREATE INDEX IF NOT EXISTS idx_vidrios_anio    ON public.vidrios_etp (anio);
CREATE INDEX IF NOT EXISTS idx_vidrios_fecha   ON public.vidrios_etp (fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_vidrios_ubic    ON public.vidrios_etp (ubicacion);
CREATE INDEX IF NOT EXISTS idx_vidrios_estatus ON public.vidrios_etp (estatus);

ALTER TABLE public.vidrios_etp ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vidrios_etp' AND policyname='vidrios_select_public') THEN
    CREATE POLICY "vidrios_select_public" ON public.vidrios_etp FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vidrios_etp' AND policyname='vidrios_insert_auth') THEN
    CREATE POLICY "vidrios_insert_auth" ON public.vidrios_etp FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vidrios_etp' AND policyname='vidrios_update_auth') THEN
    CREATE POLICY "vidrios_update_auth" ON public.vidrios_etp FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='vidrios_etp' AND policyname='vidrios_delete_auth') THEN
    CREATE POLICY "vidrios_delete_auth" ON public.vidrios_etp FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ================================================================
--  TABLA 2 · FILTRACIONES (Servicio de Mantenimiento a Techumbres)
--  Filtraciones por módulo (A..N) en cubierta nivel 29.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.filtraciones_etp (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_at           timestamptz NOT NULL DEFAULT now(),
    uploaded_by           text,
    no_consecutivo        integer,
    fecha_reporte         date,
    modulo                text,                    -- A, B, C, D, E1..E4, F, G1, G2, H, I, J, K, L, M, N
    nivel                 text,                    -- 29
    tipo_hallazgo         text,                    -- Filtración
    elemento_afectado     text,                    -- Panel / Columna / Flashing / Domo / Caballete / Canalón / Junta sísmica
    cantidad              integer DEFAULT 1,
    hallazgo              text,
    tiempo_atencion_dias  integer,                 -- N/A en el origen -> NULL
    entidad_reporta       text,                    -- Comunidad aeroportuaria
    fecha_atencion        date,
    estatus               text CHECK (estatus IN ('Atendido','Pendiente')),
    reincidencia          boolean NOT NULL DEFAULT false  -- pendiente "con reincidencia" vs "sin atender"
);

CREATE INDEX IF NOT EXISTS idx_filtr_fecha   ON public.filtraciones_etp (fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_filtr_modulo  ON public.filtraciones_etp (modulo);
CREATE INDEX IF NOT EXISTS idx_filtr_elem    ON public.filtraciones_etp (elemento_afectado);
CREATE INDEX IF NOT EXISTS idx_filtr_estatus ON public.filtraciones_etp (estatus);

ALTER TABLE public.filtraciones_etp ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='filtraciones_etp' AND policyname='filtr_select_public') THEN
    CREATE POLICY "filtr_select_public" ON public.filtraciones_etp FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='filtraciones_etp' AND policyname='filtr_insert_auth') THEN
    CREATE POLICY "filtr_insert_auth" ON public.filtraciones_etp FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='filtraciones_etp' AND policyname='filtr_update_auth') THEN
    CREATE POLICY "filtr_update_auth" ON public.filtraciones_etp FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='filtraciones_etp' AND policyname='filtr_delete_auth') THEN
    CREATE POLICY "filtr_delete_auth" ON public.filtraciones_etp FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ================================================================
--  VISTAS DE GRÁFICOS (propuestas tomadas de las pestañas
--  "Graficas Vidrios" y "Graficas Filtraciones" del Excel).
--  Sirven para alimentar directamente los charts del módulo.
-- ================================================================

-- ── VIDRIOS · Resumen por año (reportados vs atendidos) ──
CREATE OR REPLACE VIEW public.v_vidrios_por_anio AS
SELECT anio,
       COUNT(*)                                          AS reportados,
       COUNT(*) FILTER (WHERE estatus = 'Atendido')      AS atendidos,
       COUNT(*) FILTER (WHERE estatus = 'Pendiente')     AS pendientes
FROM public.vidrios_etp
GROUP BY anio
ORDER BY anio;

-- ── VIDRIOS · Reportados por ubicación / elemento ──
CREATE OR REPLACE VIEW public.v_vidrios_por_ubicacion AS
SELECT ubicacion, COUNT(*) AS reportados
FROM public.vidrios_etp
GROUP BY ubicacion
ORDER BY reportados DESC;

-- ── VIDRIOS · Avance (estatus) ──
CREATE OR REPLACE VIEW public.v_vidrios_avance AS
SELECT estatus, COUNT(*) AS total
FROM public.vidrios_etp
GROUP BY estatus;

-- ── FILTRACIONES · Por módulo ──
CREATE OR REPLACE VIEW public.v_filtraciones_por_modulo AS
SELECT modulo, SUM(cantidad) AS cantidad
FROM public.filtraciones_etp
GROUP BY modulo
ORDER BY cantidad DESC;

-- ── FILTRACIONES · Por elemento dañado ──
CREATE OR REPLACE VIEW public.v_filtraciones_por_elemento AS
SELECT elemento_afectado, SUM(cantidad) AS cantidad
FROM public.filtraciones_etp
GROUP BY elemento_afectado
ORDER BY cantidad DESC;

-- ── FILTRACIONES · Tendencia por fecha de reporte (acumulado) ──
CREATE OR REPLACE VIEW public.v_filtraciones_tendencia AS
SELECT fecha_reporte,
       SUM(cantidad)                                          AS cantidad,
       SUM(SUM(cantidad)) OVER (ORDER BY fecha_reporte)       AS acumulado
FROM public.filtraciones_etp
GROUP BY fecha_reporte
ORDER BY fecha_reporte;

-- ── FILTRACIONES · Avance (atendido / pendiente con-sin reincidencia) ──
CREATE OR REPLACE VIEW public.v_filtraciones_avance AS
SELECT
  CASE
    WHEN estatus = 'Atendido' THEN 'Atendido'
    WHEN estatus = 'Pendiente' AND reincidencia THEN 'Pendiente · con reincidencia'
    ELSE 'Pendiente · sin atender'
  END AS estatus_detalle,
  COUNT(*) AS total
FROM public.filtraciones_etp
GROUP BY 1
ORDER BY total DESC;

-- ================================================================
--  DATOS INICIALES · VIDRIOS  (66 registros · 2023-2026)
--  Las ubicaciones combinadas en Excel se rellenaron hacia abajo.
-- ================================================================
INSERT INTO public.vidrios_etp
  (no_consecutivo, anio, fecha_reporte, ubicacion, nivel, descripcion, cantidad, hallazgo, tiempo_atencion_dias, entidad_reporta, fecha_atencion, dias_atencion, estatus, observaciones)
VALUES
  (1, 2023, '2023-10-06', 'ETP Cubierta', '29', 'Mod C', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (2, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod D', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (3, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod E2, en cambio de nivel', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (4, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod G1, a la mitad del domo', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (5, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod G1, mirando a pos 133', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (6, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod I, primer entrecalle', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (7, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod K', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (8, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod N, 4ta entrecalle der', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (9, 2023, '2023-10-06', 'ETP Cubierta', '19.9', 'Mod N, 4ta entrecalle izq', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-05-21', 229, 'Atendido', NULL),
  (10, 2023, '2023-10-06', 'ETP Fachada', '5.25', 'Mod E1, a la izq del prepuente 109', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-14', 526, 'Atendido', NULL),
  (11, 2023, '2023-10-06', 'ETP Fachada', '5.25', 'Mod A', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-04', 547, 'Atendido', NULL),
  (12, 2023, '2023-10-06', 'ETP Fachada', '5.25', 'Mod C, en prepuente 107', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-23', 566, 'Atendido', NULL),
  (13, 2023, '2023-10-06', 'ETP Fachada', '10.5', 'Mod G1, a la izq del prepuente 114', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-09', 582, 'Atendido', NULL),
  (14, 2023, '2023-10-06', 'ETP Fachada', '10.5', 'Mod L, arriba de puerta 1', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-04', 638, 'Atendido', NULL),
  (15, 2023, '2023-10-06', 'ETP Fachada', '10.5', 'Mod L, arriba de pórtico de puerta 1', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-04', 638, 'Atendido', NULL),
  (16, 2023, '2023-10-06', 'ETP Fachada', '5.25', 'Mod H, en la esquina del módulo', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-04', 638, 'Atendido', NULL),
  (17, 2024, '2024-02-28', 'ETP Fachada', '10.5', 'Mod B, en posición 106', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-23', 421, 'Atendido', NULL),
  (18, 2024, '2024-07-26', 'Área Pública', '5.25', '4 pzas de vidrio en el Edificio LSG Sky Chefs', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-09-03', 40, 'Atendido', NULL),
  (19, 2024, '2024-08-07', 'Plaza Mexicana', '10.5', 'Vidrio en techumbre del acceso del andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-10-31', 86, 'Atendido', NULL),
  (20, 2024, '2024-08-07', 'Área Pública', '5.25', 'En puente peatonal a un costado del estacionamiento de empleados', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-02', 269, 'Atendido', NULL),
  (21, 2024, '2024-08-07', 'Plaza Mexicana', '10.5', '7mo vidrio superior en cara lateral izquierda del acceso del andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-10-13', 433, 'Atendido', NULL),
  (22, 2024, '2024-08-23', 'ETP Cubierta', '19.9', 'Mod G1, en domo de vidrio sobre baño Catrina', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2024-08-23', 1, 'Atendido', NULL),
  (23, 2024, '2024-08-23', 'Plaza Mexicana', '10.5', '2do vidrio superior en cara lateral izquierda del acceso del andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-10-13', 417, 'Atendido', NULL),
  (24, 2024, '2024-10-23', 'Zona estéril', '5.25', 'Mod C, arriba de puerta automática corrediza', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-09', 260, 'Atendido', NULL),
  (25, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod D, en estacionamiento de directivos', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-07', 66, 'Atendido', NULL),
  (26, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod G2, a la izq del prepuente 115', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-11', 70, 'Atendido', NULL),
  (27, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod G2, a la der del prepuente 133', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-12', 71, 'Atendido', NULL),
  (28, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod E1, a la der del prepuente 109', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-02', 92, 'Atendido', NULL),
  (29, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod E4, esquina mirando a plataforma central', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-15', 105, 'Atendido', NULL),
  (30, 2025, '2025-01-01', 'ETP Fachada', '14.7', 'Mod E4, arriba del mezanine', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-16', 106, 'Atendido', NULL),
  (31, 2025, '2025-01-01', 'ETP Fachada', '10.5', 'Mod E2, detrás de local comercial Coffe Diemme', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-08', 128, 'Atendido', NULL),
  (32, 2025, '2025-01-01', 'ETP Fachada', '14.7', 'Mod E4, frente a la columna 112A', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-20', 140, 'Atendido', NULL),
  (33, 2025, '2025-01-01', 'ETP Fachada', '5.25', 'Mod E4, a la der del prepuente 112', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-06-26', 177, 'Atendido', NULL),
  (34, 2025, '2025-01-08', 'ETP Fachada', '10.5', 'Mod H, detrás del área de juegos', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-10', 62, 'Atendido', NULL),
  (35, 2025, '2025-01-08', 'ETP Fachada', '0', 'Mod L, a un costado de la puerta 3', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-10', 62, 'Atendido', NULL),
  (36, 2025, '2025-02-01', 'ETP Fachada', '10.5', 'Mod I, fachada del Salón Oficial', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-07', 35, 'Atendido', NULL),
  (37, 2025, '2025-02-08', 'Área Pública', '10.5', 'Mod M, a la derecha de la junta sísmica L-M', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-29', 111, 'Atendido', NULL),
  (38, 2025, '2025-03-01', 'ETP Cubierta', '19.9', 'Mod L, arriba de cajeros citibanamex', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-27', 88, 'Atendido', NULL),
  (39, 2025, '2025-03-05', 'Plaza Mexicana', '10.5', '2 pzas de vidrio en cara lateral izquierda del acceso del andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-30', 87, 'Atendido', NULL),
  (40, 2025, '2025-03-27', 'ETP Fachada', '10.5', 'Mod G1, entre pos 133 y 134', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-10', 106, 'Atendido', NULL),
  (41, 2025, '2025-04-01', 'ETP Fachada', '10.5', 'Mod G1, arriba de puertas de seguridad', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-07', 37, 'Atendido', NULL),
  (42, 2025, '2025-04-01', 'ETP Cubierta', '19.9', 'Mod E2, frente a pos 110', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-12', 42, 'Atendido', NULL),
  (43, 2025, '2025-04-01', 'ETP Cubierta', '19.9', 'Mod E3', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-13', 43, 'Atendido', NULL),
  (44, 2025, '2025-04-01', 'ETP Cubierta', '19.9', 'Mod E4', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-26', 56, 'Atendido', NULL),
  (45, 2025, '2025-04-10', 'ETP Fachada', '10.5', 'Mod L, arriba de puerta 2', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-04', 86, 'Atendido', NULL),
  (46, 2025, '2025-05-02', 'ETP Cubierta', '19.9', 'Mod L, frente a puerta 2', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-05-28', 27, 'Atendido', NULL),
  (47, 2025, '2025-05-10', 'ETP Zona estéril', '5.25', 'Mod A, en barandal a un costado de las escaleras eléctricas', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-04-05', -34, 'Atendido', NULL),
  (48, 2025, '2025-06-10', 'Plaza Mexicana', '10.5', '1er vidrio inferior en cara lateral derecha del acceso al andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-07-09', 30, 'Atendido', NULL),
  (49, 2025, '2025-07-18', 'ETP Zona estéril', '10.5', 'Mod G1, vidrio de barandal entre pos 132 y 133', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2025-03-06', -133, 'Atendido', NULL),
  (50, 2025, '2025-10-01', 'ETP Cubierta', '19.9', 'Mod I, arriba de lineas 1 y 2 de PIPE N', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-12-29', 455, 'Atendido', NULL),
  (1, 2025, '2025-12-15', 'ETP Zona estéril', '5.25', 'Módulo C, en pasillo de prepuente 107', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-03-03', 79, 'Atendido', NULL),
  (2, 2026, '2026-01-01', 'FBO', 'PA', 'Barandal de escalera, primer nivel', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-01-30', 30, 'Atendido', NULL),
  (3, 2026, '2026-01-01', 'Edificio de Servicios', '3er nivel', 'Vidrio de fachada, a un costado de puente', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-01-30', 30, 'Atendido', NULL),
  (4, 2026, '2026-03-02', 'FBO', 'PB', 'En la caseta del acceso vehicular hacia plataforma, ubicada en el FBO', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-04-06', 36, 'Atendido', NULL),
  (5, 2026, '2026-03-03', 'ETP Plaza Mexicana', '10.5', '1er vidrio superior en cara lateral derecha del acceso al andador cultural', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-04-06', 35, 'Atendido', NULL),
  (6, 2026, '2026-03-29', 'ETP Cubierta', '29', 'Mod G1, frente a posición 134A derecha', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL),
  (7, 2026, '2026-03-29', 'ETP Cubierta', '29', 'Mod G1, frente a posición 134A izquierda', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL),
  (8, 2026, '2026-03-29', 'ETP Cubierta', '29', 'Mod G1, frente a posición 114', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL),
  (9, 2026, '2026-03-29', 'ETP Cubierta', '29', 'Mod G1, a mitad de primer domo de vidrio', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-06-15', 79, 'Atendido', NULL),
  (10, 2026, '2026-04-09', 'ETP Plaza Mexicana', '10.5', 'Fachada lateral derecha, 2do vidrio inferior', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-05-13', 35, 'Atendido', NULL),
  (11, 2026, '2026-05-04', 'Área Pública Puente peatonal', 'N/A', 'Vidrio roto en puente peatonal, lado hotel holiday inn', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL),
  (12, 2026, '2026-05-11', 'ETP Plaza Mexicana', '10.5', 'Fachada lateral derecha, 8vo vidrio inferior', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-05-29', 19, 'Atendido', NULL),
  (13, 2026, '2026-05-14', 'ETP Cubierta', '29', 'Módulo A, 2do domo de vidrio', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', 'Se tomaron medidas el 19/05/2026'),
  (14, 2026, '2026-05-15', 'Centro Comercial Plaza Santa Lucía', 'PB', 'Vidrio de puerta de acceso principal', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', '2026-05-29', 15, 'Atendido', NULL),
  (15, 2026, '2026-06-15', 'ETP Plaza Mexicana', '10.5', 'Fachada lateral derecha, vidrio inferior', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL),
  (16, 2026, '2026-06-19', 'ETP Plaza Mexicana', '10.5', 'Módulo A, frente al estacionamiento de proveedores', 1, 'Sin afectación a la ruta del pasajero', 40, 'Dirección de Administración / Dirección de Operación', NULL, NULL, 'Pendiente', NULL)
ON CONFLICT DO NOTHING;

-- ================================================================
--  DATOS INICIALES · FILTRACIONES  (117 registros · 2026)
-- ================================================================
INSERT INTO public.filtraciones_etp
  (no_consecutivo, fecha_reporte, modulo, nivel, tipo_hallazgo, elemento_afectado, cantidad, hallazgo, tiempo_atencion_dias, entidad_reporta, fecha_atencion, estatus)
VALUES
  (1, '2026-03-09', 'A', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-22', 'Atendido'),
  (2, '2026-03-09', 'A', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-22', 'Atendido'),
  (3, '2026-03-09', 'A', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-22', 'Atendido'),
  (4, '2026-03-09', 'B', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-22', 'Atendido'),
  (5, '2026-03-09', 'C', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-23', 'Atendido'),
  (6, '2026-03-09', 'C', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-23', 'Pendiente'),
  (7, '2026-03-09', 'C', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-23', 'Atendido'),
  (8, '2026-03-09', 'D', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-23', 'Atendido'),
  (9, '2026-03-09', 'D', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-23', 'Pendiente'),
  (10, '2026-03-09', 'D', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-24', 'Pendiente'),
  (11, '2026-03-09', 'D', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-24', 'Pendiente'),
  (12, '2026-03-09', 'D', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-24', 'Pendiente'),
  (13, '2026-03-09', 'E1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-25', 'Pendiente'),
  (14, '2026-03-09', 'E1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-25', 'Pendiente'),
  (15, '2026-03-09', 'E1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-25', 'Pendiente'),
  (16, '2026-03-09', 'E1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-25', 'Pendiente'),
  (17, '2026-03-09', 'E1', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-25', 'Atendido'),
  (18, '2026-03-09', 'E2', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Atendido'),
  (19, '2026-03-09', 'E2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Pendiente'),
  (20, '2026-03-09', 'E2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Pendiente'),
  (21, '2026-03-09', 'E2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Pendiente'),
  (22, '2026-03-09', 'E2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Pendiente'),
  (23, '2026-03-09', 'E2', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-26', 'Atendido'),
  (24, '2026-03-09', 'E3', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (25, '2026-03-09', 'E3', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Pendiente'),
  (26, '2026-03-09', 'E3', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Pendiente'),
  (27, '2026-03-09', 'E4', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (28, '2026-03-09', 'E4', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (29, '2026-03-09', 'E4', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (30, '2026-03-09', 'E4', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (31, '2026-03-09', 'E4', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (32, '2026-03-09', 'E4', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Pendiente'),
  (33, '2026-03-09', 'E4', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Pendiente'),
  (34, '2026-03-09', 'F', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (35, '2026-03-09', 'F', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-28', 'Atendido'),
  (36, '2026-03-09', 'F', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (37, '2026-03-09', 'G1', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (38, '2026-03-09', 'G1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Pendiente'),
  (39, '2026-03-09', 'G1', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (40, '2026-03-09', 'G2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Pendiente'),
  (41, '2026-03-09', 'H', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Pendiente'),
  (42, '2026-03-09', 'H', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Pendiente'),
  (43, '2026-03-18', 'I', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (44, '2026-03-18', 'J', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (45, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (46, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-30', 'Atendido'),
  (47, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Atendido'),
  (48, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Atendido'),
  (49, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Atendido'),
  (50, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Atendido'),
  (51, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Atendido'),
  (52, '2026-03-18', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-29', 'Pendiente'),
  (53, '2026-04-08', 'B', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', '2026-04-22', 'Pendiente'),
  (54, '2026-04-08', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (55, '2026-04-30', 'L', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (56, '2026-04-30', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (57, '2026-05-06', 'D', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (58, '2026-05-06', 'D', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (59, '2026-05-06', 'D', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (60, '2026-05-06', 'E4', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (61, '2026-05-06', 'E4', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (62, '2026-05-06', 'E4', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (63, '2026-05-06', 'E4', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (64, '2026-05-06', 'F', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (65, '2026-05-06', 'G2', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (66, '2026-05-06', 'H', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (67, '2026-05-06', 'H', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (68, '2026-05-06', 'F', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (69, '2026-05-06', 'L', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (70, '2026-05-06', 'L', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (71, '2026-05-06', 'L', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (72, '2026-05-06', 'M', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (73, '2026-05-06', 'N', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (74, '2026-05-06', 'J', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (75, '2026-05-06', 'E1', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (76, '2026-05-06', 'E2', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (77, '2026-05-06', 'F', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (78, '2026-05-06', 'E3', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (79, '2026-05-06', 'E3', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (80, '2026-05-11', 'K', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (81, '2026-05-11', 'G1', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (82, '2026-05-11', 'F', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (83, '2026-05-11', 'L', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (84, '2026-05-12', 'N', '29', 'Filtración', 'Flashing', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (85, '2026-05-19', 'A', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (86, '2026-05-19', 'C', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (87, '2026-05-19', 'E1', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (88, '2026-05-19', 'E1', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (89, '2026-05-19', 'J', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (90, '2026-05-19', 'K', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (91, '2026-05-19', 'K', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (92, '2026-05-19', 'M', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (93, '2026-05-19', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (94, '2026-06-02', 'D', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (95, '2026-06-02', 'E1', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (96, '2026-06-02', 'E2', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (97, '2026-06-02', 'E3', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (98, '2026-06-02', 'E4', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (99, '2026-06-02', 'E4', '29', 'Filtración', 'Junta sísmica', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (100, '2026-06-02', 'F', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (101, '2026-06-02', 'F', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (102, '2026-06-02', 'H', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (103, '2026-06-02', 'H', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (104, '2026-06-04', 'D', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (105, '2026-06-04', 'D', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (106, '2026-06-04', 'E3', '29', 'Filtración', 'Columna', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (107, '2026-06-04', 'H', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (108, '2026-06-04', 'J', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (109, '2026-06-04', 'J', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (110, '2026-06-04', 'J', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (111, '2026-06-04', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (112, '2026-06-04', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (113, '2026-06-04', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (114, '2026-06-04', 'N', '29', 'Filtración', 'Caballete / Canalón', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (115, '2026-06-18', 'D', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (116, '2026-06-18', 'N', '29', 'Filtración', 'Panel', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente'),
  (117, '2026-06-18', 'E2', '29', 'Filtración', 'Domo', 1, 'Sin afectación a la ruta del pasajero', NULL, 'Comunidad aeroportuaria', NULL, 'Pendiente')
ON CONFLICT DO NOTHING;

-- ================================================================
--  Verificación rápida:
--    SELECT * FROM public.v_vidrios_por_anio;
--    SELECT * FROM public.v_filtraciones_por_modulo;
--    SELECT * FROM public.v_filtraciones_avance;
-- ================================================================
