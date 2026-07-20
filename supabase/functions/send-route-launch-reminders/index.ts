import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'AIFA Operaciones <operaciones@aifanlu.com.mx>';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type RouteEvent = {
  id: string;
  route_name: string;
  route_code: string | null;
  airline: string;
  scope: string;
  launch_date: string;
  reminder_days: number[] | null;
  status: string;
  notes: string | null;
};

function mexicoIsoDate(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parseIsoDate(v: string): Date {
  return new Date(`${v}T00:00:00`);
}

function daysUntil(targetIso: string, todayIso: string): number {
  const a = parseIsoDate(targetIso).getTime();
  const b = parseIsoDate(todayIso).getTime();
  return Math.floor((a - b) / 86400000);
}

function buildMessage(ev: RouteEvent, dayDiff: number): string {
  const route = ev.route_name || ev.route_code || 'Ruta nueva';
  const date = parseIsoDate(ev.launch_date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayLabel = dayDiff === 0 ? 'hoy' : `en ${dayDiff} dia(s)`;
  const notes = ev.notes ? `\nNotas: ${ev.notes}` : '';

  return [
    'AIFA OPERACIONES - Recordatorio de inauguracion de ruta',
    `Ruta: ${route}`,
    `Aerolinea: ${ev.airline}`,
    `Tipo: ${ev.scope}`,
    `Fecha de inauguracion: ${date} (${dayLabel})`,
    `Estatus: ${ev.status}`,
    notes,
  ].filter(Boolean).join('\n');
}

async function sendWhatsApp(phone: string, apikey: string, message: string): Promise<boolean> {
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}&_t=${Date.now()}`;
  const res = await fetch(url);
  return res.ok;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text: body,
    }),
  });

  return res.ok;
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || '';
  const cronHeader = req.headers.get('x-cron-secret') || '';

  if (CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) return true;
  if (SUPABASE_SERVICE_KEY && authHeader === `Bearer ${SUPABASE_SERVICE_KEY}`) return true;

  if (!authHeader.startsWith('Bearer ') || !SUPABASE_ANON_KEY) return false;

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData.user) return false;

  const { data: roleRow } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const role = String(roleRow?.role || '').toLowerCase();
  return ['admin', 'superadmin', 'editor'].includes(role);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const todayIso = mexicoIsoDate();

    const { data: events, error: eventsErr } = await sb
      .from('route_launch_calendar')
      .select('id, route_name, route_code, airline, scope, launch_date, reminder_days, status, notes')
      .eq('is_active', true)
      .in('status', ['confirmada', 'programada']);
    if (eventsErr) throw eventsErr;

    const matched: Array<{ ev: RouteEvent; dayDiff: number }> = [];
    for (const raw of (events || []) as RouteEvent[]) {
      const diff = daysUntil(raw.launch_date, todayIso);
      const reminderDays = Array.isArray(raw.reminder_days) ? raw.reminder_days : [30, 14, 7, 3, 1, 0];
      if (diff < 0) continue;
      if (!reminderDays.includes(diff)) continue;
      matched.push({ ev: raw, dayDiff: diff });
    }

    if (!matched.length) {
      return new Response(JSON.stringify({ ok: true, events_matched: 0, sent_whatsapp: 0, sent_email: 0 }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const eventIds = matched.map((m) => m.ev.id);
    const { data: existingLogs } = await sb
      .from('route_launch_reminder_log')
      .select('event_id, channel, destination, reminder_day')
      .eq('sent_on', todayIso)
      .in('event_id', eventIds);

    const sentSet = new Set(
      (existingLogs || []).map((r: any) => `${r.event_id}|${r.channel}|${r.destination}|${r.reminder_day}`)
    );

    const { data: waRecipients, error: waErr } = await sb
      .from('whatsapp_alertas')
      .select('nombre, telefono, apikey')
      .eq('activo', true);
    if (waErr) throw waErr;

    const { data: emailUsers, error: emailErr } = await sb
      .from('v_usuarios_roles')
      .select('email, role')
      .in('role', ['admin', 'superadmin', 'editor']);
    if (emailErr) throw emailErr;

    const uniqueEmails = [...new Set((emailUsers || [])
      .map((u: any) => String(u.email || '').trim().toLowerCase())
      .filter((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)))];

    let sentWhatsApp = 0;
    let sentEmail = 0;

    for (const item of matched) {
      const text = buildMessage(item.ev, item.dayDiff);

      for (const wa of (waRecipients || []) as Array<{ nombre: string; telefono: string; apikey: string }>) {
        const destination = String(wa.telefono || '').trim();
        if (!destination || !wa.apikey) continue;
        const key = `${item.ev.id}|whatsapp|${destination}|${item.dayDiff}`;
        if (sentSet.has(key)) continue;

        const ok = await sendWhatsApp(destination, wa.apikey, text);
        if (ok) {
          sentWhatsApp++;
          sentSet.add(key);
          await sb.from('route_launch_reminder_log').insert({
            event_id: item.ev.id,
            channel: 'whatsapp',
            destination,
            reminder_day: item.dayDiff,
            sent_on: todayIso,
            payload_preview: text.slice(0, 500),
          });
        }
      }

      const subject = `AIFA - Recordatorio inauguracion ${item.ev.route_name || item.ev.airline}`;
      for (const email of uniqueEmails) {
        const key = `${item.ev.id}|email|${email}|${item.dayDiff}`;
        if (sentSet.has(key)) continue;

        const ok = await sendEmail(email, subject, text);
        if (ok) {
          sentEmail++;
          sentSet.add(key);
          await sb.from('route_launch_reminder_log').insert({
            event_id: item.ev.id,
            channel: 'email',
            destination: email,
            reminder_day: item.dayDiff,
            sent_on: todayIso,
            payload_preview: text.slice(0, 500),
          });
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      events_matched: matched.length,
      sent_whatsapp: sentWhatsApp,
      sent_email: sentEmail,
      date: todayIso,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
