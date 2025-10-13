/**
 * =================================================================================
 * CONFIGURACIÓN DE DATOS ESTÁTICOS
 * =================================================================================
 */
const staticData = {
    operacionesTotales: {
        comercial: [ { periodo: '2022', operaciones: 8996, pasajeros: 912415 }, { periodo: '2023', operaciones: 23211, pasajeros: 2631261 }, { periodo: '2024', operaciones: 51734, pasajeros: 6318454 }, { periodo: '2025', operaciones: 39774, pasajeros: 4396262 } ],
        carga: [ { periodo: '2022', operaciones: 8, toneladas: 5.19 }, { periodo: '2023', operaciones: 5578, toneladas: 186319.83 }, { periodo: '2024', operaciones: 13219, toneladas: 447341.17 }, { periodo: '2025', operaciones: 74052, toneladas: 284946 } ],
        general: [ { periodo: '2022', operaciones: 458, pasajeros: 1385 }, { periodo: '2023', operaciones: 2212, pasajeros: 8160 }, { periodo: '2024', operaciones: 2777, pasajeros: 29637 }, { periodo: '2025', operaciones: 2111, pasajeros: 16443 } ]
    },
    // Datos mensuales 2025 (hasta septiembre): Comercial y Carga
    mensual2025: {
        comercial: [
            { mes: '01', label: 'Enero', operaciones: 4487, llegadas: 2242, salidas: 2245 },
            { mes: '02', label: 'Febrero', operaciones: 4015, llegadas: 2008, salidas: 2007 },
            { mes: '03', label: 'Marzo', operaciones: 4432, llegadas: 2215, salidas: 2217 },
            { mes: '04', label: 'Abril', operaciones: 4585, llegadas: 2291, salidas: 2294 },
            { mes: '05', label: 'Mayo', operaciones: 4449, llegadas: 2225, salidas: 2224 },
            { mes: '06', label: 'Junio', operaciones: 4128, llegadas: 2062, salidas: 2066 },
            { mes: '07', label: 'Julio', operaciones: 4533, llegadas: 2267, salidas: 2266 },
            { mes: '08', label: 'Agosto', operaciones: 4490, llegadas: 2244, salidas: 2246 },
            { mes: '09', label: 'Septiembre', operaciones: 4151, llegadas: 2077, salidas: 2074 }
        ],
        // Pasajeros de aviación comercial por mes (con proyección conservadora 81% donde indica)
        comercialPasajeros: [
            { mes: '01', label: 'Enero', pasajeros: 565716 },
            { mes: '02', label: 'Febrero', pasajeros: 488440 },
            { mes: '03', label: 'Marzo', pasajeros: 570097 },
            { mes: '04', label: 'Abril', pasajeros: 621197 },
            { mes: '05', label: 'Mayo', pasajeros: 586299 },
            { mes: '06', label: 'Junio', pasajeros: 541400 },
            { mes: '07', label: 'Julio', pasajeros: 604758 },
            { mes: '08', label: 'Agosto', pasajeros: 630952 },
            { mes: '09', label: 'Septiembre', pasajeros: 546457 },
            { mes: '10', label: 'Octubre (Proy.)', pasajeros: 591573 },
            { mes: '11', label: 'Noviembre (Proy.)', pasajeros: 663314 },
            { mes: '12', label: 'Diciembre (Proy.)', pasajeros: 704718 }
        ],
        carga: [
            { mes: '01', label: 'Enero', operaciones: 884, llegadas: 443, salidas: 441 },
            { mes: '02', label: 'Febrero', operaciones: 803, llegadas: 400, salidas: 403 },
            { mes: '03', label: 'Marzo', operaciones: 917, llegadas: 460, salidas: 457 },
            { mes: '04', label: 'Abril', operaciones: 903, llegadas: 451, salidas: 452 },
            { mes: '05', label: 'Mayo', operaciones: 1006, llegadas: 502, salidas: 504 },
            { mes: '06', label: 'Junio', operaciones: 1011, llegadas: 507, salidas: 504 },
            { mes: '07', label: 'Julio', operaciones: 1027, llegadas: 512, salidas: 515 },
            { mes: '08', label: 'Agosto', operaciones: 1082, llegadas: 543, salidas: 539 },
            { mes: '09', label: 'Septiembre', operaciones: 990, llegadas: 494, salidas: 496 }
        ],
        // Toneladas por mes (con nulos cuando no hay datos)
        cargaToneladas: [
            { mes: '01', label: 'Enero', toneladas: 27.764 },
            { mes: '02', label: 'Febrero', toneladas: 26.628 },
            { mes: '03', label: 'Marzo', toneladas: 33.154 },
            { mes: '04', label: 'Abril', toneladas: 30.785 },
            { mes: '05', label: 'Mayo', toneladas: 34.190 },
            { mes: '06', label: 'Junio', toneladas: 37.708 },
            { mes: '07', label: 'Julio', toneladas: 35.649 },
            { mes: '08', label: 'Agosto', toneladas: 35.737 },
            { mes: '09', label: 'Septiembre', toneladas: null },
            { mes: '10', label: 'Octubre', toneladas: null },
            { mes: '11', label: 'Noviembre', toneladas: null },
            { mes: '12', label: 'Diciembre', toneladas: null }
        ],
        // Aviación general (operaciones y pasajeros)
        general: {
            operaciones: [
                { mes: '01', label: 'Enero', operaciones: 251 },
                { mes: '02', label: 'Febrero', operaciones: 242 },
                { mes: '03', label: 'Marzo', operaciones: 272 },
                { mes: '04', label: 'Abril', operaciones: 249 },
                { mes: '05', label: 'Mayo', operaciones: 226 },
                { mes: '06', label: 'Junio', operaciones: 209 },
                { mes: '07', label: 'Julio', operaciones: 234 },
                { mes: '08', label: 'Agosto', operaciones: 282 },
                { mes: '09', label: 'Septiembre', operaciones: null },
                { mes: '10', label: 'Octubre', operaciones: null },
                { mes: '11', label: 'Noviembre', operaciones: null },
                { mes: '12', label: 'Diciembre', operaciones: null }
            ],
            pasajeros: [
                { mes: '01', label: 'Enero', pasajeros: 2353 },
                { mes: '02', label: 'Febrero', pasajeros: 1348 },
                { mes: '03', label: 'Marzo', pasajeros: 1601 },
                { mes: '04', label: 'Abril', pasajeros: 1840 },
                { mes: '05', label: 'Mayo', pasajeros: 1576 },
                { mes: '06', label: 'Junio', pasajeros: 3177 },
                { mes: '07', label: 'Julio', pasajeros: 1515 },
                { mes: '08', label: 'Agosto', pasajeros: 3033 },
                { mes: '09', label: 'Septiembre', pasajeros: null },
                { mes: '10', label: 'Octubre', pasajeros: null },
                { mes: '11', label: 'Noviembre', pasajeros: null },
                { mes: '12', label: 'Diciembre', pasajeros: null }
            ]
        }
    },
    demoras: {
        periodo: "Agosto 2025",
        causas: [ { causa: 'Repercusión', demoras: 219 }, { causa: 'Compañía', demoras: 190 }, { causa: 'Evento Circunstancial', demoras: 8 }, { causa: 'Combustible', demoras: 5 }, { causa: 'Autoridad', demoras: 4 }, { causa: 'Meteorología', demoras: 199 }, { causa: 'Aeropuerto', demoras: 4 }, ]
    }
};
const dashboardData = {
    users: {
        "David Pacheco": { password: "2468", canViewItinerarioMensual: true },
        "Isaac López": { password: "18052003", canViewItinerarioMensual: false },
        "Mauro Hernández": { password: "Mauro123", canViewItinerarioMensual: true },
        "Emily Beltrán": { password: "Emily67", canViewItinerarioMensual: true },
        "Director General": { password: "Dirección71", canViewItinerarioMensual: true },
        "Director de Operaciones": { password: "DirecciónNLU", canViewItinerarioMensual: true },
        "Jefe Mateos": { password: "2025M", canViewItinerarioMensual: true },
        "Usuario1": { password: "AIFAOps", canViewItinerarioMensual: true }
    },
    pdfSections: { "itinerario-mensual": { title: "Itinerario Mensual (Octubre)", url: "pdfs/itinerario_mensual.pdf" } }
};
let allFlightsData = [];
let passengerAirlines = ["Viva", "Volaris", "Aeromexico", "Mexicana de Aviación", "Aeurus", "Arajet"];
let cargoAirlines = ["MasAir", "China Southerrn", "Lufthansa", "Kalitta Air", "Aerounión", "Emirates Airlines", "Atlas Air", "Silk Way West Airlines", "Cathay Pacific", "United Parcel Service", "Turkish Airlines", "Cargojet Airways", "Air Canada", "Cargolux"];
const airlineColors = { "Viva": "#00b200", "Volaris": "#6f2da8", "Aeromexico": "#00008b", "Mexicana de Aviación": "#a52a2a", "Aerus": "#ff4500", "Arajet": "#00ced1", "MasAir": "#4682b4", "China Southerrn": "#c71585", "Lufthansa": "#ffcc00", "Kalitta Air": "#dc143c", "Aerounión": "#2e8b57", "Emirates Airlines": "#d4af37", "Atlas Air": "#808080", "Silk Way West Airlines": "#f4a460", "Cathay Pacific": "#006400", "United Parcel Service": "#5f4b32", "Turkish Airlines": "#e81123", "Cargojet Airways": "#f0e68c", "Air Canada": "#f00", "Cargolux": "#00a0e2" };

// ===================== Logos de Aerolíneas =====================
// Mapa flexible: nombre normalizado (minúsculas, sin acentos) -> slug de archivo
// Nota: ahora usamos una lista de candidatos por aerolínea (archivos reales en images/airlines)
const airlineLogoFileMap = {
    // Pasajeros
    'viva aerobus': ['logo_viva.png'],
    'volaris': ['logo_volaris.png'],
    'aeromexico': ['logo_aeromexico.jpg','logo_aeromexico.png'],
    'aeroméxico': ['logo_aeromexico.jpg','logo_aeromexico.png'],
    'mexicana de aviacion': ['logo_mexicana_de_aviacion.png','logo_mexicana.png'],
    'mexicana de aviación': ['logo_mexicana_de_aviacion.png','logo_mexicana.png'],
    'aerus': ['logo_aerus.png'],
    'aeurus': ['logo_aerus.png'],
    'arajet': ['logo_arajet.png','logo_arajet.jpg'],
    // Carga y otras
    'masair': ['logo_mas.png','logo_masair.png'],
    'amerijet international': ['logo_amerijet_international.png'],
    'cargojet': ['logo_cargojet.png'],
    'cargolux': ['logo_cargolux.png'],
    'cathay pacific': ['logo_cathay_pacific.png','logo_cathay.png'],
    'conviasa': ['logo_conviasa.png'],
    'estafeta': ['logo_estafeta.jpg'],
    'ethiopian airlines': ['logo_ethiopian_airlines.png'],
    'kalitta air': ['logo_kalitta_air.jpg','logo_kalitta.png'],
    'lufthansa': ['logo_lufthansa.png'],
    'lufthansa cargo': ['logo_lufthansa.png'],
    'silk way west airlines': ['logo_silk_way_west_airlines.png','logo_silkway.png'],
    'sun country airlines': ['logo_sun_country_airlines.png'],
    'united parcel service': ['logo_united_parcel_service.png'],
    'ups': ['logo_united_parcel_service.png'],
    'ifl group': ['lofo_ifl_group.png'],
    'china southern': ['logo_china_southern.png'],
    'china southerrn': ['logo_china_southern.png']
};
// Compat: entradas antiguas -> slug "base" sin extensión
const airlineLogoSlugMap = {
    'viva': 'logo_viva',
    'viva aerobus': 'logo_viva',
    'volaris': 'logo_volaris',
    'aeromexico': 'logo_aeromexico',
    'aeroméxico': 'logo_aeromexico',
    'mexicana de aviacion': 'logo_mexicana',
    'mexicana de aviación': 'logo_mexicana',
    'aerus': 'logo_aerus',
    'aeurus': 'logo_aerus',
    'arajet': 'logo_arajet',
    'masair': 'logo_masair',
    'mas air': 'logo_masair',
    'china southern': 'logo_china_southern',
    'china southerrn': 'logo_china_southern', // corrección tipográfica
    'lufthansa': 'logo_lufthansa',
    'lufthansa cargo': 'logo_lufthansa',
    'kalitta air': 'logo_kalitta',
    'aerounion': 'logo_aerounion',
    'aerounión': 'logo_aerounion',
    'emirates': 'logo_emirates',
    'emirates airlines': 'logo_emirates',
    'emirates skycargo': 'logo_emirates',
    'atlas air': 'logo_atlas',
    'silk way west airlines': 'logo_silkway',
    'silk way west': 'logo_silkway',
    'cathay pacific': 'logo_cathay',
    'cathay pacific cargo': 'logo_cathay',
    'united parcel service': 'logo_ups',
    'ups': 'logo_ups',
    'turkish airlines': 'logo_turkish',
    'turkish cargo': 'logo_turkish',
    'cargojet airways': 'logo_cargojet',
    'cargojet': 'logo_cargojet',
    'air canada': 'logo_air_canada',
    'air canada cargo': 'logo_air_canada',
    'cargolux': 'logo_cargolux'
};

// Algunas marcas tienen logos con proporciones que se perciben más pequeños; dales un boost
const BOOST_LOGO_SET = new Set([
    'cathay pacific',
    'atlas air',
    'air canada',
    'air france',
    'mexicana de aviacion',
    'mexicana de aviación',
    'mexicana'
]);

function getLogoSizeClass(airlineName, context = 'table') {
    const key = normalizeAirlineName(airlineName || '');
    // Por defecto usamos grande; si está en la lista, usamos XL
    if (BOOST_LOGO_SET.has(key)) return 'xl';
    // Para consistencia visual, tanto en resumen como en tablas usamos 'lg'
    return 'lg';
}

function normalizeAirlineName(name = ''){
    const s = (name || '').toString().trim().toLowerCase();
    // quitar acentos simples
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function getAirlineLogoCandidates(airline){
    const key = normalizeAirlineName(airline);
    const files = airlineLogoFileMap[key];
    const candidates = [];
        if (Array.isArray(files) && files.length) {
        files.forEach(f=>{ candidates.push(`images/airlines/${f}`); });
    } else {
        // Generar a partir del nombre normalizado
        const base = 'logo_' + key.replace(/\s+/g, '_');
        candidates.push(`images/airlines/${base}.png`);
        candidates.push(`images/airlines/${base}.jpg`);
        candidates.push(`images/airlines/${base}.svg`);
        // Variantes comunes: con subrayado final (air_canada_, air_france_)
        candidates.push(`images/airlines/${base}_.png`);
        candidates.push(`images/airlines/${base}_.jpg`);
        // Variaciones conocidas
        if (base.includes('aerounion')) candidates.push('images/airlines/loho_aero_union.png');
        if (base.includes('masair')) candidates.push('images/airlines/logo_mas.png');
        if (base.includes('silk_way_west') && !base.includes('silkway')) candidates.push('images/airlines/logo_silk_way_west_airlines.png');
        if (base.includes('air_canada')) candidates.push('images/airlines/logo_air_canada_.png');
        if (base.includes('air_france')) candidates.push('images/airlines/logo_air_france_.png');
        if (base.includes('ifl_group')) candidates.push('images/airlines/lofo_ifl_group.png');
    }
    // quitar duplicados conservando orden
    return [...new Set(candidates)];
}
function getAirlineLogoPath(airline){
    const cands = getAirlineLogoCandidates(airline);
    return cands.length ? cands[0] : null;
}
// Fallback para logos: si .png falla probamos .svg una vez; si también falla, ocultamos el <img>
function handleLogoError(imgEl){
    try{
        const list = (imgEl.dataset.cands || '').split('|').filter(Boolean);
        let idx = parseInt(imgEl.dataset.candIdx || '0', 10);
        if (list.length && idx < list.length - 1){
            idx += 1;
            imgEl.dataset.candIdx = String(idx);
            imgEl.src = list[idx];
            return;
        }
        // última oportunidad: alternar extensión png<->jpg<->svg en el mismo nombre
        const current = imgEl.getAttribute('src') || '';
        const nextByExt = current.endsWith('.png') ? current.replace(/\.png$/i, '.jpg')
                          : current.endsWith('.jpg') ? current.replace(/\.jpg$/i, '.svg')
                          : null;
        if (nextByExt) { imgEl.src = nextByExt; return; }
        // sin recurso: ocultar img y mantener visible el texto/color
        imgEl.style.display = 'none';
        const cell = imgEl.closest('.airline-cell');
        if (cell) cell.classList.remove('has-logo');
        const row = imgEl.closest('tr');
        if (row) row.style.removeProperty('--airline-color');
        const header = imgEl.closest('.airline-header');
        if (header) header.classList.remove('airline-has-logo');
    }catch(_){ imgEl.style.display = 'none'; }
}
// Marcar celdas/headers cuando el logo carga correctamente para ocultar texto/color
function logoLoaded(imgEl){
    try{
        const cell = imgEl.closest('.airline-cell');
        if (cell) cell.classList.add('has-logo');
        // Marcar el header para ocultar el nombre cuando hay logo, sin aplicar fondos adicionales
        const header = imgEl.closest('.airline-header');
        if (header) header.classList.add('airline-has-logo');
    }catch(_){}
}
const charts = {};
let showSMA = false; // SMA deshabilitado
let showMonthly2025 = false; // estado global para modo mensual 2025

// Utilidad: convertir #RRGGBB a rgba()
function hexToRgba(hex, alpha = 1) {
    try {
        const h = (hex || '').toString().trim();
        if (/^#?[0-9a-fA-F]{3}$/.test(h)) {
            const c = h.replace('#','');
            const r = parseInt(c[0]+c[0],16), g = parseInt(c[1]+c[1],16), b = parseInt(c[2]+c[2],16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        const c = h.replace('#','');
        const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
        return `rgba(${r},${g},${b},${alpha})`;
    } catch(_) {
        return `rgba(0,0,0,${alpha})`;
    }
}

// Formateo compacto para etiquetas en burbuja
function formatCompact(value, type = 'int') {
    const n = Number(value || 0);
    if (type === 'ton') {
        if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + 'k';
        return n.toFixed(n < 100 ? 2 : 1);
    }
    if (type === 'pax') {
        if (Math.abs(n) >= 1_000_000) return (n/1_000_000).toFixed(1) + 'M';
        if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + 'k';
        return String(Math.round(n));
    }
    // int ops
    if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + 'k';
    return String(Math.round(n));
}

// Formateo completo para etiquetas (sin compactar)
function formatFull(value, type = 'int') {
    const n = Number(value ?? 0);
    if (type === 'ton') {
        return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 }).format(n);
    }
    return new Intl.NumberFormat('es-MX').format(Math.round(n));
}

function calculateTotals() {
    const totalEquipaje = Array.from(document.querySelectorAll('.embarque-equipaje')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const totalCarga = Array.from(document.querySelectorAll('.embarque-carga')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const totalCorreo = Array.from(document.querySelectorAll('.embarque-correo')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const totalPaxNacional = Array.from(document.querySelectorAll('.embarque-pax-nacional')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const totalPaxInternacional = Array.from(document.querySelectorAll('.embarque-pax-internacional')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = (typeof val === 'number' && !Number.isInteger(val)) ? val.toFixed(2) : val; };
    setVal('total-equipaje', totalEquipaje.toLocaleString('es-MX'));
    setVal('total-carga', totalCarga.toLocaleString('es-MX'));
    setVal('total-correo', totalCorreo.toLocaleString('es-MX'));
    setVal('total-pax-nacional', totalPaxNacional);
    setVal('total-pax-internacional', totalPaxInternacional);
}

// Manifiestos: toda la lógica fue movida a js/manifiestos.js para aislar la sección


document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeSidebarState();
    if (document.getElementById('login-screen') && !document.getElementById('login-screen').classList.contains('hidden')) { animateLoginTitle(); }
    loadItineraryData();      
    renderDemoras();          
    renderOperacionesTotales(); 
    try{ updateOpsSummary(); }catch(_){ }
    // Si la sección activa no es Operaciones Totales, pausar animación para evitar consumo innecesario
    try {
        const active = document.querySelector('.content-section.active');
        if (active && active.id !== 'operaciones-totales-section') { stopOpsAnim(); }
    } catch(_) {}
    // Inicializa la sección de Frecuencias de la semana
    try { initFrecuenciasSemana(); } catch(_) {}
    // Inicializa fecha para picos diarios
    try { initPeakDateControls(); } catch(_) {}
    createPdfSections();
    setupEventListeners();
    updateClock();
    updateDate();
    setInterval(updateClock, 1000);
    setInterval(updateDate, 60000);
    checkSession();

    // Animations enabled across devices (user preference)
    try {
        if (window.Chart && Chart.defaults) {
            Chart.defaults.animation = { duration: 600 };
            Chart.defaults.animations = Chart.defaults.animations || {};
            Chart.defaults.transitions = Chart.defaults.transitions || {};
        }
    } catch(_) {}

    // Respect URL hash to open a specific section (e.g. #manifiestos)
    if (location.hash && location.hash.length > 1) {
        const sectionId = location.hash.replace('#', '');
        // find matching menu item
        const menuItem = Array.from(document.querySelectorAll('.menu-item')).find(mi => mi.dataset && mi.dataset.section === sectionId);
        if (menuItem) {
            // trigger navigation handler
            showSection(sectionId, menuItem);
            if (sectionId === 'operaciones-totales') { try{ updateOpsSummary(); }catch(_){ } }
            // mark menu item active
            document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('active'));
            menuItem.classList.add('active');
        }
    } else {
        // Default section: Operaciones Totales
        try {
            const menuItem = Array.from(document.querySelectorAll('.menu-item')).find(mi => mi.dataset && mi.dataset.section === 'operaciones-totales');
            if (menuItem) {
                showSection('operaciones-totales', menuItem);
                try{ updateOpsSummary(); renderOperacionesTotales(); }catch(_){ }
            }
        } catch(_) {}
    }
});

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('sidebar-nav').addEventListener('click', handleNavigation);
    document.getElementById('airline-filter').addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // search input for banda de reclamo (specific) and a global search box
    const claimInput = document.getElementById('claim-filter'); if (claimInput) claimInput.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    const globalSearch = document.getElementById('global-search'); if (globalSearch) globalSearch.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    // position select (populated from JSON)
    const posSelect = document.getElementById('position-filter'); if (posSelect) posSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // hour filters (Inicio)
    const hourSelect = document.getElementById('hour-filter'); if (hourSelect) hourSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const hourTypeSelect = document.getElementById('hour-type-filter'); if (hourTypeSelect) hourTypeSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // date filter (Inicio)
    const dateFilter = document.getElementById('date-filter'); if (dateFilter) dateFilter.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // Botón de tema eliminado: no enlazar listener si no existe
    const themeBtnEl = document.getElementById('theme-toggler');
    if (themeBtnEl) themeBtnEl.addEventListener('click', toggleTheme);
    const clearBtn = document.getElementById('clear-filters'); if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    document.getElementById('sidebar-toggler').addEventListener('click', toggleSidebar);
    // Exportar todas las gráficas (Operaciones Totales)
    const opsExportAllBtn = document.getElementById('ops-export-all-btn');
    if (opsExportAllBtn) opsExportAllBtn.addEventListener('click', exportAllChartsPDF);
    setupBodyEventListeners();
    setupLightboxListeners();
    // Inicializar UI de Manifiestos (desacoplado al módulo)
    try { if (typeof window.setupManifestsUI === 'function') window.setupManifestsUI(); } catch(_) {}
    // Frecuencias: navegación de semana
    const prevW = document.getElementById('freq-prev-week'); if (prevW) prevW.addEventListener('click', ()=> changeFreqWeek(-7));
    const nextW = document.getElementById('freq-next-week'); if (nextW) nextW.addEventListener('click', ()=> changeFreqWeek(7));
    // Picos diarios: listeners
    const peakDate = document.getElementById('peak-date'); if (peakDate) peakDate.addEventListener('change', renderDailyPeaks);
    const prevD = document.getElementById('peak-prev-day'); if (prevD) prevD.addEventListener('click', ()=> shiftPeakDate(-1));
    const nextD = document.getElementById('peak-next-day'); if (nextD) nextD.addEventListener('click', ()=> shiftPeakDate(1));
    // Itinerario tabs: re-render heatmaps when switching into them
    const itineraryTab = document.getElementById('itineraryTab');
    // PDFs restaurados en Itinerario: no es necesario recalcular heatmaps al cambiar de pestaña
    if (itineraryTab) {
        itineraryTab.addEventListener('click', ()=>{});
    }
}
function animateLoginTitle() {
    const titleElement = document.getElementById('login-title');
    if (!titleElement) return;
        // Mantener el título solicitado
        titleElement.textContent = "OPERACIONES AIFA";
}
function animateCounter(elementId, endValue, duration = 2500, isDecimal = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = progress * endValue;
        if (isDecimal) {
            element.textContent = new Intl.NumberFormat('es-MX', {maximumFractionDigits: 2, minimumFractionDigits: 2}).format(currentValue);
        } else {
            element.textContent = new Intl.NumberFormat('es-MX').format(Math.floor(currentValue));
        }
        if (progress < 1) { window.requestAnimationFrame(step); }
    };
    window.requestAnimationFrame(step);
}
function handleLogin(e) {
    e.preventDefault();
    const loginButton = document.getElementById('login-button');
    loginButton.classList.add('loading');
    showGlobalLoader('Verificando credenciales...');
    setTimeout(() => {
        const usernameInput = (document.getElementById('username').value || '').toString();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        // Buscar usuario por nombre normalizado (insensible a mayúsculas/espacios)
        const normalized = usernameInput.trim().toLowerCase();
        const matchedKey = Object.keys(dashboardData.users).find(k => (k || '').toString().trim().toLowerCase() === normalized);
        const user = matchedKey ? dashboardData.users[matchedKey] : undefined;
        if (user && user.password === password) {
            sessionStorage.setItem('currentUser', matchedKey);
            showMainApp();
        } else {
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
            loginButton.classList.remove('loading');
        }
        hideGlobalLoader();
    }, 700);
}
function updateClock() {
    const clockElement = document.getElementById('formal-clock');
    if (clockElement) {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
        const utcElement = document.getElementById('utc-clock');
        if (utcElement) {
            const nowUtc = new Date();
            utcElement.textContent = nowUtc.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
        }
}
function initializeTheme() {
    // Forzar tema claro permanentemente
    document.body.classList.remove('dark-mode');
    try { localStorage.setItem('theme', 'light'); } catch(_) {}
}
function toggleTheme() {
    // No-op: tema fijo claro
}
function updateThemeIcon(isDarkMode) {
    // No-op: sin botón de tema
}
function initializeSidebarState() {
    const isMobile = window.innerWidth <= 991.98;
    if (!isMobile) {
        const savedState = localStorage.getItem('sidebarState') || 'collapsed';
        if (savedState === 'collapsed') { document.body.classList.add('sidebar-collapsed'); }
    }
}
function toggleSidebar() {
    const isMobile = window.innerWidth <= 991.98;
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar || !overlay) return;
        const willShow = !sidebar.classList.contains('visible');
        sidebar.classList.toggle('visible', willShow);
        overlay.classList.toggle('active', willShow);
    } else {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
    }
}
function getChartColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return {
        grid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        ticks: isDarkMode ? '#bbb' : '#666',
        labels: isDarkMode ? '#e8eaed' : '#343a40',
        tooltip: { backgroundColor: isDarkMode ? '#151d27' : '#fff', titleColor: isDarkMode ? '#e8eaed' : '#333', bodyColor: isDarkMode ? '#e8eaed' : '#333', }
    };
}
async function loadItineraryData() {
    try {
        const response = await fetch('data/itinerario.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allFlightsData = await response.json();
    // Pre-cargar filtro de fecha con 'hoy' si está vacío
    try {
        const dateInput = document.getElementById('date-filter');
        if (dateInput && !dateInput.value) {
            const d = new Date();
            const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            dateInput.value = ymd;
        }
    } catch (_) {}
    displaySummaryTable(allFlightsData);
    populateAirlineFilter();
    populatePositionFilter();
    applyFilters(); 
    // actualizar estadísticas diarias una vez cargado el itinerario
    computeDailyStats();
    try { renderFrecuenciasSemana(); } catch(_) {}
    try { ensurePeakDate(); renderDailyPeaks(); } catch(_) {}
    } catch (error) {
        console.error("Error al cargar itinerario:", error);
        const passengerContainer = document.getElementById('passenger-itinerary-container');
        if(passengerContainer) { passengerContainer.innerHTML = `<div class="alert alert-danger">Error al cargar datos del itinerario.</div>`; }
    }
}
function applyFilters() {
    const t0 = performance.now();
    const selectedAirlineRaw = document.getElementById('airline-filter').value;
    const selectedAirline = (selectedAirlineRaw || '').toString().trim();
    const claimFilterValue = document.getElementById('claim-filter') ? document.getElementById('claim-filter').value.trim().toLowerCase() : '';
    const globalSearchValue = document.getElementById('global-search') ? document.getElementById('global-search').value.trim().toLowerCase() : '';
    // date filter (Inicio)
    const dateEl = document.getElementById('date-filter');
    const selectedDate = dateEl ? (dateEl.value || '').toString().trim() : '';
    // hour filters (Inicio)
    const hourSelectEl = document.getElementById('hour-filter');
    const hourTypeEl = document.getElementById('hour-type-filter');
    const selectedHour = hourSelectEl ? hourSelectEl.value : 'all'; // 'all' or '00'..'23'
    const hourType = hourTypeEl ? hourTypeEl.value : 'both';         // 'both' | 'arr' | 'dep'
    // position is now a select populated from JSON
    const posFilterVal = document.getElementById('position-filter') ? document.getElementById('position-filter').value : 'all';
    // helpers for robust parsing
    const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const parseDMY = (s) => {
        if (!s) return null;
        const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(String(s).trim());
        if (!m) return null;
        const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
        return new Date(yy, mm-1, dd);
    };
    const getHourInt = (s) => {
        const m = /^(\s*)(\d{1,2})\s*:\s*(\d{2})/.exec((s||'').toString());
        if (!m) return null;
        const h = Math.max(0, Math.min(23, parseInt(m[2],10)));
        return h;
    };
    const getMinutes = (s) => {
        const m = /^(\s*)(\d{1,2})\s*:\s*(\d{2})/.exec((s||'').toString());
        if (!m) return Number.MAX_SAFE_INTEGER;
        const h = Math.max(0, Math.min(23, parseInt(m[2],10)));
        const mi = Math.max(0, Math.min(59, parseInt(m[3],10)));
        return h*60 + mi;
    };

    let filteredData = allFlightsData;
    if (selectedAirline && selectedAirline !== 'all') { filteredData = filteredData.filter(flight => (flight.aerolinea || '').toString().trim() === selectedAirline); }
    // date filter: match dd/mm/yyyy in data vs yyyy-mm-dd in input
    if (selectedDate) {
        const selYMD = selectedDate; // yyyy-mm-dd from input
        const matchDate = (f) => {
            const ymdArr = (() => { const d = parseDMY(f.fecha_llegada); return d ? toYMD(d) : null; })();
            const ymdDep = (() => { const d = parseDMY(f.fecha_salida); return d ? toYMD(d) : null; })();
            if (hourType === 'arr') return ymdArr === selYMD;
            if (hourType === 'dep') return ymdDep === selYMD;
            return (ymdArr === selYMD) || (ymdDep === selYMD);
        };
        filteredData = filteredData.filter(matchDate);
    }
    // If date filter yields no data, auto-relax it to ensure content is shown (mobile first-load fix)
    if (selectedDate && filteredData.length === 0) {
        // Find the date with most flights in allFlightsData
        const freq = new Map();
        const inc = (d)=>{ if (!d) return; const k = String(d).trim(); if (!k) return; freq.set(k, (freq.get(k)||0)+1); };
        for (const f of (allFlightsData||[])) { inc(f.fecha_llegada); inc(f.fecha_salida); }
        let bestDMY=null, bestN=-1; for (const [dmy,n] of freq) { if (n>bestN) { bestN=n; bestDMY=dmy; } }
        const dateElFix = document.getElementById('date-filter');
        if (bestDMY) {
            const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(bestDMY);
            if (m) {
                const ymd = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
                if (dateElFix) dateElFix.value = ymd;
                return applyFilters();
            }
        }
        // No best date: clear date filter and re-apply
        if (dateElFix) dateElFix.value = '';
        return applyFilters();
    }
    // Prefer categorization via 'categoria' field when available
    let passengerFlights = filteredData.filter(f => (f.categoria && f.categoria.toLowerCase() === 'pasajeros') || passengerAirlines.includes(f.aerolinea));
    let cargoFlights = filteredData.filter(f => (f.categoria && f.categoria.toLowerCase() === 'carga') || cargoAirlines.includes(f.aerolinea));
    if (claimFilterValue !== '') { passengerFlights = passengerFlights.filter(flight => (flight.banda_reclamo || '').toString().toLowerCase().includes(claimFilterValue)); }
    // position filter (select) - applies to both (value 'all' means no filter)
    if (posFilterVal && posFilterVal !== 'all') {
        const posLower = posFilterVal.toString().toLowerCase();
        passengerFlights = passengerFlights.filter(f => (f.posicion || '').toString().toLowerCase() === posLower);
        cargoFlights = cargoFlights.filter(f => (f.posicion || '').toString().toLowerCase() === posLower);
    }
    // hour filter: filter by hora_llegada and/or hora_salida according to hourType
    if (selectedHour && selectedHour !== 'all') {
        const hhNum = parseInt(selectedHour, 10);
        const matchHour = (f) => {
            const hl = getHourInt(f.hora_llegada);
            const hs = getHourInt(f.hora_salida);
            if (hourType === 'arr') return hl === hhNum;
            if (hourType === 'dep') return hs === hhNum;
            return (hl === hhNum) || (hs === hhNum);
        };
        passengerFlights = passengerFlights.filter(matchHour);
        cargoFlights = cargoFlights.filter(matchHour);
    }
    // global text search across common fields
    // If global search has content, use it to search across airline, origen, destino, vuelo, banda
    if (globalSearchValue !== '') {
        const term = globalSearchValue;
        const matchFn = (f) => {
            return ((f.aerolinea || '').toString().toLowerCase().includes(term)) || ((f.origen || '').toString().toLowerCase().includes(term)) || ((f.destino || '').toString().toLowerCase().includes(term)) || ((f.vuelo_llegada || '').toString().toLowerCase().includes(term)) || ((f.vuelo_salida || '').toString().toLowerCase().includes(term)) || ((f.banda_reclamo || '').toString().toLowerCase().includes(term));
        };
        passengerFlights = passengerFlights.filter(matchFn);
        cargoFlights = cargoFlights.filter(matchFn);
    }
    // Mostrar/ocultar tablas según categoría si hay filtro de aerolínea específico
    const passContainer = document.getElementById('passenger-itinerary-container');
    const cargoContainer = document.getElementById('cargo-itinerary-container');
    const passBlock = document.getElementById('passenger-itinerary-scroll')?.closest('.itinerary-horizontal');
    const cargoBlock = document.getElementById('cargo-itinerary-scroll')?.closest('.itinerary-horizontal');
    const isSpecificAirline = !!selectedAirline && selectedAirline !== 'all';
    if (isSpecificAirline) {
        const isPassengerAirline = passengerAirlines.includes(selectedAirline) || (filteredData.some(f=> (f.aerolinea||'')===selectedAirline && (f.categoria||'').toLowerCase()==='pasajeros'));
        const isCargoAirline = cargoAirlines.includes(selectedAirline) || (filteredData.some(f=> (f.aerolinea||'')===selectedAirline && (f.categoria||'').toLowerCase()==='carga'));
        // Si es de pasajeros, ocultar bloque de carga
        if (isPassengerAirline && !isCargoAirline) {
            if (cargoBlock) cargoBlock.style.display = 'none';
            if (passBlock) passBlock.style.display = '';
        }
        // Si es de carga, ocultar bloque de pasajeros
        else if (isCargoAirline && !isPassengerAirline) {
            if (passBlock) passBlock.style.display = 'none';
            if (cargoBlock) cargoBlock.style.display = '';
        } else {
            // aerolínea mixta o datos mezclados: mostrar ambos
            if (passBlock) passBlock.style.display = '';
            if (cargoBlock) cargoBlock.style.display = '';
        }
    } else {
        if (passBlock) passBlock.style.display = '';
        if (cargoBlock) cargoBlock.style.display = '';
    }

    // If an hour is selected, sort results ascending by the chosen time field
    if (selectedHour && selectedHour !== 'all') {
        const byArr = (a,b)=> getMinutes(a.hora_llegada) - getMinutes(b.hora_llegada);
        const byDep = (a,b)=> getMinutes(a.hora_salida) - getMinutes(b.hora_salida);
        if (hourType === 'arr') {
            passengerFlights.sort(byArr); cargoFlights.sort(byArr);
        } else if (hourType === 'dep') {
            passengerFlights.sort(byDep); cargoFlights.sort(byDep);
        } else {
            // both: sort by min of arr/dep time
            const byEither = (a,b)=> {
                const aMin = Math.min(getMinutes(a.hora_llegada), getMinutes(a.hora_salida));
                const bMin = Math.min(getMinutes(b.hora_llegada), getMinutes(b.hora_salida));
                return aMin - bMin;
            };
            passengerFlights.sort(byEither); cargoFlights.sort(byEither);
        }
    }

    displayPassengerTable(passengerFlights);
    displayCargoTable(cargoFlights);
    // update summary based on currently visible (filtered) data
    displaySummaryTable(filteredData);
    console.log(`[perf] filtros itinerario: ${(performance.now()-t0).toFixed(1)}ms · pax=${passengerFlights.length} carga=${cargoFlights.length}`);
    // Nota: el resumen diario por aerolínea fue removido del UI; no renderizamos conteos aquí.
    // Si se requiere reinstalar, reimplementar renderItinerarioSummary y descomentar la línea siguiente:
    // renderItinerarioSummary(filteredData);
}

function populateAirlineFilter(flights = []) {
  const sel = document.getElementById('airline-filter');
  if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const names = data
    .map(f => (f.aerolinea || f.aerolínea || f.airline || '').trim())
    .filter(Boolean);
  const unique = Array.from(new Set(names)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
  sel.innerHTML = '<option value="all" selected>Todas las Aerolíneas</option>' +
    unique.map(a => `<option value="${a}">${a}</option>`).join('');
}

function populatePositionFilter(flights = []) {
  const sel = document.getElementById('position-filter');
  if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const vals = data
    .map(f => (f.posicion || f.posición || f.stand || '').toString().trim())
    .filter(Boolean);
  const unique = Array.from(new Set(vals)).sort();
  sel.innerHTML = '<option value="all" selected>Todas las posiciones</option>' +
    unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

function clearFilters() {
    const airline = document.getElementById('airline-filter'); if (airline) airline.value = 'all';
    const pos = document.getElementById('position-filter'); if (pos) pos.value = 'all';
    const claim = document.getElementById('claim-filter'); if (claim) claim.value = '';
    const date = document.getElementById('date-filter'); if (date) date.value = '';
    const hourSel = document.getElementById('hour-filter'); if (hourSel) hourSel.value = 'all';
    const hourTypeSel = document.getElementById('hour-type-filter'); if (hourTypeSel) hourTypeSel.value = 'both';
    applyFilters();
    // visual confirmation: temporary highlight and toast
    const btn = document.getElementById('clear-filters');
    if (btn) {
        btn.classList.add('btn-success');
        setTimeout(() => btn.classList.remove('btn-success'), 900);
    }
    const toastEl = document.getElementById('action-toast');
    if (toastEl && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        try { const t = new bootstrap.Toast(toastEl); t.show(); } catch(e) { /* ignore */ }
    }
}

function viewFlightsForAirline(airline) {
    // set airline filter and re-run
    const select = document.getElementById('airline-filter');
    if (!select) return;
    // ensure option exists
    let exists = Array.from(select.options).find(o => o.value === airline);
    if (!exists) {
        const opt = document.createElement('option'); opt.value = airline; opt.textContent = airline; select.appendChild(opt);
    }
    select.value = airline;
    applyFilters();
    // programmatically switch to interactive tab (itinerario section view already shows tables)
    // scroll passenger table into view
    const passengerEl = document.getElementById('passenger-itinerary-container');
    if (passengerEl) passengerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function displaySummaryTable(flights) {
    const container = document.getElementById('summary-table-container');
    if (!container) return;
    // Normalizar aerolínea vacía a etiqueta legible
    const summary = flights.reduce((acc, flight) => {
        let airline = (flight.aerolinea || '').trim();
        if (!airline) airline = 'Sin aerolínea';
        if (!acc[airline]) acc[airline] = { paxLlegadas: 0, paxSalidas: 0, cargLlegadas: 0, cargSalidas: 0 };
        const cat = (flight.categoria || '').toString().toLowerCase();
        if (cat === 'pasajeros') {
            if (flight.vuelo_llegada) acc[airline].paxLlegadas++;
            if (flight.vuelo_salida) acc[airline].paxSalidas++;
        } else if (cat === 'carga') {
            if (flight.vuelo_llegada) acc[airline].cargLlegadas++;
            if (flight.vuelo_salida) acc[airline].cargSalidas++;
        } else {
            // Unknown category: try to infer from known lists
            if (passengerAirlines.includes(airline)) {
                if (flight.vuelo_llegada) acc[airline].paxLlegadas++;
                if (flight.vuelo_salida) acc[airline].paxSalidas++;
            } else if (cargoAirlines.includes(airline)) {
                if (flight.vuelo_llegada) acc[airline].cargLlegadas++;
                if (flight.vuelo_salida) acc[airline].cargSalidas++;
            } else {
                // default to pasajeros
                if (flight.vuelo_llegada) acc[airline].paxLlegadas++;
                if (flight.vuelo_salida) acc[airline].paxSalidas++;
            }
        }
        return acc;
    }, {});

    // Build a stacked card view: one card per airline with totals (Llegadas/Salidas)
    const airlines = Object.keys(summary).sort((a, b) => {
        const totalA = (summary[a].paxLlegadas || 0) + (summary[a].paxSalidas || 0) + (summary[a].cargLlegadas || 0) + (summary[a].cargSalidas || 0);
        const totalB = (summary[b].paxLlegadas || 0) + (summary[b].paxSalidas || 0) + (summary[b].cargLlegadas || 0) + (summary[b].cargSalidas || 0);
        return totalB - totalA;
    });

    if (airlines.length === 0) {
        container.innerHTML = `<div class="alert alert-info bg-transparent text-body">No se encontraron operaciones.</div>`;
        return;
    }

    let html = `<div class="d-flex flex-column gap-2">`;
    airlines.forEach((airline, index) => {
        const data = summary[airline];
        const arrivals = (data.paxLlegadas || 0) + (data.cargLlegadas || 0);
        const departures = (data.paxSalidas || 0) + (data.cargSalidas || 0);
        const safeId = (airline || 'sin-aerolinea').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
        const collapseId = `collapse-${safeId}-${index}`;
    const color = airlineColors[airline] || '#ccc';
    const cands = getAirlineLogoCandidates(airline);
    const logoPath = cands[0];
    const dataCands = cands.join('|');
    const sizeClass = getLogoSizeClass(airline, 'summary');
    const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass} me-2" src="${logoPath}" alt="Logo ${airline}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">` : '';

        html += `
        <div class="card">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div class="airline-header d-flex align-items-center">${logoHtml}<strong class="airline-name">${airline}</strong></div>
                <div class="d-flex align-items-center gap-3">
                    <div class="text-center">
                        <div class="fw-bold">${new Intl.NumberFormat('es-MX').format(arrivals)}</div>
                        <small class="text-muted">Llegadas</small>
                    </div>
                    <div class="text-center">
                        <div class="fw-bold">${new Intl.NumberFormat('es-MX').format(departures)}</div>
                        <small class="text-muted">Salidas</small>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">Detalle</button>
                </div>
            </div>
            <div class="collapse" id="${collapseId}">
                <div class="card-body py-2">
                    <table class="table table-sm mb-2">
                        <thead><tr><th></th><th class="text-center">Llegadas</th><th class="text-center">Salidas</th></tr></thead>
                        <tbody>
                            <tr><td>Pasajeros</td><td class="text-center">${new Intl.NumberFormat('es-MX').format(data.paxLlegadas || 0)}</td><td class="text-center">${new Intl.NumberFormat('es-MX').format(data.paxSalidas || 0)}</td></tr>
                            <tr><td>Carga</td><td class="text-center">${new Intl.NumberFormat('es-MX').format(data.cargLlegadas || 0)}</td><td class="text-center">${new Intl.NumberFormat('es-MX').format(data.cargSalidas || 0)}</td></tr>
                        </tbody>
                    </table>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-sm btn-primary" onclick="viewFlightsForAirline('${airline.replace(/'/g, "\\'")}')">Ver vuelos</button>
                    </div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}
function displayPassengerTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('passenger-itinerary-container');
    if (!container) return;
    if (flights.length === 0) { container.innerHTML = `<div class="alert alert-info bg-transparent text-body">No se encontraron vuelos de pasajeros.</div>`; return; }
    let tableHtml = `<table class="table table-hover"><thead><tr><th>Aerolínea</th><th>Vuelo Lleg.</th><th>Fecha Lleg.</th><th>Hora Lleg.</th><th>Origen</th><th>Banda</th><th>Posición</th><th>Vuelo Sal.</th><th>Fecha Sal.</th><th>Hora Sal.</th><th>Destino</th></tr></thead><tbody>`;
    flights.forEach((flight, index) => {
        const airlineName = flight.aerolinea || '-';
    const cands = getAirlineLogoCandidates(airlineName);
    const logoPath = cands[0];
    const dataCands = cands.join('|');
    const sizeClass = getLogoSizeClass(airlineName, 'table');
    const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${airlineName}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">` : '';
        const rowColor = (airlineColors[flight.aerolinea] || '#ccc');
        tableHtml += `<tr class="animated-row" style="--delay: ${index * 0.08}s; --airline-color: ${rowColor};">
            <td><div class="airline-cell">${logoHtml}<span class="airline-name">${airlineName}</span></div></td>
            <td>${flight.vuelo_llegada || '-'}</td>
            <td>${flight.fecha_llegada || '-'}</td>
            <td>${flight.hora_llegada || '-'}</td>
            <td>${flight.origen || '-'}</td>
            <td class="text-center">${flight.banda_reclamo || '-'}</td>
            <td>${flight.posicion || '-'}</td>
            <td>${flight.vuelo_salida || '-'}</td>
            <td>${flight.fecha_salida || '-'}</td>
            <td>${flight.hora_salida || '-'}</td>
            <td>${flight.destino || '-'}</td>
        </tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = `<div class="table-responsive vertical-scroll">${tableHtml}</div>`;
    console.log(`[perf] pasajeros tabla: ${(performance.now()-t0).toFixed(1)}ms, filas=${flights.length}`);
    // After rendering, ensure the table can overflow horizontally on small screens.
    try {
        const area = document.getElementById('passenger-itinerary-scroll');
        const table = container.querySelector('table');
        if (table && area) {
            // let layout settle then measure
            requestAnimationFrame(() => {
                // temporarily let table size to content
                table.style.width = 'auto';
                const needed = table.scrollWidth;
                // if needed width exceeds visible area, enforce min-width to trigger overflow
                if (needed > area.clientWidth) {
                    table.style.minWidth = needed + 'px';
                } else {
                    // on touch devices, slightly increase minWidth to allow panning
                    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
                    if (isTouch) {
                        const forced = Math.round(area.clientWidth * 1.2);
                        table.style.minWidth = forced + 'px';
                    } else {
                        table.style.minWidth = '';
                        table.style.width = '';
                    }
                }
                // refresh controls
                try { updateScrollControlsFor('passenger-itinerary-scroll'); } catch(e) {}
            });
        } else {
            setTimeout(() => { try { updateScrollControlsFor('passenger-itinerary-scroll'); } catch(e) {} }, 80);
        }
    } catch(e) { /* ignore */ }
}
function displayCargoTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('cargo-itinerary-container');
    if (!container) return;
    if (flights.length === 0) { container.innerHTML = `<div class="alert alert-info bg-transparent text-body">No se encontraron vuelos de carga.</div>`; return; }
    let tableHtml = `<table class="table table-hover"><thead><tr><th>Aerolínea</th><th>Vuelo Lleg.</th><th>Fecha Lleg.</th><th>Hora Lleg.</th><th>Origen</th><th>Posición</th><th>Vuelo Sal.</th><th>Fecha Sal.</th><th>Hora Sal.</th><th>Destino</th></tr></thead><tbody>`;
    flights.forEach((flight, index) => {
        const airlineName = flight.aerolinea || '-';
    const cands = getAirlineLogoCandidates(airlineName);
    const logoPath = cands[0];
    const dataCands = cands.join('|');
    const sizeClass = getLogoSizeClass(airlineName, 'table');
    const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${airlineName}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">` : '';
        const rowColor = (airlineColors[flight.aerolinea] || '#ccc');
        tableHtml += `<tr class="animated-row" style="--delay: ${index * 0.08}s; --airline-color: ${rowColor};">
            <td><div class="airline-cell">${logoHtml}<span class="airline-name">${airlineName}</span></div></td>
            <td>${flight.vuelo_llegada || '-'}</td>
            <td>${flight.fecha_llegada || '-'}</td>
            <td>${flight.hora_llegada || '-'}</td>
            <td>${flight.origen || '-'}</td>
            <td>${flight.posicion || '-'}</td>
            <td>${flight.vuelo_salida || '-'}</td>
            <td>${flight.fecha_salida || '-'}</td>
            <td>${flight.hora_salida || '-'}</td>
            <td>${flight.destino || '-'}</td>
        </tr>`;
    });
    tableHtml += `</tbody></table>`;
    container.innerHTML = `<div class="table-responsive vertical-scroll">${tableHtml}</div>`;
    console.log(`[perf] carga tabla: ${(performance.now()-t0).toFixed(1)}ms, filas=${flights.length}`);
    // After rendering, ensure the table can overflow horizontally on small screens.
    try {
        const area = document.getElementById('cargo-itinerary-scroll');
        const table = container.querySelector('table');
        if (table && area) {
            requestAnimationFrame(() => {
                table.style.width = 'auto';
                const needed = table.scrollWidth;
                if (needed > area.clientWidth) {
                    table.style.minWidth = needed + 'px';
                } else {
                    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
                    if (isTouch) {
                        const forced = Math.round(area.clientWidth * 1.2);
                        table.style.minWidth = forced + 'px';
                    } else {
                        table.style.minWidth = '';
                        table.style.width = '';
                    }
                }
                try { updateScrollControlsFor('cargo-itinerary-scroll'); } catch(e) {}
            });
        } else {
            setTimeout(() => { try { updateScrollControlsFor('cargo-itinerary-scroll'); } catch(e) {} }, 80);
        }
    } catch(e) { /* ignore */ }
}

// FIX: Loader global
function showGlobalLoader(text='Cargando...') {
  const el = document.getElementById('global-loader'); if (!el) return;
  const t = document.getElementById('global-loader-text'); if (t) t.textContent = text;
  el.dataset.startedAt = String(Date.now());
  el.classList.remove('hidden');
}
function hideGlobalLoader() {
  const el = document.getElementById('global-loader'); if (!el) return;
  const minVisible = 300;
  const started = parseInt(el.dataset.startedAt || '0', 10);
  const elapsed = Date.now() - started;
  const doHide = () => el.classList.add('hidden');
  if (elapsed < minVisible) setTimeout(doHide, minVisible - elapsed); else doHide();
}

// [extraído] Itinerario charts moved to js/itinerario.js


// =================================================================================
// FUNCIONES FALTANTES PARA ESTABILIZAR LA APP Y EVITAR ERRORES EN TIEMPO DE EJECUCIÓN
// =================================================================================

// Navegación: mostrar sección y marcar menú activo
function showSection(sectionKey, linkEl) {
    try {
        const targetId = `${sectionKey}-section`;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        // Marcar menú
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        if (linkEl) linkEl.classList.add('active');
        // Actualizar hash
        try { history.replaceState(null, '', `#${sectionKey}`); } catch(_) {}
        // Cerrar sidebar en móvil
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay && sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            overlay.classList.remove('active');
        }
    } catch (e) { console.warn('showSection error:', e); }
}

function handleNavigation(e) {
    const a = e.target.closest('a.menu-item');
    if (!a) return;
    e.preventDefault();
    const action = a.dataset.action;
    const section = a.dataset.section;
    if (action === 'logout') {
        try { sessionStorage.removeItem('currentUser'); } catch(_) {}
        const mainApp = document.getElementById('main-app');
        const login = document.getElementById('login-screen');
        if (mainApp) mainApp.classList.add('hidden');
        if (login) login.classList.remove('hidden');
        const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = '';
        return;
    }
    if (section) {
        showSection(section, a);
        // ensure sidebar closes after selecting on any device and collapse on desktop
        try {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) { sidebar.classList.remove('visible'); overlay.classList.remove('active'); }
            const isMobile = window.innerWidth <= 991.98;
            if (!isMobile) { document.body.classList.add('sidebar-collapsed'); try { localStorage.setItem('sidebarState','collapsed'); } catch(_) {} }
        } catch(_) {}
        // Hooks ligeros al entrar a ciertas vistas
        if (section === 'operaciones-totales') { try { updateOpsSummary(); renderOperacionesTotales(); } catch(_) {} }
        else { try { stopOpsAnim(); } catch(_) {} }
        if (section === 'itinerario') { try { /* charts se renderizan en el módulo */ } catch(_) {} }
        if (section === 'demoras') { try { setTimeout(()=>renderDemoras(), 50); } catch(_) {} }
    }
}

// Fecha en la barra superior
function updateDate() {
    try {
        const el = document.getElementById('current-date');
        if (!el) return;
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        let txt = fmt.format(now);
        // Capitalizar primera letra
        txt = txt.charAt(0).toUpperCase() + txt.slice(1);
        el.textContent = txt;
    } catch (e) { /* ignore */ }
}

// Close sidebar when tapping overlay on mobile
document.addEventListener('DOMContentLoaded', function(){
    try {
        const overlay = document.getElementById('sidebar-overlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar && !overlay._wired){
            overlay._wired = 1;
            overlay.addEventListener('click', function(){
                sidebar.classList.remove('visible');
                overlay.classList.remove('active');
            });
        }
    } catch(_) {}
});

// Resumen y gráficas de Operaciones Totales (restauración completa con filtros, animaciones y colores)
const opsCharts = {};
const opsUIState = {
    monthly2025: false,
    sections: { comercial: true, carga: true, general: true },
    years: new Set(['2022','2023','2024','2025']),
    months2025: new Set(['01','02','03','04','05','06','07','08','09','10','11','12']),
    preset: 'full' // 'ops' | 'full'
};
// Animación segura para íconos viajeros en Operaciones Totales
if (!window._opsAnim) window._opsAnim = { rafId: 0, running: false };
function startOpsAnim() {
    // Allow animation on all devices
    if (window._opsAnim.running) return;
    window._opsAnim.running = true;
    const tick = () => {
        if (!window._opsAnim.running) { window._opsAnim.rafId = 0; return; }
        window._opsAnim.rafId = requestAnimationFrame(tick);
        try {
            Object.values(opsCharts).forEach(ch => {
                if (ch && ch.config && ch.config.type === 'line') {
                    if (typeof ch.draw === 'function') ch.draw();
                    else if (typeof ch.render === 'function') ch.render();
                }
            });
        } catch(_) { /* noop */ }
    };
    window._opsAnim.rafId = requestAnimationFrame(tick);
}
function stopOpsAnim() {
    window._opsAnim.running = false;
    if (window._opsAnim.rafId) cancelAnimationFrame(window._opsAnim.rafId);
    window._opsAnim.rafId = 0;
}
function destroyOpsCharts() {
    Object.keys(opsCharts).forEach(k => { try { opsCharts[k].destroy(); } catch(_) {} delete opsCharts[k]; });
    stopOpsAnim();
}
function renderOperacionesTotales() {
    try {
        const theme = getChartColors();

        // Helpers de colores con gradientes por canvas
            function makeGradient(canvas, c1, c2){
            const ctx = canvas.getContext('2d');
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
            g.addColorStop(0, c1);
            g.addColorStop(1, c2);
            return g;
        }
            // Plugin para animar un ícono viajero sobre la línea
            const TravelerPlugin = {
                id: 'travelerPlugin',
                afterDraw(chart, args, opts){
                    try {
                        const { ctx, chartArea } = chart;
                        if (!chartArea || !chart.getDatasetMeta) return;
                        const ds = chart.data.datasets[0];
                        const meta = chart.getDatasetMeta(0);
                        if (!meta || !meta.data || meta.data.length === 0) return;
                        const t = (performance.now() / (opts?.speed || 3500)) % 1; // ciclo
                        // posición interpolada entre dos puntos
                        const total = meta.data.length;
                        const fIdx = t * (total - 1);
                        const i0 = Math.floor(fIdx), i1 = Math.min(total-1, i0+1);
                        const p0 = meta.data[i0], p1 = meta.data[i1];
                        if (!p0 || !p1) return;
                        const localT = fIdx - i0;
                        const x = p0.x + (p1.x - p0.x) * localT;
                        const y = p0.y + (p1.y - p0.y) * localT;
                        // Dibujar el ícono
                        ctx.save();
                        ctx.translate(x, y);
                        const scale = opts?.scale || 1.0;
                        ctx.scale(scale, scale);
                        const type = opts?.type || 'plane';
                        ctx.font = '14px system-ui, Segoe UI, Roboto';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.globalAlpha = 0.9;
                        if (type==='person') {
                            // Dibujo básico para representar persona hacia la derecha
                            const isDark = document.body.classList.contains('dark-mode');
                            const tone = isDark ? '#e9ecef' : '#1f2937'; // claro en oscuro, oscuro en claro
                            ctx.strokeStyle = tone;
                            ctx.fillStyle = tone;
                            ctx.lineWidth = 2.0;
                            // cabeza
                            ctx.beginPath(); ctx.arc(0, -5, 2.6, 0, Math.PI*2); ctx.fill();
                            // cuerpo
                            ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 5); ctx.stroke();
                            // brazo derecho (hacia adelante)
                            ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(5, 2.5); ctx.stroke();
                            // brazo izquierdo (hacia atrás)
                            ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(-3.5, 0.8); ctx.stroke();
                            // pierna derecha (al frente)
                            ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(5.5,9); ctx.stroke();
                            // pierna izquierda (atrás)
                            ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(-2.8,10.2); ctx.stroke();
                        } else {
                            const emoji = type==='suitcase' ? '🧳' : type==='box' ? '📦' : '✈';
                            ctx.fillText(emoji, 0, 0);
                        }
                        ctx.restore();
                    } catch(_){ /* noop */ }
                }
            };

            // Etiquetas rectangulares con período y valor completo (con anti-encimado)
            const DataBubblePlugin = {
                id: 'dataBubble',
                afterDatasetsDraw(chart, args, opts){
                    try{
                        if (!opts || opts.show === false) return;
                        const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
                        if (!ds) return;
                        const meta = chart.getDatasetMeta(0);
                        const values = (ds.data||[]).map(v => Number(v)||0);
                        const points = meta && meta.data ? meta.data : [];
                        const ctx = chart.ctx;
                        const labels = (chart.data && chart.data.labels) || [];
                        const borderColor = (opts.borderColor || ds.borderColor || '#0d6efd');
                        const fillColor = (opts.fillColor || ds.borderColor || '#0d6efd');
                        const textColor = (opts.textColor || '#ffffff');
                        const corner = 10;
                        const onlyMax = !!opts.onlyMax;
                        const area = chart.chartArea;
                        const small = !!opts.small;
                        const minGapX = Number(opts.minGapX || 16);

                        // hallar índice máximo si aplica
                        let maxIdx = -1; if (onlyMax) { let mv=-Infinity; values.forEach((v,i)=>{ if(v>mv){ mv=v; maxIdx=i; } }); }

                        ctx.save();
                        ctx.font = `${small ? '600 10px' : '600 12px'} system-ui, Segoe UI, Roboto, Arial`;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        let lastShownX = -Infinity;
                        let lastPlacedBelow = false;

                        for (let i=0;i<points.length;i++){
                            if (onlyMax && i!==maxIdx) continue;
                            const v = values[i]; if (!isFinite(v) || v===0) continue;
                            const p = points[i]; if (!p) continue;

                            // Evitar encimado entre etiquetas en modo "small"
                            if (!onlyMax && minGapX > 0) {
                                const prevVal = i>0 ? values[i-1] : -Infinity;
                                const nextVal = i<values.length-1 ? values[i+1] : -Infinity;
                                const isPeakLocal = v>=prevVal && v>=nextVal;
                                if ((p.x - lastShownX) < minGapX && !isPeakLocal) { continue; }
                            }

                            const period = (labels[i] != null) ? String(labels[i]) : '';
                            const valueTxt = formatFull(v, (opts.format||'int'));
                            const line1 = period;
                            const line2 = valueTxt;
                            const padX = small ? 8 : 10;
                            const padY = small ? 4 : 6;
                            const maxLineW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width);
                            const w = Math.ceil(maxLineW) + padX*2;
                            const lineH = 12 + 2; // font size + spacing
                            const h = (small ? 6 : 8) + lineH*2; // dos líneas con padding
                            let x = p.x; let y = p.y - (opts.offsetY || 0); // por defecto arriba del punto
                            let rx = Math.round(x - w/2), ry = Math.round(y - h/2);
                            // Decidir ubicación arriba/abajo: evita encimado alternando cuando están muy cerca
                            let placeBelow = false;
                            if (area && ry < area.top + 2) {
                                placeBelow = true;
                            } else if (minGapX > 0 && (p.x - lastShownX) < minGapX) {
                                placeBelow = !lastPlacedBelow; // alternar
                            }
                            if (placeBelow) {
                                const below = (opts.offsetBelow || 26);
                                y = p.y + below;
                                rx = Math.round(x - w/2);
                                ry = Math.round(y - h/2);
                            }
                            // Limitar horizontalmente dentro del área del gráfico
                            if (area) {
                                if (rx < area.left + 2) rx = Math.round(area.left + 2);
                                if (rx + w > area.right - 2) rx = Math.round(area.right - 2 - w);
                            }
                            // sombra sutil
                            ctx.save();
                            ctx.shadowColor = 'rgba(0,0,0,0.18)';
                            ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
                            // rect redondeado relleno con color de serie
                            const r = corner;
                            ctx.fillStyle = fillColor;
                            ctx.beginPath();
                            ctx.moveTo(rx + r, ry);
                            ctx.lineTo(rx + w - r, ry);
                            ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
                            ctx.lineTo(rx + w, ry + h - r);
                            ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
                            ctx.lineTo(rx + r, ry + h);
                            ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
                            ctx.lineTo(rx, ry + r);
                            ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                            ctx.closePath();
                            ctx.fill();
                            ctx.restore();
                            // borde
                            ctx.beginPath();
                            ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
                            ctx.moveTo(rx + r, ry);
                            ctx.lineTo(rx + w - r, ry);
                            ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
                            ctx.lineTo(rx + w, ry + h - r);
                            ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
                            ctx.lineTo(rx + r, ry + h);
                            ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
                            ctx.lineTo(rx, ry + r);
                            ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                            ctx.closePath();
                            ctx.stroke();
                            // texto
                            ctx.fillStyle = textColor;
                            const cx = rx + w/2, cy = ry + h/2;
                            ctx.fillText(line1, cx, cy - 5);
                            ctx.fillText(line2, cx, cy + 9);
                            lastShownX = cx;
                            lastPlacedBelow = placeBelow;
                        }
                        ctx.restore();
                    } catch(_){ /* noop */ }
                }
            };

            // Resalta el pico máximo con un glow sutil (debajo de etiquetas)
            const PeakGlowPlugin = {
                id: 'peakGlow',
                beforeDatasetsDraw(chart, args, opts){
                    try {
                        const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
                        if (!ds) return;
                        const meta = chart.getDatasetMeta(0);
                        const data = (ds.data||[]).map(v => Number(v)||0);
                        if (!meta || !meta.data || !meta.data.length) return;
                        let maxVal = -Infinity, maxIdx = -1;
                        for (let i=0;i<data.length;i++){ if (data[i] > maxVal){ maxVal=data[i]; maxIdx=i; } }
                        if (maxIdx < 0) return;
                        const pt = meta.data[maxIdx]; if (!pt) return;
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = (opts && opts.color) ? hexToRgba(opts.color, 0.14) : 'rgba(0,0,0,0.10)';
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 10, 0, Math.PI*2);
                        ctx.fill();
                        ctx.restore();
                    } catch(_) { /* noop */ }
                }
            };

            function makePeakCfg(canvas, labels, data, label, stroke, fillTop, fillBottom, animProfile, fmtType='int', traveler, xTitle='Periodo', titleText){
                const bg = makeGradient(canvas, fillTop, fillBottom);
                const border = stroke;
                const maxVal = Math.max(0, ...data);
                const pointRadius = data.map(v => {
                    const t = maxVal>0 ? (v/maxVal) : 0;
                    const base = 2 + Math.min(3, t*2.5);
                    return v === maxVal && maxVal>0 ? Math.max(6, base) : base;
                });
                const pointHoverRadius = data.map(v => (v === maxVal && maxVal>0) ? 7 : 4);
                const isDark = document.body.classList.contains('dark-mode');
                const emoji = fmtType==='pax' ? '🚶' : (fmtType==='ton' ? '🧳' : '✈');
                const finalTitle = titleText || `${emoji} ${label}`;
                const anim = Object.assign({ duration: 2600, easing: 'easeInOutCubic', stagger: 50 }, animProfile||{});
                const smallMode = labels && labels.length > 8; // mensual normalmente
                return {
                    type: 'line',
                    data: { labels, datasets: [{
                        label,
                        data,
                        borderColor: border,
                        backgroundColor: bg,
                        borderWidth: 3,
                        pointBackgroundColor: border,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius,
                        pointHoverRadius,
                        tension: 0.25,
                        fill: true,
                        clip: false
                    }] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 64, right: 14, bottom: 20, left: 10 } },
                        animation: {
                            duration: anim.duration,
                            easing: anim.easing,
                            delay: (ctx) => ctx.type === 'data' ? (ctx.dataIndex * (anim.stagger||0)) : 0
                        },
                        animations: {
                            y: { easing: anim.easing, duration: anim.duration },
                            tension: { from: 0.6, to: 0.25, duration: Math.min(1200, anim.duration), easing: 'easeOutQuad' }
                        },
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: finalTitle,
                                align: 'start',
                                color: theme.labels,
                                padding: { top: 6, bottom: 8 },
                                font: { size: 14, weight: '600' }
                            },
                            tooltip: {
                                backgroundColor: theme.tooltip.backgroundColor,
                                titleColor: theme.tooltip.titleColor,
                                bodyColor: theme.tooltip.bodyColor,
                                callbacks: {
                                    label: (ctx) => {
                                        const v = ctx.parsed.y;
                                        return `${ctx.dataset.label}: ${formatCompact(v, fmtType)}`;
                                    }
                                }
                            },
                            // Desactivamos el plugin nativo; usamos nuestro badge rectangular
                            datalabels: { display: false },
                            travelerPlugin: traveler || {},
                            dataBubble: { show: true, borderColor: border, fillColor: border, textColor: '#ffffff', format: fmtType, onlyMax: false, offsetY: 40, small: smallMode, minGapX: smallMode ? 34 : 16 }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: theme.ticks }, title: { display: true, text: xTitle, color: theme.labels, font: { weight: '600' } } },
                            y: { beginAtZero: true, suggestedMax: Math.ceil(maxVal * 1.15), grid: { color: theme.grid }, ticks: { color: theme.ticks }, title: { display: true, text: label, color: theme.labels, font: { weight: '600' } } }
                        }
                    },
                    plugins: [PeakGlowPlugin, TravelerPlugin, DataBubblePlugin]
                };
            }

        // Preparar datos según modo
        const yearly = staticData.operacionesTotales;
        const monthly = staticData.mensual2025;
        const useMonthly = opsUIState.monthly2025;

        // Construir labels y series
        let labels = [];
        const series = {
            comercialOps: [], comercialPax: [],
            cargaOps: [], cargaTon: [],
            generalOps: [], generalPax: []
        };

        if (!useMonthly) {
            const selYears = Array.from(opsUIState.years).sort();
            labels = selYears;
            const pick = (arr, key) => selYears.map(y => (arr.find(d=> String(d.periodo)===y)?.[key] ?? 0));
            series.comercialOps = pick(yearly.comercial, 'operaciones');
            series.comercialPax = pick(yearly.comercial, 'pasajeros');
            series.cargaOps     = pick(yearly.carga, 'operaciones');
            series.cargaTon     = pick(yearly.carga, 'toneladas');
            series.generalOps   = pick(yearly.general, 'operaciones');
            series.generalPax   = pick(yearly.general, 'pasajeros');
        } else {
            const selMonths = Array.from(opsUIState.months2025).sort();
            labels = monthly.comercial.filter(m => selMonths.includes(m.mes)).map(m => m.label);
            // Comercial
            series.comercialOps = monthly.comercial.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.comercialPax = monthly.comercialPasajeros.filter(m => selMonths.includes(m.mes)).map(m => m.pasajeros || 0);
            // Carga
            series.cargaOps = monthly.carga.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.cargaTon = monthly.cargaToneladas.filter(m => selMonths.includes(m.mes)).map(m => m.toneladas || 0);
            // General
            series.generalOps = monthly.general.operaciones.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.generalPax = monthly.general.pasajeros.filter(m => selMonths.includes(m.mes)).map(m => m.pasajeros || 0);
    }

        // Destruir charts previos y renderizar visibles
        destroyOpsCharts();
        const showCom = !!opsUIState.sections.comercial;
        const showCar = !!opsUIState.sections.carga;
        const showGen = !!opsUIState.sections.general;
        const presetOpsOnly = (opsUIState.preset === 'ops');

        // Helpers para mostrar/ocultar grupos y charts específicos
        const setVisible = (selector, vis) => { const el = document.querySelector(selector); if (el) el.style.display = vis ? '' : 'none'; };
        setVisible('#commercial-group', showCom);
        setVisible('#cargo-group', showCar);
        setVisible('#general-group', showGen);

            // Comercial
        if (showCom) {
            const c1 = document.getElementById('commercialOpsChart');
            const c2 = document.getElementById('commercialPaxChart');
                if (c1) opsCharts.commercialOpsChart = new Chart(c1, makePeakCfg(
                    c1, labels, series.comercialOps,
                    'Operaciones', '#1e88e5', 'rgba(66,165,245,0.35)', 'rgba(21,101,192,0.05)',
                    { easing:'easeOutQuart', duration: 4800, stagger: 110 },
                    'int', { type:'plane', speed: 20000, scale: 1.25 }, (useMonthly?'Mes':'Año'), '✈ Operaciones (Comercial)'
                ));
            setVisible('#commercial-group canvas#commercialPaxChart', !presetOpsOnly);
                if (!presetOpsOnly && c2) opsCharts.commercialPaxChart = new Chart(c2, makePeakCfg(
                    c2, labels, series.comercialPax,
                    'Pasajeros', '#1565c0', 'rgba(33,150,243,0.35)', 'rgba(13,71,161,0.05)',
                    { easing:'easeOutElastic', duration: 5200, stagger: 160 },
                    'pax', { type:'person', speed: 22000, scale: 0.9 }, (useMonthly?'Mes':'Año'), '🚶 Pasajeros (Comercial)'
                ));
        }
            // Carga
        if (showCar) {
            const k1 = document.getElementById('cargoOpsChart');
            const k2 = document.getElementById('cargoTonsChart');
                if (k1) opsCharts.cargoOpsChart = new Chart(k1, makePeakCfg(
                    k1, labels, series.cargaOps,
                    'Operaciones', '#fb8c00', 'rgba(255,183,77,0.35)', 'rgba(239,108,0,0.05)',
                    { easing:'easeOutBack', duration: 5000, stagger: 140 },
                    'int', { type:'plane', speed: 24000, scale: 1.35 }, (useMonthly?'Mes':'Año'), '✈ Operaciones (Carga)'
                ));
            setVisible('#cargo-group canvas#cargoTonsChart', !presetOpsOnly);
                if (!presetOpsOnly && k2) opsCharts.cargoTonsChart = new Chart(k2, makePeakCfg(
                    k2, labels, series.cargaTon,
                    'Toneladas', '#f57c00', 'rgba(255,204,128,0.35)', 'rgba(230,81,0,0.05)',
                    { easing:'easeOutCubic', duration: 5600, stagger: 170 },
                    'ton', { type:'suitcase', speed: 26000, scale: 1.5 }, (useMonthly?'Mes':'Año'), '🧳 Toneladas (Carga)'
                ));
        }
            // General
        if (showGen) {
            const g1 = document.getElementById('generalOpsChart');
            const g2 = document.getElementById('generalPaxChart');
                if (g1) opsCharts.generalOpsChart = new Chart(g1, makePeakCfg(
                    g1, labels, series.generalOps,
                    'Operaciones', '#2e7d32', 'rgba(129,199,132,0.35)', 'rgba(27,94,32,0.05)',
                    { easing:'easeOutQuart', duration: 4800, stagger: 130 },
                    'int', { type:'plane', speed: 22000, scale: 1.3 }, (useMonthly?'Mes':'Año'), '✈ Operaciones (General)'
                ));
            setVisible('#general-group canvas#generalPaxChart', !presetOpsOnly);
                if (!presetOpsOnly && g2) opsCharts.generalPaxChart = new Chart(g2, makePeakCfg(
                    g2, labels, series.generalPax,
                    'Pasajeros', '#1b5e20', 'rgba(165,214,167,0.35)', 'rgba(27,94,32,0.05)',
                    { easing:'easeOutElastic', duration: 5200, stagger: 160 },
                    'pax', { type:'person', speed: 23000, scale: 0.9 }, (useMonthly?'Mes':'Año'), '🚶 Pasajeros (General)'
                ));
        }

    // Iniciar animación de viajeros
    startOpsAnim();

    // Actualizar resumen en función del modo/filtros
        try { updateOpsSummary(); } catch(_) {}
    } catch (e) { console.warn('renderOperacionesTotales error:', e); }
}

function updateOpsSummary() {
    try {
        const el = document.getElementById('ops-summary'); if (!el) return;
        if (!el) return;
        const monthly = opsUIState.monthly2025;
        if (!monthly) {
            // Resumen del último año seleccionado (o 2025 si está)
            const yData = staticData.operacionesTotales;
            const years = Array.from(opsUIState.years).sort();
            const lastYear = years.includes('2025') ? '2025' : years[years.length-1];
            const c = yData.comercial.find(d => String(d.periodo) === String(lastYear)) || {};
            const k = yData.carga.find(d => String(d.periodo) === String(lastYear)) || {};
            const g = yData.general.find(d => String(d.periodo) === String(lastYear)) || {};
            el.innerHTML = `<span>Año ${lastYear}</span>
                <span>· Comercial: <strong>${(c.operaciones||0).toLocaleString('es-MX')}</strong> ops</span>
                <span>· Pax: <strong>${(c.pasajeros||0).toLocaleString('es-MX')}</strong></span>
                <span>· Carga: <strong>${(k.operaciones||0).toLocaleString('es-MX')}</strong> ops</span>
                <span>· Ton: <strong>${(k.toneladas||0).toLocaleString('es-MX')}</strong></span>
                <span>· General: <strong>${(g.operaciones||0).toLocaleString('es-MX')}</strong> ops</span>`;
        } else {
            const m = staticData.mensual2025;
            const months = Array.from(opsUIState.months2025).sort();
            const sum = (arr, key) => arr.filter(x=>months.includes(x.mes)).reduce((a,b)=> a + (Number(b[key]||0)), 0);
            const cOps = sum(m.comercial, 'operaciones');
            const cPax = sum(m.comercialPasajeros, 'pasajeros');
            const kOps = sum(m.carga, 'operaciones');
            const kTon = sum(m.cargaToneladas, 'toneladas');
            const gOps = sum(m.general.operaciones, 'operaciones');
            const gPax = sum(m.general.pasajeros, 'pasajeros');
            el.innerHTML = `<span>2025 (${months.length} meses)</span>
                <span>· Comercial: <strong>${cOps.toLocaleString('es-MX')}</strong> ops</span>
                <span>· Pax: <strong>${cPax.toLocaleString('es-MX')}</strong></span>
                <span>· Carga: <strong>${kOps.toLocaleString('es-MX')}</strong> ops</span>
                <span>· Ton: <strong>${kTon.toLocaleString('es-MX')}</strong></span>
                <span>· General: <strong>${gOps.toLocaleString('es-MX')}</strong> ops</span>
                <span>· Pax Gen: <strong>${gPax.toLocaleString('es-MX')}</strong></span>`;
        }
    } catch (e) { /* ignore */ }
}

// Demoras: renderizar tabla y gráfica simple
// [extraído] renderDemoras moved to js/demoras.js

// Estadística diaria mínima para tarjetas de Operaciones Totales
function computeDailyStats() {
    try {
        // Heurística: usa flights del día "hoy" y cuenta por categoría
        const today = new Date();
        const y = today.getFullYear(), m = String(today.getMonth()+1).padStart(2,'0'), d = String(today.getDate()).padStart(2,'0');
        const dmy = `${d}/${m}/${y}`;
        const isPax = f => (String(f.categoria||'').toLowerCase()==='pasajeros');
        const isCargo = f => (String(f.categoria||'').toLowerCase()==='carga');
        let c = { ayer: 0, hoy: 0, trend: '=' }, k={ ayer:0, hoy:0, trend:'=' }, g={ ayer:0, hoy:0, trend:'=' };
        const countFor = (ymd, pred) => allFlightsData.filter(f => (f.fecha_llegada===ymd || f.fecha_salida===ymd) && pred(f)).length;
        c.hoy = countFor(dmy, isPax); k.hoy = countFor(dmy, isCargo);
        // Ayer
        const ay = new Date(today); ay.setDate(today.getDate()-1);
        const y2 = ay.getFullYear(), m2 = String(ay.getMonth()+1).padStart(2,'0'), d2 = String(ay.getDate()).padStart(2,'0');
        const dmy2 = `${d2}/${m2}/${y2}`;
        c.ayer = countFor(dmy2, isPax); k.ayer = countFor(dmy2, isCargo);
        // General: lo que no cae en pax/carga
        const isGen = f => !isPax(f) && !isCargo(f);
        g.hoy = countFor(dmy, isGen); g.ayer = countFor(dmy2, isGen);
        const trend = (h,a) => h>a ? '↑' : h<a ? '↓' : '=';
        c.trend = trend(c.hoy, c.ayer); k.trend = trend(k.hoy, k.ayer); g.trend = trend(g.hoy, g.ayer);
        const set = (id,v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('daily-comercial-hoy', c.hoy); set('daily-comercial-ayer', c.ayer); set('daily-comercial-trend', c.trend);
        set('daily-carga-hoy', k.hoy); set('daily-carga-ayer', k.ayer); set('daily-carga-trend', k.trend);
        set('daily-general-hoy', g.hoy); set('daily-general-ayer', g.ayer); set('daily-general-trend', g.trend);
        return { comercial: c, carga: k, general: g };
    } catch (e) { console.warn('computeDailyStats error:', e); return { comercial:{ayer:0,hoy:0,trend:'='}, carga:{ayer:0,hoy:0,trend:'='}, general:{ayer:0,hoy:0,trend:'='} }; }
}

// Lightbox para PDFs
function setupLightboxListeners() {
    try {
        const lb = document.getElementById('pdf-lightbox'); if (!lb) return;
        const closeBtn = document.getElementById('lightbox-close');
        const content = document.getElementById('lightbox-content');
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.pdf-zoom-btn');
            if (!btn) return;
            e.preventDefault();
            const container = btn.closest('.pdf-container');
            const frame = container && container.querySelector('iframe');
            if (frame) {
                content.innerHTML = `<iframe src="${frame.src}" width="100%" height="100%" class="border-0"></iframe>`;
                lb.classList.remove('hidden');
                return;
            }
            // Fallback: canvas-based single-page viewer
            const viewer = container && container.querySelector('.pdf-singlepage-viewer[data-src]');
            const url = viewer && viewer.getAttribute('data-src');
            if (url) {
                content.innerHTML = `<iframe src="${url}" width="100%" height="100%" class="border-0"></iframe>`;
                lb.classList.remove('hidden');
            }
        });
        const hide = () => lb.classList.add('hidden');
        if (closeBtn) closeBtn.addEventListener('click', hide);
        lb.addEventListener('click', (e)=>{ if (e.target === lb) hide(); });
    } catch (e) { /* ignore */ }
}

// Controles de scroll horizontal para tablas de itinerario
function updateScrollControlsFor(containerId) {
    const area = document.getElementById(containerId);
    if (!area) return;
    const wrapper = area.closest('.itinerary-horizontal');
    if (!wrapper) return;
    const leftBtn = wrapper.querySelector('.scroll-left');
    const rightBtn = wrapper.querySelector('.scroll-right');
    const range = wrapper.querySelector('.scroll-range');
    const max = Math.max(0, area.scrollWidth - area.clientWidth);
    const setState = () => {
        const m = Math.max(0, area.scrollWidth - area.clientWidth);
        if (range) { range.max = String(m); range.value = String(area.scrollLeft); }
        if (leftBtn) leftBtn.disabled = area.scrollLeft <= 0;
        if (rightBtn) rightBtn.disabled = area.scrollLeft >= m - 5;
    };
    const scrollBy = (dx) => { area.scrollBy({ left: dx, behavior: 'smooth' }); setTimeout(setState, 120); };
    if (leftBtn && !leftBtn._wired) { leftBtn._wired = 1; leftBtn.addEventListener('click', ()=> scrollBy(-240)); }
    if (rightBtn && !rightBtn._wired) { rightBtn._wired = 1; rightBtn.addEventListener('click', ()=> scrollBy(240)); }
    if (range && !range._wired) { range._wired = 1; range.addEventListener('input', ()=> area.scrollTo({ left: Number(range.value)||0 })); }
    if (!area._wheelWired) {
        area._wheelWired = 1;
        area.addEventListener('wheel', (ev)=>{
            // Sólo desplazar horizontalmente si el usuario mantiene Shift o si hay deltaX notable
            const horiz = Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
            if (ev.shiftKey || horiz) {
                area.scrollLeft += ev.deltaX || (ev.shiftKey ? ev.deltaY : 0);
                setState();
                // Si estamos forzando scroll horizontal por Shift, prevenimos el vertical
                if (ev.shiftKey) ev.preventDefault();
            }
        }, { passive:false });
    }
    setState();
}

function setupBodyEventListeners() {
    try {
        // Sidebar overlay click
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay && !overlay._wired) { overlay._wired = 1; overlay.addEventListener('click', ()=> {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('visible');
            overlay.classList.remove('active');
        }); }
        // Scroll controls ranges
        document.querySelectorAll('.itinerary-horizontal .h-scroll-area').forEach(area => {
            try { updateScrollControlsFor(area.id); } catch(_) {}
        });
    } catch (e) { /* ignore */ }
}

// Exportar todas las gráficas en un solo PDF (implementación básica)
async function exportAllChartsPDF() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { console.warn('jsPDF no disponible'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p','mm','a4');
        const chartIds = ['commercialOpsChart','commercialPaxChart','cargoOpsChart','cargoTonsChart','generalOpsChart','generalPaxChart'];
            let first = true;
        for (const id of chartIds) {
            const canvas = document.getElementById(id);
                if (!canvas || canvas.closest('.col-lg-6')?.style.display === 'none' || canvas.closest('#commercial-group,#cargo-group,#general-group')?.style.display === 'none') continue;
            const img = canvas.toDataURL('image/png', 1.0);
            if (!first) doc.addPage();
            first = false;
            const pageW = 210, pageH = 297;
            const margin = 10;
            const w = pageW - margin*2; const h = w * 0.6;
                doc.setFont('helvetica','bold');
                doc.text(id, margin, margin);
            doc.addImage(img, 'PNG', margin, margin+4, w, h);
        }
        doc.save('operaciones_totales.pdf');
    } catch (e) { console.warn('exportAllChartsPDF error:', e); }
}

// Sesión y login
function showMainApp() {
    const login = document.getElementById('login-screen');
    const main = document.getElementById('main-app');
    if (login) login.classList.add('hidden');
    if (main) main.classList.remove('hidden');
    // Usuario actual
    const name = sessionStorage.getItem('currentUser') || '';
    const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = name;
    // Permisos: Itinerario mensual
    const menu = document.getElementById('itinerario-mensual-menu');
    if (menu) {
        const u = dashboardData.users[name];
        const can = !!(u && u.canViewItinerarioMensual);
        menu.style.display = can ? '' : 'none';
    }
}

function checkSession() {
    try {
        const name = sessionStorage.getItem('currentUser');
        if (name) showMainApp();
    } catch (e) { /* ignore */ }
}

// PDFs dinámicos (ligero)
function createPdfSections() {
    try {
        // Por ahora, solo aseguramos que el título del menú coincida con la sección
        const cfg = dashboardData && dashboardData.pdfSections ? dashboardData.pdfSections['itinerario-mensual'] : null;
        if (cfg) {
            const menu = document.getElementById('itinerario-mensual-menu');
            if (menu) menu.querySelector('span').textContent = cfg.title;
            const frame = document.querySelector('#itinerario-mensual-section iframe');
            if (frame) frame.src = cfg.url;
        }
    } catch (e) { /* ignore */ }
}

// Placeholders seguros para funciones referenciadas
function initFrecuenciasSemana() {}
function renderFrecuenciasSemana() {}
function changeFreqWeek(_delta) {}
function ensurePeakDate() {}
function renderDailyPeaks() {}
function initPeakDateControls() {}

// ================== Operaciones Totales: wiring de filtros del modal ==================
document.addEventListener('DOMContentLoaded', () => {
    try {
        const toggleMonthly = document.getElementById('toggle-monthly-2025');
        const yearsHint = document.getElementById('years-disabled-hint');
        const monthsPanel = document.getElementById('ops-months-2025');
        const monthsAll = document.getElementById('months-select-all');
        const monthsNone = document.getElementById('months-select-none');
        const sectionsBox = document.getElementById('ops-sections-filters');
        const yearsBox = document.getElementById('ops-years-filters');
        const presetOps = document.getElementById('preset-ops');
        const presetFull = document.getElementById('preset-full');

        function refreshDisabledYears(disabled){
            yearsBox?.querySelectorAll('input[type="checkbox"]').forEach(inp => { inp.disabled = disabled; });
            if (yearsHint) yearsHint.classList.toggle('d-none', !disabled);
        }

        if (toggleMonthly && !toggleMonthly._wired) {
            toggleMonthly._wired = 1;
            toggleMonthly.addEventListener('change', () => {
                opsUIState.monthly2025 = !!toggleMonthly.checked;
                refreshDisabledYears(opsUIState.monthly2025);
                if (monthsPanel) monthsPanel.style.display = opsUIState.monthly2025 ? '' : 'none';
                renderOperacionesTotales();
            });
        }
        // Inicial: oculto por defecto
        if (monthsPanel) monthsPanel.style.display = 'none';
        refreshDisabledYears(false);

        if (sectionsBox && !sectionsBox._wired) {
            sectionsBox._wired = 1;
            sectionsBox.addEventListener('change', () => {
                opsUIState.sections.comercial = document.getElementById('filter-section-comercial')?.checked !== false;
                opsUIState.sections.carga = document.getElementById('filter-section-carga')?.checked !== false;
                opsUIState.sections.general = document.getElementById('filter-section-general')?.checked !== false;
                renderOperacionesTotales();
            });
        }

        if (yearsBox && !yearsBox._wired) {
            yearsBox._wired = 1;
            yearsBox.addEventListener('change', () => {
                const ys = new Set();
                yearsBox.querySelectorAll('input[type="checkbox"]').forEach(inp => { if (inp.checked) ys.add(String(inp.dataset.year)); });
                opsUIState.years = ys;
                renderOperacionesTotales();
            });
        }

        function readMonths(){
            const sel = new Set();
            monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach(inp => { if (inp.checked) sel.add(String(inp.dataset.month)); });
            opsUIState.months2025 = sel;
        }
        if (monthsPanel && !monthsPanel._wired) {
            monthsPanel._wired = 1;
            monthsPanel.addEventListener('change', (e) => {
                if (e.target && e.target.matches('input[type="checkbox"][data-month]')) {
                    readMonths();
                    renderOperacionesTotales();
                }
            });
        }
        if (monthsAll && !monthsAll._wired) { monthsAll._wired = 1; monthsAll.addEventListener('click', ()=>{ monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach(inp => inp.checked = true); readMonths(); renderOperacionesTotales(); }); }
        if (monthsNone && !monthsNone._wired) { monthsNone._wired = 1; monthsNone.addEventListener('click', ()=>{ monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach(inp => inp.checked = false); readMonths(); renderOperacionesTotales(); }); }

        if (presetOps && !presetOps._wired) { presetOps._wired = 1; presetOps.addEventListener('click', ()=>{ opsUIState.preset='ops'; renderOperacionesTotales(); }); }
        if (presetFull && !presetFull._wired) { presetFull._wired = 1; presetFull.addEventListener('click', ()=>{ opsUIState.preset='full'; renderOperacionesTotales(); }); }
    } catch (_) {}
});

// Manifiestos: UI mínima (preview de imagen y tabla local)
function setupManifestsUI() {
    try {
        const up = document.getElementById('manifest-upload');
        const prevImg = document.getElementById('manifest-preview');
        const placeholder = document.getElementById('manifest-preview-placeholder');
        const runBtn = document.getElementById('manifest-run-ocr');
    const loadEx = document.getElementById('manifest-load-example');
        const tableBody = document.querySelector('#manifest-records-table tbody');
        const saveBtn = document.getElementById('manifest-save');
        const clearBtn = document.getElementById('manifest-clear');
        const exportBtn = document.getElementById('manifest-export-json');
        const dirArr = document.getElementById('mf-dir-arr');
    const dirDep = document.getElementById('mf-dir-dep');
    const form = document.getElementById('manifest-form');
    // Estado: imagen actual (solo imágenes)
    let currentImageURL = '';
        // Carga de catálogo: airlines.csv (IATA,ICAO,Name)
        let airlinesCatalog = [];
    let iataToIcao = new Map();
    let icaoSet = new Set();
    // Catálogos de aeronaves
    let aircraftByReg = new Map(); // reg -> { type, ownerIATA }
    let typeByCode = new Map();    // IATA code -> { ICAO, Name }
    // Aeropuertos
    let airportByIATA = new Map(); // IATA -> Name
    let airportByName = new Map(); // lowercase Name -> IATA
    let iataSet = new Set();
        // OCR helpers locales
        function hasWordFactory(text){ const U=(text||'').toUpperCase(); return (w)=> U.includes(String(w||'').toUpperCase()); }
        function tokenizeUpper(text){ return (text||'').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean); }
        const timeRx = /\b(?:([01]?\d|2[0-3])[:hH\.]\s?([0-5]\d))(?:\s?(?:hrs|hr|h))?\b/;
        function findNearLabelValue(labels, valueRegex, text){
            try{
                const lines = (text||'').split(/\r?\n/);
                for (let i=0;i<lines.length;i++){
                    const u = lines[i].toUpperCase();
                    if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                        const m0 = lines[i].match(valueRegex); if (m0) return m0[0];
                        const n = lines[i+1]||''; const m1 = n.match(valueRegex); if (m1) return m1[0];
                    }
                }
            }catch(_){ }
            return '';
        }
        function findNearLabelIATACode(labels, text){
            const rxIATA = /\b[A-Z]{3}\b/g;
            try{
                const lines = (text||'').split(/\r?\n/);
                for (let i=0;i<lines.length;i++){
                    const u = lines[i].toUpperCase();
                    if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                        const search = (s)=>{ const arr = s.match(rxIATA)||[]; return arr.find(c=> iataSet.has(c)); };
                        const hit = search(lines[i]) || search(lines[i+1]||'');
                        if (hit) return hit;
                    }
                }
            }catch(_){ }
            return '';
        }
        function preprocessImage(imgEl){
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const w = imgEl.naturalWidth || imgEl.width;
                const h = imgEl.naturalHeight || imgEl.height;
                canvas.width = w; canvas.height = h;
                ctx.drawImage(imgEl, 0, 0, w, h);
                const imgData = ctx.getImageData(0,0,w,h);
                const d = imgData.data;
                let sum = 0;
                for (let i=0;i<d.length;i+=4){
                    const r=d[i], g=d[i+1], b=d[i+2];
                    let y = 0.299*r + 0.587*g + 0.114*b;
                    y = (y-128)*1.1 + 128; // contraste
                    sum += y;
                    d[i]=d[i+1]=d[i+2]=y;
                }
                const avg = sum / (d.length/4);
                const thresh = Math.max(96, Math.min(160, avg));
                for (let i=0;i<d.length;i+=4){
                    const y = d[i];
                    const v = y > thresh ? 255 : 0;
                    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
                }
                ctx.putImageData(imgData,0,0);
                return canvas.toDataURL('image/png');
            } catch(e){ console.warn('preprocessImage failed:', e); return imgEl.src; }
        }
        async function loadAirlinesCatalog(){
            try {
                const res = await fetch('data/master/airlines.csv', { cache:'no-store' });
                const text = await res.text();
                const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
                // Esperado: header IATA,ICAO,Name
                const out = [];
                for (let i=1;i<lines.length;i++){
                    const raw = lines[i];
                    const parts = raw.split(',');
                    if (parts.length < 3) continue;
                    const IATA = (parts[0]||'').trim();
                    const ICAO = (parts[1]||'').trim();
                    const Name = parts.slice(2).join(',').trim().replace(/^"|"$/g,'');
                    if (ICAO && /^[A-Za-z]{3}$/.test(ICAO)) {
                        const icao = ICAO.toUpperCase();
                        const iata = (IATA||'').toUpperCase();
                        out.push({ IATA: iata, ICAO: icao, Name });
                        icaoSet.add(icao);
                        if (iata && /^[A-Z0-9]{2}$/.test(iata)) iataToIcao.set(iata, icao);
                    }
                }
                airlinesCatalog = out;
                // Poblar datalist
                const dl = document.getElementById('airlines-icao-list');
                if (dl){ dl.innerHTML = out.map(r=>`<option value="${r.ICAO}">${r.Name}</option>`).join(''); }
            } catch (e) { console.warn('No se pudo cargar airlines.csv', e); }
        }
        async function loadAircraftCatalog(){
            try {
                // aircraft.csv: Registration,Aircraft Type,Aircraft Owner,Max Capacity,Usage,MTOW,Winglets,Aircraft Groups
                const resA = await fetch('data/master/aircraft.csv', { cache:'no-store' });
                const textA = await resA.text();
                const linesA = textA.split(/\r?\n/).filter(l=>l.trim());
                const regOptions = [];
                for (let i=1;i<linesA.length;i++){
                    const row = linesA[i];
                    const parts = row.split(',');
                    if (parts.length < 3) continue;
                    const reg = (parts[0]||'').trim().toUpperCase();
                    const type = (parts[1]||'').trim().toUpperCase(); // IATA code (e.g., 32N, E90, 77F)
                    const ownerIATA = (parts[2]||'').trim().toUpperCase();
                    if (reg) { aircraftByReg.set(reg, { type, ownerIATA }); regOptions.push(`<option value="${reg}"></option>`); }
                }
                const dlReg = document.getElementById('aircraft-reg-list');
                if (dlReg) dlReg.innerHTML = regOptions.join('');
            } catch(e){ console.warn('No se pudo cargar aircraft.csv', e); }
            try {
                // aircraft type.csv: IATA code, ICAO Code, Name, ...
                const resT = await fetch('data/master/aircraft type.csv', { cache:'no-store' });
                const textT = await resT.text();
                const linesT = textT.split(/\r?\n/).filter(l=>l.trim());
                const typeOptions = [];
                for (let i=1;i<linesT.length;i++){
                    const row = linesT[i];
                    // split conservando posibles comas en Name entre comillas simples: el dataset parece simple; usamos split directo
                    const parts = row.split(',');
                    if (parts.length < 2) continue;
                    const codeIATA = (parts[0]||'').trim().toUpperCase();
                    const icao = (parts[1]||'').trim().toUpperCase();
                    const name = (parts[2]||'').trim();
                    if (codeIATA) { typeByCode.set(codeIATA, { ICAO: icao, Name: name }); }
                    if (icao) typeOptions.push(`<option value="${icao}">${name?name:''}</option>`);
                }
                const dlType = document.getElementById('aircraft-type-icao-list');
                if (dlType) dlType.innerHTML = typeOptions.join('');
            } catch(e){ console.warn('No se pudo cargar aircraft type.csv', e); }
        }
        async function loadAirportsCatalog(){
            try {
                const res = await fetch('data/master/airports.csv', { cache:'no-store' });
                const text = await res.text();
                const lines = text.split(/\r?\n/).filter(l=>l.trim());
                // Pequeño parser CSV que respeta comillas para obtener columnas exactas
                function parseCSVLine(line){
                    const cols = [];
                    let cur = '';
                    let inQuotes = false;
                    for (let idx = 0; idx < line.length; idx++){
                        const ch = line[idx];
                        if (ch === '"'){
                            if (inQuotes && line[idx+1] === '"') { cur += '"'; idx++; }
                            else { inQuotes = !inQuotes; }
                        } else if (ch === ',' && !inQuotes) {
                            cols.push(cur); cur = '';
                        } else {
                            cur += ch;
                        }
                    }
                    cols.push(cur);
                    return cols;
                }
                const optsIATA = [];
                const optsName = [];
                for (let i=1; i<lines.length; i++){
                    const row = lines[i];
                    const parts = parseCSVLine(row);
                    // Esperado: IATA, ICAO, Name, Country, City, Security level
                    if (parts.length < 3) continue;
                    const IATA = (parts[0]||'').trim().toUpperCase();
                    // const ICAO = (parts[1]||'').trim().toUpperCase(); // no usado aquí
                    const Name = (parts[2]||'').trim().replace(/^"|"$/g,''); // SOLO Name
                    if (!IATA || !Name) continue;
                    airportByIATA.set(IATA, Name);
                    airportByName.set(Name.toLowerCase(), IATA);
                    iataSet.add(IATA);
                    optsIATA.push(`<option value="${IATA}">${Name}</option>`);
                    optsName.push(`<option value="${Name}">${IATA}</option>`);
                }
                const dlIATA = document.getElementById('airports-iata-list');
                const dlName = document.getElementById('airports-name-list');
                if (dlIATA) dlIATA.innerHTML = optsIATA.join('');
                if (dlName) dlName.innerHTML = optsName.join('');
            } catch(e){ console.warn('No se pudo cargar airports.csv', e); }
        }

        // Toggle de campos según tipo (Llegada/Salida)
        function applyManifestDirection() {
            const isArrival = dirArr && dirArr.checked;
            // Mostrar/ocultar contenedores marcados
            document.querySelectorAll('[data-dir="arrival-only"]').forEach(el => { el.style.display = isArrival ? '' : 'none'; });
            document.querySelectorAll('[data-dir="departure-only"]').forEach(el => { el.style.display = isArrival ? 'none' : ''; });
            // required dinámicos
            const eta = document.getElementById('mf-time-arr');
            const etd = document.getElementById('mf-time-dep');
            const dest = document.getElementById('mf-final-dest');
            const destCode = document.getElementById('mf-final-dest-code');
            const originName = document.getElementById('mf-origin-name');
            const originCode = document.getElementById('mf-origin-code');
            const nextStopCode = document.getElementById('mf-next-stop-code');
            // Llegada movement fields
            const arrOriginName = document.getElementById('mf-arr-origin-name');
            const arrOriginCode = document.getElementById('mf-arr-origin-code');
            const arrSlotAssigned = document.getElementById('mf-arr-slot-assigned');
            const arrSlotCoordinated = document.getElementById('mf-arr-slot-coordinated');
            const arrLastStop = document.getElementById('mf-arr-last-stop');
            const arrLastStopCode = document.getElementById('mf-arr-last-stop-code');
            const arrArriboPos = document.getElementById('mf-arr-arribo-posicion');
            const arrInicioDes = document.getElementById('mf-arr-inicio-desembarque');
            if (eta) eta.required = !!isArrival;
            if (originName) originName.required = !isArrival; // solo en salida según ejemplo
            if (originCode) originCode.required = !isArrival;
            if (nextStopCode) nextStopCode.required = false; // opcional
            if (etd) etd.required = !isArrival;
            if (dest) dest.required = !isArrival;
            if (destCode) destCode.required = !isArrival;
            // Llegada: por ahora, campos informativos (no obligatorios)
            [arrOriginName, arrOriginCode, arrSlotAssigned, arrSlotCoordinated, arrLastStop, arrLastStopCode, arrArriboPos, arrInicioDes]
                .forEach(el => { if (el) el.required = false; });
            // Título
            const title = document.getElementById('mf-title');
            if (title) title.value = isArrival ? 'MANIFIESTO DE LLEGADA' : 'MANIFIESTO DE SALIDA';
        }
        // Inicial y wiring
        if (dirArr && !dirArr._wired) { dirArr._wired = 1; dirArr.addEventListener('change', applyManifestDirection); }
        if (dirDep && !dirDep._wired) { dirDep._wired = 1; dirDep.addEventListener('change', applyManifestDirection); }
        // Ejecutar una vez al cargar
        applyManifestDirection();

    // Cargar catálogo al entrar a la sección
    loadAirlinesCatalog();
    loadAircraftCatalog();
    loadAirportsCatalog();

    function setPreview(src){ if (prevImg){ prevImg.src = src; prevImg.style.display = 'block'; } if (placeholder) placeholder.style.display = 'none'; if (runBtn) runBtn.disabled = false; currentImageURL = src; }
        if (up && !up._wired) { up._wired = 1; up.addEventListener('change', async (e)=>{
            const f = e.target.files && e.target.files[0]; if (!f) return;
            const url = URL.createObjectURL(f);
            setPreview(url);
        }); }
        if (loadEx && !loadEx._wired) { loadEx._wired = 1; loadEx.addEventListener('click', (e)=>{ e.preventDefault(); setPreview('examples/manifiesto1.jpg'); }); }
        if (runBtn && !runBtn._wired) {
            runBtn._wired = 1;
            runBtn.addEventListener('click', async ()=>{
                const s = document.getElementById('manifest-ocr-status');
                try {
                    if (!prevImg || !prevImg.src) { if (s) s.textContent = 'Cargue una imagen primero.'; return; }
                    if (s) s.textContent = 'Preprocesando imagen para OCR...';
                    const processed = preprocessImage(prevImg);
                    if (!window.Tesseract) { if (s) s.textContent = 'OCR no disponible (Tesseract.js no cargado).'; return; }
                    if (s) s.textContent = 'Reconociendo texto (OCR spa+eng)...';
                    const { data } = await Tesseract.recognize(processed, 'spa+eng', { logger: m => {}, tessedit_pageseg_mode: 6, user_defined_dpi: 300 });
                    const text = (data && data.text) ? data.text.trim() : '';
                    if (s) s.textContent = text ? ('Texto detectado (resumen):\n' + (text.slice(0,600)) + (text.length>600?'...':'')) : 'No se detectó texto.';
                    const hasWord = hasWordFactory(text);
                    const upperTokens = tokenizeUpper(text);

                    // 1) Inferir dirección (Llegada/Salida)
                    const isArrivalDoc = hasWord('LLEGADA') || hasWord('ARRIVAL');
                    const isDepartureDoc = hasWord('SALIDA') || hasWord('DEPARTURE');
                    if (isArrivalDoc && dirArr) { dirArr.checked = true; dirArr.dispatchEvent(new Event('change', { bubbles: true })); }
                    else if (isDepartureDoc && dirDep) { dirDep.checked = true; dirDep.dispatchEvent(new Event('change', { bubbles: true })); }

                    const currentIsArrival = dirArr && dirArr.checked;

                    // 2) Transportista OACI (3 letras) si aparece un código reconocido o desde prefijo de vuelo
                    try {
                        let carrierICAO = '';
                        const foundICAO = upperTokens.find(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && icaoSet.has(t));
                        if (foundICAO) carrierICAO = foundICAO;
                        let flightStr = findNearLabelValue(['vuelo','n° vuelo','no. vuelo','flight','flt'], /[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?/i, text);
                        if (!flightStr){
                            const m = text.match(/\b[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?\b/);
                            if (m) flightStr = m[0];
                        }
                        if (flightStr){
                            const cleaned = flightStr.replace(/\s|-/g,'');
                            const pref3 = cleaned.slice(0,3).toUpperCase();
                            const pref2 = cleaned.slice(0,2).toUpperCase();
                            if (!carrierICAO && icaoSet.has(pref3)) carrierICAO = pref3;
                            if (!carrierICAO && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2) || '';
                            setVal('mf-flight', flightStr.trim());
                        }
                        if (carrierICAO) setVal('mf-carrier-3l', carrierICAO);
                    } catch(_){ }

                    // 3) Matrícula (varios formatos comunes)
                    try {
                        // Algunos patrones típicos: XA-ABC, XB-ABC, XC-ABC (MX), N123AB (US), HP-1234, HK-1234, LV-ABC, CC-ABC, PR-ABC, CP-XXXX, YV-XXXX, OB-XXXX, TG-XXXX, etc.
                        const tailPatterns = [
                            /\bX[A-C]-?[A-Z0-9]{3,5}\b/gi,   // México XA/XB/XC
                            /\bN\d{1,5}[A-Z]{0,2}\b/gi,      // USA
                            /\bH[KP]-?\d{3,5}\b/gi,          // Panamá/Colombia
                            /\bLV-?[A-Z0-9]{3,4}\b/gi,        // Argentina
                            /\bCC-?[A-Z0-9]{3,4}\b/gi,        // Chile
                            /\bPR-?[A-Z0-9]{3,4}\b/gi,        // Brasil
                            /\bCP-?\d{3,5}\b/gi,             // Bolivia
                            /\bYV-?\d{3,5}\b/gi,             // Venezuela
                            /\bOB-?\d{3,5}\b/gi,             // Perú
                            /\bTG-?\d{3,5}\b/gi,             // Guatemala
                            /\bXA[A-Z0-9]{0,}\b/gi            // fallback México
                        ];
                        let foundTail = '';
                        for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ foundTail = m[0].toUpperCase().replace(/\s+/g,''); break; } }
                        if (foundTail) setVal('mf-tail', foundTail);
                    } catch(_){}

                    // 4) Aeropuertos (por código IATA reconocido y/o por nombre) y horarios
                    try {
                        // Proximidad a etiquetas
                        const originCandLbl = findNearLabelIATACode(['origen','procedencia','from','procedencia del vuelo'], text);
                        const lastStopCandLbl = findNearLabelIATACode(['ultima escala','escala anterior','last stop','escala'], text);
                        const finalDestCandLbl = findNearLabelIATACode(['destino','to','destino del vuelo'], text);
                        // Buscar candidatos por tokens de 3 letras que existan en catálogo
                        const airportCodes = upperTokens.filter(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && iataSet.has(t));
                        // Heurística por palabras clave en líneas
                        const rawLines = text.split(/\r?\n/);
                        let originCand = '';
                        let lastStopCand = '';
                        let finalDestCand = '';
                        for (const line of rawLines){
                            const u = line.toUpperCase();
                            // Origen/Procedencia
                            if (/ORIGEN|PROCEDENCIA|FROM\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) originCand = code;
                            }
                            // Última escala
                            if (/ULTIMA\s+ESCALA|LAST\s+STOP|ESCALA\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) lastStopCand = code;
                            }
                            // Destino
                            if (/DESTINO|TO\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) finalDestCand = code;
                            }
                        }
                        // Preferir lo encontrado por etiqueta
                        originCand = originCandLbl || originCand;
                        lastStopCand = lastStopCandLbl || lastStopCand;
                        finalDestCand = finalDestCandLbl || finalDestCand;
                        // Si aún no tenemos candidatos, usar los primeros tokens
                        if (!originCand && airportCodes[0]) originCand = airportCodes[0];
                        if (!lastStopCand && airportCodes[1]) lastStopCand = airportCodes[1];
                        if (!finalDestCand && airportCodes[2]) finalDestCand = airportCodes[2];

                        if (currentIsArrival){
                            if (originCand) setVal('mf-arr-origin-code', originCand);
                            if (lastStopCand) setVal('mf-arr-last-stop-code', lastStopCand);
                        } else {
                            if (originCand) setVal('mf-origin-code', originCand);
                            if (lastStopCand) setVal('mf-next-stop-code', lastStopCand);
                            if (finalDestCand){
                                setVal('mf-final-dest-code', finalDestCand);
                                const name = airportByIATA.get(finalDestCand) || '';
                                if (name) setVal('mf-final-dest', name);
                            }
                        }
                        // Horarios cercanos a etiquetas
                        const setTimeIf = (id, labels) => { const v = findNearLabelValue(labels, timeRx, text); if (v) setVal(id, v); };
                        if (currentIsArrival){
                            setTimeIf('mf-arr-slot-assigned', ['slot asignado']);
                            setTimeIf('mf-arr-slot-coordinated', ['slot coordinado']);
                            setTimeIf('mf-arr-arribo-posicion', ['entrada a la posicion','arribo a la posicion','arribo posicion']);
                            setTimeIf('mf-arr-inicio-desembarque', ['termino maniobras de desembarque','inicio de desembarque','inicio desembarque']);
                            setTimeIf('mf-arr-inicio-pernocta', ['inicio de pernocta','inicio pernocta']);
                        } else {
                            setTimeIf('mf-slot-assigned', ['slot asignado']);
                            setTimeIf('mf-slot-coordinated', ['slot coordinado']);
                            setTimeIf('mf-inicio-embarque', ['inicio de maniobras de embarque','inicio de embarque']);
                            setTimeIf('mf-salida-posicion', ['salida de la posicion','salida posicion']);
                            setTimeIf('mf-termino-pernocta', ['termino de pernocta','término de pernocta','fin pernocta']);
                        }
                    } catch(_){}

                    if (s) s.textContent += '\n\nAutorrelleno aplicado (si hubo coincidencias).';
                } catch(err){ if (s) s.textContent = 'Error en OCR: ' + (err?.message || err); }
            });
        }

        // Validación y autofill del transportista por OACI (3 letras)
        (function wireCarrierAutofill(){
            const carrier = document.getElementById('mf-carrier-3l');
            if (!carrier || carrier._wired) return; carrier._wired = 1;
            const opName = document.getElementById('mf-operator-name');
            const airlineName = document.getElementById('mf-airline');
            const setFromICAO = (val) => {
                const code = (val||'').toString().trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
                if (carrier.value !== code) carrier.value = code;
                if (code.length !== 3) return;
                const rec = airlinesCatalog.find(a=> a.ICAO === code);
                if (rec){
                    if (opName && !opName.value) opName.value = rec.Name;
                    if (airlineName && !airlineName.value) airlineName.value = rec.Name;
                }
            };
            carrier.addEventListener('input', ()=> setFromICAO(carrier.value));
            carrier.addEventListener('change', ()=> setFromICAO(carrier.value));
            // Si el usuario selecciona desde datalist
            carrier.addEventListener('blur', ()=> setFromICAO(carrier.value));
        })();

        // Autofill por Matrícula -> Equipo (y posible transportista via owner IATA)
        (function wireTailAutofill(){
            const tail = document.getElementById('mf-tail');
            if (!tail || tail._wired) return; tail._wired = 1;
            const equipo = document.getElementById('mf-aircraft'); // Equipo (texto)
            const carrier = document.getElementById('mf-carrier-3l');
            const setFromTail = (val)=>{
                const reg = (val||'').toString().trim().toUpperCase();
                if (!reg) return;
                const rec = aircraftByReg.get(reg);
                if (!rec) return;
                // Tenemos IATA code del tipo => buscar ICAO y/o nombre
                const t = typeByCode.get(rec.type);
                if (t){
                    // Colocar Equipo como ICAO Code si existe; si no, como nombre
                    const preferred = t.ICAO || t.Name || rec.type;
                    if (equipo && (!equipo.value || equipo.value === rec.type)) {
                        equipo.value = preferred;
                    }
                } else {
                    if (equipo && !equipo.value) equipo.value = rec.type; // fallback
                }
                // Si el carrier (OACI 3 letras) está vacío, podemos intentar inferir vía airlines.csv por owner IATA -> ICAO
                if (carrier && !carrier.value && rec.ownerIATA){
                    // Buscar primer airline cuyo IATA coincida para inferir su ICAO (no siempre exacto, pero ayuda)
                    const cand = airlinesCatalog.find(a => (a.IATA||'').toUpperCase() === rec.ownerIATA);
                    if (cand && cand.ICAO && /^[A-Z]{3}$/.test(cand.ICAO)) carrier.value = cand.ICAO;
                }
            };
            tail.addEventListener('input', ()=> setFromTail(tail.value));
            tail.addEventListener('change', ()=> setFromTail(tail.value));
            tail.addEventListener('blur', ()=> setFromTail(tail.value));
            // Permitir que el usuario elija manualmente el Equipo (ICAO) desde datalist sin bloquear su decisión
            if (equipo && !equipo._wired){ equipo._wired = 1; equipo.addEventListener('input', ()=> { equipo.value = (equipo.value||'').toUpperCase(); }); }
        })();

        // Auto-vincular campos de aeropuertos (código y nombre, ida y vuelta)
        (function wireAirportFields(){
            function link(nameId, codeId){
                const nameEl = document.getElementById(nameId);
                const codeEl = document.getElementById(codeId);
                if (!nameEl || !codeEl) return;
                if (!nameEl._wired){
                    nameEl._wired = 1;
                    nameEl.addEventListener('input', ()=>{
                        const s = (nameEl.value||'').trim().toLowerCase();
                        const iata = airportByName.get(s);
                        if (iata && !codeEl.value) codeEl.value = iata;
                    });
                }
                if (!codeEl._wired){
                    codeEl._wired = 1;
                    codeEl.addEventListener('input', ()=>{
                        const c = (codeEl.value||'').trim().toUpperCase();
                        codeEl.value = c.replace(/[^A-Z]/g,'').slice(0,3);
                        const name = airportByIATA.get(codeEl.value);
                        if (name && !nameEl.value) nameEl.value = name;
                    });
                }
            }
            // Salida
            link('mf-origin-name','mf-origin-code');
            link('mf-next-stop','mf-next-stop-code');
            // Destino final: vincular nombre <-> código (nuevo campo)
            link('mf-final-dest','mf-final-dest-code');
            // Llegada
            link('mf-arr-origin-name','mf-arr-origin-code');
            link('mf-arr-last-stop','mf-arr-last-stop-code');
        })();

        function readForm(){
            const g = id => document.getElementById(id)?.value || '';
            const direction = (dirArr && dirArr.checked) ? 'Llegada' : 'Salida';
            return {
                direction,
                // Encabezado extra
                title: g('mf-title'),
                docDate: g('mf-doc-date'),
                folio: g('mf-folio'),
                // Transportista / operador
                carrier3L: g('mf-carrier-3l'),
                operatorName: g('mf-operator-name'),
                airline: g('mf-airline'),
                flight: g('mf-flight'),
                tail: g('mf-tail'),
                aircraft: g('mf-aircraft'),
                originName: g('mf-origin-name'),
                originCode: g('mf-origin-code'),
                crewCockpit: g('mf-crew-cockpit'),
                crewCabin: g('mf-crew-cabin'),
                crewTotal: g('mf-crew-total'),
                baggageKg: g('mf-baggage-kg'),
                baggagePieces: g('mf-baggage-pcs'),
                cargoKg: g('mf-cargo'),
                cargoPieces: g('mf-cargo-pieces'),
                cargoVol: g('mf-cargo-volume'),
                mailKg: g('mf-mail'),
                mailPieces: g('mf-mail-pieces'),
                dangerousGoods: !!document.getElementById('mf-dangerous-goods')?.checked,
                liveAnimals: !!document.getElementById('mf-live-animals')?.checked,
                humanRemains: !!document.getElementById('mf-human-remains')?.checked,
                pilot: g('mf-pilot'),
                pilotLicense: g('mf-pilot-license'),
                agent: g('mf-agent'),
                signature: g('mf-signature'),
                notes: g('mf-notes'),
                // Movimiento (Salida)
                nextStop: g('mf-next-stop'),
                nextStopCode: g('mf-next-stop-code'),
                finalDest: g('mf-final-dest'),
                finalDestCode: g('mf-final-dest-code'),
                slotAssigned: g('mf-slot-assigned'),
                slotCoordinated: g('mf-slot-coordinated'),
                terminoPernocta: g('mf-termino-pernocta'),
                inicioEmbarque: g('mf-inicio-embarque'),
                salidaPosicion: g('mf-salida-posicion'),
                // Movimiento (Llegada)
                arrOriginName: g('mf-arr-origin-name'),
                arrOriginCode: g('mf-arr-origin-code'),
                arrSlotAssigned: g('mf-arr-slot-assigned'),
                arrSlotCoordinated: g('mf-arr-slot-coordinated'),
                arrLastStop: g('mf-arr-last-stop'),
                arrLastStopCode: g('mf-arr-last-stop-code'),
                arrArriboPosicion: g('mf-arr-arribo-posicion'),
                arrInicioDesembarque: g('mf-arr-inicio-desembarque'),
                arrInicioPernocta: g('mf-arr-inicio-pernocta'),
                // Pasajeros por categoría
                paxTUA: g('pax-tua'),
                paxDiplomaticos: g('pax-diplomaticos'),
                paxComision: g('pax-comision'),
                paxInfantes: g('pax-infantes'),
                paxTransitos: g('pax-transitos'),
                paxConexiones: g('pax-conexiones'),
                paxExentos: g('pax-exentos'),
                paxTotal: g('pax-total'),
                // Observaciones extra
                obsTransito: g('mf-obs-transito'),
                paxDNI: g('mf-pax-dni'),
                // Firmas
                signOperator: g('mf-sign-operator'),
                signCoordinator: g('mf-sign-coordinator'),
                signAdmin: g('mf-sign-admin'),
                signAdminDate: g('mf-sign-admin-date'),
                image: (prevImg && prevImg.src) || ''
            };
        }
    function loadRecords(){ try { return JSON.parse(localStorage.getItem('aifa.manifests')||'[]'); } catch(_) { return []; } }
        function saveRecords(arr){ try { localStorage.setItem('aifa.manifests', JSON.stringify(arr)); } catch(_) {} }
        function renderTable(){
            if (!tableBody) return;
            const rows = loadRecords();
            tableBody.innerHTML = rows.map(r => `
                <tr>
                    <td>${r.direction||''}</td>
                    <td>${(r.carrier3L? (r.carrier3L.toUpperCase()+ ' - ') : '') + (r.airline||r.operatorName||'')}</td>
                    <td>${r.flight||''}</td>
                    <td>${r.tail||''}</td>
                    <td></td>
                    <td></td>
                    <td>${(r.originCode||'')}/${r.finalDest||''}</td>
                    <td>${r.pax||''}</td>
                    <td>${r.cargoKg||''}/${r.mailKg||''}</td>
                    <td>${r.image?'<img src="'+r.image+'" style="height:30px">':''}</td>
                </tr>`).join('');
        }
        // Auto-cálculo de Total de pasajeros por categoría
        function recalcPaxTotal(){
            const ids = ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'];
            const sum = ids.reduce((a,id)=> a + (parseInt(document.getElementById(id)?.value||'0',10)||0), 0);
            const out = document.getElementById('pax-total');
            if (out) out.value = String(sum);
        }
        ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'].forEach(id=>{
            const el = document.getElementById(id);
            if (el && !el._wired){ el._wired = 1; el.addEventListener('input', recalcPaxTotal); }
        });
        recalcPaxTotal();

        if (saveBtn && !saveBtn._wired) { saveBtn._wired = 1; saveBtn.addEventListener('click', ()=>{ recalcPaxTotal(); const recs = loadRecords(); recs.unshift(readForm()); saveRecords(recs.slice(0,200)); renderTable(); }); }
        if (clearBtn && !clearBtn._wired) { clearBtn._wired = 1; clearBtn.addEventListener('click', ()=>{ document.getElementById('manifest-form')?.reset(); applyManifestDirection(); clearDynamicTables(); calculateTotals(); updateDemorasTotal(); }); }
        if (exportBtn && !exportBtn._wired) { exportBtn._wired = 1; exportBtn.addEventListener('click', ()=>{ const data = JSON.stringify(loadRecords(), null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.json'; a.click(); }); }
        renderTable();

        // Tabla de demoras
        const demoraTbody = document.querySelector('#tabla-demoras tbody');
        const addDemoraBtn = document.getElementById('add-demora-row');
        const clearDemorasBtn = document.getElementById('clear-demoras');
        function addDemoraRow(data={}){
            if (!demoraTbody) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form-control form-control-sm demora-codigo" value="${data.codigo||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm demora-minutos" value="${data.minutos||''}"></td>
                <td><input type="text" class="form-control form-control-sm demora-descripcion" value="${data.descripcion||''}"></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-demora-row"><i class="fas fa-times"></i></button></td>`;
            demoraTbody.appendChild(tr);
        }
        function updateDemorasTotal(){
            const total = Array.from(document.querySelectorAll('.demora-minutos')).reduce((acc, inp)=> acc + (parseFloat(inp.value)||0), 0);
            const out = document.getElementById('total-demora-minutos');
            if (out) out.value = String(total);
        }
        function clearDemoras(){ if (demoraTbody) demoraTbody.innerHTML = ''; updateDemorasTotal(); }
        if (addDemoraBtn && !addDemoraBtn._wired){ addDemoraBtn._wired = 1; addDemoraBtn.addEventListener('click', ()=> addDemoraRow()); }
        if (clearDemorasBtn && !clearDemorasBtn._wired){ clearDemorasBtn._wired = 1; clearDemorasBtn.addEventListener('click', clearDemoras); }
        // Evitar listeners globales duplicados si la UI se inicializa más de una vez
        window._manifListeners = window._manifListeners || { clicks: false, inputs: false };
        if (!window._manifListeners.clicks){
            window._manifListeners.clicks = true;
            document.addEventListener('click', (e)=>{
                const btn = e.target.closest('.remove-demora-row');
                if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); updateDemorasTotal(); }
                const btn2 = e.target.closest('.remove-embarque-row');
                if (btn2) { const tr2 = btn2.closest('tr'); if (tr2) tr2.remove(); calculateTotals(); }
            });
        }
        if (!window._manifListeners.inputs){
            window._manifListeners.inputs = true;
            document.addEventListener('input', (e)=>{
                if (e.target && e.target.classList && e.target.classList.contains('demora-minutos')) { updateDemorasTotal(); }
                if (e.target && e.target.closest && e.target.closest('#tabla-embarque')) { calculateTotals(); }
            });
        }

        function readDemorasFromTable(){
            const rows = Array.from(document.querySelectorAll('#tabla-demoras tbody tr'));
            return rows.map(tr => ({
                causa: tr.querySelector('.demora-descripcion')?.value || tr.children[2]?.textContent || '',
                demoras: parseFloat(tr.querySelector('.demora-minutos')?.value || tr.children[1]?.textContent || '0') || 0
            }));
        }

        // Tabla de embarque por estación
        const embarqueTbody = document.querySelector('#tabla-embarque tbody');
        const addEmbarqueBtn = document.getElementById('add-embarque-row');
        const clearEmbarqueBtn = document.getElementById('clear-embarque');
        function addEmbarqueRow(data={}){
            if (!embarqueTbody) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form-control form-control-sm embarque-estacion" value="${data.estacion||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-nacional" value="${data.paxNacional||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-internacional" value="${data.paxInternacional||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-equipaje" value="${data.equipaje||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-carga" value="${data.carga||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-correo" value="${data.correo||''}"></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-embarque-row"><i class="fas fa-times"></i></button></td>`;
            embarqueTbody.appendChild(tr);
            calculateTotals();
        }
        function clearEmbarque(){ if (embarqueTbody) embarqueTbody.innerHTML = ''; calculateTotals(); }
        if (addEmbarqueBtn && !addEmbarqueBtn._wired){ addEmbarqueBtn._wired = 1; addEmbarqueBtn.addEventListener('click', ()=> addEmbarqueRow()); }
        if (clearEmbarqueBtn && !clearEmbarqueBtn._wired){ clearEmbarqueBtn._wired = 1; clearEmbarqueBtn.addEventListener('click', clearEmbarque); }
        document.addEventListener('click', (e)=>{
            const btn = e.target.closest('.remove-embarque-row');
            if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); calculateTotals(); }
        });

        function clearDynamicTables(){
            clearDemoras();
            clearEmbarque();
        }
    } catch (e) { /* ignore */ }
}

