"""
Análisis de correos AIFA - Bandeja de entrada y Elementos enviados
Genera un reporte HTML interactivo con Chart.js
"""

import openpyxl
from datetime import datetime, date, time, timedelta
from collections import defaultdict, Counter
import re
import os
import json

BASE   = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"
OUTPUT = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel\analisis_correos.html"

TODAY = date(2026, 5, 11)   # fecha actual al momento del análisis

# ─────────────────────────────────────────────
# Mapeo día-nombre → offset respecto a hoy (lunes 11 mayo)
# ─────────────────────────────────────────────
DAY_OFFSET = {
    'lunes':  0, 'martes': -1, 'miércoles': -2, 'miercoles': -2,
    'jueves': -3, 'viernes': -4, 'sábado': -5, 'sabado': -5, 'domingo': -6
}

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def parse_date(val) -> date | None:
    """
    Recibe el valor crudo de la celda Recibido/Enviado el y retorna date.
    Soporta:
      - datetime → .date()
      - time     → TODAY
      - str "domingo 9:44 p. m." → TODAY + offset
      - str "sábado 09/05"       → date(2026, 5, 9)
    """
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, time):
        return TODAY
    if isinstance(val, str):
        s = val.strip().lower()
        # Formato "día dd/mm" → extrae fecha directa
        m = re.match(r'(\w+)\s+(\d{2})/(\d{2})', s)
        if m:
            try:
                return date(TODAY.year, int(m.group(3)), int(m.group(2)))
            except ValueError:
                pass
        # Formato "día HH:MM a./p. m." → usa el offset del día
        m2 = re.match(r'(\w+)\s+\d', s)
        if m2:
            dname = m2.group(1)
            offset = DAY_OFFSET.get(dname)
            if offset is not None:
                return TODAY + timedelta(days=offset)
    return None


def parse_datetime(val) -> datetime | None:
    """Igual que parse_date pero retorna datetime (con hora si disponible)."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, time):
        return datetime.combine(TODAY, val)
    if isinstance(val, str):
        s = val.strip().lower()
        # "día dd/mm" → solo fecha, medianoche
        m = re.match(r'(\w+)\s+(\d{2})/(\d{2})', s)
        if m:
            try:
                d = date(TODAY.year, int(m.group(3)), int(m.group(2)))
                return datetime.combine(d, time(0, 0))
            except ValueError:
                pass
        # "día H:MM a./p. m."
        m2 = re.match(r'(\w+)\s+(\d{1,2}):(\d{2})\s*(a\.|p\.)', s)
        if m2:
            dname = m2.group(1)
            offset = DAY_OFFSET.get(dname)
            if offset is None:
                return None
            h, mn = int(m2.group(2)), int(m2.group(3))
            if 'p.' in s and h != 12:
                h += 12
            elif 'a.' in s and h == 12:
                h = 0
            d = TODAY + timedelta(days=offset)
            return datetime.combine(d, time(h, mn))
    return None


def normalize_subject(s: str) -> str:
    """Elimina prefijos Re:, RV:, FW:, RE:, Fw: etc. y normaliza."""
    if not s:
        return ''
    s = re.sub(r'^(re:|rv:|fw:|fwd:|reenviado:|fw\s*:)\s*', '', s.strip(), flags=re.IGNORECASE)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s


# Palabras clave para categorización de solicitudes de slot
SLOT_PATTERNS = {
    'Alta':           re.compile(r'\b(alta de slot|alta\s+slot|asignaci[oó]n|solicitud de slot|solicitud slot|asignar slot|nuevo slot|alta vuelo)\b', re.IGNORECASE),
    'Modificación':   re.compile(r'\b(modificaci[oó]n|modif[. ]|ajuste|ajustes de slot|ajustes slot|scr|cambio de slot|cambio slot|reprogramaci[oó]n)\b', re.IGNORECASE),
    'Cancelación':    re.compile(r'\b(cancelaci[oó]n|cancelacion|baja de slot|baja slot|cancelar|supresi[oó]n)\b', re.IGNORECASE),
    'Demora':         re.compile(r'\b(demora|delay|retraso|atraso)\b', re.IGNORECASE),
}


def classify_subject(subject: str) -> str | None:
    """Retorna la categoría del asunto o None si no es solicitud de slot."""
    if not subject:
        return None
    for cat, pat in SLOT_PATTERNS.items():
        if pat.search(subject):
            return cat
    return None


def is_response(subject: str) -> bool:
    """True si el asunto lleva prefijo de respuesta (Re: / RV:)."""
    return bool(re.match(r'^(re:|rv:|fw:|fwd:)', subject.strip(), re.IGNORECASE))


# ─────────────────────────────────────────────
# Lectura de archivos
# ─────────────────────────────────────────────
def load_received() -> list[dict]:
    wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.rows)
    headers = [cell.value for cell in rows[0]]
    tamano_idx   = headers.index('Tamaño')
    recibido_idx = headers.index('Recibido')
    asunto_idx   = headers.index('Asunto')
    de_idx       = headers.index('De')
    para_idx     = headers.index('Para')

    emails = []
    for row in rows[1:]:
        tamano = row[tamano_idx].value if tamano_idx < len(row) else None
        if not (tamano and isinstance(tamano, str) and ('KB' in tamano or 'MB' in tamano)):
            continue
        recibido_raw = row[recibido_idx].value if recibido_idx < len(row) else None
        d = parse_date(recibido_raw)
        dt = parse_datetime(recibido_raw)
        asunto = row[asunto_idx].value or ''
        de     = row[de_idx].value or ''
        para   = row[para_idx].value or ''
        if d:
            emails.append({
                'date':     d,
                'datetime': dt,
                'asunto':   str(asunto),
                'de':       str(de),
                'para':     str(para),
                'tipo':     'recibido',
            })
    wb.close()
    return emails


def load_sent() -> list[dict]:
    wb = openpyxl.load_workbook(f"{BASE}/Correos elementos enviados.xlsx", read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.rows)
    headers = [cell.value for cell in rows[0]]
    tamano_idx  = headers.index('Tamaño')
    enviado_idx = headers.index('Enviado el')
    asunto_idx  = headers.index('Asunto')
    para_idx    = headers.index('Para')

    emails = []
    for row in rows[1:]:
        tamano = row[tamano_idx].value if tamano_idx < len(row) else None
        # All sent rows seem valid but still filter
        enviado_raw = row[enviado_idx].value if enviado_idx < len(row) else None
        d  = parse_date(enviado_raw)
        dt = parse_datetime(enviado_raw)
        asunto = row[asunto_idx].value or ''
        para   = row[para_idx].value or ''
        if d:
            emails.append({
                'date':     d,
                'datetime': dt,
                'asunto':   str(asunto),
                'para':     str(para),
                'tipo':     'enviado',
            })
    wb.close()
    return emails


# ─────────────────────────────────────────────
# Análisis
# ─────────────────────────────────────────────
print("Cargando datos...")
received = load_received()
sent     = load_sent()
print(f"  Recibidos válidos: {len(received)}")
print(f"  Enviados válidos:  {len(sent)}")

# 1. Correos por día
recv_by_day  = Counter(e['date'] for e in received)
sent_by_day  = Counter(e['date'] for e in sent)
all_dates    = sorted(set(recv_by_day) | set(sent_by_day))
dates_labels = [str(d) for d in all_dates]
recv_counts  = [recv_by_day.get(d, 0) for d in all_dates]
sent_counts  = [sent_by_day.get(d, 0) for d in all_dates]

# 2. Solicitudes de slot
slot_received = []
for e in received:
    cat = classify_subject(e['asunto'])
    if cat:
        slot_received.append({**e, 'categoria': cat})

slot_sent = []
for e in sent:
    cat = classify_subject(e['asunto'])
    if cat:
        slot_sent.append({**e, 'categoria': cat})

# Solicitudes por categoría
slot_cat_recv = Counter(e['categoria'] for e in slot_received)
slot_cat_sent = Counter(e['categoria'] for e in slot_sent)

# Solicitudes recibidas por día y categoría
slot_recv_by_day_cat = defaultdict(lambda: defaultdict(int))
for e in slot_received:
    slot_recv_by_day_cat[e['date']][e['categoria']] += 1

# 3. Tiempo de respuesta
# Agrupar enviados por asunto normalizado
sent_by_norm_subject = defaultdict(list)
for e in sent:
    norm = normalize_subject(e['asunto'])
    if norm:
        sent_by_norm_subject[norm].append(e)

response_times = []   # en horas (float) — solo donde tenemos datos confiables
response_days  = []   # en días enteros
response_detail = []

for e in received:
    norm = normalize_subject(e['asunto'])
    if not norm:
        continue
    # Only track slot-related emails for response time
    cat = classify_subject(e['asunto'])
    if not cat:
        continue
    candidates = sent_by_norm_subject.get(norm, [])
    if not candidates:
        continue
    # Buscar la respuesta enviada MÁS CERCANA (posterior) a la recepción
    best = None
    best_delta_h = None
    best_delta_d = None
    best_precision = None  # 'hour' or 'day'
    for s in candidates:
        if s['date'] < e['date']:
            continue
        has_time_recv = (e['datetime'] and e['datetime'].time() != time(0, 0))
        has_time_sent = (s['datetime'] and s['datetime'].time() != time(0, 0))
        if has_time_recv and has_time_sent:
            delta_h = (s['datetime'] - e['datetime']).total_seconds() / 3600
            if delta_h >= 0:
                if best_precision != 'hour' or delta_h < best_delta_h:
                    best_delta_h = delta_h
                    best_delta_d = None
                    best_precision = 'hour'
                    best = s
        else:
            delta_d = (s['date'] - e['date']).days
            if 0 <= delta_d <= 30:
                if best_precision is None or (best_precision == 'day' and delta_d < best_delta_d):
                    best_delta_d = delta_d
                    best_delta_h = None
                    best_precision = 'day'
                    best = s

    if best:
        response_detail.append({
            'asunto':     e['asunto'][:80],
            'recibido':   str(e['date']),
            'respondido': str(best['date']),
            'delta_h':    best_delta_h,
            'delta_d':    best_delta_d,
            'precision':  best_precision,
            'categoria':  cat,
        })

# Response time stats — separamos precisión horaria vs diaria
def stats_h(lst_h):
    """Stats para listas de horas (float)."""
    if not lst_h: return {}
    n = len(lst_h)
    avg = sum(lst_h) / n
    mn = min(lst_h)
    mx = max(lst_h)
    lst_s = sorted(lst_h)
    med = lst_s[n // 2] if n % 2 else (lst_s[n//2-1] + lst_s[n//2]) / 2
    same_day = sum(1 for x in lst_h if x <= 24)
    return {'n': n, 'avg': round(avg, 1), 'min': round(mn, 1), 'max': round(mx, 1),
            'median': round(med, 1), 'same_day_pct': round(same_day*100/n, 1)}

def stats_d(lst_d):
    """Stats para listas de días (int)."""
    if not lst_d: return {}
    n = len(lst_d)
    avg = sum(lst_d) / n
    mn = min(lst_d)
    mx = max(lst_d)
    lst_s = sorted(lst_d)
    med = lst_s[n // 2] if n % 2 else (lst_s[n//2-1] + lst_s[n//2]) / 2
    same_day = sum(1 for x in lst_d if x == 0)
    next_day  = sum(1 for x in lst_d if x == 1)
    late      = sum(1 for x in lst_d if x >= 2)
    return {'n': n, 'avg': round(avg, 2), 'min': mn, 'max': mx,
            'median': med, 'same_day': same_day,
            'next_day': next_day, 'late': late,
            'same_day_pct': round(same_day*100/n, 1)}

rt_hour_by_cat = defaultdict(list)
rt_day_by_cat  = defaultdict(list)
for r in response_detail:
    if r['precision'] == 'hour':
        rt_hour_by_cat[r['categoria']].append(r['delta_h'])
    else:
        rt_day_by_cat[r['categoria']].append(r['delta_d'])

all_hours = [r['delta_h'] for r in response_detail if r['precision'] == 'hour']
all_days  = [r['delta_d'] for r in response_detail if r['precision'] == 'day']

rt_hour_overall = stats_h(all_hours)
rt_day_overall  = stats_d(all_days)
rt_overall      = rt_hour_overall  # for KPI display
rt_by_cat_h = {cat: stats_h(h) for cat, h in rt_hour_by_cat.items()}
rt_by_cat_d = {cat: stats_d(d) for cat, d in rt_day_by_cat.items()}

# Resumen de solicitudes de slot recibidas por día (últimos 14 días)
last_14 = sorted(all_dates)[-14:]
cats_order = ['Alta', 'Modificación', 'Cancelación', 'Demora']
slot_daily_data = {cat: [slot_recv_by_day_cat[d].get(cat, 0) for d in last_14] for cat in cats_order}

print(f"\nSlot solicitudes recibidas totales: {len(slot_received)}")
print(f"Por categoría: {dict(slot_cat_recv)}")
print(f"\nRespuestas vinculadas: {len(response_detail)}")
print(f"  Con precisión horaria: {len(all_hours)}")
print(f"  Con precisión diaria:  {len(all_days)}")
if rt_hour_overall:
    print(f"  Tiempo prom. respuesta (horario): {rt_hour_overall['avg']} h  |  % ≤24h: {rt_hour_overall['same_day_pct']}%")
if rt_day_overall:
    print(f"  Tiempo prom. respuesta (días):    {rt_day_overall['avg']} días  |  mismo día: {rt_day_overall['same_day_pct']}%")


# ─────────────────────────────────────────────
# Generar HTML
# ─────────────────────────────────────────────
def j(x):
    return json.dumps(x, ensure_ascii=False)

html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Análisis de Correos — AIFA Operaciones</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; color: #222; }}
  header {{ background: #003366; color: #fff; padding: 18px 32px; display: flex; align-items: center; gap: 16px; }}
  header h1 {{ font-size: 1.4rem; font-weight: 700; }}
  header .sub {{ font-size: 0.85rem; opacity: 0.75; }}
  .badge {{ background: #00aaff; color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }}
  main {{ max-width: 1400px; margin: 0 auto; padding: 24px 20px; }}
  .kpi-row {{ display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }}
  .kpi {{ background: #fff; border-radius: 10px; padding: 18px 24px; flex: 1 1 160px;
          box-shadow: 0 2px 8px #0001; border-left: 5px solid #003366; }}
  .kpi .label {{ font-size: 0.78rem; color: #666; text-transform: uppercase; letter-spacing: .04em; }}
  .kpi .value {{ font-size: 2rem; font-weight: 700; color: #003366; }}
  .kpi .sub {{ font-size: 0.78rem; color: #999; }}
  .section {{ background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px;
              box-shadow: 0 2px 10px #0001; }}
  .section h2 {{ font-size: 1.1rem; font-weight: 700; color: #003366; margin-bottom: 4px; }}
  .section .desc {{ font-size: 0.82rem; color: #888; margin-bottom: 16px; }}
  .chart-wrap {{ position: relative; height: 320px; }}
  .chart-wrap-sm {{ position: relative; height: 240px; }}
  .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
  @media(max-width:700px) {{ .grid2 {{ grid-template-columns: 1fr; }} }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ background: #003366; color: #fff; padding: 8px 10px; text-align: left; }}
  tr:nth-child(even) {{ background: #f5f7fa; }}
  td {{ padding: 7px 10px; border-bottom: 1px solid #eee; }}
  .tag {{ display: inline-block; border-radius: 12px; padding: 1px 10px; font-size: 0.75rem; font-weight: 600; }}
  .tag-Alta        {{ background: #d0f0ff; color: #0077b6; }}
  .tag-Modificación {{ background: #fff3cd; color: #9c6800; }}
  .tag-Cancelación  {{ background: #fde; color: #c0392b; }}
  .tag-Demora       {{ background: #e8d5f5; color: #6b2fa0; }}
  .tag-Otro         {{ background: #eee; color: #555; }}
  .rt-table td:nth-child(n+2) {{ text-align: center; }}
  .good {{ color: #27ae60; font-weight: 600; }}
  .warn {{ color: #e67e22; font-weight: 600; }}
  .bad  {{ color: #e74c3c; font-weight: 600; }}
  .footer {{ text-align: center; font-size: 0.78rem; color: #aaa; padding: 20px 0 40px; }}
</style>
</head>
<body>
<header>
  <div>
    <div style="font-size:1.6rem;font-weight:800;letter-spacing:.05em;">AIFA</div>
    <div class="sub">Aeropuerto Internacional Felipe Ángeles</div>
  </div>
  <div style="flex:1">
    <h1>Análisis de Correos Electrónicos — Coordinación de Slots</h1>
    <div class="sub">Período: {str(min(all_dates))} → {str(max(all_dates))} &nbsp;·&nbsp;
    Generado: {TODAY.strftime('%d/%m/%Y')}</div>
  </div>
  <span class="badge">Bandeja de entrada + Elementos enviados</span>
</header>
<main>

<!-- KPI Row -->
<div class="kpi-row">
  <div class="kpi">
    <div class="label">Total recibidos</div>
    <div class="value">{len(received):,}</div>
    <div class="sub">Correos de entrada</div>
  </div>
  <div class="kpi">
    <div class="label">Total enviados</div>
    <div class="value">{len(sent):,}</div>
    <div class="sub">Elementos enviados</div>
  </div>
  <div class="kpi" style="border-left-color:#e74c3c">
    <div class="label">Solicitudes de slot recibidas</div>
    <div class="value">{len(slot_received):,}</div>
    <div class="sub">Alta · Modificación · Cancelación · Demora</div>
  </div>
  <div class="kpi" style="border-left-color:#27ae60">
    <div class="label">Respuestas de slot enviadas</div>
    <div class="value">{len(slot_sent):,}</div>
    <div class="sub">Correos respondidos / gestionados</div>
  </div>
  <div class="kpi" style="border-left-color:#9b59b6">
    <div class="label">Tiempo prom. respuesta</div>
    <div class="value">{rt_hour_overall.get('avg', '—')} {'h' if rt_hour_overall else ''}</div>
    <div class="sub">{rt_hour_overall.get('n', 0)} pares con hora exacta</div>
  </div>
  <div class="kpi" style="border-left-color:#f39c12">
    <div class="label">Mismo día (precisión día)</div>
    <div class="value">{rt_day_overall.get('same_day_pct', '—')}{'%' if rt_day_overall else ''}</div>
    <div class="sub">{rt_day_overall.get('n', 0)} pares con precisión de día</div>
  </div>
</div>

<!-- 1. Correos por día -->
<div class="section">
  <h2>📅 Correos por día</h2>
  <div class="desc">Volumen diario de correos recibidos y enviados desde el {str(min(all_dates))} hasta el {str(max(all_dates))}.</div>
  <div class="chart-wrap">
    <canvas id="chartDaily"></canvas>
  </div>
</div>

<!-- 2. Solicitudes de slot por categoría -->
<div class="grid2">
  <div class="section">
    <h2>📊 Solicitudes de slot — Distribución por tipo</h2>
    <div class="desc">Total de solicitudes recibidas clasificadas por categoría.</div>
    <div class="chart-wrap-sm">
      <canvas id="chartPie"></canvas>
    </div>
  </div>
  <div class="section">
    <h2>📈 Solicitudes recibidas vs. respondidas</h2>
    <div class="desc">Comparativa por categoría de solicitud de slot.</div>
    <div class="chart-wrap-sm">
      <canvas id="chartCatBar"></canvas>
    </div>
  </div>
</div>

<!-- 3. Solicitudes por día (últimos 14 días) -->
<div class="section">
  <h2>📆 Solicitudes de slot por día — últimos 14 días</h2>
  <div class="desc">Desglose diario de solicitudes recibidas por tipo en las últimas dos semanas.</div>
  <div class="chart-wrap">
    <canvas id="chartSlotDaily"></canvas>
  </div>
</div>

<!-- 4. Tiempo de respuesta -->
<div class="section">
  <h2>⏱ Tiempo de respuesta por categoría</h2>
  <div class="desc">
    Se vincularon correos recibidos de slot con sus respuestas por asunto normalizado.
    <strong>Tabla A</strong>: pares con hora exacta (correos recientes con hora disponible).
    <strong>Tabla B</strong>: pares con precisión de día (correos más antiguos donde solo se guardó la fecha).
  </div>
"""

html += f"""
  <p style="font-weight:600;margin:12px 0 6px;color:#003366">Tabla A — Precisión horaria ({len(all_hours)} pares)</p>
  <table class="rt-table">
    <thead>
      <tr><th>Categoría</th><th>N</th><th>Promedio</th><th>Mediana</th><th>Mínimo</th><th>Máximo</th><th>% ≤ 24 h</th></tr>
    </thead>
    <tbody>
"""

for cat in cats_order:
    s = rt_by_cat_h.get(cat)
    if not s:
        continue
    pct = s['same_day_pct']
    cls = 'good' if pct >= 80 else ('warn' if pct >= 50 else 'bad')
    html += f"""      <tr>
        <td><span class="tag tag-{cat}">{cat}</span></td>
        <td>{s['n']}</td>
        <td>{s['avg']} h</td>
        <td>{s['median']} h</td>
        <td>{s['min']} h</td>
        <td>{s['max']} h</td>
        <td class="{cls}">{s['same_day_pct']}%</td>
      </tr>
"""

html += f"""    </tbody>
  </table>

  <p style="font-weight:600;margin:18px 0 6px;color:#003366">Tabla B — Precisión de día ({len(all_days)} pares)</p>
  <table class="rt-table">
    <thead>
      <tr><th>Categoría</th><th>N</th><th>Prom. días</th><th>Mismo día</th><th>Día siguiente</th><th>2+ días</th><th>% mismo día</th></tr>
    </thead>
    <tbody>
"""

for cat in cats_order:
    s = rt_by_cat_d.get(cat)
    if not s:
        continue
    pct = s['same_day_pct']
    cls = 'good' if pct >= 70 else ('warn' if pct >= 40 else 'bad')
    html += f"""      <tr>
        <td><span class="tag tag-{cat}">{cat}</span></td>
        <td>{s['n']}</td>
        <td>{s['avg']} días</td>
        <td>{s['same_day']}</td>
        <td>{s['next_day']}</td>
        <td>{s['late']}</td>
        <td class="{cls}">{s['same_day_pct']}%</td>
      </tr>
"""

html += """    </tbody>
  </table>
</div>

<!-- 5. Detalle solicitudes recibidas -->
<div class="section">
  <h2>📋 Detalle de solicitudes de slot recibidas</h2>
  <div class="desc">Listado de los últimos 150 correos clasificados como solicitudes de slot. Ordenados del más reciente al más antiguo.</div>
  <div style="overflow-x:auto">
  <table>
    <thead>
      <tr><th>Fecha</th><th>Tipo</th><th>Remitente</th><th>Asunto</th></tr>
    </thead>
    <tbody>
"""

for e in sorted(slot_received, key=lambda x: x['date'], reverse=True)[:150]:
    cat = e['categoria']
    html += f"""      <tr>
        <td>{e['date']}</td>
        <td><span class="tag tag-{cat}">{cat}</span></td>
        <td>{str(e['de'])[:40]}</td>
        <td>{str(e['asunto'])[:90]}</td>
      </tr>
"""

html += """    </tbody>
  </table>
  </div>
</div>

<!-- 6. Top remitentes -->
<div class="grid2">
  <div class="section">
    <h2>👥 Top 15 remitentes (recibidos)</h2>
    <div class="desc">Los emisores que más correos enviaron a la coordinación.</div>
    <table>
      <thead><tr><th>#</th><th>Remitente</th><th>Correos</th></tr></thead>
      <tbody>
"""
top_senders = Counter(e['de'] for e in received if e['de'] and str(e['de']).strip()).most_common(15)
for i, (sender, cnt) in enumerate(top_senders, 1):
    html += f"      <tr><td>{i}</td><td>{str(sender)[:50]}</td><td><b>{cnt}</b></td></tr>\n"

html += """      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>📬 Top 15 asuntos más frecuentes (recibidos)</h2>
    <div class="desc">Asuntos normalizados más recurrentes en la bandeja de entrada.</div>
    <table>
      <thead><tr><th>#</th><th>Asunto</th><th>N</th></tr></thead>
      <tbody>
"""
top_subjects = Counter(normalize_subject(e['asunto']) for e in received if e['asunto']).most_common(15)
for i, (subj, cnt) in enumerate(top_subjects, 1):
    html += f"      <tr><td>{i}</td><td>{str(subj)[:70]}</td><td><b>{cnt}</b></td></tr>\n"

html += """      </tbody>
    </table>
  </div>
</div>

"""

# ─── JavaScript / Charts ─────────────────────
html += f"""
<div class="footer">Análisis generado automáticamente · AIFA Operaciones · {TODAY.strftime('%d/%m/%Y')}</div>
</main>

<script>
// ── Utilidades ──────────────────────────────────────────────
function makeGradient(ctx, color) {{
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, color + 'cc');
  g.addColorStop(1, color + '11');
  return g;
}}

// ── 1. Correos por día ──────────────────────────────────────
(function() {{
  const labels = {j(dates_labels)};
  const recv   = {j(recv_counts)};
  const sent   = {j(sent_counts)};
  const ctx    = document.getElementById('chartDaily').getContext('2d');
  new Chart(ctx, {{
    type: 'bar',
    data: {{
      labels,
      datasets: [
        {{
          label: 'Recibidos',
          data: recv,
          backgroundColor: 'rgba(0,51,102,0.7)',
          borderRadius: 2,
          order: 2
        }},
        {{
          label: 'Enviados',
          data: sent,
          backgroundColor: 'rgba(0,170,255,0.65)',
          borderRadius: 2,
          order: 2
        }},
        {{
          label: 'Total recibidos (línea)',
          data: recv,
          type: 'line',
          borderColor: '#003366',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          order: 1
        }}
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{
        legend: {{ position: 'top' }},
        tooltip: {{
          callbacks: {{
            footer: (items) => 'Total: ' + items.reduce((a,b)=>a+(b.dataset.type==='line'?0:b.raw),0)
          }}
        }}
      }},
      scales: {{
        x: {{ stacked: false, ticks: {{ maxTicksLimit: 30, maxRotation: 45 }} }},
        y: {{ beginAtZero: true }}
      }}
    }}
  }});
}})();

// ── 2. Pie — solicitudes por categoría ─────────────────────
(function() {{
  const catLabels = {j(cats_order)};
  const recv_vals = {j([slot_cat_recv.get(c, 0) for c in cats_order])};
  const ctx = document.getElementById('chartPie').getContext('2d');
  new Chart(ctx, {{
    type: 'doughnut',
    data: {{
      labels: catLabels,
      datasets: [{{
        data: recv_vals,
        backgroundColor: ['#0077b6','#f4a261','#e63946','#9b5de5'],
        borderWidth: 2,
        borderColor: '#fff'
      }}]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ position: 'right' }} }}
    }}
  }});
}})();

// ── 3. Bar — recibidas vs respondidas por categoría ─────────
(function() {{
  const catLabels = {j(cats_order)};
  const recv_vals = {j([slot_cat_recv.get(c, 0) for c in cats_order])};
  const sent_vals = {j([slot_cat_sent.get(c, 0) for c in cats_order])};
  const ctx = document.getElementById('chartCatBar').getContext('2d');
  new Chart(ctx, {{
    type: 'bar',
    data: {{
      labels: catLabels,
      datasets: [
        {{ label: 'Recibidas', data: recv_vals, backgroundColor: 'rgba(0,51,102,0.75)', borderRadius: 4 }},
        {{ label: 'Respondidas/Enviadas', data: sent_vals, backgroundColor: 'rgba(0,170,255,0.7)', borderRadius: 4 }}
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ position: 'top' }} }},
      scales: {{ y: {{ beginAtZero: true }} }}
    }}
  }});
}})();

// ── 4. Solicitudes por día (últimos 14 días) ────────────────
(function() {{
  const labels = {j([str(d) for d in last_14])};
  const cats   = {j(cats_order)};
  const colors = ['#0077b6','#f4a261','#e63946','#9b5de5'];
  const datasets = cats.map((cat, i) => ({{
    label: cat,
    data: {j({cat: slot_daily_data[cat] for cat in cats_order})}[cat],
    backgroundColor: colors[i],
    borderRadius: 3,
    stack: 'stack'
  }}));
  const ctx = document.getElementById('chartSlotDaily').getContext('2d');
  new Chart(ctx, {{
    type: 'bar',
    data: {{ labels, datasets }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ position: 'top' }} }},
      scales: {{
        x: {{ stacked: true, ticks: {{ maxRotation: 45 }} }},
        y: {{ stacked: true, beginAtZero: true }}
      }}
    }}
  }});
}})();
</script>
</body>
</html>
"""

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n✅ Reporte generado en: {OUTPUT}")
print(f"\nResumen:")
print(f"  Correos recibidos:        {len(received)}")
print(f"  Correos enviados:         {len(sent)}")
print(f"  Solicitudes slot:         {len(slot_received)}")
print(f"  Pares con respuesta:      {len(response_detail)}")
print(f"    - Precisión horaria:    {len(all_hours)}")
print(f"    - Precisión diaria:     {len(all_days)}")
print(f"  Período:                  {min(all_dates)} → {max(all_dates)}")
if rt_hour_overall:
    print(f"  Resp. promedio (hora):    {rt_hour_overall['avg']} h  |  % ≤24h: {rt_hour_overall['same_day_pct']}%")
if rt_day_overall:
    print(f"  Resp. promedio (día):     {rt_day_overall['avg']} días |  mismo día: {rt_day_overall['same_day_pct']}%")
