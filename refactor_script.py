
import re
import os

file_path = r'c:\Users\misaa\Documents\AIFA-OPERACIONES\AIFA-OPERACIONES-main\js\parte-ops-flights.js'

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split the content
split_marker = '/**\n * Logic for "Vuelos" tab (PDF Reader)'
parts = content.split(split_marker)

if len(parts) < 2:
    print('Error: Could not split file correctly using the marker.')
    # Try alternate split based on line content if exact string match fails due to whitespace
    # Line 869-870 seems to be the boundary
    idx = content.find('/**\n * Logic for "Vuelos" tab (PDF Reader)')
    if idx == -1:
        print('Error: Could not find split marker.')
        exit(1)
    first_part_raw = content[:idx]
    second_part_raw = content[idx:]
else:
    first_part_raw = parts[0]
    second_part_raw = split_marker + parts[1]

# Extract IIFE body from first part
# It starts with (function () { and ends with })();
match = re.search(r'^\s*\(function\s*\(\)\s*\{(.*)\}\)\(\);\s*$', first_part_raw, re.DOTALL)
if not match:
    # Try finding the last })();
    end_iife_idx = first_part_raw.rfind('})();')
    start_iife_idx = first_part_raw.find('(function () {')
    if start_iife_idx != -1 and end_iife_idx != -1:
        body = first_part_raw[start_iife_idx + 14 : end_iife_idx] # 14 is len('(function () {')
    else:
        print('Error: Could not find IIFE start/end in first part.')
        exit(1)
else:
    body = match.group(1)

# Function to handle getElementById replacements
def replace_get_element_by_id(match):
    id_name = match.group(1)
    exceptions = [
        'uploadOpsCsvModal', 
        'btn-save-ops-itinerary-csv', 
        'ops-itinerary-csv-file', 
        'operations-summary-date'
    ]
    if id_name in exceptions:
        return f"document.getElementById('{id_name}')"
    else:
        return f"document.getElementById('{id_name}' + suffix)"

# 1. document.getElementById('ID')
# Check for single quotes
body = re.sub(r"document\.getElementById\('([^']+)'\)", replace_get_element_by_id, body)
# Check for double quotes
body = re.sub(r'document\.getElementById\("([^"]+)"\)', replace_get_element_by_id, body)

# 2. window.opsFlights
body = body.replace('window.opsFlights', "window['opsFlights' + (suffix === '-admin' ? 'Admin' : '')]")

# 3. localStorage keys
body = re.sub(r"localStorage\.getItem\('dm-ops-csv-columns'\)", "localStorage.getItem('dm-ops-csv-columns' + suffix)", body)
body = re.sub(r"localStorage\.setItem\('dm-ops-csv-columns'", "localStorage.setItem('dm-ops-csv-columns' + suffix", body)

# 4. querySelector
body = body.replace("document.querySelectorAll('.col-toggle-csv')", "document.querySelectorAll('.col-toggle-csv' + suffix)")
body = body.replace("document.querySelector('#container-ops-flights-csv')", "document.querySelector('#container-ops-flights-csv' + suffix)")
body = body.replace("document.querySelector('#table-ops-flights-csv')", "document.querySelector('#table-ops-flights-csv' + suffix)")

# 5. tableId variable
body = body.replace("tableId = '#table-ops-flights-csv'", "tableId = '#table-ops-flights-csv' + suffix")

# 6. style.id
body = body.replace("style.id = 'csv-cols-style';", "style.id = 'csv-cols-style' + suffix;")
# Also handle the check: if (!document.getElementById('csv-cols-style')) which is handled by rule 1

# Reconstruct
new_content = f"""/**
 * Vuelos (Parte de Operaciones) - CSV import
 * Estructura: tabla ancha con encabezados del CSV del software de aeropuerto.
 */
function initCsvModule(suffix) {{
{body}
}}

initCsvModule('');
initCsvModule('-admin');

{second_part_raw}"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
