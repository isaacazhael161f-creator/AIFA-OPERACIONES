// ================================================================
// AIFA OPERACIONES — Edge Function: alertar-cursos  v3
// Invocada diariamente por pg_cron a las 08:00 CST (14:00 UTC)
// Envia mensaje WhatsApp via CallMeBot a los numeros registrados
// en la tabla whatsapp_alertas cuando hay alertas de calendarios:
// cursos por vencer, vacaciones próximas y cursos programados.
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

interface VacationRow {
  nombre: string;
  num_empleado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales?: number;
  estado?: string;
  observaciones?: string | null;
}

interface AgendaCourseItem {
  session_id: string;
  curso: string;
  fecha: string;
  hora: string;
  modalidad: string;
  lugar: string;
  notas: string;
  recurrente: boolean;
  recurrencia: {
    tipo?: string;
    meses?: number;
    dias?: number;
    etiqueta?: string;
  } | null;
  asistentes: Array<{ num: string; nombre: string }>;
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

function recurrenceLabel(item: { recurrente?: boolean; recurrencia?: AgendaCourseItem['recurrencia'] }): string {
  if (!item?.recurrente) return '';
  const rec = item.recurrencia || null;
  if (!rec) return 'Recurrente';
  if (rec.etiqueta) return rec.etiqueta;
  const tipo = String(rec.tipo || '').toLowerCase();
  const preset: Record<string, string> = {
    semestral: 'Semestral',
    bimestral: 'Bimestral',
    anual: 'Anual',
  };
  if (preset[tipo]) return preset[tipo];
  const parts: string[] = [];
  if (Number(rec.meses) > 0) parts.push(`${rec.meses} mes${Number(rec.meses) === 1 ? '' : 'es'}`);
  if (Number(rec.dias) > 0) parts.push(`${rec.dias} día${Number(rec.dias) === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' y ') : 'Recurrente';
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtLongDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function safeIsoDate(value: string): Date | null {
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildVacationAlerts(rows: Array<{ num_empleado: string; nombre: string; vacaciones?: unknown }>, today: Date, limit: Date): VacationRow[] {
  const result: VacationRow[] = [];
  for (const row of rows) {
    const vacs = Array.isArray(row.vacaciones) ? row.vacaciones as Array<Record<string, unknown>> : [];
    for (const vac of vacs) {
      const estado = String(vac.estado || 'programado').toLowerCase();
      if (estado === 'cancelado') continue;
      const ini = String(vac.fecha_inicio || '').slice(0, 10);
      const fin = String(vac.fecha_fin || '').slice(0, 10);
      if (!/^(\d{4}-\d{2}-\d{2})$/.test(ini) || !/^(\d{4}-\d{2}-\d{2})$/.test(fin)) continue;
      const dIni = safeIsoDate(ini);
      const dFin = safeIsoDate(fin);
      if (!dIni || !dFin) continue;
      if (dIni > limit || dFin < today) continue;
      result.push({
        nombre: row.nombre,
        num_empleado: row.num_empleado,
        fecha_inicio: ini,
        fecha_fin: fin,
        dias_totales: Number(vac.dias_totales || 0) || undefined,
        estado,
        observaciones: typeof vac.observaciones === 'string' ? vac.observaciones : null,
      });
    }
  }

  return result.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.nombre.localeCompare(b.nombre));
}

function buildAgendaAlerts(rows: Array<{ num_empleado: string; nombre: string; cursos_programados?: unknown }>, today: Date, limit: Date): AgendaCourseItem[] {
  const map = new Map<string, AgendaCourseItem>();

  for (const row of rows) {
    const events = Array.isArray(row.cursos_programados) ? row.cursos_programados as Array<Record<string, unknown>> : [];
    for (const ev of events) {
      const fecha = String(ev.fecha || '').slice(0, 10);
      const d = safeIsoDate(fecha);
      if (!d || d < today || d > limit) continue;
      const key = String(ev.session_id || `${fecha}|${ev.hora || ''}|${ev.curso || ''}|${ev.modalidad || ''}|${ev.lugar || ''}`);
      if (!map.has(key)) {
        map.set(key, {
          session_id: String(ev.session_id || key),
          curso: String(ev.curso || '').trim(),
          fecha,
          hora: String(ev.hora || '').slice(0, 5),
          modalidad: String(ev.modalidad || '').trim(),
          lugar: String(ev.lugar || '').trim(),
          notas: String(ev.notas || '').trim(),
          recurrente: !!ev.recurrente,
          recurrencia: ev.recurrencia && typeof ev.recurrencia === 'object' ? {
            tipo: String((ev.recurrencia as Record<string, unknown>).tipo || '').trim(),
            meses: Number((ev.recurrencia as Record<string, unknown>).meses || 0),
            dias: Number((ev.recurrencia as Record<string, unknown>).dias || 0),
            etiqueta: String((ev.recurrencia as Record<string, unknown>).etiqueta || '').trim(),
          } : null,
          asistentes: [],
        });
      }
      map.get(key)!.asistentes.push({ num: row.num_empleado, nombre: row.nombre });
    }
  }

  return [...map.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora) || a.curso.localeCompare(b.curso));
}

function buildCombinedText(params: {
  dateStr: string;
  cursosPorVencer: AlertRow[];
  vacaciones: VacationRow[];
  agendaCursos: AgendaCourseItem[];
}): string {
  const { dateStr, cursosPorVencer, vacaciones, agendaCursos } = params;
  const sections: string[] = [];

  if (cursosPorVencer.length) {
    const expired = cursosPorVencer.filter(r => r.diff < 0);
    const soon = cursosPorVencer.filter(r => r.diff >= 0);
    const lines: string[] = [];
    if (expired.length) {
      lines.push(`🔴 VENCIDOS (${expired.length}):`);
      for (const r of expired.slice(0, 8)) {
        lines.push(`• ${r.nombre} — ${r.curso} (${r.freq}) — ${fmtLongDate(r.nextDue)}`);
      }
      if (expired.length > 8) lines.push(`• +${expired.length - 8} más`);
    }
    if (soon.length) {
      lines.push(`🟡 Próximos ${WARN_DAYS} días (${soon.length}):`);
      for (const r of soon.slice(0, 8)) {
        lines.push(`• ${r.nombre} — ${r.curso} — ${fmtLongDate(r.nextDue)} (${r.diff} días)`);
      }
      if (soon.length > 8) lines.push(`• +${soon.length - 8} más`);
    }
    sections.push(`📚 *Cursos por vencer*\n${lines.join('\n')}`);
  }

  if (vacaciones.length) {
    const lines = vacaciones.slice(0, 10).map(v => {
      const ini = safeIsoDate(v.fecha_inicio);
      const fin = safeIsoDate(v.fecha_fin);
      const diff = ini ? diffDays(ini, new Date(todayStart())) : 0;
      const state = diff < 0 && fin && fin >= new Date(todayStart()) ? 'en curso' : diff === 0 ? 'hoy' : `en ${diff} días`;
      return `• ${v.nombre} — ${fmtShortDate(ini || new Date(v.fecha_inicio))} a ${fmtShortDate(fin || new Date(v.fecha_fin))} — ${state}`;
    });
    if (vacaciones.length > 10) lines.push(`• +${vacaciones.length - 10} más`);
    sections.push(`🏖️ *Vacaciones próximas*\n${lines.join('\n')}`);
  }

  if (agendaCursos.length) {
    const lines = agendaCursos.slice(0, 10).map(a => {
      const label = recurrenceLabel(a);
      const asistentes = a.asistentes.length;
      const recurrente = a.recurrente ? ` · ${label}` : '';
      return `• ${a.curso} — ${fmtShortDate(safeIsoDate(a.fecha) || new Date(`${a.fecha}T00:00:00`))} ${a.hora ? `(${a.hora})` : ''} — ${asistentes} asistente(s)${recurrente}`;
    });
    if (agendaCursos.length > 10) lines.push(`• +${agendaCursos.length - 10} más`);
    sections.push(`🗓️ *Cursos programados*\n${lines.join('\n')}`);
  }

  return `⚠️ *AIFA — Alertas de calendarios (${dateStr})*\n\n${sections.join('\n\n')}\n\nFavor de revisar el seguimiento con el personal correspondiente.\n\n_AIFA Operaciones — Sistema de Calendarios_`;
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtCourseDueText(rows: AlertRow[], dateStr: string): string {
  const expired = rows.filter(r => r.diff < 0);
  const soon    = rows.filter(r => r.diff >= 0);
  const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let msg = `⚠️ AIFA — Cursos por vencer (${dateStr})\n`;
  if (expired.length) {
    msg += `\n🔴 VENCIDOS (${expired.length}):\n`;
    for (const r of expired) msg += `• ${r.nombre} — ${r.curso} (${r.freq}) — ${fmtDate(r.nextDue)}\n`;
  }
  if (soon.length) {
    msg += `\n🟡 Próximos ${WARN_DAYS} días (${soon.length}):\n`;
    for (const r of soon) msg += `• ${r.nombre} — ${r.curso} — ${fmtDate(r.nextDue)} (${r.diff} días)\n`;
  }
  msg += `\nTotal: ${rows.length} curso${rows.length !== 1 ? 's' : ''} requieren atención.`;
  return msg;
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

    // 1b. Cargar agenda completa de colaboradores para vacaciones y cursos programados
    const { data: agendaRows, error: aErr } = await sb
      .from('agenda_2026')
      .select('num_empleado, nombre, vacaciones, cursos_programados');
    if (aErr) throw aErr;

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

    // 3. Nombres de colaboradores
    const nums = [...new Set(alertas.map(a => a.num_empleado))];
    const nombreMap: Record<string, string> = {};
    if (nums.length) {
      const { data: dirRows } = await sb
        .from('agenda_2026')
        .select('num_empleado, nombre')
        .in('num_empleado', nums);
      (dirRows ?? []).forEach((r: { num_empleado: string; nombre: string }) => {
        nombreMap[String(r.num_empleado)] = r.nombre ?? r.num_empleado;
      });
    }

    const rows: AlertRow[] = alertas.map(a => ({
      nombre:  nombreMap[String(a.num_empleado)] ?? a.num_empleado,
      curso:   a.curso,
      nextDue: a.nextDue,
      diff:    a.diff,
      freq:    a.freq,
    }));

    const vacations = buildVacationAlerts((agendaRows ?? []).map((r: { num_empleado: string; nombre: string; vacaciones?: unknown }) => ({
      num_empleado: String(r.num_empleado),
      nombre: String(r.nombre ?? r.num_empleado),
      vacaciones: r.vacaciones,
    })), today, limit);

    const agendaCursos = buildAgendaAlerts((agendaRows ?? []).map((r: { num_empleado: string; nombre: string; cursos_programados?: unknown }) => ({
      num_empleado: String(r.num_empleado),
      nombre: String(r.nombre ?? r.num_empleado),
      cursos_programados: r.cursos_programados,
    })), today, limit);

    const hasAny = rows.length || vacations.length || agendaCursos.length;
    if (!hasAny) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, alertas: 0, msg: 'Sin alertas de calendarios para enviar hoy' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

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
    const text    = buildCombinedText({
      dateStr,
      cursosPorVencer: rows,
      vacaciones,
      agendaCursos,
    });
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
    console.log(`[alertar-cursos] Completado: ${sent}/${destinos.length} enviados, cursos=${rows.length}, vacaciones=${vacations.length}, agenda=${agendaCursos.length}`);

    return new Response(JSON.stringify({
      ok:      true,
      alertas: rows.length + vacations.length + agendaCursos.length,
      cursos: rows.length,
      vacaciones: vacations.length,
      agenda: agendaCursos.length,
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