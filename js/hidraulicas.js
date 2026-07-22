/* ============================================================
 *  GOMIH · Aprovechamiento del Agua
 *  Subdirección de Ingeniería · Gerencia de Op. y Mtto.
 *  Instalaciones Hidráulicas
 *
 *  Fuentes de datos (TODO se captura por DÍA y se agrega en vivo):
 *   - Extracción por pozo (doble medición): diaria "Extracción_agua_diaria"
 *     (pozo, cd_militar_m3, aifa_m3, volumen_m3=total). Los totales
 *     mensuales / trimestrales / anuales se calculan sumando los días;
 *     ya NO se usa la tabla ancha public."Extracción_agua".
 *   - Demanda AIFA / Cd. Militar = suma por pozo de aifa_m3 / cd_militar_m3.
 *   - Distribución (PAAP) diaria: "Suministro_paap_diario"
 *     (primaria_m3, secundaria_m3).
 *   - Tratamiento PTAR diario: "Tratamiento_ptar_diario" (a1_m3, a2_m3, a3_m3).
 *
 *  Dashboard: panel MENSUAL (imagen 2) → panel ANUAL/acumulado
 *  (imagen 1) → totales/detalle colapsable. Trimestre calculado
 *  en automático. Export a Excel con SheetJS.
 * ============================================================ */
;(function () {
    'use strict';

    const TBL_DIARIA  = 'Extracción_agua_diaria';
    const TBL_PAAP    = 'Suministro_paap_diario';
    const TBL_PTAR    = 'Tratamiento_ptar_diario';

    const POZOS_FIJOS = ['Pozo 1', 'Pozo 2', 'Pozo 3', 'Pozo 4', 'Pozo 5',
                         'Pozo 6', 'Pozo 7', 'Pozo 8', 'Pozo 10'];
    const TRIMESTRES  = ['Q1', 'Q2', 'Q3', 'Q4'];
    const QUARTER_LABELS = ['Ene-Mar', 'Abr-Jun', 'Jul-Sep', 'Oct-Dic'];
    const DEMANDA_COLORS = { aifa: '#e07a3c', cdmilitar: '#1d4ed8' };

    const MES_NOMBRES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const MES_NOMBRES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const state = {
        rows: [], loaded: false, loading: false,
        years: [], pozos: [],
        selectedYear: null, selectedMonth: null, selectedDay: 0, selectedPozo: '',

        // detalle diario por pozo (para demanda AIFA / Cd. Militar)
        daily: [], dailyLoaded: false,
        // distribución PAAP diaria
        paap: [], paapLoaded: false,
        // tratamiento PTAR diario
        ptar: [], ptarLoaded: false,

        // editor de captura por DÍA
        capYear: null, capMonth: null, capDay: null,
        capPozos: [],            // [{pozo, cd, aifa, _id, _orig...}]
        capPaap: null,           // {primaria, secundaria, _id, _orig...}
        capPtar: null,           // {a1, a2, a3, _id, _orig...}
    };

    const charts = {
        pozoMonth: null, demandaMonth: null,
        extraccionAnual: null, distribucionAnual: null,
        perPozo: null, cumulative: null, pozos: null, yoy: null,
    };
    let initDone = false;
    let bound = false;

    // ─── Helpers ───────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

    const fmt = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    };
    const fmt2 = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0.00';
        return Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const fmtCompact = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        const v = Number(n);
        const abs = Math.abs(v);
        if (abs >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M';
        if (abs >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
        return Math.round(v).toString();
    };
    const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

    /** Convierte "9,759.94" / "9759.94" / 12.3 en number */
    function toNum(v) {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        const cleaned = String(v).replace(/[\s,]/g, '');
        const n = parseFloat(cleaned);
        return isFinite(n) ? n : 0;
    }
    function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
    function quarterOfMonth(m) { return Math.ceil(Number(m) / 3); }
    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function pozoSort(a, b) {
        const na = parseInt(String(a).match(/\d+/) || [0], 10);
        const nb = parseInt(String(b).match(/\d+/) || [0], 10);
        if (na !== nb) return na - nb;
        return String(a).localeCompare(String(b));
    }

    async function getClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.ensureSupabaseClient === 'function') return await window.ensureSupabaseClient();
        return null;
    }

    function setStatus(text, kind) {
        const el = $('hidra-status-badge');
        if (!el) return;
        el.textContent = text;
        const cls = ({ ok: 'bg-success', warn: 'bg-warning text-dark', err: 'bg-danger', info: 'bg-info text-dark', mute: 'bg-secondary' }[kind]) || 'bg-secondary';
        el.className = 'badge ' + cls;
    }

    // ─── Carga principal (todo proviene del detalle diario) ────
    async function loadAll(force) {
        if (state.loading) return;
        if (state.loaded && !force) return;
        state.loading = true;
        setStatus('Cargando…', 'info');
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            await loadAux(force);
            state.loaded = true;
            indexRows();
            setStatus(`${state.daily.length} registros diarios · ${state.pozos.length} pozos`, 'ok');
        } catch (err) {
            console.error('[hidraulicas] loadAll error:', err);
            setStatus('Error al cargar', 'err');
        } finally {
            state.loading = false;
        }
    }

    function indexRows() {
        const ySet = new Set(), pSet = new Set();
        for (const a of state.daily) {
            const y = Number(a.anio);
            if (Number.isFinite(y)) ySet.add(y);
            const p = String(a.pozo || '').trim();
            if (p) pSet.add(p);
        }
        for (const a of state.paap) {
            const y = Number(a.anio);
            if (Number.isFinite(y)) ySet.add(y);
        }
        for (const a of state.ptar) {
            const y = Number(a.anio);
            if (Number.isFinite(y)) ySet.add(y);
        }
        state.years = [...ySet].sort((a, b) => b - a);
        // pozos fijos 1..10 + cualquier pozo extra presente en el diario
        const extra = [...pSet].filter(p => !POZOS_FIJOS.includes(p)).sort(pozoSort);
        state.pozos = [...POZOS_FIJOS, ...extra];
        if (!state.years.length) state.years.push(new Date().getFullYear());
        if (!state.years.includes(state.selectedYear)) state.selectedYear = state.years[0];
    }

    // ─── Carga: detalle diario por pozo + PAAP + PTAR ─────────
    async function loadDaily(force) {
        if (state.dailyLoaded && !force) return;
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client
                .from(TBL_DIARIA)
                .select('id,anio,mes,dia,pozo,cd_militar_m3,aifa_m3,volumen_m3,observaciones');
            if (error) throw error;
            state.daily = data || [];
            state.dailyLoaded = true;
        } catch (err) {
            console.error('[hidraulicas] loadDaily error:', err);
            state.daily = [];
            state.dailyLoaded = true;
        }
    }
    async function loadPaap(force) {
        if (state.paapLoaded && !force) return;
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client
                .from(TBL_PAAP)
                .select('id,anio,mes,dia,primaria_m3,secundaria_m3,observaciones');
            if (error) throw error;
            state.paap = data || [];
            state.paapLoaded = true;
        } catch (err) {
            console.error('[hidraulicas] loadPaap error:', err);
            state.paap = [];
            state.paapLoaded = true;
        }
    }
    async function loadPtar(force) {
        if (state.ptarLoaded && !force) return;
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client
                .from(TBL_PTAR)
                .select('id,anio,mes,dia,a1_m3,a2_m3,a3_m3,observaciones');
            if (error) throw error;
            state.ptar = data || [];
            state.ptarLoaded = true;
        } catch (err) {
            console.error('[hidraulicas] loadPtar error:', err);
            state.ptar = [];
            state.ptarLoaded = true;
        }
    }
    async function loadAux(force) {
        await Promise.all([loadDaily(force), loadPaap(force), loadPtar(force)]);
    }

    // ─── Demanda (AIFA / Cd. Militar) desde el detalle por pozo ──
    /** Totales del mes para demanda AIFA / Cd. Militar (suma por pozo). */
    function demandMonthTotals(year, month) {
        const out = { aifa: 0, cdmil: 0 };
        for (const r of state.daily) {
            if (Number(r.anio) !== Number(year) || Number(r.mes) !== Number(month)) continue;
            out.aifa  += Number(r.aifa_m3) || 0;
            out.cdmil += Number(r.cd_militar_m3) || 0;
        }
        return out;
    }
    function dailyMonthlyField(year, field) {
        const arr = new Array(12).fill(0);
        for (const r of state.daily) {
            if (Number(r.anio) !== Number(year)) continue;
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) arr[m - 1] += Number(r[field]) || 0;
        }
        return arr;
    }
    const aifaMonthly  = (y) => dailyMonthlyField(y, 'aifa_m3');
    const cdmilMonthly = (y) => dailyMonthlyField(y, 'cd_militar_m3');

    // ─── Distribución (PAAP = primaria + secundaria) ──────────
    function distribMonthly(year) {
        const arr = new Array(12).fill(0);
        for (const r of state.paap) {
            if (Number(r.anio) !== Number(year)) continue;
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) arr[m - 1] += (Number(r.primaria_m3) || 0) + (Number(r.secundaria_m3) || 0);
        }
        return arr;
    }
    function paapMonthlyField(year, field) {
        const arr = new Array(12).fill(0);
        for (const r of state.paap) {
            if (Number(r.anio) !== Number(year)) continue;
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) arr[m - 1] += Number(r[field]) || 0;
        }
        return arr;
    }
    // ─── PTAR (tratamiento) ────────────────────────────
    function ptarMonthlyField(year, field) {
        const arr = new Array(12).fill(0);
        for (const r of state.ptar) {
            if (Number(r.anio) !== Number(year)) continue;
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) arr[m - 1] += Number(r[field]) || 0;
        }
        return arr;
    }

    // ─── Agregaciones de extracción (desde el detalle diario) ──
    function dailyByYear(year) { return state.daily.filter(r => Number(r.anio) === Number(year)); }

    function aggregateMonthlyForYear(year, pozo) {
        const arr = new Array(12).fill(0);
        for (const r of dailyByYear(year)) {
            if (pozo && String(r.pozo || '').trim() !== pozo) continue;
            const m = Number(r.mes);
            if (m >= 1 && m <= 12) arr[m - 1] += Number(r.volumen_m3) || 0;
        }
        return arr;
    }
    function aggregateByPozoForYear(year) {
        const map = new Map();
        for (const r of dailyByYear(year)) {
            const p = String(r.pozo || '').trim() || 'Sin pozo';
            map.set(p, (map.get(p) || 0) + (Number(r.volumen_m3) || 0));
        }
        return [...map.entries()].filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
    }
    /** Extracción por pozo en un mes (monthIndex 0-based). */
    function aggregateByPozoForMonth(year, monthIndex) {
        const map = new Map();
        for (const r of dailyByYear(year)) {
            if (Number(r.mes) !== monthIndex + 1) continue;
            const p = String(r.pozo || '').trim() || 'Sin pozo';
            map.set(p, (map.get(p) || 0) + (Number(r.volumen_m3) || 0));
        }
        return [...map.entries()].filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
    }
    function cumulative(monthlyArr) {
        const out = new Array(12).fill(0);
        let acc = 0;
        for (let i = 0; i < 12; i++) { acc += monthlyArr[i] || 0; out[i] = acc; }
        return out;
    }
    function quarterlyFromMonthly(arr) {
        return [
            (arr[0] || 0) + (arr[1] || 0) + (arr[2]  || 0),
            (arr[3] || 0) + (arr[4] || 0) + (arr[5]  || 0),
            (arr[6] || 0) + (arr[7] || 0) + (arr[8]  || 0),
            (arr[9] || 0) + (arr[10]|| 0) + (arr[11] || 0),
        ];
    }
    const quarterlyForYear = (year, pozo) => quarterlyFromMonthly(aggregateMonthlyForYear(year, pozo));

    /** Índice (0-based) del último mes con algún dato en cualquiera de las tres tablas.
     *  Devuelve -1 si no hay nada, o 11 si hay datos en diciembre. */
    function lastDataMonthIndex(year) {
        const extr = aggregateMonthlyForYear(year, '');
        const paap = distribMonthly(year);
        const ptar = ptarMonthlyField(year, 'a1_m3');
        for (let i = 11; i >= 0; i--) {
            if (extr[i] > 0 || paap[i] > 0 || ptar[i] > 0) return i;
        }
        return -1;
    }
    /** Recibe un array de 12 valores y pone null en los meses sin dato
     *  (a partir del mes siguiente al último con dato del año). */
    function nullifyFutureMonths(arr, year) {
        const last = lastDataMonthIndex(year);
        if (last === 11) return arr; // año completo, nada que nullificar
        return arr.map((v, i) => i > last ? null : v);
    }

    // ─── Selects ───────────────────────────────────────────────
    function populateYearSelect(id, value) {
        const sel = $(id); if (!sel) return;
        const years = state.years.length ? state.years : [new Date().getFullYear()];
        const prev = value !== undefined ? value : sel.value;
        sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (prev && years.includes(Number(prev))) sel.value = String(prev);
    }
    function populatePozoSelect(id, includeAll) {
        const sel = $(id); if (!sel) return;
        const prev = sel.value;
        let html = includeAll ? '<option value="">Todos los pozos</option>' : '<option value="">— elige pozo —</option>';
        html += state.pozos.map(p => `<option value="${p}">${p}</option>`).join('');
        sel.innerHTML = html;
        if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
    }
    function populateMonthSelect(id, value, allowAll) {
        const sel = $(id); if (!sel) return;
        const prev = value !== undefined ? value : (sel.value || state.selectedMonth || (new Date().getMonth() + 1));
        let html = allowAll ? '<option value="0">Todo el año</option>' : '';
        html += MES_NOMBRES_LARGOS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('');
        sel.innerHTML = html;
        sel.value = String(prev ?? (allowAll ? 0 : 1));
    }
    function populateFilterDaySelect(year, month, value) {
        const sel = $('hidra-filter-day'); if (!sel) return;
        const prev = value !== undefined ? value : (sel.value !== '' ? Number(sel.value) : state.selectedDay);
        let html = '<option value="0">Todo el mes</option>';
        // sin mes específico no se puede elegir día
        if (Number(month) >= 1 && Number(month) <= 12) {
            const dim = daysInMonth(year || new Date().getFullYear(), month);
            for (let d = 1; d <= dim; d++) html += `<option value="${d}">${d}</option>`;
            sel.disabled = false;
        } else {
            sel.disabled = true;
        }
        sel.innerHTML = html;
        const dim = (Number(month) >= 1 && Number(month) <= 12) ? daysInMonth(year || new Date().getFullYear(), month) : 0;
        sel.value = String(Math.min(Number(prev) || 0, dim));
    }
    function populateDaySelect(id, year, month, value) {
        const sel = $(id); if (!sel) return;
        const dim = daysInMonth(year || new Date().getFullYear(), month || (new Date().getMonth() + 1));
        const prev = value !== undefined ? value : (Number(sel.value) || state.capDay || new Date().getDate());
        let html = '';
        for (let d = 1; d <= dim; d++) html += `<option value="${d}">${d}</option>`;
        sel.innerHTML = html;
        sel.value = String(Math.min(Number(prev) || 1, dim));
    }

    function refreshSelects() {
        populateYearSelect('hidra-filter-year', state.selectedYear);
        populateMonthSelect('hidra-filter-month', state.selectedMonth, true);
        populateFilterDaySelect(state.selectedYear, state.selectedMonth, state.selectedDay);
        populatePozoSelect('hidra-filter-pozo', true);
        populateYearSelect('hidra-cap-year', state.capYear);
        populateMonthSelect('hidra-cap-month', state.capMonth);
        populateDaySelect('hidra-cap-day', state.capYear, state.capMonth, state.capDay);
    }

    // ─── Charts: utilidades ────────────────────────────────────
    function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }
    const PALETTE = ['#1e3a8a', '#0ea5e9', '#10b981', '#7c3aed', '#f59e0b',
                     '#ef4444', '#0891b2', '#a855f7', '#059669', '#64748b'];
    const hasDL = () => typeof window !== 'undefined' && !!window.ChartDataLabels;

    function emptyDoughnut(ctx) {
        return new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
        });
    }

    // ─── Filtros de período (año / mes opcional / día opcional) ─
    //   month=0 → todo el año · day=0 → todo el mes.
    function matchPeriod(r, y, m, d) {
        if (Number(r.anio) !== Number(y)) return false;
        if (Number(m) >= 1 && Number(r.mes) !== Number(m)) return false;
        if (Number(d) >= 1 && Number(r.dia) !== Number(d)) return false;
        return true;
    }
    function extractionTotalForPeriod(y, m, d, pozo) {
        let t = 0;
        for (const r of state.daily) {
            if (!matchPeriod(r, y, m, d)) continue;
            if (pozo && String(r.pozo || '').trim() !== pozo) continue;
            t += Number(r.volumen_m3) || 0;
        }
        return t;
    }
    function demandTotalsForPeriod(y, m, d) {
        const out = { aifa: 0, cdmil: 0 };
        for (const r of state.daily) {
            if (!matchPeriod(r, y, m, d)) continue;
            out.aifa  += Number(r.aifa_m3) || 0;
            out.cdmil += Number(r.cd_militar_m3) || 0;
        }
        return out;
    }
    function distribTotalForPeriod(y, m, d) {
        let t = 0;
        for (const r of state.paap) {
            if (!matchPeriod(r, y, m, d)) continue;
            t += (Number(r.primaria_m3) || 0) + (Number(r.secundaria_m3) || 0);
        }
        return t;
    }
    function aggregateByPozoForPeriod(y, m, d) {
        const map = new Map();
        for (const r of state.daily) {
            if (!matchPeriod(r, y, m, d)) continue;
            const p = String(r.pozo || '').trim() || 'Sin pozo';
            map.set(p, (map.get(p) || 0) + (Number(r.volumen_m3) || 0));
        }
        return [...map.entries()].filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
    }

    // ─── Panel MENSUAL (imagen 2) ──────────────────────────────
    function renderMonthlyPanel() {
        const y = state.selectedYear;
        const m = Number(state.selectedMonth) || 0;   // 0 = todo el año
        const d = Number(state.selectedDay) || 0;     // 0 = todo el mes

        // Etiquetas de período y título del panel
        let mesLabel, titulo, periodWord;
        if (m >= 1 && d >= 1) {
            mesLabel = `${d} ${MES_NOMBRES_LARGOS[m - 1]}`;
            titulo = 'Datos del Aprovechamiento del Agua Diario';
            periodWord = 'diaria';
        } else if (m >= 1) {
            mesLabel = MES_NOMBRES_LARGOS[m - 1];
            titulo = 'Datos del Aprovechamiento del Agua Mensual';
            periodWord = 'mensual';
        } else {
            mesLabel = 'Todo el año';
            titulo = 'Datos del Aprovechamiento del Agua Anual';
            periodWord = 'anual';
        }
        setText('hidra-m-period-mes', mesLabel);
        setText('hidra-m-period-anio', y);
        setText('hidra-m-panel-title', titulo);
        document.querySelectorAll('.hidra-period-word').forEach(el => { el.textContent = periodWord; });

        const extr = extractionTotalForPeriod(y, m, d, state.selectedPozo);
        const dem  = demandTotalsForPeriod(y, m, d);
        const dist = distribTotalForPeriod(y, m, d);
        const aifa = dem.aifa;
        const cdm  = dem.cdmil;

        setText('hidra-m-extraccion',  fmt(extr));
        setText('hidra-m-distribucion', fmt(dist));
        setText('hidra-m-aifa',        fmt(aifa));
        setText('hidra-m-cdmilitar',   fmt(cdm));

        renderPozoMonthChart(y, m, d);
        renderDemandaMonthChart(aifa, cdm);
    }

    function renderPozoMonthChart(year, month, day) {
        const ctx = $('hidra-chart-pozo-month'); if (!ctx || typeof Chart === 'undefined') return;
        const data = aggregateByPozoForPeriod(year, month, day);
        destroyChart('pozoMonth');
        if (!data.length) { charts.pozoMonth = emptyDoughnut(ctx); return; }
        const total = data.reduce((s, d) => s + d[1], 0) || 1;
        charts.pozoMonth = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(d => d[0]),
                datasets: [{
                    data: data.map(d => d[1]),
                    backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
                    borderColor: '#fff', borderWidth: 2, hoverOffset: 8,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '52%',
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 8 } },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)} m³ (${fmtPct(c.parsed / total * 100)})` } },
                    datalabels: hasDL() ? {
                        color: '#fff', font: { weight: '700', size: 11 },
                        textStrokeColor: 'rgba(0,0,0,.4)', textStrokeWidth: 2,
                        formatter: v => { const p = v / total * 100; return p >= 5 ? fmtPct(p) : ''; },
                    } : undefined,
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    function renderDemandaMonthChart(aifa, cdm) {
        const ctx = $('hidra-chart-demanda-month'); if (!ctx || typeof Chart === 'undefined') return;
        destroyChart('demandaMonth');
        const total = (aifa + cdm) || 0;
        if (!total) { charts.demandaMonth = emptyDoughnut(ctx); return; }
        charts.demandaMonth = new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['AIFA', 'Cd. Militar'],
                datasets: [{
                    data: [aifa, cdm],
                    backgroundColor: [DEMANDA_COLORS.aifa, DEMANDA_COLORS.cdmilitar],
                    borderColor: '#fff', borderWidth: 2,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)} m³ (${fmtPct(c.parsed / total * 100)})` } },
                    datalabels: hasDL() ? {
                        color: '#fff', font: { weight: '700', size: 14 },
                        formatter: v => fmtPct(v / total * 100),
                    } : undefined,
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    // ─── Panel ANUAL / acumulado (imagen 1) ────────────────────
    function renderAnnualPanel() {
        const y = state.selectedYear;
        setText('hidra-a-period-anio', y);
        const extrM = aggregateMonthlyForYear(y, state.selectedPozo);
        setText('hidra-a-extraccion',  fmt(sum(extrM)));
        setText('hidra-a-distribucion', fmt(sum(distribMonthly(y))));
        setText('hidra-a-aifa',        fmt(sum(aifaMonthly(y))));
        setText('hidra-a-cdmilitar',   fmt(sum(cdmilMonthly(y))));
        renderExtraccionAnualChart(y);
        renderDistribucionAnualChart(y);
    }

    function makeYoYBar(ctxId, chartKey, prevArr, curArr, yPrev, yCurr) {
        const ctx = $(ctxId); if (!ctx || typeof Chart === 'undefined') return;
        // Nullificar meses sin dato del año actual para no graficar barras vacías
        const cSlice = nullifyFutureMonths(curArr, yCurr);
        const pSlice = nullifyFutureMonths(prevArr, yPrev);
        destroyChart(chartKey);
        charts[chartKey] = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: MES_NOMBRES_CORTOS,
                datasets: [
                    { label: String(yPrev), data: pSlice, backgroundColor: '#2f6fb5', borderRadius: 3, categoryPercentage: 0.8, barPercentage: 0.9 },
                    { label: String(yCurr), data: cSlice, backgroundColor: '#e07a3c', borderRadius: 3, categoryPercentage: 0.8, barPercentage: 0.9 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 22 } },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 } } },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                    datalabels: hasDL() ? {
                        anchor: 'end', align: 'end', offset: 1, rotation: -90,
                        font: { size: 9, weight: '600' }, color: '#475569',
                        formatter: v => v ? fmtCompact(v) : '',
                    } : undefined,
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => fmtCompact(v) }, grid: { color: '#eef2f7' } },
                    x: { grid: { display: false } },
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }
    function renderExtraccionAnualChart(y) {
        makeYoYBar('hidra-chart-extraccion-anual', 'extraccionAnual',
            aggregateMonthlyForYear(y - 1, state.selectedPozo),
            aggregateMonthlyForYear(y, state.selectedPozo), y - 1, y);
    }
    function renderDistribucionAnualChart(y) {
        makeYoYBar('hidra-chart-distribucion-anual', 'distribucionAnual',
            distribMonthly(y - 1), distribMonthly(y), y - 1, y);
    }

    // ─── Totales / detalle ─────────────────────────────────────
    function renderQuarterlyKpis() {
        const q = quarterlyForYear(state.selectedYear, state.selectedPozo);
        const total = sum(q);
        for (let i = 0; i < 4; i++) {
            setText(`hidra-q-${i + 1}`, fmt(q[i]));
            setText(`hidra-q-${i + 1}-pct`, total > 0 ? fmtPct((q[i] / total) * 100) : '0%');
        }
        setText('hidra-q-total', fmt(total));
    }

    function renderPerPozoChart() {
        const ctx = $('hidra-chart-per-pozo'); if (!ctx || typeof Chart === 'undefined') return;
        const y = state.selectedYear;
        const pozosConDato = state.pozos
            .map(p => ({ pozo: p, months: nullifyFutureMonths(aggregateMonthlyForYear(y, p), y) }))
            .filter(d => d.months.some(v => v !== null && v > 0));
        const datasets = pozosConDato.map((d, i) => ({
            label: d.pozo,
            data: d.months,
            backgroundColor: PALETTE[i % PALETTE.length],
            borderColor: '#ffffff', borderWidth: 1.5, borderRadius: 2,
            stack: 'stack0', maxBarThickness: 64,
        }));
        const monthTotals = MES_NOMBRES_CORTOS.map((_, mIdx) =>
            datasets.reduce((s, d) => s + (Number(d.data[mIdx]) || 0), 0));
        const totalsDs = {
            label: '__totals__', data: monthTotals.map(() => 0),
            backgroundColor: 'rgba(0,0,0,0)', borderWidth: 0, stack: 'stack0',
            datalabels: hasDL() ? {
                display: ctx => monthTotals[ctx.dataIndex] > 0,
                anchor: 'end', align: 'end', offset: 4,
                color: '#0f172a', font: { weight: '700', size: 12 },
                formatter: (_, ctx) => fmtCompact(monthTotals[ctx.dataIndex]),
            } : undefined,
        };
        destroyChart('perPozo');
        charts.perPozo = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: MES_NOMBRES_CORTOS, datasets: [...datasets, totalsDs] },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 24 } },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 }, filter: item => item.text !== '__totals__' } },
                    tooltip: {
                        filter: item => item.dataset.label !== '__totals__',
                        callbacks: {
                            label: (c) => {
                                const v = c.parsed.y || 0, tot = monthTotals[c.dataIndex] || 1;
                                return ` ${c.dataset.label}: ${fmt(v)} m³ (${fmtPct((v / tot) * 100)})`;
                            },
                        },
                    },
                    datalabels: hasDL() ? {
                        color: '#fff', font: { weight: '700', size: 11 },
                        textStrokeColor: 'rgba(0,0,0,.45)', textStrokeWidth: 2,
                        display: (ctx) => {
                            if (ctx.dataset.label === '__totals__') return true;
                            const v = ctx.dataset.data[ctx.dataIndex] || 0;
                            return (v / (monthTotals[ctx.dataIndex] || 1)) * 100 >= 6;
                        },
                        formatter: (v, ctx) => {
                            if (ctx.dataset.label === '__totals__') return monthTotals[ctx.dataIndex] > 0 ? fmtCompact(monthTotals[ctx.dataIndex]) : '';
                            const pct = (v / (monthTotals[ctx.dataIndex] || 1)) * 100;
                            return pct >= 6 ? fmtPct(pct) : '';
                        },
                    } : undefined,
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { callback: v => fmtCompact(v) }, grid: { color: '#eef2f7' } },
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    function lastNonZeroIndex(arr) {
        for (let i = arr.length - 1; i >= 0; i--) if (arr[i] > 0) return i;
        return -1;
    }
    function renderCumulativeChart() {
        const ctx = $('hidra-chart-cumulative'); if (!ctx || typeof Chart === 'undefined') return;
        const yCurr = state.selectedYear, yPrev = yCurr - 1;
        const cur  = nullifyFutureMonths(cumulative(aggregateMonthlyForYear(yCurr, state.selectedPozo)), yCurr);
        const prev = nullifyFutureMonths(cumulative(aggregateMonthlyForYear(yPrev, state.selectedPozo)), yPrev);
        const lastIdxCur = lastNonZeroIndex(cur.map(v => v ?? 0));
        const lastIdxPrev = lastNonZeroIndex(prev.map(v => v ?? 0));
        destroyChart('cumulative');
        charts.cumulative = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: MES_NOMBRES_CORTOS,
                datasets: [
                    { label: String(yPrev), data: prev, borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,.18)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 0, pointHoverRadius: 5 },
                    { label: String(yCurr), data: cur,  borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,.15)', borderWidth: 3, tension: 0.3, fill: true, pointRadius: 0, pointHoverRadius: 5 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 14, right: 32 } },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                    datalabels: hasDL() ? {
                        display: (ctx) => (ctx.datasetIndex === 0 && ctx.dataIndex === lastIdxPrev) || (ctx.datasetIndex === 1 && ctx.dataIndex === lastIdxCur),
                        align: 'top', anchor: 'end', offset: 4,
                        color: (ctx) => ctx.datasetIndex === 1 ? '#1d4ed8' : '#475569',
                        font: { weight: '700', size: 11 }, formatter: (v) => fmtCompact(v),
                    } : undefined,
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => fmtCompact(v) }, grid: { color: '#eef2f7' } },
                    x: { grid: { display: false } },
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    function renderPozosChart() {
        const ctx = $('hidra-chart-pozos'); if (!ctx || typeof Chart === 'undefined') return;
        const data = aggregateByPozoForYear(state.selectedYear);
        destroyChart('pozos');
        if (!data.length) { charts.pozos = emptyDoughnut(ctx); return; }
        const total = data.reduce((s, d) => s + d[1], 0) || 1;
        charts.pozos = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(d => d[0]),
                datasets: [{
                    data: data.map(d => d[1]),
                    backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
                    borderWidth: 2, borderColor: '#fff', hoverOffset: 8,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 }, padding: 10 } },
                    tooltip: { callbacks: { label: c => ` ${c.label}: ${fmt(c.parsed)} m³ (${fmtPct(c.parsed / total * 100)})` } },
                    datalabels: hasDL() ? {
                        color: '#fff', font: { weight: '700', size: 12 },
                        textStrokeColor: 'rgba(0,0,0,.35)', textStrokeWidth: 2,
                        formatter: (v) => { const p = (v / total) * 100; return p >= 4 ? fmtPct(p) : ''; },
                    } : undefined,
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    function renderYoyChart() {
        const ctx = $('hidra-chart-yoy'); if (!ctx || typeof Chart === 'undefined') return;
        const yoyPalette = ['#2f6fb5', '#e07a3c', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
        const years = state.years.slice(0, 6);
        const ds = years.map((y, i) => ({
            label: String(y),
            data: nullifyFutureMonths(aggregateMonthlyForYear(y, state.selectedPozo), y),
            backgroundColor: yoyPalette[i % yoyPalette.length],
            borderWidth: 0, borderRadius: 3, categoryPercentage: 0.78, barPercentage: 0.92,
        }));
        destroyChart('yoy');
        charts.yoy = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: MES_NOMBRES_CORTOS, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 22 } },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 } } },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                    datalabels: hasDL() ? {
                        anchor: 'end', align: 'end', offset: 2, rotation: -90,
                        font: { size: 10, weight: '600' }, color: '#475569',
                        formatter: v => v ? fmtCompact(v) : '',
                    } : undefined,
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => fmtCompact(v) }, grid: { color: '#eef2f7' } },
                    x: { grid: { display: false } },
                },
            },
            plugins: hasDL() ? [window.ChartDataLabels] : [],
        });
    }

    function renderTotalsTables() {
        const y = state.selectedYear;
        // Extracción por pozo (matriz)
        const head = $('hidra-total-extraccion-head');
        if (head) head.innerHTML = `<th>Pozo</th>${MES_NOMBRES_CORTOS.map(m => `<th>${m}</th>`).join('')}<th>Total</th>`;
        const colTotals = new Array(12).fill(0); let grand = 0;
        const tbody = $('hidra-total-extraccion-tbody');
        if (tbody) {
            const rowsHtml = state.pozos.map(p => {
                const months = aggregateMonthlyForYear(y, p);
                const tot = sum(months); grand += tot;
                months.forEach((v, i) => colTotals[i] += v);
                if (tot === 0) return '';
                return `<tr><td>${escapeHtml(p)}</td>${months.map(v => `<td>${fmt2(v)}</td>`).join('')}<td>${fmt2(tot)}</td></tr>`;
            }).join('');
            tbody.innerHTML = rowsHtml || `<tr><td colspan="14" class="text-center text-muted">Sin datos para ${y}.</td></tr>`;
        }
        const foot = $('hidra-total-extraccion-foot');
        if (foot) foot.innerHTML = `<td>Total</td>${colTotals.map(v => `<td>${fmt2(v)}</td>`).join('')}<td>${fmt2(grand)}</td>`;

        // Suministro PAAP (matriz: meses en columnas, filas Primaria/Secundaria/Total)
        const priM = paapMonthlyField(y, 'primaria_m3');
        const secM = paapMonthlyField(y, 'secundaria_m3');
        const totM = priM.map((v, i) => v + secM[i]);
        const paapAnual = sum(totM);
        setText('hidra-total-paap-anio', y);
        const pHead = $('hidra-total-paap-head');
        if (pHead) pHead.innerHTML = `<th>PAAP</th>${MES_NOMBRES_LARGOS.map(m => `<th>${m}</th>`).join('')}<th>Total</th>`;
        const pBody = $('hidra-total-paap-tbody');
        if (pBody) {
            pBody.innerHTML =
                `<tr><th class="hidra-paap-row-pri">PAAP Primaria</th>${priM.map(v => `<td>${fmt2(v)}</td>`).join('')}<td>${fmt2(sum(priM))}</td></tr>` +
                `<tr><th class="hidra-paap-row-sec">PAAP Secundaria</th>${secM.map(v => `<td>${fmt2(v)}</td>`).join('')}<td>${fmt2(sum(secM))}</td></tr>` +
                `<tr class="fw-bold"><th>Total mensual</th>${totM.map(v => `<td>${fmt2(v)}</td>`).join('')}<td>${fmt2(paapAnual)}</td></tr>`;
        }
        const pFoot = $('hidra-total-paap-foot');
        if (pFoot) pFoot.innerHTML =
            `<tr class="fw-bold"><td colspan="13" class="text-center">Volumen Total Anual de suministro de agua potable al Polígono Aeroportuario (m³)</td><td>${fmt2(paapAnual)}</td></tr>`;
    }

    function renderDashboard() {
        renderMonthlyPanel();
        renderAnnualPanel();
        renderQuarterlyKpis();
        renderPerPozoChart();
        renderCumulativeChart();
        renderPozosChart();
        renderYoyChart();
        renderTotalsTables();
    }

    // ─── Editor de captura por DÍA ─────────────────────────────
    //   Un día → 10 pozos (Cd. Militar + AIFA c/u) + PAAP + PTAR.
    function updateCapQuarterBadge() {
        const m = Number(state.capMonth) || 1;
        const q = quarterOfMonth(m);
        setText('hidra-cap-quarter-badge', `Q${q} · ${QUARTER_LABELS[q - 1]}`);
    }

    async function loadDayEditor() {
        const tbody = $('hidra-cap-pozos-tbody'); if (!tbody) return;
        const status = $('hidra-cap-status');
        const y = state.capYear, m = state.capMonth, d = state.capDay;
        updateCapQuarterBadge();
        if (!y || !m || !d) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-4">Selecciona año, mes y día, y haz clic en <strong>Cargar</strong>.</td></tr>';
            return;
        }
        if (status) status.textContent = 'Cargando…';
        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin"></i> Cargando…</td></tr>';
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const [exRes, paapRes, ptarRes] = await Promise.all([
                client.from(TBL_DIARIA).select('id,pozo,volumen_m3,observaciones').eq('anio', y).eq('mes', m).eq('dia', d),
                client.from(TBL_PAAP).select('id,primaria_m3,secundaria_m3,observaciones').eq('anio', y).eq('mes', m).eq('dia', d),
                client.from(TBL_PTAR).select('id,a1_m3,a2_m3,a3_m3,observaciones').eq('anio', y).eq('mes', m).eq('dia', d),
            ]);
            if (exRes.error) throw exRes.error;
            if (paapRes.error) throw paapRes.error;
            if (ptarRes.error) throw ptarRes.error;

            const exMap = new Map();
            for (const r of (exRes.data || [])) exMap.set(String(r.pozo).trim(), r);
            state.capPozos = POZOS_FIJOS.map(p => {
                const r = exMap.get(p);
                return {
                    pozo: p,
                    total: r ? Number(r.volumen_m3) : '',
                    obs:  r ? (r.observaciones || '') : '',
                    _id:      r ? r.id : null,
                    _origTotal: r ? Number(r.volumen_m3) : '',
                    _origObs: r ? (r.observaciones || '') : '',
                };
            });

            const pr = (paapRes.data || [])[0] || null;
            state.capPaap = {
                primaria:   pr ? Number(pr.primaria_m3) : '',
                secundaria: pr ? Number(pr.secundaria_m3) : '',
                _id: pr ? pr.id : null,
                _origPri: pr ? Number(pr.primaria_m3) : '',
                _origSec: pr ? Number(pr.secundaria_m3) : '',
            };
            const tr = (ptarRes.data || [])[0] || null;
            state.capPtar = {
                a1: tr ? Number(tr.a1_m3) : '',
                a2: tr ? Number(tr.a2_m3) : '',
                a3: tr ? Number(tr.a3_m3) : '',
                _id: tr ? tr.id : null,
                _origA1: tr ? Number(tr.a1_m3) : '',
                _origA2: tr ? Number(tr.a2_m3) : '',
                _origA3: tr ? Number(tr.a3_m3) : '',
            };

            renderDayEditor();
            const conDato = state.capPozos.filter(p => p._id).length;
            if (status) status.textContent = `${conDato} pozos con dato · ${pr ? 'PAAP ✔' : 'PAAP —'} · ${tr ? 'PTAR ✔' : 'PTAR —'}`;
        } catch (err) {
            console.error('[hidraulicas] loadDayEditor error:', err);
            tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger py-3">Error: ${err.message || err}</td></tr>`;
            if (status) status.textContent = '';
        }
    }

    function renderDayEditor() {
        const tbody = $('hidra-cap-pozos-tbody'); if (!tbody) return;
        tbody.innerHTML = state.capPozos.map(r => {
            return `<tr data-pozo="${escapeHtml(r.pozo)}">
                <td class="fw-bold">${escapeHtml(r.pozo)}</td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm hidra-cap-total" value="${r.total === '' ? '' : r.total}" placeholder="0"></td>
            </tr>`;
        }).join('');
        // PAAP / PTAR inputs
        if ($('hidra-cap-paap-primaria'))   $('hidra-cap-paap-primaria').value   = state.capPaap.primaria === '' ? '' : state.capPaap.primaria;
        if ($('hidra-cap-paap-secundaria')) $('hidra-cap-paap-secundaria').value = state.capPaap.secundaria === '' ? '' : state.capPaap.secundaria;
        if ($('hidra-cap-ptar-a1')) $('hidra-cap-ptar-a1').value = state.capPtar.a1 === '' ? '' : state.capPtar.a1;
        if ($('hidra-cap-ptar-a2')) $('hidra-cap-ptar-a2').value = state.capPtar.a2 === '' ? '' : state.capPtar.a2;
        if ($('hidra-cap-ptar-a3')) $('hidra-cap-ptar-a3').value = state.capPtar.a3 === '' ? '' : state.capPtar.a3;
        attachCapInputs();
        recalcCapTotals();
    }

    function attachCapInputs() {
        const tbody = $('hidra-cap-pozos-tbody'); if (!tbody) return;
        tbody.querySelectorAll('tr[data-pozo]').forEach(tr => {
            const pozo = tr.dataset.pozo;
            const row = state.capPozos.find(r => r.pozo === pozo); if (!row) return;
            const total = tr.querySelector('.hidra-cap-total');
            const onIn = () => {
                row.total = total.value === '' ? '' : Number(total.value);
                const dirty = (String(row._origTotal) !== String(row.total));
                total.classList.toggle('hidra-changed', dirty);
                recalcCapTotals();
            };
            total.addEventListener('input', onIn);
        });
        const bindNum = (id, obj, key, origKey) => {
            const el = $(id); if (!el) return;
            el.addEventListener('input', () => {
                obj[key] = el.value === '' ? '' : Number(el.value);
                el.classList.toggle('hidra-changed', String(obj[origKey]) !== String(obj[key]));
                recalcCapTotals();
            });
        };
        bindNum('hidra-cap-paap-primaria',   state.capPaap, 'primaria',   '_origPri');
        bindNum('hidra-cap-paap-secundaria', state.capPaap, 'secundaria', '_origSec');
        bindNum('hidra-cap-ptar-a1', state.capPtar, 'a1', '_origA1');
        bindNum('hidra-cap-ptar-a2', state.capPtar, 'a2', '_origA2');
        bindNum('hidra-cap-ptar-a3', state.capPtar, 'a3', '_origA3');
    }

    function recalcCapTotals() {
        let total = 0, pozosConDato = 0;
        for (const r of state.capPozos) {
            const hasAny = (r.total !== '' && r.total !== null);
            total += Number(r.total) || 0;
            if (hasAny) pozosConDato++;
        }
        setText('hidra-cap-total-dia', fmt(total));
        setText('hidra-cap-pozos-con-dato', pozosConDato);

        const paapTot = (Number(state.capPaap?.primaria) || 0) + (Number(state.capPaap?.secundaria) || 0);
        setText('hidra-cap-paap-total', fmt(paapTot));
        const ptarTot = (Number(state.capPtar?.a1) || 0) + (Number(state.capPtar?.a2) || 0) + (Number(state.capPtar?.a3) || 0);
        setText('hidra-cap-ptar-total', fmt(ptarTot));
    }

    // Nivel de acceso POR MÓDULO usando el sistema global existente (data-manager).
    // 'Solo ver' (read) → no puede capturar; capture/edit/admin sí. No inventa un
    // sistema propio: reutiliza window.canCaptureSection('hidraulicas').
    function canCaptureHidra() {
        try {
            if (typeof window.canCaptureSection === 'function') return window.canCaptureSection('hidraulicas');
            if (typeof window.canCapture === 'function') return window.canCapture();
        } catch (_) {}
        return true; // si el sistema de permisos no está cargado, la RLS del servidor es la barrera final
    }

    // Oculta la pestaña 'Captura de datos' y deshabilita Guardar para solo-lectura.
    function applyAccessLevel() {
        const canCap  = canCaptureHidra();
        const tabEdit = $('hidra-tabbtn-edit');
        if (tabEdit && tabEdit.parentElement) tabEdit.parentElement.style.display = canCap ? '' : 'none';
        const saveBtn = $('hidra-cap-save');
        if (saveBtn) saveBtn.disabled = !canCap;
        if (!canCap) {
            // Si el usuario estaba en la pestaña de captura, regresarlo al Dashboard.
            const dashBtn = $('hidra-tabbtn-dash');
            try {
                if (dashBtn && window.bootstrap && window.bootstrap.Tab) new window.bootstrap.Tab(dashBtn).show();
            } catch (_) {}
        }
    }

    async function saveDayEditor() {
        const status = $('hidra-cap-status');
        // Refuerzo de permiso: bloquear el guardado si el usuario es de solo lectura
        // en este módulo (p. ej. Hidráulicas marcado como 'Solo ver' en el admin).
        if (!canCaptureHidra()) {
            if (status) status.textContent = 'Modo solo lectura: no tienes permiso para capturar en Hidráulicas.';
            return;
        }
        const y = state.capYear, m = state.capMonth, d = state.capDay;
        if (!y || !m || !d) { if (status) status.textContent = 'Selecciona año, mes y día.'; return; }
        const client = await getClient();
        if (!client) { if (status) status.textContent = 'Supabase no disponible'; return; }

        // ── Extracción por pozo ──
        const exUpsert = [], exDelete = [];
        for (const r of state.capPozos) {
            const total = r.total;
            const changed = (String(r._origTotal) !== String(total));
            const isEmpty = (total === '' || total === null);
            if (!changed) continue;
            if (isEmpty && r._id) { exDelete.push(r._id); }
            else if (!isEmpty) {
                const vtot = Number(total) || 0;
                exUpsert.push({
                    anio: y, mes: m, dia: d, pozo: r.pozo,
                    cd_militar_m3: 0, aifa_m3: 0, volumen_m3: vtot,
                    observaciones: r.obs ? String(r.obs).trim() : null,
                });
            }
        }

        // ── PAAP ──
        const paap = state.capPaap || {};
        const paapChanged = (String(paap._origPri) !== String(paap.primaria)) || (String(paap._origSec) !== String(paap.secundaria));
        const paapEmpty = (paap.primaria === '' || paap.primaria === null) && (paap.secundaria === '' || paap.secundaria === null);

        // ── PTAR ──
        const ptar = state.capPtar || {};
        const ptarChanged = (String(ptar._origA1) !== String(ptar.a1)) || (String(ptar._origA2) !== String(ptar.a2)) || (String(ptar._origA3) !== String(ptar.a3));
        const ptarEmpty = (ptar.a1 === '' || ptar.a1 === null) && (ptar.a2 === '' || ptar.a2 === null) && (ptar.a3 === '' || ptar.a3 === null);

        if (!exUpsert.length && !exDelete.length && !paapChanged && !ptarChanged) {
            if (status) status.textContent = 'Sin cambios.'; return;
        }
        if (status) status.textContent = 'Guardando…';
        try {
            if (exDelete.length) {
                const { error } = await client.from(TBL_DIARIA).delete().in('id', exDelete);
                if (error) throw error;
            }
            if (exUpsert.length) {
                const { error } = await client.from(TBL_DIARIA).upsert(exUpsert, { onConflict: 'anio,mes,dia,pozo' });
                if (error) throw error;
            }
            if (paapChanged) {
                if (paapEmpty && paap._id) {
                    const { error } = await client.from(TBL_PAAP).delete().eq('id', paap._id);
                    if (error) throw error;
                } else if (!paapEmpty) {
                    const { error } = await client.from(TBL_PAAP).upsert({
                        anio: y, mes: m, dia: d,
                        primaria_m3:   Number(paap.primaria) || 0,
                        secundaria_m3: Number(paap.secundaria) || 0,
                    }, { onConflict: 'anio,mes,dia' });
                    if (error) throw error;
                }
            }
            if (ptarChanged) {
                if (ptarEmpty && ptar._id) {
                    const { error } = await client.from(TBL_PTAR).delete().eq('id', ptar._id);
                    if (error) throw error;
                } else if (!ptarEmpty) {
                    const { error } = await client.from(TBL_PTAR).upsert({
                        anio: y, mes: m, dia: d,
                        a1_m3: Number(ptar.a1) || 0,
                        a2_m3: Number(ptar.a2) || 0,
                        a3_m3: Number(ptar.a3) || 0,
                    }, { onConflict: 'anio,mes,dia' });
                    if (error) throw error;
                }
            }
            // Recargar todo desde el detalle diario y re-renderizar
            if (status) status.textContent = `Guardado · ${MES_NOMBRES_LARGOS[m - 1]} ${d}, ${y}.`;
            state.loaded = false; state.dailyLoaded = false; state.paapLoaded = false; state.ptarLoaded = false;
            await loadAll(true);
            refreshSelects();
            renderDashboard();
            await loadDayEditor();
        } catch (err) {
            console.error('[hidraulicas] saveDayEditor error:', err);
            if (status) status.textContent = 'Error al guardar: ' + (err.message || err);
        }
    }

    // ─── Export Excel (SheetJS) ────────────────────────────────
    function buildAndDownloadExcel() {
        if (typeof XLSX === 'undefined') { setStatus('XLSX no disponible', 'err'); return; }
        const y = state.selectedYear, mIdx = (state.selectedMonth || 1) - 1;
        const extrM = aggregateMonthlyForYear(y, '');
        const distM = distribMonthly(y), aifaM = aifaMonthly(y), cdmM = cdmilMonthly(y);
        const wb = XLSX.utils.book_new();

        // Hoja: Resumen anual
        const aoaA = [
            ['Resumen Anual del Aprovechamiento del Agua', y],
            [],
            ['', 'Extracción anual (m³)', 'Distribución anual (m³)', 'Demanda AIFA anual (m³)', 'Demanda Cd. Militar anual (m³)'],
            ['Total', sum(extrM), sum(distM), sum(aifaM), sum(cdmM)],
            [],
            ['Mes', 'Trimestre', 'Extracción', 'Distribución', 'Demanda AIFA', 'Demanda Cd. Militar'],
        ];
        MES_NOMBRES_LARGOS.forEach((mn, i) => aoaA.push([mn, 'Q' + quarterOfMonth(i + 1), extrM[i], distM[i], aifaM[i], cdmM[i]]));
        aoaA.push(['Total', '', sum(extrM), sum(distM), sum(aifaM), sum(cdmM)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaA), 'Resumen anual');

        // Hoja: Mensual (mes seleccionado)
        const aoaM = [
            ['Datos del Aprovechamiento del Agua Mensual', MES_NOMBRES_LARGOS[mIdx], y],
            [],
            ['', 'Extracción mensual', 'Distribución mensual', 'Demanda AIFA mensual', 'Demanda Cd. Militar mensual'],
            ['Total', extrM[mIdx], distM[mIdx], aifaM[mIdx], cdmM[mIdx]],
            [],
            ['Pozo', 'Extracción del mes (m³)', '% del total'],
        ];
        const pozoMonth = aggregateByPozoForMonth(y, mIdx);
        const totMonth = pozoMonth.reduce((s, d) => s + d[1], 0) || 1;
        pozoMonth.forEach(([p, v]) => aoaM.push([p, v, Number((v / totMonth * 100).toFixed(2))]));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaM), 'Mensual');

        // Hoja: Extracción por pozo (matriz)
        const aoaP = [['Pozo', ...MES_NOMBRES_CORTOS, 'Total']];
        const colTot = new Array(12).fill(0); let grand = 0;
        state.pozos.forEach(p => {
            const months = aggregateMonthlyForYear(y, p);
            const t = sum(months); grand += t;
            months.forEach((v, i) => colTot[i] += v);
            aoaP.push([p, ...months, t]);
        });
        aoaP.push(['Total', ...colTot, grand]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaP), 'Extracción por pozo');

        // Hoja: Distribución / demanda (PAAP + demanda por pozo)
        const priM = paapMonthlyField(y, 'primaria_m3'), secM = paapMonthlyField(y, 'secundaria_m3');
        const aoaD = [['Mes', 'Trimestre', 'PAAP Primaria', 'PAAP Secundaria', 'Distribución (PAAP)', 'Demanda AIFA', 'Demanda Cd. Militar']];
        MES_NOMBRES_LARGOS.forEach((mn, i) => aoaD.push([mn, 'Q' + quarterOfMonth(i + 1), priM[i], secM[i], distM[i], aifaM[i], cdmM[i]]));
        aoaD.push(['Total', '', sum(priM), sum(secM), sum(distM), sum(aifaM), sum(cdmM)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaD), 'Distribución');

        // Hoja: Tratamiento PTAR
        const a1M = ptarMonthlyField(y, 'a1_m3'), a2M = ptarMonthlyField(y, 'a2_m3'), a3M = ptarMonthlyField(y, 'a3_m3');
        const aoaT = [['Mes', 'Trimestre', 'PTAR A1', 'PTAR A2', 'PTAR A3', 'Total PTAR']];
        MES_NOMBRES_LARGOS.forEach((mn, i) => aoaT.push([mn, 'Q' + quarterOfMonth(i + 1), a1M[i], a2M[i], a3M[i], a1M[i] + a2M[i] + a3M[i]]));
        aoaT.push(['Total', '', sum(a1M), sum(a2M), sum(a3M), sum(a1M) + sum(a2M) + sum(a3M)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaT), 'Tratamiento PTAR');

        XLSX.writeFile(wb, `Aprovechamiento_Agua_${y}.xlsx`);
    }

    // ─── Bindings ──────────────────────────────────────────────
    function bind() {
        if (bound) return; bound = true;

        $('hidra-filter-year')?.addEventListener('change', () => {
            state.selectedYear = Number($('hidra-filter-year').value) || state.selectedYear;
            populateFilterDaySelect(state.selectedYear, state.selectedMonth, state.selectedDay);
            renderDashboard();
        });
        $('hidra-filter-month')?.addEventListener('change', () => {
            state.selectedMonth = Number($('hidra-filter-month').value) || 0;
            // al cambiar el mes, reconstruir días y resetear a "Todo el mes"
            state.selectedDay = 0;
            populateFilterDaySelect(state.selectedYear, state.selectedMonth, 0);
            renderMonthlyPanel();
        });
        $('hidra-filter-day')?.addEventListener('change', () => {
            state.selectedDay = Number($('hidra-filter-day').value) || 0;
            renderMonthlyPanel();
        });
        $('hidra-filter-pozo')?.addEventListener('change', () => {
            state.selectedPozo = $('hidra-filter-pozo').value || '';
            renderDashboard();
        });
        $('hidra-btn-refresh')?.addEventListener('click', async () => {
            state.loaded = false; state.dailyLoaded = false; state.paapLoaded = false; state.ptarLoaded = false;
            await loadAll(true);
            refreshSelects();
            renderDashboard();
        });
        $('hidra-btn-export')?.addEventListener('click', buildAndDownloadExcel);

        // editor de captura por día
        $('hidra-cap-month')?.addEventListener('change', () => {
            state.capMonth = Number($('hidra-cap-month').value) || state.capMonth;
            populateDaySelect('hidra-cap-day', state.capYear, state.capMonth, state.capDay);
            updateCapQuarterBadge();
        });
        $('hidra-cap-year')?.addEventListener('change', () => {
            state.capYear = Number($('hidra-cap-year').value) || state.capYear;
            populateDaySelect('hidra-cap-day', state.capYear, state.capMonth, state.capDay);
        });
        $('hidra-cap-load')?.addEventListener('click', () => {
            state.capYear  = Number($('hidra-cap-year').value) || state.capYear;
            state.capMonth = Number($('hidra-cap-month').value) || state.capMonth;
            state.capDay   = Number($('hidra-cap-day').value) || state.capDay;
            loadDayEditor();
        });
        $('hidra-cap-save')?.addEventListener('click', saveDayEditor);
    }

    // ─── Init ──────────────────────────────────────────────────
    async function init() {
        if (!initDone) {
            const now = new Date(); const curMonth = now.getMonth() + 1;
            state.selectedYear  = now.getFullYear();
            state.selectedMonth = curMonth;
            state.capYear  = now.getFullYear();
            state.capMonth = curMonth;
            state.capDay   = now.getDate();
            populateMonthSelect('hidra-cap-month', curMonth);
            populateDaySelect('hidra-cap-day', state.capYear, state.capMonth, state.capDay);
            bind();
            initDone = true;
        }
        await loadAll(false);
        refreshSelects();
        updateCapQuarterBadge();
        renderDashboard();
        applyAccessLevel();
    }

    window.addEventListener('hidraulicas:visible', () => {
        init().catch(e => console.error('[hidraulicas] init error', e));
    });

    window.hidraulicasModule = { init, loadAll, loadAux, renderDashboard, state };
})();
