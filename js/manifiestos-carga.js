/**
 * manifiestos-carga.js
 * Estadísticas de Manifiestos de Carga — AIFA
 * Tabla activa configurable vía selector de período.
 * Auto-detección de columnas para adaptarse al esquema real de Supabase.
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     CONFIGURACIÓN DE TABLAS
  ═══════════════════════════════════════════════════════ */
  const CARGO_TABLES = {
    'feb2026': { name: 'Base de Manifiestos Carga Febrero 2026', label: 'Manifiestos Carga — Febrero 2026' }
  };
  let _activeKey = 'feb2026';
  const tbl       = () => CARGO_TABLES[_activeKey].name;

  const PAGE_SIZE  = 50;
  const PAL_12     = ['#6f42c1','#198754','#ffc107','#dc3545','#0dcaf0','#fd7e14','#20c997','#6c757d','#d63384','#0d6efd','#0d3b86','#155724'];

  /* ═══════════════════════════════════════════════════════
     ESTADO
  ═══════════════════════════════════════════════════════ */
  let _allData = [], _filtered = [], _loaded = false;
  let _currentPage = 1, _charts = {};
  const _dataCache = {};

  /* ═══════════════════════════════════════════════════════
     AUTO-DETECCIÓN DE COLUMNAS
     Las columnas exactas varían según cómo se importó a Supabase.
     Esta lógica prueba múltiples variantes y usa la primera que contenga datos.
  ═══════════════════════════════════════════════════════ */
  let _cols = {};  // Resolved column names after detect

  function detect(row, ...variants) {
    for (const v of variants) {
      if (Object.prototype.hasOwnProperty.call(row, v) && row[v] !== null && row[v] !== undefined && row[v] !== '')
        return v;
    }
    // fallback: case-insensitive match
    const keys = Object.keys(row);
    for (const v of variants) {
      const lower = v.toLowerCase();
      const found = keys.find(k => k.toLowerCase() === lower);
      if (found) return found;
    }
    return null;
  }

  function detectColumns(rows) {
    if (!rows || !rows.length) return;
    // Use first 10 rows for detection (some rows may have nulls)
    const sample = rows.slice(0, Math.min(10, rows.length));

    const tryDetect = (...variants) => {
      for (const row of sample) {
        const found = detect(row, ...variants);
        if (found) return found;
      }
      return null;
    };

    _cols = {
      dir:     tryDetect('TIPO DE MANIFIESTO', 'TIPO MANIFIESTO', 'tipo_manifiesto', 'DIRECCION'),
      optype:  tryDetect('TIPO DE OPERACIÓN', 'TIPO DE OPERACION', 'TIPO OPERACION', 'tipo_operacion'),
      airline: tryDetect('AEROLINEA', 'AEROLÍNEA', 'aerolinea', 'AIRLINE', 'COMPAÑIA'),
      flight:  tryDetect('# DE VUELO', '# VUELO', 'VUELO', 'NO. VUELO', 'NUMERO VUELO'),
      fecha:   tryDetect('FECHA', 'FECHA VUELO', 'fecha', 'DATE'),
      origen:  tryDetect('ORIGEN', 'origen', 'ORIGIN'),
      destino: tryDetect('DESTINO', 'destino', 'DESTINATION'),
      escala:  tryDetect('ESCALA', 'escala', 'SCALE'),
      // KGS separados por dirección — columnas reales de la tabla
      kgsArr:  tryDetect('KGS CARGA LLEGADA NLU', 'KGS. CARGA LLEGADA', 'KGS LLEGADA', 'KGS CARGA LLEGADA'),
      kgsDep:  tryDetect('KG. DE CARGA SALIDA NLU', 'KGS CARGA SALIDA NLU', 'KG DE CARGA SALIDA', 'KGS SALIDA', 'KGS CARGA SALIDA'),
      // Columna única de KGS (fallback)
      kgs:     tryDetect('KGS. DE CARGA', 'KGS CARGA', 'KGS DE CARGA', 'KILOS', 'KGS', 'TOTAL KGS', 'KG CARGA'),
      piezas:  tryDetect('PIEZAS', 'BULTOS', 'NUMERO DE PIEZAS', 'NUM PIEZAS', 'PIECES'),
      tipo:    tryDetect('TIPO DE CARGA', 'TIPO CARGA', 'tipo_carga', 'CLASE DE CARGA', 'CATEGORIA'),
      aeronave:tryDetect('AERONAVE', 'aeronave', 'AIRCRAFT', 'TIPO AERONAVE'),
      puntual: tryDetect('PUNTUALIDAD', 'puntualidad', 'PUNCTUALITY'),
      importac:tryDetect('IMPORTACIÓN', 'IMPORTACION', 'importacion'),
      exportac:tryDetect('EXPORTACIÓN', 'EXPORTACION', 'exportacion'),
    };

    const allKeys = rows.length ? Object.keys(rows[0]) : [];
    console.info('[CargaModule] Columnas tabla:', allKeys);
    console.info('[CargaModule] Mapeadas:', _cols);

    const badge = document.getElementById('mcg-detected-cols-badge');
    if (badge) {
      const ok = ['kgsArr','kgsDep','kgs','piezas','tipo'].filter(k => _cols[k]);
      badge.textContent = ok.length ? ok.join(' ✓ ') + ' ✓' : 'Cols básicas detectadas';
    }
    hideBanner();
  }

  /* ═══════════════════════════════════════════════════════
     ACCESSORS
  ═══════════════════════════════════════════════════════ */
  const colVal = (r, key) => {
    if (!_cols[key]) return '';
    const v = r[_cols[key]];
    return v !== null && v !== undefined ? v : '';
  };

  const ni = v => parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0;

  const getDir     = r => String(colVal(r, 'dir')).toLowerCase();
  const getOpType  = r => String(colVal(r, 'optype')).toLowerCase();
  const getAirline = r => String(colVal(r, 'airline') || '(Sin nombre)');
  const getTipo    = r => String(colVal(r, 'tipo') || '(No especificado)');

  // Ruta: ORIGEN→DESTINO con escala opcional
  const getRoute = r => {
    const o = String(colVal(r, 'origen') || '').trim();
    const d = String(colVal(r, 'destino') || '').trim();
    const e = String(colVal(r, 'escala') || '').trim();
    if (o && d) return e ? o + '-' + e + '-' + d : o + '-' + d;
    return o || d || '—';
  };

  // KGS: suma llegada + salida (sólo una tendrá valor por fila)
  const getKgsArr = r => ni(colVal(r, 'kgsArr'));
  const getKgsDep = r => ni(colVal(r, 'kgsDep'));
  const getKgsRaw = r => ni(colVal(r, 'kgs'));  // fallback columna única
  const getKgs    = r => {
    const a = getKgsArr(r), d = getKgsDep(r), u = getKgsRaw(r);
    return (a + d) || u;  // si existen separadas, sumarlas; si no, usar única
  };

  const getPiezas  = r => ni(colVal(r, 'piezas'));
  const hasPiezas  = () => !!_cols.piezas;
  const hasTipo    = () => !!_cols.tipo;

  // Dirección basada en columna TIPO DE MANIFIESTO o KGS parciales
  const isArr = r => {
    const d = getDir(r);
    if (d) return d.includes('llegada') || d.includes('arr') || d.includes('import') || d.includes('entrada');
    return getKgsArr(r) > 0 && getKgsDep(r) === 0;
  };
  const isDep = r => {
    const d = getDir(r);
    if (d) return d.includes('salida') || d.includes('dep') || d.includes('export') || d.includes('depart');
    return getKgsDep(r) > 0 && getKgsArr(r) === 0;
  };
  const isDom = r => { const ot = getOpType(r); return ot.includes('nac') || ot.includes('dom') || (ot !== '' && !ot.includes('int')); };
  const isInt = r => getOpType(r).includes('int');

  /* ═══════════════════════════════════════════════════════
     HELPERS DE FORMATO
  ═══════════════════════════════════════════════════════ */
  const fmt     = n => (n != null ? Number(n).toLocaleString('es-MX') : '—');
  const fmtKgs  = n => Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
  const pct     = (a, b) => b ? ((a / b) * 100).toFixed(1) + '%' : '—';
  const tickK   = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v;
  const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const set     = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  function datalabelsPiePct(total) {
    return {
      display: true,
      anchor: 'end',
      align: 'end',
      offset: 6,
      clip: false,
      color: (ctx) => {
        const bg = ctx.dataset.backgroundColor;
        return Array.isArray(bg) ? (bg[ctx.dataIndex] || '#495057') : '#495057';
      },
      font: { weight: 'bold', size: 11 },
      textStrokeColor: '#fff',
      textStrokeWidth: 3,
      formatter: (value, ctx) => {
        const p = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        if (parseFloat(p) < 2) return null;
        const label = (ctx.chart.data.labels || [])[ctx.dataIndex] || '';
        return label + ' (' + p + '%)';
      }
    };
  }

  /* ═══════════════════════════════════════════════════════
     OVERLAY / BANNER
  ═══════════════════════════════════════════════════════ */
  const showOverlay = txt => {
    const o = document.getElementById('mcg-overlay'); if (o) o.style.display = 'flex';
    setOverlayText(txt);
  };
  const hideOverlay = () => { const o = document.getElementById('mcg-overlay'); if (o) o.style.display = 'none'; };
  const setOverlayText = txt => { const el = document.getElementById('mcg-overlay-text'); if (el) el.textContent = txt || 'Cargando...'; };
  const showBanner = (type, html) => {
    const el = document.getElementById('mcg-banner');
    if (!el) return;
    el.className = 'alert alert-' + type + ' mb-3';
    el.innerHTML = html;
    el.classList.remove('d-none');
  };
  const hideBanner = () => { const el = document.getElementById('mcg-banner'); if (el) { el.classList.add('d-none'); el.innerHTML = ''; } };

  function destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch (_) {} });
    _charts = {};
  }

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mcg-btn-reload')?.addEventListener('click', () => {
      _loaded = false; _allData = [];
      delete _dataCache[_activeKey];
      destroyCharts();
      load();
    });

    document.getElementById('mcg-btn-export')?.addEventListener('click', exportExcel);

    let _st;
    document.getElementById('mcg-search-input')?.addEventListener('input', e => {
      clearTimeout(_st); _st = setTimeout(() => filterTable(e.target.value), 250);
    });

    const tabBtn = document.getElementById('aops-tab-carga');
    if (tabBtn) {
      tabBtn.addEventListener('shown.bs.tab', () => { if (!_loaded) load(); });
      tabBtn.addEventListener('click', () => { setTimeout(() => { if (!_loaded) load(); }, 400); });
    }

    document.querySelectorAll('#mcg-sub-tabs button[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', () => { if (_loaded && _filtered.length > 0) renderActiveSubTab(); });
    });

    setTimeout(tryPreload, 1200);
  });

  function tryPreload() {
    if (window.supabaseClient) { load(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (window.supabaseClient) { clearInterval(iv); load(); }
      else if (tries >= 15) clearInterval(iv);
    }, 2000);
  }

  /* ═══════════════════════════════════════════════════════
     CARGA DE DATOS
  ═══════════════════════════════════════════════════════ */
  async function load() {
    if (_loaded) { applyFilters(); return; }

    // Restore from cache if available
    if (_dataCache[_activeKey]) {
      _allData = _dataCache[_activeKey];
      _loaded  = true;
      applyFilters();
      return;
    }

    hideBanner();
    showOverlay('Cargando manifiestos de carga...');
    try {
      const client = window.supabaseClient;
      if (!client) throw new Error('Supabase no disponible — inicia sesión primero');

      let all = [], from = 0;
      const BS = 1000;
      let more = true;
      while (more) {
        setOverlayText('Cargando registros (' + all.length.toLocaleString() + ')...');
        const { data, error } = await client.from(tbl()).select('*').range(from, from + BS - 1);
        if (error) throw error;
        if (data && data.length > 0) { all = all.concat(data); from += BS; if (data.length < BS) more = false; }
        else more = false;
        if (all.length > 100000) more = false;
      }

      _allData = all;
      _loaded  = true;
      _dataCache[_activeKey] = all;

      if (all.length === 0) {
        showBanner('info', 'La tabla está vacía o RLS bloquea la lectura.');
        hideOverlay(); return;
      }

      detectColumns(all);
      applyFilters();
    } catch (err) {
      console.error('[CargaModule]', err);
      showBanner('danger', 'Error al cargar: <strong>' + escHtml(err.message || String(err)) + '</strong>');
    } finally {
      hideOverlay();
    }
  }

  /* ═══════════════════════════════════════════════════════
     FILTRADO
  ═══════════════════════════════════════════════════════ */
  function applyFilters() {
    _filtered = _allData; // base: todos los datos del período activo
    _currentPage = 1;
    renderAll();
  }

  function filterTable(query) {
    if (!query) { renderTable(_filtered); return; }
    const q = query.toLowerCase();
    const res = _filtered.filter(r =>
      getAirline(r).toLowerCase().includes(q) ||
      getRoute(r).toLowerCase().includes(q)   ||
      getDir(r).includes(q)                   ||
      getTipo(r).toLowerCase().includes(q)
    );
    _currentPage = 1;
    renderTable(res);
  }

  /* ═══════════════════════════════════════════════════════
     RENDER PRINCIPAL
  ═══════════════════════════════════════════════════════ */
  function renderAll() {
    renderKPIs();
    renderActiveSubTab();
    set('mcg-record-count', fmt(_filtered.length) + ' reg.');
  }

  function renderActiveSubTab() {
    const active = document.querySelector('#mcg-sub-tabs button.active');
    const target = active ? active.dataset.bsTarget : '#mcg-sub-resumen';
    switch (target) {
      case '#mcg-sub-resumen':   renderTabResumen();   break;
      case '#mcg-sub-aerolineas':renderTabAerolineas();break;
      case '#mcg-sub-rutas':     renderTabRutas();     break;
      case '#mcg-sub-tipo':      renderTabTipo();      break;
      case '#mcg-sub-datos':     renderTable(_filtered);break;
      default:                   renderTabResumen();
    }
  }

  /* ═══════════════════════════════════════════════════════
     KPIs GLOBALES
  ═══════════════════════════════════════════════════════ */
  function renderKPIs() {
    const d = _filtered, total = d.length;

    // KGS llegada y salida son columnas separadas en este manifiesto
    const totalArrKgs = d.reduce((s, r) => s + getKgsArr(r), 0);
    const totalDepKgs = d.reduce((s, r) => s + getKgsDep(r), 0);
    const totalKgs    = totalArrKgs + totalDepKgs || d.reduce((s, r) => s + getKgsRaw(r), 0);
    const avgKgs      = total ? Math.round(totalKgs / total) : 0;

    // Llegadas/Salidas: contar por columna KGS o por campo dirección
    const arrRows = d.filter(r => getKgsArr(r) > 0 || isArr(r));
    const depRows = d.filter(r => getKgsDep(r) > 0 || isDep(r));
    const arrKgs  = totalArrKgs || arrRows.reduce((s, r) => s + getKgs(r), 0);
    const depKgs  = totalDepKgs || depRows.reduce((s, r) => s + getKgs(r), 0);

    // Nacional / Internacional
    const domRows = d.filter(isDom);
    const intRows = d.filter(isInt);
    const domKgs  = domRows.reduce((s, r) => s + getKgs(r), 0);
    const intKgs  = intRows.reduce((s, r) => s + getKgs(r), 0);

    // Top airline by KGS
    const aMap = {};
    d.forEach(r => { const a = getAirline(r); aMap[a] = (aMap[a] || 0) + getKgs(r); });
    const top = Object.entries(aMap).sort((a, b) => b[1] - a[1])[0];

    set('mcg-kpi-total',           fmt(total));
    set('mcg-kpi-kgs',             fmtKgs(totalKgs));
    set('mcg-kpi-kgs-sub',         'kilogramos totales (llegada + salida)');
    set('mcg-kpi-avgkgs',          fmtKgs(avgKgs));
    set('mcg-kpi-top-airline',     top ? top[0] : '—');
    set('mcg-kpi-top-airline-kgs', top ? fmtKgs(top[1]) + ' kg (' + pct(top[1], totalKgs) + ')' : '—');
    set('mcg-kpi-arr-kgs',         fmtKgs(arrKgs));
    set('mcg-kpi-arr-count',       fmt(arrRows.length) + ' vuelos (' + pct(arrKgs, totalKgs) + ')');
    set('mcg-kpi-dep-kgs',         fmtKgs(depKgs));
    set('mcg-kpi-dep-count',       fmt(depRows.length) + ' vuelos (' + pct(depKgs, totalKgs) + ')');
    set('mcg-kpi-nac-kgs',         fmtKgs(domKgs));
    set('mcg-kpi-nac-pct',         pct(domKgs, totalKgs) + ' del total');
    set('mcg-kpi-int-kgs',         fmtKgs(intKgs));
    set('mcg-kpi-int-pct',         pct(intKgs, totalKgs) + ' del total');
  }

  /* ═══════════════════════════════════════════════════════
     RESUMEN
  ═══════════════════════════════════════════════════════ */
  function renderTabResumen() {
    renderChartAirlineKgs();
    renderChartOptypeDonut();
    renderChartDirDonut();
    if (hasPiezas()) renderChartPiezas();
    else {
      const col = document.getElementById('mcg-piezas-chart-col');
      if (col) col.style.display = 'none';
    }
  }

  function renderChartAirlineKgs() {
    const ctx = document.getElementById('mcg-chart-airline-kgs'); if (!ctx) return;
    if (_charts.airlineKgs) _charts.airlineKgs.destroy();
    const map = {};
    _filtered.forEach(r => { const a = getAirline(r); map[a] = (map[a] || 0) + getKgs(r); });
    const sorted = Object.entries(map).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const totalKgs = _filtered.reduce((s, r) => s + getKgs(r), 0);
    _charts.airlineKgs = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'KGS', data: sorted.map(([, k]) => k), backgroundColor: PAL_12.concat(PAL_12).slice(0, sorted.length), borderRadius: 4, borderSkipped: false }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 80 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10, weight: '600' }, formatter: v => fmtKgs(v) + ' kg' },
          tooltip: { callbacks: { label: c => ' ' + fmtKgs(c.raw) + ' kg (' + pct(c.raw, totalKgs) + ')' } }
        },
        scales: { x: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartOptypeDonut() {
    const ctx = document.getElementById('mcg-chart-optype-donut'); if (!ctx) return;
    if (_charts.optypeDonut) _charts.optypeDonut.destroy();
    const domKgs = _filtered.filter(isDom).reduce((s, r) => s + getKgs(r), 0);
    const intKgs = _filtered.filter(isInt).reduce((s, r) => s + getKgs(r), 0);
    const total  = domKgs + intKgs;
    _charts.optypeDonut = new Chart(ctx, {
      type: 'pie',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Nacional', 'Internacional'], datasets: [{ data: [domKgs, intKgs], backgroundColor: ['#fd7e14', '#20c997'], borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: 70 }, plugins: { legend: { display: false }, datalabels: datalabelsPiePct(total), tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtKgs(c.raw) + ' kg (' + pct(c.raw, total) + ')' } } } }
    });
  }

  function renderChartDirDonut() {
    const ctx = document.getElementById('mcg-chart-dir-donut'); if (!ctx) return;
    if (_charts.dirDonut) _charts.dirDonut.destroy();
    // Use dedicated KGS columns when available (KGS CARGA LLEGADA NLU / KG. DE CARGA SALIDA NLU)
    const arrKgs = _filtered.reduce((s, r) => s + (getKgsArr(r) || (isArr(r) ? getKgsRaw(r) : 0)), 0);
    const depKgs = _filtered.reduce((s, r) => s + (getKgsDep(r) || (isDep(r) ? getKgsRaw(r) : 0)), 0);
    const total  = arrKgs + depKgs;
    _charts.dirDonut = new Chart(ctx, {
      type: 'pie',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Llegadas', 'Salidas'], datasets: [{ data: [arrKgs, depKgs], backgroundColor: ['#d63384', '#6610f2'], borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: 70 }, plugins: { legend: { display: false }, datalabels: datalabelsPiePct(total), tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtKgs(c.raw) + ' kg (' + pct(c.raw, total) + ')' } } } }
    });
  }

  function renderChartPiezas() {
    const ctx = document.getElementById('mcg-chart-piezas'); if (!ctx) return;
    if (_charts.piezas) _charts.piezas.destroy();
    const map = {};
    _filtered.forEach(r => { const a = getAirline(r); map[a] = (map[a] || 0) + getPiezas(r); });
    const sorted = Object.entries(map).filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    _charts.piezas = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Piezas', data: sorted.map(([, p]) => p), backgroundColor: '#0dcaf0', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10 }, formatter: v => fmt(v) } }, scales: { x: { beginAtZero: true, ticks: { callback: tickK } } } }
    });
  }

  /* ═══════════════════════════════════════════════════════
     AEROLÍNEAS
  ═══════════════════════════════════════════════════════ */
  function renderTabAerolineas() {
    renderChartAirlineDomInt();
    renderChartAirlineFlights();
    renderAirlineRanking();
  }

  function renderChartAirlineDomInt() {
    const ctx = document.getElementById('mcg-chart-airline-domint'); if (!ctx) return;
    if (_charts.airlineDomInt) _charts.airlineDomInt.destroy();
    const domMap = {}, intMap = {};
    _filtered.forEach(r => {
      const a = getAirline(r), k = getKgs(r);
      if (isDom(r)) domMap[a] = (domMap[a] || 0) + k;
      if (isInt(r)) intMap[a] = (intMap[a] || 0) + k;
    });
    const all = [...new Set([...Object.keys(domMap), ...Object.keys(intMap)])];
    const sorted = all.map(a => ({ a, t: (domMap[a] || 0) + (intMap[a] || 0) })).sort((x, y) => y.t - x.t).slice(0, 15).map(x => x.a);
    _charts.airlineDomInt = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted, datasets: [
        { label: 'Nacional',       data: sorted.map(a => domMap[a] || 0), backgroundColor: 'rgba(253,126,20,0.8)', borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 }, stack: 'S' },
        { label: 'Internacional', data: sorted.map(a => intMap[a] || 0), backgroundColor: 'rgba(32,201,151,0.8)', borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, stack: 'S' }
      ]},
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, datalabels: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + fmtKgs(c.raw) + ' kg' } } }, scales: { x: { stacked: true, ticks: { callback: tickK } }, y: { stacked: true } } }
    });
  }

  function renderChartAirlineFlights() {
    const ctx = document.getElementById('mcg-chart-airline-flights'); if (!ctx) return;
    if (_charts.airlineFlights) _charts.airlineFlights.destroy();
    const map = {};
    _filtered.forEach(r => { const a = getAirline(r); map[a] = (map[a] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 15);
    _charts.airlineFlights = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Vuelos', data: sorted.map(([, v]) => v), backgroundColor: '#6f42c1', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10 }, formatter: v => fmt(v) } }, scales: { x: { beginAtZero: true } } }
    });
  }

  function renderAirlineRanking() {
    const tbody = document.getElementById('mcg-tbody-airline-ranking'); if (!tbody) return;
    const map = {};
    _filtered.forEach(r => {
      const a = getAirline(r);
      const ka = getKgsArr(r), kd = getKgsDep(r), ku = getKgsRaw(r);
      const arrKgs = ka || (isArr(r) ? ku : 0);
      const depKgs = kd || (isDep(r) ? ku : 0);
      const k = arrKgs + depKgs || ku;
      if (!map[a]) map[a] = { flights: 0, kgs: 0, arrKgs: 0, depKgs: 0 };
      map[a].flights++;
      map[a].kgs    += k;
      map[a].arrKgs += arrKgs;
      map[a].depKgs += depKgs;
    });
    const totalKgs = Object.values(map).reduce((s, v) => s + v.kgs, 0);
    const sorted = Object.entries(map).sort((a, b) => b[1].kgs - a[1].kgs);
    set('mcg-airline-count-badge', sorted.length + ' aerolíneas');
    tbody.innerHTML = sorted.map(([name, s], i) => `
      <tr>
        <td class="text-center fw-semibold">${i + 1}</td>
        <td>${escHtml(name)}</td>
        <td class="text-end">${fmt(s.flights)}</td>
        <td class="text-end fw-bold">${fmtKgs(s.kgs)}</td>
        <td class="text-end">${fmtKgs(s.flights ? Math.round(s.kgs / s.flights) : 0)}</td>
        <td class="text-end">${fmtKgs(s.arrKgs)}</td>
        <td class="text-end">${fmtKgs(s.depKgs)}</td>
        <td class="text-end">${pct(s.kgs, totalKgs)}</td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted py-3">Sin datos</td></tr>';
  }

  /* ═══════════════════════════════════════════════════════
     RUTAS
  ═══════════════════════════════════════════════════════ */
  function renderTabRutas() {
    renderChartRoutes();
    renderChartRouteOptype();
    renderRoutesTable();
  }

  function renderChartRoutes() {
    const ctx = document.getElementById('mcg-chart-routes'); if (!ctx) return;
    if (_charts.routes) _charts.routes.destroy();
    const map = {};
    _filtered.forEach(r => { const rt = getRoute(r); map[rt] = (map[rt] || 0) + getKgs(r); });
    const sorted = Object.entries(map).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const totalKgs = _filtered.reduce((s, r) => s + getKgs(r), 0);
    _charts.routes = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'KGS', data: sorted.map(([, k]) => k), backgroundColor: '#dc3545', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10 }, formatter: v => fmtKgs(v) + ' kg (' + pct(v, totalKgs) + ')' }, tooltip: { callbacks: { label: c => ' ' + fmtKgs(c.raw) + ' kg' } } }, scales: { x: { beginAtZero: true, ticks: { callback: tickK } } } }
    });
  }

  function renderChartRouteOptype() {
    const ctx = document.getElementById('mcg-chart-route-optype'); if (!ctx) return;
    if (_charts.routeOptype) _charts.routeOptype.destroy();
    const domKgs = _filtered.filter(isDom).reduce((s, r) => s + getKgs(r), 0);
    const intKgs = _filtered.filter(isInt).reduce((s, r) => s + getKgs(r), 0);
    const total  = domKgs + intKgs;
    _charts.routeOptype = new Chart(ctx, {
      type: 'pie',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Nacional', 'Internacional'], datasets: [{ data: [domKgs, intKgs], backgroundColor: ['#fd7e14', '#20c997'], borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: 70 }, plugins: { legend: { display: false }, datalabels: datalabelsPiePct(total), tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtKgs(c.raw) + ' kg (' + pct(c.raw, total) + ')' } } } }
    });
  }

  function renderRoutesTable() {
    const tbody = document.getElementById('mcg-tbody-rutas'); if (!tbody) return;
    const totalKgs = _filtered.reduce((s, r) => s + getKgs(r), 0);
    const map = {};
    _filtered.forEach(r => {
      const rt = getRoute(r), k = getKgs(r);
      if (!map[rt]) map[rt] = { flights: 0, kgs: 0, domKgs: 0, intKgs: 0 };
      map[rt].flights++;
      map[rt].kgs += k;
      if (isDom(r)) map[rt].domKgs += k;
      if (isInt(r)) map[rt].intKgs += k;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].kgs - a[1].kgs);
    tbody.innerHTML = sorted.map(([route, s], i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${escHtml(route)}</td>
        <td class="text-end">${fmt(s.flights)}</td>
        <td class="text-end fw-bold">${fmtKgs(s.kgs)}</td>
        <td class="text-end">${fmtKgs(s.flights ? Math.round(s.kgs / s.flights) : 0)}</td>
        <td class="text-end">${fmtKgs(s.domKgs)}</td>
        <td class="text-end">${fmtKgs(s.intKgs)}</td>
        <td class="text-end">${pct(s.kgs, totalKgs)}</td>
      </tr>`).join('') || '<tr><td colspan="8" class="text-center text-muted py-3">Sin datos</td></tr>';
  }

  /* ═══════════════════════════════════════════════════════
     TIPO DE CARGA
  ═══════════════════════════════════════════════════════ */
  function renderTabTipo() {
    const noColEl  = document.getElementById('mcg-tipo-no-col');
    const content  = document.getElementById('mcg-tipo-content');
    if (!hasTipo()) {
      if (noColEl) noColEl.classList.remove('d-none');
      if (content) content.classList.add('d-none');
      return;
    }
    if (noColEl) noColEl.classList.add('d-none');
    if (content) content.classList.remove('d-none');
    renderChartTipoKgs();
    renderChartTipoDonut();
    renderTipoTable();
  }

  function renderChartTipoKgs() {
    const ctx = document.getElementById('mcg-chart-tipo-kgs'); if (!ctx) return;
    if (_charts.tipoKgs) _charts.tipoKgs.destroy();
    const map = {};
    _filtered.forEach(r => { const t = getTipo(r); map[t] = (map[t] || 0) + getKgs(r); });
    const sorted = Object.entries(map).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]);
    const totalKgs = sorted.reduce((s, [, k]) => s + k, 0);
    _charts.tipoKgs = new Chart(ctx, {
      type: 'bar',
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'KGS', data: sorted.map(([, k]) => k), backgroundColor: PAL_12.slice(0, sorted.length), borderRadius: 4, borderSkipped: false }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10 }, formatter: v => fmtKgs(v) + ' kg (' + pct(v, totalKgs) + ')' }, tooltip: { callbacks: { label: c => ' ' + fmtKgs(c.raw) + ' kg' } } }, scales: { x: { beginAtZero: true, ticks: { callback: tickK } } } }
    });
  }

  function renderChartTipoDonut() {
    const ctx = document.getElementById('mcg-chart-tipo-donut'); if (!ctx) return;
    if (_charts.tipoDonut) _charts.tipoDonut.destroy();
    const map = {};
    _filtered.forEach(r => { const t = getTipo(r); map[t] = (map[t] || 0) + getKgs(r); });
    const entries  = Object.entries(map).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]);
    const total    = entries.reduce((s, [, k]) => s + k, 0);
    _charts.tipoDonut = new Chart(ctx, {
      type: 'pie',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: entries.map(([n]) => n), datasets: [{ data: entries.map(([, k]) => k), backgroundColor: PAL_12.slice(0, entries.length), borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: 80 }, plugins: { legend: { display: false }, datalabels: datalabelsPiePct(total), tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmtKgs(c.raw) + ' kg (' + pct(c.raw, total) + ')' } } } }
    });
  }

  function renderTipoTable() {
    const tbody = document.getElementById('mcg-tbody-tipo'); if (!tbody) return;
    const totalKgs = _filtered.reduce((s, r) => s + getKgs(r), 0);
    const map = {};
    _filtered.forEach(r => {
      const t = getTipo(r), k = getKgs(r);
      if (!map[t]) map[t] = { flights: 0, kgs: 0 };
      map[t].flights++;
      map[t].kgs += k;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].kgs - a[1].kgs);
    tbody.innerHTML = sorted.map(([tipo, s], i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${escHtml(tipo)}</td>
        <td class="text-end">${fmt(s.flights)}</td>
        <td class="text-end fw-bold">${fmtKgs(s.kgs)}</td>
        <td class="text-end">${fmtKgs(s.flights ? Math.round(s.kgs / s.flights) : 0)}</td>
        <td class="text-end">${pct(s.kgs, totalKgs)}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted py-3">Sin datos</td></tr>';
  }

  /* ═══════════════════════════════════════════════════════
     TABLA DE DATOS RAW
  ═══════════════════════════════════════════════════════ */
  function renderTable(data) {
    const thead = document.getElementById('mcg-main-thead');
    const tbody = document.getElementById('mcg-main-tbody');
    const info  = document.getElementById('mcg-table-info');
    const pg    = document.getElementById('mcg-pagination');
    if (!tbody) return;

    if (!data || !data.length) {
      tbody.innerHTML = '<tr><td colspan="20" class="text-center text-muted py-4">Sin datos</td></tr>';
      if (info) info.textContent = '0 registros';
      return;
    }

    const cols   = Object.keys(data[0]);
    const total  = data.length;
    const pages  = Math.ceil(total / PAGE_SIZE);
    if (_currentPage > pages) _currentPage = 1;

    const slice = data.slice((_currentPage - 1) * PAGE_SIZE, _currentPage * PAGE_SIZE);

    // Header
    if (thead) {
      thead.innerHTML = '<tr>' + cols.map(c => `<th style="white-space:nowrap">${escHtml(c)}</th>`).join('') + '</tr>';
    }
    // Rows
    tbody.innerHTML = slice.map(row => '<tr>' + cols.map(c => {
      const v = row[c];
      return `<td style="white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escHtml(v == null ? '' : String(v))}</td>`;
    }).join('') + '</tr>').join('');

    if (info) info.textContent = `Mostrando ${(_currentPage - 1) * PAGE_SIZE + 1}–${Math.min(_currentPage * PAGE_SIZE, total)} de ${fmt(total)} registros`;

    // Pagination
    if (pg) {
      pg.innerHTML = '';
      const range = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
        const p = _currentPage <= 4 ? i + 1 : _currentPage - 3 + i;
        return p <= pages ? p : null;
      }).filter(Boolean);

      range.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm ' + (p === _currentPage ? 'btn-primary' : 'btn-outline-secondary');
        btn.textContent = p;
        btn.addEventListener('click', () => { _currentPage = p; renderTable(data); });
        pg.appendChild(btn);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════
     EXPORTAR EXCEL
  ═══════════════════════════════════════════════════════ */
  function exportExcel() {
    if (!_filtered.length) { alert('No hay datos para exportar.'); return; }
    try {
      const cols  = Object.keys(_filtered[0]);
      const rows  = [cols, ..._filtered.map(r => cols.map(c => r[c] ?? ''))];
      const ws    = XLSX.utils.aoa_to_sheet(rows);
      const wb    = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Carga');
      XLSX.writeFile(wb, 'Manifiestos_Carga_Feb2026.xlsx');
    } catch (e) {
      alert('Error al exportar. Verifica que la librería XLSX esté cargada.');
      console.error(e);
    }
  }

})();
