// ================================================================
// AIFA OPERACIONES — Edge Function: send-birthday-emails
// Deno (Supabase Edge Functions)
//
// Envía tarjetas de felicitación por correo a colaboradores
// cuyo cumpleaños sea hoy.
//
// Modos de invocación:
//   GET  /send-birthday-emails              → env. automático (hoy)
//   POST /send-birthday-emails  { "id": X } → env. manual por id
//   POST /send-birthday-emails  { "email": "a@b.com", "nombre": "..." } → manual por email directo
//
// Variables de entorno requeridas (Supabase Secrets):
//   SUPABASE_URL          — URL del proyecto Supabase
//   SUPABASE_SERVICE_KEY  — service_role key (no la anon)
//   RESEND_API_KEY        — API key de Resend (resend.com)
//   EMAIL_FROM            — dirección de origen, ej: cumpleanios@aifa.com.mx
//   EMAIL_FROM_NAME       — nombre visible, ej: "AIFA Operaciones"
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')              || '';
const SUPABASE_SVC_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')       || '';
const EMAIL_FROM        = Deno.env.get('EMAIL_FROM')           || 'operaciones@aifa.com.mx';
const EMAIL_FROM_NAME   = Deno.env.get('EMAIL_FROM_NAME')      || 'Aeropuerto Internacional Felipe Ángeles';
// TEST_EMAIL: si está definido, todos los correos se redirigen a esta dirección (útil en Resend plan gratuito)
const TEST_EMAIL        = Deno.env.get('TEST_EMAIL')           || '';

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
];

interface Colaborador {
  id:         number;
  nombre:     string;
  puesto?:    string;
  direccion?: string;
  correo?:    string;
  fecha_nacimiento?: string;
}

// URL base de las imágenes (Vercel)
const IMG_BASE = 'https://aifa-operaciones.vercel.app';

// ── HTML de la tarjeta de cumpleaños ────────────────────────────────────────
function buildEmailHtml(colaborador: Colaborador): string {
  const nombre    = colaborador.nombre    || 'Colaborador';
  const puesto    = colaborador.puesto    || '';
  const direccion = colaborador.direccion || 'Dirección de Operación';
  const puestoLine = puesto + (puesto && direccion ? ' · ' : '') + direccion;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Feliz Cumpleaños! - AIFA</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(10,20,80,.15);">

          <!-- Hero con imagen del avión -->
          <tr>
            <td style="padding:0;margin:0;line-height:0;">
              <div style="position:relative;width:600px;max-width:100%;">
                <img src="${IMG_BASE}/images/Aviones%20pax.jpeg"
                     alt="AIFA" width="600"
                     style="width:100%;max-width:600px;height:220px;object-fit:cover;display:block;filter:brightness(0.55);">
                <!-- Overlay de texto sobre la imagen -->
                <table width="600" cellpadding="0" cellspacing="0"
                       style="position:absolute;top:0;left:0;width:100%;height:220px;">
                  <tr>
                    <td align="center" valign="middle" style="padding:20px;">
                      <img src="${IMG_BASE}/images/aifa-logo.png"
                           alt="AIFA Logo" height="45"
                           style="display:block;margin:0 auto 12px;opacity:0.95;">
                      <div style="font-size:40px;line-height:1;margin-bottom:6px;">🎂</div>
                      <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0 0 4px;letter-spacing:1px;text-shadow:0 2px 8px rgba(0,0,0,.5);">¡FELIZ CUMPLEAÑOS!</h1>
                      <p style="color:rgba(255,255,255,.9);font-size:11px;font-weight:600;margin:0;letter-spacing:2.5px;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.4);">Aeropuerto Internacional Felipe Ángeles</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Nombre y puesto -->
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;border-bottom:1px solid #eef0f7;">
              <h2 style="color:#0d2152;font-size:24px;font-weight:800;margin:0 0 8px;">${nombre}</h2>
              <p style="color:#6b7a99;font-size:13px;margin:0;">${puestoLine}</p>
            </td>
          </tr>

          <!-- Mensaje -->
          <tr>
            <td style="padding:24px 40px 20px;">
              <div style="background:#f8faff;border-left:4px solid #f59e0b;border-radius:0 12px 12px 0;padding:18px 20px;">
                <p style="color:#1a2540;font-size:14px;line-height:1.75;margin:0 0 12px;">
                  En este día tan especial para ti, todo el equipo del <strong>Aeropuerto Internacional Felipe Ángeles</strong> te desea un maravilloso cumpleaños lleno de logros, bienestar y grandes vuelos por venir. Tu compromiso y dedicación son el motor de nuestra operación. ✈️
                </p>
                <p style="color:#6b7a99;font-size:13px;font-style:italic;line-height:1.6;margin:0;">
                  ¡Que este nuevo año de vida esté lleno de cielos despejados y destinos maravillosos!
                </p>
              </div>
            </td>
          </tr>

          <!-- Emojis -->
          <tr>
            <td style="padding:4px 40px 20px;text-align:center;">
              <span style="font-size:26px;letter-spacing:6px;">🎉 🎈 🥳 🎊</span>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-top:1px solid #eef0f7;padding:18px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0 0 3px;">Este mensaje fue enviado por</p>
              <p style="color:#0d2152;font-size:13px;font-weight:700;margin:0;">${EMAIL_FROM_NAME}</p>
              <p style="color:#94a3b8;font-size:11px;margin:6px 0 0;">Aeropuerto Internacional Felipe Ángeles (AIFA) · Dirección de Operación</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Enviar email vía Resend ──────────────────────────────────────────────────
async function sendEmail(to: string, nombre: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY no configurada en los secrets de Supabase' };
  }

  // Si hay TEST_EMAIL, redirigir a esa dirección (plan gratuito de Resend)
  const recipient = (TEST_EMAIL || to).trim().toLowerCase();

  // Validar formato de email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { ok: false, error: `Email inválido: "${recipient}"` };
  }

  const subject   = TEST_EMAIL
    ? `[PRUEBA] 🎂 ¡Feliz Cumpleaños, ${nombre.split(' ')[0]}! - AIFA`
    : `🎂 ¡Feliz Cumpleaños, ${nombre.split(' ')[0]}! - AIFA`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to:      [recipient],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Resend error ${res.status}: ${body}` };
  }
  return { ok: true };
}

// ── Lógica principal ─────────────────────────────────────────────────────────
async function processBirthdays(targetColaborador?: { id?: number; email?: string; nombre?: string }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const results: Array<{ nombre: string; correo: string; ok: boolean; error?: string }> = [];

  let colaboradores: Colaborador[] = [];

  if (targetColaborador?.id) {
    // Manual: por id
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nombre, puesto, direccion, correo, fecha_nacimiento')
      .eq('id', targetColaborador.id)
      .single();
    if (error || !data) return { sent: 0, errors: 1, detail: [{ nombre: '?', correo: '?', ok: false, error: error?.message || 'No encontrado' }] };
    colaboradores = [data];
  } else if (targetColaborador?.email && targetColaborador?.nombre) {
    // Manual: email directo (sin consultar BD)
    colaboradores = [{ id: 0, nombre: targetColaborador.nombre, correo: targetColaborador.email }];
  } else {
    // Automático: colaboradores con cumpleaños hoy
    const today = new Date();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');

    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, nombre, puesto, direccion, correo, fecha_nacimiento')
      .not('correo', 'is', null)
      .not('fecha_nacimiento', 'is', null);

    if (error) throw new Error(`Error consultando colaboradores: ${error.message}`);

    // Filtrar por mes y día (ignorar año)
    colaboradores = (data || []).filter((c: Colaborador) => {
      if (!c.fecha_nacimiento || !c.correo) return false;
      const fParts = c.fecha_nacimiento.split('-');
      if (fParts.length < 3) return false;
      return fParts[1] === mm && fParts[2].substring(0, 2) === dd;
    });
  }

  // Enviar a cada uno
  for (const c of colaboradores) {
    if (!c.correo) {
      results.push({ nombre: c.nombre, correo: '—', ok: false, error: 'Sin correo registrado' });
      continue;
    }
    const correoLimpio = c.correo.trim().toLowerCase();
    const html   = buildEmailHtml(c);
    const result = await sendEmail(correoLimpio, c.nombre, html);
    results.push({ nombre: c.nombre, correo: correoLimpio, ...result });
    console.log(`${result.ok ? '✓' : '✗'} ${c.nombre} <${c.correo}>${result.error ? ' — ' + result.error : ''}`);
  }

  const sent   = results.filter(r => r.ok).length;
  const errors = results.filter(r => !r.ok).length;
  return { sent, errors, detail: results };
}

// ── CORS headers ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// ── Handler HTTP ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Responder al preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Validar autorización
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.includes('Bearer ') && req.method !== 'GET') {
    return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
  }

  try {
    let target: { id?: number; email?: string; nombre?: string } | undefined;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        target = {
          id:     body.id     ? Number(body.id)   : undefined,
          email:  body.email  || undefined,
          nombre: body.nombre || undefined,
        };
      } catch (_) { /* body vacío → modo automático */ }
    }

    const result = await processBirthdays(target);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      status: 200,
    });
  } catch (err) {
    console.error('Error en send-birthday-emails:', err);
    return new Response(JSON.stringify({ sent: 0, errors: 1, detail: [{ nombre: '?', correo: '?', ok: false, error: String(err) }] }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      status: 200,
    });
  }
});
