// Itinerario (gráficas del día) extraído de script.js — sin cambios en comportamiento
;(function(){
  const sec = document.getElementById('itinerario-section');
  if (!sec) return;
  const H_LABELS = Array.from({length:24}, (_,i)=> String(i).padStart(2,'0'));
  const charts = {};
  let itData = null;
  let selectedDate = null; // 'yyyy-mm-dd'
  let lastAgg = null;
  
  // Exponer función para destruir gráficas desde el exterior
  window.destroyItinerarioCharts = function() {
    console.log('🗑️ Destruyendo gráficas de itinerario...');
    Object.keys(charts).forEach(k => { 
      try { 
        if (charts[k] && typeof charts[k].destroy === 'function') {
          console.log(`Destruyendo gráfica: ${k}`);
          charts[k].destroy(); 
        }
        delete charts[k];
      } catch(e) { 
        console.warn(`Error destruyendo gráfica ${k}:`, e); 
      } 
    });
    
    // También limpiar por ID de canvas
    const canvasIds = ['paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart'];
    canvasIds.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
          console.log(`Destruyendo gráfica por canvas ID: ${id}`);
          existingChart.destroy();
        }
      }
    });
    
    console.log('✅ Gráficas de itinerario destruidas');
  };
  
  // Exponer función para re-renderizar desde el exterior
  window.renderItineraryCharts = renderItineraryCharts;
  const passengerAirlines = new Set(['aeromexico','volaris','viva aerobus','mexicana','aerus','arajet','americanairlines','latam','avianca','copa','airfrance','klm','iberia']);
  const cargoAirlines = new Set(['atlas air','aero union','aerounion','masair','mas','estafeta','dhl','cargolux','cathay pacific','ups','turkish','amerijet','air canada cargo','kalitta','ethiopian']);
  function toYMD(d){ return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); }
  function ymdToDMY(ymd){ const [y,m,d]=ymd.split('-'); return `${d}/${m}/${y}`; }
  function parseDMY(s){ const m = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(s||''); if(!m) return null; return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10)); }
  function hourFromHHMM(s){ const m = /^(\d{1,2}):(\d{2})$/.exec(s||''); return m ? Math.min(23, Math.max(0, parseInt(m[1],10))) : null; }
  function norm(str){ return (str||'').toString().trim().toLowerCase(); }
  function isPassenger(f){ if (norm(f.categoria) === 'pasajeros' || norm(f.categoria)==='comercial') return true; if (norm(f.categoria) === 'carga') return false; const a = norm(f.aerolinea||f.aerolínea||f.airline); if (!a) return true; if (cargoAirlines.has(a)) return false; if (passengerAirlines.has(a)) return true; if (a.includes('cargo')) return false; return true; }
  async function loadItinerary() { if (itData) return itData; try { const res = await fetch('data/itinerario.json', { cache:'no-store' }); itData = await res.json(); return itData; } catch(e){ console.warn('loadItinerary error', e); return []; } }
  function pickBestDate(data){ const todayYMD = toYMD(new Date()); const todayDMY = ymdToDMY(todayYMD); const hasToday = data.some(f => norm(f.fecha_llegada)===norm(todayDMY) || norm(f.fecha_salida)===norm(todayDMY)); if (hasToday) return todayYMD; const freq = new Map(); for (const f of data){ const d1 = norm(f.fecha_llegada); const d2 = norm(f.fecha_salida); if (d1) freq.set(d1, (freq.get(d1)||0)+1); if (d2) freq.set(d2, (freq.get(d2)||0)+1); } let topDMY = null, topN = -1; for (const [d, n] of freq) { if (n>topN){ topN=n; topDMY=d; } } if (topDMY){ const dt = parseDMY(topDMY); if (dt) return toYMD(dt); } return todayYMD; }
  function aggregateDay(data, ymd){ const dmy = ymdToDMY(ymd); const paxArr = Array(24).fill(0), paxDep = Array(24).fill(0); const carArr = Array(24).fill(0), carDep = Array(24).fill(0); for (const f of data){ if (norm(f.fecha_llegada) === norm(dmy)){ const h = hourFromHHMM(f.hora_llegada); if (h!=null){ if (isPassenger(f)) paxArr[h]++; else carArr[h]++; } } if (norm(f.fecha_salida) === norm(dmy)){ const h2 = hourFromHHMM(f.hora_salida); if (h2!=null){ if (isPassenger(f)) paxDep[h2]++; else carDep[h2]++; } } } return { paxArr, paxDep, carArr, carDep }; }
  function renderTopHoursLists(agg){ const topSelPax = document.getElementById('pax-topN'); const topSelCargo = document.getElementById('cargo-topN'); const topNPax = topSelPax ? parseInt(topSelPax.value,10) : 5; const topNCargo = topSelCargo ? parseInt(topSelCargo.value,10) : 5; const mkTop = (arr, n) => { const list = arr.map((v,i)=>({h:i,v})).filter(x=>x.v>0).sort((a,b)=> b.v - a.v || a.h - b.h).slice(0,n); return list; }; const fmt = (h,v) => `${String(h).padStart(2,'0')}:00–${String(h).padStart(2,'0')}:59 — ${v} vuelos`; const fill = (id, items) => { const el = document.getElementById(id); if (!el) return; if (!items.length) { el.innerHTML = '<li class="text-muted">Sin datos</li>'; return; } el.innerHTML = items.map(it=>`<li>${fmt(it.h,it.v)}</li>`).join(''); }; fill('pax-top-arr', mkTop(agg.paxArr, topNPax)); fill('pax-top-dep', mkTop(agg.paxDep, topNPax)); fill('cargo-top-arr', mkTop(agg.carArr, topNCargo)); fill('cargo-top-dep', mkTop(agg.carDep, topNCargo)); }
  function makeBarConfig(labels, data, color, title){ const isDark = document.body.classList.contains('dark-mode'); return { type: 'bar', data: { labels, datasets: [{ label: title, data, backgroundColor: (window.hexToRgba?window.hexToRgba(color,0.85):color), borderColor: color, borderWidth: 1.2, maxBarThickness: 20, borderRadius: 6, barPercentage: 0.9, categoryPercentage: 0.9 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 }, title: { display: true, text: 'Hora del día', color: isDark ? '#e8eaed' : '#343a40', font: { weight: '600' } } }, y: { beginAtZero: true, precision: 0, grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }, title: { display: true, text: 'Vuelos', color: isDark ? '#e8eaed' : '#343a40', font: { weight: '600' } } } }, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, callbacks: { label: (ctx)=> `${ctx.dataset.label}: ${ctx.parsed.y} vuelos` } }, datalabels: { display: (ctx) => (ctx.raw||0) > 0, align: 'end', anchor: 'end', offset: 6, backgroundColor: (ctx) => { const c = ctx.dataset.borderColor || color || '#0d6efd'; return (window.hexToRgba?window.hexToRgba(c, isDark ? 0.28 : 0.16):c); }, borderColor: (ctx) => ctx.dataset.borderColor || color || '#0d6efd', borderWidth: 1, borderRadius: 10, color: isDark ? '#fff' : '#0b1320', padding: { top: 2, bottom: 2, left: 6, right: 6 }, font: { weight: '600' }, formatter: v => `${v}` }, title: { display: false } } }, plugins: [ChartDataLabels] }; }
  function ensureChart(id, cfg){ const ctx = document.getElementById(id); if (!ctx) return; if (charts[id]) { charts[id].destroy(); } charts[id] = new Chart(ctx, cfg); }
  function renderHeatmap1D(canvasId, counts){ const c = document.getElementById(canvasId); if (!c) return; const dpr = window.devicePixelRatio || 1; const width = c.clientWidth, height = c.clientHeight; c.width = Math.max(1, width * dpr); c.height = Math.max(1, height * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0,0,width,height); const max = Math.max(1, ...counts); const pad = 6; const cellW = (width - pad*2) / 24; const cellH = (height - pad*2); for (let h=0; h<24; h++){ const v = counts[h]; const t = v / max; const r = 20, gC = Math.round(120+100*t), b = Math.round(255-80*(1-t)); g.fillStyle = `rgba(${r},${gC},${b},${0.25 + 0.6*t})`; const x = pad + h*cellW, y = pad; g.fillRect(x, y, Math.max(1,cellW-2), Math.max(1,cellH)); } g.fillStyle = 'rgba(127,127,127,0.9)'; g.font = '10px Roboto, Arial'; for (let h=0; h<24; h+=2){ const x = pad + h*cellW + cellW/2 - 8; g.fillText(String(h).padStart(2,'0'), x, height-4); } }
  async function renderItineraryCharts() { const data = await loadItinerary(); if (!selectedDate) selectedDate = pickBestDate(data); const input = document.getElementById('it-day-input'); if (input && input.value !== selectedDate) input.value = selectedDate; const agg = aggregateDay(data, selectedDate); lastAgg = agg; ensureChart('paxArrivalsChart',    makeBarConfig(H_LABELS, agg.paxArr,  'rgba(0,123,255,0.75)', 'Llegadas Pax')); ensureChart('paxDeparturesChart',  makeBarConfig(H_LABELS, agg.paxDep,  'rgba(0,180,120,0.75)', 'Salidas Pax')); ensureChart('cargoArrivalsChart',  makeBarConfig(H_LABELS, agg.carArr,  'rgba(255,140,0,0.75)', 'Llegadas Carga')); ensureChart('cargoDeparturesChart',makeBarConfig(H_LABELS, agg.carDep,  'rgba(200,80,0,0.75)', 'Salidas Carga')); const paxSum = agg.paxArr.map((v,i)=> v + (agg.paxDep[i]||0)); const carSum = agg.carArr.map((v,i)=> v + (agg.carDep[i]||0)); renderHeatmap1D('heatmapPaxDay', paxSum); renderHeatmap1D('heatmapCargoDay', carSum); renderTopHoursLists(agg); }
  function bindDayControls(){ const input = document.getElementById('it-day-input'); const prev  = document.getElementById('it-day-prev'); const next  = document.getElementById('it-day-next'); const today = document.getElementById('it-day-today'); if (input){ input.addEventListener('change', () => { if (!input.value) return; selectedDate = input.value; renderItineraryCharts(); }); } function shift(days){ const d = input && input.value ? new Date(input.value) : new Date(selectedDate || Date.now()); d.setDate(d.getDate() + days); selectedDate = toYMD(d); if (input) input.value = selectedDate; renderItineraryCharts(); } if (prev) prev.addEventListener('click', ()=> shift(-1)); if (next) next.addEventListener('click', ()=> shift(+1)); if (today) today.addEventListener('click', ()=> { selectedDate = toYMD(new Date()); if (input) input.value = selectedDate; renderItineraryCharts(); }); }
  document.addEventListener('DOMContentLoaded', async () => { bindDayControls(); const paxTop = document.getElementById('pax-topN'); if (paxTop) paxTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); }); const carTop = document.getElementById('cargo-topN'); if (carTop) carTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); }); const sec = document.getElementById('itinerario-section'); if (sec && sec.classList.contains('active')) renderItineraryCharts(); });
  document.addEventListener('click', (e)=>{ const el = e.target.closest('[data-section="itinerario"]'); if (el) { setTimeout(()=>renderItineraryCharts(), 50); } });
  const themeBtn = document.getElementById('theme-toggler'); if (themeBtn) themeBtn.addEventListener('click', ()=> setTimeout(()=>renderItineraryCharts(), 250));
})();
