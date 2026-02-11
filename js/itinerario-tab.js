
document.addEventListener('DOMContentLoaded', () => {
    const tabItinerary = document.getElementById('pane-itinerary'); // The tab pane itself, or use a tab event listener
    // Actually, the tab trigger is usually what we listen to, but let's hook into the elements inside the pane
    const btnUploadJson = document.getElementById('btn-upload-itinerary-json');
    const btnProcessJson = document.getElementById('btn-process-itinerary-json');
    const btnViewJson = document.getElementById('btn-view-itinerary-json');
    const btnRefresh = document.getElementById('btn-refresh-itinerary');
    const btnDeleteDay = document.getElementById('btn-delete-itinerary-date');
    const dateFilter = document.getElementById('filter-itinerary-date');
    const tbody = document.getElementById('tbody-itinerary');
    
    // Modal
    const uploadModalEl = document.getElementById('uploadItineraryJsonModal');
    let uploadModal = null;
    if (uploadModalEl) {
        uploadModal = new bootstrap.Modal(uploadModalEl);
    }

    const viewJsonModalEl = document.getElementById('viewItineraryJsonModal');
    let viewJsonModal = null;
    if (viewJsonModalEl) {
        viewJsonModal = new bootstrap.Modal(viewJsonModalEl);
    }

    // Helper to convert DD/MM/YYYY to YYYY-MM-DD
    const toISODate = (str) => {
        if (!str) return null;
        const s = String(str).trim();
        // Check if already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        
        const parts = s.split(/[\/\-]/);
        if (parts.length === 3) {
            // Assume DD/MM/YYYY
            return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
        return null;
    };

    // Helper to map JSON fields to DB columns
    const mapFlightData = (item) => ({
        fecha_llegada: toISODate(item.fecha_llegada),
        hora_llegada: item.hora_llegada || null,
        vuelo_llegada: item.vuelo_llegada || null,
        origen: item.origen || null,
        aerolinea: item.aerolinea || item.aerolínea || item.airline || null,
        equipo: item.equipo || item.aeronave || null,
        imagen: item.imagen || null,
        fecha_salida: toISODate(item.fecha_salida),
        hora_salida: item.hora_salida || null,
        vuelo_salida: item.vuelo_salida || null,
        destino: item.destino || null,
        posicion: item.posicion || null,
        banda_reclamo: item.banda_reclamo || null,
        categoria: item.categoria || null,
        estatus: item.estatus || null
    });

    async function loadItineraryData() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Cargando...</td></tr>';

        if (!window.supabaseClient) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error: Cliente Supabase no inicializado</td></tr>';
            return;
        }

        let query = window.supabaseClient
            .from('flights')
            .select('*')
            .order('hora_llegada', { ascending: true });

        if (dateFilter && dateFilter.value) {
            // Filter by arrival OR departure date matching the selected date
            // Note: Supabase doesn't support OR across different columns easily in one .or() chain combined with other filters sometimes, 
            // but let's try .or(`fecha_llegada.eq.${dateFilter.value},fecha_salida.eq.${dateFilter.value}`)
            query = query.or(`fecha_llegada.eq.${dateFilter.value},fecha_salida.eq.${dateFilter.value}`);
        } else {
            query = query.limit(50);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading flights:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No se encontraron vuelos para esta fecha</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const isArrival = row.fecha_llegada === dateFilter.value;
            const flightNum = isArrival ? row.vuelo_llegada : row.vuelo_salida;
            const time = isArrival ? row.hora_llegada : row.hora_salida;
            const route = isArrival ? row.origen : row.destino;
            const type = isArrival ? '<span class="badge bg-success">Llegada</span>' : '<span class="badge bg-primary">Salida</span>';

            tr.innerHTML = `
                <td>${flightNum || '-'}</td>
                <td>${row.aerolinea || '-'}</td>
                <td>${route || '-'}</td>
                <td>${time || '-'}</td>
                <td>${type} ${row.estatus || ''}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-delete-flight" data-id="${row.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Delete Event
        document.querySelectorAll('.btn-delete-flight').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('¿Estás seguro de eliminar este vuelo?')) return;
                const id = e.currentTarget.getAttribute('data-id');
                
                const { error: delError } = await window.supabaseClient
                    .from('flights')
                    .delete()
                    .eq('id', id);
                
                if (delError) {
                    alert('Error al eliminar: ' + delError.message);
                } else {
                    loadItineraryData();
                }
            });
        });
    }

    if (btnUploadJson) {
        btnUploadJson.addEventListener('click', () => {
            if (uploadModal) uploadModal.show();
        });
    }

    if (btnViewJson) {
        btnViewJson.addEventListener('click', async () => {
            if (!window.supabaseClient) {
                alert('Error: Cliente Supabase no inicializado');
                return;
            }
            
            const dateVal = dateFilter ? dateFilter.value : null;
            if (!dateVal) {
                alert('Por favor selecciona una fecha primero.');
                return;
            }

            // Show loading in button
            const originalHtml = btnViewJson.innerHTML;
            btnViewJson.disabled = true;
            btnViewJson.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';

            try {
                const { data, error } = await window.supabaseClient
                    .from('flights')
                    .select('*')
                    .or(`fecha_llegada.eq.${dateVal},fecha_salida.eq.${dateVal}`)
                    .order('hora_llegada', { ascending: true });

                if (error) throw error;

                const contentPre = document.getElementById('view-json-content');
                if (contentPre) {
                    if (!data || data.length === 0) {
                        contentPre.value = '[]';
                    } else {
                        contentPre.value = JSON.stringify(data, null, 2);
                    }
                }

                if (viewJsonModal) viewJsonModal.show();

            } catch (err) {
                console.error('Error fetching JSON:', err);
                alert('Error al obtener JSON: ' + err.message);
            } finally {
                btnViewJson.disabled = false;
                btnViewJson.innerHTML = originalHtml;
            }
        });
    }

    const btnCopyJson = document.getElementById('btn-copy-json');
    if (btnCopyJson) {
        btnCopyJson.addEventListener('click', () => {
            const content = document.getElementById('view-json-content').value;
            navigator.clipboard.writeText(content).then(() => {
                const originalHtml = btnCopyJson.innerHTML;
                btnCopyJson.innerHTML = '<i class="fas fa-check"></i> Copiado';
                setTimeout(() => btnCopyJson.innerHTML = originalHtml, 2000);
            });
        });
    }

    const btnSaveJson = document.getElementById('btn-save-json-changes');
    if (btnSaveJson) {
        btnSaveJson.addEventListener('click', async () => {
            const content = document.getElementById('view-json-content').value;
            const dateVal = dateFilter ? dateFilter.value : null;

            if (!dateVal) {
                alert('Error: No hay fecha seleccionada.');
                return;
            }

            if (!content) {
                alert('El contenido JSON está vacío.');
                return;
            }

            let jsonData;
            try {
                jsonData = JSON.parse(content);
            } catch (e) {
                alert('JSON inválido: ' + e.message);
                return;
            }

            if (!Array.isArray(jsonData)) {
                alert('El JSON debe ser un arreglo de objetos.');
                return;
            }

            if (!confirm(`ADVERTENCIA: Esta acción REEMPLAZARÁ todos los vuelos del día ${dateVal} con los datos del editor.\n\n¿Estás seguro de continuar?`)) {
                return;
            }

            const originalHtml = btnSaveJson.innerHTML;
            btnSaveJson.disabled = true;
            btnSaveJson.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                // 1. Delete existing flights for this date
                const { error: deleteError } = await window.supabaseClient
                    .from('flights')
                    .delete()
                    .or(`fecha_llegada.eq.${dateVal},fecha_salida.eq.${dateVal}`);

                if (deleteError) throw new Error('Error al limpiar datos existentes: ' + deleteError.message);

                // 2. Insert new flights
                if (jsonData.length > 0) {
                    // Map fields correctly using the helper
                    const rowsToInsert = jsonData.map(row => mapFlightData(row));

                    const { error: insertError } = await window.supabaseClient
                        .from('flights')
                        .insert(rowsToInsert);

                    if (insertError) throw new Error('Error al insertar nuevos datos: ' + insertError.message);
                }

                alert('Cambios guardados correctamente.');
                if (viewJsonModal) viewJsonModal.hide();
                loadItineraryData(); // Refresh table

            } catch (err) {
                console.error('Error saving JSON:', err);
                alert('Error al guardar cambios: ' + err.message);
            } finally {
                btnSaveJson.disabled = false;
                btnSaveJson.innerHTML = originalHtml;
            }
        });
    }

    if (btnProcessJson) {
        btnProcessJson.addEventListener('click', async () => {
            const textarea = document.getElementById('itinerary-json-content');
            const content = textarea.value;
            
            if (!content) {
                alert('Por favor pega el contenido JSON');
                return;
            }

            let jsonData;
            try {
                jsonData = JSON.parse(content);
            } catch (e) {
                alert('JSON inválido: ' + e.message);
                return;
            }

            if (!Array.isArray(jsonData)) {
                alert('El JSON debe ser un arreglo de objetos de vuelo');
                return;
            }

            // Show loading
            const originalText = btnProcessJson.innerHTML;
            btnProcessJson.disabled = true;
            btnProcessJson.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';

            try {
                // Prepare data for insertion
                const rowsToInsert = jsonData.map(item => mapFlightData(item));

                // Insert in batches if too large? Supabase handles reasonable batch sizes.
                const { error: insertError } = await window.supabaseClient
                    .from('flights')
                    .insert(rowsToInsert);

                if (insertError) throw insertError;

                alert(`Se importaron ${rowsToInsert.length} vuelos correctamente.\nNota: Si la fecha de los vuelos importados es diferente a la seleccionada en el filtro, no los verás inmediatamente en la tabla.`);
                uploadModal.hide();
                textarea.value = ''; // Clear
                loadItineraryData();

            } catch (error) {
                console.error('Error importing flights:', error);
                alert('Error al importar: ' + error.message);
            } finally {
                btnProcessJson.innerHTML = originalText;
                btnProcessJson.disabled = false;
            }
        });
    }

    if (btnDeleteDay) {
        btnDeleteDay.addEventListener('click', async () => {
             const dateVal = dateFilter ? dateFilter.value : null;
             if (!dateVal) {
                 alert("Por favor, selecciona una fecha primero para indicar qué día borrar.");
                 return;
             }

             const confirmMsg = `ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR TODOS los vuelos del itinerario para la fecha ${dateVal}?\n\n` +
                                `Esta acción borrará tanto llegadas como salidas programadas para ese día.\n` +
                                `Esta acción NO SE PUEDE DESHACER.`;
             
             if (!confirm(confirmMsg)) return;
             if (!confirm("¿Realmente estás seguro? Se borrará todo el día seleccionado.")) return;

             try {
                // Delete where fecha_llegada = date OR fecha_salida = date
                // Note: Using raw SQL filter syntax for OR logic in Supabase JS client
                // .or(`col1.eq.val,col2.eq.val`)
                const { error } = await window.supabaseClient
                    .from('flights')
                    .delete()
                    .or(`fecha_llegada.eq.${dateVal},fecha_salida.eq.${dateVal}`);

                if (error) throw error;

                alert("Vuelos eliminados correctamente.");
                loadItineraryData(); // Refresh table

             } catch (e) {
                 console.error("Error deleting flights:", e);
                 alert("Error al eliminar los vuelos: " + e.message);
             }
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', loadItineraryData);
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', loadItineraryData);
    }

    // Initial load if tab is active (or just load it, it's fine)
    // Better to load when tab is shown
    const tabTrigger = document.querySelector('button[data-bs-target="#pane-itinerary"]'); // Assuming there is a tab button for this pane
    // Actually the tab structure in index.html might be different.
    // Let's just try to load if the element is visible or just load it.
    // Since it's in a tab, we can listen for the tab show event if we can find the ID.
    // In index.html, the tab content ID is "pane-itinerary".
    // The tab button likely targets it.
    
    // Just load it once on init if the date is set
    if (dateFilter && dateFilter.value) {
        // Check if tab is active?
        // loadItineraryData(); 
    }
    
    // Add global listener for tab change if possible, or just rely on manual refresh/date change for now
    // to avoid double loading.
    // But let's try to find the tab button.
    // Based on index.html context, it seems to be inside "operationsTab" or similar?
    // No, "pane-itinerary" is inside "pane-itinerary" tab-pane? Wait.
    // Ah, "pane-itinerary" is one of the tabs in Data Management.
    // Let's look for the button that targets it.
    // It's likely handled by Bootstrap.
    
    // We can use a MutationObserver to detect when it becomes visible, or just hook into the click of the tab button if we knew the ID.
    // Let's just expose the load function globally or rely on the user clicking refresh/date.
    // Or just call it.
    loadItineraryData();
});
