// ═══════════════════════════════════════════════════════════════════
//  AGENDA DE COMITÉS — js/agenda.js
//  Gestión de comités, sesiones y acuerdos del AIFA
// ═══════════════════════════════════════════════════════════════════

/* ── Constantes de colores por área ─────────────────────────────── */
const AG_AREA = {
    DPE:  { bg:'#eef2ff', color:'#312e81', border:'#4f46e5', name:'Planeación' },      // Indigo
    DA:   { bg:'#fffbeb', color:'#78350f', border:'#d97706', name:'Administración' },   // Amber
    DO:   { bg:'#ecfdf5', color:'#064e3b', border:'#059669', name:'Operación' },        // Esmeralda
    DCS:  { bg:'#eff6ff', color:'#1e3a8a', border:'#2563eb', name:'Comercial' },        // Azul
    GSO:  { bg:'#f5f3ff', color:'#4c1d95', border:'#7c3aed', name:'Seg. Operacional' }, // Violeta
    UT:   { bg:'#ecfeff', color:'#164e63', border:'#0891b2', name:'Transparencia' },    // Cian
    GC:   { bg:'#fdf2f8', color:'#831843', border:'#db2777', name:'Calidad' },          // Rosa
    AFAC: { bg:'#f8fafc', color:'#1e293b', border:'#475569', name:'AFAC' },             // Pizarra
};

const AG_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const AG_MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Estado interno ─────────────────────────────────────────────── */
let _ag = { comites:[], reuniones:[], acuerdos:[], ready:false, activeArea:'all', calMonth: new Date().getMonth() };

/* ── Supabase helper ────────────────────────────────────────────── */
function _agSB() { return window.supabaseClient || window._supabase || null; }

/* ── Carga de datos (lazy, con caché) ──────────────────────────── */
async function _agEnsureData(force) {
    if (_ag.ready && !force) return;

    /* Asegurar cliente Supabase (igual que el resto de la app) */
    if (typeof window.ensureSupabaseClient === 'function') {
        try { await window.ensureSupabaseClient(); } catch (_) {}
    }
    const sb = _agSB();
    if (!sb) { console.warn('[Agenda] Supabase client not available'); return; }

    const [rC, rR] = await Promise.all([
        sb.from('agenda_comites')
          .select('*')
          .eq('activo', true)
          .order('numero'),
        sb.from('agenda_reuniones')
          .select('id,comite_id,area,numero_sesion,fecha_sesion,hora_inicio,estatus,observaciones')
          .gte('fecha_sesion', '2026-01-01')
          .lte('fecha_sesion', '2026-12-31')
          .order('fecha_sesion'),
    ]);

    if (rC.error) console.error('[Agenda] comites error:', rC.error);
    if (rR.error) console.error('[Agenda] reuniones error:', rR.error);

    _ag.comites   = rC.data  || [];
    _ag.reuniones = rR.data  || [];
    _ag.ready = true;
    console.log(`[Agenda] Loaded: ${_ag.comites.length} comités, ${_ag.reuniones.length} reuniones`);
}

/* ─────────────────────────────────────────────────────────────────
   FILTRO DE ÁREA
───────────────────────────────────────────────────────────────────*/
function agFilterArea(area, btn) {
    document.querySelectorAll('.ag-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _ag.activeArea = area;

    const activeTabId = document.querySelector('#ag-main-tabs .nav-link.active')?.id;
    if (activeTabId === 'ag-tab-calendario') agLoadCalendario();
    else if (activeTabId === 'ag-tab-anual')     agLoadAnual();
    else if (activeTabId === 'ag-tab-comites')   agLoadComites();
    else if (activeTabId === 'ag-tab-reuniones') agLoadReuniones();
}

/* ─────────────────────────────────────────────────────────────────
   CALENDARIO GENERAL — grid mensual con detección de conflictos
───────────────────────────────────────────────────────────────────*/
async function agLoadCalendario() {
    const pane = document.getElementById('ag-pane-calendario');
    if (!pane) return;
    pane.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2 small">Cargando calendario…</p></div>`;
    await _agEnsureData();
    _agCalDraw();
}

/* Navega mes ±1 y redibuja */
function agCalNavMonth(delta) {
    _ag.calMonth = ((_ag.calMonth + delta + 12) % 12);
    _agCalDraw();
}

/* ── Renderiza el grid mensual completo ─────────────────────────── */
function _agCalDraw() {
    const pane = document.getElementById('ag-pane-calendario');
    if (!pane) return;

    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soon    = new Date(today.getTime() + 14 * 86400000); /* próximas 2 semanas */
    const area    = _ag.activeArea || 'all';
    const year    = 2026;
    const month   = _ag.calMonth;

    const reuniones = area === 'all'
        ? _ag.reuniones
        : _ag.reuniones.filter(r => r.area === area);

    /* Agrupar sesiones del mes visible */
    const byDay = {};
    reuniones.forEach(r => {
        const d = new Date(r.fecha_sesion + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() === month) {
            const k = d.getDate();
            if (!byDay[k]) byDay[k] = [];
            byDay[k].push(r);
        }
    });

    /* Conflictos del mes */
    const conflictDaysMonth = new Set(
        Object.entries(byDay).filter(([, a]) => a.filter(r=>r.estatus!=='Cancelada').length >= 2).map(([k]) => +k)
    );

    /* Estadísticas */
    const allSes    = Object.values(byDay).flat();
    const totalMes  = allSes.length;
    const celeb     = allSes.filter(r => r.estatus === 'Celebrada').length;
    const cancel    = allSes.filter(r => r.estatus === 'Cancelada').length;
    const nConfl    = conflictDaysMonth.size;

    /* ── CSS (siempre refrescado) ───────────────────────────────── */
    document.getElementById('ag-cal-style')?.remove();
    const s = document.createElement('style');
    s.id = 'ag-cal-style';
    s.textContent = `
    .ag-cal-cell { vertical-align:top; padding:7px 6px 5px; height:140px; position:relative; background:#fff; }
    .ag-cal-cell:hover { background:#f8fafc !important; }
    .ag-ev { display:block; padding:2px 7px; margin:1px 0; border-radius:4px; font-size:.69rem;
             white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;
             line-height:1.6; font-weight:600; color:#fff; transition:filter .12s; }
    .ag-ev:hover { filter:brightness(.84); }
    .ag-ev-past { opacity:.45; }
    .ag-ev-can  { text-decoration:line-through; opacity:.3; }
    .ag-ev-soon { box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55); }
    .ag-dn { width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center;
             font-size:.8rem; font-weight:600; border-radius:50%; color:#374151; }
    .ag-dn-today { background:#4f46e5; color:#fff !important; font-weight:800; }
    .ag-dn-past { color:#c9d2de; }
    `;
    document.head.appendChild(s);

    /* ─────────────────────────────────────────────────────────
       CABECERA
    ───────────────────────────────────────────────────────── */
    let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;margin-bottom:2px">
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="agCalNavMonth(-1)"
            style="width:34px;height:34px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;
            color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .12s"
            onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">
            <i class="fas fa-chevron-left" style="font-size:.62rem"></i>
        </button>
        <div style="padding:0 6px">
            <span style="font-size:1.6rem;font-weight:800;color:#0f172a;letter-spacing:-.025em">${AG_MONTHS_FULL[month]}</span>
            <span style="font-size:.95rem;color:#94a3b8;margin-left:7px;font-weight:400">${year}</span>
        </div>
        <button onclick="agCalNavMonth(1)"
            style="width:34px;height:34px;border:1px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;
            color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .12s"
            onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">
            <i class="fas fa-chevron-right" style="font-size:.62rem"></i>
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;border-radius:20px;padding:5px 13px">
            <i class="fas fa-calendar-check" style="color:#4f46e5;font-size:.65rem"></i>
            <strong style="font-size:.8rem;color:#0f172a">${totalMes}</strong>
            <span style="font-size:.73rem;color:#94a3b8">sesiones</span>
        </span>
        <span style="display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:5px 13px">
            <i class="fas fa-check-circle" style="color:#059669;font-size:.65rem"></i>
            <strong style="font-size:.8rem;color:#065f46">${celeb}</strong>
            <span style="font-size:.73rem;color:#6ee7b7">realizadas</span>
        </span>
        ${cancel > 0 ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#fef2f2;border:1px solid #fecaca;border-radius:20px;padding:5px 13px">
            <i class="fas fa-times-circle" style="color:#dc2626;font-size:.65rem"></i>
            <strong style="font-size:.8rem;color:#991b1b">${cancel}</strong>
            <span style="font-size:.73rem;color:#fca5a5">canceladas</span>
        </span>` : ''}
        ${nConfl > 0
            ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#fffbeb;border:1px solid #fde68a;border-radius:20px;padding:5px 13px">
                <i class="fas fa-exclamation-triangle" style="color:#d97706;font-size:.65rem"></i>
                <strong style="font-size:.8rem;color:#92400e">${nConfl}</strong>
                <span style="font-size:.73rem;color:#fbbf24">conflictos</span>
               </span>`
            : `<span style="display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:5px 13px">
                <i class="fas fa-shield-alt" style="color:#059669;font-size:.65rem"></i>
                <span style="font-size:.73rem;color:#065f46">Sin conflictos</span>
               </span>`}
      </div>
    </div>`;

    /* ─────────────────────────────────────────────────────────
       GRID
    ───────────────────────────────────────────────────────── */
    const DAYS_H = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    const firstDay  = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDow  = (firstDay.getDay() + 6) % 7;

    html += `<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-top:14px">
    <table style="border-collapse:collapse;min-width:980px;width:100%">
      <thead><tr style="background:#f8fafc">`;
    DAYS_H.forEach((d, i) => {
        const isWe = i >= 5;
        html += `<th style="width:14.28%;padding:9px 8px;text-align:center;font-size:.68rem;font-weight:700;
            letter-spacing:.08em;text-transform:uppercase;
            color:${isWe?'#7c3aed':'#64748b'};
            border-bottom:1px solid #e2e8f0;
            border-right:${i<6?'1px solid #f1f5f9':'none'}">${d}</th>`;
    });
    html += `</tr></thead><tbody>`;

    let day = 1, col = startDow;
    let row = '<tr>';
    for (let i = 0; i < startDow; i++) {
        row += `<td class="ag-cal-cell" style="background:#f8fafc;border-right:${i<6?'1px solid #f1f5f9':'none'}"></td>`;
    }

    while (day <= totalDays) {
        const sessions  = byDay[day] || [];
        const cellDate  = new Date(year, month, day);
        const isToday   = (year === now.getFullYear() && month === now.getMonth() && day === now.getDate());
        const isPastDay = cellDate < today;
        const isConfl   = conflictDaysMonth.has(day);
        const isWe      = col >= 5;

        const hasHourConfl = isConfl && (() => {
            const hm = sessions.filter(r=>r.hora_inicio&&r.estatus!=='Cancelada')
                .map(r=>{ const [h,m]=r.hora_inicio.split(':').map(Number); return h*60+m; });
            for (let i=0;i<hm.length;i++) for (let j=i+1;j<hm.length;j++)
                if (Math.abs(hm[i]-hm[j])<60) return true;
            return false;
        })();

        /* Estilo de celda — minimalista, borde superior como indicador */
        let cellTopBorder = '';
        let cellBg = isWe ? '#fafafa' : '#fff';
        if (isToday)           { cellBg = '#eef2ff'; cellTopBorder = 'border-top:3px solid #4f46e5;'; }
        else if (hasHourConfl) { cellBg = '#fef2f2'; cellTopBorder = 'border-top:3px solid #dc2626;'; }
        else if (isConfl)      { cellBg = '#fffbeb'; cellTopBorder = 'border-top:3px solid #d97706;'; }
        else if (isPastDay)    { cellBg = '#fafafa'; }

        row += `<td class="ag-cal-cell"
            style="background:${cellBg};${cellTopBorder}border-right:${col<6?'1px solid #f1f5f9':'none'}">`;


        /* Número de día — círculo limpio */
        const dnCls = isToday ? 'ag-dn ag-dn-today' : isPastDay ? 'ag-dn ag-dn-past' : 'ag-dn';
        row += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px">
            <span class="${dnCls}">${day}</span>
            ${isConfl
                ? `<span style="background:${hasHourConfl?'#dc2626':'#d97706'};color:#fff;
                    font-size:.54rem;padding:1px 5px;border-radius:10px;font-weight:700;margin-top:4px"
                    title="${sessions.filter(r=>r.estatus!=='Cancelada').length} comités coinciden">
                    ×${sessions.filter(r=>r.estatus!=='Cancelada').length}</span>`
                : (sessions.length > 1 ? `<span style="color:#cbd5e1;font-size:.58rem;margin-top:6px">${sessions.length}</span>` : '')}
        </div>`;

        /* Eventos — pills sólidos con color de área, texto blanco */
        const visible  = sessions.slice(0, 4);
        const overflow = sessions.length - 4;
        visible.forEach(r => {
            const comite   = _ag.comites.find(c => c.id === r.comite_id) || {};
            const ac       = AG_AREA[r.area] || AG_AREA.AFAC;
            const label    = comite.acronimo || (comite.nombre || '').split(' ').slice(0, 3).join(' ');
            const isCan    = r.estatus === 'Cancelada';
            const isCel    = r.estatus === 'Celebrada';
            const isUpSoon = !isPastDay && cellDate <= soon && !isCan;

            let extraCls = '';
            if (isCan)     extraCls = ' ag-ev-can';
            else if (isCel || isPastDay) extraCls = ' ag-ev-past';
            else if (isUpSoon)           extraCls = ' ag-ev-soon';

            const hora = r.hora_inicio ? r.hora_inicio.slice(0, 5) : '';
            const evBg = isCan ? '#9ca3af' : ac.border;

            row += `<span class="ag-ev${extraCls}"
                title="${comite.nombre || ''} — ${r.estatus}${hora?' · '+hora+'h':''}${r.observaciones?'\n'+r.observaciones:''}"
                style="background:${evBg}"
                onclick="_agShowComiteDetail('${r.comite_id}')">
                <span style="opacity:.7;font-size:.6rem;font-weight:700;margin-right:3px">${r.area}</span>${hora?`<span style="opacity:.7;font-size:.62rem;margin-right:2px">${hora}</span>`:''}${label}${isCel?'<span style="opacity:.65;margin-left:3px">✓</span>':''}${isUpSoon?'<span style="opacity:.65;margin-left:2px;font-size:.58rem">●</span>':''}
            </span>`;
        });
        if (overflow > 0) {
            row += `<div style="font-size:.6rem;color:#94a3b8;text-align:center;margin-top:1px;font-weight:500">+${overflow} más</div>`;
        }
        row += `</td>`;
        col++; day++;

        if (col === 7 || day > totalDays) {
            if (day > totalDays && col < 7)
                for (let i = col; i < 7; i++)
                    row += `<td class="ag-cal-cell" style="background:#f8fafc;border-right:${i<6?'1px solid #f1f5f9':'none'}"></td>`;
            row += '</tr>';
            html += row;
            if (day <= totalDays) { row = '<tr>'; col = 0; }
        }
    }

    html += `</tbody></table></div>`;

    /* ── Leyenda ────────────────────────────────────────────────── */
    html += `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:14px;align-items:center">
        <span style="font-size:.68rem;color:#94a3b8;font-weight:600;margin-right:3px">Áreas:</span>`;
    Object.entries(AG_AREA).forEach(([key, ac]) => {
        html += `<span style="display:inline-flex;align-items:center;gap:4px;background:${ac.bg};
            border:1px solid ${ac.border}55;border-radius:5px;padding:2px 9px;cursor:pointer;font-size:.67rem"
            onclick="agFilterArea('${key}',null)" title="Filtrar — ${ac.name}">
            <span style="width:8px;height:8px;border-radius:2px;background:${ac.border};flex-shrink:0;display:inline-block"></span>
            <span style="font-weight:700;color:${ac.color}">${key}</span>
            <span style="color:${ac.color};opacity:.65">— ${ac.name}</span>
        </span>`;
    });
    html += `</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;font-size:.67rem;color:#94a3b8">
        <span style="font-weight:600">Estados:</span>
        <span><span style="display:inline-block;background:#4f46e5;opacity:.45;color:#fff;padding:1px 7px;border-radius:3px;font-size:.62rem">Celebrada</span> atenuado</span>
        <span><span style="display:inline-block;background:#9ca3af;text-decoration:line-through;color:#fff;padding:1px 7px;border-radius:3px;font-size:.62rem">Cancelada</span> tachado</span>
        <span><span style="display:inline-block;background:#4f46e5;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55);color:#fff;padding:1px 7px;border-radius:3px;font-size:.62rem">● Próxima</span> ≤14 días</span>
        <span style="background:#eef2ff;border-top:3px solid #4f46e5;padding:1px 7px;border-radius:0 0 4px 4px;color:#3730a3;font-weight:600;font-size:.62rem">Hoy</span>
        <span style="background:#fef2f2;border-top:3px solid #dc2626;padding:1px 7px;border-radius:0 0 4px 4px;color:#dc2626;font-size:.62rem">Horas solapadas</span>
        <span style="background:#fffbeb;border-top:3px solid #d97706;padding:1px 7px;border-radius:0 0 4px 4px;color:#92400e;font-size:.62rem">Mismo día</span>
    </div>`;

    /* ── Detalle de conflictos del mes ──────────────────────────── */
    if (nConfl > 0) {
        const DOW = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        html += `<div class="mt-4 pt-3" style="border-top:2px dashed #e5e7eb">
            <div class="d-flex align-items-center gap-2 mb-3">
                <i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i>
                <h6 class="mb-0 fw-bold" style="color:#1e1b4b">Días con sesiones coincidentes — ${AG_MONTHS_FULL[month]}</h6>
                <span class="badge bg-warning text-dark">${nConfl} día${nConfl !== 1 ? 's' : ''}</span>
            </div>
            <div class="row g-2">`;

        [...conflictDaysMonth].sort((a, b) => a - b).forEach(d => {
            const sesiones = byDay[d].filter(r => r.estatus !== 'Cancelada');
            if (sesiones.length < 2) return;
            const dDate = new Date(year, month, d);
            const hMins = sesiones.filter(r => r.hora_inicio)
                .map(r => { const [h, m] = r.hora_inicio.split(':').map(Number); return h * 60 + m; });
            let hourConfl = false;
            outer: for (let i = 0; i < hMins.length; i++)
                for (let j = i + 1; j < hMins.length; j++)
                    if (Math.abs(hMins[i] - hMins[j]) < 60) { hourConfl = true; break outer; }

            html += `<div class="col-12 col-md-6">
            <div class="card border-0" style="box-shadow:0 2px 8px rgba(0,0,0,.08);border-top:3px solid ${hourConfl?'#f43f5e':'#f59e0b'}!important">
                <div class="card-header py-2 px-3 d-flex justify-content-between align-items-center"
                     style="background:${hourConfl?'#fff1f2':'#fffbeb'}">
                    <span class="fw-semibold" style="font-size:.82rem;color:${hourConfl?'#be123c':'#92400e'}">
                        ${DOW[dDate.getDay()]} ${d} de ${AG_MONTHS_FULL[month]}
                    </span>
                    <span class="badge" style="background:${hourConfl?'#f43f5e':'#f59e0b'};color:#fff;font-size:.62rem">
                        ${hourConfl ? '⚠ Horas solapadas' : 'Mismo día'}
                    </span>
                </div>
                <div class="card-body p-0">
                <table class="table table-sm mb-0" style="font-size:.76rem">
                    <thead class="table-light"><tr>
                        <th class="ps-3" style="width:60px">Hora</th>
                        <th>Área</th><th>Comité</th><th>Sesión</th>
                    </tr></thead><tbody>`;
            sesiones.slice().sort((a, b) => (a.hora_inicio||'').localeCompare(b.hora_inicio||'')).forEach(r => {
                const comite = _ag.comites.find(c => c.id === r.comite_id) || {};
                const ac     = AG_AREA[r.area] || AG_AREA.AFAC;
                const rHMin  = r.hora_inicio ? (() => { const [h,m]=r.hora_inicio.split(':').map(Number); return h*60+m; })() : null;
                const solapa = rHMin !== null && hMins.some(hm => hm !== rHMin && Math.abs(hm - rHMin) < 60);
                html += `<tr style="${solapa?'background:#fff1f2':''}" >
                    <td class="ps-3 fw-bold text-nowrap">${r.hora_inicio ? r.hora_inicio.slice(0,5)+'h' : '—'}</td>
                    <td><span style="background:${ac.bg};color:${ac.color};border:1px solid ${ac.border};
                        padding:1px 6px;border-radius:4px;font-size:.65rem;font-weight:600">${r.area}</span></td>
                    <td title="${comite.nombre||''}" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${comite.acronimo || (comite.nombre||'').slice(0,30)}</td>
                    <td class="text-muted pe-2">${r.numero_sesion||'—'}</td>
                </tr>`;
            });
            html += `</tbody></table></div></div></div>`;
        });
        html += `</div></div>`;
    }

    pane.innerHTML = html;
}

/* ── Modal de detalle de comité ─────────────────────────────────── */
function _agShowComiteDetail(comiteId) {
    const comite = _ag.comites.find(c => c.id === comiteId);
    if (!comite) return;

    const ac      = AG_AREA[comite.area] || AG_AREA.AFAC;
    const today   = new Date();
    const sesiones = _ag.reuniones
        .filter(r => r.comite_id === comiteId)
        .sort((a, b) => a.fecha_sesion.localeCompare(b.fecha_sesion));

    /* ── Integrantes ── */
    let integrantesHtml = '<p class="text-muted small mb-0">Sin información de integrantes registrada.</p>';
    if (comite.integrantes) {
        const items = comite.integrantes.split('|').map(s => s.trim()).filter(Boolean);
        integrantesHtml = `<ul class="list-unstyled mb-0">${
            items.map(item => {
                const [nombre, rol = ''] = item.split('—').map(s => s.trim());
                return `<li class="d-flex align-items-start gap-2 py-1" style="border-bottom:1px solid #f3f4f6">
                    <i class="fas fa-user-tie mt-1 flex-shrink-0" style="font-size:.6rem;color:${ac.color}"></i>
                    <span style="font-size:.82rem"><strong>${nombre}</strong>${rol ? `<span class="text-muted"> — ${rol}</span>` : ''}</span>
                </li>`;
            }).join('')
        }</ul>`;
    }

    /* ── Sesiones ── */
    let sesionesHtml = '<tr><td colspan="5" class="text-center text-muted py-3 small">Sin sesiones registradas para 2026</td></tr>';
    if (sesiones.length) {
        sesionesHtml = sesiones.map(r => {
            const d      = new Date(r.fecha_sesion + 'T00:00:00');
            const isCan  = r.estatus === 'Cancelada';
            const isCel  = r.estatus === 'Celebrada';
            const isPast = d < today;
            const badge  = isCan ? '#dc2626' : isCel ? '#16a34a' : isPast ? '#6b7280' : '#2563eb';
            return `<tr style="${isCan ? 'opacity:.55;text-decoration:line-through' : isCel ? 'background:#f0fdf4' : ''}">
                <td class="text-center fw-semibold" style="font-size:.78rem">${r.numero_sesion || '—'}</td>
                <td style="font-size:.78rem">${d.getDate()} ${AG_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}</td>
                <td class="text-center" style="font-size:.78rem">${r.hora_inicio ? r.hora_inicio.slice(0,5) + 'h' : '—'}</td>
                <td><span class="badge" style="background:${badge};font-size:.63rem">${r.estatus}</span></td>
                <td class="text-muted" style="font-size:.73rem">${r.observaciones || ''}</td>
            </tr>`;
        }).join('');
    }

    /* ── Eliminar modal previo ── */
    document.getElementById('_ag-det-modal')?.remove();

    const html = `
    <div class="modal fade" id="_ag-det-modal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content border-0" style="border-radius:14px;overflow:hidden">
          <div class="modal-header border-0 pb-2" style="background:${ac.bg}">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge fw-bold" style="background:${ac.bg};color:${ac.color};border:2px solid ${ac.border};font-size:.72rem">
                  ${comite.area}${comite.acronimo ? ' — ' + comite.acronimo : ''}
                </span>
                <span class="text-muted" style="font-size:.75rem">#${comite.numero}</span>
              </div>
              <h5 class="modal-title fw-bold mb-0" style="color:${ac.color};font-size:1rem;line-height:1.35">${comite.nombre}</h5>
              ${comite.frecuencia ? `<div class="mt-1 text-muted" style="font-size:.74rem"><i class="fas fa-redo me-1" style="color:${ac.color};opacity:.7"></i>${comite.frecuencia}</div>` : ''}
            </div>
            <button type="button" class="btn-close ms-3" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div style="height:4px;background:linear-gradient(90deg,${ac.border},${ac.color})"></div>

          <div class="modal-body p-4">

            ${comite.descripcion ? `
            <div class="mb-4">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-info-circle" style="color:${ac.color}"></i>
                <span class="fw-bold text-uppercase" style="font-size:.7rem;color:#6b7280;letter-spacing:.05em">Descripción General</span>
              </div>
              <p class="mb-0" style="font-size:.87rem">${comite.descripcion}</p>
            </div>` : ''}

            ${comite.fundamento ? `
            <div class="mb-4 p-3 rounded-3" style="background:#f8fafc;border-left:4px solid ${ac.border}">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-balance-scale" style="color:${ac.color}"></i>
                <span class="fw-bold text-uppercase" style="font-size:.7rem;color:${ac.color};letter-spacing:.05em">Fundamento Legal</span>
              </div>
              <p class="mb-0" style="font-size:.82rem;color:#374151">${comite.fundamento}</p>
            </div>` : ''}

            ${comite.integrantes ? `
            <div class="mb-4">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-users" style="color:${ac.color}"></i>
                <span class="fw-bold text-uppercase" style="font-size:.7rem;color:#6b7280;letter-spacing:.05em">Integrantes</span>
              </div>
              ${integrantesHtml}
            </div>` : ''}

            <div>
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-calendar-alt" style="color:${ac.color}"></i>
                <span class="fw-bold text-uppercase" style="font-size:.7rem;color:#6b7280;letter-spacing:.05em">Sesiones 2026</span>
                <span class="badge bg-secondary" style="font-size:.63rem">${sesiones.length}</span>
              </div>
              <div class="table-responsive">
                <table class="table table-sm table-hover mb-0" style="font-size:.77rem">
                  <thead class="table-light">
                    <tr>
                      <th class="text-center" style="width:80px">No. Sesión</th>
                      <th>Fecha</th>
                      <th class="text-center" style="width:75px">Hora</th>
                      <th style="width:95px">Estatus</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>${sesionesHtml}</tbody>
                </table>
              </div>
            </div>

          </div><!-- /modal-body -->
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const bsM = new bootstrap.Modal(document.getElementById('_ag-det-modal'), { backdrop: true });
    document.getElementById('_ag-det-modal').addEventListener('hidden.bs.modal', () => {
        document.getElementById('_ag-det-modal')?.remove();
    });
    bsM.show();
}
/* ─────────────────────────────────────────────────────────────────
   VISTA ANUAL 2026
─────────────────────────────────────────────────────────────────*/
async function agLoadAnual() {
    const pane = document.getElementById('ag-pane-anual');
    if (!pane) return;
    pane.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2 small">Cargando vista anual…</p></div>`;
    await _agEnsureData();
    _agAnualDraw();
}

function _agAnualDraw() {
    const pane = document.getElementById('ag-pane-anual');
    if (!pane) return;

    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soon   = new Date(today.getTime() + 14 * 86400000);
    const area   = _ag.activeArea || 'all';
    const year   = 2026;

    const reuniones = area === 'all'
        ? _ag.reuniones
        : _ag.reuniones.filter(r => r.area === area);

    /* Estadísticas anuales */
    const totalYear  = reuniones.length;
    const celebYear  = reuniones.filter(r => r.estatus === 'Celebrada').length;
    const cancelYear = reuniones.filter(r => r.estatus === 'Cancelada').length;
    const pendYear   = reuniones.filter(r => r.estatus !== 'Celebrada' && r.estatus !== 'Cancelada').length;

    /* Conteo por área para el resumen */
    const areaCounts = {};
    reuniones.forEach(r => {
        const k = r.area || 'AFAC';
        areaCounts[k] = (areaCounts[k] || 0) + 1;
    });

    let html = `
    <!-- Encabezado anual -->
    <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%);border-radius:14px;padding:18px 22px;margin-bottom:20px">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <div style="color:#7dd3fc;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Agenda de Comités</div>
          <div style="color:#fff;font-size:1.6rem;font-weight:900;line-height:1.1">Vista Anual 2026</div>
          <div style="color:#94a3b8;font-size:.76rem;margin-top:4px">${area === 'all' ? 'Todas las áreas' : 'Área: ' + area + ' — ' + (AG_AREA[area]?.name || '')}</div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:10px 16px;text-align:center;min-width:75px">
            <div style="color:#fff;font-size:1.5rem;font-weight:900;line-height:1">${totalYear}</div>
            <div style="color:#94a3b8;font-size:.62rem">Total sesiones</div>
          </div>
          <div style="background:rgba(134,239,172,.12);border-radius:10px;padding:10px 16px;text-align:center;min-width:75px">
            <div style="color:#86efac;font-size:1.5rem;font-weight:900;line-height:1">${celebYear}</div>
            <div style="color:#86efac;font-size:.62rem;opacity:.8">Celebradas</div>
          </div>
          <div style="background:rgba(251,146,60,.12);border-radius:10px;padding:10px 16px;text-align:center;min-width:75px">
            <div style="color:#fb923c;font-size:1.5rem;font-weight:900;line-height:1">${pendYear}</div>
            <div style="color:#fb923c;font-size:.62rem;opacity:.8">Pendientes</div>
          </div>
          ${cancelYear > 0 ? `<div style="background:rgba(248,113,113,.12);border-radius:10px;padding:10px 16px;text-align:center;min-width:75px">
            <div style="color:#f87171;font-size:1.5rem;font-weight:900;line-height:1">${cancelYear}</div>
            <div style="color:#f87171;font-size:.62rem;opacity:.8">Canceladas</div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Resumen por área -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      ${Object.entries(areaCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
        const ac = AG_AREA[k] || AG_AREA.AFAC;
        return `<div style="background:${ac.bg};border:1.5px solid ${ac.border};border-radius:8px;padding:5px 11px;
          cursor:pointer;transition:box-shadow .15s" onclick="agFilterArea('${k}',null)">
          <span style="color:${ac.color};font-weight:700;font-size:.75rem">${k}</span>
          <span style="color:${ac.color};opacity:.7;font-size:.7rem"> — ${ac.name}</span>
          <span style="background:${ac.color};color:#fff;border-radius:10px;padding:1px 7px;font-size:.65rem;font-weight:700;margin-left:6px">${v}</span>
        </div>`;
      }).join('')}
      ${area !== 'all' ? `<div style="background:#f1f5f9;border:1.5px solid #cbd5e1;border-radius:8px;padding:5px 11px;cursor:pointer"
        onclick="agFilterArea('all',document.querySelector('[data-ag-area=all]'))">
        <span style="color:#475569;font-size:.75rem">← Todas las áreas</span>
      </div>` : ''}
    </div>

    <!-- Grid de 12 meses -->
    <div class="row g-3">`;

    for (let m = 0; m < 12; m++) {
        const firstDay  = new Date(year, m, 1);
        const totalDays = new Date(year, m + 1, 0).getDate();
        const startDow  = (firstDay.getDay() + 6) % 7; // Lunes=0
        const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === m);

        /* Sesiones de este mes */
        const byDay = {};
        reuniones.forEach(r => {
            const d = new Date(r.fecha_sesion + 'T00:00:00');
            if (d.getFullYear() === year && d.getMonth() === m) {
                const k = d.getDate();
                if (!byDay[k]) byDay[k] = [];
                byDay[k].push(r);
            }
        });

        const totalMes  = Object.values(byDay).flat().length;
        const celebMes  = Object.values(byDay).flat().filter(r=>r.estatus==='Celebrada').length;

        /* Sesiones ordenadas por día/hora para el mes */
        const allSess = Object.entries(byDay)
            .flatMap(([d, sess]) => sess.map(r => ({...r, _day: +d})))
            .sort((a,b) => a._day - b._day || (a.hora_inicio||'').localeCompare(b.hora_inicio||''));

        /* Agrupar por día */
        const byDayOrdered = [];
        allSess.forEach(r => {
            const last = byDayOrdered[byDayOrdered.length - 1];
            if (last && last.day === r._day) last.sessions.push(r);
            else byDayOrdered.push({ day: r._day, sessions: [r] });
        });

        const DOW_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const pendMes   = totalMes - celebMes;
        const pct       = totalMes > 0 ? Math.round(celebMes / totalMes * 100) : 0;

        html += `
        <div class="col-12 col-sm-6 col-xl-4">
          <div class="card border-0" style="border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);
              ${isCurrentMonth ? 'outline:2px solid #4f46e5;outline-offset:-1px;' : ''}">

            <!-- Cabecera del mes -->
            <div class="card-header border-0 px-3 py-0" style="background:${isCurrentMonth?'#eef2ff':'#f8fafc'};
                border-radius:12px 12px 0 0;cursor:pointer" onclick="_agAnualGoMonth(${m})">
              <div class="d-flex align-items-center justify-content-between" style="padding:10px 0 6px">
                <div class="d-flex align-items-center gap-2">
                  <span class="fw-bold" style="font-size:1rem;color:${isCurrentMonth?'#4338ca':'#1e293b'}">${AG_MONTHS_FULL[m]}</span>
                  ${totalMes > 0
                    ? `<span style="background:${isCurrentMonth?'#4f46e5':'#475569'};color:#fff;border-radius:20px;padding:1px 8px;font-size:.62rem;font-weight:700">${totalMes} ses.</span>`
                    : `<span style="font-size:.65rem;color:#9ca3af">Sin sesiones</span>`}
                </div>
                <div class="d-flex align-items-center gap-2">
                  ${celebMes > 0 ? `<span style="font-size:.68rem;color:#059669;font-weight:600"><i class="fas fa-check-circle me-1"></i>${celebMes} realizadas</span>` : ''}
                  ${pendMes > 0  ? `<span style="font-size:.68rem;color:#d97706;font-weight:600">${pendMes} pend.</span>` : ''}
                  <i class="fas fa-calendar-alt" style="font-size:.65rem;color:#94a3b8"></i>
                </div>
              </div>
              ${totalMes > 0 ? `
              <div style="height:3px;background:#e2e8f0;border-radius:2px;margin-bottom:8px">
                <div style="height:3px;width:${pct}%;background:${pct===100?'#059669':'#4f46e5'};border-radius:2px;transition:width .3s"></div>
              </div>` : ''}
            </div>

            <!-- Agenda por día -->
            <div class="card-body p-0" style="max-height:320px;overflow-y:auto">`;

        if (byDayOrdered.length === 0) {
            html += `<div class="text-center py-4" style="color:#cbd5e1;font-size:.8rem">
                <i class="fas fa-calendar-times d-block mb-1" style="font-size:1.4rem;opacity:.3"></i>
                Sin sesiones programadas</div>`;
        } else {
            byDayOrdered.forEach(({ day: d, sessions: daySess }) => {
                const dDate  = new Date(year, m, d);
                const isToday2 = (now.getFullYear()===year && now.getMonth()===m && now.getDate()===d);
                const isPast2  = dDate < today;
                const isSoon2  = !isPast2 && dDate <= soon;
                const dow    = DOW_SHORT[dDate.getDay()];
                const allCel = daySess.every(r => r.estatus === 'Celebrada');
                const allCan = daySess.every(r => r.estatus === 'Cancelada');

                /* Color del encabezado de día */
                let dayBg = '#f8fafc', dayColor = '#64748b';
                if (isToday2)      { dayBg = '#4f46e5'; dayColor = '#fff'; }
                else if (allCel)   { dayBg = '#ecfdf5'; dayColor = '#059669'; }
                else if (allCan)   { dayBg = '#fef2f2'; dayColor = '#dc2626'; }
                else if (isSoon2)  { dayBg = '#fffbeb'; dayColor = '#92400e'; }

                html += `<div style="border-bottom:1px solid #f1f5f9">
                  <!-- Encabezado del día -->
                  <div style="display:flex;align-items:center;gap:6px;padding:5px 12px 3px;background:${dayBg}">
                    <span style="background:${isToday2?'#fff':'rgba(0,0,0,.08)'};color:${isToday2?'#4f46e5':dayColor};
                      border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;
                      font-size:.72rem;font-weight:800;flex-shrink:0">${d}</span>
                    <span style="font-size:.65rem;font-weight:600;color:${dayColor};text-transform:uppercase;letter-spacing:.05em">${dow}</span>
                    ${isToday2 ? `<span style="font-size:.57rem;background:#fff;color:#4f46e5;border-radius:10px;padding:0 5px;font-weight:700">HOY</span>` : ''}
                    ${isSoon2 && !isToday2 ? `<span style="font-size:.57rem;color:#d97706"><i class="fas fa-bell"></i></span>` : ''}
                  </div>
                  <!-- Sesiones del día -->
                  <div style="padding:2px 6px 4px 6px">`;

                daySess.forEach(r => {
                    const comite  = _ag.comites.find(c => c.id === r.comite_id) || {};
                    const ac      = AG_AREA[r.area] || AG_AREA.AFAC;
                    const isCan   = r.estatus === 'Cancelada';
                    const isCel   = r.estatus === 'Celebrada';
                    const hora    = r.hora_inicio ? r.hora_inicio.slice(0,5) : '';
                    const nombre  = comite.nombre || comite.acronimo || '—';

                    html += `<div style="display:flex;align-items:center;gap:5px;padding:3px 4px;border-radius:6px;
                        cursor:pointer;transition:background .12s;${isCan?'opacity:.45;text-decoration:line-through':''}
                        border-left:3px solid ${isCan?'#e5e7eb':ac.border};background:${isCan?'transparent':ac.bg}20;
                        margin-bottom:2px"
                        onmouseover="this.style.background='${ac.bg}'"
                        onmouseout="this.style.background='${isCan?'transparent':ac.bg}20'"
                        onclick="_agShowComiteDetail('${r.comite_id}')">
                      <span style="background:${ac.bg};color:${ac.color};border:1px solid ${ac.border};
                        font-size:.53rem;font-weight:800;padding:1px 4px;border-radius:3px;white-space:nowrap;flex-shrink:0">${r.area}</span>
                      ${hora ? `<span style="font-size:.62rem;color:#94a3b8;font-weight:600;flex-shrink:0;min-width:32px">${hora}</span>` : ''}
                      <span style="font-size:.73rem;color:${isCel?'#374151':'#1e293b'};font-weight:${isCel?'400':'600'};
                        line-height:1.3;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${nombre}</span>
                      ${isCel ? `<i class="fas fa-check-circle flex-shrink-0" style="font-size:.65rem;color:#059669"></i>` : ''}
                      ${isCan ? `<i class="fas fa-times-circle flex-shrink-0" style="font-size:.65rem;color:#dc2626"></i>` : ''}
                    </div>`;
                });

                html += `</div></div>`;
            });
        }

        html += `</div></div></div>`; // card-body / card / col
    }

    html += `</div>`; // row

    /* Leyenda de áreas al pie */
    html += `<div class="d-flex flex-wrap gap-2 mt-4 align-items-center" style="font-size:.72rem">
        <span class="text-muted fw-semibold me-1">Áreas:</span>`;
    Object.entries(AG_AREA).forEach(([key, ac]) => {
        html += `<span style="background:${ac.bg};color:${ac.color};border-left:3px solid ${ac.border};
            padding:3px 8px;border-radius:0 5px 5px 0;font-weight:600">${key} <span style="font-weight:400;opacity:.8">— ${ac.name}</span></span>`;
    });
    html += `</div>`;

    pane.innerHTML = html;
}

/* Navega al mes desde la vista anual */
function _agAnualGoMonth(m) {
    _ag.calMonth = m;
    /* Activar tab de calendario general */
    const tabBtn = document.getElementById('ag-tab-calendario');
    const tabPane = document.getElementById('ag-pane-calendario');
    if (tabBtn && tabPane) {
        document.querySelectorAll('#ag-main-tabs .nav-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#agenda-section .tab-pane').forEach(p => { p.classList.remove('show','active'); });
        tabBtn.classList.add('active');
        tabPane.classList.add('show','active');
    }
    agLoadCalendario();
}

/* ─────────────────────────────────────────────────────────────────
   COMITÉS (TARJETAS)
───────────────────────────────────────────────────────────────────*/
async function agLoadComites() {
    const grid    = document.getElementById('ag-comites-grid');
    const loading = document.getElementById('ag-comites-loading');
    const empty   = document.getElementById('ag-comites-empty');
    if (!grid) return;

    if (loading) loading.style.display = '';
    grid.style.display = 'none';
    if (empty) empty.classList.add('d-none');

    await _agEnsureData();

    const area    = _ag.activeArea || 'all';
    const comites = area === 'all' ? _ag.comites : _ag.comites.filter(c => c.area === area);

    if (loading) loading.style.display = 'none';

    if (!comites.length) {
        if (empty) empty.classList.remove('d-none');
        return;
    }

    const today = new Date();

    let html = '';
    comites.forEach(c => {
        const ac = AG_AREA[c.area] || AG_AREA.AFAC;

        /* Próxima sesión */
        const next = _ag.reuniones
            .filter(r => r.comite_id === c.id && new Date(r.fecha_sesion + 'T00:00:00') >= today && r.estatus !== 'Cancelada')
            .sort((a, b) => a.fecha_sesion.localeCompare(b.fecha_sesion))[0];

        /* Conteo del año */
        const total    = _ag.reuniones.filter(r => r.comite_id === c.id).length;
        const celebradas = _ag.reuniones.filter(r => r.comite_id === c.id && r.estatus === 'Celebrada').length;
        const pct = total ? Math.round(celebradas * 100 / total) : 0;

        let nextHtml = '';
        if (next) {
            const d    = new Date(next.fecha_sesion + 'T00:00:00');
            const diff = Math.ceil((d - today) / 86400000);
            nextHtml = `<div class="mt-2 pt-2 border-top" style="font-size:.75rem">
                <i class="fas fa-calendar-day me-1 text-muted"></i>
                <strong>Próxima:</strong> ${d.getDate()} ${AG_MONTHS_FULL[d.getMonth()]}
                ${next.hora_inicio ? ' · ' + next.hora_inicio.slice(0,5)+'h' : ''}
                <span class="badge ms-1" style="background:${diff<=7?'#dc2626':'#2563eb'};color:#fff;font-size:.6rem">${diff}d</span>
            </div>`;
        } else {
            nextHtml = `<div class="mt-2 pt-2 border-top text-muted" style="font-size:.75rem">
                <i class="fas fa-calendar-times me-1"></i>Sin sesiones pendientes en 2026</div>`;
        }

        html += `<div class="col-12 col-md-6 col-xl-4">
          <div class="ag-card-comite h-100" style="padding:14px 16px">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <span class="badge" style="background:${ac.bg};color:${ac.color};border:1px solid ${ac.border};font-size:.72rem">
                ${c.area}${c.acronimo ? ' — ' + c.acronimo : ''}
              </span>
              <span class="badge bg-secondary" style="font-size:.62rem">#${c.numero}</span>
            </div>
            <div class="fw-semibold mb-1" style="font-size:.85rem;line-height:1.35">${c.nombre}</div>
            ${c.frecuencia ? `<div class="text-muted" style="font-size:.72rem"><i class="fas fa-redo me-1"></i>${c.frecuencia}</div>` : ''}
            ${c.hora_sesion ? `<div class="text-muted" style="font-size:.72rem"><i class="fas fa-clock me-1"></i>${c.hora_sesion.slice(0,5)} h</div>` : ''}
            ${c.presidente ? `<div class="text-muted mt-1" style="font-size:.72rem"><i class="fas fa-user-tie me-1"></i>${c.presidente}</div>` : ''}
            <!-- Barra de avance -->
            ${total ? `<div class="mt-2">
              <div class="d-flex justify-content-between" style="font-size:.68rem;color:#6b7280">
                <span>${celebradas}/${total} sesiones celebradas</span><span>${pct}%</span>
              </div>
              <div class="progress" style="height:5px;border-radius:3px">
                <div class="progress-bar" style="width:${pct}%;background:${ac.color}" role="progressbar"></div>
              </div>
            </div>` : ''}
            ${nextHtml}
          </div>
        </div>`;
    });

    grid.innerHTML = html;
    grid.style.display = '';
}

/* ─────────────────────────────────────────────────────────────────
   REUNIONES (LISTA)
───────────────────────────────────────────────────────────────────*/
async function agLoadReuniones() {
    const list    = document.getElementById('ag-reuniones-list');
    const loading = document.getElementById('ag-reuniones-loading');
    const empty   = document.getElementById('ag-reuniones-empty');
    if (!list) return;

    if (loading) loading.style.display = '';
    list.style.display = 'none';
    if (empty) empty.classList.add('d-none');

    await _agEnsureData();

    const area       = _ag.activeArea || 'all';
    const filtEstatus = document.getElementById('ag-reuniones-filtro-estatus')?.value || '';
    const filtMes    = document.getElementById('ag-reuniones-filtro-mes')?.value || '';  // YYYY-MM

    let reuniones = area === 'all' ? [..._ag.reuniones] : _ag.reuniones.filter(r => r.area === area);
    if (filtEstatus) reuniones = reuniones.filter(r => r.estatus === filtEstatus);
    if (filtMes)     reuniones = reuniones.filter(r => r.fecha_sesion.startsWith(filtMes));

    if (loading) loading.style.display = 'none';

    if (!reuniones.length) {
        if (empty) empty.classList.remove('d-none');
        return;
    }

    const today = new Date();
    let html = `<div class="table-responsive"><table class="table table-sm table-hover">
      <thead class="table-light">
        <tr>
          <th style="min-width:60px">Fecha</th>
          <th>Comité</th>
          <th>Área</th>
          <th>Sesión</th>
          <th>Hora</th>
          <th>Estatus</th>
        </tr>
      </thead><tbody>`;

    reuniones.forEach(r => {
        const comite = _ag.comites.find(c => c.id === r.comite_id) || {};
        const ac     = AG_AREA[r.area] || AG_AREA.AFAC;
        const d      = new Date(r.fecha_sesion + 'T00:00:00');
        const isPast = d < today;

        html += `<tr class="${isPast ? 'text-muted' : ''}">
          <td class="text-nowrap small fw-semibold">${d.getDate()} ${AG_MONTHS[d.getMonth()]} ${d.getFullYear()}</td>
          <td class="small" title="${comite.nombre}">${comite.acronimo || (comite.nombre||'').slice(0,40)}</td>
          <td><span class="badge" style="background:${ac.bg};color:${ac.color};font-size:.65rem">${r.area}</span></td>
          <td class="small">${r.numero_sesion || '—'}</td>
          <td class="small text-nowrap">${r.hora_inicio ? r.hora_inicio.slice(0,5)+'h' : '—'}</td>
          <td><span class="ag-status-badge ag-status-${r.estatus}">${r.estatus}</span></td>
        </tr>`;
        if (r.observaciones) {
            html += `<tr class="bg-light"><td colspan="6" class="small text-muted py-1 ps-4">
                <i class="fas fa-info-circle me-1"></i>${r.observaciones}</td></tr>`;
        }
    });

    html += `</tbody></table></div>`;
    list.innerHTML = html;
    list.style.display = '';
}

/* ─────────────────────────────────────────────────────────────────
   ACUERDOS (LISTA)
───────────────────────────────────────────────────────────────────*/
async function agLoadAcuerdos() {
    const list    = document.getElementById('ag-acuerdos-list');
    const loading = document.getElementById('ag-acuerdos-loading');
    const empty   = document.getElementById('ag-acuerdos-empty');
    if (!list) return;

    if (loading) loading.style.display = '';
    list.style.display = 'none';
    if (empty) empty.classList.add('d-none');

    const sb = _agSB();
    if (!sb) { if (loading) loading.style.display = 'none'; return; }

    const filtEstatus = document.getElementById('ag-acuerdos-filtro-estatus')?.value || '';
    const area = _ag.activeArea || 'all';

    let q = sb.from('agenda_acuerdos')
        .select('*, reunion:reunion_id(fecha_sesion,numero_sesion,comite_id,area)')
        .order('created_at', { ascending: false })
        .limit(200);
    if (filtEstatus) q = q.eq('estatus', filtEstatus);
    if (area !== 'all') q = q.eq('area', area);

    const { data, error } = await q;
    if (loading) loading.style.display = 'none';

    if (error || !data || !data.length) {
        if (empty) empty.classList.remove('d-none');
        return;
    }

    let html = `<div class="table-responsive"><table class="table table-sm table-hover">
      <thead class="table-light"><tr>
        <th>#</th><th>Descripción</th><th>Área</th><th>Responsable</th>
        <th>Fecha límite</th><th>Estatus</th>
      </tr></thead><tbody>`;

    data.forEach(a => {
        const ac = AG_AREA[a.area] || AG_AREA.AFAC;
        const fl = a.fecha_limite ? new Date(a.fecha_limite + 'T00:00:00') : null;
        const vencido = fl && fl < new Date() && a.estatus !== 'Cumplido' && a.estatus !== 'Cancelado';
        html += `<tr class="${vencido?'table-danger':''}">
          <td class="small text-muted">${a.numero_acuerdo || '—'}</td>
          <td class="small">${a.descripcion}</td>
          <td><span class="badge" style="background:${ac.bg};color:${ac.color};font-size:.65rem">${a.area}</span></td>
          <td class="small">${a.responsable || '—'}</td>
          <td class="small text-nowrap">${fl ? fl.getDate()+' '+AG_MONTHS[fl.getMonth()] : '—'}</td>
          <td><span class="ag-status-badge ag-status-${a.estatus}">${a.estatus}</span></td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    list.innerHTML = html;
    list.style.display = '';
}

/* ─────────────────────────────────────────────────────────────────
   STUBS PARA MODALES (admin)
───────────────────────────────────────────────────────────────────*/
function agOpenNuevaReunion() {
    alert('Funcionalidad de administrador — próximamente disponible.');
}
function agOpenNuevoComite() {
    alert('Funcionalidad de administrador — próximamente disponible.');
}

/* ─────────────────────────────────────────────────────────────────
   HOOK EN showSection — auto-carga al navegar a la sección
───────────────────────────────────────────────────────────────────*/
(function _agPatchNav() {
    function patch() {
        const orig = window.showSection;
        if (typeof orig !== 'function') return false;
        if (orig._agPatched) return true;

        window.showSection = function(sectionKey, linkEl) {
            orig(sectionKey, linkEl);
            if (sectionKey === 'agenda') {
                /* Carga el calendario al entrar a la sección */
                setTimeout(agLoadCalendario, 50);
                /* También carga comités para que el tab esté listo */
                setTimeout(agLoadComites, 80);
            }
        };
        window.showSection._agPatched = true;
        return true;
    }

    if (!patch()) {
        document.addEventListener('DOMContentLoaded', function _agDomReady() {
            if (!patch()) {
                /* Reintentar cada 300ms durante 5s */
                let attempts = 0;
                const timer = setInterval(() => {
                    if (patch() || ++attempts > 16) clearInterval(timer);
                }, 300);
            }
            document.removeEventListener('DOMContentLoaded', _agDomReady);
        });
    }
})();

/* Bootstrap tab events — cargar comités cuando se activa esa pestaña */
document.addEventListener('DOMContentLoaded', function() {
    const tabComites = document.getElementById('ag-tab-comites');
    if (tabComites) {
        tabComites.addEventListener('shown.bs.tab', agLoadComites);
    }

    /* Si llegamos con la sección ya activa (recarga directa) */
    const agSection = document.getElementById('agenda-section');
    if (agSection && agSection.classList.contains('active')) {
        agLoadCalendario();
    }
});
