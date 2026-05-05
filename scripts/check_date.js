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
    if (!dateStr) return null;
    const jsDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(jsDate.getTime())) return null;
    const day = String(jsDate.getDate());
    const dayPadded = day.padStart(2, '0');
    const monthName = SPANISH_MONTH_NAMES[jsDate.getMonth()] || '';
    const monthShort = monthName.slice(0,3);
    const year = String(jsDate.getFullYear());

    const dayRe = new RegExp('\\b' + dayPadded + '\\b');
    const monthRe = new RegExp('\\b' + monthName + '\\b');
    const monthShortRe = new RegExp('\\b' + monthShort + '\\b');
    const yearRe = new RegExp('\\b' + year + '\\b');

    let best = null; let bestScore = -1;
    for (const candidate of manifest){
        if (!candidate || typeof candidate !== 'string') continue;
        if (!/\.pdf$/i.test(candidate)) continue;
        const norm = _normalizeForPdfMatch(candidate.replace(/\.pdf$/i, ''));
        let score = 0;
        if (dayRe.test(norm)) score += 6;
        if (monthRe.test(norm)) score += 5;
        if (monthShortRe.test(norm)) score += 2;
        if (yearRe.test(norm)) score += 8;
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

const dateArg = process.argv[2] || '2025-01-02';
const manifest = loadManifest();
const match = findFilenameForDate(manifest, dateArg);
console.log(dateArg, '->', match || '(no match)');

// show candidates that contain the day
const jsDate = new Date(`${dateArg}T00:00:00`);
    const day = String(jsDate.getDate()).padStart(2,'0');
    const dayRe = new RegExp('\\b' + day + '\\b');
    console.log('\nCandidates containing day (word-boundary):');
    manifest.filter(f=>/\.pdf$/i.test(f)).forEach(f=>{
        const n = _normalizeForPdfMatch(f.replace(/\.pdf$/i, ''));
        if (dayRe.test(n)) console.log(' -', f);
    });
