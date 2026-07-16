document.addEventListener('DOMContentLoaded', () => {

    // Lee todos los campos del modal indexados por su atributo data-mf.
    const readFields = (modalId) => {
        const out = {};
        document.querySelectorAll(`${modalId} [data-mf]`).forEach(el => {
            const key = el.getAttribute('data-mf');
            if (!key) return;
            let val;
            if (el.type === 'checkbox' || el.type === 'radio') val = el.checked ? (el.value || 'X') : '';
            else val = el.value;
            out[key] = (val == null) ? '' : String(val).trim();
        });
        return out;
    };

    const n = (v) => parseInt(v, 10) || 0;

    // Construye el payload para la tabla `manifiestos_pasajeros` a partir de los
    // campos del formato oficial. Solo se usan columnas ya existentes en la tabla;
    // el detalle extra (embarque por estación, desglose nac/int, destino, etc.)
    // queda plasmado en el PDF/visual.
    const buildPayload = (f, tipo) => {
        const dd = f.fecha_dd || '';
        const mm = f.fecha_mm || '';
        const yyyy = f.fecha_yyyy || '';
        let fecha = `${yyyy}-${mm}-${dd}`;
        if (!yyyy || !mm || !dd || fecha.includes('AAAA') || fecha.includes('MM')) fecha = null;

        const tua = n(f.pax_tua_nac) + n(f.pax_tua_int);
        const infantes = n(f.pax_inf_nac) + n(f.pax_inf_int);
        const exentos = n(f.pax_dip_nac) + n(f.pax_dip_int)
            + n(f.pax_com_nac) + n(f.pax_com_int)
            + n(f.pax_tra_nac) + n(f.pax_tra_int)
            + n(f.pax_con_nac) + n(f.pax_con_int)
            + n(f.pax_exe_nac) + n(f.pax_exe_int);
        let total = n(f.pax_tot_nac) + n(f.pax_tot_int);
        if (!total) total = tua + infantes + exentos;

        return {
            tipo: tipo,
            folio: f.folio || null,
            fecha: fecha,

            aeropuerto_llegada_salida: f.aeropuerto || null,
            clase_servicio: f.tipo_vuelo || null,
            explotador: f.transportista_codigo || null,
            aerolinea: f.transportista_nombre || null,
            tipo_aeronave: f.equipo || null,
            matricula: f.matricula || null,
            vuelo: f.num_vuelo || null,
            comandante: f.piloto || null,
            num_licencia: f.licencia || null,
            tripulacion_ps: f.tripulacion || null,

            aeropuerto_origen: f.origen_nombre || null,
            oaci_origen: f.origen_codigo || null,
            aeropuerto_escala: f.escala_nombre || null,
            oaci_escala: f.escala_codigo || null,
            aeropuerto_destino: f.destino_nombre || null,
            oaci_destino: f.destino_codigo || null,

            h_itin: f.hora_slot_asignado || null,
            h_real: f.hora_slot_coordinado || null,
            h_calzos: f.hora_termino_pernocta || null,
            h_puerta: f.hora_inicio_embarque || null,
            posicion: f.hora_salida_posicion || null,

            motivo_demora: f.demora1_desc || null,
            demora1_codigo: f.demora1_cod || null,
            demora2_codigo: f.demora2_cod || null,

            kgs_equipaje: parseFloat(f.embarque_kgs_equipaje) || 0,
            kgs_carga: parseFloat(f.embarque_kgs_carga) || 0,
            kgs_correo: parseFloat(f.embarque_kgs_correo) || 0,

            pax_tua_nac: n(f.pax_tua_nac),
            pax_tua_int: n(f.pax_tua_int),
            pax_dip_nac: n(f.pax_dip_nac),
            pax_dip_int: n(f.pax_dip_int),
            pax_com_nac: n(f.pax_com_nac),
            pax_com_int: n(f.pax_com_int),
            pax_inf_nac: n(f.pax_inf_nac),
            pax_inf_int: n(f.pax_inf_int),
            pax_tra_nac: n(f.pax_tra_nac),
            pax_tra_int: n(f.pax_tra_int),
            pax_con_nac: n(f.pax_con_nac),
            pax_con_int: n(f.pax_con_int),
            pax_exe_nac: n(f.pax_exe_nac),
            pax_exe_int: n(f.pax_exe_int),
            pax_tot_nac: n(f.pax_tot_nac),
            pax_tot_int: n(f.pax_tot_int),

            pasajeros_primera: tua,
            pasajeros_turista: exentos,
            pasajeros_menores: 0,
            pasajeros_infantes: infantes,
            pasajeros_tercera_edad: 0,
            pasajeros_discapacitados: 0,
            pasajeros_total: total,

            pax_dni: n(f.pax_dni),
            observaciones: f.observaciones || null,

            firma_elaboro: f.firma_elaboro || null
        };
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
                
                // Forzar bottom border estilo subrayado
                span.style.borderTop = 'none';
                span.style.borderLeft = 'none';
                span.style.borderRight = 'none';
                // Si el input original tenía checkboxes/radios, los quitamos, si no, dibujamos el borde inferior
                if (orig.tagName === 'INPUT' && (orig.type === 'radio' || orig.type === 'checkbox')) {
                    span.style.borderBottom = 'none';
                } else {
                    span.style.borderBottom = (styles.borderBottom && styles.borderBottom !== '0px none rgb(0, 0, 0)' && !styles.borderBottom.includes('none')) ? styles.borderBottom : '1px solid #1a202c';
                }
                
                span.style.backgroundColor = 'transparent';
                span.style.color = '#000';
                span.style.fontWeight = 'bold';
                span.style.minHeight = '24px';
                span.style.minWidth = '30px';
                span.style.padding = '0 5px';
                
                // Ajustar text-align y padding para que el texto descanse sobre la línea inferior
                span.style.display = 'inline-flex';
                span.style.alignItems = 'flex-end'; // Empujar el texto hacia el borde inferior
                
                // Respetamos la alineación horizontal original, por defecto centrada
                const align = 'center';
                span.style.justifyContent = align === 'left' || align === 'start' ? 'flex-start' : (align === 'right' || align === 'end' ? 'flex-end' : 'center');
                span.style.textAlign = align;
                
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

            // Envolvemos al clon para asegurar que respete el grid sin apretarse
            const wrapper = document.createElement('div');
            // Tamaño base, propocional a Carta (Letter): 1000px ancho x 1294px alto (relación 8.5 x 11)
            // Se le da display flex para que el contenido se reparta u ocupe el espacio orgánicamente
            wrapper.style.cssText = 'position:absolute; top:0; left:0; width:1000px; min-height:1294px; z-index:-1; background:white; padding:10px; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column;';

            const modalBodySim = document.createElement('div');
            modalBodySim.className = 'modal-body container-fluid';
            modalBodySim.style.margin = '0';
            modalBodySim.style.padding = '0px'; 
            modalBodySim.style.flex = '1';

            clone.style.position = 'relative';
            clone.style.width = '100%';
            clone.style.height = '100%'; // para que estire
            clone.style.top = 'auto';
            clone.style.left = 'auto';
            clone.style.margin = '0';
            clone.style.backgroundColor = element.style.backgroundColor || '#e2fce6';

            // ATENCIÓN: Eliminar los márgenes negativos de Bootstrap (.row) que provocan que el borde izquierdo y derecho se corten en el html2canvas
            const bRows = clone.querySelectorAll('.row');
            bRows.forEach(row => {
                row.style.marginLeft = '0';
                row.style.marginRight = '0';
            });

            modalBodySim.appendChild(clone);
            wrapper.appendChild(modalBodySim);
            document.body.appendChild(wrapper);

            // Dar respiro para renderizado
            await new Promise(r => setTimeout(r, 600));

            // Calculamos dimensiones para forzar que sea exactamente una hoja
            let pdfBlob = null;
            if (window.html2canvas && window.jspdf && window.jspdf.jsPDF) {
                // Al subir la pantalla a 0,0 evitamos cortes por scroll
                const oldScroll = window.scrollY;
                window.scrollTo(0, 0);

                const canvas = await window.html2canvas(wrapper, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 1000,
                    x: 0,
                    y: 0,
                    scrollX: 0,
                    scrollY: 0
                });

                window.scrollTo(0, oldScroll);

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new window.jspdf.jsPDF('p', 'mm', 'letter');
                const pdfW = pdf.internal.pageSize.getWidth();
                const pdfH = pdf.internal.pageSize.getHeight();

                // Forzamos que la imagen cubra exactamente el lienzo de toda la hoja Letter,
                // ya que hemos preparado el wrapper con la proporción idéntica
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
                pdfBlob = pdf.output('blob');
            } else {
                // Fallback automático
                const opt = {
                    margin: 5,
                    filename: `manifiesto_${payload.vuelo || 'desconocido'}.pdf`,
                    image: { type: 'jpeg', quality: 1.0 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
                };
                pdfBlob = await window.html2pdf().set(opt).from(wrapper).outputPdf('blob');
            }
            
            document.body.removeChild(wrapper);
            document.body.removeChild(loader);

            const fileName = `manifiesto_${payload.tipo.toLowerCase()}_${payload.vuelo || 'NA'}_${Date.now()}.pdf`;

            try {
                const downloadUrl = window.URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = downloadUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(downloadUrl);
                    a.remove();
                }, 100);
            } catch (e) {
                console.error("Error trigger auto-download", e);
            }

            // Subir a SupabaseStorage
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
            const now = new Date();
            const fechaHora = now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

            const exploitador = payload.explotador ? payload.explotador.trim() : '';
            const numVuelo = payload.vuelo ? payload.vuelo.trim() : '';
            let vueloCompleto = numVuelo;
            if (exploitador && numVuelo && !numVuelo.toUpperCase().startsWith(exploitador.toUpperCase())) {
                vueloCompleto = exploitador + numVuelo;
            }

            const isNac = (payload.aeropuerto_origen && payload.aeropuerto_origen.includes('MX')) || 
                          (payload.aeropuerto_llegada_salida && payload.aeropuerto_llegada_salida.includes('MX')) ? 'Nacional' : 'Internacional';

            let numMes = null;
            if (payload.fecha && payload.fecha.includes('-')) {
                const p = payload.fecha.split('-');
                if(p.length >= 2) numMes = String(parseInt(p[1], 10));
            }

            const pConci = {
                'MES': numMes,
                'TIPO DE MANIFIESTO': payload.tipo,
                '# DE VUELO': parseInt(String(vueloCompleto).replace(/[^0-9]/g, '')) || null,
                'AEROLINEA': payload.aerolinea || '',
                'AERONAVE': payload.tipo_aeronave || '',
                'MATRÍCULA': payload.matricula || '',
                'DESTINO / ORIGEN': payload.aeropuerto_origen || payload.aeropuerto_escala || payload.aeropuerto_llegada_salida || '',
                'TOTAL PAX': payload.pasajeros_total || 0,
                'FECHA': payload.fecha || '',
                'EVIDENCIA': pdfUrl || '',
                'TIPO DE OPERACIÓN': payload.clase_servicio || isNac,
                'Hora y Fecha Generación': fechaHora
            };

            // Intentar insertar a Conciliación Manifiestos
            const { error: errConci } = await window.supabaseClient
                .from('Conciliación Manifiestos')
                .insert([pConci]);

            if (errConci) {
                console.error("No se pudo insertar en Conciliación Manifiestos (verifica que la columna 'Hora y Fecha Generación' o 'EVIDENCIA' existan si marca error de esquema):", errConci);
            } else {
                console.log("Se insertó exitosamente el registro en Conciliación Manifiestos con su Hora y Fecha.");
            }
        } catch (e) {
            console.error("Error en syncToConciliacion:", e);
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
                const f = readFields('#modalManifiestoLlegada');
                const payload = buildPayload(f, 'Llegada');
                
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

    // --- SALIDAS (PAX) ---
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
                const f = readFields('#modalManifiestoSalida');
                const payload = buildPayload(f, 'Salida');
                
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

    // --- SALIDAS (CARGA) ---
    const btnSalidaCarga = document.getElementById('btn-save-manifiesto-salida-carga');
    if (btnSalidaCarga) {
        btnSalidaCarga.addEventListener('click', async () => {
            if (!window.supabaseClient) {
                alert("Error: Supabase no está inicializado.");
                return;
            }
            
            const btnOriginalText = btnSalidaCarga.innerHTML;
            btnSalidaCarga.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            btnSalidaCarga.disabled = true;
            
            try {
                const f = readFields('#modalManifiestoSalidaCarga');
                const payload = buildPayload(f, 'Salida Carga');
                
                const { data, error } = await window.supabaseClient
                    .from('manifiestos_pasajeros')
                    .insert([payload])
                    .select('id, vuelo');
                    
                if (error) throw error;

                let pdfUrl = null;
                if (data && data.length > 0) {
                    pdfUrl = await generateAndUploadManifestPDF(payload, data[0].id, '#modalManifiestoSalidaCarga');
                }

                await syncToConciliacion(payload, pdfUrl);

                if(window.bootstrap) {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalManifiestoSalidaCarga'));
                    if(modal) modal.hide();
                }
                
            } catch (err) {
                console.error("Error guardando manifiesto salida carga:", err);
                alert("Ocurrió un error al guardar el manifiesto: " + err.message);
            } finally {
                btnSalidaCarga.innerHTML = btnOriginalText;
                btnSalidaCarga.disabled = false;
            }
        });
    }
});
