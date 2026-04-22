const fs = require('fs'); const ht = fs.readFileSync('js/admin-ui.js', 'utf8'); console.log(ht.match(/field\.type.*?=.*?['"]date['"]/g)); console.log(ht.match(/if \(.*?date.*?\)/g));
