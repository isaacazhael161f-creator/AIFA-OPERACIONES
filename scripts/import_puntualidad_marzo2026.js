/**
 * import_puntualidad_marzo2026.js
 * 
 * Inserta los datos del CSV de Puntualidad de Marzo 2026 en la tabla
 * punctuality_stats de Supabase.
 * 
 * REQUISITO PREVIO: Ejecutar en Supabase SQL Editor:
 *   db/add_punctuality_imputables_columns.sql
 * 
 * USO: node import_puntualidad_marzo2026.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3RuY3Z1dWhwZ3l6bWpjZXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzQ0NDQsImV4cCI6MjA4MTQ1MDQ0NH0.YEDIKuWt5iKUEI0BAvidINUz0aZBvQM0h6XRJ-uslB8';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Datos del CSV Puntualidad (1).csv — Marzo 2026
const rows = [
  { airline: 'Magnicharters',        category: 'Pasajeros', on_time: 7,   delayed: 2,  cancelled: 0,  total_flights: 9,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Conviasa',             category: 'Pasajeros', on_time: 4,   delayed: 1,  cancelled: 0,  total_flights: 5,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Mexicana',             category: 'Pasajeros', on_time: 336, delayed: 8,  cancelled: 0,  total_flights: 344, imputable_airline: 2,  cancelled_imputable: 0,  total_imputable: 2  },
  { airline: 'Aeroméxico',           category: 'Pasajeros', on_time: 287, delayed: 25, cancelled: 0,  total_flights: 312, imputable_airline: 3,  cancelled_imputable: 0,  total_imputable: 3  },
  { airline: 'Volaris',              category: 'Pasajeros', on_time: 180, delayed: 25, cancelled: 0,  total_flights: 205, imputable_airline: 3,  cancelled_imputable: 0,  total_imputable: 3  },
  { airline: 'Viva',                 category: 'Pasajeros', on_time: 1132,delayed: 185,cancelled: 66, total_flights: 1383,imputable_airline: 35, cancelled_imputable: 66, total_imputable: 101},
  { airline: 'Arajet',               category: 'Pasajeros', on_time: 32,  delayed: 9,  cancelled: 3,  total_flights: 44,  imputable_airline: 2,  cancelled_imputable: 3,  total_imputable: 5  },
  { airline: 'Aerus',                category: 'Pasajeros', on_time: 60,  delayed: 10, cancelled: 15, total_flights: 85,  imputable_airline: 3,  cancelled_imputable: 15, total_imputable: 18 },
  { airline: 'Berry Aviation',       category: 'Carga',     on_time: 0,   delayed: 1,  cancelled: 0,  total_flights: 1,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Uniworld Cargo',       category: 'Carga',     on_time: 1,   delayed: 0,  cancelled: 0,  total_flights: 1,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Cargolux',             category: 'Carga',     on_time: 12,  delayed: 17, cancelled: 2,  total_flights: 31,  imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Suparna Airlines',     category: 'Carga',     on_time: 0,   delayed: 7,  cancelled: 0,  total_flights: 7,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'UPS',                  category: 'Carga',     on_time: 19,  delayed: 3,  cancelled: 0,  total_flights: 22,  imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Galistair',            category: 'Carga',     on_time: 2,   delayed: 0,  cancelled: 0,  total_flights: 2,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'National',             category: 'Carga',     on_time: 0,   delayed: 3,  cancelled: 0,  total_flights: 3,   imputable_airline: 0,  cancelled_imputable: 0,  total_imputable: 0  },
  { airline: 'Turkish',              category: 'Carga',     on_time: 6,   delayed: 2,  cancelled: 1,  total_flights: 9,   imputable_airline: 0,  cancelled_imputable: 1,  total_imputable: 1  },
  { airline: 'Cathay Pacific',       category: 'Carga',     on_time: 15,  delayed: 12, cancelled: 0,  total_flights: 27,  imputable_airline: 3,  cancelled_imputable: 0,  total_imputable: 3  },
  { airline: 'La Nueva Aerolinea',   category: 'Carga',     on_time: 1,   delayed: 6,  cancelled: 1,  total_flights: 8,   imputable_airline: 0,  cancelled_imputable: 1,  total_imputable: 1  },
  { airline: 'QATAR',                category: 'Carga',     on_time: 6,   delayed: 3,  cancelled: 1,  total_flights: 10,  imputable_airline: 1,  cancelled_imputable: 1,  total_imputable: 2  },
  { airline: 'Air France',           category: 'Carga',     on_time: 5,   delayed: 5,  cancelled: 0,  total_flights: 10,  imputable_airline: 2,  cancelled_imputable: 0,  total_imputable: 2  },
  { airline: 'Amerijet',             category: 'Carga',     on_time: 1,   delayed: 2,  cancelled: 1,  total_flights: 4,   imputable_airline: 0,  cancelled_imputable: 1,  total_imputable: 1  },
  { airline: 'Estafeta',             category: 'Carga',     on_time: 25,  delayed: 11, cancelled: 6,  total_flights: 42,  imputable_airline: 5,  cancelled_imputable: 6,  total_imputable: 11 },
  { airline: 'Atlas Air',            category: 'Carga',     on_time: 27,  delayed: 23, cancelled: 13, total_flights: 63,  imputable_airline: 7,  cancelled_imputable: 13, total_imputable: 20 },
  { airline: 'Aerounión',            category: 'Carga',     on_time: 19,  delayed: 19, cancelled: 15, total_flights: 53,  imputable_airline: 2,  cancelled_imputable: 15, total_imputable: 17 },
  { airline: 'TSM',                  category: 'Carga',     on_time: 1,   delayed: 5,  cancelled: 0,  total_flights: 6,   imputable_airline: 2,  cancelled_imputable: 0,  total_imputable: 2  },
  { airline: 'Lufthansa',            category: 'Carga',     on_time: 20,  delayed: 12, cancelled: 1,  total_flights: 33,  imputable_airline: 10, cancelled_imputable: 1,  total_imputable: 11 },
  { airline: 'DHL Guatemala',        category: 'Carga',     on_time: 11,  delayed: 6,  cancelled: 0,  total_flights: 17,  imputable_airline: 6,  cancelled_imputable: 0,  total_imputable: 6  },
  { airline: 'Mas de Carga',         category: 'Carga',     on_time: 25,  delayed: 30, cancelled: 20, total_flights: 75,  imputable_airline: 8,  cancelled_imputable: 20, total_imputable: 28 },
  { airline: 'Ethiopian Airlines',   category: 'Carga',     on_time: 4,   delayed: 5,  cancelled: 0,  total_flights: 9,   imputable_airline: 4,  cancelled_imputable: 0,  total_imputable: 4  },
  { airline: 'Cargojet',             category: 'Carga',     on_time: 21,  delayed: 6,  cancelled: 20, total_flights: 47,  imputable_airline: 3,  cancelled_imputable: 20, total_imputable: 23 },
  { airline: 'Awesome Cargo',        category: 'Carga',     on_time: 5,   delayed: 17, cancelled: 3,  total_flights: 25,  imputable_airline: 10, cancelled_imputable: 3,  total_imputable: 13 },
  { airline: 'Kalitta Air',          category: 'Carga',     on_time: 10,  delayed: 15, cancelled: 7,  total_flights: 32,  imputable_airline: 10, cancelled_imputable: 7,  total_imputable: 17 },
  { airline: 'Silk Waywest Airlines',category: 'Carga',     on_time: 1,   delayed: 3,  cancelled: 1,  total_flights: 5,   imputable_airline: 2,  cancelled_imputable: 1,  total_imputable: 3  },
  { airline: 'Air China',            category: 'Carga',     on_time: 3,   delayed: 9,  cancelled: 1,  total_flights: 13,  imputable_airline: 7,  cancelled_imputable: 1,  total_imputable: 8  },
  { airline: 'China Southern',       category: 'Carga',     on_time: 11,  delayed: 20, cancelled: 3,  total_flights: 34,  imputable_airline: 19, cancelled_imputable: 3,  total_imputable: 22 },
  { airline: 'Air Canada',           category: 'Carga',     on_time: 8,   delayed: 18, cancelled: 3,  total_flights: 29,  imputable_airline: 16, cancelled_imputable: 3,  total_imputable: 19 },
  { airline: 'Emirates Airlines',    category: 'Carga',     on_time: 5,   delayed: 6,  cancelled: 6,  total_flights: 17,  imputable_airline: 6,  cancelled_imputable: 6,  total_imputable: 12 },
];

async function main() {
  // First delete existing March 2026 records to avoid duplicates
  const { error: delErr } = await sb
    .from('punctuality_stats')
    .delete()
    .eq('year', 2026)
    .eq('month', 3);

  if (delErr) {
    console.warn('No se pudo borrar registros existentes de Marzo 2026:', delErr.message);
  } else {
    console.log('Registros previos de Marzo 2026 eliminados.');
  }

  const toInsert = rows.map(r => ({
    year: 2026,
    month: 3,
    ...r
  }));

  const { data, error } = await sb.from('punctuality_stats').insert(toInsert).select();

  if (error) {
    console.error('ERROR al insertar:', error.message);
    console.error('Detalle:', error.details || error.hint || '');
  } else {
    console.log(`✓ ${data.length} registros de Marzo 2026 insertados correctamente.`);
  }
}

main();
