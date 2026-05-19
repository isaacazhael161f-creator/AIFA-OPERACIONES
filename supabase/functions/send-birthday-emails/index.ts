// ================================================================
// AIFA OPERACIONES - Edge Function: send-birthday-emails
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              || '';
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')            || '';
const EMAIL_FROM_RAW   = Deno.env.get('EMAIL_FROM')                || 'cumpleanios@aifanlu.com.mx';
const EMAIL_FROM_NAME  = Deno.env.get('EMAIL_FROM_NAME')           || 'AIFA Operaciones';
const TEST_EMAIL       = Deno.env.get('TEST_EMAIL')                || '';

// Supabase Storage publico — bucket email-assets, siempre accesible desde cualquier cliente de correo
const STORAGE   = 'https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/email-assets';
const IMG_AVION = STORAGE + '/aviones-pax.jpg';
const IMG_LOGO  = STORAGE + '/aifa-logo.png';

function sanitizeEmail(email: string): string {
  return email
    .replace(/[àáâãäå]/gi, 'a').replace(/[èéêë]/gi, 'e')
    .replace(/[ìíîï]/gi, 'i').replace(/[òóôõö]/gi, 'o')
    .replace(/[ùúûü]/gi, 'u').replace(/[ñ]/gi, 'n')
    .replace(/[ý]/gi, 'y').replace(/[ç]/gi, 'c')
    .replace(/[^a-zA-Z0-9@._+\-]/g, '');
}
const EMAIL_FROM = sanitizeEmail(EMAIL_FROM_RAW);

function encodeFromName(name: string): string {
  if (/^[\x00-\x7F]*$/.test(name)) return name;
  const bytes = new TextEncoder().encode(name);
  const bin   = Array.from(bytes).map((b: number) => String.fromCharCode(b)).join('');
  return '=?UTF-8?B?' + btoa(bin) + '?=';
}

interface Colaborador {
  id: number;
  nombre: string;
  puesto?: string;
  direccion?: string;
  correo?: string;
}

function buildEmailHtml(c: Colaborador): string {
  const nombre    = c.nombre    || 'Colaborador';
  const puesto    = c.puesto    || '';
  const direccion = c.direccion || 'Direcci&#243;n de Operaci&#243;n';
  const puestoLine = [puesto, direccion].filter(Boolean).join(' &middot; ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Feliz Cumpleanios - AIFA</title>
</head>
<body style="margin:0;padding:0;background:#e8edf8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8edf8;padding:28px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0"
           style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,20,80,.15);">

      <tr>
        <td style="padding:0;line-height:0;">
          <img src="${IMG_AVION}" alt="AIFA" width="600"
               style="width:100%;max-width:600px;height:200px;object-fit:cover;display:block;">
        </td>
      </tr>

      <tr>
        <td align="center" bgcolor="#0d2152" style="background-color:#0d2152;padding:20px 30px 24px;">
          <img src="${IMG_LOGO}" alt="AIFA Logo" height="42"
               style="display:block;margin:0 auto 10px;height:42px;">
          <p style="color:rgba(255,255,255,.75);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;font-weight:600;font-family:Arial,sans-serif;">
            Aeropuerto Internacional Felipe &#193;ngeles
          </p>
          <p style="color:#ffffff;font-size:24px;font-weight:800;margin:0;letter-spacing:1px;font-family:Arial,sans-serif;">
            &#127874;&nbsp; FELIZ CUMPLEA&#209;OS &nbsp;&#127874;
          </p>
        </td>
      </tr>

      <tr>
        <td align="center" style="padding:28px 40px 16px;border-bottom:2px solid #eef0f7;">
          <p style="color:#0d2152;font-size:28px;font-weight:800;margin:0 0 8px;font-family:Arial,sans-serif;">${nombre}</p>
          <p style="color:#6b7a99;font-size:13px;margin:0;font-family:Arial,sans-serif;">${puestoLine}</p>
        </td>
      </tr>

      <tr>
        <td style="padding:22px 36px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="4" bgcolor="#f59e0b" style="background-color:#f59e0b;border-radius:4px;">&nbsp;</td>
              <td style="padding:14px 16px;background:#f8faff;border-radius:0 12px 12px 0;">
                <p style="color:#1a2540;font-size:14px;line-height:1.8;margin:0 0 10px;font-family:Arial,sans-serif;">
                  En este d&#237;a tan especial para ti, todo el equipo del
                  <strong>Aeropuerto Internacional Felipe &#193;ngeles</strong>
                  te desea un maravilloso cumplea&#241;os lleno de logros, bienestar y grandes vuelos por venir.
                  Tu compromiso y dedicaci&#243;n son el motor de nuestra operaci&#243;n. &#9992;&#65039;
                </p>
                <p style="color:#6b7a99;font-size:13px;font-style:italic;line-height:1.6;margin:0;font-family:Arial,sans-serif;">
                  &#161;Que este nuevo a&#241;o de vida est&#233; lleno de cielos despejados y destinos maravillosos!
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td align="center" style="padding:6px 40px 22px;font-size:28px;letter-spacing:8px;">
          &#127881; &#127880; &#129395; &#127882;
        </td>
      </tr>

      <tr>
        <td align="center" bgcolor="#f0f4ff" style="background-color:#f0f4ff;border-top:1px solid #dce4f5;padding:16px 36px;">
          <p style="color:#94a3b8;font-size:11px;margin:0 0 3px;font-family:Arial,sans-serif;">Este mensaje fue enviado por</p>
          <p style="color:#0d2152;font-size:13px;font-weight:700;margin:0;font-family:Arial,sans-serif;">${EMAIL_FROM_NAME}</p>
          <p style="color:#94a3b8;font-size:11px;margin:6px 0 0;font-family:Arial,sans-serif;">Aeropuerto Internacional Felipe &#193;ngeles (AIFA)</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

async function sendEmail(to: string, nombre: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY no configurada' };
  const recipient = (TEST_EMAIL || to).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return { ok: false, error: 'Email invalido: ' + recipient };
  const subject = (TEST_EMAIL ? '[PRUEBA] ' : '') + '\u00a1Feliz Cumplea\u00f1os, ' + nombre.split(' ')[0] + '! - AIFA';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: encodeFromName(EMAIL_FROM_NAME) + ' <' + EMAIL_FROM + '>', to: [recipient], subject, html }),
  });
  if (!res.ok) { const body = await res.text(); return { ok: false, error: 'Resend error ' + res.status + ': ' + body }; }
  return { ok: true };
}

async function processBirthdays(target?: { id?: number; email?: string; nombre?: string }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const results: Array<{ nombre: string; correo: string; ok: boolean; error?: string }> = [];
  let colaboradores: Colaborador[] = [];

  if (target?.id) {
    const { data, error } = await supabase.from('agenda_2026').select('id, nombre, puesto, direccion').eq('id', target.id).single();
    if (error || !data) return { sent: 0, errors: 1, detail: [{ nombre: '?', correo: '?', ok: false, error: error?.message || 'No encontrado' }] };
    colaboradores = [data as Colaborador];
  } else if (target?.email && target?.nombre) {
    colaboradores = [{ id: 0, nombre: target.nombre, correo: target.email }];
  } else {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const { data, error } = await supabase.from('agenda_2026').select('id, nombre, puesto, direccion, onomastico, "Correo Personal"').not('"Correo Personal"', 'is', null);
    if (error) throw new Error('Error consultando agenda_2026: ' + error.message);
    colaboradores = ((data || []) as any[])
      .filter((c: any) => {
        const fn = c.onomastico || c.fecha_nacimiento;
        if (!fn) return false;
        const p = String(fn).split(/[-/]/);
        if (p.length < 2) return false;
        return p[1]?.padStart(2, '0') === mm && p[2]?.substring(0, 2).padStart(2, '0') === dd;
      })
      .map((c: any) => ({ ...c, correo: c['Correo Personal'] }));
  }

  for (const c of colaboradores) {
    if (!c.correo) { results.push({ nombre: c.nombre, correo: '-', ok: false, error: 'Sin correo' }); continue; }
    const correo = c.correo.trim().toLowerCase();
    const html   = buildEmailHtml(c);
    const result = await sendEmail(correo, c.nombre, html);
    results.push({ nombre: c.nombre, correo, ...result });
    console.log((result.ok ? 'OK' : 'ERROR') + ' ' + c.nombre + ' <' + correo + '>' + (result.error ? ' -- ' + result.error : ''));
  }
  return { sent: results.filter(r => r.ok).length, errors: results.filter(r => !r.ok).length, detail: results };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  try {
    let target: { id?: number; email?: string; nombre?: string } | undefined;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.email && body.nombre) target = { email: body.email, nombre: body.nombre };
      else if (body.id)              target = { id: Number(body.id) };
    }
    const result = await processBirthdays(target);
    return new Response(JSON.stringify(result), { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});