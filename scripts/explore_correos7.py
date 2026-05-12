import openpyxl
from datetime import datetime, date, time, timedelta
from collections import Counter
import re

BASE = r"c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\excel"

print("=== Verificando filtro por Tamaño ===")
wb = openpyxl.load_workbook(f"{BASE}/Correos de entrada.xlsx", read_only=True, data_only=True)
ws = wb.active
rows = list(ws.rows)
headers = [cell.value for cell in rows[0]]
print("Headers:", headers)

# Filter by Tamaño = contains KB or MB
tamano_idx = headers.index('Tamaño')
recibido_idx = headers.index('Recibido')
asunto_idx = headers.index('Asunto')
de_idx = headers.index('De')

email_rows = []
for i, row in enumerate(rows[1:], start=2):
    tamano = row[tamano_idx].value if tamano_idx < len(row) else None
    if tamano and isinstance(tamano, str) and ('KB' in tamano or 'MB' in tamano):
        recibido = row[recibido_idx].value if recibido_idx < len(row) else None
        asunto = row[asunto_idx].value if asunto_idx < len(row) else None
        de = row[de_idx].value if de_idx < len(row) else None
        email_rows.append({'row': i, 'de': de, 'asunto': asunto, 'recibido': recibido, 'tamano': tamano})

print(f"\nTotal emails con Tamaño KB/MB: {len(email_rows)}")

# Check Recibido types in these
types = Counter(type(e['recibido']).__name__ for e in email_rows)
print("Tipos de Recibido en emails:", types)

print("\nSample - primeros 20 emails:")
for e in email_rows[:20]:
    print(f"  Row {e['row']}: recibido={e['recibido']!r}  asunto={str(e['asunto'])[:60]!r}")

print("\nSample - emails con str Recibido (primeros 20):")
str_emails = [e for e in email_rows if isinstance(e['recibido'], str)]
print(f"Total str: {len(str_emails)}")
for e in str_emails[:20]:
    print(f"  recibido={e['recibido']!r}  asunto={str(e['asunto'])[:60]!r}")

wb.close()
