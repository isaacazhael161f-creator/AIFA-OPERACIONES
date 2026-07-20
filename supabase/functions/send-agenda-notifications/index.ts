// ================================================================
// AIFA OPERACIONES — Edge Function: send-agenda-notifications
// Deno (Supabase Edge Functions)
//
// Envía notificaciones push a usuarios según su área,
// recordándoles las sesiones programadas para hoy y mañana.
//
// Variables de entorno requeridas (Supabase Secrets):
//   SUPABASE_URL           — URL del proyecto Supabase
//   SUPABASE_SERVICE_KEY   — service_role key (no la anon)
//   VAPID_PUBLIC_KEY       — clave pública VAPID
//   VAPID_PRIVATE_KEY      — clave privada VAPID
//   VAPID_SUBJECT          — mailto: del administrador
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

/* ── Colores por área ──────────────────────────────────────────── */
const AREA_NAMES: Record<string, string> = {
    DO:   'Operación',
    DA:   'Administración',
    DPE:  'Planeación',
    DCS:  'Comercial',
    GSO:  'Seg. Operacional',
    UT:   'Transparencia',
    GC:   'Calidad',
    AFAC: 'AFAC',
};

/* ── Tipos ─────────────────────────────────────────────────────── */
interface PushSubscription {
    user_id:  string;
    area:     string;
    endpoint: string;
    p256dh:   string;
    auth_key: string;
}

interface Sesion {
    id:            string;
    comite_id:     string;
    area:          string;
    numero_sesion: number;
    fecha_sesion:  string;
    hora_inicio:   string;
    estatus:       string;
    comite_nombre: string;
    comite_acronimo: string;
}

/* ── Handler principal ─────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
    /* Autorización básica: solo POST con secret header o cron */
    const authHeader = req.headers.get('authorization') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY') || '';
    if (!authHeader.includes(serviceKey.slice(0, 20)) && req.method !== 'GET') {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const result = await sendNotifications();
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (err) {
        console.error('Error en send-agenda-notifications:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});

/* ── Lógica de envío ───────────────────────────────────────────── */
async function sendNotifications() {
    /* Configurar VAPID */
    webpush.setVapidDetails(
        Deno.env.get('VAPID_SUBJECT')    || 'mailto:operaciones@aifa.aeromexico.com',
        Deno.env.get('VAPID_PUBLIC_KEY') || '',
        Deno.env.get('VAPID_PRIVATE_KEY')|| '',
    );

    const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_KEY')!,
    );

    /* Calcular fechas: hoy y mañana (zona horaria CDMX UTC-6) */
    const now    = new Date();
    const cdmxOffset = -6 * 60; // minutos
    const cdmxNow = new Date(now.getTime() + (cdmxOffset - now.getTimezoneOffset()) * 60000);

    const today    = cdmxNow.toISOString().slice(0, 10);
    const tomorrow = new Date(cdmxNow.getTime() + 86400000).toISOString().slice(0, 10);

    /* Consultar sesiones para hoy y mañana */
    const { data: sesiones, error: sesError } = await sb
        .from('agenda_reuniones')
        .select(`
            id, comite_id, area, numero_sesion, fecha_sesion, hora_inicio, estatus,
            agenda_comites!inner(nombre, acronimo)
        `)
        .in('fecha_sesion', [today, tomorrow])
        .in('estatus', ['programada', 'confirmada', 'Programada', 'Confirmada'])
        .order('fecha_sesion')
        .order('hora_inicio');

    if (sesError) throw new Error('Error consultando sesiones: ' + sesError.message);
    if (!sesiones || sesiones.length === 0) {
        return { sent: 0, message: 'No hay sesiones programadas para hoy ni mañana' };
    }

    /* Obtener todas las suscripciones activas */
    const { data: subs, error: subError } = await sb
        .from('push_subscriptions')
        .select('user_id, area, endpoint, p256dh, auth_key');

    if (subError) throw new Error('Error consultando suscripciones: ' + subError.message);
    if (!subs || subs.length === 0) {
        return { sent: 0, message: 'No hay suscriptores registrados' };
    }

    let sent = 0;
    let failed = 0;

    /* Para cada sesión, encontrar suscriptores que corresponden al área */
    for (const sesRaw of sesiones) {
        const ses: Sesion = {
            id:              sesRaw.id,
            comite_id:       sesRaw.comite_id,
            area:            sesRaw.area,
            numero_sesion:   sesRaw.numero_sesion,
            fecha_sesion:    sesRaw.fecha_sesion,
            hora_inicio:     sesRaw.hora_inicio,
            estatus:         sesRaw.estatus,
            comite_nombre:   (sesRaw as any).agenda_comites?.nombre    || 'Comité',
            comite_acronimo: (sesRaw as any).agenda_comites?.acronimo  || '',
        };

        const isToday    = ses.fecha_sesion === today;
        const isTomorrow = ses.fecha_sesion === tomorrow;

        const payload = buildPayload(ses, isToday, isTomorrow, today);
        if (!payload) continue;

        /* Suscriptores relevantes: área coincidente o 'all' */
        const relevantSubs = (subs as PushSubscription[]).filter(s =>
            s.area === ses.area || s.area === 'all'
        );

        for (const sub of relevantSubs) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys:     { p256dh: sub.p256dh, auth: sub.auth_key },
                    },
                    JSON.stringify(payload),
                    { TTL: 3600 * 24 } // 24h TTL
                );
                sent++;
            } catch (err: any) {
                failed++;
                /* Si el endpoint es inválido (410 Gone), eliminar suscripción */
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await sb.from('push_subscriptions').delete().eq('user_id', sub.user_id);
                }
            }
        }
    }

    return { sent, failed, sesiones: sesiones.length };
}

/* ── Construir payload de la notificación ─────────────────────── */
function buildPayload(ses: Sesion, isToday: boolean, isTomorrow: boolean, today: string) {
    const areaName  = AREA_NAMES[ses.area] || ses.area;
    const horaStr   = ses.hora_inicio ? ses.hora_inicio.slice(0, 5) + ' hrs' : '';
    const acronimo  = ses.comite_acronimo ? ` (${ses.comite_acronimo})` : '';

    let title = '';
    let body  = '';
    let tag   = '';

    if (isToday) {
        title = `📅 Sesión hoy — ${ses.comite_nombre}${acronimo}`;
        body  = `Sesión No. ${ses.numero_sesion}${horaStr ? ' · ' + horaStr : ''} · ${areaName}`;
        tag   = `ses-today-${ses.id}`;
    } else if (isTomorrow) {
        title = `🔔 Recordatorio — ${ses.comite_nombre}${acronimo}`;
        body  = `Sesión No. ${ses.numero_sesion} mañana${horaStr ? ' a las ' + horaStr : ''} · ${areaName}`;
        tag   = `ses-tomorrow-${ses.id}`;
    } else {
        return null;
    }

    return {
        title,
        body,
        area:      ses.area,
        tag,
        timestamp: Date.now(),
        url:       '/?section=agenda',
    };
}
