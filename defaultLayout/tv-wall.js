(function () {
  'use strict';

  const ROL_BUCKET = 'rol_catorcenal';
  const NOTES_TABLE = 'tv_notas';

  let yoyChart = null;
  let isAdminMode = false;
  let isViewOnlyMode = true;

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMonthLabel(m) {
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return names[m - 1] || String(m);
  }

  function fmtNum(n) {
    return new Intl.NumberFormat('es-MX').format(Number(n || 0));
  }

  function fmtDate(iso) {
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async function ensureClient() {
    if (typeof window.ensureSupabaseClient === 'function') return window.ensureSupabaseClient();
    if (window.supabaseClient) return window.supabaseClient;
    throw new Error('Supabase no inicializado');
  }

  async function isCurrentUserAdmin() {
    try {
      const sb = await ensureClient();
      const { data: userRes, error: userErr } = await sb.auth.getUser();
      if (userErr || !userRes || !userRes.user) return false;

      const userId = userRes.user.id;
      const { data: roles, error: roleErr } = await sb
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleErr || !roles || !roles.length) return false;
      return roles.some((r) => ['admin', 'superadmin', 'editor'].includes(String(r.role || '').toLowerCase()));
    } catch (_err) {
      return false;
    }
  }

  async function loadYoY() {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from('monthly_operations')
      .select('year, month, comercial_ops, comercial_pax')
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) throw error;
    const rows = data || [];
    if (!rows.length) return;

    const years = [...new Set(rows.map((r) => Number(r.year)).filter(Number.isFinite))].sort((a, b) => a - b);
    const chosenYears = years.slice(-3);

    const yearsPill = document.getElementById('yoy-years-pill');
    if (yearsPill) yearsPill.textContent = `Años: ${chosenYears.join(', ')}`;

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const datasets = chosenYears.map((yr, idx) => {
      const color = ['#2dd4bf', '#60a5fa', '#f59e0b'][idx] || '#c084fc';
      return {
        label: String(yr),
        data: months.map((m) => {
          const row = rows.find((r) => Number(r.year) === yr && Number(r.month) === m);
          return row ? Number(row.comercial_ops || 0) : null;
        }),
        borderColor: color,
        backgroundColor: color + '33',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      };
    });

    const chartEl = document.getElementById('yoy-wall-chart');
    if (chartEl) {
      if (yoyChart) yoyChart.destroy();
      yoyChart = new Chart(chartEl, {
        type: 'line',
        data: {
          labels: months.map(fmtMonthLabel),
          datasets,
        },
        options: {
          maintainAspectRatio: false,
          animation: { duration: 450 },
          plugins: {
            legend: { labels: { color: '#e8f1ff', boxWidth: 10, usePointStyle: true } },
          },
          scales: {
            x: { ticks: { color: '#bad2f2' }, grid: { color: 'rgba(255,255,255,.08)' } },
            y: { ticks: { color: '#bad2f2' }, grid: { color: 'rgba(255,255,255,.08)' } },
          },
        },
      });
    }

    const latestYear = chosenYears[chosenYears.length - 1];
    const prevYear = chosenYears.length > 1 ? chosenYears[chosenYears.length - 2] : null;
    const latestOps = rows.filter((r) => Number(r.year) === latestYear).reduce((a, r) => a + Number(r.comercial_ops || 0), 0);
    const latestPax = rows.filter((r) => Number(r.year) === latestYear).reduce((a, r) => a + Number(r.comercial_pax || 0), 0);
    const prevOps = prevYear ? rows.filter((r) => Number(r.year) === prevYear).reduce((a, r) => a + Number(r.comercial_ops || 0), 0) : 0;
    const delta = prevOps > 0 ? ((latestOps - prevOps) / prevOps) * 100 : null;

    const kpis = document.getElementById('yoy-kpis');
    if (kpis) {
      kpis.innerHTML = `
        <div class="kpi"><div class="lbl">Operaciones ${latestYear}</div><div class="val">${fmtNum(latestOps)}</div></div>
        <div class="kpi"><div class="lbl">Pasajeros ${latestYear}</div><div class="val">${fmtNum(latestPax)}</div></div>
        <div class="kpi"><div class="lbl">Variación vs ${prevYear || '-'}</div><div class="val">${delta == null ? '-' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}</div></div>
      `;
    }

    const table = document.querySelector('#yoy-wall-table tbody');
    const head = document.querySelector('#yoy-wall-table thead tr');
    if (head) {
      head.innerHTML = '<th>Mes</th>' + chosenYears.map((y) => `<th>${y}</th>`).join('');
    }
    if (table) {
      table.innerHTML = months.map((m) => {
        const cols = chosenYears.map((y) => {
          const row = rows.find((r) => Number(r.year) === y && Number(r.month) === m);
          return `<td>${row ? fmtNum(row.comercial_ops) : '-'}</td>`;
        }).join('');
        return `<tr><td>${fmtMonthLabel(m)}</td>${cols}</tr>`;
      }).join('');
    }
  }

  async function loadRolPdf() {
    const sb = await ensureClient();
    const meta = document.getElementById('rol-meta');
    const iframe = document.getElementById('rol-pdf-frame');

    const { data: files, error } = await sb.storage.from(ROL_BUCKET).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error || !files || !files.length) {
      if (meta) meta.textContent = 'Sin archivo detectado en bucket rol_catorcenal.';
      if (iframe) iframe.removeAttribute('src');
      return;
    }

    const firstPdf = files.find((f) => String(f.name || '').toLowerCase().endsWith('.pdf'));
    if (!firstPdf) {
      if (meta) meta.textContent = 'No hay archivos PDF en rol_catorcenal.';
      return;
    }

    const { data: pub } = sb.storage.from(ROL_BUCKET).getPublicUrl(firstPdf.name);
    const pdfParams = isViewOnlyMode
      ? '#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=1'
      : '#page=1&view=FitH';
    const url = `${pub.publicUrl}${pdfParams}`;
    if (iframe) iframe.src = url;

    const dt = firstPdf.created_at ? new Date(firstPdf.created_at).toLocaleString('es-MX') : 'sin fecha';
    if (meta) meta.textContent = `Archivo: ${firstPdf.name} · actualizado ${dt}`;
  }

  async function loadNotes() {
    const sb = await ensureClient();
    const list = document.getElementById('notas-list');
    const count = document.getElementById('notas-count');

    const { data, error } = await sb
      .from(NOTES_TABLE)
      .select('id, titulo, nota, prioridad, activa, updated_at')
      .eq('activa', true)
      .order('prioridad', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(25);

    if (error) {
      if (list) list.innerHTML = `<div class="empty">Error cargando notas: ${error.message}</div>`;
      return;
    }

    const rows = data || [];
    if (count) count.textContent = `${rows.length} nota(s)`;
    if (!list) return;

    if (!rows.length) {
      list.innerHTML = '<div class="empty">Sin notas activas.</div>';
      return;
    }

    list.innerHTML = rows.map((n) => {
      const borderColor = Number(n.prioridad || 0) >= 8 ? '#f87171' : Number(n.prioridad || 0) >= 5 ? '#fbbf24' : '#3aa5ff';
      return `
        <article class="note-item" style="border-left-color:${borderColor}">
          <div class="note-top">
            <div class="note-title">${escapeHtml(n.titulo || 'Nota operativa')}</div>
            <div class="note-date">${n.updated_at ? new Date(n.updated_at).toLocaleString('es-MX') : ''}</div>
          </div>
          <div class="note-body">${escapeHtml(n.nota || '')}</div>
          ${isAdminMode ? `<div class="note-actions"><button class="btn btn-sm btn-outline-warning" data-note-id="${n.id}">Desactivar</button></div>` : ''}
        </article>
      `;
    }).join('');

    if (isAdminMode) {
      list.querySelectorAll('[data-note-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-note-id');
          if (id) deactivateNote(id).catch(console.error);
        });
      });
    }
  }

  async function addNote() {
    const titleEl = document.getElementById('nota-titulo-input');
    const bodyEl = document.getElementById('nota-body-input');
    const priorityEl = document.getElementById('nota-prioridad-input');
    const statusEl = document.getElementById('nota-admin-status');

    const titulo = titleEl ? titleEl.value.trim() : '';
    const nota = bodyEl ? bodyEl.value.trim() : '';
    const prioridad = Number(priorityEl ? priorityEl.value : 5);

    if (!titulo || !nota) {
      if (statusEl) statusEl.textContent = 'Titulo y nota son obligatorios.';
      return;
    }

    if (statusEl) statusEl.textContent = 'Guardando nota...';
    const sb = await ensureClient();
    const { error } = await sb.from(NOTES_TABLE).insert({ titulo, nota, prioridad, activa: true });

    if (error) {
      if (statusEl) statusEl.textContent = `Error: ${error.message}`;
      return;
    }

    if (titleEl) titleEl.value = '';
    if (bodyEl) bodyEl.value = '';
    if (priorityEl) priorityEl.value = '5';
    if (statusEl) statusEl.textContent = 'Nota agregada.';
    await loadNotes();
  }

  async function deactivateNote(noteId) {
    const statusEl = document.getElementById('nota-admin-status');
    if (statusEl) statusEl.textContent = 'Actualizando nota...';

    const sb = await ensureClient();
    const { error } = await sb
      .from(NOTES_TABLE)
      .update({ activa: false })
      .eq('id', Number(noteId));

    if (error) {
      if (statusEl) statusEl.textContent = `Error: ${error.message}`;
      return;
    }

    if (statusEl) statusEl.textContent = 'Nota desactivada.';
    await loadNotes();
  }

  // ── Mis Notas Personales (Supabase · user_notes) ────────────────────────
  const USER_NOTES_TABLE = 'user_notes';
  let _personalNotes = [];

  function getLocalNoteDays() {
    const now = new Date();
    const monthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return _personalNotes
      .filter((n) => String(n.fecha || '').startsWith(monthIso))
      .map((n) => Number(String(n.fecha).slice(8, 10)));
  }

  function renderLocalNotes() {
    const list = document.getElementById('local-notes-list');
    if (!list) return;
    if (!_personalNotes.length) {
      list.innerHTML = '<div class="empty">Sin notas personales.</div>';
      return;
    }
    list.innerHTML = _personalNotes.map((n) => `
      <article class="note-item" style="border-left-color:#a78bfa">
        <div class="note-top">
          <div class="note-title">${escapeHtml(n.titulo || 'Nota')}</div>
          <div class="note-date">${n.fecha ? new Date(`${n.fecha}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
        </div>
        <div class="note-body">${escapeHtml(n.nota || '')}</div>
        <div class="note-actions">
          <button class="btn btn-sm btn-outline-danger btn-local-del" data-lid="${n.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
      </article>
    `).join('');
    list.querySelectorAll('.btn-local-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-lid'));
        deletePersonalNote(id).catch(console.error);
      });
    });
  }

  async function loadPersonalNotes() {
    try {
      const sb = await ensureClient();
      const { data: userRes } = await sb.auth.getUser();
      if (!userRes || !userRes.user) { _personalNotes = []; renderLocalNotes(); return; }
      const { data, error } = await sb
        .from(USER_NOTES_TABLE)
        .select('id, titulo, nota, fecha, created_at')
        .eq('user_id', userRes.user.id)
        .eq('activa', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      _personalNotes = data || [];
    } catch (err) {
      console.warn('[user_notes] load error', err);
      _personalNotes = [];
    }
    renderLocalNotes();
    refreshCalendarWithLocalNotes();
  }

  async function addLocalNote() {
    const titleEl  = document.getElementById('local-nota-titulo');
    const bodyEl   = document.getElementById('local-nota-body');
    const dateEl   = document.getElementById('local-nota-fecha');
    const statusEl = document.getElementById('local-nota-status');
    const titulo = titleEl ? titleEl.value.trim() : '';
    const nota   = bodyEl  ? bodyEl.value.trim()  : '';
    const fecha  = dateEl  ? (dateEl.value || null) : null;
    if (!titulo) { if (statusEl) statusEl.textContent = 'El título es obligatorio.'; return; }
    if (statusEl) statusEl.textContent = 'Guardando...';
    try {
      const sb = await ensureClient();
      const { data: userRes } = await sb.auth.getUser();
      if (!userRes || !userRes.user) { if (statusEl) statusEl.textContent = 'Debes iniciar sesión.'; return; }
      const { error } = await sb.from(USER_NOTES_TABLE).insert({
        user_id: userRes.user.id, titulo, nota, fecha, activa: true,
      });
      if (error) throw error;
      if (titleEl) titleEl.value = '';
      if (bodyEl)  bodyEl.value  = '';
      if (dateEl)  dateEl.value  = '';
      if (statusEl) statusEl.textContent = '';
      await loadPersonalNotes();
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  }

  async function deletePersonalNote(id) {
    try {
      const sb = await ensureClient();
      await sb.from(USER_NOTES_TABLE).update({ activa: false }).eq('id', id);
      await loadPersonalNotes();
    } catch (err) {
      console.warn('[user_notes] delete error', err);
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  let _lastCalEvents = [];

  function renderMiniCalendar(events, localNoteDays) {
    const el = document.getElementById('route-calendar-mini');
    const pill = document.getElementById('cal-month-pill');
    if (!el) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthIso = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (pill) pill.textContent = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

    const byDay = new Map();
    events.filter((e) => String(e.launch_date || '').startsWith(monthIso)).forEach((e) => {
      const day = Number(String(e.launch_date).slice(8, 10));
      byDay.set(day, (byDay.get(day) || 0) + 1);
    });

    const localDays = new Set(localNoteDays || []);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const heads = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

    let html = '<div class="cal-grid">' + heads.map((h) => `<div class="cal-head">${h}</div>`).join('') + '</div><div class="cal-grid">';
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const hit = byDay.get(d) || 0;
      const hasLocal = localDays.has(d);
      html += `<div class="cal-day"><div class="num">${d}</div>${hit ? `<span class="cal-hit">${hit}</span>` : ''}${hasLocal ? `<span class="cal-local-dot" title="Nota personal">●</span>` : ''}</div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function refreshCalendarWithLocalNotes() {
    renderMiniCalendar(_lastCalEvents, getLocalNoteDays());
  }

  async function loadRouteCalendar() {
    const sb = await ensureClient();
    const up = document.getElementById('route-upcoming');

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch full current month for calendar dots (includes past days in the month)
    const { data: monthData } = await sb
      .from('route_launch_calendar')
      .select('route_name, airline, scope, launch_date, status')
      .eq('is_active', true)
      .neq('status', 'cancelada')
      .gte('launch_date', monthStart)
      .order('launch_date', { ascending: true })
      .limit(200);

    _lastCalEvents = monthData || [];

    // Fetch upcoming (future only) for the list
    const { data, error } = await sb
      .from('route_launch_calendar')
      .select('route_name, airline, scope, launch_date, status')
      .eq('is_active', true)
      .neq('status', 'cancelada')
      .gte('launch_date', todayIso)
      .order('launch_date', { ascending: true })
      .limit(120);

    if (error) {
      if (up) up.innerHTML = `<div class="empty">Error cargando calendario: ${error.message}</div>`;
      return;
    }

    const rows = data || [];
    renderMiniCalendar(_lastCalEvents, getLocalNoteDays());

    if (!up) return;
    if (!rows.length) {
      up.innerHTML = '<div class="empty">Sin inauguraciones próximas.</div>';
      return;
    }

    up.innerHTML = rows.slice(0, 8).map((r) => {
      const dt = fmtDate(r.launch_date);
      return `
        <article class="up-item">
          <div class="route">${escapeHtml(r.route_name || 'Ruta')}</div>
          <div class="meta">${escapeHtml(r.airline || '-')} · ${escapeHtml(r.scope || '-')} · ${dt} · ${escapeHtml(r.status || '-')}</div>
        </article>
      `;
    }).join('');
  }

  async function uploadRolPdf() {
    const input = document.getElementById('rol-pdf-input');
    const status = document.getElementById('rol-upload-status');
    const file = input && input.files && input.files[0] ? input.files[0] : null;
    if (!file) {
      if (status) status.textContent = 'Selecciona un PDF primero.';
      return;
    }
    if (!String(file.type || '').includes('pdf')) {
      if (status) status.textContent = 'El archivo debe ser PDF.';
      return;
    }

    if (status) status.textContent = 'Subiendo...';
    const sb = await ensureClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetName = `${new Date().toISOString().slice(0, 10)}_${safeName}`;

    const { error } = await sb.storage.from(ROL_BUCKET).upload(targetName, file, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '60',
    });

    if (error) {
      if (status) status.textContent = `Error: ${error.message}`;
      return;
    }

    if (status) status.textContent = `Listo: ${targetName}`;
    await loadRolPdf();
  }

  async function renderAll() {
    try {
      await ensureClient();
      await Promise.all([loadYoY(), loadRolPdf(), loadNotes(), loadRouteCalendar(), loadPersonalNotes()]);
    } catch (err) {
      console.error('[tv-wall]', err);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const params = new URLSearchParams(window.location.search);
    const forcedViewOnly = params.get('tv') === '1' || params.get('mode') === 'tv';
    const adminModeByUrl = params.get('admin') === '1' || params.get('mode') === 'admin';
    const adminModeByStorage = window.localStorage && window.localStorage.getItem('tvWallAdmin') === '1' && !forcedViewOnly;
    const adminModeByRole = await isCurrentUserAdmin();
    const adminMode = adminModeByRole && (adminModeByUrl || adminModeByStorage);

    isAdminMode = adminMode;
    isViewOnlyMode = !adminMode || forcedViewOnly;
    document.body.classList.toggle('view-only', isViewOnlyMode);
    document.body.classList.toggle('admin-mode', isAdminMode);

    if (adminModeByUrl && adminModeByRole && window.localStorage) {
      window.localStorage.setItem('tvWallAdmin', '1');
    }
    if (forcedViewOnly && window.localStorage) {
      window.localStorage.removeItem('tvWallAdmin');
    }

    const uploadTools = document.getElementById('rol-upload-tools');
    const uploadBtn = document.getElementById('btn-upload-rol');
    const iframe = document.getElementById('rol-pdf-frame');
    if (adminMode && uploadTools) uploadTools.classList.remove('d-none');
    if (uploadBtn) uploadBtn.addEventListener('click', () => uploadRolPdf().catch(console.error));

    const notesTools = document.getElementById('notes-admin-tools');
    const addNoteBtn = document.getElementById('btn-add-nota');
    if (adminMode && notesTools) notesTools.classList.remove('d-none');
    if (addNoteBtn) addNoteBtn.addEventListener('click', () => addNote().catch(console.error));

    // Mis Notas Personales (Supabase) — always available
    const addLocalBtn = document.getElementById('btn-add-local-nota');
    if (addLocalBtn) addLocalBtn.addEventListener('click', () => addLocalNote().catch(console.error));

    const btnRefresh = document.getElementById('btn-refresh-rol');
    if (btnRefresh) btnRefresh.addEventListener('click', () => loadRolPdf().catch(console.error));

    // ── Panel FIDS / Calendario ─────────────────────────────────────────────
    const fidsUrl    = (window.FIDS_IFRAME_URL || '').trim();
    const fidsBody   = document.getElementById('panel-fids-body');
    const calBody    = document.getElementById('panel-cal-body');
    const fidsFrame  = document.getElementById('fids-board-frame');
    const noUrlMsg   = document.getElementById('fids-no-url-msg');
    const toggleBtn  = document.getElementById('btn-toggle-fids');
    const panelTitle = document.getElementById('panel-fids-title');
    const panelIcon  = document.getElementById('panel-fids-icon');
    const calPill    = document.getElementById('cal-month-pill');

    let showingFids = !!fidsUrl;

    function activateFidsView() {
      showingFids = true;
      if (fidsBody) fidsBody.classList.remove('d-none');
      if (calBody) calBody.classList.add('d-none');
      if (panelTitle) panelTitle.textContent = window.FIDS_PANEL_TITLE || 'Tablero FIDS';
      if (panelIcon) panelIcon.className = window.FIDS_PANEL_ICON || 'fas fa-plane-departure';
      if (calPill) calPill.classList.add('d-none');
    }

    function activateCalView() {
      showingFids = false;
      if (fidsBody) fidsBody.classList.add('d-none');
      if (calBody) calBody.classList.remove('d-none');
      if (panelTitle) panelTitle.textContent = 'Calendario Rutas';
      if (panelIcon) panelIcon.className = 'fas fa-calendar-check';
      if (calPill) calPill.classList.remove('d-none');
    }

    if (fidsUrl) {
      // Hay URL configurada: mostrar FIDS y ofrecer toggle a Calendario
      if (noUrlMsg) noUrlMsg.style.display = 'none';
      if (fidsFrame) { fidsFrame.style.display = 'block'; fidsFrame.src = fidsUrl; }
      if (toggleBtn) toggleBtn.classList.remove('d-none');
      activateFidsView();

      // Auto-refresh del iframe FIDS
      const refreshSecs = Number(window.FIDS_REFRESH_SECS || 0);
      if (refreshSecs > 0 && fidsFrame) {
        setInterval(() => {
          if (showingFids) fidsFrame.src = fidsUrl;
        }, refreshSecs * 1000);
      }

      // Toggle button
      toggleBtn && toggleBtn.addEventListener('click', () => {
        if (showingFids) {
          activateCalView();
          loadRouteCalendar().catch(console.error);
        } else {
          activateFidsView();
        }
      });
    } else {
      // Sin URL: mostrar Calendario por defecto
      activateCalView();
    }
    // ────────────────────────────────────────────────────────────────────────

    await renderAll();

    setInterval(() => {
      loadYoY().catch(console.error);
      loadNotes().catch(console.error);
      loadPersonalNotes().catch(console.error);
      if (!showingFids) loadRouteCalendar().catch(console.error);
    }, 120000);

    setInterval(() => {
      loadRolPdf().catch(console.error);
    }, 300000);
  });
})();
