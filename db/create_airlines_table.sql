-- ═══════════════════════════════════════════════════════════════════════
--  BASE DE DATOS DE AEROLÍNEAS  ·  AIFA-OPERACIONES
--  Ejecuta este script en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. TABLA PRINCIPAL ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.airlines (
  id            TEXT PRIMARY KEY,               -- slug único: "aeromexico"
  name          TEXT NOT NULL,                  -- Nombre oficial: "Aeroméxico"
  iata          TEXT,                           -- Código IATA: "AM"
  icao          TEXT,                           -- Código ICAO: "AMX"
  logo_url      TEXT,                           -- URL pública del logo en Storage
  logo_filename TEXT,                           -- Nombre del archivo en bucket
  color         TEXT DEFAULT '#0d6efd',         -- Color principal (hex)
  text_color    TEXT DEFAULT '#ffffff',          -- Color de texto sobre el color
  types         TEXT[] DEFAULT '{}',            -- {nacional, internacional, carga, pasajeros}
  aliases       TEXT[] DEFAULT '{}',            -- Nombres alternativos para matching
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS airlines_iata_idx  ON public.airlines(iata);
CREATE INDEX IF NOT EXISTS airlines_name_idx  ON public.airlines USING gin (to_tsvector('simple', name));

-- ── 2. ROW LEVEL SECURITY ───────────────────────────────────────────────
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer
CREATE POLICY "airlines_public_read"
  ON public.airlines FOR SELECT
  USING (true);

-- Solo autenticados pueden insertar/actualizar/eliminar
CREATE POLICY "airlines_auth_insert"
  ON public.airlines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "airlines_auth_update"
  ON public.airlines FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "airlines_auth_delete"
  ON public.airlines FOR DELETE
  TO authenticated
  USING (true);

-- ── 3. TRIGGER: updated_at automático ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS airlines_updated_at ON public.airlines;
CREATE TRIGGER airlines_updated_at
  BEFORE UPDATE ON public.airlines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. STORAGE: bucket "airline-logos" ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'airline-logos',
  'airline-logos',
  true,                        -- acceso público (URLs directas sin token)
  2097152,                     -- 2 MB máximo por archivo
  ARRAY['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Políticas Storage
CREATE POLICY "airline_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'airline-logos');

CREATE POLICY "airline_logos_auth_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'airline-logos');

CREATE POLICY "airline_logos_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'airline-logos');

CREATE POLICY "airline_logos_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'airline-logos');

-- ── 5. DATOS INICIALES ──────────────────────────────────────────────────
INSERT INTO public.airlines (id, name, iata, icao, logo_filename, color, text_color, types, aliases) VALUES
  ('aeromexico','Aeroméxico','AM','AMX','logo_aeromexico.png','#0b2161','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['aeromexico','aeroméxico','aeromexico connect','aeroméxico connect','aerolitoral']),
  ('volaris','Volaris','Y4','VOI','logo_volaris.png','#a300e6','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['volaris','vuela']),
  ('viva-aerobus','Viva Aerobus','VB','VIV','logo_viva.png','#00a850','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['viva aerobus','vivaaerobus','viva aerobús','viva']),
  ('mexicana','Mexicana de Aviación','MX','MXA','logo_mexicana.png','#008375','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['mexicana','mexicana de aviación','mexicana de aviacion']),
  ('magnicharters','MagniCharters','GM','MAG','logo_magnicharters.png','#1d3c6e','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['magnicharters','magni charters','magni']),
  ('aerus','Aerus','5H',NULL,'logo_aerus.png','#bed62f','#000000',ARRAY['nacional','pasajeros'],ARRAY['aerus']),
  ('aeromar','Aeromar','VW','TAO',NULL,'#003087','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['aeromar']),
  ('la-nueva-aerolinea','La Nueva Aerolínea',NULL,NULL,'logo_la_nueva_aerolinea.png','#cc0000','#ffffff',ARRAY['nacional','pasajeros'],ARRAY['la nueva aerolínea','la nueva aerolinea','nueva aerolinea']),
  ('iberojet','Iberojet','E9','WEB','logo_iberojet.png','#cc2200','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['iberojet','iberworld']),
  ('copa-airlines','Copa Airlines','CM','CMP','logo_copa.png','#00529b','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['copa airlines','copa']),
  ('arajet','Arajet','DM','ARJ','logo_arajet.png','#632683','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['arajet']),
  ('conviasa','Conviasa','V0','VCV','logo_conviasa.png','#e65300','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['conviasa']),
  ('american-airlines','American Airlines','AA','AAL','logo_american-airlines.png','#0369a0','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['american airlines','american']),
  ('united-airlines','United Airlines','UA','UAL',NULL,'#1a3e6e','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['united airlines','united']),
  ('delta','Delta Air Lines','DL','DAL',NULL,'#c01933','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['delta air lines','delta']),
  ('spirit','Spirit Airlines','NK','NKS',NULL,'#f9e015','#000000',ARRAY['internacional','pasajeros'],ARRAY['spirit airlines','spirit']),
  ('frontier','Frontier Airlines','F9','FFT',NULL,'#007f3b','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['frontier airlines','frontier']),
  ('alaska-airlines','Alaska Airlines','AS','ASA',NULL,'#0b62a4','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['alaska airlines','alaska']),
  ('jetblue','JetBlue','B6','JBU',NULL,'#003876','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['jetblue','jet blue']),
  ('avianca','Avianca','AV','AVA',NULL,'#c8102e','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['avianca']),
  ('latam','LATAM Airlines','LA','LAN',NULL,'#e01a2b','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['latam airlines','latam','lan']),
  ('iberia','Iberia','IB','IBE',NULL,'#cc0000','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['iberia']),
  ('lufthansa','Lufthansa','LH','DLH','logo_lufthansa.png','#05164d','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['lufthansa']),
  ('air-france','Air France','AF','AFR','logo_air_france_.png','#00266e','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['air france']),
  ('klm','KLM','KL','KLM',NULL,'#00a1de','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['klm','klm royal dutch airlines']),
  ('british-airways','British Airways','BA','BAW',NULL,'#075aaa','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['british airways']),
  ('qatar-airways','Qatar Airways','QR','QTR','logo_qatar_airways.png','#5b0e2d','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['qatar airways','qatar']),
  ('emirates','Emirates','EK','UAE','logo_emirates_airlines.png','#d71920','#ffffff',ARRAY['internacional','pasajeros','carga'],ARRAY['emirates','emirates airlines','emirates skycargo','ek','uae']),
  ('turkish-airlines','Turkish Airlines','TK','THY','logo_turkish_airlines.png','#c8102e','#ffffff',ARRAY['internacional','pasajeros','carga'],ARRAY['turkish airlines','turkish','tk']),
  ('air-canada','Air Canada','AC','ACA','logo_air_canada_.png','#ef3340','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['air canada']),
  ('air-china','Air China','CA','CCA','logo_air_china.png','#cc0000','#ffffff',ARRAY['internacional','pasajeros','carga'],ARRAY['air china']),
  ('china-southern','China Southern Airlines','CZ','CSN','logo_china_southern.png','#002a5c','#ffffff',ARRAY['internacional','pasajeros','carga'],ARRAY['china southern airlines','china southern','china southern cargo']),
  ('cathay-pacific','Cathay Pacific','CX','CPA','logo_cathay_pacific.png','#006564','#ffffff',ARRAY['internacional','pasajeros','carga'],ARRAY['cathay pacific','cathay pacific cargo','cathay']),
  ('air-transat','Air Transat','TS','TSC',NULL,'#e51937','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['air transat','airtransat']),
  ('condor','Condor','DE','CFG',NULL,'#ff5500','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['condor']),
  ('tui','TUI Airways','BY','TOM',NULL,'#e2001a','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['tui','tui airways']),
  ('world2fly','World2Fly','2W','WDF','logo_world_2_fly.png','#004099','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['world2fly','world to fly','world 2 fly']),
  ('finnair','Finnair','AY','FIN',NULL,'#003580','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['finnair']),
  ('aerolineas-argentinas','Aerolíneas Argentinas','AR','ARG',NULL,'#009ddb','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['aerolíneas argentinas','aerolineas argentinas']),
  ('gol','GOL Linhas Aéreas','G3','GLO',NULL,'#ff6400','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['gol','gol linhas aéreas']),
  ('caribbean-airlines','Caribbean Airlines','BW','BWA',NULL,'#cc0000','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['caribbean airlines']),
  ('tag-airlines','TAG Airlines','GU','TAG',NULL,'#003087','#ffffff',ARRAY['internacional','pasajeros'],ARRAY['transportes aéreos guatemaltecos','tag airlines','tag']),
  ('mas-air','MAS Air','MY','MAA','logo_mas_air.png','#00a550','#ffffff',ARRAY['nacional','carga'],ARRAY['mas air','mas cargo','mas']),
  ('estafeta','Estafeta','EST','ESF','logo_estafeta.jpg','#c41230','#ffffff',ARRAY['nacional','carga'],ARRAY['estafeta']),
  ('fedex','FedEx Express','FX','FDX','logo_fedex_express.png','#4d148c','#ffffff',ARRAY['internacional','carga'],ARRAY['fedex','fedex express','federal express']),
  ('ups','UPS Airlines','5X','UPS','logo_united_parcel_service.png','#351c15','#ffffff',ARRAY['internacional','carga'],ARRAY['ups','united parcel service','ups airlines']),
  ('dhl','DHL Aviation','DHK','DHK','logo_dhl_guatemala_.png','#d40511','#ffffff',ARRAY['internacional','carga'],ARRAY['dhl','dhl aviation','dhl express','dhl guatemala']),
  ('aerounion','Aerounión','R6','AEU','logo_aerounión.png','#00529b','#ffffff',ARRAY['nacional','carga'],ARRAY['aerounión','aerounion','aero union','aero-union']),
  ('atlas-air','Atlas Air','5Y','GTI','logo_atlas_air.png','#003366','#ffffff',ARRAY['internacional','carga'],ARRAY['atlas air','atlas']),
  ('kalitta-air','Kalitta Air','K4','CKS','logo_kalitta_air.jpg','#cf0a2c','#ffffff',ARRAY['internacional','carga'],ARRAY['kalitta air','kalitta']),
  ('cargolux','Cargolux','CV','CLX','logo_cargolux.png','#00a0dc','#ffffff',ARRAY['internacional','carga'],ARRAY['cargolux']),
  ('cargojet','Cargojet','W8','CJT','logo_cargojet.png','#000000','#ffffff',ARRAY['internacional','carga'],ARRAY['cargojet','cargojet airways']),
  ('abx-air','ABX Air','GB','ABX','logo_ABX_Air_.png','#003366','#ffffff',ARRAY['internacional','carga'],ARRAY['abx air','abx']),
  ('national-airlines','National Airlines Cargo','N8','NCR','logo_national_airlines_cargo.png','#001f3f','#ffffff',ARRAY['internacional','carga'],ARRAY['national airlines cargo','national airlines','national']),
  ('tsm','TSM Airlines','TSM',NULL,'logo_tsm_airlines.png','#000000','#ffffff',ARRAY['nacional','carga'],ARRAY['tsm','tsm airlines']),
  ('ethiopian-airlines','Ethiopian Airlines','ET','ETH','logo_ethiopian_airlines.png','#00913f','#ffffff',ARRAY['internacional','carga'],ARRAY['ethiopian airlines','ethiopian cargo','ethiopian']),
  ('silk-way','Silk Way West Airlines','7L','AZQ','logo_silk_way_west_airlines.png','#0054a6','#ffffff',ARRAY['internacional','carga'],ARRAY['silk way west airlines','silk way']),
  ('ukraine-international','Ukraine International Airlines','PS','AUI','logo_ukraine_international_airlines.png','#0056b8','#ffffff',ARRAY['internacional','carga'],ARRAY['ukraine international airlines','ukraine international','ukraine']),
  ('sun-country','Sun Country Airlines','SY','SCX','logo_sun_country_airlines.png','#f37021','#ffffff',ARRAY['internacional','carga'],ARRAY['sun country airlines','sun country']),
  ('suparna','Suparna Airlines','Y8','GDC','logo_suparna.png','#b22222','#ffffff',ARRAY['internacional','carga'],ARRAY['suparna airlines','suparna']),
  ('ifl-group','IFL Group',NULL,NULL,'logo_ifl_group.png','#004080','#ffffff',ARRAY['internacional','carga'],ARRAY['ifl group','ifl']),
  ('omni-air','Omni Air International','OY','OAE','logo_omni_air.png','#003366','#ffffff',ARRAY['internacional','carga'],ARRAY['omni air international','omni air','omni']),
  ('amerijet','Amerijet International','M6','AJT','logo_amerijet_international.png','#003087','#ffffff',ARRAY['internacional','carga'],ARRAY['amerijet international','amerijet']),
  ('galistair','Galistair Trading Limited',NULL,NULL,'logo_galistair_trading_limited.png','#1a1a1a','#ffffff',ARRAY['internacional','carga'],ARRAY['galistair trading limited','galistair']),
  ('awesome-cargo','Awesome Cargo',NULL,NULL,'logo_awesome_cargo.png','#000000','#ffffff',ARRAY['nacional','carga'],ARRAY['awesome cargo','awesome']),
  ('uniworld-cargo','Uniworld Cargo',NULL,NULL,'logo_uniworld_cargo.png','#003366','#ffffff',ARRAY['internacional','carga'],ARRAY['uniworld cargo','uniworld'])
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  iata          = EXCLUDED.iata,
  icao          = EXCLUDED.icao,
  logo_filename = EXCLUDED.logo_filename,
  color         = EXCLUDED.color,
  text_color    = EXCLUDED.text_color,
  types         = EXCLUDED.types,
  aliases       = EXCLUDED.aliases;
