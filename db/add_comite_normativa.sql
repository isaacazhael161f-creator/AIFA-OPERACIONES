-- ============================================================
--  INFORMACIÓN NORMATIVA DE COMITÉS — AIFA-OPERACIONES
--  Basado en: "Comités del Aeropuerto Internacional Felipe
--  Ángeles, S.A. de C.V. — Abril 2026"
--  Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas (si no existen)
ALTER TABLE agenda_comites
  ADD COLUMN IF NOT EXISTS fundamento   TEXT,
  ADD COLUMN IF NOT EXISTS descripcion  TEXT,
  ADD COLUMN IF NOT EXISTS integrantes  TEXT;

-- ============================================================
-- 2. Actualizar cada comité con su información normativa
-- ============================================================

-- 1. H. Consejo de Administración del AIFA, S.A. de C.V. (DPE)
UPDATE agenda_comites SET
  fundamento  = 'Ley Federal de las Entidades Paraestatales, Artículos 35, 36 y 58.',
  descripcion = 'Sesiona mínimo 4 veces al año. El día es determinado por la Subsecretaría de la Defensa Nacional. Presidido por el Titular de la Coordinadora de Sector. Deberá sesionar válidamente con asistencia de por lo menos la mitad más uno de sus integrantes.',
  integrantes = 'Gral. Div. E.M. Enrique Martínez López — Presidente (Subsecretario SDN)|Gral. Div. G.N. E.M. Hernán Cortés Hernández — Suplente (Oficial Mayor SDN)|Gral. Div. P.A. E.M. Román Carmona Landa — 1er. Consejero (Cmte. de la FAM)|Gral. Div. P.A. E.M. Alfonso Rodríguez Sierra — 2do. Consejero (Cmte. IR Aérea Militar)|Gral. Bgda. E.M. Cirilo Mondragón Rivero — 3er. Consejero (Dir. Gral. Admon. SDN)|Gral. Bgda. J.M. y Lic. Pedro Bonilla Muñoz — 4to. Consejero (Jefe Asuntos Jurídicos SDN)|Gral. Brig. Intdte. E.M. Manuel Jaime Ramírez Camacho — 5to. Consejero (Dir. Gral. Banjercito)|Lic. Agustín Rodríguez Bello — 6to. Consejero (SHCP)|Arq. Tania Carro Toledo — 7ma. Consejera (Subsec. Transporte SCT)|Lic. Josefina Rodríguez Zamora — 8va. Consejera (Sec. Turismo)|Gral. Div. E.M. Ret. Antonio Solorzano Ortega — Consejero Independiente A|Gral. Div. E.M. Ret. José Alfredo González Rodríguez — Consejero Independiente B|C.P. Roberto Antonio Durán López — Dir. Gral. y Comisario Propietario'
WHERE numero = 1 OR nombre ILIKE '%Consejo de Administración%';

-- 2. Comisión Consultiva (DPE)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos, Artículo 44. Reglamento de la Ley de Aeropuertos, Artículos 173 y 174.',
  descripcion = '2 sesiones ordinarias y 5 mesas de trabajo al año. Coadyuva en la promoción del aeropuerto y emite recomendaciones sobre actividad urbana, turística y equilibrio ecológico de la zona.',
  integrantes = 'Isidoro Pastor Román — Presidente (Dir. Gral. AIFA)|Héctor Reyes Vega — Suplente (Dir. Planeación Estratégica)|Directores de Área — Invitados especiales'
WHERE numero = 2 OR nombre ILIKE '%Comisión Consultiva%';

-- 3. COCODI — Comité de Control Interno y Desempeño Institucional (DA)
UPDATE agenda_comites SET
  fundamento  = 'Acuerdo de Disposiciones y Manual Administrativo de Aplicación General en Materia de Control Interno (DOF 3 Nov. 2016, reformado 5 Sep. 2018), Numerales 32 y 42.',
  descripcion = '4 sesiones ordinarias al año, al menos 15 días antes de cada sesión del H. Consejo de Administración (11 mar, mayo, ago, nov 2026). Sesiones extraordinarias según necesidades de la Entidad.',
  integrantes = 'Dr. Isidoro Pastor Román — Presidente (Dir. Gral. AIFA)|Arturo González García — Titular OIC y Vocal Ejecutivo|Justo Narcizo Castillo Villa — Vocal Coordinador de Sector|Lic. Orlando de Jesús Vázquez Osalde — Vocal Coordinador de Control Interno|Mtro. Eleazar Ramírez Espíndola — Vocal Jurídico|Ing. Guillermo Omaña Velázquez — Vocal TI'
WHERE numero = 3 OR acronimo = 'COCODI';

-- 4. CAAS — Comité de Adquisiciones, Arrendamientos y Servicios (DA)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Adquisiciones, Arrendamientos y Servicios del Sector Público, Artículo 22. Reglamento de la LAASSP, Artículos 19, 20, 21, 22 y 23.',
  descripcion = '12 sesiones ordinarias al año (último viernes de cada mes, excepto Dic.). Informes trimestrales en la sesión ordinaria posterior al cierre del trimestre. Sesiones extraordinarias según necesidades.',
  integrantes = 'Mtro. Orlando de Jesús Vázquez Osalde — Presidente / Suplente (Dir. Administración)|Mtro. Gonzalo Sandoval González — 1er. Vocal (Dir. Operación)|Ing. Héctor Reyes Vega — 2do. Vocal (Dir. Planeación Estratégica)|Mtro. Tomás Ramírez Velázquez — Vocal Suplente (Subdir. RR.HH.)|Ing. Fabiola Cristina Sánchez Maldonado — Vocal (Subdir. Recursos Financieros)|Mtro. Eleazar Ramírez Espíndola — Asesor (Dir. Jurídico)|Lic. Isidro Morales Aguilar — Asesor Suplente (OIC)'
WHERE numero = 4 OR acronimo = 'CAAS';

-- 5. CBM — Comité de Bienes Muebles (DA)
UPDATE agenda_comites SET
  fundamento  = 'Ley General de Bienes Nacionales, Artículos 140 y 141. Acuerdo de integración y funcionamiento de Comités de Enajenación de Bienes Muebles e Inmuebles de las Dependencias y Entidades de la APF.',
  descripcion = '12 sesiones ordinarias al año. El último martes de cada mes conforme a su reglamento. Informes trimestrales. Sesiones extraordinarias según necesidades.',
  integrantes = 'Lic. Orlando de Jesús Vázquez Osalde — Presidente / Suplente (Dir. Administración)|Mtro. Thomás Ramírez Velázquez — Vocal Propietario Suplente 1 (Subdir. RR.HH.)|Mtro. Gonzalo Sandoval González — Vocal Propietario 2 (Dir. Operación)|Ing. Héctor Reyes Vega — Vocal Propietario 3 (Dir. Planeación Estratégica)|Mtro. Antonio López Ramírez — Vocal Propietario 4 (Dir. Comercial y Servicios)|Ing. Fabiola Cristina Sánchez Maldonado — Vocal Propietario 5 (Subdir. Recursos Financieros)'
WHERE numero = 5 OR acronimo = 'CBM';

-- 6. CSH — Comité de Seguridad e Higiene en el Trabajo (DA)
UPDATE agenda_comites SET
  fundamento  = 'Ley Federal del Trabajo, Artículos 2, 153-J, 475 Bis, 509 y 510. Reglamento Federal de Seguridad y Salud en el Trabajo, Artículos 7 y 45. NOM-019-STPS-2011.',
  descripcion = '3 sesiones anuales (1ª: 7 abril, 2ª: septiembre, 3ª: noviembre 2026). Recorridos de verificación con periodicidad trimestral. Presidido por el Coordinador de la CSH.',
  integrantes = 'Gonzalo Sandoval González — Coordinador de la CSH (Director de Operación)'
WHERE numero = 6 OR acronimo = 'CSH';

-- 7. Comisión Mixta de Capacitación, Adiestramiento y Productividad (DA)
UPDATE agenda_comites SET
  fundamento  = 'Ley Federal del Trabajo, Artículo 153-E.',
  descripcion = 'Al menos 4 sesiones al año (mayo, agosto, octubre, diciembre 2026). Integrada por igual número de representantes de los trabajadores y del patrón.',
  integrantes = 'Lic. Orlando de Jesús Vázquez Osalde — Presidente (Patrón)|Lic. Fernando Esteves Piña — Vocal 1 (Patrón)|Lic. Héctor Reyes Vega — Vocal 2 (Patrón)|Lic. Juan Carlos Ramírez Cruz — Vocal 3 (Patrón)|Lic. Cinthia Ivette Dávila Cantero — Vocal 4 (Patrón)|Lic. Roberto Yair González Robledo — Vocal 5 (Trabajadores)|Mtro. Emmanuel Tapia Carmona — Vocal 6 (Trabajadores)|Lic. Miroslawa Gordillo Clement — Vocal 7 (Trabajadores)|Mtra. Nelly Elizabeth Meza Villalva — Vocal 8 (Trabajadores)|Lic. Mitzi González Mitre — Secretaria (Trabajadores)'
WHERE numero = 7 OR (nombre ILIKE '%Capacitación%' AND nombre ILIKE '%Adiestramiento%');

-- 8. Grupo Interdisciplinario de Archivo (DA)
UPDATE agenda_comites SET
  fundamento  = 'Ley General de Archivos, Artículos 11, 50, 51, 52, 53 y 54.',
  descripcion = '2 sesiones por año (Junio y Noviembre 2026). El responsable del área coordinadora de archivos propicia la integración, convoca las reuniones y funge como moderador.',
  integrantes = 'Director Jurídico|Director de Planeación Estratégica|Coordinación de Archivos|Subdirector de Tecnologías de la Información|Titular de la Unidad de Transparencia|Órgano Interno de Control|Áreas o unidades administrativas productoras de documentación'
WHERE numero = 8 OR (nombre ILIKE '%Interdisciplinario%' AND nombre ILIKE '%Archivo%');

-- 9. JCSO — Junta de Control de Seguridad Operacional (GSO)
UPDATE agenda_comites SET
  fundamento  = 'NOM-064-SCT3-2023 (Sistema de Gestión de Seguridad Operacional — SMS). Manual de Gestión de Seguridad Operacional del AIFA, Acápite 3.5 (Oficio AFAC 4.1.2.2.040/VUS, 10 enero 2022).',
  descripcion = '4 sesiones ordinarias al año (miércoles de la 2ª semana: 7 ene, 8 abr, 8 jul, 8 oct 2026). Sesiones extraordinarias por convocatoria del Presidente, petición de miembros o tras incidente grave/accidente.',
  integrantes = 'Isidoro Pastor Román — Presidente RST (Dir. Gral. AIFA)|Cinthia Ivette Dávila Cantero — Secretaria (Gerente de Gestión de la Seguridad Operacional)|Eleazar Ramírez Espíndola — Integrante (Dir. Jurídico)|Orlando de Jesús Vázquez Osalde — Integrante (Dir. Administración)|Gonzalo Sandoval González — Integrante (Dir. Operación)|Héctor Reyes Vega — Integrante (Dir. Planeación Estratégica)|Antonio López Ramírez — Integrante (Dir. Comercial y Servicios)'
WHERE numero = 9 OR acronimo = 'JCSO';

-- 10. Comité Local de Fauna Silvestre (DO)
UPDATE agenda_comites SET
  fundamento  = 'Circular Obligatoria AFAC (21 octubre 2022). OACI, Anexo 14, Vol. I, Secc. 9.4. Doc. 9137 OACI, Parte 3 — Control y reducción del peligro que representa la fauna silvestre.',
  descripcion = '4 sesiones ordinarias al año (5 mar, 4 jun, 3 sep, 3 dic 2026) y sesiones extraordinarias. Facilita la comunicación, cooperación y coordinación en la gestión de fauna silvestre peligrosa en el aeródromo.',
  integrantes = 'Responsable de Seguridad Operacional Aeródromo (AIFA)|Coordinador o Responsable de Fauna Silvestre (AIFA)|Representante de concesionarios, permisionarios y operadores del transporte aéreo (Externo)|Representante del proveedor de servicios a la navegación / ATC (SENEAM)|Representante del Grupo Local de Seguridad Operacional en Pista (GSO)|Autoridades Locales (Externo)|Comandancia AFAC (AFAC)'
WHERE numero = 10 OR nombre ILIKE '%Fauna Silvestre%';

-- 11. COYH — Comité de Operación y Horarios (DO)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos, Artículos 61 y 62. Reglamento de la Ley de Aeropuertos, Artículos 129 y 131.',
  descripcion = '12 sesiones ordinarias mensuales (2do. martes de cada mes). Emite recomendaciones sobre funcionamiento, operación y horarios del aeropuerto; asignación de posiciones, itinerarios y espacios; condiciones de servicios; tarifas; reglas de operación; solución de conflictos y quejas de usuarios.',
  integrantes = 'Director General del AIFA — Dir. Gral. y Presidente del Comité (AIFA)|Comandante de AFAC — Vocal Ejecutivo del Comité (AFAC)|Representante SENEAM en el AIFA — Jefe de Estación Aeroportuaria (SENEAM)|Representantes de concesionarios y permisionarios del servicio de transporte aéreo|Representantes de operadores aéreos|Representantes de prestadores de servicios aeroportuarios y complementarios|Representantes de autoridades civiles y militares|Representantes de prestadores de servicios comerciales'
WHERE numero = 11 OR acronimo = 'COYH';

-- 11.1 Subcomité de Demoras (AFAC)
UPDATE agenda_comites SET
  fundamento  = 'Reglamento de la Ley de Aeropuertos, Artículos 97, 132 Bis y 132 Ter.',
  descripcion = 'Sesiona ordinariamente por lo menos una ocasión por mes (2do. martes, antes del COYH). Presidido por el Comandante del Aeródromo. Determina causas y responsables de demoras o cancelaciones de aterrizajes y despegues.',
  integrantes = 'Comandante del Aeródromo — Presidente (AFAC)|Administrador Aeroportuario (AIFA)|Representante del proveedor de servicios a la navegación aérea (SENEAM)'
WHERE nombre ILIKE '%Subcomité de Demoras%' OR nombre ILIKE '%Subcomite de Demoras%';

-- 11.2 RST — Subcomité de Seguridad Operacional en Pista (GSO)
UPDATE agenda_comites SET
  fundamento  = 'NOM-064-SCT3-2023 (SMS). OACI Anexo 14. Manual de Gestión de Seguridad Operacional del AIFA.',
  descripcion = 'Sesiones el miércoles de la 3ª semana del mes (18 feb, 15 abr, 19 ago, 21 oct 2026). Runway Safety Team — Grupo de acción de seguridad operacional en pista.',
  integrantes = 'Responsable de Seguridad Operacional AIFA — Presidente RST (GSO)|Comandante del Aeródromo (AFAC)|Representantes de operadores aéreos|Control de Tránsito Aéreo (SENEAM)|Representantes de prestadores de servicios en pista'
WHERE acronimo = 'RST' OR nombre ILIKE '%Runway Safety%' OR nombre ILIKE '%Seguridad Operacional en Pista%';

-- 11.3 Subcomité de Obras (DO)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos, Artículo 62. Reglamento de la Ley de Aeropuertos, Artículo 131.',
  descripcion = 'Una vez por mes conforme a las sesiones del COYH (11:30 hrs). Evalúa el avance de obras en el aeropuerto y su impacto en la operación aeroportuaria.',
  integrantes = 'Director de Operaciones AIFA — Presidente|Representantes de las áreas involucradas en obras|Comandante del Aeródromo (AFAC)|Control de Tránsito Aéreo (SENEAM)'
WHERE nombre ILIKE '%Subcomité de Obras%' OR nombre ILIKE '%Subcomite de Obras%';

-- 12. Comité de Transparencia (UT)
UPDATE agenda_comites SET
  fundamento  = 'Ley General de Transparencia y Acceso a la Información Pública. Ley Federal de Transparencia y Acceso a la Información Pública.',
  descripcion = 'Sesiona dos veces al mes (24 sesiones al año): 8 y 22 ene, 12 y 26 feb, 12 y 26 mar, 9 y 23 abr, 14 y 28 may, 11 y 25 jun, 9 y 23 jul, 6 y 20 ago, 3 y 17 sep, 8 y 22 oct, 5 y 19 nov, 3 y 17 dic. Supervisa el cumplimiento de obligaciones de transparencia.',
  integrantes = 'Titular de la Unidad de Transparencia (UT) — Coordinador|Integrantes del Comité de Transparencia AIFA'
WHERE numero = 12 OR nombre ILIKE '%Transparencia%';

-- 13. Comité de Ética (UT)
UPDATE agenda_comites SET
  fundamento  = 'Ley General de Responsabilidades Administrativas. Acuerdo que expide el Código de Ética de los servidores públicos del Gobierno Federal.',
  descripcion = '5 sesiones al año: 31 ene, 17 abr, 15 jul, 15 oct, 15 dic 2026. Promueve los principios de ética e integridad en el servicio público.',
  integrantes = 'Titular de la Unidad de Transparencia (UT) — Coordinador|Integrantes del Comité de Ética AIFA'
WHERE numero = 13 OR nombre ILIKE '%Ética%' OR nombre ILIKE '%Etica%';

-- 14. COCOSA — Comité Interno de Contratación, Tarifas y Crédito (DCS)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos, Artículo 62. Contrato de Concesión del AIFA, S.A. de C.V.',
  descripcion = '12 sesiones ordinarias al año. Sesiona el mismo día que el COYH (12:30 hrs). Dictamina sobre contratación, tarifas y crédito de los servicios aeroportuarios, complementarios y comerciales.',
  integrantes = 'Director General del AIFA — Presidente|Directores de Área AIFA — Vocales|Representantes de áreas involucradas en servicios aeroportuarios y comerciales'
WHERE numero = 14 OR acronimo = 'COCOSA';

-- 15. Comité de Calidad y Mejora Continua (GC)
UPDATE agenda_comites SET
  fundamento  = 'Normas ISO aplicables. Política de Calidad del AIFA, S.A. de C.V.',
  descripcion = '5 sesiones al año: 23 ene, 24 abr, 24 jul, 23 oct, 18 dic 2026. Supervisa la implementación del sistema de gestión de calidad y promueve la mejora continua institucional.',
  integrantes = 'Gerente de Calidad AIFA — Presidente|Directores y responsables de áreas involucradas en el SGC'
WHERE numero = 15 OR nombre ILIKE '%Calidad%';

-- 16. COCOA — Comisión Coordinadora de Autoridades (AFAC)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos, Artículo 62. Reglamento de la Ley de Aeropuertos.',
  descripcion = '12 sesiones ordinarias al año. Sesiona una ocasión por mes (9 ene, 13 feb, 13 mar, 10 abr, 8 may, 12 jun, 10 jul, 14 ago, 11 sep, 9 oct, 13 nov, 11 dic). Coordina a las autoridades que operan en el aeropuerto.',
  integrantes = 'Comandante AFAC — Presidente (AFAC)|Director General del AIFA (AIFA)|Representantes de autoridades civiles y militares|Representantes de organismos gubernamentales presentes en el aeropuerto'
WHERE numero = 16 OR acronimo = 'COCOA';

-- 17. CLSA — Comité Local de Seguridad Aeroportuaria (AFAC)
UPDATE agenda_comites SET
  fundamento  = 'Ley de Aeropuertos. Reglamento de la Ley de Aeropuertos. Normas de seguridad aeroportuaria AFAC.',
  descripcion = '12 sesiones ordinarias al año (tercer jueves de cada mes: 15 ene, 19 feb, 19 mar, 16 abr, 21 may, 18 jun, 16 jul, 20 ago, 17 sep, 15 oct, 19 nov, 17 dic). Una sesión al mes.',
  integrantes = 'Comandante AFAC — Presidente (AFAC)|Director General del AIFA (AIFA)|Representantes de fuerzas del orden|Representantes de aerolíneas y prestadores de servicios|Integrantes del comité de seguridad aeroportuaria'
WHERE numero = 17 OR acronimo = 'CLSA';

-- 18. CIAFA — Comité de Innovación del AIFA, S.A. de C.V. (DPE)
UPDATE agenda_comites SET
  fundamento  = 'Política de Innovación del AIFA, S.A. de C.V. Lineamientos internos de innovación y desarrollo tecnológico.',
  descripcion = '3 sesiones al año: 30 mar, 27 jul, 30 nov 2026. Promueve iniciativas de innovación, modernización y desarrollo tecnológico en el aeropuerto.',
  integrantes = 'Director de Planeación Estratégica AIFA — Presidente|Directores de Área AIFA — Vocales|Responsables de proyectos de innovación'
WHERE numero = 18 OR acronimo = 'CIAFA';
