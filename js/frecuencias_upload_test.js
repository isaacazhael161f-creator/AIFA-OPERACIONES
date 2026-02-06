
document.addEventListener('DOMContentLoaded', () => {
    const btnProcess = document.getElementById('btn-process-frecuencias');
    const inputDate = document.getElementById('frecuencias-week-start');
    const typeSelect = document.getElementById('frecuencias-type-select');
    const labelWeek = document.getElementById('frecuencias-week-display');
    const modalDetalle = new bootstrap.Modal(document.getElementById('modalFrecuenciasDetalle'));

    // Init Date Picker with Today
    const today = new Date();
    // Set to previous Monday technically preferred, but let's just use today for now or empty
    inputDate.valueAsDate = today; 
    updateWeekLabel();

    inputDate.addEventListener('change', updateWeekLabel);

    function updateWeekLabel() {
        if (!inputDate.value) {
            labelWeek.textContent = '-';
            return;
        }
        const start = new Date(inputDate.value + 'T00:00:00'); // Fix TZ issues
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const format = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
        labelWeek.textContent = `${format(start)} al ${format(end)}`;
    }

    btnProcess.addEventListener('click', async () => {
        const fileInput = document.getElementById('frecuencias-csv-file');
        const errorDiv = document.getElementById('frecuencias-upload-error');
        const resultsDiv = document.getElementById('frecuencias-upload-results');
        const tbody = document.getElementById('tbody-frecuencias-upload');
        const totalBadge = document.getElementById('total-ops-badge');
        
        // Disable button while processing
        btnProcess.disabled = true;
        btnProcess.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Procesando...';

        errorDiv.classList.add('d-none');
        resultsDiv.classList.add('d-none');
        tbody.innerHTML = '';
        totalBadge.textContent = '0 Operaciones';

        if (!fileInput.files.length) {
            showError('Por favor selecciona un archivo CSV.');
            resetButton();
            return;
        }
        if (!inputDate.value) {
            showError('Por favor selecciona la fecha de inicio de la semana.');
            resetButton();
            return;
        }

        const supabase = window.supabaseClient;
        if (!supabase) {
             showError('Error: Cliente Supabase no inicializado. Recarga la página.');
             resetButton();
             return;
        }

        try {
            const file = fileInput.files[0];
        const text = await file.text();
        const rows = text.split(/\r?\n/).filter(r => r.trim());

        if (rows.length < 2) {
            showError('El archivo parece estar vacío o inválido.');
            return;
        }

        // Headers
        const headers = parseCSVLine(rows[0]);
        // Map columns
        // Expected: [Dep] Routing, [Dep] Airline code, [Dep] Flight Designator, [Dep] SOBT
        const idxDepRouting = headers.findIndex(h => h.includes('[Dep] Routing'));
        const idxDepAirline = headers.findIndex(h => h.includes('[Dep] Airline code'));
        const idxDepFlight = headers.findIndex(h => h.includes('[Dep] Flight Designator')); 
        const idxDepFlightAlt = headers.findIndex(h => h === '[Dep] Airline code');
        const idxSOBT = headers.findIndex(h => h.includes('[Dep] SOBT'));

        // Expected Arrival Columns
        const idxArrRouting = headers.findIndex(h => h.includes('[Arr] Routing'));
        const idxArrAirline = headers.findIndex(h => h.includes('[Arr] Airline code'));
        const idxArrFlight = headers.findIndex(h => h.includes('[Arr] Flight Designator'));
        const idxArrFlightAlt = headers.findIndex(h => h === '[Arr] Airline code');
        const idxSIBT = headers.findIndex(h => h.includes('[Arr] SIBT'));

        if (idxDepRouting === -1 && idxArrRouting === -1) {
             showError('No se encontraron columnas de Routing ([Dep] o [Arr]).');
             return;
        }
        
        const realIdxDepFlight = idxDepFlight !== -1 ? idxDepFlight : idxDepFlightAlt;
        const realIdxArrFlight = idxArrFlight !== -1 ? idxArrFlight : idxArrFlightAlt;

        const startDate = new Date(inputDate.value + 'T00:00:00');
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const dataMap = new Map(); // Key: Route|Airline -> { route, airline, count, flights: [] }
        let totalCount = 0;

        // Helper to process a flight
        const processFlight = (routing, airlineRaw, flightRaw, timeRaw, type) => {
            if (!routing || !flightRaw || !timeRaw) return;

            // Normalize Routing
            // NLU-ACA (Dep) -> Route is ACA (parts[1])
            // MH-NLU (Arr) -> Route is MH (parts[0]) - Assuming standard 3 letter code or city name?
            // Actually, usually headers are IATA-IATA. Check for AIFA code (NLU) to determine logic?
            // Or assume Position 1 for Dep, Position 0 for Arr relative to NLU.
            // But routing string order ensures NLU is Origin for Dep, Dest for Arr.
            // [Dep] Routing: NLU-CUN -> Destination CUN
            // [Arr] Routing: CUN-NLU -> Origin CUN
            
            const routeParts = routing.split('-');
            let route = '';
            if (type === 'DEP') {
                route = routeParts.length > 1 ? routeParts[1] : routing;
            } else {
                route = routeParts.length > 1 ? routeParts[0] : routing;
            }
            
            // Clean up route
            route = route.trim();
            if (route === 'NLU' || route === 'MMSM') return; // Should not happen if logic is correct, but safe guard

            const airline = airlineRaw ? airlineRaw.trim() : 'UNK';
            // Clean up flight number (remove spaces)
            const flightClean = flightRaw.replace(/\s+/g, '');
            const flightWithDir = `${flightClean} (${type === 'DEP' ? 'Sal' : 'Lleg'})`;

            // Clean time string (remove (Dep), (Arr), etc from CSV)
            const timeClean = timeRaw.split('(')[0].trim();

            const flightDateRaw = parseSOBT(timeRaw, startDate.getFullYear());
            if (!flightDateRaw) return;

            // Date Filter Logic (shared)
            let validDate = false;
            let finalDate = new Date(flightDateRaw);
            
            finalDate.setFullYear(startDate.getFullYear());
            if (finalDate >= startDate && finalDate <= endDate) validDate = true;
            else {
                 finalDate.setFullYear(startDate.getFullYear() + 1);
                 if (finalDate >= startDate && finalDate <= endDate) validDate = true;
                 else {
                     finalDate.setFullYear(startDate.getFullYear() - 1);
                     if (finalDate >= startDate && finalDate <= endDate) validDate = true;
                 }
            }

            if (validDate) {
                const key = `${route}-${airline}`;
                if (!dataMap.has(key)) {
                    dataMap.set(key, {
                        route: route,
                        airline: airline,
                        count: 0,
                        flights: []
                    });
                }
                const entry = dataMap.get(key);
                
                // Deduplicate: Check if same flight number AND same EXACT date/time already exists
                // This prevents adding the same flight twice if the CSV has duplicate rows
                const exists = entry.flights.some(f => 
                    f.flight === flightWithDir && 
                    f.sobt === timeClean &&
                    f.fullDate.getTime() === finalDate.getTime()
                );

                if (!exists) {
                    entry.count++;
                    entry.flights.push({
                        fullDate: finalDate,
                        sobt: timeClean, 
                        flight: flightWithDir
                    });
                    totalCount++;
                }
            }
        };

        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVLine(rows[i]);
            if (cols.length < headers.length) continue;

            // Process Departure
            if (idxDepRouting !== -1 && idxSOBT !== -1) {
                 const airline = idxDepAirline !== -1 ? cols[idxDepAirline] : 'UNK';
                 processFlight(cols[idxDepRouting], airline, cols[realIdxDepFlight], cols[idxSOBT], 'DEP');
            }

            // Process Arrival
            if (idxArrRouting !== -1 && idxSIBT !== -1) {
                 const airline = idxArrAirline !== -1 ? cols[idxArrAirline] : 'UNK';
                 processFlight(cols[idxArrRouting], airline, cols[realIdxArrFlight], cols[idxSIBT], 'ARR');
            }
        }

        // --- SUPABASE INTEGRATION START ---
        
        // 1. Prepare Data for Insertion
        const dbRows = [];
        // Format Week Label: "DD Month YYYY" to match existing style roughly, or use our helper
        // The SQL function takes p_week_label which we should construct consistently.
        // Let's use the format displayed in the UI: "08-14 Enero 2026"
        const weekLabel = labelWeek.textContent; 
        
        // Flatten the map to flights
        for (const item of dataMap.values()) {
            for (const f of item.flights) {
                dbRows.push({
                    week_label: weekLabel,
                    route_code: item.route,
                    airline_code: item.airline,
                    flight_number: f.flight,
                    flight_date: f.fullDate.toISOString() // UTC format
                });
            }
        }

        if (dbRows.length > 0) {
            // 2. Delete existing detailed records for this WEEK RANGE and TYPE to avoid duplication/stale data
            // We use Date Range delete instead of just Label to ensure we clean up any overlapping mess
            const isoStart = startDate.toISOString();
            const isoEnd = endDate.toISOString();
            
            // Determine type code ('P' for passenger/default, 'C' for cargo)
            let typeCode = 'P';
            if (typeSelect.value === 'cargo') typeCode = 'C';

            // Delete overlap for this specific type
            const { error: deleteError } = await supabase
                .from('weekly_flights_detailed')
                .delete()
                .gte('flight_date', isoStart)
                .lte('flight_date', isoEnd)
                .eq('operation_type', typeCode); // Only clean relevant type

            if (deleteError) {
                console.error('Delete error', deleteError);
                throw new Error('Error limpiando datos anteriores: ' + deleteError.message);
            }

            // 3. Insert new records (Batched if necessary, Supabase handles fairly large batches usually)
            // Add type code to rows
            dbRows.forEach(row => row.operation_type = typeCode);

            const { error: insertError } = await supabase
                .from('weekly_flights_detailed')
                .insert(dbRows);

            if (insertError) {
                console.error('Insert error', insertError);
                throw new Error('Error guardando vuelos detallados: ' + insertError.message);
            }

            if (typeSelect.value === 'cargo') {
                // 4. Call RPC Cargo
                const { error: rpcCargoError } = await supabase.rpc('generate_weekly_frequencies_cargo', {
                    p_week_label: weekLabel,
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0]
                });
                
                if (rpcCargoError) {
                    console.error('RPC Cargo error', rpcCargoError);
                    throw new Error('Error generando reporte de frecuencias (Carga): ' + rpcCargoError.message);
                }
                showSuccess(`Se procesaron y guardaron ${totalCount} vuelos correctamente. Se actualizaron frecuencias de Carga.`);
            } else {
                // 4. Call RPC to regenerate summary (NATIONAL)
                const { error: rpcError } = await supabase.rpc('generate_weekly_frequencies', {
                    p_week_label: weekLabel,
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0]
                });

                if (rpcError) {
                    console.error('RPC error', rpcError);
                    throw new Error('Error generando reporte de frecuencias (Nacional): ' + rpcError.message);
                }

                // 5. Call RPC to regenerate summary (INTERNATIONAL)
                const { error: rpcIntError } = await supabase.rpc('generate_weekly_frequencies_int', {
                    p_week_label: weekLabel,
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0]
                });

                if (rpcIntError) {
                    console.error('RPC Int error', rpcIntError);
                    throw new Error('Error generando reporte de frecuencias (Internacional): ' + rpcIntError.message);
                }
                
                showSuccess(`Se procesaron y guardaron ${totalCount} vuelos correctamente. Se actualizaron frecuencias Nacionales e Internacionales.`);
            }
        } else {
            showSuccess('No se encontraron vuelos válidos en el rango de fechas seleccionado.');
        }

        // --- SUPABASE INTEGRATION END ---

        // Render Local Preview (Still keep this for immediate feedback)
        const sortedKeys = Array.from(dataMap.keys()).sort();

        
        // Helper to get airline logo and color
        const getAirlineStyle = (airlineCode) => {
             // Map code to key in standard config
             const code = airlineCode.toUpperCase();
             let key = 'default';
             if (code === 'VB') key = 'viva';
             if (code === 'AM') key = 'aeromexico';
             if (code === 'Y4') key = 'volaris';
             if (code === 'XN') key = 'mexicana';
             if (code === 'G3') key = 'gol'; // If exists?
             if (code === 'CM') key = 'copa';
             if (code === 'AV') key = 'avianca';
             if (code === 'V0') key = 'conviasa';
             if (code === 'DM') key = 'arajet';
             if (code === 'UJ') key = 'magnicharters';
             if (code === 'ZV') key = 'aerus';

             // Fallback config if not using the full global config object yet
             const config = {
                'aeromexico': { logo: 'logo_aeromexico.png', color: '#0b2161', bg: '#0b2161', text: '#ffffff' },
                'volaris': { logo: 'logo_volaris.png', color: '#a300e6', bg: '#a300e6', text: '#ffffff' },
                'viva': { logo: 'logo_viva.png', color: '#00a850', bg: '#ffffff', text: '#00a850', border: '1px solid #00a850' }, // Viva often white bg with green text/logo
                'mexicana': { logo: 'logo_mexicana.png', color: '#008375', bg: '#008375', text: '#ffffff' },
                'copa': { logo: 'logo_copa.png', color: '#00529b', bg: '#00529b', text: '#ffffff' },
                'arajet': { logo: 'logo_arajet.png', color: '#632683', bg: '#632683', text: '#ffffff' },
                'conviasa': { logo: 'logo_conviasa.png', color: '#e65300', bg: '#e65300', text: '#ffffff' },
                'magnicharters': { logo: 'logo_magnicharters.png', color: '#1d3c6e', bg: '#1d3c6e', text: '#ffffff' },
                'aerus': { logo: 'logo_aerus.png', color: '#bed62f', bg: '#bed62f', text: '#000000' },
                'default': { logo: null, color: '#6c757d', bg: '#f8f9fa', text: '#212529' }
             };
             
             return config[key] || config['default'];
        };

        sortedKeys.forEach(key => {
            const item = dataMap.get(key);
            // Sort flights by date
            item.flights.sort((a,b) => a.fullDate - b.fullDate);
            
            // Resolve City Name via rudimentary map or assume Code is acceptable for preview
            // Ideally we fetch from DB, but for this preview we use a small static map or just the code if missing
            // User requested: "escribas ya el nombre Tijuana... columna City"
            // Since this is client-side preview, I will add a small map here. 
            // The DB Automation I wrote DOES do this correctly for the final table.
            const cityMap = {
                'TIJ': 'Tijuana', 'HMO': 'Hermosillo', 'CJS': 'Ciudad Juárez', 'CEN': 'Ciudad Obregón',
                'CUU': 'Chihuahua', 'NLD': 'Nuevo Laredo', 'REX': 'Reynosa', 'LAP': 'La Paz',
                'CUL': 'Culiacán', 'DGO': 'Durango', 'MZT': 'Mazatlán', 'PVR': 'Puerto Vallarta',
                'GDL': 'Guadalajara', 'MTY': 'Monterrey', 'CUN': 'Cancún', 'MID': 'Mérida',
                'VER': 'Veracruz', 'ACA': 'Acapulco', 'OAX': 'Oaxaca', 'HUX': 'Huatulco',
                'PXM': 'Puerto Escondido', 'SJD': 'San José del Cabo', 'ZCL': 'Zacatecas',
                'TAM': 'Tampico', 'VSA': 'Villahermosa', 'TGZ': 'Tuxtla Gutiérrez', 'CPE': 'Campeche',
                'CTM': 'Chetumal', 'TLC': 'Toluca', 'BJX': 'León/Bajío', 'AGU': 'Aguascalientes',
                'SLP': 'San Luis Potosí', 'QRO': 'Querétaro', 'MLM': 'Morelia', 'ZIH': 'Ixtapa Zihuatanejo',
                'TAP': 'Tapachula', 'MXL': 'Mexicali', 'TPQ': 'Tepic', 'UPN': 'Uruapan', 'PQM': 'Palenque'
            };
            const cityName = cityMap[item.route] || item.route;

            const style = getAirlineStyle(item.airline);
            const logoHtml = style.logo 
                ? `<img src="images/airlines/${style.logo}" alt="${item.airline}" style="height: 24px; object-fit: contain; margin-right: 8px;">` 
                : `<i class="fas fa-plane me-2"></i>`;
            
            // Badge Style
            const badgeStyle = `background-color: ${style.bg}; color: ${style.text}; ${style.border ? 'border:'+style.border : ''}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-bold">${cityName}</div>
                    <div class="small text-muted">${item.route}</div>
                </td>
                <td>
                    <div class="d-flex align-items-center p-2 rounded" style="${badgeStyle}">
                        <div class="bg-white rounded px-1 me-2" style="height:28px; display:flex; align-items:center;">
                           ${logoHtml} 
                        </div>
                        <span class="fw-bold">${item.airline}</span>
                    </div>
                </td>
                <td class="text-center fw-bold fs-5">${item.count}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary btn-details" data-key="${key}">
                        <i class="fas fa-list me-1"></i> Ver Vuelos
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        totalBadge.textContent = `${totalCount} Operaciones`;
        resultsDiv.classList.remove('d-none');

        // Wiring buttons
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.target.dataset.key;
                const item = dataMap.get(key);
                showModal(item);
            });
        });
        
        resetButton();
        } catch (err) {
            console.error(err);
            showError(err.message || 'Error desconocido al procesar el archivo.');
            resetButton();
        }
    });

    function resetButton() {
        const btnProcess = document.getElementById('btn-process-frecuencias');
        btnProcess.disabled = false;
        btnProcess.innerHTML = '<i class="fas fa-cog me-1"></i> Procesar';
    }

    function showSuccess(msg) {
         const errorDiv = document.getElementById('frecuencias-upload-error');
         errorDiv.textContent = msg;
         errorDiv.classList.remove('d-none', 'alert-danger');
         errorDiv.classList.add('alert-success');
         // Auto hide after 5s
         setTimeout(() => {
             errorDiv.classList.add('d-none');
             errorDiv.classList.remove('alert-success');
             errorDiv.classList.add('alert-danger'); // Reset for next error
         }, 5000);
    }

    function showError(msg) {
        const errorDiv = document.getElementById('frecuencias-upload-error');
        errorDiv.textContent = msg;
        errorDiv.classList.remove('d-none');
    }

    function parseCSVLine(text) {
        // Simple regex parser for CSV with quotes
        // Note: This regex handles basic "val","val"
        const result = [];
        const pattern = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
        // This regex is slightly flawed for empty fields or confusing spacing, 
        // but robust enough for the provided machine generated CSV.
        // A manual state machine is better.
        let cur = '';
        let inQuote = false;
        for(let i=0; i<text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuote = !inQuote;
                // Don't add quote to cur
                continue; 
            }
            if (char === ',' && !inQuote) {
                result.push(cur.trim());
                cur = '';
                continue;
            }
            cur += char;
        }
        result.push(cur.trim());
        return result;
    }

    function parseSOBT(sobtStr, defaultYear) {
        // "19JAN 08:24" or "19JAN 08:24 (Dep)"
        // Clean trailing info
        const cleanStr = sobtStr.split('(')[0].trim();
        
        const MONTHS = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        const parts = cleanStr.split(' ');
        if (parts.length < 2) return null; 
        
        try {
            // Date Part "19JAN"
            const datePart = parts[0];
            const dayMatch = datePart.match(/\d+/);
            const monthMatch = datePart.match(/[A-Z]+/);
            
            if (!dayMatch || !monthMatch) return null;

            const day = parseInt(dayMatch[0]);
            const monthStr = monthMatch[0];
            const month = MONTHS[monthStr];
            
            if (month === undefined) return null;

            // Time Part "08:24"
            const timeParts = parts[1].split(':');
            const hour = parseInt(timeParts[0]);
            const min = parseInt(timeParts[1]);

            return new Date(defaultYear, month, day, hour, min, 0);
        } catch (e) {
            console.error("Error parsing SOBT:", sobtStr, e);
            return null;
        }
    }

    function showModal(item) {
        document.getElementById('modal-route-title').textContent = `${item.route} - ${item.airline}`;
        const tbody = document.getElementById('tbody-frecuencias-detalle');
        tbody.innerHTML = '';
        item.flights.forEach(f => {
            const tr = document.createElement('tr');
            // Format nice date
            const niceDate = f.fullDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
            const niceTime = f.fullDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' });
            
            tr.innerHTML = `
                <td>${niceDate}</td>
                <td>${niceTime}</td>
                <td>${f.flight}</td>
                <td>${item.airline}</td> 
            `;
            tbody.appendChild(tr);
        });
        modalDetalle.show();
    }
});
