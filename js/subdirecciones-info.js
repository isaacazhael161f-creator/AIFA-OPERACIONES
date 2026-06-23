// ═══════════════════════════════════════════════════════════════════
//  INFO DE ÁREAS (Subdirecciones / Dirección) — js/subdirecciones-info.js
//  Relaciona las tarjetas del sidebar (.si-grp-lbl--info) con el
//  organigrama almacenado en la tabla `areas` (Supabase).
//
//  Comportamiento:
//   • Al hacer clic en una etiqueta con [data-area-clave], se abre un
//     modal que ubica esa área dentro del organigrama (ancestros + hijos).
//   • SÓLO se muestran las áreas que ya existen en la tabla `areas`.
//     Conforme se vayan construyendo y agregando a la tabla, irán
//     apareciendo automáticamente en el modal. Si un área aún no está
//     en la tabla, se muestra un estado "en construcción".
// ═══════════════════════════════════════════════════════════════════
;(function () {
    'use strict';

    const MODAL_ID = 'si-area-info-modal';
    let _areasCache = null;     // arreglo de áreas cargado desde la tabla
    let _loadingPromise = null; // evita cargas duplicadas en paralelo

    // Imágenes ya existentes en el sistema usadas como banner de la cabecera
    // cuando el área no tiene `imagen_url` propia en `area_detalles`.
    const FALLBACK_IMG = {
        'DO':     'images/pistas_aifa.jpg',
        'SD-SO':  'images/torre.jpg',
        'SD-SA':  'images/mujer-bandera.png',
        'SD-SC':  'images/Aeronaves%20carga.jpg',
        'SD-ING': 'images/nlu-operacion.png',
        'SGE':    'images/fondo-aifa.jpg'
    };
    const FALLBACK_IMG_DEFAULT = 'images/fondo-aifa.jpg';

    function _bannerImg(clave, imagenUrl) {
        if (imagenUrl) return imagenUrl;
        const key = String(clave || '').trim().toUpperCase();
        return FALLBACK_IMG[key] || FALLBACK_IMG_DEFAULT;
    }

    /* ── Supabase helper ──────────────────────────────────────────── */
    async function _sb() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof window.ensureSupabaseClient === 'function') {
            try { return await window.ensureSupabaseClient(); } catch (_) { /* noop */ }
        }
        return window.supabaseClient || window._supabase || null;
    }

    /* ── Carga (lazy + caché) del organigrama desde la tabla `areas` ── */
    async function _loadAreas(force) {
        if (_areasCache && !force) return _areasCache;
        if (_loadingPromise && !force) return _loadingPromise;

        _loadingPromise = (async () => {
            const sb = await _sb();
            if (!sb) return null; // sin conexión (p.ej. file://) → no se puede consultar
            const { data, error } = await sb
                .from('areas')
                .select('id, clave, nombre, nivel, parent_area_id, color_hex, estado, orden_visualizacion')
                .eq('estado', 'ACTIVO')
                .order('nivel', { ascending: true, nullsLast: true })
                .order('orden_visualizacion', { ascending: true, nullsLast: true });
            if (error) { console.warn('[areaInfo] error cargando areas:', error.message); return null; }
            _areasCache = data || [];
            return _areasCache;
        })();

        try { return await _loadingPromise; }
        finally { _loadingPromise = null; }
    }

    /* ── Carga del contenido institucional del área ───────────────────
       area_detalles (1:1): titulo, resumen, imagen_url
       area_datos    (1:N): grupo / etiqueta / valor / unidad / orden
    ----------------------------------------------------------------- */
    async function _loadAreaContent(areaId) {
        const sb = await _sb();
        if (!sb || !areaId) return { detalle: null, datos: [] };
        const [detRes, datRes] = await Promise.all([
            sb.from('area_detalles')
                .select('titulo, resumen, imagen_url, estado')
                .eq('area_id', areaId)
                .eq('estado', 'ACTIVO')
                .maybeSingle(),
            sb.from('area_datos')
                .select('grupo, etiqueta, valor, unidad, orden')
                .eq('area_id', areaId)
                .eq('estado', 'ACTIVO')
                .order('grupo', { ascending: true, nullsFirst: true })
                .order('orden', { ascending: true })
        ]);
        if (detRes.error) console.warn('[areaInfo] area_detalles:', detRes.error.message);
        if (datRes.error) console.warn('[areaInfo] area_datos:', datRes.error.message);
        return { detalle: detRes.data || null, datos: datRes.data || [] };
    }

    /* ── Utilidades ───────────────────────────────────────────────── */
    function _escape(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _byClave(areas, clave) {
        if (!areas || !clave) return null;
        const norm = String(clave).trim().toUpperCase();
        return areas.find(a => String(a.clave || '').trim().toUpperCase() === norm) || null;
    }

    // Agrupa los datos por su campo `grupo` preservando el orden de llegada.
    function _groupDatos(datos) {
        const groups = [];
        const index = new Map();
        (datos || []).forEach(d => {
            const key = d.grupo || '';
            if (!index.has(key)) { index.set(key, { grupo: d.grupo || '', items: [] }); groups.push(index.get(key)); }
            index.get(key).items.push(d);
        });
        return groups;
    }

    /* ── Cabecera tipo banner (basada en los modales semanales) ────── */
    function _headHtml(opts) {
        opts = opts || {};
        const bg = opts.img ? `background-image:url('${_escape(opts.img)}')` : '';
        const icon = _escape(opts.icon || 'fas fa-sitemap');
        return `
            <div class="aim-head" style="${bg}">
                <span class="aim-head-overlay" aria-hidden="true"></span>
                <span class="aim-head-icon"><i class="${icon}"></i></span>
                <div class="aim-head-text">
                    <span class="aim-tag">${_escape(opts.clave || '')}</span>
                    <span class="aim-title">${_escape(opts.title || '')}</span>
                </div>
                <button type="button" class="aim-close" data-bs-dismiss="modal" aria-label="Cerrar"><i class="fas fa-times"></i></button>
            </div>`;
    }

    /* ── Construcción del cuerpo del modal ────────────────────────── */
    function _buildBody(area, clave, nombre, content) {
        content = content || { detalle: null, datos: [] };

        // Área aún no construida en la tabla → estado "en construcción".
        if (!area) {
            return `
                <div class="aim-body aim-empty">
                    <div class="aim-empty-icon"><i class="fas fa-hard-hat"></i></div>
                    <p class="aim-empty-txt">
                        Esta área todavía no está dada de alta en el organigrama.
                        Aparecerá aquí en cuanto se construya y se registre en la tabla de áreas.
                    </p>
                </div>`;
        }

        const det   = content.detalle;
        const datos = content.datos || [];

        const resumenHtml = (det && det.resumen)
            ? `<p class="aim-resumen">${_escape(det.resumen)}</p>`
            : '';

        // ── Datos (etiqueta / valor) agrupados, en rejilla de 2 columnas ─
        let datosHtml;
        if (datos.length) {
            datosHtml = _groupDatos(datos).map(g => {
                const grupoTitle = g.grupo
                    ? `<div class="aim-group-title"><i class="fas fa-layer-group me-1"></i>${_escape(g.grupo)}</div>`
                    : '';
                const rows = g.items.map(d => {
                    const unidad = d.unidad ? ` <span class="aim-data-unit">${_escape(d.unidad)}</span>` : '';
                    return `
                        <div class="aim-data-row">
                            <span class="aim-data-label">${_escape(d.etiqueta)}</span>
                            <span class="aim-data-val">${_escape(d.valor)}${unidad}</span>
                        </div>`;
                }).join('');
                return `${grupoTitle}<div class="aim-data-grid">${rows}</div>`;
            }).join('');
        } else {
            datosHtml = `
                <div class="aim-nodata">
                    <i class="fas fa-info-circle me-1"></i>Aún no hay datos registrados para esta área.
                </div>`;
        }

        return `<div class="aim-body">${resumenHtml}${datosHtml}</div>`;
    }

    /* ── Modal (creado una sola vez, de forma dinámica) ───────────── */
    function _ensureModal() {
        let el = document.getElementById(MODAL_ID);
        if (el) return el;
        el = document.createElement('div');
        el.className = 'modal fade aim-modal';
        el.id = MODAL_ID;
        el.tabIndex = -1;
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content aim-content" id="si-area-info-content"></div>
            </div>`;
        document.body.appendChild(el);
        return el;
    }

    async function _openModal(clave, nombre, icon) {
        const modalEl   = _ensureModal();
        const contentEl = document.getElementById('si-area-info-content');
        if (!contentEl) return;

        contentEl.style.setProperty('--aim-accent', '#3b82f6');

        // Estado de carga (cabecera con datos del trigger + banner de respaldo).
        contentEl.innerHTML =
            _headHtml({ clave, title: nombre || clave, icon, img: _bannerImg(clave) }) +
            `<div class="aim-body"><div class="aim-loading"><i class="fas fa-spinner fa-spin me-2"></i>Cargando información…</div></div>`;

        if (window.bootstrap && bootstrap.Modal) {
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }

        const areas = await _loadAreas();
        if (!contentEl.isConnected) return;

        if (!areas) {
            contentEl.innerHTML =
                _headHtml({ clave, title: nombre || clave, icon, img: _bannerImg(clave) }) +
                `<div class="aim-body aim-empty">
                    <div class="aim-empty-icon"><i class="fas fa-wifi"></i></div>
                    <p class="aim-empty-txt">No se pudo consultar la información. Inicia sesión y revisa la conexión.</p>
                </div>`;
            return;
        }

        const area    = _byClave(areas, clave);
        const content = area ? await _loadAreaContent(area.id) : { detalle: null, datos: [] };
        if (!contentEl.isConnected) return;

        const color  = area && area.color_hex ? area.color_hex : '#475569';
        const titulo = (content.detalle && content.detalle.titulo)
            ? content.detalle.titulo
            : (area ? area.nombre : (nombre || clave));
        const img    = _bannerImg(clave, content.detalle && content.detalle.imagen_url);

        contentEl.style.setProperty('--aim-accent', color);
        contentEl.innerHTML =
            _headHtml({ clave, title: titulo, icon, img }) +
            _buildBody(area, clave, nombre, content);
    }

    /* ── Delegación de clics en las etiquetas de las tarjetas ─────── */
    function _onClick(ev) {
        const trigger = ev.target.closest('.si-grp-lbl--info[data-area-clave]');
        if (!trigger) return;
        ev.preventDefault();
        ev.stopPropagation();
        const clave  = trigger.getAttribute('data-area-clave') || '';
        const nombre = trigger.getAttribute('data-area-nombre') || '';
        // Reutiliza el ícono de la tarjeta del sidebar para la cabecera.
        const btn    = trigger.closest('.si-grp-btn');
        const iconEl = btn ? btn.querySelector('.si-sub-ico, .si-ger-ico') : null;
        const icon   = iconEl ? iconEl.getAttribute('class') : '';
        _openModal(clave, nombre, icon);
    }

    function _init() {
        // Listener delegado: cubre etiquetas presentes y futuras.
        document.addEventListener('click', _onClick, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    // API mínima por si se necesita abrir desde otro módulo.
    window.areaInfoModal = { open: _openModal, reload: () => _loadAreas(true) };
})();
