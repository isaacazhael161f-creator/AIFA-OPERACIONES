const fs=require('fs'); const files=fs.readdirSync('js'); files.forEach(f=>{if(f.endsWith('.js')){const ht=fs.readFileSync('js/'+f,'utf8'); if(ht.indexOf('Buscar...')>-1)console.log(f);}})
