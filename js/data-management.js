class DataManagement {
    constructor() {
        this.airlineConfig = {
            'aeromexico': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
            'volaris': { logo: 'logo_volaris.png', color: '#a300e6', text: '#ffffff' },
            'viva-aerobus': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
            'viva': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
            'mexicana': { logo: 'logo_mexicana.png', color: '#008375', text: '#ffffff' },
            'copa-airlines': { logo: 'logo_copa.png', color: '#00529b', text: '#ffffff' },
            'arajet': { logo: 'logo_arajet.png', color: '#632683', text: '#ffffff' },
            'conviasa': { logo: 'logo_conviasa.png', color: '#e65300', text: '#ffffff' },
            'magnicharters': { logo: 'logo_magnicharters.png', color: '#1d3c6e', text: '#ffffff' },
            'aerus': { logo: 'logo_aerus.png', color: '#bed62f', text: '#000000' },
            'default': { logo: null, color: '#ffffff', text: '#212529' }
        };

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
                { name: 'description', label: 'Descripción', type: 'textarea' },
                { name: 'observations', label: 'Observaciones', type: 'textarea' }
            ],
            weekly_frequencies: [
                { name: 'week_label', label: 'Etiqueta Semana (ej. 08-14 Dic 2025)', type: 'text' },
                { name: 'valid_from', label: 'Válido Desde', type: 'date' },
                { name: 'valid_to', label: 'Válido Hasta', type: 'date' },
                { name: 'route_id', label: 'ID Ruta', type: 'number' },
                { name: 'city', label: 'Ciudad', type: 'text' },
                { name: 'state', label: 'Estado', type: 'text' },
                { name: 'iata', label: 'Código IATA', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'monday', label: 'Lunes', type: 'number' },
                { name: 'tuesday', label: 'Martes', type: 'number' },
                { name: 'wednesday', label: 'Miércoles', type: 'number' },
                { name: 'thursday', label: 'Jueves', type: 'number' },
                { name: 'friday', label: 'Viernes', type: 'number' },
                { name: 'saturday', label: 'Sábado', type: 'number' },
                { name: 'sunday', label: 'Domingo', type: 'number' },
                { name: 'weekly_total', label: 'Total Semanal', type: 'number', readonly: true }
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

    // Formatea fechas ISO (YYYY-MM-DD) a formato largo (27 de Diciembre de 2025)
    formatDisplayDate(value) {
        if (!value) return '';
        const s = String(value).trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
        if (m) {
            const [, yyyy, mm, dd] = m;
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthName = months[parseInt(mm, 10) - 1];
            return `${parseInt(dd, 10)} de ${monthName} de ${yyyy}`;
        }
        return s;
    }

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start
            .replace(/-+$/, '');            // Trim - from end
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
        // document.getElementById('filter-ops-year').addEventListener('change', () => this.loadOperationsSummary());
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
        
        const weeklyFreqLabel = document.getElementById('filter-weekly-freq-label');
        if (weeklyFreqLabel) weeklyFreqLabel.addEventListener('change', () => this.loadWeeklyFrequencies());

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
            if (table === 'weekly_frequencies') this.loadWeeklyFrequencies();
            
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
        if (targetId === '#pane-weekly-frequencies') this.loadWeeklyFrequencies();
    }



    async loadOperationsSummary() {
        // const year = document.getElementById('filter-ops-year').value;
        try {
            const data = await window.dataManager.getOperationsSummary();
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
            // 1. Get current selection
            const yearSel = document.getElementById('monthly-ops-year');
            const selectedYear = yearSel ? yearSel.value : '';

            // 2. Fetch ALL data to ensure we have all years for the dropdown
            const allData = await window.dataManager.getMonthlyOperations();
            
            // 3. Populate year select with available years from ALL data
            const years = Array.from(new Set((allData || []).map(r => String(r.year)))).sort((a,b) => Number(b)-Number(a));
            
            if (yearSel) {
                // Rebuild options
                yearSel.innerHTML = '';
                const optAll = document.createElement('option'); optAll.value = ''; optAll.innerText = 'Todos'; yearSel.appendChild(optAll);
                
                years.forEach(y => {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.innerText = y;
                    yearSel.appendChild(opt);
                });
                
                // Restore selection if it still exists in the new list (or if it was empty/Todos)
                if (selectedYear && years.includes(selectedYear)) {
                    yearSel.value = selectedYear;
                } else if (selectedYear === '') {
                    yearSel.value = '';
                }
            }

            // 4. Filter data for display based on selection
            let displayData = allData;
            if (selectedYear) {
                displayData = allData.filter(d => String(d.year) === selectedYear);
            }

            // Sort by Year Descending, then Month Ascending (Jan -> Dec)
            displayData.sort((a, b) => {
                const yearDiff = Number(b.year) - Number(a.year);
                if (yearDiff !== 0) return yearDiff;
                return Number(a.month) - Number(b.month);
            });

            // 5. Render table
            const tbody = document.querySelector('#table-monthly-ops tbody');
            tbody.innerHTML = '';

            displayData.forEach(item => {
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

    parseDateFromWeekLabel(weekLabel) {
        const months = {
            'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11,
            'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
        };

        // Try format: "08-14 Dic 2025"
        const regexSameMonth = /^(\d{1,2})-(\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/;
        const matchSame = weekLabel.match(regexSameMonth);

        if (matchSame) {
            const day = parseInt(matchSame[1], 10);
            const monthStr = matchSame[3];
            const year = parseInt(matchSame[4], 10);
            const month = months[monthStr.substring(0, 3)];
            if (month !== undefined) {
                return new Date(year, month, day);
            }
        }

        // Try format: "29 Dic - 04 Ene 2026"
        const regexDiffMonth = /^(\d{1,2})\s+([A-Za-z]{3})\.?\s+-\s+(\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/;
        const matchDiff = weekLabel.match(regexDiffMonth);
        if (matchDiff) {
            const day = parseInt(matchDiff[1], 10);
            const monthStr = matchDiff[2];
            let year = parseInt(matchDiff[5], 10);
            const startMonth = months[monthStr.substring(0, 3)];
            const endMonth = months[matchDiff[4].substring(0, 3)];
            
            if (startMonth === 11 && endMonth === 0) {
                year -= 1;
            }
            
            if (startMonth !== undefined) {
                return new Date(year, startMonth, day);
            }
        }
        return null;
    }

    updateWeeklyFreqHeaders(weekLabel) {
        const startDate = this.parseDateFromWeekLabel(weekLabel);
        if (!startDate) return;

        const table = document.getElementById('table-weekly-frequencies');
        if (!table) return;
        const headers = table.querySelectorAll('thead th');
        const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
        
        // Indices 3 to 9 correspond to L-D (0: Semana, 1: Ruta, 2: Aerolínea, 3: L, ..., 9: D)
        for (let i = 0; i < 7; i++) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);
            const dayStr = current.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
            
            if (headers[i + 3]) {
                headers[i + 3].innerHTML = `${days[i]}<br><small class="text-muted fw-normal" style="font-size: 0.7rem;">${dayStr}</small>`;
            }
        }
    }

    deleteItem(tableName, id) {
        window.adminUI.deleteRecord(tableName, id);
    }

    async deleteWeeklyTemplate() {
        const labelSelect = document.getElementById('filter-weekly-freq-label');
        const currentLabel = labelSelect ? labelSelect.value : '';

        if (!currentLabel) {
            alert('Por favor selecciona una semana para eliminar.');
            return;
        }

        if (!confirm(`¿Estás seguro de que deseas ELIMINAR TODAS las frecuencias de la semana "${currentLabel}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const { error } = await window.dataManager.client
                .from('weekly_frequencies')
                .delete()
                .eq('week_label', currentLabel);

            if (error) throw error;

            alert(`Semana "${currentLabel}" eliminada exitosamente.`);
            
            // Remove option from select
            if (labelSelect) {
                const option = labelSelect.querySelector(`option[value="${currentLabel}"]`);
                if (option) option.remove();
                labelSelect.value = ''; // Reset or select first
                this.loadWeeklyFrequencies();
            }

        } catch (err) {
            console.error('Error deleting week:', err);
            alert('Error al eliminar la semana: ' + err.message);
        }
    }

    openCopyWeekModal() {
        const labelSelect = document.getElementById('filter-weekly-freq-label');
        const sourceLabel = labelSelect ? labelSelect.value : '';
        
        if (!sourceLabel) {
            alert('Por favor selecciona una semana origen primero.');
            return;
        }

        document.getElementById('copy-source-week-label').textContent = sourceLabel;
        
        // Reset inputs
        const startDateInput = document.getElementById('copy-start-date');
        const endDateInput = document.getElementById('copy-end-date');
        startDateInput.value = '';
        endDateInput.value = '';
        document.getElementById('copy-preview-label').textContent = '';

        // Add listeners for preview
        startDateInput.onchange = () => {
            // Auto-calculate end date (Start + 6 days)
            const startVal = startDateInput.value;
            if (startVal) {
                const [y, m, d] = startVal.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                date.setDate(date.getDate() + 6);
                
                const yEnd = date.getFullYear();
                const mEnd = String(date.getMonth() + 1).padStart(2, '0');
                const dEnd = String(date.getDate()).padStart(2, '0');
                
                endDateInput.value = `${yEnd}-${mEnd}-${dEnd}`;
            }
            this.updateCopyPreview();
        };
        endDateInput.onchange = () => this.updateCopyPreview();

        const modal = new bootstrap.Modal(document.getElementById('modal-copy-week'));
        modal.show();
    }

    updateCopyPreview() {
        const start = document.getElementById('copy-start-date').value;
        const end = document.getElementById('copy-end-date').value;
        const preview = document.getElementById('copy-preview-label');
        
        if (start && end) {
            preview.textContent = this.generateWeekLabel(start, end);
        } else {
            preview.textContent = 'Selecciona ambas fechas...';
        }
    }

    generateWeekLabel(startDateStr, endDateStr) {
        // startDateStr: YYYY-MM-DD
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Create dates using local time components to avoid timezone shifts
        const [y1, m1, d1] = startDateStr.split('-').map(Number);
        const [y2, m2, d2] = endDateStr.split('-').map(Number);
        
        const date1 = new Date(y1, m1 - 1, d1);
        const date2 = new Date(y2, m2 - 1, d2);

        const day1Str = String(d1).padStart(2, '0');
        const day2Str = String(d2).padStart(2, '0');
        const mon1Str = months[m1 - 1];
        const mon2Str = months[m2 - 1];
        
        // Logic: 
        // Same month: "08-14 Dic 2025"
        // Diff month: "29 Dic - 04 Ene 2026"
        
        if (m1 === m2 && y1 === y2) {
            return `${day1Str}-${day2Str} ${mon1Str} ${y1}`;
        } else {
            // If years are different, we usually append the year at the end.
            // But if it spans years, we might want "29 Dic - 04 Ene 2026" (end year)
            return `${day1Str} ${mon1Str} - ${day2Str} ${mon2Str} ${y2}`;
        }
    }

    async confirmCopyWeek() {
        const labelSelect = document.getElementById('filter-weekly-freq-label');
        const sourceLabel = labelSelect ? labelSelect.value : '';
        const start = document.getElementById('copy-start-date').value;
        const end = document.getElementById('copy-end-date').value;

        if (!start || !end) {
            alert('Debes seleccionar fecha de inicio y fin.');
            return;
        }

        const newLabel = this.generateWeekLabel(start, end);
        const newValidFrom = start; // YYYY-MM-DD

        try {
            // 1. Get source data
            const sourceData = await window.dataManager.getWeeklyFrequencies(sourceLabel);
            if (!sourceData || sourceData.length === 0) {
                alert('No hay datos en la semana origen.');
                return;
            }

            // 2. Prepare new data
            const newData = sourceData.map(item => {
                const { id, created_at, ...rest } = item;
                return {
                    ...rest,
                    week_label: newLabel,
                    valid_from: newValidFrom
                };
            });

            // 3. Insert
            const { error } = await window.dataManager.client.from('weekly_frequencies').insert(newData);
            if (error) throw error;

            // Close modal
            const modalEl = document.getElementById('modal-copy-week');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            alert(`Se copiaron ${newData.length} registros a la semana ${newLabel}.`);

            // Refresh
            if (labelSelect) {
                const opt = document.createElement('option');
                opt.value = newLabel;
                opt.textContent = newLabel;
                labelSelect.appendChild(opt);
                labelSelect.value = newLabel;
            }
            this.loadWeeklyFrequencies();

        } catch (err) {
            console.error('Error copying:', err);
            alert('Error: ' + err.message);
        }
    }

    toggleWeeklyEditMode() {
        const table = document.getElementById('table-weekly-frequencies');
        const btnEdit = document.getElementById('btn-edit-weekly-mode');
        const btnSave = document.getElementById('btn-save-weekly-changes');
        
        if (!table || !btnEdit || !btnSave) return;

        const isEditing = btnEdit.classList.contains('active');

        if (isEditing) {
            // Cancel edit mode
            btnEdit.classList.remove('active', 'btn-secondary');
            btnEdit.classList.add('btn-outline-primary');
            btnEdit.innerHTML = '<i class="fas fa-edit"></i> Editar Tabla';
            btnSave.classList.add('d-none');
            this.loadWeeklyFrequencies(); // Reload to discard changes
        } else {
            // Enter edit mode
            btnEdit.classList.add('active', 'btn-secondary');
            btnEdit.classList.remove('btn-outline-primary');
            btnEdit.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            btnSave.classList.remove('d-none');

            // Convert cells to inputs
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(tr => {
                // Skip header rows (if any logic separates them, but here we have grouped rows)
                // We need to find the cells that contain the daily counts.
                // Based on loadWeeklyFrequencies, indices 3-9 are days (L-D) if it's a full row.
                // BUT, rowSpan logic makes this tricky.
                // Let's look at the data attributes or structure.
                // The render logic adds cells sequentially.
                
                // Strategy: Identify cells by their content or position.
                // The daily count cells are simple <td> with numbers.
                // We can add a class during render to identify them easily, OR infer it.
                // Let's modify loadWeeklyFrequencies to add a class 'editable-day-cell' to daily cells.
                
                // Since we can't easily modify loadWeeklyFrequencies right now without re-reading/writing a huge chunk,
                // let's try to select them by index.
                // However, rowSpan messes up column indices in subsequent rows.
                
                // Better approach: Re-render the table in "Edit Mode" explicitly.
                // But that requires duplicating render logic.
                
                // Alternative: Iterate cells and check if they hold a number and are not the Total column.
                // The daily cells have `airline.daily?.[dayIdx]` content.
                
                // Let's rely on the fact that we can attach data-id to the TR and data-field to the TD in loadWeeklyFrequencies.
                // I will modify loadWeeklyFrequencies to add data attributes to make this robust.
            });
            
            // Since I need to modify loadWeeklyFrequencies anyway to support robust editing, 
            // I will do that first.
            this.enableWeeklyTableEditing(table);
        }
    }

    enableWeeklyTableEditing(table) {
        const inputs = table.querySelectorAll('.weekly-freq-value');
        inputs.forEach(span => {
            const val = span.textContent;
            const field = span.dataset.field; // e.g. 'monday', 'tuesday'...
            const id = span.dataset.id;
            
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-control form-control-sm p-1 text-center';
            input.value = val;
            input.style.width = '50px';
            input.dataset.original = val;
            input.dataset.id = id;
            input.dataset.field = field;
            
            span.innerHTML = '';
            span.appendChild(input);
        });
    }

    async saveWeeklyChanges() {
        const table = document.getElementById('table-weekly-frequencies');
        const inputs = table.querySelectorAll('input[type="number"]');
        const updates = {}; // Map<id, { field: value }>

        inputs.forEach(input => {
            if (input.value !== input.dataset.original) {
                const id = input.dataset.id;
                const field = input.dataset.field;
                if (!updates[id]) updates[id] = {};
                updates[id][field] = parseInt(input.value) || 0;
            }
        });

        const ids = Object.keys(updates);
        if (ids.length === 0) {
            alert('No hay cambios para guardar.');
            this.toggleWeeklyEditMode();
            return;
        }

        try {
            // Process updates sequentially (or Promise.all)
            // Supabase doesn't support bulk update with different values easily.
            // We'll do parallel requests.
            const promises = ids.map(id => {
                // Recalculate weekly_total
                // We need the other days too. This is complex because we only have the changed value.
                // Ideally, we should update the specific field and let the DB handle total, 
                // OR we fetch the row, update, and save.
                
                // Simplified: Just update the changed fields. 
                // WARNING: weekly_total will be out of sync if we don't update it.
                // Let's calculate the new total in the UI or fetch-update.
                
                // Better: Update the specific day column.
                // Then trigger a stored procedure or just update weekly_total in the same call?
                // We don't have the other values here easily unless we read the row from the DOM.
                
                // Let's read the full row from DOM to calc total.
                // Find the row (tr) containing this input.
                // Actually, inputs are scattered.
                
                // Let's just update the fields. We can fix totals later or assume the user updates them?
                // No, total should be auto.
                
                // Let's grab the row's inputs to sum them up.
                // We need to find all inputs for a given ID.
                const rowInputs = table.querySelectorAll(`input[data-id="${id}"]`);
                let newTotal = 0;
                const rowUpdates = { ...updates[id] };
                
                // If we are in edit mode, all days are inputs.
                // We can sum all inputs for this ID.
                rowInputs.forEach(inp => {
                    newTotal += parseInt(inp.value) || 0;
                    // Ensure all fields are in the update object if we want to be safe, 
                    // but strictly we only need to send changed ones + total.
                    // Actually, to be safe, let's send all day values for this ID.
                    rowUpdates[inp.dataset.field] = parseInt(inp.value) || 0;
                });
                
                rowUpdates.weekly_total = newTotal;
                
                return window.dataManager.client
                    .from('weekly_frequencies')
                    .update(rowUpdates)
                    .eq('id', id);
            });

            await Promise.all(promises);
            
            alert('Cambios guardados exitosamente.');
            this.toggleWeeklyEditMode(); // Exit edit mode and reload

        } catch (err) {
            console.error('Error saving changes:', err);
            alert('Error al guardar cambios: ' + err.message);
        }
    }

    async loadWeeklyFrequencies() {
        try {
            const labelSelect = document.getElementById('filter-weekly-freq-label');
            const airlineSelect = document.getElementById('filter-weekly-freq-airline');
            const destSelect = document.getElementById('filter-weekly-freq-destination');

            let selectedLabel = labelSelect ? labelSelect.value : '';
            let selectedAirline = airlineSelect ? airlineSelect.value : '';
            let selectedDest = destSelect ? destSelect.value : '';

            // Fetch data based on selection. If empty, fetch latest.
            let data = await window.dataManager.getWeeklyFrequencies(selectedLabel);
            
            // Update headers with dates if data exists
            if (data && data.length > 0 && data[0].week_label) {
                this.updateWeeklyFreqHeaders(data[0].week_label);
            }
            
            // Populate selects if empty or just refresh it
            // We need all data to populate filters correctly across all history
            if (labelSelect && (labelSelect.options.length <= 1 || !selectedLabel)) {
                const allData = await window.dataManager.getWeeklyFrequencies(); 
                
                // 1. Week Labels
                const uniqueLabels = [...new Set(allData.map(item => item.week_label))];
                const currentLabel = labelSelect.value;
                labelSelect.innerHTML = '<option value="">Todas las semanas</option>';
                uniqueLabels.forEach(label => {
                    const opt = document.createElement('option');
                    opt.value = label;
                    opt.textContent = label;
                    labelSelect.appendChild(opt);
                });
                if (currentLabel) labelSelect.value = currentLabel;

                // 2. Airlines
                if (airlineSelect) {
                    const uniqueAirlines = [...new Set(allData.map(item => item.airline))].sort();
                    const currentAirline = airlineSelect.value;
                    airlineSelect.innerHTML = '<option value="">Todas</option>';
                    uniqueAirlines.forEach(airline => {
                        const opt = document.createElement('option');
                        opt.value = airline;
                        opt.textContent = airline;
                        airlineSelect.appendChild(opt);
                    });
                    if (currentAirline) airlineSelect.value = currentAirline;
                }

                // 3. Destinations (City)
                if (destSelect) {
                    const uniqueDest = [...new Set(allData.map(item => item.city))].sort();
                    const currentDest = destSelect.value;
                    destSelect.innerHTML = '<option value="">Todos</option>';
                    uniqueDest.forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city;
                        opt.textContent = city;
                        destSelect.appendChild(opt);
                    });
                    if (currentDest) destSelect.value = currentDest;
                }
            }

            // Client-side filtering for Airline and Destination
            if (selectedAirline) {
                data = data.filter(item => item.airline === selectedAirline);
            }
            if (selectedDest) {
                data = data.filter(item => item.city === selectedDest);
            }

            const tbody = document.querySelector('#table-weekly-frequencies tbody');
            tbody.innerHTML = '';

            // Group data by destination (City + IATA)
            const grouped = {};
            data.forEach(item => {
                const key = `${item.week_label}||${item.city}||${item.iata}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });

            const processedKeys = new Set();

            data.forEach(item => {
                const key = `${item.week_label}||${item.city}||${item.iata}`;
                if (processedKeys.has(key)) return;
                processedKeys.add(key);

                const groupItems = grouped[key];

                groupItems.forEach((groupItem, index) => {
                    const tr = document.createElement('tr');
                    
                    // Determine airline config
                    const slug = this.slugify(groupItem.airline || 'default');
                    const config = this.airlineConfig[slug] || this.airlineConfig['default'];

                    // Apply row styles
                    tr.style.backgroundColor = config.color;
                    tr.style.color = config.text;
                    tr.style.setProperty('--bs-table-bg', 'transparent');
                    tr.style.setProperty('--bs-table-accent-bg', 'transparent');

                    // Week & Route - Only for first item
                    if (index === 0) {
                        const tdWeek = document.createElement('td');
                        tdWeek.textContent = groupItem.week_label;
                        tdWeek.style.backgroundColor = '#ffffff';
                        tdWeek.style.color = '#212529';
                        tdWeek.rowSpan = groupItems.length;
                        tdWeek.style.verticalAlign = 'middle';
                        tr.appendChild(tdWeek);

                        const tdRoute = document.createElement('td');
                        tdRoute.innerHTML = `<div><strong>${groupItem.city}</strong></div><small>${groupItem.state || ''}</small>`;
                        tdRoute.style.backgroundColor = '#ffffff';
                        tdRoute.style.color = '#212529';
                        tdRoute.rowSpan = groupItems.length;
                        tdRoute.style.verticalAlign = 'middle';
                        tr.appendChild(tdRoute);
                    }

                    // Airline
                    const tdAirline = document.createElement('td');
                    tdAirline.style.backgroundColor = '#ffffff';
                    tdAirline.style.color = config.color;
                    tdAirline.style.borderLeft = `8px solid ${config.color}`;
                    
                    if (config.logo) {
                        tdAirline.innerHTML = `<img src="images/airlines/${config.logo}" alt="${groupItem.airline}" title="${groupItem.airline}" style="height: 24px; max-width: 100px; object-fit: contain;">`;
                    } else {
                        tdAirline.textContent = groupItem.airline;
                    }
                    tr.appendChild(tdAirline);

                    // Days
                    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                        const td = document.createElement('td');
                        td.className = 'text-center';
                        // Wrap in span for edit mode targeting
                        td.innerHTML = `<span class="weekly-freq-value" data-field="${day}" data-id="${groupItem.id}">${groupItem[day] || 0}</span>`;
                        // Inherit row color
                        tr.appendChild(td);
                    });

                    // Total
                    const tdTotal = document.createElement('td');
                    tdTotal.className = 'text-center fw-bold';
                    tdTotal.textContent = groupItem.weekly_total;
                    tr.appendChild(tdTotal);

                    // Actions
                    const tdActions = document.createElement('td');
                    tdActions.className = 'text-center';
                    // Reset background for actions cell to be readable
                    tdActions.style.backgroundColor = '#ffffff';
                    
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
                    btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                    btnEdit.onclick = () => this.editItem('weekly_frequencies', groupItem);
                    tdActions.appendChild(btnEdit);

                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-sm btn-outline-danger';
                    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                    btnDelete.onclick = () => this.deleteItem('weekly_frequencies', groupItem.id);
                    tdActions.appendChild(btnDelete);

                    tr.appendChild(tdActions);
                    tbody.appendChild(tr);
                });
            });

        } catch (error) {
            console.error('Error loading weekly frequencies:', error);
        }
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
