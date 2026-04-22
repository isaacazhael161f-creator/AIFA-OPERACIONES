-- =============================================================================
-- 1. CREAR TABLA CATÁLOGO DE ÁREAS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.areas_config (
    acronimo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    color_text VARCHAR(7),
    color_bg VARCHAR(7)
);

-- Insertar Áreas
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('DPE', 'Dir. Planeación Estratégica', '#0d9488', '#f0fdfa') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('DA', 'Dir. Administración', '#2563eb', '#eff6ff') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('GSO', 'Gestión Seg. Operacional', '#7c3aed', '#f5f3ff') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('DO', 'Dir. Operación', '#059669', '#ecfdf5') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('DCS', 'Dir. Comercial y Servicios', '#d97706', '#fffbeb') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('GC', 'Gestión de Calidad', '#0284c7', '#e0f2fe') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('AFAC', 'AFAC (Externo)', '#4f46e5', '#eef2ff') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;
INSERT INTO public.areas_config (acronimo, nombre, color_text, color_bg) VALUES ('UT', 'Unidad Transparencia', '#0891b2', '#cffafe') ON CONFLICT (acronimo) DO UPDATE SET color_text=EXCLUDED.color_text, color_bg=EXCLUDED.color_bg, nombre=EXCLUDED.nombre;

-- =============================================================================
-- 2. CREAR TABLA CATÁLOGO DE COMITÉS (DEFINICIONES)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comites_catalogo (
    id_comite VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    acr VARCHAR(50) NOT NULL,
    area VARCHAR(10) REFERENCES public.areas_config(acronimo),
    hora_predeterminada VARCHAR(100),
    tipo_predeterminado VARCHAR(50) DEFAULT 'ordinaria',
    obs TEXT,
    miembros TEXT,
    prep_timeline TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar Comités Base
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('hca', 'H. Consejo de Administración', 'HCA', 'DPE', 'A definir (SDN)', 'ordinaria', '4 sesiones ordinarias al año. Presidido por Subsecretario de Defensa Nacional. Sesiona válidamente con mayoría de asistentes que sean representantes del Gobierno Federal. Convocado a través de la Dirección de Planeación Estratégica.', 'Gral. Div. Enrique Martínez López (Presidente), Gral. Div. Hernán Cortés H. (Suplente), y 10 consejeros adicionales.', 'Recepción info: 5 días; Integración: 3 días; Revisión Dir. Gral: 5 días; Remisión SDN: 7 días; Envío a consejeros: 5 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cc', 'Comisión Consultiva', 'CC', 'DPE', '11:00', 'ordinaria', '2 sesiones ordinarias + 5 mesas de trabajo al año. El concesionario preside. Se reúne al menos 1 vez al año. Levanta minuta de cada sesión. Compuesta por representantes de gobierno estatal/municipal, cámaras y transportistas.', '', 'Solicitud escrita: 5-15 días post-cierre; Reunión coordinación: 2 días; Subdirectores: 2 días; Titular: 3 días; Miembros: hasta 7 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cocodi', 'COCODI', 'COCODI', 'DA', '11:00', 'ordinaria', '4 sesiones al año mínimo, al menos 15 días antes de cada sesión del H. Consejo de Administración. Preside el titular de la institución. Sesiones extraordinarias según necesidad.', '', 'Solicitud: 5 días post-mes previo; Coordinación: 2 días; Subdirectores: 2 días; Titular: 3 días; Miembros: hasta 7 días hábiles antes (extraordinarias: 2 días hábiles).')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('caas', 'CAAS – Comité Adquisiciones, Arrendamientos y Servicios', 'CAAS', 'DA', '10:00', 'ordinaria', '12 sesiones ordinarias al año (último viernes del mes, excepto Diciembre). Informes trimestrales en sesión inmediata posterior al cierre del trimestre. Sesiones extraordinarias según necesidades. Convocatoria con mínimo 3 días hábiles de anticipación.', 'Mtro. Orlando Vázquez Osalde (Pte.), Mtro. Gonzalo Sandoval (Vocal 1), Ing. Héctor Reyes Vega (Vocal 2), Mtro. Tomás Ramírez (Vocal Suplente), Ing. Fabiola Sánchez (Vocal), Mtro. Eleazar Ramírez (Asesor jurídico), Lic. Isidro Morales (Asesor OIC).', 'Secretario Técnico: 5 días antes; Titular: 2 días revisión; Miembros: 3 días hábiles antes (extraordinarias: 1 día hábil).')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cbm', 'Comité de Bienes Muebles', 'CBM', 'DA', '10:00', 'ordinaria', '12 sesiones ordinarias al año. Informes trimestrales. Sesiones extraordinarias según necesidad. El orden del día se entrega con mínimo 3 días hábiles (1 día para extraordinarias).', 'Lic. Orlando Vázquez (Pte.), Mtro. Thomás Ramírez (Vocal 1), Mtro. Gonzalo Sandoval (Vocal 2), Ing. Héctor Reyes Vega (Vocal 3), Mtro. Antonio López (Vocal 4), Ing. Fabiola Sánchez (Vocal 5).', 'Secretario Técnico: 5 días antes; Titular: 2 días; Miembros: 3 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('csh', 'Comité de Seguridad e Higiene en el Trabajo', 'CSH', 'DA', '10:00', 'ordinaria', '3 sesiones ordinarias al año. Recorridos de verificación con periodicidad mínima trimestral. El programa anual de recorridos debe integrarse dentro de los 30 días naturales siguientes a constitución o al inicio del año.', 'Gonzalo Sandoval González (Coordinador – Dir. de Operación).', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cmcap', 'Comisión Mixta Capacitación, Adiestramiento y Productividad', 'CMCAP', 'DA', 'Variable', 'ordinaria', 'Al menos 3 sesiones por año (se programaron 4 en 2026). Convocatoria mínimo 15 días previos. Para sesiones extraordinarias: material 2 días hábiles antes.', 'Patrón: Lic. Orlando Vázquez Osalde (Pte.), Lic. Fernando Esteves, Lic. Héctor Reyes, Lic. Juan Carlos Ramírez, Lic. Cinthia Dávila. Trabajadores: Lic. Roberto González, Mtro. Emmanuel Tapia, Lic. Miroslawa Gordillo, Mtra. Nelly Meza, Lic. Mitzi González (Sec.).', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('gia', 'Grupo Interdisciplinario de Archivo', 'GIA', 'DA', 'Variable', 'ordinaria', '4 sesiones ordinarias al año (pendiente definir fechas). El responsable del área coordinadora de archivos propicia la integración. Se deberán realizar calendarios de visitas a áreas productoras de documentación.', 'Director Jurídico, Director Planeación Estratégica, Coordinación Archivos, Subdirector TI, Titular UT, OIC, áreas productoras.', 'Solicitud: 8 días antes; Coordinación: 2 días; Subdirectores: 2 días; Titular: 5 días; Miembros: 3 días hábiles antes (extraordinarias: 1 día).')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('jcso', 'Junta de Control de Seguridad Operacional', 'JCSO', 'GSO', '11:00', 'ordinaria', '4 sesiones ordinarias al año (miércoles de la 2ª semana del mes). Sesiones extraordinarias: cuando el Presidente la convoque, a petición de miembros, o después de incidente grave/accidente.', 'Isidoro Pastor Román (Pte. – Dir. Gral.), Cinthia Ivette Dávila Cantero (Sec. – Gte. GSO), Eleazar Ramírez Espíndola (Dir. Jurídico), Orlando Vázquez Osalde (Dir. Admin.), Gonzalo Sandoval González (Dir. Operación), Héctor Reyes Vega (Dir. PE), Antonio López Ramírez (Dir. Comercial).', 'Preparación material: 10 días antes; Titular: 1 día; Miembros: 3 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('clfs', 'Comité Local de Fauna Silvestre', 'CLFS', 'DO', 'Variable', 'ordinaria', '4 sesiones ordinarias al año. Sesiones extraordinarias según necesidad. Debe estudiar datos de choques con aves/fauna, evaluar riesgos y determinar medidas de control.', 'Resp. Seg. Operacional Aeródromo (AIFA), Coord. fauna silvestre (AIFA), Representante aerolineas (Ext.), SENEAM, RST (GSO), Autoridades Locales, Comandancia AFAC.', 'Solicitud: 5 días post-mes previo; Coordinación: 2 días; Subdirectores: 2 días; Titular: 5 días; Miembros: hasta 5 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('coyh', 'Comité de Operación y Horarios', 'COYH', 'DO', '11:00', 'ordinaria', '12 sesiones ordinarias al año (2° martes de cada mes). Sesionará al menos una vez al mes. Levanta acta por cada sesión firmada por asistentes. El reglamento interno debe aprobarse dentro de los 90 días hábiles siguientes a constitución.', 'Dir. Gral. AIFA (Pte.), Comandante AFAC (Vocal Ejecutivo), SENEAM (Jefe Estación), representantes aerolineas, operadores, prestadores y autoridades.', 'Solicitud: 5 días post-mes; Coordinación: 2 días; Subdirectores: 2 días; Titular: 3 días; Miembros: hasta 5 días hábiles antes.')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('sdem', 'Subcomité de Demoras', 'SDEM', 'DO', '11:00', 'ordinaria', 'Sesiona al menos 2 veces al mes (1 en la agenda). Presidido por el Comandante de Aeródromo (AFAC). Sesiones extraordinarias a juicio del Presidente. Aplica a demoras/cancelaciones en aterrizajes y despegues.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('rst', 'Subcomité Seg. Operacional en Pista (RST)', 'RST', 'GSO', '11:00', 'ordinaria', '6 sesiones ordinarias al año (miércoles de la 3ª semana del mes, meses alternos). Subcomité del COYH.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('sobras', 'Subcomité de Obras', 'S-OBRAS', 'DO', '11:30', 'ordinaria', 'Una vez al mes conforme a sesiones del COYH. Subcomité del COYH.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('ctrans', 'Comité de Transparencia', 'C-TRANS', 'UT', '11:00', 'ordinaria', '24 sesiones al año (2 por mes, miércoles). Sesiones el 2° y 4° miércoles de cada mes.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cetica', 'Comité de Ética', 'C-ÉTICA', 'UT', '11:00', 'ordinaria', '5 sesiones en 2026.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cocosa', 'COCOSA – Contratación, Tarifas y Crédito (Servicios Aeroportuarios)', 'COCOSA', 'DCS', '12:30', 'ordinaria', '12 sesiones ordinarias al año, conforme al calendario del COYH. Ses. misma semana que COYH.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('calidad', 'Comité de Calidad y Mejora Continua', 'CALIDAD', 'GC', '11:00', 'ordinaria', '5 sesiones en 2026.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('cocoa', 'Comisión Coordinadora de Autoridades', 'COCOA', 'AFAC', '11:00', 'ordinaria', '12 sesiones ordinarias al año, una cada mes. Externo – presidido por AFAC.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('clsa', 'Comité Local de Seguridad Aeroportuaria', 'CLSA', 'AFAC', '11:00', 'ordinaria', '12 sesiones ordinarias al año (tercer jueves de cada mes). Externo – coordinado por AFAC.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;
INSERT INTO public.comites_catalogo (id_comite, nombre, acr, area, hora_predeterminada, tipo_predeterminado, obs, miembros, prep_timeline)
VALUES ('ciafa', 'Comité de Innovación del AIFA', 'CIAFA', 'DPE', 'Variable', 'ordinaria', '3 sesiones en 2026.', '', '')
ON CONFLICT (id_comite) DO UPDATE SET nombre=EXCLUDED.nombre, acr=EXCLUDED.acr, area=EXCLUDED.area, hora_predeterminada=EXCLUDED.hora_predeterminada, obs=EXCLUDED.obs, miembros=EXCLUDED.miembros, prep_timeline=EXCLUDED.prep_timeline;

-- =============================================================================
-- 3. CREAR TABLA DE NORMATIVA (Relacionada al comité)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comites_normativa (
    id SERIAL PRIMARY KEY,
    id_comite VARCHAR(50) REFERENCES public.comites_catalogo(id_comite) ON DELETE CASCADE,
    normativa_texto TEXT NOT NULL
);

INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'hca', 'Ley Federal de Entidades Paraestatales Art. 35, 36, 58' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='hca' AND normativa_texto='Ley Federal de Entidades Paraestatales Art. 35, 36, 58');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cc', 'Ley de Aeropuertos Art. 44' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cc' AND normativa_texto='Ley de Aeropuertos Art. 44');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cc', 'Reglamento de la Ley de Aeropuertos Arts. 173-174' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cc' AND normativa_texto='Reglamento de la Ley de Aeropuertos Arts. 173-174');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cocodi', 'Acuerdo MAAGMCI DOF 3-Nov-2016 (reform. 5-Sep-2018) Numeral 32 y 42' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cocodi' AND normativa_texto='Acuerdo MAAGMCI DOF 3-Nov-2016 (reform. 5-Sep-2018) Numeral 32 y 42');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'caas', 'Ley ASSP Art. 22' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='caas' AND normativa_texto='Ley ASSP Art. 22');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'caas', 'Reglamento LAASSP Arts. 19-23' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='caas' AND normativa_texto='Reglamento LAASSP Arts. 19-23');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cbm', 'Ley General de Bienes Nacionales Arts. 140-141' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cbm' AND normativa_texto='Ley General de Bienes Nacionales Arts. 140-141');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cbm', 'Acuerdo Comités Enajenación APF Art. 5-7' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cbm' AND normativa_texto='Acuerdo Comités Enajenación APF Art. 5-7');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'csh', 'LFT Arts. 2, 153-J, 475 Bis, 509-510' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='csh' AND normativa_texto='LFT Arts. 2, 153-J, 475 Bis, 509-510');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'csh', 'RFSS Art. 7, 45' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='csh' AND normativa_texto='RFSS Art. 7, 45');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'csh', 'NOM-019-STPS-2011' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='csh' AND normativa_texto='NOM-019-STPS-2011');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cmcap', 'LFT Art. 153-E' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cmcap' AND normativa_texto='LFT Art. 153-E');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'gia', 'Ley General de Archivos Arts. 11, 50-54' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='gia' AND normativa_texto='Ley General de Archivos Arts. 11, 50-54');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'jcso', 'NOM-064-SCT3-2023 Secc.3' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='jcso' AND normativa_texto='NOM-064-SCT3-2023 Secc.3');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'jcso', 'Manual SMS AIFA (oficio AFAC 4.1.2.2.040/VUS 10-Ene-2022) Acápite 3.5' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='jcso' AND normativa_texto='Manual SMS AIFA (oficio AFAC 4.1.2.2.040/VUS 10-Ene-2022) Acápite 3.5');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'clfs', 'Circular AFAC CO-SA-10/22 (21-Oct-2022)' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='clfs' AND normativa_texto='Circular AFAC CO-SA-10/22 (21-Oct-2022)');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'clfs', 'OACI Anexo 14 Vol.I Secc. 9.4' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='clfs' AND normativa_texto='OACI Anexo 14 Vol.I Secc. 9.4');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'clfs', 'Doc. 9137 OACI Parte 3' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='clfs' AND normativa_texto='Doc. 9137 OACI Parte 3');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'coyh', 'Ley de Aeropuertos Arts. 61-62' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='coyh' AND normativa_texto='Ley de Aeropuertos Arts. 61-62');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'coyh', 'Reglamento Ley Aeropuertos Arts. 129, 131' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='coyh' AND normativa_texto='Reglamento Ley Aeropuertos Arts. 129, 131');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'sdem', 'Reglamento Ley Aeropuertos Arts. 97, 132 Bis, 132 Ter' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='sdem' AND normativa_texto='Reglamento Ley Aeropuertos Arts. 97, 132 Bis, 132 Ter');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'rst', 'Ley de Aeropuertos' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='rst' AND normativa_texto='Ley de Aeropuertos');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'rst', 'NOM-064-SCT3-2023' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='rst' AND normativa_texto='NOM-064-SCT3-2023');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'rst', 'Manual SMS AIFA' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='rst' AND normativa_texto='Manual SMS AIFA');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'sobras', 'Reglamento Ley Aeropuertos' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='sobras' AND normativa_texto='Reglamento Ley Aeropuertos');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'sobras', 'Ley Aeropuertos Art. 62' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='sobras' AND normativa_texto='Ley Aeropuertos Art. 62');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'ctrans', 'Ley General de Transparencia' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='ctrans' AND normativa_texto='Ley General de Transparencia');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'ctrans', 'Ley Federal de Transparencia y Acceso a la Información' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='ctrans' AND normativa_texto='Ley Federal de Transparencia y Acceso a la Información');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cetica', 'Ley General de Responsabilidades Administrativas' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cetica' AND normativa_texto='Ley General de Responsabilidades Administrativas');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cetica', 'Lineamientos del Comité de Ética' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cetica' AND normativa_texto='Lineamientos del Comité de Ética');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cocosa', 'Ley de Aeropuertos Art. 62' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cocosa' AND normativa_texto='Ley de Aeropuertos Art. 62');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cocosa', 'Reglamento Ley Aeropuertos' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cocosa' AND normativa_texto='Reglamento Ley Aeropuertos');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'calidad', 'ISO 9001:2015' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='calidad' AND normativa_texto='ISO 9001:2015');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'calidad', 'Normativa interna AIFA' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='calidad' AND normativa_texto='Normativa interna AIFA');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cocoa', 'Ley de Aeropuertos' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cocoa' AND normativa_texto='Ley de Aeropuertos');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'cocoa', 'Regulación AFAC' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='cocoa' AND normativa_texto='Regulación AFAC');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'clsa', 'Ley de Aeropuertos' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='clsa' AND normativa_texto='Ley de Aeropuertos');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'clsa', 'Regulación AFAC – Seguridad Aeroportuaria' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='clsa' AND normativa_texto='Regulación AFAC – Seguridad Aeroportuaria');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'ciafa', 'Estatutos AIFA S.A. de C.V.' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='ciafa' AND normativa_texto='Estatutos AIFA S.A. de C.V.');
INSERT INTO public.comites_normativa (id_comite, normativa_texto) SELECT 'ciafa', 'Ley Federal de Entidades Paraestatales Art. 10 X (autorización comités de apoyo)' WHERE NOT EXISTS (SELECT 1 FROM public.comites_normativa WHERE id_comite='ciafa' AND normativa_texto='Ley Federal de Entidades Paraestatales Art. 10 X (autorización comités de apoyo)');

-- =============================================================================
-- 4. CREAR TABLA DE SESIONES O ACCIONES (EJ. agenda_comites_sesiones)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.agenda_comites_sesiones (
    id SERIAL PRIMARY KEY,
    id_comite VARCHAR(50) REFERENCES public.comites_catalogo(id_comite) ON DELETE CASCADE,
    area VARCHAR(10) REFERENCES public.areas_config(acronimo),  -- Copiado al crear, facilita RLS
    fecha DATE NOT NULL,
    hora VARCHAR(50),
    tipo VARCHAR(50) DEFAULT 'ordinaria',
    obs_sesion TEXT,
    usuario_id UUID REFERENCES auth.users(id), -- Quien agendó
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar Sesiones Anuales Pre-Agendadas
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'hca', 'DPE', '2026-03-01', 'A definir (SDN)', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='hca' AND fecha='2026-03-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'hca', 'DPE', '2026-06-01', 'A definir (SDN)', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='hca' AND fecha='2026-06-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'hca', 'DPE', '2026-09-01', 'A definir (SDN)', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='hca' AND fecha='2026-09-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'hca', 'DPE', '2026-12-01', 'A definir (SDN)', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='hca' AND fecha='2026-12-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-01-22', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-01-22');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-02-26', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-02-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-04-30', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-04-30');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-07-23', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-07-23');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-08-27', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-08-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-10-29', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-10-29');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cc', 'DPE', '2026-11-26', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cc' AND fecha='2026-11-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocodi', 'DA', '2026-03-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocodi' AND fecha='2026-03-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocodi', 'DA', '2026-05-01', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocodi' AND fecha='2026-05-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocodi', 'DA', '2026-08-01', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocodi' AND fecha='2026-08-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocodi', 'DA', '2026-11-01', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocodi' AND fecha='2026-11-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-01-30', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-01-30');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-02-27', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-02-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-03-27', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-03-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-04-24', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-04-24');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-05-29', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-05-29');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-06-26', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-06-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-07-31', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-07-31');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-08-28', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-08-28');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-09-25', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-09-25');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-10-30', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-10-30');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-11-27', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-11-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'caas', 'DA', '2026-12-18', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='caas' AND fecha='2026-12-18');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-01-27', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-01-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-02-24', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-02-24');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-03-31', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-03-31');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-04-28', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-04-28');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-05-26', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-05-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-06-30', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-06-30');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-07-28', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-07-28');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-08-25', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-08-25');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-09-29', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-09-29');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-10-27', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-10-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-11-24', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-11-24');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cbm', 'DA', '2026-12-15', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cbm' AND fecha='2026-12-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'csh', 'DA', '2026-04-07', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='csh' AND fecha='2026-04-07');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'csh', 'DA', '2026-09-01', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='csh' AND fecha='2026-09-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'csh', 'DA', '2026-11-01', '10:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='csh' AND fecha='2026-11-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cmcap', 'DA', '2026-05-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cmcap' AND fecha='2026-05-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cmcap', 'DA', '2026-08-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cmcap' AND fecha='2026-08-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cmcap', 'DA', '2026-10-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cmcap' AND fecha='2026-10-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cmcap', 'DA', '2026-12-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cmcap' AND fecha='2026-12-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'gia', 'DA', '2026-06-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='gia' AND fecha='2026-06-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'gia', 'DA', '2026-11-01', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='gia' AND fecha='2026-11-01');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'jcso', 'GSO', '2026-01-07', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='jcso' AND fecha='2026-01-07');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'jcso', 'GSO', '2026-04-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='jcso' AND fecha='2026-04-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'jcso', 'GSO', '2026-07-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='jcso' AND fecha='2026-07-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'jcso', 'GSO', '2026-10-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='jcso' AND fecha='2026-10-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clfs', 'DO', '2026-03-05', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clfs' AND fecha='2026-03-05');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clfs', 'DO', '2026-06-04', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clfs' AND fecha='2026-06-04');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clfs', 'DO', '2026-09-03', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clfs' AND fecha='2026-09-03');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clfs', 'DO', '2026-12-03', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clfs' AND fecha='2026-12-03');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-01-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-01-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-02-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-02-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-03-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-03-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-04-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-04-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-05-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-05-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-06-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-06-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-07-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-07-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-08-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-08-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-09-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-09-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-10-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-10-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-11-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-11-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'coyh', 'DO', '2026-12-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='coyh' AND fecha='2026-12-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-01-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-01-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-02-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-02-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-03-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-03-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-04-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-04-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-05-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-05-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-06-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-06-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-07-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-07-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-08-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-08-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-09-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-09-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-10-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-10-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-11-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-11-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sdem', 'DO', '2026-12-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sdem' AND fecha='2026-12-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-02-18', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-02-18');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-04-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-04-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-06-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-06-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-08-19', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-08-19');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-10-21', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-10-21');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'rst', 'GSO', '2026-12-16', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='rst' AND fecha='2026-12-16');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-01-12', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-01-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-02-09', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-02-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-03-09', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-03-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-04-13', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-04-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-05-11', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-05-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-06-08', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-06-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-07-13', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-07-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-08-10', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-08-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-09-07', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-09-07');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-10-12', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-10-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-11-09', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-11-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'sobras', 'DO', '2026-12-07', '11:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='sobras' AND fecha='2026-12-07');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-01-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-01-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-01-22', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-01-22');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-02-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-02-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-02-26', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-02-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-03-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-03-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-03-26', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-03-26');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-04-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-04-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-04-23', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-04-23');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-05-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-05-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-05-28', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-05-28');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-06-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-06-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-06-25', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-06-25');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-07-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-07-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-07-23', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-07-23');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-08-06', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-08-06');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-08-20', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-08-20');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-09-03', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-09-03');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-09-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-09-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-10-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-10-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-10-22', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-10-22');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-11-05', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-11-05');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-11-19', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-11-19');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-12-03', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-12-03');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ctrans', 'UT', '2026-12-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ctrans' AND fecha='2026-12-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cetica', 'UT', '2026-01-31', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cetica' AND fecha='2026-01-31');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cetica', 'UT', '2026-04-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cetica' AND fecha='2026-04-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cetica', 'UT', '2026-07-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cetica' AND fecha='2026-07-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cetica', 'UT', '2026-10-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cetica' AND fecha='2026-10-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cetica', 'UT', '2026-12-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cetica' AND fecha='2026-12-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-01-13', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-01-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-02-10', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-02-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-03-10', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-03-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-04-14', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-04-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-05-12', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-05-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-06-09', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-06-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-07-14', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-07-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-08-11', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-08-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-09-08', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-09-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-10-13', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-10-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-11-10', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-11-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocosa', 'DCS', '2026-12-08', '12:30', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocosa' AND fecha='2026-12-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'calidad', 'GC', '2026-01-23', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='calidad' AND fecha='2026-01-23');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'calidad', 'GC', '2026-04-24', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='calidad' AND fecha='2026-04-24');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'calidad', 'GC', '2026-07-24', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='calidad' AND fecha='2026-07-24');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'calidad', 'GC', '2026-10-23', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='calidad' AND fecha='2026-10-23');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'calidad', 'GC', '2026-12-18', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='calidad' AND fecha='2026-12-18');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-01-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-01-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-02-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-02-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-03-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-03-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-04-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-04-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-05-08', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-05-08');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-06-12', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-06-12');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-07-10', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-07-10');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-08-14', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-08-14');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-09-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-09-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-10-09', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-10-09');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-11-13', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-11-13');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'cocoa', 'AFAC', '2026-12-11', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='cocoa' AND fecha='2026-12-11');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-01-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-01-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-02-19', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-02-19');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-03-19', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-03-19');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-04-16', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-04-16');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-05-21', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-05-21');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-06-18', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-06-18');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-07-16', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-07-16');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-08-20', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-08-20');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-09-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-09-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-10-15', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-10-15');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-11-19', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-11-19');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'clsa', 'AFAC', '2026-12-17', '11:00', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='clsa' AND fecha='2026-12-17');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ciafa', 'DPE', '2026-03-30', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ciafa' AND fecha='2026-03-30');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ciafa', 'DPE', '2026-07-27', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ciafa' AND fecha='2026-07-27');
INSERT INTO public.agenda_comites_sesiones (id_comite, area, fecha, hora, tipo) SELECT 'ciafa', 'DPE', '2026-11-30', 'Variable', 'ordinaria' WHERE NOT EXISTS (SELECT 1 FROM public.agenda_comites_sesiones WHERE id_comite='ciafa' AND fecha='2026-11-30');
-- =============================================================================
-- 5. POL�TICAS DE SEGURIDAD (RLS) PARA SESIONES Y CAT�LOGOS POR �REA
-- =============================================================================

ALTER TABLE public.comites_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_comites_sesiones ENABLE ROW LEVEL SECURITY;

-- 5.1 TODO MUNDO PUEDE VER LOS CAT�LOGOS Y LAS SESIONES (Visibilidad general)
DROP POLICY IF EXISTS ""lectura_general_catalogo"" ON public.comites_catalogo;
CREATE POLICY ""lectura_general_catalogo""
    ON public.comites_catalogo FOR SELECT USING (true);

DROP POLICY IF EXISTS ""lectura_general_sesiones"" ON public.agenda_comites_sesiones;
CREATE POLICY ""lectura_general_sesiones""
    ON public.agenda_comites_sesiones FOR SELECT USING (true);

-- 5.2 S�LO EL �REA PUEDE EDITAR SU CAT�LOGO DE COMIT�S (Si se requiere)
DROP POLICY IF EXISTS ""comites_catalogo_update_por_area"" ON public.comites_catalogo;
CREATE POLICY ""comites_catalogo_update_por_area""
    ON public.comites_catalogo FOR UPDATE
    USING (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR EXISTS (SELECT 1 FROM public.colaboradores_roles cr WHERE cr.user_id = auth.uid() AND cr.area = comites_catalogo.area)
    )
    WITH CHECK (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR EXISTS (SELECT 1 FROM public.colaboradores_roles cr WHERE cr.user_id = auth.uid() AND cr.area = comites_catalogo.area)
    );

-- 5.3 S�LO EL �REA PUEDE INSERTAR / EDITAR / BORRAR SESIONES DE ESA MISMA �REA
DROP POLICY IF EXISTS ""sesiones_insercion_area"" ON public.agenda_comites_sesiones;
CREATE POLICY ""sesiones_insercion_area""
    ON public.agenda_comites_sesiones FOR INSERT
    WITH CHECK (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR EXISTS (SELECT 1 FROM public.colaboradores_roles cr WHERE cr.user_id = auth.uid() AND cr.area = agenda_comites_sesiones.area)
    );

DROP POLICY IF EXISTS ""sesiones_update_area"" ON public.agenda_comites_sesiones;
CREATE POLICY ""sesiones_update_area""
    ON public.agenda_comites_sesiones FOR UPDATE
    USING (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR EXISTS (SELECT 1 FROM public.colaboradores_roles cr WHERE cr.user_id = auth.uid() AND cr.area = agenda_comites_sesiones.area)
    );

DROP POLICY IF EXISTS ""sesiones_delete_area"" ON public.agenda_comites_sesiones;
CREATE POLICY ""sesiones_delete_area""
    ON public.agenda_comites_sesiones FOR DELETE
    USING (
        auth.jwt() -> 'app_metadata' ->> 'area' = area
        OR EXISTS (SELECT 1 FROM public.colaboradores_roles cr WHERE cr.user_id = auth.uid() AND cr.area = agenda_comites_sesiones.area)
    );
