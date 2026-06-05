/**
 * Configuración del panel FIDS en OpsWall
 *
 * Edita FIDS_IFRAME_URL con la URL del tablero de vuelos que quieras mostrar
 * en el cuarto cuadrante de la pantalla.
 *
 * Ejemplos:
 *   'https://ams-prd-haproxy.nlu.mx/fids/'
 *   'https://ams-prd-haproxy.nlu.mx/fids/displays/departures?hopo=MMSM'
 *   'http://localhost:8080/tablero-vuelos'
 *
 * Si dejas FIDS_IFRAME_URL vacío (''), el cuarto cuadrante mostrará
 * el Calendario de Rutas como antes.
 */

window.FIDS_IFRAME_URL   = '';          // ← Pon aquí la URL del tablero FIDS
window.FIDS_PANEL_TITLE  = 'Tablero FIDS';
window.FIDS_PANEL_ICON   = 'fas fa-plane-departure';

/**
 * Tiempo en segundos que se muestra el FIDS antes de hacer auto-refresh.
 * 0 = sin auto-refresh.
 */
window.FIDS_REFRESH_SECS = 120;
