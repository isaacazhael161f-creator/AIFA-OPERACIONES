const fs=require('fs'); const ht=fs.readFileSync('js/analisis-operaciones.js','utf8'); const rx = /tableElement\.DataTable\(\{\s*([\s\S]{0,1000})/; console.log(ht.match(rx)[0]);
