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
        ['ao-sig-aerolinea','ao-sig-operador','ao-sig-coordinador'].forEach(clearSigPad);
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
                firma_operador:    document.getElementById('ao-firma-operador').value.trim() || null,
                nombre_coordinador:document.getElementById('ao-coordinador').value.trim() || null,
                sig_aerolinea:     getSigData('ao-sig-aerolinea'),
                sig_operador:      getSigData('ao-sig-operador'),
                sig_coordinador:   getSigData('ao-sig-coordinador'),
                created_by:        user?.id || null,
            };

            const { data: aoInserted, error } = await supabase.from(AO_TABLE).insert([payload]).select('id').single();
            if (error) throw error;

            // Generar PDF de la boleta y guardarlo en Storage
            const pdfBlob = await boletaCaptureFromHtml(buildAoBoleta(payload, _aifaLogoB64));
            if (pdfBlob && aoInserted?.id) {
                const pdfPath = `aerocares/${payload.folio || aoInserted.id}.pdf`;
                const pdfUrl  = await boletaUploadPdf(pdfBlob, pdfPath, supabase);
                if (pdfUrl) {
                    await supabase.from(AO_TABLE).update({ pdf_url: pdfUrl }).eq('id', aoInserted.id);
                }
            }

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
            <p class="small text-muted mb-0"><b>Coordinador:</b> ${r.nombre_coordinador||'—'} | <b>Conformidad:</b> ${r.nombre_conformidad||'—'} | <b>Firma Operador:</b> ${r.firma_operador||'—'}</p>`;

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
        ['ap-sig-aerolinea','ap-sig-operador','ap-sig-coordinador'].forEach(clearSigPad);
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
                sig_aerolinea:            getSigData('ap-sig-aerolinea'),
                sig_operador:             getSigData('ap-sig-operador'),
                sig_coordinador:          getSigData('ap-sig-coordinador'),
                created_by:               user?.id || null,
            };

            const { data: apInserted, error } = await supabase.from(AP_TABLE).insert([payload]).select('id').single();
            if (error) throw error;

            // Generar PDF de la boleta y guardarlo en Storage
            const pdfBlob = await boletaCaptureFromHtml(buildApBoleta(payload, _aifaLogoB64));
            if (pdfBlob && apInserted?.id) {
                const pdfPath = `aeropasillos/${payload.folio || apInserted.id}.pdf`;
                const pdfUrl  = await boletaUploadPdf(pdfBlob, pdfPath, supabase);
                if (pdfUrl) {
                    await supabase.from(AP_TABLE).update({ pdf_url: pdfUrl }).eq('id', apInserted.id);
                }
            }

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

    // ── PDF boleta ─────────────────────────────────────────────────────────

    // Logo AIFA en base64 (se carga al init para evitar cors en html2canvas)
    let _aifaLogoB64 = '';
    async function _loadAifaLogo() {
        try {
            const res  = await fetch('images/aifa-logo.png');
            const blob = await res.blob();
            return await new Promise(ok => {
                const r = new FileReader();
                r.onload = () => ok(r.result);
                r.readAsDataURL(blob);
            });
        } catch { return ''; }
    }

    // Genera el HTML de la boleta Aerocares lista para imprimir
    function buildAoBoleta(p, logo) {
        const op = (p.operaciones || []).map((r, i) => `
            <tr style="background:${i%2?'#f7f9ff':'#fff'}">
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0;border-right:1px solid #e0e6f0;font-weight:700">${r.aerocar||''}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0;border-right:1px solid #e0e6f0">${r.h_sal_edif||''}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0;border-right:1px solid #e0e6f0">${r.h_abordaje||''}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0;border-right:1px solid #e0e6f0">${r.h_ter_serv||''}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0;border-right:1px solid #e0e6f0;text-align:center">${r.no_pax||''}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #e0e6f0">${r.operador||''}</td>
            </tr>`).join('');

        const sigCell = (src, nombre, label) => `
            <td style="width:33.3%;text-align:center;padding:8px;border-right:1px solid #ccc;vertical-align:top">
              <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px">${label}</div>
              ${src ? `<img src="${src}" style="max-width:140px;max-height:56px;display:block;margin:0 auto 2px">` : '<div style="height:56px;border-bottom:1px solid #aaa;margin:0 12px 2px"></div>'}
              <div style="font-size:9px;font-weight:600;color:#222">${nombre||''}</div>
            </td>`;

        const opColor = p.tipo_operacion === 'llegada' ? '#1456c8' : '#d46000';
        return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#111;width:710px;background:#fff">
          <!-- HEADER -->
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr style="background:linear-gradient(135deg,#1a3a6b,#2462af);color:#fff">
              <td width="52" style="padding:6px 8px;vertical-align:middle">
                ${logo ? `<img src="${logo}" style="height:38px;width:auto;filter:brightness(0) invert(1)">` : ''}
              </td>
              <td style="text-align:center;padding:6px">
                <div style="font-size:8px;letter-spacing:1.2px;opacity:.8;text-transform:uppercase">Aeropuerto Internacional Felipe Ángeles</div>
                <div style="font-size:13px;font-weight:900;letter-spacing:.8px;text-transform:uppercase">Orden de Servicio Aerocares</div>
              </td>
              <td width="52"></td>
            </tr>
          </table>
          <!-- ROW INFO -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="width:22%;padding:5px 8px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Fecha</div>
                <div style="font-size:12px;font-weight:700">${p.fecha||''}</div>
              </td>
              <td style="width:22%;padding:5px 8px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">H. Programada</div>
                <div style="font-size:12px;font-weight:700">${p.h_programada||''}</div>
              </td>
              <td style="width:56%;padding:5px 8px;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Folio No.</div>
                <div style="font-size:18px;font-weight:900;letter-spacing:3px;color:#1456c8">${p.folio||''}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 8px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Tipo Vuelo</div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase">${(p.tipo_vuelo||'').toUpperCase()}</div>
              </td>
              <td style="padding:5px 8px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Base</div>
                <div style="font-size:10px;font-weight:700">${p.base||''}</div>
              </td>
              <td style="padding:5px 8px;border-bottom:1px solid #c8cfe0">
                <span style="margin-right:18px">
                  <span style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Posición&nbsp;</span>
                  <span style="font-size:10px;font-weight:700">${p.posicion||''}</span>
                </span>
                <span style="display:inline-block;padding:2px 10px;background:${opColor};color:#fff;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${(p.tipo_operacion||'').toUpperCase()}</span>
              </td>
            </tr>
          </table>
          <!-- BODY: left datos + right tabla operaciones -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="width:130px;vertical-align:top;border-right:1px solid #c8cfe0;padding:6px 8px">
                ${[['No. Vuelo',p.no_vuelo,'13px'],['Origen / Destino',p.origen_destino,'11px'],['Aerolínea',p.aerolinea,'11px'],['Matrícula',p.matricula,'11px'],['H. Solicitud',p.h_solicitud,'11px'],['H. Entrega',p.h_entrega,'11px']].map(([lbl,val,sz]) =>`
                <div style="margin-bottom:6px">
                  <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">${lbl}</div>
                  <div style="font-size:${sz};font-weight:700">${val||'—'}</div>
                </div>`).join('')}
              </td>
              <td style="vertical-align:top;padding:0">
                <table width="100%" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-size:9px">
                  <thead>
                    <tr style="background:#edf1fb">
                      ${['Aerocar','H. Sal. Edif.','H. Abordaje','H. Ter. Serv.','No. PAX','Operador'].map(h=>`<th style="padding:5px 6px;border-bottom:1px solid #c8cfe0;border-right:1px solid #e0e6f0;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;color:#556">${h}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>${op}</tbody>
                </table>
              </td>
            </tr>
          </table>
          <!-- OBSERVACIONES -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="width:50%;padding:5px 8px;border-right:1px solid #c8cfe0;vertical-align:top">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:2px">Observaciones Aerolínea</div>
                <div style="font-size:9px;min-height:28px">${p.obs_aerolinea||''}</div>
              </td>
              <td style="padding:5px 8px;vertical-align:top">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:2px">Observaciones Operador</div>
                <div style="font-size:9px;min-height:28px">${p.obs_operador||''}</div>
              </td>
            </tr>
          </table>
          <!-- FIRMAS -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              ${sigCell(p.sig_aerolinea, p.nombre_conformidad, 'Conforme Aerolínea')}
              ${sigCell(p.sig_operador,  p.firma_operador,     'Operadores')}
              <td style="width:33.3%;text-align:center;padding:8px;vertical-align:top">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px">Coordinador Mecánico</div>
                ${p.sig_coordinador ? `<img src="${p.sig_coordinador}" style="max-width:140px;max-height:56px;display:block;margin:0 auto 2px">` : '<div style="height:56px;border-bottom:1px solid #aaa;margin:0 12px 2px"></div>'}
                <div style="font-size:9px;font-weight:600;color:#222">${p.nombre_coordinador||''}</div>
              </td>
            </tr>
          </table>
        </div>`;
    }

    // Genera el HTML de la boleta Aeropasillos lista para imprimir
    function buildApBoleta(p, logo) {
        const cell = (lbl, val, extra='') => `
          <td style="padding:4px 7px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0;vertical-align:top${extra}">
            <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">${lbl}</div>
            <div style="font-size:10px;font-weight:700">${val||'—'}</div>
          </td>`;

        const sigCell = (src, nombre, label) => `
          <td style="width:33.3%;text-align:center;padding:8px;border-right:1px solid #c8cfe0;vertical-align:top">
            <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px">${label}</div>
            ${src ? `<img src="${src}" style="max-width:140px;max-height:56px;display:block;margin:0 auto 2px">` : '<div style="height:56px;border-bottom:1px solid #aaa;margin:0 12px 2px"></div>'}
            <div style="font-size:9px;font-weight:600;color:#222">${nombre||''}</div>
          </td>`;

        return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#111;width:710px;background:#fff">
          <!-- HEADER -->
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr style="background:linear-gradient(135deg,#14452f,#1d6b47);color:#fff">
              <td width="52" style="padding:6px 8px;vertical-align:middle">
                ${logo ? `<img src="${logo}" style="height:38px;width:auto;filter:brightness(0) invert(1)">` : ''}
              </td>
              <td style="text-align:center;padding:6px">
                <div style="font-size:9px;font-weight:900;letter-spacing:4px">AIFA</div>
                <div style="font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase">Registro de Servicio de Aeropasillos</div>
                <div style="font-size:7px;opacity:.75;letter-spacing:.5px;text-transform:uppercase">Aeropuerto Internacional Felipe Ángeles S.A. de C.V.</div>
              </td>
              <td width="52"></td>
            </tr>
          </table>
          <!-- FILA 1: tipo + posición + folio -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              ${cell('Fecha', p.fecha)}
              ${cell('Tipo Vuelo', (p.tipo_vuelo||'').toUpperCase())}
              ${cell('Posición', p.posicion)}
              ${cell('Aeropasillo No.', p.aeropasillo_numero)}
              ${cell('Dedo', p.aeropasillo_dedo)}
              <td style="padding:5px 8px;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Folio No.</div>
                <div style="font-size:16px;font-weight:900;letter-spacing:2px;color:#1d6b47">${p.folio||''}</div>
              </td>
            </tr>
            <tr>
              ${cell('Matrícula', p.matricula)}
              ${cell('Línea Aérea', p.linea_aerea)}
              ${cell('Aeronave', p.aeronave)}
              ${cell('Empleado Acople', p.empleado_acople,';width:160px')}
            </tr>
          </table>
          <!-- LLEGADA / SALIDA en 2 columnas -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="width:50%;vertical-align:top;border-right:1px solid #c8cfe0">
                <div style="background:#dbeafe;padding:3px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#1456c8;letter-spacing:.5px;border-bottom:1px solid #c8cfe0">Llegada</div>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    ${cell('Programada',p.lleg_programada)}
                    ${cell('No. Vuelo',p.lleg_no_vuelo)}
                    ${cell('Origen',p.lleg_origen)}
                  </tr>
                  <tr>
                    ${cell('H. Calzos',p.lleg_h_calzos)}
                    ${cell('Auth. Acople',p.lleg_auth_acople)}
                    ${cell('H. Acople',p.lleg_h_acople)}
                  </tr>
                  <tr>
                    ${cell('No. PAX',p.lleg_no_pax)}
                    <td colspan="2" style="padding:4px 7px;border-right:1px solid #c8cfe0;border-bottom:1px solid #c8cfe0">
                      <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Empleado Desacople</div>
                      <div style="font-size:10px;font-weight:700">${p.lleg_empleado_desacople||'—'}</div>
                    </td>
                  </tr>
                </table>
              </td>
              <td style="width:50%;vertical-align:top">
                <div style="background:#fff3e0;padding:3px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#d46000;letter-spacing:.5px;border-bottom:1px solid #c8cfe0">Salida</div>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    ${cell('Programada',p.sal_programada)}
                    ${cell('No. Vuelo',p.sal_no_vuelo)}
                    ${cell('Destino',p.sal_destino)}
                  </tr>
                  <tr>
                    ${cell('No. PAX',p.sal_no_pax)}
                    ${cell('Cierre Puerta',p.sal_cierre_puerta)}
                    ${cell('H. Desacople',p.sal_h_desacople)}
                  </tr>
                  <tr>
                    ${cell('H. Salida',p.sal_h_salida)}
                    <td colspan="2" style="padding:4px 7px;border-bottom:1px solid #c8cfe0">
                      <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888">Tiempo Total</div>
                      <div style="font-size:10px;font-weight:700">${p.sal_tiempo_total||'—'}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!-- GPU / PCA -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="width:50%;border-right:1px solid #c8cfe0">
                <div style="background:#f0fdf4;padding:3px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:.5px;border-bottom:1px solid #c8cfe0">GPU</div>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    ${cell('H. Inicio',p.gpu_h_inicio)}
                    ${cell('H. Término',p.gpu_h_termino)}
                    ${cell('Tiempo Total',p.gpu_tiempo_total)}
                    ${cell('Encargado',p.gpu_encargado)}
                  </tr>
                </table>
              </td>
              <td style="width:50%">
                <div style="background:#f0fdf4;padding:3px 8px;font-size:8px;font-weight:700;text-transform:uppercase;color:#166534;letter-spacing:.5px;border-bottom:1px solid #c8cfe0">PCA</div>
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                  <tr>
                    ${cell('H. Inicio',p.pca_h_inicio)}
                    ${cell('H. Término',p.pca_h_termino)}
                    ${cell('Tiempo Total',p.pca_tiempo_total)}
                    ${cell('Encargado',p.pca_encargado)}
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!-- OBSERVACIONES -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              <td style="padding:5px 8px;vertical-align:top;border-bottom:1px solid #c8cfe0">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:2px">Observaciones</div>
                <div style="font-size:9px;min-height:24px">${p.observaciones||''}</div>
              </td>
            </tr>
          </table>
          <!-- FIRMAS -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #c8cfe0;border-top:0">
            <tr>
              ${sigCell(p.sig_aerolinea, p.obs_aerolinea_nombre, 'Conforme Aerolínea')}
              ${sigCell(p.sig_operador,  p.obs_operador_nombre,  'Operadores')}
              <td style="width:33.3%;text-align:center;padding:8px;vertical-align:top">
                <div style="font-size:7px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px">Coordinador Mecánico</div>
                ${p.sig_coordinador ? `<img src="${p.sig_coordinador}" style="max-width:140px;max-height:56px;display:block;margin:0 auto 2px">` : '<div style="height:56px;border-bottom:1px solid #aaa;margin:0 12px 2px"></div>'}
                <div style="font-size:9px;font-weight:600;color:#222">${p.nombre_coordinador||''}</div>
              </td>
            </tr>
          </table>
        </div>`;
    }

    // Captura HTML string → Blob PDF (renderiza en div off-screen temporal)
    async function boletaCaptureFromHtml(html) {
        if (!window.html2pdf) return null;

        // html2pdf needs the element to be in the live DOM with real dimensions
        // for html2canvas to capture it. We append it fixed at top-left (invisible
        // to the user via pointer-events:none) then remove it after capture.
        const wrap = document.createElement('div');
        wrap.style.cssText =
            'position:fixed;top:0;left:0;width:800px;background:#fff;' +
            'z-index:99999;pointer-events:none;overflow:hidden;';
        wrap.innerHTML = html;
        document.body.appendChild(wrap);

        // Wait two animation frames so the browser finishes layout + paint.
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        try {
            return await html2pdf()
                .set({
                    margin:      [8, 10],
                    image:       { type: 'jpeg', quality: 0.97 },
                    html2canvas: {
                        scale:           2,
                        useCORS:         true,
                        logging:         false,
                        backgroundColor: '#fff',
                        windowWidth:     800,
                        x:               0,
                        y:               0,
                        scrollX:         0,
                        scrollY:         0,
                    },
                    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
                })
                .from(wrap)
                .output('blob');
        } catch (err) {
            console.warn('boletaCaptureFromHtml error:', err);
            return null;
        } finally {
            document.body.removeChild(wrap);
        }
    }

    // Sube un Blob PDF al bucket de Supabase Storage y devuelve la URL pública.
    async function boletaUploadPdf(blob, storagePath, supabase) {
        if (!blob) return null;
        try {
            const { error } = await supabase.storage
                .from('boletas_aerocares')
                .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });
            if (error) { console.warn('PDF upload error:', error); return null; }
            const { data } = supabase.storage.from('boletas_aerocares').getPublicUrl(storagePath);
            return data?.publicUrl || null;
        } catch (err) {
            console.warn('boletaUploadPdf error:', err);
            return null;
        }
    }

    // ── Signature pads ─────────────────────────────────────────────────────

    const _sigPads = {};

    function initSigPad(canvasId) {
        if (!window.SignaturePad) return;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Sync canvas pixel buffer to its CSS layout size.
        // SignaturePad v4 reads pointer coords as CSS px (clientX - rect.left),
        // so canvas.width must equal offsetWidth exactly (no DPR scaling).
        function syncSize() {
            const w = canvas.offsetWidth;
            const h = canvas.offsetHeight;
            if (!w || !h) return; // element not yet laid out
            if (canvas.width === w && canvas.height === h) return;
            canvas.width  = w;
            canvas.height = h;
            _sigPads[canvasId]?.clear();
        }

        syncSize();
        _sigPads[canvasId] = new SignaturePad(canvas, {
            backgroundColor: 'rgb(250,250,250)',
            penColor: '#111',
            minWidth: 1.5,
            maxWidth: 3,
        });

        // ResizeObserver fires when the canvas gains a real size (e.g. hidden tab
        // becomes visible, modal opens). This is the most reliable way to handle
        // canvases that start inside display:none containers.
        if (window.ResizeObserver) {
            new ResizeObserver(syncSize).observe(canvas);
        } else {
            // Fallback for older browsers: watch nearest tab-pane class changes
            const pane = canvas.closest('.tab-pane');
            if (pane) {
                new MutationObserver(syncSize).observe(pane, { attributeFilter: ['class'] });
            }
        }
    }

    function getSigData(canvasId) {
        const pad = _sigPads[canvasId];
        if (!pad || pad.isEmpty()) return null;
        return pad.toDataURL('image/png');
    }

    function clearSigPad(canvasId) {
        _sigPads[canvasId]?.clear();
    }

    function initAllSigPads() {
        ['ao-sig-aerolinea','ao-sig-operador','ao-sig-coordinador',
         'ap-sig-aerolinea','ap-sig-operador','ap-sig-coordinador'].forEach(initSigPad);
        // Wire the eraser buttons globally
        document.addEventListener('click', e => {
            const btn = e.target.closest('.sig-clear-btn');
            if (!btn) return;
            clearSigPad(btn.dataset.sig);
        });
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
        _loadAifaLogo().then(b64 => { _aifaLogoB64 = b64; });
        setupGlobalTimeHandling();
        initAllSigPads();
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
