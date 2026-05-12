// ============================================================
//  Email Analysis Module — Análisis de Correos AIFA
//  Soporta: Correos de entrada.xlsx + Correos elementos enviados.xlsx
//  - Correos recibidos y enviados por día
//  - Solicitudes de slot: Alta / Modificación / Cancelación / Demora
//  - Tiempo de respuesta (precisión horaria y diaria)
// ============================================================
(function () {
  'use strict';

  // ── Constantes ───────────────────────────────────────────
  const CAT_ORDER  = ['Alta', 'Modificación', 'Cancelación', 'Demora'];
  const CAT_COLORS = {
    Alta:          '#0077b6',
    'Modificación':'#f4a261',
    'Cancelación': '#e63946',
    Demora:        '#9b5de5',
  };
  const CAT_PATTERNS = {
    // Alineados con patrones Python (más amplios)
    Alta:
      /\b(alta\s+de\s+slot|alta\s+slot|asignaci[oó]n|asigna[s]?\s+slot|solicitud\s+de\s+slot|solicitud\s+slot|slot\s+request|asignar\s+slot|nuevo\s+slot|alta\s+vuelo)\b/i,
    'Modificación':
      /\b(modificaci[oó]n|modif[.\s]|ajuste[s]?|ajuste\s+de\s+slot|ajuste\s+slot|cambio[s]?\s+(de\s+)?slot|cambio\s+de\s+slot|scr\b|reprogramaci[oó]n)\b/i,
    'Cancelación':
      /\b(cancelaci[oó]n|cancelacion|baja\s+(de\s+)?slot|baja\s+slot|cancelar|supresi[oó]n)\b/i,
    Demora:
      /\b(demora|delay|retraso|atraso)\b/i,
  };
  const DAY_OFFSET = {
    lunes: 0, martes: -1, 'miércoles': -2, miercoles: -2,
    jueves: -3, viernes: -4, 'sábado': -5, sabado: -5, domingo: -6,
  };

  // ── Estado ────────────────────────────────────────────────
  const st = {
    received: [],
    sent:     [],
    filtered: [],
    charts:   {},
    loaded:   { recv: false, sent: false },
  };

  // ── Helper: columna robusta (acento-insensible) ───────────
  function col(row, ...names) {
    for (const n of names) {
      if (row[n] !== undefined && row[n] !== null) return row[n];
    }
    const keys = Object.keys(row);
    for (const n of names) {
      const norm = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const found = keys.find(k =>
        k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === norm);
      if (found !== undefined) return row[found];
    }
    return null;
  }

  // ── Utilidades de fecha ───────────────────────────────────
  function getToday() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function addDays(d, n) {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
  }
  function toDateKey(d) {
    if (!d || isNaN(d)) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function fmtDateKey(k) {
    if (!k) return '—';
    const [y, m, d] = k.split('-');
    const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${Number(d)} ${M[Number(m)-1]} ${y}`;
  }

  function parseXLSXDate(val) {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val)) return null;
      if (val.getFullYear() < 2000) {
        const t = getToday();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate(),
                        val.getHours(), val.getMinutes(), 0);
      }
      return val;
    }
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      if (!s) return null;
      const m1 = s.match(/^\w+\s+(\d{2})\/(\d{2})$/);
      if (m1) {
        const t = getToday();
        return new Date(t.getFullYear(), Number(m1[2]) - 1, Number(m1[1]));
      }
      const m2 = s.match(/^(\w+)\s+(\d{1,2}):(\d{2})\s*(a\.|p\.)/);
      if (m2) {
        const off = DAY_OFFSET[m2[1]];
        if (off !== undefined) {
          let h = Number(m2[2]), mn = Number(m2[3]);
          if (s.includes('p.') && h !== 12) h += 12;
          if (s.includes('a.') && h === 12) h = 0;
          const base = addDays(getToday(), off);
          return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, mn);
        }
      }
    }
    return null;
  }

  // ── Clasificación de asunto ───────────────────────────────
  function classifySubject(subj) {
    if (!subj) return null;
    for (const [cat, pat] of Object.entries(CAT_PATTERNS)) {
      if (pat.test(subj)) return cat;
    }
    return null;
  }
  function normalizeSubject(s) {
    return String(s || '').replace(/^(re|rv|fw|fwd|reenviado|re\s*\d+):\s*/i, '')
                           .trim().toLowerCase();
  }

  // ── Lectura XLSX (ExcelJS) ────────────────────────────────
  function readBuffer(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(new Error('No se pudo leer el archivo'));
      r.onload  = e => res(e.target.result);
      r.readAsArrayBuffer(file);
    });
  }

  async function parseXLSX(file) {
    const buf = await readBuffer(file);
    const wb  = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('El archivo no contiene hojas');
    let headers = null;
    const rows  = [];
    ws.eachRow({ includeEmpty: false }, (row, rn) => {
      const vals = row.values.slice(1);
      if (rn === 1) {
        headers = vals.map(v => String(v || '').trim());
        return;
      }
      if (!headers) return;
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] !== undefined ? vals[i] : null); });
      rows.push(obj);
    });
    return rows;
  }

  // ── Procesado de filas ────────────────────────────────────
  function processReceived(rawRows) {
    if (rawRows.length) console.log('[em-recv] cols:', Object.keys(rawRows[0]));
    // No se filtra por Tamaño: la columna puede tener distintos nombres/formatos
    // según la versión de Outlook. Solo se excluyen filas sin fecha válida (al final).
    return rawRows
      .map(r => {
        const dt  = parseXLSXDate(col(r, 'Recibido', 'recibido'));
        const asunto = String(col(r, 'Asunto', 'asunto') || '');
        const cat = classifySubject(asunto);
        return {
          date:        dt,
          dateKey:     toDateKey(dt),
          asunto,
          de:          String(col(r, 'De', 'de') || ''),
          para:        String(col(r, 'Para', 'para') || ''),
          categoria:   cat,
          normSubject: normalizeSubject(asunto),
          isSlot:      cat !== null,
        };
      })
      .filter(r => r.dateKey);
  }

  function processSent(rawRows) {
    if (rawRows.length) console.log('[em-sent] cols:', Object.keys(rawRows[0]));
    return rawRows
      .map(r => {
        const dt     = parseXLSXDate(col(r, 'Enviado el', 'enviado el', 'Enviado El'));
        const asunto = String(col(r, 'Asunto', 'asunto') || '');
        const cat    = classifySubject(asunto);
        return {
          date:        dt,
          dateKey:     toDateKey(dt),
          asunto,
          para:        String(col(r, 'Para', 'para') || ''),
          categoria:   cat,
          normSubject: normalizeSubject(asunto),
        };
      })
      .filter(r => r.dateKey);
  }

  // ── Tiempo de respuesta ───────────────────────────────────
  function calcRT() {
    if (!st.sent.length) return null;
    const sentIdx = {};
    st.sent.forEach(s => {
      if (s.normSubject) (sentIdx[s.normSubject] = sentIdx[s.normSubject] || []).push(s);
    });
    const hourPairs = [], dayPairs = [];
    const hasHour = d => d && (d.getHours() + d.getMinutes() > 0);
    st.received.filter(r => r.isSlot).forEach(r => {
      const cands = sentIdx[r.normSubject] || [];
      if (!cands.length) return;
      let bestH = null, bestD = null;
      cands.forEach(s => {
        if (!s.date || !r.date || s.date < r.date) return;
        if (hasHour(r.date) && hasHour(s.date)) {
          const dh = (s.date - r.date) / 3600000;
          if (dh >= 0 && (bestH === null || dh < bestH.dh))
            bestH = { dh, cat: r.categoria };
        } else {
          const rd = new Date(r.date.getFullYear(), r.date.getMonth(), r.date.getDate());
          const sd = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate());
          const dd = (sd - rd) / 86400000;
          if (dd >= 0 && dd <= 30 && (bestD === null || dd < bestD.dd))
            bestD = { dd, cat: r.categoria };
        }
      });
      if (bestH) hourPairs.push(bestH);
      else if (bestD) dayPairs.push(bestD);
    });
    const byCat = {};
    CAT_ORDER.forEach(c => {
      byCat[c] = {
        hours: hourPairs.filter(p => p.cat === c).map(p => p.dh),
        days:  dayPairs.filter(p => p.cat === c).map(p => p.dd),
      };
    });
    return { byCat, hourPairs, dayPairs };
  }

  function statsH(lst) {
    if (!lst || !lst.length) return null;
    const n = lst.length, s = [...lst].sort((a, b) => a - b);
    const avg = lst.reduce((a, b) => a + b, 0) / n;
    const med = n % 2 ? s[Math.floor(n / 2)] : (s[n/2-1] + s[n/2]) / 2;
    return { n, avg: avg.toFixed(1), min: s[0].toFixed(1), max: s[n-1].toFixed(1),
             median: med.toFixed(1), pct24: ((lst.filter(x => x <= 24).length / n) * 100).toFixed(0) };
  }
  function statsD(lst) {
    if (!lst || !lst.length) return null;
    const n = lst.length;
    const avg = lst.reduce((a, b) => a + b, 0) / n;
    const sd = lst.filter(x => x === 0).length;
    const nd = lst.filter(x => x === 1).length;
    const ld = lst.filter(x => x >= 2).length;
    return { n, avg: avg.toFixed(2), sameDay: sd, nextDay: nd, late: ld,
             pctSame: ((sd / n) * 100).toFixed(0) };
  }

  // ── Agrupaciones ─────────────────────────────────────────
  function calcKPIs() {
    const recv = st.filtered, sent = st.sent;
    const nSlots     = recv.filter(r => r.isSlot).length;
    const nSentSlots = sent.filter(s => s.categoria).length;
    const days = new Set(recv.map(r => r.dateKey).filter(Boolean));
    const byday = {};
    recv.forEach(r => { if (r.dateKey) byday[r.dateKey] = (byday[r.dateKey] || 0) + 1; });
    const peak = Object.entries(byday).sort((a, b) => b[1] - a[1])[0] || null;
    const cats = {};
    CAT_ORDER.forEach(c => (cats[c] = recv.filter(r => r.categoria === c).length));
    return { total: recv.length, totalSent: sent.length, nSlots, nSentSlots,
             days: days.size, peak, cats,
             avgDay: days.size > 0 ? (recv.length / days.size).toFixed(1) : '—' };
  }

  function groupByDay() {
    const rMap = {}, sMap = {};
    st.filtered.forEach(r => {
      if (!r.dateKey) return;
      if (!rMap[r.dateKey]) rMap[r.dateKey] = { total: 0, ...Object.fromEntries(CAT_ORDER.map(c => [c, 0])) };
      rMap[r.dateKey].total++;
      if (r.categoria) rMap[r.dateKey][r.categoria]++;
    });
    st.sent.forEach(s => { if (s.dateKey) sMap[s.dateKey] = (sMap[s.dateKey] || 0) + 1; });
    const keys = [...new Set([...Object.keys(rMap), ...Object.keys(sMap)])].sort();
    return keys.map(k => ({
      key: k,
      ...(rMap[k] || { total: 0, ...Object.fromEntries(CAT_ORDER.map(c => [c, 0])) }),
      sent: sMap[k] || 0,
    }));
  }

  function last14() {
    // Usar los últimos 14 días con datos reales (no calendario desde hoy)
    const allKeys = [...new Set(
      st.filtered.filter(r => r.dateKey && r.categoria).map(r => r.dateKey)
    )].sort();
    // Tomar los últimos 14 días del dataset que tengan solicitudes
    // y rellenar los huecos dentro de ese rango
    if (!allKeys.length) return { keys: [], sd: {} };
    const lastKey  = allKeys[allKeys.length - 1];
    const firstKey = allKeys.length >= 14
      ? allKeys[allKeys.length - 14]
      : allKeys[0];
    // Generar rango continuo desde firstKey hasta lastKey
    const keys = [];
    let cur = new Date(firstKey + 'T00:00:00');
    const end = new Date(lastKey  + 'T00:00:00');
    while (cur <= end) {
      keys.push(toDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const sd = {};
    st.filtered.forEach(r => {
      if (!r.dateKey || !r.categoria) return;
      if (!sd[r.dateKey]) sd[r.dateKey] = Object.fromEntries(CAT_ORDER.map(c => [c, 0]));
      sd[r.dateKey][r.categoria]++;
    });
    return { keys, sd };
  }

  function topSenders(n = 8) {
    const m = {};
    st.filtered.filter(r => r.isSlot).forEach(r => {
      const k = (r.de || '(sin remitente)').trim();
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  // ── Drill-down por día ──────────────────────────────────
  function filterByDay(key) {
    const from = document.getElementById('em-date-from');
    const to   = document.getElementById('em-date-to');
    if (from) from.value = key;
    if (to)   to.value   = key;
    applyFilters();
    setTimeout(() => {
      const bar = document.getElementById('em-day-filter-bar');
      if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function clearDayFilter() {
    const from = document.getElementById('em-date-from');
    const to   = document.getElementById('em-date-to');
    if (from) from.value = '';
    if (to)   to.value   = '';
    applyFilters();
  }

  // ── Filtros ───────────────────────────────────────────────
  function applyFilters() {
    const q     = (document.getElementById('em-search')?.value    || '').toLowerCase();
    const fType =  document.getElementById('em-filter-type')?.value || 'all';
    const fFrom =  document.getElementById('em-filter-from')?.value || '';
    const dFrom =  document.getElementById('em-date-from')?.value;
    const dTo   =  document.getElementById('em-date-to')?.value;
    const dtFrom = dFrom ? new Date(dFrom + 'T00:00:00') : null;
    const dtTo   = dTo   ? new Date(dTo   + 'T23:59:59') : null;
    st.filtered = st.received.filter(r => {
      if (dtFrom && r.date && r.date < dtFrom) return false;
      if (dtTo   && r.date && r.date > dtTo)   return false;
      if (fType === 'slots'  && !r.isSlot)                   return false;
      if (fType === 'alta'   && r.categoria !== 'Alta')          return false;
      if (fType === 'mod'    && r.categoria !== 'Modificación')  return false;
      if (fType === 'cancel' && r.categoria !== 'Cancelación')   return false;
      if (fType === 'demora' && r.categoria !== 'Demora')        return false;
      if (fFrom && !r.de.toLowerCase().includes(fFrom.toLowerCase())) return false;
      if (q && !`${r.asunto} ${r.de}`.toLowerCase().includes(q)) return false;
      return true;
    });
    renderAll();
  }

  // ── Helpers UI ────────────────────────────────────────────
  const fmt = n => Number(n).toLocaleString('es-MX');
  const esc = s => String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function setKPI(id, val, sub) {
    const el = document.getElementById(id); if (!el) return;
    const v = el.querySelector('.em-kpi-val'), s = el.querySelector('.em-kpi-sub');
    if (v) v.textContent = val;
    if (s && sub !== undefined) s.textContent = sub;
  }

  function populateSenderFilter() {
    const sel = document.getElementById('em-filter-from'); if (!sel) return;
    const senders = [...new Set(st.received.map(r => r.de).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Todos los remitentes</option>' +
      senders.slice(0, 100).map(s => `<option value="${esc(s)}">${esc(s.slice(0, 60))}</option>`).join('');
  }

  // ── Render ────────────────────────────────────────────────
  function renderAll() { renderKPIs(); renderDaySummary(); renderCharts(); renderRTSection(); renderTable(); }

  function renderKPIs() {
    const k = calcKPIs();
    setKPI('em-kpi-total',      fmt(k.total),       `${k.days} días · ~${k.avgDay}/día`);
    setKPI('em-kpi-slots',      fmt(k.nSlots),       'Total solicitudes de slot');
    setKPI('em-kpi-replied',    fmt(k.nSentSlots),   'Slot respondidas/enviadas');
    setKPI('em-kpi-pending',    fmt(k.totalSent),    'Total enviados');
    const pk = document.getElementById('em-kpi-peak');
    if (pk) {
      pk.querySelector('.em-kpi-val').textContent = k.peak ? fmtDateKey(k.peak[0]) : '—';
      pk.querySelector('.em-kpi-sub').textContent = k.peak ? `${k.peak[1]} correos` : '';
    }
    setKPI('em-kpi-cat-alta',   fmt(k.cats['Alta']         || 0), 'Alta');
    setKPI('em-kpi-cat-mod',    fmt(k.cats['Modificación'] || 0), 'Modificación');
    setKPI('em-kpi-cat-cancel', fmt(k.cats['Cancelación']  || 0), 'Cancelación');
    setKPI('em-kpi-cat-demora', fmt(k.cats['Demora']       || 0), 'Demora');
  }

  // ── Tabla resumen por día ───────────────────────────────
  // groupByDay para el resumen: SIEMPRE usa st.received completo (no st.filtered)
  // para mostrar el panorama total sin que lo afecten los filtros activos.
  function groupByDayAll() {
    const rMap = {}, sMap = {};
    st.received.forEach(r => {
      if (!r.dateKey) return;
      if (!rMap[r.dateKey]) rMap[r.dateKey] = { total: 0, ...Object.fromEntries(CAT_ORDER.map(c => [c, 0])) };
      rMap[r.dateKey].total++;
      if (r.categoria) rMap[r.dateKey][r.categoria]++;
    });
    st.sent.forEach(s => { if (s.dateKey) sMap[s.dateKey] = (sMap[s.dateKey] || 0) + 1; });
    const keys = [...new Set([...Object.keys(rMap), ...Object.keys(sMap)])].sort();
    return keys.map(k => ({
      key: k,
      ...(rMap[k] || { total: 0, ...Object.fromEntries(CAT_ORDER.map(c => [c, 0])) }),
      sent: sMap[k] || 0,
    }));
  }

  function renderDaySummary() {
    const cont = document.getElementById('em-day-summary'); if (!cont) return;
    const byDay = groupByDayAll();
    if (!byDay.length) {
      cont.innerHTML = '<p class="text-muted small mb-0">Sin datos.</p>';
      return;
    }

    // Totales para barra de progreso
    const totalRecv = byDay.reduce((s, d) => s + d.total, 0);
    const maxRecv   = Math.max(...byDay.map(d => d.total), 1);

    let html = `
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0 align-middle" style="font-size:.82rem">
          <thead class="table-light">
            <tr>
              <th style="min-width:110px">Fecha</th>
              <th class="text-center" title="Correos recibidos">Recibidos</th>
              <th class="text-center" title="Correos enviados">Enviados</th>
              <th class="text-center" style="color:${CAT_COLORS['Alta']}" title="Alta de slot">↑ Alta</th>
              <th class="text-center" style="color:${CAT_COLORS['Modificación']}" title="Modificación">~ Modif.</th>
              <th class="text-center" style="color:${CAT_COLORS['Cancelación']}" title="Cancelación">✕ Cancel.</th>
              <th class="text-center" style="color:${CAT_COLORS['Demora']}" title="Demora">⌛ Demora</th>
              <th class="text-center text-muted">Otros</th>
              <th style="min-width:90px">% Solicitudes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>`;

    byDay.forEach(d => {
      const nSlot  = CAT_ORDER.reduce((s, c) => s + (d[c] || 0), 0);
      const nOther = d.total - nSlot;
      const pct    = d.total > 0 ? Math.round((nSlot / d.total) * 100) : 0;
      const barW   = Math.round((d.total / maxRecv) * 100);
      const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#64748b';

      html += `<tr>
        <td class="fw-semibold" style="white-space:nowrap">${fmtDateKey(d.key)}</td>
        <td class="text-center fw-semibold text-primary">${d.total}</td>
        <td class="text-center text-secondary">${d.sent || 0}</td>
        <td class="text-center">${d['Alta'] || 0 ? `<span class="badge" style="background:${CAT_COLORS['Alta']}22;color:${CAT_COLORS['Alta']};border:1px solid ${CAT_COLORS['Alta']}44">${d['Alta']}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="text-center">${d['Modificación'] || 0 ? `<span class="badge" style="background:${CAT_COLORS['Modificación']}22;color:${CAT_COLORS['Modificación']};border:1px solid ${CAT_COLORS['Modificación']}44">${d['Modificación']}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="text-center">${d['Cancelación'] || 0 ? `<span class="badge" style="background:${CAT_COLORS['Cancelación']}22;color:${CAT_COLORS['Cancelación']};border:1px solid ${CAT_COLORS['Cancelación']}44">${d['Cancelación']}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="text-center">${d['Demora'] || 0 ? `<span class="badge" style="background:${CAT_COLORS['Demora']}22;color:${CAT_COLORS['Demora']};border:1px solid ${CAT_COLORS['Demora']}44">${d['Demora']}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="text-center text-muted">${nOther || '<span class="text-muted">—</span>'}</td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="width:${barW}%;height:100%;background:${barColor};border-radius:3px"></div>
            </div>
            <span style="font-size:.72rem;min-width:28px;text-align:right;color:${barColor};font-weight:600">${pct}%</span>
          </div>
        </td>
        <td>
          <button class="btn btn-link btn-sm p-0 em-day-row-btn" data-key="${d.key}"
                  title="Ver todos los correos de este día" style="font-size:.78rem;color:#3b82f6">
            <i class="fas fa-search-plus"></i>
          </button>
        </td>
      </tr>`;
    });

    // Fila totales
    const totSent = byDay.reduce((s, d) => s + (d.sent || 0), 0);
    const totSlot = byDay.reduce((s, d) => s + CAT_ORDER.reduce((a, c) => a + (d[c]||0), 0), 0);
    const totOther = totalRecv - totSlot;
    const totPct  = totalRecv > 0 ? Math.round((totSlot / totalRecv) * 100) : 0;
    html += `<tr class="table-secondary fw-bold">
      <td>TOTAL</td>
      <td class="text-center text-primary">${fmt(totalRecv)}</td>
      <td class="text-center">${fmt(totSent)}</td>
      ${CAT_ORDER.map(c => `<td class="text-center">${fmt(byDay.reduce((s,d)=>s+(d[c]||0),0))}</td>`).join('')}
      <td class="text-center">${fmt(totOther)}</td>
      <td><span style="font-size:.78rem">${totPct}% solicitudes</span></td>
      <td></td>
    </tr>`;

    html += '</tbody></table></div>';
    cont.innerHTML = html;

    cont.querySelectorAll('.em-day-row-btn').forEach(btn =>
      btn.addEventListener('click', () => filterByDay(btn.dataset.key)));
  }

  function renderCharts() {
    if (!window.echarts) return;
    const byDay  = groupByDay();
    const labels = byDay.map(r => fmtDateKey(r.key));

    // Chart 1 – Correos por día (clic → drill-down)
    const el1 = document.getElementById('em-chart-day');
    if (el1) {
      if (st.charts.day) { try { st.charts.day.dispose(); } catch (_) {} }
      el1.innerHTML = '';
      if (byDay.length) {
        const c = window.echarts.init(el1);
        c.setOption({
          tooltip: { trigger: 'axis', extraCssText: 'pointer-events:none' },
          legend:  { data: ['Recibidos', 'Enviados'], top: 0 },
          grid:    { left: 42, right: 20, top: 36, bottom: 60 },
          xAxis:   { type: 'category', data: labels, axisLabel: { rotate: 45, fontSize: 10 } },
          yAxis:   { type: 'value' },
          series: [
            { name: 'Recibidos', type: 'bar', data: byDay.map(r => r.total), barMaxWidth: 18,
              cursor: 'pointer', itemStyle: { color: '#1e40af', borderRadius: [3,3,0,0] } },
            { name: 'Enviados',  type: 'bar', data: byDay.map(r => r.sent),  barMaxWidth: 18,
              cursor: 'pointer', itemStyle: { color: '#60a5fa', borderRadius: [3,3,0,0] } },
          ],
        });
        c.on('click', params => {
          const item = byDay[params.dataIndex];
          if (item) filterByDay(item.key);
        });
        el1.title = 'Haz clic en una barra para ver todos los correos de ese día';
        st.charts.day = c;
      } else {
        el1.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem">Sin datos con fecha válida</div>';
      }
    }

    // Chart 2 – Distribución por categoría (dona)
    const el2 = document.getElementById('em-chart-resp');
    if (el2) {
      if (st.charts.resp) { try { st.charts.resp.dispose(); } catch (_) {} }
      el2.innerHTML = '';
      const catData = CAT_ORDER.map(c => ({
        value: st.filtered.filter(r => r.categoria === c).length,
        name:  c, itemStyle: { color: CAT_COLORS[c] },
      })).filter(d => d.value > 0);
      const noSlot = st.filtered.filter(r => !r.isSlot).length;
      if (noSlot > 0) catData.unshift({ value: noSlot, name: 'Otros', itemStyle: { color: '#94a3b8' } });
      if (catData.length) {
        const c = window.echarts.init(el2);
        c.setOption({
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend:  { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
          series: [{ type: 'pie', radius: ['42%', '68%'], center: ['38%', '50%'],
                     label: { show: true, fontSize: 10 }, data: catData }],
        });
        st.charts.resp = c;
      }
    }

    // Chart 3 – Top remitentes slot
    const el3 = document.getElementById('em-chart-senders');
    if (el3) {
      if (st.charts.senders) { try { st.charts.senders.dispose(); } catch (_) {} }
      el3.innerHTML = '';
      const top = topSenders(8);
      if (top.length) {
        const c = window.echarts.init(el3);
        c.setOption({
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid:    { left: 10, right: 20, top: 10, bottom: 10, containLabel: true },
          xAxis:   { type: 'value' },
          yAxis:   { type: 'category', data: top.map(([k]) => k).reverse(),
                     axisLabel: { fontSize: 10, overflow: 'truncate', width: 180 } },
          series: [{ type: 'bar', data: top.map(([, v]) => v).reverse(), barMaxWidth: 22,
                     itemStyle: { color: '#8b5cf6', borderRadius: [0,4,4,0] } }],
        });
        st.charts.senders = c;
      } else {
        el3.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem">No hay solicitudes de slot detectadas</div>';
      }
    }

    // Chart 4 – Solicitudes slot últimos 14 días con datos (barras apiladas, clic → drill-down)
    const el4 = document.getElementById('em-chart-slot-daily');
    if (el4) {
      if (st.charts.slotDaily) { try { st.charts.slotDaily.dispose(); } catch (_) {} }
      el4.innerHTML = '';
      const { keys, sd } = last14();
      const dayLabels = keys.map(fmtDateKey);
      if (keys.length && keys.some(k => sd[k])) {
        const c = window.echarts.init(el4);
        c.setOption({
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend:  { data: CAT_ORDER, top: 0 },
          grid:    { left: 42, right: 20, top: 36, bottom: 60 },
          xAxis:   { type: 'category', data: dayLabels, axisLabel: { rotate: 45, fontSize: 10 } },
          yAxis:   { type: 'value' },
          series: CAT_ORDER.map(cat => ({
            name: cat, type: 'bar', stack: 'total',
            cursor: 'pointer',
            data: keys.map(k => (sd[k] || {})[cat] || 0),
            itemStyle: { color: CAT_COLORS[cat] },
          })),
        });
        c.on('click', params => {
          if (keys[params.dataIndex]) filterByDay(keys[params.dataIndex]);
        });
        el4.title = 'Haz clic en una barra para ver todos los correos de ese día';
        st.charts.slotDaily = c;
      } else {
        el4.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.85rem">Sin solicitudes de slot en el período. Revisa que los asuntos de los correos contengan palabras como: <em>asignación, modificación, cancelación, demora, slot</em></div>';
      }
    }

    // Resize todos los gráficos después de que el navegador termine de pintar
    setTimeout(() => {
      Object.values(st.charts).forEach(c => { try { if (c?.resize) c.resize(); } catch (_) {} });
    }, 120);
  }

  // ── Sección tiempo de respuesta ───────────────────────────
  function renderRTSection() {
    const sec = document.getElementById('em-rt-section'); if (!sec) return;
    const rt  = calcRT();
    if (!rt) {
      sec.innerHTML = '<p class="text-muted small mb-0"><i class="fas fa-info-circle me-1"></i>Carga el archivo de <strong>Elementos enviados</strong> para calcular el tiempo de respuesta.</p>';
      return;
    }
    let html = '';
    const allH = rt.hourPairs.map(p => p.dh);
    if (allH.length) {
      const ov = statsH(allH);
      html += `<p class="small fw-semibold text-primary mb-1">Tabla A — Precisión horaria (${ov.n} pares con hora exacta)</p>
<div class="table-responsive mb-4"><table class="table table-sm table-bordered mb-0" style="font-size:.8rem">
<thead class="table-dark"><tr><th>Categoría</th><th>N</th><th>Promedio</th><th>Mediana</th><th>Mínimo</th><th>Máximo</th><th>% ≤ 24 h</th></tr></thead><tbody>`;
      CAT_ORDER.forEach(cat => {
        const s = statsH(rt.byCat[cat]?.hours || []); if (!s) return;
        const cls = Number(s.pct24) >= 80 ? 'text-success fw-semibold' : Number(s.pct24) >= 50 ? 'text-warning fw-semibold' : 'text-danger fw-semibold';
        html += `<tr><td><span class="badge" style="background:${CAT_COLORS[cat]}22;color:${CAT_COLORS[cat]};border:1px solid ${CAT_COLORS[cat]}55">${esc(cat)}</span></td>
<td>${s.n}</td><td>${s.avg} h</td><td>${s.median} h</td><td>${s.min} h</td><td>${s.max} h</td><td class="${cls}">${s.pct24}%</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    const allD = rt.dayPairs.map(p => p.dd);
    if (allD.length) {
      const ov = statsD(allD);
      html += `<p class="small fw-semibold text-primary mb-1">Tabla B — Precisión de día (${ov.n} pares solo con fecha)</p>
<div class="table-responsive"><table class="table table-sm table-bordered mb-0" style="font-size:.8rem">
<thead class="table-dark"><tr><th>Categoría</th><th>N</th><th>Prom. días</th><th>Mismo día</th><th>Día sig.</th><th>2+ días</th><th>% mismo día</th></tr></thead><tbody>`;
      CAT_ORDER.forEach(cat => {
        const s = statsD(rt.byCat[cat]?.days || []); if (!s) return;
        const cls = Number(s.pctSame) >= 70 ? 'text-success fw-semibold' : Number(s.pctSame) >= 40 ? 'text-warning fw-semibold' : 'text-danger fw-semibold';
        html += `<tr><td><span class="badge" style="background:${CAT_COLORS[cat]}22;color:${CAT_COLORS[cat]};border:1px solid ${CAT_COLORS[cat]}55">${esc(cat)}</span></td>
<td>${s.n}</td><td>${s.avg} d</td><td>${s.sameDay}</td><td>${s.nextDay}</td><td>${s.late}</td><td class="${cls}">${s.pctSame}%</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    if (!allH.length && !allD.length) {
      html = '<p class="text-muted small mb-0">No se encontraron pares solicitud-respuesta. Verifica que los asuntos coincidan entre ambos archivos.</p>';
    }
    sec.innerHTML = html;
  }

  // ── Tabla de detalle ──────────────────────────────────────
  function fmtTime(d) {
    if (!d || !(d.getHours() + d.getMinutes())) return '';
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function renderTable() {
    const tbody  = document.getElementById('em-table-body');   if (!tbody) return;
    const count  = document.getElementById('em-table-count');
    const dayBar = document.getElementById('em-day-filter-bar');
    const scroll = document.getElementById('em-table-scroll');

    const dFrom = document.getElementById('em-date-from')?.value || '';
    const dTo   = document.getElementById('em-date-to')?.value   || '';
    const isSingleDay = dFrom && dTo && dFrom === dTo;

    // ── Banner de día seleccionado ──────────────────────────
    if (dayBar) {
      if (isSingleDay) {
        dayBar.innerHTML = `
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <i class="fas fa-calendar-day text-primary"></i>
            <span class="fw-semibold text-primary">Correos del ${fmtDateKey(dFrom)}</span>
            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary" style="font-size:.76rem">
              ${fmt(st.filtered.length)} recibidos
            </span>
            <button class="btn btn-sm btn-outline-secondary ms-auto" id="em-clear-day-btn" style="font-size:.74rem">
              <i class="fas fa-times me-1"></i>Ver todos los días
            </button>
          </div>`;
        dayBar.classList.remove('d-none');
        document.getElementById('em-clear-day-btn')?.addEventListener('click', clearDayFilter);
      } else {
        dayBar.innerHTML = '';
        dayBar.classList.add('d-none');
      }
    }

    // ── Altura de la tabla ──────────────────────────────────
    if (scroll) scroll.style.maxHeight = isSingleDay ? 'none' : '380px';

    // ── Filas a mostrar ─────────────────────────────────────
    const rows = isSingleDay ? st.filtered : st.filtered.slice(0, 200);
    const extra = !isSingleDay && st.filtered.length > 200
      ? ` · <em class="text-primary" style="font-size:.7rem">clic en barra del gráfico para ver un día completo</em>` : '';
    if (count) count.innerHTML = `${fmt(rows.length)} correos recibidos${extra}`;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Sin correos para los filtros aplicados</td></tr>';
    } else {
      tbody.innerHTML = rows.map(r => {
        const badge = r.categoria
          ? `<span class="badge" style="background:${CAT_COLORS[r.categoria]}22;color:${CAT_COLORS[r.categoria]};border:1px solid ${CAT_COLORS[r.categoria]}55;font-size:.68rem">${esc(r.categoria)}</span>`
          : '<span class="badge bg-light text-secondary border" style="font-size:.68rem">Otro</span>';
        const t = fmtTime(r.date);
        const dateCell = r.dateKey
          ? `<span class="text-muted">${fmtDateKey(r.dateKey)}</span>${t ? `<span class="ms-1 text-muted" style="font-size:.7rem">${t}</span>` : ''}`
          : '<span class="text-warning">sin fecha</span>';
        const drillBtn = !isSingleDay
          ? `<button class="btn btn-link btn-sm p-0 text-muted em-drill-btn" data-key="${r.dateKey}" title="Ver todos los correos de este día" style="font-size:.7rem"><i class="fas fa-search-plus"></i></button>`
          : '';
        return `<tr>
          <td class="small" style="white-space:nowrap">${dateCell}</td>
          <td class="small">${esc(r.de.slice(0, 60))}</td>
          <td class="small">${esc(r.asunto.slice(0, 100))}</td>
          <td>${badge}</td>
          <td>${drillBtn}</td>
        </tr>`;
      }).join('');

      // Delegación para botones de lupa
      tbody.querySelectorAll('.em-drill-btn').forEach(btn =>
        btn.addEventListener('click', () => filterByDay(btn.dataset.key)));
    }

    // ── Correos enviados ese día ────────────────────────────
    const tableCard = tbody.closest('.rounded-4');
    const oldSent   = document.getElementById('em-day-sent-section');
    if (oldSent) oldSent.remove();

    if (isSingleDay && tableCard) {
      const sentDay = st.sent.filter(s => s.dateKey === dFrom);
      if (sentDay.length) {
        const sec = document.createElement('div');
        sec.id = 'em-day-sent-section';
        sec.className = 'border-top';
        sec.innerHTML = `
          <div class="px-3 pt-3 pb-2 d-flex align-items-center gap-2 border-bottom">
            <i class="fas fa-paper-plane text-success"></i>
            <h6 class="fw-semibold mb-0 small text-muted text-uppercase">Correos enviados ese día</h6>
            <span class="badge bg-success ms-1" style="font-size:.72rem">${sentDay.length}</span>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0" style="font-size:.8rem">
              <thead class="table-light">
                <tr><th>Hora</th><th>Para</th><th>Asunto</th><th>Categoría</th></tr>
              </thead>
              <tbody>
                ${sentDay.sort((a, b) => (a.date || 0) - (b.date || 0)).map(s => {
                  const badge = s.categoria
                    ? `<span class="badge" style="background:${CAT_COLORS[s.categoria]}22;color:${CAT_COLORS[s.categoria]};border:1px solid ${CAT_COLORS[s.categoria]}55;font-size:.68rem">${esc(s.categoria)}</span>`
                    : '<span class="badge bg-light text-secondary border" style="font-size:.68rem">Otro</span>';
                  const t2 = fmtTime(s.date) || '—';
                  return `<tr>
                    <td class="small text-muted" style="white-space:nowrap">${t2}</td>
                    <td class="small">${esc((s.para || '').slice(0, 60))}</td>
                    <td class="small">${esc((s.asunto || '').slice(0, 100))}</td>
                    <td>${badge}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
        tableCard.appendChild(sec);
      }
    }
  }

  // ── Carga de archivos ─────────────────────────────────────
  function setStatus(type, msg, ok) {
    const id = type === 'recv' ? 'em-status-recv' : 'em-status-sent';
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = `<span class="${ok ? 'text-success' : 'text-danger'}"><i class="fas fa-${ok ? 'check-circle' : 'times-circle'} me-1"></i>${esc(msg)}</span>`;
  }

  async function loadFile(file, type) {
    setStatus(type, 'Cargando…', true);
    try {
      const raw = await parseXLSX(file);
      if (type === 'recv') {
        st.received = processReceived(raw);
        st.filtered = st.received.slice();
        st.loaded.recv = true;
        populateSenderFilter();
        setStatus(type, `${fmt(st.received.length)} correos de entrada cargados`, true);
      } else {
        st.sent = processSent(raw);
        st.loaded.sent = true;
        setStatus(type, `${fmt(st.sent.length)} correos enviados cargados`, true);
      }

      if (st.loaded.recv && st.loaded.sent) {
        // Ambos archivos listos → mostrar panel y renderizar
        showPanel();
        // setTimeout da tiempo al navegador para pintar el panel antes de que
        // ECharts intente medir el ancho de los contenedores
        setTimeout(applyFilters, 80);
      } else {
        // Un solo archivo cargado → pedir el otro
        const other = type === 'recv' ? 'em-status-sent' : 'em-status-recv';
        const otherEl = document.getElementById(other);
        if (otherEl && !otherEl.innerHTML.includes('cargados')) {
          otherEl.innerHTML = `<span class="text-warning"><i class="fas fa-arrow-up me-1"></i>Ahora carga este archivo para continuar</span>`;
        }
        // Pulsar visualmente el dropzone que falta
        const otherDz = type === 'recv' ? 'em-dropzone-sent' : 'em-dropzone-recv';
        const dz = document.getElementById(otherDz);
        if (dz) { dz.style.borderColor = '#f59e0b'; dz.style.background = '#fffbeb'; }
      }
    } catch (err) {
      setStatus(type, `Error: ${err.message}`, false);
      console.error('[email-analisis]', err);
    }
  }

  function showPanel() {
    document.getElementById('em-upload-area')?.classList.add('d-none');
    document.getElementById('em-panel')?.classList.remove('d-none');
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    if (!document.getElementById('email-analisis-section')) return;

    function setupDZ(dzId, inputId, type) {
      const dz = document.getElementById(dzId), inp = document.getElementById(inputId);
      if (!dz || !inp) return;
      dz.addEventListener('click',     ()  => inp.click());
      dz.addEventListener('dragover',  e   => { e.preventDefault(); dz.style.background = '#dbeafe'; });
      dz.addEventListener('dragleave', ()  => { dz.style.background = type === 'recv' ? '#f0f9ff' : '#f0fdf4'; });
      dz.addEventListener('drop',      e   => {
        e.preventDefault();
        dz.style.background = type === 'recv' ? '#f0f9ff' : '#f0fdf4';
        const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f, type);
      });
      inp.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) loadFile(f, type); });
    }

    setupDZ('em-dropzone-recv', 'em-file-input-recv', 'recv');
    setupDZ('em-dropzone-sent', 'em-file-input-sent', 'sent');

    ['em-search', 'em-date-from', 'em-date-to'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', applyFilters));
    ['em-filter-type', 'em-filter-from'].forEach(id =>
      document.getElementById(id)?.addEventListener('change', applyFilters));

    document.querySelectorAll('.em-reset-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        st.received = []; st.sent = []; st.filtered = [];
        st.loaded.recv = false; st.loaded.sent = false;
        Object.values(st.charts).forEach(c => { try { c?.dispose(); } catch (_) {} });
        st.charts = {};
        document.getElementById('em-upload-area')?.classList.remove('d-none');
        document.getElementById('em-panel')?.classList.add('d-none');
        ['em-file-input-recv', 'em-file-input-sent'].forEach(id => {
          const el = document.getElementById(id); if (el) el.value = '';
        });
        ['em-status-recv', 'em-status-sent'].forEach(id => {
          const el = document.getElementById(id); if (el) el.innerHTML = '';
        });
      }));

    // Toggle ocultar/mostrar tabla resumen por día
    document.getElementById('em-day-summary-toggle')?.addEventListener('click', () => {
      const wrap = document.getElementById('em-day-summary-wrap');
      const icon = document.getElementById('em-day-summary-icon');
      const btn  = document.getElementById('em-day-summary-toggle');
      if (!wrap) return;
      const hidden = wrap.style.display === 'none';
      wrap.style.display = hidden ? '' : 'none';
      if (icon) { icon.className = hidden ? 'fas fa-chevron-up me-1' : 'fas fa-chevron-down me-1'; }
      if (btn)  { btn.childNodes[btn.childNodes.length - 1].textContent = hidden ? 'Ocultar' : 'Mostrar'; }
    });

    window.addEventListener('email-analisis:visible', () => {
      Object.values(st.charts).forEach(c => { try { if (c?.resize) c.resize(); } catch (_) {} });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
