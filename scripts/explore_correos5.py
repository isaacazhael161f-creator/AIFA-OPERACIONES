import openpyxl
from datetime import datetime, date, time

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== Análisis detallado de filas 155-230 para entender estructura de fechas ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]

# Check unique types for Recibido column
recibido_types = {}
for i, row in enumerate(rows[1:], start=2):
    if len(row) > 2:
        v = row[2].value
        t = type(v).__name__
        recibido_types[t] = recibido_types.get(t, 0) + 1

print("Tipos en columna 'Recibido':", recibido_types)

# Check unique types for all columns
print("\nTipos por columna:")
col_types = [{} for _ in headers]
for row in rows[1:]:
    for j, cell in enumerate(row):
        if j < len(headers):
            t = type(cell.value).__name__
            col_types[j][t] = col_types[j].get(t, 0) + 1
for j, h in enumerate(headers):
    print(f"  [{j}] {h}: {col_types[j]}")

# Show rows 155-180
print("\n=== Rows 155-180 ===")
for i, row in enumerate(rows[154:180], start=155):
    vals = [(headers[j], str(row[j].value)[:60], type(row[j].value).__name__) for j in range(len(headers)) if j < len(row) and row[j].value is not None]
    if vals:
        print(f"Row {i}: {vals}")

wb.close()
