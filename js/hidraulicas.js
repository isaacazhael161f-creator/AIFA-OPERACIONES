/* ============================================================
 *  GOMIH · Extracción de Agua
 *  Subdirección de Ingeniería · Gerencia de Op. y Mtto.
 *  Instalaciones Hidráulicas
 *
 *  Lee la tabla ancha existente public."Extracción_agua"
 *  (POZO + Enero..Diciembre + Año) para el dashboard.
 *  Editor diario opera contra public."Extracción_agua_diaria"
 *  y, al guardar, recalcula la celda mensual correspondiente
 *  en la tabla ancha.
 * ============================================================ */
;(function () {
    'use strict';

    const TBL_MENSUAL = 'Extracción_agua';
    const TBL_DIARIA  = 'Extracción_agua_diaria';

    const MES_NOMBRES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const MES_NOMBRES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const state = {
        rows: [],          // tabla ancha cruda
        loaded: false,
        loading: false,
        years: [],
        pozos: [],
        selectedYear: null,
        selectedPozo: '',  // '' = todos

        // editor
        editYear: null,
        editMonth: null,
        editPozo: '',
        editRows: [],      // [{ day, volumen_m3, observaciones, _id, _origVol, _origObs, _dirty }]
    };

    const charts = { monthly: null, yoy: null, pozos: null, perPozo: null, cumulative: null };
    let initDone = false;

    // ─── Helpers ───────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const fmt = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });
    };
    /** Convierte "9,759.94" / "9759.94" / 12.3 en number */
    function toNum(v) {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return isFinite(v) ? v : 0;
        const cleaned = String(v).replace(/[\s,]/g, '');
        const n = parseFloat(cleaned);
        return isFinite(n) ? n : 0;
    }
    function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

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

    // ─── Carga ─────────────────────────────────────────────────
    async function loadAll(force) {
        if (state.loading) return;
        if (state.loaded && !force) return;
        state.loading = true;
        setStatus('Cargando…', 'info');
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client.from(TBL_MENSUAL).select('*');
            if (error) throw error;
            state.rows = data || [];
            state.loaded = true;
            indexRows();
            setStatus(`${state.rows.length} registros · ${state.pozos.length} pozos`, 'ok');
        } catch (err) {
            console.error('[hidraulicas] loadAll error:', err);
            setStatus('Error al cargar', 'err');
        } finally {
            state.loading = false;
        }
    }

    function indexRows() {
        const ySet = new Set(), pSet = new Set();
        for (const r of state.rows) {
            const y = Number(r['Año'] ?? r['Anio'] ?? r['anio']);
            if (Number.isFinite(y)) ySet.add(y);
            const p = String(r['POZO'] ?? r['pozo'] ?? '').trim();
            if (p) pSet.add(p);
        }
        state.years = [...ySet].sort((a, b) => b - a);
        // ordenar pozos numéricamente "Pozo 1", "Pozo 2", ..., "Pozo 10"
        state.pozos = [...pSet].sort((a, b) => {
            const na = parseInt(String(a).match(/\d+/) || [0], 10);
            const nb = parseInt(String(b).match(/\d+/) || [0], 10);
            if (na !== nb) return na - nb;
            return String(a).localeCompare(String(b));
        });
        if (!state.years.length) state.years.push(new Date().getFullYear());
        if (!state.years.includes(state.selectedYear)) state.selectedYear = state.years[0];
    }

    // ─── Agregaciones ──────────────────────────────────────────
    function getRowsByYear(year) {
        return state.rows.filter(r => Number(r['Año']) === year);
    }
    function rowMonths(r) {
        // Devuelve un array de 12 elementos numéricos a partir de la fila ancha.
        return MES_NOMBRES_LARGOS.map(name => toNum(r[name]));
    }
    function rowPozo(r) { return String(r['POZO'] ?? '').trim(); }

    function aggregateMonthlyForYear(year, pozo) {
        const arr = new Array(12).fill(0);
        for (const r of getRowsByYear(year)) {
            if (pozo && rowPozo(r) !== pozo) continue;
            const m = rowMonths(r);
            for (let i = 0; i < 12; i++) arr[i] += m[i];
        }
        return arr;
    }
    function aggregateByPozoForYear(year) {
        const map = new Map();
        for (const r of getRowsByYear(year)) {
            const p = rowPozo(r) || 'Sin pozo';
            const total = rowMonths(r).reduce((a, b) => a + b, 0);
            map.set(p, (map.get(p) || 0) + total);
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }
    function cumulative(monthlyArr) {
        const out = new Array(12).fill(0);
        let acc = 0;
        for (let i = 0; i < 12; i++) { acc += monthlyArr[i] || 0; out[i] = acc; }
        return out;
    }

    // ─── Filtros UI ────────────────────────────────────────────
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
    function populateMonthSelect(id) {
        const sel = $(id); if (!sel) return;
        const prev = sel.value || state.editMonth || (new Date().getMonth() + 1);
        sel.innerHTML = MES_NOMBRES_LARGOS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('');
        sel.value = String(prev);
    }

    // ─── KPIs ──────────────────────────────────────────────────
    function renderKpis() {
        const monthly = aggregateMonthlyForYear(state.selectedYear, state.selectedPozo);
        const total = monthly.reduce((a, b) => a + b, 0);

        let topMes = -1, topVal = -Infinity;
        for (let i = 0; i < 12; i++) if (monthly[i] > topVal) { topVal = monthly[i]; topMes = i; }

        const mesesConDato = monthly.filter(v => v > 0).length || 1;
        const promMensual = total / mesesConDato;

        const byPozo = aggregateByPozoForYear(state.selectedYear);
        const topPozo = byPozo.length ? byPozo[0] : null;

        $('hidra-kpi-anio').textContent = fmt(total);
        $('hidra-kpi-mes-top').textContent = topVal > 0 ? fmt(topVal) : '—';
        $('hidra-kpi-mes-top-name').textContent = topMes >= 0 && topVal > 0 ? MES_NOMBRES_LARGOS[topMes] : '—';
        $('hidra-kpi-prom').textContent = fmt(promMensual);
        $('hidra-kpi-max').textContent = topPozo ? fmt(topPozo[1]) : '—';
        $('hidra-kpi-max-day').textContent = topPozo ? topPozo[0] : '—';
    }

    // ─── Charts ────────────────────────────────────────────────
    function destroyChart(k) { if (charts[k]) { charts[k].destroy(); charts[k] = null; } }

    function renderMonthlyChart() {
        const ctx = $('hidra-chart-monthly'); if (!ctx || typeof Chart === 'undefined') return;
        const data = aggregateMonthlyForYear(state.selectedYear, state.selectedPozo);
        destroyChart('monthly');
        charts.monthly = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: MES_NOMBRES_CORTOS,
                datasets: [{
                    label: `${state.selectedYear} · m³` + (state.selectedPozo ? ` · ${state.selectedPozo}` : ''),
                    data,
                    backgroundColor: ctxRef => {
                        const c = ctxRef.chart.canvas.getContext('2d');
                        const g = c.createLinearGradient(0, 0, 0, 280);
                        g.addColorStop(0, '#3b82f6'); g.addColorStop(1, '#0ea5e9');
                        return g;
                    },
                    borderRadius: 6, maxBarThickness: 48,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.y)} m³` } },
                },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } }, x: { grid: { display: false } } },
            },
        });
    }

    function renderYoyChart() {
        const ctx = $('hidra-chart-yoy'); if (!ctx || typeof Chart === 'undefined') return;
        const palette = ['#2f6fb5', '#e07a3c', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
        const years = state.years.slice(0, 6);
        const ds = years.map((y, i) => ({
            label: String(y),
            data: aggregateMonthlyForYear(y, state.selectedPozo),
            backgroundColor: palette[i % palette.length],
            borderColor: palette[i % palette.length],
            borderWidth: 0,
            borderRadius: 2,
            categoryPercentage: 0.78,
            barPercentage: 0.92,
        }));
        destroyChart('yoy');
        const hasDataLabels = typeof window !== 'undefined' && window.ChartDataLabels;
        charts.yoy = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: MES_NOMBRES_CORTOS, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                layout: { padding: { top: 24 } },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 } } },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                    datalabels: hasDataLabels ? {
                        anchor: 'end', align: 'end', offset: 2,
                        rotation: -90,
                        font: { size: 10, weight: '600' },
                        color: '#374151',
                        formatter: v => v ? fmt(Math.round(v)) : '',
                    } : undefined,
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => fmt(v) }, grid: { color: '#e5e7eb' } },
                    x: { grid: { display: false } },
                },
            },
            plugins: hasDataLabels ? [window.ChartDataLabels] : [],
        });
    }

    function renderPozosChart() {
        const ctx = $('hidra-chart-pozos'); if (!ctx || typeof Chart === 'undefined') return;
        const data = aggregateByPozoForYear(state.selectedYear);
        const palette = ['#1d4ed8', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0e7490', '#6d28d9', '#0f766e'];
        destroyChart('pozos');
        if (!data.length) return;
        charts.pozos = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(d => d[0]),
                datasets: [{
                    data: data.map(d => d[1]),
                    backgroundColor: data.map((_, i) => palette[i % palette.length]),
                    borderWidth: 2, borderColor: '#fff',
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '58%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: c => {
                                const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
                                const pct = (c.parsed / total * 100).toFixed(1);
                                return ` ${c.label}: ${fmt(c.parsed)} m³ (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    function renderPerPozoChart() {
        const ctx = $('hidra-chart-per-pozo'); if (!ctx || typeof Chart === 'undefined') return;
        const palette = ['#1d4ed8', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0e7490', '#6d28d9', '#0f766e'];
        const rows = getRowsByYear(state.selectedYear);
        const datasets = rows.map((r, i) => ({
            label: rowPozo(r) || `Fila ${i + 1}`,
            data: rowMonths(r),
            backgroundColor: palette[i % palette.length],
            borderColor: palette[i % palette.length],
            borderWidth: 1,
            stack: 'stack0',
        }));
        destroyChart('perPozo');
        charts.perPozo = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: MES_NOMBRES_CORTOS, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                },
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, beginAtZero: true, ticks: { callback: v => fmt(v) } },
                },
            },
        });
    }

    function renderCumulativeChart() {
        const ctx = $('hidra-chart-cumulative'); if (!ctx || typeof Chart === 'undefined') return;
        const yCurr = state.selectedYear, yPrev = yCurr - 1;
        const cur  = cumulative(aggregateMonthlyForYear(yCurr, state.selectedPozo));
        const prev = cumulative(aggregateMonthlyForYear(yPrev, state.selectedPozo));
        destroyChart('cumulative');
        charts.cumulative = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: MES_NOMBRES_CORTOS,
                datasets: [
                    { label: String(yPrev), data: prev,  borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,.15)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 2 },
                    { label: String(yCurr), data: cur,   borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,.15)',  borderWidth: 3, tension: 0.3, fill: true, pointRadius: 3 },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } } },
            },
        });
    }

    function renderDashboard() {
        renderKpis();
        renderMonthlyChart();
        renderYoyChart();
        renderPozosChart();
        renderPerPozoChart();
        renderCumulativeChart();
    }

    // ─── Editor diario ─────────────────────────────────────────
    async function loadEditorRows() {
        const tbody = $('hidra-edit-tbody'); if (!tbody) return;
        const status = $('hidra-edit-status');
        const y = state.editYear, m = state.editMonth, pozo = state.editPozo.trim();

        if (!y || !m || !pozo) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Selecciona año, mes y pozo, y haz clic en <strong>Cargar</strong>.</td></tr>';
            return;
        }

        if (status) status.textContent = 'Cargando…';
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin"></i> Cargando…</td></tr>';

        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client
                .from(TBL_DIARIA)
                .select('id,anio,mes,dia,pozo,volumen_m3,observaciones')
                .eq('anio', y).eq('mes', m).eq('pozo', pozo);
            if (error) throw error;

            const map = new Map();
            for (const r of (data || [])) map.set(r.dia, r);

            const dim = daysInMonth(y, m);
            const rows = [];
            for (let d = 1; d <= dim; d++) {
                const r = map.get(d);
                rows.push({
                    day: d,
                    fecha: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                    volumen_m3:    r ? Number(r.volumen_m3) : '',
                    observaciones: r ? (r.observaciones || '') : '',
                    _id:      r ? r.id : null,
                    _origVol: r ? Number(r.volumen_m3) : '',
                    _origObs: r ? (r.observaciones || '') : '',
                    _dirty: false,
                });
            }
            state.editRows = rows;
            renderEditor();
            if (status) status.textContent = `${(data || []).length} días con dato.`;
        } catch (err) {
            console.error('[hidraulicas] loadEditorRows error:', err);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error: ${err.message || err}</td></tr>`;
            if (status) status.textContent = '';
        }
    }

    function renderEditor() {
        const tbody = $('hidra-edit-tbody'); if (!tbody) return;
        const dim = state.editRows.length;
        $('hidra-edit-dias-mes').textContent = dim;
        const html = state.editRows.map(r => {
            const we = (() => {
                const d = new Date(state.editYear, state.editMonth - 1, r.day).getDay();
                return d === 0 || d === 6;
            })();
            return `<tr class="${we ? 'hidra-weekend' : ''}" data-day="${r.day}">
                <td class="text-center fw-bold">${r.day}</td>
                <td class="text-muted small">${r.fecha}</td>
                <td>
                    <input type="number" step="0.01" min="0" class="form-control form-control-sm hidra-input-vol"
                           value="${r.volumen_m3 === '' ? '' : r.volumen_m3}" placeholder="0">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm hidra-input-obs"
                           value="${escapeHtml(r.observaciones)}" placeholder="—">
                </td>
            </tr>`;
        }).join('');
        tbody.innerHTML = html;
        attachEditorInputs();
        recalcEditorTotals();
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function attachEditorInputs() {
        const tbody = $('hidra-edit-tbody'); if (!tbody) return;
        tbody.querySelectorAll('tr[data-day]').forEach(tr => {
            const day = Number(tr.dataset.day);
            const row = state.editRows.find(r => r.day === day); if (!row) return;
            const vol = tr.querySelector('.hidra-input-vol');
            const obs = tr.querySelector('.hidra-input-obs');
            const markDirty = () => {
                const newVol = vol.value === '' ? '' : Number(vol.value);
                const newObs = obs.value;
                row.volumen_m3   = newVol;
                row.observaciones = newObs;
                const dirty = (String(row._origVol) !== String(row.volumen_m3)) || (row._origObs !== row.observaciones);
                row._dirty = dirty;
                vol.classList.toggle('hidra-changed', dirty);
                obs.classList.toggle('hidra-changed', dirty);
                recalcEditorTotals();
            };
            vol.addEventListener('input', markDirty);
            obs.addEventListener('input', markDirty);
        });
    }

    function recalcEditorTotals() {
        let totalMes = 0, dias = 0;
        for (const r of state.editRows) {
            if (r.volumen_m3 === '' || r.volumen_m3 === null) continue;
            const v = Number(r.volumen_m3);
            if (!isFinite(v) || v < 0) continue;
            totalMes += v; dias++;
        }
        // acumulado del año = sum de las 12 columnas mensuales del pozo seleccionado,
        // reemplazando el mes actual por el total del editor.
        const pozo = state.editPozo.trim();
        let savedYearForPozo = 0, savedMonthForPozo = 0;
        for (const r of getRowsByYear(state.editYear)) {
            if (rowPozo(r) !== pozo) continue;
            const months = rowMonths(r);
            for (let i = 0; i < 12; i++) savedYearForPozo += months[i];
            savedMonthForPozo += months[state.editMonth - 1];
        }
        const acumAnio = savedYearForPozo - savedMonthForPozo + totalMes;
        $('hidra-edit-total-mes').textContent = fmt(totalMes);
        $('hidra-edit-total-anio').textContent = fmt(acumAnio);
        $('hidra-edit-dias-llenos').textContent = dias;
    }

    /** Suma todos los días en la tabla diaria para (anio,mes,pozo) y escribe la celda mensual. */
    async function syncMonthlyCell(client, year, month, pozo) {
        // 1) suma desde diaria
        const { data, error } = await client
            .from(TBL_DIARIA)
            .select('volumen_m3')
            .eq('anio', year).eq('mes', month).eq('pozo', pozo);
        if (error) throw error;
        const total = (data || []).reduce((a, r) => a + (Number(r.volumen_m3) || 0), 0);
        const monthCol = MES_NOMBRES_LARGOS[month - 1];
        const valStr = total.toFixed(2); // guardamos como string sin comas

        // 2) ¿existe la fila ancha (POZO, Año)?
        const { data: existing, error: selErr } = await client
            .from(TBL_MENSUAL)
            .select('POZO,Año')
            .eq('POZO', pozo).eq('Año', year);
        if (selErr) throw selErr;

        if (existing && existing.length) {
            const upd = {}; upd[monthCol] = valStr;
            const { error: upErr } = await client
                .from(TBL_MENSUAL)
                .update(upd)
                .eq('POZO', pozo).eq('Año', year);
            if (upErr) throw upErr;
        } else {
            const ins = { POZO: pozo, 'Año': year }; ins[monthCol] = valStr;
            const { error: insErr } = await client.from(TBL_MENSUAL).insert(ins);
            if (insErr) throw insErr;
        }
    }

    async function saveEditor() {
        const status = $('hidra-edit-status');
        const dirty = state.editRows.filter(r => r._dirty);
        if (!state.editYear || !state.editMonth || !state.editPozo.trim()) {
            if (status) status.textContent = 'Selecciona año, mes y pozo.';
            return;
        }
        if (!dirty.length) { if (status) status.textContent = 'Sin cambios.'; return; }

        const client = await getClient();
        if (!client) { if (status) status.textContent = 'Supabase no disponible'; return; }

        const toUpsert = [];
        const toDelete = [];
        for (const r of dirty) {
            const isEmpty = r.volumen_m3 === '' || r.volumen_m3 === null;
            if (isEmpty && r._id) {
                toDelete.push(r._id);
            } else if (!isEmpty) {
                toUpsert.push({
                    anio: state.editYear,
                    mes:  state.editMonth,
                    dia:  r.day,
                    pozo: state.editPozo.trim(),
                    volumen_m3: Number(r.volumen_m3) || 0,
                    observaciones: r.observaciones ? String(r.observaciones).trim() : null,
                });
            }
        }

        if (status) status.textContent = `Guardando ${dirty.length} cambios…`;
        try {
            if (toDelete.length) {
                const { error } = await client.from(TBL_DIARIA).delete().in('id', toDelete);
                if (error) throw error;
            }
            if (toUpsert.length) {
                const { error } = await client
                    .from(TBL_DIARIA)
                    .upsert(toUpsert, { onConflict: 'anio,mes,dia,pozo' });
                if (error) throw error;
            }

            // Recalcula la celda mensual en la tabla ancha
            await syncMonthlyCell(client, state.editYear, state.editMonth, state.editPozo.trim());

            if (status) status.textContent = `Guardado · ${dirty.length} cambios. Mensual recalculado.`;

            // Refrescar dashboard con la fila ancha actualizada
            state.loaded = false;
            await loadAll(true);
            populateYearSelect('hidra-filter-year', state.selectedYear);
            populatePozoSelect('hidra-filter-pozo', true);
            populateYearSelect('hidra-edit-year', state.editYear);
            populatePozoSelect('hidra-edit-pozo', false);
            renderDashboard();
            await loadEditorRows();
        } catch (err) {
            console.error('[hidraulicas] saveEditor error:', err);
            if (status) status.textContent = 'Error al guardar: ' + (err.message || err);
        }
    }

    // ─── Bindings ──────────────────────────────────────────────
    let bound = false;
    function bind() {
        if (bound) return; bound = true;

        $('hidra-filter-year')?.addEventListener('change', () => {
            state.selectedYear = Number($('hidra-filter-year').value) || state.selectedYear;
            renderDashboard();
        });
        $('hidra-filter-pozo')?.addEventListener('change', () => {
            state.selectedPozo = $('hidra-filter-pozo').value || '';
            renderDashboard();
        });
        $('hidra-btn-refresh')?.addEventListener('click', async () => {
            state.loaded = false;
            await loadAll(true);
            populateYearSelect('hidra-filter-year', state.selectedYear);
            populatePozoSelect('hidra-filter-pozo', true);
            populateYearSelect('hidra-edit-year', state.editYear);
            populatePozoSelect('hidra-edit-pozo', false);
            renderDashboard();
        });

        $('hidra-edit-load')?.addEventListener('click', () => {
            state.editYear  = Number($('hidra-edit-year').value) || state.editYear;
            state.editMonth = Number($('hidra-edit-month').value) || state.editMonth;
            state.editPozo  = $('hidra-edit-pozo').value || '';
            loadEditorRows();
        });
        $('hidra-edit-save')?.addEventListener('click', saveEditor);
    }

    // ─── Init ──────────────────────────────────────────────────
    async function init() {
        if (!initDone) {
            const now = new Date();
            state.editYear  = now.getFullYear();
            state.editMonth = now.getMonth() + 1;
            state.selectedYear = now.getFullYear();
            populateMonthSelect('hidra-edit-month');
            bind();
            initDone = true;
        }
        await loadAll(false);
        populateYearSelect('hidra-filter-year', state.selectedYear);
        populatePozoSelect('hidra-filter-pozo', true);
        populateYearSelect('hidra-edit-year', state.editYear);
        populatePozoSelect('hidra-edit-pozo', false);
        renderDashboard();
    }

    window.addEventListener('hidraulicas:visible', () => {
        init().catch(e => console.error('[hidraulicas] init error', e));
    });

    window.hidraulicasModule = { init, loadAll, renderDashboard, state };
})();
