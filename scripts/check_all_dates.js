const fs = require('fs');
const path = require('path');
const SPANISH_MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function _normalizeForPdfMatch(text){
    if (!text) return '';
    return text.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function loadManifest(){
    const p = path.join(__dirname, '..', 'pdfs', 'parte_operaciones', 'index.json');
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
}

function findFilenameForDate(manifest, dateStr){
    const jsDate = new Date(`${dateStr}T00:00:00`);
    const day = String(jsDate.getDate());
    const dayPadded = day.padStart(2, '0');
    const monthName = SPANISH_MONTH_NAMES[jsDate.getMonth()] || '';
    const monthShort = monthName.slice(0,3);
    const year = String(jsDate.getFullYear());

    let best = null; let bestScore = -1;
    for (const candidate of manifest){
        if (!candidate || typeof candidate !== 'string') continue;
        if (!/\.pdf$/i.test(candidate)) continue;
        const norm = _normalizeForPdfMatch(candidate.replace(/\.pdf$/i, ''));
        let score = 0;
        if (norm.includes(dayPadded)) score += 4;
        if (norm.includes(day)) score += 3;
        if (norm.includes(monthName)) score += 5;
        if (norm.includes(monthShort)) score += 2;
        if (norm.includes(year)) score += 6;
        if (norm.includes('operaciones')) score += 1;
        if (score > bestScore){ bestScore = score; best = candidate; }
    }
    if (bestScore >= 7) return best;
    for (const candidate of manifest){
        if (!candidate || typeof candidate !== 'string') continue;
        if (!/\.pdf$/i.test(candidate)) continue;
        const norm = _normalizeForPdfMatch(candidate.replace(/\.pdf$/i, ''));
        if ((norm.includes(dayPadded) || norm.includes(day)) && norm.includes(year)) return candidate;
        if ((norm.includes(dayPadded) || norm.includes(day)) && (norm.includes(monthName) || norm.includes(monthShort))) return candidate;
        if ((norm.includes(monthName) || norm.includes(monthShort)) && norm.includes(year)) return candidate;
    }
    for (const candidate of manifest){
        if (!candidate || typeof candidate !== 'string') continue;
        if (!/\.pdf$/i.test(candidate)) continue;
        const norm = _normalizeForPdfMatch(candidate.replace(/\.pdf$/i, ''));
        if (norm.includes(dayPadded) || norm.includes(day)) return candidate;
    }
    return null;
}

const manifest = loadManifest();
const year = 2025;
let missing = [];
for (let m=0;m<12;m++){
    const month = m+1;
    const days = new Date(year, month, 0).getDate();
    for (let d=1; d<=days; d++){
        const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const match = findFilenameForDate(manifest, iso);
        if (!match) missing.push(iso);
    }
}
console.log('Total missing:', missing.length);
if (missing.length) console.log(missing.join('\n'));
else console.log('All dates matched');
