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
  const chartHitRegions = {};
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
  function hourFromHHMM(s){ 
      if (!s) return null;
      // Handle HH:MM:SS or HH:MM
      const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(s.toString().trim()); 
      return m ? Math.min(23, Math.max(0, parseInt(m[1],10))) : null; 
  }
  function norm(str){ return (str||'').toString().trim().toLowerCase(); }
  function toIsoDate(str) {
    if (!str) return '';
    let s = str.toString().trim();
    // Handle ISO T explicitly
    if (s.includes('T')) s = s.split('T')[0];
    s = s.split(' ')[0]; // Remove time part if separated by space

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    
    // DD/MM/YYYY
    const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return s; 
  }
  function isPassenger(f){ if (norm(f.categoria) === 'pasajeros' || norm(f.categoria)==='comercial') return true; if (norm(f.categoria) === 'carga') return false; const a = norm(f.aerolinea||f.aerolínea||f.airline); if (!a) return true; if (cargoAirlines.has(a)) return false; if (passengerAirlines.has(a)) return true; if (a.includes('cargo')) return false; return true; }
  async function loadItinerary(date) {
    // Modo Base de Datos (Supabase)
    if (window.supabaseClient) {
      const targetDate = date || toYMD(new Date());
      try {
        let flights = [];
        
        // 1. PRIORIDAD: Cargar desde tabla 'flights' (donde sube el usuario)
        const { data: flightData, error: flightError } = await window.supabaseClient
          .from('flights')
          .select('*')
          .or(`fecha_llegada.eq.${targetDate},fecha_salida.eq.${targetDate}`);
        
        if (!flightError && flightData && flightData.length > 0) {
            console.log('Itinerario: cargado desde tabla flights', flightData.length);
            return flightData;
        }

        // 2. FALLBACK: Intentar cargar desde 'vuelos_parte_operaciones' (tabla JSON consolidada)
        const { data: opsData, error: opsError } = await window.supabaseClient
            .from('vuelos_parte_operaciones')
            .select('data')
            .eq('date', targetDate)
            .maybeSingle();

        if (!opsError && opsData && Array.isArray(opsData.data) && opsData.data.length > 0) {
            console.log('Itinerario: cargado desde vuelos_parte_operaciones', opsData.data.length);
            // Normalizar datos para compatibilidad
            flights = opsData.data.map(f => {
                const copy = { ...f };
                
                // Helper to extract HH:MM from various date/time/datetime strings
                const extractTime = (val) => {
                    if (!val) return null;
                    const s = val.toString().trim();
                    // Just time?
                     if (/^\d{1,2}:\d{2}/.test(s) && !s.includes('/')) return s;
                    // Datetime? 2026-01-14 14:30 or 14/01/2026 14:30
                    if (s.includes(' ')) {
                        const parts = s.split(/\s+/);
                        // Usually last part, but check if it looks like time
                        const last = parts[parts.length-1];
                        if (/^\d{1,2}:\d{2}/.test(last)) return last;
                        // Or second part
                        if (parts.length > 1 && /^\d{1,2}:\d{2}/.test(parts[1])) return parts[1];
                    }
                    return null;
                };

                // Asegurar fecha_llegada / hora_llegada
                if (!copy.hora_llegada) {
                     copy.hora_llegada = extractTime(copy.fecha_hora_prog_llegada) || extractTime(copy.fecha_hora_real_llegada);
                }
                if (!copy.fecha_llegada) {
                    copy.fecha_llegada = toIsoDate(copy.fecha_hora_prog_llegada) || toIsoDate(copy.fecha_hora_real_llegada) || copy.fecha || copy.date;
                }

                // Asegurar fecha_salida / hora_salida
                if (!copy.hora_salida) {
                     copy.hora_salida = extractTime(copy.fecha_hora_prog_salida) || extractTime(copy.fecha_hora_real_salida);
                }
                if (!copy.fecha_salida) {
                    copy.fecha_salida = toIsoDate(copy.fecha_hora_prog_salida) || toIsoDate(copy.fecha_hora_real_salida) || copy.fecha || copy.date;
                }

                return copy;
            });
            return flights;
        }

        return [];
      } catch (e) {
        console.error('Error cargando itinerario desde BD:', e);
        return [];
      }
    }

    // Modo Fallback (JSON local)
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
  function pickBestDate(data){ const todayYMD = toYMD(new Date()); const hasToday = data.some(f => toIsoDate(f.fecha_llegada)===todayYMD || toIsoDate(f.fecha_salida)===todayYMD); if (hasToday) return todayYMD; const freq = new Map(); for (const f of data){ const d1 = toIsoDate(f.fecha_llegada); const d2 = toIsoDate(f.fecha_salida); if (d1) freq.set(d1, (freq.get(d1)||0)+1); if (d2) freq.set(d2, (freq.get(d2)||0)+1); } let topYMD = null, topN = -1; for (const [d, n] of freq) { if (n>topN){ topN=n; topYMD=d; } } return topYMD || todayYMD; }
  function aggregateDay(data, ymd){ const paxArr = Array(24).fill(0), paxDep = Array(24).fill(0); const carArr = Array(24).fill(0), carDep = Array(24).fill(0); for (const f of data){ if (toIsoDate(f.fecha_llegada) === ymd){ const h = hourFromHHMM(f.hora_llegada); if (h!=null){ if (isPassenger(f)) paxArr[h]++; else carArr[h]++; } } if (toIsoDate(f.fecha_salida) === ymd){ const h2 = hourFromHHMM(f.hora_salida); if (h2!=null){ if (isPassenger(f)) paxDep[h2]++; else carDep[h2]++; } } } return { paxArr, paxDep, carArr, carDep }; }
  function computeItineraryInsights(data, ymd, scope){
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
      const arrivalMatch = toIsoDate(flight.fecha_llegada) === ymd;
      const departureMatch = toIsoDate(flight.fecha_salida) === ymd;
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

  function bindChartClicks(){
    const charts = [
      { id: 'paxArrivalsChart' },
      { id: 'paxDeparturesChart' },
      { id: 'cargoArrivalsChart' },
      { id: 'cargoDeparturesChart' }
    ];
    charts.forEach(({ id }) => {
      const canvas = document.getElementById(id);
      if (!canvas || canvas.dataset.chartInteractive === 'true') return;
      canvas.dataset.chartInteractive = 'true';
      canvas.style.cursor = 'pointer';
      canvas.addEventListener('click', (event)=> handleChartClick(id, event));
    });
  }

  function handleChartClick(canvasId, event){
    const hit = chartHitRegions[canvasId];
    if (!hit || !Array.isArray(hit.slots) || !hit.slots.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const bounds = hit.bounds;
    if (!bounds || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return;
    const slot = hit.slots.find(s => x >= s.start && x <= s.end);
    if (!slot || !Number.isFinite(slot.hour)) return;
    const scope = hit.meta && hit.meta.scope === SCOPE_CARGO ? SCOPE_CARGO : SCOPE_PAX;
    const movement = hit.meta && hit.meta.movement === 'Salida' ? 'Salida' : 'Llegada';
    showTopHourFlights(scope, movement, slot.hour);
  }
  // Dibujador de barras (sin Chart.js) con estética pulida e interacción
  function drawBars(canvasId, labels, values, color, title, meta = {}){
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

    const darkMode = document.body && document.body.classList.contains('dark-mode');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, darkMode ? 'rgba(2,6,23,0.95)' : 'rgba(255,255,255,0.98)');
    bg.addColorStop(1, darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(243,246,255,0.95)');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    const isMobile = (w < 576);
    const margin = { top: 42, right: 20, bottom: isMobile ? 58 : 38, left: 50 };
    const innerW = Math.max(1, w - margin.left - margin.right);
    const innerH = Math.max(1, h - margin.top - margin.bottom);
    const x0 = margin.left;
    const y0 = h - margin.bottom;

    const plotGradient = g.createLinearGradient(0, margin.top, 0, h - margin.bottom);
    plotGradient.addColorStop(0, darkMode ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.92)');
    plotGradient.addColorStop(1, darkMode ? 'rgba(15,23,42,0.55)' : 'rgba(240,249,255,0.88)');
    g.save();
    g.fillStyle = plotGradient;
    roundRect(g, margin.left - 14, margin.top - 10, innerW + 28, innerH + 20, 18);
    g.fill();
    g.restore();

    const gridColor = darkMode ? 'rgba(226,232,240,0.15)' : 'rgba(15,23,42,0.08)';
    const axisColor = darkMode ? '#cbd5f5' : '#475569';
    const labelColor = darkMode ? '#f8fafc' : '#1f2937';

    chartHitRegions[canvasId] = {
      meta: meta || {},
      bounds: { left: margin.left, right: w - margin.right, top: margin.top, bottom: h - margin.bottom },
      slots: []
    };

    // Títulos externos ya contienen el contexto; evitamos duplicar texto dentro del canvas

    g.strokeStyle = gridColor;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + innerW, y0);
    g.moveTo(x0, y0);
    g.lineTo(x0, y0 - innerH);
    g.stroke();

    const maxV = Math.max(1, Math.max(...values));
    const nice = niceMax(maxV);
    const ticks = 4;
    const tickStep = nice / ticks;
    g.strokeStyle = gridColor;
    g.fillStyle = axisColor;
    g.font = '11px "Inter", "Roboto", Arial';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let i=0; i<=ticks; i++){
      const v = i * tickStep;
      const y = y0 - (v / nice) * innerH;
      g.beginPath();
      g.moveTo(x0, y);
      g.lineTo(x0 + innerW, y);
      g.stroke();
      g.fillText(String(Math.round(v)), x0 - 8, y);
    }

    const n = labels.length;
    const gap = 4;
    const barW = Math.max(2, (innerW / n) - gap);
    const gradientStops = Array.isArray(meta.gradientStops) && meta.gradientStops.length >= 2
      ? meta.gradientStops
      : [color, color];
    const shadowColor = meta.shadowColor || 'rgba(15,23,42,0.18)';
    const outlineColor = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.08)';
    for (let i=0; i<n; i++){
      const v = values[i] || 0;
      const bh = (v / nice) * innerH;
      const x = x0 + i * (innerW / n) + gap/2;
      const y = y0 - bh;
      const slotStart = x0 + i * (innerW / n);
      const slotEnd = slotStart + (innerW / n);
      chartHitRegions[canvasId].slots.push({ hour: i, start: slotStart, end: slotEnd });
      if (bh <= 0.5) continue;
      const barGradient = g.createLinearGradient(0, y, 0, y + bh);
      barGradient.addColorStop(0, gradientStops[0]);
      barGradient.addColorStop(1, gradientStops[gradientStops.length - 1]);
      g.save();
      g.shadowColor = shadowColor;
      g.shadowBlur = 18;
      g.shadowOffsetY = 10;
      roundRect(g, x, y, Math.max(2, barW), Math.max(1, bh), 8);
      g.fillStyle = barGradient;
      g.fill();
      g.restore();

      g.strokeStyle = outlineColor;
      g.lineWidth = 1;
      roundRect(g, x, y, Math.max(2, barW), Math.max(1, bh), 8);
      g.stroke();
    }

    g.fillStyle = axisColor;
    g.font = '11px "Inter", "Roboto", Arial';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const step = isMobile ? 1 : 2;
    for (let i=0; i<n; i+=step){
      const labelX = x0 + i * (innerW / n) + (innerW / n)/2;
      if (isMobile){
        g.save();
        g.translate(labelX, y0 + 6);
        g.rotate(-Math.PI/6);
        g.fillText(labels[i], 0, 0);
        g.restore();
      } else {
        g.fillText(labels[i], labelX, y0 + 10);
      }
    }

    g.fillStyle = darkMode ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.8)';
    g.font = '600 11px "Inter", "Roboto", Arial';
    g.textAlign = 'right';
    g.fillText('Haz clic en una barra para detallar vuelos', x0 + innerW, margin.top - 14);
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
  function renderHeatmap1D(canvasId, counts){
    const c = document.getElementById(canvasId);
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const width = c.clientWidth || 640;
    const height = c.clientHeight || 220;
    c.width = Math.max(1, width * dpr);
    c.height = Math.max(1, height * dpr);
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0,0,width,height);

    const darkMode = document.body && document.body.classList.contains('dark-mode');
    const bg = g.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, darkMode ? 'rgba(2,6,23,0.95)' : 'rgba(248,250,252,0.98)');
    bg.addColorStop(1, darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(237,244,255,0.95)');
    g.fillStyle = bg;
    g.fillRect(0, 0, width, height);

    const pad = 14;
    const cellW = (width - pad*2) / 24;
    const cellH = Math.max(18, height - pad*2 - 24);
    const max = Math.max(1, ...counts);
    const palette = darkMode
      ? ['#0f172a','#1e3a8a','#2563eb','#22d3ee','#facc15']
      : ['#dbeafe','#93c5fd','#3b82f6','#0ea5e9','#f97316'];
    const parseHex = (hex)=>{
      const value = hex.replace('#','');
      const bigint = parseInt(value, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    };
    const lerp = (a,b,t)=> a + (b - a)*t;
    const pickColor = (t)=>{
      const scaled = t * (palette.length - 1);
      const idx = Math.floor(scaled);
      const nextIdx = Math.min(idx + 1, palette.length - 1);
      const mix = scaled - idx;
      const c1 = parseHex(palette[idx]);
      const c2 = parseHex(palette[nextIdx]);
      const r = Math.round(lerp(c1.r, c2.r, mix));
      const gVal = Math.round(lerp(c1.g, c2.g, mix));
      const b = Math.round(lerp(c1.b, c2.b, mix));
      const alpha = darkMode ? 0.45 + (0.4 * t) : 0.35 + (0.45 * t);
      return `rgba(${r},${gVal},${b},${alpha})`;
    };

    const topHour = counts.reduce((acc, val, idx) => {
      if (val > acc.value) return { hour: idx, value: val };
      return acc;
    }, { hour: 0, value: 0 });

    for (let h=0; h<24; h++){
      const v = counts[h];
      const t = v / max;
      const color = pickColor(t);
      const x = pad + h * cellW;
      const y = pad;
      g.fillStyle = color;
      roundRect(g, x + 1, y, Math.max(2, cellW - 3), cellH, 6);
      g.fill();
    }

    if (topHour.value > 0){
      const hx = pad + topHour.hour * cellW + cellW/2;
      const hy = pad + cellH/2;
      g.strokeStyle = darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(hx, hy, Math.min(cellW, cellH) / 2.3, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = g.strokeStyle;
      g.font = '600 11px "Inter", "Roboto", Arial';
      g.textAlign = 'center';
      g.fillText(`${String(topHour.hour).padStart(2,'0')}h`, hx, hy + 4);
    }

    g.fillStyle = darkMode ? '#cbd5f5' : '#475569';
    g.font = '11px "Inter", "Roboto", Arial';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    for (let h=0; h<24; h+=2){
      const labelX = pad + h * cellW + cellW/2;
      g.fillText(String(h).padStart(2,'0'), labelX, pad + cellH + 6);
    }
  }
  async function renderItineraryCharts() {
    // Sincronizar con filtros activos del Inicio si está habilitado (por defecto sí)
    const sync = (window.syncItineraryFiltersToCharts !== false);
    const fState = window.currentItineraryFilterState || {};
    const preHour = window.currentItineraryPreHour || {};

    // Determinar fecha objetivo
    let targetDate = selectedDate || fState.selectedDate;
    if (!targetDate) {
      // Si no hay fecha seleccionada, usar hoy
      targetDate = toYMD(new Date());
    }

    // Cargar datos para esa fecha (o todo si es JSON legacy)
    const base = await loadItinerary(targetDate);
    
    let data = base;
    // Determinar fecha final (si era legacy JSON, pickBestDate podría cambiarla)
    if (!selectedDate) {
        // Si estamos en modo DB, targetDate es la fecha.
        // Si estamos en modo JSON, pickBestDate(base) podría ser mejor.
        if (window.supabaseClient) {
            selectedDate = targetDate;
        } else {
            selectedDate = (fState.selectedDate || pickBestDate(base));
        }
    }
    
    // UI date control
    const input = document.getElementById('it-day-input');
    if (input && input.value !== selectedDate) input.value = selectedDate;
    // Construir subconjunto del día, opcionalmente desde el preHour filtrado
    const dayDMY = ymdToDMY(selectedDate);
    if (sync && preHour.combined && Array.isArray(preHour.combined) && preHour.combined.length) {
      // Reducir al día seleccionado sin colapsar por hora
      data = preHour.combined.filter(f => (toIsoDate(f.fecha_llegada)===selectedDate) || (toIsoDate(f.fecha_salida)===selectedDate));
    } else {
      // Asegurar día desde la fuente base
      // Nota: loadItinerary ya filtra por DB, pero este paso asegura consistencia si formats difieren
      data = base.filter(f => (toIsoDate(f.fecha_llegada)===selectedDate) || (toIsoDate(f.fecha_salida)===selectedDate));
       
      // Si el filtro estricto vacía el array (ej. error de formato), pero base tiene datos y venía ya filtrado de DB
      // podríamos usar base directamente como fallback.
      if (base.length > 0 && data.length === 0 && window.supabaseClient) {
          console.warn('Itinerario: El filtro estricto de fecha ocultó los datos cargados. Usando datos crudos de DB (fallback).');
          data = base;
      }
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
  drawBars('paxArrivalsChart', H_LABELS, agg.paxArr, 'rgba(13,110,253,0.9)', 'Llegadas (Pasajeros)', {
    scope: SCOPE_PAX,
    movement: 'Llegada',
    gradientStops: ['rgba(148,205,255,0.95)', 'rgba(13,110,253,0.65)'],
    shadowColor: 'rgba(13,110,253,0.25)',
    subtitle: 'Tráfico entrante durante el día'
  });
  drawBars('paxDeparturesChart', H_LABELS, agg.paxDep, 'rgba(16,185,129,0.9)', 'Salidas (Pasajeros)', {
    scope: SCOPE_PAX,
    movement: 'Salida',
    gradientStops: ['rgba(167,243,208,0.95)', 'rgba(16,185,129,0.65)'],
    shadowColor: 'rgba(16,185,129,0.25)',
    subtitle: 'Ventanas de salida previstas'
  });
  drawBars('cargoArrivalsChart', H_LABELS, agg.carArr, 'rgba(249,115,22,0.9)', 'Llegadas (Carga)', {
    scope: SCOPE_CARGO,
    movement: 'Llegada',
    gradientStops: ['rgba(255,196,161,0.95)', 'rgba(249,115,22,0.65)'],
    shadowColor: 'rgba(194,65,12,0.25)',
    subtitle: 'Recepciones logísticas por hora'
  });
  drawBars('cargoDeparturesChart', H_LABELS, agg.carDep, 'rgba(234,88,12,0.9)', 'Salidas (Carga)', {
    scope: SCOPE_CARGO,
    movement: 'Salida',
    gradientStops: ['rgba(253,186,140,0.95)', 'rgba(234,88,12,0.7)'],
    shadowColor: 'rgba(234,88,12,0.25)',
    subtitle: 'Despachos prioritarios'
  });
    const paxSum = agg.paxArr.map((v,i)=> v + (agg.paxDep[i]||0));
    const carSum = agg.carArr.map((v,i)=> v + (agg.carDep[i]||0));
    renderHeatmap1D('heatmapPaxDay', paxSum);
    renderHeatmap1D('heatmapCargoDay', carSum);
    renderTopHoursLists(agg);
    bindChartClicks();
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
    bindChartClicks();
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
