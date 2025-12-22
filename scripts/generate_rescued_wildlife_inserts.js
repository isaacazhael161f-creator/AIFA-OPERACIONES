const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../data/fauna_rescatada.json');
const outputFile = path.join(__dirname, '../rescued_wildlife_inserts.sql');

try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    let sql = 'INSERT INTO rescued_wildlife (capture_number, date, time, month, class, common_name, scientific_name, quantity, capture_method, quadrant, final_disposition, year) VALUES\n';
    let values = [];

    Object.keys(data).forEach(yearKey => {
        const records = data[yearKey];
        records.forEach(record => {
            const captureNumber = record['No. captura'] || record['NO. CAPTURA'] || 0;
            
            // Date handling
            let dateStr = record['Fecha'] || record['FECHA'];
            let formattedDate = 'NULL';
            if (dateStr) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    formattedDate = `'${parts[2]}-${parts[1]}-${parts[0]}'`;
                }
            }

            const time = record['Hora'] || record['HORA'] ? `'${record['Hora'] || record['HORA']}'` : 'NULL';
            const month = record['Mes'] || record['MES'] ? `'${(record['Mes'] || record['MES']).replace(/'/g, "''")}'` : 'NULL';
            const className = record['Clase'] || record['CLASE'] ? `'${(record['Clase'] || record['CLASE']).replace(/'/g, "''")}'` : 'NULL';
            const commonName = record['Nombre común'] || record['NOMBRE COMÚN'] ? `'${(record['Nombre común'] || record['NOMBRE COMÚN']).replace(/'/g, "''")}'` : 'NULL';
            const scientificName = record['Nombre científico'] || record['NOMBRE CIENTÍFICO'] ? `'${(record['Nombre científico'] || record['NOMBRE CIENTÍFICO']).replace(/'/g, "''")}'` : 'NULL';
            const quantity = record['No. individuos'] || record['NO. INDIVIDUOS'] || 0;
            const captureMethod = record['Método de captura'] || record['MÉTODO DE CAPTURA'] ? `'${(record['Método de captura'] || record['MÉTODO DE CAPTURA']).replace(/'/g, "''")}'` : 'NULL';
            const quadrant = record['Cuadrante'] || record['CUADRANTE'] ? `'${(record['Cuadrante'] || record['CUADRANTE']).replace(/'/g, "''")}'` : 'NULL';
            const finalDisposition = record['Disposición final'] || record['DISPOSICIÓN FINAL'] ? `'${(record['Disposición final'] || record['DISPOSICIÓN FINAL']).replace(/'/g, "''")}'` : 'NULL';
            const year = record['Año'] || parseInt(yearKey) || 'NULL';

            values.push(`(${captureNumber}, ${formattedDate}, ${time}, ${month}, ${className}, ${commonName}, ${scientificName}, ${quantity}, ${captureMethod}, ${quadrant}, ${finalDisposition}, ${year})`);
        });
    });

    if (values.length > 0) {
        sql += values.join(',\n') + ';';
        fs.writeFileSync(outputFile, sql);
        console.log(`Successfully generated SQL with ${values.length} records.`);
    } else {
        console.log('No records found to generate SQL.');
    }

} catch (error) {
    console.error('Error generating SQL:', error);
}
