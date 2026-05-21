// ================================================================
// AIFA OPERACIONES — Edge Function: alertar-cursos  v2
// Invocada diariamente por pg_cron a las 08:00 CST (14:00 UTC)
// Envia mensaje WhatsApp via CallMeBot a los numeros registrados
// en la tabla whatsapp_alertas cuando hay cursos por vencer.
//
// MODO TEST: GET /alertar-cursos?test=1&phone=521XXXXXXXXXX&apikey=XXXXX
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Variables de entorno
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET      = Deno.env.get('CRON_SECRET')               ?? '';
const WARN_DAYS        = 30;

// Tipos
interface Curso {
  id: string;
  num_empleado: string;
  nombre: string;
  fecha_realizacion: string;
  es_recurrente: boolean;
  frecuencia_dias?: number;
}

interface AlertRow {
  nombre:  string;
  curso:   string;
  nextDue: Date;
  diff:    number;
  freq:    string;
}

interface WhaNumber {
  id: number;
  nombre: string;
  telefono: string;
  apikey: string;
  activo: boolean;
}

// Helpers
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
  if (!dias) return '-';
  const map: Record<number, string> = {
    90: 'Trimestral', 180: 'Semestral', 365: 'Anual', 730: 'Bianual',
  };
  return map[dias] ?? `Cada ${dias} dias`;
}

function buildWhaText(rows: AlertRow[], dateStr: string): string {
  const expired = rows.filter(r => r.diff < 0);
  const soon    = rows.filter(r => r.diff >= 0);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let msg = `\u26a0\ufe0f AIFA \u2014 Cursos por vencer (${dateStr})\n`;

  if (expired.length) {
    msg += `\n\ud83d\udd34 VENCIDOS (${expired.length}):\n`;
    for (const r of expired) {
      msg += `\u2022 ${r.nombre} \u2014 ${r.curso} (${r.freq}) \u2014 ${fmtDate(r.nextDue)}\n`;
    }
  }
  if (soon.length) {
    msg += `\n\ud83d\udfe1 Proximos ${WARN_DAYS} dias (${soon.length}):\n`;
    for (const r of soon) {
      msg += `\u2022 ${r.nombre} \u2014 ${r.curso} \u2014 ${fmtDate(r.nextDue)} (${r.diff} dias)\n`;
    }
  }
  msg += `\nTotal: ${rows.length} curso${rows.length !== 1 ? 's' : ''} requieren atencion.\n`;
  msg += `Favor de coordinar renovaciones con los colaboradores.`;
  return msg;
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('Authorization') ?? '';
  const isServiceRole = SUPABASE_SVC_KEY && auth === `Bearer ${SUPABASE_SVC_KEY}`;
  const isCronSecret  = CRON_SECRET      && auth === `Bearer ${CRON_SECRET}`;

  if (!isServiceRole && !isCronSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url       = new URL(req.url);
  const testMode  = url.searchParams.get('test')   === '1';
  const testPhone = url.searchParams.get('phone')  ?? '';
  const testKey   = url.searchParams.get('apikey') ?? '';

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);

    // 1. Cargar cursos recurrentes con fecha
    const { data: cursos, error: cErr } = await sb
      .from('colab_cursos')
      .select('*')
      .eq('es_recurrente', true)
      .not('fecha_realizacion', 'is', null);
    if (cErr) throw cErr;

    // 2. Filtrar los que vencen en <= WARN_DAYS o ya vencidos
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
      return new Response(
        JSON.stringify({ ok: true, sent: 0, alertas: 0, msg: 'Sin cursos por vencer hoy' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 3. Nombres de colaboradores
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

    // 4. Obtener numeros activos de whatsapp_alertas
    let destinos: WhaNumber[] = [];
    if (testMode && testPhone && testKey) {
      destinos = [{ id: 0, nombre: 'Test', telefono: testPhone, apikey: testKey, activo: true }];
      console.log('[alertar-cursos] TEST MODE — telefono:', testPhone);
    } else {
      const { data: whaRows, error: wErr } = await sb
        .from('whatsapp_alertas')
        .select('id, nombre, telefono, apikey, activo')
        .eq('activo', true);
      if (wErr) throw wErr;
      destinos = whaRows ?? [];
    }

    if (!destinos.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, alertas: rows.length, msg: 'Sin numeros WhatsApp activos registrados' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 5. Construir mensaje
    const dateStr = today.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const text    = buildWhaText(rows, dateStr);
    const encoded = encodeURIComponent(text);

    // 6. Enviar a cada numero via CallMeBot
    const results: Array<{
      nombre: string; telefono: string; ok: boolean; status?: number; error?: string;
    }> = [];

    for (const dest of destinos) {
      try {
        const resp = await fetch(
          `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(dest.telefono)}&text=${encoded}&apikey=${encodeURIComponent(dest.apikey)}`,
        );
        results.push({ nombre: dest.nombre, telefono: dest.telefono, ok: resp.ok, status: resp.status });
        console.log(`[alertar-cursos] -> ${dest.nombre} (${dest.telefono}): HTTP ${resp.status}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({ nombre: dest.nombre, telefono: dest.telefono, ok: false, error: errMsg });
        console.error(`[alertar-cursos] ERROR -> ${dest.nombre}: ${errMsg}`);
      }
      // Pausa entre envios para respetar rate limits de CallMeBot
      await new Promise(r => setTimeout(r, 1500));
    }

    const sent = results.filter(r => r.ok).length;
    console.log(`[alertar-cursos] Completado: ${sent}/${destinos.length} enviados, ${rows.length} alertas`);

    return new Response(JSON.stringify({
      ok:      true,
      alertas: rows.length,
      sent,
      total:   destinos.length,
      results,
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