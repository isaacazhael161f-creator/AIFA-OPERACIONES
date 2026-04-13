/**
 * YOY Comparativa — Aviación de Carga
 * Uses: carga_ops, carga_tons from monthly_operations.
 */
(function () {
    let chart = null;
    let dataLoaded = false;
    let cache = [];
    let activeYears = new Set();
    let currentGranularity = 'mensual';
    let currentMetric = 'operaciones';

    const yearColors = {
        2022: '#06b3e8', 2023: '#ff9800', 2024: '#4caf50',
        2025: '#2196f3', 2026: '#e91e63', 'default': '#78909c'
    };

    const GRANULARITY_CONFIG = {
        mensual: { groups: [
            {label:'Ene',months:[1]},{label:'Feb',months:[2]},{label:'Mar',months:[3]},
            {label:'Abr',months:[4]},{label:'May',months:[5]},{label:'Jun',months:[6]},
            {label:'Jul',months:[7]},{label:'Ago',months:[8]},{label:'Sep',months:[9]},
            {label:'Oct',months:[10]},{label:'Nov',months:[11]},{label:'Dic',months:[12]}
        ]},
        bimestral: { groups: [
            {label:'Ene-Feb',months:[1,2]},{label:'Mar-Abr',months:[3,4]},
            {label:'May-Jun',months:[5,6]},{label:'Jul-Ago',months:[7,8]},
            {label:'Sep-Oct',months:[9,10]},{label:'Nov-Dic',months:[11,12]}
        ]},
        trimestral: { groups: [
            {label:'T1 (Ene-Mar)',months:[1,2,3]},{label:'T2 (Abr-Jun)',months:[4,5,6]},
            {label:'T3 (Jul-Sep)',months:[7,8,9]},{label:'T4 (Oct-Dic)',months:[10,11,12]}
        ]}
    };

    function getVal(yr, month) {
        const row = cache.find(function(d){ return d.year === yr && d.month === month; });
        if (!row) return null;
        return currentMetric === 'toneladas' ? (row.carga_tons ?? null) : (row.carga_ops || 0);
    }
    function sumGroup(yr, months) {
        let t = 0, has = false;
        months.forEach(function(m){ const v = getVal(yr,m); if (v !== null){ t += v; has = true; } });
        return has ? t : null;
    }
    function isGroupComplete(yr, months) {
        return months.every(function(m){ return getVal(yr,m) !== null; });
    }
    function pctBadge(cur, prev, prevYr, sm) {
        if (!prev) return '';
        const g = ((cur - prev) / prev) * 100;
        const pos = g >= 0;
        const cls = pos ? 'text-success' : 'text-danger';
        const ic = pos ? '<i class="fas fa-caret-up"></i>' : '<i class="fas fa-caret-down"></i>';
        const sz = sm ? '0.75em' : '0.8em';
        return '<span class="small ms-2 ' + cls + '" style="font-size:' + sz + ';" title="vs ' + prevYr + '">' + ic + ' ' + Math.abs(g).toFixed(1) + '%</span>';
    }

    function buildYearsFilter(years) {
        const c = document.getElementById('cargo-yoy-years');
        if (!c) return;
        c.innerHTML = '';
        years.forEach(function(yr){
            const w = document.createElement('div'); w.className = 'form-check form-switch';
            const inp = document.createElement('input');
            inp.className = 'form-check-input'; inp.type = 'checkbox';
            inp.id = 'cargo-yoy-sw-' + yr; inp.value = yr; inp.checked = true;
            inp.addEventListener('change', function(e){
                if (e.target.checked) activeYears.add(parseInt(yr));
                else activeYears.delete(parseInt(yr));
                renderChart(); renderTable();
            });
            const lbl = document.createElement('label');
            lbl.className = 'form-check-label'; lbl.htmlFor = inp.id; lbl.textContent = yr;
            w.appendChild(inp); w.appendChild(lbl); c.appendChild(w);
        });
    }

    function renderChart() {
        const canvas = document.getElementById('cargo-yoy-chart');
        if (!canvas) return;
        if (chart) { chart.destroy(); chart = null; }
        if (!activeYears.size) return;
        const ctx = canvas.getContext('2d');
        const sorted = Array.from(activeYears).sort();
        const groups = GRANULARITY_CONFIG[currentGranularity].groups;
        const datasets = sorted.map(function(yr, idx){
            const col = yearColors[yr] || yearColors['default'];
            const last = idx === sorted.length - 1;
            let bg = col + '20';
            if (last) { const gr = ctx.createLinearGradient(0,0,0,400); gr.addColorStop(0,col+'60'); gr.addColorStop(1,col+'05'); bg=gr; }
            return {
                label:'Año '+yr, data: groups.map(function(g){ return sumGroup(yr, g.months); }),
                borderColor:col, backgroundColor:bg, borderWidth:last?3:2,
                pointRadius:last?4:0, pointBackgroundColor:'#fff', pointBorderColor:col,
                pointBorderWidth:2, pointHoverRadius:6, pointHoverBackgroundColor:col,
                pointHoverBorderColor:'#fff', pointHoverBorderWidth:3,
                fill:last, tension:0.4, order:last?0:1
            };
        });
        chart = new Chart(canvas, {
            type:'line',
            data:{ labels: groups.map(function(g){ return g.label; }), datasets:datasets },
            options:{
                responsive:true, maintainAspectRatio:false,
                animation:{duration:750,easing:'easeInOutQuart'},
                interaction:{mode:'index',intersect:false},
                plugins:{
                    legend:{ position:'top', align:'end', labels:{ usePointStyle:true, boxWidth:12, padding:15, font:{family:"'Inter','Segoe UI',sans-serif",size:13,weight:'600'}, color:'#334155' } },
                    tooltip:{
                        itemSort:function(a,b){ return b.datasetIndex-a.datasetIndex; },
                        backgroundColor:'rgba(30,41,59,0.95)', titleColor:'#f1f5f9', bodyColor:'#e2e8f0',
                        borderColor:'#475569', borderWidth:2, padding:14, boxPadding:8,
                        usePointStyle:true, cornerRadius:8,
                        titleFont:{size:14,weight:'bold',family:"'Inter',sans-serif"},
                        bodyFont:{size:13,family:"'Inter',sans-serif"},
                        callbacks:{
                            title:function(c){ return '📅 '+c[0].label; },
                            label:function(c){
                                const isTons = currentMetric === 'toneladas';
                                const fmt = isTons
                                    ? new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(c.parsed.y)
                                    : new Intl.NumberFormat('es-MX').format(c.parsed.y);
                                const icon = isTons ? '⚖️' : '📊';
                                return (c.dataset.label?c.dataset.label+': ':'')+( c.parsed.y!==null?icon+' '+fmt:'');
                            },
                            footer:function(c){ if(c.length>1){ const t=c.reduce(function(a,x){return a+(x.parsed.y||0);},0); const isTons=currentMetric==='toneladas'; const fmt=isTons?new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(t):new Intl.NumberFormat('es-MX').format(t); return '📈 Total: '+fmt; } return ''; }
                        }
                    }
                },
                scales:{
                    x:{ grid:{display:false,drawBorder:false}, ticks:{color:'#94a3b8',font:{family:"'Inter','Segoe UI',sans-serif",size:12}} },
                    y:{ beginAtZero:true, border:{display:false}, grid:{color:'#f1f5f9',borderDash:[5,5],drawBorder:false},
                        ticks:{color:'#94a3b8',padding:10,font:{family:"'Inter','Segoe UI',sans-serif",size:11},
                        callback:function(v){ return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v; }} }
                }
            }
        });
    }

    function renderTable() {
        const thead = document.querySelector('#cargo-yoy-table > thead');
        const tbody = document.querySelector('#cargo-yoy-table > tbody');
        if (!thead || !tbody) return;
        thead.innerHTML = ''; tbody.innerHTML = '';
        const yrs = Array.from(activeYears).sort();
        if (!yrs.length) { tbody.innerHTML = '<tr><td class="text-muted">No hay años seleccionados</td></tr>'; return; }
        const groups = GRANULARITY_CONFIG[currentGranularity].groups;
        const hRow = document.createElement('tr');
        hRow.innerHTML = '<th>Periodo</th>' + yrs.map(function(y){ return '<th>'+y+'</th>'; }).join('');
        thead.appendChild(hRow);
        const grand = new Array(yrs.length).fill(0);
        const prevTot = new Array(yrs.length).fill(0);
        const curTot = new Array(yrs.length).fill(0);
        groups.forEach(function(grp){
            const tr = document.createElement('tr');
            let html = '<td><strong>'+grp.label+'</strong></td>';
            yrs.forEach(function(yr, idx){
                const val = sumGroup(yr, grp.months);
                if (val === null) { html += '<td class="text-muted">–</td>'; return; }
                grand[idx] += val;
                const done = isGroupComplete(yr, grp.months);
                let pct = '';
                if (idx > 0 && done) {
                    const pv = sumGroup(yrs[idx-1], grp.months);
                    if (pv !== null) { prevTot[idx] += pv; curTot[idx] += val; pct = pctBadge(val, pv, yrs[idx-1], true); }
                } else if (idx === 0 && done) { curTot[idx] += val; }
                html += '<td>'+new Intl.NumberFormat('es-MX', currentMetric==='toneladas'?{minimumFractionDigits:2,maximumFractionDigits:2}:{}).format(val)+pct+'</td>';
            });
            tr.innerHTML = html; tbody.appendChild(tr);
        });
        const tfRow = document.createElement('tr');
        tfRow.className = 'table-light fw-bold';
        let tot = '<td>TOTAL</td>';
        grand.forEach(function(t, idx){
            let pct = '';
            if (idx > 0 && prevTot[idx] > 0) {
                const g = ((curTot[idx] - prevTot[idx]) / prevTot[idx]) * 100;
                const pos = g >= 0;
                const cls = pos ? 'text-success' : 'text-danger';
                const arrow = pos ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
                pct = '<br><span class="small '+cls+'" style="font-size:0.8em;" title="vs '+yrs[idx-1]+' (periodos cerrados)">'+arrow+' '+Math.abs(g).toFixed(1)+'%</span>';
            }
            tot += '<td>'+new Intl.NumberFormat('es-MX', currentMetric==='toneladas'?{minimumFractionDigits:2,maximumFractionDigits:2}:{}).format(t)+pct+'</td>';
        });
        tfRow.innerHTML = tot; tbody.appendChild(tfRow);
    }

    function updateChartTitle() {
        const el = document.getElementById('cargo-yoy-chart-title');
        if (!el) return;
        const label = currentMetric === 'toneladas' ? 'Toneladas Transportadas' : 'Operaciones';
        el.innerHTML = '<i class="fas fa-box-open me-2"></i>Comparativa de ' + label + ' — Aviación de Carga';
    }

    document.addEventListener('DOMContentLoaded', function () {
        let wired = false;
        const triggers = document.querySelectorAll('button[data-bs-target="#yoy-sub-carga"]');
        triggers.forEach(function(btn){
            btn.addEventListener('shown.bs.tab', function(){
                const client = window.supabaseClient;
                if (!client) return;
                if (!dataLoaded) {
                    client.from('monthly_operations')
                        .select('year, month, carga_ops, carga_tons')
                        .order('year',{ascending:true}).order('month',{ascending:true})
                        .then(function(res){
                            if (res.error) { console.error('YoY Carga:', res.error); return; }
                            cache = res.data || [];
                            dataLoaded = true;
                            const years = Array.from(new Set(cache.map(function(d){ return d.year; }))).sort();
                            activeYears = new Set(years);
                            buildYearsFilter(years);
                            renderChart();
                            renderTable();
                            updateChartTitle();
                            if (!wired) {
                                wired = true;
                                document.querySelectorAll('input[name="cargo-yoy-granularity"]').forEach(function(r){
                                    r.addEventListener('change', function(e){
                                        currentGranularity = e.target.value;
                                        renderChart(); renderTable();
                                    });
                                });
                                const metricSel = document.getElementById('cargo-yoy-metric-select');
                                if (metricSel) {
                                    metricSel.addEventListener('change', function(e){
                                        currentMetric = e.target.value;
                                        updateChartTitle();
                                        renderChart(); renderTable();
                                    });
                                }
                            }
                        });
                } else {
                    updateChartTitle();
                    renderChart();
                    renderTable();
                }
            });
        });
    });
})();
