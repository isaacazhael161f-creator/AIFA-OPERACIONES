-- ============================================================
-- Insertar áreas de la organización AIFA
-- Seguro: ON CONFLICT DO NOTHING → no afecta registros existentes
-- No toca asignaciones de usuarios (tabla user_areas / perfiles)
-- ============================================================

INSERT INTO "public"."areas"
  ("id", "clave", "nombre", "descripcion", "color_hex",
   "orden_visualizacion", "estado", "fecha_creacion", "fecha_actualizacion",
   "parent_area_id", "path", "nivel")
VALUES

-- ── Nivel 1: Dirección General ──────────────────────────────
('40038ae1-ccc7-4cf4-94d5-6743671390af', 'DG',  'Dirección General',              NULL, '#0EA5E9', 1,   'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-23 18:28:48.819565+00', NULL,                                   'dg',             1),

-- ── Nivel 2: Direcciones ────────────────────────────────────
('9175cd44-83c1-4967-9b8a-634b3aba4e0d', 'DO',  'Dirección de Operación',         NULL, '#10B981', 2,   'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', 'dg.do',          2),
('4738d69c-a0a1-4a43-b5a4-0d5b44056464', 'DPE', 'Dirección de Planeación Estratégica', NULL, '#06B6D4', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', 'dg.dpe',         2),
('a69432b5-4cc3-4846-b951-acab0c354171', 'DCS', 'Dirección Comercial y de Servicios', NULL, '#3B82F6', 4, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', 'dg.dcs',         2),
('e3e7dec7-4224-47ef-920d-c4e781350181', 'DA',  'Dirección de Administración',    NULL, '#F59E0B', 5,   'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', 'dg.da',          2),
('7c57ca97-5118-49ff-8d50-1a3c3a39583b', 'DJ',  'Dirección Jurídica',             NULL, '#EF4444', 6,   'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', 'dg.dj',          2),

-- ── Nivel 2: Entidades especiales bajo DG ───────────────────
('fa47f802-68fc-40a6-bdab-135f34d24337', 'SMS', 'SMS',                            NULL, '#06B6D4', 4,   'ACTIVO', '2025-10-06 22:04:54.291684+00', '2025-10-06 22:06:50.77319+00',  '40038ae1-ccc7-4cf4-94d5-6743671390af', NULL,             NULL),
('fbd9c080-1230-4ff4-90eb-f89f0c2df4d3', 'GPE', 'Gerencia de Procesos y Estadística', 'Encargada del control, análisis y mejora continua de procesos institucionales y del registro estadístico.', '#0284C7', 7, 'ACTIVO', '2025-10-31 17:38:40.107684+00', '2025-10-31 17:38:40.107684+00', '40038ae1-ccc7-4cf4-94d5-6743671390af', NULL, NULL),

-- ── Nivel 3: Subdirecciones de DO ───────────────────────────
('dd6bad19-23c8-4f25-833b-843236b73e48', 'SD-SO',  'Subdirección de Seguridad Operacional',    NULL, '#0EA5E9', 1, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '9175cd44-83c1-4967-9b8a-634b3aba4e0d', 'dg.do.sd_so',  3),
('f8242b5c-c7a6-40fb-8367-7b6f7fa821a7', 'SD-SA',  'Subdirección de Seguridad de la Aviación', NULL, '#6366F1', 2, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '9175cd44-83c1-4967-9b8a-634b3aba4e0d', 'dg.do.sd_sa',  3),
('23c45e12-1871-4b52-aa62-3e5d56933e95', 'SD-SC',  'Subdirección de Servicios Conexos',        NULL, '#14B8A6', 4, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '9175cd44-83c1-4967-9b8a-634b3aba4e0d', 'dg.do.sd_sc',  3),
('5d93972a-21cf-4fb3-8f57-61603d75648f', 'SD-ING', 'Subdirección de Ingeniería',               NULL, '#8B5CF6', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '9175cd44-83c1-4967-9b8a-634b3aba4e0d', 'dg.do.sd_ing', 3),

-- ── Nivel 3: Subdirecciones de DPE ──────────────────────────
('fed4245d-64cc-4f9c-abe1-0e6aaae0448d', 'SD-CE',   'Subdirección de Coordinación Estratégica', NULL, '#0EA5E9', 1, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '4738d69c-a0a1-4a43-b5a4-0d5b44056464', 'dg.dpe.sd_ce',   3),
('e0643676-14b5-4528-9e23-3ddc2b8b97a6', 'SD-PROY', 'Subdirección de Proyectos',               NULL, '#06B6D4', 2, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '4738d69c-a0a1-4a43-b5a4-0d5b44056464', 'dg.dpe.sd_proy', 3),
('11259b46-e7ce-483c-8160-b2db2b399794', 'SD-SCPE', 'Subdirección de Seguimiento y Control',   NULL, '#22D3EE', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '4738d69c-a0a1-4a43-b5a4-0d5b44056464', 'dg.dpe.sd_scpe', 3),

-- ── Nivel 3: Subdirecciones de DCS ──────────────────────────
('3738627c-80d0-42cf-ac81-9c5f55297e82', 'SD-CYS',  'Subdirección Comercial y de Servicios',   NULL, '#3B82F6', 1, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'a69432b5-4cc3-4846-b951-acab0c354171', 'dg.dcs.sd_cys',  3),
('001e2880-02a9-49f9-acce-c608b67a10d8', 'SD-SAYC', 'Subdirección de Servicios Aeroportuarios y Complementarios', NULL, '#60A5FA', 2, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'a69432b5-4cc3-4846-b951-acab0c354171', 'dg.dcs.sd_sayc', 3),
('8e9bcdec-cdcc-45cb-9408-5520e862e9fd', 'SD-MYC',  'Subdirección de Movilidad y Calidad',     NULL, '#93C5FD', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'a69432b5-4cc3-4846-b951-acab0c354171', 'dg.dcs.sd_myc',  3),

-- ── Nivel 3: Subdirecciones de DA ───────────────────────────
('d2ed41cb-a7ae-44fc-82dd-2d2606434ce5', 'SD-RH',   'Subdirección de Recursos Humanos',   NULL, '#F59E0B', 1, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'e3e7dec7-4224-47ef-920d-c4e781350181', 'dg.da.sd_rh',   3),
('2cba6b57-5c1c-437e-9bfc-3f29e1a49d2c', 'SD-RM',   'Subdirección de Recursos Materiales', NULL, '#D97706', 2, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'e3e7dec7-4224-47ef-920d-c4e781350181', 'dg.da.sd_rm',   3),
('2eb83aff-5ef1-4b99-8634-3f70879901c2', 'SD-RF',   'Subdirección de Recursos Financieros', NULL, '#B45309', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', 'e3e7dec7-4224-47ef-920d-c4e781350181', 'dg.da.sd_rf',   3),
('c738a491-646e-4ca2-b390-c154e07eabbd', 'SD-SIS',  'Subdirección de Sistemas',            NULL, '#A855F7', 4, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-23 18:28:37.243949+00', 'e3e7dec7-4224-47ef-920d-c4e781350181', 'dg.da.sd_sis',  3),

-- ── Nivel 3: Subdirecciones de DJ ───────────────────────────
('a071d0fa-ecae-4206-940c-99ff4f22b6a8', 'SD-CONS',  'Subdirección Consultiva',    NULL, '#EF4444', 1, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '7c57ca97-5118-49ff-8d50-1a3c3a39583b', 'dg.dj.sd_cons',  3),
('c7929870-3d3c-4d7b-8da3-41e6a5ed5351', 'SD-CONT',  'Subdirección Contenciosa',   NULL, '#DC2626', 2, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '7c57ca97-5118-49ff-8d50-1a3c3a39583b', 'dg.dj.sd_cont',  3),
('3fbb31ae-1476-493a-a17d-366db163994b', 'SD-ACORP', 'Subdirección de Asuntos Corporativos', NULL, '#F87171', 3, 'ACTIVO', '2025-09-11 16:27:24.907231+00', '2025-09-11 16:27:24.907231+00', '7c57ca97-5118-49ff-8d50-1a3c3a39583b', 'dg.dj.sd_acorp', 3),

-- ── Especial: Sin Asignar ────────────────────────────────────
('38fd1da9-6d2a-4b76-a385-fda7f974890d', 'SIN', 'Sin Asignar', 'Indicadores aún no depurados', '#9CA3AF', 999, 'ACTIVO', '2025-09-11 20:24:12.286891+00', '2025-09-11 20:24:12.286891+00', NULL, NULL, NULL)

ON CONFLICT (id) DO NOTHING;
