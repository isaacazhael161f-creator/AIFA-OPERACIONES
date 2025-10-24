(function(){
  const DATA_URL = 'data/puntualidad.json';
  const THRESHOLD = 85; // % threshold for punctual vs not punctual
  const TOP_N = 3; // Mostrar Top 3 por solicitud
  let _data = null;
  let _minFlights = 5;

  function parsePercent(p){
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const m = String(p).match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  function byCategory(list, categoria){
    return (list || []).filter(r => (r.categoria || '').toLowerCase() === categoria.toLowerCase());
  }

  function excludeTotals(list){
    return (list || []).filter(r => (r.aerolinea || '').toLowerCase() !== 'total');
  }

  function computeTop(list, count, best=true, minFlights=1){
    const safe = excludeTotals(list).filter(r => Number(r.total || 0) >= minFlights);
    const withPct = safe.map(r => ({
      ...r,
      pct: parsePercent(r.puntualidad)
    }));
    withPct.sort((a,b) => best ? (b.pct - a.pct) : (a.pct - b.pct));
    return withPct.slice(0, count);
  }

  function clsForPct(pct){
    return pct >= THRESHOLD ? 'bg-success' : 'bg-danger';
  }

  function renderTopLists(){
    if (!_data) return;
    const pax = byCategory(_data, 'Pasajeros');
    const cargo = byCategory(_data, 'Carga');

  const paxBest = computeTop(pax, TOP_N, true, _minFlights);
  const paxWorst = computeTop(pax, TOP_N, false, _minFlights);
  const cargoBest = computeTop(cargo, TOP_N, true, _minFlights);
  const cargoWorst = computeTop(cargo, TOP_N, false, _minFlights);

    function logoHtmlFor(airline){
      try {
        if (typeof window.getAirlineLogoCandidates !== 'function') return '';
        const cands = window.getAirlineLogoCandidates(airline) || [];
        const logoPath = cands[0];
        const dataCands = cands.join('|');
        const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(airline, 'summary') : 'lg';
        if (!logoPath) return '';
        return `<img class="airline-logo ${sizeClass} me-2" src="${logoPath}" alt="Logo ${airline}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
      } catch(_) { return ''; }
    }

    function renderList(elId, items){
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = '';
      items.forEach((r, i) => {
        const pct = parsePercent(r.puntualidad);
        const li = document.createElement('li');
        li.className = 'd-flex align-items-center justify-content-between gap-2 mb-1';
        const logo = logoHtmlFor(r.aerolinea);
        const rank = (typeof i === 'number') ? (i + 1) : null;
        const rankHtml = (rank && rank <= 3) ? `<span class="punc-rank-badge" aria-label="Top ${rank}">${rank}</span>` : '';
        li.innerHTML = `
          <span class="airline-header d-flex align-items-center gap-2 text-truncate" title="${r.aerolinea}">${rankHtml}${logo}<span class="airline-name">${r.aerolinea}</span></span>
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
    try { renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }); } catch(_) {}
  }

  // Renderizar mini gráficas de barras (horizontales) para los TOPs
  function renderTopCharts({ paxBest, paxWorst, cargoBest, cargoWorst }){
    if (!window.Chart) return;
    const charts = window._puncCharts = window._puncCharts || {};
    function destroy(id){ try { if (charts[id]) { charts[id].destroy(); charts[id] = null; } } catch(_){} }
    function mk(canvasId, items, color){
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

  function renderTable(){
    if (!_data) return;
    const container = document.getElementById('puntualidad-table-container');
    if (!container) return;
    // Helper para crear la tabla por categoría
    function buildTable(items, title, cardClass){
      const wrap = document.createElement('div');
      wrap.className = `card mb-3 punc-card ${cardClass||''}`;
      wrap.innerHTML = `<div class="card-header">${title}</div><div class="card-body"><div class="table-responsive"><table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th style="min-width:140px;">Aerolínea</th>
            <th class="text-end">A tiempo</th>
            <th class="text-end">Demora</th>
            <th class="text-end">Cancelado</th>
            <th class="text-end">Total</th>
            <th style="min-width:160px;">Puntualidad</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot></tfoot>
      </table></div></div>`;
      const tbody = wrap.querySelector('tbody');
      const tfoot = wrap.querySelector('tfoot');
      let sumOnTime = 0, sumDelay = 0, sumCancel = 0, sumTotal = 0;

      (items||[]).filter(r => (r.aerolinea||'').toLowerCase() !== 'total').forEach(r => {
        const pct = parsePercent(r.puntualidad);
        let logoHtml = '';
        try {
          if (typeof window.getAirlineLogoCandidates === 'function') {
            const cands = window.getAirlineLogoCandidates(r.aerolinea || '') || [];
            const logoPath = cands[0];
            const dataCands = cands.join('|');
            const sizeClass = (typeof window.getLogoSizeClass === 'function') ? window.getLogoSizeClass(r.aerolinea || '', 'table') : 'lg';
            if (logoPath) {
              logoHtml = `<img class="airline-logo ${sizeClass}" src="${logoPath}" alt="Logo ${r.aerolinea || ''}" data-cands="${dataCands}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`;
            }
          }
        } catch(_) {}

        const tr = document.createElement('tr');
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
          </td>`;
        tbody.appendChild(tr);

        sumOnTime += Number(r.a_tiempo || 0);
        sumDelay += Number(r.demora || 0);
        sumCancel += Number(r.cancelado || 0);
        sumTotal += Number(r.total || 0);
      });

      // Totales por categoría en el pie de la tabla
      const totalPct = sumTotal > 0 ? (sumOnTime / sumTotal) * 100 : 0;
      const trTotal = document.createElement('tr');
      trTotal.innerHTML = `
        <td class="fw-bold">Total ${title}</td>
        <td class="text-end fw-bold">${sumOnTime}</td>
        <td class="text-end fw-bold">${sumDelay}</td>
        <td class="text-end fw-bold">${sumCancel}</td>
        <td class="text-end fw-bold">${sumTotal}</td>
        <td>
          <div class="progress" style="height: 18px;">
            <div class="progress-bar ${clsForPct(totalPct)}" role="progressbar" style="width: ${Math.max(0, Math.min(100, totalPct))}%">${totalPct.toFixed(0)}%</div>
          </div>
        </td>`;
      const tfootRow = document.createElement('tr');
      tfootRow.appendChild(trTotal.children[0].cloneNode(true));
      tfootRow.appendChild(trTotal.children[1].cloneNode(true));
      tfootRow.appendChild(trTotal.children[2].cloneNode(true));
      tfootRow.appendChild(trTotal.children[3].cloneNode(true));
      tfootRow.appendChild(trTotal.children[4].cloneNode(true));
      tfootRow.appendChild(trTotal.children[5].cloneNode(true));
      tfoot.appendChild(tfootRow);

      return wrap;
    }

    const paxItems = byCategory(_data, 'Pasajeros');
    const cargoItems = byCategory(_data, 'Carga');

    const frag = document.createDocumentFragment();
    if ((paxItems||[]).length) frag.appendChild(buildTable(paxItems, 'Pasajeros', 'punc-passengers'));
    if ((cargoItems||[]).length) frag.appendChild(buildTable(cargoItems, 'Carga', 'punc-cargo'));

    container.innerHTML = '';
    if (!frag.childNodes.length) {
      container.innerHTML = '<div class="alert alert-info bg-transparent text-body">No hay datos para mostrar.</div>';
    } else {
      container.appendChild(frag);
    }
  }

  async function loadData(){
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      _data = Array.isArray(json) ? json : [];
      renderTopLists();
      renderTable();
    } catch (err) {
      console.error('No se pudo cargar puntualidad.json', err);
      const container = document.getElementById('puntualidad-table-container');
      if (container) {
        container.innerHTML = '<div class="alert alert-warning">No se pudo cargar puntualidad.json. Verifica que estás usando el servidor local (no file://).</div>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    // Init only once
    if (document.getElementById('puntualidad-agosto-section')){
      // Inicializar tooltips de Bootstrap (para el ícono de ayuda de "Mín. vuelos")
      try {
        if (window.bootstrap && bootstrap.Tooltip) {
          document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el){
            try { new bootstrap.Tooltip(el); } catch(_) {}
          });
        }
      } catch(_) {}
      const sel = document.getElementById('puntualidad-minflights');
      if (sel) {
        sel.addEventListener('change', function(){
          const v = parseInt(sel.value, 10);
          _minFlights = isNaN(v) ? 5 : v;
          renderTopLists();
        });
      }
      // Kick off load
      loadData();
    }
  });
})();
