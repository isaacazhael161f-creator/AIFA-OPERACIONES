class AdminUI {
    constructor() {
        this.modal = null;
        this.currentRecordFiles = {}; // Stores existing files that haven't been removed
        this.initModal();
        window.addEventListener('admin-mode-changed', (e) => {
            this.toggleAdminControls(e.detail.isAdmin, e.detail.role);
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

        const form = document.getElementById('admin-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveChanges();
            });
        }
        document.getElementById('admin-save-btn').addEventListener('click', (e) => {
            e.preventDefault(); // Just in case
            this.saveChanges();
        });
    }

    toggleAdminControls(isAdmin, role) {
        document.body.classList.toggle('admin-enabled', isAdmin);

        // Toggle Data Management menu item
        const dataMenu = document.getElementById('data-management-menu');
        if (dataMenu) {
            if (isAdmin) {
                dataMenu.classList.remove('d-none');
                dataMenu.classList.remove('perm-hidden'); // Force remove perm-hidden if it was added
                dataMenu.style.display = 'flex'; // Ensure flex display
            } else {
                dataMenu.classList.add('d-none');
            }
        }

        // --- Role Based Tab Visibility (Data Management) ---
        if (isAdmin) {
            const allTabs = [
                'tab-ops-summary', 'tab-daily-ops', 'tab-parte-ops', 'tab-daily-flights-ops', 
                'tab-library', 'tab-alerts', 'tab-itinerary', 'tab-weekly-frequencies', 
                'tab-weekly-frequencies-int', 'tab-punctuality-table', 'tab-wildlife', 
                'tab-rescued-wildlife', 'tab-medical', 'tab-delays', 'tab-comparativa',
                'tab-visitors'
            ];
            
            // Define visible tabs for specific roles
            // If role is control_fauna, only show wildlife tabs
            if (role === 'control_fauna') {
                const faunaTabs = ['tab-wildlife', 'tab-rescued-wildlife'];
                allTabs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (faunaTabs.includes(id)) {
                             el.parentElement.style.display = ''; // Show parent li or element
                             el.style.display = ''; 
                        } else {
                             el.parentElement.style.display = 'none';
                             el.style.display = 'none';
                        }
                    }
                });
                
                // Also ensure we switch to a valid tab if current is hidden
                const active = document.querySelector('.nav-link.active');
                if (active && active.style.display === 'none') {
                    const first = document.getElementById(faunaTabs[0]);
                    if (first) {
                        const tab = new bootstrap.Tab(first);
                        tab.show();
                    }
                }
            } else {
                // Restore all tabs for other admins (or default behavior)
                allTabs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.parentElement.style.display = '';
                        el.style.display = '';
                    }
                });
            }
        }

        // Re-render or show/hide edit buttons
        const editBtns = document.querySelectorAll('.admin-edit-btn');
        editBtns.forEach(btn => btn.style.display = isAdmin ? 'inline-block' : 'none');

        // Handle ADD buttons in Data Management
        // Default: hide all "Add" buttons in DM if not admin
        // If control_fauna, show specific ones.
        
        const dmAddBtns = document.querySelectorAll('#pane-ops-summary button, #pane-monthly-ops button, #pane-wildlife button, #pane-rescued-wildlife button, #pane-medical button, #pane-delays button');
        // This query is too broad, let's target the add buttons specifically if possible or iterate parent containers
        
        // Better approach: Since I added IDs to the toolbars of interest
        const faunaToolbars = ['toolbar-wildlife', 'toolbar-rescued-wildlife'];
        
        // 1. Hide/Show Fauna Toolbars based on permission
        faunaToolbars.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Determine visibility: Admin always yes? control_fauna yes.
                const allowed = isAdmin && ( (role === 'control_fauna') || (role === 'admin') || (role === 'superadmin') || (role === 'editor') );
                el.style.display = allowed ? '' : 'none';
            }
        });

        // 2. Hide other toolbars if control_fauna
        if (role === 'control_fauna') {
             // Hide other specific buttons explicitly if needed, but since tab is hidden, button is hidden.
             // But if we want to be safe:
             const otherAddIds = ['monthly-ops-add', 'monthly-ops-refresh', 'annual-ops-refresh']; 
             otherAddIds.forEach(id => {
                 const el = document.getElementById(id);
                 if (el) el.style.display = 'none';
             });
        }
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
        this.currentRecordFiles = {};

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
        } else if (this.currentTable === 'weekly_frequencies_int') {
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

            // Inject airline options (Predictive)
            const airlineField = fieldsToRender.find(f => f.name === 'airline');
            if (airlineField) {
                let options = [];
                if (window.dataManagement && window.dataManagement.airlineCatalog && window.dataManagement.airlineCatalog.length > 0) {
                    options = window.dataManagement.airlineCatalog.map(a => ({ value: a.name, label: a.name }));
                } else {
                    // International airlines fallback
                    options = [
                        { value: 'Aeromexico', label: 'Aeromexico' }, { value: 'Volaris', label: 'Volaris' },
                        { value: 'Copa Airlines', label: 'Copa Airlines' }, { value: 'Arajet', label: 'Arajet' },
                        { value: 'Conviasa', label: 'Conviasa' }, { value: 'Avianca', label: 'Avianca' },
                        { value: 'American Airlines', label: 'American Airlines' }, { value: 'Delta', label: 'Delta' },
                        { value: 'United', label: 'United' }, { value: 'Iberia', label: 'Iberia' },
                        { value: 'Qatar Airways', label: 'Qatar Airways' }
                    ];
                }
                const newField = { ...airlineField, type: 'datalist', options: options };
                const idx = fieldsToRender.indexOf(airlineField);
                fieldsToRender[idx] = newField;
            }

        } else if (this.currentTable === 'punctuality_stats') {
            // Inject airline options from loaded catalog
            const airlineField = fieldsToRender.find(f => f.name === 'airline');
            if (airlineField) {
                let options = [];
                if (window.dataManagement && window.dataManagement.airlineCatalog && window.dataManagement.airlineCatalog.length > 0) {
                    options = window.dataManagement.airlineCatalog.map(a => ({ value: a.name, label: a.name }));
                } else {
                    // Fallback options if catalog not loaded
                    options = [
                        { value: 'Aeromexico', label: 'Aeromexico' }, { value: 'Volaris', label: 'Volaris' },
                        { value: 'Viva', label: 'Viva' }, { value: 'Mexicana', label: 'Mexicana' },
                        { value: 'Copa Airlines', label: 'Copa Airlines' }, { value: 'Arajet', label: 'Arajet' },
                        { value: 'Conviasa', label: 'Conviasa' }, { value: 'Magnicharters', label: 'Magnicharters' },
                        { value: 'Qatar Airways', label: 'Qatar Airways' }, { value: 'China Southern', label: 'China Southern' },
                        { value: 'Emirates SkyCargo', label: 'Emirates SkyCargo' }, { value: 'FedEx', label: 'FedEx' },
                        { value: 'DHL', label: 'DHL' }, { value: 'Mas', label: 'Mas' }, { value: 'Air Canada', label: 'Air Canada' }
                    ];
                }
                const newField = { ...airlineField, type: 'datalist', options: options };
                const idx = fieldsToRender.indexOf(airlineField);
                fieldsToRender[idx] = newField;
            }
        }

        fieldsToRender.forEach((field, idx) => {
            const col = document.createElement('div');
            // Special layout for the date field: full-width and centered
            if (field.name === 'date') {
                col.className = 'col-12 d-flex flex-column align-items-center';
            } else if (this.currentTable === 'weekly_frequencies' || this.currentTable === 'weekly_frequencies_int') {
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

            if (this.currentTable === 'weekly_frequencies_int' && field.name === 'airline') {
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
            } else if (field.type === 'datalist') {
                input = document.createElement('input');
                input.className = 'form-control';
                input.setAttribute('autocomplete', 'off'); // Disable browser history for cleaner search
                input.placeholder = field.placeholder || 'Escribe para buscar...';

                // Attach custom autocomplete logic
                this.setupAutocomplete(input, field.options || []);
            } else if (field.type === 'date') {
                input = document.createElement('input');
                input.type = 'date';
                input.className = 'form-control';
            } else if (field.type === 'number') {
                if (field.name === 'year') {
                    // Year field: plain simple number input, no thousands separators
                    input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'form-control';
                    input.placeholder = field.placeholder || '2025';
                } else {
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
                    });
                }
            } else if (field.type === 'file') {
                input = document.createElement('input');
                input.type = 'file';
                input.className = 'form-control';
                if (field.multiple) input.multiple = true;
                if (record && record.type) {
                    if (record.type === 'pdf') input.accept = '.pdf';
                    else if (record.type === 'excel') input.accept = '.xls,.xlsx,.csv';
                    else if (record.type === 'word') input.accept = '.doc,.docx';
                }
            } else if (field.type === 'icon') {
                input = document.createElement('input');
                input.type = 'hidden';
            } else {
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.className = 'form-control';
                input.placeholder = field.placeholder || '';
            }

            if (record && field.type !== 'select') {
                const rawVal = record[field.name] == null ? '' : record[field.name];
                if (field.type === 'number' && rawVal !== '') {
                    try {
                        const n = Number(rawVal);
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

            if (this.currentTable === 'punctuality_stats' && field.name === 'airline' && (field.type === 'select' || field.type === 'datalist')) {
                const eventType = field.type === 'datalist' ? 'input' : 'change';
                input.addEventListener(eventType, (e) => {
                    const val = (e.target.value || '').toLowerCase();
                    const catSelect = document.getElementById('input-category');
                    if (catSelect) {
                        const cargoKeywords = ['cargo', 'fedex', 'dhl', 'ups', 'mas', 'estafeta', 'cathay', 'emirates', 'atlas', 'tws', 'kalitta', 'national', 'cargolux', 'air france', 'china southern', 'lufthansa'];
                        const isCargo = cargoKeywords.some(k => val.includes(k));
                        catSelect.value = isCargo ? 'Carga' : 'Pasajeros';
                    }
                });
            }

            if (field.readonly && record) {
                input.readOnly = true;
                input.classList.add('bg-light');
            }

            if ((this.currentTable === 'weekly_frequencies' || this.currentTable === 'weekly_frequencies_int') && ['valid_from', 'valid_to'].includes(field.name)) {
                input.readOnly = true;
                input.classList.add('bg-light');
                input.tabIndex = -1;
            }

            if (field.name === 'date') {
                label.classList.add('text-center', 'w-100');
                input.classList.add('text-center', 'mx-auto');
                input.style.maxWidth = '220px';
                input.readOnly = false;
                input.classList.remove('bg-light');
            }

            if (field.type === 'file' && record) {
                const existing = record[field.name];
                if (existing) {
                    let files = [];
                    try {
                        files = typeof existing === 'string' && existing.startsWith('[') ? JSON.parse(existing) : (Array.isArray(existing) ? existing : [{ url: existing, name: existing.split('/').pop() }]);
                    } catch (e) {
                        files = [{ url: existing, name: existing.split('/').pop() }];
                    }
                    this.currentRecordFiles[field.name] = files;

                    const filesContainer = document.createElement('div');
                    filesContainer.id = `existing-files-${field.name}`;
                    filesContainer.className = 'mt-2 d-flex flex-column gap-1';

                    const renderFiles = () => {
                        filesContainer.innerHTML = '';
                        this.currentRecordFiles[field.name].forEach((file, idx) => {
                            const url = typeof file === 'string' ? file : file.url;
                            const name = file.name || url.split('/').pop();

                            const div = document.createElement('div');
                            div.className = 'd-flex align-items-center justify-content-between p-2 rounded border bg-light small';
                            div.innerHTML = `
                                <span class="text-truncate me-2"><i class="fas fa-file me-1"></i> ${name}</span>
                                <div class="btn-group">
                                    <a href="${url}" target="_blank" class="btn btn-sm btn-link text-primary p-0 px-2"><i class="fas fa-external-link-alt"></i></a>
                                    <button type="button" class="btn btn-sm btn-link text-danger p-0 px-2 remove-file-btn" data-field="${field.name}" data-index="${idx}"><i class="fas fa-trash"></i></button>
                                </div>
                            `;
                            filesContainer.appendChild(div);
                        });

                        // Attach remove listeners
                        filesContainer.querySelectorAll('.remove-file-btn').forEach(btn => {
                            btn.onclick = () => {
                                const f = btn.dataset.field;
                                const i = parseInt(btn.dataset.index);
                                this.currentRecordFiles[f].splice(i, 1);
                                renderFiles();
                            };
                        });
                    };

                    renderFiles();
                    col.appendChild(filesContainer);
                }
            }

            if (this.currentTable === 'punctuality_stats' && ['on_time', 'delayed', 'cancelled'].includes(field.name)) {
                input.addEventListener('input', () => {
                    const onTime = Number(AdminUI.unformatNumberString(document.getElementById('input-on_time')?.value || '0'));
                    const delayed = Number(AdminUI.unformatNumberString(document.getElementById('input-delayed')?.value || '0'));
                    const cancelled = Number(AdminUI.unformatNumberString(document.getElementById('input-cancelled')?.value || '0'));
                    const total = onTime + delayed + cancelled;

                    const totalInput = document.getElementById('input-total_flights');
                    if (totalInput) {
                        totalInput.value = total.toLocaleString('en-US');
                    }
                });
            }

            col.appendChild(label);

            if (field.type === 'icon') {
                const currentVal = record ? record[field.name] : '';
                this.renderIconPicker(field, currentVal, col, input);
            }

            // For datalist, wrap in input-group with search icon and handle custom autocomplete
            if (field.type === 'datalist') {
                const group = document.createElement('div');
                group.className = 'input-group autocomplete-wrapper';
                const icon = document.createElement('span');
                icon.className = 'input-group-text bg-white text-muted';
                icon.innerHTML = '<i class="fas fa-search"></i>';
                group.appendChild(icon);
                group.appendChild(input);

                // Append the list container which was attached to input in setupAutocomplete
                if (input._listContainer) {
                    group.appendChild(input._listContainer);
                }

                col.appendChild(group);
            } else {
                col.appendChild(input);
            }

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

        if (this.currentTable === 'weekly_frequencies_int') {
            this.setupWeeklyFrequenciesLogic('int');
        }

        // Autofocus first input after show
        this.modal.show();
        setTimeout(() => {
            const firstInput = document.querySelector('#admin-form .form-control:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 200);
    }

    setupWeeklyFrequenciesLogic(mode = 'domestic') {
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
                        // Filter for international if mode is 'int' ? 
                        // The user said "International", so likely non-MX or general list. 
                        // But usually the catalog contains all. 
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
                                if (stateInput) stateInput.value = state || '';

                                // For International, "State" is often "Country" or "Region"
                                // If getMexicanState returns something, use it, else try Country
                                if (mode === 'int') {
                                    // Find airport again to get Country
                                    const ap = airports.find(x => x.IATA === iata);
                                    if (ap && ap.Country && ap.Country !== 'Mexico') {
                                        stateInput.value = ap.Country;
                                    }
                                }
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

                            let region = window.dataManager.getMexicanState(val);
                            if (mode === 'int' && (!region || region === 'N/A')) {
                                if (airport.Country && airport.Country !== 'Mexico') {
                                    region = airport.Country;
                                } else {
                                    region = 'Internacional';
                                }
                            }
                            if (stateInput) stateInput.value = region;
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

    renderIconPicker(field, currentVal, container, hiddenInput) {
        const icons = [
            'fas fa-book', 'fas fa-plane', 'fas fa-plane-arrival', 'fas fa-plane-departure',
            'fas fa-cloud', 'fas fa-cloud-sun', 'fas fa-folder', 'fas fa-folder-open',
            'fas fa-file-pdf', 'fas fa-file-excel', 'fas fa-file-word', 'fas fa-file-alt',
            'fas fa-link', 'fas fa-info-circle', 'fas fa-database', 'fas fa-user',
            'fas fa-hospital', 'fas fa-shield-alt', 'fas fa-map', 'fas fa-map-marked-alt',
            'fas fa-calendar-alt', 'fas fa-chart-bar', 'fas fa-chart-line', 'fas fa-cogs',
            'fas fa-exclamation-triangle', 'fas fa-check-circle', 'fas fa-times-circle',
            'fas fa-bell', 'fas fa-envelope', 'fas fa-phone', 'fas fa-globe',
            'fas fa-home', 'fas fa-search', 'fas fa-star', 'fas fa-heart',
            'fas fa-camera', 'fas fa-image', 'fas fa-video', 'fas fa-music',
            'fas fa-shopping-cart', 'fas fa-briefcase', 'fas fa-graduation-cap',
            'fas fa-flag', 'fas fa-anchor', 'fas fa-truck', 'fas fa-bus', 'fas fa-car',
            'fas fa-wrench', 'fas fa-tools', 'fas fa-hammer', 'fas fa-paint-roller',
            'fas fa-brush', 'fas fa-pen', 'fas fa-list', 'fas fa-tasks', 'fas fa-history'
        ];

        const wrapper = document.createElement('div');
        wrapper.className = 'icon-picker-wrapper border rounded p-3 bg-white';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control form-control-sm mb-3';
        searchInput.placeholder = '🔍 Buscar icono (ej. book, plane, folder)...';

        hiddenInput.value = currentVal || icons[0];

        const grid = document.createElement('div');
        grid.className = 'icon-grid d-flex flex-wrap gap-2 overflow-auto';
        grid.style.maxHeight = '200px';

        const renderGrid = (filter = '') => {
            grid.innerHTML = '';
            icons.forEach(icon => {
                if (filter && !icon.includes(filter)) return;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-secondary ' + (hiddenInput.value === icon ? 'active text-white' : '');
                btn.innerHTML = `<i class="${icon} fa-lg"></i>`;
                btn.title = icon;
                btn.onclick = (e) => {
                    e.preventDefault();
                    hiddenInput.value = icon;
                    grid.querySelectorAll('.btn').forEach(b => b.classList.remove('active', 'text-white'));
                    btn.classList.add('active', 'text-white');
                };
                grid.appendChild(btn);
            });
            if (grid.children.length === 0) {
                grid.innerHTML = '<div class="w-100 text-center py-3 text-muted small">No se encontraron iconos</div>';
            }
        };

        searchInput.oninput = (e) => renderGrid(e.target.value.toLowerCase());

        renderGrid();
        wrapper.appendChild(searchInput);
        wrapper.appendChild(grid);
        container.appendChild(wrapper);
    }

    setupAutocomplete(input, options) {
        let currentFocus = -1;
        const listContainer = document.createElement('div');
        listContainer.className = 'autocomplete-items';
        listContainer.style.display = 'none';

        // Attach to input for retrieval later
        input._listContainer = listContainer;

        input.addEventListener('input', function (e) {
            const val = this.value;
            closeAllLists();
            if (!val) return false;
            currentFocus = -1;

            const matches = options.filter(opt =>
                String(opt.label || opt.value).toLowerCase().includes(val.toLowerCase())
            );

            if (matches.length === 0) return;

            listContainer.style.display = 'block';

            // Limit to top 10 matches for performance
            matches.slice(0, 10).forEach(match => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';

                const text = String(match.label || match.value);
                // Highlight match
                const idx = text.toLowerCase().indexOf(val.toLowerCase());
                if (idx >= 0) {
                    div.innerHTML = text.substring(0, idx) + "<strong>" + text.substring(idx, idx + val.length) + "</strong>" + text.substring(idx + val.length);
                } else {
                    div.innerHTML = text;
                }

                div.addEventListener('click', function (e) {
                    input.value = match.value;
                    closeAllLists();
                    // Trigger change events manually
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });

                listContainer.appendChild(div);
            });
        });

        input.addEventListener('keydown', function (e) {
            let x = listContainer.getElementsByClassName('autocomplete-item'); // Get current list
            if (e.keyCode === 40) { // DOWN
                currentFocus++;
                addActive(x);
            } else if (e.keyCode === 38) { // UP
                currentFocus--;
                addActive(x);
            } else if (e.keyCode === 13) { // ENTER
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                } else if (x.length === 1) {
                    // Try to auto-select if only 1 match
                    x[0].click();
                }
            }
        });

        function addActive(x) {
            if (!x) return false;
            removeActive(x);
            if (currentFocus >= x.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (x.length - 1);
            x[currentFocus].classList.add('autocomplete-active');
            // Scroll to view
            x[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(x) {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove('autocomplete-active');
            }
        }

        function closeAllLists(elmnt) {
            if (elmnt !== input) {
                listContainer.innerHTML = '';
                listContainer.style.display = 'none';
            }
        }

        document.addEventListener('click', function (e) {
            closeAllLists(e.target);
        });
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

                // Handle File uploads first
                if (field.type === 'file') {
                    const fileInput = document.getElementById('input-' + field.name);
                    if (fileInput && fileInput.files && fileInput.files.length > 0) {
                        updates[`__file_${field.name}`] = Array.from(fileInput.files);
                    }
                } else if (field.type === 'number') {
                    const clean = AdminUI.unformatNumberString(val || '');
                    if (clean === '' || clean === null) val = null;
                    else val = (clean.indexOf('.') >= 0) ? Number(clean) : Number(clean);
                    updates[field.name] = val;
                } else {
                    updates[field.name] = val;
                }
            }
        });

        try {
            let pkField = 'id';
            let recordId = this.currentRecord ? this.currentRecord.id : null;

            if (this.currentTable === 'daily_operations') {
                pkField = 'date';
                if (this.currentRecord) recordId = this.currentRecord.date;
            } else if (this.currentTable === 'monthly_operations') {
                if (!recordId && this.currentRecord) {
                    // Fallback to composite key if ID is missing
                    recordId = { year: this.currentRecord.year, month: this.currentRecord.month };
                    pkField = null;
                }
            }

            // Handle File Uploads to Storage
            const fileFields = Object.keys(updates).filter(k => k.startsWith('__file_'));
            for (const key of fileFields) {
                const fieldName = key.replace('__file_', '');
                const filesToUpload = updates[key];
                delete updates[key];

                const newlyUploaded = [];

                for (const file of filesToUpload) {
                    try {
                        let bucketName = 'library-files';
                        if (this.currentTable === 'medical_directory') bucketName = 'medical-files';
                        else if (this.currentTable === 'vuelos_parte_operaciones') bucketName = 'parte-operaciones';

                        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const filePath = `${this.currentTable}/${Date.now()}_${cleanName}`;

                        const { data: uploadData, error: uploadError } = await window.dataManager.client
                            .storage
                            .from(bucketName)
                            .upload(filePath, file);

                        if (uploadError) {
                            // If bucket not found, try 'files' as generic fallback
                            if (uploadError.message && (uploadError.message.includes('not found') || uploadError.error === 'not_found')) {
                                const { data: retryData, error: retryError } = await window.dataManager.client
                                    .storage
                                    .from('files')
                                    .upload(filePath, file);

                                if (retryError) {
                                    if (retryError.message && (retryError.message.includes('not found') || retryError.error === 'not_found')) {
                                        throw new Error(`El baúl de almacenamiento (bucket) "${bucketName}" no existe en Supabase. Por favor, crea un bucket llamado "library-files" o "files" en tu panel de Supabase Storage.`);
                                    }
                                    throw retryError;
                                }
                                bucketName = 'files';
                            } else {
                                throw uploadError;
                            }
                        }

                        const { data: { publicUrl } } = window.dataManager.client
                            .storage
                            .from(bucketName)
                            .getPublicUrl(filePath);

                        newlyUploaded.push({ url: publicUrl, name: file.name });
                    } catch (err) {
                        console.error('File upload failed:', err);
                        throw new Error(`Error al subir "${file.name}": ${err.message}`);
                    }
                }

                // Merge with kept existing files
                const kept = this.currentRecordFiles[fieldName] || [];
                const final = [...kept, ...newlyUploaded];

                updates[fieldName] = (this.currentTable === 'library_items' || this.currentTable === 'medical_directory') ? final : (final.length === 1 ? final[0].url : final);

                // For library_items, also update the main 'url' if it's empty
                if (this.currentTable === 'library_items' && !updates['url'] && final.length > 0) {
                    updates['url'] = final[0].url;
                }
            }

            // Handle cases where files were only REMOVED (no new uploads)
            this.currentSchema.filter(f => f.type === 'file' && !updates[`__file_${f.name}`]).forEach(f => {
                if (this.currentRecordFiles[f.name]) {
                    updates[f.name] = (this.currentTable === 'library_items' || this.currentTable === 'medical_directory')
                        ? this.currentRecordFiles[f.name]
                        : (this.currentRecordFiles[f.name].length === 1 ? this.currentRecordFiles[f.name][0].url : this.currentRecordFiles[f.name]);
                }
            });

            if (recordId) {
                // Update
                await window.dataManager.updateTable(this.currentTable, recordId, updates, pkField);
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

    async deleteRecord(table, id, pkField = 'id') {
        if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
            try {
                await window.dataManager.deleteTable(table, id, pkField);
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
AdminUI.unformatNumberString = function (s) {
    if (s == null) return '';
    // Remove all non-digit, non-dot, non-minus characters
    const cleaned = String(s).replace(/[^0-9.\-]/g, '');
    // If multiple dots, keep first and remove others
    const parts = cleaned.split('.');
    if (parts.length <= 1) return parts[0] === '' ? '' : parts[0];
    return parts.shift() + '.' + parts.join('');
};

window.adminUI = new AdminUI();
