/**
 * Comparativa YOY (Year-Over-Year) - Dashboard Module
 * Fetches data from monthly_operations.
 */
(function() {
    let yoyChart = null;
    let dataLoaded = false;
    let opsDataCache = [];
    let activeYears = new Set();
    let currentMetric = 'operaciones'; // 'operaciones' o 'pasajeros'

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
                generateYoYInsights();
            });
        }

        const exportBtn = document.getElementById('yoy-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportYOYtoCSV);
        }
    });

    function updateChartTitle() {
        const titleEl = document.getElementById('yoy-chart-title');
        if (titleEl) {
            if (currentMetric === 'operaciones') {
                titleEl.innerHTML = '<i class="fa-solid fa-plane me-2"></i>Comparativa Mensual de Operaciones Comerciales';
            } else {
                titleEl.innerHTML = '<i class="fa-solid fa-user me-2"></i>Comparativa Mensual de Pasajeros Comerciales';
            }
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
                generateYoYInsights();
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
                generateYoYInsights();
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

    function renderYoYChart() {
        const canvas = document.getElementById('yoyCompChart');
        if (!canvas) return;

        // Limpiar gráfica vieja
        if (yoyChart) yoyChart.destroy();

        // Si no hay años activos
        if (activeYears.size === 0) {
            return;
        }

        const ctx = canvas.getContext('2d');
        const sortedYears = Array.from(activeYears).sort();
        const datasets = [];

        // Por cada año activo, armamos su dataset
        sortedYears.forEach((year, idx) => {
            // Filtrar datos de current year
            const yearData = opsDataCache.filter(d => d.year === year);
            
            // Llenar arreglo de 12 meses
            const dataArr = new Array(12).fill(null);
            
            yearData.forEach(row => {
                const moIndex = row.month - 1;
                if (currentMetric === 'operaciones') {
                    dataArr[moIndex] = (row.comercial_ops || 0);
                } else {
                    dataArr[moIndex] = (row.comercial_pax || 0);
                }
            });

            const yColor = yearColors[year] || yearColors['default'];
            const isLast = idx === sortedYears.length - 1;

            // Gradient para el último año
            let backgroundColor = yColor + '20';
            if (isLast) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, yColor + '60'); // Más opaco arriba
                gradient.addColorStop(1, yColor + '05'); // Transparente abajo
                backgroundColor = gradient;
            }

            datasets.push({
                label: `Año ${year}`,
                data: dataArr,
                borderColor: yColor,
                backgroundColor: backgroundColor,
                borderWidth: isLast ? 3 : 2,
                // Puntos solo visibles en el último año o al hacer hover
                pointRadius: isLast ? 4 : 0,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: yColor,
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: yColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3,
                fill: isLast, // Solo llenar el área del último año
                tension: 0.4, // Curva suave
                order: isLast ? 0 : 1 // El último año se dibuja encima
            });
        });

        yoyChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: monthNames,
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
            tbody.innerHTML = '<tr><td class="text-muted">No hay aï¿½os seleccionados</td></tr>';
            return;
        }

        // Construir encabezado
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th>Mes</th>` + yearsList.map(y => `<th>${y}</th>`).join('');
        thead.appendChild(headerRow);

        let grandTotals = new Array(yearsList.length).fill(0);

        // Filas por mes
        monthNames.forEach((mName, moIndex) => {
            const tr = document.createElement('tr');
            
            // Celda mes principal
            let cellsHTML = `<td><strong>${mName}</strong></td>`;
            
            yearsList.forEach((yr, idx) => {
                const match = opsDataCache.find(d => d.year === yr && d.month === (moIndex + 1));
                if (!match) {
                    cellsHTML += `<td class="text-muted">--</td>`;
                } else {
                    let val = 0;
                    if (currentMetric === 'operaciones') {
                        val = (match.comercial_ops || 0);
                    } else {
                        val = (match.comercial_pax || 0);
                    }
                    grandTotals[idx] += val;
                    
                    let percentHtml = '';
                    if (idx > 0) {
                        const prevYr = yearsList[idx - 1];
                        const prevMatch = opsDataCache.find(d => d.year === prevYr && d.month === (moIndex + 1));
                        if (prevMatch) {
                            let prevVal = currentMetric === 'operaciones' ? (prevMatch.comercial_ops || 0) : (prevMatch.comercial_pax || 0);
                            if (prevVal > 0) {
                                const growth = ((val - prevVal) / prevVal) * 100;
                                const isPositive = growth >= 0;
                                const color = isPositive ? 'text-success' : 'text-danger';
                                const icon = isPositive ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>';
                                percentHtml = `<span class="small ms-2 ${color}" style="font-size: 0.75em;" title="vs ${prevYr}">${icon} ${Math.abs(growth).toFixed(1)}%</span>`;
                            }
                        }
                    }

                    cellsHTML += `<td>${new Intl.NumberFormat('es-MX').format(val)}${percentHtml}</td>`;
                }
            });

            tr.innerHTML = cellsHTML;
            tbody.appendChild(tr);
        });

        // Fila Total
        const tfRow = document.createElement('tr');
        tfRow.className = 'table-light fw-bold';
        let totalsHTML = `<td>TOTAL</td>`;
        grandTotals.forEach((t, idx) => {
            let percentHtml = '';
            if (idx > 0 && grandTotals[idx - 1] > 0) {
                const prevTotal = grandTotals[idx - 1];
                const growth = ((t - prevTotal) / prevTotal) * 100;
                const isPositive = growth >= 0;
                const color = isPositive ? 'text-success' : 'text-danger';
                const icon = isPositive ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
                percentHtml = `<br><span class="small ${color}" style="font-size: 0.8em;" title="vs ${yearsList[idx - 1]}">${icon} ${Math.abs(growth).toFixed(1)}%</span>`;
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
    function generateYoYInsights() {
        const insightsContainer = document.getElementById('yoy-insights');
        const insightsList = document.getElementById('yoy-insights-list');
        if (!insightsContainer || !insightsList) return;

        insightsList.innerHTML = '';
        const yearsList = Array.from(activeYears).sort((a,b) => b - a); // Descending

        if (yearsList.length === 0) {
            insightsContainer.classList.add('d-none');
            return;
        }

        const insights = [];
        const metricName = currentMetric === 'operaciones' ? 'operaciones comerciales' : 'pasajeros comerciales';
        
        // 1. Total del año más reciente
        if (yearsList.length > 0) {
            const latestYear = yearsList[0];
            const dataLatest = opsDataCache.filter(d => d.year === latestYear);
            let totalLatest = 0;
            let bestMonthLatest = { month: -1, val: -1 };
            
            dataLatest.forEach(d => {
                const val = currentMetric === 'operaciones' ? (d.comercial_ops || 0) : (d.comercial_pax || 0);
                totalLatest += val;
                if (val > bestMonthLatest.val) {
                    bestMonthLatest = { month: d.month, val: val };
                }
            });
            
            if (totalLatest > 0) {
                insights.push(`En el año <strong>${latestYear}</strong> se registraron un total de <strong>${new Intl.NumberFormat('es-MX').format(totalLatest)}</strong> ${metricName}.`);
                if (bestMonthLatest.month !== -1) {
                    insights.push(`El mes más fuerte de <strong>${latestYear}</strong> fue <strong>${monthNames[bestMonthLatest.month - 1]}</strong> con <strong>${new Intl.NumberFormat('es-MX').format(bestMonthLatest.val)}</strong> ${metricName}.`);
                }
            }
        }
        
        // 2. Comparación YTD
        if (yearsList.length > 1) {
            const latestYear = yearsList[0];
            const prevYear = yearsList[1];
            
            let totalLatestYtd = 0, totalPrevYtd = 0;
            const dataLatest = opsDataCache.filter(d => d.year === latestYear);
            const dataPrev = opsDataCache.filter(d => d.year === prevYear);
            
            let maxMonthLatest = 0;
            dataLatest.forEach(d => {
                const val = currentMetric === 'operaciones' ? (d.comercial_ops || 0) : (d.comercial_pax || 0);
                if (val > 0 && d.month > maxMonthLatest) {
                    maxMonthLatest = d.month;
                }
            });
            
            if (maxMonthLatest > 0) {
                 for (let m = 1; m <= maxMonthLatest; m++) {
                    const rowL = dataLatest.find(d => d.month === m);
                    if (rowL) {
                        totalLatestYtd += currentMetric === 'operaciones' ? (rowL.comercial_ops || 0) : (rowL.comercial_pax || 0);
                    }
                    const rowP = dataPrev.find(d => d.month === m);
                    if (rowP) {
                        totalPrevYtd += currentMetric === 'operaciones' ? (rowP.comercial_ops || 0) : (rowP.comercial_pax || 0);
                    }
                 }
                 
                 if (totalPrevYtd > 0 && totalLatestYtd > 0) {
                     const growth = ((totalLatestYtd - totalPrevYtd) / totalPrevYtd) * 100;
                     const sign = growth >= 0 ? 'incremento' : 'caída';
                     const icon = growth >= 0 ? '<i class="fas fa-arrow-up text-success"></i>' : '<i class="fas fa-arrow-down text-danger"></i>';
                     insights.push(`Comparando el mismo periodo (Ene-${monthNames[maxMonthLatest-1]}) de <strong>${latestYear}</strong> vs <strong>${prevYear}</strong>, se observa un ${sign} del <strong>${Math.abs(growth).toFixed(1)}%</strong> ${icon}.`);
                 }
            }
        }

        if (insights.length > 0) {
            insights.forEach(text => {
                const li = document.createElement('li');
                li.className = 'mb-1';
                li.innerHTML = text;
                insightsList.appendChild(li);
            });
            insightsContainer.classList.remove('d-none');
        } else {
            insightsContainer.classList.add('d-none');
        }
    }


