// Fauna module: renders a full table from data/fauna.json, adds filters by date range and month, and charts
(function(){
  const state = {
    raw: [],
    filtered: [],
    columns: [],
    charts: { byMonth: null, bySpecies: null, byHour: null, byWeather: null, heatmap: null },
    paging: { page: 1, perPage: 50, totalPages: 1 }
  };

  const monthNames = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const monthNamesEs = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  function monthKeyToAbbr(ym){
    // ym = 'YYYY-MM'
    if (!ym || typeof ym !== 'string') return ym;
    const m = ym.split('-')[1];
    const idx = Math.max(0, Math.min(11, (parseInt(m,10)||1)-1));
    return monthNamesEs[idx];
  }
  function normalizeEs(str){
    return String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function parseDMY(str){
    // Expected DD/MM/YYYY
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d));
    return isNaN(dt.getTime()) ? null : dt;
  }

  function loadFauna(){
    try {
      if (location.protocol === 'file:') {
        console.warn('fauna: saltando carga por file:// (CORS).');
        return Promise.resolve([]);
      }
    } catch(_) {}
    return fetch('data/fauna.json').then(r => r.json()).catch(()=>[]);
  }

  // Normalizar claves de fauna.json con guiones bajos y variaciones a formato de UI
  function normalizeFaunaRow(row){
    const map = Object.create(null);
    // Mapeos específicos conocidos
    const special = {
      'Fase_de_la_operación': 'Fase de la operación',
      'Condiciones_meteorológicas': 'Condiciones meteorológicas',
      'Zona_de_impacto': 'Zona de impacto',
      'Personal_que_reporta': 'Personal que reporta',
      'Medidas_proactivas': 'Medidas proactivas',
      'Resultados_de_las_medidas': 'Resultados de las medidas',
      'Aerolineas': 'Aerolínea',
      'Matricula': 'Matrícula'
    };
    for (const [k, v] of Object.entries(row || {})){
      let nk = special[k];
      if (!nk){
        // Reemplazar guiones bajos por espacios y capitalizar acentos comunes si aplica
        nk = k.replace(/_/g, ' ');
      }
      map[nk] = v;
    }
    return map;
  }

  function buildColumns(rows){
    // Union of keys, preserving first appearance order
    const set = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => set.add(k)));
    return Array.from(set);
  }

  function uniqueSorted(arr){
    return Array.from(new Set(arr.filter(Boolean).map(s => String(s).trim()))).sort((a,b)=>a.localeCompare(b));
  }

  function updateBadges(){
    const total = state.filtered.length;
    const b1 = document.getElementById('fauna-total-badge'); if (b1) b1.textContent = `Total: ${total.toLocaleString('es-MX')}`;
    const from = document.getElementById('fauna-date-from')?.value || '';
    const to = document.getElementById('fauna-date-to')?.value || '';
    const month = document.getElementById('fauna-month')?.value || 'all';
    const period = month !== 'all' ? `Mes ${monthNamesEs[Math.max(0, Math.min(11, (parseInt(month,10)||1)-1))]}` : (from || to ? `${from||'?'} a ${to||'?'}` : 'Todos');
    const b2 = document.getElementById('fauna-period-badge'); if (b2) b2.textContent = `Periodo: ${period}`;
  }

  function renderTable(){
    const container = document.getElementById('fauna-table-container');
    if (!container) return;
    if (!state.columns.length){ container.innerHTML = '<div class="text-muted">Sin datos</div>'; return; }

    // sin paginación: mostrar todo
    const rowsWin = state.filtered;
    const thead = '<thead><tr>' + state.columns.map(c => `<th class="text-nowrap">${escapeHtml(c)}</th>`).join('') + '</tr></thead>';
    const tbody = '<tbody>' + rowsWin.map(row => {
      return '<tr>' + state.columns.map(col => {
        let v = row[col];
        if (v === null || v === undefined) v = '';
        return `<td>${escapeHtml(String(v))}</td>`;
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    container.innerHTML = `<div class="table-container-tech h-scroll-area"><table class="table table-striped table-hover table-sm align-middle fauna-table">${thead}${tbody}</table></div>`;
  }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
  }

  function applyFilters(){
    const month = (document.getElementById('fauna-month')?.value || 'all');
    const fromStr = (document.getElementById('fauna-date-from')?.value || '');
    const toStr = (document.getElementById('fauna-date-to')?.value || '');
    const species = (document.getElementById('fauna-species')?.value || 'all');
    const size = (document.getElementById('fauna-size')?.value || 'all');
    const phase = (document.getElementById('fauna-phase')?.value || 'all');
    const airline = (document.getElementById('fauna-airline')?.value || 'all');
    let from = fromStr ? new Date(fromStr + 'T00:00:00Z') : null;
    let to = toStr ? new Date(toStr + 'T23:59:59Z') : null;

    state.filtered = state.raw.filter(r => {
      const d = parseDMY(r['Fecha']);
      if (!d) return false; // omit invalid date rows to keep consistency
      if (month !== 'all') {
        const mm = String((d.getUTCMonth()+1)).padStart(2,'0');
        if (mm !== month) return false;
      }
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (species !== 'all') {
        if (String(r['Especie']||'').trim() !== species) return false;
      }
      if (size !== 'all') {
        if (String(r['Tamaño']||'').trim() !== size) return false;
      }
      if (phase !== 'all') {
        if (String(r['Fase de la operación']||'').trim() !== phase) return false;
      }
      if (airline !== 'all') {
        if (String(r['Aerolínea']||'').trim() !== airline) return false;
      }
      return true;
    });
  state.paging.page = 1; // reset page when filters change
    updateBadges();
    renderTable();
    renderCharts();
    renderAirlineSummary(state.filtered);
    // Actualizar disponibilidad de meses según filtros actuales (excluyendo el propio mes)
    try {
      const rowsForMonth = state.raw.filter(r => {
        const d = parseDMY(r['Fecha']); if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (species !== 'all' && String(r['Especie']||'').trim() !== species) return false;
        if (size !== 'all' && String(r['Tamaño']||'').trim() !== size) return false;
        if (phase !== 'all' && String(r['Fase de la operación']||'').trim() !== phase) return false;
        if (airline !== 'all' && String(r['Aerolínea']||'').trim() !== airline) return false;
        return true;
      });
      updateMonthFilterAvailability(rowsForMonth);
    } catch(_) {}
  }

  function toIntSafe(v){
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Math.floor(v);
    const s = String(v).trim();
    if (!s) return 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  }

  function groupByMonth(rows){
    const counts = new Map();
    rows.forEach(r => {
      const d = parseDMY(r['Fecha']); if (!d) return;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      counts.set(key, (counts.get(key)||0) + 1);
    });
    const keys = Array.from(counts.keys()).sort();
    return { labels: keys, data: keys.map(k => counts.get(k)) };
  }

  function groupBySpecies(rows){
    const counts = new Map();
    rows.forEach(r => {
      const sp = (r['Especie'] || '').trim();
      if (!sp) return;
      counts.set(sp, (counts.get(sp)||0) + 1);
    });
    // Take top 10 species, bucket rest as "Otros"
    const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
    const top = entries.slice(0, 10);
    const rest = entries.slice(10);
    const restSum = rest.reduce((a,[,v])=>a+v,0);
    const labels = top.map(([k])=>k).concat(restSum>0?['Otros']:[]);
    const data = top.map(([,v])=>v).concat(restSum>0?[restSum]:[]);
    return { labels, data };
  }

  function groupByHour(rows){
    const hours = new Array(24).fill(0);
    rows.forEach(r => {
      const h = String(r['Hora']||'').trim();
      const m = h.match(/^(\d{2})\:(\d{2})$/);
      if (!m) return;
      const hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
      hours[hh] += 1;
    });
    return { labels: hours.map((_,i)=> String(i).padStart(2,'0')+':00'), data: hours };
  }

  function destroyChart(ref){
    try {
      if (ref && typeof ref.dispose === 'function') { ref.dispose(); }
    } catch(_) {}
  }

  function renderCharts(){
    const byMonth = groupByMonth(state.filtered);
    const bySpecies = groupBySpecies(state.filtered);
    const byHour = groupByHour(state.filtered);
  const byWeather = groupByWeather(state.filtered);

    // Dispose existing
    destroyChart(state.charts.byMonth);
    destroyChart(state.charts.bySpecies);
    destroyChart(state.charts.byHour);
  destroyChart(state.charts.byWeather);
    destroyChart(state.charts.heatmap);

    // ECharts builders
  const monthLabelsPretty = byMonth.labels.map(monthKeyToAbbr);
  state.charts.byMonth = makeEBar('fauna-by-month', monthLabelsPretty, byMonth.data, { orientation: 'v', color: '#1565c0', xTitle: 'Mes' });
  state.charts.bySpecies = makeEBar('fauna-by-species', bySpecies.labels, bySpecies.data, { orientation: 'h', color: '#2e7d32' });
    state.charts.byHour = makeEBar('fauna-by-hour', byHour.labels, byHour.data, { orientation: 'v', color: '#fb8c00' });

  const heat = groupHeatMonthWeather(state.filtered);
  state.charts.heatmap = makeHeatmap('fauna-heatmap', heat.months, heat.weathers, heat.matrix);

    // Top hours badges
    const topEl = document.getElementById('fauna-top-hours');
    if (topEl){
      const pairs = byHour.labels.map((lab, i) => ({ lab, v: byHour.data[i] }));
      pairs.sort((a,b)=> b.v - a.v);
      const top = pairs.filter(p=>p.v>0).slice(0,5);
      topEl.innerHTML = top.map(p => `<span class="badge rounded-pill text-bg-warning text-dark">${p.lab} · ${p.v}</span>`).join('');
      if (top.length === 0) topEl.innerHTML = '<span class="text-muted small">Sin datos para el periodo/criterios seleccionados.</span>';
    }
    // Resumen por fase (Despegue/Aterrizaje)
    renderPhaseSummary(state.filtered);
    // Resumen por Aerolínea (logos y conteos)
    renderAirlineSummary(state.filtered);
  }

  function ensureEContainer(id){
    const el = document.getElementById(id); if (!el) return null;
    if (el.tagName && el.tagName.toLowerCase() === 'canvas'){
      const div = document.createElement('div');
      // Preserve ID and relevant attributes when replacing canvas
      try { div.id = el.id; } catch(_) {}
      if (el.className) div.className = el.className;
      div.style.width = '100%'; div.style.height = '100%';
      el.parentNode.replaceChild(div, el);
      return div;
    }
    return el;
  }

  function makeEBar(id, labels, values, opts){
    if (!window.echarts) return null;
    const el = ensureEContainer(id); if (!el) return null;
    let chart = window.echarts.getInstanceByDom(el);
    if (!chart) chart = window.echarts.init(el);
    const orientation = (opts && opts.orientation) || 'v';
    const color = (opts && opts.color) || '#1565c0';
    const isSmall = window.matchMedia && window.matchMedia('(max-width: 576px)').matches;
    const option = {
      grid: { left: isSmall ? 54 : 80, right: 16, top: 12, bottom: isSmall ? 54 : 40, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: orientation==='v' ? { type: 'category', data: labels, axisLabel: { color: '#334155' } } : { type: 'value', axisLabel: { color: '#334155' } },
      yAxis: orientation==='v' ? { type: 'value', axisLabel: { color: '#334155' } } : { type: 'category', data: labels, inverse: true, axisLabel: { color: '#334155' } },
      series: [{ type: 'bar', data: values, itemStyle: { color } }]
    };
    if (opts && opts.xTitle) {
      option.xAxis.name = opts.xTitle;
      option.xAxis.nameLocation = 'middle';
      option.xAxis.nameGap = 30;
      option.xAxis.nameTextStyle = { color: '#334155', fontWeight: 600 };
    }
    chart.setOption(option, true);
    return chart;
  }

  function groupHeatMonthWeather(rows){
    // months in YYYY-MM order
    const monthSet = new Set();
    const weatherSet = new Set();
    rows.forEach(r => {
      const d = parseDMY(r['Fecha']); if (!d) return;
      const mkey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      monthSet.add(mkey);
      const w = String(r['Condiciones meteorológicas']||'').trim();
      if (w) weatherSet.add(w);
    });
    const months = Array.from(monthSet).sort();
    const weathers = Array.from(weatherSet).sort((a,b)=>a.localeCompare(b));
    const indexM = new Map(months.map((m,i)=>[m,i]));
    const indexW = new Map(weathers.map((w,i)=>[w,i]));
    const matrix = Array.from({length: months.length}, ()=> Array.from({length: weathers.length}, ()=>0));
    rows.forEach(r => {
      const d = parseDMY(r['Fecha']); if (!d) return;
      const mkey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      const w = String(r['Condiciones meteorológicas']||'').trim();
      if (!indexM.has(mkey) || !indexW.has(w)) return;
      matrix[indexM.get(mkey)][indexW.get(w)]++;
    });
    return { months, weathers, matrix };
  }

  function makeHeatmap(id, months, weathers, matrix){
    if (!window.echarts) return null;
    const el = ensureEContainer(id); if (!el) return null;
    let chart = window.echarts.getInstanceByDom(el);
    if (!chart) chart = window.echarts.init(el);
    const data = [];
    for (let i=0;i<months.length;i++){
      for (let j=0;j<weathers.length;j++){
        data.push([i, j, matrix[i][j]||0]);
      }
    }
    const displayMonths = months.map(monthKeyToAbbr);
    const isSmall = window.matchMedia && window.matchMedia('(max-width: 576px)').matches;
    const option = {
      tooltip: { position: 'top' },
      grid: { left: isSmall ? 76 : 100, right: 16, top: 8, bottom: isSmall ? 58 : 50, containLabel: true },
      xAxis: {
        type: 'category',
        data: displayMonths,
        splitArea: { show: true },
        axisLabel: {
          color: '#334155',
          rotate: months.length > (isSmall ? 6 : 8) ? 45 : 0,
          fontSize: isSmall ? 10 : 12
        }
      },
      yAxis: {
        type: 'category',
        data: weathers,
        splitArea: { show: true },
        axisLabel: {
          color: '#334155',
          fontSize: isSmall ? 10 : 12,
          formatter: function(value){
            const s = String(value || '');
            const max = isSmall ? 12 : 18;
            return s.length > max ? s.slice(0, max-1) + '…' : s;
          }
        }
      },
      visualMap: {
        min: 0,
        max: Math.max(1, ...data.map(d=>d[2])),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 2,
        textStyle: { fontSize: isSmall ? 10 : 12 }
      },
      series: [{
        name: 'Eventos', type: 'heatmap', data,
        label: { show: !isSmall, color: '#222', fontSize: 10 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } }
      }],
      dataZoom: (isSmall && months.length > 6) ? [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, height: 12, bottom: 0 }
      ] : []
    };
    chart.setOption(option, true);
    return chart;
  }

  function groupByWeather(rows){
    // Mantener por compatibilidad pero no se grafica ya en UI
    const counts = new Map();
    rows.forEach(r => {
      const w = String(r['Condiciones meteorológicas']||'').trim();
      if (!w) return;
      counts.set(w, (counts.get(w)||0) + 1);
    });
    const entries = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
    const labels = entries.map(([k])=>k);
    const data = entries.map(([,v])=>v);
    return { labels, data };
  }

  function updateMonthFilterAvailability(rows){
    const sel = document.getElementById('fauna-month'); if (!sel) return;
    // compute months present in provided rows
    const present = new Set();
    rows.forEach(r => { const d = parseDMY(r['Fecha']); if (!d) return; const mm = String(d.getUTCMonth()+1).padStart(2,'0'); present.add(mm); });
    Array.from(sel.options).forEach(opt => {
      if (!opt || opt.value === 'all') return;
      opt.disabled = !present.has(opt.value);
    });
  }

  function renderPhaseSummary(rows){
    const el = document.getElementById('fauna-phase-summary'); if (!el) return;
    let dep = 0, arr = 0, otros = 0;
    rows.forEach(r => {
      const f = normalizeEs(r['Fase de la operación']);
      if (!f) { otros++; return; }
      if (f.includes('despeg')) dep++; else if (f.includes('aterriz')) arr++; else otros++;
    });
    const parts = [];
    parts.push(`<span class="badge rounded-pill text-bg-primary">🛫 Despegues · ${dep}</span>`);
    parts.push(`<span class="badge rounded-pill text-bg-success">🛬 Aterrizajes · ${arr}</span>`);
    if (otros>0) parts.push(`<span class="badge rounded-pill text-bg-secondary">Otros · ${otros}</span>`);
    el.innerHTML = parts.join(' ');
  }

  // Removed Chart.js chart builders; using ECharts above

  function populateFilters(){
    const selMonth = document.getElementById('fauna-month');
    if (selMonth){ /* keep predefined months */ }
    const speciesSel = document.getElementById('fauna-species');
    const sizeSel = document.getElementById('fauna-size');
    const phaseSel = document.getElementById('fauna-phase');
    const airlineSel = document.getElementById('fauna-airline');
    const species = uniqueSorted(state.raw.map(r => r['Especie']));
    const sizes = uniqueSorted(state.raw.map(r => r['Tamaño']));
    const phases = uniqueSorted(state.raw.map(r => r['Fase de la operación']));
    const airlines = uniqueSorted(state.raw.map(r => r['Aerolínea']));
    if (speciesSel){ speciesSel.innerHTML = '<option value="all" selected>Todas</option>' + species.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(''); }
    if (sizeSel){ sizeSel.innerHTML = '<option value="all" selected>Todos</option>' + sizes.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(''); }
    if (phaseSel){ phaseSel.innerHTML = '<option value="all" selected>Todas</option>' + phases.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(''); }
    if (airlineSel){ airlineSel.innerHTML = '<option value="all" selected>Todas</option>' + airlines.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join(''); }
  }

  function bindEvents(){
    document.getElementById('fauna-month')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-date-from')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-date-to')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-species')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-size')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-phase')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-airline')?.addEventListener('change', applyFilters);
    document.getElementById('fauna-clear')?.addEventListener('click', () => {
      const mf = document.getElementById('fauna-month'); if (mf) mf.value='all';
      const df = document.getElementById('fauna-date-from'); if (df) df.value='';
      const dt = document.getElementById('fauna-date-to'); if (dt) dt.value='';
      const sp = document.getElementById('fauna-species'); if (sp) sp.value='all';
      const sz = document.getElementById('fauna-size'); if (sz) sz.value='all';
      const ph = document.getElementById('fauna-phase'); if (ph) ph.value='all';
      const al = document.getElementById('fauna-airline'); if (al) al.value='all';
      applyFilters();
    });
    document.getElementById('fauna-export-csv')?.addEventListener('click', exportCSV);
    // paginación eliminada
    // Debounced resize for ECharts
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        try {
          ['fauna-by-month','fauna-by-species','fauna-by-hour','fauna-heatmap'].forEach(id => {
            const el = document.getElementById(id);
            const inst = el && window.echarts && window.echarts.getInstanceByDom(el.tagName.toLowerCase()==='canvas' ? null : el);
            if (inst && inst.resize) inst.resize();
          });
        } catch(_) {}
      }, 120);
    });

    // Mantener botón de resumen con estado visual activo mientras el colapso esté abierto
    try {
      const toggleBtn = document.getElementById('fauna-summary-toggle');
      const collapseEl = document.getElementById('fauna-summary-collapse');
      if (toggleBtn && collapseEl && window.bootstrap && bootstrap.Collapse) {
        const updateBtnState = () => {
          const isOpen = collapseEl.classList.contains('show');
          toggleBtn.classList.toggle('active', isOpen);
          // Alternar estilo sólido vs contorno para mayor claridad
          toggleBtn.classList.toggle('btn-primary', isOpen);
          toggleBtn.classList.toggle('btn-outline-primary', !isOpen);
          toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          toggleBtn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
        };
        // Inicial: si no está abierto, ábrelo para que permanezca activo por defecto
        if (!collapseEl.classList.contains('show')) {
          const inst = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
          inst.show();
        }
        updateBtnState();
        collapseEl.addEventListener('shown.bs.collapse', updateBtnState);
        collapseEl.addEventListener('hidden.bs.collapse', updateBtnState);
      }
    } catch(_) {}
  }

  function init(){
    if (!document.getElementById('fauna-section')) return; // section not visible yet
    loadFauna().then(rows => {
      state.raw = (rows || []).map(normalizeFaunaRow);
      state.columns = buildColumns(state.raw);
      state.filtered = state.raw.slice();
      populateFilters();
  updateMonthFilterAvailability(state.raw);
      updateBadges();
      renderTable();
      renderCharts();
      renderAirlineSummary(state.filtered);
      bindEvents();
      // Re-render when section becomes visible to avoid zero-size canvas issues
      window.addEventListener('fauna:visible', () => {
        try { renderCharts(); } catch(_) {}
      });
    }).catch(err => {
      console.warn('fauna load error:', err);
      const c = document.getElementById('fauna-table-container');
      if (c) c.innerHTML = '<div class="text-danger">No se pudo cargar fauna.json</div>';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  function exportCSV(){
    if (!state.columns.length) return;
    const sep = ',';
    const header = state.columns.map(csvEscape).join(sep);
    const rows = state.filtered.map(r => state.columns.map(c => csvEscape(r[c])).join(sep));
    const csv = [header].concat(rows).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fauna.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(v){
    if (v === null || v === undefined) v = '';
    let s = String(v);
    if (/[",\n\r]/.test(s)){
      s = '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  }

  // Resumen por Aerolínea (con logos) similar al inicio
  function renderAirlineSummary(rows){
    const container = document.getElementById('fauna-summary-container');
    if (!container) return;
    const counts = new Map();
    rows.forEach(r => {
      const a = String(r['Aerolínea']||'').trim() || 'Sin aerolínea';
      counts.set(a, (counts.get(a)||0)+1);
    });
    const items = Array.from(counts.entries()).sort((a,b)=> b[1]-a[1]);
    if (!items.length){ container.innerHTML = '<div class="text-muted">Sin datos.</div>'; return; }
    let html = '<div class="row g-2">';
    items.forEach(([airline, n]) => {
      const cands = (window.getAirlineLogoCandidates ? window.getAirlineLogoCandidates(airline) : []);
      const logoPath = cands && cands.length ? cands[0] : '';
      const dataCands = (cands||[]).join('|');
      const sizeClass = (window.getLogoSizeClass ? window.getLogoSizeClass(airline,'summary') : 'lg');
  const logoHtml = logoPath ? `<img class="airline-logo ${sizeClass} me-2" src="${logoPath}" alt="Logo ${escapeHtml(airline)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)" loading="lazy">` : '';
      html += `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3">
        <div class="card h-100">
          <div class="card-body d-flex align-items-center justify-content-between">
            <div class="airline-header d-flex align-items-center">
              <a href="#" class="fauna-airline-link d-flex align-items-center text-decoration-none" title="Ver eventos de ${escapeHtml(airline)}" data-airline="${escapeHtml(airline)}">
                ${logoHtml}<strong class="airline-name ms-1">${escapeHtml(airline)}</strong>
              </a>
            </div>
            <span class="badge text-bg-primary">${n}</span>
          </div>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
    // Click -> aplicar filtro por aerolínea y desplazar a la tabla
    try {
      container.querySelectorAll('.fauna-airline-link').forEach(a => {
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          const airline = a.getAttribute('data-airline') || '';
          viewFaunaForAirline(airline);
        });
      });
    } catch(_) {}
  }

  // Aplicar filtro por aerolínea en Fauna y desplazar a la tabla
  function viewFaunaForAirline(airline){
    try {
      const sel = document.getElementById('fauna-airline');
      if (!sel) return;
      // asegurar opción existente
      let option = Array.from(sel.options).find(o => (o.value||'') === airline);
      if (!option && airline) {
        const opt = document.createElement('option');
        opt.value = airline; opt.textContent = airline; sel.appendChild(opt);
      }
      sel.value = airline || 'all';
      applyFilters();
      const tbl = document.getElementById('fauna-table-container');
      if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(_) {}
  }
})();
