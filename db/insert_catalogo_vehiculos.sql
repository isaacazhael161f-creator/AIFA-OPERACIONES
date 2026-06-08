-- ============================================================
-- INSERT: Catálogo de Vehículos Terrestres de Cargo
-- Dirección de Operación — AIFA
-- Fuente: BASE DE DATOS DE VEHICULOS CAP MICHEL.xlsx (Abr. 2026)
--         + CATÁLOGO VEHS. D.O. 2025.pptx
-- 46 vehículos en total.
-- Usa ON CONFLICT para poder re-ejecutar sin duplicados.
-- ============================================================

INSERT INTO public.catalogo_vehiculos (
    codigo_aifa, tipo_vehiculo, marca, submarca, anio_modelo, color,
    numero_serie, numero_economico, placas,
    combustible, transmision, capacidad_pasajeros,
    aseguradora, poliza_numero, poliza_descripcion, vigencia_seguro,
    estado, area_responsable, notas
) VALUES

-- ── DIRECCIÓN DE OPERACIÓN ────────────────────────────────────────────────
(
    'AIFA-08', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV0N6261368', '2393303', 'NZV4423',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Dirección de Operación', NULL
),
(
    'AIFA-52', 'Camioneta', 'Ford', 'Escape Híbrida', 2022, 'Blanco',
    '1FMCU0BZ9NUA47004', NULL, '28J421',
    'Híbrido', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 26 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Dirección de Operación', NULL
),

-- ── COORDINACIÓN DE AUDITORÍA ─────────────────────────────────────────────
(
    'AIFA-20', 'Autobús', 'Volkswagen', NULL, 2019, NULL,
    '3MN2G82W7KD900459', NULL, 'LF99955',
    'Diesel', 'Estándar', NULL,
    'Qualitas', '7470045701', 'Póliza No. 7470045701, Qualitas.', '2027-03-10',
    'Activo', 'Coordinación de Auditoría', NULL
),
(
    'AIFA-24', 'Autobús', 'Volkswagen', NULL, 2019, NULL,
    '9532G82W6KR911075', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Qualitas', '7470045695', 'Póliza No. 7470045695, Qualitas.', '2027-03-10',
    'Activo', 'Coordinación de Auditoría',
    'Vehículo proporcionado con carácter devolutivo al Btn. Seg. Ext. de la G.N.'
),
(
    'AIFA-25', 'Autobús', 'Volkswagen', NULL, 2019, NULL,
    '9532G82WXKR911368', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Qualitas', '7470045696', 'Póliza No. 7470045696, Qualitas.', '2027-03-10',
    'Activo', 'Coordinación de Auditoría', NULL
),
(
    'AIFA-26', 'Autobús', 'Volkswagen', NULL, 2019, NULL,
    '9532G82WXKR911581', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Qualitas', '7470045698', 'Póliza No. 7470045698, Qualitas.', '2027-03-10',
    'Activo', 'Coordinación de Auditoría', NULL
),
(
    'AIFA-32', 'Camión', 'International', 'con elevador Versalift', 2022, NULL,
    '3HAEUMMR2LL660540', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurada como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Coordinación de Auditoría',
    'Elevador Versalift. 2 canastillas. Extensión del brazo: 15 mts.'
),
(
    'AIFA-33', 'Camión', 'Ford', 'F-550 con elevador Versalift', 2022, NULL,
    '1FDUF5GN7NED00946', NULL, NULL,
    'Gasolina', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurada como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Coordinación de Auditoría',
    'Elevador Versalift. 1 canastilla. Extensión del brazo: 14 mts.'
),
(
    'AIFA-34', 'Camión', 'Ford', 'F-550 con elevador Versalift', 2022, NULL,
    '1FDUF5GN8NED00955', NULL, NULL,
    'Gasolina', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurada como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Coordinación de Auditoría',
    'Elevador Versalift. 1 canastilla. Extensión del brazo: 15 mts.'
),
(
    'AIFA-38', 'Camioneta Van', 'Volkswagen', 'Crafter', 2022, NULL,
    'WV1GRNSY2N9028329', NULL, 'LG-06-180',
    'Diesel', 'Estándar', 16,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Coordinación de Auditoría',
    'Camioneta de pasajeros. Capacidad: 16 personas.'
),

-- ── VEHÍCULO DE ARCHIVO D.O. ─────────────────────────────────────────────
(
    'AIFA-16', 'Camioneta Van', 'Ford', 'Transit', 2022, NULL,
    'WF0RS5HP0NTB14876', NULL, 'NZV4462',
    'Diesel', 'Estándar', NULL,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Archivo — Dirección de Operación', NULL
),

-- ── SUBDIRECCIÓN DE SEGURIDAD OPERACIONAL ────────────────────────────────
(
    'AIFA-02', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV6N6261424', NULL, 'NZV4407',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Seguridad Operacional', NULL
),
(
    'AIFA-03', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV4N6261423', NULL, 'NZV4379',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Seguridad Operacional', NULL
),
(
    'AIFA-15', 'Camioneta Van', 'Ford', 'Transit', 2022, NULL,
    'WF0RS5HP9NTB14875', NULL, 'NZV4413',
    'Diesel', 'Estándar', NULL,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Seguridad Operacional', NULL
),
(
    'AIFA-27', 'Camión', 'International', 'con barredora aeroportuaria', 2021, NULL,
    '3HAEUMMR1PL652838', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional', 'Con barredora aeroportuaria.'
),
(
    'AIFA-28', 'Camión', 'International', 'con barredora aeroportuaria', 2021, NULL,
    '3HAEUMMR3PL652839', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional', 'Con barredora aeroportuaria.'
),
(
    'AIFA-29', 'Camión', 'International', 'con barredora aeroportuaria', 2021, NULL,
    '3HAEUMMR1PL652791', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional', 'Con barredora aeroportuaria.'
),
(
    'AIFA-30', 'Camión', 'International', 'con barredora aeroportuaria', 2021, NULL,
    '3HAEUMMRXPL652837', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional', 'Con barredora aeroportuaria.'
),
(
    'AIFA-31', 'Camión', 'International', 'con barredora aeroportuaria', 2021, NULL,
    '3HAEUMMR3PL652792', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional', 'Con barredora aeroportuaria.'
),
(
    'AIFA-57', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700812', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AIFA-58', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700811', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AIFA-59', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700810', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AIFA-60', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700806', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AIFA-61', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700807', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AIFA-62', 'Autobús', 'COBUS', NULL, 2022, NULL,
    'WEB698541 1A700813', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario para transporte de pasajeros COBUS.'
),
(
    'AB-01', 'Autobús', 'Master Road', NULL, 2008, NULL,
    '3M9GL4CA28A041016', NULL, '5789CH',
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Subdirección de Seguridad Operacional',
    'Camión aeroportuario de pasajeros.'
),

-- ── SUBDIRECCIÓN DE SEGURIDAD DE LA AVIACIÓN ─────────────────────────────
(
    'AIFA-04', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV2N6261422', NULL, 'NZV4480',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Seguridad de la Aviación', NULL
),
(
    'AIFA-05', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV0N6261421', NULL, 'NZV4472',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Seguridad de la Aviación', NULL
),

-- ── SUBDIRECCIÓN DE SERVICIOS CONEXOS ────────────────────────────────────
(
    'AIFA-01', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV8N6261425', NULL, 'NZV4425',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Servicios Conexos', NULL
),
(
    'AIFA-10', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV5N6261365', '2393301', 'NZV4378',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Servicios Conexos', NULL
),
(
    'AIFA-39', 'Camioneta Van', 'Volkswagen', 'Crafter', 2022, NULL,
    'WV1GRNSY6N9028107', NULL, 'LG06182',
    'Diesel', 'Estándar', NULL,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Servicios Conexos', NULL
),

-- ── SUBDIRECCIÓN DE INGENIERÍA ────────────────────────────────────────────
(
    'AIFA-06', 'Camioneta', 'Ford', 'Ranger', 2022, 'Blanco',
    '8AF6R5DV9N6261370', '2393305', 'NZV4434',
    'Diesel', 'Automática', 5,
    'GNP', NULL, 'Carta cobertura de 20 Ene. 2026, Seguros GNP.', '2026-12-31',
    'Activo', 'Subdirección de Ingeniería', NULL
),

-- ── SERVICIO DE EXTINCIÓN DE INCENDIOS (SEI / BOMBEROS) ──────────────────
-- Camiones 6x6 Oshkosh Global Striker (ARFF)
(
    'SEI-01', 'Camión', 'Oshkosh', 'Global Striker 6x6', 2022, NULL,
    '10TADLJF7NA815287', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión 6x6 contra incendios para aeronaves (ARFF).'
),
(
    'SEI-02', 'Camión', 'Oshkosh', 'Global Striker 6x6', 2022, NULL,
    '10TADLJF9NA815288', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión 6x6 contra incendios para aeronaves (ARFF).'
),
(
    'SEI-03', 'Camión', 'Oshkosh', 'Global Striker 6x6', 2022, NULL,
    '10TADLJF0NA815289', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión 6x6 contra incendios para aeronaves (ARFF).'
),
(
    'SEI-04', 'Camión', 'Oshkosh', 'Global Striker 6x6', 2022, NULL,
    '10TADLJF8NA815315', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión 6x6 contra incendios para aeronaves (ARFF).'
),
(
    'SEI-05', 'Camión', 'Oshkosh', 'Global Striker 6x6', 2022, NULL,
    '10TADLJFXNA815316', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión 6x6 contra incendios para aeronaves (ARFF).'
),

-- Camionetas Dodge RAM de ataque rápido / rescate
(
    'SEI-06', 'Camioneta', 'Dodge', 'RAM 4000', 2022, NULL,
    '3HAEVTAR7NL200952', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Vehículo de ataque rápido.'
),
(
    'SEI-07', 'Camioneta', 'Dodge', 'RAM 4000', 2022, NULL,
    '3C7WRBLJ7NG225702', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Vehículo de rescate.'
),

-- Camión cisterna International
(
    'SEI-08', 'Camión', 'International', 'Cisterna', 2022, NULL,
    '3C7WRBLJ4NG194568', NULL, NULL,
    'Diesel', 'Estándar', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión cisterna para extinción de incendios.'
),

-- Camiones RAM de ataque rápido Dodge
(
    'SEI-09', 'Camioneta', 'Dodge', 'RAM', 2022, NULL,
    '3C7WRBLJ4NG234261', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión de ataque rápido.'
),
(
    'SEI-10', 'Camioneta', 'Dodge', 'RAM', 2022, NULL,
    '3C7WRBLJ6NG194569', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión de ataque rápido.'
),
(
    'SEI-11', 'Camioneta', 'Dodge', 'RAM', 2022, NULL,
    '3C7WRBLJ0NG225668', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Camión de ataque rápido.'
),

-- Ambulancias Ford Transit
(
    'AIFA-E01', 'Ambulancia', 'Ford', 'Transit', 2022, 'Blanco',
    '1FTBR1C88MKA83600', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Ambulancia de Urgencias Básicas.'
),
(
    'AIFA-E02', 'Ambulancia', 'Ford', 'Transit', 2022, 'Blanco',
    '1FTBR1C82MKA83561', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)',
    'Ambulancia de Terapia Intensiva.'
),

-- Montacargas
(
    'SEI-12', 'Montacargas', 'Multilift', NULL, 2021, NULL,
    '250502K9203', NULL, NULL,
    'Diesel', 'Automática', NULL,
    'Aeropuerto', NULL, 'Asegurado como parte del Aeropuerto, renovable anualmente.', NULL,
    'Activo', 'Servicio de Extinción de Incendios (SEI)', NULL
)

ON CONFLICT (codigo_aifa) DO UPDATE SET
    tipo_vehiculo       = EXCLUDED.tipo_vehiculo,
    marca               = EXCLUDED.marca,
    submarca            = EXCLUDED.submarca,
    anio_modelo         = EXCLUDED.anio_modelo,
    color               = EXCLUDED.color,
    numero_serie        = EXCLUDED.numero_serie,
    numero_economico    = EXCLUDED.numero_economico,
    placas              = EXCLUDED.placas,
    combustible         = EXCLUDED.combustible,
    transmision         = EXCLUDED.transmision,
    capacidad_pasajeros = EXCLUDED.capacidad_pasajeros,
    aseguradora         = EXCLUDED.aseguradora,
    poliza_numero       = EXCLUDED.poliza_numero,
    poliza_descripcion  = EXCLUDED.poliza_descripcion,
    vigencia_seguro     = EXCLUDED.vigencia_seguro,
    estado              = EXCLUDED.estado,
    area_responsable    = EXCLUDED.area_responsable,
    notas               = EXCLUDED.notas,
    updated_at          = NOW();

-- ── Verificar resultado ──────────────────────────────────────
SELECT
    codigo_aifa,
    tipo_vehiculo,
    marca || ' ' || COALESCE(submarca,'') AS vehiculo,
    anio_modelo,
    placas,
    combustible,
    COALESCE(vigencia_seguro::text, 'Anual') AS poliza_vigencia,
    estado,
    area_responsable
FROM public.catalogo_vehiculos
ORDER BY codigo_aifa;
