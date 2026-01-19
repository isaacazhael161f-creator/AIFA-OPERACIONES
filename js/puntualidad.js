(function () {
  // Removed JSON usage. Now fetching from DB
  const THRESHOLD = 85; // % threshold for punctual vs not punctual
  const TOP_N = 3; // Mostrar Top 3 por solicitud
  let _data = null;
  let _minFlights = 5;

  async function loadData() {
    try {
      if (window.dataManager) {
        const currentDate = new Date();
        let year = currentDate.getFullYear();
        let targetMonth = null;

        // 1. Fetch all for current year
        let rawData = await window.dataManager.getPunctualityStats(null, year);

        // 2. Fallback to previous year if empty (e.g. at start of year)
        if (!rawData || rawData.length === 0) {
          year = year - 1;
          rawData = await window.dataManager.getPunctualityStats(null, year);
        }

        // 3. Find latest month available
        if (rawData && rawData.length > 0) {
          const months = rawData.map(r => parseInt(r.month, 10)).filter(m => !isNaN(m));
          if (months.length > 0) {
            targetMonth = Math.max(...months);

            // Filter for that month
            _data = rawData.filter(r => parseInt(r.month, 10) === targetMonth);

            // UPDATE UI HEADER
            const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            const titleEl = document.getElementById('puntualidad-header-title');
            if (titleEl && targetMonth >= 1 && targetMonth <= 12) {
              titleEl.textContent = `PUNTUALIDAD DE AEROLÍNEAS DEL MES DE ${monthNames[targetMonth - 1]}`;
            }
          } else {
            _data = [];
          }
        } else {
          _data = [];
        }

        // Normalize data structure
        _data = (_data || []).map(row => {
          const total = row.total_flights || 0;
          const onTime = row.on_time || 0;
          const pct = total > 0 ? ((onTime / total) * 100).toFixed(1) : 0;
          return {
            aerolinea: row.airline,
            categoria: row.category,
            a_tiempo: row.on_time,
            demora: row.delayed,
            cancelado: row.cancelled,
            total: row.total_flights,
            puntualidad: pct + '%'
          };
        });

      } else {
        console.error('DataManager not ready');
      }
    } catch (err) {
      console.error('Error loading punctuality data', err);
      _data = [];
    }

    renderTopLists();
    renderTable();
  }

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
    const withPct = safe.map(r => ({
      ...r,
      pct: parsePercent(r.puntualidad)
    }));
    withPct.sort((a, b) => best ? (b.pct - a.pct) : (a.pct - b.pct));
    return withPct.slice(0, count);
  }

  function clsForPct(pct) {
    return pct >= THRESHOLD ? 'bg-success' : 'bg-danger';
  }

  function renderTopLists() {
    if (!_data) return;
    const pax = byCategory(_data, 'Pasajeros');
    const cargo = byCategory(_data, 'Carga');

    const paxBest = computeTop(pax, TOP_N, true, _minFlights);
    const paxWorst = computeTop(pax, TOP_N, false, _minFlights, new Set(paxBest.map(r => normalizeAirlineName(r.aerolinea))));
    const cargoBest = computeTop(cargo, TOP_N, true, _minFlights);
    const cargoWorst = computeTop(cargo, TOP_N, false, _minFlights, new Set(cargoBest.map(r => normalizeAirlineName(r.aerolinea))));

    function logoHtmlFor(airline) {
      try {
        if (typeof window.getAirlineLogoCandidates !== 'function') return '';
        const cands = (window.getAirlineLogoCandidates(airline) || []).filter(path => !/default-airline-logo/i.test(path));
        if (!cands.length) return '';
        const logoPath = cands[0];
        if (!logoPath) return '';
        const dataCands = cands.join('|');
        const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(airline, 'summary') : 'lg';
        return `<img class="airline-logo ${sizeClass} me-2" src="${logoPath}" alt="Logo ${airline}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
      } catch (_) { return ''; }
    }

    function renderList(elId, items) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = '';
      items.forEach((r) => {
        const pct = parsePercent(r.puntualidad);
        const li = document.createElement('li');
        li.className = 'd-flex align-items-center justify-content-between gap-2 mb-1';
        const logo = logoHtmlFor(r.aerolinea);
        li.innerHTML = `
          <span class="airline-header d-flex align-items-center gap-2 text-truncate" title="${r.aerolinea}">${logo}<span class="airline-name">${r.aerolinea}</span></span>
          <span class="d-flex align-items-center gap-2">
            <span class="badge ${clsForPct(pct)}">${pct.toFixed(0)}%</span>
            <span class="small text-muted">(${r.total} vuelos)</span>
          </span>
        `;
        el.appendChild(li);
      });
    }

    renderList('puntualidad-top-pax-best', paxBest);
    renderList('puntualidad-top-pax-worst', paxWorst);
    renderList('puntualidad-top-cargo-best', cargoBest);
    renderList('puntualidad-top-cargo-worst', cargoWorst);

    // Mini charts
    try { renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }); } catch (_) { }
  }

  // Renderizar mini gráficas de barras (horizontales) para los TOPs
  function renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }) {
    if (!window.Chart) return;
    const charts = window._puncCharts = window._puncCharts || {};
    function destroy(id) { try { if (charts[id]) { charts[id].destroy(); charts[id] = null; } } catch (_) { } }
    function mk(canvasId, items, color) {
      const el = document.getElementById(canvasId); if (!el) return;
      const labels = items.map(r => r.aerolinea);
      const data = items.map(r => parsePercent(r.puntualidad));
      destroy(canvasId);
      charts[canvasId] = new Chart(el.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Puntualidad %', data, backgroundColor: color, borderRadius: 6 }] },
        options: {
          indexAxis: 'y',
          maintainAspectRatio: false,
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.x.toFixed(0)}%` } } },
          scales: {
            x: { suggestedMin: 0, suggestedMax: 100, ticks: { callback: v => v + '%' } },
            y: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } }
          }
        }
      });
    }
    mk('punc-pax-best-chart', paxBest, 'rgba(25,135,84,0.7)');
    mk('punc-pax-worst-chart', paxWorst, 'rgba(220,53,69,0.7)');
    mk('punc-cargo-best-chart', cargoBest, 'rgba(25,135,84,0.7)');
    mk('punc-cargo-worst-chart', cargoWorst, 'rgba(220,53,69,0.7)');
  }

  function renderTable() {
    if (!_data) return;
    const container = document.getElementById('puntualidad-table-container');
    if (!container) return;
    container.innerHTML = '';

    const categories = ['Pasajeros', 'Carga'];

    categories.forEach(cat => {
      const filtered = byCategory(_data, cat);
      // Always render table, even if empty, to show structure
      // if (filtered.length === 0) return;

      // Header for category
      const header = document.createElement('h5');
      header.className = 'section-subheading mb-3 mt-4 text-primary';
      header.innerHTML = `<i class="fas fa-${cat === 'Pasajeros' ? 'plane-departure' : 'boxes'} me-2"></i>Aerolíneas de ${cat}`;
      container.appendChild(header);

      // Build table
      const table = document.createElement('table');
      table.className = 'table table-hover align-middle mb-4';
      table.innerHTML = `
          <thead class="table-light">
            <tr>
              <th>Aerolínea</th>
              <th class="text-end">A tiempo</th>
              <th class="text-end">Demora</th>
              <th class="text-end">Cancelado</th>
              <th class="text-end">Total</th>
              <th style="min-width:160px;">Puntualidad</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
      const tbody = table.querySelector('tbody');

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-3">No hay registros de ${cat} para este periodo</td></tr>`;
      } else {
        filtered.forEach(r => {
          const pct = parsePercent(r.puntualidad);
          const tr = document.createElement('tr');

          let logoHtml = '';
          try {
            if (typeof window.getAirlineLogoCandidates === 'function') {
              // ... existing logo logic ...
              const raw = window.getAirlineLogoCandidates(r.aerolinea || '') || [];
              const cands = raw.filter(path => !/default-airline-logo/i.test(path));
              const logoPath = cands[0];
              if (logoPath) {
                const dataCands = cands.join('|');
                const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(r.aerolinea || '', 'table') : 'lg';
                logoHtml = `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${r.aerolinea || ''}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
              }
            }
          } catch (_) { }

          tr.innerHTML = `
                <td><div class="airline-cell">${logoHtml}<span class="airline-name">${r.aerolinea || ''}</span></div></td>
                <td class="text-end">${Number(r.a_tiempo || 0)}</td>
                <td class="text-end">${Number(r.demora || 0)}</td>
                <td class="text-end">${Number(r.cancelado || 0)}</td>
                <td class="text-end">${Number(r.total || 0)}</td>
                <td>
                  <div class="progress" style="height: 18px;">
                    <div class="progress-bar ${clsForPct(pct)}" role="progressbar" style="width: ${Math.max(0, Math.min(100, pct))}%">${pct.toFixed(0)}%</div>
                  </div>
                </td>
              `;
          tbody.appendChild(tr);
        });
      }

      container.appendChild(table);
    });
  }

  /*
    // Old function replaced by DB loader at top of file
    async function loadData(){
      try {
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        // ...
      } catch (err) { ... }
    }
  */

  document.addEventListener('DOMContentLoaded', function () {
    // Init only once
    if (document.getElementById('puntualidad-agosto-section')) {
      // Inicializar tooltips de Bootstrap (para el ícono de ayuda de "Mín. vuelos")
      try {
        if (window.bootstrap && bootstrap.Tooltip) {
          document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
            try { new bootstrap.Tooltip(el); } catch (_) { }
          });
        }
      } catch (_) { }
      const sel = document.getElementById('puntualidad-minflights');
      if (sel) {
        sel.addEventListener('change', function () {
          const v = parseInt(sel.value, 10);
          _minFlights = isNaN(v) ? 5 : v;
          renderTopLists();
        });
      }
      const toggleWorstBtn = document.getElementById('puntualidad-toggle-worst');
      const interactivePane = document.getElementById('punc-interactivo-pane');
      if (toggleWorstBtn && interactivePane) {
        const updateToggleUi = () => {
          const showing = interactivePane.classList.contains('punc-show-worst');
          toggleWorstBtn.setAttribute('aria-pressed', showing ? 'true' : 'false');
          toggleWorstBtn.setAttribute('aria-expanded', showing ? 'true' : 'false');
          toggleWorstBtn.setAttribute('title', showing ? 'Ocultar aerolíneas impuntuales' : 'Mostrar aerolíneas impuntuales');
        };
        toggleWorstBtn.addEventListener('click', () => {
          interactivePane.classList.toggle('punc-show-worst');
          updateToggleUi();
        });
        updateToggleUi();
      }
      // Kick off load
      loadData();
    }
  });

  window.initPunctuality = function () {
    loadData();
  };
})();
