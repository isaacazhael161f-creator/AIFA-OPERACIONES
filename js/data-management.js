class DataManagement {
    constructor() {
        this.cache = {};
        this.schemas = {
            daily_operations: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'comercial_ops', label: 'Comercial - Operaciones', type: 'number' },
                { name: 'comercial_pax', label: 'Comercial - Pasajeros', type: 'number' },
                { name: 'general_ops', label: 'General - Operaciones', type: 'number' },
                { name: 'general_pax', label: 'General - Pasajeros', type: 'number' },
                { name: 'carga_ops', label: 'Carga - Operaciones', type: 'number' },
                { name: 'carga_tons', label: 'Carga - Toneladas', type: 'number', step: '0.01' },
                { name: 'carga_cutoff_date', label: 'Carga - Fecha Corte', type: 'date' },
                { name: 'carga_cutoff_note', label: 'Carga - Nota Corte', type: 'text' },
                { name: 'pdf_file', label: 'Parte de Operaciones (PDF)', type: 'file', accept: '.pdf' }
            ],
            daily_operations_breakdown: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'operation_type', label: 'Tipo de Operación', type: 'text' },
                { name: 'arrivals', label: 'Llegadas', type: 'number' },
                { name: 'departures', label: 'Salidas', type: 'number' },
                { name: 'subtotal', label: 'Subtotal', type: 'number' }
            ],
            flight_itinerary: [
                { name: 'flight_number', label: 'No. Vuelo', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'origin', label: 'Origen', type: 'text' },
                { name: 'destination', label: 'Destino', type: 'text' },
                { name: 'arrival_date', label: 'Fecha Llegada', type: 'date' },
                { name: 'arrival_time', label: 'Hora Llegada', type: 'time' },
                { name: 'departure_date', label: 'Fecha Salida', type: 'date' },
                { name: 'departure_time', label: 'Hora Salida', type: 'time' },
                { name: 'status', label: 'Estado', type: 'select', options: [
                    { value: 'Programado', label: 'Programado' },
                    { value: 'Aterrizó', label: 'Aterrizó' },
                    { value: 'Demorado', label: 'Demorado' },
                    { value: 'Cancelado', label: 'Cancelado' },
                    { value: 'En Vuelo', label: 'En Vuelo' }
                ]},
                { name: 'gate', label: 'Puerta', type: 'text' },
                { name: 'terminal', label: 'Terminal', type: 'text' },
                { name: 'category', label: 'Categoría', type: 'select', options: [
                    { value: 'pasajeros', label: 'Pasajeros' },
                    { value: 'carga', label: 'Carga' }
                ]}
            ],
            wildlife_incidents: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'location', label: 'Ubicación', type: 'text' },
                { name: 'impact_zone', label: 'Zona de Impacto', type: 'text' },
                { name: 'operation_phase', label: 'Fase Operación', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'aircraft', label: 'Aeronave', type: 'text' },
                { name: 'registration', label: 'Matrícula', type: 'text' },
                { name: 'remains_impact_zone', label: 'Zona Restos', type: 'text' },
                { name: 'remains_quantity', label: 'Cant. Restos', type: 'text' },
                { name: 'size', label: 'Tamaño', type: 'text' },
                { name: 'species', label: 'Especie', type: 'text' },
                { name: 'common_name', label: 'Nombre Común', type: 'text' },
                { name: 'reporter', label: 'Reporta', type: 'text' },
                { name: 'proactive_measures', label: 'Medidas Proactivas', type: 'textarea' },
                { name: 'weather_conditions', label: 'Condiciones Met.', type: 'text' },
                { name: 'results', label: 'Resultados', type: 'textarea' }
            ],
            rescued_wildlife: [
                { name: 'capture_number', label: 'No. Captura', type: 'number' },
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'month', label: 'Mes', type: 'text' },
                { name: 'class', label: 'Clase', type: 'text' },
                { name: 'common_name', label: 'Nombre Común', type: 'text' },
                { name: 'scientific_name', label: 'Nombre Científico', type: 'text' },
                { name: 'quantity', label: 'No. Individuos', type: 'number' },
                { name: 'capture_method', label: 'Método Captura', type: 'text' },
                { name: 'quadrant', label: 'Cuadrante', type: 'text' },
                { name: 'final_disposition', label: 'Disposición Final', type: 'text' },
                { name: 'year', label: 'Año', type: 'number' }
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
                { name: 'incidents', label: 'Incidentes', type: 'textarea', help: 'Separar por nueva línea' },
                { name: 'observations', label: 'Observaciones', type: 'textarea' }
            ],
            punctuality_stats: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                    { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                    { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                    { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                ]},
                { name: 'category', label: 'Categoría', type: 'select', options: [
                    { value: 'Pasajeros', label: 'Pasajeros' },
                    { value: 'Carga', label: 'Carga' },
                    { value: 'General', label: 'General' }
                ]},
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'on_time', label: 'A Tiempo', type: 'number' },
                { name: 'delayed', label: 'Demorado', type: 'number' },
                { name: 'cancelled', label: 'Cancelado', type: 'number' },
                { name: 'total_flights', label: 'Total Vuelos', type: 'number' }
            ],
            aviation_analytics: [
                { name: 'year', label: 'Año', type: 'number' },
                { name: 'month', label: 'Mes', type: 'select', options: [
                    { value: 'enero', label: 'Enero' }, { value: 'febrero', label: 'Febrero' }, { value: 'marzo', label: 'Marzo' },
                    { value: 'abril', label: 'Abril' }, { value: 'mayo', label: 'Mayo' }, { value: 'junio', label: 'Junio' },
                    { value: 'julio', label: 'Julio' }, { value: 'agosto', label: 'Agosto' }, { value: 'septiembre', label: 'Septiembre' },
                    { value: 'octubre', label: 'Octubre' }, { value: 'noviembre', label: 'Noviembre' }, { value: 'diciembre', label: 'Diciembre' }
                ]},
                { name: 'category', label: 'Categoría', type: 'select', options: [
                    { value: 'comercial', label: 'Comercial' },
                    { value: 'general', label: 'General' },
                    { value: 'carga', label: 'Carga' }
                ]},
                { name: 'metric', label: 'Métrica', type: 'select', options: [
                    { value: 'operaciones', label: 'Operaciones' },
                    { value: 'pasajeros', label: 'Pasajeros' },
                    { value: 'tons_transportadas', label: 'Toneladas Transportadas' }
                ]},
                { name: 'value', label: 'Valor', type: 'number', step: '0.01' }
            ]
        };

        this.init();
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
        document.getElementById('filter-daily-ops-date').addEventListener('change', () => this.loadDailyOperations());
        document.getElementById('filter-ops-breakdown-date').addEventListener('change', () => this.loadDailyOperationsBreakdown());
        document.getElementById('filter-itinerary-date').addEventListener('change', () => this.loadItinerary());
        document.getElementById('filter-delays-year').addEventListener('change', () => this.loadDelays());
        document.getElementById('filter-delays-month').addEventListener('change', () => this.loadDelays());
        document.getElementById('filter-punctuality-year').addEventListener('change', () => this.loadPunctuality());
        document.getElementById('filter-punctuality-month').addEventListener('change', () => this.loadPunctuality());
        document.getElementById('filter-aviation-year').addEventListener('change', () => this.loadAviationAnalytics());
        document.getElementById('filter-aviation-category').addEventListener('change', () => this.loadAviationAnalytics());

        // Listen for data updates to refresh tables
        window.addEventListener('data-updated', (e) => {
            // Refresh the current active tab or specific table
            // For simplicity, reload the relevant table based on the table name
            const table = e.detail.table;
            if (table === 'daily_operations') this.loadDailyOperations();
            if (table === 'daily_operations_breakdown') this.loadDailyOperationsBreakdown();
            if (table === 'flight_itinerary') this.loadItinerary();
            if (table === 'wildlife_incidents') this.loadWildlife();
            if (table === 'rescued_wildlife') this.loadRescuedWildlife();
            if (table === 'delays') this.loadDelays();
            if (table === 'punctuality_stats') this.loadPunctuality();
            if (table === 'aviation_analytics') this.loadAviationAnalytics();
        });

        // Listen for admin mode change to preload data
        window.addEventListener('admin-mode-changed', (e) => {
            if (e.detail.isAdmin) {
                this.preloadAllData();
            }
        });

        // Initial load if section is active (or just load the first tab)
        // this.loadOperationsSummary();
        
        // Preload all data to avoid delays when switching tabs
        this.preloadAllData();
    }

    preloadAllData() {
        // Load all data in parallel without blocking
        Promise.allSettled([
            this.loadDailyOperations(),
            this.loadDailyOperationsBreakdown(),
            this.loadItinerary(),
            this.loadWildlife(),
            this.loadRescuedWildlife(),
            this.loadDelays(),
            this.loadPunctuality(),
            this.loadAviationAnalytics()
        ]).then(() => {
            console.log('All data management tables preloaded.');
        });
    }

    loadTabContent(targetId) {
        // Data is preloaded, but we can refresh if needed. 
        // For now, we rely on preload or manual refresh via filters.
        // However, if the user clicks the tab, we might want to ensure it's up to date 
        // or just let the preload handle it.
        // If we call load functions again, it might be redundant if preload just finished.
        // But since load functions fetch and render, calling them again is safe (just a network call).
        // To make it instant, we rely on the fact that preload likely finished or is in progress.
        // If we want to be smarter, we could cache the data, but the current implementation 
        // of loadX functions fetches and renders directly.
        
        // If we want "instant" appearance, we should just let the preload do the work 
        // and maybe NOT call loadTabContent on click if it's already loaded?
        // But the user might want to refresh.
        // The user said "haz que eso ya esté predispuesto".
        // So calling preloadAllData in init() is the key.
        
        // We keep this switch to support lazy loading if we wanted, 
        // or to refresh on tab click. 
        // If we want to avoid double fetching on initial load, we could check a flag.
        // But for now, let's just keep it as is, the preload will populate the tables 
        // (which are hidden but exist in DOM), so when user clicks, they are full.
        
        if (targetId === '#pane-daily-ops') this.loadDailyOperations();
        if (targetId === '#pane-ops-breakdown') this.loadDailyOperationsBreakdown();
        if (targetId === '#pane-itinerary') this.loadItinerary();
        if (targetId === '#pane-wildlife') this.loadWildlife();
        if (targetId === '#pane-rescued-wildlife') this.loadRescuedWildlife();
        if (targetId === '#pane-delays') this.loadDelays();
        if (targetId === '#pane-punctuality') this.loadPunctuality();
        if (targetId === '#pane-aviation-analytics') this.loadAviationAnalytics();
    }

    async loadDailyOperations(forceRefresh = false) {
        try {
            let data;
            if (!forceRefresh && this.cache.daily_operations) {
                data = this.cache.daily_operations;
            } else {
                data = await window.dataManager.getDailyOperations();
                this.cache.daily_operations = data;
            }
            
            const dateFilter = document.getElementById('filter-daily-ops-date').value;
            let filteredData = data;
            if (dateFilter) {
                // Assuming data has 'date' field in YYYY-MM-DD format
                filteredData = data.filter(item => item.date === dateFilter);
            }
            
            // Custom render for complex columns
            const tbody = document.querySelector('#table-daily-ops tbody');
            tbody.innerHTML = '';

            filteredData.forEach(item => {
                const tr = document.createElement('tr');
                
                // Date
                const tdDate = document.createElement('td');
                tdDate.innerHTML = this.formatDateForDisplay(item.date);
                if (item.pdf_file) {
                    tdDate.innerHTML += ` <a href="${item.pdf_file}" target="_blank" class="text-danger ms-1" title="Ver PDF"><i class="fas fa-file-pdf"></i></a>`;
                }
                tr.appendChild(tdDate);

                // Commercial
                const tdCom = document.createElement('td');
                tdCom.innerHTML = `Ops: ${item.comercial_ops}<br><small class="text-muted">Pax: ${item.comercial_pax}</small>`;
                tr.appendChild(tdCom);

                // General
                const tdGen = document.createElement('td');
                tdGen.innerHTML = `Ops: ${item.general_ops}<br><small class="text-muted">Pax: ${item.general_pax}</small>`;
                tr.appendChild(tdGen);

                // Cargo
                const tdCargo = document.createElement('td');
                tdCargo.innerHTML = `Ops: ${item.carga_ops}<br><small class="text-muted">Ton: ${item.carga_tons}</small>`;
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

    async loadDailyOperationsBreakdown(forceRefresh = false) {
        try {
            let data;
            if (!forceRefresh && this.cache.daily_operations_breakdown) {
                data = this.cache.daily_operations_breakdown;
            } else {
                data = await window.dataManager.getDailyOperationsBreakdown();
                this.cache.daily_operations_breakdown = data;
            }
            
            const dateFilter = document.getElementById('filter-ops-breakdown-date').value;
            let filteredData = data;
            if (dateFilter) {
                filteredData = data.filter(item => item.date === dateFilter);
            }
            
            this.renderTable('table-ops-breakdown', filteredData, ['date', 'operation_type', 'arrivals', 'departures', 'subtotal'], 'daily_operations_breakdown');

        } catch (error) {
            console.error('Error loading daily operations breakdown:', error);
        }
    }

    async loadItinerary(forceRefresh = false) {
        try {
            const dateFilter = document.getElementById('filter-itinerary-date').value;
            const cacheKey = `flight_itinerary_${dateFilter || 'default'}`;
            
            let data;
            if (!forceRefresh && this.cache[cacheKey]) {
                data = this.cache[cacheKey];
            } else {
                data = await window.dataManager.getFlightItinerary(dateFilter);
                this.cache[cacheKey] = data;
            }
            
            // Map data to match the table columns in index.html
            // Columns: Fecha, Vuelo, Aerolínea, Origen, Destino, Hora Llegada, Hora Salida, Equipo, Tipo
            const displayData = data.map(item => ({
                ...item,
                date: item.fecha_llegada, // Display date
                flight_number: item.vuelo,
                airline: item.aerolinea,
                origin: item.origen,
                destination: item.destino,
                arrival_time: item.hora_llegada,
                departure_time: item.hora_salida,
                equipment: item.equipo,
                type: item.tipo,
                // Keep original fields for editing if needed, though item already has them
                id: item.id // Ensure ID is passed for edit/delete
            }));

            this.renderTable('table-itinerary', displayData, ['date', 'flight_number', 'airline', 'origin', 'destination', 'arrival_time', 'departure_time', 'equipment', 'type'], 'flight_itinerary');
        } catch (error) {
            console.error('Error loading itinerary:', error);
        }
    }

    parseDMYToISO(dmy) {
        if (!dmy) return '';
        const [d, m, y] = dmy.split('/');
        return `${y}-${m}-${d}`;
    }

    async loadWildlife(forceRefresh = false) {
        try {
            let data;
            if (!forceRefresh && this.cache.wildlife_incidents) {
                data = this.cache.wildlife_incidents;
            } else {
                data = await window.dataManager.getWildlifeIncidents();
                this.cache.wildlife_incidents = data;
            }
            this.renderTable('table-wildlife', data, [
                'date', 'time', 'species', 'location', 'airline', 'operation_phase',
                'impact_zone', 'aircraft', 'registration', 'remains_impact_zone',
                'remains_quantity', 'size', 'common_name', 'reporter',
                'proactive_measures', 'weather_conditions', 'results'
            ], 'wildlife_incidents');
        } catch (error) {
            console.error('Error loading wildlife:', error);
        }
    }

    async loadRescuedWildlife(forceRefresh = false) {
        try {
            let data;
            if (!forceRefresh && this.cache.rescued_wildlife) {
                data = this.cache.rescued_wildlife;
            } else {
                data = await window.dataManager.getRescuedWildlife();
                this.cache.rescued_wildlife = data;
            }
            
            const mappedData = data.map(item => ({
                id: item.id, 
                capture_number: item['No. captura'],
                date: item['Fecha'], 
                time: item['Hora'],
                month: item['Mes'],
                class: item['Clase'],
                common_name: item['Nombre común'],
                scientific_name: item['Nombre científico'],
                quantity: item['No. individuos'],
                capture_method: item['Método de captura'],
                quadrant: item['Cuadrante'],
                final_disposition: item['Disposición final'],
                year: item['Año']
            }));
            
            this.renderTable('table-rescued-wildlife', mappedData, [
                'capture_number', 'date', 'time', 'month', 'class', 'common_name', 
                'scientific_name', 'quantity', 'capture_method', 'quadrant', 
                'final_disposition', 'year'
            ], 'rescued_wildlife');
            
        } catch (error) {
            console.error('Error loading rescued wildlife:', error);
        }
    }





    async loadDelays(forceRefresh = false) {
        const year = document.getElementById('filter-delays-year').value;
        const month = document.getElementById('filter-delays-month').value;
        try {
            let result;
            const cacheKey = `delays_${year}_${month}`;
            if (!forceRefresh && this.cache[cacheKey]) {
                result = this.cache[cacheKey];
            } else {
                result = await window.dataManager.getDelays(year, month);
                this.cache[cacheKey] = result;
            }
            
            let flatData = [];
            if (result.periods) {
                result.periods.forEach(period => {
                    period.causas.forEach(cause => {
                        flatData.push({
                            ...cause,
                            year: period.year,
                            month: period.periodo.split(' ')[0],
                            count: cause.demoras,
                            cause: cause.causa,
                            description: cause.descripcion,
                            incidents: Array.isArray(cause.incidentes) ? cause.incidentes.join('\n') : cause.incidentes,
                            observations: cause.observaciones
                        });
                    });
                });
            } else if (result.causas) {
                result.causas.forEach(cause => {
                    flatData.push({
                        ...cause,
                        year: result.year,
                        month: result.periodo.split(' ')[0],
                        count: cause.demoras,
                        cause: cause.causa,
                        description: cause.descripcion,
                        incidents: Array.isArray(cause.incidentes) ? cause.incidentes.join('\n') : cause.incidentes,
                        observations: cause.observaciones
                    });
                });
            }
            
            this.renderTable('table-delays', flatData, ['year', 'month', 'cause', 'count', 'description', 'incidents', 'observations'], 'delays');
        } catch (error) {
            console.error('Error loading delays:', error);
        }
    }

    async loadPunctuality(forceRefresh = false) {
        const year = document.getElementById('filter-punctuality-year').value;
        const month = document.getElementById('filter-punctuality-month').value;
        try {
            let data;
            const cacheKey = `punctuality_${year}_${month}`;
            if (!forceRefresh && this.cache[cacheKey]) {
                data = this.cache[cacheKey];
            } else {
                data = await window.dataManager.getPunctuality(year, month);
                this.cache[cacheKey] = data;
            }
            this.renderTable('table-punctuality', data, ['month', 'category', 'airline', 'on_time', 'delayed', 'cancelled', 'total_flights'], 'punctuality_stats');
        } catch (error) {
            console.error('Error loading punctuality:', error);
        }
    }

    async loadAviationAnalytics(forceRefresh = false) {
        const year = document.getElementById('filter-aviation-year').value;
        const category = document.getElementById('filter-aviation-category').value;
        try {
            let data;
            if (!forceRefresh && this.cache.aviation_analytics) {
                data = this.cache.aviation_analytics;
            } else {
                data = await window.dataManager.getAviationAnalytics();
                this.cache.aviation_analytics = data;
            }
            
            let filteredData = data;
            
            if (year) {
                filteredData = filteredData.filter(item => item.year == year);
            }
            
            if (category) {
                filteredData = filteredData.filter(item => item.category === category);
            }
            
            this.renderTable('table-aviation-analytics', filteredData, ['year', 'month', 'category', 'metric', 'value'], 'aviation_analytics');
        } catch (error) {
            console.error('Error loading aviation analytics:', error);
        }
    }

    renderTable(tableId, data, columns, tableName) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';

        data.forEach(item => {
            const tr = document.createElement('tr');
            
            columns.forEach(col => {
                const td = document.createElement('td');
                let value = item[col];
                if (col === 'date' || col === 'arrival_date') {
                    value = this.formatDateForDisplay(value);
                }
                td.textContent = value;
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
        console.log(`addItem called for ${tableName}`);
        try {
            const schema = this.schemas[tableName];
            if (schema) {
                if (window.adminUI) {
                    if (window.adminUI.modal) {
                        window.adminUI.openEditModal(tableName, null, schema);
                    } else {
                        console.error('AdminUI modal not initialized');
                        alert('Error: El modal de administración no está inicializado. Verifica si Bootstrap cargó correctamente.');
                    }
                } else {
                    console.error('AdminUI not initialized');
                    alert('Error: AdminUI no está inicializado. Recarga la página.');
                }
            } else {
                console.error(`Schema not found for table: ${tableName}`);
                alert(`Error: No se encontró el esquema para la tabla ${tableName}`);
            }
        } catch (error) {
            console.error('Error in addItem:', error);
            alert('Error inesperado al intentar agregar registro: ' + error.message);
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

    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        // Asume formato YYYY-MM-DD y lo convierte a DD-MM-YYYY
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
    }
}

window.dataManagement = new DataManagement();
