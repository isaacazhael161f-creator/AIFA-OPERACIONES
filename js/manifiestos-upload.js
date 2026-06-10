// ─── MÓDULO: IMPORTACIÓN DE MANIFIESTOS DESDE XLSX ──────────────────────────
// Solo accesible para roles: admin, superadmin, editor
// Tabla fija: TARGET_TABLE — detecta mes/año desde FECHA,
// borra solo las filas de ese mes y luego inserta las nuevas.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // Tabla única donde se acumulan todos los meses
    const TARGET_TABLE = 'Base de Datos Manifiestos Febrero 2026';

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

    /**
     * Borra solo las filas del mes/año detectado.
     * Intenta en orden: columna MES (nombre español), columna MES (número), rango FECHA ISO.
     */
    async function deleteMonthRows(mesNum, anio) {
        const client = window.supabaseClient;
        const mesNombre = MES_NOMBRES[mesNum]; // 'Abril'
        const isoPrefix = anio + '-' + String(mesNum).padStart(2, '0'); // '2026-04'

        // 1. MES = nombre en español (ej. 'Abril')
        const { error: e1 } = await client
            .from(TARGET_TABLE).delete().eq('MES', mesNombre);
        if (!e1) return;

        // 2. MES = número
        const { error: e2 } = await client
            .from(TARGET_TABLE).delete().eq('MES', mesNum);
        if (!e2) return;

        // 3. FECHA empieza con 'YYYY-MM' (formato ISO)
        const { error: e3 } = await client
            .from(TARGET_TABLE).delete().like('FECHA', isoPrefix + '%');
        if (!e3) return;

        // Si ninguno eliminó filas (probablemente primer mes), continuar sin error
        console.warn('[ManifiestosUpload] No se encontraron filas previas para borrar del mes', mesNombre, anio);
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
                // Desde columna FECHA — maneja tanto fechas ISO como seriales Excel
                if (!mesDato || !anioDato) {
                    const fIdx = headers.findIndex(h => normCol(String(h || '')) === 'fecha');
                    if (fIdx >= 0 && dataRows[0]) {
                        const raw = dataRows[0][fIdx];
                        const serial = typeof raw === 'number' ? raw : parseFloat(raw);
                        if (!isNaN(serial) && serial > 40000 && serial < 60000) {
                            // Serial de Excel → convertir a fecha real
                            const d = new Date((serial - 25569) * 86400000);
                            if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                            if (!anioDato) anioDato = d.getUTCFullYear();
                        } else {
                            // Cadena de fecha tipo "2026-04-01" o "01/04/2026"
                            const vs = String(raw || '');
                            const mY = vs.match(/(\d{4})/);
                            if (mY) {
                                const y = parseInt(mY[1], 10);
                                if (y >= 2000 && y <= 2100) anioDato = y;
                            }
                        }
                    }
                }
            }

            const mesStr  = (mesDato && mesDato >= 1 && mesDato <= 12) ? MES_NOMBRES[mesDato] : '?';
            const anioStr = anioDato || '?';

            // 3. Preview de columnas
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

            if (!mesDato || !anioDato) {
                setStatus('<i class="fas fa-exclamation-triangle me-1"></i>No se pudo detectar el mes/año desde la columna FECHA. Verifica que el archivo sea correcto.', 'warning');
                return;
            }

            setStatus('<i class="fas fa-file-excel text-success me-1"></i>Archivo listo: <strong>' +
                dataRows.length.toLocaleString() + ' filas</strong> · <strong>' + mesStr + ' ' + anioStr +
                '</strong>. Confirma para importar.');
            if (btnImport) btnImport.disabled = false;

            // 5. Callback del botón Importar
            if (btnImport) {
                btnImport.onclick = async () => {
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setProgress(0, dataRows.length);

                    try {
                        const client = window.supabaseClient;
                        if (!client) throw new Error('Supabase no disponible. Inicia sesión primero.');

                        // Borrar filas del mismo mes (por si se re-sube)
                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Limpiando registros anteriores de <strong>' + mesStr + ' ' + anioStr + '</strong>…');
                        await deleteMonthRows(mesDato, anioDato);

                        // Construir filas
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

                        // Añadir columnas nuevas que no existan aún en la tabla
                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Verificando columnas en la tabla…');
                        const colNames = headerMap.map(({ h }) => h);
                        const { data: addedCols, error: colErr } = await client.rpc(
                            'add_missing_columns',
                            { p_table: TARGET_TABLE, p_cols: colNames }
                        );
                        if (colErr) {
                            // No abortar — si la función no existe o falla,
                            // continuar e intentar insertar igualmente.
                            console.warn('[ManifiestosUpload] No se pudieron añadir columnas:', colErr.message);
                        } else if (addedCols && addedCols.length > 0) {
                            setStatus(
                                '<i class="fas fa-plus-circle text-success me-1"></i>' +
                                'Columnas nuevas añadidas a la tabla: <strong>' +
                                addedCols.map(escHtml).join(', ') + '</strong>. Subiendo datos…'
                            );
                            await new Promise(r => setTimeout(r, 800)); // breve pausa para que se lea
                        }

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos a Supabase…');
                        await uploadInBatches(TARGET_TABLE, dbRows, (done, total) => {
                            setProgress(done, total);
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>' +
                                done.toLocaleString() + '</strong> / ' + total.toLocaleString() + ' registros');
                        });

                        setProgress(dbRows.length, dbRows.length);
                        setStatus(
                            '<i class="fas fa-check-circle text-success me-1"></i><strong>' +
                            dbRows.length.toLocaleString() + ' registros de ' + mesStr + ' ' + anioStr +
                            '</strong> importados correctamente.',
                            'success'
                        );

                        // Recargar datos del módulo de manifiestos
                        if (typeof window.manifiestoReload === 'function') window.manifiestoReload();

                        // Cerrar modal tras 2.5 s
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
                ['mu-preview', 'mu-status'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.innerHTML = '';
                });
                const prog = document.getElementById('mu-progress-wrap');
                if (prog) prog.classList.add('d-none');
                const bar = document.getElementById('mu-progress-bar');
                if (bar) { bar.style.width = '0%'; bar.textContent = '0%'; }
                const label = document.getElementById('mu-file-label');
                if (label) label.textContent = 'Ningún archivo seleccionado';
                if (inp) inp.value = '';
                const btnImport = document.getElementById('mu-btn-import');
                if (btnImport) { btnImport.disabled = true; btnImport.onclick = null; }
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
