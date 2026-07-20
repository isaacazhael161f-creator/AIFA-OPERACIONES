-- ══════════════════════════════════════════════════════════════════════════════
-- Catálogo central de Aerolíneas — logos, colores y aliases
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- Después de ejecutar, actualiza la columna "logo" con el nombre de archivo
-- de cada aerolínea (los archivos van en la carpeta images/airlines/)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. TABLA ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalogo_aerolineas (
    id           TEXT        PRIMARY KEY,           -- slug único, e.g. 'aeromexico'
    nombre       TEXT        NOT NULL,              -- nombre canónico a mostrar
    iata         TEXT,                              -- código IATA (2 letras, o custom)
    icao         TEXT,                              -- código ICAO (3 letras)
    tipo         TEXT[]      DEFAULT '{}',          -- ['nacional','internacional','pasajeros','carga']
    logo         TEXT,                              -- nombre de archivo en images/airlines/
    logo_url     TEXT,                              -- URL completa opcional (override de logo)
    color        TEXT        DEFAULT '#6c757d',     -- color de marca (hex)
    color_texto  TEXT        DEFAULT '#ffffff',     -- color del texto sobre el fondo
    aliases      TEXT[]      DEFAULT '{}',          -- variantes de nombre para búsqueda
    activa       BOOLEAN     DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas que pueden faltar si la tabla ya existía de una versión anterior
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS iata        TEXT;
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS icao        TEXT;
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS tipo        TEXT[]      DEFAULT '{}';
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS logo        TEXT;
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS color       TEXT        DEFAULT '#6c757d';
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS color_texto TEXT        DEFAULT '#ffffff';
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS aliases     TEXT[]      DEFAULT '{}';
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS activa      BOOLEAN     DEFAULT TRUE;
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.catalogo_aerolineas ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

COMMENT ON TABLE  public.catalogo_aerolineas               IS 'Catálogo central de aerolíneas: logos, colores, aliases y metadatos.';
COMMENT ON COLUMN public.catalogo_aerolineas.logo          IS 'Nombre de archivo PNG/JPG dentro de images/airlines/. Edita este campo para agregar o cambiar el logo.';
COMMENT ON COLUMN public.catalogo_aerolineas.logo_url      IS 'URL absoluta opcional. Si está llena, tiene prioridad sobre el campo logo.';
COMMENT ON COLUMN public.catalogo_aerolineas.aliases       IS 'Arreglo de variantes de nombre (minúsculas) para que el sistema encuentre la aerolínea aunque el dato venga escrito diferente.';

-- ── 2. ÍNDICES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cat_aerolineas_iata    ON public.catalogo_aerolineas (iata);
CREATE INDEX IF NOT EXISTS idx_cat_aerolineas_activa  ON public.catalogo_aerolineas (activa);
-- Índice GIN para búsqueda eficiente en el arreglo de aliases
CREATE INDEX IF NOT EXISTS idx_cat_aerolineas_aliases ON public.catalogo_aerolineas USING GIN (aliases);

-- ── 3. TRIGGER: updated_at automático ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cat_aerolineas_updated_at ON public.catalogo_aerolineas;
CREATE TRIGGER trg_cat_aerolineas_updated_at
    BEFORE UPDATE ON public.catalogo_aerolineas
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.catalogo_aerolineas ENABLE ROW LEVEL SECURITY;

-- Lectura pública (la app la necesita sin autenticación)
DROP POLICY IF EXISTS "Lectura pública catalogo_aerolineas" ON public.catalogo_aerolineas;
CREATE POLICY "Lectura pública catalogo_aerolineas"
    ON public.catalogo_aerolineas FOR SELECT
    USING (true);

-- Solo admins pueden insertar/editar/borrar
DROP POLICY IF EXISTS "Admin edita catalogo_aerolineas" ON public.catalogo_aerolineas;
CREATE POLICY "Admin edita catalogo_aerolineas"
    ON public.catalogo_aerolineas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
              AND role IN ('admin', 'superadmin')
        )
    );

-- ── 5. FUNCIÓN DE BÚSQUEDA POR ALIAS ─────────────────────────────────────────
-- Uso desde JS: supabase.rpc('buscar_aerolinea', { p_nombre: 'aerus' })
CREATE OR REPLACE FUNCTION public.buscar_aerolinea(p_nombre TEXT)
RETURNS SETOF public.catalogo_aerolineas
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT *
    FROM   public.catalogo_aerolineas
    WHERE  activa = TRUE
      AND (
            lower(p_nombre) = ANY(aliases)
         OR lower(id)      = lower(p_nombre)
         OR lower(nombre)  = lower(p_nombre)
      )
    LIMIT 1;
$$;

-- ── 6. DATOS INICIALES ───────────────────────────────────────────────────────
-- ON CONFLICT: actualiza todo EXCEPTO el logo si ya fue personalizado
-- (para no pisar logos que el usuario haya asignado manualmente)
INSERT INTO public.catalogo_aerolineas
    (id, nombre, iata, icao, tipo, logo, color, color_texto, aliases)
VALUES

-- ── Nacionales pasajeros ──────────────────────────────────────────────────────
('aeromexico',
 'Aeroméxico', 'AM', 'AMX',
 ARRAY['nacional','pasajeros'],
 'logo_aeromexico.png', '#0b2161', '#ffffff',
 ARRAY['aeromexico','aeroméxico','aeroméxico connect','aeromexico connect','aerolitoral']),

('volaris',
 'Volaris', 'Y4', 'VOI',
 ARRAY['nacional','pasajeros'],
 'logo_volaris.png', '#a300e6', '#ffffff',
 ARRAY['volaris','vuela']),

('viva-aerobus',
 'Viva Aerobus', 'VB', 'VIV',
 ARRAY['nacional','pasajeros'],
 'logo_viva.png', '#00a850', '#ffffff',
 ARRAY['viva aerobus','vivaaerobus','viva aerobús','viva']),

('mexicana',
 'Mexicana de Aviación', 'XN', 'MXA',
 ARRAY['nacional','pasajeros'],
 'logo_mexicana.png', '#008375', '#ffffff',
 ARRAY['mexicana','mexicana de aviación','mexicana de aviacion']),

('magnicharters',
 'MagniCharters', 'UJ', 'GMT',
 ARRAY['nacional','pasajeros'],
 'logo_magnicharters.png', '#1d3c6e', '#ffffff',
 ARRAY['magnicharters','magni charters','magni']),

('aerus',
 'Aerus', 'ZV', 'RDF',
 ARRAY['nacional','pasajeros'],
 'logo_aerus.png', '#bed62f', '#000000',
 ARRAY['aerus','aeurus']),

('aeromar',
 'Aeromar', 'VW', 'TAO',
 ARRAY['nacional','pasajeros'],
 NULL, '#003087', '#ffffff',
 ARRAY['aeromar']),

('la-nueva-aerolinea',
 'La Nueva Aerolínea', 'WH', 'NWH',
 ARRAY['nacional','pasajeros'],
 'logo_la_nueva_aerolinea.png', '#cc0000', '#ffffff',
 ARRAY['la nueva aerolínea','la nueva aerolinea','nueva aerolinea']),

-- ── Internacionales pasajeros ─────────────────────────────────────────────────
('iberojet',
 'Iberojet', 'E9', 'EVE',
 ARRAY['internacional','pasajeros'],
 'logo_iberojet.png', '#cc2200', '#ffffff',
 ARRAY['iberojet','iberworld']),

('copa-airlines',
 'Copa Airlines', 'CM', 'CMP',
 ARRAY['internacional','pasajeros'],
 'logo_copa.png', '#00529b', '#ffffff',
 ARRAY['copa airlines','copa']),

('arajet',
 'Arajet', 'DM', 'DWI',
 ARRAY['internacional','pasajeros'],
 'logo_arajet.png', '#632683', '#ffffff',
 ARRAY['arajet']),

('conviasa',
 'Conviasa', 'V0', 'VCV',
 ARRAY['internacional','pasajeros'],
 'logo_conviasa.png', '#e65300', '#ffffff',
 ARRAY['conviasa']),

('american-airlines',
 'American Airlines', 'AA', 'AAL',
 ARRAY['internacional','pasajeros'],
 'logo_american-airlines.png', '#0369a0', '#ffffff',
 ARRAY['american airlines','american']),

('united-airlines',
 'United Airlines', 'UA', 'UAL',
 ARRAY['internacional','pasajeros'],
 NULL, '#1a3e6e', '#ffffff',
 ARRAY['united airlines','united']),

('delta',
 'Delta Air Lines', 'DL', 'DAL',
 ARRAY['internacional','pasajeros'],
 NULL, '#c01933', '#ffffff',
 ARRAY['delta air lines','delta']),

('spirit',
 'Spirit Airlines', 'NK', 'NKS',
 ARRAY['internacional','pasajeros'],
 NULL, '#f9e015', '#000000',
 ARRAY['spirit airlines','spirit']),

('frontier',
 'Frontier Airlines', 'F9', 'FFT',
 ARRAY['internacional','pasajeros'],
 NULL, '#007f3b', '#ffffff',
 ARRAY['frontier airlines','frontier']),

('alaska-airlines',
 'Alaska Airlines', 'AS', 'ASA',
 ARRAY['internacional','pasajeros'],
 NULL, '#0b62a4', '#ffffff',
 ARRAY['alaska airlines','alaska']),

('jetblue',
 'JetBlue', 'B6', 'JBU',
 ARRAY['internacional','pasajeros'],
 NULL, '#003876', '#ffffff',
 ARRAY['jetblue','jet blue']),

('avianca',
 'Avianca', 'AV', 'AVA',
 ARRAY['internacional','pasajeros'],
 NULL, '#c8102e', '#ffffff',
 ARRAY['avianca']),

('latam',
 'LATAM Airlines', 'LA', 'LAN',
 ARRAY['internacional','pasajeros'],
 NULL, '#e01a2b', '#ffffff',
 ARRAY['latam airlines','latam','lan']),

('iberia',
 'Iberia', 'IB', 'IBE',
 ARRAY['internacional','pasajeros'],
 NULL, '#cc0000', '#ffffff',
 ARRAY['iberia']),

('lufthansa',
 'Lufthansa', 'LH', 'DLH',
 ARRAY['internacional','pasajeros','carga'],
 'logo_lufthansa.png', '#05164d', '#ffffff',
 ARRAY['lufthansa','lufthansa cargo']),

('air-france',
 'Air France', 'AF', 'AFR',
 ARRAY['internacional','pasajeros'],
 'logo_air_france_.png', '#00266e', '#ffffff',
 ARRAY['air france']),

('klm',
 'KLM', 'KL', 'KLM',
 ARRAY['internacional','pasajeros'],
 NULL, '#00a1de', '#ffffff',
 ARRAY['klm','klm royal dutch airlines']),

('british-airways',
 'British Airways', 'BA', 'BAW',
 ARRAY['internacional','pasajeros'],
 NULL, '#075aaa', '#ffffff',
 ARRAY['british airways']),

('qatar-airways',
 'Qatar Airways', 'QR', 'QTR',
 ARRAY['internacional','pasajeros'],
 'logo_qatar_airways.png', '#5b0e2d', '#ffffff',
 ARRAY['qatar airways','qatar']),

('emirates',
 'Emirates', 'EK', 'UAE',
 ARRAY['internacional','pasajeros','carga'],
 'logo_emirates_airlines.png', '#d71920', '#ffffff',
 ARRAY['emirates','emirates airlines','emirates skycargo','ek','uae']),

('turkish-airlines',
 'Turkish Airlines', 'TK', 'THY',
 ARRAY['internacional','pasajeros','carga'],
 'logo_turkish_airlines.png', '#c8102e', '#ffffff',
 ARRAY['turkish airlines','turkish','turkish cargo','tk']),

('air-canada',
 'Air Canada', 'AC', 'ACA',
 ARRAY['internacional','pasajeros','carga'],
 'logo_air_canada_.png', '#ef3340', '#ffffff',
 ARRAY['air canada','air canada cargo']),

('air-china',
 'Air China', 'CA', 'CCA',
 ARRAY['internacional','pasajeros','carga'],
 'logo_air_china.png', '#cc0000', '#ffffff',
 ARRAY['air china']),

('china-southern',
 'China Southern Airlines', 'CZ', 'CSN',
 ARRAY['internacional','pasajeros','carga'],
 'logo_china_southern.png', '#002a5c', '#ffffff',
 ARRAY['china southern airlines','china southern','china southern cargo','china southerrn']),

('cathay-pacific',
 'Cathay Pacific', 'CX', 'CPA',
 ARRAY['internacional','pasajeros','carga'],
 'logo_cathay_pacific.png', '#006564', '#ffffff',
 ARRAY['cathay pacific','cathay pacific cargo','cathay']),

('air-transat',
 'Air Transat', 'TS', 'TSC',
 ARRAY['internacional','pasajeros'],
 NULL, '#e51937', '#ffffff',
 ARRAY['air transat','airtransat']),

('condor',
 'Condor', 'DE', 'CFG',
 ARRAY['internacional','pasajeros'],
 NULL, '#ff5500', '#ffffff',
 ARRAY['condor']),

('tui',
 'TUI Airways', 'BY', 'TOM',
 ARRAY['internacional','pasajeros'],
 NULL, '#e2001a', '#ffffff',
 ARRAY['tui','tui airways']),

('world2fly',
 'World2Fly', 'W2', 'WLF',
 ARRAY['internacional','pasajeros'],
 'logo_world_2_fly.png', '#004099', '#ffffff',
 ARRAY['world2fly','world to fly','world 2 fly']),

('finnair',
 'Finnair', 'AY', 'FIN',
 ARRAY['internacional','pasajeros'],
 NULL, '#003580', '#ffffff',
 ARRAY['finnair']),

('aerolineas-arg',
 'Aerolíneas Argentinas', 'AR', 'ARG',
 ARRAY['internacional','pasajeros'],
 NULL, '#009ddb', '#ffffff',
 ARRAY['aerolíneas argentinas','aerolineas argentinas']),

('gol',
 'GOL Linhas Aéreas', 'G3', 'GLO',
 ARRAY['internacional','pasajeros'],
 NULL, '#ff6400', '#ffffff',
 ARRAY['gol','gol linhas aéreas']),

('caribbean-airlines',
 'Caribbean Airlines', 'BW', 'BWA',
 ARRAY['internacional','pasajeros'],
 NULL, '#cc0000', '#ffffff',
 ARRAY['caribbean airlines']),

('tag-airlines',
 'TAG Airlines', 'GU', 'TAG',
 ARRAY['internacional','pasajeros'],
 NULL, '#003087', '#ffffff',
 ARRAY['transportes aéreos guatemaltecos','tag airlines','tag']),

-- ── Nacionales carga ──────────────────────────────────────────────────────────
('mas-air',
 'MAS Air', 'M7', 'MAA',
 ARRAY['nacional','carga'],
 'logo_mas_air.png', '#00a550', '#ffffff',
 ARRAY['mas air','mas cargo','mas','masair']),

('estafeta',
 'Estafeta', 'E7', 'ESF',
 ARRAY['nacional','carga'],
 'logo_estafeta.jpg', '#c41230', '#ffffff',
 ARRAY['estafeta']),

('aerounion',
 'Aerounión', 'R6', 'AEU',
 ARRAY['nacional','carga'],
 'logo_aerounión.png', '#00529b', '#ffffff',
 ARRAY['aerounión','aerounion','aero union','aero-union','aero unión']),

('tsm',
 'TSM Airlines', 'SM', 'VTM',
 ARRAY['nacional','carga'],
 'logo_tsm_airlines.png', '#000000', '#ffffff',
 ARRAY['tsm','tsm airlines','tsm airline']),

('awesome-cargo',
 'Awesome Cargo', 'A7', 'WIN',
 ARRAY['nacional','carga'],
 'logo_awesome_cargo.png', '#000000', '#ffffff',
 ARRAY['awesome cargo','awesome']),

-- ── Internacionales carga ─────────────────────────────────────────────────────
('fedex',
 'FedEx Express', 'FX', 'FDX',
 ARRAY['internacional','carga'],
 'logo_fedex_express.png', '#4d148c', '#ffffff',
 ARRAY['fedex','fedex express','federal express']),

('ups',
 'UPS Airlines', '5X', 'UPS',
 ARRAY['internacional','carga'],
 'logo_united_parcel_service.png', '#351c15', '#ffffff',
 ARRAY['ups','united parcel service','ups airlines']),

('dhl',
 'DHL Aviation', 'L3', 'JOS',
 ARRAY['internacional','carga'],
 'logo_dhl_guatemala_.png', '#d40511', '#ffffff',
 ARRAY['dhl','dhl aviation','dhl express','dhl guatemala']),

('atlas-air',
 'Atlas Air', '5Y', 'GTI',
 ARRAY['internacional','carga'],
 'logo_atlas_air.png', '#003366', '#ffffff',
 ARRAY['atlas air','atlas']),

('kalitta-air',
 'Kalitta Air', 'K4', 'CKS',
 ARRAY['internacional','carga'],
 'logo_kalitta_air.jpg', '#cf0a2c', '#ffffff',
 ARRAY['kalitta air','kalitta']),

('cargolux',
 'Cargolux', 'CV', 'CLX',
 ARRAY['internacional','carga'],
 'logo_cargolux.png', '#00a0dc', '#ffffff',
 ARRAY['cargolux']),

('cargojet',
 'Cargojet', 'W8', 'CJT',
 ARRAY['internacional','carga'],
 'logo_cargojet.png', '#000000', '#ffffff',
 ARRAY['cargojet','cargojet airways']),

('abx-air',
 'ABX Air', 'GB', 'ABX',
 ARRAY['internacional','carga'],
 'logo_ABX_Air_.png', '#003366', '#ffffff',
 ARRAY['abx air','abx']),

('national-airlines',
 'National Airlines Cargo', 'N8', 'NCR',
 ARRAY['internacional','carga'],
 'logo_national_airlines_cargo.png', '#001f3f', '#ffffff',
 ARRAY['national airlines cargo','national airlines','national']),

('ethiopian-airlines',
 'Ethiopian Airlines', 'ET', 'ETH',
 ARRAY['internacional','carga'],
 'logo_ethiopian_airlines.png', '#00913f', '#ffffff',
 ARRAY['ethiopian airlines','ethiopian cargo','ethiopian']),

('silk-way',
 'Silk Way West Airlines', '7L', 'AZQ',
 ARRAY['internacional','carga'],
 'logo_silk_way_west_airlines.png', '#0054a6', '#ffffff',
 ARRAY['silk way west airlines','silk way west','silk way','silkway']),

('ukraine-int',
 'Ukraine International Airlines', 'PS', 'AUI',
 ARRAY['internacional','carga'],
 'logo_ukraine_international_airlines.png', '#0056b8', '#ffffff',
 ARRAY['ukraine international airlines','ukraine international','ukraine']),

('sun-country',
 'Sun Country Airlines', 'SY', 'SCX',
 ARRAY['internacional','carga'],
 'logo_sun_country_airlines.png', '#f37021', '#ffffff',
 ARRAY['sun country airlines','sun country']),

('suparna',
 'Suparna Airlines', 'Y8', 'YZR',
 ARRAY['internacional','carga'],
 'logo_suparna.png', '#b22222', '#ffffff',
 ARRAY['suparna airlines','suparna']),

('ifl-group',
 'IFL Group', 'IF', 'IFL',
 ARRAY['internacional','carga'],
 'logo_ifl_group.png', '#004080', '#ffffff',
 ARRAY['ifl group','ifl']),

('omni-air',
 'Omni Air International', 'OY', 'OAE',
 ARRAY['internacional','carga'],
 'logo_omni_air.png', '#003366', '#ffffff',
 ARRAY['omni air international','omni air','omni']),

('amerijet',
 'Amerijet International', 'M6', 'AJT',
 ARRAY['internacional','carga'],
 'logo_amerijet_international.png', '#003087', '#ffffff',
 ARRAY['amerijet international','amerijet']),

('galistair',
 'Galistair Trading Limited', 'GH', 'GTR',
 ARRAY['internacional','carga'],
 'logo_galistair_trading_limited.png', '#1a1a1a', '#ffffff',
 ARRAY['galistair trading limited','galistair']),

('uniworld-cargo',
 'Uniworld Cargo', 'U7', 'UCG',
 ARRAY['internacional','carga'],
 'logo_uniworld_cargo.png', '#003366', '#ffffff',
 ARRAY['uniworld cargo','uniworld'])

ON CONFLICT (id) DO UPDATE SET
    nombre      = EXCLUDED.nombre,
    iata        = EXCLUDED.iata,
    icao        = EXCLUDED.icao,
    tipo        = EXCLUDED.tipo,
    -- Preserva el logo si ya fue asignado manualmente por el usuario
    logo        = COALESCE(catalogo_aerolineas.logo, EXCLUDED.logo),
    color       = EXCLUDED.color,
    color_texto = EXCLUDED.color_texto,
    aliases     = EXCLUDED.aliases,
    updated_at  = NOW();

-- ══════════════════════════════════════════════════════════════════════════════
-- Para agregar o actualizar el logo de una aerolínea específica:
--
--   UPDATE public.catalogo_aerolineas
--   SET    logo = 'logo_mi_archivo.png'   -- archivo en images/airlines/
--   WHERE  id   = 'aeromexico';           -- usa el slug de la columna id
--
-- Para agregar una aerolínea nueva:
--
--   INSERT INTO public.catalogo_aerolineas
--       (id, nombre, iata, icao, tipo, logo, color, color_texto, aliases)
--   VALUES
--       ('mi-aerolinea', 'Mi Aerolínea', 'XX', NULL,
--        ARRAY['nacional','carga'],
--        'logo_mi_aerolinea.png', '#003366', '#ffffff',
--        ARRAY['mi aerolínea','mi aerolinea']);
-- ══════════════════════════════════════════════════════════════════════════════
