;(function(){
  const sec = document.getElementById('manifiestos-section');
  if (!sec) return;

  // Move the full setup into this module
  window.setupManifestsUI = function setupManifestsUI(){
    try {
      const up = document.getElementById('manifest-upload');
      const prevImg = document.getElementById('manifest-preview');
      const placeholder = document.getElementById('manifest-preview-placeholder');
      const runBtn = document.getElementById('manifest-run-ocr');
      const loadEx = document.getElementById('manifest-load-example');
      const tableBody = document.querySelector('#manifest-records-table tbody');
      const saveBtn = document.getElementById('manifest-save');
      const clearBtn = document.getElementById('manifest-clear');
      const exportBtn = document.getElementById('manifest-export-json');
      const dirArr = document.getElementById('mf-dir-arr');
      const dirDep = document.getElementById('mf-dir-dep');
      let currentImageURL = '';
      let airlinesCatalog = [];
      let iataToIcao = new Map();
      let icaoSet = new Set();
      let aircraftByReg = new Map();
      let typeByCode = new Map();
      let airportByIATA = new Map();
      let airportByName = new Map();
      let iataSet = new Set();

      function setVal(id, v){ const el = document.getElementById(id); if (el) el.value = v; }
      function hasWordFactory(text){ const U=(text||'').toUpperCase(); return (w)=> U.includes(String(w||'').toUpperCase()); }
      function tokenizeUpper(text){ return (text||'').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean); }
      const timeRx = /\b(?:([01]?\d|2[0-3])[:hH\.]\s?([0-5]\d))(?:\s?(?:hrs|hr|h))?\b/;
      function findNearLabelValue(labels, valueRegex, text){
        try{
          const lines = (text||'').split(/\r?\n/);
          for (let i=0;i<lines.length;i++){
            const u = lines[i].toUpperCase();
            if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
              const m0 = lines[i].match(valueRegex); if (m0) return m0[0];
              const n = lines[i+1]||''; const m1 = n.match(valueRegex); if (m1) return m1[0];
            }
          }
        }catch(_){ }
        return '';
      }
      function findNearLabelIATACode(labels, text){
        const rxIATA = /\b[A-Z]{3}\b/g;
        try{
          const lines = (text||'').split(/\r?\n/);
          for (let i=0;i<lines.length;i++){
            const u = lines[i].toUpperCase();
            if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
              const search = (s)=>{ const arr = s.match(rxIATA)||[]; return arr.find(c=> iataSet.has(c)); };
              const hit = search(lines[i]) || search(lines[i+1]||'');
              if (hit) return hit;
            }
          }
        }catch(_){ }
        return '';
      }
      function preprocessImage(imgEl){
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const w = imgEl.naturalWidth || imgEl.width;
          const h = imgEl.naturalHeight || imgEl.height;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(imgEl, 0, 0, w, h);
          const imgData = ctx.getImageData(0,0,w,h);
          const d = imgData.data;
          let sum = 0;
          for (let i=0;i<d.length;i+=4){
            const r=d[i], g=d[i+1], b=d[i+2];
            let y = 0.299*r + 0.587*g + 0.114*b;
            y = (y-128)*1.1 + 128;
            sum += y; d[i]=d[i+1]=d[i+2]=y;
          }
          const avg = sum / (d.length/4);
          const thresh = Math.max(96, Math.min(160, avg));
          for (let i=0;i<d.length;i+=4){
            const y = d[i]; const v = y > thresh ? 255 : 0;
            d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
          }
          ctx.putImageData(imgData,0,0);
          return canvas.toDataURL('image/png');
        } catch(e){ console.warn('preprocessImage failed:', e); return imgEl.src; }
      }

      async function loadAirlinesCatalog(){
        try {
          const res = await fetch('data/master/airlines.csv', { cache:'no-store' });
          const text = await res.text();
          const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
          const out = [];
          for (let i=1;i<lines.length;i++){
            const parts = lines[i].split(',');
            if (parts.length < 3) continue;
            const IATA = (parts[0]||'').trim();
            const ICAO = (parts[1]||'').trim();
            const Name = parts.slice(2).join(',').trim().replace(/^"|"$/g,'');
            if (ICAO && /^[A-Za-z]{3}$/.test(ICAO)) {
              const icao = ICAO.toUpperCase();
              const iata = (IATA||'').toUpperCase();
              out.push({ IATA: iata, ICAO: icao, Name });
              icaoSet.add(icao);
              if (iata && /^[A-Z0-9]{2}$/.test(iata)) iataToIcao.set(iata, icao);
            }
          }
          airlinesCatalog = out;
          const dl = document.getElementById('airlines-icao-list');
          if (dl){ dl.innerHTML = out.map(r=>`<option value="${r.ICAO}">${r.Name}</option>`).join(''); }
        } catch(e){ console.warn('No se pudo cargar airlines.csv', e); }
      }
      async function loadAircraftCatalog(){
        try {
          const resA = await fetch('data/master/aircraft.csv', { cache:'no-store' });
          const textA = await resA.text();
          const linesA = textA.split(/\r?\n/).filter(l=>l.trim());
          const regOptions = [];
          for (let i=1;i<linesA.length;i++){
            const row = linesA[i];
            const parts = row.split(',');
            if (parts.length < 3) continue;
            const reg = (parts[0]||'').trim().toUpperCase();
            const type = (parts[1]||'').trim().toUpperCase();
            const ownerIATA = (parts[2]||'').trim().toUpperCase();
            if (reg) { aircraftByReg.set(reg, { type, ownerIATA }); regOptions.push(`<option value="${reg}"></option>`); }
          }
          const dlReg = document.getElementById('aircraft-reg-list');
          if (dlReg) dlReg.innerHTML = regOptions.join('');
        } catch(e){ console.warn('No se pudo cargar aircraft.csv', e); }
        try {
          const resT = await fetch('data/master/aircraft type.csv', { cache:'no-store' });
          const textT = await resT.text();
          const linesT = textT.split(/\r?\n/).filter(l=>l.trim());
          const typeOptions = [];
          for (let i=1;i<linesT.length;i++){
            const row = linesT[i];
            const parts = row.split(',');
            if (parts.length < 2) continue;
            const codeIATA = (parts[0]||'').trim().toUpperCase();
            const icao = (parts[1]||'').trim().toUpperCase();
            const name = (parts[2]||'').trim();
            if (codeIATA) { typeByCode.set(codeIATA, { ICAO: icao, Name: name }); }
            if (icao) typeOptions.push(`<option value="${icao}">${name?name:''}</option>`);
          }
          const dlType = document.getElementById('aircraft-type-icao-list');
          if (dlType) dlType.innerHTML = typeOptions.join('');
        } catch(e){ console.warn('No se pudo cargar aircraft type.csv', e); }
      }
      async function loadAirportsCatalog(){
        try {
          const res = await fetch('data/master/airports.csv', { cache:'no-store' });
          const text = await res.text();
          const lines = text.split(/\r?\n/).filter(l=>l.trim());
          function parseCSVLine(line){
            const cols = []; let cur=''; let inQuotes=false;
            for (let i=0;i<line.length;i++){
              const ch=line[i];
              if (ch==='"'){
                if (inQuotes && line[i+1]==='"'){ cur+='"'; i++; }
                else inQuotes = !inQuotes;
              } else if (ch===',' && !inQuotes){ cols.push(cur); cur=''; }
              else { cur+=ch; }
            }
            cols.push(cur); return cols;
          }
          const optsIATA = [], optsName = [];
          for (let i=1;i<lines.length;i++){
            const parts = parseCSVLine(lines[i]);
            if (parts.length < 3) continue;
            const IATA = (parts[0]||'').trim().toUpperCase();
            const Name = (parts[2]||'').trim().replace(/^"|"$/g,'');
            if (!IATA || !Name) continue;
            airportByIATA.set(IATA, Name);
            airportByName.set(Name.toLowerCase(), IATA);
            iataSet.add(IATA);
            optsIATA.push(`<option value="${IATA}">${Name}</option>`);
            optsName.push(`<option value="${Name}">${IATA}</option>`);
          }
          const dlIATA = document.getElementById('airports-iata-list');
          const dlName = document.getElementById('airports-name-list');
          if (dlIATA) dlIATA.innerHTML = optsIATA.join('');
          if (dlName) dlName.innerHTML = optsName.join('');
        } catch(e){ console.warn('No se pudo cargar airports.csv', e); }
      }

      function applyManifestDirection(){
        const isArrival = dirArr && dirArr.checked;
        document.querySelectorAll('[data-dir="arrival-only"]').forEach(el => { el.style.display = isArrival ? '' : 'none'; });
        document.querySelectorAll('[data-dir=\"departure-only\"]').forEach(el => { el.style.display = isArrival ? 'none' : ''; });
        const eta = document.getElementById('mf-time-arr');
        const etd = document.getElementById('mf-time-dep');
        const dest = document.getElementById('mf-final-dest');
        const destCode = document.getElementById('mf-final-dest-code');
        const originName = document.getElementById('mf-origin-name');
        const originCode = document.getElementById('mf-origin-code');
        const nextStopCode = document.getElementById('mf-next-stop-code');
        const arrOriginName = document.getElementById('mf-arr-origin-name');
        const arrOriginCode = document.getElementById('mf-arr-origin-code');
        const arrSlotAssigned = document.getElementById('mf-arr-slot-assigned');
        const arrSlotCoordinated = document.getElementById('mf-arr-slot-coordinated');
        const arrLastStop = document.getElementById('mf-arr-last-stop');
        const arrLastStopCode = document.getElementById('mf-arr-last-stop-code');
        const arrArriboPos = document.getElementById('mf-arr-arribo-posicion');
        const arrInicioDes = document.getElementById('mf-arr-inicio-desembarque');
        if (eta) eta.required = !!isArrival;
        if (originName) originName.required = !isArrival;
        if (originCode) originCode.required = !isArrival;
        if (nextStopCode) nextStopCode.required = false;
        if (etd) etd.required = !isArrival;
        if (dest) dest.required = !isArrival;
        if (destCode) destCode.required = !isArrival;
        [arrOriginName, arrOriginCode, arrSlotAssigned, arrSlotCoordinated, arrLastStop, arrLastStopCode, arrArriboPos, arrInicioDes]
          .forEach(el => { if (el) el.required = false; });
        const title = document.getElementById('mf-title');
        if (title) title.value = isArrival ? 'MANIFIESTO DE LLEGADA' : 'MANIFIESTO DE SALIDA';
      }
      if (dirArr && !dirArr._wired) { dirArr._wired = 1; dirArr.addEventListener('change', applyManifestDirection); }
      if (dirDep && !dirDep._wired) { dirDep._wired = 1; dirDep.addEventListener('change', applyManifestDirection); }
      applyManifestDirection();

      loadAirlinesCatalog();
      loadAircraftCatalog();
      loadAirportsCatalog();

      function setPreview(src){ if (prevImg){ prevImg.src = src; prevImg.style.display = 'block'; } if (placeholder) placeholder.style.display = 'none'; if (runBtn) runBtn.disabled = false; currentImageURL = src; }
      if (up && !up._wired) { up._wired = 1; up.addEventListener('change', async (e)=>{
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const url = URL.createObjectURL(f);
        setPreview(url);
      }); }
      if (loadEx && !loadEx._wired) { loadEx._wired = 1; loadEx.addEventListener('click', (e)=>{ e.preventDefault(); setPreview('examples/manifiesto1.jpg'); }); }
      if (runBtn && !runBtn._wired) {
        runBtn._wired = 1;
        runBtn.addEventListener('click', async ()=>{
          const s = document.getElementById('manifest-ocr-status');
          try {
            if (!prevImg || !prevImg.src) { if (s) s.textContent = 'Cargue una imagen primero.'; return; }
            if (s) s.textContent = 'Preprocesando imagen para OCR...';
            const processed = preprocessImage(prevImg);
            if (!window.Tesseract) { if (s) s.textContent = 'OCR no disponible (Tesseract.js no cargado).'; return; }
            if (s) s.textContent = 'Reconociendo texto (OCR spa+eng)...';
            const { data } = await Tesseract.recognize(processed, 'spa+eng', { logger: m => {}, tessedit_pageseg_mode: 6, user_defined_dpi: 300 });
            const text = (data && data.text) ? data.text.trim() : '';
            if (s) s.textContent = text ? ('Texto detectado (resumen):\n' + (text.slice(0,600)) + (text.length>600?'...':'')) : 'No se detectó texto.';
            const hasWord = hasWordFactory(text);
            const upperTokens = tokenizeUpper(text);
            const isArrivalDoc = hasWord('LLEGADA') || hasWord('ARRIVAL');
            const isDepartureDoc = hasWord('SALIDA') || hasWord('DEPARTURE');
            if (isArrivalDoc && dirArr) { dirArr.checked = true; dirArr.dispatchEvent(new Event('change', { bubbles: true })); }
            else if (isDepartureDoc && dirDep) { dirDep.checked = true; dirDep.dispatchEvent(new Event('change', { bubbles: true })); }
            const currentIsArrival = dirArr && dirArr.checked;
            try {
              let carrierICAO = '';
              const foundICAO = upperTokens.find(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && icaoSet.has(t));
              if (foundICAO) carrierICAO = foundICAO;
              let flightStr = findNearLabelValue(['vuelo','n° vuelo','no. vuelo','flight','flt'], /[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?/i, text);
              if (!flightStr){ const m = text.match(/\b[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?\b/); if (m) flightStr = m[0]; }
              if (flightStr){
                const cleaned = flightStr.replace(/\s|-/g,'');
                const pref3 = cleaned.slice(0,3).toUpperCase();
                const pref2 = cleaned.slice(0,2).toUpperCase();
                if (!carrierICAO && icaoSet.has(pref3)) carrierICAO = pref3;
                if (!carrierICAO && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2) || '';
                setVal('mf-flight', flightStr.trim());
              }
              if (carrierICAO) setVal('mf-carrier-3l', carrierICAO);
            } catch(_){ }
            try {
              const tailPatterns = [
                /\bX[A-C]-?[A-Z0-9]{3,5}\b/gi,
                /\bN\d{1,5}[A-Z]{0,2}\b/gi,
                /\bH[KP]-?\d{3,5}\b/gi,
                /\bLV-?[A-Z0-9]{3,4}\b/gi,
                /\bCC-?[A-Z0-9]{3,4}\b/gi,
                /\bPR-?[A-Z0-9]{3,4}\b/gi,
                /\bCP-?\d{3,5}\b/gi,
                /\bYV-?\d{3,5}\b/gi,
                /\bOB-?\d{3,5}\b/gi,
                /\bTG-?\d{3,5}\b/gi,
                /\bXA[A-Z0-9]{0,}\b/gi
              ];
              let foundTail = '';
              for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ foundTail = m[0].toUpperCase().replace(/\s+/g,''); break; } }
              if (foundTail) setVal('mf-tail', foundTail);
            } catch(_){ }
            try {
              const originCandLbl = findNearLabelIATACode(['origen','procedencia','from','procedencia del vuelo'], text);
              const lastStopCandLbl = findNearLabelIATACode(['ultima escala','escala anterior','last stop','escala'], text);
              const finalDestCandLbl = findNearLabelIATACode(['destino','to','destino del vuelo'], text);
              const airportCodes = upperTokens.filter(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && iataSet.has(t));
              const rawLines = text.split(/\r?\n/);
              let originCand = '';
              let lastStopCand = '';
              let finalDestCand = '';
              for (const line of rawLines){
                const u = line.toUpperCase();
                if (/ORIGEN|PROCEDENCIA|FROM\b/.test(u)){
                  const code = Array.from(iataSet).find(c => u.includes(c)); if (code) originCand = code;
                }
                if (/ULTIMA\s+ESCALA|LAST\s+STOP|ESCALA\b/.test(u)){
                  const code = Array.from(iataSet).find(c => u.includes(c)); if (code) lastStopCand = code;
                }
                if (/DESTINO|TO\b/.test(u)){
                  const code = Array.from(iataSet).find(c => u.includes(c)); if (code) finalDestCand = code;
                }
              }
              originCand = originCandLbl || originCand;
              lastStopCand = lastStopCandLbl || lastStopCand;
              finalDestCand = finalDestCandLbl || finalDestCand;
              if (!originCand && airportCodes[0]) originCand = airportCodes[0];
              if (!lastStopCand && airportCodes[1]) lastStopCand = airportCodes[1];
              if (!finalDestCand && airportCodes[2]) finalDestCand = airportCodes[2];
              if (currentIsArrival){
                if (originCand) setVal('mf-arr-origin-code', originCand);
                if (lastStopCand) setVal('mf-arr-last-stop-code', lastStopCand);
              } else {
                if (originCand) setVal('mf-origin-code', originCand);
                if (lastStopCand) setVal('mf-next-stop-code', lastStopCand);
                if (finalDestCand){
                  setVal('mf-final-dest-code', finalDestCand);
                  const name = airportByIATA.get(finalDestCand) || '';
                  if (name) setVal('mf-final-dest', name);
                }
              }
              const setTimeIf = (id, labels) => { const v = findNearLabelValue(labels, timeRx, text); if (v) setVal(id, v); };
              if (currentIsArrival){
                setTimeIf('mf-arr-slot-assigned', ['slot asignado']);
                setTimeIf('mf-arr-slot-coordinated', ['slot coordinado']);
                setTimeIf('mf-arr-arribo-posicion', ['entrada a la posicion','arribo a la posicion','arribo posicion']);
                setTimeIf('mf-arr-inicio-desembarque', ['termino maniobras de desembarque','inicio de desembarque','inicio desembarque']);
                setTimeIf('mf-arr-inicio-pernocta', ['inicio de pernocta','inicio pernocta']);
              } else {
                setTimeIf('mf-slot-assigned', ['slot asignado']);
                setTimeIf('mf-slot-coordinated', ['slot coordinado']);
                setTimeIf('mf-inicio-embarque', ['inicio de maniobras de embarque','inicio de embarque']);
                setTimeIf('mf-salida-posicion', ['salida de la posicion','salida posicion']);
                setTimeIf('mf-termino-pernocta', ['termino de pernocta','término de pernocta','fin pernocta']);
              }
            } catch(_){ }
            if (s) s.textContent += '\n\nAutorrelleno aplicado (si hubo coincidencias).';
          } catch(err){ if (s) s.textContent = 'Error en OCR: ' + (err?.message || err); }
        });
      }

      (function wireCarrierAutofill(){
        const carrier = document.getElementById('mf-carrier-3l');
        if (!carrier || carrier._wired) return; carrier._wired = 1;
        const opName = document.getElementById('mf-operator-name');
        const airlineName = document.getElementById('mf-airline');
        const setFromICAO = (val) => {
          const code = (val||'').toString().trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
          if (carrier.value !== code) carrier.value = code;
          if (code.length !== 3) return;
          const rec = airlinesCatalog.find(a=> a.ICAO === code);
          if (rec){
            if (opName && !opName.value) opName.value = rec.Name;
            if (airlineName && !airlineName.value) airlineName.value = rec.Name;
          }
        };
        carrier.addEventListener('input', ()=> setFromICAO(carrier.value));
        carrier.addEventListener('change', ()=> setFromICAO(carrier.value));
        carrier.addEventListener('blur', ()=> setFromICAO(carrier.value));
      })();

      (function wireTailAutofill(){
        const tail = document.getElementById('mf-tail');
        if (!tail || tail._wired) return; tail._wired = 1;
        const equipo = document.getElementById('mf-aircraft');
        const carrier = document.getElementById('mf-carrier-3l');
        const setFromTail = (val)=>{
          const reg = (val||'').toString().trim().toUpperCase();
          if (!reg) return;
          const rec = aircraftByReg.get(reg);
          if (!rec) return;
          const t = typeByCode.get(rec.type);
          if (t){
            const preferred = t.ICAO || t.Name || rec.type;
            if (equipo && (!equipo.value || equipo.value === rec.type)) { equipo.value = preferred; }
          } else { if (equipo && !equipo.value) equipo.value = rec.type; }
          if (carrier && !carrier.value && rec.ownerIATA){
            const cand = airlinesCatalog.find(a => (a.IATA||'').toUpperCase() === rec.ownerIATA);
            if (cand && cand.ICAO && /^[A-Z]{3}$/.test(cand.ICAO)) carrier.value = cand.ICAO;
          }
        };
        tail.addEventListener('input', ()=> setFromTail(tail.value));
        tail.addEventListener('change', ()=> setFromTail(tail.value));
        tail.addEventListener('blur', ()=> setFromTail(tail.value));
        if (equipo && !equipo._wired){ equipo._wired = 1; equipo.addEventListener('input', ()=> { equipo.value = (equipo.value||'').toUpperCase(); }); }
      })();

      (function wireAirportFields(){
        function link(nameId, codeId){
          const nameEl = document.getElementById(nameId);
          const codeEl = document.getElementById(codeId);
          if (!nameEl || !codeEl) return;
          if (!nameEl._wired){
            nameEl._wired = 1;
            nameEl.addEventListener('input', ()=>{
              const s = (nameEl.value||'').trim().toLowerCase();
              const iata = airportByName.get(s);
              if (iata && !codeEl.value) codeEl.value = iata;
            });
          }
          if (!codeEl._wired){
            codeEl._wired = 1;
            codeEl.addEventListener('input', ()=>{
              const c = (codeEl.value||'').trim().toUpperCase();
              codeEl.value = c.replace(/[^A-Z]/g,'').slice(0,3);
              const name = airportByIATA.get(codeEl.value);
              if (name && !nameEl.value) nameEl.value = name;
            });
          }
        }
        link('mf-origin-name','mf-origin-code');
        link('mf-next-stop','mf-next-stop-code');
        link('mf-final-dest','mf-final-dest-code');
        link('mf-arr-origin-name','mf-arr-origin-code');
        link('mf-arr-last-stop','mf-arr-last-stop-code');
      })();

      function calculateTotals(){
        const totalEquipaje = Array.from(document.querySelectorAll('.embarque-equipaje')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
        const totalCarga = Array.from(document.querySelectorAll('.embarque-carga')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
        const totalCorreo = Array.from(document.querySelectorAll('.embarque-correo')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
        const totalPaxNacional = Array.from(document.querySelectorAll('.embarque-pax-nacional')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
        const totalPaxInternacional = Array.from(document.querySelectorAll('.embarque-pax-internacional')).reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
        const setOut = (id, val) => { const el = document.getElementById(id); if (el) el.value = (typeof val === 'number' && !Number.isInteger(val)) ? val.toFixed(2) : val; };
        setOut('total-equipaje', totalEquipaje.toLocaleString('es-MX'));
        setOut('total-carga', totalCarga.toLocaleString('es-MX'));
        setOut('total-correo', totalCorreo.toLocaleString('es-MX'));
        setOut('total-pax-nacional', totalPaxNacional);
        setOut('total-pax-internacional', totalPaxInternacional);
      }

      function readForm(){
        const g = id => document.getElementById(id)?.value || '';
        const direction = (dirArr && dirArr.checked) ? 'Llegada' : 'Salida';
        return {
          direction,
          title: g('mf-title'), docDate: g('mf-doc-date'), folio: g('mf-folio'),
          carrier3L: g('mf-carrier-3l'), operatorName: g('mf-operator-name'), airline: g('mf-airline'), flight: g('mf-flight'),
          tail: g('mf-tail'), aircraft: g('mf-aircraft'), originName: g('mf-origin-name'), originCode: g('mf-origin-code'),
          crewCockpit: g('mf-crew-cockpit'), crewCabin: g('mf-crew-cabin'), crewTotal: g('mf-crew-total'),
          baggageKg: g('mf-baggage-kg'), baggagePieces: g('mf-baggage-pcs'), cargoKg: g('mf-cargo'), cargoPieces: g('mf-cargo-pieces'), cargoVol: g('mf-cargo-volume'),
          mailKg: g('mf-mail'), mailPieces: g('mf-mail-pieces'),
          dangerousGoods: !!document.getElementById('mf-dangerous-goods')?.checked,
          liveAnimals: !!document.getElementById('mf-live-animals')?.checked,
          humanRemains: !!document.getElementById('mf-human-remains')?.checked,
          pilot: g('mf-pilot'), pilotLicense: g('mf-pilot-license'), agent: g('mf-agent'), signature: g('mf-signature'), notes: g('mf-notes'),
          nextStop: g('mf-next-stop'), nextStopCode: g('mf-next-stop-code'), finalDest: g('mf-final-dest'), finalDestCode: g('mf-final-dest-code'),
          slotAssigned: g('mf-slot-assigned'), slotCoordinated: g('mf-slot-coordinated'), terminoPernocta: g('mf-termino-pernocta'),
          inicioEmbarque: g('mf-inicio-embarque'), salidaPosicion: g('mf-salida-posicion'),
          arrOriginName: g('mf-arr-origin-name'), arrOriginCode: g('mf-arr-origin-code'), arrSlotAssigned: g('mf-arr-slot-assigned'), arrSlotCoordinated: g('mf-arr-slot-coordinated'),
          arrLastStop: g('mf-arr-last-stop'), arrLastStopCode: g('mf-arr-last-stop-code'), arrArriboPosicion: g('mf-arr-arribo-posicion'), arrInicioDesembarque: g('mf-arr-inicio-desembarque'), arrInicioPernocta: g('mf-arr-inicio-pernocta'),
          paxTUA: g('pax-tua'), paxDiplomaticos: g('pax-diplomaticos'), paxComision: g('pax-comision'), paxInfantes: g('pax-infantes'), paxTransitos: g('pax-transitos'), paxConexiones: g('pax-conexiones'), paxExentos: g('pax-exentos'), paxTotal: g('pax-total'),
          obsTransito: g('mf-obs-transito'), paxDNI: g('mf-pax-dni'),
          signOperator: g('mf-sign-operator'), signCoordinator: g('mf-sign-coordinator'), signAdmin: g('mf-sign-admin'), signAdminDate: g('mf-sign-admin-date'),
          image: (prevImg && prevImg.src) || ''
        };
      }
      function loadRecords(){ try { return JSON.parse(localStorage.getItem('aifa.manifests')||'[]'); } catch(_) { return []; } }
      function saveRecords(arr){ try { localStorage.setItem('aifa.manifests', JSON.stringify(arr)); } catch(_) {} }
      function renderTable(){ if (!tableBody) return; const rows = loadRecords(); tableBody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.direction||''}</td>
          <td>${(r.carrier3L? (r.carrier3L.toUpperCase()+ ' - ') : '') + (r.airline||r.operatorName||'')}</td>
          <td>${r.flight||''}</td>
          <td>${r.tail||''}</td>
          <td></td>
          <td></td>
          <td>${(r.originCode||'')}/${r.finalDest||''}</td>
          <td>${r.pax||''}</td>
          <td>${r.cargoKg||''}/${r.mailKg||''}</td>
          <td>${r.image?'<img src="'+r.image+'" style="height:30px">':''}</td>
        </tr>`).join(''); }

      function recalcPaxTotal(){
        const ids = ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'];
        const sum = ids.reduce((a,id)=> a + (parseInt(document.getElementById(id)?.value||'0',10)||0), 0);
        const out = document.getElementById('pax-total'); if (out) out.value = String(sum);
      }
      ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'].forEach(id=>{
        const el = document.getElementById(id); if (el && !el._wired){ el._wired = 1; el.addEventListener('input', recalcPaxTotal); }
      });
      recalcPaxTotal();

      if (saveBtn && !saveBtn._wired) { saveBtn._wired = 1; saveBtn.addEventListener('click', ()=>{ recalcPaxTotal(); const recs = loadRecords(); recs.unshift(readForm()); saveRecords(recs.slice(0,200)); renderTable(); }); }
      if (clearBtn && !clearBtn._wired) { clearBtn._wired = 1; clearBtn.addEventListener('click', ()=>{ document.getElementById('manifest-form')?.reset(); applyManifestDirection(); clearDynamicTables(); calculateTotals(); updateDemorasTotal(); }); }
      if (exportBtn && !exportBtn._wired) { exportBtn._wired = 1; exportBtn.addEventListener('click', ()=>{ const data = JSON.stringify(loadRecords(), null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.json'; a.click(); }); }
      renderTable();

      const demoraTbody = document.querySelector('#tabla-demoras tbody');
      const addDemoraBtn = document.getElementById('add-demora-row');
      const clearDemorasBtn = document.getElementById('clear-demoras');
      function addDemoraRow(data={}){
        if (!demoraTbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="form-control form-control-sm demora-codigo" value="${data.codigo||''}"></td>
          <td><input type="number" min="0" class="form-control form-control-sm demora-minutos" value="${data.minutos||''}"></td>
          <td><input type="text" class="form-control form-control-sm demora-descripcion" value="${data.descripcion||''}"></td>
          <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-demora-row"><i class="fas fa-times"></i></button></td>`;
        demoraTbody.appendChild(tr);
      }
      function updateDemorasTotal(){
        const total = Array.from(document.querySelectorAll('.demora-minutos')).reduce((acc, inp)=> acc + (parseFloat(inp.value)||0), 0);
        const out = document.getElementById('total-demora-minutos'); if (out) out.value = String(total);
      }
      function clearDemoras(){ if (demoraTbody) demoraTbody.innerHTML = ''; updateDemorasTotal(); }
      if (addDemoraBtn && !addDemoraBtn._wired){ addDemoraBtn._wired = 1; addDemoraBtn.addEventListener('click', ()=> addDemoraRow()); }
      if (clearDemorasBtn && !clearDemorasBtn._wired){ clearDemorasBtn._wired = 1; clearDemorasBtn.addEventListener('click', clearDemoras); }

      window._manifListeners = window._manifListeners || { clicks: false, inputs: false };
      if (!window._manifListeners.clicks){
        window._manifListeners.clicks = true;
        document.addEventListener('click', (e)=>{
          const btn = e.target.closest('.remove-demora-row'); if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); updateDemorasTotal(); }
          const btn2 = e.target.closest('.remove-embarque-row'); if (btn2) { const tr2 = btn2.closest('tr'); if (tr2) tr2.remove(); calculateTotals(); }
        });
      }
      if (!window._manifListeners.inputs){
        window._manifListeners.inputs = true;
        document.addEventListener('input', (e)=>{
          if (e.target && e.target.classList && e.target.classList.contains('demora-minutos')) { updateDemorasTotal(); }
          if (e.target && e.target.closest && e.target.closest('#tabla-embarque')) { calculateTotals(); }
        });
      }

      const embarqueTbody = document.querySelector('#tabla-embarque tbody');
      const addEmbarqueBtn = document.getElementById('add-embarque-row');
      const clearEmbarqueBtn = document.getElementById('clear-embarque');
      function addEmbarqueRow(data={}){
        if (!embarqueTbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="form-control form-control-sm embarque-estacion" value="${data.estacion||''}"></td>
          <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-nacional" value="${data.paxNacional||''}"></td>
          <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-internacional" value="${data.paxInternacional||''}"></td>
          <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-equipaje" value="${data.equipaje||''}"></td>
          <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-carga" value="${data.carga||''}"></td>
          <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-correo" value="${data.correo||''}"></td>
          <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-embarque-row"><i class="fas fa-times"></i></button></td>`;
        embarqueTbody.appendChild(tr);
        calculateTotals();
      }
      function clearEmbarque(){ if (embarqueTbody) embarqueTbody.innerHTML = ''; calculateTotals(); }
      if (addEmbarqueBtn && !addEmbarqueBtn._wired){ addEmbarqueBtn._wired = 1; addEmbarqueBtn.addEventListener('click', ()=> addEmbarqueRow()); }
      if (clearEmbarqueBtn && !clearEmbarqueBtn._wired){ clearEmbarqueBtn._wired = 1; clearEmbarqueBtn.addEventListener('click', clearEmbarque); }
      document.addEventListener('click', (e)=>{
        const btn = e.target.closest('.remove-embarque-row');
        if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); calculateTotals(); }
      });

      function clearDynamicTables(){ clearDemoras(); clearEmbarque(); }
    } catch (e) { /* ignore */ }
  };

  function init(){ try { window.setupManifestsUI?.(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="manifiestos"]')) setTimeout(init, 50); });
})();
