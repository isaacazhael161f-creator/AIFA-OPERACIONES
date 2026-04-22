const fs=require('fs'); const ht=fs.readFileSync('index.html','utf8'); const rx = /id=.*?pagos/gi; console.log(ht.match(rx)); console.log(ht.includes('Buscar en pagos'));
