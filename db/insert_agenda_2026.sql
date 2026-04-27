-- =====================================================================
--  CATÁLOGO + SESIONES 2026 — AGENDA DE COMITÉS AIFA
--  Fuente: Presentación "Comités del AIFA, S.A. de C.V. Abril 2026"
--  Ejecutar en: Supabase → SQL Editor
--  Script idempotente (seguro de re-ejecutar)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. COMITÉS — CATÁLOGO (18 comités oficiales)
-- ─────────────────────────────────────────────────────────────────────

INSERT INTO public.agenda_comites
    (numero, nombre, acronimo, area, frecuencia, hora_sesion, presidente, activo)
VALUES
  ('1',
   'H. Consejo de Administración del AIFA, S.A. de C.V.',
   NULL, 'DPE',
   '4 sesiones al año; fecha determinada por la Subsecretaría de la SDN',
   NULL,
   'Gral. Div. E.M. Enrique Martínez López (Subsecretario SDN)',
   true),

  ('2',
   'Comisión Consultiva',
   NULL, 'DPE',
   '2 sesiones ordinarias y 5 mesas de trabajo al año',
   '11:00:00',
   'Isidoro Pastor Román (Dir. Gral. AIFA)',
   true),

  ('3',
   'Comité de Control Interno y Desempeño Institucional',
   'COCODI', 'DA',
   '4 sesiones ordinarias al año, al menos 15 días antes del H. Consejo',
   '11:00:00',
   'Dr. Isidoro Pastor Román (Dir. Gral. AIFA)',
   true),

  ('4',
   'Comité de Adquisiciones, Arrendamientos y Servicios',
   'CAAS', 'DA',
   '12 sesiones ordinarias (último viernes de cada mes, excepto Dic)',
   '10:00:00',
   'Mtro. Orlando de Jesús Vázquez Osalde (Dir. Administración)',
   true),

  ('5',
   'Comité de Bienes Muebles',
   'CBM', 'DA',
   '12 sesiones ordinarias al año',
   '10:00:00',
   'Lic. Orlando de Jesús Vázquez Osalde (Dir. Administración)',
   true),

  ('6',
   'Comité de Seguridad e Higiene en el Trabajo',
   'CSH', 'DA',
   '3 comités anuales',
   '10:00:00',
   'Gonzalo Sandoval González (Dir. Operación)',
   true),

  ('7',
   'Comisión Mixta de Capacitación, Adiestramiento y Productividad',
   NULL, 'DA',
   '4 sesiones ordinarias al año',
   NULL,
   'Lic. Orlando de Jesús Vázquez Osalde (Dir. Administración)',
   true),

  ('8',
   'Grupo Interdisciplinario de Archivo',
   NULL, 'DA',
   '4 sesiones ordinarias al año (pendiente de definir fechas)',
   NULL,
   NULL,
   true),

  ('9',
   'Junta de Control de Seguridad Operacional',
   'JCSO', 'GSO',
   '4 sesiones (miércoles de la 2ª semana del mes)',
   '11:00:00',
   'Isidoro Pastor Román (Dir. Gral. AIFA)',
   true),

  ('10',
   'Comité Local de Fauna Silvestre',
   NULL, 'DO',
   '4 sesiones ordinarias al año',
   NULL,
   'Responsable de Seguridad Operacional (AIFA)',
   true),

  ('11',
   'Comité de Operación y Horarios',
   'COYH', 'DO',
   '12 sesiones (2o. martes de cada mes, conforme a su reglamento)',
   '11:00:00',
   'Director General del AIFA',
   true),

  ('11.1',
   'Subcomité de Demoras',
   NULL, 'AFAC',
   'Sesiona una ocasión por mes',
   '11:00:00',
   'Comandante de Aeródromo (AFAC)',
   true),

  ('11.2',
   'Subcomité de Seguridad Operacional en Pista (Runway Safety Team)',
   'RST', 'GSO',
   'Miércoles de la 3ª semana del mes (meses seleccionados)',
   '11:00:00',
   NULL,
   true),

  ('11.3',
   'Subcomité de Obras',
   NULL, 'DO',
   'Una vez por mes conforme a las sesiones del COYH',
   '11:30:00',
   NULL,
   true),

  ('12',
   'Comité de Transparencia',
   NULL, 'UT',
   '2 sesiones por mes (2 sesiones = 24 al año)',
   '11:00:00',
   NULL,
   true),

  ('13',
   'Comité de Ética',
   NULL, 'UT',
   '4 sesiones al año según calendario',
   '11:00:00',
   NULL,
   true),

  ('14',
   'Comité Interno de Contratación, Tarifas y Crédito de los Servicios Aeroportuarios, Complementarios y Comerciales',
   'COCOSA', 'DCS',
   '12 sesiones al año (conforme a sesiones COYH)',
   '12:30:00',
   NULL,
   true),

  ('15',
   'Comité de Calidad y Mejora Continua',
   NULL, 'GC',
   '5 sesiones al año',
   '11:00:00',
   NULL,
   true),

  ('16',
   'Comisión Coordinadora de Autoridades',
   'COCOA', 'AFAC',
   'Sesiona una ocasión por mes',
   '11:00:00',
   NULL,
   true),

  ('17',
   'Comité Local de Seguridad Aeroportuaria',
   'CLSA', 'AFAC',
   'Una sesión al mes (tercer jueves de cada mes)',
   '11:00:00',
   NULL,
   true),

  ('18',
   'Comité de Innovación del AIFA, S.A. de C.V.',
   'CIAFA', 'DPE',
   '3 sesiones al año',
   NULL,
   NULL,
   true)

ON CONFLICT (numero) DO UPDATE SET
    nombre      = EXCLUDED.nombre,
    acronimo    = EXCLUDED.acronimo,
    area        = EXCLUDED.area,
    frecuencia  = EXCLUDED.frecuencia,
    hora_sesion = EXCLUDED.hora_sesion,
    presidente  = EXCLUDED.presidente,
    updated_at  = now();


-- ─────────────────────────────────────────────────────────────────────
-- 2. SESIONES 2026
--    Insertadas con ON CONFLICT DO NOTHING (idempotente)
--    Estado: Celebrada si fecha ≤ 2026-04-27; Programada en adelante
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    _today  DATE := '2026-04-27';
    _status TEXT;

    PROCEDURE ins(p_numero TEXT, p_sesion TEXT, p_fecha DATE,
                  p_hora TIME DEFAULT NULL, p_obs TEXT DEFAULT NULL)
    LANGUAGE plpgsql AS $p$
    DECLARE _cid UUID; _area TEXT; _est TEXT;
    BEGIN
        SELECT id, area INTO _cid, _area
          FROM public.agenda_comites WHERE numero = p_numero LIMIT 1;
        IF _cid IS NULL THEN RETURN; END IF;
        _est := CASE WHEN p_fecha <= '2026-04-27'::DATE THEN 'Celebrada' ELSE 'Programada' END;
        INSERT INTO public.agenda_reuniones
            (comite_id, area, numero_sesion, fecha_sesion, hora_inicio, estatus, observaciones)
        VALUES (_cid, _area, p_sesion, p_fecha,
                COALESCE(p_hora,(SELECT hora_sesion FROM public.agenda_comites WHERE id=_cid)),
                _est, p_obs)
        ON CONFLICT (comite_id, fecha_sesion) DO NOTHING;
    END;
    $p$;

BEGIN

-- ── 1. H. Consejo de Administración ──────────────────────────────
CALL ins('1','1ª Sesión Ordinaria 2026','2026-03-01',NULL,
         'Fecha específica determinada por la Subsecretaría de la SDN');
CALL ins('1','2ª Sesión Ordinaria 2026','2026-06-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');
CALL ins('1','3ª Sesión Ordinaria 2026','2026-09-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');
CALL ins('1','4ª Sesión Ordinaria 2026','2026-12-15',NULL,
         'Fecha aproximada; confirmación de la SDN pendiente');

-- ── 2. Comisión Consultiva 11:00 hs ──────────────────────────────
CALL ins('2','1ª Sesión Ordinaria',   '2026-01-22','11:00:00');
CALL ins('2','1ª Mesa de Trabajo',    '2026-02-26','11:00:00');
CALL ins('2','2ª Mesa de Trabajo',    '2026-04-30','11:00:00');
CALL ins('2','3ª Mesa de Trabajo',    '2026-07-23','11:00:00');
CALL ins('2','4ª Mesa de Trabajo',    '2026-08-27','11:00:00');
CALL ins('2','5ª Mesa de Trabajo',    '2026-10-29','11:00:00');
CALL ins('2','2ª Sesión Ordinaria',   '2026-11-26','11:00:00');

-- ── 3. COCODI 11:00 hs ───────────────────────────────────────────
CALL ins('3','1ª Sesión Ordinaria','2026-03-11','11:00:00');
CALL ins('3','2ª Sesión Ordinaria','2026-05-15','11:00:00',
         'Fecha aproximada; al menos 15 días antes del H. Consejo de Jun');
CALL ins('3','3ª Sesión Ordinaria','2026-08-15','11:00:00',
         'Fecha aproximada; al menos 15 días antes del H. Consejo de Sep');
CALL ins('3','4ª Sesión Ordinaria','2026-11-15','11:00:00',
         'Fecha aproximada; al menos 15 días antes del H. Consejo de Dic');

-- ── 4. CAAS 10:00 hs (último viernes de cada mes, excl. Dic=18 dic) ──
CALL ins('4','1ª  Sesión Ordinaria (Informe trim.)','2026-01-30','10:00:00');
CALL ins('4','2ª  Sesión Ordinaria','2026-02-27','10:00:00');
CALL ins('4','3ª  Sesión Ordinaria','2026-03-27','10:00:00');
CALL ins('4','4ª  Sesión Ordinaria (Informe trim.)','2026-04-24','10:00:00');
CALL ins('4','5ª  Sesión Ordinaria','2026-05-29','10:00:00');
CALL ins('4','6ª  Sesión Ordinaria','2026-06-26','10:00:00');
CALL ins('4','7ª  Sesión Ordinaria (Informe trim.)','2026-07-31','10:00:00');
CALL ins('4','8ª  Sesión Ordinaria','2026-08-28','10:00:00');
CALL ins('4','9ª  Sesión Ordinaria','2026-09-25','10:00:00');
CALL ins('4','10ª Sesión Ordinaria (Informe trim.)','2026-10-30','10:00:00');
CALL ins('4','11ª Sesión Ordinaria','2026-11-27','10:00:00');
CALL ins('4','12ª Sesión Ordinaria','2026-12-18','10:00:00');

-- ── 5. Comité de Bienes Muebles 10:00 hs ────────────────────────
CALL ins('5','1ª  Sesión Ordinaria (Informe trim.)','2026-01-27','10:00:00');
CALL ins('5','2ª  Sesión Ordinaria','2026-02-24','10:00:00');
CALL ins('5','3ª  Sesión Ordinaria','2026-03-31','10:00:00');
CALL ins('5','4ª  Sesión Ordinaria (Informe trim.)','2026-04-28','10:00:00');
CALL ins('5','5ª  Sesión Ordinaria','2026-05-26','10:00:00');
CALL ins('5','6ª  Sesión Ordinaria','2026-06-30','10:00:00');
CALL ins('5','7ª  Sesión Ordinaria (Informe trim.)','2026-07-28','10:00:00');
CALL ins('5','8ª  Sesión Ordinaria','2026-08-25','10:00:00');
CALL ins('5','9ª  Sesión Ordinaria','2026-09-29','10:00:00');
CALL ins('5','10ª Sesión Ordinaria (Informe trim.)','2026-10-27','10:00:00');
CALL ins('5','11ª Sesión Ordinaria','2026-11-24','10:00:00');
CALL ins('5','12ª Sesión Ordinaria','2026-12-15','10:00:00');

-- ── 6. Comité Seg. e Higiene 10:00 hs ───────────────────────────
CALL ins('6','1ª Sesión','2026-04-07','10:00:00');
CALL ins('6','2ª Sesión','2026-09-01','10:00:00',
         'Fecha pendiente de confirmar — mes: Septiembre 2026');
CALL ins('6','3ª Sesión','2026-11-01','10:00:00',
         'Fecha pendiente de confirmar — mes: Noviembre 2026');

-- ── 7. Comisión Mixta Cap./Adiest./Productividad ─────────────────
CALL ins('7','1ª Sesión','2026-05-01',NULL,
         'Fecha pendiente de confirmar — mes: Mayo 2026');
CALL ins('7','2ª Sesión','2026-08-01',NULL,
         'Fecha pendiente de confirmar — mes: Agosto 2026');
CALL ins('7','3ª Sesión','2026-10-01',NULL,
         'Fecha pendiente de confirmar — mes: Octubre 2026');
CALL ins('7','4ª Sesión','2026-12-01',NULL,
         'Fecha pendiente de confirmar — mes: Diciembre 2026');

-- ── 8. Grupo Interdisciplinario de Archivo ───────────────────────
CALL ins('8','1ª Sesión','2026-06-01',NULL,
         'Fecha pendiente de confirmar — mes: Junio 2026');
CALL ins('8','2ª Sesión','2026-11-01',NULL,
         'Fecha pendiente de confirmar — mes: Noviembre 2026');

-- ── 9. JCSO 11:00 hs (miércoles 2ª semana) ──────────────────────
CALL ins('9','1ª Sesión Ordinaria','2026-01-07','11:00:00');
CALL ins('9','2ª Sesión Ordinaria','2026-04-08','11:00:00');
CALL ins('9','3ª Sesión Ordinaria','2026-07-08','11:00:00');
CALL ins('9','4ª Sesión Ordinaria','2026-10-08','11:00:00');

-- ── 10. Comité Local de Fauna Silvestre ──────────────────────────
CALL ins('10','1ª Sesión Ordinaria','2026-03-05',NULL);
CALL ins('10','2ª Sesión Ordinaria','2026-06-04',NULL);
CALL ins('10','3ª Sesión Ordinaria','2026-09-03',NULL);
CALL ins('10','4ª Sesión Ordinaria','2026-12-03',NULL);

-- ── 11. COYH 11:00 hs (2do martes de cada mes) ──────────────────
CALL ins('11','1ª  Sesión Ordinaria','2026-01-13','11:00:00');
CALL ins('11','2ª  Sesión Ordinaria','2026-02-10','11:00:00');
CALL ins('11','3ª  Sesión Ordinaria','2026-03-10','11:00:00');
CALL ins('11','4ª  Sesión Ordinaria','2026-04-14','11:00:00');
CALL ins('11','5ª  Sesión Ordinaria','2026-05-12','11:00:00');
CALL ins('11','6ª  Sesión Ordinaria','2026-06-09','11:00:00');
CALL ins('11','7ª  Sesión Ordinaria','2026-07-14','11:00:00');
CALL ins('11','8ª  Sesión Ordinaria','2026-08-11','11:00:00');
CALL ins('11','9ª  Sesión Ordinaria','2026-09-08','11:00:00');
CALL ins('11','10ª Sesión Ordinaria','2026-10-13','11:00:00');
CALL ins('11','11ª Sesión Ordinaria','2026-11-10','11:00:00');
CALL ins('11','12ª Sesión Ordinaria','2026-12-08','11:00:00');

-- ── 11.1 Subcomité de Demoras 11:00 hs ──────────────────────────
CALL ins('11.1','Sesión enero',     '2026-01-12','11:00:00');
CALL ins('11.1','Sesión febrero',   '2026-02-09','11:00:00');
CALL ins('11.1','Sesión marzo',     '2026-03-09','11:00:00');
CALL ins('11.1','Sesión abril',     '2026-04-13','11:00:00');
CALL ins('11.1','Sesión mayo',      '2026-05-11','11:00:00');
CALL ins('11.1','Sesión junio',     '2026-06-08','11:00:00');
CALL ins('11.1','Sesión julio',     '2026-07-13','11:00:00');
CALL ins('11.1','Sesión agosto',    '2026-08-10','11:00:00');
CALL ins('11.1','Sesión septiembre','2026-09-14','11:00:00');
CALL ins('11.1','Sesión octubre',   '2026-10-12','11:00:00');
CALL ins('11.1','Sesión noviembre', '2026-11-09','11:00:00');
CALL ins('11.1','Sesión diciembre', '2026-12-14','11:00:00');

-- ── 11.2 RST 11:00 hs (miércoles 3ª semana, meses seleccionados) ─
CALL ins('11.2','1ª Sesión','2026-02-18','11:00:00');
CALL ins('11.2','2ª Sesión','2026-04-15','11:00:00');
CALL ins('11.2','3ª Sesión','2026-06-17','11:00:00');
CALL ins('11.2','4ª Sesión','2026-08-19','11:00:00');
CALL ins('11.2','5ª Sesión','2026-10-21','11:00:00');
CALL ins('11.2','6ª Sesión','2026-12-16','11:00:00');

-- ── 11.3 Subcomité de Obras 11:30 hs ────────────────────────────
CALL ins('11.3','Sesión enero',     '2026-01-12','11:30:00');
CALL ins('11.3','Sesión febrero',   '2026-02-09','11:30:00');
CALL ins('11.3','Sesión marzo',     '2026-03-09','11:30:00');
CALL ins('11.3','Sesión abril',     '2026-04-13','11:30:00');
CALL ins('11.3','Sesión mayo',      '2026-05-11','11:30:00');
CALL ins('11.3','Sesión junio',     '2026-06-08','11:30:00');
CALL ins('11.3','Sesión julio',     '2026-07-13','11:30:00');
CALL ins('11.3','Sesión agosto',    '2026-08-10','11:30:00');
CALL ins('11.3','Sesión septiembre','2026-09-07','11:30:00');
CALL ins('11.3','Sesión octubre',   '2026-10-12','11:30:00');
CALL ins('11.3','Sesión noviembre', '2026-11-09','11:30:00');
CALL ins('11.3','Sesión diciembre', '2026-12-07','11:30:00');

-- ── 12. Comité de Transparencia 11:00 hs (2 sesiones/mes) ────────
CALL ins('12','Sesión  1 ene','2026-01-08','11:00:00');
CALL ins('12','Sesión  2 ene','2026-01-22','11:00:00');
CALL ins('12','Sesión  3 feb','2026-02-12','11:00:00');
CALL ins('12','Sesión  4 feb','2026-02-26','11:00:00');
CALL ins('12','Sesión  5 mar','2026-03-12','11:00:00');
CALL ins('12','Sesión  6 mar','2026-03-26','11:00:00');
CALL ins('12','Sesión  7 abr','2026-04-09','11:00:00');
CALL ins('12','Sesión  8 abr','2026-04-23','11:00:00');
CALL ins('12','Sesión  9 may','2026-05-14','11:00:00');
CALL ins('12','Sesión 10 may','2026-05-28','11:00:00');
CALL ins('12','Sesión 11 jun','2026-06-11','11:00:00');
CALL ins('12','Sesión 12 jun','2026-06-25','11:00:00');
CALL ins('12','Sesión 13 jul','2026-07-09','11:00:00');
CALL ins('12','Sesión 14 jul','2026-07-23','11:00:00');
CALL ins('12','Sesión 15 ago','2026-08-06','11:00:00');
CALL ins('12','Sesión 16 ago','2026-08-20','11:00:00');
CALL ins('12','Sesión 17 sep','2026-09-03','11:00:00');
CALL ins('12','Sesión 18 sep','2026-09-17','11:00:00');
CALL ins('12','Sesión 19 oct','2026-10-08','11:00:00');
CALL ins('12','Sesión 20 oct','2026-10-22','11:00:00');
CALL ins('12','Sesión 21 nov','2026-11-05','11:00:00');
CALL ins('12','Sesión 22 nov','2026-11-19','11:00:00');
CALL ins('12','Sesión 23 dic','2026-12-03','11:00:00');
CALL ins('12','Sesión 24 dic','2026-12-17','11:00:00');

-- ── 13. Comité de Ética 11:00 hs ────────────────────────────────
CALL ins('13','1ª Sesión','2026-01-31','11:00:00');
CALL ins('13','2ª Sesión','2026-04-17','11:00:00');
CALL ins('13','3ª Sesión','2026-10-15','11:00:00');
CALL ins('13','4ª Sesión','2026-12-15','11:00:00');

-- ── 14. COCOSA 12:30 hs (conforme a COYH) ───────────────────────
CALL ins('14','Sesión enero',     '2026-01-13','12:30:00');
CALL ins('14','Sesión febrero',   '2026-02-10','12:30:00');
CALL ins('14','Sesión marzo',     '2026-03-10','12:30:00');
CALL ins('14','Sesión abril',     '2026-04-14','12:30:00');
CALL ins('14','Sesión mayo',      '2026-05-12','12:30:00');
CALL ins('14','Sesión junio',     '2026-06-09','12:30:00');
CALL ins('14','Sesión julio',     '2026-07-14','12:30:00');
CALL ins('14','Sesión agosto',    '2026-08-11','12:30:00');
CALL ins('14','Sesión septiembre','2026-09-08','12:30:00');
CALL ins('14','Sesión octubre',   '2026-10-13','12:30:00');
CALL ins('14','Sesión noviembre', '2026-11-10','12:30:00');
CALL ins('14','Sesión diciembre', '2026-12-08','12:30:00');

-- ── 15. Comité de Calidad 11:00 hs ──────────────────────────────
CALL ins('15','1ª Sesión','2026-01-23','11:00:00');
CALL ins('15','2ª Sesión','2026-04-24','11:00:00');
CALL ins('15','3ª Sesión','2026-07-24','11:00:00');
CALL ins('15','4ª Sesión','2026-10-23','11:00:00');
CALL ins('15','5ª Sesión','2026-12-18','11:00:00');

-- ── 16. COCOA 11:00 hs (externa - AFAC) ─────────────────────────
CALL ins('16','Sesión enero',     '2026-01-09','11:00:00');
CALL ins('16','Sesión febrero',   '2026-02-13','11:00:00');
CALL ins('16','Sesión marzo',     '2026-03-13','11:00:00');
CALL ins('16','Sesión abril',     '2026-04-10','11:00:00');
CALL ins('16','Sesión mayo',      '2026-05-08','11:00:00');
CALL ins('16','Sesión junio',     '2026-06-12','11:00:00');
CALL ins('16','Sesión julio',     '2026-07-10','11:00:00');
CALL ins('16','Sesión agosto',    '2026-08-14','11:00:00');
CALL ins('16','Sesión septiembre','2026-09-11','11:00:00');
CALL ins('16','Sesión octubre',   '2026-10-09','11:00:00');
CALL ins('16','Sesión noviembre', '2026-11-13','11:00:00');
CALL ins('16','Sesión diciembre', '2026-12-11','11:00:00');

-- ── 17. CLSA 11:00 hs (3er jueves de cada mes — AFAC) ────────────
CALL ins('17','Sesión enero',     '2026-01-15','11:00:00');
CALL ins('17','Sesión febrero',   '2026-02-19','11:00:00');
CALL ins('17','Sesión marzo',     '2026-03-19','11:00:00');
CALL ins('17','Sesión abril',     '2026-04-16','11:00:00');
CALL ins('17','Sesión mayo',      '2026-05-21','11:00:00');
CALL ins('17','Sesión junio',     '2026-06-18','11:00:00');
CALL ins('17','Sesión julio',     '2026-07-16','11:00:00');
CALL ins('17','Sesión agosto',    '2026-08-20','11:00:00');
CALL ins('17','Sesión septiembre','2026-09-17','11:00:00');
CALL ins('17','Sesión octubre',   '2026-10-15','11:00:00');
CALL ins('17','Sesión noviembre', '2026-11-19','11:00:00');
CALL ins('17','Sesión diciembre', '2026-12-17','11:00:00');

-- ── 18. CIAFA (DPE) ──────────────────────────────────────────────
CALL ins('18','1ª Sesión','2026-03-30',NULL);
CALL ins('18','2ª Sesión','2026-07-27',NULL);
CALL ins('18','3ª Sesión','2026-11-30',NULL);

END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. VERIFICACIÓN RÁPIDA
-- ─────────────────────────────────────────────────────────────────────
SELECT
    c.numero,
    c.acronimo,
    c.nombre,
    c.area,
    COUNT(r.id)                         AS sesiones_2026,
    MIN(r.fecha_sesion)                 AS primera,
    MAX(r.fecha_sesion)                 AS ultima,
    COUNT(r.id) FILTER (WHERE r.estatus = 'Celebrada')   AS celebradas,
    COUNT(r.id) FILTER (WHERE r.estatus = 'Programada')  AS programadas
FROM  public.agenda_comites c
LEFT JOIN public.agenda_reuniones r ON r.comite_id = c.id
GROUP BY c.id, c.numero, c.acronimo, c.nombre, c.area
ORDER BY c.numero;
