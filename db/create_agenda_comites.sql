-- =============================================================
--  AGENDA DE COMITÉS — AIFA OPERACIONES
--  Revisado: 2026-04-24  (estructura por Dirección / Área)
--  Ejecutar en: Supabase > SQL Editor
-- =============================================================
--
--  Rol              Dirección                              Área BD
--  ───────────────  ─────────────────────────────────────  ───────
--  operacion        Dirección de Operación                 DO
--  administracion   Dirección de Administración            DA
--  planeacion       Dirección de Planeación Estratégica    DPE
--  comercial        Dirección Comercial y de Servicios     DCS
--  seguridad_op     Gerencia de Seguridad Operacional      GSO
--  transparencia    Unidad de Transparencia                UT
--  calidad          Gestión de Calidad                     GC
--  afac             AFAC (autoridad externa)               AFAC  — solo lectura
--
--  admin / editor / superadmin → acceso total
--  viewer                      → solo lectura en todo
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. CONSTRAINT DE ROLES — actualizado por Dirección
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Migrar roles obsoletos de la versión anterior → viewer
UPDATE public.user_roles
SET role = 'viewer'
WHERE role IS NULL
   OR role NOT IN (
        'admin','editor','superadmin','viewer',
        'operacion','administracion','planeacion',
        'comercial','seguridad_op','transparencia','calidad','afac'
      );

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_role_check
    CHECK (role IN (
        'admin',           -- Acceso total
        'editor',          -- Acceso total
        'superadmin',      -- Acceso total
        'viewer',          -- Solo lectura
        'operacion',       -- Dirección de Operación              (DO)
        'administracion',  -- Dirección de Administración         (DA)
        'planeacion',      -- Dir. de Planeación Estratégica      (DPE)
        'comercial',       -- Dir. Comercial y de Servicios       (DCS)
        'seguridad_op',    -- Gerencia de Seguridad Operacional   (GSO)
        'transparencia',   -- Unidad de Transparencia             (UT)
        'calidad',         -- Gestión de Calidad                  (GC)
        'afac'             -- AFAC — solo lectura (autoridad ext.)
    ));


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: agenda_comites
--    Catálogo de comités; cada uno pertenece a una Dirección
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_comites (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    numero        TEXT        UNIQUE,             -- Ej: '1', '11', '11.1'
    nombre        TEXT        NOT NULL,
    acronimo      TEXT,                           -- Ej: 'COyH', 'CAAS', 'RST'
    descripcion   TEXT,
    area          TEXT        NOT NULL,           -- DO | DA | DPE | DCS | GSO | UT | GC | AFAC
    frecuencia    TEXT,
    hora_sesion   TIME,
    presidente    TEXT,
    participantes TEXT[],
    activo        BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.agenda_comites IS 'Catálogo de los 18 comités oficiales del AIFA por Dirección/Área';
COMMENT ON COLUMN public.agenda_comites.area IS
    'Dirección responsable: DO | DA | DPE | DCS | GSO | UT | GC | AFAC';


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: agenda_reuniones
--    Cada sesión/reunión de un comité
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_reuniones (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id      UUID        NOT NULL REFERENCES public.agenda_comites(id) ON DELETE CASCADE,
    area           TEXT        NOT NULL,
    numero_sesion  TEXT,
    fecha_sesion   DATE        NOT NULL,
    hora_inicio    TIME,
    hora_fin       TIME,
    lugar          TEXT        DEFAULT 'Sala de Juntas AIFA',
    modalidad      TEXT        DEFAULT 'Presencial',
    estatus        TEXT        NOT NULL DEFAULT 'Programada'
                   CHECK (estatus IN ('Programada','Celebrada','Cancelada','Pospuesta')),
    convocatoria   TEXT,
    observaciones  TEXT,
    created_by     UUID        REFERENCES auth.users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reunion_comite_fecha UNIQUE (comite_id, fecha_sesion)
);

COMMENT ON TABLE public.agenda_reuniones IS 'Sesiones/reuniones de cada comité';
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_comite ON public.agenda_reuniones(comite_id);
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_area   ON public.agenda_reuniones(area);
CREATE INDEX IF NOT EXISTS idx_agenda_reuniones_fecha  ON public.agenda_reuniones(fecha_sesion);


-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: agenda_temas
--    Puntos del orden del día de una reunión
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_temas (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id    UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    area          TEXT        NOT NULL,
    numero_punto  INTEGER     NOT NULL DEFAULT 1,
    titulo        TEXT        NOT NULL,
    descripcion   TEXT,
    responsable   TEXT,
    estatus       TEXT        NOT NULL DEFAULT 'Pendiente'
                  CHECK (estatus IN ('Pendiente','En proceso','Concluido','Diferido')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_temas IS 'Puntos del orden del día de cada sesión';
CREATE INDEX IF NOT EXISTS idx_agenda_temas_reunion ON public.agenda_temas(reunion_id);


-- ─────────────────────────────────────────────────────────────
-- 4. TABLA: agenda_acuerdos
--    Acuerdos y compromisos derivados de cada reunión
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agenda_acuerdos (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id      UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    tema_id         UUID        REFERENCES public.agenda_temas(id) ON DELETE SET NULL,
    area            TEXT        NOT NULL,
    numero_acuerdo  TEXT,
    descripcion     TEXT        NOT NULL,
    responsable     TEXT,
    fecha_limite    DATE,
    estatus         TEXT        NOT NULL DEFAULT 'Pendiente'
                    CHECK (estatus IN ('Pendiente','En proceso','Cumplido','Cancelado')),
    evidencia_url   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda_acuerdos IS 'Acuerdos y compromisos derivados de las reuniones';
CREATE INDEX IF NOT EXISTS idx_agenda_acuerdos_reunion ON public.agenda_acuerdos(reunion_id);
CREATE INDEX IF NOT EXISTS idx_agenda_acuerdos_area    ON public.agenda_acuerdos(area);


-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_comites_updated_at') THEN
        CREATE TRIGGER trg_comites_updated_at
            BEFORE UPDATE ON public.agenda_comites
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reuniones_updated_at') THEN
        CREATE TRIGGER trg_reuniones_updated_at
            BEFORE UPDATE ON public.agenda_reuniones
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_temas_updated_at') THEN
        CREATE TRIGGER trg_temas_updated_at
            BEFORE UPDATE ON public.agenda_temas
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_acuerdos_updated_at') THEN
        CREATE TRIGGER trg_acuerdos_updated_at
            BEFORE UPDATE ON public.agenda_acuerdos
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.agenda_comites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_temas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_acuerdos  ENABLE ROW LEVEL SECURITY;

-- ── Helper: obtener el rol del usuario actual ──────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;


-- ── Helper: ¿puede el usuario editar el área indicada? ─────────
--
--  Mapeo  rol BD         →  código área
--  ─────────────────────────────────────────────────────────────
--  admin/editor/superadmin → cualquier área
--  operacion             →  DO   (Dirección de Operación)
--  administracion        →  DA   (Dirección de Administración)
--  planeacion            →  DPE  (Dir. Planeación Estratégica)
--  comercial             →  DCS  (Dir. Comercial y Servicios)
--  seguridad_op          →  GSO  (Gerencia Seg. Operacional)
--  transparencia         →  UT   (Unidad de Transparencia)
--  calidad               →  GC   (Gestión de Calidad)
--  afac / viewer         →  solo lectura — nunca escritura

CREATE OR REPLACE FUNCTION public.agenda_puede_editar(p_area TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_role TEXT;
BEGIN
    v_role := public.get_user_role();
    RETURN
        v_role IN ('admin', 'editor', 'superadmin')
        OR (v_role = 'operacion'      AND p_area = 'DO')
        OR (v_role = 'administracion' AND p_area = 'DA')
        OR (v_role = 'planeacion'     AND p_area = 'DPE')
        OR (v_role = 'comercial'      AND p_area = 'DCS')
        OR (v_role = 'seguridad_op'   AND p_area = 'GSO')
        OR (v_role = 'transparencia'  AND p_area = 'UT')
        OR (v_role = 'calidad'        AND p_area = 'GC');
END;
$$;


-- ── POLÍTICAS: agenda_comites ──

DROP POLICY IF EXISTS "agenda_comites_select" ON public.agenda_comites;
CREATE POLICY "agenda_comites_select"
    ON public.agenda_comites FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_comites_insert" ON public.agenda_comites;
CREATE POLICY "agenda_comites_insert"
    ON public.agenda_comites FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_comites_update" ON public.agenda_comites;
CREATE POLICY "agenda_comites_update"
    ON public.agenda_comites FOR UPDATE
    USING  (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_comites_delete" ON public.agenda_comites;
CREATE POLICY "agenda_comites_delete"
    ON public.agenda_comites FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_reuniones ──

DROP POLICY IF EXISTS "agenda_reuniones_select" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_select"
    ON public.agenda_reuniones FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_reuniones_insert" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_insert"
    ON public.agenda_reuniones FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_reuniones_update" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_update"
    ON public.agenda_reuniones FOR UPDATE
    USING  (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_reuniones_delete" ON public.agenda_reuniones;
CREATE POLICY "agenda_reuniones_delete"
    ON public.agenda_reuniones FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_temas ──

DROP POLICY IF EXISTS "agenda_temas_select" ON public.agenda_temas;
CREATE POLICY "agenda_temas_select"
    ON public.agenda_temas FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_temas_insert" ON public.agenda_temas;
CREATE POLICY "agenda_temas_insert"
    ON public.agenda_temas FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_temas_update" ON public.agenda_temas;
CREATE POLICY "agenda_temas_update"
    ON public.agenda_temas FOR UPDATE
    USING  (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_temas_delete" ON public.agenda_temas;
CREATE POLICY "agenda_temas_delete"
    ON public.agenda_temas FOR DELETE
    USING (public.agenda_puede_editar(area));


-- ── POLÍTICAS: agenda_acuerdos ──

DROP POLICY IF EXISTS "agenda_acuerdos_select" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_select"
    ON public.agenda_acuerdos FOR SELECT
    USING (public.get_user_role() IS NOT NULL);

DROP POLICY IF EXISTS "agenda_acuerdos_insert" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_insert"
    ON public.agenda_acuerdos FOR INSERT
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_acuerdos_update" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_update"
    ON public.agenda_acuerdos FOR UPDATE
    USING  (public.agenda_puede_editar(area))
    WITH CHECK (public.agenda_puede_editar(area));

DROP POLICY IF EXISTS "agenda_acuerdos_delete" ON public.agenda_acuerdos;
CREATE POLICY "agenda_acuerdos_delete"
    ON public.agenda_acuerdos FOR DELETE
    USING (public.agenda_puede_editar(area));


-- =============================================================
-- 7. CATÁLOGO INICIAL — 18 Comités + 3 Subcomités del AIFA
--    Fuente: "Comités del AIFA, S.A. de C.V." — Abril 2026
-- =============================================================

INSERT INTO public.agenda_comites
    (numero, nombre, acronimo, descripcion, area, frecuencia, hora_sesion, presidente, participantes)
VALUES

-- ── DPE — Dirección de Planeación Estratégica ─────────────────
('1',
 'H. Consejo de Administración del AIFA, S.A. de C.V.', NULL,
 'Órgano supremo de gobierno. Aprueba programas, presupuestos y estructura. Mínimo 4 sesiones al año.',
 'DPE','Trimestral','11:00',
 'Gral. Div. E.M. Enrique Martínez López — Subsecretario SDN',
 ARRAY['Consejeros SDN','Dir. General del AIFA','Consejeros independientes','Sec. de Turismo','SHCP','SCT']),

('2',
 'Comisión Consultiva', NULL,
 'Promueve el aeropuerto y emite recomendaciones en materia urbana, turística y ecológica. 2 sesiones ordinarias + 5 mesas de trabajo al año.',
 'DPE','2 sesiones + 5 mesas de trabajo','11:00',
 'Director General del AIFA',
 ARRAY['Gobierno estatal y municipal','Cámaras de comercio, turismo e industria','Aerolíneas']),

('18',
 'Comité de Innovación del AIFA, S.A. de C.V.', 'CIAFA',
 'Impulsa proyectos de innovación tecnológica y operativa. 3 sesiones al año.',
 'DPE','Trimestral (3 sesiones)',NULL,
 'Director General del AIFA',
 ARRAY['Direcciones de área']),

-- ── DA — Dirección de Administración ──────────────────────────
('3',
 'Comité de Control Interno y Desempeño Institucional', 'COCODI',
 'Contribuye al cumplimiento de metas y a la administración de riesgos. 4 sesiones ordinarias al año (al menos 15 días antes de cada sesión del H. Consejo).',
 'DA','Trimestral','11:00',
 'Director General del AIFA',
 ARRAY['OIC','Vocal coord. de sector','Vocal de control interno','Dir. Jurídico','Subdirección TI']),

('4',
 'Comité de Adquisiciones, Arrendamientos y Servicios', 'CAAS',
 'Dictamina sobre adquisiciones y excepciones a licitación pública. 12 sesiones al año (último viernes de cada mes, excepto diciembre).',
 'DA','Mensual','10:00',
 'Dir. de Administración — Mtro. Orlando de Jesús Vázquez Osalde',
 ARRAY['Dir. Operación','Dir. Planeación','Subdirección RH','Recursos Financieros','Dir. Jurídico','OIC']),

('5',
 'Comité de Bienes Muebles', 'CBM',
 'Controla la disposición final, donación y enajenación de bienes muebles. 12 sesiones ordinarias al año.',
 'DA','Mensual','10:00',
 'Dir. de Administración — Lic. Orlando de Jesús Vázquez Osalde',
 ARRAY['Subdirección RH','Dir. Operación','Dir. Planeación','Dir. Comercial','Recursos Financieros']),

('6',
 'Comité de Seguridad e Higiene en el Trabajo', 'CSH',
 'Investiga causas de accidentes y enfermedades de trabajo; propone medidas preventivas. 3 comités al año.',
 'DA','3 sesiones al año','10:00',
 'Dir. de Operación — Coordinador CSH',
 ARRAY['Representantes de trabajadores','Representantes del patrón']),

('7',
 'Comisión Mixta de Capacitación, Adiestramiento y Productividad', NULL,
 'Vigila e instrumenta programas de capacitación y productividad. 4 sesiones al año.',
 'DA','4 sesiones al año',NULL,
 'Dir. de Administración — Lic. Orlando de Jesús Vázquez Osalde',
 ARRAY['Representantes del patrón (5)','Representantes de trabajadores (5)']),

('8',
 'Grupo Interdisciplinario de Archivo', 'GIA',
 'Coadyuva en la valoración documental y elaboración del catálogo de disposición. 2 sesiones al año.',
 'DA','Semestral',NULL,
 'Coordinación de Archivos',
 ARRAY['Dir. Jurídico','Dir. Planeación','Subdirección TI','Unidad de Transparencia','OIC']),

-- ── GSO — Gerencia de Seguridad Operacional ───────────────────
('9',
 'Junta de Control de Seguridad Operacional', 'JCSO',
 'Supervisa el SMS del aeropuerto. Sesiona el miércoles de la 2ª semana del mes (trimestral).',
 'GSO','Trimestral','11:00',
 'Director General del AIFA',
 ARRAY['Gerencia GSO','Dir. Jurídico','Dir. Administración','Dir. Operación','Dir. Planeación','Dir. Comercial']),

('11.2',
 'Subcomité de Seguridad Operacional en Pista (Runway Safety Team)', 'RST',
 'Analiza incidentes en pista y propone acciones de mitigación. Miércoles de la 3ª semana (bimestral).',
 'GSO','Bimestral','11:00',
 'Gerencia de Seguridad Operacional',
 ARRAY['GSO','AFAC','SENEAM','Aerolíneas','Mantenimiento']),

-- ── DO — Dirección de Operación ───────────────────────────────
('10',
 'Comité Local de Fauna Silvestre', NULL,
 'Gestiona el peligro por fauna silvestre en el aeródromo. 4 sesiones ordinarias al año.',
 'DO','Trimestral',NULL,
 'Responsable de Seguridad Operacional AIFA',
 ARRAY['Coordinador Fauna AIFA','Aerolíneas','SENEAM','GSO','Autoridades locales','Comandancia AFAC']),

('11',
 'Comité de Operación y Horarios', 'COyH',
 'Emite recomendaciones sobre operación, horarios, tarifas y conflictos aeroportuarios. 2° martes de cada mes.',
 'DO','Mensual','11:00',
 'Director General del AIFA',
 ARRAY['Comandante AFAC','SENEAM','Aerolíneas','Prestadores de servicios','Autoridades civiles y militares']),

('11.3',
 'Subcomité de Obras', NULL,
 'Revisa el avance de obras en el aeropuerto. Una vez al mes conforme a las sesiones del COyH.',
 'DO','Mensual','11:30',
 'Dirección de Operación',
 ARRAY['COyH','Mantenimiento','Contratistas']),

-- ── AFAC — Autoridad Federal de Aviación Civil (externa) ──────
('11.1',
 'Subcomité de Demoras', NULL,
 'Determina responsables y causas de demoras y cancelaciones. Presidido por el Comandante del Aeródromo (AFAC). Mensual.',
 'AFAC','Mensual','11:00',
 'Comandante del Aeródromo (AFAC)',
 ARRAY['Administrador aeroportuario','SENEAM']),

('16',
 'Comisión Coordinadora de Autoridades', 'COCOA',
 'Coordina a las autoridades civiles que operan en el aeropuerto. Una sesión al mes.',
 'AFAC','Mensual','11:00',
 'AFAC',
 ARRAY['Aduana','Migración','SAT','Policía Federal','SENASICA','AIFA']),

('17',
 'Comité Local de Seguridad Aeroportuaria', 'CLSA',
 'Revisa temas de seguridad aeroportuaria. Tercer jueves de cada mes.',
 'AFAC','Mensual','11:00',
 'AFAC',
 ARRAY['Autoridades de seguridad','Aerolíneas','AIFA','Policía Federal','Migración']),

-- ── UT — Unidad de Transparencia ──────────────────────────────
('12',
 'Comité de Transparencia', NULL,
 'Revisa y aprueba solicitudes de información pública. Dos sesiones quincenales al mes (24 al año).',
 'UT','Quincenal','11:00',
 'Titular de la Unidad de Transparencia',
 ARRAY['OIC','Dir. Jurídico','Áreas generadoras de información']),

('13',
 'Comité de Ética', NULL,
 'Promueve la cultura ética y previene conductas contrarias a la misma. 4 sesiones al año.',
 'UT','Trimestral','11:00',
 'Titular de la Unidad de Transparencia',
 ARRAY['OIC','Representantes de trabajadores','Dirección General']),

-- ── DCS — Dirección Comercial y de Servicios ──────────────────
('14',
 'Comité Interno de Contratación, Tarifas y Crédito de Servicios Aeroportuarios, Complementarios y Comerciales', 'COCOSA',
 'Dictamina sobre tarifas y contratos de servicios. Misma fecha que COyH (12:30 hs). 12 sesiones al año.',
 'DCS','Mensual','12:30',
 'Dir. Comercial y de Servicios',
 ARRAY['Dir. Operación','Dir. Planeación','Dir. Administración','Aerolíneas']),

-- ── GC — Gestión de Calidad ────────────────────────────────────
('15',
 'Comité de Calidad y Mejora Continua', NULL,
 'Revisa indicadores de calidad y propone acciones de mejora continua. 5 sesiones al año.',
 'GC','5 sesiones al año','11:00',
 'Titular de Gestión de Calidad',
 ARRAY['Todas las Direcciones'])

ON CONFLICT (numero) DO NOTHING;


-- =============================================================
-- 8. SESIONES 2026 PRE-CARGADAS
--    Fuente: Calendario de Comités del AIFA — Abril 2026
--    Fechas sin día exacto usan el 1ro del mes y se marcan
--    con observaciones como "Fecha pendiente de confirmar".
-- =============================================================

-- ── COyH (11) — DO — 2do martes de cada mes ──────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DO', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión','5ª Sesión','6ª Sesión',
               '7ª Sesión','8ª Sesión','9ª Sesión','10ª Sesión','11ª Sesión','12ª Sesión'],
         ARRAY['2026-01-13','2026-02-10','2026-03-10','2026-04-14','2026-05-12','2026-06-09',
               '2026-07-14','2026-08-11','2026-09-08','2026-10-13','2026-11-10','2026-12-08']
     ) AS t(num, fecha)
WHERE c.numero = '11'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Subcomité de Demoras (11.1) — AFAC — mensual ─────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'AFAC', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
         ARRAY['2026-01-12','2026-02-09','2026-03-09','2026-04-13','2026-05-11','2026-06-08',
               '2026-07-13','2026-08-10','2026-09-14','2026-10-12','2026-11-09','2026-12-14']
     ) AS t(num, fecha)
WHERE c.numero = '11.1'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── RST (11.2) — GSO — miérc. 3ª semana, bimestral ──────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'GSO', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión','5ª Sesión','6ª Sesión'],
         ARRAY['2026-02-18','2026-04-15','2026-06-17','2026-08-19','2026-10-21','2026-12-16']
     ) AS t(num, fecha)
WHERE c.numero = '11.2'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Subcomité de Obras (11.3) — DO — mensual con COyH ────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DO', t.num, t.fecha::DATE, '11:30'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
         ARRAY['2026-01-12','2026-02-09','2026-03-09','2026-04-13','2026-05-11','2026-06-08',
               '2026-07-13','2026-08-10','2026-09-07','2026-10-12','2026-11-09','2026-12-07']
     ) AS t(num, fecha)
WHERE c.numero = '11.3'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── JCSO (9) — GSO — miérc. 2ª semana, trimestral ───────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'GSO', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión'],
         ARRAY['2026-01-07','2026-04-08','2026-07-08','2026-10-07']
     ) AS t(num, fecha)
WHERE c.numero = '9'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Fauna (10) — DO — trimestral ─────────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion)
SELECT c.id, 'DO', t.num, t.fecha::DATE
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión'],
         ARRAY['2026-03-05','2026-06-04','2026-09-03','2026-12-03']
     ) AS t(num, fecha)
WHERE c.numero = '10'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── CAAS (4) — DA — último viernes de c/mes, excepto dic ─────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DA', t.num, t.fecha::DATE, '10:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Ses. (Inf. Trim.)','2ª Sesión','3ª Sesión','4ª Ses. (Inf. Trim.)',
               '5ª Sesión','6ª Sesión','7ª Ses. (Inf. Trim.)','8ª Sesión',
               '9ª Sesión','10ª Ses. (Inf. Trim.)','11ª Sesión','12ª Sesión'],
         ARRAY['2026-01-30','2026-02-27','2026-03-27','2026-04-24',
               '2026-05-29','2026-06-26','2026-07-31','2026-08-28',
               '2026-09-25','2026-10-30','2026-11-27','2026-12-18']
     ) AS t(num, fecha)
WHERE c.numero = '4'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Bienes Muebles (5) — DA — mensual ────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DA', t.num, t.fecha::DATE, '10:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Ses. (Inf. Trim.)','2ª Sesión','3ª Sesión','4ª Ses. (Inf. Trim.)',
               '5ª Sesión','6ª Sesión','7ª Ses. (Inf. Trim.)','8ª Sesión',
               '9ª Sesión','10ª Ses. (Inf. Trim.)','11ª Sesión','12ª Sesión'],
         ARRAY['2026-01-27','2026-02-24','2026-03-31','2026-04-28',
               '2026-05-26','2026-06-30','2026-07-28','2026-08-25',
               '2026-09-29','2026-10-27','2026-11-24','2026-12-15']
     ) AS t(num, fecha)
WHERE c.numero = '5'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── COCODI (3) — DA — trimestral (solo 1ª sesión con fecha exacta) ──
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio, observaciones)
SELECT c.id, 'DA', t.num, t.fecha::DATE, '11:00', t.obs
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión Ordinaria','2ª Sesión Ordinaria','3ª Sesión Ordinaria','4ª Sesión Ordinaria'],
         ARRAY['2026-03-11','2026-05-01','2026-08-01','2026-11-01'],
         ARRAY[NULL,'Fecha pendiente de confirmar','Fecha pendiente de confirmar','Fecha pendiente de confirmar']
     ) AS t(num, fecha, obs)
WHERE c.numero = '3'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── CSH (6) — DA — 3 sesiones al año ────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio, observaciones)
SELECT c.id, 'DA', t.num, t.fecha::DATE, '10:00', t.obs
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión'],
         ARRAY['2026-04-07','2026-09-01','2026-11-01'],
         ARRAY[NULL,'Fecha pendiente de confirmar','Fecha pendiente de confirmar']
     ) AS t(num, fecha, obs)
WHERE c.numero = '6'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Comisión Mixta Capacitación (7) — DA — 4 sesiones ────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, observaciones)
SELECT c.id, 'DA', t.num, t.fecha::DATE, 'Fecha exacta pendiente de confirmar'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión'],
         ARRAY['2026-05-01','2026-08-01','2026-10-01','2026-12-01']
     ) AS t(num, fecha)
WHERE c.numero = '7'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── GIA (8) — DA — 2 sesiones al año ─────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, observaciones)
SELECT c.id, 'DA', t.num, t.fecha::DATE, 'Fecha exacta pendiente de confirmar'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión'],
         ARRAY['2026-06-01','2026-11-01']
     ) AS t(num, fecha)
WHERE c.numero = '8'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── H. Consejo (1) — DPE — trimestral (fecha exacta por SDN) ─
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio, observaciones)
SELECT c.id, 'DPE', t.num, t.fecha::DATE, '11:00',
       'Fecha exacta determinada por la Subsecretaría de la SDN'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión Ordinaria','2ª Sesión Ordinaria','3ª Sesión Ordinaria','4ª Sesión Ordinaria'],
         ARRAY['2026-03-01','2026-06-01','2026-09-01','2026-12-01']
     ) AS t(num, fecha)
WHERE c.numero = '1'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Comisión Consultiva (2) — DPE — 2 sesiones + 5 mesas ─────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DPE', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión Ordinaria','1ª Mesa de Trabajo','2ª Mesa de Trabajo',
               '3ª Mesa de Trabajo','4ª Mesa de Trabajo','5ª Mesa de Trabajo',
               '2ª Sesión Ordinaria'],
         ARRAY['2026-01-22','2026-02-26','2026-04-30',
               '2026-07-23','2026-08-27','2026-10-29',
               '2026-11-26']
     ) AS t(num, fecha)
WHERE c.numero = '2'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── CIAFA (18) — DPE — 3 sesiones ────────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion)
SELECT c.id, 'DPE', t.num, t.fecha::DATE
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión'],
         ARRAY['2026-03-30','2026-07-27','2026-11-30']
     ) AS t(num, fecha)
WHERE c.numero = '18'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Comité de Transparencia (12) — UT — quincenal ────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'UT', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['Ene-1','Ene-2','Feb-1','Feb-2','Mar-1','Mar-2','Abr-1','Abr-2',
               'May-1','May-2','Jun-1','Jun-2','Jul-1','Jul-2','Ago-1','Ago-2',
               'Sep-1','Sep-2','Oct-1','Oct-2','Nov-1','Nov-2','Dic-1','Dic-2'],
         ARRAY['2026-01-08','2026-01-22','2026-02-12','2026-02-26',
               '2026-03-12','2026-03-26','2026-04-09','2026-04-23',
               '2026-05-14','2026-05-28','2026-06-11','2026-06-25',
               '2026-07-09','2026-07-23','2026-08-06','2026-08-20',
               '2026-09-03','2026-09-17','2026-10-08','2026-10-22',
               '2026-11-05','2026-11-19','2026-12-03','2026-12-17']
     ) AS t(num, fecha)
WHERE c.numero = '12'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Comité de Ética (13) — UT — trimestral ───────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'UT', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión'],
         ARRAY['2026-01-31','2026-04-17','2026-07-15','2026-11-15']
     ) AS t(num, fecha)
WHERE c.numero = '13'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── COCOSA (14) — DCS — mismas fechas que COyH ───────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'DCS', t.num, t.fecha::DATE, '12:30'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión','5ª Sesión','6ª Sesión',
               '7ª Sesión','8ª Sesión','9ª Sesión','10ª Sesión','11ª Sesión','12ª Sesión'],
         ARRAY['2026-01-13','2026-02-10','2026-03-10','2026-04-14','2026-05-12','2026-06-09',
               '2026-07-14','2026-08-11','2026-09-08','2026-10-13','2026-11-10','2026-12-08']
     ) AS t(num, fecha)
WHERE c.numero = '14'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── Calidad (15) — GC — 5 sesiones ───────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'GC', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['1ª Sesión','2ª Sesión','3ª Sesión','4ª Sesión','5ª Sesión'],
         ARRAY['2026-01-23','2026-04-24','2026-07-24','2026-10-23','2026-12-18']
     ) AS t(num, fecha)
WHERE c.numero = '15'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── COCOA (16) — AFAC — mensual ──────────────────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'AFAC', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
         ARRAY['2026-01-09','2026-02-13','2026-03-13','2026-04-10','2026-05-08','2026-06-12',
               '2026-07-10','2026-08-14','2026-09-11','2026-10-09','2026-11-13','2026-12-11']
     ) AS t(num, fecha)
WHERE c.numero = '16'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

-- ── CLSA (17) — AFAC — 3er jueves de c/mes ───────────────────
INSERT INTO public.agenda_reuniones (comite_id, area, numero_sesion, fecha_sesion, hora_inicio)
SELECT c.id, 'AFAC', t.num, t.fecha::DATE, '11:00'
FROM public.agenda_comites c,
     UNNEST(
         ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
         ARRAY['2026-01-15','2026-02-19','2026-03-19','2026-04-16','2026-05-21','2026-06-18',
               '2026-07-16','2026-08-20','2026-09-17','2026-10-15','2026-11-19','2026-12-17']
     ) AS t(num, fecha)
WHERE c.numero = '17'
ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;

