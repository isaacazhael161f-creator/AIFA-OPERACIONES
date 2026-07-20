-- =================================================================
--  DIRECTORIO COMPLETO COyH 2026
--  • Extiende coyh_participantes con datos de contacto
--  • Crea tabla coyh_confirmaciones (confirmación por sesión)
--  • Inserta TODOS los integrantes e invitados del directorio 2026
--  Ejecutar en: Supabase > SQL Editor
-- =================================================================

-- ─────────────────────────────────────────────────────────────────
-- 1. EXTENDER coyh_participantes con campos del directorio
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.coyh_participantes
    ADD COLUMN IF NOT EXISTS tipo_lista       TEXT NOT NULL DEFAULT 'integrante'
                              CHECK (tipo_lista IN ('integrante','invitado')),
    ADD COLUMN IF NOT EXISTS num_directorio   INT,
    ADD COLUMN IF NOT EXISTS telefono         TEXT,
    ADD COLUMN IF NOT EXISTS correo           TEXT,
    ADD COLUMN IF NOT EXISTS domicilio        TEXT,
    ADD COLUMN IF NOT EXISTS horario_atencion TEXT;

COMMENT ON COLUMN public.coyh_participantes.tipo_lista       IS 'integrante = miembro oficial del comité; invitado = asistente invitado';
COMMENT ON COLUMN public.coyh_participantes.num_directorio   IS 'Número de entrada en el Directorio de Integrantes/Invitados 2026';

-- Índice único (case-insensitive) para evitar duplicados al insertar
CREATE UNIQUE INDEX IF NOT EXISTS idx_coyh_part_uniq_upper
    ON public.coyh_participantes (upper(dependencia), upper(nombre), tipo);

-- ─────────────────────────────────────────────────────────────────
-- 2. TABLA: coyh_confirmaciones
--    Registra quién confirmó asistencia para cada sesión
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coyh_confirmaciones (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    reunion_id       UUID        NOT NULL REFERENCES public.agenda_reuniones(id) ON DELETE CASCADE,
    participante_id  UUID        NOT NULL REFERENCES public.coyh_participantes(id) ON DELETE CASCADE,
    confirmado       BOOLEAN     NOT NULL DEFAULT true,
    confirmado_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_por   UUID        REFERENCES auth.users(id),
    notas            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(reunion_id, participante_id)
);

COMMENT ON TABLE public.coyh_confirmaciones IS
    'Confirmaciones de asistencia por sesión del COyH. Una vez confirmado aparece en la lista de asistencia.';

ALTER TABLE public.coyh_confirmaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coyh_conf_read"  ON public.coyh_confirmaciones
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "coyh_conf_write" ON public.coyh_confirmaciones
    FOR ALL    TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_coyh_conf_reunion ON public.coyh_confirmaciones(reunion_id);
CREATE INDEX IF NOT EXISTS idx_coyh_conf_part    ON public.coyh_confirmaciones(participante_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. DATOS: DIRECTORIO DE INTEGRANTES 2026
--    ON CONFLICT: si el nombre ya existe (mayús/minús) actualiza
--    los datos de contacto sin borrar firmas existentes.
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.coyh_participantes
    (dependencia, nombre, cargo, tipo, categoria, tipo_lista, num_directorio,
     telefono, correo, domicilio, horario_atencion, orden, activo)
VALUES

-- ── No. 1 ─ DIRECTOR GENERAL DEL A.I.F.A. ────────────────────────
('DIRECTOR GENERAL DEL A.I.F.A.',
 'DR. ISIDORO PASTOR ROMÁN',
 'Dir. Gral. y Presidente del Comité',
 'titular','autoridades','integrante',1,
 '55 1362 0463','direcciongeneral@aifa.aero',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 NULL, 1, true),

-- ── No. 2 ─ AGENCIA FEDERAL DE AVIACION CIVIL ────────────────────
('AGENCIA FEDERAL DE AVIACION CIVIL',
 'MTRO. SERGIO VALENTÍN GARCÍA MARTÍNEZ',
 'Comandante del Aeropuerto Internacional "Felipe Ángeles" y Vocal Ejecutivo del Comité',
 'titular','autoridades','integrante',2,
 '5919169506 / 55 1135 5037','sergio.garcia@afac.gob.mx',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 '24 hs.', 2, true),

('AGENCIA FEDERAL DE AVIACION CIVIL',
 'ING. ISAEL PASCUAL BUSTAMANTE',
 'Subdirector de Área',
 'suplente','autoridades','integrante',2,
 '56 1111 2697','isael.pascual@afac.gob.mx',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 '24 hs.', 3, true),

-- ── No. 3 ─ SECRETARIO DE ACTAS ──────────────────────────────────
('SECRETARIO DE ACTAS',
 'MTRO. GONZALO SANDOVAL GONZÁLEZ',
 'Dir. Opn. y Secretario De Actas Del Comité',
 'titular','autoridades','integrante',3,
 '55 2173 5114','dir.operaciones@aifa.aero',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 NULL, 4, true),

-- ── No. 4 ─ SECRETARÍA DE LA DEFENSA NACIONAL ────────────────────
('SECRETARÍA DE LA DEFENSA NACIONAL',
 'GRAL. ALA P.A. E.M. JOSÉ ANTONIO SIERRA AMADOR',
 'Comandante de la Base Aérea Militar No. 1',
 'titular','autoridades','integrante',4,
 NULL,'bam1.fam@defensa.gob.mx',
 'Interior del Campo Mil. Estratégico Conjunto No. 37-D Santa Lucia, Zumpango de Ocampo Edo. Mex. 55640',
 NULL, 5, true),

('SECRETARÍA DE LA DEFENSA NACIONAL',
 'TTE. F.A.C.V. DIEGO ALEJANDRO AVILÉS ECHEVERRIA',
 'Comandante Acc. Edn. Ctl. Ar.',
 'suplente','autoridades','integrante',4,
 '7713220031','flatsaurrels@gmail.com',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 NULL, 6, true),

-- ── No. 5 ─ INSTITUTO NACIONAL DE MIGRACIÓN ──────────────────────
('INSTITUTO NACIONAL DE MIGRACIÓN',
 'JONATHAN PÉREZ VARA',
 'Subrepresentante Federal del Instituto Nacional de Migración en el AIFA',
 'titular','autoridades','integrante',5,
 '5564222605','jperezv@inami.gob.mx',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 NULL, 7, true),

('INSTITUTO NACIONAL DE MIGRACIÓN',
 'LIC. EDITH REBOLLO GONZÁLEZ',
 'Subdirectora de Procedimientos Migratorios',
 'suplente','autoridades','integrante',5,
 '55 5629 8004 / 55 8509 3031','erebollo@inami.gob.mx',
 'Circuito Exterior Mexiquense, Km. 33, Sta. Lucia, Zumpango, Edo. Mex. C.P. 55640',
 NULL, 8, true),

-- ── No. 6 ─ GUARDIA NACIONAL — SEGURIDAD EXTERIOR ────────────────
('GUARDIA NACIONAL — SEGURIDAD EXTERIOR',
 'COR. G.N. CARLOS ALBERTO THOMPSON EHUAN',
 'Cmte. 17/o. Btn. Svs. Esp. Pol.Mil.',
 'titular','autoridades','integrante',6,
 '5591912411','cmcia.17bsepm@defensa.gob.mx',
 'Complejo de la GN Interior Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 'Las 24 Hs. del día. Permanentemente.', 9, true),

('GUARDIA NACIONAL — SEGURIDAD EXTERIOR',
 'TTE. COR. GRDIA NAL. JUAN CARLOS JÚAREZ AVILES',
 '2/o. Cmte. y J.G.C. del 2/o. Btn. Sgd. Instls Arptrias',
 'suplente','autoridades','integrante',6,
 '5540380119','Juaj801020mail.com',
 'Complejo de la GN Interior Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 'Las 24 Hs. del día. Permanentemente.', 10, true),

('GUARDIA NACIONAL — SEGURIDAD EXTERIOR',
 'CAP. 1/O. POL. MIL. MARIO GÓMEZ QUEZADA',
 'Jefe Acc. Sec. Admtva. del 17/o. Btn. Svs. Espls. Pol. Mil.',
 'suplente','autoridades','integrante',6,
 '5534360589','cmcia.17bsepm@defensa.gob.mx',
 'Complejo de la GN Interior Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 NULL, 11, true),

-- ── No. 7 ─ GUARDIA NACIONAL — SEGURIDAD INTERIOR ────────────────
('GUARDIA NACIONAL — SEGURIDAD INTERIOR',
 'COR. G.N. JUAN DIEGO ANTONIO',
 'Cmte. 16/o. Btn. Svs. Espls. Pol. Mil.',
 'titular','autoridades','integrante',7,
 NULL,'siiobtnsgdinstlsarptrias@gmail.com',
 'Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 NULL, 12, true),

('GUARDIA NACIONAL — SEGURIDAD INTERIOR',
 'CAP. 1/O. POL. MIL. OCTAVIO RODRÍGUEZ GARCÍA',
 'Jefe Acc. de la SI/I/O.',
 'suplente','autoridades','integrante',7,
 '5549152682','siiobtnsgdintlsarptiras@gmail.com',
 'Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 NULL, 13, true),

('GUARDIA NACIONAL — SEGURIDAD INTERIOR',
 'SGTO. 2/O. POL. MIL. JOSUÉ RENOT GONZÁLEZ',
 'Cmcia. 16/o. Btn. Svs. Espls. Pol. Mil.',
 'suplente','autoridades','integrante',7,
 '5513341514',NULL,
 'Campo Militar Estratégico conjunto No. 37-D, Sta. Lucía, Mex.',
 NULL, 14, true),

-- ── No. 8 ─ GRUPO MUNDO MAYA ──────────────────────────────────────
('GRUPO MUNDO MAYA',
 'COR. F.A.A.M.A. E.M. JOSÉ ÁNGEL RETANA PAZ',
 'Subdirector General de Hidrocarburos',
 'titular','autoridades','integrante',8,
 '59668901 ext. 50093/50094','jaretanap@gafsacomm.com',
 NULL, NULL, 15, true),

('GRUPO MUNDO MAYA',
 'LIC. SATURNINO MÉNDEZ VILLALBA',
 'Encargado temporal de la estación de combustibles',
 'suplente','autoridades','integrante',8,
 '5540151596','smendezv@grupomundomaya.com',
 NULL, NULL, 16, true),

-- ── No. 9 ─ AGENCIA NACIONAL DE ADUANAS DE MÉXICO ────────────────
('AGENCIA NACIONAL DE ADUANAS DE MÉXICO',
 'COR. P.M. E.M. EDUARDO OLVERA ALCÁNTARA',
 'Administrador de la Aduana del AIFA',
 'titular','autoridades','integrante',9,
 '6861698043','eduardo.olvera@anam.gob.mx',
 'Circuito Exterior Mexiquense km 33, C.P. 55600, Col. Santa Lucía, Mpio. Zumpango de Ocampo, Edo. Méx.',
 NULL, 17, true),

('AGENCIA NACIONAL DE ADUANAS DE MÉXICO',
 'CAP. 2/O INF. RET. VICTOR MANUEL VELAZQUEZ GLINDO',
 'Jefe de Departamento de Revisión y Orientación a Pasajeros de la Aduana del A.I.F.A.',
 'suplente','autoridades','integrante',9,
 '55 1749 1122','victor.velazquezgal@anam.gob.mx',
 'Circuito Exterior Mexiquense km 33, C.P. 55600, Col. Santa Lucía, Mpio. Zumpango de Ocampo, Edo. Méx.',
 NULL, 18, true),

-- ── No. 10 ─ SENEAM ───────────────────────────────────────────────
('SENEAM',
 'CTA. ÁNGEL VIDAL CASTRO ESPERANZA',
 'Jefe de Estación Aeroportuaria AIFA',
 'titular','autoridades','integrante',10,
 '5919150493 / 5534128232','angel.castro@seneam.gob.mx',
 'Torre de Control del AIFA',
 'Lunes a Viernes 09:00-16:00 hs.', 19, true),

('SENEAM',
 'CTA. RICARDO XAVIER BARAJAS MARTÍN DEL CAMPO',
 'Supervisor Torre de Control',
 'suplente','autoridades','integrante',10,
 '5919150500 / 55 1844 4330','ricardo.barajas@seneam.gob.mx',
 'Torre de Control del AIFA',
 'Lunes a Viernes 09:00-16:00 hs.', 20, true),

-- ── No. 11 ─ FISCALÍA GENERAL DE LA REPÚBLICA ────────────────────
('FISCALÍA GENERAL DE LA REPÚBLICA',
 'LIC. ANTONIO ZARDÓN MENÉNDEZ',
 'Subdelegado Administrativo de la FGR en el Estado de México',
 'titular','autoridades','integrante',11,
 '55 5346 0000 ext. 300104','antonio.zardon@fgr.org.mx',
 NULL, NULL, 21, true),

('FISCALÍA GENERAL DE LA REPÚBLICA',
 'ING. ALEJANDRO AGUIRRE GONZÁLEZ',
 'Coordinador de Mantenimiento Aéreo',
 'suplente','autoridades','integrante',11,
 '55 6753 7740','alejandro.aguirreg@fgr.org.mx',
 NULL, NULL, 22, true),

-- ── No. 12 ─ CENTRO NACIONAL DE INTELIGENCIA ─────────────────────
('CENTRO NACIONAL DE INTELIGENCIA',
 'JORGE ALBERTO SILVA ZAVALA',
 'Representante CNI en el AIFA',
 'titular','autoridades','integrante',12,
 '55 8060 4753','aifa210322@gmail.com',
 'Circuito Exterior Mexiquense km 33, Santa Lucia, Zumpango, Estado de México',
 'Lunes a viernes y domingo 08:00 a 21:00. Sábado 10:00 a 18:00 hs.', 23, true),

('CENTRO NACIONAL DE INTELIGENCIA',
 'RODOLFO DEL ROSARIO CÁSTULO',
 'Sub representante del CNI en el AIFA',
 'suplente','autoridades','integrante',12,
 '5625514246','siniaaifa210322@gmail.com',
 'Circuito Exterior Mexiquense km 33, Santa Lucia, Zumpango, Estado de México',
 NULL, 24, true),

-- ── No. 13 ─ SENASICA (Aduana de Carga) ──────────────────────────
('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA',
 'ING. DANIEL GARCÍA CONTRERAS',
 'Responsable de la Oficina de Inspección de Sanidad Agropecuaria en Aduana de Carga AIFA',
 'titular','autoridades','integrante',13,
 '55 5905 1000 ext. 52496 / 55 43 6516979','oisaaifaaduana@senasica.gob.mx',
 'Interior del Recinto Fiscal, Carretera Fed. Mex-Pach Km. 42.5, Campo Militar JNH0.37B Sta. Lucía, Zumpango Edo. Mex. C.P. 55640',
 'Lunes a Viernes 09:00-18:00 hs.', 25, true),

('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA',
 'MVZ. ANAHÍ CAMPOS RAYÓN',
 'Tercero Especialista Autorizado (TEA)',
 'suplente','autoridades','integrante',13,
 '55 5905 1000 ext. 52510 / 55 41883215','mvzancamra@gmail.com',
 'Interior del Recinto Fiscal, Carretera Fed. Mex-Pach Km. 42.5, Campo Militar JNH0.37B Sta. Lucía, Zumpango Edo. Mex. C.P. 55640',
 NULL, 26, true),

-- ── No. 14 ─ SENASICA (Terminal Aérea) ───────────────────────────
('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA',
 'MVZ. ROBERTO CARLOS HERNÁNDEZ SUASTE',
 'Responsable de OISA AIFA Terminal Aérea',
 'titular','autoridades','integrante',14,
 '55 5905 1000 Ext. 52508 / 55 1321 2100','oisaaifaterminal@senasica.gob.mx',
 'Zona de Reclamo de Equipajes Internaciones ETP AIFA Cto. Ext. Mexiquense Km. 33 Sta. Lucía, Zumpango Edo. Mex. C.P. 55640',
 'Atención al Público para importación 24 hs.', 27, true),

('SERVICIO NACIONAL DE SANIDAD, INOCUIDAD Y CALIDAD AGROALIMENTARIA',
 'MVZ. LUIS TAPIA HINOJOSA',
 'Oficial de Servicios Cuarentenarios',
 'suplente','autoridades','integrante',14,
 '55 5905 1000 Ext. 52505 / 55 2073 7758','luistapiahi@yahoo.com.mx',
 'Ambulatorio Llegadas Internacionales ETP AIFA Cto. Ext. Mexiquense Km. 33 Sta. Lucía, Zumpango Edo. Mex. C.P. 55640',
 NULL, 28, true),

-- ── No. 15 ─ PROCURADURÍA FEDERAL DEL CONSUMIDOR ─────────────────
('PROCURADURÍA FEDERAL DEL CONSUMIDOR',
 'MTRA. JUANITA DEL ROCÍO RUBIO HERMOSILLO',
 'Directora General de Oficinas de Defensa del Consumidor',
 'titular','autoridades','integrante',15,
 '55 3331 8443','rrubio@profeco.gob.mx',
 NULL, '7:30 a 20:30 hrs.', 29, true),

('PROCURADURÍA FEDERAL DEL CONSUMIDOR',
 'LIC. ANDRÉS ÁVILA MARROQUÍN',
 'Coordinador y Enlace de Módulos de PROFECO en el AIFA',
 'suplente','autoridades','integrante',15,
 '55 7501 9280','aavilam@profeco.gob.mx',
 NULL, NULL, 30, true),

-- ── No. 16 ─ PROCURADURÍA FEDERAL DE PROTECCIÓN AL AMBIENTE ──────
('PROCURADURÍA FEDERAL DE PROTECCIÓN AL AMBIENTE',
 'BIÓL. CLARA CATALINA SORIANO BERNAL',
 'Inspectora Federal Adscrita al Aeropuerto Internacional "Gral. Felipe Ángeles"',
 'titular','autoridades','integrante',16,
 '5511 8866 89','clara.soriano@profepa.gob.mx',
 NULL, NULL, 31, true),

('PROCURADURÍA FEDERAL DE PROTECCIÓN AL AMBIENTE',
 'DR. JOSÉ FRANCISCO BERNAL STOOPEN',
 'Suplente',
 'suplente','autoridades','integrante',16,
 '5554 4963 00','jose.bernal@profepa.gob.mx',
 'Dirección General de Verificación e Inspección Ambiental en Puertos Aeropuertos y Fronteras',
 NULL, 32, true),

-- ── No. 17 ─ SANIDAD INTERNACIONAL ───────────────────────────────
('SANIDAD INTERNACIONAL',
 'DR. MARCO ANTONIO MONTES DE OCA GONZALES',
 'Titular Sanidad Internacional',
 'titular','autoridades','integrante',17,
 NULL,NULL,
 'Terminal del Aeropuerto Felipe Ángeles, Circuito Exterior Mexiquense Km.33 Santa Lucia, C.P. 55640 Zumpango, Estado de México',
 'Lunes a Viernes 07:00 – 15:00', 33, true),

('SANIDAD INTERNACIONAL',
 'DRA. ALEJANDRA BUENSUSESO SÁNCHEZ',
 'Coordinadora de Sanidad Internacional en AIFA',
 'suplente','autoridades','integrante',17,
 '55 45 64 05 30','aifa.sanidadinternacional@gmail.com',
 'Terminal del Aeropuerto Felipe Ángeles, Circuito Exterior Mexiquense Km.33 Santa Lucia, C.P. 55640 Zumpango, Estado de México',
 'Lunes a Viernes 07:00 – 15:00', 34, true),

('SANIDAD INTERNACIONAL',
 'SELENE VICTORIA OROPEZA MATURANO',
 'Apoyo Administrativo de Sanidad Internacional',
 'suplente','autoridades','integrante',17,
 '5514211037','seleneoropeza24@gmail.com',
 NULL, NULL, 35, true),

-- ── No. 18 ─ SECRETARÍA DE SALUD DEL ESTADO DE MÉXICO ────────────
('SECRETARÍA DE SALUD DEL ESTADO DE MÉXICO',
 'LIC. ALBERTO CASTAÑOS JIMÉNEZ',
 'Director de Regulación Sanitaria del Estado de México',
 'titular','autoridades','integrante',18,
 '72 2277 3929 / 72 2377 4067','isem.rsregsan@edomex.gob.mx',
 NULL, NULL, 36, true),

('SECRETARÍA DE SALUD DEL ESTADO DE MÉXICO',
 'DRA. YURIDIA TERESA SÁNCHEZ CANEDO',
 'Jefa de la Jurisdicción de Regulación Sanitaria No. 17 Zumpango',
 'suplente','autoridades','integrante',18,
 '55-23-11-88-12','Yuritere82@live.com.mx',
 NULL, NULL, 37, true),

-- ── No. 19 ─ AEROMEXICO ───────────────────────────────────────────
('AEROMÉXICO',
 'HÉCTOR PÉREZ FRAGA',
 'Gerente de Aeropuerto',
 'titular','operadores_aereos','integrante',19,
 '55 1378 9170','hperezf@aeromexico.com',
 'AIFA Nivel 10.50 Modulo I de la Terminal aérea.',
 NULL, 40, true),

('AEROMÉXICO',
 'HÉCTOR MONROY MENDOZA',
 'Supervisor',
 'suplente','operadores_aereos','integrante',19,
 '55 3927 1806','hmonroy@aeromexico.com',
 NULL, NULL, 41, true),

-- ── No. 20 ─ VOLARIS ──────────────────────────────────────────────
('VOLARIS',
 'CÉSAR LÓPEZ FUENTES',
 'Jefe de Aeropuerto Santa Lucía',
 'titular','operadores_aereos','integrante',20,
 '5585797666','cesar.lopez@volaris.com',
 'AIFA Nivel 10.50 Modulo I de la Terminal aérea.',
 '08:00-16:00 hs.', 42, true),

('VOLARIS',
 'GUILLERMO ALFONSO SÁNCHEZ MUNGIA',
 'Suplente (mandará información el titular)',
 'suplente','operadores_aereos','integrante',20,
 NULL,NULL,
 NULL, NULL, 43, true),

('VOLARIS',
 'ERICKA YAZMIN ROMERO GARRIDO',
 'Supervisor de Tráfico',
 'suplente','operadores_aereos','integrante',20,
 '797 101 3949','ericka.romero@volaris.com',
 NULL, NULL, 44, true),

-- ── No. 21 ─ TEAMS AIRCRAFT SERVICES ─────────────────────────────
('TEAMS AIRCRAFT SERVICES',
 'JONATHAN ISRAEL ROBLES SANSORES',
 'Representante Legal',
 'titular','prestadores','integrante',21,
 '55 8951 1311','jonathan@tassoria.com',
 NULL, NULL, 45, true),

('TEAMS AIRCRAFT SERVICES',
 'ÁNGEL MOISÉS VÁZQUEZ SÁNCHEZ',
 'Jefe de Estación',
 'suplente','prestadores','integrante',21,
 '5537428782','operacionesnlu@tassoria.com',
 NULL, NULL, 46, true),

('TEAMS AIRCRAFT SERVICES',
 'FERNANDO ALEJANDRO HERNÁNDEZ BELMONT',
 'Director de Operaciones Rampa',
 'suplente','prestadores','integrante',21,
 '55 1681 3455','fernando@tassoria.com',
 NULL, NULL, 47, true),

-- ── No. 22 ─ PRIME FLIGHT SERVICES ───────────────────────────────
('PRIME FLIGHT SERVICES, MÉXICO S.A. DE C.V.',
 'ING. SERGIO RAUL MORENO SAMANO',
 'Gerente Regional',
 'titular','prestadores','integrante',22,
 '5510906315','smoreno@primeflight.com',
 'GSE del AIFA', NULL, 48, true),

('PRIME FLIGHT SERVICES, MÉXICO S.A. DE C.V.',
 'JOEL HERNÁNDEZ SÁNCHEZ',
 'Encargado de Área Pasajeros',
 'suplente','prestadores','integrante',22,
 NULL,'jhernandez@primeflight.com',
 NULL, NULL, 49, true),

-- ── No. 23 ─ MEXICANA ─────────────────────────────────────────────
('AEROLÍNEA DEL ESTADO MEXICANO, S.A. DE C.V. (MEXICANA)',
 'LIC. XAIT PLATA FLORES',
 'Jefa de Aeropuerto',
 'titular','operadores_aereos','integrante',23,
 '5523413624','aptonlu.opstrs@mexicana.gob.mx',
 'Edificio Terminal, Zona de Oficinas Aerolíneas, Bahía D',
 '8:00 a 17:30hrs', 50, true),

('AEROLÍNEA DEL ESTADO MEXICANO, S.A. DE C.V. (MEXICANA)',
 'ING. EMMANUEL GONZÁLEZ GUADERRAMA',
 'Subdirector de Operaciones Tierra',
 'suplente','operadores_aereos','integrante',23,
 '6562643809','enlespltaplat.opstrs@mexicana.gob.mx',
 NULL, NULL, 51, true),

-- ── No. 24 ─ VIVA (AEROENLACES NACIONALES) ───────────────────────
('AEROENLACES NACIONALES S.A. DE C.V. (VIVA)',
 'SARAH MALINALLI SOSA HERNÁNDEZ',
 'Gerente de Servicios en Aeropuerto',
 'titular','operadores_aereos','integrante',24,
 '8180293452','sarah.sosa@vivaaerobus.com',
 'Circuito Exterior Mexiquense Km. 33 Hangar de Resguardo No. 2, Col. Santa Lucía Base Aérea Militar, AIFA Zumpango Edo. Mex.',
 NULL, 52, true),

('AEROENLACES NACIONALES S.A. DE C.V. (VIVA)',
 'YURI ISAAC SALINAS ELIZARRARÁS',
 'Director de Relaciones Institucionales',
 'suplente','operadores_aereos','integrante',24,
 '8115213893','yuri.salinas@vivaaerobus.com',
 NULL, NULL, 53, true),

('AEROENLACES NACIONALES S.A. DE C.V. (VIVA)',
 'RICARDO PÉREZ TORRES',
 'Jefe de Operaciones y Slots',
 'suplente','operadores_aereos','integrante',24,
 '5578658637','ricardo.perez@vivaaerobus.com',
 NULL, NULL, 54, true),

('AEROENLACES NACIONALES S.A. DE C.V. (VIVA)',
 'ADRIANA LEDESMA AYALA',
 'Jefa de Aeropuerto',
 'suplente','operadores_aereos','integrante',24,
 '4492733110','selene.martinezp@vivaaerobus.com',
 NULL, NULL, 55, true),

-- ── No. 25 ─ CARGOJET ─────────────────────────────────────────────
('CARGOJET',
 'LIC. VÍCTOR SEGURA LECONA',
 'Representante Legal',
 'titular','prestadores','integrante',25,
 '55 1988 8261 / 55 5511 7739','vsegura@acym.com.mx',
 NULL, NULL, 56, true),

('CARGOJET',
 'ALFONSO JESÚS MILO REYES',
 'Representante Legal',
 'suplente','prestadores','integrante',25,
 '5510907066','amilo@acym.com.mx',
 NULL, NULL, 57, true),

-- ── No. 26 ─ COMMANDER ────────────────────────────────────────────
('COMMANDER',
 'LIC. CLAUDIO FABIÁN GONZÁLEZ LÓPEZ',
 'Representante Legal y Director General',
 'titular','prestadores','integrante',26,
 '59 1916 9591 ext. 4882','fgonzalez@iusa.com.mx',
 'Circuito Exterior Mexiquense Km. 33 Hangar de Resguardo No. 2, Col. Santa Lucía Base Aérea Militar, AIFA Zumpango Edo. Mex.',
 'Lunes a Viernes 09:30-16:00 hs.', 58, true),

('COMMANDER',
 'ING. KARLA PAULINA ESCOBAR SÁNCHEZ',
 'Responsable de Taller',
 'suplente','prestadores','integrante',26,
 '59 1916 9591 Ext. 4883','kpescobar@iusa.com.mx',
 NULL, NULL, 59, true),

('COMMANDER',
 'FRANCISCO JAVIER RÍOS BECERRA',
 'Jefe de Seguridad Operacional',
 'suplente','prestadores','integrante',26,
 '59 1916 9591 Ext. 4886','fjrios@iusa.com.mx',
 NULL, NULL, 60, true),

-- ── No. 27 ─ EMIRATES AIRLINES ────────────────────────────────────
('EMIRATES AIRLINES',
 'KARINA NAVARRO ARIAS',
 'COPO',
 'titular','operadores_aereos','integrante',27,
 '5572337442','Karina.navarro@emirates.com',
 NULL, NULL, 61, true),

-- ── No. 28 ─ LUFTHANSA CARGO ──────────────────────────────────────
('LUFTHANSA CARGO',
 'JUAN PABLO ESCOBEDO JAIMES',
 'Gerente de Operaciones',
 'titular','operadores_aereos','integrante',28,
 '55 5007 5406','pablo.escobedo@dlh.de',
 NULL, NULL, 62, true),

('LUFTHANSA CARGO',
 'JAIME PONCE AGUILERA',
 'Supervisor de Operaciones',
 'suplente','operadores_aereos','integrante',28,
 '55 3184 0379','jaime.ponce@dlh.de',
 NULL, NULL, 63, true),

-- ── No. 29 ─ MAS AIR ──────────────────────────────────────────────
('AEROTRANSPORTE MAS DE CARGA, S.A. DE C.V. (MAS AIR)',
 'LUIS EUGENIO ZENTENO BERTADO',
 'Jefe de Aeropuertos',
 'titular','operadores_aereos','integrante',29,
 '55 5109 4546','eugenio.zenteno@masair.com',
 'AIFA, G2', 'Lunes a viernes 09:00-17:00 hs.', 64, true),

('AEROTRANSPORTE MAS DE CARGA, S.A. DE C.V. (MAS AIR)',
 'LUIS OSWALDO NÚÑEZ ANGUIANO',
 'Supervisor Operaciones Terrestres',
 'suplente','operadores_aereos','integrante',29,
 '5525599104','oswaldo.nunez@masair.com',
 NULL, NULL, 65, true),

('AEROTRANSPORTE MAS DE CARGA, S.A. DE C.V. (MAS AIR)',
 'MIGUEL MORA HERNÁNDEZ',
 'Supervisor Operaciones Terrestres',
 'suplente','operadores_aereos','integrante',29,
 '5567889740','miguel.mora@masair.com',
 NULL, NULL, 66, true),

-- ── No. 30 ─ TM AEROLÍNEAS (AWESOME CARGO) ───────────────────────
('TM AEROLÍNEAS (AWESOME CARGO)',
 'JUAN CARLOS CABRERA PACHECO',
 'Gerente de Operaciones Terrestres',
 'titular','operadores_aereos','integrante',30,
 '55 4950 8011','jcabrera@awesome-cargo.com',
 NULL, NULL, 67, true),

('TM AEROLÍNEAS (AWESOME CARGO)',
 'JOSÉ IVÁN ROSAS PÉREZ',
 'Jefe del Centro de Control Operacional',
 'suplente','operadores_aereos','integrante',30,
 '55 2259 1825','jrosas@awesome-cargo.com',
 NULL, NULL, 68, true),

-- ── No. 31 ─ AIR CANADA ───────────────────────────────────────────
('AIR CANADA',
 'AARÓN LÓPEZ GARCÍA',
 'Gerente de Carga y Operaciones',
 'titular','operadores_aereos','integrante',31,
 '56 4165 3586','aaron.lopezgarcia@aircanada.ca',
 'Aduana del AIFA Almacén IMM', NULL, 69, true),

('AIR CANADA',
 'ZAID YOALTIZIHT HERNÁNDEZ GUZMÁN',
 'Supervisor de Operaciones',
 'suplente','operadores_aereos','integrante',31,
 '55 4037 8119','zhernandez@primeflight.com',
 'GSE del AIFA', NULL, 70, true),

-- ── No. 32 ─ QATAR AIRWAYS ────────────────────────────────────────
('QATAR AIRWAYS',
 'RUBÍ WIDOBLO GONZÁLEZ',
 'Cargo Operations Manager',
 'titular','operadores_aereos','integrante',32,
 '55 4123 0453 / 6469927788','rgonzalez@mx.qatarairways.com',
 'Aduana del AIFA', 'Flexible de acuerdo a las operaciones', 71, true),

('QATAR AIRWAYS',
 'DAVID PACHECO TOSTADO',
 'Cargo Operations Officer',
 'suplente','operadores_aereos','integrante',32,
 '6469927250','dtostado@mx.qatarairways.com',
 NULL, '07:00-21:00 y 05:00 hs.', 72, true),

-- ── No. 33 ─ CATHAY PACIFIC ───────────────────────────────────────
('CATHAY PACIFIC',
 'NELLY AHUACTZIN VARGAS',
 'Gerente de Estación',
 'titular','operadores_aereos','integrante',33,
 '56 1108 8953','nelly_vargas@cathaypacific.com',
 'Aduana del AIFA Recinto fiscalizado 9, Zumpango de Ocampo Edo. Mex.',
 'Lunes a viernes 09:00-18:00 hs.', 73, true),

('CATHAY PACIFIC',
 'FABIOLA MENDOZA MARTÍNEZ',
 'Gerente de Servicios México',
 'suplente','operadores_aereos','integrante',33,
 '5569631705','fabiola_mendoza@cathaypacific.com',
 NULL, NULL, 74, true),

('CATHAY PACIFIC',
 'HUGO PLATA SÁNCHEZ',
 'Oficial de Servicios de Carga',
 'suplente','operadores_aereos','integrante',33,
 '5544214910','hugo_plata@cathaypacific.com',
 NULL, NULL, 75, true),

-- ── No. 34 ─ ETHIOPIAN AIRLINES ──────────────────────────────────
('ETHIOPIAN AIRLINES',
 'AKENATON ROSALES VILLANUEVA',
 'Gerente General',
 'titular','operadores_aereos','integrante',34,
 '5517986513',NULL,
 NULL, '24 hrs.', 76, true),

('ETHIOPIAN AIRLINES',
 'SANDRA LILIA ALFARO HERNÁNDEZ',
 'Supervisor de Calidad y SMS',
 'suplente','operadores_aereos','integrante',34,
 '5522483745','salfaro@ghercules.com.mx',
 'Hangar de Mantenimiento GSE 1 Taller 2', NULL, 77, true),

-- ── No. 35 ─ AIR FRANCE ───────────────────────────────────────────
('AIR FRANCE',
 'TUMAINI SUDI OLAFEMI LEITO',
 'Gerente de Estación',
 'titular','operadores_aereos','integrante',35,
 '5579012893','tumaini.leito@klm.com',
 'AICM Terminal 1 Piso 2 Of. 333, Av. Capitán Carlos León s/n Col. Peñón de los Baños, Alc. Venustiano Carranza C.P. 15620',
 NULL, 78, true),

('AIR FRANCE',
 'GUADALUPE NATALI GARCÍA CORTÉS',
 'Sub Gerente de Estación',
 'suplente','operadores_aereos','integrante',35,
 '55 31494164','gugarciacortes@airfrance.fr',
 NULL, NULL, 79, true),

('AIR FRANCE',
 'ARTURO FRAGOSO',
 'Representante Legal',
 'suplente','operadores_aereos','integrante',35,
 '55 2574 2098','afragoso@asyv.com',
 'Prolongación Reforma No. 1190 Torre B Piso 25, Cruz Manca, Cuajimalpa de Morelos C.P. 05349 CDMX',
 NULL, 80, true),

-- ── No. 36 ─ TURKISH AIRLINES ─────────────────────────────────────
('TURKISH AIRLINES',
 'ENRIQUE HERNÁNDEZ MANZANILLA',
 'Representante de Operaciones de Carga Turkish Airlines',
 'titular','operadores_aereos','integrante',36,
 '5538405076','emanzanilla@thy.com',
 'Av.Texcoco 140, Internacional, Benito Juárez 15620, Ciudad de México, CDMX',
 'En el horario en el que se requiera.', 81, true),

('TURKISH AIRLINES',
 'FABIAN AMADOR MADRIGAL',
 'Gerente de Servicios GHA',
 'suplente','operadores_aereos','integrante',36,
 '5540006900','Fabian.Amador@talma.com.mx',
 NULL, NULL, 82, true),

-- ── No. 37 ─ CARGOLUX ─────────────────────────────────────────────
('CARGOLUX',
 'GABRIEL ROSALES GIL',
 'Process Owner',
 'titular','prestadores','integrante',37,
 '55 5401 7200','gabriel.rosales@cargolux-oss.com',
 'GSE AIFA', 'DURANTE LAS OPERACIONES', 83, true),

('CARGOLUX',
 'MARÍA FERNANDA MARTÍNEZ MOSQUEDA',
 'Deputy Process Owner',
 'suplente','prestadores','integrante',37,
 '55 4177 4689','Fernanda.martinez@cargolux-oss.com',
 NULL, NULL, 84, true),

-- ── No. 38 ─ UNITED PARCEL SERVICES ──────────────────────────────
('UNITED PARCEL SERVICES',
 'ISAÍAS AMADO AGUILERA RODRÍGUEZ',
 'Gerente de Operaciones',
 'titular','prestadores','integrante',38,
 '55 3097 0308','iaguilera@ups.com',
 NULL, NULL, 85, true),

('UNITED PARCEL SERVICES',
 'MIGUEL GONZALES ALVAREZ',
 'Supervisor de Operaciones',
 'suplente','prestadores','integrante',38,
 '5919169671 / 5530970308','mgonzalezalvarez@ups.com',
 NULL, NULL, 86, true),

('UNITED PARCEL SERVICES',
 'LUIS HERNANDEZ',
 'Supervisor de Operaciones',
 'suplente','prestadores','integrante',38,
 '5919169671','Ihernandez1@ups.com',
 NULL, NULL, 87, true),

-- ── No. 39 ─ DHL EXPRESS MÉXICO ───────────────────────────────────
('DHL EXPRESS MÉXICO, S.A. DE C.V.',
 'DIANA MELISSA GARCÍA MARTÍNEZ',
 'Gerente de Operaciones',
 'titular','prestadores','integrante',39,
 '55 3993 8552','diana.m.garcia@dhl.com',
 'Fuerza Aérea Mexicana No. 540 Col. Federal. Alcaldía Venustiano Carranza. C.P. 15700',
 NULL, 88, true),

('DHL EXPRESS MÉXICO, S.A. DE C.V.',
 'JORGE LUIS MUÑOZ BASTIDA',
 'Coordinador de Operaciones Aéreas',
 'suplente','prestadores','integrante',39,
 '55 3232 2909','jorge.munoz2@dhl.com',
 NULL, NULL, 89, true),

('DHL EXPRESS MÉXICO, S.A. DE C.V.',
 'JOSÉ LUIS VICTORIA LÓPEZ',
 'Supervisor de Operaciones Aéreas AM',
 'suplente','prestadores','integrante',39,
 '55 1298 7331','jose.victoria@dhl.com',
 NULL, NULL, 90, true),

('DHL EXPRESS MÉXICO, S.A. DE C.V.',
 'VÍCTOR HUGO HERNÁNDEZ VERGARA',
 'Supervisor de Operaciones Aéreas',
 'suplente','prestadores','integrante',39,
 '55 1451 9459','victor.hernandez1@dhl.com',
 NULL, NULL, 91, true),

-- ── No. 40 ─ EAGLE AVIATION SERVICES ─────────────────────────────
('EAGLE AVIATION SERVICES',
 'HECTOR ARTURO GONZALES HERRERA',
 'Jefe de Estación NLU',
 'titular','prestadores','integrante',40,
 '5529089110','Hectorherrera09101981@gmail.com',
 NULL, NULL, 92, true),

('EAGLE AVIATION SERVICES',
 'DAVID LEÓN PÉREZ',
 'Oficial de Operaciones',
 'suplente','prestadores','integrante',40,
 '55 7013 4546','lpdavid.eagle@hotmail.com',
 NULL, NULL, 93, true),

-- ── No. 41 ─ AEROUNION ────────────────────────────────────────────
('AERO TRANSPORTES DE CARGA UNIÓN, S.A. DE C.V. (AEROUNION)',
 'JUAN CARLOS BARRERA RAMÍREZ',
 'Jefe de Operaciones',
 'titular','prestadores','integrante',41,
 '55 5906 2597','juan.barrera@aviancacargomexico.com',
 'Terminal de Carga y Aduana AIFA Cto. Ext. Mexiquense Km. 33 C.P. 55600',
 '24 horas 7 días a la semana', 94, true),

('AERO TRANSPORTES DE CARGA UNIÓN, S.A. DE C.V. (AEROUNION)',
 'TOMAS DÍAZ DÍAZ',
 'Supervisor de Operaciones',
 'suplente','prestadores','integrante',41,
 '55 3387 5230','tomas.diaz@aviancacargomexico.com',
 NULL, NULL, 95, true),

-- ── No. 42 ─ DHL GUATEMALA ────────────────────────────────────────
('DHL GUATEMALA',
 'VÍCTOR SEGURA LECONA',
 'Representante Legal',
 'titular','prestadores','integrante',42,
 '55 1988 8261','vsegura@acym.com.mx',
 NULL, NULL, 96, true),

('DHL GUATEMALA',
 'IVÁN ERICK LUNA REYES',
 'Gerente de Operaciones',
 'suplente','prestadores','integrante',42,
 '55 2261 7683','ivan.luna@dhl.com',
 NULL, NULL, 97, true),

('DHL GUATEMALA',
 'ALFONSO JESÚS MILO REYES',
 'Representante Legal',
 'suplente','prestadores','integrante',42,
 '5510907066','amilo@acym.com.mx',
 NULL, NULL, 98, true),

-- ── No. 43 ─ SERVICIOS COMPLEMENTARIOS AÉREOS ────────────────────
('SERVICIOS COMPLEMENTARIOS AÉREOS',
 'SERGIO FIDEL CONTRERAS HERNÁNDEZ',
 'Gerente Regional Centro',
 'titular','prestadores','integrante',43,
 '5526998259','sergio.contreras@satisercomgroup.com',
 'Hangar GSE', '24 horas', 99, true),

('SERVICIOS COMPLEMENTARIOS AÉREOS',
 'GUILLERMO VILLEGAS MANRÍQUEZ',
 'Coordinador de Operaciones',
 'suplente','prestadores','integrante',43,
 '5519655650','g.villegas@satisercomgroup.com',
 'Hangar GSE', NULL, 100, true),

-- ── No. 44 ─ FULL AIR ─────────────────────────────────────────────
('FULL AIR, S.A. DE C.V.',
 'LIC. IBSAM QUINTERO POSADAS',
 'Representante Legal',
 'titular','prestadores','integrante',44,
 '55 4181 2822','iquintero@aifafbo.mx',
 NULL, NULL, 101, true),

('FULL AIR, S.A. DE C.V.',
 'LIC. LIZETH QUINTERO POSADAS',
 'Socia Directora',
 'suplente','prestadores','integrante',44,
 '55 4181 2822','lquintero@aifafbo.mx',
 NULL, NULL, 102, true),

('FULL AIR, S.A. DE C.V.',
 'LIC. JESÚS ARTURO MARTÍNEZ GARCÍA',
 'Director General',
 'suplente','prestadores','integrante',44,
 '5565608659','amartinez@aifafbo.mx',
 NULL, NULL, 103, true),

-- ── No. 46 ─ ESTAFETA CARGA AÉREA ────────────────────────────────
('ESTAFETA CARGA AÉREA',
 'GABRIEL MUÑOZ SOTO',
 'Jefe de Aeropuerto AIFA para Estafeta',
 'titular','prestadores','integrante',46,
 '55 4891 8142','gabriel.munoz@aerocargoexpress.mx',
 NULL, NULL, 104, true),

('ESTAFETA CARGA AÉREA',
 'PABLO POTTER GONZÁLEZ',
 'Coordinador de Aeropuertos Estafeta',
 'suplente','prestadores','integrante',46,
 '55 5455 6410','pablo.potter@aerocargoexpress.mx',
 NULL, NULL, 105, true),

-- ── No. 47 ─ LA NUEVA AEROLÍNEA ───────────────────────────────────
('LA NUEVA AEROLÍNEA S.A.',
 'LUIS ALEJANDRO ORTIZ ROSALES',
 'Coordinador de Carga y Curier en México',
 'titular','operadores_aereos','integrante',47,
 '5557868118','alortiz@copaair.com',
 'Aduana del AIFA, Almacenes AAACESA 1 y 2, C.P. 55640 Zumpango de Ocampo, Estado de México.',
 'Lunes a Viernes 09:00 a 18:00 horas', 106, true),

('LA NUEVA AEROLÍNEA S.A.',
 'EDGAR ALEJANDRO DEL ÁNGEL BELTRÁN',
 'Apoderado Legal',
 'suplente','operadores_aereos','integrante',47,
 '5662261860','adelangel@valenciaysanchez.com.mx',
 'Insurgentes Sur No. 1915 Oficina 1201, Col. Guadalupe inn. Alc. Álvaro Obregón, CDMX. CP 01020',
 'Lunes a Viernes 09:00 a 18:00 horas', 107, true),

-- ── No. 48 ─ CONVIASA ─────────────────────────────────────────────
('CONVIASA',
 'YOEMI JOSÉ RAMOS SALAZAR',
 'Jefe de Estación Santa Lucía',
 'titular','operadores_aereos','integrante',48,
 '5535192439','yohemiramos@conviasa.aero',
 NULL, NULL, 108, true),

-- ── No. 49 ─ OK FARMA ─────────────────────────────────────────────
('OK FARMA, S.A. DE C.V.',
 'JOSÉ RODRIGO SÁNCHEZ HERNÁNDEZ',
 'Apoderado Legal de OK Farma y Repre. Socios Comerciales del AIFA',
 'titular','permisionarios','integrante',49,
 '5533325605','jrodrigosanchezhernandez@gmail.com',
 'Mar Arafura número 33, Colonia Popotla, Miguel Hidalgo, CDMX, CP 11400',
 NULL, 109, true),

-- ── No. 50 ─ ANAFAC ───────────────────────────────────────────────
('RECINTOS FISCALIZADOS DEL AIFA (ANAFAC)',
 'ERÉNDIRA HERNÁNDEZ TREJO',
 'Presidenta ANAFAC',
 'titular','permisionarios','integrante',50,
 '5562542009','presidencia@anafac.org',
 'AV. Texcoco 14, Col. Peñón de los Baños, V. Carranza, 15520, CDMX',
 NULL, 110, true),

('RECINTOS FISCALIZADOS DEL AIFA (ANAFAC)',
 'JORGE ANTONIO GARCÍA ARANDA',
 'Gerente General de ANAFAC',
 'suplente','permisionarios','integrante',50,
 '5543300327','jgarcia@anafac.org',
 'Pasillo de la Fuente al Interior de la Aduana del AICM',
 NULL, 111, true),

-- ── No. 51 ─ GRUPO SHOGUA ─────────────────────────────────────────
('GRUPO SHOGUA',
 'ISAÍAS MARTÍNEZ BAUTISTA',
 'Representante socios comerciales',
 'titular','permisionarios','integrante',51,
 '55 34 78 93 24','isaias.martinez@gruposhogua.com',
 NULL, NULL, 112, true),

-- ── No. 52 ─ AERUS ────────────────────────────────────────────────
('AERUS',
 'LIC. PEDRO REYES GUTIERREZ',
 'Gerente de Aeropuertos',
 'titular','permisionarios','integrante',52,
 '444 300 8836','pedro.reyes@flyaerus.com',
 NULL, NULL, 113, true),

('AERUS',
 'C. EDGAR GONZALEZ MARTINEZ',
 'Representante de Operaciones',
 'suplente','permisionarios','integrante',52,
 '444 225 5736',NULL,
 NULL, NULL, 114, true),

-- ─────────────────────────────────────────────────────────────────
-- DIRECTORIO DE INVITADOS 2026
-- ─────────────────────────────────────────────────────────────────
('IATA (CANAERO)',
 'CINTHYA MARTÍNEZ',
 'Country Manager (Interino)',
 'titular','otros','invitado',1,
 '55 5284 2982','martinezci@iata.org',
 NULL, NULL, 200, true),

('IATA (CANAERO)',
 'JULIA CARRANZA',
 'Industry Relationships Manager',
 'suplente','otros','invitado',1,
 '55 5284 2982 / 66 7142 3738','carranzaj@iata.org',
 NULL, NULL, 201, true),

('TRANSPORTES SALTILLO MONTERREY, S.A. DE C.V.',
 'ARMANDO RÍOS ESCOBEDO',
 'Jefe de Estación',
 'titular','otros','invitado',2,
 '84 4488 2626','operadores@aeronavestsm.com',
 NULL, NULL, 202, true),

('TRANSPORTES SALTILLO MONTERREY, S.A. DE C.V.',
 'GUSTAVO HUERTA ZARAGOZA',
 'Coordinador de Estación',
 'suplente','otros','invitado',2,
 '6421154271','gustavo.huerta@me.com',
 NULL, NULL, 203, true),

('NX AVIATION, S.A. DE C.V.',
 'LUIS ALFONSO FLORES RAMOS',
 'Director Operaciones',
 'titular','otros','invitado',3,
 '55 1501 0442','aflores@nx-aviation.com',
 NULL, NULL, 204, true),

('NX AVIATION, S.A. DE C.V.',
 'JUAN CARLOS GONZÁLEZ PAZ',
 'Director Administrativo',
 'suplente','otros','invitado',3,
 '55 1950 7300','jcgp@nx-aviation.com',
 NULL, NULL, 205, true),

('WORLD EXPRESS CARGO DE MÉXICO, S.A. DE C.V.',
 'EUSTACIO CASILLAS JAUREGUI',
 'Representante',
 'titular','otros','invitado',4,
 '55 5784 5536','ecasillas@larrabezua.com.mx',
 NULL, NULL, 206, true),

('GRUPO AÉREO MONTERREY, S.A. DE C.V. (MAGNICHARTERS)',
 'ING. DANIEL GUSTAVO VÁZQUEZ SÁNCHEZ',
 'Coordinador de Aeropuertos',
 'titular','otros','invitado',5,
 NULL,NULL,
 NULL, NULL, 207, true),

('GRUPO AÉREO MONTERREY, S.A. DE C.V. (MAGNICHARTERS)',
 'ING. ESMERALDA MOCTEZUMA SARMIENTO',
 'Gerente de Operaciones',
 'suplente','otros','invitado',5,
 NULL,'Esmeraldamoctezuma@magnicharters.com',
 NULL, NULL, 208, true),

('PERSONAS Y PAQUETES POR AIRE, S.A. DE C.V.',
 'ROBERTO EAX VILLA ZAMUDIO',
 'Director de Operaciones y Seguridad Aérea',
 'titular','otros','invitado',6,
 NULL,'fernando.santillan@aerounion.com.mx',
 NULL, NULL, 209, true),

('CHINA SOUTHERN',
 'JAIR ESTRADA GARCÍA',
 'Jefe de Despacho',
 'titular','otros','invitado',7,
 NULL,'huangjinke@csair.com',
 NULL, NULL, 210, true),

('AEROLINHAS BRASILEIRAS, S.A.',
 'LIC. CARLOS CAMPILLO LABRANDERO',
 'Apoderado Legal',
 'titular','otros','invitado',8,
 NULL,'ccampillo@acym.com.mx',
 NULL, NULL, 211, true),

('TRANSPORTES AÉREOS REGIONALES',
 'ING. ALEJANDRO BONILLA HERRERA',
 'Gerente Corporativo de Aeropuertos',
 'titular','otros','invitado',9,
 NULL,'abonilla@tarmexico.com',
 NULL, NULL, 212, true),

('FEDERAL EXPRESS HOLDINGS MÉXICO',
 'ISRAEL RÍOS',
 'Coordinador de Operaciones',
 'titular','otros','invitado',10,
 '55 4051 3292','israel.rios@fedex.com',
 NULL, NULL, 213, true),

('AMERIJET INTERNATIONAL AIRLINES',
 'MARIANA PÉREZ VÁZQUEZ',
 'Gerente de Operaciones',
 'titular','otros','invitado',11,
 '55 3408 9104','mperez@amerijet.com',
 NULL, NULL, 214, true),

('SWISSPORT',
 'OLIVER SERGIO FAJARDO SILVA',
 'Gerente de Estación',
 'titular','otros','invitado',12,
 '6182101809','oliver.fajardo@swissport.com',
 NULL, NULL, 215, true),

('ARAJET',
 'LUCIANO MENSEGUEZ',
 'Gerente de Aeropuertos',
 'titular','otros','invitado',13,
 NULL,'luciano.mensequez@arajet.com',
 NULL, NULL, 216, true),

('ARAJET',
 'GARRET MALONE',
 'Chief Operations Officer',
 'suplente','otros','invitado',13,
 '+1 (809) 656 4836','Garret.Malone@arajet.com',
 NULL, NULL, 217, true),

('ATLAS AIR INC.',
 'FERNANDO DE LA FUENTE PEÑAFIEL',
 'Country Manager',
 'titular','otros','invitado',14,
 '5528552948','fdelafuente@atlasair.com',
 NULL, NULL, 218, true),

('ATLAS AIR INC.',
 'ADRIÁN VÁZQUEZ SOLÍS',
 'Supervisor de Operaciones',
 'suplente','otros','invitado',14,
 '55569702095','adrian.solis@atlasair.com',
 NULL, NULL, 219, true),

('ATLAS AIR INC.',
 'MARISOL DOMÍNGUEZ RIVERA',
 'Oficial de Operaciones',
 'suplente','otros','invitado',14,
 '5579175003','GroundOpsNlu@@atlasair.com',
 NULL, NULL, 220, true),

('LOGÍSTICA TME, S.A. DE C.V.',
 'YOBRAN ANTONIO ZEPEDA QUEZADA',
 'Administrador de Operación',
 'titular','otros','invitado',15,
 '5523121096','a.zepeda@tme21.com',
 'Francisco Sarabia 16C, Colonia Peñón de los Baños, Alcaldía Venustiano Carranza, CDMX',
 NULL, 221, true),

('LOGÍSTICA TME, S.A. DE C.V.',
 'FERNANDO MANLIO JIMÉNEZ GUTIÉRREZ',
 'Supervisor',
 'suplente','otros','invitado',15,
 '5585702344','f.jimenez@tme21.com',
 NULL, NULL, 222, true),

('LOGÍSTICA TORRES, S.A. DE C.V.',
 'ALEJANDRO TORRES',
 'Director de Administración',
 'titular','otros','invitado',16,
 '5513405913','administracion@logisticatorres.mx',
 NULL, NULL, 223, true),

('LOGÍSTICA TORRES, S.A. DE C.V.',
 'MARIO ALBERTO JACOBO FRANCO',
 'Coordinador de Operación',
 'suplente','otros','invitado',16,
 '5584795251','mario.jacobo@logisticatorres.mx',
 NULL, NULL, 224, true),

('AERO SERVICES JIREH, S.A. DE C.V. (SKY WINGS)',
 'CAP. LUIS ALBERTO MARTÍNEZ PÉREZ',
 'Apoderado Legal',
 'titular','otros','invitado',17,
 '7221394949','skywingr12@gmail.com',
 NULL, NULL, 225, true)

ON CONFLICT (upper(dependencia), upper(nombre), tipo)
DO UPDATE SET
    cargo            = EXCLUDED.cargo,
    tipo_lista       = EXCLUDED.tipo_lista,
    num_directorio   = EXCLUDED.num_directorio,
    telefono         = COALESCE(EXCLUDED.telefono,   public.coyh_participantes.telefono),
    correo           = COALESCE(EXCLUDED.correo,     public.coyh_participantes.correo),
    domicilio        = COALESCE(EXCLUDED.domicilio,  public.coyh_participantes.domicilio),
    horario_atencion = COALESCE(EXCLUDED.horario_atencion, public.coyh_participantes.horario_atencion),
    orden            = EXCLUDED.orden,
    updated_at       = now();
