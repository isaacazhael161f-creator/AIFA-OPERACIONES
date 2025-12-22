class AdminUI {
    constructor() {
        this.modal = null;
        this.initModal();
        window.addEventListener('admin-mode-changed', (e) => {
            this.toggleAdminControls(e.detail.isAdmin);
        });
    }

    initModal() {
        // Check if bootstrap is available
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded. AdminUI cannot initialize modal.');
            alert('Error: Bootstrap no está cargado. Verifica tu conexión a internet.');
            return;
        }

        // Create modal HTML
        const modalHtml = `
            <div id="admin-modal" class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Datos</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="admin-form"></form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="admin-save-btn">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        try {
            this.modal = new bootstrap.Modal(document.getElementById('admin-modal'));
        } catch (e) {
            console.error('Error initializing Bootstrap Modal:', e);
            alert('Error al inicializar el modal de administración: ' + e.message);
        }
        
        const saveBtn = document.getElementById('admin-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChanges());
        }
    }

    toggleAdminControls(isAdmin) {
        document.body.classList.toggle('admin-enabled', isAdmin);
        
        // Toggle Data Management menu item
        const dataMenu = document.getElementById('data-management-menu');
        if (dataMenu) {
            if (isAdmin) dataMenu.classList.remove('d-none');
            else dataMenu.classList.add('d-none');
        }

        // Re-render or show/hide edit buttons
        const editBtns = document.querySelectorAll('.admin-edit-btn');
        editBtns.forEach(btn => btn.style.display = isAdmin ? 'inline-block' : 'none');
    }

    // Generic method to open edit/add form for a record
    openEditModal(table, record, schema) {
        this.currentTable = table;
        this.currentRecord = record; // If null, it's an ADD operation
        this.currentSchema = schema; // Array of field definitions { name, type, label }

        const form = document.getElementById('admin-form');
        form.innerHTML = '';
        
        const modalTitle = document.querySelector('#admin-modal .modal-title');
        modalTitle.innerText = record ? 'Editar Datos' : 'Agregar Nuevo Registro';

        schema.forEach(field => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            const label = document.createElement('label');
            label.className = 'form-label';
            label.innerText = field.label || field.name;
            div.appendChild(label);

            let input;
            if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.className = 'form-control';
                input.rows = 3;
            } else if (field.type === 'select') {
                input = document.createElement('select');
                input.className = 'form-select';
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.innerText = opt.label;
                    if (record && record[field.name] == opt.value) option.selected = true;
                    input.appendChild(option);
                });
            } else if (field.type === 'date') {
                input = document.createElement('input');
                input.type = 'date';
                input.className = 'form-control';
            } else if (field.type === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control';
                if (field.step) input.step = field.step;
            } else if (field.type === 'file') {
                input = document.createElement('input');
                input.type = 'file';
                input.className = 'form-control';
                if (field.accept) input.accept = field.accept;
                
                if (record && record[field.name]) {
                    const help = document.createElement('div');
                    help.className = 'form-text mt-1';
                    help.innerHTML = `Archivo actual: <a href="${record[field.name]}" target="_blank" class="text-decoration-none"><i class="fas fa-file-pdf"></i> Ver PDF</a>`;
                    div.appendChild(help);
                }
            } else {
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.className = 'form-control';
            }

            if (record && field.type !== 'select') {
                input.value = record[field.name] || '';
            }
            
            input.name = field.name;
            if (field.readonly && record) input.disabled = true; // Only disable readonly fields on edit
            
            div.appendChild(input);
            form.appendChild(div);
        });

        this.modal.show();
    }

    async saveChanges() {
        const form = document.getElementById('admin-form');
        const formData = new FormData(form);
        const updates = {};
        const saveBtn = document.getElementById('admin-save-btn');
        
        try {
            // Handle file uploads and other fields
            for (const field of this.currentSchema) {
                if (field.type === 'file') {
                    const fileInput = form.querySelector(`input[name="${field.name}"]`);
                    if (fileInput && fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        
                        // Show loading state
                        const originalText = saveBtn.innerText;
                        saveBtn.innerText = 'Subiendo archivo...';
                        saveBtn.disabled = true;
                        
                        try {
                            const fileUrl = await this.uploadFile(file);
                            updates[field.name] = fileUrl;
                        } finally {
                            saveBtn.innerText = originalText;
                            saveBtn.disabled = false;
                        }
                    }
                    // If no new file, we don't add anything to updates, preserving existing value
                } else if (!field.readonly || !this.currentRecord) { 
                     updates[field.name] = formData.get(field.name);
                }
            }

            if (this.currentRecord) {
                // Update
                await window.dataManager.updateTable(this.currentTable, this.currentRecord.id, updates);
                alert('Datos actualizados correctamente.');
            } else {
                // Insert
                await window.dataManager.insertTable(this.currentTable, updates);
                alert('Registro agregado correctamente.');
            }
            this.modal.hide();
            // Trigger event to refresh data
            window.dispatchEvent(new CustomEvent('data-updated', { detail: { table: this.currentTable } }));
        } catch (err) {
            console.error(err);
            alert('Error al guardar: ' + err.message);
        }
    }

    async uploadFile(file) {
        // Use a dedicated bucket for operations files
        const bucketName = 'operations_files'; 
        // Create a unique file name: timestamp_sanitized-name
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { data, error } = await window.supabaseClient.storage
            .from(bucketName)
            .upload(fileName, file);
            
        if (error) throw error;
        
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(fileName);
            
        return publicUrl;
    }

    async deleteRecord(table, id) {
        if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            try {
                await window.dataManager.deleteTable(table, id);
                alert('Registro eliminado correctamente.');
                window.dispatchEvent(new CustomEvent('data-updated', { detail: { table: table } }));
            } catch (err) {
                console.error(err);
                alert('Error al eliminar: ' + err.message);
            }
        }
    }
    
    // Helper to create an edit button
    createEditButton(table, record, schema) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-primary admin-edit-btn';
        btn.innerText = '✏️ Editar';
        btn.style.display = window.dataManager.isAdmin ? 'inline-block' : 'none';
        btn.onclick = (e) => {
            e.stopPropagation();
            this.openEditModal(table, record, schema);
        };
        return btn;
    }
}

window.adminUI = new AdminUI();
