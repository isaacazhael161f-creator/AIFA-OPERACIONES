// Itinerario (gráficas del día) extraído de script.js — sin cambios en comportamiento
;(function(){
  const sec = document.getElementById('itinerario-section');
  if (!sec) return;
  const H_LABELS = Array.from({length:24}, (_,i)=> String(i).padStart(2,'0'));
  let itData = null;
  let selectedDate = null; // 'yyyy-mm-dd'
  let lastAgg = null;
  // Por defecto, operar de forma independiente (sin sincronizar con filtros externos)
  if (typeof window.syncItineraryFiltersToCharts === 'undefined') {
    window.syncItineraryFiltersToCharts = false;
  }
  
  // Exponer función para "destruir": limpiar canvases
  window.destroyItinerarioCharts = function() {
    console.log('🗑️ Limpiando canvases de itinerario...');
    const canvasIds = ['paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart', 'heatmapPaxDay', 'heatmapCargoDay'];
    canvasIds.forEach(id => {
      const c = document.getElementById(id);
      if (!c) return;
      const g = c.getContext && c.getContext('2d');
      if (!g) return;
      g.clearRect(0,0,c.width||c.clientWidth||0,c.height||c.clientHeight||0);
    });
    console.log('✅ Canvases limpios');
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
  async function loadItinerary() {
    if (itData) return itData;
    try {
      const res = await fetch('data/itinerario.json', { cache:'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      itData = await res.json();
      if (!Array.isArray(itData)) itData = [];
      if (!itData.length && Array.isArray(window.allFlightsData) && window.allFlightsData.length) {
        console.warn('Itinerario: fetch vacío; usando allFlightsData como respaldo');
        itData = window.allFlightsData;
      }
      return itData;
    } catch(e){
      console.warn('loadItinerary error, usando respaldo global si existe', e);
      if (Array.isArray(window.allFlightsData) && window.allFlightsData.length) {
        itData = window.allFlightsData;
        return itData;
      }
      return [];
    }
  }
  function pickBestDate(data){ const todayYMD = toYMD(new Date()); const todayDMY = ymdToDMY(todayYMD); const hasToday = data.some(f => norm(f.fecha_llegada)===norm(todayDMY) || norm(f.fecha_salida)===norm(todayDMY)); if (hasToday) return todayYMD; const freq = new Map(); for (const f of data){ const d1 = norm(f.fecha_llegada); const d2 = norm(f.fecha_salida); if (d1) freq.set(d1, (freq.get(d1)||0)+1); if (d2) freq.set(d2, (freq.get(d2)||0)+1); } let topDMY = null, topN = -1; for (const [d, n] of freq) { if (n>topN){ topN=n; topDMY=d; } } if (topDMY){ const dt = parseDMY(topDMY); if (dt) return toYMD(dt); } return todayYMD; }
  function aggregateDay(data, ymd){ const dmy = ymdToDMY(ymd); const paxArr = Array(24).fill(0), paxDep = Array(24).fill(0); const carArr = Array(24).fill(0), carDep = Array(24).fill(0); for (const f of data){ if (norm(f.fecha_llegada) === norm(dmy)){ const h = hourFromHHMM(f.hora_llegada); if (h!=null){ if (isPassenger(f)) paxArr[h]++; else carArr[h]++; } } if (norm(f.fecha_salida) === norm(dmy)){ const h2 = hourFromHHMM(f.hora_salida); if (h2!=null){ if (isPassenger(f)) paxDep[h2]++; else carDep[h2]++; } } } return { paxArr, paxDep, carArr, carDep }; }
  function renderTopHoursLists(agg){ const topSelPax = document.getElementById('pax-topN'); const topSelCargo = document.getElementById('cargo-topN'); const topNPax = topSelPax ? parseInt(topSelPax.value,10) : 5; const topNCargo = topSelCargo ? parseInt(topSelCargo.value,10) : 5; const mkTop = (arr, n) => { const list = arr.map((v,i)=>({h:i,v})).filter(x=>x.v>0).sort((a,b)=> b.v - a.v || a.h - b.h).slice(0,n); return list; }; const fmt = (h,v) => `${String(h).padStart(2,'0')}:00–${String(h).padStart(2,'0')}:59 — ${v} vuelos`; const fill = (id, items) => { const el = document.getElementById(id); if (!el) return; if (!items.length) { el.innerHTML = '<li class="text-muted">Sin datos</li>'; return; } el.innerHTML = items.map(it=>`<li>${fmt(it.h,it.v)}</li>`).join(''); }; fill('pax-top-arr', mkTop(agg.paxArr, topNPax)); fill('pax-top-dep', mkTop(agg.paxDep, topNPax)); fill('cargo-top-arr', mkTop(agg.carArr, topNCargo)); fill('cargo-top-dep', mkTop(agg.carDep, topNCargo)); }
  // Dibujador de barras simple en canvas (sin Chart.js)
  function drawBars(canvasId, labels, values, color, title){
    const c = document.getElementById(canvasId);
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 640;
    const h = c.clientHeight || 360;
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0,0,w,h);

    // Márgenes y estilos
  // Más margen inferior en móvil para permitir todas las etiquetas
  const isMobile = (w < 576);
  const margin = { top: 28, right: 12, bottom: isMobile ? 44 : 28, left: 34 };
    const innerW = Math.max(1, w - margin.left - margin.right);
    const innerH = Math.max(1, h - margin.top - margin.bottom);

    // Título
    if (title) {
      g.fillStyle = '#495057';
      g.font = '600 12px Roboto, Arial';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(title, margin.left, 6);
    }

    // Ejes
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    // Eje X e Y
    const x0 = margin.left, y0 = h - margin.bottom;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + innerW, y0);
    g.moveTo(x0, y0);
    g.lineTo(x0, y0 - innerH);
    g.stroke();

    // Escala Y
    const maxV = Math.max(1, Math.max(...values));
    const nice = niceMax(maxV);
    const tickCount = 4;
    const tickStep = nice / tickCount;
    g.fillStyle = '#6c757d';
    g.font = '10px Roboto, Arial';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let i=0; i<=tickCount; i++){
      const v = i * tickStep;
      const y = y0 - (v / nice) * innerH;
      g.strokeStyle = 'rgba(0,0,0,0.06)';
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x0 + innerW, y);
      g.stroke();
      g.fillStyle = '#6c757d';
      g.fillText(String(Math.round(v)), x0 - 4, y);
    }

    // Barras
    const n = labels.length;
    const gap = 2; // separación mínima
    const barW = Math.max(1, (innerW / n) - gap);
    g.fillStyle = color;
    for (let i=0; i<n; i++){
      const v = values[i] || 0;
      const bh = (v / nice) * innerH;
      const x = x0 + i * (innerW / n) + gap/2;
      const y = y0 - bh;
      // barra con esquinas ligeramente redondeadas
      roundRect(g, x, y, Math.max(1, barW), Math.max(1, bh), 3);
      g.fill();
    }

    // Etiquetas X: en móvil todas las horas con ligera rotación; en desktop cada 2 horas
    g.fillStyle = '#6c757d';
    g.font = '10px Roboto, Arial';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const step = isMobile ? 1 : 2;
    for (let i=0; i<n; i+=step){
      const x = x0 + i * (innerW / n) + (innerW / n)/2;
      if (isMobile) {
        g.save();
        // rotación suave para evitar encimado
        g.translate(x, y0 + 4);
        g.rotate(-Math.PI/6); // ~ -30°
        g.fillText(labels[i], 0, 0);
        g.restore();
      } else {
        g.fillText(labels[i], x, y0 + 4);
      }
    }
  }

  function roundRect(g, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    g.beginPath();
    g.moveTo(x+rr, y);
    g.lineTo(x+w-rr, y);
    g.quadraticCurveTo(x+w, y, x+w, y+rr);
    g.lineTo(x+w, y+h-rr);
    g.quadraticCurveTo(x+w, y+h, x+w-rr, y+h);
    g.lineTo(x+rr, y+h);
    g.quadraticCurveTo(x, y+h, x, y+h-rr);
    g.lineTo(x, y+rr);
    g.quadraticCurveTo(x, y, x+rr, y);
    g.closePath();
  }

  function niceMax(maxV){
    if (maxV <= 5) return 5;
    if (maxV <= 10) return 10;
    if (maxV <= 20) return 20;
    if (maxV <= 50) return 50;
    if (maxV <= 100) return 100;
    const pow10 = Math.pow(10, String(Math.floor(Math.log10(maxV))));
    return Math.ceil(maxV / pow10) * pow10;
  }
  function renderHeatmap1D(canvasId, counts){ const c = document.getElementById(canvasId); if (!c) return; const dpr = window.devicePixelRatio || 1; const width = c.clientWidth, height = c.clientHeight; c.width = Math.max(1, width * dpr); c.height = Math.max(1, height * dpr); const g = c.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0,0,width,height); const max = Math.max(1, ...counts); const pad = 6; const cellW = (width - pad*2) / 24; const cellH = (height - pad*2); for (let h=0; h<24; h++){ const v = counts[h]; const t = v / max; const r = 20, gC = Math.round(120+100*t), b = Math.round(255-80*(1-t)); g.fillStyle = `rgba(${r},${gC},${b},${0.25 + 0.6*t})`; const x = pad + h*cellW, y = pad; g.fillRect(x, y, Math.max(1,cellW-2), Math.max(1,cellH)); } g.fillStyle = 'rgba(127,127,127,0.9)'; g.font = '10px Roboto, Arial'; for (let h=0; h<24; h+=2){ const x = pad + h*cellW + cellW/2 - 8; g.fillText(String(h).padStart(2,'0'), x, height-4); } }
  async function renderItineraryCharts() {
    const base = await loadItinerary();
    // Sincronizar con filtros activos del Inicio si está habilitado (por defecto sí)
    const sync = (window.syncItineraryFiltersToCharts !== false);
    const fState = window.currentItineraryFilterState || {};
    const preHour = window.currentItineraryPreHour || {};
    let data = base;
    // Determinar fecha
    if (!selectedDate) selectedDate = (fState.selectedDate || pickBestDate(base));
    // UI date control
    const input = document.getElementById('it-day-input');
    if (input && input.value !== selectedDate) input.value = selectedDate;
    // Construir subconjunto del día, opcionalmente desde el preHour filtrado
    const dayDMY = ymdToDMY(selectedDate);
    if (sync && preHour.combined && Array.isArray(preHour.combined) && preHour.combined.length) {
      // Reducir al día seleccionado sin colapsar por hora
      data = preHour.combined.filter(f => (norm(f.fecha_llegada)===norm(dayDMY)) || (norm(f.fecha_salida)===norm(dayDMY)));
    } else {
      // Asegurar día desde la fuente base
      data = base.filter(f => (norm(f.fecha_llegada)===norm(dayDMY)) || (norm(f.fecha_salida)===norm(dayDMY)));
    }
    // Agregar por hora y dibujar
    const totalFlights = Array.isArray(data) ? data.length : 0;
    try {
      const badge = document.getElementById('it-stats-badge');
      if (badge) badge.textContent = totalFlights ? `(${totalFlights} vuelos)` : '(0 vuelos)';
    } catch(_) {}
  const agg = aggregateDay(data, selectedDate);
  lastAgg = agg;
  drawBars('paxArrivalsChart',     H_LABELS, agg.paxArr, 'rgba(0,123,255,0.85)', 'Llegadas Pax');
  drawBars('paxDeparturesChart',   H_LABELS, agg.paxDep, 'rgba(0,180,120,0.85)', 'Salidas Pax');
  drawBars('cargoArrivalsChart',   H_LABELS, agg.carArr, 'rgba(255,140,0,0.85)', 'Llegadas Carga');
  drawBars('cargoDeparturesChart', H_LABELS, agg.carDep, 'rgba(200,80,0,0.85)', 'Salidas Carga');
    const paxSum = agg.paxArr.map((v,i)=> v + (agg.paxDep[i]||0));
    const carSum = agg.carArr.map((v,i)=> v + (agg.carDep[i]||0));
    renderHeatmap1D('heatmapPaxDay', paxSum);
    renderHeatmap1D('heatmapCargoDay', carSum);
    renderTopHoursLists(agg);
    // Marcar banderas de renderizado exitoso para diagnóstico externo
    window._itineraryChartsOk = true;
  }
  function bindDayControls(){ const input = document.getElementById('it-day-input'); const prev  = document.getElementById('it-day-prev'); const next  = document.getElementById('it-day-next'); const today = document.getElementById('it-day-today'); if (input){ input.addEventListener('change', () => { if (!input.value) return; selectedDate = input.value; renderItineraryCharts(); }); } function shift(days){ const d = input && input.value ? new Date(input.value) : new Date(selectedDate || Date.now()); d.setDate(d.getDate() + days); selectedDate = toYMD(d); if (input) input.value = selectedDate; renderItineraryCharts(); } if (prev) prev.addEventListener('click', ()=> shift(-1)); if (next) next.addEventListener('click', ()=> shift(+1)); if (today) today.addEventListener('click', ()=> { selectedDate = toYMD(new Date()); if (input) input.value = selectedDate; renderItineraryCharts(); }); }
  document.addEventListener('DOMContentLoaded', async () => { bindDayControls(); const paxTop = document.getElementById('pax-topN'); if (paxTop) paxTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); }); const carTop = document.getElementById('cargo-topN'); if (carTop) carTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); }); const sec = document.getElementById('itinerario-section'); if (sec && sec.classList.contains('active')) renderItineraryCharts(); });
  document.addEventListener('click', (e)=>{ const el = e.target.closest('[data-section="itinerario"]'); if (el) { setTimeout(()=>renderItineraryCharts(), 50); } });
  const themeBtn = document.getElementById('theme-toggler'); if (themeBtn) themeBtn.addEventListener('click', ()=> setTimeout(()=>renderItineraryCharts(), 250));
})();
