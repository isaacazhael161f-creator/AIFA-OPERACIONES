const fs = require('fs'); const ht = fs.readFileSync('js/admin-ui.js', 'utf8'); console.log(ht.substring(ht.indexOf('if (!this.currentSchema'), ht.indexOf('if (!this.currentTable')));
