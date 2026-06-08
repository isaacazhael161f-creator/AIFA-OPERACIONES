(function () {
  const THRESHOLD = 85;
  const TOP_N = 3;
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Mapa de aliases: nombre normalizado (sin acentos, minúsculas) → nombre canónico a mostrar
  // Agregar aquí cualquier variante tipográfica de la DB que deba tratarse como una sola aerolínea
  const AIRLINE_ALIASES = {
    'cargojet':                 'Cargojet Airways',
    'cargojet airways':         'Cargojet Airways',
    'aeromexico':               'Aeroméxico',
    'aeromexico connect':       'Aeroméxico Connect',
    'aeromexico connect s.a. de c.v.': 'Aeroméxico Connect',
    'volaris':                  'Volaris',
    'volaris costa rica':       'Volaris Costa Rica',
    'mexicana de aviacion':     'Mexicana de Aviación',
    'mexicana':                 'Mexicana de Aviación',
    'united airlines':          'United Airlines',
    'american airlines':        'American Airlines',
    'cathay pacific':           'Cathay Pacific',
    'cathay pacific airways':   'Cathay Pacific',
    'ups':                      'UPS Airlines',
    'ups airlines':             'UPS Airlines',
    'cargolux':                 'Cargolux',
    'cargolux airlines international': 'Cargolux',
    'lufthansa':                'Lufthansa',
    'lufthansa cargo':          'Lufthansa Cargo',
    'fedex':                    'FedEx',
    'federal express':          'FedEx',
    'suparna airlines':         'Suparna Airlines',
    'china cargo airlines':     'Suparna Airlines',
  };

  function canonicalizeAirline(name) {
    if (!name) return name;
    const norm = (name).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
    return ALIAS_LOOKUP[norm] || name;
  }
  // Construir lookup invertido (alias normalizado → nombre canónico)
  const ALIAS_LOOKUP = {};
  Object.entries(AIRLINE_ALIASES).forEach(([alias, canon]) => { ALIAS_LOOKUP[alias] = canon; });

  let _data        = null;
  let _allYearData = [];
  let _minFlights  = 20;
  let _viewMode    = 'monthly';
  let _selectedMonth = null;
  let _selectedYear  = null;
  let _monthlyWins   = {};
  let _totalMonths   = 0;

  // ─── DATA LOADING ────────────────────────────────────────────────────────────

  async function loadData(year) {
    try {
      if (!window.dataManager) { console.error('DataManager not ready'); return; }

      let targetYear = year || _selectedYear || new Date().getFullYear();
      let rawData = await window.dataManager.getPunctualityStats(null, targetYear);

      if (!rawData || rawData.length === 0) {
        targetYear = targetYear - 1;
        rawData = await window.dataManager.getPunctualityStats(null, targetYear);
      }

      _selectedYear  = targetYear;
      _allYearData   = rawData || [];
      _totalMonths   = new Set(_allYearData.map(r => parseInt(r.month, 10)).filter(m => !isNaN(m))).size;

      _populateYearSelector(targetYear);

      const availableMonths = [...new Set(
        _allYearData.map(r => parseInt(r.month, 10)).filter(m => !isNaN(m))
      )].sort((a, b) => a - b);

      _populateMonthSelector(availableMonths);

      if (!_selectedMonth || !availableMonths.includes(_selectedMonth)) {
        _selectedMonth = availableMonths.length ? Math.max(...availableMonths) : null;
      }
      const monthSel = document.getElementById('punc-month-select');
      if (monthSel && _selectedMonth) monthSel.value = _selectedMonth;

      _monthlyWins = _computeMonthlyWins(_allYearData);
      _applyViewFilter();

    } catch (err) {
      console.error('Error loading punctuality data', err);
      _data = [];
      renderTopLists();
      renderTable();
    }
  }

  // ─── VIEW MODE ────────────────────────────────────────────────────────────────

  window.puncSetView = function (mode) {
    _viewMode = mode;
    const btnMonthly = document.getElementById('punc-view-monthly');
    const btnAnnual  = document.getElementById('punc-view-annual');
    const monthDiv   = document.getElementById('punc-month-selector');
    if (btnMonthly) {
      btnMonthly.classList.toggle('active',           mode === 'monthly');
      btnMonthly.classList.toggle('btn-primary',      mode === 'monthly');
      btnMonthly.classList.toggle('btn-outline-primary', mode !== 'monthly');
    }
    if (btnAnnual) {
      btnAnnual.classList.toggle('active',            mode === 'annual');
      btnAnnual.classList.toggle('btn-primary',       mode === 'annual');
      btnAnnual.classList.toggle('btn-outline-primary',  mode !== 'annual');
    }
    if (monthDiv) monthDiv.style.display = mode === 'monthly' ? '' : 'none';
    const section = document.getElementById('puntualidad-agosto-section');
    const pane = document.getElementById('punc-interactivo-pane');
    if (section) section.dataset.puncView = mode;
    if (pane) {
      pane.classList.toggle('punc-view-annual', mode === 'annual');
      pane.classList.toggle('punc-view-monthly', mode !== 'annual');
    }
    _monthlyWins = _computeMonthlyWins(_allYearData);
    _applyViewFilter();
  };

  function updatePuncModeHero() {
    const badge = document.getElementById('punc-mode-badge');
    const title = document.getElementById('punc-mode-title');
    const note = document.getElementById('punc-mode-note');
    if (!badge || !title || !note) return;

    const monthName = (_selectedMonth >= 1 && _selectedMonth <= 12) ? MONTH_NAMES[_selectedMonth - 1] : 'Periodo';
    const yearLabel = _selectedYear || new Date().getFullYear();

    if (_viewMode === 'annual') {
      badge.innerHTML = '<i class="fas fa-layer-group me-1"></i>Vista anual acumulada';
      title.textContent = `Consolidado ${yearLabel} con ponderacion por volumen`;
      note.textContent = `Integra ${_totalMonths || 0} ${(_totalMonths || 0) === 1 ? 'mes disponible' : 'meses disponibles'} y destaca consistencia con el indicador Meses #1.`;
    } else {
      badge.innerHTML = '<i class="fas fa-calendar-day me-1"></i>Vista mensual';
      title.textContent = `${monthName} ${yearLabel} · Corte operativo`; 
      note.textContent = 'Muestra el rendimiento puntual del mes seleccionado para comparar aerolineas en condiciones del mismo periodo.';
    }
  }

  function _applyViewFilter() {
    let source;
    if (_viewMode === 'annual') {
      source = _aggregateAnnual(_allYearData);
      const titleEl = document.getElementById('puntualidad-header-title');
      if (titleEl) titleEl.textContent = `PUNTUALIDAD ACUMULADA ${_selectedYear}`;
    } else {
      source = _allYearData.filter(r => parseInt(r.month, 10) === _selectedMonth);
      const titleEl = document.getElementById('puntualidad-header-title');
      if (titleEl && _selectedMonth >= 1 && _selectedMonth <= 12) {
        titleEl.textContent = `PUNTUALIDAD DE AEROLÍNEAS DEL MES DE ${MONTH_NAMES[_selectedMonth - 1].toUpperCase()}`;
      }
    }

    _data = (source || []).map(row => {
      const total = row.total_flights || 0;
      const onTime = row.on_time || 0;
      const hasImputable = row.total_imputable !== undefined && row.total_imputable !== null;
      const pct = total > 0
        ? (hasImputable
           ? (((total - Number(row.total_imputable)) / total) * 100).toFixed(1)
           : ((onTime / total) * 100).toFixed(1))
        : 0;
      return {
        aerolinea:             row.airline,
        categoria:             row.category,
        a_tiempo:              row.on_time,
        demora:                row.delayed,
        cancelado:             row.cancelled,
        total:                 row.total_flights,
        puntualidad:           pct + '%',
        imputable_aerolinea:   (row.imputable_airline   !== undefined && row.imputable_airline   !== null) ? row.imputable_airline   : null,
        cancelados_imputables: (row.cancelled_imputable !== undefined && row.cancelled_imputable !== null) ? row.cancelled_imputable : null,
        total_imputables:      (row.total_imputable     !== undefined && row.total_imputable     !== null) ? row.total_imputable     : null
      };
    });

    updatePuncModeHero();

    renderTopLists();
    renderTable();
  }

  // ─── ANNUAL AGGREGATION ───────────────────────────────────────────────────────

  function _aggregateAnnual(rawData) {
    const groups = {};
    rawData.forEach(row => {
      const canon     = canonicalizeAirline(row.airline || '');
      const airlineNorm = normalizeAirlineName(canon);
      const catNorm     = (row.category || '').trim().toLowerCase();
      const key = `${airlineNorm}|||${catNorm}`;
      if (!groups[key]) {
        groups[key] = {
          airline:             canon,
          category:            row.category,
          _maxFlights:         0,
          total_flights:       0,
          on_time:             0,
          delayed:             0,
          cancelled:           0,
          total_imputable:     null,
          imputable_airline:   null,
          cancelled_imputable: null
        };
      }
      const g = groups[key];
      const rowFlights = Number(row.total_flights || 0);
      if (rowFlights > g._maxFlights) { g.airline = canon; g._maxFlights = rowFlights; }
      g.total_flights += rowFlights;
      g.on_time       += Number(row.on_time   || 0);
      g.delayed       += Number(row.delayed   || 0);
      g.cancelled     += Number(row.cancelled || 0);
      if (row.total_imputable     !== null && row.total_imputable     !== undefined) g.total_imputable     = (g.total_imputable     || 0) + Number(row.total_imputable);
      if (row.imputable_airline   !== null && row.imputable_airline   !== undefined) g.imputable_airline   = (g.imputable_airline   || 0) + Number(row.imputable_airline);
      if (row.cancelled_imputable !== null && row.cancelled_imputable !== undefined) g.cancelled_imputable = (g.cancelled_imputable || 0) + Number(row.cancelled_imputable);
    });
    return Object.values(groups);
  }

  // ─── MONTHLY WINS ─────────────────────────────────────────────────────────────

  function _computeMonthlyWins(rawData) {
    const months = [...new Set(rawData.map(r => parseInt(r.month, 10)).filter(m => !isNaN(m)))];
    const wins = {};
    months.forEach(month => {
      const monthData = rawData.filter(r => parseInt(r.month, 10) === month);
      ['Pasajeros', 'Carga'].forEach(cat => {
        const catData = monthData.filter(r => (r.category || '') === cat && (r.airline || '').toLowerCase() !== 'total');
        if (!catData.length) return;
        const withPct = catData.map(r => {
          const total  = Number(r.total_flights || 0);
          const onTime = Number(r.on_time || 0);
          const hasImp = r.total_imputable !== null && r.total_imputable !== undefined;
          const pct    = total > 0 ? (hasImp ? ((total - Number(r.total_imputable)) / total * 100) : (onTime / total * 100)) : 0;
          return { airline: canonicalizeAirline(r.airline), pct, total };
        }).filter(r => r.total >= _minFlights);
        if (!withPct.length) return;
        withPct.sort((a, b) => b.pct - a.pct);
        const key = `${normalizeAirlineName(canonicalizeAirline(withPct[0].airline))}|||${cat}`;
        wins[key] = (wins[key] || 0) + 1;
      });
    });
    return wins;
  }

  // ─── SELECTORS ────────────────────────────────────────────────────────────────

  function _populateYearSelector(selectedYear) {
    const sel = document.getElementById('punc-year-select');
    if (!sel) return;
    const currentYear = new Date().getFullYear();
    sel.innerHTML = '';
    for (let y = currentYear; y >= currentYear - 3; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === selectedYear) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function _populateMonthSelector(availableMonths) {
    const sel = document.getElementById('punc-month-select');
    if (!sel) return;
    sel.innerHTML = '';
    availableMonths.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = MONTH_NAMES[m - 1];
      sel.appendChild(opt);
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  function normalizeAirlineName(name) {
    return (name || '').toString().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .toLowerCase()
      .replace(/\s+/g, ' ');                             // espacios múltiples
  }

  function parsePercent(p) {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const m = String(p).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function byCategory(list, categoria) {
    return (list || []).filter(r => (r.categoria || '').toLowerCase() === categoria.toLowerCase());
  }

  function excludeTotals(list) {
    return (list || []).filter(r => (r.aerolinea || '').toLowerCase() !== 'total');
  }

  function computeTop(list, count, best = true, minFlights = 1, excludeNames) {
    const exclude = excludeNames || new Set();
    const safe = excludeTotals(list)
      .filter(r => Number(r.total || 0) >= minFlights)
      .filter(r => !exclude.has(normalizeAirlineName(r.aerolinea)));
    const withPct = safe.map(r => ({ ...r, pct: parsePercent(r.puntualidad) }));
    withPct.sort((a, b) => best ? (b.pct - a.pct) : (a.pct - b.pct));
    return withPct.slice(0, count);
  }

  function clsForPct(pct) {
    return pct >= THRESHOLD ? 'bg-success' : 'bg-danger';
  }

  // ─── RENDER TOP LISTS ─────────────────────────────────────────────────────────

  function renderTopLists() {
    if (!_data) return;
    const pax   = byCategory(_data, 'Pasajeros');
    const cargo = byCategory(_data, 'Carga');

    const paxBest    = computeTop(pax,   TOP_N, true,  _minFlights);
    const paxWorst   = computeTop(pax,   TOP_N, false, _minFlights, new Set(paxBest.map(r  => normalizeAirlineName(r.aerolinea))));
    const cargoBest  = computeTop(cargo, TOP_N, true,  _minFlights);
    const cargoWorst = computeTop(cargo, TOP_N, false, _minFlights, new Set(cargoBest.map(r => normalizeAirlineName(r.aerolinea))));

    function logoHtmlFor(airline) {
      try {
        if (typeof window.getAirlineLogoCandidates !== 'function') return '';
        const cands = (window.getAirlineLogoCandidates(airline) || []).filter(p => !/default-airline-logo/i.test(p));
        if (!cands.length) return '';
        const logoPath  = cands[0];
        const dataCands = cands.join('|');
        const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(airline, 'summary') : 'lg';
        return `<img class="airline-logo ${sizeClass} me-2" src="${logoPath}" alt="Logo ${airline}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
      } catch (_) { return ''; }
    }

    function renderList(elId, items, cat) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = '';
      items.forEach((r, idx) => {
        const pct = parsePercent(r.puntualidad);
        const pctClamped = Math.max(0, Math.min(100, pct));
        const rank = idx + 1;
        const li  = document.createElement('li');
        li.className = `punc-airline-row rank-${rank}`;
        const logo = logoHtmlFor(r.aerolinea);

        let winsBadge = '';
        if (_viewMode === 'annual') {
          const canonKey = normalizeAirlineName(canonicalizeAirline(r.aerolinea));
          const wins = _monthlyWins[`${canonKey}|||${cat}`] || 0;
          if (wins > 0) winsBadge = `<span class="badge bg-warning text-dark ms-1" title="Meses como #1"><i class="fas fa-trophy me-1"></i>${wins}/${_totalMonths}</span>`;
        }

        li.innerHTML = `
          <span class="punc-rank-pill punc-rank-${rank}" aria-label="Posicion ${rank}">#${rank}</span>
          <span class="airline-header punc-airline-main" title="${r.aerolinea}">${logo}<span class="airline-name">${r.aerolinea}</span>${winsBadge}</span>
          <span class="punc-airline-metrics">
            <span class="badge ${clsForPct(pct)}">${pct.toFixed(1)}%</span>
            <span class="small text-muted">(${r.total} vuelos)</span>
          </span>
          <span class="punc-airline-track" aria-hidden="true"><span style="width:${pctClamped}%;"></span></span>`;
        el.appendChild(li);
      });
    }

    renderList('puntualidad-top-pax-best',    paxBest,    'Pasajeros');
    renderList('puntualidad-top-pax-worst',   paxWorst,   'Pasajeros');
    renderList('puntualidad-top-cargo-best',  cargoBest,  'Carga');
    renderList('puntualidad-top-cargo-worst', cargoWorst, 'Carga');

    try { renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }); } catch (_) { }
  }

  // ─── MINI CHARTS ─────────────────────────────────────────────────────────────

  function renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }) {
    if (!window.Chart) return;
    const charts = window._puncCharts = window._puncCharts || {};
    const dark = document.body.classList.contains('dark-mode');
    const gridColor = dark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.28)';
    const axisColor = dark ? '#cbd5e1' : '#475569';
    const thresholdColor = dark ? '#fbbf24' : '#b45309';

    const puncGuidePlugin = {
      id: 'puncGuidePlugin',
      afterDatasetsDraw(chart, _args, pluginOptions) {
        const xScale = chart.scales?.x;
        const yScale = chart.scales?.y;
        if (!xScale || !yScale) return;
        const threshold = Number(pluginOptions?.threshold ?? THRESHOLD);
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        if (!ctx || !chartArea) return;

        const lineX = xScale.getPixelForValue(threshold);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = pluginOptions?.thresholdColor || thresholdColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(lineX, chartArea.top + 2);
        ctx.lineTo(lineX, chartArea.bottom - 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pluginOptions?.thresholdColor || thresholdColor;
        ctx.font = '700 10px Poppins, Nunito Sans, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Umbral ${threshold}%`, lineX, chartArea.top - 6);

        const dataset = chart.data?.datasets?.[0];
        if (dataset && Array.isArray(dataset.data)) {
          dataset.data.forEach((value, idx) => {
            const v = Number(value) || 0;
            const px = xScale.getPixelForValue(v);
            const py = yScale.getPixelForValue(chart.data.labels[idx]);
            const isInsideBar = v >= 88;
            const valueText = `${v.toFixed(1)}%`;
            ctx.font = '800 10px Poppins, Nunito Sans, Arial';
            ctx.textAlign = isInsideBar ? 'right' : 'left';
            ctx.textBaseline = 'middle';
            const textX = isInsideBar ? (px - 8) : (px + 8);

            if (isInsideBar) {
              // Strong contrast when drawing over the colored bar.
              ctx.strokeStyle = dark ? 'rgba(2, 6, 23, 0.7)' : 'rgba(15, 23, 42, 0.55)';
              ctx.lineWidth = 2.6;
              ctx.strokeText(valueText, textX, py);
              ctx.fillStyle = '#ffffff';
            } else {
              ctx.fillStyle = pluginOptions?.labelColor || (dark ? '#e2e8f0' : '#334155');
            }

            ctx.fillText(valueText, textX, py);
          });
        }
        ctx.restore();
      }
    };

    function destroy(id) { try { if (charts[id]) { charts[id].destroy(); charts[id] = null; } } catch (_) { } }
    function mk(canvasId, items, colorsByRank) {
      const el = document.getElementById(canvasId); if (!el) return;
      const labels = items.map(r => r.aerolinea);
      const data   = items.map(r => parsePercent(r.puntualidad));
      destroy(canvasId);
      charts[canvasId] = new Chart(el.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Puntualidad %',
            data,
            backgroundColor: (ctx) => {
              const i = ctx.dataIndex || 0;
              return colorsByRank[i] || colorsByRank[colorsByRank.length - 1];
            },
            borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.16)',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 28,
            maxBarThickness: 30
          }]
        },
        plugins: [puncGuidePlugin],
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          responsive: true,
          layout: { padding: { top: 14, right: 6, left: 2, bottom: 2 } },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `${ctx.parsed.x.toFixed(1)}%`,
                afterLabel: ctx => `Posicion #${ctx.dataIndex + 1}`
              }
            },
            puncGuidePlugin: {
              threshold: THRESHOLD,
              thresholdColor,
              labelColor: axisColor
            }
          },
          scales: {
            x: {
              suggestedMin: 0,
              suggestedMax: 100,
              ticks: {
                callback: v => v + '%',
                color: axisColor,
                stepSize: 20,
                font: { weight: '600' }
              },
              grid: { color: gridColor }
            },
            y: {
              ticks: {
                autoSkip: false,
                maxRotation: 0,
                minRotation: 0,
                color: axisColor,
                font: { weight: '700' }
              },
              grid: { display: false }
            }
          }
        }
      });
    }
    const isAnnual = _viewMode === 'annual';
    const bestColors = isAnnual
      ? ['rgba(30,64,175,0.9)', 'rgba(37,99,235,0.82)', 'rgba(96,165,250,0.76)']
      : ['rgba(5,150,105,0.9)', 'rgba(16,185,129,0.82)', 'rgba(52,211,153,0.76)'];
    const worstColors = isAnnual
      ? ['rgba(217,119,6,0.92)', 'rgba(245,158,11,0.84)', 'rgba(251,191,36,0.78)']
      : ['rgba(185,28,28,0.9)', 'rgba(220,38,38,0.84)', 'rgba(248,113,113,0.78)'];
    mk('punc-pax-best-chart',    paxBest,    bestColors);
    mk('punc-pax-worst-chart',   paxWorst,   worstColors);
    mk('punc-cargo-best-chart',  cargoBest,  bestColors);
    mk('punc-cargo-worst-chart', cargoWorst, worstColors);
  }

  // ─── DETAIL TABLE ─────────────────────────────────────────────────────────────

  function renderTable() {
    if (!_data) return;
    const container = document.getElementById('puntualidad-table-container');
    if (!container) return;
    container.innerHTML = '';

    const hasImputables = _data.some(r => r.imputable_aerolinea !== null && r.imputable_aerolinea !== undefined);
    const isAnnual      = _viewMode === 'annual';

    ['Pasajeros', 'Carga'].forEach(cat => {
      const filtered = byCategory(_data, cat);

      const header = document.createElement('h5');
      header.className = 'section-subheading mb-3 mt-4 text-primary';
      header.innerHTML = `<i class="fas fa-${cat === 'Pasajeros' ? 'plane-departure' : 'boxes'} me-2"></i>Aerolíneas de ${cat}`;
      container.appendChild(header);

      const table = document.createElement('table');
      table.className = 'table table-hover align-middle text-center mb-4';

      const imputableHeaders = hasImputables
        ? `<th class="text-center" title="Demoras imputables a la aerolínea">Imp. Aerolínea</th>
          <th class="text-center" title="Cancelados imputables a la aerolínea">Canc. Imputables</th>
          <th class="text-center" title="Total imputables a la aerolínea">Total Imputables</th>`
        : '';

      const winsHeader = isAnnual
        ? `<th class="text-center" title="Meses como #1 en puntualidad"><i class="fas fa-trophy me-1 text-warning"></i>Meses #1</th>`
        : '';

      const colSpan = 6 + (hasImputables ? 3 : 0) + (isAnnual ? 1 : 0);

      table.innerHTML = `
        <thead class="table-light">
          <tr>
            <th class="text-center">Aerolínea</th>
            <th class="text-center">A tiempo</th>
            <th class="text-center">Demora</th>
            <th class="text-center">Cancelado</th>
            <th class="text-center">Total</th>${imputableHeaders}${winsHeader}
            <th class="text-center" style="min-width:160px;">Puntualidad</th>
          </tr>
        </thead>
        <tbody></tbody>`;

      const tbody = table.querySelector('tbody');

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted p-3">No hay registros de ${cat} para este periodo</td></tr>`;
      } else {
        filtered.forEach(r => {
          const pct = parsePercent(r.puntualidad);
          const tr  = document.createElement('tr');

          let logoHtml = '';
          try {
            if (typeof window.getAirlineLogoCandidates === 'function') {
              const raw   = window.getAirlineLogoCandidates(r.aerolinea || '') || [];
              const cands = raw.filter(p => !/default-airline-logo/i.test(p));
              if (cands[0]) {
                const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(r.aerolinea || '', 'table') : 'lg';
                logoHtml = `<img class="airline-logo ${sizeClass}" src="${cands[0]}" alt="Logo ${r.aerolinea || ''}" data-cands="${cands.join('|')}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
              }
            }
          } catch (_) { }

          const imputableCells = hasImputables
            ? `<td class="text-center">${r.imputable_aerolinea   !== null ? Number(r.imputable_aerolinea   || 0) : '—'}</td>
              <td class="text-center">${r.cancelados_imputables !== null ? Number(r.cancelados_imputables || 0) : '—'}</td>
              <td class="text-center">${r.total_imputables      !== null ? Number(r.total_imputables      || 0) : '—'}</td>`
            : '';

          let winsCell = '';
          if (isAnnual) {
            const canonKey = normalizeAirlineName(canonicalizeAirline(r.aerolinea));
            const wins = _monthlyWins[`${canonKey}|||${cat}`] || 0;
            winsCell   = `<td class="text-center">${wins > 0
              ? `<span class="badge bg-warning text-dark"><i class="fas fa-trophy me-1"></i>${wins}/${_totalMonths}</span>`
              : '<span class="text-muted">—</span>'}</td>`;
          }

          tr.innerHTML = `
            <td class="text-center"><div class="airline-cell">${logoHtml}<span class="airline-name">${r.aerolinea || ''}</span></div></td>
            <td class="text-center">${Number(r.a_tiempo  || 0)}</td>
            <td class="text-center">${Number(r.demora    || 0)}</td>
            <td class="text-center">${Number(r.cancelado || 0)}</td>
            <td class="text-center">${Number(r.total     || 0)}</td>${imputableCells}${winsCell}
            <td class="text-center">
              <div class="progress" style="height: 18px;">
                <div class="progress-bar ${clsForPct(pct)}" role="progressbar" style="width: ${Math.max(0, Math.min(100, pct))}%">${pct.toFixed(1)}%</div>
              </div>
            </td>`;
          tbody.appendChild(tr);
        });
      }

      container.appendChild(table);
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('puntualidad-agosto-section')) return;

    try {
      if (window.bootstrap && bootstrap.Tooltip) {
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
          try { new bootstrap.Tooltip(el); } catch (_) { }
        });
      }
    } catch (_) { }

    const minFlightsSel = document.getElementById('puntualidad-minflights');
    if (minFlightsSel) {
      minFlightsSel.addEventListener('change', function () {
        const v = parseInt(minFlightsSel.value, 10);
        _minFlights  = isNaN(v) ? 30 : v;
        _monthlyWins = _computeMonthlyWins(_allYearData);
        renderTopLists();
      });
    }

    const monthSel = document.getElementById('punc-month-select');
    if (monthSel) {
      monthSel.addEventListener('change', function () {
        const v = parseInt(monthSel.value, 10);
        if (!isNaN(v)) { _selectedMonth = v; _applyViewFilter(); }
      });
    }

    const yearSel = document.getElementById('punc-year-select');
    if (yearSel) {
      yearSel.addEventListener('change', function () {
        const v = parseInt(yearSel.value, 10);
        if (!isNaN(v)) { _selectedMonth = null; loadData(v); }
      });
    }

    const toggleWorstBtn  = document.getElementById('puntualidad-toggle-worst');
    const interactivePane = document.getElementById('punc-interactivo-pane');
    const section = document.getElementById('puntualidad-agosto-section');
    if (section) section.dataset.puncView = _viewMode;
    if (interactivePane) {
      interactivePane.classList.add('punc-view-monthly');
    }
    if (toggleWorstBtn && interactivePane) {
      const updateToggleUi = () => {
        const showing = interactivePane.classList.contains('punc-show-worst');
        toggleWorstBtn.setAttribute('aria-pressed',  showing ? 'true' : 'false');
        toggleWorstBtn.setAttribute('aria-expanded', showing ? 'true' : 'false');
        toggleWorstBtn.setAttribute('title', showing ? 'Ocultar aerolíneas impuntuales' : 'Mostrar aerolíneas impuntuales');
      };
      toggleWorstBtn.addEventListener('click', () => {
        interactivePane.classList.toggle('punc-show-worst');
        updateToggleUi();
      });
      updateToggleUi();
    }

    loadData();
  });

  window.initPunctuality = function () {
    if (_allYearData.length === 0) loadData();
  };

  window.puntualidadRefresh = function () {
    _data = null;
    loadData();
  };

  // ─── CRITERIO INFO MODAL ──────────────────────────────────────────────────────

  const _criterioMonthly = `
    <div class="punc-crit-section">
      <div class="punc-crit-section-title text-primary"><i class="fas fa-calculator"></i> Fórmula de puntualidad</div>
      <div class="punc-crit-formula">Puntualidad = (Vuelos a tiempo / Total vuelos) × 100</div>
      <p class="punc-crit-note mb-0">
        <i class="fas fa-info-circle text-info"></i>
        Para meses con datos de imputables (desde Marzo 2026) la fórmula es:
        <strong>(Total − Imputables aerolínea) / Total × 100</strong>,
        lo que descuenta solo las demoras que son responsabilidad de la aerolínea.
      </p>
    </div>
    <div class="punc-crit-section">
      <div class="punc-crit-section-title text-success"><i class="fas fa-trophy"></i> Ranking mensual</div>
      <p class="punc-crit-note mb-2">
        <i class="fas fa-sort-down text-success me-1"></i>
        Las aerolíneas se ordenan de <strong>mayor a menor</strong> puntualidad dentro de su categoría (Pasajeros / Carga).
      </p>
      <p class="punc-crit-note mb-0">
        <i class="fas fa-filter text-warning me-1"></i>
        El filtro <strong>Mín. vuelos</strong> excluye del TOP a aerolíneas con muy pocos vuelos (ej. una con 2 vuelos al 100% vs otra con 500 al 99%). Solo afecta el TOP — en la tabla detalle se muestran todas.
      </p>
    </div>
    <div class="punc-crit-section">
      <div class="punc-crit-section-title"><i class="fas fa-circle-half-stroke text-warning"></i> Umbral de calidad</div>
      <div class="punc-crit-badge-row">
        <span class="badge bg-success px-3 py-2"><i class="fas fa-check me-1"></i> ≥ 85% — Puntual</span>
        <span class="badge bg-danger px-3 py-2"><i class="fas fa-xmark me-1"></i> &lt; 85% — Impuntual</span>
      </div>
    </div>`;

  const _criterioAnnual = `
    <div class="punc-crit-section">
      <div class="punc-crit-section-title text-primary"><i class="fas fa-calculator"></i> Puntualidad acumulada ponderada</div>
      <div class="punc-crit-formula">∑ (vuelos a tiempo en todos los meses) / ∑ (vuelos totales) × 100</div>
      <p class="punc-crit-note mb-0">
        <i class="fas fa-balance-scale text-primary"></i>
        El cálculo <strong>pondera por volumen</strong>: una aerolínea con 1,000 vuelos tiene más peso que una con 10 vuelos, evitando que periodos con muy poca operación distorsionen el resultado anual.
      </p>
    </div>
    <div class="punc-crit-section">
      <div class="punc-crit-section-title text-warning"><i class="fas fa-trophy"></i> Meses como #1</div>
      <p style="font-size:.82rem;color:#445;margin:0 0 .6rem;">La columna <strong>🏆 Meses #1</strong> cuenta cuántos meses del año cada aerolínea fue la más puntual en su categoría (respetando el filtro <em>Mín. vuelos</em>).</p>
      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:8px;padding:.55rem .85rem;font-size:.82rem;color:#78350f;">
        <strong>Ejemplo:</strong> &nbsp;<span class="badge bg-warning text-dark">🏆 3/4</span>&nbsp; significa que fue la aerolínea #1 en <strong>3 de los 4 meses</strong> disponibles.<br>
        Este indicador mide <em>consistencia</em> a lo largo del año, independientemente del volumen de vuelos.
      </div>
    </div>
    <div class="punc-crit-section">
      <div class="punc-crit-section-title"><i class="fas fa-filter text-secondary"></i> Mínimo de vuelos</div>
      <p class="punc-crit-note mb-0">
        <i class="fas fa-info-circle text-info"></i>
        El filtro <strong>Mín. vuelos</strong> excluye del TOP a aerolíneas con operación mínima. Ajústalo en la barra de herramientas según el análisis deseado.
        <span style="color:#888;">(Valor por defecto: 30 vuelos en el periodo seleccionado)</span>
      </p>
    </div>
    <div class="punc-crit-section">
      <div class="punc-crit-section-title"><i class="fas fa-circle-half-stroke text-warning"></i> Umbral de calidad</div>
      <div class="punc-crit-badge-row">
        <span class="badge bg-success px-3 py-2"><i class="fas fa-check me-1"></i> ≥ 85% — Puntual</span>
        <span class="badge bg-danger px-3 py-2"><i class="fas fa-xmark me-1"></i> &lt; 85% — Impuntual</span>
      </div>
    </div>`;

  window.puncAbrirCriterio = function () {
    const overlay = document.getElementById('punc-criteria-overlay');
    const body    = document.getElementById('punc-crit-body');
    const title   = document.getElementById('punc-crit-title');
    if (!overlay) return;
    if (_viewMode === 'annual') {
      if (title) title.textContent = 'Criterio — Vista Anual';
      if (body)  body.innerHTML = _criterioAnnual;
    } else {
      if (title) title.textContent = 'Criterio — Vista Mensual';
      if (body)  body.innerHTML = _criterioMonthly;
    }
    overlay.classList.add('open');
    document.addEventListener('keydown', _criterioEsc);
  };

  window.puncCerrarCriterio = function (evt) {
    if (evt && evt.target !== document.getElementById('punc-criteria-overlay')) return;
    const overlay = document.getElementById('punc-criteria-overlay');
    if (overlay) overlay.classList.remove('open');
    document.removeEventListener('keydown', _criterioEsc);
  };

  function _criterioEsc(e) {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('punc-criteria-overlay');
      if (overlay) overlay.classList.remove('open');
      document.removeEventListener('keydown', _criterioEsc);
    }
  }

})();
