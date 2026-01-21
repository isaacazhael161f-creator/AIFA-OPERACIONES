
document.addEventListener('DOMContentLoaded', () => {
    const btnProcess = document.getElementById('btn-process-frecuencias');
    const inputDate = document.getElementById('frecuencias-week-start');
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
        const idxRouting = headers.findIndex(h => h.includes('[Dep] Routing'));
        const idxAirline = headers.findIndex(h => h.includes('[Dep] Airline code'));
        const idxFlight = headers.findIndex(h => h.includes('[Dep] Flight Designator')); // Or Airline code as user said, but let's prioritize Flight Designator if prevalent
        // User clarification: "[Dep] Airline code, viene así por ejemplo: VB 9480"
        // But context attachment showed [Dep] Flight Designator has VB 9480.
        // I will allow fallback.
        const idxFlightAlt = headers.findIndex(h => h === '[Dep] Airline code');
        const idxSOBT = headers.findIndex(h => h.includes('[Dep] SOBT'));

        if (idxRouting === -1 || (idxFlight === -1 && idxFlightAlt === -1) || idxSOBT === -1) {
             showError('No se encontraron las columnas requeridas: [Dep] Routing, [Dep] Flight Designator/Airline code, [Dep] SOBT');
             return;
        }
        
        const realIdxFlight = idxFlight !== -1 ? idxFlight : idxFlightAlt;
        const realIdxAirline = idxAirline !== -1 ? idxAirline : -1; // Maybe Airline code is just "VB" in another col

        const startDate = new Date(inputDate.value + 'T00:00:00');
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        const dataMap = new Map(); // Key: Route|Airline -> { route, airline, count, flights: [] }
        let totalCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const cols = parseCSVLine(rows[i]);
            if (cols.length < headers.length) continue;

            const rawRouting = cols[idxRouting];
            // Normalize Routing: NLU-ACA -> ACA
            // User: "las tres letras que analizarás son las que están después del guión"
            const routeParts = rawRouting.split('-');
            const route = routeParts.length > 1 ? routeParts[1] : rawRouting; 
            
            // Filter NLU departures only? User: "todas son salidas", implies the file is departure file.
            // But we should probably check if starts with NLU if strictly needed. 
            // "Column Routing mentions: NLU-ACA". 
            // We assume it's valid.

            const airline = realIdxAirline !== -1 ? cols[realIdxAirline] : 'UNK';
            const flightNum = cols[realIdxFlight];
            const sobtRaw = cols[idxSOBT]; // "19JAN 08:24"

            const flightDate = parseSOBT(sobtRaw, startDate.getFullYear());
            
            // Date Filter
            // Handle Year rollover?
            // If we utilize the week start date, we can infer correct year.
            // If Input Start Date is Dec 2025, and row is Jan 01, it's 2026.
            // Basic logic: Assign year of Start Date. Check if date falls in range.
            // If not, try Next Year (if month < start month).
            
            let validDate = false;
            let finalDate = new Date(flightDate);
            
            // Try Current Year of Range Start
            finalDate.setFullYear(startDate.getFullYear());
            if (finalDate >= startDate && finalDate <= endDate) {
                validDate = true;
            } else {
                 // Try Next Year
                 finalDate.setFullYear(startDate.getFullYear() + 1);
                 if (finalDate >= startDate && finalDate <= endDate) {
                     validDate = true;
                 } else {
                     // Try Prev Year (Rare case: selecting Jan 2026, data says Dec 31)
                     finalDate.setFullYear(startDate.getFullYear() - 1);
                     if (finalDate >= startDate && finalDate <= endDate) {
                         validDate = true;
                     }
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
                entry.count++;
                entry.flights.push({
                    fullDate: finalDate,
                    sobt: sobtRaw,
                    flight: flightNum
                });
                totalCount++;
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
            // 2. Delete existing detailed records for this week to avoid duplication
            // We do this client side for 'weekly_flights_detailed'; the RPC handles 'weekly_frequencies'
            const { error: deleteError } = await supabase
                .from('weekly_flights_detailed')
                .delete()
                .eq('week_label', weekLabel);

            if (deleteError) {
                console.error('Delete error', deleteError);
                throw new Error('Error limpiando datos anteriores: ' + deleteError.message);
            }

            // 3. Insert new records (Batched if necessary, Supabase handles fairly large batches usually)
            // If > 1000, maybe split? Typical weekly ops ~500-800? Should be fine.
            const { error: insertError } = await supabase
                .from('weekly_flights_detailed')
                .insert(dbRows);

            if (insertError) {
                console.error('Insert error', insertError);
                throw new Error('Error guardando vuelos detallados: ' + insertError.message);
            }

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
        // "19JAN 08:24"
        // Months EN
        const MONTHS = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        const parts = sobtStr.split(' ');
        if (parts.length < 2) return new Date(); // Fallback
        
        // Date Part "19JAN"
        const datePart = parts[0];
        const day = parseInt(datePart.match(/\d+/)[0]);
        const monthStr = datePart.match(/[A-Z]+/)[0];
        const month = MONTHS[monthStr];

        // Time Part "08:24"
        const timeParts = parts[1].split(':');
        const hour = parseInt(timeParts[0]);
        const min = parseInt(timeParts[1]);

        return new Date(defaultYear, month, day, hour, min, 0);
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
