// AIFA Operations Analysis Module - 2026 Refactor
// Focus: Database View (Year > Month > Table) with Pivot Capabilities

const OPS_MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let currentYearOps = 2025;
let currentMonthOps = 'Enero';
let opsDataTable = null;
let opsRawData = [];

// Cache key prefix
const OPS_CACHE_KEY = 'aifa_ops_cache_';

document.addEventListener('DOMContentLoaded', () => {
    initOpsAnalysisTabs();
});

const OPS_MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function initOpsAnalysisTabs() {
    if (!document.getElementById('ops-month-pills')) return;
    renderMonthPills();
    loadOpsMonthData('Enero');
}

function renderMonthPills() {
    const container = document.getElementById('ops-month-pills');
    if (!container) return;
    container.innerHTML = '';
    const today = new Date();
    OPS_MONTHS.forEach((m, i) => {
        const isFuture = (currentYearOps === today.getFullYear()) && (i > today.getMonth());
        const isActive = (m === currentMonthOps);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ops-month-pill' + (isActive ? ' active' : '');
        btn.textContent = OPS_MONTHS_SHORT[i];
        btn.title = `${m} ${currentYearOps}`;
        btn.setAttribute('data-month', m);
        btn.disabled = isFuture;
        if (!isFuture) btn.addEventListener('click', () => loadOpsMonthData(m));
        container.appendChild(btn);
    });
    const disp = document.getElementById('ops-year-display');
    if (disp) disp.textContent = currentYearOps;
    // Disable next-year button if already at or past current year
    const btnNext = document.getElementById('ops-year-next-btn');
    if (btnNext) btnNext.disabled = currentYearOps >= today.getFullYear();
}

async function loadOpsMonthData(month) {
    currentMonthOps = month;

    // Sync active state on pills
    document.querySelectorAll('#ops-month-pills .ops-month-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-month') === month);
    });

    const badge = document.getElementById('current-month-badge');
    if (badge) badge.textContent = `${month} ${currentYearOps}`;

    const countBadge = document.getElementById('record-count-badge');
    if (countBadge) countBadge.textContent = 'Cargando datos...';

    if (opsDataTable) {
        opsDataTable.destroy();
        $('#ops-datatable').empty();
        opsDataTable = null;
    }

    $('#pivot-output').empty();

    // 🔥 MAPA DE MESES (clave del cambio)
    const monthMap = {
        'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
        'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
        'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
    };

    const mesNumero = monthMap[month];

    if (!mesNumero) {
        console.error("Mes inválido:", month);
        return;
    }

    const cacheKey = `${OPS_CACHE_KEY}${currentYearOps}_${mesNumero}`;
    const cached = getFromCache(cacheKey);

    if (cached) {
        opsRawData = cached;
        if (countBadge) countBadge.textContent = `${cached.length.toLocaleString()} registros (Caché)`;

        renderOpsTable(cached);

        const activeMode = document.querySelector('input[name="viewmode"]:checked').id.replace('view-', '');
        if (activeMode !== 'table') window.toggleViewMode(activeMode);
        return;
    }

    if (document.getElementById('ops-datatable')) {
        $('#ops-datatable').html(`
            <tbody>
                <tr>
                    <td colspan="100%" class="text-center py-5">
                        <div class="spinner-border text-primary"></div>
                        <p class="mt-2 text-muted">Consultando Demoras...</p>
                    </td>
                </tr>
            </tbody>
        `);
    }

    try {
        let client = window.supabaseClient;
        if (!client && window.ensureSupabaseClient) {
            client = await window.ensureSupabaseClient();
        }

        if (!client) throw new Error("Supabase client failed.");

        console.log(`Consultando Demoras (MES=${mesNumero}, ANIO=${currentYearOps})`);

        let allData = [];
        let from = 0;
        const batchSize = 1000;
        let moreData = true;

        while (moreData) {

            if (countBadge) countBadge.textContent = `Cargando... (${allData.length})`;

            const { data, error } = await client
                .from('Demoras') // 🔥 YA NO CAMBIA
                .select('*')
                .eq('MES', mesNumero)
                .eq('ANIO', currentYearOps)
                .range(from, from + batchSize - 1);

            if (error) {
                console.error("Supabase error:", error);
                throw error;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += batchSize;

                if (data.length < batchSize) {
                    moreData = false;
                }
            } else {
                moreData = false;
            }

            if (allData.length > 20000) {
                console.warn("Safety break >20k registros");
                moreData = false;
            }
        }

        if (!allData.length) {
            if (countBadge) countBadge.textContent = '0 registros';

            $('#ops-datatable').html(`
                <tbody>
                    <tr>
                        <td colspan="100%" class="text-center text-muted py-5">
                            No se encontraron registros.
                        </td>
                    </tr>
                </tbody>
            `);

            opsRawData = [];
            return;
        }

        opsRawData = allData;
        saveToCache(cacheKey, allData);

        if (countBadge) countBadge.textContent = `${allData.length.toLocaleString()} registros`;

        renderOpsTable(allData);

        const activeMode = document.querySelector('input[name="viewmode"]:checked').id.replace('view-', '');
        if (activeMode !== 'table') {
            window.toggleViewMode(activeMode);
        }

    } catch (err) {
        console.error("Error:", err);

        if (countBadge) countBadge.textContent = 'Error';

        $('#ops-datatable').html(`
            <tbody>
                <tr>
                    <td colspan="100%" class="text-center text-danger py-5">
                        Error al cargar datos: ${err.message}
                    </td>
                </tr>
            </tbody>
        `);
    }
}

// Helpers for Cache
function saveToCache(key, data) {
    try {
        const payload = {
            timestamp: Date.now(),
            data: data
        };
        sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
        console.warn("Storage quota exceeded or error saving cache", e);
    }
}

function getFromCache(key) {
    try {
        const item = sessionStorage.getItem(key);
        if (!item) return null;
        
        const payload = JSON.parse(item);
        // Valid for session
        return payload.data;
    } catch (e) {
        console.error("Cache parse error", e);
        return null;
    }
}

// ── ISO timestamp display helpers ─────────────────────────────────────────
const _ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;
function _fmtIsoDateTime(val) {
    if (!val) return '—';
    const m = String(val).match(_ISO_RE);
    if (!m) return val;
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}
function _fmtIsoTime(val) {
    if (!val) return '—';
    const m = String(val).match(_ISO_RE);
    if (!m) return val;
    return `${m[4]}:${m[5]}`;
}

function _puntualidadBadge(horaProg, horaActual) {
    if (!horaProg || !horaActual || horaProg === horaActual) return '';
    const toMin = v => {
        const si = String(v).match(/T(\d{2}):(\d{2})/);
        if (si) return parseInt(si[1]) * 60 + parseInt(si[2]);
        const sm = String(v).match(/^(\d{2}):(\d{2})/);
        if (sm) return parseInt(sm[1]) * 60 + parseInt(sm[2]);
        return null;
    };
    const mSched  = toMin(horaProg);
    const mActual = toMin(horaActual);
    if (mSched === null || mActual === null) return '';
    const diff = mActual - mSched;
    if (diff < 0)  return `<span class="badge bg-success fw-normal">${Math.abs(diff)} min antes</span>`;
    if (diff === 0) return `<span class="badge bg-success fw-normal">A tiempo</span>`;
    if (diff <= 15) return `<span class="badge bg-warning text-dark fw-normal">+${diff} min</span>`;
    return `<span class="badge bg-danger fw-normal">+${diff} min</span>`;
}

function renderOpsTable(data) {
    if (!data || !data.length) return;

    const getOpsColumnWidth = (key) => {
        const columnKey = String(key || '').toLowerCase();

        if (/fecha|hora|aterrizaje|despegue/.test(columnKey)) return '170px';
        if (/codigo|motivo|observacion|descripcion/.test(columnKey)) return '240px';
        if (/ruta|matricula|vuelo|aerolinea|equipo|avion/.test(columnKey)) return '150px';
        if (/pasajeros|tiempo|demora|minimo|maximo|monto/.test(columnKey)) return '140px';
        return '140px';
    };

    // Format ISO timestamps into readable date/time strings
    const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
    const isTimeOnlyKey = (k) => /^hora/.test(String(k || '').toLowerCase().replace(/[^a-z_]/g, ''));

    function formatOpsValue(key, value) {
        if (value === null || value === undefined || value === '') return '';
        const str = String(value);
        if (!ISO_RE.test(str)) return str;
        // Parse parts directly from the string to avoid TZ shifts
        const [datePart, timePart] = str.split('T');
        const [y, m, d] = datePart.split('-');
        const hhmm = timePart ? timePart.substring(0, 5) : '';
        if (isTimeOnlyKey(key)) return hhmm;          // hora_* columns → HH:MM
        return `${d}/${m}/${y} ${hhmm}`;               // other date/time columns → DD/MM/YYYY HH:MM
    }

    // 1. Dynamic Headers
    const columns = Object.keys(data[0]).map(key => ({
        title: formatHeader(key),
        data: function (row) {
            const value = row ? row[key] : '';
            return formatOpsValue(key, value);
        },
        defaultContent: '',
        className: 'text-center align-middle',
        width: getOpsColumnWidth(key)
    }));

    // 2. Initialize DataTable
    const tableElement = $('#ops-datatable');
    tableElement.css('width', '100%'); // Reset to standard width handling
    tableElement.empty(); // Clear loading message

    // Explicitly destroy if it exists (safety)
    if ($.fn.DataTable.isDataTable('#ops-datatable')) {
        $('#ops-datatable').DataTable().destroy();
    }

    // Clear previous filter elements globally just in case
    $('.excel-filter-dropdown').remove();
    $('.excel-filter-btn').remove();

    opsDataTable = tableElement.DataTable({
        data: data,
        columns: columns,
        destroy: true,
        ordering: false, // Disable column sorting (removes arrows and click-to-sort)
        deferRender: true, // Optimizes rendering speed for large datasets
        processing: true,
        scrollX: true, // This enables horizontal scroll 
        scrollCollapse: true,
        autoWidth: false,
        paging: true,
        stateSave: false, // Don't save state (like width) to avoid corruption
        pageLength: 50,
        lengthMenu: [[25, 50, 100, 500, -1], [25, 50, 100, 500, "Todos"]],
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'print', 'colvis'
        ],
        language: {
             url: "//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json"
        },
        initComplete: function () {
            applyExcelFilters(this.api());

            setTimeout(() => {
                this.api().columns.adjust().draw(false);
            }, 100);
        }
    });

    // Force a re-adjustment when window resize is finished (debounce)
    let resizeTimer;
    $(window).off('resize.opsTable').on('resize.opsTable', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (opsDataTable) {
                opsDataTable.columns.adjust().draw(false);
            }
        }, 100);
    });
}



function formatHeader(key) {
    if(!key) return '';

    const normalizeKey = (value) => String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const headerMap = {
        'aerolinea': 'Aerolínea',
        'numero_vuelo': 'Número de Vuelo',
        'no_vuelo': 'No. Vuelo',
        'matricula': 'Matrícula',
        'tipo_de_avion': 'Tipo de Avión',
        'equipo': 'Equipo',
        'origen': 'Origen',
        'destino': 'Destino',
        'ruta': 'Ruta',
        'fecha': 'Fecha',
        'hora_programada': 'Hora Programada',
        'hora_real': 'Hora Actual',
        'estatus': 'Estatus',
        'demora': 'Demora',
        'tiempo_de_demora': 'Tiempo de Demora',
        'codigo_de_demora': 'Código de Demora',
        'cod_demora': 'Cód. Demora',
        'tipo_operacion': 'Tipo de Operación',
        'pasajeros': 'Pasajeros',
        'domestic_intern': 'Domestic/Intern',
        'llegada_salida': 'Llegada/Salida',
        'nacionalidad': 'Nacionalidad',
        'posicion': 'Posición',
        'plataforma': 'Plataforma',
        'observaciones': 'Observaciones'
    };

    const canonical = normalizeKey(key);
    if (headerMap[canonical]) {
        return headerMap[canonical];
    }

    const minorWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'al', 'por', 'para']);
    const cleaned = String(key)
        .replace(/[_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('es-MX');

    return cleaned
        .split(' ')
        .map((word, index) => {
            if (!word) return word;
            if (index > 0 && minorWords.has(word)) return word;
            return word.charAt(0).toLocaleUpperCase('es-MX') + word.slice(1);
        })
        .join(' ');
}

window.toggleViewMode = function(mode) {
    const tableWrap = document.getElementById('ops-table-wrapper');
    const chartsWrap = document.getElementById('ops-charts-wrapper');

    // Hide all first
    if(tableWrap) tableWrap.classList.add('d-none');
    if(chartsWrap) chartsWrap.classList.add('d-none');

    // Show selected
    if (mode === 'table') {
        if(tableWrap) tableWrap.classList.remove('d-none');
    } else if (mode === 'charts') {
        if(chartsWrap) chartsWrap.classList.remove('d-none');
        if (opsRawData.length > 0) {
            setTimeout(renderOpsCharts, 100); // Small delay to ensure container visible
        }
    }
};

let _chartInstances = {};

let _opsMasterCatalogCache = null;
let _heatmapDetails = null; // stores per-hour+day flight records for cell drill-down
let _heatmapOpsHourDetails = null; // stores per-hour+day ops records for ops-hour heatmap drill-down
let _acMovFlights  = null; // { direction: { acType: [records] } } for aircraft-type bar drilldown
let _posFlights    = null; // { posName: [records] } for positions bar drilldown
let _peakHourFlightsStore = []; // flight records for the peak hour (used by modal drilldown)
let _peakHourLabel = '-';       // e.g. "12:00"

// Week-filter support for heatmaps
let _paxHeatWeeks     = {}; // { '0': all, 'YYYY-MM-DD': week starting that Monday, ... }
let _opsHourHeatWeeks = {}; // same for ops-hour heatmap
let _heatmapHasPax    = false;
const _HEATMAP_HOUR_LABELS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const _HEATMAP_DAY_LABELS  = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Returns a local date string (YYYY-MM-DD) of the Monday that starts the calendar week
// containing the given Date object.  Uses LOCAL date parts to avoid UTC timezone shifts.
function _isoMondayKey(date) {
    const d = new Date(date);
    const dow = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // shift back to Monday
    d.setDate(d.getDate() + diff);
    // Use local year/month/day — NOT toISOString() which converts to UTC
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Builds a human-readable date range label for a calendar week given its Monday key.
// E.g. "03–09 Feb" or "27 Ene–2 Feb" (cross-month).
function _calWeekLabel(mondayKey) {
    const MON = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const [y, m, d] = mondayKey.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);
    const dd1 = String(mon.getDate()).padStart(2, '0');
    const dd2 = String(sun.getDate()).padStart(2, '0');
    if (mon.getMonth() === sun.getMonth()) {
        return `${dd1}–${dd2} ${MON[mon.getMonth()]}`;
    }
    return `${dd1} ${MON[mon.getMonth()]}–${dd2} ${MON[sun.getMonth()]}`;
}

// Returns array of 7 local day-of-month numbers [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
// for the calendar week whose Monday is given as "YYYY-MM-DD".
function _weekDayNumbers(mondayKey) {
    const [y, m, d] = mondayKey.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i).getDate());
}

// ── Peak-hour drilldown modal ─────────────────────────────────────────────────
function _showPeakHourModal() {
    const flights = _peakHourFlightsStore;
    const hourLabel = _peakHourLabel;
    const nextH = hourLabel !== '-' ? String(Number(hourLabel.split(':')[0]) + 1).padStart(2,'0') + ':00' : '';
    const fmt = n => Number(n).toLocaleString('en-US');

    const isCargoFlight = f => /cargo|freight|carga|freighter/i.test(f.svcCat || f.servicio || '');
    const paxFlights   = flights.filter(f => !isCargoFlight(f));
    const cargoFlights = flights.filter(isCargoFlight);

    const MOV_BADGE = { 'Aterrizaje': 'bg-primary', 'Despegue': 'bg-success', 'Desconocido': 'bg-secondary' };

    const buildRows = list => list.map(f => {
        const movBadge = MOV_BADGE[f.movimiento] || 'bg-secondary';
        const movIcon  = f.movimiento === 'Aterrizaje' ? '&#9660;' : f.movimiento === 'Despegue' ? '&#9650;' : '&mdash;';
        return `<tr>
            <td class="fw-semibold">${f.vuelo || '&mdash;'}</td>
            <td>${f.aerolinea || '&mdash;'}</td>
            <td>${f.origen || '&mdash;'} &rarr; ${f.destino || '&mdash;'}</td>
            <td><span class="badge ${movBadge}" style="font-size:.7rem">${movIcon} ${f.movimiento || '?'}</span></td>
            <td>${f.aeronave || '&mdash;'}</td>
            <td class="text-end">${f.pax > 0 ? fmt(f.pax) : '&mdash;'}</td>
            <td><small class="text-muted">${f.hora || '&mdash;'}</small></td>
        </tr>`;
    }).join('');

    const tableHTML = (title, color, icon, list) => list.length === 0 ? '' : `
        <div class="mb-3">
            <div class="fw-semibold mb-1" style="color:${color};font-size:.85rem"><i class="fas ${icon} me-1"></i>${title} <span class="badge" style="background:${color};font-size:.7rem">${fmt(list.length)}</span></div>
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0" style="font-size:.78rem">
                    <thead class="table-light"><tr>
                        <th>Vuelo</th><th>Aerolínea</th><th>Ruta</th><th>Mov.</th><th>Aeronave</th><th class="text-end">Pax</th><th>Hora</th>
                    </tr></thead>
                    <tbody>${buildRows(list)}</tbody>
                </table>
            </div>
        </div>`;

    const modalId = '_peak-hour-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header" style="background:linear-gradient(135deg,#fffbeb,#fef3c7)">
                        <div>
                            <h5 class="modal-title fw-bold mb-0"><i class="fas fa-clock text-warning me-2"></i>Vuelos en Hora Pico: <span id="_phm-title"></span></h5>
                            <div class="text-muted" style="font-size:.75rem" id="_phm-sub"></div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="_phm-body"></div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('_phm-title').textContent = `${hourLabel}–${nextH}`;
    document.getElementById('_phm-sub').textContent =
        `${fmt(flights.length)} operaciones totales · ${fmt(paxFlights.length)} pasajeros · ${fmt(cargoFlights.length)} carga`;
    document.getElementById('_phm-body').innerHTML =
        (paxFlights.length === 0 && cargoFlights.length === 0 ? tableHTML('Todas las operaciones', '#374151', 'fa-plane', flights) : '') +
        tableHTML('Vuelos de Pasajeros', '#2563eb', 'fa-users', paxFlights) +
        tableHTML('Vuelos de Carga', '#d97706', 'fa-boxes', cargoFlights);

    const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
    bsModal.show();
}


function _parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function _parseCsvText(text) {
    const lines = String(text || '')
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    if (!lines.length) return [];

    const headers = _parseCsvLine(lines[0]);
    return lines.slice(1).map(line => {
        const cols = _parseCsvLine(line);
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = cols[idx] ?? '';
        });
        return row;
    });
}

async function _loadOpsMasterCatalogs() {
    if (_opsMasterCatalogCache) return _opsMasterCatalogCache;

    const files = {
        airlines: 'data/master/airlines.csv',
        airports: 'data/master/airports.csv',
        aircraftTypes: 'data/master/aircraft type.csv',
        aircraftRegs: 'data/master/aircraft.csv',
        flightServiceType: 'data/master/flightservicetype.csv',
        delay: 'data/master/delay.csv',
        stands: 'data/master/stand.csv'
    };

    const fetchCsv = async (url) => {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo cargar catálogo: ${url}`);
        return _parseCsvText(await response.text());
    };

    const [airlinesRows, airportsRows, aircraftRows, aircraftRegRows, serviceRows, delayRows, standsRows] = await Promise.all([
        fetchCsv(files.airlines),
        fetchCsv(files.airports),
        fetchCsv(files.aircraftTypes),
        fetchCsv(files.aircraftRegs).catch(() => []),
        fetchCsv(files.flightServiceType),
        fetchCsv(files.delay),
        fetchCsv(files.stands).catch(() => [])
    ]);

    const airlinesMap = {};
    airlinesRows.forEach(row => {
        const code = String(row.IATA || '').trim().toUpperCase();
        if (code) airlinesMap[code] = row.Name || code;
    });

    const airportsMap = {};
    airportsRows.forEach(row => {
        const iata = String(row.IATA || '').trim().toUpperCase();
        if (!iata) return;
        airportsMap[iata] = {
            name: row.Name || iata,
            country: (row.Country || '').trim(),
            city: (row.City || '').trim(),
            securityLevel: (row['Security level'] || '').trim()
        };
    });

    const aircraftMap = {};
    aircraftRows.forEach(row => {
        const iata = String(row['IATA code   '] || row['IATA code'] || '').trim().toUpperCase();
        if (!iata) return;
        aircraftMap[iata] = {
            name: row.Name || iata,
            group: row['Aircraft Type Groups'] || row['Design Group'] || ''
        };
    });

    // Registration → aircraft type code lookup (from aircraft.csv)
    // e.g. "XAVBZ" → "32Q", "N851GT" → "74N"
    const registrationMap = {};
    aircraftRegRows.forEach(row => {
        const reg  = String(row.Registration || '').trim().toUpperCase().replace(/[-\s]/g, '');
        const type = String(row['Aircraft Type'] || '').trim().toUpperCase();
        if (reg && type) registrationMap[reg] = type;
    });

    const serviceTypeMap = {};
    serviceRows.forEach(row => {
        const code = String(row.Code || '').trim().toUpperCase();
        if (!code) return;
        serviceTypeMap[code] = {
            category: row.Category || 'Otros',
            operationType: row['Type of operation'] || 'No definido',
            description: row.Description || ''
        };
    });

    const delayMap = {};
    delayRows.forEach(row => {
        const alpha   = String(row['Alpha code']   || '').trim().toUpperCase();
        const numeric = String(row['Numeric code'] || '').trim();
        const entry = {
            summary:     (row.Summary     || '').trim(),
            description: (row.Description || '').trim(),
            category:    (row.Category    || 'Otros').trim(),
            alpha, numeric
        };
        if (alpha)   delayMap[alpha]   = entry;
        if (numeric) delayMap[numeric] = entry;
    });

    const standsMap = {};
    standsRows.forEach(row => {
        const name = String(row.Name || '').trim();
        if (!name) return;
        const groups = String(row['Stand groups'] || '').toLowerCase();
        const type = String(row['Stand type'] || '').trim();
        let category;
        if (type === 'Hangar') category = 'Hangar';
        else if (type === 'Taxiway') category = 'Calle de Rodaje';
        else if (groups.includes('semi contact')) category = 'Semicontacto';
        else if (type === 'Contact' && groups.includes('international')) category = 'Contacto Internacional';
        else if (type === 'Contact') category = 'Contacto';
        else category = 'Remota';
        standsMap[name] = { type, category, groups: row['Stand groups'] || '' };
    });

    _opsMasterCatalogCache = {
        airlinesMap,
        airportsMap,
        aircraftMap,
        registrationMap,
        serviceTypeMap,
        delayMap,
        standsMap
    };

    return _opsMasterCatalogCache;
}

function _ensureOpsAdvancedStatsUi() {
    const wrap = document.getElementById('ops-charts-wrapper');
    if (!wrap) return;
    const row = wrap.querySelector('.row.g-3');
    if (!row) return;
    if (document.getElementById('ops-advanced-stats-anchor')) return;

    const anchor = document.createElement('div');
    anchor.id = 'ops-advanced-stats-anchor';
    anchor.className = 'col-12';
    anchor.innerHTML = `
        <hr class="my-1">
    `;
    row.appendChild(anchor);

    const kpiContainer = document.createElement('div');
    kpiContainer.className = 'col-12';
    kpiContainer.innerHTML = `
        <div class="row g-3">
            <div class="col-md-2">
                <div class="card h-100 border-0 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:32px;height:32px;border-radius:8px;background:#fef2f2;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas fa-hourglass-half text-danger" style="font-size:.8rem"></i>
                        </div>
                        <div style="font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;font-weight:600">Demora promedio</div>
                    </div>
                    <div class="fw-bold text-danger" style="font-size:1.7rem" id="kpi-avg-delay">-</div>
                    <div class="text-muted" style="font-size:.71rem">minutos por vuelo demorado</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100 border-0 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:32px;height:32px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas fa-check-circle text-success" style="font-size:.8rem"></i>
                        </div>
                        <div style="font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;font-weight:600">% A tiempo (≤15 min)</div>
                    </div>
                    <div class="fw-bold text-success" style="font-size:1.7rem" id="kpi-on-time-rate">-</div>
                    <div class="text-muted" style="font-size:.71rem" id="kpi-on-time-detail">de vuelos con registro de demora</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card h-100 border-0 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:32px;height:32px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas fa-exclamation-triangle text-warning" style="font-size:.8rem"></i>
                        </div>
                        <div style="font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;font-weight:600">Causa de demora #1</div>
                    </div>
                    <div class="fw-bold text-warning" style="font-size:.85rem;line-height:1.3" id="kpi-top-delay-cause">-</div>
                    <div class="text-muted" style="font-size:.71rem" id="kpi-top-delay-count">— ocurrencias</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:32px;height:32px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas fa-calendar-week text-primary" style="font-size:.8rem"></i>
                        </div>
                        <div style="font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;font-weight:600">Semana pico (pax)</div>
                    </div>
                    <div class="fw-bold text-primary" style="font-size:.9rem;line-height:1.3" id="kpi-peak-week-passengers">-</div>
                    <div class="text-muted" style="font-size:.71rem">semana con más pasajeros del período</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm p-3">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <div style="width:32px;height:32px;border-radius:8px;background:#faf5ff;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas fa-route text-purple" style="font-size:.8rem;color:#7c3aed"></i>
                        </div>
                        <div style="font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;font-weight:600">Ruta más operada</div>
                    </div>
                    <div class="fw-bold" style="font-size:.9rem;line-height:1.3;color:#7c3aed" id="kpi-top-route">-</div>
                    <div class="text-muted" style="font-size:.71rem" id="kpi-top-route-count">— vuelos en el período</div>
                </div>
            </div>
        </div>
    `;
    row.appendChild(kpiContainer);

    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'col-12';
    chartsContainer.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">Demoras por Categoría</div>
                    <div class="card-body" id="delay-cat-body" style="position:relative;min-height:300px;">
                        <canvas id="chart-delay-categories"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">Aerolíneas (Top 10)</div>
                    <div class="card-body" style="position:relative;min-height:300px;">
                        <canvas id="chart-airline-share"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold" data-chart-header="weekly-passengers">Pasajeros por Semana</div>
                    <div class="card-body" style="position:relative;min-height:300px;">
                        <canvas id="chart-weekly-passengers"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-12">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold" data-chart-header="heatmap">Mapa de Calor de Pasajeros (Hora x Día)</div>
                    <div class="card-body" id="ops-passenger-heatmap"></div>
                </div>
            </div>
            <div class="col-12">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">Mapa de Calor de Operaciones por Hora <small class="text-muted fw-normal">(excluye cancelados y no operativos)</small></div>
                    <div class="card-body" id="ops-hour-heatmap"></div>
                </div>
            </div>
            <div class="col-12" id="chart-ac-direction-col">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">Aterrizajes y Despegues por Tipo de Aeronave</div>
                    <div class="card-body" id="ac-dir-body" style="position:relative;min-height:400px;">
                        <canvas id="chart-ac-direction"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-12" id="chart-ac-airline-col">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">Tipos de Aeronave por Aerolínea</div>
                    <div class="card-body" id="ac-airline-body" style="position:relative;min-height:400px;">
                        <canvas id="chart-ac-airline"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
    row.appendChild(chartsContainer);

    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'col-12';
    summaryContainer.innerHTML = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-bold">Resumen Interpretativo</div>
            <div class="card-body" id="ops-advanced-summary"></div>
        </div>
    `;
    row.appendChild(summaryContainer);
}

async function renderOpsCharts() {
    console.log("renderOpsCharts called");
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        // Fallback for user
        const wrap = document.getElementById('ops-charts-wrapper');
        if(wrap) wrap.innerHTML = '<div class="alert alert-warning">Librería de Gráficos no cargada. Por favor recargue la página.</div>';
        return;
    }
    const data = opsRawData;
    if (!data || data.length === 0) {
        console.warn("No data for charts");
        return;
    }

    try {
        _ensureOpsAdvancedStatsUi();
        const catalogs = await _loadOpsMasterCatalogs();

        // Helper to extract keys safely — strips accents, normalizes / and spaces to _, case-insensitive, partial match
        const normalizeStr = (s) => String(s).normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[\/\s]+/g, '_')
            .toLowerCase().trim();
        const getKey = (...terms) => {
            const keys = Object.keys(data[0]);
            for (const term of terms) {
                const t = normalizeStr(term);
                // Exact match (normalized)
                let k = keys.find(k => normalizeStr(k) === t);
                if (k) return k;
                // Partial match (normalized)
                k = keys.find(k => normalizeStr(k).includes(t));
                if (k) return k;
            }
            return undefined;
        };

        const allKeys = Object.keys(data[0]);
        console.log('[renderOpsCharts] Columnas de la tabla:', allKeys);

        // Date: try many possible column name patterns
        const kFecha = getKey('fecha', 'estatus_fecha', 'date', 'aterrizaje', 'despegue',
                              'programada', 'horario', 'std', 'sta', 'sobt', 'sibt',
                              'hora_programada', 'hora_real', 'created_at');
        // kHora: used for date/time extraction in parseDateFromRecord — keep original priority
        // so a full-datetime column (e.g. "Hora") is preferred over a time-only column
        let kHora = getKey('hora', 'time', 'hh', 'hora_prog', 'hora_real');
        if (kHora === kFecha) kHora = undefined; // avoid using same col twice

        // kHoraActual: dedicated column for the ACTUAL hour shown in the heatmap and hoursMap
        // This is separate so it can point to "Hora actual" (time-only) without breaking date parsing
        const kHoraActual = getKey('hora_actual', 'hora_real_local', 'hora_aterrizaje', 'hora_despegue');
        // If it turned out the same column as kFecha or kHora, ignore it (avoid duplicate use)
        // We want it to be a truly separate column

        const kPos = getKey('posicion', 'pos', 'platform', 'stand', 'plataforma');
        // Registration (matricula) vs aircraft type — intentionally kept separate
        const kMatricula = getKey('matricula', 'registro', 'equipo', 'equip', 'tail', 'aircraft_reg');
        const kTipoAc    = getKey('tipo_aeronave', 'tipo_avion', 'tipo_equipo', 'actype', 'aircraft_type',
                                   'tipo_eq', 'equipo_icao', 'icao_type', 'tipo_ac', 'tipo');
        // Keep kEquipo as the best guess for equipment (used by existing doughnut chart)
        const kEquipo = kTipoAc || kMatricula;
        const kAerolinea = getKey('aerolinea', 'aerol', 'airline', 'carrier');
        const kOrigen = getKey('origen', 'origin');
        const kDestino = getKey('destino', 'destination');
        const kDelayCode = getKey('codigo_de_demora', 'cod_demora', 'demora_codigo', 'delay_code', 'codigo');
        const kDelayMin = getKey('tiempo_de_demora', 'demora_min', 'minutos', 'delay_min', 'tiempo');
        const kServiceCode = getKey('servicio', 'tipo_de_servicio', 'service', 'tipo_servicio', 'service_type');
        const kPasajeros = getKey('pasajeros', 'pax', 'passengers');
        // Movement: 'llegada_salida' first — the slash-normalization in getKey converts
        // "Llegada/Salida" → "llegada_salida" so it matches exactly.
        const kMovimiento = getKey('llegada_salida', 'tipo_movimiento', 'tipo_vuelo',
                                   'movimiento', 'tipo_oper', 'tipo_op', 'movement',
                                   'direction', 'llegada', 'op_type');
        const kVuelo = getKey('vuelo', 'numero_vuelo', 'flight', 'flight_number',
                              'nro_vuelo', 'num_vuelo', 'nrovuelo', 'flight_no', 'flt_no');
        // Find the column that actually contains 'CANCELADO' by scanning all rows and columns.
        // This is more reliable than getKey() because the column name varies between tables.
        const allColKeys = Object.keys(data[0]);
        let kEstatus = getKey('demoras', 'estatus', 'status', 'estado', 'estatus_vuelo', 'flight_status');
        if (!kEstatus) {
            // Fallback: scan all rows to find whichever column has 'CANCELADO'
            kEstatus = allColKeys.find(col =>
                data.some(r => /^CANCELAD[AO]$/i.test(String(r[col] || '').trim()))
            );
        }

        const isCancelled = (r) => /^CANCELAD[AO]$/i.test(String(r[kEstatus] || '').trim());

        // Exclude cancelled flights from ALL analysis
        const activeData = kEstatus
            ? data.filter(r => !isCancelled(r))
            : data;
        const cancelledCount = data.length - activeData.length;
        console.log(`[renderOpsCharts] kEstatus="${kEstatus}" | Cancelados excluidos: ${cancelledCount} de ${data.length}`);

        // For the operations heatmap — also exclude non-operational flights
        const isNonOperational = (r) => /NO[\s._-]?OPERAT/i.test(String(r[kEstatus] || '').trim());
        const opsCleanData = activeData.filter(r => !isNonOperational(r));
        console.log(`[renderOpsCharts] opsCleanData (excl. cancel + no-op): ${opsCleanData.length}`);

        console.log('[renderOpsCharts] Keys detectadas:', {kFecha, kHora, kHoraActual, kPos, kMatricula, kTipoAc, kEquipo, kAerolinea, kMovimiento, kVuelo, kEstatus});

        // Stats
        let totalOps = activeData.length;
        let daysMap = {};
        let hoursMap = {};
        let hourPaxMap = {}; // { hourKey: totalPax } for peak-hour pax average
        let hourFlights = {}; // { hourKey: [records] } for peak-hour drilldown modal
        let posMap = {};
        let posTypeMap = {}; // { categoryLabel: totalCount }
        let simultMap  = {}; // { "HH:MM": count } — 10-min slot → total ops, all days
        let posFlights        = {};  // { posName: [records] } for position drilldown
        let acMovFlightsLocal = {};  // { direction: { acType: [records] } } for aircraft drilldown
        let eqMap = {};
        let airlineMap = {};
        let internationalOps = 0;
        let domesticOps = 0;
        let delayByCategory = {};
        let delayCodeCount = {};
        let serviceCategoryCount = {};
        let routeMap = {};
        let weeklyPassengers = {};
        let heatmapPassengers = {};
        let heatmapDetails    = {}; // { hourKey: { dayIndex: [flight records] } }
        let weeklyOps = {};       // fallback: ops per week when no pax
        let heatmapOps = {};      // fallback: ops per hour-day when no pax
        let heatmapOpsHour = {};        // ops-only heatmap (excl. cancelled + no-op): { hourKey: Array(7) }
        let heatmapOpsHourDetails = {}; // drill-down records for ops heatmap: { hourKey: { dayIndex: [records] } }
        // Per-week accumulators for filter buttons
        let heatmapPassengersByWeek = {}; // { weekNum: { hour: Array(7) } }
        let heatmapDetailsByWeek    = {}; // { weekNum: { hour: { dayIdx: [records] } } }
        let heatmapOpsByWeek        = {}; // fallback when no pax data
        let heatmapOpsHourByWeek        = {};
        let heatmapOpsHourDetailsByWeek = {};

        const parseDelayMinutes = (value) => {
            if (value === null || value === undefined) return null;
            const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
            if (!match) return null;
            const parsed = Number(match[0]);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const parsePassengers = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const clean = String(value).replace(/[^\d.-]/g, '');
            const parsed = Number(clean);
            return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
        };

        const parseDateFromRecord = (row) => {
            // Use kFecha first; use kHora as fallback if it contains a datetime
            const rawFecha = kFecha && row[kFecha] ? String(row[kFecha]).trim() : '';
            const rawHora  = kHora  && row[kHora]  ? String(row[kHora]).trim()  : '';
            // Pick the source that contains a 4-digit OR 2-digit year (e.g. DD/MM/YY)
            const has4DigitYear = (s) => /\d{4}/.test(s);
            const has2DigitSlash = (s) => /\d{2}\/\d{2}\/\d{2}(?!\d)/.test(s);
            let src;
            if (has4DigitYear(rawFecha)) {
                src = rawFecha;
            } else if (has4DigitYear(rawHora)) {
                src = rawHora;
            } else if (has2DigitSlash(rawFecha)) {
                src = rawFecha; // DD/MM/YY — handled below
            } else if (has2DigitSlash(rawHora)) {
                src = rawHora;
            } else {
                src = rawFecha;
            }

            let dateObj = null;
            let hourFromObj = null; // set when the Date object already carries correct local hour

            // DD/MM/YYYY or DD/MM/YYYY HH:mm — parse as local time, no timezone shift
            const slashMatch = src.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (slashMatch) {
                dateObj = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
            } else {
                // DD/MM/YY (2-digit year) — e.g. 01/02/25 → February 1, 2025
                const slashMatch2 = src.match(/(\d{2})\/(\d{2})\/(\d{2})(?!\d)/);
                if (slashMatch2) {
                    const yy = Number(slashMatch2[3]);
                    // Pivot: 00-49 → 2000s, 50-99 → 1900s (standard 2-digit year rule)
                    const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
                    dateObj = new Date(yyyy, Number(slashMatch2[2]) - 1, Number(slashMatch2[1]));
                }
            }
            if (!dateObj && src.includes('-')) {
                // ISO: YYYY-MM-DD or YYYY-MM-DDTHH:mm[Z|±HH:mm]
                const parsed = new Date(src);
                if (!Number.isNaN(parsed.getTime())) {
                    dateObj = parsed;
                    // If the raw string has an explicit timezone (Z or ±offset), the browser
                    // already converted to LOCAL time — use getHours() directly to avoid
                    // re-reading the UTC hour from the string (which would be wrong in UTC-6, etc.)
                    if (/Z$|[+-]\d{2}:\d{2}$/.test(src.trim())) {
                        hourFromObj = parsed.getHours();
                    }
                }
            } else if (src.match(/\d{1,2}[A-Za-z]{3}\d{2,4}/)) {
                // AIMS format: 01FEB26 or 01FEB2026
                const aimsParsed = new Date(src.replace(/(\d{1,2})([A-Za-z]{3})(\d{2,4})/, '$1 $2 $3'));
                if (!Number.isNaN(aimsParsed.getTime())) dateObj = aimsParsed;
            }

            if (!dateObj || Number.isNaN(dateObj.getTime())) return null;

            let hour;
            if (hourFromObj !== null) {
                // Timezone-aware ISO string — Date object already holds correct local hour
                hour = hourFromObj;
            } else {
                // Extract hour: prefer "Hora actual" column (time-only, most precise),
                // then fall back to finding HH:MM in the main date/time strings
                const rawHoraActual = kHoraActual && row[kHoraActual] ? String(row[kHoraActual]).trim() : '';
                const hhFromActual = (rawHoraActual.match(/(\d{1,2}):(\d{2})/) || [])[1];
                const hhFromFecha  = (src.match(/(\d{1,2}):(\d{2})/) || [])[1];
                const hhFromHora   = (rawHora.match(/(\d{1,2}):(\d{2})/) || [])[1];
                hour = Number(hhFromActual ?? hhFromHora ?? hhFromFecha ?? '0') || 0;
            }
            dateObj.setHours(Math.max(0, Math.min(23, hour)), 0, 0, 0);
            return dateObj;
        };

        let delayMinutesTotal = 0;
        let delayMinutesCount = 0;
        let onTimeCount = 0;
        let totalPassengers = 0;
        // Aircraft charts
        const aircraftByDirection = { 'Aterrizaje': {}, 'Despegue': {} };
        const aircraftByAirline   = {}; // airline label → { acType: count }
        // Per-direction, per-type, per-service breakdown (for two separate charts + filter)
        const acMovData   = {};  // { direction: { acType: { serviceLabel: count } } }
        const acServiceSet = new Set(); // all unique service labels seen

        activeData.forEach(r => {
            const pax = kPasajeros ? parsePassengers(r[kPasajeros]) : 0;
            totalPassengers += pax;

            const rowDate = parseDateFromRecord(r);
            if (rowDate) {
                // Calendar week key = ISO date of the Monday that starts this week (Mon–Sun)
                const weekKey = _isoMondayKey(rowDate);
                weeklyPassengers[weekKey] = (weeklyPassengers[weekKey] || 0) + pax;
                weeklyOps[weekKey] = (weeklyOps[weekKey] || 0) + 1;

                const day = rowDate.getDay(); // 0=Domingo ... 6=Sábado
                const dayIndex = day === 0 ? 6 : day - 1; // Lunes=0 ... Domingo=6
                const hourKey = String(rowDate.getHours()).padStart(2, '0');
                if (!heatmapPassengers[hourKey]) heatmapPassengers[hourKey] = Array(7).fill(0);
                heatmapPassengers[hourKey][dayIndex] += pax;
                // Accumulate flight details for cell drill-down
                if (!heatmapDetails[hourKey]) heatmapDetails[hourKey] = {};
                if (!heatmapDetails[hourKey][dayIndex]) heatmapDetails[hourKey][dayIndex] = [];
                const _hmRec = {
                    vuelo:      kVuelo       ? String(r[kVuelo]       || '').trim() : '',
                    aerolinea:  kAerolinea   ? String(r[kAerolinea]   || '').trim() : '',
                    origen:     kOrigen      ? String(r[kOrigen]      || '').trim() : '',
                    destino:    kDestino     ? String(r[kDestino]     || '').trim() : '',
                    movimiento: kMovimiento  ? String(r[kMovimiento]  || '').trim() : '',
                    servicio:   kServiceCode ? String(r[kServiceCode] || '').trim() : '',
                    aeronave:   kMatricula   ? String(r[kMatricula]   || '').trim() :
                                (kTipoAc    ? String(r[kTipoAc]      || '').trim() : ''),
                    fecha:      kFecha       ? String(r[kFecha]       || '').trim() : '',
                    hora:       kHoraActual  ? String(r[kHoraActual]  || '').trim() :
                                (kHora       ? String(r[kHora]        || '').trim() : ''),
                    horaProg:   kFecha       ? String(r[kFecha]       || '').trim() : '',
                    pax
                };
                heatmapDetails[hourKey][dayIndex].push(_hmRec);
                // Per-week bucketing (passenger + ops fallback) — keyed by Monday ISO date
                if (!heatmapPassengersByWeek[weekKey]) heatmapPassengersByWeek[weekKey] = {};
                if (!heatmapPassengersByWeek[weekKey][hourKey]) heatmapPassengersByWeek[weekKey][hourKey] = Array(7).fill(0);
                heatmapPassengersByWeek[weekKey][hourKey][dayIndex] += pax;
                if (!heatmapDetailsByWeek[weekKey]) heatmapDetailsByWeek[weekKey] = {};
                if (!heatmapDetailsByWeek[weekKey][hourKey]) heatmapDetailsByWeek[weekKey][hourKey] = {};
                if (!heatmapDetailsByWeek[weekKey][hourKey][dayIndex]) heatmapDetailsByWeek[weekKey][hourKey][dayIndex] = [];
                heatmapDetailsByWeek[weekKey][hourKey][dayIndex].push(_hmRec);
                if (!heatmapOps[hourKey]) heatmapOps[hourKey] = Array(7).fill(0);
                heatmapOps[hourKey][dayIndex] += 1;
                if (!heatmapOpsByWeek[weekKey]) heatmapOpsByWeek[weekKey] = {};
                if (!heatmapOpsByWeek[weekKey][hourKey]) heatmapOpsByWeek[weekKey][hourKey] = Array(7).fill(0);
                heatmapOpsByWeek[weekKey][hourKey][dayIndex] += 1;
            }

            // Date — normalize to date-only key using parseDateFromRecord
            const rowDateForMap = parseDateFromRecord(r);
            if (rowDateForMap) {
                const d = rowDateForMap;
                const dateKey = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
                daysMap[dateKey] = (daysMap[dateKey] || 0) + 1;
            }
            // Hour (HH) — prefer kHoraActual ("Hora actual") for the hoursMap bucket
            const horaActualRaw = kHoraActual && r[kHoraActual] ? String(r[kHoraActual]).trim() : '';
            const horaFallbackRaw = kHora && r[kHora] ? String(r[kHora]).trim() : '';
            const horaSource = horaActualRaw || horaFallbackRaw;
            let _hourKey = null; // will be set below for use at end of loop
            if (horaSource) {
                let hStr = horaSource;
                // Si es ISO timestamp (2026-03-16T18:00:00Z) extraer solo la parte de tiempo
                if (hStr.includes('T')) hStr = hStr.split('T')[1] || hStr;
                let h = hStr.includes(':') ? hStr.split(':')[0] : hStr.substring(0, 2);
                h = h.trim();
                if (h.length === 1) h = '0' + h;
                if (!isNaN(parseInt(h))) {
                    hoursMap[h] = (hoursMap[h] || 0) + 1;
                    hourPaxMap[h] = (hourPaxMap[h] || 0) + pax;
                    _hourKey = h;
                }
                // 10-min slot for simultaneous ops analysis (±5 min window)
                const mMatch = horaSource.match(/(\d{1,2}):(\d{2})/);
                if (mMatch) {
                    const sH = parseInt(mMatch[1], 10);
                    const sM = Math.floor(parseInt(mMatch[2], 10) / 10) * 10;
                    const slotKey = `${String(sH).padStart(2,'0')}:${String(sM).padStart(2,'0')}`;
                    simultMap[slotKey] = (simultMap[slotKey] || 0) + 1;
                }
            }
            // Pos — skip empty/null/dash-only values (cancelled or unassigned flights)
            const _rawPos = kPos ? String(r[kPos] || '').trim() : '';
            if(_rawPos && !/^[-—–\s.]+$/.test(_rawPos)) {
                posMap[_rawPos] = (posMap[_rawPos] || 0) + 1;
                // Accumulate by position category
                const _sm = catalogs.standsMap || {};
                const _posCat = (_sm[_rawPos] && _sm[_rawPos].category) || 'Sin clasificar';
                posTypeMap[_posCat] = (posTypeMap[_posCat] || 0) + 1;
                if (!posFlights[_rawPos]) posFlights[_rawPos] = [];
                posFlights[_rawPos].push({
                    vuelo:      kVuelo       ? String(r[kVuelo]       || '').trim() : '',
                    aerolinea:  kAerolinea   ? String(r[kAerolinea]   || '').trim() : '',
                    origen:     kOrigen      ? String(r[kOrigen]      || '').trim() : '',
                    destino:    kDestino     ? String(r[kDestino]     || '').trim() : '',
                    movimiento: kMovimiento  ? String(r[kMovimiento]  || '').trim() : '',
                    servicio:   kServiceCode ? String(r[kServiceCode] || '').trim() : '',
                    aeronave:   kTipoAc      ? String(r[kTipoAc]     || '').trim() :
                                (kMatricula  ? String(r[kMatricula]   || '').trim() : ''),
                    fecha:      kFecha       ? String(r[kFecha]       || '').trim() : '',
                    hora:       kHoraActual  ? String(r[kHoraActual]  || '').trim() :
                                (kHora       ? String(r[kHora]        || '').trim() : ''),
                    horaProg:   kFecha       ? String(r[kFecha]       || '').trim() : '',
                    pax:        kPasajeros   ? parsePassengers(r[kPasajeros]) : 0,
                    estatus:    kEstatus     ? String(r[kEstatus]     || '').trim() : ''
                });
            }
            // Registration & aircraft type — use separate columns when available
            const rawMatricula = kMatricula && r[kMatricula] ? String(r[kMatricula]).trim() : '';
            const rawTipoRaw   = kTipoAc   && r[kTipoAc]   ? String(r[kTipoAc]).trim()   : '';
            // Normalize registration (remove hyphens/spaces for catalog lookup)
            const regKey = rawMatricula.toUpperCase().replace(/[-\s]/g, '');

            // Resolve aircraft type code:
            // 1) Dedicated type column (kTipoAc)
            // 2) Look up registration in aircraft.csv catalog
            // 3) Try aircraftMap directly on the registration (some tables store type in equipment field)
            let resolvedTypeCode = '';
            if (rawTipoRaw) {
                resolvedTypeCode = rawTipoRaw.toUpperCase();
            } else if (regKey && catalogs.registrationMap[regKey]) {
                resolvedTypeCode = catalogs.registrationMap[regKey]; // e.g. "XAVBZ" → "32Q"
            } else if (rawMatricula && catalogs.aircraftMap[rawMatricula.toUpperCase()]) {
                resolvedTypeCode = rawMatricula.toUpperCase(); // raw value is already a type code
            }

            // Use the short IATA type code as label (e.g. "320", "73H", "E90")
            // Full name from catalog is used in tooltips
            const acTypeLabel    = resolvedTypeCode || '';
            const acTypeLongName = resolvedTypeCode
                ? (catalogs.aircraftMap[resolvedTypeCode]?.name || resolvedTypeCode)
                : '';

            // Legacy eqMap (used by existing doughnut chart)  — prefer type over registration
            const rawEq = resolvedTypeCode || rawMatricula;
            if (rawEq) {
                const eqLabel = catalogs.aircraftMap[rawEq.toUpperCase()]?.name || rawEq;
                eqMap[eqLabel] = (eqMap[eqLabel] || 0) + 1;
            }
            // Airline
            let airlineLabel = '';
            if(kAerolinea && r[kAerolinea]) {
                const airlineCode = String(r[kAerolinea]).trim().toUpperCase();
                airlineLabel = catalogs.airlinesMap[airlineCode] || airlineCode;
                airlineMap[airlineLabel] = (airlineMap[airlineLabel] || 0) + 1;
            }

            // ── Infer movement direction ──────────────────────────────────────
            // Priority 1: dedicated movement column
            // Priority 2: MMMX in origin (departure) or destination (arrival)
            // Priority 3: 'Desconocido'
            let movDirection = null;
            if (kMovimiento && r[kMovimiento]) {
                const mov = String(r[kMovimiento]).trim().toUpperCase();
                // Match common Spanish/English values and single-letter codes (L=Llegada, S=Salida)
                if (/^(L$|LL|LLD|ARR|ARRIV|ATERR|LLEGADA|ENTRADA|ARRIVAL|LAND)/.test(mov)) movDirection = 'Aterrizaje';
                else if (/^(S$|SAL|DEP|DES|DESP|SALIDA|DEPARTURE|TAKE)/.test(mov)) movDirection = 'Despegue';
                // Do NOT use raw value as direction — prevents aircraft type codes leaking in
            }
            if (!movDirection) {
                const origin = kOrigen && r[kOrigen] ? String(r[kOrigen]).trim().toUpperCase() : '';
                const dest   = kDestino && r[kDestino] ? String(r[kDestino]).trim().toUpperCase() : '';
                if (origin === 'MMMX' || origin === 'MMTO') movDirection = 'Despegue';
                else if (dest === 'MMMX' || dest === 'MMTO') movDirection = 'Aterrizaje';
            }
            const direction = movDirection || 'Desconocido';

            // Resolve service: keep raw code (e.g. "J", "F") for the aircraft filter
            // and also resolve category for serviceCategoryCount / summary
            let svcCode     = '';   // raw code: "J", "F", …
            let svcCategory = '';   // category: "Scheduled", "Others", …
            if (kServiceCode && r[kServiceCode]) {
                svcCode = String(r[kServiceCode]).trim().toUpperCase();
                if (svcCode) {
                    const sRef = catalogs.serviceTypeMap[svcCode];
                    svcCategory = sRef?.category || svcCode;
                }
            }

            // Aircraft by direction — Y axis = aircraft TYPE, datasets = Aterrizaje / Despegue
            if (acTypeLabel) {
                if (!aircraftByDirection[direction]) aircraftByDirection[direction] = {};
                aircraftByDirection[direction][acTypeLabel] = (aircraftByDirection[direction][acTypeLabel] || 0) + 1;

                // Also populate the per-service breakdown keyed by RAW CODE ("J", "F", …)
                const svcKey = svcCode || '(Sin servicio)';
                if (!acMovData[direction]) acMovData[direction] = {};
                if (!acMovData[direction][acTypeLabel]) acMovData[direction][acTypeLabel] = {};
                acMovData[direction][acTypeLabel][svcKey] = (acMovData[direction][acTypeLabel][svcKey] || 0) + 1;
                // Store individual records for bar drilldown
                if (!acMovFlightsLocal[direction]) acMovFlightsLocal[direction] = {};
                if (!acMovFlightsLocal[direction][acTypeLabel]) acMovFlightsLocal[direction][acTypeLabel] = [];
                acMovFlightsLocal[direction][acTypeLabel].push({
                    vuelo:      kVuelo       ? String(r[kVuelo]       || '').trim() : '',
                    aerolinea:  kAerolinea   ? String(r[kAerolinea]   || '').trim() : '',
                    origen:     kOrigen      ? String(r[kOrigen]      || '').trim() : '',
                    destino:    kDestino     ? String(r[kDestino]     || '').trim() : '',
                    movimiento: kMovimiento  ? String(r[kMovimiento]  || '').trim() : '',
                    servicio:   svcCode || '',
                    aeronave:   kMatricula   ? String(r[kMatricula]   || '').trim() : acTypeLabel,
                    posicion:   kPos         ? String(r[kPos]         || '').trim() : '',
                    fecha:      kFecha       ? String(r[kFecha]       || '').trim() : '',
                    hora:       kHoraActual  ? String(r[kHoraActual]  || '').trim() :
                                (kHora       ? String(r[kHora]        || '').trim() : ''),
                    horaProg:   kFecha       ? String(r[kFecha]       || '').trim() : '',
                    pax:        kPasajeros   ? parsePassengers(r[kPasajeros]) : 0,
                    estatus:    kEstatus     ? String(r[kEstatus]     || '').trim() : ''
                });
                if (svcCode) acServiceSet.add(svcCode);
            }
            // Aircraft by airline — Y axis = airline, stacked by aircraft TYPE
            if (acTypeLabel && airlineLabel) {
                if (!aircraftByAirline[airlineLabel]) aircraftByAirline[airlineLabel] = {};
                aircraftByAirline[airlineLabel][acTypeLabel] = (aircraftByAirline[airlineLabel][acTypeLabel] || 0) + 1;
            }

            const origin = kOrigen && r[kOrigen] ? String(r[kOrigen]).trim().toUpperCase() : '';
            const destination = kDestino && r[kDestino] ? String(r[kDestino]).trim().toUpperCase() : '';
            if (origin && destination) {
                const routeLabel = `${origin}-${destination}`;
                routeMap[routeLabel] = (routeMap[routeLabel] || 0) + 1;

                const originCountry = (catalogs.airportsMap[origin]?.country || '').toLowerCase();
                const destinationCountry = (catalogs.airportsMap[destination]?.country || '').toLowerCase();
                const isDomestic = originCountry.includes('mexico') && destinationCountry.includes('mexico');
                if (isDomestic) domesticOps += 1;
                else internationalOps += 1;
            }

            if (kDelayCode && r[kDelayCode]) {
                const rawCode = String(r[kDelayCode]).trim();
                // Extract the first token (alpha or numeric code)
                const token = rawCode.split(/[\s\/,;]+/)[0].toUpperCase();
                // Look up by alpha code, then numeric, then try full raw string as category
                const delayRef = catalogs.delayMap[token]
                    || catalogs.delayMap[rawCode.toUpperCase()]
                    || null;
                let category, label;
                if (delayRef) {
                    category = delayRef.category || 'Sin categoría';
                    const summaryPart = delayRef.summary ? delayRef.summary : token;
                    label = `${token} - ${summaryPart}`;
                } else {
                    // Raw value is probably the category name itself (Spanish text in DB)
                    category = rawCode || 'Sin categoría';
                    label = rawCode || 'Sin categoría';
                }
                delayByCategory[category] = (delayByCategory[category] || 0) + 1;
                delayCodeCount[label]     = (delayCodeCount[label]     || 0) + 1;
            }

            if (kServiceCode && r[kServiceCode]) {
                // Use category for the summary section (separate from the aircraft filter)
                if (svcCategory) {
                    serviceCategoryCount[svcCategory] = (serviceCategoryCount[svcCategory] || 0) + 1;
                }
            }

            if (kDelayMin && r[kDelayMin] !== '') {
                const delayMin = parseDelayMinutes(r[kDelayMin]);
                if (delayMin !== null) {
                    delayMinutesTotal += delayMin;
                    delayMinutesCount += 1;
                    if (delayMin <= 15) onTimeCount += 1;
                }
            }

            // Accumulate per-hour flight records for the peak-hour drilldown modal
            if (_hourKey !== null) {
                if (!hourFlights[_hourKey]) hourFlights[_hourKey] = [];
                hourFlights[_hourKey].push({
                    vuelo:      kVuelo       ? String(r[kVuelo]       || '').trim() : '',
                    aerolinea:  kAerolinea   ? String(r[kAerolinea]   || '').trim() : '',
                    origen:     kOrigen      ? String(r[kOrigen]      || '').trim() : '',
                    destino:    kDestino     ? String(r[kDestino]     || '').trim() : '',
                    movimiento: direction,
                    servicio:   svcCode,
                    svcCat:     svcCategory,
                    aeronave:   acTypeLabel || (kMatricula ? String(r[kMatricula] || '').trim() : ''),
                    hora:       horaSource,
                    pax
                });
            }
        });

        // === Accumulate operations heatmap (excludes cancelled AND non-operational) ===
        opsCleanData.forEach(r => {
            const rowDate = parseDateFromRecord(r);
            if (!rowDate) return;
            const day = rowDate.getDay();
            const dayIndex = day === 0 ? 6 : day - 1; // Lun=0...Dom=6
            const hourKey = String(rowDate.getHours()).padStart(2, '0');
            const weekKey = _isoMondayKey(rowDate); // calendar week Mon–Sun
            if (!heatmapOpsHour[hourKey]) heatmapOpsHour[hourKey] = Array(7).fill(0);
            heatmapOpsHour[hourKey][dayIndex] += 1;
            if (!heatmapOpsHourDetails[hourKey]) heatmapOpsHourDetails[hourKey] = {};
            if (!heatmapOpsHourDetails[hourKey][dayIndex]) heatmapOpsHourDetails[hourKey][dayIndex] = [];
            const _ohRec = {
                vuelo:      kVuelo       ? String(r[kVuelo]       || '').trim() : '',
                aerolinea:  kAerolinea   ? String(r[kAerolinea]   || '').trim() : '',
                origen:     kOrigen      ? String(r[kOrigen]      || '').trim() : '',
                destino:    kDestino     ? String(r[kDestino]     || '').trim() : '',
                movimiento: kMovimiento  ? String(r[kMovimiento]  || '').trim() : '',
                servicio:   kServiceCode ? String(r[kServiceCode] || '').trim() : '',
                aeronave:   kMatricula   ? String(r[kMatricula]   || '').trim() :
                            (kTipoAc    ? String(r[kTipoAc]      || '').trim() : ''),
                fecha:      kFecha       ? String(r[kFecha]       || '').trim() : '',
                hora:       kHoraActual  ? String(r[kHoraActual]  || '').trim() :
                            (kHora       ? String(r[kHora]        || '').trim() : ''),
                estatus:    kEstatus     ? String(r[kEstatus]     || '').trim() : ''
            };
            heatmapOpsHourDetails[hourKey][dayIndex].push(_ohRec);
            // Per-week bucketing — keyed by Monday ISO date
            if (!heatmapOpsHourByWeek[weekKey]) heatmapOpsHourByWeek[weekKey] = {};
            if (!heatmapOpsHourByWeek[weekKey][hourKey]) heatmapOpsHourByWeek[weekKey][hourKey] = Array(7).fill(0);
            heatmapOpsHourByWeek[weekKey][hourKey][dayIndex] += 1;
            if (!heatmapOpsHourDetailsByWeek[weekKey]) heatmapOpsHourDetailsByWeek[weekKey] = {};
            if (!heatmapOpsHourDetailsByWeek[weekKey][hourKey]) heatmapOpsHourDetailsByWeek[weekKey][hourKey] = {};
            if (!heatmapOpsHourDetailsByWeek[weekKey][hourKey][dayIndex]) heatmapOpsHourDetailsByWeek[weekKey][hourKey][dayIndex] = [];
            heatmapOpsHourDetailsByWeek[weekKey][hourKey][dayIndex].push(_ohRec);
        });

        // Debug: show sample delay codes and categories
        if (kDelayCode) {
            const sampleCodes = data.slice(0, 5).map(r => r[kDelayCode]).filter(Boolean);
            console.log('[renderOpsCharts] Sample delay codes:', sampleCodes);
            console.log('[renderOpsCharts] Delay categories found:', Object.keys(delayByCategory).slice(0, 10));
        }

        // ... KPI Logic ...
        const uniqueDays = Object.keys(daysMap).length || 1;
        const avg = Math.round(totalOps / uniqueDays);
        const avgPax = uniqueDays > 0 && totalPassengers > 0 ? Math.round(totalPassengers / uniqueDays) : 0;

        // Peak Hour — with count and range label
        let peakH = '-', maxH = 0;
        Object.entries(hoursMap).forEach(([h,c]) => { if(c > maxH) { maxH = c; peakH = String(h).padStart(2,'0')+':00'; } });
        const peakHLabel = peakH !== '-' ? `${peakH}–${String(Number(peakH.split(':')[0])+1).padStart(2,'0')}:00` : '-';

        // Busiest Day — with count
        let busyD = '-', maxD = 0;
        Object.entries(daysMap).forEach(([d,c]) => { if(c > maxD) { maxD = c; busyD = d; } });

        // Arrivals / Departures from aircraftByDirection totals
        const arrCount = Object.values(aircraftByDirection['Aterrizaje'] || {}).reduce((s,n) => s+n, 0);
        const depCount = Object.values(aircraftByDirection['Despegue']   || {}).reduce((s,n) => s+n, 0);
        const arrPct   = totalOps ? ((arrCount / totalOps)*100).toFixed(1) : 0;
        const depPct   = totalOps ? ((depCount / totalOps)*100).toFixed(1) : 0;

        // Top route
        const topRoute = Object.entries(routeMap).sort((a,b) => b[1]-a[1])[0];

        // Avg pax per flight
        const avgPaxPerFlight = totalPassengers > 0 && totalOps > 0 ? (totalPassengers / totalOps).toFixed(1) : null;

        // Peak hour pax & ops averages (per day at that hour)
        const peakHKey = peakH !== '-' ? String(Number(peakH.split(':')[0])).padStart(2,'0') : null;
        const peakHourTotalPax = peakHKey ? (hourPaxMap[peakHKey] || 0) : 0;
        const avgOpsAtPeakHour = peakHKey ? Math.round(maxH / uniqueDays) : 0;
        const avgPaxAtPeakHour = peakHKey && peakHourTotalPax > 0 ? Math.round(peakHourTotalPax / uniqueDays) : 0;

        // Peak hour pax vs cargo classification
        const _isCargoFlight = f => /cargo|freight|carga|freighter/i.test(f.svcCat || f.servicio || '');
        const peakHFlights   = peakHKey ? (hourFlights[peakHKey] || []) : [];
        const peakHCargoOps  = peakHFlights.filter(_isCargoFlight).length;
        const peakHPaxOps    = peakHFlights.filter(f => (f.servicio || f.svcCat) && !_isCargoFlight(f)).length;
        _peakHourFlightsStore = peakHFlights;
        _peakHourLabel = peakH;

        // Update DOM
        const setT  = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
        const setH  = (id, v) => { const el = document.getElementById(id); if(el) el.innerHTML  = v; };
        const fmt   = n => Number(n).toLocaleString('en-US');

        setT('kpi-total-ops', fmt(totalOps));
        setT('kpi-total-ops-sub', `${uniqueDays} días con operaciones`);
        setT('kpi-avg-daily', fmt(avg));
        setT('kpi-avg-daily-pax', avgPax > 0 ? `${fmt(avgPax)} pax/día` : 'sin datos de pax');
        setT('kpi-arrivals', arrCount > 0 ? fmt(arrCount) : (kMovimiento ? '0' : 'N/D'));
        setT('kpi-arrivals-pct', arrCount > 0 ? `${arrPct}% del total` : '');
        setT('kpi-departures', depCount > 0 ? fmt(depCount) : (kMovimiento ? '0' : 'N/D'));
        setT('kpi-departures-pct', depCount > 0 ? `${depPct}% del total` : '');
        setT('kpi-busiest-day', busyD);
        setT('kpi-busiest-day-count', maxD > 0 ? `${fmt(maxD)} operaciones ese día` : '');
        setT('kpi-peak-hour', peakH);
        (() => {
            const paxPart  = avgPaxAtPeakHour > 0 ? `~${fmt(avgPaxAtPeakHour)} pax/día` : 'sin pax';
            const splitPart = (peakHPaxOps + peakHCargoOps) > 0
                ? ` · ${fmt(peakHPaxOps)} pasajeros / ${fmt(peakHCargoOps)} carga`
                : '';
            setT('kpi-peak-hour-detail', maxH > 0
                ? `~${fmt(avgOpsAtPeakHour)} ops/día · ${paxPart}${splitPart}`
                : '— ops en esa franja');
        })();
        // Make the card clickable to show peak-hour flight list
        (() => {
            const card = document.getElementById('kpi-peak-hour')?.closest('.card');
            if (card && peakHFlights.length > 0) {
                card.style.cursor = 'pointer';
                card.style.transition = 'box-shadow .15s';
                card.onmouseenter = () => { card.style.boxShadow = '0 0 0 2px #f59e0b'; };
                card.onmouseleave = () => { card.style.boxShadow = ''; };
                card.onclick = () => _showPeakHourModal();
                // Add a small hint badge if not already there
                if (!document.getElementById('_peak-click-hint')) {
                    const hint = document.createElement('div');
                    hint.id = '_peak-click-hint';
                    hint.style.cssText = 'font-size:.63rem;color:#f59e0b;margin-top:4px;font-weight:600';
                    hint.innerHTML = '<i class="fas fa-table me-1"></i>Ver vuelos';
                    card.querySelector('[id="kpi-peak-hour"]')?.closest('.card').appendChild(hint);
                }
            }
        })();
        setT('kpi-total-passengers', totalPassengers > 0 ? fmt(totalPassengers) : 'Sin datos');
        setT('kpi-pax-avg-flight', avgPaxPerFlight ? `${avgPaxPerFlight} pax por vuelo` : '');
        setT('kpi-international-share', `${fmt(internationalOps)} intl`);
        setT('kpi-intl-detail', `${fmt(domesticOps)} domésticos · ${totalOps > 0 ? ((internationalOps/totalOps)*100).toFixed(1)+'% intl' : ''}`);
        setT('kpi-top-route', topRoute ? topRoute[0] : 'Sin datos de ruta');
        setT('kpi-top-route-count', topRoute ? `${fmt(topRoute[1])} vuelos en el período` : '');

        // Average daily ops per position type
        const posTypeOrder = ['Contacto','Contacto Internacional','Semicontacto','Remota','Hangar','Sin clasificar'];
        const posTypeMeta  = {
            'Contacto':              { color: '#198754', icon: 'fa-plane-arrival' },
            'Contacto Internacional':{ color: '#20c997', icon: 'fa-globe' },
            'Semicontacto':          { color: '#fd7e14', icon: 'fa-bus' },
            'Remota':                { color: '#0d6efd', icon: 'fa-road' },
            'Hangar':                { color: '#6c757d', icon: 'fa-warehouse' },
            'Sin clasificar':        { color: '#adb5bd', icon: 'fa-question-circle' },
        };
        const posTypePanel = document.getElementById('kpi-postype-panel');
        if (posTypePanel) {
            const hasAnyPos = Object.keys(posTypeMap).length > 0;
            posTypePanel.closest('.col-12').style.display = hasAnyPos ? '' : 'none';
            if (hasAnyPos) {
                posTypePanel.innerHTML = posTypeOrder
                    .filter(cat => posTypeMap[cat] > 0)
                    .map(cat => {
                        const total = posTypeMap[cat];
                        const dailyAvg = Math.round(total / uniqueDays);
                        const pct = totalOps ? ((total / totalOps) * 100).toFixed(1) : 0;
                        const meta = posTypeMeta[cat] || { color: '#adb5bd', icon: 'fa-question-circle' };
                        return `<div class="d-flex align-items-center gap-3 py-2 border-bottom">
                            <div style="width:36px;height:36px;border-radius:8px;background:${meta.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                <i class="fas ${meta.icon} text-white" style="font-size:0.85rem"></i>
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-semibold" style="font-size:0.88rem">${cat}</div>
                                <div class="progress mt-1" style="height:5px;border-radius:3px">
                                    <div class="progress-bar" style="width:${pct}%;background:${meta.color}"></div>
                                </div>
                            </div>
                            <div class="text-end" style="min-width:110px">
                                <span class="fw-bold fs-5" style="color:${meta.color}">${dailyAvg}</span>
                                <span class="text-muted" style="font-size:0.78rem"> ops/día</span>
                                <div class="text-muted" style="font-size:0.75rem">${Number(total).toLocaleString('en-US')} total &bull; ${pct}%</div>
                            </div>
                        </div>`;
                    }).join('');
            }
        }

        const intlShare = totalOps ? ((internationalOps / totalOps) * 100) : 0;
        const avgDelay = delayMinutesCount ? (delayMinutesTotal / delayMinutesCount) : 0;
        const onTimeRate = delayMinutesCount ? ((onTimeCount / delayMinutesCount) * 100) : 0;
        const topDelayCause = Object.entries(delayCodeCount).sort((a,b) => b[1] - a[1])[0];

        setT('kpi-avg-delay', avgDelay.toFixed(1));
        setT('kpi-on-time-rate', `${onTimeRate.toFixed(1)}%`);
        setT('kpi-on-time-detail', delayMinutesCount > 0 ? `de ${fmt(delayMinutesCount)} vuelos con registro` : 'sin datos de demora');
        setT('kpi-top-delay-cause', topDelayCause ? topDelayCause[0] : 'Sin datos');
        setT('kpi-top-delay-count', topDelayCause ? `${fmt(topDelayCause[1])} ocurrencias` : '');

        const peakWeekEntry = Object.entries(weeklyPassengers)
            .sort((a,b) => b[1] - a[1])[0];
        setT('kpi-peak-week-passengers', peakWeekEntry ? `Sem. ${_calWeekLabel(peakWeekEntry[0])} (${fmt(peakWeekEntry[1])} pax)` : 'Sin datos');

        // --- Charts ---
        console.log('[renderOpsCharts] daysMap sample:', Object.entries(daysMap).slice(0, 3));
        console.log('[renderOpsCharts] kFecha:', kFecha, '| daysMap keys:', Object.keys(daysMap).length);

        // 3. Positions (Horizontal Bar — all positions with %; hidden if no position column)
        const posCardCol = document.getElementById('chart-positions-wrapper')?.closest('.col-12');
        const allPos = Object.entries(posMap).sort((a,b) => b[1] - a[1]);
        if (!kPos || allPos.length === 0) {
            if (posCardCol) posCardCol.style.display = 'none';
        } else {
            if (posCardCol) posCardCol.style.display = '';
        }
        if (!kPos || allPos.length === 0) { /* skip positions chart */ } else {
        const totalPosOps = allPos.reduce((s, x) => s + x[1], 0) || 1;
        const standsMap = catalogs.standsMap || {};
        const standCategoryColors = {
            'Contacto':              '#198754',
            'Contacto Internacional':'#20c997',
            'Semicontacto':          '#fd7e14',
            'Remota':                '#0d6efd',
            'Hangar':                '#6c757d',
            'Calle de Rodaje':       '#dc3545',
            'Desconocida':           '#adb5bd'
        };
        const posBgColors = allPos.map(([name]) => {
            const cat = (standsMap[name] && standsMap[name].category) || 'Desconocida';
            return standCategoryColors[cat] || standCategoryColors['Desconocida'];
        });
        const posPercentages = allPos.map(x => parseFloat((x[1] / totalPosOps * 100).toFixed(2)));
        // Adjust canvas height dynamically so all bars are visible
        const posCanvas = document.getElementById('chart-positions');
        if (posCanvas) {
            const dynH = Math.max(350, allPos.length * 26);
            posCanvas.style.height = dynH + 'px';
            const posWrapper = document.getElementById('chart-positions-wrapper');
            if (posWrapper) posWrapper.style.height = dynH + 'px';
        }
        _renderChart('chart-positions', 'bar', {
            labels: allPos.map(x => x[0]),
            datasets: [{
                label: '% de Uso',
                data: posPercentages,
                backgroundColor: posBgColors,
                borderRadius: 3,
                indexAxis: 'y'
            }]
        }, {
            indexAxis: 'y',
            onClick: (evt, elements) => {
                if (!elements.length) return;
                const posName = allPos[elements[0].index][0];
                _showBarDrilldown(`Posición ${posName} — Vuelos`, _posFlights?.[posName] || []);
            },
            onHover: (evt, elements) => {
                if (evt.native?.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const [name, count] = allPos[idx];
                            const pct = posPercentages[idx];
                            const cat = (standsMap[name] && standsMap[name].category) || 'Desconocida';
                            return [
                                ` ${pct}% de uso`,
                                ` ${count} operación(es)`,
                                ` Tipo: ${cat}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: '% del total de operaciones' },
                    ticks: { callback: v => v + '%' }
                }
            }
        }); // end positions else
        } // end if kPos

        // 3b. Simultaneous operations chart (10-min slots, averaged per active day)
        {
            const simultSlots = Object.keys(simultMap).sort();
            const simultCard  = document.getElementById('chart-simultaneous-wrapper')?.closest('.col-12');
            if (simultSlots.length === 0) {
                if (simultCard) simultCard.style.display = 'none';
            } else {
                if (simultCard) simultCard.style.display = '';
                const simultAvgs = simultSlots.map(k => parseFloat((simultMap[k] / uniqueDays).toFixed(2)));
                const simultMax  = Math.max(...simultAvgs) || 1;
                const simultBgColors = simultAvgs.map(v => {
                    const pct = v / simultMax;
                    if (pct > 0.80) return '#dc3545';
                    if (pct > 0.55) return '#fd7e14';
                    if (pct > 0.30) return '#ffc107';
                    return '#20c997';
                });
                // Resize canvas
                const sCanvas  = document.getElementById('chart-simultaneous');
                const sWrapper = document.getElementById('chart-simultaneous-wrapper');
                if (sCanvas && sWrapper) { sCanvas.style.height = '320px'; sWrapper.style.height = '320px'; }
                // Peak label for subtitle
                const peakSimultSlot = simultSlots[simultAvgs.indexOf(simultMax)];
                const peakSimultVal  = simultMax.toFixed(1);
                const sSubtitle = document.getElementById('simult-subtitle');
                if (sSubtitle) sSubtitle.textContent =
                    `Pico: ${peakSimultSlot} hrs — ${peakSimultVal} ops simultáneas (promedio/día)`;
                _renderChart('chart-simultaneous', 'bar', {
                    labels: simultSlots,
                    datasets: [{
                        label: 'Ops simultáneas',
                        data: simultAvgs,
                        backgroundColor: simultBgColors,
                        borderRadius: 2,
                        barPercentage: 1.0,
                        categoryPercentage: 0.95,
                    }]
                }, {
                    animation: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: ctx => `${ctx[0].label} – ${(() => {
                                    const [hh, mm] = ctx[0].label.split(':').map(Number);
                                    const end = mm + 9;
                                    return `${String(hh).padStart(2,'0')}:${String(end).padStart(2,'0')} hrs`;
                                })()}`,
                                label: ctx => [
                                    ` ${ctx.raw} ops simultáneas prom/día`,
                                    ` Total período: ${simultMap[simultSlots[ctx.dataIndex]]}`
                                ]
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Franja horaria (cada 10 min)' },
                            ticks: {
                                maxRotation: 90,
                                autoSkip: false,
                                callback: (_, idx) => {
                                    const lbl = simultSlots[idx] || '';
                                    return lbl.endsWith(':00') ? lbl : '';
                                },
                                font: { size: 10 }
                            },
                            grid: { display: false }
                        },
                        y: {
                            title: { display: true, text: 'Ops simultáneas (prom/día)' },
                            beginAtZero: true
                        }
                    }
                });
            }
        }

        // 4. Two separate aircraft charts (Aterrizajes + Despegues) with service filter
        const acChartCol = document.getElementById('chart-aircrafts-col');
        // Store data + catalogs for re-render when filter changes
        _acMovData     = acMovData;
        _acMovCatalogs = catalogs;
        _acMovFlights  = acMovFlightsLocal;
        _posFlights    = posFlights;

        // Populate service filter dropdown — show code + description (e.g. "J — Normal Service")
        const acSvcSelect = document.getElementById('ac-mov-service-filter');
        if (acSvcSelect) {
            while (acSvcSelect.options.length > 1) acSvcSelect.remove(1);
            Array.from(acServiceSet).sort().forEach(code => {
                const ref  = catalogs.serviceTypeMap[code];
                const desc = ref ? `${ref.category} — ${ref.description}` : code;
                const opt  = document.createElement('option');
                opt.value       = code;
                opt.textContent = `${code} — ${desc}`;
                acSvcSelect.appendChild(opt);
            });
            // Attach listener once (guard with a flag)
            if (!acSvcSelect._listenerAttached) {
                acSvcSelect.addEventListener('change', () => _renderAcMovCharts(acSvcSelect.value));
                acSvcSelect._listenerAttached = true;
            }
        }

        const hasAcData = Object.keys(acMovData).some(d => Object.keys(acMovData[d]).length > 0);
        if (!hasAcData) {
            if (acChartCol) acChartCol.style.display = 'none';
        } else {
            if (acChartCol) acChartCol.style.display = '';
            _renderAcMovCharts('');
        }

        const topDelayCategories = Object.entries(delayByCategory)
            .sort((a,b) => b[1] - a[1]);

        // Resize delay chart container based on number of categories
        const delayCatBody = document.getElementById('delay-cat-body');
        if (delayCatBody) {
            const dynH = Math.max(300, topDelayCategories.length * 44);
            delayCatBody.style.minHeight = dynH + 'px';
        }

        // Color palette for delay categories
        const DELAY_CAT_COLORS = [
            '#dc3545','#fd7e14','#ffc107','#198754','#0d6efd',
            '#6610f2','#20c997','#0dcaf0','#6f42c1','#adb5bd',
            '#e83e8c','#17a2b8','#6c757d','#28a745','#ff6b6b'
        ];
        const delayCatColors = topDelayCategories.map((_, i) => DELAY_CAT_COLORS[i % DELAY_CAT_COLORS.length]);

        _renderChart('chart-delay-categories', 'bar', {
            labels: topDelayCategories.map(item => item[0]),
            datasets: [{
                label: 'Eventos',
                data: topDelayCategories.map(item => item[1]),
                backgroundColor: delayCatColors,
                borderRadius: 6
            }]
        }, {
            indexAxis: 'y',
            scales: {
                y: {
                    ticks: {
                        autoSkip: false,
                        font: { size: 11 }
                    }
                },
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        });

        const topAirlines = Object.entries(airlineMap)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 10);

        _renderChart('chart-airline-share', 'doughnut', {
            labels: topAirlines.map(item => item[0]),
            datasets: [{
                label: 'Operaciones',
                data: topAirlines.map(item => item[1]),
                backgroundColor: [
                    '#0d6efd','#198754','#ffc107','#dc3545','#6610f2',
                    '#20c997','#fd7e14','#6f42c1','#0dcaf0','#adb5bd'
                ]
            }]
        });

        const hasPaxData = totalPassengers > 0;
        const weeklySource = hasPaxData ? weeklyPassengers : weeklyOps;
        const weeklyChartLabel = hasPaxData ? 'Pasajeros' : 'Operaciones';
        const weeklyChartColor = hasPaxData ? '#0dcaf0' : '#6610f2';

        // Keys are now ISO Monday dates ("YYYY-MM-DD") — sort lexicographically = chronologically
        const sortedWeeks = Object.keys(weeklySource).sort();
        const sortedWeekDisplayLabels = sortedWeeks.map(wk => `Sem. ${_calWeekLabel(wk)}`);

        _renderChart('chart-weekly-passengers', 'bar', {
            labels: sortedWeekDisplayLabels,
            datasets: [{
                label: weeklyChartLabel,
                data: sortedWeeks.map(week => weeklySource[week]),
                backgroundColor: weeklyChartColor,
                borderRadius: 6
            }]
        });

        // Update card header to reflect actual data type
        const weeklyHeader = document.querySelector('[data-chart-header="weekly-passengers"]');
        if (weeklyHeader) weeklyHeader.textContent = hasPaxData ? 'Pasajeros por Semana' : 'Operaciones por Semana';

        const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const hourLabels = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
        const heatSource = hasPaxData ? heatmapPassengers : heatmapOps;
        const heatTitle = hasPaxData ? 'Mapa de Calor de Pasajeros (Hora x Día)' : 'Mapa de Calor de Operaciones (Hora x Día)';
        const heatHeaderEl = document.querySelector('[data-chart-header="heatmap"]');
        if (heatHeaderEl) heatHeaderEl.textContent = heatTitle;
        const allHeatValues = hourLabels.flatMap(hour => (heatSource[hour] || Array(7).fill(0)));
        const maxHeat = Math.max(1, ...allHeatValues);
        const getHeatColor = (value) => {
            const ratio = Math.max(0, Math.min(1, value / maxHeat));
            const alpha = 0.08 + (ratio * 0.72);
            return `rgba(13, 110, 253, ${alpha})`;
        };

        // Store passenger heatmap week data — keys are ISO Monday date strings
        _heatmapHasPax = hasPaxData;
        const _paxHeatSrcByWeek = hasPaxData ? heatmapPassengersByWeek : heatmapOpsByWeek;
        _paxHeatWeeks = { '0': { data: heatSource, details: heatmapDetails } };
        Object.keys(_paxHeatSrcByWeek).sort().forEach(wk => {
            _paxHeatWeeks[wk] = { data: _paxHeatSrcByWeek[wk], details: heatmapDetailsByWeek[wk] || {} };
        });
        const heatmapEl = document.getElementById('ops-passenger-heatmap');
        if (heatmapEl) {
            _drawPassengerHeatmap('0');
        }

        // Store ops-hour heatmap week data — keys are ISO Monday date strings
        _opsHourHeatWeeks = { '0': { data: heatmapOpsHour, details: heatmapOpsHourDetails } };
        Object.keys(heatmapOpsHourByWeek).sort().forEach(wk => {
            _opsHourHeatWeeks[wk] = { data: heatmapOpsHourByWeek[wk], details: heatmapOpsHourDetailsByWeek[wk] || {} };
        });
        // === Render: Operations-per-hour heatmap (excl. cancelled + non-operational) ===
        const opsHourHeatEl = document.getElementById('ops-hour-heatmap');
        if (opsHourHeatEl) {
            _drawOpsHourHeatmap('0');
        }

        // chart-ac-direction is now replaced by chart-aircrafts above — hide the duplicate
        const acDirCol = document.getElementById('chart-ac-direction-col');
        if (acDirCol) acDirCol.style.display = 'none';

        // ── Chart: Aircraft types by airline (stacked horizontal bar) ────────
        const acAirlineCol = document.getElementById('chart-ac-airline-col');
        const airlinesWithAc = Object.keys(aircraftByAirline);
        if (!kEquipo || !kAerolinea || airlinesWithAc.length === 0) {
            if (acAirlineCol) acAirlineCol.style.display = 'none';
        } else {
            if (acAirlineCol) acAirlineCol.style.display = '';
            // Top 12 airlines by total ops
            const topAirlineList = Object.entries(aircraftByAirline)
                .sort((a, b) => {
                    const aTotal = Object.values(a[1]).reduce((s,v) => s+v, 0);
                    const bTotal = Object.values(b[1]).reduce((s,v) => s+v, 0);
                    return bTotal - aTotal;
                }).slice(0, 12).map(x => x[0]);

            // Collect unique aircraft types across these airlines
            const acTypeSet = new Set();
            topAirlineList.forEach(al => Object.keys(aircraftByAirline[al]).forEach(ac => acTypeSet.add(ac)));
            const uniqueAcTypes = Array.from(acTypeSet).sort();

            const PALETTE = [
                '#4dc9f6','#f67019','#f53794','#537bc4','#acc236',
                '#166a8f','#00a950','#58595b','#8549ba','#ffc107',
                '#20c997','#dc3545','#0d6efd','#fd7e14','#6f42c1'
            ];
            const acAirlineDatasets = uniqueAcTypes.map((ac, i) => ({
                label: ac,
                data: topAirlineList.map(al => (aircraftByAirline[al][ac] || 0)),
                backgroundColor: PALETTE[i % PALETTE.length],
                borderRadius: 3
            }));

            const acAirlineBody = document.getElementById('ac-airline-body');
            if (acAirlineBody) {
                const dynH = Math.max(320, topAirlineList.length * 36);
                acAirlineBody.style.minHeight = dynH + 'px';
            }

            _renderChart('chart-ac-airline', 'bar', {
                labels: topAirlineList,
                datasets: acAirlineDatasets
            }, {
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, stacked: true, ticks: { precision: 0 } },
                    y: { stacked: true, ticks: { autoSkip: false, font: { size: 11 } } }
                },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { mode: 'index', intersect: false }
                }
            });
        }

        const topRoutes = Object.entries(routeMap)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5);

        const topServiceCategory = Object.entries(serviceCategoryCount)
            .sort((a,b) => b[1] - a[1])[0];

        const summaryEl = document.getElementById('ops-advanced-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <h6 class="fw-bold mb-2">Lectura Operativa</h6>
                        <ul class="mb-0">
                            <li>Total internacional vs doméstico: <strong>${internationalOps.toLocaleString()}</strong> vs <strong>${domesticOps.toLocaleString()}</strong>.</li>
                            <li>Total de pasajeros transportados en el mes: <strong>${totalPassengers.toLocaleString()}</strong>.</li>
                            <li>Total de operaciones del mes: <strong>${totalOps.toLocaleString()}</strong>.</li>
                            <li>Demora promedio observada: <strong>${avgDelay.toFixed(1)} min</strong>.</li>
                            <li>Operaciones a tiempo (-15 a 15 min): <strong>${onTimeRate.toFixed(1)}%</strong>.</li>
                            <li>Categoría de servicio predominante: <strong>${topServiceCategory ? topServiceCategory[0] : 'Sin datos'}</strong>.</li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h6 class="fw-bold mb-2">Top 5 Rutas del mes</h6>
                        <ol class="mb-2">
                            ${topRoutes.map(route => `<li>${route[0]} — <strong>${route[1]}</strong> operaciones</li>`).join('') || '<li>Sin datos de ruta.</li>'}
                        </ol>
                        <h6 class="fw-bold mb-2">Pasajeros por semana</h6>
                        <ul class="mb-0">
                            ${sortedWeeks.map((week, idx) => `<li>S${idx + 1} ${_calWeekLabel(week)}: <strong>${(weeklyPassengers[week] || 0).toLocaleString()}</strong></li>`).join('') || '<li>Sin datos semanales.</li>'}
                        </ul>
                    </div>
                </div>
            `;
        }
    } catch(e) {
        console.error("Error rendering charts:", e);
    }
}

// ── Helper rendered by filter dropdown and initial load ────────────────────
function _showBarDrilldown(title, records) {
    const titleEl = document.getElementById('heatmap-drilldown-title');
    const bodyEl  = document.getElementById('heatmap-drilldown-body');
    if (!titleEl || !bodyEl) return;

    titleEl.innerHTML = `<i class="fas fa-table me-2 text-primary"></i>${title} &nbsp;<span class="badge bg-secondary fw-normal">${records.length} registro${records.length !== 1 ? 's' : ''}</span>`;

    if (records.length === 0) {
        bodyEl.innerHTML = '<p class="text-muted">Sin registros para esta selección.</p>';
    } else {
        const hasVuelo      = records.some(r => r.vuelo);
        const hasAerolinea  = records.some(r => r.aerolinea);
        const hasOrigen     = records.some(r => r.origen);
        const hasDestino    = records.some(r => r.destino);
        const hasMovimiento = records.some(r => r.movimiento);
        const hasServicio   = records.some(r => r.servicio);
        const hasAeronave   = records.some(r => r.aeronave);
        const hasPosicion   = records.some(r => r.posicion);
        const hasFecha      = records.some(r => r.fecha);
        const hasHora       = records.some(r => r.hora);
        const hasPax        = records.some(r => r.pax > 0);
        const hasEstatus    = records.some(r => r.estatus);

        const sorted   = [...records].sort((a, b) =>
            (a.fecha || '').localeCompare(b.fecha || '') || (a.hora || '').localeCompare(b.hora || ''));
        const totalPax = records.reduce((s, r) => s + (r.pax || 0), 0);

        let html = '';
        if (totalPax > 0) html += `<p class="text-muted small mb-3">Total pasajeros: <strong class="text-primary">${totalPax.toLocaleString()}</strong></p>`;
        html += '<div class="table-responsive"><table class="table table-sm table-hover table-bordered align-middle mb-0" style="font-size:0.82rem"><thead class="table-light"><tr>';
        if (hasVuelo)      html += '<th>Vuelo</th>';
        if (hasAerolinea)  html += '<th>Aerolínea</th>';
        if (hasMovimiento) html += '<th>Mvto.</th>';
        if (hasOrigen)     html += '<th>Origen</th>';
        if (hasDestino)    html += '<th>Destino</th>';
        if (hasServicio)   html += '<th>Servicio</th>';
        if (hasAeronave)   html += '<th>Aeronave</th>';
        if (hasPosicion)   html += '<th>Posición</th>';
        const hasPuntualidad = records.some(r => r.horaProg && r.hora && r.horaProg !== r.hora);
        if (hasFecha)         html += '<th>Hora Prog.</th>';
        if (hasHora)          html += '<th>Hora Actual</th>';
        if (hasPuntualidad)   html += '<th>Puntualidad</th>';
        if (hasPax)           html += '<th class="text-end">Pax</th>';
        html += '</tr></thead><tbody>';

        sorted.forEach(r => {
            html += '<tr>';
            if (hasVuelo)        html += `<td class="fw-semibold">${r.vuelo      || '—'}</td>`;
            if (hasAerolinea)    html += `<td>${r.aerolinea  || '—'}</td>`;
            if (hasMovimiento)   html += `<td>${r.movimiento || '—'}</td>`;
            if (hasOrigen)       html += `<td>${r.origen     || '—'}</td>`;
            if (hasDestino)      html += `<td>${r.destino    || '—'}</td>`;
            if (hasServicio)     html += `<td>${r.servicio   || '—'}</td>`;
            if (hasAeronave)     html += `<td>${r.aeronave   || '—'}</td>`;
            if (hasPosicion)     html += `<td class="fw-semibold">${r.posicion   || '—'}</td>`;
            if (hasFecha)        html += `<td class="text-nowrap">${_fmtIsoTime(r.horaProg)}</td>`;
            if (hasHora)         html += `<td class="text-nowrap fw-semibold text-primary">${_fmtIsoTime(r.hora)}</td>`;
            if (hasPuntualidad)  html += `<td class="text-center">${_puntualidadBadge(r.horaProg, r.hora) || '—'}</td>`;
            if (hasPax)          html += `<td class="text-end fw-bold">${(r.pax || 0) > 0 ? r.pax.toLocaleString() : '—'}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        bodyEl.innerHTML = html;
    }

    const modalEl = document.getElementById('heatmap-drilldown-modal');
    if (!modalEl) return;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function _renderAcMovCharts(serviceFilter) {
    if (!_acMovData) return;

    // Build a readable label for the active filter
    const filterRef   = serviceFilter && _acMovCatalogs?.serviceTypeMap?.[serviceFilter];
    const filterLabel = serviceFilter
        ? `${serviceFilter} — ${filterRef ? filterRef.description + ' (' + filterRef.category + ')' : serviceFilter}`
        : '';

    ['Aterrizaje', 'Despegue'].forEach(dir => {
        const canvasId  = dir === 'Aterrizaje' ? 'chart-ac-arrivals'   : 'chart-ac-departures';
        const bodyId    = dir === 'Aterrizaje' ? 'chart-arr-body'      : 'chart-dep-body';
        const barColor  = dir === 'Aterrizaje' ? '#0d6efd'             : '#20c997';
        const dirLabel  = dir === 'Aterrizaje' ? 'Aterrizajes'          : 'Despegues';

        const bucket = _acMovData[dir] || {};

        // Aggregate counts, optionally filtered by service
        const typeCounts = {};
        Object.entries(bucket).forEach(([acType, services]) => {
            const cnt = serviceFilter
                ? (services[serviceFilter] || 0)
                : Object.values(services).reduce((s, v) => s + v, 0);
            if (cnt > 0) typeCounts[acType] = cnt;
        });

        const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

        const body = document.getElementById(bodyId);
        if (body) body.style.minHeight = Math.max(350, sorted.length * 26) + 'px';

        // Build short-code → full name lookup for tooltip
        const nameMap = {};
        sorted.forEach(([code]) => {
            const full = _acMovCatalogs?.aircraftMap?.[code]?.name;
            if (full && full !== code) nameMap[code] = full;
        });

        _renderChart(canvasId, 'bar', {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: dirLabel,
                data: sorted.map(x => x[1]),
                backgroundColor: barColor,
                borderRadius: 4
            }]
        }, {
            indexAxis: 'y',
            onClick: (evt, elements) => {
                if (!elements.length) return;
                const acType  = sorted[elements[0].index][0];
                const all     = _acMovFlights?.[dir]?.[acType] || [];
                const recs    = serviceFilter ? all.filter(r => r.servicio === serviceFilter) : all;
                const label   = nameMap[acType] ? `${acType} — ${nameMap[acType]}` : acType;
                _showBarDrilldown(`${dirLabel} · ${label}`, recs);
            },
            onHover: (evt, elements) => {
                if (evt.native?.target) evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Operaciones' }
                },
                y: { ticks: { autoSkip: false, font: { size: 11 } } }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: !!filterLabel,
                    text: filterLabel ? `Servicio: ${filterLabel}` : '',
                    font: { size: 12 },
                    color: '#6c757d',
                    padding: { bottom: 8 }
                },
                tooltip: {
                    callbacks: {
                        title: items => {
                            const code = items[0]?.label || '';
                            const name = nameMap[code];
                            return name ? `${code}  —  ${name}` : code;
                        },
                        label: ctx => ` ${ctx.parsed.x.toLocaleString()} ${dirLabel.toLowerCase()}`
                    }
                }
            }
        });
    });
}

function _renderChart(id, type, data, extraOpts = {}) {
    const ctx = document.getElementById(id);
    if(!ctx) return;
    
    if(_chartInstances[id]) {
        _chartInstances[id].destroy();
        delete _chartInstances[id];
    }

    _chartInstances[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...extraOpts
        }
    });
}

function renderPivotTable() {
    if (!window.jQuery || !window.jQuery.pivotUtilities) {
        if(!window._pivotWarned) {
             console.warn("PivotTable.js not loaded");
             window._pivotWarned = true;
        }
        $('#pivot-output').html('<div class="alert alert-warning">Librer�a de Tablas Din�micas no cargada.</div>');
        return;
    }

    const renderers = $.pivotUtilities.locales.es.renderers;
    const aggregators = $.pivotUtilities.locales.es.aggregators;

    try {
        $('#pivot-output').pivotUI(opsRawData, {
            renderers: renderers,
            aggregators: aggregators,
            rows: [], 
            cols: [],
            rendererName: "Tabla",
            localeStrings: $.pivotUtilities.locales.es.localeStrings,
            unusedAttrsVertical: true
        });
    } catch(e) {
        console.error("Pivot error:", e);
        $('#pivot-output').html('<div class="alert alert-danger">Error al generar tabla din�mica.</div>');
    }
}

window.opsNavYear = function(delta) {
    const today = new Date();
    const next = currentYearOps + delta;
    if (next < 2024 || next > today.getFullYear()) return;
    window.loadOperationsYear(next);
};

window.loadOperationsYear = function(year) {
    currentYearOps = year;
    renderMonthPills();
    loadOpsMonthData(currentMonthOps);
};

window.exportCurrentTable = function() {
    if (opsDataTable) {
        opsDataTable.button('.buttons-excel').trigger();
    }
};

function parseDate(dateStr) {
    if (!dateStr) return 0;
    const s = String(dateStr).trim();
    
    // ISO Date (YYYY-MM-DD...)
    if (s.includes('-')) { 
        // Handle T separator
        const datePart = s.split('T')[0]; 
        const parts = datePart.split('-');
        if (parts.length === 3) {
            return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
        }
    }
    
    // DD/MM/YYYY
    if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
        }
    }
    
    // Excel integer date? Just in case
    if (!isNaN(s) && parseInt(s) > 20000) {
        // Excel base date 1900-01-01
        return new Date((s - 25569) * 86400 * 1000).getTime();
    }
    
    return 0;
}

// Helper for Excel-like filtering logic
function applyExcelFilters(api) {
    // 1. First Pass: Style Headers & Body
    api.columns().every(function () {
        const column = this;
        const header = $(column.header());
        
        // Remove existing custom elements
        header.find('.excel-filter-btn').remove();
        header.find('.excel-filter-dropdown').remove();
        
        // Style Body Cells (Center Content)
        $(column.nodes()).addClass('text-center align-middle');

        // Add Filter Button (Click to toggle menu)
        // Check if button already exists (FixedHeader might trigger redraws)
        if (header.find('.excel-filter-btn').length === 0) {
             $('<span class="excel-filter-btn" style="position:absolute; right:5px; top:50%; transform:translateY(-50%); cursor:pointer;"><i class="fas fa-filter text-muted" style="font-size:0.8em"></i></span>')
            .appendTo(header);
            header.addClass('has-filter'); // Ensure padding is applied via CSS
        } else {
             header.addClass('has-filter'); // Re-apply if lost
        }

        // Use delegated event handler for filter buttons to support FixedHeader clones
        $(document).off('click', '.excel-filter-btn').on('click', '.excel-filter-btn', function (e) {
                e.stopPropagation(); // Stop sorting
                e.preventDefault();

                // Check if this button is already active (menu open)
                if ($(this).hasClass('active')) {
                    $('.excel-filter-dropdown').remove();
                    $('.excel-filter-btn').removeClass('active');
                    return;
                }
                
                // Close other menus
                $('.excel-filter-dropdown').remove();
                $('.excel-filter-btn').removeClass('active');
                
                // Mark this button as active
                $(this).addClass('active');

                // Identify the column: 
                // We need to find the original header to get the column data.
                // The clicked button might be in a fixed header clone.
                const th = $(this).closest('th');
                const colIdx = th.index();
                
                // Get the API instance from the table visible in the document
                const tableApi = $('#ops-datatable').DataTable();
                
                // Use visible column index to get the correct data column
                // Note: accurate specifically for FixedHeader clones and colvis
                const column = tableApi.column(colIdx + ':visible');

                // Get unique sorted values (Natural Sort)
                const unique = [];
                column.data().unique().each(function (d) {
                    if (unique.indexOf(d) === -1) unique.push(d);
                });
                // Define btn as $(this) for subsequent code compatibility
                const btn = $(this);
                
                // Sort naturally (numeric strings aware)
                unique.sort((a, b) => {
                    if (a === b) return 0;
                    if (a === null || a === undefined) return 1;
                    if (b === null || b === undefined) return -1;
                    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
                });

                // Create Menu Container (Append to Body to avoid overflow clipping)
                const btnOffset = $(this).offset();
                const menu = $('<div class="excel-filter-dropdown arg-popover bg-white shadow rounded border p-2 text-start"></div>')
                    .css({
                        position: 'absolute',
                        top: btnOffset.top + $(this).outerHeight() + 5,
                        left: btnOffset.left - 200 > 10 ? btnOffset.left - 200 : 10, // Rudimentary constraint
                        zIndex: 9999, // High Z-Index
                        minWidth: '250px',
                        maxWidth: '300px',
                        width: 'max-content',
                        maxHeight: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        fontSize: '0.85rem',
                        textAlign: 'left'
                    })
                    .appendTo('body')
                    .on('click', e => e.stopPropagation());
                
                // Adjust position if off-screen
                const menuWidth = 250;
                if (btnOffset.left - menuWidth < 0) {
                     menu.css('left', btnOffset.left);
                }


                // Search Box
                const searchBox = $('<input type="text" class="form-control form-control-sm mb-2" placeholder="Buscar valor...">')
                    .appendTo(menu)
                    .on('keyup', function() {
                        const val = $(this).val().toLowerCase();
                        menu.find('.item-row').filter(function() { // Fixed selector to item-row
                            $(this).toggle($(this).text().toLowerCase().indexOf(val) > -1)
                        });
                    });

                // Select All / Clear Links
                const toolBar = $('<div class="d-flex justify-content-between mb-2 small px-1"></div>').appendTo(menu);
                $('<a href="#" class="text-decoration-none text-primary">Seleccionar todo</a>')
                    .appendTo(toolBar)
                    .on('click', (e) => {
                        e.preventDefault();
                        menu.find('.item-chk').prop('checked', true);
                    });
                
                $('<a href="#" class="text-decoration-none text-danger">Borrar filtro</a>')
                    .appendTo(toolBar)
                    .on('click', (e) => {
                        e.preventDefault();
                        menu.find('.item-chk').prop('checked', false);
                    });

                // List Container
                const list = $('<div class="overflow-auto border rounded p-1 mb-2 bg-light custom-scrollbar" style="max-height: 200px;"></div>').appendTo(menu);
                
                unique.forEach(val => {
                        const safeVal = val === null || val === undefined ? '' : String(val);
                        const labelText = safeVal === '' ? '(Vacías)' : safeVal;
                        
                        const row = $('<div class="form-check form-check-sm ms-1 mb-1 item-row"></div>').appendTo(list); // Added item-row class
                        const chk = $('<input class="form-check-input item-chk" type="checkbox" checked>')
                        .val(safeVal)
                        .appendTo(row);
                        
                        $('<label class="form-check-label text-truncate w-100" style="cursor:pointer; padding-left: 4px;">')
                        .text(labelText)
                        .attr('title', labelText)
                        .on('click', (e) => { 
                                e.stopPropagation();
                                chk.prop('checked', !chk.prop('checked')); 
                        })
                        .appendTo(row);
                });

                        // Actions Footer
                        const actions = $('<div class="d-flex justify-content-end gap-2 pt-2 border-top bg-white sticky-bottom"></div>').appendTo(menu);
                        
                        $('<button class="btn btn-sm btn-light border px-3">Cancelar</button>')
                            .appendTo(actions)
                            .on('click', () => {
                                menu.remove();
                                btn.removeClass('active');
                            });
                            
                        $('<button class="btn btn-sm btn-primary px-3">Aceptar</button>')
                            .appendTo(actions)
                            .on('click', () => {
                                const selected = [];
                                list.find('.item-chk:checked').each(function() {
                                    selected.push($(this).val());
                                });

                                const escapeRegex = $.fn.dataTable.util.escapeRegex;
                                
                                if (selected.length === unique.length) {
                                    column.search('', true, false).draw();
                                    btn.find('i').removeClass('text-primary').addClass('text-muted');
                                } else if (selected.length === 0) {
                                    column.search('^$', true, false).draw();
                                    btn.find('i').removeClass('text-muted').addClass('text-primary');
                                } else {
                                    const searchStr = selected.map(v => {
                                        return v === '' ? '^$' : '^' + escapeRegex(v) + '$';
                                    }).join('|');
                                    column.search(searchStr, true, false).draw();
                                    btn.find('i').removeClass('text-muted').addClass('text-primary');
                                }
                                menu.remove();
                                btn.removeClass('active');
                            });
            }); // End of delegated click
    }); // End of columns().every()
    
    // Global click handler to close menus
    $(document).off('click.excelFilter').on('click.excelFilter', function(e) {
        if (!$(e.target).closest('.excel-filter-dropdown').length && !$(e.target).closest('.excel-filter-btn').length) {
            $('.excel-filter-dropdown').remove();
            $('.excel-filter-btn').removeClass('active');
        }
    });
}

// ── Heatmap drill-down: shows the list of flights behind a clicked cell ────
function _showHeatmapDrilldown(hour, dayIdx) {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const records  = (_heatmapDetails?.[hour]?.[dayIdx]) || [];

    const titleEl = document.getElementById('heatmap-drilldown-title');
    const bodyEl  = document.getElementById('heatmap-drilldown-body');
    if (!titleEl || !bodyEl) return;

    titleEl.innerHTML = `<i class="fas fa-table me-2 text-primary"></i>Vuelos — ${dayNames[dayIdx] || ''} ${hour}:00 &nbsp;<span class="badge bg-secondary fw-normal">${records.length} registro${records.length !== 1 ? 's' : ''}</span>`;

    if (records.length === 0) {
        bodyEl.innerHTML = '<p class="text-muted">Sin registros para esta celda.</p>';
    } else {
        const hasVuelo      = records.some(r => r.vuelo);
        const hasAerolinea  = records.some(r => r.aerolinea);
        const hasOrigen     = records.some(r => r.origen);
        const hasDestino    = records.some(r => r.destino);
        const hasMovimiento = records.some(r => r.movimiento);
        const hasServicio   = records.some(r => r.servicio);
        const hasAeronave   = records.some(r => r.aeronave);
        const hasFecha      = records.some(r => r.fecha);
        const hasHora       = records.some(r => r.hora);
        const hasPax        = records.some(r => r.pax > 0);

        const sorted   = [...records].sort((a, b) => b.pax - a.pax);
        const totalPax = records.reduce((s, r) => s + r.pax, 0);

        let html = `<p class="text-muted small mb-3">Total de pasajeros en esta franja: <strong class="text-primary">${totalPax.toLocaleString()}</strong></p>`;
        html += '<div class="table-responsive"><table class="table table-sm table-hover table-bordered align-middle mb-0" style="font-size:0.82rem"><thead class="table-light"><tr>';
        if (hasVuelo)      html += '<th>Vuelo</th>';
        if (hasAerolinea)  html += '<th>Aerolínea</th>';
        if (hasMovimiento) html += '<th>Mvto.</th>';
        if (hasOrigen)     html += '<th>Origen</th>';
        if (hasDestino)    html += '<th>Destino</th>';
        if (hasServicio)   html += '<th>Servicio</th>';
        if (hasAeronave)   html += '<th>Aeronave</th>';
        const hasPuntualidad = records.some(r => r.horaProg && r.hora && r.horaProg !== r.hora);
        if (hasFecha)         html += '<th>Hora Prog.</th>';
        if (hasHora)          html += '<th>Hora Actual</th>';
        if (hasPuntualidad)   html += '<th>Puntualidad</th>';
        if (hasPax)           html += '<th class="text-end">Pax</th>';
        html += '</tr></thead><tbody>';

        sorted.forEach(r => {
            html += '<tr>';
            if (hasVuelo)        html += `<td class="fw-semibold">${r.vuelo      || '—'}</td>`;
            if (hasAerolinea)    html += `<td>${r.aerolinea  || '—'}</td>`;
            if (hasMovimiento)   html += `<td>${r.movimiento || '—'}</td>`;
            if (hasOrigen)       html += `<td>${r.origen     || '—'}</td>`;
            if (hasDestino)      html += `<td>${r.destino    || '—'}</td>`;
            if (hasServicio)     html += `<td>${r.servicio   || '—'}</td>`;
            if (hasAeronave)     html += `<td>${r.aeronave   || '—'}</td>`;
            if (hasFecha)        html += `<td class="text-nowrap">${_fmtIsoTime(r.horaProg)}</td>`;
            if (hasHora)         html += `<td class="text-nowrap fw-semibold text-primary">${_fmtIsoTime(r.hora)}</td>`;
            if (hasPuntualidad)  html += `<td class="text-center">${_puntualidadBadge(r.horaProg, r.hora) || '—'}</td>`;
            if (hasPax)          html += `<td class="text-end fw-bold">${r.pax > 0 ? r.pax.toLocaleString() : '—'}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        bodyEl.innerHTML = html;
    }

    const modalEl = document.getElementById('heatmap-drilldown-modal');
    if (!modalEl) return;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// ── Heatmap draw helpers (called on initial render and week filter changes) ─────

function _drawPassengerHeatmap(weekKey) {
    const heatmapEl = document.getElementById('ops-passenger-heatmap');
    if (!heatmapEl) return;
    const w = _paxHeatWeeks[weekKey] || _paxHeatWeeks['0'];
    const source  = w.data    || {};
    const details = w.details || {};
    const hasPaxData = _heatmapHasPax;
    const heatUnit   = hasPaxData ? 'Pasajeros' : 'Operaciones';
    const weekLabel  = weekKey === '0' ? 'Todas las semanas' : `Sem. ${_calWeekLabel(weekKey)}`;

    const allHeatValues = _HEATMAP_HOUR_LABELS.flatMap(h => (source[h] || Array(7).fill(0)));
    const maxHeat = Math.max(1, ...allHeatValues);
    const getHeatColor = (v) => {
        const ratio = Math.max(0, Math.min(1, v / maxHeat));
        return `rgba(13, 110, 253, ${0.08 + ratio * 0.72})`;
    };

    const colTotals = Array(7).fill(0);
    const hourTotals = {};
    _HEATMAP_HOUR_LABELS.forEach(hour => {
        const vals = source[hour] || Array(7).fill(0);
        hourTotals[hour] = vals.reduce((a, b) => a + b, 0);
        vals.forEach((v, i) => { colTotals[i] += v; });
    });
    const grandTotal = colTotals.reduce((a, b) => a + b, 0);

    // Week filter buttons — sorted calendar weeks with date-range labels
    const availWeeks = Object.keys(_paxHeatWeeks).filter(k => k !== '0').sort();
    let btnBar = '<div class="d-flex flex-wrap gap-1 mb-3 align-items-center"><span class="text-muted small me-1">Filtrar semana:</span>';
    btnBar += `<button class="btn btn-sm week-filter-btn ${weekKey === '0' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="window._filterPassengerHeatmap('0')">Todas</button>`;
    availWeeks.forEach((wk, idx) => {
        const lbl = `S${idx + 1} ${_calWeekLabel(wk)}`;
        const active = weekKey === wk;
        btnBar += `<button class="btn btn-sm week-filter-btn ${active ? 'btn-primary' : 'btn-outline-secondary'}" onclick="window._filterPassengerHeatmap('${wk}')" title="${wk}">${lbl}</button>`;
    });
    btnBar += '</div>';

    let tableHtml = btnBar;
    tableHtml += `<p class="text-muted small mb-2">Muestra el total de <strong>${heatUnit}</strong> por franja horaria y día de la semana (${weekLabel}). Los colores más oscuros indican mayor actividad.</p>`;
    tableHtml += '<div class="table-responsive"><table class="table table-sm table-bordered align-middle text-center mb-0" style="font-size:0.78rem">';
    tableHtml += '<thead class="table-light"><tr><th>Hora</th>';
    const _paxDayNums = weekKey !== '0' ? _weekDayNumbers(weekKey) : null;
    _HEATMAP_DAY_LABELS.forEach((label, idx) => {
        tableHtml += _paxDayNums
            ? `<th>${label}<br><small class="fw-normal text-muted">${_paxDayNums[idx]}</small></th>`
            : `<th>${label}</th>`;
    });
    tableHtml += '<th class="table-secondary">Total</th></tr></thead><tbody>';

    _HEATMAP_HOUR_LABELS.forEach(hour => {
        const rowValues = source[hour] || Array(7).fill(0);
        const rowSum = hourTotals[hour];
        if (rowSum === 0) return;
        tableHtml += `<tr><th class="text-nowrap table-light">${hour}:00</th>`;
        rowValues.forEach((value, dayIdx) => {
            if (value > 0) {
                tableHtml += `<td data-hm-hour="${hour}" data-hm-day="${dayIdx}" style="background:${getHeatColor(value)};font-weight:600;cursor:pointer" title="Ver vuelos — ${hour}:00">${value.toLocaleString()}</td>`;
            } else {
                tableHtml += `<td style="background:${getHeatColor(0)}"></td>`;
            }
        });
        tableHtml += `<td class="table-secondary fw-bold">${rowSum.toLocaleString()}</td></tr>`;
    });

    tableHtml += '<tr class="table-secondary fw-bold"><th>Total</th>';
    colTotals.forEach(v => { tableHtml += `<td>${v.toLocaleString()}</td>`; });
    tableHtml += `<td>${grandTotal.toLocaleString()}</td></tr>`;
    tableHtml += '</tbody></table></div>';
    heatmapEl.innerHTML = tableHtml;

    _heatmapDetails = details;
    heatmapEl.querySelectorAll('td[data-hm-hour]').forEach(td => {
        td.addEventListener('click', () => {
            _showHeatmapDrilldown(td.dataset.hmHour, parseInt(td.dataset.hmDay, 10));
        });
    });
}

function _drawOpsHourHeatmap(weekKey) {
    const opsHourHeatEl = document.getElementById('ops-hour-heatmap');
    if (!opsHourHeatEl) return;
    const w = _opsHourHeatWeeks[weekKey] || _opsHourHeatWeeks['0'];
    const source  = w.data    || {};
    const details = w.details || {};
    const weekLabel = weekKey === '0' ? 'Todas las semanas' : `Sem. ${_calWeekLabel(weekKey)}`;

    const allOpsVals = _HEATMAP_HOUR_LABELS.flatMap(h => source[h] || Array(7).fill(0));
    const maxOps = Math.max(1, ...allOpsVals);
    const getOpsColor = (v) => {
        const ratio = Math.max(0, Math.min(1, v / maxOps));
        return `rgba(253, 126, 20, ${0.08 + ratio * 0.82})`;
    };

    const colTotalsOps = Array(7).fill(0);
    const hourTotalsOps = {};
    _HEATMAP_HOUR_LABELS.forEach(hour => {
        const vals = source[hour] || Array(7).fill(0);
        hourTotalsOps[hour] = vals.reduce((a, b) => a + b, 0);
        vals.forEach((v, i) => { colTotalsOps[i] += v; });
    });
    const grandTotalOps = colTotalsOps.reduce((a, b) => a + b, 0);

    // Week filter buttons — sorted calendar weeks with date-range labels
    const availWeeks = Object.keys(_opsHourHeatWeeks).filter(k => k !== '0').sort();
    let btnBar = '<div class="d-flex flex-wrap gap-1 mb-3 align-items-center"><span class="text-muted small me-1">Filtrar semana:</span>';
    btnBar += `<button class="btn btn-sm week-filter-btn ${weekKey === '0' ? 'btn-warning' : 'btn-outline-secondary'}" onclick="window._filterOpsHourHeatmap('0')">Todas</button>`;
    availWeeks.forEach((wk, idx) => {
        const lbl = `S${idx + 1} ${_calWeekLabel(wk)}`;
        const active = weekKey === wk;
        btnBar += `<button class="btn btn-sm week-filter-btn ${active ? 'btn-warning' : 'btn-outline-secondary'}" onclick="window._filterOpsHourHeatmap('${wk}')" title="${wk}">${lbl}</button>`;
    });
    btnBar += '</div>';

    let opsHtml = btnBar;
    opsHtml += `<p class="text-muted small mb-2">Muestra el total de <strong>Operaciones</strong> por franja horaria y día de la semana (${weekLabel}). <em>Excluye cancelados y no operativos.</em> Los colores más oscuros indican mayor actividad.</p>`;
    opsHtml += '<div class="table-responsive"><table class="table table-sm table-bordered align-middle text-center mb-0" style="font-size:0.78rem">';
    opsHtml += '<thead class="table-light"><tr><th>Hora</th>';
    const _opsDayNums = weekKey !== '0' ? _weekDayNumbers(weekKey) : null;
    _HEATMAP_DAY_LABELS.forEach((label, idx) => {
        opsHtml += _opsDayNums
            ? `<th>${label}<br><small class="fw-normal text-muted">${_opsDayNums[idx]}</small></th>`
            : `<th>${label}</th>`;
    });
    opsHtml += '<th class="table-secondary">Total</th></tr></thead><tbody>';

    _HEATMAP_HOUR_LABELS.forEach(hour => {
        const rowValues = source[hour] || Array(7).fill(0);
        const rowSum = hourTotalsOps[hour];
        if (rowSum === 0) return;
        opsHtml += `<tr><th class="text-nowrap table-light">${hour}:00</th>`;
        rowValues.forEach((value, dayIdx) => {
            if (value > 0) {
                opsHtml += `<td data-opshm-hour="${hour}" data-opshm-day="${dayIdx}" style="background:${getOpsColor(value)};font-weight:600;cursor:pointer" title="Ver vuelos — ${hour}:00">${value.toLocaleString()}</td>`;
            } else {
                opsHtml += `<td style="background:${getOpsColor(0)}"></td>`;
            }
        });
        opsHtml += `<td class="table-secondary fw-bold">${rowSum.toLocaleString()}</td></tr>`;
    });

    opsHtml += '<tr class="table-secondary fw-bold"><th>Total</th>';
    colTotalsOps.forEach(v => { opsHtml += `<td>${v.toLocaleString()}</td>`; });
    opsHtml += `<td>${grandTotalOps.toLocaleString()}</td></tr>`;
    opsHtml += '</tbody></table></div>';
    opsHourHeatEl.innerHTML = opsHtml;

    _heatmapOpsHourDetails = details;
    opsHourHeatEl.querySelectorAll('td[data-opshm-hour]').forEach(td => {
        td.addEventListener('click', () => {
            _showOpsHourDrilldown(td.dataset.opshmHour, parseInt(td.dataset.opshmDay, 10));
        });
    });
}

window._filterPassengerHeatmap = function(weekKey) {
    _drawPassengerHeatmap(String(weekKey));
};

window._filterOpsHourHeatmap = function(weekKey) {
    _drawOpsHourHeatmap(String(weekKey));
};

function _showOpsHourDrilldown(hour, dayIdx) {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const records  = (_heatmapOpsHourDetails?.[hour]?.[dayIdx]) || [];

    const titleEl = document.getElementById('heatmap-drilldown-title');
    const bodyEl  = document.getElementById('heatmap-drilldown-body');
    if (!titleEl || !bodyEl) return;

    titleEl.innerHTML = `<i class="fas fa-clock me-2 text-warning"></i>Operaciones — ${dayNames[dayIdx] || ''} ${hour}:00 &nbsp;<span class="badge bg-warning text-dark fw-normal">${records.length} operación${records.length !== 1 ? 'es' : ''}</span>`;

    if (records.length === 0) {
        bodyEl.innerHTML = '<p class="text-muted">Sin registros para esta celda.</p>';
    } else {
        const hasVuelo      = records.some(r => r.vuelo);
        const hasAerolinea  = records.some(r => r.aerolinea);
        const hasOrigen     = records.some(r => r.origen);
        const hasDestino    = records.some(r => r.destino);
        const hasMovimiento = records.some(r => r.movimiento);
        const hasServicio   = records.some(r => r.servicio);
        const hasAeronave   = records.some(r => r.aeronave);
        const hasFecha      = records.some(r => r.fecha);
        const hasHora       = records.some(r => r.hora);
        const hasEstatus    = records.some(r => r.estatus);

        const sorted = [...records].sort((a, b) => (a.vuelo || '').localeCompare(b.vuelo || ''));

        let html = `<p class="text-muted small mb-3">Total de operaciones en esta franja: <strong class="text-warning">${records.length.toLocaleString()}</strong> <em>(cancelados y no operativos excluidos)</em></p>`;
        html += '<div class="table-responsive"><table class="table table-sm table-hover table-bordered align-middle mb-0" style="font-size:0.82rem"><thead class="table-light"><tr>';
        if (hasVuelo)      html += '<th>Vuelo</th>';
        if (hasAerolinea)  html += '<th>Aerolínea</th>';
        if (hasMovimiento) html += '<th>Mvto.</th>';
        if (hasOrigen)     html += '<th>Origen</th>';
        if (hasDestino)    html += '<th>Destino</th>';
        if (hasServicio)   html += '<th>Servicio</th>';
        if (hasAeronave)   html += '<th>Aeronave</th>';
        const hasPuntualidad = records.some(r => r.horaProg && r.hora && r.horaProg !== r.hora);
        if (hasFecha)         html += '<th>Hora Prog.</th>';
        if (hasHora)          html += '<th>Hora Actual</th>';
        if (hasPuntualidad)   html += '<th>Puntualidad</th>';
        html += '</tr></thead><tbody>';

        sorted.forEach(r => {
            html += '<tr>';
            if (hasVuelo)        html += `<td class="fw-semibold">${r.vuelo      || '—'}</td>`;
            if (hasAerolinea)    html += `<td>${r.aerolinea  || '—'}</td>`;
            if (hasMovimiento)   html += `<td>${r.movimiento || '—'}</td>`;
            if (hasOrigen)       html += `<td>${r.origen     || '—'}</td>`;
            if (hasDestino)      html += `<td>${r.destino    || '—'}</td>`;
            if (hasServicio)     html += `<td>${r.servicio   || '—'}</td>`;
            if (hasAeronave)     html += `<td>${r.aeronave   || '—'}</td>`;
            if (hasFecha)        html += `<td class="text-nowrap">${_fmtIsoTime(r.horaProg)}</td>`;
            if (hasHora)         html += `<td class="text-nowrap fw-semibold text-warning">${_fmtIsoTime(r.hora)}</td>`;
            if (hasPuntualidad)  html += `<td class="text-center">${_puntualidadBadge(r.horaProg, r.hora) || '—'}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        bodyEl.innerHTML = html;
    }

    const modalEl = document.getElementById('heatmap-drilldown-modal');
    if (!modalEl) return;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
