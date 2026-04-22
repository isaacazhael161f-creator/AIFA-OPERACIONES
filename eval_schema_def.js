const fs=require('fs'); const ht=fs.readFileSync('js/data-management.js','utf8'); const rx = /editItem\(tableName, item\)[\s\S]{0,500}/g; console.log(ht.match(rx));
