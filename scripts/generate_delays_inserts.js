const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/demoras.json');
const outputPath = path.join(__dirname, '../delays_inserts.sql');

try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);

    let sql = `INSERT INTO delays (year, month, cause, count, description, incidents, observations) VALUES\n`;
    const allValues = [];

    // Helper to process a list of causes for a given year/month
    const processCauses = (causas, year, month) => {
        causas.forEach(item => {
            const cause = (item.causa || '').replace(/'/g, "''");
            const count = item.demoras || 0;
            const description = (item.descripcion || '').replace(/'/g, "''");
            
            let observations = item.observaciones || '';
            if (Array.isArray(observations)) {
                observations = observations.join('\n');
            }
            observations = String(observations).replace(/'/g, "''");
            
            // Handle incidents array
            let incidentsSql = 'ARRAY[]::TEXT[]';
            if (item.incidentes && Array.isArray(item.incidentes) && item.incidentes.length > 0) {
                const escapedIncidents = item.incidentes.map(inc => `'${inc.replace(/'/g, "''")}'`);
                incidentsSql = `ARRAY[${escapedIncidents.join(',')}]`;
            }

            allValues.push(`(${year}, '${month}', '${cause}', ${count}, '${description}', ${incidentsSql}, '${observations}')`);
        });
    };

    // Check if we have periods
    if (data.periods && Array.isArray(data.periods)) {
        console.log(`Found ${data.periods.length} periods.`);
        data.periods.forEach(period => {
            // Extract year and month from period string "Enero 2025"
            let year = 2025;
            let month = 'Unknown';
            
            if (period.periodo) {
                const parts = period.periodo.split(' ');
                if (parts.length >= 2) {
                    month = parts[0];
                    year = parseInt(parts[1]);
                } else {
                    month = period.periodo; // Fallback
                }
            } else if (period.label) {
                month = period.label;
            }

            if (period.causas) {
                processCauses(period.causas, year, month);
            }
        });
    } else {
        // Fallback to top-level if no periods array (though we know it exists)
        console.log('No periods array found, using top-level data.');
        const year = parseInt(data.year) || 2025;
        let month = 'Noviembre';
        if (data.periodo) {
            const parts = data.periodo.split(' ');
            if (parts.length > 0) month = parts[0];
        }
        processCauses(data.causas, year, month);
    }

    if (allValues.length > 0) {
        sql += allValues.join(',\n') + ';';
        fs.writeFileSync(outputPath, sql);
        console.log(`Generated SQL inserts for ${allValues.length} records at ${outputPath}`);
    } else {
        console.log('No records found to generate.');
    }

} catch (error) {
    console.error('Error generating SQL:', error);
}
