// Repair lost-accent characters (U+FFFD) in js/data-management.js
const fs = require('fs');
const path = 'js/data-management.js';
let c = fs.readFileSync(path, 'utf8');
const U = '\uFFFD';

const pairs = [
  // ñ
  [`Tama${U}o`, 'Tamaño'],
  [`Peque${U}o`, 'Pequeño'],
  [`Espa${U}a`, 'España'],

  // á
  [`inv${U}lido`, 'inválido'],
  [`Bogot${U}`, 'Bogotá'],
  [`Canad${U}`, 'Canadá'],
  [`Panam${U}`, 'Panamá'],
  [`Pa${U}ses`, 'Países'],
  [`Pa${U}s`,  'País'],
  [`autom${U}ticamente`, 'automáticamente'],
  [`ser${U}n`, 'serán'],
  [`S${U}bado`, 'Sábado'],
  [`V${U}lido`, 'Válido'],
  [`v${U}lidas`, 'válidas'],
  [`v${U}lido`, 'válido'],
  [`Aproximaci${U}n`, 'Aproximación'],
  [`Sem${U}foro`, 'Semáforo'],
  [`Fr${U}ncfort`, 'Fráncfort'],
  [`S${U}o Paulo`, 'São Paulo'],
  [`est${U} vac${U}o`, 'está vacío'],
  [`vac${U}o`, 'vacío'],
  [`est${U}`, 'está'],

  // é
  [`M${U}trica`, 'Métrica'],
  [`M${U}todo`, 'Método'],
  [`Mi${U}rcoles`, 'Miércoles'],
  [`Cr${U}tico`, 'Crítico'],
  [`Cient${U}fico`, 'Científico'],
  [`cient${U}fico`, 'científico'],
  [`qu${U} A`, 'qué A'],
  [` qu${U} `, ' qué '],
  [`qu${U}?`, 'qué?'],

  // í
  [`Aerol${U}neas`, 'Aerolíneas'],
  [`Aerol${U}nea`, 'Aerolínea'],
  [`aerol${U}neas`, 'aerolíneas'],
  [`aerol${U}nea`, 'aerolínea'],
  [`AEROL${U}NEAS`, 'AEROLÍNEAS'],
  [`Mam${U}feros`, 'Mamíferos'],
  [`Matr${U}cula`, 'Matrícula'],
  [`matr${U}cula`, 'matrícula'],
  [`T${U}tulo`, 'Título'],
  [`Categor${U}a`, 'Categoría'],
  [`categor${U}a`, 'categoría'],
  [`Meteorol${U}gicas`, 'Meteorológicas'],
  [`R${U}o`, 'Río'],
  [`Par${U}s`, 'París'],
  [`l${U}nea`, 'línea'],
  [`${U}tem`, 'ítem'],
  [`Aseg${U}rese`, 'Asegúrese'],

  // ó
  [`Operaci${U}n`, 'Operación'],
  [`Ubicaci${U}n`, 'Ubicación'],
  [`Descripci${U}n`, 'Descripción'],
  [`Disposici${U}n`, 'Disposición'],
  [`Liberaci${U}n`, 'Liberación'],
  [`Precauci${U}n`, 'Precaución'],
  [`acci${U}n`, 'acción'],
  [`Regi${U}n`, 'Región'],
  [`Gesti${U}n`, 'Gestión'],
  [`gesti${U}n`, 'gestión'],
  [`M${U}DULO`, 'MÓDULO'],
  [`C${U}digo`, 'Código'],
  [`Aterriz${U}`, 'Aterrizó'],
  [`reconoci${U}`, 'reconoció'],
  [`borrar${U}`, 'borrará'],
  [`encontr${U}`, 'encontró'],
  [`elimin${U}`, 'eliminó'],

  // ú
  [`Per${U}`, 'Perú'],
  [`p${U}blico`, 'público'],
  [`Rep${U}blica`, 'República'],
  [`N${U}mero`, 'Número'],
  [`n${U}mero`, 'número'],
  [`Nombre Com${U}n`, 'Nombre Común'],
  [`Nombre com${U}n`, 'Nombre común'],
  [`seg${U}n`, 'según'],
  [`Jap${U}n`, 'Japón'],
  [`Se${U}l`, 'Seúl'],

  // Á
  [`${U}msterdam`, 'Ámsterdam'],

  // Sí (yes) and Estás
  [`'S${U}'`, "'Sí'"],
  [`Est${U}s`, 'Estás'],

  // ¿ at start of strings/templates
  ['`\uFFFDEliminar', '`¿Eliminar'],
  ['(`\uFFFD', '(`¿'],
  ['\'\uFFFDEliminar', '\'¿Eliminar'],
  [`${U}Eliminar`, '¿Eliminar'],
  [`${U}Estás`, '¿Estás'],
  [`${U}Desea`, '¿Desea'],
  [`${U}A qué`, '¿A qué'],

  // Typo introduced by previous fix: 'TamAño' should be 'Tamaño'
  ['TamAño', 'Tamaño'],

  // Ellipsis (loading / placeholder text)
  [`Guardando${U}`, 'Guardando…'],
  [`Cargando${U}`, 'Cargando…'],
  [`Filtrar${U}`, 'Filtrar…'],
  [`placeholder="${U}"`, 'placeholder="…"'],

  // Em dash separators (visual)
  [`AEROLÍNEAS ${U} `, 'AEROLÍNEAS — '],
  [`MENSUALES ${U} `, 'MENSUALES — '],
  [`split ${U} `, 'split — '],
  [`small">${U}</span>`, 'small">—</span>'],
];

let before = (c.match(/\uFFFD/g) || []).length;
for (const [from, to] of pairs) {
  c = c.split(from).join(to);
}
let after = (c.match(/\uFFFD/g) || []).length;

fs.writeFileSync(path, c, 'utf8');
console.log(`U+FFFD: ${before} -> ${after}`);
if (after > 0) {
  // Show contexts of remaining
  const re = /.{0,30}\uFFFD.{0,30}/g;
  let m;
  while ((m = re.exec(c)) !== null) console.log('REMAIN:', JSON.stringify(m[0]));
}
