const fs = require('fs');

function moveTab(filename) {
    let content = fs.readFileSync(filename, 'utf8');

    // Find the YoY tab text exactly
    const yoyTabStart = content.indexOf('<li class="nav-item" role="presentation">\n                                      <button class="nav-link" id="comparativa-yoy-tab"');
    
    // Fallback if formatting is slightly different
    if (yoyTabStart === -1) {
        console.log("Could not find start of YoY tab in " + filename);
        // Let's use regex
        let pattern = /\s*<li class="nav-item" role="presentation">\s*<button class="nav-link"[^>]*id="comparativa-yoy-tab"[\s\S]*?<\/li>\n/;
        let match = content.match(pattern);
        if(!match) {
            console.log("No match found at all for " + filename);
            return;
        }
        
        let htmlExtracted = match[0];
        content = content.replace(htmlExtracted, '');
        
        let anchor = /<button class="nav-link active"[^>]*id="ops-resumen-tab"[\s\S]*?<\/li>\n/;
        content = content.replace(anchor, (m) => m + htmlExtracted);
        fs.writeFileSync(filename, content, 'utf8');
        console.log("Updated via Regex " + filename);
        return;
    }
}
moveTab('index.html');
moveTab('index_main.html');
