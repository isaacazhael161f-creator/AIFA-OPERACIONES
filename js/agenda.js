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
let _ag = { comites:[], reuniones:[], acuerdos:[], ready:false, activeArea:'all' };

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
   CALENDARIO GENERAL
───────────────────────────────────────────────────────────────────*/
async function agLoadCalendario() {
    const pane = document.getElementById('ag-pane-calendario');
    if (!pane) return;
    pane.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2 small">Cargando calendario…</p></div>`;

    await _agEnsureData();

    const area   = _ag.activeArea || 'all';
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soon   = new Date(today.getTime() + 30 * 86400000);

    /* Filtrar comités y reuniones según área activa */
    const comites   = area === 'all' ? _ag.comites : _ag.comites.filter(c => c.area === area);
    const reuniones = area === 'all' ? _ag.reuniones : _ag.reuniones.filter(r => r.area === area);

    /* Index reuniones por comite_id + mes */
    const byComMes = {}; // [comite_id][mes 0-11] → [ reunion... ]
    reuniones.forEach(r => {
        const mes = new Date(r.fecha_sesion + 'T00:00:00').getMonth();
        if (!byComMes[r.comite_id]) byComMes[r.comite_id] = {};
        if (!byComMes[r.comite_id][mes]) byComMes[r.comite_id][mes] = [];
        byComMes[r.comite_id][mes].push(r);
    });

    /* Próximas sesiones (next 30 days) */
    const upcoming = reuniones.filter(r => {
        const d = new Date(r.fecha_sesion + 'T00:00:00');
        return d >= today && d <= soon && r.estatus !== 'Cancelada';
    }).slice(0, 12);

    let html = '';

    /* ── Banner: Próximas sesiones ─────────────────────────────── */
    if (upcoming.length) {
        html += `<div class="card border-0 mb-3" style="box-shadow:0 2px 8px rgba(0,0,0,.1)">
          <div class="card-header py-2 text-white" style="background:#1e1b4b">
            <i class="fas fa-bell me-1"></i><strong>Próximas sesiones — 30 días</strong>
            <span class="badge bg-light text-dark ms-2">${upcoming.length}</span>
          </div>
          <div class="card-body p-2">
            <div class="row g-2">`;
        upcoming.forEach(r => {
            const comite = _ag.comites.find(c => c.id === r.comite_id) || {};
            const ac  = AG_AREA[r.area] || AG_AREA.AFAC;
            const d   = new Date(r.fecha_sesion + 'T00:00:00');
            const diff = Math.ceil((d - today) / 86400000);
            const label = comite.acronimo || (comite.nombre || '').split(' ').slice(0,3).join(' ');
            html += `<div class="col-6 col-md-4 col-lg-3">
              <div class="d-flex align-items-center gap-2 rounded p-2"
                   style="background:${ac.bg};border:1px solid ${ac.border}">
                <div class="text-center flex-shrink-0" style="min-width:38px;color:${ac.color}">
                  <div style="font-size:1.05rem;font-weight:700;line-height:1.1">${d.getDate()}</div>
                  <div style="font-size:.6rem;text-transform:uppercase">${AG_MONTHS[d.getMonth()]}</div>
                </div>
                <div style="flex:1;min-width:0">
                  <div class="fw-semibold text-truncate" style="font-size:.78rem;color:${ac.color}"
                       title="${comite.nombre}">${label}</div>
                  <div class="text-muted" style="font-size:.68rem">
                    ${r.numero_sesion ? r.numero_sesion + ' · ' : ''}${r.hora_inicio ? r.hora_inicio.slice(0,5)+'h' : ''}
                  </div>
                </div>
                <span class="badge flex-shrink-0"
                      style="font-size:.62rem;background:${diff<=7?'#dc2626':'#2563eb'};color:#fff">
                  ${diff}d
                </span>
              </div>
            </div>`;
        });
        html += `</div></div></div>`;
    } else {
        html += `<div class="alert alert-info py-2 small mb-3">
            <i class="fas fa-info-circle me-1"></i>No hay sesiones programadas en los próximos 30 días.</div>`;
    }

    /* ── Tabla año completo ────────────────────────────────────── */
    html += `<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <span class="fw-semibold text-secondary small">
            <i class="fas fa-table me-1"></i>Calendario 2026 — ${comites.length} comités
        </span>
        <div class="d-flex gap-2 flex-wrap small">
            <span class="ag-cal-chip" style="background:#d1fae5;color:#166534;border:1px solid #86efac;padding:2px 8px">● Celebrada</span>
            <span class="ag-cal-chip" style="background:#fef08a;color:#854d0e;border:1px solid #fde047;padding:2px 8px">● Próxima</span>
            <span class="ag-cal-chip" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;padding:2px 8px">● Programada</span>
            <span class="ag-cal-chip" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:2px 8px;text-decoration:line-through">● Cancelada</span>
        </div>
    </div>
    <div class="table-responsive rounded shadow-sm">
    <table class="table table-sm table-bordered mb-0 ag-cal-table" style="min-width:900px">
      <thead>
        <tr style="background:#1e1b4b;color:#fff">
          <th style="min-width:220px;position:sticky;left:0;background:#1e1b4b;z-index:2">Comité</th>
          <th style="width:50px;text-align:center">Área</th>`;

    AG_MONTHS.forEach((m, i) => {
        const isCur = (i === now.getMonth());
        html += `<th class="text-center" style="width:64px;${isCur?'background:#312e81;':''}">
                   ${m}${isCur?' <span style="font-size:.6rem;vertical-align:super">◀</span>':''}
                 </th>`;
    });
    html += `</tr></thead><tbody>`;

    if (comites.length === 0) {
        html += `<tr><td colspan="14" class="text-center text-muted py-4">
            No hay comités registrados para esta área.</td></tr>`;
    }

    comites.forEach(c => {
        const ac        = AG_AREA[c.area] || AG_AREA.AFAC;
        const mesSesiones = byComMes[c.id] || {};
        html += `<tr>
          <td style="position:sticky;left:0;background:#fff;z-index:1;padding:3px 8px;font-size:.78rem;font-weight:600"
              title="${c.nombre}">
            ${c.acronimo ? `<span class="text-muted me-1" style="font-size:.68rem">[${c.acronimo}]</span>` : ''}
            ${c.nombre.length > 55 ? c.nombre.slice(0, 52) + '…' : c.nombre}
          </td>
          <td class="text-center p-1">
            <span class="badge" style="background:${ac.bg};color:${ac.color};font-size:.68rem;border:1px solid ${ac.border}">${c.area}</span>
          </td>`;

        for (let m = 0; m < 12; m++) {
            const sesiones = mesSesiones[m] || [];
            const isCur    = (m === now.getMonth());
            html += `<td class="text-center p-1" style="${isCur?'background:#f5f3ff;':''}">`; 
            sesiones.forEach(r => {
                const d      = new Date(r.fecha_sesion + 'T00:00:00');
                const isPast = d < today;
                const isNext = !isPast && d <= soon;
                const isCan  = r.estatus === 'Cancelada';
                let chipBg, chipColor, chipBorder;
                if (isCan) {
                    chipBg = '#fee2e2'; chipColor = '#991b1b'; chipBorder = '#fca5a5';
                } else if (isPast) {
                    chipBg = '#d1fae5'; chipColor = '#166534'; chipBorder = '#86efac';
                } else if (isNext) {
                    chipBg = '#fef08a'; chipColor = '#854d0e'; chipBorder = '#fde047';
                } else {
                    chipBg = ac.bg; chipColor = ac.color; chipBorder = ac.border;
                }
                html += `<span class="ag-cal-chip"
                    style="background:${chipBg};color:${chipColor};border:1px solid ${chipBorder};
                           ${isCan?'text-decoration:line-through;opacity:.6':''}
                           font-size:.72rem;padding:1px 5px;cursor:pointer"
                    title="${r.numero_sesion || ''} — ${r.estatus}${r.observaciones ? '\n'+r.observaciones : ''}"
                    data-reunion-id="${r.id}">
                    ${d.getDate()}
                </span>`;
            });
            if (sesiones.length === 0) html += `<span class="text-muted" style="font-size:.6rem">—</span>`;
            html += `</td>`;
        }
        html += `</tr>`;
    });

    html += `</tbody></table></div>

    <!-- Leyenda de áreas -->
    <div class="d-flex flex-wrap gap-2 mt-3">
      <span class="small fw-semibold text-muted me-1">Áreas:</span>`;
    Object.entries(AG_AREA).forEach(([key, ac]) => {
        html += `<span class="badge" style="background:${ac.bg};color:${ac.color};border:1px solid ${ac.border};font-size:.72rem">
            ${key} — ${ac.name}</span>`;
    });
    html += `</div>`;

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
