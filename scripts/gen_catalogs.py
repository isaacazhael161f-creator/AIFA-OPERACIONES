import csv
import os

# Get the directory of this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Root of the project (parent of scripts/)
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

files = {
    'airlines': os.path.join(PROJECT_ROOT, 'data', 'master', 'airlines.csv'),
    'airports': os.path.join(PROJECT_ROOT, 'data', 'master', 'airports.csv')
}
output_path = os.path.join(PROJECT_ROOT, 'db', 'populate_full_catalogs.sql')


def clean(text):
    if not text: return ''
    return text.replace("'", "''").strip()

sql_lines = []
sql_lines.append("-- Script generado para poblar catálogos desde CSVs (Airlines.csv y Airports.csv)")
sql_lines.append("")

# Airlines
sql_lines.append("-- 1. Catálogo de Aerolíneas")
sql_lines.append("CREATE TABLE IF NOT EXISTS catalogo_aerolineas (codigo_iata TEXT PRIMARY KEY, nombre_aerolinea TEXT);")
sql_lines.append("ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS logo TEXT;")
sql_lines.append("ALTER TABLE catalogo_aerolineas ADD COLUMN IF NOT EXISTS color TEXT;")
sql_lines.append("")
sql_lines.append("INSERT INTO catalogo_aerolineas (codigo_iata, nombre_aerolinea) VALUES")

airlines_rows = []
seen_airlines = set()
try:
    print(f"Reading airlines from {files['airlines']}")
    with open(files['airlines'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            iata = clean(row.get('IATA', ''))
            name = clean(row.get('Name', ''))
            if iata and iata not in seen_airlines: # Only insert if IATA exists and is unique
                seen_airlines.add(iata)
                airlines_rows.append(f"('{iata}', '{name}')")
            elif iata:
                print(f"Skipping duplicate airline IATA: {iata}")
except Exception as e:
    print(f"Error reading airlines: {e}")

if airlines_rows:
    sql_lines.append(",\n".join(airlines_rows))
    sql_lines.append("ON CONFLICT (codigo_iata) DO UPDATE SET nombre_aerolinea = EXCLUDED.nombre_aerolinea;")
    sql_lines.append(";\n")

# Airports
sql_lines.append("-- 2. Catálogo de Aeropuertos")
sql_lines.append("CREATE TABLE IF NOT EXISTS catalogo_aeropuertos (iata TEXT PRIMARY KEY, ciudad TEXT);")
sql_lines.append("ALTER TABLE catalogo_aeropuertos ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'México';")
sql_lines.append("ALTER TABLE catalogo_aeropuertos ADD COLUMN IF NOT EXISTS estado TEXT;")
sql_lines.append("ALTER TABLE catalogo_aeropuertos ADD COLUMN IF NOT EXISTS nombre_aeropuerto TEXT;")
sql_lines.append("")
sql_lines.append("INSERT INTO catalogo_aeropuertos (iata, ciudad, pais, nombre_aeropuerto) VALUES")

airports_rows = []
seen_airports = set()
try:
    print(f"Reading airports from {files['airports']}")
    with open(files['airports'], 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            iata = clean(row.get('IATA', ''))
            city = clean(row.get('City', ''))
            country = clean(row.get('Country', ''))
            name = clean(row.get('Name', ''))
            if iata and iata not in seen_airports:
                seen_airports.add(iata)
                airports_rows.append(f"('{iata}', '{city}', '{country}', '{name}')")
            elif iata:
                print(f"Skipping duplicate airport IATA: {iata}")
except Exception as e:
    print(f"Error reading airports: {e}")

if airports_rows:
    sql_lines.append(",\n".join(airports_rows))
    sql_lines.append("ON CONFLICT (iata) DO UPDATE SET ciudad = EXCLUDED.ciudad, pais = EXCLUDED.pais, nombre_aeropuerto = EXCLUDED.nombre_aeropuerto;")
    sql_lines.append(";\n")

with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"SQL file created: {output_path}")
