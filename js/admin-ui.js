class AdminUI {
    constructor() {
        this.modal = null;
        this.initModal();
        window.addEventListener('admin-mode-changed', (e) => {
            this.toggleAdminControls(e.detail.isAdmin);
        });
    }

    initModal() {
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
        this.modal = new bootstrap.Modal(document.getElementById('admin-modal'));
        
        document.getElementById('admin-save-btn').addEventListener('click', () => this.saveChanges());
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
        
        this.currentSchema.forEach(field => {
            if (!field.readonly || !this.currentRecord) { // Include readonly fields if it's a new record (unless auto-generated)
                 // Handle different input types if needed
                 updates[field.name] = formData.get(field.name);
            }
        });

        try {
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
