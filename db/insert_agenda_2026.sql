-- =====================================================================
--  CATÁLOGO + SESIONES 2026 -- AGENDA DE COMITÉS AIFA
--  Fuente: Presentación "Comités del AIFA, S.A. de C.V. Abril 2026"
--  Ejecutar en: Supabase -> SQL Editor
--  Script idempotente (seguro de re-ejecutar)
-- =====================================================================

-- =====================================================================
-- 1. COMITÉS -- CATÁLOGO (18 comités oficiales)
-- =====================================================================
INSERT INTO public.agenda_comites
    (numero, nombre, area, hora_sesion, frecuencia, descripcion)
VALUES
  ('1',    'H. Consejo de Administración',               'DA',  '10:00:00', 'Trimestral',     'Máximo órgano de gobierno corporativo del AIFA'),
  ('2',    'Comisión Consultiva',                         'DA',  '10:00:00', 'Bimestral',      'Asesoría y recomendaciones estratégicas a la Dirección General'),
  ('3',    'COCODI - Comité de Control y Desempeño Institucional', 'DA', '11:00:00', 'Trimestral', 'Seguimiento a indicadores y metas institucionales'),
  ('4',    'CAAS - Comité de Adquisiciones, Arrendamientos y Servicios', 'DCS', '10:00:00', 'Mensual', 'Supervisión de procesos de contratación y adquisiciones'),
  ('5',    'CBM - Comité de Bienes Muebles e Inmuebles',  'DCS', '10:00:00', 'Mensual',        'Administración y control del patrimonio institucional'),
  ('6',    'CSH - Comité de Sustentabilidad Hídrica',     'DO',  '10:00:00', 'Cuatrimestral',  'Gestión sostenible del recurso hídrico en instalaciones'),
  ('7',    'Comité de Capacitación',                      'DA',  NULL,       'Trimestral',     'Planeación y seguimiento de programas de formación'),
  ('8',    'Comité de Archivo',                           'DA',  NULL,       'Semestral',      'Gestión documental y archivo institucional'),
  ('9',    'JCSO - Junta del Comité de Seguridad Operacional', 'DO', '11:00:00', 'Trimestral', 'Supervisión de la seguridad en las operaciones aeroportuarias'),
  ('10',   'Comité de Fauna',                             'DO',  NULL,       'Trimestral',     'Control y gestión de fauna silvestre en la zona aeroportuaria'),
  ('11',   'COYH - Comité de Obras y Habitabilidad',      'DPE', '10:00:00', 'Mensual',        'Seguimiento a obras de construcción y mantenimiento'),
  ('11.1', 'Subcomité de Demoras',                        'DO',  '11:00:00', 'Mensual',        'Análisis y seguimiento de demoras operacionales'),
  ('11.2', 'Subcomité RST - Revisión de Seguridad y Tecnología', 'DO', '11:00:00', 'Bimestral', 'Revisión de sistemas de seguridad y tecnología aeroportuaria'),
  ('11.3', 'Subcomité de Obras',                          'DPE', '11:30:00', 'Mensual',        'Seguimiento detallado a proyectos de obra'),
  ('12',   'Comité de Transparencia',                     'DA',  '11:00:00', 'Quincenal',      'Seguimiento a obligaciones de transparencia y acceso a la información'),
  ('13',   'Comité de Ética',                             'DA',  '11:00:00', 'Trimestral',     'Promoción de la integridad y cultura ética institucional'),
  ('14',   'COCOSA - Comité de Condiciones de Salud',     'DCS', '12:30:00', 'Mensual',        'Seguimiento a condiciones de salud y seguridad del personal'),
  ('15',   'Comité de Calidad',                           'DO',  '11:00:00', 'Trimestral',     'Sistema de gestión de calidad en servicios aeroportuarios'),
  ('16',   'COCOA - Comité de Condiciones de Obra y Ambiente', 'DPE', '11:00:00', 'Mensual',   'Supervisión de condiciones ambientales en obras'),
  ('17',   'CLSA - Comité de la Ley del Sistema de Ahorro', 'DCS', '11:00:00', 'Mensual',      'Administración del sistema de ahorro para el retiro del personal'),
  ('18',   'CIAFA - Comité de Imagen y Atención al Pasajero', 'GSO', NULL,  'Cuatrimestral',   'Supervisión de imagen institucional y calidad de servicio al pasajero')
ON CONFLICT (numero) DO UPDATE
  SET nombre      = EXCLUDED.nombre,
      area        = EXCLUDED.area,
      hora_sesion = COALESCE(EXCLUDED.hora_sesion, agenda_comites.hora_sesion),
      frecuencia  = EXCLUDED.frecuencia,
      descripcion = EXCLUDED.descripcion;


-- =====================================================================
-- 2. PROCEDIMIENTO AUXILIAR (se elimina al final del script)
-- =====================================================================

CREATE OR REPLACE PROCEDURE _ag_ins_sesion(
    p_numero TEXT,
    p_sesion TEXT,
    p_fecha  DATE,
    p_hora   TIME    DEFAULT NULL,
    p_obs    TEXT    DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    _cid  UUID;
    _area TEXT;
    _est  TEXT;
BEGIN
    SELECT id, area INTO _cid, _area
      FROM public.agenda_comites
     WHERE numero = p_numero
     LIMIT 1;

    IF _cid IS NULL THEN RETURN; END IF;

    _est := CASE WHEN p_fecha <= '2026-04-27'::DATE THEN 'Celebrada' ELSE 'Programada' END;

    INSERT INTO public.agenda_reuniones
        (comite_id, area, numero_sesion, fecha_sesion, hora_inicio, estatus, observaciones)
    VALUES (
        _cid, _area, p_sesion, p_fecha,
        COALESCE(p_hora, (SELECT hora_sesion FROM public.agenda_comites WHERE id = _cid)),
        _est, p_obs
    )
    ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;
END;
$$;


-- =====================================================================
-- 3. SESIONES 2026
--    Estado: Celebrada si fecha <= 2026-04-27; Programada en adelante
-- =====================================================================

DO $$
BEGIN

-- -- 1. H. Consejo de Administración
CALL _ag_ins_sesion('1','1a Sesión Ordinaria 2026','2026-03-01',NULL,
         'Fecha específica determinada por la Subsecretaría de la SDN');
CALL _ag_ins_sesion('1','2a Sesión Ordinaria 2026','2026-06-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');
CALL _ag_ins_sesion('1','3a Sesión Ordinaria 2026','2026-09-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');
CALL _ag_ins_sesion('1','4a Sesión Ordinaria 2026','2026-12-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');

-- -- 2. Comisión Consultiva
CALL _ag_ins_sesion('2','1a Sesión Ordinaria',   '2026-01-22','10:00:00');
CALL _ag_ins_sesion('2','1a Mesa de Trabajo',    '2026-02-26','10:00:00');
CALL _ag_ins_sesion('2','2a Mesa de Trabajo',    '2026-04-30','10:00:00');
CALL _ag_ins_sesion('2','3a Mesa de Trabajo',    '2026-07-23','10:00:00');
CALL _ag_ins_sesion('2','4a Mesa de Trabajo',    '2026-08-27','10:00:00');
CALL _ag_ins_sesion('2','5a Mesa de Trabajo',    '2026-10-29','10:00:00');
CALL _ag_ins_sesion('2','2a Sesión Ordinaria',   '2026-11-26','10:00:00');

-- -- 3. COCODI
CALL _ag_ins_sesion('3','1a Sesión Ordinaria','2026-03-11','11:00:00');
CALL _ag_ins_sesion('3','2a Sesión Ordinaria','2026-05-15','11:00:00',
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('3','3a Sesión Ordinaria','2026-08-15','11:00:00',
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('3','4a Sesión Ordinaria','2026-11-15','11:00:00',
         'Fecha aproximada; a confirmar');

-- -- 4. CAAS
CALL _ag_ins_sesion('4','1a  Sesión Ordinaria (Informe trim.)','2026-01-30','10:00:00');
CALL _ag_ins_sesion('4','2a  Sesión Ordinaria','2026-02-27','10:00:00');
CALL _ag_ins_sesion('4','3a  Sesión Ordinaria','2026-03-27','10:00:00');
CALL _ag_ins_sesion('4','4a  Sesión Ordinaria (Informe trim.)','2026-04-24','10:00:00');
CALL _ag_ins_sesion('4','5a  Sesión Ordinaria','2026-05-29','10:00:00');
CALL _ag_ins_sesion('4','6a  Sesión Ordinaria','2026-06-26','10:00:00');
CALL _ag_ins_sesion('4','7a  Sesión Ordinaria (Informe trim.)','2026-07-31','10:00:00');
CALL _ag_ins_sesion('4','8a  Sesión Ordinaria','2026-08-28','10:00:00');
CALL _ag_ins_sesion('4','9a  Sesión Ordinaria','2026-09-25','10:00:00');
CALL _ag_ins_sesion('4','10a Sesión Ordinaria (Informe trim.)','2026-10-30','10:00:00');
CALL _ag_ins_sesion('4','11a Sesión Ordinaria','2026-11-27','10:00:00');
CALL _ag_ins_sesion('4','12a Sesión Ordinaria','2026-12-18','10:00:00');

-- -- 5. CBM
CALL _ag_ins_sesion('5','1a  Sesión Ordinaria (Informe trim.)','2026-01-27','10:00:00');
CALL _ag_ins_sesion('5','2a  Sesión Ordinaria','2026-02-24','10:00:00');
CALL _ag_ins_sesion('5','3a  Sesión Ordinaria','2026-03-31','10:00:00');
CALL _ag_ins_sesion('5','4a  Sesión Ordinaria (Informe trim.)','2026-04-28','10:00:00');
CALL _ag_ins_sesion('5','5a  Sesión Ordinaria','2026-05-26','10:00:00');
CALL _ag_ins_sesion('5','6a  Sesión Ordinaria','2026-06-30','10:00:00');
CALL _ag_ins_sesion('5','7a  Sesión Ordinaria (Informe trim.)','2026-07-28','10:00:00');
CALL _ag_ins_sesion('5','8a  Sesión Ordinaria','2026-08-25','10:00:00');
CALL _ag_ins_sesion('5','9a  Sesión Ordinaria','2026-09-29','10:00:00');
CALL _ag_ins_sesion('5','10a Sesión Ordinaria (Informe trim.)','2026-10-27','10:00:00');
CALL _ag_ins_sesion('5','11a Sesión Ordinaria','2026-11-24','10:00:00');
CALL _ag_ins_sesion('5','12a Sesión Ordinaria','2026-12-15','10:00:00');

-- -- 6. CSH
CALL _ag_ins_sesion('6','1a Sesión','2026-04-07','10:00:00');
CALL _ag_ins_sesion('6','2a Sesión','2026-09-01','10:00:00',
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('6','3a Sesión','2026-11-01','10:00:00',
         'Fecha aproximada; a confirmar');

-- -- 7. Comité de Capacitación
CALL _ag_ins_sesion('7','1a Sesión','2026-05-01',NULL,
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('7','2a Sesión','2026-08-01',NULL,
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('7','3a Sesión','2026-10-01',NULL,
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('7','4a Sesión','2026-12-01',NULL,
         'Fecha aproximada; a confirmar');

-- -- 8. Comité de Archivo
CALL _ag_ins_sesion('8','1a Sesión','2026-06-01',NULL,
         'Fecha aproximada; a confirmar');
CALL _ag_ins_sesion('8','2a Sesión','2026-11-01',NULL,
         'Fecha aproximada; a confirmar');

-- -- 9. JCSO
CALL _ag_ins_sesion('9','1a Sesión Ordinaria','2026-01-07','11:00:00');
CALL _ag_ins_sesion('9','2a Sesión Ordinaria','2026-04-08','11:00:00');
CALL _ag_ins_sesion('9','3a Sesión Ordinaria','2026-07-08','11:00:00');
CALL _ag_ins_sesion('9','4a Sesión Ordinaria','2026-10-08','11:00:00');

-- -- 10. Comité de Fauna
CALL _ag_ins_sesion('10','1a Sesión Ordinaria','2026-03-05',NULL);
CALL _ag_ins_sesion('10','2a Sesión Ordinaria','2026-06-04',NULL);
CALL _ag_ins_sesion('10','3a Sesión Ordinaria','2026-09-03',NULL);
CALL _ag_ins_sesion('10','4a Sesión Ordinaria','2026-12-03',NULL);

-- -- 11. COYH
CALL _ag_ins_sesion('11','1a  Sesión Ordinaria','2026-01-13','10:00:00');
CALL _ag_ins_sesion('11','2a  Sesión Ordinaria','2026-02-10','10:00:00');
CALL _ag_ins_sesion('11','3a  Sesión Ordinaria','2026-03-10','10:00:00');
CALL _ag_ins_sesion('11','4a  Sesión Ordinaria','2026-04-14','10:00:00');
CALL _ag_ins_sesion('11','5a  Sesión Ordinaria','2026-05-12','10:00:00');
CALL _ag_ins_sesion('11','6a  Sesión Ordinaria','2026-06-09','10:00:00');
CALL _ag_ins_sesion('11','7a  Sesión Ordinaria','2026-07-14','10:00:00');
CALL _ag_ins_sesion('11','8a  Sesión Ordinaria','2026-08-11','10:00:00');
CALL _ag_ins_sesion('11','9a  Sesión Ordinaria','2026-09-08','10:00:00');
CALL _ag_ins_sesion('11','10a Sesión Ordinaria','2026-10-13','10:00:00');
CALL _ag_ins_sesion('11','11a Sesión Ordinaria','2026-11-10','10:00:00');
CALL _ag_ins_sesion('11','12a Sesión Ordinaria','2026-12-08','10:00:00');

-- -- 11.1. Subcomité de Demoras
CALL _ag_ins_sesion('11.1','Sesión enero',     '2026-01-12','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión febrero',   '2026-02-09','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión marzo',     '2026-03-09','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión abril',     '2026-04-13','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión mayo',      '2026-05-11','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión junio',     '2026-06-08','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión julio',     '2026-07-13','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión agosto',    '2026-08-10','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión septiembre','2026-09-14','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión octubre',   '2026-10-12','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión noviembre', '2026-11-09','11:00:00');
CALL _ag_ins_sesion('11.1','Sesión diciembre', '2026-12-14','11:00:00');

-- -- 11.2. Subcomité RST
CALL _ag_ins_sesion('11.2','1a Sesión','2026-02-18','11:00:00');
CALL _ag_ins_sesion('11.2','2a Sesión','2026-04-15','11:00:00');
CALL _ag_ins_sesion('11.2','3a Sesión','2026-06-17','11:00:00');
CALL _ag_ins_sesion('11.2','4a Sesión','2026-08-19','11:00:00');
CALL _ag_ins_sesion('11.2','5a Sesión','2026-10-21','11:00:00');
CALL _ag_ins_sesion('11.2','6a Sesión','2026-12-16','11:00:00');

-- -- 11.3. Subcomité de Obras
CALL _ag_ins_sesion('11.3','Sesión enero',     '2026-01-12','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión febrero',   '2026-02-09','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión marzo',     '2026-03-09','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión abril',     '2026-04-13','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión mayo',      '2026-05-11','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión junio',     '2026-06-08','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión julio',     '2026-07-13','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión agosto',    '2026-08-10','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión septiembre','2026-09-07','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión octubre',   '2026-10-12','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión noviembre', '2026-11-09','11:30:00');
CALL _ag_ins_sesion('11.3','Sesión diciembre', '2026-12-07','11:30:00');

-- -- 12. Comité de Transparencia (quincenal)
CALL _ag_ins_sesion('12','Sesión  1 ene','2026-01-08','11:00:00');
CALL _ag_ins_sesion('12','Sesión  2 ene','2026-01-22','11:00:00');
CALL _ag_ins_sesion('12','Sesión  3 feb','2026-02-12','11:00:00');
CALL _ag_ins_sesion('12','Sesión  4 feb','2026-02-26','11:00:00');
CALL _ag_ins_sesion('12','Sesión  5 mar','2026-03-12','11:00:00');
CALL _ag_ins_sesion('12','Sesión  6 mar','2026-03-26','11:00:00');
CALL _ag_ins_sesion('12','Sesión  7 abr','2026-04-09','11:00:00');
CALL _ag_ins_sesion('12','Sesión  8 abr','2026-04-23','11:00:00');
CALL _ag_ins_sesion('12','Sesión  9 may','2026-05-14','11:00:00');
CALL _ag_ins_sesion('12','Sesión 10 may','2026-05-28','11:00:00');
CALL _ag_ins_sesion('12','Sesión 11 jun','2026-06-11','11:00:00');
CALL _ag_ins_sesion('12','Sesión 12 jun','2026-06-25','11:00:00');
CALL _ag_ins_sesion('12','Sesión 13 jul','2026-07-09','11:00:00');
CALL _ag_ins_sesion('12','Sesión 14 jul','2026-07-23','11:00:00');
CALL _ag_ins_sesion('12','Sesión 15 ago','2026-08-06','11:00:00');
CALL _ag_ins_sesion('12','Sesión 16 ago','2026-08-20','11:00:00');
CALL _ag_ins_sesion('12','Sesión 17 sep','2026-09-03','11:00:00');
CALL _ag_ins_sesion('12','Sesión 18 sep','2026-09-17','11:00:00');
CALL _ag_ins_sesion('12','Sesión 19 oct','2026-10-08','11:00:00');
CALL _ag_ins_sesion('12','Sesión 20 oct','2026-10-22','11:00:00');
CALL _ag_ins_sesion('12','Sesión 21 nov','2026-11-05','11:00:00');
CALL _ag_ins_sesion('12','Sesión 22 nov','2026-11-19','11:00:00');
CALL _ag_ins_sesion('12','Sesión 23 dic','2026-12-03','11:00:00');
CALL _ag_ins_sesion('12','Sesión 24 dic','2026-12-17','11:00:00');

-- -- 13. Comité de Ética
CALL _ag_ins_sesion('13','1a Sesión','2026-01-31','11:00:00');
CALL _ag_ins_sesion('13','2a Sesión','2026-04-17','11:00:00');
CALL _ag_ins_sesion('13','3a Sesión','2026-10-15','11:00:00');
CALL _ag_ins_sesion('13','4a Sesión','2026-12-15','11:00:00');

-- -- 14. COCOSA (mismas fechas que COYH, a las 12:30)
CALL _ag_ins_sesion('14','Sesión enero',     '2026-01-13','12:30:00');
CALL _ag_ins_sesion('14','Sesión febrero',   '2026-02-10','12:30:00');
CALL _ag_ins_sesion('14','Sesión marzo',     '2026-03-10','12:30:00');
CALL _ag_ins_sesion('14','Sesión abril',     '2026-04-14','12:30:00');
CALL _ag_ins_sesion('14','Sesión mayo',      '2026-05-12','12:30:00');
CALL _ag_ins_sesion('14','Sesión junio',     '2026-06-09','12:30:00');
CALL _ag_ins_sesion('14','Sesión julio',     '2026-07-14','12:30:00');
CALL _ag_ins_sesion('14','Sesión agosto',    '2026-08-11','12:30:00');
CALL _ag_ins_sesion('14','Sesión septiembre','2026-09-08','12:30:00');
CALL _ag_ins_sesion('14','Sesión octubre',   '2026-10-13','12:30:00');
CALL _ag_ins_sesion('14','Sesión noviembre', '2026-11-10','12:30:00');
CALL _ag_ins_sesion('14','Sesión diciembre', '2026-12-08','12:30:00');

-- -- 15. Comité de Calidad
CALL _ag_ins_sesion('15','1a Sesión','2026-01-23','11:00:00');
CALL _ag_ins_sesion('15','2a Sesión','2026-04-24','11:00:00');
CALL _ag_ins_sesion('15','3a Sesión','2026-07-24','11:00:00');
CALL _ag_ins_sesion('15','4a Sesión','2026-10-23','11:00:00');
CALL _ag_ins_sesion('15','5a Sesión','2026-12-18','11:00:00');

-- -- 16. COCOA
CALL _ag_ins_sesion('16','Sesión enero',     '2026-01-09','11:00:00');
CALL _ag_ins_sesion('16','Sesión febrero',   '2026-02-13','11:00:00');
CALL _ag_ins_sesion('16','Sesión marzo',     '2026-03-13','11:00:00');
CALL _ag_ins_sesion('16','Sesión abril',     '2026-04-10','11:00:00');
CALL _ag_ins_sesion('16','Sesión mayo',      '2026-05-08','11:00:00');
CALL _ag_ins_sesion('16','Sesión junio',     '2026-06-12','11:00:00');
CALL _ag_ins_sesion('16','Sesión julio',     '2026-07-10','11:00:00');
CALL _ag_ins_sesion('16','Sesión agosto',    '2026-08-14','11:00:00');
CALL _ag_ins_sesion('16','Sesión septiembre','2026-09-11','11:00:00');
CALL _ag_ins_sesion('16','Sesión octubre',   '2026-10-09','11:00:00');
CALL _ag_ins_sesion('16','Sesión noviembre', '2026-11-13','11:00:00');
CALL _ag_ins_sesion('16','Sesión diciembre', '2026-12-11','11:00:00');

-- -- 17. CLSA
CALL _ag_ins_sesion('17','Sesión enero',     '2026-01-15','11:00:00');
CALL _ag_ins_sesion('17','Sesión febrero',   '2026-02-19','11:00:00');
CALL _ag_ins_sesion('17','Sesión marzo',     '2026-03-19','11:00:00');
CALL _ag_ins_sesion('17','Sesión abril',     '2026-04-16','11:00:00');
CALL _ag_ins_sesion('17','Sesión mayo',      '2026-05-21','11:00:00');
CALL _ag_ins_sesion('17','Sesión junio',     '2026-06-18','11:00:00');
CALL _ag_ins_sesion('17','Sesión julio',     '2026-07-16','11:00:00');
CALL _ag_ins_sesion('17','Sesión agosto',    '2026-08-20','11:00:00');
CALL _ag_ins_sesion('17','Sesión septiembre','2026-09-17','11:00:00');
CALL _ag_ins_sesion('17','Sesión octubre',   '2026-10-15','11:00:00');
CALL _ag_ins_sesion('17','Sesión noviembre', '2026-11-19','11:00:00');
CALL _ag_ins_sesion('17','Sesión diciembre', '2026-12-17','11:00:00');

-- -- 18. CIAFA
CALL _ag_ins_sesion('18','1a Sesión','2026-03-30',NULL);
CALL _ag_ins_sesion('18','2a Sesión','2026-07-27',NULL);
CALL _ag_ins_sesion('18','3a Sesión','2026-11-30',NULL);

END $$;


-- =====================================================================
-- 4. LIMPIEZA DEL PROCEDIMIENTO AUXILIAR
-- =====================================================================

DROP PROCEDURE IF EXISTS _ag_ins_sesion(TEXT, TEXT, DATE, TIME, TEXT);


-- =====================================================================
-- 5. VERIFICACIÓN
-- =====================================================================

SELECT
  c.numero,
  c.nombre,
  c.area,
  COUNT(r.id) AS sesiones_insertadas,
  MIN(r.fecha_sesion) AS primera_sesion,
  MAX(r.fecha_sesion) AS ultima_sesion
FROM public.agenda_comites c
LEFT JOIN public.agenda_reuniones r ON r.comite_id = c.id
GROUP BY c.numero, c.nombre, c.area
ORDER BY c.numero::NUMERIC;
