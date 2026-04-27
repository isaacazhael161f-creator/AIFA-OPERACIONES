// ═══════════════════════════════════════════════════════════════════
//  AGENDA DE COMITÉS — js/agenda.js
//  Gestión de comités, sesiones y acuerdos del AIFA
// ═══════════════════════════════════════════════════════════════════

/* ── Constantes de colores por área ─────────────────────────────── */
const AG_AREA = {
    DPE:  { bg:'#fef9c3', color:'#854d0e', border:'#fde047', name:'Planeación' },
    DA:   { bg:'#fee2e2', color:'#991b1b', border:'#fca5a5', name:'Administración' },
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
function _agSB() { return window._supabase || window.sb || null; }

/* ── Carga de datos (lazy, con caché) ──────────────────────────── */
async function _agEnsureData(force) {
    if (_ag.ready && !force) return;
    const sb = _agSB();
    if (!sb) return;

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

    _ag.comites   = rC.data  || [];
    _ag.reuniones = rR.data  || [];
    _ag.ready = true;
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
    const soon    = new Date(today.getTime() + 30 * 86400000);
    const area    = _ag.activeArea || 'all';
    const year    = 2026;
    const month   = _ag.calMonth;

    /* Filtrar por área seleccionada */
    const reuniones = area === 'all'
        ? _ag.reuniones
        : _ag.reuniones.filter(r => r.area === area);

    /* ── Agrupar sesiones del año completo por fecha ── */
    const byDate = {};
    reuniones.forEach(r => {
        if (!byDate[r.fecha_sesion]) byDate[r.fecha_sesion] = [];
        byDate[r.fecha_sesion].push(r);
    });

    /* ── Días con múltiples sesiones (conflictos) ── */
    const conflictDates = Object.keys(byDate).filter(d => byDate[d].length >= 2);

    /* ── Sesiones del mes visible ── */
    const byDay = {};
    reuniones.forEach(r => {
        const d = new Date(r.fecha_sesion + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() === month) {
            const k = d.getDate();
            if (!byDay[k]) byDay[k] = [];
            byDay[k].push(r);
        }
    });

    const conflictDaysMonth = new Set(
        Object.entries(byDay).filter(([, a]) => a.length >= 2).map(([k]) => +k)
    );

    /* ── Estadísticas del mes ── */
    const totalMes     = Object.values(byDay).flat().length;
    const celebradas   = Object.values(byDay).flat().filter(r => r.estatus === 'Celebrada').length;
    const canceladas   = Object.values(byDay).flat().filter(r => r.estatus === 'Cancelada').length;
    const nConflMes    = conflictDaysMonth.size;

    /* ══════════════════════════════════════════════════════════════
       CABECERA: navegación de mes + estadísticas
    ══════════════════════════════════════════════════════════════ */
    let html = `
    <div class="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <!-- Navegación -->
        <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary px-2" onclick="agCalNavMonth(-1)" title="Mes anterior">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h5 class="mb-0 fw-bold px-1" style="color:#1e1b4b;min-width:210px;text-align:center">
                <i class="fas fa-calendar-alt me-2 text-primary opacity-75"></i>${AG_MONTHS_FULL[month]} ${year}
            </h5>
            <button class="btn btn-sm btn-outline-secondary px-2" onclick="agCalNavMonth(1)" title="Mes siguiente">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <!-- Estadísticas rápidas -->
        <div class="d-flex gap-2 flex-wrap ms-auto">
            <span class="badge rounded-pill" style="background:#1e1b4b;font-size:.75rem;padding:5px 10px">
                <i class="fas fa-calendar-check me-1"></i>${totalMes} sesión${totalMes !== 1 ? 'es' : ''}
            </span>
            ${celebradas > 0 ? `<span class="badge rounded-pill bg-success" style="font-size:.75rem;padding:5px 10px">
                <i class="fas fa-check me-1"></i>${celebradas} celebrada${celebradas !== 1 ? 's' : ''}
            </span>` : ''}
            ${canceladas > 0 ? `<span class="badge rounded-pill bg-danger" style="font-size:.75rem;padding:5px 10px">
                <i class="fas fa-times me-1"></i>${canceladas} cancelada${canceladas !== 1 ? 's' : ''}
            </span>` : ''}
            ${nConflMes > 0
                ? `<span class="badge rounded-pill bg-warning text-dark" style="font-size:.75rem;padding:5px 10px">
                    <i class="fas fa-exclamation-triangle me-1"></i>${nConflMes} día${nConflMes !== 1 ? 's' : ''} con coincidencia
                   </span>`
                : `<span class="badge rounded-pill bg-success" style="font-size:.75rem;padding:5px 10px">
                    <i class="fas fa-shield-alt me-1"></i>Sin coincidencias
                   </span>`}
        </div>
    </div>`;

    /* ══════════════════════════════════════════════════════════════
       GRID DE DÍAS
    ══════════════════════════════════════════════════════════════ */
    const DAYS_HEADER = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    const firstDay    = new Date(year, month, 1);
    const totalDays   = new Date(year, month + 1, 0).getDate();
    const startDow    = (firstDay.getDay() + 6) % 7; /* 0=Lun … 6=Dom */

    html += `<div class="ag-cal-grid-wrap" style="overflow-x:auto">
    <table class="ag-cal-grid w-100" style="border-collapse:separate;border-spacing:3px;min-width:700px">
      <thead>
        <tr>`;
    DAYS_HEADER.forEach(d => {
        html += `<th class="text-center pb-2" style="font-size:.78rem;font-weight:700;
            color:#6b7280;width:14.28%;letter-spacing:.03em">${d}</th>`;
    });
    html += `</tr></thead><tbody>`;

    let day = 1, col = startDow;
    let row = '<tr>';
    /* celdas vacías al inicio */
    for (let i = 0; i < startDow; i++) {
        row += `<td style="background:#f9fafb;border-radius:8px;min-height:110px;padding:6px"></td>`;
    }

    while (day <= totalDays) {
        const dateStr   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const sessions  = byDay[day] || [];
        const cellDate  = new Date(year, month, day);
        const isToday   = (year === now.getFullYear() && month === now.getMonth() && day === now.getDate());
        const isPastDay = cellDate < today;
        const isConfl   = conflictDaysMonth.has(day);
        const hasHourConflict = isConfl && (() => {
            const hMins = sessions.filter(r => r.hora_inicio)
                .map(r => { const [h, m] = r.hora_inicio.split(':').map(Number); return h * 60 + m; });
            for (let i = 0; i < hMins.length; i++)
                for (let j = i + 1; j < hMins.length; j++)
                    if (Math.abs(hMins[i] - hMins[j]) < 60) return true;
            return false;
        })();

        /* Estilos de celda */
        let cellBg, cellBorder, cellShadow = '';
        if (isToday) {
            cellBg = '#ede9fe'; cellBorder = '2px solid #7c3aed'; cellShadow = 'box-shadow:0 0 0 3px #c4b5fd40;';
        } else if (hasHourConflict) {
            cellBg = '#fef2f2'; cellBorder = '2px solid #dc2626';
        } else if (isConfl) {
            cellBg = '#fff7ed'; cellBorder = '2px solid #f97316';
        } else if (sessions.length > 0) {
            cellBg = '#f0fdf4'; cellBorder = '1.5px solid #86efac';
        } else {
            cellBg = '#fff'; cellBorder = '1px solid #e5e7eb';
        }

        row += `<td style="background:${cellBg};border:${cellBorder};${cellShadow}
            border-radius:8px;vertical-align:top;padding:7px 7px 5px 7px;min-height:110px;position:relative">`;

        /* Número de día */
        row += `<div class="d-flex justify-content-between align-items-start mb-1">
            <span style="font-size:.85rem;font-weight:${isToday ? '800' : '600'};
                color:${isToday ? '#6d28d9' : isPastDay ? '#9ca3af' : '#111827'};
                ${isToday ? 'background:#7c3aed;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem' : ''}">${day}</span>
            ${isConfl
                ? `<span style="background:${hasHourConflict ? '#dc2626' : '#f97316'};color:#fff;
                    font-size:.6rem;padding:1px 5px;border-radius:10px;font-weight:700;white-space:nowrap"
                    title="${sessions.length} comités coinciden${hasHourConflict ? ' — horas solapadas' : ''}">
                    ×${sessions.length} ${hasHourConflict ? '⚠' : ''}
                   </span>`
                : (sessions.length > 0 ? `<span style="color:#9ca3af;font-size:.62rem">${sessions.length}</span>` : '')}
        </div>`;

        /* Sesiones del día — máx 3 visibles, resto colapsado */
        const visible  = sessions.slice(0, 3);
        const overflow = sessions.length - 3;
        visible.forEach(r => {
            const comite = _ag.comites.find(c => c.id === r.comite_id) || {};
            const ac     = AG_AREA[r.area] || AG_AREA.AFAC;
            const label  = comite.acronimo || (comite.nombre || '').split(' ').slice(0, 2).join(' ');
            const isCan  = r.estatus === 'Cancelada';
            /* Color de chip */
            let cBg, cColor, cBorder;
            if (isCan)         { cBg = '#fee2e2'; cColor = '#991b1b'; cBorder = '#fca5a5'; }
            else if (isPastDay){ cBg = '#d1fae5'; cColor = '#166534'; cBorder = '#86efac'; }
            else if (cellDate <= soon){ cBg = '#fef08a'; cColor = '#854d0e'; cBorder = '#fde047'; }
            else               { cBg = ac.bg;     cColor = ac.color;  cBorder = ac.border; }
            const hLabel = r.hora_inicio ? r.hora_inicio.slice(0, 5) : '';
            row += `<div title="${comite.nombre || ''} | ${r.numero_sesion || ''} | ${r.estatus}${r.observaciones ? '\n' + r.observaciones : ''}"
                style="background:${cBg};color:${cColor};border-left:3px solid ${cBorder};
                       padding:2px 5px;margin:2px 0;border-radius:0 4px 4px 0;
                       font-size:.69rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                       ${isCan ? 'text-decoration:line-through;opacity:.55' : ''}cursor:default">
                ${hLabel ? `<span style="opacity:.65;font-size:.62rem;margin-right:3px">${hLabel}</span>` : ''}${label}
            </div>`;
        });
        if (overflow > 0) {
            row += `<div style="font-size:.62rem;color:#6b7280;margin-top:2px;text-align:right">+${overflow} más</div>`;
        }
        row += `</td>`;
        col++; day++;

        if (col === 7 || day > totalDays) {
            /* celdas vacías al final de la semana */
            if (day > totalDays && col < 7) {
                for (let i = col; i < 7; i++) {
                    row += `<td style="background:#f9fafb;border-radius:8px;min-height:110px;padding:6px"></td>`;
                }
            }
            row += '</tr>';
            html += row;
            if (day <= totalDays) { row = '<tr>'; col = 0; }
        }
    }

    html += `</tbody></table></div>`;

    /* ── Leyenda ── */
    html += `<div class="d-flex flex-wrap gap-2 mt-3 align-items-center" style="font-size:.75rem">
        <span class="text-muted fw-semibold me-1">Leyenda:</span>
        <span style="background:#ede9fe;border:2px solid #7c3aed;padding:2px 9px;border-radius:6px;color:#6d28d9;font-weight:600">Hoy</span>
        <span style="background:#fef2f2;border:2px solid #dc2626;padding:2px 9px;border-radius:6px;color:#991b1b">Horas solapadas</span>
        <span style="background:#fff7ed;border:2px solid #f97316;padding:2px 9px;border-radius:6px;color:#c2410c">Mismo día</span>
        <span style="background:#d1fae5;border-left:3px solid #86efac;padding:2px 9px;border-radius:0 4px 4px 0;color:#166534">Celebrada</span>
        <span style="background:#fef08a;border-left:3px solid #fde047;padding:2px 9px;border-radius:0 4px 4px 0;color:#854d0e">Próxima (30d)</span>
        <span style="background:#dbeafe;border-left:3px solid #93c5fd;padding:2px 9px;border-radius:0 4px 4px 0;color:#1e40af">Programada</span>
        <span style="background:#fee2e2;border-left:3px solid #fca5a5;padding:2px 9px;border-radius:0 4px 4px 0;color:#991b1b;text-decoration:line-through">Cancelada</span>
    </div>`;

    /* ══════════════════════════════════════════════════════════════
       SECCIÓN DE COINCIDENCIAS DEL MES (si las hay)
    ══════════════════════════════════════════════════════════════ */
    if (nConflMes > 0) {
        const DOW = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        html += `<div class="mt-4">
            <div class="d-flex align-items-center gap-2 mb-2">
                <i class="fas fa-exclamation-triangle text-warning"></i>
                <h6 class="mb-0 fw-bold" style="color:#1e1b4b">Coincidencias en ${AG_MONTHS_FULL[month]}</h6>
                <span class="badge bg-warning text-dark">${nConflMes} día${nConflMes !== 1 ? 's' : ''}</span>
            </div>`;
        [...conflictDaysMonth].sort((a, b) => a - b).forEach(d => {
            const sesiones = byDay[d];
            const dDate    = new Date(year, month, d);
            const hMins = sesiones.filter(r => r.hora_inicio)
                .map(r => { const [h, m] = r.hora_inicio.split(':').map(Number); return h * 60 + m; });
            let hourConfl = false;
            outer: for (let i = 0; i < hMins.length; i++)
                for (let j = i + 1; j < hMins.length; j++)
                    if (Math.abs(hMins[i] - hMins[j]) < 60) { hourConfl = true; break outer; }

            html += `<div class="card border-0 mb-2" style="box-shadow:0 1px 6px rgba(0,0,0,.08)">
                <div class="card-header py-2 px-3 d-flex justify-content-between align-items-center"
                     style="background:${hourConfl ? '#fef2f2' : '#fff7ed'};
                            border-left:4px solid ${hourConfl ? '#dc2626' : '#f97316'}">
                    <span class="fw-semibold" style="font-size:.83rem;color:${hourConfl ? '#991b1b' : '#9a3412'}">
                        <i class="fas fa-calendar-day me-1"></i>
                        ${DOW[dDate.getDay()]} ${d} de ${AG_MONTHS_FULL[month]}
                    </span>
                    <div class="d-flex gap-1">
                        <span class="badge ${hourConfl ? 'bg-danger' : 'bg-warning text-dark'}" style="font-size:.65rem">
                            ${hourConfl ? '<i class="fas fa-clock me-1"></i>Horas solapadas' : 'Horarios distintos'}
                        </span>
                        <span class="badge bg-secondary" style="font-size:.65rem">${sesiones.length} comités</span>
                    </div>
                </div>
                <div class="card-body p-0">
                <table class="table table-sm mb-0" style="font-size:.77rem">
                    <thead class="table-light"><tr>
                        <th class="ps-3" style="width:65px">Hora</th>
                        <th style="width:55px">Área</th><th>Comité</th><th>Sesión</th><th>Estatus</th>
                    </tr></thead><tbody>`;
            sesiones.slice().sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
                .forEach(r => {
                    const comite = _ag.comites.find(c => c.id === r.comite_id) || {};
                    const ac     = AG_AREA[r.area] || AG_AREA.AFAC;
                    const rHMin  = r.hora_inicio
                        ? (() => { const [h, m] = r.hora_inicio.split(':').map(Number); return h * 60 + m; })()
                        : null;
                    const solapa = rHMin !== null && hMins.some(hm => hm !== rHMin && Math.abs(hm - rHMin) < 60);
                    html += `<tr ${solapa ? 'class="table-danger"' : ''}>
                        <td class="ps-3 fw-semibold text-nowrap">${r.hora_inicio ? r.hora_inicio.slice(0,5) + 'h' : '—'}</td>
                        <td><span class="badge" style="background:${ac.bg};color:${ac.color};border:1px solid ${ac.border};font-size:.63rem">${r.area}</span></td>
                        <td title="${comite.nombre || ''}">${comite.acronimo || (comite.nombre || '').slice(0, 38)}</td>
                        <td class="text-muted">${r.numero_sesion || '—'}</td>
                        <td><span class="ag-status-badge ag-status-${r.estatus}">${r.estatus}</span></td>
                    </tr>`;
                });
            html += `</tbody></table></div></div>`;
        });
        html += `</div>`;
    }

    pane.innerHTML = html;
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
