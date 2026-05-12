import openpyxl
from datetime import datetime, date

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

for fname in ["Correos de entrada.xlsx", "Correos elementos enviados.xlsx"]:
    print(f"\n=== {fname} ===")
    wb = openpyxl.load_workbook(f"{BASE}/{fname}", read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.rows)
    headers = [cell.value for cell in rows[0]]
    print("Columnas:", headers)
    print(f"Total filas (sin header): {len(rows)-1}")

    # Check types of date columns in first 10 data rows
    date_cols = [i for i, h in enumerate(headers) if h and ('recib' in h.lower() or 'envi' in h.lower())]
    print(f"Date-like columns indices: {date_cols}")
    
    print("\nPrimeras 10 filas - columnas de fecha:")
    for row in rows[1:11]:
        for ci in date_cols:
            cell = row[ci]
            print(f"  Col[{ci}] '{headers[ci]}' = {cell.value!r}  type={type(cell.value).__name__}  number_format={getattr(cell, 'number_format', '?')}")
    
    # Check if there's a date hidden in another column
    print("\nSample row 5 all cells:")
    for i, cell in enumerate(rows[5]):
        print(f"  [{i}] {headers[i] if i<len(headers) else '?'!r}: value={cell.value!r}  type={type(cell.value).__name__}")
    wb.close()
