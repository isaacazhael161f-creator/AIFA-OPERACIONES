-- ============================================================
-- Agregar coordenadas a aeropuertos + auto-asignación route_id
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. COLUMNAS lat/lng EN aeropuertos ──────────────────────────────────
ALTER TABLE public.aeropuertos
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- ── 2. COORDENADAS (todas las IATAs conocidas del sistema) ───────────────
UPDATE public.aeropuertos SET lat =  16.7571, lng =  -99.7534 WHERE iata = 'ACA';
UPDATE public.aeropuertos SET lat =  20.9935, lng = -101.4809 WHERE iata = 'BJX';
UPDATE public.aeropuertos SET lat =  27.3926, lng = -109.8330 WHERE iata = 'CEN';
UPDATE public.aeropuertos SET lat =  31.6361, lng = -106.4280 WHERE iata = 'CJS';
UPDATE public.aeropuertos SET lat =  19.2770, lng = -103.5770 WHERE iata = 'CLQ';
UPDATE public.aeropuertos SET lat =  19.8168, lng =  -90.5003 WHERE iata = 'CPE';
UPDATE public.aeropuertos SET lat =  18.5047, lng =  -88.3268 WHERE iata = 'CTM';
UPDATE public.aeropuertos SET lat =  24.7650, lng = -107.4747 WHERE iata = 'CUL';
UPDATE public.aeropuertos SET lat =  21.0365, lng =  -86.8769 WHERE iata = 'CUN';
UPDATE public.aeropuertos SET lat =  28.7029, lng = -105.9646 WHERE iata = 'CUU';
UPDATE public.aeropuertos SET lat =  23.7033, lng =  -98.9565 WHERE iata = 'CVM';
UPDATE public.aeropuertos SET lat =  24.1242, lng = -104.5280 WHERE iata = 'DGO';
UPDATE public.aeropuertos SET lat =  20.5218, lng = -103.3103 WHERE iata = 'GDL';
UPDATE public.aeropuertos SET lat =  29.0959, lng = -111.0480 WHERE iata = 'HMO';
UPDATE public.aeropuertos SET lat =  15.7753, lng =  -96.2626 WHERE iata = 'HUX';
UPDATE public.aeropuertos SET lat =  16.4493, lng =  -95.0937 WHERE iata = 'IZT';
UPDATE public.aeropuertos SET lat =  24.0731, lng = -110.3610 WHERE iata = 'LAP';
UPDATE public.aeropuertos SET lat =  25.7699, lng =  -97.5253 WHERE iata = 'MAM';
UPDATE public.aeropuertos SET lat =  20.9348, lng =  -89.6636 WHERE iata = 'MID';
UPDATE public.aeropuertos SET lat =  25.7785, lng = -100.1070 WHERE iata = 'MTY';
UPDATE public.aeropuertos SET lat =  23.1614, lng = -106.2660 WHERE iata = 'MZT';
UPDATE public.aeropuertos SET lat =  27.4439, lng =  -99.5705 WHERE iata = 'NLD';
UPDATE public.aeropuertos SET lat =  16.9990, lng =  -96.7266 WHERE iata = 'OAX';
UPDATE public.aeropuertos SET lat =  17.5332, lng =  -92.0155 WHERE iata = 'PQM';
UPDATE public.aeropuertos SET lat =  20.6801, lng = -105.2542 WHERE iata = 'PVR';
UPDATE public.aeropuertos SET lat =  15.8769, lng =  -97.0891 WHERE iata = 'PXM';
UPDATE public.aeropuertos SET lat =  26.0089, lng =  -98.2285 WHERE iata = 'REX';
UPDATE public.aeropuertos SET lat =  23.1517, lng = -109.7210 WHERE iata = 'SJD';
UPDATE public.aeropuertos SET lat =  22.2543, lng = -100.9305 WHERE iata = 'SLP';
UPDATE public.aeropuertos SET lat =  25.5495, lng = -100.9280 WHERE iata = 'SLW';
UPDATE public.aeropuertos SET lat =  22.2964, lng =  -97.8659 WHERE iata = 'TAM';
UPDATE public.aeropuertos SET lat =  16.5618, lng =  -93.0216 WHERE iata = 'TGZ';
UPDATE public.aeropuertos SET lat =  32.5411, lng = -116.9719 WHERE iata = 'TIJ';
UPDATE public.aeropuertos SET lat =  21.4195, lng = -104.8420 WHERE iata = 'TPQ';
UPDATE public.aeropuertos SET lat =  20.6173, lng =  -87.0822 WHERE iata = 'TQO';
UPDATE public.aeropuertos SET lat =  19.1450, lng =  -96.1873 WHERE iata = 'VER';
UPDATE public.aeropuertos SET lat =  17.9960, lng =  -92.8174 WHERE iata = 'VSA';
UPDATE public.aeropuertos SET lat =  17.6016, lng = -101.4605 WHERE iata = 'ZIH';
-- Nacionales adicionales (cargo)
UPDATE public.aeropuertos SET lat =  19.7456, lng =  -99.0086 WHERE iata = 'NLU';
UPDATE public.aeropuertos SET lat =  19.4363, lng =  -99.0721 WHERE iata = 'MEX';
UPDATE public.aeropuertos SET lat =  19.3373, lng =  -99.5663 WHERE iata = 'TLC';
UPDATE public.aeropuertos SET lat =  20.6172, lng = -100.3660 WHERE iata = 'QRO';
UPDATE public.aeropuertos SET lat =  25.5700, lng = -103.4100 WHERE iata = 'TRC';
UPDATE public.aeropuertos SET lat =  21.7050, lng = -102.3180 WHERE iata = 'AGU';
UPDATE public.aeropuertos SET lat =  18.6540, lng =  -91.8000 WHERE iata = 'CME';
UPDATE public.aeropuertos SET lat =  14.7940, lng =  -92.3700 WHERE iata = 'TAP';
UPDATE public.aeropuertos SET lat =  22.8970, lng = -102.6860 WHERE iata = 'ZCL';
UPDATE public.aeropuertos SET lat =  19.8490, lng = -101.0250 WHERE iata = 'MLM';
UPDATE public.aeropuertos SET lat =  19.1580, lng =  -98.3710 WHERE iata = 'PBC';
UPDATE public.aeropuertos SET lat =  20.5110, lng =  -86.9260 WHERE iata = 'CZM';
UPDATE public.aeropuertos SET lat =  25.6850, lng = -109.0470 WHERE iata = 'LMM';
UPDATE public.aeropuertos SET lat =  26.0090, lng = -111.3480 WHERE iata = 'LTO';
UPDATE public.aeropuertos SET lat =  32.6300, lng = -115.2410 WHERE iata = 'MXL';
UPDATE public.aeropuertos SET lat =  19.3960, lng = -102.0400 WHERE iata = 'UPN';
UPDATE public.aeropuertos SET lat =  19.1440, lng = -104.5600 WHERE iata = 'ZLO';
UPDATE public.aeropuertos SET lat =  18.1060, lng =  -94.5790 WHERE iata = 'MTT';
UPDATE public.aeropuertos SET lat =  28.0290, lng = -115.1900 WHERE iata = 'ICD';
UPDATE public.aeropuertos SET lat =  28.6260, lng = -100.5350 WHERE iata = 'PDS';
UPDATE public.aeropuertos SET lat =  20.5440, lng = -100.8870 WHERE iata = 'CYW';
UPDATE public.aeropuertos SET lat =  19.5700, lng =  -99.2890 WHERE iata = 'JJC';
UPDATE public.aeropuertos SET lat =  20.0000, lng =  -98.0000 WHERE iata = 'PCA';
UPDATE public.aeropuertos SET lat =  20.2800, lng =  -87.6500 WHERE iata = 'FBO';
UPDATE public.aeropuertos SET lat =  23.1630, lng = -106.2660 WHERE iata = 'MZT'; -- ya incluido
UPDATE public.aeropuertos SET lat =  28.7029, lng = -105.9646 WHERE iata = 'CED';
-- Internacionales – USA
UPDATE public.aeropuertos SET lat =  29.9902, lng =  -95.3368 WHERE iata = 'IAH';
UPDATE public.aeropuertos SET lat =  32.8998, lng =  -97.0403 WHERE iata = 'DFW';
UPDATE public.aeropuertos SET lat =  25.7959, lng =  -80.2870 WHERE iata = 'MIA';
UPDATE public.aeropuertos SET lat =  41.9742, lng =  -87.9073 WHERE iata = 'ORD';
UPDATE public.aeropuertos SET lat =  40.6413, lng =  -73.7781 WHERE iata = 'JFK';
UPDATE public.aeropuertos SET lat =  33.9416, lng = -118.4085 WHERE iata = 'LAX';
UPDATE public.aeropuertos SET lat =  37.6189, lng = -122.3750 WHERE iata = 'SFO';
UPDATE public.aeropuertos SET lat =  33.6407, lng =  -84.4277 WHERE iata = 'ATL';
UPDATE public.aeropuertos SET lat =  35.0424, lng =  -89.9767 WHERE iata = 'MEM';
UPDATE public.aeropuertos SET lat =  39.0466, lng =  -84.6624 WHERE iata = 'CVG';
UPDATE public.aeropuertos SET lat =  61.1741, lng = -149.9962 WHERE iata = 'ANC';
UPDATE public.aeropuertos SET lat =  28.4312, lng =  -81.3081 WHERE iata = 'MCO';
UPDATE public.aeropuertos SET lat =  47.4502, lng = -122.3088 WHERE iata = 'SEA';
UPDATE public.aeropuertos SET lat =  33.4342, lng = -112.0080 WHERE iata = 'PHX';
UPDATE public.aeropuertos SET lat =  39.8561, lng = -104.6737 WHERE iata = 'DEN';
UPDATE public.aeropuertos SET lat =  39.1754, lng =  -76.6683 WHERE iata = 'BWI';
UPDATE public.aeropuertos SET lat =  38.9531, lng =  -77.4565 WHERE iata = 'IAD';
UPDATE public.aeropuertos SET lat =  36.0840, lng = -115.1537 WHERE iata = 'LAS';
UPDATE public.aeropuertos SET lat =  40.6925, lng =  -74.1687 WHERE iata = 'EWR';
UPDATE public.aeropuertos SET lat =  35.2140, lng =  -80.9431 WHERE iata = 'CLT';
UPDATE public.aeropuertos SET lat =  39.2976, lng =  -94.7139 WHERE iata = 'MCI';
UPDATE public.aeropuertos SET lat =  40.7899, lng = -111.9791 WHERE iata = 'SLC';
UPDATE public.aeropuertos SET lat =  42.2125, lng =  -83.3534 WHERE iata = 'DTW';
UPDATE public.aeropuertos SET lat =  29.6454, lng =  -95.2789 WHERE iata = 'HOU';
UPDATE public.aeropuertos SET lat =  44.8848, lng =  -93.2223 WHERE iata = 'MSP';
UPDATE public.aeropuertos SET lat =  26.0726, lng =  -80.1527 WHERE iata = 'FLL';
UPDATE public.aeropuertos SET lat =  32.7336, lng = -117.1896 WHERE iata = 'SAN';
UPDATE public.aeropuertos SET lat =  29.5337, lng =  -98.4698 WHERE iata = 'SAT';
UPDATE public.aeropuertos SET lat =  30.1975, lng =  -97.6664 WHERE iata = 'AUS';
UPDATE public.aeropuertos SET lat =  34.5975, lng = -117.3830 WHERE iata = 'VCV';
UPDATE public.aeropuertos SET lat =  34.0556, lng = -117.6010 WHERE iata = 'ONT';
UPDATE public.aeropuertos SET lat =  32.7359, lng = -117.1952 WHERE iata = 'NZY';
UPDATE public.aeropuertos SET lat =  26.2285, lng =  -98.2185 WHERE iata = 'MFE';
UPDATE public.aeropuertos SET lat =  25.9057, lng =  -97.4270 WHERE iata = 'BRO';
UPDATE public.aeropuertos SET lat =  26.2285, lng =  -98.2185 WHERE iata = 'HRL';
UPDATE public.aeropuertos SET lat =  27.5438, lng =  -99.4617 WHERE iata = 'LRD';
UPDATE public.aeropuertos SET lat =  31.8072, lng = -106.3779 WHERE iata = 'ELP';
UPDATE public.aeropuertos SET lat =  36.0801, lng = -115.1522 WHERE iata = 'LAS'; -- ya arriba
UPDATE public.aeropuertos SET lat =  33.6784, lng = -117.8685 WHERE iata = 'SJC';
UPDATE public.aeropuertos SET lat =  37.7213, lng = -122.2208 WHERE iata = 'OAK';
UPDATE public.aeropuertos SET lat =  38.5046, lng = -121.4939 WHERE iata = 'SMF';
UPDATE public.aeropuertos SET lat =  36.7750, lng = -119.7236 WHERE iata = 'FAT';
UPDATE public.aeropuertos SET lat =  34.2006, lng = -119.1200 WHERE iata = 'SBD';
UPDATE public.aeropuertos SET lat =  47.5312, lng = -122.3018 WHERE iata = 'BFI';
UPDATE public.aeropuertos SET lat =  32.5664, lng = -116.9730 WHERE iata = 'TIJ'; -- ya arriba
UPDATE public.aeropuertos SET lat =  39.5481, lng = -119.7681 WHERE iata = 'RNO';
UPDATE public.aeropuertos SET lat =  38.8512, lng = -104.7008 WHERE iata = 'COS';
UPDATE public.aeropuertos SET lat =  30.6954, lng =  -88.2428 WHERE iata = 'BFM';
UPDATE public.aeropuertos SET lat =  30.4073, lng =  -89.0701 WHERE iata = 'GPT';
UPDATE public.aeropuertos SET lat =  32.9007, lng =  -80.0401 WHERE iata = 'CHS';
UPDATE public.aeropuertos SET lat =  29.9935, lng =  -90.2580 WHERE iata = 'MSY';
UPDATE public.aeropuertos SET lat =  32.3004, lng =  -90.0758 WHERE iata = 'JAN';
UPDATE public.aeropuertos SET lat =  36.1266, lng =  -86.6782 WHERE iata = 'BNA';
UPDATE public.aeropuertos SET lat =  38.1740, lng =  -85.7360 WHERE iata = 'SDF';
UPDATE public.aeropuertos SET lat =  39.9985, lng =  -82.8919 WHERE iata = 'CMH';
UPDATE public.aeropuertos SET lat =  39.9973, lng =  -82.8919 WHERE iata = 'LUK';
UPDATE public.aeropuertos SET lat =  39.7173, lng =  -86.2944 WHERE iata = 'IND';
UPDATE public.aeropuertos SET lat =  36.0984, lng =  -79.9373 WHERE iata = 'GSO';
UPDATE public.aeropuertos SET lat =  34.8957, lng =  -82.2189 WHERE iata = 'GSP';
UPDATE public.aeropuertos SET lat =  30.4733, lng =  -91.1496 WHERE iata = 'BTR';
UPDATE public.aeropuertos SET lat =  32.3274, lng =  -93.8246 WHERE iata = 'SHV';
UPDATE public.aeropuertos SET lat =  45.5887, lng = -122.5975 WHERE iata = 'PDX';
UPDATE public.aeropuertos SET lat =  43.1389, lng =  -76.1063 WHERE iata = 'SYR';
UPDATE public.aeropuertos SET lat =  43.8833, lng =  -91.2567 WHERE iata = 'LSE';
UPDATE public.aeropuertos SET lat =  41.8369, lng =  -87.6279 WHERE iata = 'MDW';
UPDATE public.aeropuertos SET lat =  35.4242, lng =  -97.6007 WHERE iata = 'OKC';
UPDATE public.aeropuertos SET lat =  36.1985, lng =  -95.8881 WHERE iata = 'TUL';
UPDATE public.aeropuertos SET lat =  47.9490, lng = -122.2157 WHERE iata = 'PAE';
UPDATE public.aeropuertos SET lat =  40.4958, lng =  -80.2330 WHERE iata = 'PIT';
UPDATE public.aeropuertos SET lat =  38.9445, lng =  -77.4558 WHERE iata = 'ADW';
UPDATE public.aeropuertos SET lat =  38.9531, lng =  -77.4565 WHERE iata = 'IAD'; -- ya arriba
UPDATE public.aeropuertos SET lat =  40.6925, lng =  -74.1687 WHERE iata = 'WRI';
UPDATE public.aeropuertos SET lat =  38.8170, lng =  -76.8720 WHERE iata = 'ADW'; -- Andrews
UPDATE public.aeropuertos SET lat =  32.4008, lng = -117.0567 WHERE iata = 'NZY'; -- ya arriba
UPDATE public.aeropuertos SET lat =  37.3587, lng = -121.9247 WHERE iata = 'SJC'; -- San Jose CA
UPDATE public.aeropuertos SET lat =  40.7772, lng = -111.9696 WHERE iata = 'HIF'; -- Hill AFB
UPDATE public.aeropuertos SET lat =  41.1219, lng = -112.0135 WHERE iata = 'HIF';
UPDATE public.aeropuertos SET lat =  34.9044, lng = -117.0831 WHERE iata = 'GYR';
UPDATE public.aeropuertos SET lat =  38.3685, lng =  -82.5558 WHERE iata = 'HTS';
UPDATE public.aeropuertos SET lat =  34.6374, lng =  -86.7750 WHERE iata = 'HSV';
UPDATE public.aeropuertos SET lat =  30.4213, lng =  -86.5289 WHERE iata = 'ECP';
UPDATE public.aeropuertos SET lat =  30.0541, lng =  -85.7801 WHERE iata = 'PAM';
UPDATE public.aeropuertos SET lat =  28.2355, lng =  -82.5344 WHERE iata = 'PIE';
UPDATE public.aeropuertos SET lat =  25.6459, lng =  -80.4329 WHERE iata = 'OPF';
UPDATE public.aeropuertos SET lat =  29.9847, lng =  -90.2580 WHERE iata = 'MSY'; -- already
UPDATE public.aeropuertos SET lat =  30.0172, lng =  -90.2580 WHERE iata = 'AEX';
UPDATE public.aeropuertos SET lat =  30.2074, lng =  -93.2239 WHERE iata = 'CWF';
UPDATE public.aeropuertos SET lat =  38.3337, lng = -122.0128 WHERE iata = 'SUU';
UPDATE public.aeropuertos SET lat =  46.5782, lng = -120.5384 WHERE iata = 'TCM';
UPDATE public.aeropuertos SET lat =  47.1316, lng = -122.5767 WHERE iata = 'TCM'; -- McChord
UPDATE public.aeropuertos SET lat =  37.8959, lng =  -75.5129 WHERE iata = 'SBY';
UPDATE public.aeropuertos SET lat =  39.4479, lng =  -76.1713 WHERE iata = 'HGR';
UPDATE public.aeropuertos SET lat =  30.7285, lng =  -92.6655 WHERE iata = 'AEX';
UPDATE public.aeropuertos SET lat =  32.9003, lng =  -97.6188 WHERE iata = 'AFW';
UPDATE public.aeropuertos SET lat =  33.4373, lng = -112.0078 WHERE iata = 'AZA';
UPDATE public.aeropuertos SET lat =  32.8481, lng = -117.0451 WHERE iata = 'NZY';
UPDATE public.aeropuertos SET lat =  40.9325, lng =  -72.7879 WHERE iata = 'ISP';
UPDATE public.aeropuertos SET lat =  39.6174, lng =  -79.9166 WHERE iata = 'MGW';
UPDATE public.aeropuertos SET lat =  42.7795, lng =  -73.8017 WHERE iata = 'ALB';
UPDATE public.aeropuertos SET lat =  44.4698, lng =  -73.1533 WHERE iata = 'BTV';
UPDATE public.aeropuertos SET lat =  48.7066, lng = -122.5937 WHERE iata = 'BLI';
UPDATE public.aeropuertos SET lat =  34.5972, lng = -117.3830 WHERE iata = 'VCV'; -- already
UPDATE public.aeropuertos SET lat =  30.5212, lng =  -97.6699 WHERE iata = 'HYI';
UPDATE public.aeropuertos SET lat =  29.8304, lng =  -83.5920 WHERE iata = 'VDL';
UPDATE public.aeropuertos SET lat =  32.1127, lng =  -81.2021 WHERE iata = 'SAV';
UPDATE public.aeropuertos SET lat =  33.9788, lng =  -83.5631 WHERE iata = 'AHN';
UPDATE public.aeropuertos SET lat =  34.2978, lng = -118.4140 WHERE iata = 'BUR';
UPDATE public.aeropuertos SET lat =  51.4577, lng =   -0.4617 WHERE iata = 'RIV'; -- March AFB is US!
UPDATE public.aeropuertos SET lat =  33.8806, lng = -117.2593 WHERE iata = 'RIV';
UPDATE public.aeropuertos SET lat =  31.5749, lng = -110.3434 WHERE iata = 'TUS';
UPDATE public.aeropuertos SET lat =  36.0819, lng = -115.1522 WHERE iata = 'LAS'; -- already
UPDATE public.aeropuertos SET lat =  39.0436, lng = -108.5266 WHERE iata = 'GJT';
UPDATE public.aeropuertos SET lat =  44.4806, lng = -123.0029 WHERE iata = 'CVO';
UPDATE public.aeropuertos SET lat =  44.1245, lng = -121.1994 WHERE iata = 'RDM';
UPDATE public.aeropuertos SET lat =  60.5736, lng = -151.2444 WHERE iata = 'SXQ';
UPDATE public.aeropuertos SET lat =  64.8134, lng = -147.8561 WHERE iata = 'FAI';
UPDATE public.aeropuertos SET lat =  64.9713, lng = -161.2880 WHERE iata = 'UNK';
UPDATE public.aeropuertos SET lat =  61.5756, lng = -149.0671 WHERE iata = 'EDF';
UPDATE public.aeropuertos SET lat =  21.3187, lng = -157.9225 WHERE iata = 'HNL';
UPDATE public.aeropuertos SET lat =  21.4270, lng = -157.1688 WHERE iata = 'HIK';
UPDATE public.aeropuertos SET lat =  13.4841, lng = 144.7964  WHERE iata = 'UAM';
-- Internacionales – Canada
UPDATE public.aeropuertos SET lat =  43.6777, lng =  -79.6248 WHERE iata = 'YYZ';
UPDATE public.aeropuertos SET lat =  49.1947, lng = -123.1792 WHERE iata = 'YVR';
UPDATE public.aeropuertos SET lat =  45.4706, lng =  -73.7408 WHERE iata = 'YUL';
UPDATE public.aeropuertos SET lat =  44.8808, lng =  -63.5086 WHERE iata = 'YHZ';
UPDATE public.aeropuertos SET lat =  43.1743, lng =  -79.9347 WHERE iata = 'YHM';
UPDATE public.aeropuertos SET lat =  49.9100, lng =  -97.2399 WHERE iata = 'YWG';
UPDATE public.aeropuertos SET lat =  47.6187, lng =  -52.7491 WHERE iata = 'YYT';
UPDATE public.aeropuertos SET lat =  48.3695, lng =  -54.5672 WHERE iata = 'YQX';
UPDATE public.aeropuertos SET lat =  49.9883, lng =  -91.5688 WHERE iata = 'YQK';
UPDATE public.aeropuertos SET lat =  45.6796, lng =  -74.0382 WHERE iata = 'YMX';
-- Internacionales – Latinoamérica
UPDATE public.aeropuertos SET lat =  22.9972, lng =  -82.4082 WHERE iata = 'HAV';
UPDATE public.aeropuertos SET lat =   9.0714, lng =  -79.3835 WHERE iata = 'PTY';
UPDATE public.aeropuertos SET lat =   8.9988, lng =  -79.3662 WHERE iata = 'BLB';
UPDATE public.aeropuertos SET lat =  10.6012, lng =  -66.9913 WHERE iata = 'CCS';
UPDATE public.aeropuertos SET lat =  18.4302, lng =  -69.6789 WHERE iata = 'SDQ';
UPDATE public.aeropuertos SET lat =  18.5674, lng =  -68.3634 WHERE iata = 'PUJ';
UPDATE public.aeropuertos SET lat =  18.5727, lng =  -68.3820 WHERE iata = 'LRM';
UPDATE public.aeropuertos SET lat =  18.4053, lng =  -69.9690 WHERE iata = 'SDQ';
UPDATE public.aeropuertos SET lat =   4.7016, lng =  -74.1469 WHERE iata = 'BOG';
UPDATE public.aeropuertos SET lat =   6.1620, lng =  -75.4231 WHERE iata = 'MDE';
UPDATE public.aeropuertos SET lat =  10.8896, lng =  -74.7805 WHERE iata = 'BAQ';
UPDATE public.aeropuertos SET lat =   3.7726, lng =  -76.2322 WHERE iata = 'CLO';
UPDATE public.aeropuertos SET lat = -12.0241, lng =  -77.1138 WHERE iata = 'LIM';
UPDATE public.aeropuertos SET lat =  -0.1292, lng =  -78.3576 WHERE iata = 'UIO';
UPDATE public.aeropuertos SET lat =  -2.1574, lng =  -79.8836 WHERE iata = 'GYE';
UPDATE public.aeropuertos SET lat = -33.3928, lng =  -70.7934 WHERE iata = 'SCL';
UPDATE public.aeropuertos SET lat = -34.8150, lng =  -58.5348 WHERE iata = 'EZE';
UPDATE public.aeropuertos SET lat = -34.5592, lng =  -58.4156 WHERE iata = 'AEP';
UPDATE public.aeropuertos SET lat = -23.4356, lng =  -46.4731 WHERE iata = 'GRU';
UPDATE public.aeropuertos SET lat = -22.8089, lng =  -43.2436 WHERE iata = 'GIG';
UPDATE public.aeropuertos SET lat = -25.5285, lng =  -49.1758 WHERE iata = 'CWB';
UPDATE public.aeropuertos SET lat =  -8.1259, lng =  -34.9236 WHERE iata = 'REC';
UPDATE public.aeropuertos SET lat = -3.0386,  lng =  -60.0498 WHERE iata = 'MAO';
UPDATE public.aeropuertos SET lat = -25.5285, lng =  -49.1758 WHERE iata = 'VCP';
UPDATE public.aeropuertos SET lat =   5.4528, lng =  -55.1878 WHERE iata = 'PBM';
UPDATE public.aeropuertos SET lat =  17.7026, lng =  -64.8001 WHERE iata = 'SJU';
UPDATE public.aeropuertos SET lat =  14.5833, lng =  -90.5270 WHERE iata = 'GUA';
UPDATE public.aeropuertos SET lat =  14.0581, lng =  -87.2171 WHERE iata = 'SAP';
UPDATE public.aeropuertos SET lat =  13.4409, lng =  -89.0557 WHERE iata = 'SAL';
UPDATE public.aeropuertos SET lat =  12.1414, lng =  -86.1681 WHERE iata = 'MGA';
UPDATE public.aeropuertos SET lat =  17.9090, lng =  -76.5377 WHERE iata = 'KIN';
UPDATE public.aeropuertos SET lat =  10.5924, lng =  -61.3374 WHERE iata = 'POS';
UPDATE public.aeropuertos SET lat =   6.4754, lng =  -3.3826  WHERE iata = 'ABJ';
UPDATE public.aeropuertos SET lat =  18.5792, lng =  -72.2928 WHERE iata = 'PAP';
UPDATE public.aeropuertos SET lat =  17.5362, lng =  -88.3080 WHERE iata = 'BZE';
UPDATE public.aeropuertos SET lat =  10.0654, lng =  -84.2088 WHERE iata = 'SJO';
UPDATE public.aeropuertos SET lat =  10.5936, lng =  -85.5444 WHERE iata = 'LIR';
UPDATE public.aeropuertos SET lat =  13.4409, lng =  -89.0557 WHERE iata = 'SAL'; -- already
UPDATE public.aeropuertos SET lat =  15.4508, lng =  -88.0659 WHERE iata = 'SAP'; -- already
-- Internacionales – Europa
UPDATE public.aeropuertos SET lat =  40.4839, lng =   -3.5679 WHERE iata = 'MAD';
UPDATE public.aeropuertos SET lat =  49.0097, lng =    2.5479 WHERE iata = 'CDG';
UPDATE public.aeropuertos SET lat =  52.3105, lng =    4.7683 WHERE iata = 'AMS';
UPDATE public.aeropuertos SET lat =  51.4700, lng =   -0.4543 WHERE iata = 'LHR';
UPDATE public.aeropuertos SET lat =  50.0379, lng =    8.5622 WHERE iata = 'FRA';
UPDATE public.aeropuertos SET lat =  41.2971, lng =    2.0785 WHERE iata = 'BCN';
UPDATE public.aeropuertos SET lat =  50.9014, lng =    4.4844 WHERE iata = 'BRU';
UPDATE public.aeropuertos SET lat =  50.6333, lng =    5.4432 WHERE iata = 'LGG';
UPDATE public.aeropuertos SET lat =  51.1890, lng =    2.8622 WHERE iata = 'OST';
UPDATE public.aeropuertos SET lat =  48.1100, lng =   16.5697 WHERE iata = 'VIE';
UPDATE public.aeropuertos SET lat =  47.4580, lng =    8.5480 WHERE iata = 'ZRH';
UPDATE public.aeropuertos SET lat =  48.3538, lng =   11.7861 WHERE iata = 'MUC';
UPDATE public.aeropuertos SET lat =  51.1303, lng =   13.7667 WHERE iata = 'DRS';
UPDATE public.aeropuertos SET lat =  41.6561, lng =   12.2388 WHERE iata = 'FCO';
UPDATE public.aeropuertos SET lat =  45.6306, lng =    8.7232 WHERE iata = 'MXP';
UPDATE public.aeropuertos SET lat =  40.8862, lng =   14.2908 WHERE iata = 'NAP';
UPDATE public.aeropuertos SET lat =  38.7756, lng =   -9.1354 WHERE iata = 'LIS';
UPDATE public.aeropuertos SET lat =  43.1003, lng =    5.2146 WHERE iata = 'MRS';
UPDATE public.aeropuertos SET lat =  59.9133, lng =   10.6172 WHERE iata = 'OSL';
UPDATE public.aeropuertos SET lat =  59.6498, lng =   17.9238 WHERE iata = 'ARN';
UPDATE public.aeropuertos SET lat =  60.3171, lng =   24.9633 WHERE iata = 'HEL';
UPDATE public.aeropuertos SET lat =  64.1300, lng =  -21.9408 WHERE iata = 'KEF';
UPDATE public.aeropuertos SET lat =  52.1657, lng =   20.9671 WHERE iata = 'WAW';
UPDATE public.aeropuertos SET lat =  53.7751, lng =   20.9199 WHERE iata = 'SZY';
UPDATE public.aeropuertos SET lat =  59.2243, lng =   18.0564 WHERE iata = 'ARN';
UPDATE public.aeropuertos SET lat =  59.3629, lng =   15.7200 WHERE iata = 'ORB';
UPDATE public.aeropuertos SET lat =  37.9365, lng =   23.9445 WHERE iata = 'ATH';
UPDATE public.aeropuertos SET lat =  42.6952, lng =   23.4061 WHERE iata = 'SOF';
UPDATE public.aeropuertos SET lat =  47.4298, lng =   19.2612 WHERE iata = 'BUD';
UPDATE public.aeropuertos SET lat =  41.4061, lng =    2.1649 WHERE iata = 'ZAZ';
UPDATE public.aeropuertos SET lat =  49.6233, lng =    6.2044 WHERE iata = 'LUX';
-- Internacionales – Oriente Medio / Asia
UPDATE public.aeropuertos SET lat =  25.2730, lng =   51.6080 WHERE iata = 'DOH';
UPDATE public.aeropuertos SET lat =  24.8967, lng =   55.3272 WHERE iata = 'DXB';
UPDATE public.aeropuertos SET lat =  24.8967, lng =   55.3272 WHERE iata = 'DWC';
UPDATE public.aeropuertos SET lat =  37.4602, lng =  126.4407 WHERE iata = 'ICN';
UPDATE public.aeropuertos SET lat =  35.7719, lng =  140.3929 WHERE iata = 'NRT';
UPDATE public.aeropuertos SET lat =  34.8586, lng =  136.8048 WHERE iata = 'NGO';
UPDATE public.aeropuertos SET lat =  43.0021, lng =  141.3950 WHERE iata = 'CTS';
UPDATE public.aeropuertos SET lat =  22.3080, lng =  113.9185 WHERE iata = 'HKG';
UPDATE public.aeropuertos SET lat =  31.1434, lng =  121.8052 WHERE iata = 'PVG';
UPDATE public.aeropuertos SET lat =  23.3924, lng =  113.2988 WHERE iata = 'CAN';
UPDATE public.aeropuertos SET lat =  34.5196, lng =  112.6090 WHERE iata = 'CGO';
UPDATE public.aeropuertos SET lat =  37.7569, lng =  112.6285 WHERE iata = 'TYN';
UPDATE public.aeropuertos SET lat =  45.6234, lng =  126.2501 WHERE iata = 'HRB';
UPDATE public.aeropuertos SET lat =  48.5280, lng =  135.1883 WHERE iata = 'KHV';
-- Internacionales – Resto del mundo
UPDATE public.aeropuertos SET lat =  41.0082, lng =   28.9784 WHERE iata = 'IST';
UPDATE public.aeropuertos SET lat =  40.9769, lng =   29.0658 WHERE iata = 'SAW';
UPDATE public.aeropuertos SET lat = -33.9249, lng =   18.4241 WHERE iata = 'CPT';
UPDATE public.aeropuertos SET lat =  14.7397, lng =  -17.4902 WHERE iata = 'DKR';
UPDATE public.aeropuertos SET lat =  16.9594, lng =  -22.9491 WHERE iata = 'SID';
UPDATE public.aeropuertos SET lat =  13.1791, lng =  -16.6547 WHERE iata = 'BJL';
UPDATE public.aeropuertos SET lat = -8.1248,  lng =  115.1672 WHERE iata = 'TMC';
UPDATE public.aeropuertos SET lat =  16.8611, lng = -99.7370  WHERE iata = 'DOV'; -- Dover UK → skip (diff location)
UPDATE public.aeropuertos SET lat =  51.1600, lng =   -1.3220 WHERE iata = 'DOV';
UPDATE public.aeropuertos SET lat =  57.8901, lng =   -4.0612 WHERE iata = 'DOC';
UPDATE public.aeropuertos SET lat =  56.9076, lng =  -15.4444 WHERE iata = 'BGI'; -- Barbados, not NZ
UPDATE public.aeropuertos SET lat =  13.0747, lng =  -59.4925 WHERE iata = 'BGI';
UPDATE public.aeropuertos SET lat = -34.9177, lng = -54.9172  WHERE iata = 'MVD';
-- Índices para búsqueda rápida por coords
CREATE INDEX IF NOT EXISTS aeropuertos_coords_idx
  ON public.aeropuertos (iata)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ── 3. AUTO-ASIGNACIÓN DE route_id ──────────────────────────────────────
-- Tabla de catálogo de rutas: una fila por IATA con un ID único numérico.
-- Se alimenta automáticamente al insertar en cualquiera de las 3 tablas de frecuencias.

CREATE TABLE IF NOT EXISTS public.route_catalog (
  id   SERIAL PRIMARY KEY,
  iata TEXT UNIQUE NOT NULL
);

-- Poblar con todos los IATAs actuales de las tablas de frecuencias
INSERT INTO public.route_catalog (iata)
SELECT DISTINCT iata
FROM (
  SELECT iata FROM public.weekly_frequencies        WHERE iata IS NOT NULL
  UNION
  SELECT iata FROM public.weekly_frequencies_int    WHERE iata IS NOT NULL
  UNION
  SELECT iata FROM public.weekly_frequencies_cargo  WHERE iata IS NOT NULL
) t
ON CONFLICT (iata) DO NOTHING;

-- Función que asigna route_id desde route_catalog al insertar/actualizar
CREATE OR REPLACE FUNCTION public.fn_assign_route_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.iata IS NOT NULL THEN
    -- Insertar en catálogo si es nuevo
    INSERT INTO public.route_catalog (iata) VALUES (NEW.iata)
    ON CONFLICT (iata) DO NOTHING;
    -- Asignar el id numérico
    NEW.route_id := (SELECT id FROM public.route_catalog WHERE iata = NEW.iata);
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers para las 3 tablas
DROP TRIGGER IF EXISTS trg_assign_route_id_nac   ON public.weekly_frequencies;
DROP TRIGGER IF EXISTS trg_assign_route_id_int   ON public.weekly_frequencies_int;
DROP TRIGGER IF EXISTS trg_assign_route_id_cargo ON public.weekly_frequencies_cargo;

CREATE TRIGGER trg_assign_route_id_nac
  BEFORE INSERT OR UPDATE ON public.weekly_frequencies
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_route_id();

CREATE TRIGGER trg_assign_route_id_int
  BEFORE INSERT OR UPDATE ON public.weekly_frequencies_int
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_route_id();

CREATE TRIGGER trg_assign_route_id_cargo
  BEFORE INSERT OR UPDATE ON public.weekly_frequencies_cargo
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_route_id();

-- Actualizar route_id en filas existentes que tengan NULL
UPDATE public.weekly_frequencies w
SET route_id = rc.id
FROM public.route_catalog rc
WHERE w.iata = rc.iata AND w.route_id IS NULL;

UPDATE public.weekly_frequencies_int w
SET route_id = rc.id
FROM public.route_catalog rc
WHERE w.iata = rc.iata AND w.route_id IS NULL;

UPDATE public.weekly_frequencies_cargo w
SET route_id = rc.id
FROM public.route_catalog rc
WHERE w.iata = rc.iata AND w.route_id IS NULL;
