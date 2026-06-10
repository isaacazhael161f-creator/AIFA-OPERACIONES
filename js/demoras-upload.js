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

    // Abreviaturas de mes en español → número (1-12)
    const MES_ABREV_MAP = {
        'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,
        'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12
    };

    /**
     * Intenta extraer mes y año del nombre de la hoja.
     * Soporta: "ABR 2026", "ABRIL 2026", "04/2026", "4-2026", "2026-04".
     * Retorna { mes: Number, anio: Number } o null.
     */
    function mesAnioFromSheetName(name) {
        const n = String(name || '').trim();
        // Patrón: letras (nombre de mes) seguido de 4 dígitos (año), ej. "ABR 2026"
        const m1 = n.match(/([A-Za-záéíóúüñ]+)\s+(\d{4})/i);
        if (m1) {
            const abbr = m1[1].substring(0, 3).toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const anio = parseInt(m1[2], 10);
            if (MES_ABREV_MAP[abbr] && anio >= 2000) return { mes: MES_ABREV_MAP[abbr], anio };
        }
        // Patrón: MM/YYYY o M-YYYY o YYYY-MM
        const m2 = n.match(/(\d{1,2})[\/-](\d{4})/) || n.match(/(\d{4})[\/-](\d{1,2})/);
        if (m2) {
            let mes = parseInt(m2[1], 10), anio = parseInt(m2[2], 10);
            if (anio < 2000) { [mes, anio] = [anio, mes]; } // swap YYYY-MM case
            if (mes >= 1 && mes <= 12 && anio >= 2000) return { mes, anio };
        }
        return null;
    }

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

    // Columnas que NO se toman del Excel — se generan aquí o las gestiona Supabase
    const AUTOGEN_COLS = new Set(['id', 'created_at', 'no']);

    /** Elimina columnas autogeneradas (PK, timestamps) antes de insertar */
    function stripAutogen(row) {
        const clean = {};
        for (const [k, v] of Object.entries(row)) {
            if (!AUTOGEN_COLS.has(k) && !AUTOGEN_COLS.has(normCol(k))) clean[k] = v;
        }
        return clean;
    }

    /** Sube filas en lotes de 500 con callback de progreso */
    async function uploadInBatches(rows, onProgress) {
        const client = window.supabaseClient;
        const BATCH = 500;
        let done = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH).map(stripAutogen);
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

            // 2. Detectar MES y ANIO — prioridad: nombre de hoja → columnas MES/ANIO → fecha del dato
            let mesDato = null, anioDato = null;

            // 2a. Nombre de la hoja (más confiable — ej. "ABR 2026")
            const fromSheet = mesAnioFromSheetName(sheetName);
            if (fromSheet) {
                mesDato = fromSheet.mes;
                anioDato = fromSheet.anio;
            }

            // 2b. Columnas MES / ANIO en los datos (fallback)
            if (!mesDato || !anioDato) {
                const mesIdx  = headers.findIndex(h => normCol(h) === 'mes');
                const anioIdx = headers.findIndex(h => normCol(h) === 'anio');
                const sampleRow = dataRows[0] || [];
                const mesCol  = mesIdx  >= 0 ? Number(sampleRow[mesIdx])  : null;
                const anioCol = anioIdx >= 0 ? Number(sampleRow[anioIdx]) : null;
                if (!mesDato  && mesCol  >= 1 && mesCol  <= 12) mesDato  = mesCol;
                if (!anioDato && anioCol >= 2000)               anioDato = anioCol;
            }

            // 2c. Derivar del primer valor de fecha en la columna aterrizaje/despegue (fallback)
            if (!mesDato || !anioDato) {
                const atzIdx = headers.findIndex(h => normCol(h) === 'aterrizaje_despegue');
                if (atzIdx >= 0) {
                    const serial = (dataRows[0] || [])[atzIdx];
                    if (typeof serial === 'number' && serial > 0) {
                        const d = new Date((serial - 25569) * 86400000);
                        if (!mesDato)  mesDato  = d.getUTCMonth() + 1;
                        if (!anioDato) anioDato = d.getUTCFullYear();
                    }
                }
            }

            const mesStr  = (mesDato  && mesDato >= 1 && mesDato <= 12) ? MES_NOMBRES[mesDato] : '?';
            const anioStr = anioDato || '?';

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

                        // Transformar filas (la columna "No" ya fue excluida por AUTOGEN_COLS)
                        // Filtrar filas completamente vacías (sin ningún valor relevante)
                        const noEntry  = mapping.find(m => normCol(m.excelHeader) === 'no');
                        const noDbCol  = noEntry ? noEntry.dbCol : 'No';
                        // Buscar el nombre real de las columnas MES/ANIO en el mapping para sobreescribirlas
                        const mesEntry  = mapping.find(m => normCol(m.excelHeader) === 'mes');
                        const anioEntry = mapping.find(m => normCol(m.excelHeader) === 'anio');
                        const mesDbCol  = mesEntry  ? mesEntry.dbCol  : 'MES';
                        const anioDbCol = anioEntry ? anioEntry.dbCol : 'ANIO';
                        const dbRows   = dataRows
                            .map(r => transformRow(r, mapping))
                            .filter(r => Object.values(r).some(v => v !== null && v !== undefined && v !== ''))
                            // Sobreescribir MES/ANIO con el valor detectado del nombre de hoja
                            // (evita que datos copiados de otro mes queden con el mes incorrecto)
                            .map((r, i) => ({ ...r, [mesDbCol]: mesDato, [anioDbCol]: anioDato, [noDbCol]: i + 1 }));
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

    /** Muestra/oculta los botones de admin segun el rol */
    function syncImportBtn() {
        const role      = sessionStorage.getItem('user_role') || 'viewer';
        const container = document.getElementById('demoras-admin-btns');
        // El wrapper usa display:none!important por defecto; lo reemplazamos con flex
        if (container) container.style.cssText = UPLOAD_ROLES.includes(role)
            ? 'display:flex!important'
            : 'display:none!important';
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

    // ── Lógica: Borrar mes de Demoras ────────────────────────────────────────

    const MES_NOMBRES_DEL = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    /** Abre el modal de borrado pre-cargando el mes/año activo */
    window.demorasAbrirBorrar = function () {
        const selMes  = document.getElementById('dd-sel-mes');
        const inpAnio = document.getElementById('dd-inp-anio');
        const btnConf = document.getElementById('dd-btn-confirm');
        const status  = document.getElementById('dd-status');
        const info    = document.getElementById('dd-count-info');

        if (!selMes || !inpAnio) return;

        // Pre-cargar con el mes activo de la vista
        const mesActivo  = (typeof currentMonthOps !== 'undefined' && currentMonthOps)
            ? currentMonthOps : null;
        const anioActivo = (typeof currentYearOps  !== 'undefined' && currentYearOps)
            ? currentYearOps  : new Date().getFullYear();

        if (mesActivo) {
            const mesNum = MES_NOMBRES_DEL.indexOf(mesActivo);
            if (mesNum > 0) selMes.value = String(mesNum);
        }
        inpAnio.value = anioActivo;

        if (btnConf) btnConf.disabled = true;
        if (status)  status.innerHTML = '';
        if (info)    info.textContent  = '';

        // Consultar cuántos registros hay
        _ddFetchCount();

        const modalEl = document.getElementById('demoras-delete-modal');
        let bsModal = bootstrap.Modal.getInstance(modalEl);
        if (!bsModal) bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
    };

    async function _ddFetchCount() {
        const mes  = parseInt(document.getElementById('dd-sel-mes')?.value,  10);
        const anio = parseInt(document.getElementById('dd-inp-anio')?.value, 10);
        const info = document.getElementById('dd-count-info');
        const btnC = document.getElementById('dd-btn-confirm');
        if (!mes || !anio || anio < 2020 || anio > 2099) {
            if (info) info.textContent = '';
            if (btnC) btnC.disabled = true;
            return;
        }
        if (info) info.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Consultando registros…';
        if (btnC) btnC.disabled = true;
        try {
            const { count, error } = await window.supabaseClient
                .from('Demoras')
                .select('*', { count: 'exact', head: true })
                .eq('MES', mes)
                .eq('ANIO', anio);
            if (error) throw error;
            const mesNombre = MES_NOMBRES_DEL[mes] || mes;
            if (count > 0) {
                if (info) info.innerHTML = `Se eliminarán <strong class="text-danger">${count.toLocaleString()} registros</strong> de <strong>${mesNombre} ${anio}</strong>.`;
                if (btnC) btnC.disabled = false;
            } else {
                if (info) info.innerHTML = `<span class="text-success"><i class="fas fa-check-circle me-1"></i>No hay registros para ${mesNombre} ${anio}.</span>`;
                if (btnC) btnC.disabled = true;
            }
        } catch (e) {
            if (info) info.textContent = 'Error al consultar: ' + e.message;
        }
    }

    // Actualizar conteo al cambiar selector
    // Usamos un helper que funciona aunque DOMContentLoaded ya haya disparado
    function _onReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    _onReady(() => {
        document.getElementById('dd-sel-mes')  ?.addEventListener('change', _ddFetchCount);
        document.getElementById('dd-inp-anio') ?.addEventListener('input',  _ddFetchCount);

        document.getElementById('dd-btn-confirm')?.addEventListener('click', async () => {
            const mes  = parseInt(document.getElementById('dd-sel-mes')?.value,  10);
            const anio = parseInt(document.getElementById('dd-inp-anio')?.value, 10);
            const status = document.getElementById('dd-status');
            const btnC   = document.getElementById('dd-btn-confirm');
            if (!mes || !anio) return;

            btnC.disabled = true;
            if (status) status.innerHTML = '<div class="alert alert-warning py-2 small"><i class="fas fa-spinner fa-spin me-1"></i>Eliminando registros…</div>';

            try {
                const { error } = await window.supabaseClient
                    .from('Demoras')
                    .delete()
                    .eq('MES', mes)
                    .eq('ANIO', anio);
                if (error) throw error;

                const mesNombre = MES_NOMBRES_DEL[mes] || mes;
                if (status) status.innerHTML = `<div class="alert alert-success py-2 small"><i class="fas fa-check-circle me-1"></i>Registros de <strong>${mesNombre} ${anio}</strong> eliminados correctamente.</div>`;

                // Invalidar caché del mes borrado
                const cacheKey = `aifa_ops_cache_${anio}_${mes}`;
                sessionStorage.removeItem(cacheKey);

                // Refrescar tabla si el mes borrado es el activo en la vista
                if (typeof currentMonthOps !== 'undefined' && typeof currentYearOps !== 'undefined') {
                    const monthMap = { 'Enero':1,'Febrero':2,'Marzo':3,'Abril':4,'Mayo':5,'Junio':6,
                                       'Julio':7,'Agosto':8,'Septiembre':9,'Octubre':10,'Noviembre':11,'Diciembre':12 };
                    if (monthMap[currentMonthOps] === mes && currentYearOps === anio) {
                        setTimeout(() => {
                            if (typeof loadOpsMonthData === 'function') loadOpsMonthData(currentMonthOps);
                        }, 800);
                    }
                }

                // Actualizar conteo (mostrar 0)
                setTimeout(_ddFetchCount, 600);

            } catch (e) {
                if (status) status.innerHTML = `<div class="alert alert-danger py-2 small"><i class="fas fa-times-circle me-1"></i>Error: ${e.message}</div>`;
                btnC.disabled = false;
            }
        });
    });

})();
