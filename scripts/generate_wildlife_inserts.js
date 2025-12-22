const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/fauna.json');
const outputPath = path.join(__dirname, '../wildlife_inserts.sql');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    let sql = `INSERT INTO wildlife_strikes (date, time, location, impact_zone, operation_phase, airline, aircraft, registration, remains_impact_zone, remains_quantity, size, species, common_name, reporter, proactive_measures, weather_conditions, results) VALUES\n`;
    
    const values = data.map(item => {
        // Parse Date DD/MM/YYYY -> YYYY-MM-DD
        let date = 'NULL';
        if (item.Fecha) {
            const parts = item.Fecha.split('/');
            if (parts.length === 3) {
                date = `'${parts[2]}-${parts[1]}-${parts[0]}'`;
            }
        }

        const time = item.Hora ? `'${item.Hora}'` : 'NULL';
        const location = (item['Ubicación'] || '').replace(/'/g, "''");
        const impact_zone = (item['Zona de impacto'] || '').replace(/'/g, "''");
        const operation_phase = (item['Fase de la operación'] || '').replace(/'/g, "''");
        const airline = (item['Aerolineas'] || '').replace(/'/g, "''");
        const aircraft = (item['Aeronave'] || '').replace(/'/g, "''");
        const registration = (item['Matricula'] || '').replace(/'/g, "''");
        const remains_impact_zone = (item['Zona de impacto resto'] || '').replace(/'/g, "''");
        const remains_quantity = (item['Cantidad de restos'] || '').replace(/'/g, "''");
        const size = (item['Tamaño'] || '').replace(/'/g, "''");
        const species = (item['Especie'] || '').replace(/'/g, "''");
        const common_name = (item['Nombre común'] || '').replace(/'/g, "''");
        const reporter = (item['Personal que reporta'] || '').replace(/'/g, "''");
        const proactive_measures = (item['Medidas proactivas'] || '').replace(/'/g, "''");
        const weather_conditions = (item['Condiciones meteorológicas'] || '').replace(/'/g, "''");
        const results = (item['Resultados de las medidas'] || '').replace(/'/g, "''");

        return `(${date}, ${time}, '${location}', '${impact_zone}', '${operation_phase}', '${airline}', '${aircraft}', '${registration}', '${remains_impact_zone}', '${remains_quantity}', '${size}', '${species}', '${common_name}', '${reporter}', '${proactive_measures}', '${weather_conditions}', '${results}')`;
    });

    if (values.length > 0) {
        sql += values.join(',\n') + ';';
        fs.writeFileSync(outputPath, sql);
        console.log(`Generated SQL inserts for ${values.length} records at ${outputPath}`);
    } else {
        console.log('No records found.');
    }

} catch (error) {
    console.error('Error generating SQL:', error);
}
