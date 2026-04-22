const fs=require('fs'); const ht=fs.readFileSync('js/analisis-operaciones.js','utf8'); const m = ht.match(/[^;\{]{0,50}bservac[^;\}]{0,50}/gi); console.log(m);
