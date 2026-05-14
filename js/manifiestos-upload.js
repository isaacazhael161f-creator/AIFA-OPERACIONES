// ─── MÓDULO: IMPORTACIÓN DE MANIFIESTOS DESDE XLSX ──────────────────────────
// Solo accesible para roles: admin, superadmin, editor
// Lee la hoja Excel, detecta mes/año, elimina datos previos e inserta en lotes.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    const UPLOAD_ROLES = ['admin', 'superadmin', 'editor'];
    const AUTOGEN_COLS = new Set(['id', 'created_at', 'no']);

    const MES_NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const MES_ABREV = {
        'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,
        'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12
    };

    // ── Utilidades ─────────────────────────────────────────────────────────────

    function normCol(s) {
        return String(s == null ? '' : s).trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    /** Extrae mes y año del nombre de la hoja — soporta "ABR 2026", "ABRIL 2026", "ABR2026", "04/2026" */
    function getMesAnioFromSheet(name) {
        const n = String(name || '').trim();
        // Permite separador opcional entre mes y año (espacio, guión, barra, nada)
        const m1 = n.match(/([A-Za-z\u00e0-\u00ff]{2,})[^a-z0-9]*(\d{4})/i);
        if (m1) {
            const abbr = m1[1].substring(0, 3).toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const anio = parseInt(m1[2], 10);
            if (MES_ABREV[abbr] && anio >= 2000) return { mes: MES_ABREV[abbr], anio };
        }
        const m2 = n.match(/(\d{1,2})[\/-](\d{4})/) || n.match(/(\d{4})[\/-](\d{1,2})/);
        if (m2) {
            let mes = parseInt(m2[1], 10), anio = parseInt(m2[2], 10);
            if (anio < 2000) { [mes, anio] = [anio, mes]; }
            if (mes >= 1 && mes <= 12 && anio >= 2000) return { mes, anio };
        }
        return null;
    }

    function buildTableName(mes, anio) {
        return 'Base de Datos Manifiestos ' + MES_NOMBRES[mes] + ' ' + anio;
    }

    function buildTableKey(mes, anio) {
        const abbrs = ['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        return abbrs[mes] + String(anio);
    }

    function buildTableLabel(mes, anio) {
        return MES_NOMBRES[mes] + ' ' + anio + ' — Datos mensuales';
    }

    function escHtml(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── UI Helpers ─────────────────────────────────────────────────────────────

    function setStatus(html, type) {
        const el = document.getElementById('mu-status');
        if (el) el.innerHTML = '<div class="alert alert-' + (type || 'info') + ' py-2 mb-0 small">' + html + '</div>';
    }

    function setProgress(done, total) {
        const bar = document.getElementById('mu-progress-bar');
        if (!bar) return;
        const pct = Math.round((done / total) * 100);
        bar.style.width = pct + '%';
        bar.textContent = done.toLocaleString() + ' / ' + total.toLocaleString() + ' (' + pct + '%)';
    }

    // ── Carga en lotes ──────────────────────────────────────────────────────────

    async function uploadInBatches(tableName, rows, onProgress) {
        const client = window.supabaseClient;
        const BATCH = 500;
        let done = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH);
            const { error } = await client.from(tableName).insert(chunk);
            if (error) throw error;
            done += chunk.length;
            if (onProgress) onProgress(done, rows.length);
        }
    }

    /** Elimina todos los registros de la tabla usando varias estrategias */
    async function deleteAllRows(tableName) {
        const client = window.supabaseClient;
        // Intento 1: por id (columna estándar en Supabase)
        const { error: e1 } = await client.from(tableName).delete().gte('id', 0);
        if (!e1) return;
        // Intento 2: por FECHA no nulo
        const { error: e2 } = await client.from(tableName).delete().not('FECHA', 'is', null);
        if (!e2) return;
        // Intento 3: por AEROLINEA no nulo
        const { error: e3 } = await client.from(tableName).delete().not('AEROLINEA', 'is', null);
        if (!e3) return;
        throw new Error('No se pudieron eliminar registros existentes: ' + (e3.message || e1.message));
    }

    // ── Proceso principal ───────────────────────────────────────────────────────

    window.manifiestoProcessFile = async function (file) {
        if (!file) return;

        const btnImport  = document.getElementById('mu-btn-import');
        const previewDiv = document.getElementById('mu-preview');
        const progWrap   = document.getElementById('mu-progress-wrap');
        const tableInfo  = document.getElementById('mu-table-info');

        if (previewDiv)  previewDiv.innerHTML = '';
        if (progWrap)    progWrap.classList.add('d-none');
        if (btnImport)   btnImport.disabled = true;
        if (tableInfo)   tableInfo.innerHTML = '';
        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Leyendo archivo Excel…');

        try {
            if (!window.XLSX) throw new Error('Librería XLSX no disponible. Recarga la página.');

            const buf = await file.arrayBuffer();
            const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

            // 1. Buscar la hoja correcta (object mode — detecta TODOS los registros)
            let sheetName = wb.SheetNames[0];
            let jsonRows  = null;

            for (const sn of wb.SheetNames) {
                const sh = wb.Sheets[sn];
                if (!sh) continue;
                const r = XLSX.utils.sheet_to_json(sh, { defval: null, raw: true });
                if (!r || r.length < 1) continue;
                const keys = Object.keys(r[0] || {}).map(k => normCol(k));
                if (keys.some(k => k.includes('aerolinea') || k.includes('total_pax') || k.includes('tipo_de_manifiesto'))) {
                    sheetName = sn; jsonRows = r; break;
                }
            }
            if (!jsonRows) {
                const sh = wb.Sheets[wb.SheetNames[0]];
                jsonRows  = sh ? XLSX.utils.sheet_to_json(sh, { defval: null, raw: true }) : [];
                sheetName = wb.SheetNames[0];
            }

            if (jsonRows.length === 0) {
                setStatus('No se encontraron filas de datos en el archivo.', 'danger'); return;
            }

            const headers = Object.keys(jsonRows[0]);

            // 2. Detectar mes y año — nombre de hoja → columna MES → columna FECHA
            let mesDato = null, anioDato = null;
            const fromSheet = getMesAnioFromSheet(sheetName);
            if (fromSheet) { mesDato = fromSheet.mes; anioDato = fromSheet.anio; }

            if (!mesDato || !anioDato) {
                const mesKey  = headers.find(k => normCol(k) === 'mes');
                if (mesKey && jsonRows[0]) {
                    const v = jsonRows[0][mesKey];
                    if (typeof v === 'number' && v >= 1 && v <= 12) mesDato = v;
                    else if (typeof v === 'string') {
                        const abbr = v.substring(0, 3).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        mesDato = MES_ABREV[abbr] || parseInt(v, 10) || null;
                    }
                }
            }
            if (!mesDato || !anioDato) {
                const fechaKey = headers.find(k => normCol(k) === 'fecha');
                if (fechaKey) {
                    // Buscar el primer valor no-nulo en FECHA
                    const raw = (jsonRows.find(r => r[fechaKey] != null) || {})[fechaKey];
                    const serial = typeof raw === 'number' ? raw : parseFloat(String(raw || ''));
                    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
                        const d = new Date((serial - 25569) * 86400000);
                        if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                        if (!anioDato) anioDato = d.getUTCFullYear();
                    } else {
                        const mY = String(raw || '').match(/(\d{4})/);
                        if (mY) { const y = parseInt(mY[1], 10); if (y >= 2000 && y <= 2100) anioDato = y; }
                    }
                }
            }

            if (!mesDato || !anioDato) {
                setStatus('No se pudo detectar el mes/año del archivo. Verifica que la columna FECHA tenga datos.', 'danger');
                return;
            }

            const mesStr     = MES_NOMBRES[mesDato];
            const targetTable = buildTableName(mesDato, anioDato);

            if (tableInfo) tableInfo.innerHTML =
                '<div class="alert alert-light border py-2 mt-3 mb-0 small">' +
                '<i class="fas fa-database me-1 text-primary"></i>Tabla destino: ' +
                '<strong>' + escHtml(targetTable) + '</strong></div>';

            // 3. Preview
            const visibleHeaders = headers.filter(h => !AUTOGEN_COLS.has(normCol(h)));
            const colHtml = visibleHeaders.slice(0, 10)
                .map(h => '<span class="badge bg-light text-dark border me-1 mb-1" style="font-size:.7rem">' + escHtml(h) + '</span>').join('')
                + (visibleHeaders.length > 10 ? '<span class="text-muted small">+' + (visibleHeaders.length - 10) + ' más…</span>' : '');

            if (previewDiv) {
                previewDiv.innerHTML =
                    '<div class="p-3 bg-light rounded border mt-3">' +
                    '<div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">' +
                    '<div><span class="fw-semibold">Hoja:</span><span class="badge bg-primary ms-1">' + escHtml(sheetName) + '</span></div>' +
                    '<div><span class="fw-semibold">' + jsonRows.length.toLocaleString() + '</span>' +
                    '<span class="text-muted small"> registros · </span><span class="fw-semibold">' + mesStr + ' ' + anioDato + '</span></div>' +
                    '</div><div class="mb-1 small text-muted">Columnas:</div><div>' + colHtml + '</div></div>';
            }

            setStatus('<i class="fas fa-file-excel text-success me-1"></i>Archivo listo: <strong>' +
                jsonRows.length.toLocaleString() + ' filas</strong> · <strong>' + mesStr + ' ' + anioDato +
                '</strong>. Haz clic en Importar para subir.');
            if (btnImport) btnImport.disabled = false;

            // 4. Importar
            if (btnImport) {
                btnImport.onclick = async () => {
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setProgress(0, jsonRows.length);
                    try {
                        const client = window.supabaseClient;
                        if (!client) throw new Error('Supabase no disponible. Inicia sesión primero.');

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Verificando tabla en Supabase…');
                        const { count: existingCount, error: probeErr } = await client
                            .from(targetTable).select('*', { count: 'exact', head: true });
                        if (probeErr) throw new Error(
                            'No se puede acceder a "' + targetTable + '". Verifica que exista en Supabase.\n' + probeErr.message);

                        if (existingCount > 0) {
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Eliminando ' +
                                existingCount.toLocaleString() + ' registros anteriores…');
                            await deleteAllRows(targetTable);
                        }

                        const dbRows = jsonRows.map(row => {
                            const clean = {};
                            for (const [k, v] of Object.entries(row)) {
                                if (k && !AUTOGEN_COLS.has(normCol(k)))
                                    clean[k] = (v === null || v === undefined) ? null : v;
                            }
                            return clean;
                        }).filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''));

                        if (dbRows.length === 0) {
                            setStatus('No hay filas con datos válidos.', 'warning');
                            btnImport.disabled = false; return;
                        }

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos…');
                        await uploadInBatches(targetTable, dbRows, (done, total) => {
                            setProgress(done, total);
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>' +
                                done.toLocaleString() + '</strong> / ' + total.toLocaleString() + ' registros');
                        });

                        setProgress(dbRows.length, dbRows.length);
                        setStatus('<i class="fas fa-check-circle text-success me-1"></i><strong>' +
                            dbRows.length.toLocaleString() + ' registros</strong> importados a <strong>' +
                            escHtml(targetTable) + '</strong>.', 'success');

                        if (typeof window.manifiestoRegisterTable === 'function') {
                            window.manifiestoRegisterTable(buildTableKey(mesDato, anioDato), targetTable, buildTableLabel(mesDato, anioDato));
                        }
                        setTimeout(function () {
                            const modalEl = document.getElementById('manifiestos-upload-modal');
                            if (modalEl && window.bootstrap) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }
                        }, 2500);

                    } catch (err) {
                        console.error('[ManifiestosUpload]', err);
                        setStatus('<i class="fas fa-times-circle me-1"></i>Error: ' + escHtml(err.message), 'danger');
                        btnImport.disabled = false;
                    }
                };
            }

        } catch (err) {
            console.error('[ManifiestosUpload]', err);
            setStatus('<i class="fas fa-times-circle me-1"></i>Error al leer el archivo: ' + escHtml(err.message), 'danger');
        }
    };

    // ── Sincronizar visibilidad del botón según rol ────────────────────────────

    function syncImportBtn() {
        const role      = sessionStorage.getItem('user_role') || 'viewer';
        const container = document.getElementById('mdb-admin-btns');
        if (container) container.style.cssText = UPLOAD_ROLES.includes(role)
            ? 'display:flex!important'
            : 'display:none!important';
    }

    window.manifiestoInitUploadBtn = syncImportBtn;

    // ── Manejo de archivo seleccionado ─────────────────────────────────────────

    function handleFileSelect(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setStatus('Formato no soportado. Sube un archivo .xlsx o .xls.', 'danger');
            return;
        }
        const label = document.getElementById('mu-file-label');
        if (label) label.textContent = file.name;
        const btnImport = document.getElementById('mu-btn-import');
        if (btnImport) btnImport.disabled = true;
        window.manifiestoProcessFile(file);
    }

    // ── Inicialización DOM ──────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        syncImportBtn();

        const zone = document.getElementById('mu-drop-zone');
        const inp  = document.getElementById('mu-file-input');

        if (zone) {
            zone.addEventListener('dragover',  function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', function ()  { zone.classList.remove('drag-over'); });
            zone.addEventListener('drop', function (e) {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
            });
            zone.addEventListener('click', function () { if (inp) inp.click(); });
        }

        if (inp) {
            inp.addEventListener('change', function () {
                if (inp.files[0]) handleFileSelect(inp.files[0]);
            });
        }

        // Resetear modal al cerrarlo
        const modalEl = document.getElementById('manifiestos-upload-modal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function () {
                const preview = document.getElementById('mu-preview');
                if (preview) preview.innerHTML = '';
                const status = document.getElementById('mu-status');
                if (status) status.innerHTML = '';
                const prog = document.getElementById('mu-progress-wrap');
                if (prog) prog.classList.add('d-none');
                const bar = document.getElementById('mu-progress-bar');
                if (bar) { bar.style.width = '0%'; bar.textContent = '0%'; }
                const label = document.getElementById('mu-file-label');
                if (label) label.textContent = 'Ningún archivo seleccionado';
                if (inp) inp.value = '';
                const btnImport = document.getElementById('mu-btn-import');
                if (btnImport) { btnImport.disabled = true; btnImport.onclick = null; }
                const tableInfo = document.getElementById('mu-table-info');
                if (tableInfo) tableInfo.innerHTML = '';
            });
        }

        // ── CARGO: inicialización del módulo de carga ──────────────────────────
        syncCargoImportBtn();
        wireCargoModal();
    });

    // Re-sync cuando la sesión carga (el rol puede llegar tarde)
    document.addEventListener('aifa-session-ready', function () {
        syncImportBtn();
        syncCargoImportBtn();
    });
    let _syncRetries = 0;
    const _syncInterval = setInterval(function () {
        const role = sessionStorage.getItem('user_role');
        if (role || _syncRetries++ > 20) {
            syncImportBtn();
            syncCargoImportBtn();
            clearInterval(_syncInterval);
        }
    }, 500);

    // ═══════════════════════════════════════════════════════════════════════════
    // MÓDULO CARGO — idéntico al de pasajeros pero con prefix mc- y tabla Carga
    // ═══════════════════════════════════════════════════════════════════════════

    function buildCargoTableName(mes, anio)  { return 'Base de Manifiestos Carga ' + MES_NOMBRES[mes] + ' ' + anio; }
    function buildCargoTableKey(mes, anio)   { const a = ['','ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return a[mes] + String(anio); }
    function buildCargoTableLabel(mes, anio) { return 'Manifiestos Carga — ' + MES_NOMBRES[mes] + ' ' + anio; }

    function setCargoStatus(html, type) {
        const el = document.getElementById('mc-status');
        if (el) el.innerHTML = '<div class="alert alert-' + (type || 'info') + ' py-2 mb-0 small">' + html + '</div>';
    }

    function setCargoProgress(done, total) {
        const bar = document.getElementById('mc-progress-bar');
        if (!bar) return;
        const pct = Math.round((done / total) * 100);
        bar.style.width = pct + '%';
        bar.textContent = done.toLocaleString() + ' / ' + total.toLocaleString() + ' (' + pct + '%)';
    }

    window.cargaProcessFile = async function (file) {
        if (!file) return;

        const btnImport  = document.getElementById('mc-btn-import');
        const previewDiv = document.getElementById('mc-preview');
        const progWrap   = document.getElementById('mc-progress-wrap');
        const tableInfo  = document.getElementById('mc-table-info');

        if (previewDiv)  previewDiv.innerHTML = '';
        if (progWrap)    progWrap.classList.add('d-none');
        if (btnImport)   btnImport.disabled = true;
        if (tableInfo)   tableInfo.innerHTML = '';
        setCargoStatus('<i class="fas fa-spinner fa-spin me-1"></i>Leyendo archivo Excel…');

        try {
            if (!window.XLSX) throw new Error('Librería XLSX no disponible. Recarga la página.');

            const buf = await file.arrayBuffer();
            const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

            // 1. Buscar hoja con datos de carga (object mode)
            let sheetName = wb.SheetNames[0];
            let jsonRows  = null;

            for (const sn of wb.SheetNames) {
                const sh = wb.Sheets[sn];
                if (!sh) continue;
                const r = XLSX.utils.sheet_to_json(sh, { defval: null, raw: true });
                if (!r || r.length < 1) continue;
                const keys = Object.keys(r[0] || {}).map(k => normCol(k));
                if (keys.some(k => k.includes('aerolinea') || k.includes('kgs') || k.includes('tipo_de_manifiesto') || k.includes('carga'))) {
                    sheetName = sn; jsonRows = r; break;
                }
            }
            if (!jsonRows) {
                const sh = wb.Sheets[wb.SheetNames[0]];
                jsonRows  = sh ? XLSX.utils.sheet_to_json(sh, { defval: null, raw: true }) : [];
                sheetName = wb.SheetNames[0];
            }

            if (jsonRows.length === 0) {
                setCargoStatus('No se encontraron filas de datos en el archivo.', 'danger'); return;
            }

            const headers = Object.keys(jsonRows[0]);

            // 2. Detectar mes/año
            let mesDato = null, anioDato = null;
            const fromSheet = getMesAnioFromSheet(sheetName);
            if (fromSheet) { mesDato = fromSheet.mes; anioDato = fromSheet.anio; }

            if (!mesDato || !anioDato) {
                const mesKey = headers.find(k => normCol(k) === 'mes');
                if (mesKey && jsonRows[0]) {
                    const v = jsonRows[0][mesKey];
                    if (typeof v === 'number' && v >= 1 && v <= 12) mesDato = v;
                    else if (typeof v === 'string') {
                        const abbr = v.substring(0, 3).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        mesDato = MES_ABREV[abbr] || parseInt(v, 10) || null;
                    }
                }
            }
            if (!mesDato || !anioDato) {
                const fechaKey = headers.find(k => normCol(k) === 'fecha');
                if (fechaKey) {
                    const raw    = (jsonRows.find(r => r[fechaKey] != null) || {})[fechaKey];
                    const serial = typeof raw === 'number' ? raw : parseFloat(String(raw || ''));
                    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
                        const d = new Date((serial - 25569) * 86400000);
                        if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                        if (!anioDato) anioDato = d.getUTCFullYear();
                    } else {
                        const mY = String(raw || '').match(/(\d{4})/);
                        if (mY) { const y = parseInt(mY[1], 10); if (y >= 2000 && y <= 2100) anioDato = y; }
                    }
                }
            }

            if (!mesDato || !anioDato) {
                setCargoStatus('No se pudo detectar el mes/año. Verifica que la columna FECHA tenga datos.', 'danger');
                return;
            }

            const mesStr      = MES_NOMBRES[mesDato];
            const targetTable = buildCargoTableName(mesDato, anioDato);

            if (tableInfo) tableInfo.innerHTML =
                '<div class="alert alert-light border py-2 mt-3 mb-0 small">' +
                '<i class="fas fa-database me-1" style="color:#6f42c1"></i>Tabla destino: ' +
                '<strong>' + escHtml(targetTable) + '</strong></div>';

            // 3. Preview
            const visibleHeaders = headers.filter(h => !AUTOGEN_COLS.has(normCol(h)));
            const colHtml = visibleHeaders.slice(0, 10)
                .map(h => '<span class="badge bg-light text-dark border me-1 mb-1" style="font-size:.7rem">' + escHtml(String(h)) + '</span>').join('')
                + (visibleHeaders.length > 10 ? '<span class="text-muted small">+' + (visibleHeaders.length - 10) + ' más…</span>' : '');

            if (previewDiv) {
                previewDiv.innerHTML =
                    '<div class="p-3 bg-light rounded border mt-3">' +
                    '<div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">' +
                    '<div><span class="fw-semibold">Hoja:</span><span class="badge ms-1" style="background:#6f42c1">' + escHtml(sheetName) + '</span></div>' +
                    '<div><span class="fw-semibold">' + jsonRows.length.toLocaleString() + '</span>' +
                    '<span class="text-muted small"> registros · </span><span class="fw-semibold">' + mesStr + ' ' + anioDato + '</span></div>' +
                    '</div><div class="mb-1 small text-muted">Columnas:</div><div>' + colHtml + '</div></div>';
            }

            setCargoStatus('<i class="fas fa-file-excel me-1" style="color:#6f42c1"></i>Archivo listo: <strong>' +
                jsonRows.length.toLocaleString() + ' filas</strong> · <strong>' + mesStr + ' ' + anioDato +
                '</strong>. Haz clic en Importar para subir.');
            if (btnImport) btnImport.disabled = false;

            // 4. Importar
            if (btnImport) {
                btnImport.onclick = async () => {
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setCargoProgress(0, jsonRows.length);
                    try {
                        const client = window.supabaseClient;
                        if (!client) throw new Error('Supabase no disponible. Inicia sesión primero.');

                        setCargoStatus('<i class="fas fa-spinner fa-spin me-1"></i>Verificando tabla en Supabase…');
                        const { count: existingCount, error: probeErr } = await client
                            .from(targetTable).select('*', { count: 'exact', head: true });
                        if (probeErr) throw new Error(
                            'No se puede acceder a "' + targetTable + '". Verifica que exista en Supabase.\n' + probeErr.message);

                        if (existingCount > 0) {
                            setCargoStatus('<i class="fas fa-spinner fa-spin me-1"></i>Eliminando ' +
                                existingCount.toLocaleString() + ' registros anteriores…');
                            await deleteAllRows(targetTable);
                        }

                        const dbRows = jsonRows.map(row => {
                            const clean = {};
                            for (const [k, v] of Object.entries(row)) {
                                if (k && !AUTOGEN_COLS.has(normCol(k)))
                                    clean[k] = (v === null || v === undefined) ? null : v;
                            }
                            return clean;
                        }).filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''));

                        if (dbRows.length === 0) {
                            setCargoStatus('No hay filas con datos válidos.', 'warning');
                            btnImport.disabled = false; return;
                        }

                        setCargoStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos…');
                        await uploadInBatches(targetTable, dbRows, (done, total) => {
                            setCargoProgress(done, total);
                            setCargoStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>' +
                                done.toLocaleString() + '</strong> / ' + total.toLocaleString() + ' registros');
                        });

                        setCargoProgress(dbRows.length, dbRows.length);
                        setCargoStatus('<i class="fas fa-check-circle text-success me-1"></i><strong>' +
                            dbRows.length.toLocaleString() + ' registros</strong> importados a <strong>' +
                            escHtml(targetTable) + '</strong>.', 'success');

                        if (typeof window.cargaRegisterTable === 'function') {
                            window.cargaRegisterTable(buildCargoTableKey(mesDato, anioDato), targetTable, buildCargoTableLabel(mesDato, anioDato));
                        }
                        setTimeout(function () {
                            const modalEl = document.getElementById('carga-upload-modal');
                            if (modalEl && window.bootstrap) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }
                        }, 2500);

                    } catch (err) {
                        console.error('[CargaUpload]', err);
                        setCargoStatus('<i class="fas fa-times-circle me-1"></i>Error: ' + escHtml(err.message), 'danger');
                        btnImport.disabled = false;
                    }
                };
            }

        } catch (err) {
            console.error('[CargaUpload]', err);
            setCargoStatus('<i class="fas fa-times-circle me-1"></i>Error al leer el archivo: ' + escHtml(err.message), 'danger');
        }
    };

        try {
            if (!window.XLSX) throw new Error('Librería XLSX no disponible. Recarga la página.');

            const buf = await file.arrayBuffer();
            const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

            // 1. Buscar hoja con datos de carga
            let sheetName = wb.SheetNames[0];
            let rows = null;

            for (const sn of wb.SheetNames) {
                const sh = wb.Sheets[sn];
                if (!sh) continue;
                const r = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null });
                if (!r || r.length < 2) continue;
                const header = (r[0] || []).map(h => normCol(String(h || '')));
                if (header.some(h => h.includes('aerolinea') || h.includes('kgs') || h.includes('tipo_de_manifiesto') || h.includes('carga'))) {
                    sheetName = sn; rows = r; break;
                }
            }
            if (!rows) {
                const sh = wb.Sheets[wb.SheetNames[0]];
                rows = sh ? XLSX.utils.sheet_to_json(sh, { header: 1, defval: null }) : [];
                sheetName = wb.SheetNames[0];
            }

            const headers  = rows[0] || [];
            const dataRows = rows.slice(1).filter(r => Array.isArray(r) && r.some(v => v !== null && v !== undefined && v !== ''));

            if (dataRows.length === 0) {
                setCargoStatus('No se encontraron filas de datos en el archivo.', 'danger');
                return;
            }

            // 2. Detectar mes/año — prioridad: nombre de hoja → columna FECHA
            let mesDato = null, anioDato = null;
            const fromSheet = getMesAnioFromSheet(sheetName);
            if (fromSheet) { mesDato = fromSheet.mes; anioDato = fromSheet.anio; }

            if (!mesDato || !anioDato) {
                // Columna MES explícita
                const mesIdx = headers.findIndex(h => normCol(String(h || '')) === 'mes');
                if (mesIdx >= 0 && dataRows[0]) {
                    const v = dataRows[0][mesIdx];
                    if (typeof v === 'number' && v >= 1 && v <= 12) mesDato = v;
                    else if (typeof v === 'string') {
                        const abbr = v.substring(0, 3).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        mesDato = MES_ABREV[abbr] || parseInt(v, 10) || null;
                    }
                }
            }

            // Columna FECHA (maneja serial Excel y cadena ISO)
            if (!mesDato || !anioDato) {
                const fIdx = headers.findIndex(h => normCol(String(h || '')) === 'fecha');
                if (fIdx >= 0 && dataRows[0]) {
                    const raw    = dataRows[0][fIdx];
                    const serial = typeof raw === 'number' ? raw : parseFloat(raw);
                    if (!isNaN(serial) && serial > 40000 && serial < 60000) {
                        const d = new Date((serial - 25569) * 86400000);
                        if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                        if (!anioDato) anioDato = d.getUTCFullYear();
                    } else {
                        const vs = String(raw || '');
                        const mY = vs.match(/(\d{4})/);
                        if (mY) { const y = parseInt(mY[1], 10); if (y >= 2000 && y <= 2100) anioDato = y; }
                    }
                }
            }

    function syncCargoImportBtn() {
        const role      = sessionStorage.getItem('user_role') || 'viewer';
        const container = document.getElementById('mcg-admin-btns');
        if (container) container.style.cssText = UPLOAD_ROLES.includes(role)
            ? 'display:flex!important'
            : 'display:none!important';
    }

    function handleCargoFileSelect(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setCargoStatus('Formato no soportado. Sube un archivo .xlsx o .xls.', 'danger');
            return;
        }
        const label = document.getElementById('mc-file-label');
        if (label) label.textContent = file.name;
        const btnImport = document.getElementById('mc-btn-import');
        if (btnImport) btnImport.disabled = true;
        window.cargaProcessFile(file);
    }

    function wireCargoModal() {
        const zone = document.getElementById('mc-drop-zone');
        const inp  = document.getElementById('mc-file-input');

        if (zone) {
            zone.addEventListener('dragover',  function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', function ()  { zone.classList.remove('drag-over'); });
            zone.addEventListener('drop', function (e) {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) handleCargoFileSelect(file);
            });
            zone.addEventListener('click', function () { if (inp) inp.click(); });
        }

        if (inp) {
            inp.addEventListener('change', function () {
                if (inp.files[0]) handleCargoFileSelect(inp.files[0]);
            });
        }

        const modalEl = document.getElementById('carga-upload-modal');
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', function () {
                const preview = document.getElementById('mc-preview');
                if (preview) preview.innerHTML = '';
                const status = document.getElementById('mc-status');
                if (status) status.innerHTML = '';
                const prog = document.getElementById('mc-progress-wrap');
                if (prog) prog.classList.add('d-none');
                const bar = document.getElementById('mc-progress-bar');
                if (bar) { bar.style.width = '0%'; bar.textContent = '0%'; }
                const label = document.getElementById('mc-file-label');
                if (label) label.textContent = 'Ningún archivo seleccionado';
                if (inp) inp.value = '';
                const btnImport = document.getElementById('mc-btn-import');
                if (btnImport) { btnImport.disabled = true; btnImport.onclick = null; }
                const tableInfo = document.getElementById('mc-table-info');
                if (tableInfo) tableInfo.innerHTML = '';
            });
        }
    }

})();
