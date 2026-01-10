/**
 * Logic for "Vuelos" tab (PDF Reader)
 * Structure: WIDE TABLE (13 Columns)
 * Matches DB Table 'daily_flights_ops' 1:1.
 */
(function() {
    let peakChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        init();
        window.opsFlights = { loadFlights, importJson };
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
        const tbody = document.getElementById('tbody-ops-flights');
        
        console.log(`[parte-ops] Loading flights for ${dateVal}...`);
        
        tbody.innerHTML = '<tr><td colspan="13" class="text-center py-4"><div class="spinner-border text-primary"></div><div class="small mt-2">Buscando operaciones...</div></td></tr>';

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

            if (!error && flights.length === 0) {
                 // Fallback: Check for latest available date
                 await suggestOtherDate(supabase, tbody, dateVal, 'No se encontró información');
                 return;
            }
            // else if (flights.length > 0 && flights.length < 5) ... // Warning logic slightly changes but concept is similar

            renderData(flights);

        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="13" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i> Error al cargar datos: ${err.message}
            </td></tr>`;
        }
    }

    async function suggestOtherDate(supabase, tbody, currentVal, msgPrefix) {
         const { data: latestData } = await supabase
             .from('vuelos_parte_operaciones')
             .select('date')
             .order('date', { ascending: false })
             .limit(1);
         
         if (latestData && latestData.length > 0) {
             const lastDate = latestData[0].date;
             if (lastDate !== currentVal) {
                 tbody.innerHTML = `<tr><td colspan="13" class="text-center py-4">
                     <div class="alert alert-warning d-inline-block shadow-sm mb-0">
                        <h6 class="alert-heading"><i class="fas fa-search me-2"></i>${msgPrefix} para el ${currentVal}</h6>
                        <p class="mb-2 small">Es posible que los datos estén en otra fecha.</p>
                        <hr>
                        <p class="mb-0">
                            <span class="me-2">Última fecha con actividad: <strong>${lastDate}</strong></span>
                            <button class="btn btn-sm btn-dark" onclick="document.getElementById('operations-summary-date').value='${lastDate}'; document.getElementById('operations-summary-date').dispatchEvent(new Event('change'));">
                                <i class="fas fa-calendar-alt me-1"></i> Ir a ${lastDate}
                            </button>
                        </p>
                     </div>
                 </td></tr>`;
             }
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
             pdf = await pdfjsLib.getDocument({data: ab}).promise;
        } catch(e) {
             // Fallback for workers?
             if (pdfjsLib.default && pdfjsLib.default.getDocument) {
                 pdf = await pdfjsLib.default.getDocument({data: ab}).promise;
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
            const sortedYs = Object.keys(lines).sort((a,b) => b-a);
            
            for (const y of sortedYs) {
                // Join Text
                const items = lines[y].sort((a,b) => a.transform[4] - b.transform[4]);
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
                            depSched = matches[matches.length-2][0];
                            depReal = matches[matches.length-1][0];
                            
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
            // NORMALIZE SPANISH KEYS (Explicit mapping based on user JSON)
            if (r['Hora programada_llegada']) r.fecha_hora_prog_llegada = r['Hora programada_llegada'];
            if (r['Hora de salida_llegada']) r.fecha_hora_real_llegada = r['Hora de salida_llegada'];
            if (r['Hora programada_salida']) r.fecha_hora_prog_salida = r['Hora programada_salida'];
            if (r['Hora de salida_salida']) r.fecha_hora_real_salida = r['Hora de salida_salida'];
            
            if (r['Vuelo de llegada']) r.vuelo_llegada = r['Vuelo de llegada'];
            if (r['Vuelo de salida']) r.vuelo_salida = r['Vuelo de salida'];
            if (r['Pasajeros llegada']) r.pasajeros_llegada = r['Pasajeros llegada'];
            if (r['Pasajeros salida']) r.pasajeros_salida = r['Pasajeros salida'];
            if (r['Matrícula']) r.matricula = r['Matrícula'];
            if (r['Origen']) r.origen = r['Origen'];
            if (r['Destino']) r.destino = r['Destino'];
            if (r['aerolinea']) r.aerolinea = r['aerolinea']; 
            if (r['categoría']) r.categoria = r['categoría'];
            
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
            let style = "max-height: 35px; max-width: 120px;";
            
            // Reduce size for notably bulky/square logos
            if (logoFile === 'logo_viva.png') {
                 style = "max-height: 25px; max-width: 90px;";
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
                 style = "max-height: 50px; max-width: 180px;"; 
            } else if (megaLogos.includes(logoFile)) {
                 style = "max-height: 60px; max-width: 200px;";
            } else if (giganticLogos.includes(logoFile)) {
                 style = "max-height: 70px; max-width: 250px;";
            } else if (logoFile === 'logo_atlas_air.png') {
                 style = "max-height: 90px; max-width: 280px;";
            }
            
            return `<img src="images/airlines/${logoFile}" alt="${airlineName}" title="${airlineName}" class="img-fluid" style="${style}">`;
        }

        return `<span class="fw-bold">${airlineName}</span>`;
    }

    // --- RENDER TABLE ---
    function renderData(data, warningHtml = null) {
        const tbody = document.getElementById('tbody-ops-flights');
        
        // Reset and optionally add warning
        tbody.innerHTML = '';
        if (warningHtml) {
             const row = document.createElement('tr');
             row.innerHTML = warningHtml;
             tbody.appendChild(row);
        }

        if (!data || data.length === 0) {
            if (!warningHtml) tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted">No hay datos</tr>';
            return;
        }
        
        // Build table rows
        const rowsHtml = data.map(r => {
             // Fallback for missing normalized keys, try to use raw keys if present
             const seq = r.seq_no || r.no || '';
             const airlineName = r.aerolinea || r.Aerolinea || '';
             const airlineHtml = getAirlineHtml(airlineName);
             
             const arrFlight = r.vuelo_llegada || r['Vuelo de llegada'] || '';
             const origin = r.origen || r.Origen || '';
             const progArr = r.fecha_hora_prog_llegada || r['Hora programada_llegada'] || '';
             const realArr = r.fecha_hora_real_llegada || r['Hora de salida_llegada'] || '';
             const paxArr = r.pasajeros_llegada || r['Pasajeros llegada'] || 0;
             
             const depFlight = r.vuelo_salida || r['Vuelo de salida'] || '';
             const dest = r.destino || r.Destino || '';
             const progDep = r.fecha_hora_prog_salida || r['Hora programada_salida'] || '';
             const realDep = r.fecha_hora_real_salida || r['Hora de salida_salida'] || '';
             const paxDep = r.pasajeros_salida || r['Pasajeros salida'] || 0;
             const mat = r.matricula || r['Matrícula'] || '';

             return `
                <tr>
                    <td class="fw-bold">${seq}</td>
                    <td class="text-center">${airlineHtml}</td>
                    <td class="text-success fw-bold">${arrFlight}</td>
                    <td>${origin}</td>
                    <td class="small opacity-75 text-nowrap">${progArr}</td>
                    <td class="fw-bold text-nowrap">${realArr}</td>
                    <td>${paxArr}</td>
                    
                    <td class="text-primary fw-bold">${depFlight}</td>
                    <td>${dest}</td>
                    <td class="small opacity-75 text-nowrap">${progDep}</td>
                    <td class="fw-bold text-nowrap">${realDep}</td>
                    <td>${paxDep}</td>
                    
                    <td class="font-monospace small">${mat}</td>
                </tr>
            `
        }).join('');
        
        // Use insertAdjacentHTML to append without overwriting the warning row
        tbody.insertAdjacentHTML('beforeend', rowsHtml);
        
        // Render Chart (Simplified - using Dep Time or Arr Time)
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
                 labels: Array.from({length:24},(_,i)=>i),
                 datasets: [
                     {label:'Llegadas', data:arrivals, backgroundColor:'#198754'},
                     {label:'Salidas', data:departures, backgroundColor:'#0d6efd'}
                 ]
             },
             options: {
                 responsive:true, maintainAspectRatio:false,
                 plugins:{legend:{display:false}},
                 scales:{x:{grid:{display:false}}}
             }
        });
    }

})();