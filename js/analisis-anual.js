/**
 * Análisis Anual - Dashboard Module
 * Fetches data directly from Supabase 'parte_operations' table.
 */
(function() {
    let annualChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        const tabEl = document.getElementById('analisis-anual-pane');
        const triggerBtn = document.querySelector('button[data-bs-target="#analisis-anual-pane"]');
        
        const loadHandler = () => {
            // Instant load
            setTimeout(runAnnualAnalysis, 10); 
        };

        if (triggerBtn) triggerBtn.addEventListener('shown.bs.tab', loadHandler);
        
        const refreshBtn = document.getElementById('btn-refresh-annual');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', runAnnualAnalysis);
        }
    });

    async function runAnnualAnalysis() {
        if (!window.supabaseClient) {
            console.error('Supabase client not available.');
            return;
        }

        const chartCanvas = document.getElementById('ops-annual-averages-chart');
        if (chartCanvas) chartCanvas.style.opacity = '0.5';

        try {
            const { data, error } = await window.supabaseClient
                .from('parte_operations')
                .select('*')
                .order('fecha', { ascending: true });

            if (chartCanvas) chartCanvas.style.opacity = '1';

            if (error) throw error;

            if (!data || data.length === 0) {
                renderEmpty();
                return;
            }

            processAnnualData(data);

        } catch (error) {
            console.error('Error fetching annual data:', error);
            if (chartCanvas) chartCanvas.style.opacity = '1';
        }
    }

    function processAnnualData(data) {
        if (data.length === 0) return;

        // Find latest year
        const lastDate = data[data.length - 1].fecha; 
        const latestYear = parseInt(lastDate.split('-')[0], 10);

        // Filter for latest year
        const yearData = data.filter(d => parseInt(d.fecha.split('-')[0], 10) === latestYear);

        // 1. Calculate Monthly Totals for Chart/Table
        const montlyTotals = new Array(12).fill(0);
        const commercialTotals = new Array(12).fill(0);
        const generalTotals = new Array(12).fill(0);
        const cargoTotals = new Array(12).fill(0);

        // 2. Metrics for Cards
        let totalCommercial = 0;
        let totalCargo = 0;
        let totalGeneral = 0;
        let totalOps = 0;
        
        let maxDailyOps = 0;
        let maxDailyDate = '';
        let maxDailyBreakdown = { com:0, car:0, gen:0 };
        
        let maxComDailyOps = 0;
        let maxComDailyDate = '';
        let maxComDailyBreakdown = { com:0, car:0, gen:0 };

        yearData.forEach(row => {
            const parts = row.fecha.split('-');
            const monthIndex = parseInt(parts[1], 10) - 1; // 0-11
            
            // Safe parsing
            const com = (row.comercial_llegada||0) + (row.comercial_salida||0);
            const car = (row.carga_llegada||0) + (row.carga_salida||0);
            const gen = (row.general_llegada||0) + (row.general_salida||0);
            const total = (row.total_general !== undefined && row.total_general !== null) ? row.total_general : (com + car + gen);

            // Chart/Table Accumulators
            montlyTotals[monthIndex] += total;
            commercialTotals[monthIndex] += com;
            cargoTotals[monthIndex] += car;
            generalTotals[monthIndex] += gen;

            // Global Accumulators
            totalCommercial += com;
            totalCargo += car;
            totalGeneral += gen;
            totalOps += total;

            // Peak Day Logic
            if (total > maxDailyOps) {
                maxDailyOps = total;
                maxDailyDate = row.fecha;
                maxDailyBreakdown = { com, car, gen };
            }

            // Peak Commercial Logic
            if (com > maxComDailyOps) {
                maxComDailyOps = com;
                maxComDailyDate = row.fecha;
                maxComDailyBreakdown = { com, car, gen };
            }
        });

        // Determine months count (current month index + 1 if current year, else 12)
        const now = new Date();
        const monthsCount = (latestYear === now.getFullYear()) ? (now.getMonth() + 1) : 12;

        const avgs = {
            com: Math.round(totalCommercial / monthsCount),
            car: Math.round(totalCargo / monthsCount),
            gen: Math.round(totalGeneral / monthsCount),
            total: Math.round(totalOps / monthsCount),
            monthsCaught: monthsCount
        };

        const peaks = {
            general: {
                val: maxDailyOps,
                date: maxDailyDate,
                breakdown: maxDailyBreakdown
            },
            commercial: {
                val: maxComDailyOps,
                date: maxComDailyDate,
                breakdown: maxComDailyBreakdown
            }
        };

        renderCards(avgs, peaks, latestYear);
        renderChart(montlyTotals, commercialTotals, cargoTotals, generalTotals, latestYear);
        renderTable(montlyTotals, commercialTotals, cargoTotals, generalTotals, latestYear);
    }

    function renderCards(avgs, peaks, year) {
        const container = document.getElementById('ops-annual-averages-cards');
        if (!container) return;

        const monthsLabel = `${avgs.monthsCaught} meses`;

        // Format Date Helper
        const formatDate = (dateStr) => {
            if(!dateStr) return '';
            const [y, m, d] = dateStr.split('-');
            const date = new Date(y, m-1, d);
            return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        };
        const formatShortDate = (dateStr) => {
             if(!dateStr) return '';
            const [y, m, d] = dateStr.split('-');
            const date = new Date(y, m-1, d);
            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        }
        
        // Uppercase first letter
        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        const peakGenDate = capitalize(formatDate(peaks.general.date));
        const peakComDate = capitalize(formatDate(peaks.commercial.date));

        const peakComPct = Math.round((peaks.commercial.val / (peaks.commercial.breakdown.com + peaks.commercial.breakdown.car + peaks.commercial.breakdown.gen)) * 100) || 0;

        container.style.display = 'block';
        container.innerHTML = `
            <div class="alert alert-secondary border-0 d-flex align-items-center mb-4 py-2" role="alert">
                <i class="fas fa-chart-line fs-4 me-3 text-primary"></i>
                <div>
                   <div class="fw-bold">Promedios mensuales por tipo de aviación</div>
                   <div class="small">Calculados con todas las capturas disponibles durante el año seleccionado (${year}).</div>
                </div>
            </div>

            <div class="d-flex flex-nowrap overflow-auto pb-3 gap-3" style="scroll-behavior: smooth;">
                <!-- Aviación Comercial -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 260px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-users me-1"></i> AVIACIÓN COMERCIAL</h6>
                         <h1 class="display-5 fw-bold text-dark mb-3">${avgs.com}</h1>
                         <div class="d-flex align-items-center">
                            <span class="badge bg-primary bg-opacity-10 text-primary me-2"><i class="fas fa-calendar-alt me-1"></i> ${monthsLabel}</span>
                            <span class="text-muted small">Promedio mensual</span>
                         </div>
                    </div>
                </div>

                <!-- Aviación Carga -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 260px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-box-open me-1"></i> AVIACIÓN DE CARGA</h6>
                         <h1 class="display-5 fw-bold text-dark mb-3">${avgs.car}</h1>
                         <div class="d-flex align-items-center">
                            <span class="badge bg-warning bg-opacity-10 text-warning me-2"><i class="fas fa-calendar-alt me-1"></i> ${monthsLabel}</span>
                            <span class="text-muted small">Promedio mensual</span>
                         </div>
                    </div>
                </div>

                 <!-- Aviación General -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 260px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-plane me-1"></i> AVIACIÓN GENERAL</h6>
                         <h1 class="display-5 fw-bold text-dark mb-3">${avgs.gen}</h1>
                         <div class="d-flex align-items-center">
                            <span class="badge bg-success bg-opacity-10 text-success me-2"><i class="fas fa-calendar-alt me-1"></i> ${monthsLabel}</span>
                            <span class="text-muted small">Promedio mensual</span>
                         </div>
                    </div>
                </div>
                
                 <!-- Promedio General -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 260px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-chart-area me-1"></i> PROMEDIO GENERAL</h6>
                         <h1 class="display-5 fw-bold text-dark mb-3">${avgs.total}</h1>
                         <div class="d-flex align-items-center">
                            <span class="badge bg-secondary bg-opacity-10 text-secondary me-2"><i class="fas fa-calendar-alt me-1"></i> ${monthsLabel}</span>
                            <span class="text-muted small">Promedio mensual</span>
                         </div>
                    </div>
                </div>

                 <!-- Peak Day -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 320px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-calendar-day me-1"></i> DÍA CON MÁS OPERACIONES</h6>
                         <h1 class="display-5 fw-bold text-dark mb-2">${peaks.general.val}</h1>
                         <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-warning bg-opacity-25 text-dark me-2 text-wrap text-start" style="font-weight:normal; line-height:1.2;">
                                <i class="fas fa-calendar me-1"></i> ${peakGenDate}
                            </span>
                            <span class="small text-muted">Pico anual</span>
                         </div>
                         <div class="small text-muted">
                            Comercial ${peaks.general.breakdown.com} · Carga ${peaks.general.breakdown.car} · Gral ${peaks.general.breakdown.gen}
                         </div>
                    </div>
                </div>
                
                 <!-- Peak Commercial Day -->
                <div class="card border-0 shadow-sm flex-shrink-0" style="min-width: 320px; background-color: #f8f9fa;">
                    <div class="card-body">
                         <h6 class="text-uppercase text-muted small fw-bold mb-3"><i class="fas fa-users me-1"></i> DÍA CON MÁS OPS COMERCIALES</h6>
                         <h1 class="display-5 fw-bold text-dark mb-2">${peaks.commercial.val}</h1>
                          <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-primary bg-opacity-25 text-primary me-2 text-wrap text-start" style="font-weight:normal; line-height:1.2;">
                                <i class="fas fa-calendar me-1"></i> ${peakComDate}
                            </span>
                         </div>
                         <div class="small text-muted">
                            Total diario ${peaks.commercial.breakdown.com + peaks.commercial.breakdown.car + peaks.commercial.breakdown.gen} ops · ${peakComPct}% comercial
                         </div>
                    </div>
                </div>

            </div>
        `;
    }

    function renderChart(totals, com, cargo, gen, year) {
        const ctx = document.getElementById('ops-annual-averages-chart');
        if (!ctx) return;

        if (annualChart) annualChart.destroy();

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        annualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthNames,
                datasets: [
                    {
                        label: 'Comercial',
                        data: com,
                        backgroundColor: '#0d6efd',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Carga',
                        data: cargo,
                        backgroundColor: '#ffc107',
                        stack: 'Stack 0'
                    },
                    {
                        label: 'Aviación Gral.',
                        data: gen,
                        backgroundColor: '#198754',
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Important so it fits container
                plugins: {
                    title: {
                        display: true,
                        text: `Distribución Mensual de Operaciones - ${year}`
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { 
                        stacked: true,
                        beginAtZero: true 
                    }
                }
            }
        });
    }

    function renderTable(totals, com, cargo, gen, year) {
        const container = document.getElementById('ops-annual-averages-table');
        if (!container) return;

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        let rows = '';
        let tCom = 0, tCar = 0, tGen = 0, tTot = 0;

        monthNames.forEach((m, i) => {
            if (totals[i] === 0 && i > new Date().getMonth() && year === new Date().getFullYear()) {
                return;
            }
            
            tCom += com[i];
            tCar += cargo[i];
            tGen += gen[i];
            tTot += totals[i];

            rows += `
                <tr>
                    <td>${m}</td>
                    <td class="text-end">${com[i].toLocaleString()}</td>
                    <td class="text-end">${cargo[i].toLocaleString()}</td>
                    <td class="text-end">${gen[i].toLocaleString()}</td>
                    <td class="text-end fw-bold">${totals[i].toLocaleString()}</td>
                </tr>
            `;
        });

        rows += `
            <tr class="table-light fw-bold">
                <td>TOTAL</td>
                <td class="text-end">${tCom.toLocaleString()}</td>
                <td class="text-end">${tCar.toLocaleString()}</td>
                <td class="text-end">${tGen.toLocaleString()}</td>
                <td class="text-end">${tTot.toLocaleString()}</td>
            </tr>
        `;

        container.innerHTML = `
            <table class="table table-sm table-hover table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>Mes</th>
                        <th class="text-end">Comercial</th>
                        <th class="text-end">Carga</th>
                        <th class="text-end">General</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    function renderEmpty() {
        const container = document.getElementById('ops-annual-averages-cards');
        if (container) container.innerHTML = '<div class="alert alert-info">No hay datos disponibles en parte_operations.</div>';
    }

})();
