/**
 * manifiestos-analisis.js
 * Analisis exhaustivo de manifiestos - Tabla: "Base de datos Manifiestos 2025"
 * Sub-pestañas: Resumen | Pasajeros | Aerolíneas | Rutas | Equipaje | Datos
 * v2.1 — Logos de aerolíneas + porcentajes en gráficas
 */
(function () {
  'use strict';

  const TABLE     = 'Base de datos Manifiestos 2025';
  const PAGE_SIZE = 50;
  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const PAL_12    = ['#0d6efd','#198754','#ffc107','#dc3545','#0dcaf0','#6610f2','#fd7e14','#20c997','#6c757d','#d63384','#0d3b86','#155724'];
  const PAL_7     = ['#0d6efd','#fd7e14','#20c997','#0dcaf0','#d63384','#ffc107','#6c757d'];

  /* ═══════════════════════════════════════════════════════
     LOGOS DE AEROLÍNEAS
     Mapeo nombre → código IATA para obtener logos de Google
  ═══════════════════════════════════════════════════════ */
  const AIRLINE_IATA = {
    'aerom\u00e9xico': 'AM', 'aeromexico': 'AM', 'aeroméxico connect': 'AM',
    'volaris': 'Y4', 'vuela': 'Y4',
    'vivaaerobus': 'VB', 'viva aerobus': 'VB', 'viva aerob\u00fas': 'VB',
    'aeromar': 'VW',
    'american airlines': 'AA', 'american': 'AA',
    'united airlines': 'UA', 'united': 'UA',
    'delta air lines': 'DL', 'delta': 'DL',
    'southwest airlines': 'WN', 'southwest': 'WN',
    'spirit airlines': 'NK', 'spirit': 'NK',
    'frontier airlines': 'F9', 'frontier': 'F9',
    'alaska airlines': 'AS', 'alaska': 'AS',
    'jetblue': 'B6', 'jet blue': 'B6',
    'copa airlines': 'CM', 'copa': 'CM',
    'avianca': 'AV',
    'latam airlines': 'LA', 'latam': 'LA',
    'iberia': 'IB',
    'lufthansa': 'LH',
    'air france': 'AF',
    'klm': 'KL',
    'british airways': 'BA',
    'qatar airways': 'QR', 'qatar': 'QR',
    'emirates': 'EK',
    'turkish airlines': 'TK', 'turkish': 'TK',
    'air canada': 'AC',
    'westjet': 'WJ',
    'sunwing': 'WG',
    'aerol\u00edneas argentinas': 'AR', 'aerolineas argentinas': 'AR',
    'gol': 'G3',
    'azul': 'AD',
    'insel air': '7I',
    'conviasa': 'V0',
    'caribbean airlines': 'BW',
    'interjet': '4O',
    'magnicharters': 'GM', 'magni charters': 'GM',
    'aerocali': 'QA',
    'transportes a\u00e9reos regionales': 'TAR', 'tar aerol\u00edneas': 'TAR', 'tar': 'TAR',
    'abb': 'ABB', 'aerobahn': 'ABB',
    'air transat': 'TS', 'airtransat': 'TS',
    'sunclass airlines': 'DK',
    'condor': 'DE',
    'tui': 'BY', 'tui airways': 'BY',
    'finnair': 'AY',
    'edelweiss air': 'WK',
    'belair': 'BHP',
    'aerob\u00fas': 'BUS',
    'transportes a\u00e9reos guatemaltecos': 'GU', 'tag airlines': 'GU',
  };

  const _logoCache = {};  // IATA → HTMLImageElement

  function getIATA(airlineName) {
    const k = (airlineName || '').toLowerCase().trim();
    return AIRLINE_IATA[k] || null;
  }

  function logoUrl(iata) {
    return 'https://www.gstatic.com/flights/airline_logos/70px/' + iata + '.png';
  }

  function preloadLogo(iata) {
    if (!iata || _logoCache[iata]) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logoUrl(iata);
    _logoCache[iata] = img;
  }

  function preloadAirlineLogos(data) {
    const seen = new Set();
    data.forEach(r => {
      const iata = getIATA(getAirline(r));
      if (iata && !seen.has(iata)) { seen.add(iata); preloadLogo(iata); }
    });
  }

  function airlineLogoHTML(name, size) {
    const iata = getIATA(name);
    if (!iata) return '';
    const s = size || 22;
    return '<img src="' + logoUrl(iata) + '" alt="' + iata + '"'
      + ' style="width:' + s + 'px;height:' + s + 'px;object-fit:contain;border-radius:4px;margin-right:5px;vertical-align:middle;background:#f8f9fa;"'
      + ' onerror="this.style.display=\'none\'">';
  }

  /* Custom Chart.js plugin: dibuja logos en eje Y de gráficas horizontales */
  const airlineLogoPlugin = {
    id: 'airlineLogos',
    afterDraw(chart, args, opts) {
      if (!opts || !opts.enabled) return;
      const ctx = chart.ctx;
      const yAxis = chart.scales.y;
      if (!yAxis) return;
      yAxis.ticks.forEach((tick, i) => {
        const label = Array.isArray(tick.label) ? tick.label.join(' ') : (tick.label || '');
        const iata = getIATA(label);
        if (!iata) return;
        const img = _logoCache[iata];
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const y = yAxis.getPixelForTick(i);
        const size = opts.size || 20;
        const x = yAxis.left - size - (opts.gap || 6);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y - size / 2, size, size);
        ctx.restore();
      });
    }
  };
  // Registrar el plugin globalmente
  if (window.Chart) Chart.register(airlineLogoPlugin);
  else document.addEventListener('DOMContentLoaded', () => { if (window.Chart) Chart.register(airlineLogoPlugin); });

  /* ═══════════════════════════════════════════════════════
     COLUMNAS REALES
  ═══════════════════════════════════════════════════════ */
  const col = (r, ...keys) => { for (const k of keys) { const v = r[k]; if (v !== undefined && v !== null && v !== '') return v; } return null; };

  const getDir      = r => col(r, 'TIPO DE MANIFIESTO') || '';
  const getAirline  = r => col(r, 'AEROLINEA', 'aerolinea') || '(Sin nombre)';
  const getOpType   = r => col(r, 'TIPO DE OPERACION', 'TIPO DE OPERACION ') || col(r, 'TIPO DE OPERACI\u00d3N') || '';
  const getFlight   = r => col(r, '# DE VUELO') || '';
  const getRoute    = r => col(r, 'DESTINO / ORIGEN') || '';
  const getFecha    = r => col(r, 'FECHA', 'fecha') || '';
  const getMes      = r => col(r, 'MES', 'mes') || '';

  const ni = v => parseInt(v, 10) || 0;
  const getPaxTotal = r => ni(col(r, 'TOTAL PAX'));
  const getPaxTUA   = r => ni(col(r, 'PAX. QUE PAGAN TUA'));
  const getPaxInf   = r => ni(col(r, 'INFANTES'));
  const getPaxTrans = r => ni(col(r, 'TRANSITOS'));
  const getPaxConex = r => ni(col(r, 'CONEXIONES'));
  const getPaxDip   = r => ni(col(r, 'DIPLOMATICOS'));
  const getPaxEnCom = r => ni(col(r, 'EN COMISION'));
  const getPaxOtros = r => ni(col(r, 'OTROS EXENTOS'));
  const getPaxExent = r => ni(col(r, 'TOTAL EXENTOS'));
  const getKgs      = r => ni(col(r, 'KGS. DE EQUIPAJE'));

  const isArr = r => getDir(r).toLowerCase().includes('llegada');
  const isDep = r => getDir(r).toLowerCase().includes('salida');
  const isDom = r => { const ot = getOpType(r).toLowerCase(); return ot.includes('dom') || (ot.includes('nac') && !ot.includes('int')); };
  const isInt = r => getOpType(r).toLowerCase().includes('int');

  function parseFecha(r) {
    const raw = getFecha(r); if (!raw) return { year: '', monthIdx: -1 };
    const p = raw.split(/[-\/]/);
    if (p.length < 3) return { year: '', monthIdx: -1 };
    const year = p[0].length === 4 ? p[0] : p[2];
    const mon  = parseInt(p[0].length === 4 ? p[1] : p[1], 10);
    return { year, monthIdx: mon - 1 };
  }
  function mesIdxFromName(name) {
    return MONTHS_ES.findIndex(m => m.toLowerCase() === (name || '').toLowerCase().trim());
  }
  function getMonthIdx(r) {
    const mesName = getMes(r);
    let idx = mesName ? mesIdxFromName(mesName) : -1;
    if (idx < 0) idx = parseFecha(r).monthIdx;
    return idx;
  }

  const fmt     = n => (n != null ? Number(n).toLocaleString('es-MX') : '-');
  const pct     = (a, b) => b ? ((a / b) * 100).toFixed(1) + '%' : '-';
  const pctNum  = (a, b) => b ? (a / b) * 100 : 0;
  const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tickK   = v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : v;

  /* Opciones de datalabels para donuts/pies mostrando % */
  function datalabelsPiePct(total) {
    return {
      display: true,
      color: '#fff',
      font: { weight: 'bold', size: 12 },
      formatter: (value) => {
        const p = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return p > 3 ? p + '%' : '';
      }
    };
  }

  /* Datalabels para barras horizontales mostrando % del total */
  function datalabelsBarPct(total) {
    return {
      display: true,
      anchor: 'end',
      align: 'end',
      color: '#495057',
      font: { size: 10 },
      formatter: (value) => {
        const p = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return parseFloat(p) > 0.3 ? p + '%' : '';
      }
    };
  }

  /* ═══════════════════════════════════════════════════════
     ESTADO
  ═══════════════════════════════════════════════════════ */
  let _allData = [], _filtered = [], _tableData = [];
  let _currentPage = 1, _charts = {}, _loaded = false;

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    // Desactivar datalabels globalmente por defecto (sólo activar donde queremos)
    if (window.Chart && window.ChartDataLabels) {
      Chart.unregister(ChartDataLabels);
    }

    document.getElementById('mdb-btn-apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('mdb-btn-clear-filters')?.addEventListener('click', clearFilters);
    document.getElementById('mdb-btn-export')?.addEventListener('click', exportExcel);
    document.getElementById('mdb-btn-reload')?.addEventListener('click', () => {
      _loaded = false; _allData = [];
      const sel = document.getElementById('mdb-filter-airline');
      if (sel) while (sel.options.length > 1) sel.remove(1);
      load();
    });
    let _st;
    document.getElementById('mdb-search-input')?.addEventListener('input', e => {
      clearTimeout(_st); _st = setTimeout(() => filterTable(e.target.value), 250);
    });
    const tabBtn = document.getElementById('aops-tab-manifiestos');
    if (tabBtn) {
      tabBtn.addEventListener('shown.bs.tab', () => { if (!_loaded) load(); });
      tabBtn.addEventListener('click', () => { setTimeout(() => { if (!_loaded) load(); }, 400); });
    }
    document.querySelectorAll('#mdb-sub-tabs button[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', () => { if (_loaded && _filtered.length > 0) renderActiveSubTab(); });
    });
    setTimeout(tryPreload, 1000);
  });

  function tryPreload() {
    if (window.supabaseClient) { load(); return; }
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (window.supabaseClient) { clearInterval(iv); load(); }
      else if (tries >= 15)      { clearInterval(iv); }
    }, 2000);
  }

  /* ═══════════════════════════════════════════════════════
     CARGA
  ═══════════════════════════════════════════════════════ */
  async function load() {
    if (_loaded) { applyFilters(); return; }
    hideBanner();
    showOverlay('Cargando manifiestos...');
    try {
      const client = window.supabaseClient;
      if (!client) throw new Error('Supabase no disponible — inicia sesi\u00f3n primero');
      let all = [], from = 0;
      const BS = 1000;
      let more = true;
      while (more) {
        setOverlayText('Cargando registros (' + all.length.toLocaleString() + ')...');
        const { data, error } = await client.from(TABLE).select('*').range(from, from + BS - 1);
        if (error) throw error;
        if (data && data.length > 0) { all = all.concat(data); from += BS; if (data.length < BS) more = false; }
        else more = false;
        if (all.length > 200000) more = false;
      }
      _allData = all; _loaded = true;
      if (all.length === 0) { showBanner('info', 'La tabla est\u00e1 vac\u00eda o RLS bloquea la lectura.'); hideOverlay(); return; }
      preloadAirlineLogos(all);
      const airlines = [...new Set(all.map(r => getAirline(r)))].sort();
      const sel = document.getElementById('mdb-filter-airline');
      if (sel) {
        while (sel.options.length > 1) sel.remove(1);
        airlines.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
      }
      applyFilters();
    } catch (err) {
      console.error('[ManifiestosBD]', err);
      showBanner('danger', 'Error al cargar: <strong>' + escHtml(err.message || String(err)) + '</strong>');
    } finally { hideOverlay(); }
  }

  /* ═══════════════════════════════════════════════════════
     FILTRADO
  ═══════════════════════════════════════════════════════ */
  function applyFilters() {
    const year    = document.getElementById('mdb-filter-year')?.value    || '';
    const monthN  = document.getElementById('mdb-filter-month')?.value   || '';
    const dir     = document.getElementById('mdb-filter-direction')?.value || '';
    const optype  = document.getElementById('mdb-filter-optype')?.value  || '';
    const airline = document.getElementById('mdb-filter-airline')?.value || '';
    const monthName = monthN ? MONTHS_ES[parseInt(monthN, 10) - 1] : '';

    _filtered = _allData.filter(r => {
      if (year) { const { year: ry } = parseFecha(r); if (String(ry) !== String(year)) return false; }
      if (monthName) {
        const mesCol = getMes(r);
        if (mesCol) { if (!mesCol.toLowerCase().includes(monthName.toLowerCase())) return false; }
        else { if (parseFecha(r).monthIdx !== parseInt(monthN, 10) - 1) return false; }
      }
      if (dir    && !getDir(r).toLowerCase().includes(dir.toLowerCase()))       return false;
      if (optype && !getOpType(r).toLowerCase().includes(optype.toLowerCase())) return false;
      if (airline && getAirline(r) !== airline) return false;
      return true;
    });
    _currentPage = 1;
    renderAll();
  }

  function clearFilters() {
    ['mdb-filter-year','mdb-filter-month','mdb-filter-direction','mdb-filter-optype','mdb-filter-airline']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const s = document.getElementById('mdb-search-input'); if (s) s.value = '';
    applyFilters();
  }

  function filterTable(query) {
    if (!query) { renderTable(_filtered); return; }
    const q = query.toLowerCase();
    const res = _filtered.filter(r =>
      getAirline(r).toLowerCase().includes(q) || getFlight(r).toLowerCase().includes(q) ||
      getDir(r).toLowerCase().includes(q)     || getFecha(r).includes(q) ||
      getOpType(r).toLowerCase().includes(q)  || getRoute(r).toLowerCase().includes(q)
    );
    _currentPage = 1; renderTable(res);
  }

  /* ═══════════════════════════════════════════════════════
     RENDER ALL
  ═══════════════════════════════════════════════════════ */
  function renderAll() {
    renderKPIs();
    renderActiveSubTab();
  }

  function renderActiveSubTab() {
    const active = document.querySelector('#mdb-sub-tabs button.active');
    const target = active ? active.dataset.bsTarget : '#mdb-sub-resumen';
    switch (target) {
      case '#mdb-sub-resumen':    renderTabResumen();    break;
      case '#mdb-sub-pasajeros':  renderTabPasajeros();  break;
      case '#mdb-sub-aerolineas': renderTabAerolineas(); break;
      case '#mdb-sub-rutas':      renderTabRutas();      break;
      case '#mdb-sub-equipaje':   renderTabEquipaje();   break;
      case '#mdb-sub-datos':      renderTabDatos();      break;
      default:                    renderTabResumen();
    }
  }

  /* ═══════════════════════════════════════════════════════
     KPIs
  ═══════════════════════════════════════════════════════ */
  function renderKPIs() {
    const d = _filtered, total = d.length;
    const totalPax = d.reduce((s, r) => s + getPaxTotal(r), 0);
    const allPax   = _allData.reduce((s, r) => s + getPaxTotal(r), 0);
    const avgPax   = total ? Math.round(totalPax / total) : 0;
    const arrRows  = d.filter(isArr), depRows = d.filter(isDep);
    const arrPax   = arrRows.reduce((s, r) => s + getPaxTotal(r), 0);
    const depPax   = depRows.reduce((s, r) => s + getPaxTotal(r), 0);
    const domPax   = d.filter(isDom).reduce((s, r) => s + getPaxTotal(r), 0);
    const intPax   = d.filter(isInt).reduce((s, r) => s + getPaxTotal(r), 0);
    const aMap = {};
    d.forEach(r => { const a = getAirline(r); aMap[a] = (aMap[a] || 0) + getPaxTotal(r); });
    const top = Object.entries(aMap).sort((a, b) => b[1] - a[1])[0];
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('mdb-kpi-total',          fmt(total));
    set('mdb-kpi-total-sub',      total === _allData.length ? 'registros en base de datos' : 'registros filtrados');
    set('mdb-kpi-pax',            fmt(totalPax));
    set('mdb-kpi-pax-sub',        pct(totalPax, allPax) + ' del total');
    set('mdb-kpi-avg-pax',        fmt(avgPax));
    set('mdb-kpi-top-airline',    top ? top[0] : '-');
    set('mdb-kpi-top-airline-pax',top ? fmt(top[1]) + ' pax (' + pct(top[1], totalPax) + ')' : '-');
    set('mdb-kpi-arr-pax',        fmt(arrPax));
    set('mdb-kpi-arr-count',      fmt(arrRows.length) + ' vuelos (' + pct(arrPax, totalPax) + ')');
    set('mdb-kpi-dep-pax',        fmt(depPax));
    set('mdb-kpi-dep-count',      fmt(depRows.length) + ' vuelos (' + pct(depPax, totalPax) + ')');
    set('mdb-kpi-dom-pax',        fmt(domPax));
    set('mdb-kpi-dom-pct',        pct(domPax, totalPax) + ' del total');
    set('mdb-kpi-int-pax',        fmt(intPax));
    set('mdb-kpi-int-pct',        pct(intPax, totalPax) + ' del total');
    set('mdb-record-count',       fmt(total) + ' reg.');
    // Logo aerolínea líder
    if (top) {
      const el = document.getElementById('mdb-kpi-top-airline');
      if (el) el.innerHTML = airlineLogoHTML(top[0], 20) + escHtml(top[0]);
    }
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: RESUMEN
  ═══════════════════════════════════════════════════════ */
  function renderTabResumen() {
    renderChartMonthly();
    renderChartDirDonut();
    renderChartAirlinePax();
    renderChartOptypeDonut();
  }

  function renderChartMonthly() {
    const ctx = document.getElementById('mdb-chart-monthly-pax'); if (!ctx) return;
    if (_charts.monthly) _charts.monthly.destroy();
    const arrM = new Array(12).fill(0), depM = new Array(12).fill(0);
    _filtered.forEach(r => {
      const idx = getMonthIdx(r); if (idx < 0 || idx > 11) return;
      const pax = getPaxTotal(r);
      if (isArr(r)) arrM[idx] += pax; else depM[idx] += pax;
    });
    const totals = arrM.map((v, i) => v + depM[i]);
    const grandTotal = totals.reduce((s, v) => s + v, 0);
    _charts.monthly = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: MONTHS_ES, datasets: [
        { label: 'Llegadas', data: arrM, backgroundColor: 'rgba(214,51,132,0.78)', stack: 'S', borderRadius: { topLeft:0, topRight:0, bottomLeft:4, bottomRight:4 } },
        { label: 'Salidas',  data: depM, backgroundColor: 'rgba(102,16,242,0.78)', stack: 'S', borderRadius: { topLeft:4, topRight:4, bottomLeft:0, bottomRight:0 } }
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: false },
          tooltip: { callbacks: {
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) + ' (' + pct(c.raw, totals[c.dataIndex]) + ' del mes)',
            footer: items => 'Total: ' + fmt(items.reduce((s, i) => s + i.raw, 0)) + ' (' + pct(items.reduce((s, i) => s + i.raw, 0), grandTotal) + ' anual)'
          }}
        },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartDirDonut() {
    const ctx = document.getElementById('mdb-chart-dir-donut'); if (!ctx) return;
    if (_charts.dirDonut) _charts.dirDonut.destroy();
    const arrPax = _filtered.filter(isArr).reduce((s, r) => s + getPaxTotal(r), 0);
    const depPax = _filtered.filter(isDep).reduce((s, r) => s + getPaxTotal(r), 0);
    const total  = arrPax + depPax;
    _charts.dirDonut = new Chart(ctx, {
      type: 'doughnut',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Llegadas','Salidas'], datasets: [{ data: [arrPax, depPax], backgroundColor: ['#d63384','#6610f2'], borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: datalabelsPiePct(total),
          tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmt(c.raw) + ' pax (' + pct(c.raw, total) + ')' } }
        }
      }
    });
  }

  function renderChartAirlinePax() {
    const ctx = document.getElementById('mdb-chart-airline-pax'); if (!ctx) return;
    if (_charts.airlinePax) _charts.airlinePax.destroy();
    const map = {};
    _filtered.forEach(r => { const a = getAirline(r); map[a] = (map[a] || 0) + getPaxTotal(r); });
    const sorted = Object.entries(map).filter(([,p]) => p > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const totalPax = _filtered.reduce((s, r) => s + getPaxTotal(r), 0);
    // Preload logos
    sorted.forEach(([n]) => { const iata = getIATA(n); if (iata) preloadLogo(iata); });
    _charts.airlinePax = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Pasajeros', data: sorted.map(([,p]) => p), backgroundColor: PAL_12.concat(PAL_12).slice(0, sorted.length), borderRadius: 4, borderSkipped: false }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { left: sorted.some(([n]) => getIATA(n)) ? 32 : 4, right: 60 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10, weight: '600' },
            formatter: (v) => fmt(v) + ' (' + pct(v, totalPax) + ')' },
          tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' pax (' + pct(c.raw, totalPax) + ')' } },
          airlineLogos: { enabled: true, size: 22, gap: 6 }
        },
        scales: { x: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartOptypeDonut() {
    const ctx = document.getElementById('mdb-chart-optype-donut'); if (!ctx) return;
    if (_charts.optypeDonut) _charts.optypeDonut.destroy();
    const map = {};
    _filtered.forEach(r => { const ot = getOpType(r) || 'No especificado'; map[ot] = (map[ot] || 0) + getPaxTotal(r); });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [,v]) => s + v, 0);
    _charts.optypeDonut = new Chart(ctx, {
      type: 'doughnut',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: entries.map(([k]) => k), datasets: [{ data: entries.map(([,v]) => v), backgroundColor: PAL_7.slice(0, entries.length), borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 } } },
          datalabels: datalabelsPiePct(total),
          tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmt(c.raw) + ' pax (' + pct(c.raw, total) + ')' } }
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: PASAJEROS
  ═══════════════════════════════════════════════════════ */
  function renderTabPasajeros() {
    const d = _filtered;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const totalPax = d.reduce((s, r) => s + getPaxTotal(r), 0);
    const tua   = d.reduce((s, r) => s + getPaxTUA(r),   0);
    const inf   = d.reduce((s, r) => s + getPaxInf(r),   0);
    const trans = d.reduce((s, r) => s + getPaxTrans(r), 0);
    const conex = d.reduce((s, r) => s + getPaxConex(r), 0);
    const dip   = d.reduce((s, r) => s + getPaxDip(r),   0);
    const exent = d.reduce((s, r) => s + getPaxExent(r), 0);
    set('pax-kpi-tua',   fmt(tua)   + ' (' + pct(tua, totalPax) + ')');
    set('pax-kpi-inf',   fmt(inf)   + ' (' + pct(inf, totalPax) + ')');
    set('pax-kpi-trans', fmt(trans) + ' (' + pct(trans, totalPax) + ')');
    set('pax-kpi-conex', fmt(conex) + ' (' + pct(conex, totalPax) + ')');
    set('pax-kpi-dip',   fmt(dip)   + ' (' + pct(dip, totalPax) + ')');
    set('pax-kpi-exent', fmt(exent) + ' (' + pct(exent, totalPax) + ')');
    renderChartPaxBreakdown();
    renderChartTuaExentDonut();
    renderChartTuaMonthly();
    renderChartInfTransMonthly();
  }

  function renderChartPaxBreakdown() {
    const ctx = document.getElementById('mdb-chart-pax-breakdown'); if (!ctx) return;
    if (_charts.paxBreak) _charts.paxBreak.destroy();
    const cats = {
      'Pagan TUA':     _filtered.reduce((s, r) => s + getPaxTUA(r),   0),
      'Infantes':      _filtered.reduce((s, r) => s + getPaxInf(r),   0),
      'Tr\u00e1nsitos':     _filtered.reduce((s, r) => s + getPaxTrans(r), 0),
      'Conexiones':    _filtered.reduce((s, r) => s + getPaxConex(r), 0),
      'Diplom\u00e1ticos':  _filtered.reduce((s, r) => s + getPaxDip(r),   0),
      'En Comisi\u00f3n':   _filtered.reduce((s, r) => s + getPaxEnCom(r), 0),
      'Otros Exentos': _filtered.reduce((s, r) => s + getPaxOtros(r), 0),
    };
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    _charts.paxBreak = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: Object.keys(cats), datasets: [{ label: 'Pasajeros', data: Object.values(cats), backgroundColor: PAL_7, borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'top', color: '#495057', font: { size: 10, weight: '600' },
            formatter: (v) => fmt(v) + '\n' + pct(v, total) },
          tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' pax (' + pct(c.raw, total) + ')' } }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartTuaExentDonut() {
    const ctx = document.getElementById('mdb-chart-tua-exent-donut'); if (!ctx) return;
    if (_charts.tuaExent) _charts.tuaExent.destroy();
    const vals = [
      _filtered.reduce((s, r) => s + getPaxTUA(r),   0),
      _filtered.reduce((s, r) => s + getPaxInf(r),   0),
      _filtered.reduce((s, r) => s + getPaxTrans(r), 0),
      _filtered.reduce((s, r) => s + getPaxConex(r), 0),
      _filtered.reduce((s, r) => s + getPaxDip(r),   0),
      _filtered.reduce((s, r) => s + getPaxEnCom(r), 0),
      _filtered.reduce((s, r) => s + getPaxOtros(r), 0),
    ];
    const total = vals.reduce((s, v) => s + v, 0);
    _charts.tuaExent = new Chart(ctx, {
      type: 'doughnut',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: {
        labels: ['Pagan TUA','Infantes','Tr\u00e1nsitos','Conexiones','Diplom\u00e1ticos','En Comisi\u00f3n','Otros Exentos'],
        datasets: [{ data: vals, backgroundColor: PAL_7, borderWidth: 2, hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          datalabels: datalabelsPiePct(total),
          tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmt(c.raw) + ' (' + pct(c.raw, total) + ')' } }
        }
      }
    });
  }

  function renderChartTuaMonthly() {
    const ctx = document.getElementById('mdb-chart-tua-monthly'); if (!ctx) return;
    if (_charts.tuaMonthly) _charts.tuaMonthly.destroy();
    const tuaM = new Array(12).fill(0), exentM = new Array(12).fill(0);
    _filtered.forEach(r => {
      const idx = getMonthIdx(r); if (idx < 0 || idx > 11) return;
      tuaM[idx]   += getPaxTUA(r);
      exentM[idx] += getPaxExent(r);
    });
    const combM = tuaM.map((v, i) => v + exentM[i]);
    _charts.tuaMonthly = new Chart(ctx, {
      type: 'line',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: MONTHS_ES, datasets: [
        { label: 'Pagan TUA',    data: tuaM,   borderColor: '#0d6efd', backgroundColor: 'rgba(13,110,253,0.12)', fill: true, tension: 0.3, pointRadius: 4 },
        { label: 'Total Exentos',data: exentM, borderColor: '#fd7e14', backgroundColor: 'rgba(253,126,20,0.12)',  fill: true, tension: 0.3, pointRadius: 4 }
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: false },
          tooltip: { callbacks: {
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw),
            footer: items => {
              const total = combM[items[0].dataIndex];
              return items.map(i => pct(i.raw, total) + ' del mes — ' + i.dataset.label).join('\n');
            }
          }}
        },
        scales: { y: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartInfTransMonthly() {
    const ctx = document.getElementById('mdb-chart-inf-trans-monthly'); if (!ctx) return;
    if (_charts.infTrans) _charts.infTrans.destroy();
    const infM = new Array(12).fill(0), tranM = new Array(12).fill(0), cnxM = new Array(12).fill(0);
    _filtered.forEach(r => {
      const idx = getMonthIdx(r); if (idx < 0 || idx > 11) return;
      infM[idx]  += getPaxInf(r);
      tranM[idx] += getPaxTrans(r);
      cnxM[idx]  += getPaxConex(r);
    });
    const totM = infM.map((v, i) => v + tranM[i] + cnxM[i]);
    _charts.infTrans = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: MONTHS_ES, datasets: [
        { label: 'Infantes',   data: infM,  backgroundColor: 'rgba(253,126,20,0.78)',  stack: 'S' },
        { label: 'Tr\u00e1nsitos',  data: tranM, backgroundColor: 'rgba(32,201,151,0.78)',  stack: 'S' },
        { label: 'Conexiones', data: cnxM,  backgroundColor: 'rgba(13,202,240,0.78)', stack: 'S' }
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: false },
          tooltip: { callbacks: {
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) + ' (' + pct(c.raw, totM[c.dataIndex]) + ')',
            footer: items => 'Total: ' + fmt(totM[items[0].dataIndex])
          }}
        },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: AEROLÍNEAS
  ═══════════════════════════════════════════════════════ */
  function renderTabAerolineas() {
    renderAirlineRanking();
    renderChartAirlineDomInt();
    renderChartAirlineTrend();
  }

  function renderAirlineRanking() {
    const tbody = document.getElementById('mdb-tbody-airline-ranking'); if (!tbody) return;
    const map = {};
    _filtered.forEach(r => {
      const a = getAirline(r);
      if (!map[a]) map[a] = { flights: 0, pax: 0, arrPax: 0, depPax: 0 };
      map[a].flights++; const p = getPaxTotal(r); map[a].pax += p;
      if (isArr(r)) map[a].arrPax += p; else map[a].depPax += p;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].pax - a[1].pax);
    const totalPax = sorted.reduce((s, [,v]) => s + v.pax, 0);
    const medals = ['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];
    const badge = document.getElementById('mdb-airline-count-badge');
    if (badge) badge.textContent = sorted.length + ' aerol\u00edneas';
    tbody.innerHTML = sorted.length
      ? sorted.map(([name, v], i) => {
          const logo = airlineLogoHTML(name, 24);
          const pctVal = pct(v.pax, totalPax);
          const barW = totalPax ? Math.max(2, Math.round((v.pax / totalPax) * 100)) : 0;
          return '<tr>' +
          '<td class="text-center fw-bold">' + (medals[i] || (i+1)) + '</td>' +
          '<td><div class="d-flex align-items-center gap-2">' + logo + '<span class="fw-semibold">' + escHtml(name) + '</span></div></td>' +
          '<td class="text-end">' + fmt(v.flights) + '</td>' +
          '<td class="text-end fw-bold">' + fmt(v.pax) + '</td>' +
          '<td class="text-end text-muted">' + (v.flights ? fmt(Math.round(v.pax/v.flights)) : '-') + '</td>' +
          '<td class="text-end">' + fmt(v.arrPax) + ' <small class="text-muted">(' + pct(v.arrPax, v.pax) + ')</small></td>' +
          '<td class="text-end">' + fmt(v.depPax) + ' <small class="text-muted">(' + pct(v.depPax, v.pax) + ')</small></td>' +
          '<td><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height:8px;min-width:60px;"><div class="progress-bar bg-primary" style="width:' + barW + '%"></div></div><span class="small fw-semibold text-primary">' + pctVal + '</span></div></td>' +
          '</tr>';
        }).join('') +
        '<tr class="table-light fw-bold border-top"><td colspan="3" class="text-end">TOTAL</td><td class="text-end">' + fmt(totalPax) + '</td><td colspan="4"></td></tr>'
      : '<tr><td colspan="8" class="text-center text-muted py-3">Sin datos</td></tr>';
  }

  function renderChartAirlineDomInt() {
    const ctx = document.getElementById('mdb-chart-airline-domint'); if (!ctx) return;
    if (_charts.airlineDomInt) _charts.airlineDomInt.destroy();
    const map = {};
    _filtered.forEach(r => {
      const a = getAirline(r);
      if (!map[a]) map[a] = { dom: 0, int: 0 };
      const p = getPaxTotal(r);
      if (isDom(r)) map[a].dom += p; else if (isInt(r)) map[a].int += p;
    });
    const sorted = Object.entries(map)
      .map(([n, v]) => ({ n, total: v.dom + v.int, dom: v.dom, int: v.int }))
      .filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 15);
    const grandTotal = sorted.reduce((s, x) => s + x.total, 0);
    sorted.forEach(x => { const iata = getIATA(x.n); if (iata) preloadLogo(iata); });
    _charts.airlineDomInt = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: sorted.map(x => x.n), datasets: [
        { label: 'Dom\u00e9stica',     data: sorted.map(x => x.dom), backgroundColor: 'rgba(253,126,20,0.82)',  stack: 'S', borderRadius: 4 },
        { label: 'Internacional', data: sorted.map(x => x.int), backgroundColor: 'rgba(32,201,151,0.82)', stack: 'S', borderRadius: 4 }
      ]},
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { left: sorted.some(x => getIATA(x.n)) ? 32 : 4, right: 50 } },
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: true, color: '#fff', font: { size: 10, weight: 'bold' },
            formatter: (v, ctx2) => {
              const tot = sorted[ctx2.dataIndex].total;
              if (!tot || v < (tot * 0.05)) return '';
              return pct(v, tot);
            }
          },
          tooltip: { callbacks: {
            label: c => {
              const tot = sorted[c.dataIndex].total;
              return ' ' + c.dataset.label + ': ' + fmt(c.raw) + ' (' + pct(c.raw, tot) + ' del total aerol\u00ednea)';
            },
            footer: items => 'Total aerol\u00ednea: ' + fmt(sorted[items[0].dataIndex].total) + ' (' + pct(sorted[items[0].dataIndex].total, grandTotal) + ' global)'
          }},
          airlineLogos: { enabled: true, size: 20, gap: 6 }
        },
        scales: { x: { stacked: true, beginAtZero: true, ticks: { callback: tickK } }, y: { stacked: true } }
      }
    });
  }

  function renderChartAirlineTrend() {
    const ctx = document.getElementById('mdb-chart-airline-trend'); if (!ctx) return;
    if (_charts.airlineTrend) _charts.airlineTrend.destroy();
    const totals = {};
    _filtered.forEach(r => { const a = getAirline(r); totals[a] = (totals[a] || 0) + getPaxTotal(r); });
    const top5 = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,5).map(([n]) => n);
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    const byAirline = {};
    top5.forEach(a => { byAirline[a] = new Array(12).fill(0); });
    _filtered.forEach(r => {
      const a = getAirline(r); if (!byAirline[a]) return;
      const idx = getMonthIdx(r); if (idx < 0 || idx > 11) return;
      byAirline[a][idx] += getPaxTotal(r);
    });
    const TREND_COLORS = ['#0d6efd','#198754','#dc3545','#fd7e14','#6610f2'];
    _charts.airlineTrend = new Chart(ctx, {
      type: 'line',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: MONTHS_ES, datasets: top5.map((a, i) => ({
        label: a + ' (' + pct(totals[a], grandTotal) + ')',
        data: byAirline[a],
        borderColor: TREND_COLORS[i], backgroundColor: TREND_COLORS[i] + '22',
        fill: false, tension: 0.3, pointRadius: 4
      }))},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } },
          datalabels: { display: false },
          tooltip: { callbacks: {
            label: c => {
              const a = top5[c.datasetIndex];
              return ' ' + a + ': ' + fmt(c.raw) + ' (' + pct(c.raw, totals[a]) + ' del total ' + a + ')';
            }
          }}
        },
        scales: { y: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: RUTAS
  ═══════════════════════════════════════════════════════ */
  function renderTabRutas() {
    renderChartRoutes();
    renderChartRouteOptype();
    renderTableRutas();
  }

  function renderChartRoutes() {
    const ctx = document.getElementById('mdb-chart-routes'); if (!ctx) return;
    if (_charts.routes) _charts.routes.destroy();
    const map = {};
    _filtered.forEach(r => { const route = getRoute(r); if (!route) return; map[route] = (map[route] || 0) + getPaxTotal(r); });
    const sorted = Object.entries(map).filter(([,p]) => p > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const totalPax = sorted.reduce((s, [,p]) => s + p, 0);
    _charts.routes = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Pasajeros', data: sorted.map(([,p]) => p), backgroundColor: PAL_12.concat(PAL_12).slice(0, sorted.length), borderRadius: 4, borderSkipped: false }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 75 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10, weight: '600' },
            formatter: (v) => fmt(v) + ' (' + pct(v, totalPax) + ')' },
          tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' pax (' + pct(c.raw, totalPax) + ')' } }
        },
        scales: { x: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartRouteOptype() {
    const ctx = document.getElementById('mdb-chart-route-optype'); if (!ctx) return;
    if (_charts.routeOptype) _charts.routeOptype.destroy();
    const dom = _filtered.filter(isDom).reduce((s, r) => s + getPaxTotal(r), 0);
    const int = _filtered.filter(isInt).reduce((s, r) => s + getPaxTotal(r), 0);
    const total = dom + int;
    _charts.routeOptype = new Chart(ctx, {
      type: 'pie',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Dom\u00e9stica','Internacional'], datasets: [{ data: [dom, int], backgroundColor: ['#fd7e14','#20c997'], borderWidth: 2, hoverOffset: 10 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: datalabelsPiePct(total),
          tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' pax (' + pct(c.raw, total) + ')' } }
        }
      }
    });
  }

  function renderTableRutas() {
    const tbody = document.getElementById('mdb-tbody-rutas'); if (!tbody) return;
    const map = {};
    _filtered.forEach(r => {
      const route = getRoute(r); if (!route) return;
      if (!map[route]) map[route] = { flights: 0, pax: 0, dom: 0, int: 0 };
      map[route].flights++;
      const p = getPaxTotal(r); map[route].pax += p;
      if (isDom(r)) map[route].dom += p; else if (isInt(r)) map[route].int += p;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1].pax - a[1].pax);
    const totalPax = sorted.reduce((s, [,v]) => s + v.pax, 0);
    tbody.innerHTML = sorted.length
      ? sorted.map(([name, v], i) => {
          const barW = totalPax ? Math.max(2, Math.round((v.pax / totalPax) * 100)) : 0;
          return '<tr>' +
          '<td>' + (i+1) + '</td>' +
          '<td class="fw-semibold">' + escHtml(name) + '</td>' +
          '<td class="text-end">' + fmt(v.flights) + '</td>' +
          '<td class="text-end fw-bold">' + fmt(v.pax) + '</td>' +
          '<td class="text-end text-muted">' + (v.flights ? fmt(Math.round(v.pax/v.flights)) : '-') + '</td>' +
          '<td class="text-end">' + fmt(v.dom) + ' <small class="text-muted">(' + pct(v.dom, v.pax) + ')</small></td>' +
          '<td class="text-end">' + fmt(v.int) + ' <small class="text-muted">(' + pct(v.int, v.pax) + ')</small></td>' +
          '<td><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" style="height:8px;min-width:50px;"><div class="progress-bar bg-danger" style="width:' + barW + '%"></div></div><span class="small fw-semibold text-danger">' + pct(v.pax, totalPax) + '</span></div></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="8" class="text-center text-muted py-3">Sin datos</td></tr>';
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: EQUIPAJE
  ═══════════════════════════════════════════════════════ */
  function renderTabEquipaje() {
    const d = _filtered;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const totalKgs = d.reduce((s, r) => s + getKgs(r), 0);
    const total    = d.length;
    const arrKgs   = d.filter(isArr).reduce((s, r) => s + getKgs(r), 0);
    const depKgs   = d.filter(isDep).reduce((s, r) => s + getKgs(r), 0);
    set('kgs-kpi-total', fmt(totalKgs) + ' Kgs');
    set('kgs-kpi-avg',   fmt(total ? Math.round(totalKgs / total) : 0) + ' Kgs/vuelo');
    set('kgs-kpi-arr',   fmt(arrKgs) + ' Kgs (' + pct(arrKgs, totalKgs) + ')');
    set('kgs-kpi-dep',   fmt(depKgs) + ' Kgs (' + pct(depKgs, totalKgs) + ')');
    renderChartKgsMonthly();
    renderChartKgsDirDonut();
    renderChartKgsAirline();
  }

  function renderChartKgsMonthly() {
    const ctx = document.getElementById('mdb-chart-kgs-monthly'); if (!ctx) return;
    if (_charts.kgsMonthly) _charts.kgsMonthly.destroy();
    const arrM = new Array(12).fill(0), depM = new Array(12).fill(0);
    _filtered.forEach(r => {
      const idx = getMonthIdx(r); if (idx < 0 || idx > 11) return;
      const k = getKgs(r);
      if (isArr(r)) arrM[idx] += k; else depM[idx] += k;
    });
    const totM = arrM.map((v, i) => v + depM[i]);
    const grandTotal = totM.reduce((s, v) => s + v, 0);
    _charts.kgsMonthly = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: MONTHS_ES, datasets: [
        { label: 'Llegadas', data: arrM, backgroundColor: 'rgba(214,51,132,0.78)', stack: 'S' },
        { label: 'Salidas',  data: depM, backgroundColor: 'rgba(102,16,242,0.78)', stack: 'S' }
      ]},
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: false },
          tooltip: { callbacks: {
            label: c => ' ' + c.dataset.label + ': ' + fmt(c.raw) + ' Kgs (' + pct(c.raw, totM[c.dataIndex]) + ')',
            footer: items => 'Total: ' + fmt(totM[items[0].dataIndex]) + ' Kgs (' + pct(totM[items[0].dataIndex], grandTotal) + ' anual)'
          }}
        },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  function renderChartKgsDirDonut() {
    const ctx = document.getElementById('mdb-chart-kgs-dir-donut'); if (!ctx) return;
    if (_charts.kgsDirDonut) _charts.kgsDirDonut.destroy();
    const arrKgs = _filtered.filter(isArr).reduce((s, r) => s + getKgs(r), 0);
    const depKgs = _filtered.filter(isDep).reduce((s, r) => s + getKgs(r), 0);
    const total  = arrKgs + depKgs;
    _charts.kgsDirDonut = new Chart(ctx, {
      type: 'doughnut',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: ['Llegadas','Salidas'], datasets: [{ data: [arrKgs, depKgs], backgroundColor: ['#d63384','#6610f2'], borderWidth: 2, hoverOffset: 8 }] },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: datalabelsPiePct(total),
          tooltip: { callbacks: { label: c => ' ' + c.label + ': ' + fmt(c.raw) + ' Kgs (' + pct(c.raw, total) + ')' } }
        }
      }
    });
  }

  function renderChartKgsAirline() {
    const ctx = document.getElementById('mdb-chart-kgs-airline'); if (!ctx) return;
    if (_charts.kgsAirline) _charts.kgsAirline.destroy();
    const map = {};
    _filtered.forEach(r => { const a = getAirline(r); map[a] = (map[a] || 0) + getKgs(r); });
    const sorted = Object.entries(map).filter(([,k]) => k > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const totalKgs = sorted.reduce((s, [,k]) => s + k, 0);
    sorted.forEach(([n]) => { const iata = getIATA(n); if (iata) preloadLogo(iata); });
    _charts.kgsAirline = new Chart(ctx, {
      type: 'bar',
      plugins: window.ChartDataLabels ? [ChartDataLabels] : [],
      data: { labels: sorted.map(([n]) => n), datasets: [{ label: 'Kgs Equipaje', data: sorted.map(([,k]) => k), backgroundColor: PAL_12.concat(PAL_12).slice(0, sorted.length), borderRadius: 4, borderSkipped: false }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { left: sorted.some(([n]) => getIATA(n)) ? 32 : 4, right: 75 } },
        plugins: {
          legend: { display: false },
          datalabels: { display: true, anchor: 'end', align: 'end', color: '#495057', font: { size: 10, weight: '600' },
            formatter: (v) => fmt(v) + ' Kgs (' + pct(v, totalKgs) + ')' },
          tooltip: { callbacks: { label: c => ' ' + fmt(c.raw) + ' Kgs (' + pct(c.raw, totalKgs) + ')' } },
          airlineLogos: { enabled: true, size: 20, gap: 6 }
        },
        scales: { x: { beginAtZero: true, ticks: { callback: tickK } } }
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SUB-PESTAÑA: DATOS
  ═══════════════════════════════════════════════════════ */
  function renderTabDatos() { renderTable(_filtered); }

  const DISPLAY_COLS = [
    { label:'Mes',             key:'MES' },
    { label:'Fecha',           key:'FECHA' },
    { label:'Tipo Manifiesto', key:'TIPO DE MANIFIESTO' },
    { label:'Aerol\u00ednea', key:'AEROLINEA', logo: true },
    { label:'Tipo Op.',        key:'TIPO DE OPERACION', altKey:'TIPO DE OPERACI\u00d3N' },
    { label:'Equipo',          key:'EQUIPO' },
    { label:'Matr\u00edcula', key:'MATRICULA', altKey:'MAT\u00cdCULA' },
    { label:'# Vuelo',         key:'# DE VUELO' },
    { label:'Dest./Origen',    key:'DESTINO / ORIGEN' },
    { label:'Total Pax',       key:'TOTAL PAX',          num: true },
    { label:'TUA',             key:'PAX. QUE PAGAN TUA', num: true },
    { label:'Infantes',        key:'INFANTES',            num: true },
    { label:'Tr\u00e1nsitos', key:'TRANSITOS',           num: true },
    { label:'Conexiones',      key:'CONEXIONES',          num: true },
    { label:'Diplom\u00e1ticos', key:'DIPLOMATICOS',      num: true },
    { label:'En Comisi\u00f3n', key:'EN COMISION',        num: true },
    { label:'Total Exentos',   key:'TOTAL EXENTOS',       num: true },
    { label:'Kgs. Equipaje',   key:'KGS. DE EQUIPAJE',    num: true },
  ];

  function renderTable(data) { _tableData = data || _filtered; _currentPage = 1; drawPage(); }

  function drawPage() {
    const thead = document.getElementById('mdb-main-thead');
    const tbody = document.getElementById('mdb-main-tbody');
    const info  = document.getElementById('mdb-table-info');
    const pgDiv = document.getElementById('mdb-pagination');
    if (!thead || !tbody) return;
    if (!_tableData.length) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="18" class="text-center py-4 text-muted">No hay registros para los filtros seleccionados.</td></tr>';
      if (info) info.textContent = '0 registros'; if (pgDiv) pgDiv.innerHTML = ''; return;
    }
    const first = _tableData[0];
    const active = DISPLAY_COLS.filter(c => first[c.key] !== undefined || (c.altKey && first[c.altKey] !== undefined));
    thead.innerHTML = '<tr>' + active.map(c => '<th class="text-nowrap small">' + c.label + '</th>').join('') + '</tr>';
    const total = _tableData.length, pages = Math.ceil(total / PAGE_SIZE);
    const start = (_currentPage - 1) * PAGE_SIZE;
    const slice = _tableData.slice(start, start + PAGE_SIZE);
    tbody.innerHTML = slice.map(r => '<tr>' + active.map(c => {
      const v = r[c.key] !== undefined ? r[c.key] : (c.altKey ? r[c.altKey] : undefined);
      const d = v !== undefined && v !== null ? String(v) : '';
      if (c.logo && d) {
        return '<td class="small"><div class="d-flex align-items-center">' + airlineLogoHTML(d, 18) + escHtml(d) + '</div></td>';
      }
      return c.num
        ? '<td class="text-end small">' + (d !== '' ? fmt(parseInt(d, 10) || 0) : '-') + '</td>'
        : '<td class="small">' + escHtml(d) + '</td>';
    }).join('') + '</tr>').join('');
    if (info) info.textContent = 'Mostrando ' + (start+1) + '-' + Math.min(start+PAGE_SIZE, total) + ' de ' + fmt(total) + ' registros';
    if (pgDiv) {
      const range = buildPagRange(_currentPage, pages);
      pgDiv.innerHTML = range.map(p => {
        if (p === '...') return '<span class="px-1 text-muted">...</span>';
        return '<button class="btn btn-sm ' + (p === _currentPage ? 'btn-primary' : 'btn-outline-secondary') + '" data-pg="' + p + '">' + p + '</button>';
      }).join('');
      pgDiv.querySelectorAll('button[data-pg]').forEach(btn => {
        btn.addEventListener('click', () => { _currentPage = parseInt(btn.dataset.pg, 10); drawPage(); });
      });
    }
  }

  function buildPagRange(cur, tot) {
    if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);
    const r = [1];
    if (cur > 3) r.push('...');
    for (let p = Math.max(2, cur-1); p <= Math.min(tot-1, cur+1); p++) r.push(p);
    if (cur < tot-2) r.push('...');
    r.push(tot); return r;
  }

  function exportExcel() {
    if (!window.XLSX) { alert('Librer\u00eda XLSX no disponible.'); return; }
    const ws = XLSX.utils.json_to_sheet(_filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manifiestos2025');
    XLSX.writeFile(wb, 'manifiestos_2025_export.xlsx');
  }

  function showOverlay(msg)    { const ov = document.getElementById('mdb-overlay'); if (ov) { ov.style.display='flex'; ov.classList.remove('d-none'); } setOverlayText(msg); }
  function setOverlayText(m)  { const t  = document.getElementById('mdb-overlay-text'); if (t) t.textContent = m; }
  function hideOverlay()       { const ov = document.getElementById('mdb-overlay'); if (ov) { ov.style.display='none'; ov.classList.add('d-none'); } }
  function showBanner(type, html) {
    let b = document.getElementById('mdb-banner');
    if (!b) {
      b = document.createElement('div'); b.id = 'mdb-banner'; b.style.cssText = 'margin:12px 16px 0;';
      const pane = document.getElementById('aops-pane-manifiestos');
      if (pane) pane.insertBefore(b, pane.firstChild);
    }
    b.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show mb-0" role="alert">' + html + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
  }
  function hideBanner() { const b = document.getElementById('mdb-banner'); if (b) b.innerHTML = ''; }

})();
