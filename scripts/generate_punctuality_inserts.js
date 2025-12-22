const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/puntualidad.json');
const outputPath = path.join(__dirname, '../punctuality_inserts.sql');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    let sql = `INSERT INTO punctuality_stats (year, month, category, airline, on_time, delayed, cancelled, total_flights) VALUES\n`;
    
    const values = data.map(item => {
        const year = 2025; // Defaulting to 2025
        const month = 'Noviembre'; // Defaulting to Noviembre based on UI title
        const category = item.categoria || 'General';
        const airline = (item.aerolinea || '').replace(/'/g, "''"); // Escape single quotes
        const on_time = item.a_tiempo || 0;
        const delayed = item.demora || 0;
        const cancelled = item.cancelado || 0;
        const total = item.total || 0;

        return `(${year}, '${month}', '${category}', '${airline}', ${on_time}, ${delayed}, ${cancelled}, ${total})`;
    });

    sql += values.join(',\n') + ';';

    fs.writeFileSync(outputPath, sql);
    console.log(`Generated SQL inserts at ${outputPath}`);

} catch (error) {
    console.error('Error generating SQL:', error);
}
