;(function(){

  // ======================= MANIFIESTOS: CANDADO ACTIVADO =======================
  // Solo realizar modificaciones específicas bajo instrucción del usuario.
  // ============================================================================

  // Global zoom and plane-progress helpers (shared by V1 and V2)
  const _cache = {};
  let _cpEl = null;
  let _cpList = null;
  let _cpSearch = null;
  let _cpAnchor = null;
  let _cpOnPick = null;
  let _cpItems = [];
  let _cpCurrentQuery = '';

  const FORCED_AIRPORT_MAIN_CODE = 'NLU';
  const MEXICO_IATA_FALLBACK = new Set([
    'ACA','AGU','BJX','CED','CEN','CJS','CLQ','CME','CPE','CTM','CUL','CUN','CVM','CYW','CZM','DGO','GDL','HMO','HUX','ICD','IZT','JJC','LAP','LMM','LTO','MAM','MEX','MID','MLM','MTT','MTY','MXL','MZT','NLD','NLU','OAX','PAZ','PCA','PBC','PDS','PQM','PVR','PXM','QRO','REX','SJD','SLP','SLW','TAM','TAP','TGZ','TIJ','TLC','TQO','TRC','TPQ','UPN','VER','VSA','ZCL','ZIH','ZLO'
  ]);
  try {
    const dedup = new Set();
    MEXICO_IATA_FALLBACK.forEach(code=>{ if (code) dedup.add(String(code).trim().toUpperCase()); });
    MEXICO_IATA_FALLBACK.clear();
    dedup.forEach(code=> MEXICO_IATA_FALLBACK.add(code));
    MEXICO_IATA_FALLBACK.add(FORCED_AIRPORT_MAIN_CODE);
  } catch(_){ }
  const MEXICO_COUNTRY_NAME = 'MEXICO';

  function forceAirportMainValue(){
    try {
      const el = document.getElementById('mf-airport-main');
    if (!el) return; 
      if (!el._forceNLUHandler){
        const enforce = ()=>{
          try {
            const forced = FORCED_AIRPORT_MAIN_CODE;
            const current = ((el.value || '')).toString().trim().toUpperCase();
            if (current === forced) return;
            el.value = forced;
            try { el.dispatchEvent(new Event('input',{ bubbles:true })); } catch(_){ }
            try { el.dispatchEvent(new Event('change',{ bubbles:true })); } catch(_){ }
          } catch(_){ }
        };
        el._forceNLUHandler = enforce;
        ['input','change','blur'].forEach(ev=> el.addEventListener(ev, enforce));
      }
      const forced = FORCED_AIRPORT_MAIN_CODE;
      const current = ((el.value || '')).toString().trim().toUpperCase();
      if (current === forced) return;
      el.value = forced;
      try { el.dispatchEvent(new Event('input',{ bubbles:true })); } catch(_){ }
      try { el.dispatchEvent(new Event('change',{ bubbles:true })); } catch(_){ }
    } catch(_){ }
  }

  const _escapeHtml = (str)=> String(str ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
  const _normalize = (str)=> (str||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/gi,' ').toUpperCase();
  const _sortItems = (items)=> [...(items||[])].sort((a,b)=>{
    const la = (a.label || a.value || '').toString();
    const lb = (b.label || b.value || '').toString();
    return la.localeCompare(lb, 'es', { sensitivity:'base' });
  });
  const hilite = (str)=>{
    const safe = _escapeHtml(str||'');
    if (!_cpCurrentQuery) return safe;
    try {
      const rx = new RegExp(`(${_cpCurrentQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig');
      return safe.replace(rx,'<mark>$1</mark>');
    } catch(_){
      return safe;
    }
  };

  function renderItem(it){
    const m = it.meta || {};
    const kind = it.kind || '';
    const idx = Number.isFinite(it._idx) ? it._idx : 0;
    if (kind === 'airline'){
      const name = hilite(m.name || it.label || it.value || '');
      const iata = m.iata ? `<span style="background:#212529; color:#fff; padding:2px 6px; border-radius:4px; font-weight:600;">${hilite(m.iata)}</span>` : '';
      const icao = m.icao ? `<span style="background:#e9ecef; color:#495057; padding:2px 6px; border-radius:4px; font-weight:600;">${hilite(m.icao)}</span>` : '';
      return `<button type="button" data-idx="${idx}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#333; font-weight:600;">${name}</div>
          <div style="display:flex; gap:6px;">${iata}${icao}</div>
        </div>
      </button>`;
    }
    if (kind === 'airport'){
      const iata = hilite(m.iata || '—');
      const icao = m.icao ? `<span style="background:#e9ecef; color:#495057; padding:2px 6px; border-radius:4px; font-weight:600;">${hilite(m.icao)}</span>` : '';
      const name = hilite(m.name || it.value || '');
      const city = hilite(m.city || '');
      const country = hilite(m.country || '');
      const loc = (m.city || m.country) ? ` <span style="color:#6c757d;">(${city}${m.city&&m.country?', ':''}${country})</span>` : '';
      return `<button type="button" data-idx="${idx}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="display:inline-block; background:#0d6efd; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; min-width:38px; text-align:center;">${iata}</span>
          <div style="flex:1; min-width:0;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#333; font-weight:600;">${name}${loc}</div>
          </div>
          ${icao}
        </div>
      </button>`;
    }
    const label = hilite(it.label || it.value || '');
    return `<button type="button" data-idx="${idx}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">${label}</button>`;
  }

  function _refreshList(query){
    if (!_cpList) return;
    _cpCurrentQuery = (query || '').trim();
    const q = _normalize(_cpCurrentQuery); 
    const matches = q ? _cpItems.filter(it=> (it._k || '').includes(q)) : _cpItems;
    if (!matches.length){
      _cpList.innerHTML = '<div class="p-2 text-muted">Sin resultados</div>';
      return;
    }
    _cpList.innerHTML = matches.map(renderItem).join('');
    Array.from(_cpList.querySelectorAll('button[data-idx]')).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        try {
          const idx = parseInt(btn.getAttribute('data-idx')||'-1',10);
          const item = _cpItems[idx];
          if (!item) return;
          if (_cpAnchor){
            _cpAnchor.value = item.value;
            _cpAnchor.dispatchEvent(new Event('input',{ bubbles:true }));
            _cpAnchor.dispatchEvent(new Event('change',{ bubbles:true }));
          }
          if (typeof _cpOnPick === 'function') _cpOnPick(item, _cpAnchor);
        } finally {
          if (_cpEl) _cpEl.style.display = 'none';
          _cpAnchor = null;
          _cpOnPick = null;
        }
      });
    });
  }

  const _ensureCatalogPicker = ()=>{
    if (_cpEl) return _cpEl;
    const el = document.createElement('div');
    el.id = 'mf-catalog-picker';
    el.style.position = 'absolute';
    el.style.zIndex = '9999';
    el.style.minWidth = '320px';
    el.style.maxWidth = '360px';
    el.style.background = '#fff';
    el.style.border = '1px solid rgba(0,0,0,0.15)';
    el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
    el.style.display = 'none';
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; padding:10px 12px; border-bottom:1px solid #f1f1f1;">
        <input type="search" placeholder="Buscar" style="flex:1; border:1px solid #ced4da; border-radius:4px; padding:6px 8px;" />
        <button type="button" data-action="close" aria-label="Cerrar" style="border:0; background:transparent; font-size:18px; line-height:1; cursor:pointer;">×</button>
      </div>
      <div class="cp-list" style="max-height:320px; overflow:auto;"></div>`;
    document.body.appendChild(el);
    _cpEl = el;
    _cpSearch = el.querySelector('input[type="search"]');
    _cpList = el.querySelector('.cp-list');
    const closeBtn = el.querySelector('[data-action="close"]');
    if (closeBtn){
      closeBtn.addEventListener('click', ()=>{
        el.style.display = 'none';
        _cpAnchor = null;
        _cpOnPick = null;
      });
    }
    if (_cpSearch){
      _cpSearch.addEventListener('input', ()=> _refreshList(_cpSearch.value));
      _cpSearch.addEventListener('keydown', (ev)=>{
        if (ev.key === 'Escape'){
          ev.preventDefault();
          el.style.display = 'none';
          _cpAnchor = null;
          _cpOnPick = null;
        }
      });
    }
    return el;
  };

  // Catálogo: Tipo de vuelo (lista embebida)
  window._initFlightServiceType = function initFlightServiceType(){
    const sel = document.getElementById('mf-flight-type');
    const info = document.getElementById('mf-flight-type-info');
    if (!sel) return;
    const DATA = [
      { Code:'A', Category:'Additional flights', 'Type of operation':'Cargo,Mail', Description:'Cargo/Mail' },
      { Code:'B', Category:'Additional flights', 'Type of operation':'Passenger', Description:'Shuttle Mode' },
      { Code:'C', Category:'Charter', 'Type of operation':'Passenger', Description:'Passenger Only' },
      { Code:'D', Category:'Others', 'Type of operation':'Not specific', Description:'General Aviation' },
      { Code:'E', Category:'Others', 'Type of operation':'Not specific', Description:'Test' },
      { Code:'F', Category:'Scheduled', 'Type of operation':'Cargo,Mail', Description:'Loose Loaded cargo and/or preloaded devices' },
      { Code:'G', Category:'Additional flights', 'Type of operation':'Passenger', Description:'Normal Service' },
      { Code:'H', Category:'Charter', 'Type of operation':'Cargo,Mail', Description:'Cargo and/or Mail' },
      { Code:'I', Category:'Others', 'Type of operation':'Not specific', Description:'State/Diplomatic/Air Ambulance' },
      { Code:'J', Category:'Scheduled', 'Type of operation':'Passenger', Description:'Normal Service' },
      { Code:'K', Category:'Others', 'Type of operation':'Not specific', Description:'Training (School/Crew check)' },
      { Code:'L', Category:'Charter', 'Type of operation':'Cargo,Mail,Passenger', Description:'Passenger/Cargo/Mail' },
      { Code:'M', Category:'Scheduled', 'Type of operation':'Cargo,Mail', Description:'Mail only' },
      { Code:'N', Category:'Others', 'Type of operation':'Not specific', Description:'Business Aviation/Air Taxi' },
      { Code:'O', Category:'Charter', 'Type of operation':'Special handling', Description:'Charter requiring special handling (e.g. Migrants/Immigrant Flights)' },
      { Code:'P', Category:'Others', 'Type of operation':'Not specific', Description:'Non-revenue (Positioning/Ferry/Delivery/Demo)' },
      { Code:'Q', Category:'Scheduled', 'Type of operation':'Passenger,Cargo', Description:'Passenger/Cargo in Cabin (mixed configuration aircraft)' },
      { Code:'R', Category:'Additional flights', 'Type of operation':'Passenger,Cargo', Description:'Passenger/Cargo in Cabin (mixed configuration aircraft)' },
      { Code:'S', Category:'Scheduled', 'Type of operation':'Passenger', Description:'Shuttle Mode' },
      { Code:'T', Category:'Others', 'Type of operation':'Not specific', Description:'Technical Test' },
      { Code:'U', Category:'Scheduled', 'Type of operation':'Passenger', Description:'Service operated by Surface Vehicle' },
      { Code:'V', Category:'Scheduled', 'Type of operation':'Cargo,Mail', Description:'Service operated by Surface Vehicle' },
      { Code:'W', Category:'Others', 'Type of operation':'Not specific', Description:'Military' },
      { Code:'X', Category:'Others', 'Type of operation':'Not specific', Description:'Technical Stop' },
      { Code:'Y', Category:'Others', 'Type of operation':'Not specific', Description:'Special internal purposes' },
      { Code:'Z', Category:'Others', 'Type of operation':'Not specific', Description:'Special internal purposes' }
    ];
    const captureCatalog = ()=>{
      try {
        const catalog = DATA.map(row=> ({
          Code: row.Code,
          Category: row.Category,
          Type: row['Type of operation']||'',
          Description: row.Description
        }));
        window.flightServiceTypeCatalog = catalog;
        window.flightServiceTypeCodes = new Set(catalog.map(row=> row.Code));
        const stopwords = new Set(['DE','DEL','LA','EL','LOS','LAS','THE','OF','AND','NOT','SPECIFIC','SERVICE','OPERATED','BY','FLIGHTS','FLIGHT','PASSENGER','CARGO','MAIL','MODE','ONLY','NORMAL','TEST','STATE','DIPLOMATIC','AIR','AMBULANCE','TRAINING','CHECK','BUSINESS','AVIATION','SPECIAL','HANDLING','NON-REVENUE','POSITIONING','FERRY','DELIVERY','DEMO','TECHNICAL','STOP','INTERNAL','PURPOSES','MILITARY','SHUTTLE','VEHICLE']);
        const norm = (s)=> (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/gi,' ').toLowerCase();
        const infoMap = new Map();
        catalog.forEach(row=>{
          const text = `${row.Description} ${row.Type} ${row.Category}`;
          const toks = norm(text).split(/[^a-z0-9]+/).filter(tok=> tok && tok.length >= 3 && !stopwords.has(tok.toUpperCase()));
          infoMap.set(row.Code, {
            tokens: Array.from(new Set(toks)),
            textNorm: norm(text)
          });
        });
        window.flightServiceTypeInfoByCode = infoMap;
      } catch(_){ }
    };
    captureCatalog();
    const labelFor = (row)=>{
      const code = (row.Code||'').toUpperCase();
      const desc = row.Description||'';
      return desc ? `${code} — ${desc}` : code;
    };
    const updateInfo = (row)=>{
      if (!info) return;
      if (!row){ info.textContent = ''; return; }
      const badge = row.Category ? `<span class="badge bg-secondary me-1">${row.Category}</span>` : '';
      const type = row['Type of operation']||'';
      const desc = row.Description||'';
      info.innerHTML = `${badge}${type}${(type && desc)?' — ':''}${desc}`;
    };
    if (String(sel.tagName||'').toUpperCase() !== 'SELECT'){
      try {
        sel.setAttribute('maxlength','1');
        sel.setAttribute('pattern','[A-Za-z]');
        sel.style.textTransform = 'uppercase';
        if (!sel.getAttribute('list')) sel.setAttribute('list','flight-type-list');
        if (!sel.getAttribute('placeholder')) sel.setAttribute('placeholder','Escribe la letra del tipo (A–Z)');
      } catch(_){ }
      const dl = document.getElementById('flight-type-list');
      if (dl){
        dl.innerHTML = '';
        DATA.forEach(row=>{
          const code = (row.Code||'').toUpperCase(); if (!code) return;
          const label = labelFor(row);
          const opt = document.createElement('option');
          opt.value = code;
          opt.setAttribute('label', label);
          opt.textContent = label;
          try { opt.text = label; } catch(_){ }
          dl.appendChild(opt);
        });
      }
      const byCode = new Map(); DATA.forEach(row=>{ const c=(row.Code||'').toUpperCase(); if (c) byCode.set(c, row); });
      const normalizeCode = (v)=> (v||'').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,1);
      if (!sel._wiredFlightTypeInput){
        sel._wiredFlightTypeInput = 1;
        sel.addEventListener('input', ()=>{
          const v = normalizeCode(sel.value);
          if (sel.value !== v) sel.value = v;
          updateInfo(byCode.get(v)||null);
        });
      }
      updateInfo(byCode.get(normalizeCode(sel.value))||null);
      return;
    }
    const keepFirst = sel.querySelector('option[value=""]');
    sel.innerHTML = '';
    sel.appendChild(keepFirst || new Option('Selecciona…',''));
    DATA.forEach(row=>{
      const code = (row.Code||'').toUpperCase(); if (!code) return;
      const opt = new Option(labelFor(row), code);
      opt.dataset.category = row.Category||'';
      opt.dataset.operation = row['Type of operation']||'';
      opt.dataset.description = row.Description||'';
      sel.appendChild(opt);
    });
    if (!sel._wiredFlightType){
      sel._wiredFlightType = 1;
      sel.addEventListener('change', ()=>{
        const opt = sel.selectedOptions && sel.selectedOptions[0];
        if (!opt){ updateInfo(null); return; }
        updateInfo({
          Code: opt.value,
          Category: opt.dataset.category||'',
          'Type of operation': opt.dataset.operation||'',
          Description: opt.dataset.description||''
        });
      });
    }
    sel.value = '';
    updateInfo(null);
  };

  // Lightweight, shared OCR preloader using Tesseract.js scheduler (multi-worker)
  function planeProgressSet(p, text){
    try {
      // Usar el loader de sección (overlay tipo login)
      const overlay = document.getElementById('manifiestos-loader');
      const labelEl = overlay ? overlay.querySelector('.loader-text') : null;
      const pct = Math.max(0, Math.min(100, Number(p)||0));
      if (overlay) overlay.classList.remove('hidden');
      // Mensaje fijo solicitado: evitar mostrar "OCR página 1/1" u otros
      const msg = (pct < 100) ? 'Escaneando…' : 'Completado';
      if (labelEl) labelEl.textContent = msg;
      // Mantener la barra antigua ocultada si existe
      const cont = document.getElementById('manifest-plane-progress');
      if (cont) cont.classList.add('d-none');
    } catch(_){ }
  }
  function planeProgressHide(){
    try {
      const overlay = document.getElementById('manifiestos-loader');
      if (overlay) overlay.classList.add('hidden');
      const labelEl = overlay ? overlay.querySelector('.loader-text') : null;
      if (labelEl) labelEl.textContent = '';
      // Reset de la barra antigua si existe
      const cont = document.getElementById('manifest-plane-progress');
      const fill = document.getElementById('manifest-plane-fill');
      const plane = document.getElementById('manifest-plane-icon');
      const label = document.getElementById('manifest-plane-label');
      if (fill) fill.style.width = '0%';
      if (plane) plane.style.left = '0%';
      if (label) label.textContent = '';
      if (cont) cont.classList.add('d-none');
    } catch(_){ }
  }

  // Move the full setup into this module
  window.setupManifestsUI = function setupManifestsUI(){
    try {
  // Si la configuración V2 ya está activa, no montar la V1 para evitar doble render y listeners duplicados
  if (window._manifV2Wired) return;
  const sec = document.getElementById('manifiestos-section');
  if (!sec) return; // sección no presente aún
  const up = document.getElementById('manifest-upload');
  const prevImg = document.getElementById('manifest-preview');
  const prevCanvas = document.getElementById('manifest-preview-canvas');
  const prevTextLayer = document.getElementById('manifest-text-layer');
  const zoomInBtn = document.getElementById('manifest-zoom-in');
  const zoomOutBtn = document.getElementById('manifest-zoom-out');
  const zoomLabel = document.getElementById('manifest-zoom-label');
  const toggleTextBtn = document.getElementById('manifest-toggle-text');
  if (zoomInBtn && !zoomInBtn._wired){ zoomInBtn._wired=1; zoomInBtn.addEventListener('click', ()=> window.manifestSetZoom(window.__manifestZoom + 0.1)); }
  if (zoomOutBtn && !zoomOutBtn._wired){ zoomOutBtn._wired=1; zoomOutBtn.addEventListener('click', ()=> window.manifestSetZoom(window.__manifestZoom - 0.1)); }
  if (toggleTextBtn && !toggleTextBtn._wired){ toggleTextBtn._wired=1; toggleTextBtn.addEventListener('click', ()=>{ if (!prevTextLayer) return; const hidden = prevTextLayer.style.display==='none' || prevTextLayer.classList.contains('d-none'); if (hidden){ prevTextLayer.classList.remove('d-none'); prevTextLayer.style.display=''; } else { prevTextLayer.classList.add('d-none'); prevTextLayer.style.display='none'; } }); }
  // Wheel zoom on preview container
  try {
    const cont = document.getElementById('manifest-preview-container');
  if (cont && !cont._wiredWheel){ cont._wiredWheel=1; cont.addEventListener('wheel', (e)=>{ if (e.ctrlKey || e.altKey){ e.preventDefault(); const dir = e.deltaY<0?1:-1; window.manifestSetZoom(window.__manifestZoom + dir*0.05); } }, { passive:false }); }
  } catch(_){ }
  const placeholder = document.getElementById('manifest-preview-placeholder');
  const runBtn = document.getElementById('manifest-run-ocr');
  const loadEx = document.getElementById('manifest-load-example');
  const tableBody = document.querySelector('#manifest-records-table tbody');
  const saveBtn = document.getElementById('manifest-save');
  const clearBtn = document.getElementById('manifest-clear');
  const exportBtn = document.getElementById('manifest-export-json');
  const exportCsvBtn = document.getElementById('manifest-export-csv');
  const dirArr = document.getElementById('mf-dir-arr');
  const dirDep = document.getElementById('mf-dir-dep');
  const pdfStatus = document.getElementById('manifest-pdf-status');
  const altScanBtn = document.getElementById('manifest-scan-ocr');
  const ocrPagesSel = document.getElementById('manifest-ocr-pages');
  const ocrDebug = document.getElementById('manifest-ocr-debug');
  const upBtnPdf = document.getElementById('manifest-upload-btn-pdf');
  const upBtnImg = document.getElementById('manifest-upload-btn-img');
  // Demoras: catálogo IATA/Local (delay.csv)
  let delayAlphaMap = new Map(); // ALPHA (2-3 letras) -> { numeric, alpha, summary, description, category }
  async function loadDelayCatalog(){
    try {
      let text = '';
      try {
        const res = await fetch('data/master/delay.csv', { cache: 'no-store' });
        text = await res.text();
      } catch(_){ /* fallthrough to fallback */ }
      // Fallback CSV (manual) when fetch fails or empty; provided by user
      if (!text || !text.trim()){
        text = `Numeric code,Alpha code,Summary,Description,Category
37,GB,CATERING,Late delivery or loading,Aircraft and Ramp Handling
38,GU,ULD,Lack of or serviceability,Aircraft and Ramp Handling
89,,test,,test
35,GC,AIRCRAFT CLEANING,,Aircraft and Ramp Handling
36,GF,FUELLING / DEFUELLING,Fuel supplier,Aircraft and Ramp Handling
0,,AIRLINE INTERNAL CODE,IATA has recommended that these codes are used by individual airlines to develop code definitions that meet their specific requirements.,Others1
39,GT,TECHNICAL EQUIPMENT,"Lack of or breakdown, lack of staff, e.g. pushback",Aircraft and Ramp Handling
1,,AIRLINE INTERNAL CODE,IATA has recommended that these codes are used by individual airlines to develop code definitions that meet their specific requirements.,Others
84,AW,ATFM DUE TO WEATHER AT DESTINATION,,AIR TRAFFIC FLOW MANAGEMENT RESTRICTIONS
85,AS,MANDATORY SECURITY,,AIRPORT AND GOVERNMENTAL AUTHORITIES
82,AX,ATFM DUE TO ATC STAFF / EQUIPMENT ENROUTE,"Reduced capacity caused by industrial action or staff shortage, equipment failure, military exercise or extraordinary demand due to capacity reduction in neighbouring area",AIR TRAFFIC FLOW MANAGEMENT RESTRICTIONS
83,AE,ATFM DUE TO RESTRICTION AT DESTINATION AIRPORT,"Airport and / or runway closed due to obstruction, industrial action, staff shortage, political unrest, noise abatement, night curfew, special flights",AIR TRAFFIC FLOW MANAGEMENT RESTRICTIONS
88,AD,RESTRICTIONS AT DESTINATION AIRPORT,"Airport and / or runway closed due to obstruction industrial action, staff shortage, political unrest, noise abatement, night curfew, special flights",AIRPORT AND GOVERNMENTAL AUTHORITIES
89,AM,RESTRICTIONS AT AIRPORT OF DEPARTURE,"Including air traffic services, start-up and pushback, airport and / or runway closed due to obstruction or weather (restriction due to weather in case of ATFM only) industrial action, staff shortage, political unrest, noise abatement, night curfew, special flights",AIRPORT AND GOVERNMENTAL AUTHORITIES
86,AG,"IMMIGRATION, CUSTOMS, HEALTH",,AIRPORT AND GOVERNMENTAL AUTHORITIES
87,AF,AIRPORT FACILITIES,"Parking stands, ramp congestion, lighting, buildings, gate limitations etc.",AIRPORT AND GOVERNMENTAL AUTHORITIES
41,TD,AIRCRAFT DEFECTS,,Technical and Aircraft Equipment
45,TA,AOG SPARES,To be carried to another station,Technical and Aircraft Equipment
81,AT,ATFM DUE TO ATC EN-ROUTE DEMAND / CAPACITY,Standard demand / capacity problems,AIR TRAFFIC FLOW MANAGEMENT RESTRICTIONS
44,TS,SPARES AND MAINTENANCE EQUIPMENT,Lack of or breakdown,Technical and Aircraft Equipment
43,TN,NON-SCHEDULED MAINTENANCE,Special checks and / or additional works beyond normal maintenance schedule,Technical and Aircraft Equipment
42,TM,SCHEDULED MAINTENANCE,Late release,Technical and Aircraft Equipment
24,CI,INADEQUATE PACKING,,Cargo and Mail
25,CO,OVERSALES,Booking errors,Cargo and Mail
26,CU,LATE PREPARATION IN WAREHOUSE,,Cargo and Mail
27,CE,"DOCUMENTATION, PACKING",,Mail Only
28,CL,LATE POSITIONING,,Mail Only
29,CA,LATE ACCEPTANCE,,Mail Only
69,FB,CAPTAIN REQUEST FOR SECURITY CHECK,Extraordinary requests outside mandatory requirements,Flight Operations and Crewing
68,FA,CABIN CREW ERROR OR SPECIAL REQUEST,Not within operational requirements,Flight Operations and Crewing
71,WO,DEPARTURE STATION,,Weather
72,WT,DESTINATION STATION,,Weather
73,WR,EN-ROUTE OR ALTERNATE,,Weather
75,WI,DE-ICING OF AIRCRAFT,"Removal of ice and/or snow, frost prevention excluding unserviceability of equipment",Weather
76,WS,"REMOVAL OF SNOW, ICE, WATER, AND SAND FROM AIRPORT",,Weather
77,WG,GROUND HANDLING IMPAIRED BY ADVERSE WEATHER CONDITIONS,,Weather
32,GL,LOADING / UNLOADING,"Bulky, special load, lack of loading staff",Aircraft and Ramp Handling
31,GD,LATE / INACCURATE AIRCRAFT DOCUMENTATION,"Weight and balance, general declaration, pax manifest, etc.",Aircraft and Ramp Handling
34,GS,SERVICING EQUIPMENT,"Lack of or breakdown, lack of staff, e.g. steps",Aircraft and Ramp Handling
33,GE,LOADING EQUIPMENT,"Lack of or breakdown, e.g. container pallet loader, lack of staff",Aircraft and Ramp Handling
19,PW,REDUCED MOBILITY,Boarding / deboarding of passengers with reduced mobility.,Passenger and Baggage
17,PC,CATERING ORDER,late or incorrect order given to supplier,Passenger and Baggage
18,PB,BAGGAGE PROCESSING,Late or incorrectly sorted baggage,Passenger and Baggage
92,RT,THROUGH CHECK-IN ERROR,Passenger or baggage,Reactionary
15,PH,BOARDING,"Discrepancies and paging, missing checked-in passenger",Passenger and Baggage
91,RL,LOAD CONNECTION,Awaiting load from another flight,Reactionary
16,PS,COMMERCIAL PUBLICITY/ PASSENGER CONVENIENCE,"VIP, press, ground meals and missing personal items",Passenger and Baggage
13,PE,CHECK-IN ERROR TEST,Passenger and baggage,Passenger and Baggage
14,PO,OVERSALES,Booking errors,Passenger and Baggage
96,RO,OPERATIONS CONTROL,"Re-routing, diVERSION,AIRLINDID,HANDLINGCAT, consolidation, aircraft change for reasons other than technical",Reactionary
95,RC,CREW ROTATION,"Awaiting flight deck, or entire crew, from another flight",Reactionary
94,RS,CABIN CREW ROTATION,Awaiting cabin crew from another flight,Reactionary
93,RA,AIRCRAFT ROTATION,Late arrival of aircraft from another flight or previous sector,Reactionary
99,MX,MISCELLANEOUS,No suitable code; explain reason(s) in plain text,Miscellaneous
98,MO,INDUSTRIAL ACTION OUTSIDE OWN AIRLINE,Excluding Air Traffic Control Services,Miscellaneous
97,MI,INDUSTRIAL ACTION WITHIN OWN AIRLINE,,Miscellaneous
66,FL,LATE CABIN CREW BOARDING OR DEPARTURE PROCEDURES,Other than connection and standby,Flight Operations and Crewing
67,FC,CABIN CREW SHORTAGE,"Sickness, awaiting standby, flight time limitations, valid visa, health documents, etc.",Flight Operations and Crewing
64,FS,FLIGHT DECK CREW SHORTAGE,"Sickness, awaiting standby, flight time limitations, valid visa, health documents, etc.",Flight Operations and Crewing
65,FR,FLIGHT DECK CREW SPECIAL REQUEST,Requests not within operational requirements,Flight Operations and Crewing
62,FF,OPERATIONAL REQUIREMENTS,"Fuel, load alteration",Flight Operations and Crewing
63,FT,LATE CREW BOARDING OR DEPARTURE PROCEDURES,Other than connection and standby (flight deck or entire crew),Flight Operations and Crewing
61,FP,FLIGHT PLAN,"Late completion or change of, flight documentation",Flight Operations and Crewing
23,CC,LATE ACCEPTANCE,,Cargo and Mail
22,CP,LATE POSITIONING,,Cargo and Mail
21,CD,DOCUMENTATION,Errors etc.,Cargo and Mail
6,OA,NO GATE/STAND AVAILABILITY DUE TO OWN AIRLINE ACTIVITY,,Others
47,TL,STANDBY AIRCRAFT,Lack of planned stand-by aircraft for technical reasons,Technical and Aircraft Equipment
46,TC,AIRCRAFT CHANGE,For technical reasons,Technical and Aircraft Equipment
48,TV,"SCHEDULED CABIN CONFIGURATION/VERSION,AIRLINDID,HANDLINGCAT ADJUSTMENTS",,Technical and Aircraft Equipment
53,ED,DEPARTURE CONTROL,,EDP/Automated Equipment Failure
54,EC,CARGO PREPARATION/DOCUMENTATION,,EDP/Automated Equipment Failure
55,EF,FLIGHT PLANS,,EDP/Automated Equipment Failure
56,EO,OTHER AUTOMATED SYSTEM,,EDP/Automated Equipment Failure
51,DF,DAMAGE DURING FLIGHT OPERATIONS,"Bird or lightning strike, turbulence, heavy or overweight landing, collisions during taxiing",Damage to Aircraft
52,DG,DAMAGE DURING GROUND OPERATIONS,"Collisions (other than taxiing), loading / offloading damage, towing, contamination, extreme weather conditions",Damage to Aircraft
12,PL,LATE CHECK-IN,Congestion in check-in area,Passenger and Baggage
11,PD,LATE CHECK-INAAA,Acceptance after deadline,Passenger and Baggage
101,AAM,AUTORIDAD MIGRATORIA,,AUTORIDES
106,AAG,GUARDIA NACIONAL,,AUTORIDADES
108,AAX,OTRAS,,AUTORIDADES
112,CST,SERVICIO DE RAMPA,RETRASO EN EL SERVICIO DEL TRACTOR DE ARRASTRE POR FALTA O FALLA DEL EQUIPO/ MAL PROCEDIMIENTO,COMPAÑÍA (AEROLÍNEA)
149,CRF,SISTEMAS ,FALLA DEL SISTEMA DE DOCUMENTACIÓN ,COMPAÑÍA (AEROLÍNEA) 
154,CVV,SOLICITUD TARDÍA DE SERVICIOS ,,COMPAÑÍA (AEROLÍNEA) 
157,EWE,METEOROLOGÍA ,VIENTOS EN CONTRA ,EVENTO CIRCUNSTANCIAL 
160,EWO,METEOROLOGÍA ,EN EL AEROPUERTO DE ORIGEN ,EVENTO CIRCUNSTANCIAL 
161,EWX,METEOROLOGÍA ,OTRO,EVENTO CIRCUNSTANCIAL 
162,ESB,PROCEDIMIENTO DE SEGURIDAD ,AMENAZA DE BOMBA ,EVENTO CIRCUNSTANCIAL 
165,EPD,OCASIONADO POR PAX ,PROCESO DE PASAJERO A BORDO ,EVENTO CIRCUNSTANCIAL 
169,IGO,GEOMETRÍA DEL AEROPUERTO ,CONGESTIONAMIENTO DEL ÁREA DE MOVIMIENTO ,INFRAESTRUCTURA AEROPORTUARIA 
179,IML,INFRAESTRUCTURA ,DEMORAS OCASIONADAS POR FALTA O INADECUADA LIMPIEZA DE LAS ÁREAS OPERACIONALES ,INFRAESTRUCTURA AEROPORTUARIA 
183,ROA,ORIGINADA EN EL AIFA ,,REPERCUSIÓN 
191,SPD,SERVICIO DE PASILLO ,DEMORA EN LA PRESTACIÓN DEL SERVICIO ,SERVICIOS AEROPORTUARIOS 
192,SPX,SERVICIO DE PASILLO ,OTRO,SERVICIOS AEROPORTUARIOS 
193,SAE,SERVICIO DE AEROCARES ,FALLA DE EQUIPO ,SERVICIOS AEROPORTUARIOS 
194,SAO,SERVICIO DE AEROCARES ,FALTA DEL OPERADOR ,SERVICIOS AEROPORTUARIOS 
195,SAD,SERVICIO DE AEROCARES ,DEMORA EN LA PRESTACIÓN DEL SERVICIO ,SERVICIOS AEROPORTUARIOS 
202,SGX,ASIGNACIÓN DE POSICIONES ,OTRO ,SERVICIOS AEROPORTUARIOS 
204,SVP,SEGURIDAD Y VIGILANCIA ,FALTA O INSUFICIENCIA DE PERSONAL ,SERVICIOS AEROPORTUARIOS 
105,AAN,SEGURIDAD NACIONAL,,AUTORIDAD
122,COT,OPERACIONES,TRANSPORTACIÓN DE TRIPULACIÓN,COMPAÑÍA (AEROLÍNEA)
107,AAF,AUTORIDAD INVESTIGADORA,,AUTORIDADES
126,CCT,CONTROL OPERACIONAL,OCASIONA ERRÓNEA DE TRIPULACIÓN,COMPAÑÍA (AEROLÍNEA)
118,CEM,EXPRESS Y CARGA,EMBALAJE ERRÓNEO O INADECUADO.,COMPAÑÍA (AEROLÍNEA) 
119,CEG,EXPRESS Y CARGA,FALTA DE GUÍAS DE CARGA QUE SE TRANSPORTA ,COMPAÑÍA (AEROLÍNEA) 
121,CEX,EXPRESS Y CARGA,OTRO,COMPAÑÍA (AEROLÍNEA) 
128,CCD,CONTROL OPERACIONAL,"DOCUMENTACIÓN DE VUELO, FALTA O CORRECCIÓN DE ESTA (PLAN DE VUELO).",COMPAÑÍA (AEROLÍNEA) 
129,CCC,CONTROL OPERACIONAL ,CAMBIO DE EQUIPO POR  RAZONES TECNICAS,COMPAÑÍA (AEROLÍNEA) 
135,CMC,MANTENIMIENTO,CAMBIO DE EQUIPO POR RAZONES DE MANTENIMIENTO ,COMPAÑÍA (AEROLÍNEA) 
140,CPE,TRIPULACIÓN ,"PETICIÓN ESPECIAL DE LA TRIPULACIÓN  (RECARGA DE COMBUSTIBLE, COMISARIATOS ETC.)",COMPAÑÍA (AEROLÍNEA) 
151,CFT,COMISARIATO ,PRESENTANDOSE TARDE,COMPAÑÍA (AEROLÍNEA) 
152,CFF,COMISARIATO,FALTA DE ALIMENTOS ,COMPAÑÍA (AEROLÍNEA) 
156,EWF,METEOROLOGÍA ,VIENTOS A FAVOR ,EVENTO CIRCUNSTANCIAL 
158,EWD,METEOROLOGÍA ,EN EL AEROPUERTO DE DESTINO ,EVENTO CIRCUNSTANCIAL 
159,EWP,METEOROLOGÍA ,CAMBIO DE PISTA ,EVENTO CIRCUNSTANCIAL 
164,EPC,OCASIONADO POR PAX ,PASAJERO CONFLICTIVO ,EVENTO CIRCUNSTANCIAL 
171,IGX,GEOMETRÍA DEL AEROPUERTO ,OTRO ,INFRAESTRUCTURA AEROPORTUARIA  
172,ILP,LIMITACIONES DEL EDIFICIO TERMINAL ,FALTA DE POSICIONES SUFICIENTES PARA ABORDADOR MECÁNICO ,INFRAESTRUCTURA AEROPORTUARIA 
173,ILF,LIMITACIONES DEL EDIFICIO TERMINAL ,SATURACIÓN DE FILTROS DE SEGURIDAD POR MOTIVOS DE INFRAESTRUCTURA ,INFRAESTRUCTURA AEROPORTUARIA 
174,ILT,LIMITACIONES DEL EDIFICIO TERMINAL ,POR INFORMACIÓN ERRÓNEA POR EL SISTEMA DE VOCEO Y PANTALLAS DE INFORMACIÓN DE VUELO.,INFRAESTRUCTURA AEROPORTUARIA  
175,ILV,LIMITACIONES DE EDIFICIO TERMINAL ,INADECUADA SEÑALIZACIÓN VISUAL DE PASAJEROS ,INFRAESTRUCTURA AEROPORTUARIA  
176,ILX,LIMITACIONES DEL EDIFICIO TERMINAL ,OTRO ,INFRAESTRUCTURA AEROPORTUARIA 
177,IMO,INFRAESTRUCTURA ,MANTENIMIENTO DE LAS ÁREAS OPERACIONALES ,INFRAESTRUCTURA AEROPORTUARIA 
178,IME,INFRAESTRUCTURA ,MANTENIMIENTO DEL EDIFICIO TERMINAL ,INFRAESTRUCTURA AEROPORTUARIA 
182,PAI,INCIDENTE ,,PERCANCES 
184,ROF,ORIGINADA FUERA DEL AIFA ,"Demora fue debido a salida tardía de aeropuerto de origen.		
",REPERCUSIÓN 
186,STA,SERVICIO DE TRANSITO AÉREO ,FALLA ORIGINADA EN EL AIFA,SERVICIOS AEROPORTUARIOS 
187,STF,SERVICIO DE TRANSITO AÉREO ,FALLA ORIGINADA FUERA DEL AIFA ,SERVICIOS AEROPORTUARIOS 
189,SPE,SERVICIO DE PASILLO ,FALLA DE EQUIPO ,SERVICIOS AEROPORTUARIOS 
196,SAX,SERVICIO DE AEROCARES ,OTRO ,SERVICIOS AEROPORTUARIOS 
203,SVE,SEGURIDAD Y VIGILANCIA ,FALTA O FALLA DE LOS EQUIPOS DE REVISIÓN ,SERVICIOS AEROPORTUARIOS 
205,SVX,SEGURIDAD Y VIGILANCIA ,OTRO ,SERVICIOS AEROPORTUARIOS 
103,AAJ,AUTORIDAD JUDICIAL,,AUTORIDADES
100,AAA,AUTORIDAD AERONAUTICA,,AUTORIDADES
102,AAD,AUTORIDAD ADUANAL,,AUTORIDADES
104,AAS,AUTORIDAD SANITARIA,,AUTORIDAD
109,CSC,SERVICIO DE RAMPA,LENTITUD EN LA CARGA/ DESCARGA DEL AVIÓN POR FALTA O INSUFICIENCIA DEL PERSONAL/ COMPLICACIÓN POR LA CARGA,COMPAÑIA
110,CSF,SERVICIO DE RAMPA,FALTA O FALLA DEL EQUIPO DE APOYO DE TIERRA,COMPAÑÍA (AEROLÍNEA)
111,CSL,SERVICIO DE RAMPA,RETRASO DE LA LIMPIEZA DEL AVIÓN,COMPAÑÍA (AEROLÍNEA)
113,CSA,SERVICIO DE RAMPA,RETRASO DE SERVICIO DE AGUAS NEGRAS Y POTABLE POR FALTA O FALLA DEL EQUIPO/ FALTA DE AGUA POTABLE / ETC,COMPAÑÍA (AEROLÍNEA)
114,CSE,SERVICIO DE RAMPA,RETRASO EN EL SERVICIO DE ESCALERILLA,COMPAÑÍA (AEROLÍNEA)
115,CSX,SERVICIO DE RAMPA,OTRO,COMPAÑÍA (AEROLÍNEA)
123,COM,OPERACIONES,MANIFIESTO DE CARGA Y BALANCE (RETRASO O ERROR EN EL MISMO),COMPAÑÍA (AEROLÍNEA)
124,COX,OPERACIONES,OTRO,COMPAÑÍA (AEROLÍNEA)
125,CCA,OPERACIONES,CONVENIENCIA DE LA COMPAÑÍA AÉREA,COMPAÑÍA (AEROLÍNEA)
127,CCE,CONTROL OPERACIONAL,ASIGNACIÓN ERRÓNEA DE EQUIPO,COMPAÑÍA (AEROLÍNEA)
116,CEC,EXPRESS Y CARGA,CIERRE TARDE DEL VUELO POR ESPERA DE CARGA MENSAJERÍA O CORREO ,COMPAÑIA (AEROLINEA)
117,CEE,EXPRESS Y CARGA,"ERRORES DOCUMENTACIÓN,  MATERIAL DOCUMENTADO NO PERMITIDO ETC.",COMPAÑÍA (AEROLÍNEA) 
120,CES,EXPRESS Y CARGA ,SOBREVENTA DE LOS ESPACIOS DE CARGA ,COMPAÑÍA (AEROLÍNEA) 
130,CCX,CONTROL OPERACIONAL,OTRO,COMPAÑÍA (AEROLÍNEA) 
131,CMP,MANTENIMIENTO,MANTENIMIENTO PROGRAMADO (LIBERACIÓN TARDÍA DEL HANGAR),COMPAÑÍA (AEROLÍNEA) 
132,CMN,MANTENIMIENTO,MANTENIMIENTO NO PROGRAMADO. (CUALQUIER TIPO DE FALLA QUE SE PRESENTE DURANTE LA OPERACIÓN DEL VUELO),COMPAÑÍA (AEROLÍNEA) 
133,CMR,MANTENIMIENTO,REFACCIONES Y EQUIPO DE MANTENIMIENTO (FALTA O FALLA),COMPAÑÍA (AEROLÍNEA) 
134,CMA,MANTENIMIENTO ,"FALLA TÉCNICO-ADMINISTRATIVA (FALTA DE BITÁCORA, CERTIFICADO ETC.)",COMPAÑÍA (AEROLÍNEA) 
136,CMX,MANTENIMIENTO ,OTRO ,COMPAÑÍA (AEROLÍNEA) 
137,CPR,TRIPULACIÓN ,ESPERANDO TRIPULACIÓN DE RESERVA ,COMPAÑÍA (AEROLÍNEA) 
138,CPT,TRIPULACIÓN ,TRIPULACIÓN PRESENTÁNDOSE TARDE ,COMPAÑÍA (AEROLÍNEA) 
139,CPP,TRIPULACIÓN ,CAMBIO DE TRIPULACIÓN (TÉCNICA Y/O SERVICIO),COMPAÑÍA (AEROLÍNEA) 
141,CPX,TRIPULACIÓN ,OTRO,COMPAÑÍA (AEROLÍNEA) 
142,CTB,TRAFICO ,"ABORDAJE (PASAJERO MAL ABORDADO, ABORDAJE LENTO, DISCREPANCIA EN NUMERO DE PASAJEROS ETC.)",COMPAÑÍA (AEROLÍNEA) 
143,CTL,TRAFICO ,LOCALIZACIÓN O ESPERA DE PASAJEROS EN TRANSITO,COMPAÑÍA (AEROLÍNEA) 
144,CTD,TRAFICO ,"DOCUMENTACIÓN (ERRORES AL DOCUMENTAR, CIERRE TARDE DEL VUELO, ETC.)",COMPAÑÍA (AEROLÍNEA) 
145,CTE,TRAFICO ,"MANEJO DE EQUIPAJE (BAJANDO EQUIPAJES VOLUMINOSOS, BAJANDO EQUIPAJE DE PASAJERO QUE NO ABORDÓ, ETC) ",COMPAÑÍA (AEROLÍNEA) 
146,CTP,TRAFICO ,MANEJO DE PASAJERO DISCAPACITADO ,COMPAÑÍA (AEROLÍNEA) 
147,CTS,TRAFICO ,SOBREVENTA ,COMPAÑÍA (AEROLÍNEA) 
148,CTX,TRAFICO ,OTRO,COMPAÑÍA (AEROLÍNEA) 
150,CRX,SISTEMAS ,OTRO,COMPAÑÍA (AEROLÍNEA) 
153,CFX,COMISARIATO,OTRO,COMPAÑÍA (AEROLÍNEA) 
155,EWA,METEOROLOGÍA ,EN EL AIFA,EVENTO CIRCUNSTANCIAL 
163,ESX,PROCEDIMIENTO DE SEGURIDAD ,OTRO ,EVENTO CIRCUNSTANCIAL 
166,EPE,OCASIONADO POR PAX ,PASAJERO DELICADO POR ENFERMEDAD O DISCAPACIDAD ,EVENTO CIRCUNSTANCIAL 
167,EPX,OCASIONADO POR PAX ,OTRO ,EVENTO CIRCUNSTANCIAL 
168,EXX,OTRO NO CODIFICADO ,,EVENTO CIRCUNSTANCIAL 
170,IGR,GEOMETRÍA DEL AEROPUERTO ,AERONAVE REMOLCADA ,INFRAESTRUCTURA AEROPORTUARIA 
180,IMX,INFRAESTRUCTURA ,OTRO ,INFRAESTRUCTURA AEROPORTUARIA 
181,PAC,ACCIDENTE ,,PERCANCES 
185,R,REPERCUSIÓN ,,REPERCUSIÓN 
188,STX,SERVICIO DE TRANSITO AÉREO ,OTRO ,SERVICIOS AEROPORTUARIOS 
190,SPO,SERVICIO DE PASILLO ,FALTA O ERROR DEL OPERADOR ,SERVICIOS AEROPORTUARIOS 
197,SCE,SERVICIO DE COMBUSTIBLE ,FALLA DEL EQUIPO ,SERVICIOS AEROPORTUARIOS 
198,SCO,SERVICIO DE COMBUSTIBLE ,FALTA DEL OPERADOR ,SERVICIOS AEROPORTUARIOS 
199,SCD,SERVICIO DE COMBUSTIBLE ,DEMORA EN LA PRESTACIÓN DEL SERVICIO ,SERVICIOS AEROPORTUARIOS 
200,SCX,SERVICIO DE COMBUSTIBLE ,OTRO ,SERVICIOS AEROPORTUARIOS  
201,SGE,ASIGNACIÓN DE POSICIONES ,ERROR EN LA ASIGNACIÓN DE POSICIONES ,SERVICIOS AEROPORTUARIOS`;
      }
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      // parser simple con comillas
      const parseLine = (line)=>{
        const out=[]; let cur=''; let inQ=false;
        for (let i=0;i<line.length;i++){
          const ch=line[i];
          if (ch==='"'){
            if (inQ && line[i+1]==='"'){ cur+='"'; i++; }
            else { inQ=!inQ; }
          } else if (ch===',' && !inQ){ out.push(cur); cur=''; }
          else { cur+=ch; }
        }
        out.push(cur); return out;
      };
      const headers = parseLine(lines[0]).map(h=> String(h||'').trim());
      const idx = (name)=> headers.findIndex(h=> h.toLowerCase() === name.toLowerCase());
      const iNum = idx('Numeric code');
      const iAlpha = idx('Alpha code');
      const iSummary = idx('Summary');
      const iDesc = idx('Description');
      const iCat = idx('Category');
      for (let i=1;i<lines.length;i++){
        const cols = parseLine(lines[i]);
        const alpha = (cols[iAlpha]||'').toString().trim().toUpperCase();
        const numeric = (cols[iNum]||'').toString().trim();
        const summary = (cols[iSummary]||'').toString().trim();
        const description = (cols[iDesc]||'').toString().trim();
        const category = (cols[iCat]||'').toString().trim();
        if (!alpha) continue;
        if (/^[A-Z]{2,3}$/.test(alpha)){
          delayAlphaMap.set(alpha, { numeric, alpha, summary, description, category });
        }
      }

      // Crear/actualizar datalist con códigos ALPHA para autocompletar
      try {
        let dl = document.getElementById('delay-alpha-codes');
        if (!dl){
          dl = document.createElement('datalist');
          dl.id = 'delay-alpha-codes';
          document.body.appendChild(dl);
        }
        const opts = Array.from(delayAlphaMap.entries())
          .sort(([a],[b])=> a.localeCompare(b))
          .map(([code, rec])=>{
            const desc = (rec.description||'').trim();
            const sum = (rec.summary||'').trim();
            const label = [desc, sum].filter(Boolean).join(' — ');
            const text = label ? `${code} — ${label}` : code;
            return `<option value="${code}" label="${label.replace(/"/g,'&quot;')}">${text}</option>`;
          })
          .join('');
        dl.innerHTML = opts;
      } catch(_){ }
    } catch(_){ /* ignore */ }
  }

  // Redundancy: ensure the delay catalog is loaded as soon as DOM is ready,
  // so the datalist has options even if other setup fails or the section isn't activated yet.
  try { document.addEventListener('DOMContentLoaded', function(){ try { loadDelayCatalog(); } catch(_){} }); } catch(_){}

  // Extrae minutos de demora cerca de la sección CAUSAS DE LA DEMORA y los asocia por línea con códigos reconocidos
  function extractDelayMinutesFromText(text, codes){
    try {
      const U = (text||'').toString().toUpperCase();
      const lines = U.split(/\r?\n/);
      const nearLabels = [/CAUSAS?\s+DE\s+LA?\s*DEMORA/, /CAUSA\s+DE\s+DEMORA/, /CAUSAS?\s+DEMORA/, /DEMORA\s*:/, /\bCÓDIGO\b/, /\bCODIGO\b/];
      const valid = new Set((codes||[]).map(c=> String(c||'').toUpperCase()));
      const idxs = [];
      for (let i=0;i<lines.length;i++){ if (nearLabels.some(rx=> rx.test(lines[i]))) idxs.push(i); }
      const out = new Map();
      const seen = new Set();
      const inRangeNums = [];
      const rxCode = /\b[A-Z]{2,3}\b/g;
      const rxNum = /\b(\d{1,3})\b/g;
      const consider = (i,k)=>{ const s = lines[i+k]||''; if (!s) return;
        const foundCodes = (s.match(rxCode)||[]).filter(c=> valid.has(c));
        const nums = (s.match(rxNum)||[]).map(n=> parseInt(n,10)).filter(n=> n>=0 && n<=600);
        if (nums.length) inRangeNums.push(...nums);
        if (foundCodes.length===1 && nums.length>0){
          const code = foundCodes[0];
          const min = nums[nums.length-1]; // tomar el último número de la línea
          if (!seen.has(code)) { out.set(code, min); seen.add(code); }
        }
      };
      for (const i of idxs){ for (let k=-3;k<=8;k++){ if (k!==0) consider(i,k); } }
      // Si no logramos asociar por línea, asignar por orden
      if (out.size===0 && inRangeNums.length>0){
        for (let i=0;i<codes.length;i++){ if (inRangeNums[i]!=null) out.set(codes[i], inRangeNums[i]); }
      }
      return out;
    } catch(_){ return new Map(); }
  }
  // Extrae códigos de demora (ALPHA 2-3 letras) cerca de las etiquetas de demoras; fallback a búsqueda global en el documento
  function extractDelayCodesFromText(text){
    try {
      const U = (text||'').toString().toUpperCase();
      const lines = U.split(/\r?\n/);
      const nearLabels = [/CAUSAS?\s+DE\s+LA?\s*DEMORA/, /CAUSA\s+DE\s+DEMORA/, /CAUSAS?\s+DEMORA/, /DEMORA\s*:/, /\bCÓDIGO\b/, /\bCODIGO\b/];
      const hasCat = !!(delayAlphaMap && typeof delayAlphaMap.has==='function' && delayAlphaMap.size>0);
      const valid = hasCat ? new Set(Array.from(delayAlphaMap.keys())) : new Set();
      const idxs = [];
      for (let i=0;i<lines.length;i++){ if (nearLabels.some(rx=> rx.test(lines[i]))) idxs.push(i); }
      const out = [];
      const seen = new Set();
      const rxCode = /\b([A-Z]{2,3})\b/g;
      const consider = (i,k)=>{
        const s = lines[i+k]||''; if (!s) return;
        let m; rxCode.lastIndex = 0;
        while ((m = rxCode.exec(s))){
          const c = (m[1]||'').toUpperCase();
          if (hasCat && !valid.has(c)) continue;
          if (!seen.has(c)){ out.push(c); seen.add(c); }
        }
      };
      for (const i of idxs){ for (let k=-5;k<=12;k++){ consider(i,k); } }
      if (out.length) return out;
      // Fallback global: buscar todos los códigos válidos en el documento y ordenarlos por aparición
      if (hasCat){
        try {
          const all = Array.from(delayAlphaMap.keys()).filter(c=> /^([A-Z]{2,3})$/.test(c));
          const re = new RegExp(`\\b(${all.join('|')})\\b`, 'g');
          const hits = [];
          let m; re.lastIndex = 0;
          while ((m = re.exec(U))){ hits.push({ c:m[1].toUpperCase(), i:m.index }); }
          hits.sort((a,b)=> a.i - b.i);
          for (const h of hits){ if (!seen.has(h.c)){ out.push(h.c); seen.add(h.c); } }
        } catch(_){ }
      } else {
        // Sin catálogo: devolver candidatos 2-3 letras cerca de palabras DEMORA/CÓDIGO
        try {
          const re = /\b([A-Z]{2,3})\b/g; let m; let last = -1;
          while ((m = re.exec(U))){ const c=m[1]; if (!seen.has(c)){ out.push(c); seen.add(c); } last = m.index; }
        } catch(_){ }
      }
      return out;
    } catch(_){ return []; }
  }
  function fillOrAddDelayCode(code, desc){
    try {
      const c = (code||'').toString().toUpperCase();
      // Preferir nueva UI fija (3 filas)
      const fixedIds = ['demora1','demora2','demora3'];
      const getFixed = (id)=> ({
        codeEl: document.getElementById(id+'-codigo'),
        minEl: document.getElementById(id+'-tiempo'),
        descEl: document.getElementById(id+'-descripcion')
      });
      const existingFixed = new Set(fixedIds.map(fid=> (getFixed(fid).codeEl?.value||'').toUpperCase().trim()).filter(Boolean));
      if (!existingFixed.has(c)){
        const spot = fixedIds.map(getFixed).find(x=> x.codeEl && !String(x.codeEl.value||'').trim());
          if (spot && spot.codeEl){
          spot.codeEl.value = c;
          if (spot.descEl && !spot.descEl.value){
            const rec = delayAlphaMap.get(c);
            const dsc = desc || rec?.description || rec?.summary || '';
            if (dsc) spot.descEl.value = dsc;
          }
          // normalizar
          spot.codeEl.value = (spot.codeEl.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
          return;
        }
      }
      // Fallback: tabla dinámica si existe
      const cells = Array.from(document.querySelectorAll('.demora-codigo'));
      const firstEmpty = cells.find(inp=> !String(inp.value||'').trim());
      if (firstEmpty){
        firstEmpty.value = c;
        const row = firstEmpty.closest('tr');
        const d = row ? row.querySelector('.demora-descripcion') : null;
        if (d && !d.value) d.value = desc||'';
        // Normalizar código y validar contra catálogo
        if (firstEmpty){
          firstEmpty.value = (firstEmpty.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
          const isValid = delayAlphaMap.has(firstEmpty.value);
          if (row){ row.classList.toggle('table-warning', !isValid); }
        }
      } else {
        if (typeof addDemoraRow === 'function') addDemoraRow({ codigo: c, minutos: '', descripcion: desc||'' });
      }
    } catch(_){ if (typeof addDemoraRow === 'function') addDemoraRow({ codigo: code, minutos: '', descripcion: desc||'' }); }
  }
  // Helpers para la nueva UI fija (3 filas)
  function getDelayDescriptionByCode(code){
    try {
      const C=(code||'').toString().toUpperCase();
      const rec = delayAlphaMap.get(C);
      return (rec && (rec.description||rec.summary)) || '';
    } catch(_){ return ''; }
  }
  function setDemoraRow(index, code, minutes, description){
    const idx = Number(index);
    const codeEl = document.getElementById(`demora${idx}-codigo`);
    const minEl = document.getElementById(`demora${idx}-tiempo`);
    const descEl = document.getElementById(`demora${idx}-descripcion`);
    if (!codeEl || !minEl || !descEl) return;
    if (code != null) codeEl.value = (code||'').toString().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
    if (minutes != null && minutes !== '') minEl.value = minutes;
    const desc = (description && String(description).trim()) || getDelayDescriptionByCode(codeEl.value);
    if (desc) descEl.value = desc;
  }
  function readDemorasFromFixedFields(){
    const out = [];
    for (let i=1;i<=3;i++){
      const code = (document.getElementById(`demora${i}-codigo`)?.value||'').toUpperCase().trim();
      const minutosRaw = (document.getElementById(`demora${i}-tiempo`)?.value||'').trim();
      const descripcion = document.getElementById(`demora${i}-descripcion`)?.value||'';
      if (code || minutosRaw || descripcion){
        out.push({ codigo: code, minutos: minutosRaw, descripcion });
      }
    }
    return out;
  }
  function clearDemorasFixedFields(){
    for (let i=1;i<=3;i++){
      const c = document.getElementById(`demora${i}-codigo`);
      const m = document.getElementById(`demora${i}-tiempo`);
      const d = document.getElementById(`demora${i}-descripcion`);
      if (c) c.value=''; if (m) m.value=''; if (d) d.value='';
    }
  }
  // Attach NA toggles (V1) and convert to 24h text inputs if forced
  try {
    (window._mfTimeFieldIds||[]).forEach(id=> _attachNaToggle(id));
    if (window._mfForce24hText){ (window._mfTimeFieldIds||[]).forEach(id=> _convertTimeInputToText24h(id)); }
  } catch(_){ }
  // Attach catalog picker buttons (Matrículas, Aerolíneas, Aeropuertos)
  try {
    // Matrículas (tail): fill aircraft type and airline code/name when available
    window._mfAttachCatalogButton('mf-tail', { load:'aircraft', onPick:(it)=>{
      try {
        const typeName = it?.meta?.typeName || it?.meta?.type || '';
        const ownerICAO = it?.meta?.ownerICAO || '';
        const ownerName = it?.meta?.ownerName || '';
        const elType = document.getElementById('mf-aircraft'); if (elType && typeName) elType.value = typeName;
        const elCarr = document.getElementById('mf-carrier-3l'); if (elCarr && ownerICAO) elCarr.value = ownerICAO;
        const elOp = document.getElementById('mf-operator-name'); if (elOp && ownerName) elOp.value = ownerName;
      } catch(_){ }
    }});
  } catch(_){ }
  try {
    // Aerolíneas: set name and ICAO
    window._mfAttachCatalogButton('mf-airline', { load:'airlines', onPick:(it)=>{
      try { const el = document.getElementById('mf-carrier-3l'); if (el && it?.meta?.icao) el.value = (it.meta.icao||'').toUpperCase(); } catch(_){ }
    }});
    window._mfAttachCatalogButton('mf-carrier-3l', { load:'airlines', onPick:(it, input)=>{
      try { const a = it?.meta; if (!a) return; input.value = (a.icao||'').toUpperCase(); const el = document.getElementById('mf-airline'); if (el && a.name) el.value = a.name; } catch(_){ }
    }});
    // Aeropuerto principal (Llegada/Salida)
  window._mfAttachCatalogButton('mf-airport-main', { load:'airports', onPick:(it, input)=>{ try { forceAirportMainValue(); } catch(_){ } }});
  } catch(_){ }
  try {
    // Aeropuertos: code/name pairs
    const pair = (nameId, codeId)=>{
      try {
        window._mfAttachCatalogButton(nameId, { load:'airports', onPick:(it, input)=>{ try { const a=it?.meta; if (!a) return; input.value = a.name||''; const codeEl=document.getElementById(codeId); if (codeEl && a.iata) codeEl.value = a.iata.toUpperCase(); } catch(_){ } }});
        window._mfAttachCatalogButton(codeId, { load:'airports', onPick:(it, input)=>{ try { const a=it?.meta; if (!a) return; input.value = (a.iata||'').toUpperCase(); const nameEl=document.getElementById(nameId); if (nameEl && a.name) nameEl.value = a.name; } catch(_){ } }});
      } catch(_){ }
    };
    pair('mf-origin-name','mf-origin-code');
    pair('mf-next-stop','mf-next-stop-code');
    pair('mf-final-dest','mf-final-dest-code');
    pair('mf-arr-origin-name','mf-arr-origin-code');
    pair('mf-arr-last-stop','mf-arr-last-stop-code');
  } catch(_){ }
    if (pdfStatus && !pdfStatus._init){ pdfStatus._init = 1; pdfStatus.textContent = 'Listo para escanear: seleccione archivo y presione un botón.'; }
      // Si la página se abre bajo file://, deshabilitar funciones que usan fetch/XHR
      try {
        if (location && location.protocol === 'file:') {
          const scanBtn = document.getElementById('manifest-scan-pdf');
          if (scanBtn) scanBtn.disabled = true;
          if (up) up.disabled = true;
          if (pdfStatus) pdfStatus.classList.add('text-danger');
          if (pdfStatus) pdfStatus.textContent = 'Este módulo requiere abrirse desde http(s). Usa Live Server o un servidor local (http://localhost:....).';
          // Continuar el setup, pero evitar ejecuciones que hagan fetch más adelante
        }
      } catch(_){}
      function dmyToISO(s){
        try {
          const m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/.exec((s||'').trim());
          if (!m) return '';
          let dd = m[1], mm = m[2], yy = m[3];
          let year = parseInt(yy, 10);
          if (yy.length === 2){ year = (year <= 49) ? (2000 + year) : (1900 + year); }
          // zero-pad
          const z2 = (n)=> n.length===1? ('0'+n): n;
          return `${year}-${z2(mm)}-${z2(dd)}`;
        } catch(_) { return ''; }
      }
      // Helper: trigger file picker with specific type bias
      function triggerPicker(kind){
        try {
          if (!up) return;
          // Reset the input to allow re-selecting the same file
          up.value = '';
          if (kind === 'pdf'){
            up.setAttribute('accept', '.pdf,application/pdf');
          } else if (kind === 'image'){
            up.setAttribute('accept', 'image/*');
          } else {
            up.setAttribute('accept', '.pdf,application/pdf,image/*');
          }
          // Some mobile browsers decide picker based on accept; programmatic click opens the desired source
          up.click();
        } catch(_){ }
      }
      if (upBtnPdf && !upBtnPdf._wired){ upBtnPdf._wired=1; upBtnPdf.addEventListener('click', (e)=>{ e.preventDefault(); triggerPicker('pdf'); }); }
  if (upBtnImg && !upBtnImg._wired){ upBtnImg._wired=1; upBtnImg.addEventListener('click', (e)=>{ e.preventDefault(); triggerPicker('image'); }); }
  // Rotación manual eliminada por solicitud: previsualización respetará la orientación del PDF automáticamente.
      // Warm up heavy libraries shortly after section init (non-blocking)
      try {
        const idle = (fn)=>{ if (window.requestIdleCallback) requestIdleCallback(()=>setTimeout(fn,50)); else setTimeout(fn,300); };
        idle(async ()=>{ try { await ensurePdfJsFromCDN(); } catch(_){} });
        idle(async ()=>{ try { await window.ensureOcrScheduler?.(); } catch(_){} });
      } catch(_){ }

      async function extractPdfText(file) {
        if (!window.pdfjsLib) {
          pdfStatus.textContent = 'Cargando PDF.js...';
          // Preferir CDN estable; si falla, intentar vendor local
          let loaded = false;
          try {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              s.crossOrigin = 'anonymous';
              s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            });
            window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            loaded = true;
          } catch(_) {}
          if (!loaded) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script'); s.src = 'vendor/pdfjs/pdf.min.js'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            }).catch(()=>{});
            try { window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js'; } catch(_) {}
          }
          if (!window.pdfjsLib) {
            pdfStatus.textContent = 'Error: No se pudo cargar PDF.js desde CDN ni vendor/.';
            alert('Error crítico: PDF.js no está disponible. El escaneo de PDF no funcionará.');
            throw new Error('PDF.js no disponible');
          }
        }
        pdfStatus.textContent = 'Extrayendo texto del PDF...';
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        return new Promise((resolve, reject) => {
          reader.onload = async function(e) {
            try {
              const pdf = await window.pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(' ') + '\n';
                try {
                  // Progress from 40% to 65% while extracting pages
                  const pct = 40 + Math.round((i/pdf.numPages) * 25);
                  (window._manifestProgressHook||function(){ })(pct, `Extrayendo texto (${i}/${pdf.numPages})...`);
                } catch(_){ }
              }
              pdfStatus.textContent = 'Texto extraído.';
              resolve(fullText);
            } catch (err) {
              pdfStatus.textContent = 'Error al extraer texto del PDF.';
              reject(err);
            }
          };
          reader.onerror = reject;
        });
      }
      let _pdfPreviewRenderTask = null;
      async function renderPdfPreviewFirstPage(file){
        try {
          await ensurePdfJsFromCDN();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument(new Uint8Array(ab)).promise;
          const page = await pdf.getPage(1);
          const containerWidth = (prevCanvas && prevCanvas.parentElement) ? prevCanvas.parentElement.clientWidth : 1000;
          // Usar rotación embebida y verificar orientación dominante por texto para neutralizar 180°
          const detect = (await (typeof _detectPageDominantRotation==='function' ? _detectPageDominantRotation(page) : Promise.resolve(0))) || 0;
          const getUprightViewport = (pg, scale)=>{
            try {
              const eff = (((pg.rotate||0)%360)+360)%360; // 0,90,180,270
              if (eff === 180 || detect === 180) return pg.getViewport({ scale, rotation: 180 });
              return pg.getViewport({ scale });
            } catch(_){ return pg.getViewport({ scale }); }
          };
          const viewport = getUprightViewport(page, 1);
          // Render larger: target near-container-width with a higher cap
          const scale = Math.min(2.0, Math.max(0.9, containerWidth / viewport.width));
              // Aplicar vista en pie cuando el dominante o el embebido indiquen 180°
              const vp = getUprightViewport(page, scale);
          if (prevCanvas){
            prevCanvas.width = vp.width; prevCanvas.height = vp.height;
            const ctx = prevCanvas.getContext('2d');
            // Cancel any in-flight render to avoid double-render errors on the same canvas
            if (_pdfPreviewRenderTask && _pdfPreviewRenderTask.cancel){
              try { _pdfPreviewRenderTask.cancel(); await _pdfPreviewRenderTask.promise.catch(()=>{}); } catch(_){}
              _pdfPreviewRenderTask = null;
            }
            _pdfPreviewRenderTask = page.render({ canvasContext: ctx, viewport: vp });
            await _pdfPreviewRenderTask.promise;
            _pdfPreviewRenderTask = null;
            prevCanvas.classList.remove('d-none');
            // Build a simple text layer with selectable spans
            // Quitar reconocimiento de texto en previsualización: ocultar capa de texto
            if (prevTextLayer){ 
              prevTextLayer.innerHTML = ''; 
              prevTextLayer.classList.add('d-none'); 
            }
            window.manifestApplyZoom(); // apply current zoom transforms
          }
          if (prevImg) prevImg.classList.add('d-none');
          if (placeholder) placeholder.classList.add('d-none');
        } catch(e){ console.warn('No se pudo renderizar vista previa PDF:', e); }
      }
      async function ensureTesseract(){
        if (window.Tesseract) return;
        await new Promise((resolve, reject)=>{
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
          s.crossOrigin = 'anonymous'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
      }
      // Detección robusta de orientación (0/90/180/270) por matrices de texto, con fallback OCR a 180° si no hay texto
      async function _detectPageDominantRotation(page){
        try {
          const tc = await page.getTextContent();
          const items = (tc && tc.items) || [];
          // 1) Si hay texto, estimar orientación dominante con atan2(b,a) -> ángulo ~ {0,90,180,270}
          let angleCounts = new Map([[0,0],[90,0],[180,0],[270,0]]);
          let considered = 0;
          for (const it of items){
            const tr = (it && it.transform) || [];
            const a = tr[0], b = tr[1];
            if (typeof a === 'number' && typeof b === 'number'){
              let ang = Math.atan2(b, a) * 180 / Math.PI;
              ang = ((ang % 360) + 360) % 360; // normaliza a [0,360)
              const snapped = (Math.round(ang / 90) * 90) % 360;
              if (angleCounts.has(snapped)) angleCounts.set(snapped, angleCounts.get(snapped)+1);
              considered++;
            }
          }
          if (considered >= 3){
            let best = 0, bestC = -1, total = 0;
            for (const [k,v] of angleCounts){ if (v > bestC){ best=k; bestC=v; } total += v; }
            // Confianza básica: al menos 55% de los ítems en el modo dominante o >=6 ítems en común
            if (bestC >= Math.max(6, Math.ceil(total * 0.55))) return best;
            // Si hay claro empate entre 0/180, escoger 0 por seguridad visual
            if ((angleCounts.get(0)||0) === (angleCounts.get(180)||0) && (angleCounts.get(0)||0) >= 3) return 0;
            return best; // devolver el modo aunque sea débil
          }
          // 2) Fallback (poca o nula capa de texto): prueba OCR en miniatura para 0° vs 180° y escoge la mejor
          try {
            // Renderizar miniaturas 0° y 180°
            const baseVp = page.getViewport({ scale: 1 });
            const targetW = 900; const scale = Math.min(1.5, Math.max(0.3, targetW / Math.max(1, baseVp.width)));
            const tryRot = async (extra)=>{
              const vp = page.getViewport({ scale, rotation: ((page.rotate||0) + extra) % 360 });
              const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; const ctx = c.getContext('2d');
              await page.render({ canvasContext: ctx, viewport: vp }).promise;
              const url = c.toDataURL('image/png');
              try { await ensureTesseractLite(); } catch(_){ }
              let out;
              if (window._mfOcrScheduler){ out = await window._mfOcrScheduler.addJob('recognize', url); }
              else { out = await Tesseract.recognize(url, 'spa+eng', { logger: ()=>{} }); }
              const txt = (out && out.data && out.data.text) ? out.data.text : '';
              const score = (txt.match(/[A-ZÁÉÍÓÚÑ0-9]{2,}/gi)||[]).reduce((s,t)=> s + t.length, 0);
              return score;
            };
            const s0 = await tryRot(0);
            const s180 = await tryRot(180);
            // Si 180° es claramente mejor, elegir 180
            if (s180 > Math.max(10, Math.floor(s0 * 1.2))) return 180;
            return 0;
          } catch(_){ return 0; }
        } catch(_){ return 0; }
      }
      async function ocrPdfWithTesseract(file, maxPages = 2){
        if (!window.Tesseract) throw new Error('Tesseract no disponible');
        pdfStatus.textContent = 'Renderizando páginas para OCR...';
        const ab = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(new Uint8Array(ab)).promise;
        const pages = Math.min(maxPages, pdf.numPages);
        const jobs = [];
        let completed = 0;
        for (let p=1; p<=pages; p++){
          const page = await pdf.getPage(p);
          // Asegurar vista en pie para mejorar OCR: neutralizar solo 180°
          const getUprightViewport = (pg, scale)=>{
            try { const eff = (((pg.rotate||0)%360)+360)%360; return eff===180? pg.getViewport({ scale, rotation: 180 }) : pg.getViewport({ scale }); } catch(_){ return pg.getViewport({ scale }); }
          };
          const viewport = getUprightViewport(page, 2);
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/png');
          let prom;
          if (window._mfOcrScheduler){
            prom = window._mfOcrScheduler.addJob('recognize', dataUrl);
          } else {
            prom = Tesseract.recognize(dataUrl, 'spa+eng', { ...(_tessOpts||{}), logger: ()=>{} });
          }
          prom = Promise.resolve(prom).then((res)=>{ completed++; try { setProgress(60 + Math.round(((completed)/pages)*30), `OCR página ${completed}/${pages}...`); } catch(_){} return res; });
          jobs.push(prom);
        }
        const results = await Promise.all(jobs);
        const texts = results.map(r=> (r && r.data && r.data.text) ? r.data.text : '').join('\n');
        return texts.trim();
      }
      // Load master catalogs for validation
  let masterAirlines = [], masterAirports = [], masterAircraft = [];
  // Índice rápido: matrícula normalizada -> canónica (del catálogo)
  let masterRegIndex = new Map();
      // Normaliza matrícula (mayúsculas, sin guiones ni espacios, sólo A-Z0-9)
      function normalizeReg(s){ return (s||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,''); }
      // Variantes tolerantes a confusiones comunes de OCR
      function regVariants(s){
        const base = normalizeReg(s);
        const out = new Set([base]);
        const pairs = [['O','0'],['I','1'],['S','5'],['B','8'],['Z','2']];
        for (const [A,B] of pairs){
          if (base.includes(A)) out.add(base.replace(new RegExp(A,'g'), B));
          if (base.includes(B)) out.add(base.replace(new RegExp(B,'g'), A));
        }
        return Array.from(out);
      }
      // Variantes de visualización (añade forma con guion según prefijo)
      function regDisplayVariants(reg){
        const R = (reg||'').toUpperCase();
        const res = new Set([R]);
        const addHyphen = (prefix)=>{ if (R.startsWith(prefix) && R.length > prefix.length){ res.add(prefix + '-' + R.slice(prefix.length)); } };
        ['XA','XB','XC','HP','LV','CC','PR','CP','OB','TG','YV','EI','EC','LX','9H','4K','A7','TC','SU','OE','OY','SE','LN','TF','SX','YL','UR','YU','ZS','VT','VH','JA','HL','PK','PR','PT','HK','HS','RP','RP-C'].forEach(addHyphen);
        // Generic fallback: also consider a hyphen after first two characters for display purposes
        if (R.length > 4) res.add(R.slice(0,2) + '-' + R.slice(2));
        return Array.from(res);
      }
      function resolveCatalogRegClassic(cand){
        if (!cand) return '';
        const variants = regVariants(cand);
        for (const v of variants){
          const hit = masterAircraft.find(ac => normalizeReg(ac.Registration) === v);
          if (hit) return hit.Registration; // canónica
        }
        return '';
      }
      // Normaliza matrícula (mayúsculas, sin guiones ni espacios, sólo A-Z0-9)
      function normalizeReg(s){ return (s||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,''); }
      // Genera variantes tolerantes a confusiones de OCR (aplica cada par globalmente)
      function regVariants(s){
        const base = normalizeReg(s);
        const out = new Set([base]);
        const pairs = [['O','0'],['I','1'],['S','5'],['B','8'],['Z','2']];
        for (const [A,B] of pairs){
          if (base.includes(A)) out.add(base.replace(new RegExp(A,'g'), B));
          if (base.includes(B)) out.add(base.replace(new RegExp(B,'g'), A));
        }
        return Array.from(out);
      }
      // Busca en catálogo de aeronaves (masterAircraft) una matrícula canónica que coincida con el candidato (normalizado/variantes)
      function resolveCatalogRegClassic(cand){
        if (!cand) return '';
        const variants = regVariants(cand);
        for (const v of variants){
          const hit = masterAircraft.find(ac => normalizeReg(ac.Registration) === v);
          if (hit) return hit.Registration; // devolver canónica (como viene en CSV)
        }
        return '';
      }
  async function loadMasterCatalogs() {
        const csvToArr = (csv) => {
          const [header, ...lines] = csv.split(/\r?\n/).filter(Boolean);
          const keys = header.split(',');
          return lines.map(line => {
            const vals = line.split(',');
            const obj = {};
            keys.forEach((k,i)=>obj[k.trim()]=vals[i]?vals[i].trim():"");
            return obj;
          });
        };
        try {
          const a = await fetch('data/master/airlines.csv', { cache: 'no-store' });
          masterAirlines = csvToArr(await a.text());
        } catch(e){ masterAirlines = []; }
        try {
          const ap = await fetch('data/master/airports.csv', { cache: 'no-store' });
          masterAirports = csvToArr(await ap.text());
        } catch(e){ masterAirports = []; }
        try {
          const ac = await fetch('data/master/aircraft.csv', { cache: 'no-store' });
          masterAircraft = csvToArr(await ac.text());
          // Construir índice normalizado -> canónica
          masterRegIndex.clear();
          for (const row of masterAircraft){
            const canon = (row && row.Registration || '').toUpperCase().trim();
            if (!canon) continue;
            const key = normalizeReg(canon);
            if (key) masterRegIndex.set(key, canon);
          }
        } catch(e){ masterAircraft = []; masterRegIndex.clear(); }
        if ((!masterAirlines.length || !masterAirports.length || !masterAircraft.length) && pdfStatus){
          pdfStatus.classList.add('text-warning');
          pdfStatus.textContent = (pdfStatus.textContent? pdfStatus.textContent + ' ' : '') + 'No se pudieron cargar todos los catálogos. Se continuará con validaciones básicas.';
        }
      }
      loadMasterCatalogs();

      // Utilidades para selección de variante mostrada
      function includesIgnoreCase(haystack, needle){
        try { return (haystack||'').toUpperCase().includes((needle||'').toUpperCase()); } catch(_){ return false; }
      }
      function pickPreferredVariant(canonical, text, optionsUpper){
        const variants = regDisplayVariants(canonical);
        // Preferir una variante que aparezca en el texto y exista en las opciones (si hay opciones)
        for (const v of variants){
          if (includesIgnoreCase(text, v) && (!optionsUpper || optionsUpper.length===0 || optionsUpper.includes(v.toUpperCase()))) return v;
        }
        return canonical;
      }
      function findCatalogRegInTextExhaustive(text){
        // Búsqueda exhaustiva: quitar separadores del texto y buscar cualquier matrícula normalizada del catálogo como subcadena
        try {
          const U = (text||'').toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (!U || !masterRegIndex || masterRegIndex.size===0) return '';
          for (const [norm, canon] of masterRegIndex.entries()){
            if (norm && U.includes(norm)) return canon;
          }
        } catch(_){ }
        return '';
      }

      function findValidAirline(val) {
        val = (val||"").toUpperCase();
        return masterAirlines.find(a => a.IATA === val || a.ICAO === val || a.Name.toUpperCase() === val);
      }
      function findValidAirport(val) {
        val = (val||"").toUpperCase();
        return masterAirports.find(a => a.IATA === val || a.ICAO === val || a.Name.toUpperCase() === val || a.City?.toUpperCase() === val);
      }
      function findValidAircraft(val) {
        val = (val||"").toUpperCase();
        return masterAircraft.find(ac => ac.Registration === val);
      }

      let pdfFile = null; // puede ser PDF o imagen
      // Helpers para bloquear dirección (Llegada/Salida) por archivo seleccionado
      function _lockDirectionChoice(isArrival){
        try {
          if (dirArr && dirDep){
            dirArr.checked = !!isArrival; dirDep.checked = !isArrival;
            if (isArrival){ dirDep.disabled = true; dirArr.disabled = false; }
            else { dirArr.disabled = true; dirDep.disabled = false; }
            window._mfDirectionLocked = true;
            try {
              const sel = isArrival ? dirArr : dirDep;
              sel && sel.dispatchEvent(new Event('change', { bubbles:true }));
            } catch(_){ }
            try { applyManifestDirection(); } catch(_){ }
          }
          // Lock/unlock Title based on direction and set fixed value for arrivals
          try {
            const title = document.getElementById('mf-title');
            if (title){
              if (isArrival){
                title.value = 'MANIFIESTOS DE LLEGADA';
                title.readOnly = true;
                title.dataset.locked = '1';
              } else {
                // For departures, do not force value unless desired; remove lock
                title.readOnly = false;
                title.dataset.locked = '';
              }
            }
          } catch(_){ }
        } catch(_){ }
      }
      function _unlockDirectionChoice(){
        try { 
          if (dirArr) dirArr.disabled = false; 
          if (dirDep) dirDep.disabled = false; 
          window._mfDirectionLocked = false; 
        } catch(_){ }
      }
      // Pretty direction chooser using a Bootstrap modal (fallback to confirm)
      async function showDirectionPrompt(){
        try {
          const modalEl = document.getElementById('mfDirectionModal');
          const btnArr = document.getElementById('mfDirChooseArr');
          const btnDep = document.getElementById('mfDirChooseDep');
          if (modalEl && (window.bootstrap && window.bootstrap.Modal) && btnArr && btnDep){
            return await new Promise(resolve => {
              let resolved = false;
              const modal = new window.bootstrap.Modal(modalEl, { backdrop:'static', keyboard:false });
              const off = ()=>{ try { btnArr.removeEventListener('click', onArr); btnDep.removeEventListener('click', onDep); } catch(_){ } };
              const onArr = ()=>{ if (!resolved){ resolved = true; off(); modal.hide(); resolve(true); } };
              const onDep = ()=>{ if (!resolved){ resolved = true; off(); modal.hide(); resolve(false); } };
              btnArr.addEventListener('click', onArr, { once:true });
              btnDep.addEventListener('click', onDep, { once:true });
              modal.show();
            });
          }
        } catch(_){ }
        const resp = window.confirm('¿El documento a escanear es de LLEGADA?\nAceptar = Llegada, Cancelar = Salida');
        return !!resp;
      }

      if (up && !up._wiredChange) { up._wiredChange = 1; up.addEventListener('change', async function(e) {
        const f = up.files && up.files[0];
        if (!f) { pdfFile = null; pdfStatus.textContent = 'No se seleccionó archivo.'; return; }
        const isPdfMime = (f.type||'').toLowerCase() === 'application/pdf';
        const isPdfName = /\.pdf$/i.test(f.name||'');
        const isImage = /^image\//i.test(f.type||'') || /\.(png|jpg|jpeg|webp)$/i.test(f.name||'');
        pdfFile = (isPdfMime || isPdfName || isImage) ? f : null;
        pdfStatus.textContent = pdfFile ? `Archivo listo: ${f.name}` : 'Seleccione un PDF o imagen válido.';
        // Elegir y bloquear dirección al seleccionar archivo (siempre preguntar por cada archivo)
        try {
          if (pdfFile){
            window._mfDirectionLocked = false;
            const isArrival = await showDirectionPrompt();
            _lockDirectionChoice(!!isArrival);
          }
        } catch(_){ }
        // Render previsualización
        try {
          if (pdfFile && (isPdfMime || isPdfName)){
            renderPdfPreviewFirstPage(pdfFile);
          } else if (pdfFile && isImage){
            const url = URL.createObjectURL(pdfFile);
            if (prevImg){ prevImg.src = url; prevImg.classList.remove('d-none'); }
            if (prevCanvas){ prevCanvas.classList.add('d-none'); }
            // Para imágenes: no ejecutar OCR ni mostrar texto reconocido en la capa
            if (prevTextLayer){ prevTextLayer.textContent=''; prevTextLayer.classList.add('d-none'); }
            if (placeholder) placeholder.classList.add('d-none');
            try { window.manifestApplyZoom(); } catch(_){ }
          }
        } catch(_){ }
  }); }

  const progressBarContainer = document.getElementById('manifest-progress-bar-container');
  const progressBar = document.getElementById('manifest-progress-bar');
      let _pbCurrent = 0, _pbTarget = 0; // hard target from setProgress
      let _pbEffTarget = 0;             // effective target that can creep forward
      let _pbRAF = null, _pbLastTs = 0, _pbLabel = '';
      let _pbLastUpdate = 0;            // last time setProgress was called
      function _animProgress(ts){
        if (_pbRAF === null) return;
        if (!_pbLastTs) _pbLastTs = ts;
        const dt = Math.max(0, (ts - _pbLastTs) / 1000);
        _pbLastTs = ts;
        // Allow effective target to creep forward after mid-point to avoid perceived stall
        const creepRate = 6; // % per second advancing the target slowly
        const creepEnabled = _pbTarget >= 50 && _pbTarget < 100;
        if (creepEnabled){
          // Do not surpass the hard target to avoid long waits at ~99%
          const cap = Math.max(0, _pbTarget - 0.8); // keep a small margin below hard target
          _pbEffTarget = Math.min(cap, Math.max(_pbEffTarget, _pbTarget*0.9) + creepRate * dt);
        } else {
          _pbEffTarget = Math.max(_pbEffTarget, _pbTarget);
        }
        // Cap visual speed: slower before 95%, a bit faster near completion
        const maxSpeed = (_pbEffTarget >= 95 ? 35 : 22); // percent per second
        if (_pbCurrent < _pbEffTarget){
          _pbCurrent = Math.min(_pbEffTarget, _pbCurrent + maxSpeed * dt);
        }
        // Update legacy (hidden) and new plane bar with the smooth value
        if (progressBar){
          progressBar.style.width = _pbCurrent + '%';
          progressBar.setAttribute('aria-valuenow', String(Math.round(_pbCurrent)));
          const txt = _pbLabel || progressBar.getAttribute('data-text') || '';
          progressBar.textContent = (Math.round(_pbCurrent) + '%') + (txt ? (' - ' + txt) : '');
        }
        try { planeProgressSet(_pbCurrent, _pbLabel); } catch(_){ }
        if (_pbCurrent >= 100 && _pbTarget >= 100){
          cancelAnimationFrame(_pbRAF); _pbRAF = null; _pbLastTs = 0;
          return;
        }
        _pbRAF = requestAnimationFrame(_animProgress);
      }
      function setProgress(percent, text){
        const p = Math.max(0, Math.min(100, Number(percent)||0));
        if (progressBarContainer) progressBarContainer.style.display = 'none'; // hide legacy bar
        if (typeof text === 'string'){
          _pbLabel = text;
          if (progressBar) progressBar.setAttribute('data-text', text);
        }
        _pbTarget = Math.max(_pbTarget, p); // monotónico ascendente
        _pbEffTarget = Math.max(_pbEffTarget, _pbTarget);
        if (p >= 100){ _pbEffTarget = 100; }
        _pbLastUpdate = performance.now();
        if (_pbRAF === null){ _pbRAF = requestAnimationFrame(_animProgress); }
      }
      // When processing completes, force a short, deterministic finish (<= 600ms)
      function syncProgressFinish(){
        try {
          const now = performance.now();
          const age = now - _pbLastUpdate;
          // if no updates in the last ~300ms but the pipeline says done, ramp to 100 quickly
          if (age > 300){ _pbTarget = 100; _pbEffTarget = 100; }
        } catch(_){ }
      }
  // expose a simple hook used by extractPdfText to report page progress
  window._manifestProgressHook = (p,t)=>{ try { setProgress(p,t); } catch(_){ } };
      function hideProgress(){
        if (_pbRAF){ cancelAnimationFrame(_pbRAF); _pbRAF = null; }
        _pbCurrent = 0; _pbTarget = 0; _pbEffTarget = 0; _pbLastTs = 0; _pbLabel = '';
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        try { planeProgressHide(); } catch(_){ }
        if (progressBar){ progressBar.style.width = '0%'; progressBar.removeAttribute('data-text'); progressBar.textContent = ''; }
      }

      const scanPdfBtn = document.getElementById('manifest-scan-pdf');
      if (scanPdfBtn && !scanPdfBtn._wired) {
        scanPdfBtn._wired = 1;
        scanPdfBtn.addEventListener('click', async function() {
        if (!pdfFile) {
          pdfStatus.textContent = 'Seleccione un PDF antes de escanear.';
          hideProgress();
          return;
        }
        const isPdf = /\.pdf$/i.test(pdfFile.name||'') || ((pdfFile.type||'').toLowerCase()==='application/pdf');
        if (!isPdf) { pdfStatus.textContent = 'El archivo no es PDF. Use "Escaneo alternativo (OCR)".'; hideProgress(); return; }
  setProgress(5, 'Preparando...');
  setProgress(12, 'OCR en PDF...');
        pdfStatus.textContent = '';
        // Espera a que los catálogos estén cargados
        if (!masterAirlines.length || !masterAirports.length || !masterAircraft.length) {
          setProgress(20, 'Cargando catálogos...');
          pdfStatus.textContent = 'Cargando catálogos, espere...';
          await loadMasterCatalogs();
        }
        try {
          // Priorizar OCR (mejor desempeño reportado); si falla, retroceder a texto de PDF
          let text = '';
          try {
            await ensurePdfJsFromCDN();
            await ensureTesseract();
            text = await ocrPdfWithTesseract(pdfFile, 2);
            if (!text || text.replace(/\s+/g,'').length < 30){
              setProgress(48, 'OCR limitado; extrayendo texto PDF...');
              try { text = await extractPdfText(pdfFile); } catch(_) { /* keep empty */ }
            }
          } catch(_) {
            // Si OCR falla completamente, intentar extraer texto del PDF como último recurso
            setProgress(45, 'Cargando motor PDF...');
            try { text = await extractPdfText(pdfFile); } catch(_) { text = ''; }
          }
          if (ocrDebug) ocrDebug.value = text || '';
          setProgress(65, 'Procesando campos...');
          // No auto-fill de Título: el campo se bloquea para LLEGADA con valor fijo
          // Vuelo (robusto: soporta IATA/ICAO + número, con guión/espacio y sufijo opcional)
          (function(){
            try {
              const codeRx = /([A-Z]{2,3})\s?-?\s?(\d{2,5})([A-Z]?)/i;
              let vuelo = findNearLabelValue(['VUELO','N° VUELO','NO. VUELO','FLIGHT','FLT','VUELO NO','VUELO N°'], codeRx, text) || '';
              // Fallback 1: búsqueda global con validación de prefijo en catálogos
              if (!vuelo){
                const mAll = (text||'').match(new RegExp(codeRx.source,'ig')) || [];
                const pick = (arr)=>{
                  for (const s of arr){
                    const m = s.match(codeRx); if (!m) continue;
                    const pref = (m[1]||'').toUpperCase();
                    // Validar prefijo contra catálogos cuando sea posible
                    if ((typeof icaoSet!=='undefined' && icaoSet && icaoSet.has(pref)) || (typeof iataToIcao!=='undefined' && iataToIcao && iataToIcao.has(pref))) return s;
                  }
                  return arr[0]||'';
                };
                vuelo = pick(mAll);
              }
              // Fallback 2: etiqueta + sólo dígitos; reconstruir con aerolínea detectada
              if (!vuelo){
                const numOnly = findNearLabelValue(['VUELO','FLIGHT','FLT'], /\b\d{2,5}[A-Z]?\b/, text) || '';
                if (numOnly){
                  // Intentar inferir aerolínea por texto
                  let carrierICAO = (resolveCarrierICAO1?.(text)||{}).code || '';
                  if (carrierICAO){
                    // Mapear a IATA si existe
                    let iata = '';
                    try {
                      for (const a of (airlinesCatalog||[])){ if (a.ICAO===carrierICAO && a.IATA){ iata = a.IATA; break; } }
                    } catch(_){ }
                    if (iata){ vuelo = `${iata}${numOnly}`; }
                    else { vuelo = `${carrierICAO}${numOnly}`; }
                  } else { vuelo = numOnly; }
                }
              }
              if (vuelo){
                const clean = vuelo.replace(/\s|-/g,'').toUpperCase();
                setVal('mf-flight', clean);
                // Ajustar transportista si posible
                const pref3 = clean.slice(0,3), pref2 = clean.slice(0,2);
                let icao='';
                if (pref3 && typeof icaoSet!=='undefined' && icaoSet.has(pref3)) icao = pref3;
                else if (pref2 && typeof iataToIcao!=='undefined' && iataToIcao.has(pref2)) icao = iataToIcao.get(pref2)||'';
                if (icao){
                  setVal('mf-carrier-3l', icao);
                  try { const rec = (airlinesCatalog||[]).find(a=>a.ICAO===icao); if (rec){ if (!document.getElementById('mf-operator-name').value) setVal('mf-operator-name', rec.Name); if (!document.getElementById('mf-airline').value) setVal('mf-airline', rec.Name); } } catch(_){ }
                }
              }
            } catch(_){ }
          })();
          // Fecha (DD/MM/YY o DD/MM/YYYY, soporta -, . y espacios)
          let fecha = findNearLabelValue(['FECHA','FECHA DEL DOCUMENTO','FECHA DOC','FECHA DOCUMENTO'], /\b\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*(\d{2}|\d{4})\b/, text);
          let iso = dmyToISO(fecha);
          if (!iso){
            // Fallback: primera fecha válida en todo el texto
            const m = (text||'').match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})\b/);
            if (m) iso = dmyToISO(m[0]);
          }
          if (iso) { const el = document.getElementById('mf-doc-date'); if (el) el.value = iso; }
          // Origen (incluye sinónimo "Procedencia")
          let origen = findNearLabelIATACode(['ORIGEN','PROCEDENCIA'], text);
          let origenMatch = findValidAirport(origen);
          setVal('mf-origin-code', origenMatch ? origenMatch.IATA : '');
          // Destino
          let destino = findNearLabelIATACode(['DESTINO'], text);
          let destinoMatch = findValidAirport(destino);
          setVal('mf-final-dest-code', destinoMatch ? destinoMatch.IATA : '');
          // Tipo de vuelo (A–Z): letra cerca de la etiqueta "TIPO DE VUELO" / "FLIGHT TYPE"
          try {
            let code = '';
            if (text){
              const linesFT = text.split(/\r?\n/);
              const labRx = /(TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)/i;
              for (let i=0;i<linesFT.length && !code;i++){
                const ln = linesFT[i]||''; const m = ln.match(labRx); if (!m) continue;
                const after = ln.slice((m.index||0) + (m[0]?.length||0));
                let mm = after.match(/\b([A-Z])\b/);
                if (!mm && linesFT[i+1]) mm = (linesFT[i+1]||'').match(/^\s*([A-Z])\b/);
                if (mm && mm[1]) code = (mm[1]||'').toUpperCase();
              }
              if (!code){
                const one = text.replace(/\s+/g,' ');
                const mg = one.match(/(?:TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)\s*[:\-]?\s*([A-Z])\b/i);
                if (mg && mg[1]) code = (mg[1]||'').toUpperCase();
              }
            }
            if (code){ const el = document.getElementById('mf-flight-type'); if (el){ el.value = code; try { el.dispatchEvent(new Event('input',{ bubbles:true })); } catch(_){ } } }
          } catch(_){ }
          // Pasajeros
          let pax = findNearLabelValue(['PASAJEROS','PAX'], /\d{1,4}/, text);
          setVal('pax-total', pax || '');
          // Tripulación total (número)
          try {
            const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
            if (crew) setVal('mf-crew-total', crew);
          } catch(_){}
          // Piloto al mando (robusto): use a stronger extractor, log text and candidates, and force-write when necessary
          try {
            // Dump the raw text to the debug panel for manual inspection when enabled
            try { window._mfDebugDump?.(text); } catch(_){ }
            const current = (document.getElementById('mf-pilot')?.value||'').trim();
            if (!current){
              // Try the new robust extractor first
              const robust = (window._mfExtractPilotRobust?.(text) || '').trim();
              if (robust){ try { forceSetVal('mf-pilot', robust); } catch(_){ setVal('mf-pilot', robust); } }
              // If not set yet, fall back to existing extractors (preserve previous behavior)
              if (!document.getElementById('mf-pilot')?.value){
                const direct = (window._mfExtractPilotDirectBlock?.(text) || '').trim();
                if (direct) try { forceSetVal('mf-pilot', direct); } catch(_){ setVal('mf-pilot', direct); }
              }
              if (!document.getElementById('mf-pilot')?.value){
                const pilot = (window._mfExtractPilotUpperNearLabel?.(text) || '').trim();
                if (pilot) try { forceSetVal('mf-pilot', pilot); } catch(_){ setVal('mf-pilot', pilot); }
              }
              // PDF-layer async fallback: attempt but don't block
              try {
                const f = pdfFile; const isPdf = f && (/\.pdf$/i.test(f.name||'') || /application\/pdf/i.test(f.type||''));
                if (!document.getElementById('mf-pilot')?.value && isPdf && typeof window._mfExtractPilotUpperFromPdf==='function'){
                  window._mfExtractPilotUpperFromPdf(f, 2).then(name=>{
                    if (name && !document.getElementById('mf-pilot')?.value) try { forceSetVal('mf-pilot', name); } catch(_){ setVal('mf-pilot', name); }
                  }).catch(()=>{});
                }
              } catch(_){ }
            }
          } catch(_){ }
          // No. de licencia: extractor exhaustivo (soporta "No. LIC." y variantes, mismo renglón o siguientes)
          try {
            const found = (window._mfExtractPilotLicenseExhaustive?.(text) || '').toUpperCase();
            if (found) setVal('mf-pilot-license', found);
          } catch(_){ }
          // Equipo (tipo aeronave) por extracción directa de texto cerca de etiqueta
          try {
            const typeICAO = extractAircraftTypeICAOFromText(text);
            if (typeICAO && typeIcaoSet && typeIcaoSet.has(typeICAO)) setVal('mf-aircraft', typeICAO);
          } catch(_){}
          // Aeronave (matrícula)
          const regLabels = ['MATRICULA','MATRÍCULA','REGISTRO','REGISTRATION'];
          let reg = findNearLabelValue(regLabels, /\b[A-Z0-9-]{3,10}\b/, text) || '';
          if (isLabelWord(reg, regLabels)) reg = '';
          const dlReg = document.getElementById('aircraft-reg-list');
          const opts = dlReg ? Array.from(dlReg.querySelectorAll('option')).map(o=> (o.getAttribute('value')||'').toUpperCase()) : [];
          let up = (reg||'').toUpperCase();
          let canon = resolveCatalogRegClassic(up);
          // Si el texto cercado solo devolvió la palabra EQUIPO o no hay match en catálogo, intentar búsqueda global por patrones de matrícula
          if ((!canon || up === 'EQUIPO') && text){
            const tailPatterns = [
                /\bX[A-C]-?[A-Z0-9]{3,6}\b/gi, /\bN\d{1,5}[A-Z]{0,3}\b/gi, /\bH[KP]-?[0-9A-Z]{3,8}\b/gi, /\bLV-?[A-Z0-9]{3,5}\b/gi,
                /\bCC-?[A-Z0-9]{3,5}\b/gi, /\bPR-?[A-Z0-9]{3,5}\b/gi, /\bCP-?[0-9A-Z]{3,6}\b/gi, /\bYV-?[0-9A-Z]{3,6}\b/gi,
                /\bOB-?[0-9A-Z]{3,6}\b/gi, /\bTG-?[0-9A-Z]{3,6}\b/gi, /\bTC-?[A-Z0-9]{3,6}\b/gi, /\bEI-?[A-Z]{3,5}\b/gi,
                /\bEC-?[A-Z]{3,5}\b/gi, /\bLX-?[A-Z0-9]{3,5}\b/gi, /\b9H-?[A-Z0-9]{3,6}\b/gi, /\b4K-?[A-Z0-9]{3,6}\b/gi,
                /\bA7-?[A-Z0-9]{3,6}\b/gi, /\bXA[A-Z0-9]{0,}\b/gi
              ];
            let mReg = '';
            for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ mReg = m[0].toUpperCase().replace(/\s+/g,''); break; } }
            if (mReg){ up = mReg; canon = resolveCatalogRegClassic(mReg); }
            // Fallback exhaustivo por catálogo (normalizado)
            if (!canon){ const ex = findCatalogRegInTextExhaustive(text); if (ex){ canon = ex; up = ex; } }
          }
          if (canon){
            const preferred = pickPreferredVariant(canon, text, opts);
            if (!isLabelWord(preferred, regLabels)) {
              // Validar contra catálogo normalizado
              const key = normalizeReg(preferred);
              if (!masterRegIndex.size || masterRegIndex.has(key)) {
                setVal('mf-tail', preferred);
              }
            }
            const el = document.getElementById('mf-tail'); if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (up && opts.includes(up)) {
            if (!isLabelWord(up, regLabels)) {
              const key = normalizeReg(up);
              if (!masterRegIndex.size || masterRegIndex.has(key)) {
                setVal('mf-tail', up);
              }
            }
            const el = document.getElementById('mf-tail'); if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setVal('mf-tail', '');
          }
          // Equipo: no se fija aquí; se resolverá al cambiar Matrícula (handler de tail)
          // Post-procesado de horas (Salida): N/A donde aplica
          try {
            const isArr = !!(dirArr && dirArr.checked);
            if (!isArr){
              // No colocar 'N/A' en inputs de tipo tiempo; dejarlos vacíos
              ['mf-slot-coordinated','mf-termino-pernocta'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; el.setCustomValidity(''); } });
            }
          } catch(_){ }
          setProgress(95, 'Casi listo...');
          setProgress(100, 'Escaneo completado'); syncProgressFinish();
          pdfStatus.textContent = 'Escaneo completado. Campos rellenados y validados.';
          setTimeout(hideProgress, 2000);
        } catch (err) {
          setProgress(100, 'Error al procesar PDF');
          pdfStatus.textContent = 'No se pudo procesar el PDF.';
          setTimeout(hideProgress, 2000);
        }
        });
      }

      // Escaneo alternativo: OCR puro (PDF o imagen)
      if (altScanBtn && !altScanBtn._wired) {
        altScanBtn._wired = 1;
        altScanBtn.addEventListener('click', async function(){
          try {
            if (!pdfFile) { pdfStatus.textContent = 'Seleccione un PDF o imagen antes de escanear.'; return; }
            await ensureTesseract();
            setProgress(10, 'Preparando OCR alternativo...'); pdfStatus.textContent = '';
            let text = '';
            const maxPages = parseInt((ocrPagesSel && ocrPagesSel.value) || '2', 10) || 2;
            const isPdf = /\.pdf$/i.test(pdfFile.name||'') || ((pdfFile.type||'').toLowerCase()==='application/pdf');
            if (isPdf) {
              await ensurePdfJsFromCDN();
              text = await ocrPdfWithTesseract(pdfFile, maxPages);
            } else {
              // Imagen directa
              setProgress(40, 'OCR en imagen...');
              const dataUrl = await fileToDataURL(pdfFile);
              // Preprocesado ligero: escalar a mayor DPI para mejorar OCR en texto en negritas
              let ocrSrc = dataUrl;
              try {
                const img = await new Promise((resolve, reject)=>{ const im = new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src = dataUrl; });
                const maxDim = Math.max(img.width||0, img.height||0) || 0;
                const targetMax = 1600; // escalar hasta ~1600px en su lado mayor para claridad
                const scale = maxDim ? Math.min(2, Math.max(1, targetMax / maxDim)) : 1;
                if (scale > 1){
                  const c = document.createElement('canvas');
                  c.width = Math.round((img.width||0) * scale);
                  c.height = Math.round((img.height||0) * scale);
                  const ctx = c.getContext('2d', { willReadFrequently: false });
                  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                  ctx.drawImage(img, 0, 0, c.width, c.height);
                  ocrSrc = c.toDataURL('image/png');
                }
              } catch(_) { /* si falla el preprocesado, seguimos con el dataUrl original */ }
              const { data } = await Tesseract.recognize(ocrSrc, 'spa+eng', { ...(_tessOpts||{}), logger: ()=>{} });
              text = (data && data.text) ? data.text : '';
            }
            if (ocrDebug) ocrDebug.value = text || '';
            const hasWord = hasWordFactory(text);
            const upperTokens = tokenizeUpper(text);
            const isArrivalDoc = hasWord('LLEGADA') || hasWord('ARRIVAL');
            const isDepartureDoc = hasWord('SALIDA') || hasWord('DEPARTURE');
            if (isArrivalDoc && dirArr) {
              dirArr.checked = true;
              if (dirDep) dirDep.checked = false;
              try { dirArr.dispatchEvent(new Event('change', { bubbles: true })); } catch(_){}
            } else if (isDepartureDoc && dirDep) {
              dirDep.checked = true;
              if (dirArr) dirArr.checked = false;
              try { dirDep.dispatchEvent(new Event('change', { bubbles: true })); } catch(_){}
            }
            const currentIsArrival = dirArr && dirArr.checked;
            setProgress(70, 'Procesando campos...');
            // Reutilizar el mismo pipeline de parseo
            // No auto-fill de Título
            // Vuelo (robusto)
            (function(){
              try {
                const codeRx = /\b([A-Z]{2,3})\s*-?\s*(\d{2,5})([A-Z])?\b/;
                const labels = ['VUELO','N° VUELO','NO. VUELO','FLIGHT','FLT','VUELO NO','VUELO N°'];
                let vuelo = findNearLabelValue(labels, codeRx, text) || '';
                if (!vuelo){
                  const mAll = (text||'').match(new RegExp(codeRx.source,'ig')) || [];
                  const pick = (arr)=>{
                    for (const s of arr){ const m = s.match(codeRx); if (!m) continue; const pref=(m[1]||'').toUpperCase(); if (icaoSet.has(pref) || iataToIcao.has(pref)) return s; }
                    return arr[0]||'';
                  };
                  vuelo = pick(mAll);
                }
                if (!vuelo){
                  const numOnly = findNearLabelValue(['VUELO','FLIGHT','FLT'], /\b\d{2,5}[A-Z]?\b/, text) || '';
                  if (numOnly){
                    let icao = (resolveCarrierICAO1?.(text)||{}).code || '';
                    if (icao){
                      let iata=''; try { for (const a of (airlinesCatalog||[])){ if (a.ICAO===icao && a.IATA){ iata=a.IATA; break; } } } catch(_){ }
                      vuelo = (iata ? iata : icao) + numOnly;
                    } else { vuelo = numOnly; }
                  }
                }
                if (vuelo){
                  const cleaned = vuelo.replace(/\s|-/g,'').toUpperCase();
                  setVal('mf-flight', cleaned);
                  const pref3 = cleaned.slice(0,3), pref2 = cleaned.slice(0,2);
                  let carrierICAO = '';
                  if (pref3 && icaoSet.has(pref3)) carrierICAO = pref3; else if (pref2 && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2)||'';
                  if (carrierICAO){
                    setVal('mf-carrier-3l', carrierICAO);
                    const rec = airlinesCatalog.find(a=>a.ICAO===carrierICAO);
                    if (rec){ if (!document.getElementById('mf-operator-name').value) setVal('mf-operator-name', rec.Name); if (!document.getElementById('mf-airline').value) setVal('mf-airline', rec.Name); }
                  }
                }
              } catch(_){ }
            })();
            let fecha = findNearLabelValue(['FECHA','FECHA DEL DOCUMENTO','FECHA DOC','FECHA DOCUMENTO'], /\b\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*(\d{2}|\d{4})\b/, text);
            let iso = dmyToISO(fecha);
            if (!iso){ const m = (text||'').match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})\b/); if (m) iso = dmyToISO(m[0]); }
            if (iso) { const el = document.getElementById('mf-doc-date'); if (el) el.value = iso; }
            const originCandLbl = findNearLabelIATACode(['ORIGEN','PROCEDENCIA','PROCEDENCIA DEL VUELO','FROM'], text);
            const lastStopCandLbl = findNearLabelIATACode(['ULTIMA ESCALA','ESCALA ANTERIOR','LAST STOP','ESCALA'], text);
            const finalDestCandLbl = findNearLabelIATACode(['DESTINO','DESTINO DEL VUELO','TO'], text);
            const arrivalMainCandLbl = currentIsArrival ? findNearLabelIATACode(['AEROPUERTO DE LLEGADA','AEROPUERTO DESTINO','AEROPUERTO DE ARRIBO','AEROPUERTO DESTINO DEL VUELO'], text) : '';
            const airportCodes = upperTokens.filter(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && iataSet.has(t));
            const rawLines = (text||'').split(/\r?\n/);
            let originCand = '';
            let lastStopCand = '';
            let finalDestCand = '';
            let forcedLastStopFromOrigin = false;
            for (const line of rawLines){
              const u = line.toUpperCase();
              if (/ORIGEN|PROCEDENCIA|FROM\b/.test(u)){
                const hit = Array.from(iataSet).find(c => u.includes(c));
                if (hit) originCand = hit;
              }
              if (/ULTIMA\s+ESCALA|LAST\s+STOP|ESCALA\b/.test(u)){
                const hit = Array.from(iataSet).find(c => u.includes(c));
                if (hit) lastStopCand = hit;
              }
              if (/DESTINO|TO\b/.test(u)){
                const hit = Array.from(iataSet).find(c => u.includes(c));
                if (hit) finalDestCand = hit;
              }
            }
            originCand = originCandLbl || originCand;
            lastStopCand = lastStopCandLbl || lastStopCand;
            finalDestCand = finalDestCandLbl || finalDestCand;
            if (!originCand && airportCodes[0]) originCand = airportCodes[0];
            if (!lastStopCand && airportCodes[1]) lastStopCand = airportCodes[1];
            if (!finalDestCand && airportCodes[2]) finalDestCand = airportCodes[2];
            const airportCounts = airportCodes.reduce((acc, code)=>{
              acc[code] = (acc[code] || 0) + 1;
              return acc;
            }, {});
            const uniqueAirports = Object.keys(airportCounts);
            const lastStopFromLabel = !!lastStopCandLbl;
            if (currentIsArrival && !lastStopFromLabel){
              const originCandidate = originCand || airportCodes[0] || '';
              const arrivalMainGuess = arrivalMainCandLbl || '';
              const isLikelyDirect = uniqueAirports.length <= 2;
              if (!lastStopCand && originCandidate){
                lastStopCand = originCandidate;
                forcedLastStopFromOrigin = true;
              } else if (originCandidate){
                const alignsWithArrivalAirport = arrivalMainGuess && lastStopCand && lastStopCand === arrivalMainGuess;
                const looksLikeDirect = isLikelyDirect && lastStopCand && lastStopCand !== originCandidate;
                if (alignsWithArrivalAirport || looksLikeDirect){
                  if (lastStopCand !== originCandidate){
                    lastStopCand = originCandidate;
                  }
                  forcedLastStopFromOrigin = true;
                }
              }
            }
            const resolveAirportCode = (value)=>{
              const raw = (value||'').toString().trim();
              if (!raw) return '';
              const found = findValidAirport(raw);
              if (found && found.IATA) return found.IATA;
              const upper = raw.toUpperCase();
              if (/^[A-Z]{3}$/.test(upper) && (iataSet.size === 0 || iataSet.has(upper))) return upper;
              return '';
            };
            if (currentIsArrival){
              let originCode = '';
              let originName = '';
              let helperOrigin = null;
              try { helperOrigin = extractArrivalOriginFields(text); } catch(_){ }
              if (helperOrigin){
                const resolved = resolveAirportCode(helperOrigin.code || helperOrigin.IATA || helperOrigin.name || '');
                if (resolved) originCode = resolved;
                if (helperOrigin.name) originName = helperOrigin.name;
              }
              if (!originCode && originCand){
                const resolved = resolveAirportCode(originCand);
                if (resolved) originCode = resolved;
              }
              if (!originName && originCode){
                const rec = findValidAirport(originCode) || (originCand ? findValidAirport(originCand) : null);
                originName = rec?.Name || airportByIATA.get(originCode) || originName;
              }
              if (originCode){
                setVal('mf-arr-origin-code', originCode);
                if (originName) setVal('mf-arr-origin-name', originName);
              }

              let lastStopCode = '';
              let lastStopName = '';
              let helperLast = null;
              try { helperLast = extractArrivalLastStopFields(text); } catch(_){ }
              if (helperLast){
                const resolved = resolveAirportCode(helperLast.code || helperLast.IATA || helperLast.name || '');
                if (resolved) lastStopCode = resolved;
                if (helperLast.name) lastStopName = helperLast.name;
              }
              if (!lastStopCode && lastStopCand){
                const resolved = resolveAirportCode(lastStopCand);
                if (resolved) lastStopCode = resolved;
              }
              let forcedNameFromOrigin = false;
              if (!lastStopCode && originCode){
                lastStopCode = originCode;
                forcedNameFromOrigin = true;
              }
              if (lastStopCode){
                const sameAsOrigin = !!(originCode && lastStopCode === originCode);
                if (sameAsOrigin) forcedNameFromOrigin = true;
                if (!lastStopName){
                  const rec = findValidAirport(lastStopCode) || (lastStopCand ? findValidAirport(lastStopCand) : null);
                  lastStopName = rec?.Name || airportByIATA.get(lastStopCode) || lastStopName;
                  if (!lastStopName && (forcedLastStopFromOrigin || forcedNameFromOrigin || sameAsOrigin) && originName){
                    lastStopName = originName;
                  }
                }
                setVal('mf-arr-last-stop-code', lastStopCode);
                if (lastStopName) setVal('mf-arr-last-stop', lastStopName);
              }
            } else {
              if (originCand){
                const code = resolveAirportCode(originCand);
                if (code){
                  setVal('mf-origin-code', code);
                  const rec = findValidAirport(originCand) || findValidAirport(code);
                  const name = rec?.Name || airportByIATA.get(code) || '';
                  if (name) setVal('mf-origin-name', name);
                }
              }
              if (lastStopCand){
                const code = resolveAirportCode(lastStopCand);
                if (code){
                  setVal('mf-next-stop-code', code);
                  const rec = findValidAirport(lastStopCand) || findValidAirport(code);
                  const name = rec?.Name || airportByIATA.get(code) || '';
                  if (name) setVal('mf-next-stop', name);
                }
              }
              if (finalDestCand){
                const code = resolveAirportCode(finalDestCand);
                if (code){
                  setVal('mf-final-dest-code', code);
                  const rec = findValidAirport(finalDestCand) || findValidAirport(code);
                  const name = rec?.Name || airportByIATA.get(code) || '';
                  if (name) setVal('mf-final-dest', name);
                }
              }
            }
            let pax = findNearLabelValue(['PASAJEROS','PAX'], /\d{1,4}/, text);
            setVal('pax-total', pax || '');
            // Tripulación total (número)
            try {
              const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
              if (crew) setVal('mf-crew-total', crew);
            } catch(_){}
            // Piloto al mando (robusto): use robust extractor and debug dump; force-write if we obtain a candidate
            try {
              try { window._mfDebugDump?.(text); } catch(_){ }
              const current = (document.getElementById('mf-pilot')?.value||'').trim();
              if (!current){
                const robust = (window._mfExtractPilotRobust?.(text) || '').trim();
                if (robust) try { forceSetVal('mf-pilot', robust); } catch(_){ setVal('mf-pilot', robust); }
                if (!document.getElementById('mf-pilot')?.value){
                  const pilot = (window._mfExtractPilotUpperNearLabel?.(text) || '').trim();
                  if (pilot) try { forceSetVal('mf-pilot', pilot); } catch(_){ setVal('mf-pilot', pilot); }
                }
              }
            } catch(_){ }
            // No. de licencia (usa extractor exhaustivo como primario)
            try {
              let found = '';
              try {
                const ex = window._mfExtractPilotLicenseExhaustive?.(text) || '';
                if (ex) found = ex.toUpperCase();
              } catch(_) {}
              // Fallbacks ligeros por si el helper no detecta por algún motivo
              if (!found){
                const lines = (text||'').split(/\r?\n/);
                const labelRx = /\bN(?:O|0)\.?\s*L(?:I|1)C(?:\.|ENCIA)?\b/i;
                for (let i=0;i<lines.length;i++){
                  if (labelRx.test(lines[i])){
                    const scanSeg = [];
                    for (let k=1;k<=4;k++){ if (lines[i+k]) scanSeg.push(lines[i+k]); }
                    const joined = scanSeg.join(' ').replace(/\s+/g,' ').trim();
                    // Permitir números fragmentados por espacios
                    const onlyDigits = joined.replace(/[^0-9]/g,'');
                    if (onlyDigits.length>=7){ found = onlyDigits; break; }
                    const m = joined.match(/[A-Z]{1,6}[-\/]?\d{5,}|\d{7,}/i);
                    if (m){ found = m[0].toUpperCase(); break; }
                  }
                }
              }
              // Fallback adicional: si hay línea con 'NO.' (sin LIC), escanear siguientes
              if (!found){
                const lines = (text||'').split(/\r?\n/);
                const rxNO = /\bN(?:O|0|[º°])\.??\b|\bN[UÚ]M\.??\b/i;
                for (let i=0;i<lines.length;i++){
                  if (rxNO.test(lines[i])){
                    const scanSeg = [];
                    for (let k=0;k<=6;k++){ if (lines[i+k]) scanSeg.push(lines[i+k]); }
                    const joined = scanSeg.join(' ').replace(/\s+/g,' ').trim();
                    const onlyDigits = joined.replace(/[^0-9]/g,'');
                    if (onlyDigits.length>=7){ found = onlyDigits; break; }
                    const m = joined.match(/[A-Z]{1,6}[-\/]?\d{5,}|\d{7,}/i);
                    if (m){ found = m[0].toUpperCase(); break; }
                  }
                }
              }
              if (!found){
                const all = (text||'');
                const m2 = all.match(/N(?:O|0)\.?\s*L(?:I|1)C(?:\.|ENCIA)?[\s:\-]*([A-Z]{1,6}[-\/]?\d{5,}|\d{7,})/i);
                if (m2) found = (m2[1]||'').toUpperCase();
              }
              if (found) setVal('mf-pilot-license', found);
            } catch(_){}
            // Equipo (tipo aeronave) por extracción directa de texto cerca de etiqueta
            try {
              const typeICAO = extractAircraftTypeICAOFromText(text);
              if (typeICAO && typeIcaoSet && typeIcaoSet.has(typeICAO)) setVal('mf-aircraft', typeICAO);
            } catch(_){}
            const regLabels2 = ['MATRICULA','MATRÍCULA','REGISTRO','REGISTRATION','MATRÍCULA','MATRICULA'];
            let reg = findNearLabelValue(regLabels2, /\b[A-Z0-9-]{3,10}\b/, text) || '';
            if (isLabelWord(reg, regLabels2)) reg = '';
            const dlReg = document.getElementById('aircraft-reg-list');
            const opts = dlReg ? Array.from(dlReg.querySelectorAll('option')).map(o=> (o.getAttribute('value')||'').toUpperCase()) : [];
            let up = (reg||'').toUpperCase();
            let canon = resolveCatalogRegClassic(up);
            if ((!canon || up === 'EQUIPO') && text){
              const tailPatterns = [
                /\bX[A-C]-?[A-Z0-9]{3,6}\b/gi, /\bN\d{1,5}[A-Z]{0,3}\b/gi, /\bH[KP]-?[0-9A-Z]{3,8}\b/gi, /\bLV-?[A-Z0-9]{3,5}\b/gi,
                /\bCC-?[A-Z0-9]{3,5}\b/gi, /\bPR-?[A-Z0-9]{3,5}\b/gi, /\bCP-?[0-9A-Z]{3,6}\b/gi, /\bYV-?[0-9A-Z]{3,6}\b/gi,
                /\bOB-?[0-9A-Z]{3,6}\b/gi, /\bTG-?[0-9A-Z]{3,6}\b/gi, /\bTC-?[A-Z0-9]{3,6}\b/gi, /\bEI-?[A-Z]{3,5}\b/gi,
                /\bEC-?[A-Z]{3,5}\b/gi, /\bLX-?[A-Z0-9]{3,5}\b/gi, /\b9H-?[A-Z0-9]{3,6}\b/gi, /\b4K-?[A-Z0-9]{3,6}\b/gi,
                /\bA7-?[A-Z0-9]{3,6}\b/gi, /\bXA[A-Z0-9]{0,}\b/gi
              ];
              let mReg = '';
              for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ mReg = m[0].toUpperCase().replace(/\s+/g,''); break; } }
              if (mReg){ up = mReg; canon = resolveCatalogRegClassic(mReg); }
              if (!canon){ const ex = findCatalogRegInTextExhaustive(text); if (ex){ canon = ex; up = ex; } }
            }
            if (canon){
              const preferred = pickPreferredVariant(canon, text, opts);
              if (!isLabelWord(preferred, regLabels2)){
                const key = normalizeReg(preferred);
                if (!masterRegIndex.size || masterRegIndex.has(key)) setVal('mf-tail', preferred);
              }
              const el = document.getElementById('mf-tail'); if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (up && opts.includes(up)) {
              if (!isLabelWord(up, regLabels2)){
                const key = normalizeReg(up);
                if (!masterRegIndex.size || masterRegIndex.has(key)) setVal('mf-tail', up);
              }
              const el = document.getElementById('mf-tail'); if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              setVal('mf-tail', '');
            }
            // Equipo: no se fija aquí; el handler de tail lo resuelve
            // Post-procesado de horas (Salida): N/A donde aplica
            try {
              const isArr = !!(dirArr && dirArr.checked);
              if (!isArr){
                ['mf-slot-coordinated','mf-termino-pernocta'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; el.setCustomValidity(''); } });
              }
            } catch(_){ }
            setProgress(100, 'OCR alternativo completado'); syncProgressFinish();
            pdfStatus.textContent = 'Escaneo alternativo completado.';
            setTimeout(hideProgress, 2000);
          } catch (e){
            setProgress(100, 'Error en OCR alternativo');
            pdfStatus.textContent = 'No se pudo completar el OCR alternativo.';
            setTimeout(hideProgress, 2000);
          }
        });
  }

      async function ensurePdfJsFromCDN(){
        if (window.pdfjsLib) return;
        await new Promise((resolve, reject)=>{
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.crossOrigin = 'anonymous'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
        });
        try {
          const lib = window['pdfjsLib'];
          if (lib && lib.GlobalWorkerOptions){
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            if (lib.VerbosityLevel && typeof lib.VerbosityLevel.ERRORS === 'number'){
              lib.GlobalWorkerOptions.verbosity = lib.VerbosityLevel.ERRORS;
              try { lib.verbosity = lib.VerbosityLevel.ERRORS; } catch(_){ }
            }
          }
        } catch(_) {}
      }

      function fileToDataURL(file){
        return new Promise((resolve, reject)=>{
          const r = new FileReader(); r.onload = ()=> resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
        });
      }
      let currentImageURL = '';
      let airlinesCatalog = [];
      let iataToIcao = new Map();
      let icaoSet = new Set();
  let aircraftByReg = new Map();
  let typeByCode = new Map();
  let typeIcaoSet = new Set();
  let icaoToTypeName = new Map();
    let airportByIATA = new Map();
    let airportMetaByIATA = new Map();
    let airportByName = new Map();
    let airportByICAO = new Map();
    let airportMetaByICAO = new Map();
    let icaoToIata = new Map();
  let iataSet = new Set();
  // Evitar falsos positivos de palabras comunes en español o abreviaturas que no son IATA
  let iataStopwords = new Set(['DEL','LIC','AER','INT']);

      // Register time-field IDs to manage NA toggles and normalization
      window._mfTimeFieldIds = window._mfTimeFieldIds || new Set([
        'mf-slot-assigned','mf-slot-coordinated','mf-termino-pernocta','mf-inicio-embarque','mf-salida-posicion',
        'mf-arr-slot-assigned','mf-arr-slot-coordinated','mf-arr-arribo-posicion','mf-arr-inicio-desembarque','mf-arr-inicio-pernocta'
      ]);
      // Prefer 24h text inputs (no AM/PM UI)
      window._mfForce24hText = true;
      function _ensureTimeAttrs(id){
        try { const el = document.getElementById(id); if (!el) return; if (el.type === 'time'){ el.min = '00:00'; el.max = '23:59'; el.step = 60; } } catch(_){ }
      }
      function _convertTimeInputToText24h(id){
        try {
          const el = document.getElementById(id); if (!el) return;
          if (el.dataset.time24 === '1') return; // already converted
          const prev = (window._mfNormTime? window._mfNormTime(el.value): (el.value||''));
          // Switch to text (manual HH:MM) and allow digit-only typing; we will auto-insert ':'
          el.type = 'text';
          el.setAttribute('inputmode', 'numeric');
          el.setAttribute('placeholder', 'HH:MM');
          el.setAttribute('maxlength', '5');
          el.dataset.time24 = '1';
          if (prev) el.value = prev;
          const onFmt = ()=>{ try { const n=(window._mfNormTime? window._mfNormTime(el.value): el.value); if (n) el.value=n; } catch(_){} };
          // Auto-format while typing: accept digits and insert ':' when 3-4 digits present
          const onType = ()=>{
            try {
              let v = String(el.value||'');
              // If user types letters, allow manual N/A input and don't autoformat
              if (/[a-zA-Z]/.test(v)){
                const compact = v.replace(/\s+/g,'').toUpperCase();
                // Allow progressive typing: N, N/, N/A
                if (/^N\/?A?$/.test(compact)){
                  // If fully typed N/A, normalize and sync NA checkbox
                  if (/^N\/?A$/.test(compact)){
                    el.value = 'N/A';
                    const cb = document.getElementById(id+'-na');
                    if (cb && !cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('change',{bubbles:true})); }
                  } else {
                    el.value = v.toUpperCase();
                  }
                }
                return; // don't autoformat letters
              }
              // Allow deleting ':' manually; rebuild from digits
              const digits = v.replace(/\D/g, '').slice(0,4);
              if (!digits) { el.value = ''; return; }
              if (digits.length <= 2) { el.value = digits; return; }
              if (digits.length === 3) {
                el.value = '0' + digits[0] + ':' + digits.slice(1);
                return;
              }
              // 4 digits
              el.value = digits.slice(0,2) + ':' + digits.slice(2);
            } catch(_){}
          };
          if (!el._fmtWired){
            el._fmtWired=1;
            el.addEventListener('input', onType);
            el.addEventListener('blur', ()=>{
              try {
                const v = String(el.value||'').trim();
                if (/^N\s*\/?\s*A$/i.test(v)){
                  el.value = 'N/A';
                  const cb = document.getElementById(id+'-na');
                  if (cb && !cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('change',{bubbles:true})); }
                  return;
                }
                onFmt();
              } catch(_){ }
            });
            el.addEventListener('change', ()=>{
              try {
                const v = String(el.value||'').trim();
                if (/^N\s*\/?\s*A$/i.test(v)){
                  el.value = 'N/A';
                  const cb = document.getElementById(id+'-na');
                  if (cb && !cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('change',{bubbles:true})); }
                  return;
                }
                onFmt();
              } catch(_){ }
            });
          }
        } catch(_){ }
      }
      function setVal(id, v){
        const el = document.getElementById(id);
        if (!el) return;
        // Respect locked fields (candado): don't overwrite programmatically
        if (el.dataset && el.dataset.locked === '1') return;
        if (id === 'mf-airport-main'){
          forceAirportMainValue();
          return;
        }
        // If it's a managed time field, handle N/A state and 24h normalization
        if (window._mfTimeFieldIds && window._mfTimeFieldIds.has(id)){
          const isNA = (String(v||'').trim().toUpperCase() === 'N/A');
          _ensureTimeAttrs(id);
          const cb = document.getElementById(id+'-na');
          if (isNA){
            // Prefer toggling the NA checkbox so UI stays in sync
            if (cb && !cb.checked){ cb.checked = true; try { cb.dispatchEvent(new Event('change',{ bubbles:true })); } catch(_){ } }
            if (!cb){
              el.dataset.na = '1';
              el.value = 'N/A';
              try { el.classList.add('is-na'); el.setCustomValidity(''); } catch(_){ }
            }
          } else {
            if (cb && cb.checked){ cb.checked = false; try { cb.dispatchEvent(new Event('change',{ bubbles:true })); } catch(_){ } }
            const norm = (window._mfNormTime? window._mfNormTime(v) : String(v||''));
            if (norm){ el.dataset.na = ''; el.value = norm; el.disabled = false; }
            else { el.value = String(v||''); }
          }
          return;
        }
        el.value = v;
      }
      // Force-set a field even when locked: temporarily remove dataset.locked, set value and restore.
      // Use only for fields where automated fill is desired (pilot, license) and caller accepts override.
      function forceSetVal(id, v, opts){
        try {
          const el = document.getElementById(id);
          if (!el) return;
          const prevLocked = el.dataset && el.dataset.locked === '1';
          // Temporary unlock
          if (prevLocked){ try { el.dataset.locked = ''; } catch(_){} }
          // Use the standard setter logic where possible (to preserve N/A handling, etc.)
          try { setVal(id, v); } catch(_) { el.value = v; }
          // Dispatch events so other handlers react
          try { el.dispatchEvent(new Event('input',{ bubbles:true })); } catch(_){}
          try { el.dispatchEvent(new Event('change',{ bubbles:true })); } catch(_){}
          // Restore lock state
          if (prevLocked){ try { el.dataset.locked = '1'; } catch(_){} }
        } catch(_){ }
      }
      function _attachNaToggle(id){
        try {
          const input = document.getElementById(id); if (!input) return; if (input._naWired) return; input._naWired = 1;
          _ensureTimeAttrs(id);
          // Create a small NA checkbox; place it immediately after the input
          const wrap = input.parentElement;
          let cb = document.getElementById(id+'-na');
          if (!cb){
            const label = document.createElement('label');
            label.className = 'form-check-label ms-2 d-inline-flex align-items-center';
            label.style.userSelect = 'none';
            cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'form-check-input me-1';
            cb.id = id+'-na';
            cb.title = 'No aplica (N/A)';
            label.appendChild(cb);
            label.appendChild(document.createTextNode('N/A'));
            if (wrap){
              input.insertAdjacentElement('afterend', label);
            }
          } else {
            if (!cb.classList.contains('form-check-input')) cb.classList.add('form-check-input');
            if (cb.classList.contains('me-1') === false) cb.classList.add('me-1');
          }
          if (!cb) return;
          const syncFromCb = ()=>{
            if (cb.checked){
              input.dataset.na='1';
              input.value='N/A';
              input.classList.add('is-na');
              try { input.classList.remove('is-invalid'); input.setCustomValidity(''); } catch(_){ }
            } else {
              input.dataset.na='';
              input.classList.remove('is-na');
              if (/^N\s*\/?\s*A$/i.test(input.value||'')) input.value = '';
            }
          };
          const onInput = ()=>{
            const v = String(input.value||'').trim();
            const isNA = /^N\s*\/?\s*A$/i.test(v);
            if (isNA && !cb.checked){ cb.checked = true; syncFromCb(); return; }
            if (!isNA && v){ if (cb.checked){ cb.checked = false; syncFromCb(); } }
          };
          cb.addEventListener('change', syncFromCb);
          input.addEventListener('input', onInput);
          // If dataset.na present on load, reflect it
          if (input.dataset.na==='1'){ cb.checked = true; syncFromCb(); }
        } catch(_){ }
      }
      function isLabelWord(s, labels){
        const u = (s||'').toString().trim().toUpperCase();
        if (!u) return false;
        return labels.some(lbl => u === String(lbl||'').toUpperCase());
      }
      function setTailWarning(msg){
        const w = document.getElementById('mf-tail-warning');
        if (!w) return;
        if (msg){ w.textContent = msg; w.classList.remove('d-none'); }
        else { w.textContent = ''; w.classList.add('d-none'); }
      }
      function hasWordFactory(text){ const U=(text||'').toUpperCase(); return (w)=> U.includes(String(w||'').toUpperCase()); }
      function tokenizeUpper(text){ return (text||'').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean); }
  const FOREIGN_NAME_HINTS = /(USA|U\.?S\.?A|UNITED\s+STATES(?:\s+OF\s+AMERICA)?|ESTADOS\s+UNIDOS|EUA|EE\.?UU\.?(?:\.?|\b)|CANADA|CANADÁ|COLOMBIA|PERÚ|PERU|CHILE|ARGENTINA|BRASIL|BRAZIL|ECUADOR|BOLIVIA|PARAGUAY|URUGUAY|VENEZUELA|CUBA|PUERTO\s+RICO|JAMAICA|ESPAÑA|SPAIN|FRANCIA|FRANCE|REINO\s+UNIDO|UNITED\s+KINGDOM|INGLATERRA|ITALIA|GERMANY|ALEMANIA|HOLANDA|NETHERLANDS|CHINA|JAP(?:Ó|O)N|KOREA|COREA|INDIA|QATAR|PANAM(?:A|Á)|GUATEMALA|HONDURAS|NICARAGUA|SALVADOR|HAIT[IÍ]|REP(?:Ú|U)BLICA\s+DOMINICANA|DOMINICAN\s+REPUBLIC|COSTA\s+RICA|BELICE|BELIZE|CANARIAS|ISLAS\s+CANARIAS|CROACIA|POLONIA|RUSIA|RUSSIA|ALEUTIAN)/i;
  function getAirportMeta(iata){ try { return airportMetaByIATA.get((iata||'').toString().toUpperCase()) || null; } catch(_){ return null; } }
      function normalizeIATA(code){ return (code||'').toString().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); }
      function determineOperationTypeFromSources(mainCode, codeCandidates, nameCandidates){
        try {
          const metaByIATA = (typeof airportMetaByIATA !== 'undefined' && airportMetaByIATA) || (typeof window !== 'undefined' && window.airportMetaByIATA) || null;
          const metaByICAO = (typeof airportMetaByICAO !== 'undefined' && airportMetaByICAO) || (typeof window !== 'undefined' && window.airportMetaByICAO) || null;
          const namesMap = (typeof airportByName !== 'undefined' && airportByName) || (typeof window !== 'undefined' && window.airportByName) || null;
          const mapIataToIcao = (typeof iataToIcao !== 'undefined' && iataToIcao) || (typeof window !== 'undefined' && window.iataToIcao) || null;
          const mapIcaoToIata = (typeof icaoToIata !== 'undefined' && icaoToIata) || (typeof window !== 'undefined' && window.icaoToIata) || null;

          const seenTokens = new Set();
          const unresolvedTokens = new Set();
          let hasMexicoEvidence = false;
          let hasForeignEvidence = false;

          const noteMexico = ()=>{ hasMexicoEvidence = true; };
          const noteForeign = ()=>{ hasForeignEvidence = true; };
          const noteUnknown = (token)=>{ if (token) unresolvedTokens.add(token); };
          const toUpper = (val)=> (val||'').toString().trim().toUpperCase();

          const considerCountry = (country)=>{
            const norm = toUpper(country);
            if (!norm) return false;
            if (norm === MEXICO_COUNTRY_NAME){ noteMexico(); return true; }
            noteForeign(); return true;
          };

          const resolveIATAFromName = (name)=>{
            try {
              const raw = (name||'').toString().trim();
              if (!raw) return '';
              let iata = '';
              try {
                if (typeof window !== 'undefined' && typeof window._mfLookupIATAByName === 'function'){
                  iata = window._mfLookupIATAByName(raw) || '';
                }
              } catch(_){ }
              if (!iata && namesMap && typeof namesMap.get === 'function'){
                iata = namesMap.get(raw.toLowerCase()) || '';
              }
              if (!iata && typeof window !== 'undefined'){
                const idx = window.airportNameIndex;
                if (Array.isArray(idx)){
                  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/gi,' ').replace(/\s+/g,' ').trim().toLowerCase();
                  const hit = idx.find(entry => entry && entry.norm === norm);
                  if (hit && hit.iata) iata = hit.iata;
                }
              }
              return iata ? iata.toUpperCase() : '';
            } catch(_){ return ''; }
          };

          const analyzeCodeToken = (raw)=>{
            try {
              if (raw == null) return;
              const cleaned = toUpper(raw).replace(/[^A-Z0-9]/g,'');
              if (!cleaned || cleaned.length < 3) return;
              if (iataStopwords && typeof iataStopwords.has === 'function' && iataStopwords.has(cleaned)) return;
              if (seenTokens.has(cleaned)) return;
              seenTokens.add(cleaned);

              if (cleaned.length === 3){
                if (MEXICO_IATA_FALLBACK && typeof MEXICO_IATA_FALLBACK.has === 'function' && MEXICO_IATA_FALLBACK.has(cleaned)){ noteMexico(); return; }
                const meta = metaByIATA && typeof metaByIATA.get === 'function' ? metaByIATA.get(cleaned) : null;
                if (meta && considerCountry(meta.country)) return;
                const icao = mapIataToIcao && typeof mapIataToIcao.get === 'function' ? mapIataToIcao.get(cleaned) : '';
                if (icao){ analyzeCodeToken(icao); return; }
                noteUnknown(cleaned);
                return;
              }

              if (cleaned.length === 4){
                const metaIcao = metaByICAO && typeof metaByICAO.get === 'function' ? metaByICAO.get(cleaned) : null;
                if (metaIcao && considerCountry(metaIcao.country)){
                  if (metaIcao.iata) analyzeCodeToken(metaIcao.iata);
                  return;
                }
                if (/^MM[A-Z0-9]{2}$/.test(cleaned)){ noteMexico(); return; }
                const mappedIATA = mapIcaoToIata && typeof mapIcaoToIata.get === 'function' ? mapIcaoToIata.get(cleaned) : '';
                if (mappedIATA){ analyzeCodeToken(mappedIATA); return; }
                noteUnknown(cleaned);
                return;
              }

              if (cleaned.length > 4){
                for (let i = 0; i <= cleaned.length - 3; i++){
                  analyzeCodeToken(cleaned.slice(i, i + 3));
                }
                return;
              }

              noteUnknown(cleaned);
            } catch(_){ }
          };

          const analyzeName = (raw)=>{
            try {
              const trimmed = (raw||'').toString().trim();
              if (!trimmed) return;
              if (/M[EÉ]XICO/i.test(trimmed) || /\bNACIONAL\b/i.test(trimmed)) noteMexico();
              if (FOREIGN_NAME_HINTS.test(trimmed)) noteForeign();
              const resolved = resolveIATAFromName(trimmed);
              if (resolved) analyzeCodeToken(resolved);
              const upper = trimmed.toUpperCase();
              const tokens = upper.match(/[A-Z]{3,4}/g);
              if (tokens){
                tokens.forEach(tok=>{
                  if (iataStopwords && typeof iataStopwords.has === 'function' && iataStopwords.has(tok)) return;
                  analyzeCodeToken(tok);
                });
              }
            } catch(_){ }
          };

          const processCodeField = (value)=>{
            if (value == null) return;
            const str = String(value);
            analyzeCodeToken(str);
            str.split(/[^A-Z0-9]+/i).forEach(token=> analyzeCodeToken(token));
          };

          analyzeCodeToken(mainCode || FORCED_AIRPORT_MAIN_CODE);
          if (Array.isArray(codeCandidates)) codeCandidates.forEach(processCodeField);
          if (Array.isArray(nameCandidates)) nameCandidates.forEach(analyzeName);

          if (hasForeignEvidence) return 'Internacional';
          if (hasMexicoEvidence && unresolvedTokens.size === 0) return 'Doméstica';
          return '';
        } catch(_){ return ''; }
      }
  // Time patterns: HH:MM, HH.MM, HHhMM, H:MM, and compact HHMM (24h)
  const timeRx = /\b(?:([01]?\d|2[0-3])[:hH\.]\s?([0-5]\d)|([01]?\d|2[0-3])([0-5]\d))\b(?:\s?(?:hrs|hr|h))?/;
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
      // Extra robusto: extracción exhaustiva de No. de Licencia incluso si la etiqueta está partida ("No." y "LIC.") y el valor está en la misma línea o siguientes.
      window._mfExtractPilotLicenseExhaustive = function(text){
        try {
          const lines = (text||'').split(/\r?\n/);
          // Etiquetas tolerantes a OCR: NO puede leerse como N0 (cero); LIC puede leerse como L1C (uno) o con espacios
          const rxNO = /\bN\s*(?:[O0]|[º°])\.??\b|\bN\s*[UÚ]\s*M\.??\b|\bN[UÚ]M(?:ERO)?\.??\b|\bN\s*O\.??\b/i;    // No. / Nº / N° / N0. / Núm. con espacios tolerantes
          const rxLIC = /\bL\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\b/i; // LIC. / L I C . / L1C / LICENCIA (tolerante a espacios)
          const clean = (s)=> (s||'').toUpperCase().replace(/\s+/g,' ').trim();
          const finalizeLicense = (raw)=>{
            try {
              if (!raw) return '';
              let S = String(raw).toUpperCase();
              S = S.replace(/[_•·˙|]+/g,' ');
              // Cortar en palabras que marcan otro campo
              const boundary = /(TRIPUL[ACÁ]CION|CREW|PAX|PASAJ|VUELO|FECHA|ORIGEN|DESTINO|HORA|MATR[IÍ]CULA|PILOTO|MANDO|OPERACI[ÓO]N|AGENTE|RESPONSABLE|FOLIO)\b/i;
              const b = S.match(boundary);
              if (b && typeof b.index==='number'){ S = S.slice(0, b.index).trim(); }
              S = S.replace(/\s+/g,' ').trim();
              // Patrones preferentes
              let m = S.match(/\b[A-Z]{1,6}[-\/]?\d{2,8}\b/);
              if (m) return m[0].toUpperCase();
              m = S.match(/\b\d{3,10}\b/);
              if (m) return m[0].toUpperCase();
              m = S.match(/\b([A-Z]{1,6})\s+(\d{2,8})\b/);
              if (m) return (m[1]+m[2]).toUpperCase();
              const toks = S.split(/[^A-Z0-9]+/).filter(Boolean);
              for (let i=0;i<toks.length;i++){
                if (/^\d+$/.test(toks[i])){
                  let acc=toks[i]; let j=i+1; while(j<toks.length && /^\d+$/.test(toks[j])){ acc+=toks[j]; j++; }
                  if (acc.length>=3) return acc.toUpperCase();
                  i=j-1;
                }
              }
              if (toks.length){
                const joined = toks.join('');
                if (joined.length >= 3) return joined.toUpperCase();
              }
              return S.replace(/[^A-Z0-9\/\-].*$/, '').trim();
            } catch(_){ return (raw||'').toString().trim().toUpperCase(); }
          };
          const sliceAfterLastLabel = (s)=>{
            try {
              let idxLic = s.search(rxLIC);
              let idxNo = s.search(rxNO);
              let idx = Math.max(idxLic, idxNo);
              return idx>=0 ? s.slice(idx + (s.match(idx===idxLic?rxLIC:rxNO)?.[0]?.length||0)) : s;
            } catch(_){ return s; }
          };
          function findCandidatesInString(s, opts={}){
            const rawDigits = Number(opts.minDigits);
            const minDigits = Number.isFinite(rawDigits) ? Math.max(3, rawDigits) : 7;
            const rawMixed = Number(opts.minMixedDigits);
            const minMixedDigits = Number.isFinite(rawMixed) ? Math.max(3, rawMixed) : Math.max(minDigits, 5);
            const U = (s||'').toUpperCase();
            const tokens = U.replace(/[^A-Z0-9\-\/]/g,' ').split(/\s+/).filter(Boolean);
            const out = new Set();
            // 1) dígitos puros contiguos >= minDigits
            const digitRx = new RegExp(`\\b\\d{${minDigits},}\\b`, 'g');
            const dHits = U.match(digitRx) || [];
            dHits.forEach(v=> out.add(v));
            // 2) letras+digitos (con posible guión o "/")
            const mixRx = new RegExp(`\\b[A-Z]{1,6}[-\\/]?\\d{${minMixedDigits},}\\b`, 'g');
            const mixHits = U.match(mixRx) || [];
            mixHits.forEach(v=> out.add(v));
            // 3) pares separados por espacio: ABC 1234567
            for (let i=0;i<tokens.length-1;i++){
              const a=tokens[i], b=tokens[i+1];
              if (/^[A-Z]{2,6}$/.test(a) && new RegExp(`^\\d{${minMixedDigits},}$`).test(b)) out.add(a+b);
            }
            // 4) dígitos fragmentados por espacios: 2016 355 35 -> 201635535
            for (let i=0;i<tokens.length;i++){
              if (/^\d+$/.test(tokens[i])){
                let j=i; let acc='';
                while (j<tokens.length && /^\d+$/.test(tokens[j])){ acc += tokens[j]; j++; }
                if (acc.length>=minDigits) out.add(acc);
                i = j-1;
              }
            }
            // 5) letras seguidas de múltiples grupos de dígitos: ABC 12 34567 -> ABC1234567
            for (let i=0;i<tokens.length;i++){
              if (/^[A-Z]{1,6}$/.test(tokens[i])){
                let j=i+1; let acc='';
                while (j<tokens.length && /^\d+$/.test(tokens[j])){ acc += tokens[j]; j++; }
                if (acc.length>=minMixedDigits){ out.add(tokens[i] + acc); }
                i = j-1;
              }
            }
            // Preferencias: dígitos más largos primero, luego alfanuméricos
            const arr = Array.from(out);
            arr.sort((x,y)=>{
              const xd=/^\d+$/.test(x), yd=/^\d+$/.test(y);
              if (xd && yd) return y.length - x.length;
              if (xd && !yd) return -1;
              if (!xd && yd) return 1;
              return y.length - x.length;
            });
            return arr;
          }
          function scanWindow(fromIdx, toIdx, extraForward=6){
            const start = Math.max(0, Math.min(fromIdx, toIdx));
            const end = Math.min(lines.length-1, Math.max(fromIdx, toIdx) + extraForward);
            let buf = '';
            for (let i=start;i<=end;i++){ buf += (lines[i]||'') + ' '; }
            // Dar prioridad a lo que venga después del último label en la línea base
            const base = lines[Math.max(fromIdx, toIdx)] || '';
            const tail = sliceAfterLastLabel(base);
            const c1 = findCandidatesInString(tail, { minDigits: 3, minMixedDigits: 3 });
            if (c1.length) return c1[0];
            const c2 = findCandidatesInString(buf, { minDigits: 3, minMixedDigits: 3 });
            if (c2.length) return c2[0];
            if (tail && tail.trim()) return tail;
            return buf.trim();
          }
          // 1) Misma línea: NO y LIC presentes -> buscar a la derecha del último label
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxNO.test(ln) && rxLIC.test(ln)){
              const hit = scanWindow(i,i,4); if (hit) return finalizeLicense(hit);
            }
          }
          // 1.a) Solo 'NO.' presente (sin 'LIC'): tomar a la derecha y en siguientes líneas
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxNO.test(ln)){
              const hitNo = scanWindow(i,i,10);
              if (hitNo) return finalizeLicense(hitNo);
            }
          }
          // 1.b) Solo 'LIC.' o 'LICENCIA' presente (sin 'NO'): tomar a la derecha y en siguientes líneas
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxLIC.test(ln)){
              // Preferir lo que está a la derecha del label en la misma línea
              const hitSame = scanWindow(i,i,6);
              if (hitSame) return finalizeLicense(hitSame);
            }
          }
          // 2) Etiquetas partidas en +/-2 líneas; escanear ventana ampliada
          for (let i=0;i<lines.length;i++){
            if (rxNO.test(lines[i]||'')){
              for (let d=1; d<=2; d++){
                if (rxLIC.test(lines[i+d]||'')){ const hit = scanWindow(i, i+d, 10); if (hit) return finalizeLicense(hit); }
                if (rxLIC.test(lines[i-d]||'')){ const hit = scanWindow(i, i-d, 10); if (hit) return finalizeLicense(hit); }
              }
            }
            if (rxLIC.test(lines[i]||'')){
              for (let d=1; d<=2; d++){
                if (rxNO.test(lines[i+d]||'')){ const hit = scanWindow(i, i+d, 10); if (hit) return finalizeLicense(hit); }
                if (rxNO.test(lines[i-d]||'')){ const hit = scanWindow(i, i-d, 10); if (hit) return finalizeLicense(hit); }
              }
            }
          }
          // 3) Fallback global: permitir palabras intermedias entre NO y LIC y capturar luego
          try {
            const one = clean(text||'');
            const m = one.match(/N(?:O|0|[º°])\.??\s*(?:\w+\s*){0,6}L\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return finalizeLicense(cands[0]);
              return finalizeLicense(m[1]||'');
            }
          } catch(_){ }
          // 3.a) Fallback global: solo 'NO.' y capturar después lo que parezca licencia
          try {
            const one = clean(text||'');
            const m = one.match(/N(?:O|0|[º°])\.??\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return finalizeLicense(cands[0]);
              return finalizeLicense(m[1]||'');
            }
          } catch(_){ }
          // 3.b) Fallback global solo 'LIC'/'LICENCIA': capturar número/letras-dígitos después del label
          try {
            const one = clean(text||'');
            const m = one.match(/L\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return finalizeLicense(cands[0]);
              return finalizeLicense(m[1]||'');
            }
          } catch(_){ }
          // 4) Fallback con etiqueta colapsada: permite que "No." y "Lic." estén separados por saltos o espacios irregulares
          try {
            const rawFull = (text||'').toString().replace(/\u00A0/g,' ');
            const collapsed = rawFull.replace(/\s+/g,' ').toUpperCase();
            const patterns = [
              /N(?:O|0|[º°])\s*(?:\.|°)?\s*(?:DE\s+)?LIC(?:\.|ENCIA)?(?:\s+COMPLETO\s+O\s+NO\s+DE\s+EMPLEADO)?\s*[:=\-]?\s*([A-Z0-9\-\/ ]{3,})/i,
              /NO\W+LIC(?:\.|ENCIA)?\W*[:=\-]?\W*([A-Z0-9\-\/ ]{3,})/i
            ];
            for (const rx of patterns){
              const m = collapsed.match(rx);
              if (m && m[1]){
                const cand = finalizeLicense(m[1]);
                if (cand) return cand;
              }
            }
          } catch(_){ }
        } catch(_){ }
        return '';
      };
      const _mfPilotAliasTokens = new Set([
        'CAPITAN','CAPITÁN','CAP','CAPT','CAPTAIN','CAPTN','CPT','COMMANDER','COMANDER','COMANDANTE','CMDTE','CMDT','CDTE','CMTE','COMTE',
        'PILOTO','PILOT','MANDO','PILOTOALMANDO','PILOTOAL','ALMANDO','NUMERO','NÚMERO','NUM','NO'
      ]);
      const _mfPilotConnectorTokens = new Set([
        'DE','DEL','DELA','DA','DO','DOS','DAS','DI','DU','LA','EL','LOS','LAS','LE','LES','VON','VAN','MC','MAC','SAN','SANTA','ST','Y','E','AL'
      ]);
      const _mfPilotSuffixTokens = new Set(['JR','SR','II','III','IV','V']);
      // Corrige confusiones comunes de OCR (0→O, 1→I, etc.) sin aceptar tokens puramente numéricos.
      const _mfPilotDigitLetterMap = new Map([
        ['0','O'],['1','I'],['2','Z'],['3','E'],['4','A'],['5','S'],['6','G'],['7','T'],['8','B'],['9','G']
      ]);
      const _mfPilotForbiddenTokens = new Set([
        'FIRMA','FIRME','SIGNATURE','SIGNATURA','NOMBRE','NOMBRES','NAME','TRIPULACION','TRIPULACIÓN',
        'OPERADOR','OPERADORA','COORDINADOR','COORDINADORA','DESPACHADOR','DESPACHADORA','CONTROL','RUTA',
        'FECHA','HORA','DESTINO','ORIGEN','VUELO','FOLIO','TOTAL','CARGO','PASAJEROS','PAX','AUTORIZA','AUTORIZACIÓN',
        'ADMINISTRADOR','SUPERVISOR','SUPERVISORA','JEFE','DIRECTOR','GERENTE','LIC','LICENCIA','CARACTERES','CARACERES',
        'ALFANUMERICO','ALFANUMÉRICO','ADMINISTRACION','ADMINISTRACIÓN','ESPACIO','RESERVADO','RESERVADA','RESERVADOS','RESERVADAS',
        'DIA','DÍA','MES','AÑO','ANO','MARCA','NACIONALIDAD','MATRICULA','MATRÍCULA','MATRICULAS','MATRÍCULAS','ANANUMENCO'
      ]);

      const _mfPilotForbiddenRegexes = (() => {
        const esc = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return Array.from(_mfPilotForbiddenTokens).map(token => new RegExp(`\\b${esc(token)}\\b`, 'i'));
      })();

      function _mfPilotStripForbiddenTail(str){
        if (!str) return '';
        let cutoff = str.length;
        for (const rx of _mfPilotForbiddenRegexes){
          const match = rx.exec(str);
          if (match && match.index < cutoff) cutoff = match.index;
        }
        if (cutoff === 0) return '';
        const sliced = cutoff < str.length ? str.slice(0, cutoff) : str;
        return sliced.replace(/\s+/g,' ').trim();
      }

      function _mfPilotTokenize(raw){
        try {
          const up = (raw||'').toString()
            .replace(/\u00A0/g,' ')
            .replace(/[\u2018\u2019]/g,"'")
            .replace(/[\u201C\u201D]/g,'"')
            .toUpperCase();
          const clean = up.replace(/[.,;:|•·¡!¿?\(\)\[\]{}<>]/g,' ').replace(/\s+/g,' ').trim();
          if (!clean) return [];
          return clean.split(' ');
        } catch(_){ return []; }
      }

      function _mfPilotPrepareTokens(tokens){
        try {
          if (!Array.isArray(tokens) || !tokens.length) return null;
          const seq = [];
          let coreCount = 0;
          let hasLong = false;
          let suffixCount = 0;
          for (const rawTok of tokens){
            let tok = (rawTok||'').trim();
            if (!tok) continue;
            tok = tok.replace(/^[^A-ZÁÉÍÓÚÑ'’\-]+/g,'').replace(/[^A-ZÁÉÍÓÚÑ'’\-]+$/g,'');
            if (!tok) continue;
            tok = tok.replace(/’/g,"'").replace(/--+/g,'-');
            if (!tok) continue;
            if (_mfPilotForbiddenTokens.has(tok)) return null;
            if (_mfPilotAliasTokens.has(tok)) continue;
            if (_mfPilotConnectorTokens.has(tok)){
              seq.push(tok);
              continue;
            }
            if (_mfPilotSuffixTokens.has(tok)){
              seq.push(tok);
              suffixCount++;
              continue;
            }
            if (/\d/.test(tok)) return null;
            const letters = tok.replace(/[^A-ZÁÉÍÓÚÑ]/g,'');
            if (letters.length < 2) return null;
            if (letters.length >= 3) hasLong = true;
            seq.push(tok);
            coreCount++;
          }
          while (seq.length && (_mfPilotConnectorTokens.has(seq[0]) || _mfPilotSuffixTokens.has(seq[0]))) seq.shift();
          while (seq.length && (_mfPilotConnectorTokens.has(seq[seq.length-1]) || _mfPilotSuffixTokens.has(seq[seq.length-1]))) seq.pop();
          if (!seq.length) return null;
          const coreTokens = seq.filter(tok=> !_mfPilotConnectorTokens.has(tok) && !_mfPilotSuffixTokens.has(tok));
          if (coreTokens.length < 2 || coreTokens.length > 6) return null;
          if (!hasLong) return null;
          for (let i=1;i<seq.length;i++){
            const a = seq[i-1], b = seq[i];
            if (_mfPilotConnectorTokens.has(a) && _mfPilotConnectorTokens.has(b)) return null;
            if (!_mfPilotConnectorTokens.has(a) && !_mfPilotConnectorTokens.has(b) && a === b) return null;
          }
          const text = seq.join(' ').replace(/\s+/g,' ').trim();
          if (!text) return null;
          const lettersLen = text.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length;
          return {
            text,
            coreCount: coreTokens.length,
            connectors: seq.filter(tok=> _mfPilotConnectorTokens.has(tok)).length,
            suffixCount,
            lettersLen
          };
        } catch(_){ return null; }
      }

      function _mfPilotScoreCandidate(raw, opts={}){
        try {
          if (!raw) return null;
          const str = (raw||'').toString().replace(/\u00A0/g,' ');
          const trunk = str.length > 220 ? str.slice(0,220) : str;
          const tokens = _mfPilotTokenize(trunk);
          const info = _mfPilotPrepareTokens(tokens);
          if (!info) return null;
          let score = info.coreCount * 28 + info.lettersLen;
          if (info.coreCount >= 3) score += 12;
          if (info.coreCount >= 4) score += 6;
          if (info.suffixCount) score += info.suffixCount * 2;
          if (opts.sameLine) score += 34;
          if (opts.beforeLabel) score -= 12;
          if (typeof opts.distance === 'number') score += Math.max(18 - (opts.distance * 6), -16);
          if (opts.windowBoost) score += opts.windowBoost;
          if (info.connectors > info.coreCount) score -= 10;
          if (info.lettersLen > 44) score -= (info.lettersLen - 44) * 1.6;
          if (info.lettersLen < 9) score -= 12;
          return { text: info.text, score };
        } catch(_){ return null; }
      }

      // Refuerzo robusto: heurística refinada para capturar nombres completos cerca de "PILOTO AL MANDO"
      window._mfExtractPilotUpperNearLabel = function(text){
        try {
          const lines = (text||'').split(/\r?\n/);
          const strongLabelRx = /PILOTO\s+AL(?:\s+(?:N[O0º°]\.??|N[ÚU]M(?:ERO)?\.??))?\s+MANDO/i;
          const wordPilot = /\bPILOTO\b/i;
          const wordMando = /\bMANDO\b/i;
          const weakLabel = /\b(CAPIT[ÁA]N|CAPT|CAP|CPT|COMANDANTE)\b/i;
          let best = { score: -Infinity, text: '' };
          const register = (raw, opts={})=>{
            try {
              if (!raw) return;
              const normalized = (raw||'').toString().replace(/\u00A0/g,' ');
              const compact = normalized.replace(/\s+/g,' ').trim();
              if (!compact) return;
              const base = _mfPilotStripForbiddenTail(compact) || compact;
              const segments = new Set([base]);
              compact.split(/\bFIRMA\b/i).forEach(seg=>{ if (seg) segments.add(seg.trim()); });
              compact.split(/[|;]/).forEach(seg=>{ if (seg) segments.add(seg.trim()); });
              compact.split(/,\s*/).forEach(seg=>{ if (seg) segments.add(seg.trim()); });
              compact.split(/\s-\s/).forEach(seg=>{ if (seg) segments.add(seg.trim()); });
              compact.split(/:\s*/).forEach(seg=>{ if (seg) segments.add(seg.trim()); });
              segments.add(base.replace(/\bNOMBRE\s+DEL\s+COMANDANTE\s+DE\s+VUELO\b.*$/i,'').trim());
              segments.add(base.replace(/\bNOMBRE\s+DEL\s+PILOTO\b.*$/i,'').trim());
              for (const piece of segments){
                const clean = (piece||'').replace(/\s+/g,' ').trim();
                if (!clean) continue;
                const cand = _mfPilotScoreCandidate(clean, opts);
                if (cand && cand.score > best.score) best = cand;
              }
            } catch(_){ }
          };
          for (let i=0;i<lines.length;i++){
            const line = lines[i]||'';
            const prev = lines[i-1]||'';
            const next = lines[i+1]||'';
            const block = [prev,line,next].join(' ');
            const hasStrong = strongLabelRx.test(line) || strongLabelRx.test(block);
            const hasPilot = wordPilot.test(block);
            const hasMando = wordMando.test(block);
            const hasWeak = weakLabel.test(line);
            if (!(hasStrong || (hasPilot && hasMando) || (hasWeak && (hasPilot || hasMando)))) continue;

            if (hasStrong){
              let match = line.match(strongLabelRx);
              if (match){
                const after = line.slice(match.index + match[0].length);
                register(after, { sameLine: true, distance: 0 });
                register(line.slice(0, match.index), { sameLine: true, distance: 0, beforeLabel: true });
              } else {
                let composite = line;
                for (let span=1; span<=3 && !match; span++){
                  composite = (composite + ' ' + (lines[i+span] || '')).replace(/\s+/g,' ').trim();
                  if (!composite) continue;
                  const spanMatch = composite.match(strongLabelRx);
                  if (spanMatch){
                    match = spanMatch;
                    const after = composite.slice(spanMatch.index + spanMatch[0].length);
                    if (after) register(after, { sameLine: true, distance: 0, windowBoost: 8 });
                    // Registrar líneas siguientes cercanas como candidatos directos
                    for (let off=1; off<=6; off++){
                      const ln = lines[i+off];
                      if (ln == null) break;
                      if (!ln.trim()) continue;
                      register(ln, { distance: off, windowBoost: Math.max(10 - off*2, 2) });
                    }
                    break;
                  }
                }
              }
            } else {
              const matchPilot = line.match(wordPilot);
              if (matchPilot){
                register(line.slice(matchPilot.index + matchPilot[0].length), { sameLine: true, distance: 0 });
                register(line.slice(0, matchPilot.index), { sameLine: true, distance: 0, beforeLabel: true });
              }
              const matchWeak = line.match(weakLabel);
              if (matchWeak){
                register(line.slice(matchWeak.index + matchWeak[0].length), { sameLine: true, distance: 0 });
                register(line.slice(0, matchWeak.index), { sameLine: true, distance: 0, beforeLabel: true });
              }
            }

            let aggregate = '';
            for (let d=1; d<=6; d++){
              const ln = lines[i+d];
              if (ln == null) break;
              if (!ln.trim()) continue;
              aggregate += ' ' + ln;
              register(ln, { distance: d, windowBoost: 6 - d });
              register(aggregate, { distance: d, windowBoost: 4 });
            }

            aggregate = '';
            for (let d=1; d<=2; d++){
              const ln = lines[i-d];
              if (ln == null) break;
              if (!ln.trim()) continue;
              aggregate = ln + ' ' + aggregate;
              register(ln, { distance: d, beforeLabel: true, windowBoost: 3 });
              register(aggregate, { distance: d, beforeLabel: true });
            }
          }
            // Captura adicional basada en bloques completos posteriores a "PILOTO AL MANDO"
            try {
              const blockRx = /PILOTO\s+AL\s+MANDO([\s\S]{0,260})/gi;
              let match;
              while ((match = blockRx.exec(text || '')) !== null) {
                let segment = match[1] || '';
                segment = segment.replace(/^[\s:;._-]+/, '');
                if (!segment) continue;
                const blockLines = segment.split(/\r?\n/)
                  .map(line => line.replace(/[\u2013\u2014]/g,' ').replace(/[_•·˙]+/g,' ').replace(/\s+/g,' ').trim())
                  .filter(Boolean);
                for (let idx = 0; idx < blockLines.length; idx++) {
                  const line = blockLines[idx];
                  if (!line) continue;
                  if (/NOMBRE\s+DEL\s+COMANDANTE/i.test(line) || /NOMBRE\s+DEL\s+PILOTO/i.test(line) || /FIRMA/i.test(line)) break;
                  register(line, { distance: idx + 1, windowBoost: Math.max(12 - idx * 2, 3) });
                  if (idx + 1 < blockLines.length) {
                    const joined = [line, blockLines[idx + 1]].join(' ').replace(/\s+/g,' ').trim();
                    if (joined && !/NOMBRE\s+DEL\s+COMANDANTE/i.test(joined)) {
                      register(joined, { distance: idx + 1, windowBoost: Math.max(10 - idx, 2) });
                    }
                  }
                }
              }
            } catch(_){ }
          if (!best.text || best.score <= 0) {
            try {
              const fallbackRx = /PILOTO\s+AL\s+MANDO([\s\S]{0,260})/i;
              const found = fallbackRx.exec(text || '');
              if (found && found[1]) {
                const remainder = found[1].replace(/^[\s:;._-]+/, '');
                const linesAfter = remainder.split(/\r?\n/).map(line => line.replace(/[\u2013\u2014]/g,' ').replace(/[_•·˙]+/g,' ').trim()).filter(Boolean);
                for (const line of linesAfter) {
                  if (!line || /NOMBRE\s+DEL\s+COMANDANTE/i.test(line) || /NOMBRE\s+DEL\s+PILOTO/i.test(line) || /FIRMA/i.test(line)) break;
                  const cand = _mfPilotScoreCandidate(line, { sameLine: true, windowBoost: 18 });
                  if (cand) {
                    best = cand;
                    break;
                  }
                }
              }
            } catch(_){ }
          }
          if (!best.text || best.score <= 0) {
            try {
              const directAlt = window._mfExtractPilotDirectBlock ? window._mfExtractPilotDirectBlock(text) : '';
              if (directAlt) {
                const score = directAlt.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length + 30;
                best = { text: directAlt, score };
              }
            } catch(_){ }
          }
          return best.score > -Infinity ? best.text.trim() : '';
        } catch(_){ return ''; }
      };

      window._mfExtractPilotDirectBlock = function(text){
        try {
          if (!text) return '';
          const upper = text.toUpperCase().replace(/\u00A0/g, ' ');
          const pattern = /PILOTO\s+AL\s+MANDO[^A-ZÁÉÍÓÚÑ]*([A-ZÁÉÍÓÚÑ'’\-]{2,}(?:\s+[A-ZÁÉÍÓÚÑ'’\-]{2,}){0,8})/g;
          let best = { score: -Infinity, value: '' };
          const isLegend = (str) => /PILOTO|MANDO|NOMBRE\s+DEL\s+COMANDANTE|NOMBRE\s+DEL\s+PILOTO|FIRMA|CARACTERES|ALFANUMERICO/i.test(str);
          let match;
          while ((match = pattern.exec(upper)) !== null){
            let raw = (match[1] || '').replace(/[_•·˙]+/g,' ').replace(/\s+/g,' ').trim();
            raw = raw.replace(/\b(NOMBRE\s+DEL\s+COMANDANTE\s+DE\s+VUELO|NOMBRE\s+DEL\s+PILOTO|FIRMA|CARACTERES\s+ALFANUMERICO).*$/i, '').trim();
            raw = raw.replace(/\bCARACTERES?\s+ALFANUMERICO[OS]?\b/gi, '').trim();
            if (!raw || isLegend(raw)) continue;
            const words = raw.split(' ').filter(Boolean);
            if (words.length < 2 || words.length > 6) continue;
            if (words.some(w => w.length < 2)) continue;
            const letterCount = raw.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length;
            if (letterCount < 6) continue;
            const score = letterCount + (words.length * 12);
            if (score > best.score) best = { score, value: raw };
          }
          return best.value || '';
        } catch(_){ return ''; }
      };

      // Refuerzo avanzado con capa de texto PDF: pondera cercanía, tamaño de fuente y estilo
      window._mfExtractPilotUpperFromPdf = async function(file, pages=2){
        try {
          await ensurePdfJsLite();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
          const maxPages = Math.min(pdf.numPages, Math.max(1, pages||1));
          const strongLabelRx = /PILOTO\s+AL(?:\s+(?:N[O0º°]\.??|N[ÚU]M(?:ERO)?\.??))?\s+MANDO/i;
          const wordPilot = /\bPILOTO\b/i;
          const wordMando = /\bMANDO\b/i;
          const weakLabel = /\b(CAPIT[ÁA]N|CAPT|CAP|CPT|COMANDANTE)\b/i;
          const toUpper = (s)=> (s||'').toString().toUpperCase();
          const considerTokens = (tokens, opts={})=>{
            if (!Array.isArray(tokens) || tokens.length < 2) return null;
            const joined = tokens.map(t=> t.txt || '').join(' ');
            const pruned = _mfPilotStripForbiddenTail(joined) || joined;
            const cand = _mfPilotScoreCandidate(pruned, opts);
            if (!cand) return null;
            const maxSize = Math.max(...tokens.map(t=> t.size||0), 0);
            const avgSize = tokens.reduce((acc,t)=> acc + (t.size||0), 0) / tokens.length;
            const boldBoost = tokens.some(t=> /BLACK|BOLD|HEAVY/i.test(String(t.font||''))) ? 18 : 0;
            cand.score += (maxSize * 18) + (avgSize * 6) + (tokens.length * 2) + boldBoost;
            return cand;
          };
          let best = { score: -Infinity, text: '' };
          for (let p=1; p<=maxPages; p++){
            const page = await pdf.getPage(p);
            const tc = await page.getTextContent();
            const items = (tc && tc.items) || [];
            const arr = items.map(it=>{
              const tr = Array.isArray(it.transform) ? it.transform : [1,0,0,1,0,0];
              const x = tr[4]||0, y = tr[5]||0;
              const a = Math.abs(tr[0]||0), d = Math.abs(tr[3]||0), b=Math.abs(tr[1]||0), c=Math.abs(tr[2]||0);
              const size = Math.max(a,d,b,c);
              return { txt: it.str||'', x, y, size, font: it.fontName||'' };
            }).filter(it=> (it.txt||'').trim());
            arr.sort((u,v)=> v.y - u.y);
            const lines = [];
            const tolY = 3.0;
            for (const it of arr){
              const last = lines[lines.length-1];
              if (last && Math.abs(last.y - it.y) <= tolY){
                last.items.push(it);
                last.y = (last.y + it.y) / 2;
              } else {
                lines.push({ y: it.y, items: [it] });
              }
            }
            lines.forEach(ln=> ln.items.sort((a,b)=> a.x - b.x));
            for (let i=0;i<lines.length;i++){
              const ln = lines[i];
              const prev = lines[i-1];
              const next = lines[i+1];
              const currentText = toUpper(ln.items.map(t=> t.txt).join(' '));
              const block = [
                prev ? toUpper(prev.items.map(t=> t.txt).join(' ')) : '',
                currentText,
                next ? toUpper(next.items.map(t=> t.txt).join(' ')) : ''
              ].join(' ');
              const hasStrong = strongLabelRx.test(currentText) || strongLabelRx.test(block);
              const hasPilot = wordPilot.test(block);
              const hasMando = wordMando.test(block);
              const hasWeak = weakLabel.test(currentText);
              if (!(hasStrong || (hasPilot && hasMando) || (hasWeak && (hasPilot || hasMando)))) continue;

              let pivotX = 0;
              for (const it of ln.items){
                const up = toUpper(it.txt);
                if (strongLabelRx.test(up) || wordPilot.test(up) || wordMando.test(up) || weakLabel.test(up)){
                  pivotX = Math.max(pivotX, it.x + 2);
                }
              }
              const right = ln.items.filter(t=> t.x >= pivotX);
              const consider = (slice, meta)=>{
                const cand = considerTokens(slice, meta);
                if (cand && cand.score > best.score) best = cand;
              };
              for (let a=0;a<right.length;a++){
                for (let b=a+2;b<=Math.min(right.length, a+7);b++){
                  consider(right.slice(a,b), { sameLine: true, distance: 0 });
                }
              }
              const left = ln.items.filter(t=> t.x < pivotX - 1);
              for (let a=0;a<left.length;a++){
                for (let b=a+2;b<=Math.min(left.length, a+7);b++){
                  consider(left.slice(a,b), { sameLine: true, distance: 0, beforeLabel: true });
                }
              }
              let aggregate = [];
              for (let d=1; d<=6; d++){
                const target = lines[i+d];
                if (!target) break;
                const textTarget = toUpper(target.items.map(t=> t.txt).join(' '));
                if (!textTarget.trim()) continue;
                aggregate = aggregate.concat(target.items);
                consider(target.items, { distance: d, windowBoost: 6 - d });
                consider(aggregate, { distance: d, windowBoost: 4 });
              }
              aggregate = [];
              for (let d=1; d<=2; d++){
                const target = lines[i-d];
                if (!target) break;
                const textPrev = toUpper(target.items.map(t=> t.txt).join(' '));
                if (!textPrev.trim()) continue;
                aggregate = target.items.concat(aggregate);
                consider(target.items, { distance: d, beforeLabel: true, windowBoost: 3 });
                consider(aggregate, { distance: d, beforeLabel: true });
              }
            }
          }
          return best.score > -Infinity ? best.text.trim() : '';
        } catch(_){ return ''; }
      };
      // Lightweight debug dump: creates or updates a small debug panel with the raw OCR/text content and timestamp.
      window._mfDebugDump = function(text){
        try {
          const id = 'mf-debug-panel';
          let el = document.getElementById(id);
          if (!el){
            el = document.createElement('textarea');
            el.id = id; el.style.position='fixed'; el.style.right='8px'; el.style.bottom='8px'; el.style.width='420px'; el.style.height='240px';
            el.style.zIndex='99999'; el.style.background='rgba(0,0,0,0.85)'; el.style.color='#fff'; el.style.border='1px solid rgba(255,255,255,0.08)';
            el.style.padding='8px'; el.style.fontSize='12px'; el.style.fontFamily='monospace'; el.style.opacity='0.95'; el.title = 'DEBUG: texto OCR / extraído';
            document.body.appendChild(el);
          }
          const head = '[' + (new Date()).toLocaleString() + '] (len=' + ((text||'').length) + ')\n';
          el.value = head + (text||'');
        } catch(_){ console.log('mf: debug dump failed'); }
      };

      function _mfPilotCollapseTokens(tokens){
        try {
          const out = [];
          for (let i=0; i<tokens.length; i++){
            let tok = tokens[i];
            if (!tok) continue;
            if (/^[A-ZÁÉÍÓÚÑ]$/.test(tok)){
              let j = i;
              let combined = tok;
              while (j + 1 < tokens.length && /^[A-ZÁÉÍÓÚÑ]$/.test(tokens[j+1])){
                combined += tokens[++j];
              }
              if (j > i){
                out.push(combined);
                i = j;
                continue;
              }
              if (tokens[i+1] && /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(tokens[i+1])){
                out.push(tok + tokens[i+1]);
                i++;
                continue;
              }
            }
            out.push(tok);
          }
          return out;
        } catch(_){ return Array.isArray(tokens) ? tokens : []; }
      }

      function _mfPilotSanitizeRawCandidate(raw){
        try {
          let txt = (raw||'').toString().replace(/\u00A0/g,' ');
          txt = txt.replace(/[•|]/g,' ').replace(/\s+/g,' ').trim();
          if (!txt) return '';
          const dropPhrases = [
            /\bPILOTO\s+AL\s+(?:N(?:O|0|[º°])\.?\s*)?MANDO\b/gi,
            /\bCAPIT[ÁA]N\b/gi,
            /\bCOMANDANTE\b/gi,
            /\bCARACTERES?\s+ALFAN(?:U|Ú)M[ÉE]RICO\b/gi,
            /\bNOMBRE\s+DEL\s+COMANDANTE(?:\s+DE\s+VUELO)?\b/gi,
            /\bMARCA\s+DE\s+NACIONALIDAD\b.*/gi,
            /\bMATR[IÍ]CULA\b.*/gi
          ];
          for (const rx of dropPhrases){ txt = txt.replace(rx,' '); }
          txt = txt.replace(/\bLIC(?:\.?|ENCIA)?\b.*$/i,' ');
          txt = txt.replace(/\bN(?:O|0)[º°.]?\b/gi,' ').replace(/\bNUM(?:ERO)?\b/gi,' ');
          txt = txt.replace(/\bLIC(?:\.?|ENCIA)?\b/gi,' ');
          txt = txt.replace(/\bNO\.\b/gi,' ');
          txt = txt.replace(/\bCARACTERES\b/gi,' ').replace(/\bALFAN(?:U|Ú)M[ÉE]RICO\b/gi,' ');
          txt = txt.replace(/\bMARCA\b/gi,' ').replace(/\bNACIONALIDAD\b/gi,' ').replace(/\bMATR[IÍ]CULA\b/gi,' ');
          txt = (_mfPilotStripForbiddenTail(txt) || txt).replace(/\s+/g,' ').trim();
          if (!txt) return '';
          const tokenBase = _mfPilotTokenize(txt);
          if (!tokenBase.length) return '';
          const rawTokens = _mfPilotCollapseTokens(tokenBase);
          const kept = [];
          const core = [];
          let lastWasConnector = false;
          for (let token of rawTokens){
            let up = token.toUpperCase();
            if (!up) continue;
            if (/[0-9]/.test(up)){
              const baseLetters = up.replace(/[0-9]/g,'');
              const originalHasLetters = /[A-ZÁÉÍÓÚÑ]/.test(baseLetters);
              const converted = up.replace(/[0-9]/g, d => _mfPilotDigitLetterMap.get(d) || '');
              if (!originalHasLetters){
                // Token compuesto solo por dígitos: descartar en lugar de convertir a letras artificiales.
                continue;
              }
              if (converted && /[A-ZÁÉÍÓÚÑ]/.test(converted)){
                up = converted;
              }
            }
            if (!/[A-ZÁÉÍÓÚÑ]/.test(up)) continue;
            if (_mfPilotAliasTokens.has(up)) continue;
            if (_mfPilotForbiddenTokens.has(up)) continue;
            if (up === 'NO' || up === 'NUM' || up === 'NUMERO' || up === 'NÚMERO') continue;
            if (up.includes('CARAC') || up.includes('ALFAN') || up.includes('MARCA') || up.includes('NACION') || up.includes('MATRIC')) continue;
            if (up.length === 1 && !_mfPilotConnectorTokens.has(up)) continue;
            if (_mfPilotConnectorTokens.has(up)){
              if (!core.length) continue;
              if (lastWasConnector) continue;
              kept.push(up);
              lastWasConnector = true;
              continue;
            }
            kept.push(up);
            core.push(up);
            lastWasConnector = false;
          }
          while (kept.length && _mfPilotConnectorTokens.has(kept[0])) kept.shift();
          while (kept.length && _mfPilotConnectorTokens.has(kept[kept.length-1])) kept.pop();
          if (!kept.length) return '';
          const coreTokens = kept.filter(tok => !_mfPilotConnectorTokens.has(tok));
          if (coreTokens.length < 2) return '';
          if (coreTokens.some(tok => tok.length < 2 || tok.length > 18)) return '';
          const candidate = kept.join(' ');
          if (/(CARAC|ALFAN|NACION|MARCA|MATRIC|TRIPUL|RESERV|ADMIN|CONTROL|OBSERV)/i.test(candidate)) return '';
          return candidate;
        } catch(_){ return (raw||'').toString().trim(); }
      }

      function _mfPilotPickAfterMando(raw){
        try {
          const source = (raw||'').toString();
          if (!source) return '';
          const labelRx = /(?:P\s*I\s*L\s*O\s*T\s*O[\s:;,.•_'’"\/\-]+A\s*L[\s:;,.•_'’"\/\-]+)?M\s*A\s*N\s*D\s*O\b/i;
          const match = labelRx.exec(source);
          let slice;
          if (match){
            slice = source.slice(match.index + match[0].length);
          } else {
            const up = source.toUpperCase();
            const idx = up.indexOf('MANDO');
            if (idx === -1) return '';
            slice = source.slice(idx + 5);
          }
          slice = slice.replace(/^[\s:;.,"'“”‘’\-]+/, '');
          const segments = slice.split(/\r?\n/).map(seg=> seg.replace(/^[\s:;.,"'“”‘’\-]+/, '').trim()).filter(Boolean);
          let focus = segments[0] || '';
          if (!focus && segments.length > 1) focus = segments[1] || '';
          if (!focus) focus = slice;
          let scanZone = focus;
          if (!scanZone && segments.length > 1) scanZone = segments.slice(0,2).join(' ');
          const stopRx = /\b(LIC(?:\.|ENCIA)?|TRIPUL[A-ZÁÉÍÓÚÑ]*|NOMBRE|FIRMA|CARACTERES?|ALFAN(?:U|Ú)M|OPERADOR|COORDINAD|ADMINISTR|OBSERV|PAX|PASAJER|CAPIT|COMAND|CONTROL|RUTA|TOTAL|MATR[IÍ]CULA|EQUIPO)\b/i;
          const stop = stopRx.exec(scanZone);
          if (stop) scanZone = scanZone.slice(0, Math.max(0, stop.index));
          const direct = _mfPilotSanitizeRawCandidate(scanZone);
          if (direct) return direct;
          return _mfPilotFindFallbackInText(slice);
        } catch(_){ return ''; }
      }

      function _mfPilotFindFallbackInText(raw){
        try {
          const text = (raw||'').toString().replace(/\u00A0/g,' ').replace(/[•|]/g,' ');
          if (!text.trim()) return '';
          const tokens = text.split(/\s+/).map(t=> t.trim()).filter(Boolean);
          if (!tokens.length) return '';
          let best = null;
          for (let start=0; start<tokens.length; start++){
            const tok = tokens[start];
            if (!tok || /\d/.test(tok)) continue;
            for (let len=2; len<=6 && start+len<=tokens.length; len++){
              const slice = tokens.slice(start, start+len);
              if (slice.some(part=> /\d/.test(part))) continue;
              const joined = slice.join(' ');
              const cleaned = _mfPilotSanitizeRawCandidate(joined);
              if (!cleaned) continue;
              if (/(CARAC|ALFAN|NACION|MARCA|MATRIC|TRIPUL|RESERV|ADMIN|CONTROL|OBSERV)/i.test(cleaned)) continue;
              const scored = typeof _mfPilotScoreCandidate === 'function' ? _mfPilotScoreCandidate(cleaned, {}) : null;
              if (!scored || !scored.text) continue;
              const score = scored.score + len;
              if (!best || score > best.score){ best = { text: scored.text, score }; }
            }
          }
          return best ? best.text : '';
        } catch(_){ return ''; }
      }

      // Robust pilot extractor: orchestrates multiple strategies and returns the best candidate (synchronous).
      window._mfExtractPilotRobust = function(text){
        try {
          if (!text || String(text||'').trim().length < 6) return '';
          const candidates = [];
          const seen = new Set();
          const push = (raw, why, bonusScore, opts)=>{
            try {
              let sanitized = _mfPilotSanitizeRawCandidate(raw);
              if (!sanitized) return;
              const cand = typeof _mfPilotScoreCandidate === 'function' ? _mfPilotScoreCandidate(sanitized, opts||{}) : null;
              if (!cand || !cand.text) return;
              const key = cand.text.trim();
              if (!key) return;
              const totalScore = (cand.score || 0) + (Number(bonusScore)||0);
              if (seen.has(key)){
                const existing = candidates.find(item => item.v === key);
                if (existing && totalScore > existing.score){ existing.score = totalScore; existing.why = why; }
                return;
              }
              seen.add(key);
              candidates.push({ v: key, why: why||'', score: totalScore });
            } catch(_){ }
          };
          // 1) Direct block (strong)
          try {
            const d = (window._mfExtractPilotDirectBlock?.(text) || '').trim();
            if (d) push(d, 'direct-block', d.replace(/[^A-ZÁÉÍÓÚÑ]/gi,'').length + 40, { sameLine: true });
          } catch(_){ }
          // 2) Existing near-label heuristic
          try {
            const n = (window._mfExtractPilotUpperNearLabel?.(text) || '').trim();
            if (n) push(n, 'near-label', n.replace(/[^A-ZÁÉÍÓÚÑ]/gi,'').length + 18, { sameLine: true });
          } catch(_){ }
          // 3) Label-following lines: simple synchronous scan of lines after label
          try {
            const lines = (text||'').split(/\r?\n/).map(l=> l.replace(/[\u2013\u2014]/g,' ').replace(/[\u00A0]/g,' ').trim()).filter(Boolean);
            const labelRx = /PILOTO\s*AL\s*MANDO|NOMBRE\s*DEL\s*COMANDANTE|COMANDANTE|PILOTO\s*COMANDANTE|CAPITAN|CAPIT[ÁA]N|PILOTO/i;
            for (let i=0;i<lines.length;i++){
              if (labelRx.test(lines[i])){
                for (let k=0;k<=4;k++){
                  const cand = (lines[i+k+1]||'').trim();
                  if (!cand) continue;
                  if (/NOMBRE\s+DEL\s+COMANDANTE|FIRMA|CARACTERES?\s+ALFANUMERICO/i.test(cand)) break;
                  const words = cand.split(/\s+/).filter(Boolean);
                  if (words.length >= 2 && cand.replace(/[^A-ZÁÉÍÓÚÑa-záéíóúñ]/g,'').length >= 6){
                    const isUpper = /^[^a-z]*[A-ZÁÉÍÓÚÑ\s'’\-]+$/.test(cand);
                    push(cand, 'label-follow', (isUpper?40:14) + (words.length*6), { distance:k+1 });
                    break;
                  }
                }
              }
            }
          } catch(_){ }
          // 4) Uppercase-looking lines near pilot-related words
          try {
            const lines = (text||'').split(/\r?\n/).map(l=> l.replace(/[\u2013\u2014]/g,' ').trim());
            for (let i=0;i<lines.length;i++){
              const l = lines[i] || '';
              if (!l) continue;
              const words = l.split(/\s+/).filter(Boolean);
              if (words.length >= 2 && words.length <= 5){
                const letterCount = l.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length;
                if (letterCount >= 6){
                  const neigh = (()=>{ for (let d=-6; d<=6; d++){ if (d===0) continue; const j = i + d; if (j<0 || j>=lines.length) continue; if (/PILOTO|MANDO|COMANDANTE|CAPITAN|PILOTO AL MANDO|NOMBRE DEL COMANDANTE/i.test(lines[j])) return Math.abs(d); } return null; })();
                  if (neigh !== null){
                    const isUpper = /^[^a-z]*[A-ZÁÉÍÓÚÑ\s'’\-]+$/.test(l);
                    push(l, 'upper-near', (isUpper?30:8) + (10 - Math.min(9, neigh)) + (words.length*4), { distance: neigh });
                  }
                }
              }
            }
          } catch(_){ }
          if (!candidates.length){
            try {
              const direct = _mfPilotPickAfterMando(text || '');
              if (direct) push(direct, 'after-mando', 60, { sameLine: true });
            } catch(_){ }
          }
          if (!candidates.length){
            try {
              const grab = /MANDO\s+([A-ZÁÉÍÓÚÑ'’\-\s]{4,})/i.exec(text || '');
              if (grab && grab[1]){
                let span = grab[1].replace(/\s+/g,' ').trim();
                span = span.replace(/\bLIC(?:\.?|ENCIA)?\b.*$/i,' ');
                const rescued = _mfPilotSanitizeRawCandidate(span);
                if (rescued) push(rescued, 'regex-after-mando', 58, { sameLine: true });
              }
            } catch(_){ }
          }
          if (!candidates.length){
            try {
              const generic = _mfPilotFindFallbackInText(text || '');
              if (generic) push(generic, 'generic-fallback', 22, {});
            } catch(_){ }
          }
          candidates.sort((a,b)=> b.score - a.score);
          if (candidates.length){ try { console.log('mf: pilot candidates', candidates.slice(0,6)); } catch(_){}; return candidates[0].v.trim(); }
          return '';
        } catch(_){ return ''; }
      };

      function normalizeTextSimple1(s){ return (s||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
      function matchAirlineByName1(text){
        try {
          const T = normalizeTextSimple1(text);
          let best = null; let bestLen = 0;
          for (const a of (airlinesCatalog||[])){
            const name = (a && a.Name) ? a.Name : '';
            if (!name) continue;
            const N = normalizeTextSimple1(name);
            if (!N) continue;
            if (T.includes(N) && N.length > bestLen){ best = a; bestLen = N.length; }
          }
          return best; // { IATA, ICAO, Name } o null
        } catch(_) { return null; }
      }
      function resolveCarrierICAO1(text, opts={}){
        const cand = [];
        const add = (code, score, why)=>{ if (!code || !/^[A-Z]{3}$/.test(code)) return; if (!icaoSet || !icaoSet.has(code)) return; cand.push({ code, score, why }); };
        try {
          const flight = (opts.flight||'').toString();
          if (flight){
            const cleaned = flight.replace(/\s|-/g,'').toUpperCase();
            const pref3 = cleaned.slice(0,3); const pref2 = cleaned.slice(0,2);
            if (pref3 && icaoSet.has(pref3)) add(pref3, 90, 'flight-icao');
            if (pref2 && iataToIcao.has(pref2)) add(iataToIcao.get(pref2)||'', 80, 'flight-iata');
          }
          const labHit = findNearLabelValue(['TRANSPORTISTA','OPERADOR','OPERADOR AEREO','OPERADOR AÉREO','CARRIER','AIRLINE'], /\b[A-Z]{3}\b/, text);
          if (labHit){ const code = (labHit||'').toUpperCase(); add(code, 85, 'label'); }
          const tokens = tokenizeUpper(text);
          for (const t of tokens){ if (t.length===3 && /^[A-Z]{3}$/.test(t) && icaoSet.has(t)) add(t, 35, 'token'); }
          const byName = matchAirlineByName1(text); if (byName && byName.ICAO) add(byName.ICAO, 75, 'name');
          const ownerIATA = (opts.ownerIATA||'').toString().toUpperCase(); if (ownerIATA && iataToIcao.has(ownerIATA)) add(iataToIcao.get(ownerIATA)||'', 100, 'owner');
        } catch(_){}
        if (!cand.length) return null;
        cand.sort((a,b)=> b.score - a.score);
        return cand[0];
      }
      function findNearLabelIATACode(labels, text){
        const rxIATA = /\b[A-Z]{3}\b/g;
        try{
          const lines = (text||'').split(/\r?\n/);
          const hasCatalog = !!(iataSet && typeof iataSet.has === 'function' && iataSet.size > 0);
          const isValid = (c)=>{
            if (!/^[A-Z]{3}$/.test(c)) return false;
            if (iataStopwords && iataStopwords.has(c)) return false;
            return hasCatalog ? iataSet.has(c) : true;
          };
          // Pista alternativa: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior como candidata
          for (let i=0;i<lines.length;i++){
            if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(lines[i])){
              const arr = ((lines[i-1]||'').match(rxIATA)||[]);
              const hit = arr.find(isValid);
              if (hit) return hit;
            }
          }
        }catch(_){ }
        return '';
      }

      // Extracción exhaustiva de FOLIO (prioriza números) tolerante a OCR y saltos de línea
      window._mfExtractFolioExhaustive = function(text){
        try {
          const rawLines = (text||'').toString().split(/\r?\n/);
          const lines = rawLines.map(l=> l || '');
          const rxFOLIO = /\bF[O0]L[I1]O\b/i;
          const rxNo = /\bN[O0]\.\?\b|\bN[º°]|#/i;
          const normalize = (s)=> (s||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,'');
          const canonHasFolio = (s)=> {
            const c = normalize(s);
            return c.includes('FOLIO') || c.includes('NOFOLIO') || rxFOLIO.test(s);
          };
          const isDateLike = (s)=> /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/.test(s||'');
          const collapseDigits = (chunk)=> (chunk||'').toString().replace(/[^0-9]/g,'');
          const collectWindow = (idx)=>{
            const span = [];
            for (let k=-1;k<=4;k++){ span.push(lines[idx+k]||''); }
            return span.join(' ');
          };
          function extractFromSpan(span){
            if (!span) return '';
            const direct = span.match(/F[O0]L[I1]O[^0-9]{0,14}([0-9\s\-]{3,36})/i);
            if (direct){
              const immediate = (direct[1]||'').match(/\d{3,10}/);
              if (immediate && immediate[0]) return immediate[0].slice(0,14);
              const dig = collapseDigits(direct[1]);
              if (dig.length >= 3) return dig.slice(0,14);
            }
            const after = span.replace(/^.*?F[O0]L[I1]O[^A-Z0-9]{0,14}/i, '');
            const parts = after.split(/\s+/).filter(Boolean);
            const chunks = [];
            let started = false;
            let totalLen = 0;
            for (let idx=0; idx<parts.length; idx++){
              const rawTok = parts[idx];
              const tok = rawTok.replace(/[•·,:;=]/g,'').trim();
              if (!tok) continue;
              if (/^(FECHA|AEROPUERTO|VUELO|ORIGEN|DESTINO|HORA|TIPO)$/i.test(tok)) break;
              if (/^N[O0]\.?$/i.test(tok)) { started = true; continue; }
              if (isDateLike(tok)) continue;
              if (/\d:\d/.test(tok)) continue;
              const digits = collapseDigits(tok);
              if (!digits){ if (started) break; continue; }
              started = true;
              chunks.push({ digits, idx });
              totalLen += digits.length;
              if (totalLen >= 10) break;
            }
            if (chunks.length){
              let combined = chunks.map(c=>c.digits).join('');
              if (chunks.length >= 2) {
                const firstDigits = chunks[0].digits;
                const dayVal = parseInt(firstDigits, 10);
                if (!Number.isNaN(dayVal) && dayVal >= 1 && dayVal <= 31 && firstDigits.length <= 2) {
                  const tail = chunks.slice(1).map(c=>c.digits).join('');
                  if (tail.length >= 3 && (firstDigits.length === 2 || tail.length >= 4)) {
                    combined = tail;
                  }
                }
              }
              if (combined.length >= 3) return combined.slice(0,14);
            }
            const splitDay = after.match(/\b(0[1-9]|[12][0-9]|3[01])\D+(\d{3,8})\b/);
            if (splitDay && splitDay[2]) return splitDay[2].slice(0,14);
            const fallback = collapseDigits(after);
            if (fallback.length >= 4) return fallback.slice(0,14);
            return '';
          }
          const seen = new Set();
          const pushCandidate = (val)=>{
            const d = collapseDigits(val);
            if (!d || d.length < 3) return '';
            if (seen.has(d)) return '';
            seen.add(d);
            return d.slice(0,14);
          };
          const N = Math.min(60, lines.length);
          for (let i=0;i<N;i++){
            const ln = lines[i];
            if (canonHasFolio(ln) || (rxNo.test(ln) && canonHasFolio(lines[i+1]||''))){
              const out = extractFromSpan(collectWindow(i));
              if (out) return pushCandidate(out) || out;
            }
          }
          for (let i=0;i<lines.length;i++){
            if (!canonHasFolio(lines[i])) continue;
            const out = extractFromSpan(collectWindow(i));
            if (out) return pushCandidate(out) || out;
          }
          const global = (text||'').match(/F[O0]L[I1]O[^0-9]{0,16}([0-9\s\-/]{3,40})/i);
          if (global){
            const dig = collapseDigits(global[1]);
            if (dig.length >= 4) return dig.slice(0,14);
          }
          const M = Math.min(35, lines.length);
          for (let i=0;i<M;i++){
            const ln = lines[i];
            if (canonHasFolio(ln)) continue;
            if (isDateLike(ln) || /\d:\d/.test(ln)) continue;
            const digits = collapseDigits(ln);
            if (digits.length >= 6){
              const maybe = digits.slice(0,14);
              if (!/^20\d{2}(?:0[1-9]|1[0-2])/.test(maybe)) return maybe;
            }
          }
          return '';
        } catch(_){ return ''; }
      };
      window._mfExtractFolioDigitsSmart = function(text){
        try {
          const raw = (text||'').toString();
          if (!raw.trim()) return '';
          const normalizeDigits = (val)=> (val||'').replace(/\D/g,'');
          const stripLeadingDate = (digits)=>{
            if (!digits || digits.length < 7) return digits||'';
            const trimmed = digits.replace(/^(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}/, '');
            if (trimmed && trimmed.length >= 3) return trimmed;
            return digits;
          };
          const resolveDaySplit = (digits)=>{
            if (!digits || digits.length < 4) return digits || '';
            const tests = [];
            if (digits.length >= 5) tests.push({ prefix: digits.slice(0, 2), suffix: digits.slice(2) });
            tests.push({ prefix: digits.slice(0, 1), suffix: digits.slice(1) });
            for (const t of tests){
              const val = parseInt(t.prefix, 10);
              if (Number.isNaN(val) || val < 1 || val > 31) continue;
              if (!t.suffix || t.suffix.length < 3) continue;
              const rx = new RegExp(`F[O0]L[I1]O[^0-9]{0,24}${t.prefix}[^0-9]{1,6}${t.suffix}`, 'i');
              if (rx.test(raw)) return t.suffix;
            }
            return digits;
          };
          const baseRaw = normalizeDigits(window._mfExtractFolioExhaustive?.(raw) || '');
          let base = stripLeadingDate(baseRaw);
          const dateRx = /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi;
          const timeRx = /\b\d{1,2}:\d{2}\b/g;
          const compactDateRx = /\b(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}\b/g;
          const lines = raw.split(/\r?\n/);
          const candidates = [];
          let prevLabel = false;
          lines.forEach((line, idx)=>{
            if (!line){ prevLabel = false; return; }
            const hasLabel = /F[O0]L[I1]O/i.test(line);
            let cleaned = line.replace(dateRx,' ').replace(timeRx,' ').replace(compactDateRx,' ');
            const matches = cleaned.match(/\b\d{3,14}\b/g);
            if (matches){
              matches.forEach(tok=>{
                const digits = normalizeDigits(tok);
                if (!digits || digits.length < 3) return;
                if (/^20\d{6}$/.test(digits) || /^20\d{2}(0[1-9]|1[0-2])\d{2}$/.test(digits)) return;
                candidates.push({ digits, len: digits.length, hasLabel, prevLabel, idx });
              });
            }
            prevLabel = hasLabel;
          });
          let best = '';
          let bestScore = -Infinity;
          candidates.forEach(c=>{
            let score = 0;
            if (c.hasLabel) score += 8;
            if (c.prevLabel) score += 5;
            if (c.len === 4) score += 6;
            else if (c.len === 5) score += 5;
            else if (c.len === 6) score += 4;
            else if (c.len === 3) score += 3;
            else if (c.len > 8) score -= 3;
            if (c.len >= 5 && /^(0[1-9]|[12][0-9]|3[01])/.test(c.digits)) score -= 2;
            score += Math.max(0, 3 - c.idx);
            if (score > bestScore){ best = c.digits; bestScore = score; }
          });
          if (best) {
            const refined = resolveDaySplit(stripLeadingDate(best));
            if (refined) return refined.slice(0,10);
          }
          if (base){
            base = resolveDaySplit(stripLeadingDate(base));
            if (base.length > 8){
              const tail = base.slice(-6);
              if (tail.length >= 3) return tail;
            }
            if (base.length >= 3) return base.slice(0,10);
          }
          const globalMatches = raw.replace(dateRx,' ').replace(timeRx,' ').replace(compactDateRx,' ').match(/\b\d{3,14}\b/g);
          if (globalMatches){
            for (let i=globalMatches.length-1; i>=0; i--){
              const digits = resolveDaySplit(stripLeadingDate(normalizeDigits(globalMatches[i])));
              if (digits.length >=3 && digits.length <=10) return digits;
            }
          }
          return '';
        } catch(_){ return ''; }
      };
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
          if (location && location.protocol === 'file:') return; // skip fetch under file:// to avoid errors
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
          if (location && location.protocol === 'file:') return; // skip fetch under file:// to avoid errors
          const resA = await fetch('data/master/aircraft.csv', { cache:'no-store' });
          const textA = await resA.text();
          const linesA = textA.split(/\r?\n/).filter(l=>l.trim());
          const regOptions = new Set();
          for (let i=1;i<linesA.length;i++){
            const row = linesA[i];
            const parts = row.split(',');
            if (parts.length < 3) continue;
            const reg = (parts[0]||'').trim().toUpperCase();
            const type = (parts[1]||'').trim().toUpperCase();
            const ownerIATA = (parts[2]||'').trim().toUpperCase();
            if (reg) {
              aircraftByReg.set(reg, { type, ownerIATA });
              for (const v of regDisplayVariants(reg)) regOptions.add(v);
            }
          }
          const dlReg = document.getElementById('aircraft-reg-list');
          if (dlReg) dlReg.innerHTML = Array.from(regOptions).sort().map(v=>`<option value="${v}"></option>`).join('');
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
            if (icao) { typeOptions.push(`<option value="${icao}">${name?name:''}</option>`); typeIcaoSet.add(icao); if (name) icaoToTypeName.set(icao, name); }
          }
          const dlType = document.getElementById('aircraft-type-icao-list');
          if (dlType) dlType.innerHTML = typeOptions.join('');
        } catch(e){ console.warn('No se pudo cargar aircraft type.csv', e); }
      }
      function extractAircraftTypeICAOFromText(text){
        try {
          const U = (text||'').toUpperCase();
          const lines = (text||'').split(/\r?\n/);
          const labels = ['EQUIPO','TIPO','TIPO DE AERONAVE','AIRCRAFT TYPE'];
          const cand = new Map();
          const add = (code, score)=>{ const c=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''); if (!c) return; cand.set(c, Math.max(cand.get(c)||0, score)); };
          const pushNear = (s, base)=>{
            const toks = (s||'').toUpperCase().match(/[A-Z0-9-]{2,9}/g) || [];
            for (const t of toks){
              const clean = t.replace(/-/g,'');
              if (/^[A-Z0-9]{3,4}$/.test(clean) && typeIcaoSet.has(clean)) add(clean, base);
              if (/^[A-Z0-9]{2,3}$/.test(clean) && typeByCode.has(clean)){
                const ic = (typeByCode.get(clean)?.ICAO)||''; if (ic) add(ic, base-5);
              }
              if (/^B737[0-9]$/.test(clean)) add('B73'+clean.slice(-1), base-10);
              if (/^A32[0-1][0-9]$/.test(clean)) add('A32'+clean.slice(-1), base-10);
            }
            // Family/variant regexes (composite tokens like A330-300 P2F)
            const S = (s||'').toUpperCase();
            if (/\bA330\s*[- ]?\s*300\b/.test(S) || /\bA333\b/.test(S)) add('A333', base+2);
            if (/\bA330\s*[- ]?\s*200\b/.test(S) || /\bA332\b/.test(S)) add('A332', base+2);
            // Minor bump if P2F appears with A330
            if (/\bA330\b/.test(S) && /\bP2F\b/.test(S)){
              if (/\b300\b/.test(S)) add('A333', base+3);
              if (/\b200\b/.test(S)) add('A332', base+3);
            }
          };
          for (let i=0;i<lines.length;i++){
            const u = (lines[i]||'').toUpperCase();
            if (labels.some(l=> u.includes(l))){
              pushNear(lines[i], 90);
              if (lines[i+1]) pushNear(lines[i+1], 85);
              if (lines[i+2]) pushNear(lines[i+2], 75);
            }
          }
          const global = U.match(/[A-Z0-9]{3,4}/g)||[];
          for (const g of global){ if (typeIcaoSet.has(g)) add(g, 50); }
          // Global composite patterns
          if (/\bA330\s*[- ]?\s*300\b/.test(U)) add('A333', 55);
          if (/\bA330\s*[- ]?\s*200\b/.test(U)) add('A332', 55);
          if (!cand.size) return '';
          return Array.from(cand.entries()).sort((a,b)=> b[1]-a[1])[0][0] || '';
        } catch(_) { return ''; }
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
                else { inQuotes = !inQuotes; }
              } else if (ch===',' && !inQuotes){ cols.push(cur); cur=''; }
              else { cur+=ch; }
            }
            cols.push(cur); return cols;
          }
          airportByIATA.clear();
          airportByName.clear();
          iataSet.clear();
          airportMetaByIATA.clear();
          airportByICAO.clear();
          airportMetaByICAO.clear();
          icaoToIata.clear();
          const optsIATA = [], optsName = [];
          for (let i=1;i<lines.length;i++){
            const parts = parseCSVLine(lines[i]);
            if (parts.length < 3) continue;
            const IATA = (parts[0]||'').trim().toUpperCase();
            const ICAO = (parts[1]||'').trim().toUpperCase();
            const Name = (parts[2]||'').trim().replace(/^\"|\"$/g,'');
            const Country = (parts[3]||'').trim();
            const Security = (parts[5]||'').trim();
            if (!IATA || !Name) continue;
            airportByIATA.set(IATA, Name);
            airportByName.set(Name.toLowerCase(), IATA);
            iataSet.add(IATA);
            try {
              if ((Country||'').toString().trim().toUpperCase() === MEXICO_COUNTRY_NAME){ MEXICO_IATA_FALLBACK.add(IATA); }
            } catch(_){ }
            try { airportMetaByIATA.set(IATA, { name: Name, country: Country, security: Security }); } catch(_){ }
            if (ICAO){
              try { airportByICAO.set(ICAO, Name); } catch(_){ }
              try { icaoToIata.set(ICAO, IATA); } catch(_){ }
              try { airportMetaByICAO.set(ICAO, { name: Name, country: Country, security: Security, iata: IATA }); } catch(_){ }
            }
            optsIATA.push(`<option value="${IATA}">${Name}</option>`);
            optsName.push(`<option value="${Name}">${IATA}</option>`);
          }
          const dlIATA = document.getElementById('airports-iata-list');
          const dlName = document.getElementById('airports-name-list');
          if (dlIATA) dlIATA.innerHTML = optsIATA.join('');
          if (dlName) dlName.innerHTML = optsName.join('');
          try {
            window.airportByIATA = airportByIATA;
            window.airportByName = airportByName;
            window.airportMetaByIATA = airportMetaByIATA;
            window.airportByICAO = airportByICAO;
            window.airportMetaByICAO = airportMetaByICAO;
            window.icaoToIata = icaoToIata;
          } catch(_){ }
          // Recalcular Tipo de Operación tras cargar catálogo
          try { if (typeof window._mfComputeOperationType === 'function') window._mfComputeOperationType(); } catch(_){ }
        } catch(e){
          console.warn('No se pudo cargar airports.csv', e);
          try {
            if (MEXICO_IATA_FALLBACK && typeof MEXICO_IATA_FALLBACK.forEach === 'function'){
              const opts = [];
              MEXICO_IATA_FALLBACK.forEach(code=>{
                const c = (code||'').toUpperCase(); if (!c) return;
                if (!airportByIATA.has(c)) airportByIATA.set(c, c);
                if (!airportByName.has(c.toLowerCase())) airportByName.set(c.toLowerCase(), c);
                if (!airportMetaByIATA.has(c)) airportMetaByIATA.set(c, { name:c, country:'Mexico', security:'' });
                opts.push(`<option value="${c}">${c}</option>`);
              });
              const dlIATA = document.getElementById('airports-iata-list');
              if (dlIATA && !dlIATA.innerHTML) dlIATA.innerHTML = opts.join('');
            }
          } catch(_){ }
          try {
            window.airportByIATA = airportByIATA;
            window.airportByName = airportByName;
            window.airportMetaByIATA = airportMetaByIATA;
            window.airportByICAO = airportByICAO;
            window.airportMetaByICAO = airportMetaByICAO;
            window.icaoToIata = icaoToIata;
          } catch(_){ }
        }
      }

      function applyManifestDirection(){
        const isArrival = dirArr && dirArr.checked;
        document.querySelectorAll('[data-dir="arrival-only"]').forEach(el => { el.style.display = isArrival ? '' : 'none'; });
        document.querySelectorAll('[data-dir=\"departure-only\"]').forEach(el => { el.style.display = isArrival ? 'none' : ''; });
        // Campos comunes y específicos
        const dest = document.getElementById('mf-final-dest');
        const destCode = document.getElementById('mf-final-dest-code');
        const originName = document.getElementById('mf-origin-name');
        const originCode = document.getElementById('mf-origin-code');
        const nextStopCode = document.getElementById('mf-next-stop-code');
        const airportMain = document.getElementById('mf-airport-main');

        const arrOriginName = document.getElementById('mf-arr-origin-name');
        const arrOriginCode = document.getElementById('mf-arr-origin-code');
        const arrSlotAssigned = document.getElementById('mf-arr-slot-assigned');
        const arrSlotCoordinated = document.getElementById('mf-arr-slot-coordinated');
        const arrLastStop = document.getElementById('mf-arr-last-stop');
        const arrLastStopCode = document.getElementById('mf-arr-last-stop-code');
        const arrArriboPos = document.getElementById('mf-arr-arribo-posicion');
        const arrInicioDes = document.getElementById('mf-arr-inicio-desembarque');
        const arrInicioPernocta = document.getElementById('mf-arr-inicio-pernocta');

        // Reglas: En LLEGADA, hacer obligatorios los campos de la sección Llegada; en Salida, quitar obligatoriedad.
        if (isArrival){
          if (airportMain) airportMain.required = true;
          [arrOriginName, arrOriginCode, arrSlotAssigned, arrSlotCoordinated, arrLastStop, arrLastStopCode, arrArriboPos, arrInicioDes, arrInicioPernocta]
            .forEach(el => { if (el) el.required = true; });
          // En salida no son obligatorios
          [originName, originCode, nextStopCode, dest, destCode].forEach(el => { if (el) el.required = false; });
        } else {
          if (airportMain) airportMain.required = false;
          [arrOriginName, arrOriginCode, arrSlotAssigned, arrSlotCoordinated, arrLastStop, arrLastStopCode, arrArriboPos, arrInicioDes, arrInicioPernocta]
            .forEach(el => { if (el) el.required = false; });
          // Para salidas, mantener reglas actuales (no imponemos nuevos requeridos aquí)
          [originName, originCode].forEach(el => { if (el) el && (el.required = true); });
          [nextStopCode].forEach(el => { if (el) el.required = false; });
          [dest, destCode].forEach(el => { if (el) el && (el.required = true); });
        }

        const title = document.getElementById('mf-title');
        if (title){
          if (isArrival){
            title.value = 'MANIFIESTOS DE LLEGADA';
            title.readOnly = true; title.dataset.locked = '1';
          } else {
            // mantener editable en salida
            title.readOnly = false; title.dataset.locked = '';
          }
        }
        try {
          const ht = document.querySelector('.mf-header-title');
          if (ht) ht.textContent = isArrival ? 'Manifiesto de Llegada' : 'Manifiesto de Salida';
          const labMain = document.getElementById('mf-airport-main-label');
          if (labMain) labMain.textContent = isArrival ? 'Aeropuerto de Llegada' : 'Aeropuerto de Salida';
        } catch(_){ }

        forceAirportMainValue();

        // Reglas específicas de valores para salidas
        try {
          if (!isArrival){
            // No usar 'N/A' en inputs de tiempo; dejarlos vacíos
            const slotCoord = document.getElementById('mf-slot-coordinated'); if (slotCoord) { slotCoord.value = ''; slotCoord.setCustomValidity(''); }
            const terminoPernocta = document.getElementById('mf-termino-pernocta'); if (terminoPernocta) { terminoPernocta.value = ''; terminoPernocta.setCustomValidity(''); }
          }
        } catch(_){ }
      }
      if (dirArr && !dirArr._wired) { dirArr._wired = 1; dirArr.addEventListener('change', applyManifestDirection); }
      if (dirDep && !dirDep._wired) { dirDep._wired = 1; dirDep.addEventListener('change', applyManifestDirection); }
      applyManifestDirection();

  loadAirlinesCatalog();
  loadAircraftCatalog();
  loadAirportsCatalog();
  loadDelayCatalog();

      // Catálogo: Tipo de vuelo (flightservicetype.csv)
      window._initFlightServiceType = function initFlightServiceType(){
        // LOCK NOTICE (Manifiestos): Ajuste solicitado para usar 'mf-flight-type' como input de Aeropuerto de llegada.
        // No modificar más esta sección salvo instrucciones específicas del usuario.
        const sel = document.getElementById('mf-flight-type');
        const info = document.getElementById('mf-flight-type-info');
        if (!sel) return;
        const captureCatalog = (list)=>{
          try {
            if (!Array.isArray(list)) return;
            const catalog = list.filter(Boolean).map(row=> ({
              Code: (row['Code']||'').toString().toUpperCase().slice(0,1),
              Category: row['Category']||'',
              Type: row['Type of operation']||row['Type']||'',
              Description: row['Description']||''
            })).filter(row=> row.Code);
            window.flightServiceTypeCatalog = catalog;
            window.flightServiceTypeCodes = new Set(catalog.map(row=> row.Code));
            const stopwords = new Set(['DE','DEL','LA','EL','LOS','LAS','THE','OF','AND','NOT','SPECIFIC','SERVICE','OPERATED','BY','FLIGHTS','FLIGHT','PASSENGER','CARGO','MAIL','MODE','ONLY','NORMAL','TEST','STATE','DIPLOMATIC','STATE/DIPLOMATIC','AIR','AMBULANCE','TRAINING','CHECK','BUSINESS','AVIATION','SPECIAL','HANDLING','NON-REVENUE','POSITIONING','FERRY','DELIVERY','DEMO','TECHNICAL','STOP','INTERNAL','PURPOSES','MILITARY','SHUTTLE','VEHICLE']);
            const norm = (s)=> (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/gi,' ').toLowerCase();
            const infoMap = new Map();
            catalog.forEach(row=>{
              const text = `${row.Description} ${row.Type} ${row.Category}`;
              const toks = norm(text).split(/[^a-z0-9]+/).filter(tok=> tok && tok.length >= 3 && !stopwords.has(tok.toUpperCase()));
              infoMap.set(row.Code, {
                tokens: Array.from(new Set(toks)),
                textNorm: norm(text)
              });
            });
            window.flightServiceTypeInfoByCode = infoMap;
          } catch(_){ }
        };
        // Si el elemento NO es un <select>, lo tratamos como input para 'Tipo de vuelo' (códigos A–Z con descripción).
        if (String(sel.tagName||'').toUpperCase() !== 'SELECT'){
          try {
            sel.setAttribute('maxlength','1');
            sel.setAttribute('pattern','[A-Za-z]');
            sel.style.textTransform = 'uppercase';
            if (!sel.getAttribute('list')) sel.setAttribute('list','flight-type-list');
            if (!sel.getAttribute('placeholder')) sel.setAttribute('placeholder','Escribe la letra del tipo (A–Z)');
          } catch(_){ }
          const dl = document.getElementById('flight-type-list');
          function parseCSV(text){
            const rows=[]; let i=0, s=text||''; let field=''; let row=[]; let inQ=false;
            while(i<s.length){
              const ch=s[i++];
              if(inQ){
                if(ch==='"'){
                  if(s[i]==='"'){ field+='"'; i++; } else { inQ=false; }
                } else { field+=ch; }
              } else {
                if(ch==='"') inQ=true;
                else if(ch===','){ row.push(field); field=''; }
                else if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; }
                else if(ch==='\r'){ /* ignore */ }
                else { field+=ch; }
              }
            }
            if (field.length>0 || row.length>0){ row.push(field); rows.push(row); }
            return rows;
          }
          function rowsToObjects(rows){ if(!rows||!rows.length) return []; const headers=rows[0].map(h=>String(h||'').trim()); return rows.slice(1).map(r=>{ const o={}; headers.forEach((h,idx)=> o[h]= (r[idx]||'').toString().trim()); return o; }); }
          function labelFor(row){
            const code=(row['Code']||'').toUpperCase();
            const desc=row['Description']||'';
            const op=row['Type of operation']||'';
            const cat=row['Category']||'';
            const details = [desc, op, cat].filter(Boolean).join(' · ');
            return details ? `${code} — ${details}` : code;
          }
          function updateInfo(o){
            if (!info) return; if (!o){ info.textContent=''; return; }
            const op = o['Type of operation']||''; const desc=o['Description']||''; const cat=o['Category']||'';
            info.innerHTML = `${cat?`<span class="badge bg-secondary me-1">${cat}</span>`:''}${op}${(op&&desc)?' — ':''}${desc}`;
          }
          const FALLBACK_FST_CSV = `Code,Category,Type of operation,Description
A,Additional flights,"Cargo,Mail",Cargo/Mail
B,Additional flights,Passenger,Shuttle Mode
C,Charter,Passenger,Passenger Only
D,Others,Not specific,General Aviation
E,Others,Not specific,Test
F,Scheduled,"Cargo,Mail",Loose Loaded cargo and/or preloaded devices
G,Additional flights,Passenger,Normal Service
H,Charter,"Cargo,Mail",Cargo and /or Mail
I,Others,Not specific,State/Diplomatic/Air Ambulance
J,Scheduled,Passenger,Normal Service
K,Others,Not specific,Training (School/Crew check)
L,Charter,"Cargo,Mail,Passenger",Passenger/Cargo/Mail
M,Scheduled,"Cargo,Mail",Mail only
N,Others,Not specific,Business Aviation/Air Taxi
O,Charter,Special handling,Charter requiring special handling(e.g. Migrants/immigrant Flights)
P,Others,Not specific,Non-revenue(Positioning/Ferry/Delivery/Demo
Q,Scheduled,"Passenger,Cargo",Passenger/Cargo in Cabin (mixed configuration aircraft)
R,Additional flights,"Passenger,Cargo",Passenger/Cargo in Cabin (mixed configuration aircraft)
S,Scheduled,Passenger,Shuttle Mode
T,Others,Not specific,Technical Test
U,Scheduled,Passenger,Service operated by Surface Vehicle
V,Scheduled,"Cargo,Mail",Service operated by Surface Vehicle
W,Others,Not specific,Military
X,Others,Not specific,Technical Stop
Y,Others,Not specific,Special internal purposes
Z,Others,Not specific,Special internal purposes`;
          function fillDatalist(list){
            if (!dl) return;
            dl.innerHTML = '';
            list.forEach(row=>{
              const code=(row['Code']||'').toUpperCase(); if (!code) return;
              const opt = document.createElement('option');
              opt.value = code; // input almacena la letra
              const label = labelFor(row);
              opt.setAttribute('label', label);
              opt.textContent = label;
              try { opt.text = label; } catch(_){ }
              dl.appendChild(opt);
            });
          }
          function normalizeCode(v){ return (v||'').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,1); }
          function wireInput(list){
            const byCode = new Map(); list.forEach(r=>{ const c=(r['Code']||'').toUpperCase(); if (c) byCode.set(c, r); });
            if (!sel._wiredFlightTypeInput){
              sel._wiredFlightTypeInput = 1;
              sel.addEventListener('input', ()=>{
                const v = normalizeCode(sel.value);
                if (sel.value !== v) sel.value = v;
                const rec = byCode.get(v) || null;
                updateInfo(rec);
              });
            }
            // Inicializa info
            const rec0 = byCode.get(normalizeCode(sel.value)) || null; updateInfo(rec0);
          }
          function boot(list){ fillDatalist(list); wireInput(list); }
          // Cargar CSV
          fetch('data/master/flightservicetype.csv', { cache: 'no-store' })
            .then(r=> r.ok ? r.text() : Promise.reject(new Error('HTTP '+r.status)))
            .then(txt=> rowsToObjects(parseCSV(txt)))
            .then(list=>{ if (!list || !list.length) throw new Error('Empty CSV'); captureCatalog(list); boot(list); })
            .catch(()=>{ try { const list = rowsToObjects(parseCSV(FALLBACK_FST_CSV)); captureCatalog(list); boot(list); } catch(_){ /* no-op */ } });
          return;
        }
        // Si ya hay opciones manuales en el HTML (más de 1 además del placeholder), solo cablear eventos y salir
        const hasManual = sel.options && sel.options.length > 1;
        function wireOnly(){
          if (!sel._wiredFlightType){
            sel._wiredFlightType = 1;
            sel.addEventListener('change', ()=>{
              const v = sel.value;
              const opt = sel.selectedOptions && sel.selectedOptions[0];
              if (!v || !opt){ if (info) info.textContent=''; return; }
              const cat = opt.getAttribute('data-category')||'';
              const op  = opt.getAttribute('data-operation')||'';
              const des = opt.getAttribute('data-description')||'';
              if (info) info.innerHTML = `${cat?`<span class="badge bg-secondary me-1">${cat}</span>`:''}${op}${(op&&des)?' — ':''}${des}`;
            });
          }
          sel.value = '';
          if (info) info.textContent = '';
        }
        if (hasManual){ wireOnly(); return; }
        // Fallback CSV (para entorno file:// o si falla fetch)
        const FALLBACK_FST_CSV = `Code,Category,Type of operation,Description
A,Additional flights,"Cargo,Mail",Cargo/Mail
B,Additional flights,Passenger,Shuttle Mode
C,Charter,Passenger,Passenger Only
D,Others,Not specific,General Aviation
E,Others,Not specific,Test
F,Scheduled,"Cargo,Mail",Loose Loaded cargo and/or preloaded devices
G,Additional flights,Passenger,Normal Service
H,Charter,"Cargo,Mail",Cargo and /or Mail
I,Others,Not specific,State/Diplomatic/Air Ambulance
J,Scheduled,Passenger,Normal Service
K,Others,Not specific,Training (School/Crew check)
L,Charter,"Cargo,Mail,Passenger",Passenger/Cargo/Mail
M,Scheduled,"Cargo,Mail",Mail only
N,Others,Not specific,Business Aviation/Air Taxi
O,Charter,Special handling,Charter requiring special handling(e.g. Migrants/immigrant Flights)
P,Others,Not specific,Non-revenue(Positioning/Ferry/Delivery/Demo
Q,Scheduled,"Passenger,Cargo",Passenger/Cargo in Cabin (mixed configuration aircraft)
R,Additional flights,"Passenger,Cargo",Passenger/Cargo in Cabin (mixed configuration aircraft)
S,Scheduled,Passenger,Shuttle Mode
T,Others,Not specific,Technical Test
U,Scheduled,Passenger,Service operated by Surface Vehicle
V,Scheduled,"Cargo,Mail",Service operated by Surface Vehicle
W,Others,Not specific,Military
X,Others,Not specific,Technical Stop
Y,Others,Not specific,Special internal purposes
Z,Others,Not specific,Special internal purposes`;
        function parseCSV(text){
          const rows=[]; let i=0, s=text||''; let field=''; let row=[]; let inQ=false;
          while(i<s.length){
            const ch=s[i++];
            if(inQ){
              if(ch==='"'){
                if(s[i]==='"'){ field+='"'; i++; } else { inQ=false; }
              } else { field+=ch; }
            } else {
              if(ch==='"') inQ=true;
              else if(ch===','){ row.push(field); field=''; }
              else if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; }
              else if(ch==='\r'){ /* ignore */ }
              else { field+=ch; }
            }
          }
          if (field.length>0 || row.length>0){ row.push(field); rows.push(row); }
          return rows;
        }
        function rowsToObjects(rows){ if(!rows||!rows.length) return []; const headers=rows[0].map(h=>String(h||'').trim()); return rows.slice(1).map(r=>{ const o={}; headers.forEach((h,idx)=> o[h]= (r[idx]||'').toString().trim()); return o; }); }
        function updateInfo(o){
          if (!info) return;
          if (!o){ info.textContent=''; return; }
          const op = o['Type of operation']||o['Operacion']||'';
          const desc = o['Description']||'';
          const cat = o['Category']||'';
          info.innerHTML = `${cat?`<span class="badge bg-secondary me-1">${cat}</span>`:''}${op || ''}${(op&&desc)?' — ':''}${desc || ''}`;
        }
        const fillOptions = (list)=>{
          captureCatalog(list);
          // Reset options preserving the placeholder
          const keepFirst = sel.querySelector('option[value=""]');
          sel.innerHTML = '';
          sel.appendChild(keepFirst || new Option('Selecciona…',''));
          list.forEach(row=>{
            const code = (row['Code']||'').toUpperCase();
            if (!code) return;
            const cat = row['Category']||'';
            const op = row['Type of operation']||'';
            const desc = row['Description']||'';
            const details = [desc, op, cat].filter(Boolean).join(' · ');
            const label = details ? `${code} — ${details}` : code;
            const opt = new Option(label, code);
            opt.dataset.category = cat;
            opt.dataset.operation = op;
            opt.dataset.description = desc;
            sel.appendChild(opt);
          });
          // Wire change to show info
          if (!sel._wiredFlightType){
            sel._wiredFlightType = 1;
            sel.addEventListener('change', ()=>{
              const v = sel.value;
              const opt = sel.selectedOptions && sel.selectedOptions[0];
              if (!v || !opt){ updateInfo(null); return; }
              updateInfo({
                'Category': opt.dataset.category||'',
                'Type of operation': opt.dataset.operation||'',
                'Description': opt.dataset.description||''
              });
            });
          }
          // Ensure starts blank to force manual selection
          sel.value = '';
          updateInfo(null);
        };
  fetch('data/master/flightservicetype.csv', { cache: 'no-store' })
          .then(r=> r.ok ? r.text() : Promise.reject(new Error('HTTP '+r.status)))
          .then(txt=> rowsToObjects(parseCSV(txt)))
          .then(list=>{ if (!list || !list.length) throw new Error('Empty CSV'); captureCatalog(list); fillOptions(list); })
          .catch(()=>{
            try {
              // Fallback para file:// o error de red
              const list = rowsToObjects(parseCSV(FALLBACK_FST_CSV));
              captureCatalog(list);
              fillOptions(list);
              console.warn('Usando catálogo de Tipo de vuelo embebido (fallback). Para datos en vivo, abre el proyecto via http://');
            } catch(_){ /* mantener select manual con placeholder */ }
          });
      };
      // Ejecutar de inmediato dentro del setup
      try { window._initFlightServiceType(); } catch(_){ }

  function setPreview(src){ if (prevImg){ prevImg.src = src; prevImg.classList.remove('d-none'); } if (prevCanvas){ prevCanvas.classList.add('d-none'); } if (placeholder) placeholder.classList.add('d-none'); if (runBtn) runBtn.disabled = false; currentImageURL = src; }
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
            const { data } = await Tesseract.recognize(processed, 'spa+eng', { ...(_tessOpts||{}), logger: m => {}, tessedit_pageseg_mode: 6, user_defined_dpi: 300 });
            const text = (data && data.text) ? data.text.trim() : '';
            if (s) s.textContent = text ? ('Texto detectado (resumen):\n' + (text.slice(0,600)) + (text.length>600?'...':'')) : 'No se detectó texto.';
            const hasWord = hasWordFactory(text);
            const upperTokens = tokenizeUpper(text);
            const isArrivalDoc = hasWord('LLEGADA') || hasWord('ARRIVAL');
            const isDepartureDoc = hasWord('SALIDA') || hasWord('DEPARTURE');
            if (!window._mfDirectionLocked){
              if (isArrivalDoc && dirArr) { dirArr.checked = true; dirArr.dispatchEvent(new Event('change', { bubbles: true })); }
              else if (isDepartureDoc && dirDep) { dirDep.checked = true; dirDep.dispatchEvent(new Event('change', { bubbles: true })); }
            }
            const currentIsArrival = dirArr && dirArr.checked;
            try {
              let flightStr = findNearLabelValue(['vuelo','n° vuelo','no. vuelo','flight','flt'], /[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?/i, text);
              if (!flightStr){ const m = text.match(/\b[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?\b/); if (m) flightStr = m[0]; }
              if (flightStr) setVal('mf-flight', flightStr.trim());
              const best = resolveCarrierICAO1(text, { flight: flightStr });
              if (best && best.code){
                setVal('mf-carrier-3l', best.code);
                const rec = (airlinesCatalog||[]).find(a=> a.ICAO === best.code);
                if (rec){
                  const op = document.getElementById('mf-operator-name'); if (op && !op.value) op.value = rec.Name;
                  const an = document.getElementById('mf-airline'); if (an && !an.value) an.value = rec.Name;
                }
              }
            } catch(_){ }
            // Extraer TIPO DE VUELO: una única letra en mayúscula cercana a la etiqueta en el PDF
            try {
              const lines = (text||'').split(/\r?\n/);
              const labRx = /(TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)/i;
              let code = '';
              for (let i=0;i<lines.length && !code;i++){
                const ln = lines[i]||'';
                const m = ln.match(labRx);
                if (!m) continue;
                const after = ln.slice(m.index + (m[0]?.length||0));
                let mm = after.match(/\b([A-Z])\b/);
                if (!mm && lines[i+1]) mm = lines[i+1].match(/^\s*([A-Z])\b/);
                if (mm && mm[1]){ code = mm[1].toUpperCase(); break; }
              }
              if (!code){
                // Fallback global: capturar letra tras la etiqueta en todo el texto normalizado
                const one = (text||'').replace(/\s+/g,' ');
                const mg = one.match(/(?:TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)\s*[:\-]?\s*([A-Z])\b/i);
                if (mg && mg[1]) code = mg[1].toUpperCase();
              }
              if (code){
                const el = document.getElementById('mf-flight-type');
                if (el){ el.value = code; try { el.dispatchEvent(new Event('input', { bubbles:true })); } catch(_){ } }
              }
            } catch(_){ }
            try {
              const tailPatterns = [
                /\bX[A-C]-?[A-Z0-9]{3,6}\b/gi, /\bN\d{1,5}[A-Z]{0,3}\b/gi, /\bH[KP]-?[0-9A-Z]{3,8}\b/gi, /\bLV-?[A-Z0-9]{3,5}\b/gi,
                /\bCC-?[A-Z0-9]{3,5}\b/gi, /\bPR-?[A-Z0-9]{3,5}\b/gi, /\bCP-?[0-9A-Z]{3,6}\b/gi, /\bYV-?[0-9A-Z]{3,6}\b/gi,
                /\bOB-?[0-9A-Z]{3,6}\b/gi, /\bTG-?[0-9A-Z]{3,6}\b/gi, /\bTC-?[A-Z0-9]{3,6}\b/gi, /\bEI-?[A-Z]{3,5}\b/gi,
                /\bEC-?[A-Z]{3,5}\b/gi, /\bLX-?[A-Z0-9]{3,5}\b/gi, /\b9H-?[A-Z0-9]{3,6}\b/gi, /\b4K-?[A-Z0-9]{3,6}\b/gi,
                /\bA7-?[A-Z0-9]{3,6}\b/gi, /\bXA[A-Z0-9]{0,}\b/gi
              ];
              let foundTail = '';
              for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ foundTail = m[0].toUpperCase().replace(/\s+/g,''); break; } }
              if (foundTail) setVal('mf-tail', foundTail);
            } catch(_){ }
            try {
              const originCandLbl = findNearLabelIATACode(['origen','procedencia','from','procedencia del vuelo'], text);
              const lastStopCandLbl = findNearLabelIATACode(['ultima escala','escala anterior','last stop','escala'], text);
              const finalDestCandLbl = findNearLabelIATACode(['destino','to','destino del vuelo'], text);
              const arrivalMainCandLbl = currentIsArrival ? findNearLabelIATACode([
                'aeropuerto de llegada','aeropuerto destino','aeropuerto de arribo','aeropuerto destino del vuelo'
              ], text) : '';
              const airportCodes = upperTokens.filter(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && iataSet.has(t));
              const rawLines = text.split(/\r?\n/);
              let originCand = '';
              let lastStopCand = '';
              let finalDestCand = '';
              let forcedLastStopFromOrigin = false;
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

              const airportCounts = airportCodes.reduce((acc, code)=>{
                acc[code] = (acc[code] || 0) + 1;
                return acc;
              }, {});
              const uniqueAirports = Object.keys(airportCounts);
              const lastStopFromLabel = !!lastStopCandLbl;

              if (currentIsArrival && !lastStopFromLabel){
                const originCandidate = originCand || airportCodes[0] || '';
                const arrivalMainGuess = arrivalMainCandLbl || '';
                const isLikelyDirect = uniqueAirports.length <= 2;
                if (!lastStopCand && originCandidate){
                  lastStopCand = originCandidate;
                  forcedLastStopFromOrigin = true;
                } else if (originCandidate){
                  const alignsWithArrivalAirport = arrivalMainGuess && lastStopCand && lastStopCand === arrivalMainGuess;
                  const looksLikeDirect = isLikelyDirect && lastStopCand && lastStopCand !== originCandidate;
                  if (alignsWithArrivalAirport || looksLikeDirect){
                    if (lastStopCand !== originCandidate){
                      lastStopCand = originCandidate;
                    }
                    forcedLastStopFromOrigin = true;
                  }
                }
              }
              if (currentIsArrival){
                if (originCand) {
                  setVal('mf-arr-origin-code', originCand);
                  try { const nm = airportByIATA.get(originCand)||''; if (nm) setVal('mf-arr-origin-name', nm); } catch(_){}
                }
                if (lastStopCand) {
                  setVal('mf-arr-last-stop-code', lastStopCand);
                  try {
                    const nm = airportByIATA.get(lastStopCand)||'';
                    if (nm) setVal('mf-arr-last-stop', nm);
                    else if (forcedLastStopFromOrigin){
                      const originName = airportByIATA.get(originCand)||'';
                      if (originName) setVal('mf-arr-last-stop', originName);
                    }
                  } catch(_){}
                }
                // Aeropuerto principal (Llegada): leer código IATA cerca de la etiqueta y colocar código IATA (3 letras)
                try {
                  const mainArrCand = arrivalMainCandLbl || findNearLabelIATACode([
                    'AEROPUERTO DE LLEGADA','AEROPUERTO DESTINO','AEROPUERTO DE ARRIBO','AEROPUERTO DESTINO DEL VUELO'
                  ], text);
                  const mainMatch = findValidAirport(mainArrCand);
                  if (mainMatch && mainMatch.IATA){
                    setVal('mf-airport-main', mainMatch.IATA);
                  }
                } catch(_){ }
              } else {
                if (originCand) setVal('mf-origin-code', originCand);
                if (lastStopCand) setVal('mf-next-stop-code', lastStopCand);
                if (finalDestCand){
                  setVal('mf-final-dest-code', finalDestCand);
                  const name = airportByIATA.get(finalDestCand) || '';
                  if (name) setVal('mf-final-dest', name);
                }
              }
              // Dedicated extractor: scan the same and next lines after specific label(s) for a 24h time
              const extractTimeAfterLabel = (labelRx, maxAhead=3)=>{
                try {
                  const lines = (text||'').split(/\r?\n/);
                  for (let i=0;i<lines.length;i++){
                    if (labelRx.test(lines[i])){
                      for (let k=0;k<=maxAhead;k++){
                        const s = lines[i+k]||'';
                        const m = s.match(rxTime);
                        if (m){
                          let v = m[0];
                          v = v.replace(/[hH\.]/, ':');
                          if (/^\d{3,4}$/.test(v)){
                            const hh = v.length===3 ? ('0'+v[0]) : v.slice(0,2);
                            const mm = v.slice(-2);
                            v = hh.padStart(2,'0') + ':' + mm;
                          }
                          return v;
                        }
                      }
                    }
                  }
                } catch(_){ }
                return '';
              };
              const setTimeIf = (id, labels) => {
                let v = findNearLabelValue(labels, timeRx, text);
                if (v){
                  // Normalize to HH:MM if needed
                  v = v.replace(/[hH\.]/, ':');
                  if (/^\d{3,4}$/.test(v)){
                    // digits-only, e.g., 945 or 0945
                    const hh = v.length===3 ? ('0'+v[0]) : v.slice(0,2);
                    const mm = v.slice(-2);
                    v = hh.padStart(2,'0') + ':' + mm;
                  }
                  setVal(id, v);
                }
              };
              if (currentIsArrival){
                // Prefer robust, global helper for "HORA DE SLOT ASIGNADO"
                const strongArr = (window._mfFindSlotAssignedTime?.(text) || '');
                const vSlotArr = strongArr || (window._mfExtractTimeAfterLabel?.(text, /\bHORA\s+DE\s+SLOT\s+ASIGNADO\b/i, { maxAhead: 8 })
                                  || window._mfExtractTimeAfterLabel?.(text, /\bSLOT\s+ASIGNADO\b/i, { maxAhead: 8 }) || '');
                if (vSlotArr) setVal('mf-arr-slot-assigned', vSlotArr); else setTimeIf('mf-arr-slot-assigned', ['slot asignado']);
                setTimeIf('mf-arr-slot-coordinated', ['slot coordinado']);
                setTimeIf('mf-arr-arribo-posicion', ['entrada a la posicion','arribo a la posicion','arribo posicion']);
                setTimeIf('mf-arr-inicio-desembarque', ['termino maniobras de desembarque','inicio de desembarque','inicio desembarque']);
                setTimeIf('mf-arr-inicio-pernocta', ['inicio de pernocta','inicio pernocta']);
              } else {
                // Prefer robust, global helper for "HORA DE SLOT ASIGNADO"
                const strongDep = (window._mfFindSlotAssignedTime?.(text) || '');
                const vSlotDep = strongDep || (window._mfExtractTimeAfterLabel?.(text, /\bHORA\s+DE\s+SLOT\s+ASIGNADO\b/i, { maxAhead: 8 })
                                  || window._mfExtractTimeAfterLabel?.(text, /\bSLOT\s+ASIGNADO\b/i, { maxAhead: 8 }) || '');
                if (vSlotDep) setVal('mf-slot-assigned', vSlotDep); else setTimeIf('mf-slot-assigned', ['slot asignado']);
                setTimeIf('mf-slot-coordinated', ['slot coordinado']);
                try {
                  const tInicio = window._mfFindTimeByLabels?.(text, ['INICIO MANIOBRAS DE EMBARQUE','INICIO DE MANIOBRAS DE EMBARQUE','INICIO DE EMBARQUE'], { maxAhead: 8 }) || '';
                  if (tInicio) setVal('mf-inicio-embarque', tInicio); else setTimeIf('mf-inicio-embarque', ['inicio de maniobras de embarque','inicio de embarque']);
                } catch(_){ setTimeIf('mf-inicio-embarque', ['inicio de maniobras de embarque','inicio de embarque']); }
                try {
                  const tSalida = window._mfFindTimeByLabels?.(text, ['SALIDA DE LA POSICION','SALIDA POSICION','SALIDA DE LA POS.'], { maxAhead: 8 }) || '';
                  if (tSalida) setVal('mf-salida-posicion', tSalida); else setTimeIf('mf-salida-posicion', ['salida de la posicion','salida posicion']);
                } catch(_){ setTimeIf('mf-salida-posicion', ['salida de la posicion','salida posicion']); }
                setTimeIf('mf-termino-pernocta', ['termino de pernocta','término de pernocta','fin pernocta']);
              }
            } catch(_){ }
            // Demoras: detectar códigos (2-3 letras) en/tras "Causas de la demora" y minutos cercanos
            try {
              // Asegurar catálogo cargado; si no, cargar rápido (best-effort)
              if (!delayAlphaMap || delayAlphaMap.size===0){ try { await loadDelayCatalog(); } catch(_){ } }
              const codes = extractDelayCodesFromText(text);
              if (codes && codes.length){
                // Rellenar hasta 3 filas fijas; evitar duplicados existentes
                const fixedExisting = new Set(['demora1','demora2','demora3'].map(id=> (document.getElementById(id+'-codigo')?.value||'').toUpperCase().trim()).filter(Boolean));
                const minsMap = extractDelayMinutesFromText(text, codes) || new Map();
                let i=1;
                for (const code of codes){
                  if (i>3) break;
                  if (fixedExisting.has(code)) continue;
                  const rec = delayAlphaMap.get(code) || {};
                  const descTxt = rec.summary || rec.description || '';
                  const mins = minsMap.get(code);
                  setDemoraRow(i, code, (Number.isFinite(mins)? String(mins): ''), descTxt);
                  i++;
                }
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
              setTailWarning('');
        carrier.addEventListener('blur', ()=> setFromICAO(carrier.value));
      })();

  (function wireTailAutofill(){
        const tail = document.getElementById('mf-tail');
        if (!tail || tail._wired) return; tail._wired = 1;
              setTailWarning('');
        const equipo = document.getElementById('mf-aircraft');
        const carrier = document.getElementById('mf-carrier-3l');
    // No mostrar advertencia por defecto; solo se mostrará si un proceso explícito falla en detectar matrícula
        const setFromTail = (val)=>{
          let raw = (val||'').toString();
          if (!raw) return;
          const variants = regVariants(raw);
          let canon = '';
          for (const v of variants){ if (aircraftByReg.has(v)){ canon = v; break; } }
          const reg = canon || normalizeReg(raw);
          if (canon && tail.value !== canon) tail.value = canon; // estandariza al valor del catálogo
          const rec = aircraftByReg.get(reg);
          if (!rec) return;
          // Equipo debe venir del aircraft.csv (columna "Aircraft Type") asociado a la Registration,
          // preferentemente mostrado como ICAO code si existe en 'aircraft type.csv'.
          const t = typeByCode.get(rec.type);
          if (t){
            const preferred = t.ICAO || t.Name || rec.type;
            // Si ya hay un ICAO válido escrito por el extractor, no sobrescribir
            const alreadyValid = equipo && /^[A-Z0-9]{3,4}$/.test((equipo.value||'').toUpperCase()) && typeIcaoSet.has((equipo.value||'').toUpperCase());
            if (equipo && !alreadyValid) equipo.value = preferred;
          } else {
            if (equipo && !equipo.value) equipo.value = rec.type; // fallback
          }
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
        // Helpers: normalization for names (remove accents/extra spaces)
        const normName = (s)=> (s||'').toString()
          .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
          .replace(/\s+/g,' ').trim().toLowerCase();
        // Build normalized map on demand from current catalog
        let airportByNameNorm = new Map();
        try {
          airportByNameNorm.clear();
          if (airportByIATA && airportByIATA.size){
            for (const [iata, nm] of airportByIATA.entries()){
              const key = normName(nm);
              if (key && !airportByNameNorm.has(key)) airportByNameNorm.set(key, iata);
            }
          }
        } catch(_){ }
        function lookupIATAByNameAny(name){
          const exact = airportByName.get((name||'').toString().trim().toLowerCase());
          if (exact) return exact;
          const norm = normName(name);
          return airportByNameNorm.get(norm) || '';
        }
        function link(nameId, codeId){
          const nameEl = document.getElementById(nameId);
          const codeEl = document.getElementById(codeId);
          if (!nameEl || !codeEl) return;
          if (!nameEl._wired){
            nameEl._wired = 1;
            const onName = ()=>{
              const iata = lookupIATAByNameAny(nameEl.value||'');
              if (iata){ codeEl.value = iata; }
            };
            ['input','change','blur'].forEach(ev=> nameEl.addEventListener(ev, onName));
          }
          if (!codeEl._wired){
            codeEl._wired = 1;
            const onCode = ()=>{
              const c = (codeEl.value||'').toString().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
              codeEl.value = c;
              const name = airportByIATA.get(c) || '';
              if (name){ nameEl.value = name; }
            };
            ['input','change','blur'].forEach(ev=> codeEl.addEventListener(ev, onCode));
          }
        }
        link('mf-origin-name','mf-origin-code');
        link('mf-next-stop','mf-next-stop-code');
        link('mf-final-dest','mf-final-dest-code');
        link('mf-arr-origin-name','mf-arr-origin-code');
        link('mf-arr-last-stop','mf-arr-last-stop-code');
  try { window._mfLookupIATAByName = lookupIATAByNameAny; } catch(_){ }
        // Aeropuerto principal (IATA): normalizar y validar
        (function(){
          const el = document.getElementById('mf-airport-main');
          if (!el) return;
          if (!el._wired){
            el._wired = 1;
            const onIATA = ()=>{ el.value = (el.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); };
            ['input','change','blur'].forEach(ev=> el.addEventListener(ev, onIATA));
          }
          forceAirportMainValue();
        })();
      })();

      // Tipo de Operación (Doméstica / Internacional) derivado de aeropuertos (IATA/Nombre)
      (function wireOperationTypeComputation(){
        function collectOperationSourcesFromForm(){
          const getVal = (id)=> document.getElementById(id)?.value || '';
          const main = normalizeIATA(getVal('mf-airport-main')) || FORCED_AIRPORT_MAIN_CODE;
          const codeSources = [
            getVal('mf-arr-origin-code'),
            getVal('mf-arr-last-stop-code'),
            getVal('mf-origin-code'),
            getVal('mf-next-stop-code'),
            getVal('mf-final-dest-code')
          ];
          const nameSources = [
            getVal('mf-arr-origin-name'),
            getVal('mf-arr-last-stop'),
            getVal('mf-origin-name'),
            getVal('mf-next-stop'),
            getVal('mf-final-dest')
          ];
          return { main, codeSources, nameSources };
        }
        function compute(){
          try {
            const { main, codeSources, nameSources } = collectOperationSourcesFromForm();
            const derived = determineOperationTypeFromSources(main, codeSources, nameSources) || '';
            const els = [
              document.getElementById('mf-operation-type-arr'),
              document.getElementById('mf-operation-type-dep')
            ].filter(Boolean);
            els.forEach(el=>{
              if (!el) return;
              if (el.value !== derived) el.value = derived;
              try { el.dispatchEvent(new Event('input',{ bubbles:true })); } catch(_){ }
            });
          } catch(_){ }
        }
        try { window._mfComputeOperationType = compute; } catch(_){ }
        try {
          window._mfResolveOperationTypeFromRecord = function(rec){
            try {
              if (!rec) return '';
              const main = normalizeIATA(rec?.airportMain) || FORCED_AIRPORT_MAIN_CODE;
              const codeCandidates = [
                rec?.arrOriginCode,
                rec?.arrLastStopCode,
                rec?.originCode,
                rec?.nextStopCode,
                rec?.finalDestCode
              ];
              const nameCandidates = [
                rec?.arrOriginName,
                rec?.arrLastStop,
                rec?.originName,
                rec?.nextStop,
                rec?.finalDest
              ];
              return determineOperationTypeFromSources(main, codeCandidates, nameCandidates) || '';
            } catch(_){ return ''; }
          };
        } catch(_){ }
        try {
          window._mfEnsureOperationType = function(rec){
            if (!rec) return '';
            let val = (rec.operationType||'').toString().trim();
            let derived = '';
            try {
              if (typeof window._mfResolveOperationTypeFromRecord === 'function'){
                derived = window._mfResolveOperationTypeFromRecord(rec) || '';
              }
            } catch(_){ }
            if (derived){
              const normVal = (val||'').toString().trim();
              const normValSimple = normVal.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
              if (!normVal || normValSimple === 'sin determinar' || normValSimple === 'domestica' || derived === 'Internacional'){
                val = derived;
              }
            }
            if (!val){
              const code = (rec.flightType||'').toString().trim().toUpperCase();
              if (code){
                try {
                  if (typeof window._mfFlightTypeInfo === 'function'){
                    const info = window._mfFlightTypeInfo(code);
                    if (info && info.name) val = info.name;
                  }
                } catch(_){ }
              }
            }
            if (!val) val = 'Sin determinar';
            rec.operationType = val;
            return val;
          };
        } catch(_){ }
        const ids = [
          'mf-airport-main',
          'mf-origin-code',
          'mf-arr-origin-code',
          'mf-arr-last-stop-code',
          'mf-origin-name',
          'mf-arr-origin-name',
          'mf-arr-last-stop',
          'mf-next-stop',
          'mf-next-stop-code',
          'mf-final-dest',
          'mf-final-dest-code',
          'mf-dir-arr',
          'mf-dir-dep'
        ];
        ids.forEach(id=>{
          const el = document.getElementById(id);
          if (!el || el._opTypeWired) return;
          el._opTypeWired = 1;
          ['input','change','blur'].forEach(ev=> el.addEventListener(ev, compute));
        });
        try { document.addEventListener('DOMContentLoaded', ()=> setTimeout(compute, 0)); } catch(_){ }
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

      function _getTimeOrNA(id){
        try {
          const el = document.getElementById(id); if (!el) return '';
          if (el.dataset.na==='1') return 'N/A';
          const v = String(el.value||'').trim();
          if (!v) return '';
          if (/^N\s*\/?\s*A$/i.test(v)) return 'N/A';
          const norm = (window._mfNormTime? window._mfNormTime(v): v);
          return norm || '';
        } catch(_){ return ''; }
      }
      function readForm(){
        try { if (typeof window._mfComputeOperationType === 'function') window._mfComputeOperationType(); } catch(_){ }
        const g = id => document.getElementById(id)?.value || '';
        const direction = (dirArr && dirArr.checked) ? 'Llegada' : 'Salida';
        // Captura imagen de previsualización si hay canvas o img
        let previewImage = '';
        try {
          if (prevCanvas && !prevCanvas.classList.contains('d-none')){ previewImage = prevCanvas.toDataURL('image/png'); }
          else if (prevImg && !prevImg.classList.contains('d-none')){ previewImage = prevImg.src || ''; }
        } catch(_){ }
        // Demoras actuales: preferir UI de 3 filas fijas; si no hay, caer a tabla
        const demoras = (function(){
          try {
            const fixed = (typeof readDemorasFromFixedFields==='function') ? readDemorasFromFixedFields() : [];
            if (fixed && fixed.length) return fixed;
            const trs = Array.from(document.querySelectorAll('#tabla-demoras tbody tr'));
            return trs.map(tr=>({
              codigo: (tr.querySelector('.demora-codigo')?.value||'').toUpperCase().trim(),
              minutos: tr.querySelector('.demora-minutos')?.value||'',
              descripcion: tr.querySelector('.demora-descripcion')?.value||''
            })).filter(d=> d.codigo||d.minutos||d.descripcion);
          } catch(_){ return []; }
        })();

        // Determinar Tipo de Operación desde el campo visible (llegada/salida)
        const _opTypeVal = (dirArr && dirArr.checked)
          ? (document.getElementById('mf-operation-type-arr')?.value || '')
          : (document.getElementById('mf-operation-type-dep')?.value || '');

        const record = {
          direction,
          title: g('mf-title'), docDate: g('mf-doc-date'), folio: g('mf-folio'),
          carrier3L: g('mf-carrier-3l'), operatorName: g('mf-operator-name'), airline: g('mf-airline'), flight: g('mf-flight'),
          airportMain: g('mf-airport-main'), flightType: g('mf-flight-type'), operationType: _opTypeVal,
          tail: g('mf-tail'), aircraft: g('mf-aircraft'), originName: g('mf-origin-name'), originCode: g('mf-origin-code'),
          crewTotal: g('mf-crew-total'),
          // Totales: usar campos dedicados si existen; si no, caer a los totales de la tabla de embarque
          baggageKg: g('mf-baggage-kg') || g('total-equipaje'),
          baggagePieces: g('mf-baggage-pcs'),
          cargoKg: g('mf-cargo') || g('total-carga'),
          cargoPieces: g('mf-cargo-pieces'),
          cargoVol: g('mf-cargo-volume'),
          mailKg: g('mf-mail') || g('total-correo'),
          mailPieces: g('mf-mail-pieces'),
          dangerousGoods: !!document.getElementById('mf-dangerous-goods')?.checked,
          liveAnimals: !!document.getElementById('mf-live-animals')?.checked,
          humanRemains: !!document.getElementById('mf-human-remains')?.checked,
          pilot: g('mf-pilot'), pilotLicense: g('mf-pilot-license'), agent: g('mf-agent'), signature: g('mf-signature'), notes: g('mf-notes'),
          nextStop: g('mf-next-stop'), nextStopCode: g('mf-next-stop-code'), finalDest: g('mf-final-dest'), finalDestCode: g('mf-final-dest-code'),
          slotAssigned: _getTimeOrNA('mf-slot-assigned'), slotCoordinated: _getTimeOrNA('mf-slot-coordinated'), terminoPernocta: _getTimeOrNA('mf-termino-pernocta'),
          inicioEmbarque: _getTimeOrNA('mf-inicio-embarque'), salidaPosicion: _getTimeOrNA('mf-salida-posicion'),
          arrOriginName: g('mf-arr-origin-name'), arrOriginCode: g('mf-arr-origin-code'), arrSlotAssigned: _getTimeOrNA('mf-arr-slot-assigned'), arrSlotCoordinated: _getTimeOrNA('mf-arr-slot-coordinated'),
          arrLastStop: g('mf-arr-last-stop'), arrLastStopCode: g('mf-arr-last-stop-code'), arrArriboPosicion: _getTimeOrNA('mf-arr-arribo-posicion'), arrInicioDesembarque: _getTimeOrNA('mf-arr-inicio-desembarque'), arrInicioPernocta: _getTimeOrNA('mf-arr-inicio-pernocta'),
          paxTUA: g('pax-tua'), paxDiplomaticos: g('pax-diplomaticos'), paxComision: g('pax-comision'), paxInfantes: g('pax-infantes'), paxTransitos: g('pax-transitos'), paxConexiones: g('pax-conexiones'), paxExentos: g('pax-exentos'), paxTotal: g('pax-total'),
          obsTransito: g('mf-obs-transito'), paxDNI: g('mf-pax-dni'),
          signOperator: g('mf-sign-operator'), signCoordinator: g('mf-sign-coordinator'), signAdmin: g('mf-sign-admin'), signAdminDate: g('mf-sign-admin-date'),
          demoras,
          image: previewImage
        };
        if ((!record.operationType || !record.operationType.trim()) && typeof window._mfResolveOperationTypeFromRecord === 'function'){
          try {
            const derived = window._mfResolveOperationTypeFromRecord(record);
            if (derived) record.operationType = derived;
          } catch(_){ }
        }
        try { if (typeof window._mfEnsureOperationType === 'function') window._mfEnsureOperationType(record); } catch(_){ }
        return record;
      }
      function loadRecords(){ try { return JSON.parse(localStorage.getItem('aifa.manifests')||'[]'); } catch(_) { return []; } }
      function saveRecords(arr){ try { localStorage.setItem('aifa.manifests', JSON.stringify(arr)); } catch(_) {} }
      function renderTable(){
        if (!tableBody) return;
        const rows = loadRecords();
        try {
          if (Array.isArray(rows) && typeof window._mfEnsureOperationType === 'function'){
            rows.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
          }
        } catch(_){ }
        tableBody.innerHTML = rows.map(r => `
          <tr>
            <td>${r.direction||''}</td>
            <td>${(r.carrier3L? (r.carrier3L.toUpperCase()+ ' - ') : '') + (r.airline||r.operatorName||'')}</td>
            <td>${r.flight||''}</td>
            <td>${r.tail||''}</td>
            <td></td>
            <td></td>
            <td>${(r.originCode||'')}/${r.finalDest||''}</td>
            <td>${r.paxTotal||''}</td>
            <td>${r.cargoKg||''}/${r.mailKg||''}</td>
            <td>${r.image?'<img src="'+r.image+'" style="height:30px">':''}</td>
          </tr>`).join('');
        // Adjuntar el objeto completo al <tr> para que la exportación incluya TODOS los campos
        try {
          const trs = Array.from(tableBody.querySelectorAll('tr'));
          trs.forEach((tr, i)=>{ tr._record = rows[i]; });
        } catch(_){ }
      }

      function recalcPaxTotal(){
        const ids = ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'];
        const sum = ids.reduce((a,id)=> a + (parseInt(document.getElementById(id)?.value||'0',10)||0), 0);
        const out = document.getElementById('pax-total'); if (out) out.value = String(sum);
      }
      ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'].forEach(id=>{
        const el = document.getElementById(id); if (el && !el._wired){ el._wired = 1; el.addEventListener('input', recalcPaxTotal); }
      });
      recalcPaxTotal();

      // Hacer obligatorios todos los campos visibles excepto los de "Causas de la demora" y checkboxes
      function isVisible(el){ try { return !!(el && el.offsetParent !== null && !el.hidden); } catch(_) { return false; } }
      function inDemoras(el){ try { return !!(el.closest && (el.closest('#tabla-demoras') || /^(demora\d+\-(codigo|tiempo|descripcion))$/.test(el.id||''))); } catch(_) { return false; } }
      function enforceRequiredFields(){
        try {
          const form = document.getElementById('manifest-form'); if (!form) return;
          const controls = form.querySelectorAll('input, select, textarea');
          controls.forEach(el=>{
            // Reset primero
            try { el.required = false; } catch(_){ }
            // Excluir no visibles, deshabilitados, solo-lectura, checkboxes y demoras
            if (!isVisible(el)) return;
            if (el.disabled) return;
            if (el.readOnly) return;
            if (el.type === 'checkbox' || el.type === 'button' || el.type === 'file') return;
            if (inDemoras(el)) return;
            // Requerir el resto
            try { el.required = true; } catch(_){ }
          });
          // Campos críticos que están fuera del formulario: siempre requeridos
          try {
            const hd = document.getElementById('mf-doc-date');
            const hf = document.getElementById('mf-folio');
            if (hd) hd.required = true;
            if (hf) hf.required = true;
          } catch(_){ }
        } catch(_){ }
      }
      // Exponer para uso desde delegadores globales
      try {
        window._mfEnforceRequiredFields = enforceRequiredFields;
      } catch(_){ }
      function getControlLabelText(el){
        // 1) label[for]
        try { const lab = document.querySelector(`label[for="${el.id}"]`); if (lab && lab.textContent) return lab.textContent.trim(); } catch(_){}
        // 2) label hermano anterior
        try { const prev = el.previousElementSibling; if (prev && prev.tagName==='LABEL') return (prev.textContent||'').trim(); } catch(_){}
        // 3) label dentro del mismo contenedor .col-*
        try { const col = el.closest('.col-12, .col-md-6, .col-md-3, .col-md-4, .col-md-8'); if (col){ const l2 = col.querySelector('label'); if (l2 && l2.textContent) return l2.textContent.trim(); } } catch(_){}
        // 4) placeholder o id
        try { if (el.placeholder) return el.placeholder.trim(); } catch(_){}
        return el.id || 'Campo';
      }
      function getMissingRequiredFields(){
        const misses = [];
        try {
          const form = document.getElementById('manifest-form'); if (!form) return misses;
          const controls = form.querySelectorAll('input, select, textarea');
          controls.forEach(el=>{
            if (!isVisible(el) || el.disabled || el.readOnly) return;
            if (el.type === 'checkbox' || el.type === 'button' || el.type === 'file') return;
            if (inDemoras(el)) return;
            const req = !!el.required;
            const val = (el.value||'').toString().trim();
            if (req && !val){ misses.push({ id: el.id, label: getControlLabelText(el) }); }
          });
          // Incluir también los campos críticos fuera del formulario
          try {
            const addMiss = (id, label)=>{
              const el = document.getElementById(id);
              if (!el) return;
              const val = (el.value||'').toString().trim();
              if (!val) misses.push({ id, label });
            };
            addMiss('mf-doc-date', 'Fecha del Documento');
            addMiss('mf-folio', 'Folio');
          } catch(_){ }
        } catch(_){ }
        return misses;
      }
      try { window._mfGetMissingRequiredFields = getMissingRequiredFields; } catch(_){ }
      function showMissingLegend(misses){
        try {
          if (!Array.isArray(misses) || !misses.length) return;
          const list = misses.map(m=> ` - ${m.label||m.id}`).join('\n');
          alert(`Faltan datos por llenar:\n${list}`);
        } catch(_){ }
      }
      try { window._mfShowMissingLegend = showMissingLegend; } catch(_){ }
      // Aplicar al cambiar dirección y al abrir la sección
      try {
        const dirA = document.getElementById('mf-dir-arr');
        const dirD = document.getElementById('mf-dir-dep');
        if (dirA && !dirA._reqW){ dirA._reqW = 1; dirA.addEventListener('change', enforceRequiredFields); }
        if (dirD && !dirD._reqW){ dirD._reqW = 1; dirD.addEventListener('change', enforceRequiredFields); }
        enforceRequiredFields();
      } catch(_){ }

      // Validador central para cabeceras críticas (fecha/folio)
      function _validateCriticalHeaders(){
        try {
          const hd = document.getElementById('mf-doc-date');
          const hf = document.getElementById('mf-folio');
          const misses = [];
          if (!hd || !String(hd.value||'').trim()) misses.push({ id:'mf-doc-date', label:'Fecha del Documento' });
          if (!hf || !String(hf.value||'').trim()) misses.push({ id:'mf-folio', label:'Folio' });
          // Marcar required para que reportValidity pueda funcionar a nivel de input
          try { if (hd) hd.required = true; } catch(_){ }
          try { if (hf) hf.required = true; } catch(_){ }
          if (misses.length){
            // Intentar resaltar el primero
            try { const el0 = document.getElementById(misses[0].id); if (el0 && typeof el0.reportValidity==='function'){ el0.reportValidity(); el0.focus(); } } catch(_){ }
            showMissingLegend(misses);
            return { ok:false, misses };
          }
          return { ok:true, misses:[] };
        } catch(_){ return { ok:true, misses:[] }; }
      }

      // Cómputo central de faltantes (sin efectos colaterales): reutilizado por validadores y UI
      window._mfComputeMisses = function _mfComputeMisses(){
        const res = [];
        try {
          // Marcar requeridos dinámicos antes de evaluar
          try { if (typeof window._mfEnforceRequiredFields === 'function') window._mfEnforceRequiredFields(); else enforceRequiredFields(); } catch(_){ }
          const form = document.getElementById('manifest-form');
          // 1) Basado en atributos required visibles (excluye demoras/checkbox/file)
          try {
            const baseMiss = (typeof window._mfGetMissingRequiredFields === 'function')
              ? window._mfGetMissingRequiredFields()
              : (function(){
                  const out=[]; if (!form) return out;
                  const ctrls = form.querySelectorAll('input, select, textarea');
                  ctrls.forEach(el=>{
                    if (el.disabled || el.readOnly) return;
                    if (el.type==='checkbox' || el.type==='button' || el.type==='file') return;
                    const vis = !!(el.offsetParent !== null && !el.hidden);
                    if (!vis) return;
                    if (/(^demora\d+\-(codigo|tiempo|descripcion)$)/.test(el.id||'')) return;
                    if (el.required && !String(el.value||'').trim()) out.push({ id: el.id, label: (document.querySelector(`label[for="${el.id}"]`)?.textContent||el.placeholder||el.id||'Campo').trim() });
                  });
                  return out;
                })();
            if (Array.isArray(baseMiss)) res.push(...baseMiss);
          } catch(_){ }
          // 2) Críticos fuera del form
          const need = (id, label)=>{ const el=document.getElementById(id); if (!el || !String(el.value||'').trim()) res.push({ id, label }); };
          need('mf-doc-date','Fecha del Documento');
          need('mf-folio','Folio');
          // 3) Paquetes mínimos por dirección (más estrictos)
          try {
            const isArrival = !!document.getElementById('mf-dir-arr')?.checked;
            const common = ['mf-airport-main','mf-carrier-3l','mf-airline','mf-flight','mf-tail','mf-aircraft'];
            const reqIds = isArrival
              ? [...common,'mf-arr-origin-name','mf-arr-origin-code','mf-arr-slot-assigned','mf-arr-slot-coordinated','mf-arr-arribo-posicion','mf-arr-inicio-desembarque']
              : [...common,'mf-origin-name','mf-origin-code','mf-final-dest','mf-final-dest-code','mf-slot-assigned','mf-slot-coordinated'];
            reqIds.forEach(id=>{ const el=document.getElementById(id); if (!el) return; const v=String(el.value||'').trim(); if (!v){ const lab=(document.querySelector(`label[for="${id}"]`)?.textContent||el.placeholder||id).trim(); res.push({ id, label: lab }); } });
          } catch(_){ }
        } catch(_){ }
        return res;
      };

      // Validador global y robusto: usa _mfComputeMisses y checkValidity nativo; muestra leyenda cuando falla
      window._mfValidateAll = function _mfValidateAll(){
        try {
          const form = document.getElementById('manifest-form');
          const misses = (typeof window._mfComputeMisses==='function') ? window._mfComputeMisses() : [];
          if (misses.length){
            try { const first = document.getElementById(misses[0].id); if (first){ first.focus(); first.scrollIntoView({ behavior:'smooth', block:'center' }); if (typeof first.reportValidity==='function') first.reportValidity(); } } catch(_){ }
            try { (window._mfShowMissingLegend||function(x){ alert('Faltan datos por llenar'); })(misses); } catch(_){ }
            return false;
          }
          if (form && typeof form.checkValidity==='function' && !form.checkValidity()){
            try { form.reportValidity(); } catch(_){ }
            return false;
          }
          return true;
        } catch(_){ return true; }
      };

      // UI: desactivar/activar Guardar y Exportar según validez actual (silencioso)
      function updateActionButtonsState(){
        try {
          const save = document.getElementById('manifest-save');
          const exp = document.getElementById('manifest-export-csv');
          const add = document.getElementById('manifest-add-to-table');
          const misses = (typeof window._mfComputeMisses==='function') ? window._mfComputeMisses() : [];
          const ok = misses.length===0;
          [save, exp, add].forEach(btn=>{ if (!btn) return; btn.disabled = !ok; btn.classList.toggle('disabled', !ok); btn.setAttribute('aria-disabled', String(!ok)); });

          // Mensaje de ayuda visible para el usuario cuando los botones están bloqueados
          let hint = document.getElementById('manifest-actions-hint');
          if (!hint){
            // Insertar justo debajo del contenedor de botones
            try {
              const btnRow = document.querySelector('#manifest-form .col-12.d-flex.gap-2.mt-2');
              hint = document.createElement('div');
              hint.id = 'manifest-actions-hint';
              hint.className = 'form-text text-danger mt-1';
              if (btnRow && btnRow.parentElement){ btnRow.parentElement.insertBefore(hint, btnRow.nextSibling); }
            } catch(_){ }
          }
          if (hint){
            if (ok){ hint.textContent = ''; hint.style.display = 'none'; }
            else {
              const names = (misses||[]).slice(0,5).map(m=> m.label||m.id).filter(Boolean);
              const more = misses.length>5 ? ` y ${misses.length-5} más` : '';
              hint.textContent = `Completa ${names.join(', ')}${more} para habilitar Guardar y Exportar.`;
              hint.style.display = '';
            }
          }
        } catch(_){ }
      }
      try {
        document.addEventListener('input', (e)=>{ if (e.target && e.target.closest && e.target.closest('#manifest-form')) updateActionButtonsState(); });
        document.addEventListener('change', (e)=>{ if (e.target && e.target.closest && e.target.closest('#manifest-form')) updateActionButtonsState(); });
        document.addEventListener('DOMContentLoaded', updateActionButtonsState);
      } catch(_){ }

    if (saveBtn && !saveBtn._wired) { saveBtn._wired = 1; saveBtn.addEventListener('click', ()=>{
      // Validación centralizada y robusta
      try { if (typeof window._mfValidateAll === 'function' && !window._mfValidateAll()) return; } catch(_){ }
      recalcPaxTotal(); const recs = loadRecords(); recs.unshift(readForm()); saveRecords(recs.slice(0,200)); renderTable();
      try { updateActionButtonsState(); } catch(_){ }
    }); }
    if (clearBtn && !clearBtn._wired) { clearBtn._wired = 1; clearBtn.addEventListener('click', ()=>{ document.getElementById('manifest-form')?.reset(); applyManifestDirection(); clearDynamicTables(); calculateTotals(); updateDemorasTotal(); try { updateActionButtonsState(); } catch(_){ } }); }
      if (exportBtn && !exportBtn._wired) { exportBtn._wired = 1; exportBtn.addEventListener('click', ()=>{ const data = JSON.stringify(loadRecords(), null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.json'; a.click(); }); }

      // Añadir a tabla (sin guardar en localStorage): agrega una fila resumen al final de la tabla visible
      (function wireAddToTable(){
        const addBtn = document.getElementById('manifest-add-to-table');
        if (!addBtn || addBtn._wired) return; addBtn._wired = 1;
        function addCurrentToRecordsTable(){
          try {
            // Validación centralizada: no permitir añadir a la tabla si faltan campos requeridos
            try { if (typeof window._mfValidateAll === 'function' && !window._mfValidateAll()) return; } catch(_){ }
            const tbody = document.querySelector('#manifest-records-table tbody'); if (!tbody) return;
            const r = readForm();
            // Derivar fecha y hora sugeridas
            const fecha = r.docDate || '';
            const hora = r.direction === 'Llegada'
              ? (r.arrSlotAssigned || r.arrSlotCoordinated || r.arrArriboPosicion || '')
              : (r.slotAssigned || r.slotCoordinated || r.salidaPosicion || '');
            const od = r.direction === 'Llegada'
              ? `${r.arrOriginCode||r.arrOriginName||''}`
              : `${r.finalDestCode||r.finalDest||''}`;
            const airlineCol = `${r.carrier3L? (String(r.carrier3L).toUpperCase()+ ' - ') : ''}${r.airline||r.operatorName||''}`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${r.direction||''}</td>
              <td>${airlineCol}</td>
              <td>${r.flight||''}</td>
              <td>${r.tail||''}</td>
              <td>${fecha}</td>
              <td>${hora}</td>
              <td>${od}</td>
              <td>${r.paxTotal||''}</td>
              <td>${(r.cargoKg||'')}/${(r.mailKg||'')}</td>
              <td>${r.image?('<img src="'+r.image+'" style="height:30px">') : ''}</td>`;
            // Adjuntar el objeto completo al <tr> para exportar todos los campos
            tr._record = r;
            tbody.appendChild(tr);
          } catch(err){ console.error('Añadir a tabla (manifiestos) falló:', err); }
        }
        addBtn.addEventListener('click', addCurrentToRecordsTable);
      })();

      // Utilidad global: construye matriz (AOA) con encabezados y filas en el orden solicitado por el usuario
      window._mfBuildAoA = function(rows){
        try {
          const monthOf = (iso)=>{ try { if (!iso) return ''; const [y,m] = String(iso).split('-'); return m || ''; } catch(_){ return ''; } };
          const isArr = (r)=> (r?.direction||'').toUpperCase().startsWith('L');
          const opType = (r)=>{
            // Preferir Tipo de Operación (Doméstica/Internacional) si está disponible
            const ot = (r?.operationType||'').trim(); if (ot) return ot;
            try {
              if (typeof window._mfResolveOperationTypeFromRecord === 'function'){
                const derived = window._mfResolveOperationTypeFromRecord(r);
                if (derived) return derived;
              }
            } catch(_){ }
            // Fallback: mapear Tipo de vuelo (A–Z) a nombre si es posible
            const code = (r?.flightType||'').toUpperCase();
            try {
              if (typeof window._mfFlightTypeInfo === 'function'){ const info = window._mfFlightTypeInfo(code); if (info && info.name) return info.name; }
            } catch(_){ }
            return code;
          };
          const destinoOrigen = (r)=> isArr(r) ? (r.arrOriginCode || r.arrOriginName || '') : (r.finalDestCode || r.finalDest || '');
          const slotAsignado = (r)=> isArr(r) ? (r.arrSlotAssigned||'') : (r.slotAssigned||'');
          const slotCoord = (r)=> isArr(r) ? (r.arrSlotCoordinated||'') : (r.slotCoordinated||'');
          const pernocta = (r)=> isArr(r) ? (r.arrInicioPernocta||'') : (r.terminoPernocta||'');
          const horaOperacion = (r)=> isArr(r) ? (r.arrArriboPosicion||'') : (r.salidaPosicion||'');
          const totalExentos = (r)=>{
            const n = (x)=> parseInt(x||'0',10)||0;
            return String(n(r.paxDiplomaticos)+n(r.paxComision)+n(r.paxInfantes)+n(r.paxTransitos)+n(r.paxConexiones)+n(r.paxExentos));
          };
          const headersEs = [
            'MES','FECHA','TIPO DE MANIFIESTO','AEROLINEA','TIPO DE OPERACIÓN','AERONAVE','MATRÍCULA','ESTATUS MATRÍCULA','NUMERO DE VUELO','DESTINO / ORIGEN','SLOT ASIGNADO','SLOT COORDINADO','HORA DE INICIO O TERMINO DE PERNOCTA','HORA DE OPERACIÓN','HORA MÁXIMA DE ENTREGA','HORA DE RECEPCIÓN','HORAS CUMPLIDAS','PUNTUALIDAD / CANCELACIÓN','TOTAL PAX','DIPLOMATICOS','EN COMISION','INFANTES','TRANSITOS','CONEXIONES','OTROS EXENTOS','TOTAL EXENTOS','PAX QUE PAGAN TUA','KGS. DE EQUIPAJE'
          ];
          const headers = headersEs.slice();
          try {
            if (Array.isArray(rows) && typeof window._mfEnsureOperationType === 'function'){
              rows.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
            }
          } catch(_){ }
          const aoa = (rows||[]).map(r=>{
            const vals = [];
            vals.push(monthOf(r.docDate));
            vals.push(r.docDate||'');
            vals.push(r.direction||'');
            vals.push(r.airline||r.operatorName||'');
            vals.push(opType(r));
            vals.push(r.aircraft||'');
            vals.push(r.tail||'');
            // Estatus matrícula: se deja en blanco por ahora (no confiable sin índice global)
            vals.push('');
            vals.push(r.flight||'');
            vals.push(destinoOrigen(r));
            vals.push(slotAsignado(r));
            vals.push(slotCoord(r));
            vals.push(pernocta(r));
            vals.push(horaOperacion(r));
            vals.push(''); // Hora máxima de entrega (no disponible)
            vals.push(''); // Hora de recepción (no disponible)
            vals.push(''); // Horas cumplidas (no disponible)
            vals.push(''); // Puntualidad / Cancelación (no disponible)
            vals.push(r.paxTotal||'');
            vals.push(r.paxDiplomaticos||'');
            vals.push(r.paxComision||'');
            vals.push(r.paxInfantes||'');
            vals.push(r.paxTransitos||'');
            vals.push(r.paxConexiones||'');
            vals.push(r.paxExentos||'');
            vals.push(totalExentos(r));
            vals.push(r.paxTUA||'');
            vals.push(r.baggageKg||'');
            return vals;
          });
          return { headers, headersEs, aoa };
        } catch(_){ return { headers:[], headersEs:[], aoa:[] }; }
      };

      // Exportar a Excel (.xlsx) usando SheetJS (XLSX). Si no está disponible, cae a CSV como fallback.
      if (exportCsvBtn && !exportCsvBtn._wired){
        exportCsvBtn._wired = 1;
        try { window._mfExportDirect = true; } catch(_){ }
        exportCsvBtn.addEventListener('click', async ()=>{
          try {
            // Validación centralizada: bloquear exportación si faltan campos requeridos (excepto demoras)
            try { if (typeof window._mfValidateAll === 'function' && !window._mfValidateAll()) return; } catch(_){ }
            // 1) Preferir exportar la tabla visible si tiene filas
            const table = document.getElementById('manifest-records-table');
            const trEls = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
            const tableRecs = trEls.map(tr=> tr && tr._record).filter(Boolean);
            try {
              if (typeof window._mfEnsureOperationType === 'function'){
                tableRecs.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
              }
            } catch(_){ }
            if (tableRecs.length){
              const { headers, headersEs, aoa } = (window._mfBuildAoA||function(){ return { headers:[], headersEs:[], aoa:[] }; })(tableRecs);
              // Excel primero
              if (window.XLSX && XLSX.utils && typeof XLSX.utils.aoa_to_sheet === 'function'){
                try {
                  const ws = XLSX.utils.aoa_to_sheet([headersEs, ...aoa]);
                  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Manifiestos');
                  try { const range = XLSX.utils.decode_range(ws['!ref']||'A1'); ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) }; } catch(_){ }
                  XLSX.writeFile(wb, 'manifiestos.xlsx');
                  return;
                } catch(_){ /* fall through */ }
              }
              // CSV fallback con todos los campos
              const esc=(v)=>{ const s=(v==null)?'':(typeof v==='boolean'?(v?'Sí':'No'):String(v)); return /[",\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"': s; };
              const lines=[headersEs.join(',')]; aoa.forEach(arr=> lines.push(arr.map(esc).join(',')));
              const csv='\ufeff'+lines.join('\r\n');
              const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.csv'; a.click();
              return;
            }

            // 2) Si no hay tabla, exportar el formulario/guardados (lógica previa)
            let rows = loadRecords();
            // Si no hay registros guardados, exportar el formulario actual como un registro
            if (!rows || rows.length===0){ rows = [ readForm() ]; }
            try {
              if (Array.isArray(rows) && typeof window._mfEnsureOperationType === 'function'){
                rows.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
              }
            } catch(_){ }
            // Asegurar que cada registro tenga demoras si la estructura existe en el formulario actual
            const getDemorasFromDOM = ()=>{
              try {
                if (typeof readDemorasFromFixedFields === 'function'){
                  const fx = readDemorasFromFixedFields();
                  if (fx && fx.length) return fx;
                }
                const trs = Array.from(document.querySelectorAll('#tabla-demoras tbody tr'));
                return trs.map(tr=>({
                  codigo: (tr.querySelector('.demora-codigo')?.value||'').toUpperCase().trim(),
                  minutos: tr.querySelector('.demora-minutos')?.value||'',
                  descripcion: tr.querySelector('.demora-descripcion')?.value||''
                })).filter(d=> d.codigo||d.minutos||d.descripcion);
              } catch(_){ return []; }
            };
            if (rows.length>0 && (!rows[0].demoras || !Array.isArray(rows[0].demoras))){
              const ds = getDemorasFromDOM();
              if (ds.length){ rows[0] = { ...rows[0], demoras: ds }; }
            }
            const build = (window._mfBuildAoA||function(){ return { headers:[], headersEs:[], aoa:[] }; });
            const { headers, headersEs, aoa } = build(rows);

            // Intentar exportar con SheetJS si está cargado
            if (window.XLSX && window.XLSX.utils && typeof window.XLSX.utils.aoa_to_sheet === 'function'){
              try {
                const ws = XLSX.utils.aoa_to_sheet([headersEs, ...aoa]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Manifiestos');
                // Añadir auto-filter y tabla-like range (opcional): establecer rango completo
                try {
                  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
                } catch(_){ }
                XLSX.writeFile(wb, 'manifiestos.xlsx');
                return;
              } catch(err){ console.warn('SheetJS export failed, falling back to CSV', err); }
            }

            // Fallback: generar CSV si SheetJS no está disponible
            const esc = (v)=>{
              const s = (v==null)? '' : (typeof v==='boolean'? (v?'Sí':'No'): String(v));
              if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
              return s;
            };
            const lines = [headersEs.join(',')];
            aoa.forEach(rowArr=>{ lines.push(rowArr.map(esc).join(',')); });
            const csv = '\ufeff' + lines.join('\r\n');
            const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.csv'; a.click();
          } catch(err){ console.error('Export error', err); }
        });
      }
      renderTable();

      const demoraTbody = document.querySelector('#tabla-demoras tbody');
      const addDemoraBtn = document.getElementById('add-demora-row');
      const clearDemorasBtn = document.getElementById('clear-demoras');
      function addDemoraRow(data={}){
        if (!demoraTbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="form-control form-control-sm demora-codigo" list="delay-alpha-codes" placeholder="AA/AB/BC" value="${data.codigo||''}"></td>
          <td><input type="number" min="0" class="form-control form-control-sm demora-minutos" value="${data.minutos||''}"></td>
          <td><input type="text" class="form-control form-control-sm demora-descripcion" value="${data.descripcion||''}"></td>
          <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-demora-row"><i class="fas fa-times"></i></button></td>`;
        demoraTbody.appendChild(tr);
        // Normalizar/validar código y autocompletar descripción al crear
        try {
          const codeInp = tr.querySelector('.demora-codigo');
          const descInp = tr.querySelector('.demora-descripcion');
          const norm = ()=>{
            if (!codeInp) return;
            codeInp.value = (codeInp.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
            const rec = delayAlphaMap.get(codeInp.value);
            tr.classList.toggle('table-warning', !rec);
            if (rec && descInp && !descInp.value){ descInp.value = rec.description || rec.summary || ''; }
          };
          if (codeInp && !codeInp._wired){ codeInp._wired = 1; ['input','change','blur'].forEach(ev=> codeInp.addEventListener(ev, norm)); norm(); }
        } catch(_){ }
      }
      function ensureInitialDemoraRows(n=3){
        try {
          if (!demoraTbody) return;
          const cur = demoraTbody.querySelectorAll('tr').length;
          for (let i=cur; i<n; i++) addDemoraRow();
        } catch(_){ }
      }
      function updateDemorasTotal(){
        const total = Array.from(document.querySelectorAll('.demora-minutos')).reduce((acc, inp)=> acc + (parseFloat(inp.value)||0), 0);
        const out = document.getElementById('total-demora-minutos'); if (out) out.value = String(total);
      }
  function clearDemoras(){ if (demoraTbody) { demoraTbody.innerHTML = ''; ensureInitialDemoraRows(3); } updateDemorasTotal(); }
      if (addDemoraBtn && !addDemoraBtn._wired){ addDemoraBtn._wired = 1; addDemoraBtn.addEventListener('click', ()=> addDemoraRow()); }
      if (clearDemorasBtn && !clearDemorasBtn._wired){ clearDemorasBtn._wired = 1; clearDemorasBtn.addEventListener('click', ()=>{ clearDemoras(); clearDemorasFixedFields?.(); }); }
  // Tabla dinámica: si existe, dejar 3 renglones listos; además cablear inputs fijos si están presentes
  ensureInitialDemoraRows(3);
      (function wireFixedDemoraInputs(){
        for (let i=1;i<=3;i++){
          const codeEl = document.getElementById(`demora${i}-codigo`);
          const descEl = document.getElementById(`demora${i}-descripcion`);
          if (codeEl && !codeEl._wired){
            codeEl._wired = 1;
            const norm = ()=>{
              try {
                codeEl.value = (codeEl.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
                if (descEl && !descEl.value){
                  const rec = delayAlphaMap.get(codeEl.value);
                  if (rec){ descEl.value = rec.description || rec.summary || ''; }
                }
              } catch(_){ }
            };
            ['input','change','blur'].forEach(ev=> codeEl.addEventListener(ev, norm));
            norm();
          }
        }
      })();

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
          if (e.target && e.target.classList && e.target.classList.contains('demora-codigo')){
            const inp = e.target;
            const tr = inp.closest('tr');
            inp.value = (inp.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
            const rec = delayAlphaMap.get(inp.value);
            if (tr) tr.classList.toggle('table-warning', !rec);
            const d = tr ? tr.querySelector('.demora-descripcion') : null;
            if (rec && d && !d.value) d.value = rec.description || rec.summary || '';
          }
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

  function clearDynamicTables(){ try { clearDemoras(); } catch(_){ } try { clearDemorasFixedFields?.(); } catch(_){ } try { clearEmbarque(); } catch(_){ } }
    } catch (e) { /* ignore */ }
  };

  function init(){ try { if (!window._manifV2Wired) window.setupManifestsUI?.(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="manifiestos"]')) setTimeout(init, 50); });
  // Refuerzo: inicializar el catálogo de Tipo de vuelo aunque otros módulos fallen
  document.addEventListener('DOMContentLoaded', function(){ try { window._initFlightServiceType?.(); } catch(_){ } });
  // Enforce 24h and departure-specific formatting on manual edits
  // No custom input normalization needed for mf-slot-assigned now that it's a native time input
  // Keeping this space for future input-specific hooks if required.
  // Strict 24h validation for all time inputs
  (function wireStrictTimeValidation(){
    if (window._mfStrictTimeWired) return; window._mfStrictTimeWired = true;
    function normTime(s){
      try {
        let v = (s||'').toString().trim(); if (!v) return '';
        // Treat 'N/A' as a special valid token (return empty here; validateEl will handle it)
        if (/^N\s*\/?\s*A$/i.test(v)) return '';
        v = v.replace(/[hH\.]/g, ':');
        if (/^\d{3,4}$/.test(v)){
          const hh = v.length===3 ? ('0'+v[0]) : v.slice(0,2);
          const mm = v.slice(-2); v = hh+':'+mm;
        }
        const m = /^(\d{1,2}):(\d{2})$/.exec(v); if (!m) return '';
        const H = parseInt(m[1],10), M = parseInt(m[2],10);
        if (!(H>=0 && H<=23 && M>=0 && M<=59)) return '';
        return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0');
      } catch(_) { return ''; }
    }
    function ensureFeedback(el){
      try {
        const wrap = el.parentElement || el;
        let fb = wrap.querySelector('.invalid-feedback');
        if (!fb){ fb = document.createElement('div'); fb.className = 'invalid-feedback'; fb.textContent = 'Formato HH:MM (00:00–23:59) o N/A'; wrap.appendChild(fb); }
      } catch(_){ }
    }
    function validateEl(el){
      if (!el) return;
      const raw = String(el.value||'').trim();
      const n = normTime(raw);
      if (!raw){ el.setCustomValidity(''); el.classList.remove('is-invalid'); return; }
      if (/^N\s*\/?\s*A$/i.test(raw)){
        try { if (el.value !== 'N/A') el.value = 'N/A'; } catch(_){ }
        el.setCustomValidity('');
        el.classList.remove('is-invalid');
        return;
      }
      if (!n){
        el.setCustomValidity('Hora inválida (00:00–23:59)');
        el.classList.add('is-invalid');
        ensureFeedback(el);
      } else {
        el.setCustomValidity('');
        el.classList.remove('is-invalid');
        if (el.value !== n) el.value = n;
      }
    }
  document.addEventListener('input', (e)=>{ const t=e.target; if (!t || !t.matches) return; if (t.matches('input[type="time"], input[data-time24="1"]')) validateEl(t); });
  document.addEventListener('change', (e)=>{ const t=e.target; if (!t || !t.matches) return; if (t.matches('input[type="time"], input[data-time24="1"]')) validateEl(t); });
  // One-time sweep on load (both native time and converted 24h text inputs)
  try { document.querySelectorAll('input[type="time"], input[data-time24="1"]').forEach(validateEl); } catch(_){ }
    // Expose normalizer for internal use
    window._mfNormTime = normTime;
  })();
  
  // V2: Event-delegation based setup that guarantees the buttons work even if previous wiring failed
  window.setupManifestsUI_v2 = function setupManifestsUI_v2(){
    try {
      const sec = document.getElementById('manifiestos-section'); if (!sec) return;
      if (window._manifV2Wired) return; window._manifV2Wired = true;
      const status = document.getElementById('manifest-pdf-status');
      const upload = document.getElementById('manifest-upload');
  const uploadBtnPdf = document.getElementById('manifest-upload-btn-pdf');
  const uploadBtnImg = document.getElementById('manifest-upload-btn-img');
      const progressBarContainer = document.getElementById('manifest-progress-bar-container');
      const progressBar = document.getElementById('manifest-progress-bar');
  let _v2Cur=0,_v2Tar=0,_v2EffTar=0,_v2RAF=null,_v2LastTs=0,_v2Label='';
  const _v2Anim=(ts)=>{
    if(_v2RAF===null) return;
    if(!_v2LastTs) _v2LastTs = ts;
    const dt = Math.max(0, (ts - _v2LastTs)/1000);
    _v2LastTs = ts;
    // Effective target creep to avoid stall near mid-progress
    const creepRate = 6; // % per second
    const creepEnabled = _v2Tar >= 50 && _v2Tar < 100;
    if (creepEnabled){
      const cap = Math.max(0, _v2Tar - 0.8);
      _v2EffTar = Math.min(cap, Math.max(_v2EffTar, _v2Tar*0.9) + creepRate*dt);
    } else { _v2EffTar = Math.max(_v2EffTar, _v2Tar); }
    const maxSpeed = (_v2EffTar >= 95 ? 35 : 22);
    if (_v2Cur < _v2EffTar){ _v2Cur = Math.min(_v2EffTar, _v2Cur + maxSpeed*dt); }
    if(progressBar){
      progressBar.style.width=_v2Cur+'%';
      progressBar.setAttribute('aria-valuenow', String(Math.round(_v2Cur)));
      const txt=_v2Label || progressBar.getAttribute('data-text')||'';
      progressBar.textContent=(Math.round(_v2Cur)+'%')+(txt?(' - '+txt):'');
    }
    try { planeProgressSet(_v2Cur, _v2Label); } catch(_){ }
    if(_v2Cur>=100 && _v2Tar>=100){ cancelAnimationFrame(_v2RAF); _v2RAF=null; _v2LastTs=0; return; }
    _v2RAF = requestAnimationFrame(_v2Anim);
  };
  const setProgress = (p, t)=>{ if (progressBarContainer) progressBarContainer.classList.add('d-none'); if (typeof t==='string'){ _v2Label=t; if (progressBar) progressBar.setAttribute('data-text', t); } _v2Tar=Math.max(_v2Tar, Math.max(0,Math.min(100, Number(p)||0))); _v2EffTar = Math.max(_v2EffTar, _v2Tar); if(p>=100){ _v2EffTar = 100; } if(_v2RAF===null){ _v2RAF=requestAnimationFrame(_v2Anim); } };
  const hideProgress = ()=>{ if(_v2RAF){ cancelAnimationFrame(_v2RAF); _v2RAF=null; } _v2Cur=0; _v2Tar=0; _v2EffTar=0; _v2LastTs=0; _v2Label=''; if (progressBarContainer&&progressBar){ progressBarContainer.classList.add('d-none'); progressBar.style.width='0%'; progressBar.removeAttribute('data-text'); progressBar.textContent=''; } try { planeProgressHide(); } catch(_){ } };

      // Direction helpers (V2)
      function lockDirectionV2(isArrival){
        try {
          const dirArr = document.getElementById('mf-dir-arr');
          const dirDep = document.getElementById('mf-dir-dep');
          if (dirArr && dirDep){
            dirArr.checked = !!isArrival; dirDep.checked = !isArrival;
            dirArr.disabled = !isArrival; dirDep.disabled = isArrival;
            window._mfDirectionLocked = true;
            try { (isArrival?dirArr:dirDep).dispatchEvent(new Event('change', { bubbles:true })); } catch(_){ }
          }
        } catch(_){ }
        try { if (typeof applyManifestDirection === 'function') applyManifestDirection(); } catch(_){ }
      }
      async function showDirectionPromptV2(){
        try {
          const modalEl = document.getElementById('mfDirectionModal');
          const btnArr = document.getElementById('mfDirChooseArr');
          const btnDep = document.getElementById('mfDirChooseDep');
          if (modalEl && window.bootstrap && window.bootstrap.Modal && btnArr && btnDep){
            return await new Promise(resolve => {
              let resolved = false;
              const modal = new window.bootstrap.Modal(modalEl, { backdrop:'static', keyboard:false });
              const off = ()=>{ try { btnArr.removeEventListener('click', onArr); btnDep.removeEventListener('click', onDep); } catch(_){ } };
              const onArr = ()=>{ if (!resolved){ resolved=true; off(); modal.hide(); resolve(true); } };
              const onDep = ()=>{ if (!resolved){ resolved=true; off(); modal.hide(); resolve(false); } };
              btnArr.addEventListener('click', onArr, { once:true });
              btnDep.addEventListener('click', onDep, { once:true });
              modal.show();
            });
          }
        } catch(_){ }
        const resp = window.confirm('¿El documento a escanear es de LLEGADA?\nAceptar = Llegada, Cancelar = Salida');
        return !!resp;
      }

      // Local helpers (decoupled from V1) to avoid ReferenceErrors
      function setVal(id, v){
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'mf-airport-main'){
          forceAirportMainValue();
          return;
        }
        el.value = v;
      }
      const normalizeReg = (s)=> (s||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'');
      const regVariants = (s)=>{
        const base = normalizeReg(s); const out = new Set([base]);
        const pairs = [['O','0'],['I','1'],['S','5'],['B','8'],['Z','2']];
        for (const [A,B] of pairs){
          if (base.includes(A)) out.add(base.replace(new RegExp(A,'g'), B));
          if (base.includes(B)) out.add(base.replace(new RegExp(B,'g'), A));
        }
        return Array.from(out);
      };
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

      // Master catalogs (V2 local cache)
      let airlinesCatalog = [];
      let iataToIcao = new Map();
      let icaoSet = new Set();
  let aircraftByReg = new Map(); // reg -> { type(IATA), ownerIATA }
  let typeByCode = new Map();    // IATA -> { ICAO, Name }
  let typeIcaoSetV2 = new Set(); // ICAO set for validation
  let airportByIATA = new Map(); // IATA -> Name
  let airportMetaByIATA = new Map(); // IATA -> { name, country, security }
  let airportByName = new Map(); // name lower -> IATA
  let airportNameIndex = []; // [{ name, iata, norm, tokens }]
  let airportByICAO = new Map();
  let airportMetaByICAO = new Map();
  let icaoToIata = new Map();
  let iataSet = new Set();
  // Evitar falsos positivos de palabras comunes en español o abreviaturas que no son IATA
  let iataStopwords = new Set(['DEL','LIC','AER','INT']);

      async function loadAirlinesCatalog(){
        try {
          if (location && location.protocol === 'file:') return; // skip fetch under file://
          const res = await fetch('data/master/airlines.csv', { cache:'no-store' });
          const text = await res.text();
          const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
          const out = [];
          for (let i=1;i<lines.length;i++){
            const parts = lines[i].split(',');
            if (parts.length < 3) continue;
            const IATA = (parts[0]||'').trim().toUpperCase();
            const ICAO = (parts[1]||'').trim().toUpperCase();
            const Name = parts.slice(2).join(',').trim().replace(/^"|"$/g,'');
            if (ICAO && /^[A-Z]{3}$/.test(ICAO)){
              out.push({ IATA, ICAO, Name });
              icaoSet.add(ICAO);
              if (IATA && /^[A-Z0-9]{2}$/.test(IATA)) iataToIcao.set(IATA, ICAO);
            }
          }
          airlinesCatalog = out;
        } catch(_){ /* ignore */ }
      }
      async function loadAircraftCatalog(){
        try {
          if (location && location.protocol === 'file:') return; // skip fetch under file://
          const resA = await fetch('data/master/aircraft.csv', { cache:'no-store' });
          const textA = await resA.text();
          const linesA = textA.split(/\r?\n/).filter(l=>l.trim());
          for (let i=1;i<linesA.length;i++){
            const parts = linesA[i].split(',');
            if (parts.length < 3) continue;
            // Guardar tanto la forma canónica (como viene) como una clave normalizada para comparaciones exhaustivas
            const regRaw = (parts[0]||'').trim().toUpperCase(); // Registration tal cual CSV
            const regKey = normalizeReg(regRaw);
            const type = (parts[1]||'').trim().toUpperCase(); // IATA type code
            const ownerIATA = (parts[2]||'').trim().toUpperCase();
            if (regRaw){
              aircraftByReg.set(regRaw, { type, ownerIATA, _canon: regRaw });
              // también registrar por clave normalizada si difiere
              if (!aircraftByReg.has(regKey)) aircraftByReg.set(regKey, { type, ownerIATA, _canon: regRaw });
            }
          }
        } catch(_){ /* ignore */ }
        try {
          if (location && location.protocol === 'file:') return; // skip fetch under file://
          const resT = await fetch('data/master/aircraft type.csv', { cache:'no-store' });
          const textT = await resT.text();
          const linesT = textT.split(/\r?\n/).filter(l=>l.trim());
          for (let i=1;i<linesT.length;i++){
            const parts = linesT[i].split(',');
            if (parts.length < 2) continue;
            const codeIATA = (parts[0]||'').trim().toUpperCase();
            const icao = (parts[1]||'').trim().toUpperCase();
            const name = (parts[2]||'').trim();
            if (codeIATA) typeByCode.set(codeIATA, { ICAO: icao, Name: name });
            if (icao) typeIcaoSetV2.add(icao);
          }
        } catch(_){ /* ignore */ }
      }
      function extractAircraftTypeICAOFromTextV2(text){
        try {
          const U = (text||'').toUpperCase();
          const lines = (text||'').split(/\r?\n/);
          const labels = ['EQUIPO','TIPO','TIPO DE AERONAVE','AIRCRAFT TYPE'];
          const cand = new Map();
          const add = (code, score)=>{ const c=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''); if (!c) return; cand.set(c, Math.max(cand.get(c)||0, score)); };
          const pushNear = (s, base)=>{
            const toks = (s||'').toUpperCase().match(/[A-Z0-9-]{2,9}/g) || [];
            for (const t of toks){
              const clean = t.replace(/-/g,'');
              if (/^[A-Z0-9]{3,4}$/.test(clean) && typeIcaoSetV2.has(clean)) add(clean, base);
              if (/^[A-Z0-9]{2,3}$/.test(clean) && typeByCode.has(clean)){
                const ic = (typeByCode.get(clean)?.ICAO)||''; if (ic) add(ic, base-5);
              }
              if (/^B737[0-9]$/.test(clean)) add('B73'+clean.slice(-1), base-10);
              if (/^A32[0-1][0-9]$/.test(clean)) add('A32'+clean.slice(-1), base-10);
            }
            const S = (s||'').toUpperCase();
            if (/\bA330\s*[- ]?\s*300\b/.test(S) || /\bA333\b/.test(S)) add('A333', base+2);
            if (/\bA330\s*[- ]?\s*200\b/.test(S) || /\bA332\b/.test(S)) add('A332', base+2);
            if (/\bA330\b/.test(S) && /\bP2F\b/.test(S)){
              if (/\b300\b/.test(S)) add('A333', base+3);
              if (/\b200\b/.test(S)) add('A332', base+3);
            }
          };
          for (let i=0;i<lines.length;i++){
            const u = (lines[i]||'').toUpperCase();
            if (labels.some(l=> u.includes(l))){
              pushNear(lines[i], 90);
              if (lines[i+1]) pushNear(lines[i+1], 85);
              if (lines[i+2]) pushNear(lines[i+2], 75);
            }
          }
          const global = U.match(/[A-Z0-9]{3,4}/g)||[];
          for (const g of global){ if (typeIcaoSetV2.has(g)) add(g, 50); }
          if (/\bA330\s*[- ]?\s*300\b/.test(U)) add('A333', 55);
          if (/\bA330\s*[- ]?\s*200\b/.test(U)) add('A332', 55);
          if (!cand.size) return '';
          return Array.from(cand.entries()).sort((a,b)=> b[1]-a[1])[0][0] || '';
        } catch(_) { return ''; }
      }
      async function loadAirportsCatalog(){
        try {
          if (location && location.protocol === 'file:') return; // skip fetch under file://
          const res = await fetch('data/master/airports.csv', { cache:'no-store' });
          const text = await res.text();
          const lines = text.split(/\r?\n/).filter(l=>l.trim());
          function parseCSVLine(line){
            const cols = []; let cur=''; let inQ=false; for (let i=0;i<line.length;i++){
              const ch=line[i];
              if (ch==='"'){ if (inQ && line[i+1]==='"'){ cur+='"'; i++; } else inQ=!inQ; }
              else if (ch===',' && !inQ){ cols.push(cur); cur=''; }
              else { cur+=ch; }
            } cols.push(cur); return cols;
          }
          for (let i=1;i<lines.length;i++){
            const parts = parseCSVLine(lines[i]);
            if (parts.length < 3) continue;
            const IATA = (parts[0]||'').trim().toUpperCase();
            const Name = (parts[2]||'').trim().replace(/^"|"$/g,'');
            if (!IATA || !Name) continue;
            airportByIATA.set(IATA, Name);
            airportByName.set(Name.toLowerCase(), IATA);
            iataSet.add(IATA);
            try {
              const norm = (Name||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
              const tokens = norm.split(' ').filter(Boolean);
              airportNameIndex.push({ name: Name, iata: IATA, norm, tokens });
            } catch(_){ }
          }
          // Recalcular Tipo de Operación tras cargar catálogo (V2)
          try { if (typeof window._mfComputeOperationType === 'function') window._mfComputeOperationType(); } catch(_){ }
        } catch(_){ /* ignore */ }
      }
  // Prepare catalogs and expose a readiness promise to await before parsing
  let _v2CatalogsReady = (async ()=>{ try { await Promise.all([loadAirlinesCatalog(), loadAircraftCatalog(), loadAirportsCatalog()]); } catch(_){ } })();
      // UI helper: show/hide matrícula warning (local to V2)
      function tailWarn(msg){
        const w = document.getElementById('mf-tail-warning');
        if (!w) return;
        if (msg){ w.textContent = msg; w.classList.remove('d-none'); }
        else { w.textContent = ''; w.classList.add('d-none'); }
      }
      function isLabelWordV2(s, labels){ const u=(s||'').toString().trim().toUpperCase(); if (!u) return false; return labels.some(lbl=>u===String(lbl||'').toUpperCase()); }
      // Fallback exhaustivo: buscar cualquier matrícula del catálogo dentro del texto normalizado
      function findCatalogRegInTextExhaustiveV2(text){
        try {
          const U = (text||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'');
          if (!U || !aircraftByReg || aircraftByReg.size===0) return '';
          let best = '';
          for (const [key, rec] of aircraftByReg.entries()){
            const k = (key||'').toString(); if (!k) continue;
            const nk = k.replace(/[^A-Z0-9]/g,''); if (!nk) continue;
            if (U.includes(nk)){
              const canon = rec && (rec._canon || k) || k;
              // prefer longer match to avoid partials
              if (!best || nk.length > best.replace(/[^A-Z0-9]/g,'').length) best = canon;
            }
          }
          return best;
        } catch(_) { return ''; }
      }
      function findNearLabelIATACode(labels, text){
            // Robust near-label finder with offline fallback. If airports catalog isn't loaded, accept any 3-letter token not in stopwords.
            const rxIATA = /\b[A-Z]{3}\b/g;
            try{
              const lines = (text||'').split(/\r?\n/);
              const hasCatalog = !!(iataSet && typeof iataSet.has === 'function' && iataSet.size > 0);
              const isValid = (c)=>{
                if (!/^[A-Z]{3}$/.test(c)) return false;
                if (iataStopwords && iataStopwords.has(c)) return false;
                return hasCatalog ? iataSet.has(c) : true;
              };
              const search = (s)=>{ const arr = (s||'').match(rxIATA)||[]; return arr.find(isValid) || ''; };
              for (let i=0;i<lines.length;i++){
                const u = (lines[i]||'').toUpperCase();
                if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                  // Checar línea anterior, actual y siguientes
                  const hit = search(lines[i-1]) || search(lines[i]) || search(lines[i+1]) || search(lines[i+2]) || '';
                  if (hit) return hit;
                }
              }
              // Pista alternativa: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior como candidata
              for (let i=0;i<lines.length;i++){
                if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(lines[i])){
                  const hit = search(lines[i-1]||'');
                  if (hit) return hit;
                }
              }
            }catch(_){ }
            return '';
      }

      // Extra: parser de IATA desde texto libre dentro de paréntesis o tokens separados por '/' o '-' cerca del label
      window._mfParseIATAFromFreeText = function(str){
        try {
          const S = (str||'').toString().toUpperCase();
          const toks = S.split(/[\s\/-]+/).filter(Boolean);
          const hasCatalog = !!(iataSet && typeof iataSet.has === 'function' && iataSet.size > 0);
          const isValid = (c)=>{
            if (!/^[A-Z]{3}$/.test(c)) return false;
            if (iataStopwords && iataStopwords.has(c)) return false;
            return hasCatalog ? iataSet.has(c) : true;
          };
          // 1) Buscar códigos dentro de ()
          const paren = Array.from(S.matchAll(/\(([A-Z]{3})\)/g)).map(m=> m[1]);
          const c1 = paren.find(isValid); if (c1) return c1;
          // 2) Buscar tokens sueltos de 3 letras
          for (const t of toks){ if (isValid(t)) return t; }
          // 2.1) Combinar secuencias cortas de tokens (p.ej. "N L U" o "N-L-U")
          for (let i=0;i<toks.length-2;i++){
            const group = [toks[i], toks[i+1], toks[i+2]];
            if (!group.every(tok=> /^[A-Z]{1,3}$/.test(tok))) continue;
            const candidate = group.join('').replace(/[^A-Z]/g,'');
            if (isValid(candidate)) return candidate;
          }
          // 2.2) Detectar letras espaciadas dentro del texto completo ("N   L   U")
          const spaced = S.match(/(?:^|[^A-Z])([A-Z])\s+([A-Z])\s+([A-Z])(?:[^A-Z]|$)/);
          if (spaced){
            const cand = `${spaced[1]}${spaced[2]}${spaced[3]}`;
            if (isValid(cand)) return cand;
          }
          // 3) Buscar patrones tipo NOMBRE / IATA o IATA / NOMBRE en líneas cortas
          const slash = S.split('/').map(s=> s.trim());
          for (const seg of slash){ const m=(seg.match(/\b([A-Z]{3})\b/g)||[]); const hit=m.find(isValid); if (hit) return hit; }
        } catch(_){ }
        return '';
      };

      window._mfExtractFlightTypeFromContext = function(text){
        try {
          const raw = (text||'').toString();
          if (!raw.trim()) return '';
          const normalize = (s)=>{
            if (typeof s !== 'string') s = s == null ? '' : String(s);
            return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          };
          const infoByCode = (window.flightServiceTypeInfoByCode instanceof Map) ? window.flightServiceTypeInfoByCode : new Map();
          const catalog = Array.isArray(window.flightServiceTypeCatalog) ? window.flightServiceTypeCatalog : [];
          const codesSet = (function(){
            const base = window.flightServiceTypeCodes;
            if (base && typeof base.has === 'function' && base.size){
              return new Set(Array.from(base).map(c=> (c||'').toString().toUpperCase().slice(0,1)).filter(Boolean));
            }
            if (infoByCode.size){ return new Set(Array.from(infoByCode.keys()).map(k=> (k||'').toString().toUpperCase().slice(0,1)).filter(Boolean)); }
            if (catalog.length){
              return new Set(catalog.map(row=> (row?.Code||'').toString().toUpperCase().slice(0,1)).filter(Boolean));
            }
            return new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
          })();
          if (!codesSet.size) return '';
          const codesArr = Array.from(codesSet);
          const codePattern = codesArr.join('');
          const lines = raw.split(/\r?\n/);
          const upperLines = lines.map(line=> (line||'').toString().toUpperCase());
          const normLines = lines.map(line=> normalize(line||'').toLowerCase());
          const tokenLines = normLines.map(norm=> new Set(norm.split(/[^a-z0-9]+/).filter(Boolean)));
          const scoreboard = new Map();
          const record = (code, pts)=>{
            if (!code || !Number.isFinite(pts)) return;
            const up = code.toString().toUpperCase().slice(0,1);
            if (!codesSet.has(up)) return;
            const prev = scoreboard.get(up)||0;
            scoreboard.set(up, prev + pts);
          };
          const labelRegex = /(TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE|TYPE\s*OF\s*FLIGHT)/i;
          const labelIndices = [];
          upperLines.forEach((line, idx)=>{ if (labelRegex.test(line||'')) labelIndices.push(idx); });
          const distanceToLabel = (idx)=>{
            if (!labelIndices.length) return Infinity;
            let best = Infinity;
            for (const pos of labelIndices){
              const diff = Math.abs(pos - idx);
              if (diff < best) best = diff;
            }
            return best;
          };
          const weightByDistance = (idx)=>{
            const dist = distanceToLabel(idx);
            if (dist === Infinity) return 0;
            return Math.max(0, 40 - dist * 6);
          };
          const parenLetterRx = new RegExp(`\\(([${codePattern}])\\)`, 'g');
          const boundaryLetterRx = new RegExp(`(?:^|[^A-Z0-9])([${codePattern}])(?=[^A-Z0-9]|$)`, 'g');
          const mappingLetterRx = new RegExp(`([${codePattern}])\\s*[-–—:=]\\s*`, 'g');
          const markRegex = /[Xx☒☑✓✔✘✗■●◉☓]/;
          const hasPositiveWord = (idx)=>{
            const norm = normLines[idx]||'';
            return /\b(marcad[oa]|seleccionad|aplica|aplicar|check|checked|yes|si|sí)\b/.test(norm);
          };
          const hasNegativeWord = (idx)=>{
            const norm = normLines[idx]||'';
            return /\b(no aplica|no seleccionad|n\/a|no marcar|no aplicar)\b/.test(norm);
          };
          const hasInstructionWord = (idx)=>{
            const norm = normLines[idx]||'';
            return /\b(escriba|capture|anote|indique)\b/.test(norm);
          };
          const tokensFor = (code)=>{
            const upCode = (code||'').toString().toUpperCase();
            if (infoByCode && infoByCode.has && infoByCode.has(upCode)){
              const info = infoByCode.get(upCode);
              if (info && Array.isArray(info.tokens)) return info.tokens;
            }
            const row = catalog.find(r=> (r?.Code||'').toString().toUpperCase() === upCode);
            if (!row) return [];
            const text = `${row.Description||''} ${row.Type||row['Type of operation']||''} ${row.Category||''}`;
            return Array.from(new Set(normalize(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)));
          };
          const tokensByCode = new Map();
          codesArr.forEach(code=> tokensByCode.set(code, tokensFor(code)));

          if (labelIndices.length){
            const directLetterFromLabelRx = new RegExp(`(?:TIPO\\s*DE\\s*VUELO|FLIGHT\\s*TYPE|TYPE\\s*OF\\s*FLIGHT)[^A-Z0-9]{0,10}([${codePattern}])`, 'i');
            const parenFromLabelRx = new RegExp(`(?:TIPO\\s*DE\\s*VUELO|FLIGHT\\s*TYPE|TYPE\\s*OF\\s*FLIGHT)[^\n]{0,60}?\\(([${codePattern}])\\)`, 'i');
            labelIndices.forEach(idx=>{
              const line = upperLines[idx]||'';
              const direct = line.match(directLetterFromLabelRx);
              if (direct && direct[1]) record(direct[1], 120);
              const paren = line.match(parenFromLabelRx);
              if (paren && paren[1]) record(paren[1], 108);
              const nextLine = upperLines[idx+1]||'';
              const leading = nextLine.match(new RegExp(`^\\s*([${codePattern}])\\b`));
              if (leading && leading[1]) record(leading[1], 86);
              const nextLineMatches = (lines[idx+1]||'').toUpperCase().match(parenLetterRx);
              if (nextLineMatches){ nextLineMatches.forEach(letter=> record(letter, 80)); }
            });
          }

          for (let idx=0; idx<upperLines.length; idx++){
            const upper = upperLines[idx]||'';
            if (!upper.trim()) continue;
            const tokens = tokenLines[idx] || new Set();
            const base = weightByDistance(idx);
            let penalty = 0;
            if (hasNegativeWord(idx)) penalty += 18;
            if (hasInstructionWord(idx)) penalty += 10;

            parenLetterRx.lastIndex = 0;
            let parenMatch;
            while ((parenMatch = parenLetterRx.exec(upper))){
              const letter = parenMatch[1];
              let score = 22 + base;
              if (markRegex.test(upper)) score += 18;
              const tokList = tokensByCode.get(letter) || [];
              if (tokList.length){
                let hits = 0;
                tokList.forEach(t=>{ if (tokens.has(t)) hits++; });
                if (hits) score += Math.min(30, 8 + hits * 5);
              }
              score -= penalty;
              if (score > 0) record(letter, score);
            }

            mappingLetterRx.lastIndex = 0;
            let mapMatch;
            while ((mapMatch = mappingLetterRx.exec(upper))){
              const letter = mapMatch[1];
              const restStart = mappingLetterRx.lastIndex;
              const rest = upper.slice(restStart, restStart + 80);
              const restTokens = new Set(normalize(rest).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
              const tokList = tokensByCode.get(letter) || [];
              let hits = 0;
              tokList.forEach(t=>{ if (restTokens.has(t) || tokens.has(t)) hits++; });
              if (hits){
                let score = 28 + base + Math.min(24, hits * 6);
                if (markRegex.test(upper)) score += 10;
                score -= penalty;
                if (score > 0) record(letter, score);
              }
            }

            boundaryLetterRx.lastIndex = 0;
            let boundaryMatch;
            while ((boundaryMatch = boundaryLetterRx.exec(upper))){
              const letter = boundaryMatch[1];
              let score = 8 + base;
              if (markRegex.test(upper)) score += 26;
              if (hasPositiveWord(idx)) score += 16;
              const tokList = tokensByCode.get(letter) || [];
              if (tokList.length){
                let hits = 0;
                tokList.forEach(t=>{ if (tokens.has(t)) hits++; });
                if (hits) score += Math.min(20, hits * 5);
              }
              if (letter === 'X' && score < 60 && !tokens.has('tecnica')) score -= 6;
              score -= penalty;
              if (score > 0) record(letter, score);
            }
          }

          const contextIndices = new Set();
          if (labelIndices.length){
            labelIndices.forEach(i=>{
              for (let j=i-6; j<=i+14; j++){
                if (j>=0 && j<lines.length) contextIndices.add(j);
              }
            });
          } else {
            for (let j=0; j<lines.length; j++) contextIndices.add(j);
          }
          const contextTokens = new Set();
          contextIndices.forEach(idx=>{
            tokenLines[idx]?.forEach(tok=> contextTokens.add(tok));
          });
          tokensByCode.forEach((tokList, code)=>{
            if (!tokList.length) return;
            let hits = 0;
            tokList.forEach(t=>{ if (contextTokens.has(t)) hits++; });
            if (hits >= 2) record(code, Math.min(30, 12 + hits * 3));
          });

          if (!scoreboard.size) return '';
          const sorted = Array.from(scoreboard.entries()).sort((a,b)=> b[1] - a[1]);
          let [bestCode, bestScore] = sorted[0];
          const secondScore = sorted[1]?.[1] || 0;
          if (bestScore < 26) return '';
          if (bestCode === 'X' && bestScore < 48){
            const alt = sorted.find(([code, score])=> code !== 'X' && score >= bestScore - 6 && score >= 32);
            if (alt){ bestCode = alt[0]; bestScore = alt[1]; }
          }
          if (sorted.length > 1 && bestScore - secondScore <= 4){
            const contextHits = (code)=>{
              const tokList = tokensByCode.get(code) || [];
              let hits = 0;
              tokList.forEach(t=>{ if (contextTokens.has(t)) hits++; });
              return hits;
            };
            const bestHits = contextHits(bestCode);
            const secondHits = contextHits(sorted[1][0]);
            if (secondHits > bestHits){
              bestCode = sorted[1][0];
              bestScore = sorted[1][1];
            }
          }
          return bestCode;
        } catch(_){ return ''; }
      };

          // Extrae ORIGEN DEL VUELO: nombre completo y/o código IATA, usando pistas de líneas
          function extractArrivalOriginFields(text){
            const out = { name:'', code:'' };
            try {
              const lines = (text||'').toString().split(/\r?\n/);
              const rxIATA = /\b([A-Z]{3})\b/;
              const norm = (s)=> (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
              const bestFuzzy = (phrase)=>{
                const NP = norm(phrase); if (!NP) return null;
                const pTok = NP.split(' ').filter(Boolean);
                let best=null, bestScore=0;
                for (const rec of airportNameIndex){
                  if (!rec || !rec.norm) continue;
                  if (NP.includes(rec.norm) || rec.norm.includes(NP)) return rec;
                  const inter = rec.tokens.filter(t=> pTok.includes(t));
                  const score = inter.length / Math.max(1, rec.tokens.length);
                  if (score > bestScore && (inter.length>=2 || score>=0.6)) { best = rec; bestScore = score; }
                }
                return best;
              };
              const isNameLine = (s)=>{
                if (!s) return false;
                const t = s.trim(); if (!t) return false;
                // Evitar que sea solo un código
                if (/^\s*[A-Z]{3}\s*$/.test(t)) return false;
                // Debe tener letras y espacios y longitud razonable
                return /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) && t.length >= 6;
              };
              const LABELS = [
                /ORIGEN\s+DEL\s+VUELO/i,
                /ORIGEN\s+DE\s+VUELO/i,
                /PROCEDENCIA\s+DEL\s+VUELO/i,
                /PROCEDENCIA\s+DE\s+VUELO/i,
                /PROCEDENCIA\b/i,
                /FROM\b/i
              ];
              let fallbackInlineName = '';
              const extractInlineAfterLabel = (line, labelMatch)=>{
                if (!line || !labelMatch) return { name:'', code:'' };
                const start = labelMatch.index + labelMatch[0].length;
                let remainder = line.slice(start).replace(/\s+/g, ' ').trim();
                if (!remainder) return { name:'', code:'' };
                const inlineCodes = (remainder.toUpperCase().match(/\b([A-Z]{3})\b/g) || []).filter(c => iataSet.has(c) && !iataStopwords.has(c));
                let code = inlineCodes.length ? inlineCodes[inlineCodes.length - 1] : '';
                if (code){
                  const rxCode = new RegExp(`\\b${code}\\b`);
                  remainder = remainder.replace(rxCode, '').replace(/[\-–—]+$/, '').trim();
                }
                const name = remainder.trim();
                return { name, code };
              };
              for (let i=0;i<lines.length;i++){
                const line = lines[i]||'';
                let matchedRx = null;
                let matchedInfo = null;
                for (const rx of LABELS){
                  const m = rx.exec(line);
                  if (m){ matchedRx = rx; matchedInfo = m; break; }
                }
                if (matchedRx){
                  // Código: puede venir en la misma línea después del label
                  try {
                    const mSame = line.toUpperCase().match(/\b([A-Z]{3})\b/);
                    if (mSame && mSame[1] && iataSet.has(mSame[1]) && !iataStopwords.has(mSame[1])) out.code = mSame[1];
                  } catch(_){ }
                  // Analizar lo que viene justo después del label en la misma línea
                  const inline = extractInlineAfterLabel(line, matchedInfo);
                  if (inline.code && !out.code) out.code = inline.code;
                  if (inline.name){
                    const rec = bestFuzzy(inline.name);
                    if (rec && !out.name){ out.name = rec.name; if (!out.code) out.code = rec.iata; }
                    else if (!rec && !fallbackInlineName) fallbackInlineName = inline.name;
                  }
                  // 1) Nombre: si la siguiente línea pide registrar nombre, tomar la anterior
                  if (/NOMBRE\s+COMPLETO\s+DEL\s+AEROPUERTO/i.test(lines[i+1]||'') || /REGISTRAR\s+NOMBRE\s+COMPLETO\s+DEL\s+AEROPUERTO/i.test(lines[i+1]||'')){
                    const cand = (lines[i-1]||'').trim();
                    if (isNameLine(cand)){
                      const rec = bestFuzzy(cand);
                      if (rec){ out.name = rec.name; if (!out.code) out.code = rec.iata; }
                      else { out.name = cand; }
                    }
                  }
                  // Si aún no hay nombre, buscar en ventana alrededor
                  if (!out.name){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    for (const s of win){ if (isNameLine(s||'')){ const cand=(s||'').trim(); const rec = bestFuzzy(cand); if (rec){ out.name = rec.name; if (!out.code) out.code = rec.iata; } else { out.name = cand; } break; } }
                  }
                  // 2) Código: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior
                  for (let j=i-2;j<=i+4;j++){
                    const L = lines[j]||'';
                    if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(L)){
                      const prev = lines[j-1]||'';
                      const arr = (prev.toUpperCase().match(/\b([A-Z]{3})\b/g)||[]);
                      const hit = arr.find(c=> iataSet.has(c) && !iataStopwords.has(c));
                      if (hit){ out.code = hit; break; }
                    }
                  }
                  // Si no hay aún código, buscar 3 letras cercanas
                  if (!out.code){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    const pick = (s)=>{ const arr=(s||'').toUpperCase().match(/\b([A-Z]{3})\b/g)||[]; return arr.find(c=> iataSet.has(c) && !iataStopwords.has(c)); };
                    for (const s of win){ const hit = pick(s); if (hit){ out.code = hit; break; } }
                  }
                  break;
                }
              }
              if (!out.name && fallbackInlineName) out.name = fallbackInlineName;
              // Cross-fill con catálogos
              if (out.name && !out.code){
                const key = out.name.trim().toLowerCase();
                const c = airportByName.get(key);
                if (c) out.code = c;
              }
              if (out.code && !out.name){
                const nm = airportByIATA.get(out.code);
                if (nm) out.name = nm;
              }
              if (out.code && out.name){
                const canonical = airportByIATA.get(out.code);
                if (canonical){
                  if (norm(out.name) !== norm(canonical)) out.name = canonical;
                } else {
                  const key = out.name.trim().toLowerCase();
                  const c = airportByName.get(key);
                  if (c && c !== out.code){ out.code = c; }
                }
              }
            } catch(_){ }
            return out;
          }

          // Extrae ESCALA ANTERIOR (Última escala): nombre completo y/o código IATA
          function extractArrivalLastStopFields(text){
            const out = { name:'', code:'' };
            try {
              const lines = (text||'').toString().split(/\r?\n/);
              const rxIATA = /\b([A-Z]{3})\b/;
              const norm = (s)=> (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
              const bestFuzzy = (phrase)=>{
                const NP = norm(phrase); if (!NP) return null;
                const pTok = NP.split(' ').filter(Boolean);
                let best=null, bestScore=0;
                for (const rec of airportNameIndex){
                  if (!rec || !rec.norm) continue;
                  if (NP.includes(rec.norm) || rec.norm.includes(NP)) return rec;
                  const inter = rec.tokens.filter(t=> pTok.includes(t));
                  const score = inter.length / Math.max(1, rec.tokens.length);
                  if (score > bestScore && (inter.length>=2 || score>=0.6)) { best = rec; bestScore = score; }
                }
                return best;
              };
              const isNameLine = (s)=>{
                if (!s) return false;
                const t = s.trim(); if (!t) return false;
                if (/^\s*[A-Z]{3}\s*$/.test(t)) return false;
                return /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t) && t.length >= 6;
              };
              const LABELS = [
                /ESCALA\s+ANTERIOR(?:\s+DEL\s+VUELO)?/i,
                /ÚLTIMA\s+ESCALA(?:\s+DEL\s+VUELO)?/i,
                /ULTIMA\s+ESCALA(?:\s+DEL\s+VUELO)?/i,
                /ESCALA\s+DEL\s+VUELO/i,
                /LAST\s+STOP/i
              ];
              let fallbackInlineName = '';
              const extractInlineAfterLabel = (line, labelMatch)=>{
                if (!line || !labelMatch) return { name:'', code:'' };
                const start = labelMatch.index + labelMatch[0].length;
                let remainder = line.slice(start).replace(/\s+/g, ' ').trim();
                if (!remainder) return { name:'', code:'' };
                const inlineCodes = (remainder.toUpperCase().match(/\b([A-Z]{3})\b/g) || []).filter(c => iataSet.has(c) && !iataStopwords.has(c));
                let code = inlineCodes.length ? inlineCodes[inlineCodes.length - 1] : '';
                if (code){
                  const rxCode = new RegExp(`\\b${code}\\b`);
                  remainder = remainder.replace(rxCode, '').replace(/[\-–—]+$/, '').trim();
                }
                const name = remainder.trim();
                return { name, code };
              };
              for (let i=0;i<lines.length;i++){
                const line = lines[i]||'';
                let matchedRx = null;
                let matchedInfo = null;
                for (const rx of LABELS){
                  const m = rx.exec(line);
                  if (m){ matchedRx = rx; matchedInfo = m; break; }
                }
                if (matchedRx){
                  // Código en la MISMA línea del label (p.ej. "ESCALA ANTERIOR ABC")
                  try {
                    const mSame = line.toUpperCase().match(/\b([A-Z]{3})\b/);
                    if (mSame && mSame[1] && iataSet.has(mSame[1]) && !iataStopwords.has(mSame[1])) out.code = mSame[1];
                  } catch(_){ }
                  const inline = extractInlineAfterLabel(line, matchedInfo);
                  if (inline.code && !out.code) out.code = inline.code;
                  if (inline.name){
                    const rec = bestFuzzy(inline.name);
                    if (rec && !out.name){ out.name = rec.name; if (!out.code) out.code = rec.iata; }
                    else if (!rec && !fallbackInlineName) fallbackInlineName = inline.name;
                  }
                  // Nombre: si la siguiente línea pide registrar nombre, tomar la anterior
                  if (/NOMBRE\s+COMPLETO\s+DEL\s+AEROPUERTO/i.test(lines[i+1]||'') || /REGISTRAR\s+NOMBRE\s+COMPLETO\s+DEL\s+AEROPUERTO/i.test(lines[i+1]||'')){
                    const cand = (lines[i-1]||'').trim();
                    if (isNameLine(cand)){
                      const rec = bestFuzzy(cand);
                      if (rec){ out.name = rec.name; if (!out.code) out.code = rec.iata; }
                      else { out.name = cand; }
                    }
                  }
                  // Si aún no hay nombre, buscar en ventana alrededor
                  if (!out.name){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    for (const s of win){ if (isNameLine(s||'')){ const cand=(s||'').trim(); const rec = bestFuzzy(cand); if (rec){ out.name = rec.name; if (!out.code) out.code = rec.iata; } else { out.name = cand; } break; } }
                  }
                  // Pista: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior
                  for (let j=i-2;j<=i+4;j++){
                    const L = lines[j]||'';
                    if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(L)){
                      const prev = lines[j-1]||'';
                      const arr = (prev.toUpperCase().match(/\b([A-Z]{3})\b/g)||[]);
                      const hit = arr.find(c=> iataSet.has(c) && !iataStopwords.has(c));
                      if (hit){ out.code = hit; break; }
                    }
                  }
                  // Si no hay aún código, buscar 3 letras cercanas
                  if (!out.code){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    const pick = (s)=>{ const arr=(s||'').toUpperCase().match(/\b([A-Z]{3})\b/g)||[]; return arr.find(c=> iataSet.has(c) && !iataStopwords.has(c)); };
                    for (const s of win){ const hit = pick(s); if (hit){ out.code = hit; break; } }
                  }
                  break;
                }
              }
              if (!out.name && fallbackInlineName) out.name = fallbackInlineName;
              // Cross-fill con catálogos
              if (out.name && !out.code){
                const key = out.name.trim().toLowerCase();
                const c = airportByName.get(key);
                if (c) out.code = c;
              }
              if (out.code && !out.name){
                const nm = airportByIATA.get(out.code);
                if (nm) out.name = nm;
              }
              if (out.code && out.name){
                const canonical = airportByIATA.get(out.code);
                if (canonical){
                  if (norm(out.name) !== norm(canonical)) out.name = canonical;
                } else {
                  const key = out.name.trim().toLowerCase();
                  const c = airportByName.get(key);
                  if (c && c !== out.code){ out.code = c; }
                }
              }
            } catch(_){ }
            return out;
          }

      // Heurística robusta para mapear Origen / Próxima escala / Destino en documentos de Salida
      function extractDepartureRouteFields(text){
        const Ulines = (text||'').toUpperCase().split(/\r?\n/);
        const allCodes = [];
        const labelHit = (u, labels)=> labels.some(l=> u.includes(l));
        const L_ORI = ['ORIGEN','PROCEDENCIA','FROM'];
        const L_ESC = ['ESCALA','PROXIMA','PRÓXIMA','LAST STOP'];
        const L_DES = ['DESTINO','TO'];
        const rxIATA = /\b[A-Z]{3}\b/g;
        // Recorre líneas y registra ocurrencias de códigos con contexto de etiqueta
        for (let i=0;i<Ulines.length;i++){
          const u = Ulines[i];
          const codes = u.match(rxIATA)||[];
          if (!codes.length) continue;
          const isOri = labelHit(u, L_ORI) || labelHit(Ulines[i-1]||'', L_ORI) || labelHit(Ulines[i+1]||'', L_ORI);
          const isEsc = labelHit(u, L_ESC) || labelHit(Ulines[i-1]||'', L_ESC) || labelHit(Ulines[i+1]||'', L_ESC);
          const isDes = labelHit(u, L_DES) || labelHit(Ulines[i-1]||'', L_DES) || labelHit(Ulines[i+1]||'', L_DES);
          for (const c of codes){ if (iataSet.has(c)) allCodes.push({ code:c, i, isOri, isEsc, isDes }); }
        }
        // Scores por etiqueta y proximidad
        const score = new Map();
        const firstIdx = new Map();
        allCodes.forEach(rec=>{
          if (!score.has(rec.code)) score.set(rec.code, {ori:0,esc:0,des:0});
          if (!firstIdx.has(rec.code)) firstIdx.set(rec.code, rec.i);
          const s = score.get(rec.code);
          if (rec.isOri) s.ori += 3; if (rec.isEsc) s.esc += 3; if (rec.isDes) s.des += 3;
          // Ligero sesgo por orden de aparición
          s.ori += 0.02; s.esc += 0.02; s.des += 0.02;
        });
        // Fallback: si no hay contextos, tomar los primeros 3 únicos del texto
        const uniqueInOrder = [];
        for (const rec of allCodes){ if (!uniqueInOrder.includes(rec.code)) uniqueInOrder.push(rec.code); }
        function pickBest(kind){
          let best=''; let bestScore=-1; let bestPos=1e9;
          for (const [code, sc] of score){ const val = sc[kind]||0; const pos = firstIdx.get(code)||1e9; if (val>bestScore || (val===bestScore && pos<bestPos)){ best=code; bestScore=val; bestPos=pos; } }
          if (!best && uniqueInOrder.length) best = uniqueInOrder.shift();
          // Evitar reutilizar el mismo código en las siguientes selecciones
          score.delete(best); firstIdx.delete(best); return best||'';
        }
        const originCode = pickBest('ori');
        const nextCode = pickBest('esc');
        const destCode = pickBest('des');
        const toName = (c)=> airportByIATA.get(c)||'';
        return {
          origin: { code: originCode||'', name: originCode? toName(originCode):'' },
          next: { code: nextCode||'', name: nextCode? toName(nextCode):'' },
          dest: { code: destCode||'', name: destCode? toName(destCode):'' }
        };
      }
      // Re-habilitar controles bajo cualquier protocolo para propósitos de prueba
      const scanPdfBtn = document.getElementById('manifest-scan-pdf');
      const scanOcrBtn = document.getElementById('manifest-scan-ocr');
      function setScanButtonBusy(isBusy, label){
        if (!scanPdfBtn) return;
        if (!scanPdfBtn.dataset.originalHtml){ scanPdfBtn.dataset.originalHtml = scanPdfBtn.innerHTML; }
        if (isBusy){
          scanPdfBtn.disabled = true;
          scanPdfBtn.classList.add('is-scanning');
          scanPdfBtn.setAttribute('aria-busy','true');
          const text = label || 'Escaneando…';
          scanPdfBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text}`;
        } else {
          scanPdfBtn.classList.remove('is-scanning');
          scanPdfBtn.removeAttribute('aria-busy');
          if (scanPdfBtn.dataset.originalHtml) scanPdfBtn.innerHTML = scanPdfBtn.dataset.originalHtml;
          scanPdfBtn.disabled = false;
        }
      }
      if (upload) upload.disabled = false;
      if (scanPdfBtn) scanPdfBtn.disabled = false;
      if (status && !status._initV2){ status._initV2 = 1; status.classList.remove('text-danger'); status.textContent = 'V2 activo: seleccione un archivo y presione Escanear.'; }
  // Attach NA toggles (V2) and convert to 24h text inputs if forced
  try {
    (window._mfTimeFieldIds||[]).forEach(id=> _attachNaToggle(id));
    if (window._mfForce24hText){ (window._mfTimeFieldIds||[]).forEach(id=> _convertTimeInputToText24h(id)); }
  } catch(_){ }
      // V2: warm up PDF.js and OCR scheduler in the background; populate time datalist
      try {
        const idle = (fn)=>{ if (window.requestIdleCallback) requestIdleCallback(()=>setTimeout(fn,50)); else setTimeout(fn,300); };
        idle(async ()=>{ try { await ensurePdfJsLite(); } catch(_){} });
        idle(async ()=>{ try { await window.ensureOcrScheduler?.(); } catch(_){} });
        idle(()=>{
          try {
            const dl = document.getElementById('hhmm-24-list'); if (!dl || dl._filled) return; dl._filled = 1;
            const opts = [];
            for (let h=0; h<24; h++){
              for (let m=0; m<60; m+=5){
                const H = String(h).padStart(2,'0'); const M = String(m).padStart(2,'0');
                const opt = document.createElement('option'); opt.value = `${H}:${M}`; opts.push(opt);
              }
            }
            // Append once
            const frag = document.createDocumentFragment(); opts.forEach(o=>frag.appendChild(o)); dl.appendChild(frag);
          } catch(_){ }
        });
      } catch(_){ }

      // V2: poblar datalists de catálogos (ICAO/IATA, matrículas, tipos de aeronave) y reponer botones de catálogo (🔎)
      async function populateCatalogDatalistsOnce(){
        try {
          // Espera a que los catálogos locales estén listos
          try { await _v2CatalogsReady; } catch(_){}
          // Aerolíneas (ICAO)
          try {
            const dl = document.getElementById('airlines-icao-list');
            if (dl && !dl._filled){
              dl._filled = 1;
              const frag = document.createDocumentFragment();
              (airlinesCatalog||[]).forEach(a=>{
                if (!a || !a.ICAO) return;
                const opt = document.createElement('option');
                opt.value = a.ICAO;
                opt.label = a.Name || a.ICAO;
                frag.appendChild(opt);
              });
              dl.appendChild(frag);
            }
          } catch(_){ }
          // Aeronaves (matrículas)
          try {
            const dl = document.getElementById('aircraft-reg-list');
            if (dl && !dl._filled){
              dl._filled = 1;
              const frag = document.createDocumentFragment();
              // aircraftByReg contiene entradas por clave canónica y normalizada; evitar duplicados mostrando sólo canónicas
              const added = new Set();
              for (const [key, rec] of (aircraftByReg||new Map()).entries()){
                const canon = (rec && rec._canon) || key;
                if (!canon || added.has(canon)) continue;
                added.add(canon);
                const labelParts = [];
                if (rec && rec.type){ labelParts.push(rec.type); }
                try {
                  const t = rec && rec.type ? (typeByCode.get(rec.type)||null) : null;
                  if (t && t.Name) labelParts.push(t.Name);
                } catch(_){ }
                if (rec && rec.ownerIATA){
                  const air = (airlinesCatalog||[]).find(x=> (x.IATA||'') === rec.ownerIATA);
                  if (air && air.Name) labelParts.push(air.Name);
                }
                const opt = document.createElement('option');
                opt.value = canon;
                if (labelParts.length) opt.label = labelParts.join(' · ');
                dl.appendChild(opt);
              }
            }
          } catch(_){ }
          // Tipos de aeronave (ICAO)
          try {
            const dl = document.getElementById('aircraft-type-icao-list');
            if (dl && !dl._filled){
              dl._filled = 1;
              // Construir índice ICAO->Nombre desde typeByCode
              const icaoToName = new Map();
              try { for (const [,v] of (typeByCode||new Map()).entries()){ if (v && v.ICAO){ icaoToName.set(v.ICAO, v.Name||''); } } } catch(_){ }
              const list = Array.from(typeIcaoSetV2||new Set());
              list.sort();
              const frag = document.createDocumentFragment();
              list.forEach(code=>{
                const opt = document.createElement('option'); opt.value = code; const nm = icaoToName.get(code); if (nm) opt.label = nm; frag.appendChild(opt);
              });
              dl.appendChild(frag);
            }
          } catch(_){ }
          // Aeropuertos (IATA y Nombre)
          try {
            const dlIata = document.getElementById('airports-iata-list');
            const dlName = document.getElementById('airports-name-list');
            if (dlIata && !dlIata._filled){
              dlIata._filled = 1;
              const frag = document.createDocumentFragment();
              const all = Array.from(airportByIATA?.entries?.()||[]).sort((a,b)=> a[0].localeCompare(b[0]));
              all.forEach(([iata, name])=>{ const opt=document.createElement('option'); opt.value=iata; if (name) opt.label=name; frag.appendChild(opt); });
              dlIata.appendChild(frag);
            }
            if (dlName && !dlName._filled){
              dlName._filled = 1;
              const frag = document.createDocumentFragment();
              const all = Array.from(airportByIATA?.entries?.()||[]).sort((a,b)=> (a[1]||'').localeCompare(b[1]||'', 'es', { sensitivity:'base' }));
              all.forEach(([iata, name])=>{ const opt=document.createElement('option'); opt.value=name||iata; opt.label = iata; frag.appendChild(opt); });
              dlName.appendChild(frag);
            }
          } catch(_){ }
        } catch(_){ }
      }
      // Adjuntar botones de catálogo (🔎) como en V1, pero desde V2
      function attachCatalogButtonsV2(){
        try {
          // Matrículas: al elegir, completar Equipo (tipo) y Transportista
          window._mfAttachCatalogButton?.('mf-tail', { load:'aircraft', onPick:(it)=>{
            try {
              const typeName = it?.meta?.typeName || it?.meta?.type || '';
              const ownerICAO = it?.meta?.ownerICAO || '';
              const ownerName = it?.meta?.ownerName || '';
              const elType = document.getElementById('mf-aircraft'); if (elType && typeName) elType.value = typeName;
              const elCarr = document.getElementById('mf-carrier-3l'); if (elCarr && ownerICAO) elCarr.value = ownerICAO;
              const elOp = document.getElementById('mf-operator-name'); if (elOp && ownerName) elOp.value = ownerName;
            } catch(_){ }
          }});
        } catch(_){ }
        try {
          // Aerolíneas: vincular nombre comercial y OACI
          window._mfAttachCatalogButton?.('mf-airline', { load:'airlines', onPick:(it)=>{
            try { const el = document.getElementById('mf-carrier-3l'); if (el && it?.meta?.icao) el.value = (it.meta.icao||'').toUpperCase(); } catch(_){ }
          }});
          window._mfAttachCatalogButton?.('mf-carrier-3l', { load:'airlines', onPick:(it, input)=>{
            try { const a = it?.meta; if (!a) return; input.value = (a.icao||'').toUpperCase(); const el = document.getElementById('mf-airline'); if (el && a.name) el.value = a.name; } catch(_){ }
          }});
          // Aeropuerto principal (Llegada/Salida)
          window._mfAttachCatalogButton?.('mf-airport-main', { load:'airports', onPick:(it, input)=>{ try { forceAirportMainValue(); } catch(_){ } }});
        } catch(_){ }
        try {
          // Pares nombre/código para origen, próxima escala, destino y sus equivalentes de llegada
          const pair = (nameId, codeId)=>{
            try {
              window._mfAttachCatalogButton?.(nameId, { load:'airports', onPick:(it, input)=>{ try { const a=it?.meta; if (!a) return; input.value = a.name||''; const codeEl=document.getElementById(codeId); if (codeEl && a.iata) codeEl.value = a.iata.toUpperCase(); } catch(_){ } }});
              window._mfAttachCatalogButton?.(codeId, { load:'airports', onPick:(it, input)=>{ try { const a=it?.meta; if (!a) return; input.value = (a.iata||'').toUpperCase(); const nameEl=document.getElementById(nameId); if (nameEl && a.name) nameEl.value = a.name; } catch(_){ } }});
            } catch(_){ }
          };
          pair('mf-origin-name','mf-origin-code');
          pair('mf-next-stop','mf-next-stop-code');
          pair('mf-final-dest','mf-final-dest-code');
          pair('mf-arr-origin-name','mf-arr-origin-code');
          pair('mf-arr-last-stop','mf-arr-last-stop-code');
        } catch(_){ }
      }
      // Programar población de datalists y botones de catálogo una vez que el DOM esté listo y catálogos cargados
      try {
        (async ()=>{ try { await _v2CatalogsReady; } catch(_){} try { await populateCatalogDatalistsOnce(); } catch(_){} try { attachCatalogButtonsV2(); } catch(_){} })();
      } catch(_){ }

      async function ensurePdfJsLite(){
        if (window.pdfjsLib) return;
        try {
          await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.crossOrigin='anonymous'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
          const lib = window['pdfjsLib'];
          if (lib && lib.GlobalWorkerOptions){
            lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            if (lib.VerbosityLevel && typeof lib.VerbosityLevel.ERRORS === 'number'){
              lib.GlobalWorkerOptions.verbosity = lib.VerbosityLevel.ERRORS;
              try { lib.verbosity = lib.VerbosityLevel.ERRORS; } catch(_){ }
            }
          }
        } catch(_){
          await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='vendor/pdfjs/pdf.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
          try {
            const lib = window['pdfjsLib'];
            if (lib && lib.GlobalWorkerOptions){
              lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
              if (lib.VerbosityLevel && typeof lib.VerbosityLevel.ERRORS === 'number'){
                lib.GlobalWorkerOptions.verbosity = lib.VerbosityLevel.ERRORS;
                try { lib.verbosity = lib.VerbosityLevel.ERRORS; } catch(_){ }
              }
            }
          } catch(_){ }
        }
      }

      async function ensureTesseractLite(){
        if (window.Tesseract) return;
        await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js'; s.crossOrigin='anonymous'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
      }

      // OCR Scheduler: inicializa un pool ligero (2 workers) para ejecuciones paralelas rápidas
      async function ensureOcrScheduler(){
        try {
          await ensureTesseractLite();
          if (window._mfOcrScheduler && window._mfOcrScheduler._ok) return window._mfOcrScheduler;
          if (!window.Tesseract || !window.Tesseract.createWorker) return null;
          const { createWorker, createScheduler } = window.Tesseract;
          const scheduler = createScheduler();
          const mk = async ()=>{
            const w = await createWorker({ logger: ()=>{} });
            await w.loadLanguage('spa+eng'); await w.initialize('spa+eng'); return w;
          };
          const w1 = await mk(); const w2 = await mk();
          scheduler.addWorker(w1); scheduler.addWorker(w2);
          window._mfOcrScheduler = {
            _ok: true,
            _sch: scheduler,
            addJob: async function(type, image){
              return await scheduler.addJob(type, image);
            }
          };
          return window._mfOcrScheduler;
        } catch(_) { return null; }
      }

      async function extractPdfTextV2(file){
        try {
          await ensurePdfJsLite();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
          let text='';
          const pages = Math.min(pdf.numPages, 5);
          for (let i=1;i<=pages;i++){
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(it=>it.str).join(' ') + '\n';
            try { const pct = 30 + Math.round((i/pages)*25); setProgress(pct, `Extrayendo texto (${i}/${pages})...`); } catch(_){ }
          }
          return text.trim();
        } catch(e){ return ''; }
      }

      async function extractFolioFromPdfVector(file, maxPages=2){
        try {
          if (!file) return '';
          await ensurePdfJsLite();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
          const smart = window._mfExtractFolioDigitsSmart || function(txt){ const digits = (txt||'').toString().replace(/\D/g,''); return digits.length >= 3 ? digits.slice(-Math.min(6, digits.length)) : ''; };
          let best = '';
          let bestScore = -Infinity;
          const labelRx = /F[O0]L[I1]O/i;
          const consider = (raw, boost)=>{
            if (!raw) return;
            const digits = smart(raw);
            if (!digits) return;
            let score = boost || 0;
            const len = digits.length;
            if (len === 4) score += 8;
            else if (len === 5) score += 6;
            else if (len === 6) score += 5;
            else if (len === 3) score += 4;
            else if (len > 8) score -= 3;
            if (score > bestScore){ bestScore = score; best = digits; }
          };
          const pages = Math.min(Math.max(1, maxPages||1), pdf.numPages);
          for (let p=1; p<=pages; p++){
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const items = (content && content.items) || [];
            if (!items.length) continue;
            const rows = [];
            const tol = 4;
            for (const it of items){
              const raw = (it && it.str) || '';
              const text = raw.replace(/\s+/g,' ').trim();
              if (!text) continue;
              const tr = Array.isArray(it.transform) ? it.transform : [1,0,0,1,0,0];
              const x = Number(tr[4])||0;
              const y = Number(tr[5])||0;
              let row = null;
              for (const r of rows){ if (Math.abs(r.y - y) <= tol){ row = r; break; } }
              if (!row){ row = { y, tokens: [] }; rows.push(row); }
              row.tokens.push({ x, text: raw });
            }
            if (!rows.length) continue;
            rows.sort((a,b)=> b.y - a.y);
            const lines = rows.map(r=>{
              r.tokens.sort((a,b)=> a.x - b.x);
              return r.tokens.map(t=> t.text).join(' ').replace(/\s+/g,' ').trim();
            }).filter(Boolean);
            for (let i=0;i<lines.length;i++){
              const line = lines[i];
              const hasLabel = labelRx.test(line);
              consider(line, hasLabel ? 20 : 3);
              if (hasLabel){
                if (lines[i+1]) consider(`${line} ${lines[i+1]}`, 26);
                if (lines[i-1]) consider(`${lines[i-1]} ${line}`, 18);
              }
            }
            const topCluster = lines.slice(0,5).join(' ');
            if (topCluster) consider(topCluster, 10);
            if (best) break;
          }
          return best || '';
        } catch(_){ return ''; }
      }
      try { window._mfExtractFolioFromPdfVector = extractFolioFromPdfVector; } catch(_){ }

      // Texto con geometría (coordenadas y tamaño) para localizar etiquetas y construir ROIs rápidas
      async function extractPdfTextGeometry(file, maxPages=2){
        const out = [];
        try {
          await ensurePdfJsLite();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
          const pages = Math.min(pdf.numPages, Math.max(1, maxPages||1));
          for (let p=1;p<=pages;p++){
            const page = await pdf.getPage(p);
            const tc = await page.getTextContent();
            const items = (tc && tc.items) || [];
            const arr = items.map(it=>{
              const tr = Array.isArray(it.transform) ? it.transform : [1,0,0,1,0,0];
              const x = tr[4]||0, y = tr[5]||0; const a = Math.abs(tr[0]||0), d = Math.abs(tr[3]||0), b=Math.abs(tr[1]||0), c=Math.abs(tr[2]||0);
              const size = Math.max(a,b,c,d);
              return { str: it.str||'', x, y, size };
            }).filter(it=> (it.str||'').trim());
            // Derivar ancho de página para ROIs relativas
            const vp = page.getViewport({ scale: 1 });
            out.push({ page, pageIndex: p, width: vp.width, height: vp.height, items: arr });
          }
        } catch(_){}
        return out;
      }

      // OCR dirigido a ROIs cerca de etiquetas, para completar campos faltantes sin OCR de página completa
  async function ocrPdfTargeted(file, want={ pilot: true, license: true, tail: true, folio: false, arrivalMain: false, flightType: false }){
        try {
          // Extractor de nombre de piloto dentro de un ROI sin depender de que aparezca la etiqueta
          if (!window._mfExtractPilotNameFromROI){
            window._mfExtractPilotNameFromROI = function(txt){
              try {
                const rawText = (txt||'').toString();
                if (!rawText) return '';
                const directAfter = _mfPilotPickAfterMando(rawText);
                if (directAfter) return directAfter;
                const upper = rawText.toUpperCase();
                const afterLabel = upper.match(/MANDO\s+([A-ZÁÉÍÓÚÑ'’\-\.\s]+)/);
                if (afterLabel && afterLabel[1]){
                  const direct = _mfPilotSanitizeRawCandidate(afterLabel[1]);
                  if (direct) return direct;
                }
                const STOP = new Set(['PILOTO','AL','MANDO','CAPITAN','CAPITÁN','CAP','CPT','COMANDANTE','NOMBRE','FIRMA','LICENCIA','NO','Nº','N°','Y','OPERADOR','COORDINADOR','ADMINISTRADOR']);
                const lines = upper.split(/\r?\n/).map(s=> s.trim()).filter(Boolean);
                let best = '';
                const consider = (candidate, scoreBoost)=>{
                  const cleaned = _mfPilotSanitizeRawCandidate(candidate || '');
                  if (!cleaned) return;
                  if (/(CARAC|ALFAN|NACION|MARCA|MATRIC|TRIPUL|RESERV|ADMIN|CONTROL|OBSERV)/i.test(cleaned)) return;
                  const tokens = cleaned.split(/\s+/).filter(Boolean);
                  if (tokens.length < 2 || tokens.length > 5) return;
                  const bad = tokens.some(tok=> STOP.has(tok));
                  if (bad) return;
                  const score = (cleaned.length) + (scoreBoost || 0);
                  if (score > (best ? best.score : -Infinity)) best = { text: cleaned, score };
                };
                for (let i=0;i<lines.length;i++){
                  let line = lines[i];
                  if (!line) continue;
                  line = line.replace(/[•:\-–—]+/g,' ').replace(/\s+/g,' ').trim();
                  consider(line, 0);
                  if (line.includes('MANDO')){
                    const tail = line.split('MANDO').slice(1).join('MANDO');
                    consider(tail, 12);
                  }
                  if (lines[i+1]) consider(`${line} ${lines[i+1]}`, -4);
                  if (lines[i-1]) consider(`${lines[i-1]} ${line}`, -6);
                }
                if (best && best.text) return best.text;
                const fallback = _mfPilotFindFallbackInText(rawText);
                return fallback || '';
              } catch(_){ return ''; }
            };
          }
          const geoPages = await extractPdfTextGeometry(file, 2);
          if (!geoPages || !geoPages.length) return {};
          await ensureOcrScheduler();
          const results = {};
          const makeCrop = async (pg, roi)=>{
            // Render rápido de página a escala media y recortar ROI
            const scale = 2.0; // ROI de alta calidad para mantener precisión en modo rápido
            const vp = (function(pg2){ try { const eff = (((pg2.page.rotate||0)%360)+360)%360; return eff===180? pg2.page.getViewport({ scale, rotation: 180 }) : pg2.page.getViewport({ scale }); } catch(_){ return pg2.page.getViewport({ scale }); } })(pg);
            const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
            const ctx = cv.getContext('2d'); await pg.page.render({ canvasContext: ctx, viewport: vp }).promise;
            const rx = Math.max(0, Math.min(vp.width, roi.x * scale));
            const ry = Math.max(0, Math.min(vp.height, (pg.height - roi.y - roi.h) * scale)); // invertir Y
            const rw = Math.max(1, Math.min(vp.width - rx, roi.w * scale));
            const rh = Math.max(1, Math.min(vp.height - ry, roi.h * scale));
            const sub = document.createElement('canvas'); sub.width = Math.ceil(rw); sub.height = Math.ceil(rh);
            const sctx = sub.getContext('2d'); sctx.drawImage(cv, rx, ry, rw, rh, 0, 0, rw, rh);
            return sub.toDataURL('image/png');
          };
          const OCR = async (dataUrl)=>{
            try {
              if (window._mfOcrScheduler){ const out = await window._mfOcrScheduler.addJob('recognize', dataUrl); return (out&&out.data&&out.data.text)||''; }
              const { data } = await Tesseract.recognize(dataUrl, 'spa+eng', { logger: ()=>{} }); return data && data.text || '';
            } catch(_) { return ''; }
          };
          const makeRois = (pg, labelRegex, rightWidthFrac=0.6, options)=>{
            if (typeof rightWidthFrac === 'object' && options === undefined){
              options = rightWidthFrac;
              rightWidthFrac = (options && typeof options.rightWidthFrac === 'number') ? options.rightWidthFrac : 0.6;
            } else {
              options = options || {};
            }
            const offsetX = typeof options.offsetX === 'number' ? options.offsetX : 10;
            const minWidth = typeof options.minWidth === 'number' ? options.minWidth : 140;
            const verticalStretch = typeof options.verticalStretch === 'number' ? options.verticalStretch : 3.0;
            const extraBelow = options.extraBelowCentered === true;
            const extraWidthFrac = typeof options.centerWidthFrac === 'number' ? options.centerWidthFrac : 0.45;
            const extraPad = typeof options.centerPad === 'number' ? options.centerPad : 20;
            const fallbackTop = options.fallbackTop === true;
            const items = pg.items;
            const labelHits = [];
            const U = (s)=> (s||'').toUpperCase();
            for (let i=0;i<items.length;i++){
              const s = U(items[i].str);
              if (labelRegex.test(s)){
                // bbox básico del token
                labelHits.push({ x: items[i].x, y: items[i].y, size: items[i].size });
              }
            }
            const rois = [];
            for (const h of labelHits){
              const x = h.x + offsetX;
              const y = h.y - h.size*0.5;
              const hgt = h.size * verticalStretch;
              const w = Math.max(minWidth, pg.width * rightWidthFrac);
              rois.push({ x, y, w, h: hgt });
              // ROI adicional debajo (por si el nombre está en la siguiente línea)
              rois.push({ x, y: y + hgt*0.75, w, h: hgt });
              if (extraBelow){
                const bw = Math.max(minWidth, pg.width * extraWidthFrac);
                const bx = Math.max(0, h.x - extraPad);
                const by = h.y + h.size * 0.3;
                rois.push({ x: bx, y: by, w: bw, h: hgt });
                rois.push({ x: bx, y: by + hgt*0.8, w: bw, h: hgt });
              }
            }
            if (!rois.length && fallbackTop){
              const topOffsetFrac = typeof options.fallbackTopOffsetFrac === 'number' ? options.fallbackTopOffsetFrac : 0.015;
              const heightFrac = typeof options.fallbackHeightFrac === 'number' ? options.fallbackHeightFrac : 0.22;
              const leftFrac = typeof options.fallbackLeftFrac === 'number' ? options.fallbackLeftFrac : 0.05;
              const widths = Array.isArray(options.fallbackWidths) && options.fallbackWidths.length ? options.fallbackWidths : [0.45, 0.65, 0.85];
              const baseY = pg.height * topOffsetFrac;
              const hgt = pg.height * heightFrac;
              widths.forEach(frac=>{
                const w = Math.max(minWidth, pg.width * frac);
                const x = Math.max(0, pg.width * leftFrac);
                rois.push({ x, y: baseY, w, h: hgt });
                rois.push({ x, y: baseY + hgt * 0.9, w, h: hgt });
              });
            }
            return rois;
          };
          const arrivalSynonyms = [
            { rx: /\bAIFA\b/i, code: 'NLU' },
            { rx: /FELIPE\s+ANGELES/i, code: 'NLU' },
            { rx: /SANTA\s+LUCIA/i, code: 'NLU' }
          ];
          const extractFolioDigits = (txt)=> window._mfExtractFolioDigitsSmart?.(txt) || '';
          const wantPilot = !!want.pilot, wantLic = !!want.license, wantTail = !!want.tail, wantFolio = !!want.folio, wantArrival = !!want.arrivalMain, wantFlightType = !!want.flightType;
          for (const pg of geoPages){
            if (wantPilot && !results.pilot){
              const rx = /(PILOTO\s+AL\s+MANDO|NOMBRE\s+Y\s+FIRMA.*PILOTO.*MANDO|PILOTO\b|CAPIT[ÁA]N\b|CAP\.|CPT\b|COMANDANTE\b)/i;
              const rois = makeRois(pg, rx, 0.55);
              for (const r of rois){
                const img = await makeCrop(pg, r);
                const txt = await OCR(img);
                const p1 = (window._mfExtractPilotUpperNearLabel?.(txt)||'').trim();
                const p2 = p1 || (window._mfExtractPilotNameFromROI?.(txt)||'').trim();
                if (p2){ results.pilot = p2; break; }
              }
            }
            if (wantLic && !results.license){
              const rx = /(N(?:[O0]|[º°])\.?\s*(?:LIC|L\s*[I1]\s*C)|LICENCIA|LIC\.)/i;
              const rois = makeRois(pg, rx, 0.5);
              for (const r of rois){ const img = await makeCrop(pg, r); const txt = await OCR(img); const lic = (window._mfExtractPilotLicenseExhaustive?.(txt)||'').trim(); if (lic){ results.license = lic; break; } }
            }
            if (wantTail && !results.tail){
              const rx = /(MATR[IÍ]CULA|REGISTRATION|REGISTRO|AERONAVE|EQUIPO)/i;
              const rois = makeRois(pg, rx, 0.5);
              for (const r of rois){ const img = await makeCrop(pg, r); const txt = (await OCR(img))||'';
                // usar patrones ya robustos
                const tailPatterns = [
                  /\bX[A-C]-?[A-Z0-9]{3,6}\b/gi, /\bN\d{1,5}[A-Z]{0,3}\b/gi, /\bH[KP]-?[0-9A-Z]{3,8}\b/gi, /\bLV-?[A-Z0-9]{3,5}\b/gi,
                  /\bCC-?[A-Z0-9]{3,5}\b/gi, /\bPR-?[A-Z0-9]{3,5}\b/gi, /\bCP-?[0-9A-Z]{3,6}\b/gi, /\bYV-?[0-9A-Z]{3,6}\b/gi,
                  /\bOB-?[0-9A-Z]{3,6}\b/gi, /\bTG-?[0-9A-Z]{3,6}\b/gi, /\bTC-?[A-Z0-9]{3,6}\b/gi, /\bEI-?[A-Z]{3,5}\b/gi,
                  /\bEC-?[A-Z]{3,5}\b/gi, /\bLX-?[A-Z0-9]{3,5}\b/gi, /\b9H-?[A-Z0-9]{3,6}\b/gi, /\b4K-?[A-Z0-9]{3,6}\b/gi,
                  /\bA7-?[A-Z0-9]{3,6}\b/gi, /\bXA[A-Z0-9]{0,}\b/gi
                ];
                let reg = '';
                for (const rxp of tailPatterns){ const m = txt.match(rxp); if (m && m.length){ reg = m[0]; break; } }
                if (reg){ results.tail = reg.toUpperCase(); break; }
              }
            }
            if (wantFolio && !results.folio){
              const rx = /(F[O0]L[I1]O\b|\bN[O0]\.\?\s*F[O0]L[I1]O\b)/i;
              const rois = makeRois(pg, rx, { rightWidthFrac: 0.55, extraBelowCentered: true, centerWidthFrac: 0.5, centerPad: 30, fallbackTop: true, fallbackHeightFrac: 0.26, fallbackWidths: [0.5, 0.7, 0.9] });
              for (const r of rois){
                const img = await makeCrop(pg, r);
                const txt = (await OCR(img))||'';
                const fol = extractFolioDigits(txt);
                if (fol){ results.folio = fol; break; }
              }
            }
            if (wantArrival && !results.arrivalMain){
              const rx = /(AEROPUERTO\s+DE\s+LLEGADA|AEROPUERTO\s+DESTINO|AEROPUERTO\s+DE\s+ARRIBO|AEROPUERTO\s+DESTINO\s+DEL\s+VUELO)/i;
              const rois = makeRois(pg, rx, 0.7);
              const pickTrip = (arr)=>{
                try {
                  const letters = [];
                  for (const raw of arr){
                    const up = (raw||'').toString().trim().toUpperCase();
                    if (!up) continue;
                    if (/^[A-Z]{3}$/.test(up)){ if (!iataSet || !iataSet.size || iataSet.has(up)) return up; }
                    if (/^[A-Z]$/.test(up)){ letters.push(up); if (letters.length === 3){ const cand = letters.join(''); if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand; }
                      continue; }
                    const spaced = up.match(/^([A-Z])\s+([A-Z])\s+([A-Z])$/);
                    if (spaced){ const cand = `${spaced[1]}${spaced[2]}${spaced[3]}`; if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand; }
                  }
                  if (letters.length >= 3){
                    const cand = letters.slice(0,3).join('');
                    if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand;
                  }
                } catch(_){ }
                return '';
              };
              for (const r of rois){
                const img = await makeCrop(pg, r); const txt = (await OCR(img))||'';
                let code = window._mfParseIATAFromFreeText?.(txt) || '';
                if (!code){
                  // Fuzzy por nombre si texto contiene nombre de aeropuerto
                  try {
                    const lines = (txt||'').split(/\r?\n/);
                    const norm = (s)=> (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
                    const bestFuzzy = (phrase)=>{
                      const NP = norm(phrase); if (!NP) return null; const pTok = NP.split(' ').filter(Boolean);
                      let best=null, bestScore=0;
                      for (const rec of (window.airportNameIndex||[])){
                        if (!rec || !rec.norm) continue;
                        if (NP.includes(rec.norm) || rec.norm.includes(NP)) return rec;
                        const inter = rec.tokens.filter(t=> pTok.includes(t));
                        const score = inter.length / Math.max(1, rec.tokens.length);
                        if (score > bestScore && (inter.length>=2 || score>=0.6)) { best = rec; bestScore = score; }
                      }
                      return best;
                    };
                    for (const ln of lines){ const t=(ln||'').trim(); if (!t || /^[A-Z]{3}$/.test(t) || t.length<6) continue; const rec = bestFuzzy(t); if (rec && rec.iata){ code = rec.iata; break; } }
                    if (!code){ code = pickTrip(lines); }
                  } catch(_){ }
                }
                if (!code){
                  for (const syn of arrivalSynonyms){ if (syn.rx.test(txt)){ code = syn.code; break; } }
                }
                if (code){ results.arrivalMain = code; break; }
              }
            }
            if (wantFlightType && !results.flightType){
              const rx = /(TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)/i;
              const rois = makeRois(pg, rx, 0.55);
              for (const r of rois){
                const img = await makeCrop(pg, r);
                const txt = (await OCR(img))||'';
                const letter = window._mfExtractFlightTypeFromContext?.(txt) || '';
                if (letter){ results.flightType = letter.toUpperCase().slice(0,1); break; }
              }
            }
          }
          return results;
        } catch(_){ return {}; }
      }

      async function ocrPdfOrImageV2(file, maxPages){
        try { await ensureOcrScheduler(); } catch(_){ try { await ensureTesseractLite(); } catch(_){} if (status) status.textContent = 'No se pudo cargar OCR (Tesseract).'; return ''; }
        const name = (file && file.name)||''; const type = (file && file.type)||'';
        const isPdf = /\.pdf$/i.test(name) || /application\/pdf/i.test(type);
        if (!isPdf){
          // Imagen directa
          const r = await new Promise((res)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(file); });
            if (window._mfOcrScheduler){
            const out = await window._mfOcrScheduler.addJob('recognize', r);
            return (out && out.data && out.data.text) ? out.data.text : '';
          } else {
            const { data } = await Tesseract.recognize(r, 'spa+eng', { ...(_tessOpts||{}), logger: ()=>{} });
            return (data && data.text) ? data.text : '';
          }
        }
        try {
          await ensurePdfJsLite();
          const ab = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
          const pages = Math.min(maxPages||2, pdf.numPages);
          const jobs = [];
          let completed = 0;
          for (let i=1;i<=pages;i++){
            const page = await pdf.getPage(i);
            // Respetar solo rotación embebida: no pasar rotation explícito
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
            const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            let prom = window._mfOcrScheduler
              ? window._mfOcrScheduler.addJob('recognize', dataUrl)
              : Tesseract.recognize(dataUrl, 'spa+eng', { ...(_tessOpts||{}), logger: ()=>{} });
            prom = Promise.resolve(prom).then((res)=>{ completed++; try { setProgress(50 + Math.round(((completed)/pages)*40), `OCR página ${completed}/${pages}...`); } catch(_){} return res; });
            jobs.push(prom);
          }
          const results = await Promise.all(jobs);
          const text = results.map(r=> (r && r.data && r.data.text) ? r.data.text : '').join('\n');
          return text.trim();
        } catch(e){ return ''; }
      }

      async function renderPreviewV2(file){
        try {
          const name = (file && file.name)||''; const type = (file && file.type)||'';
          const isPdf = /\.pdf$/i.test(name) || /application\/pdf/i.test(type);
          const canvas = document.getElementById('manifest-preview-canvas');
          const img = document.getElementById('manifest-preview');
          const placeholder = document.getElementById('manifest-preview-placeholder');
          const textLayer = document.getElementById('manifest-text-layer');
          // Token to ensure only the latest render updates the UI
          const token = Symbol('preview-render');
          try { window._mfPreviewRenderToken = token; } catch(_){ }

          // Cancel any in-flight render safely
          try {
            const prev = window._mfPreviewRenderTask;
            if (prev && typeof prev.cancel === 'function'){
              prev.cancel();
              await Promise.resolve(prev.promise).catch(()=>{});
            }
          } catch(_){ }

          if (isPdf){
            try {
              await ensurePdfJsLite();
              const ab = await file.arrayBuffer();
              const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
              const page = await pdf.getPage(1);
              const containerWidth = (canvas && canvas.parentElement) ? canvas.parentElement.clientWidth : 1000;
              const detect = (await (typeof _detectPageDominantRotation==='function' ? _detectPageDominantRotation(page) : Promise.resolve(0))) || 0;
              const getUprightViewport = (pg, scale)=>{
                try { const eff = (((pg.rotate||0)%360)+360)%360; return (eff===180 || detect===180) ? pg.getViewport({ scale, rotation: 180 }) : pg.getViewport({ scale }); } catch(_){ return pg.getViewport({ scale }); }
              };
              const viewport = getUprightViewport(page, 1);
              const scale = Math.min(2.0, Math.max(0.9, containerWidth / viewport.width));
              const vp = getUprightViewport(page, scale);
              // Render on an offscreen canvas to avoid concurrent use of the visible canvas
              const off = document.createElement('canvas'); off.width = vp.width; off.height = vp.height;
              const offCtx = off.getContext('2d');
              const task = page.render({ canvasContext: offCtx, viewport: vp });
              try { window._mfPreviewRenderTask = task; } catch(_){ }
              await task.promise;
              // Ensure this is still the latest requested render
              if (window._mfPreviewRenderToken !== token) return;
              if (canvas){
                canvas.width = vp.width; canvas.height = vp.height;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0,0,canvas.width,canvas.height);
                ctx.drawImage(off, 0, 0);
                canvas.classList.remove('d-none');
              }
              // Hide text layer for preview
              try { if (textLayer){ textLayer.innerHTML=''; textLayer.classList.add('d-none'); } } catch(_){ }
              try { window.manifestApplyZoom(); } catch(_){ }
              if (img) img.classList.add('d-none');
              if (placeholder) placeholder.classList.add('d-none');
            } catch(e){
              // Ignore rendering cancellations; surface other errors lightly
              const name = (e && (e.name||'')).toString();
              if (name !== 'RenderingCancelledException'){
                try { if (status) status.textContent = ''; } catch(_){ }
              }
            } finally {
              // Clear task if it's ours
              if (window._mfPreviewRenderToken === token){ try { window._mfPreviewRenderTask = null; } catch(_){ } }
            }
          } else if (/^image\//i.test(type) || /\.(png|jpg|jpeg|webp)$/i.test(name||'')){
            try {
              // Revoke previous object URL if any
              try { if (window._mfPreviewImgURL){ URL.revokeObjectURL(window._mfPreviewImgURL); window._mfPreviewImgURL = null; } } catch(_){ }
              const url = URL.createObjectURL(file);
              try { window._mfPreviewImgURL = url; } catch(_){ }
              if (img){ img.src = url; img.classList.remove('d-none'); }
              if (canvas) canvas.classList.add('d-none');
              // Hide text layer for image preview
              if (textLayer){ textLayer.textContent=''; textLayer.classList.add('d-none'); }
              if (placeholder) placeholder.classList.add('d-none');
              try { window.manifestApplyZoom(); } catch(_){ }
            } catch(_){ }
            // OCR deshabilitado para imágenes de previsualización
          }
        } catch(_){ }
      }

      function fillFieldsFromTextV2(text){
        try {
          const ocrDebug = document.getElementById('manifest-ocr-debug'); if (ocrDebug) ocrDebug.value = text||'';
          // Solicitud: no rellenar automáticamente el campo Título
          // const title = findNearLabelValue(['MANIFIESTO'], /MANIFIESTO.*/i, text); // No setear mf-title

          // 1) Inferir dirección
          const U = (text||'').toUpperCase();
          const isArrivalDoc = /\bLLEGADA\b|\bARRIVAL\b/.test(U);
          const isDepartureDoc = /\bSALIDA\b|\bDEPARTURE\b/.test(U);
          const dirArr = document.getElementById('mf-dir-arr');
          const dirDep = document.getElementById('mf-dir-dep');
          if (!window._mfDirectionLocked){
            if (isArrivalDoc && dirArr){ dirArr.checked = true; dirArr.dispatchEvent(new Event('change', { bubbles:true })); }
            else if (isDepartureDoc && dirDep){ dirDep.checked = true; dirDep.dispatchEvent(new Event('change', { bubbles:true })); }
          }
          const currentIsArrival = !!(dirArr && dirArr.checked);

          // 1.1) FOLIO (exhaustivo, prioriza números) – suele estar al principio
          try {
            const folio = (window._mfExtractFolioDigitsSmart?.(text) || window._mfExtractFolioExhaustive?.(text) || '').toString().trim();
            if (folio && isFolioConfidenceHigh(text, folio)) setVal('mf-folio', folio);
          } catch(_){ }

          // 2) Vuelo y transportista (robusto)
          (function(){
            try {
              const codeRx = /([A-Z]{2,3})\s?-?\s?(\d{2,5})([A-Z]?)/i;
              let vuelo = findNearLabelValue(['VUELO','N° VUELO','NO. VUELO','FLIGHT','FLT','VUELO NO','VUELO N°'], codeRx, text) || '';
              // Fallback global: elegir primer match con prefijo válido (IATA/ICAO)
              if (!vuelo){
                const mAll = (text||'').match(new RegExp(codeRx.source,'ig')) || [];
                const pick = (arr)=>{
                  for (const s of arr){ const m = s.match(codeRx); if (!m) continue; const pref=(m[1]||'').toUpperCase(); if (icaoSet.has(pref) || iataToIcao.has(pref)) return s; }
                  return arr[0]||'';
                };
                vuelo = pick(mAll);
              }
              // Fallback: etiqueta + sólo dígitos -> reconstruir con aerolínea
              if (!vuelo){
                const numOnly = findNearLabelValue(['VUELO','FLIGHT','FLT'], /\b\d{2,5}[A-Z]?\b/, text) || '';
                if (numOnly){
                  let icao = (resolveCarrierICAO1?.(text)||{}).code || '';
                  if (icao){
                    let iata = '';
                    try { for (const a of (airlinesCatalog||[])){ if (a.ICAO===icao && a.IATA){ iata=a.IATA; break; } } } catch(_){ }
                    vuelo = (iata ? iata : icao) + numOnly;
                  } else { vuelo = numOnly; }
                }
              }
              if (vuelo){
                const cleaned = vuelo.replace(/\s|-/g,'').toUpperCase();
                setVal('mf-flight', cleaned);
                const pref3 = cleaned.slice(0,3), pref2 = cleaned.slice(0,2);
                let carrierICAO = '';
                if (pref3 && icaoSet.has(pref3)) carrierICAO = pref3; else if (pref2 && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2)||'';
                if (carrierICAO){
                  setVal('mf-carrier-3l', carrierICAO);
                  const rec = airlinesCatalog.find(a=>a.ICAO===carrierICAO);
                  if (rec){ if (!document.getElementById('mf-operator-name').value) setVal('mf-operator-name', rec.Name); if (!document.getElementById('mf-airline').value) setVal('mf-airline', rec.Name); }
                }
              }
            } catch(_){ }
          })();

          // 2.1) Tipo de vuelo (A–Z)
          try {
            let code = window._mfExtractFlightTypeFromContext?.(text) || '';
            if (!code){
              const textStr = (text||'').toString();
              const linesFT = textStr.split(/\r?\n/);
              const labelRx = /(TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)/i;
              const segments = [];
              const blockLines = [];
              let foundLabel = false;
              for (let i=0;i<linesFT.length;i++){
                const ln = linesFT[i]||'';
                const m = ln.match(labelRx);
                if (!m) continue;
                foundLabel = true;
                const start = (m.index||0) + (m[0]?.length||0);
                const main = ln.slice(start);
                const prevLines = [];
                for (let k=2;k>=1;k--){
                  const prev = linesFT[i-k];
                  if (typeof prev !== 'string') continue;
                  prevLines.unshift(prev);
                }
                prevLines.forEach(p=>{ segments.push(p); blockLines.push(p); });
                segments.push(ln);
                blockLines.push(ln);
                if (main) segments.push(main);
                for (let k=1;k<=6;k++){
                  const nxt = linesFT[i+k];
                  if (typeof nxt !== 'string') break;
                  segments.push(nxt);
                  blockLines.push(nxt);
                  if (!nxt.trim() && k>=3) break;
                }
                break;
              }
              if (!segments.length) segments.push(textStr);
              let fallback = '';
              const blockRaw = foundLabel ? blockLines.join('\n') : '';
              if (!fallback && blockRaw){
                const linesBlock = blockRaw.split(/\r?\n/);
                const markerRx = /[X☒✓✔]/g;
                const letterRx = /(?:^|[^A-Z0-9])([A-Z])(?=[\)\]\.:;,\s-]|$)/g;
                const parenRx = /\(([A-Z])\)/g;
                const candidateScores = new Map();
                const register = (letter, score)=>{
                  if (!letter || !/^[A-Z]$/.test(letter)) return;
                  const prev = candidateScores.get(letter);
                  if (prev === undefined || score < prev) candidateScores.set(letter, score);
                };
                linesBlock.forEach((line)=>{
                  if (!line) return;
                  const upper = line.toUpperCase();
                  markerRx.lastIndex = 0;
                  const markers = Array.from(upper.matchAll(markerRx));
                  if (!markers.length) return;
                  const markerPositions = markers.map(m=> m.index + m[0].length - 1);
                  letterRx.lastIndex = 0;
                  let lm;
                  while ((lm = letterRx.exec(upper))){
                    const letter = (lm[1]||'').toUpperCase();
                    const letterPos = lm.index + lm[0].lastIndexOf(letter);
                    let bestDist = Infinity;
                    for (const pos of markerPositions){ const d = Math.abs(letterPos - pos); if (d < bestDist) bestDist = d; }
                    if (bestDist !== Infinity){
                      const penalty = letter === 'X' ? 40 : 0;
                      register(letter, bestDist + penalty);
                    }
                  }
                  parenRx.lastIndex = 0;
                  let pm;
                  while ((pm = parenRx.exec(upper))){
                    const letter = (pm[1]||'').toUpperCase();
                    const letterPos = pm.index + pm[0].indexOf(letter);
                    let bestDist = Infinity;
                    for (const pos of markerPositions){ const d = Math.abs(letterPos - pos); if (d < bestDist) bestDist = d; }
                    if (bestDist !== Infinity){
                      register(letter, bestDist + 5);
                    }
                  }
                });
                if (candidateScores.size){
                  const sorted = Array.from(candidateScores.entries()).sort((a,b)=> a[1] - b[1]);
                  fallback = sorted[0][0];
                }
              }
              const candidates = [];
              const singleLetter = /(?:^|[\s:;=,\(\[\-])([A-Z])(?=[\s\)\].,:;=\-]|$)/g;
              const preferFromContext = (seg)=>{
                if (!seg) return '';
                let m = seg.match(/[X☒✓✔]\s*([A-Z])(?![A-Za-z])/i);
                if (m && m[1]) return m[1].toUpperCase();
                m = seg.match(/([A-Z])\s*[X☒✓✔](?![A-Za-z])/i);
                if (m && m[1]) return m[1].toUpperCase();
                return '';
              };
              for (const seg of segments){
                if (!seg) continue;
                if (!fallback){
                  const fav = preferFromContext(seg);
                  if (fav){ fallback = fav; break; }
                }
                let match;
                singleLetter.lastIndex = 0;
                while ((match = singleLetter.exec(seg))){
                  const letter = (match[1]||'').toUpperCase();
                  candidates.push({ letter, index: match.index ?? 0 });
                }
              }
              if (!fallback && candidates.length){
                const valid = Array.isArray(window.flightServiceTypeCatalog)
                  ? new Set((window.flightServiceTypeCatalog||[]).map(r=> (r?.Code||'').toString().toUpperCase().slice(0,1)).filter(Boolean))
                  : null;
                const hasNonX = candidates.some(c=> c.letter !== 'X');
                const filtered = hasNonX ? candidates.filter(c=> c.letter !== 'X') : candidates;
                filtered.sort((a,b)=> a.index - b.index);
                const pick = filtered[0]?.letter || '';
                if (!valid || !pick || valid.has(pick)) fallback = pick;
              }
              if (!fallback){
                const mg = textStr.replace(/\s+/g,' ').match(/(?:TIPO\s*DE\s*VUELO|FLIGHT\s*TYPE)\s*[:\-]?\s*([A-Z])(?![A-Za-z])/i);
                if (mg && mg[1]) fallback = (mg[1]||'').toUpperCase();
              }
              if (fallback) code = fallback;
            }
            if (code){
              const letter = code.toUpperCase().slice(0,1);
              if (letter){
                setVal('mf-flight-type', letter);
                try {
                  const el = document.getElementById('mf-flight-type');
                  if (el){
                    if (el.value !== letter) el.value = letter;
                    el.dispatchEvent(new Event('input',{ bubbles:true }));
                    el.dispatchEvent(new Event('change',{ bubbles:true }));
                  }
                } catch(_){ }
              }
            }
          } catch(_){ }

          // 3) Fecha (DD/MM/YY o DD/MM/YYYY, soporta -, . y espacios)
          let fecha = findNearLabelValue(['FECHA','FECHA DEL DOCUMENTO','FECHA DOC','FECHA DOCUMENTO','DATE'], /\b\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*(\d{2}|\d{4})\b/, text);
          const isoFromLbl = (function toISO(s){
            try {
              const m = /^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})$/.exec((s||'').trim());
              if (!m) return '';
              let dd=m[1], mm=m[2], yy=m[3]; let year=parseInt(yy,10); if (yy.length===2){ year=(year<=49)?(2000+year):(1900+year); }
              const z2=(n)=>n.length===1?('0'+n):n; return `${year}-${z2(mm)}-${z2(dd)}`;
            } catch(_){ return ''; }
          })(fecha);
          let isoDate = isoFromLbl;
          if (!isoDate){ const m = (text||'').match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})\b/); if (m){ isoDate = (function(){ let dd=m[1],mm=m[2],yy=m[3]; let year=parseInt(yy,10); if (yy.length===2){ year=(year<=49)?(2000+year):(1900+year);} const z2=(n)=>n.length===1?('0'+n):n; return `${year}-${z2(mm)}-${z2(dd)}`; })(); } }
          if (isoDate) { const el = document.getElementById('mf-doc-date'); if (el) el.value = isoDate; }

          // 3.1) Aeropuerto de Llegada (código IATA) — localizar alrededor del label explícito
          try {
            const lines = (text||'').toString().split(/\r?\n/);
            const normalize = (s)=> (s||'').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');
            const isArrivalLabel = (s)=>{
              const c = normalize(s);
              return c.includes('AEROPUERTODELLEGADA') || c.includes('AEROPUERTODESTINODELVUELO') || c.includes('AEROPUERTODESTINOVUELO') || c.includes('AEROPUERTODESTINO') || c.includes('AEROPUERTODEARRIBO');
            };
            const nameNorm = (s)=> (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
            const pickSingleLetterTriplet = (arr)=>{
              try {
                const letters = [];
                for (const raw of arr){
                  const up = (raw||'').toString().trim().toUpperCase();
                  if (!up) continue;
                  if (/^[A-Z]{3}$/.test(up)){ if (!iataSet || !iataSet.size || iataSet.has(up)) return up; }
                  if (/^[A-Z]$/.test(up)){ letters.push(up); if (letters.length === 3){ const cand = letters.join(''); if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand; }
                    continue; }
                  const spaced = up.match(/^([A-Z])\s+([A-Z])\s+([A-Z])$/);
                  if (spaced){ const cand = `${spaced[1]}${spaced[2]}${spaced[3]}`; if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand; }
                }
                if (letters.length >= 3){
                  const cand = letters.slice(0,3).join('');
                  if (!iataSet || !iataSet.size || iataSet.has(cand)) return cand;
                }
              } catch(_){ }
              return '';
            };
            const bestFuzzy = (phrase)=>{
              try {
                const NP = nameNorm(phrase); if (!NP) return null;
                const pTok = NP.split(' ').filter(Boolean);
                let best=null, bestScore=0;
                for (const rec of airportNameIndex){
                  if (!rec || !rec.norm) continue;
                  if (NP.includes(rec.norm) || rec.norm.includes(NP)) return rec;
                  const inter = rec.tokens.filter(t=> pTok.includes(t));
                  const score = inter.length / Math.max(1, rec.tokens.length);
                  if (score > bestScore && (inter.length>=2 || score>=0.6)) { best = rec; bestScore = score; }
                }
                return best;
              } catch(_){ return null; }
            };
            const arrivalSynonyms = [
              { rx: /\bAIFA\b/i, code: 'NLU' },
              { rx: /FELIPE\s+ANGELES/i, code: 'NLU' },
              { rx: /SANTA\s+LUCIA/i, code: 'NLU' },
              { rx: /FELIPE\s+AEROPUERTO/i, code: 'NLU' }
            ];
            let code = '';
            for (let i=0;i<lines.length;i++){
              const line = lines[i]||'';
              if (!isArrivalLabel(line)) continue;
              const labelMatch = line.match(/AEROPUERTO\s+(?:DE\s+)?(LLEGADA|DESTINO(?:\s+DEL\s+VUELO)?|ARRIBO)/i);
              const rest = labelMatch ? line.slice((labelMatch.index||0) + (labelMatch[0]?.length||0)) : line;
              code = window._mfParseIATAFromFreeText?.(rest) || '';
              if (!code){
                const bad = /(ORIGEN|PROCEDENCIA|ESCALA|DESTINO)/i;
                for (let k=1;k<=3;k++){
                  const nxt = lines[i+k]||''; if (bad.test(nxt)) break;
                  code = window._mfParseIATAFromFreeText?.(nxt) || '';
                  if (code) break;
                }
              }
              if (!code){
                for (let k=0;k<=3;k++){
                  const L = lines[i+k]||'';
                  if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(L)){
                    const prev = lines[i+k-1]||'';
                    code = window._mfParseIATAFromFreeText?.(prev) || '';
                    if (code) break;
                  }
                }
              }
              if (!code){
                const win = [lines[i-1], lines[i+1], lines[i+2], lines[i+3]];
                for (const s of win){
                  const t = (s||'').trim();
                  if (!t || /^[A-Z]{3}$/.test(t) || t.length < 5) continue;
                  const rec = bestFuzzy(t);
                  if (rec && rec.iata){ code = rec.iata; break; }
                }
              }
              if (!code){
                const context = [line, lines[i+1]||'', lines[i+2]||'', lines[i-1]||''].join(' ');
                for (const syn of arrivalSynonyms){
                  if (syn.rx.test(context)){ code = syn.code; break; }
                }
              }
              if (!code){
                code = pickSingleLetterTriplet([line, lines[i+1], lines[i+2], lines[i+3]]) || '';
              }
              break;
            }
            if (!code){
              code = findNearLabelIATACode(['AEROPUERTO DE LLEGADA','AEROPUERTO DESTINO','AEROPUERTO DESTINO DEL VUELO','AEROPUERTO DE ARRIBO'], text) || '';
            }
            if (!code){
              for (const syn of [{ rx:/\bAIFA\b/i, code:'NLU' }, { rx:/FELIPE\s+ANGELES/i, code:'NLU' }]){
                if (syn.rx.test(text||'')){ code = syn.code; break; }
              }
            }
            if (code){ setVal('mf-airport-main', code); }
          } catch(_){ }

          // 4) Aeropuertos y horarios
          // 24h times: HH:MM, HH.MM, HHhMM, H:MM, compact HHMM
          const rxTime = window._mfTimeRx || /\b(?:([01]?\d|2[0-3])[:hH\.]\s?([0-5]\d)|([01]?\d|2[0-3])([0-5]\d))\b(?:\s?(?:hrs|hr|h))?/;
          // Dedicated extractor: time after a specific label on same/next few lines
          const extractTimeAfterLabel = (labelRx, maxAhead=3)=>{
            try {
              const hit = window._mfExtractTimeAfterLabel?.(text, labelRx, { maxAhead }) || '';
              if (hit) return hit;
            } catch(_){ }
            return '';
          };
          const setTimeIf = (id, labels) => {
            let v = findNearLabelValue(labels, rxTime, text);
            if (!v) return;
            const n = (window._mfNormTime? window._mfNormTime(v) : String(v));
            if (n) setVal(id, n);
          };
          const chooseValidIATA = (code)=>{ const c=(code||'').toUpperCase(); return iataSet.size ? (iataSet.has(c)?c:'') : c; };
          let origen = chooseValidIATA(findNearLabelIATACode(['ORIGEN','PROCEDENCIA','FROM'], text));
          let destino = chooseValidIATA(findNearLabelIATACode(['DESTINO','TO'], text));
          let escala = chooseValidIATA(findNearLabelIATACode(['ULTIMA ESCALA','ESCALA ANTERIOR','LAST STOP','ESCALA'], text));
          if (currentIsArrival){
            // Intento fuerte: ORIGEN DEL VUELO (nombre + código)
            try {
              const got = extractArrivalOriginFields(text);
              if (got && (got.code || got.name)){
                if (got.code){ setVal('mf-arr-origin-code', got.code); }
                if (got.name){ setVal('mf-arr-origin-name', got.name); }
              } else if (origen) {
                // Fallback a detección genérica
                setVal('mf-arr-origin-code', origen);
                const name = airportByIATA.get(origen); if (name) setVal('mf-arr-origin-name', name);
              }
            } catch(_){ if (origen) { setVal('mf-arr-origin-code', origen); const name = airportByIATA.get(origen); if (name) setVal('mf-arr-origin-name', name); } }
            // Intento fuerte: ESCALA ANTERIOR / ÚLTIMA ESCALA (nombre + código)
            try {
              const got2 = extractArrivalLastStopFields(text);
              if (got2 && (got2.code || got2.name)){
                if (got2.code){ setVal('mf-arr-last-stop-code', got2.code); }
                if (got2.name){ setVal('mf-arr-last-stop', got2.name); }
              } else if (escala) {
                // Fallback a detección genérica
                setVal('mf-arr-last-stop-code', escala);
                const name = airportByIATA.get(escala); if (name) setVal('mf-arr-last-stop', name);
              }
            } catch(_){ if (escala) { setVal('mf-arr-last-stop-code', escala); const name = airportByIATA.get(escala); if (name) setVal('mf-arr-last-stop', name); } }
            // Regla: si no hay Última Escala, asumir que es igual a la Procedencia
            try {
              const cLast = (document.getElementById('mf-arr-last-stop-code')?.value||'').toUpperCase();
              const cOrig = (document.getElementById('mf-arr-origin-code')?.value||'').toUpperCase();
              if (!cLast && cOrig){
                setVal('mf-arr-last-stop-code', cOrig);
                const nm = airportByIATA.get(cOrig) || (document.getElementById('mf-arr-origin-name')?.value||'');
                if (nm) setVal('mf-arr-last-stop', nm);
              }
            } catch(_){ }
            // Aeropuerto principal (Llegada): detectar por etiqueta y colocar CÓDIGO IATA de 3 letras
            try {
              const mainArrCand = findNearLabelIATACode(['AEROPUERTO DE LLEGADA','AEROPUERTO DESTINO','AEROPUERTO DE ARRIBO','AEROPUERTO DESTINO DEL VUELO'], text);
              const mainMatch = findValidAirport(mainArrCand);
              if (mainMatch && mainMatch.IATA){
                // Solicitud: rellenar con el código IATA (3 letras)
                setVal('mf-airport-main', mainMatch.IATA);
              }
            } catch(_){ }
            // tiempos llegada (prefer robust slot-assigned extractor)
            const strongArr = (window._mfFindSlotAssignedTime?.(text) || '');
            const vSlotArr = strongArr || extractTimeAfterLabel(/\bHORA\s+DE\s+SLOT\s+ASIGNADO\b/i, 8) || extractTimeAfterLabel(/\bSLOT\s+ASIGNADO\b/i, 8);
            if (vSlotArr) setVal('mf-arr-slot-assigned', vSlotArr); else setTimeIf('mf-arr-slot-assigned', ['SLOT ASIGNADO']);
            setTimeIf('mf-arr-slot-coordinated', ['SLOT COORDINADO']);
            setTimeIf('mf-arr-arribo-posicion', ['ENTRADA A LA POSICION','ARRIBO A LA POSICION','ARRIBO POSICION']);
            setTimeIf('mf-arr-inicio-desembarque', ['TERMINO MANIOBRAS DE DESEMBARQUE','INICIO DESEMBARQUE']);
            setTimeIf('mf-arr-inicio-pernocta', ['INICIO PERNOCTA']);
          } else {
            // Nueva heurística completa para salida
            const route = extractDepartureRouteFields(text);
            const setPair = (nameId, codeId, pair)=>{ if (pair.code){ setVal(codeId, pair.code); const nm = airportByIATA.get(pair.code)||pair.name||''; if (nm) setVal(nameId, nm); } };
            setPair('mf-origin-name','mf-origin-code', route.origin);
            setPair('mf-next-stop','mf-next-stop-code', route.next);
            setPair('mf-final-dest','mf-final-dest-code', route.dest);
            // tiempos salida (prefer robust slot-assigned extractor)
            const strongDep = (window._mfFindSlotAssignedTime?.(text) || '');
            const vSlotDep = strongDep || extractTimeAfterLabel(/\bHORA\s+DE\s+SLOT\s+ASIGNADO\b/i, 8) || extractTimeAfterLabel(/\bSLOT\s+ASIGNADO\b/i, 8);
            if (vSlotDep) setVal('mf-slot-assigned', vSlotDep); else setTimeIf('mf-slot-assigned', ['SLOT ASIGNADO']);
            // Coordinado en salidas: dejar vacío
            try { const el = document.getElementById('mf-slot-coordinated'); if (el) { el.value = ''; el.setCustomValidity(''); } } catch(_){ }
            // Robust detection for departure times
            (function(){
              try {
                const tInicioEmb = window._mfFindTimeByLabels?.(text, ['INICIO MANIOBRAS DE EMBARQUE','INICIO DE MANIOBRAS DE EMBARQUE','INICIO DE EMBARQUE'], { maxAhead: 8 }) || '';
                if (tInicioEmb) setVal('mf-inicio-embarque', tInicioEmb); else setTimeIf('mf-inicio-embarque', ['INICIO MANIOBRAS DE EMBARQUE','INICIO DE EMBARQUE']);
              } catch(_){ }
              try {
                const tSalidaPos = window._mfFindTimeByLabels?.(text, ['SALIDA DE LA POSICION','SALIDA POSICION','SALIDA DE LA POS.'], { maxAhead: 8 }) || '';
                if (tSalidaPos) setVal('mf-salida-posicion', tSalidaPos); else setTimeIf('mf-salida-posicion', ['SALIDA DE LA POSICION','SALIDA POSICION']);
              } catch(_){ }
            })();
            // Término de pernocta en salidas: dejar vacío
            try { const el = document.getElementById('mf-termino-pernocta'); if (el) { el.value = ''; el.setCustomValidity(''); } } catch(_){ }
          }

          // Propagación automática de N/A en horas: si se detecta alguna y otras quedan vacías
          try {
            (function _applyNaPropagationForTimes(){
              try {
                const isArr = !!(document.getElementById('mf-dir-arr')?.checked);
                const ids = isArr
                  ? ['mf-arr-slot-assigned','mf-arr-slot-coordinated','mf-arr-arribo-posicion','mf-arr-inicio-desembarque','mf-arr-inicio-pernocta']
                  : ['mf-slot-assigned','mf-slot-coordinated','mf-inicio-embarque','mf-salida-posicion','mf-termino-pernocta'];
                const vals = ids.map(id=> (document.getElementById(id)?.value||'').trim());
                const hasAny = vals.some(v=> v && v.toUpperCase() !== 'N/A');
                const anyEmpty = vals.some(v=> !v);
                if (hasAny && anyEmpty){ ids.forEach((id, i)=>{ const el=document.getElementById(id); if (el && !vals[i]){ el.value = 'N/A'; el.setCustomValidity(''); } }); }
              } catch(_){ }
            })();
          } catch(_){ }

          // 5) Pax total
          let pax = findNearLabelValue(['PASAJEROS','PAX'], /\b\d{1,4}\b/, text); setVal('pax-total', pax || '');
          // 5.0) Tripulación total
          try {
            const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
            if (crew) setVal('mf-crew-total', crew);
          } catch(_){ }

          // 5.1) Piloto al mando y No. de licencia
          try {
            const pilotEl = document.getElementById('mf-pilot');
            const setPilotIfEmpty = (value) => {
              const cleaned = (value || '').toString().replace(/\s+/g,' ').trim();
              if (!cleaned) return;
              if (/\bPILOTO\b|\bMANDO\b|\bCAPIT[ÁA]N\b/i.test(cleaned)) return;
              if (pilotEl){
                const current = (pilotEl.value||'').trim();
                const isPlaceholder = /^N\s*\/?\s*A$/i.test(current);
                if (!current || isPlaceholder){
                  try { forceSetVal('mf-pilot', cleaned); } catch(_){ setVal('mf-pilot', cleaned); }
                }
              }
            };
            setPilotIfEmpty(window._mfExtractPilotRobust?.(text) || '');
            // Priorizar extracción directa basada en bloque
            setPilotIfEmpty(window._mfExtractPilotDirectBlock?.(text) || '');
            const pilotCurrent = (pilotEl?.value || '').trim();
            const pilotPlaceholder = /^N\s*\/?\s*A$/i.test(pilotCurrent);
            if (!pilotCurrent || pilotPlaceholder) {
              setPilotIfEmpty(window._mfExtractPilotUpperNearLabel?.(text) || '');
            }
            const pilotCurrentAfterNear = (pilotEl?.value || '').trim();
            if (!pilotCurrentAfterNear || /^N\s*\/?\s*A$/i.test(pilotCurrentAfterNear)) {
              const nameRx = /\b[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,}){1,5}\b/;
              let pilot = findNearLabelValue(['PILOTO AL MANDO','PILOTO','CAPITAN','CAPITÁN'], nameRx, text) || '';
              if (pilot && /\bPILOTO\b|\bMANDO\b|\bCAPIT[ÁA]N\b/i.test(pilot)) pilot = '';
              setPilotIfEmpty(pilot);
            }
          } catch(_){ }
          // Refuerzo adicional: si aún no hay piloto, volver a intentar con heurística avanzada (por seguridad)
          try {
            const curRaw = document.getElementById('mf-pilot')?.value || '';
            const cur = curRaw.trim();
            if (!cur || /^N\s*\/?\s*A$/i.test(cur)){
              const name = window._mfExtractPilotRobust?.(text) || window._mfExtractPilotUpperNearLabel?.(text) || '';
              if (name){
                try { forceSetVal('mf-pilot', name); } catch(_){ setVal('mf-pilot', name); }
              }
            }
          } catch(_){ }
          // Si aún no se obtuvo el Piloto, intentar extracción basada en fuente y tamaño directamente del PDF (Arial Black ~ Bold ~ 12pt)
          try {
            const cur = document.getElementById('mf-pilot')?.value || '';
            if (!cur && window._lastManifestFile){
              const f = window._lastManifestFile; const nm = (f.name||''); const tp = (f.type||''); const isPdf = /\.pdf$/i.test(nm) || /application\/pdf/i.test(tp);
              if (isPdf && typeof window._mfExtractPilotUpperFromPdf === 'function'){
                window._mfExtractPilotUpperFromPdf(f, 2).then(name=>{ if (name && !document.getElementById('mf-pilot')?.value){ setVal('mf-pilot', name); } }).catch(()=>{});
              }
            }
          } catch(_){ }
          try {
            const found = (window._mfExtractPilotLicenseExhaustive?.(text) || '').toUpperCase();
            if (found) setVal('mf-pilot-license', found);
          } catch(_){ }

          // 5.1) Equipo (tipo ICAO) directamente desde el documento
          try {
            const tICAO = extractAircraftTypeICAOFromTextV2(text);
            if (tICAO && typeIcaoSetV2 && typeIcaoSetV2.has(tICAO)) setVal('mf-aircraft', tICAO);
          } catch(_){ }

          // 6) Matrícula -> tipo y aerolínea por catálogos
          const tailPatterns = [
            /\bX[A-C]-?[A-Z0-9]{3,6}\b/gi, /\bN\d{1,5}[A-Z]{0,3}\b/gi, /\bH[KP]-?[0-9A-Z]{3,8}\b/gi, /\bLV-?[A-Z0-9]{3,5}\b/gi,
            /\bCC-?[A-Z0-9]{3,5}\b/gi, /\bPR-?[A-Z0-9]{3,5}\b/gi, /\bCP-?[0-9A-Z]{3,6}\b/gi, /\bYV-?[0-9A-Z]{3,6}\b/gi,
            /\bOB-?[0-9A-Z]{3,6}\b/gi, /\bTG-?[0-9A-Z]{3,6}\b/gi, /\bTC-?[A-Z0-9]{3,6}\b/gi, /\bEI-?[A-Z]{3,5}\b/gi,
            /\bEC-?[A-Z]{3,5}\b/gi, /\bLX-?[A-Z0-9]{3,5}\b/gi, /\b9H-?[A-Z0-9]{3,6}\b/gi, /\b4K-?[A-Z0-9]{3,6}\b/gi,
            /\bA7-?[A-Z0-9]{3,6}\b/gi, /\bXA[A-Z0-9]{0,}\b/gi
          ];
          const regLabels = ['MATRICULA','MATRÍCULA','REGISTRO','REGISTRATION','EQUIPO'];
          let regFound = findNearLabelValue(regLabels, /[A-Z0-9-]{4,8}/, text) || '';
          if (isLabelWordV2(regFound, regLabels)) regFound = '';
          if (!regFound){ for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ regFound = m[0]; break; } } }
          let canonReg = '';
          if (regFound){
            const variants = regVariants(regFound);
            for (const v of variants){ const key = normalizeReg(v); const recTry = aircraftByReg.get(v) || aircraftByReg.get(key); if (recTry){ canonReg = recTry._canon || v; break; } }
          }
          if (!canonReg){
            const ex = findCatalogRegInTextExhaustiveV2(text);
            if (ex) canonReg = ex;
          }
          if (canonReg){
            setVal('mf-tail', canonReg);
            tailWarn('');
          } else {
            // No setear matrícula si no está en catálogo; mostrar aviso
            setVal('mf-tail', '');
            tailWarn('No se encontró una matrícula válida en el documento. Verifique o seleccione del catálogo.');
          }
          const rec = canonReg ? (aircraftByReg.get(canonReg) || aircraftByReg.get(normalizeReg(canonReg))) : null;
          if (rec){
            // Equipo desde Aircraft Type -> map a ICAO/Name cuando exista
            const t = typeByCode.get(rec.type);
            if (t){
              const alreadyValid = /^[A-Z0-9]{3,4}$/.test((document.getElementById('mf-aircraft')?.value||'').toUpperCase()) && typeIcaoSetV2.has((document.getElementById('mf-aircraft')?.value||'').toUpperCase());
              if (!alreadyValid) setVal('mf-aircraft', t.ICAO || t.Name || rec.type);
            } else if (rec.type && !document.getElementById('mf-aircraft').value) setVal('mf-aircraft', rec.type);
            if (!document.getElementById('mf-carrier-3l').value && rec.ownerIATA){
              const cand = airlinesCatalog.find(a => (a.IATA||'').toUpperCase() === rec.ownerIATA);
              if (cand && /^[A-Z]{3}$/.test(cand.ICAO || '')){
                setVal('mf-carrier-3l', cand.ICAO);
                if (!document.getElementById('mf-operator-name').value) setVal('mf-operator-name', cand.Name);
                if (!document.getElementById('mf-airline').value) setVal('mf-airline', cand.Name);
              }
            }
          }
          // Calcular Tipo de Operación al final del llenado principal
          try { if (typeof window._mfComputeOperationType === 'function') window._mfComputeOperationType(); } catch(_){ }
        } catch(e) {
          if (status) status.textContent = 'Error al llenar campos: ' + (e?.message||e);
        }
      }

      function isFolioConfidenceHigh(text, folio){
        try {
          const raw = (text||'').toString();
          const digits = (folio||'').toString().trim();
          if (!raw || !digits) return false;
          if (digits.length < 3 || digits.length > 10) return false;
          const esc = digits.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const direct = new RegExp(`F[O0]L[I1]O[^0-9\n\r]{0,18}(?:N[O0]\.?\s*)?${esc}`, 'i');
          if (direct.test(raw)) return true;
          const lines = raw.split(/\r?\n/);
          for (let i=0; i<lines.length; i++){
            const line = lines[i] || '';
            if (!new RegExp(`\\b${esc}\\b`).test(line)) continue;
            if (/F[O0]L[I1]O/i.test(line)) return true;
            if (/F[O0]L[I1]O/i.test(lines[i-1]||'')) return true;
            if (/F[O0]L[I1]O/i.test(lines[i+1]||'')) return true;
          }
          return false;
        } catch(_){ return false; }
      }

      async function handleScanPdf(){
        let buttonLocked = false;
        let ocrWasDisabled = true;
        try {
          if (scanPdfBtn && scanPdfBtn.classList.contains('is-scanning')) return;
          const file = upload && upload.files && upload.files[0];
          if (!file){ if (status) status.textContent = 'Seleccione un PDF antes de escanear.'; return; }
          try { window._lastManifestFile = file; } catch(_){ }
          const name = file.name||''; const type = file.type||'';
          const isPdf = /\.pdf$/i.test(name) || /application\/pdf/i.test(type);
          if (!isPdf){ if (status) status.textContent = 'El archivo no es PDF. Use "Escaneo alternativo (OCR)".'; return; }
          setScanButtonBusy(true, 'Escaneando PDF…');
          buttonLocked = true;
          if (scanOcrBtn){ ocrWasDisabled = scanOcrBtn.disabled; scanOcrBtn.disabled = true; }
          setProgress(5, 'Preparando...'); if (status) status.textContent = '';
          const fast = !!(document.getElementById('manifest-fast-mode') && document.getElementById('manifest-fast-mode').checked);
          if (fast){
            // 1) Texto del PDF primero (rápido); solo si faltan campos clave, usamos OCR dirigido.
            try { await _v2CatalogsReady; } catch(_){ }
            setProgress(18, 'Extrayendo texto del PDF...');
            let text = await extractPdfTextV2(file);
            setProgress(45, 'Procesando texto...');
            fillFieldsFromTextV2(text||'');
            // Checar campos clave faltantes
            const need = {
              tail: !(document.getElementById('mf-tail')?.value||'').trim(),
              pilot: !(document.getElementById('mf-pilot')?.value||'').trim(),
              license: !(document.getElementById('mf-pilot-license')?.value||'').trim(),
              folio: !(document.getElementById('mf-folio')?.value||'').trim(),
              flightType: !(document.getElementById('mf-flight-type')?.value||'').trim(),
              arrivalMain: !!(document.getElementById('mf-dir-arr')?.checked) && (function(){
                const v=(document.getElementById('mf-airport-main')?.value||'').toUpperCase();
                const hasCatalog = !!(window.iataSet && typeof window.iataSet.has==='function' && window.iataSet.size>0);
                const isValid = (c)=>{ if (!c) return false; if (!/^[A-Z]{3}$/.test(c)) return false; if (window.iataStopwords && window.iataStopwords.has(c)) return false; return hasCatalog ? window.iataSet.has(c) : true; };
                return !isValid(v);
              })()
            };
            const anyNeed = need.tail || need.pilot || need.license || need.folio || need.arrivalMain || need.flightType;
            if (anyNeed){
              setProgress(58, 'OCR dirigido en campos faltantes...');
              const got = await ocrPdfTargeted(file, need);
              if (got && got.pilot && !document.getElementById('mf-pilot')?.value){
                try { forceSetVal('mf-pilot', got.pilot); } catch(_){ setVal('mf-pilot', got.pilot); }
              }
              if (got && got.license && !document.getElementById('mf-pilot-license')?.value) setVal('mf-pilot-license', (got.license||'').toUpperCase());
              if (got && got.tail && !document.getElementById('mf-tail')?.value){
                const reg = (got.tail||'').toUpperCase();
                // validar contra catálogo si existe
                try {
                  const key = (reg||'').toString().toUpperCase().replace(/[^A-Z0-9]/g,'');
                  if (!masterRegIndex.size || masterRegIndex.has(key)) setVal('mf-tail', reg);
                } catch(_){ setVal('mf-tail', reg); }
              }
              if (got && got.folio && !document.getElementById('mf-folio')?.value){
                const val = (window._mfExtractFolioDigitsSmart?.(got.folio) || got.folio);
                setVal('mf-folio', val);
              }
              if (got && got.arrivalMain && !document.getElementById('mf-airport-main')?.value){ setVal('mf-airport-main', got.arrivalMain); }
              if (got && got.flightType && !document.getElementById('mf-flight-type')?.value){
                const letter = (got.flightType||'').toString().toUpperCase().slice(0,1);
                if (letter){
                  setVal('mf-flight-type', letter);
                  try {
                    const el = document.getElementById('mf-flight-type');
                    if (el){
                      if (el.value !== letter) el.value = letter;
                      el.dispatchEvent(new Event('input',{ bubbles:true }));
                      el.dispatchEvent(new Event('change',{ bubbles:true }));
                    }
                  } catch(_){ }
                }
              }
            }
            // Si sigue faltando texto base (pdf imagen), último recurso: OCR de 1 página
            const stillNeed = !(document.getElementById('mf-folio')?.value||'').trim() && !(document.getElementById('mf-tail')?.value||'').trim() && !(document.getElementById('mf-pilot')?.value||'').trim() && !(document.getElementById('mf-pilot-license')?.value||'').trim();
            if ((!text || text.replace(/\s+/g,'').length < 30) && stillNeed){
              setProgress(70, 'OCR de apoyo (1 página)...');
              const txt2 = await ocrPdfOrImageV2(file, 1);
              if (txt2){ fillFieldsFromTextV2(txt2); }
            }
          } else {
            // Modo normal: OCR (2 páginas por defecto), luego fallback a texto PDF.
            setProgress(12, 'OCR en PDF...');
            try { await _v2CatalogsReady; } catch(_){ }
            // respetar selección de páginas si está visible
            let pages = 2; try { const sel=document.getElementById('manifest-ocr-pages'); pages = parseInt((sel&&sel.value)||'2',10)||2; } catch(_){ }
            let text = await ocrPdfOrImageV2(file, pages);
            if (!text || text.replace(/\s+/g,'').length < 30){
              setProgress(48, 'OCR limitado; extrayendo texto del PDF...');
              text = await extractPdfTextV2(file);
            }
            setProgress(70, 'Procesando...');
            fillFieldsFromTextV2(text||'');
          }
          // Post-procesado: Propagar N/A en horas si quedaron campos vacíos
          try {
            (function _applyNaPropagationForTimes(){
              try {
                const isArr = !!(document.getElementById('mf-dir-arr')?.checked);
                const ids = isArr
                  ? ['mf-arr-slot-assigned','mf-arr-slot-coordinated','mf-arr-arribo-posicion','mf-arr-inicio-desembarque','mf-arr-inicio-pernocta']
                  : ['mf-slot-assigned','mf-slot-coordinated','mf-inicio-embarque','mf-salida-posicion','mf-termino-pernocta'];
                const vals = ids.map(id=> (document.getElementById(id)?.value||'').trim());
                const hasAny = vals.some(v=> v && v.toUpperCase() !== 'N/A');
                const anyEmpty = vals.some(v=> !v);
                if (hasAny && anyEmpty){ ids.forEach((id, i)=>{ const el=document.getElementById(id); if (el && !vals[i]){ el.value = 'N/A'; el.setCustomValidity(''); } }); }
              } catch(_){ }
            })();
          } catch(_){ }
          setProgress(95, 'Casi listo...');
          setProgress(100, 'Completado');
          // Forzar finish y ocultar loader inmediatamente al completar
          try { _v2Tar = 100; _v2EffTar = 100; } catch(_){ }
          hideProgress();
          if (status) status.textContent = fast ? 'Escaneo completado (rápido)' : 'Escaneo completado (normal)';
        } catch(e){ if (status) status.textContent = 'Error en escaneo V2.'; hideProgress(); }
        finally {
          if (scanOcrBtn && !ocrWasDisabled) scanOcrBtn.disabled = false;
          if (buttonLocked) setScanButtonBusy(false);
        }
      }

      async function handleScanOcr(){
        try {
          const file = upload && upload.files && upload.files[0];
          if (!file){ if (status) status.textContent = 'Seleccione un archivo (PDF o imagen) antes de OCR.'; return; }
          try { window._lastManifestFile = file; } catch(_){ }
          setProgress(15, 'Preparando OCR...'); if (status) status.textContent = '';
          const pagesSel = document.getElementById('manifest-ocr-pages');
          const maxPages = parseInt((pagesSel && pagesSel.value)||'2', 10) || 2;
          const name = (file && file.name) || '';
          const type = (file && file.type) || '';
          const isPdf = /\.pdf$/i.test(name) || /application\/pdf/i.test(type);
          // Ensure catalogs are ready to improve matching accuracy
          try { await _v2CatalogsReady; } catch(_){ }
          const text = await ocrPdfOrImageV2(file, maxPages);
          setProgress(85, 'Procesando...');
          fillFieldsFromTextV2(text||'');
          try {
            const pilotVal = (document.getElementById('mf-pilot')?.value||'').trim();
            const pilotEmpty = !pilotVal || /^N\s*\/?\s*A$/i.test(pilotVal);
            if (pilotEmpty && isPdf && typeof ocrPdfTargeted === 'function'){
              try {
                const gotPilot = await ocrPdfTargeted(file, { pilot: true, license: false, tail: false, folio: false, arrivalMain: false, flightType: false });
                if (gotPilot && gotPilot.pilot){
                  const pilotEl = document.getElementById('mf-pilot');
                  const current = (pilotEl?.value || '').trim();
                  const isPlaceholder = /^N\s*\/?\s*A$/i.test(current);
                  if (!current || isPlaceholder){
                    try { forceSetVal('mf-pilot', gotPilot.pilot); } catch(_){ setVal('mf-pilot', gotPilot.pilot); }
                  }
                }
              } catch(_){ }
            }
            const pilotValAfterTarget = (document.getElementById('mf-pilot')?.value||'').trim();
            if (!pilotValAfterTarget || /^N\s*\/?\s*A$/i.test(pilotValAfterTarget)){
              try {
                const dbg = document.getElementById('manifest-ocr-debug')?.value || text || '';
                let fallbackPilot = _mfPilotPickAfterMando(dbg) || _mfPilotPickAfterMando(text || '');
                if (!fallbackPilot){
                  fallbackPilot = _mfPilotFindFallbackInText(dbg) || _mfPilotFindFallbackInText(text || '');
                }
                if (fallbackPilot){
                  try { forceSetVal('mf-pilot', fallbackPilot); } catch(_){ setVal('mf-pilot', fallbackPilot); }
                }
              } catch(_){ }
            }
            const folioEmpty = !((document.getElementById('mf-folio')?.value||'').trim());
            if (folioEmpty && isPdf && typeof ocrPdfTargeted === 'function'){
              setProgress(92, 'Buscando folio con OCR dirigido...');
              const got = await ocrPdfTargeted(file, { folio: true });
              if (got && got.folio){
                const clean = (window._mfExtractFolioDigitsSmart?.(got.folio) || got.folio || '').toString().trim();
                if (clean) setVal('mf-folio', clean);
              }
            }
            if (!((document.getElementById('mf-folio')?.value||'').trim())){
              const debugText = document.getElementById('manifest-ocr-debug')?.value || text || '';
              const fallback = (window._mfExtractFolioDigitsSmart?.(debugText) || '').toString().trim();
              if (fallback) setVal('mf-folio', fallback);
            }
            if (!((document.getElementById('mf-folio')?.value||'').trim()) && isPdf && typeof extractFolioFromPdfVector === 'function'){
              setProgress(94, 'Leyendo texto vectorial...');
              const vector = await extractFolioFromPdfVector(file, 2);
              if (vector) setVal('mf-folio', vector);
            }
          } catch(_){ }
          setProgress(100, 'Completado');
          try { _v2Tar = 100; _v2EffTar = 100; } catch(_){ }
          hideProgress();
          if (status) status.textContent = text ? 'OCR alternativo completado (V2).' : 'No se detectó texto.';
        } catch(e){ if (status) status.textContent = 'Error en OCR alternativo V2.'; hideProgress(); }
      }

      // Event delegation: garantiza funcionamiento aunque no se hayan enlazado listeners directos
      document.addEventListener('click', function(e){
        const t = e.target;
        if (!t) return;
        if (t.id === 'manifest-scan-pdf' || (t.closest && t.closest('#manifest-scan-pdf'))){ e.preventDefault(); handleScanPdf(); }
        if (t.id === 'manifest-scan-ocr' || (t.closest && t.closest('#manifest-scan-ocr'))){ e.preventDefault(); handleScanOcr(); }
        // Trigger pickers explicitly for mobile UX
        if (t.id === 'manifest-upload-btn-pdf' || (t.closest && t.closest('#manifest-upload-btn-pdf'))){
          e.preventDefault();
          try { if (upload){ upload.value=''; upload.setAttribute('accept','.pdf,application/pdf'); upload.click(); } } catch(_){ }
        }
        if (t.id === 'manifest-upload-btn-img' || (t.closest && t.closest('#manifest-upload-btn-img'))){
          e.preventDefault();
          try { if (upload){ upload.value=''; upload.setAttribute('accept','image/*'); upload.click(); } } catch(_){ }
        }
      });
      // Feedback en cambio de archivo (sin repreguntar dirección: se maneja en el listener dedicado del input)
      document.addEventListener('change', async function(e){
        const t = e.target;
        if (t && t.id === 'manifest-upload'){
          const f = t.files && t.files[0]; if (status) status.textContent = f ? `Archivo listo: ${f.name}` : 'No se seleccionó archivo.';
          try { window._lastManifestFile = f || null; } catch(_){ }
          // Prompt for direction on every new file
          try {
            if (f){ window._mfDirectionLocked = false; const isArr = await showDirectionPromptV2(); lockDirectionV2(!!isArr); }
          } catch(_){ }
          if (f) renderPreviewV2(f);
        }
      });
    } catch(_){}
  };

  // Activar V2 de forma robusta: si el DOM ya está listo, invocar de inmediato; si no, esperar DOMContentLoaded
  (function initManifestsV2(){
    const call = ()=>{ try { window.setupManifestsUI_v2?.(); } catch(_){} };
    if (document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', call, { once: true });
    } else {
      call();
    }
  })();
  // Removed custom time picker for mf-slot-assigned; using native input type=time for consistency
  
  // Delegador global: garantiza que el botón "Exportar Excel" funcione aunque otro módulo reemplace los listeners
  (function ensureExportExcelDelegator(){
    if (window._mfExcelDelegator) return; window._mfExcelDelegator = true;
    function buildAoALocal(rows){
      try {
        const monthOf = (iso)=>{ try { if (!iso) return ''; const [y,m] = String(iso).split('-'); return m || ''; } catch(_){ return ''; } };
        const isArr = (r)=> (r?.direction||'').toUpperCase().startsWith('L');
        const opType = (r)=>{
          try {
            if (typeof window._mfEnsureOperationType === 'function'){
              const ensured = window._mfEnsureOperationType(r);
              if (ensured) return ensured;
            }
          } catch(_){ }
          const code = (r?.operationType || r?.flightType || '').toString().trim();
          if (code) return code;
            return 'Sin determinar';
        };
        const tailStatus = (r)=>{
          try {
            const tail = (r?.tail||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
            if (!tail) return '';
            if (window.aircraftByReg && (window.aircraftByReg.get?.(tail) || window.aircraftByReg.get?.(tail))) return 'En catálogo';
            return 'No en catálogo';
          } catch(_){ return ''; }
        };
        const destinoOrigen = (r)=>{
          if (isArr(r)) return r.arrOriginCode || r.arrOriginName || '';
          return r.finalDestCode || r.finalDest || '';
        };
        const slotAsignado = (r)=> isArr(r) ? (r.arrSlotAssigned||'') : (r.slotAssigned||'');
        const slotCoord = (r)=> isArr(r) ? (r.arrSlotCoordinated||'') : (r.slotCoordinated||'');
        const pernocta = (r)=> isArr(r) ? (r.arrInicioPernocta||'') : (r.terminoPernocta||'');
        const horaOperacion = (r)=> isArr(r) ? (r.arrArriboPosicion||'') : (r.salidaPosicion||'');
        const totalExentos = (r)=>{
          const n = (x)=> parseInt(x||'0',10)||0;
          return String(n(r.paxDiplomaticos)+n(r.paxComision)+n(r.paxInfantes)+n(r.paxTransitos)+n(r.paxConexiones)+n(r.paxExentos));
        };
        const headersEs = [
          'MES','FECHA','TIPO DE MANIFIESTO','AEROLINEA','TIPO DE OPERACIÓN','AERONAVE','MATRÍCULA','ESTATUS MATRÍCULA','NUMERO DE VUELO','DESTINO / ORIGEN','SLOT ASIGNADO','SLOT COORDINADO','HORA DE INICIO O TERMINO DE PERNOCTA','HORA DE OPERACIÓN','HORA MÁXIMA DE ENTREGA','HORA DE RECEPCIÓN','HORAS CUMPLIDAS','PUNTUALIDAD / CANCELACIÓN','TOTAL PAX','DIPLOMATICOS','EN COMISION','INFANTES','TRANSITOS','CONEXIONES','OTROS EXENTOS','TOTAL EXENTOS','PAX QUE PAGAN TUA','KGS. DE EQUIPAJE'
        ];
        const headers = headersEs.slice();
        const aoa = (rows||[]).map(r=>{
          const vals = [];
          vals.push(monthOf(r.docDate));
          vals.push(r.docDate||'');
          vals.push(r.direction||'');
          vals.push(r.airline||r.operatorName||'');
          vals.push(opType(r));
          vals.push(r.aircraft||'');
          vals.push(r.tail||'');
          vals.push(tailStatus(r));
          vals.push(r.flight||'');
          vals.push(destinoOrigen(r));
          vals.push(slotAsignado(r));
          vals.push(slotCoord(r));
          vals.push(pernocta(r));
          vals.push(horaOperacion(r));
          vals.push(''); // Hora máxima de entrega (no disponible)
          vals.push(''); // Hora de recepción (no disponible)
          vals.push(''); // Horas cumplidas (no disponible)
          vals.push(''); // Puntualidad / Cancelación (no disponible)
          vals.push(r.paxTotal||'');
          vals.push(r.paxDiplomaticos||'');
          vals.push(r.paxComision||'');
          vals.push(r.paxInfantes||'');
          vals.push(r.paxTransitos||'');
          vals.push(r.paxConexiones||'');
          vals.push(r.paxExentos||'');
          vals.push(totalExentos(r));
          vals.push(r.paxTUA||'');
          vals.push(r.baggageKg||'');
          return vals;
        });
        return { headers, headersEs, aoa };
      } catch(_){ return { headers:[], headersEs:[], aoa:[] }; }
    }
    function readDemorasFixedLight(){
      const out = [];
      for (let i=1;i<=3;i++){
        const code = (document.getElementById(`demora${i}-codigo`)?.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
        const minutos = document.getElementById(`demora${i}-tiempo`)?.value||'';
        const descripcion = document.getElementById(`demora${i}-descripcion`)?.value||'';
        if (code || minutos || descripcion) out.push({ codigo: code, minutos, descripcion });
      }
      return out;
    }
    function readFormLight(){
      try { if (typeof window._mfComputeOperationType === 'function') window._mfComputeOperationType(); } catch(_){ }
      const g = (id)=> document.getElementById(id)?.value || '';
      const dirArr = document.getElementById('mf-dir-arr');
      const direction = (dirArr && dirArr.checked) ? 'Llegada' : 'Salida';
      const demoras = readDemorasFixedLight();
      const opTypeVal = (dirArr && dirArr.checked)
        ? (document.getElementById('mf-operation-type-arr')?.value || '')
        : (document.getElementById('mf-operation-type-dep')?.value || '');
      const record = {
        direction,
        title: g('mf-title'), docDate: g('mf-doc-date'), folio: g('mf-folio'),
        carrier3L: g('mf-carrier-3l'), operatorName: g('mf-operator-name'), airline: g('mf-airline'), flight: g('mf-flight'),
        airportMain: g('mf-airport-main'), flightType: g('mf-flight-type'), operationType: opTypeVal,
        tail: g('mf-tail'), aircraft: g('mf-aircraft'), originName: g('mf-origin-name'), originCode: g('mf-origin-code'),
  crewTotal: g('mf-crew-total'),
  baggageKg: g('mf-baggage-kg') || g('total-equipaje'),
  baggagePieces: g('mf-baggage-pcs'),
  cargoKg: g('mf-cargo') || g('total-carga'),
  cargoPieces: g('mf-cargo-pieces'),
  cargoVol: g('mf-cargo-volume'),
  mailKg: g('mf-mail') || g('total-correo'),
  mailPieces: g('mf-mail-pieces'),
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
        demoras
      };
      try { if (typeof window._mfEnsureOperationType === 'function') window._mfEnsureOperationType(record); } catch(_){ }
      return record;
    }
    function exportCurrentManifestsToExcel(){
      try {
        // Validación centralizada y robusta
        try { if (typeof window._mfValidateAll === 'function' && !window._mfValidateAll()) return; } catch(_){ }
        // 0) Preferir exportar la tabla visible si ya tiene filas
        try {
          const table = document.getElementById('manifest-records-table');
          const trEls = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
          const tableRecs = trEls.map(tr=> tr && tr._record).filter(Boolean);
          try {
            if (typeof window._mfEnsureOperationType === 'function'){
              tableRecs.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
            }
          } catch(_){ }
          if (tableRecs.length){
            const { headers, headersEs, aoa } = (window._mfBuildAoA||buildAoALocal)(tableRecs);
            if (window.XLSX && XLSX.utils && typeof XLSX.utils.aoa_to_sheet === 'function'){
              try { const ws = XLSX.utils.aoa_to_sheet([headersEs, ...aoa]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Manifiestos'); try { const range = XLSX.utils.decode_range(ws['!ref']||'A1'); ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) }; } catch(_){ } XLSX.writeFile(wb, 'manifiestos.xlsx'); return; } catch(_){ }
            }
            const esc=(v)=>{ const s=(v==null)?'':(typeof v==='boolean'?(v?'Sí':'No'):String(v)); return /[",\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"': s; };
            const lines=[headersEs.join(',')]; aoa.forEach(arr=> lines.push(arr.map(esc).join(',')));
            const csv='\ufeff'+lines.join('\r\n');
            const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='manifiestos.csv'; a.click();
            return;
          }
        } catch(_){ }
        let rows = [];
        try { rows = JSON.parse(localStorage.getItem('aifa.manifests')||'[]'); } catch(_){ rows = []; }
        if (!rows || rows.length===0){ rows = [ readFormLight() ]; }
        try {
          if (Array.isArray(rows) && typeof window._mfEnsureOperationType === 'function'){
            rows.forEach(r=>{ try { window._mfEnsureOperationType(r); } catch(_){ } });
          }
        } catch(_){ }
        if (rows.length>0 && (!rows[0].demoras || !Array.isArray(rows[0].demoras))){
          const ds = readDemorasFixedLight(); if (ds.length){ rows[0] = { ...rows[0], demoras: ds }; }
        }
  const build = (window._mfBuildAoA||buildAoALocal);
  const { headers, headersEs, aoa } = build(rows);
        if (window.XLSX && XLSX.utils && typeof XLSX.utils.aoa_to_sheet==='function'){
          try {
            const ws = XLSX.utils.aoa_to_sheet([headersEs, ...aoa]);
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Manifiestos');
            try { const range = XLSX.utils.decode_range(ws['!ref']||'A1'); ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) }; } catch(_){ }
            XLSX.writeFile(wb, 'manifiestos.xlsx'); return;
          } catch(err){ console.warn('SheetJS export failed, fallback CSV', err); }
        }
  const esc=(v)=>{ const s=(v==null)?'':(typeof v==='boolean'?(v?'Sí':'No'):String(v)); return /[",\n]/.test(s)? '"'+s.replace(/"/g,'""')+'"': s; };
  const lines=[headersEs.join(',')]; aoa.forEach(arr=>{ lines.push(arr.map(esc).join(',')); });
  const csv='\ufeff'+lines.join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='manifiestos.csv'; a.click();
      } catch(err){ console.error('Export (delegator) error', err); }
    }
    document.addEventListener('click', function(e){
      const btn = e.target && (e.target.id === 'manifest-export-csv' ? e.target : (e.target.closest && e.target.closest('#manifest-export-csv')));
      if (!btn) return;
      // Evitar doble descarga si ya existe wiring directo
      if (window._mfExportDirect) return;
      e.preventDefault(); exportCurrentManifestsToExcel();
    });
  })();

  // Delegador global (captura) para Guardar: bloquea si no es válido, incluso si otros listeners existen
  (function ensureSaveDelegator(){
    if (window._mfSaveDelegator) return; window._mfSaveDelegator = true;
    document.addEventListener('click', function(e){
      const t = e.target;
      const btn = t && (t.id === 'manifest-save' ? t : (t.closest && t.closest('#manifest-save')));
      if (!btn) return;
      // Validación antes de otros listeners (fase de captura fuera; explicitamente prevenimos si inválido)
      try {
        if (typeof window._mfValidateAll === 'function'){
          const ok = window._mfValidateAll();
          if (!ok){ e.preventDefault(); e.stopImmediatePropagation(); return false; }
        }
      } catch(_){ }
    }, true); // captura
  })();

  // Delegador global: garantiza que el botón "Añadir a tabla" funcione aunque el wiring original falle
  (function ensureAddToTableDelegator(){
    if (window._mfAddToTableDelegator) return; window._mfAddToTableDelegator = true;
    function addCurrentToRecordsTableLight(){
      try {
        const tbody = document.querySelector('#manifest-records-table tbody'); if (!tbody) return;
        // Preferir lector ligero para evitar dependencias
        const r = (typeof readForm === 'function' ? readForm() : (typeof readFormLight === 'function' ? readFormLight() : {}));
        const fecha = r.docDate || '';
        const hora = r.direction === 'Llegada'
          ? (r.arrSlotAssigned || r.arrSlotCoordinated || r.arrArriboPosicion || '')
          : (r.slotAssigned || r.slotCoordinated || r.salidaPosicion || '');
        const od = r.direction === 'Llegada'
          ? `${r.arrOriginCode||r.arrOriginName||''}`
          : `${r.finalDestCode||r.finalDest||''}`;
        const airlineCol = `${r.carrier3L? (String(r.carrier3L).toUpperCase()+ ' - ') : ''}${r.airline||r.operatorName||''}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.direction||''}</td>
          <td>${airlineCol}</td>
          <td>${r.flight||''}</td>
          <td>${r.tail||''}</td>
          <td>${fecha}</td>
          <td>${hora}</td>
          <td>${od}</td>
          <td>${r.paxTotal||''}</td>
          <td>${(r.cargoKg||'')}/${(r.mailKg||'')}</td>
          <td>${r.image?('<img src="'+r.image+'" style="height:30px">') : ''}</td>`;
        tr._record = r;
        tbody.appendChild(tr);
      } catch(err){ console.error('Delegator: añadir a tabla falló:', err); }
    }
    document.addEventListener('click', function(e){
      const btn = e.target && (e.target.id === 'manifest-add-to-table' ? e.target : (e.target.closest && e.target.closest('#manifest-add-to-table')));
      if (btn){ e.preventDefault(); addCurrentToRecordsTableLight(); }
    });
  })();
})();
