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
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content shadow-sm border-0">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title d-flex align-items-center gap-2"><i class="fas fa-edit"></i><span id="admin-modal-title">Editar Datos</span></h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <p class="small text-muted mb-3" id="admin-modal-help">Selecciona el tipo de registro y completa los campos. Los campos obligatorios están marcados.</p>
                            <form id="admin-form" class="row g-3"></form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-success" id="admin-save-btn"><i class="fas fa-save me-1"></i> Guardar</button>
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
        const modalTitle = document.getElementById('admin-modal-title');
        modalTitle.innerText = record ? 'Editar Registro' : 'Agregar Nuevo Registro';

        // Build form with nicer layout: two-column grid for compactness
        // For specific tables, allow reordering to match UX expectations
        let fieldsToRender = Array.isArray(schema) ? [...schema] : [];
        if (this.currentTable === 'daily_operations') {
            const preferredOrder = [
                'date',
                'comercial_ops', 'comercial_pax',
                'general_ops', 'general_pax',
                'carga_ops', 'carga_tons', 'carga_cutoff_date', 'carga_cutoff_note'
            ];
            const ordered = [];
            preferredOrder.forEach(name => {
                const f = fieldsToRender.find(s => s.name === name);
                if (f) ordered.push(f);
            });
            // Append any remaining fields that were not explicitly ordered
            fieldsToRender.filter(f => !preferredOrder.includes(f.name)).forEach(f => ordered.push(f));
            fieldsToRender = ordered;
        }

        fieldsToRender.forEach((field, idx) => {
            const col = document.createElement('div');
            // Special layout for the date field: full-width and centered
            if (field.name === 'date') {
                col.className = 'col-12 d-flex flex-column align-items-center';
            } else {
                col.className = field.type === 'textarea' ? 'col-12' : 'col-md-6';
            }

            const label = document.createElement('label');
            label.className = 'form-label fw-medium d-flex align-items-center gap-2';
            // Add category icon for visual guidance
            const iconSpan = document.createElement('span');
            iconSpan.setAttribute('aria-hidden', 'true');
            if (String(field.name).toLowerCase().includes('comercial')) {
                iconSpan.innerHTML = '<i class="fas fa-plane text-primary"></i>';
            } else if (String(field.name).toLowerCase().includes('general')) {
                iconSpan.innerHTML = '<i class="fas fa-helicopter text-success"></i>';
            } else if (String(field.name).toLowerCase().includes('carga')) {
                iconSpan.innerHTML = '<i class="fas fa-boxes text-warning"></i>';
            } else {
                iconSpan.innerHTML = '';
            }
            const labelText = document.createElement('span');
            labelText.innerText = field.label || field.name;
            label.appendChild(iconSpan);
            label.appendChild(labelText);

            let input;
            if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.className = 'form-control';
                input.rows = 3;
                input.placeholder = field.placeholder || '';
            } else if (field.type === 'select') {
                input = document.createElement('select');
                input.className = 'form-select';
                const defaultOpt = document.createElement('option'); defaultOpt.value = ''; defaultOpt.innerText = '— Selecciona —';
                input.appendChild(defaultOpt);
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
                // Use text input to allow formatted display (commas) while typing
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control format-number';
                if (field.step) input.dataset.step = field.step;
                input.placeholder = field.placeholder || '0';
                // Add formatting listener to show thousands separators as user types
                input.addEventListener('input', (e) => {
                    const el = e.target;
                    const raw = el.value;
                    const caret = el.selectionStart || 0;
                    const clean = AdminUI.unformatNumberString(raw);
                    if (clean === '') {
                        el.value = '';
                        return;
                    }
                    const hasDecimal = clean.indexOf('.') >= 0;
                    // Format integer part with thousands separators
                    let parts = clean.split('.');
                    parts[0] = Number(parts[0]).toLocaleString('en-US');
                    el.value = hasDecimal ? parts.join('.') : parts[0];
                    // Try to restore caret near the end (simple strategy)
                    try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) {}
                });
            } else {
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.className = 'form-control';
                input.placeholder = field.placeholder || '';
            }

            if (record && field.type !== 'select') {
                const rawVal = record[field.name] == null ? '' : record[field.name];
                if (field.type === 'number' && rawVal !== '') {
                    // Format existing numeric value for display
                    try {
                        const n = Number(rawVal);
                        // Respect decimal step if provided
                        const decimals = (field.step && field.step.indexOf('.') >= 0) ? field.step.split('.')[1].length : 0;
                        input.value = Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : String(rawVal);
                    } catch (e) {
                        input.value = String(rawVal);
                    }
                } else {
                    input.value = rawVal || '';
                }
            }
            input.name = field.name;
            if (field.readonly && record) input.disabled = true;

            // If date field, center the input and constrain width for nicer appearance
            if (field.name === 'date') {
                label.classList.add('text-center', 'w-100');
                input.classList.add('text-center', 'mx-auto');
                input.style.maxWidth = '220px';
            }

            col.appendChild(label);
            col.appendChild(input);

            // Add small helper for numeric/date fields
            if (field.type === 'number' || field.type === 'date') {
                const help = document.createElement('div');
                help.className = 'form-text text-muted';
                help.innerText = field.help || '';
                if (help.innerText) col.appendChild(help);
            }

            form.appendChild(col);
        });

        // Autofocus first input after show
        this.modal.show();
        setTimeout(() => {
            const firstInput = document.querySelector('#admin-form .form-control:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 200);
    }

    async saveChanges() {
        const form = document.getElementById('admin-form');
        const formData = new FormData(form);
        const updates = {};
        
        this.currentSchema.forEach(field => {
            if (!field.readonly || !this.currentRecord) { // Include readonly fields if it's a new record (unless auto-generated)
                 let val = formData.get(field.name);
                 // If the field is numeric, unformat and convert to number (or null if empty)
                 if (field.type === 'number') {
                     const clean = AdminUI.unformatNumberString(val || '');
                     if (clean === '' || clean === null) val = null;
                     else val = (clean.indexOf('.') >= 0) ? Number(clean) : Number(clean);
                 }
                 updates[field.name] = val;
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

// Utility: remove thousands separators and leave a clean numeric string
AdminUI.unformatNumberString = function(s) {
    if (s == null) return '';
    // Remove all non-digit, non-dot, non-minus characters
    const cleaned = String(s).replace(/[^0-9.\-]/g, '');
    // If multiple dots, keep first and remove others
    const parts = cleaned.split('.');
    if (parts.length <= 1) return parts[0] === '' ? '' : parts[0];
    return parts.shift() + '.' + parts.join('');
};

window.adminUI = new AdminUI();
