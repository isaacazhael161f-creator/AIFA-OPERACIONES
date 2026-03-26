const fs = require('fs');

function moveTab(filename) {
    let content = fs.readFileSync(filename, 'utf8');

    let yoyPattern = /[ \t]*<li class="nav-item" role="presentation">\s*<button class="nav-link"[^>]*?id="comparativa-yoy-tab"[^>]*?>[\s\S]*?<\/button>\s*<\/li>/;
    
    let match = content.match(yoyPattern);
    
    if (match) {
        let htmlExtracted = match[0];
        
        content = content.replace(yoyPattern, '');
        
        let anchorPattern = /(<li class="nav-item" role="presentation">\s*<button class="nav-link active"[^>]*?id="ops-resumen-tab"[\s\S]*?<\/button>\s*<\/li>)/;
        
        if (content.match(anchorPattern)) {
             content = content.replace(anchorPattern, `$1\n${htmlExtracted}`);
             fs.writeFileSync(filename, content, 'utf8');
             console.log(`Updated ${filename} successfully!`);
        } else {
             console.log(`Could not find anchor to insert in ${filename}`);
        }
    } else {
        console.log(`Could not find YoY tab to extract in ${filename}`);
    }
}

moveTab('index.html');
moveTab('index_main.html');
