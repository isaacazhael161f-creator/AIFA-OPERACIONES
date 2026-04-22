const fs=require('fs'); const ht=fs.readFileSync('js/data-management.js','utf8'); console.log(ht.substring(ht.indexOf('editItem(tableName, item)'), ht.indexOf('editItem(tableName, item)')+1200));
