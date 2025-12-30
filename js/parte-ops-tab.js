
// Logic for "Parte de Operaciones" tab in Data Management
document.addEventListener('DOMContentLoaded', () => {
    const tabParteOps = document.getElementById('tab-parte-ops');
    const btnRefresh = document.getElementById('btn-refresh-parte-ops');
    const btnNew = document.getElementById('btn-new-parte-ops');
    const dateFilter = document.getElementById('filter-parte-ops-date');
    const monthFilter = document.getElementById('filter-parte-ops-month');
    const tbody = document.getElementById('tbody-parte-ops');
    
    // Edit Modal elements
    const editModalEl = document.getElementById('editParteOpsModal');
    const editForm = document.getElementById('form-parte-ops');
    const btnSaveParteOps = document.getElementById('btn-save-parte-ops');
    
    let editModal = null;
    if (editModalEl) {
        editModal = new bootstrap.Modal(editModalEl);
    }

    const SPANISH_MONTHS = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        const monthName = SPANISH_MONTHS[parseInt(month, 10) - 1];
        return `${day} de ${monthName} ${year}`;
    }

    async function loadParteOpsData() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Cargando...</td></tr>';

        if (!window.supabaseClient) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error: Cliente Supabase no inicializado</td></tr>';
            return;
        }

        let query = window.supabaseClient
            .from('parte_operations')
            .select('*')
            .order('fecha', { ascending: false });

        if (dateFilter && dateFilter.value) {
            query = query.eq('fecha', dateFilter.value);
        } else if (monthFilter && monthFilter.value) {
            const year = '2025';
            const month = monthFilter.value;
            const startDate = `${year}-${month}-01`;
            const nextMonth = parseInt(month, 10) + 1;
            let endDate;
            if (nextMonth > 12) {
                endDate = `${parseInt(year) + 1}-01-01`;
            } else {
                const nextMonthStr = nextMonth.toString().padStart(2, '0');
                endDate = `${year}-${nextMonthStr}-01`;
            }
            
            query = query.gte('fecha', startDate).lt('fecha', endDate);
        } else {
            query = query.limit(50);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading parte_operations:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No se encontraron registros</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            let pdfActionHtml = '';
            if (row.pdf_url) {
                pdfActionHtml = `
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary btn-preview-pdf" data-url="${row.pdf_url}" title="Ver PDF">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-edit-row" data-id="${row.id}" title="Editar Datos y PDF">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `;
            } else {
                pdfActionHtml = `
                    <button class="btn btn-sm btn-outline-primary btn-edit-row" data-id="${row.id}" title="Editar Datos y PDF">
                        <i class="fas fa-edit"></i> Editar / Adjuntar
                    </button>
                `;
            }

            tr.innerHTML = `
                <td class="text-center font-monospace text-nowrap align-middle">${formatDate(row.fecha)}</td>
                <td class="text-center align-middle">
                    <div class="d-flex justify-content-center align-items-center gap-3 text-primary">
                        <span class="fw-semibold"><i class="fas fa-plane-arrival small me-1 opacity-50"></i>${row.comercial_llegada}</span>
                        <span class="text-muted opacity-25">|</span>
                        <span class="fw-semibold"><i class="fas fa-plane-departure small me-1 opacity-50"></i>${row.comercial_salida}</span>
                    </div>
                </td>
                <td class="text-center align-middle">
                    <div class="d-flex justify-content-center align-items-center gap-3 text-warning">
                        <span class="fw-semibold"><i class="fas fa-plane-arrival small me-1 opacity-50"></i>${row.carga_llegada}</span>
                        <span class="text-muted opacity-25">|</span>
                        <span class="fw-semibold"><i class="fas fa-plane-departure small me-1 opacity-50"></i>${row.carga_salida}</span>
                    </div>
                </td>
                <td class="text-center align-middle">
                    <div class="d-flex justify-content-center align-items-center gap-3 text-success">
                        <span class="fw-semibold"><i class="fas fa-plane-arrival small me-1 opacity-50"></i>${row.general_llegada}</span>
                        <span class="text-muted opacity-25">|</span>
                        <span class="fw-semibold"><i class="fas fa-plane-departure small me-1 opacity-50"></i>${row.general_salida}</span>
                    </div>
                </td>
                <td class="text-center align-middle">
                    <span class="badge bg-light text-dark border fs-6">${row.total_general}</span>
                </td>
                <td class="text-center align-middle">${pdfActionHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Edit Row Event
        document.querySelectorAll('.btn-edit-row').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const rowData = data.find(r => r.id == id);
                if (rowData) {
                    openEditModal(rowData);
                }
            });
        });

        // Preview PDF
        document.querySelectorAll('.btn-preview-pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                const modalEl = document.getElementById('pdfPreviewModal');
                const iframe = document.getElementById('pdf-preview-frame');
                const downloadBtn = document.getElementById('btn-download-pdf-modal');
                
                if (modalEl && iframe) {
                    iframe.src = url;
                    if (downloadBtn) downloadBtn.href = url;
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            });
        });
    }

    function openEditModal(data) {
        if (!editModal) return;
        
        const isNew = !data;
        const modalTitle = document.getElementById('editParteOpsModalLabel');
        if (modalTitle) modalTitle.textContent = isNew ? 'Nuevo Parte de Operaciones' : 'Editar Parte de Operaciones';

        document.getElementById('edit-parte-ops-id').value = isNew ? '' : data.id;
        
        const dateInput = document.getElementById('edit-parte-ops-date');
        dateInput.value = isNew ? new Date().toISOString().split('T')[0] : data.fecha;
        dateInput.readOnly = !isNew; // Allow editing date only for new records

        document.getElementById('edit-comercial-llegada').value = isNew ? 0 : data.comercial_llegada;
        document.getElementById('edit-comercial-salida').value = isNew ? 0 : data.comercial_salida;
        
        document.getElementById('edit-carga-llegada').value = isNew ? 0 : data.carga_llegada;
        document.getElementById('edit-carga-salida').value = isNew ? 0 : data.carga_salida;
        
        document.getElementById('edit-general-llegada').value = isNew ? 0 : data.general_llegada;
        document.getElementById('edit-general-salida').value = isNew ? 0 : data.general_salida;
        
        const pdfInfo = document.getElementById('current-pdf-info');
        const fileInput = document.getElementById('edit-parte-ops-pdf');
        fileInput.dataset.deletePdf = 'false'; // Reset delete flag

        if (!isNew && data.pdf_url) {
            pdfInfo.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="text-success"><i class="fas fa-check-circle"></i> PDF disponible</span>
                    <a href="${data.pdf_url}" target="_blank" class="btn btn-sm btn-outline-primary">Ver</a>
                    <button type="button" class="btn btn-sm btn-outline-danger" id="btn-delete-pdf-modal">Eliminar</button>
                </div>
            `;
            
            // Add listener to the dynamically created button
            const deleteBtn = document.getElementById('btn-delete-pdf-modal');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    if(confirm('¿Estás seguro de que quieres eliminar el PDF de este registro? (Se aplicará al guardar)')) {
                        fileInput.dataset.deletePdf = 'true';
                        pdfInfo.innerHTML = '<span class="text-danger"><i class="fas fa-trash-alt"></i> PDF marcado para eliminar al guardar.</span>';
                    }
                });
            }
        } else {
            pdfInfo.innerHTML = '<span class="text-muted">No hay PDF adjunto actualmente.</span>';
        }
        
        fileInput.value = ''; // Reset file input
        
        editModal.show();
    }

    if (btnSaveParteOps) {
        btnSaveParteOps.addEventListener('click', async () => {
            const id = document.getElementById('edit-parte-ops-id').value;
            const fecha = document.getElementById('edit-parte-ops-date').value;
            
            const comArr = parseInt(document.getElementById('edit-comercial-llegada').value) || 0;
            const comDep = parseInt(document.getElementById('edit-comercial-salida').value) || 0;
            
            const carArr = parseInt(document.getElementById('edit-carga-llegada').value) || 0;
            const carDep = parseInt(document.getElementById('edit-carga-salida').value) || 0;
            
            const genArr = parseInt(document.getElementById('edit-general-llegada').value) || 0;
            const genDep = parseInt(document.getElementById('edit-general-salida').value) || 0;
            
            const total = comArr + comDep + carArr + carDep + genArr + genDep;
            
            const fileInput = document.getElementById('edit-parte-ops-pdf');
            const file = fileInput.files[0];
            const deletePdf = fileInput.dataset.deletePdf === 'true';

            // Show loading
            const originalBtnText = btnSaveParteOps.innerHTML;
            btnSaveParteOps.disabled = true;
            btnSaveParteOps.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

            try {
                let updateData = {
                    comercial_llegada: comArr,
                    comercial_salida: comDep,
                    carga_llegada: carArr,
                    carga_salida: carDep,
                    general_llegada: genArr,
                    general_salida: genDep,
                    total_general: total
                };

                // Handle PDF Upload if selected
                if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `parte_operaciones_${fecha}_${Date.now()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { data: uploadData, error: uploadError } = await window.supabaseClient
                        .storage
                        .from('parte-operaciones')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = window.supabaseClient
                        .storage
                        .from('parte-operaciones')
                        .getPublicUrl(filePath);
                    
                    updateData.pdf_url = publicUrl;
                } else if (deletePdf) {
                    updateData.pdf_url = null;
                }

                let error;
                if (id) {
                    // Update Record
                    const { error: updateError } = await window.supabaseClient
                        .from('parte_operations')
                        .update(updateData)
                        .eq('id', id);
                    error = updateError;
                } else {
                    // Create Record
                    updateData.fecha = fecha; // Add date for new record
                    const { error: insertError } = await window.supabaseClient
                        .from('parte_operations')
                        .insert([updateData]);
                    error = insertError;
                }

                if (error) throw error;

                alert(id ? 'Registro actualizado correctamente' : 'Registro creado correctamente');
                editModal.hide();
                loadParteOpsData();

            } catch (error) {
                console.error('Error saving parte_operations:', error);
                alert('Error al guardar: ' + error.message);
            } finally {
                btnSaveParteOps.innerHTML = originalBtnText;
                btnSaveParteOps.disabled = false;
            }
        });
    }

    if (tabParteOps) {
        tabParteOps.addEventListener('shown.bs.tab', loadParteOpsData);
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', loadParteOpsData);
    }

    if (btnNew) {
        btnNew.addEventListener('click', () => openEditModal(null));
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            if (dateFilter.value && monthFilter) monthFilter.value = ''; // Clear month if date selected
            loadParteOpsData();
        });
    }

    if (monthFilter) {
        monthFilter.addEventListener('change', () => {
            if (monthFilter.value && dateFilter) dateFilter.value = ''; // Clear date if month selected
            loadParteOpsData();
        });
    }
});
