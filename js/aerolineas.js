let aeroDataCache = null;
let aeroDetailChart = null;
let aeroSelectedRow = null;
let aeroGroupFilter = 'all'; // 'all' | 'pax' | 'cargo'

const AERO_MONTH_ORDER = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const AERO_MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const AERO_YEAR_COLORS = { '23':'#06b3e8', '24':'#4caf50', '25':'#2196f3', '26':'#e91e63' };

function closeAeroDetail() {
    const panel = document.getElementById('aero-detail-panel');
    if (panel) panel.classList.add('d-none');
    if (aeroDetailChart) { aeroDetailChart.destroy(); aeroDetailChart = null; }
    if (aeroSelectedRow) { aeroSelectedRow.classList.remove('table-active'); aeroSelectedRow = null; }
}

function openAeroDetail(item) {
    const panel = document.getElementById('aero-detail-panel');
    const titleEl = document.getElementById('aero-detail-title');
    const canvas = document.getElementById('aero-detail-chart');
    if (!panel || !canvas) return;

    titleEl.innerHTML = '<i class="fas fa-chart-line me-2 text-primary"></i>' + item.nombre
        + ' <span class="text-muted fw-normal fs-6 ms-2">— Evolución mensual de operaciones</span>';

    // Group monthlyOps by year
    const byYear = {};
    Object.entries(item.monthlyOps).forEach(([key, val]) => {
        const match = /^([a-z]+)-(\d{2})$/.exec(key);
        if (!match) return;
        const [, mon, yr] = match;
        if (!byYear[yr]) byYear[yr] = {};
        byYear[yr][mon] = val;
    });

    const years = Object.keys(byYear).sort();
    const datasets = years.map(yr => {
        const col = AERO_YEAR_COLORS[yr] || '#78909c';
        const last = yr === years[years.length - 1];
        // Use null for missing or zero-value months so the line ends at the last real data point
        const dataPoints = AERO_MONTH_ORDER.map(m => {
            const v = byYear[yr][m];
            return (v !== undefined && v !== null && v > 0) ? v : null;
        });
        return {
            label: '20' + yr,
            data: dataPoints,
            borderColor: col,
            backgroundColor: last ? col + '18' : col + '08',
            borderWidth: last ? 3 : 2,
            pointRadius: last ? 4 : 2,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff',
            pointBorderColor: col,
            pointBorderWidth: 2,
            fill: last,
            tension: 0.4,
            spanGaps: true
        };
    });

    if (aeroDetailChart) { aeroDetailChart.destroy(); aeroDetailChart = null; }

    aeroDetailChart = new Chart(canvas, {
        type: 'line',
        data: { labels: AERO_MONTH_LABELS, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeInOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                itemSort: function(a, b){ return b.datasetIndex - a.datasetIndex; },
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 10, padding: 14, font: { family: "'Inter','Segoe UI',sans-serif", size: 12, weight: '600' }, color: '#334155' } },
                tooltip: {
                    itemSort: function(a, b){ return b.datasetIndex - a.datasetIndex; },
                    backgroundColor: 'rgba(30,41,59,0.95)', titleColor: '#f1f5f9', bodyColor: '#e2e8f0',
                    borderColor: '#475569', borderWidth: 1, padding: 12, boxPadding: 6,
                    usePointStyle: true, cornerRadius: 8,
                    callbacks: {
                        title: function(c){ return '📅 ' + c[0].label; },
                        label: function(c){ return (c.dataset.label ? c.dataset.label + ': ' : '') + (c.parsed.y !== null ? '✈️ ' + new Intl.NumberFormat('es-MX').format(c.parsed.y) + ' ops' : '–'); }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } },
                y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9', borderDash: [4, 4] },
                    ticks: { color: '#94a3b8', padding: 8, font: { size: 11 }, callback: function(v){ return v >= 1000 ? (v/1000).toFixed(0)+'k' : v; } } }
            }
        }
    });

    panel.classList.remove('d-none');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Render variation table
    const tblEl = document.getElementById('aero-detail-table');
    if (!tblEl) return;
    const thead = tblEl.querySelector('thead');
    const tbody = tblEl.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const CELL_BORDER = 'border-bottom:1px solid #e4eaf0;';
    const COL_W = years.length <= 2 ? '200px' : years.length <= 3 ? '160px' : '140px';

    // Header row — matches screenshot: gray bg, bold, "Periodo" left / years centered
    const hRow = document.createElement('tr');
    hRow.style.cssText = 'background:#dde3ea;';
    hRow.innerHTML = '<th style="width:110px;font-weight:700;color:#374151;padding:13px 18px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.4px;'+CELL_BORDER+'">Periodo</th>'
        + years.map(function(yr) {
            return '<th style="text-align:center;font-weight:700;color:#1e293b;padding:13px 18px;font-size:0.97rem;min-width:'+COL_W+';'+CELL_BORDER+'">20'+yr+'</th>';
        }).join('');
    thead.appendChild(hRow);

    // Helper: get value (null if no entry for that month/year)
    function getVal(yr, mon) {
        if (!byYear[yr]) return null;
        const v = byYear[yr][mon];
        return (v !== undefined && v !== null) ? v : null;
    }

    // Variation badge — inline small ▲/▼ + %
    function varBadge(val, pv) {
        if (pv === null) return '';
        if (pv === 0 && val > 0) return ' <span style="font-size:0.73em;color:#16a34a;font-weight:700;">▲ nuevo</span>';
        if (pv === 0) return '';
        const g = ((val - pv) / pv) * 100;
        const pos = g >= 0;
        const color = pos ? '#16a34a' : '#dc2626';
        const arrow = pos ? '▲' : '▼';
        return ' <span style="font-size:0.73em;color:'+color+';font-weight:700;">'+arrow+' '+Math.abs(g).toFixed(1)+'%</span>';
    }

    // One row per month — alternating colors matching screenshot
    AERO_MONTH_ORDER.forEach(function(mon, mIdx) {
        const tr = document.createElement('tr');
        // Odd rows (0,2,4…) = light blue-tinted; even rows = white — same as screenshot
        const rowBg = (mIdx % 2 === 0) ? '#edf2f7' : '#ffffff';
        tr.style.cssText = 'background:'+rowBg+';';
        let html = '<td style="font-weight:600;color:#4b5563;padding:11px 18px;font-size:0.92rem;'+CELL_BORDER+'">'+AERO_MONTH_LABELS[mIdx]+'</td>';
        years.forEach(function(yr, idx) {
            const val = getVal(yr, mon);
            // Treat null OR zero as "sin datos" — avoids showing ▼100% for months without records
            if (val === null || val === 0) {
                html += '<td style="text-align:center;color:#94a3b8;padding:11px 18px;font-size:0.93rem;'+CELL_BORDER+'">–</td>';
                return;
            }
            let badge = '';
            if (idx > 0) {
                const prevVal = getVal(years[idx - 1], mon);
                // Only show variation badge when both current and previous have real data (> 0)
                if (prevVal !== null && prevVal > 0) {
                    badge = varBadge(val, prevVal);
                } else if (prevVal === 0 || prevVal === null) {
                    badge = ' <span style="font-size:0.73em;color:#16a34a;font-weight:700;">▲ nuevo</span>';
                }
            }
            html += '<td style="text-align:center;padding:11px 18px;font-size:0.93rem;color:#1e293b;'+CELL_BORDER+'">'+new Intl.NumberFormat('es-MX').format(val)+badge+'</td>';
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    // TOTAL row — comparable: only months where current year has data
    const tfRow = document.createElement('tr');
    tfRow.style.cssText = 'background:#dde3ea;border-top:2px solid #c5cdd6;';
    let totHtml = '<td style="font-weight:800;color:#111827;padding:13px 18px;font-size:0.93rem;text-transform:uppercase;letter-spacing:0.5px;">TOTAL</td>';

    years.forEach(function(yr, idx) {
        let fullTotal = 0;
        AERO_MONTH_ORDER.forEach(function(mon) {
            const v = getVal(yr, mon);
            if (v !== null) fullTotal += v;
        });

        let pct = '';
        if (idx > 0) {
            const prevYr = years[idx - 1];
            let curSum = 0, prevSum = 0, hasPrev = false;
            AERO_MONTH_ORDER.forEach(function(mon) {
                const curV = getVal(yr, mon);
                const prevV = getVal(prevYr, mon);
                // Only count months where current year actually has data (> 0)
                // This makes the total variation proportional to the available months
                if (curV !== null && curV > 0) {
                    curSum += curV;
                    if (prevV !== null && prevV > 0) { prevSum += prevV; hasPrev = true; }
                }
            });
            if (hasPrev && prevSum > 0) {
                const g = ((curSum - prevSum) / prevSum) * 100;
                const pos = g >= 0;
                const color = pos ? '#16a34a' : '#dc2626';
                const icon = pos ? 'fa-arrow-up' : 'fa-arrow-down';
                pct = '<br><span style="font-size:0.78em;color:'+color+';font-weight:700;"><i class="fas '+icon+'" style="font-size:0.75em;margin-right:2px;"></i>'+Math.abs(g).toFixed(1)+'%</span>';
            }
        }
        totHtml += '<td style="text-align:center;font-weight:800;font-size:0.97rem;color:#111827;padding:13px 18px;">'+new Intl.NumberFormat('es-MX').format(fullTotal)+pct+'</td>';
    });
    tfRow.innerHTML = totHtml;
    tbody.appendChild(tfRow);
}

async function loadAerolineasDashboard() {
    console.log('[loadAerolineas] Iniciando carga de aerolíneas...');

    // UI elements
    const tblBody = document.getElementById('aero-table-body');
    const searchInput = document.getElementById('aero-search');

    if(!tblBody) return; // Not on page

    tblBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i>Cargando datos...</td></tr>';

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
        tblBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error al consultar base de datos.<br><small class="text-muted">${msg}</small></td></tr>`;
    }
}

function applyAeroFilters() {
    if(!aeroDataCache) return;
    closeAeroDetail();

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

    // Apply group filter
    let filtered = processedData;
    if (aeroGroupFilter === 'pax') {
        filtered = processedData.filter(d => d.servicio.toUpperCase().includes('PASAJERO'));
    } else if (aeroGroupFilter === 'cargo') {
        filtered = processedData.filter(d => !d.servicio.toUpperCase().includes('PASAJERO'));
    }

    renderAirlinesTable(filtered);
}

function filterAirlinesTable() {
    applyAeroFilters();
}

function renderAirlinesTable(data) {
    const tblBody = document.getElementById('aero-table-body');
    if(!tblBody) return;

    if(!data || data.length === 0) {
        tblBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><i class="fas fa-info-circle me-2"></i>No se encontraron aerolíneas para este periodo.</td></tr>';
        return;
    }

    tblBody.innerHTML = '';

    // Split into passengers and cargo groups
    const paxGroup   = data.filter(d => d.servicio.toUpperCase().includes('PASAJERO'));
    const cargoGroup = data.filter(d => !d.servicio.toUpperCase().includes('PASAJERO'));

    function buildRankDisplay(index) {
        if (index === 0) return `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width:28px;height:28px;background:linear-gradient(45deg,#ffd700,#ffb300);color:#fff;box-shadow:0 2px 4px rgba(255,215,0,0.3);"><i class="fas fa-trophy fs-6"></i></span>`;
        if (index === 1) return `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width:28px;height:28px;background:linear-gradient(45deg,#e0e0e0,#9e9e9e);color:#fff;box-shadow:0 2px 4px rgba(158,158,158,0.3);"><i class="fas fa-medal fs-6"></i></span>`;
        if (index === 2) return `<span class="badge rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width:28px;height:28px;background:linear-gradient(45deg,#cd7f32,#b87333);color:#fff;box-shadow:0 2px 4px rgba(205,127,50,0.3);"><i class="fas fa-medal fs-6"></i></span>`;
        return `<span class="text-secondary fw-bold">${index + 1}</span>`;
    }

    function buildSectionHeader(label, iconClass, colorClass, totalOps, opsTitle) {
        const sep = document.createElement('tr');
        sep.style.cssText = 'pointer-events:none;';
        sep.innerHTML = `<td colspan="5" style="padding:10px 24px 6px;border-top:2px solid #e9ecef;background:#f8fafc;">
            <div class="d-flex align-items-center justify-content-between">
                <span class="fw-bold text-uppercase small d-flex align-items-center gap-2" style="letter-spacing:.8px;color:#374151;">
                    <span class="d-inline-flex align-items-center justify-content-center rounded-circle text-white ${colorClass}" style="width:26px;height:26px;font-size:.75rem;">
                        <i class="${iconClass}"></i>
                    </span>
                    ${label}
                </span>
                <span class="small text-muted fw-semibold">${totalOps.toLocaleString('en-US')} ops ${opsTitle}</span>
            </div>
        </td>`;
        return sep;
    }

    function appendGroup(group, tbl) {
        group.forEach((item, index) => {
            const serv = item.servicio.toUpperCase();
            let badgeClass = 'bg-secondary';
            if(serv.includes('REGULAR')) badgeClass = 'bg-success';
            else if(serv.includes('MENSUAL')) badgeClass = 'bg-dark';
            else if(serv.includes('FLETAMENTO')) badgeClass = 'bg-warning text-dark';
            const styleOverride = serv.includes('MENSUAL') ? 'style="background-color:#6f42c1!important;"' : '';

            const isSelected = aeroCompareItems.includes(item);
            const selStyle = isSelected ? 'background:#ede9fe!important;outline:2px solid #7c3aed;' : '';

            const tr = document.createElement('tr');
            tr.style.cssText = selStyle;
            tr.innerHTML = `
                <td class="text-center align-middle ps-4" style="width:80px;">
                    ${aeroCompareMode
                        ? `<span class="d-inline-flex align-items-center justify-content-center rounded-circle border-2"
                             style="width:28px;height:28px;border:2px solid ${isSelected?'#7c3aed':'#d1d5db'};
                             background:${isSelected?'#7c3aed':'#fff'};cursor:pointer;transition:all .15s;">
                             ${isSelected ? '<i class="fas fa-check" style="color:#fff;font-size:.7rem;"></i>' : ''}
                           </span>`
                        : buildRankDisplay(index)}
                </td>
                <td class="fw-bold text-dark fs-6 align-middle py-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded p-2 me-3 text-center border mt-1" style="min-width:42px;">
                            <i class="fas fa-plane text-primary opacity-75"></i>
                        </div>
                        <div><div class="mb-0 text-uppercase" style="letter-spacing:0.5px;">${item.nombre}</div></div>
                    </div>
                </td>
                <td class="align-middle"><span class="badge ${badgeClass} px-3 py-2 rounded-pill fw-normal" ${styleOverride}>${item.servicio}</span></td>
                <td class="text-end align-middle pe-4">
                    <div class="d-inline-flex flex-column text-end">
                        <span class="fs-4 fw-black text-dark tracking-tight">${item.currentOps.toLocaleString('en-US')}</span>
                        <span class="small text-muted text-uppercase fw-semibold" style="font-size:0.65rem;letter-spacing:0.5px;">Operaciones</span>
                    </div>
                </td>
                <td class="text-center align-middle pe-2" style="width:42px;">
                    ${aeroCompareMode
                        ? ''
                        : '<span class="text-primary opacity-50" style="font-size:0.8rem;"><i class="fas fa-chart-line"></i></span>'}
                </td>`;
            tr.style.cursor = 'pointer';
            tr.title = aeroCompareMode ? 'Seleccionar para comparar: ' + item.nombre : 'Clic para ver gráfica de ' + item.nombre;

            tr.addEventListener('click', function() {
                if (aeroCompareMode) {
                    // Toggle selection
                    const idx = aeroCompareItems.indexOf(item);
                    if (idx > -1) {
                        aeroCompareItems.splice(idx, 1);
                    } else {
                        if (aeroCompareItems.length >= 2) {
                            aeroCompareItems.shift(); // drop oldest
                        }
                        aeroCompareItems.push(item);
                    }
                    // Update counter
                    const counter = document.getElementById('aero-compare-count');
                    if (counter) counter.textContent = aeroCompareItems.length + ' seleccionada' + (aeroCompareItems.length !== 1 ? 's' : '');
                    // Update names in panel header
                    if (aeroCompareItems[0]) {
                        document.getElementById('aero-cmp-name-a').textContent = aeroCompareItems[0].nombre;
                        document.getElementById('aero-cmp-badge-a').textContent = aeroCompareItems[0].servicio;
                        document.getElementById('aero-cmp-badge-a').style.cssText = 'background:#dbeafe;color:#1d4ed8;font-size:.7rem;';
                    }
                    if (aeroCompareItems[1]) {
                        document.getElementById('aero-cmp-name-b').textContent = aeroCompareItems[1].nombre;
                        document.getElementById('aero-cmp-badge-b').textContent = aeroCompareItems[1].servicio;
                        document.getElementById('aero-cmp-badge-b').style.cssText = 'background:#fce7f3;color:#be185d;font-size:.7rem;';
                    }
                    // Re-render table rows to update checkboxes
                    applyAeroFilters();
                    // If 2 selected, show comparison
                    if (aeroCompareItems.length === 2) renderAeroCompare();
                } else {
                    if (aeroSelectedRow) aeroSelectedRow.classList.remove('table-active');
                    const panel = document.getElementById('aero-detail-panel');
                    const isSame = aeroSelectedRow === tr;
                    if (isSame && panel && !panel.classList.contains('d-none')) { closeAeroDetail(); return; }
                    aeroSelectedRow = tr;
                    tr.classList.add('table-active');
                    openAeroDetail(item);
                }
            });
            tbl.appendChild(tr);
        });
    }

    // Get the ops title text (e.g. "(Histórico)" or "(Año 2026)")
    const opsTitle = document.getElementById('aero-ops-title')?.textContent || '';
    const showBoth = paxGroup.length > 0 && cargoGroup.length > 0;

    // ── Pasajeros section ──────────────────────────────────────────────────
    if (paxGroup.length) {
        const paxTotal = paxGroup.reduce((s, d) => s + d.currentOps, 0);
        if (showBoth) tblBody.appendChild(buildSectionHeader('Aerolíneas de Pasajeros', 'fas fa-user', 'bg-primary', paxTotal, opsTitle));
        appendGroup(paxGroup, tblBody);
    }

    // ── Carga section ──────────────────────────────────────────────────────
    if (cargoGroup.length) {
        const cargoTotal = cargoGroup.reduce((s, d) => s + d.currentOps, 0);
        if (showBoth) tblBody.appendChild(buildSectionHeader('Aerolíneas de Carga', 'fas fa-box', 'bg-warning', cargoTotal, opsTitle));
        appendGroup(cargoGroup, tblBody);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Group filter buttons
    document.querySelectorAll('.aero-grp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset all buttons to their outline variant
            document.querySelectorAll('.aero-grp-btn').forEach(b => {
                b.classList.remove('active','btn-primary','btn-warning');
                b.classList.add(b.dataset.grp === 'cargo' ? 'btn-outline-warning' : 'btn-outline-primary');
            });
            // Activate the clicked button
            btn.classList.remove('btn-outline-primary','btn-outline-warning');
            btn.classList.add('active', btn.dataset.grp === 'cargo' ? 'btn-warning' : 'btn-primary');
            aeroGroupFilter = btn.dataset.grp;
            closeAeroDetail();
            applyAeroFilters();
        });
    });

    // Compare year selector buttons
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.aero-cmp-yr-btn');
        if (!btn) return;
        document.querySelectorAll('.aero-cmp-yr-btn').forEach(b => b.classList.remove('active','btn-secondary'));
        btn.classList.add('active');
        renderAeroCompare();
    });

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

/* ══════════════════════════════════════════════════════════════════════
   COMPARACIÓN DE AEROLÍNEAS
══════════════════════════════════════════════════════════════════════ */
let aeroCompareMode = false;
let aeroCompareItems = []; // max 2
let aeroCmpChart = null;

const AERO_CMP_COLORS = ['#2196f3', '#e91e63'];
const AERO_CMP_LABELS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function toggleAeroCompareMode() {
    aeroCompareMode = !aeroCompareMode;
    aeroCompareItems = [];
    const toggleBtn = document.getElementById('aero-compare-toggle');
    const bar = document.getElementById('aero-compare-bar');
    const panel = document.getElementById('aero-compare-panel');

    if (aeroCompareMode) {
        toggleBtn.style.background = '#7c3aed';
        toggleBtn.style.color = '#fff';
        toggleBtn.style.borderColor = '#7c3aed';
        bar.classList.remove('d-none');
        bar.style.display = 'flex';
        closeAeroDetail();
        panel.classList.add('d-none');
        // Re-render so rows get compare-mode behaviour
        applyAeroFilters();
    } else {
        toggleBtn.style.background = '';
        toggleBtn.style.color = '#7c3aed';
        toggleBtn.style.borderColor = '#7c3aed';
        bar.classList.add('d-none');
        applyAeroFilters();
    }
}

function closeAeroCompare() {
    const panel = document.getElementById('aero-compare-panel');
    if (panel) panel.classList.add('d-none');
    if (aeroCmpChart) { aeroCmpChart.destroy(); aeroCmpChart = null; }
    aeroCompareItems = [];
    aeroCompareMode = false;
    const toggleBtn = document.getElementById('aero-compare-toggle');
    if (toggleBtn) { toggleBtn.style.background = ''; toggleBtn.style.color = '#7c3aed'; toggleBtn.style.borderColor = '#7c3aed'; }
    const bar = document.getElementById('aero-compare-bar');
    if (bar) bar.classList.add('d-none');
    applyAeroFilters();
}

function _aeroGetByYear(item) {
    const byYear = {};
    Object.entries(item.monthlyOps).forEach(([key, val]) => {
        const match = /^([a-z]+)-(\d{2})$/.exec(key);
        if (!match) return;
        const [, mon, yr] = match;
        if (!byYear[yr]) byYear[yr] = {};
        byYear[yr][mon] = val;
    });
    return byYear;
}

function _aeroYearTotal(byYear, yr) {
    if (!byYear[yr]) return 0;
    return AERO_MONTH_ORDER.reduce((s, m) => {
        const v = byYear[yr][m];
        return s + ((v && v > 0) ? v : 0);
    }, 0);
}

function _aeroBestMonth(byYear, yr) {
    if (!byYear[yr]) return { label: '–', val: 0 };
    let best = { label: '–', val: 0 };
    AERO_MONTH_ORDER.forEach((m, i) => {
        const v = byYear[yr][m] || 0;
        if (v > best.val) best = { label: AERO_CMP_LABELS_ES[i], val: v };
    });
    return best;
}

function renderAeroCompare() {
    if (aeroCompareItems.length < 2) return;
    const [a, b] = aeroCompareItems;
    const byYearA = _aeroGetByYear(a);
    const byYearB = _aeroGetByYear(b);

    // Which year is selected?
    const yrBtn = document.querySelector('.aero-cmp-yr-btn.active');
    const selYr = yrBtn ? yrBtn.dataset.yr : 'all';

    // All years union
    const allYrs = [...new Set([...Object.keys(byYearA), ...Object.keys(byYearB)])].sort();
    const displayYrs = selYr === 'all' ? allYrs : [selYr];

    // ── Stats cards ──────────────────────────────────────────────────────────
    const statsEl = document.getElementById('aero-cmp-stats');
    function statVal(item, byr, label, color) {
        if (selYr === 'all') {
            const total = allYrs.reduce((s, y) => s + _aeroYearTotal(byr, y), 0);
            return { label: 'Total histórico', val: total.toLocaleString('en-US'), color };
        }
        const tot = _aeroYearTotal(byr, selYr);
        const best = _aeroBestMonth(byr, selYr);
        // YoY vs prev year
        const prevYr = String(parseInt(selYr, 10) - 1).slice(-2);
        const prev = _aeroYearTotal(byr, prevYr);
        let yoy = '';
        if (prev > 0) {
            const g = ((tot - prev) / prev * 100);
            yoy = `<span class="ms-2 fw-bold" style="color:${g>=0?'#16a34a':'#dc2626'};font-size:.78rem;">${g>=0?'▲':'▼'} ${Math.abs(g).toFixed(1)}% vs 20${prevYr}</span>`;
        }
        return { total: tot.toLocaleString('en-US'), best, yoy, color };
    }

    const sA = statVal(a, byYearA, a.nombre, AERO_CMP_COLORS[0]);
    const sB = statVal(b, byYearB, b.nombre, AERO_CMP_COLORS[1]);

    function cardHtml(item, s) {
        if (selYr === 'all') {
            return `<div class="col-md-6"><div class="card border-0 shadow-sm rounded-3 p-3" style="border-left:4px solid ${s.color}!important;">
                <div class="small text-muted fw-semibold text-uppercase mb-1" style="font-size:.7rem;letter-spacing:.6px;">${item.nombre}</div>
                <div class="fw-black fs-3" style="color:${s.color};">${s.val}</div>
                <div class="small text-muted">operaciones totales</div>
            </div></div>`;
        }
        return `<div class="col-md-6"><div class="card border-0 shadow-sm rounded-3 p-3" style="border-left:4px solid ${s.color}!important;">
            <div class="small text-muted fw-semibold text-uppercase mb-1" style="font-size:.7rem;letter-spacing:.6px;">${item.nombre} — 20${selYr}</div>
            <div class="d-flex align-items-baseline gap-2 flex-wrap">
                <span class="fw-black fs-3" style="color:${s.color};">${s.total}</span>
                ${s.yoy}
            </div>
            <div class="small text-muted mt-1">ops totales · mejor mes: <strong>${s.best.label} (${s.best.val.toLocaleString('en-US')})</strong></div>
        </div></div>`;
    }
    statsEl.innerHTML = cardHtml(a, sA) + cardHtml(b, sB);

    // ── Chart ────────────────────────────────────────────────────────────────
    if (aeroCmpChart) { aeroCmpChart.destroy(); aeroCmpChart = null; }
    const canvas = document.getElementById('aero-cmp-chart');

    const yearLineStyles = ['solid','dash','dot','longdash'];
    const datasets = [];
    displayYrs.forEach((yr, yi) => {
        const dash = yi === 0 ? [] : yi === 1 ? [6,3] : yi === 2 ? [2,3] : [10,4];
        [a, b].forEach((item, ci) => {
            const byr = ci === 0 ? byYearA : byYearB;
            const col = AERO_CMP_COLORS[ci];
            const data = AERO_MONTH_ORDER.map(m => {
                const v = byr[yr] ? byr[yr][m] : undefined;
                return (v !== undefined && v !== null && v > 0) ? v : null;
            });
            // Only add dataset if it has any data
            if (data.some(v => v !== null)) {
                datasets.push({
                    label: item.nombre + (displayYrs.length > 1 ? ' · 20' + yr : ''),
                    data,
                    borderColor: col,
                    backgroundColor: col + '14',
                    borderWidth: 2.5,
                    borderDash: dash,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: col,
                    pointBorderWidth: 2,
                    tension: 0.4,
                    spanGaps: true,
                    fill: false
                });
            }
        });
    });

    aeroCmpChart = new Chart(canvas, {
        type: 'line',
        data: { labels: AERO_CMP_LABELS_ES, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: { duration: 500, easing: 'easeInOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 10, padding: 12, font: { size: 12, weight: '600' }, color: '#334155' } },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.95)', titleColor: '#f1f5f9', bodyColor: '#e2e8f0',
                    borderColor: '#475569', borderWidth: 1, padding: 12, boxPadding: 5,
                    usePointStyle: true, cornerRadius: 8,
                    callbacks: {
                        title: c => '📅 ' + c[0].label,
                        label: c => (c.dataset.label || '') + ': ' + (c.parsed.y !== null ? '✈️ ' + c.parsed.y.toLocaleString('en-US') + ' ops' : '–')
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 12 } } },
                y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9', borderDash: [4,4] },
                    ticks: { color: '#94a3b8', padding: 8, font: { size: 11 }, callback: v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v } }
            }
        }
    });

    // ── Month comparison table ───────────────────────────────────────────────
    const thead = document.getElementById('aero-cmp-thead');
    const tbody = document.getElementById('aero-cmp-tbody');

    const hdrs = displayYrs.map(yr => {
        const yrLbl = '20' + yr;
        return `<th colspan="3" style="text-align:center;padding:10px 8px;font-size:.82rem;border-bottom:2px solid #e2e8f0;">${yrLbl}</th>`;
    });
    const subHdrs = displayYrs.map(() =>
        `<th style="text-align:center;padding:6px 8px;font-size:.72rem;color:${AERO_CMP_COLORS[0]};white-space:nowrap;">${a.nombre.split(' ')[0]}</th>` +
        `<th style="text-align:center;padding:6px 8px;font-size:.72rem;color:${AERO_CMP_COLORS[1]};white-space:nowrap;">${b.nombre.split(' ')[0]}</th>` +
        `<th style="text-align:center;padding:6px 8px;font-size:.72rem;color:#6b7280;">Dif.</th>`
    ).join('');

    thead.innerHTML = `<tr style="background:#f1f5f9;"><th style="padding:10px 12px;font-size:.82rem;font-weight:700;color:#374151;">Mes</th>${hdrs.join('')}</tr>
        <tr style="background:#f8fafc;"><th style="padding:6px 12px;font-size:.72rem;color:#6b7280;">Período</th>${subHdrs}</tr>`;

    let html = '';
    let totA = {}, totB = {};
    displayYrs.forEach(yr => { totA[yr] = 0; totB[yr] = 0; });

    AERO_MONTH_ORDER.forEach((mon, mIdx) => {
        const rowBg = mIdx % 2 === 0 ? '#f8fafc' : '#fff';
        html += `<tr style="background:${rowBg};">`;
        html += `<td style="padding:9px 12px;font-weight:600;color:#4b5563;font-size:.88rem;">${AERO_CMP_LABELS_ES[mIdx]}</td>`;
        displayYrs.forEach(yr => {
            const vA = (byYearA[yr] && byYearA[yr][mon] > 0) ? byYearA[yr][mon] : null;
            const vB = (byYearB[yr] && byYearB[yr][mon] > 0) ? byYearB[yr][mon] : null;
            if (vA) totA[yr] += vA;
            if (vB) totB[yr] += vB;
            const cellA = vA !== null ? `<span style="color:${AERO_CMP_COLORS[0]};font-weight:700;">${vA.toLocaleString('en-US')}</span>` : '<span style="color:#cbd5e1;">–</span>';
            const cellB = vB !== null ? `<span style="color:${AERO_CMP_COLORS[1]};font-weight:700;">${vB.toLocaleString('en-US')}</span>` : '<span style="color:#cbd5e1;">–</span>';
            let diff = '–', diffColor = '#6b7280';
            if (vA !== null && vB !== null) {
                const d = vA - vB;
                diff = (d >= 0 ? '+' : '') + d.toLocaleString('en-US');
                diffColor = d > 0 ? '#2196f3' : d < 0 ? '#e91e63' : '#6b7280';
            }
            html += `<td style="text-align:center;padding:9px 8px;font-size:.85rem;border-left:1px solid #f1f5f9;">${cellA}</td>`;
            html += `<td style="text-align:center;padding:9px 8px;font-size:.85rem;">${cellB}</td>`;
            html += `<td style="text-align:center;padding:9px 8px;font-size:.82rem;font-weight:600;color:${diffColor};">${diff}</td>`;
        });
        html += '</tr>';
    });

    // Total row
    html += `<tr style="background:#dde3ea;border-top:2px solid #c5cdd6;"><td style="padding:11px 12px;font-weight:800;font-size:.88rem;text-transform:uppercase;letter-spacing:.4px;">TOTAL</td>`;
    displayYrs.forEach(yr => {
        const ta = totA[yr], tb = totB[yr];
        const d = ta - tb;
        const diff = (d >= 0 ? '+' : '') + d.toLocaleString('en-US');
        const diffColor = d > 0 ? '#2196f3' : d < 0 ? '#e91e63' : '#6b7280';
        html += `<td style="text-align:center;padding:11px 8px;font-weight:800;font-size:.9rem;color:${AERO_CMP_COLORS[0]};border-left:1px solid #c5cdd6;">${ta.toLocaleString('en-US')}</td>`;
        html += `<td style="text-align:center;padding:11px 8px;font-weight:800;font-size:.9rem;color:${AERO_CMP_COLORS[1]};">${tb.toLocaleString('en-US')}</td>`;
        html += `<td style="text-align:center;padding:11px 8px;font-weight:800;font-size:.9rem;color:${diffColor};">${diff}</td>`;
    });
    html += '</tr>';

    tbody.innerHTML = html;

    // Show panel
    const panel = document.getElementById('aero-compare-panel');
    panel.classList.remove('d-none');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
