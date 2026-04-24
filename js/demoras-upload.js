// ─── MÓDULO: IMPORTACIÓN DE DEMORAS DESDE XLSX ──────────────────────────────
// Solo accesible para roles: admin, superadmin, editor
// Detecta automáticamente la hoja de datos, mapea columnas y sube en lotes.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    const UPLOAD_ROLES  = ['admin', 'superadmin', 'editor'];
    const OPS_CACHE_PFX = 'aifa_ops_cache_';

    // Indicadores de columnas que siempre existen en la hoja de datos
    const SHEET_SIGNATURE = ['aterrizaje_despegue', 'no_vuelo', 'hora_programada'];

    // Columnas que contienen seriales de fecha Excel
    const DATE_COL_NORMS = new Set(['aterrizaje_despegue', 'hora_programada', 'hora_actual']);

    // ── Utilidades ────────────────────────────────────────────────────────────

    /** Normaliza un nombre de columna para comparación fuzzy */
    function normCol(s) {
        return String(s == null ? '' : s)
            .trim()
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /** Convierte serial de fecha Excel a ISO 8601 */
    function excelSerialToISO(serial) {
        if (typeof serial !== 'number' || isNaN(serial) || serial <= 0) return null;
        // Excel epoch: 1900-01-00 + bug de 1900-02-29 → restar 25569 para llegar a Unix epoch
        return new Date((serial - 25569) * 86400000).toISOString();
    }

    /** Encuentra la hoja con datos de operaciones */
    function findDataSheet(wb) {
        for (const name of wb.SheetNames) {
            const sh = wb.Sheets[name];
            if (!sh) continue;
            const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: null });
            if (!rows || rows.length < 2) continue;
            const header = rows[0];
            if (!Array.isArray(header)) continue;
            const normHeaders = header.map(normCol);
            const matches = SHEET_SIGNATURE.filter(sig => normHeaders.includes(sig));
            if (matches.length >= 2) return { sheetName: name, rows };
        }
        return null;
    }

    /** Obtiene nombres de columnas reales de Supabase (1 fila de muestra) */
    async function getDbColNames() {
        try {
            const client = window.supabaseClient;
            if (!client) return null;
            const { data } = await client.from('Demoras').select('*').limit(1);
            if (data && data.length > 0) return Object.keys(data[0]);
        } catch (_) {}
        return null;
    }

    /**
     * Construye el mapa: índice Excel → { dbCol, isDate }
     * Primero intenta emparejar contra columnas reales de Supabase.
     * Si no hay datos en la tabla, usa nombres normalizados directamente.
     */
    async function buildMapping(excelHeaders, dbColNames) {
        const dbNormToReal = {};
        if (dbColNames) {
            dbColNames.forEach(c => { dbNormToReal[normCol(c)] = c; });
        }

        return excelHeaders.map((h, idx) => {
            const norm  = normCol(h);
            // Busca coincidencia exacta normalizada en columnas DB
            const dbCol = dbNormToReal[norm] || norm;
            return { idx, excelHeader: h, dbCol, isDate: DATE_COL_NORMS.has(norm) };
        });
    }

    /** Transforma una fila raw (array) en objeto DB usando el mapping */
    function transformRow(rawRow, mapping) {
        const out = {};
        mapping.forEach(({ idx, dbCol, isDate }) => {
            const val = rawRow[idx];
            if (val === null || val === undefined || val === '') {
                out[dbCol] = null;
            } else if (isDate && typeof val === 'number') {
                out[dbCol] = excelSerialToISO(val);
            } else {
                out[dbCol] = val;
            }
        });
        return out;
    }

    /** Sube filas en lotes de 500 con callback de progreso */
    async function uploadInBatches(rows, onProgress) {
        const client = window.supabaseClient;
        const BATCH = 500;
        let done = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH);
            const { error } = await client.from('Demoras').insert(chunk);
            if (error) throw error;
            done += chunk.length;
            if (onProgress) onProgress(done, rows.length);
        }
    }

    // ── UI Helpers ────────────────────────────────────────────────────────────

    function setStatus(html, type = 'info') {
        const el = document.getElementById('du-status');
        if (el) el.innerHTML = `<div class="alert alert-${type} py-2 mb-0 small">${html}</div>`;
    }

    function setProgress(done, total) {
        const bar = document.getElementById('du-progress-bar');
        if (!bar) return;
        const pct = Math.round((done / total) * 100);
        bar.style.width = pct + '%';
        bar.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
    }

    // ── Proceso principal ──────────────────────────────────────────────────────

    window.demorasProcessFile = async function (file) {
        if (!file) return;

        const btnImport  = document.getElementById('du-btn-import');
        const previewDiv = document.getElementById('du-preview');
        const progWrap   = document.getElementById('du-progress-wrap');
        const MES_NOMBRES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                             'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        // Reset UI
        if (previewDiv)  previewDiv.innerHTML = '';
        if (progWrap)    progWrap.classList.add('d-none');
        if (btnImport)   btnImport.disabled = true;
        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Leyendo archivo Excel…');

        try {
            const buf = await file.arrayBuffer();
            const wb  = XLSX.read(buf, { type: 'array', cellDates: false });

            // 1. Detectar hoja
            const found = findDataSheet(wb);
            if (!found) {
                setStatus('No se encontró una hoja con datos de operaciones. Verifica que el archivo sea el correcto.', 'danger');
                return;
            }
            const { sheetName, rows } = found;
            const headers  = rows[0];
            const dataRows = rows.slice(1).filter(r => Array.isArray(r) && r.some(v => v !== null && v !== undefined));

            // 2. Detectar MES y ANIO desde datos
            const mesIdx  = headers.findIndex(h => normCol(h) === 'mes');
            const anioIdx = headers.findIndex(h => normCol(h) === 'anio');
            const sampleRow = dataRows[0] || [];
            const mesDato   = mesIdx  >= 0 ? Number(sampleRow[mesIdx])  : null;
            const anioDato  = anioIdx >= 0 ? Number(sampleRow[anioIdx]) : null;
            const mesStr    = (mesDato  && mesDato >= 1 && mesDato <= 12) ? MES_NOMBRES[mesDato] : '?';
            const anioStr   = anioDato || '?';

            // 3. Construir mapping de columnas
            const dbColNames = await getDbColNames();
            const mapping    = await buildMapping(headers, dbColNames);

            // 4. Contar registros existentes
            const client = window.supabaseClient;
            let existingCount = 0;
            if (mesDato && anioDato && client) {
                const { count } = await client
                    .from('Demoras')
                    .select('*', { count: 'exact', head: true })
                    .eq('MES', mesDato)
                    .eq('ANIO', anioDato);
                existingCount = count || 0;
            }

            // 5. Mostrar preview
            const colPreviewHtml = mapping.slice(0, 8)
                .map(m => `<span class="badge bg-light text-dark border me-1 mb-1" style="font-size:.7rem">${m.excelHeader} → ${m.dbCol}${m.isDate ? ' <i class="fas fa-clock fa-xs text-info"></i>' : ''}</span>`)
                .join('') + (mapping.length > 8 ? `<span class="text-muted small">+${mapping.length - 8} más…</span>` : '');

            const existingWarning = existingCount > 0
                ? `<div class="alert alert-warning py-2 mt-2 mb-0 small"><i class="fas fa-exclamation-triangle me-1"></i>Ya existen <strong>${existingCount.toLocaleString()}</strong> registros para <strong>${mesStr} ${anioStr}</strong>. Se eliminarán y reemplazarán.</div>`
                : `<div class="alert alert-success py-2 mt-2 mb-0 small"><i class="fas fa-check-circle me-1"></i>No hay datos previos para ${mesStr} ${anioStr}. Se insertarán directamente.</div>`;

            if (previewDiv) {
                previewDiv.innerHTML = `
                    <div class="p-3 bg-light rounded border mt-3">
                        <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                            <div>
                                <span class="fw-semibold">Hoja detectada:</span>
                                <span class="badge bg-primary ms-1">${sheetName}</span>
                            </div>
                            <div>
                                <span class="fw-semibold">${dataRows.length.toLocaleString()}</span>
                                <span class="text-muted small"> registros · </span>
                                <span class="fw-semibold">${mesStr} ${anioStr}</span>
                            </div>
                        </div>
                        <div class="mb-1 small text-muted">Mapeo de columnas detectado:</div>
                        <div class="mb-0">${colPreviewHtml}</div>
                        ${existingWarning}
                    </div>`;
            }

            setStatus(`<i class="fas fa-file-excel text-success me-1"></i>Archivo listo: <strong>${dataRows.length.toLocaleString()} filas</strong> de <strong>${mesStr} ${anioStr}</strong>. Confirma para importar.`);
            if (btnImport) btnImport.disabled = false;

            // 6. Guardar estado en el botón para cuando haga click
            if (btnImport) {
                btnImport.onclick = async () => {
                    btnImport.disabled = true;
                    if (progWrap) progWrap.classList.remove('d-none');
                    setProgress(0, dataRows.length);

                    try {
                        // Eliminar datos anteriores si existen
                        if (existingCount > 0 && mesDato && anioDato) {
                            setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Eliminando datos anteriores…');
                            const { error: delErr } = await client
                                .from('Demoras').delete()
                                .eq('MES', mesDato).eq('ANIO', anioDato);
                            if (delErr) throw delErr;
                        }

                        setStatus('<i class="fas fa-spinner fa-spin me-1"></i>Subiendo datos a Supabase…');

                        // Transformar y subir
                        const dbRows = dataRows.map(r => transformRow(r, mapping));
                        await uploadInBatches(dbRows, (done, total) => {
                            setProgress(done, total);
                            setStatus(`<i class="fas fa-spinner fa-spin me-1"></i>Subiendo… <strong>${done.toLocaleString()}</strong> / ${total.toLocaleString()} registros`);
                        });

                        setProgress(dbRows.length, dbRows.length);
                        setStatus(
                            `<i class="fas fa-check-circle text-success me-1"></i><strong>${dbRows.length.toLocaleString()} registros</strong> importados para <strong>${mesStr} ${anioStr}</strong>.`,
                            'success'
                        );

                        // Invalidar caché del mes importado
                        if (mesDato && anioDato) {
                            const cacheKey = `${OPS_CACHE_PFX}${anioDato}_${mesDato}`;
                            sessionStorage.removeItem(cacheKey);
                        }

                        // Refrescar vista si el mes activo coincide
                        if (typeof loadOpsMonthData === 'function' &&
                            typeof currentYearOps !== 'undefined' && typeof currentMonthOps !== 'undefined' &&
                            anioDato === currentYearOps && mesDato === new Date(`${MES_NOMBRES[mesDato]} 1, ${anioDato}`).getMonth() + 1) {
                            setTimeout(() => loadOpsMonthData(currentMonthOps), 1200);
                        }

                    } catch (err) {
                        setStatus(`<i class="fas fa-times-circle me-1"></i>Error al importar: ${err.message}`, 'danger');
                        btnImport.disabled = false;
                    }
                };
            }

        } catch (err) {
            setStatus(`<i class="fas fa-times-circle me-1"></i>Error al leer el archivo: ${err.message}`, 'danger');
        }
    };

    // ── Inicialización ─────────────────────────────────────────────────────────

    /** Muestra/oculta el botón de importar según el rol */
    function syncImportBtn() {
        const role = sessionStorage.getItem('user_role') || 'viewer';
        const btn  = document.getElementById('demoras-import-btn');
        if (btn) btn.style.display = UPLOAD_ROLES.includes(role) ? '' : 'none';
    }

    window.demorasInitUploadBtn = syncImportBtn;

    document.addEventListener('DOMContentLoaded', () => {
        syncImportBtn();
        // Drag & drop zone
        const zone = document.getElementById('du-drop-zone');
        const inp  = document.getElementById('du-file-input');
        if (zone) {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
            });
            zone.addEventListener('click', () => inp && inp.click());
        }
        if (inp) {
            inp.addEventListener('change', () => {
                if (inp.files[0]) handleFileSelect(inp.files[0]);
            });
        }
    });

    // Re-sync cuando la sesión carga (el rol puede llegar tarde)
    document.addEventListener('aifa-session-ready', syncImportBtn);
    // Fallback: revisar periódicamente hasta que el rol esté disponible
    let _syncRetries = 0;
    const _syncInterval = setInterval(() => {
        const role = sessionStorage.getItem('user_role');
        if (role || _syncRetries++ > 20) {
            syncImportBtn();
            clearInterval(_syncInterval);
        }
    }, 500);

    function handleFileSelect(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setStatus('Formato no soportado. Sube un archivo .xlsx o .xls.', 'danger');
            return;
        }
        const label = document.getElementById('du-file-label');
        if (label) label.textContent = file.name;
        window.demorasProcessFile(file);
    }

})();
