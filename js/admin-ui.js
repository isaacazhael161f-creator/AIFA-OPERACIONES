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

    generateWeekOptions() {
        const options = [];
        const year = new Date().getFullYear();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        // Start from the first Monday of the year
        let d = new Date(year, 0, 1);
        while (d.getDay() !== 1) {
            d.setDate(d.getDate() + 1);
        }
        
        // Generate weeks for the whole year
        while (d.getFullYear() === year) {
            const start = new Date(d);
            const end = new Date(d);
            end.setDate(end.getDate() + 6);
            
            const startStr = `${String(start.getDate()).padStart(2, '0')} ${months[start.getMonth()]}`;
            const endStr = `${String(end.getDate()).padStart(2, '0')} ${months[end.getMonth()]}`;
            
            let label;
            if (start.getMonth() === end.getMonth()) {
                label = `${String(start.getDate()).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')} ${months[start.getMonth()]} ${year}`;
            } else {
                label = `${startStr} - ${endStr} ${year}`;
            }
            
            options.push({ 
                value: label, 
                label: label,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            });
            
            d.setDate(d.getDate() + 7);
        }
        return options;
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
        } else if (this.currentTable === 'weekly_frequencies') {
            const preferredOrder = [
                'week_label', 'valid_from', 'valid_to',
                'airline', 'route_id', 'iata', 'city', 'state',
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                'weekly_total'
            ];
            const ordered = [];
            preferredOrder.forEach(name => {
                const f = fieldsToRender.find(s => s.name === name);
                if (f) ordered.push(f);
            });
            fieldsToRender.filter(f => !preferredOrder.includes(f.name)).forEach(f => ordered.push(f));
            fieldsToRender = ordered;

            // Inject week options
            const weekField = fieldsToRender.find(f => f.name === 'week_label');
            if (weekField) {
                const newField = { ...weekField, type: 'select', options: this.generateWeekOptions() };
                const idx = fieldsToRender.indexOf(weekField);
                fieldsToRender[idx] = newField;
            }

            // Inject airline options
            const airlineField = fieldsToRender.find(f => f.name === 'airline');
            if (airlineField) {
                const airlines = [
                    { value: 'Aeromexico', label: 'Aeromexico' },
                    { value: 'Volaris', label: 'Volaris' },
                    { value: 'Viva', label: 'Viva' },
                    { value: 'Mexicana', label: 'Mexicana' },
                    { value: 'Copa Airlines', label: 'Copa Airlines' },
                    { value: 'Arajet', label: 'Arajet' },
                    { value: 'Conviasa', label: 'Conviasa' },
                    { value: 'Magnicharters', label: 'Magnicharters' },
                    { value: 'Aerus', label: 'Aerus' }
                ];
                const newField = { ...airlineField, type: 'select', options: airlines };
                const idx = fieldsToRender.indexOf(airlineField);
                fieldsToRender[idx] = newField;
            }
        }

        fieldsToRender.forEach((field, idx) => {
            const col = document.createElement('div');
            // Special layout for the date field: full-width and centered
            if (field.name === 'date') {
                col.className = 'col-12 d-flex flex-column align-items-center';
            } else if (this.currentTable === 'weekly_frequencies') {
                if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(field.name)) {
                    col.className = 'col-6 col-md-auto'; // Auto width for days to fit in one row if possible
                    col.style.flex = '1 0 auto';
                    col.style.minWidth = '80px';
                } else if (field.name === 'weekly_total') {
                    col.className = 'col-12 col-md-2 fw-bold';
                } else if (field.name === 'airline') {
                    col.className = 'col-12 col-md-6';
                } else if (['city', 'state', 'iata', 'route_id'].includes(field.name)) {
                    col.className = 'col-6 col-md-3';
                } else {
                    col.className = 'col-12 col-md-6';
                }
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

            if (this.currentTable === 'weekly_frequencies' && field.name === 'airline') {
                const img = document.createElement('img');
                img.id = 'admin-airline-logo-preview';
                img.style.height = '24px';
                img.style.marginLeft = 'auto';
                img.style.display = 'none';
                label.appendChild(img);
            }

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
                    if (opt.startDate) option.dataset.startDate = opt.startDate;
                    if (opt.endDate) option.dataset.endDate = opt.endDate;
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
            input.id = 'input-' + field.name;
            
            // Use readOnly instead of disabled so FormData includes the value
            if (field.readonly && record) {
                input.readOnly = true;
                input.classList.add('bg-light');
            }

            // Special case: Weekly Frequencies validity dates are auto-calculated and should be readonly
            if (this.currentTable === 'weekly_frequencies' && ['valid_from', 'valid_to'].includes(field.name)) {
                input.readOnly = true;
                input.classList.add('bg-light');
                input.tabIndex = -1;
            }

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

        if (this.currentTable === 'weekly_frequencies') {
            this.setupWeeklyFrequenciesLogic();
        }

        // Autofocus first input after show
        this.modal.show();
        setTimeout(() => {
            const firstInput = document.querySelector('#admin-form .form-control:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 200);
    }

    setupWeeklyFrequenciesLogic() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const inputs = days.map(d => document.getElementById(`input-${d}`));
        const totalInput = document.getElementById('input-weekly_total');
        const airlineInput = document.getElementById('input-airline');
        const logoPreview = document.getElementById('admin-airline-logo-preview');

        // Auto-fill dates from week label
        const weekLabelInput = document.getElementById('input-week_label');
        const validFromInput = document.getElementById('input-valid_from');
        const validToInput = document.getElementById('input-valid_to');

        if (weekLabelInput && validFromInput && validToInput) {
            weekLabelInput.addEventListener('change', () => {
                const selectedOption = weekLabelInput.options[weekLabelInput.selectedIndex];
                if (selectedOption && selectedOption.dataset.startDate) {
                    validFromInput.value = selectedOption.dataset.startDate;
                    validToInput.value = selectedOption.dataset.endDate;
                }
            });
        }

        // Airport Autocomplete Logic
        const cityInput = document.getElementById('input-city');
        const iataInput = document.getElementById('input-iata');
        const stateInput = document.getElementById('input-state');

        if (window.dataManager) {
            window.dataManager.loadAirportsCatalog().then(airports => {
                // 1. City Autocomplete
                if (cityInput) {
                    let cityList = document.getElementById('airport-city-list');
                    if (!cityList) {
                        cityList = document.createElement('datalist');
                        cityList.id = 'airport-city-list';
                        document.body.appendChild(cityList);
                    }
                    cityInput.setAttribute('list', 'airport-city-list');
                    cityInput.setAttribute('autocomplete', 'off');

                    cityList.innerHTML = '';
                    airports.forEach(a => {
                        if (!a.City || !a.IATA) return;
                        const opt = document.createElement('option');
                        opt.value = `${a.City} (${a.IATA})`;
                        cityList.appendChild(opt);
                    });

                    cityInput.addEventListener('input', (e) => {
                        const val = e.target.value;
                        const match = val.match(/^(.*) \(([A-Z]{3})\)$/);
                        if (match) {
                            const city = match[1];
                            const iata = match[2];
                            cityInput.value = city;
                            if (iataInput) {
                                iataInput.value = iata;
                                // Trigger IATA change logic manually if needed, or just fill state directly
                                const state = window.dataManager.getMexicanState(iata);
                                if (stateInput) stateInput.value = state;
                            }
                        }
                    });
                }

                // 2. IATA Autocomplete & Auto-fill
                if (iataInput) {
                    let iataList = document.getElementById('airport-iata-list');
                    if (!iataList) {
                        iataList = document.createElement('datalist');
                        iataList.id = 'airport-iata-list';
                        document.body.appendChild(iataList);
                    }
                    iataInput.setAttribute('list', 'airport-iata-list');
                    iataInput.setAttribute('autocomplete', 'off');

                    iataList.innerHTML = '';
                    airports.forEach(a => {
                        if (!a.IATA) return;
                        const opt = document.createElement('option');
                        opt.value = a.IATA;
                        opt.label = a.City; 
                        iataList.appendChild(opt);
                    });

                    iataInput.addEventListener('input', (e) => {
                        const val = e.target.value.trim().toUpperCase();
                        // Find airport by IATA
                        const airport = airports.find(a => a.IATA === val);
                        if (airport) {
                            if (cityInput) cityInput.value = airport.City;
                            if (stateInput) stateInput.value = window.dataManager.getMexicanState(val);
                        }
                    });
                }
            });
        }

        // Auto-calc
        const calc = () => {
            let sum = 0;
            inputs.forEach(inp => {
                if (inp) {
                    const val = parseFloat(inp.value.replace(/,/g, '')) || 0;
                    sum += val;
                }
            });
            if (totalInput) {
                totalInput.value = sum.toLocaleString('en-US');
            }
        };
        
        // Attach listeners and run initial calc
        inputs.forEach(inp => {
            if (inp) {
                inp.addEventListener('input', calc);
                inp.addEventListener('change', calc); // Also on change for safety
            }
        });
        
        // Run once to ensure total is correct initially
        calc();

        // Airline Logo
        const updateLogo = () => {
            if (!airlineInput || !logoPreview) return;
            const val = airlineInput.value.trim();
            if (!val) { 
                logoPreview.style.display = 'none'; 
                return; 
            }
            
            // Use DataManager config to resolve logo correctly (handling slugs and mappings)
            if (window.dataManager && window.dataManager.slugify && window.dataManager.airlineConfig) {
                const slug = window.dataManager.slugify(val);
                const config = window.dataManager.airlineConfig[slug] || window.dataManager.airlineConfig['default'];
                
                if (config.logo) {
                    logoPreview.src = `images/airlines/${config.logo}`;
                    logoPreview.style.display = 'inline-block';
                } else {
                    logoPreview.style.display = 'none';
                }
            } else {
                // Fallback if dataManager is not available
                const normalized = val.toLowerCase().replace(/\s+/g, '_');
                const filename = `logo_${normalized}.png`;
                logoPreview.src = `images/airlines/${filename}`;
                logoPreview.style.display = 'inline-block';
            }
            
            logoPreview.onerror = () => {
                logoPreview.style.display = 'none';
            };
        };

        if (airlineInput) {
            airlineInput.addEventListener('input', updateLogo);
            airlineInput.addEventListener('change', updateLogo);
            // Initial check if editing
            updateLogo();
        }
    }

    async saveChanges() {
        const form = document.getElementById('admin-form');
        const formData = new FormData(form);
        const updates = {};
        
        this.currentSchema.forEach(field => {
            // Special case: Always include weekly_total for weekly_frequencies, even if readonly, 
            // because it's a computed field that needs to be saved.
            // Also include readonly fields if we are creating a new record (no ID).
            const forceInclude = (this.currentTable === 'weekly_frequencies' && field.name === 'weekly_total');
            const isNewRecord = !this.currentRecord || !this.currentRecord.id;

            if (!field.readonly || isNewRecord || forceInclude) { 
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
            if (this.currentRecord && this.currentRecord.id) {
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
