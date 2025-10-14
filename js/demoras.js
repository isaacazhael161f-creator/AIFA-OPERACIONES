;(function(){
  const sec = document.getElementById('demoras-section');
  if (!sec) return;
    // Fallback de datos local (para mantener el módulo autosuficiente)
    const LOCAL_DEMORAS = {
        periodo: 'Septiembre 2025',
        causas: [
            { causa: 'Repercusión', demoras: 319 },
            { causa: 'Compañía', demoras: 158 },
            { causa: 'Evento Circunstancial', demoras: 7 },
            { causa: 'Combustible', demoras: 3 },
            { causa: 'Autoridad', demoras: 5 },
            { causa: 'Meteorología', demoras: 4 },
            { causa: 'Aeropuerto', demoras: 0 }
        ]
    };

  // Función para destruir/limpiar la gráfica de demoras (canvas)
  window.destroyDemorasCharts = function() {
    console.log('🗑️ Limpiando gráfica de demoras (canvas)...');
    try {
      const c = document.getElementById('delaysPieChart');
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        const w = c.clientWidth || 400;
        const h = c.clientHeight || 300;
        c.width = Math.max(1, Math.floor(w * dpr));
        c.height = Math.max(1, Math.floor(h * dpr));
        const g = c.getContext('2d');
        if (g) { g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h); }
      }
    } catch(e) { console.warn('Error limpiando canvas demoras:', e); }
  };

  function drawPie(canvas, labels, values, colors, title){
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 360;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,w,h);

    const total = (values||[]).reduce((a,b)=> a + (Number(b)||0), 0);
    const cx = Math.floor(w*0.42), cy = Math.floor(h*0.55);
    const r = Math.max(40, Math.min(w,h)*0.32);

    // Título
    if (title) {
      g.fillStyle = '#495057';
      g.font = '600 14px Roboto, Arial';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(title, 8, 8);
    }

    let start = -Math.PI/2; // iniciar arriba
    for (let i=0;i<labels.length;i++){
      const v = Number(values[i]||0);
      const frac = total>0 ? v/total : 0;
      const end = start + frac * Math.PI*2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.fillStyle = colors[i % colors.length];
      g.arc(cx, cy, r, start, end);
      g.closePath();
      g.fill();
      // borde blanco fino
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
      // etiqueta si el sector es suficientemente grande
      if (frac >= 0.08) {
        const mid = (start + end)/2;
        const lx = cx + (r*0.62) * Math.cos(mid);
        const ly = cy + (r*0.62) * Math.sin(mid);
        const pct = Math.round(frac*100) + '%';
        g.fillStyle = '#ffffff';
        g.font = '600 12px Roboto, Arial';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pct, lx, ly);
      }
      start = end;
    }

    // Leyenda simple a la derecha
    const legendX = Math.floor(w*0.78);
    let legendY = Math.floor(h*0.25);
    g.font = '12px Roboto, Arial';
    for (let i=0;i<labels.length;i++){
      g.fillStyle = colors[i % colors.length];
      g.fillRect(legendX, legendY, 14, 14);
      g.fillStyle = '#343a40';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      const name = String(labels[i]||'');
      const val = Number(values[i]||0);
      const pct = total>0 ? Math.round((val/total)*100) : 0;
      g.fillText(`${name} (${val}, ${pct}%)`, legendX+18, legendY+8);
      legendY += 20;
    }
  }

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
    // Pastel (canvas)
    const pie = document.getElementById('delaysPieChart');
    if (pie) {
      const labels = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => tr.children[0]?.textContent || '');
      const values = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => parseFloat(tr.children[1]?.textContent||'0')||0);
      const baseColors = ['#0d6efd','#6610f2','#6f42c1','#d63384','#dc3545','#fd7e14','#ffc107','#198754','#20c997','#0dcaf0'];
      drawPie(pie, labels, values, baseColors, 'Demoras en vuelos de salida');
    }
    } catch (e) { console.warn('renderDemoras error:', e); }
  };

  function safeRender(){ try { window.renderDemoras(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', safeRender);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="demoras"]')) setTimeout(safeRender, 50); });
    // Nota: evitamos observar cambios en tbody para no provocar bucles de re-render.
})();
