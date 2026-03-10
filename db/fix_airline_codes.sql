-- ════════════════════════════════════════════════════════════════════════════════
-- FIX AIRLINE CODES  — actualiza IATA / ICAO incorrectos según airlines.csv
-- Tabla: public.airlines  (schema confirmado: id TEXT PK, name, iata, icao …)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ════════════════════════════════════════════════════════════════════════════════

UPDATE public.airlines SET iata = 'DM',  icao = 'DWI' WHERE id = 'arajet';
UPDATE public.airlines SET iata = 'ZV',  icao = 'RDF' WHERE id = 'aerus';
UPDATE public.airlines SET iata = 'UJ',  icao = 'GMT' WHERE id = 'magnicharters';
UPDATE public.airlines SET iata = 'WH',  icao = 'NWH' WHERE id = 'la-nueva-aerolinea';
UPDATE public.airlines SET iata = 'E9',  icao = 'EVE' WHERE id = 'iberojet';
UPDATE public.airlines SET iata = 'W2',  icao = 'WLF' WHERE id = 'world2fly';
UPDATE public.airlines SET iata = 'M7',  icao = 'MAA' WHERE id = 'mas-air';
UPDATE public.airlines SET iata = 'E7',  icao = 'ESF' WHERE id = 'estafeta';
UPDATE public.airlines SET iata = 'SM',  icao = 'VTM' WHERE id = 'tsm';
UPDATE public.airlines SET iata = 'Y8',  icao = 'YZR' WHERE id = 'suparna';
UPDATE public.airlines SET iata = 'L3',  icao = 'JOS' WHERE id = 'dhl';
UPDATE public.airlines SET iata = 'GH',  icao = 'GTR' WHERE id = 'galistair';
UPDATE public.airlines SET iata = 'A7',  icao = 'WIN' WHERE id = 'awesome-cargo';
UPDATE public.airlines SET iata = 'IF',  icao = 'IFL' WHERE id = 'ifl-group';
UPDATE public.airlines SET iata = 'U7',  icao = 'UCG' WHERE id = 'uniworld-cargo';
UPDATE public.airlines SET iata = 'XN',  icao = 'MXA' WHERE id = 'mexicana';

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT id, name, iata, icao
FROM   public.airlines
WHERE  id IN ('arajet','aerus','magnicharters','la-nueva-aerolinea',
              'iberojet','world2fly','mas-air','estafeta','tsm',
              'suparna','dhl','galistair','awesome-cargo','ifl-group',
              'uniworld-cargo','mexicana')
ORDER BY id;

UPDATE public.airlines SET iata = 'W2',  icao = 'WLF' WHERE name ILIKE '%world%fly%' OR name ILIKE '%world2fly%';
UPDATE public.airlines SET iata = 'M7',  icao = 'MAA' WHERE name ILIKE '%mas air%' OR name ILIKE '%masair%';
UPDATE public.airlines SET iata = 'E7',  icao = 'ESF' WHERE name ILIKE '%estafeta%';
UPDATE public.airlines SET iata = 'SM',  icao = 'VTM' WHERE name ILIKE '%tsm%';
UPDATE public.airlines SET iata = 'Y8',  icao = 'YZR' WHERE name ILIKE '%suparna%';
UPDATE public.airlines SET iata = 'L3',  icao = 'JOS' WHERE name ILIKE '%dhl%';
UPDATE public.airlines SET iata = 'GH',  icao = 'GTR' WHERE name ILIKE '%galistair%';
UPDATE public.airlines SET iata = 'A7',  icao = 'WIN' WHERE name ILIKE '%awesome%cargo%';
UPDATE public.airlines SET iata = 'IF',  icao = 'IFL' WHERE name ILIKE '%ifl%';
UPDATE public.airlines SET iata = 'U7',  icao = 'UCG' WHERE name ILIKE '%uniworld%';
UPDATE public.airlines SET iata = 'XN',  icao = 'MXA' WHERE name ILIKE '%mexicana%';

-- ── Verificación ─────────────────────────────────────────────────────────────
-- Ejecuta esto después para confirmar los cambios:
--
-- SELECT nombre, iata, icao
-- FROM   public.catalogo_aerolineas
-- WHERE  nombre ILIKE ANY(ARRAY['%arajet%','%aerus%','%magni%','%nueva aerol%',
--               '%iberojet%','%world%fly%','%mas air%','%estafeta%','%tsm%',
--               '%suparna%','%dhl%','%galistair%','%awesome%','%ifl%',
--               '%uniworld%','%mexicana%'])
-- ORDER BY nombre;
