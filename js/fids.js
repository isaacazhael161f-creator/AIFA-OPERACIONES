// ================================================================
// AIFA OPERACIONES — Módulo FIDS (Flight Information Display System)
// Vista de respaldo para tablero de vuelos
// ================================================================
(function () {
  'use strict';

  // ── Colores por aerolínea ────────────────────────────────────────
  const AIRLINE_COLORS = {
    'VB': { bg: '#00a651', text: '#fff', name: 'VivaAerobus' },
    'AM': { bg: '#0a2240', text: '#fff', name: 'Aeroméxico' },
    'Y4': { bg: '#6d2077', text: '#fff', name: 'Volaris' },
    'MX': { bg: '#1e3a8a', text: '#fff', name: 'Mexicana' },
    '4O': { bg: '#c0392b', text: '#fff', name: 'InterJet' },
    'LA': { bg: '#e63946', text: '#fff', name: 'LATAM' },
    '6R': { bg: '#f39c12', text: '#000', name: 'Aeromar' },
    'TS': { bg: '#0288d1', text: '#fff', name: 'Air Transat' },
    'WS': { bg: '#009B3A', text: '#fff', name: 'WestJet' },
    'AA': { bg: '#0078d2', text: '#fff', name: 'American' },
    'UA': { bg: '#003580', text: '#fff', name: 'United' },
    'DL': { bg: '#c8102e', text: '#fff', name: 'Delta' },
    'IB': { bg: '#cc0001', text: '#fff', name: 'Iberia' },
    'AV': { bg: '#e31837', text: '#fff', name: 'Avianca' },
    'CM': { bg: '#005b9a', text: '#fff', name: 'Copa' },
  };

  const ESTADO_CLASES = {
    'A tiempo':     'fids-estado-ok',
    'Aterrizo':     'fids-estado-ok',
    'Aterrizó':     'fids-estado-ok',
    'Despegó':      'fids-estado-ok',
    'En puerta':    'fids-estado-puerta',
    'Abordando':    'fids-estado-puerta',
    'Embarcando':   'fids-estado-puerta',
    'Cancelado':    'fids-estado-cancelado',
    'Demorado':     'fids-estado-demorado',
    'En vuelo':     'fids-estado-vuelo',
  };

  // ── Estado del módulo ────────────────────────────────────────────
  let _vuelos      = [];
  let _fecha       = new Date().toISOString().split('T')[0];
  let _tipo        = 'llegada';
  let _clockTimer  = null;
  let _scrollTimer = null;
  let _realtimeCh  = null;
  let _editingId   = null;
  let _activeTab   = 'display'; // 'display' | 'admin'
  let _importing   = false;

  // ── Helpers ──────────────────────────────────────────────────────
  function getAirlineStyle(iata, nombre) {
    const key = (iata || '').toUpperCase();
    const cfg  = AIRLINE_COLORS[key];
    if (cfg) return cfg;
    // Generar color determinístico a partir del nombre
    let hash = 0;
    const s = (nombre || key || '?').toUpperCase();
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return { bg: `hsl(${h},60%,30%)`, text: '#fff', name: nombre || key };
  }

  function formatTime(t) {
    if (!t) return '—';
    // t puede ser "HH:MM:SS" o "HH:MM"
    return t.slice(0, 5);
  }

  function formatFecha(d) {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dias  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const dt    = new Date(y, parseInt(m) - 1, parseInt(dd));
    return `${dias[dt.getDay()]}, ${meses[parseInt(m)-1]} ${dd}, ${y}`;
  }

  function nowTimeStr() {
    const n = new Date();
    return n.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  // ── Inicialización ───────────────────────────────────────────────
  async function init() {
    renderShell();
    await loadVuelos();
    startClock();
    startRealtime();
  }

  function renderShell() {
    const sec = document.getElementById('fids-section');
    if (!sec) return;
    sec.innerHTML = `
    <div class="fids-wrapper">
      <!-- TABS ADMIN / DISPLAY -->
      <div class="fids-top-bar d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2 px-1">
        <div class="fids-tab-btns d-flex gap-2">
          <button class="btn fids-tab-btn active" id="fids-tab-display" onclick="window.fidsShowTab('display')">
            <i class="fas fa-tv me-1"></i> Pantalla FIDS
          </button>
          <button class="btn fids-tab-btn" id="fids-tab-admin" onclick="window.fidsShowTab('admin')">
            <i class="fas fa-table me-1"></i> Administrar vuelos
          </button>
        </div>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <input type="date" id="fids-fecha-picker" class="form-control form-control-sm fids-date-picker"
                 value="${_fecha}" onchange="window.fidsOnFechaChange(this.value)">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn fids-tipo-btn ${_tipo==='llegada'?'active':''}" data-tipo="llegada"
                    onclick="window.fidsSetTipo('llegada')"><i class="fas fa-plane-arrival me-1"></i>Llegadas</button>
            <button class="btn fids-tipo-btn ${_tipo==='salida'?'active':''}" data-tipo="salida"
                    onclick="window.fidsSetTipo('salida')"><i class="fas fa-plane-departure me-1"></i>Salidas</button>
          </div>
        </div>
      </div>

      <!-- PANTALLA FIDS (DISPLAY) -->
      <div id="fids-display-pane" class="fids-pane">
        <div class="fids-screen">
          <div class="fids-screen-header">
            <div class="fids-screen-logo"><img src="images/aifa-logo.png" alt="AIFA" height="36"></div>
            <div class="fids-screen-title">
              <span class="fids-screen-tipo" id="fids-screen-tipo">LLEGADAS</span>
              <span class="fids-screen-fecha" id="fids-screen-fecha"></span>
            </div>
            <div class="fids-screen-clock" id="fids-clock">--:--:--</div>
          </div>
          <div class="fids-screen-cols">
            <div class="fids-col-aerolinea">AEROLÍNEA</div>
            <div class="fids-col-vuelo">VUELO</div>
            <div class="fids-col-ciudad">${_tipo==='llegada'?'ORIGEN':'DESTINO'}</div>
            <div class="fids-col-hora">HORA</div>
            <div class="fids-col-puerta">PUERTA</div>
            <div class="fids-col-estado">ESTADO</div>
          </div>
          <div class="fids-rows-container" id="fids-rows">
            <div class="fids-loading"><i class="fas fa-spinner fa-spin"></i> Cargando vuelos…</div>
          </div>
          <div class="fids-screen-footer">
            <span>AEROPUERTO INTERNACIONAL FELIPE ÁNGELES</span>
            <span id="fids-footer-count"></span>
          </div>
        </div>
      </div>

      <!-- PANEL ADMIN -->
      <div id="fids-admin-pane" class="fids-pane d-none">
        <div class="fids-admin-toolbar d-flex gap-2 align-items-center flex-wrap mb-3">
          <button class="btn btn-sm btn-primary" onclick="window.fidsAddRow()">
            <i class="fas fa-plus me-1"></i> Agregar vuelo
          </button>
          <label class="btn btn-sm btn-success mb-0" for="fids-xlsx-input">
            <i class="fas fa-file-excel me-1"></i> Importar Excel
          </label>
          <input type="file" id="fids-xlsx-input" accept=".xlsx,.xls" class="d-none"
                 onchange="window.fidsImportExcel(event)">
          <button class="btn btn-sm btn-outline-secondary ms-auto" onclick="window.fidsRefresh()">
            <i class="fas fa-sync-alt me-1"></i> Actualizar
          </button>
          <span id="fids-admin-count" class="badge bg-secondary"></span>
        </div>
        <div class="table-responsive fids-admin-table-wrap">
          <table class="table table-sm table-hover fids-admin-table" id="fids-admin-table">
            <thead class="table-dark">
              <tr>
                <th>Vuelo</th>
                <th>Aerolínea</th>
                <th>IATA</th>
                <th>${_tipo==='llegada'?'Origen':'Destino'}</th>
                <th>Hora prog.</th>
                <th>Hora est.</th>
                <th>Puerta</th>
                <th>Estado</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="fids-admin-tbody">
              <tr><td colspan="10" class="text-center py-3">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
        <!-- MODAL EDICIÓN -->
        <div class="modal fade" id="fidsEditModal" tabindex="-1">
          <div class="modal-dialog modal-lg">
            <div class="modal-content">
              <div class="modal-header bg-dark text-white">
                <h5 class="modal-title"><i class="fas fa-edit me-2"></i><span id="fids-modal-title">Editar vuelo</span></h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">N° Vuelo *</label>
                    <input type="text" class="form-control" id="fids-edit-vuelo" placeholder="Ej. VB7417" maxlength="20">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">Aerolínea *</label>
                    <input type="text" class="form-control" id="fids-edit-aerolinea" placeholder="Ej. VivaAerobus">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">Código IATA</label>
                    <input type="text" class="form-control" id="fids-edit-iata" placeholder="VB" maxlength="5">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">${_tipo==='llegada'?'Ciudad origen':'Ciudad destino'} *</label>
                    <input type="text" class="form-control" id="fids-edit-ciudad" placeholder="Ej. Guadalajara">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-bold">Hora programada *</label>
                    <input type="time" class="form-control" id="fids-edit-hora-prog">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-bold">Hora estimada</label>
                    <input type="time" class="form-control" id="fids-edit-hora-est">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-bold">Puerta</label>
                    <input type="text" class="form-control" id="fids-edit-puerta" placeholder="Ej. A3" maxlength="10">
                  </div>
                  <div class="col-md-5">
                    <label class="form-label small fw-bold">Estado</label>
                    <select class="form-select" id="fids-edit-estado">
                      <option>A tiempo</option>
                      <option>En puerta</option>
                      <option>Abordando</option>
                      <option>Embarcando</option>
                      <option>Aterrizó</option>
                      <option>Despegó</option>
                      <option>Demorado</option>
                      <option>Cancelado</option>
                      <option>En vuelo</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">Orden en pantalla</label>
                    <input type="number" class="form-control" id="fids-edit-orden" min="1" max="999">
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-bold">Notas</label>
                    <input type="text" class="form-control" id="fids-edit-notas" placeholder="Observaciones opcionales" maxlength="200">
                  </div>
                </div>
                <div id="fids-edit-status" class="mt-2"></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="window.fidsSaveRow()">
                  <i class="fas fa-save me-1"></i> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    // Inicializar fecha en display
    document.getElementById('fids-screen-fecha').textContent = formatFecha(_fecha);
    document.getElementById('fids-screen-tipo').textContent  = _tipo === 'llegada' ? 'LLEGADAS' : 'SALIDAS';
  }

  // ── Tabs ─────────────────────────────────────────────────────────
  window.fidsShowTab = function (tab) {
    _activeTab = tab;
    document.getElementById('fids-display-pane').classList.toggle('d-none', tab !== 'display');
    document.getElementById('fids-admin-pane').classList.toggle('d-none',   tab !== 'admin');
    document.getElementById('fids-tab-display').classList.toggle('active', tab === 'display');
    document.getElementById('fids-tab-admin').classList.toggle('active',   tab === 'admin');
    if (tab === 'admin') renderAdminTable();
  };

  window.fidsOnFechaChange = function (v) {
    _fecha = v;
    document.getElementById('fids-screen-fecha').textContent = formatFecha(v);
    loadVuelos();
  };

  window.fidsSetTipo = function (t) {
    _tipo = t;
    document.querySelectorAll('.fids-tipo-btn').forEach(b => b.classList.toggle('active', b.dataset.tipo === t));
    document.getElementById('fids-screen-tipo').textContent = t === 'llegada' ? 'LLEGADAS' : 'SALIDAS';
    loadVuelos();
  };

  window.fidsRefresh = function () { loadVuelos(); };

  // ── Carga de datos ───────────────────────────────────────────────
  async function loadVuelos() {
    setDisplayLoading(true);
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('Sin cliente Supabase');
      const { data, error } = await sb
        .from('fids_vuelos')
        .select('*')
        .eq('fecha', _fecha)
        .eq('tipo',  _tipo)
        .eq('activo', true)
        .order('orden', { ascending: true, nullsFirst: false })
        .order('hora_programada', { ascending: true });
      if (error) throw error;
      _vuelos = data || [];
      renderDisplayRows();
      renderAdminTable();
    } catch (e) {
      console.error('[FIDS]', e);
      setDisplayLoading(false, `<div class="fids-error"><i class="fas fa-exclamation-circle me-2"></i>Error al cargar vuelos: ${e.message}</div>`);
    }
  }

  function setDisplayLoading(on, html) {
    const rows = document.getElementById('fids-rows');
    if (!rows) return;
    if (on) rows.innerHTML = '<div class="fids-loading"><i class="fas fa-spinner fa-spin me-2"></i>Cargando vuelos…</div>';
    else if (html) rows.innerHTML = html;
  }

  // ── RENDER pantalla FIDS ─────────────────────────────────────────
  function renderDisplayRows() {
    const rows = document.getElementById('fids-rows');
    if (!rows) return;

    // Actualizar columna header
    const colCiudad = document.querySelector('.fids-col-ciudad');
    if (colCiudad) colCiudad.textContent = _tipo === 'llegada' ? 'ORIGEN' : 'DESTINO';

    const footer = document.getElementById('fids-footer-count');
    if (footer) footer.textContent = `${_vuelos.length} vuelo${_vuelos.length !== 1 ? 's' : ''}`;

    if (!_vuelos.length) {
      rows.innerHTML = `<div class="fids-empty"><i class="fas fa-info-circle me-2"></i>No hay vuelos registrados para esta fecha.</div>`;
      return;
    }

    rows.innerHTML = _vuelos.map((v, i) => {
      const al   = getAirlineStyle(v.codigo_iata, v.aerolinea);
      const est  = v.estado || 'A tiempo';
      const cls  = ESTADO_CLASES[est] || 'fids-estado-ok';
      const hora = v.hora_estimada ? formatTime(v.hora_estimada) : formatTime(v.hora_programada);
      const delayed = v.hora_estimada && v.hora_estimada !== v.hora_programada;
      const rowCls = i % 2 === 0 ? 'fids-row fids-row-even' : 'fids-row fids-row-odd';
      return `
      <div class="${rowCls}">
        <div class="fids-col-aerolinea">
          <span class="fids-airline-badge" style="background:${al.bg};color:${al.text};">
            ${(v.aerolinea||'').toUpperCase().slice(0,12)}
          </span>
        </div>
        <div class="fids-col-vuelo">${v.numero_vuelo || '—'}</div>
        <div class="fids-col-ciudad">${v.origen_destino || '—'}</div>
        <div class="fids-col-hora">
          <span class="${delayed ? 'fids-hora-delayed' : ''}">${hora}</span>
          ${delayed ? `<span class="fids-hora-orig">${formatTime(v.hora_programada)}</span>` : ''}
        </div>
        <div class="fids-col-puerta">${v.puerta || '—'}</div>
        <div class="fids-col-estado"><span class="fids-estado-badge ${cls}">${est}</span></div>
      </div>`;
    }).join('');
  }

  // ── RENDER tabla Admin ────────────────────────────────────────────
  function renderAdminTable() {
    const tbody = document.getElementById('fids-admin-tbody');
    if (!tbody) return;

    const count = document.getElementById('fids-admin-count');
    if (count) count.textContent = `${_vuelos.length} vuelos`;

    if (!_vuelos.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">Sin vuelos. Agrega uno o importa un Excel.</td></tr>`;
      return;
    }

    tbody.innerHTML = _vuelos.map(v => {
      const al  = getAirlineStyle(v.codigo_iata, v.aerolinea);
      return `<tr>
        <td class="fw-bold">${v.numero_vuelo || '—'}</td>
        <td><span class="badge" style="background:${al.bg};color:${al.text};">${v.aerolinea || '—'}</span></td>
        <td>${v.codigo_iata || '—'}</td>
        <td>${v.origen_destino || '—'}</td>
        <td>${formatTime(v.hora_programada)}</td>
        <td>${formatTime(v.hora_estimada)}</td>
        <td>${v.puerta || '—'}</td>
        <td><span class="badge ${badgeClass(v.estado)}">${v.estado || 'A tiempo'}</span></td>
        <td class="text-truncate" style="max-width:120px" title="${v.notas||''}">${v.notas || ''}</td>
        <td>
          <button class="btn btn-xs btn-outline-primary me-1" title="Editar" onclick="window.fidsEditRow('${v.id}')">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-xs btn-outline-danger" title="Eliminar" onclick="window.fidsDeleteRow('${v.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function badgeClass(estado) {
    const map = {
      'A tiempo': 'bg-success', 'En puerta': 'bg-primary', 'Abordando': 'bg-primary',
      'Embarcando': 'bg-primary', 'Aterrizó': 'bg-secondary', 'Despegó': 'bg-secondary',
      'Demorado': 'bg-warning text-dark', 'Cancelado': 'bg-danger', 'En vuelo': 'bg-info text-dark',
    };
    return map[estado] || 'bg-secondary';
  }

  // ── CRUD ──────────────────────────────────────────────────────────
  window.fidsAddRow = function () {
    _editingId = null;
    document.getElementById('fids-modal-title').textContent = 'Agregar vuelo';
    clearModal();
    const m = document.getElementById('fidsEditModal');
    if (m && bootstrap) bootstrap.Modal.getOrCreateInstance(m).show();
  };

  window.fidsEditRow = function (id) {
    const v = _vuelos.find(x => x.id === id);
    if (!v) return;
    _editingId = id;
    document.getElementById('fids-modal-title').textContent  = 'Editar vuelo';
    document.getElementById('fids-edit-vuelo').value         = v.numero_vuelo  || '';
    document.getElementById('fids-edit-aerolinea').value     = v.aerolinea     || '';
    document.getElementById('fids-edit-iata').value          = v.codigo_iata   || '';
    document.getElementById('fids-edit-ciudad').value        = v.origen_destino|| '';
    document.getElementById('fids-edit-hora-prog').value     = (v.hora_programada || '').slice(0, 5);
    document.getElementById('fids-edit-hora-est').value      = (v.hora_estimada  || '').slice(0, 5);
    document.getElementById('fids-edit-puerta').value        = v.puerta          || '';
    document.getElementById('fids-edit-estado').value        = v.estado          || 'A tiempo';
    document.getElementById('fids-edit-orden').value         = v.orden           || '';
    document.getElementById('fids-edit-notas').value         = v.notas           || '';
    document.getElementById('fids-edit-status').innerHTML    = '';
    const m = document.getElementById('fidsEditModal');
    if (m && bootstrap) bootstrap.Modal.getOrCreateInstance(m).show();
  };

  window.fidsSaveRow = async function () {
    const vuelo      = document.getElementById('fids-edit-vuelo').value.trim();
    const aerolinea  = document.getElementById('fids-edit-aerolinea').value.trim();
    const ciudad     = document.getElementById('fids-edit-ciudad').value.trim();
    const horaProg   = document.getElementById('fids-edit-hora-prog').value;
    if (!vuelo || !aerolinea || !ciudad || !horaProg) {
      showEditStatus('Por favor completa los campos requeridos (*)', true); return;
    }
    const payload = {
      fecha:           _fecha,
      tipo:            _tipo,
      numero_vuelo:    vuelo,
      aerolinea,
      codigo_iata:     document.getElementById('fids-edit-iata').value.trim().toUpperCase() || null,
      origen_destino:  ciudad,
      hora_programada: horaProg,
      hora_estimada:   document.getElementById('fids-edit-hora-est').value || null,
      puerta:          document.getElementById('fids-edit-puerta').value.trim() || null,
      estado:          document.getElementById('fids-edit-estado').value,
      orden:           parseInt(document.getElementById('fids-edit-orden').value) || null,
      notas:           document.getElementById('fids-edit-notas').value.trim() || null,
      activo:          true,
    };
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('Sin cliente Supabase');
      let error;
      if (_editingId) {
        ({ error } = await sb.from('fids_vuelos').update(payload).eq('id', _editingId));
      } else {
        ({ error } = await sb.from('fids_vuelos').insert(payload));
      }
      if (error) throw error;
      const m = document.getElementById('fidsEditModal');
      if (m && bootstrap) bootstrap.Modal.getOrCreateInstance(m).hide();
      await loadVuelos();
    } catch (e) {
      showEditStatus(`Error: ${e.message}`, true);
    }
  };

  window.fidsDeleteRow = async function (id) {
    if (!confirm('¿Eliminar este vuelo de la pantalla?')) return;
    try {
      const sb = window.supabaseClient;
      if (!sb) throw new Error('Sin cliente Supabase');
      const { error } = await sb.from('fids_vuelos').update({ activo: false }).eq('id', id);
      if (error) throw error;
      await loadVuelos();
    } catch (e) { alert('Error al eliminar: ' + e.message); }
  };

  function clearModal() {
    ['fids-edit-vuelo','fids-edit-aerolinea','fids-edit-iata','fids-edit-ciudad',
     'fids-edit-hora-prog','fids-edit-hora-est','fids-edit-puerta','fids-edit-orden','fids-edit-notas']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const sel = document.getElementById('fids-edit-estado');
    if (sel) sel.value = 'A tiempo';
    const st = document.getElementById('fids-edit-status');
    if (st) st.innerHTML = '';
  }

  function showEditStatus(msg, isErr) {
    const el = document.getElementById('fids-edit-status');
    if (!el) return;
    el.innerHTML = `<div class="alert alert-${isErr?'danger':'success'} py-1 small mt-1">${msg}</div>`;
  }

  // ── Importación Excel ─────────────────────────────────────────────
  window.fidsImportExcel = async function (e) {
    if (_importing) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    _importing = true;

    // Necesitamos SheetJS — cargarlo dinámicamente si no está disponible
    if (typeof XLSX === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    try {
      const ab   = await file.arrayBuffer();
      const wb   = XLSX.read(ab, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) { alert('El archivo está vacío.'); _importing = false; return; }

      // Mapear columnas flexiblemente
      const mappings = detectColumns(rows[0]);
      if (!mappings.vuelo || !mappings.hora) {
        alert('No se encontraron las columnas de Vuelo y Hora en el Excel.\nColumnas detectadas: ' + Object.keys(rows[0]).join(', '));
        _importing = false; return;
      }

      const records = rows.filter(r => r[mappings.vuelo]).map((r, i) => ({
        fecha:           _fecha,
        tipo:            _tipo,
        numero_vuelo:    String(r[mappings.vuelo] || '').trim(),
        aerolinea:       String(r[mappings.aerolinea] || '').trim() || 'Sin aerolínea',
        codigo_iata:     String(r[mappings.iata] || '').trim().toUpperCase() || null,
        origen_destino:  String(r[mappings.ciudad] || '').trim() || 'Sin destino',
        hora_programada: parseExcelTime(r[mappings.hora]),
        hora_estimada:   mappings.horaEst ? parseExcelTime(r[mappings.horaEst]) : null,
        estado:          String(r[mappings.estado] || 'A tiempo').trim(),
        puerta:          mappings.puerta ? String(r[mappings.puerta] || '').trim() || null : null,
        activo:          true,
        orden:           i + 1,
      })).filter(r => r.hora_programada);

      if (!records.length) { alert('No se encontraron filas válidas.'); _importing = false; return; }

      const confirmado = confirm(`Se importarán ${records.length} vuelo(s) para ${_tipo}s del ${_fecha}.\n¿Continuar? (esto no elimina registros existentes)`);
      if (!confirmado) { _importing = false; return; }

      const sb = window.supabaseClient;
      if (!sb) throw new Error('Sin cliente Supabase');
      const { error } = await sb.from('fids_vuelos').insert(records);
      if (error) throw error;
      alert(`✓ ${records.length} vuelos importados correctamente.`);
      await loadVuelos();
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
    _importing = false;
  };

  function detectColumns(firstRow) {
    const keys   = Object.keys(firstRow);
    const norm   = k => (k||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const find   = (...words) => keys.find(k => words.some(w => norm(k).includes(w)));
    return {
      vuelo:      find('vuelo','flight','numero','num'),
      aerolinea:  find('aerolinea','airline','aero','carrier','compania'),
      iata:       find('iata','codigo','code','siglas'),
      ciudad:     find('destino','origen','ciudad','city','ruta','route'),
      hora:       find('hora prog','programada','scheduled','hora sal','hora arr','hora','time'),
      horaEst:    find('hora est','estimada','estimated','eta','real'),
      estado:     find('estado','status','estatus','remark'),
      puerta:     find('puerta','gate'),
    };
  }

  function parseExcelTime(val) {
    if (!val && val !== 0) return null;
    // Número decimal de Excel: 0.5 = 12:00
    if (typeof val === 'number') {
      const totalMin = Math.round(val * 24 * 60);
      const h  = Math.floor(totalMin / 60) % 24;
      const m  = totalMin % 60;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    // String "HH:MM" o "H:MM AM/PM"
    const s = String(val).trim();
    const m1 = s.match(/^(\d{1,2}):(\d{2})/);
    if (m1) return `${m1[1].padStart(2,'0')}:${m1[2]}`;
    return null;
  }

  // ── Reloj en tiempo real ──────────────────────────────────────────
  function startClock() {
    clearInterval(_clockTimer);
    const el = document.getElementById('fids-clock');
    if (!el) return;
    _clockTimer = setInterval(() => {
      const el2 = document.getElementById('fids-clock');
      if (el2) el2.textContent = nowTimeStr();
    }, 1000);
    el.textContent = nowTimeStr();
  }

  // ── Supabase Realtime ─────────────────────────────────────────────
  function startRealtime() {
    const sb = window.supabaseClient;
    if (!sb) return;
    if (_realtimeCh) { sb.removeChannel(_realtimeCh); }
    _realtimeCh = sb.channel('fids-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fids_vuelos' }, () => {
        loadVuelos();
      })
      .subscribe();
  }

  // ── Exportar init ─────────────────────────────────────────────────
  let _initialized = false;

  window.initFids = function () {
    if (_initialized) {
      // Ya inicializado: solo refresca los datos
      loadVuelos();
      return;
    }
    _initialized = true;
    init();
  };

})();
