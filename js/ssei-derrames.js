// ===================================================================
//  SSEI — Atención a Derrames en Plataforma
//  Lee public.atencion_derrames (Supabase)
//  KPIs YTD + tabla histórica + 4 gráficos + formulario de captura
//
//  API pública:
//    window.initSseiDerrames()  → inicializa (showSection hook)
//    window.sseiDerramesReload() → recarga silenciosa
// ===================================================================
(function () {
    'use strict';

    const MESES_LBL = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                       'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const MESES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const COL = {
        primary:   '#dc2626',
        primary2:  '#991b1b',
        accent:    '#f97316',
        accent2:   '#9a3412',
        blue:      '#2563eb',
        blue2:     '#1e3a8a',
        green:     '#16a34a',
        green2:    '#14532d',
        purple:    '#7c3aed',
    };

    let _charts = {};
    let _initOnce = false;
    let _allData = [];
    let _currentAnio = null;

    // ─── helpers ────────────────────────────────────────────────────
    async function getClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.ensureSupabaseClient === 'function') {
            return await window.ensureSupabaseClient();
        }
        throw new Error('Cliente de Supabase no disponible');
    }

    function canEdit() {
        try {
            const role = sessionStorage.getItem('user_role') || '';
            if (role === 'admin' || role === 'superadmin') return true;
            // Respeta el override explícito "solo ver" por módulo (section_levels)
            const ovr = (window.dataManager && window.dataManager.sectionLevels || {})['ssei-derrames'];
            if (ovr === 'read' || ovr === 'none') return false;
            if (ovr === 'capture' || ovr === 'edit') return true;
            return ['editor', 'ssei'].includes(role);
        } catch (_) { return false; }
    }

    function setStatus(msg, type) {
        const el = document.getElementById('ssei-status');
        if (!el) return;
        if (!msg) { el.classList.add('d-none'); el.innerHTML = ''; return; }
        el.classList.remove('d-none', 'alert-info', 'alert-warning', 'alert-danger', 'alert-success');
        el.classList.add('alert-' + (type || 'info'));
        el.innerHTML = msg;
    }

    const fmt = (n, dec = 2) => {
        if (n == null || isNaN(n)) return '—';
        return Number(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    const fmtCurrency = (n) => {
        if (n == null || isNaN(n)) return '—';
        return '$\u202f' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    const fmtCompact = (n) => {
        if (n == null || isNaN(n)) return '—';
        if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + '\u00a0M';
        if (Math.abs(n) >= 1e3) return (n / 1e3).toLocaleString('es-MX', { maximumFractionDigits: 1 }) + '\u00a0k';
        return Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 });
    };
    const fmtDate = (d) => {
        if (!d) return '—';
        try {
            const [y, m, day] = String(d).split('-');
            return `${day}/${m}/${y}`;
        } catch (_) { return String(d); }
    };
    function monthNameFromDate(fechaStr) {
        if (!fechaStr) return '';
        const mm = Number(String(fechaStr).split('-')[1]);
        if (!mm || mm < 1 || mm > 12) return '';
        return MESES_LBL[mm - 1] || '';
    }

    function vGradient(ctx, chartArea, c1, c2) {
        if (!chartArea) return c1;
        const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        g.addColorStop(0, c2 + '99');
        g.addColorStop(1, c1);
        return g;
    }

    // Plugin: dibuja total + etiqueta al centro del doughnut
    const sseiCenterText = {
        id: 'sseiCenterText',
        afterDatasetDraw(chart, _args, opts) {
            if (!opts || !opts.display) return;
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            const total = chart.data.datasets[0].data.reduce((a, b) => a + (Number(b) || 0), 0);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = opts.color || '#0f172a';
            ctx.font = '800 1.45rem -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(opts.formatter ? opts.formatter(total) : String(total), cx, cy - 8);
            ctx.fillStyle = opts.subColor || '#94a3b8';
            ctx.font = '700 .62rem -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText((opts.label || 'TOTAL').toUpperCase(), cx, cy + 13);
            ctx.restore();
        }
    };
    try { if (typeof Chart !== 'undefined') Chart.register(sseiCenterText); } catch (_) {}

    // ─── DATA ────────────────────────────────────────────────────────
    async function loadAll() {
        const sb = await getClient();
        const { data, error } = await sb
            .from('atencion_derrames')
            .select('*')
            .order('fecha', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    function getAnios(rows) {
        const set = new Set(rows.map(r => Number(String(r.fecha).slice(0, 4))));
        set.add(new Date().getFullYear());
        return Array.from(set).sort((a, b) => b - a);
    }

    function filterByAnio(rows, anio) {
        if (!anio || anio === 'all') return rows;
        return rows.filter(r => String(r.fecha).startsWith(String(anio)));
    }

    // ─── KPIs ────────────────────────────────────────────────────────
    function renderKpis(rows) {
        const total = rows.length;
        const tiempoArr = rows.map(r => Number(r.tiempo_respuesta_min)).filter(v => !isNaN(v) && v > 0);
        const avgTiempo = tiempoArr.length ? tiempoArr.reduce((a, b) => a + b, 0) / tiempoArr.length : 0;
        const totalM2 = rows.reduce((a, r) => a + Number(r.cantidad_m2 || 0), 0);
        const totalCobro = rows.reduce((a, r) => a + Number(r.cobro_realizado || 0), 0);

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('ssei-kpi-total',   String(total));
        set('ssei-kpi-tiempo',  total > 0 ? fmt(avgTiempo, 1) + ' min' : '—');
        set('ssei-kpi-m2',      total > 0 ? fmtCompact(totalM2) + ' m²' : '—');
        set('ssei-kpi-cobro',   total > 0 ? fmtCurrency(totalCobro) : '—');
    }

    // ─── TABLA HISTÓRICA ─────────────────────────────────────────────
    function renderTable(rows) {
        const tbody = document.getElementById('ssei-tbl-body');
        const countEl = document.getElementById('ssei-tbl-count');
        if (!tbody) return;
        if (countEl) countEl.textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}`;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-4">Sin registros para el período seleccionado.</td></tr>';
            return;
        }
        const sortedRows = [...rows].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
        tbody.innerHTML = sortedRows.map(r => `
            <tr>
                <td class="text-nowrap">${fmtDate(r.fecha)}</td>
                <td>${r.mes || monthNameFromDate(r.fecha) || '—'}</td>
                <td>${r.empresa || '—'}</td>
                <td class="text-muted small">${r.sitio || '—'}</td>
                <td>${r.quien_activo || '—'}</td>
                <td class="text-end">${r.hora_activacion ? r.hora_activacion.slice(0,5) : '—'}</td>
                <td class="text-end">${r.hora_llegada ? r.hora_llegada.slice(0,5) : '—'}</td>
                <td class="text-end fw-semibold">${r.tiempo_respuesta_min != null ? fmt(r.tiempo_respuesta_min, 1) + ' min' : '—'}</td>
                <td class="text-end">${r.cantidad_m2 != null ? fmt(r.cantidad_m2) + ' m²' : '—'}</td>
                <td class="text-end text-success fw-semibold">${r.cobro_realizado != null ? fmtCurrency(r.cobro_realizado) : '—'}</td>
            </tr>`).join('');
    }

    // ─── CHARTS ──────────────────────────────────────────────────────
    function destroyCharts() {
        Object.values(_charts).forEach(c => { try { c.destroy(); } catch (_) {} });
        _charts = {};
    }

    function renderCharts(allRows, filtered) {
        if (typeof Chart === 'undefined') return;
        destroyCharts();

        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        Chart.defaults.color = '#475569';

        const baseTooltip = {
            backgroundColor: 'rgba(15,23,42,.92)',
            titleColor: '#fff', bodyColor: '#e2e8f0',
            titleFont: { weight: '700', size: 13 },
            bodyFont: { size: 12 },
            padding: 12, cornerRadius: 10,
            displayColors: true, boxPadding: 4,
            borderColor: 'rgba(255,255,255,.08)', borderWidth: 1
        };

        const baseScales = {
            y: {
                beginAtZero: true, grace: '10%',
                grid: { color: '#eef2f7', drawBorder: false },
                border: { display: false },
                ticks: { color: '#64748b', font: { size: 11, weight: '600' }, maxTicksLimit: 6 }
            },
            x: {
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: { color: '#475569', font: { size: 11, weight: '700' } }
            }
        };

        // Etiqueta discreta SOBRE la barra (solo si hay valor > 0), evita números encimados
        const dlAboveBar = (color) => ({
            display: (ctx) => Number(ctx.dataset.data[ctx.dataIndex]) > 0,
            anchor: 'end', align: 'top', offset: 2, clip: false,
            color: color || '#0f172a',
            font: { weight: '800', size: 11.5 },
            formatter: (v) => v
        });

        /* ── 1. Derrames por año (barras) ── */
        const aniosAll = Array.from(new Set(allRows.map(r => String(r.fecha).slice(0, 4)))).sort();
        const countByAnio = aniosAll.map(a => allRows.filter(r => String(r.fecha).startsWith(a)).length);
        const c1 = document.getElementById('ssei-chart-anual');
        if (c1) {
            _charts.anual = new Chart(c1, {
                type: 'bar',
                data: {
                    labels: aniosAll,
                    datasets: [{
                        label: 'Derrames atendidos',
                        data: countByAnio,
                        backgroundColor: (ctx) => vGradient(ctx.chart.ctx, ctx.chart.chartArea, COL.primary, COL.primary2),
                        hoverBackgroundColor: COL.primary,
                        borderRadius: 8, borderSkipped: false, barPercentage: .6, categoryPercentage: .8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    layout: { padding: { top: 18 } },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: { ...baseTooltip,
                            callbacks: { label: ctx => `  Derrames: ${ctx.parsed.y}` }
                        },
                        datalabels: dlAboveBar(COL.primary2)
                    },
                    scales: {
                        ...baseScales,
                        y: { ...baseScales.y, grace: '22%', ticks: { ...baseScales.y.ticks, stepSize: 1 } }
                    }
                }
            });
        }

        /* ── 2. Derrames por mes en el período filtrado ── */
        const countByMes = MESES_SHORT.map((_, i) => {
            const mesNombre = MESES_LBL[i];
            return filtered.filter(r => {
                const mesRow = String(r.mes || monthNameFromDate(r.fecha) || '').toUpperCase();
                return mesRow === mesNombre;
            }).length;
        });
        const lastMes = countByMes.reduce((last, v, i) => v > 0 ? i : last, -1);
        const mesLabels = lastMes >= 0 ? MESES_SHORT.slice(0, lastMes + 1) : MESES_SHORT;
        const mesData   = lastMes >= 0 ? countByMes.slice(0, lastMes + 1)  : countByMes;
        const c2 = document.getElementById('ssei-chart-mensual');
        if (c2) {
            _charts.mensual = new Chart(c2, {
                type: 'bar',
                data: {
                    labels: mesLabels,
                    datasets: [{
                        label: 'Derrames',
                        data: mesData,
                        backgroundColor: (ctx) => vGradient(ctx.chart.ctx, ctx.chart.chartArea, COL.accent, COL.accent2),
                        hoverBackgroundColor: COL.accent,
                        borderRadius: 8, borderSkipped: false, barPercentage: .65, categoryPercentage: .8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    layout: { padding: { top: 18 } },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: { ...baseTooltip,
                            callbacks: { label: ctx => `  Derrames: ${ctx.parsed.y}` }
                        },
                        datalabels: dlAboveBar(COL.accent2)
                    },
                    scales: {
                        ...baseScales,
                        y: { ...baseScales.y, grace: '22%', ticks: { ...baseScales.y.ticks, stepSize: 1 } }
                    }
                }
            });
        }

        /* ── 3. M² por empresa (doughnut) ── */
        const empresaMap = {};
        filtered.forEach(r => {
            const emp = r.empresa || 'Desconocida';
            empresaMap[emp] = (empresaMap[emp] || 0) + Number(r.cantidad_m2 || 0);
        });
        const empEntries = Object.entries(empresaMap).sort((a, b) => b[1] - a[1]);
        const empLabels = empEntries.map(([k]) => k);
        const empData   = empEntries.map(([, v]) => v);
        const PALETTE   = [COL.primary, COL.accent, COL.blue, COL.green, COL.purple, '#0891b2', '#ca8a04', '#be185d'];
        const c3 = document.getElementById('ssei-chart-empresa');
        if (c3) {
            const totalM2Fil = empData.reduce((a, b) => a + b, 0);
            _charts.empresa = new Chart(c3, {
                type: 'doughnut',
                data: {
                    labels: empLabels,
                    datasets: [{
                        data: empData,
                        backgroundColor: PALETTE.slice(0, empLabels.length),
                        borderColor: '#fff', borderWidth: 3, hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '62%',
                    layout: { padding: 6 },
                    animation: { animateRotate: true, duration: 800 },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 11, boxHeight: 11, usePointStyle: true, pointStyle: 'circle',
                                      color: '#0f172a', font: { weight: '700', size: 11 }, padding: 10 }
                        },
                        tooltip: { ...baseTooltip,
                            callbacks: {
                                label: ctx => {
                                    const pct = totalM2Fil > 0 ? (100 * ctx.parsed / totalM2Fil) : 0;
                                    return `  ${ctx.label}: ${fmt(ctx.parsed)} m²  ·  ${fmt(pct, 1)}%`;
                                }
                            }
                        },
                        sseiCenterText: {
                            display: true,
                            label: 'Total m²',
                            color: '#0f172a', subColor: '#94a3b8',
                            formatter: (v) => fmtCompact(v)
                        },
                        datalabels: {
                            color: '#fff',
                            font: { weight: '800', size: 11 },
                            textStrokeColor: 'rgba(15,23,42,.55)', textStrokeWidth: 3,
                            display: (ctx) => {
                                const v = Number(ctx.dataset.data[ctx.dataIndex]) || 0;
                                const pct = totalM2Fil > 0 ? (100 * v / totalM2Fil) : 0;
                                return pct >= 7;
                            },
                            formatter: (v) => {
                                const pct = totalM2Fil > 0 ? (100 * v / totalM2Fil) : 0;
                                return fmt(pct, 0) + '%';
                            }
                        }
                    }
                }
            });
        }

        /* ── 4. Tiempo de respuesta por evento (línea) ── */
        const eventosConTiempo = filtered.filter(r => r.tiempo_respuesta_min != null);
        const tiempoLabels = eventosConTiempo.map((r, i) => {
            const d = fmtDate(r.fecha);
            return d !== '—' ? d : `#${i+1}`;
        });
        const tiempoData = eventosConTiempo.map(r => Number(r.tiempo_respuesta_min));
        const avgTiempoVal = tiempoData.length
            ? tiempoData.reduce((a, b) => a + b, 0) / tiempoData.length
            : 0;
        const avgLine = tiempoData.length
            ? Array(tiempoData.length).fill(avgTiempoVal)
            : [];
        const c4 = document.getElementById('ssei-chart-tiempo');
        if (c4) {
            _charts.tiempo = new Chart(c4, {
                type: 'line',
                data: {
                    labels: tiempoLabels,
                    datasets: [
                        {
                            label: 'Tiempo respuesta (min)',
                            data: tiempoData,
                            borderColor: COL.blue, borderWidth: 2.5,
                            backgroundColor: (ctx) => {
                                const a = ctx.chart.chartArea;
                                if (!a) return COL.blue + '22';
                                const g = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
                                g.addColorStop(0, COL.blue + '44');
                                g.addColorStop(1, COL.blue + '05');
                                return g;
                            },
                            fill: true, tension: 0.35,
                            pointRadius: 4, pointHoverRadius: 8,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: COL.blue, pointBorderWidth: 2.5,
                            pointHoverBackgroundColor: COL.blue
                        },
                        {
                            label: `Promedio (${fmt(avgTiempoVal, 1)} min)`,
                            data: avgLine,
                            borderColor: COL.accent, borderWidth: 2, borderDash: [6, 3],
                            pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: {
                            position: 'top', align: 'end',
                            labels: { boxWidth: 12, boxHeight: 2, color: '#0f172a',
                                      font: { weight: '700', size: 12 }, padding: 14 }
                        },
                        datalabels: { display: false },
                        tooltip: { ...baseTooltip,
                            callbacks: {
                                label: ctx => `  ${ctx.dataset.label}: ${fmt(ctx.parsed.y, 1)} min`,
                                afterBody: (items) => {
                                    const idx = items[0]?.dataIndex;
                                    const row = eventosConTiempo[idx];
                                    if (!row) return '';
                                    return `  Empresa: ${row.empresa || '—'}  ·  Sitio: ${row.sitio || '—'}`;
                                }
                            }
                        }
                    },
                    scales: {
                        ...baseScales,
                        y: { ...baseScales.y,
                            ticks: { ...baseScales.y.ticks, callback: v => v + ' min' }
                        }
                    }
                }
            });
        }
    }

    // ─── RENDER PRINCIPAL ────────────────────────────────────────────
    async function renderAll() {
        try {
            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Cargando datos de Supabase…', 'info');
            const anio = document.getElementById('ssei-anio-select')?.value || 'all';
            _currentAnio = anio;
            _allData = await loadAll();
            const filtered = filterByAnio(_allData, anio);
            renderKpis(filtered);
            renderTable(filtered);
            renderCharts(_allData, filtered);
            setStatus('');
        } catch (e) {
            console.error('[ssei] render error', e);
            setStatus('<i class="fas fa-triangle-exclamation me-1"></i>Error: ' + (e.message || e), 'danger');
        }
    }

    // ─── AÑOS EN EL SELECTOR ──────────────────────────────────────────
    async function populateAnios() {
        const sb = await getClient();
        const { data } = await sb
            .from('atencion_derrames')
            .select('fecha')
            .order('fecha', { ascending: false });
        const selected = document.getElementById('ssei-anio-select')?.value || _currentAnio || 'all';
        const anios = Array.from(new Set((data || []).map(r => String(r.fecha).slice(0, 4)))).sort((a, b) => b - a);
        const sel = document.getElementById('ssei-anio-select');
        if (!sel) return;
        sel.innerHTML = '<option value="all">Todos los años</option>' +
            anios.map(a => `<option value="${a}">${a}</option>`).join('');
        if (selected && (selected === 'all' || anios.includes(selected))) {
            sel.value = selected;
        } else if (anios.includes(String(new Date().getFullYear()))) {
            sel.value = String(new Date().getFullYear());
        } else {
            sel.value = 'all';
        }
    }

    // ─── MODAL CAPTURA ───────────────────────────────────────────────
    function openModal() {
        const modal = document.getElementById('ssei-modal');
        if (!modal) return;
        // Limpiar formulario
        ['ssei-f-fecha','ssei-f-mes','ssei-f-empresa','ssei-f-sitio',
         'ssei-f-quien','ssei-f-hora-act','ssei-f-hora-lleg',
         'ssei-f-tiempo','ssei-f-m2','ssei-f-cobro'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Pre-rellenar con la fecha de hoy
        const today = new Date().toISOString().slice(0, 10);
        const fechaEl = document.getElementById('ssei-f-fecha');
        if (fechaEl) fechaEl.value = today;
        // Auto-derivar mes del campo fecha
        autoFillMes(today);
        const msgEl = document.getElementById('ssei-modal-msg');
        if (msgEl) { msgEl.innerHTML = ''; msgEl.className = ''; }
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
    }

    function autoFillMes(fechaStr) {
        if (!fechaStr) return;
        try {
            const m = Number(fechaStr.split('-')[1]) - 1;
            const mesEl = document.getElementById('ssei-f-mes');
            if (mesEl) mesEl.value = MESES_LBL[m] || '';
        } catch (_) {}
    }

    function autoCalcTiempo() {
        const ha = document.getElementById('ssei-f-hora-act')?.value;
        const hl = document.getElementById('ssei-f-hora-lleg')?.value;
        if (!ha || !hl) return;
        try {
            const [hh, mm] = ha.split(':').map(Number);
            const [hh2, mm2] = hl.split(':').map(Number);
            let diff = (hh2 * 60 + mm2) - (hh * 60 + mm);
            if (diff < 0) diff += 24 * 60; // cruce de medianoche
            const tEl = document.getElementById('ssei-f-tiempo');
            if (tEl && !tEl.value) tEl.value = diff;
        } catch (_) {}
    }

    async function saveRecord() {
        const msgEl = document.getElementById('ssei-modal-msg');
        const btn   = document.getElementById('ssei-modal-save');
        try {
            if (!canEdit()) {
                if (msgEl) {
                    msgEl.className = 'alert alert-danger mt-2 py-2';
                    msgEl.innerHTML = '<i class="fas fa-lock me-1"></i>No tienes permisos de edición.';
                }
                return;
            }
            const fecha    = document.getElementById('ssei-f-fecha')?.value?.trim();
            const mes      = document.getElementById('ssei-f-mes')?.value?.trim();
            const empresa  = document.getElementById('ssei-f-empresa')?.value?.trim();
            const sitio    = document.getElementById('ssei-f-sitio')?.value?.trim();
            const quien    = document.getElementById('ssei-f-quien')?.value?.trim();
            const horaAct  = document.getElementById('ssei-f-hora-act')?.value?.trim() || null;
            const horaLleg = document.getElementById('ssei-f-hora-lleg')?.value?.trim() || null;
            const tiempo   = document.getElementById('ssei-f-tiempo')?.value;
            const m2       = document.getElementById('ssei-f-m2')?.value;
            const cobro    = document.getElementById('ssei-f-cobro')?.value;

            if (!fecha || !mes || !empresa) {
                if (msgEl) {
                    msgEl.className = 'alert alert-warning mt-2 py-2';
                    msgEl.innerHTML = '<i class="fas fa-triangle-exclamation me-1"></i>Fecha, Mes y Empresa son obligatorios.';
                }
                return;
            }

            const payload = {
                fecha,
                mes:                   mes.toUpperCase(),
                empresa,
                sitio:                 sitio || null,
                quien_activo:          quien || null,
                hora_activacion:       horaAct || null,
                hora_llegada:          horaLleg || null,
                tiempo_respuesta_min:  tiempo ? Number(tiempo) : null,
                cantidad_m2:           m2     ? Number(m2)     : null,
                cobro_realizado:       cobro  ? Number(cobro)  : null,
                uploaded_by:           sessionStorage.getItem('user_email') || null
            };

            if (btn) btn.disabled = true;
            if (msgEl) {
                msgEl.className = 'alert alert-info mt-2 py-2';
                msgEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando…';
            }

            const sb = await getClient();
            const { error } = await sb.from('atencion_derrames').insert(payload);
            if (error) throw error;

            if (msgEl) {
                msgEl.className = 'alert alert-success mt-2 py-2';
                msgEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Registro guardado correctamente.';
            }
            // Cerrar modal tras 1.2 s y recargar
            setTimeout(async () => {
                try {
                    const bsModal = bootstrap.Modal.getInstance(document.getElementById('ssei-modal'));
                    if (bsModal) bsModal.hide();
                } catch (_) {}
                await populateAnios();
                await renderAll();
            }, 1200);
        } catch (err) {
            console.error('[ssei] save error', err);
            if (msgEl) {
                msgEl.className = 'alert alert-danger mt-2 py-2';
                msgEl.innerHTML = '<i class="fas fa-triangle-exclamation me-1"></i>' + (err.message || err);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    // ─── BINDINGS ────────────────────────────────────────────────────
    function wireUi() {
        if (_initOnce) return;
        _initOnce = true;

        const selAnio = document.getElementById('ssei-anio-select');
        if (selAnio) selAnio.addEventListener('change', renderAll);

        const btnRefresh = document.getElementById('ssei-refresh-btn');
        if (btnRefresh) btnRefresh.addEventListener('click', renderAll);

        const btnAdd = document.getElementById('ssei-add-btn');
        if (btnAdd) {
            btnAdd.classList.toggle('d-none', !canEdit());
            btnAdd.addEventListener('click', openModal);
        }

        const btnSave = document.getElementById('ssei-modal-save');
        if (btnSave) btnSave.addEventListener('click', saveRecord);

        // Auto-calcular mes al cambiar fecha
        const fechaEl = document.getElementById('ssei-f-fecha');
        if (fechaEl) fechaEl.addEventListener('change', e => autoFillMes(e.target.value));

        // Auto-calcular tiempo de respuesta al completar horas
        ['ssei-f-hora-act', 'ssei-f-hora-lleg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', autoCalcTiempo);
        });
    }

    // ─── API PÚBLICA ─────────────────────────────────────────────────
    window.initSseiDerrames = async function () {
        try {
            wireUi();
            await populateAnios();
            await renderAll();
        } catch (e) {
            console.error('[ssei] init error', e);
            setStatus('<i class="fas fa-triangle-exclamation me-1"></i>' + (e.message || e), 'danger');
        }
    };

    window.sseiDerramesReload = renderAll;
})();
