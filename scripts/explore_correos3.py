import openpyxl
from datetime import datetime, date

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== CORREOS DE ENTRADA - primeras 40 filas ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]

for i, row in enumerate(rows[1:41], start=2):
    vals = [str(cell.value)[:60] if cell.value is not None else '' for cell in row]
    # Show only non-empty rows in summary form
    nonempty = [(headers[j], vals[j]) for j in range(len(vals)) if vals[j]]
    if nonempty:
        print(f"Row {i}: {nonempty}")
    else:
        print(f"Row {i}: [EMPTY]")
wb.close()
