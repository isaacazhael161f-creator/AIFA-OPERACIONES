import openpyxl
from datetime import datetime, date, time, timedelta
from collections import Counter
import re

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== ANÁLISIS DE TIPOS Y FECHAS EN RECIBIDO ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]

# Collect all email main rows (where Recibido has a value)
emails = []
today = date(2026, 5, 11)

# Day name to offset mapping (today is Monday May 11)
day_offsets = {
    'lunes': 0, 'martes': -1, 'miércoles': -2, 'miercoles': -2,
    'jueves': -3, 'viernes': -4, 'sábado': -5, 'sabado': -5, 'domingo': -6
}

# Sample the datetime Recibidos
datetime_recibidos = []
str_recibidos = []
time_recibidos = []

for i, row in enumerate(rows[1:], start=2):
    recibido = row[2].value if len(row) > 2 else None
    asunto = row[1].value if len(row) > 1 else None
    de = row[0].value if len(row) > 0 else None
    
    if isinstance(recibido, datetime):
        datetime_recibidos.append(recibido)
    elif isinstance(recibido, time):
        time_recibidos.append((i, de, asunto, recibido))
    elif isinstance(recibido, str) and recibido.strip():
        str_recibidos.append(recibido.strip())

print(f"datetime: {len(datetime_recibidos)}")
print(f"time: {len(time_recibidos)}")
print(f"str: {len(str_recibidos)}")

print("\nSample datetime Recibidos (first 10):")
for d in datetime_recibidos[:10]:
    print(f"  {d}")

print("\nSample str Recibidos (first 20 unique):")
unique_str = list(dict.fromkeys(str_recibidos))[:20]
for s in unique_str:
    print(f"  {s!r}")

print("\nDistribución de fechas en datetime Recibidos:")
date_counts = Counter(d.date() for d in datetime_recibidos)
for d, c in sorted(date_counts.items()):
    print(f"  {d}: {c} emails")

wb.close()
