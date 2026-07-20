/**
 * ═══════════════════════════════════════════════════════════════════
 *  SYNC: Google Sheet (AppSheet HVAC) → Supabase  (Google Apps Script)
 * ───────────────────────────────────────────────────────────────────
 *  Cómo instalar:
 *   1. Abre el Google Sheet que usa AppSheet como backend.
 *   2. Menú: Extensiones → Apps Script.
 *   3. Borra el contenido y pega TODO este archivo.
 *   4. Ajusta SHEET_NAME si tu hoja no se llama "Reportes".
 *   5. Pon tu SERVICE_ROLE key (Supabase → Settings → API → service_role).
 *      ⚠️  Úsala SOLO aquí (servidor de Google), NUNCA en el front-end.
 *   6. Ejecuta una vez la función  setupTrigger  (autoriza permisos).
 *   7. Ejecuta  syncAll  una vez para la carga inicial.
 *  A partir de ahí, cada cambio en la hoja se envía a Supabase en segundos.
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── CONFIGURACIÓN ───────────────────────────────────────────────────
var SUPABASE_URL  = 'https://fgstncvuuhpgyzmjceyr.supabase.co';
var SUPABASE_KEY  = 'PEGA_AQUI_TU_SERVICE_ROLE_KEY';   // service_role (secreto)
var TABLE         = 'reportes_hvac';
var CONFLICT_COL  = 'reporte_id';                      // columna única para upsert
var SHEET_NAME    = 'Reportes';                        // ← nombre de la pestaña

// Mapa: encabezado EXACTO del Sheet  →  columna de Supabase
var COLUMN_MAP = {
  'Reporte ID'               : 'reporte_id',
  'Fecha'                    : 'fecha',
  'Quien elabora'            : 'quien_elabora',
  'ID'                       : 'id_registro',
  'Módulo'                   : 'modulo',
  'Nivel'                    : 'nivel',
  'Equipo'                   : 'equipo',
  'Tag'                      : 'tag',
  'No. de Serie'             : 'no_serie',
  'Dirección solicitante'    : 'direccion_solicitante',
  'Subdirección solicitante' : 'subdireccion_solicitante',
  'Gerencia solicitante'     : 'gerencia_solicitante',
  'Motivo de atención'       : 'motivo_atencion',
  'Revisión'                 : 'revision',
  'Mantenimiento'            : 'mantenimiento',
  'Estado'                   : 'estado',
  'Observaciones'            : 'observaciones',
  'Firma'                    : 'firma'
};

// Columnas que deben enviarse como fecha ISO (YYYY-MM-DD)
var DATE_COLUMNS = ['fecha'];

// Cuántas filas explorar al inicio buscando la fila de encabezados
// (la fila 1 suele ser un título/banner, no los encabezados reales).
var HEADER_SEARCH_ROWS = 10;

// ─── Encuentra la fila de encabezados (la que contiene "Reporte ID") ──
//  Devuelve el índice 0-based de esa fila dentro de `data`, o -1.
function findHeaderRow(data) {
  var limit = Math.min(HEADER_SEARCH_ROWS, data.length);
  for (var r = 0; r < limit; r++) {
    var row = data[r];
    for (var c = 0; c < row.length; c++) {
      if (COLUMN_MAP[String(row[c]).trim()] === 'reporte_id') return r;
    }
  }
  return -1;
}

// ─── TRIGGER: instala el disparador onChange (ejecuta UNA vez) ────────
function setupTrigger() {
  // Elimina triggers previos de esta función para no duplicar
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onSheetChange') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create();
  Logger.log('Trigger onChange instalado correctamente.');
}

// ─── DIAGNÓSTICO: ejecuta esto para ver qué lee el script ────────────
//  Muestra: pestañas disponibles, pestaña usada, encabezados detectados,
//  número de filas y si "Reporte ID" coincide con el mapa.
function debugSheet() {
  var ss = SpreadsheetApp.getActive();

  // 1) Lista todas las pestañas del libro
  var tabs = ss.getSheets().map(function (s) {
    return '"' + s.getName() + '" (' + s.getLastRow() + ' filas)';
  });
  Logger.log('PESTAÑAS DISPONIBLES: ' + tabs.join('  |  '));

  // 2) Pestaña que el script intentará usar
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('⚠️ No existe una pestaña llamada "' + SHEET_NAME +
               '". Usando la pestaña activa: "' + ss.getActiveSheet().getName() + '".');
    sheet = ss.getActiveSheet();
  } else {
    Logger.log('Pestaña usada: "' + SHEET_NAME + '"');
  }

  // 3) Detecta la fila de encabezados real (saltando títulos/banners)
  var data = sheet.getDataRange().getValues();
  if (!data.length) { Logger.log('La pestaña está vacía.'); return; }
  var hr = findHeaderRow(data);
  if (hr === -1) {
    Logger.log('❌ NO se encontró "Reporte ID" en las primeras ' + HEADER_SEARCH_ROWS +
               ' filas. Encabezados de la fila 1: ' +
               data[0].map(function (h) { return '[' + h + ']'; }).join(' '));
    return;
  }
  var headers = data[hr];
  Logger.log('Fila de encabezados detectada: fila ' + (hr + 1));
  Logger.log('ENCABEZADOS DETECTADOS (' + headers.length + '): ' +
             headers.map(function (h) { return '[' + h + ']'; }).join(' '));
  Logger.log('FILAS DE DATOS: ' + (data.length - hr - 1));

  // 4) Confirma columnas mapeadas vs. no reconocidas
  var mapped = [], unknown = [];
  headers.forEach(function (h) {
    var key = String(h).trim();
    if (!key) return;
    if (COLUMN_MAP[key]) mapped.push(key); else unknown.push(key);
  });
  Logger.log('✅ Columnas reconocidas (' + mapped.length + '): ' + mapped.join(', '));
  if (unknown.length) Logger.log('⚠️ Columnas NO mapeadas (se ignorarán): ' + unknown.join(', '));
}

// ─── Se ejecuta automáticamente en cada cambio de la hoja ────────────
function onSheetChange(e) {
  try {
    syncAll();
  } catch (err) {
    Logger.log('Error en onSheetChange: ' + err);
  }
}

// ─── Lee toda la hoja y hace upsert en Supabase ──────────────────────
function syncAll() {
  var ss    = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log('Sin filas de datos.'); return; }

  var hr = findHeaderRow(data);
  if (hr === -1) {
    Logger.log('No se encontró la fila de encabezados ("Reporte ID"). Ejecuta debugSheet.');
    return;
  }
  var headers = data[hr];
  var rows    = data.slice(hr + 1);

  var payload = [];
  rows.forEach(function (row) {
    var obj = {};
    headers.forEach(function (h, i) {
      var col = COLUMN_MAP[String(h).trim()];
      if (!col) return;                 // ignora columnas no mapeadas
      var val = row[i];
      if (val === '' || val === null || val === undefined) { obj[col] = null; return; }
      if (DATE_COLUMNS.indexOf(col) !== -1) {
        obj[col] = toISODate(val);
      } else {
        obj[col] = String(val);
      }
    });
    // Solo filas con clave de negocio válida
    if (obj[CONFLICT_COL]) payload.push(obj);
  });

  if (!payload.length) { Logger.log('Nada que sincronizar.'); return; }
  upsertBatch(payload);
}

// ─── POST upsert a Supabase REST ─────────────────────────────────────
function upsertBatch(payload) {
  var url = SUPABASE_URL + '/rest/v1/' + TABLE +
            '?on_conflict=' + CONFLICT_COL;
  var options = {
    method            : 'post',
    contentType       : 'application/json',
    headers           : {
      'apikey'        : SUPABASE_KEY,
      'Authorization' : 'Bearer ' + SUPABASE_KEY,
      'Prefer'        : 'resolution=merge-duplicates,return=minimal'
    },
    payload           : JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var res  = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    Logger.log('Sincronizado OK (' + payload.length + ' filas).');
  } else {
    Logger.log('Error Supabase ' + code + ': ' + res.getContentText());
  }
}

// ─── Convierte un valor de celda a fecha ISO YYYY-MM-DD ──────────────
function toISODate(val) {
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var d = new Date(val);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return null;
}
