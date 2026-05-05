/* ===================================================================
   AIFA OPERACIONES — Service Worker v1
   Maneja Push Notifications y cache básico
   =================================================================== */

const SW_VERSION = 'aifa-sw-v1';

/* ---------- Push Notification ---------- */
self.addEventListener('push', function (event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'AIFA Operaciones', body: event.data ? event.data.text() : '' };
    }

    const title   = data.title  || 'AIFA Operaciones';
    const options = buildNotificationOptions(data);

    event.waitUntil(self.registration.showNotification(title, options));
});

function buildNotificationOptions(data) {
    /* Elige el color de acento según el área */
    const AREA_COLORS = {
        DO:  '#059669', DA:  '#d97706', DPE: '#4f46e5',
        DCS: '#2563eb', GSO: '#7c3aed', UT:  '#0891b2',
        GC:  '#db2777', AFAC:'#475569',
    };
    const accent = AREA_COLORS[data.area] || '#0a1f44';

    return {
        body:            data.body    || '',
        icon:            '/images/icons/aifa-app-icon-192.png',
        badge:           '/images/icons/aifa-app-icon-192.png',
        image:           data.image   || undefined,
        tag:             data.tag     || ('aifa-notif-' + Date.now()),
        renotify:        false,
        requireInteraction: false,
        silent:          false,
        vibrate:         [200, 100, 200],
        timestamp:       data.timestamp || Date.now(),
        data: {
            url:  data.url  || '/',
            area: data.area || null,
        },
        actions: [
            {
                action: 'ver',
                title:  'Ver agenda',
                icon:   '/images/icons/aifa-app-icon-192.png',
            },
            {
                action: 'cerrar',
                title:  'Cerrar',
            },
        ],
    };
}

/* ---------- Notification Click ---------- */
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'cerrar') return;

    const targetUrl = (event.notification.data && event.notification.data.url)
        ? event.notification.data.url
        : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            /* Si ya hay una ventana abierta, enfócarla */
            for (const client of clientList) {
                const clientUrl = new URL(client.url);
                const targetPath = new URL(targetUrl, self.location.origin).pathname;
                if (clientUrl.pathname === targetPath && 'focus' in client) {
                    return client.focus();
                }
            }
            /* Si no hay ventana abierta, abrir una nueva */
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

/* ---------- Ciclo de vida ---------- */
self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});
