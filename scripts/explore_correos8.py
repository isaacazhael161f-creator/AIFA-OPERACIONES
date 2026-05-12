import openpyxl
from datetime import datetime, date, time, timedelta
from collections import Counter
import re

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== CORREOS ENVIADOS - estructura ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos elementos enviados.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]
print("Headers:", headers)
print(f"Total filas (sin header): {len(rows)-1}")

tamano_idx = headers.index('Tamaño')
enviado_idx = headers.index('Enviado el')
asunto_idx = headers.index('Asunto')
para_idx = headers.index('Para')

email_rows = []
for i, row in enumerate(rows[1:], start=2):
    tamano = row[tamano_idx].value if tamano_idx < len(row) else None
    if tamano and isinstance(tamano, str) and ('KB' in tamano or 'MB' in tamano):
        enviado = row[enviado_idx].value if enviado_idx < len(row) else None
        asunto = row[asunto_idx].value if asunto_idx < len(row) else None
        para = row[para_idx].value if para_idx < len(row) else None
        email_rows.append({'row': i, 'para': para, 'asunto': asunto, 'enviado': enviado, 'tamano': tamano})

print(f"\nTotal emails con Tamaño KB/MB: {len(email_rows)}")
types = Counter(type(e['enviado']).__name__ for e in email_rows)
print("Tipos de Enviado el:", types)

str_enviados = [e['enviado'] for e in email_rows if isinstance(e['enviado'], str)]
print("\nUnique str Enviado el:", list(dict.fromkeys(str_enviados))[:30])

dt_enviados = [e['enviado'] for e in email_rows if isinstance(e['enviado'], datetime)]
print("\nSample datetime Enviado el:", dt_enviados[:10])

# Distribution by date
date_counts = Counter()
today = date(2026, 5, 11)
day_offsets = {'lunes': 0, 'martes': -1, 'miércoles': -2, 'miercoles': -2,
    'jueves': -3, 'viernes': -4, 'sábado': -5, 'sabado': -5, 'domingo': -6}

for e in email_rows:
    v = e['enviado']
    if isinstance(v, datetime):
        date_counts[v.date()] += 1
    elif isinstance(v, time):
        date_counts[today] += 1
    elif isinstance(v, str):
        m = re.match(r'^(\w+)', v.strip().lower())
        if m:
            dname = m.group(1)
            offset = day_offsets.get(dname)
            if offset is not None:
                date_counts[today + timedelta(days=offset)] += 1
            else:
                date_counts[date(1900, 1, 1)] += 1  # Unknown
        else:
            date_counts[date(1900, 1, 1)] += 1

print("\nDistribución de fechas en enviados:")
for d, c in sorted(date_counts.items()):
    print(f"  {d}: {c} emails")

wb.close()
