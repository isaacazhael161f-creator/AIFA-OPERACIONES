import csv
import json
import pathlib
from datetime import datetime, timedelta

# Configuración
INPUT_CSV = pathlib.Path('data/frecuencias_input.csv')
OUTPUT_JSON = pathlib.Path('data/frecuencias_semanales.json')

# Mapeo de días CSV a claves JSON
DIAS_MAP = {
    'L': 'L', 'M': 'M', 'X': 'X', 'J': 'J', 'V': 'V', 'S': 'S', 'D': 'D',
    'LUNES': 'L', 'MARTES': 'M', 'MIERCOLES': 'X', 'MIÉRCOLES': 'X', 
    'JUEVES': 'J', 'VIERNES': 'V', 'SABADO': 'S', 'SÁBADO': 'S', 'DOMINGO': 'D'
}

def parse_int(val):
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0

def run():
    if not INPUT_CSV.exists():
        print(f"❌ Error: No se encontró el archivo {INPUT_CSV}")
        print("   Por favor coloca tu CSV en la carpeta 'data/' con el nombre 'frecuencias_input.csv'.")
        return

    print(f"📂 Leyendo {INPUT_CSV}...")
    
    destinations_map = {}
    
    try:
        with open(INPUT_CSV, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            # Normalizar nombres de columnas (quitar espacios, mayúsculas)
            reader.fieldnames = [name.strip() for name in reader.fieldnames]
            
            for row in reader:
                iata = row.get('IATA', '').strip().upper()
                airline_name = row.get('Aerolinea', '').strip()
                
                if not iata or not airline_name:
                    continue

                # Crear estructura del destino si no existe
                if iata not in destinations_map:
                    destinations_map[iata] = {
                        "routeId": len(destinations_map) + 1,
                        "city": row.get('Ciudad', '').strip(),
                        "state": row.get('Estado', '').strip(),
                        "iata": iata,
                        "airports": [iata],
                        "airlines": []
                    }
                
                # Extraer frecuencias diarias
                daily = {}
                weekly_total = 0
                
                # Buscar columnas de días (soporta L, M, X... o Lunes, Martes...)
                for col_name, val in row.items():
                    key = col_name.strip().upper()
                    # Mapear nombre de columna a clave corta (L, M, X...)
                    day_code = None
                    if key in DIAS_MAP:
                        day_code = DIAS_MAP[key]
                    elif key[:3] in ['LUN','MAR','MIE','JUE','VIE','SAB','DOM']: # Intentar prefijos
                         # Mapeo manual rápido para prefijos
                         if key.startswith('LUN'): day_code = 'L'
                         elif key.startswith('MAR'): day_code = 'M'
                         elif key.startswith('MIE'): day_code = 'X'
                         elif key.startswith('MIÉ'): day_code = 'X'
                         elif key.startswith('JUE'): day_code = 'J'
                         elif key.startswith('VIE'): day_code = 'V'
                         elif key.startswith('SAB'): day_code = 'S'
                         elif key.startswith('SÁB'): day_code = 'S'
                         elif key.startswith('DOM'): day_code = 'D'

                    if day_code:
                        count = parse_int(val)
                        daily[day_code] = count
                        weekly_total += count

                # Asegurar que existan todos los días
                final_daily = {d: daily.get(d, 0) for d in ['L','M','X','J','V','S','D']}
                
                # Agregar aerolínea al destino
                destinations_map[iata]['airlines'].append({
                    "name": airline_name,
                    "daily": final_daily,
                    "weeklyTotal": weekly_total
                })

        # Convertir mapa a lista
        destinations_list = list(destinations_map.values())
        
        # Calcular fechas (Semana actual por defecto)
        today = datetime.now()
        start_week = today - timedelta(days=today.weekday()) # Lunes actual
        end_week = start_week + timedelta(days=6) # Domingo actual
        
        week_label = f"{start_week.strftime('%d')}-{end_week.strftime('%d %b %Y')}"
        
        final_json = {
            "weekLabel": week_label,
            "validFrom": start_week.strftime('%Y-%m-%d'),
            "validTo": end_week.strftime('%Y-%m-%d'),
            "destinations": destinations_list
        }

        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(final_json, f, indent=2, ensure_ascii=False)
            
        print(f"✅ Éxito: Se generó {OUTPUT_JSON} con {len(destinations_list)} destinos.")
        print("   Ahora recarga la página web para ver los cambios.")

    except Exception as e:
        print(f"❌ Error procesando el CSV: {e}")

if __name__ == '__main__':
    run()
