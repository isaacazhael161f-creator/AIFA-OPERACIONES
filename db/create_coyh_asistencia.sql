-- =============================================================
--  LISTA DE ASISTENCIA — COMITÉ DE OPERACIÓN Y HORARIOS (COyH)
--  Ejecutar en: Supabase > SQL Editor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: coyh_participantes
--    Catálogo maestro de participantes del COyH
--    (Permisionarios, Operadores, Prestadores, Autoridades)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coyh_participantes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dependencia   TEXT        NOT NULL,           -- Nombre de la empresa/dependencia
    nombre        TEXT        NOT NULL,           -- Nombre del representante
    cargo         TEXT        NOT NULL,           -- Cargo/función
    tipo          TEXT        NOT NULL            -- 'titular' | 'suplente'
                  CHECK (tipo IN ('titular','suplente')),
    categoria     TEXT        NOT NULL DEFAULT 'otros'
                  CHECK (categoria IN ('permisionarios','operadores_aereos','prestadores','autoridades','otros')),
    activo        BOOLEAN     NOT NULL DEFAULT true,
    orden         INT         DEFAULT 99,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.coyh_participantes IS 'Catálogo de participantes registrados en el COyH';
COMMENT ON COLUMN public.coyh_participantes.tipo      IS 'titular = representante principal, suplente = sustituto';
COMMENT ON COLUMN public.coyh_participantes.categoria IS 'Grupo al que pertenece según el acta del COyH';

-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: coyh_asistencia
--    Registro de asistencia por sesión
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coyh_asistencia (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id       UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    participante_id  UUID        NOT NULL REFERENCES public.coyh_participantes(id) ON DELETE CASCADE,
    -- Datos en el momento de la firma (permiten variaciones respecto al catálogo)
    dependencia      TEXT        NOT NULL,
    nombre           TEXT        NOT NULL,
    cargo            TEXT        NOT NULL,
    tipo             TEXT        NOT NULL CHECK (tipo IN ('titular','suplente')),
    -- Firma digital
    firmado          BOOLEAN     NOT NULL DEFAULT false,
    firmado_at       TIMESTAMPTZ,
    firmado_por      UUID        REFERENCES auth.users(id),  -- usuario que registró la firma
    -- Metadatos
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(reunion_id, participante_id)
);

COMMENT ON TABLE  public.coyh_asistencia IS 'Lista de asistencia por sesión del COyH';
COMMENT ON COLUMN public.coyh_asistencia.firmado     IS 'true = participante firmó/asistió';
COMMENT ON COLUMN public.coyh_asistencia.firmado_at  IS 'Timestamp de cuando se registró la firma';

-- ─────────────────────────────────────────────────────────────
-- 3. FUNCIÓN: genera lista vacía para una sesión
--    Copia los participantes activos del catálogo a coyh_asistencia
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generar_lista_asistencia(p_reunion_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT := 0;
BEGIN
    INSERT INTO public.coyh_asistencia (
        reunion_id, participante_id, dependencia, nombre, cargo, tipo
    )
    SELECT
        p_reunion_id,
        id,
        dependencia,
        nombre,
        cargo,
        tipo
    FROM public.coyh_participantes
    WHERE activo = true
    ON CONFLICT (reunion_id, participante_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.fn_generar_lista_asistencia IS
    'Genera la lista de asistencia vacía para una sesión copiando el catálogo activo de participantes';

-- ─────────────────────────────────────────────────────────────
-- 4. RLS — Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.coyh_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coyh_asistencia    ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado puede ver
CREATE POLICY "coyh_participantes_read" ON public.coyh_participantes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "coyh_asistencia_read" ON public.coyh_asistencia
    FOR SELECT TO authenticated USING (true);

-- Escritura en participantes: solo admin/editor/superadmin/operacion
CREATE POLICY "coyh_participantes_write" ON public.coyh_participantes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor','superadmin','operacion')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor','superadmin','operacion')
        )
    );

-- Firma: cualquier usuario autenticado puede marcar asistencia
CREATE POLICY "coyh_asistencia_insert" ON public.coyh_asistencia
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "coyh_asistencia_update" ON public.coyh_asistencia
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Admin puede eliminar registros de asistencia
CREATE POLICY "coyh_asistencia_delete" ON public.coyh_asistencia
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin','editor','superadmin','operacion')
        )
    );

-- ─────────────────────────────────────────────────────────────
-- 5. ÍNDICES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coyh_asistencia_reunion   ON public.coyh_asistencia(reunion_id);
CREATE INDEX IF NOT EXISTS idx_coyh_asistencia_part      ON public.coyh_asistencia(participante_id);
CREATE INDEX IF NOT EXISTS idx_coyh_participantes_cat    ON public.coyh_participantes(categoria, activo);

-- ─────────────────────────────────────────────────────────────
-- 6. DATOS INICIALES — participantes del ACTA No. 4/2026
--    Basado en la lista oficial de la 4a Sesión Ordinaria,
--    14 Abril 2026. Sirve como catálogo base.
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.coyh_participantes
    (dependencia, nombre, cargo, tipo, categoria, orden)
VALUES
    -- === AUTORIDADES Y DEPENDENCIAS GUBERNAMENTALES ===
    ('AIFA, S.A. DE C.V.',                                          'DR. ISIDORO PASTOR ROMÁN',            'Director General del AIFA y Presidente del Comité',                    'titular',  'autoridades', 1),
    ('AGENCIA FEDERAL DE AVIACIÓN CIVIL',                           'MTRO. SERGIO VALENTÍN GARCÍA MARTÍNEZ','Comandante del AIFA',                                                   'titular',  'autoridades', 2),
    ('SECRETARIO DE ACTAS',                                         'MTRO. GONZALO SANDOVAL GONZÁLEZ',     'Dir. Opn. y Secretario de Actas del Comité',                            'titular',  'autoridades', 3),
    ('SECRETARÍA DE LA DEFENSA NACIONAL',                           'CAP.1/O. F.A.C.V. RUBÉN LÓPEZ GONZALEZ','Cmte. del Escuadrón de Control Aéreo de la 1/A. Z.A.M.',              'suplente', 'autoridades', 4),
    ('INSTITUTO NACIONAL DE MIGRACIÓN',                             'COR. ING. RET AGUSTÍN CAMACHO MUÑOZ', 'Subrepresentante Federal del Instituto Nacional de Migración',          'titular',  'autoridades', 5),
    ('GUARDIA NACIONAL — SEGURIDAD EXTERIOR',                       'CAP. 1/O G.N. LUIS ANTONIO MORALES MARTINEZ','Jefe Secc. Operativa',                                          'suplente', 'autoridades', 6),
    ('GUARDIA NACIONAL — SEGURIDAD INTERIOR',                       'TTE. COR. G.N. ISABEL CENTURION RODRIGUEZ','2/O. Cmte. 16/O. Btn. SVS. Espls. Pol. Mil.',                     'suplente', 'autoridades', 7),
    ('GRUPO MUNDO MAYA',                                            'COR. F.A.A.M.A. E.M. JOSÉ ÁNGEL RETANA PAZ','Subdirector General de Hidrocarburos',                           'titular',  'autoridades', 8),
    ('AGENCIA NACIONAL DE ADUANAS DE MÉXICO',                       'CAP. 2/O INF. RET. VICTOR MANUEL VELAZQUEZ GLINDO','Jefe de Departamento',                                    'suplente', 'autoridades', 9),
    ('SENEAM',                                                      'CTA. ÁNGEL VIDAL CASTRO',             'Jefe de Estación Aeroportuaria AIFA',                                   'titular',  'autoridades', 10),
    ('FISCALÍA GENERAL DE LA REPÚBLICA',                            'LIC. ANTONIO ZARDÓN MENÉNDEZ',        'Subdelegado Administrativo de la FGR en el Estado de México',           'titular',  'autoridades', 11),
    ('CENTRO NACIONAL DE INTELIGENCIA',                             'JORGE ALBERTO SILVA ZAVALA',          'Representante CNI en el AIFA',                                          'titular',  'autoridades', 12),
    ('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA','ING. DANIEL GARCÍA CONTRERAS',  'Responsable de Oficina de Inspección de Sanidad Agropecuaria (OISA)',   'titular',  'autoridades', 13),
    ('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA','MVZ. ROBERTO CARLOS HERNÁNDEZ SUASTE','Jefe de Turno Encargado de OISA',                                'titular',  'autoridades', 14),
    ('PROCURADURÍA FEDERAL DEL CONSUMIDOR',                         'ANDRÉS ÁVILA MARROQUÍN',              'Coordinador y Enlace de Módulos de PROFECO en el AIFA',                 'suplente', 'autoridades', 15),
    ('PROCURADURÍA FEDERAL DE PROTECCIÓN AL AMBIENTE',              'BIÓL. CLARA CATALINA SORIANO BERNAL', 'Inspectora Federal Adscrita al Aeropuerto Internacional "Gral. Felipe Ángeles"','titular','autoridades',16),
    ('SANIDAD INTERNACIONAL',                                       'DRA. ALEJANDRA BUENSUSESO SÁNCHEZ',   'Médico Departamento de Sanidad Internacional',                          'suplente', 'autoridades', 17),
    -- === OPERADORES AÉREOS ===
    ('AEROMÉXICO',                                                  'HÉCTOR PÉREZ FRAGA',                  'Gerente de Aeropuerto',                                                 'suplente', 'operadores_aereos', 20),
    ('VOLARIS',                                                     'CÉSAR LÓPEZ FUENTES',                 'Jefe de Aeropuerto Santa Lucía',                                        'titular',  'operadores_aereos', 21),
    ('VIVA',                                                        'RICARDO PÉREZ TORRES',                'Jefe de Operaciones y Slots',                                           'suplente', 'operadores_aereos', 22),
    ('LUFTHANSA',                                                   'JAIME PONCE AGUILERA',                'Supervisor de Operaciones',                                             'suplente', 'operadores_aereos', 23),
    ('QATAR AIRWAYS',                                               'RUBÍ WIDOBLO GONZÁLEZ',               'Señior Regional Cargo Operations',                                      'titular',  'operadores_aereos', 24),
    ('CATHAY PACIFIC',                                              'NELLY AHUACTZIN VARGAS',              'Gerente de Estación',                                                   'titular',  'operadores_aereos', 25),
    ('EMIRATES',                                                    'KARINA NAVARRO',                      'COPO',                                                                  'titular',  'operadores_aereos', 26),
    ('MEXICANA',                                                    'XAIT PLATA FLORES',                   'Jefa de Aeropuerto',                                                    'titular',  'operadores_aereos', 27),
    ('CONVIASA',                                                    'EDUARDO YOEMI JOSE RAMOS SALAZAR',    'Jefe de Estación Santa Lucía',                                          'titular',  'operadores_aereos', 28),
    ('LA NUEVA AEROLÍNEA',                                          'EDGAR ALEJANDRO DEL ÁNGEL BELTRÁN',   'Apoderado Legal',                                                       'suplente', 'operadores_aereos', 29),
    -- === PRESTADORES DE SERVICIOS ===
    ('PRIME FLIGHT SERVICES, MÉXICO S.A. DE C.V.',                  'ING. SERGIO MORENO SAMANO',           'Gerente Regional',                                                      'titular',  'prestadores', 30),
    ('CARGOLUX',                                                    'GABRIEL ROSALES GIL',                 'Process Owner',                                                         'titular',  'prestadores', 31),
    ('UNITED PARCEL SERVICES',                                      'ISAÍAS AMADO AGUILERA RODRIGUEZ',     'Gerente de Operaciones',                                                'titular',  'prestadores', 32),
    ('DHL EXPRESS MÉXICO, S.A. DE C.V.',                            'JOSÉ LUIS VICTORIA LÓPEZ',            'Supervisor de Operaciones Aéreas',                                      'suplente', 'prestadores', 33),
    ('EAGLE AVIATION',                                              'HÉCTOR ARTURO GONZÁLEZ HERRERA',      'Jefe de Estación NLU',                                                  'titular',  'prestadores', 34),
    ('DHL GUATEMALA',                                               'ALFONSO JESÚS MILO REYES',            'Representante Legal',                                                   'suplente', 'prestadores', 35),
    ('CARGOJET',                                                    'ALFONSO JESÚS MILO REYES',            'Representante Legal',                                                   'suplente', 'prestadores', 36),
    ('ANAFAC',                                                      'JORGE ANTONIO GARCÍA ARANDA',         'Representante',                                                         'suplente', 'prestadores', 37),
    ('AERUS',                                                       'EDGAR GONZALEZ MARTINEZ',             'Representante de Operaciones',                                          'suplente', 'prestadores', 38),
    -- === PERMISIONARIOS / SOCIOS COMERCIALES ===
    ('OK FARMA, S.A. DE C.V.',                                      'JOSÉ RODRIGO SÁNCHEZ HERNÁNDEZ',      'Apoderado Legal y Repre. Socios Comerciales del AIFA',                  'titular',  'permisionarios', 40)
ON CONFLICT DO NOTHING;
