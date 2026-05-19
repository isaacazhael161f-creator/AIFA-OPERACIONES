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
  const roleLine  = [puesto, direccion].filter(Boolean).join(' &nbsp;&middot;&nbsp; ');
  const roleBlock = roleLine
    ? `<p style="color:#6b7a99;font-size:12px;margin:14px 0 0;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">${roleLine}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Feliz Cumplea&#241;os</title>
</head>
<body style="margin:0;padding:0;background:#071540;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#071540;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- ============ HERO IMAGE ============ -->
  <tr>
    <td style="padding:0;line-height:0;">
      <img src="${IMG_AVION}" alt="AIFA" width="600"
           style="width:100%;max-width:600px;display:block;height:280px;object-fit:cover;border-radius:20px 20px 0 0;">
    </td>
  </tr>

  <!-- ============ RAINBOW CONFETTI STRIP ============ -->
  <tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
          <td width="75" height="9" bgcolor="#FFD700" style="background:#FFD700;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#FF6B6B" style="background:#FF6B6B;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#4ECDC4" style="background:#4ECDC4;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#7B68EE" style="background:#7B68EE;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#FFD700" style="background:#FFD700;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#FF6B6B" style="background:#FF6B6B;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#4ECDC4" style="background:#4ECDC4;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="75" height="9" bgcolor="#7B68EE" style="background:#7B68EE;width:75px;height:9px;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ============ DARK NAVY HEADER ============ -->
  <tr>
    <td align="center" bgcolor="#0d2152" style="background:#0d2152;padding:28px 30px 34px;">
      <img src="${IMG_LOGO}" alt="AIFA Logo" height="52"
           style="display:block;margin:0 auto 16px;height:52px;">
      <p style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;font-weight:700;font-family:Arial,sans-serif;">
        &#10022;&nbsp; Aeropuerto Internacional Felipe &#193;ngeles &nbsp;&#10022;
      </p>
      <!-- GOLD PILL BADGE -->
      <table cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          <td align="center" bgcolor="#FFD700" style="background:#FFD700;padding:18px 44px;border-radius:60px;">
            <p style="color:#0d2152;font-size:26px;font-weight:900;margin:0;font-family:Arial,sans-serif;letter-spacing:2px;line-height:1;">
              &#127874;&nbsp;&nbsp;FELIZ CUMPLEA&#209;OS&nbsp;&nbsp;&#127874;
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ============ WHITE BODY ============ -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;">

      <!-- "HOY ES TU DIA" WARM BANNER -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" bgcolor="#fffbef" style="background:#fffbef;padding:16px 40px 14px;border-bottom:2px solid #fff3c0;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#b8860b;font-family:Arial,sans-serif;">
              &#11088;&nbsp;&nbsp;Hoy es tu d&#237;a especial&nbsp;&nbsp;&#11088;
            </p>
          </td>
        </tr>
      </table>

      <!-- NAME SECTION -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:34px 40px 8px;">
            <p style="color:#0d2152;font-size:52px;font-weight:900;margin:0;font-family:Arial,sans-serif;line-height:1.05;letter-spacing:-1px;">${nombre}</p>
            <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:13px auto 0;">
              <tr>
                <td width="90" height="4" bgcolor="#FFD700" style="background:#FFD700;width:90px;height:4px;border-radius:2px;line-height:0;font-size:0;">&nbsp;</td>
              </tr>
            </table>
            ${roleBlock}
          </td>
        </tr>
      </table>

      <!-- THIN DIVIDER -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:20px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td height="1" bgcolor="#eef0f7" style="background:#eef0f7;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- MESSAGE BOX -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:22px 36px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faff;border-radius:16px;overflow:hidden;">
              <tr>
                <td width="6" bgcolor="#FFD700" style="background:#FFD700;width:6px;line-height:0;font-size:0;">&nbsp;</td>
                <td style="padding:22px 24px;background:#f8faff;">
                  <p style="color:#1a2540;font-size:15px;line-height:2;margin:0 0 14px;font-family:Arial,sans-serif;">
                    En este d&#237;a tan especial para ti, todo el equipo del
                    <strong>Aeropuerto Internacional Felipe &#193;ngeles</strong>
                    te desea un maravilloso cumplea&#241;os lleno de logros,
                    bienestar y grandes vuelos por venir. Tu compromiso y
                    dedicaci&#243;n son el motor de nuestra operaci&#243;n.&nbsp;&#9992;&#65039;
                  </p>
                  <p style="color:#b8860b;font-size:14px;font-style:italic;line-height:1.8;margin:0;font-family:Arial,sans-serif;font-weight:700;">
                    &#161;Que este nuevo a&#241;o de vida est&#233; lleno de cielos despejados y destinos maravillosos!
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- EMOJI CELEBRATION ROW -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:16px 40px 32px;font-size:38px;letter-spacing:16px;">
            &#127881; &#127880; &#129395; &#127882;
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- ============ ALTERNATING GOLD / NAVY STRIP ============ -->
  <tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;">
        <tr>
          <td width="100" height="7" bgcolor="#FFD700" style="background:#FFD700;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="100" height="7" bgcolor="#0d2152" style="background:#0d2152;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="100" height="7" bgcolor="#FFD700" style="background:#FFD700;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="100" height="7" bgcolor="#0d2152" style="background:#0d2152;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="100" height="7" bgcolor="#FFD700" style="background:#FFD700;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="100" height="7" bgcolor="#0d2152" style="background:#0d2152;width:100px;height:7px;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ============ DARK FOOTER ============ -->
  <tr>
    <td align="center" bgcolor="#0d2152" style="background:#0d2152;padding:20px 36px 30px;border-radius:0 0 20px 20px;">
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0 0 3px;font-family:Arial,sans-serif;">Este mensaje fue enviado por</p>
      <p style="color:#FFD700;font-size:13px;font-weight:700;margin:0;font-family:Arial,sans-serif;">${EMAIL_FROM_NAME}</p>
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:6px 0 0;font-family:Arial,sans-serif;">Aeropuerto Internacional Felipe &#193;ngeles (AIFA)</p>
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