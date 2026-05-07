// ============================================================
//  Email Analysis Module — Análisis de Correos Outlook
//  Carga CSV exportado desde Outlook (español) y analiza:
//  - Correos recibidos por día
//  - Solicitudes de slots de aerolíneas
//  - Cuántas solicitudes se respondieron
// ============================================================
(function () {
  'use strict';

  // ── Estado ────────────────────────────────────────────────
  const st = {
    raw: [],       // todos los correos
    filtered: [],  // tras filtros
    keywords: [
      'slot', 'ssim', 'solicitud de slot', 'slot request',
      'frecuencia', 'programación', 'schedule request',
      'temporada', 'season', 'slot asignado', 'slot change',
      'slot swap', 'coordinación de slots', 'scr',
      'permiso de operación', 'slot confirmation', 'alta de slot',
      'modificación de slot', 'modificacion de slot',
      'cambio de slot', 'demora', 'autorización de slot'
    ],
    chartDay: null, chartType: null, chartResp: null,
    hasDateCol: false,
  };

  // ── Palabras clave editables ──────────────────────────────
  function getKeywords() {
    try {
      const s = localStorage.getItem('email-slot-keywords');
      return s ? JSON.parse(s) : st.keywords;
    } catch (_) { return st.keywords; }
  }
  function saveKeywords(kw) {
    try { localStorage.setItem('email-slot-keywords', JSON.stringify(kw)); } catch (_) {}
  }

  // ── Detección de solicitud de slot ───────────────────────
  function isSlotRequest(row) {
    const kw = getKeywords().map(k => k.toLowerCase());
    const subject = (row['Asunto'] || row['Subject'] || '').toLowerCase();
    const body    = (row['Cuerpo'] || row['Body']    || '').toLowerCase();
    return kw.some(k => subject.includes(k) || body.includes(k));
  }

  // ── Detección de respuesta por metadatos ─────────────────
  function isRepliedByMeta(row) {
    const cats   = (row['Categorías'] || row['Categorias'] || row['Categories'] || '').toLowerCase();
    const flag   = (row['Flag Status'] || row['Estado de marca'] || '').toLowerCase();
    const folder = (row['Folder'] || row['Carpeta'] || '').toLowerCase();
    const msgCls = (row['Message Class'] || row['Clase de mensaje'] || '').toLowerCase();
    return cats.includes('respondido') || cats.includes('replied') ||
           flag.includes('complete')   || flag.includes('respondido') ||
           msgCls.includes('ipm.note.reply') || msgCls.includes('reply') ||
           folder.includes('enviados') || folder.includes('sent');
  }

  // Después de cargar todos los correos, marcar como respondidas las
  // solicitudes de slot que tienen un "Re:" correspondiente en el dataset
  function markRepliedByThread(rows) {
    const reSubjects = new Set();
    rows.forEach(r => {
      const s = (r['Asunto'] || r['Subject'] || '').trim();
      if (/^(re|rv|fw|fwd|reenviado|respuesta):/i.test(s)) {
        reSubjects.add(s.replace(/^(re|rv|fw|fwd|reenviado|respuesta):\s*/i, '').toLowerCase().trim());
      }
    });
    rows.forEach(r => {
      const sub = (r['Asunto'] || r['Subject'] || '').trim().toLowerCase().trim();
      if (r._isSlot && reSubjects.has(sub)) r._replied = true;
    });
    return rows;
  }

  // ── Parsear fecha ─────────────────────────────────────────
  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    if (!s) return null;
    let d = new Date(s);
    if (!isNaN(d) && d.getFullYear() > 1970) return d;
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m1) { d = new Date(Number(m1[3]), Number(m1[2])-1, Number(m1[1])); return isNaN(d) ? null : d; }
    return null;
  }

  // Extraer fecha del asunto cuando no hay columna de fecha
  // Patrones: "01SEP25", "31AUG2025", "01/09/2025"
  const MON_MAP = {
    ENE:0,JAN:0,FEB:1,MAR:2,ABR:3,APR:3,MAY:4,JUN:5,
    JUL:6,AGO:7,AUG:7,SEP:8,OCT:9,NOV:10,DIC:11,DEC:11
  };
  function extractDateFromText(text) {
    if (!text) return null;
    const m = text.match(/\b(\d{1,2})(ENE|JAN|FEB|MAR|ABR|APR|MAY|JUN|JUL|AGO|AUG|SEP|OCT|NOV|DIC|DEC)(\d{2,4})\b/i);
    if (m) {
      const day = Number(m[1]);
      const mon = MON_MAP[m[2].toUpperCase()];
      let yr = Number(m[3]);
      if (yr < 100) yr += 2000;
      const d = new Date(yr, mon, day);
      if (!isNaN(d) && d.getFullYear() >= 2020) return d;
    }
    const m2 = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (m2) {
      const d = new Date(Number(m2[3]), Number(m2[2])-1, Number(m2[1]));
      if (!isNaN(d) && d.getFullYear() >= 2020) return d;
    }
    return null;
  }

  function toDateKey(dt) {
    if (!dt) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  function fmt(n) { return Number(n).toLocaleString('es-MX'); }

  // ── Parser CSV robusto (soporta campos multi-línea entre comillas) ──
  // Itera carácter a carácter en lugar de split('\n')
  function parseCSV(text) {
    const firstNL = text.indexOf('\n');
    const firstLine = text.substring(0, firstNL > -1 ? firstNL : text.length);
    const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

    const allRecords = [];
    let rec = [], field = '', inQ = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i+1] === '"') { field += '"'; i++; }  // "" → "
          else { inQ = false; }
        } else {
          field += ch;  // saltos de línea dentro de comillas se ignoran en el recuento
        }
      } else {
        if      (ch === '"')   { inQ = true; }
        else if (ch === delim) { rec.push(field); field = ''; }
        else if (ch === '\r')  { /* skip */ }
        else if (ch === '\n')  {
          rec.push(field); field = '';
          allRecords.push(rec); rec = [];
        } else { field += ch; }
      }
    }
    if (field !== '' || rec.length > 0) { rec.push(field); allRecords.push(rec); }

    if (allRecords.length < 2) return [];
    const headers = allRecords[0].map(h => h.trim());
    return allRecords.slice(1)
      .filter(r => r.some(f => f.trim() !== ''))
      .map(vals => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i].trim() : ''; });
        return obj;
      });
  }

  // ── Normalizar fila ───────────────────────────────────────
  function normalizeRow(row) {
    const rawDate =
      row['Recibido']           ||
      row['Received']           ||
      row['Fecha de recepción'] ||
      row['Fecha recibido']     ||
      row['Fecha']              ||
      row['Date']               || '';

    let dt = parseDate(rawDate);
    // Sin columna de fecha: extraer del asunto (ej. 01SEP25)
    if (!dt) dt = extractDateFromText(row['Asunto'] || row['Subject'] || '');

    row._date    = dt;
    row._dateKey = toDateKey(dt);
    row._isSlot  = isSlotRequest(row);
    row._replied = isRepliedByMeta(row);

    // Mapeado de columnas español Outlook: "De: (nombre)" / "De: (dirección)"
    row._from    =
      row['De: (nombre)']          ||
      row['De: (dirección)']       ||
      row['From']                  ||
      row['De']                    ||
      row['Sender Name']           ||
      row['Nombre del remitente']  || '';

    row._subject = row['Asunto'] || row['Subject'] || '';
    return row;
  }

  // ── KPIs ──────────────────────────────────────────────────
  function calcKPIs(rows) {
    const total    = rows.length;
    const nSlots   = rows.filter(r => r._isSlot).length;
    const nReplied = rows.filter(r => r._isSlot && r._replied).length;
    const pctResp  = nSlots > 0 ? Math.round(nReplied * 100 / nSlots) : 0;
    const days     = new Set(rows.filter(r => r._dateKey).map(r => r._dateKey));
    const avgDay      = days.size > 0 ? (total  / days.size).toFixed(1) : '—';
    const avgSlotDay  = days.size > 0 ? (nSlots / days.size).toFixed(1) : '—';
    const byday = {};
    rows.forEach(r => { if (r._dateKey) byday[r._dateKey] = (byday[r._dateKey]||0)+1; });
    const peakDay = Object.entries(byday).sort((a,b)=>b[1]-a[1])[0] || null;
    return { total, nSlots, nReplied, pctResp, avgDay, avgSlotDay, days: days.size, peakDay };
  }

  function groupByDay(rows) {
    const map = {};
    rows.forEach(r => {
      if (!r._dateKey) return;
      if (!map[r._dateKey]) map[r._dateKey] = { total:0, slots:0, replied:0 };
      map[r._dateKey].total++;
      if (r._isSlot)               map[r._dateKey].slots++;
      if (r._isSlot && r._replied) map[r._dateKey].replied++;
    });
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  }

  function topSenders(rows, n = 10) {
    const map = {};
    rows.forEach(r => {
      const k = (r._from || '(sin remitente)').trim();
      map[k] = (map[k]||0)+1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,n);
  }

  // ── Filtros ───────────────────────────────────────────────
  function applyFilters() {
    const q     = (document.getElementById('em-search')?.value     || '').toLowerCase();
    const fType =  document.getElementById('em-filter-type')?.value || 'all';
    const fFrom =  document.getElementById('em-filter-from')?.value || '';
    const fF2   =  document.getElementById('em-date-from')?.value   || '';
    const fTo   =  document.getElementById('em-date-to')?.value     || '';
    const dtFrom = fF2 ? new Date(fF2 + 'T00:00:00') : null;
    const dtTo   = fTo ? new Date(fTo + 'T23:59:59') : null;

    st.filtered = st.raw.filter(r => {
      if (dtFrom && r._date && r._date < dtFrom) return false;
      if (dtTo   && r._date && r._date > dtTo)   return false;
      if (fType === 'slots'   && !r._isSlot)                  return false;
      if (fType === 'replied' && !(r._isSlot && r._replied))  return false;
      if (fType === 'pending' && !(r._isSlot && !r._replied)) return false;
      if (fFrom && !r._from.toLowerCase().includes(fFrom.toLowerCase())) return false;
      if (q && !`${r._subject} ${r._from}`.toLowerCase().includes(q)) return false;
      return true;
    });
    renderKPIs();
    renderCharts();
    renderTable();
  }

  // ── Helpers UI ────────────────────────────────────────────
  function fmtDate(key) {
    if (!key) return '—';
    const [y,m,d] = key.split('-');
    return `${Number(d)} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][Number(m)-1]} ${y}`;
  }

  function setKPI(id, val, sub) {
    const el = document.getElementById(id); if (!el) return;
    el.querySelector('.em-kpi-val').textContent = val;
    if (sub !== undefined) el.querySelector('.em-kpi-sub').textContent = sub;
  }

  // ── Render KPIs ───────────────────────────────────────────
  function renderKPIs() {
    const k = calcKPIs(st.filtered);
    setKPI('em-kpi-total',   fmt(k.total),              k.days > 0 ? `${k.days} días · ~${k.avgDay}/día` : 'sin columna de fecha');
    setKPI('em-kpi-slots',   fmt(k.nSlots),             k.days > 0 ? `~${k.avgSlotDay}/día` : '');
    setKPI('em-kpi-replied', fmt(k.nReplied),           `${k.pctResp}% respondidas`);
    setKPI('em-kpi-pending', fmt(k.nSlots - k.nReplied), k.nSlots > 0 ? `${100-k.pctResp}% pendiente` : '');
    const peakEl = document.getElementById('em-kpi-peak');
    if (peakEl) {
      peakEl.querySelector('.em-kpi-val').textContent = k.peakDay ? fmtDate(k.peakDay[0]) : '—';
      peakEl.querySelector('.em-kpi-sub').textContent = k.peakDay ? `${k.peakDay[1]} correos` : '';
    }
  }

  // ── Render Charts ─────────────────────────────────────────
  function destroyChart(ref) {
    try { if (ref?.dispose) ref.dispose(); } catch(_) {}
  }

  function renderCharts() {
    destroyChart(st.chartDay);
    destroyChart(st.chartType);
    destroyChart(st.chartResp);
    st.chartDay = st.chartType = st.chartResp = null;

    const byDay   = groupByDay(st.filtered);
    const labels  = byDay.map(([k]) => fmtDate(k));
    const totals  = byDay.map(([,v]) => v.total);
    const slots   = byDay.map(([,v]) => v.slots);
    const replied = byDay.map(([,v]) => v.replied);

    // Chart 1: línea total + barras slot
    const el1 = document.getElementById('em-chart-day');
    if (el1 && window.echarts) {
      el1.innerHTML = '';
      if (byDay.length === 0) {
        el1.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem">El asunto de los correos no contiene patrón de fecha (ej. 01SEP25). Exporta el CSV incluyendo la columna Recibido.</div>';
      } else {
        const c = window.echarts.init(el1);
        c.setOption({
          tooltip:{ trigger:'axis' },
          legend:{ data:['Total correos','Solicitudes slot'], top:0 },
          grid:{ left:40, right:20, top:36, bottom:60 },
          xAxis:{ type:'category', data:labels, axisLabel:{ rotate:45, fontSize:10 } },
          yAxis:{ type:'value' },
          series:[
            { name:'Total correos',    type:'line', data:totals, smooth:true,
              lineStyle:{color:'#3b82f6'}, areaStyle:{color:'rgba(59,130,246,.08)'}, symbol:'none' },
            { name:'Solicitudes slot', type:'bar',  data:slots, barMaxWidth:24,
              itemStyle:{color:'#f59e0b', borderRadius:[4,4,0,0]} }
          ]
        });
        st.chartDay = c;
      }
    }

    // Chart 2: dona distribución
    const el2 = document.getElementById('em-chart-resp');
    if (el2 && window.echarts) {
      el2.innerHTML = '';
      const totSlots   = st.filtered.filter(r=>r._isSlot).length;
      const totReplied = st.filtered.filter(r=>r._isSlot&&r._replied).length;
      const pending    = totSlots - totReplied;
      const noSlots    = st.filtered.length - totSlots;
      const c = window.echarts.init(el2);
      c.setOption({
        tooltip:{ trigger:'item', formatter:'{b}: {c} ({d}%)' },
        legend:{ orient:'vertical', right:10, top:'center', textStyle:{fontSize:11} },
        series:[{
          type:'pie', radius:['42%','68%'], center:['40%','50%'],
          label:{ show:true, fontSize:11 },
          data:[
            { value:noSlots,    name:'Otros correos',       itemStyle:{color:'#94a3b8'} },
            { value:totReplied, name:'Slots respondidos',   itemStyle:{color:'#22c55e'} },
            { value:pending,    name:'Slots sin respuesta', itemStyle:{color:'#ef4444'} },
          ].filter(d=>d.value>0)
        }]
      });
      st.chartType = c;
    }

    // Chart 3: top remitentes de slot
    const el3 = document.getElementById('em-chart-senders');
    if (el3 && window.echarts) {
      el3.innerHTML = '';
      const top = topSenders(st.filtered.filter(r=>r._isSlot), 8);
      if (!top.length) {
        el3.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem">No hay solicitudes de slot detectadas con las palabras clave actuales.</div>';
      } else {
        const c = window.echarts.init(el3);
        c.setOption({
          tooltip:{ trigger:'axis', axisPointer:{type:'shadow'} },
          grid:{ left:10, right:20, top:10, bottom:10, containLabel:true },
          xAxis:{ type:'value' },
          yAxis:{ type:'category', data:top.map(([k])=>k).reverse(),
                  axisLabel:{ fontSize:10, overflow:'truncate', width:180 } },
          series:[{ type:'bar', data:top.map(([,v])=>v).reverse(), barMaxWidth:22,
                    itemStyle:{color:'#8b5cf6', borderRadius:[0,4,4,0]} }]
        });
        st.chartResp = c;
      }
    }
  }

  // ── Tabla ─────────────────────────────────────────────────
  function escHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderTable() {
    const tbody = document.getElementById('em-table-body'); if (!tbody) return;
    const rows = st.filtered.slice(0,200);
    tbody.innerHTML = rows.length === 0
      ? '<tr><td colspan="5" class="text-center text-muted py-4">Sin correos para los filtros aplicados</td></tr>'
      : rows.map(r => {
          const slotBadge = r._isSlot
            ? `<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fbbf24;font-size:.68rem">🛫 Slot</span>` : '';
          const replBadge = r._isSlot
            ? (r._replied
                ? `<span class="badge" style="background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:.68rem">✓ Respondido</span>`
                : `<span class="badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:.68rem">⏳ Pendiente</span>`)
            : '';
          const dateCell = r._dateKey
            ? `<span class="text-muted">${fmtDate(r._dateKey)}</span>`
            : `<span style="color:#f59e0b">sin fecha</span>`;
          return `<tr>
            <td class="small" style="white-space:nowrap">${dateCell}</td>
            <td class="small">${escHtml(r._from.slice(0,50))}</td>
            <td class="small">${escHtml(r._subject.slice(0,90))}</td>
            <td>${slotBadge}</td>
            <td>${replBadge}</td>
          </tr>`;
        }).join('');
    const count = document.getElementById('em-table-count');
    if (count) count.textContent =
      `${fmt(st.filtered.length)} correos${st.filtered.length>200?' (mostrando 200)':''}`;
  }

  // ── Poblar filtro de remitentes ───────────────────────────
  function populateSenderFilter() {
    const sel = document.getElementById('em-filter-from'); if (!sel) return;
    const senders = [...new Set(st.raw.map(r=>r._from).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todos los remitentes</option>' +
      senders.slice(0,100).map(s=>`<option value="${escHtml(s)}">${escHtml(s.slice(0,60))}</option>`).join('');
  }

  // ── Cargar CSV ────────────────────────────────────────────
  function loadCSV(file) {
    const status = document.getElementById('em-load-status');
    if (status) status.textContent = 'Cargando…';
    const reader = new FileReader();
    reader.onload = e => {
      try {
        st.raw = parseCSV(e.target.result).map(normalizeRow);
        markRepliedByThread(st.raw);
        st.filtered = st.raw.slice();
        populateSenderFilter();
        applyFilters();
        showPanel();
        const nDate = st.raw.filter(r=>r._dateKey).length;
        const warnMsg = nDate === 0
          ? ' · ⚠ Sin fechas — el asunto no contiene patrón DDMMMAA (ej. 01SEP25). Exporta el CSV con la columna Recibido para ver gráfica por día.'
          : nDate < st.raw.length ? ` · ⚠ ${st.raw.length-nDate} correo(s) sin fecha reconocible` : '';
        if (status) status.textContent = `✓ ${fmt(st.raw.length)} correos cargados${warnMsg}`;
      } catch (err) {
        if (status) status.textContent = '✗ Error: ' + err.message;
        console.error(err);
      }
    };
    reader.onerror = () => { if (status) status.textContent = '✗ No se pudo leer el archivo.'; };
    reader.readAsText(file, 'UTF-8');
  }

  function showPanel() {
    document.getElementById('em-upload-area')?.classList.add('d-none');
    document.getElementById('em-panel')?.classList.remove('d-none');
  }

  // ── Keywords editor ───────────────────────────────────────
  function openKeywordsEditor() {
    const ta = document.getElementById('em-kw-textarea'); if (!ta) return;
    ta.value = getKeywords().join('\n');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('em-kw-modal')).show();
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (!document.getElementById('email-analisis-section')) return;

    const dropzone  = document.getElementById('em-dropzone');
    const fileInput = document.getElementById('em-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.background='#dbeafe'; });
      dropzone.addEventListener('dragleave', () => { dropzone.style.background='#f0f9ff'; });
      dropzone.addEventListener('drop', e => {
        e.preventDefault(); dropzone.style.background='#f0f9ff';
        const f = e.dataTransfer?.files?.[0]; if (f) loadCSV(f);
      });
      fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) loadCSV(f); });
    }

    ['em-search','em-date-from','em-date-to'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', applyFilters));
    ['em-filter-type','em-filter-from'].forEach(id =>
      document.getElementById(id)?.addEventListener('change', applyFilters));

    // Reset (hay dos botones #em-reset: header y barra de filtros)
    document.querySelectorAll('[id="em-reset"]').forEach(btn => btn.addEventListener('click', () => {
      st.raw = []; st.filtered = [];
      document.getElementById('em-upload-area')?.classList.remove('d-none');
      document.getElementById('em-panel')?.classList.add('d-none');
      const fi = document.getElementById('em-file-input'); if (fi) fi.value = '';
      const ls = document.getElementById('em-load-status'); if (ls) ls.textContent = '';
    }));

    document.getElementById('em-btn-keywords')?.addEventListener('click', openKeywordsEditor);
    document.getElementById('em-kw-save')?.addEventListener('click', () => {
      const ta = document.getElementById('em-kw-textarea'); if (!ta) return;
      saveKeywords(ta.value.split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean));
      bootstrap.Modal.getOrCreateInstance(document.getElementById('em-kw-modal')).hide();
      if (st.raw.length) {
        st.raw = st.raw.map(normalizeRow);
        markRepliedByThread(st.raw);
        st.filtered = st.raw.slice();
        applyFilters();
      }
    });

    window.addEventListener('email-analisis:visible', () => {
      [st.chartDay, st.chartType, st.chartResp].forEach(c => {
        try { if (c?.resize) c.resize(); } catch(_) {}
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();