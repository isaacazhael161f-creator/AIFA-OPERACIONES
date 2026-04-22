const fs=require('fs'); const ht=fs.readFileSync('script.js','utf8'); const rx = /(?:complemento|observaci[oó]n|pago)[^;\{]{0,200}/gi; console.log(ht.match(rx));
