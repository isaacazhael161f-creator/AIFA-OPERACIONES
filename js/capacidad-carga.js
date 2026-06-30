/* ============================================================
 * Terminal de Carga · Capacidad (vista ejecutiva)
 * Datos estáticos provenientes del documento institucional
 * "Capacidad de la Terminal de Carga AIFA" (Gerencia de Carga).
 * Renderiza KPIs (HTML estático) + 2 gráficas Chart.js + chips
 * de aerolíneas. Se invoca al mostrar la sección.
 * ========================================================== */
(function () {
    'use strict';

    var AIRLINES = [
        'TSM', 'AeroUnión', 'Air Canada', 'Air France Cargo', 'Amerijet',
        'Awesome Cargo', 'Cargojet', 'Cargolux', 'Cathay Pacific', 'Copa Cargo',
        'DHL Guatemala', 'Emirates', 'Estafeta', 'Lufthansa Cargo', 'MAS de Carga',
        'Qatar', 'Aerolíneas TM', 'Turkish Cargo', 'UPS', 'Air China Cargo',
        'Atlas Air', 'Berry Aviation', 'China Southern Cargo', 'Ethiopian Cargo', 'FedEx',
        'Galistar', 'Kalitta Air', 'Lynden Air Cargo', 'National Air Cargo', 'Silk Way West',
        'Suparna Airlines', 'Ukraine', 'Auniworld Air Cargo', 'USA Jet'
    ];

    var charts = {};

    function destroy(id) {
        if (charts[id]) { try { charts[id].destroy(); } catch (_) {} charts[id] = null; }
    }

    function renderAirlines() {
        var box = document.getElementById('cc-airlines');
        if (!box || box.dataset.rendered === '1') return;
        box.innerHTML = AIRLINES.map(function (name) {
            return '<span class="cc-chip"><i class="fas fa-plane"></i>' + name + '</span>';
        }).join('');
        box.dataset.rendered = '1';
    }

    function renderDistrib() {
        var el = document.getElementById('cc-chart-distrib');
        if (!el || typeof Chart === 'undefined') return;
        destroy('distrib');
        charts.distrib = new Chart(el.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Carga internacional', 'Carga nacional'],
                datasets: [{
                    data: [705000, 77000],
                    backgroundColor: ['#f97316', '#0ea5e9'],
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '64%',
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (c) {
                                var t = 782000;
                                var pct = (c.parsed / t * 100).toFixed(1);
                                return ' ' + c.label + ': ' + c.parsed.toLocaleString('es-MX') + ' t (' + pct + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'ccCenter',
                afterDraw: function (chart) {
                    var ctx = chart.ctx;
                    var area = chart.chartArea;
                    if (!area) return;
                    var cx = (area.left + area.right) / 2;
                    var cy = (area.top + area.bottom) / 2;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '800 26px system-ui, sans-serif';
                    ctx.fillText('782,000', cx, cy - 6);
                    ctx.fillStyle = '#64748b';
                    ctx.font = '600 11px system-ui, sans-serif';
                    ctx.fillText('TON / AÑO', cx, cy + 16);
                    ctx.restore();
                }
            }]
        });
    }

    function renderMars() {
        var el = document.getElementById('cc-chart-mars');
        if (!el || typeof Chart === 'undefined') return;
        destroy('mars');
        charts.mars = new Chart(el.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Clave “F”', 'Clave “D”'],
                datasets: [{
                    data: [9, 16],
                    backgroundColor: ['#f97316', '#2563eb'],
                    borderRadius: 8,
                    barThickness: 34
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    tooltip: { callbacks: { label: function (c) { return ' ' + c.parsed.x + ' posiciones'; } } }
                },
                scales: {
                    x: { beginAtZero: true, suggestedMax: 18, ticks: { precision: 0 }, grid: { color: '#eef2f7' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    function renderAll() {
        renderAirlines();
        // Charts need a non-zero canvas; defer for layout then force a resize
        // so the doughnut/bar fill their containers when the section becomes visible.
        requestAnimationFrame(function () {
            renderDistrib();
            renderMars();
            [200, 500, 900].forEach(function (ms) {
                setTimeout(function () {
                    if (charts.distrib) { try { charts.distrib.resize(); } catch (_) {} }
                    if (charts.mars) { try { charts.mars.resize(); } catch (_) {} }
                }, ms);
            });
        });
    }

    window.initCapacidadCarga = function () {
        var sec = document.getElementById('capacidad-carga-section');
        if (!sec) return;
        renderAll();
    };

    document.addEventListener('click', function (e) {
        if (e.target.closest('[data-section="capacidad-carga"]')) {
            setTimeout(renderAll, 180);
        }
    });
})();
