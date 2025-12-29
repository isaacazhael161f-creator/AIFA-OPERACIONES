
// Logic for "Parte de Operaciones" tab in Data Management
document.addEventListener('DOMContentLoaded', () => {
    const tabParteOps = document.getElementById('tab-parte-ops');
    const btnRefresh = document.getElementById('btn-refresh-parte-ops');
    const dateFilter = document.getElementById('filter-parte-ops-date');
    const monthFilter = document.getElementById('filter-parte-ops-month');
    const tbody = document.getElementById('tbody-parte-ops');
    const pdfInput = document.getElementById('parte-ops-pdf-input');

    let currentUploadId = null;
    let currentUploadDate = null;

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
                        <button class="btn btn-sm btn-outline-secondary btn-upload-pdf" data-id="${row.id}" data-date="${row.fecha}" title="Reemplazar PDF">
                            <i class="fas fa-upload"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-pdf" data-id="${row.id}" title="Eliminar PDF">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            } else {
                pdfActionHtml = `
                    <button class="btn btn-sm btn-outline-primary btn-upload-pdf" data-id="${row.id}" data-date="${row.fecha}">
                        <i class="fas fa-plus"></i> Adjuntar PDF
                    </button>
                `;
            }

            tr.innerHTML = `
                <td class="text-center font-monospace text-nowrap">${formatDate(row.fecha)}</td>
                <td class="text-center text-primary">
                    <div class="d-flex justify-content-center gap-3">
                        <span><i class="fas fa-plane-arrival small me-1"></i>${row.comercial_llegada}</span>
                        <span class="text-muted">|</span>
                        <span><i class="fas fa-plane-departure small me-1"></i>${row.comercial_salida}</span>
                    </div>
                </td>
                <td class="text-center text-warning">
                    <div class="d-flex justify-content-center gap-3">
                        <span><i class="fas fa-plane-arrival small me-1"></i>${row.carga_llegada}</span>
                        <span class="text-muted">|</span>
                        <span><i class="fas fa-plane-departure small me-1"></i>${row.carga_salida}</span>
                    </div>
                </td>
                <td class="text-center text-success">
                    <div class="d-flex justify-content-center gap-3">
                        <span><i class="fas fa-plane-arrival small me-1"></i>${row.general_llegada}</span>
                        <span class="text-muted">|</span>
                        <span><i class="fas fa-plane-departure small me-1"></i>${row.general_salida}</span>
                    </div>
                </td>
                <td class="text-center fw-bold">${row.total_general}</td>
                <td class="text-center">${pdfActionHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to new buttons
        document.querySelectorAll('.btn-upload-pdf').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.currentTarget;
                currentUploadId = btnEl.getAttribute('data-id');
                currentUploadDate = btnEl.getAttribute('data-date');
                if (pdfInput) {
                    pdfInput.value = ''; // Reset input
                    pdfInput.click();
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

        // Delete PDF
        document.querySelectorAll('.btn-delete-pdf').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!confirm('¿Estás seguro de que deseas eliminar el PDF asociado?')) return;
                
                const id = e.currentTarget.getAttribute('data-id');
                try {
                    const { error } = await window.supabaseClient
                        .from('parte_operations')
                        .update({ pdf_url: null })
                        .eq('id', id);
                    
                    if (error) throw error;
                    
                    alert('PDF eliminado correctamente');
                    loadParteOpsData();
                } catch (err) {
                    console.error('Error deleting PDF:', err);
                    alert('Error al eliminar el PDF: ' + err.message);
                }
            });
        });
    }

    if (pdfInput) {
        pdfInput.addEventListener('change', async (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            if (!currentUploadId) return;

            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `parte_operaciones_${currentUploadDate}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Show loading state (optional, maybe a toast or change cursor)
            document.body.style.cursor = 'wait';

            try {
                // 1. Upload to Storage
                const { data: uploadData, error: uploadError } = await window.supabaseClient
                    .storage
                    .from('parte-operaciones')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // 2. Get Public URL
                const { data: { publicUrl } } = window.supabaseClient
                    .storage
                    .from('parte-operaciones')
                    .getPublicUrl(filePath);

                // 3. Update Record
                const { error: updateError } = await window.supabaseClient
                    .from('parte_operations')
                    .update({ pdf_url: publicUrl })
                    .eq('id', currentUploadId);

                if (updateError) throw updateError;

                // Refresh table
                alert('PDF subido correctamente');
                loadParteOpsData();

            } catch (error) {
                console.error('Error uploading PDF:', error);
                alert('Error al subir el PDF: ' + error.message);
            } finally {
                document.body.style.cursor = 'default';
                currentUploadId = null;
                currentUploadDate = null;
            }
        });
    }

    if (tabParteOps) {
        tabParteOps.addEventListener('shown.bs.tab', loadParteOpsData);
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', loadParteOpsData);
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
