const fs = require('fs'); const ht = fs.readFileSync('js/data-management.js', 'utf8'); console.log(ht.match(/editItem\(.*?,[\s\S]{0,100}/g));
