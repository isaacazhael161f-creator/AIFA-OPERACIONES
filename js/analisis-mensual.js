/**
 * Análisis Mensual - Dashboard Module
 * Fetches data directly from Supabase 'parte_operations' table.
 */
(function() {
    let dailyChart = null;
    let serviceChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        const btnUpdate = document.getElementById('btn-update-analysis');
        if (btnUpdate) {
            btnUpdate.addEventListener('click', runAnalysis);
        }

        const tabEl = document.getElementById('tab-analisis-mensual');
        if (tabEl) {
            tabEl.addEventListener('shown.bs.tab', () => {
                setTimeout(runAnalysis, 100);
            });
        }
    });

    async function runAnalysis() {
        if (!window.supabaseClient) {
            console.error('Supabase client not available.');
            return;
        }

        const ctx = document.getElementById('chart-daily-ops');
        if (ctx && ctx.parentNode) {
            ctx.parentNode.style.opacity = '0.5';
        }

        const monthSelect = document.getElementById('analysis-month-select');
        const yearInput = document.getElementById('analysis-year-select');
        
        const targetMonth = parseInt(monthSelect.value, 10);
        const targetYear = parseInt(yearInput.value, 10);

        try {
            const data = await fetchSupabaseData(targetMonth, targetYear);
            
            if (ctx && ctx.parentNode) {
                ctx.parentNode.style.opacity = '1';
            }

            if (!data || data.length === 0) {
                updateUI_NoData();
                return;
            }

            processData(data, targetMonth, targetYear);

        } catch (error) {
            console.error('Error fetching analysis data:', error);
            if (ctx && ctx.parentNode) ctx.parentNode.style.opacity = '1';
        }
    }

    async function fetchSupabaseData(month, year) {
        const startMonthStr = String(month + 1).padStart(2, '0');
        const startDate = `${year}-${startMonthStr}-01`;
        
        let nextMonth = month + 2; 
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear = year + 1;
        }
        const endMonthStr = String(nextMonth).padStart(2, '0');
        const endDate = `${nextYear}-${endMonthStr}-01`;

        const { data, error } = await window.supabaseClient
            .from('parte_operations')
            .select('*')
            .gte('fecha', startDate)
            .lt('fecha', endDate)
            .order('fecha', { ascending: true });

        if (error) throw error;
        return data;
    }

    function processData(data, month, year) {
        const dailyCounts = {};
        const serviceCounts = {
            'Comercial': 0,
            'Carga': 0,
            'Aviación General': 0
        };
        
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
        const weekdayOccurrences = [0, 0, 0, 0, 0, 0, 0];

        let totalOps = 0;

        data.forEach(row => {
            const parts = row.fecha.split('-');
            const day = parseInt(parts[2], 10);
            
            const dateObj = new Date(year, month, day);
            const dayOfWeek = dateObj.getDay();

            // Total for this day
            const dailyTotal = (row.total_general !== undefined && row.total_general !== null) ? row.total_general : 
                               ((row.comercial_llegada||0) + (row.comercial_salida||0) + 
                                (row.carga_llegada||0) + (row.carga_salida||0) + 
                                (row.general_llegada||0) + (row.general_salida||0));

            dailyCounts[day] = dailyTotal;
            totalOps += dailyTotal;

            // Weekday Stats
            weekdayCounts[dayOfWeek] += dailyTotal;
            weekdayOccurrences[dayOfWeek]++;

            // Service Aggregation
            serviceCounts['Comercial'] += (row.comercial_llegada||0) + (row.comercial_salida||0);
            serviceCounts['Carga'] += (row.carga_llegada||0) + (row.carga_salida||0);
            serviceCounts['Aviación General'] += (row.general_llegada||0) + (row.general_salida||0);
        });

        // 1. Find Peak Day and Min Day
        let maxDay = 0;
        let maxDayVal = -1;
        
        let minDay = 0;
        let minDayVal = 999999;
        let hasData = false;

        Object.entries(dailyCounts).forEach(([day, count]) => {
            if (count > maxDayVal) {
                maxDayVal = count;
                maxDay = parseInt(day);
            }
            if (count < minDayVal) {
                minDayVal = count;
                minDay = parseInt(day);
            }
            hasData = true;
        });

        if (!hasData) minDayVal = 0;

        // 2. Find Peak Week
        const weeklyCounts = {};
        Object.keys(dailyCounts).forEach(day => {
            const d = new Date(year, month, parseInt(day));
            const onejan = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            weeklyCounts[week] = (weeklyCounts[week] || 0) + dailyCounts[day];
        });
        
        let maxWeek = 0;
        let maxWeekVal = 0;
        Object.entries(weeklyCounts).forEach(([week, count]) => {
             if (count > maxWeekVal) {
                maxWeekVal = count;
                maxWeek = week;
            }
        });

        // 3. Find Busiest Weekday
        const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        let maxWeekdayAvg = -1;
        let maxWeekdayIdx = -1;
        
        weekdayCounts.forEach((total, idx) => {
             const count = weekdayOccurrences[idx];
             const avg = count > 0 ? total / count : 0;
             if (avg > maxWeekdayAvg) {
                maxWeekdayAvg = avg;
                maxWeekdayIdx = idx;
             }
        });
        
        const busiestWeekdayName = maxWeekdayIdx >= 0 ? weekdayNames[maxWeekdayIdx] : '-';

        // Update UI Stats
        const elTotal = document.getElementById('stat-total-ops');
        if(elTotal) elTotal.textContent = totalOps.toLocaleString();
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const monthName = monthNames[month];

        const elPeakDay = document.getElementById('stat-peak-day');
        if(elPeakDay) elPeakDay.textContent = maxDayVal > -1 ? `${maxDay} de ${monthName}` : '-';
        
        const elPeakDayVal = document.getElementById('stat-peak-day-val');
        if(elPeakDayVal) elPeakDayVal.textContent = maxDayVal > -1 ? `${maxDayVal} operaciones` : '-';

        const elPeakWeek = document.getElementById('stat-peak-week');
        if(elPeakWeek) elPeakWeek.textContent = maxWeekVal > 0 ? `Semana ${maxWeek}` : '-';

        const elPeakWeekVal = document.getElementById('stat-peak-week-val');
        if(elPeakWeekVal) elPeakWeekVal.textContent = maxWeekVal > 0 ? `${maxWeekVal} ops` : '-';

        // Update Charts
        renderDailyChart(dailyCounts, month, year, maxDay, maxDayVal, minDay, minDayVal);
        renderServiceChart(serviceCounts);
        
        // Update Insights
        generateInsights(totalOps, maxDay, maxDayVal, dailyCounts, serviceCounts, busiestWeekdayName, Math.round(maxWeekdayAvg));
    }

    function renderDailyChart(dailyCounts, month, year, maxDay, maxDayVal, minDay, minDayVal) {
        const ctx = document.getElementById('chart-daily-ops');
        if (!ctx) return;
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const shortWeekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        
        const labels = [];
        const data = [];
        const pointColors = [];
        const pointRadii = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            labels.push(`${shortWeekdays[d.getDay()]} ${i}`);
            
            const val = dailyCounts[i] || 0;
            data.push(val);

            // Highlight Logic
            if (i === maxDay && maxDayVal > 0) {
                // Peak Day: Green/Success + Big
                pointColors.push('#198754'); 
                pointRadii.push(8);
            } else if (i === minDay && minDayVal > 0) {
                // Min Day: Red/Danger + Big
                pointColors.push('#dc3545');
                pointRadii.push(8);
            } else {
                // Normal days: Blue + Medium visibility
                pointColors.push('#0d6efd');
                pointRadii.push(4);
            }
        }

        if (dailyChart) dailyChart.destroy();

        dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Operaciones Diarias',
                    data: data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    pointBackgroundColor: pointColors,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: pointRadii,
                    pointHoverRadius: 10,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                
                                const index = context.dataIndex; 
                                const dayNum = index + 1;
                                
                                if (dayNum === maxDay) return label + ' (MÁXIMO)';
                                if (dayNum === minDay) return label + ' (MÍNIMO)';
                                
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

     function renderServiceChart(serviceCounts) {
        const ctx = document.getElementById('chart-service-type');
        if (!ctx) return;

        const sorted = Object.entries(serviceCounts).sort((a,b) => b[1] - a[1]);
        const labels = sorted.map(x => x[0]);
        const data = sorted.map(x => x[1]);

        if (serviceChart) serviceChart.destroy();

        serviceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Operaciones',
                    data: data,
                    backgroundColor: ['#0d6efd', '#ffc107', '#198754']
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y'
            }
        });
    }

    function generateInsights(total, maxDay, maxDayVal, dailyCounts, serviceCounts, busiestWeekday, busiestWeekdayAvg) {
        const container = document.getElementById('analysis-insights');
        if (!container) return;

        const avgOps = Object.keys(dailyCounts).length ? Math.round(total / Object.keys(dailyCounts).length) : 0;
        
        // Top Service
        const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);
        const topService = sortedServices[0];

        let html = `
            <p class="mb-2"><strong>Resumen del Mes:</strong></p>
            <ul class="mb-0 small">
                <li>Total de operaciones: <strong>${total.toLocaleString()}</strong>.</li>
                <li>Promedio diario: <strong>${avgOps}</strong> vuelos.</li>
                <li>Día pico: <strong>${maxDay}</strong> (${maxDayVal} ops).</li>
                <li>Día más activo (promedio): <strong>Todos los ${busiestWeekday}</strong> (~${busiestWeekdayAvg} ops).</li>
                <li>Servicio principal: <strong>${topService[0]}</strong> (${Math.round((topService[1]/total)*100 || 0)}%).</li>
            </ul>
        `;
        container.innerHTML = html;
    }

    function updateUI_NoData() {
        document.getElementById('stat-total-ops').textContent = "0";
        document.getElementById('stat-peak-day').textContent = "-";
        document.getElementById('stat-peak-day-val').textContent = "-";
        document.getElementById('stat-peak-week').textContent = "-";
        document.getElementById('stat-peak-week-val').textContent = "-";
        
        if (dailyChart) dailyChart.destroy();
        if (serviceChart) serviceChart.destroy();
        
        const container = document.getElementById('analysis-insights');
        if (container) container.textContent = "No se encontraron registros en la Base de Datos para este periodo.";
    }

})();
