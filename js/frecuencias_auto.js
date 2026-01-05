(function(){
  const pane = document.getElementById('frecuencias-auto-pane');
  if (!pane) return;

  const DATA_URL = 'data/frecuencias_semanales.json';
  const DAY_CODES = ['L','M','X','J','V','S','D'];
  const DAY_LABELS = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
  const intlNumber = new Intl.NumberFormat('es-MX');
  const intlDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const AIRLINE_CONFIG = {
    'aeromexico': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
    'volaris': { logo: 'logo_volaris.png', color: '#a300e6', text: '#ffffff' },
    'viva-aerobus': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    'viva': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    'mexicana': { logo: 'logo_mexicana.png', color: '#008375', text: '#ffffff' },
    'copa-airlines': { logo: 'logo_copa.png', color: '#00529b', text: '#ffffff' },
    'arajet': { logo: 'logo_arajet.png', color: '#632683', text: '#ffffff' },
    'conviasa': { logo: 'logo_conviasa.png', color: '#e65300', text: '#ffffff' },
    'magnicharters': { logo: 'logo_magnicharters.png', color: '#1d3c6e', text: '#ffffff' },
    'aerus': { logo: 'logo_aerus.png', color: '#bed62f', text: '#000000' },
    'default': { logo: null, color: '#ffffff', text: '#212529' }
  };

  const AIFA_COORDS = { lat: 19.7456, lng: -99.0086 };

  const AIRPORT_COORDS = {
    ACA: { lat: 16.7571, lng: -99.7534 },
    BJX: { lat: 20.9935, lng: -101.4809 },
    CEN: { lat: 27.3926, lng: -109.8330 },
    CJS: { lat: 31.6361, lng: -106.4280 },
    CLQ: { lat: 19.2770, lng: -103.5770 },
    CPE: { lat: 19.8168, lng: -90.5003 },
    CTM: { lat: 18.5047, lng: -88.3268 },
    CUL: { lat: 24.7650, lng: -107.4747 },
    CUN: { lat: 21.0365, lng: -86.8769 },
    CUU: { lat: 28.7029, lng: -105.9646 },
    CVM: { lat: 23.7033, lng: -98.9565 },
    DGO: { lat: 24.1242, lng: -104.5280 },
    GDL: { lat: 20.5218, lng: -103.3103 },
    HMO: { lat: 29.0959, lng: -111.0480 },
    HUX: { lat: 15.7753, lng: -96.2626 },
    IZT: { lat: 16.4493, lng: -95.0937 },
    LAP: { lat: 24.0731, lng: -110.3610 },
    MAM: { lat: 25.7699, lng: -97.5253 },
    MID: { lat: 20.9348, lng: -89.6636 },
    MTY: { lat: 25.7785, lng: -100.1070 },
    MZT: { lat: 23.1614, lng: -106.2660 },
    NLD: { lat: 27.4439, lng: -99.5705 },
    OAX: { lat: 16.9990, lng: -96.7266 },
    PQM: { lat: 17.5332, lng: -92.0155 },
    PVR: { lat: 20.6801, lng: -105.2542 },
    PXM: { lat: 15.8769, lng: -97.0891 },
    REX: { lat: 26.0089, lng: -98.2285 },
    SJD: { lat: 23.1517, lng: -109.7210 },
    SLP: { lat: 22.2543, lng: -100.9305 },
    SLW: { lat: 25.5495, lng: -100.9280 },
    TAM: { lat: 22.2964, lng: -97.8659 },
    TGZ: { lat: 16.5618, lng: -93.0216 },
    TIJ: { lat: 32.5411, lng: -116.9719 },
    TPQ: { lat: 21.4195, lng: -104.8420 },
    TQO: { lat: 20.6173, lng: -87.0822 },
    VER: { lat: 19.1450, lng: -96.1873 },
    VSA: { lat: 17.9960, lng: -92.8174 },
    ZIH: { lat: 17.6016, lng: -101.4605 }
  };

  const dom = {
    loading: pane.querySelector('#frecuencias-loading'),
    content: pane.querySelector('#frecuencias-content'),
    error: pane.querySelector('#frecuencias-error'),
    weekLabel: pane.querySelector('[data-week-label]'),
    weekRange: pane.querySelector('[data-week-range]'),
    lastUpdated: pane.querySelector('[data-last-updated]'),
    kpis: {
      flights: pane.querySelector('[data-kpi="flights"]'),
      destinations: pane.querySelector('[data-kpi="destinations"]'),
      airlines: pane.querySelector('[data-kpi="airlines"]')
    },
    kpiNotes: {
      flights: pane.querySelector('[data-kpi-note="flights"]'),
      destinations: pane.querySelector('[data-kpi-note="destinations"]'),
      airlines: pane.querySelector('[data-kpi-note="airlines"]')
    },
    filters: {
      airline: pane.querySelector('#frecuencias-airline-filter'),
      destination: pane.querySelector('#frecuencias-destination-filter'),
      day: pane.querySelector('#frecuencias-day-filter'),
      search: pane.querySelector('#frecuencias-search')
    },
    resetFilters: pane.querySelector('#frecuencias-reset-filters'),
    activeFilters: pane.querySelector('#frecuencias-active-filters'),
    dowList: pane.querySelector('#frecuencias-dow-list'),
    insights: pane.querySelector('#frecuencias-insights'),
    mapContainer: pane.querySelector('#frecuencias-map'),
    mapEmpty: pane.querySelector('#frecuencias-map-empty'),
    fitButton: pane.querySelector('#frecuencias-fit-map'),
    tableBody: pane.querySelector('#frecuencias-destinos-table tbody'),
    tableCount: pane.querySelector('#frecuencias-table-count'),
    tableEmpty: pane.querySelector('#frecuencias-empty'),
    mapCol: pane.querySelector('#frecuencias-map-col'),
    detailsCol: pane.querySelector('#frecuencias-details-col'),
    detailsTitle: pane.querySelector('#frecuencias-details-title'),
    detailsBody: pane.querySelector('#frecuencias-details-body'),
    detailsClose: pane.querySelector('#frecuencias-details-close')
  };

  const state = {
    raw: null,
    destinations: [],
    filtered: [],
    filters: { airline: 'all', destination: 'all', day: 'all', search: '' },
    uniqueAirlines: [],
    map: null,
    markerLayer: null,
    planeLayer: null,
    animationFrameId: null,
    animationTimeoutId: null
  };

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shown.bs.tab', evt => {
    if (evt.target && evt.target.id === 'frecuencias-auto-tab') {
      setTimeout(() => {
        state.map?.invalidateSize();
        fitMapToData();
      }, 200);
    }
  });

  async function init(){
    prepareFilterSkeletons();
    showLoading(true);
    try {
      // const data = await fetchJson(DATA_URL);
      let data;
      try {
        const dbData = await window.dataManager.getWeeklyFrequencies();
        data = transformDBData(dbData);
      } catch (e) {
        console.warn('Database fetch failed, falling back to JSON', e);
        data = await fetchJson(DATA_URL);
      }

      state.raw = data;
      state.destinations = normalizeDestinations(data?.destinations || []);
      state.uniqueAirlines = collectAirlines(state.destinations);
      populateFilters();
      updateMeta(data);
      renderKPIs();
      applyFilters();
      await ensureLeaflet();
      initMap();
      renderMap();
      showLoading(false);
      dom.content?.classList.remove('d-none');
    } catch (err) {
      console.error('Frecuencias automation error:', err);
      showError('No se pudo cargar la información de frecuencias. Verifique la conexión a la base de datos.');
      showLoading(false);
    }
    wireInteractions();
  }

  function transformDBData(rows) {
      if (!rows || rows.length === 0) return { weekLabel: '', validFrom: '', validTo: '', destinations: [] };
      
      // Assume all rows belong to the same week for now, or pick the latest one.
      // Since getWeeklyFrequencies orders by valid_from desc, the first row has the latest week info.
      const first = rows[0];
      const weekLabel = first.week_label;
      const validFrom = first.valid_from;
      const validTo = first.valid_to;
      
      // Group by route_id or iata
      const destinationsMap = {};
      
      rows.forEach(row => {
          if (row.week_label !== weekLabel) return; // Only process the latest week
          
          if (!destinationsMap[row.iata]) {
              destinationsMap[row.iata] = {
                  routeId: row.route_id,
                  city: row.city,
                  state: row.state,
                  iata: row.iata,
                  airports: [row.iata],
                  airlines: []
              };
          }
          
          destinationsMap[row.iata].airlines.push({
              name: row.airline,
              daily: {
                  L: row.monday,
                  M: row.tuesday,
                  X: row.wednesday,
                  J: row.thursday,
                  V: row.friday,
                  S: row.saturday,
                  D: row.sunday
              },
              weeklyTotal: row.weekly_total
          });
      });
      
      return {
          weekLabel,
          validFrom,
          validTo,
          destinations: Object.values(destinationsMap)
      };
  }

  function prepareFilterSkeletons(){
    if (dom.filters.airline) dom.filters.airline.innerHTML = '<option value="all">Todas las aerolíneas</option>';
    if (dom.filters.destination) dom.filters.destination.innerHTML = '<option value="all">Todos los destinos</option>';
    if (dom.filters.day) {
      dom.filters.day.innerHTML = '<option value="all">Todos los días</option>';
      DAY_CODES.forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = DAY_LABELS[code];
        dom.filters.day.appendChild(opt);
      });
    }
  }

  function wireInteractions(){
    if (dom.filters.airline) dom.filters.airline.addEventListener('change', evt => {
      state.filters.airline = evt.target.value || 'all';
      applyFilters();
    });
    if (dom.filters.destination) dom.filters.destination.addEventListener('change', evt => {
      state.filters.destination = evt.target.value || 'all';
      applyFilters();
    });
    if (dom.filters.day) dom.filters.day.addEventListener('change', evt => {
      state.filters.day = evt.target.value || 'all';
      applyFilters();
    });
    if (dom.filters.search) {
      const onSearch = debounce(evt => {
        state.filters.search = (evt.target.value || '').trim().toLowerCase();
        applyFilters();
      }, 220);
      dom.filters.search.addEventListener('input', onSearch);
    }
    if (dom.resetFilters) dom.resetFilters.addEventListener('click', () => {
      state.filters = { airline: 'all', destination: 'all', day: 'all', search: '' };
      if (dom.filters.airline) dom.filters.airline.value = 'all';
      if (dom.filters.destination) dom.filters.destination.value = 'all';
      if (dom.filters.day) dom.filters.day.value = 'all';
      if (dom.filters.search) dom.filters.search.value = '';
      applyFilters();
    });
    if (dom.fitButton) {
      // Agrupar botones en un contenedor para mantener el layout
      const header = dom.fitButton.parentNode;
      const wrapper = document.createElement('div');
      wrapper.className = 'd-flex gap-2';
      
      // Mover el botón existente al wrapper
      header.insertBefore(wrapper, dom.fitButton);
      wrapper.appendChild(dom.fitButton);

      dom.fitButton.addEventListener('click', () => fitMapToData());
      
      // Botón para limpiar filtro de mapa
      const resetMapBtn = document.createElement('button');
      resetMapBtn.className = 'btn btn-outline-secondary btn-sm d-none';
      resetMapBtn.innerHTML = '<i class="fas fa-undo me-1"></i>Mostrar todos';
      resetMapBtn.addEventListener('click', () => {
        state.filters.destination = 'all';
        if (dom.filters.destination) dom.filters.destination.value = 'all';
        applyFilters();
      });
      wrapper.appendChild(resetMapBtn);
      dom.resetMapBtn = resetMapBtn;
    }

    if (dom.detailsClose) {
      dom.detailsClose.addEventListener('click', () => {
        state.filters.destination = 'all';
        if (dom.filters.destination) dom.filters.destination.value = 'all';
        applyFilters();
      });
    }
  }

  function applyFilters(){
    const list = state.destinations
      .map(dest => projectDestination(dest))
      .filter(Boolean)
      .filter(dest => {
        if (state.filters.destination !== 'all' && dest.iata !== state.filters.destination) return false;
        if (state.filters.day !== 'all') {
          const idx = DAY_CODES.indexOf(state.filters.day);
          if (idx !== -1 && (dest.viewDailyTotals[idx] || 0) === 0) return false;
        }
        if (state.filters.search) {
          if (!dest.searchText.includes(state.filters.search)) return false;
        }
        return true;
      });

    state.filtered = list;
    
    if (dom.resetMapBtn) {
      dom.resetMapBtn.classList.toggle('d-none', state.filters.destination === 'all');
    }

    // Toggle Side Panel
    const isSingleDest = state.filters.destination !== 'all';
    if (dom.mapCol && dom.detailsCol) {
        if (isSingleDest) {
            dom.mapCol.classList.remove('col-12');
            dom.mapCol.classList.add('col-lg-7');
            dom.detailsCol.classList.remove('d-none');
            // Render details
            const dest = state.destinations.find(d => d.iata === state.filters.destination);
            if (dest) renderDestinationDetails(dest);
        } else {
            dom.mapCol.classList.add('col-12');
            dom.mapCol.classList.remove('col-lg-7');
            dom.detailsCol.classList.add('d-none');
        }
        // Trigger map resize after transition
        setTimeout(() => state.map?.invalidateSize(), 300);
    }

    updateActiveFiltersText();
    renderDowSummary();
    renderInsights();
    renderTable();
    renderMap();
  }

  function renderKPIs(){
    const totalFlights = state.destinations.reduce((sum, dest) => sum + dest.weeklyTotal, 0);
    const totalDestinations = state.destinations.length;
    const totalAirlines = state.uniqueAirlines.length;
    if (dom.kpis.flights) dom.kpis.flights.textContent = intlNumber.format(totalFlights);
    if (dom.kpis.destinations) dom.kpis.destinations.textContent = intlNumber.format(totalDestinations);
    if (dom.kpis.airlines) dom.kpis.airlines.textContent = intlNumber.format(totalAirlines);

    const busiestDest = [...state.destinations].sort((a, b) => b.weeklyTotal - a.weeklyTotal)[0];
    if (busiestDest && dom.kpiNotes.flights) {
      dom.kpiNotes.flights.textContent = `${busiestDest.city} (${busiestDest.iata}) lidera con ${intlNumber.format(busiestDest.weeklyTotal)} vuelos.`;
    }
    if (dom.kpiNotes.destinations) dom.kpiNotes.destinations.textContent = 'Cobertura basada en rutas activas durante la semana.';
    if (dom.kpiNotes.airlines && state.uniqueAirlines[0]) {
      dom.kpiNotes.airlines.textContent = `Top: ${state.uniqueAirlines[0].name}`;
    }
  }

  function renderDowSummary(){
    if (!dom.dowList) return;
    const dataset = state.filtered.length ? state.filtered : state.destinations;
    dom.dowList.innerHTML = '';
    DAY_CODES.forEach((code, idx) => {
      const total = dataset.reduce((sum, dest) => sum + (dest.viewDailyTotals?.[idx] ?? dest.dailyTotals?.[idx] ?? 0), 0);
      const card = document.createElement('div');
      card.className = 'frecuencias-dow-chip';
      card.innerHTML = `<strong>${DAY_LABELS[code]}</strong><span>${intlNumber.format(total)}</span>`;
      dom.dowList.appendChild(card);
    });
  }

  function renderInsights(){
    if (!dom.insights) return;
    const dataset = state.filtered.length ? state.filtered : state.destinations;
    dom.insights.innerHTML = '';
    if (!dataset.length) return;

    const topDestination = [...dataset].sort((a, b) => (b.viewWeeklyTotal ?? b.weeklyTotal) - (a.viewWeeklyTotal ?? a.weeklyTotal))[0];
    if (topDestination) {
      dom.insights.appendChild(buildInsight('fa-location-dot', `${topDestination.city} (${topDestination.iata}) concentra ${intlNumber.format(topDestination.viewWeeklyTotal ?? topDestination.weeklyTotal)} vuelos.`));
    }

    const airlineTotals = new Map();
    dataset.forEach(dest => {
      const source = dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines;
      source.forEach(air => {
        airlineTotals.set(air.name, (airlineTotals.get(air.name) || 0) + air.weeklyTotal);
      });
    });
    const topAirline = [...airlineTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topAirline) {
      dom.insights.appendChild(buildInsight('fa-plane', `${topAirline[0]} aporta ${intlNumber.format(topAirline[1])} vuelos semanales.`));
    }

    const dayTotals = DAY_CODES.map((code, idx) => ({ code, value: dataset.reduce((sum, dest) => sum + (dest.viewDailyTotals?.[idx] ?? dest.dailyTotals?.[idx] ?? 0), 0) }));
    const hottestDay = dayTotals.sort((a, b) => b.value - a.value)[0];
    if (hottestDay) {
      dom.insights.appendChild(buildInsight('fa-calendar-day', `${DAY_LABELS[hottestDay.code]} es el día con más operaciones (${intlNumber.format(hottestDay.value)}).`));
    }
  }

  function buildInsight(icon, text){
    const div = document.createElement('div');
    div.className = 'frecuencias-insight';
    div.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${text}</span>`;
    return div;
  }

  function renderTable(){
    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = '';
    const dataset = state.filtered;
    if (!dataset.length) {
      dom.tableCount.textContent = '0 destinos listados';
      dom.tableEmpty?.classList.remove('d-none');
      return;
    }
    dom.tableEmpty?.classList.add('d-none');
    dom.tableCount.textContent = `${dataset.length} destinos listados`;

    dataset.forEach(dest => {
      const base = (dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines) || [];
      const airlines = base.length ? base : [{ name: 'Sin datos', daily: Array(DAY_CODES.length).fill(0), weeklyTotal: 0 }];
      airlines.forEach((airline, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.destinationRow = dest.iata;
        
        // Configuración de aerolínea (logo y color)
        const config = AIRLINE_CONFIG[airline.slug] || AIRLINE_CONFIG['default'];
        
        // Estilo de fila según aerolínea (fondo completo)
        tr.style.backgroundColor = config.color;
        tr.style.color = config.text;
        // Fix para Bootstrap: asegurar que el fondo se vea
        tr.style.setProperty('--bs-table-bg', 'transparent');
        tr.style.setProperty('--bs-table-accent-bg', 'transparent');

        tr.addEventListener('click', () => {
          focusDestination(dest.iata);
          if (dest.coords && state.map) {
            state.map.flyTo([dest.coords.lat, dest.coords.lng], Math.max(state.map.getZoom(), 6), { duration: 0.6 });
          }
        });

        if (idx === 0) {
          const tdDest = document.createElement('td');
          tdDest.rowSpan = airlines.length;
          // Mantener la celda de destino legible (fondo blanco)
          tdDest.style.backgroundColor = '#ffffff';
          tdDest.style.color = '#212529';
          
          const total = dest.viewWeeklyTotal ?? dest.weeklyTotal;
          
          // Eliminado el código IATA, solo ciudad y estado
          tdDest.innerHTML = `
            <div class="frecuencias-dest-info">
                <strong>${dest.city}</strong>
                <span>${dest.state}</span>
                <div class="badge bg-light text-dark border mt-1" style="font-weight: normal;">${total} frec/sem</div>
            </div>`;
          tr.appendChild(tdDest);
        }

        const tdAirline = document.createElement('td');
        // Asegurar color en celdas individuales por si Bootstrap lo sobreescribe
        // Fondo blanco para que el logo se vea limpio
        tdAirline.style.backgroundColor = '#ffffff';
        tdAirline.style.color = config.color;
        // Borde izquierdo grueso con el color de la aerolínea para identificarla visualmente
        tdAirline.style.borderLeft = `12px solid ${config.color}`;
        
        if (config.logo) {
            let logoStyle = '';
            if (['mexicana', 'volaris', 'aeromexico'].includes(airline.slug)) {
                logoStyle = 'style="height: 50px; max-width: 140px;"';
            }
            // Clase específica para personalizar tamaño por aerolínea
            tdAirline.innerHTML = `<img src="images/airlines/${config.logo}" alt="${airline.name}" title="${airline.name}" class="frecuencias-airline-logo airline-${airline.slug}" ${logoStyle}>`;
        } else {
            tdAirline.textContent = airline.name;
        }
        tr.appendChild(tdAirline);

        DAY_CODES.forEach((code, dayIdx) => {
          const tdDay = document.createElement('td');
          tdDay.textContent = airline.daily?.[dayIdx] ?? 0;
          tdDay.style.backgroundColor = config.color;
          tdDay.style.color = '#ffffff';
          tr.appendChild(tdDay);
        });
        const tdTotal = document.createElement('td');
        tdTotal.textContent = intlNumber.format(airline.weeklyTotal);
        tdTotal.style.backgroundColor = config.color;
        tdTotal.style.color = '#ffffff';
        tr.appendChild(tdTotal);
        dom.tableBody.appendChild(tr);
      });
    });
  }

  function renderDestinationDetails(dest) {
    if (!dom.detailsTitle || !dom.detailsBody) return;
    dom.detailsTitle.textContent = `${dest.city} (${dest.iata})`;
    
    const projected = projectDestination(dest);
    if (!projected) {
        dom.detailsBody.innerHTML = '<div class="p-3 text-muted">No hay vuelos con los filtros actuales.</div>';
        return;
    }

    let html = '';
    const abbrs = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    
    projected.viewAirlines.forEach(air => {
        const config = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
        
        let logoStyle = 'height: 32px; width: auto;';
        if (['mexicana', 'volaris', 'aeromexico'].includes(air.slug)) {
            logoStyle = 'height: 65px; width: auto;';
        }

        // Si hay logo, mostrarlo más grande y sin texto. Si no, mostrar texto.
        const headerContent = config.logo 
            ? `<img src="images/airlines/${config.logo}" alt="${air.name}" style="${logoStyle}" title="${air.name}">`
            : `<strong style="color: #212529; font-size: 1.1rem;">${air.name}</strong>`;
        
        html += `
            <div class="list-group-item p-3">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div>${headerContent}</div>
                    <div class="text-end">
                        <div class="badge bg-primary rounded-pill px-3 py-2" style="font-size: 0.9rem; font-weight: 500;">
                            ${air.weeklyTotal} <span style="opacity: 0.8; font-weight: 400;">frecuencias/semana</span>
                        </div>
                    </div>
                </div>
                <div class="d-flex gap-1 justify-content-between">
                    ${DAY_CODES.map((code, idx) => {
                        const count = air.daily[idx];
                        const isActive = count > 0;
                        // Estilos condicionales para resaltar días activos
                        const bgClass = isActive ? 'bg-primary-subtle border border-primary-subtle' : 'bg-light border border-light';
                        const textClass = isActive ? 'text-primary fw-bold' : 'text-muted opacity-25';
                        
                        return `
                            <div class="text-center rounded p-1 flex-fill ${bgClass}" style="min-width: 35px;">
                                <div class="small ${isActive ? 'text-primary fw-semibold' : 'text-muted opacity-50'}" style="font-size: 0.7rem; margin-bottom: 2px;">${abbrs[idx]}</div>
                                <div class="${textClass}" style="font-size: 1rem; line-height: 1;">${count}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    html += `
        <div class="p-3 mt-2 bg-light border-top small text-muted">
            <div class="fw-bold mb-1">Notas:</div>
            <ul class="mb-0 ps-3" style="list-style-type: disc;">
                <li class="mb-1">Una frecuencia es cuantas veces va a un destino, se refiere a un aterrizaje y un despegue.</li>
                <li>Esta programación esta sujeta a cambios con base en las necesidades de las aerolíneas.</li>
            </ul>
        </div>
    `;

    dom.detailsBody.innerHTML = html;
  }

  function renderMap(){
    if (!state.map || !state.markerLayer) return;
    state.markerLayer.clearLayers();
    
    // Agregar marcador fijo del AIFA
    const aifaIcon = L.divIcon({
        className: 'frecuencia-aifa-marker',
        html: '<div class="aifa-pin"><img src="images/logo_aifa.jpg" alt="AIFA" class="aifa-logo-pin"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    L.marker([AIFA_COORDS.lat, AIFA_COORDS.lng], { icon: aifaIcon, zIndexOffset: 1000 }).addTo(state.markerLayer)
     .bindTooltip('AIFA (NLU)', { permanent: false, direction: 'top' });

    const dataset = state.filtered;
    if (!dataset.length) {
      dom.mapEmpty?.classList.remove('d-none');
      return;
    }
    dom.mapEmpty?.classList.add('d-none');
    
    // Usar todos los destinos para calcular los límites del mapa, 
    // así la vista se mantiene en "Enfocar país" incluso al filtrar.
    const bounds = [[AIFA_COORDS.lat, AIFA_COORDS.lng]]; 
    state.destinations.forEach(d => {
        if (d.coords) bounds.push([d.coords.lat, d.coords.lng]);
    });

    dataset.forEach(dest => {
      if (!dest.coords) return;
      const total = dest.viewWeeklyTotal ?? dest.weeklyTotal;
      const icon = buildMarkerIcon(total, dest.iata);
      const marker = L.marker([dest.coords.lat, dest.coords.lng], { icon }).addTo(state.markerLayer);
      marker.bindTooltip(`${dest.city} (${dest.iata})\n${intlNumber.format(total)} frecuencias/semana`);
      marker.on('click', () => filterByDestination(dest.iata));
    });

    if (bounds.length) {
      const leafletBounds = L.latLngBounds(bounds);
      // Ajuste de padding para asegurar que se vean todos los destinos
      state.map.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 8 });
    }
    animatePlanes(dataset);
  }

  function animatePlanes(dataset){
    if (!state.map || !state.planeLayer) return;
    state.planeLayer.clearLayers();
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    if (state.animationTimeoutId) clearTimeout(state.animationTimeoutId);

    // Filtrar destinos válidos
    const validDestinations = dataset.filter(d => d.coords && (d.viewWeeklyTotal ?? d.weeklyTotal) > 0);
    if (!validDestinations.length) return;

    let currentIndex = 0;
    let currentPlane = null;
    let currentLine = null;
    let startTime = 0;
    const duration = 5000; // 5 segundos por vuelo (lento)

    function startNextFlight(){
        if (currentIndex >= validDestinations.length) {
            currentIndex = 0; // Loop infinito
        }
        const dest = validDestinations[currentIndex];
        const start = L.latLng(AIFA_COORDS.lat, AIFA_COORDS.lng);
        const end = L.latLng(dest.coords.lat, dest.coords.lng);

        // Dibujar línea de trayectoria (trayectoria real visual)
        if (currentLine) state.planeLayer.removeLayer(currentLine);
        currentLine = L.polyline([start, end], {
            color: '#0d6efd',
            weight: 2,
            opacity: 0.4,
            dashArray: '5, 10'
        }).addTo(state.planeLayer);

        // Crear avión
        const icon = L.divIcon({
            className: 'frecuencia-plane-icon',
            html: '<i class="fas fa-plane"></i>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        if (currentPlane) state.planeLayer.removeLayer(currentPlane);
        currentPlane = L.marker(start, { icon, zIndexOffset: 500, interactive: false }).addTo(state.planeLayer);

        startTime = performance.now();
        requestAnimationFrame((now) => animate(now, start, end));
    }

    function animate(now, start, end){
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Interpolación lineal
        const lat = start.lat + (end.lat - start.lat) * t;
        const lng = start.lng + (end.lng - start.lng) * t;
        currentPlane.setLatLng([lat, lng]);

        // Rotación
        const dy = end.lat - start.lat;
        const dx = end.lng - start.lng;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const iconEl = currentPlane.getElement()?.querySelector('i');
        if (iconEl) {
            // Ajuste de rotación: 
            // Análisis de intentos previos:
            // 1. "270 - angle" -> Avión de espalda (180 grados opuesto).
            // 2. "90 - angle" -> Ala izquierda al destino (90 grados desfasado).
            // Conclusión: El icono base apunta a la DERECHA (Este).
            // Solución: "-angle" rota desde el Este hacia el Norte (anti-horario en CSS negativo).
            iconEl.style.transform = `rotate(${-angle}deg)`;
        }

        if (t < 1) {
            state.animationFrameId = requestAnimationFrame((nextNow) => animate(nextNow, start, end));
        } else {
            // Vuelo terminado, esperar un poco y lanzar el siguiente
            state.animationTimeoutId = setTimeout(() => {
                if (currentPlane) state.planeLayer.removeLayer(currentPlane);
                if (currentLine) state.planeLayer.removeLayer(currentLine);
                currentIndex++;
                startNextFlight();
            }, 500);
        }
    }

    startNextFlight();
  }

  function buildMarkerIcon(total, label){
    // Icono de ubicación (pin) con número pequeño para evitar saturación
    return L.divIcon({
      className: 'frecuencia-pin-marker',
      html: `<div class="pin-content"><i class="fas fa-location-dot"></i><span>${total}</span></div>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      tooltipAnchor: [0, -35]
    });
  }

  function filterByDestination(iata){
    state.filters.destination = iata;
    if (dom.filters.destination) dom.filters.destination.value = iata;
    applyFilters();
  }

  function focusDestination(iata){
    const row = dom.tableBody?.querySelector(`[data-destination-row="${iata}"]`);
    if (!row) return;
    dom.tableBody.querySelectorAll('.frecuencias-row-highlight').forEach(r => r.classList.remove('frecuencias-row-highlight'));
    row.classList.add('frecuencias-row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Also filter the map to show only this destination's plane
    // We don't want to change the global filter state (which would hide the table rows),
    // just the map visualization.
    const dest = state.destinations.find(d => d.iata === iata);
    if (dest) {
        animatePlanes([dest]);
    }
  }

  function fitMapToData(){
    if (!state.map || !state.destinations.length) return;
    // Calcular bounds basados en TODOS los destinos, no solo los visibles
    const bounds = [[AIFA_COORDS.lat, AIFA_COORDS.lng]];
    state.destinations.forEach(d => {
        if (d.coords) bounds.push([d.coords.lat, d.coords.lng]);
    });
    const leafletBounds = L.latLngBounds(bounds);
    state.map.fitBounds(leafletBounds, { padding: [30, 30], maxZoom: 8 });
  }

  function updateActiveFiltersText(){
    if (!dom.activeFilters) return;
    const active = [];
    if (state.filters.airline !== 'all') {
      const found = state.uniqueAirlines.find(a => a.slug === state.filters.airline);
      active.push(`Aerolínea: ${found?.name || state.filters.airline}`);
    }
    if (state.filters.destination !== 'all') active.push(`Destino: ${state.filters.destination}`);
    if (state.filters.day !== 'all') active.push(`Día: ${DAY_LABELS[state.filters.day]}`);
    if (state.filters.search) active.push(`Búsqueda: "${state.filters.search}"`);
    dom.activeFilters.textContent = active.length ? `Filtros activos → ${active.join(' · ')}` : 'Mostrando todos los destinos.';
  }

  function normalizeDestinations(list){
    return list.map(dest => {
      const airlines = (dest.airlines || []).map(air => normalizeAirline(air)).filter(Boolean);
      const weeklyTotal = airlines.reduce((sum, air) => sum + air.weeklyTotal, 0);
      const dailyTotals = DAY_CODES.map((_, idx) => airlines.reduce((sum, air) => sum + (air.daily[idx] || 0), 0));
      const searchText = `${dest.city || ''} ${dest.state || ''} ${dest.iata || ''} ${airlines.map(a => a.name).join(' ')}`.toLowerCase();
      return {
        routeId: dest.routeId,
        city: toTitleCase(dest.city) || 'Sin ciudad',
        state: toTitleCase(dest.state) || '',
        iata: dest.iata || '—',
        airports: Array.isArray(dest.airports) ? dest.airports : [],
        airlines,
        weeklyTotal,
        dailyTotals,
        coords: AIRPORT_COORDS[dest.iata] || null,
        searchText
      };
    });
  }

  function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
  }

  function normalizeAirline(air){
    const daily = DAY_CODES.map(code => Number(air?.daily?.[code] ?? 0));
    const weeklyTotal = Number(air?.weeklyTotal) || daily.reduce((sum, val) => sum + val, 0);
    return {
      name: air?.name || 'Sin aerolínea',
      slug: slugify(air?.name || 'sin-aerolinea'),
      daily,
      weeklyTotal
    };
  }

  function projectDestination(dest){
    const airlines = state.filters.airline === 'all'
      ? dest.airlines
      : dest.airlines.filter(air => air.slug === state.filters.airline);
    if (!airlines.length && state.filters.airline !== 'all') return null;
    const viewWeekly = airlines.reduce((sum, air) => sum + air.weeklyTotal, 0);
    const viewDaily = DAY_CODES.map((_, idx) => airlines.reduce((sum, air) => sum + (air.daily[idx] || 0), 0));
    return { ...dest, viewAirlines: airlines, viewWeeklyTotal: viewWeekly, viewDailyTotals: viewDaily };
  }

  function collectAirlines(destinations){
    const map = new Map();
    destinations.forEach(dest => {
      dest.airlines.forEach(air => {
        if (!map.has(air.slug)) map.set(air.slug, air.name);
      });
    });
    return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));
  }

  function populateFilters(){
    if (dom.filters.airline) {
      dom.filters.airline.innerHTML = '<option value="all">Todas las aerolíneas</option>';
      state.uniqueAirlines.forEach(air => {
        const opt = document.createElement('option');
        opt.value = air.slug;
        opt.textContent = air.name;
        dom.filters.airline.appendChild(opt);
      });
    }
    if (dom.filters.destination) {
      dom.filters.destination.innerHTML = '<option value="all">Todos los destinos</option>';
      [...state.destinations]
        .sort((a, b) => a.city.localeCompare(b.city, 'es-MX'))
        .forEach(dest => {
          const opt = document.createElement('option');
          opt.value = dest.iata;
          opt.textContent = `${dest.city} (${dest.iata})`;
          dom.filters.destination.appendChild(opt);
        });
    }
  }

  function updateMeta(data){
    if (dom.weekLabel) dom.weekLabel.textContent = data?.weekLabel ? data.weekLabel : 'Semana sin etiqueta';
    if (dom.weekRange) {
      if (data?.validFrom && data?.validTo) {
        dom.weekRange.textContent = `${formatDate(data.validFrom)} – ${formatDate(data.validTo)}`;
      } else {
        dom.weekRange.textContent = 'Vigencia no disponible';
      }
    }
    if (dom.lastUpdated) dom.lastUpdated.textContent = `Generado el ${intlDate.format(new Date())}`;
    
    if (data?.weekLabel) {
        updateTableHeaders(data.weekLabel);
    }
  }

  function updateTableHeaders(weekLabel) {
      const months = {
          'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11,
          'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
      };

      let startDate;

      // Try format: "Semana del 08 al 14 Dic 2025" OR "08-14 Dic 2025"
      let matchSame = weekLabel.match(/^Semana del (\d{1,2}) al (\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/);
      if (!matchSame) matchSame = weekLabel.match(/^(\d{1,2})-(\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/);

      if (matchSame) {
          const day = parseInt(matchSame[1], 10);
          const monthStr = matchSame[3];
          const year = parseInt(matchSame[4], 10);
          const month = months[monthStr.substring(0, 3)];
          if (month !== undefined) {
              startDate = new Date(year, month, day);
          }
      } else {
          // Try format: "Semana del 29 Dic al 04 Ene 2026" OR "29 Dic - 04 Ene 2026"
          let matchDiff = weekLabel.match(/^Semana del (\d{1,2})\s+([A-Za-z]{3})\.?\s+al\s+(\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/);
          if (!matchDiff) matchDiff = weekLabel.match(/^(\d{1,2})\s+([A-Za-z]{3})\.?\s+-\s+(\d{1,2})\s+([A-Za-z]{3})\.?\s+(\d{4})$/);

          if (matchDiff) {
              const day = parseInt(matchDiff[1], 10);
              const monthStr = matchDiff[2];
              let year = parseInt(matchDiff[5], 10);
              const startMonth = months[monthStr.substring(0, 3)];
              const endMonth = months[matchDiff[4].substring(0, 3)];
              
              if (startMonth === 11 && endMonth === 0) {
                  year -= 1;
              }
              
              if (startMonth !== undefined) {
                  startDate = new Date(year, startMonth, day);
              }
          }
      }

      if (!startDate) return;

      const headers = dom.tableBody.closest('table').querySelectorAll('thead th');
      const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
      
      // Set widths for fixed columns
      if (headers[0]) headers[0].style.width = '20%'; // Destino
      if (headers[1]) headers[1].style.width = '15%'; // Aerolínea
      if (headers[9]) headers[9].style.width = '9%';  // Total

      for (let i = 0; i < 7; i++) {
          const current = new Date(startDate);
          current.setDate(startDate.getDate() + i);
          const dayStr = current.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
          
          // Indices 2 to 8 correspond to Lun-Dom
          if (headers[i + 2]) {
              headers[i + 2].innerHTML = `${days[i]}<br><small class="text-muted fw-normal" style="font-size: 0.75rem;">${dayStr}</small>`;
              headers[i + 2].style.width = '8%'; // Equal width for days
          }
      }
  }

  function formatDate(input){
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    return intlDate.format(date);
  }

  function showLoading(isLoading){
    if (!dom.loading) return;
    dom.loading.classList.toggle('d-none', !isLoading);
  }

  function showError(message){
    if (!dom.error) return;
    dom.error.textContent = message;
    dom.error.classList.remove('d-none');
  }

  async function fetchJson(url){
    const res = await fetch(`${url}?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function ensureLeaflet(){
    if (window.L && document.getElementById('leaflet-css')) return;
    if (window.__leafletLoading) return window.__leafletLoading;
    window.__leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return window.__leafletLoading;
  }

  function initMap(){
    if (!dom.mapContainer || state.map) return;
    state.map = L.map(dom.mapContainer, { attributionControl: false }).setView([23.5, -101.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(state.map);
    state.markerLayer = L.layerGroup().addTo(state.map);
    state.planeLayer = L.layerGroup().addTo(state.map);
  }

  function debounce(fn, wait){
    let timeout;
    return function(...args){
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function slugify(str){
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
})();
