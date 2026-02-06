(function(){
  const pane = document.getElementById('frecuencias-cargo-pane');
  if (!pane) return;

  const DAY_CODES = ['L','M','X','J','V','S','D'];
  const DAY_LABELS = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
  const intlNumber = new Intl.NumberFormat('es-MX');
  const intlDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  // Configuración de aerolíneas incluyendo Carga
  const AIRLINE_CONFIG = {
    // Carga & International
    'estafeta': { logo: 'logo_estafeta.jpg', color: '#c41230', text: '#ffffff' },
    'ups': { logo: 'logo_united_parcel_service.png', color: '#351c15', text: '#ffffff' },
    'united-parcel-service': { logo: 'logo_united_parcel_service.png', color: '#351c15', text: '#ffffff' },
    'fedex': { logo: 'logo_fedex_express.png', color: '#4d148c', text: '#ffffff' },
    'dhl': { logo: 'logo_dhl_guatemala_.png', color: '#d40511', text: '#ffffff' },
    'dhl-guatemala': { logo: 'logo_dhl_guatemala_.png', color: '#d40511', text: '#ffffff' },
    'dhl-aero-expreso': { logo: 'logo_dhl_guatemala_.png', color: '#d40511', text: '#ffffff' },
    'mas': { logo: 'logo_mas.png', color: '#00a550', text: '#ffffff' },
    'masair': { logo: 'logo_mas_air.png', color: '#00a550', text: '#ffffff' },
    'mas-air': { logo: 'logo_mas_air.png', color: '#00a550', text: '#ffffff' },
    'mas-cargo': { logo: 'logo_mas_air.png', color: '#00a550', text: '#ffffff' },
    'air-canada': { logo: 'logo_air_canada_.png', color: '#ef3340', text: '#ffffff' },
    'air-france': { logo: 'logo_air_france_.png', color: '#00266e', text: '#ffffff' },
    'air-china': { logo: 'logo_air_china.png', color: '#ff0000', text: '#ffffff' },
    'china-southern': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },
    'china-southern-airlines': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },
    'china-southern-cargo': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },
    'china-southerrn': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' }, // Typos in source
    'cz': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },
    'csn': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },

    'qatar': { logo: 'logo_qatar.png', color: '#5b0e2d', text: '#ffffff' },
    'qatar-airways': { logo: 'logo_qatar_airways.png', color: '#5C0632', text: '#ffffff' }, 
    'turkish': { logo: 'logo_turkish_airlines.png', color: '#c8102e', text: '#ffffff' },
    'turkish-airlines': { logo: 'logo_turkish_airlines.png', color: '#c8102e', text: '#ffffff' },
    'tk': { logo: 'logo_turkish_airlines.png', color: '#c8102e', text: '#ffffff' },
    'lufthansa': { logo: 'logo_lufthansa.png', color: '#05164d', text: '#ffffff' },
    
    'emirates': { logo: 'logo_emirates_airlines.png', color: '#d71920', text: '#ffffff' },
    'emirates-airlines': { logo: 'logo_emirates_airlines.png', color: '#d71920', text: '#ffffff' },
    'emirates-skycargo': { logo: 'logo_emirates_airlines.png', color: '#D71822', text: '#ffffff' },
    'ek': { logo: 'logo_emirates_airlines.png', color: '#d71920', text: '#ffffff' },
    'uae': { logo: 'logo_emirates_airlines.png', color: '#d71920', text: '#ffffff' },

    'cargojet': { logo: 'logo_cargojet.png', color: '#000000', text: '#ffffff' },
    'cargojet-airways': { logo: 'logo_cargojet_airways.png', color: '#000000', text: '#ffffff' },
    'w8': { logo: 'logo_cargojet_airways.png', color: '#000000', text: '#ffffff' }, // Cargojet IATA code
    'cjy': { logo: 'logo_cargojet_airways.png', color: '#000000', text: '#ffffff' }, // Cargojet ICAO code

    'atlas': { logo: 'logo_atlas_air.png', color: '#003366', text: '#ffffff' },
    'atlas-air': { logo: 'logo_atlas_air.png', color: '#003366', text: '#ffffff' },
    'kalitta': { logo: 'logo_kalitta_air.jpg', color: '#cf0a2c', text: '#ffffff' },
    'national': { logo: 'logo_national_airlines_cargo.png', color: '#001f3f', text: '#ffffff' },
    'tsm': { logo: 'logo_tsm_airlines.png', color: '#000000', text: '#ffffff' },
    'aerounion': { logo: 'logo_aerounión.png', color: '#00529b', text: '#ffffff' },
    'aero-union': { logo: 'logo_aerounión.png', color: '#00529b', text: '#ffffff' },
    'aerotransporte-de-carga-union': { logo: 'logo_aerounión.png', color: '#00529b', text: '#ffffff' },
    'aerotransporte-de-carga-union-sa-de-cv': { logo: 'logo_aerounión.png', color: '#00529b', text: '#ffffff' },
    'cargolux': { logo: 'logo_cargolux.png', color: '#00a0dc', text: '#ffffff' },
    'cathay': { logo: 'logo_cathay_pacific.png', color: '#006564', text: '#ffffff' },
    'cathay-pacific': { logo: 'logo_cathay_pacific.png', color: '#006564', text: '#ffffff' },
    'cx': { logo: 'logo_cathay_pacific.png', color: '#006564', text: '#ffffff' },

    'suparna': { logo: 'logo_suparna.png', color: '#b22222', text: '#ffffff' },
    
    'awesome': { logo: 'logo_awesome_cargo.png', color: '#000000', text: '#ffffff' },
    'awesome-cargo': { logo: 'logo_awesome_cargo.png', color: '#000000', text: '#ffffff' },
    'a7': { logo: 'logo_awesome_cargo.png', color: '#000000', text: '#ffffff' },
    'win': { logo: 'logo_awesome_cargo.png', color: '#000000', text: '#ffffff' },

    'ethiopian': { logo: 'logo_ethiopian_airlines.png', color: '#00913f', text: '#ffffff' },
    'ethiopian-airlines': { logo: 'logo_ethiopian_airlines.png', color: '#00913f', text: '#ffffff' },
    'abx': { logo: 'logo_ABX_Air_.png', color: '#ffcc00', text: '#000000' },
    'amerijet': { logo: 'logo_amerijet_international.png', color: '#102d68', text: '#ffffff' },
    'amerijet-international': { logo: 'logo_amerijet_international.png', color: '#102d68', text: '#ffffff' },
    'arajet': { logo: 'logo_arajet.png', color: '#6c2d82', text: '#ffffff' },
    'galistair': { logo: 'logo_galistair_trading_limited.png', color: '#cba135', text: '#ffffff' },
    'iberojet': { logo: 'logo_iberojet.png', color: '#0077c8', text: '#ffffff' },
    'ifl': { logo: 'logo_ifl_group.png', color: '#1c355e', text: '#ffffff' },
    'omni': { logo: 'logo_omni_air.png', color: '#18306e', text: '#ffffff' },
    'silk-way': { logo: 'logo_silk_way_west_airlines.png', color: '#0054a6', text: '#ffffff' },
    'sun-country': { logo: 'logo_sun_country_airlines.png', color: '#f37021', text: '#ffffff' },
    'ukraine': { logo: 'logo_ukraine_international_airlines.png', color: '#0056b8', text: '#ffffff' },
    'ukraine-international': { logo: 'logo_ukraine_international_airlines.png', color: '#0056b8', text: '#ffffff' },
    'uniworld': { logo: 'logo_uniworld_cargo.png', color: '#00467f', text: '#ffffff' },
    'world2fly': { logo: 'logo_world_2_fly.png', color: '#002e6d', text: '#ffffff' },
    
    'la-nueva-aerolinea': { logo: 'logo_la_nueva_aerolinea.png', color: '#000000', text: '#ffffff' },

    // Pasajeros (legacy support si hay mix)
    'aeromexico': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
    'volaris': { logo: 'logo_volaris.png', color: '#a300e6', text: '#ffffff' },
    'viva': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    
    'default': { logo: null, color: '#ffffff', text: '#212529' }
  };

  const AIFA_COORDS = { lat: 19.7456, lng: -99.0086 };

  // Manual mapping for clean display names
  // Reutilizamos la misma lista de Int + Ciudades Mexicanas si es necesario
  const IATA_LOCATIONS = {
      'HAV': { city: 'La Habana', country: 'Cuba' },
      'MIA': { city: 'Miami', country: 'Estados Unidos' },
      'LAX': { city: 'Los Ángeles', country: 'Estados Unidos' },
      'MEM': { city: 'Memphis', country: 'Estados Unidos' },
      'CVG': { city: 'Cincinnati', country: 'Estados Unidos' },
      'ANC': { city: 'Anchorage', country: 'Estados Unidos' },
      'LHR': { city: 'Londres', country: 'Reino Unido' },
      'FRA': { city: 'Fráncfort', country: 'Alemania' },
      'DOH': { city: 'Doha', country: 'Catar' },
      'ICN': { city: 'Seúl', country: 'Corea del Sur' },
      'NRT': { city: 'Tokio', country: 'Japón' },
      'HKG': { city: 'Hong Kong', country: 'China' },
      'PVG': { city: 'Shanghái', country: 'China' },
      'YYZ': { city: 'Toronto', country: 'Canadá' },
      'YVR': { city: 'Vancouver', country: 'Canadá' },
      'YUL': { city: 'Montreal', country: 'Canadá' },
      'SCL': { city: 'Santiago', country: 'Chile' },
      'EZE': { city: 'Buenos Aires', country: 'Argentina' },
      'GRU': { city: 'São Paulo', country: 'Brasil' },
      'VCP': { city: 'Campinas', country: 'Brasil' },
      'GDL': { city: 'Guadalajara', country: 'México' },
      'MTY': { city: 'Monterrey', country: 'México' },
      'TIJ': { city: 'Tijuana', country: 'México' },
      'CUN': { city: 'Cancún', country: 'México' },
      'MID': { city: 'Mérida', country: 'México' },
      'SLP': { city: 'San Luis Potosí', country: 'México' },
      'QRO': { city: 'Querétaro', country: 'México' }
  };

  // Coordenadas extendidas para Carga
  const AIRPORT_COORDS = {
    // North America (Mexico, US, Canada)
    NLU: { lat: 19.745, lng: -99.008 }, 
    MEX: { lat: 19.436, lng: -99.072 },
    TLC: { lat: 19.337, lng: -99.566 },
    GDL: { lat: 20.521, lng: -103.311 },
    MTY: { lat: 25.778, lng: -100.106 },
    CUN: { lat: 21.036, lng: -86.877 },
    TIJ: { lat: 32.541, lng: -116.970 },
    MID: { lat: 20.937, lng: -89.657 },
    SLP: { lat: 22.254, lng: -100.931 },
    QRO: { lat: 20.617, lng: -100.366 },
    HMO: { lat: 29.095, lng: -111.047 },
    TRC: { lat: 25.568, lng: -103.410 },
    CJS: { lat: 31.636, lng: -106.428 },
    CUU: { lat: 28.702, lng: -105.964 },
    AGU: { lat: 21.705, lng: -102.318 },
    TAM: { lat: 22.296, lng: -97.865 },
    VER: { lat: 19.144, lng: -96.187 },
    OAX: { lat: 17.000, lng: -96.726 },
    TGZ: { lat: 16.561, lng: -93.025 },
    MZT: { lat: 23.161, lng: -106.266 },
    PVR: { lat: 20.680, lng: -105.254 },
    SJD: { lat: 23.151, lng: -109.721 },
    LAP: { lat: 24.072, lng: -110.362 },
    CUL: { lat: 24.764, lng: -107.474 },
    LMM: { lat: 25.685, lng: -109.047 },
    CEN: { lat: 27.392, lng: -109.833 },
    HUX: { lat: 15.775, lng: -96.262 },
    ZIH: { lat: 17.601, lng: -101.460 },
    ACA: { lat: 16.763, lng: -99.753 },
    PXM: { lat: 15.876, lng: -97.089 },
    CTM: { lat: 18.504, lng: -88.337 },
    CME: { lat: 18.654, lng: -91.800 },
    VSA: { lat: 17.997, lng: -92.817 },
    PQM: { lat: 17.534, lng: -92.016 },
    TAP: { lat: 14.794, lng: -92.370 },
    ZCL: { lat: 22.897, lng: -102.686 },
    REX: { lat: 26.010, lng: -98.221 },
    MLM: { lat: 19.849, lng: -101.025 },
    PBC: { lat: 19.158, lng: -98.371 },
    CZM: { lat: 20.511, lng: -86.926 },
    DGO: { lat: 24.124, lng: -104.526 },
    SLW: { lat: 25.549, lng: -100.929 },
    UPN: { lat: 19.396, lng: -102.040 },
    BJX: { lat: 20.993, lng: -101.481 },
    CLQ: { lat: 19.277, lng: -103.577 },
    ZLO: { lat: 19.144, lng: -104.560 },
    MTT: { lat: 18.106, lng: -94.579 },
    TQO: { lat: 20.155, lng: -87.829 },
    NLD: { lat: 27.443, lng: -99.570 },
    CVM: { lat: 23.702, lng: -98.956 },
    PCA: { lat: 20.0, lng: -98.0 }, // Approx Pachuca/Other
    ICD: { lat: 28.029, lng: -115.190 },
    PDS: { lat: 28.626, lng: -100.535 },
    LTO: { lat: 26.009, lng: -111.348 },
    MXL: { lat: 32.630, lng: -115.241 },
    MAM: { lat: 25.770, lng: -97.525 },
    CYW: { lat: 20.544, lng: -100.887 },
    JJC: { lat: 19.570, lng: -99.289 },

    MIA: { lat: 25.795, lng: -80.287 },
    LAX: { lat: 33.941, lng: -118.408 },
    JFK: { lat: 40.641, lng: -73.778 },
    ORD: { lat: 41.974, lng: -87.907 },
    DFW: { lat: 32.899, lng: -97.040 },
    IAH: { lat: 29.990, lng: -95.336 },
    SFO: { lat: 37.618, lng: -122.374 },
    ATL: { lat: 33.640, lng: -84.426 },
    MEM: { lat: 35.042, lng: -89.976 },
    CVG: { lat: 39.046, lng: -84.662 },
    ANC: { lat: 61.174, lng: -149.996 },
    MCO: { lat: 28.431, lng: -81.308 },
    SEA: { lat: 47.450, lng: -122.311 },
    PHX: { lat: 33.434, lng: -112.007 },
    DEN: { lat: 39.856, lng: -104.673 },
    BWI: { lat: 39.175, lng: -76.668 },
    IAD: { lat: 38.953, lng: -77.456 },
    LAS: { lat: 36.084, lng: -115.153 },
    EWR: { lat: 40.692, lng: -74.168 },
    CLT: { lat: 35.214, lng: -80.943 },
    MCI: { lat: 39.297, lng: -94.713 },
    SLC: { lat: 40.789, lng: -111.979 },
    DTW: { lat: 42.212, lng: -83.353 },
    HOU: { lat: 29.645, lng: -95.278 },
    MSP: { lat: 44.884, lng: -93.222 },
    FLL: { lat: 26.072, lng: -80.152 },
    SAN: { lat: 32.733, lng: -117.189 },
    SAT: { lat: 29.533, lng: -98.469 },
    AUS: { lat: 30.197, lng: -97.666 },
    VCV: { lat: 34.597, lng: -117.382 },
    SBD: { lat: 34.095, lng: -117.234 },
    ONT: { lat: 34.056, lng: -117.601 },
    RIV: { lat: 33.899, lng: -117.259 },
    SMF: { lat: 38.695, lng: -121.590 },
    OAK: { lat: 37.721, lng: -122.220 },
    RNO: { lat: 39.499, lng: -119.768 },
    FAT: { lat: 36.776, lng: -119.718 },
    HNL: { lat: 21.318, lng: -157.922 },
    IND: { lat: 39.717, lng: -86.294 },
    SDF: { lat: 38.174, lng: -85.736 },
    HSV: { lat: 34.637, lng: -86.775 },
    GSP: { lat: 34.895, lng: -82.218 },
    GSO: { lat: 36.104, lng: -79.935 },
    CMH: { lat: 39.998, lng: -82.891 },
    PIT: { lat: 40.491, lng: -80.232 },
    AFW: { lat: 32.972, lng: -97.319 },
    MFE: { lat: 26.175, lng: -98.238 },
    LRD: { lat: 27.543, lng: -99.461 },
    ELP: { lat: 31.807, lng: -106.377 },
    HRL: { lat: 26.228, lng: -97.654 },
    BRO: { lat: 25.906, lng: -97.425 },
    MSY: { lat: 29.993, lng: -90.259 },
    SHV: { lat: 32.446, lng: -93.825 },
    AEX: { lat: 31.327, lng: -92.548 },
    LUK: { lat: 39.103, lng: -84.419 },
    AZA: { lat: 33.307, lng: -111.655 },
    COS: { lat: 38.801, lng: -104.700 },
    BFI: { lat: 47.530, lng: -122.302 },
    PAOC: { lat: 61.258, lng: -149.528 }, // Approx for PCA?
    PAM: { lat: 30.070, lng: -85.576 },
    SUU: { lat: 38.262, lng: -121.927 },
    FAI: { lat: 64.815, lng: -147.856 },
    CXL: { lat: 32.669, lng: -115.513 },

    YYZ: { lat: 43.677, lng: -79.624 },
    YVR: { lat: 49.194, lng: -123.179 },
    YUL: { lat: 45.465, lng: -73.745 },
    YMX: { lat: 45.679, lng: -74.038 },
    YWG: { lat: 49.910, lng: -97.239 },
    YHZ: { lat: 44.880, lng: -63.508 },
    YQX: { lat: 48.936, lng: -54.568 },
    YYT: { lat: 47.618, lng: -52.751 },

    // Latin America & Caribbean
    BOG: { lat: 4.701, lng: -74.146 },
    MDE: { lat: 6.164, lng: -75.423 },
    CLO: { lat: 3.543, lng: -76.381 },
    BAQ: { lat: 10.889, lng: -74.780 },
    UIO: { lat: -0.129, lng: -78.361 },
    GYE: { lat: -2.157, lng: -79.883 },
    LIM: { lat: -12.024, lng: -77.112 },
    SCL: { lat: -33.392, lng: -70.793 },
    EZE: { lat: -34.815, lng: -58.534 },
    MVD: { lat: -34.838, lng: -56.028 },
    GRU: { lat: -23.435, lng: -46.473 },
    VCP: { lat: -23.007, lng: -47.134 },
    GIG: { lat: -22.808, lng: -43.249 },
    MAO: { lat: -3.038, lng: -60.049 },
    REC: { lat: -8.126, lng: -34.923 },
    CWB: { lat: -25.532, lng: -49.176 },
    CCS: { lat: 10.601, lng: -66.991 },
    MAR: { lat: 10.557, lng: -71.727 },
    PTY: { lat: 9.071, lng: -79.383 },
    BLB: { lat: 8.913, lng: -79.596 },
    SJO: { lat: 9.993, lng: -84.208 },
    LIR: { lat: 10.593, lng: -85.544 },
    SAL: { lat: 13.440, lng: -89.055 },
    GUA: { lat: 14.583, lng: -90.527 },
    SAP: { lat: 15.452, lng: -87.931 },
    MGA: { lat: 12.141, lng: -86.168 },
    HAV: { lat: 22.997, lng: -82.408 },
    SDQ: { lat: 18.429, lng: -69.668 },
    LRM: { lat: 18.450, lng: -68.911 },
    PUJ: { lat: 18.567, lng: -68.363 },
    SJU: { lat: 18.439, lng: -66.001 },
    KIN: { lat: 17.935, lng: -76.787 },
    PAP: { lat: 18.580, lng: -72.292 },
    FPO: { lat: 26.547, lng: -78.695 },
    POS: { lat: 10.595, lng: -61.337 },
    PBM: { lat: 5.452, lng: -55.191 },

    // Europe
    MAD: { lat: 40.483, lng: -3.567 },
    BCN: { lat: 41.297, lng: 2.083 },
    ZAZ: { lat: 41.666, lng: -1.041 },
    LIS: { lat: 38.774, lng: -9.135 },
    CDG: { lat: 49.009, lng: 2.547 },
    AMS: { lat: 52.310, lng: 4.768 },
    FRA: { lat: 50.033, lng: 8.570 },
    MUC: { lat: 48.353, lng: 11.775 },
    LGG: { lat: 50.637, lng: 5.443 },
    LUX: { lat: 49.623, lng: 6.204 },
    OST: { lat: 51.198, lng: 2.862 },
    BRU: { lat: 50.901, lng: 4.484 },
    LHR: { lat: 51.470, lng: -0.454 },
    DOV: { lat: 51.127, lng: 1.315 }, // Dover UK approx
    MXP: { lat: 45.630, lng: 8.723 },
    NAP: { lat: 40.884, lng: 14.290 },
    BUD: { lat: 47.436, lng: 19.232 },
    WAW: { lat: 52.167, lng: 20.967 },
    SZY: { lat: 53.483, lng: 20.938 },
    ATH: { lat: 37.936, lng: 23.944 },
    IST: { lat: 41.275, lng: 28.751 },
    KEF: { lat: 63.985, lng: -22.605 },
    OSL: { lat: 60.197, lng: 11.100 },
    ORB: { lat: 59.223, lng: 15.039 },
    
    // Asia & Middle East
    DOH: { lat: 25.273, lng: 51.608 },
    DXB: { lat: 25.253, lng: 55.365 },
    DWC: { lat: 24.896, lng: 55.161 },
    HKG: { lat: 22.308, lng: 113.918 },
    PVG: { lat: 31.144, lng: 121.808 },
    CAN: { lat: 23.392, lng: 113.298 },
    CGO: { lat: 34.519, lng: 113.840 },
    SZX: { lat: 22.639, lng: 113.810 },
    NRT: { lat: 35.772, lng: 140.393 },
    NGO: { lat: 34.858, lng: 136.804 },
    CTS: { lat: 42.775, lng: 141.692 },
    ICN: { lat: 37.460, lng: 126.440 },
    KHV: { lat: 48.527, lng: 135.167 },
    HRB: { lat: 45.623, lng: 126.250 },
    TYN: { lat: 37.746, lng: 112.628 }
  };

  const dom = {
    loading: pane.querySelector('#frecuencias-cargo-loading'),
    content: pane.querySelector('#frecuencias-cargo-content'),
    error: pane.querySelector('#frecuencias-cargo-error'),
    weekLabel: pane.querySelector('[data-week-label]'),
    weekRange: pane.querySelector('[data-week-range]'),
    lastUpdated: pane.querySelector('[data-last-updated]'),
    kpis: {
      flights: pane.querySelector('[data-kpi="flights"]'),
      destinations: pane.querySelector('[data-kpi="destinations"]'),
      airlines: pane.querySelector('[data-kpi="airlines"]')
    },
    kpiNotes: {
      flights: pane.querySelector('[data-kpi-note="flights"]'),
      destinations: pane.querySelector('[data-kpi-note="destinations"]'),
      airlines: pane.querySelector('[data-kpi-note="airlines"]')
    },
    filters: {
      airline: pane.querySelector('#frecuencias-cargo-airline-filter'),
      destination: pane.querySelector('#frecuencias-cargo-destination-filter'),
      day: null,
      search: pane.querySelector('#frecuencias-cargo-search')
    },
    resetFilters: pane.querySelector('#frecuencias-cargo-reset-filters'),
    excelButton: pane.querySelector('#frecuencias-cargo-download-excel'),
    whatsappButton: pane.querySelector('#frecuencias-cargo-copy-whatsapp'), // Capture button reference
    // activeFilters: pane.querySelector('#frecuencias-active-filters'),
    dowList: pane.querySelector('#frecuencias-cargo-dow-list'),
    mapContainer: pane.querySelector('#frecuencias-cargo-map'),
    mapEmpty: pane.querySelector('#frecuencias-cargo-map-empty'),
    fitButton: pane.querySelector('#frecuencias-cargo-fit-map'),
    tableBody: pane.querySelector('#frecuencias-cargo-destinos-table tbody'),
    tableCount: pane.querySelector('#frecuencias-cargo-table-count'),
    mapCol: pane.querySelector('#frecuencias-cargo-map-col'),
    detailsCol: pane.querySelector('#frecuencias-cargo-details-col'),
    detailsTitle: pane.querySelector('#frecuencias-cargo-details-title'),
    detailsBody: pane.querySelector('#frecuencias-cargo-details-body'),
    detailsClose: pane.querySelector('#frecuencias-cargo-details-close')
  };

  const state = {
    raw: null,
    destinations: [],
    filtered: [],
    filters: { airline: 'all', destination: 'all', search: '' },
    uniqueAirlines: [],
    map: null,
    markerLayer: null,
    planeLayer: null,
    animationFrameId: null,
    animationTimeoutId: null
  };

  document.addEventListener('DOMContentLoaded', init);
  
  window.reloadFrecuenciasCargo = init;

  document.addEventListener('shown.bs.tab', evt => {
    if (evt.target && evt.target.id === 'frecuencias-cargo-tab') {
      setTimeout(() => {
        state.map?.invalidateSize();
        fitMapToData();
        if (state.filtered && state.filtered.length > 0) {
            animatePlanes(state.filtered);
        }
      }, 200);
    }
  });

  async function init(){
    prepareFilterSkeletons();
    showLoading(true);
    try {
      let data;
      try {
        const dbData = await window.dataManager.getWeeklyFrequenciesCargo();
        data = transformDBData(dbData);
      } catch (e) {
        console.warn('Database fetch failed for Cargo');
        throw e;
      }

      state.raw = data;
      state.destinations = normalizeDestinations(data?.destinations || []);
      state.uniqueAirlines = collectAirlines(state.destinations);
      populateFilters();
      updateMeta(data);
      renderKPIs();
      applyFilters();
      await ensureLeaflet();
      initMap();
      renderMap();

      showLoading(false);
      dom.content?.classList.remove('d-none');
      
      requestAnimationFrame(() => {
          state.map?.invalidateSize();
          fitMapToData();
      });
    } catch (err) {
        console.error('Frecuencias Cargo automation error:', err);
        showError('No se pudo cargar la información de frecuencias de carga.');
        showLoading(false);
    }
    wireInteractions();
  }

  function transformDBData(rows) {
      if (!rows || rows.length === 0) return { weekLabel: '', validFrom: '', validTo: '', destinations: [] };
      
      const groups = {};
      rows.forEach(row => {
          const key = row.week_label;
          if (!groups[key]) {
              groups[key] = {
                  rows: [],
                  validFrom: new Date(row.valid_from),
                  validTo: new Date(row.valid_to || row.valid_from)
              };
          }
          groups[key].rows.push(row);
      });

      // Sort by validFrom descending
      const sortedKeys = Object.keys(groups).sort((a, b) => {
          return groups[b].validFrom - groups[a].validFrom;
      });

      let selectedKey = sortedKeys[0];
      if (!selectedKey) selectedKey = Object.keys(groups)[0];

      const selectedGroup = groups[selectedKey];
      const selectedRows = selectedGroup.rows;
      const first = selectedRows[0];

      const weekLabel = first.week_label;
      const validFrom = first.valid_from;
      
      const dFrom = new Date(validFrom + 'T00:00:00');
      const dTo = new Date(dFrom);
      dTo.setDate(dFrom.getDate() + 6);
      
      const year = dTo.getFullYear();
      const month = String(dTo.getMonth() + 1).padStart(2, '0');
      const day = String(dTo.getDate()).padStart(2, '0');
      const validTo = `${year}-${month}-${day}`;
      
      const destinationsMap = {};
      
      selectedRows.forEach(row => {
          // Unique key for destination: city + iata (sometimes multi-airport cities)
          if (!destinationsMap[row.iata]) {
              destinationsMap[row.iata] = {
                  routeId: row.route_id,
                  city: row.city,
                  state: row.state,
                  iata: row.iata,
                  airports: [row.iata],
                  airlines: []
              };
          }
          
          destinationsMap[row.iata].airlines.push({
              name: row.airline,
              logo: row.logo,
              color: row.color,
              daily: {
                  L: row.monday,
                  M: row.tuesday,
                  X: row.wednesday,
                  J: row.thursday,
                  V: row.friday,
                  S: row.saturday,
                  D: row.sunday
              },
              dailyDetails: {
                  L: row.monday_detail,
                  M: row.tuesday_detail,
                  X: row.wednesday_detail,
                  J: row.thursday_detail,
                  V: row.friday_detail,
                  S: row.saturday_detail,
                  D: row.sunday_detail
              },
              weeklyTotal: row.weekly_total
          });
      });
      
      return {
          weekLabel,
          validFrom,
          validTo,
          destinations: Object.values(destinationsMap)
      };
  }

  function prepareFilterSkeletons(){
    if (dom.filters.airline) dom.filters.airline.innerHTML = '<option value="all">Todas las aerolíneas</option>';
    if (dom.filters.destination) dom.filters.destination.innerHTML = '<option value="all">Todas las regiones</option>';
  }

  function wireInteractions(){
    // Listen for tab shown event to restart animation instantly
    const tabEl = document.getElementById('frecuencias-cargo-tab');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', () => {
            if (state.map) {
                state.map.invalidateSize();
                // Ensure bounds
                const bounds = [[AIFA_COORDS.lat, AIFA_COORDS.lng]]; 
                state.destinations.forEach(d => {
                    if (d.coords) bounds.push([d.coords.lat, d.coords.lng]);
                });
                if (bounds.length > 1) {
                    state.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 8 });
                }
            }
            animatePlanes(state.filtered);
        });
    }

    if (dom.filters.airline) dom.filters.airline.addEventListener('change', evt => {
      // Logic handled via logos, but keep listener if select used fallback
      state.filters.airline = evt.target.value || 'all';
      applyFilters();
    });
    if (dom.filters.destination) dom.filters.destination.addEventListener('change', evt => {
      state.filters.destination = evt.target.value || 'all';
      applyFilters();
    });
    if (dom.filters.search) {
      const onSearch = debounce(evt => {
        state.filters.search = (evt.target.value || '').trim().toLowerCase();
        applyFilters();
      }, 220);
      dom.filters.search.addEventListener('input', onSearch);
    }
    if (dom.resetFilters) dom.resetFilters.addEventListener('click', () => {
      state.filters = { airline: 'all', destination: 'all', search: '' };
      if (dom.filters.airline) dom.filters.airline.value = 'all';
      if (dom.filters.destination) dom.filters.destination.value = 'all';
      if (dom.filters.search) dom.filters.search.value = '';
      
      // Update active state in logos
      const container = pane.querySelector('#frecuencias-cargo-airline-logos');
      if (container) {
          container.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
          const btnAll = container.querySelector('[data-airline="all"]');
          if(btnAll) btnAll.classList.add('active');
      }

      applyFilters();
    });
    if (dom.excelButton) dom.excelButton.addEventListener('click', downloadExcel);
    
    // Updated WhatsApp logic integration
    if (dom.whatsappButton) {
        dom.whatsappButton.addEventListener('click', copyToWhatsApp);
    }

    if (dom.fitButton) {
      const header = dom.fitButton.parentNode;
      // Check if wrapper already exists
      if (!header.querySelector('.d-flex.gap-2')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'd-flex gap-2';
          header.insertBefore(wrapper, dom.fitButton);
          wrapper.appendChild(dom.fitButton);
          
          const resetMapBtn = document.createElement('button');
          resetMapBtn.className = 'btn btn-outline-secondary btn-sm d-none';
          resetMapBtn.innerHTML = '<i class="fas fa-undo me-1"></i>Mostrar todos';
          resetMapBtn.addEventListener('click', () => {
            state.filters.destination = 'all';
            if (dom.filters.destination) dom.filters.destination.value = 'all';
            applyFilters();
          });
          wrapper.appendChild(resetMapBtn);
          dom.resetMapBtn = resetMapBtn;
      }
      dom.fitButton.addEventListener('click', () => fitMapToData());
    }

    if (dom.detailsClose) {
      dom.detailsClose.addEventListener('click', () => {
        state.filters.destination = 'all';
        if (dom.filters.destination) dom.filters.destination.value = 'all';
        applyFilters();
      });
    }
  }

  function applyFilters(){
    const list = state.destinations
      .map(dest => projectDestination(dest))
      .filter(Boolean)
      .filter(dest => {
        if (state.filters.destination !== 'all' && dest.iata !== state.filters.destination) return false;
        if (state.filters.search) {
          if (!dest.searchText.includes(state.filters.search)) return false;
        }
        return true;
      });

    state.filtered = list;
    
    if (dom.resetMapBtn) {
      dom.resetMapBtn.classList.toggle('d-none', state.filters.destination === 'all');
    }

    const isSingleDest = state.filters.destination !== 'all';
    if (dom.mapCol && dom.detailsCol) {
        if (isSingleDest) {
            dom.mapCol.classList.remove('col-12');
            dom.mapCol.classList.add('col-lg-7');
            dom.detailsCol.classList.remove('d-none');
            const dest = state.destinations.find(d => d.iata === state.filters.destination);
            if (dest) renderDestinationDetails(dest);
        } else {
            dom.mapCol.classList.add('col-12');
            dom.mapCol.classList.remove('col-lg-7');
            dom.detailsCol.classList.add('d-none');
        }
        setTimeout(() => state.map?.invalidateSize(), 300);
    }

    renderDowSummary();
    renderTable();
    renderMap();
  }

  function renderKPIs(){
    const totalFlights = state.destinations.reduce((sum, dest) => sum + dest.weeklyTotal, 0);
    const totalDestinations = state.destinations.length;
    const totalAirlines = state.uniqueAirlines.length;
    if (dom.kpis.flights) dom.kpis.flights.textContent = intlNumber.format(totalFlights);
    if (dom.kpis.destinations) dom.kpis.destinations.textContent = intlNumber.format(totalDestinations);
    if (dom.kpis.airlines) dom.kpis.airlines.textContent = intlNumber.format(totalAirlines);

    const busiestDest = [...state.destinations].sort((a, b) => b.weeklyTotal - a.weeklyTotal)[0];
    if (busiestDest && dom.kpiNotes.flights) {
      dom.kpiNotes.flights.textContent = `${busiestDest.city} (${busiestDest.iata}) lidera con ${intlNumber.format(busiestDest.weeklyTotal)} frecuencias.`;
    }
  }

  function renderDowSummary(){
    if (!dom.dowList) return;
    const dataset = state.filtered.length ? state.filtered : state.destinations;
    dom.dowList.innerHTML = '';
    DAY_CODES.forEach((code, idx) => {
      const total = dataset.reduce((sum, dest) => sum + (dest.viewDailyTotals?.[idx] ?? dest.dailyTotals?.[idx] ?? 0), 0);
      
      const card = document.createElement('div');
      card.className = 'frecuencias-dow-card';
      // Same style logic as int/national
      card.style.cssText = `
        display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
        background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 12px 16px; 
        min-width: 140px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        transition: transform 0.2s, box-shadow 0.2s; flex: 1;
      `;
      card.onmouseover = () => { card.style.transform = 'translateY(-2px)'; };
      card.onmouseout = () => { card.style.transform = 'translateY(0)'; };

      const dayLabel = DAY_LABELS[code].toUpperCase();
      card.innerHTML = `
        <div style="font-size: 0.7rem; font-weight: 700; color: #6c757d; margin-bottom: 4px; letter-spacing: 0.5px;">${dayLabel}</div>
        <div style="font-size: 1.5rem; font-weight: 800; color: #DC3545; line-height: 1;">${intlNumber.format(total)}</div>
      `;
      dom.dowList.appendChild(card);
    });
  }

  function renderTable(){
    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = '';
    const dataset = state.filtered;
    if (!dataset.length) {
      dom.tableCount.textContent = '0 destinos listados';
      return;
    }
    dom.tableCount.textContent = `${dataset.length} destinos listados`;

    dataset.forEach(dest => {
      const base = (dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines) || [];
      const airlines = base.length ? base : [{ name: 'Sin datos', daily: Array(DAY_CODES.length).fill(0), weeklyTotal: 0 }];
      
      airlines.forEach((airline, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.destinationRow = dest.iata;
        
        const legacyConfig = AIRLINE_CONFIG[airline.slug] || AIRLINE_CONFIG['default'];
        const config = {
            logo: airline.logo || legacyConfig.logo,
            color: airline.color || legacyConfig.color,
            text: airline.color ? '#ffffff' : legacyConfig.text
        };
        
        tr.style.backgroundColor = config.color;
        tr.style.color = config.text;
        tr.style.setProperty('--bs-table-bg', 'transparent');
        tr.style.setProperty('--bs-table-accent-bg', 'transparent');

        tr.addEventListener('click', () => {
          focusDestination(dest.iata);
          if (dest.coords && state.map) {
            state.map.flyTo([dest.coords.lat, dest.coords.lng], Math.max(state.map.getZoom(), 6), { duration: 0.6 });
          }
        });

        if (idx === 0) {
          const tdId = document.createElement('td');
          tdId.rowSpan = airlines.length;
          tdId.style.backgroundColor = '#ffffff';
          tdId.style.color = '#212529';
          tdId.textContent = dest.routeId || dest.iata || '';
          tr.appendChild(tdId);

          const tdDest = document.createElement('td');
          tdDest.rowSpan = airlines.length;
          tdDest.style.backgroundColor = '#ffffff';
          tdDest.style.color = '#212529';
          const total = dest.viewWeeklyTotal ?? dest.weeklyTotal;
          tdDest.innerHTML = `
            <div class="frecuencias-dest-info">
                <strong>${dest.city}</strong>
                <span>${dest.state}</span>
                <div class="badge bg-light text-dark border mt-1" style="font-weight: normal;">${total} frec/sem</div>
            </div>`;
          tr.appendChild(tdDest);
        }

        const tdAirline = document.createElement('td');
        tdAirline.style.backgroundColor = '#ffffff';
        tdAirline.style.color = config.color;
        tdAirline.style.borderLeft = `12px solid ${config.color}`;
        
        if (config.logo) {
            let logoStyle = '';
            if (['mexicana', 'volaris', 'aeromexico'].includes(airline.slug)) {
                logoStyle = 'style="height: 50px; max-width: 140px;"';
            }
            tdAirline.innerHTML = `<img src="images/airlines/${config.logo}" alt="${airline.name}" title="${airline.name}" class="frecuencias-airline-logo airline-${airline.slug}" ${logoStyle}>`;
        } else {
            tdAirline.textContent = airline.name;
        }
        tr.appendChild(tdAirline);

        DAY_CODES.forEach((code, dayIdx) => {
          const tdDay = document.createElement('td');
          const count = airline.daily?.[dayIdx] ?? 0;
          const detail = airline.dailyDetails?.[dayIdx];
          
          tdDay.textContent = count > 0 ? count : '-';
          tdDay.style.backgroundColor = config.color;
          tdDay.style.color = '#ffffff';
          
          if (detail && count > 0) {
              tdDay.style.cursor = 'pointer';
              tdDay.title = 'Clic para ver horarios y números de vuelo';
              tdDay.style.textDecoration = 'underline dotted rgba(255,255,255,0.7)';
              
              tdDay.addEventListener('click', (e) => {
                  e.stopPropagation();
                  toggleFlightDetailsInCell(tdDay, count, detail);
              });
          }
          tr.appendChild(tdDay);
        });
        const tdTotal = document.createElement('td');
        tdTotal.textContent = intlNumber.format(airline.weeklyTotal);
        tdTotal.style.backgroundColor = config.color;
        tdTotal.style.color = '#ffffff';
        tr.appendChild(tdTotal);
        dom.tableBody.appendChild(tr);
      });
    });
  }

  function toggleFlightDetailsInCell(cell, count, detailHtml) {
      if (cell.dataset.view === 'detail') {
          cell.textContent = count;
          cell.dataset.view = 'count';
          cell.style.fontSize = '';
          cell.style.whiteSpace = '';
          cell.style.padding = '';
      } else {
          const flights = detailHtml.split('<br>');
          let html = '<div class="d-flex flex-column gap-1 text-start" style="min-width: 80px;">';
          flights.forEach(f => {
             const parts = f.trim().split(' ');
             const flightNum = parts[0] || '';
             const time = parts.slice(1).join(' ') || '';
             html += `
                <div class="px-2 py-1 rounded d-flex justify-content-between align-items-center bg-white bg-opacity-25" style="font-size: 0.75rem; color: inherit;">
                    <span class="fw-bold me-1">${flightNum}</span>
                    <span class="font-monospace small opacity-75">${time}</span>
                </div>`;
          });
          html += '</div>';

          cell.innerHTML = html;
          cell.dataset.view = 'detail';
          cell.style.fontSize = '0.75rem';
          cell.style.whiteSpace = 'normal';
          cell.style.padding = '4px 6px';
      }
  }

  function renderDestinationDetails(dest) {
    if (!dom.detailsTitle || !dom.detailsBody) return;
    dom.detailsTitle.textContent = `${dest.city} (${dest.iata})`;
    
    const projected = projectDestination(dest);
    if (!projected) {
        dom.detailsBody.innerHTML = '<div class="p-3 text-muted">No hay vuelos con los filtros actuales.</div>';
        return;
    }
    dom.detailsBody.innerHTML = '';

    const abbrs = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const dateLabels = abbrs.map((d, i) => {
        if (state.raw?.validFrom) {
            const date = new Date(state.raw.validFrom + 'T00:00:00');
            date.setDate(date.getDate() + i);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${d}<br><span style="font-size: 0.65rem;">${day}/${month}</span>`;
        }
        return d;
    });

    projected.viewAirlines.forEach(air => {
        const legacyConfig = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
        const config = {
            logo: air.logo || legacyConfig.logo,
            color: air.color || legacyConfig.color,
            text: air.color ? '#ffffff' : legacyConfig.text
        };
        let logoStyle = 'height: 32px; width: auto;';
        if (['mexicana', 'volaris', 'aeromexico'].includes(air.slug)) {
            logoStyle = 'height: 65px; width: auto;';
        }

        const headerContent = config.logo 
            ? `<img src="images/airlines/${config.logo}" alt="${air.name}" style="${logoStyle}" title="${air.name}">`
            : `<strong style="color: #212529;">${air.name}</strong>`;
        
        const card = document.createElement('div');
        card.className = 'list-group-item p-3';

        const header = document.createElement('div');
        header.className = 'd-flex align-items-center justify-content-between mb-3';
        header.innerHTML = `<div>${headerContent}</div>
            <div class="badge bg-danger rounded-pill px-3 py-2">${air.weeklyTotal} frec/sem</div>`;
        card.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'd-flex gap-1 justify-content-between';

        DAY_CODES.forEach((code, idx) => {
            const count = air.daily[idx];
            const detail = air.dailyDetails?.[idx];
            const isActive = count > 0;
            
            const cell = document.createElement('div');
            cell.className = `text-center rounded p-1 flex-fill ${isActive ? 'bg-danger-subtle border border-danger-subtle' : 'bg-light border border-light'}`;
            cell.style.minWidth = '35px';
            
            const dateDiv = document.createElement('div');
            dateDiv.className = `small ${isActive ? 'text-danger fw-semibold' : 'text-muted opacity-50'}`;
            dateDiv.style.fontSize = '0.7rem';
            dateDiv.innerHTML = dateLabels[idx];
            cell.appendChild(dateDiv);

            const contentDiv = document.createElement('div');
            contentDiv.className = isActive ? 'text-danger fw-bold' : 'text-muted opacity-25';
            contentDiv.style.fontSize = '1.1rem';
            contentDiv.textContent = isActive ? count : '0';
            cell.appendChild(contentDiv);

            if (isActive && detail) {
                cell.style.cursor = 'pointer';
                cell.onclick = (e) => {
                    e.stopPropagation();
                    const isExpanded = contentDiv.dataset.view === 'detail';
                    if (isExpanded) {
                        contentDiv.textContent = count;
                        contentDiv.dataset.view = 'count';
                    } else {
                        const flights = detail.split('<br>');
                        let listHtml = '<div class="d-flex flex-column gap-1 text-start mt-1">';
                        flights.forEach(f => {
                            const parts = f.trim().split(' ');
                            // Check for arrival/departure indicator in the string
                            let icon = '';
                            let typeClass = '';
                            if (f.includes('(Sal)') || f.includes('(Dep)')) {
                                icon = '<i class="fas fa-plane-departure text-warning me-1" title="Salida"></i>';
                                typeClass = 'border-warning-subtle';
                            } else if (f.includes('(Lleg)') || f.includes('(Arr)')) {
                                icon = '<i class="fas fa-plane-arrival text-success me-1" title="Llegada"></i>';
                                typeClass = 'border-success-subtle';
                            }

                            // Reconstruct display text removing the raw (Sal)/(Lleg) for cleaner look?
                            // Or keep it. Let's keep it but prepend icon.
                            // parts[0] is typically FlightNum, parts[1] is (Sal)/(Lleg), parts[2] is Time
                            
                            const displayFlight = parts[0]; 
                            const displayTime = parts.length > 2 ? parts.slice(2).join(' ') : (parts.length > 1 ? parts[1] : '');
                            
                            // If we identified direction, maybe we can format nicely
                            let contentHtml = f;
                            if (icon) {
                                // Clean up the raw text if we rely on icon
                                const cleanText = f.replace('(Sal)', '').replace('(Lleg)', '').replace('(Dep)', '').replace('(Arr)', '').trim();
                                contentHtml = `${icon} <span>${cleanText}</span>`;
                            }

                            listHtml += `<div class="p-1 rounded bg-white border ${typeClass} small">${contentHtml}</div>`;
                        });
                        listHtml += '</div>';
                        contentDiv.innerHTML = listHtml;
                        contentDiv.dataset.view = 'detail';
                    }
                };
            }
            grid.appendChild(cell);
        });

        card.appendChild(grid);
        dom.detailsBody.appendChild(card);
    });
  }

  function renderMap(){
    if (!state.map || !state.markerLayer) return;
    state.markerLayer.clearLayers();
    
    // AIFA Pin
    const aifaIcon = L.divIcon({
        className: 'frecuencia-aifa-marker',
        html: '<div class="aifa-pin"><img src="images/logo_aifa.jpg" alt="AIFA" class="aifa-logo-pin"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    L.marker([AIFA_COORDS.lat, AIFA_COORDS.lng], { icon: aifaIcon, zIndexOffset: 3000 }).addTo(state.markerLayer);

    const dataset = state.filtered;
    dataset.forEach(dest => {
      if (!dest.coords) return;
      const total = dest.viewWeeklyTotal ?? dest.weeklyTotal;
      const icon = buildMarkerIcon(total);
      const marker = L.marker([dest.coords.lat, dest.coords.lng], { icon }).addTo(state.markerLayer);
      marker.bindTooltip(`${dest.city} (${dest.iata})`);
      marker.on('click', () => filterByDestination(dest.iata));
    });
    animatePlanes(dataset);
  }

  function animatePlanes(dataset){
    if (!state.map || !state.planeLayer) return;
    state.planeLayer.clearLayers();
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    if (state.animationTimeoutId) clearTimeout(state.animationTimeoutId);

    const validDestinations = dataset.filter(d => d.coords && (d.viewWeeklyTotal ?? d.weeklyTotal) > 0);
    if (!validDestinations.length) return;

    let currentIndex = 0;
    let currentPlane = null;
    let currentLine = null;
    let startTime = 0;
    const duration = 5000;

    function startNextFlight(){
        if (currentIndex >= validDestinations.length) currentIndex = 0;
        const dest = validDestinations[currentIndex];
        const start = L.latLng(AIFA_COORDS.lat, AIFA_COORDS.lng);
        const end = L.latLng(dest.coords.lat, dest.coords.lng);
        const pathPoints = getGeodesicPath(start, end);

        if (currentLine) state.planeLayer.removeLayer(currentLine);
        currentLine = L.polyline(pathPoints, { color: '#dc3545', weight: 2, opacity: 0.4, dashArray: '5, 10' }).addTo(state.planeLayer);

        const planeSvg = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:100%;height:100%;display:block;">
             <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
        </svg>`;

        const icon = L.divIcon({
            className: 'frecuencia-plane-icon',
            // Asegurar centrado del icono y mantener color rojo (text-danger) (#dc3545)
            // SVG apunta UP por defecto.
            html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#dc3545;">
                    ${planeSvg}
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        
        if (currentPlane) state.planeLayer.removeLayer(currentPlane);
        // zIndexOffset 2000 para visibilidad máxima
        currentPlane = L.marker(start, { icon, zIndexOffset: 2000, interactive: false }).addTo(state.planeLayer);

        // Estado para suavizado de rotación
        let lastAngle = null;

        startTime = performance.now();
        requestAnimationFrame((now) => animate(now, pathPoints, lastAngle));
    }

    function animate(now, pathPoints, prevAngle){
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const totalSegments = pathPoints.length - 1;
        const segmentFloat = t * totalSegments;
        const segmentIndex = Math.floor(segmentFloat);
        const segmentT = segmentFloat - segmentIndex;

        let lat, lng;
        if (segmentIndex >= totalSegments) {
             lat = pathPoints[totalSegments].lat;
             lng = pathPoints[totalSegments].lng;
        } else {
             const p1 = pathPoints[segmentIndex];
             const p2 = pathPoints[segmentIndex + 1];
             lat = p1.lat + (p2.lat - p1.lat) * segmentT;
             lng = p1.lng + (p2.lng - p1.lng) * segmentT;
        }
        currentPlane.setLatLng([lat, lng]);

        // Rotación Visual (Screen Projection) con suavizado
        let currentVisualAngle = prevAngle;

        if (segmentIndex < totalSegments) {
            const p1 = pathPoints[segmentIndex];
            const p2 = pathPoints[segmentIndex + 1];
            
            let targetAngle = null;

            if (state.map) {
                const pp1 = state.map.latLngToContainerPoint(p1);
                const pp2 = state.map.latLngToContainerPoint(p2);
                const dy = pp2.y - pp1.y;
                const dx = pp2.x - pp1.x;
                
                if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                     const theta = Math.atan2(dy, dx) * 180 / Math.PI;
                     targetAngle = theta + 90;
                }
            } else {
                 const dy = p2.lat - p1.lat;
                 const dx = p2.lng - p1.lng;
                 const theta = Math.atan2(dy, dx) * 180 / Math.PI;
                 targetAngle = 90 - theta;
            }

            if (targetAngle !== null) {
                if (currentVisualAngle === null || currentVisualAngle === undefined) {
                    currentVisualAngle = targetAngle;
                } else {
                    let diff = targetAngle - currentVisualAngle;
                    while (diff < -180) diff += 360;
                    while (diff > 180) diff -= 360;
                    currentVisualAngle += diff * 0.1;
                }
            }
        }
        
        const iconContainer = currentPlane.getElement()?.querySelector('div');
        const svgEl = iconContainer?.querySelector('svg');
        if (svgEl && currentVisualAngle !== null) {
             svgEl.style.transform = `rotate(${currentVisualAngle}deg)`;
        }

        if (t < 1) {
            state.animationFrameId = requestAnimationFrame((nextNow) => animate(nextNow, pathPoints, currentVisualAngle));
        } else {
            // Cuando termina un vuelo
            state.animationTimeoutId = setTimeout(() => {
                if (currentPlane) state.planeLayer.removeLayer(currentPlane);
                if (currentLine) state.planeLayer.removeLayer(currentLine);
                currentIndex++;
                startNextFlight();
            }, 1000); // 1 sec pause
        }
    }
    
    function getGeodesicPath(start, end, numPoints = 100) {
        // Simple linear interpolation is visually enough for flat maps but geodesic is cooler
        // Using simple linear for now to save bytes, or reusing the logic
        // Reusing logic from int file
        const lat1 = start.lat * Math.PI / 180;
        const lon1 = start.lng * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        const lon2 = end.lng * Math.PI / 180;
        const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat2 - lat1) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)));
        const path = [];
        for (let i = 0; i <= numPoints; i++) {
            const f = i / numPoints;
            const A = Math.sin((1 - f) * d) / Math.sin(d);
            const B = Math.sin(f * d) / Math.sin(d);
            const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
            const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
            const z = A * Math.sin(lat1) + B * Math.sin(lat2);
            const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
            const lon = Math.atan2(y, x);
            path.push(L.latLng(lat * 180 / Math.PI, lon * 180 / Math.PI));
        }
        return path;
    }

    startNextFlight();
  }

  function buildMarkerIcon(total){
    return L.divIcon({
      className: 'frecuencia-pin-marker',
      html: `<div class="pin-content bg-danger"><i class="fas fa-box"></i><span>${total}</span></div>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      tooltipAnchor: [0, -35]
    });
  }

  function filterByDestination(iata){
    state.filters.destination = iata;
    if (dom.filters.destination) dom.filters.destination.value = iata;
    applyFilters();
  }

  function focusDestination(iata){
    const row = dom.tableBody?.querySelector(`[data-destination-row="${iata}"]`);
    if (!row) return;
    dom.tableBody.querySelectorAll('.frecuencias-row-highlight').forEach(r => r.classList.remove('frecuencias-row-highlight'));
    row.classList.add('frecuencias-row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const dest = state.destinations.find(d => d.iata === iata);
    if (dest) animatePlanes([dest]);
  }

  function fitMapToData(){
    if (!state.map || !state.destinations.length) return;
    if (dom.mapContainer && (dom.mapContainer.clientWidth === 0 || dom.mapContainer.clientHeight === 0)) return;
    const bounds = [[AIFA_COORDS.lat, AIFA_COORDS.lng]];
    state.destinations.forEach(d => { if (d.coords) bounds.push([d.coords.lat, d.coords.lng]); });
    state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
  }

  function normalizeDestinations(list){
    return list.map(dest => {
      const airlines = (dest.airlines || []).map(air => normalizeAirline(air)).filter(Boolean);
      const weeklyTotal = airlines.reduce((sum, air) => sum + air.weeklyTotal, 0);
      const dailyTotals = DAY_CODES.map((_, idx) => airlines.reduce((sum, air) => sum + (air.daily[idx] || 0), 0));
      
      let cityName = toTitleCase(dest.city) || 'Sin ciudad';
      let stateName = toTitleCase(dest.state) || '';
      
      if (IATA_LOCATIONS[dest.iata]) {
          cityName = IATA_LOCATIONS[dest.iata].city;
          stateName = IATA_LOCATIONS[dest.iata].country;
      }

      const searchText = `${cityName} ${stateName} ${dest.iata} ${airlines.map(a => a.name).join(' ')}`.toLowerCase();
      return {
        routeId: dest.routeId,
        city: cityName,
        state: stateName,
        iata: dest.iata || '—',
        airlines,
        weeklyTotal,
        dailyTotals,
        coords: AIRPORT_COORDS[dest.iata] || null,
        searchText
      };
    });
  }

  function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
  }

  function normalizeAirline(air){
    const daily = DAY_CODES.map(code => Number(air?.daily?.[code] ?? 0));
    const dailyDetails = DAY_CODES.map(code => air?.dailyDetails?.[code] || ''); 
    const weeklyTotal = Number(air?.weeklyTotal) || daily.reduce((sum, val) => sum + val, 0);
    return {
      name: air?.name || 'Sin aerolínea',
      slug: slugify(air?.name || 'sin-aerolinea'),
      logo: air?.logo,
      color: air?.color,
      daily,
      dailyDetails,
      weeklyTotal
    };
  }

  function projectDestination(dest){
    const airlines = state.filters.airline === 'all'
      ? dest.airlines
      : dest.airlines.filter(air => air.slug === state.filters.airline);
    if (!airlines.length && state.filters.airline !== 'all') return null;
    const viewWeekly = airlines.reduce((sum, air) => sum + air.weeklyTotal, 0);
    const viewDaily = DAY_CODES.map((_, idx) => airlines.reduce((sum, air) => sum + (air.daily[idx] || 0), 0));
    return { ...dest, viewAirlines: airlines, viewWeeklyTotal: viewWeekly, viewDailyTotals: viewDaily };
  }

  function collectAirlines(destinations){
    const map = new Map();
    destinations.forEach(dest => {
      dest.airlines.forEach(air => {
        if (!map.has(air.slug)) {
          map.set(air.slug, { name: air.name, total: 0 });
        }
        map.get(air.slug).total += (air.weeklyTotal || 0);
      });
    });
    return [...map.entries()]
      .map(([slug, data]) => ({ slug, name: data.name, total: data.total }))
      .sort((a, b) => b.total - a.total);
  }

  function populateFilters(){
    if (dom.filters.airline) {
        dom.filters.airline.style.display = 'none';
        let logoContainer = pane.querySelector('#frecuencias-cargo-airline-logos');
        // If container doesn't exist (it should from static HTML? No, we likely need to create it)
        // Similar to int logic
        if (!logoContainer) {
            logoContainer = document.createElement('div');
            logoContainer.id = 'frecuencias-cargo-airline-logos';
            logoContainer.className = 'airline-filter-toolbar mb-3';
            dom.filters.airline.parentNode.insertBefore(logoContainer, dom.filters.airline.nextSibling);
        }
        logoContainer.innerHTML = '';
        
        const btnAll = document.createElement('button');
        btnAll.className = 'airline-filter-btn active';
        btnAll.textContent = 'Todas';
        btnAll.dataset.airline = 'all';
        btnAll.onclick = () => selectAirlineFilter('all', btnAll);
        logoContainer.appendChild(btnAll);

        const sortedAirlines = [...state.uniqueAirlines].sort((a,b) => a.name.localeCompare(b.name));
        sortedAirlines.forEach(air => {
            const config = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
            const btn = document.createElement('button');
            btn.className = 'airline-filter-btn'; 
            btn.dataset.airline = air.slug;
            btn.title = air.name;
            if (config.logo) {
                 btn.innerHTML = `<img src="images/airlines/${config.logo}" alt="${air.name}" style="height: 20px; width: auto; object-fit: contain;">`;
            } else {
                btn.textContent = air.name;
            }
            btn.onclick = () => selectAirlineFilter(air.slug, btn);
            logoContainer.appendChild(btn);
        });
    }

    if (dom.filters.destination) {
      dom.filters.destination.innerHTML = '<option value="all">Todos los destinos</option>';
      [...state.destinations]
        .sort((a, b) => a.city.localeCompare(b.city, 'es-MX'))
        .forEach(dest => {
          const opt = document.createElement('option');
          opt.value = dest.iata;
          opt.textContent = `${dest.city} (${dest.iata})`;
          dom.filters.destination.appendChild(opt);
        });
    }
  }

  function selectAirlineFilter(slug, btnElement) {
      state.filters.airline = slug;
      if (dom.filters.airline) dom.filters.airline.value = slug; 
      const container = pane.querySelector('#frecuencias-cargo-airline-logos');
      if (container) {
          container.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
          btnElement.classList.add('active');
      }
      applyFilters();
  }

  function updateMeta(data){
    if (dom.weekLabel) dom.weekLabel.textContent = data?.weekLabel ? data.weekLabel : 'Semana sin etiqueta';
    if (dom.weekRange && data?.validFrom && data?.validTo) {
        dom.weekRange.textContent = formatDateRangeDetailed(data.validFrom, data.validTo);
    }
    if (dom.lastUpdated) dom.lastUpdated.textContent = `Generado el ${intlDate.format(new Date())}`;
    
    if (data?.validFrom) {
         updateTableHeaders(data.validFrom);
    }
  }

  // Reuse same date formatting logic
  function formatDateRangeDetailed(startStr, endStr) {
      const parseDateParts = (str) => {
          const d = new Date(str + 'T00:00:00');
          return { day: d.getDate().toString().padStart(2, '0'), month: d.toLocaleString('es-MX', { month: 'long' }), year: d.getFullYear() };
      };
      const start = parseDateParts(startStr);
      const end = parseDateParts(endStr);
      if (start.year === end.year && start.month === end.month) return `Del ${start.day} al ${end.day} de ${start.month} de ${start.year}`;
      if (start.year === end.year) return `Del ${start.day} de ${start.month} al ${end.day} de ${end.month} de ${start.year}`;
      return `Del ${start.day} de ${start.month} de ${start.year} al ${end.day} de ${end.month} de ${end.year}`;
  }

  function updateTableHeaders(startDateInput) {
      if (!startDateInput) return;
      const startDate = new Date(startDateInput + 'T00:00:00');
      if (isNaN(startDate.getTime())) return;
      const headers = dom.tableBody.closest('table').querySelectorAll('thead th');
      if (headers[0]) headers[0].style.width = '8%';
      if (headers[1]) headers[1].style.width = '15%';
      if (headers[2]) headers[2].style.width = '15%';
      if (headers[10]) headers[10].style.width = '7%';

      DAY_CODES.forEach((code, i) => {
          const colIndex = i + 3;
          if (headers[colIndex]) {
              const current = new Date(startDate);
              current.setDate(current.getDate() + i);
              const day = current.getDate().toString().padStart(2, '0');
              const month = (current.getMonth() + 1).toString().padStart(2, '0');
              const year = current.getFullYear().toString().slice(-2);
              const dateStr = `${day}/${month}/${year}`;
              headers[colIndex].innerHTML = `<div class="d-flex flex-column align-items-center" style="line-height:1.1;">
                <span>${DAY_LABELS[code]}</span><span class="text-muted fw-normal mt-1" style="font-size: 0.75rem;">${dateStr}</span></div>`;
          }
      });
  }

  function showLoading(isLoading){
    if (dom.loading) dom.loading.classList.toggle('d-none', !isLoading);
  }

  function showError(message){
    if (dom.error) {
        dom.error.textContent = message;
        dom.error.classList.remove('d-none');
    }
  }

  async function ensureLeaflet(){
    if (window.L && document.getElementById('leaflet-css')) return;
    if (window.__leafletLoading) return window.__leafletLoading;
    window.__leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return window.__leafletLoading;
  }

  function initMap(){
    if (!dom.mapContainer || state.map) return;
    state.map = L.map(dom.mapContainer, { attributionControl: false }).setView([23.5, -101.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.planeLayer = L.layerGroup().addTo(state.map);

    const resizeObserver = new ResizeObserver(() => {
        if (state.map) {
            state.map.invalidateSize();
            if (state.destinations.length > 0) setTimeout(() => fitMapToData(), 100);
        }
    });
    resizeObserver.observe(dom.mapContainer);
  }

  function debounce(fn, wait){
    let timeout;
    return function(...args){
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  async function copyToWhatsApp() {
      if (!state.filtered || state.filtered.length === 0) {
          alert('No hay datos para copiar.');
          return;
      }
      
      const title = `*Programación de Carga - AIFA* ✈️📦\n${dom.weekLabel.innerText}\n\n`;
      let body = '';

      state.filtered.forEach(dest => {
          const destName = `${dest.city} (${dest.iata})`;
          
          let airlinesText = '';
          const airlines = (dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines) || [];
          
          airlines.forEach(air => {
              const airName = air.name;
              // Clean details: e.g. "VB123 14:05<br>VB456" -> "VB123 14:05, VB456..."
              const details = air.dailyDetails.map((det, idx) => {
                 if (!det) return null;
                 const day = DAY_CODES[idx];
                 const cleanDet = det.replace(/<br>/g, ', ');
                 return `${day}: ${cleanDet}`; 
              }).filter(Boolean).join('\n   ');
              
              airlinesText += `🔹 *${airName}* (${air.weeklyTotal} frec)\n   ${details}\n`;
          });

          body += `📍 *${destName}*\n${airlinesText}\n`;
      });

      const footer = `\n_Generado automáticamente por AIFA Operaciones_`;
      const fullText = title + body + footer;

      try {
          await navigator.clipboard.writeText(fullText);
          alert('Información copiada al portapapeles para WhatsApp.');
      } catch (err) {
          console.error('Error al copiar:', err);
          alert('Error al copiar texto.');
      }
  }

  async function downloadExcel() {
    if (!state.filtered || state.filtered.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    // Excel logic reused or simplified
    // ... For brevity, copying the structure from Inteernational but assuming ExcelJS is available
    // Refer to frequencies_auto_int.js for full implementation if needed. 
    // Implementing basic export here
    // But since the user likes the Excel format, I should probably copy it verbatim
    // I will include the full excel logic.
    
    // (Excel Code Block from previous file adapted for Cargo)
    let headers = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    if (state.raw && state.raw.validFrom) {
        const start = new Date(state.raw.validFrom + 'T00:00:00');
        headers = headers.map((day, idx) => {
            const d = new Date(start);
            d.setDate(d.getDate() + idx);
            return `${day} ${d.getDate()}/${d.getMonth()+1}`;
        });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Frecuencias Carga');

    worksheet.columns = [
        { header: 'Id Ruta', key: 'id', width: 12 },
        { header: 'Destino', key: 'dest', width: 25 },
        { header: 'Aerolínea', key: 'airline', width: 50 },
        { header: headers[0], key: 'd1', width: 12 },
        { header: headers[1], key: 'd2', width: 12 },
        { header: headers[2], key: 'd3', width: 12 },
        { header: headers[3], key: 'd4', width: 12 },
        { header: headers[4], key: 'd5', width: 12 },
        { header: headers[5], key: 'd6', width: 12 },
        { header: headers[6], key: 'd7', width: 12 },
        { header: 'Total', key: 'total', width: 12 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1F44' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 30;

    const imageCache = {};
    const fetchImage = async (url) => {
        if (imageCache[url]) return imageCache[url];
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            imageCache[url] = buffer;
            return buffer;
        } catch (e) { return null; }
    };

    for (const dest of state.filtered) {
        const airlines = (dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines) || [];
        const usedAirlines = airlines.length ? airlines : [{ name: 'Sin datos', daily: Array(7).fill(0), weeklyTotal: 0 }];
        const startRow = worksheet.rowCount + 1;

        for (const airline of usedAirlines) {
            const slug = airline.slug || slugify(airline.name || 'default');
            const legacyConfig = AIRLINE_CONFIG[slug] || AIRLINE_CONFIG['default'];
            const config = {
                logo: airline.logo || legacyConfig.logo,
                color: airline.color || legacyConfig.color,
                text: airline.color ? '#ffffff' : legacyConfig.text
            };
            
            const rowValues = {
                id: dest.routeId || dest.iata || '',
                dest: dest.city || dest.name,
                airline: config.logo ? '' : airline.name,
                d1: formatVal(airline.daily?.[0]),
                d2: formatVal(airline.daily?.[1]),
                d3: formatVal(airline.daily?.[2]),
                d4: formatVal(airline.daily?.[3]),
                d5: formatVal(airline.daily?.[4]),
                d6: formatVal(airline.daily?.[5]),
                d7: formatVal(airline.daily?.[6]),
                total: airline.weeklyTotal
            };

            const row = worksheet.addRow(rowValues);
            row.height = 60; 

            row.eachCell({ includeEmpty: true }, (cell) => {
                 cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                 cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            const airlineColorHex = 'FF' + config.color.replace('#', '');
            const airlineTextHex = 'FF' + config.text.replace('#', '');

            [1, 2, 3].forEach(c => {
                const cell = row.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.font = { color: { argb: 'FF000000' }, bold: c === 1 }; 
                cell.alignment = { horizontal: c === 2 ? 'left' : 'center', vertical: 'middle', wrapText: true };
            });

            for (let c = 4; c <= 10; c++) {
                const cell = row.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: airlineColorHex } };
                cell.font = { color: { argb: airlineTextHex }, bold: false };
            }
            const totalCell = row.getCell(11);
            totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            totalCell.font = { color: { argb: 'FF000000' }, bold: true };

            if (config.logo) {
                const imageUrl = `images/airlines/${config.logo}`;
                const imgBuffer = await fetchImage(imageUrl);
                if (imgBuffer) {
                    const imageId = workbook.addImage({ buffer: imgBuffer, extension: 'png' });
                    worksheet.addImage(imageId, {
                        tl: { col: 2.20, row: row.number - 0.85 }, 
                        br: { col: 2.80, row: row.number - 0.15 },
                        editAs: 'oneCell'
                    });
                } else {
                     row.getCell(3).value = airline.name;
                }
            }
        }
        if (usedAirlines.length > 1) {
            const endRow = worksheet.rowCount;
            worksheet.mergeCells(`A${startRow}:A${endRow}`);
            worksheet.mergeCells(`B${startRow}:B${endRow}`);
        }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Frecuencias_Carga_AIFA.xlsx');
  }

  function formatVal(v) { return (v && v > 0) ? v : '-'; }

  function slugify(str){
    return String(str).toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  }
})();
