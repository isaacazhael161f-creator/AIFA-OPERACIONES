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
            // Monthly operations (per month per year)
            monthly_operations: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
                    { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
                    { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
                    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
                ]},
                { name: 'comercial_ops', label: 'Comercial - Operaciones', type: 'number' },
                { name: 'comercial_pax', label: 'Comercial - Pasajeros', type: 'number' },
                { name: 'general_ops', label: 'General - Operaciones', type: 'number' },
                { name: 'general_pax', label: 'General - Pasajeros', type: 'number' },
                { name: 'carga_ops', label: 'Carga - Operaciones', type: 'number' },
                { name: 'carga_tons', label: 'Carga - Toneladas', type: 'number', step: '0.01' }
            ],
            // Annual aggregated operations (calculated from monthly)
            annual_operations: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'comercial_ops_total', label: 'Comercial - Operaciones (Total)', type: 'number' },
                { name: 'comercial_pax_total', label: 'Comercial - Pasajeros (Total)', type: 'number' },
                { name: 'general_ops_total', label: 'General - Operaciones (Total)', type: 'number' },
                { name: 'general_pax_total', label: 'General - Pasajeros (Total)', type: 'number' },
                { name: 'carga_ops_total', label: 'Carga - Operaciones (Total)', type: 'number' },
                { name: 'carga_tons_total', label: 'Carga - Toneladas (Total)', type: 'number', step: '0.01' }
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
        if (value == null || value === '') value = 0;
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

        // Monthly / Annual UI listeners
        const monthlyYearSel = document.getElementById('monthly-ops-year');
        if (monthlyYearSel) monthlyYearSel.addEventListener('change', () => this.loadMonthlyOperations());
        const monthlyAddBtn = document.getElementById('monthly-ops-add');
        if (monthlyAddBtn) monthlyAddBtn.addEventListener('click', () => this.addItem('monthly_operations'));
        const annualRefreshBtn = document.getElementById('annual-ops-refresh');
        if (annualRefreshBtn) annualRefreshBtn.addEventListener('click', () => this.loadAnnualOperations());

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
            
            if (table === 'monthly_operations') {
                this.loadMonthlyOperations();
                this.updateAnnualDataAndCharts();
            }
            if (table === 'annual_operations') {
                this.loadAnnualOperations();
                this.syncChartsData();
            }
        });

        // Initial load if section is active (or just load the first tab)
        // this.loadOperationsSummary();
        this.loadMonthlyOperations();
        this.loadAnnualOperations();
        this.syncChartsData();
    }

    loadTabContent(targetId) {
        if (targetId === '#pane-ops-summary') {
            this.loadOperationsSummary();
            // Load the monthly/annual tables when showing the summary pane
            this.loadMonthlyOperations();
            this.loadAnnualOperations();
        }
        if (targetId === '#pane-daily-ops') {
            // Daily operations only
            this.loadDailyOperations();
        }
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
                    tdDate.className = 'text-center';
                    tdDate.textContent = this.formatDisplayDate(item.date);
                    tr.appendChild(tdDate);

                // Commercial
                const tdCom = document.createElement('td');
                tdCom.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-primary fw-bold">Ops:</span> ${this.formatNumber(item.comercial_ops, 'comercial_ops')}<br><small class="text-muted"><span class="text-primary">Pax:</span> ${this.formatNumber(item.comercial_pax, 'comercial_pax')}</small></div></div>`;
                tr.appendChild(tdCom);

                // General
                const tdGen = document.createElement('td');
                tdGen.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-success fw-bold">Ops:</span> ${this.formatNumber(item.general_ops, 'general_ops')}<br><small class="text-muted"><span class="text-success">Pax:</span> ${this.formatNumber(item.general_pax, 'general_pax')}</small></div></div>`;
                tr.appendChild(tdGen);

                // Cargo
                const tdCargo = document.createElement('td');
                tdCargo.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-warning fw-bold">Ops:</span> ${this.formatNumber(item.carga_ops, 'carga_ops')}<br><small class="text-muted"><span class="text-warning">Ton:</span> ${this.formatNumber(item.carga_tons, 'carga_tons')}</small></div></div>`;
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

    async loadMonthlyOperations() {
        try {
            const year = (document.getElementById('monthly-ops-year') || {}).value || '';
            const data = await window.dataManager.getMonthlyOperations(year || undefined);
            
            // Custom render for monthly operations
            const tbody = document.querySelector('#table-monthly-ops tbody');
            tbody.innerHTML = '';

            data.forEach(item => {
                const tr = document.createElement('tr');

                // Year
                const tdYear = document.createElement('td');
                tdYear.className = 'text-center';
                tdYear.textContent = item.year;
                tr.appendChild(tdYear);

                // Month
                const tdMonth = document.createElement('td');
                tdMonth.className = 'text-center';
                // Map numeric month to name
                let displayMonth = item.month;
                // Ensure two-digit string for mapping
                const monthKey = String(displayMonth).padStart(2, '0');
                const map = { '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre' };
                if (map[monthKey]) displayMonth = map[monthKey];
                tdMonth.textContent = displayMonth;
                tr.appendChild(tdMonth);

                // Comercial
                const tdCom = document.createElement('td');
                tdCom.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-primary fw-bold">Ops:</span> ${this.formatNumber(item.comercial_ops, 'comercial_ops')}<br><small class="text-muted"><span class="text-primary">Pax:</span> ${this.formatNumber(item.comercial_pax, 'comercial_pax')}</small></div></div>`;
                tr.appendChild(tdCom);

                // General
                const tdGen = document.createElement('td');
                tdGen.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-success fw-bold">Ops:</span> ${this.formatNumber(item.general_ops, 'general_ops')}<br><small class="text-muted"><span class="text-success">Pax:</span> ${this.formatNumber(item.general_pax, 'general_pax')}</small></div></div>`;
                tr.appendChild(tdGen);

                // Cargo
                const tdCargo = document.createElement('td');
                tdCargo.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-warning fw-bold">Ops:</span> ${this.formatNumber(item.carga_ops, 'carga_ops')}<br><small class="text-muted"><span class="text-warning">Ton:</span> ${this.formatNumber(item.carga_tons, 'carga_tons')}</small></div></div>`;
                tr.appendChild(tdCargo);

                // Actions
                const tdActions = document.createElement('td');
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
                btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                btnEdit.onclick = () => this.editItem('monthly_operations', item);
                tdActions.appendChild(btnEdit);

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn btn-sm btn-outline-danger';
                btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                btnDelete.onclick = () => this.deleteItem('monthly_operations', item.id);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

            // Populate year select with available years
            const years = Array.from(new Set((data || []).map(r => String(r.year)))).sort((a,b) => Number(b)-Number(a));
            const yearSel = document.getElementById('monthly-ops-year');
            if (yearSel) {
                const current = yearSel.value;
                yearSel.innerHTML = '';
                const optAll = document.createElement('option'); optAll.value = ''; optAll.innerText = 'Todos'; yearSel.appendChild(optAll);
                years.forEach(y => {
                    const o = document.createElement('option'); o.value = y; o.innerText = y; yearSel.appendChild(o);
                });
                if (current) yearSel.value = current;
            }
        } catch (err) {
            console.error('Error loading monthly operations:', err);
        }
    }

    async loadAnnualOperations() {
        try {
            // Prefer stored annual aggregates but also include aggregated monthly years
            const [monthly, annualRows] = await Promise.all([
                window.dataManager.getMonthlyOperations(),
                window.dataManager.getAnnualOperations()
            ]);

            const byYear = {};
            // Start from monthly aggregation (works if annual table missing years)
            (monthly || []).forEach(row => {
                const y = String(row.year || '');
                if (!byYear[y]) byYear[y] = { year: y, comercial_ops_total: 0, comercial_pax_total: 0, general_ops_total: 0, general_pax_total: 0, carga_ops_total: 0, carga_tons_total: 0 };
                byYear[y].comercial_ops_total += Number(row.comercial_ops) || 0;
                byYear[y].comercial_pax_total += Number(row.comercial_pax) || 0;
                byYear[y].general_ops_total += Number(row.general_ops) || 0;
                byYear[y].general_pax_total += Number(row.general_pax) || 0;
                byYear[y].carga_ops_total += Number(row.carga_ops) || 0;
                byYear[y].carga_tons_total += Number(row.carga_tons) || 0;
            });

            // Merge/override with explicit annual rows if present (these may be authoritative)
            (annualRows || []).forEach(r => {
                const y = String(r.year || '');
                byYear[y] = {
                    year: y,
                    comercial_ops_total: Number(r.comercial_ops_total) || 0,
                    comercial_pax_total: Number(r.comercial_pax_total) || 0,
                    general_ops_total: Number(r.general_ops_total) || 0,
                    general_pax_total: Number(r.general_pax_total) || 0,
                    carga_ops_total: Number(r.carga_ops_total) || 0,
                    carga_tons_total: Number(r.carga_tons_total) || 0
                };
            });

            const annualData = Object.values(byYear).sort((a,b) => Number(b.year) - Number(a.year));
            this.renderAnnualTableFromData(annualData);
        } catch (err) {
            console.error('Error loading annual operations:', err);
        }
    }

    renderAnnualTableFromData(annualData) {
        const tbody = document.querySelector('#table-annual-ops tbody');
        tbody.innerHTML = '';
        
        annualData.forEach(item => {
            const tr = document.createElement('tr');
            
            // Year
            const tdYear = document.createElement('td');
            tdYear.className = 'text-center';
            tdYear.textContent = item.year;
            tr.appendChild(tdYear);
            
            // Commercial
            const tdCom = document.createElement('td');
            tdCom.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-primary fw-bold">Ops:</span> ${this.formatNumber(item.comercial_ops_total, 'comercial_ops_total')}<br><small class="text-muted"><span class="text-primary">Pax:</span> ${this.formatNumber(item.comercial_pax_total, 'comercial_pax_total')}</small></div></div>`;
            tr.appendChild(tdCom);
            
            // General
            const tdGen = document.createElement('td');
            tdGen.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-success fw-bold">Ops:</span> ${this.formatNumber(item.general_ops_total, 'general_ops_total')}<br><small class="text-muted"><span class="text-success">Pax:</span> ${this.formatNumber(item.general_pax_total, 'general_pax_total')}</small></div></div>`;
            tr.appendChild(tdGen);
            
            // Cargo
            const tdCargo = document.createElement('td');
            tdCargo.innerHTML = `<div class="d-flex align-items-center justify-content-center gap-2"><div><span class="text-warning fw-bold">Ops:</span> ${this.formatNumber(item.carga_ops_total, 'carga_ops_total')}<br><small class="text-muted"><span class="text-warning">Ton:</span> ${this.formatNumber(item.carga_tons_total, 'carga_tons_total')}</small></div></div>`;
            tr.appendChild(tdCargo);
            
            // Actions
            const tdActions = document.createElement('td');
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
            btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
            btnEdit.onclick = () => this.editItem('annual_operations', item);
            tdActions.appendChild(btnEdit);

            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn btn-sm btn-outline-danger';
            btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
            btnDelete.onclick = () => this.deleteItem('annual_operations', item.id);
            tdActions.appendChild(btnDelete);
            
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
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

                // Alignment: center for year/month, right for numeric, left otherwise
                if (col === 'year' || col === 'month') {
                    td.classList.add('text-center');
                } else if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
                    td.classList.add('text-end');
                }

                // If column is month, try to show the label (01 -> Enero) using schema options when available
                if (col === 'month') {
                    let display = raw == null ? '' : String(raw);
                    try {
                        const schema = this.schemas[tableName] || [];
                        const fld = schema.find(f => f.name === 'month');
                        if (fld && fld.options) {
                            const opt = fld.options.find(o => o.value === display || o.value === String(Number(display)).padStart(2,'0'));
                            if (opt) display = opt.label || opt.value;
                        } else {
                            // Fallback: map numeric month '01'..'12' to Spanish names
                            const map = { '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre' };
                            if (map[display]) display = map[display];
                        }
                    } catch (e) {
                        // ignore
                    }
                    td.textContent = display;
                }
                // Format any date-like column (name contains 'date' or is exactly 'date')
                else if (col && String(col).toLowerCase().includes('date')) {
                    td.textContent = this.formatDisplayDate(raw);
                } else if (col === 'year') {
                    // Do not apply thousands separator to year values
                    td.textContent = raw == null ? '' : String(raw);
                }
                // Operations summary: show aviation type icon in category column
                else if (tableName === 'operations_summary' && col === 'category') {
                    const v = raw == null ? '' : String(raw);
                    let icon = '<i class="fas fa-plane text-primary" aria-hidden="true"></i>';
                    // Normalize
                    const lv = v.toLowerCase();
                    if (lv.includes('carga')) icon = '<i class="fas fa-boxes text-warning" aria-hidden="true"></i>';
                    else if (lv.includes('general') || lv.includes('operacion') || lv.includes('operaciones')) icon = '<i class="fas fa-helicopter text-success" aria-hidden="true"></i>';
                    else icon = '<i class="fas fa-plane text-primary" aria-hidden="true"></i>';
                    td.innerHTML = `${icon} <span class="ms-1">${v}</span>`;
                } else if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
                    td.textContent = this.formatNumber(raw, col);
                } else {
                    td.textContent = raw == null ? '' : raw;
                }

                tr.appendChild(td);
            });

            // Apply row color based on category (operations_summary)
            try {
                if (tableName === 'operations_summary') {
                    const catVal = String((item.category || '')).toLowerCase();
                    if (catVal.includes('carga')) tr.classList.add('table-warning');
                    else if (catVal.includes('general') || catVal.includes('operacion')) tr.classList.add('table-success');
                    else tr.classList.add('table-primary');
                }
            } catch (e) {
                // ignore
            }

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

    async updateAnnualDataAndCharts() {
        try {
            // 1. Fetch latest monthly data
            const monthly = await window.dataManager.getMonthlyOperations();
            
            // 2. Calculate Annual Data in memory
            const byYear = {};
            monthly.forEach(row => {
                const y = String(row.year || '');
                if (!byYear[y]) byYear[y] = { 
                    year: y,
                    comercial_ops_total: 0, comercial_pax_total: 0, 
                    general_ops_total: 0, general_pax_total: 0, 
                    carga_ops_total: 0, carga_tons_total: 0 
                };
                byYear[y].comercial_ops_total += Number(row.comercial_ops) || 0;
                byYear[y].comercial_pax_total += Number(row.comercial_pax) || 0;
                byYear[y].general_ops_total += Number(row.general_ops) || 0;
                byYear[y].general_pax_total += Number(row.general_pax) || 0;
                byYear[y].carga_ops_total += Number(row.carga_ops) || 0;
                byYear[y].carga_tons_total += Number(row.carga_tons) || 0;
            });
            
            // 3. Update UI (Charts) IMMEDIATELY using in-memory data
            if (!window.staticData) window.staticData = {};
            
            // Map Monthly for Charts
            const mappedMonthly = {
                comercial: [], comercialPasajeros: [],
                carga: [], cargaToneladas: [],
                general: { operaciones: [], pasajeros: [] }
            };
            const getMonthName = (monthCode) => {
                const map = { '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre' };
                const key = String(monthCode).padStart(2, '0');
                return map[key] || key;
            };
            monthly.forEach(m => {
                const label = getMonthName(m.month);
                mappedMonthly.comercial.push({ mes: m.month, operaciones: m.comercial_ops, label });
                mappedMonthly.comercialPasajeros.push({ mes: m.month, pasajeros: m.comercial_pax, label });
                mappedMonthly.carga.push({ mes: m.month, operaciones: m.carga_ops, label });
                mappedMonthly.cargaToneladas.push({ mes: m.month, toneladas: m.carga_tons, label });
                mappedMonthly.general.operaciones.push({ mes: m.month, operaciones: m.general_ops, label });
                mappedMonthly.general.pasajeros.push({ mes: m.month, pasajeros: m.general_pax, label });
            });
            window.staticData.mensual2025 = mappedMonthly;

            // Map Annual for Charts (using calculated byYear)
            const annualDataList = Object.values(byYear).sort((a,b) => Number(b.year) - Number(a.year));
            const mappedAnnual = { comercial: [], carga: [], general: [] };
            annualDataList.forEach(a => {
                mappedAnnual.comercial.push({ periodo: a.year, operaciones: a.comercial_ops_total, pasajeros: a.comercial_pax_total });
                mappedAnnual.carga.push({ periodo: a.year, operaciones: a.carga_ops_total, toneladas: a.carga_tons_total });
                mappedAnnual.general.push({ periodo: a.year, operaciones: a.general_ops_total, pasajeros: a.general_pax_total });
            });
            window.staticData.operacionesTotales = mappedAnnual;

            // Render Charts
            if (typeof window.renderOperacionesTotales === 'function') {
                window.renderOperacionesTotales();
            }
            
            // 4. Update Annual Table UI (using calculated data directly to be fast)
            this.renderAnnualTableFromData(annualDataList);

            // 5. Persist to DB (Background)
            const updatePromises = Object.keys(byYear).map(year => 
                window.dataManager.upsertAnnualOperation(year, byYear[year])
            );
            
            // Optional: Log when done
            Promise.all(updatePromises).then(() => {
                console.log('Annual data synced to DB');
            }).catch(err => console.error('Error saving annual data:', err));

        } catch (e) {
            console.error('Error updating charts and annual data:', e);
        }
    }

    async syncChartsData() {
        try {
            const monthly = await window.dataManager.getMonthlyOperations();
            const annual = await window.dataManager.getAnnualOperations();

            if (!window.staticData) window.staticData = {};
            
            const mappedMonthly = {
                comercial: [], comercialPasajeros: [],
                carga: [], cargaToneladas: [],
                general: { operaciones: [], pasajeros: [] }
            };
            
            const getMonthName = (monthCode) => {
                const map = { '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre' };
                const key = String(monthCode).padStart(2, '0');
                return map[key] || key;
            };

            monthly.forEach(m => {
                const label = getMonthName(m.month);
                mappedMonthly.comercial.push({ mes: m.month, operaciones: m.comercial_ops, label });
                mappedMonthly.comercialPasajeros.push({ mes: m.month, pasajeros: m.comercial_pax, label });
                mappedMonthly.carga.push({ mes: m.month, operaciones: m.carga_ops, label });
                mappedMonthly.cargaToneladas.push({ mes: m.month, toneladas: m.carga_tons, label });
                mappedMonthly.general.operaciones.push({ mes: m.month, operaciones: m.general_ops, label });
                mappedMonthly.general.pasajeros.push({ mes: m.month, pasajeros: m.general_pax, label });
            });
            
            window.staticData.mensual2025 = mappedMonthly;
            
            const mappedAnnual = {
                comercial: [],
                carga: [],
                general: []
            };
            
            annual.forEach(a => {
                mappedAnnual.comercial.push({ periodo: a.year, operaciones: a.comercial_ops_total, pasajeros: a.comercial_pax_total });
                mappedAnnual.carga.push({ periodo: a.year, operaciones: a.carga_ops_total, toneladas: a.carga_tons_total });
                mappedAnnual.general.push({ periodo: a.year, operaciones: a.general_ops_total, pasajeros: a.general_pax_total });
            });
            
            window.staticData.operacionesTotales = mappedAnnual;
            
            if (typeof window.renderOperacionesTotales === 'function') {
                window.renderOperacionesTotales();
            }
        } catch (e) {
            console.error('Error syncing charts data:', e);
        }
    }
}

window.dataManagement = new DataManagement();
