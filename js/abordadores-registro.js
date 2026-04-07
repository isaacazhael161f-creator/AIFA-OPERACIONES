'use strict';

// ============================================================
//  ABORDADORES — REGISTRO DIGITAL
//  Handles:
//    1. Orden de Servicio Aerocares (COBUS) — prefix ao-
//    2. Registro de Servicio Aeropasillos  — prefix ap-
// ============================================================

(function () {

    // ── Helpers ──────────────────────────────────────────────

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }

    /** Calculate difference in minutes between two HH:MM strings. Returns null if invalid. */
    function diffMinutes(start, end) {
        if (!start || !end) return null;
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if ([sh, sm, eh, em].some(isNaN)) return null;
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60; // overnight wrap
        return diff;
    }

    function formatMinutes(mins) {
        if (mins === null) return '';
        return mins + ' min';
    }

    function showFeedback(elId, type, msg) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.className = `alert alert-${type} mb-3`;
        el.textContent = msg;
        el.classList.remove('d-none');
        if (type === 'success') setTimeout(() => el.classList.add('d-none'), 5000);
    }

    function setLoadingBtn(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (loading) {
            btn.disabled = true;
            btn.dataset.originalHtml = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando…';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
        }
    }

    /** Get current logged-in user's name or email */
    async function getCurrentUserDisplay() {
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return '';
            const meta = user.user_metadata || {};
            return meta.full_name || meta.username || user.email || '';
        } catch (_) {
            return '';
        }
    }

    // ── EXCEL EXPORT (simple CSV) ─────────────────────────────

    function exportToCSV(rows, filename) {
        if (!rows || !rows.length) return;
        const headers = Object.keys(rows[0]);
        const lines = [
            headers.join(','),
            ...rows.map(r => headers.map(h => {
                let v = r[h];
                if (v === null || v === undefined) v = '';
                if (typeof v === 'object') v = JSON.stringify(v);
                return '"' + String(v).replace(/"/g, '""') + '"';
            }).join(','))
        ];
        const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ════════════════════════════════════════════════════════════
    //  AEROCARES (COBUS)
    // ════════════════════════════════════════════════════════════

    const AO_TABLE = 'ordenes_servicio_aerocares';
    let aoRowCount = 0;

    function aoMakeRow(idx) {
        const i = idx;
        return `
        <tr id="ao-row-${i}">
            <td class="ps-2"><input type="text" class="form-control" name="ao-aerocar" placeholder="AIFA-61" maxlength="15" autocomplete="off"></td>
            <td><div class="input-group"><input type="text" class="form-control time-24h" name="ao-h-sal-edif" placeholder="HH:MM" maxlength="5" inputmode="numeric" autocomplete="off"><button type="button" class="btn btn-outline-secondary btn-now" tabindex="-1" title="Ahora"><i class="fas fa-clock"></i></button></div></td>
            <td><div class="input-group"><input type="text" class="form-control time-24h" name="ao-h-abordaje" placeholder="HH:MM" maxlength="5" inputmode="numeric" autocomplete="off"><button type="button" class="btn btn-outline-secondary btn-now" tabindex="-1" title="Ahora"><i class="fas fa-clock"></i></button></div></td>
            <td><div class="input-group"><input type="text" class="form-control time-24h" name="ao-h-ter-serv" placeholder="HH:MM" maxlength="5" inputmode="numeric" autocomplete="off"><button type="button" class="btn btn-outline-secondary btn-now" tabindex="-1" title="Ahora"><i class="fas fa-clock"></i></button></div></td>
            <td><input type="number" class="form-control" name="ao-pax" min="0" max="999" placeholder="Pax"></td>
            <td><input type="text" class="form-control" name="ao-operador" placeholder="APELLIDO" maxlength="40" autocomplete="off"></td>
            <td class="pe-2 text-center">
                <button type="button" class="btn btn-outline-danger rounded-circle ao-btn-del-row" data-row="${i}">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>`;
    }

    function aoAddRow() {
        aoRowCount++;
        const tbody = document.getElementById('ao-operaciones-body');
        if (!tbody) return;
        tbody.insertAdjacentHTML('beforeend', aoMakeRow(aoRowCount));
    }

    function aoCollectRows() {
        const tbody = document.getElementById('ao-operaciones-body');
        if (!tbody) return [];
        const rows = [];
        tbody.querySelectorAll('tr').forEach(tr => {
            const vals = {
                aerocar:     tr.querySelector('[name="ao-aerocar"]')?.value.trim() || '',
                h_sal_edif:  tr.querySelector('[name="ao-h-sal-edif"]')?.value || null,
                h_abordaje:  tr.querySelector('[name="ao-h-abordaje"]')?.value || null,
                h_ter_serv:  tr.querySelector('[name="ao-h-ter-serv"]')?.value || null,
                no_pax:      parseInt(tr.querySelector('[name="ao-pax"]')?.value) || null,
                operador:    tr.querySelector('[name="ao-operador"]')?.value.trim() || '',
            };
            if (vals.aerocar || vals.h_abordaje || vals.operador) rows.push(vals);
        });
        return rows;
    }

    function aoReset() {
        const form = document.getElementById('form-orden-aerocar');
        if (form) form.reset();
        const tbody = document.getElementById('ao-operaciones-body');
        if (tbody) tbody.innerHTML = '';
        aoRowCount = 0;
        // Pre-populate 3 empty rows
        aoAddRow(); aoAddRow(); aoAddRow();
        document.getElementById('ao-folio').value = '';
        document.getElementById('ao-fecha').value = todayISO();
        aoFillCoordinador();
        const fb = document.getElementById('ao-form-feedback');
        if (fb) fb.classList.add('d-none');
    }

    async function aoFillCoordinador() {
        const name = await getCurrentUserDisplay();
        const el = document.getElementById('ao-coordinador');
        if (el && name) el.value = name;
    }

    async function aoLoadNextFolio() {
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data } = await supabase
                .from(AO_TABLE)
                .select('folio')
                .order('folio', { ascending: false })
                .limit(1);
            if (data && data.length) {
                const last = parseInt(data[0].folio) || 0;
                document.getElementById('ao-folio').value = String(last + 1).padStart(6, '0');
            } else {
                document.getElementById('ao-folio').value = '000001';
            }
        } catch (_) {
            document.getElementById('ao-folio').value = 'AUTO';
        }
    }

    async function aoSubmit(e) {
        e.preventDefault();
        const fecha = document.getElementById('ao-fecha').value;
        const noVuelo = document.getElementById('ao-no-vuelo').value.trim();
        if (!fecha || !noVuelo) {
            showFeedback('ao-form-feedback', 'warning', 'Completa los campos obligatorios: Fecha y No. de Vuelo.');
            return;
        }
        const operaciones = aoCollectRows();
        if (operaciones.length === 0) {
            showFeedback('ao-form-feedback', 'warning', 'Agrega al menos un aerocar asignado.');
            return;
        }

        setLoadingBtn('ao-btn-guardar', true);

        try {
            const supabase = await window.ensureSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                folio:             document.getElementById('ao-folio').value || null,
                fecha:             fecha,
                h_programada:      document.getElementById('ao-h-programada').value || null,
                tipo_vuelo:        document.querySelector('[name="ao-tipo-vuelo"]:checked')?.value || 'nacional',
                tipo_operacion:    document.querySelector('[name="ao-tipo-op"]:checked')?.value || 'llegada',
                base:              document.getElementById('ao-base').value.trim() || null,
                posicion:          document.getElementById('ao-posicion').value.trim() || null,
                no_vuelo:          noVuelo,
                origen_destino:    document.getElementById('ao-origen-destino').value.trim() || null,
                aerolinea:         document.getElementById('ao-aerolinea').value.trim() || null,
                matricula:         document.getElementById('ao-matricula').value.trim().toUpperCase() || null,
                h_solicitud:       document.getElementById('ao-h-solicitud').value || null,
                h_entrega:         document.getElementById('ao-h-entrega').value || null,
                operaciones:       operaciones,
                obs_aerolinea:     document.getElementById('ao-obs-aerolinea').value.trim() || null,
                obs_operador:      document.getElementById('ao-obs-operador').value.trim() || null,
                nombre_conformidad:document.getElementById('ao-nombre-conformidad').value.trim() || null,
                nombre_coordinador:document.getElementById('ao-coordinador').value.trim() || null,
                created_by:        user?.id || null,
            };

            const { error } = await supabase.from(AO_TABLE).insert([payload]);
            if (error) throw error;

            showFeedback('ao-form-feedback', 'success', `✅ Orden guardada correctamente (Folio ${payload.folio}).`);
            aoReset();
            aoLoadNextFolio();

        } catch (err) {
            console.error('AO save error:', err);
            showFeedback('ao-form-feedback', 'danger', 'Error al guardar: ' + (err.message || err));
        } finally {
            setLoadingBtn('ao-btn-guardar', false);
        }
    }

    async function aoSearch() {
        const desde  = document.getElementById('ao-hist-desde').value;
        const hasta  = document.getElementById('ao-hist-hasta').value;
        const filtro = document.getElementById('ao-hist-filtro').value.trim().toUpperCase();
        const cont   = document.getElementById('ao-historial-container');
        if (!cont) return;

        cont.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> Buscando…</div>';

        try {
            const supabase = await window.ensureSupabaseClient();
            let q = supabase.from(AO_TABLE).select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(200);
            if (desde) q = q.gte('fecha', desde);
            if (hasta) q = q.lte('fecha', hasta);

            const { data, error } = await q;
            if (error) throw error;

            let rows = data || [];
            if (filtro) {
                rows = rows.filter(r =>
                    (r.no_vuelo || '').toUpperCase().includes(filtro) ||
                    (r.aerolinea || '').toUpperCase().includes(filtro) ||
                    (r.matricula || '').toUpperCase().includes(filtro) ||
                    (r.folio || '').toUpperCase().includes(filtro)
                );
            }

            window._aoHistData = rows; // Store for export

            if (!rows.length) {
                cont.innerHTML = '<div class="alert alert-info text-center">No se encontraron órdenes con esos criterios.</div>';
                return;
            }

            const tRows = rows.map(r => {
                const ops = r.operaciones || [];
                const totalPax = ops.reduce((s, o) => s + (o.no_pax || 0), 0);
                return `<tr>
                    <td class="fw-bold">${r.folio || '—'}</td>
                    <td>${r.fecha || ''}</td>
                    <td>${r.no_vuelo || '—'}</td>
                    <td>${r.aerolinea || '—'}</td>
                    <td>${r.matricula || '—'}</td>
                    <td>${r.tipo_operacion || '—'}</td>
                    <td>${r.posicion || '—'}</td>
                    <td class="text-center">${ops.length}</td>
                    <td class="text-center fw-bold">${totalPax || '—'}</td>
                    <td class="text-muted small">${r.nombre_coordinador || '—'}</td>
                    <td><button class="btn btn-sm btn-outline-primary rounded-pill px-2" onclick="window.aoVerDetalle(${r.id})" title="Ver detalle"><i class="fas fa-eye"></i></button></td>
                </tr>`;
            }).join('');

            cont.innerHTML = `
                <div class="table-responsive" style="max-height:60vh;overflow-y:auto">
                    <table class="table table-hover table-sm align-middle mb-0" style="font-size:.82rem">
                        <thead class="table-light sticky-top" style="z-index:1">
                            <tr class="text-uppercase text-muted" style="font-size:.7rem">
                                <th>Folio</th><th>Fecha</th><th>Vuelo</th><th>Aerolínea</th>
                                <th>Matrícula</th><th>Operación</th><th>Posición</th>
                                <th class="text-center">Aerocares</th><th class="text-center">Pax</th>
                                <th>Coordinador</th><th></th>
                            </tr>
                        </thead>
                        <tbody>${tRows}</tbody>
                    </table>
                    <div class="p-2 bg-light border-top small text-muted">${rows.length} registro(s)</div>
                </div>`;

        } catch (err) {
            cont.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
        }
    }

    window.aoVerDetalle = function (id) {
        const rows = window._aoHistData || [];
        const r = rows.find(x => x.id === id);
        if (!r) return;
        const ops = (r.operaciones || []).map(o =>
            `<tr><td>${o.aerocar||'—'}</td><td>${o.h_sal_edif||'—'}</td><td>${o.h_abordaje||'—'}</td><td>${o.h_ter_serv||'—'}</td><td>${o.no_pax ?? '—'}</td><td>${o.operador||'—'}</td></tr>`
        ).join('');
        const html = `
            <dl class="row small mb-2">
                <dt class="col-sm-4">Folio</dt><dd class="col-sm-8">${r.folio||'—'}</dd>
                <dt class="col-sm-4">Fecha / H. Prog.</dt><dd class="col-sm-8">${r.fecha||''} ${r.h_programada||''}</dd>
                <dt class="col-sm-4">Vuelo</dt><dd class="col-sm-8">${r.no_vuelo||'—'} (${r.tipo_operacion||''})</dd>
                <dt class="col-sm-4">Aerolínea / Mat.</dt><dd class="col-sm-8">${r.aerolinea||'—'} / ${r.matricula||'—'}</dd>
                <dt class="col-sm-4">Origen/Destino</dt><dd class="col-sm-8">${r.origen_destino||'—'}</dd>
                <dt class="col-sm-4">Base / Posición</dt><dd class="col-sm-8">${r.base||'—'} / ${r.posicion||'—'}</dd>
                <dt class="col-sm-4">Tipo vuelo</dt><dd class="col-sm-8">${r.tipo_vuelo||'—'}</dd>
            </dl>
            <table class="table table-sm table-bordered" style="font-size:.78rem">
                <thead class="table-light"><tr><th>Aerocar</th><th>H. Sal. Edif.</th><th>H. Abordaje</th><th>H. Ter. Serv.</th><th>Pax</th><th>Operador</th></tr></thead>
                <tbody>${ops}</tbody>
            </table>
            <p class="small text-muted mb-1"><b>Obs. Aerolínea:</b> ${r.obs_aerolinea||'—'}</p>
            <p class="small text-muted mb-1"><b>Obs. Operador:</b> ${r.obs_operador||'—'}</p>
            <p class="small text-muted mb-0"><b>Coordinador:</b> ${r.nombre_coordinador||'—'} | <b>Conformidad:</b> ${r.nombre_conformidad||'—'}</p>`;

        // Reuse / create a simple modal
        let modal = document.getElementById('ao-detalle-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ao-detalle-modal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header py-2" style="background:linear-gradient(135deg,#1a3a6b,#2462af)">
                            <div class="d-flex align-items-center gap-2">
                                <img src="images/aifa-logo.png" alt="AIFA" style="height:30px;width:auto;filter:brightness(0) invert(1)">
                                <h6 class="modal-title fw-bold text-white mb-0"><i class="fas fa-bus me-2"></i>Orden de Servicio Aerocares</h6>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="ao-detalle-body"></div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('ao-detalle-body').innerHTML = html;
        new bootstrap.Modal(modal).show();
    };

    function aoInitEvents() {
        const form = document.getElementById('form-orden-aerocar');
        if (!form) return;

        form.addEventListener('submit', aoSubmit);

        document.getElementById('ao-btn-add-row')?.addEventListener('click', aoAddRow);

        document.getElementById('ao-operaciones-body')?.addEventListener('click', e => {
            const btn = e.target.closest('.ao-btn-del-row');
            if (!btn) return;
            const rowId = btn.dataset.row;
            document.getElementById(`ao-row-${rowId}`)?.remove();
        });

        document.getElementById('ao-btn-limpiar')?.addEventListener('click', aoReset);
        document.getElementById('ao-btn-buscar')?.addEventListener('click', aoSearch);
        document.getElementById('ao-btn-exportar-hist')?.addEventListener('click', () => {
            if (window._aoHistData) exportToCSV(window._aoHistData, `aerocares_${todayISO()}.csv`);
        });

        // Init form state
        aoReset();
        aoLoadNextFolio();
    }

    // ════════════════════════════════════════════════════════════
    //  AEROPASILLOS
    // ════════════════════════════════════════════════════════════

    const AP_TABLE = 'registros_servicio_aeropasillos';

    function apAutoTiempos() {
        // Auto-calc GPU tiempo total
        const gpuDiff = diffMinutes(
            document.getElementById('ap-gpu-inicio')?.value,
            document.getElementById('ap-gpu-termino')?.value
        );
        const gpuTotal = document.getElementById('ap-gpu-total');
        if (gpuTotal && gpuDiff !== null) gpuTotal.value = formatMinutes(gpuDiff);

        // Auto-calc PCA tiempo total
        const pcaDiff = diffMinutes(
            document.getElementById('ap-pca-inicio')?.value,
            document.getElementById('ap-pca-termino')?.value
        );
        const pcaTotal = document.getElementById('ap-pca-total');
        if (pcaTotal && pcaDiff !== null) pcaTotal.value = formatMinutes(pcaDiff);

        // Auto-calc SALIDA tiempo total (desacople → salida, or acople → salida)
        const salDiff = diffMinutes(
            document.getElementById('ap-lleg-h-acople')?.value,
            document.getElementById('ap-sal-h-salida')?.value
        );
        const salTotal = document.getElementById('ap-sal-tiempo-total');
        if (salTotal && salDiff !== null && !salTotal.dataset.manualOverride) salTotal.value = formatMinutes(salDiff);
    }

    async function apFillCoordinador() {
        const name = await getCurrentUserDisplay();
        const el = document.getElementById('ap-coordinador');
        if (el && name) el.value = name;
    }

    async function apLoadNextFolio() {
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data } = await supabase
                .from(AP_TABLE)
                .select('folio')
                .order('folio', { ascending: false })
                .limit(1);
            if (data && data.length) {
                const last = parseInt(data[0].folio) || 0;
                document.getElementById('ap-folio').value = String(last + 1).padStart(6, '0');
            } else {
                document.getElementById('ap-folio').value = '000001';
            }
        } catch (_) {
            document.getElementById('ap-folio').value = 'AUTO';
        }
    }

    function apReset() {
        const form = document.getElementById('form-registro-aeropasillo');
        if (form) form.reset();
        document.getElementById('ap-fecha').value = todayISO();
        document.getElementById('ap-folio').value = '';
        const gpuEl = document.getElementById('ap-gpu-total');
        const pcaEl = document.getElementById('ap-pca-total');
        const salEl = document.getElementById('ap-sal-tiempo-total');
        if (gpuEl) gpuEl.value = '';
        if (pcaEl) pcaEl.value = '';
        if (salEl) { salEl.value = ''; delete salEl.dataset.manualOverride; }
        apFillCoordinador();
        const llegProgEl = document.getElementById('ap-lleg-programada');
        const salProgEl  = document.getElementById('ap-sal-programada');
        if (llegProgEl) llegProgEl.value = '';
        if (salProgEl)  salProgEl.value  = '';
        const fb = document.getElementById('ap-form-feedback');
        if (fb) fb.classList.add('d-none');
    }

    async function apSubmit(e) {
        e.preventDefault();
        const fecha    = document.getElementById('ap-fecha').value;
        const posicion = document.getElementById('ap-posicion').value.trim();
        if (!fecha || !posicion) {
            showFeedback('ap-form-feedback', 'warning', 'Completa los campos obligatorios: Fecha y Posición.');
            return;
        }

        setLoadingBtn('ap-btn-guardar', true);

        try {
            const supabase = await window.ensureSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                folio:                    document.getElementById('ap-folio').value || null,
                fecha:                    fecha,
                tipo_vuelo:               document.querySelector('[name="ap-tipo-vuelo"]:checked')?.value || 'nacional',
                posicion:                 posicion,
                aeropasillo_numero:       document.getElementById('ap-numero').value.trim() || null,
                aeropasillo_dedo:         document.getElementById('ap-dedo').value || null,
                matricula:                document.getElementById('ap-matricula').value.trim().toUpperCase() || null,
                linea_aerea:              document.getElementById('ap-linea-aerea').value.trim() || null,
                aeronave:                 document.getElementById('ap-aeronave').value.trim() || null,
                empleado_acople:          document.getElementById('ap-empleado-acople').value.trim() || null,
                lleg_programada:          document.getElementById('ap-lleg-programada')?.value || null,
                lleg_no_vuelo:            document.getElementById('ap-lleg-vuelo').value.trim() || null,
                lleg_origen:              document.getElementById('ap-lleg-origen').value.trim().toUpperCase() || null,
                lleg_h_calzos:            document.getElementById('ap-lleg-h-calzos').value || null,
                lleg_auth_acople:         document.getElementById('ap-lleg-auth-acople').value || null,
                lleg_h_acople:            document.getElementById('ap-lleg-h-acople').value || null,
                lleg_no_pax:              document.getElementById('ap-lleg-pax').value.trim() || null,
                lleg_empleado_desacople:  document.getElementById('ap-lleg-empleado-desacople').value.trim() || null,
                sal_programada:           document.getElementById('ap-sal-programada')?.value || null,
                sal_no_vuelo:             document.getElementById('ap-sal-vuelo').value.trim() || null,
                sal_destino:              document.getElementById('ap-sal-destino').value.trim().toUpperCase() || null,
                sal_no_pax:               document.getElementById('ap-sal-pax').value.trim() || null,
                sal_cierre_puerta:        document.getElementById('ap-sal-cierre-puerta').value || null,
                sal_h_desacople:          document.getElementById('ap-sal-h-desacople').value || null,
                sal_h_salida:             document.getElementById('ap-sal-h-salida').value || null,
                sal_tiempo_total:         document.getElementById('ap-sal-tiempo-total').value.trim() || null,
                gpu_h_inicio:             document.getElementById('ap-gpu-inicio').value || null,
                gpu_h_termino:            document.getElementById('ap-gpu-termino').value || null,
                gpu_tiempo_total:         document.getElementById('ap-gpu-total').value.trim() || null,
                gpu_encargado:            document.getElementById('ap-gpu-encargado').value.trim() || null,
                pca_h_inicio:             document.getElementById('ap-pca-inicio').value || null,
                pca_h_termino:            document.getElementById('ap-pca-termino').value || null,
                pca_tiempo_total:         document.getElementById('ap-pca-total').value.trim() || null,
                pca_encargado:            document.getElementById('ap-pca-encargado').value.trim() || null,
                obs_aerolinea_nombre:     document.getElementById('ap-obs-aerolinea-nombre').value.trim() || null,
                obs_operador_nombre:      document.getElementById('ap-obs-operador-nombre').value.trim() || null,
                observaciones:            document.getElementById('ap-observaciones').value.trim() || null,
                nombre_coordinador:       document.getElementById('ap-coordinador').value.trim() || null,
                created_by:               user?.id || null,
            };

            const { error } = await supabase.from(AP_TABLE).insert([payload]);
            if (error) throw error;

            showFeedback('ap-form-feedback', 'success', `✅ Registro guardado correctamente (Folio ${payload.folio}).`);
            apReset();
            apLoadNextFolio();

        } catch (err) {
            console.error('AP save error:', err);
            showFeedback('ap-form-feedback', 'danger', 'Error al guardar: ' + (err.message || err));
        } finally {
            setLoadingBtn('ap-btn-guardar', false);
        }
    }

    async function apSearch() {
        const desde  = document.getElementById('ap-hist-desde').value;
        const hasta  = document.getElementById('ap-hist-hasta').value;
        const filtro = document.getElementById('ap-hist-filtro').value.trim().toUpperCase();
        const cont   = document.getElementById('ap-historial-container');
        if (!cont) return;

        cont.innerHTML = '<div class="text-center py-4"><span class="spinner-border spinner-border-sm text-success"></span> Buscando…</div>';

        try {
            const supabase = await window.ensureSupabaseClient();
            let q = supabase.from(AP_TABLE).select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(200);
            if (desde) q = q.gte('fecha', desde);
            if (hasta) q = q.lte('fecha', hasta);

            const { data, error } = await q;
            if (error) throw error;

            let rows = data || [];
            if (filtro) {
                rows = rows.filter(r =>
                    (r.posicion || '').toUpperCase().includes(filtro) ||
                    (r.lleg_no_vuelo || '').toUpperCase().includes(filtro) ||
                    (r.sal_no_vuelo || '').toUpperCase().includes(filtro) ||
                    (r.matricula || '').toUpperCase().includes(filtro) ||
                    (r.linea_aerea || '').toUpperCase().includes(filtro) ||
                    (r.folio || '').toUpperCase().includes(filtro)
                );
            }

            window._apHistData = rows;

            if (!rows.length) {
                cont.innerHTML = '<div class="alert alert-info text-center">No se encontraron registros con esos criterios.</div>';
                return;
            }

            const tRows = rows.map(r => `<tr>
                <td class="fw-bold">${r.folio || '—'}</td>
                <td>${r.fecha || ''}</td>
                <td>${r.posicion || '—'}</td>
                <td>${r.aeropasillo_numero || '—'}${r.aeropasillo_dedo ? '-' + r.aeropasillo_dedo : ''}</td>
                <td>${r.linea_aerea || '—'}</td>
                <td>${r.matricula || '—'}</td>
                <td>${r.lleg_no_vuelo || '—'}</td>
                <td>${r.sal_no_vuelo || '—'}</td>
                <td>${r.sal_tiempo_total || '—'}</td>
                <td class="text-muted small">${r.nombre_coordinador || '—'}</td>
                <td><button class="btn btn-sm btn-outline-success rounded-pill px-2" onclick="window.apVerDetalle(${r.id})" title="Ver detalle"><i class="fas fa-eye"></i></button></td>
            </tr>`).join('');

            cont.innerHTML = `
                <div class="table-responsive" style="max-height:60vh;overflow-y:auto">
                    <table class="table table-hover table-sm align-middle mb-0" style="font-size:.82rem">
                        <thead class="table-light sticky-top" style="z-index:1">
                            <tr class="text-uppercase text-muted" style="font-size:.7rem">
                                <th>Folio</th><th>Fecha</th><th>Posición</th><th>Pasillo</th>
                                <th>Aerolínea</th><th>Matrícula</th>
                                <th>Vuelo Lleg.</th><th>Vuelo Sal.</th>
                                <th>T. Total</th><th>Coordinador</th><th></th>
                            </tr>
                        </thead>
                        <tbody>${tRows}</tbody>
                    </table>
                    <div class="p-2 bg-light border-top small text-muted">${rows.length} registro(s)</div>
                </div>`;

        } catch (err) {
            cont.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
        }
    }

    window.apVerDetalle = function (id) {
        const rows = window._apHistData || [];
        const r = rows.find(x => x.id === id);
        if (!r) return;
        const html = `
            <div class="row small g-2">
                <div class="col-6">
                    <b>Folio:</b> ${r.folio||'—'}<br>
                    <b>Fecha:</b> ${r.fecha||'—'}<br>
                    <b>Tipo vuelo:</b> ${r.tipo_vuelo||'—'}<br>
                    <b>Posición:</b> ${r.posicion||'—'} | Pasillo: ${r.aeropasillo_numero||'—'}${r.aeropasillo_dedo||''}<br>
                    <b>Aerolínea:</b> ${r.linea_aerea||'—'} | <b>Aeronave:</b> ${r.aeronave||'—'}<br>
                    <b>Matrícula:</b> ${r.matricula||'—'}<br>
                    <b>Empleado Acople:</b> ${r.empleado_acople||'—'}
                </div>
                <div class="col-6">
                    <b>LLEGADA</b><br>
                    Vuelo: ${r.lleg_no_vuelo||'—'} | Origen: ${r.lleg_origen||'—'}<br>
                    Calzos: ${r.lleg_h_calzos||'—'} | Auth: ${r.lleg_auth_acople||'—'} | Acople: ${r.lleg_h_acople||'—'}<br>
                    Pax: ${r.lleg_no_pax||'—'} | Desacople: ${r.lleg_empleado_desacople||'—'}<br><br>
                    <b>SALIDA</b><br>
                    Vuelo: ${r.sal_no_vuelo||'—'} | Destino: ${r.sal_destino||'—'}<br>
                    Pax: ${r.sal_no_pax||'—'} | C. Puerta: ${r.sal_cierre_puerta||'—'}<br>
                    H. Desacople: ${r.sal_h_desacople||'—'} | H. Salida: ${r.sal_h_salida||'—'}<br>
                    Tiempo total: <b>${r.sal_tiempo_total||'—'}</b>
                </div>
                <div class="col-12 mt-2">
                    <b>GPU:</b> ${r.gpu_h_inicio||'—'} – ${r.gpu_h_termino||'—'} (${r.gpu_tiempo_total||'—'}) | ${r.gpu_encargado||'—'}<br>
                    <b>PCA:</b> ${r.pca_h_inicio||'—'} – ${r.pca_h_termino||'—'} (${r.pca_tiempo_total||'—'}) | ${r.pca_encargado||'—'}<br>
                    <b>Obs. Aerolínea:</b> ${r.obs_aerolinea_nombre||'—'} &nbsp;|&nbsp; <b>Obs. Operador:</b> ${r.obs_operador_nombre||'—'}<br>
                    <b>Observaciones:</b> ${r.observaciones||'—'}<br>
                    <b>Coordinador:</b> ${r.nombre_coordinador||'—'}
                </div>
            </div>`;

        let modal = document.getElementById('ap-detalle-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ap-detalle-modal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            modal.innerHTML = `
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header py-2" style="background:linear-gradient(135deg,#14452f,#1d6b47)">
                            <div class="d-flex align-items-center gap-2">
                                <img src="images/aifa-logo.png" alt="AIFA" style="height:30px;width:auto;filter:brightness(0) invert(1)">
                                <h6 class="modal-title fw-bold text-white mb-0"><i class="fas fa-tunnel me-2"></i>Registro de Servicio Aeropasillo</h6>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="ap-detalle-body"></div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('ap-detalle-body').innerHTML = html;
        new bootstrap.Modal(modal).show();
    };

    function apInitEvents() {
        const form = document.getElementById('form-registro-aeropasillo');
        if (!form) return;

        form.addEventListener('submit', apSubmit);
        document.getElementById('ap-btn-limpiar')?.addEventListener('click', apReset);
        document.getElementById('ap-btn-buscar')?.addEventListener('click', apSearch);
        document.getElementById('ap-btn-exportar-hist')?.addEventListener('click', () => {
            if (window._apHistData) exportToCSV(window._apHistData, `aeropasillos_${todayISO()}.csv`);
        });

        // Auto-calc tiempos when time inputs change
        ['ap-gpu-inicio', 'ap-gpu-termino', 'ap-pca-inicio', 'ap-pca-termino',
         'ap-lleg-h-acople', 'ap-sal-h-salida'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', apAutoTiempos);
        });

        // Allow manual override of sal-tiempo-total
        document.getElementById('ap-sal-tiempo-total')?.addEventListener('input', function () {
            this.dataset.manualOverride = '1';
        });

        apReset();
        apLoadNextFolio();
    }

    // ── Bootstrap tab listeners ─────────────────────────────

    function bindTabListeners() {
        // Aerocares tab activated
        const tabAerocares = document.querySelector('[data-bs-target="#pane-mech-aerocares"]');
        const tabAeropasillos = document.querySelector('[data-bs-target="#pane-mech-aeropasillos"]');

        if (tabAerocares) {
            tabAerocares.addEventListener('shown.bs.tab', () => {
                if (!document.getElementById('ao-fecha').value) aoReset();
            });
        }

        if (tabAeropasillos) {
            tabAeropasillos.addEventListener('shown.bs.tab', () => {
                if (!document.getElementById('ap-fecha').value) apReset();
            });
        }
    }

    // ── Global time field setup (24h, auto-colon, AHORA button) ──────────

    function setupGlobalTimeHandling() {
        // Auto-colon as user types: 1800 → 18:00
        document.addEventListener('input', function (e) {
            if (!e.target.classList.contains('time-24h')) return;
            let digits = e.target.value.replace(/\D/g, '');
            if (digits.length > 4) digits = digits.slice(0, 4);
            e.target.value = digits.length >= 3 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits;
        }, false);

        // Pad to HH:MM on blur (8:5 → 08:05) then fire change for auto-calc
        document.addEventListener('blur', function (e) {
            if (!e.target.classList.contains('time-24h')) return;
            const m = e.target.value.match(/^(\d{1,2}):?(\d{0,2})$/);
            if (!m) return;
            const h = parseInt(m[1] || 0), min = parseInt(m[2] || 0);
            if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
                e.target.value = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
                e.target.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, true); // capture phase (blur doesn't bubble)

        // AHORA button: fills the adjacent time-24h input with current HH:MM
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.btn-now');
            if (!btn) return;
            const now = new Date();
            const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const targetId = btn.dataset.target;
            const inp = targetId
                ? document.getElementById(targetId)
                : btn.closest('.input-group')?.querySelector('input.time-24h');
            if (!inp) return;
            inp.value = hhmm;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        }, false);
    }

    // ── Tablet-friendly upgrade: remove -sm from form controls ────────────

    function upgradeFormsForTablet() {
        ['#pane-mech-aerocares', '#pane-mech-aeropasillos'].forEach(sel => {
            const pane = document.querySelector(sel);
            if (!pane) return;
            pane.querySelectorAll('.form-control-sm').forEach(el => el.classList.remove('form-control-sm'));
            pane.querySelectorAll('.form-select-sm').forEach(el => el.classList.remove('form-select-sm'));
            pane.querySelectorAll('.form-label.small').forEach(el => el.classList.remove('small', 'text-muted'));
            pane.querySelectorAll('.btn.btn-sm').forEach(el => el.classList.remove('btn-sm'));
        });
        document.querySelectorAll('#aerocar-subtabs .nav-link, #aeropasillo-subtabs .nav-link')
            .forEach(el => el.classList.remove('small'));
    }

    // ── Init ────────────────────────────────────────────────

    function init() {
        setupGlobalTimeHandling();
        aoInitEvents();
        apInitEvents();
        bindTabListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
