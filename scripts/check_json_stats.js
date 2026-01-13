const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/resumen_parte_operaciones.json');

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const days = Object.keys(data.dias);
    console.log(`Total days in JSON: ${days.length}`);
    days.sort();
    console.log(`First day: ${days[0]}`);
    console.log(`Last day: ${days[days.length - 1]}`);
    
    // Check for 2024 vs 2025
    const years = new Set(days.map(d => d.split('-')[0]));
    console.log(`Years found: ${Array.from(years).join(', ')}`);

} catch (error) {
    console.error('Error reading JSON:', error);
}
