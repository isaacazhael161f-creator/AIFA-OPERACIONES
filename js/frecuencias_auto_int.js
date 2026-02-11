(function(){
  const pane = document.getElementById('frecuencias-auto-int-pane');
  if (!pane) return;

  const DATA_URL = null; // No fallback JSON for int yet
  const DAY_CODES = ['L','M','X','J','V','S','D'];
  const DAY_LABELS = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
  const intlNumber = new Intl.NumberFormat('es-MX');
  const intlDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const AIRLINE_CONFIG = {
    'aeromexico': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
    'aeromexico-connect': { logo: 'logo_aeromexico.png', color: '#0b2161', text: '#ffffff' },
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
    'aerus': { logo: 'logo_aerus.png', color: '#bed62f', text: '#000000' },
     'avianca': { logo: 'logo_avianca.png', color: '#dc0d16', text: '#ffffff' },
    'american-airlines': { logo: 'logo_american-airlines.png', color: '#0369a0', text: '#ffffff' },
    'united': { logo: 'logo_united.png', color: '#011e41', text: '#ffffff' },
    'delta': { logo: 'logo_delta.png', color: '#ba0c2f', text: '#ffffff' },
    'iberia': { logo: 'logo_iberia.png', color: '#d7192d', text: '#ffffff' },
    'qatar-airways': { logo: 'logo_qatar-airways.png', color: '#5C0632', text: '#ffffff' },
    'china-southern': { logo: 'logo_china-southern.png', color: '#002A5C', text: '#ffffff' },
    'emirates-skycargo': { logo: 'logo_emirates-skycargo.png', color: '#D71822', text: '#ffffff' },
    'fedex': { logo: 'logo_fedex.png', color: '#4D148C', text: '#ffffff' },
    'dhl': { logo: 'logo_dhl.png', color: '#FFCC00', text: '#000000' },
    'mas': { logo: 'logo_mas.png', color: '#00A850', text: '#ffffff' },
    'air-canada': { logo: 'logo_air-canada.png', color: '#EE1C25', text: '#ffffff' },
    'default': { logo: null, color: '#ffffff', text: '#212529' }
  };

  const AIFA_COORDS = { lat: 19.7456, lng: -99.0086 };

  // --- DESTINATION IMAGES (LOCAL FOLDER MAPPING - INT) ---
  const DESTINATION_IMAGES = {
     'HAV': 'images/destinos_int/La Habana.jpg',
     'PUJ': 'images/destinos_int/Punta Cana.jpg',
     'SDQ': 'images/destinos_int/Santo Domingo.jpg',
     'BOG': 'images/destinos_int/Bogotá.jpg',
     'CCS': 'images/destinos_int/Caracas.jpg',
     'PTY': 'images/destinos_int/Ciudad de Panamá.jpg',
     'IAH': 'images/destinos_int/Houston.jpg',
     'MIA': 'images/destinos_int/Miami.jpg',
     'JFK': 'images/destinos_int/Nueva York.jpg',
     'ORD': 'images/destinos_int/Chicago.jpg',
     'DFW': 'images/destinos_int/Dallas.jpg',
     'MAD': 'images/destinos_int/Madrid.jpg',
     'CDG': 'images/destinos_int/París.jpg',
     'AMS': 'images/destinos_int/Ámsterdam.jpg',
     'LHR': 'images/destinos_int/Londres.jpg',
     'FRA': 'images/destinos_int/Fráncfort.jpg',
     'DOH': 'images/destinos_int/Doha.jpg',
     'ICN': 'images/destinos_int/Seúl.jpg',
     'NRT': 'images/destinos_int/Tokio.jpg',
     'HKG': 'images/destinos_int/Hong Kong.jpg',
     'YYZ': 'images/destinos_int/Toronto.jpg',
     'YVR': 'images/destinos_int/Vancouver.jpg',
     'YUL': 'images/destinos_int/Montreal.jpg',
     'LIM': 'images/destinos_int/Lima.jpg',
     'SCL': 'images/destinos_int/Santiago.jpg',
     'EZE': 'images/destinos_int/Buenos Aires.jpg',
     'GRU': 'images/destinos_int/São Paulo.jpg',
     'GIG': 'images/destinos_int/Río de Janeiro.jpg',
     'MCALLEN': 'images/destinos_int/McAllen.jpg',
     'SAT': 'images/destinos_int/San Antonio.jpg',
     // Add more as needed
  };

  // Manual mapping for clean display names
  const IATA_LOCATIONS = {
      'HAV': { city: 'La Habana', country: 'Cuba' },
      'PUJ': { city: 'Punta Cana', country: 'República Dominicana' },
      'SDQ': { city: 'Santo Domingo', country: 'República Dominicana' },
      'BOG': { city: 'Bogotá', country: 'Colombia' },
      'CCS': { city: 'Caracas', country: 'Venezuela' },
      'PTY': { city: 'Ciudad de Panamá', country: 'Panamá' },
      'IAH': { city: 'Houston', country: 'Estados Unidos' },
      'MIA': { city: 'Miami', country: 'Estados Unidos' },
      'JFK': { city: 'Nueva York', country: 'Estados Unidos' },
      'ORD': { city: 'Chicago', country: 'Estados Unidos' },
      'DFW': { city: 'Dallas', country: 'Estados Unidos' },
      'MAD': { city: 'Madrid', country: 'España' },
      'CDG': { city: 'París', country: 'Francia' },
      'AMS': { city: 'Ámsterdam', country: 'Países Bajos' },
      'LHR': { city: 'Londres', country: 'Reino Unido' },
      'FRA': { city: 'Fráncfort', country: 'Alemania' },
      'DOH': { city: 'Doha', country: 'Catar' },
      'ICN': { city: 'Seúl', country: 'Corea del Sur' },
      'NRT': { city: 'Tokio', country: 'Japón' },
      'HKG': { city: 'Hong Kong', country: 'China' },
      'YYZ': { city: 'Toronto', country: 'Canadá' },
      'YVR': { city: 'Vancouver', country: 'Canadá' },
      'YUL': { city: 'Montreal', country: 'Canadá' },
      'LIM': { city: 'Lima', country: 'Perú' },
      'SCL': { city: 'Santiago', country: 'Chile' },
      'EZE': { city: 'Buenos Aires', country: 'Argentina' },
      'GRU': { city: 'São Paulo', country: 'Brasil' },
      'GIG': { city: 'Río de Janeiro', country: 'Brasil' },
      'MCALLEN': { city: 'McAllen', country: 'Estados Unidos' }
  };

  // Extended coords for International
  const AIRPORT_COORDS = {
     // US & Canada
    IAH: { lat: 29.9902, lng: -95.3368 },
    DFW: { lat: 32.8998, lng: -97.0403 },
    MIA: { lat: 25.7959, lng: -80.2870 },
    ORD: { lat: 41.9742, lng: -87.9073 },
    JFK: { lat: 40.6413, lng: -73.7781 },
    YYZ: { lat: 43.6777, lng: -79.6248 },
    MCALLEN: { lat: 26.1758, lng: -98.2386 }, // MFE

    // Latin America & Caribbean
    HAV: { lat: 22.9972, lng: -82.4082 },
    PTY: { lat: 9.0714, lng: -79.3835 },
    CCS: { lat: 10.6012, lng: -66.9913 },
    NLU: { lat: 19.7456, lng: -99.0086 }, // AIFA itself
    SDQ: { lat: 18.4302, lng: -69.6789 },
    PUJ: { lat: 18.5674, lng: -68.3634 },
    BOG: { lat: 4.7016, lng: -74.1469 },
    LIM: { lat: -12.0241, lng: -77.1120 },
    SCL: { lat: -33.3928, lng: -70.7934 },
    EZE: { lat: -34.8150, lng: -58.5348 },
    GRU: { lat: -23.4356, lng: -46.4731 },
    GIG: { lat: -22.8089, lng: -43.2436 },

    // Europe
    MAD: { lat: 40.4839, lng: -3.5679 },
    CDG: { lat: 49.0097, lng: 2.5479 },
    AMS: { lat: 52.3105, lng: 4.7683 },
    LHR: { lat: 51.4700, lng: -0.4543 },
    FRA: { lat: 50.0379, lng: 8.5622 },

    // Asia
    DOH: { lat: 25.2730, lng: 51.6080 },
    ICN: { lat: 37.4602, lng: 126.4407 },
    NRT: { lat: 35.7719, lng: 140.3929 },
    HKG: { lat: 22.3080, lng: 113.9185 },

    // Fallback/Domestic in case they are logged here
    ACA: { lat: 16.7571, lng: -99.7534 },
    CUN: { lat: 21.0365, lng: -86.8769 },
    TIJ: { lat: 32.5411, lng: -116.9719 }
  };

  const dom = {
    loading: pane.querySelector('#frecuencias-int-loading'),
    content: pane.querySelector('#frecuencias-int-content'),
    error: pane.querySelector('#frecuencias-int-error'),
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
      airline: pane.querySelector('#frecuencias-int-airline-filter'),
      destination: pane.querySelector('#frecuencias-int-destination-filter'),
      day: null, // Removed day filter in HTML for simplicity or not used? HTML had it. Let's check HTML.
      search: pane.querySelector('#frecuencias-int-search')
    },
    resetFilters: pane.querySelector('#frecuencias-int-reset-filters'),
    excelButton: pane.querySelector('#frecuencias-int-download-excel'),
    // activeFilters: pane.querySelector('#frecuencias-active-filters'), // Not in int HTML
    dowList: pane.querySelector('#frecuencias-int-dow-list'),
    // insights: pane.querySelector('#frecuencias-insights'),
    mapContainer: pane.querySelector('#frecuencias-int-map'),
    mapEmpty: pane.querySelector('#frecuencias-int-map-empty'),
    fitButton: pane.querySelector('#frecuencias-int-fit-map'),
    tableBody: pane.querySelector('#frecuencias-int-destinos-table tbody'),
    tableCount: pane.querySelector('#frecuencias-int-table-count'),
    // tableEmpty: pane.querySelector('#frecuencias-empty'),
    mapCol: pane.querySelector('#frecuencias-int-map-col'),
    detailsCol: pane.querySelector('#frecuencias-int-details-col'),
    detailsTitle: pane.querySelector('#frecuencias-int-details-title'),
    detailsBody: pane.querySelector('#frecuencias-int-details-body'),
    detailsClose: pane.querySelector('#frecuencias-int-details-close')
  };

  const state = {
    raw: null,
    destinations: [],
    filtered: [],
    filters: { airline: 'all', destination: 'all', search: '' },
    uniqueAirlines: [],
    map: null,
    markerLayer: null,
    planeLayer: null,
    animationFrameId: null,
    animationTimeoutId: null
  };

  document.addEventListener('DOMContentLoaded', init);
  
  // Expose init for global refresh
  window.reloadFrecuenciasInt = init;

  document.addEventListener('shown.bs.tab', evt => {
    if (evt.target && evt.target.id === 'frecuencias-auto-int-tab') {
      setTimeout(() => {
        state.map?.invalidateSize();
        fitMapToData();
        if (state.filtered && state.filtered.length > 0) {
            animatePlanes(state.filtered);
        }
      }, 200);
    }
  });

  async function init(){
    prepareFilterSkeletons();
    showLoading(true);
    try {
      let data;
      try {
        const dbData = await window.dataManager.getWeeklyFrequenciesInt();
        data = transformDBData(dbData);
      } catch (e) {
        console.warn('Database fetch failed');
        throw e;
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
      
      // Force map to recognize its container size immediately after becoming visible
      requestAnimationFrame(() => {
          state.map?.invalidateSize();
          fitMapToData();
      });
    } catch (err) {
        console.error('Frecuencias Int automation error:', err);
        showError('No se pudo cargar la información de frecuencias internacionales.');
        showLoading(false);
    }
    wireInteractions();
  }

  function transformDBData(rows) {
      if (!rows || rows.length === 0) return { weekLabel: '', validFrom: '', validTo: '', destinations: [] };
      
      const groups = {};
      rows.forEach(row => {
          const key = row.week_label;
          if (!groups[key]) {
              groups[key] = {
                  rows: [],
                  validFrom: new Date(row.valid_from),
                  validTo: new Date(row.valid_to || row.valid_from)
              };
          }
          groups[key].rows.push(row);
      });

      const today = new Date();
      today.setHours(0,0,0,0);

      // FORCE LATEST WEEK LOGIC (AS PER USER REQUEST)
      // Sort by validFrom descending to always pick the newest week available in DB
      const sortedKeys = Object.keys(groups).sort((a, b) => {
          return groups[b].validFrom - groups[a].validFrom;
      });

      let selectedKey = sortedKeys[0];

      if (!selectedKey) selectedKey = Object.keys(groups)[0];

      const selectedGroup = groups[selectedKey];
      const selectedRows = selectedGroup.rows;
      const first = selectedRows[0];

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
    if (dom.filters.destination) dom.filters.destination.innerHTML = '<option value="all">Todas las regiones</option>';
  }

  function wireInteractions(){
    // Listen for tab shown event to restart animation instantly
    const tabEl = document.getElementById('frecuencias-auto-int-tab');
    if (tabEl) {
        tabEl.addEventListener('shown.bs.tab', () => {
            if (state.map) {
                state.map.invalidateSize();
                const bounds = [[AIFA_COORDS.lat, AIFA_COORDS.lng]]; 
                state.destinations.forEach(d => {
                    if (d.coords) bounds.push([d.coords.lat, d.coords.lng]);
                });
                if (bounds.length > 1) {
                    state.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 8 });
                }
            }
            animatePlanes(state.filtered);
        });
    }

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
    if (dom.excelButton) dom.excelButton.addEventListener('click', downloadExcel);
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
       const config = AIRLINE_CONFIG[top.slug] || AIRLINE_CONFIG['default'];
       
       if (config.logo) {
         // Diseño más grande y estilizado tipo badge/tarjeta
         const logoHtml = `
            <div class="d-inline-flex align-items-center justify-content-center bg-white border rounded-3 px-3 py-1 ms-2 shadow-sm" style="height: 45px; vertical-align: middle;">
                <img src="images/airlines/${config.logo}" alt="${top.name}" title="${top.name}" style="height: 100%; width: auto; max-width: 110px; object-fit: contain;">
            </div>
         `;
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
      
      // Improved card design - Consistent with National tab
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

      const dayLabel = DAY_LABELS[code].toUpperCase();
      
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
            airlineTotals.set(air.name, { total: 0, slug: air.slug });
        }
        airlineTotals.get(air.name).total += air.weeklyTotal;
      });
    });
    const topAirlineEntry = [...airlineTotals.entries()].sort((a, b) => b[1].total - a[1].total)[0];
    
    if (topAirlineEntry) {
      const [name, data] = topAirlineEntry;
      const config = AIRLINE_CONFIG[data.slug] || AIRLINE_CONFIG['default'];
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
        
        // Configuración de aerolínea (logo y color)
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
    
    const projected = projectDestination(dest);
    if (!projected) {
        dom.detailsTitle.textContent = `${dest.city} (${dest.iata})`;
        dom.detailsBody.innerHTML = '<div class="p-3 text-muted">No hay vuelos con los filtros actuales.</div>';
        return;
    }

    // --- DESTINATION HERO IMAGE LOGIC ---
    let heroImage = DESTINATION_IMAGES[dest.iata];
    
    // Custom Header with Image
    const heroContainer = document.createElement('div');
    heroContainer.style.position = 'relative';
    heroContainer.style.height = '280px';
    heroContainer.style.background = '#0a1f44'; // Fallback color
    heroContainer.style.overflow = 'hidden';
    heroContainer.style.borderBottom = '1px solid rgba(0,0,0,0.1)';

    if (heroImage) {
        heroContainer.innerHTML = `
            <div style="
                position: absolute;
                inset: 0;
                background-image: url('${heroImage}');
                background-size: cover;
                background-position: center;
                filter: brightness(0.65);
            "></div>
            <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                padding: 1rem;
                background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                color: white;
            ">
                <h4 class="mb-0 fw-bold text-white text-shadow" style="font-size: 1.8rem;">${dest.city}</h4>
                <div class="d-flex align-items-center gap-2 mt-1">
                    <span class="badge bg-white text-dark shadow-sm" style="font-size: 0.9em; border-radius: 6px;">${dest.iata}</span>
                    <span class="text-white text-shadow fw-light" style="font-size: 1rem; opacity: 0.9;">${dest.state}</span>
                </div>
            </div>
        `;
        // Hide default title since we have a hero
         dom.detailsTitle.style.display = 'none';
    } else {
        // Fallback header if no image
        dom.detailsTitle.textContent = `${dest.city} (${dest.iata})`;
        dom.detailsTitle.style.display = 'block';
    }

    dom.detailsBody.innerHTML = ''; // Clear previous content
    if (heroImage) {
        dom.detailsBody.appendChild(heroContainer);
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
        // Enable horizontal scrolling and prevent shrinking
        grid.className = 'd-flex gap-2 pb-2 overflow-auto';
        // Add scroll behavior styles if needed via class or logic

        DAY_CODES.forEach((code, idx) => {
            const count = air.daily[idx];
            const detail = air.dailyDetails?.[idx]; // Access by index, not code key
            const isActive = count > 0;
            
            const cell = document.createElement('div');
            // Base styles
            cell.className = `text-center rounded p-1 flex-shrink-0 ${isActive ? 'bg-primary-subtle border border-primary-subtle' : 'bg-light border border-light'}`;
            cell.style.minWidth = '50px'; // Slightly larger base width
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
                        cell.style.minWidth = '50px';
                        cell.classList.remove('flex-grow-1');
                    } else {
                        // Expand
                        cell.style.minWidth = '180px'; // Increase width to fit card
                        // cell.classList.add('flex-grow-1'); // Optional: make it take available space
                        
                        const flights = detail.split('<br>');
                        let listHtml = '<div class="d-flex flex-column gap-2 text-start mt-2">';
                        flights.forEach(f => {
                            const parts = f.trim().split(' ');
                            const flightNum = parts[0] || '';
                            let time = parts.slice(1).join(' ') || '';

                            // Clean up text that is redundant due to icons
                            time = time.replace(/\(Lleg\)/gi, '')
                                       .replace(/\(Sal\)/gi, '')
                                       .replace(/\(Arr\)/gi, '')
                                       .replace(/\(Dep\)/gi, '')
                                       .replace(/Llegada/gi, '')
                                       .replace(/Salida/gi, '')
                                       .trim();
                            
                            // Determine direction based on flight number parity (Standard convention: Odd=Outbound, Even=Inbound)
                            const num = parseInt(flightNum.replace(/\D/g, '')) || 0;
                            const isDeparture = (num % 2) !== 0; // Odd = Departure (Blue), Even = Arrival (Green)
                            
                            const iconClass = isDeparture ? 'fa-plane-arrival' : 'fa-plane-departure'; // Correction: Usually Odd is Outbound (Dep), Even is Inbound (Arr) from Hub perspective. 
                            // But usually displaying 'Frequencies' implies departures.
                            // Let's stick to the visual provided: XN1205 (Odd) -> Blue, XN1204 (Even) -> Green.
                            
                            const colorClass = isDeparture ? 'text-primary' : 'text-success';
                            const bgIconClass = isDeparture ? 'bg-primary' : 'bg-success';
                            const rotateClass = isDeparture ? 'fa-rotate-270' : ''; // Adjust icon rotation if needed
                            
                            // Fix icons based on screenshot: 
                            // Blue Icon = Taking off/Up Right
                            // Green Icon = Landing/Down Right
                            const iconDef = isDeparture 
                                ? '<i class="fas fa-plane-departure text-white" style="font-size: 0.9rem;"></i>' 
                                : '<i class="fas fa-plane-arrival text-white" style="font-size: 0.9rem;"></i>';

                            // Adopt style from frecuencias_auto.js for consistency (better spacing and layout)
                            listHtml += `
                                <div class="p-2 rounded bg-white border shadow-sm d-flex align-items-center justify-content-between mb-1" style="font-size: 0.95rem; border-color: #dee2e6 !important;">
                                    <div class="d-flex align-items-center gap-2">
                                        <div class="rounded-circle ${bgIconClass} d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style="width: 32px; height: 32px;">
                                            ${iconDef}
                                        </div>
                                        <span class="fw-bold text-dark text-nowrap" style="font-size: 1rem;">${flightNum}</span>
                                    </div>
                                    <span class="font-monospace fw-bold text-secondary text-nowrap ms-2" style="font-size: 1.1rem;">${time}</span>
                                </div>`;
                        });
                        listHtml += '</div>';
                        
                        contentDiv.innerHTML = listHtml;
                        contentDiv.dataset.view = 'detail';
                        contentDiv.parentElement.classList.remove('bg-primary-subtle');
                        contentDiv.parentElement.classList.add('bg-primary-subtle'); // Keep bg-color
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
    L.marker([AIFA_COORDS.lat, AIFA_COORDS.lng], { icon: aifaIcon, zIndexOffset: 3000 }).addTo(state.markerLayer)
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

        // Calculate Geodesic Path
        const pathPoints = getGeodesicPath(start, end);

        // Dibujar línea de trayectoria (trayectoria real visual)
        if (currentLine) state.planeLayer.removeLayer(currentLine);
        currentLine = L.polyline(pathPoints, {
            color: '#0d6efd',
            weight: 2,
            opacity: 0.4,
            dashArray: '5, 10'
        }).addTo(state.planeLayer);

        const planeSvg = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:100%;height:100%;display:block;">
             <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
        </svg>`;

        // Crear avión
        const icon = L.divIcon({
            className: 'frecuencia-plane-icon',
            // Asegurar centrado del icono
            html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#0d6efd;">
                    ${planeSvg}
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        
        if (currentPlane) state.planeLayer.removeLayer(currentPlane);
        // zIndexOffset 2000 para asegurar visibilidad
        currentPlane = L.marker(start, { icon, zIndexOffset: 2000, interactive: false }).addTo(state.planeLayer);

        // Estado para suavizado
        let lastAngle = null;

        startTime = performance.now();
        requestAnimationFrame((now) => animate(now, pathPoints, lastAngle));
    }

    function animate(now, pathPoints, prevAngle){
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        // Interpolación along path
        // Find segment index
        const totalSegments = pathPoints.length - 1;
        const segmentFloat = t * totalSegments;
        const segmentIndex = Math.floor(segmentFloat);
        const segmentT = segmentFloat - segmentIndex;

        let lat, lng;

        if (segmentIndex >= totalSegments) {
             lat = pathPoints[totalSegments].lat;
             lng = pathPoints[totalSegments].lng;
        } else {
             const p1 = pathPoints[segmentIndex];
             const p2 = pathPoints[segmentIndex + 1];
             lat = p1.lat + (p2.lat - p1.lat) * segmentT;
             lng = p1.lng + (p2.lng - p1.lng) * segmentT;
        }
        
        currentPlane.setLatLng([lat, lng]);

        // Rotación Visual (Screen Projection) con suavizado
        let currentVisualAngle = prevAngle;

        if (segmentIndex < totalSegments) {
            const p1 = pathPoints[segmentIndex];
            const p2 = pathPoints[segmentIndex + 1];
            
            let targetAngle = null;

            // FIXED: Stable rotation using Geocoordinates
            const dLat = p2.lat - p1.lat;
            const dLng = p2.lng - p1.lng;
            
            // Math.atan2(y, x). y = -dLat (screen Y is inverted), x = dLng
            let theta = Math.atan2(-dLat, dLng) * 180 / Math.PI;
            targetAngle = theta + 90;

            if (targetAngle !== null) {
                if (currentVisualAngle === null || currentVisualAngle === undefined) {
                    currentVisualAngle = targetAngle;
                } else {
                    let diff = targetAngle - currentVisualAngle;
                    while (diff < -180) diff += 360;
                    while (diff > 180) diff -= 360;
                    currentVisualAngle += diff * 0.1;
                }
            }
        }
        
        const iconContainer = currentPlane.getElement()?.querySelector('div');
        const svgEl = iconContainer?.querySelector('svg');
        if (svgEl && currentVisualAngle !== null) {
             svgEl.style.transform = `rotate(${currentVisualAngle}deg)`;
        }

        if (t < 1) {
            state.animationFrameId = requestAnimationFrame((nextNow) => animate(nextNow, pathPoints, currentVisualAngle));
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

  function buildMarkerIcon(total, label){
    // Icono de ubicación (pin) con número pequeño para evitar saturación
    // Color AZUL (#0d6efd)
    return L.divIcon({
      className: 'frecuencia-pin-marker',
      html: `<div class="pin-content"><i class="fas fa-location-dot" style="color: #0d6efd;"></i><span style="color: #0d6efd !important;">${total}</span></div>`,
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
    if (dom.mapContainer && (dom.mapContainer.clientWidth === 0 || dom.mapContainer.clientHeight === 0)) return;

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
      
      let cityName = toTitleCase(dest.city) || 'Sin ciudad';
      let stateName = toTitleCase(dest.state) || '';
      
      // Override with manual mapping if available (fixes pure IATA display)
      if (IATA_LOCATIONS[dest.iata]) {
          cityName = IATA_LOCATIONS[dest.iata].city;
          stateName = IATA_LOCATIONS[dest.iata].country;
      }

      const searchText = `${cityName || ''} ${stateName || ''} ${dest.iata || ''} ${airlines.map(a => a.name).join(' ')}`.toLowerCase();
      return {
        routeId: dest.routeId,
        city: cityName,
        state: stateName,
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
          map.set(air.slug, { name: air.name, total: 0 });
        }
        const entry = map.get(air.slug);
        entry.total += (air.weeklyTotal || 0);
      });
    });
    return [...map.entries()]
      .map(([slug, data]) => ({ slug, name: data.name, total: data.total }))
      .sort((a, b) => {
        const diff = b.total - a.total;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'es-MX');
      });
  }

  function populateFilters(){
    // Airline Options -> Logo Grid
    if (dom.filters.airline) {
        dom.filters.airline.style.display = 'none'; // ocultar select original
        
        let logoContainer = pane.querySelector('#frecuencias-int-airline-logos');
        if (!logoContainer) {
            logoContainer = document.createElement('div');
            logoContainer.id = 'frecuencias-int-airline-logos';
            logoContainer.className = 'airline-filter-toolbar mb-3';
            dom.filters.airline.parentNode.insertBefore(logoContainer, dom.filters.airline.nextSibling);
        }
        logoContainer.innerHTML = '';

        // Botón "Todas"
        const btnAll = document.createElement('button');
        btnAll.className = 'airline-filter-btn active';
        btnAll.textContent = 'Todas';
        btnAll.dataset.airline = 'all';
        btnAll.onclick = () => selectAirlineFilter('all', btnAll);
        logoContainer.appendChild(btnAll);

        const sortedAirlines = [...state.uniqueAirlines].sort((a,b) => a.name.localeCompare(b.name));
        sortedAirlines.forEach(air => {
            const config = AIRLINE_CONFIG[air.slug] || AIRLINE_CONFIG['default'];
            const btn = document.createElement('button');
            btn.className = 'airline-filter-btn'; 
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
      if (dom.filters.airline) dom.filters.airline.value = slug; 
      
      const container = pane.querySelector('#frecuencias-int-airline-logos');
      if (container) {
          const buttons = container.querySelectorAll('.airline-filter-btn');
          buttons.forEach(b => b.classList.remove('active'));

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
      const parseDateParts = (str) => {
          const d = new Date(str + 'T00:00:00');
          return {
              day: d.getDate().toString().padStart(2, '0'),
              month: d.toLocaleString('es-MX', { month: 'long' }),
              year: d.getFullYear()
          };
      };

      const start = parseDateParts(startStr);
      const end = parseDateParts(endStr);
      
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

  async function downloadExcel() {
    if (!state.filtered || state.filtered.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    // Dynamic Headers
    let headers = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    if (state.raw && state.raw.validFrom) {
        const start = new Date(state.raw.validFrom + 'T00:00:00');
        headers = headers.map((day, idx) => {
            const d = new Date(start);
            d.setDate(d.getDate() + idx);
            const span = `${d.getDate()}/${d.getMonth()+1}`;
            return `${day} ${span}`;
        });
    }

    // Initialize Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Frecuencias Internacionales');

    // Define columns
    worksheet.columns = [
        { header: 'Id Ruta', key: 'id', width: 12 },
        { header: 'Destino', key: 'dest', width: 25 },
        { header: 'Aerolínea', key: 'airline', width: 50 }, // MUCH wider to allow logos to scale up
        { header: headers[0], key: 'd1', width: 12 },
        { header: headers[1], key: 'd2', width: 12 },
        { header: headers[2], key: 'd3', width: 12 },
        { header: headers[3], key: 'd4', width: 12 },
        { header: headers[4], key: 'd5', width: 12 },
        { header: headers[5], key: 'd6', width: 12 },
        { header: headers[6], key: 'd7', width: 12 },
        { header: 'Total', key: 'total', width: 12 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0A1F44' }
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' },
            bold: true
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 30;

    // Helper to fetch image
    const imageCache = {};
    const fetchImage = async (url) => {
        if (imageCache[url]) return imageCache[url];
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            imageCache[url] = buffer;
            return buffer;
        } catch (e) {
            console.warn('Could not load image', url, e);
            return null;
        }
    };

    // Iterate Data
    for (const dest of state.filtered) {
        const airlines = (dest.viewAirlines?.length ? dest.viewAirlines : dest.airlines) || [];
        const usedAirlines = airlines.length ? airlines : [{ name: 'Sin datos', daily: Array(7).fill(0), weeklyTotal: 0 }];
        
        const startRow = worksheet.rowCount + 1;

        for (const airline of usedAirlines) {
            const slug = airline.slug || slugify(airline.name || 'default');
            const legacyConfig = AIRLINE_CONFIG[slug] || AIRLINE_CONFIG['default'];
            const config = {
                logo: airline.logo || legacyConfig.logo,
                color: airline.color || legacyConfig.color,
                text: airline.color ? '#ffffff' : legacyConfig.text
            };
            
            const rowValues = {
                id: dest.routeId || dest.iata || '',
                dest: dest.city || dest.name,
                airline: config.logo ? '' : airline.name,
                d1: formatVal(airline.daily?.[0]),
                d2: formatVal(airline.daily?.[1]),
                d3: formatVal(airline.daily?.[2]),
                d4: formatVal(airline.daily?.[3]),
                d5: formatVal(airline.daily?.[4]),
                d6: formatVal(airline.daily?.[5]),
                d7: formatVal(airline.daily?.[6]),
                total: airline.weeklyTotal
            };

            const row = worksheet.addRow(rowValues);
            row.height = 60; // Adjusted height

            // Styling
            // Apply borders and alignment to all cells
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                 cell.border = {
                     top: { style: 'thin' },
                     left: { style: 'thin' },
                     bottom: { style: 'thin' },
                     right: { style: 'thin' }
                 };
                 cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Specific overrides
            const airlineColorHex = 'FF' + config.color.replace('#', '');
            const airlineTextHex = 'FF' + config.text.replace('#', '');

             // 1 (Id), 2 (Dest), 3 (Airline) -> White Background, Black Text
            [1, 2, 3].forEach(c => {
                const cell = row.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                cell.font = { color: { argb: 'FF000000' }, bold: c === 1 }; 
                cell.alignment = { 
                    horizontal: c === 2 ? 'left' : 'center', 
                    vertical: 'middle', 
                    wrapText: true 
                };
            });

            // 4 to 10: Days (Airline Color)
            for (let c = 4; c <= 10; c++) {
                const cell = row.getCell(c);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: airlineColorHex } };
                cell.font = { color: { argb: airlineTextHex }, bold: false };
            }

            // 11: Total (Light Gray)
            const totalCell = row.getCell(11);
            totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            totalCell.font = { color: { argb: 'FF000000' }, bold: true };


            // Insert Image Logo if exists
            if (config.logo) {
                const imageUrl = `images/airlines/${config.logo}`;
                const imgBuffer = await fetchImage(imageUrl);
                if (imgBuffer) {
                    const imageId = workbook.addImage({
                        buffer: imgBuffer,
                        extension: 'png',
                    });
                    
                    // Default padding for nice centering (20% W, 15% H padding)
                    let tlCol = 2.20; 
                    let brCol = 2.80;
                    let tlRow = row.number - 0.85; 
                    let brRow = row.number - 0.15;

                    // Special case: Make specific airlines larger
                    if (['aeromexico', 'aeromexico-connect', 'mexicana', 'volaris'].some(s => slug.includes(s))) {
                        tlCol = 2.05; // Only 5% padding
                        brCol = 2.95;
                        tlRow = row.number - 0.95; // Only 5% vertical padding
                        brRow = row.number - 0.05;
                    }

                    worksheet.addImage(imageId, {
                        tl: { col: tlCol, row: tlRow }, 
                        br: { col: brCol, row: brRow },
                        editAs: 'oneCell'
                    });
                } else {
                     row.getCell(3).value = airline.name;
                }
            }
        }

        // Merge ID and Dest columns if multiple airlines
        if (usedAirlines.length > 1) {
            const endRow = worksheet.rowCount;
            worksheet.mergeCells(`A${startRow}:A${endRow}`);
            worksheet.mergeCells(`B${startRow}:B${endRow}`);
        }
    }
    
    function formatVal(v) { return (v && v > 0) ? v : '-'; }

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Frecuencias_Internacionales_AIFA.xlsx');
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
