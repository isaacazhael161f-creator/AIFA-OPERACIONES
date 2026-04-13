/**
 * Comparativa YOY (Year-Over-Year) - Dashboard Module
 * Fetches data from monthly_operations.
 */
(function() {
    let yoyChart = null;
    let dataLoaded = false;
    let opsDataCache = [];
    let activeYears = new Set();
    let currentMetric = 'operaciones'; // 'operaciones' | 'pasajeros'
    let currentGranularity = 'mensual'; // 'mensual' | 'bimestral' | 'trimestral'

    // Period groups per granularity
    const GRANULARITY_CONFIG = {
        mensual: {
            groups: [
                { label: 'Ene',  months: [1] },
                { label: 'Feb',  months: [2] },
                { label: 'Mar',  months: [3] },
                { label: 'Abr',  months: [4] },
                { label: 'May',  months: [5] },
                { label: 'Jun',  months: [6] },
                { label: 'Jul',  months: [7] },
                { label: 'Ago',  months: [8] },
                { label: 'Sep',  months: [9] },
                { label: 'Oct',  months: [10] },
                { label: 'Nov',  months: [11] },
                { label: 'Dic',  months: [12] },
            ]
        },
        bimestral: {
            groups: [
                { label: 'Ene-Feb', months: [1, 2] },
                { label: 'Mar-Abr', months: [3, 4] },
                { label: 'May-Jun', months: [5, 6] },
                { label: 'Jul-Ago', months: [7, 8] },
                { label: 'Sep-Oct', months: [9, 10] },
                { label: 'Nov-Dic', months: [11, 12] },
            ]
        },
        trimestral: {
            groups: [
                { label: 'T1 (Ene-Mar)', months: [1, 2, 3] },
                { label: 'T2 (Abr-Jun)', months: [4, 5, 6] },
                { label: 'T3 (Jul-Sep)', months: [7, 8, 9] },
                { label: 'T4 (Oct-Dic)', months: [10, 11, 12] },
            ]
        }
    };

    // Colores mejorados para cada año - con mayor saturación y contraste
    const yearColors = {
        '2022': '#06b3e8',  // Cyan mejorado - más saturado
        '2023': '#ff9800',  // Naranja más vibrante
        '2024': '#4caf50',  // Verde más saturado
        '2025': '#2196f3',  // Azul más vibrante
        '2026': '#e91e63',  // Magenta para año adicional
        'default': '#78909c' // Gris mejorado
    };

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    document.addEventListener('DOMContentLoaded', () => {
        const triggers = document.querySelectorAll('button[data-bs-target="#analisis-yoy-pane"]');

        triggers.forEach(btn => {
            btn.addEventListener('shown.bs.tab', () => {
                const client = window.supabaseClient;
                if (!client) {
                    console.warn("Supabase client no disponible para YOY.");
                    return;
                }
                if (!dataLoaded) {
                    loadYoYData(client);
                } else {
                    renderYoYChart();
                }
            });
        });

        const metricSelect = document.getElementById('yoy-metric-select');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                currentMetric = e.target.value;
                updateChartTitle();
                renderYoYChart();
                renderYoYTable();
            });
        }

        const exportBtn = document.getElementById('yoy-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportYOYtoCSV);
        }

        // Granularity toggle buttons
        document.querySelectorAll('input[name="yoy-granularity"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentGranularity = e.target.value;
                renderYoYChart();
                renderYoYTable();
            });
        });
    });

    function updateChartTitle() {
        const titleEl = document.getElementById('yoy-chart-title');
        if (titleEl) {
            // Se usa innerHTML para incluir el icono
            titleEl.innerHTML = currentMetric === 'operaciones' 
                ? '<i class="fas fa-plane me-2"></i>Comparativa Mensual de Operaciones Comerciales' 
                : '<i class="fas fa-user me-2"></i>Comparativa Mensual de Pasajeros Comerciales';
        }
    }

    async function loadYoYData(client) {
        try {
            // Query operations per month
            const { data, error } = await client
                .from('monthly_operations')
                .select('year, month, comercial_ops, comercial_pax, general_ops, general_pax, carga_ops')
                .order('year', { ascending: true })
                .order('month', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) return;

            opsDataCache = data;

            // Extract unique years
            const years = [...new Set(data.map(d => d.year))].sort();
            activeYears = new Set(years);

            buildYearsFilter(years);
            updateChartTitle();
            renderYoYChart();
            renderYoYTable();
            dataLoaded = true;

        } catch(error) {
            console.error("Error cargando datos YOY:", error);
        }
    }

    function buildYearsFilter(years) {
        const container = document.getElementById('yoy-years-container');
        if (!container) return;

        container.innerHTML = '';
        
        years.forEach(yr => {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-check form-switch';
            
            const input = document.createElement('input');
            input.className = 'form-check-input yoy-year-switch';
            input.type = 'checkbox';
            input.id = `yoy-year-switch-${yr}`;
            input.value = yr;
            input.checked = true; // Activos por defecto
            
            // Cuando un switch cambia, redibujamos tabla y grï¿½fica
            input.addEventListener('change', (e) => {
                if (e.target.checked) activeYears.add(parseInt(yr));
                else activeYears.delete(parseInt(yr));
                renderYoYChart();
                renderYoYTable();
            });

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `yoy-year-switch-${yr}`;
            label.textContent = yr;

            wrapper.appendChild(input);
            wrapper.appendChild(label);
            container.appendChild(wrapper);
        });
    }

    /** Get value for a given year+month from cache */
    function getVal(yr, month) {
        const match = opsDataCache.find(d => d.year === yr && d.month === month);
        if (!match) return null;
        return currentMetric === 'operaciones' ? (match.comercial_ops || 0) : (match.comercial_pax || 0);
    }

    /** Sum values for a year across a group of months; null if no data */
    function sumGroup(yr, months) {
        let total = 0, hasData = false;
        months.forEach(m => { const v = getVal(yr, m); if (v !== null) { total += v; hasData = true; } });
        return hasData ? total : null;
    }

    /** Render a % variation badge HTML */
    function renderPctBadge(current, prev, prevYr, small) {
        if (prev === null || prev === 0) return '';
        const growth = ((current - prev) / prev) * 100;
        const isPos = growth >= 0;
        const color = isPos ? 'text-success' : 'text-danger';
        const icon = isPos ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>';
        const sz = small ? '0.75em' : '0.8em';
        return `<span class="small ms-2 ${color}" style="font-size:${sz};" title="vs ${prevYr}">${icon} ${Math.abs(growth).toFixed(1)}%</span>`;
    }

    function renderYoYChart() {
        const canvas = document.getElementById('yoyCompChart');
        if (!canvas) return;

        if (yoyChart) yoyChart.destroy();
        if (activeYears.size === 0) return;

        const ctx = canvas.getContext('2d');
        const sortedYears = Array.from(activeYears).sort();
        const groups = GRANULARITY_CONFIG[currentGranularity].groups;
        const datasets = [];

        sortedYears.forEach((year, idx) => {
            const dataArr = groups.map(g => sumGroup(year, g.months));
            const yColor = yearColors[year] || yearColors['default'];
            const isLast = idx === sortedYears.length - 1;

            let backgroundColor = yColor + '20';
            if (isLast) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, yColor + '60');
                gradient.addColorStop(1, yColor + '05');
                backgroundColor = gradient;
            }

            datasets.push({
                label: `Año ${year}`,
                data: dataArr,
                borderColor: yColor,
                backgroundColor: backgroundColor,
                borderWidth: isLast ? 3 : 2,
                pointRadius: isLast ? 4 : 0,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: yColor,
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: yColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3,
                fill: isLast,
                tension: 0.4,
                order: isLast ? 0 : 1
            });
        });

        yoyChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: groups.map(g => g.label),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 12,
                            padding: 15,
                            margin: 10,
                            font: {
                                family: "'Inter', 'Segoe UI', sans-serif",
                                size: 13,
                                weight: '600'
                            },
                            color: '#334155'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#e2e8f0',
                        borderColor: '#475569',
                        borderWidth: 2,
                        padding: 14,
                        boxPadding: 8,
                        usePointStyle: true,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                        bodyFont: { size: 13, family: "'Inter', sans-serif" },
                        callbacks: {
                            title: function(context) {
                                return `📅 ${context[0].label}`;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += '📊 ' + new Intl.NumberFormat('es-MX').format(context.parsed.y);
                                }
                                return label;
                            },
                            footer: function(context) {
                                if (context.length > 1) {
                                    const values = context.map(c => c.parsed.y || 0);
                                    const total = values.reduce((a, b) => a + b, 0);
                                    return `📈 Total: ${new Intl.NumberFormat('es-MX').format(total)}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: "'Inter', 'Segoe UI', sans-serif",
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: {
                            color: '#f1f5f9',
                            borderDash: [5, 5],
                            drawBorder: false,
                        },
                        ticks: {
                            color: '#94a3b8',
                            padding: 10,
                            font: {
                                family: "'Inter', 'Segoe UI', sans-serif",
                                size: 11
                            },
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderYoYTable() {
        const thead = document.querySelector('#yoy-data-table > thead');
        const tbody = document.querySelector('#yoy-data-table > tbody');
        if (!thead || !tbody) return;

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const yearsList = Array.from(activeYears).sort();

        if (yearsList.length === 0) {
            tbody.innerHTML = '<tr><td class="text-muted">No hay años seleccionados</td></tr>';
            return;
        }

        const groups = GRANULARITY_CONFIG[currentGranularity].groups;

        // Header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th>Periodo</th>` + yearsList.map(y => `<th>${y}</th>`).join('');
        thead.appendChild(headerRow);

        const grandTotals = new Array(yearsList.length).fill(0);
        const comparablePrevTotals = new Array(yearsList.length).fill(0);

        // Period rows
        groups.forEach(group => {
            const tr = document.createElement('tr');
            let cellsHTML = `<td><strong>${group.label}</strong></td>`;

            yearsList.forEach((yr, idx) => {
                const val = sumGroup(yr, group.months);

                if (val === null) {
                    cellsHTML += `<td class="text-muted">–</td>`;
                    return;
                }

                grandTotals[idx] += val;

                let percentHtml = '';
                if (idx > 0) {
                    const prevYr = yearsList[idx - 1];
                    const prevVal = sumGroup(prevYr, group.months);
                    if (prevVal !== null) {
                        comparablePrevTotals[idx] += prevVal;
                        percentHtml = renderPctBadge(val, prevVal, prevYr, true);
                    }
                }

                cellsHTML += `<td>${new Intl.NumberFormat('es-MX').format(val)}${percentHtml}</td>`;
            });

            tr.innerHTML = cellsHTML;
            tbody.appendChild(tr);
        });

        // TOTAL row
        const tfRow = document.createElement('tr');
        tfRow.className = 'table-light fw-bold';
        let totalsHTML = `<td>TOTAL</td>`;
        grandTotals.forEach((t, idx) => {
            let percentHtml = '';
            if (idx > 0) {
                const prevComparable = comparablePrevTotals[idx];
                if (prevComparable > 0) {
                    const growth = ((t - prevComparable) / prevComparable) * 100;
                    const isPos = growth >= 0;
                    const color = isPos ? 'text-success' : 'text-danger';
                    const icon = isPos ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
                    percentHtml = `<br><span class="small ${color}" style="font-size:0.8em;" title="vs ${yearsList[idx - 1]} (mismos periodos)">${icon} ${Math.abs(growth).toFixed(1)}%</span>`;
                }
            }
            totalsHTML += `<td>${new Intl.NumberFormat('es-MX').format(t)}${percentHtml}</td>`;
        });
        tfRow.innerHTML = totalsHTML;
        tbody.appendChild(tfRow);
    }

    function exportYOYtoCSV() {
        if (!opsDataCache || opsDataCache.length === 0) {
            alert('No hay datos cargados para exportar.');
            return;
        }

        let csvContent = "";
        
        // Determinar quï¿½ metricas exportar, exportemos todo crudo para que sea mas util
        const keys = ['year', 'month', 'comercial_ops', 'comercial_pax', 'general_ops', 'general_pax', 'carga_ops'];
        
        // Header
        csvContent += keys.join(",") + "\n";
        
        // Data filtrada por aï¿½os activos si se desea, o toda la cache
        opsDataCache.forEach(row => {
            const rowValues = keys.map(k => row[k] !== null && row[k] !== undefined ? row[k] : "");
            csvContent += rowValues.join(",") + "\n";
        });

        // Blob y descarga
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);

        const ts = new Date().toISOString().slice(0,10);
        link.setAttribute("download", `comparativa_yoy_${ts}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
})();
