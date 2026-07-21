const fs   = require('fs');
const path = require('path');

const dir   = path.join(__dirname, '..', 'sql_chunks');
const files = fs.readdirSync(dir).filter(f => f.endsWith('_data.sql'));

let total = 0;
for (const f of files) {
  const fp  = path.join(dir, f);
  let c     = fs.readFileSync(fp, 'utf8');
  const cnt = (c.split('"Sueldo Bruto"').length - 1);
  if (cnt > 0) {
    c = c.split('"Sueldo Bruto"').join('"Sueldo_Bruto"');
    fs.writeFileSync(fp, c, 'utf8');
    console.log(f, '->', cnt, 'reemplazos');
    total += cnt;
  }
}
console.log('Total reemplazos:', total);
