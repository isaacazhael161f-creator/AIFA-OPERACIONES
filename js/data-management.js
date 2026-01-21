class DataManagement {
    constructor() {
        this.client = window.supabaseClient; // Initialize Supabase Client
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

            // Cargo & International
            'estafeta': { logo: 'logo_estafeta.jpg', color: '#c41230', text: '#ffffff' },
            'ups': { logo: 'logo_united_parcel_service.png', color: '#351c15', text: '#ffffff' },
            'united-parcel-service': { logo: 'logo_united_parcel_service.png', color: '#351c15', text: '#ffffff' },
            'fedex': { logo: 'logo_fedex_express.png', color: '#4d148c', text: '#ffffff' },
            'dhl': { logo: 'logo_dhl_guatemala_.png', color: '#d40511', text: '#ffffff' },
            'mas': { logo: 'logo_mas.png', color: '#00a550', text: '#ffffff' },
            'mas-air': { logo: 'logo_mas.png', color: '#00a550', text: '#ffffff' },
            'air-canada': { logo: 'logo_air_canada_.png', color: '#ef3340', text: '#ffffff' },
            'air-france': { logo: 'logo_air_france_.png', color: '#00266e', text: '#ffffff' },
            'air-china': { logo: 'logo_air_china.png', color: '#ff0000', text: '#ffffff' },
            'china-southern': { logo: 'logo_china_southern.png', color: '#002a5c', text: '#ffffff' },
            'qatar': { logo: 'logo_qatar.png', color: '#5b0e2d', text: '#ffffff' },
            'turkish': { logo: 'logo_turkish_airlines.png', color: '#c8102e', text: '#ffffff' },
            'lufthansa': { logo: 'logo_lufthansa.png', color: '#05164d', text: '#ffffff' },
            'emirates': { logo: 'logo_emirates_airlines.png', color: '#d71920', text: '#ffffff' },
            'cargojet': { logo: 'logo_cargojet.png', color: '#000000', text: '#ffffff' },
            'atlas': { logo: 'logo_atlas_air.png', color: '#003366', text: '#ffffff' },
            'atlas-air': { logo: 'logo_atlas_air.png', color: '#003366', text: '#ffffff' },
            'kalitta': { logo: 'logo_kalitta_air.jpg', color: '#cf0a2c', text: '#ffffff' },
            'national': { logo: 'logo_national_airlines_cargo.png', color: '#001f3f', text: '#ffffff' },
            'tsm': { logo: 'logo_tsm_airlines.png', color: '#000000', text: '#ffffff' },
            'aerounion': { logo: 'logo_aero_union.png', color: '#00529b', text: '#ffffff' },
            'aero-union': { logo: 'logo_aero_union.png', color: '#00529b', text: '#ffffff' },
            'cargolux': { logo: 'logo_cargolux.png', color: '#00a0dc', text: '#ffffff' },
            'cathay': { logo: 'logo_cathay_pacific.png', color: '#006564', text: '#ffffff' },
            'cathay-pacific': { logo: 'logo_cathay_pacific.png', color: '#006564', text: '#ffffff' },
            'suparna': { logo: 'logo_suparna.png', color: '#b22222', text: '#ffffff' },
            'awesome': { logo: 'logo_awesome_cargo.png', color: '#000000', text: '#ffffff' },

            'default': { logo: null, color: '#ffffff', text: '#212529' }
        };
        this.isEditMode = false;
        this.currentDailyData = []; // Store raw data for edits

        this.schemas = {
            operations_summary: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                        { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                        { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                        { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                    ]
                },
                {
                    name: 'category', label: 'Categoría', type: 'select', options: [
                        { value: 'Pasajeros', label: 'Pasajeros' },
                        { value: 'Operaciones', label: 'Operaciones' },
                        { value: 'Carga', label: 'Carga' }
                    ]
                },
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
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
                        { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
                        { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
                        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
                    ]
                },
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
            punctuality_stats: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
                        { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
                        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
                        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
                    ]
                },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                {
                    name: 'category', label: 'Categoría', type: 'select', options: [
                        { value: 'Pasajeros', label: 'Pasajeros' },
                        { value: 'Carga', label: 'Carga' }
                    ]
                },
                { name: 'on_time', label: 'A Tiempo', type: 'number' },
                { name: 'delayed', label: 'Demorados', type: 'number' },
                { name: 'cancelled', label: 'Cancelados', type: 'number' },
                { name: 'total_flights', label: 'Total Vuelos', type: 'number' }
            ],
            flight_itinerary: [
                { name: 'flight_number', label: 'No. Vuelo', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'origin_destination', label: 'Origen/Destino', type: 'text' },
                { name: 'arrival_date', label: 'Fecha', type: 'date' },
                { name: 'arrival_time', label: 'Hora', type: 'time' },
                {
                    name: 'status', label: 'Estado', type: 'select', options: [
                        { value: 'Programado', label: 'Programado' },
                        { value: 'Aterrizó', label: 'Aterrizó' },
                        { value: 'Demorado', label: 'Demorado' },
                        { value: 'Cancelado', label: 'Cancelado' }
                    ]
                },
                { name: 'gate', label: 'Puerta', type: 'text' },
                { name: 'terminal', label: 'Terminal', type: 'text' }
            ],
            wildlife_strikes: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'location', label: 'Ubicación', type: 'text' },
                { name: 'impact_zone', label: 'Zona de impacto', type: 'text' },
                { name: 'operation_phase', label: 'Fase de la operación', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'aircraft', label: 'Aeronave', type: 'text' },
                { name: 'registration', label: 'Matrícula', type: 'text' },
                { name: 'impact_zone_remains', label: 'Zona de impacto resto', type: 'text' },
                { name: 'remains_count', label: 'Cantidad de restos', type: 'number' },
                {
                    name: 'size', label: 'Tamaño', type: 'select', options: [
                        { value: 'Pequeño', label: 'Pequeño' },
                        { value: 'Mediano', label: 'Mediano' },
                        { value: 'Grande', label: 'Grande' }
                    ]
                },
                { name: 'species', label: 'Especie', type: 'text' },
                { name: 'common_name', label: 'Nombre común', type: 'text' },
                { name: 'reporter', label: 'Personal que reporta', type: 'text' },
                { name: 'proactive_measures', label: 'Medidas proactivas', type: 'textarea' },
                { name: 'weather_conditions', label: 'Condiciones meteorológicas', type: 'text' },
                { name: 'measure_results', label: 'Resultados de las medidas', type: 'textarea' }
            ],
            medical_attentions: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                        { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                        { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                        { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                    ]
                },
                { name: 'aifa_personnel', label: 'Personal AIFA', type: 'number' },
                { name: 'other_companies', label: 'Otras Empresas', type: 'number' },
                { name: 'passengers', label: 'Pasajeros', type: 'number' },
                { name: 'visitors', label: 'Visitantes', type: 'number' },
                { name: 'total', label: 'Total', type: 'number', readonly: true } // Often calculated, but let's keep it for now
            ],
            medical_types: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: 'ABRIL', label: 'Abril' }, { value: 'MAYO', label: 'Mayo' }, { value: 'JUNIO', label: 'Junio' },
                        { value: 'JULIO', label: 'Julio' }, { value: 'AGOSTO', label: 'Agosto' }, { value: 'SEPTIEMBRE', label: 'Septiembre' },
                        { value: 'OCTUBRE', label: 'Octubre' }, { value: 'NOVIEMBRE', label: 'Noviembre' }, { value: 'DICIEMBRE', label: 'Diciembre' },
                        { value: 'ENERO', label: 'Enero' }, { value: 'FEBRERO', label: 'Febrero' }, { value: 'MARZO', label: 'Marzo' }
                    ]
                },
                { name: 'traslado', label: 'Traslado', type: 'number' },
                { name: 'ambulatorio', label: 'Ambulatorio', type: 'number' },
                { name: 'total', label: 'Total', type: 'number', readonly: true }
            ],
            medical_directory: [
                { name: 'asunto', label: 'Asunto', type: 'text' },
                { name: 'responsable', label: 'Responsable', type: 'text' },
                { name: 'estado', label: 'Estado', type: 'number' },
                { name: 'documentos', label: 'Documentos', type: 'file', multiple: true }
            ],
            delays: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: 'Enero', label: 'Enero' }, { value: 'Febrero', label: 'Febrero' }, { value: 'Marzo', label: 'Marzo' },
                        { value: 'Abril', label: 'Abril' }, { value: 'Mayo', label: 'Mayo' }, { value: 'Junio', label: 'Junio' },
                        { value: 'Julio', label: 'Julio' }, { value: 'Agosto', label: 'Agosto' }, { value: 'Septiembre', label: 'Septiembre' },
                        { value: 'Octubre', label: 'Octubre' }, { value: 'Noviembre', label: 'Noviembre' }, { value: 'Diciembre', label: 'Diciembre' }
                    ]
                },
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
            weekly_frequencies_int: [
                { name: 'week_label', label: 'Etiqueta Semana (ej. 08-14 Dic 2025)', type: 'text' },
                { name: 'valid_from', label: 'Válido Desde', type: 'date' },
                { name: 'valid_to', label: 'Válido Hasta', type: 'date' },
                { name: 'route_id', label: 'ID Ruta', type: 'number' },
                { name: 'city', label: 'Ciudad / País', type: 'text' },
                { name: 'state', label: 'Región', type: 'text' },
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
            punctuality_stats: [
                { name: 'year', label: 'Año', type: 'number' },
                {
                    name: 'month', label: 'Mes', type: 'select', options: [
                        { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
                        { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
                        { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
                        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
                    ]
                },
                { name: 'airline', label: 'Aerolínea', type: 'select', options: [] }, // Populated dynamically
                {
                    name: 'category', label: 'Categoría', type: 'select', options: [
                        { value: 'Pasajeros', label: 'Pasajeros' },
                        { value: 'Carga', label: 'Carga' }
                    ]
                },
                { name: 'on_time', label: 'A Tiempo', type: 'number' },
                { name: 'delayed', label: 'Demorados', type: 'number' },
                { name: 'cancelled', label: 'Cancelados', type: 'number' },
                { name: 'total_flights', label: 'Total Vuelos', type: 'number', readonly: true }
            ],
            flight_itinerary: [
                { name: 'flight_number', label: 'No. Vuelo', type: 'text' },
                { name: 'airline', label: 'Aerolínea', type: 'text' },
                { name: 'origin_destination', label: 'Origen/Destino', type: 'text' },
                { name: 'arrival_date', label: 'Fecha', type: 'date' },
                { name: 'arrival_time', label: 'Hora', type: 'time' },
                {
                    name: 'status', label: 'Estado', type: 'select', options: [
                        { value: 'Programado', label: 'Programado' },
                        { value: 'Aterrizó', label: 'Aterrizó' },
                        { value: 'Demorado', label: 'Demorado' },
                        { value: 'Cancelado', label: 'Cancelado' }
                    ]
                },
                { name: 'gate', label: 'Puerta', type: 'text' },
                { name: 'terminal', label: 'Terminal', type: 'text' }
            ],
            rescued_wildlife: [
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'capture_number', label: 'No. Captura', type: 'number' },
                { name: 'class', label: 'Clase', type: 'text' },
                { name: 'common_name', label: 'Nombre común', type: 'text' },
                { name: 'scientific_name', label: 'Nombre científico', type: 'text' },
                { name: 'quantity', label: 'No. Individuos', type: 'number' },
                { name: 'capture_method', label: 'Método de captura', type: 'text' },
                { name: 'quadrant', label: 'Cuadrante', type: 'text' },
                { name: 'final_disposition', label: 'Disposición final', type: 'text' }
            ],
            daily_flights_ops: [
                { name: 'fecha', label: 'Fecha', type: 'date' },
                { name: 'seq_no', label: 'No.', type: 'number' },
                { name: 'aerolinea', label: 'Aerolínea', type: 'text' },
                { name: 'vuelo_llegada', label: 'Vuelo Arr', type: 'text' },
                { name: 'origen', label: 'Origen', type: 'text' },
                { name: 'fecha_hora_prog_llegada', label: 'H. Prog Arr', type: 'text' },
                { name: 'fecha_hora_real_llegada', label: 'H. Real Arr', type: 'text' },
                { name: 'pasajeros_llegada', label: 'Pax Arr', type: 'number' },
                { name: 'vuelo_salida', label: 'Vuelo Dep', type: 'text' },
                { name: 'destino', label: 'Destino', type: 'text' },
                { name: 'fecha_hora_prog_salida', label: 'H. Prog Dep', type: 'text' },
                { name: 'fecha_hora_real_salida', label: 'H. Real Dep', type: 'text' },
                { name: 'pasajeros_salida', label: 'Pax Dep', type: 'number' },
                { name: 'matricula', label: 'Matrícula', type: 'text' }
            ],
            library_categories: [
                { name: 'title', label: 'Título del Cuadro', type: 'text' },
                { name: 'description', label: 'Descripción', type: 'textarea' },
                { name: 'icon', label: 'Icono (Visual)', type: 'icon', placeholder: 'fas fa-book' },
                { name: 'order_index', label: 'Orden', type: 'number' }
            ],
            library_items: [
                { name: 'category_id', label: 'Cuadro / Categoría', type: 'select', options: [] },
                { name: 'title', label: 'Título del Ítem', type: 'text' },
                {
                    name: 'type', label: 'Tipo', type: 'select', options: [
                        { value: 'pdf', label: 'Archivo PDF' },
                        { value: 'excel', label: 'Excel' },
                        { value: 'word', label: 'Word' },
                        { value: 'link', label: 'Enlace Externo' },
                        { value: 'info', label: 'Informativo (Texto)' }
                    ]
                },
                { name: 'url', label: 'URL / Enlace (Manual)', type: 'text' },
                { name: 'documentos', label: 'Archivos Adjuntos', type: 'file', multiple: true },
                { name: 'description', label: 'Contenido / Info', type: 'textarea' },
                { name: 'order_index', label: 'Orden', type: 'number' }
            ],
            system_alerts: [
                { name: 'title', label: 'Título del Aviso', type: 'text', placeholder: 'Ej. Cierre de Pista' },
                { name: 'message', label: 'Mensaje Detallado', type: 'textarea', placeholder: 'Detalles del aviso o alerta...' },
                {
                    name: 'level', label: 'Nivel (Semáforo)', type: 'select', options: [
                        { value: 'info', label: 'Informativo (Verde)' },
                        { value: 'warning', label: 'Precaución (Amarillo)' },
                        { value: 'critical', label: 'Crítico (Rojo)' }
                    ]
                },
                { name: 'active', label: 'Activo', type: 'select', options: [{ value: true, label: 'Sí' }, { value: false, label: 'No' }] },
                { name: 'expires_at', label: 'Expira (Opcional)', type: 'date' }
            ],
        };

        this.airlineCatalog = [];
        this.loadAirlineCatalog();
        this.init();
    }

    async loadAirlineCatalog() {
        try {
            const response = await fetch('data/master/airlines.csv');
            const text = await response.text();
            // Parse CSV: IATA,ICAO,Name
            const lines = text.split('\n').slice(1); // Skip header
            this.airlineCatalog = lines
                .map(line => {
                    // Simple CSV split (assuming no commas in fields for now)
                    const parts = line.split(',');
                    if (parts.length >= 3) {
                        return {
                            iata: parts[0].trim(),
                            icao: parts[1].trim(),
                            name: parts[2].trim()
                        };
                    }
                    return null;
                })
                .filter(item => item && item.name)
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.error('Failed to load airline catalog:', e);
        }
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

    // Formatea nÃºmeros con separadores de miles (ej. 21323 -> 21,323)
    formatNumber(value, colName) {
        if (value == null || value === '') value = 0;
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value);

        // Decide decimales segÃºn la columna
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
        const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"], button[data-bs-toggle="pill"]');
        tabEls.forEach(tabEl => {
            tabEl.addEventListener('shown.bs.tab', event => {
                const targetId = event.target.getAttribute('data-bs-target');
                this.loadTabContent(targetId);

                // Hide sidebar on selection if screen is not extra large (or always as requested)
                hideDmSidebar();
            });
        });

        // Listen for filter changes
        // document.getElementById('filter-ops-year').addEventListener('change', () => this.loadOperationsSummary());
        document.getElementById('filter-daily-ops-date').addEventListener('change', () => this.loadDailyOperations());
        const monthEl = document.getElementById('filter-daily-ops-month');
        if (monthEl) monthEl.addEventListener('change', () => this.loadDailyOperations());
        // Category filter removed â€” no listener required
        document.getElementById('filter-itinerary-date').addEventListener('change', () => this.loadItinerary());

        // Medical Filters
        const medYear = document.getElementById('filter-medical-year');
        if (medYear) medYear.addEventListener('change', () => this.loadMedicalAttentions());

        const medTypeYear = document.getElementById('filter-medical-types-year');
        if (medTypeYear) medTypeYear.addEventListener('change', () => this.loadMedicalTypes());

        document.getElementById('filter-delays-year').addEventListener('change', () => this.loadDelays());
        document.getElementById('filter-delays-month').addEventListener('change', () => this.loadDelays());

        const puncYear = document.getElementById('filter-punctuality-year');
        if (puncYear) puncYear.addEventListener('change', () => this.loadPunctualityStats());

        const puncMonth = document.getElementById('filter-punctuality-month');
        if (puncMonth) puncMonth.addEventListener('change', () => this.loadPunctualityStats());

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
            if (table === 'wildlife_strikes') this.loadWildlifeStrikes();
            if (table === 'rescued_wildlife') this.loadRescuedWildlife();
            if (table === 'daily_flights_ops') this.loadDailyFlightsOps();
            if (table === 'medical_attentions') this.loadMedical();
            if (table === 'delays') this.loadDelays();
            if (table === 'punctuality_stats') this.loadPunctualityStats();
            if (table === 'weekly_frequencies') this.loadWeeklyFrequencies();
            if (table === 'weekly_frequencies_int') this.loadWeeklyFrequenciesInt();

            if (table === 'monthly_operations') {
                this.loadMonthlyOperations();
                this.updateAnnualDataAndCharts();
            }
            if (table === 'annual_operations') {
                this.loadAnnualOperations();
                this.syncChartsData();
            }
            if (table === 'library_categories' || table === 'library_items') {
                this.loadLibraryCategories();
                this.loadLibraryItems();
            }
            if (table === 'system_alerts') {
                this.loadSystemAlertsTable();
            }
        });

        // Initial load if section is active (or just load the first tab)
        // this.loadOperationsSummary();
        this.loadMonthlyOperations();
        this.loadAnnualOperations();
        this.syncChartsData();
        this.setupGlobalRefresh();
    }

    setupGlobalRefresh() {
        const btn = document.getElementById('btn-global-refresh');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            // Animation
            const icon = btn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');

            try {
                // 1. Refresh Data Management Tab if active
                const activeTab = document.querySelector('.tab-pane.active');
                if (activeTab) {
                    const tabId = '#' + activeTab.id;
                    console.log('Refreshing tab:', tabId);
                    await this.loadTabContent(tabId);
                }

                // 2. Refresh Main Dashboard Data (if functions are available)
                if (typeof window.loadWeeklyOperationsFromDB === 'function') {
                    window.loadWeeklyOperationsFromDB();
                }

                // Refresh Demoras if active
                if (typeof window.ensureDemorasState === 'function') {
                    // Force re-fetch? demoras module might need a 'force' flag
                    // We can try dispatching an event that demoras.js listens to?
                    // Or access the internal loader if exposed. 
                    // Actually, let's just use the data-updated event which triggers most loaders
                    window.dispatchEvent(new CustomEvent('data-updated', { detail: { table: 'all' } }));
                }

            } catch (err) {
                console.error('Error refreshing data:', err);
            } finally {
                // Stop animation
                setTimeout(() => {
                    if (icon) icon.classList.remove('fa-spin');
                }, 800);
            }
        });
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
        if (targetId === '#pane-wildlife') this.loadWildlifeStrikes();
        if (targetId === '#pane-rescued-wildlife') this.loadRescuedWildlife();
        if (targetId === '#pane-daily-flights-ops') this.loadDailyFlightsOps();
        if (targetId === '#pane-medical') {
            this.loadMedicalAttentions();
            this.loadMedicalTypes();
            this.loadMedicalDirectory();
        }
        if (targetId === '#pane-medical-attentions') this.loadMedicalAttentions();
        if (targetId === '#pane-medical-types') this.loadMedicalTypes();
        if (targetId === '#pane-medical-directory') this.loadMedicalDirectory();

        if (targetId === '#pane-delays') this.loadDelays();
        if (targetId === '#pane-punctuality-table') this.loadPunctualityStats();
        if (targetId === '#pane-weekly-frequencies') this.loadWeeklyFrequencies();
        if (targetId === '#pane-weekly-frequencies-int') this.loadWeeklyFrequenciesInt();
        if (targetId === '#pane-library') {
            this.loadLibraryCategories();
            this.loadLibraryItems();
        }
        if (targetId === '#pane-alerts') {
            this.loadSystemAlertsTable();
        }
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
                    const m = String(item.date).slice(5, 7);
                    return m === monthFilter;
                });
            }
            // Category filtering removed â€” show all rows matching date/month filters

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
                btnDelete.onclick = () => this.deleteItem('daily_operations', item.date);
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
            const years = Array.from(new Set((allData || []).map(r => String(r.year)))).sort((a, b) => Number(b) - Number(a));

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
                const map = { '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre' };
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
                // Pass the whole item so we can determine ID or fallback to keys
                btnDelete.onclick = () => this.deleteItem('monthly_operations', item);
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

            const annualData = Object.values(byYear).sort((a, b) => Number(b.year) - Number(a.year));
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

    async loadWildlifeStrikes() {
        try {
            const data = await window.dataManager.getWildlifeStrikes();
            this.renderTable('table-wildlife', data, ['date', 'time', 'species', 'location', 'common_name', 'action_taken'], 'wildlife_strikes');
        } catch (error) {
            console.error('Error loading wildlife strikes:', error);
        }
    }

    async loadRescuedWildlife() {
        try {
            const data = await window.dataManager.getRescuedWildlife();
            this.renderTable('table-rescued-wildlife', data, ['date', 'time', 'common_name', 'class', 'final_disposition'], 'rescued_wildlife');
        } catch (error) {
            console.error('Error loading rescued wildlife:', error);
        }
    }

    async loadDailyFlightsOps() {
        const tbodyArr = document.querySelector('#table-daily-flights-arrivals tbody');
        const tbodyDep = document.querySelector('#table-daily-flights-departures tbody');

        if (tbodyArr) tbodyArr.innerHTML = '<tr><td colspan="9" class="text-center py-4">Cargando...</td></tr>';
        if (tbodyDep) tbodyDep.innerHTML = '<tr><td colspan="9" class="text-center py-4">Cargando...</td></tr>';

        const filterDateEl = document.getElementById('filter-daily-flights-date');
        const filterDate = filterDateEl ? filterDateEl.value : null;

        try {
            const supabase = this.client || window.supabaseClient;
            if (!supabase) throw new Error("Cliente Supabase no inicializado");

            let query = supabase
                .from('vuelos_parte_operaciones')
                .select('*')
                .order('date', { ascending: false });

            if (filterDate) {
                query = query.eq('date', filterDate);
            } else {
                query = query.limit(20);
            }

            const { data: rows, error } = await query;
            if (error) throw error;

            let arrivals = [];
            let departures = [];

            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    const dateStr = row.date;
                    if (Array.isArray(row.data)) {
                        row.data.forEach(op => {
                            const normalized = { ...op };

                            // Normalization
                            if (op['Hora programada_llegada']) normalized.fecha_hora_prog_llegada = op['Hora programada_llegada'];
                            if (op['Hora de salida_llegada']) normalized.fecha_hora_real_llegada = op['Hora de salida_llegada'];
                            if (op['Hora programada_salida']) normalized.fecha_hora_prog_salida = op['Hora programada_salida'];
                            if (op['Hora de salida_salida']) normalized.fecha_hora_real_salida = op['Hora de salida_salida'];

                            if (op['Vuelo de llegada']) normalized.vuelo_llegada = op['Vuelo de llegada'];
                            if (op['Vuelo de salida']) normalized.vuelo_salida = op['Vuelo de salida'];
                            if (op['Pasajeros llegada']) normalized.pasajeros_llegada = op['Pasajeros llegada'];
                            if (op['Pasajeros salida']) normalized.pasajeros_salida = op['Pasajeros salida'];
                            if (op['MatrÃ­cula']) normalized.matricula = op['MatrÃ­cula'];
                            if (op['Origen']) normalized.origen = op['Origen'];
                            if (op['Destino']) normalized.destino = op['Destino'];
                            if (op['aerolinea']) normalized.aerolinea = op['aerolinea'];

                            if (normalized.seq_no === undefined && normalized.no !== undefined) normalized.seq_no = normalized.no;

                            const baseOp = { ...normalized, fecha: dateStr };

                            if (baseOp.vuelo_llegada || baseOp.fecha_hora_prog_llegada) arrivals.push(baseOp);
                            if (baseOp.vuelo_salida || baseOp.fecha_hora_prog_salida) departures.push(baseOp);
                        });
                    }
                });
            }

            // Mantener el orden original del JSON (suele ser Pasajeros -> Carga -> General)
            // No ordenar por SEQ_NO porque reinicia en cada secciÃ³n.
            // arrivals.sort(sorter);
            // departures.sort(sorter);

            this.renderDailyOpsFancy(arrivals, 'arrival', '#table-daily-flights-arrivals');
            this.renderDailyOpsFancy(departures, 'departure', '#table-daily-flights-departures');

        } catch (error) {
            console.error('Error loading daily flights ops:', error);
            if (tbodyArr) tbodyArr.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
            if (tbodyDep) tbodyDep.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;

        const btnEdit = document.getElementById('btn-dm-toggle-edit');
        const btnSave = document.getElementById('btn-dm-save-edit');

        if (this.isEditMode) {
            if (btnEdit) {
                btnEdit.classList.remove('btn-outline-primary');
                btnEdit.classList.add('btn-primary');
                btnEdit.innerHTML = '<i class="fas fa-edit me-1"></i> Cancelar';
            }
            if (btnSave) btnSave.classList.remove('d-none');
        } else {
            if (btnEdit) {
                btnEdit.classList.add('btn-outline-primary');
                btnEdit.classList.remove('btn-primary');
                btnEdit.innerHTML = '<i class="fas fa-edit me-1"></i> Editar';
            }
            if (btnSave) btnSave.classList.add('d-none');
        }

        this.loadDailyFlightsOps();
    }

    async saveEditedData() {
        if (!confirm("Â¿Guardar cambios en GestiÃ³n de Datos?")) return;

        const inputs = document.querySelectorAll('.dm-input-edit');
        if (inputs.length === 0) {
            this.toggleEditMode();
            return;
        }

        // We need to group updates by Date because Supabase stores data per day row
        // Structure needed: Map<Date, ArrayOfFlights>

        // However, we don't have the full original array in memory easily unless we stored it.
        // We can fetch the specific days involved.

        try {
            const supabase = this.client || window.supabaseClient;

            // 1. Identify distinct dates being edited
            const distinctDates = new Set();
            inputs.forEach(input => {
                if (input.dataset.date) distinctDates.add(input.dataset.date);
            });

            for (const dateStr of distinctDates) {
                // Fetch current state from DB (to avoid overwriting concurrent changes or missing items)
                const { data: rowData, error: fetchErr } = await supabase
                    .from('vuelos_parte_operaciones')
                    .select('data')
                    .eq('date', dateStr)
                    .single();

                if (fetchErr) throw fetchErr;

                let flights = rowData.data || [];
                let modified = false;

                // Apply changes for this date
                const dateInputs = document.querySelectorAll(`.dm-input-edit[data-date="${dateStr}"]`);

                dateInputs.forEach(input => {
                    const seq = input.dataset.seq; // this is actually seq_no or 'no'
                    const field = input.dataset.field;
                    const rowType = input.dataset.rowType; // 'arrival' or 'departure'
                    // Handle numbers
                    let newVal = input.value;
                    if (input.type === 'number') newVal = newVal ? parseFloat(newVal) : 0;

                    // Find flight in array with Robust Logic (Seq + Type Check)
                    const fIndex = flights.findIndex(f => {
                        const matchesSeq = String(f.seq_no || f.no) === String(seq);
                        if (!matchesSeq) return false;

                        // If we have a rowType, try to disambiguate
                        if (rowType === 'arrival') {
                            // Valid if it looks like an arrival (has arrival flight or arrival time)
                            if (f.vuelo_llegada || f['Vuelo de llegada'] || f.fecha_hora_prog_llegada || f['Hora programada_llegada']) return true;
                            // Fallback: if it has NO departure info, assume it's arrival? Risk.
                            return false;
                        }
                        if (rowType === 'departure') {
                            if (f.vuelo_salida || f['Vuelo de salida'] || f.fecha_hora_prog_salida || f['Hora programada_salida']) return true;
                            return false;
                        }
                        return true; // No type info? match purely on seq
                    });

                    if (fIndex > -1) {
                        // Found flight
                        const oldFlightState = { ...flights[fIndex] }; // Clone for audit
                        flights[fIndex][field] = newVal;

                        // Special Handling: Synchronize redundant fields
                        // Ensure we update both "Normalized" and "Original" keys to handle casing/legacy quirks

                        // ARRIVAL ALIASES
                        if (field === 'vuelo_llegada') { flights[fIndex]['Vuelo de llegada'] = newVal; flights[fIndex]['vuelo_llegada'] = newVal; }
                        if (field === 'pasajeros_llegada') { flights[fIndex]['Pasajeros llegada'] = newVal; flights[fIndex]['pasajeros_llegada'] = newVal; }
                        if (field === 'fecha_hora_prog_llegada') { flights[fIndex]['Hora programada_llegada'] = newVal; flights[fIndex]['fecha_hora_prog_llegada'] = newVal; }
                        if (field === 'fecha_hora_real_llegada') { flights[fIndex]['Hora de salida_llegada'] = newVal; flights[fIndex]['fecha_hora_real_llegada'] = newVal; }
                        if (field === 'origen') { flights[fIndex]['Origen'] = newVal; flights[fIndex]['origen'] = newVal; }

                        // DEPARTURE ALIASES
                        if (field === 'vuelo_salida') { flights[fIndex]['Vuelo de salida'] = newVal; flights[fIndex]['vuelo_salida'] = newVal; }
                        if (field === 'pasajeros_salida') { flights[fIndex]['Pasajeros salida'] = newVal; flights[fIndex]['pasajeros_salida'] = newVal; }
                        if (field === 'matricula') { flights[fIndex]['MatrÃ­cula'] = newVal; flights[fIndex]['matricula'] = newVal; }
                        if (field === 'fecha_hora_prog_salida') { flights[fIndex]['Hora programada_salida'] = newVal; flights[fIndex]['fecha_hora_prog_salida'] = newVal; }
                        if (field === 'fecha_hora_real_salida') { flights[fIndex]['Hora de salida_salida'] = newVal; flights[fIndex]['fecha_hora_real_salida'] = newVal; }
                        if (field === 'destino') { flights[fIndex]['Destino'] = newVal; flights[fIndex]['destino'] = newVal; }

                        // Common
                        if (field === 'aerolinea') { flights[fIndex]['aerolinea'] = newVal; flights[fIndex]['Aerolinea'] = newVal; }

                        modified = true;

                        // Security Audit Log
                        if (typeof window.logHistory === 'function') {
                            window.logHistory('EDITAR', 'Vuelo Diario', `${dateStr} #${seq}`, {
                                old: oldFlightState,
                                new: flights[fIndex],
                                summary: `EdiciÃ³n de campo '${field}' en vuelo ${oldFlightState.vuelo_llegada || oldFlightState.vuelo_salida}`
                            });
                        }
                    } else {
                        console.warn(`Could not find flight for update: Date=${dateStr}, Seq=${seq}, Type=${rowType}`);
                    }
                });

                if (modified) {
                    const { error: updateErr } = await supabase
                        .from('vuelos_parte_operaciones')
                        .update({ data: flights })
                        .eq('date', dateStr);

                    if (updateErr) throw updateErr;
                }
            }

            // Success
            this.toggleEditMode(); // Exit edit mode
            alert('Cambios guardados correctamente.');
            // loadDailyFlightsOps handles re-render inside toggleEditMode if needed, but we called toggle which calls load.

        } catch (e) {
            console.error(e);
            alert('Error al guardar: ' + e.message);
        }
    }

    getAirlineConfigByName(name) {
        if (!name) return this.airlineConfig['default'];
        const slug = this.slugify(name);
        for (const key in this.airlineConfig) {
            if (slug.includes(key) || key.includes(slug)) return this.airlineConfig[key];
        }
        return this.airlineConfig['default'];
    }

    renderDailyOpsFancy(data, type, tableSelector) {
        const table = document.querySelector(tableSelector);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        const thead = table.querySelector('thead');

        // Inject Filter
        // Inject Filter
        let filterRow = thead.querySelector('.filter-row');
        if (!filterRow) {
            filterRow = document.createElement('tr');
            filterRow.className = 'filter-row text-center bg-light';
            const headers = thead.querySelectorAll('tr:not(.filter-row) th');

            headers.forEach((th, idx) => {
                const td = document.createElement('td');
                td.className = 'p-1';
                // Only add filter inputs for columns that have data and aren't purely actions/empty
                if (idx < headers.length) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'form-control form-control-sm border-0 bg-white text-center shadow-sm';
                    input.style.fontSize = '0.75rem';
                    input.placeholder = 'Filtrar...';

                    input.addEventListener('keyup', function () {
                        const term = this.value.toLowerCase();
                        const rows = tbody.querySelectorAll('tr');
                        rows.forEach(r => {
                            const cell = r.cells[idx];
                            if (cell) {
                                const txt = cell.textContent.toLowerCase();
                                r.style.display = txt.includes(term) ? '' : 'none';
                            }
                        });
                    });

                    td.appendChild(input);
                }
                filterRow.appendChild(td);
            });
            thead.appendChild(filterRow);
        }

        // Render Data
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Sin registros</td></tr>`;
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');

            const airlineName = row.aerolinea || 'N/A';
            const config = this.getAirlineConfigByName(airlineName);

            let logoHtml = `<span class="small fw-bold">${airlineName}</span>`;

            if (config.logo) {
                const logoFile = config.logo;

                // Logic to visually equalize logo sizes (Ported from parte-ops-flights.js)
                // Standard size
                let style = "max-height: 25px; max-width: 70px;";

                // Reduce size for notably bulky/square logos
                if (logoFile.includes('viva')) {
                    style = "max-height: 20px; max-width: 60px;";
                }

                // Boost size for logos that naturally look small (horizontal/text-heavy)
                const boostLogos = [
                    'logo_aeromexico.png', 'logo_volaris.png', 'logo_mexicana.png',
                    'logo_air_china.png', 'logo_tsm_airlines.png', 'logo_kalitta_air.jpg',
                    'logo_conviasa.png', 'logo_mas.png'
                ];

                // Mega size for specific cargo/wide logos requested to be bigger
                const megaLogos = [
                    'logo_estafeta.jpg', 'logo_cargojet.png',
                    'logo_cargolux.png',
                    'logo_suparna.png', 'logo_awesome_cargo.png',
                    'logo_atlas_air.png', 'logo_fedex_express.png', 'logo_dhl_guatemala_.png'
                ];

                // Specific Overrides for User reported issues (Viva, Conviasa, Mas Air)
                if (logoFile === 'logo_conviasa.png') {
                    // Conviasa is long, needs height restriction but allow width
                    style = "max-height: 25px; max-width: 75px;";
                }
                if (logoFile === 'logo_mas.png') {
                    style = "max-height: 25px; max-width: 70px;";
                }
                if (logoFile.includes('viva')) { // Redirect Viva strictly
                    style = "max-height: 18px; max-width: 60px;";
                }

                if (megaLogos.includes(logoFile)) {
                    style = "max-height: 28px; max-width: 85px;";
                }

                logoHtml = `<div class="d-flex align-items-center justify-content-center gap-2" title="${airlineName}">
                     <img src="images/airlines/${config.logo}" alt="${airlineName}" class="img-fluid" style="${style} width: auto; object-fit: contain;">
                   </div>`;
            }

            const airlineHtml = logoHtml;

            const flightNum = type === 'arrival' ? (row.vuelo_llegada || '') : (row.vuelo_salida || '');
            const timeProg = type === 'arrival' ? (row.fecha_hora_prog_llegada || '') : (row.fecha_hora_prog_salida || '');
            const timeReal = type === 'arrival' ? (row.fecha_hora_real_llegada || '') : (row.fecha_hora_real_salida || '');
            const loc = type === 'arrival' ? (row.origen || '') : (row.destino || '');
            const pax = type === 'arrival' ? (row.pasajeros_llegada || '') : (row.pasajeros_salida || '');
            const mat = row.matricula || '';

            const fmtTime = (t) => {
                if (!t) return '';
                if (t.includes('T')) return t.split('T')[1].substring(0, 5);
                return t.substring(0, 5);
            };

            const getInput = (val, field, width = '100%', inputType = 'text') => {
                if (!this.isEditMode) return null;

                let safeVal = (val !== undefined && val !== null) ? String(val) : '';
                safeVal = safeVal.replace(/"/g, '&quot;');

                return `<input type="${inputType}" class="form-control form-control-sm p-1 text-center dm-input-edit" 
                   style="min-width: ${width}; font-size: 0.75rem; height: 30px;" 
                   value="${safeVal}"
                   data-date="${row.fecha}"
                   data-seq="${row.seq_no || row.no}"
                   data-row-type="${type}"
                   data-field="${field}">`;
            };

            // Display Values
            let displayFlight = `<span class="fw-bold text-primary">${flightNum}</span>`;
            let displayLoc = `<span class="text-truncate" style="max-width: 100px; display: block;">${loc}</span>`;
            let displayProg = `<span class="small">${fmtTime(timeProg)}</span>`;
            let displayReal = `<span class="small fw-bold">${fmtTime(timeReal)}</span>`;
            let displayPax = `<span class="fw-bold text-dark">${pax}</span>`;
            let displayMat = `<span class="small font-monospace">${mat}</span>`;

            // Edit Inputs overrides
            if (this.isEditMode) {
                displayFlight = getInput(flightNum, type === 'arrival' ? 'vuelo_llegada' : 'vuelo_salida', '60px');
                displayLoc = getInput(loc, type === 'arrival' ? 'origen' : 'destino', '60px');
                displayProg = getInput(timeProg, type === 'arrival' ? 'fecha_hora_prog_llegada' : 'fecha_hora_prog_salida', '60px');
                displayReal = getInput(timeReal, type === 'arrival' ? 'fecha_hora_real_llegada' : 'fecha_hora_real_salida', '60px');
                displayPax = getInput(pax, type === 'arrival' ? 'pasajeros_llegada' : 'pasajeros_salida', '40px', 'number');
                displayMat = getInput(mat, 'matricula', '60px');
            }

            // Delete Action
            const deleteBtn = `<button class="btn btn-sm btn-link text-danger opacity-75 p-0" title="Eliminar vuelo" onclick="dataManagement.deleteSingleFlight('${row.fecha}', '${row.seq_no}', '${type}')">
                <i class="fas fa-times-circle"></i>
            </button>`;

            // Columns matching index.html structure
            if (type === 'arrival') {
                // No, Aerolinea, Vuelo, Origen, Prog, Real, Pax, Conci(empty), Action
                tr.innerHTML = `
                    <td class="fw-bold text-muted small">${row.seq_no || '-'}</td>
                    <td class="text-start ps-3 align-middle">${airlineHtml}</td>
                    <td class="align-middle">${displayFlight}</td>
                    <td class="align-middle">${displayLoc}</td>
                    <td class="align-middle">${displayProg}</td>
                    <td class="align-middle">${displayReal}</td>
                    <td class="align-middle">${displayPax}</td>
                    <td></td>
                    <td class="align-middle">${deleteBtn}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td class="text-start ps-3 align-middle">${airlineHtml}</td>
                    <td class="align-middle">${displayFlight}</td>
                    <td class="align-middle">${displayLoc}</td>
                    <td class="align-middle">${displayProg}</td>
                    <td class="align-middle">${displayReal}</td>
                    <td class="align-middle">${displayPax}</td>
                    <td class="align-middle">${displayMat}</td>
                    <td></td>
                    <td class="align-middle">${deleteBtn}</td>
                `;
            }
            tbody.appendChild(tr);
        });
    }

    async deleteSingleFlight(dateStr, seqNo, type) {
        if (!confirm('Â¿Eliminar este vuelo?')) return;
        try {
            const { data, error } = await this.client
                .from('vuelos_parte_operaciones')
                .select('data')
                .eq('date', dateStr)
                .single();

            if (error || !data) throw new Error('No se encontrÃ³ el registro del dÃ­a.');

            let flights = data.data || [];

            // Audit: Find the flight before deleting
            const flightToDelete = flights.find(f => {
                const fSeq = (f.seq_no !== undefined) ? f.seq_no : f.no;
                return String(fSeq) === String(seqNo);
            });

            const initialLen = flights.length;

            // Filter by sequence number primarily
            flights = flights.filter(f => {
                const fSeq = (f.seq_no !== undefined) ? f.seq_no : f.no;
                return String(fSeq) !== String(seqNo);
            });

            if (flights.length === initialLen) {
                alert('No se pudo localizar el vuelo especÃ­fico para eliminar (ID no coincide).');
                return;
            }

            const { error: updateErr } = await this.client
                .from('vuelos_parte_operaciones')
                .update({ data: flights })
                .eq('date', dateStr);

            if (updateErr) throw updateErr;

            // Security Audit Log
            if (typeof window.logHistory === 'function' && flightToDelete) {
                const flightLabel = flightToDelete.vuelo_llegada || flightToDelete.vuelo_salida || 'Desc.';
                window.logHistory('ELIMINAR', 'Vuelo Diario', `${dateStr} #${seqNo}`, {
                    old: flightToDelete,
                    new: null, // Deletion
                    summary: `Se eliminÃ³ el vuelo ${flightLabel} de ${flightToDelete.aerolinea || 'N/A'}`
                });
            }

            this.loadDailyFlightsOps();

        } catch (e) {
            console.error(e);
            alert('Error al eliminar: ' + e.message);
        }
    }

    async deleteDailyOpsByDate() {
        const filterDateEl = document.getElementById('filter-daily-flights-date');
        const filterDate = filterDateEl ? filterDateEl.value : null;

        if (!filterDate) {
            alert('Por favor selecciona una fecha especÃ­fica para eliminar.');
            return;
        }

        if (!confirm(`Â¿EstÃ¡s SEGURO de que deseas ELIMINAR TODOS los vuelos del dÃ­a ${filterDate}?\n\nEsta acciÃ³n borrarÃ¡ el itinerario completo de esa fecha y no se puede deshacer.`)) {
            return;
        }

        try {
            const supabase = this.client || window.supabaseClient;
            if (!supabase) throw new Error("Cliente Supabase no inicializado");

            // Check count first
            const { count, error: countErr } = await supabase
                .from('vuelos_parte_operaciones')
                .select('*', { count: 'exact', head: true })
                .eq('date', filterDate);

            if (countErr) throw countErr;

            if (count === 0) {
                alert('No hay registros para borrar en esa fecha.');
                return;
            }

            const { error } = await supabase
                .from('vuelos_parte_operaciones')
                .delete()
                .eq('date', filterDate);

            if (error) throw error;

            alert(`Se eliminaron los registros correctamente.`);
            this.loadDailyFlightsOps();

        } catch (error) {
            console.error('Error deleting daily flights:', error);
            alert('Error al eliminar: ' + error.message);
        }
    }

    async loadMedicalAttentions() {
        const year = document.getElementById('filter-medical-year').value;
        try {
            const data = await window.dataManager.getMedicalAttentions(year);
            this.renderTable('table-medical', data, ['month', 'aifa_personnel', 'other_companies', 'passengers', 'visitors', 'total'], 'medical_attentions');
        } catch (error) {
            console.error('Error loading medical attentions:', error);
        }
    }

    async loadMedicalTypes() {
        const year = document.getElementById('filter-medical-types-year').value;
        try {
            const data = await window.dataManager.getMedicalTypes(year);
            this.renderTable('table-medical-types', data, ['month', 'traslado', 'ambulatorio', 'total'], 'medical_types');
        } catch (error) {
            console.error('Error loading medical types:', error);
        }
    }

    async loadMedicalDirectory() {
        try {
            const data = await window.dataManager.getMedicalDirectory();
            // Custom renderer for directory to handle Documents array
            const tbody = document.querySelector('#table-medical-directory tbody');
            tbody.innerHTML = '';

            data.forEach(item => {
                const tr = document.createElement('tr');

                // Asunto
                const tdSubject = document.createElement('td');
                tdSubject.textContent = item.asunto;
                tr.appendChild(tdSubject);

                // Responsable
                const tdResp = document.createElement('td');
                tdResp.textContent = item.responsable;
                tr.appendChild(tdResp);

                // Estado
                const tdStatus = document.createElement('td');
                tdStatus.textContent = item.estado;
                tr.appendChild(tdStatus);

                // Documentos
                const tdDocs = document.createElement('td');
                // Assume documents is JSONB array of strings (filenames)
                let docs = [];
                if (Array.isArray(item.documentos)) {
                    docs = item.documentos;
                } else if (typeof item.documentos === 'string') {
                    try { docs = JSON.parse(item.documentos); } catch (e) { }
                }

                if (docs.length > 0) {
                    tdDocs.className = "d-flex flex-column gap-1";

                    docs.forEach((d, idx) => {
                        const fileRow = document.createElement('div');
                        fileRow.className = "d-flex align-items-center justify-content-between p-1 border rounded bg-light";

                        // Resolve URL and Name
                        let url = '', name = '';
                        if (typeof d === 'object' && d !== null) {
                            url = d.url;
                            name = d.name || 'Documento';
                        } else {
                            const isUrl = typeof d === 'string' && (d.startsWith('http') || d.startsWith('//'));
                            url = isUrl ? d : `pdfs/directorio/${d}`;
                            name = isUrl ? (d.split('/').pop().split('_').pop() || 'Documento') : d;
                        }

                        // Link
                        const link = document.createElement('a');
                        link.href = url;
                        link.target = "_blank";
                        link.className = "text-decoration-none text-truncate small me-2";
                        link.style.maxWidth = "150px";
                        link.innerHTML = `<i class="fas fa-file-pdf text-danger me-1"></i> ${name}`;
                        link.title = name;

                        // Controls container
                        const controls = document.createElement('div');
                        controls.className = "d-flex gap-1";

                        // Edit Name Button
                        const btnRename = document.createElement('button');
                        btnRename.className = "btn btn-xs btn-link text-secondary p-0";
                        btnRename.innerHTML = '<i class="fas fa-pen"></i>';
                        btnRename.title = "Cambiar nombre";
                        btnRename.onclick = () => this.renameMedicalDoc(item.id, idx, name);

                        // Delete Button
                        const btnRemove = document.createElement('button');
                        btnRemove.className = "btn btn-xs btn-link text-danger p-0";
                        btnRemove.innerHTML = '<i class="fas fa-times"></i>';
                        btnRemove.title = "Eliminar documento";
                        btnRemove.onclick = () => this.deleteMedicalDoc(item.id, idx);

                        controls.appendChild(btnRename);
                        controls.appendChild(btnRemove);

                        fileRow.appendChild(link);
                        fileRow.appendChild(controls);
                        tdDocs.appendChild(fileRow);
                    });
                } else {
                    tdDocs.textContent = '-';
                }
                // Add upload button
                const btnUpload = document.createElement('button');
                btnUpload.className = 'btn btn-sm btn-link mt-1';
                btnUpload.innerHTML = '<i class="fas fa-upload"></i> Agregar PDF';
                btnUpload.onclick = () => this.uploadMedicalPdf(item.id);
                tdDocs.appendChild(btnUpload);

                tr.appendChild(tdDocs);

                // Order Column Input
                const tdOrder = document.createElement('td');
                const inputOrder = document.createElement('input');
                inputOrder.type = 'number';
                inputOrder.className = 'form-control form-control-sm';
                inputOrder.style.width = '60px';
                inputOrder.value = item.order_index !== undefined ? item.order_index : 1000;
                inputOrder.onchange = async (e) => {
                    try {
                        await window.dataManager.updateTable('medical_directory', item.id, { order_index: Number(e.target.value) });
                        e.target.style.borderColor = 'green';
                    } catch (err) { alert('Error actualizando orden'); }
                };
                tdOrder.appendChild(inputOrder);
                // Prepend to row (making it the first column visually, user needs to update header in HTML manually or we do it here if possible)
                tr.insertBefore(tdOrder, tr.firstChild);


                // Actions
                const tdActions = document.createElement('td');
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
                btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                btnEdit.onclick = () => this.editItem('medical_directory', item);
                tdActions.appendChild(btnEdit);

                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn btn-sm btn-outline-danger';
                btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                btnDelete.onclick = () => this.deleteItem('medical_directory', item.id);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error loading medical directory:', error);
        }
    }

    async renameMedicalDoc(id, docIndex, currentName) {
        const newName = prompt("Nuevo nombre para el documento:", currentName);
        if (!newName || newName.trim() === currentName) return;

        try {
            const { data: currentData, error: fetchError } = await this.client
                .from('medical_directory')
                .select('documentos')
                .eq('id', id)
                .single();
            if (fetchError) throw fetchError;

            let docs = [];
            if (currentData.documentos) {
                docs = typeof currentData.documentos === 'string' ? JSON.parse(currentData.documentos) : currentData.documentos;
            }

            if (docIndex >= 0 && docIndex < docs.length) {
                const doc = docs[docIndex];
                // Convert to object if legacy string
                if (typeof doc === 'string') {
                    docs[docIndex] = { url: doc, name: newName.trim() };
                } else if (typeof doc === 'object') {
                    docs[docIndex].name = newName.trim();
                }

                const { error: updateError } = await this.client
                    .from('medical_directory')
                    .update({ documentos: docs })
                    .eq('id', id);
                if (updateError) throw updateError;

                this.loadMedicalDirectory();
            }
        } catch (e) {
            console.error(e);
            alert('Error al renombrar: ' + e.message);
        }
    }

    async deleteMedicalDoc(id, docIndex) {
        if (!confirm("Â¿Eliminar este documento?")) return;
        try {
            const { data: currentData, error: fetchError } = await this.client
                .from('medical_directory')
                .select('documentos')
                .eq('id', id)
                .single();
            if (fetchError) throw fetchError;

            let docs = [];
            if (currentData.documentos) {
                docs = typeof currentData.documentos === 'string' ? JSON.parse(currentData.documentos) : currentData.documentos;
            }

            if (docIndex >= 0 && docIndex < docs.length) {
                docs.splice(docIndex, 1); // Remove item

                const { error: updateError } = await this.client
                    .from('medical_directory')
                    .update({ documentos: docs })
                    .eq('id', id);
                if (updateError) throw updateError;

                this.loadMedicalDirectory();
            }

        } catch (e) {
            console.error(e);
            alert('Error al eliminar documento: ' + e.message);
        }
    }

    async uploadMedicalPdf(id) {
        // Create file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Ask user for a display name
            let displayName = prompt("Ingrese el nombre que desea mostrar para este archivo:", file.name.replace('.pdf', ''));
            if (displayName === null) return; // User cancelled
            if (!displayName.trim()) displayName = file.name;

            try {
                // 1. Upload to Supabase Storage
                // Generate a unique path: medical_docs/recordId/timestamp_filename
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `medical_docs/${id}/${Date.now()}_${cleanName}`;

                // Show loading state (global spinner or alert for now)
                document.body.style.cursor = 'wait';

                const { data: uploadData, error: uploadError } = await this.client
                    .storage
                    .from('medical-files')
                    .upload(filePath, file);

                if (uploadError) throw new Error('Error subiendo archivo: ' + uploadError.message);

                // 2. Get Public URL
                const { data: { publicUrl } } = this.client
                    .storage
                    .from('medical-files')
                    .getPublicUrl(filePath);

                // 3. Update Record
                // First get current doc list to append
                const { data: currentData, error: fetchError } = await this.client
                    .from('medical_directory')
                    .select('documentos')
                    .eq('id', id)
                    .single();

                if (fetchError) throw new Error('Error leyendo registro actual');

                let docs = [];
                if (currentData.documentos) {
                    docs = typeof currentData.documentos === 'string'
                        ? JSON.parse(currentData.documentos)
                        : currentData.documentos;
                }
                if (!Array.isArray(docs)) docs = [];

                // Store object with url and name
                docs.push({ url: publicUrl, name: displayName.trim() });

                const { error: updateError } = await this.client
                    .from('medical_directory')
                    .update({ documentos: docs })
                    .eq('id', id);

                if (updateError) throw new Error('Error actualizando base de datos');

                alert('Documento subido correctamente');
                this.loadMedicalDirectory();

            } catch (err) {
                console.error('Upload failed:', err);
                alert('Fallo la carga: ' + err.message);
            } finally {
                document.body.style.cursor = 'default';
            }
        };

        input.click();
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

    async loadPunctualityStats() {
        const yearInput = document.getElementById('filter-punctuality-year');
        const monthInput = document.getElementById('filter-punctuality-month');

        // Ensure values are clean strings or numbers
        const year = yearInput ? yearInput.value : null;
        const month = monthInput ? monthInput.value : null;

        try {
            // Pass null if empty string to avoid incorrect filtering query
            let data = await window.dataManager.getPunctualityStats(
                (month === "" ? null : month),
                (year === "" ? null : year)
            );

            // Sort: Passengers first, then Cargo, then by Airline name
            data.sort((a, b) => {
                const catA = String(a.category || '').toLowerCase();
                const catB = String(b.category || '').toLowerCase();

                const isPaxA = catA.includes('pasajero') || catA.includes('comercial');
                const isPaxB = catB.includes('pasajero') || catB.includes('comercial');

                if (isPaxA && !isPaxB) return -1; // A (Pax) comes before B (Non-Pax)
                if (!isPaxA && isPaxB) return 1;  // B (Pax) comes before A (Non-Pax)

                // If same category type, sort by airline name
                const airA = String(a.airline || '').toLowerCase();
                const airB = String(b.airline || '').toLowerCase();
                if (airA < airB) return -1;
                if (airA > airB) return 1;
                return 0;
            });

            this.renderTable('table-punctuality-stats', data, ['year', 'month', 'airline', 'category', 'on_time', 'delayed', 'cancelled', 'total_flights'], 'punctuality_stats');
        } catch (error) {
            console.error('Error loading punctuality stats:', error);
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

                // Use schema options for mapping if available (Generic for all select fields)
                let display = raw == null ? '' : String(raw);
                const schema = this.schemas[tableName] || [];
                const fld = schema.find(f => f.name === col);
                if (fld && fld.options) {
                    const opt = fld.options.find(o => String(o.value) === display || (display !== '' && o.value === String(Number(display)).padStart(2, '0')));
                    if (opt) display = opt.label || opt.value;
                    td.textContent = display;
                }
                // Alignment: center for year/month, right for numeric, left otherwise
                else if (col === 'year' || col === 'month') {
                    td.classList.add('text-center');
                    td.textContent = display;
                } else if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
                    td.classList.add('text-end');
                    td.textContent = this.formatNumber(raw, col);
                }
                // Format any date-like column (name contains 'date' or is exactly 'date')
                else if (col && String(col).toLowerCase().includes('date')) {
                    td.textContent = this.formatDisplayDate(raw);
                } else if (col === 'year') {
                    // Do not apply thousands separator to year values
                    td.textContent = display;
                } else {
                    td.textContent = display;
                }

                tr.appendChild(td);
            });

            // Apply row color based on category (operations_summary & punctuality_stats)
            try {
                if (tableName === 'operations_summary' || tableName === 'punctuality_stats') {
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

    addAirlineToDestination(templateItem) {
        // Create a new object with only the destination fields
        const defaults = {
            week_label: templateItem.week_label,
            valid_from: templateItem.valid_from,
            valid_to: templateItem.valid_to,
            route_id: templateItem.route_id,
            city: templateItem.city,
            state: templateItem.state,
            iata: templateItem.iata,
            // Leave airline and counts empty
            airline: '',
            monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0, weekly_total: 0
        };

        const schema = this.schemas['weekly_frequencies'];
        if (schema) {
            window.adminUI.openEditModal('weekly_frequencies', defaults, schema);
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

    updateWeeklyFreqHeaders(weekLabel, tableId = 'table-weekly-frequencies') {
        const startDate = this.parseDateFromWeekLabel(weekLabel);
        if (!startDate) return;

        const table = document.getElementById(tableId);
        if (!table) return;
        const headers = table.querySelectorAll('thead th');
        const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

        // Indices 4 to 10 correspond to L-D (0: Semana, 1: Id, 2: Ruta, 3: AerolÃ­nea, 4: L, ..., 10: D)
        for (let i = 0; i < 7; i++) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + i);
            const dayStr = current.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });

            if (headers[i + 4]) {
                headers[i + 4].innerHTML = `${days[i]}<br><small class="text-muted fw-normal" style="font-size: 0.7rem;">${dayStr}</small>`;
            }
        }
    }

    deleteItem(tableName, id) {
        let pkField = 'id';
        let recordId = id;

        if (tableName === 'daily_operations') {
            pkField = 'date';
        } else if (tableName === 'monthly_operations') {
            // If passed an object (item), try to extract ID or use composite key
            if (typeof id === 'object' && id !== null) {
                if (id.id) {
                    recordId = id.id;
                    pkField = 'id';
                } else {
                    // Start of fallback for missing ID
                    recordId = { year: id.year, month: id.month };
                    pkField = null; // Use composite match
                }
            }
        }

        window.adminUI.deleteRecord(tableName, recordId, pkField);
    }

    async deleteWeeklyTemplate() {
        const labelSelect = document.getElementById('filter-weekly-freq-label');
        const currentLabel = labelSelect ? labelSelect.value : '';

        if (!currentLabel) {
            alert('Por favor selecciona una semana para eliminar.');
            return;
        }

        if (!confirm(`Â¿EstÃ¡s seguro de que deseas ELIMINAR TODAS las frecuencias de la semana "${currentLabel}"?\n\nEsta acciÃ³n no se puede deshacer.`)) {
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
        // Same month: "Semana del 08 al 14 Dic 2025"
        // Diff month: "Semana del 29 Dic al 04 Ene 2026"

        if (m1 === m2 && y1 === y2) {
            return `Semana del ${day1Str} al ${day2Str} ${mon1Str} ${y1}`;
        } else {
            // If years are different, we usually append the year at the end.
            // But if it spans years, we might want "29 Dic - 04 Ene 2026" (end year)
            return `Semana del ${day1Str} ${mon1Str} al ${day2Str} ${mon2Str} ${y2}`;
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
                    tr.classList.add('freq-row-hover'); // Add hover class for better UX

                    // Group Hover Logic
                    const groupId = key.replace(/[^a-zA-Z0-9]/g, '_');
                    tr.dataset.groupId = groupId;

                    tr.onmouseenter = function () {
                        const gid = this.dataset.groupId;
                        const rows = this.closest('tbody').querySelectorAll(`tr[data-group-id="${gid}"]`);
                        rows.forEach(r => r.classList.add('group-hover'));
                    };
                    tr.onmouseleave = function () {
                        const gid = this.dataset.groupId;
                        const rows = this.closest('tbody').querySelectorAll(`tr[data-group-id="${gid}"]`);
                        rows.forEach(r => r.classList.remove('group-hover'));
                    };

                    // Determine airline config (Prioritize DB values over legacy config)
                    const slug = this.slugify(groupItem.airline || 'default');
                    const legacyConfig = this.airlineConfig[slug] || this.airlineConfig['default'];
                    
                    const config = {
                        color: groupItem.color || legacyConfig.color,
                        logo: groupItem.logo || legacyConfig.logo,
                        text: (groupItem.color) ? '#ffffff' : legacyConfig.text
                    };

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
                        tdWeek.classList.add('shared-info-cell'); // ADDED CLASS
                        tr.appendChild(tdWeek);

                        const tdRouteId = document.createElement('td');
                        tdRouteId.textContent = groupItem.route_id || groupItem.iata || '-';
                        tdRouteId.style.backgroundColor = '#ffffff';
                        tdRouteId.style.color = '#212529';
                        tdRouteId.rowSpan = groupItems.length;
                        tdRouteId.style.verticalAlign = 'middle';
                        tdRouteId.classList.add('shared-info-cell'); // ADDED CLASS
                        tr.appendChild(tdRouteId);

                        const tdRoute = document.createElement('td');
                        tdRoute.innerHTML = `<div><strong>${groupItem.city}</strong></div><small>${groupItem.state || ''}</small>`;
                        tdRoute.style.backgroundColor = '#ffffff';
                        tdRoute.style.color = '#212529';
                        tdRoute.rowSpan = groupItems.length;
                        tdRoute.style.verticalAlign = 'middle';
                        tdRoute.classList.add('shared-info-cell'); // ADDED CLASS

                        // Add "Add Airline" button
                        const btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-sm btn-outline-success d-block mx-auto mt-2';
                        btnAdd.style.fontSize = '0.7rem';
                        btnAdd.style.padding = '2px 6px';
                        btnAdd.innerHTML = '<i class="fas fa-plus"></i> AerolÃ­nea';
                        btnAdd.title = 'Agregar aerolÃ­nea a este destino';
                        btnAdd.onclick = () => this.addAirlineToDestination(groupItem);
                        tdRoute.appendChild(btnAdd);

                        tr.appendChild(tdRoute);
                    }

                    // Airline
                    const tdAirline = document.createElement('td');
                    tdAirline.style.backgroundColor = '#ffffff';
                    tdAirline.style.color = config.color;
                    tdAirline.style.borderLeft = `8px solid ${config.color}`;
                    tdAirline.style.verticalAlign = 'middle';
                    tdAirline.className = 'text-center';

                    if (config.logo) {
                        let logoStyle = 'height: 24px; max-width: 100px; object-fit: contain;';
                        if (['aeromexico', 'volaris', 'mexicana'].includes(slug)) {
                            logoStyle = 'height: 55px; max-width: 140px; object-fit: contain;';
                        }
                        tdAirline.innerHTML = `<img src="images/airlines/${config.logo}" alt="${groupItem.airline}" title="${groupItem.airline}" style="${logoStyle}">`;
                    } else {
                        tdAirline.textContent = groupItem.airline;
                    }
                    tr.appendChild(tdAirline);

                    // Days
                    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                        const td = document.createElement('td');
                        td.className = 'text-center border-start';
                        td.style.verticalAlign = 'top'; // Align top for lists
                        td.style.color = '#ffffff';
                        td.style.fontSize = '0.85rem'; // Smaller font for details
                        
                        // Show count if simple, or detail if available
                        const count = groupItem[day] || 0;
                        const detail = groupItem[day + '_detail'];
                        
                        if (detail && count > 0) {
                            td.innerHTML = `<span class="weekly-freq-value" data-field="${day}" data-id="${groupItem.id}">${detail}</span>`;
                        } else {
                            td.innerHTML = `<span class="weekly-freq-value" data-field="${day}" data-id="${groupItem.id}">${count > 0 ? count : '-'}</span>`;
                        }
                        
                        // Inherit row color
                        tr.appendChild(td);
                    });

                    // Total
                    const tdTotal = document.createElement('td');
                    tdTotal.className = 'text-center fw-bold border-start freq-total-cell'; // Custom class for total column styling
                    tdTotal.style.verticalAlign = 'middle';
                    tdTotal.style.color = '#ffffff';
                    tdTotal.textContent = groupItem.weekly_total;
                    tr.appendChild(tdTotal);

                    // Actions
                    const tdActions = document.createElement('td');
                    tdActions.className = 'text-center border-start';
                    tdActions.style.verticalAlign = 'middle';
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
                const map = { '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre' };
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
            const annualDataList = Object.values(byYear).sort((a, b) => Number(b.year) - Number(a.year));
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
                const map = { '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre' };
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

    // --- International Weekly Frequencies ---

    async loadWeeklyFrequenciesInt() {
        try {
            const labelSelect = document.getElementById('filter-weekly-freq-int-label');
            const airlineSelect = document.getElementById('filter-weekly-freq-int-airline');
            const destSelect = document.getElementById('filter-weekly-freq-int-destination');

            let selectedLabel = labelSelect ? labelSelect.value : '';
            let selectedAirline = airlineSelect ? airlineSelect.value : '';
            let selectedDest = destSelect ? destSelect.value : '';

            // Fetch data based on selection. If empty, fetch latest.
            let data = await window.dataManager.getWeeklyFrequenciesInt(selectedLabel);

            // Update headers with dates if data exists
            if (data && data.length > 0 && data[0].week_label) {
                this.updateWeeklyFreqHeaders(data[0].week_label, 'table-weekly-frequencies-int');
            }

            if (labelSelect && (labelSelect.options.length <= 1 || !selectedLabel)) {
                const allData = await window.dataManager.getWeeklyFrequenciesInt();

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

                if (destSelect) {
                    const uniqueDest = [...new Set(allData.map(item => item.city))].sort();
                    const currentDest = destSelect.value;
                    destSelect.innerHTML = '<option value="">Todas</option>';
                    uniqueDest.forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city;
                        opt.textContent = city;
                        destSelect.appendChild(opt);
                    });
                    if (currentDest) destSelect.value = currentDest;
                }
            }

            if (selectedAirline) {
                data = data.filter(item => item.airline === selectedAirline);
            }
            if (selectedDest) {
                data = data.filter(item => item.city === selectedDest);
            }

            const tbody = document.querySelector('#table-weekly-frequencies-int tbody');
            tbody.innerHTML = '';

            // Manual mapping for clean international names
            const IATA_LOCATIONS = {
                'HAV': { city: 'La Habana', country: 'Cuba' },
                'PUJ': { city: 'Punta Cana', country: 'República Dominicana' },
                'SDQ': { city: 'Santo Domingo', country: 'República Dominicana' },
                'BOG': { city: 'Bogotá', country: 'Colombia' },
                'CCS': { city: 'Caracas', country: 'Venezuela' },
                'PTY': { city: 'Ciudad de Panamá', country: 'Panamá' },
                'IAH': { city: 'Houston', country: 'Estados Unidos' },
                'MIA': { city: 'Miami', country: 'Estados Unidos' },
                'LAX': { city: 'Los Ángeles', country: 'Estados Unidos' },
                'JFK': { city: 'Nueva York', country: 'Estados Unidos' },
                'ORD': { city: 'Chicago', country: 'Estados Unidos' },
                'DFW': { city: 'Dallas', country: 'Estados Unidos' },
                'MAD': { city: 'Madrid', country: 'España' },
                'CDG': { city: 'París', country: 'Francia' },
                'AMS': { city: 'Ámsterdam', country: 'Países Bajos' },
                'LHR': { city: 'Londres', country: 'Reino Unido' },
                'FRA': { city: 'Fráncfort', country: 'Alemania' },
                'DOH': { city: 'Doha', country: 'Catar' },
                'ICN': { city: 'Seúl', country: 'Corea del Sur' },
                'NRT': { city: 'Tokio', country: 'Japón' },
                'HKG': { city: 'Hong Kong', country: 'China' },
                'YYZ': { city: 'Toronto', country: 'Canadá' },
                'YVR': { city: 'Vancouver', country: 'Canadá' },
                'YUL': { city: 'Montreal', country: 'Canadá' },
                'LIM': { city: 'Lima', country: 'Perú' },
                'SCL': { city: 'Santiago', country: 'Chile' },
                'EZE': { city: 'Buenos Aires', country: 'Argentina' },
                'GRU': { city: 'São Paulo', country: 'Brasil' },
                'GIG': { city: 'Río de Janeiro', country: 'Brasil' },
                'MCALLEN': { city: 'McAllen', country: 'Estados Unidos' },
                'MFE': { city: 'McAllen', country: 'Estados Unidos' }
            };

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
                    tr.classList.add('freq-row-hover'); // Add hover class for better UX

                    // Group Hover Logic
                    const groupId = key.replace(/[^a-zA-Z0-9]/g, '_');
                    tr.dataset.groupId = groupId;

                    tr.onmouseenter = function () {
                        const gid = this.dataset.groupId;
                        const rows = this.closest('tbody').querySelectorAll(`tr[data-group-id="${gid}"]`);
                        rows.forEach(r => r.classList.add('group-hover'));
                    };
                    tr.onmouseleave = function () {
                        const gid = this.dataset.groupId;
                        const rows = this.closest('tbody').querySelectorAll(`tr[data-group-id="${gid}"]`);
                        rows.forEach(r => r.classList.remove('group-hover'));
                    };

                    const slug = this.slugify(groupItem.airline || 'default');
                    const config = this.airlineConfig[slug] || this.airlineConfig['default'];

                    tr.style.backgroundColor = config.color;
                    tr.style.color = config.text;
                    tr.style.setProperty('--bs-table-bg', 'transparent');
                    tr.style.setProperty('--bs-table-accent-bg', 'transparent');

                    if (index === 0) {
                        const tdWeek = document.createElement('td');
                        tdWeek.textContent = groupItem.week_label;
                        tdWeek.style.backgroundColor = '#ffffff';
                        tdWeek.style.color = '#212529';
                        tdWeek.rowSpan = groupItems.length;
                        tdWeek.style.verticalAlign = 'middle';
                        tdWeek.classList.add('shared-info-cell'); // ADDED CLASS
                        tr.appendChild(tdWeek);

                        const tdRouteId = document.createElement('td');
                        tdRouteId.textContent = groupItem.route_id || groupItem.iata || '-';
                        tdRouteId.style.backgroundColor = '#ffffff';
                        tdRouteId.style.color = '#212529';
                        tdRouteId.rowSpan = groupItems.length;
                        tdRouteId.style.verticalAlign = 'middle';
                        tdRouteId.classList.add('shared-info-cell'); // ADDED CLASS
                        tr.appendChild(tdRouteId);

                        let cityName = groupItem.city;
                        let stateName = groupItem.state;
                        
                        if (IATA_LOCATIONS[groupItem.iata]) {
                             cityName = IATA_LOCATIONS[groupItem.iata].city;
                             stateName = IATA_LOCATIONS[groupItem.iata].country;
                        }

                        const tdRoute = document.createElement('td');
                        tdRoute.innerHTML = `<div><strong>${cityName}</strong></div><small>${stateName || ''} (${groupItem.iata})</small>`;
                        tdRoute.style.backgroundColor = '#ffffff';
                        tdRoute.style.color = '#212529';
                        tdRoute.rowSpan = groupItems.length;
                        tdRoute.style.verticalAlign = 'middle';
                        tdRoute.classList.add('shared-info-cell'); // ADDED CLASS

                        const btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-sm btn-outline-success d-block mx-auto mt-2';
                        btnAdd.style.fontSize = '0.7rem';
                        btnAdd.style.padding = '2px 6px';
                        btnAdd.innerHTML = '<i class="fas fa-plus"></i> AerolÃ­nea';
                        btnAdd.title = 'Agregar aerolÃ­nea a este destino';
                        btnAdd.onclick = () => this.addInternationalAirlineToDestination(groupItem);
                        tdRoute.appendChild(btnAdd);

                        tr.appendChild(tdRoute);
                    }

                    const tdAirline = document.createElement('td');
                    tdAirline.style.backgroundColor = '#ffffff';
                    tdAirline.style.color = config.color;
                    tdAirline.style.borderLeft = `8px solid ${config.color}`;
                    tdAirline.style.verticalAlign = 'middle';
                    tdAirline.className = 'text-center';

                    if (config.logo) {
                        let logoStyle = 'height: 24px; max-width: 100px; object-fit: contain;';
                        if (['aeromexico', 'volaris', 'mexicana', 'copa', 'avianca'].includes(slug)) {
                            logoStyle = 'height: 40px; max-width: 120px; object-fit: contain;';
                        }
                        tdAirline.innerHTML = `<img src="images/airlines/${config.logo}" alt="${groupItem.airline}" title="${groupItem.airline}" style="${logoStyle}">`;
                    } else {
                        tdAirline.textContent = groupItem.airline;
                    }
                    tr.appendChild(tdAirline);

                    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                        const td = document.createElement('td');
                        td.className = 'text-center border-start';
                        td.style.verticalAlign = 'middle';
                        td.style.color = '#ffffff';
                        td.innerHTML = `<span class="weekly-freq-value" data-field="${day}" data-id="${groupItem.id}">${groupItem[day] || 0}</span>`;
                        tr.appendChild(td);
                    });

                    const tdTotal = document.createElement('td');
                    tdTotal.className = 'text-center fw-bold border-start freq-total-cell'; // Custom class for total column styling
                    tdTotal.style.verticalAlign = 'middle';
                    tdTotal.style.color = '#ffffff';
                    tdTotal.textContent = groupItem.weekly_total;
                    tr.appendChild(tdTotal);

                    const tdActions = document.createElement('td');
                    tdActions.className = 'text-center border-start';
                    tdActions.style.verticalAlign = 'middle';
                    tdActions.style.backgroundColor = '#ffffff';

                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-sm btn-outline-primary me-1';
                    btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                    btnEdit.onclick = () => this.editItem('weekly_frequencies_int', groupItem);
                    tdActions.appendChild(btnEdit);

                    const btnDelete = document.createElement('button');
                    btnDelete.className = 'btn btn-sm btn-outline-danger';
                    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                    btnDelete.onclick = () => this.deleteItem('weekly_frequencies_int', groupItem.id);
                    tdActions.appendChild(btnDelete);

                    tr.appendChild(tdActions);
                    tbody.appendChild(tr);
                });
            });

        } catch (error) {
            console.error('Error loading international weekly frequencies:', error);
        }
    }

    addInternationalAirlineToDestination(templateItem) {
        const defaults = {
            week_label: templateItem.week_label,
            valid_from: templateItem.valid_from,
            valid_to: templateItem.valid_to,
            route_id: templateItem.route_id,
            city: templateItem.city,
            state: templateItem.state,
            iata: templateItem.iata,
            airline: '',
            monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0, weekly_total: 0
        };

        const schema = this.schemas['weekly_frequencies_int'];
        if (schema) {
            window.adminUI.openEditModal('weekly_frequencies_int', defaults, schema);
        }
    }

    openCopyWeekModalInt() {
        const labelSelect = document.getElementById('filter-weekly-freq-int-label');
        const sourceLabel = labelSelect ? labelSelect.value : '';

        if (!sourceLabel) {
            alert('Por favor selecciona una semana origen primero.');
            return;
        }

        document.getElementById('copy-source-week-label').textContent = sourceLabel;

        const startDateInput = document.getElementById('copy-start-date');
        const endDateInput = document.getElementById('copy-end-date');
        startDateInput.value = '';
        endDateInput.value = '';
        document.getElementById('copy-preview-label').textContent = '';

        const btnConfirm = document.querySelector('#modal-copy-week .btn-primary');
        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

        newBtn.onclick = () => this.confirmCopyWeekInt();

        startDateInput.onchange = () => {
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

    async confirmCopyWeekInt() {
        const labelSelect = document.getElementById('filter-weekly-freq-int-label');
        const sourceLabel = labelSelect ? labelSelect.value : '';
        const start = document.getElementById('copy-start-date').value;
        const end = document.getElementById('copy-end-date').value;

        if (!start || !end) {
            alert('Debes seleccionar fecha de inicio y fin.');
            return;
        }

        const newLabel = this.generateWeekLabel(start, end);
        const newValidFrom = start;

        try {
            const sourceData = await window.dataManager.getWeeklyFrequenciesInt(sourceLabel);
            if (!sourceData || sourceData.length === 0) {
                alert('No hay datos en la semana origen.');
                return;
            }

            const newData = sourceData.map(item => {
                const { id, created_at, ...rest } = item;
                return {
                    ...rest,
                    week_label: newLabel,
                    valid_from: newValidFrom
                };
            });

            const { error } = await window.dataManager.client.from('weekly_frequencies_int').insert(newData);
            if (error) throw error;

            const modalEl = document.getElementById('modal-copy-week');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            alert(`Se copiaron ${newData.length} registros internacionales a la semana ${newLabel}.`);

            if (labelSelect) {
                labelSelect.innerHTML = '';
                await this.loadWeeklyFrequenciesInt();
                labelSelect.value = newLabel;
                this.loadWeeklyFrequenciesInt();
            }

        } catch (err) {
            console.error('Error copying week:', err);
            alert('Error al copiar: ' + err.message);
        }
    }

    async deleteWeeklyTemplateInt() {
        const labelSelect = document.getElementById('filter-weekly-freq-int-label');
        const currentLabel = labelSelect ? labelSelect.value : '';

        if (!currentLabel) {
            alert('Por favor selecciona una semana para eliminar.');
            return;
        }

        if (!confirm(`Â¿EstÃ¡s seguro de que deseas ELIMINAR TODAS las frecuencias internacionales de la semana "${currentLabel}"?\n\nEsta acciÃ³n no se puede deshacer.`)) {
            return;
        }

        try {
            const { error } = await window.dataManager.client
                .from('weekly_frequencies_int')
                .delete()
                .eq('week_label', currentLabel);

            if (error) throw error;

            alert(`Semana "${currentLabel}" eliminada exitosamente.`);

            if (labelSelect) {
                labelSelect.innerHTML = '';
                this.loadWeeklyFrequenciesInt();
            }

        } catch (err) {
            console.error('Error deleting week:', err);
            alert('Error al eliminar la semana: ' + err.message);
        }
    }

    toggleWeeklyEditModeInt() {
        const table = document.getElementById('table-weekly-frequencies-int');
        const btnEdit = document.getElementById('btn-edit-weekly-int-mode');
        const btnSave = document.getElementById('btn-save-weekly-int-changes');

        if (!table || !btnEdit || !btnSave) return;

        const isEditing = btnEdit.classList.contains('active');

        if (isEditing) {
            btnEdit.classList.remove('active', 'btn-secondary');
            btnEdit.classList.remove('text-white');
            btnEdit.classList.add('btn-outline-primary');
            btnEdit.innerHTML = '<i class="fas fa-edit"></i> Editar Tabla';
            btnSave.classList.add('d-none');
            this.loadWeeklyFrequenciesInt();
        } else {
            btnEdit.classList.add('active', 'btn-secondary', 'text-white');
            btnEdit.classList.remove('btn-outline-primary');
            btnEdit.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            btnSave.classList.remove('d-none');
            this.enableWeeklyTableEditing(table);
        }
    }

    async saveWeeklyChangesInt() {
        const table = document.getElementById('table-weekly-frequencies-int');
        const inputs = table.querySelectorAll('input[type="number"]');
        const updates = {};

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
            this.toggleWeeklyEditModeInt();
            return;
        }

        try {
            const promises = ids.map(id => {
                const rowInputs = table.querySelectorAll(`input[data-id="${id}"]`);
                let newTotal = 0;
                const rowUpdates = { ...updates[id] };

                rowInputs.forEach(inp => {
                    const val = parseInt(inp.value) || 0;
                    rowUpdates[inp.dataset.field] = val;
                    newTotal += val;
                });

                rowUpdates.weekly_total = newTotal;

                return window.dataManager.client
                    .from('weekly_frequencies_int')
                    .update(rowUpdates)
                    .eq('id', id);
            });

            await Promise.all(promises);

            alert('Cambios guardados exitosamente.');
            this.toggleWeeklyEditModeInt();

        } catch (err) {
            console.error('Error saving changes:', err);
            alert('Error al guardar cambios: ' + err.message);
        }
    }

    // --- Library Management ---
    async loadLibraryCategories() {
        try {
            const data = await window.dataManager.getLibraryCategories();
            this.renderTable('table-library-categories', data, ['icon', 'title', 'description', 'order_index'], 'library_categories');

            // Update library_items schema categories options
            const categoryOptions = data.map(c => ({ value: c.id, label: c.title }));
            if (this.schemas.library_items) {
                const catField = this.schemas.library_items.find(f => f.name === 'category_id');
                if (catField) catField.options = categoryOptions;
            }
        } catch (error) {
            console.error('Error loading library categories:', error);
        }
    }

    async loadLibraryItems() {
        try {
            const data = await window.dataManager.getLibraryItems();
            this.renderTable('table-library-items', data, ['category_id', 'title', 'type', 'url', 'order_index'], 'library_items');
            this.renderLibraryPublic(); // Update public view too
        } catch (error) {
            console.error('Error loading library items:', error);
        }
    }

    async renderLibraryPublic() {
        const container = document.getElementById('library-dynamic-container');
        if (!container) return;

        try {
            const categories = await window.dataManager.getLibraryCategories();
            const items = await window.dataManager.getLibraryItems();

            if (!categories || categories.length === 0) {
                container.innerHTML = '<div class="col-12 text-center py-5 text-muted">No hay categorÃ­as configuradas en la biblioteca.</div>';
                return;
            }

            container.innerHTML = '';
            categories.forEach(cat => {
                const catItems = items.filter(i => i.category_id === cat.id);

                const col = document.createElement('div');
                col.className = 'col-md-6 col-lg-4 mb-4';

                let itemsHtml = '';
                catItems.forEach(item => {
                    const icon = this.getLibraryItemIcon(item.type);
                    const actionIcon = item.type === 'link' || item.type === 'info' ? 'fas fa-external-link-alt' : 'fas fa-download';
                    const target = '_blank';
                    const href = item.url || '#';

                    // Handle multiple documents as modern chips
                    let docsHtml = '';
                    if (item.documentos) {
                        try {
                            const docs = typeof item.documentos === 'string' ? JSON.parse(item.documentos) : item.documentos;
                            if (Array.isArray(docs) && docs.length > 0) {
                                docsHtml = '<div class="ms-1 mt-2 d-flex flex-wrap gap-2">';
                                docs.forEach(doc => {
                                    const docUrl = typeof doc === 'string' ? doc : doc.url;
                                    const docName = doc.name || docUrl.split('/').pop();
                                    const isPdf = docUrl.toLowerCase().endsWith('.pdf');

                                    if (isPdf) {
                                        docsHtml += `
                                            <a href="javascript:void(0)" 
                                               onclick="dataManagement.previewPdf('${docUrl}', '${docName.replace(/'/g, "\\'")}')" 
                                               class="library-doc-chip" title="Ver Documento">
                                               <i class="fas fa-file-pdf text-danger me-1"></i>${docName}
                                            </a>`;
                                    } else {
                                        docsHtml += `<a href="${docUrl}" target="_blank" class="library-doc-chip" title="Descargar"><i class="fas fa-paperclip me-1"></i>${docName}</a>`;
                                    }
                                });
                                docsHtml += '</div>';
                            }
                        } catch (e) {
                            console.warn('Error parsing documentos for item:', item.title, e);
                        }
                    }

                    const isMainPdf = href.toLowerCase().endsWith('.pdf');
                    const actionOnClick = isMainPdf ? `onclick="dataManagement.previewPdf('${href}', '${item.title.replace(/'/g, "\\'")}')"; return false;` : '';
                    const finalHref = isMainPdf ? 'javascript:void(0)' : href;

                    itemsHtml += `
                        <li class="list-group-item library-item bg-transparent">
                            <div class="d-flex justify-content-between align-items-start w-100">
                                <div class="flex-grow-1">
                                    <div class="library-item-title mb-1">
                                        <i class="${icon} me-2 icon-indicator"></i>${item.title}
                                    </div>
                                    ${docsHtml}
                                </div>
                                <a href="${finalHref}" ${actionOnClick} target="${target}" class="library-action-btn ms-2 shadow-sm" title="Abrir recurso principal">
                                    <i class="${actionIcon}"></i>
                                </a>
                            </div>
                        </li>
                    `;
                });

                col.innerHTML = `
                    <div class="card h-100 library-card shadow-sm">
                        <div class="card-body p-4">
                            <div class="d-flex align-items-center mb-0 library-cat-header border-bottom-0 pb-0">
                                <div class="library-icon-box shadow-sm me-3">
                                    <i class="${cat.icon || 'fas fa-folder'} fa-lg"></i>
                                </div>
                                <div>
                                    <h5 class="mb-0 fw-bold text-dark">${cat.title}</h5>
                                    ${cat.description ? `<p class="small text-muted mb-0 mt-1">${cat.description}</p>` : ''}
                                </div>
                            </div>
                            <hr class="my-3 opacity-25">
                            <ul class="list-group list-group-flush">
                                ${itemsHtml || '<li class="list-group-item border-0 text-center py-4 text-muted small">Sin documentos disponibles.</li>'}
                            </ul>
                        </div>
                    </div>
                `;
                container.appendChild(col);
            });

        } catch (err) {
            console.error('Error rendering public library:', err);
            container.innerHTML = '<div class="col-12 text-center py-5 text-danger">Error al cargar la biblioteca.</div>';
        }
    }

    getLibraryItemIcon(type) {
        switch (type) {
            case 'pdf': return 'far fa-file-pdf text-danger';
            case 'excel': return 'far fa-file-excel text-success';
            case 'word': return 'far fa-file-word text-primary';
            case 'link': return 'fas fa-link text-info';
            case 'info': return 'fas fa-info-circle text-secondary';
            default: return 'far fa-file text-muted';
        }
    }

    previewPdf(url, title) {
        const modalEl = document.getElementById('pdfPreviewModal');
        const iframe = document.getElementById('pdf-preview-frame');
        const titleEl = document.getElementById('pdfPreviewModalLabel');
        const downloadBtn = document.getElementById('btn-download-pdf-modal');
        const fullScreenBtn = document.getElementById('btn-full-screen-pdf-modal');

        if (modalEl && iframe) {
            iframe.src = url;
            if (titleEl) titleEl.textContent = title || 'Vista Previa de Documento';
            if (downloadBtn) downloadBtn.href = url;
            if (fullScreenBtn) fullScreenBtn.href = url;

            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    async getSystemAlerts(onlyActive = true) {
        let query = this.client
            .from('system_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (onlyActive) {
            query = query.eq('active', true);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching alerts:', error);
            return [];
        }
        return data;
    }

    async loadSystemAlertsTable() {
        try {
            const data = await this.getSystemAlerts(false);
            const tbody = document.querySelector('#table-system-alerts tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay alertas registradas.</td></tr>';
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');

                // Level
                const tdLevel = document.createElement('td');
                let badgeClass = 'bg-info text-dark';
                let levelLabel = 'Informativo';
                if (item.level === 'warning') { badgeClass = 'bg-warning text-dark'; levelLabel = 'Precaución'; }
                if (item.level === 'critical') { badgeClass = 'bg-danger text-white'; levelLabel = 'Crítico'; }
                tdLevel.innerHTML = `<span class="badge ${badgeClass}">${levelLabel}</span>`;
                tr.appendChild(tdLevel);

                // Title
                const tdTitle = document.createElement('td');
                tdTitle.textContent = item.title;
                tr.appendChild(tdTitle);

                // Message
                const tdMsg = document.createElement('td');
                tdMsg.className = "text-truncate";
                tdMsg.style.maxWidth = "200px";
                tdMsg.title = item.message;
                tdMsg.textContent = item.message;
                tr.appendChild(tdMsg);

                // Active
                const tdActive = document.createElement('td');
                tdActive.innerHTML = item.active
                    ? '<span class="badge bg-success"><i class="fas fa-check"></i> Activo</span>'
                    : '<span class="badge bg-secondary">Inactivo</span>';
                tr.appendChild(tdActive);

                // Expires
                const tdExp = document.createElement('td');
                tdExp.textContent = item.expires_at ? this.formatDisplayDate(item.expires_at) : '-';
                tr.appendChild(tdExp);

                // Actions
                const tdActions = document.createElement('td');

                const btnEdit = document.createElement('button');
                btnEdit.classList.add('btn', 'btn-sm', 'btn-outline-primary', 'me-1');
                btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                btnEdit.onclick = () => this.editItem('system_alerts', item);
                tdActions.appendChild(btnEdit);

                const btnDelete = document.createElement('button');
                btnDelete.classList.add('btn', 'btn-sm', 'btn-outline-danger');
                btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
                btnDelete.onclick = () => this.deleteItem('system_alerts', item.id);
                tdActions.appendChild(btnDelete);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error("Error loading system alerts table:", e);
        }
    }

    async renderPublicAlerts() {
        // Only render if container exists
        const container = document.getElementById('public-alerts-container');
        if (!container) return;

        const alerts = await this.getSystemAlerts(true);
        container.innerHTML = '';

        if (!alerts || alerts.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-start';
        container.style.paddingLeft = '20px';

        alerts.forEach(alert => {
            const el = document.createElement('div');
            // Choose color based on level
            let badgeClass = 'bg-info text-dark';
            let iconClass = 'fa-info-circle';
            let borderClass = 'border-info';

            if (alert.level === 'warning') {
                badgeClass = 'bg-warning text-dark';
                iconClass = 'fa-exclamation-triangle';
                borderClass = 'border-warning';
            } else if (alert.level === 'critical') {
                badgeClass = 'bg-danger text-white';
                iconClass = 'fa-radiation';
                borderClass = 'border-danger';
            }

            el.className = `alert-item aero-alert ${borderClass}`;

            // Icon logic to override general icon with a plane for the nose if desired, 
            // but keep the status icon inside or nearby. 
            // Let's use the status icon in the "cockpit".

            el.innerHTML = `
                <div class="aero-nose ${badgeClass}">
                    <i class="fas ${iconClass} fa-lg"></i>
                </div>
                <div class="aero-body">
                    <div class="d-flex align-items-center mb-1">
                        <h5 class="aero-title mb-0 fw-bold">${alert.title}</h5>
                        <i class="fas fa-plane text-primary fa-plane-alert ms-3" style="font-size: 1.2rem;"></i>
                    </div>
                    <p class="aero-message mb-0 text-secondary small text-truncate" style="max-width: 250px;">${alert.message || ''}</p>
                </div>
                <button type="button" class="btn-close ms-2 me-2 align-self-center" aria-label="Close" onclick="this.parentElement.remove()"></button>
            `;
            container.appendChild(el);
        });
    }
}

window.dataManagement = new DataManagement();

// Helper functions for Data Management Sidebar
function showDmSidebar() {
    const sidebar = document.getElementById('dm-sidebar');
    const content = document.getElementById('dm-content');
    const toggleBtn = document.getElementById('dm-sidebar-toggle');

    if (sidebar) sidebar.classList.remove('d-none');
    if (content) {
        content.classList.remove('col-md-12');
        content.classList.add('col-md-9');
    }
    if (toggleBtn) toggleBtn.classList.add('d-none');
}

function hideDmSidebar() {
    const sidebar = document.getElementById('dm-sidebar');
    const content = document.getElementById('dm-content');
    const toggleBtn = document.getElementById('dm-sidebar-toggle');

    if (sidebar) sidebar.classList.add('d-none');
    if (content) {
        content.classList.remove('col-md-9');
        content.classList.add('col-md-12');
    }
    if (toggleBtn) toggleBtn.classList.remove('d-none');
}

function toggleDmSidebar() {
    const sidebar = document.getElementById('dm-sidebar');
    if (sidebar && sidebar.classList.contains('d-none')) {
        showDmSidebar();
    } else {
        hideDmSidebar();
    }
}
window.showDmSidebar = showDmSidebar;
window.hideDmSidebar = hideDmSidebar;
window.toggleDmSidebar = toggleDmSidebar;

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => window.dataManagement.renderPublicAlerts(), 2000); });


