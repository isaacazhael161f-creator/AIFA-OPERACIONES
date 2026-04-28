/* ===================================================================
   AIFA OPERACIONES — Push Notifications (cliente)
   js/notifications.js  ·  cargado en index.html
   =================================================================== */

(function () {
    'use strict';

    /* ── Clave pública VAPID ─────────────────────────────────────── */
    const VAPID_PUBLIC_KEY = 'BDsVrKqqW_C289jgxaut8vbosD8yCM1oRcJ-qjLvwOP0tS2jzgHoAbmeCJTNVW_ZCGC0eSyzgTcjUSyeYnwuO5c';

    /* ── Mapeo rol → área ────────────────────────────────────────── */
    const ROLE_AREA_MAP = {
        operacion:    'DO',
        administracion:'DA',
        planeacion:   'DPE',
        comercial:    'DCS',
        seguridad_op: 'GSO',
        transparencia:'UT',
        calidad:      'GC',
    };

    /* ── Helpers ─────────────────────────────────────────────────── */
    function getUserArea() {
        const role = sessionStorage.getItem('user_role') || 'viewer';
        if (['admin', 'editor', 'superadmin'].includes(role)) return 'all';
        return ROLE_AREA_MAP[role] || null;
    }

    function getUserId() {
        try {
            const u = JSON.parse(sessionStorage.getItem('user') || '{}');
            return u.id || null;
        } catch (_) { return null; }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
    }

    /* ── Registro del Service Worker ────────────────────────────── */
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return null;
        try {
            const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            return reg;
        } catch (err) {
            console.warn('[AIFA Notif] Error registrando SW:', err);
            return null;
        }
    }

    /* ── Suscribir al push ───────────────────────────────────────── */
    async function subscribePush(swReg) {
        try {
            const existing = await swReg.pushManager.getSubscription();
            if (existing) return existing;

            const subscription = await swReg.pushManager.subscribe({
                userVisibleOnly:      true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            return subscription;
        } catch (err) {
            console.warn('[AIFA Notif] Error al suscribir push:', err);
            return null;
        }
    }

    /* ── Guardar suscripción en Supabase ─────────────────────────── */
    async function saveSubscription(subscription) {
        const userId = getUserId();
        const area   = getUserArea();
        if (!userId || !area || !subscription) return false;

        const sb = window.supabaseClient || (window.ensureSupabaseClient && window.ensureSupabaseClient());
        if (!sb) return false;

        const role = sessionStorage.getItem('user_role') || 'viewer';
        const keys = subscription.toJSON().keys || {};

        const { error } = await sb.from('push_subscriptions').upsert({
            user_id:    userId,
            area,
            role,
            endpoint:   subscription.endpoint,
            p256dh:     keys.p256dh  || '',
            auth_key:   keys.auth    || '',
            user_agent: navigator.userAgent.slice(0, 200),
        }, { onConflict: 'user_id' });

        if (error) {
            console.warn('[AIFA Notif] Error guardando suscripción:', error.message);
            return false;
        }
        return true;
    }

    /* ── Eliminar suscripción ────────────────────────────────────── */
    async function unsubscribe() {
        const userId = getUserId();
        if (!userId) return;

        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready.catch(() => null);
            if (reg) {
                const sub = await reg.pushManager.getSubscription().catch(() => null);
                if (sub) await sub.unsubscribe().catch(() => {});
            }
        }

        const sb = window.supabaseClient || (window.ensureSupabaseClient && window.ensureSupabaseClient());
        if (sb) {
            await sb.from('push_subscriptions').delete().eq('user_id', userId);
        }
    }

    /* ── Actualiza el botón de la UI ─────────────────────────────── */
    function refreshBellUI(granted) {
        const btn  = document.getElementById('ag-notif-btn');
        const icon = document.getElementById('ag-notif-icon');
        const lbl  = document.getElementById('ag-notif-label');
        if (!btn) return;
        if (granted) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-success');
            if (icon) { icon.className = 'fas fa-bell'; }
            if (lbl)  lbl.textContent = 'Notificaciones activas';
            btn.title = 'Desactivar notificaciones';
            btn.dataset.active = '1';
        } else {
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
            if (icon) { icon.className = 'fas fa-bell-slash'; }
            if (lbl)  lbl.textContent = 'Activar notificaciones';
            btn.title = 'Recibir recordatorios de sesiones';
            btn.dataset.active = '0';
        }
    }

    /* ── Flujo principal: activar/desactivar ─────────────────────── */
    async function toggleNotifications() {
        const btn = document.getElementById('ag-notif-btn');
        if (btn) btn.disabled = true;

        try {
            /* Si ya está activo → desactivar */
            if (btn && btn.dataset.active === '1') {
                await unsubscribe();
                refreshBellUI(false);
                _agToastNotif('Notificaciones desactivadas', '#6b7280');
                return;
            }

            /* Verificar soporte */
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                _agToastNotif('Tu navegador no soporta notificaciones push', '#ef4444');
                return;
            }

            /* Pedir permiso */
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                _agToastNotif('Permiso denegado. Actívalo en la configuración del navegador.', '#ef4444');
                refreshBellUI(false);
                return;
            }

            /* Registrar SW y suscribir */
            const swReg = await registerServiceWorker();
            if (!swReg) {
                _agToastNotif('No se pudo registrar el servicio', '#ef4444');
                return;
            }

            const sub = await subscribePush(swReg);
            if (!sub) {
                _agToastNotif('No se pudo crear la suscripción', '#ef4444');
                return;
            }

            const saved = await saveSubscription(sub);
            if (saved) {
                refreshBellUI(true);
                _agToastNotif('¡Notificaciones activadas! Recibirás recordatorios de tus sesiones.', '#059669');
                /* Notificación de bienvenida */
                showWelcomeNotification();
            } else {
                _agToastNotif('Error al guardar la suscripción. Intenta de nuevo.', '#ef4444');
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /* ── Notificación de bienvenida (local, no push) ─────────────── */
    function showWelcomeNotification() {
        if (Notification.permission !== 'granted') return;
        const area = getUserArea();
        const areaLabel = {
            DO:'Operación', DA:'Administración', DPE:'Planeación',
            DCS:'Comercial', GSO:'Seg. Operacional', UT:'Transparencia',
            GC:'Calidad', AFAC:'AFAC', all:'Todas las áreas',
        }[area] || area;

        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('AIFA Operaciones — Notificaciones activas', {
                body:    `Recibirás recordatorios de los comités y sesiones de: ${areaLabel}`,
                icon:    '/images/icons/aifa-app-icon-192.png',
                badge:   '/images/icons/aifa-app-icon-192.png',
                tag:     'aifa-welcome',
                vibrate: [100, 50, 100],
            });
        }).catch(() => {});
    }

    /* ── Toast (reutiliza _agToast si existe, o crea uno) ────────── */
    function _agToastNotif(msg, color) {
        if (typeof window._agToast === 'function') {
            window._agToast(msg, color);
            return;
        }
        /* Fallback simple */
        const t = document.createElement('div');
        t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
            background:${color};color:#fff;padding:10px 22px;border-radius:10px;
            font-size:.9rem;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.25);
            font-family:sans-serif;max-width:90vw;text-align:center`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4500);
    }

    /* ── Inicializar: verificar estado actual ───────────────────────
       Llamado desde agenda.js o directamente cuando el usuario ya
       está autenticado y la sección Agenda está activa.
    ─────────────────────────────────────────────────────────────── */
    async function agNotificationsInit() {
        /* Solo si el usuario está autenticado y tiene área asignada */
        if (!getUserId() || !getUserArea()) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        /* Verificar si ya tiene suscripción activa */
        const alreadyGranted = Notification.permission === 'granted';
        if (alreadyGranted) {
            /* Verificar que hay suscripción en la BD */
            const sb = window.supabaseClient || (window.ensureSupabaseClient && window.ensureSupabaseClient());
            if (sb) {
                const userId = getUserId();
                const { data } = await sb.from('push_subscriptions')
                    .select('id').eq('user_id', userId).maybeSingle();
                refreshBellUI(!!data);
                return;
            }
        }
        refreshBellUI(false);
    }

    /* ── Exponer al global ───────────────────────────────────────── */
    window.agToggleNotifications  = toggleNotifications;
    window.agNotificationsInit    = agNotificationsInit;

    /* ── Re-inicializar tras login ───────────────────────────────── */
    window.addEventListener('aifa:login', function () {
        setTimeout(agNotificationsInit, 500); // pequeño delay para que Supabase client esté listo
    });

})();
