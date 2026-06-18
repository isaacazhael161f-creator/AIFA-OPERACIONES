/* ============================================================
 *  GOMIH · Extracción de Agua
 *  Subdirección de Ingeniería · Gerencia de Op. y Mtto.
 *  Instalaciones Hidráulicas
 *
 *  Dashboard (Chart.js) + editor diario por mes que se sincroniza
 *  con la tabla `Extracción_agua` en Supabase.
 * ============================================================ */
;(function () {
    'use strict';

    const TABLE_NAME = 'Extracción_agua'; // nombre exacto en Supabase
    const MES_NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const MES_LARGOS  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const state = {
        rows: [],
        loaded: false,
        loading: false,
        years: [],
        pozos: [],
        selectedYear: new Date().getFullYear(),
        selectedPozo: '',
        // editor
        editRows: [],            // [{ day, fecha, volumen_m3, observaciones, _id, _dirty }]
        editYear: new Date().getFullYear(),
        editMonth: new Date().getMonth() + 1,
        editPozo: '',
    };

    const charts = {
        monthly: null,
        yoy: null,
        pozos: null,
        cumulative: null,
    };

    // ─── Helpers ───────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const fmt = (n) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        const num = Number(n);
        return num.toLocaleString('es-MX', { maximumFractionDigits: 2 });
    };
    const parseDate = (v) => {
        if (!v) return null;
        const s = String(v).slice(0, 10);
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (!m) return null;
        return { year: +m[1], month: +m[2], day: +m[3], iso: s };
    };
    const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
    const isWeekend = (year, month, day) => {
        const d = new Date(year, month - 1, day).getDay();
        return d === 0 || d === 6;
    };

    async function getClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.ensureSupabaseClient === 'function') {
            return await window.ensureSupabaseClient();
        }
        return null;
    }

    function setStatus(text, kind) {
        const el = $('hidra-status-badge');
        if (!el) return;
        el.textContent = text;
        el.className = 'badge ' + ({
            ok:    'bg-success',
            warn:  'bg-warning text-dark',
            err:   'bg-danger',
            info:  'bg-info text-dark',
            mute:  'bg-secondary',
        }[kind] || 'bg-secondary');
    }

    // ─── Data loading ──────────────────────────────────────────
    async function loadAll(force) {
        if (state.loading) return;
        if (state.loaded && !force) return;
        state.loading = true;
        setStatus('Cargando…', 'info');
        try {
            const client = await getClient();
            if (!client) throw new Error('Supabase no disponible');
            // Paged fetch
            const all = [];
            const PAGE = 1000;
            let from = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { data, error } = await client
                    .from(TABLE_NAME)
                    .select('id,fecha,pozo,volumen_m3,observaciones')
                    .order('fecha', { ascending: true })
                    .range(from, from + PAGE - 1);
                if (error) throw error;
                if (!data || !data.length) break;
                all.push(...data);
                if (data.length < PAGE) break;
                from += PAGE;
            }
            state.rows = all;
            state.loaded = true;
            indexRows();
            setStatus(`${all.length.toLocaleString('es-MX')} registros`, 'ok');
        } catch (err) {
            console.error('[hidraulicas] loadAll error:', err);
            setStatus('Error al cargar', 'err');
        } finally {
            state.loading = false;
        }
    }

    function indexRows() {
        const ySet = new Set();
        const pSet = new Set();
        for (const r of state.rows) {
            const d = parseDate(r.fecha);
            if (d) ySet.add(d.year);
            if (r.pozo && String(r.pozo).trim()) pSet.add(String(r.pozo).trim());
        }
        state.years = [...ySet].sort((a, b) => b - a);
        state.pozos = [...pSet].sort();
        if (!state.years.length) state.years.push(new Date().getFullYear());
        if (!state.years.includes(state.selectedYear)) state.selectedYear = state.years[0];
    }

    // ─── Aggregation ───────────────────────────────────────────
    function getFiltered(year, pozo) {
        return state.rows.filter(r => {
            const d = parseDate(r.fecha);
            if (!d) return false;
            if (year && d.year !== year) return false;
            if (pozo && String(r.pozo || '').trim() !== pozo) return false;
            return true;
        });
    }

    function aggregateByMonth(rows) {
        const arr = new Array(12).fill(0);
        for (const r of rows) {
            const d = parseDate(r.fecha);
            if (!d) continue;
            arr[d.month - 1] += Number(r.volumen_m3) || 0;
        }
        return arr;
    }

    function aggregateByDay(rows) {
        const map = new Map();
        for (const r of rows) {
            const d = parseDate(r.fecha);
            if (!d) continue;
            map.set(d.iso, (map.get(d.iso) || 0) + (Number(r.volumen_m3) || 0));
        }
        return map;
    }

    function aggregateByPozo(rows) {
        const map = new Map();
        for (const r of rows) {
            const key = (r.pozo && String(r.pozo).trim()) || 'Sin pozo';
            map.set(key, (map.get(key) || 0) + (Number(r.volumen_m3) || 0));
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }

    function cumulativeByMonth(monthlyArr) {
        const out = new Array(12).fill(0);
        let acc = 0;
        for (let i = 0; i < 12; i++) { acc += monthlyArr[i] || 0; out[i] = acc; }
        return out;
    }

    // ─── Filters UI ────────────────────────────────────────────
    function populateYearSelect(selectId, currentValue) {
        const sel = $(selectId);
        if (!sel) return;
        const years = state.years.length ? state.years : [new Date().getFullYear()];
        const prev = currentValue !== undefined ? currentValue : sel.value;
        sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (prev && years.includes(Number(prev))) sel.value = String(prev);
    }
    function populatePozoSelect() {
        const sel = $('hidra-filter-pozo');
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">Todos</option>' +
            state.pozos.map(p => `<option value="${p}">${p}</option>`).join('');
        if (prev) sel.value = prev;
    }
    function populateMonthSelect() {
        const sel = $('hidra-edit-month');
        if (!sel) return;
        const prev = sel.value || state.editMonth;
        sel.innerHTML = MES_LARGOS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('');
        sel.value = String(prev);
    }

    // ─── Render KPIs ───────────────────────────────────────────
    function renderKpis() {
        const rows = getFiltered(state.selectedYear, state.selectedPozo);
        const total = rows.reduce((a, r) => a + (Number(r.volumen_m3) || 0), 0);

        const byMonth = aggregateByMonth(rows);
        let topMonth = -1, topMonthVal = -Infinity;
        for (let i = 0; i < 12; i++) {
            if (byMonth[i] > topMonthVal) { topMonthVal = byMonth[i]; topMonth = i; }
        }

        const dayMap = aggregateByDay(rows);
        const dayCount = dayMap.size;
        const prom = dayCount ? total / dayCount : 0;
        let maxIso = '', maxVal = 0;
        for (const [iso, v] of dayMap.entries()) {
            if (v > maxVal) { maxVal = v; maxIso = iso; }
        }

        $('hidra-kpi-anio').textContent = fmt(total);
        $('hidra-kpi-mes-top').textContent = topMonthVal > 0 ? fmt(topMonthVal) : '—';
        $('hidra-kpi-mes-top-name').textContent = topMonth >= 0 && topMonthVal > 0 ? MES_LARGOS[topMonth] : '—';
        $('hidra-kpi-prom').textContent = fmt(prom);
        $('hidra-kpi-max').textContent = fmt(maxVal);
        $('hidra-kpi-max-day').textContent = maxIso || '—';
    }

    // ─── Render charts ─────────────────────────────────────────
    function destroyChart(key) {
        if (charts[key]) { charts[key].destroy(); charts[key] = null; }
    }

    function renderMonthlyChart() {
        const ctx = $('hidra-chart-monthly');
        if (!ctx || typeof Chart === 'undefined') return;
        const rows = getFiltered(state.selectedYear, state.selectedPozo);
        const data = aggregateByMonth(rows);
        destroyChart('monthly');
        charts.monthly = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: MES_NOMBRES,
                datasets: [{
                    label: `${state.selectedYear} · m³`,
                    data,
                    backgroundColor: ctxRef => {
                        const c = ctxRef.chart.canvas.getContext('2d');
                        const g = c.createLinearGradient(0, 0, 0, 280);
                        g.addColorStop(0, '#3b82f6'); g.addColorStop(1, '#0ea5e9');
                        return g;
                    },
                    borderRadius: 6,
                    maxBarThickness: 48,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (c) => ` ${fmt(c.parsed.y)} m³` } },
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => fmt(v) } },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    function renderYoyChart() {
        const ctx = $('hidra-chart-yoy');
        if (!ctx || typeof Chart === 'undefined') return;
        const palette = ['#1d4ed8', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
        const ds = state.years.slice(0, 6).map((y, i) => {
            const rows = getFiltered(y, state.selectedPozo);
            return {
                label: String(y),
                data: aggregateByMonth(rows),
                borderColor: palette[i % palette.length],
                backgroundColor: palette[i % palette.length] + '22',
                tension: 0.35,
                fill: false,
                borderWidth: y === state.selectedYear ? 3 : 1.6,
                pointRadius: y === state.selectedYear ? 4 : 2,
            };
        });
        destroyChart('yoy');
        charts.yoy = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels: MES_NOMBRES, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } } },
            },
        });
    }

    function renderPozosChart() {
        const ctx = $('hidra-chart-pozos');
        if (!ctx || typeof Chart === 'undefined') return;
        const rows = getFiltered(state.selectedYear, '');
        const data = aggregateByPozo(rows);
        const palette = ['#1d4ed8', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0e7490', '#6d28d9'];
        destroyChart('pozos');
        if (!data.length) {
            // empty state
            const c = ctx.getContext('2d');
            c.clearRect(0, 0, ctx.width, ctx.height);
            c.fillStyle = '#94a3b8'; c.font = '13px sans-serif'; c.textAlign = 'center';
            c.fillText('Sin datos por pozo', ctx.width / 2, ctx.height / 2);
            return;
        }
        charts.pozos = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: data.map(d => d[0]),
                datasets: [{
                    data: data.map(d => d[1]),
                    backgroundColor: data.map((_, i) => palette[i % palette.length]),
                    borderWidth: 2,
                    borderColor: '#fff',
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '58%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (c) => {
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

    function renderCumulativeChart() {
        const ctx = $('hidra-chart-cumulative');
        if (!ctx || typeof Chart === 'undefined') return;
        const yCurr = state.selectedYear;
        const yPrev = yCurr - 1;
        const cur = cumulativeByMonth(aggregateByMonth(getFiltered(yCurr, state.selectedPozo)));
        const prev = cumulativeByMonth(aggregateByMonth(getFiltered(yPrev, state.selectedPozo)));
        destroyChart('cumulative');
        charts.cumulative = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: MES_NOMBRES,
                datasets: [
                    {
                        label: String(yPrev),
                        data: prev,
                        borderColor: '#94a3b8',
                        backgroundColor: 'rgba(148,163,184,.15)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2,
                    },
                    {
                        label: String(yCurr),
                        data: cur,
                        borderColor: '#1d4ed8',
                        backgroundColor: 'rgba(29,78,216,.15)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.parsed.y)} m³` } },
                },
                scales: { y: { beginAtZero: true, ticks: { callback: v => fmt(v) } } },
            },
        });
    }

    function renderDashboard() {
        renderKpis();
        renderMonthlyChart();
        renderYoyChart();
        renderPozosChart();
        renderCumulativeChart();
    }

    // ─── Editor ────────────────────────────────────────────────
    function buildEditRows() {
        const y = state.editYear, m = state.editMonth, pozo = state.editPozo.trim();
        const dim = daysInMonth(y, m);
        // existing per-day map
        const existing = new Map();
        for (const r of state.rows) {
            const d = parseDate(r.fecha);
            if (!d) continue;
            if (d.year !== y || d.month !== m) continue;
            const rowPozo = String(r.pozo || '').trim();
            if (pozo && rowPozo !== pozo) continue;
            if (!pozo && rowPozo) continue; // si el editor no tiene pozo, mostrar solo registros sin pozo
            existing.set(d.day, r);
        }
        const rows = [];
        for (let d = 1; d <= dim; d++) {
            const r = existing.get(d) || null;
            rows.push({
                day: d,
                fecha: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                volumen_m3: r ? Number(r.volumen_m3) || 0 : '',
                observaciones: r ? (r.observaciones || '') : '',
                _id: r ? r.id : null,
                _origVol: r ? Number(r.volumen_m3) || 0 : '',
                _origObs: r ? (r.observaciones || '') : '',
                _dirty: false,
            });
        }
        state.editRows = rows;
    }

    function renderEditor() {
        const tbody = $('hidra-edit-tbody');
        if (!tbody) return;
        const dim = state.editRows.length;
        $('hidra-edit-dias-mes').textContent = dim;
        const html = state.editRows.map(r => {
            const we = isWeekend(state.editYear, state.editMonth, r.day);
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
        const tbody = $('hidra-edit-tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr[data-day]').forEach(tr => {
            const day = Number(tr.dataset.day);
            const row = state.editRows.find(r => r.day === day);
            if (!row) return;
            const vol = tr.querySelector('.hidra-input-vol');
            const obs = tr.querySelector('.hidra-input-obs');
            const markDirty = () => {
                const newVol = vol.value === '' ? '' : Number(vol.value);
                const newObs = obs.value;
                row.volumen_m3 = newVol;
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
            if (isNaN(v) || v < 0) continue;
            totalMes += v;
            dias++;
        }
        // Acumulado año (todos los pozos), reemplazando el mes/pozo en edición
        // con los valores actualmente en pantalla.
        let savedYear = 0, savedSameMonthAndPozo = 0;
        const editPozo = state.editPozo.trim();
        for (const r of state.rows) {
            const d = parseDate(r.fecha);
            if (!d || d.year !== state.editYear) continue;
            const v = Number(r.volumen_m3) || 0;
            savedYear += v;
            if (d.month === state.editMonth) {
                const rowPozo = String(r.pozo || '').trim();
                if (rowPozo === editPozo) savedSameMonthAndPozo += v;
            }
        }
        const acumAnio = savedYear - savedSameMonthAndPozo + totalMes;
        $('hidra-edit-total-mes').textContent = fmt(totalMes);
        $('hidra-edit-total-anio').textContent = fmt(acumAnio);
        $('hidra-edit-dias-llenos').textContent = dias;
    }

    async function saveEditor() {
        const dirty = state.editRows.filter(r => r._dirty);
        const status = $('hidra-edit-status');
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
                const payload = {
                    fecha: r.fecha,
                    pozo: state.editPozo.trim() || null,
                    volumen_m3: Number(r.volumen_m3) || 0,
                    observaciones: r.observaciones ? String(r.observaciones).trim() : null,
                };
                if (r._id) payload.id = r._id;
                toUpsert.push(payload);
            }
        }

        if (status) status.textContent = `Guardando ${dirty.length} cambios…`;
        try {
            if (toDelete.length) {
                const { error: delErr } = await client.from(TABLE_NAME).delete().in('id', toDelete);
                if (delErr) throw delErr;
            }
            if (toUpsert.length) {
                const { error: upErr } = await client
                    .from(TABLE_NAME)
                    .upsert(toUpsert, { onConflict: 'fecha,pozo' });
                if (upErr) throw upErr;
            }
            if (status) status.textContent = `Guardado · ${dirty.length} cambios.`;
            state.loaded = false;
            await loadAll(true);
            populateYearSelect('hidra-filter-year', state.selectedYear);
            populatePozoSelect();
            populateYearSelect('hidra-edit-year', state.editYear);
            renderDashboard();
            buildEditRows();
            renderEditor();
        } catch (err) {
            console.error('[hidraulicas] saveEditor error:', err);
            if (status) status.textContent = 'Error al guardar: ' + (err.message || err);
        }
    }

    // ─── Bindings ──────────────────────────────────────────────
    let bound = false;
    function bind() {
        if (bound) return;
        bound = true;

        // Dashboard filters
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
            populatePozoSelect();
            populateYearSelect('hidra-edit-year', state.editYear);
            renderDashboard();
        });

        // Editor
        $('hidra-edit-load')?.addEventListener('click', () => {
            state.editYear  = Number($('hidra-edit-year').value) || state.editYear;
            state.editMonth = Number($('hidra-edit-month').value) || state.editMonth;
            state.editPozo  = $('hidra-edit-pozo').value || '';
            buildEditRows();
            renderEditor();
            const status = $('hidra-edit-status');
            if (status) status.textContent = '';
        });
        $('hidra-edit-save')?.addEventListener('click', saveEditor);
    }

    // ─── Init ──────────────────────────────────────────────────
    async function init() {
        bind();
        // initial year/month for editor selectors
        const now = new Date();
        state.editYear  = now.getFullYear();
        state.editMonth = now.getMonth() + 1;
        state.selectedYear = now.getFullYear();
        populateMonthSelect();
        await loadAll(false);
        populateYearSelect('hidra-filter-year', state.selectedYear);
        populatePozoSelect();
        populateYearSelect('hidra-edit-year', state.editYear);
        renderDashboard();
    }

    // Activate on visibility
    window.addEventListener('hidraulicas:visible', () => {
        init().catch(e => console.error('[hidraulicas] init error', e));
    });

    // Expose minimal API for debugging
    window.hidraulicasModule = { init, loadAll, renderDashboard, state };
})();
