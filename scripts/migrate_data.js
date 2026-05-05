const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // User needs to provide this

if (!SUPABASE_SERVICE_KEY) {
    console.error('Please set SUPABASE_SERVICE_KEY environment variable.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateOperationsSummary() {
    console.log('Migrating Operations Summary...');
    
    // Data extracted from script.js
    const staticData = {
        operacionesTotales: {
            comercial: [ { periodo: '2022', operaciones: 8996, pasajeros: 912415 }, { periodo: '2023', operaciones: 23211, pasajeros: 2631261 }, { periodo: '2024', operaciones: 51734, pasajeros: 6318454 }, { periodo: '2025', operaciones: 49160, pasajeros: 6547109} ],
            carga: [ { periodo: '2022', operaciones: 8, toneladas: 5.19 }, { periodo: '2023', operaciones: 5578, toneladas: 186319.83}, { periodo: '2024', operaciones: 13219, toneladas: 447341.17 }, { periodo: '2025', operaciones: 11168, toneladas: 377761.43} ],
            general: [ { periodo: '2022', operaciones: 458, pasajeros: 1385 }, { periodo: '2023', operaciones: 2212, pasajeros: 8160 }, { periodo: '2024', operaciones: 2777, pasajeros: 29637 }, { periodo: '2025', operaciones: 2891, pasajeros: 20577} ]
        }
    };

    const rows = [];

    // Process Yearly Data
    for (const item of staticData.operacionesTotales.comercial) {
        rows.push({ year: parseInt(item.periodo), category: 'comercial', metric: 'operaciones', value: item.operaciones });
        rows.push({ year: parseInt(item.periodo), category: 'comercial', metric: 'pasajeros', value: item.pasajeros });
    }
    for (const item of staticData.operacionesTotales.carga) {
        rows.push({ year: parseInt(item.periodo), category: 'carga', metric: 'operaciones', value: item.operaciones });
        rows.push({ year: parseInt(item.periodo), category: 'carga', metric: 'toneladas', value: item.toneladas });
    }
    for (const item of staticData.operacionesTotales.general) {
        rows.push({ year: parseInt(item.periodo), category: 'general', metric: 'operaciones', value: item.operaciones });
        rows.push({ year: parseInt(item.periodo), category: 'general', metric: 'pasajeros', value: item.pasajeros });
    }

    const { error } = await supabase.from('operations_summary').upsert(rows, { onConflict: 'id' }); // Note: id is auto-gen, so upsert might duplicate if we don't specify conflict. 
    // Better to delete all and insert for migration
    await supabase.from('operations_summary').delete().neq('id', 0);
    const { error: insertError } = await supabase.from('operations_summary').insert(rows);

    if (insertError) console.error('Error migrating operations_summary:', insertError);
    else console.log('Migrated operations_summary successfully.');
}

async function migrateMedicalAttentions() {
    console.log('Migrating Medical Attentions...');
    const filePath = path.join(__dirname, '../data/atenciones_medicas.json');
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const rows = data.map(item => ({
        year: item.anio,
        month: item.mes,
        aifa_count: item.aifa,
        other_company_count: item.otra_empresa,
        passenger_count: item.pasajeros,
        visitor_count: item.visitantes
    }));

    await supabase.from('medical_attentions').delete().neq('id', 0);
    const { error } = await supabase.from('medical_attentions').insert(rows);
    if (error) console.error('Error migrating medical_attentions:', error);
    else console.log('Migrated medical_attentions successfully.');
}

async function run() {
    await migrateOperationsSummary();
    await migrateMedicalAttentions();
    // Add other migrations here
    console.log('Migration complete.');
}

run();
