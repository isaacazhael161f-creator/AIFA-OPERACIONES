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
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const jsDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(jsDate.getTime())) return null;
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
    return null;
}

const manifest = loadManifest();
const tests = ['2025-12-01','2025-07-01','2025-03-01','2025-06-16','2025-02-01','2025-10-16'];
for (const t of tests){
    const match = findFilenameForDate(manifest, t) || '(no match)';
    console.log(t, '->', match);
}
