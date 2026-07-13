/**
 * manifiestos_form.js
 * Genera e inyecta el formato OFICIAL del Manifiesto (Llegada / Salida, Pasajeros / Carga)
 * dentro de los 4 modales de captura, en blanco y con layout idéntico al documento físico.
 *
 * El layout es el mismo para pasajeros y carga (solo cambia el título / dirección).
 * Cada campo capturable lleva `data-mf="<campo>"` para que el guardado (manifiestos_pax.js)
 * lea por atributo y no por posición.
 */
(function () {
  'use strict';

  // ── Estilos globales del formato oficial (una sola vez) ─────────────────
  function injectStyles() {
    if (document.getElementById('mf-official-styles')) return;
    const css = `
    .mf-official-form .header-title{font-weight:bold;font-size:1.4rem;color:#0c4a6e;margin:0;}
    .mf-official-form .section-box{border:2px solid #0c4a6e;border-radius:8px;padding:0.8rem;margin-bottom:0.8rem;background:transparent;}
    .mf-official-form .section-title{font-weight:bold;text-transform:uppercase;font-size:0.85rem;margin-bottom:0.6rem;color:#0c4a6e;}
    .mf-official-form .form-label{font-size:0.7rem;font-weight:bold;margin-bottom:0;color:#0f172a;text-align:center;width:100%;display:block;}
    .mf-official-form .form-control,.mf-official-form .form-select{border:none;border-bottom:1px solid #0c4a6e;border-radius:0;background:transparent;padding:0.15rem;text-align:center;font-weight:bold;color:#0f172a;height:auto;font-size:0.9rem;}
    .mf-official-form .form-control:focus,.mf-official-form .form-select:focus{background:rgba(255,255,255,0.7);box-shadow:none;border-bottom:2px solid #0284c7;}
    .mf-official-form .sub-label{font-size:0.6rem;color:#475569;text-align:center;display:block;line-height:1.05;}
    .mf-official-form .demora-row{display:flex;align-items:center;gap:.5rem;margin-bottom:0.4rem;}
    .mf-official-form .signature-box{border:2px solid #0c4a6e;border-radius:8px;min-height:120px;display:flex;flex-direction:column;justify-content:space-between;padding:0.5rem;text-align:center;}
    .mf-official-form .signature-line{border-top:1px solid #0c4a6e;width:80%;margin:0 auto;}
    .mf-official-form input[type=number]{-moz-appearance:textfield;appearance:textfield;}
    .mf-official-form input[type=number]::-webkit-outer-spin-button,.mf-official-form input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
    .mf-official-form .mf-embarque-table,.mf-official-form .mf-pax-table{width:100%;border-collapse:collapse;}
    .mf-official-form .mf-embarque-table th,.mf-official-form .mf-pax-table th{font-size:0.58rem;font-weight:bold;color:#0c4a6e;text-align:center;padding:2px;border-bottom:1px solid #0c4a6e;line-height:1.05;}
    .mf-official-form .mf-embarque-table td,.mf-official-form .mf-pax-table td{padding:1px 2px;text-align:center;}
    .mf-official-form .mf-embarque-table .form-control,.mf-official-form .mf-pax-table .form-control{font-size:0.8rem;padding:1px;border-bottom:1px solid #94a3b8;}
    .mf-official-form .mf-pax-table td.lbl{text-align:left;font-weight:bold;font-size:0.62rem;color:#0f172a;white-space:nowrap;}
    .mf-official-form .mf-total-row td{border-top:2px solid #0c4a6e;font-weight:bold;}
    @media print{
      body *{visibility:hidden;}
      .modal.show .manifest-container,.modal.show .manifest-container *{visibility:visible;}
      .modal.show .manifest-container{position:absolute;left:0;top:0;width:100%;margin:0;padding:0;border:none;box-shadow:none;background:#fff !important;}
    }`;
    const style = document.createElement('style');
    style.id = 'mf-official-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Helpers de plantilla ────────────────────────────────────────────────
  const inp = (mf, extra) => `<input type="text" class="form-control" data-mf="${mf}" ${extra || ''}>`;
  const num = (mf) => `<input type="number" min="0" class="form-control" data-mf="${mf}">`;

  // Filas de la tabla EMBARQUE (estación + A/M/I + equipaje/carga/correo)
  function embarqueRows(n) {
    let rows = '';
    for (let i = 1; i <= n; i++) {
      rows += `<tr>
        <td>${inp('emb_estacion_' + i)}</td>
        <td>${num('emb_pax_a_' + i)}</td>
        <td>${num('emb_pax_m_' + i)}</td>
        <td>${num('emb_pax_i_' + i)}</td>
        <td>${num('emb_equipaje_' + i)}</td>
        <td>${num('emb_carga_' + i)}</td>
        <td>${num('emb_correo_' + i)}</td>
      </tr>`;
    }
    return rows;
  }

  // Fila del desglose No. PASAJEROS (Nacional / Internacional)
  const paxRow = (label, base) => `<tr>
    <td class="lbl">${label}</td>
    <td>${num('pax_' + base + '_nac')}</td>
    <td>${num('pax_' + base + '_int')}</td>
  </tr>`;

  // ── Construcción del formulario oficial (en blanco) ─────────────────────
  function buildForm(opts) {
    const title = opts.title;
    const airportLabel = opts.airportLabel;   // AEROPUERTO DE SALIDA / LLEGADA
    const escalaLabel = opts.escalaLabel;     // PRÓXIMA ESCALA / ESCALA ANTERIOR

    return `
    <!-- ENCABEZADO -->
    <div class="row align-items-center mb-3 g-2">
      <div class="col-md-5"><h1 class="header-title">${title}</h1></div>
      <div class="col-md-4 text-center">
        <div class="d-flex align-items-end justify-content-center">
          <span class="me-2 fw-bold" style="font-size:0.8rem;">FECHA</span>
          <input type="text" class="form-control text-center px-1 mx-1" style="width:48px;" placeholder="DD" maxlength="2" data-mf="fecha_dd"> /
          <input type="text" class="form-control text-center px-1 mx-1" style="width:48px;" placeholder="MM" maxlength="2" data-mf="fecha_mm"> /
          <input type="text" class="form-control text-center px-1 mx-1" style="width:70px;" placeholder="AAAA" maxlength="4" data-mf="fecha_yyyy">
        </div>
      </div>
      <div class="col-md-3 text-end">
        <div class="d-flex align-items-end justify-content-end">
          <span class="me-2 fw-bold" style="font-size:0.8rem;">FOLIO</span>
          <input type="text" class="form-control w-50" data-mf="folio">
        </div>
        <span class="sub-label text-end mt-1">Espacio reservado para la Administración</span>
      </div>
    </div>

    <!-- DATOS DEL VUELO -->
    <div class="section-box">
      <div class="row mb-3 g-2">
        <div class="col-md-3">
          <label class="form-label">${airportLabel}</label>
          <input type="text" class="form-control" value="NLU" data-mf="aeropuerto">
          <span class="sub-label">Código 3 Letras</span>
        </div>
        <div class="col-md-3 offset-md-3">
          <label class="form-label">TIPO DE VUELO</label>
          ${inp('tipo_vuelo')}
          <span class="sub-label">Código 2 Letras</span>
        </div>
      </div>

      <div class="row mb-3 g-2 align-items-center">
        <div class="col-md-3"><label class="form-label text-start" style="line-height:1.2;">TRANSPORTISTA /<br>OPERADOR AÉREO</label></div>
        <div class="col-md-2">${inp('transportista_codigo')}<span class="sub-label">Código 3 Letras</span></div>
        <div class="col-md-7">${inp('transportista_nombre')}<span class="sub-label">Nombre o razón social del Transportista u Operador Aéreo</span></div>
      </div>

      <div class="row mb-3 g-2 align-items-center">
        <div class="col-md-1"><label class="form-label text-start mt-2">EQUIPO</label></div>
        <div class="col-md-3">${inp('equipo')}<span class="sub-label">Caracteres Alfanuméricos</span></div>
        <div class="col-md-2"><label class="form-label text-end mt-2">MATRÍCULA</label></div>
        <div class="col-md-3">${inp('matricula')}<span class="sub-label">Marca de Nacionalidad y matrícula completa</span></div>
        <div class="col-md-1"><label class="form-label mt-2">No. VUELO</label></div>
        <div class="col-md-2">${inp('num_vuelo')}</div>
      </div>

      <div class="row g-2 align-items-center">
        <div class="col-md-2"><label class="form-label text-start mt-2" style="line-height:1.2;">PILOTO AL<br>MANDO</label></div>
        <div class="col-md-4">${inp('piloto')}<span class="sub-label">Nombre del comandante de Vuelo</span></div>
        <div class="col-md-1"><label class="form-label mt-2 text-end">No. LIC.</label></div>
        <div class="col-md-2">${inp('licencia')}<span class="sub-label">No. de licencia completo o No. de empleado</span></div>
        <div class="col-md-2"><label class="form-label mt-2 text-end">TRIPULACIÓN</label></div>
        <div class="col-md-1">${inp('tripulacion')}<span class="sub-label" style="font-size:0.55rem;">Pilotos / Sobrec.</span></div>
      </div>
    </div>

    <!-- MOVIMIENTO DE OPERACIONES -->
    <div class="section-box">
      <div class="row">
        <div class="col-md-6 border-end border-dark">
          <h6 class="section-title text-center text-md-start">MOVIMIENTO DE OPERACIONES</h6>
          <div class="row align-items-center mb-2">
            <div class="col-4"><label class="form-label text-start" style="font-size:0.68rem;">ORIGEN DEL VUELO</label></div>
            <div class="col-6">${inp('origen_nombre')}<span class="sub-label">Nombre completo del Aeropuerto</span></div>
            <div class="col-2">${inp('origen_codigo')}<span class="sub-label">Código</span></div>
          </div>
          <div class="row align-items-center mb-2">
            <div class="col-4"><label class="form-label text-start" style="font-size:0.68rem;">${escalaLabel}</label></div>
            <div class="col-6">${inp('escala_nombre')}<span class="sub-label">Nombre completo del Aeropuerto</span></div>
            <div class="col-2">${inp('escala_codigo')}<span class="sub-label">Código</span></div>
          </div>
          <div class="row align-items-center">
            <div class="col-4"><label class="form-label text-start" style="font-size:0.68rem;">DESTINO DEL VUELO</label></div>
            <div class="col-6">${inp('destino_nombre')}<span class="sub-label">Nombre completo del Aeropuerto</span></div>
            <div class="col-2">${inp('destino_codigo')}<span class="sub-label">Código</span></div>
          </div>
        </div>
        <div class="col-md-6 ps-md-4 mt-3 mt-md-0">
          ${timeRow('HORA DE SLOT ASIGNADO', 'hora_slot_asignado')}
          ${timeRow('HORA DE SLOT COORDINADO', 'hora_slot_coordinado')}
          ${timeRow('HORA DE TÉRMINO DE PERNOCTA', 'hora_termino_pernocta')}
          ${timeRow('HORA DE INICIO DE MANIOBRAS DE EMBARQUE', 'hora_inicio_embarque')}
          ${timeRow('HORA DE SALIDA DE LA POSICIÓN', 'hora_salida_posicion')}
        </div>
      </div>
    </div>

    <!-- CAUSA DE LA DEMORA -->
    <div class="section-box">
      <h6 class="section-title text-center">CAUSA DE LA DEMORA</h6>
      <div class="row align-items-start g-3">
        <div class="col-md-4">
          <span class="sub-label text-start" style="font-size:0.68rem;">Desglose cada una de las causas de la Demora incluyendo el tiempo de afectación a cada causa.</span>
        </div>
        <div class="col-md-8">
          ${demoraRow(1)}${demoraRow(2)}${demoraRow(3)}${demoraRow(4)}
          <div class="d-flex gap-2 mt-1">
            <span class="sub-label w-75 text-start">Descripción de la(s) causa(s) de la Demora</span>
            <span class="sub-label" style="width:25%;">Código 3 Letras</span>
          </div>
        </div>
      </div>
    </div>

    <!-- EMBARQUE + No. PASAJEROS -->
    <div class="section-box">
      <div class="row g-3">
        <div class="col-md-7 border-end border-dark">
          <h6 class="section-title text-center">EMBARQUE</h6>
          <table class="mf-embarque-table">
            <thead>
              <tr>
                <th>ESTACIÓN<br><span style="font-weight:400;">Código 3 Letras</span></th>
                <th colspan="3">PASAJEROS<br><span style="font-weight:400;">A&nbsp;&nbsp;M&nbsp;&nbsp;I</span></th>
                <th>EQUIPAJE<br><span style="font-weight:400;">kilogramos</span></th>
                <th>CARGA<br><span style="font-weight:400;">kilogramos</span></th>
                <th>CORREO<br><span style="font-weight:400;">kilogramos</span></th>
              </tr>
            </thead>
            <tbody>
              ${embarqueRows(6)}
              <tr class="mf-total-row">
                <td class="lbl" style="text-align:center;">TOTAL</td>
                <td>${num('emb_total_a')}</td>
                <td>${num('emb_total_m')}</td>
                <td>${num('emb_total_i')}</td>
                <td>${num('emb_total_equipaje')}</td>
                <td>${num('emb_total_carga')}</td>
                <td>${num('emb_total_correo')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="col-md-5">
          <h6 class="section-title text-center">No. PASAJEROS</h6>
          <table class="mf-pax-table">
            <thead>
              <tr><th></th><th>NACIONAL</th><th>INTERNAC.</th></tr>
            </thead>
            <tbody>
              ${paxRow('PAGAN TUA', 'tua')}
              ${paxRow('DIPLOMÁTICOS', 'dip')}
              ${paxRow('EN COMISIÓN', 'com')}
              ${paxRow('INFANTES', 'inf')}
              ${paxRow('TRÁNSITOS', 'tra')}
              ${paxRow('CONEXIONES', 'con')}
              ${paxRow('OTROS EXENTOS', 'exe')}
              <tr class="mf-total-row">
                <td class="lbl" style="text-align:center;">TOTAL</td>
                <td>${num('pax_tot_nac')}</td>
                <td>${num('pax_tot_int')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- OBSERVACIONES + PAX DNI -->
    <div class="section-box">
      <div class="row g-3 align-items-start">
        <div class="col-md-9">
          <h6 class="section-title text-center mb-2">OBSERVACIONES</h6>
          <textarea class="form-control border-0" rows="2" style="resize:none;text-align:left;font-weight:normal;background:transparent;" placeholder="Escriba sus observaciones aquí..." data-mf="observaciones"></textarea>
        </div>
        <div class="col-md-3 text-center">
          <label class="form-label">PAX DNI</label>
          ${num('pax_dni')}
        </div>
      </div>
    </div>

    <!-- FIRMAS Y SELLOS -->
    <div class="row g-3">
      <div class="col-md-4">
        <div class="signature-box" style="padding-top:1rem;">
          <span class="form-label" style="font-size:0.63rem;line-height:1.2;">TRANSPORTISTA / OPERADOR AÉREO<br>ELABORADO POR</span>
          <div class="mt-auto pb-2">
            <div class="signature-line"></div>
            <input type="text" class="form-control text-center p-0 m-0 border-0 bg-transparent fw-bold text-dark mt-1" style="font-size:0.8rem;box-shadow:none;" placeholder="Nombre completo" data-mf="firma_elaboro">
            <span class="sub-label d-block text-center" style="font-size:0.55rem;">Nombre y Firma</span>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="signature-box" style="padding-top:1rem;">
          <span class="form-label" style="font-size:0.63rem;line-height:1.2;">ADMINISTRACIÓN AEROPUERTO<br>RECIBIDO POR</span>
          <div class="mt-auto pb-2">
            <div class="signature-line"></div>
            <span class="sub-label mt-1" style="font-size:0.55rem;">Sello, Firma y Fecha</span>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="signature-box" style="padding-top:1rem;">
          <span class="form-label" style="font-size:0.63rem;line-height:1.2;">COMANDANCIA AEROPUERTO<br>RECIBIDO POR</span>
          <div class="mt-auto pb-2">
            <div class="signature-line"></div>
            <span class="sub-label mt-1" style="font-size:0.55rem;">Sello, Firma y Fecha</span>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-3">
      <span class="sub-label text-dark" style="font-size:0.5rem;letter-spacing:0.5px;">
        DOCUMENTO DE CARÁCTER LEGAL EN EL QUE EL TRANSPORTISTA U OPERADOR AÉREO MANIFIESTA QUE LA INFORMACIÓN QUE CONTIENE ES CORRECTA<br>Y CORRESPONDE A LOS DATOS DEL MANIFIESTO DE DESPACHO DE LA AERONAVE.
      </span>
    </div>`;
  }

  function timeRow(label, mf) {
    return `<div class="row mb-2 align-items-center">
      <div class="col-8"><label class="form-label text-start mt-1" style="font-size:0.68rem;">${label}</label></div>
      <div class="col-4">${inp(mf)}<span class="sub-label">Hr. Local</span></div>
    </div>`;
  }

  function demoraRow(i) {
    return `<div class="demora-row">
      ${inp('demora' + i + '_desc', 'style="width:75%;"')}
      <div style="width:25%;">${inp('demora' + i + '_cod')}</div>
    </div>`;
  }

  // ── Inyección en los 4 modales ──────────────────────────────────────────
  const MODALS = [
    { id: 'modalManifiestoLlegada',      title: 'MANIFIESTO DE LLEGADA',          airportLabel: 'AEROPUERTO DE LLEGADA', escalaLabel: 'ESCALA ANTERIOR' },
    { id: 'modalManifiestoSalida',       title: 'MANIFIESTO DE SALIDA',           airportLabel: 'AEROPUERTO DE SALIDA',  escalaLabel: 'PRÓXIMA ESCALA' },
    { id: 'modalManifiestoLlegadaCarga', title: 'MANIFIESTO DE LLEGADA (CARGA)',  airportLabel: 'AEROPUERTO DE LLEGADA', escalaLabel: 'ESCALA ANTERIOR' },
    { id: 'modalManifiestoSalidaCarga',  title: 'MANIFIESTO DE SALIDA (CARGA)',   airportLabel: 'AEROPUERTO DE SALIDA',  escalaLabel: 'PRÓXIMA ESCALA' }
  ];

  function render() {
    injectStyles();
    MODALS.forEach(cfg => {
      const modal = document.getElementById(cfg.id);
      if (!modal) return;
      const container = modal.querySelector('.manifest-container');
      if (!container) return;
      container.classList.add('mf-official-form');
      container.innerHTML = buildForm(cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
