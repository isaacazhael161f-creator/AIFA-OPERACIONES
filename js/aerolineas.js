let aeroDataCache = null;

async function loadAerolineasDashboard() {
    console.log('[loadAerolineas] Iniciando carga de aerolíneas...');

    // UI elements
    const tblBody = document.getElementById('aero-table-body');
    const searchInput = document.getElementById('aero-search');

    if(!tblBody) return; // Not on page

    tblBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos...</td></tr>';

    try {
        // Use an anon-only client (no auth session) so RLS treats this as the
        // 'anon' role.  The Aerolíneas table allows anon SELECT but blocks
        // authenticated sessions that lack an explicit RLS policy.
        const _url = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
        const _key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';
        let client;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            client = window.supabase.createClient(_url, _key, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });
        } else {
            client = window.supabaseClient;
            if (!client && typeof window.ensureSupabaseClient === 'function') {
                client = await window.ensureSupabaseClient();
            }
        }
        if (!client) throw new Error('Cliente Supabase no disponible');

        // Fetch using the new table 'Aerolíneas'
        const { data, error } = await client.from('Aerol\u00edneas').select('*');
        if (error) throw error;

        const finalData = [];

        // Normalize data
        (data || []).forEach(row => {
            let rawNombre = row['AEROLINEA'] || row['AEROLINEA '] || 'Desconocida';
            
            // Agregar acentos faltantes a los nombres
            rawNombre = rawNombre.replace(/\bAEROUNION\b/gi, 'AEROUNIÓN')
                                 .replace(/\bAEROLINEAS\b/gi, 'AEROLÍNEAS')
                                 .replace(/\bAEROLINEA\b/gi, 'AEROLÍNEA')
                                 .replace(/\bAEREO\b/gi, 'AÉREO')
                                 .replace(/\bMAS DE CARGA\b/gi, 'MÁS DE CARGA')
                                 .replace(/\bCOMPANIA\b/gi, 'COMPAÑÍA')
                                 .replace(/\bCOMPAÑIA\b/gi, 'COMPAÑÍA')
                                 .replace(/\bMEXICO\b/gi, 'MÉXICO');

            const record = {
                no: row['No.'] || row['NO.'] || '',
                nombre: rawNombre,
                servicio: row['TIPO DE SERVICIO'] || 'N/A',
                monthlyOps: {}
            };

            // Extract all monthly data (keys like 'ene-23', 'feb-23', etc)
            Object.keys(row).forEach(key => {
                if(key.includes('-23') || key.includes('-24') || key.includes('-25') || key.includes('-26')) {
                    record.monthlyOps[key] = parseFloat(row[key]) || 0;
                }
            });

            finalData.push(record);
        });

        // Sort alphabetically by name
        finalData.sort((a, b) => a.nombre.toString().localeCompare(b.nombre));

        // Update cache
        aeroDataCache = finalData;

        // Clear search
        if(searchInput) searchInput.value = '';

        // Apply filters & render
        applyAeroFilters();

    } catch (err) {
        console.error('Error al cargar aerolíneas:', err);
        const msg = err?.message || err?.error_description || String(err);
        tblBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error al consultar base de datos.<br><small class="text-muted">${msg}</small></td></tr>`;
    }
}

function applyAeroFilters() {
    if(!aeroDataCache) return;

    // Determine selected year (all, 23, 24, 25, 26)
    const yearRadios = document.getElementsByName('aeroYear');
    let selectedYear = 'all';
    for(const radio of yearRadios) {
        if(radio.checked) {
            selectedYear = radio.value;
            break;
        }
    }

    // Determine selected month 
    const monthSelect = document.getElementById('aero-month-filter');
    let selectedMonth = 'all';
    if (monthSelect) {
        if (selectedYear === 'all') {
            monthSelect.style.display = 'none';
        } else {
            monthSelect.style.display = 'block';
            selectedMonth = monthSelect.value;
        }
    }

    // Determine search term
    const searchInput = document.getElementById('aero-search');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const processedData = [];
    let totalRegulares = 0;
    let totalFletamento = 0;
    let totalMensual = 0;
    let sumTotalOpsAllAirlines = 0;

    aeroDataCache.forEach(item => {
        let opSum = 0;
        let activeMonths = {};

        if(selectedYear === 'all') {
            opSum = Object.values(item.monthlyOps).reduce((a, b) => a + b, 0);
            activeMonths = {...item.monthlyOps};
        } else {
            Object.keys(item.monthlyOps).forEach(k => {
                if(k.endsWith('-' + selectedYear)) {
                    if (selectedMonth === 'all' || k.startsWith(selectedMonth + '-')) {
                        opSum += item.monthlyOps[k];
                    }
                    if (item.monthlyOps[k] > 0 && (selectedMonth === 'all' || k.startsWith(selectedMonth + '-'))) {
                        activeMonths[k] = item.monthlyOps[k];
                    }
                }
            });
        }

        // An airline is considered to have operated if its opSum > 0
        if(opSum > 0) {
            // Apply search filter
            if(term === '' || 
               item.nombre.toLowerCase().includes(term) || 
               item.servicio.toLowerCase().includes(term)) {
                
                if (selectedYear === 'all') {
                    Object.keys(activeMonths).forEach(m => {
                        if(activeMonths[m] === 0) delete activeMonths[m];
                    });
                }

                processedData.push({
                    ...item,
                    currentOps: opSum,
                    activeMonths: activeMonths
                });

                sumTotalOpsAllAirlines += opSum;

                // Tally KPIs
                const serv = item.servicio.toUpperCase();
                if(serv.includes('REGULAR')) {
                    totalRegulares++;
                } else if(serv.includes('MENSUAL')) {
                    totalMensual++;
                } else if(serv.includes('FLETAMENTO')) {
                    totalFletamento++;
                }
            }
        }
    });

    // Update KPI UI
    const elTotalOps = document.getElementById('aero-kpi-total-ops');
    if(elTotalOps) elTotalOps.textContent = sumTotalOpsAllAirlines.toLocaleString();

    document.getElementById('aero-kpi-total').textContent = processedData.length;
    document.getElementById('aero-kpi-regulares').textContent = totalRegulares;
    document.getElementById('aero-kpi-fletamento').textContent = totalFletamento;
    document.getElementById('aero-kpi-mensual').textContent = totalMensual;

    // Update ops col title
    const opsTitle = document.getElementById('aero-ops-title');
    if(opsTitle) {
        if (selectedYear === 'all') {
            opsTitle.textContent = '(Histórico)';
        } else {
            opsTitle.textContent = '(Año 20' + selectedYear + (selectedMonth !== 'all' ? ' - ' + monthSelect.options[monthSelect.selectedIndex].text : '') + ')';
        }
    }

    // Ordenar por quien tuvo mas operaciones de mas a menos
    processedData.sort((a, b) => b.currentOps - a.currentOps);

    renderAirlinesTable(processedData);
}

function filterAirlinesTable() {
    applyAeroFilters();
}

function renderAirlinesTable(data) {
    const tblBody = document.getElementById('aero-table-body');
    if(!tblBody) return;

    if(!data || data.length === 0) {
        tblBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fas fa-info-circle me-2"></i>No se encontraron aerolíneas para este periodo.</td></tr>';
        return;
    }

    tblBody.innerHTML = '';

    const monthOrder = { 'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12 };

    data.forEach((item, index) => {
        let badgeClass = 'bg-secondary';
        const serv = item.servicio.toUpperCase();
        
        if(serv.includes('REGULAR')) badgeClass = 'bg-success';
        else if(serv.includes('MENSUAL')) badgeClass = 'bg-dark';
        else if(serv.includes('FLETAMENTO')) badgeClass = 'bg-warning text-dark';

        const styleOverride = serv.includes('MENSUAL') ? 'style="background-color: #6f42c1 !important;"' : '';

        // Add medal or rank styling for top 3
        let indexDisplay = `<span class="text-secondary fw-bold">${index + 1}</span>`;
        if (index === 0) {
            indexDisplay = `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width: 28px; height: 28px; background: linear-gradient(45deg, #ffd700, #ffb300); color: #fff; box-shadow: 0 2px 4px rgba(255,215,0,0.3);"><i class="fas fa-trophy fs-6"></i></span>`;
        } else if (index === 1) {
            indexDisplay = `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width: 28px; height: 28px; background: linear-gradient(45deg, #e0e0e0, #9e9e9e); color: #fff; box-shadow: 0 2px 4px rgba(158,158,158,0.3);"><i class="fas fa-medal fs-6"></i></span>`;
        } else if (index === 2) {
            indexDisplay = `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width: 28px; height: 28px; background: linear-gradient(45deg, #cd7f32, #b87333); color: #fff; box-shadow: 0 2px 4px rgba(205,127,50,0.3);"><i class="fas fa-medal fs-6"></i></span>`;
        }

        let monthsHtml = '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center align-middle ps-4" style="width: 80px;">${indexDisplay}</td>
            <td class="fw-bold text-dark fs-6 align-middle py-3">
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded p-2 me-3 text-center border mt-1" style="min-width: 42px;">
                        <i class="fas fa-plane text-primary opacity-75"></i>
                    </div>
                    <div>
                        <div class="mb-0 text-uppercase" style="letter-spacing: 0.5px;">${item.nombre}</div>
                    </div>
                </div>
            </td>
            <td class="align-middle"><span class="badge ${badgeClass} px-3 py-2 rounded-pill fw-normal" ${styleOverride}>${item.servicio}</span></td>
            <td class="text-end align-middle pe-4">
                <div class="d-inline-flex flex-column text-end">
                    <span class="fs-4 fw-black text-dark tracking-tight">${item.currentOps.toLocaleString()}</span>
                    <span class="small text-muted text-uppercase fw-semibold" style="font-size: 0.65rem; letter-spacing: 0.5px;">Operaciones</span>
                </div>
            </td>
        `;
        tblBody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Load on click
    document.querySelectorAll('.menu-item[data-section="aerolineas"]').forEach(el => {
        el.addEventListener('click', () => {
            if(!aeroDataCache) {
                loadAerolineasDashboard();
            }
        });
    });

    // Also load when the section becomes visible (e.g. direct URL hash or programmatic showSection)
    const aeroSection = document.getElementById('aerolineas-section');
    if (aeroSection && typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
            if (aeroSection.classList.contains('active') && !aeroDataCache) {
                loadAerolineasDashboard();
            }
        }).observe(aeroSection, { attributes: true, attributeFilter: ['class'] });
    }

    document.querySelectorAll('.aero-year-filter').forEach(radio => {
        radio.addEventListener('change', () => {
            const monthSelect = document.getElementById('aero-month-filter');
            if (monthSelect) monthSelect.value = 'all';
            applyAeroFilters();
        });
    });
});
