/**
 * portal-manifiestos.js  v2 · AIFA · 2026
 * Portal Digital de Manifiestos de Vuelo
 * — Prestadores: capturar y dar seguimiento a sus manifiestos
 * — Admin AIFA: revisar, aprobar o rechazar todos los manifiestos
 */
(async function PortalManifiestos() {
    'use strict';

    const TABLE = 'Conciliación Manifiestos';

    /* ── helpers ── */
    const $ = id => document.getElementById(id);
    const Q = sel => document.querySelector(sel);
    const show = id => { const e=$(id); if(e) e.classList.remove('d-none'); };
    const hide = id => { const e=$(id); if(e) e.classList.add('d-none'); };
    const val  = id => { const e=$(id); return e ? e.value : ''; };
    const setT = (id, t) => { const e=$(id); if(e) e.textContent=String(t); };
    const nv   = id => parseInt(val(id))||0;
    const fv   = id => parseFloat(val(id))||0;
    const esc  = t  => String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtD = d  => d ? new Date(d+'T12:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
    const fmtDL= d  => d ? new Date(d+'T12:00').toLocaleDateString('es-MX',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : '—';
    const fmtTS= ts => ts ? new Date(ts).toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

    /* ── estado global ── */
    let sb, user, isAdmin = false;
    let canAifa = false, canAfac = false, isReviewer = false, userRole = 'aerolinea';
    let provRows = [], adminRows = [], adminFiltered = [];
    let viewMode = 'provider'; // 'provider' | 'admin'

    /* ── roles ──
       aerolinea → captura · aifa → aprueba AIFA · afac → aprueba AFAC · admin → ambos */
    function resolveRole(u) {
        const meta  = u.user_metadata || {};
        const email = (u.email || '').toLowerCase();
        let role = String(meta.role || '').toLowerCase();
        if (!role) {
            if (email.includes('afac')) role = 'afac';
            else if (email.includes('aifa.admin') || email.includes('admin@') || email.includes('.admin@')) role = 'admin';
            else if (meta.is_admin === true) role = 'admin';
            else role = 'aerolinea';
        }
        return role;
    }

    /* ── estatus general derivado de las 2 aprobaciones ── */
    function deriveStatus(aifa, afac) {
        const a = aifa || 'pendiente', b = afac || 'pendiente';
        if (a === 'rechazado' || b === 'rechazado') return 'rechazado';
        if (a === 'aprobado' && b === 'aprobado')   return 'aprobado';
        if (a === 'aprobado' || b === 'aprobado')   return 'en_revision';
        return 'pendiente';
    }

    /* ──────────────────────────────────────────
       BOOTSTRAP
    ────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }

    try {
        sb = await window.ensureSupabaseClient();
    } catch (e) {
        document.body.innerHTML = '<div style="text-align:center;padding:3rem;font-family:sans-serif"><p style="color:#c62828">No se pudo conectar con el servidor.<br>Verifica tu conexión e intenta de nuevo.</p><button onclick="location.reload()" style="padding:.5rem 1.5rem;cursor:pointer">Reintentar</button></div>';
        return;
    }

    const { data: { session } } = await sb.auth.getSession();
    hideLoading();
    if (session?.user) { user = session.user; await bootApp(); }
    else               { bootLogin(); }

    sb.auth.onAuthStateChange((ev) => {
        if (ev === 'SIGNED_OUT') location.reload();
    });

    /* ──────────────────────────────────────────
       LOADING
    ────────────────────────────────────────── */
    function hideLoading() {
        const el = $('app-loading');
        if (!el) return;
        el.classList.add('out');
        setTimeout(() => el.remove(), 520);
    }

    /* ──────────────────────────────────────────
       LOGIN
    ────────────────────────────────────────── */
    function bootLogin() {
        show('screen-login');
        const btn = $('btn-do-login');
        if (btn && !btn._w) {
            btn._w = true;
            btn.addEventListener('click', doLogin);
            $('inp-pass')?.addEventListener('keydown', e => e.key === 'Enter' && doLogin());
        }
        // Toggle registro / login
        const toSignup = $('lnk-show-signup'), toLogin = $('lnk-show-login');
        if (toSignup && !toSignup._w) {
            toSignup._w = true;
            toSignup.addEventListener('click', e => { e.preventDefault(); hide('login-mode'); show('signup-mode'); clearLoginAlert(); });
        }
        if (toLogin && !toLogin._w) {
            toLogin._w = true;
            toLogin.addEventListener('click', e => { e.preventDefault(); hide('signup-mode'); show('login-mode'); clearLoginAlert(); });
        }
        const sBtn = $('btn-do-signup');
        if (sBtn && !sBtn._w) {
            sBtn._w = true;
            sBtn.addEventListener('click', doSignup);
            $('sg-pass2')?.addEventListener('keydown', e => e.key === 'Enter' && doSignup());
        }
    }

    function userToEmail(raw) {
        let email = String(raw || '').trim();
        if (!email.includes('@')) {
            const n = email.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'.');
            email = `${n}@aifa.operaciones`;
        }
        return email;
    }

    async function doSignup() {
        const company = val('sg-company').trim();
        const rawUser = val('sg-user').trim();
        const pwd     = val('sg-pass');
        const pwd2    = val('sg-pass2');

        if (!company)            { loginAlert('Escribe el nombre de la aerolínea.', 'warn'); return; }
        if (!rawUser)            { loginAlert('Escribe un usuario o correo.', 'warn'); return; }
        if (!pwd || pwd.length < 6) { loginAlert('La contraseña debe tener al menos 6 caracteres.', 'warn'); return; }
        if (pwd !== pwd2)        { loginAlert('Las contraseñas no coinciden.', 'warn'); return; }

        const email = userToEmail(rawUser);

        $('signup-txt')?.classList.add('d-none');
        $('signup-spin')?.classList.remove('d-none');
        const btn = $('btn-do-signup');
        if (btn) btn.disabled = true;

        try {
            const { data, error } = await sb.auth.signUp({
                email,
                password: pwd,
                options: { data: { company, full_name: company, role: 'aerolinea', app: 'portal' } }
            });
            if (error) throw error;

            // Si hay sesión inmediata (confirmación de correo desactivada), entrar directo.
            if (data.session?.user) {
                user = data.session.user;
                hide('screen-login');
                await bootApp();
                return;
            }
            // Intentar iniciar sesión (por si signUp no devolvió sesión pero sí creó al usuario)
            const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email, password: pwd });
            if (!siErr && si?.user) {
                user = si.user;
                hide('screen-login');
                await bootApp();
                return;
            }
            // Requiere confirmación por correo
            hide('signup-mode'); show('login-mode');
            loginAlert('Cuenta creada. Si tu correo requiere confirmación, revísalo; luego inicia sesión.', 'success');
        } catch (err) {
            const msg = /already registered|already exists/i.test(err.message || '')
                ? 'Ese usuario ya está registrado. Inicia sesión.'
                : (err.message || 'No se pudo crear la cuenta.');
            loginAlert(msg, 'danger');
        } finally {
            $('signup-txt')?.classList.remove('d-none');
            $('signup-spin')?.classList.add('d-none');
            if (btn) btn.disabled = false;
        }
    }

    async function doLogin() {
        let email = userToEmail(val('inp-user'));
        const pwd = val('inp-pass');
        if (!val('inp-user').trim() || !pwd) { loginAlert('Ingresa usuario y contraseña.', 'warn'); return; }

        $('login-txt')?.classList.add('d-none');
        $('login-spin')?.classList.remove('d-none');
        const btn = $('btn-do-login');
        if (btn) btn.disabled = true;

        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password: pwd });
            if (error) throw error;
            user = data.user;
            hide('screen-login');
            await bootApp();
        } catch (err) {
            loginAlert(
                err.message === 'Invalid login credentials'
                    ? 'Usuario o contraseña incorrectos.'
                    : err.message,
                'danger'
            );
        } finally {
            $('login-txt')?.classList.remove('d-none');
            $('login-spin')?.classList.add('d-none');
            if (btn) btn.disabled = false;
        }
    }

    function loginAlert(msg, type) {
        const el = $('login-alert');
        if (!el) return;
        el.className = type;
        el.textContent = msg;
        el.classList.add('show');
    }

    function clearLoginAlert() {
        const el = $('login-alert');
        if (!el) return;
        el.textContent = '';
        el.className = '';
        el.classList.remove('show');
    }

    /* ──────────────────────────────────────────
       APP BOOT
    ────────────────────────────────────────── */
    async function bootApp() {
        show('screen-app');

        // Detectar rol y permisos de aprobación
        const meta = user.user_metadata || {};

        // Intentar leer el rol/estado desde la tabla `perfiles` (fuente que
        // administra el panel de Usuarios). Si no existe la tabla, se usa el
        // rol derivado del user_metadata / correo como respaldo.
        let perfil = null;
        try {
            const { data } = await sb.from('perfiles')
                .select('role,activo').eq('id', user.id).maybeSingle();
            perfil = data || null;
        } catch (_e) { perfil = null; }

        // Cuenta desactivada por un administrador → cerrar sesión
        if (perfil && perfil.activo === false) {
            hide('screen-app');
            show('screen-login');
            loginAlert('Tu cuenta ha sido desactivada. Contacta a AIFA — Operaciones.', 'danger');
            await sb.auth.signOut();
            return;
        }

        userRole   = (perfil && perfil.role) ? String(perfil.role).toLowerCase() : resolveRole(user);
        isAdmin    = userRole === 'admin';
        canAifa    = userRole === 'admin' || userRole === 'aifa';
        canAfac    = userRole === 'admin' || userRole === 'afac';
        isReviewer = canAifa || canAfac;

        // Navbar
        const name = meta.full_name || meta.company || user.email?.split('@')[0] || 'Usuario';
        setT('nav-user', name);
        setT('prov-name', name.split(' ')[0]);

        const roleLabel = { admin:'Admin AIFA', aifa:'AIFA · Aeropuerto', afac:'AFAC · Autoridad', aerolinea:'Prestador' }[userRole] || 'Prestador';
        const badge = $('nav-badge');
        if (badge) {
            badge.textContent = roleLabel;
            badge.className   = `nav-badge ${isReviewer ? 'nb-admin' : 'nb-prov'}`;
            badge.classList.remove('d-none');
        }

        if (isReviewer) {
            const sw = $('btn-switch-view');
            if (sw) sw.classList.remove('d-none');
        }
        // Solo los administradores ven el panel de gestión de usuarios
        if (isAdmin) {
            const bu = $('btn-users-view');
            if (bu) bu.classList.remove('d-none');
        }

        wireGlobal();
        // Los revisores (AIFA/AFAC) entran directo al panel de revisión
        if (isReviewer) showAdminView();
        else            showProviderView();
    }

    /* ──────────────────────────────────────────
       GLOBAL WIRING
    ────────────────────────────────────────── */
    function wireGlobal() {
        $('btn-logout')?.addEventListener('click', () => sb.auth.signOut());

        // Type selector panel open
        $('btn-open-wizard')?.addEventListener('click', openWizard);

        // Close wiz-panel — X button and backdrop
        $('btn-wiz-x')?.addEventListener('click', closeWizard);
        $('wiz-bg')?.addEventListener('click', e => { if (e.target === $('wiz-bg')) closeWizard(); });

        // Provider refresh & filter
        $('btn-prov-ref')?.addEventListener('click', loadProviderManifests);
        $('prov-flt-st')?.addEventListener('change', renderProviderTable);

        // Admin switch & actions
        $('btn-switch-view')?.addEventListener('click', toggleAdminView);
        $('btn-admin-ref')?.addEventListener('click', loadAdminManifests);
        $('btn-admin-exp')?.addEventListener('click', exportAdminCSV);

        // Users panel (solo admin)
        $('btn-users-view')?.addEventListener('click', showUsersView);
        $('btn-users-ref')?.addEventListener('click', loadUsers);
        ['uf-search','uf-role','uf-status'].forEach(id => {
            $( id )?.addEventListener('input',  renderUsersTable);
            $( id )?.addEventListener('change', renderUsersTable);
        });

        // Admin filters
        ['af-from','af-to','af-airline','af-company','af-tipo','af-status'].forEach(id => {
            $( id )?.addEventListener('input',  applyAdminFilters);
            $( id )?.addEventListener('change', applyAdminFilters);
        });

        // Success buttons
        $('btn-another')?.addEventListener('click', () => { $('success-ov')?.classList.remove('show'); openWizard(); });
        $('btn-go-dash') ?.addEventListener('click', () => { $('success-ov')?.classList.remove('show'); });

        // Detail modal close
        $('btn-dmo-x')?.addEventListener('click', closeDetailModal);
        $('detail-mo-ov')?.addEventListener('click', e => { if (e.target === $('detail-mo-ov')) closeDetailModal(); });

        // Manifest form modals — pre-populate on open, wire save buttons
        initManifestModal('modalPortalLlegada',     'ml');
        initManifestModal('modalPortalSalida',      'ms');
        initManifestModal('modalPortalLlegadaCarga','mlc');
        initManifestModal('modalPortalSalidaCarga', 'msc');

        $('btn-save-portal-llegada')       ?.addEventListener('click', () => savePortalManifest('ml',  'llegada'));
        $('btn-save-portal-salida')        ?.addEventListener('click', () => savePortalManifest('ms',  'salida'));
        $('btn-save-portal-llegada-carga') ?.addEventListener('click', () => savePortalManifest('mlc', 'llegada_carga'));
        $('btn-save-portal-salida-carga')  ?.addEventListener('click', () => savePortalManifest('msc', 'salida_carga'));
    }

    /* ──────────────────────────────────────────
       VIEW SWITCHING
    ────────────────────────────────────────── */
    function showProviderView() {
        viewMode = 'provider';
        show('view-provider'); hide('view-admin'); hide('view-users');
        const sw = $('btn-switch-view');
        if (sw) { $('switch-lbl').textContent = 'Vista Admin'; }
        loadProviderManifests();
    }

    function showAdminView() {
        viewMode = 'admin';
        hide('view-provider'); show('view-admin'); hide('view-users');
        if ($('switch-lbl')) $('switch-lbl').textContent = 'Mis manifiestos';
        loadAdminManifests();
    }

    function toggleAdminView() {
        if (viewMode === 'provider') showAdminView();
        else showProviderView();
    }

    /* ──────────────────────────────────────────
       USUARIOS (administración) — solo admin
    ────────────────────────────────────────── */
    let usersRows = [];
    const ROLE_LABELS = { admin:'Admin AIFA', aifa:'AIFA · Aeropuerto', afac:'AFAC · Autoridad', aerolinea:'Prestador' };

    function showUsersView() {
        if (!isAdmin) return;
        viewMode = 'users';
        hide('view-provider'); hide('view-admin'); show('view-users');
        if ($('switch-lbl')) $('switch-lbl').textContent = 'Vista Admin';
        loadUsers();
    }

    async function loadUsers() {
        show('users-loading');
        hide('users-empty'); hide('users-setup');
        const tb = $('users-tbody'); if (tb) tb.innerHTML = '';
        try {
            const { data, error } = await sb.from('perfiles')
                .select('id,email,company,full_name,role,activo,created_at')
                .order('created_at', { ascending: true });
            if (error) throw error;
            usersRows = data || [];
            hide('users-loading');
            renderUsersKpis();
            renderUsersTable();
        } catch (err) {
            hide('users-loading');
            usersRows = [];
            renderUsersKpis();
            // Tabla no existe todavía → mostrar instrucciones de configuración
            const code = err && (err.code || '');
            const msg  = String(err && err.message || '').toLowerCase();
            if (code === '42P01' || msg.includes('does not exist') || msg.includes('perfiles')) {
                $('users-tbl-wrap')?.classList.add('d-none');
                show('users-setup');
            } else {
                $('users-tbl-wrap')?.classList.remove('d-none');
                show('users-empty');
                console.error('Error cargando usuarios:', err);
            }
        }
    }

    function renderUsersKpis() {
        const total = usersRows.length;
        const by = r => usersRows.filter(u => String(u.role||'').toLowerCase() === r).length;
        setT('us-total', total);
        setT('us-admin', by('admin'));
        setT('us-aifa',  by('aifa'));
        setT('us-afac',  by('afac'));
        setT('us-prov',  by('aerolinea'));
        setT('us-inact', usersRows.filter(u => u.activo === false).length);
    }

    function renderUsersTable() {
        const tb = $('users-tbody'); if (!tb) return;
        $('users-tbl-wrap')?.classList.remove('d-none');
        const q      = val('uf-search').trim().toLowerCase();
        const fRole  = val('uf-role');
        const fState = val('uf-status');

        const rows = usersRows.filter(u => {
            const role = String(u.role||'').toLowerCase();
            if (fRole && role !== fRole) return false;
            if (fState === 'activo'   && u.activo === false) return false;
            if (fState === 'inactivo' && u.activo !== false) return false;
            if (q) {
                const hay = `${u.email||''} ${u.company||''} ${u.full_name||''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        setT('users-cnt', rows.length);
        if (!rows.length) { tb.innerHTML = ''; show('users-empty'); return; }
        hide('users-empty');

        tb.innerHTML = rows.map(u => {
            const role   = String(u.role||'aerolinea').toLowerCase();
            const active = u.activo !== false;
            const name   = u.full_name || u.company || (u.email||'').split('@')[0] || '—';
            const isSelf = u.id === user.id;
            const opts   = ['aerolinea','aifa','afac','admin'].map(r =>
                `<option value="${r}" ${r===role?'selected':''}>${esc(ROLE_LABELS[r])}</option>`).join('');
            const badge  = active
                ? '<span class="nav-badge nb-prov" style="font-size:.68rem">Activo</span>'
                : '<span class="nav-badge" style="font-size:.68rem;background:rgba(198,40,40,.18);color:#c62828;border:1px solid rgba(198,40,40,.3)">Inactivo</span>';
            const toggleBtn = isSelf ? '' :
                (active
                    ? `<button class="btn-sm" data-uact="off" data-uid="${esc(u.id)}" title="Desactivar" style="color:#c62828"><i class="fas fa-user-slash"></i></button>`
                    : `<button class="btn-sm" data-uact="on" data-uid="${esc(u.id)}" title="Activar" style="color:#2e7d32"><i class="fas fa-user-check"></i></button>`);
            return `<tr>
                <td><div style="font-weight:600">${esc(name)}</div><div class="small text-muted">${esc(u.email||'—')}</div></td>
                <td>${esc(u.company||'—')}</td>
                <td><select class="fl-sel" data-urole data-uid="${esc(u.id)}" style="padding:.3rem .5rem;min-width:150px" ${isSelf?'disabled title="No puedes cambiar tu propio rol"':''}>${opts}</select></td>
                <td>${badge}</td>
                <td class="small">${u.created_at ? fmtTS(u.created_at) : '—'}</td>
                <td>${toggleBtn || '<span class="small text-muted">—</span>'}</td>
            </tr>`;
        }).join('');

        tb.querySelectorAll('select[data-urole]').forEach(sel => {
            sel.addEventListener('change', () => changeUserRole(sel.getAttribute('data-uid'), sel.value));
        });
        tb.querySelectorAll('button[data-uact]').forEach(btn => {
            btn.addEventListener('click', () => setUserActive(btn.getAttribute('data-uid'), btn.getAttribute('data-uact') === 'on'));
        });
    }

    async function changeUserRole(id, role) {
        if (!id || !role) return;
        try {
            const { error } = await sb.from('perfiles')
                .update({ role, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            const row = usersRows.find(u => u.id === id);
            if (row) row.role = role;
            renderUsersKpis();
        } catch (err) {
            console.error('Error al cambiar rol:', err);
            alert('No se pudo actualizar el rol. Verifica que tengas permisos de administrador.');
            loadUsers();
        }
    }

    async function setUserActive(id, activo) {
        if (!id) return;
        if (!activo && !confirm('¿Desactivar esta cuenta? El usuario no podrá iniciar sesión hasta reactivarla.')) return;
        try {
            const { error } = await sb.from('perfiles')
                .update({ activo, updated_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            const row = usersRows.find(u => u.id === id);
            if (row) row.activo = activo;
            renderUsersKpis();
            renderUsersTable();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            alert('No se pudo actualizar el estado. Verifica que tengas permisos de administrador.');
            loadUsers();
        }
    }

    /* ──────────────────────────────────────────
       PROVIDER — cargar data
    ────────────────────────────────────────── */
    async function loadProviderManifests() {
        show('prov-loading'); hide('prov-empty');
        const tbody = $('prov-tbody');
        if (tbody) tbody.innerHTML = '';
        $('prov-tbl-wrap')?.classList.add('invisible');

        try {
            const { data, error } = await sb.from(TABLE)
                .select('*')
                .eq('_portal_user_id', user.id)
                .order('_portal_created_at', { ascending: false });
            if (error) throw error;
            provRows = data || [];
            renderProviderStats();
            renderProviderTable();
        } catch(err) {
            console.error('loadProviderManifests', err);
        } finally {
            hide('prov-loading');
            $('prov-tbl-wrap')?.classList.remove('invisible');
        }
    }

    function renderProviderStats() {
        setT('ps-total', provRows.length);
        setT('ps-pend',  provRows.filter(r => r['_portal_status'] === 'pendiente').length);
        setT('ps-apro',  provRows.filter(r => r['_portal_status'] === 'aprobado').length);
        setT('ps-rech',  provRows.filter(r => r['_portal_status'] === 'rechazado').length);
    }

    function renderProviderTable() {
        const flt = val('prov-flt-st');
        const src = flt ? provRows.filter(r => r['_portal_status'] === flt) : provRows;
        setT('prov-cnt', src.length);

        const tbody = $('prov-tbody');
        if (!tbody) return;

        if (!src.length) { show('prov-empty'); tbody.innerHTML = ''; return; }
        hide('prov-empty');

        tbody.innerHTML = src.map(r => {
            const tipo  = String(r['TIPO DE MANIFIESTO'] || '').toLowerCase();
            const ico   = tipo.includes('llegada') ? '🛬' : '🛫';
            const st    = r['_portal_status'] || 'pendiente';
            const note  = r['_portal_review_notes']
                ? `<span title="${esc(r['_portal_review_notes'])}" style="cursor:help;margin-left:.25rem;color:var(--indigo)"><i class="fas fa-comment-dots" style="font-size:.7rem"></i></span>`
                : '';
            const pdf   = r['EVIDENCIA']
                ? `<a href="${esc(r['EVIDENCIA'])}" target="_blank" rel="noopener" class="btn-sm" onclick="event.stopPropagation()" title="Ver PDF"><i class="fas fa-file-pdf" style="color:var(--red)"></i></a>`
                : '';
            return `<tr onclick="window._showDetail(${r.id})">
              <td><span class="fl-num">${esc(r['# DE VUELO']||'—')}</span></td>
              <td style="font-size:1.1rem">${ico}</td>
              <td>${esc(r['AEROLINEA']||'—')}</td>
              <td style="color:var(--muted);font-size:.8rem">${fmtD(r['_portal_flight_date'])}</td>
              <td class="fl-rt">${esc(r['DESTINO / ORIGEN']||'—')}</td>
              <td style="text-align:center;font-weight:600">${r['TOTAL PAX']??'—'}</td>
              <td><span class="sbadge sb-${st}">${statusLabel(st)}</span>${note}</td>
              <td style="color:var(--muted);font-size:.79rem;white-space:nowrap">${fmtTS(r['_portal_created_at'])}</td>
              <td>${pdf}</td>
            </tr>`;
        }).join('');
    }

    /* ──────────────────────────────────────────
       ADMIN — cargar data
    ────────────────────────────────────────── */
    async function loadAdminManifests() {
        show('admin-loading'); hide('admin-empty');
        const tbody = $('admin-tbody');
        if (tbody) tbody.innerHTML = '';
        $('admin-tbl-wrap')?.classList.add('invisible');

        try {
            const { data, error } = await sb.from(TABLE)
                .select('*')
                .not('_portal_user_id', 'is', null)
                .order('_portal_created_at', { ascending: false });
            if (error) throw error;
            adminRows = data || [];
            renderAdminStats();
            applyAdminFilters();
        } catch(err) {
            console.error('loadAdminManifests', err);
            alert('Error al cargar: ' + err.message);
        } finally {
            hide('admin-loading');
            $('admin-tbl-wrap')?.classList.remove('invisible');
        }
    }

    function renderAdminStats() {
        const today = new Date().toISOString().slice(0,10);
        setT('as-total', adminRows.length);
        setT('as-pend',  adminRows.filter(r => r['_portal_status'] === 'pendiente').length);
        setT('as-rev',   adminRows.filter(r => r['_portal_status'] === 'en_revision').length);
        setT('as-apro',  adminRows.filter(r => r['_portal_status'] === 'aprobado').length);
        setT('as-rech',  adminRows.filter(r => r['_portal_status'] === 'rechazado').length);
        setT('as-hoy',   adminRows.filter(r => (r['_portal_created_at']||'').startsWith(today)).length);
    }

    function applyAdminFilters() {
        const from    = val('af-from');
        const to      = val('af-to');
        const airline = val('af-airline').trim().toLowerCase();
        const company = val('af-company').trim().toLowerCase();
        const tipo    = val('af-tipo');
        const status  = val('af-status');

        adminFiltered = adminRows.filter(r => {
            const fd = r['_portal_flight_date'] || '';
            if (from   && fd < from)  return false;
            if (to     && fd > to)    return false;
            const tipoRow = String(r['TIPO DE MANIFIESTO'] || '').toLowerCase();
            if (tipo   && !tipoRow.includes(tipo)) return false;
            if (status && r['_portal_status'] !== status) return false;
            if (airline && !(r['AEROLINEA']||'').toLowerCase().includes(airline) && !(r['# DE VUELO']||'').toLowerCase().includes(airline)) return false;
            if (company && !(r['_portal_company']||'').toLowerCase().includes(company)) return false;
            return true;
        });

        renderAdminTable();
    }

    function renderAdminTable() {
        setT('admin-cnt', adminFiltered.length);
        const tbody = $('admin-tbody');
        if (!tbody) return;

        if (!adminFiltered.length) {
            show('admin-empty');
            tbody.innerHTML = '';
            return;
        }
        hide('admin-empty');

        tbody.innerHTML = adminFiltered.map(r => {
            const tipo = String(r['TIPO DE MANIFIESTO'] || '').toLowerCase();
            const ico  = tipo.includes('llegada') ? '🛬' : '🛫';
            const st   = r['_portal_status'] || 'pendiente';
            return `<tr onclick="window._showDetail(${r.id})">
              <td><span class="fl-num">${esc(r['# DE VUELO']||'—')}</span></td>
              <td style="font-size:1.1rem">${ico}</td>
              <td>${esc(r['AEROLINEA']||'—')}</td>
              <td style="color:var(--muted);font-size:.8rem">${fmtD(r['_portal_flight_date'])}</td>
              <td class="fl-rt">${esc(r['DESTINO / ORIGEN']||'—')}</td>
              <td style="text-align:center;font-weight:600">${r['TOTAL PAX']??'—'}</td>
              <td style="color:var(--muted);font-size:.8rem">${esc(r['_portal_company']||'—')}</td>
              <td style="color:var(--muted);font-size:.8rem">${esc(r['CAPTURÓ']||'—')}</td>
              <td><span class="sbadge sb-${st}">${statusLabel(st)}</span>
                  <div style="margin-top:.25rem;display:flex;gap:.25rem;flex-wrap:wrap">
                    ${miniApBadge('AIFA', r['_portal_aprob_aifa'])}
                    ${miniApBadge('AFAC', r['_portal_aprob_afac'])}
                  </div>
              </td>
              <td style="color:var(--muted);font-size:.79rem;white-space:nowrap">${fmtTS(r['_portal_created_at'])}</td>
              <td onclick="event.stopPropagation()">
                <button class="btn-sm" onclick="window._showDetail(${r.id})" title="Ver detalle">
                  <i class="fas fa-eye"></i>
                </button>
                ${r['EVIDENCIA'] ? `<a href="${esc(r['EVIDENCIA'])}" target="_blank" rel="noopener" class="btn-sm" title="PDF" style="margin-left:.25rem"><i class="fas fa-file-pdf" style="color:var(--red)"></i></a>` : ''}
              </td>
            </tr>`;
        }).join('');
    }

    /* ──────────────────────────────────────────
       EXPORT CSV
    ────────────────────────────────────────── */
    function exportAdminCSV() {
        const src = adminFiltered.length ? adminFiltered : adminRows;
        if (!src.length) { alert('No hay datos para exportar.'); return; }

        const cols = ['id','_portal_company','# DE VUELO','TIPO DE MANIFIESTO','AEROLINEA',
                      '_portal_flight_date','SLOT ASIGNADO','HR. DE OPERACIÓN','DESTINO / ORIGEN',
                      'TOTAL PAX','TRANSITOS','CONEXIONES','KGS. DE EQUIPAJE','KGS. DE CARGA','CORREO',
                      'AERONAVE','MATRÍCULA','DEMORA +- 15 MIN.','CÓDIGO DEMORA',
                      'OBSERVACIONES','CAPTURÓ','_portal_status','_portal_review_notes','_portal_created_at'];
        const header = cols.join(',');
        const rows   = src.map(r => cols.map(c => {
            const v = r[c] ?? '';
            return /[,"\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : v;
        }).join(','));
        const csv  = [header, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `manifiestos_AIFA_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    /* ──────────────────────────────────────────
       DETAIL MODAL
    ────────────────────────────────────────── */
    window._showDetail = function(id) {
        const all = [...provRows, ...adminRows];
        const r = all.find(x => x.id === id);
        if (!r) return;
        openDetailModal(r);
    };

    function openDetailModal(r) {
        const ov = $('detail-mo-ov');
        const body = $('dmo-body');
        if (!ov || !body) return;

        const F = (lbl, v) => v ? `<div><div class="det-k">${lbl}</div><div class="det-v">${esc(String(v))}</div></div>` : '';

        const tipo      = String(r['TIPO DE MANIFIESTO'] || '');
        const isLlegada = tipo.toLowerCase().includes('llegada');
        const st        = r['_portal_status'] || 'pendiente';
        const admin     = isReviewer;
        body.innerHTML = `
        <div class="det-sec">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem">
                <div style="display:flex;align-items:center;gap:.75rem">
                    <span style="font-size:2rem">${isLlegada?'🛬':'🛫'}</span>
                    <div>
                        <div style="font-size:1.25rem;font-weight:900;color:var(--blue)">${esc(r['# DE VUELO']||'—')}</div>
                        <div style="font-size:.8rem;color:var(--muted)">${esc(r['AEROLINEA']||'—')} · ${fmtDL(r['_portal_flight_date'])}</div>
                    </div>
                </div>
                <span class="sbadge sb-${st}" style="font-size:.78rem">${statusLabel(st)}</span>
            </div>
        </div>
        <div class="det-sec">
            <h6>✈ Vuelo</h6>
            <div class="det-grid">
                ${F('Tipo de manifiesto', tipo)}
                ${F('Empresa / Prestador', r['_portal_company'])}
                ${F('Slot asignado', r['SLOT ASIGNADO'])}
                ${F('Slot coordinado', r['SLOT COORDINADO'])}
                ${F('HR. de operación', r['HR. DE OPERACIÓN'])}
                ${F('HR. Embarque/Desembarque', r['HR. DE EMBARQUE O DESEMBARQUE'])}
                ${F('HR. Pernocta', r['HR. DE INICIO O TERMINO DE PERNOCTA'])}
                ${F('HR. de recepción', r['HR. DE RECEPCIÓN'])}
                ${F(isLlegada?'Origen':'Destino', r['DESTINO / ORIGEN'])}
                ${F('Matrícula', r['MATRÍCULA'])}
                ${F('Tipo aeronave', r['AERONAVE'])}
                ${F('Tipo de operación', r['TIPO DE OPERACIÓN'])}
            </div>
        </div>
        <div class="det-sec">
            <h6>👥 Pasajeros y Carga</h6>
            <div class="det-grid">
                ${F('Total PAX', r['TOTAL PAX'])}
                ${F('PAX que pagan TUA', r['PAX QUE PAGAN TUA'])}
                ${F('Tránsitos', r['TRANSITOS'])}
                ${F('Conexiones', r['CONEXIONES'])}
                ${F('Total Exentos', r['TOTAL EXENTOS'])}
                ${F('Equipaje (kg)', r['KGS. DE EQUIPAJE'])}
                ${F('Carga (kg)', r['KGS. DE CARGA'])}
                ${F('Correo (kg)', r['CORREO'])}
            </div>
        </div>
        ${r['DEMORA +- 15 MIN.'] ? `<div class="det-sec"><h6>⏱ Demoras</h6><div class="det-grid">${F('Causa/Min.', r['DEMORA +- 15 MIN.'])}${F('Código', r['CÓDIGO DEMORA'])}</div></div>` : ''}
        ${r['OBSERVACIONES'] ? `<div class="det-sec"><h6>📝 Observaciones</h6><div style="font-size:.85rem;color:var(--text);line-height:1.6;background:#f8fafc;padding:.75rem 1rem;border-radius:10px;border:1px solid var(--border)">${esc(r['OBSERVACIONES'])}</div></div>` : ''}
        ${r['EVIDENCIA'] ? `<div class="det-sec"><h6>📎 Documento adjunto</h6><a href="${esc(r['EVIDENCIA'])}" target="_blank" rel="noopener" class="btn-aifa" style="display:inline-flex"><i class="fas fa-file-pdf"></i> Ver PDF adjunto</a></div>` : ''}
        ${buildApprovalSummary(r)}
        ${admin ? buildReviewSection(r) : ''}
        <div style="font-size:.72rem;color:var(--muted);margin-top:1rem;text-align:right">Folio #${String(r.id).padStart(6,'0')} · Capturó ${esc(r['CAPTURÓ']||'—')} · ${fmtTS(r['_portal_created_at'])}</div>`;

        setT('dmo-title', `Manifiesto — ${esc(r['# DE VUELO']||'')} · ${fmtD(r['_portal_flight_date'])}`);
        ov.classList.remove('hidden');
    }

    /* ── Resumen de las 2 aprobaciones (visible para todos) ── */
    function apStatusChip(v) {
        const s = v || 'pendiente';
        const map = {
            pendiente:  ['#c2410c','#fff7ed','#fed7aa','Pendiente'],
            aprobado:   ['#166534','#f0fdf4','#bbf7d0','Aprobado'],
            rechazado:  ['#991b1b','#fef2f2','#fecaca','Rechazado'],
        };
        const [c,bg,bd,lbl] = map[s] || map.pendiente;
        return `<span style="font-size:.74rem;font-weight:800;color:${c};background:${bg};border:1px solid ${bd};padding:.15rem .55rem;border-radius:999px">${lbl}</span>`;
    }

    function apTrack(titulo, ico, estado, byName, at, notes) {
        return `
        <div style="flex:1;min-width:200px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:.8rem 1rem">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.4rem">
                <span style="font-weight:800;font-size:.82rem;color:var(--blue)">${ico} ${titulo}</span>
                ${apStatusChip(estado)}
            </div>
            <div style="font-size:.72rem;color:var(--muted);line-height:1.5">
                ${byName ? `Por: <strong>${esc(byName)}</strong><br>` : 'Sin revisar aún'}
                ${at ? fmtTS(at) : ''}
            </div>
            ${notes ? `<div style="margin-top:.4rem;font-size:.76rem;color:var(--text);background:#fff;border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem">${esc(notes)}</div>` : ''}
        </div>`;
    }

    function buildApprovalSummary(r) {
        const aifa = r['_portal_aprob_aifa'] || 'pendiente';
        const afac = r['_portal_aprob_afac'] || 'pendiente';
        return `
        <div class="det-sec">
            <h6>✅ Estado de aprobaciones</h6>
            <div style="display:flex;gap:.75rem;flex-wrap:wrap">
                ${apTrack('AIFA · Aeropuerto', '🏢', aifa, r['_portal_aifa_by_name'], r['_portal_aifa_at'], r['_portal_aifa_notes'])}
                ${apTrack('AFAC · Autoridad', '🛡️', afac, r['_portal_afac_by_name'], r['_portal_afac_at'], r['_portal_afac_notes'])}
            </div>
            <div style="margin-top:.6rem;font-size:.78rem;color:var(--muted)">
                El manifiesto queda <strong>APROBADO</strong> únicamente cuando <strong>AIFA</strong> y <strong>AFAC</strong> aprueban.
            </div>
        </div>`;
    }

    function buildReviewSection(r) {
        // Bloques según los permisos del revisor
        const blocks = [];
        if (canAifa) blocks.push(reviewBlock(r, 'aifa', '🏢 AIFA · Aeropuerto', r['_portal_aprob_aifa'], r['_portal_aifa_notes']));
        if (canAfac) blocks.push(reviewBlock(r, 'afac', '🛡️ AFAC · Autoridad', r['_portal_aprob_afac'], r['_portal_afac_notes']));
        if (!blocks.length) return '';
        return `
        <div class="det-sec">
            <h6>⚙️ Acción de revisión</h6>
            ${blocks.join('')}
            <div id="rev-alert" style="display:none;margin-top:.6rem;font-size:.82rem;padding:.55rem .9rem;border-radius:9px;border:1px solid var(--border)"></div>
        </div>`;
    }

    function reviewBlock(r, entidad, titulo, estado, notes) {
        return `
        <div style="border:1px solid var(--border);border-radius:12px;padding:.8rem 1rem;margin-bottom:.7rem">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.5rem">
                <span style="font-weight:800;font-size:.85rem;color:var(--blue)">${titulo}</span>
                ${apStatusChip(estado)}
            </div>
            <div class="mb-2">
                <label class="form-label" style="font-size:.78rem">Notas de revisión ${entidad.toUpperCase()}</label>
                <textarea id="rev-notes-${entidad}" class="form-control" rows="2" placeholder="Comentarios…" style="font-size:.84rem">${esc(notes||'')}</textarea>
            </div>
            <div class="rev-actions">
                <button class="btn-rev btn-rev-pend" onclick="window._setApproval(${r.id},'${entidad}','pendiente')"><i class="fas fa-hourglass-half"></i> Pendiente</button>
                <button class="btn-rev btn-rev-apro" onclick="window._setApproval(${r.id},'${entidad}','aprobado')"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn-rev btn-rev-rech" onclick="window._setApproval(${r.id},'${entidad}','rechazado')"><i class="fas fa-times"></i> Rechazar</button>
            </div>
        </div>`;
    }

    window._setApproval = async function(id, entidad, decision) {
        const al = $('rev-alert');
        if (al) { al.style.display = 'none'; }
        const notes = ($(`rev-notes-${entidad}`)?.value || '').trim();
        const revName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Revisor';

        // Construir update de la entidad + estatus general derivado
        const row = adminRows.find(r => r.id === id) || provRows.find(r => r.id === id) || {};
        const otherKey = entidad === 'aifa' ? '_portal_aprob_afac' : '_portal_aprob_aifa';
        const otherVal = row[otherKey] || 'pendiente';
        const newAifa = entidad === 'aifa' ? decision : (row['_portal_aprob_aifa'] || 'pendiente');
        const newAfac = entidad === 'afac' ? decision : (row['_portal_aprob_afac'] || 'pendiente');
        const general = deriveStatus(newAifa, newAfac);

        const upd = {
            [`_portal_aprob_${entidad}`]: decision,
            [`_portal_${entidad}_by`]:      user.id,
            [`_portal_${entidad}_by_name`]: revName,
            [`_portal_${entidad}_at`]:      new Date().toISOString(),
            [`_portal_${entidad}_notes`]:   notes || null,
            '_portal_status':               general,
            '_portal_reviewed_at':          new Date().toISOString(),
        };

        try {
            const { error } = await sb.from(TABLE).update(upd).eq('id', id);
            if (error) throw error;

            // Actualizar cachés locales
            [adminRows, provRows].forEach(arr => {
                const idx = arr.findIndex(r => r.id === id);
                if (idx >= 0) Object.assign(arr[idx], upd);
            });

            renderAdminStats();
            applyAdminFilters();
            renderProviderStats();
            renderProviderTable();
            // Re-render del detalle para reflejar el nuevo estado
            window._showDetail?.(id);

            if (al) {
                al.style.display = 'block';
                al.style.background = '#f0fdf4'; al.style.color = '#166534'; al.style.borderColor = '#bbf7d0';
                al.textContent = `✓ ${entidad.toUpperCase()}: ${statusLabel(decision)} · Estado general: ${statusLabel(general)}`;
            }
        } catch(err) {
            if (al) {
                al.style.display = 'block';
                al.style.background = '#fef2f2'; al.style.color = '#991b1b'; al.style.borderColor = '#fecaca';
                al.textContent = 'Error: ' + err.message;
            }
        }
    };

    function closeDetailModal() {
        $('detail-mo-ov')?.classList.add('hidden');
    }

    /* ──────────────────────────────────────────
       TYPE SELECTOR PANEL (replaces wizard)
    ────────────────────────────────────────── */
    function openWizard() {
        $('wiz-bg')?.classList.add('open');
        $('wiz-panel')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeWizard() {
        $('wiz-bg')?.classList.remove('open');
        $('wiz-panel')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ──────────────────────────────────────────
       MANIFEST FORM HELPERS
    ────────────────────────────────────────── */

    // Returns date parts for today as { dd, mm, aaaa }
    function todayParts() {
        const d = new Date();
        const dd   = String(d.getDate()).padStart(2,'0');
        const mm   = String(d.getMonth()+1).padStart(2,'0');
        const aaaa = String(d.getFullYear());
        return { dd, mm, aaaa };
    }

    // Build a YYYY-MM-DD string from three separate fields
    function buildISODate(dd, mm, aaaa) {
        if (!dd || !mm || !aaaa || aaaa.length !== 4) return null;
        try {
            const iso = `${aaaa}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
            if (isNaN(Date.parse(iso))) return null;
            return iso;
        } catch { return null; }
    }

    // Pre-populate a manifest form when its Bootstrap modal opens
    function initManifestModal(modalId, prefix) {
        const el = document.getElementById(modalId);
        if (!el || el._pmi) return;
        el._pmi = true;
        el.addEventListener('show.bs.modal', () => {
            closeWizard();
            // Pre-fill date with today if blank
            const { dd, mm, aaaa } = todayParts();
            const ddEl = $(`${prefix}-fecha-dd`);
            if (ddEl && !ddEl.value) ddEl.value = dd;
            const mmEl = $(`${prefix}-fecha-mm`);
            if (mmEl && !mmEl.value) mmEl.value = mm;
            const aaEl = $(`${prefix}-fecha-aaaa`);
            if (aaEl && !aaEl.value) aaEl.value = aaaa;
            // Pre-fill elaborado por with user name
            const elab = $(`${prefix}-elaborado`);
            if (elab && !elab.value) {
                elab.value = user?.user_metadata?.full_name || user?.email || '';
            }
            // Reset folio (assigned by admin)
            const folio = $(`${prefix}-folio`);
            if (folio) folio.value = '';
        });
    }

    /* print helper */
    window.printManifest = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        const body = modal.querySelector('.print-target');
        if (!body) { window.print(); return; }
        // Temporarily mark this as the only visible print area
        document.querySelectorAll('.print-target').forEach(el => el.classList.remove('active-print'));
        body.classList.add('active-print');
        window.print();
    };

    /* ──────────────────────────────────────────
       SAVE PORTAL MANIFEST
    ────────────────────────────────────────── */
    async function savePortalManifest(prefix, flightType) {
        const btnId = {
            ml:  'btn-save-portal-llegada',
            ms:  'btn-save-portal-salida',
            mlc: 'btn-save-portal-llegada-carga',
            msc: 'btn-save-portal-salida-carga',
        }[prefix];
        const modalId = {
            ml:  'modalPortalLlegada',
            ms:  'modalPortalSalida',
            mlc: 'modalPortalLlegadaCarga',
            msc: 'modalPortalSalidaCarga',
        }[prefix];
        const tipoLabel = {
            llegada:       'Llegada PAX',
            salida:        'Salida PAX',
            llegada_carga: 'Llegada Carga',
            salida_carga:  'Salida Carga',
        }[flightType] || flightType;

        const btn  = $(btnId);
        const orig = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="isp"></span> Guardando…'; }

        try {
            const g = id => (document.getElementById(`${prefix}-${id}`)?.value || '').trim();
            const n = id => parseFloat(document.getElementById(`${prefix}-${id}`)?.value) || 0;

            // Date fields
            const dd   = g('fecha-dd');
            const mm   = g('fecha-mm');
            const aaaa = g('fecha-aaaa');

            // Build ISO date (YYYY-MM-DD) for portal date filters
            const flightDate = buildISODate(dd, mm, aaaa);
            if (!flightDate) throw new Error('Fecha inválida. Verifica los campos DD / MM / AAAA.');

            const flightNum  = g('num-vuelo');
            if (!flightNum) throw new Error('Número de vuelo es obligatorio.');

            const transpNom = g('transp-nom');
            if (!transpNom) throw new Error('Nombre del transportista es obligatorio.');

            const isArrival = prefix === 'ml' || prefix === 'mlc';

            // Build origin/destination
            const originDest = isArrival
                ? (g('origen-cod') || g('origen-nom'))
                : (g('destino-cod') || g('destino-nom') || g('prox-escala-cod'));

            // Delays
            const dem1str = [g('dem1'), g('dem1-cod')].filter(Boolean).join(' ');
            const dem2str = [g('dem2'), g('dem2-cod')].filter(Boolean).join(' ');
            const dem3str = [g('dem3'), g('dem3-cod')].filter(Boolean).join(' ');
            const demorasStr    = [dem1str, dem2str, dem3str].filter(Boolean).join(' | ');
            const codigosDemora = [g('dem1-cod'), g('dem2-cod'), g('dem3-cod')].filter(Boolean).join(' | ');

            // Observations — pilot, license, escalas
            const extraLines = [
                g('piloto')    ? `Piloto: ${g('piloto')}` : '',
                g('licencia')  ? `Lic: ${g('licencia')}` : '',
                isArrival ? (g('escala-nom') ? `Escala ant: ${g('escala-nom')} (${g('escala-cod')})` : '') : (g('escala-nom') ? `Escala sig: ${g('escala-nom')} (${g('escala-cod')})` : ''),
                prefix === 'msc' ? (g('prox-escala-nom') ? `Prox escala: ${g('prox-escala-nom')} (${g('prox-escala-cod')})` : '') : '',
                g('obs'),
            ].filter(Boolean);

            const observations = extraLines.join('\n');

            const payload = {
                // ── Datos operacionales → columnas de "Conciliación Manifiestos"
                'MES':                                   parseInt(mm) || null,
                'FECHA':                                 `${dd}/${mm}/${aaaa}`,
                'TIPO DE MANIFIESTO':                    tipoLabel,
                'AEROLINEA':                             g('transp-cod') || null,
                'TIPO DE OPERACIÓN':                    g('tipo-vuelo') || null,
                'AERONAVE':                              g('equipo') || null,
                'MATRÍCULA':                             g('matricula').toUpperCase() || null,
                '# DE VUELO':                            flightNum.toUpperCase(),
                'DESTINO / ORIGEN':                      originDest || null,
                'SLOT ASIGNADO':                         g('slot-asig') || null,
                'SLOT COORDINADO':                       g('slot-coord') || null,
                'HR. DE INICIO O TERMINO DE PERNOCTA':   g('hr-pernocta') || null,
                'HR. DE EMBARQUE O DESEMBARQUE':         isArrival ? (g('hr-desembarque') || null) : (g('hr-embarque') || null),
                'HR. DE OPERACIÓN':                     isArrival ? (g('hr-posicion') || null) : (g('hr-despegue') || g('hr-salida-pos') || null),
                'HR. MÁXIMA DE ENTREGA':                 null,
                'HR. DE RECEPCIÓN':                     isArrival ? (g('hr-posicion') || null) : null,
                'HRS. CUMPLIDAS':                        null,
                'PUNTUALIDAD / CANCELACIÓN':             null,
                'TOTAL PAX':                             (n('pax-nac') + n('pax-int')) || null,
                'DIPLOMATICOS':                          null,
                'EN COMISION':                           null,
                'INFANTES':                              null,
                'TRANSITOS':                             n('pax-int') || null,
                'CONEXIONES':                            (n('conex-nac') + n('conex-int')) || null,
                'OTROS EXENTOS':                         null,
                'TOTAL EXENTOS':                         null,
                'PAX QUE PAGAN TUA':                     n('pax-nac') || null,
                'KGS. DE EQUIPAJE':                      n('equip-kg') || null,
                'KGS. DE CARGA':                         n('carga-kg') || null,
                'CORREO':                                n('correo-kg') || null,
                'DEMORA +- 15 MIN.':                     demorasStr || null,
                'CÓDIGO DEMORA':                        codigosDemora || null,
                'OBSERVACIONES':                         observations || null,
                'CAPTURÓ':                               g('elaborado') || (user?.email || ''),
                'EVIDENCIA':                             null,
                'Hora y Fecha Generación':               new Date().toISOString(),
                // ── Columnas de portal (workflow / seguimiento)
                '_portal_user_id':     user.id,
                '_portal_company':     transpNom,
                '_portal_flight_date': flightDate,
                '_portal_status':      'pendiente',
                '_portal_aprob_aifa':  'pendiente',
                '_portal_aprob_afac':  'pendiente',
                '_portal_created_at':  new Date().toISOString(),
            };

            const { data, error } = await sb.from(TABLE).insert(payload).select().single();
            if (error) throw error;

            // Escribir el folio asignado en el input del formulario antes de capturar
            const folioInput = document.getElementById(`${prefix}-folio`);
            if (folioInput) folioInput.value = String(data.id).padStart(6, '0');

            // Capturar el modal ANTES de cerrarlo.
            // Se usa onclone para: (1) liberar el overflow del modal-body y capturar
            // el formulario completo, (2) reemplazar inputs con spans estáticos que
            // muestran el valor, manteniendo las clases CSS originales (form-control,
            // section-box borders, fondo verde) tal como los ve el usuario.
            let pdfCanvas = null;
            if (window.html2canvas && window.jspdf?.jsPDF) {
                try {
                    const manifestEl = document.getElementById(modalId)?.querySelector('.manifest-container');
                    const modalBody  = document.getElementById(modalId)?.querySelector('.modal-body');
                    if (manifestEl) {
                        if (modalBody) modalBody.scrollTop = 0;
                        // Snapshot de valores ANTES del onclone
                        const inputMap = new Map();
                        manifestEl.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
                            inputMap.set(el.id,
                                el.tagName === 'SELECT'
                                    ? (el.options[el.selectedIndex]?.text || '')
                                    : el.value
                            );
                        });
                        await new Promise(r => setTimeout(r, 250));
                        pdfCanvas = await window.html2canvas(manifestEl, {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#e2fce6',
                            scrollX: 0,
                            scrollY: 0,
                            height: manifestEl.scrollHeight,
                            windowWidth: 1090,
                            onclone: (clonedDoc) => {
                                // Desbloquear overflow para capturar el formulario completo
                                clonedDoc.querySelectorAll('.modal-body').forEach(mb => {
                                    mb.style.overflow  = 'visible';
                                    mb.style.maxHeight = 'none';
                                    mb.style.height    = 'auto';
                                });
                                // Reemplazar inputs/selects con spans estáticos
                                clonedDoc.querySelectorAll('input, select, textarea').forEach(inp => {
                                    const val = inp.id && inputMap.has(inp.id)
                                        ? inputMap.get(inp.id)
                                        : (inp.tagName === 'SELECT'
                                            ? (inp.options[inp.selectedIndex]?.text || '')
                                            : inp.value);
                                    const span = document.createElement('span');
                                    span.className    = inp.className; // conserva form-control, etc.
                                    span.style.display    = 'inline-block';
                                    span.style.color      = '#1a202c';
                                    span.style.fontWeight = 'bold';
                                    span.textContent = val;
                                    inp.parentNode?.replaceChild(span, inp);
                                });
                            }
                        });
                    }
                } catch (capErr) {
                    console.warn('portal-manifiestos: error al capturar canvas:', capErr);
                }
            }

            // Close Bootstrap modal
            const bsModal = bootstrap?.Modal?.getInstance(document.getElementById(modalId));
            bsModal?.hide();

            // Subir PDF en segundo plano
            if (pdfCanvas) {
                _uploadCanvasToPdf(pdfCanvas, data.id, payload['# DE VUELO'], payload['TIPO DE MANIFIESTO']);
            }

            setT('succ-folio', `Folio #${String(data.id).padStart(6,'0')}`);
            const sov = $('success-ov');
            if (sov) { sov.classList.remove('d-none'); sov.classList.add('show'); }

            loadProviderManifests();
            if (viewMode === 'admin') loadAdminManifests();

        } catch(err) {
            alert('Error al guardar: ' + err.message);
            console.error('savePortalManifest', err);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = orig || '<i class="fas fa-save me-1"></i>Guardar y Enviar'; }
        }
    }

    /* ──────────────────────────────────────────
       HELPERS
    ────────────────────────────────────────── */
    function statusLabel(s) {
        return({ pendiente:'Pendiente', en_revision:'En revisión', aprobado:'Aprobado', rechazado:'Rechazado' })[s] || s;
    }

    function miniApBadge(lbl, v) {
        const s = v || 'pendiente';
        const map = {
            pendiente:  ['#c2410c','#fff7ed','#fed7aa','◷'],
            aprobado:   ['#166534','#f0fdf4','#bbf7d0','✓'],
            rechazado:  ['#991b1b','#fef2f2','#fecaca','✕'],
        };
        const [c,bg,bd,ic] = map[s] || map.pendiente;
        return `<span title="${lbl}: ${statusLabel(s)}" style="font-size:.62rem;font-weight:800;color:${c};background:${bg};border:1px solid ${bd};padding:.05rem .35rem;border-radius:999px;white-space:nowrap">${ic} ${lbl}</span>`;
    }

    /* ──────────────────────────────────────────
       PDF: convertir canvas capturado → blob → subir a Storage → actualizar EVIDENCIA
       Fire-and-forget para no bloquear al usuario tras cerrar el modal.
    ────────────────────────────────────────── */
    function _uploadCanvasToPdf(canvas, recordId, flightNum, tipo) {
        (async () => {
            try {
                const pdf  = new window.jspdf.jsPDF('p', 'mm', 'letter');
                const pdfW = pdf.internal.pageSize.getWidth();
                const pdfH = pdf.internal.pageSize.getHeight();
                // Mantener proporción real del formulario; si es más alto que una hoja
                // se escala para que quepa completo sin cortes.
                const ratio = canvas.height / canvas.width;
                const imgH  = pdfW * ratio;
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95),
                    'JPEG', 0, 0, pdfW, imgH <= pdfH ? imgH : pdfH
                );
                const pdfBlob = pdf.output('blob');

                const safeTipo  = String(tipo  || 'manifiesto').toLowerCase().replace(/[^a-z0-9]/g, '-');
                const safeVuelo = String(flightNum || 'NA').replace(/[^a-z0-9]/gi, '-');
                const fileName  = `portal_${safeTipo}_${safeVuelo}_${Date.now()}.pdf`;

                const { error: upErr } = await window.supabaseClient.storage
                    .from('manifiestos_pdfs')
                    .upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: false });

                if (upErr) { console.warn('portal-manifiestos upload error:', upErr.message); return; }

                const { data: pubData } = window.supabaseClient.storage
                    .from('manifiestos_pdfs').getPublicUrl(fileName);

                if (pubData?.publicUrl && recordId) {
                    await window.supabaseClient.from(TABLE)
                        .update({ 'EVIDENCIA': pubData.publicUrl })
                        .eq('id', recordId);
                    console.log('portal-manifiestos: EVIDENCIA actualizada:', pubData.publicUrl);
                }
            } catch (e) {
                console.error('portal-manifiestos _uploadCanvasToPdf:', e);
            }
        })();
    }

})();

