class DataManagement {
    constructor() {
        this.schemas = {
            operations_summary: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                    { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                    { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                ]},
                { name: 'category', label: 'Categoría', type: 'select', options: [
                    { value: 'Pasajeros', label: 'Pasajeros' },
                    { value: 'Operaciones', label: 'Operaciones' },
                    { value: 'Carga', label: 'Carga' }
                ]},
                { name: 'metric', label: 'Métrica', type: 'text' },
                { name: 'value', label: 'Valor', type: 'number' }
            ],
            daily_operations: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'comercial_ops', label: 'Comercial - Operaciones', type: 'number' },
                { name: 'comercial_pax', label: 'Comercial - Pasajeros', type: 'number' },
                { name: 'general_ops', label: 'General - Operaciones', type: 'number' },
                { name: 'general_pax', label: 'General - Pasajeros', type: 'number' },
                { name: 'carga_ops', label: 'Carga - Operaciones', type: 'number' },
                { name: 'carga_tons', label: 'Carga - Toneladas', type: 'number', step: '0.01' },
                { name: 'carga_cutoff_date', label: 'Carga - Fecha Corte', type: 'date' },
                { name: 'carga_cutoff_note', label: 'Carga - Nota Corte', type: 'text' }
            ],
            flight_itinerary: [
                { name: 'flight_number', label: 'No. Vuelo', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'origin_destination', label: 'Origen/Destino', type: 'text' },
                { name: 'arrival_date', label: 'Fecha', type: 'date' },
                { name: 'arrival_time', label: 'Hora', type: 'time' },
                { name: 'status', label: 'Estado', type: 'select', options: [
                    { value: 'Programado', label: 'Programado' },
                    { value: 'Aterrizó', label: 'Aterrizó' },
                    { value: 'Demorado', label: 'Demorado' },
                    { value: 'Cancelado', label: 'Cancelado' }
                ]},
                { name: 'gate', label: 'Puerta', type: 'text' },
                { name: 'terminal', label: 'Terminal', type: 'text' }
            ],
            wildlife_incidents: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'species', label: 'Especie', type: 'text' },
                { name: 'location', label: 'Ubicación', type: 'text' },
                { name: 'action_taken', label: 'Acción Tomada', type: 'text' },
                { name: 'remarks', label: 'Observaciones', type: 'textarea' }
            ],
            medical_attentions: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                    { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                    { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                ]},
                { name: 'aifa_personnel', label: 'Personal AIFA', type: 'number' },
                { name: 'other_companies', label: 'Otras Empresas', type: 'number' },
                { name: 'passengers', label: 'Pasajeros', type: 'number' },
                { name: 'visitors', label: 'Visitantes', type: 'number' },
                { name: 'total', label: 'Total', type: 'number', readonly: true } // Often calculated, but let's keep it for now
            ],
            delays: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                    { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                    { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                ]},
                { name: 'cause', label: 'Causa', type: 'text' },
                { name: 'count', label: 'Cantidad', type: 'number' },
                { name: 'description', label: 'Descripción', type: 'textarea' }
            ],
            punctuality: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                    { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                    { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                ]},
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'on_time', label: 'A Tiempo', type: 'number' },
                { name: 'delayed', label: 'Demorado', type: 'number' },
                { name: 'cancelled', label: 'Cancelado', type: 'number' },
                { name: 'total_flights', label: 'Total Vuelos', type: 'number' }
            ]
        };

        this.init();
    }

    // Formatea fechas ISO (YYYY-MM-DD) a DD-MM-YY para mostrar en tablas
    formatDisplayDate(value) {
        if (!value) return '';
        const s = String(value).trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
        if (m) {
            const [, yyyy, mm, dd] = m;
            return `${dd}-${mm}-${yyyy.slice(2)}`;
        }
        return s;
    }

    // Formatea números con separadores de miles (ej. 21323 -> 21,323)
    formatNumber(value, colName) {
        if (value == null || value === '') return '';
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value);

        // Decide decimales según la columna
        let options = {};
        if (colName === 'carga_tons') {
            options = { minimumFractionDigits: 0, maximumFractionDigits: 2 };
        }
        // Use en-US to produce commas as thousands separators
        try {
            return n.toLocaleString('en-US', options);
        } catch (e) {
            return String(value);
        }
    }

    init() {
        // Listen for tab changes to load data
        const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabEls.forEach(tabEl => {
            tabEl.addEventListener('shown.bs.tab', event => {
                const targetId = event.target.getAttribute('data-bs-target');
                this.loadTabContent(targetId);
            });
        });

        // Listen for filter changes
        document.getElementById('filter-ops-year').addEventListener('change', () => this.loadOperationsSummary());
        document.getElementById('filter-daily-ops-date').addEventListener('change', () => this.loadDailyOperations());
        const monthEl = document.getElementById('filter-daily-ops-month');
        if (monthEl) monthEl.addEventListener('change', () => this.loadDailyOperations());
        // Category filter removed — no listener required
        document.getElementById('filter-itinerary-date').addEventListener('change', () => this.loadItinerary());
        document.getElementById('filter-medical-year').addEventListener('change', () => this.loadMedical());
        document.getElementById('filter-delays-year').addEventListener('change', () => this.loadDelays());
        document.getElementById('filter-delays-month').addEventListener('change', () => this.loadDelays());
        document.getElementById('filter-punctuality-year').addEventListener('change', () => this.loadPunctuality());
        document.getElementById('filter-punctuality-month').addEventListener('change', () => this.loadPunctuality());

        // Listen for data updates to refresh tables
        window.addEventListener('data-updated', (e) => {
            // Refresh the current active tab or specific table
            // For simplicity, reload the relevant table based on the table name
            const table = e.detail.table;
            if (table === 'operations_summary') this.loadOperationsSummary();
            if (table === 'daily_operations') this.loadDailyOperations();
            if (table === 'flight_itinerary') this.loadItinerary();
            if (table === 'wildlife_incidents') this.loadWildlife();
            if (table === 'medical_attentions') this.loadMedical();
            if (table === 'delays') this.loadDelays();
            if (table === 'punctuality') this.loadPunctuality();
        });

        // Initial load if section is active (or just load the first tab)
        // this.loadOperationsSummary();
    }

    loadTabContent(targetId) {
        if (targetId === '#pane-ops-summary') this.loadOperationsSummary();
        if (targetId === '#pane-daily-ops') this.loadDailyOperations();
        if (targetId === '#pane-itinerary') this.loadItinerary();
        if (targetId === '#pane-wildlife') this.loadWildlife();
        if (targetId === '#pane-medical') this.loadMedical();
        if (targetId === '#pane-delays') this.loadDelays();
        if (targetId === '#pane-punctuality') this.loadPunctuality();
    }

    async loadOperationsSummary() {
        const year = document.getElementById('filter-ops-year').value;
        try {
            const data = await window.dataManager.getOperationsSummary(year);
            this.renderTable('table-ops-summary', data, ['year', 'month', 'category', 'metric', 'value'], 'operations_summary');
        } catch (error) {
            console.error('Error loading operations summary:', error);
        }
    }

    async loadDailyOperations() {
        try {
            const data = await window.dataManager.getDailyOperations();
            const dateFilter = document.getElementById('filter-daily-ops-date').value;
            const monthFilter = (document.getElementById('filter-daily-ops-month') || {}).value || '';
            let filteredData = data;
            if (dateFilter) {
                // Exact date selected (YYYY-MM-DD)
                filteredData = data.filter(item => item.date === dateFilter);
            } else if (monthFilter) {
                // Filter by month (MM)
                filteredData = data.filter(item => {
                    if (!item || !item.date) return false;
                    const m = String(item.date).slice(5,7);
                    return m === monthFilter;
                });
            }
            // Category filtering removed — show all rows matching date/month filters
            
            // Custom render for complex columns
            const tbody = document.querySelector('#table-daily-ops tbody');
            tbody.innerHTML = '';

            filteredData.forEach(item => {
                    const tr = document.createElement('tr');

                    // Date
                    const tdDate = document.createElement('td');
                    tdDate.textContent = this.formatDisplayDate(item.date);
                    tr.appendChild(tdDate);

                // Commercial
                const tdCom = document.createElement('td');
                tdCom.innerHTML = `<div class="d-flex align-items-center gap-2"><i class="fas fa-plane text-primary" aria-hidden="true"></i><div>Ops: ${this.formatNumber(item.comercial_ops, 'comercial_ops')}<br><small class="text-muted">Pax: ${this.formatNumber(item.comercial_pax, 'comercial_pax')}</small></div></div>`;
                tr.appendChild(tdCom);

                // General
                const tdGen = document.createElement('td');
                tdGen.innerHTML = `<div class="d-flex align-items-center gap-2"><i class="fas fa-helicopter text-success" aria-hidden="true"></i><div>Ops: ${this.formatNumber(item.general_ops, 'general_ops')}<br><small class="text-muted">Pax: ${this.formatNumber(item.general_pax, 'general_pax')}</small></div></div>`;
                tr.appendChild(tdGen);

                // Cargo
                const tdCargo = document.createElement('td');
                tdCargo.innerHTML = `<div class="d-flex align-items-center gap-2"><i class="fas fa-boxes text-warning" aria-hidden="true"></i><div>Ops: ${this.formatNumber(item.carga_ops, 'carga_ops')}<br><small class="text-muted">Ton: ${this.formatNumber(item.carga_tons, 'carga_tons')}</small></div></div>`;
                tr.appendChild(tdCargo);

                // Actions
                const tdActions = document.createElement('td');
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
                btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                btnEdit.onclick = () => this.editItem('daily_operations', item);
                tdActions.appendChild(btnEdit);

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn btn-sm btn-outline-danger';
                btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                btnDelete.onclick = () => this.deleteItem('daily_operations', item.id);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error loading daily operations:', error);
        }
    }

    async loadItinerary() {
        // Note: getFlightItinerary currently fetches all, might need date filter in DataManager
        // For now, we'll filter client side or update DataManager later
        try {
            const data = await window.dataManager.getFlightItinerary();
            const dateFilter = document.getElementById('filter-itinerary-date').value;
            let filteredData = data;
            if (dateFilter) {
                filteredData = data.filter(item => item.arrival_date === dateFilter);
            }
            this.renderTable('table-itinerary', filteredData, ['flight_number', 'airline', 'origin_destination', 'arrival_time', 'status'], 'flight_itinerary');
        } catch (error) {
            console.error('Error loading itinerary:', error);
        }
    }

    async loadWildlife() {
        try {
            const data = await window.dataManager.getWildlifeIncidents();
            this.renderTable('table-wildlife', data, ['date', 'time', 'species', 'location'], 'wildlife_incidents');
        } catch (error) {
            console.error('Error loading wildlife:', error);
        }
    }

    async loadMedical() {
        const year = document.getElementById('filter-medical-year').value;
        try {
            const data = await window.dataManager.getMedicalAttentions(year);
            this.renderTable('table-medical', data, ['month', 'aifa_personnel', 'other_companies', 'passengers', 'visitors', 'total'], 'medical_attentions');
        } catch (error) {
            console.error('Error loading medical:', error);
        }
    }

    async loadDelays() {
        const year = document.getElementById('filter-delays-year').value;
        const month = document.getElementById('filter-delays-month').value;
        try {
            const data = await window.dataManager.getDelays(year, month);
            this.renderTable('table-delays', data, ['month', 'cause', 'count', 'description'], 'delays');
        } catch (error) {
            console.error('Error loading delays:', error);
        }
    }

    async loadPunctuality() {
        const year = document.getElementById('filter-punctuality-year').value;
        const month = document.getElementById('filter-punctuality-month').value;
        try {
            const data = await window.dataManager.getPunctuality(year, month);
            this.renderTable('table-punctuality', data, ['month', 'airline', 'on_time', 'delayed', 'cancelled', 'total_flights'], 'punctuality');
        } catch (error) {
            console.error('Error loading punctuality:', error);
        }
    }

    renderTable(tableId, data, columns, tableName) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';

        data.forEach(item => {
            const tr = document.createElement('tr');
            
            columns.forEach(col => {
                const td = document.createElement('td');
                const raw = item[col];
                // Format any date-like column (name contains 'date' or is exactly 'date')
                if (col && String(col).toLowerCase().includes('date')) {
                    td.textContent = this.formatDisplayDate(raw);
                } else if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
                    td.textContent = this.formatNumber(raw, col);
                } else {
                    td.textContent = raw == null ? '' : raw;
                }
                tr.appendChild(td);
            });

            // Actions column
            const tdActions = document.createElement('td');
            
            // Edit Button
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
            btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
            btnEdit.onclick = () => this.editItem(tableName, item);
            tdActions.appendChild(btnEdit);

            // Delete Button
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn btn-sm btn-outline-danger';
            btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
            btnDelete.onclick = () => this.deleteItem(tableName, item.id);
            tdActions.appendChild(btnDelete);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    }

    addItem(tableName) {
        const schema = this.schemas[tableName];
        if (schema) {
            window.adminUI.openEditModal(tableName, null, schema);
        }
    }

    editItem(tableName, item) {
        const schema = this.schemas[tableName];
        if (schema) {
            window.adminUI.openEditModal(tableName, item, schema);
        }
    }

    deleteItem(tableName, id) {
        window.adminUI.deleteRecord(tableName, id);
    }
}

window.dataManagement = new DataManagement();
