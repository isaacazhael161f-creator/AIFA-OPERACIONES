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
    'aeromexico-connect': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
    'aerolitoral': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
    'volaris': { logo: 'logo_volaris.png', color: '#a300e6', text: '#ffffff' },
    'viva-aerobus': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    'viva': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    'vivaaerobus': { logo: 'logo_viva.png', color: '#00a850', text: '#ffffff' },
    'mexicana': { logo: 'logo_mexicana.png', color: '#008375', text: '#ffffff' },
    'copa-airlines': { logo: 'logo_copa.png', color: '#00529b', text: '#ffffff' },
    'copa': { logo: 'logo_copa.png', color: '#00529b', text: '#ffffff' },
    'arajet': { logo: 'logo_arajet.png', color: '#632683', text: '#ffffff' },
    'conviasa': { logo: 'logo_conviasa.png', color: '#e65300', text: '#ffffff' },
    'magnicharters': { logo: 'logo_magnicharters.png', color: '#1d3c6e', text: '#ffffff' },
    'magni': { logo: 'logo_magnicharters.png', color: '#1d3c6e', text: '#ffffff' },
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

  // Expose for global refresh
  window.reloadFrecuenciasNational = init;

  document.addEventListener('shown.bs.tab', evt => {
    if (evt.target && evt.target.id === 'frecuencias-auto-tab') {
      // Force immediate resize with no delay for better perceived performance
      requestAnimationFrame(() => {
         state.map?.invalidateSize();
         fitMapToData();
      });
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
      
      // Force map to recognize its container size using ResizeObserver
      // This is the most robust way to handle "display: none" to "display: block" transitions
      // and dynamic layout changes.
      if (dom.mapContainer) {
          const resizeObserver = new ResizeObserver(() => {
              if (state.map) {
                  state.map.invalidateSize();
                  // Only fit bounds if we haven't done it successfully yet or on major resizes?
                  // Just invalidating size is usually enough if fitBounds was called, 
                  // but re-fitting ensures the view is correct.
                  // We debounce it slightly to avoid thrashing during animations.
                  if (state.resizeTimeout) clearTimeout(state.resizeTimeout);
                  state.resizeTimeout = setTimeout(() => {
                      fitMapToData();
                  }, 100);
              }
          });
          resizeObserver.observe(dom.mapContainer);
          // Keep reference to disconnect later if needed (though module stays alive)
          state.resizeObserver = resizeObserver;
      }
      
      // Also trigger once immediately just in case observer takes a tick
      requestAnimationFrame(() => {
          state.map?.invalidateSize();
          fitMapToData();
      });
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
      
      // Group by week_label (assuming it uniquely identifies a dataset)
      const groups = {};
      rows.forEach(row => {
          const key = row.week_label;
          if (!groups[key]) {
              groups[key] = {
                  rows: [],
                  validFrom: new Date(row.valid_from + 'T00:00:00'),
                  // Force validTo to be 6 days after validFrom to ensure title coherence
                  // validTo: new Date(row.valid_to || row.valid_from) 
              };
              // Calculate validTo
              const vTo = new Date(groups[key].validFrom);
              vTo.setDate(vTo.getDate() + 6);
              groups[key].validTo = vTo;
          }
          groups[key].rows.push(row);
      });

      const today = new Date();
      // today.setHours(0,0,0,0); // Normalize today - ALREADY DONE by Date object if we compare timestamps? 
      // safer:
      today.setHours(0,0,0,0);

      // FORCE LATEST WEEK LOGIC (AS PER USER REQUEST)
      // Instead of finding the "closest" week, we strictly find the week with the LATEST validFrom date.
      // This ensures that as soon as a new week is uploaded (even if it's future), it becomes the default view.
      
      const sortedKeys = Object.keys(groups).sort((a, b) => {
          return groups[b].validFrom - groups[a].validFrom; // Descending date
      });

      let selectedKey = sortedKeys[0];

      // If no valid week found? Should not happen if rows exist.
      if (!selectedKey) selectedKey = Object.keys(groups)[0];

      const selectedGroup = groups[selectedKey];
      const selectedRows = selectedGroup.rows;
      const first = selectedRows[0]; // metadata is same for all rows in group

      const weekLabel = first.week_label;
      const validFrom = first.valid_from;
      
      // Force validTo calculation related to validFrom + 6 days
      // Avoid relying on DB valid_to which might be incorrect
      const dFrom = new Date(validFrom + 'T00:00:00');
      const dTo = new Date(dFrom);
      dTo.setDate(dFrom.getDate() + 6);
      
      const year = dTo.getFullYear();
      const month = String(dTo.getMonth() + 1).padStart(2, '0');
      const day = String(dTo.getDate()).padStart(2, '0');
      const validTo = `${year}-${month}-${day}`;
      
      // Group by route_id or iata
      const destinationsMap = {};
      
      selectedRows.forEach(row => {
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
              logo: row.logo,   // NUEVO
              color: row.color, // NUEVO
              daily: {
                  L: row.monday,
                  M: row.tuesday,
                  X: row.wednesday,
                  J: row.thursday,
                  V: row.friday,
                  S: row.saturday,
                  D: row.sunday
              },
              dailyDetails: { // NUEVO
                  L: row.monday_detail,
                  M: row.tuesday_detail,
                  X: row.wednesday_detail,
                  J: row.thursday_detail,
                  V: row.friday_detail,
                  S: row.saturday_detail,
                  D: row.sunday_detail
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
      dom.kpiNotes.flights.textContent = `${busiestDest.city} (${busiestDest.iata}) lidera con ${intlNumber.format(busiestDest.weeklyTotal)} frecuencias.`;
    }
    if (dom.kpiNotes.destinations) dom.kpiNotes.destinations.textContent = 'Cobertura basada en rutas activas durante la semana.';
    if (dom.kpiNotes.airlines && state.uniqueAirlines[0]) {
       const top = state.uniqueAirlines[0];
       const legacyConfig = AIRLINE_CONFIG[top.slug] || AIRLINE_CONFIG['default'];
       const config = {
          logo: top.logo || legacyConfig.logo,
          color: top.color || legacyConfig.color
       };
       
       if (config.logo) {
         // Diseño más grande y estilizado tipo badge/tarjeta
         const logoHtml = `
            <div class="d-inline-flex align-items-center justify-content-center bg-white border rounded-3 px-3 py-1 ms-2 shadow-sm" style="height: 45px; vertical-align: middle;">
                <img src="images/airlines/${config.logo}" alt="${top.name}" title="${top.name}" style="height: 100%; width: auto; max-width: 110px; object-fit: contain;">
            </div>
         `;
         // Usamos flexbox center para alinear el texto "Top:" con la tarjeta del logo
         dom.kpiNotes.airlines.innerHTML = `<div class="d-flex align-items-center justify-content-center mt-2"><span class="fw-bold text-muted me-1">Top:</span> ${logoHtml}</div>`;
       } else {
         dom.kpiNotes.airlines.textContent = `Top: ${top.name}`;
       }
    }
  }

  function renderDowSummary(){
    if (!dom.dowList) return;
    const dataset = state.filtered.length ? state.filtered : state.destinations;
    dom.dowList.innerHTML = '';
    DAY_CODES.forEach((code, idx) => {
      const total = dataset.reduce((sum, dest) => sum + (dest.viewDailyTotals?.[idx] ?? dest.dailyTotals?.[idx] ?? 0), 0);
      const card = document.createElement('div');
      
      // Improved card design
      card.className = 'frecuencias-dow-card';
      card.style.cssText = `
        display: flex; 
        flex-direction: column; 
        align-items: flex-start; 
        justify-content: center;
        background: #fff; 
        border: 1px solid #e9ecef; 
        border-radius: 8px; 
        padding: 12px 16px; 
        min-width: 140px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        transition: transform 0.2s, box-shadow 0.2s;
        flex: 1;
      `;
      card.onmouseover = () => {
          card.style.transform = 'translateY(-2px)';
          card.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)';
          card.style.borderColor = '#dee2e6';
      };
      card.onmouseout = () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
          card.style.borderColor = '#e9ecef';
      };

      const dayLabel = DAY_LABELS[code].toUpperCase(); // LUNES, MARTES...
      
      card.innerHTML = `
        <div style="font-size: 0.7rem; font-weight: 700; color: #6c757d; margin-bottom: 4px; letter-spacing: 0.5px;">${dayLabel}</div>
        <div style="font-size: 1.5rem; font-weight: 800; color: #212529; line-height: 1;">${intlNumber.format(total)}</div>
      `;
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
      dom.insights.appendChild(buildInsight('fa-location-dot', `${topDestination.city} (${topDestination.iata}) concentra ${intlNumber.format(topDestination.viewWeeklyTotal ?? topDestination.weeklyTotal)} frecuencias.`));
    }

    const airlineTotals = new Map();
    dataset.forEach(dest => {
      const source = dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines;
      source.forEach(air => {
        if (!airlineTotals.has(air.name)) {
            airlineTotals.set(air.name, { total: 0, slug: air.slug, logo: air.logo, color: air.color });
        }
        airlineTotals.get(air.name).total += air.weeklyTotal;
      });
    });
    const topAirlineEntry = [...airlineTotals.entries()].sort((a, b) => b[1].total - a[1].total)[0];
    
    if (topAirlineEntry) {
      const [name, data] = topAirlineEntry;
      const legacyConfig = AIRLINE_CONFIG[data.slug] || AIRLINE_CONFIG['default'];
      const config = {
          logo: data.logo || legacyConfig.logo,
          color: data.color || legacyConfig.color
      };
      let airlineDisplay = name;
      
      if (config.logo) {
          let logoStyle = 'height: 24px; width: auto; vertical-align: middle; margin-right: 4px;';
          if (['mexicana', 'volaris', 'aeromexico'].includes(data.slug)) {
              logoStyle = 'height: 40px; width: auto; vertical-align: middle; margin-right: 4px;';
          }
          airlineDisplay = `<img src="images/airlines/${config.logo}" alt="${name}" title="${name}" style="${logoStyle}">`;
      }
      
      dom.insights.appendChild(buildInsight('fa-plane', `${airlineDisplay} aporta ${intlNumber.format(data.total)} frecuencias semanales.`));
    }

    const dayTotals = DAY_CODES.map((code, idx) => ({ code, value: dataset.reduce((sum, dest) => sum + (dest.viewDailyTotals?.[idx] ?? dest.dailyTotals?.[idx] ?? 0), 0) }));
    const hottestDay = dayTotals.sort((a, b) => b.value - a.value)[0];
    if (hottestDay) {
      dom.insights.appendChild(buildInsight('fa-calendar-day', `${DAY_LABELS[hottestDay.code]} es el día con más frecuencias (${intlNumber.format(hottestDay.value)}).`));
    }
  }

  function buildInsight(icon, htmlContent){
    const div = document.createElement('div');
    div.className = 'frecuencias-insight-card';
    div.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 8px;
        border-left: 4px solid #0d6efd;
    `;
    div.innerHTML = `<i class="fas ${icon} text-primary" aria-hidden="true"></i><span style="font-weight: 500; font-size: 0.9rem; color: #495057; display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">${htmlContent}</span>`;
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
        
        // Configuración de aerolínea (logo y color) - Prioridad a DB
        const legacyConfig = AIRLINE_CONFIG[airline.slug] || AIRLINE_CONFIG['default'];
        const config = {
            logo: airline.logo || legacyConfig.logo,
            color: airline.color || legacyConfig.color,
            text: airline.color ? '#ffffff' : legacyConfig.text
        };
        
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
          const tdId = document.createElement('td');
          tdId.rowSpan = airlines.length;
          tdId.style.backgroundColor = '#ffffff';
          tdId.style.color = '#212529';
          tdId.textContent = dest.routeId || dest.iata || '';
          tr.appendChild(tdId);

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
          const count = airline.daily?.[dayIdx] ?? 0;
          const detail = airline.dailyDetails?.[dayIdx];
          
          // Default: Show Count
          tdDay.textContent = count > 0 ? count : '-';
          
          tdDay.style.backgroundColor = config.color;
          tdDay.style.color = '#ffffff';
          
          // Interaction Logic
          if (detail && count > 0) {
              tdDay.style.cursor = 'pointer';
              tdDay.title = 'Clic para ver horarios y números de vuelo';
              // Add visual hint (small dotted underline)
              tdDay.style.textDecoration = 'underline dotted rgba(255,255,255,0.7)';
              
              tdDay.addEventListener('click', (e) => {
                  e.stopPropagation(); // Prevent row click (map zoom)
                  toggleFlightDetailsInCell(tdDay, count, detail);
              });
          }

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

  function toggleFlightDetailsInCell(cell, count, detailHtml) {
      if (cell.dataset.view === 'detail') {
          // Revert to count view
          cell.textContent = count;
          cell.dataset.view = 'count';
          cell.style.fontSize = '';
          cell.style.whiteSpace = '';
          cell.style.padding = '';
      } else {
          // Switch to detail view
          // detailHtml is raw string like "VB102 14:00<br>VB405 19:30"
          const flights = detailHtml.split('<br>');
          
          let html = '<div class="d-flex flex-column gap-1 text-start" style="min-width: 80px;">';
          flights.forEach(f => {
             const parts = f.trim().split(' ');
             const flightNum = parts[0] || '';
             const time = parts.slice(1).join(' ') || '';
             
             // Styled item: Flight Number Bold, Time Monospace
             html += `
                <div class="px-2 py-1 rounded d-flex justify-content-between align-items-center bg-white bg-opacity-25" style="font-size: 0.75rem; color: inherit;">
                    <span class="fw-bold me-1">${flightNum}</span>
                    <span class="font-monospace small opacity-75">${time}</span>
                </div>
             `;
          });
          html += '</div>';

          cell.innerHTML = html;
          cell.dataset.view = 'detail';
          // Adjust cell for better content fit
          cell.style.fontSize = '0.75rem';
          cell.style.whiteSpace = 'normal';
          cell.style.padding = '4px 6px';
      }
  }

  function renderDestinationDetails(dest) {
    if (!dom.detailsTitle || !dom.detailsBody) return;
    dom.detailsTitle.textContent = `${dest.city} (${dest.iata})`;
    
    const projected = projectDestination(dest);
    if (!projected) {
        dom.detailsBody.innerHTML = '<div class="p-3 text-muted">No hay vuelos con los filtros actuales.</div>';
        return;
    }

    const abbrs = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    
    // Calcular fechas específicas si existen
    const dateLabels = abbrs.map((d, i) => {
        if (state.raw?.validFrom) {
            const date = new Date(state.raw.validFrom + 'T00:00:00');
            date.setDate(date.getDate() + i);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            return `${d}<br><span style="font-size: 0.65rem; font-weight: normal; opacity: 0.8;">${day}/${month}/${year}</span>`;
        }
        return d;
    });

    projected.viewAirlines.forEach(air => {
        const legacyConfig = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
        const config = {
            logo: air.logo || legacyConfig.logo,
            color: air.color || legacyConfig.color,
            text: air.color ? '#ffffff' : legacyConfig.text
        };
        
        let logoStyle = 'height: 32px; width: auto;';
        if (['mexicana', 'volaris', 'aeromexico'].includes(air.slug)) {
            logoStyle = 'height: 65px; width: auto;';
        }

        const headerContent = config.logo 
            ? `<img src="images/airlines/${config.logo}" alt="${air.name}" style="${logoStyle}" title="${air.name}">`
            : `<strong style="color: #212529; font-size: 1.1rem;">${air.name}</strong>`;
        
        const card = document.createElement('div');
        card.className = 'list-group-item p-3';

        // Header Section
        const header = document.createElement('div');
        header.className = 'd-flex align-items-center justify-content-between mb-3';
        header.innerHTML = `
            <div>${headerContent}</div>
            <div class="text-end">
                <div class="badge bg-primary rounded-pill px-3 py-2" style="font-size: 0.9rem; font-weight: 500;">
                    ${air.weeklyTotal} <span style="opacity: 0.8; font-weight: 400;">frecuencias/semana</span>
                </div>
            </div>`;
        card.appendChild(header);

        // Days Grid
        const grid = document.createElement('div');
        grid.className = 'd-flex gap-1 justify-content-between';

        DAY_CODES.forEach((code, idx) => {
            const count = air.daily[idx];
            const detail = air.dailyDetails?.[idx]; // Access by index, not code key
            const isActive = count > 0;
            
            const cell = document.createElement('div');
            // Base styles
            cell.className = `text-center rounded p-1 flex-fill ${isActive ? 'bg-primary-subtle border border-primary-subtle' : 'bg-light border border-light'}`;
            cell.style.minWidth = '35px';
            cell.style.transition = 'all 0.2s ease';
            
            // Date Label
            const dateDiv = document.createElement('div');
            dateDiv.className = `small ${isActive ? 'text-primary fw-semibold' : 'text-muted opacity-50'}`;
            dateDiv.style.fontSize = '0.7rem';
            dateDiv.style.marginBottom = '4px';
            dateDiv.style.lineHeight = '1.1';
            dateDiv.innerHTML = dateLabels[idx];
            cell.appendChild(dateDiv);

            // Value/Content Div
            const contentDiv = document.createElement('div');
            contentDiv.className = isActive ? 'text-primary fw-bold' : 'text-muted opacity-25';
            contentDiv.style.fontSize = '1.1rem'; // Large number by default
            contentDiv.style.lineHeight = '1.2';
            contentDiv.textContent = isActive ? count : '0';
            cell.appendChild(contentDiv);

            if (isActive && detail) {
                cell.style.cursor = 'pointer';
                cell.title = 'Ver vuelos y horarios';
                
                // Toggle Logic handled inline here for closure access
                cell.onclick = (e) => {
                    e.stopPropagation();
                    const isExpanded = contentDiv.dataset.view === 'detail';
                    
                    if (isExpanded) {
                        // Collapse
                        contentDiv.textContent = count;
                        contentDiv.dataset.view = 'count';
                        contentDiv.style.fontSize = '1.1rem';
                        contentDiv.style.textAlign = 'center';
                    } else {
                        // Expand
                        const flights = detail.split('<br>');
                        let listHtml = '<div class="d-flex flex-column gap-1 text-start mt-1">';
                        flights.forEach(f => {
                            const parts = f.trim().split(' ');
                            const flightNum = parts[0] || '';
                            const time = parts.slice(1).join(' ') || '';
                            listHtml += `
                                <div class="px-2 py-1 rounded bg-white border border-primary-subtle shadow-sm d-flex justify-content-between align-items-center" style="font-size: 0.7rem;">
                                    <span class="fw-bold text-dark">${flightNum}</span>
                                    <span class="font-monospace text-primary">${time}</span>
                                </div>`;
                        });
                        listHtml += '</div>';
                        
                        contentDiv.innerHTML = listHtml;
                        contentDiv.dataset.view = 'detail';
                        contentDiv.style.fontSize = '1rem';
                        contentDiv.style.textAlign = 'left';
                    }
                };
            }

            grid.appendChild(cell);
        });

        card.appendChild(grid);
        dom.detailsBody.appendChild(card);
    });

    const notes = document.createElement('div');
    notes.className = 'p-3 mt-2 bg-light border-top small text-muted';
    notes.innerHTML = `
        <div class="fw-bold mb-1">Notas:</div>
        <ul class="mb-0 ps-3" style="list-style-type: disc;">
            <li class="mb-1">Una frecuencia es cuantas veces va a un destino, se refiere a un aterrizaje y un despegue.</li>
            <li>Esta programación esta sujeta a cambios con base en las necesidades de las aerolíneas.</li>
        </ul>`;
    dom.detailsBody.appendChild(notes);
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

    let idx = 0;
    dataset.forEach(dest => {
      if (!dest.coords) return;
      const total = dest.viewWeeklyTotal ?? dest.weeklyTotal;
      const icon = buildMarkerIcon(total, dest.iata, dest.state);
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

        // Calculate Geodesic Path (Great Circle roughly)
        // Basic Bezier control point strategy for visual arc
        // Or spherical interpolation points
        const pathPoints = getGeodesicPath(start, end);

        // Dibujar línea de trayectoria (trayectoria real visual)
        if (currentLine) state.planeLayer.removeLayer(currentLine);
        currentLine = L.polyline(pathPoints, {
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
        requestAnimationFrame((now) => animate(now, pathPoints));
    }

    function animate(now, pathPoints){
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Interpolación along path
        // Find segment index
        const totalSegments = pathPoints.length - 1;
        const segmentFloat = t * totalSegments;
        const segmentIndex = Math.floor(segmentFloat);
        const segmentT = segmentFloat - segmentIndex;

        let lat, lng, nextLat, nextLng;

        if (segmentIndex >= totalSegments) {
             lat = pathPoints[totalSegments].lat;
             lng = pathPoints[totalSegments].lng;
             nextLat = lat; // No movement
             nextLng = lng;
        } else {
             const p1 = pathPoints[segmentIndex];
             const p2 = pathPoints[segmentIndex + 1];
             lat = p1.lat + (p2.lat - p1.lat) * segmentT;
             lng = p1.lng + (p2.lng - p1.lng) * segmentT;
             nextLat = p2.lat;
             nextLng = p2.lng;
        }
        
        currentPlane.setLatLng([lat, lng]);

        // Rotación
        // Calculate heading based on current segment or immediate derivative
        // Simple: Heading to next point
        // Better: derivative at t
        let angle = 0;
        if (segmentIndex < totalSegments) {
            const p1 = pathPoints[segmentIndex];
            const p2 = pathPoints[segmentIndex + 1];
            const dy = p2.lat - p1.lat;
            const dx = p2.lng - p1.lng;
            angle = Math.atan2(dy, dx) * 180 / Math.PI;
        } else {
           // Keep last angle or 0
        }
        
        const iconEl = currentPlane.getElement()?.querySelector('i');
        if (iconEl) {
            iconEl.style.transform = `rotate(${-angle}deg)`;
        }

        if (t < 1) {
            state.animationFrameId = requestAnimationFrame((nextNow) => animate(nextNow, pathPoints));
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

    // Helper for Great Circle Approximation
    function getGeodesicPath(start, end, numPoints = 100) {
        const lat1 = start.lat * Math.PI / 180;
        const lon1 = start.lng * Math.PI / 180;
        const lat2 = end.lat * Math.PI / 180;
        const lon2 = end.lng * Math.PI / 180;
        
        const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)));
        
        const path = [];
        for (let i = 0; i <= numPoints; i++) {
            const f = i / numPoints;
            const A = Math.sin((1 - f) * d) / Math.sin(d);
            const B = Math.sin(f * d) / Math.sin(d);
            const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
            const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
            const z = A * Math.sin(lat1) + B * Math.sin(lat2);
            const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
            const lon = Math.atan2(y, x);
            path.push(L.latLng(lat * 180 / Math.PI, lon * 180 / Math.PI));
        }
        return path;
    }

    startNextFlight();
  }

  const MARKER_PALETTE = ['#D32F2F', '#C2185B', '#7B1FA2', '#512DA8', '#303F9F', '#1976D2', '#0288D1', '#0097A7', '#00796B', '#388E3C', '#689F38', '#AFB42B', '#FBC02D', '#FFA000', '#F57C00', '#E64A19', '#5D4037', '#616161', '#455A64']; // Full palette restored for stateColorMap function usage to work but logic will always return 0 if we override getMarkerColor

  // Override to return just red
  function getMarkerColor(stateName) {
      return '#dc3545';
  }

  function buildMarkerIcon(total, label, stateName){
    const color = getMarkerColor(stateName);
    
    return L.divIcon({
      className: 'frecuencia-pin-marker',
      // Revert to original text color but keep red icon
      html: `<div class="pin-content"><i class="fas fa-location-dot" style="color: ${color};"></i><span style="color: #fff; text-shadow: 0 0 2px #000;">${total}</span></div>`,
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
    
    // Check if map container has size. If not, fitBounds won't work correctly.
    const container = state.map.getContainer();
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

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

  function groupByRoute(destinations){
    // Flatten logic assumes specific data shape from JSON/DB.
    // Logic updated to accommodate DB raw entries if needed, but current fetch maps to 'destinations'
    return destinations.map(dest => {
       const groupRows = {
           route_id: dest.iata, // or logic from ord
           iata: dest.iata,
           city: dest.city,
           state: dest.state,
           week_label: dom.weekLabel.textContent, // from global or first item
           airlines: dest.viewAirlines.map(air => ({
               ...air, // Pass through all props including daily & details
               week_label: dom.weekLabel.textContent,
               route_id: dest.iata,
               iata: dest.iata,
               city: dest.city,
               state: dest.state,
               airline: air.name,
               slug: air.slug
           }))
       };
       return groupRows; 
    });
  }

  function normalizeAirline(air){
    const daily = DAY_CODES.map(code => Number(air?.daily?.[code] ?? 0));
    const dailyDetails = DAY_CODES.map(code => air?.dailyDetails?.[code] || ''); // Capture details
    const weeklyTotal = Number(air?.weeklyTotal) || daily.reduce((sum, val) => sum + val, 0);
    return {
      name: air?.name || 'Sin aerolínea',
      slug: slugify(air?.name || 'sin-aerolinea'),
      logo: air?.logo,
      color: air?.color,
      daily,
      dailyDetails, // Store details
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
        if (!map.has(air.slug)) {
          map.set(air.slug, { 
            name: air.name, 
            total: 0,
            logo: air.logo,
            color: air.color 
          });
        }
        const entry = map.get(air.slug);
        entry.total += (air.weeklyTotal || 0);
      });
    });
    return [...map.entries()]
      .map(([slug, data]) => ({ 
        slug, 
        name: data.name, 
        total: data.total,
        logo: data.logo,
        color: data.color 
      }))
      .sort((a, b) => {
        // Sort by Total Descending, then Alphabetical
        const diff = b.total - a.total;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'es-MX');
      });
  }

  function populateFilters(){
    // Airline Options -> Logo Grid
    if (dom.filters.airline) {
        dom.filters.airline.style.display = 'none'; // ocultar select original
        
        let logoContainer = pane.querySelector('#frecuencias-airline-logos');
        if (!logoContainer) {
            logoContainer = document.createElement('div');
            logoContainer.id = 'frecuencias-airline-logos';
            logoContainer.className = 'airline-filter-toolbar mb-3'; // New Class
            // Insertar después del label si existe, o reemplazar el select en posición visual
            dom.filters.airline.parentNode.insertBefore(logoContainer, dom.filters.airline.nextSibling);
        }
        logoContainer.innerHTML = '';

        // Botón "Todas"
        const btnAll = document.createElement('button');
        btnAll.className = 'airline-filter-btn active'; // New Class
        btnAll.textContent = 'Todas';
        btnAll.dataset.airline = 'all';
        btnAll.onclick = () => selectAirlineFilter('all', btnAll);
        logoContainer.appendChild(btnAll);

        const sortedAirlines = [...state.uniqueAirlines].sort((a,b) => a.name.localeCompare(b.name));
        sortedAirlines.forEach(air => {
            const legacyConfig = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
            const config = {
                logo: air.logo || legacyConfig.logo,
                color: air.color || legacyConfig.color
            };

            const btn = document.createElement('button');
            btn.className = 'airline-filter-btn'; // New Class
            btn.dataset.airline = air.slug;
            btn.title = air.name;
            
            if (config.logo) {
                let logoStyle = 'height: 20px; width: auto; object-fit: contain;';
                if (['mexicana', 'volaris', 'aeromexico'].includes(air.slug)) {
                    logoStyle = 'height: 28px; width: auto; object-fit: contain;';
                }
                 btn.innerHTML = `<img src="images/airlines/${config.logo}" alt="${air.name}" style="${logoStyle}">`;
            } else {
                btn.textContent = air.name;
            }

            btn.onclick = () => selectAirlineFilter(air.slug, btn);
            logoContainer.appendChild(btn);
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

  function selectAirlineFilter(slug, btnElement) {
      state.filters.airline = slug;
      if (dom.filters.airline) dom.filters.airline.value = slug; // sync select just in case
      
      // Actualizar UI
      const container = pane.querySelector('#frecuencias-airline-logos');
      if (container) {
          const buttons = container.querySelectorAll('.airline-filter-btn');
          buttons.forEach(b => b.classList.remove('active'));

          // Activar el seleccionado
          btnElement.classList.add('active');
      }
      applyFilters();
  }

  function updateMeta(data){
    if (dom.weekLabel) dom.weekLabel.textContent = data?.weekLabel ? data.weekLabel : 'Semana sin etiqueta';
    
    if (dom.weekRange) {
      if (data?.validFrom && data?.validTo) {
        dom.weekRange.textContent = formatDateRangeDetailed(data.validFrom, data.validTo);
      } else {
        dom.weekRange.textContent = 'Vigencia no disponible';
      }
    }
    if (dom.lastUpdated) dom.lastUpdated.textContent = `Generado el ${intlDate.format(new Date())}`;
    
    if (data?.validFrom) {
        updateTableHeaders(data.validFrom);
    }
  }

  function formatDateRangeDetailed(startStr, endStr) {
      // Helper to parse "YYYY-MM-DD" parts
      const parseDateParts = (str) => {
          const d = new Date(str + 'T00:00:00');
          return {
              day: d.getDate().toString().padStart(2, '0'),
              month: d.toLocaleString('es-MX', { month: 'long' }), // e.g., "enero"
              monthShort: d.toLocaleString('es-MX', { month: 'short' }),
              year: d.getFullYear()
          };
      };

      const start = parseDateParts(startStr);
      const end = parseDateParts(endStr);
      
      // Capitalize first letter of month? usually lowercase in Spanish dates mid-sentence.
      // But user example "Ene" was in badge. Text "enero" is preferred for full description.
      
      // Logic for concise range
      if (start.year === end.year) {
          if (start.month === end.month) {
              return `Del ${start.day} al ${end.day} de ${start.month} de ${start.year}`;
          } else {
              return `Del ${start.day} de ${start.month} al ${end.day} de ${end.month} de ${start.year}`;
          }
      } else {
          return `Del ${start.day} de ${start.month} de ${start.year} al ${end.day} de ${end.month} de ${end.year}`;
      }
  }

  function updateTableHeaders(startDateInput) {
      if (!startDateInput) return;

      let startDate;
      if (typeof startDateInput === 'string') {
          startDate = new Date(startDateInput + 'T00:00:00');
      } else if (startDateInput instanceof Date) {
          startDate = new Date(startDateInput);
      } else {
          return;
      }

      if (isNaN(startDate.getTime())) return;

      const headers = dom.tableBody.closest('table').querySelectorAll('thead th');
      
      // Set widths for fixed columns
      if (headers[0]) headers[0].style.width = '8%'; // Id
      if (headers[1]) headers[1].style.width = '15%'; // Destino
      if (headers[2]) headers[2].style.width = '15%'; // Aerolínea
      if (headers[10]) headers[10].style.width = '7%';  // Total

      DAY_CODES.forEach((code, i) => {
          const colIndex = i + 3; // Shift by 1
          if (headers[colIndex]) {
              const current = new Date(startDate);
              current.setDate(current.getDate() + i); // Add days

              // Format
              const day = current.getDate().toString().padStart(2, '0');
              const month = (current.getMonth() + 1).toString().padStart(2, '0');
              const year = current.getFullYear().toString().slice(-2);
              const dateStr = `${day}/${month}/${year}`;

              const label = DAY_LABELS[code];
              headers[colIndex].innerHTML = `<div class="d-flex flex-column align-items-center" style="line-height:1.1;">
                <span>${label}</span>
                <span class="text-muted fw-normal mt-1" style="font-size: 0.75rem;">${dateStr}</span>
              </div>`;
          }
      });
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

    // Watch for visibility changes to fix grey map issues
    const resizeObserver = new ResizeObserver(() => {
        if (state.map) {
            state.map.invalidateSize();
            if (state.destinations && state.destinations.length > 0) {
                 // Use a small timeout to ensure container has layout
                 setTimeout(() => fitMapToData(), 100);
            }
        }
    });
    resizeObserver.observe(dom.mapContainer);
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
