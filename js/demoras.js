;(function(){
  const sec = document.getElementById('demoras-section');
  if (!sec) return;
    // Fallback de datos local (para mantener el módulo autosuficiente)
    const LOCAL_DEMORAS = {
        periodo: 'Agosto 2025',
        causas: [
            { causa: 'Repercusión', demoras: 219 },
            { causa: 'Compañía', demoras: 190 },
            { causa: 'Evento Circunstancial', demoras: 8 },
            { causa: 'Combustible', demoras: 5 },
            { causa: 'Autoridad', demoras: 4 },
            { causa: 'Meteorología', demoras: 199 },
            { causa: 'Aeropuerto', demoras: 4 }
        ]
    };

  // Define global renderDemoras so other code can call it
  window.renderDemoras = function renderDemoras(data) {
    try {
                const demorasData = (function(){
                    if (Array.isArray(data)) return { periodo: (window.staticData?.demoras?.periodo || LOCAL_DEMORAS.periodo), causas: data };
                    if (window.staticData && window.staticData.demoras) return window.staticData.demoras;
                    return LOCAL_DEMORAS;
                })();
                const d = demorasData.causas || [];
        const tbody = document.getElementById('demoras-tbody');
        const tfoot = document.getElementById('demoras-tfoot');
                const title = document.getElementById('demoras-title');
        if (tbody) tbody.innerHTML = '';
        const total = (d||[]).reduce((acc, r) => acc + (Number(r.demoras||0)), 0);
                if (title) { title.textContent = `Análisis de Demoras${demorasData.periodo? ' · ' + demorasData.periodo : ''}`; }
        (d||[]).forEach(r => {
            if (tbody) {
                const pct = ((Number(r.demoras||0) / Math.max(1, total)) * 100).toFixed(1);
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${r.causa}</td><td>${r.demoras}</td><td>${pct}%</td>`;
                tbody.appendChild(tr);
            }
        });
        if (tfoot) tfoot.innerHTML = `<tr class="table-light"><th>Total</th><th>${total}</th><th>100%</th></tr>`;
        // Pastel
        const pie = document.getElementById('delaysPieChart');
        if (pie && window.Chart) {
            window.opsCharts = window.opsCharts || {};
            if (window.opsCharts.delaysPieChart) { try { window.opsCharts.delaysPieChart.destroy(); } catch(_) {} }
            const labels = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => tr.children[0]?.textContent || '');
            const values = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => parseFloat(tr.children[1]?.textContent||'0')||0);
            const baseColors = ['#0d6efd','#6610f2','#6f42c1','#d63384','#dc3545','#fd7e14','#ffc107','#198754','#20c997','#0dcaf0'];
            window.opsCharts.delaysPieChart = new Chart(pie, {
                type: 'pie',
                data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_,i)=> baseColors[i % baseColors.length]) }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color:'#fff', font:{weight:'600'}, formatter: (value, ctx) => { const sum=(ctx.chart.data.datasets[0].data||[]).reduce((a,b)=> a+(Number(b)||0),0); const pct=sum?(value/sum)*100:0; return pct>=7? pct.toFixed(0)+'%':''; } } } },
                plugins: [ChartDataLabels]
            });
            try { setTimeout(()=> window.opsCharts.delaysPieChart?.resize(), 100); } catch(_) {}
        }
    } catch (e) { console.warn('renderDemoras error:', e); }
  };

  function safeRender(){ try { window.renderDemoras(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', safeRender);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="demoras"]')) setTimeout(safeRender, 50); });
    // Nota: evitamos observar cambios en tbody para no provocar bucles de re-render.
})();
