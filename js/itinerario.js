// Itinerario (gráficas del día) extraído de script.js — sin cambios en comportamiento
;(function(){
  const sec = document.getElementById('itinerario-section');
  if (!sec) return;
  const H_LABELS = Array.from({length:24}, (_,i)=> String(i).padStart(2,'0'));
  let itData = null;
  let selectedDate = null; // 'yyyy-mm-dd'
  let lastAgg = null;
  const SCOPE_PAX = 'pax';
  const SCOPE_CARGO = 'cargo';
  const scopeLabels = { [SCOPE_PAX]: 'Pasajeros', [SCOPE_CARGO]: 'Carga' };
  const insightsCache = { [SCOPE_PAX]: null, [SCOPE_CARGO]: null };
  const DEFAULT_AIRLINE_LABEL = 'Sin aerolínea';
  const DEFAULT_LOGO_REGEX = /default-airline-logo/i;
  const MOVEMENT_META = {
    'Llegada': { icon: 'fa-plane-arrival', cls: 'movement-arrival', label: 'Llegada' },
    'Salida': { icon: 'fa-plane-departure', cls: 'movement-departure', label: 'Salida' }
  };
  const MOVEMENT_META_DEFAULT = { icon: 'fa-plane', cls: 'movement-generic', label: 'Operación' };
  const PEAK_RESULTS_PLACEHOLDER = '<div class="intel-flight-placeholder text-center text-muted small">Selecciona una aerolínea u horario para ver los vuelos relacionados.</div>';
  function isChartsPaneActive(){
    const paneIds = ['graficas-itinerario-pane', 'radar-operativo-pane'];
    return paneIds.some(id => {
      const pane = document.getElementById(id);
      return pane && pane.classList.contains('show') && pane.classList.contains('active');
    });
  }
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
  function computeItineraryInsights(data, ymd, scope){
    const dmy = ymdToDMY(ymd);
    const dmyNorm = norm(dmy);
    const isPassengerScope = scope === SCOPE_PAX;
    const totals = { operations:0, arrivals:0, departures:0, airlines:0 };
    const hourHistogram = Array(24).fill(0);
    const airlines = new Map();
    const origins = new Map();
    const destinations = new Map();
    const operations = [];
    const ensureAirline = (label)=>{
      const raw = (label || 'Sin aerolínea').toString().trim() || 'Sin aerolínea';
      const key = norm(raw) || 'sin-aerolinea';
      if (!airlines.has(key)) {
        airlines.set(key, { key, name: raw, total:0, arrivals:0, departures:0, hourly:Array(24).fill(0) });
      }
      return airlines.get(key);
    };
    const bumpMap = (map, label)=>{
      const clean = (label || '').toString().trim();
      if (!clean) return;
      const mapKey = clean.toLowerCase();
      if (!map.has(mapKey)) map.set(mapKey, { label: clean, value: 0 });
      map.get(mapKey).value++;
    };
    for (const flight of data){
      const isPassengerFlight = isPassenger(flight);
      if (isPassengerFlight !== isPassengerScope) continue;
      const airlineStats = ensureAirline(flight.aerolinea || flight['aerolínea'] || flight.airline);
      const arrivalMatch = norm(flight.fecha_llegada) === dmyNorm;
      const departureMatch = norm(flight.fecha_salida) === dmyNorm;
      if (arrivalMatch){
        totals.operations++; totals.arrivals++; airlineStats.total++; airlineStats.arrivals++;
        const h = hourFromHHMM(flight.hora_llegada);
        if (h!=null){ hourHistogram[h]++; airlineStats.hourly[h] = (airlineStats.hourly[h]||0)+1; }
        bumpMap(origins, flight.origen || flight.origin);
        operations.push(buildOperationRecord({
          airlineName: airlineStats.name,
          airlineKey: airlineStats.key,
          movement: 'Llegada',
          hour: h,
          time: flight.hora_llegada,
          flightNumber: flight.vuelo_llegada,
          origin: flight.origen,
          destination: 'AIFA',
          position: flight.posicion,
          belt: flight.banda_reclamo
        }));
      }
      if (departureMatch){
        totals.operations++; totals.departures++; airlineStats.total++; airlineStats.departures++;
        const h2 = hourFromHHMM(flight.hora_salida);
        if (h2!=null){ hourHistogram[h2]++; airlineStats.hourly[h2] = (airlineStats.hourly[h2]||0)+1; }
        bumpMap(destinations, flight.destino || flight.destination);
        operations.push(buildOperationRecord({
          airlineName: airlineStats.name,
          airlineKey: airlineStats.key,
          movement: 'Salida',
          hour: h2,
          time: flight.hora_salida,
          flightNumber: flight.vuelo_salida,
          origin: 'AIFA',
          destination: flight.destino,
          position: flight.posicion,
          belt: flight.banda_reclamo
        }));
      }
    }
    const busiest = hourHistogram.reduce((acc,count,h)=>{
      if (count>acc.count) return { hour:h, count };
      if (count===acc.count && count>0 && h<acc.hour) return { hour:h, count };
      return acc;
    }, { hour:null, count:0 });
    const activeAirlines = Array.from(airlines.values()).filter(a=>a.total>0);
    totals.airlines = activeAirlines.length;
    const airlinePeaks = activeAirlines
      .map(stat => {
        const peak = stat.hourly.reduce((acc,count,h)=>{
          if (count>acc.count) return { hour:h, count };
          if (count===acc.count && count>0 && h<acc.hour) return { hour:h, count };
          return acc;
        }, { hour:null, count:0 });
        return { name: stat.name, key: stat.key, total: stat.total, arrivals: stat.arrivals, departures: stat.departures, peakHour: peak.hour, peakCount: peak.count };
      })
      .sort((a,b)=> b.total - a.total || a.name.localeCompare(b.name))
      .slice(0,6);
    const toRankedList = (map)=> Array.from(map.values()).sort((a,b)=> b.value - a.value || a.label.localeCompare(b.label)).slice(0,5);
    const topOrigins = toRankedList(origins);
    const topDestinations = toRankedList(destinations);
    return { totals, airlinePeaks, topOrigins, topDestinations, busiestHour: busiest, operations };
  }
  function buildOperationRecord({ airlineName, airlineKey, movement, hour, time, flightNumber, origin, destination, position, belt }){
    const safeHour = (typeof hour === 'number' && Number.isFinite(hour)) ? hour : null;
    const timeLabel = (time || '').toString().trim() || (safeHour!=null ? `${String(safeHour).padStart(2,'0')}:00` : '—');
    return {
      airline: airlineName || 'Sin aerolínea',
      airlineKey: airlineKey || norm(airlineName || ''),
      movement,
      hour: safeHour,
      timeLabel,
      flightNumber: (flightNumber || '').toString().trim() || '—',
      origin: (origin || '—'),
      destination: (destination || '—'),
      position: position || '',
      belt: belt || ''
    };
  }
  function renderTopHoursLists(agg){
    const topSelPax = document.getElementById('pax-topN');
    const topSelCargo = document.getElementById('cargo-topN');
    const topNPax = topSelPax ? parseInt(topSelPax.value,10) : 5;
    const topNCargo = topSelCargo ? parseInt(topSelCargo.value,10) : 5;
    const mkTop = (arr, n) => arr
      .map((v,i)=>({h:i,v}))
      .filter(x=>x.v>0)
      .sort((a,b)=> b.v - a.v || a.h - b.h)
      .slice(0,n);
    const renderList = (containerId, values, topN, scope, movement)=>{
      const el = document.getElementById(containerId);
      if (!el) return;
      const items = mkTop(values, topN);
      if (!items.length){
        el.innerHTML = '<li class="text-muted">Sin datos</li>';
        return;
      }
      el.innerHTML = items.map(({h, v}) => {
        const hourLabel = String(h).padStart(2,'0');
        const rangeLabel = `${hourLabel}:00–${hourLabel}:59`;
        return `<li>
          <button type="button" class="btn btn-link p-0 text-start w-100 top-hour-trigger" data-top-hour data-scope="${scope}" data-movement="${movement}" data-hour="${h}">
            <strong>${rangeLabel}</strong>
            <span class="text-muted ms-1">(${v} vuelos)</span>
          </button>
        </li>`;
      }).join('');
    };
    renderList('pax-top-arr', agg.paxArr, topNPax, SCOPE_PAX, 'Llegada');
    renderList('pax-top-dep', agg.paxDep, topNPax, SCOPE_PAX, 'Salida');
    renderList('cargo-top-arr', agg.carArr, topNCargo, SCOPE_CARGO, 'Llegada');
    renderList('cargo-top-dep', agg.carDep, topNCargo, SCOPE_CARGO, 'Salida');
  }
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
  function escapeAttr(text){
    return (text || '').toString().replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function escapeHtml(text){
    return (text || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function getAirlineInitials(name){
    const safe = (name || '').trim();
    if (!safe) return 'AIFA';
    const tokens = safe.split(/\s+/).filter(Boolean);
    const joined = tokens.map(word => word[0]).join('');
    const fallback = (joined || safe).toUpperCase();
    return fallback.slice(0,3);
  }
  function getAirlineLogoMarkup(airlineName, sizeClass='sm'){
    if (!airlineName || typeof window.getAirlineLogoCandidates !== 'function') return '';
    const candidates = window.getAirlineLogoCandidates(airlineName) || [];
    if (!candidates.length) return '';
    const preferred = candidates.find(path => !DEFAULT_LOGO_REGEX.test(path)) || candidates[0];
    if (!preferred) return '';
    const dataCands = candidates.join('|');
    return `<img class="airline-logo ${sizeClass}" src="${escapeAttr(preferred)}" alt="Logo ${escapeAttr(airlineName)}" data-cands="${escapeAttr(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
  }
  function renderAirlineTableCell(name){
    const safeName = (name || DEFAULT_AIRLINE_LABEL).trim() || DEFAULT_AIRLINE_LABEL;
    const logo = getAirlineLogoMarkup(safeName, 'lg');
    if (logo){
      return `<div class="intel-airline-cell" title="${escapeAttr(safeName)}">${logo}<span class="visually-hidden">${escapeHtml(safeName)}</span></div>`;
    }
    return `<div class="intel-airline-cell" title="${escapeAttr(safeName)}"><span class="intel-airline-badge">${escapeHtml(getAirlineInitials(safeName))}</span><span class="visually-hidden">${escapeHtml(safeName)}</span></div>`;
  }
  function renderFlightCarrierRow(name){
    const safeName = (name || DEFAULT_AIRLINE_LABEL).trim() || DEFAULT_AIRLINE_LABEL;
    const logo = getAirlineLogoMarkup(safeName, 'xl');
    const visual = logo || `<span class="intel-airline-badge xl">${escapeHtml(getAirlineInitials(safeName))}</span>`;
    return `<div class="intel-flight-carrier" title="${escapeAttr(safeName)}">${visual}<span class="visually-hidden">${escapeHtml(safeName)}</span></div>`;
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
    hidePeakResults();
    // Agregar por hora y dibujar
    const totalFlights = Array.isArray(data) ? data.length : 0;
    try {
      const badge = document.getElementById('it-stats-badge');
      if (badge) badge.textContent = totalFlights ? `(${totalFlights} vuelos)` : '(0 vuelos)';
    } catch(_) {}
    insightsCache[SCOPE_PAX] = computeItineraryInsights(data, selectedDate, SCOPE_PAX);
    insightsCache[SCOPE_CARGO] = computeItineraryInsights(data, selectedDate, SCOPE_CARGO);
    applyIntelligenceForScope(getActiveChartsScope());
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
  function renderInsightCards(scope, insights){
    if (!insights || !insights.totals) return;
    const fmt = (n)=> typeof n === 'number' ? n.toLocaleString('es-MX') : '-';
    const setText = (id, text)=>{ const el = document.getElementById(id); if (el) el.textContent = text; };
    const share = (part, total)=>{
      if (!total) return '0% del total';
      return `${Math.round((part/total)*100)}% del total`;
    };
    const scopeLabel = scopeLabels[scope] || '—';
    const dayLabel = selectedDate ? ymdToDMY(selectedDate) : '';
    setText('it-intelligence-scope-badge', scopeLabel);
    setText('it-metric-total', fmt(insights.totals.operations));
    setText('it-metric-total-detail', dayLabel ? `${scopeLabel} · ${dayLabel}` : scopeLabel);
    setText('it-metric-arrivals', fmt(insights.totals.arrivals));
    setText('it-metric-arrivals-detail', share(insights.totals.arrivals, insights.totals.operations));
    setText('it-metric-departures', fmt(insights.totals.departures));
    setText('it-metric-departures-detail', share(insights.totals.departures, insights.totals.operations));
    const airlinesLabel = insights.totals.airlines ? `${fmt(insights.totals.airlines)} aerolíneas activas` : 'Sin aerolíneas activas';
    setText('it-metric-airlines', fmt(insights.totals.airlines));
    const busy = insights.busiestHour;
    if (busy && busy.count){
      setText('it-metric-busiest-hour', `Hora pico ${String(busy.hour).padStart(2,'0')}:00 (${busy.count} ops)`);
    } else {
      setText('it-metric-busiest-hour', 'Sin hora pico registrada');
    }
    const airlinesLabelEl = document.getElementById('it-metric-airlines');
    if (airlinesLabelEl) airlinesLabelEl.title = airlinesLabel;
  }
  function renderAirlinePeakTable(scope, rows){
    const tbody = document.getElementById('it-peak-airlines-table');
    if (!tbody) return;
    if (!rows || !rows.length){
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted small">Sin operaciones registradas para esta fecha.</td></tr>';
      return;
    }
    const fmt = (n)=> typeof n === 'number' ? n.toLocaleString('es-MX') : '-';
    tbody.innerHTML = rows.map(row => {
      const hourLabel = row.peakHour==null || !row.peakCount
        ? '<span class="text-muted">Sin registros</span>'
        : `<button type="button" class="btn btn-link p-0" data-peak-flight data-scope="${scope}" data-airline="${escapeAttr(row.name)}" data-airline-key="${escapeAttr(row.key || norm(row.name))}" data-hour="${row.peakHour}"><strong>${String(row.peakHour).padStart(2,'0')}:00</strong> · ${fmt(row.peakCount)} ops</button>`;
      return `<tr>
        <td class="text-center">${renderAirlineTableCell(row.name)}</td>
        <td class="text-center fw-semibold">${fmt(row.total)}</td>
        <td class="text-center text-success">${fmt(row.arrivals)}</td>
        <td class="text-center text-info">${fmt(row.departures)}</td>
        <td>${hourLabel}</td>
      </tr>`;
    }).join('');
  }
  function renderTopConnections(scope, origins, destinations){
    const scopeLabel = scopeLabels[scope] || '—';
    const fillList = (id, items)=>{
      const el = document.getElementById(id);
      if (!el) return;
      if (!items || !items.length){
        el.innerHTML = '<li class="text-muted">Sin datos</li>';
        return;
      }
      el.innerHTML = items.map(item => `<li><strong>${item.label}</strong> · ${item.value} vuelos</li>`).join('');
    };
    const originsTitle = document.getElementById('it-top-origins-title');
    if (originsTitle) originsTitle.textContent = `Principales orígenes (${scopeLabel})`;
    const destinationsTitle = document.getElementById('it-top-destinations-title');
    if (destinationsTitle) destinationsTitle.textContent = `Principales destinos (${scopeLabel})`;
    fillList('it-top-origins', origins);
    fillList('it-top-destinations', destinations);
  }
  function getActiveChartsScope(){
    const cargoPane = document.getElementById('carga-grafica-pane');
    if (cargoPane && cargoPane.classList.contains('show') && cargoPane.classList.contains('active')) return SCOPE_CARGO;
    return SCOPE_PAX;
  }
  function applyIntelligenceForScope(scope){
    const targetScope = scope === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const insights = insightsCache[targetScope];
    if (!insights) return;
    renderInsightCards(targetScope, insights);
    renderAirlinePeakTable(targetScope, insights.airlinePeaks);
    renderTopConnections(targetScope, insights.topOrigins, insights.topDestinations);
    hidePeakResults();
  }
  function hidePeakResults(){
    const card = document.getElementById('it-peak-results-card');
    const body = document.getElementById('it-peak-results-body');
    const title = document.getElementById('it-peak-results-title');
    const subtitle = document.getElementById('it-peak-results-subtitle');
    if (body) body.innerHTML = PEAK_RESULTS_PLACEHOLDER;
    if (title) title.textContent = '';
    if (subtitle) subtitle.textContent = 'Selecciona una fila u hora para detallar los vuelos.';
    if (card) card.classList.add('d-none');
  }
  function showPeakFlights(scope, airlineName, airlineKey, hour){
    const targetScope = scope === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const insights = insightsCache[targetScope];
    if (!insights) return;
    const key = airlineKey || norm(airlineName || '');
    const filtered = (insights.operations || []).filter(op => op.airlineKey === key && (hour==null ? true : op.hour === hour));
    renderPeakResults(targetScope, airlineName, hour, filtered);
  }
  function showTopHourFlights(scope, movement, hour){
    const targetScope = scope === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const insights = insightsCache[targetScope];
    if (!insights || hour==null || !Number.isFinite(hour)) return;
    const movementLabel = movement === 'Salida' ? 'Salida' : 'Llegada';
    const flights = (insights.operations || []).filter(op => op.movement === movementLabel && op.hour === hour);
    const hourText = String(hour).padStart(2,'0');
    const rangeLabel = `${hourText}:00–${hourText}:59`;
    const scopeLabel = scopeLabels[targetScope] || 'Operaciones';
    renderPeakResults(targetScope, `${movementLabel}s ${rangeLabel}`, hour, flights, {
      titleText: `${movementLabel}s · ${rangeLabel} · ${scopeLabel}`,
      subtitleText: `Operaciones de ${movementLabel.toLowerCase()} registradas entre ${rangeLabel}.`
    });
  }
  function renderPeakResults(scope, label, hour, flights, options = {}){
    const card = document.getElementById('it-peak-results-card');
    const body = document.getElementById('it-peak-results-body');
    const title = document.getElementById('it-peak-results-title');
    const subtitle = document.getElementById('it-peak-results-subtitle');
    if (!card || !body) return;
    const scopeLabel = scopeLabels[scope] || '—';
    const titleText = options.titleText || `${label || 'Operaciones'} · ${scopeLabel}`;
    if (title) title.textContent = titleText;
    const hourLabel = hour==null ? 'todas las horas del día' : `${String(hour).padStart(2,'0')}:00 hrs`;
    const subtitleText = options.subtitleText || `Operaciones registradas en ${hourLabel}.`;
    if (subtitle) subtitle.textContent = subtitleText;
    if (!flights.length){
      body.innerHTML = '<div class="intel-flight-placeholder text-center text-muted small">No encontramos vuelos para esa combinación.</div>';
    } else {
      body.innerHTML = flights.map(renderFlightCard).join('');
    }
    card.classList.remove('d-none');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderFlightCard(op){
    const movementLabel = (op.movement || 'Operación').trim() || 'Operación';
    const movementMeta = MOVEMENT_META[movementLabel] || MOVEMENT_META_DEFAULT;
    const origin = escapeHtml(op.origin || '—');
    const destination = escapeHtml(op.destination || '—');
    const carrierRow = renderFlightCarrierRow(op.airline);
    const tags = [];
    if (op.position) tags.push(`<span class="intel-flight-tag"><i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(op.position)}</span>`);
    if (op.belt) tags.push(`<span class="intel-flight-tag"><i class="fas fa-suitcase-rolling me-1"></i>Banda ${escapeHtml(op.belt)}</span>`);
    if (!tags.length) {
      tags.push('<span class="intel-flight-tag intel-flight-tag-muted"><i class="fas fa-info-circle me-1"></i>Sin posición asignada</span>');
    }
    return `<article class="intel-flight-card">
      <div class="intel-flight-header">
        <span class="intel-movement-chip ${movementMeta.cls}"><i class="fas ${movementMeta.icon} me-1"></i>${escapeHtml(movementMeta.label)}</span>
        <div class="intel-flight-number">Vuelo <strong>${escapeHtml(op.flightNumber || '—')}</strong></div>
        <div class="intel-flight-time"><i class="fas fa-clock me-1"></i>${escapeHtml(op.timeLabel || 'Sin hora')}</div>
      </div>
      ${carrierRow}
      <div class="intel-flight-body">
        <div class="intel-flight-route">
          <span class="route-airport">${origin}</span>
          <span class="route-arrow" aria-hidden="true"><i class="fas fa-arrow-right"></i></span>
          <span class="route-airport">${destination}</span>
        </div>
        <div class="intel-flight-meta">${tags.join('')}</div>
      </div>
    </article>`;
  }
  function bindDayControls(){ const input = document.getElementById('it-day-input'); const prev  = document.getElementById('it-day-prev'); const next  = document.getElementById('it-day-next'); const today = document.getElementById('it-day-today'); if (input){ input.addEventListener('change', () => { if (!input.value) return; selectedDate = input.value; renderItineraryCharts(); }); } function shift(days){ const d = input && input.value ? new Date(input.value) : new Date(selectedDate || Date.now()); d.setDate(d.getDate() + days); selectedDate = toYMD(d); if (input) input.value = selectedDate; renderItineraryCharts(); } if (prev) prev.addEventListener('click', ()=> shift(-1)); if (next) next.addEventListener('click', ()=> shift(+1)); if (today) today.addEventListener('click', ()=> { selectedDate = toYMD(new Date()); if (input) input.value = selectedDate; renderItineraryCharts(); }); }
  document.addEventListener('DOMContentLoaded', async () => {
    bindDayControls();
    const paxTop = document.getElementById('pax-topN');
    if (paxTop) paxTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); });
    const carTop = document.getElementById('cargo-topN');
    if (carTop) carTop.addEventListener('change', ()=> { if (lastAgg) renderTopHoursLists(lastAgg); });
    document.querySelectorAll('#itineraryTab button[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', (event)=> {
        const target = event.target.getAttribute('data-bs-target') || '';
        const scope = target.includes('carga') ? SCOPE_CARGO : SCOPE_PAX;
        applyIntelligenceForScope(scope);
      });
    });
    ['graficas-itinerario-tab','radar-operativo-tab'].forEach(tabId => {
      const trigger = document.getElementById(tabId);
      if (trigger) trigger.addEventListener('shown.bs.tab', ()=> renderItineraryCharts());
    });
    const closeBtn = document.getElementById('it-peak-results-close');
    if (closeBtn) closeBtn.addEventListener('click', hidePeakResults);
    if (isChartsPaneActive()) renderItineraryCharts();
  });
  document.addEventListener('click', (e)=>{ const el = e.target.closest('[data-section="itinerario"]'); if (el) { setTimeout(()=>renderItineraryCharts(), 50); } });
  document.addEventListener('click', (event)=>{
    const trigger = event.target.closest('[data-top-hour]');
    if (!trigger) return;
    event.preventDefault();
    const scopeAttr = trigger.getAttribute('data-scope');
    const scope = scopeAttr === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const movement = trigger.getAttribute('data-movement') === 'Salida' ? 'Salida' : 'Llegada';
    const hourAttr = trigger.getAttribute('data-hour');
    const hour = hourAttr==null ? null : Number(hourAttr);
    if (!Number.isFinite(hour)) return;
    showTopHourFlights(scope, movement, hour);
  });
  document.addEventListener('click', (event)=>{
    const trigger = event.target.closest('[data-peak-flight]');
    if (!trigger) return;
    event.preventDefault();
    const scopeAttr = trigger.getAttribute('data-scope');
    const scope = scopeAttr === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const airline = trigger.getAttribute('data-airline') || trigger.textContent.trim();
    const airlineKey = trigger.getAttribute('data-airline-key') || norm(airline || '');
    const hourAttr = trigger.getAttribute('data-hour');
    const hour = hourAttr==null || hourAttr==='' ? null : Number(hourAttr);
    showPeakFlights(scope, airline, airlineKey, Number.isFinite(hour) ? hour : null);
  });
  const themeBtn = document.getElementById('theme-toggler'); if (themeBtn) themeBtn.addEventListener('click', ()=> setTimeout(()=>renderItineraryCharts(), 250));
})();
