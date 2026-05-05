const fs = require('fs');
const path = require('path');
(async ()=>{
  const dir = path.join(__dirname, '..', 'pdfs', 'parte_operaciones');
  try{
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    const names = files.filter(d=>d.isFile()).map(d=>d.name).sort((a,b)=>a.localeCompare(b));
    const out = JSON.stringify(names, null, 2);
    await fs.promises.writeFile(path.join(dir, 'index.json'), out, 'utf8');
    console.log('Wrote', names.length, 'entries to index.json');
  }catch(err){
    console.error('Failed to generate manifest:', err);
    process.exit(1);
  }
})();
