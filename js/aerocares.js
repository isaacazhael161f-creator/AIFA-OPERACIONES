
(function() {
    let hasLoadedAerocares = false;
    let hasLoadedOperadores = false;
    let hasLoadedPosiciones = false;
    let hasLoadedAeropuertos = false;
    let _aeropuertosAll = [];
    let hasLoadedMechAerolineas = false;
    let _mechAerolineasAll = [];
    let _mechAerolineasFilter = 'all';

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

            // Expose globally so other modules (e.g. abordadores-registro) can use it
            window._aerocaresCatalogData = data;
            document.dispatchEvent(new CustomEvent('aerocaresCatalogLoaded', { detail: data }));

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


    // --- AEROPUERTOS ---
    function renderAeropuertosTable(rows) {
        const container = document.getElementById('table-mech-cat-aeropuertos-container');
        if (!container) return;
        if (!rows || !rows.length) {
            container.innerHTML = '<div class="alert alert-info m-3">No hay registros.</div>';
            return;
        }
        const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const thStyle = 'background:#f1f5f9;font-size:.72rem;text-transform:uppercase;position:sticky;top:0;z-index:2;';
        container.innerHTML = `
            <table class="table table-sm table-hover mb-0">
                <thead><tr>
                    <th style="${thStyle}">IATA</th>
                    <th style="${thStyle}">ICAO</th>
                    <th style="${thStyle}">Nombre</th>
                    <th style="${thStyle}">País</th>
                    <th style="${thStyle}">Ciudad</th>
                    <th style="${thStyle}">Tipo</th>
                </tr></thead>
                <tbody>
                    ${rows.map(r => `<tr>
                        <td><span class="badge bg-secondary">${esc(r.iata)}</span></td>
                        <td class="text-muted small">${esc(r.icao)}</td>
                        <td>${esc(r.nombre)}</td>
                        <td>${esc(r.pais)}</td>
                        <td>${esc(r.ciudad)}</td>
                        <td>${r.tipo ? `<span class="badge ${r.tipo==='Domestic'?'bg-info text-dark':'bg-primary'}">${esc(r.tipo)}</span>` : ''}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="p-2 bg-light border-top small text-muted">Total: ${rows.length} aeropuertos</div>
        `;
    }

    async function loadAeropuertosData() {
        const container = document.getElementById('table-mech-cat-aeropuertos-container');
        if (!container) return;
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando aeropuertos...</div>';
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data, error } = await supabase.from('aeropuertos').select('*').order('iata', { ascending: true });
            if (error) throw error;
            _aeropuertosAll = data || [];
            hasLoadedAeropuertos = true;
            renderAeropuertosTable(_aeropuertosAll);
        } catch (err) {
            console.error('Error loading Aeropuertos:', err);
            if (container) container.innerHTML = `<div class="alert alert-danger m-3">Error al cargar: ${err.message}</div>`;
        }
    }

    window.mechCatAeropuertosFilter = function () {
        const q = (document.getElementById('mech-cat-aeropuertos-search')?.value || '').toLowerCase().trim();
        if (!q) { renderAeropuertosTable(_aeropuertosAll); return; }
        renderAeropuertosTable(_aeropuertosAll.filter(r =>
            ['iata','icao','nombre','pais','ciudad','tipo'].some(k => r[k] && String(r[k]).toLowerCase().includes(q))
        ));
    };

    // Initialize listeners
    function init() {
        // Pre-load aerocares catalog silently on startup so datalist autocomplete is ready
        // even if the user never visits the Catálogo tab.
        loadAerocaresDataSilent();
        // Pre-load aeropuertos data for airport search autocomplete
        ensureAirportDataSilent();

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

        // Aeropuertos Tab
        const tabAeropuertos = document.getElementById('tab-mech-cat-aeropuertos');
        if (tabAeropuertos) {
            tabAeropuertos.addEventListener('shown.bs.tab', () => {
                if (!hasLoadedAeropuertos) loadAeropuertosData();
            });
            if (tabAeropuertos.classList.contains('active')) loadAeropuertosData();
        }

        // Aerolíneas tab
        const tabAerolineas = document.getElementById('tab-mech-cat-aerolineas');
        if (tabAerolineas) {
            tabAerolineas.addEventListener('shown.bs.tab', () => {
                if (!hasLoadedMechAerolineas) loadMechAerolineasData();
            });
            if (tabAerolineas.classList.contains('active')) loadMechAerolineasData();
        }
    }

    // --- AEROLÍNEAS DE PASAJEROS ---
    function renderMechAerolineas(rows) {
        const container = document.getElementById('table-mech-cat-aerolineas-container');
        if (!container) return;
        const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        if (!rows.length) {
            container.innerHTML = '<div class="alert alert-info m-3">No hay registros.</div>';
            return;
        }
        const GURL = iata => `https://www.gstatic.com/flights/airline_logos/70px/${iata}.png`;
        const typeColor = { nacional: '#16a34a', internacional: '#1d4ed8' };
        const thStyle = 'background:#f1f5f9;font-size:.72rem;text-transform:uppercase;position:sticky;top:0;z-index:2;padding:8px 10px';

        container.innerHTML = `
            <table class="table table-sm table-hover mb-0">
                <thead><tr>
                    <th style="${thStyle};width:60px">Logo</th>
                    <th style="${thStyle}">Aerolínea</th>
                    <th style="${thStyle};width:60px">IATA</th>
                    <th style="${thStyle};width:60px">ICAO</th>
                    <th style="${thStyle}">Tipo</th>
                </tr></thead>
                <tbody>
                ${rows.map(a => {
                    const logoSrc = a.logo_url || (a.iata ? GURL(a.iata) : '');
                    const logoCell = logoSrc
                        ? `<img src="${esc(logoSrc)}" alt="${esc(a.name)}" style="max-width:52px;max-height:30px;object-fit:contain" onerror="this.style.display='none'">`
                        : `<span style="font-size:.6rem;color:#9ca3af">Sin logo</span>`;
                    const types = (a.types || []).filter(t => t !== 'carga');
                    const badges = types.map(t =>
                        `<span style="background:${typeColor[t]||'#6b7280'};color:#fff;border-radius:4px;padding:1px 7px;font-size:.6rem">${esc(t)}</span>`
                    ).join(' ');
                    return `<tr>
                        <td style="vertical-align:middle;padding:5px 8px">${logoCell}</td>
                        <td style="font-weight:600;font-size:.82rem;vertical-align:middle">${esc(a.name)}</td>
                        <td style="vertical-align:middle">${a.iata ? `<code style="background:#e9ecef;padding:1px 6px;border-radius:3px;font-size:.8rem">${esc(a.iata)}</code>` : ''}</td>
                        <td style="vertical-align:middle;color:#6b7280;font-size:.78rem">${esc(a.icao || '')}</td>
                        <td style="vertical-align:middle">${badges}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
            <div class="p-2 bg-light border-top small text-muted">Total: ${rows.length} aerolíneas</div>
        `;
    }

    async function loadMechAerolineasData() {
        const container = document.getElementById('table-mech-cat-aerolineas-container');
        if (!container) return;
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando aerolíneas...</div>';
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data, error } = await supabase
                .from('airlines')
                .select('id,name,iata,icao,logo_url,types')
                .order('name', { ascending: true });
            if (error) throw error;
            // Solo pasajeros: incluyen nacional o internacional
            _mechAerolineasAll = (data || []).filter(a =>
                (a.types || []).some(t => t === 'nacional' || t === 'internacional')
            );
            hasLoadedMechAerolineas = true;
            mechCatAerolineasApply();
        } catch (err) {
            console.error('Error loading Aerolíneas:', err);
            if (container) container.innerHTML = `<div class="alert alert-danger m-3">Error al cargar: ${err.message}</div>`;
        }
    }

    function mechCatAerolineasApply() {
        const q = (document.getElementById('mech-cat-aerolineas-search')?.value || '').toLowerCase().trim();
        let rows = _mechAerolineasAll;
        if (_mechAerolineasFilter !== 'all') rows = rows.filter(a => (a.types||[]).includes(_mechAerolineasFilter));
        if (q) rows = rows.filter(a => [a.name,a.iata,a.icao].join(' ').toLowerCase().includes(q));
        renderMechAerolineas(rows);
    }

    window.mechCatAerolineasFilter = mechCatAerolineasApply;

    window.mechCatAerolineasSetFilter = function (f, btn) {
        _mechAerolineasFilter = f;
        document.querySelectorAll('#subpane-mech-cat-aerolineas .btn-group .btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        mechCatAerolineasApply();
    };

    // Silent prefetch of aeropuertos table for autocomplete in Aerocares form
    async function ensureAirportDataSilent() {
        if (window._aeropuertosData?.length) return;
        try {
            const supabase = await window.ensureSupabaseClient();
            const { data, error } = await supabase.from('aeropuertos').select('*').order('iata', { ascending: true });
            if (!error && data?.length) window._aeropuertosData = data;
        } catch (_) {}
    }

    // Airline search autocomplete — attach to an input element by ID
    window.initAirlineSearchInput = function (inputId) {
        const input    = document.getElementById(inputId);
        const dropdown = document.getElementById('ao-airline-dropdown');
        const info     = document.getElementById('ao-airline-info');
        if (!input || !dropdown) return;

        const GURL = iata => `https://www.gstatic.com/flights/airline_logos/70px/${iata}.png`;
        const esc  = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        function typeColor(t) { return t === 'nacional' ? '#16a34a' : '#1d4ed8'; }

        function showInfo(a) {
            if (!info) return;
            if (!a) { info.innerHTML = ''; return; }
            const types = (a.types || []).filter(t => t === 'nacional' || t === 'internacional');
            const badges = types.map(t =>
                `<span style="background:${typeColor(t)};color:#fff;border-radius:3px;padding:0 5px;font-size:.58rem;margin-right:3px">${esc(t)}</span>`
            ).join('');
            info.innerHTML = `${badges}<strong style="color:#1e3a5f">${esc(a.icao || a.iata)}</strong>&nbsp;—&nbsp;${esc(a.name)}`;
        }

        async function getAirlineData() {
            if (window._mechAerolineasAll?.length) return window._mechAerolineasAll;
            try {
                const sb = await window.ensureSupabaseClient();
                const { data, error } = await sb.from('airlines').select('id,name,iata,icao,logo_url,types').order('name');
                if (!error && data) {
                    window._mechAerolineasAll = data.filter(a =>
                        (a.types || []).some(t => t === 'nacional' || t === 'internacional')
                    );
                }
            } catch (_) {}
            return window._mechAerolineasAll || [];
        }

        function renderDropdown(rows) {
            if (!rows.length) { dropdown.style.display = 'none'; return; }
            dropdown.innerHTML = rows.slice(0, 10).map(a => {
                const logoSrc = a.logo_url || (a.iata ? GURL(a.iata) : '');
                const logoHtml = logoSrc
                    ? `<img src="${esc(logoSrc)}" alt="" style="width:36px;height:22px;object-fit:contain" onerror="this.style.display='none'">`
                    : `<span style="width:36px;height:22px;display:inline-flex;align-items:center;justify-content:center"><i class="fas fa-plane" style="font-size:.7rem;color:#9ca3af"></i></span>`;
                const types = (a.types || []).filter(t => t === 'nacional' || t === 'internacional');
                const badges = types.map(t =>
                    `<span style="background:${typeColor(t)};color:#fff;border-radius:3px;padding:0 4px;font-size:.55rem">${esc(t)}</span>`
                ).join(' ');
                return `<div class="ao-al-opt" data-icao="${esc(a.icao || a.iata)}"
                    style="padding:6px 10px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px;transition:background .1s">
                    <div style="flex-shrink:0;width:38px;text-align:center">${logoHtml}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div>
                        <div style="display:flex;gap:5px;align-items:center;margin-top:1px">
                            ${a.icao ? `<code style="background:#e9ecef;padding:0 5px;border-radius:3px;font-size:.7rem">${esc(a.icao)}</code>` : ''}
                            ${a.iata ? `<code style="background:#f1f5f9;padding:0 4px;border-radius:3px;font-size:.65rem;color:#6b7280">IATA: ${esc(a.iata)}</code>` : ''}
                            ${badges}
                        </div>
                    </div>
                </div>`;
            }).join('');
            dropdown.style.display = 'block';
            dropdown.querySelectorAll('.ao-al-opt').forEach(el => {
                el.addEventListener('mouseenter', () => el.style.background = '#eff6ff');
                el.addEventListener('mouseleave', () => el.style.background = '');
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    const icao = el.dataset.icao;
                    input.value = icao;
                    dropdown.style.display = 'none';
                    const row = (window._mechAerolineasAll || []).find(a => (a.icao || a.iata) === icao);
                    showInfo(row);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
        }

        input.addEventListener('input', async () => {
            const q = input.value.trim().toUpperCase();
            if (!q) { dropdown.style.display = 'none'; showInfo(null); return; }
            const data = await getAirlineData();
            const matches = data.filter(a =>
                (a.icao  && a.icao.toUpperCase().includes(q)) ||
                (a.name  && a.name.toUpperCase().includes(q)) ||
                (a.iata  && a.iata.toUpperCase().includes(q))
            ).sort((a, b) =>
                (a.icao?.toUpperCase().startsWith(q) ? 0 : 1) -
                (b.icao?.toUpperCase().startsWith(q) ? 0 : 1)
            );
            renderDropdown(matches);
            if (q.length >= 3) {
                const exact = data.find(a => a.icao?.toUpperCase() === q);
                showInfo(exact || null);
            } else {
                showInfo(null);
            }
        });

        input.addEventListener('blur',    () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
        input.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
    };

    // Airport search autocomplete — attach to an input element by ID
    window.initAirportSearchInput = function (inputId) {
        const input    = document.getElementById(inputId);
        const dropdown = document.getElementById('ao-airport-dropdown');
        const info     = document.getElementById('ao-airport-info');
        if (!input || !dropdown) return;

        function esc(v) {
            return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function showInfo(r) {
            if (!info) return;
            if (!r) { info.innerHTML = ''; return; }
            const badge = r.tipo
                ? `<span style="background:${r.tipo==='Domestic'?'#0891b2':'#1d4ed8'};color:#fff;border-radius:3px;padding:0 5px;font-size:.58rem;margin-right:4px">${esc(r.tipo)}</span>`
                : '';
            info.innerHTML = `${badge}<strong style="color:#1e3a5f">${esc(r.iata)}</strong>&nbsp;${esc(r.nombre)}${r.ciudad ? ' &middot; ' + esc(r.ciudad) : ''}`;
        }

        async function loadAirportData() {
            if (window._aeropuertosData?.length) return;
            try {
                const sb = await window.ensureSupabaseClient();
                const { data, error } = await sb.from('aeropuertos').select('*').order('iata', { ascending: true });
                if (!error && data?.length) window._aeropuertosData = data;
            } catch (_) {}
        }

        function renderDropdown(rows) {
            if (!rows.length) { dropdown.style.display = 'none'; return; }
            dropdown.innerHTML = rows.slice(0, 10).map(r => {
                const ciudad = r.ciudad ? esc(r.ciudad) : '';
                const pais   = r.pais && r.pais !== r.ciudad ? ' &middot; ' + esc(r.pais) : '';
                return `<div class="ao-ap-opt" data-iata="${esc(r.iata)}"
                    style="padding:7px 11px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:9px;transition:background .1s">
                    <span style="background:#1e3a5f;color:#fff;border-radius:4px;padding:1px 7px;font-size:.68rem;font-weight:700;min-width:34px;text-align:center;flex-shrink:0">${esc(r.iata)}</span>
                    <span style="flex:1;font-size:.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111">${esc(r.nombre)}<span style="color:#9ca3af;margin-left:5px">${ciudad}${pais}</span></span>
                </div>`;
            }).join('');
            dropdown.style.display = 'block';
            dropdown.querySelectorAll('.ao-ap-opt').forEach(el => {
                el.addEventListener('mouseenter', () => el.style.background = '#eff6ff');
                el.addEventListener('mouseleave', () => el.style.background = '');
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    const iata = el.dataset.iata;
                    input.value = iata;
                    dropdown.style.display = 'none';
                    const row = (window._aeropuertosData || []).find(r => r.iata === iata);
                    showInfo(row);
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
        }

        input.addEventListener('input', async () => {
            const q = input.value.trim().toUpperCase();
            if (!q) { dropdown.style.display = 'none'; showInfo(null); return; }
            await loadAirportData();
            const data = window._aeropuertosData || [];
            const matches = data.filter(r =>
                (r.iata  && r.iata.toUpperCase().startsWith(q)) ||
                (r.nombre && r.nombre.toUpperCase().includes(q)) ||
                (r.ciudad && r.ciudad.toUpperCase().includes(q))
            ).sort((a, b) =>
                (a.iata?.toUpperCase().startsWith(q) ? 0 : 1) -
                (b.iata?.toUpperCase().startsWith(q) ? 0 : 1)
            );
            renderDropdown(matches);
            if (q.length === 3) {
                const exact = data.find(r => r.iata?.toUpperCase() === q);
                showInfo(exact || null);
            } else {
                showInfo(null);
            }
        });

        input.addEventListener('blur',    () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
        input.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
    };

    // Silent background pre-fetch (no UI update, just populates window._aerocaresCatalogData)
    async function loadAerocaresDataSilent() {
        if (window._aerocaresCatalogData) return; // already loaded
        try {
            const supabase = await window.ensureSupabaseClient();
            for (const tbl of ['Aerocares', 'aerocares']) {
                const res = await supabase.from(tbl).select('*');
                if (!res.error && res.data?.length) {
                    window._aerocaresCatalogData = res.data;
                    document.dispatchEvent(new CustomEvent('aerocaresCatalogLoaded', { detail: res.data }));
                    return;
                }
            }
        } catch (_) {}
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
