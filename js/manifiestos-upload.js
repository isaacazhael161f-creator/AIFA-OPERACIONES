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

    /** Extrae mes y año del nombre de la hoja — soporta "ABR 2026", "ABRIL 2026", "04/2026" */
    function getMesAnioFromSheet(name) {
        const n = String(name || '').trim();
        const m1 = n.match(/([A-Za-z\u00e0-\u00ff]+)\s+(\d{4})/i);
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

        if (previewDiv)  previewDiv.innerHTML = '';
        if (progWrap)    progWrap.classList.add('d-none');
        if (btnImport)   btnImport.disabled = true;
        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Leyendo archivo Excel…');

        try {
            if (!window.XLSX) throw new Error('Librería XLSX no disponible. Recarga la página.');

            const buf = await file.arrayBuffer();
            const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

            // 1. Primera hoja con datos
            let sheetName = wb.SheetNames[0];
            let rows = null;

            // Buscar hoja que tenga columnas de manifiestos
            for (const sn of wb.SheetNames) {
                const sh = wb.Sheets[sn];
                if (!sh) continue;
                const r = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null });
                if (!r || r.length < 2) continue;
                const header = (r[0] || []).map(h => normCol(String(h || '')));
                // Busca columnas clave de manifiestos
                if (header.some(h => h.includes('aerolinea') || h.includes('total_pax') || h.includes('tipo_de_manifiesto'))) {
                    sheetName = sn;
                    rows = r;
                    break;
                }
            }
            if (!rows) {
                // Fallback a primera hoja
                const sh = wb.Sheets[wb.SheetNames[0]];
                rows = sh ? XLSX.utils.sheet_to_json(sh, { header: 1, defval: null }) : [];
                sheetName = wb.SheetNames[0];
            }

            const headers  = rows[0] || [];
            const dataRows = rows.slice(1).filter(r => Array.isArray(r) && r.some(v => v !== null && v !== undefined && v !== ''));

            if (dataRows.length === 0) {
                setStatus('No se encontraron filas de datos en el archivo.', 'danger');
                return;
            }

            // 2. Detectar mes y año
            let mesDato = null, anioDato = null;
            const fromSheet = getMesAnioFromSheet(sheetName);
            if (fromSheet) { mesDato = fromSheet.mes; anioDato = fromSheet.anio; }

            if (!mesDato || !anioDato) {
                // Desde columna MES
                const mesIdx = headers.findIndex(h => normCol(String(h || '')) === 'mes');
                if (mesIdx >= 0 && dataRows[0]) {
                    const v = dataRows[0][mesIdx];
                    if (typeof v === 'number' && v >= 1 && v <= 12) mesDato = v;
                    else if (typeof v === 'string') {
                        const abbr = v.substring(0, 3).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        mesDato = MES_ABREV[abbr] || parseInt(v, 10) || null;
                    }
                }
                // Desde columna FECHA
                if (!anioDato) {
                    const fIdx = headers.findIndex(h => normCol(String(h || '')) === 'fecha');
                    if (fIdx >= 0 && dataRows[0]) {
                        const v = String(dataRows[0][fIdx] || '');
                        const m = v.match(/(\d{4})/);
                        if (m) anioDato = parseInt(m[1], 10);
                    }
                }
            }

            const mesStr  = (mesDato && mesDato >= 1 && mesDato <= 12) ? MES_NOMBRES[mesDato] : '?';
            const anioStr = anioDato || '?';
            const suggestedName = (mesDato && anioDato) ? buildTableName(mesDato, anioDato) : '';

            // 3. Sugerir nombre de tabla (solo si el campo está vacío)
            const tableInput = document.getElementById('mu-table-name');
            if (tableInput && suggestedName && !tableInput.value.trim()) {
                tableInput.value = suggestedName;
            }

            // 4. Preview de columnas
            const visibleHeaders = headers.filter(h => {
                const k = normCol(String(h || ''));
                return k && !AUTOGEN_COLS.has(k);
            });
            const colHtml = visibleHeaders.slice(0, 10)
                .map(h => '<span class="badge bg-light text-dark border me-1 mb-1" style="font-size:.7rem">' + escHtml(h) + '</span>')
                .join('') +
                (visibleHeaders.length > 10 ? '<span class="text-muted small">+' + (visibleHeaders.length - 10) + ' más…</span>' : '');

            if (previewDiv) {
                previewDiv.innerHTML = '\
                    <div class="p-3 bg-light rounded border mt-3">\
                        <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">\
                            <div>\
                                <span class="fw-semibold">Hoja detectada:</span>\
                                <span class="badge bg-primary ms-1">' + escHtml(sheetName) + '</span>\
                            </div>\
                            <div>\
                                <span class="fw-semibold">' + dataRows.length.toLocaleString() + '</span>\
                                <span class="text-muted small"> registros · </span>\
                                <span class="fw-semibold">' + mesStr + ' ' + anioStr + '</span>\
                            </div>\
                        </div>\
                        <div class="mb-1 small text-muted">Columnas detectadas:</div>\
                        <div class="mb-0">' + colHtml + '</div>\
                    </div>';
            }

            setStatus('<i class="fas fa-file-excel text-success me-1"></i>Archivo listo: <strong>' +
                dataRows.length.toLocaleString() + ' filas</strong> · <strong>' + mesStr + ' ' + anioStr +
                '</strong>. Verifica el nombre de tabla y confirma para importar.');
            if (btnImport) btnImport.disabled = false;

            // 5. Preparar callback del botón Importar
            if (btnImport) {
                btnImport.onclick = async () => {
                    const targetTable = (tableInput ? tableInput.value.trim() : '') || suggestedName;
                    if (!targetTable) {
                        setStatus('Por favor especifica el nombre de la tabla de Supabase.', 'warning');
                        return;
                    }
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setProgress(0, dataRows.length);

                    try {
                        const client = window.supabaseClient;
                        if (!client) throw new Error('Supabase no disponible. Inicia sesión primero.');

                        // Verificar que la tabla exista
                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Verificando tabla en Supabase…');
                        const { count: existingCount, error: probeErr } = await client
                            .from(targetTable).select('*', { count: 'exact', head: true });
                        if (probeErr) throw new Error(
                            'No se puede acceder a la tabla "' + targetTable + '". ' +
                            'Asegúrate de que exista en Supabase y tenga los permisos correctos.\n' +
                            probeErr.message
                        );

                        // Eliminar registros previos si los hay
                        if (existingCount > 0) {
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Eliminando ' +
                                existingCount.toLocaleString() + ' registros anteriores…');
                            await deleteAllRows(targetTable);
                        }

                        // Construir filas a insertar (excluir columnas autogeneradas)
                        const headerMap = headers
                            .map((h, i) => ({ h: String(h || '').trim(), i }))
                            .filter(({ h }) => h && !AUTOGEN_COLS.has(normCol(h)));

                        const dbRows = dataRows
                            .map(raw => {
                                const obj = {};
                                headerMap.forEach(({ h, i }) => {
                                    const v = raw[i];
                                    obj[h] = (v === null || v === undefined) ? null : v;
                                });
                                return obj;
                            })
                            .filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''));

                        if (dbRows.length === 0) {
                            setStatus('No hay filas con datos válidos para insertar.', 'warning');
                            btnImport.disabled = false;
                            return;
                        }

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos a Supabase…');
                        await uploadInBatches(targetTable, dbRows, (done, total) => {
                            setProgress(done, total);
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>' +
                                done.toLocaleString() + '</strong> / ' + total.toLocaleString() + ' registros');
                        });

                        setProgress(dbRows.length, dbRows.length);
                        setStatus(
                            '<i class="fas fa-check-circle text-success me-1"></i><strong>' +
                            dbRows.length.toLocaleString() + ' registros</strong> importados correctamente a <strong>' +
                            escHtml(targetTable) + '</strong>.',
                            'success'
                        );

                        // Registrar el nuevo período en el módulo de manifiestos
                        if (typeof window.manifiestoRegisterTable === 'function' && mesDato && anioDato) {
                            const key   = buildTableKey(mesDato, anioDato);
                            const label = buildTableLabel(mesDato, anioDato);
                            window.manifiestoRegisterTable(key, targetTable, label);
                        }

                        // Cerrar modal automáticamente después de 2.5 s
                        setTimeout(function () {
                            const modalEl = document.getElementById('manifiestos-upload-modal');
                            if (modalEl && window.bootstrap) {
                                const m = bootstrap.Modal.getInstance(modalEl);
                                if (m) m.hide();
                            }
                        }, 2500);

                    } catch (err) {
                        console.error('[ManifiestosUpload]', err);
                        setStatus('<i class="fas fa-times-circle me-1"></i>Error al importar: ' + escHtml(err.message), 'danger');
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
        // Limpiar tabla sugerida al cambiar archivo
        const tableInput = document.getElementById('mu-table-name');
        if (tableInput) tableInput.value = '';
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
                const tableInput = document.getElementById('mu-table-name');
                if (tableInput) tableInput.value = '';
            });
        }
    });

    // Re-sync cuando la sesión carga (el rol puede llegar tarde)
    document.addEventListener('aifa-session-ready', syncImportBtn);
    let _syncRetries = 0;
    const _syncInterval = setInterval(function () {
        const role = sessionStorage.getItem('user_role');
        if (role || _syncRetries++ > 20) { syncImportBtn(); clearInterval(_syncInterval); }
    }, 500);

})();
