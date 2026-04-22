const fs=require('fs'); const ht=fs.readFileSync('js/data-management.js','utf8'); const rx = /Object\.keys\((?:row|data\[0\])\)\.map[\s\S]{0,500}/g; console.log(ht.match(rx));
