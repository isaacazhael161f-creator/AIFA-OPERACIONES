// ================================================================
// AIFA OPERACIONES — Edge Function: alertar-cursos
// Invocada diariamente por pg_cron a las 08:00 CST (14:00 UTC)
// Envía un correo vía Resend a todos los colab_editors + admins
// cuando hay cursos recurrentes que vencen en los próximos 30 días.
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Variables de entorno ─────────────────────────────────────────
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')            ?? '';
const CRON_SECRET      = Deno.env.get('CRON_SECRET')               ?? '';
const EMAIL_FROM_RAW   = Deno.env.get('EMAIL_FROM')                ?? 'operaciones@aifanlu.com.mx';
const EMAIL_FROM_NAME  = Deno.env.get('EMAIL_FROM_NAME')           ?? 'AIFA Operaciones';
const TEST_EMAIL       = Deno.env.get('TEST_EMAIL')                ?? '';
const WARN_DAYS        = 30;

const STORAGE  = 'https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/email-assets';
const IMG_LOGO = STORAGE + '/aifa-logo.png';

// ── Tipos ────────────────────────────────────────────────────────
interface Curso {
  id: string;
  num_empleado: string;
  nombre: string;
  fecha_realizacion: string;
  es_recurrente: boolean;
  frecuencia_dias?: number;
}

interface AlertRow {
  nombre:   string;
  curso:    string;
  nextDue:  Date;
  diff:     number;
  freq:     string;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Calcula la próxima fecha de vencimiento de un curso recurrente */
function ccNextDue(c: Curso): Date | null {
  if (!c.es_recurrente || !c.frecuencia_dias || !c.fecha_realizacion) return null;
  const base = new Date(c.fecha_realizacion);
  if (isNaN(base.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const freq  = c.frecuencia_dias * 86400000;
  let next = new Date(base.getTime() + freq);
  while (next < today) next = new Date(next.getTime() + freq);
  return next;
}

function diffDays(target: Date, from: Date): number {
  return Math.floor((target.getTime() - from.getTime()) / 86400000);
}

function freqLabel(dias?: number): string {
  if (!dias) return '—';
  const map: Record<number, string> = { 90: 'Trimestral', 180: 'Semestral', 365: 'Anual', 730: 'Bianual' };
  return map[dias] ?? `Cada ${dias} días`;
}

function statusLabel(diff: number): string {
  if (diff < 0)  return 'VENCIDO';
  if (diff === 0) return 'VENCE HOY';
  return `${diff} día${diff !== 1 ? 's' : ''}`;
}

function statusColor(diff: number): string {
  if (diff < 0)   return '#ef4444';
  if (diff <= 7)  return '#dc2626';
  if (diff <= 30) return '#f59e0b';
  return '#22c55e';
}

function sanitizeEmail(email: string): string {
  return email
    .replace(/[àáâãäå]/gi, 'a').replace(/[èéêë]/gi, 'e')
    .replace(/[ìíîï]/gi, 'i').replace(/[òóôõö]/gi, 'o')
    .replace(/[ùúûü]/gi, 'u').replace(/[ñ]/gi, 'n')
    .replace(/[ý]/gi, 'y').replace(/[ç]/gi, 'c')
    .replace(/[^a-zA-Z0-9@._+\-]/g, '');
}

const EMAIL_FROM = sanitizeEmail(EMAIL_FROM_RAW);

// ── Plantilla HTML del correo ────────────────────────────────────
function buildEmailHtml(rows: AlertRow[]): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString('es-MX', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const expired = rows.filter(r => r.diff < 0).length;
  const warning = rows.filter(r => r.diff >= 0).length;

  const tableRows = rows.map(r => {
    const color   = statusColor(r.diff);
    const label   = statusLabel(r.diff);
    const dateStr = r.nextDue.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;font-weight:600">${r.nombre}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569">${r.curso}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center">${r.freq}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;font-weight:700;color:${color}">${dateStr}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center">
          <span style="background:${color}22;color:${color};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap">${label}</span>
        </td>
      </tr>`;
  }).join('');

  const summaryItems = [];
  if (expired > 0) summaryItems.push(`<span style="color:#ef4444;font-weight:700">${expired} vencido${expired !== 1 ? 's' : ''}</span>`);
  if (warning > 0) summaryItems.push(`<span style="color:#f59e0b;font-weight:700">${warning} por vencer</span>`);
  const summaryHtml = summaryItems.join(' &nbsp;&bull;&nbsp; ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Alerta de Cursos por Vencer — AIFA</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 12px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" border="0"
       style="max-width:640px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.12);">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#0f2c0f,#1a5c1a);padding:24px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><img src="${IMG_LOGO}" alt="AIFA" height="38" style="height:38px;display:block;"></td>
          <td align="right" style="color:#d1fae5;font-size:11px;vertical-align:bottom">${todayStr}</td>
        </tr>
      </table>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-top:16px;">
        &#9888;&#65039; Alerta de Cursos por Vencer
      </div>
      <div style="color:#86efac;font-size:13px;margin-top:5px;">
        Sistema de Capacitaci&#243;n — Aeropuerto Internacional Felipe &#193;ngeles
      </div>
    </td>
  </tr>

  <!-- RESUMEN -->
  <tr>
    <td style="background:#fefce8;padding:14px 28px;border-bottom:1px solid #fef08a;">
      <span style="font-size:13px;color:#713f12;">
        Se detectaron <strong>${rows.length} curso${rows.length !== 1 ? 's' : ''}</strong> que requieren atenci&#243;n: ${summaryHtml}
      </span>
    </td>
  </tr>

  <!-- TABLA -->
  <tr>
    <td style="background:#fff;padding:24px 28px;">
      <p style="color:#334155;font-size:13px;margin:0 0 16px">
        Favor de coordinar con los colaboradores la actualizaci&#243;n o renovaci&#243;n de su capacitaci&#243;n antes de la fecha indicada.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.05em">Colaborador</th>
            <th style="padding:10px 14px;text-align:left;color:#64748b;font-size:11px;font-weight:700;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.05em">Curso / Capacitaci&#243;n</th>
            <th style="padding:10px 14px;text-align:center;color:#64748b;font-size:11px;font-weight:700;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.05em">Frecuencia</th>
            <th style="padding:10px 14px;text-align:center;color:#64748b;font-size:11px;font-weight:700;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.05em">Vence</th>
            <th style="padding:10px 14px;text-align:center;color:#64748b;font-size:11px;font-weight:700;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.05em">Estado</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:11px;margin:20px 0 0;padding-top:14px;border-top:1px solid #f1f5f9;">
        Este mensaje fue generado autom&#225;ticamente por el Sistema de Operaciones AIFA.<br>
        Se env&#237;a cada d&#237;a h&#225;bil cuando existen cursos con vencimiento en los pr&#243;ximos ${WARN_DAYS} d&#237;as o ya vencidos.
      </p>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0f172a;padding:16px 28px;text-align:center;">
      <div style="color:#475569;font-size:11px;">
        Aeropuerto Internacional Felipe &#193;ngeles &nbsp;&#183;&nbsp; Sistema de Operaciones AIFA
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Handler principal ────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Verificar secreto (previene invocaciones no autorizadas)
  const auth = req.headers.get('Authorization') ?? '';
  const isServiceRole  = SUPABASE_SVC_KEY && auth === `Bearer ${SUPABASE_SVC_KEY}`;
  const isCronSecret   = CRON_SECRET      && auth === `Bearer ${CRON_SECRET}`;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url      = new URL(req.url);
  const testMode = url.searchParams.get('test') === '1';

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

    // ── 1. Cargar todos los cursos recurrentes con fecha ──────────
    const { data: cursos, error: cErr } = await sb
      .from('colab_cursos')
      .select('*')
      .eq('es_recurrente', true)
      .not('fecha_realizacion', 'is', null);
    if (cErr) throw cErr;

    // ── 2. Filtrar los que vencen en ≤ WARN_DAYS días o ya vencidos
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today.getTime() + WARN_DAYS * 86400000);

    const alertas = (cursos ?? [])
      .map((c: Curso) => ({ c, nextDue: ccNextDue(c) }))
      .filter(({ nextDue }) => nextDue !== null && nextDue <= limit)
      .map(({ c, nextDue }) => ({
        num_empleado: c.num_empleado,
        curso:        c.nombre,
        nextDue:      nextDue as Date,
        diff:         diffDays(nextDue as Date, today),
        freq:         freqLabel(c.frecuencia_dias),
      }))
      .sort((a, b) => a.diff - b.diff);

    if (!alertas.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, alertas: 0, msg: 'Sin cursos por vencer hoy' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Nombres de colaboradores ───────────────────────────────
    const nums = [...new Set(alertas.map(a => a.num_empleado))];
    const { data: dirRows } = await sb
      .from('agenda_2026')
      .select('num_empleado, nombre')
      .in('num_empleado', nums);
    const nombreMap: Record<string, string> = {};
    (dirRows ?? []).forEach((r: { num_empleado: string; nombre: string }) => {
      nombreMap[String(r.num_empleado)] = r.nombre ?? r.num_empleado;
    });

    const rows: AlertRow[] = alertas.map(a => ({
      nombre:  nombreMap[String(a.num_empleado)] ?? a.num_empleado,
      curso:   a.curso,
      nextDue: a.nextDue,
      diff:    a.diff,
      freq:    a.freq,
    }));

    // ── 4. Emails de editores (colab_editor + admin + superadmin) ─
    const { data: roleRows } = await sb
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'superadmin', 'colab_editor', 'editor']);
    const userIds = (roleRows ?? []).map((r: { user_id: string }) => r.user_id);

    let destinos: string[] = [];
    if (userIds.length) {
      const { data: usersData } = await sb.auth.admin.listUsers({ perPage: 500 });
      if (usersData?.users) {
        destinos = usersData.users
          .filter((u: { id: string; email?: string }) => userIds.includes(u.id) && u.email)
          .map((u: { email: string }) => u.email);
      }
    }

    // Modo test: sobrescribir destinatarios con TEST_EMAIL
    if (testMode) {
      destinos = TEST_EMAIL ? [TEST_EMAIL] : [];
      console.log('[alertar-cursos] TEST MODE — destinatario:', destinos);
    }

    if (!destinos.length) {
      return new Response(JSON.stringify({
        ok: true, sent: 0, alertas: rows.length,
        msg: 'Sin destinatarios (no hay editores con email registrado)',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ── 5. Enviar email vía Resend ────────────────────────────────
    const subject = `⚠️ ${rows.length} curso${rows.length !== 1 ? 's' : ''} por vencer — AIFA Capacitación`;
    const html    = buildEmailHtml(rows);

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to:      destinos,
        subject,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errBody = await resendResp.text();
      throw new Error(`Resend ${resendResp.status}: ${errBody}`);
    }

    const resendData = await resendResp.json();
    console.log(`[alertar-cursos] OK — ${rows.length} alertas, ${destinos.length} destinatarios, id=${resendData.id}`);

    return new Response(JSON.stringify({
      ok:        true,
      alertas:   rows.length,
      sent:      destinos.length,
      resend_id: resendData.id,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[alertar-cursos] ERROR:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
