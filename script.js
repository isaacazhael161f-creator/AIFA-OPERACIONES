/**
 * =================================================================================
 * CONFIGURACIÓN DE DATOS ESTÁTICOS
 * =================================================================================
 */
const staticData = {
    operacionesTotales: {
        comercial: [ { periodo: '2022', operaciones: 8996, pasajeros: 912415 }, { periodo: '2023', operaciones: 23211, pasajeros: 2631261 }, { periodo: '2024', operaciones: 51734, pasajeros: 6318454 }, { periodo: '2025', operaciones: 39142, pasajeros: 5155316 } ],
        carga: [ { periodo: '2022', operaciones: 8, toneladas: 5.19 }, { periodo: '2023', operaciones: 5578, toneladas: 186.31 }, { periodo: '2024', operaciones: 13219, toneladas: 447.34 }, { periodo: '2025', operaciones: 8616, toneladas: 292.696 } ],
        general: [ { periodo: '2022', operaciones: 458, pasajeros: 1385 }, { periodo: '2023', operaciones: 2212, pasajeros: 8160 }, { periodo: '2024', operaciones: 2777, pasajeros: 29637 }, { periodo: '2025', operaciones: 2214, pasajeros: 17391 } ]
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
            { mes: '09', label: 'Septiembre', toneladas: 31.076 },
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
                { mes: '09', label: 'Septiembre', operaciones: 249 },
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
                { mes: '09', label: 'Septiembre', pasajeros: 948 },
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
        // NOTA: las contraseñas en texto plano no se usan para validar; se migran a hash en tiempo de ejecución y se descartan
        "David Pacheco": { password: "2468", canViewItinerarioMensual: true },
        "Isaac López": { password: "18052003", canViewItinerarioMensual: false },
        "Mauro Hernández": { password: "Mauro123", canViewItinerarioMensual: true },
        "Emily Beltrán": { password: "Emily67", canViewItinerarioMensual: true },
        "Director General": { password: "Dirección71", canViewItinerarioMensual: true },
        "Director de Operación": { password: "OperacionesNLU", canViewItinerarioMensual: true },
        "Jefe Mateos": { password: "2025M", canViewItinerarioMensual: true },
        "Usuario1": { password: "AIFAOps", canViewItinerarioMensual: true }
    },
    pdfSections: { "itinerario-mensual": { title: "Itinerario Mensual (Octubre)", url: "pdfs/itinerario_mensual.pdf" } }
};
let allFlightsData = [];
let summaryDetailMode = 'airline';
let summarySelectedAirline = null;
let summarySelectedPosition = null;
let summarySelectionLocked = false;
// Hashes de contraseñas (generados en cliente al inicio y luego se descartan passwords en claro)
const AUTH_HASHES = Object.create(null);
const SECRET_PW_SALT = 'aifa.ops.local.pw.v1';

async function initAuthHashes(){
    try {
        const entries = Object.entries(dashboardData.users || {});
        for (const [name, info] of entries){
            if (!info) continue;
            const pw = typeof info.password === 'string' ? info.password : '';
            const norm = (name||'').toString().trim().toLowerCase();
            if (pw) {
                const h = await sha256(pw + '|' + norm + '|' + SECRET_PW_SALT);
                AUTH_HASHES[name] = h;
            }
            // eliminar password en claro para evitar abusos posteriores
            try { delete info.password; } catch(_) { info.password = undefined; }
        }
    } catch(_){ /* noop */ }
}
let authHashesInitPromise = null;
function ensureAuthHashes(){
    if (!authHashesInitPromise){
        authHashesInitPromise = initAuthHashes().catch(err => {
            authHashesInitPromise = null;
            throw err;
        });
    }
    return authHashesInitPromise;
}
let passengerAirlines = ["Viva", "Volaris", "Aeromexico", "Mexicana de Aviación", "Aeurus", "Arajet"];
let cargoAirlines = ["MasAir", "China Southerrn", "Lufthansa", "Kalitta Air", "Aerounión", "Emirates Airlines", "Atlas Air", "Silk Way West Airlines", "Cathay Pacific", "United Parcel Service", "Turkish Airlines", "Cargojet Airways", "Air Canada", "Cargolux"];
const airlineColors = { "Viva": "#00b200", "Volaris": "#6f2da8", "Aeromexico": "#00008b", "Mexicana de Aviación": "#a52a2a", "Aerus": "#ff4500", "Arajet": "#00ced1", "MasAir": "#4682b4", "China Southerrn": "#c71585", "Lufthansa": "#ffcc00", "Kalitta Air": "#dc143c", "Aerounión": "#2e8b57", "Emirates Airlines": "#d4af37", "Atlas Air": "#808080", "Silk Way West Airlines": "#f4a460", "Cathay Pacific": "#006400", "United Parcel Service": "#5f4b32", "Turkish Airlines": "#e81123", "Cargojet Airways": "#f0e68c", "Air Canada": "#f00", "Cargolux": "#00a0e2" };

const passengerAirlinesNormalized = new Set(passengerAirlines.map(normalizeAirlineName));
const cargoAirlinesNormalized = new Set(cargoAirlines.map(normalizeAirlineName));

const cargoPositionCodes = new Set([
    '601','602','603','604','605','606',
    '601A','602A','603A','604A','605A',
    '601B','602B','603B','604B'
]);

const semicontactoPositionCodes = new Set([
    '501','502','503','504','505'
]);

const remotePositionCodes = new Set([
    '506','507','508','509','510','511','512','513','514',
    '506A','507A','508A','506B','507B'
]);

const cobusAttentionPositions = new Set([
    '115','115A','115B','116','116A','116B',
    '509','510','511','512','513','514'
]);

const positionCategoryLabels = {
    cargo: 'Carga',
    semicontacto: 'Semicontacto',
    remote: 'Remota',
    terminal: 'Edificio terminal'
};

function normalizePositionValue(value) {
    return (value || '').toString().trim().toUpperCase();
}

function classifyPositionStand(value) {
    const normalized = normalizePositionValue(value);
    if (!normalized) return 'terminal';
    if (cargoPositionCodes.has(normalized)) return 'cargo';
    if (semicontactoPositionCodes.has(normalized)) return 'semicontacto';
    if (remotePositionCodes.has(normalized)) return 'remote';
    return 'terminal';
}

function getPositionCategoryLabel(category) {
    return positionCategoryLabels[category] || positionCategoryLabels.terminal;
}
// ===================== Logos de Aerolíneas =====================
// Mapa flexible: nombre normalizado (minúsculas, sin acentos) -> slug de archivo
// Nota: ahora usamos una lista de candidatos por aerolínea (archivos reales en images/airlines)
const airlineLogoFileMap = {
    // Pasajeros
    'viva aerobus': ['logo_viva.png'],
    'volaris': ['logo_volaris.png'],
    // usar primero archivos que EXISTEN en /images/airlines para evitar 404
    'aeromexico': ['logo_aeromexico.png','logo_aeromexico.jpg'],
    'aeroméxico': ['logo_aeromexico.png','logo_aeromexico.jpg'],
    'mexicana de aviacion': ['logo_mexicana.png','logo_mexicana_de_aviacion.png'],
    'mexicana de aviación': ['logo_mexicana.png','logo_mexicana_de_aviacion.png'],
    'aerus': ['logo_aerus.png'],
    'aeurus': ['logo_aerus.png'],
    'arajet': ['logo_arajet.png','logo_arajet.jpg'],
    // Air China (archivo no sigue prefijo logo_)
    'air china': ['logo_air_china.png'],
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
    'china southerrn': ['logo_china_southern.png'],
    // Ajustes específicos por archivos presentes
    'air canada': ['logo_air_canada_.png'],
    'air france': ['logo_air_france_.png'],
    'aerounion': ['loho_aero_union.png'],
    'aerounión': ['loho_aero_union.png'],
    'dhl guatemala': ['logo_dhl_guatemala_.png'],
    // TSM Airline (archivo real: logo_tsm_airlines.png)
    'tsm': ['logo_tsm_airlines.png'],
    'tsm airline': ['logo_tsm_airlines.png'],
    'tsm airlines': ['logo_tsm_airlines.png']
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
    'cargolux': 'logo_cargolux',
    // Compat adicionales
    'air china': 'air_china',
    'tsm': 'logo_tsm_airlines',
    'tsm airline': 'logo_tsm_airlines',
    'tsm airlines': 'logo_tsm_airlines'
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
        // Variaciones conocidas (solo archivos que existen en repo)
        if (base.includes('aerounion')) candidates.push('images/airlines/loho_aero_union.png');
        if (base.includes('masair')) candidates.push('images/airlines/logo_mas.png');
        if (base.includes('silk_way_west') && !base.includes('silkway')) candidates.push('images/airlines/logo_silk_way_west_airlines.png');
        if (base.includes('air_canada')) candidates.push('images/airlines/logo_air_canada_.png');
        if (base.includes('air_france')) candidates.push('images/airlines/logo_air_france_.png');
        if (base.includes('ifl_group')) candidates.push('images/airlines/lofo_ifl_group.png');
    }
    // Fallback local definitivo
    candidates.push('images/airlines/default-airline-logo.svg');
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
    }catch(_){ }
}
function flightsToCSV(rows, type){
    const headers = type === 'pax'
        ? ['Aerolínea','Aeronave','Vuelo Lleg.','Fecha Lleg.','Hora Lleg.','Origen','Banda','Posición','Vuelo Sal.','Fecha Sal.','Hora Sal.','Destino']
        : ['Aerolínea','Aeronave','Vuelo Lleg.','Fecha Lleg.','Hora Lleg.','Origen','Posición','Vuelo Sal.','Fecha Sal.','Hora Sal.','Destino'];
    const esc = (v) => {
        const s = (v==null?'':String(v));
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
    };
    const lines = [headers.join(',')];
    for (const f of rows){
        if (type === 'pax') {
            lines.push([
                f.aerolinea||'', f.aeronave||'', f.vuelo_llegada||'', f.fecha_llegada||'', f.hora_llegada||'', f.origen||'', f.banda_reclamo||'', f.posicion||'', f.vuelo_salida||'', f.fecha_salida||'', f.hora_salida||'', f.destino||''
            ].map(esc).join(','));
        } else {
            lines.push([
                f.aerolinea||'', f.aeronave||'', f.vuelo_llegada||'', f.fecha_llegada||'', f.hora_llegada||'', f.origen||'', f.posicion||'', f.vuelo_salida||'', f.fecha_salida||'', f.hora_salida||'', f.destino||''
            ].map(esc).join(','));
        }
    }
    return lines.join('\n');
}
function downloadCSV(name, content){
    try {
        // Prepend UTF-8 BOM for better compatibility with Excel on Windows
        const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click();
        setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    } catch(_) {}
}
function wireItineraryExports(){
    const btnP = document.getElementById('export-pax-full');
    const btnC = document.getElementById('export-cargo-full');
    const btnPdfP = document.getElementById('export-pax-pdf');
    const btnPdfC = document.getElementById('export-cargo-pdf');
    if (btnP && !btnP._wired){ btnP._wired = 1; btnP.addEventListener('click', ()=>{
        const rows = (allFlightsData||[]).filter(f=> (String(f.categoria||'').toLowerCase()==='pasajeros') || passengerAirlines.includes(f.aerolinea));
        const csv = flightsToCSV(rows, 'pax');
        downloadCSV('itinerario_pasajeros.csv', csv);
    }); }
    if (btnC && !btnC._wired){ btnC._wired = 1; btnC.addEventListener('click', ()=>{
        const rows = (allFlightsData||[]).filter(f=> (String(f.categoria||'').toLowerCase()==='carga') || cargoAirlines.includes(f.aerolinea));
        const csv = flightsToCSV(rows, 'cargo');
        downloadCSV('itinerario_carga.csv', csv);
    }); }
    // PDF (como se ve en pantalla)
    const captureToPDF = async (containerId, fileName) => {
        try {
            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) { console.warn('jsPDF/html2canvas no disponible'); return; }
            const { jsPDF } = window.jspdf;
            const root = document.getElementById(containerId);
            if (!root) return;
            // Esperar a que se hayan renderizado las tablas
            await new Promise(r => setTimeout(r, 60));
            // Clonar el bloque visible para evitar cortes por overflow y fijar ancho
            const clone = root.cloneNode(true);
            clone.style.maxHeight = 'unset';
            clone.style.overflow = 'visible';
            clone.style.boxShadow = 'none';
            clone.style.border = 'none';
            clone.style.background = getComputedStyle(document.body).backgroundColor || '#fff';
            // Asegurar que la tabla ocupe el ancho completo del clon
            const table = clone.querySelector('table');
            if (table) { table.style.width = '100%'; table.style.minWidth = 'auto'; }
            // Insertar fuera de pantalla para medir correctamente
            const holder = document.createElement('div');
            holder.style.position = 'fixed';
            holder.style.left = '-99999px';
            holder.style.top = '0';
            holder.style.zIndex = '-1';
            holder.appendChild(clone);
            document.body.appendChild(holder);
            const dpr = Math.min(2.5, window.devicePixelRatio || 1);
            const canvas = await html2canvas(clone, { scale: dpr, backgroundColor: clone.style.background || '#ffffff', useCORS: true, logging: false, windowWidth: Math.max(clone.scrollWidth, clone.clientWidth) });
            document.body.removeChild(holder);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            // Escalar imagen al ancho de página
            const imgW = pageW - margin*2;
            const imgH = canvas.height * (imgW / canvas.width);
            let y = margin;
            let x = margin;
            let remaining = imgH;
            let imgY = 0; // offset dentro de la imagen
            // Añadir título
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            const title = (fileName || '').replace(/\.pdf$/i,'');
            pdf.text(title, margin, y);
            y += 6;
            // Si la imagen es más alta que la página, partirla en slices verticales
            const sliceH = pageH - y - margin;
            const ratio = canvas.width / imgW; // pixeles por mm
            while (remaining > 0) {
                const hThis = Math.min(sliceH, remaining);
                // Extraer porción del canvas a un subcanvas para no dibujar fuera
                const sub = document.createElement('canvas');
                sub.width = canvas.width;
                sub.height = Math.round(hThis * ratio);
                const sctx = sub.getContext('2d');
                sctx.drawImage(canvas, 0, Math.round(imgY * ratio), canvas.width, sub.height, 0, 0, sub.width, sub.height);
                const subImg = sub.toDataURL('image/png');
                pdf.addImage(subImg, 'PNG', x, y, imgW, hThis);
                remaining -= hThis;
                imgY += hThis;
                if (remaining > 1) { pdf.addPage(); y = margin; x = margin; }
            }
            pdf.save(fileName || 'tabla.pdf');
        } catch (e) {
            console.warn('PDF export failed:', e);
            try {
                const toastEl = document.getElementById('action-toast');
                if (toastEl && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                    toastEl.querySelector('.toast-body').textContent = 'No se pudo generar el PDF. Intenta de nuevo.';
                    const t = new bootstrap.Toast(toastEl); t.show();
                }
            } catch(_){}
        }
    };
    if (btnPdfP && !btnPdfP._wired) { btnPdfP._wired = 1; btnPdfP.addEventListener('click', ()=> captureToPDF('passenger-itinerary-scroll', 'itinerario_pasajeros.pdf')); }
    if (btnPdfC && !btnPdfC._wired) { btnPdfC._wired = 1; btnPdfC.addEventListener('click', ()=> captureToPDF('cargo-itinerary-scroll', 'itinerario_carga.pdf')); }
}
document.addEventListener('DOMContentLoaded', wireItineraryExports);

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('sidebar-nav').addEventListener('click', handleNavigation);
    document.getElementById('airline-filter').addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // search input for banda de reclamo (specific) and a global search box
    const claimInput = document.getElementById('claim-filter'); if (claimInput) claimInput.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    const globalSearch = document.getElementById('global-search'); if (globalSearch) globalSearch.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    // position select (populated from JSON)
    const posSelect = document.getElementById('position-filter'); if (posSelect) posSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const originSelect = document.getElementById('origin-filter'); if (originSelect) originSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const destinationSelect = document.getElementById('destination-filter'); if (destinationSelect) destinationSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
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
    
    // Botón de reinicialización de gráficas global
    const chartsResetBtn = document.getElementById('charts-reset-btn');
    if (chartsResetBtn) {
        chartsResetBtn.addEventListener('click', resetAllCharts);
        
        // Hacer el botón siempre visible para pruebas (opcional)
        chartsResetBtn.style.display = 'inline-block';
    }
    
    // Botones específicos de reinicialización por sección
    const resetOperacionesBtn = document.getElementById('reset-operaciones-btn');
    if (resetOperacionesBtn) resetOperacionesBtn.addEventListener('click', resetOperacionesCharts);
    
    const resetItinerarioBtn = document.getElementById('reset-itinerario-btn');
    if (resetItinerarioBtn) resetItinerarioBtn.addEventListener('click', resetItinerarioCharts);
    
    const resetDemorasBtn = document.getElementById('reset-demoras-btn');
    if (resetDemorasBtn) resetDemorasBtn.addEventListener('click', resetDemorasCharts);
    
    // Atajos de teclado para reinicializar gráficas
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey) {
            const activeSection = document.querySelector('.content-section.active');
            const sectionId = activeSection ? activeSection.id.replace('-section', '') : '';
            
            if (e.key === 'R') {
                e.preventDefault();
                console.log('🔄 Reinicialización forzada por atajo de teclado');
                resetAllCharts();
            } else if (e.key === 'O' && sectionId === 'operaciones-totales') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Operaciones por atajo (Ctrl+Shift+O)');
                resetOperacionesCharts();
            } else if (e.key === 'I' && sectionId === 'itinerario') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Itinerario por atajo (Ctrl+Shift+I)');
                resetItinerarioCharts();
            } else if (e.key === 'D' && sectionId === 'demoras') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Demoras por atajo (Ctrl+Shift+D)');
                resetDemorasCharts();
            }
        }
    });

    // Logout en botón de encabezado (móvil) y delegación global por data-action="logout"
    const mobileLogoutBtn = document.querySelector('.logout-button-mobile');
    if (mobileLogoutBtn && !mobileLogoutBtn._wired) {
        mobileLogoutBtn._wired = 1;
        mobileLogoutBtn.addEventListener('click', function(e){ e.preventDefault(); performLogout(); });
    }
    document.addEventListener('click', function(e){
        const a = e.target && e.target.closest && e.target.closest('[data-action="logout"]');
        if (a) { e.preventDefault(); performLogout(); }
    });

// Función de diagnóstico global (para usar en consola)
window.diagnoseCharts = function() {
    console.log('🔍 === DIAGNÓSTICO DE GRÁFICAS ===');
    
    const activeSection = document.querySelector('.content-section.active');
    console.log('Sección activa:', activeSection?.id || 'ninguna');
    
    console.log('📊 Gráficas de Operaciones Totales:');
    console.log('opsCharts:', Object.keys(opsCharts));
    
    console.log('📈 Instancias de Chart.js:');
    if (window.Chart && window.Chart.instances) {
        console.log('Chart instances:', Object.keys(window.Chart.instances));
    }
    
    console.log('🎯 Canvas elements:');
    const canvases = ['commercial-ops-chart', 'commercial-pax-chart', 'cargo-ops-chart', 'cargo-tons-chart', 'general-ops-chart', 'general-pax-chart', 'paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart', 'delaysPieChart'];
    canvases.forEach(id => {
        const canvas = document.getElementById(id);
        const chart = canvas ? Chart.getChart(canvas) : null;
        console.log(`${id}: canvas=${!!canvas}, chart=${!!chart}`);
    });
    
    console.log('🔧 Funciones globales:');
    console.log('renderOperacionesTotales:', typeof window.renderOperacionesTotales);
    console.log('renderItineraryCharts:', typeof window.renderItineraryCharts);
    console.log('renderDemoras:', typeof window.renderDemoras);
    console.log('destroyItinerarioCharts:', typeof window.destroyItinerarioCharts);
    
    console.log('=== FIN DIAGNÓSTICO ===');
};
    
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

// Funciones específicas para reinicializar gráficas por sección
function resetOperacionesCharts() {
    console.log('🔄 Reinicializando gráficas de Operaciones Totales...');
    
    const btn = document.getElementById('reset-operaciones-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráficas existentes
        destroyOpsCharts();
        
        // Limpiar canvas específicos
        const canvasIds = [
            'commercial-ops-chart', 'commercial-pax-chart',
            'cargo-ops-chart', 'cargo-tons-chart',
            'general-ops-chart', 'general-pax-chart'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
        });
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                renderOperacionesTotales();
                updateOpsSummary();
                console.log('✅ Gráficas de Operaciones Totales reinicializadas');
                showNotification('Gráficas de Operaciones reinicializadas', 'success');
            } catch (error) {
                console.error('❌ Error al recrear gráficas de operaciones:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetOperacionesCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

function resetItinerarioCharts() {
    console.log('🔄 Reinicializando gráficas de Itinerario...');
    
    const btn = document.getElementById('reset-itinerario-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráficas de itinerario
        if (window.destroyItinerarioCharts && typeof window.destroyItinerarioCharts === 'function') {
            window.destroyItinerarioCharts();
        }
        
        // Limpiar canvas específicos del itinerario
        const canvasIds = ['paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart'];
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
        });
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                if (window.renderItineraryCharts && typeof window.renderItineraryCharts === 'function') {
                    window.renderItineraryCharts();
                    console.log('✅ Gráficas de Itinerario reinicializadas');
                    showNotification('Gráficas de Itinerario reinicializadas', 'success');
                } else {
                    throw new Error('Función renderItineraryCharts no disponible');
                }
            } catch (error) {
                console.error('❌ Error al recrear gráficas de itinerario:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetItinerarioCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

function resetDemorasCharts() {
    console.log('🔄 Reinicializando gráfica de Demoras...');
    
    const btn = document.getElementById('reset-demoras-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráfica de demoras existente
        if (window.opsCharts && window.opsCharts.delaysPieChart) {
            try { 
                window.opsCharts.delaysPieChart.destroy(); 
                delete window.opsCharts.delaysPieChart;
            } catch(_) {}
        }
        
        // Limpiar canvas de demoras
        const canvas = document.getElementById('delaysPieChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                if (window.renderDemoras && typeof window.renderDemoras === 'function') {
                    window.renderDemoras();
                    console.log('✅ Gráfica de Demoras reinicializada');
                    showNotification('Gráfica de Demoras reinicializada', 'success');
                } else {
                    throw new Error('Función renderDemoras no disponible');
                }
            } catch (error) {
                console.error('❌ Error al recrear gráfica de demoras:', error);
                showNotification('Error al recrear gráfica: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetDemorasCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

// Función de diagnóstico global (para usar en consola)
window.diagnoseCharts = function() {
    console.log('🔍 === DIAGNÓSTICO DE GRÁFICAS ===');
    
    const activeSection = document.querySelector('.content-section.active');
    console.log('Sección activa:', activeSection?.id || 'ninguna');
    
    console.log('📊 Gráficas de Operaciones Totales:');
    console.log('opsCharts:', Object.keys(opsCharts));
    
    console.log('📈 Instancias de Chart.js:');
    if (window.Chart && window.Chart.instances) {
        console.log('Chart instances:', Object.keys(window.Chart.instances));
    }
    
    console.log('🎯 Canvas elements:');
    const canvases = ['commercial-ops-chart', 'commercial-pax-chart', 'cargo-ops-chart', 'cargo-tons-chart', 'general-ops-chart', 'general-pax-chart', 'paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart', 'delaysPieChart'];
    canvases.forEach(id => {
        const canvas = document.getElementById(id);
        const chart = canvas ? Chart.getChart(canvas) : null;
        console.log(`${id}: canvas=${!!canvas}, chart=${!!chart}`);
    });
    
    console.log('🔧 Funciones globales:');
    console.log('renderOperacionesTotales:', typeof window.renderOperacionesTotales);
    console.log('renderItineraryCharts:', typeof window.renderItineraryCharts);
    console.log('renderDemoras:', typeof window.renderDemoras);
    console.log('destroyItinerarioCharts:', typeof window.destroyItinerarioCharts);
    
    console.log('=== FIN DIAGNÓSTICO ===');
};

// Exponer funciones específicas globalmente
window.resetOperacionesCharts = resetOperacionesCharts;
window.resetItinerarioCharts = resetItinerarioCharts;
window.resetDemorasCharts = resetDemorasCharts;

// Función de ayuda para mostrar atajos de teclado
window.showChartShortcuts = function() {
    console.log('⌨️ ATAJOS DE TECLADO PARA GRÁFICAS:');
    console.log('Ctrl+Shift+R: Reinicializar TODAS las gráficas');
    console.log('Ctrl+Shift+O: Reinicializar gráficas de Operaciones (en sección activa)');
    console.log('Ctrl+Shift+I: Reinicializar gráficas de Itinerario (en sección activa)');
    console.log('Ctrl+Shift+D: Reinicializar gráfica de Demoras (en sección activa)');
    console.log('');
    console.log('🔧 FUNCIONES DISPONIBLES EN CONSOLA:');
    console.log('diagnoseCharts() - Diagnóstico completo del estado de gráficas');
    console.log('resetOperacionesCharts() - Reinicializar solo Operaciones');
    console.log('resetItinerarioCharts() - Reinicializar solo Itinerario');
    console.log('resetDemorasCharts() - Reinicializar solo Demoras');
    console.log('showChartShortcuts() - Mostrar esta ayuda');
};

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
// --- Seguridad de login en cliente (mejor esfuerzo, no sustituye backend) ---
const LOGIN_LOCK_KEY = 'aifa.lock.count';
const LOGIN_LOCK_TS  = 'aifa.lock.until';
const SESSION_TOKEN  = 'aifa.session.token';
const SESSION_USER   = 'currentUser';
const SECRET_SALT    = 'aifa.ops.local.salt.v1'; // cambia en prod

// Fallback SHA-256 for contexts without crypto.subtle
const SHA256_FALLBACK_INIT = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
const SHA256_FALLBACK_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function utf8ToBinaryString(str) {
    const s = String(str ?? '');
    if (typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(s);
        let out = '';
        for (let i = 0; i < bytes.length; i += 1) {
            out += String.fromCharCode(bytes[i]);
        }
        return out;
    }
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
        const code = s.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code >= 0xd800 && code <= 0xdbff) {
            const next = s.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                const combined = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
                bytes.push(
                    0xf0 | (combined >> 18),
                    0x80 | ((combined >> 12) & 0x3f),
                    0x80 | ((combined >> 6) & 0x3f),
                    0x80 | (combined & 0x3f)
                );
                i += 1;
            } else {
                bytes.push(0xef, 0xbf, 0xbd);
            }
        } else if (code >= 0xdc00 && code <= 0xdfff) {
            bytes.push(0xef, 0xbf, 0xbd);
        } else {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
        out += String.fromCharCode(bytes[i]);
    }
    return out;
}

function sha256Fallback(str) {
    const binary = utf8ToBinaryString(str);
    const words = [];
    const maxWord = Math.pow(2, 32);
    let result = '';
    let message = binary + '\x80';
    while (message.length % 64 !== 56) {
        message += '\x00';
    }
    for (let i = 0; i < message.length; i += 1) {
        const j = message.charCodeAt(i);
        words[i >> 2] = (words[i >> 2] || 0) | (j << ((3 - i) % 4) * 8);
    }
    const bitLength = binary.length * 8;
    words[words.length] = (bitLength / maxWord) | 0;
    words[words.length] = bitLength >>> 0;

    const hash = SHA256_FALLBACK_INIT.slice();
    const w = new Array(64);
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));

    for (let i = 0; i < words.length; i += 16) {
        for (let t = 0; t < 16; t += 1) {
            w[t] = words[i + t] | 0;
        }
        for (let t = 16; t < 64; t += 1) {
            const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
            const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
        }

        let a = hash[0];
        let b = hash[1];
        let c = hash[2];
        let d = hash[3];
        let e = hash[4];
        let f = hash[5];
        let g = hash[6];
        let h = hash[7];

        for (let t = 0; t < 64; t += 1) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + SHA256_FALLBACK_K[t] + w[t]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        hash[0] = (hash[0] + a) | 0;
        hash[1] = (hash[1] + b) | 0;
        hash[2] = (hash[2] + c) | 0;
        hash[3] = (hash[3] + d) | 0;
        hash[4] = (hash[4] + e) | 0;
        hash[5] = (hash[5] + f) | 0;
        hash[6] = (hash[6] + g) | 0;
        hash[7] = (hash[7] + h) | 0;
    }

    for (let i = 0; i < 8; i += 1) {
        for (let j = 3; j >= 0; j -= 1) {
            const byte = (hash[i] >> (j * 8)) & 0xff;
            result += (byte < 16 ? '0' : '') + byte.toString(16);
        }
    }
    return result;
}

async function sha256(str){
    const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) || null;
    if (cryptoObj && cryptoObj.subtle && typeof TextEncoder !== 'undefined') {
        const enc = new TextEncoder().encode(str);
        const buf = await cryptoObj.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    return sha256Fallback(str);
}

async function makeToken(username){
    const ts = Date.now().toString();
    const sign = await sha256(username + '|' + ts + '|' + SECRET_SALT);
    return `${username}.${ts}.${sign}`;
}

async function verifyToken(token){
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [u, ts, sig] = parts;
    const expect = await sha256(u + '|' + ts + '|' + SECRET_SALT);
    // expira en 12h
    const expired = (Date.now() - Number(ts)) > (12*60*60*1000);
    return (!expired && sig === expect);
}

function getLockInfo(){
    const count = parseInt(localStorage.getItem(LOGIN_LOCK_KEY)||'0',10) || 0;
    const until = parseInt(localStorage.getItem(LOGIN_LOCK_TS)||'0',10) || 0;
    return { count, until };
}
function setLockInfo(count, until){
    localStorage.setItem(LOGIN_LOCK_KEY, String(count));
    localStorage.setItem(LOGIN_LOCK_TS, String(until));
}

async function handleLogin(e) {
    e.preventDefault();
    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    loginButton.classList.add('loading');
    showGlobalLoader('Verificando credenciales...');

    try{
        await ensureAuthHashes();
        const { count, until } = getLockInfo();
        const now = Date.now();
        if (until && now < until) {
            const secs = Math.ceil((until-now)/1000);
            throw new Error(`Demasiados intentos. Intenta en ${secs}s`);
        }

        const usernameInput = (document.getElementById('username').value || '').toString();
        const password = document.getElementById('password').value;
        const normalized = usernameInput.trim().toLowerCase();
        const matchedKey = Object.keys(dashboardData.users).find(k => (k || '').toString().trim().toLowerCase() === normalized);
        const user = matchedKey ? dashboardData.users[matchedKey] : undefined;

        // Comparar hash de la contraseña ingresada contra el hash inicializado
        let passOk = false;
        if (matchedKey) {
            const inputHash = await sha256(password + '|' + normalized + '|' + SECRET_PW_SALT);
            const storedHash = AUTH_HASHES[matchedKey];
            passOk = !!(storedHash && storedHash === inputHash);
        }
        if (!passOk) {
            // incrementar lock con backoff exponencial
            const nextCount = Math.min(8, (count||0)+1);
            const waitMs = Math.min(300000, Math.pow(2, nextCount) * 1000); // hasta 5 min
            setLockInfo(nextCount, Date.now() + waitMs);
            throw new Error('Usuario o contraseña incorrectos');
        }

        // Éxito: limpiar lockout y emitir token firmado
        setLockInfo(0, 0);
        const token = await makeToken(matchedKey);
        sessionStorage.setItem(SESSION_USER, matchedKey);
        sessionStorage.setItem(SESSION_TOKEN, token);
        showMainApp();
    } catch(err){
        const msg = (err && err.message) ? err.message : 'Error de autenticación';
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) errorDiv.textContent = msg;
        const loginButton = document.getElementById('login-button');
        if (loginButton) loginButton.classList.remove('loading');
    } finally {
        hideGlobalLoader();
    }
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
    populateOriginFilter();
    populateDestinationFilter();
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
    // origin/destination filters (new selects)
    const originFilterVal = document.getElementById('origin-filter') ? document.getElementById('origin-filter').value : 'all';
    const destinationFilterVal = document.getElementById('destination-filter') ? document.getElementById('destination-filter').value : 'all';
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
    // origin filter (exact match, case-insensitive, trimming)
    if (originFilterVal && originFilterVal !== 'all') {
        const o = originFilterVal.toString().trim().toLowerCase();
        const matchOrigin = (f) => (f.origen || '').toString().trim().toLowerCase() === o;
        passengerFlights = passengerFlights.filter(matchOrigin);
        cargoFlights = cargoFlights.filter(matchOrigin);
    }
    // destination filter
    if (destinationFilterVal && destinationFilterVal !== 'all') {
        const d = destinationFilterVal.toString().trim().toLowerCase();
        const matchDest = (f) => (f.destino || '').toString().trim().toLowerCase() === d;
        passengerFlights = passengerFlights.filter(matchDest);
        cargoFlights = cargoFlights.filter(matchDest);
    }
    // Global text search across common fields (moved before hour filter)
    if (globalSearchValue !== '') {
        const term = globalSearchValue;
        const matchFn = (f) => {
            return ((f.aerolinea || '').toString().toLowerCase().includes(term)) || ((f.origen || '').toString().toLowerCase().includes(term)) || ((f.destino || '').toString().toLowerCase().includes(term)) || ((f.vuelo_llegada || '').toString().toLowerCase().includes(term)) || ((f.vuelo_salida || '').toString().toLowerCase().includes(term)) || ((f.banda_reclamo || '').toString().toLowerCase().includes(term));
        };
        passengerFlights = passengerFlights.filter(matchFn);
        cargoFlights = cargoFlights.filter(matchFn);
    }
    // Snapshot del subconjunto antes del filtro por hora (para sincronizar gráficas)
    try {
        window.currentItineraryPreHour = {
            pax: [...(passengerFlights||[])],
            cargo: [...(cargoFlights||[])],
            combined: [...(passengerFlights||[]), ...(cargoFlights||[])]
        };
    } catch(_) {}
    // hour filter: ensure hour is associated to the same date side that matched
    if (selectedHour && selectedHour !== 'all') {
        const hhNum = parseInt(selectedHour, 10);
        const selYMD = selectedDate || '';
        const matchHour = (f) => {
            const hl = getHourInt(f.hora_llegada);
            const hs = getHourInt(f.hora_salida);
            // derive dates in yyyy-mm-dd for each side
            const toYMD = (s) => {
                const m = /^([0-9]{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s||'').toString().trim());
                if (!m) return null;
                return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
            };
            const ymdArr = toYMD(f.fecha_llegada);
            const ymdDep = toYMD(f.fecha_salida);
            if (hourType === 'arr') return (hl === hhNum) && (!selYMD || ymdArr === selYMD);
            if (hourType === 'dep') return (hs === hhNum) && (!selYMD || ymdDep === selYMD);
            // both: accept either side but bind hour to the same side date when date is selected
            const okArr = (hl === hhNum) && (!selYMD || ymdArr === selYMD);
            const okDep = (hs === hhNum) && (!selYMD || ymdDep === selYMD);
            return okArr || okDep;
        };
        passengerFlights = passengerFlights.filter(matchHour);
        cargoFlights = cargoFlights.filter(matchHour);
    }
    // (global search ya aplicado antes del filtro por hora)
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
    // update summary based on currently visible (fully filtered) data
    displaySummaryTable([...(passengerFlights||[]), ...(cargoFlights||[])]);
    // Expose the filtered subset to sync charts in 'Gráficas Itinerario'
    try {
        window.currentItineraryFilterState = {
            selectedDate,
            hourType: hourType || 'both',
            selectedHour: selectedHour || 'all',
            origin: originFilterVal || 'all',
            destination: destinationFilterVal || 'all'
        };
        window.currentItineraryFiltered = {
            flightsPax: passengerFlights,
            flightsCargo: cargoFlights,
            flightsCombined: [...(passengerFlights||[]), ...(cargoFlights||[])]
        };
        const sync = (window.syncItineraryFiltersToCharts !== false); // default true
        const itSec = document.getElementById('itinerario-section');
        if (sync && itSec && itSec.classList.contains('active') && typeof window.renderItineraryCharts === 'function') {
            clearTimeout(window._itSyncTimer);
            window._itSyncTimer = setTimeout(() => { try { window.renderItineraryCharts(); } catch(_) {} }, 80);
        }
    } catch(_) {}
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
        .map((f) => normalizePositionValue(f.posicion || f.posición || f.stand || ''))
        .filter(Boolean);
  const unique = Array.from(new Set(vals)).sort();
  sel.innerHTML = '<option value="all" selected>Todas las posiciones</option>' +
    unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

// Nuevos: llenar selects de Origen/Destino
function populateOriginFilter(flights = []) {
    const sel = document.getElementById('origin-filter');
    if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const vals = data.map(f => (f.origen||'').toString().trim()).filter(Boolean);
    const unique = Array.from(new Set(vals)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
    sel.innerHTML = '<option value="all" selected>Todos los orígenes</option>' +
        unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

function populateDestinationFilter(flights = []) {
    const sel = document.getElementById('destination-filter');
    if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const vals = data.map(f => (f.destino||'').toString().trim()).filter(Boolean);
    const unique = Array.from(new Set(vals)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
    sel.innerHTML = '<option value="all" selected>Todos los destinos</option>' +
        unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

function clearFilters() {
    const airline = document.getElementById('airline-filter'); if (airline) airline.value = 'all';
    const pos = document.getElementById('position-filter'); if (pos) pos.value = 'all';
    const ori = document.getElementById('origin-filter'); if (ori) ori.value = 'all';
    const des = document.getElementById('destination-filter'); if (des) des.value = 'all';
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
    try {
        summaryDetailMode = 'airline';
        summarySelectedAirline = airline;
        summarySelectedPosition = null;
        summarySelectionLocked = true;
    } catch(_) {}
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
function displaySummaryTableLegacy(flights) {
    // Legacy placeholder: delega a la nueva implementación modernizada.
    displaySummaryTable(flights);
}
function displaySummaryTable(flights) {
    const container = document.getElementById('summary-table-container');
    if (!container) return;

    const escapeHtml = (value) => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
    };
    const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));

    if (!Array.isArray(flights) || flights.length === 0) {
        container.innerHTML = '<div class="alert alert-info bg-transparent text-body">No se encontraron operaciones.</div>';
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const totals = {
        arrivals: 0,
        departures: 0,
        flights: 0,
        passengerFlights: 0,
        cargoFlights: 0,
        generalFlights: 0,
        passengerOps: { arrivals: 0, departures: 0 },
        cargoOps: { arrivals: 0, departures: 0 },
        generalOps: { arrivals: 0, departures: 0 }
    };
    const summaryMap = new Map();
    const positionMap = new Map();

    flights.forEach((flight) => {
        const airlineName = (flight && flight.aerolinea ? String(flight.aerolinea).trim() : '') || 'Sin aerolínea';
        let entry = summaryMap.get(airlineName);
        if (!entry) {
            entry = { arrivals: 0, departures: 0, flights: [], passengerFlights: 0, cargoFlights: 0, generalFlights: 0 };
            summaryMap.set(airlineName, entry);
        }
        entry.flights.push(flight);
        totals.flights += 1;

        const hasArrival = !!String(flight?.vuelo_llegada || '').trim();
        const hasDeparture = !!String(flight?.vuelo_salida || '').trim();
        if (hasArrival) {
            entry.arrivals += 1;
            totals.arrivals += 1;
        }
        if (hasDeparture) {
            entry.departures += 1;
            totals.departures += 1;
        }

        const categoryRaw = (flight?.categoria || flight?.category || '').toString().trim().toLowerCase();
        let isPassengerFlight = false;
        let isCargoFlight = false;
        if (categoryRaw.includes('pasaj')) isPassengerFlight = true;
        if (categoryRaw.includes('carg')) isCargoFlight = true;

        const normalizedAirline = normalizeAirlineName(airlineName);
        if (!isPassengerFlight && !isCargoFlight) {
            if (passengerAirlinesNormalized.has(normalizedAirline) && !cargoAirlinesNormalized.has(normalizedAirline)) {
                isPassengerFlight = true;
            } else if (cargoAirlinesNormalized.has(normalizedAirline) && !passengerAirlinesNormalized.has(normalizedAirline)) {
                isCargoFlight = true;
            } else if (entry.passengerFlights > entry.cargoFlights) {
                isPassengerFlight = true;
            } else if (entry.cargoFlights > entry.passengerFlights) {
                isCargoFlight = true;
            }
        }
        if (isPassengerFlight && isCargoFlight) {
            if (cargoAirlinesNormalized.has(normalizedAirline) && !passengerAirlinesNormalized.has(normalizedAirline)) {
                isPassengerFlight = false;
            } else {
                isCargoFlight = false;
            }
        }
        const isGeneralFlight = !isPassengerFlight && !isCargoFlight;

        if (isPassengerFlight) {
            entry.passengerFlights += 1;
            totals.passengerFlights += 1;
            if (hasArrival) totals.passengerOps.arrivals += 1;
            if (hasDeparture) totals.passengerOps.departures += 1;
        }
        if (isCargoFlight) {
            entry.cargoFlights += 1;
            totals.cargoFlights += 1;
            if (hasArrival) totals.cargoOps.arrivals += 1;
            if (hasDeparture) totals.cargoOps.departures += 1;
        }
        if (isGeneralFlight) {
            entry.generalFlights += 1;
            totals.generalFlights += 1;
            if (hasArrival) totals.generalOps.arrivals += 1;
            if (hasDeparture) totals.generalOps.departures += 1;
        }

        const positionNormalized = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
        if (positionNormalized) {
            const positionCategory = classifyPositionStand(positionNormalized);
            const needsAttention = cobusAttentionPositions.has(positionNormalized);
            let posEntry = positionMap.get(positionNormalized);
            if (!posEntry) {
                posEntry = {
                    position: positionNormalized,
                    arrivals: 0,
                    departures: 0,
                    flights: [],
                    airlines: new Set(),
                    category: positionCategory,
                    attention: needsAttention
                };
                positionMap.set(positionNormalized, posEntry);
            }
            if (!posEntry.category) posEntry.category = positionCategory;
            if (needsAttention) posEntry.attention = true;
            if (hasArrival) posEntry.arrivals += 1;
            if (hasDeparture) posEntry.departures += 1;
            posEntry.flights.push(flight);
            posEntry.airlines.add(airlineName);
        }
    });

    const airlines = Array.from(summaryMap.entries()).map(([airline, data]) => {
        const passengerFlights = data.passengerFlights || 0;
        const cargoFlights = data.cargoFlights || 0;
        const generalFlights = data.generalFlights || 0;
        const normalized = normalizeAirlineName(airline);
        let type = 'passenger';
        if (generalFlights > 0 && generalFlights >= passengerFlights && generalFlights >= cargoFlights) {
            type = 'general';
        } else if (cargoFlights > passengerFlights) {
            type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights > 0) {
            type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights === 0 && generalFlights > 0) {
            type = 'general';
        } else if (cargoFlights === passengerFlights && cargoFlights !== 0) {
            if (cargoAirlinesNormalized.has(normalized) && !passengerAirlinesNormalized.has(normalized)) type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights === 0) {
            if (cargoAirlinesNormalized.has(normalized) && !passengerAirlinesNormalized.has(normalized)) type = 'cargo';
            else if (generalFlights > 0) type = 'general';
        }
        return {
            airline,
            arrivals: data.arrivals,
            departures: data.departures,
            total: data.flights.length,
            flights: data.flights,
            passengerFlights,
            cargoFlights,
            generalFlights,
            type
        };
    });

    if (!airlines.length) {
        container.innerHTML = '<div class="alert alert-info bg-transparent text-body">No se encontraron operaciones.</div>';
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const passengerAirlineCards = airlines.filter((item) => item.type === 'passenger');
    const cargoAirlineCards = airlines.filter((item) => item.type === 'cargo');
    const generalAirlineCards = airlines.filter((item) => item.type === 'general');

    const sortAirlineList = (list) => list.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.airline.localeCompare(b.airline, 'es', { sensitivity: 'base' });
    });
    sortAirlineList(passengerAirlineCards);
    sortAirlineList(cargoAirlineCards);
    sortAirlineList(generalAirlineCards);

    const airlineDataMap = new Map();
    airlines.forEach((item) => airlineDataMap.set(item.airline, item));

    const positions = Array.from(positionMap.entries()).map(([positionKey, data]) => {
        const airlinesList = Array.from(data.airlines || []).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        const category = data.category || classifyPositionStand(positionKey);
        return {
            position: data.position || positionKey,
            normalizedPosition: positionKey,
            arrivals: data.arrivals,
            departures: data.departures,
            total: data.flights.length,
            flights: data.flights,
            airlines: airlinesList,
            category,
            categoryLabel: getPositionCategoryLabel(category),
            attention: !!data.attention
        };
    }).filter((item) => item.total > 0).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.position.localeCompare(b.position, undefined, { sensitivity: 'base' });
    });

    const maxPositionTotal = positions.reduce((max, item) => Math.max(max, item.total), 0);

    const getPositionIntensity = (value) => {
        if (!maxPositionTotal) return 'low';
        const ratio = value / maxPositionTotal;
        if (ratio >= 0.66) return 'high';
        if (ratio >= 0.33) return 'medium';
        return 'low';
    };

    const groupedPositions = positions.reduce((accumulator, item) => {
        const key = item.category || 'terminal';
        if (!accumulator[key]) accumulator[key] = [];
        accumulator[key].push(item);
        return accumulator;
    }, { cargo: [], semicontacto: [], remote: [], terminal: [] });

    const positionGroupTitles = {
        cargo: 'Posiciones de carga',
        semicontacto: 'Posiciones de semicontacto',
        remote: 'Posiciones remotas',
        terminal: 'Posiciones edificio terminal'
    };

    const renderPositionGroup = (category) => {
        const items = groupedPositions[category] || [];
        if (!items.length) return '';
        const label = positionGroupTitles[category] || getPositionCategoryLabel(category);
        const badgesHtml = items.map((p) => {
            const badgeIntensity = getPositionIntensity(p.total);
            const categoryLabel = p.categoryLabel || getPositionCategoryLabel(p.category);
            let airlineList = 'Sin aerolíneas';
            if (p.airlines.length) {
                const maxAirlines = 6;
                const preview = p.airlines.slice(0, maxAirlines);
                airlineList = preview.join(', ');
                if (p.airlines.length > maxAirlines) {
                    const remaining = p.airlines.length - maxAirlines;
                    airlineList += ` y ${remaining} más`;
                }
            }
            const tooltipParts = [
                `Categoría: ${categoryLabel}`,
                `Llegadas: ${formatNumber(p.arrivals)}`,
                `Salidas: ${formatNumber(p.departures)}`,
                `Aerolíneas: ${airlineList}`
            ];
            if (p.attention) tooltipParts.push('Atención: COBUS');
            const tooltip = tooltipParts.join(' · ');
            const tooltipEscaped = escapeHtml(tooltip);
            const attentionAttr = p.attention ? ' data-special="cobus"' : '';
            const attentionBadge = p.attention ? '<span class="summary-position-flag"><i class="fas fa-bus"></i> COBUS</span>' : '';
            return `<span class="summary-position-badge" role="button" tabindex="0" data-position="${escapeHtml(p.position)}" data-category="${escapeHtml(p.category)}" data-intensity="${escapeHtml(badgeIntensity)}"${attentionAttr} data-bs-toggle="tooltip" data-bs-title="${tooltipEscaped}" title="${tooltipEscaped}">${escapeHtml(p.position)} <strong>${formatNumber(p.total)}</strong>${attentionBadge}</span>`;
        }).join('');
        return `
        <div class="summary-position-group" data-category="${escapeHtml(category)}">
            <div class="summary-position-group-label">${escapeHtml(label)}</div>
            <div class="summary-position-group-row">
                ${badgesHtml}
            </div>
        </div>`;
    };

    const renderAirlineSection = (title, list, sectionType) => {
        if (!list.length) return '';
        const cardsMarkup = list.map((item) => {
            const logoCandidates = getAirlineLogoCandidates(item.airline) || [];
            const logoPath = logoCandidates[0] || '';
            const dataCands = logoCandidates.join('|');
            const sizeClass = getLogoSizeClass(item.airline, 'summary');
            const logoHtml = logoPath
                ? `<img class="airline-logo ${escapeHtml(sizeClass)}" src="${escapeHtml(logoPath)}" alt="Logo ${escapeHtml(item.airline)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
                : `<span class="summary-airline-fallback">${escapeHtml(item.airline.charAt(0) || '?')}</span>`;
            const accentColor = airlineColors[item.airline] || '#0d6efd';
            return `
            <div class="col-6 col-md-4 col-lg-3 col-xl-2 summary-airline-col" data-airline="${escapeHtml(item.airline)}" data-section="${escapeHtml(sectionType)}">
                <div class="card summary-airline-card h-100" role="button" tabindex="0" data-airline="${escapeHtml(item.airline)}" data-section="${escapeHtml(sectionType)}" aria-label="${escapeHtml(item.airline)}: ${formatNumber(item.total)} vuelos" style="--summary-airline-color:${accentColor};">
                    <div class="summary-airline-card-body card-body">
                        <div class="summary-airline-logo">${logoHtml}</div>
                        <div class="summary-airline-total">${formatNumber(item.total)}</div>
                        <div class="summary-airline-total-label">Vuelos</div>
                        <span class="visually-hidden">${escapeHtml(item.airline)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        return `
        <div class="summary-airline-section" data-section="${escapeHtml(sectionType)}">
            <div class="summary-section-label">${title}</div>
            <div class="row g-3 summary-airline-grid">
                ${cardsMarkup}
            </div>
        </div>`;
    };

    const totalFlights = totals.flights;
    const totalOperations = totals.arrivals + totals.departures;
    const passengerOperations = totals.passengerOps.arrivals + totals.passengerOps.departures;
    const cargoOperations = totals.cargoOps.arrivals + totals.cargoOps.departures;
    const generalOperations = totals.generalOps.arrivals + totals.generalOps.departures;
    const summarySubtitle = `Incluye ${formatNumber(totals.arrivals)} llegadas y ${formatNumber(totals.departures)} salidas (${formatNumber(totalFlights)} vuelos listados).`;
    let html = `
    <div class="card summary-total-card mb-3">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
            <div class="summary-total-icon"><i class="fas fa-chart-line"></i></div>
            <div>
                <div class="summary-total-title">Operaciones del día</div>
                <div class="summary-total-sub">${summarySubtitle}</div>
            </div>
            <div class="summary-total-stats ms-auto d-flex flex-wrap gap-2">
                <span class="summary-pill summary-pill-total" title="Llegadas + salidas"><i class="fas fa-plane"></i>Operaciones ${formatNumber(totalOperations)}</span>
                <span class="summary-pill summary-pill-passenger" title="Llegadas + salidas de vuelos de pasajeros"><i class="fas fa-users"></i>Pasajeros ${formatNumber(passengerOperations)}</span>
                <span class="summary-pill summary-pill-cargo" title="Llegadas + salidas de vuelos de carga"><i class="fas fa-box-open"></i>Carga ${formatNumber(cargoOperations)}</span>
                ${generalOperations > 0 ? `<span class="summary-pill summary-pill-general" title="Llegadas + salidas de aviación general"><i class="fas fa-paper-plane"></i>General ${formatNumber(generalOperations)}</span>` : ''}
            </div>
        </div>
    </div>`;

    if (positions.length) {
        html += `
        <div class="card summary-positions-card mb-3">
            <div class="card-body">
                <div class="summary-positions-header d-flex align-items-start gap-2 mb-2">
                    <div class="summary-positions-icon"><i class="fas fa-map-marked-alt"></i></div>
                    <div>
                        <div class="summary-positions-title">Posiciones activas</div>
                        <div class="summary-positions-sub">Vuelos programados por stand</div>
                    </div>
                </div>
                <div class="summary-position-groups">
                    ${renderPositionGroup('terminal')}
                    ${renderPositionGroup('semicontacto')}
                    ${renderPositionGroup('cargo')}
                    ${renderPositionGroup('remote')}
                </div>
            </div>
        </div>`;
    }
    html += `
    <div class="summary-selection-controls d-flex justify-content-end align-items-center mb-3">
        <button type="button" class="btn btn-sm btn-outline-secondary summary-reset-btn d-none" id="summary-selection-reset">
            <i class="fas fa-arrow-left"></i>Regresar
        </button>
    </div>`;

    html += '<div class="summary-airline-sections">';
    html += renderAirlineSection('Pasajeros', passengerAirlineCards, 'passenger');
    html += renderAirlineSection('Carga', cargoAirlineCards, 'cargo');
    html += renderAirlineSection('General', generalAirlineCards, 'general');
    html += '</div>';
    html += '<div id="summary-airline-detail" class="mt-4"></div>';

    container.innerHTML = html;

    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipEls = container.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipEls.forEach((el) => {
            try { new bootstrap.Tooltip(el); } catch (_) {}
        });
    }

    const detailEl = container.querySelector('#summary-airline-detail');
    if (!detailEl) {
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const renderEmptyDetail = (message) => {
        const text = message || 'Selecciona una aerolínea o posición para ver el detalle.';
        detailEl.innerHTML = `<div class="alert alert-info">${escapeHtml(text)}</div>`;
    };

    const cards = Array.from(container.querySelectorAll('.summary-airline-card'));
    const positionBadges = Array.from(container.querySelectorAll('.summary-position-badge'));
    const positionDataMap = new Map();
    positions.forEach((item) => positionDataMap.set(item.position, item));
    const positionsCard = container.querySelector('.summary-positions-card');
    const positionGroups = positionsCard ? Array.from(positionsCard.querySelectorAll('.summary-position-group')) : [];
    const summarySections = Array.from(container.querySelectorAll('.summary-airline-section'));
    const cardWrappers = cards.map((card) => card?.closest('.summary-airline-col') || null);
    const resetBtn = container.querySelector('#summary-selection-reset');

    const timeToMinutes = (value) => {
        const match = /^\s*(\d{1,2})\s*:\s*(\d{2})/.exec(String(value || ''));
        if (!match) return Number.MAX_SAFE_INTEGER;
        const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
        const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
        return hours * 60 + minutes;
    };

    const buildFlightRows = (flightList) => {
        if (!Array.isArray(flightList) || flightList.length === 0) return '';
        const sortedFlights = [...flightList].sort((a, b) => {
            const aTime = Math.min(timeToMinutes(a?.hora_llegada), timeToMinutes(a?.hora_salida));
            const bTime = Math.min(timeToMinutes(b?.hora_llegada), timeToMinutes(b?.hora_salida));
            if (aTime !== bTime) return aTime - bTime;
            return String(a?.vuelo_llegada || a?.vuelo_salida || '').localeCompare(String(b?.vuelo_llegada || b?.vuelo_salida || ''), undefined, { sensitivity: 'base' });
        });
        return sortedFlights.map((flight, idx) => {
            const cell = (field) => {
                const value = field === undefined || field === null || String(field).trim() === '' ? '-' : field;
                return escapeHtml(String(value));
            };
            const airlineName = (flight && flight.aerolinea) ? String(flight.aerolinea) : 'Sin aerolínea';
            const rowLogoCandidates = getAirlineLogoCandidates(airlineName) || [];
            const rowLogoPath = rowLogoCandidates[0] || '';
            const rowDataCands = rowLogoCandidates.join('|');
            const rowSizeClass = getLogoSizeClass(airlineName, 'table');
            const rowLogoHtml = rowLogoPath
                ? `<img class="airline-logo ${escapeHtml(rowSizeClass)}" src="${escapeHtml(rowLogoPath)}" alt="Logo ${escapeHtml(airlineName)}" data-cands="${escapeHtml(rowDataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
                : '';
            const rowColor = airlineColors[airlineName] || '#ccc';
            const delay = (idx * 0.06).toFixed(2);
            const positionDisplay = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
            const positionCell = positionDisplay ? escapeHtml(positionDisplay) : '-';
            return `<tr class="animated-row" style="--delay:${delay}s; --airline-color:${rowColor};"><td><div class="airline-cell">${rowLogoHtml}<span class="airline-name">${escapeHtml(airlineName)}</span></div></td><td>${cell(flight?.aeronave)}</td><td>${cell(flight?.vuelo_llegada)}</td><td>${cell(flight?.fecha_llegada)}</td><td>${cell(flight?.hora_llegada)}</td><td class="col-origen">${cell(flight?.origen)}</td><td class="text-center">${cell(flight?.banda_reclamo)}</td><td>${positionCell}</td><td>${cell(flight?.vuelo_salida)}</td><td>${cell(flight?.fecha_salida)}</td><td>${cell(flight?.hora_salida)}</td><td class="col-destino">${cell(flight?.destino)}</td></tr>`;
        }).join('');
    };

    const setActiveCard = (airlineName) => {
        cards.forEach((card) => {
            const isActive = !!airlineName && card.dataset.airline === airlineName;
            card.classList.toggle('active', isActive);
            card.classList.toggle('border-primary', isActive);
            card.classList.toggle('shadow-sm', isActive);
        });
    };

    const setActivePosition = (position) => {
        positionBadges.forEach((badge) => {
            const isActive = !!position && badge.dataset.position === position;
            badge.classList.toggle('active', isActive);
        });
    };

    const refreshPositionGroupVisibility = () => {
        if (!positionGroups || !positionGroups.length) return;
        positionGroups.forEach((group) => {
            const hasVisibleBadge = Array.from(group.querySelectorAll('.summary-position-badge')).some((badge) => !badge.classList.contains('d-none'));
            group.classList.toggle('d-none', !hasVisibleBadge);
        });
    };

    const renderAirlineDetail = (item) => {
        if (!item) {
            renderEmptyDetail('Selecciona una aerolínea para ver el detalle.');
            return;
        }
        const rows = buildFlightRows(item.flights);
        const logoCandidates = getAirlineLogoCandidates(item.airline) || [];
        const logoPath = logoCandidates[0] || '';
        const dataCands = logoCandidates.join('|');
        const sizeClass = getLogoSizeClass(item.airline, 'summary');
        const detailLogo = logoPath
            ? `<img class="airline-logo ${escapeHtml(sizeClass)}" src="${escapeHtml(logoPath)}" alt="Logo ${escapeHtml(item.airline)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : `<span class="summary-airline-fallback">${escapeHtml(item.airline.charAt(0) || '?')}</span>`;
        const accentColor = airlineColors[item.airline] || '#0d6efd';
        detailEl.innerHTML = `
        <div class="card summary-detail-card" style="--summary-airline-color:${accentColor};">
            <div class="summary-detail-hero d-flex flex-wrap align-items-center gap-3">
                <div class="summary-detail-logo">${detailLogo}</div>
                <div>
                    <div class="summary-detail-title">${escapeHtml(item.airline)}</div>
                    <div class="summary-detail-sub">Total de vuelos: ${formatNumber(item.total)}</div>
                </div>
            </div>
            <div class="card-body">
                <div class="summary-detail-actions d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div class="small text-muted">Incluye vuelos filtrados en la vista actual.</div>
                    <button type="button" class="btn btn-sm btn-outline-primary summary-detail-filter"><i class="fas fa-table me-1"></i>Ver en tablas</button>
                </div>
                <div class="summary-detail-table table-container-tech">
                    <div class="table-responsive vertical-scroll">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Aerolínea</th>
                                    <th>Aeronave</th>
                                    <th>Vuelo Lleg.</th>
                                    <th>Fecha Lleg.</th>
                                    <th>Hora Lleg.</th>
                                    <th class="col-origen">Origen</th>
                                    <th>Banda</th>
                                    <th>Posición</th>
                                    <th>Vuelo Sal.</th>
                                    <th>Fecha Sal.</th>
                                    <th>Hora Sal.</th>
                                    <th class="col-destino">Destino</th>
                                </tr>
                            </thead>
                            <tbody>${rows || '<tr><td colspan="12" class="text-center text-muted">Sin vuelos disponibles.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
        const filterBtn = detailEl.querySelector('.summary-detail-filter');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => viewFlightsForAirline(item.airline));
        }
    };

    const renderPositionDetail = (item) => {
        if (!item) {
            renderEmptyDetail('Selecciona una posición para ver el detalle.');
            return;
        }
        const rows = buildFlightRows(item.flights);
        const accentColor = (() => {
            if (!item.flights || !item.flights.length) return '#0d6efd';
            const firstAirline = item.flights.find((flight) => airlineColors[flight?.aerolinea]);
            return firstAirline ? airlineColors[firstAirline.aerolinea] : '#0d6efd';
        })();
        const categoryLabel = escapeHtml(item.categoryLabel || getPositionCategoryLabel(item.category));
        const attentionBadge = item.attention ? '<span class="summary-detail-flag"><i class="fas fa-bus"></i> Cobus</span>' : '';
        detailEl.innerHTML = `
        <div class="card summary-detail-card" style="--summary-airline-color:${accentColor};">
            <div class="summary-detail-hero d-flex flex-wrap align-items-center gap-3">
                <div class="summary-detail-logo position-logo"><i class="fas fa-map-marker-alt"></i></div>
                <div>
                    <div class="summary-detail-title">Posición ${escapeHtml(item.position)}</div>
                    <div class="summary-detail-sub">Vuelos programados: ${formatNumber(item.total)} · ${categoryLabel}</div>
                    ${attentionBadge}
                </div>
            </div>
            <div class="card-body">
                <div class="summary-detail-actions d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div class="small text-muted">Incluye vuelos filtrados en la vista actual.</div>
                    <button type="button" class="btn btn-sm btn-outline-primary summary-detail-filter-position"><i class="fas fa-sliders-h me-1"></i>Filtrar por posición</button>
                </div>
                <div class="summary-detail-table table-container-tech">
                    <div class="table-responsive vertical-scroll">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Aerolínea</th>
                                    <th>Aeronave</th>
                                    <th>Vuelo Lleg.</th>
                                    <th>Fecha Lleg.</th>
                                    <th>Hora Lleg.</th>
                                    <th class="col-origen">Origen</th>
                                    <th>Banda</th>
                                    <th>Posición</th>
                                    <th>Vuelo Sal.</th>
                                    <th>Fecha Sal.</th>
                                    <th>Hora Sal.</th>
                                    <th class="col-destino">Destino</th>
                                </tr>
                            </thead>
                            <tbody>${rows || '<tr><td colspan="12" class="text-center text-muted">Sin vuelos programados para esta posición.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
        const filterBtn = detailEl.querySelector('.summary-detail-filter-position');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                const select = document.getElementById('position-filter');
                if (!select) return;
                const existingOption = Array.from(select.options).find((opt) => opt.value === item.position);
                if (!existingOption) {
                    const option = new Option(item.position, item.position, true, true);
                    select.add(option);
                }
                select.value = item.position;
                summaryDetailMode = 'position';
                summarySelectedPosition = item.position;
                summarySelectedAirline = null;
                applyFilters();
            });
        }
    };

    const getSelectedCardSection = () => {
        const card = cards.find((entry) => entry?.dataset?.airline === summarySelectedAirline);
        return card?.dataset?.section || null;
    };

    const updateResetButton = (hasSelection, isAirline) => {
        if (!resetBtn) return;
        if (!hasSelection) {
            resetBtn.classList.add('d-none');
            return;
        }
        const label = isAirline ? 'Regresar a todas las aerolíneas' : 'Regresar a todas las posiciones';
        resetBtn.innerHTML = `<i class="fas fa-arrow-left"></i>${label}`;
        resetBtn.classList.remove('d-none');
    };

    const updateSelectionLayout = () => {
        const hasAirlineSelection = summaryDetailMode === 'airline' && !!summarySelectedAirline && airlineDataMap.has(summarySelectedAirline);
        const hasPositionSelection = summaryDetailMode === 'position' && !!summarySelectedPosition && positionDataMap.has(summarySelectedPosition);
        const hasLockedSelection = summarySelectionLocked && (hasAirlineSelection || hasPositionSelection);

        updateResetButton(hasLockedSelection, hasAirlineSelection);

        cardWrappers.forEach((wrapper) => {
            if (!wrapper) return;
            wrapper.classList.remove('d-none');
        });
        summarySections.forEach((section) => section.classList.remove('d-none'));
        positionBadges.forEach((badge) => badge.classList.remove('d-none'));
        if (positionsCard) {
            positionsCard.classList.remove('d-none');
            positionsCard.classList.remove('compact');
        }
        positionGroups.forEach((group) => group.classList.remove('d-none'));
        refreshPositionGroupVisibility();

        if (!hasLockedSelection) return;

        if (hasAirlineSelection) {
            const selectedSection = getSelectedCardSection();
            cardWrappers.forEach((wrapper) => {
                if (!wrapper) return;
                const matches = wrapper.dataset.airline === summarySelectedAirline;
                wrapper.classList.toggle('d-none', !matches);
            });
            summarySections.forEach((section) => {
                if (!section) return;
                const matches = section.dataset.section === selectedSection;
                section.classList.toggle('d-none', !matches);
            });
            if (positionsCard) positionsCard.classList.add('d-none');
            refreshPositionGroupVisibility();
            return;
        }

        if (hasPositionSelection && positionsCard) {
            summarySections.forEach((section) => section.classList.add('d-none'));
            cardWrappers.forEach((wrapper) => {
                if (!wrapper) return;
                wrapper.classList.add('d-none');
            });
            const badges = Array.from(positionsCard.querySelectorAll('.summary-position-badge'));
            badges.forEach((badge) => {
                const matches = badge.dataset.position === summarySelectedPosition;
                badge.classList.toggle('d-none', !matches);
            });
            positionsCard.classList.remove('d-none');
            positionsCard.classList.add('compact');
            refreshPositionGroupVisibility();
        }
    };

    const ensureDetailVisible = () => {
        const hasAirlineSelection = summarySelectedAirline && airlineDataMap.has(summarySelectedAirline);
        const hasPositionSelection = summarySelectedPosition && positionDataMap.has(summarySelectedPosition);

        if (summarySelectionLocked && summaryDetailMode === 'airline' && hasAirlineSelection) {
            setActiveCard(summarySelectedAirline);
            setActivePosition(null);
            renderAirlineDetail(airlineDataMap.get(summarySelectedAirline));
            return;
        }

        if (summarySelectionLocked && summaryDetailMode === 'position' && hasPositionSelection) {
            setActiveCard(null);
            setActivePosition(summarySelectedPosition);
            renderPositionDetail(positionDataMap.get(summarySelectedPosition));
            return;
        }

        if (summarySelectionLocked) {
            summarySelectionLocked = false;
        }
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        setActiveCard(null);
        setActivePosition(null);
        renderEmptyDetail();
    };

    cards.forEach((card) => {
        const airlineName = card.dataset.airline;
        if (!airlineName) return;
        const toggleDetail = () => {
            if (!airlineDataMap.has(airlineName)) return;
            const isActive = summarySelectionLocked && summaryDetailMode === 'airline' && summarySelectedAirline === airlineName;
            if (isActive) {
                summarySelectionLocked = false;
                summarySelectedAirline = null;
                summarySelectedPosition = null;
            } else {
                summaryDetailMode = 'airline';
                summarySelectedAirline = airlineName;
                summarySelectedPosition = null;
                summarySelectionLocked = true;
            }
            ensureDetailVisible();
            updateSelectionLayout();
        };
        card.addEventListener('click', toggleDetail);
        card.addEventListener('keypress', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                toggleDetail();
            }
        });
    });

    positionBadges.forEach((badge) => {
        const positionKey = badge.dataset.position;
        if (!positionKey) return;
        const showPositionDetail = () => {
            const data = positionDataMap.get(positionKey);
            if (!data) return;
            summaryDetailMode = 'position';
            summarySelectedPosition = positionKey;
            summarySelectedAirline = null;
            summarySelectionLocked = true;
            setActiveCard(null);
            setActivePosition(positionKey);
            renderPositionDetail(data);
            updateSelectionLayout();
        };
        badge.addEventListener('click', (ev) => {
            ev.preventDefault();
            showPositionDetail();
        });
        badge.addEventListener('keypress', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                showPositionDetail();
            }
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            summarySelectionLocked = false;
            summaryDetailMode = 'airline';
            summarySelectedAirline = null;
            summarySelectedPosition = null;
            setActiveCard(null);
            setActivePosition(null);
            ensureDetailVisible();
            updateSelectionLayout();
        });
    }

    ensureDetailVisible();
    updateSelectionLayout();
}

function displayPassengerTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('passenger-itinerary-container');
    if (!container) return;
    if (flights.length === 0) { container.innerHTML = `<div class="alert alert-info bg-transparent text-body">No se encontraron vuelos de pasajeros.</div>`; return; }
    let tableHtml = `<table class="table table-hover"><thead><tr><th>Aerolínea</th><th>Aeronave</th><th>Vuelo Lleg.</th><th>Fecha Lleg.</th><th>Hora Lleg.</th><th class="col-origen">Origen</th><th>Banda</th><th>Posición</th><th>Vuelo Sal.</th><th>Fecha Sal.</th><th>Hora Sal.</th><th class="col-destino">Destino</th></tr></thead><tbody>`;
    flights.forEach((flight, index) => {
    const airlineName = flight.aerolinea || '-';
    const positionDisplay = normalizePositionValue(flight.posicion || flight.posición || flight.stand || '');
    const positionCell = positionDisplay || '-';
    const cands = getAirlineLogoCandidates(airlineName);
    const logoPath = cands[0];
    const dataCands = cands.join('|');
    const sizeClass = getLogoSizeClass(airlineName, 'table');
    const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${airlineName}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">` : '';
        const rowColor = (airlineColors[flight.aerolinea] || '#ccc');
        tableHtml += `<tr class="animated-row" style="--delay: ${index * 0.08}s; --airline-color: ${rowColor};">
            <td><div class="airline-cell">${logoHtml}<span class="airline-name">${airlineName}</span></div></td>
            <td>${flight.aeronave || '-'}</td>
            <td>${flight.vuelo_llegada || '-'}</td>
            <td>${flight.fecha_llegada || '-'}</td>
            <td>${flight.hora_llegada || '-'}</td>
            <td class="col-origen">${flight.origen || '-'}</td>
            <td class="text-center">${flight.banda_reclamo || '-'}</td>
            <td>${positionCell}</td>
            <td>${flight.vuelo_salida || '-'}</td>
            <td>${flight.fecha_salida || '-'}</td>
            <td>${flight.hora_salida || '-'}</td>
            <td class="col-destino">${flight.destino || '-'}</td>
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
    // Habilitar arrastre horizontal sobre la propia tabla
    try { enableTwoAxisTableScroll('passenger-itinerary-scroll', 'passenger-itinerary-container'); } catch(_) {}
}
function displayCargoTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('cargo-itinerary-container');
    if (!container) return;
    if (flights.length === 0) { container.innerHTML = `<div class="alert alert-info bg-transparent text-body">No se encontraron vuelos de carga.</div>`; return; }
    let tableHtml = `<table class="table table-hover"><thead><tr><th>Aerolínea</th><th>Aeronave</th><th>Vuelo Lleg.</th><th>Fecha Lleg.</th><th>Hora Lleg.</th><th class="col-origen">Origen</th><th>Posición</th><th>Vuelo Sal.</th><th>Fecha Sal.</th><th>Hora Sal.</th><th class="col-destino">Destino</th></tr></thead><tbody>`;
    flights.forEach((flight, index) => {
    const airlineName = flight.aerolinea || '-';
    const positionDisplay = normalizePositionValue(flight.posicion || flight.posición || flight.stand || '');
    const positionCell = positionDisplay || '-';
    const cands = getAirlineLogoCandidates(airlineName);
    const logoPath = cands[0];
    const dataCands = cands.join('|');
    const sizeClass = getLogoSizeClass(airlineName, 'table');
    const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${airlineName}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">` : '';
        const rowColor = (airlineColors[flight.aerolinea] || '#ccc');
        tableHtml += `<tr class="animated-row" style="--delay: ${index * 0.08}s; --airline-color: ${rowColor};">
            <td><div class="airline-cell">${logoHtml}<span class="airline-name">${airlineName}</span></div></td>
            <td>${flight.aeronave || '-'}</td>
            <td>${flight.vuelo_llegada || '-'}</td>
            <td>${flight.fecha_llegada || '-'}</td>
            <td>${flight.hora_llegada || '-'}</td>
            <td class="col-origen">${flight.origen || '-'}</td>
            <td>${positionCell}</td>
            <td>${flight.vuelo_salida || '-'}</td>
            <td>${flight.fecha_salida || '-'}</td>
            <td>${flight.hora_salida || '-'}</td>
            <td class="col-destino">${flight.destino || '-'}</td>
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
    // Habilitar arrastre horizontal sobre la propia tabla
    try { enableTwoAxisTableScroll('cargo-itinerary-scroll', 'cargo-itinerary-container'); } catch(_) {}
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
    if (action === 'logout') { performLogout(); return; }
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
        if (section === 'operaciones-totales') { 
            try { 
                updateOpsSummary(); 
                renderOperacionesTotales(); 
                // Detectar errores en gráficas después de un momento
                setTimeout(detectChartErrors, 500);
            } catch(_) {} 
        }
        else { try { stopOpsAnim(); } catch(_) {} }
        if (section === 'itinerario') { 
            try { 
                if (typeof window.renderItineraryCharts === 'function') {
                    setTimeout(() => window.renderItineraryCharts(), 50);
                }
                setTimeout(detectChartErrors, 500);
            } catch(_) {} 
        }
        if (section === 'demoras') { 
            try { 
                setTimeout(()=>{
                    renderDemoras();
                    setTimeout(detectChartErrors, 500);
                }, 50); 
            } catch(_) {} 
        }
        if (section === 'fauna') {
            try {
                // Give the layout a moment before rendering charts
                setTimeout(() => {
                    if (typeof window.dispatchEvent === 'function') {
                        // Let fauna.js listen for this to re-render if needed
                        const ev = new Event('fauna:visible');
                        window.dispatchEvent(ev);
                    }
                }, 60);
            } catch(_) {}
        }
    }
}

// Logout centralizado
function performLogout(){
    try { sessionStorage.removeItem('currentUser'); } catch(_) {}
    try { sessionStorage.removeItem('aifa.user'); } catch(_) {}
    const mainApp = document.getElementById('main-app');
    const login = document.getElementById('login-screen');
    if (mainApp) mainApp.classList.add('hidden');
    if (login) login.classList.remove('hidden');
    const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = '';
    // cerrar sidebar/overlay si estuvieran abiertos
    try {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('visible');
        if (overlay) overlay.classList.remove('active');
    } catch(_) {}
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
function drawLineChart(canvasId, labels, values, opts){
    const c = document.getElementById(canvasId); if (!c) return;
    const dpr=window.devicePixelRatio||1; const w=c.clientWidth||640, h=c.clientHeight||380;
    c.width=Math.max(1,Math.floor(w*dpr)); c.height=Math.max(1,Math.floor(h*dpr));
    const g=c.getContext('2d'); if (!g) return; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
    const title = opts?.title || ''; const color = opts?.color || '#1e88e5'; const fillColor = opts?.fillColor || 'rgba(30,136,229,0.15)'; const xTitle = opts?.xTitle || ''; const yTitle = opts?.yTitle || '';
    const margin = { top: 48, right: 16, bottom: 32, left: 44 };
    const innerW = Math.max(1,w-margin.left-margin.right), innerH = Math.max(1,h-margin.top-margin.bottom);
    const x0 = margin.left, y0=h-margin.bottom;
    // Título
    if (title){ g.fillStyle='#495057'; g.font='600 14px Roboto, Arial'; g.textAlign='left'; g.textBaseline='top'; g.fillText(title, margin.left, 10); }
    // Escalas
    const maxV = Math.max(0, ...values); const nice = (function(m){ if(m<=5) return 5; if(m<=10) return 10; if(m<=20) return 20; if(m<=50) return 50; if(m<=100) return 100; const p=Math.pow(10, Math.floor(Math.log10(m))); return Math.ceil(m/p)*p; })(maxV);
    // Ejes y grid
    g.strokeStyle='rgba(0,0,0,0.2)'; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0+innerW,y0); g.moveTo(x0,y0); g.lineTo(x0,y0-innerH); g.stroke();
    // Grid Y
    g.font='10px Roboto, Arial'; g.textAlign='right'; g.textBaseline='middle'; g.fillStyle='#6c757d';
    const tickCount=4; const step=nice/tickCount;
    for(let i=0;i<=tickCount;i++){ const v=i*step; const y=y0-(v/nice)*innerH; g.strokeStyle='rgba(0,0,0,0.06)'; g.beginPath(); g.moveTo(x0,y); g.lineTo(x0+innerW,y); g.stroke(); g.fillText(String(Math.round(v)), x0-6, y); }
    // Eje X labels
    g.textAlign='center'; g.textBaseline='top';
    const n=labels.length; const stepX = innerW/(Math.max(1,n-1));
    const labelEvery = n>12 ? Math.ceil(n/12) : 1;
    for(let i=0;i<n;i+=labelEvery){ const x = x0 + i*stepX; g.fillStyle='#6c757d'; g.fillText(labels[i], x, y0+6); }
    // Serie
    const points = values.map((v,i)=>({ x: x0 + i*stepX, y: y0 - ( (v/nice)*innerH ) }));
    // Área
    g.beginPath(); g.moveTo(points[0]?.x||x0, y0); points.forEach(p=> g.lineTo(p.x,p.y)); g.lineTo(points[points.length-1]?.x||x0, y0); g.closePath(); g.fillStyle=fillColor; g.fill();
    // Línea
    g.beginPath(); points.forEach((p,i)=>{ if(i===0) g.moveTo(p.x,p.y); else g.lineTo(p.x,p.y); }); g.strokeStyle=color; g.lineWidth=2; g.stroke();
    // Puntos
    g.fillStyle=color; points.forEach(p=>{ g.beginPath(); g.arc(p.x,p.y,2.5,0,Math.PI*2); g.fill(); });
    // Títulos de ejes
    if (yTitle){ g.save(); g.translate(12, margin.top + innerH/2); g.rotate(-Math.PI/2); g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#495057'; g.font='600 12px Roboto, Arial'; g.fillText(yTitle, 0, 0); g.restore(); }
    if (xTitle){ g.fillStyle='#495057'; g.font='600 12px Roboto, Arial'; g.textAlign='center'; g.textBaseline='top'; g.fillText(xTitle, x0 + innerW/2, h-16); }
}
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

// Función global para reinicializar todas las gráficas cuando fallan
function resetAllCharts() {
    const btn = document.getElementById('charts-reset-btn');
    let originalHTML = '';
    
    try {
        console.log('🔄 REINICIALIZACIÓN COMPLETA DE GRÁFICAS...');
        
        // Mostrar indicador de carga
        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i><span class="d-none d-md-inline">Reiniciando...</span>';
            btn.disabled = true;
        }
        
        // FASE 1: DESTRUCCIÓN COMPLETA
        console.log('🗑️ FASE 1: Destrucción completa de gráficas...');
        
        // Destruir gráficas de Operaciones Totales
        destroyOpsCharts();
        
        // Destruir gráficas de Itinerario
        if (window.destroyItinerarioCharts && typeof window.destroyItinerarioCharts === 'function') {
            window.destroyItinerarioCharts();
        }
        
        // Destruir todas las instancias de Chart.js globalmente
        if (window.Chart && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try { chart.destroy(); } catch(_) {}
                }
            });
        }
        
        // Limpiar completamente window.opsCharts
        if (window.opsCharts) {
            Object.keys(window.opsCharts).forEach(key => {
                try { 
                    if (window.opsCharts[key] && typeof window.opsCharts[key].destroy === 'function') {
                        window.opsCharts[key].destroy(); 
                    }
                    delete window.opsCharts[key];
                } catch(_) {}
            });
        }
        
        // Limpiar animaciones pendientes
        stopOpsAnim();
        
        // FASE 2: LIMPIEZA DE CANVAS
        console.log('🧹 FASE 2: Limpieza de canvas...');
        const canvasIds = [
            'commercial-ops-chart', 'commercial-pax-chart',
            'cargo-ops-chart', 'cargo-tons-chart', 
            'general-ops-chart', 'general-pax-chart',
            'paxArrivalsChart', 'paxDeparturesChart', 
            'cargoArrivalsChart', 'cargoDeparturesChart',
            'delaysPieChart'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                // Limpiar completamente el canvas
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Resetear dimensiones del canvas
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                
                // Remover cualquier referencia de Chart.js
                if (canvas.chart) {
                    delete canvas.chart;
                }
            }
        });
        
        // FASE 3: RECREACIÓN COMPLETA
        console.log('🏗️ FASE 3: Esperando para recreación completa...');
        
        setTimeout(() => {
            try {
                const activeSection = document.querySelector('.content-section.active');
                console.log('Sección activa detectada:', activeSection?.id);
                
                if (!activeSection) {
                    throw new Error('No se detectó sección activa');
                }
                
                const sectionId = activeSection.id.replace('-section', '');
                console.log(`🔨 Recreando gráficas para sección: ${sectionId}`);
                
                // Recrear según la sección activa
                if (sectionId === 'operaciones-totales') {
                    console.log('📊 Recreando Operaciones Totales...');
                    
                    // Forzar re-carga completa de datos y gráficas
                    try {
                        updateOpsSummary();
                    } catch (e) {
                        console.warn('Error en updateOpsSummary:', e);
                    }
                    
                    try {
                        renderOperacionesTotales();
                    } catch (e) {
                        console.error('Error en renderOperacionesTotales:', e);
                        throw e;
                    }
                    
                } else if (sectionId === 'itinerario') {
                    console.log('📈 Recreando Itinerario...');
                    
                    if (window.renderItineraryCharts && typeof window.renderItineraryCharts === 'function') {
                        try {
                            // Forzar re-carga de datos del itinerario
                            window.renderItineraryCharts();
                        } catch (e) {
                            console.error('Error en renderItineraryCharts:', e);
                            throw e;
                        }
                    } else {
                        throw new Error('Función renderItineraryCharts no disponible');
                    }
                    
                } else if (sectionId === 'demoras') {
                    console.log('🕒 Recreando Demoras...');
                    
                    if (window.renderDemoras && typeof window.renderDemoras === 'function') {
                        try {
                            window.renderDemoras();
                        } catch (e) {
                            console.error('Error en renderDemoras:', e);
                            throw e;
                        }
                    } else {
                        throw new Error('Función renderDemoras no disponible');
                    }
                } else {
                    console.log(`ℹ️ Sección ${sectionId} no requiere gráficas especiales`);
                }
                
                // FASE 4: VERIFICACIÓN FINAL
                setTimeout(() => {
                    console.log('🔍 FASE 4: Verificación final...');
                    
                    // Verificar que las gráficas se crearon correctamente
                    const success = verifyChartsCreated(sectionId);
                    
                    if (success) {
                        console.log('✅ REINICIALIZACIÓN COMPLETA EXITOSA');
                        showNotification('Gráficas completamente reinicializadas', 'success');
                    } else {
                        console.warn('⚠️ Algunas gráficas no se crearon correctamente');
                        showNotification('Reinicialización parcial - algunas gráficas pueden tener problemas', 'warning');
                    }
                    
                    detectChartErrors();
                }, 800);
                
            } catch (error) {
                console.error('❌ ERROR EN RECREACIÓN:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                // Restaurar botón después de todo el proceso
                setTimeout(() => {
                    if (btn && originalHTML) {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    }
                }, 1000);
            }
        }, 500); // Aumentado el tiempo de espera
        
    } catch (error) {
        console.error('❌ ERROR CRÍTICO EN REINICIALIZACIÓN:', error);
        showNotification('Error crítico: ' + error.message, 'error');
        
        // Restaurar botón en caso de error inmediato
        if (btn && originalHTML) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const alertType = type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info';
    const notification = document.createElement('div');
    notification.className = `alert alert-${alertType} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 350px;';
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Detectar errores en gráficas y mostrar botón de reset automáticamente
function detectChartErrors() {
    const btn = document.getElementById('charts-reset-btn');
    if (!btn) return;
    
    try {
        const activeSection = document.querySelector('.content-section.active');
        if (!activeSection) {
            btn.style.display = 'none';
            return;
        }
        
        const sectionId = activeSection.id.replace('-section', '');
        let hasErrors = false;
        let errorInfo = '';
        
        console.log(`🔍 Detectando errores en sección: ${sectionId}`);
        
        if (sectionId === 'operaciones-totales') {
            const expectedCanvases = [
                'commercial-ops-chart', 'commercial-pax-chart',
                'cargo-ops-chart', 'cargo-tons-chart',
                'general-ops-chart', 'general-pax-chart'
            ];
            
            const missingCharts = [];
            expectedCanvases.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    missingCharts.push(`Canvas ${canvasId} no encontrado`);
                    hasErrors = true;
                } else if (!opsCharts[canvasId.replace('-chart', 'Chart')]) {
                    missingCharts.push(`Gráfica ${canvasId} no inicializada`);
                    hasErrors = true;
                }
            });
            
            if (missingCharts.length > 0) {
                errorInfo = `Operaciones: ${missingCharts.length} gráficas con problemas`;
            }
            
        } else if (sectionId === 'itinerario') {
            const expectedCanvases = [
                'paxArrivalsChart', 'paxDeparturesChart', 
                'cargoArrivalsChart', 'cargoDeparturesChart'
            ];
            
            const missingCharts = [];
            expectedCanvases.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    missingCharts.push(`Canvas ${canvasId} no encontrado`);
                    hasErrors = true;
                }
            });
            // Para Itinerario usamos renderizado por canvas personalizado; usamos una bandera global
            if (!window._itineraryChartsOk) {
                hasErrors = true;
                missingCharts.push('Gráficas de itinerario no dibujadas');
            }
            
            if (missingCharts.length > 0) {
                errorInfo = `Itinerario: ${missingCharts.length} gráficas con problemas`;
            }
            
        } else if (sectionId === 'demoras') {
            const canvas = document.getElementById('delaysPieChart');
            if (!canvas) {
                hasErrors = true;
                errorInfo = 'Demoras: Canvas no encontrado';
            } else if (!window._delaysPieDrawn) {
                hasErrors = true;
                errorInfo = 'Demoras: Gráfica no dibujada';
            }
        }
        
        // Mostrar/ocultar botón según el estado
        if (hasErrors) {
            btn.style.display = 'inline-block';
            btn.title = `Reinicializar gráficas - ${errorInfo}`;
            console.warn(`⚠️ ${errorInfo}`);
        } else {
            btn.style.display = 'none';
            console.log(`✅ Todas las gráficas de ${sectionId} están funcionando`);
        }
        
    } catch (error) {
        console.error('Error en detectChartErrors:', error);
        // En caso de error, mostrar el botón por seguridad
        btn.style.display = 'inline-block';
        btn.title = 'Reinicializar gráficas - Error de detección';
    }
}
function renderOperacionesTotales() {
    try {
        const theme = getChartColors();
        const aifa = window.AIFA || {};
        const formatCompact = aifa.formatCompact || ((value, kind = 'int') => {
            const num = Number(value || 0);
            const abs = Math.abs(num);
            if (kind === 'ton') {
                if (abs >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                const decimals = abs < 10 ? 2 : 1;
                return num.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
            }
            if (kind === 'pax' || kind === 'int') {
                if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
                if (abs >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                return Math.round(num).toLocaleString('es-MX');
            }
            return Math.round(num).toLocaleString('es-MX');
        });
        const formatFull = aifa.formatFull || ((value, kind = 'int') => {
            const num = Number(value || 0);
            if (kind === 'ton') {
                return num.toLocaleString('es-MX', { maximumFractionDigits: 3 });
            }
            return Math.round(num).toLocaleString('es-MX');
        });
        const hexToRgba = aifa.hexToRgba || ((hex, alpha = 1) => {
            try {
                const clean = (hex || '').toString().trim().replace('#', '');
                const r = parseInt(clean.slice(0, 2), 16) || 0;
                const g = parseInt(clean.slice(2, 4), 16) || 0;
                const b = parseInt(clean.slice(4, 6), 16) || 0;
                return `rgba(${r},${g},${b},${alpha})`;
            } catch (err) {
                return `rgba(0,0,0,${alpha})`;
            }
        });

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
                        const placed = [];
                        const offsetUp = Number(opts.offsetY || 40);
                        const defaultOffsetBelow = small ? 30 : 26;
                        const offsetBelow = Number(opts.offsetBelow || defaultOffsetBelow);

                        const intersects = (a, b) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

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
                            let x = p.x; let y = p.y - offsetUp; // por defecto arriba del punto
                            let rx = Math.round(x - w/2), ry = Math.round(y - h/2);
                            // Decidir ubicación arriba/abajo: evita encimado alternando cuando están muy cerca
                            let placeBelow = false;
                            if (area && ry < area.top + 2) {
                                placeBelow = true;
                            } else if (minGapX > 0 && (p.x - lastShownX) < minGapX) {
                                placeBelow = !lastPlacedBelow; // alternar
                            }
                            if (placeBelow) { y = p.y + offsetBelow; rx = Math.round(x - w/2); ry = Math.round(y - h/2); }
                            // Limitar horizontalmente dentro del área del gráfico
                            if (area) {
                                if (rx < area.left + 2) rx = Math.round(area.left + 2);
                                if (rx + w > area.right - 2) rx = Math.round(area.right - 2 - w);
                            }

                            // Evitar encimado mediante detección de colisiones con otras etiquetas colocadas
                            let rect = { x: rx, y: ry, w, h };
                            let tries = 0;
                            while (placed.some(r => intersects(r, rect)) && tries < 4) {
                                tries++;
                                if (tries === 1) {
                                    // primer intento: alternar arriba/abajo
                                    placeBelow = !placeBelow;
                                    y = placeBelow ? (p.y + offsetBelow) : (p.y - offsetUp);
                                } else if (tries === 2) {
                                    // segundo: pequeño empuje vertical adicional
                                    const bump = small ? 10 : 12;
                                    y += placeBelow ? bump : -bump;
                                } else if (tries === 3) {
                                    // tercero: pequeño corrimiento horizontal hacia la izquierda
                                    x -= Math.min(12, Math.max(0, x - (area ? area.left + 10 : 10)));
                                } else {
                                    // cuarto: corrimiento horizontal hacia la derecha si es posible
                                    x += 12;
                                }
                                rx = Math.round(x - w/2);
                                ry = Math.round(y - h/2);
                                if (area) {
                                    if (rx < area.left + 2) rx = Math.round(area.left + 2);
                                    if (rx + w > area.right - 2) rx = Math.round(area.right - 2 - w);
                                    if (ry < area.top + 2) ry = Math.round(area.top + 2);
                                    if (ry + h > area.bottom - 2) ry = Math.round(area.bottom - 2 - h);
                                }
                                rect = { x: rx, y: ry, w, h };
                            }
                            if (tries >= 4 && placed.some(r => intersects(r, rect))) {
                                // si no se pudo evitar encimado, omitir etiqueta para preservar claridad
                                continue;
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
                            placed.push(rect);
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
                // Responsivo por ancho del lienzo para móvil/tablet
                const w = (canvas && canvas.clientWidth) ? canvas.clientWidth : (canvas && canvas.width ? canvas.width : (window.innerWidth||1200));
                const isMobile = w < 576;
                const isTablet = !isMobile && w < 992;
                const isYearAxis = Array.isArray(labels) && labels.length>0 && labels.every(l => /^\d{4}$/.test(String(l)));
                const steps = Math.max(1, (labels && labels.length ? labels.length - 1 : 1));
                const approxStep = Math.max(1, (w - 60)) / steps;
                const dynMinGapX = Math.max(isMobile ? approxStep * 0.7 : (isTablet ? approxStep * 0.55 : approxStep * 0.45), smallMode ? 28 : 16);
                const dynOffsetY = isMobile ? 28 : (isTablet ? 34 : 40);
                const dynOffsetBelow = isMobile ? 22 : 26;
                const xTickFont = isMobile ? 10 : (isTablet ? 11 : 12);
                const yTickFont = isMobile ? 10 : (isTablet ? 11 : 12);
                const maxTicks = isMobile ? 6 : (isTablet ? 8 : 12);
                let padTop = isMobile ? 48 : (isTablet ? 56 : 64);
                const padRight = isMobile ? 12 : 14;
                // Dar un poco más de margen inferior en móviles para no recortar etiquetas
                let padBottom = isMobile ? 24 : 20;
                const padLeft = isMobile ? 8 : 10;

                // En ejes de años queremos asegurar visibilidad de TODAS las etiquetas y sus datalabels
                if (isYearAxis) {
                    padTop += isMobile ? 16 : 12;     // más espacio arriba para burbujas
                    padBottom += isMobile ? 10 : 6;  // y algo más abajo para evitar recortes
                }

                // Opciones específicas para las burbujas en ejes de años (4-5 puntos)
                const bubbleOpts = {
                    show: true,
                    borderColor: border,
                    fillColor: border,
                    textColor: '#ffffff',
                    format: fmtType,
                    // En ejes anuales mostramos todo: sin gap mínimo para no omitir 2023
                    minGapX: isYearAxis ? 0 : Math.floor(dynMinGapX),
                    // Burbuja compacta para reducir colisiones en pantallas pequeñas
                    small: isYearAxis ? true : smallMode,
                    // Offsets afinados para móvil
                    offsetY: isYearAxis ? (isMobile ? 44 : 40) : dynOffsetY,
                    offsetBelow: isYearAxis ? (isMobile ? 28 : 26) : dynOffsetBelow,
                    onlyMax: false
                };

                // Plugin ligero para dar un extra de alto a la escala X en ejes anuales y evitar cortes
                const YearAxisFitPlugin = isYearAxis ? {
                    id: 'yearAxisFit',
                    afterFit(scale) {
                        try {
                            if (scale && scale.isHorizontal && scale.isHorizontal()) {
                                scale.height += isMobile ? 10 : 6;
                            }
                        } catch(_) {}
                    }
                } : null;
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
                        layout: { padding: { top: padTop, right: padRight, bottom: padBottom, left: padLeft } },
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
                            // Desactivamos completamente chartjs-plugin-datalabels
                            datalabels: false,
                            travelerPlugin: traveler || {},
                            dataBubble: bubbleOpts
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                offset: false,
                                ticks: {
                                    color: theme.ticks,
                                    // Para ejes con años (2022, 2023, ...), no omitir etiquetas en móvil
                                    autoSkip: !isYearAxis,
                                    maxTicksLimit: isYearAxis ? (labels?.length || maxTicks) : maxTicks,
                                    autoSkipPadding: isYearAxis ? 0 : undefined,
                                    source: 'labels',
                                    font: { size: xTickFont },
                                    minRotation: 0,
                                    maxRotation: isYearAxis ? 0 : (isMobile ? 30 : 0)
                                },
                                title: { display: true, text: xTitle, color: theme.labels, font: { weight: '600' } }
                            },
                            y: { beginAtZero: true, suggestedMax: Math.ceil(maxVal * 1.15), grid: { color: theme.grid }, ticks: { color: theme.ticks, font: { size: yTickFont } }, title: { display: true, text: label, color: theme.labels, font: { weight: '600' } } }
                        }
                    },
                    plugins: [PeakGlowPlugin, TravelerPlugin, DataBubblePlugin].concat(YearAxisFitPlugin ? [YearAxisFitPlugin] : [])
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
    
    // Detectar errores después de renderizar
    setTimeout(detectChartErrors, 300);
}

// Exponer función globalmente para reinicialización
window.renderOperacionesTotales = renderOperacionesTotales;

function updateOpsSummary() {
    try {
        const container = document.getElementById('ops-summary');
        if (!container) return;

        const fmtInt = (value) => Number(value || 0).toLocaleString('es-MX');
        const fmtTon = (value) => Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const makeCard = (iconClass, label, value, subLabel, extraClasses = []) => {
            const classes = ['ops-summary-pill', ...extraClasses.filter(Boolean)].join(' ');
            return `
            <div class="${classes}" role="group" aria-label="${label}">
                <span class="pill-icon"><i class="${iconClass}" aria-hidden="true"></i></span>
                <div class="pill-text">
                    <span class="pill-label">${label}</span>
                    <span class="pill-value">${value}</span>
                    ${subLabel ? `<span class="pill-sub">${subLabel}</span>` : ''}
                </div>
            </div>`;
        };

        let headerMarkup = '';
        let captionMarkup = '';
        let cards = [];

        if (!opsUIState.monthly2025) {
            const yData = staticData.operacionesTotales;
            const years = Array.from(opsUIState.years).sort();
            if (!years.length) {
                container.innerHTML = '<div class="ops-summary-empty text-muted">Selecciona al menos un año para ver el resumen.</div>';
                return;
            }
            const lastYear = years.includes('2025') ? '2025' : years[years.length - 1];
            const commercial = yData.comercial.find(d => String(d.periodo) === String(lastYear)) || {};
            const cargo = yData.carga.find(d => String(d.periodo) === String(lastYear)) || {};
            const general = yData.general.find(d => String(d.periodo) === String(lastYear)) || {};

            headerMarkup = `<span class="ops-summary-chip"><i class="fas fa-calendar-alt me-2" aria-hidden="true"></i>Año ${lastYear}</span>`;
            captionMarkup = `<span class="ops-summary-caption"><i class="fas fa-chart-line me-1" aria-hidden="true"></i>Periodos seleccionados: ${years.join(' · ')}</span>`;
            cards = [
                makeCard('fas fa-plane-departure', 'Comercial', fmtInt(commercial.operaciones || 0), 'Operaciones', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-user-friends', 'Comercial', fmtInt(commercial.pasajeros || 0), 'Pasajeros', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-passengers']),
                makeCard('fas fa-box-open', 'Carga', fmtInt(cargo.operaciones || 0), 'Operaciones', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-weight-hanging', 'Carga', fmtTon(cargo.toneladas || 0), 'Toneladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ton']),
                makeCard('fas fa-paper-plane', 'General', fmtInt(general.operaciones || 0), 'Operaciones', ['ops-summary-pill--general', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-user-check', 'General', fmtInt(general.pasajeros || 0), 'Pasajeros', ['ops-summary-pill--general', 'ops-summary-pill--metric-passengers'])
            ];
        } else {
            const monthly = staticData.mensual2025;
            const months = Array.from(opsUIState.months2025).sort();
            if (!months.length) {
                container.innerHTML = '<div class="ops-summary-empty text-muted">Selecciona al menos un mes de 2025 para ver el resumen.</div>';
                return;
            }
            const sum = (arr, key) => arr.filter(item => months.includes(item.mes)).reduce((acc, item) => acc + (Number(item[key] || 0)), 0);
            const commercialOps = sum(monthly.comercial, 'operaciones');
            const commercialPax = sum(monthly.comercialPasajeros, 'pasajeros');
            const cargoOps = sum(monthly.carga, 'operaciones');
            const cargoTon = sum(monthly.cargaToneladas, 'toneladas');
            const generalOps = sum(monthly.general.operaciones, 'operaciones');
            const generalPax = sum(monthly.general.pasajeros, 'pasajeros');

            const monthLabels = months.map(code => {
                const source = monthly.comercial.find(entry => entry.mes === code) || monthly.carga.find(entry => entry.mes === code) || {};
                return source.label || code;
            });
            const listPreview = monthLabels.slice(0, 4).join(', ');
            const extraCount = monthLabels.length - 4;
            const extraLabel = extraCount > 0 ? ` y +${extraCount}` : '';

            headerMarkup = `<span class="ops-summary-chip"><i class="fas fa-calendar-week me-2" aria-hidden="true"></i>2025 · ${months.length} ${months.length === 1 ? 'mes' : 'meses'}</span>`;
            captionMarkup = `<span class="ops-summary-caption"><i class="fas fa-layer-group me-1" aria-hidden="true"></i>Meses seleccionados: ${listPreview || months.join(', ')}${extraLabel}</span>`;
            cards = [
                makeCard('fas fa-plane-departure', 'Comercial', fmtInt(commercialOps), 'Operaciones acumuladas', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-user-friends', 'Comercial', fmtInt(commercialPax), 'Pasajeros acumulados', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-passengers']),
                makeCard('fas fa-box-open', 'Carga', fmtInt(cargoOps), 'Operaciones acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-weight-hanging', 'Carga', fmtTon(cargoTon), 'Toneladas acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ton']),
                makeCard('fas fa-paper-plane', 'General', fmtInt(generalOps), 'Operaciones acumuladas', ['ops-summary-pill--general', 'ops-summary-pill--metric-ops']),
                makeCard('fas fa-user-check', 'General', fmtInt(generalPax), 'Pasajeros acumulados', ['ops-summary-pill--general', 'ops-summary-pill--metric-passengers'])
            ];
        }

        container.innerHTML = `
            <div class="ops-summary-wrapper">
                ${headerMarkup}
                ${captionMarkup}
                <div class="ops-summary-grid">
                    ${cards.join('')}
                </div>
            </div>
        `;
    } catch (e) { /* ignore */ }
}

// Exponer función globalmente para reinicialización
window.updateOpsSummary = updateOpsSummary;

// Función para verificar que las gráficas se crearon correctamente
function verifyChartsCreated(sectionId) {
    console.log(`🔍 Verificando gráficas de sección: ${sectionId}`);
    
    if (sectionId === 'operaciones-totales') {
        const expectedCharts = [
            'commercialOpsChart', 'commercialPaxChart',
            'cargoOpsChart', 'cargoTonsChart',
            'generalOpsChart', 'generalPaxChart'
        ];
        
        let createdCount = 0;
        expectedCharts.forEach(chartKey => {
            if (opsCharts[chartKey] && opsCharts[chartKey].data) {
                createdCount++;
                console.log(`✅ ${chartKey} creado correctamente`);
            } else {
                console.warn(`❌ ${chartKey} NO se creó`);
            }
        });
        
        return createdCount === expectedCharts.length;
        
    } else if (sectionId === 'itinerario') {
        const expectedCanvases = [
            'paxArrivalsChart', 'paxDeparturesChart',
            'cargoArrivalsChart', 'cargoDeparturesChart'
        ];
        
        let createdCount = 0;
        expectedCanvases.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            const chart = canvas ? Chart.getChart(canvas) : null;
            if (chart && chart.data) {
                createdCount++;
                console.log(`✅ ${canvasId} creado correctamente`);
            } else {
                console.warn(`❌ ${canvasId} NO se creó`);
            }
        });
        
        return createdCount === expectedCanvases.length;
        
    } else if (sectionId === 'demoras') {
        const hasChart = window.opsCharts && window.opsCharts.delaysPieChart;
        if (hasChart) {
            console.log(`✅ delaysPieChart creado correctamente`);
        } else {
            console.warn(`❌ delaysPieChart NO se creó`);
        }
        return hasChart;
    }
    
    return true; // Para otras secciones sin gráficas específicas
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

// Permitir que el arrastre horizontal sobre la tabla (área de scroll vertical) mueva el scroll horizontal exterior
function enableTwoAxisTableScroll(hAreaId, tableContainerId) {
    try {
        const hArea = document.getElementById(hAreaId);
        const container = document.getElementById(tableContainerId);
        if (!hArea || !container) return;
        const vScroll = container.querySelector('.vertical-scroll');
        if (!vScroll || vScroll._twoAxisWired) return;
        vScroll._twoAxisWired = true;

        let startX = 0, startY = 0, lastX = 0, deciding = true, horiz = false;

        const onStart = (ev) => {
            try {
                const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
                startX = lastX = t.clientX; startY = t.clientY; deciding = true; horiz = false;
            } catch(_) {}
        };
        const onMove = (ev) => {
            try {
                const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
                const dx = t.clientX - lastX;
                const dy = t.clientY - startY; // respecto al inicio para decidir dirección
                if (deciding) {
                    if (Math.abs(dx) > Math.abs(dy) + 4) { horiz = true; deciding = false; }
                    else if (Math.abs(dy) > Math.abs(dx) + 4) { horiz = false; deciding = false; }
                }
                if (horiz) {
                    // mover scroll horizontal exterior y evitar scroll vertical cuando estamos en modo horizontal
                    ev.preventDefault();
                    hArea.scrollLeft -= dx;
                    lastX = t.clientX;
                    try { updateScrollControlsFor(hAreaId); } catch(_) {}
                }
            } catch(_) {}
        };
        const onEnd = () => { deciding = true; horiz = false; };

        vScroll.addEventListener('touchstart', onStart, { passive: true });
        vScroll.addEventListener('touchmove', onMove, { passive: false });
        vScroll.addEventListener('touchend', onEnd, { passive: true });
        vScroll.addEventListener('touchcancel', onEnd, { passive: true });
    } catch(_) {}
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

// Login sky animation (dawn / day / dusk / night)
const LOGIN_SKY_STATE_CLASSES = ['night','dawn','day','dusk'];
const LOGIN_PLANE_REFRESH_MS = 45000;
let loginSkyCurrentState = null;
let loginSkyIntervalId = null;
let loginPlaneProfileTimer = null;

function getLoginSkyState(now = new Date()) {
    try {
        const hours = now.getHours() + (now.getMinutes() / 60);
        if (hours >= 5 && hours < 7) return 'dawn';
        if (hours >= 7 && hours < 18) return 'day';
        if (hours >= 18 && hours < 20) return 'dusk';
        return 'night';
    } catch (_) {
        return 'day';
    }
}

function initLoginSkyScene() {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky || sky.dataset.sceneReady) return;
        sky.dataset.sceneReady = '1';

        const overlay = document.querySelector('.login-overlay');
        const logoSrc = 'images/aifa-logo.png';
        if (overlay && !overlay.querySelector('.sky-top-logo')) {
            const overlayLogo = document.createElement('img');
            overlayLogo.src = logoSrc;
            overlayLogo.alt = 'Aeropuerto Internacional Felipe Ángeles';
            overlayLogo.className = 'sky-top-logo';
            overlayLogo.setAttribute('aria-hidden', 'true');
            overlay.appendChild(overlayLogo);
        }
        if (!sky.querySelector('.sun')) {
            const sun = document.createElement('div');
            sun.className = 'sun';
            sun.setAttribute('aria-hidden', 'true');
            sky.appendChild(sun);
        }
        if (!sky.querySelector('.moon')) {
            const moon = document.createElement('div');
            moon.className = 'moon';
            moon.setAttribute('aria-hidden', 'true');
            sky.appendChild(moon);
        }

        if (!sky.dataset.stars) {
            const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const starLimit = reduceMotion ? 20 : (window.matchMedia && window.matchMedia('(max-width: 480px)').matches ? 28 : 40);
            for (let i = 0; i < starLimit; i++) {
                const star = document.createElement('span');
                star.className = 'star' + (Math.random() > 0.78 ? ' big' : '');
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 60}%`;
                star.style.setProperty('--tw', `${2.8 + Math.random() * 2.6}s`);
                star.style.setProperty('--td', `${Math.random() * 6}s`);
                star.setAttribute('aria-hidden', 'true');
                sky.appendChild(star);
            }
            sky.dataset.stars = '1';
        }

        if (!sky.dataset.clouds) {
            const cloudConfigs = [
                { top: '8vh', dur: 72, delay: -12, y: '-8vh' },
                { top: '20vh', dur: 68, delay: -4, y: '-3vh' },
                { top: '34vh', dur: 82, delay: -18, y: '1vh' },
                { top: '48vh', dur: 74, delay: -26, y: '4vh' },
                { top: '60vh', dur: 88, delay: -6, y: '6vh' }
            ];
            cloudConfigs.forEach(cfg => {
                const cloud = document.createElement('div');
                cloud.className = 'cloud';
                cloud.style.top = cfg.top;
                cloud.style.setProperty('--dur', `${cfg.dur}s`);
                cloud.style.setProperty('--delay', `${cfg.delay}s`);
                cloud.style.setProperty('--y', cfg.y);
                cloud.setAttribute('aria-hidden', 'true');
                sky.appendChild(cloud);
            });
            sky.dataset.clouds = '1';
        }

        if (!sky.dataset.lights) {
            const lights = document.createElement('div');
            lights.className = 'airport-lights';
            lights.setAttribute('aria-hidden', 'true');
            const palette = ['ap-yellow', 'ap-blue', 'ap-green'];
            const total = 18;
            for (let i = 0; i < total; i++) {
                const light = document.createElement('span');
                light.className = `ap-light ${palette[i % palette.length]}`;
                light.style.left = `${-5 + Math.random() * 110}%`;
                light.style.setProperty('--d', `${Math.random() * 4}s`);
                light.style.setProperty('--s', (0.8 + Math.random() * 0.8).toFixed(2));
                light.setAttribute('aria-hidden', 'true');
                lights.appendChild(light);
            }
            sky.appendChild(lights);
            sky.dataset.lights = '1';
        }

        if (!sky.dataset.planes) {
            const planeConfigs = [
                { depth: 'far', top: '28vh', flight: 38, delay: -16, scale: 0.8, tilt: 6, y: -6, bob: 9 },
                { depth: 'mid', top: '42vh', flight: 26, delay: -8, scale: 1, tilt: 8, y: -1, bob: 7 },
                { depth: 'near', top: '58vh', flight: 32, delay: -4, scale: 1.16, tilt: 10, y: 1, bob: 6 },
                { depth: 'mid', top: '34vh', flight: 30, delay: -22, scale: 0.92, tilt: 7, y: -4, bob: 8, reverse: true }
            ];
            planeConfigs.forEach(cfg => {
                const plane = document.createElement('div');
                plane.className = 'plane';
                plane.classList.add(cfg.depth || 'mid');
                if (cfg.reverse) plane.classList.add('reverse');
                plane.setAttribute('aria-hidden', 'true');
                plane.style.top = cfg.top;
                if (typeof cfg.scale === 'number') plane.style.setProperty('--scale', String(cfg.scale));

                const osc = document.createElement('span');
                osc.className = 'osc';
                const iconWrap = document.createElement('span');
                iconWrap.className = 'icon';
                const icon = document.createElement('i');
                icon.className = 'fas fa-plane';
                icon.setAttribute('aria-hidden', 'true');
                iconWrap.appendChild(icon);
                osc.appendChild(iconWrap);

                const trail = document.createElement('span');
                trail.className = 'trail';
                trail.setAttribute('aria-hidden', 'true');
                osc.appendChild(trail);

                plane.appendChild(osc);
                ['nav-red','nav-green','beacon','strobe','landing'].forEach(cls => {
                    const light = document.createElement('span');
                    light.className = `light ${cls}`;
                    light.setAttribute('aria-hidden', 'true');
                    plane.appendChild(light);
                });

                plane.dataset.baseFlight = String(cfg.flight);
                plane.dataset.baseDelay = String(cfg.delay);
                plane.dataset.baseTilt = String(cfg.tilt);
                plane.dataset.baseY = String(cfg.y ?? 0);
                plane.dataset.baseBob = String(cfg.bob ?? 7);

                applyPlaneFlightProfile(plane);
                sky.appendChild(plane);
            });
            sky.dataset.planes = '1';
            if (!loginPlaneProfileTimer) {
                loginPlaneProfileTimer = window.setInterval(refreshPlaneFlightProfiles, LOGIN_PLANE_REFRESH_MS);
            }
        }
    } catch (e) {
        console.warn('initLoginSkyScene error:', e);
    }
}

function applyLoginSkyState(state) {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky) return;
        LOGIN_SKY_STATE_CLASSES.forEach(cls => {
            sky.classList.toggle(cls, cls === state);
        });
        const overlay = document.querySelector('.login-overlay');
        if (overlay) {
            LOGIN_SKY_STATE_CLASSES.forEach(cls => {
                overlay.classList.toggle(cls, cls === state);
            });
        }
    } catch (e) {
        console.warn('applyLoginSkyState error:', e);
    }
}

function updateLoginSkyScene(force = false) {
    try {
        const nextState = getLoginSkyState();
        if (!force && nextState === loginSkyCurrentState) return;
        applyLoginSkyState(nextState);
        loginSkyCurrentState = nextState;
    } catch (e) {
        console.warn('updateLoginSkyScene error:', e);
    }
}

function applyPlaneFlightProfile(plane) {
    try {
        const baseFlight = parseFloat(plane.dataset.baseFlight) || 30;
        const baseDelay = parseFloat(plane.dataset.baseDelay) || 0;
        const baseTilt = parseFloat(plane.dataset.baseTilt) || 6;
        const baseY = parseFloat(plane.dataset.baseY) || 0;
        const baseBob = parseFloat(plane.dataset.baseBob) || 7;

        const speedFactor = 0.85 + Math.random() * 0.3; // velocidades distintas 
        const delayJitter = (Math.random() * 6) - 3; // evita trenes equiespaciados
        const crosswind = (Math.random() * 2 - 1) * 0.6; // ligera variación en el bamboleo
        const verticalDrift = baseY + (Math.random() * 1.6 - 0.8); // altitud relativa
        const tiltDrift = baseTilt + (Math.random() * 1.8 - 0.9); // nariz leve arriba/abajo

        plane.style.setProperty('--flight', `${(baseFlight * speedFactor).toFixed(1)}s`);
        plane.style.setProperty('--delay', `${(baseDelay + delayJitter).toFixed(1)}s`);
        plane.style.setProperty('--tilt', `${tiltDrift.toFixed(1)}deg`);
        plane.style.setProperty('--y', `${verticalDrift.toFixed(1)}vh`);
        plane.style.setProperty('--bobTime', `${Math.max(4.5, baseBob + crosswind).toFixed(1)}s`);
    } catch (e) {
        console.warn('applyPlaneFlightProfile error:', e);
    }
}

function refreshPlaneFlightProfiles() {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky) return;
        sky.querySelectorAll('.plane').forEach(applyPlaneFlightProfile);
    } catch (e) {
        console.warn('refreshPlaneFlightProfiles error:', e);
    }
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateLoginSkyScene(true);
        refreshPlaneFlightProfiles();
    }
});

// Sesión y login
function showMainApp() {
    const login = document.getElementById('login-screen');
    const main = document.getElementById('main-app');
    // Validar sesión firmada
    const token = sessionStorage.getItem(SESSION_TOKEN);
    const name = sessionStorage.getItem(SESSION_USER) || '';
    // Si no hay token válido, volver a login
    verifyToken(token).then(valid => {
        if (!valid) {
            try { sessionStorage.removeItem(SESSION_USER); sessionStorage.removeItem(SESSION_TOKEN); } catch(_) {}
            if (main) main.classList.add('hidden');
            if (login) login.classList.remove('hidden');
            return;
        }
        if (login) login.classList.add('hidden');
        if (main) main.classList.remove('hidden');
        // Usuario actual
        const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = name;
        // Permisos: Itinerario mensual
        const menu = document.getElementById('itinerario-mensual-menu');
        if (menu) {
            const u = dashboardData.users[name];
            const can = !!(u && u.canViewItinerarioMensual);
            menu.style.display = can ? '' : 'none';
        }
    }).catch(()=>{
        if (main) main.classList.add('hidden');
        if (login) login.classList.remove('hidden');
    });
}

function checkSession() {
    try {
        const token = sessionStorage.getItem(SESSION_TOKEN);
        const name = sessionStorage.getItem(SESSION_USER);
        if (!token || !name) return;
        // Validar token antes de mostrar
        verifyToken(token).then(valid => { if (valid) showMainApp(); }).catch(()=>{});
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
        initLoginSkyScene();
        updateLoginSkyScene(true);
        if (!loginSkyIntervalId) {
            loginSkyIntervalId = window.setInterval(() => updateLoginSkyScene(), 60000);
        }
    } catch (_) {}
    try {
        // Inicializar hashes de autenticación lo antes posible
    ensureAuthHashes();
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

    // Cargar catálogo al entrar a la sección (solo cuando se sirve por http/https)
    if (location.protocol !== 'file:') {
        loadAirlinesCatalog();
        loadAircraftCatalog();
        loadAirportsCatalog();
    }

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

        // Autofill por Matrícula -> Equipo (Registration) y posible transportista via owner IATA
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
                // Equipo desde Aircraft Type -> preferir ICAO de 'aircraft type.csv', luego nombre, luego IATA type
                const t = typeByCode.get(rec.type);
                if (t){
                    const preferred = t.ICAO || t.Name || rec.type;
                    if (equipo) equipo.value = preferred;
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
                image: (function(){ try { const cv=document.getElementById('manifest-preview-canvas'); if (cv && !cv.classList.contains('d-none')) return cv.toDataURL('image/png'); const im=document.getElementById('manifest-preview'); return (im && !im.classList.contains('d-none')) ? (im.src||'') : ''; } catch(_){ return ''; } })()
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

        // Inicialización principal de la aplicación cuando el DOM está listo
        document.addEventListener('DOMContentLoaded', () => {
            try {
                setupEventListeners();
            } catch (err) {
                console.warn('setupEventListeners failed:', err);
            }

            try {
                animateLoginTitle();
            } catch (err) {
                console.warn('animateLoginTitle failed:', err);
            }

            try {
                initializeTheme();
                initializeSidebarState();
            } catch (err) {
                console.warn('Theme/sidebar init failed:', err);
            }

            try {
                updateDate();
                updateClock();
                setInterval(updateClock, 1000);
            } catch (err) {
                console.warn('Clock/date init failed:', err);
            }

            try {
                ensureAuthHashes();
            } catch (err) {
                console.warn('ensureAuthHashes eager init failed:', err);
            }

            try {
                loadItineraryData();
            } catch (err) {
                console.warn('loadItineraryData failed:', err);
            }

            try {
                createPdfSections();
            } catch (err) {
                console.warn('createPdfSections failed:', err);
            }

            try {
                checkSession();
            } catch (err) {
                console.warn('checkSession failed:', err);
            }
        });

