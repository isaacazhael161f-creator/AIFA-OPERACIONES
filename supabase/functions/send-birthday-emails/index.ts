// ================================================================
// AIFA OPERACIONES - Edge Function: send-birthday-emails
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              || '';
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')            || '';
const EMAIL_FROM_RAW   = Deno.env.get('EMAIL_FROM')                || 'operaciones@aifanlu.com.mx';
const EMAIL_FROM_NAME  = Deno.env.get('EMAIL_FROM_NAME')           || 'AIFA Operaciones';
const TEST_EMAIL       = Deno.env.get('TEST_EMAIL')                || '';

// Supabase Storage publico — bucket email-assets, siempre accesible desde cualquier cliente de correo
const STORAGE   = 'https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/email-assets';
const IMG_TORRE = STORAGE + '/torre.jpg';
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
  const roleLine  = [puesto, direccion].filter(Boolean).join(' &nbsp;&bull;&nbsp; ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Feliz Cumplea&#241;os</title>
</head>
<body style="margin:0;padding:0;background:#0f1b3d;font-family:Georgia,'Times New Roman',serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f1b3d;padding:36px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0"
       style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6);">

  <!-- ============================================================ -->
  <!-- HERO: torre con overlay de gradiente                         -->
  <!-- ============================================================ -->
  <tr>
    <td style="padding:0;margin:0;line-height:0;position:relative;">

      <!-- Imagen de fondo (200% ancho trucado para centrar la torre) -->
      <img src="${IMG_TORRE}" alt="AIFA Torre de Control" width="600"
           style="display:block;width:100%;max-width:600px;height:320px;object-fit:cover;object-position:center center;">

      <!-- Overlay logo + nombre del aeropuerto encima de la foto -->
      <!-- Truco email: tabla absoluta posicionada sobre imagen con bgcolor semitransparente -->
      <!-- Como position:absolute no funciona en todos los clientes, usamos una segunda fila
           con fondo degradado simulado y la foto como fondo de tabla -->

    </td>
  </tr>

  <!-- FRANJA DE COLOR INSTITUCIONAL (simula el degradado sobre la foto) -->
  <tr>
    <td bgcolor="#0d2152" style="background:#0d2152;padding:0;line-height:0;font-size:0;" height="6">&nbsp;</td>
  </tr>

  <!-- ============================================================ -->
  <!-- CABECERA INSTITUCIONAL                                       -->
  <!-- ============================================================ -->
  <tr>
    <td align="center" bgcolor="#0d2152"
        style="background:#0d2152;padding:30px 40px 26px;">

      <img src="${IMG_LOGO}" alt="AIFA" height="56"
           style="display:block;margin:0 auto 14px;height:56px;">

      <p style="margin:0 0 5px;color:#e2c870;font-size:9px;letter-spacing:5px;
                text-transform:uppercase;font-weight:bold;font-family:Arial,sans-serif;">
        Aeropuerto Internacional Felipe &#193;ngeles
      </p>

      <!-- Exhorto institucional -->
      <p style="margin:0;color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:3px;
                text-transform:uppercase;font-family:Arial,sans-serif;">
        Seguridad &nbsp;&#9632;&nbsp; Innovaci&#243;n &nbsp;&#9632;&nbsp; Funcionalidad
      </p>

    </td>
  </tr>

  <!-- SEPARADOR DORADO -->
  <tr>
    <td bgcolor="#0d2152" style="background:#0d2152;padding:0 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td height="1" bgcolor="#e2c870"
              style="background:#e2c870;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ============================================================ -->
  <!-- CUERPO BLANCO                                                -->
  <!-- ============================================================ -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:42px 48px 36px;">

      <!-- Etiqueta de felicitación -->
      <p style="margin:0 0 22px;color:#b8960c;font-size:10px;letter-spacing:4px;
                text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">
        &#127881;&nbsp; Felicitaci&#243;n especial &nbsp;&#127881;
      </p>

      <!-- FRASE PRINCIPAL -->
      <p style="margin:0 0 8px;color:#0d2152;font-size:15px;line-height:1.5;
                font-family:Arial,sans-serif;">
        Estimado/a
      </p>

      <!-- NOMBRE GRANDE -->
      <p style="margin:0 0 6px;color:#0d2152;font-size:42px;font-weight:900;line-height:1.1;
                font-family:Arial,sans-serif;letter-spacing:-0.5px;">
        ${nombre}
      </p>

      <!-- LÍNEA DORADA BAJO EL NOMBRE -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
        <tr>
          <td width="64" height="3" bgcolor="#e2c870"
              style="background:#e2c870;width:64px;height:3px;
                     border-radius:2px;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>

      <!-- PUESTO / DIRECCIÓN -->
      <p style="margin:0 0 34px;color:#7a8aaa;font-size:12px;letter-spacing:1.5px;
                text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;">
        ${roleLine}
      </p>

      <!-- MENSAJE -->
      <p style="margin:0 0 18px;color:#1a2540;font-size:15px;line-height:1.9;
                font-family:Arial,sans-serif;">
        En este d&#237;a tan especial, todo el equipo del
        <strong>Aeropuerto Internacional Felipe &#193;ngeles</strong>
        te desea un cumplea&#241;os lleno de alegr&#237;a, logros y grandes
        vuelos por venir. Tu talento y dedicaci&#243;n son parte fundamental
        de nuestra operaci&#243;n. &#9992;&#65039;
      </p>

      <p style="margin:0 0 34px;color:#8a6a00;font-size:14px;line-height:1.8;
                font-style:italic;font-family:Georgia,'Times New Roman',serif;">
        &#8220;Que este nuevo a&#241;o de vida est&#233; lleno de cielos
        despejados y destinos maravillosos.&#8221;
      </p>

      <!-- FIRMA -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="3" bgcolor="#e2c870"
              style="background:#e2c870;width:3px;border-radius:2px;">&nbsp;</td>
          <td style="padding:4px 14px;">
            <p style="margin:0 0 2px;color:#0d2152;font-size:14px;font-weight:bold;
                      font-family:Arial,sans-serif;">${EMAIL_FROM_NAME}</p>
            <p style="margin:0;color:#7a8aaa;font-size:12px;font-family:Arial,sans-serif;">
              Aeropuerto Internacional Felipe &#193;ngeles
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ============================================================ -->
  <!-- PIE DE PÁGINA                                                -->
  <!-- ============================================================ -->
  <tr>
    <td bgcolor="#0d2152" style="background:#0d2152;padding:18px 40px;border-top:3px solid #e2c870;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;
                      font-family:Arial,sans-serif;letter-spacing:1px;">
              Seguridad &nbsp;&#9632;&nbsp; Innovaci&#243;n &nbsp;&#9632;&nbsp; Funcionalidad
            </p>
          </td>
          <td align="right">
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;
                      font-family:Arial,sans-serif;">
              aifanlu.com.mx
            </p>
          </td>
        </tr>
      </table>
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
