document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Data from Supabase...');
    // Ensure Supabase client is initialized
    try {
        await window.ensureSupabaseClient?.();
    } catch (err) {
        console.error('Supabase client failed to initialize:', err);
        // Let subsequent code handle missing client
    }
    
    // Wrap renderOperacionesTotales to inject buttons after render
    const originalRender = window.renderOperacionesTotales;
    window.renderOperacionesTotales = function() {
        if (originalRender) originalRender();
        setTimeout(injectEditButtons, 500); // Wait for charts to animate/render
    };

    try {
        // 1. Check Auth
        const isAdmin = await window.dataManager.checkAuth();
        console.log('User is admin:', isAdmin);

        // 2. Fetch Operations Summary
        const summaryData = await window.dataManager.getOperationsSummary();
        
        if (summaryData && summaryData.length > 0) {
            // Transform flat data to nested staticData structure
            const transformed = {
                operacionesTotales: { comercial: [], carga: [], general: [] },
                mensual2025: { comercial: [], comercialPasajeros: [], carga: [], cargaToneladas: [], general: { operaciones: [], pasajeros: [] } }
            };

            // Helper to find or create year entry
            const getYearEntry = (array, year) => {
                let entry = array.find(e => e.periodo === String(year));
                if (!entry) {
                    entry = { periodo: String(year), operaciones: 0, pasajeros: 0, toneladas: 0 };
                    array.push(entry);
                }
                return entry;
            };

            summaryData.forEach(row => {
                if (row.month === null) {
                    // Yearly stats
                    if (row.category === 'comercial') {
                        const entry = getYearEntry(transformed.operacionesTotales.comercial, row.year);
                        if (row.metric === 'operaciones') entry.operaciones = Number(row.value);
                        if (row.metric === 'pasajeros') entry.pasajeros = Number(row.value);
                    } else if (row.category === 'carga') {
                        const entry = getYearEntry(transformed.operacionesTotales.carga, row.year);
                        if (row.metric === 'operaciones') entry.operaciones = Number(row.value);
                        if (row.metric === 'toneladas') entry.toneladas = Number(row.value);
                    } else if (row.category === 'general') {
                        const entry = getYearEntry(transformed.operacionesTotales.general, row.year);
                        if (row.metric === 'operaciones') entry.operaciones = Number(row.value);
                        if (row.metric === 'pasajeros') entry.pasajeros = Number(row.value);
                    }
                }
            });

            // Sort yearly data
            ['comercial', 'carga', 'general'].forEach(cat => {
                transformed.operacionesTotales[cat].sort((a, b) => Number(a.periodo) - Number(b.periodo));
            });

            // Update staticData
            if (typeof staticData !== 'undefined') {
                staticData.operacionesTotales = transformed.operacionesTotales;
                console.log('staticData updated from Supabase');
                
                // Re-render
                if (typeof renderOperacionesTotales === 'function') {
                    renderOperacionesTotales();
                }
            }
        }

    } catch (err) {
        console.error('Error initializing data:', err);
    }
});

function injectEditButtons() {
    // Force check admin status if not set
    if (!window.dataManager.isAdmin) {
        // Check if we have a forced admin mode for testing
        if (localStorage.getItem('forceAdmin') === 'true') {
            window.dataManager.isAdmin = true;
            document.body.classList.add('admin-enabled');
        } else {
            return;
        }
    }

    // Find containers for charts and add edit buttons
    // Example: Operations Summary Charts
    const containers = [
        { id: 'chart-ops-comercial', table: 'operations_summary', category: 'comercial' },
        { id: 'chart-ops-carga', table: 'operations_summary', category: 'carga' },
        { id: 'chart-ops-general', table: 'operations_summary', category: 'general' }
    ];

    containers.forEach(item => {
        const canvas = document.getElementById(item.id);
        if (canvas && canvas.parentNode) {
            // Check if button already exists
            if (canvas.parentNode.querySelector('.admin-edit-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-primary admin-edit-btn';
            btn.innerHTML = '<i class="fas fa-edit"></i> Editar Datos';
            btn.style.position = 'absolute';
            btn.style.top = '10px';
            btn.style.right = '10px';
            btn.style.zIndex = '1000';
            btn.style.display = 'inline-block'; // Force display
            
            btn.onclick = (e) => {
                e.stopPropagation(); // Prevent chart clicks
                openBatchEditModal(item.table, item.category);
            };
            
            // Ensure parent is relative
            if (getComputedStyle(canvas.parentNode).position === 'static') {
                canvas.parentNode.style.position = 'relative';
            }
            canvas.parentNode.appendChild(btn);
        }
    });
}

async function openBatchEditModal(table, category) {
    // Fetch all data for this category
    const data = await window.dataManager.getOperationsSummary();
    const filtered = data.filter(d => d.category === category && d.month === null); // Yearly only for now

    // Create a simple table form
    const modalBody = document.querySelector('#admin-modal .modal-body');
    modalBody.innerHTML = '';

    const tableEl = document.createElement('table');
    tableEl.className = 'table table-sm';
    tableEl.innerHTML = `
        <thead>
            <tr>
                <th>Año</th>
                <th>Métrica</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    filtered.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.year}</td>
            <td>${row.metric}</td>
            <td>
                <input type="number" class="form-control form-control-sm" 
                    value="${row.value}" 
                    data-id="${row.id}" 
                    data-field="value">
            </td>
        `;
        tableEl.querySelector('tbody').appendChild(tr);
    });

    modalBody.appendChild(tableEl);

    // Override save button
    const saveBtn = document.getElementById('admin-save-btn');
    saveBtn.onclick = async () => {
        const inputs = modalBody.querySelectorAll('input');
        const updates = [];
        inputs.forEach(input => {
            updates.push(window.dataManager.updateOperationsSummary(input.dataset.id, { value: input.value }));
        });
        
        try {
            await Promise.all(updates);
            window.adminUI.modal.hide();
            alert('Datos actualizados. Recargando...');
            location.reload(); // Simple reload to refresh data
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    window.adminUI.modal.show();
}
