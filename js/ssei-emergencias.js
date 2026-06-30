// ===================================================================
//  SSEI — Emergencias en Pista
//  Lee public.emergencias_pista (Supabase)
//  KPIs + tabla histórica con galería de fotos + 4 gráficos + captura
//
//  API pública:
//    window.initSseiEmergencias()   → inicializa (showSection hook)
//    window.sseiEmergenciasReload() → recarga silenciosa
// ===================================================================
(function () {
    'use strict';

    const TABLE  = 'emergencias_pista';
    const BUCKET = 'emergencias-fotos';

    const COL = {
        primary:  '#dc2626', primary2: '#991b1b',
        accent:   '#f97316', accent2:  '#9a3412',
        blue:     '#2563eb', blue2:    '#1e3a8a',
        green:    '#16a34a', green2:   '#14532d',
        purple:   '#7c3aed',
    };

    let _charts = {};
    let _initOnce = false;
    let _allData = [];
    let _currentAnio = null;
    let _uploadFiles = [];   // File[] pendientes de subir

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
            return ['admin', 'superadmin', 'editor', 'ssei'].includes(role);
        } catch (_) { return false; }
    }

    function setStatus(msg, type) {
        const el = document.getElementById('em-status');
        if (!el) return;
        if (!msg) { el.classList.add('d-none'); el.innerHTML = ''; return; }
        el.classList.remove('d-none', 'alert-info', 'alert-warning', 'alert-danger', 'alert-success');
        el.classList.add('alert-' + (type || 'info'));
        el.innerHTML = msg;
    }

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const fmtDate = (d) => {
        if (!d) return '—';
        try {
            const [y, m, day] = String(d).split('-');
            if (!y || !m || !day) return String(d);
            return `${day}/${m}/${y}`;
        } catch (_) { return String(d); }
    };

    function fotosOf(row) {
        const f = row && row.fotos;
        if (!f) return [];
        if (Array.isArray(f)) return f.filter(Boolean);
        if (typeof f === 'string') {
            try { const p = JSON.parse(f); return Array.isArray(p) ? p.filter(Boolean) : []; }
            catch (_) { return f ? [f] : []; }
        }
        return [];
    }

    function vGradient(ctx, chartArea, c1, c2) {
        if (!chartArea) return c1;
        const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        g.addColorStop(0, c2 + '99');
        g.addColorStop(1, c1);
        return g;
    }

    // Plugin: total al centro del doughnut
    const emCenterText = {
        id: 'emCenterText',
        afterDatasetDraw(chart, _args, opts) {
            if (!opts || !opts.display) return;
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            const total = chart.data.datasets[0].data.reduce((a, b) => a + (Number(b) || 0), 0);
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = opts.color || '#0f172a';
            ctx.font = '800 1.45rem -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(opts.formatter ? opts.formatter(total) : String(total), cx, cy - 8);
            ctx.fillStyle = opts.subColor || '#94a3b8';
            ctx.font = '700 .62rem -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText((opts.label || 'TOTAL').toUpperCase(), cx, cy + 13);
            ctx.restore();
        }
    };
    try { if (typeof Chart !== 'undefined') Chart.register(emCenterText); } catch (_) {}

    // ─── DATA ────────────────────────────────────────────────────────
    async function loadAll() {
        const sb = await getClient();
        const { data, error } = await sb
            .from(TABLE)
            .select('*')
            .order('fecha_evento', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    function filterByAnio(rows, anio) {
        if (!anio || anio === 'all') return rows;
        return rows.filter(r => String(r.fecha_evento).startsWith(String(anio)));
    }

    // ─── KPIs ────────────────────────────────────────────────────────
    function renderKpis(rows) {
        const total = rows.length;
        const acc = rows.filter(r => (r.clasificacion || '').toLowerCase() === 'accidente').length;
        const inc = rows.filter(r => (r.clasificacion || '').toLowerCase() === 'incidente').length;
        const ops = new Set(rows.map(r => (r.operador || '').trim()).filter(Boolean)).size;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('em-kpi-total',       String(total));
        set('em-kpi-accidentes',  String(acc));
        set('em-kpi-incidentes',  String(inc));
        set('em-kpi-operadores',  String(ops));
    }

    // ─── TABLA + GALERÍA ─────────────────────────────────────────────
    function renderTable(rows) {
        const tbody = document.getElementById('em-tbl-body');
        const countEl = document.getElementById('em-tbl-count');
        if (!tbody) return;
        if (countEl) countEl.textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}`;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Sin registros para el período seleccionado.</td></tr>';
            return;
        }
        const sorted = [...rows].sort((a, b) => String(b.fecha_evento || '').localeCompare(String(a.fecha_evento || '')));
        tbody.innerHTML = sorted.map(r => {
            const fotos = fotosOf(r);
            let thumbs;
            if (!fotos.length) {
                thumbs = '<span class="em-nofoto" title="Sin evidencia"><i class="fas fa-image"></i></span>';
            } else {
                const shown = fotos.slice(0, 2).map(u =>
                    `<img class="em-thumb" src="${esc(u)}" alt="evidencia" loading="lazy" data-em-photos="${esc(r.id)}">`).join('');
                const extra = fotos.length > 2
                    ? `<div class="em-thumb-more" data-em-photos="${esc(r.id)}">+${fotos.length - 2}</div>` : '';
                thumbs = `<div class="em-thumbs">${shown}${extra}</div>`;
            }
            const cls = (r.clasificacion || '').toLowerCase() === 'accidente'
                ? '<span class="em-clasif em-clasif--acc">Accidente</span>'
                : ((r.clasificacion || '').toLowerCase() === 'incidente'
                    ? '<span class="em-clasif em-clasif--inc">Incidente</span>'
                    : '—');
            return `
            <tr>
                <td class="text-center fw-semibold">${r.no_consecutivo != null ? r.no_consecutivo : '—'}</td>
                <td class="text-nowrap">${fmtDate(r.fecha_evento)}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${esc(r.pista || '—')}</span></td>
                <td class="fw-semibold">${esc(r.tipo_aeronave || '—')}</td>
                <td>${esc(r.operador || '—')}</td>
                <td class="text-center">${cls}</td>
                <td class="em-desc-cell">${esc(r.descripcion || '—')}</td>
                <td class="text-center">${thumbs}</td>
            </tr>`;
        }).join('');

        // Click handlers para abrir lightbox
        tbody.querySelectorAll('[data-em-photos]').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-em-photos');
                const row = _allData.find(x => String(x.id) === String(id));
                if (row) openLightbox(row);
            });
        });
    }

    // ─── LIGHTBOX ────────────────────────────────────────────────────
    function openLightbox(row) {
        const fotos = fotosOf(row);
        if (!fotos.length) return;
        const inner = document.getElementById('em-lightbox-inner');
        const title = document.getElementById('em-lightbox-title');
        if (title) {
            title.innerHTML = `<i class="fas fa-images me-1"></i>${esc(row.tipo_aeronave || '')} · ${esc(row.operador || '')} · ${fmtDate(row.fecha_evento)}`;
        }
        if (inner) {
            inner.innerHTML = fotos.map((u, i) =>
                `<div class="carousel-item${i === 0 ? ' active' : ''}">
                    <img src="${esc(u)}" class="d-block mx-auto" alt="evidencia ${i + 1}">
                 </div>`).join('');
        }
        const modalEl = document.getElementById('em-lightbox');
        if (modalEl && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
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
            titleFont: { weight: '700', size: 13 }, bodyFont: { size: 12 },
            padding: 12, cornerRadius: 10, displayColors: true, boxPadding: 4,
            borderColor: 'rgba(255,255,255,.08)', borderWidth: 1
        };
        const baseScales = {
            y: {
                beginAtZero: true, grace: '22%',
                grid: { color: '#eef2f7', drawBorder: false }, border: { display: false },
                ticks: { color: '#64748b', font: { size: 11, weight: '600' }, maxTicksLimit: 6, stepSize: 1 }
            },
            x: {
                grid: { display: false, drawBorder: false }, border: { display: false },
                ticks: { color: '#475569', font: { size: 11, weight: '700' } }
            }
        };
        const dlAboveBar = (color) => ({
            display: (ctx) => Number(ctx.dataset.data[ctx.dataIndex]) > 0,
            anchor: 'end', align: 'top', offset: 2, clip: false,
            color: color || '#0f172a', font: { weight: '800', size: 11.5 },
            formatter: (v) => v
        });

        /* ── 1. Eventos por año (barras) ── */
        const aniosAll = Array.from(new Set(allRows.map(r => String(r.fecha_evento).slice(0, 4)))).sort();
        const countByAnio = aniosAll.map(a => allRows.filter(r => String(r.fecha_evento).startsWith(a)).length);
        const c1 = document.getElementById('em-chart-anual');
        if (c1) {
            _charts.anual = new Chart(c1, {
                type: 'bar',
                data: {
                    labels: aniosAll,
                    datasets: [{
                        label: 'Eventos', data: countByAnio,
                        backgroundColor: (ctx) => vGradient(ctx.chart.ctx, ctx.chart.chartArea, COL.primary, COL.primary2),
                        hoverBackgroundColor: COL.primary,
                        borderRadius: 8, borderSkipped: false, barPercentage: .6, categoryPercentage: .8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: { ...baseTooltip, callbacks: { label: ctx => `  Eventos: ${ctx.parsed.y}` } },
                        datalabels: dlAboveBar(COL.primary2)
                    },
                    scales: baseScales
                }
            });
        }

        /* ── 2. Clasificación (doughnut) ── */
        const acc = filtered.filter(r => (r.clasificacion || '').toLowerCase() === 'accidente').length;
        const inc = filtered.filter(r => (r.clasificacion || '').toLowerCase() === 'incidente').length;
        const c2 = document.getElementById('em-chart-clasif');
        if (c2) {
            const totalCl = acc + inc;
            _charts.clasif = new Chart(c2, {
                type: 'doughnut',
                data: {
                    labels: ['Accidente', 'Incidente'],
                    datasets: [{
                        data: [acc, inc],
                        backgroundColor: [COL.primary, COL.accent],
                        borderColor: '#fff', borderWidth: 3, hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '62%', layout: { padding: 6 },
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
                                    const pct = totalCl > 0 ? (100 * ctx.parsed / totalCl) : 0;
                                    return `  ${ctx.label}: ${ctx.parsed}  ·  ${pct.toFixed(1)}%`;
                                }
                            }
                        },
                        emCenterText: { display: true, label: 'Eventos', color: '#0f172a', subColor: '#94a3b8' },
                        datalabels: {
                            color: '#fff', font: { weight: '800', size: 12 },
                            textStrokeColor: 'rgba(15,23,42,.55)', textStrokeWidth: 3,
                            display: (ctx) => Number(ctx.dataset.data[ctx.dataIndex]) > 0,
                            formatter: (v) => v
                        }
                    }
                }
            });
        }

        /* ── 3. Eventos por pista (barras) ── */
        const pistaMap = {};
        filtered.forEach(r => {
            const p = (r.pista || 'N/D').trim() || 'N/D';
            pistaMap[p] = (pistaMap[p] || 0) + 1;
        });
        const pistaEntries = Object.entries(pistaMap).sort((a, b) => a[0].localeCompare(b[0]));
        const c3 = document.getElementById('em-chart-pista');
        if (c3) {
            _charts.pista = new Chart(c3, {
                type: 'bar',
                data: {
                    labels: pistaEntries.map(([k]) => k),
                    datasets: [{
                        label: 'Eventos', data: pistaEntries.map(([, v]) => v),
                        backgroundColor: (ctx) => vGradient(ctx.chart.ctx, ctx.chart.chartArea, COL.blue, COL.blue2),
                        hoverBackgroundColor: COL.blue,
                        borderRadius: 8, borderSkipped: false, barPercentage: .6, categoryPercentage: .8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: { ...baseTooltip, callbacks: { label: ctx => `  Eventos: ${ctx.parsed.y}` } },
                        datalabels: dlAboveBar(COL.blue2)
                    },
                    scales: baseScales
                }
            });
        }

        /* ── 4. Eventos por operador (barras horizontales) ── */
        const opMap = {};
        filtered.forEach(r => {
            const o = (r.operador || 'N/D').trim() || 'N/D';
            opMap[o] = (opMap[o] || 0) + 1;
        });
        const opEntries = Object.entries(opMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const c4 = document.getElementById('em-chart-operador');
        if (c4) {
            _charts.operador = new Chart(c4, {
                type: 'bar',
                data: {
                    labels: opEntries.map(([k]) => k),
                    datasets: [{
                        label: 'Eventos', data: opEntries.map(([, v]) => v),
                        backgroundColor: (ctx) => {
                            const a = ctx.chart.chartArea;
                            if (!a) return COL.accent;
                            const g = ctx.chart.ctx.createLinearGradient(a.left, 0, a.right, 0);
                            g.addColorStop(0, COL.accent2 + '99'); g.addColorStop(1, COL.accent);
                            return g;
                        },
                        hoverBackgroundColor: COL.accent,
                        borderRadius: 8, borderSkipped: false, barPercentage: .7, categoryPercentage: .82
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false, layout: { padding: { right: 22 } },
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: { ...baseTooltip, callbacks: { label: ctx => `  Eventos: ${ctx.parsed.x}` } },
                        datalabels: {
                            display: (ctx) => Number(ctx.dataset.data[ctx.dataIndex]) > 0,
                            anchor: 'end', align: 'right', offset: 4, clip: false,
                            color: COL.accent2, font: { weight: '800', size: 11.5 }, formatter: (v) => v
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, grace: '12%',
                             grid: { color: '#eef2f7', drawBorder: false }, border: { display: false },
                             ticks: { color: '#64748b', font: { size: 11, weight: '600' }, stepSize: 1, maxTicksLimit: 6 } },
                        y: { grid: { display: false, drawBorder: false }, border: { display: false },
                             ticks: { color: '#475569', font: { size: 10.5, weight: '700' } } }
                    }
                }
            });
        }
    }

    // ─── RENDER PRINCIPAL ────────────────────────────────────────────
    async function renderAll() {
        try {
            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Cargando datos de Supabase…', 'info');
            const anio = document.getElementById('em-anio-select')?.value || 'all';
            _currentAnio = anio;
            _allData = await loadAll();
            const filtered = filterByAnio(_allData, anio);
            renderKpis(filtered);
            renderTable(filtered);
            renderCharts(_allData, filtered);
            setStatus('');
        } catch (e) {
            console.error('[ssei-emerg] render error', e);
            setStatus('<i class="fas fa-triangle-exclamation me-1"></i>Error: ' + (e.message || e), 'danger');
        }
    }

    // ─── AÑOS EN EL SELECTOR ──────────────────────────────────────────
    async function populateAnios() {
        const sb = await getClient();
        const { data } = await sb.from(TABLE).select('fecha_evento').order('fecha_evento', { ascending: false });
        const selected = document.getElementById('em-anio-select')?.value || _currentAnio || 'all';
        const anios = Array.from(new Set((data || []).map(r => String(r.fecha_evento).slice(0, 4)))).sort((a, b) => b - a);
        const sel = document.getElementById('em-anio-select');
        if (!sel) return;
        sel.innerHTML = '<option value="all">Todos los años</option>' +
            anios.map(a => `<option value="${a}">${a}</option>`).join('');
        if (selected && (selected === 'all' || anios.includes(selected))) sel.value = selected;
        else sel.value = 'all';
    }

    // ─── MODAL CAPTURA ───────────────────────────────────────────────
    function openModal() {
        const modal = document.getElementById('em-modal');
        if (!modal) return;
        ['em-f-fecha', 'em-f-pista', 'em-f-tipo', 'em-f-operador', 'em-f-desc'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const clasif = document.getElementById('em-f-clasif'); if (clasif) clasif.value = 'Incidente';
        const fotosInput = document.getElementById('em-f-fotos'); if (fotosInput) fotosInput.value = '';
        _uploadFiles = [];
        renderPreview();
        const fechaEl = document.getElementById('em-f-fecha');
        if (fechaEl) fechaEl.value = new Date().toISOString().slice(0, 10);
        const msgEl = document.getElementById('em-modal-msg');
        if (msgEl) { msgEl.innerHTML = ''; msgEl.className = ''; }
        bootstrap.Modal.getOrCreateInstance(modal).show();
    }

    function onFilesSelected(e) {
        const files = Array.from(e.target.files || []);
        _uploadFiles = _uploadFiles.concat(files);
        renderPreview();
    }

    function renderPreview() {
        const wrap = document.getElementById('em-f-preview');
        if (!wrap) return;
        wrap.innerHTML = _uploadFiles.map((f, i) =>
            `<div class="pv"><img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}"><button type="button" data-rm="${i}" title="Quitar">&times;</button></div>`
        ).join('');
        wrap.querySelectorAll('[data-rm]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-rm'));
                _uploadFiles.splice(idx, 1);
                renderPreview();
            });
        });
    }

    async function uploadFotos(sb) {
        const urls = [];
        for (let i = 0; i < _uploadFiles.length; i++) {
            const file = _uploadFiles[i];
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `emergencia-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
            const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
            if (urlData?.publicUrl) urls.push(urlData.publicUrl);
        }
        return urls;
    }

    async function saveRecord() {
        const msgEl = document.getElementById('em-modal-msg');
        const btn   = document.getElementById('em-modal-save');
        try {
            if (!canEdit()) {
                if (msgEl) {
                    msgEl.className = 'alert alert-danger mt-2 py-2';
                    msgEl.innerHTML = '<i class="fas fa-lock me-1"></i>No tienes permisos de edición.';
                }
                return;
            }
            const fecha   = document.getElementById('em-f-fecha')?.value?.trim();
            const pista   = document.getElementById('em-f-pista')?.value?.trim() || null;
            const tipo    = document.getElementById('em-f-tipo')?.value?.trim() || null;
            const operador= document.getElementById('em-f-operador')?.value?.trim() || null;
            const clasif  = document.getElementById('em-f-clasif')?.value?.trim() || null;
            const desc    = document.getElementById('em-f-desc')?.value?.trim() || null;

            if (!fecha) {
                if (msgEl) {
                    msgEl.className = 'alert alert-warning mt-2 py-2';
                    msgEl.innerHTML = '<i class="fas fa-triangle-exclamation me-1"></i>La fecha del evento es obligatoria.';
                }
                return;
            }

            if (btn) btn.disabled = true;
            if (msgEl) {
                msgEl.className = 'alert alert-info mt-2 py-2';
                msgEl.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando' + (_uploadFiles.length ? ' y subiendo fotos…' : '…');
            }

            const sb = await getClient();
            const fotos = _uploadFiles.length ? await uploadFotos(sb) : [];

            // siguiente número consecutivo
            const maxNo = _allData.reduce((m, r) => Math.max(m, Number(r.no_consecutivo) || 0), 0);

            const payload = {
                no_consecutivo: maxNo + 1,
                fecha_evento:   fecha,
                pista, tipo_aeronave: tipo, operador,
                clasificacion:  clasif,
                descripcion:    desc,
                fotos:          fotos,
                uploaded_by:    sessionStorage.getItem('user_email') || null
            };

            const { error } = await sb.from(TABLE).insert(payload);
            if (error) throw error;

            if (msgEl) {
                msgEl.className = 'alert alert-success mt-2 py-2';
                msgEl.innerHTML = '<i class="fas fa-check-circle me-1"></i>Registro guardado correctamente.';
            }
            setTimeout(async () => {
                try {
                    const bsModal = bootstrap.Modal.getInstance(document.getElementById('em-modal'));
                    if (bsModal) bsModal.hide();
                } catch (_) {}
                _uploadFiles = [];
                await populateAnios();
                await renderAll();
            }, 1200);
        } catch (err) {
            console.error('[ssei-emerg] save error', err);
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

        const selAnio = document.getElementById('em-anio-select');
        if (selAnio) selAnio.addEventListener('change', renderAll);

        const btnRefresh = document.getElementById('em-refresh-btn');
        if (btnRefresh) btnRefresh.addEventListener('click', renderAll);

        const btnAdd = document.getElementById('em-add-btn');
        if (btnAdd) {
            btnAdd.classList.toggle('d-none', !canEdit());
            btnAdd.addEventListener('click', openModal);
        }

        const btnSave = document.getElementById('em-modal-save');
        if (btnSave) btnSave.addEventListener('click', saveRecord);

        const fotosInput = document.getElementById('em-f-fotos');
        if (fotosInput) fotosInput.addEventListener('change', onFilesSelected);
    }

    // ─── API PÚBLICA ─────────────────────────────────────────────────
    window.initSseiEmergencias = async function () {
        try {
            wireUi();
            await populateAnios();
            await renderAll();
        } catch (e) {
            console.error('[ssei-emerg] init error', e);
            setStatus('<i class="fas fa-triangle-exclamation me-1"></i>' + (e.message || e), 'danger');
        }
    };

    window.sseiEmergenciasReload = renderAll;
})();
