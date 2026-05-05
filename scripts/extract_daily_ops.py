import re
import csv
import os

def extract_data():
    script_path = os.path.join(os.path.dirname(__file__), '..', 'script.js')
    
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find the WEEKLY_OPERATIONS_DATASETS array
    # We'll just look for the day objects directly as they have a very specific signature
    
    # Pattern to match a single day object
    # We use DOTALL to match across lines
    day_pattern = re.compile(
        r"fecha:\s*'([^']*)'.*?"
        r"comercial:\s*\{\s*operaciones:\s*(\d+),\s*pasajeros:\s*(\d+)\s*\}.*?"
        r"general:\s*\{\s*operaciones:\s*(\d+),\s*pasajeros:\s*(\d+)\s*\}.*?"
        r"carga:\s*\{\s*operaciones:\s*(\d+),\s*toneladas:\s*([\d\.]+),\s*corteFecha:\s*'([^']*)',\s*corteNota:\s*'([^']*)'\s*\}",
        re.DOTALL
    )

    matches = day_pattern.findall(content)
    
    print(f"Found {len(matches)} daily records.")

    csv_file = os.path.join(os.path.dirname(__file__), '..', 'daily_operations.csv')
    sql_file = os.path.join(os.path.dirname(__file__), '..', 'insert_daily_operations.sql')

    # CSV Header
    headers = [
        'date', 
        'comercial_ops', 'comercial_pax', 
        'general_ops', 'general_pax', 
        'carga_ops', 'carga_tons', 
        'carga_cutoff_date', 'carga_cutoff_note'
    ]

    data_rows = []
    
    for match in matches:
        # match is a tuple of groups
        row = {
            'date': match[0],
            'comercial_ops': match[1],
            'comercial_pax': match[2],
            'general_ops': match[3],
            'general_pax': match[4],
            'carga_ops': match[5],
            'carga_tons': match[6],
            'carga_cutoff_date': match[7],
            'carga_cutoff_note': match[8]
        }
        data_rows.append(row)

    # Sort by date just in case
    data_rows.sort(key=lambda x: x['date'])

    # Write CSV
    with open(csv_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data_rows)

    print(f"CSV written to {csv_file}")

    # Write SQL
    # Assuming table name is 'daily_operations'
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- SQL to create the table\n")
        f.write("""
CREATE TABLE IF NOT EXISTS daily_operations (
    date DATE PRIMARY KEY,
    comercial_ops INTEGER DEFAULT 0,
    comercial_pax INTEGER DEFAULT 0,
    general_ops INTEGER DEFAULT 0,
    general_pax INTEGER DEFAULT 0,
    carga_ops INTEGER DEFAULT 0,
    carga_tons NUMERIC DEFAULT 0,
    carga_cutoff_date DATE,
    carga_cutoff_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
\n""")
        f.write("-- SQL to insert data\n")
        f.write("INSERT INTO daily_operations (date, comercial_ops, comercial_pax, general_ops, general_pax, carga_ops, carga_tons, carga_cutoff_date, carga_cutoff_note) VALUES\n")
        
        values_list = []
        for row in data_rows:
            # Escape single quotes in note
            note = row['carga_cutoff_note'].replace("'", "''")
            val = f"('{row['date']}', {row['comercial_ops']}, {row['comercial_pax']}, {row['general_ops']}, {row['general_pax']}, {row['carga_ops']}, {row['carga_tons']}, '{row['carga_cutoff_date']}', '{note}')"
            values_list.append(val)
        
        f.write(",\n".join(values_list))
        f.write(";\n")

    print(f"SQL written to {sql_file}")

if __name__ == "__main__":
    extract_data()
