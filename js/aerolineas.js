
let aeroDataCache = null;

async function loadAerolineasDashboard() {
    console.log('[loadAerolineas] Iniciando carga de aerolíneas...');
    
    // UI elements
    const tblBody = document.getElementById('aero-table-body');
    const kpiTotal = document.getElementById('aero-kpi-total');
    const kpiPax = document.getElementById('aero-kpi-pax');
    const kpiCargo = document.getElementById('aero-kpi-cargo');
    const searchInput = document.getElementById('aero-search');
    
    if(!tblBody) return; // Not on page
    
    tblBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos...</td></tr>';
    
    try {
        let client = window.supabaseClient;
        if (!client && typeof window.ensureSupabaseClient === 'function') {
            client = await window.ensureSupabaseClient();
        }
        if (!client) throw new Error('Cliente Supabase no disponible');

        // Fetch Pasajeros
        const { data: paxData, error: paxError } = await client.from('Aerolíneas de pasajeros').select('*');
        if (paxError) throw paxError;
        
        // Fetch Carga
        const { data: cargoData, error: cargoError } = await client.from('Aerolíneas de carga').select('*');
        if (cargoError) throw cargoError;
        
        const finalData = [];
        
        // Normalize Passenger data
        (paxData || []).forEach(row => {
            finalData.push({
                no: row['NO.'] || '',
                nombre: row['AEROLINEA'] || row['AEROLINEA '] || 'Desconocida',
                servicio: row['TIPO DE SERVICIO'] || 'N/A',
                categoria: 'Pasajeros'
            });
        });
        
        // Normalize Cargo data
        (cargoData || []).forEach(row => {
            finalData.push({
                no: row['NO.'] || '',
                nombre: row['AEROLINEA'] || row['AEROLINEA '] || 'Desconocida',
                servicio: row['TIPO DE SERVICIO'] || 'N/A',
                categoria: 'Carga'
            });
        });
        
        // Sort alphabetically by name
        finalData.sort((a, b) => a.nombre.toString().localeCompare(b.nombre));
        
        // Update cache
        aeroDataCache = finalData;
        
        // Render stats
        kpiTotal.textContent = finalData.length;
        kpiPax.textContent = paxData?.length || 0;
        kpiCargo.textContent = cargoData?.length || 0;
        
        // Clear search
        if(searchInput) searchInput.value = '';
        
        // Render table
        renderAirlinesTable(finalData);
        
    } catch (err) {
        console.error('Error al cargar aerolíneas:', err);
        tblBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error al consultar base de datos.</td></tr>';
    }
}

function renderAirlinesTable(data) {
    const tblBody = document.getElementById('aero-table-body');
    if(!tblBody) return;
    
    if(!data || data.length === 0) {
        tblBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No se encontraron aerolíneas.</td></tr>';
        return;
    }
    
    tblBody.innerHTML = '';
    
    data.forEach((item, index) => {
        const catBadge = item.categoria === 'Pasajeros' 
            ? '<span class="badge bg-success">Pasajeros</span>'
            : '<span class="badge" style="background-color:#6f42c1">Carga</span>';
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="fw-bold">${item.nombre}</td>
            <td>${catBadge}</td>
            <td class="text-muted small">${item.servicio}</td>
        `;
        tblBody.appendChild(tr);
    });
}

function filterAirlinesTable() {
    const input = document.getElementById('aero-search');
    if(!input || !aeroDataCache) return;
    
    const term = input.value.toLowerCase().trim();
    
    if(term === '') {
        renderAirlinesTable(aeroDataCache);
        return;
    }
    
    const filtered = aeroDataCache.filter(item => {
        return item.nombre.toLowerCase().includes(term) ||
               item.categoria.toLowerCase().includes(term) ||
               item.servicio.toLowerCase().includes(term);
    });
    
    renderAirlinesTable(filtered);
}

// Ensure the section is loaded when clicking its menu item
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.menu-item[data-section="aerolineas"]').forEach(el => {
        el.addEventListener('click', () => {
            // Solo carga si cache esta vacio (para no recargar a cada rato, el usuario puede darle click al boton Actualizar)
            if(!aeroDataCache) {
                loadAerolineasDashboard();
            }
        });
    });
});

