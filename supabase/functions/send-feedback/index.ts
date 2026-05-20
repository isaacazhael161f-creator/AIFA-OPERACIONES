// ================================================================
// AIFA OPERACIONES - Edge Function: send-feedback
// Recibe sugerencias / comentarios / solicitudes de ayuda y las
// reenvía al correo del administrador vía Resend API.
// ================================================================

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const DEST_EMAIL     = 'operaciones@aifanlu.com.mx';
const FROM_EMAIL     = 'noreply@aifanlu.com.mx';
const FROM_NAME      = 'AIFA Operaciones · Feedback';

const STORAGE = 'https://fgstncvuuhpgyzmjceyr.supabase.co/storage/v1/object/public/email-assets';
const IMG_LOGO = STORAGE + '/aifa-logo.png';

const TIPO_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  idea:     { emoji: '💡', label: 'Idea de mejora',       color: '#f59e0b' },
  ayuda:    { emoji: '🙋', label: 'Solicitud de ayuda',   color: '#3b82f6' },
  opinion:  { emoji: '💬', label: 'Opinión / comentario', color: '#8b5cf6' },
  reporte:  { emoji: '⚠️',  label: 'Reporte de problema', color: '#ef4444' },
  otro:     { emoji: '📝', label: 'Otro',                 color: '#6b7280' },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

function buildEmailHtml(params: {
  tipo: string;
  nombre: string;
  area: string;
  mensaje: string;
  fechaLocal: string;
  imagenes?: { dataUrl?: string; filename?: string }[];
}): string {
  const meta = TIPO_LABELS[params.tipo] || TIPO_LABELS['otro'];
  const now  = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const imgs = (params.imagenes || []).filter(i => i?.dataUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f8;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#eef2f8;padding:32px 0;">
  <tr>
    <td align="center">

      <!-- CONTENEDOR PRINCIPAL -->
      <table width="620" cellpadding="0" cellspacing="0" border="0"
             style="max-width:620px;width:100%;border-radius:18px;overflow:hidden;
                    box-shadow:0 8px 40px rgba(0,0,0,0.13);">

        <!-- CABECERA AZUL OSCURO -->
        <tr>
          <td bgcolor="#0d2152" style="background:#0d2152;padding:30px 40px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="${IMG_LOGO}" alt="AIFA" width="110" height="auto"
                       style="display:block;max-width:110px;">
                </td>
                <td align="right" style="padding-left:16px;">
                  <p style="margin:0;color:rgba(255,255,255,0.55);font-size:9px;
                            letter-spacing:3px;text-transform:uppercase;">
                    Sistema de retroalimentaci&oacute;n
                  </p>
                  <p style="margin:4px 0 0;color:#e2c870;font-size:13px;
                            font-weight:700;letter-spacing:1px;">
                    Nuevo mensaje recibido
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FRANJA DORADA -->
        <tr>
          <td bgcolor="#e2c870" style="background:#e2c870;height:3px;
              font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- CUERPO BLANCO -->
        <tr>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:36px 44px 32px;">

            <!-- TIPO DE MENSAJE (badge) -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:${meta.color}18;border:1.5px solid ${meta.color}55;
                           border-radius:999px;padding:5px 16px;">
                  <span style="color:${meta.color};font-size:13px;font-weight:700;
                               letter-spacing:.5px;">
                    ${meta.emoji}&nbsp; ${meta.label}
                  </span>
                </td>
              </tr>
            </table>

            <!-- MENSAJE PRINCIPAL -->
            <p style="margin:0 0 20px;color:#0d2152;font-size:15px;line-height:1.85;
                      font-family:Arial,sans-serif;background:#f8faff;border-left:4px solid ${meta.color};
                      border-radius:0 8px 8px 0;padding:16px 18px;">
              ${escapeHtml(params.mensaje)}
            </p>

            <!-- DATOS DEL REMITENTE -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f1f5f9;border-radius:10px;padding:18px 20px;
                          margin-bottom:24px;border:1px solid #e2e8f0;">
              <tr>
                <td>
                  <p style="margin:0 0 8px;color:#64748b;font-size:10px;letter-spacing:2px;
                            text-transform:uppercase;font-weight:700;">Remitente</p>
                  <p style="margin:0 0 4px;color:#0d2152;font-size:15px;font-weight:700;">
                    ${escapeHtml(params.nombre || '(sin nombre)')}
                  </p>
                  <p style="margin:0;color:#475569;font-size:13px;">
                    ${escapeHtml(params.area || 'Área no especificada')}
                  </p>
                </td>
              </tr>
            </table>

            <!-- METADATOS (fecha) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  ${imgs.length ? `<p style="margin:0 0 8px;color:#475569;font-size:12px;font-family:Arial,sans-serif;">
                    📎 ${imgs.length} imagen${imgs.length > 1 ? 'es adjuntas' : ' adjunta'} — ver archivos adjuntos del correo
                  </p>` : ''}
                  <p style="margin:0;color:#94a3b8;font-size:11px;font-family:Arial,sans-serif;">
                    📅&nbsp; Recibido el ${now} (hora CDMX)
                    ${params.fechaLocal ? `&nbsp;·&nbsp; Enviado: ${escapeHtml(params.fechaLocal)}` : ''}
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- PIE -->
        <tr>
          <td bgcolor="#0d2152"
              style="background:#0d2152;padding:16px 40px;border-top:3px solid #e2c870;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;
                            font-family:Arial,sans-serif;letter-spacing:1px;">
                    Seguridad &nbsp;&#9632;&nbsp; Innovaci&oacute;n &nbsp;&#9632;&nbsp; Funcionalidad
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
      <!-- /CONTENEDOR -->

    </td>
  </tr>
</table>

</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { tipo = 'otro', nombre = '', area = '', mensaje = '', fechaLocal = '', imagenes = [] } = body;

  if (!mensaje.trim()) {
    return new Response(JSON.stringify({ error: 'El mensaje no puede estar vacío' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const meta     = TIPO_LABELS[tipo] || TIPO_LABELS['otro'];
  const subject  = `${meta.emoji} [AIFA Feedback] ${meta.label}${nombre ? ' — ' + nombre : ''}`;
  const htmlBody = buildEmailHtml({ tipo, nombre, area, mensaje, fechaLocal, imagenes: Array.isArray(imagenes) ? imagenes : [] });

  // Convertir imágenes base64 data URLs en adjuntos para Resend
  const attachments: { filename: string; content: string }[] = [];
  if (Array.isArray(imagenes)) {
    imagenes.slice(0, 3).forEach((img: { dataUrl?: string; filename?: string }, i: number) => {
      if (!img?.dataUrl) return;
      const match = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return;
      const ext      = match[1].split('/')[1] || 'png';
      const b64data  = match[2];
      const fname    = (img.filename || `imagen_${i + 1}.${ext}`).replace(/[^\w.\-]/g, '_');
      attachments.push({ filename: fname, content: b64data });
    });
  }

  const resendPayload: Record<string, unknown> = {
    from:  `${FROM_NAME} <${FROM_EMAIL}>`,
    to:    [DEST_EMAIL],
    subject,
    html:  htmlBody,
  };
  if (attachments.length) resendPayload.attachments = attachments;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.message || 'Error de Resend', detail: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
