import openpyxl
from datetime import datetime, date, time

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== Buscando filas con fechas en CORREOS DE ENTRADA ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]

# Find rows where Recibido is a time (= main email rows) and count
email_rows = []
date_header_rows = []

for i, row in enumerate(rows[1:], start=2):
    vals = {headers[j]: row[j].value for j in range(len(headers)) if j < len(row)}
    recibido = vals.get('Recibido')
    asunto = vals.get('Asunto')
    de = vals.get('De')
    
    if isinstance(recibido, time):
        email_rows.append((i, de, asunto, recibido))
    # Look for rows that might be date headers (only De has value, looks like a date)
    elif de and asunto is None and not str(de).strip().startswith(' ') and len(str(de).strip()) < 40:
        de_str = str(de).strip()
        # check if it looks like a date
        import re
        if re.search(r'\d{1,2}[/ -]\d{1,2}[/ -]\d{2,4}|\d{4}[/ -]\d{2}[/ -]\d{2}|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|jun|jul|ago|sep|oct|nov|dic)\b', de_str, re.IGNORECASE):
            date_header_rows.append((i, de_str))

print(f"Total emails (filas con Recibido=time): {len(email_rows)}")
print("\nPrimeros 15 emails:")
for r in email_rows[:15]:
    print(f"  Row {r[0]}: De={str(r[1])[:50]!r}  Asunto={str(r[2])[:60]!r}  Hora={r[3]}")

print(f"\nTotal posibles filas de fecha: {len(date_header_rows)}")
print("Primeras 20 posibles fechas:")
for r in date_header_rows[:20]:
    print(f"  Row {r[0]}: {r[1]!r}")

wb.close()
