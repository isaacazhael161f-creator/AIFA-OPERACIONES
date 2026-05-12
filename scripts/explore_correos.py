import openpyxl, sys
BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

for fname in ["Correos de entrada.xlsx", "Correos elementos enviados.xlsx"]:
    print(f"\n=== {fname} ===")
    wb = openpyxl.load_workbook(f"{BASE}/{fname}", read_only=True)
    ws = wb.active
    rows = list(ws.rows)
    headers = [cell.value for cell in rows[0]]
    print("Columnas:", headers)
    print(f"Total filas (sin header): {len(rows)-1}")
    print("\nFila 2:")
    for i, cell in enumerate(rows[1]):
        if i < len(headers):
            print(f"  [{i}] {headers[i]!r}: {str(cell.value)[:120]!r}")
    if len(rows) > 2:
        print("\nFila 3:")
        for i, cell in enumerate(rows[2]):
            if i < len(headers):
                print(f"  [{i}] {headers[i]!r}: {str(cell.value)[:120]!r}")
    wb.close()
