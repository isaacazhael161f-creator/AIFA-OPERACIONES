const fs=require('fs'); const ht=fs.readFileSync('js/analisis-operaciones.js','utf8'); const start = ht.indexOf('function applyExcelFilters'); console.log(ht.substring(start, start+1500));
