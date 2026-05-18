(function () {
  const THRESHOLD = 85;
  const TOP_N = 3;
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  let _data        = null;
  let _allYearData = [];
  let _minFlights  = 10;
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
    _monthlyWins = _computeMonthlyWins(_allYearData);
    _applyViewFilter();
  };

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

    renderTopLists();
    renderTable();
  }

  // ─── ANNUAL AGGREGATION ───────────────────────────────────────────────────────

  function _aggregateAnnual(rawData) {
    const groups = {};
    rawData.forEach(row => {
      const key = `${(row.airline || '').trim()}|||${(row.category || '').trim()}`;
      if (!groups[key]) {
        groups[key] = {
          airline:             row.airline,
          category:            row.category,
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
      g.total_flights += Number(row.total_flights || 0);
      g.on_time       += Number(row.on_time       || 0);
      g.delayed       += Number(row.delayed       || 0);
      g.cancelled     += Number(row.cancelled     || 0);
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
          return { airline: r.airline, pct, total };
        }).filter(r => r.total >= _minFlights);
        if (!withPct.length) return;
        withPct.sort((a, b) => b.pct - a.pct);
        const key = `${withPct[0].airline}|||${cat}`;
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
    return (name || '').toString().trim().toLowerCase();
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
      items.forEach(r => {
        const pct = parsePercent(r.puntualidad);
        const li  = document.createElement('li');
        li.className = 'd-flex align-items-center justify-content-between gap-2 mb-1';
        const logo = logoHtmlFor(r.aerolinea);

        let winsBadge = '';
        if (_viewMode === 'annual') {
          const wins = _monthlyWins[`${r.aerolinea}|||${cat}`] || 0;
          if (wins > 0) winsBadge = `<span class="badge bg-warning text-dark ms-1" title="Meses como #1"><i class="fas fa-trophy me-1"></i>${wins}/${_totalMonths}</span>`;
        }

        li.innerHTML = `
          <span class="airline-header d-flex align-items-center gap-2 text-truncate" title="${r.aerolinea}">${logo}<span class="airline-name">${r.aerolinea}</span>${winsBadge}</span>
          <span class="d-flex align-items-center gap-2">
            <span class="badge ${clsForPct(pct)}">${pct.toFixed(1)}%</span>
            <span class="small text-muted">(${r.total} vuelos)</span>
          </span>`;
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
    function destroy(id) { try { if (charts[id]) { charts[id].destroy(); charts[id] = null; } } catch (_) { } }
    function mk(canvasId, items, color) {
      const el = document.getElementById(canvasId); if (!el) return;
      const labels = items.map(r => r.aerolinea);
      const data   = items.map(r => parsePercent(r.puntualidad));
      destroy(canvasId);
      charts[canvasId] = new Chart(el.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Puntualidad %', data, backgroundColor: color, borderRadius: 6 }] },
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.x.toFixed(1)}%` } } },
          scales: {
            x: { suggestedMin: 0, suggestedMax: 100, ticks: { callback: v => v + '%' } },
            y: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } }
          }
        }
      });
    }
    mk('punc-pax-best-chart',    paxBest,    'rgba(25,135,84,0.7)');
    mk('punc-pax-worst-chart',   paxWorst,   'rgba(220,53,69,0.7)');
    mk('punc-cargo-best-chart',  cargoBest,  'rgba(25,135,84,0.7)');
    mk('punc-cargo-worst-chart', cargoWorst, 'rgba(220,53,69,0.7)');
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
      table.className = 'table table-hover align-middle mb-4';

      const imputableHeaders = hasImputables
        ? `<th class="text-end" title="Demoras imputables a la aerolínea">Imp. Aerolínea</th>
           <th class="text-end" title="Cancelados imputables a la aerolínea">Canc. Imputables</th>
           <th class="text-end" title="Total imputables a la aerolínea">Total Imputables</th>`
        : '';

      const winsHeader = isAnnual
        ? `<th class="text-center" title="Meses como #1 en puntualidad"><i class="fas fa-trophy me-1 text-warning"></i>Meses #1</th>`
        : '';

      const colSpan = 6 + (hasImputables ? 3 : 0) + (isAnnual ? 1 : 0);

      table.innerHTML = `
        <thead class="table-light">
          <tr>
            <th>Aerolínea</th>
            <th class="text-end">A tiempo</th>
            <th class="text-end">Demora</th>
            <th class="text-end">Cancelado</th>
            <th class="text-end">Total</th>${imputableHeaders}${winsHeader}
            <th style="min-width:160px;">Puntualidad</th>
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
            ? `<td class="text-end">${r.imputable_aerolinea   !== null ? Number(r.imputable_aerolinea   || 0) : '—'}</td>
               <td class="text-end">${r.cancelados_imputables !== null ? Number(r.cancelados_imputables || 0) : '—'}</td>
               <td class="text-end">${r.total_imputables      !== null ? Number(r.total_imputables      || 0) : '—'}</td>`
            : '';

          let winsCell = '';
          if (isAnnual) {
            const wins = _monthlyWins[`${r.aerolinea}|||${cat}`] || 0;
            winsCell   = `<td class="text-center">${wins > 0
              ? `<span class="badge bg-warning text-dark"><i class="fas fa-trophy me-1"></i>${wins}/${_totalMonths}</span>`
              : '<span class="text-muted">—</span>'}</td>`;
          }

          tr.innerHTML = `
            <td><div class="airline-cell">${logoHtml}<span class="airline-name">${r.aerolinea || ''}</span></div></td>
            <td class="text-end">${Number(r.a_tiempo  || 0)}</td>
            <td class="text-end">${Number(r.demora    || 0)}</td>
            <td class="text-end">${Number(r.cancelado || 0)}</td>
            <td class="text-end">${Number(r.total     || 0)}</td>${imputableCells}${winsCell}
            <td>
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
        _minFlights  = isNaN(v) ? 10 : v;
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

  window.initPunctuality = function () { loadData(); };

  window.puntualidadRefresh = function () {
    _data = null;
    loadData();
  };

})();
