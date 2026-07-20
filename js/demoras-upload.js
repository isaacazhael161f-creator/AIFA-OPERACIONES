// ─── MÓDULO: IMPORTACIÓN DE DEMORAS DESDE XLSX ──────────────────────────────
// Solo accesible para roles: admin, superadmin, editor
// Detecta automáticamente la hoja de datos, mapea columnas y sube en lotes.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    const UPLOAD_ROLES  = ['admin', 'superadmin', 'editor'];
    const OPS_CACHE_PFX = 'aifa_ops_cache_';

    // Indicadores de columnas que siempre existen en la hoja de datos.
    // Se incluyen las variantes normalizadas en español, inglés simple y el
    // formato crudo del software del aeropuerto ([Arr]/[Dep]) para que la
    // detección de hoja funcione con cualquiera de ellos.
    const SHEET_SIGNATURE = [
        // Español (plantilla Demoras procesada)
        'aterrizaje_despegue', 'no_vuelo', 'hora_programada',
        // Inglés simple
        'landing_takeoff', 'flight_no', 'scheduled_time',
        // Export crudo del software del aeropuerto — Llegadas
        'arr_flight_designator', 'arr_airline_code', 'arr_aldt',
        // Export crudo del software del aeropuerto — Salidas
        'dep_flight_designator', 'dep_airline_code', 'dep_atot'
    ];

    // Columnas de la tabla Demoras (nombre normalizado) que almacenan fechas/horas.
    // Se detecta sobre la columna DESTINO en la DB, por lo que aplica sin importar
    // si el encabezado de origen venía en español o inglés.
    const DB_DATE_COL_NORMS = new Set(['aterrizaje_despegue', 'hora_programada', 'hora_actual']);

    // Alias explícitos: nombre normalizado del encabezado → nombre normalizado de la columna REAL en DB.
    // Los nombres normalizados destino coinciden EXACTAMENTE con las columnas reales de la tabla
    // Demoras (con espacios/acentos): "Código de Demora"→codigo_de_demora, "Tipo de Servicio"→tipo_de_servicio, etc.
    const EXCEL_TO_DB_ALIASES = {
        // ── Español (variantes de encabezado que difieren del nombre real) ─────
        'domestico_internacional': 'domestic_international', // "Doméstico/Internacional" → Domestic/International
        'no_de_av':                'tipo_de_avion',          // "No. de Av." → Tipo de Avión

        // ── Inglés simple ─────────────────────────────────────────────────────
        'landing_takeoff':         'aterrizaje_despegue',    // "Landing/Takeoff" → Aterrizaje/Despegue
        'airline':                 'aerolinea',              // "Airline" → Aerolínea
        'aircraft_type':           'tipo_de_avion',          // "Aircraft Type" → Tipo de Avión
        'aircraft':                'tipo_de_avion',          // "Aircraft" → Tipo de Avión
        'registration':            'matricula',              // "Registration" → Matrícula
        'tail_number':             'matricula',              // "Tail Number" → Matrícula
        'flight_no':               'no_vuelo',               // "Flight No" → No. Vuelo
        'flight_number':           'no_vuelo',               // "Flight Number" → No. Vuelo
        'route':                   'ruta',                   // "Route" → Ruta
        'routing':                 'ruta',                   // "Routing" → Ruta
        'scheduled_time':          'hora_programada',        // "Scheduled Time" → Hora Programada
        'actual_time':             'hora_actual',            // "Actual Time" → Hora Actual
        'delay_time':              'tiempo_de_demora',       // "Delay Time" → Tiempo de Demora
        'delay_code':              'codigo_de_demora',       // "Delay Code" → Código de Demora
        'passengers':              'pasajeros',              // "Passengers" → Pasajeros
        'service_type':            'tipo_de_servicio',       // "Service Type" → Tipo de Servicio
        'reason':                  'motivo',                 // "Reason" → Motivo
        'status':                  'estatus',                // "Status" → Estatus
        'arrival_departure':       'llegada_salida',         // "Arrival/Departure" → Llegada/Salida
        'afac_aifa_code':          'codigo_de_afac_aifa',    // "AFAC/AIFA Code" → Código de AFAC/AIFA
        'service_totals':          'totales_servicio',       // "Service Totals" → Totales Servicio
        'delays':                  'demoras',                // "Delays" → Demoras
        'punctuality':             'puntualidad',            // "Punctuality" → Puntualidad
        'company_punctuality':     'puntualidad_compania',   // "Company Punctuality" → Puntualidad compañía
        'position':                'posicion',               // "Position" → Posicion
        'month':                   'mes',                    // "Month" → MES
        'year':                    'anio',                   // "Year" → ANIO

        // ── Export crudo del software del aeropuerto (LLEGADAS, prefijo [Arr]) ──
        'arr_aldt':                'aterrizaje_despegue',    // Actual Landing Time → Aterrizaje/Despegue
        'arr_airline_code':        'aerolinea',
        'arr_aircraft_type':       'tipo_de_avion',
        'arr_registration':        'matricula',
        'arr_flight_designator':   'no_vuelo',
        'arr_routing':             'ruta',
        'arr_sibt':                'hora_programada',        // Scheduled In-Block Time → Hora Programada
        'arr_aibt':                'hora_actual',            // Actual In-Block Time → Hora Actual
        'arr_efidl':               'tiempo_de_demora',       // Inbound delay → Tiempo de Demora
        'arr_delay_code':          'codigo_de_demora',
        'arr_boarded':             'pasajeros',
        'arr_security_level':      'domestic_international',  // DOMESTIC / INTERNATIONAL
        'arr_service_type':        'tipo_de_servicio',
        'arr_exemption_dom':       'motivo',
        'arr_stand':               'posicion',

        // ── Export crudo del software del aeropuerto (SALIDAS, prefijo [Dep]) ──
        'dep_atot':                'aterrizaje_despegue',    // Actual Take-Off Time → Aterrizaje/Despegue
        'dep_airline_code':        'aerolinea',
        'dep_aircraft_type':       'tipo_de_avion',
        'dep_registration':        'matricula',
        'dep_flight_designator':   'no_vuelo',
        'dep_routing':             'ruta',
        'dep_sobt':                'hora_programada',        // Scheduled Off-Block Time → Hora Programada
        'dep_aobt':                'hora_actual',            // Actual Off-Block Time → Hora Actual
        'dep_efidl':               'tiempo_de_demora',       // Outbound delay → Tiempo de Demora
        'dep_delay_code':          'codigo_de_demora',
        'dep_boarded':             'pasajeros',
        'dep_security_level':      'domestic_international',
        'dep_service_type':        'tipo_de_servicio',
        'dep_exemption_dom':       'motivo',
        'dep_stand':               'posicion',
    };

    // Nombres EXACTOS de las columnas en la tabla Demoras de Supabase (con espacios/acentos).
    // Se usa como fallback cuando la tabla está vacía y getDbColNames() retorna null.
    const DB_COL_EXACT = {
        'aterrizaje_despegue':     'Aterrizaje/Despegue',
        'aerolinea':               'Aerolínea',
        'tipo_de_avion':           'Tipo de Avión',
        'matricula':               'Matrícula',
        'no_vuelo':                'No. Vuelo',
        'ruta':                    'Ruta',
        'hora_programada':         'Hora Programada',
        'hora_actual':             'Hora Actual',
        'tiempo_de_demora':        'Tiempo de Demora',
        'codigo_de_demora':        'Código de Demora',
        'pasajeros':               'Pasajeros',
        'domestic_international':  'Domestic/International',
        'tipo_de_servicio':        'Tipo de Servicio',
        'motivo':                  'Motivo',
        'estatus':                 'Estatus',
        'llegada_salida':          'Llegada/Salida',
        'codigo_de_afac_aifa':     'Código de AFAC/AIFA',
        'servicio_llegada':        'Servicio llegada',
        'servicio_de_salida':      'Servicio de Salida',
        'totales_servicio':        'Totales Servicio',
        'demoras':                 'Demoras',
        'puntualidad':             'Puntualidad',
        'puntualidad_compania':    'Puntualidad compañía',
        'posicion':                'Posicion',
        'mes':                     'MES',
        'anio':                    'ANIO',
    };

    // Abreviaturas de mes en español → número (1-12)
    const MES_ABREV_MAP = {
        'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,
        'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12
    };

    // Abreviaturas de mes en inglés → índice 0-11 (para fechas "14FEB 19:05" del export del aeropuerto)
    const MONTH_ABBR_EN = {
        'jan':0,'feb':1,'mar':2,'apr':3,'may':4,'jun':5,
        'jul':6,'aug':7,'sep':8,'oct':9,'nov':10,'dec':11
    };

    // Año de contexto del archivo en curso (para completar fechas sin año, ej. "14FEB 19:05").
    let _importCtxYear = null;

    /**
     * Intenta extraer mes y año del nombre de la hoja.
     * Soporta: "ABR 2026", "ABRIL 2026", "04/2026", "4-2026", "2026-04".
     * Retorna { mes: Number, anio: Number } o null.
     */
    function mesAnioFromSheetName(name) {
        const n = String(name || '').trim();
        // Patrón: letras (nombre de mes) seguido de 4 dígitos (año), ej. "ABR 2026"
        const m1 = n.match(/([A-Za-záéíóúüñ]+)\s+(\d{4})/i);
        if (m1) {
            const abbr = m1[1].substring(0, 3).toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const anio = parseInt(m1[2], 10);
            if (MES_ABREV_MAP[abbr] && anio >= 2000) return { mes: MES_ABREV_MAP[abbr], anio };
        }
        // Patrón: MM/YYYY o M-YYYY o YYYY-MM
        const m2 = n.match(/(\d{1,2})[\/-](\d{4})/) || n.match(/(\d{4})[\/-](\d{1,2})/);
        if (m2) {
            let mes = parseInt(m2[1], 10), anio = parseInt(m2[2], 10);
            if (anio < 2000) { [mes, anio] = [anio, mes]; } // swap YYYY-MM case
            if (mes >= 1 && mes <= 12 && anio >= 2000) return { mes, anio };
        }
        return null;
    }

    // ── Utilidades ────────────────────────────────────────────────────────────

    /** Normaliza un nombre de columna para comparación fuzzy */
    function normCol(s) {
        return String(s == null ? '' : s)
            .trim()
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /** Convierte serial de fecha Excel a ISO 8601 */
    function excelSerialToISO(serial) {
        if (typeof serial !== 'number' || isNaN(serial) || serial <= 0) return null;
        // Excel epoch: 1900-01-00 + bug de 1900-02-29 → restar 25569 para llegar a Unix epoch
        return new Date((serial - 25569) * 86400000).toISOString();
    }

    /** Parsea texto CSV a filas (array de arrays). Autodetecta el delimitador
     *  (coma, punto y coma o tabulador) y respeta comillas dobles con escape "".
     *  Devuelve la primera fila como encabezados y el resto como datos. */
    function parseCsvToRows(text) {
        // Quitar BOM inicial
        text = String(text || '').replace(/^\uFEFF/, '');
        if (!text) return [];

        // Autodetectar delimitador a partir de la primera línea
        const nl = text.indexOf('\n');
        const firstLine = nl >= 0 ? text.slice(0, nl) : text;
        const count = ch => (firstLine.split(ch).length - 1);
        const commas = count(',');
        const semis  = count(';');
        const tabs   = count('\t');
        let delim = ',';
        if (semis >= commas && semis >= tabs && semis > 0) delim = ';';
        else if (tabs >= commas && tabs > 0) delim = '\t';

        const rows = [];
        let field = '';
        let cur = [];
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else {
                    field += c;
                }
            } else if (c === '"') {
                inQuotes = true;
            } else if (c === delim) {
                cur.push(field); field = '';
            } else if (c === '\n') {
                cur.push(field); rows.push(cur); cur = []; field = '';
            } else if (c === '\r') {
                // ignorar (CRLF)
            } else {
                field += c;
            }
        }
        if (field !== '' || cur.length > 0) { cur.push(field); rows.push(cur); }
        return rows;
    }

    /** Encuentra la hoja con datos de operaciones.
     *  Prioridad:
     *  1. Hojas cuyo nombre coincide con el patrón "MES YYYY" (ej. "MAY 2026", "ABR 2026")
     *  2. Cualquier hoja cuyas cabeceras contengan al menos 2 firmas de SHEET_SIGNATURE
     */
    function findDataSheet(wb) {
        // Separar hojas con nombre de periodo de las demás
        const namedSheets   = [];
        const genericSheets = [];
        for (const name of wb.SheetNames) {
            if (mesAnioFromSheetName(name)) namedSheets.push(name);
            else genericSheets.push(name);
        }

        for (const name of [...namedSheets, ...genericSheets]) {
            const sh = wb.Sheets[name];
            if (!sh) continue;
            const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null });
            if (!rows || rows.length < 2) continue;
            const header = rows[0];
            if (!Array.isArray(header)) continue;
            const normHeaders = header.map(normCol);
            const matches = SHEET_SIGNATURE.filter(sig => normHeaders.includes(sig));
            if (matches.length >= 2) return { sheetName: name, rows };
        }
        return null;
    }

    /** Obtiene nombres de columnas reales de Supabase (1 fila de muestra) */
    async function getDbColNames() {
        try {
            const client = window.supabaseClient;
            if (!client) return null;
            const { data } = await client.from('Demoras').select('*').limit(1);
            if (data && data.length > 0) return Object.keys(data[0]);
        } catch (_) {}
        return null;
    }

    /**
     * Detecta si los encabezados provienen del export crudo del software del
     * aeropuerto y devuelve la dirección del archivo.
     * @returns {'Llegada'|'Salida'|null} 'Llegada' si predominan columnas [Arr],
     *          'Salida' si predominan [Dep], null si es la plantilla Demoras.
     */
    function detectAirportDirection(headers) {
        let arr = 0, dep = 0;
        (headers || []).forEach(h => {
            const n = normCol(h);
            if (n.startsWith('arr_')) arr++;
            else if (n.startsWith('dep_')) dep++;
        });
        if (arr === 0 && dep === 0) return null;
        return arr >= dep ? 'Llegada' : 'Salida';
    }

    /**
     * Construye el mapa: índice Excel → { dbCol, isDate }
     * Prioridad:
     *   1. Columna real de Supabase con mismo nombre normalizado (más precisa)
     *   2. Columna real de Supabase vía alias explícito (maneja variantes del Excel)
     *   3. Nombre exacto hardcodeado (fallback cuando la tabla está vacía)
     *   4. Alias normalizado como último recurso
     */
    async function buildMapping(excelHeaders, dbColNames) {
        const dbNormToReal = {};
        if (dbColNames) {
            dbColNames.forEach(c => { dbNormToReal[normCol(c)] = c; });
        }

        return excelHeaders.map((h, idx) => {
            const norm      = normCol(h);
            const normAlias = EXCEL_TO_DB_ALIASES[norm] || norm;
            const dbCol = dbNormToReal[norm]
                       || dbNormToReal[normAlias]
                       || DB_COL_EXACT[normAlias]
                       || DB_COL_EXACT[norm]
                       || normAlias;
            // La detección de fecha se hace sobre la columna DESTINO (DB), por lo
            // que funciona igual si el encabezado venía en español o en inglés.
            return { idx, excelHeader: h, dbCol, isDate: DB_DATE_COL_NORMS.has(normCol(dbCol)) };
        });
    }

    /** Convierte serial Excel (número) o cadena de fecha (CSV) a ISO 8601. */
    function coerceDateValue(val) {
        if (typeof val === 'number') return excelSerialToISO(val);
        const s = String(val).trim();
        if (s === '') return null;
        // Serial de Excel exportado como texto (ej. "46143.98")
        if (/^\d+(?:\.\d+)?$/.test(s)) {
            const n = parseFloat(s);
            if (n > 1000) return excelSerialToISO(n);
        }
        // Formatos de fecha comunes: DD/MM/YYYY [HH:MM[:SS]] o DD-MM-YYYY …
        const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (m) {
            let [, d, mo, y, hh, mm, ss] = m;
            if (y.length === 2) y = '20' + y;
            const dt = new Date(Date.UTC(+y, +mo - 1, +d, +(hh || 0), +(mm || 0), +(ss || 0)));
            if (!isNaN(dt.getTime())) return dt.toISOString();
        }
        // Formato del export del aeropuerto: "14FEB 19:05" o "14FEB2026 19:05".
        // Si no trae año, se usa el año de contexto del archivo (_importCtxYear).
        const m2 = s.match(/^(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})?[\s,]+(\d{1,2}):(\d{2})/);
        if (m2) {
            const mo = MONTH_ABBR_EN[m2[2].toLowerCase()];
            if (mo !== undefined) {
                let y = m2[3] ? (m2[3].length === 2 ? 2000 + (+m2[3]) : +m2[3])
                              : (_importCtxYear || new Date().getFullYear());
                const dt = new Date(Date.UTC(y, mo, +m2[1], +m2[4], +m2[5]));
                if (!isNaN(dt.getTime())) return dt.toISOString();
            }
        }
        // Último recurso: dejar que el motor de fechas del navegador lo intente (ISO, etc.)
        const dt2 = new Date(s);
        if (!isNaN(dt2.getTime())) return dt2.toISOString();
        return s;
    }

    /** Transforma una fila raw (array) en objeto DB usando el mapping */
    function transformRow(rawRow, mapping) {
        const out = {};
        mapping.forEach(({ idx, dbCol, isDate }) => {
            const val = rawRow[idx];
            if (val === null || val === undefined || val === '') {
                out[dbCol] = null;
            } else if (isDate) {
                out[dbCol] = coerceDateValue(val);
            } else {
                out[dbCol] = val;
            }
        });
        return out;
    }

    // Columnas que NO se toman del Excel — se generan aquí o las gestiona Supabase
    const AUTOGEN_COLS = new Set(['id', 'created_at', 'no']);

    /** Elimina columnas autogeneradas (PK, timestamps) antes de insertar */
    function stripAutogen(row) {
        const clean = {};
        for (const [k, v] of Object.entries(row)) {
            if (!AUTOGEN_COLS.has(k) && !AUTOGEN_COLS.has(normCol(k))) clean[k] = v;
        }
        return clean;
    }

    /** Sube filas en lotes de 500 con callback de progreso.
     *  Si se provee `realColSet` (columnas reales de la tabla), descarta cualquier
     *  clave que no exista en la tabla para evitar el error de PostgREST
     *  "Could not find the '<col>' column of 'Demoras' in the schema cache". */
    async function uploadInBatches(rows, onProgress, realColSet) {
        const client = window.supabaseClient;
        const BATCH = 500;
        let done = 0;
        const prep = (row) => {
            const clean = stripAutogen(row);
            if (!realColSet) return clean;
            const out = {};
            for (const [k, v] of Object.entries(clean)) {
                if (realColSet.has(k)) out[k] = v;
            }
            return out;
        };
        for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH).map(prep);
            const { error } = await client.from('Demoras').insert(chunk);
            if (error) throw error;
            done += chunk.length;
            if (onProgress) onProgress(done, rows.length);
        }
    }

    // ── UI Helpers ────────────────────────────────────────────────────────────

    function setStatus(html, type = 'info') {
        const el = document.getElementById('du-status');
        if (el) el.innerHTML = `<div class="alert alert-${type} py-2 mb-0 small">${html}</div>`;
    }

    function setProgress(done, total) {
        const bar = document.getElementById('du-progress-bar');
        if (!bar) return;
        const pct = Math.round((done / total) * 100);
        bar.style.width = pct + '%';
        bar.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
    }

    // ── Proceso principal ──────────────────────────────────────────────────────

    window.demorasProcessFile = async function (file) {
        if (!file) return;

        const btnImport  = document.getElementById('du-btn-import');
        const previewDiv = document.getElementById('du-preview');
        const progWrap   = document.getElementById('du-progress-wrap');
        const MES_NOMBRES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                             'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Reset UI
        if (previewDiv)  previewDiv.innerHTML = '';
        if (progWrap)    progWrap.classList.add('d-none');
        if (btnImport)   btnImport.disabled = true;

        const isCsv = /\.csv$/i.test(file.name || '');
        setStatus(`<i class="fas fa-spinner fa-spin me-1"></i>Leyendo archivo ${isCsv ? 'CSV' : 'Excel'}…`);

        try {
            let sheetName, rows;

            if (isCsv) {
                // CSV: una sola "hoja"; el nombre del archivo aporta MES/AÑO (ej. "Mayo 2026.csv")
                const text = await file.text();
                rows = parseCsvToRows(text);
                if (!rows || rows.length < 2) {
                    setStatus('El archivo CSV está vacío o no contiene filas de datos.', 'danger');
                    return;
                }
                sheetName = (file.name || '').replace(/\.[^.]+$/, '');
            } else {
                const buf = await file.arrayBuffer();
                const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

                // 1. Detectar hoja
                const found = findDataSheet(wb);
                if (!found) {
                    setStatus('No se encontró una hoja con datos de operaciones. Verifica que el archivo sea el correcto.', 'danger');
                    return;
                }
                sheetName = found.sheetName;
                rows      = found.rows;
            }

            const headers  = rows[0];
            const dataRows = rows.slice(1).filter(r => Array.isArray(r) && r.some(v => v !== null && v !== undefined && String(v).trim() !== ''));

            // Dirección del export crudo del aeropuerto ([Arr] → Llegada, [Dep] → Salida).
            // null cuando el archivo es la plantilla Demoras (español/inglés simple).
            const airportDirection = detectAirportDirection(headers);

            // 2. Detectar MES y ANIO — prioridad: nombre de hoja → nombre de archivo → columnas MES/ANIO → fecha del dato
            let mesDato = null, anioDato = null;

            // 2a. Nombre de la hoja (más confiable — ej. "ABR 2026")
            const fromSheet = mesAnioFromSheetName(sheetName);
            if (fromSheet) {
                mesDato = fromSheet.mes;
                anioDato = fromSheet.anio;
            }

            // 2a-bis. Nombre del archivo (ej. "Mayo 2026.xlsx", "Julio 2026.csv").
            // Útil para el export del aeropuerto, cuyo nombre de hoja no trae el periodo.
            if (!mesDato || !anioDato) {
                const fromFile = mesAnioFromSheetName((file.name || '').replace(/\.[^.]+$/, ''));
                if (fromFile) {
                    if (!mesDato)  mesDato  = fromFile.mes;
                    if (!anioDato) anioDato = fromFile.anio;
                }
            }

            // 2b. Columnas MES / ANIO en los datos (fallback)
            if (!mesDato || !anioDato) {
                const mesIdx  = headers.findIndex(h => normCol(h) === 'mes');
                const anioIdx = headers.findIndex(h => normCol(h) === 'anio');
                const sampleRow = dataRows[0] || [];
                const mesCol  = mesIdx  >= 0 ? Number(sampleRow[mesIdx])  : null;
                const anioCol = anioIdx >= 0 ? Number(sampleRow[anioIdx]) : null;
                if (!mesDato  && mesCol  >= 1 && mesCol  <= 12) mesDato  = mesCol;
                if (!anioDato && anioCol >= 2000)               anioDato = anioCol;
            }

            // 2c. Derivar del primer valor de fecha en la columna aterrizaje/despegue (fallback)
            if (!mesDato || !anioDato) {
                const atzIdx = headers.findIndex(h => {
                    const n = normCol(h);
                    return n === 'aterrizaje_despegue' || n === 'landing_takeoff'
                        || n === 'arr_aldt' || n === 'dep_atot';
                });
                if (atzIdx >= 0) {
                    const serial = (dataRows[0] || [])[atzIdx];
                    if (typeof serial === 'number' && serial > 0) {
                        const d = new Date((serial - 25569) * 86400000);
                        if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                        if (!anioDato) anioDato = d.getUTCFullYear();
                    }
                }
            }

            // Año de contexto para fechas sin año ("14FEB 19:05") del export del aeropuerto
            _importCtxYear = anioDato || null;

            // 2d. Validador de periodo por MAYORÍA de datos.
            // Si el nombre del archivo/hoja dice un mes pero la fecha real de las
            // operaciones pertenece mayoritariamente a otro mes/año, se corrige el
            // periodo con el que realmente corresponde a los datos (evita etiquetar
            // "Julio" un archivo que en realidad es de "Junio", por ejemplo).
            let periodoCorregido = null;
            const fechaIdx = headers.findIndex(h => {
                const n = normCol(h);
                return n === 'aterrizaje_despegue' || n === 'landing_takeoff'
                    || n === 'arr_aldt' || n === 'dep_atot';
            });
            if (fechaIdx >= 0 && dataRows.length) {
                const conteo = new Map();   // "anio-mes" → cantidad
                let validos = 0;
                for (const row of dataRows) {
                    const iso = coerceDateValue(row[fechaIdx]);
                    if (!iso) continue;
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) continue;
                    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
                    conteo.set(key, (conteo.get(key) || 0) + 1);
                    validos++;
                }
                if (validos > 0) {
                    let bestKey = null, bestN = 0;
                    for (const [k, n] of conteo) if (n > bestN) { bestN = n; bestKey = k; }
                    const proporcion = bestN / validos;
                    const [aDom, mDom] = bestKey.split('-').map(Number);
                    // Umbral de "mayoría clara": si ≥90% de las operaciones pertenecen a
                    // un mes/año distinto al detectado, se corrige el periodo.
                    const UMBRAL_MAYORIA = 0.90;
                    const difiere = (mDom !== mesDato) || (aDom !== anioDato);
                    if (proporcion >= UMBRAL_MAYORIA && difiere) {
                        periodoCorregido = {
                            antesMes: mesDato, antesAnio: anioDato,
                            mes: mDom, anio: aDom,
                            porcentaje: Math.round(proporcion * 100)
                        };
                        mesDato = mDom;
                        anioDato = aDom;
                        _importCtxYear = anioDato;
                    }
                }
            }

            const mesStr  = (mesDato  && mesDato >= 1 && mesDato <= 12) ? MES_NOMBRES[mesDato] : '?';
            const anioStr = anioDato || '?';

            // 3. Construir mapping de columnas
            const dbColNames = await getDbColNames();
            const mapping    = await buildMapping(headers, dbColNames);

            // 4. Contar registros existentes
            const client = window.supabaseClient;
            let existingCount = 0;
            if (mesDato && anioDato && client) {
                const { count } = await client
                    .from('Demoras')
                    .select('*', { count: 'exact', head: true })
                    .eq('MES', mesDato)
                    .eq('ANIO', anioDato);
                existingCount = count || 0;
            }

            // 5. Mostrar preview
            const colPreviewHtml = mapping.slice(0, 8)
                .map(m => `<span class="badge bg-light text-dark border me-1 mb-1" style="font-size:.7rem">${m.excelHeader} → ${m.dbCol}${m.isDate ? ' <i class="fas fa-clock fa-xs text-info"></i>' : ''}</span>`)
                .join('') + (mapping.length > 8 ? `<span class="text-muted small">+${mapping.length - 8} más…</span>` : '');

            const existingWarning = existingCount > 0
                ? `<div class="alert alert-warning py-2 mt-2 mb-0 small"><i class="fas fa-exclamation-triangle me-1"></i>Ya existen <strong>${existingCount.toLocaleString()}</strong> registros para <strong>${mesStr} ${anioStr}</strong>. Se eliminarán y reemplazarán.</div>`
                : `<div class="alert alert-success py-2 mt-2 mb-0 small"><i class="fas fa-check-circle me-1"></i>No hay datos previos para ${mesStr} ${anioStr}. Se insertarán directamente.</div>`;

            const periodoCorregidoWarning = periodoCorregido
                ? `<div class="alert alert-info py-2 mt-2 mb-0 small"><i class="fas fa-calendar-check me-1"></i>`
                  + `El nombre indicaba <strong>${(periodoCorregido.antesMes && periodoCorregido.antesMes >= 1 && periodoCorregido.antesMes <= 12) ? MES_NOMBRES[periodoCorregido.antesMes] : '?'} ${periodoCorregido.antesAnio || '?'}</strong>, `
                  + `pero el <strong>${periodoCorregido.porcentaje}%</strong> de las operaciones son de <strong>${mesStr} ${anioStr}</strong>. `
                  + `Se importarán como <strong>${mesStr} ${anioStr}</strong>.</div>`
                : '';

            if (previewDiv) {
                previewDiv.innerHTML = `
                    <div class="p-3 bg-light rounded border mt-3">
                        <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                            <div>
                                <span class="fw-semibold">Hoja detectada:</span>
                                <span class="badge bg-primary ms-1">${sheetName}</span>
                            </div>
                            <div>
                                <span class="fw-semibold">${dataRows.length.toLocaleString()}</span>
                                <span class="text-muted small"> registros · </span>
                                <span class="fw-semibold">${mesStr} ${anioStr}</span>
                            </div>
                        </div>
                        <div class="mb-1 small text-muted">Mapeo de columnas detectado:</div>
                        <div class="mb-0">${colPreviewHtml}</div>
                        ${periodoCorregidoWarning}
                        ${existingWarning}
                    </div>`;
            }

            setStatus(`<i class="fas ${isCsv ? 'fa-file-csv' : 'fa-file-excel'} text-success me-1"></i>Archivo listo: <strong>${dataRows.length.toLocaleString()} filas</strong> de <strong>${mesStr} ${anioStr}</strong>. Confirma para importar.`);
            if (btnImport) btnImport.disabled = false;

            // 6. Guardar estado en el botón para cuando haga click
            if (btnImport) {
                btnImport.onclick = async () => {
                    // Confirmación SOLO cuando ya existen datos del mismo periodo
                    // (se van a eliminar y reemplazar).
                    if (existingCount > 0) {
                        const ok = window.confirm(
                            `Ya existen ${existingCount.toLocaleString()} registros de ${mesStr} ${anioStr}.\n\n`
                            + `Se ELIMINARÁN y se reemplazarán por las ${dataRows.length.toLocaleString()} filas de este archivo.\n\n`
                            + `¿Deseas continuar?`
                        );
                        if (!ok) return;
                    }
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setProgress(0, dataRows.length);

                    try {
                        // Eliminar datos anteriores si existen
                        if (existingCount > 0 && mesDato && anioDato) {
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Eliminando datos anteriores…');
                            const { error: delErr } = await client
                                .from('Demoras').delete()
                                .eq('MES', mesDato).eq('ANIO', anioDato);
                            if (delErr) throw delErr;
                        }

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos a Supabase…');

                        // Transformar filas (la columna "No" ya fue excluida por AUTOGEN_COLS)
                        // Filtrar filas completamente vacías (sin ningún valor relevante)
                        // Las columnas se resuelven por el nombre DESTINO real (m.dbCol), no por el
                        // encabezado de origen, para que funcione con cualquier idioma/formato.
                        const noDbCol   = (mapping.find(m => normCol(m.dbCol) === 'no') || {}).dbCol || 'No';
                        const mesDbCol  = (mapping.find(m => normCol(m.dbCol) === 'mes') || {}).dbCol || 'MES';
                        const anioDbCol = (mapping.find(m => normCol(m.dbCol) === 'anio') || {}).dbCol || 'ANIO';

                        // Resolver nombres de columnas para lógica de Estatus (por columna DESTINO real)
                        const rutaEntry          = mapping.find(m => normCol(m.dbCol) === 'ruta');
                        const tiempoEntry        = mapping.find(m => normCol(m.dbCol) === 'tiempo_de_demora');
                        const estatusEntry       = mapping.find(m => normCol(m.dbCol) === 'estatus');
                        const llegadaSalidaEntry = mapping.find(m => normCol(m.dbCol) === 'llegada_salida');
                        const rutaDbCol         = rutaEntry         ? rutaEntry.dbCol         : 'Ruta';
                        const tiempoDbCol       = tiempoEntry       ? tiempoEntry.dbCol       : 'Tiempo de Demora';
                        const estatusDbCol      = estatusEntry      ? estatusEntry.dbCol      : 'Estatus';
                        const llegadaSalidaDbCol = llegadaSalidaEntry ? llegadaSalidaEntry.dbCol : 'Llegada/Salida';

                        /** Deriva el Estatus de un vuelo según reglas de negocio. */
                        function calcEstatus(row) {
                            const ruta = String(row[rutaDbCol] || '').trim().toUpperCase();
                            if (ruta === 'MMSM' || ruta === 'NLU-NLU') return 'Regreso a posición';
                            const rawTiempo = row[tiempoDbCol];
                            if (rawTiempo === null || rawTiempo === undefined || rawTiempo === '')
                                return 'Cancelado';
                            const minutos = parseFloat(String(rawTiempo).replace(',', '.'));
                            if (isNaN(minutos)) return 'Cancelado';
                            if (minutos >= -15 && minutos <= 15) return 'A Tiempo';
                            return 'Demora';
                        }

                        /** Deriva Llegada/Salida a partir del campo Ruta y el Estatus derivado:
                         *  Regreso a posición: Ruta='MMSM'      → 'Salida'
                         *                      Ruta termina '-NLU' → 'Llegada'
                         *  Demás casos:        Ruta empieza 'MMSM'/'NLU-' → 'Salida'
                         *                      Ruta termina '-NLU'         → 'Llegada'
                         *                      Otro caso                   → valor original */
                        function calcLlegadaSalida(row, estatusDerived) {
                            const ruta = String(row[rutaDbCol] || '').trim().toUpperCase();
                            const original = row[llegadaSalidaDbCol] ?? '';
                            if (estatusDerived === 'Regreso a posición') {
                                if (ruta === 'MMSM')        return 'Salida';
                                if (ruta.endsWith('-NLU'))  return 'Llegada';
                                return original;
                            }
                            if (ruta.startsWith('MMSM') || ruta.startsWith('NLU-')) return 'Salida';
                            if (ruta.endsWith('-NLU'))                               return 'Llegada';
                            return original;
                        }

                        const dbRows   = dataRows
                            .map(r => transformRow(r, mapping))
                            .filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''))
                            // Sobreescribir MES/ANIO con el valor detectado del nombre de hoja
                            // (evita que datos copiados de otro mes queden con el mes incorrecto)
                            // Sobreescribir Estatus con la lógica derivada
                            .map((r, i) => {
                                const estatusDerived = calcEstatus(r);
                                return {
                                    ...r,
                                    [mesDbCol]:           mesDato,
                                    [anioDbCol]:          anioDato,
                                    [noDbCol]:            i + 1,
                                    [estatusDbCol]:       estatusDerived,
                                    // Export del aeropuerto: la dirección viene fija por archivo
                                    // ([Arr] → Llegada, [Dep] → Salida). Plantilla Demoras: derivar de Ruta.
                                    [llegadaSalidaDbCol]: airportDirection || calcLlegadaSalida(r, estatusDerived)
                                };
                            });

                        // Columnas reales de la tabla (introspección). Si existen, se filtran
                        // las claves inexistentes antes de insertar y se avisa cuáles se omiten.
                        const realColSet = (Array.isArray(dbColNames) && dbColNames.length)
                            ? new Set(dbColNames) : null;
                        let skippedCols = [];
                        let skippedColsMsg = '';
                        if (realColSet && dbRows.length) {
                            skippedCols = Object.keys(dbRows[0]).filter(k =>
                                !AUTOGEN_COLS.has(k) && !AUTOGEN_COLS.has(normCol(k)) && !realColSet.has(k));
                            if (skippedCols.length) {
                                skippedColsMsg = `<br><span class="text-warning"><i class="fas fa-exclamation-triangle me-1"></i>`
                                    + `No se guardaron estas columnas porque no existen en la tabla <strong>Demoras</strong>: `
                                    + `<strong>${skippedCols.join(', ')}</strong>. `
                                    + `Agrégalas en Supabase (o recarga el schema cache) para conservar esos datos.</span>`;
                            }
                        }

                        await uploadInBatches(dbRows, (done, total) => {
                            setProgress(done, total);
                            setStatus(`<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>${done.toLocaleString()}</strong> / ${total.toLocaleString()} registros`);
                        }, realColSet);

                        setProgress(dbRows.length, dbRows.length);
                        setStatus(
                            `<i class="fas fa-check-circle text-success me-1"></i><strong>${dbRows.length.toLocaleString()} registros</strong> importados para <strong>${mesStr} ${anioStr}</strong>.${skippedColsMsg}`,
                            skippedCols.length ? 'warning' : 'success'
                        );

                        // Invalidar caché del mes importado
                        if (mesDato && anioDato) {
                            const cacheKey = `${OPS_CACHE_PFX}${anioDato}_${mesDato}`;
                            sessionStorage.removeItem(cacheKey);
                        }

                        // Refrescar vista si el mes activo coincide
                        if (typeof loadOpsMonthData === 'function' &&
                            typeof currentYearOps !== 'undefined' && typeof currentMonthOps !== 'undefined' &&
                            anioDato === currentYearOps && mesDato === new Date(`${MES_NOMBRES[mesDato]} 1, ${anioDato}`).getMonth() + 1) {
                            setTimeout(() => loadOpsMonthData(currentMonthOps), 1200);
                        }

                    } catch (err) {
                        setStatus(`<i class="fas fa-times-circle me-1"></i>Error al importar: ${err.message}`, 'danger');
                        btnImport.disabled = false;
                    }
                };
            }

        } catch (err) {
            setStatus(`<i class="fas fa-times-circle me-1"></i>Error al leer el archivo: ${err.message}`, 'danger');
        }
    };

    // ── Inicialización ─────────────────────────────────────────────────────────

    /** Determina si el usuario actual puede importar/borrar Demoras.
     *  Combina las tres señales de rol del app para evitar desincronización:
     *    1. window.dataManager.isAdmin (bandera canónica del app)
     *    2. window.dataManager.userRole
     *    3. sessionStorage.user_role (fallback si dataManager aún no carga)
     */
    function canUploadDemoras() {
        const dm = window.dataManager;
        if (dm) {
            if (dm.isAdmin) return true;
            if (dm.userRole && UPLOAD_ROLES.includes(dm.userRole)) return true;
        }
        const role = sessionStorage.getItem('user_role') || 'viewer';
        return UPLOAD_ROLES.includes(role);
    }

    /** Muestra/oculta los botones de admin segun el rol */
    function syncImportBtn() {
        const container = document.getElementById('demoras-admin-btns');
        // El wrapper usa display:none!important por defecto; lo reemplazamos con flex
        if (container) container.style.cssText = canUploadDemoras()
            ? 'display:flex!important'
            : 'display:none!important';
    }

    window.demorasInitUploadBtn = syncImportBtn;

    document.addEventListener('DOMContentLoaded', () => {
        syncImportBtn();
        // Drag & drop zone
        const zone = document.getElementById('du-drop-zone');
        const inp  = document.getElementById('du-file-input');
        if (zone) {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
            });
            zone.addEventListener('click', () => inp && inp.click());
        }
        if (inp) {
            inp.addEventListener('change', () => {
                if (inp.files[0]) handleFileSelect(inp.files[0]);
            });
        }
    });

    // Re-sync cuando cambia el estado de sesión/rol.
    // dataManager despacha 'admin-mode-changed' en window; también se cubre el
    // legacy 'aifa-session-ready' y la entrada a la sección de Análisis.
    window.addEventListener('admin-mode-changed', syncImportBtn);
    window.addEventListener('analisis-operaciones:visible', syncImportBtn);
    document.addEventListener('aifa-session-ready', syncImportBtn);
    // Fallback: revisar periódicamente hasta que el rol esté disponible
    let _syncRetries = 0;
    const _syncInterval = setInterval(() => {
        // Detener cuando ya se puede subir, o cuando hay un rol resuelto, o al agotar reintentos
        const hasRole = !!(window.dataManager && (window.dataManager.userRole || window.dataManager.isAdmin))
                     || !!sessionStorage.getItem('user_role');
        syncImportBtn();
        if (canUploadDemoras() || hasRole || _syncRetries++ > 20) {
            clearInterval(_syncInterval);
        }
    }, 500);

    function handleFileSelect(file) {
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            setStatus('Formato no soportado. Sube un archivo .xlsx, .xls o .csv.', 'danger');
            return;
        }
        const label = document.getElementById('du-file-label');
        if (label) label.textContent = file.name;
        window.demorasProcessFile(file);
    }

    // ── Lógica: Borrar mes de Demoras ────────────────────────────────────────

    const MES_NOMBRES_DEL = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    /** Abre el modal de borrado pre-cargando el mes/año activo */
    window.demorasAbrirBorrar = function () {
        const selMes  = document.getElementById('dd-sel-mes');
        const inpAnio = document.getElementById('dd-inp-anio');
        const btnConf = document.getElementById('dd-btn-confirm');
        const status  = document.getElementById('dd-status');
        const info    = document.getElementById('dd-count-info');

        if (!selMes || !inpAnio) return;

        // Pre-cargar con el mes activo de la vista
        const mesActivo  = (typeof currentMonthOps !== 'undefined' && currentMonthOps)
            ? currentMonthOps : null;
        const anioActivo = (typeof currentYearOps  !== 'undefined' && currentYearOps)
            ? currentYearOps  : new Date().getFullYear();

        if (mesActivo) {
            const mesNum = MES_NOMBRES_DEL.indexOf(mesActivo);
            if (mesNum > 0) selMes.value = String(mesNum);
        }
        inpAnio.value = anioActivo;

        if (btnConf) btnConf.disabled = true;
        if (status)  status.innerHTML = '';
        if (info)    info.textContent  = '';

        // Consultar cuántos registros hay
        _ddFetchCount();

        const modalEl = document.getElementById('demoras-delete-modal');
        let bsModal = bootstrap.Modal.getInstance(modalEl);
        if (!bsModal) bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    };

    async function _ddFetchCount() {
        const mes  = parseInt(document.getElementById('dd-sel-mes')?.value,  10);
        const anio = parseInt(document.getElementById('dd-inp-anio')?.value, 10);
        const info = document.getElementById('dd-count-info');
        const btnC = document.getElementById('dd-btn-confirm');
        if (!mes || !anio || anio < 2020 || anio > 2099) {
            if (info) info.textContent = '';
            if (btnC) btnC.disabled = true;
            return;
        }
        if (info) info.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Consultando registros…';
        if (btnC) btnC.disabled = true;
        try {
            const { count, error } = await window.supabaseClient
                .from('Demoras')
                .select('*', { count: 'exact', head: true })
                .eq('MES', mes)
                .eq('ANIO', anio);
            if (error) throw error;
            const mesNombre = MES_NOMBRES_DEL[mes] || mes;
            if (count > 0) {
                if (info) info.innerHTML = `Se eliminarán <strong class="text-danger">${count.toLocaleString()} registros</strong> de <strong>${mesNombre} ${anio}</strong>.`;
                if (btnC) btnC.disabled = false;
            } else {
                if (info) info.innerHTML = `<span class="text-success"><i class="fas fa-check-circle me-1"></i>No hay registros para ${mesNombre} ${anio}.</span>`;
                if (btnC) btnC.disabled = true;
            }
        } catch (e) {
            if (info) info.textContent = 'Error al consultar: ' + e.message;
        }
    }

    // Actualizar conteo al cambiar selector
    // Usamos un helper que funciona aunque DOMContentLoaded ya haya disparado
    function _onReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    _onReady(() => {
        document.getElementById('dd-sel-mes')  ?.addEventListener('change', _ddFetchCount);
        document.getElementById('dd-inp-anio') ?.addEventListener('input',  _ddFetchCount);

        document.getElementById('dd-btn-confirm')?.addEventListener('click', async () => {
            const mes  = parseInt(document.getElementById('dd-sel-mes')?.value,  10);
            const anio = parseInt(document.getElementById('dd-inp-anio')?.value, 10);
            const status = document.getElementById('dd-status');
            const btnC   = document.getElementById('dd-btn-confirm');
            if (!mes || !anio) return;

            btnC.disabled = true;
            if (status) status.innerHTML = '<div class="alert alert-warning py-2 small"><i class="fas fa-spinner fa-spin me-1"></i>Eliminando registros…</div>';

            try {
                const { error } = await window.supabaseClient
                    .from('Demoras')
                    .delete()
                    .eq('MES', mes)
                    .eq('ANIO', anio);
                if (error) throw error;

                const mesNombre = MES_NOMBRES_DEL[mes] || mes;
                if (status) status.innerHTML = `<div class="alert alert-success py-2 small"><i class="fas fa-check-circle me-1"></i>Registros de <strong>${mesNombre} ${anio}</strong> eliminados correctamente.</div>`;

                // Invalidar caché del mes borrado
                const cacheKey = `aifa_ops_cache_${anio}_${mes}`;
                sessionStorage.removeItem(cacheKey);

                // Refrescar tabla si el mes borrado es el activo en la vista
                if (typeof currentMonthOps !== 'undefined' && typeof currentYearOps !== 'undefined') {
                    const monthMap = { 'Enero':1,'Febrero':2,'Marzo':3,'Abril':4,'Mayo':5,'Junio':6,
                                       'Julio':7,'Agosto':8,'Septiembre':9,'Octubre':10,'Noviembre':11,'Diciembre':12 };
                    if (monthMap[currentMonthOps] === mes && currentYearOps === anio) {
                        setTimeout(() => {
                            if (typeof loadOpsMonthData === 'function') loadOpsMonthData(currentMonthOps);
                        }, 800);
                    }
                }

                // Actualizar conteo (mostrar 0)
                setTimeout(_ddFetchCount, 600);

            } catch (e) {
                if (status) status.innerHTML = `<div class="alert alert-danger py-2 small"><i class="fas fa-times-circle me-1"></i>Error: ${e.message}</div>`;
                btnC.disabled = false;
            }
        });
    });

})();
