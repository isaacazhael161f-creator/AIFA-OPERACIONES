// ============================================================
//  Email Analysis Module — Análisis de Correos Outlook
//  Carga CSV exportado desde Outlook y analiza:
//  - Correos recibidos por día
//  - Solicitudes de slots de aerolíneas
//  - Cuántas solicitudes se respondieron
// ============================================================
(function () {
  'use strict';

  // ── Estado ────────────────────────────────────────────────
  const st = {
    raw: [],          // todos los correos
    filtered: [],     // tras aplicar filtros
    keywords: [       // palabras para detectar solicitud de slot
      'slot', 'ssim', 'solicitud de slot', 'slot request',
      'frecuencia', 'programación', 'schedule request',
      'temporada', 'season', 'slot asignado', 'slot change',
      'slot swap', 'coordinación de slots', 'permiso de operación',
      'autorización', 'slot confirmation'
    ],
    airlines: [],     // aerolíneas detectadas automáticamente
    chartDay: null, chartType: null, chartResp: null,
  };

  // ── Palabras clave que el usuario puede editar ─────────────
  function getKeywords() {
    try {
      const saved = localStorage.getItem('email-slot-keywords');
      return saved ? JSON.parse(saved) : st.keywords;
    } catch (_) { return st.keywords; }
  }
  function saveKeywords(kw) {
    try { localStorage.setItem('email-slot-keywords', JSON.stringify(kw)); } catch (_) {}
  }

  // ── Detectar si un correo es solicitud de slot ─────────────
  function isSlotRequest(row) {
    const kw = getKeywords().map(k => k.toLowerCase());
    const subject = (row.subject || row.Subject || row.Asunto || '').toLowerCase();
    const body    = (row.body    || row.Body    || row.Cuerpo || '').toLowerCase();
    return kw.some(k => subject.includes(k) || body.includes(k));
  }

  // ── Detectar si el correo fue respondido ──────────────────
  // Outlook exports incluyen columna "Categories" o "Conversation"
  // También buscamos en folder/carpeta
  function isReplied(row) {
    const cats = (row.Categories || row.Categorías || row.Categorias || '').toLowerCase();
    const flag  = (row['Flag Status'] || row['Estado de marca'] || '').toLowerCase();
    const folder = (row.Folder || row.Carpeta || '').toLowerCase();
    // Respuesta directa: Outlook marca "replied" en Icon o hay respuesta
    const icon   = (row.Icon || row.Icono || row['Message Class'] || '').toLowerCase();
    return cats.includes('respondido') || cats.includes('replied') ||
           flag.includes('respondido') || flag.includes('complete') ||
           icon.includes('ipm.note.reply') || icon.includes('reply') ||
           folder.includes('enviados') || folder.includes('sent');
  }

  // ── Parsear fecha de Outlook ──────────────────────────────
  // Formatos comunes: "07/05/2026 10:30", "May 7, 2026 10:30 AM", "2026-05-07T10:30:00"
  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    // ISO
    let d = new Date(s);
    if (!isNaN(d)) return d;
    // DD/MM/YYYY HH:MM
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m1) { d = new Date(Number(m1[3]), Number(m1[2])-1, Number(m1[1])); return isNaN(d) ? null : d; }
    return null;
  }

  function toDateKey(dt) {
    if (!dt) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  function fmt(n) { return Number(n).toLocaleString('es-MX'); }

  // ── Parsear CSV exportado de Outlook ─────────────────────
  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];
    // Detectar delimitador (coma o punto y coma)
    const delim = (lines[0].split(';').length > lines[0].split(',').length) ? ';' : ',';
    const headers = splitCSVLine(lines[0], delim);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const vals = splitCSVLine(line, delim);
      const obj = {};
      headers.forEach((h, idx) => { obj[h.trim().replace(/^"|"$/g, '')] = (vals[idx] || '').replace(/^"|"$/g, ''); });
      rows.push(obj);
    }
    return rows;
  }

  function splitCSVLine(line, delim) {
    const result = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === delim && !inQuote) { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur);
    return result;
  }

  // ── Normalizar fila: añadir campos calculados ─────────────
  function normalizeRow(row) {
    // Detectar columna de fecha recibida
    const rawDate = row['Received'] || row['Received Date'] || row['Fecha de recepción'] ||
                    row['Fecha recibido'] || row['Date'] || row['Fecha'] || '';
    const dt = parseDate(rawDate);
    row._date     = dt;
    row._dateKey  = toDateKey(dt);
    row._isSlot   = isSlotRequest(row);
    row._replied  = isReplied(row);
    // Extraer aerolínea del remitente o asunto
    row._from     = row.From || row.De || row['Sender Name'] || row['Nombre del remitente'] || '';
    row._subject  = row.Subject || row.Asunto || '';
    return row;
  }

  // ── Calcular KPIs ─────────────────────────────────────────
  function calcKPIs(rows) {
    const total = rows.length;
    const slots  = rows.filter(r => r._isSlot);
    const nSlots = slots.length;
    const nReplied = slots.filter(r => r._replied).length;
    const pctResp = nSlots > 0 ? Math.round(nReplied * 100 / nSlots) : 0;

    // Promedio por día
    const days = new Set(rows.filter(r => r._dateKey).map(r => r._dateKey));
    const avgDay = days.size > 0 ? (total / days.size).toFixed(1) : '—';
    const avgSlotDay = days.size > 0 ? (nSlots / days.size).toFixed(1) : '—';

    // Día con más correos
    const byday = {};
    rows.forEach(r => { if (r._dateKey) byday[r._dateKey] = (byday[r._dateKey]||0)+1; });
    const peakDay = Object.entries(byday).sort((a,b)=>b[1]-a[1])[0];

    return { total, nSlots, nReplied, pctResp, avgDay, avgSlotDay, days: days.size, peakDay };
  }

  // ── Agrupar por día ───────────────────────────────────────
  function groupByDay(rows) {
    const map = {};
    rows.forEach(r => {
      if (!r._dateKey) return;
      if (!map[r._dateKey]) map[r._dateKey] = { total: 0, slots: 0, replied: 0 };
      map[r._dateKey].total++;
      if (r._isSlot)   map[r._dateKey].slots++;
      if (r._isSlot && r._replied) map[r._dateKey].replied++;
    });
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  }

  // ── Remitentes / aerolíneas frecuentes ───────────────────
  function topSenders(rows, n = 10) {
    const map = {};
    rows.forEach(r => {
      const k = r._from.trim() || '(sin remitente)';
      map[k] = (map[k]||0)+1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0, n);
  }

  // ── Aplicar filtros de UI ─────────────────────────────────
  function applyFilters() {
    const q      = (document.getElementById('em-search')?.value || '').toLowerCase();
    const fType  = document.getElementById('em-filter-type')?.value  || 'all';
    const fFrom  = document.getElementById('em-filter-from')?.value  || '';
    const fFrom2 = (document.getElementById('em-date-from')?.value || '');
    const fTo    = (document.getElementById('em-date-to')?.value   || '');
    const dtFrom = fFrom2 ? new Date(fFrom2 + 'T00:00:00') : null;
    const dtTo   = fTo    ? new Date(fTo    + 'T23:59:59') : null;

    st.filtered = st.raw.filter(r => {
      if (dtFrom && r._date && r._date < dtFrom) return false;
      if (dtTo   && r._date && r._date > dtTo)   return false;
      if (fType === 'slots'   && !r._isSlot)          return false;
      if (fType === 'replied' && !(r._isSlot && r._replied)) return false;
      if (fType === 'pending' && !(r._isSlot && !r._replied)) return false;
      if (fFrom && !r._from.toLowerCase().includes(fFrom.toLowerCase())) return false;
      if (q) {
        const text = `${r._subject} ${r._from}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    renderKPIs();
    renderCharts();
    renderTable();
  }

  // ── Render KPIs ───────────────────────────────────────────
  function renderKPIs() {
    const k = calcKPIs(st.filtered);

    function setKPI(id, val, sub) {
      const el = document.getElementById(id); if (!el) return;
      el.querySelector('.em-kpi-val').textContent  = val;
      if (sub !== undefined) el.querySelector('.em-kpi-sub').textContent = sub;
    }

    setKPI('em-kpi-total',   fmt(k.total),   `${k.days} días · ~${k.avgDay}/día`);
    setKPI('em-kpi-slots',   fmt(k.nSlots),  `~${k.avgSlotDay}/día`);
    setKPI('em-kpi-replied', fmt(k.nReplied),`${k.pctResp}% respondidas`);
    setKPI('em-kpi-pending', fmt(k.nSlots - k.nReplied), k.nSlots > 0 ? `${100-k.pctResp}% pendiente` : '');

    const peakEl = document.getElementById('em-kpi-peak');
    if (peakEl && k.peakDay) {
      peakEl.querySelector('.em-kpi-val').textContent = fmtDate(k.peakDay[0]);
      peakEl.querySelector('.em-kpi-sub').textContent = `${k.peakDay[1]} correos`;
    }
  }

  function fmtDate(key) {
    if (!key) return '—';
    const [y,m,d] = key.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${Number(d)} ${months[Number(m)-1]} ${y}`;
  }

  // ── Render Charts (ECharts si disponible, sino Chart.js) ──
  function destroyChart(ref) {
    try {
      if (!ref) return;
      if (typeof ref.dispose === 'function') ref.dispose();
      else if (typeof ref.destroy === 'function') ref.destroy();
    } catch (_) {}
  }

  function renderCharts() {
    destroyChart(st.chartDay);
    destroyChart(st.chartType);
    destroyChart(st.chartResp);

    const byDay = groupByDay(st.filtered);
    const labels  = byDay.map(([k]) => fmtDate(k));
    const totals  = byDay.map(([,v]) => v.total);
    const slots   = byDay.map(([,v]) => v.slots);
    const replied = byDay.map(([,v]) => v.replied);

    // Chart 1: correos por día (línea total + barra slots)
    const el1 = document.getElementById('em-chart-day');
    if (el1) {
      if (window.echarts) {
        const inst = window.echarts.init(el1);
        inst.setOption({
          tooltip: { trigger: 'axis' },
          legend: { data: ['Total correos', 'Solicitudes slot'] },
          grid: { left: 40, right: 20, top: 40, bottom: 40 },
          xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45, fontSize: 10 } },
          yAxis: { type: 'value' },
          series: [
            { name: 'Total correos', type: 'line', data: totals, smooth: true,
              lineStyle: { color: '#3b82f6' }, areaStyle: { color: 'rgba(59,130,246,0.08)' }, symbol: 'none' },
            { name: 'Solicitudes slot', type: 'bar', data: slots, barMaxWidth: 24,
              itemStyle: { color: '#f59e0b', borderRadius: [4,4,0,0] } }
          ]
        });
        st.chartDay = inst;
      }
    }

    // Chart 2: dona — total vs slots vs respondidas
    const el2 = document.getElementById('em-chart-resp');
    if (el2) {
      if (window.echarts) {
        const totSlots   = slots.reduce((a,b)=>a+b, 0);
        const totReplied = replied.reduce((a,b)=>a+b, 0);
        const pending    = totSlots - totReplied;
        const noSlots    = st.filtered.length - totSlots;
        const inst = window.echarts.init(el2);
        inst.setOption({
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
          series: [{
            type: 'pie', radius: ['42%','68%'], center: ['40%','50%'],
            avoidLabelOverlap: true,
            label: { show: true, fontSize: 11 },
            data: [
              { value: noSlots,    name: 'Otros correos',     itemStyle: { color: '#94a3b8' } },
              { value: totReplied, name: 'Slots respondidos',  itemStyle: { color: '#22c55e' } },
              { value: pending,    name: 'Slots sin respuesta',itemStyle: { color: '#ef4444' } },
            ].filter(d => d.value > 0)
          }]
        });
        st.chartResp = inst;
      }
    }

    // Chart 3: top remitentes
    const el3 = document.getElementById('em-chart-senders');
    if (el3) {
      if (window.echarts) {
        const top = topSenders(st.filtered.filter(r => r._isSlot), 8);
        const inst = window.echarts.init(el3);
        inst.setOption({
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: 10, right: 20, top: 10, bottom: 10, containLabel: true },
          xAxis: { type: 'value' },
          yAxis: { type: 'category', data: top.map(([k])=>k).reverse(),
                   axisLabel: { fontSize: 10, overflow: 'truncate', width: 160 } },
          series: [{ type: 'bar', data: top.map(([,v])=>v).reverse(), barMaxWidth: 22,
                     itemStyle: { color: '#8b5cf6', borderRadius: [0,4,4,0] } }]
        });
        st.chartType = inst;
      }
    }
  }

  // ── Render tabla de correos ───────────────────────────────
  function renderTable() {
    const cont = document.getElementById('em-table-body'); if (!cont) return;
    const rows = st.filtered.slice(0, 200); // limitar para rendimiento
    if (!rows.length) {
      cont.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Sin correos para los filtros seleccionados</td></tr>';
      return;
    }
    cont.innerHTML = rows.map(r => {
      const slotBadge = r._isSlot
        ? `<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fbbf24;font-size:.7rem">🛫 Slot</span>`
        : '';
      const replBadge = r._isSlot
        ? (r._replied
            ? `<span class="badge" style="background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:.7rem">✓ Respondido</span>`
            : `<span class="badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:.7rem">⏳ Pendiente</span>`)
        : '';
      const subj = escHtml(r._subject || '(sin asunto)').slice(0, 80);
      const from = escHtml(r._from || '').slice(0, 50);
      const date = r._dateKey ? fmtDate(r._dateKey) : '—';
      return `<tr>
        <td class="text-muted small">${date}</td>
        <td class="small">${from}</td>
        <td class="small">${subj}</td>
        <td>${slotBadge}</td>
        <td>${replBadge}</td>
      </tr>`;
    }).join('');

    const count = document.getElementById('em-table-count');
    if (count) count.textContent = `${fmt(st.filtered.length)} correos${st.filtered.length > 200 ? ' (mostrando 200)' : ''}`;
  }

  function escHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Actualizar selector de remitentes ─────────────────────
  function populateSenderFilter() {
    const sel = document.getElementById('em-filter-from'); if (!sel) return;
    const senders = Array.from(new Set(st.raw.map(r => r._from).filter(Boolean))).sort();
    sel.innerHTML = '<option value="">Todos los remitentes</option>' +
      senders.slice(0, 100).map(s => `<option value="${escHtml(s)}">${escHtml(s.slice(0,60))}</option>`).join('');
  }

  // ── Cargar CSV ────────────────────────────────────────────
  function loadCSV(file) {
    const status = document.getElementById('em-load-status');
    if (status) status.textContent = 'Cargando…';
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const raw = parseCSV(e.target.result);
        st.raw = raw.map(normalizeRow);
        st.filtered = st.raw.slice();
        populateSenderFilter();
        applyFilters();
        showPanel();
        if (status) status.textContent = `✓ ${fmt(st.raw.length)} correos cargados`;
      } catch (err) {
        if (status) status.textContent = '✗ Error al leer el archivo: ' + err.message;
      }
    };
    reader.onerror = () => { if (status) status.textContent = '✗ No se pudo leer el archivo.'; };
    reader.readAsText(file, 'UTF-8');
  }

  function showPanel() {
    const up = document.getElementById('em-upload-area');
    const pn = document.getElementById('em-panel');
    if (up) up.classList.add('d-none');
    if (pn) pn.classList.remove('d-none');
  }

  // ── Keywords editor ───────────────────────────────────────
  function openKeywordsEditor() {
    const kw = getKeywords();
    const modal = document.getElementById('em-kw-modal');
    const ta    = document.getElementById('em-kw-textarea');
    if (!modal || !ta) return;
    ta.value = kw.join('\n');
    bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const section = document.getElementById('email-analisis-section');
    if (!section) return;

    // Upload drag & drop
    const dropzone = document.getElementById('em-dropzone');
    const fileInput = document.getElementById('em-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('em-drag-over'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('em-drag-over'));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('em-drag-over');
        const f = e.dataTransfer?.files?.[0];
        if (f) loadCSV(f);
      });
      fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) loadCSV(f); });
    }

    // Filters
    ['em-search','em-filter-type','em-filter-from','em-date-from','em-date-to']
      .forEach(id => document.getElementById(id)?.addEventListener('input', applyFilters));
    ['em-filter-type','em-filter-from'].forEach(id =>
      document.getElementById(id)?.addEventListener('change', applyFilters));

    // Reset
    document.getElementById('em-reset')?.addEventListener('click', () => {
      st.raw = []; st.filtered = [];
      const up = document.getElementById('em-upload-area');
      const pn = document.getElementById('em-panel');
      if (up) up.classList.remove('d-none');
      if (pn) pn.classList.add('d-none');
      const fi = document.getElementById('em-file-input');
      if (fi) fi.value = '';
      const st2 = document.getElementById('em-load-status');
      if (st2) st2.textContent = '';
    });

    // Keywords editor
    document.getElementById('em-btn-keywords')?.addEventListener('click', openKeywordsEditor);
    document.getElementById('em-kw-save')?.addEventListener('click', () => {
      const ta = document.getElementById('em-kw-textarea');
      if (!ta) return;
      const kw = ta.value.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
      saveKeywords(kw);
      bootstrap.Modal.getOrCreateInstance(document.getElementById('em-kw-modal')).hide();
      if (st.raw.length) {
        st.raw = st.raw.map(normalizeRow);
        st.filtered = st.raw.slice();
        applyFilters();
      }
    });

    // Resize charts when section shown
    window.addEventListener('email-analisis:visible', () => {
      [st.chartDay, st.chartType, st.chartResp].forEach(c => {
        try { if (c && typeof c.resize === 'function') c.resize(); } catch(_) {}
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
