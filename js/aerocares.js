
(function() {
    let hasLoadedAerocares = false;
    let hasLoadedOperadores = false;
    let hasLoadedPosiciones = false;

    // --- GENERIC TABLE RENDERER ---
    function renderGenericTable(data, container) {
        if (!data || !data.length) return;

        const headers = Object.keys(data[0]);
        
        let headerHtml = headers.map(h => `<th class="bg-light fw-bold text-uppercase" style="font-size: 0.75rem;">${h}</th>`).join('');
        
        let rowsHtml = data.map(row => {
            let cells = headers.map(h => {
                let val = row[h];
                if (val === null || val === undefined) val = '';
                if (typeof val === 'object') val = JSON.stringify(val);
                return `<td class="text-nowrap">${val}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        let tableHtml = `
            <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                <table class="table table-hover table-bordered table-sm fs-7 mb-0">
                    <thead class="sticky-top" style="z-index: 1;">
                        <tr>${headerHtml}</tr>
                    </thead>
                    <tbody class="bg-white">
                        ${rowsHtml}
                    </tbody>
                </table>
                <div class="p-2 bg-light border-top small text-muted">Total: ${data.length} registros</div>
            </div>
        `;
        container.innerHTML = tableHtml;
    }

    // --- AEROCARES ---
    async function loadAerocaresData() {
        const container = document.getElementById('table-aerocares-container');
        if (!container) return;
        
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos de Aerocares...</div>';

        try {
            const supabase = await window.ensureSupabaseClient();
            
            let { data, error } = await supabase.from('Aerocares').select('*');

            if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
                 console.warn("Table 'Aerocares' not found, trying 'aerocares'...");
                 const result = await supabase.from('aerocares').select('*');
                 data = result.data;
                 error = result.error;
            }

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="alert alert-info text-center m-3">No hay registros de Aerocares en la base de datos.</div>';
                return;
            }

            renderGenericTable(data, container);
            hasLoadedAerocares = true;

        } catch (err) {
            console.error('Error loading Aerocares:', err);
            container.innerHTML = `<div class="alert alert-danger m-3">Error al cargar datos: ${err.message}</div>`;
        }
    }

    // --- OPERADORES AEROCARES ---
    async function loadOperadoresAerocaresData() {
        const container = document.getElementById('table-operadores-aerocares-container');
        if (!container) return;
        
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos de Operadores...</div>';

        try {
            const supabase = await window.ensureSupabaseClient();
            
            // Try 'Operadores Aerocares' first (quoted identifier if needed not strictly supported by JS client directly like this usually requires exact match, 
            // but standard postgrest handles it. If space, usually needs quotes in SQL, but client handles it as string)
            // Let's try 'Operadores Aerocares'
            let { data, error } = await supabase.from('Operadores Aerocares').select('*');

            if (error) {
                 // Try snake_case callbacks
                 console.warn("Table 'Operadores Aerocares' error, trying alternatives...", error.message);
                 let attempts = ['operadores_aerocares', 'Operadores_Aerocares', 'OperadoresAerocares'];
                 
                 for (const tableName of attempts) {
                    const res = await supabase.from(tableName).select('*');
                    if (!res.error) {
                        data = res.data;
                        error = null;
                        break;
                    }
                 }
            }

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="alert alert-info text-center m-3">No hay registros de Operadores en la base de datos.</div>';
                return;
            }

            renderGenericTable(data, container);
            hasLoadedOperadores = true;

        } catch (err) {
            console.error('Error loading Operadores Aerocares:', err);
            container.innerHTML = `<div class="alert alert-danger m-3">Error al cargar datos: ${err.message}</div>`;
        }
    }

    // --- POSICIONES AEROCARES ---
    async function loadPosicionesAerocaresData() {
        const container = document.getElementById('table-posiciones-aerocares-container');
        if (!container) return;
        
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos de Posiciones...</div>';

        try {
            const supabase = await window.ensureSupabaseClient();
            
            // Try 'Posiciones Aerocares'
            let { data, error } = await supabase.from('Posiciones Aerocares').select('*');

            if (error) {
                 // Try snake_case callbacks
                 console.warn("Table 'Posiciones Aerocares' error, trying alternatives...", error.message);
                 let attempts = ['posiciones_aerocares', 'Posiciones_Aerocares', 'PosicionesAerocares'];
                 
                 for (const tableName of attempts) {
                    const res = await supabase.from(tableName).select('*');
                    if (!res.error) {
                        data = res.data;
                        error = null;
                        break;
                    }
                 }
            }

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="alert alert-info text-center m-3">No hay registros de Posiciones en la base de datos.</div>';
                return;
            }

            renderGenericTable(data, container);
            hasLoadedPosiciones = true;

        } catch (err) {
            console.error('Error loading Posiciones Aerocares:', err);
            container.innerHTML = `<div class="alert alert-danger m-3">Error al cargar datos: ${err.message}</div>`;
        }
    }


    // Initialize listeners
    function init() {
        // Aerocares Tab
        const tabAerocares = document.getElementById('tab-mech-cat-aerocares');
        if (tabAerocares) {
            tabAerocares.addEventListener('shown.bs.tab', () => {
                if (!hasLoadedAerocares) loadAerocaresData();
            });
            if (tabAerocares.classList.contains('active')) loadAerocaresData();
        }

        // Operadores Tab
        const tabOperadores = document.getElementById('tab-mech-cat-operadores');
        if (tabOperadores) {
            tabOperadores.addEventListener('shown.bs.tab', () => {
                if (!hasLoadedOperadores) loadOperadoresAerocaresData();
            });
            // Usually not active by default, but check anyway
            if (tabOperadores.classList.contains('active')) loadOperadoresAerocaresData();
        }

        // Posiciones Tab
        const tabPosiciones = document.getElementById('tab-mech-cat-posiciones');
        if (tabPosiciones) {
            tabPosiciones.addEventListener('shown.bs.tab', () => {
                if (!hasLoadedPosiciones) loadPosicionesAerocaresData();
            });
            if (tabPosiciones.classList.contains('active')) loadPosicionesAerocaresData();
        }
    }

    // Run on DOM content loaded, or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose globally
    window.loadAerocaresData = loadAerocaresData;
    window.loadOperadoresAerocaresData = loadOperadoresAerocaresData;
    window.loadPosicionesAerocaresData = loadPosicionesAerocaresData;

})();
