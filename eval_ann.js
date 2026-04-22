const fs = require('fs'); const ht = fs.readFileSync('js/data-management.js', 'utf8'); const res = ht.match(/annual_operations:\s*\[([\s\S]*?)\]/); console.log(res[0]);
