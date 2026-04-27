// ═══════════════════════════════════════════════════════════════════
//  AGENDA DE COMITÉS — js/agenda.js
//  Gestión de comités, sesiones y acuerdos del AIFA
// ═══════════════════════════════════════════════════════════════════

/* ── Constantes de colores por área ─────────────────────────────── */
const AG_AREA = {
    DPE:  { bg:'#fef9c3', color:'#854d0e', border:'#fde047', name:'Planeación' },
    DA:   { bg:'#ffedd5', color:'#9a3412', border:'#fb923c', name:'Administración' },
    DO:   { bg:'#dcfce7', color:'#166534', border:'#86efac', name:'Operación' },
    DCS:  { bg:'#dbeafe', color:'#1e40af', border:'#93c5fd', name:'Comercial' },
    GSO:  { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd', name:'Seg. Operacional' },
    UT:   { bg:'#cffafe', color:'#164e63', border:'#67e8f9', name:'Transparencia' },
    GC:   { bg:'#fce7f3', color:'#9d174d', border:'#f9a8d4', name:'Calidad' },
    AFAC: { bg:'#f3f4f6', color:'#374151', border:'#9ca3af', name:'AFAC' },
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

    /* ── CSS inyectado una vez ──────────────────────────────────── */
    if (!document.getElementById('ag-cal-style')) {
        const s = document.createElement('style');
        s.id = 'ag-cal-style';
        s.textContent = `
        .ag-cal-cell { border-radius:10px; vertical-align:top; padding:10px 8px 8px; min-height:165px; position:relative; transition:box-shadow .15s; }
        .ag-cal-cell:hover { box-shadow:0 3px 12px rgba(0,0,0,.12) !important; z-index:1; }
        .ag-chip { display:block; padding:4px 7px 4px 6px; margin:2px 0; border-radius:0 6px 6px 0;
                   font-size:.72rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
                   cursor:pointer; line-height:1.45; border-left-width:3px; border-left-style:solid;
                   transition:filter .12s; }
        .ag-chip:hover { filter:brightness(.94); }
        .ag-chip-past { opacity:.7; }
        .ag-chip-can  { text-decoration:line-through; opacity:.5; }
        .ag-chip-soon { animation:ag-pulse .9s infinite alternate; }
        @keyframes ag-pulse { from { filter:brightness(1); } to { filter:brightness(1.12); } }
        .ag-dow-weekend { background:#f8f7ff !important; }
        .ag-day-num-today { background:#7c3aed; color:#fff !important; border-radius:50%;
                            width:24px; height:24px; display:inline-flex; align-items:center;
                            justify-content:center; font-size:.75rem; }
        `;
        document.head.appendChild(s);
    }

    /* ─────────────────────────────────────────────────────────
       CABECERA
    ───────────────────────────────────────────────────────── */
    let html = `
    <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);border-radius:14px;padding:16px 20px;margin-bottom:16px">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <!-- Navegación -->
            <div class="d-flex align-items-center gap-2">
                <button class="btn btn-sm px-3 py-1" onclick="agCalNavMonth(-1)"
                    style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div style="text-align:center;min-width:200px">
                    <div style="color:#a5b4fc;font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase">${year}</div>
                    <div style="color:#fff;font-size:1.4rem;font-weight:800;line-height:1.1">${AG_MONTHS_FULL[month]}</div>
                </div>
                <button class="btn btn-sm px-3 py-1" onclick="agCalNavMonth(1)"
                    style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <!-- KPIs -->
            <div class="d-flex gap-2 flex-wrap">
                <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:8px 14px;text-align:center;min-width:70px">
                    <div style="color:#fff;font-size:1.3rem;font-weight:800;line-height:1">${totalMes}</div>
                    <div style="color:#a5b4fc;font-size:.65rem">Sesiones</div>
                </div>
                <div style="background:rgba(134,239,172,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:70px">
                    <div style="color:#86efac;font-size:1.3rem;font-weight:800;line-height:1">${celeb}</div>
                    <div style="color:#86efac;font-size:.65rem;opacity:.8">Celebradas</div>
                </div>
                ${cancel > 0 ? `<div style="background:rgba(252,165,165,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:70px">
                    <div style="color:#fca5a5;font-size:1.3rem;font-weight:800;line-height:1">${cancel}</div>
                    <div style="color:#fca5a5;font-size:.65rem;opacity:.8">Canceladas</div>
                </div>` : ''}
                ${nConfl > 0
                    ? `<div style="background:rgba(251,191,36,.15);border-radius:10px;padding:8px 14px;text-align:center;min-width:70px">
                        <div style="color:#fbbf24;font-size:1.3rem;font-weight:800;line-height:1">${nConfl}</div>
                        <div style="color:#fbbf24;font-size:.65rem;opacity:.8">Conflictos</div>
                       </div>`
                    : `<div style="background:rgba(134,239,172,.1);border-radius:10px;padding:8px 14px;text-align:center">
                        <i class="fas fa-shield-alt" style="color:#86efac;font-size:1.1rem"></i>
                        <div style="color:#86efac;font-size:.62rem;opacity:.8;margin-top:2px">Sin conflictos</div>
                       </div>`}
            </div>
        </div>
    </div>`;

    /* ─────────────────────────────────────────────────────────
       GRID
    ───────────────────────────────────────────────────────── */
    const DAYS_H = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const firstDay  = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDow  = (firstDay.getDay() + 6) % 7;

    html += `<div style="overflow-x:auto">
    <table style="border-collapse:separate;border-spacing:6px;min-width:980px;width:100%">
      <thead><tr>`;
    DAYS_H.forEach((d, i) => {
        const isWe = i >= 5;
        html += `<th class="text-center pb-2" style="width:14.28%;font-size:.75rem;font-weight:700;
            color:${isWe ? '#8b5cf6' : '#6b7280'};letter-spacing:.04em;padding-bottom:8px">${d}</th>`;
    });
    html += `</tr></thead><tbody>`;

    let day = 1, col = startDow;
    let row = '<tr>';
    for (let i = 0; i < startDow; i++) {
        row += `<td class="ag-cal-cell" style="background:#f9fafb;border:1px solid #f1f5f9"></td>`;
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

        /* Estilo de celda */
        let cBg, cBorder, cShadow = '';
        if (isToday) {
            cBg = '#ede9fe'; cBorder = '2px solid #7c3aed'; cShadow = 'box-shadow:0 0 0 3px #c4b5fd50;';
        } else if (hasHourConfl) {
            cBg = '#fff1f2'; cBorder = '2px solid #f43f5e';
        } else if (isConfl) {
            cBg = '#fffbeb'; cBorder = '2px solid #f59e0b';
        } else if (sessions.length > 0) {
            cBg = isPastDay ? '#fafafa' : '#fafffe'; cBorder = '1.5px solid #d1d5db';
        } else {
            cBg = isWe ? '#f5f3ff' : '#fff'; cBorder = '1px solid #e5e7eb';
        }

        row += `<td class="ag-cal-cell${isWe?' ag-dow-weekend':''}"
            style="background:${cBg};border:${cBorder};${cShadow}">`;

        /* Número de día */
        const numStyle = isToday ? 'class="ag-day-num-today"' : `style="font-size:.82rem;font-weight:700;color:${isPastDay?'#9ca3af':'#1f2937'}"`;
        row += `<div class="d-flex justify-content-between align-items-start mb-1">
            <span ${numStyle}>${day}</span>
            ${isConfl
                ? `<span style="background:${hasHourConfl?'#f43f5e':'#f59e0b'};color:#fff;
                    font-size:.58rem;padding:1px 5px;border-radius:10px;font-weight:700"
                    title="${sessions.filter(r=>r.estatus!=='Cancelada').length} comités coinciden">
                    ⚠ ×${sessions.filter(r=>r.estatus!=='Cancelada').length}</span>`
                : (sessions.length > 1 ? `<span style="color:#9ca3af;font-size:.6rem">${sessions.length}</span>` : '')}
        </div>`;

        /* Chips de sesión — siempre coloreados por área */
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
            if (isCan)     extraCls = ' ag-chip-can';
            else if (isCel || isPastDay) extraCls = ' ag-chip-past';
            else if (isUpSoon)           extraCls = ' ag-chip-soon';

            /* Icono de estado (pequeño, al inicio) */
            let statusIcon = '';
            if (isCel)     statusIcon = `<i class="fas fa-check" style="font-size:.55rem;opacity:.7;margin-right:3px"></i>`;
            else if (isCan) statusIcon = `<i class="fas fa-times" style="font-size:.55rem;opacity:.7;margin-right:3px"></i>`;
            else if (isUpSoon) statusIcon = `<i class="fas fa-bell" style="font-size:.55rem;margin-right:3px"></i>`;

            const hora = r.hora_inicio ? r.hora_inicio.slice(0, 5) : '';

            row += `<span class="ag-chip${extraCls}"
                title="${comite.nombre || ''}\n${r.numero_sesion || ''} | ${r.estatus}${hora ? ' · ' + hora + 'h' : ''}${r.observaciones ? '\n' + r.observaciones : ''}\n\n🔍 Haz clic para ver información normativa"
                style="background:${ac.bg};color:${ac.color};border-left-color:${ac.border}"
                onclick="_agShowComiteDetail('${r.comite_id}')">
                ${statusIcon}${hora ? `<span style="opacity:.6;font-size:.6rem;margin-right:2px">${hora}</span>` : ''}${label}
            </span>`;
        });
        if (overflow > 0) {
            row += `<div style="font-size:.6rem;color:#6b7280;text-align:right;margin-top:2px">+${overflow} más</div>`;
        }
        row += `</td>`;
        col++; day++;

        if (col === 7 || day > totalDays) {
            if (day > totalDays && col < 7)
                for (let i = col; i < 7; i++)
                    row += `<td class="ag-cal-cell" style="background:#f9fafb;border:1px solid #f1f5f9"></td>`;
            row += '</tr>';
            html += row;
            if (day <= totalDays) { row = '<tr>'; col = 0; }
        }
    }

    html += `</tbody></table></div>`;

    /* ── Leyenda de áreas ───────────────────────────────────────── */
    html += `<div class="d-flex flex-wrap gap-2 mt-3 align-items-center" style="font-size:.72rem">
        <span class="text-muted fw-semibold me-1">Áreas:</span>`;
    Object.entries(AG_AREA).forEach(([key, ac]) => {
        html += `<span style="background:${ac.bg};color:${ac.color};border-left:3px solid ${ac.border};
            padding:3px 8px;border-radius:0 5px 5px 0;font-weight:600">${key} <span style="font-weight:400;opacity:.8">— ${ac.name}</span></span>`;
    });
    html += `</div>
    <div class="d-flex flex-wrap gap-3 mt-2 align-items-center" style="font-size:.71rem;color:#6b7280">
        <span class="fw-semibold">Estado:</span>
        <span><i class="fas fa-check" style="font-size:.6rem;margin-right:3px"></i>Celebrada (misma área, atenuada)</span>
        <span><i class="fas fa-bell" style="font-size:.6rem;margin-right:3px"></i>Próxima ≤14 días (brilla)</span>
        <span><i class="fas fa-times" style="font-size:.6rem;margin-right:3px"></i>Cancelada (tachada)</span>
        <span style="background:#ede9fe;border:2px solid #7c3aed;padding:1px 7px;border-radius:5px;color:#6d28d9;font-weight:600">Hoy</span>
        <span style="background:#fff1f2;border:2px solid #f43f5e;padding:1px 7px;border-radius:5px;color:#f43f5e">⚠ Horas solapadas</span>
        <span style="background:#fffbeb;border:2px solid #f59e0b;padding:1px 7px;border-radius:5px;color:#b45309">⚠ Mismo día</span>
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
