document.addEventListener('DOMContentLoaded', () => {

    const parseModalData = (modalId) => {
        const inputs = document.querySelectorAll(`${modalId} input, ${modalId} select`);
        return Array.from(inputs).map(el => el.value);
    };

    const generateAndUploadManifestPDF = async (payload, recordId, modalSelector) => {
        try {
            if (!window.html2pdf) {
                console.warn("html2pdf no está disponible, no se puede generar el PDF automáticamente.");
                return null;
            }

            const element = document.querySelector(modalSelector + ' .manifest-container');
            if (!element) {
                console.warn("No se encontró el contenedor visual del manifiesto.");
                return null;
            }

            // Clonar para evitar recortes por el scroll del modal
            const clone = element.cloneNode(true);
            const originalInputs = element.querySelectorAll('input, select, textarea');
            const cloneInputs = clone.querySelectorAll('input, select, textarea');

            originalInputs.forEach((orig, index) => {
                let val = '';
                if (orig.tagName === 'SELECT') {
                    const sel = orig.options[orig.selectedIndex];
                    val = (sel && sel.text !== 'Selecciones...' && sel.text !== 'Seleccione...') ? sel.text : '';
                } else if (orig.tagName === 'INPUT' && (orig.type === 'radio' || orig.type === 'checkbox')) {
                    val = orig.checked ? 'X' : ''; // simplified check
                } else {
                    val = orig.value;
                }
                
                const span = document.createElement('span');
                // Intentamos replicar estilos básicos visuales fijos para que no dependa del agente
                const styles = window.getComputedStyle(orig);
                span.style.cssText = styles.cssText;
                span.style.display = 'inline-block';
                span.style.border = 'none';
                span.style.backgroundColor = 'transparent';
                span.style.color = '#000';
                span.style.fontWeight = 'bold';
                span.style.minHeight = '24px';
                span.style.minWidth = '30px';
                span.style.padding = '0 5px';
                span.textContent = val;
                
                if (cloneInputs[index] && cloneInputs[index].parentNode) {
                    cloneInputs[index].parentNode.replaceChild(span, cloneInputs[index]);
                }
            });

// Mostrar overlay de carga en toda la pantalla
            const loader = document.createElement('div');
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#ffffff;z-index:999999;display:flex;flex-direction:column;justify-content:center;align-items:center;';
            loader.innerHTML = '<h2 style="color:#22543d; font-family:sans-serif;">Generando PDF interactivo...</h2><p>Por favor, no cierre la ventana.</p>';
            document.body.appendChild(loader);

            // Envolvemos al clon para asegurar que respete el grid de Bootstrap
            const wrapper = document.createElement('div');
            // Usamos un ancho de 1000px que mantiene el formato PC sin verse diminuto en hoja vertical
            wrapper.style.cssText = 'position:absolute; top:0; left:0; width:1000px; z-index:999998; background:white; padding:10px;';

            const modalBodySim = document.createElement('div');
            modalBodySim.className = 'modal-body';

            clone.style.position = 'relative';
            clone.style.width = '100%';
            clone.style.top = 'auto';
            clone.style.left = 'auto';
            clone.style.backgroundColor = element.style.backgroundColor || '#e2fce6';

            modalBodySim.appendChild(clone);
            wrapper.appendChild(modalBodySim);
            document.body.appendChild(wrapper);

            // Dar respiro para renderizado
            await new Promise(r => setTimeout(r, 600));

            const opt = {
                margin: 10,
                filename: `manifiesto_${payload.vuelo || 'desconocido'}.pdf`,   
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 1000
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }   
            };

            const pdfBlob = await window.html2pdf().set(opt).from(clone).outputPdf('blob');
            
            document.body.removeChild(wrapper);
            document.body.removeChild(loader);

            const fileName = `manifiesto_${payload.tipo.toLowerCase()}_${payload.vuelo || 'NA'}_${Date.now()}.pdf`;
            
            // Subir a Supabase Storage
            const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                .from('manifiestos_pdfs')
                .upload(fileName, pdfBlob, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                console.warn('Advertencia: No se pudo subir el PDF...', uploadError);
                return null;
            }

            // Obtener enlace público
            const { data: publicUrlData } = window.supabaseClient.storage
                .from('manifiestos_pdfs')
                .getPublicUrl(fileName);

            // Actualizar la fila recién insertada en manifiestos_pasajeros
            if (recordId && publicUrlData?.publicUrl) {
                await window.supabaseClient
                    .from('manifiestos_pasajeros')
                    .update({ pdf_url: publicUrlData.publicUrl })
                    .eq('id', recordId);
                return publicUrlData.publicUrl;
            }

            return publicUrlData?.publicUrl || null;
        } catch (e) {
            console.error('Error al generar o subir el PDF:', e);
            return null;
        }
    };

    const syncToConciliacion = async (payload, pdfUrl = '') => {
        try {
            const _isNac = (code) => {
                if (!code) return false;
                const c = String(code).trim().toUpperCase();
                if (c === 'NLU' || c === 'MEX' || c === 'TLC' || c === 'AIFA' || c === 'MMSM') return true;
                if (/^MM[A-Z]{2}$/.test(c)) return true;
                const mx = new Set(['ACA','AGU','BJX','CME','CPE','CUN','CTM','CJS','CVA','CUL','CZA','CUU','CYW','CEN','DGO','GDL','GYM','HMO','HUX','JAL','LAP','LMM','LTO','ZLO','SJD','MAM','MTT','MXL','MTY','OAX','PQM','PBC','PDS','PAZ','PRX','QRO','REX','SLW','TAM','TAP','TGZ','TIJ','TPQ','TRC','UPN','UPA','UKE','VER','VSA','ZCL','ZIH','ZLC']);
                return mx.has(c);
            };

            const locs = [payload.aeropuerto_origen, payload.oaci_origen, payload.aeropuerto_escala, payload.oaci_escala, payload.aeropuerto_llegada_salida, payload.origen_destino].filter(Boolean);
            const otherLocs = locs.filter(l => { const sl = String(l).trim().toUpperCase(); return sl !== 'NLU' && sl !== 'AIFA' && sl !== 'MMSM'; });
            let tipoOperacion = 'Internacional';
            if (otherLocs.length > 0 && otherLocs.every(l => _isNac(l))) tipoOperacion = 'Nacional';
            if (otherLocs.length === 0) tipoOperacion = 'Nacional';

            let formattedFecha = '';
            if (payload.fecha) {
                formattedFecha = payload.fecha.includes('-') ? payload.fecha.split('-').reverse().join('/') : payload.fecha;
            }
            const monthStr = payload.fecha ? parseInt(payload.fecha.split('-')[1], 10) : '';

            const pConci = {
                'TIPO DE MANIFIESTO': payload.tipo,
                '# DE VUELO': payload.vuelo || '',
                'AEROLINEA': payload.aerolinea || '',
                'AERONAVE': payload.tipo_aeronave || '',
                'MATRÍCULA': payload.matricula || '',
                'DESTINO / ORIGEN': payload.aeropuerto_origen || payload.oaci_origen || payload.aeropuerto_escala || payload.aeropuerto_llegada_salida || '',
                'FECHA': formattedFecha,
                'MES': isNaN(monthStr) ? null : monthStr,
                'HR. DE INICIO O TERMINO DE PERNOCTA': '',
                'HR. MÁXIMA DE ENTREGA': '',
                'HR. DE EMBARQUE O DESEMBARQUE': payload.h_puerta || '',
                'HR. DE OPERACIÓN': payload.h_calzos || payload.hora_operacion || '',
                'SLOT ASIGNADO': payload.h_itin || payload.slot_asig || '',  
                'SLOT COORDINADO': '',
                'TOTAL PAX': payload.pasajeros_total || 0,
                'TIPO DE OPERACIÓN': tipoOperacion,
                'INFANTES': payload.pasajeros_infantes || 0,
                'CÓDIGO DEMORA': payload.demora1_codigo || null,
                'OBSERVACIONES': payload.motivo_demora || null,
                'EVIDENCIA': pdfUrl // Columna del PDF
            };

            await window.supabaseClient.from('Conciliación Manifiestos').insert([pConci]);
        } catch (ec) {
            console.error('Error al sincronizar con Conciliación Manifiestos:', ec);
        }
    };

    // --- LLEGADAS ---
    const btnLlegada = document.getElementById('btn-save-manifiesto-llegada');
    if (btnLlegada) {
        btnLlegada.addEventListener('click', async () => {
            if (!window.supabaseClient) {
                alert("Error: Supabase no está inicializado.");
                return;
            }
            
            const btnOriginalText = btnLlegada.innerHTML;
            btnLlegada.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            btnLlegada.disabled = true;
            
            try {
                const vals = parseModalData('#modalManifiestoLlegada');
                
                const yyyy = vals[2] || new Date().getFullYear();
                const mm = vals[1] || '01';
                const dd = vals[0] || '01';
                let fecha = `${yyyy}-${mm}-${dd}`;
                if (fecha.includes('AAAA') || fecha.includes('MM')) fecha = null;

                const payload = {
                    tipo: 'Llegada',
                    folio: vals[3] || null,
                    fecha: fecha,

                    aeropuerto_llegada_salida: vals[4] || null,
                    clase_servicio: vals[5] || null,
                    explotador: vals[6] || null,
                    aerolinea: vals[7] || null,
                    tipo_aeronave: vals[8] || null,
                    matricula: vals[9] || null,
                    vuelo: vals[10] || null,
                    comandante: vals[11] || null,
                    num_licencia: vals[12] || null,
                    tripulacion_ps: vals[13] || null,

                    aeropuerto_origen: vals[14] || null,
                    oaci_origen: vals[15] || null,
                    aeropuerto_escala: vals[16] || null,
                    oaci_escala: vals[17] || null,

                    h_itin: vals[18] || null,
                    h_real: vals[19] || null,
                    h_calzos: vals[20] || null,
                    h_puerta: vals[21] || null,
                    posicion: vals[22] || null,
                    motivo_demora: vals[23] || null,
                    fbo: vals[24] || null,

                    demora1_codigo: vals[25] || null,
                    demora1_tiempo: vals[26] || null,
                    demora2_codigo: vals[27] || null,
                    demora2_tiempo: vals[28] || null,

                    pasajeros_primera: parseInt(vals[29]) || 0,
                    pasajeros_turista: parseInt(vals[30]) || 0,
                    pasajeros_menores: parseInt(vals[31]) || 0,
                    pasajeros_infantes: parseInt(vals[32]) || 0,
                    pasajeros_tercera_edad: parseInt(vals[33]) || 0,
                    pasajeros_discapacitados: parseInt(vals[34]) || 0,
                    pasajeros_total: parseInt(vals[35]) || 0,

                    firma_elaboro: vals[36] || null
                };
                
                const { data, error } = await window.supabaseClient
                    .from('manifiestos_pasajeros')
                    .insert([payload])
                    .select('id, vuelo');
                    
                if (error) throw error;

                let pdfUrl = null;
                if (data && data.length > 0) {
                    pdfUrl = await generateAndUploadManifestPDF(payload, data[0].id, '#modalManifiestoLlegada');
                }

                await syncToConciliacion(payload, pdfUrl);

                if(window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalManifiestoLlegada'));
                    if(modal) modal.hide();
                }
                
            } catch (err) {
                console.error("Error guardando manifiesto llegada:", err);
                alert("Ocurrió un error al guardar el manifiesto: " + err.message);
            } finally {
                btnLlegada.innerHTML = btnOriginalText;
                btnLlegada.disabled = false;
            }
        });
    }

    // --- SALIDAS ---
    const btnSalida = document.getElementById('btn-save-manifiesto-salida');
    if (btnSalida) {
        btnSalida.addEventListener('click', async () => {
            if (!window.supabaseClient) {
                alert("Error: Supabase no está inicializado.");
                return;
            }
            
            const btnOriginalText = btnSalida.innerHTML;
            btnSalida.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            btnSalida.disabled = true;
            
            try {
                const vals = parseModalData('#modalManifiestoSalida');
                
                const yyyy = vals[2] || new Date().getFullYear();
                const mm = vals[1] || '01';
                const dd = vals[0] || '01';
                let fecha = `${yyyy}-${mm}-${dd}`;
                if (fecha.includes('AAAA') || fecha.includes('MM')) fecha = null;

                const payload = {
                    tipo: 'Salida',
                    folio: vals[3] || null,
                    fecha: fecha,

                    aeropuerto_llegada_salida: vals[4] || null,
                    clase_servicio: vals[5] || null,
                    explotador: vals[6] || null,
                    aerolinea: vals[7] || null,
                    tipo_aeronave: vals[8] || null,
                    matricula: vals[9] || null,
                    vuelo: vals[10] || null,
                    comandante: vals[11] || null,
                    num_licencia: vals[12] || null,
                    tripulacion_ps: vals[13] || null,

                    aeropuerto_origen: vals[14] || null,
                    oaci_origen: vals[15] || null,
                    aeropuerto_escala: vals[16] || null,
                    oaci_escala: vals[17] || null,

                    h_itin: vals[18] || null,
                    h_real: vals[19] || null,
                    h_calzos: vals[20] || null,
                    h_puerta: vals[21] || null,
                    posicion: vals[22] || null,
                    motivo_demora: vals[23] || null,
                    fbo: vals[24] || null,

                    demora1_codigo: vals[25] || null,
                    demora1_tiempo: vals[26] || null,
                    demora2_codigo: vals[27] || null,
                    demora2_tiempo: vals[28] || null,

                    pasajeros_primera: parseInt(vals[29]) || 0,
                    pasajeros_turista: parseInt(vals[30]) || 0,
                    pasajeros_menores: parseInt(vals[31]) || 0,
                    pasajeros_infantes: parseInt(vals[32]) || 0,
                    pasajeros_tercera_edad: parseInt(vals[33]) || 0,
                    pasajeros_discapacitados: parseInt(vals[34]) || 0,
                    pasajeros_total: parseInt(vals[35]) || 0,

                    firma_elaboro: vals[36] || null
                };
                
                const { data, error } = await window.supabaseClient
                    .from('manifiestos_pasajeros')
                    .insert([payload])
                    .select('id, vuelo');
                    
                if (error) throw error;

                let pdfUrl = null;
                if (data && data.length > 0) {
                    pdfUrl = await generateAndUploadManifestPDF(payload, data[0].id, '#modalManifiestoSalida');
                }

                await syncToConciliacion(payload, pdfUrl);

                if(window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalManifiestoSalida'));
                    if(modal) modal.hide();
                }
                
            } catch (err) {
                console.error("Error guardando manifiesto salida:", err);
                alert("Ocurrió un error al guardar el manifiesto: " + err.message);
            } finally {
                btnSalida.innerHTML = btnOriginalText;
                btnSalida.disabled = false;
            }
        });
    }
});
