/**
 * Logic for "Vuelos" tab (PDF Reader)
 * Structure: WIDE TABLE (13 Columns)
 * Matches DB Table 'daily_flights_ops' 1:1.
 */
(function () {
    let peakChart = null;
    let isEditMode = false;
    let currentData = [];
    let activeFilters = {
        arrival: {},
        departure: {}
    };
    let textFilters = {
        arrival: {},
        departure: {}
    };
    let filterMenu = null; // Container for the dropdown

    const getRowValue = (row, field) => {
        if (row[field] !== undefined && row[field] !== null) return String(row[field]);
        // Fallbacks for common case differences or aliases
        if (field === 'aerolinea' && row['Aerolinea'] !== undefined) return String(row['Aerolinea']);
        if (field === 'seq_no' && row['no'] !== undefined) return String(row['no']);
        if (field === 'vuelo_llegada' && row['vuelo'] !== undefined) return String(row['vuelo']);
        if (field === 'vuelo_salida' && row['vuelo'] !== undefined) return String(row['vuelo']);
        return '';
    };

    document.addEventListener('DOMContentLoaded', () => {
        init();
        window.opsFlights = { loadFlights, importJson, toggleEditMode, saveEditedData };
    });

    function init() {
        // Tab Show Event
        const tabEl = document.getElementById('tab-vuelos-ops');
        if (tabEl) {
            tabEl.addEventListener('shown.bs.tab', () => {
                // Sync date from main calendar if this one is empty
                const mainDate = document.getElementById('operations-summary-date');
                const myDate = document.getElementById('vuelos-ops-date');
                if (mainDate && myDate && !myDate.value) {
                    myDate.value = mainDate.value;
                }
                loadFlights();
            });

            // Check if active on load (since I just made it default)
            if (tabEl.classList.contains('active')) {
                // Small delay to allow main script to populate the initial date
                setTimeout(() => {
                    const mainDate = document.getElementById('operations-summary-date');
                    const myDate = document.getElementById('vuelos-ops-date');
                    if (mainDate && myDate && !myDate.value) {
                        myDate.value = mainDate.value;
                    }
                    loadFlights();
                }, 800);
            }
        }

        // Date Change Event for MAIN calendar
        const dateInputMain = document.getElementById('operations-summary-date');
        if (dateInputMain) {
            dateInputMain.addEventListener('change', () => {
                // If this tab is active, we might want to reload. 
                // But now we have a local date picker. 
                // Maybe we should sync local date if the tab is NOT active?
                // Or just ignore. Let's keep it simple: local controls local.
                const myDate = document.getElementById('vuelos-ops-date');
                if (myDate && dateInputMain.value) {
                    myDate.value = dateInputMain.value;
                }
                if (isTabActive()) loadFlights();
            });
        }

        // Date Change Event for LOCAL calendar
        const dateInputLocal = document.getElementById('vuelos-ops-date');
        if (dateInputLocal) {
            dateInputLocal.addEventListener('change', loadFlights);
        }

        // Save Button
        const btnSave = document.getElementById('btn-save-ops-itinerary-json');
        if (btnSave) btnSave.addEventListener('click', handleUpload);

        // JSON Process Button
        const btnProcessJson = document.getElementById('btn-process-ops-json');
        if (btnProcessJson) btnProcessJson.addEventListener('click', handleJsonPaste);
    }

    function isTabActive() {
        const pane = document.getElementById('vuelos-ops-pane');
        return pane && pane.classList.contains('active');
    }

    // --- CONCILIACION MODAL ---
    window.openConciliacionHistory = function (dateRef, seqNo, type, currentStatus, user, time, flightCode) {
        // Elements
        const modalEl = document.getElementById('modalConciliacionHistory');
        const iconEl = document.getElementById('conci-modal-icon');
        const statusEl = document.getElementById('conci-modal-status');
        const flightEl = document.getElementById('conci-modal-flight-info');
        const detailsEl = document.getElementById('conci-modal-details');
        const btnAction = document.getElementById('btn-conci-action');
        const warnEl = document.getElementById('conci-modal-action-warn');

        // Reset
        warnEl.classList.add('d-none');
        btnAction.disabled = false; // Reset disabled state from previous actions

        // Flight Info
        const flightInfo = `Vuelo: <strong>${flightCode}</strong> | Fecha: ${dateRef} | Secuencia: ${seqNo}`;
        flightEl.innerHTML = flightInfo;

        // Current Status UI
        if (currentStatus) {
            // Is Conciliated
            iconEl.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
            statusEl.className = 'fw-bold mb-1 text-success';
            statusEl.innerText = 'CONCILIADO';

            // History Details
            if (user && user !== 'undefined' && user !== 'null') {
                detailsEl.innerHTML = `
                    <p class="mb-1"><strong>Realizado por:</strong> ${user}</p>
                    <p class="mb-0"><strong>Fecha/Hora:</strong> ${time}</p>
                `;
            } else {
                detailsEl.innerHTML = '<p class="text-muted fst-italic">Registro histórico sin detalles de usuario.</p>';
            }

            // Action Button -> Cancel
            btnAction.className = 'btn btn-danger';
            btnAction.innerHTML = '<i class="fas fa-times me-2"></i>Cancelar Conciliación';
            btnAction.onclick = () => {
                executeToggleConciliacion(dateRef, seqNo, type, true, modalEl);
            };

        } else {
            // Is NOT Conciliated
            iconEl.innerHTML = '<i class="fas fa-times-circle text-danger opacity-50"></i>';
            statusEl.className = 'fw-bold mb-1 text-danger';
            statusEl.innerText = 'NO CONCILIADO';

            detailsEl.innerHTML = '<p class="text-muted">Esperando validación por parte del área correspondiente.</p>';

            // Action Button -> Validate
            btnAction.className = 'btn btn-success';
            btnAction.innerHTML = '<i class="fas fa-check me-2"></i>Validar / Conciliar';
            btnAction.onclick = () => {
                executeToggleConciliacion(dateRef, seqNo, type, false, modalEl);
            };
        }

        // Show Modal
        let modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
            modal.show();
        } else {
            modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    };

    async function executeToggleConciliacion(dateRef, seqNo, type, currentStatus, modalEl) {
        // Disable button immediately to show feedback
        const btn = document.getElementById('btn-conci-action');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        }

        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error("Cliente Supabase no disponible");

            // Get Current User - Reliable Method (Supabase Auth)
            let userName = 'Usuario Sistema';
            try {
                // 1. Session Storage
                const userStr = sessionStorage.getItem('user');
                if (userStr) {
                    const u = JSON.parse(userStr);
                    userName = u.user_metadata?.full_name || u.email || userName;
                }

                // 2. Refresh from Auth if needed
                if (userName === 'Usuario Sistema' || userName.includes('Usuario (')) {
                    // Don't block purely on this if it fails
                    const { data, error } = await supabase.auth.getUser();
                    if (data && data.user) {
                        userName = data.user.user_metadata?.full_name || data.user.email || userName;
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                    }
                }
            } catch (uErr) {
                console.warn("Error resolviendo usuario:", uErr);
            }

            // Fallback for manual role override
            if (userName === 'Usuario Sistema') {
                const role = sessionStorage.getItem('user_role');
                if (role) userName = `Usuario (${role})`;
            }

            const now = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: false });


            // 1. Fetch current JSON
            const { data: rowData, error: fetchError } = await supabase
                .from('vuelos_parte_operaciones')
                .select('data')
                .eq('date', dateRef)
                .single();

            if (fetchError) throw fetchError;

            let flights = rowData.data;
            if (!Array.isArray(flights)) throw new Error("Formato de datos inválido en DB");

            // 2. Find row
            const index = flights.findIndex(f => (f.seq_no || f.no) == seqNo);
            if (index === -1) throw new Error("No se encontró el vuelo");

            // 3. Update fields
            const field = type === 'arrival' ? 'conciliado_llegada' : 'conciliado_salida';
            const fieldBy = type === 'arrival' ? 'conciliado_llegada_by' : 'conciliado_salida_by';
            const fieldTime = type === 'arrival' ? 'conciliado_llegada_at' : 'conciliado_salida_at';

            const newState = !currentStatus;

            flights[index][field] = newState;

            if (newState) {
                flights[index][fieldBy] = userName;
                flights[index][fieldTime] = now;
            } else {
                delete flights[index][fieldBy];
                delete flights[index][fieldTime];
            }

            // 4. Save
            const { error: updateError } = await supabase
                .from('vuelos_parte_operaciones')
                .update({ data: flights })
                .eq('date', dateRef);

            if (updateError) throw updateError;

            // --- LOG HISTORY (Global History) ---
            if (window.logHistory) {
                const fRow = flights[index];
                const flightCode = type === 'arrival'
                    ? (fRow.vuelo_llegada || fRow['Vuelo de llegada'] || 'Vuelo Llegada')
                    : (fRow.vuelo_salida || fRow['Vuelo de salida'] || 'Vuelo Salida');

                const actionType = newState ? 'CONCILIACION' : 'CANCELACION';
                const actionVerb = newState ? 'concilió' : 'canceló la conciliación de';
                const direction = type === 'arrival' ? 'Llegada' : 'Salida';

                // Format Date from YYYY-MM-DD to DD-MM-YYYY
                let dateFormatted = dateRef;
                try {
                    const [y, m, d] = dateRef.split('-');
                    if (y && m && d) dateFormatted = `${d}-${m}-${y}`;
                } catch (e) { }

                const friendlyDetails = `El usuario <strong>${userName}</strong> ${actionVerb} el vuelo <strong>${flightCode}</strong> (${direction}) del día ${dateFormatted}.`;

                // Fire and forget log
                window.logHistory(actionType, 'Parte Operaciones', `${dateRef}-${seqNo}`, friendlyDetails);
            }

            // Hide Modal
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            // Refresh Table
            loadFlights();

        } catch (err) {
            console.error("Error toggling conciliacion:", err);
            alert("Error: " + err.message);
            // Re-enable button
            const btn = document.getElementById('btn-conci-action');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Reintentar';
            }
        }
    }



    // --- EDIT MODE & FILTERS ---
    function toggleEditMode() {
        isEditMode = !isEditMode;
        const btnEdit = document.getElementById('btn-toggle-edit-mode');
        const btnSave = document.getElementById('btn-save-edit-mode');

        if (btnEdit) {
            if (isEditMode) {
                btnEdit.classList.remove('btn-outline-primary');
                btnEdit.classList.add('btn-primary');
                if (btnSave) btnSave.classList.remove('d-none');
            } else {
                btnEdit.classList.add('btn-outline-primary');
                btnEdit.classList.remove('btn-primary');
                if (btnSave) btnSave.classList.add('d-none');
            }
        }
        // applyFilters(); << This function didn't exist
        renderData(currentData);
    }

    async function saveEditedData() {
        if (!confirm("¿Estás seguro de guardar los cambios realizados?")) return;

        const inputs = document.querySelectorAll('.ops-input-edit');

        // Update internal data from inputs
        inputs.forEach(input => {
            const seqStr = String(input.dataset.seq);
            const field = input.dataset.field;
            const rowType = input.dataset.rowType;
            let val = input.value;

            if (input.type === 'number') {
                val = val ? parseInt(val) : 0;
            }

            const row = currentData.find(r => {
                const matchesSeq = String(r.seq_no || r.no) === seqStr;
                if (!matchesSeq) return false;
                
                // Disambiguate if seq is reused
                if (rowType === 'arrival') {
                     return (r.vuelo_llegada || r.fecha_hora_prog_llegada || r['Vuelo de llegada']);
                }
                if (rowType === 'departure') {
                     return (r.vuelo_salida || r.fecha_hora_prog_salida || r['Vuelo de salida']);
                }
                return true;
            });

            if (row) {
                row[field] = val;
                if (field === 'seq_no') row.no = val;

                // Sync Aliases
                if (field === 'vuelo_llegada') { row['Vuelo de llegada'] = val; row['vuelo_llegada'] = val; }
                if (field === 'vuelo_salida') { row['Vuelo de salida'] = val; row['vuelo_salida'] = val; }
                if (field === 'pasajeros_llegada') { row['Pasajeros llegada'] = val; row['pasajeros_llegada'] = val; }
                if (field === 'pasajeros_salida') { row['Pasajeros salida'] = val; row['pasajeros_salida'] = val; }
                if (field === 'matricula') { row['Matrícula'] = val; row['matricula'] = val; }
                if (field === 'origen') { row['Origen'] = val; row['origen'] = val; }
                if (field === 'destino') { row['Destino'] = val; row['destino'] = val; }
                if (field === 'aerolinea') { row['Aerolinea'] = val; row['aerolinea'] = val; }
                // Time fields
                if (field === 'fecha_hora_prog_llegada') { row['Hora programada_llegada'] = val; row['fecha_hora_prog_llegada'] = val; }
                if (field === 'fecha_hora_real_llegada') { row['Hora de salida_llegada'] = val; row['fecha_hora_real_llegada'] = val; }
                if (field === 'fecha_hora_prog_salida') { row['Hora programada_salida'] = val; row['fecha_hora_prog_salida'] = val; }
                if (field === 'fecha_hora_real_salida') { row['Hora de salida_salida'] = val; row['fecha_hora_real_salida'] = val; }
            }
        });

        try {
            await saveToDatabase(currentData);
            toggleEditMode(); // Exit edit mode
            await loadFlights();
        } catch (e) {
            alert("Error al guardar: " + e.message);
        }
    }

    function renderFilters() {
        const tables = [
            { id: 'table-ops-flights-arrivals', type: 'arrival' },
            { id: 'table-ops-flights-departures', type: 'departure' }
        ];

        tables.forEach(tbl => {
            const tableEl = document.getElementById(tbl.id);
            if (!tableEl) return;

            const thead = tableEl.querySelector('thead');
            if (!thead) return;

            const headerRow = thead.querySelector('tr');
            if (!headerRow) return;

            // Ensure a filter row exists for the column searchers
            let filterRow = thead.querySelector('.filter-row');
            if (!filterRow) {
                filterRow = document.createElement('tr');
                filterRow.className = 'filter-row text-center bg-light';
                thead.appendChild(filterRow);
            }
            filterRow.innerHTML = ''; // Rebuild it

            const cols = Array.from(headerRow.children);

            cols.forEach((th, idx) => {
                let field = null;
                if (tbl.type === 'arrival') {
                    if (idx === 0) field = 'seq_no';
                    else if (idx === 1) field = 'aerolinea';
                    else if (idx === 2) field = 'vuelo_llegada';
                    else if (idx === 3) field = 'origen';
                    else if (idx === 4) field = 'fecha_hora_prog_llegada';
                    else if (idx === 5) field = 'fecha_hora_real_llegada';
                    else if (idx === 6) field = 'pasajeros_llegada';
                } else {
                    if (idx === 0) field = 'aerolinea';
                    else if (idx === 1) field = 'vuelo_salida';
                    else if (idx === 2) field = 'destino';
                    else if (idx === 3) field = 'fecha_hora_prog_salida';
                    else if (idx === 4) field = 'fecha_hora_real_salida';
                    else if (idx === 5) field = 'pasajeros_salida';
                    else if (idx === 6) field = 'matricula';
                }

                // Add text input for this column (Buscador)
                const filterTd = document.createElement('td');
                if (field) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.placeholder = 'Buscar...';
                    input.value = textFilters[tbl.type][field] || '';
                    input.oninput = (e) => {
                        textFilters[tbl.type][field] = e.target.value;
                        renderData(currentData);
                    };
                    filterTd.appendChild(input);
                }
                filterRow.appendChild(filterTd);

                if (field) {
                    if (!th.classList.contains('excel-filter-header')) {
                        th.classList.add('excel-filter-header');
                        if (!th.querySelector('.filter-icon')) {
                            const icon = document.createElement('i');
                            icon.className = 'fas fa-chevron-down filter-icon';
                            th.appendChild(icon);
                        }
                        th.onclick = (e) => {
                            e.stopPropagation();
                            showExcelFilter(field, tbl.type, e);
                        };
                    }

                    const icon = th.querySelector('.filter-icon');
                    if (icon) {
                        const isActive = activeFilters[tbl.type][field] !== null && activeFilters[tbl.type][field] !== undefined;
                        if (isActive) {
                            icon.classList.add('active');
                            th.classList.add('filter-header-active');
                        } else {
                            icon.classList.remove('active');
                            th.classList.remove('filter-header-active');
                        }
                    }
                }
            });
        });

        if (!window._excelFilterInited) {
            document.addEventListener('click', (e) => {
                if (filterMenu && !filterMenu.contains(e.target)) {
                    filterMenu.style.display = 'none';
                }
            });
            window._excelFilterInited = true;
        }
    }

    function showExcelFilter(field, type, event) {
        if (!filterMenu) {
            filterMenu = document.createElement('div');
            filterMenu.className = 'excel-filter-menu';
            document.body.appendChild(filterMenu);
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 220; // Matches CSS
        let left = rect.left;
        if (left + menuWidth > window.innerWidth) {
            left = window.innerWidth - menuWidth - 10;
        }

        filterMenu.style.top = rect.bottom + 'px';
        filterMenu.style.left = left + 'px';
        filterMenu.style.display = 'block';

        // Get unique values for this field from currentData
        const values = [...new Set(currentData.map(r => getRowValue(r, field)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        // Build HTML
        let html = `
            <div class="excel-filter-search">
                <input type="text" class="form-control form-control-sm" placeholder="Buscar..." id="filter-search-box">
            </div>
            <div class="excel-filter-list" id="filter-items-list">
                <div class="excel-filter-item">
                    <input type="checkbox" id="filter-select-all" checked>
                    <label for="filter-select-all">(Todas)</label>
                </div>
                <hr class="my-1">
        `;

        const selectedSet = activeFilters[type][field];

        values.forEach((v, i) => {
            const isChecked = !selectedSet || selectedSet.has(v);
            html += `
                <div class="excel-filter-item" data-value="${v}">
                    <input type="checkbox" class="filter-check-val" id="filter-item-${i}" ${isChecked ? 'checked' : ''} value="${v}">
                    <label for="filter-item-${i}">${v || '(Vacío)'}</label>
                </div>
            `;
        });

        html += `
            </div>
            <div class="excel-filter-footer">
                <button class="btn btn-sm btn-outline-secondary" id="btn-filter-cancel">Cancelar</button>
                <button class="btn btn-sm btn-primary" id="btn-filter-apply">Aceptar</button>
            </div>
        `;

        filterMenu.innerHTML = html;

        // Interaction logic
        const searchBox = document.getElementById('filter-search-box');
        const listItems = filterMenu.querySelectorAll('.excel-filter-item[data-value]');
        const selectAll = document.getElementById('filter-select-all');
        const checkVals = filterMenu.querySelectorAll('.filter-check-val');

        searchBox.oninput = () => {
            const txt = searchBox.value.toLowerCase();
            listItems.forEach(item => {
                const val = item.dataset.value.toLowerCase();
                item.style.display = val.includes(txt) ? 'flex' : 'none';
            });
        };

        selectAll.onchange = () => {
            checkVals.forEach(c => {
                if (c.parentElement.style.display !== 'none') {
                    c.checked = selectAll.checked;
                }
            });
        };

        document.getElementById('btn-filter-cancel').onclick = () => {
            filterMenu.style.display = 'none';
        };

        document.getElementById('btn-filter-apply').onclick = () => {
            const selected = new Set();
            let allChecked = true;
            let totalShowed = 0;
            let checkedShowed = 0;

            checkVals.forEach(c => {
                if (c.checked) selected.add(c.value);
                else {
                    allChecked = false;
                }
            });

            if (allChecked) {
                activeFilters[type][field] = null;
            } else {
                activeFilters[type][field] = selected;
            }

            filterMenu.style.display = 'none';
            renderFilters(); // Update icons active state
            renderData(currentData);
        };
    }


    // --- LOAD FROM DB ---
    async function loadFlights() {
        // Use local date input first, fall back to main
        const dateInput = document.getElementById('vuelos-ops-date') || document.getElementById('operations-summary-date');

        // If no date selected, default to today
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        if (!dateInput || !dateInput.value) return;

        const dateVal = dateInput.value;
        const tbodyArr = document.getElementById('tbody-ops-flights-arrivals');
        const tbodyDep = document.getElementById('tbody-ops-flights-departures');

        console.log(`[parte-ops] Loading flights for ${dateVal}...`);

        if (tbodyArr) tbodyArr.innerHTML = '<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-success spinner-border-sm"></div><div class="small mt-2">Buscando llegadas...</div></td></tr>';
        if (tbodyDep) tbodyDep.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div><div class="small mt-2">Buscando salidas...</div></td></tr>';

        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('Supabase client missing');

            // Fetch Single Row with JSON data
            const { data, error } = await supabase
                .from('vuelos_parte_operaciones')
                .select('data')
                .eq('date', dateVal)
                .maybeSingle();

            console.log(`[parte-ops] Result for ${dateVal}:`, data);

            let flights = [];
            // Handle different JSON structures returned by Supabase
            // Case 1: data column contains the array directly ([...])
            if (data && Array.isArray(data.data)) {
                flights = data.data;
            }
            // Case 2: data column contains an object wrapping the array ({ data: [...] })? Unlikely with Supabase JSONB but possible if nested.
            // Case 3: data is the top level object? No, select('data') returns { data: ... }

            console.log(`[parte-ops] Parsed ${flights.length} flights`);

            currentData = flights;
            renderFilters();

            if (!error && flights.length === 0) {
                // Fallback: Check for latest available date
                await suggestOtherDate(supabase, dateVal, 'No se encontró información');
                return;
            }
            // else if (flights.length > 0 && flights.length < 5) ... 

            renderData(flights, null, dateVal);

        } catch (err) {
            console.error(err);
            const errorMsg = `<div class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i> Error al cargar datos: ${err.message}</div>`;
            renderData(null, errorMsg);
        }
    }

    async function suggestOtherDate(supabase, currentVal, msgPrefix) {
        const { data: latestData } = await supabase
            .from('vuelos_parte_operaciones')
            .select('date')
            .order('date', { ascending: false })
            .limit(1);

        if (latestData && latestData.length > 0) {
            const lastDate = latestData[0].date;
            if (lastDate !== currentVal) {
                const warningHtml = `<div class="alert alert-warning d-inline-block shadow-sm mb-0">
                        <h6 class="alert-heading"><i class="fas fa-search me-2"></i>${msgPrefix} para el ${currentVal}</h6>
                        <p class="mb-2 small">Es posible que los datos estén en otra fecha.</p>
                        <hr>
                        <p class="mb-0">
                            <span class="me-2">Última fecha con actividad: <strong>${lastDate}</strong></span>
                            <button class="btn btn-sm btn-dark" onclick="document.getElementById('operations-summary-date').value='${lastDate}'; document.getElementById('operations-summary-date').dispatchEvent(new Event('change'));">
                                <i class="fas fa-calendar-alt me-1"></i> Ir a ${lastDate}
                            </button>
                        </p>
                     </div>`;
                renderData(null, warningHtml);
            } else {
                renderData(null);
            }
        } else {
            renderData(null);
        }
    }

    // --- JSON IMPORT ---
    async function importJson(inputElement) {
        if (!inputElement.files || inputElement.files.length === 0) return;

        const file = inputElement.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if (!Array.isArray(json)) throw new Error("El archivo JSON debe ser una lista de vuelos.");
                if (json.length === 0) throw new Error("El archivo JSON está vacío.");

                if (!confirm(`Se encontraron ${json.length} registros. ¿Deseas importarlos a la base de datos?\nNota: Se reemplazarán los datos existentes para las fechas incluidas en el archivo.`)) {
                    inputElement.value = '';
                    return;
                }

                await saveToDatabase(json);
                inputElement.value = '';

                // Trigger reload
                if (window.dataManagement && typeof window.dataManagement.loadDailyFlightsOps === 'function') {
                    window.dataManagement.loadDailyFlightsOps();
                }
                await loadFlights();

            } catch (err) {
                alert("Error al importar JSON: " + err.message);
                console.error(err);
                inputElement.value = '';
            }
        };

        reader.readAsText(file);
    }

    // --- UPLOAD HANDLER ---
    async function handleUpload() {
        const fileInput = document.getElementById('ops-itinerary-pdf-file');
        const progressBar = document.getElementById('ops-itinerary-upload-progress');
        const btnSave = document.getElementById('btn-save-ops-itinerary-json');

        if (!fileInput || !fileInput.files[0]) {
            alert('Selecciona un PDF.');
            return;
        }

        if (progressBar) progressBar.classList.remove('d-none');
        btnSave.disabled = true;

        try {
            const rows = await parsePdf(fileInput.files[0]);
            if (rows.length === 0) throw new Error("No se encontraron datos en el PDF");

            // Save directly using the Wide format
            await saveToDatabase(rows);

            // Auto-switch date picker to the new data date
            const refRow = rows.find(r => r.fecha_hora_prog_llegada || r.fecha_hora_prog_salida);
            if (refRow) {
                const refDateStr = (refRow.fecha_hora_prog_llegada && refRow.fecha_hora_prog_llegada.includes('/'))
                    ? refRow.fecha_hora_prog_llegada
                    : refRow.fecha_hora_prog_salida;

                if (refDateStr) {
                    const parts = refDateStr.split(' ')[0].split('/'); // DD, MM, YYYY
                    if (parts.length === 3) {
                        const yyyy_mm_dd = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        const dateInput = document.getElementById('operations-summary-date');
                        if (dateInput) {
                            dateInput.value = yyyy_mm_dd;
                            // Trigger change event so other listeners (e.g. labels) update
                            dateInput.dispatchEvent(new Event('change'));
                        }
                    }
                }
            }

            // Render what we just saved (re-uses DB render logic since structure matches)
            // But we can just reload from DB to be sure
            await loadFlights();

            // Close Modal
            const modalEl = document.getElementById('uploadOpsItineraryModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            fileInput.value = '';

        } catch (e) {
            alert("Error: " + e.message);
            console.error(e);
        } finally {
            if (progressBar) progressBar.classList.add('d-none');
            btnSave.disabled = false;
        }
    }

    // --- JSON PASTE HANDLER ---
    async function handleJsonPaste() {
        const textarea = document.getElementById('ops-json-textarea');
        if (!textarea || !textarea.value.trim()) {
            alert("Por favor pega el contenido JSON.");
            return;
        }

        try {
            const json = JSON.parse(textarea.value);
            if (!Array.isArray(json)) throw new Error("El JSON debe ser un arreglo de vuelos");
            if (json.length === 0) throw new Error("El JSON está vacío");

            if (!confirm(`Se encontraron ${json.length} registros. ¿Deseas importarlos a la base de datos?\nNota: Se reemplazarán los datos existentes para las fechas incluidas.`)) {
                return;
            }

            // Re-use saveToDatabase
            await saveToDatabase(json);

            // Auto-switch date if needed (similar to upload)
            if (json[0]) {
                // Try to find first date
                const r = json[0];
                const refDateStr = r.fecha || (r.fecha_hora_prog_llegada && r.fecha_hora_prog_llegada.includes('/')) ? r.fecha_hora_prog_llegada : r.fecha_hora_prog_salida;
                // If we have text date DD/MM/YYYY
                if (refDateStr && typeof refDateStr === 'string' && refDateStr.includes('/')) {
                    const parts = refDateStr.split(' ')[0].split('/');
                    if (parts.length === 3) {
                        const yyyy_mm_dd = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        const dateInput = document.getElementById('operations-summary-date');
                        if (dateInput) {
                            dateInput.value = yyyy_mm_dd;
                            dateInput.dispatchEvent(new Event('change'));
                        }
                    }
                }
                // If we have ISO date YYYY-MM-DD
                else if (r.fecha && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) {
                    const dateInput = document.getElementById('operations-summary-date');
                    if (dateInput) {
                        dateInput.value = r.fecha;
                        dateInput.dispatchEvent(new Event('change'));
                    }
                }
            }

            // Reload Main Table
            if (window.dataManagement && typeof window.dataManagement.loadDailyFlightsOps === 'function') {
                window.dataManagement.loadDailyFlightsOps();
            }
            // Reload current panel just in case
            await loadFlights();

            // Close Modal
            const modalEl = document.getElementById('loadOpsItineraryJsonModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            textarea.value = '';
            alert('Datos importados correctamente.');

        } catch (e) {
            alert("Error al procesar JSON: " + e.message);
            console.error(e);
        }
    }

    // --- PARSER ---
    async function parsePdf(file) {
        if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js no cargado');

        const ab = await file.arrayBuffer();

        // PDF.js Load
        let pdf = null;
        try {
            pdf = await pdfjsLib.getDocument({ data: ab }).promise;
        } catch (e) {
            // Fallback for workers?
            if (pdfjsLib.default && pdfjsLib.default.getDocument) {
                pdf = await pdfjsLib.default.getDocument({ data: ab }).promise;
            } else {
                throw e;
            }
        }

        const extracted = [];
        let rowCounter = 1;

        console.log(`Scanning ${pdf.numPages} pages...`);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Group By Y
            const lines = {};
            textContent.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (!lines[y]) lines[y] = [];
                lines[y].push(item);
            });

            // Iterate Rows
            const sortedYs = Object.keys(lines).sort((a, b) => b - a);

            for (const y of sortedYs) {
                // Join Text
                const items = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
                const fullStr = items.map(t => t.str).join(' ').trim();

                // Valid Row Check: Starts with number
                if (!/^\d+/.test(fullStr)) continue;

                // Extract Seq No immediately
                const noMatch = fullStr.match(/^(\d+)/);
                const seq = noMatch ? parseInt(noMatch[1]) : rowCounter++;

                // Find Timestamps: DD/MM/YYYY HH:MM
                const dateTimeRegex = /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}/g;
                const matches = [...fullStr.matchAll(dateTimeRegex)];

                const isPernocta = fullStr.toLowerCase().includes('pernocta');

                // --- SMART ANCHOR STRATEGY ---
                let arrSched = '', arrReal = '', depSched = '', depReal = '';
                let limitLeft = -1;

                if (matches.length >= 2) {
                    // Try to map timestamps
                    // Scenario A: 4 timestamps (Standard Arrival & Departure)
                    // Scenario B: 2 timestamps (Pernocta + Departure)
                    // Scenario C: 3 timestamps (Pernocta + ArrReal + Dep ... ?)

                    if (matches.length >= 4) {
                        arrSched = matches[0][0];
                        arrReal = matches[1][0];
                        depSched = matches[2][0];
                        depReal = matches[3][0];
                        limitLeft = fullStr.indexOf(arrSched);
                    }
                    else if (isPernocta && matches.length >= 2) {
                        // Assuming Pernocta replaces ArrSched
                        // The anchor for Origin is "Pernocta" unless a timestamp appears before it?
                        // Actually, if date timestamp appears, it's safer to use that.
                        // BUT "Pernocta" is text.

                        // Check if "Pernocta" appears *before* the first timestamp?
                        const idxP = fullStr.toLowerCase().indexOf('pernocta');
                        const idxDT = fullStr.indexOf(matches[0][0]);

                        if (idxP < idxDT) {
                            // Pernocta is first (replaces ArrSched)
                            arrSched = "Pernocta";
                            depSched = matches[0][0];
                            depReal = matches[1][0];
                            limitLeft = idxP;
                        } else {
                            // Maybe ArrSched is present -> ArrReal is Pernocta? Unlikely.
                            // Or ArrSched is time, ArrReal is Pernocta?
                            // Let's assume matches[0] is DepSched if we are sure it's Pernocta.
                            arrSched = "Pernocta";
                            depSched = matches[0][0];
                            depReal = matches[1][0];
                            limitLeft = idxP;
                        }
                    } else {
                        // Just map what we have
                        if (matches.length >= 2) {
                            // Maybe incomplete row, but let's try to grab last two as Dep?
                            depSched = matches[matches.length - 2][0];
                            depReal = matches[matches.length - 1][0];

                            // If Pernocta present, use it as anchor
                            const idxP = fullStr.toLowerCase().indexOf('pernocta');
                            if (idxP !== -1) {
                                limitLeft = idxP;
                                arrSched = "Pernocta";
                            } else {
                                // Default anchor to first timestamp?
                                limitLeft = fullStr.indexOf(matches[0][0]);
                                arrSched = matches[0][0]; // Guess
                            }
                        }
                    }
                } else {
                    // Not enough timestamps? Skip
                    continue;
                }

                // If limitLeft is invalid, abort
                if (limitLeft === -1) continue;

                // --- 2. Left Side Extraction ---
                const leftText = fullStr.substring(0, limitLeft).trim().replace(/^(\d+)\s+/, '');

                // Airline | ArrFlight | Origin
                // Flight Code Regex: [A-Z0-9]{2,3} [0-9]+
                const flightRx = /([A-Z0-9]{2,3}\s+\d{3,4})/;
                const flightMatch = leftText.match(flightRx);

                let airline = '', arrFlight = '', origin = '';
                if (flightMatch) {
                    arrFlight = flightMatch[0];
                    const idx = leftText.lastIndexOf(arrFlight);
                    airline = leftText.substring(0, idx).trim();
                    origin = leftText.substring(idx + arrFlight.length).trim();
                }

                // 3. Middle/Right Side (ArrReal ... DepSched ... End)
                // We need Pax Arr, Dep Flight, Dest, Pax Dep, Matricula

                // Search zones based on known timestamps

                // Zone A: Between ArrReal/ArrSched and DepSched
                // Start after the ArrReal (or Pernocta/ArrSched boundary)
                // If Pernocta: (Pernocta + 8) or if space is weird, use text index
                let startMid = -1;
                if (arrReal) {
                    startMid = fullStr.indexOf(arrReal) + arrReal.length;
                    // If arrReal is matched but text repeats? indexOf finds first. 
                    // To be safe, look after limitLeft + arrSched.
                    const idxArrSched = fullStr.indexOf(arrSched);
                    startMid = fullStr.indexOf(arrReal, idxArrSched + arrSched.length) + arrReal.length;
                } else if (arrSched === 'Pernocta') {
                    startMid = fullStr.indexOf('Pernocta') + 8; // "Pernocta".length = 8
                } else {
                    startMid = limitLeft + arrSched.length;
                }

                const endMid = fullStr.indexOf(depSched);
                const midText = fullStr.substring(startMid, endMid).trim();

                // Expect: [Pax Arr]? [Dep Flight] [Dest]
                // Pax Arr is number at start
                const midTokens = midText.split(/\s+/);
                let arrPax = 0;
                if (/^\d+$/.test(midTokens[0])) {
                    arrPax = parseInt(midTokens.shift());
                }

                const midRem = midTokens.join(' ');
                // Dep Flight
                const depFlightMatch = midRem.match(flightRx);
                let depFlight = '', dest = '';
                if (depFlightMatch) {
                    depFlight = depFlightMatch[0];
                    dest = midRem.replace(depFlight, '').trim();
                } else {
                    dest = midRem;
                }

                // Zone B: After DepReal
                const startRight = fullStr.indexOf(depReal) + depReal.length;
                const rightText = fullStr.substring(startRight).trim();

                // Expect: [Pax Dep]? [Matricula] [Optional Garbage]
                const rightTokens = rightText.split(/\s+/);
                let depPax = 0, matricula = '';

                if (/^\d+$/.test(rightTokens[0])) {
                    depPax = parseInt(rightTokens[0]);
                    matricula = rightTokens[1] || '';
                } else {
                    matricula = rightTokens[0] || '';
                }

                // Cleanup Matricula: should be alphanumeric only, usually XA-... or N...
                // If it contains "demora", "observaciones", etc, ignore those
                // Just take the first token and strip non-alphanumeric chars if needed?
                // Actually some Matriculas are just "XA-VVD".
                // If the token is "00:53" (timestamp-like), that's not matricula.
                if (matricula.includes(':') || matricula.length > 10) {
                    // Suspicious. Maybe Matricula is missing and we grabbed "Demora"?
                    // Or Matricula is actually the previous token?
                    // In the screenshot: "... 0 5X 321 Louisville ... 0 00:53 de su demora."
                    // 5X 321 is Dep Flight. Dest is Louisville. Dep Time... Dep Real...
                    // Pax Dep 0.
                    // Matricula is missing?? Or maybe "5X 320" (Arr Flight) is the same aircraft?
                    // Usually yes.
                    // If matricula looks wrong, leave empty or try to clean.
                    // Let's assume alphanumeric + hyphen only for matricula.
                    if (!/^[A-Z0-9-]+$/.test(matricula)) {
                        // Clean it?
                        // If it starts with -, it's trash.
                        // If it's a time, it's trash.
                        if (matricula.match(/^\d{1,2}:\d{2}/)) matricula = '';
                        if (matricula.startsWith('-')) matricula = '';
                    }
                }

                extracted.push({
                    seq_no: seq,
                    aerolinea: airline,
                    vuelo_llegada: arrFlight,
                    origen: origin,
                    fecha_hora_prog_llegada: arrSched,
                    fecha_hora_real_llegada: arrReal,
                    pasajeros_llegada: arrPax,
                    vuelo_salida: depFlight,
                    destino: dest,
                    fecha_hora_prog_salida: depSched,
                    fecha_hora_real_salida: depReal,
                    pasajeros_salida: depPax,
                    matricula: matricula
                });
            }
        }

        console.log("Parsed Rows:", extracted);
        return extracted;
    }

    // --- DB SAVE ---
    async function saveToDatabase(rows) {
        const supabase = window.supabaseClient;
        console.log("Procesando " + rows.length + " filas para guardar...");

        // Prepare rows for DB: Group by 'date'
        const grouped = {};
        let skippedCount = 0;

        rows.forEach((r, index) => {
            // NORMALIZE SPANISH KEYS & SNAKE_CASE (Explicit mapping based on user JSON variants)
            // Time/Date Fields
            if (!r.fecha_hora_prog_llegada) r.fecha_hora_prog_llegada = r['Hora programada_llegada'] || r.hora_programada_llegada || r.hora_prog_llegada;
            if (!r.fecha_hora_real_llegada) r.fecha_hora_real_llegada = r['Hora de salida_llegada'] || r.hora_real_llegada || r.hora_llegada;
            if (!r.fecha_hora_prog_salida) r.fecha_hora_prog_salida = r['Hora programada_salida'] || r.hora_programada_salida || r.hora_prog_salida;
            if (!r.fecha_hora_real_salida) r.fecha_hora_real_salida = r['Hora de salida_salida'] || r.hora_real_salida || r.hora_salida;

            // Flight Info
            if (!r.vuelo_llegada) r.vuelo_llegada = r['Vuelo de llegada'];
            if (!r.vuelo_salida) r.vuelo_salida = r['Vuelo de salida'];
            
            // Pax
            if (r.pasajeros_llegada === undefined) r.pasajeros_llegada = r['Pasajeros llegada'];
            if (r.pasajeros_salida === undefined) r.pasajeros_salida = r['Pasajeros salida'];

            // Others
            if (!r.matricula) r.matricula = r['Matrícula'];
            if (!r.origen) r.origen = r['Origen'];
            if (!r.destino) r.destino = r['Destino'];
            if (!r.aerolinea) r.aerolinea = r['aerolinea']; // Ensure copy if needed
            if (!r.categoria) r.categoria = r['categoría'];

            // Normalize Data for Table Display
            if (!r.fecha_hora_real_llegada && r.fecha_llegada && r.hora_llegada) {
                r.fecha_hora_real_llegada = `${r.fecha_llegada} ${r.hora_llegada}`;
            }
            if (!r.fecha_hora_real_salida && r.fecha_salida && r.hora_salida) {
                r.fecha_hora_real_salida = `${r.fecha_salida} ${r.hora_salida}`;
            }
            // Map 'no' to 'seq_no' if missing
            if (r.seq_no === undefined && r.no !== undefined) {
                r.seq_no = r.no;
            }

            // Use real as prog if prog is missing
            if (!r.fecha_hora_prog_llegada) r.fecha_hora_prog_llegada = r.fecha_hora_real_llegada;
            if (!r.fecha_hora_prog_salida) r.fecha_hora_prog_salida = r.fecha_hora_real_salida;


            // Determine grouping date
            let dateVal = r.date || r.fecha || null;

            // Simple normalize for DD/MM/YYYY to YYYY-MM-DD
            if (dateVal && typeof dateVal === 'string' && dateVal.includes('/')) {
                const parts = dateVal.trim().split(' ')[0].split('/');
                if (parts.length === 3) {
                    // Start from end (Year) if standard DD/MM/YYYY or MM/DD/YYYY? 
                    // Usually DD/MM/YYYY in Mexico (User locale implied by Spanish keys)
                    dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                }
            }

            // Try explicit new fields with robust cleaning
            if (!dateVal) {
                const tryParse = (str) => {
                    if (!str || typeof str !== 'string') return null;
                    if (str.toLowerCase().includes('pernocta')) return null; // Skip pernocta text

                    const clean = str.trim().split(' ')[0]; // Drop time if present (e.g. "08/01/2026 10:30")
                    if (clean.includes('/')) {
                        const parts = clean.split('/');
                        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD/MM/YYYY -> YYYY-MM-DD
                    }
                    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean; // Already ISO
                    return null;
                };

                // Prioritize keys from the JSON
                dateVal = tryParse(r.fecha_hora_prog_llegada) ||
                    tryParse(r.fecha_hora_real_llegada) ||
                    tryParse(r.fecha_hora_prog_salida) ||
                    tryParse(r.fecha_hora_real_salida) ||
                    tryParse(r.fecha_llegada) ||
                    tryParse(r.fecha_salida);
            }

            // Fallback to old heuristic
            if (!dateVal) {
                const progLlegada = r.fecha_hora_prog_llegada || '';
                const refDateStr = (progLlegada.includes('/')) ? progLlegada : (r.fecha_hora_prog_salida || '');
                if (refDateStr && typeof refDateStr === 'string') {
                    const clean = refDateStr.trim().split(' ')[0];
                    const parts = clean.split('/');
                    if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            if (!dateVal) {
                skippedCount++;
                if (skippedCount <= 3) console.warn('Fila sin fecha (skip):', r);
                return;
            }

            if (!grouped[dateVal]) grouped[dateVal] = [];
            grouped[dateVal].push(r);
        });

        const datesToUpdate = Object.keys(grouped);
        console.log("Fechas encontradas:", datesToUpdate);

        if (datesToUpdate.length === 0) {
            // Debugging Alert
            const firstRow = rows[0] ? JSON.stringify(rows[0], null, 2) : "N/A";
            alert(`No se pudieron determinar fechas válidas.\nFilas totales: ${rows.length}\nFilas omitidas: ${skippedCount}\n\nEjemplo primera fila recibida:\n${firstRow}`);
            return;
        }

        // For each date, we perform a REPLACE operation (Delete then Insert)
        // This avoids issues with Primary Keys or ON CONFLICT requirements

        for (const d of datesToUpdate) {
            const flightArray = grouped[d];
            console.log(`Guardando fecha ${d}: Eliminando anterior e insertando ${flightArray.length} filas nuevas...`);

            // 1. Delete existing record for this date (if any)
            const { error: delError } = await supabase
                .from('vuelos_parte_operaciones')
                .delete()
                .eq('date', d);

            if (delError) {
                console.error(`Error deleting for ${d}:`, delError);
                // We continue even if delete fails (maybe it didn't exist, or specific RLS issue) 
                // but typically we want to warn. If delete fails significantly, insert might duplicate if there's no PK.
                // But user removed PK. So we MUST delete to avoid duplicates.
                if (delError.code !== 'PGRST116') { // PGRST116 is result mismatch, usually fine for delete? No, delete doesn't return data by default.
                    alert(`Advertencia al limpiar fecha ${d}: ${delError.message}`);
                }
            }

            // 2. Insert new record
            const { error: insError } = await supabase
                .from('vuelos_parte_operaciones')
                .insert({
                    date: d,
                    data: flightArray
                });

            if (insError) {
                console.error(`Error inserting for ${d}:`, insError);
                alert(`Error al guardar fecha ${d}:\n${insError.message}\n\nDetalle: ${insError.details || ''}`);
                return; // Stop on error
            }
        }

        alert(`Información guardada correctamente para ${datesToUpdate.length} fecha(s): ${datesToUpdate.join(', ')}`);

        // Try to update view to the first date found
        if (datesToUpdate.length > 0) {
            const firstDate = datesToUpdate[0];
            const dateInput = document.getElementById('operations-summary-date');
            if (dateInput) {
                dateInput.value = firstDate;
                dateInput.dispatchEvent(new Event('change'));
            }
        }
    }

    // --- HELPER: LOGO MAPPING ---
    function getAirlineHtml(airlineName) {
        if (!airlineName) return '';
        const lower = airlineName.toLowerCase().trim();

        const logoMap = {
            'aeromexico': 'logo_aeromexico.png',
            'aeroméxico': 'logo_aeromexico.png',
            'volaris': 'logo_volaris.png',
            'viva': 'logo_viva.png',
            'viva aerobus': 'logo_viva.png',
            'mexicana': 'logo_mexicana.png',
            'mexicana de aviación': 'logo_mexicana.png',
            'copa': 'logo_copa.png',
            'copa airlines': 'logo_copa.png',
            'arajet': 'logo_arajet.png',
            'conviasa': 'logo_conviasa.png',
            'magnicharters': 'logo_magnicharters.png',
            'aerus': 'logo_aerus.png',
            'estafeta': 'logo_estafeta.jpg',
            'ups': 'logo_united_parcel_service.png',
            'united parcel service': 'logo_united_parcel_service.png',
            'fedex': 'logo_fedex_express.png',
            'dhl': 'logo_dhl_guatemala_.png',
            'mas': 'logo_mas.png',
            'mas air': 'logo_mas.png',
            'air canada': 'logo_air_canada_.png',
            'air france': 'logo_air_france_.png',
            'air china': 'logo_air_china.png',
            'china southern': 'logo_china_southern.png',
            'qatar': 'logo_qatar.png',
            'qatar airways': 'logo_qatar.png',
            'turkish': 'logo_turkish_airlines.png',
            'turkish airlines': 'logo_turkish_airlines.png',
            'lufthansa': 'logo_lufthansa.png',
            'emirates': 'logo_emirates_airlines.png',
            'cargojet': 'logo_cargojet.png',
            'atlas air': 'logo_atlas_air.png',
            'atlas': 'logo_atlas_air.png',
            'kalitta': 'logo_kalitta_air.jpg',
            'national': 'logo_national_airlines_cargo.png',
            'tsm': 'logo_tsm_airlines.png',
            'aerounion': 'logo_aero_union.png',
            'aerounión': 'logo_aero_union.png',
            'aero union': 'logo_aero_union.png',
            'aero unión': 'logo_aero_union.png',
            'cargolux': 'logo_cargolux.png',
            'cathay': 'logo_cathay_pacific.png',
            'cathay pacific': 'logo_cathay_pacific.png',
            'suparna': 'logo_suparna.png',
            'suparna airlines': 'logo_suparna.png',
            'awesome': 'logo_awesome_cargo.png',
            'awesome cargo': 'logo_awesome_cargo.png'
        };

        // Find match
        let logoFile = null;
        for (const [key, val] of Object.entries(logoMap)) {
            if (lower.includes(key) || lower === key) {
                logoFile = val;
            }
        }

        // Direct exact lookup first (safer)
        if (logoMap[lower]) logoFile = logoMap[lower];

        // Fallback: iterate and check includes if not found directly
        if (!logoFile) {
            for (const [key, val] of Object.entries(logoMap)) {
                if (lower.includes(key)) {
                    logoFile = val;
                    break;
                }
            }
        }

        if (logoFile) {
            // Logic to visually equalize logo sizes
            // Standard size
            let style = "max-height: 25px; max-width: 70px;";

            // Reduce size for notably bulky/square logos
            if (logoFile === 'logo_viva.png') {
                style = "max-height: 20px; max-width: 60px;";
            }

            // Boost size for logos that naturally look small (horizontal/text-heavy)
            const boostLogos = [
                'logo_aeromexico.png', 'logo_volaris.png', 'logo_mexicana.png',
                'logo_air_china.png', 'logo_tsm_airlines.png', 'logo_kalitta_air.jpg'
            ];

            // Mega size for specific cargo/wide logos requested to be bigger
            const megaLogos = [
                'logo_estafeta.jpg', 'logo_cargojet.png',
                'logo_cargolux.png',
                'logo_suparna.png', 'logo_awesome_cargo.png'
            ];

            // Gigantic size for specifically requested bigger logos
            const giganticLogos = [
                'logo_cathay_pacific.png'
            ];

            if (boostLogos.includes(logoFile)) {
                style = "max-height: 28px; max-width: 80px;";
            } else if (megaLogos.includes(logoFile)) {
                style = "max-height: 30px; max-width: 85px;";
            } else if (giganticLogos.includes(logoFile)) {
                style = "max-height: 32px; max-width: 90px;";
            } else if (logoFile === 'logo_atlas_air.png') {
                style = "max-height: 35px; max-width: 95px;";
            }

            return `<img src="images/airlines/${logoFile}" alt="${airlineName}" title="${airlineName}" class="img-fluid" style="${style}">`;
        }

        return `<span class="fw-bold">${airlineName}</span>`;
    }

    // --- RENDER TABLE ---
    function renderData(data, warningHtml = null, dateRef = null) {
        const tbodyArr = document.getElementById('tbody-ops-flights-arrivals');
        const tbodyDep = document.getElementById('tbody-ops-flights-departures');

        // Ensure dateRef matches current if possible
        if (!dateRef) {
            const dateInput = document.getElementById('vuelos-ops-date');
            if (dateInput) dateRef = dateInput.value;
        }

        const userRole = sessionStorage.getItem('user_role');
        // Force conciliation to be visible for everyone as requested
        const canConciliate = true; // ['admin', 'conciliacion', 'superadmin'].includes(userRole);

        document.querySelectorAll('.col-conciliacion').forEach(el => {
           el.classList.remove('d-none');
        });

        if (tbodyArr) tbodyArr.innerHTML = '';
        if (tbodyDep) tbodyDep.innerHTML = '';

        if (warningHtml) {
            if (tbodyArr) tbodyArr.innerHTML = `<tr><td colspan="8" class="text-center p-3">${warningHtml}</td></tr>`;
            if (tbodyDep && !tbodyArr) tbodyDep.innerHTML = `<tr><td colspan="8" class="text-center p-3">${warningHtml}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            const emptyMsg = '<tr><td colspan="8" class="text-center text-muted py-4">No hay registros (o filtro sin coincidencias)</td></tr>';
            if (tbodyArr) tbodyArr.innerHTML = emptyMsg;
            if (tbodyDep) tbodyDep.innerHTML = emptyMsg;
            updateChart([]);
            return;
        }

        // Helper: Conciliation Cell
        const getConciliacionCell = (type, status, user, time, flightCode, seq) => {
            if (!canConciliate) return '';

            let iconClass = status ? 'fas fa-check-circle text-success fa-lg hover-scale' : 'fas fa-times-circle text-danger opacity-75 fa-lg hover-scale';

            const escapeStr = (str) => (!str ? '' : str.replace(/'/g, "\\'").replace(/"/g, '&quot;'));
            const sUser = escapeStr(user);
            const sCode = escapeStr(flightCode);

            return `
                <td class="text-center align-middle" style="width: 40px; cursor: pointer;" 
                    onclick="window.openConciliacionHistory('${dateRef}', ${seq}, '${type}', ${status}, '${sUser}', '${time}', '${sCode}')">
                    <i class="${iconClass}"></i>
                </td>
             `;
        };

        const matchesFilter = (row, type) => {
            const filters = activeFilters[type];
            const tFilters = textFilters[type];

            // Excel-like Filter (Sets)
            for (const [key, selectedSet] of Object.entries(filters)) {
                if (!selectedSet) continue; // All selected
                const val = getRowValue(row, key);
                if (!selectedSet.has(val)) return false;
            }

            // Text Filter (Inputs)
            for (const [key, searchTxt] of Object.entries(tFilters)) {
                if (!searchTxt) continue;
                const val = getRowValue(row, key).toLowerCase();
                if (!val.includes(searchTxt.toLowerCase())) return false;
            }

            return true;
        };

    const getInput = (val, field, seq, type = 'text', width = '100%', rowType = '') => {
        // Always return raw value if not in edit mode
        if (!isEditMode) return val;
        
        // Ensure value is safe string
        let safeVal = (val !== undefined && val !== null) ? String(val) : '';
        safeVal = safeVal.replace(/"/g, '&quot;'); // Simple escape for quotes

        return `<input type="${type}" class="form-control form-control-sm p-1 ops-input-edit" 
                style="min-width: ${width}; font-size: 0.8rem; height: 30px;"
                data-seq="${seq}" data-field="${field}" data-row-type="${rowType}" value="${safeVal}">`;
    };

        let rowsArr = '';
        let rowsDep = '';

        data.forEach(r => {
            const seq = r.seq_no || r.no || '';
            const airlineName = r.aerolinea || r.Aerolinea || '';
            const airlineHtml = getAirlineHtml(airlineName);

            // --- ARRIVALS ---
            if (matchesFilter(r, 'arrival') && (r.vuelo_llegada || r.origen || r.fecha_hora_prog_llegada)) {
                const arrFlight = r.vuelo_llegada || '';
                const origin = r.origen || '';
                const progArr = r.fecha_hora_prog_llegada || '';
                const realArr = r.fecha_hora_real_llegada || '';
                const paxArr = r.pasajeros_llegada || 0;

                let displayFlight = getInput(arrFlight, 'vuelo_llegada', seq, 'text', '60px', 'arrival');
                let displayOrigin = getInput(origin, 'origen', seq, 'text', '80px', 'arrival');
                let displayProg = getInput(progArr, 'fecha_hora_prog_llegada', seq, 'text', '80px', 'arrival');
                let displayReal = getInput(realArr, 'fecha_hora_real_llegada', seq, 'text', '80px', 'arrival');
                let displayPax = getInput(paxArr, 'pasajeros_llegada', seq, 'number', '50px', 'arrival');

                if (!isEditMode) {
                    displayFlight = `<span class="text-success fw-bold text-nowrap">${arrFlight}</span>`;
                    displayOrigin = `<span class="text-truncate" style="display:block; max-width: 85px;" title="${origin}">${origin}</span>`;
                    displayProg = `<span class="small opacity-75 lh-1">${progArr.replace(' ', '<br>')}</span>`;
                    displayReal = `<span class="fw-bold lh-1">${realArr.replace(' ', '<br>')}</span>`;
                    displayPax = `<span class="fw-bold small lh-1">${paxArr}</span>`;
                }

                const concArr = r.conciliado_llegada === true;
                const concCell = getConciliacionCell('arrival', concArr, r.conciliado_llegada_by, r.conciliado_llegada_at, arrFlight, seq);

                rowsArr += `
                    <tr style="height: 48px;">
                        <td class="fw-bold text-secondary">${seq}</td>
                        <td class="text-center text-truncate" style="max-width: 75px;" title="${airlineName}">${airlineHtml}</td>
                        <td>${displayFlight}</td>
                        <td>${displayOrigin}</td>
                        <td>${displayProg}</td>
                        <td>${displayReal}</td>
                        <td>${displayPax}</td>
                        ${concCell}
                    </tr>
                 `;
            }

            // --- DEPARTURES ---
            if (matchesFilter(r, 'departure') && (r.vuelo_salida || r.destino || r.fecha_hora_prog_salida)) {
                const depFlight = r.vuelo_salida || '';
                const dest = r.destino || '';
                const progDep = r.fecha_hora_prog_salida || '';
                const realDep = r.fecha_hora_real_salida || '';
                const paxDep = r.pasajeros_salida || 0;
                const mat = r.matricula || '';

                let displayFlight = getInput(depFlight, 'vuelo_salida', seq, 'text', '60px', 'departure');
                let displayDest = getInput(dest, 'destino', seq, 'text', '80px', 'departure');
                let displayProg = getInput(progDep, 'fecha_hora_prog_salida', seq, 'text', '80px', 'departure');
                let displayReal = getInput(realDep, 'fecha_hora_real_salida', seq, 'text', '80px', 'departure');
                let displayPax = getInput(paxDep, 'pasajeros_salida', seq, 'number', '50px', 'departure');
                let displayMat = getInput(mat, 'matricula', seq, 'text', '60px', 'departure');

                if (!isEditMode) {
                    displayFlight = `<span class="text-primary fw-bold text-nowrap">${depFlight}</span>`;
                    displayDest = `<span class="text-truncate" style="display:block; max-width: 85px;" title="${dest}">${dest}</span>`;
                    displayProg = `<span class="small opacity-75 lh-1">${progDep.replace(' ', '<br>')}</span>`;
                    displayReal = `<span class="fw-bold lh-1">${realDep.replace(' ', '<br>')}</span>`;
                    displayPax = `<span class="fw-bold small lh-1">${paxDep}</span>`;
                    displayMat = `<span class="font-monospace small text-nowrap text-truncate" style="display:block; max-width: 75px;">${mat}</span>`;
                }

                const concDep = r.conciliado_salida === true;
                const concCell = getConciliacionCell('departure', concDep, r.conciliado_salida_by, r.conciliado_salida_at, depFlight, seq);

                rowsDep += `
                    <tr style="height: 48px;">
                        <td class="text-center text-truncate" style="max-width: 75px;" title="${airlineName}">${airlineHtml}</td>
                        <td>${displayFlight}</td>
                        <td>${displayDest}</td>
                        <td>${displayProg}</td>
                        <td>${displayReal}</td>
                        <td>${displayPax}</td>
                        <td>${displayMat}</td>
                        ${concCell}
                    </tr>
                 `;
            }
        });

        if (tbodyArr) {
            tbodyArr.innerHTML = rowsArr || '<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron resultados</td></tr>';
        }

        if (tbodyDep) {
            tbodyDep.innerHTML = rowsDep || '<tr><td colspan="8" class="text-center text-muted py-4">No se encontraron resultados</td></tr>';
        }

        updateChart(data);
    }


    function updateChart(data) {
        const canvas = document.getElementById('chart-peak-hours-ops');
        if (!canvas) return;

        const arrivals = Array(24).fill(0);
        const departures = Array(24).fill(0);

        data.forEach(row => {
            // Arr Time
            if (row.fecha_hora_real_llegada && row.fecha_hora_real_llegada.includes(':')) {
                const h = parseInt(row.fecha_hora_real_llegada.split(' ')[1].split(':')[0]);
                if (!isNaN(h)) arrivals[h]++;
            }
            // Dep Time
            if (row.fecha_hora_real_salida && row.fecha_hora_real_salida.includes(':')) {
                const h = parseInt(row.fecha_hora_real_salida.split(' ')[1].split(':')[0]);
                if (!isNaN(h)) departures[h]++;
            }
        });

        if (peakChart) peakChart.destroy();
        peakChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => i),
                datasets: [
                    { label: 'Llegadas', data: arrivals, backgroundColor: '#198754' },
                    { label: 'Salidas', data: departures, backgroundColor: '#0d6efd' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } } }
            }
        });
    }

})();