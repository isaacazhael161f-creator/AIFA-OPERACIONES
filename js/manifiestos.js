;(function(){

  // Global zoom and plane-progress helpers (shared by V1 and V2)
  window.__manifestZoom = window.__manifestZoom || 1.0;
  window.manifestApplyZoom = function(){
    try {
      const z = window.__manifestZoom;
      const canvas = document.getElementById('manifest-preview-canvas');
      const textLayer = document.getElementById('manifest-text-layer');
      const img = document.getElementById('manifest-preview');
      const label = document.getElementById('manifest-zoom-label');
      if (label) label.textContent = Math.round(z*100)+'%';
      const apply = (el)=>{ if (!el) return; el.style.transformOrigin='top left'; el.style.transform = 'scale('+z+')'; };
      apply(canvas); apply(textLayer); apply(img);
    } catch(_){}
  };
  window.manifestSetZoom = function(z){
    const nz = Math.max(0.5, Math.min(3.0, Number(z)||1));
    window.__manifestZoom = nz; window.manifestApplyZoom();
  };
  // Global time helpers: normalize time strings and find times near labels
  (function(){
    // Accept HH:MM, HH.MM, HH-MM, HH MM, H:MM, compact HHMM; optional suffix like hrs/hr/h
    const TIME_RX = /\b(?:([01]?\d|2[0-3])[\s:\\.hH\-–—·•]\s?([0-5]\d)|([01]?\d|2[0-3])([0-5]\d))\b(?:\s?(?:hrs?\.?|hr\.?|h\.?))?/i;
    window._mfTimeRx = TIME_RX;
    window._mfNormTime = function(v){
      try {
        if (!v) return '';
        const s = String(v).trim();
        const m = s.match(TIME_RX);
        if (!m) return '';
        let hh, mm;
        if (m[1] != null && m[2] != null){
          hh = String(m[1]); mm = String(m[2]);
        } else {
          const raw = String(m[3]||'') + String(m[4]||'');
          if (!raw) return '';
          if (raw.length === 3){ hh = '0' + raw[0]; mm = raw.slice(1); }
          else { hh = raw.slice(0,2); mm = raw.slice(-2); }
        }
        const H = String(hh).padStart(2,'0'); const M = String(mm).padStart(2,'0');
        const Hi = parseInt(H,10), Mi = parseInt(M,10);
        if (!(Hi>=0 && Hi<=23 && Mi>=0 && Mi<=59)) return '';
        return H + ':' + M;
      } catch(_) { return ''; }
    };
    window._mfExtractTimeAfterLabel = function(text, labelRx, opts){
      try {
        const maxAhead = Math.max(0, Math.min(12, (opts && opts.maxAhead) || 6));
        const lines = String(text||'').split(/\r?\n/);
        for (let i=0;i<lines.length;i++){
          const line = lines[i]||'';
          if (labelRx.test(line)){
            // Prefer time on the same line to the right of the label
            const idx = line.search(labelRx);
            const rest = idx>=0 ? line.slice(idx) : line;
            const mSame = rest.match(TIME_RX);
            if (mSame){ const t = window._mfNormTime(rest); if (t) return t; }
            // Otherwise scan the next few lines
            for (let k=1;k<=maxAhead;k++){
              const s = lines[i+k]||'';
              const m = s.match(TIME_RX);
              if (m){ const t = window._mfNormTime(s); if (t) return t; }
            }
            // Optional: look slightly before too (table formats)
            for (let k=1;k<=Math.min(2,maxAhead);k++){
              const s = lines[i-k]||'';
              const m = s.match(TIME_RX);
              if (m){ const t = window._mfNormTime(s); if (t) return t; }
            }
          }
        }
      } catch(_){ }
      return '';
    };

    // Dedicated robust extractor for the Slot Assigned time; uses fuzzy label patterns and window scans
    window._mfFindSlotAssignedTime = function(text){
      try {
        const T = String(text||'');
        // Fuzzy patterns (allow spaces between letters and common OCR confusions like 7 for T, 1 for I)
        const R = {
          HORA_SLOT_ASIGNADO: /H\s*O\s*R\s*A\s*(?:D\s*E\s*)?S\s*L\s*O\s*[T7]\s*(?:D\s*E\s*)?A\s*S\s*[I1]\s*G\s*N\s*A\s*D\s*O/i,
          SLOT_ASIGNADO: /S\s*L\s*O\s*[T7]\s*A\s*S\s*[I1]\s*G\s*N\s*A\s*D\s*O/i,
          HORA_DE_SLOT: /H\s*O\s*R\s*A\s*(?:D\s*E\s*)?S\s*L\s*O\s*[T7]/i,
          SLOT_ASIG: /S\s*L\s*O\s*[T7]\s*A\s*S\s*[I1]\s*G\b/i
        };
        const patterns = [R.HORA_SLOT_ASIGNADO, R.SLOT_ASIGNADO, R.HORA_DE_SLOT, R.SLOT_ASIG];
        for (const rx of patterns){
          const m = T.match(rx);
          if (m && typeof m.index === 'number'){
            const start = m.index + (m[0]?.length||0);
            const after = T.slice(start, start+200);
            const before = T.slice(Math.max(0, m.index-120), m.index);
            // Try window after label
            const hitAfter = after.match(TIME_RX);
            if (hitAfter){ const t = window._mfNormTime(hitAfter[0]); if (t) return t; }
            // Try same line remainder
            const lineEnd = T.indexOf('\n', start);
            if (lineEnd !== -1){
              const restLine = T.slice(start, lineEnd);
              const mLine = restLine.match(TIME_RX);
              if (mLine){ const t = window._mfNormTime(mLine[0]); if (t) return t; }
            }
            // Try context before label (tables with value to the left)
            const hitBefore = before.match(TIME_RX);
            if (hitBefore){ const t = window._mfNormTime(hitBefore[0]); if (t) return t; }
          }
        }
        // Fallback: any line containing SLOT or ASIG nearby a time
        const lines = T.split(/\r?\n/);
        for (const ln of lines){
          if (/(S\s*L\s*O\s*[T7])|(ASIG)/i.test(ln)){
            const m = ln.match(TIME_RX); if (m){ const t = window._mfNormTime(m[0]); if (t) return t; }
          }
        }
      } catch(_){ }
      return '';
    };

    // Generic fuzzy label builder and finder for other time fields
    const _stripAcc = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const _charClass = (ch)=>{
      const c = ch.toUpperCase();
      if (c==='I') return '[I1]';
      if (c==='O') return '[O0]';
      if (c==='T') return '[T7]';
      if (c==='A') return '[AÁA]';
      if (c==='E') return '[EÉE]';
      if (c==='N') return '[NÑN]';
      // default A-Z or digit
      if (/^[A-Z0-9]$/.test(c)) return c;
      return ch; // punctuation or space handled separately
    };
    window._mfMakeFuzzyLabelRegex = function(phrase){
      const base = _stripAcc(String(phrase||'').toUpperCase());
      let out = '';
      for (let i=0;i<base.length;i++){
        const ch = base[i];
        if (ch===' '){ out += '\\s+'; continue; }
        if (/[^A-Z0-9]/.test(ch)){ out += '\\s*'; continue; }
        out += _charClass(ch) + '\\s*';
      }
      return new RegExp(out, 'i');
    };
    window._mfFindTimeByLabels = function(text, labelPhrases, opts){
      try {
        for (const p of (labelPhrases||[])){
          const rx = (p instanceof RegExp) ? p : window._mfMakeFuzzyLabelRegex(String(p||''));
          const t = window._mfExtractTimeAfterLabel(text, rx, opts||{ maxAhead: 8 });
          if (t) return t;
        }
        // Fallback: any line containing core keywords from the first label
        const first = _stripAcc(String((labelPhrases&&labelPhrases[0])||''));
        const keys = first.split(/\s+/).filter(Boolean).slice(0,3);
        const Krx = new RegExp(keys.map(k=>k.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')).join('.*'), 'i');
        const lines = String(text||'').split(/\r?\n/);
        for (const ln of lines){ if (Krx.test(_stripAcc(ln))){ const m = ln.match(TIME_RX); if (m){ const t = window._mfNormTime(m[0]); if (t) return t; } } }
      } catch(_){ }
      return '';
    };

    // Lightweight custom 24h time picker (hour/minute selectors) reused by all time fields
    let _tpEl = null, _tpHour=null, _tpMin=null, _tpApply=null, _tpCancel=null, _tpAnchor=null;
    function _ensureTimePicker(){
      if (_tpEl) return _tpEl;
      const el = document.createElement('div');
      el.id = 'mf-time-picker';
      el.style.position = 'absolute';
      el.style.zIndex = '10000';
      el.style.background = '#fff';
      el.style.border = '1px solid rgba(0,0,0,0.15)';
      el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      el.style.borderRadius = '8px';
      el.style.padding = '8px';
      el.style.display = 'none';
      el.style.minWidth = '220px';
      el.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
          <div style="flex:1;">
            <label style="font-size:12px; color:#666;">Hora</label>
            <select id="mf-tp-hour" style="width:100%; padding:6px; border-radius:6px; border:1px solid #ccc;"></select>
          </div>
          <div style="flex:1;">
            <label style="font-size:12px; color:#666;">Minutos</label>
            <select id="mf-tp-min" style="width:100%; padding:6px; border-radius:6px; border:1px solid #ccc;"></select>
          </div>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
          <button id="mf-tp-cancel" type="button" class="btn btn-sm btn-light">Cancelar</button>
          <button id="mf-tp-apply" type="button" class="btn btn-sm btn-primary">Aplicar</button>
        </div>`;
      document.body.appendChild(el);
      _tpEl = el;
      _tpHour = el.querySelector('#mf-tp-hour');
      _tpMin = el.querySelector('#mf-tp-min');
      _tpApply = el.querySelector('#mf-tp-apply');
      _tpCancel = el.querySelector('#mf-tp-cancel');
      // Fill options
      if (_tpHour && !_tpHour._filled){
        _tpHour._filled=1; for (let h=0;h<24;h++){ const o=document.createElement('option'); const H=String(h).padStart(2,'0'); o.value=H; o.textContent=H; _tpHour.appendChild(o);} }
      if (_tpMin && !_tpMin._filled){
        _tpMin._filled=1; for (let m=0;m<60;m++){ const o=document.createElement('option'); const M=String(m).padStart(2,'0'); o.value=M; o.textContent=M; _tpMin.appendChild(o);} }
      _tpCancel.addEventListener('click', ()=>{ _tpEl.style.display='none'; _tpAnchor=null; });
      _tpApply.addEventListener('click', ()=>{
        try {
          if (!_tpAnchor) return; const H=_tpHour.value||'00'; const M=_tpMin.value||'00';
          const v = `${H}:${M}`; const norm = (window._mfNormTime? window._mfNormTime(v): v);
          _tpAnchor.value = norm || '';
          // If there is an attached NA checkbox, ensure NA turns off when a time is set
          const cb = document.getElementById(_tpAnchor.id+'-na'); if (cb){ cb.checked=false; cb.dispatchEvent(new Event('change',{bubbles:true})); }
        } catch(_){ }
        _tpEl.style.display='none'; _tpAnchor=null;
      });
      document.addEventListener('click', (e)=>{ if(!_tpEl || _tpEl.style.display==='none') return; const t=e.target; if (t===_tpEl || _tpEl.contains(t) || t===_tpAnchor) return; _tpEl.style.display='none'; _tpAnchor=null; });
      return _tpEl;
    }
    function _openTimePickerFor(input){
      const el = _ensureTimePicker();
      _tpAnchor = input;
      // Preselect from current value
      try{
        const v = String(input.value||''); const m = v.match(/^(\d{2}):(\d{2})$/); const H=(m?m[1]:'00'), M=(m?m[2]:'00');
        if (_tpHour) _tpHour.value = H; if (_tpMin) _tpMin.value = M;
      } catch(_){ }
      // Position below input
      const r = input.getBoundingClientRect();
      el.style.left = Math.max(8, Math.min(window.innerWidth-240, r.left + window.scrollX))+'px';
      el.style.top = (r.bottom + window.scrollY + 6)+'px';
      el.style.display = 'block';
    }
    window._mfBindTimePickerButtons = function(){
      try {
        (window._mfTimeFieldIds||[]).forEach(id=>{
          const input = document.getElementById(id); if (!input || input._tpWired) return; input._tpWired=1;
          // Insert a small trigger button after the input
          const btn = document.createElement('button'); btn.type='button'; btn.className='btn btn-sm btn-outline-secondary ms-2'; btn.title='Elegir hora'; btn.textContent='⏱';
          if (input.parentElement) input.parentElement.appendChild(btn);
          btn.addEventListener('click', ()=> _openTimePickerFor(input));
          // Also open on double-click on the input for convenience
          input.addEventListener('dblclick', ()=> _openTimePickerFor(input));
          // Enforce pattern HH:MM on blur via normalization
          input.addEventListener('blur', ()=>{ const n=(window._mfNormTime? window._mfNormTime(input.value): input.value); if (n) input.value=n; });
        });
      } catch(_){ }
    };
  })();

  // Generic Catalog Picker with search (for fields like Matrículas, Aerolíneas, Aeropuertos)
  (function(){
    let _cpEl=null,_cpSearch=null,_cpList=null,_cpCancel=null,_cpAnchor=null,_cpItems=[],_cpOnPick=null;
    const _cache = { aircraft:null, airlines:null, airports:null, types:null };
  function _ensureCatalogPicker(){
      if (_cpEl) return _cpEl;
      const el = document.createElement('div');
      el.id = 'mf-catalog-picker';
      el.style.position = 'absolute'; el.style.zIndex='10000'; el.style.background='#fff';
      el.style.border='1px solid rgba(0,0,0,0.15)'; el.style.boxShadow='0 4px 16px rgba(0,0,0,0.15)';
      el.style.borderRadius='8px'; el.style.padding='8px'; el.style.display='none'; el.style.minWidth='360px';
      el.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
          <input id="mf-cp-search" type="search" placeholder="Buscar..." class="form-control" style="flex:1;">
          <button id="mf-cp-cancel" type="button" class="btn btn-sm btn-light">Cerrar</button>
        </div>
        <div id="mf-cp-list" style="max-height:300px; overflow:auto; border:1px solid #eee; border-radius:6px;"></div>`;
      document.body.appendChild(el);
      _cpEl = el; _cpSearch = el.querySelector('#mf-cp-search'); _cpList = el.querySelector('#mf-cp-list'); _cpCancel = el.querySelector('#mf-cp-cancel');
  _cpCancel.addEventListener('click', ()=>{ _cpEl.style.display='none'; _cpAnchor=null; _cpOnPick=null; });
      _cpSearch.addEventListener('input', ()=> _refreshList(_cpSearch.value||''));
      document.addEventListener('click', (e)=>{ if(!_cpEl || _cpEl.style.display==='none') return; const t=e.target; if (t===_cpEl || _cpEl.contains(t) || (_cpAnchor && (t===_cpAnchor || _cpAnchor.contains?.(t)))) return; _cpEl.style.display='none'; _cpAnchor=null; _cpOnPick=null; });
      return el;
    }
    function _sortItems(arr){
      const items = Array.from(arr||[]);
      const keyFor = (it)=>{
        if (!it) return '';
        if (it.kind === 'aircraft') return String(it.value||it.label||'').toUpperCase(); // matrícula primero
        if (it.kind === 'airline') return String(it.meta?.name||it.label||it.value||'').toUpperCase(); // nombre de aerolínea
        if (it.kind === 'airport') return String(it.meta?.name||it.label||it.value||'').toUpperCase(); // nombre del aeropuerto
        return String(it.label||it.value||'').toUpperCase();
      };
      return items.sort((a,b)=> keyFor(a).localeCompare(keyFor(b), 'es', { sensitivity:'base', numeric:true }));
    }
    function _refreshList(q){
      if (!_cpList) return;
      const Q = (q||'').toString().trim();
      const QQ = Q.toUpperCase();
      const items = _sortItems(!QQ ? _cpItems : _cpItems.filter(it=> it._k.includes(QQ)));
      if (!items.length){ _cpList.innerHTML = '<div class="p-2 text-muted">Sin resultados</div>'; return; }
      const esc = (s)=> String(s||'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
      const escRe = (s)=> s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hilite = (s)=>{
        const str = String(s||''); if (!Q) return esc(str);
        try { return esc(str).replace(new RegExp('('+escRe(Q)+')','ig'), '<mark>$1</mark>'); } catch(_) { return esc(str); }
      };
      const renderItem = (it, i)=>{
        const kind = it.kind||''; const m = it.meta||{};
        if (kind==='aircraft'){
          const reg = hilite(it.value||'');
          const t = hilite(m.type||'');
          const tn = hilite(m.typeName||'');
          const own = hilite(m.ownerName||m.ownerIATA||'');
          return `<button type="button" data-i="${i}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; background:#0d6efd; color:#fff; padding:2px 6px; border-radius:4px; font-weight:600;">${reg}</span>
              <div style="flex:1; min-width:0;">
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#333;">${t}${tn?` · ${tn}`:''}</div>
                ${own?`<div style="font-size:12px; color:#6c757d; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${own}</div>`:''}
              </div>
            </div>
          </button>`;
        }
        if (kind==='airline'){
          const name = hilite(m.name||it.value||'');
          const iata = m.iata? `<span style=\"background:#e9ecef; color:#495057; padding:2px 6px; border-radius:4px; font-weight:600;\">${hilite(m.iata)}</span>` : '';
          const icao = m.icao? `<span style=\"background:#e9ecef; color:#495057; padding:2px 6px; border-radius:4px; font-weight:600;\">${hilite(m.icao)}</span>` : '';
          return `<button type="button" data-i="${i}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div style="flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#333; font-weight:600;">${name}</div>
              <div style="display:flex; gap:6px;">${iata}${icao}</div>
            </div>
          </button>`;
        }
        if (kind==='airport'){
          const iata = hilite(m.iata||'—');
          const icao = m.icao? `<span style=\"background:#e9ecef; color:#495057; padding:2px 6px; border-radius:4px; font-weight:600;\">${hilite(m.icao)}</span>` : '';
          const name = hilite(m.name||it.value||'');
          const city = m.city||''; const country = m.country||'';
          const loc = (city||country) ? ` <span style=\"color:#6c757d;\">(${hilite(city)}${city&&country?', ':''}${hilite(country)})</span>` : '';
          return `<button type="button" data-i="${i}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="display:inline-block; background:#0d6efd; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; min-width:38px; text-align:center;">${iata}</span>
              <div style="flex:1; min-width:0;">
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#333; font-weight:600;">${name}${loc}</div>
              </div>
              ${icao}
            </div>
          </button>`;
        }
        // Fallback generic
        return `<button type="button" data-i="${i}" class="cp-item" style="display:block; width:100%; text-align:left; padding:10px 12px; border:0; border-bottom:1px solid #f1f1f1; background:transparent;">${hilite(it.label||it.value||'')}</button>`;
      };
      _cpList.innerHTML = items.map((it,i)=> renderItem(it,i)).join('');
      Array.from(_cpList.querySelectorAll('button[data-i]')).forEach(btn=>{
        btn.addEventListener('click', ()=>{ try { const it = items[parseInt(btn.getAttribute('data-i'),10)]; if (!it) return; if (_cpAnchor){ _cpAnchor.value = it.value; _cpAnchor.dispatchEvent(new Event('input',{bubbles:true})); _cpAnchor.dispatchEvent(new Event('change',{bubbles:true})); } if (typeof _cpOnPick==='function') _cpOnPick(it, _cpAnchor); } finally { _cpEl.style.display='none'; _cpAnchor=null; _cpOnPick=null; } });
      });
    }
    async function _loadCSV(url){
      const res = await fetch(url, { cache:'no-store' }); const text = await res.text(); return text;
    }
    function _parseCSV(text){
      const rows=[]; let i=0, s=text||''; let field=''; let row=[]; let inQ=false;
      while(i<s.length){ const ch=s[i++]; if(inQ){ if(ch==='"'){ if(s[i]==='"'){ field+='"'; i++; } else { inQ=false; } } else { field+=ch; } } else { if(ch==='"'){ inQ=true; } else if(ch===','){ row.push(field); field=''; } else if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; } else if(ch==='\r'){ /* skip */ } else { field+=ch; } } }
      if (field.length>0 || row.length>0){ row.push(field); rows.push(row); }
      return rows;
    }
    function _rowsToObjects(rows){ if (!rows || !rows.length) return []; const headers = rows[0].map(h=> String(h||'').trim()); return rows.slice(1).map(r=>{ const o={}; headers.forEach((h,idx)=> o[h]= (r[idx]||'').toString().trim()); return o; }); }
    async function loadAircraftItems(){
      if (_cache.aircraft) return _cache.aircraft;
      // Load aircraft and (optionally) airlines for owner names and type names
      const [tAirc, tAirl, tTypes] = await Promise.all([
        _loadCSV('data/master/aircraft.csv').catch(()=>''),
        _loadCSV('data/master/airlines.csv').catch(()=>''),
        _loadCSV('data/master/aircraft type.csv').catch(()=>''),
      ]);
  const mapAirl = new Map(); try { const rows = _rowsToObjects(_parseCSV(tAirl)); rows.forEach(r=>{ const ia=(r.IATA||'').toUpperCase(); const nm=r.Name||''; const ic=(r.ICAO||'').toUpperCase(); if(ia) mapAirl.set(ia, { name:nm, icao:ic }); }); } catch(_){ }
      const mapTypeName = new Map(); try { const rows = _rowsToObjects(_parseCSV(tTypes)); rows.forEach(r=>{ const code=(r['code']||r['Code']||r['IATA']||r[Object.keys(r)[0]]||'').toUpperCase(); const name = r['Name']||r['name']||r[Object.keys(r)[2]]||''; if (code) mapTypeName.set(code, name); }); } catch(_){ }
      const rows = _rowsToObjects(_parseCSV(tAirc));
      const items = rows.map(r=>{
        const reg = (r['Registration']||'').toUpperCase(); const type = (r['Aircraft Type']||'').toUpperCase(); const owner = (r['Aircraft Owner']||'').toUpperCase();
        if (!reg) return null;
        const ownerRec = mapAirl.get(owner) || null; const ownerName = ownerRec?.name || owner || ''; const ownerICAO = ownerRec?.icao || '';
        const typeName = mapTypeName.get(type)||'';
        const label = `${reg} — ${type}${typeName?(' · '+typeName):''}${ownerName?(' · '+ownerName):''}`;
        const _k = (reg+' '+type+' '+typeName+' '+owner+' '+ownerName+' '+ownerICAO).toUpperCase();
        return { value: reg, label, _k, kind:'aircraft', meta:{ type, typeName, ownerIATA: owner, ownerName, ownerICAO } };
      }).filter(Boolean);
      _cache.aircraft = items; return items;
    }
    async function loadAirlineItems(){
      if (_cache.airlines) return _cache.airlines;
      const t = await _loadCSV('data/master/airlines.csv').catch(()=> '');
      const rows = _rowsToObjects(_parseCSV(t));
      const items = rows.map(r=>{ const iata=(r.IATA||'').toUpperCase(); const icao=(r.ICAO||'').toUpperCase(); const name=r.Name||''; if (!name && !icao && !iata) return null; const lab = `${name}${iata?(' — '+iata):''}${icao?(' / '+icao):''}`; const _k = (name+' '+iata+' '+icao).toUpperCase(); return { value: name, label: lab, _k, kind:'airline', meta:{ iata, icao, name } }; }).filter(Boolean);
      _cache.airlines = items; return items;
    }
    async function loadAirportItems(){
      if (_cache.airports) return _cache.airports;
      const t = await _loadCSV('data/master/airports.csv').catch(()=> '');
      const rows = _rowsToObjects(_parseCSV(t));
      const items = rows.map(r=>{ const iata=(r.IATA||'').toUpperCase(); const icao=(r.ICAO||'').toUpperCase(); const name=r.Name||''; const city=r.City||''; const country=r.Country||''; if (!name && !iata && !icao) return null; const lab = `${iata||'—'} — ${name}${city?(' ('+city+(country?(', '+country):'')+')'):''}${icao?(' · '+icao):''}`; const _k = (iata+' '+icao+' '+name+' '+city+' '+country).toUpperCase(); return { value: iata||name, label: lab, _k, kind:'airport', meta:{ iata, icao, name, city, country } }; }).filter(Boolean);
      _cache.airports = items; return items;
    }
    function _openCatalogPickerFor(input, loadItems, onPick){
      const el = _ensureCatalogPicker(); _cpAnchor=input; _cpOnPick=onPick; _cpItems=[]; _cpSearch.value=''; _cpList.innerHTML='<div class="p-2 text-muted">Cargando...</div>';
      const r = input.getBoundingClientRect(); el.style.left = Math.max(8, Math.min(window.innerWidth-380, r.left + window.scrollX))+'px'; el.style.top = (r.bottom + window.scrollY + 6)+'px'; el.style.display='block';
      Promise.resolve().then(loadItems).then(items=>{
        _cpItems = _sortItems((items||[]).map(it=> ({...it, _k: (it._k || (it.label+' '+it.value)).toUpperCase()})));
        _refreshList('');
      }).catch(()=>{ _cpList.innerHTML='<div class="p-2 text-danger">No se pudo cargar el catálogo</div>'; });
    }
    window._mfAttachCatalogButton = function(id, opts){
      try {
        const input = document.getElementById(id); if (!input || input._cpWired) return; input._cpWired=1;
        const btn = document.createElement('button'); btn.type='button'; btn.className='btn btn-sm btn-outline-secondary ms-2'; btn.title='Seleccionar de catálogo'; btn.textContent='🔎';
        input.insertAdjacentElement('afterend', btn);
        const loadItems = (opts && opts.load==='aircraft') ? loadAircraftItems : (opts && opts.load==='airlines') ? loadAirlineItems : (opts && opts.load==='airports') ? loadAirportItems : (opts && typeof opts.load==='function') ? opts.load : async()=>[];
        const onPick = (typeof opts?.onPick==='function') ? opts.onPick : null;
        btn.addEventListener('click', ()=> _openCatalogPickerFor(input, loadItems, onPick));
      } catch(_){ }
    };
  })();
  // Lightweight, shared OCR preloader using Tesseract.js scheduler (multi-worker)
  // Creates a small pool of workers initialized with 'spa+eng' to accelerate first OCR.
  // Reused by both V1 and V2 flows when available; falls back transparently otherwise.
  (function(){
    let _initPromise = null;
    window._mfOcrScheduler = window._mfOcrScheduler || null;
    // Explicit Tesseract resource paths to avoid worker importScripts issues behind CDNs
    const _tessOpts = {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0'
    };
    window.ensureOcrScheduler = async function ensureOcrScheduler(){
      if (window._mfOcrScheduler) return window._mfOcrScheduler;
      if (_initPromise) return _initPromise;
      _initPromise = (async ()=>{
        try {
          if (!window.Tesseract){
            await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js'; s.crossOrigin='anonymous'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
          }
          if (!window.Tesseract || !Tesseract.createScheduler || !Tesseract.createWorker) return null;
          const sched = Tesseract.createScheduler();
          const cores = (typeof navigator!=='undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 2;
          const workers = Math.min(4, Math.max(2, Math.floor(cores/2)));
          for (let i=0;i<workers;i++){
            const w = await Tesseract.createWorker(_tessOpts);
            await w.loadLanguage('spa+eng');
            await w.initialize('spa+eng');
            await sched.addWorker(w);
          }
          window._mfOcrScheduler = sched;
          return sched;
        } catch(_){ return null; }
      })();
      return _initPromise;
    };
  })();
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
      const res = await fetch('data/master/delay.csv', { cache: 'no-store' });
      const text = await res.text();
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
  window._mfAttachCatalogButton('mf-airport-main', { load:'airports', onPick:(it, input)=>{ try { const a=it?.meta; if (!a) return; input.value = (a.iata||'').toUpperCase(); } catch(_){ } }});
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
          const viewport = page.getViewport({ scale: 1 });
          // Render larger: target near-container-width with a higher cap
          const scale = Math.min(2.0, Math.max(0.9, containerWidth / viewport.width));
          const vp = page.getViewport({ scale });
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
          const viewport = page.getViewport({ scale: 2 });
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
        } catch(_){ }
      }
      function _unlockDirectionChoice(){
        try { 
          if (dirArr) dirArr.disabled = false; 
          if (dirDep) dirDep.disabled = false; 
          window._mfDirectionLocked = false; 
        } catch(_){ }
      }
      up.addEventListener('change', function(e) {
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
            const resp = window.confirm('¿El documento a escanear es de LLEGADA?\nAceptar = Llegada, Cancelar = Salida');
            _lockDirectionChoice(!!resp);
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
      });

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
          // Title
          const title = findNearLabelValue(['MANIFIESTO'], /MANIFIESTO.*/i, text);
          setVal('mf-title', title);
          // Vuelo
          let vuelo = findNearLabelValue(['VUELO'], /[A-Z0-9]{3,6}/, text);
          let airlineMatch = findValidAirline(vuelo?.slice(0,2));
          setVal('mf-flight', airlineMatch ? vuelo : '');
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
          // Pasajeros
          let pax = findNearLabelValue(['PASAJEROS','PAX'], /\d{1,4}/, text);
          setVal('pax-total', pax || '');
          // Tripulación total (número)
          try {
            const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
            if (crew) setVal('mf-crew-total', crew);
          } catch(_){}
          // Piloto al mando
          try {
            const nameRx = /\b[A-ZÁÉÍÓÚÑ](?:\.|\s)\s?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+\b/;
            const pilot = findNearLabelValue(['PILOTO AL MANDO','PILOTO','CAPITAN','CAPITÁN'], nameRx, text);
            if (pilot) setVal('mf-pilot', pilot);
          } catch(_){}
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
            setProgress(70, 'Procesando campos...');
            // Reutilizar el mismo pipeline de parseo
            const title = findNearLabelValue(['MANIFIESTO'], /MANIFIESTO.*/i, text);
            setVal('mf-title', title);
            let vuelo = findNearLabelValue(['VUELO'], /[A-Z0-9]{3,6}/, text);
            let airlineMatch = findValidAirline(vuelo?.slice(0,2));
            setVal('mf-flight', airlineMatch ? vuelo : '');
            let fecha = findNearLabelValue(['FECHA','FECHA DEL DOCUMENTO','FECHA DOC','FECHA DOCUMENTO'], /\b\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*(\d{2}|\d{4})\b/, text);
            let iso = dmyToISO(fecha);
            if (!iso){ const m = (text||'').match(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2}|\d{4})\b/); if (m) iso = dmyToISO(m[0]); }
            if (iso) { const el = document.getElementById('mf-doc-date'); if (el) el.value = iso; }
            let origen = findNearLabelIATACode(['ORIGEN','PROCEDENCIA'], text);
            let origenMatch = findValidAirport(origen);
            setVal('mf-origin-code', origenMatch ? origenMatch.IATA : '');
            let destino = findNearLabelIATACode(['DESTINO'], text);
            let destinoMatch = findValidAirport(destino);
            setVal('mf-final-dest-code', destinoMatch ? destinoMatch.IATA : '');
            let pax = findNearLabelValue(['PASAJEROS','PAX'], /\d{1,4}/, text);
            setVal('pax-total', pax || '');
            // Tripulación total (número)
            try {
              const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
              if (crew) setVal('mf-crew-total', crew);
            } catch(_){}
            // Piloto al mando
            try {
              const nameRx = /\b[A-ZÁÉÍÓÚÑ](?:\.|\s)\s?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+\b/;
              const pilot = findNearLabelValue(['PILOTO AL MANDO','PILOTO','CAPITAN','CAPITÁN'], nameRx, text);
              if (pilot) setVal('mf-pilot', pilot);
            } catch(_){}
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
        try { window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch(_) {}
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
      let airportByName = new Map();
      let iataSet = new Set();

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
        // If it's a managed time field, handle N/A state and 24h normalization
        if (window._mfTimeFieldIds && window._mfTimeFieldIds.has(id)){
          const isNA = (String(v||'').trim().toUpperCase() === 'N/A');
          _ensureTimeAttrs(id);
          if (isNA){ el.dataset.na = '1'; el.value = ''; el.disabled = false; } // keep enabled so UX can toggle back
          else {
            const norm = (window._mfNormTime? window._mfNormTime(v) : String(v||''));
            if (norm){ el.dataset.na = ''; el.value = norm; el.disabled = false; }
            else { el.value = String(v||''); }
          }
          return;
        }
        el.value = v;
      }
      function _attachNaToggle(id){
        try {
          const input = document.getElementById(id); if (!input) return; if (input._naWired) return; input._naWired = 1;
          _ensureTimeAttrs(id);
          // Create a small NA checkbox; place it immediately after the input
          const wrap = input.parentElement;
          const label = document.createElement('label'); label.className = 'form-check-label ms-2 d-inline-flex align-items-center'; label.style.userSelect='none';
          const cb = document.createElement('input'); cb.type='checkbox'; cb.className='form-check-input me-1'; cb.id = id+'-na'; cb.title='No aplica (N/A)';
          label.appendChild(cb); label.appendChild(document.createTextNode('N/A'));
          if (wrap && !wrap.querySelector('#'+cb.id)) {
            // Insert right after the input, before any help text
            input.insertAdjacentElement('afterend', label);
          }
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
          const rxNO = /\bN(?:[O0]|[º°])\.??\b|\bN[UÚ]M\.??\b|\bNO\.??\b/i;    // No. / Nº / N° / N0. / Núm.
          const rxLIC = /\bL\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\b/i; // LIC. / L I C . / L1C / LICENCIA (tolerante a espacios)
          const clean = (s)=> (s||'').toUpperCase().replace(/\s+/g,' ').trim();
          const sliceAfterLastLabel = (s)=>{
            try {
              let idxLic = s.search(rxLIC);
              let idxNo = s.search(rxNO);
              let idx = Math.max(idxLic, idxNo);
              return idx>=0 ? s.slice(idx + (s.match(idx===idxLic?rxLIC:rxNO)?.[0]?.length||0)) : s;
            } catch(_){ return s; }
          };
          function findCandidatesInString(s){
            const U = (s||'').toUpperCase();
            const tokens = U.replace(/[^A-Z0-9\-\/]/g,' ').split(/\s+/).filter(Boolean);
            const out = new Set();
            // 1) dígitos puros contiguos >=7
            const dHits = U.match(/\b\d{7,}\b/g) || [];
            dHits.forEach(v=> out.add(v));
            // 2) letras+digitos (con posible guión o "/")
            const mixHits = U.match(/\b[A-Z]{1,6}[-\/]?\d{5,}\b/g) || [];
            mixHits.forEach(v=> out.add(v));
            // 3) pares separados por espacio: ABC 1234567
            for (let i=0;i<tokens.length-1;i++){
              const a=tokens[i], b=tokens[i+1];
              if (/^[A-Z]{2,6}$/.test(a) && /^\d{5,}$/.test(b)) out.add(a+b);
            }
            // 4) dígitos fragmentados por espacios: 2016 355 35 -> 201635535
            for (let i=0;i<tokens.length;i++){
              if (/^\d+$/.test(tokens[i])){
                let j=i; let acc='';
                while (j<tokens.length && /^\d+$/.test(tokens[j])){ acc += tokens[j]; j++; }
                if (acc.length>=7) out.add(acc);
                i = j-1;
              }
            }
            // 5) letras seguidas de múltiples grupos de dígitos: ABC 12 34567 -> ABC1234567
            for (let i=0;i<tokens.length;i++){
              if (/^[A-Z]{1,6}$/.test(tokens[i])){
                let j=i+1; let acc='';
                while (j<tokens.length && /^\d+$/.test(tokens[j])){ acc += tokens[j]; j++; }
                if (acc.length>=5){ out.add(tokens[i] + acc); }
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
            const c1 = findCandidatesInString(tail);
            if (c1.length) return c1[0];
            const c2 = findCandidatesInString(buf);
            return c2[0]||'';
          }
          // 1) Misma línea: NO y LIC presentes -> buscar a la derecha del último label
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxNO.test(ln) && rxLIC.test(ln)){
              const hit = scanWindow(i,i,4); if (hit) return hit.toUpperCase();
            }
          }
          // 1.a) Solo 'NO.' presente (sin 'LIC'): tomar a la derecha y en siguientes líneas
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxNO.test(ln)){
              const hitNo = scanWindow(i,i,10);
              if (hitNo) return hitNo.toUpperCase();
            }
          }
          // 1.b) Solo 'LIC.' o 'LICENCIA' presente (sin 'NO'): tomar a la derecha y en siguientes líneas
          for (let i=0;i<lines.length;i++){
            const ln = lines[i]||'';
            if (rxLIC.test(ln)){
              // Preferir lo que está a la derecha del label en la misma línea
              const hitSame = scanWindow(i,i,6);
              if (hitSame) return hitSame.toUpperCase();
            }
          }
          // 2) Etiquetas partidas en +/-2 líneas; escanear ventana ampliada
          for (let i=0;i<lines.length;i++){
            if (rxNO.test(lines[i]||'')){
              for (let d=1; d<=2; d++){
                if (rxLIC.test(lines[i+d]||'')){ const hit = scanWindow(i, i+d, 10); if (hit) return hit.toUpperCase(); }
                if (rxLIC.test(lines[i-d]||'')){ const hit = scanWindow(i, i-d, 10); if (hit) return hit.toUpperCase(); }
              }
            }
            if (rxLIC.test(lines[i]||'')){
              for (let d=1; d<=2; d++){
                if (rxNO.test(lines[i+d]||'')){ const hit = scanWindow(i, i+d, 10); if (hit) return hit.toUpperCase(); }
                if (rxNO.test(lines[i-d]||'')){ const hit = scanWindow(i, i-d, 10); if (hit) return hit.toUpperCase(); }
              }
            }
          }
          // 3) Fallback global: permitir palabras intermedias entre NO y LIC y capturar luego
          try {
            const one = clean(text||'');
            const m = one.match(/N(?:O|0|[º°])\.??\s*(?:\w+\s*){0,6}L\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return cands[0].toUpperCase();
              return (m[1]||'').toUpperCase().trim();
            }
          } catch(_){ }
          // 3.a) Fallback global: solo 'NO.' y capturar después lo que parezca licencia
          try {
            const one = clean(text||'');
            const m = one.match(/N(?:O|0|[º°])\.??\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return cands[0].toUpperCase();
              return (m[1]||'').toUpperCase().trim();
            }
          } catch(_){ }
          // 3.b) Fallback global solo 'LIC'/'LICENCIA': capturar número/letras-dígitos después del label
          try {
            const one = clean(text||'');
            const m = one.match(/L\s*[I1]\s*C(?:\.|\s*[EÉ]\s*N\s*C\s*[I1]\s*A)?\s*[:\-]?\s*([A-Z0-9\-\/ ]{6,})/i);
            if (m && m[1]){
              const cands = findCandidatesInString(m[1]);
              if (cands.length) return cands[0].toUpperCase();
              return (m[1]||'').toUpperCase().trim();
            }
          } catch(_){ }
        } catch(_){ }
        return '';
      };
      // Extra robusto: extractor de nombre completo en MAYÚSCULAS cerca de la etiqueta "PILOTO AL MANDO"
      // Solo actúa como refuerzo si la lógica previa no llenó el campo.
      window._mfExtractPilotUpperNearLabel = function(text){
        try {
          const lines = (text||'').split(/\r?\n/);
          // Incluir sinónimos y abreviaturas comunes
          const labelRx = /(PILOTO\s+AL\s+MANDO|PILOTO\b|CAPIT[ÁA]N\b|CAP\.|CPT\b)/i;
          // Token de nombre en mayúsculas: permite acentos, apóstrofes, guiones y partículas cortas (DE/DEL/DA/VON/VAN/LA/LOS/LAS/etc.)
          const nameToken = "(?:[A-ZÁÉÍÓÚÑ](?:[A-ZÁÉÍÓÚÑ'’\-]{1,})|DE|DEL|DA|DO|DOS|DAS|VON|VAN|LA|EL|LOS|LAS)";
          const nameSeq = new RegExp('^\n?\t?\s*' + nameToken + '(?:\s+' + nameToken + '){1,6}\s*$', '');
          // Búsqueda de candidatos en un string: devuelve el mejor match por tamaño de nombre
          const findBestIn = (s)=>{
            const L = (s||'').toUpperCase().replace(/[:·•\|]/g,' ').replace(/\s+/g,' ').trim();
            if (!L) return '';
            // Escanear secuencias de 2 a 7 tokens; priorizar las más largas
            const toks = L.split(' ');
            let best=''; let bestScore=0;
            for (let a=0;a<toks.length;a++){
              for (let b=a+1;b<=Math.min(toks.length, a+7);b++){
                const seg = toks.slice(a,b).join(' ').trim();
                if (!seg) continue;
                // Rechazar si contiene palabras claramente no-nombre
                if (/(PILOTO|MANDO|CAPITAN|CAPITÁN|CPT|CAP\.|LIC|FOLIO|VUELO|FECHA|ORIGEN|DESTINO)/i.test(seg)) continue;
                // Validar con patrón de secuencia de nombres
                const ok = seg.split(' ').every(tok=> /^(?:[A-ZÁÉÍÓÚÑ]{2,}|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ'’\-]{1,})$/.test(tok) || /^(DE|DEL|DA|DO|DOS|DAS|VON|VAN|LA|EL|LOS|LAS)$/.test(tok));
                if (!ok) continue;
                // Al menos un token de 3+ letras
                if (!seg.split(' ').some(t=> t.replace(/[^A-ZÁÉÍÓÚÑ]/g,'').length>=3)) continue;
                const score = seg.length + seg.split(' ').length*2;
                if (score > bestScore){ best=seg; bestScore=score; }
              }
            }
            return best;
          };
          for (let i=0;i<lines.length;i++){
            const line = lines[i]||'';
            if (!labelRx.test(line)) continue;
            // 1) Mismo renglón: a la derecha de la etiqueta
            try {
              const m = line.match(labelRx);
              const rest = m && typeof m.index==='number' ? line.slice(m.index + (m[0]?.length||0)) : '';
              const hitSame = findBestIn(rest);
              if (hitSame) return hitSame.trim();
            } catch(_){ }
            // 2) Ventana de contexto: 2 líneas arriba hasta 5 abajo
            let buf = [];
            for (let k=-2; k<=5; k++){
              const s = lines[i+k]||'';
              // Saltar líneas que repiten la etiqueta
              if (labelRx.test(s)) continue;
              buf.push(s);
            }
            const hitWin = findBestIn(buf.join(' '));
            if (hitWin) return hitWin.trim();
          }
        } catch(_){ }
        return '';
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
          for (let i=0;i<lines.length;i++){
            const u = lines[i].toUpperCase();
            if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
              const search = (s)=>{ const arr = (s||'').match(rxIATA)||[]; return arr.find(c=> iataSet.has(c)); };
              // Checar línea anterior, actual y siguientes
              const hit = search(lines[i-1]) || search(lines[i]) || search(lines[i+1]) || search(lines[i+2]) || '';
              if (hit) return hit;
            }
          }
          // Pista alternativa: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior como candidata
          for (let i=0;i<lines.length;i++){
            if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(lines[i])){
              const m = (lines[i-1]||'').match(rxIATA)||[];
              const hit = m.find(c=> iataSet.has(c));
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
          if (location && location.protocol === 'file:') return; // skip fetch under file:// to avoid errors
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
        try {
          const ht = document.querySelector('.mf-header-title');
          if (ht) ht.textContent = isArrival ? 'Manifiesto de Llegada' : 'Manifiesto de Salida';
          const labMain = document.getElementById('mf-airport-main-label');
          if (labMain) labMain.textContent = isArrival ? 'Aeropuerto de Llegada' : 'Aeropuerto de Salida';
        } catch(_){ }

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
        const sel = document.getElementById('mf-flight-type');
        const info = document.getElementById('mf-flight-type-info');
        if (!sel) return;
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
            const label = `${code} — ${desc || op || cat || ''}`.replace(/\s+—\s*$/,'');
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
          .then(list=>{ if (!list || !list.length) throw new Error('Empty CSV'); fillOptions(list); })
          .catch(()=>{
            try {
              // Fallback para file:// o error de red
              const list = rowsToObjects(parseCSV(FALLBACK_FST_CSV));
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
                if (originCand) {
                  setVal('mf-arr-origin-code', originCand);
                  try { const nm = airportByIATA.get(originCand)||''; if (nm) setVal('mf-arr-origin-name', nm); } catch(_){}
                }
                if (lastStopCand) {
                  setVal('mf-arr-last-stop-code', lastStopCand);
                  try { const nm = airportByIATA.get(lastStopCand)||''; if (nm) setVal('mf-arr-last-stop', nm); } catch(_){}
                }
                // Aeropuerto principal (Llegada): leer código IATA cerca de la etiqueta y colocar código IATA (3 letras)
                try {
                  const mainArrCand = findNearLabelIATACode([
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
            if (canon){
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
              setTailWarning('No se encontró una matrícula válida en el documento. Verifique o seleccione del catálogo.');
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
        // Aeropuerto principal (IATA): normalizar y validar
        (function(){
          const el = document.getElementById('mf-airport-main');
          if (!el || el._wired) return; el._wired = 1;
          const onIATA = ()=>{ el.value = (el.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3); };
          ['input','change','blur'].forEach(ev=> el.addEventListener(ev, onIATA));
        })();
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

        return {
          direction,
          title: g('mf-title'), docDate: g('mf-doc-date'), folio: g('mf-folio'),
          carrier3L: g('mf-carrier-3l'), operatorName: g('mf-operator-name'), airline: g('mf-airline'), flight: g('mf-flight'),
          airportMain: g('mf-airport-main'), flightType: g('mf-flight-type'),
          tail: g('mf-tail'), aircraft: g('mf-aircraft'), originName: g('mf-origin-name'), originCode: g('mf-origin-code'),
          crewTotal: g('mf-crew-total'),
          baggageKg: g('mf-baggage-kg'), baggagePieces: g('mf-baggage-pcs'), cargoKg: g('mf-cargo'), cargoPieces: g('mf-cargo-pieces'), cargoVol: g('mf-cargo-volume'),
          mailKg: g('mf-mail'), mailPieces: g('mf-mail-pieces'),
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
          <td>${r.paxTotal||''}</td>
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

      // Exportar CSV (todos los registros guardados) incluyendo demoras aplanadas
      if (exportCsvBtn && !exportCsvBtn._wired){
        exportCsvBtn._wired = 1;
        exportCsvBtn.addEventListener('click', ()=>{
          try {
            let rows = loadRecords();
            // Si no hay registros guardados, exportar el formulario actual como un registro
            if (!rows || rows.length===0){ rows = [ readForm() ]; }
            // Asegurar que cada registro tenga demoras si la estructura existe en el formulario actual
            const getDemorasFromDOM = ()=>{
              try {
                // Preferir 3 filas fijas si existen
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
            // Si el último registro no tiene demoras pero el DOM sí, guardarlas en una copia del último
            if (rows.length>0 && (!rows[0].demoras || !Array.isArray(rows[0].demoras))){
              const ds = getDemorasFromDOM();
              if (ds.length){ rows[0] = { ...rows[0], demoras: ds }; }
            }
            const baseKeys = [
              'direction','title','docDate','folio','carrier3L','operatorName','airline','flight',
              'airportMain','flightType','tail','aircraft','originName','originCode',
              'crewTotal','baggageKg','baggagePieces','cargoKg','cargoPieces','cargoVol','mailKg','mailPieces',
              'dangerousGoods','liveAnimals','humanRemains','pilot','pilotLicense','agent','signature','notes',
              'nextStop','nextStopCode','finalDest','finalDestCode','slotAssigned','slotCoordinated','terminoPernocta',
              'inicioEmbarque','salidaPosicion',
              'arrOriginName','arrOriginCode','arrSlotAssigned','arrSlotCoordinated','arrLastStop','arrLastStopCode','arrArriboPosicion','arrInicioDesembarque','arrInicioPernocta',
              'paxTUA','paxDiplomaticos','paxComision','paxInfantes','paxTransitos','paxConexiones','paxExentos','paxTotal',
              'obsTransito','paxDNI','signOperator','signCoordinator','signAdmin','signAdminDate'
            ];
            const maxDemoras = rows.reduce((m,r)=> Math.max(m, Array.isArray(r.demoras)? r.demoras.length:0), 0);
            const demoraCols = [];
            for (let i=1;i<=Math.max(3,maxDemoras);i++){
              demoraCols.push(`Demora${i}_Codigo`,`Demora${i}_Minutos`,`Demora${i}_Descripcion`);
            }
            const headers = [...baseKeys, ...demoraCols];
            const esc = (v)=>{
              const s = (v==null)? '' : (typeof v==='boolean'? (v?'1':'0'): String(v));
              if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
              return s;
            };
            const lines = [headers.join(',')];
            rows.forEach(r=>{
              const baseVals = baseKeys.map(k=> esc(r[k]));
              const ds = Array.isArray(r.demoras)? r.demoras: [];
              const parts = [];
              for (let i=0;i<demoraCols.length/3;i++){
                const d = ds[i]||{};
                parts.push(esc((d.codigo||'').toUpperCase()), esc(d.minutos||''), esc(d.descripcion||''));
              }
              lines.push([...baseVals, ...parts].join(','));
            });
            const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.csv'; a.click();
          } catch(err){ console.error('CSV export error', err); }
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

  function init(){ try { window.setupManifestsUI?.(); } catch(_){} }
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

      // Local helpers (decoupled from V1) to avoid ReferenceErrors
      function setVal(id, v){ const el = document.getElementById(id); if (el) el.value = v; }
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
  let airportByName = new Map(); // name lower -> IATA
  let airportNameIndex = []; // [{ name, iata, norm, tokens }]
      let iataSet = new Set();

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
            // Lightweight fallback: look for any ABC pattern near the label (no catalog dependency)
            const rxIATA = /\b[A-Z]{3}\b/g;
            try{
              const lines = (text||'').split(/\r?\n/);
              for (let i=0;i<lines.length;i++){
                const u = lines[i].toUpperCase();
                if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                  const search = (s)=>{ const arr = (s||'').match(rxIATA)||[]; return arr.length ? arr[0] : ''; };
                  // Checar línea anterior, actual y siguientes
                  const hit = search(lines[i-1]) || search(lines[i]) || search(lines[i+1]) || search(lines[i+2]) || '';
                  if (hit) return hit;
                }
              }
              // Pista alternativa: si aparece "CÓDIGO 3 LETRAS", tomar la línea anterior como candidata
              for (let i=0;i<lines.length;i++){
                if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(lines[i])){
                  const m = (lines[i-1]||'').match(rxIATA)||[];
                  if (m.length) return m[0];
                }
              }
            }catch(_){ }
            return '';
      }

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
              for (let i=0;i<lines.length;i++){
                if (LABELS.some(rx=> rx.test(lines[i]||''))){
                  // Código: puede venir en la misma línea después del label
                  try { const mSame = (lines[i]||'').toUpperCase().match(/\b([A-Z]{3})\b/); if (mSame) out.code = mSame[1]; } catch(_){ }
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
                      const prev = lines[j-1]||''; const m = prev.toUpperCase().match(rxIATA);
                      if (m){ out.code = m[1]; break; }
                    }
                  }
                  // Si no hay aún código, buscar 3 letras cercanas
                  if (!out.code){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    for (const s of win){ const m = (s||'').toUpperCase().match(rxIATA); if (m){ out.code = m[1]; break; } }
                  }
                  break;
                }
              }
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
              for (let i=0;i<lines.length;i++){
                if (LABELS.some(rx=> rx.test(lines[i]||''))){
                  // Código en la MISMA línea del label (p.ej. "ESCALA ANTERIOR ABC")
                  try { const mSame = (lines[i]||'').toUpperCase().match(/\b([A-Z]{3})\b/); if (mSame) out.code = mSame[1]; } catch(_){ }
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
                      const prev = lines[j-1]||''; const m = prev.toUpperCase().match(rxIATA);
                      if (m){ out.code = m[1]; break; }
                    }
                  }
                  // Si no hay aún código, buscar 3 letras cercanas
                  if (!out.code){
                    const win = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];
                    for (const s of win){ const m = (s||'').toUpperCase().match(rxIATA); if (m){ out.code = m[1]; break; } }
                  }
                  break;
                }
              }
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

      async function ensurePdfJsLite(){
        if (window.pdfjsLib) return;
        try {
          await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.crossOrigin='anonymous'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
          window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } catch(_){
          await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='vendor/pdfjs/pdf.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
          try { window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js'; } catch(_){ }
        }
      }

      async function ensureTesseractLite(){
        if (window.Tesseract) return;
        await new Promise((res, rej)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js'; s.crossOrigin='anonymous'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
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

      async function ocrPdfOrImageV2(file, maxPages){
        try { await ensureTesseractLite(); } catch(_){ if (status) status.textContent = 'No se pudo cargar OCR (Tesseract).'; return ''; }
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
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
            const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/png');
            let prom;
            if (window._mfOcrScheduler){
              prom = window._mfOcrScheduler.addJob('recognize', dataUrl);
            } else {
              prom = Tesseract.recognize(dataUrl, 'spa+eng', { ...(_tessOpts||{}), logger: ()=>{} });
            }
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
          if (isPdf){
            try {
              await ensurePdfJsLite();
              const ab = await file.arrayBuffer();
              const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ab) }).promise;
              const page = await pdf.getPage(1);
              const containerWidth = (canvas && canvas.parentElement) ? canvas.parentElement.clientWidth : 1000;
              const viewport = page.getViewport({ scale: 1 });
              const scale = Math.min(2.0, Math.max(0.9, containerWidth / viewport.width));
              const vp = page.getViewport({ scale });
              if (canvas){
                canvas.width = vp.width; canvas.height = vp.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                canvas.classList.remove('d-none');
              }
              // Quitar reconocimiento de texto en previsualización (V2): ocultar capa de texto
              try { const textLayer = document.getElementById('manifest-text-layer'); if (textLayer){ textLayer.innerHTML=''; textLayer.classList.add('d-none'); } } catch(_){ }
              window.manifestApplyZoom();
              if (img) img.classList.add('d-none');
              if (placeholder) placeholder.classList.add('d-none');
            } catch(e){ if (status) status.textContent = ''; }
          } else if (/^image\//i.test(type) || /\.(png|jpg|jpeg|webp)$/i.test(name||'')){
            const url = URL.createObjectURL(file);
            if (img){ img.src = url; img.classList.remove('d-none'); }
            if (canvas) canvas.classList.add('d-none');
            const textLayer = document.getElementById('manifest-text-layer');
              // No realizar OCR para imágenes de previsualización; ocultar text layer
              if (textLayer){ textLayer.textContent=''; textLayer.classList.add('d-none'); }
            if (placeholder) placeholder.classList.add('d-none');
            try { window.manifestApplyZoom(); } catch(_){ }
            // OCR deshabilitado para imágenes de previsualización
          }
        } catch(_){ }
      }

      function fillFieldsFromTextV2(text){
        try {
          const ocrDebug = document.getElementById('manifest-ocr-debug'); if (ocrDebug) ocrDebug.value = text||'';
          const title = findNearLabelValue(['MANIFIESTO'], /MANIFIESTO.*/i, text); setVal('mf-title', title);

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

          // 2) Vuelo y transportista (usar catálogos)
          let vuelo = findNearLabelValue(['VUELO','FLIGHT','FLT'], /[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?/i, text) || '';
          setVal('mf-flight', vuelo);
          if (vuelo){
            const cleaned = vuelo.replace(/\s|-/g,'').toUpperCase();
            const pref3 = cleaned.slice(0,3);
            const pref2 = cleaned.slice(0,2);
            let carrierICAO = '';
            if (pref3 && icaoSet.has(pref3)) carrierICAO = pref3;
            else if (pref2 && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2) || '';
            if (carrierICAO){
              setVal('mf-carrier-3l', carrierICAO);
              const rec = airlinesCatalog.find(a=>a.ICAO===carrierICAO);
              if (rec){ if (!document.getElementById('mf-operator-name').value) setVal('mf-operator-name', rec.Name); if (!document.getElementById('mf-airline').value) setVal('mf-airline', rec.Name); }
            }
          }

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

          // 3.1) Aeropuerto de Llegada (código IATA) — justo después de la fecha
          try {
            const lines = (text||'').toString().split(/\r?\n/);
            let code = '';
            for (let i=0;i<lines.length;i++){
              if (/AEROPUERTO\s+DE\s+LLEGADA/i.test(lines[i])){
                // El código suele estar 1 línea ARRIBA, o en la misma/siguientes
                const candidates = [lines[i-1], lines[i], lines[i+1], lines[i+2]];
                for (const s of candidates){ const m = (s||'').toUpperCase().match(/\b[A-Z]{3}\b/); if (m && (!code || (window.iataSet && window.iataSet.has(m[0])))){ code = m[0]; break; } }
              }
            }
            // Alternativa: si hay "CÓDIGO 3 LETRAS", tomar la línea anterior
            if (!code){
              for (let i=0;i<lines.length;i++){
                if (/C[ÓO]DIGO\s*3\s*LETRAS/i.test(lines[i])){
                  const m = (lines[i-1]||'').toUpperCase().match(/\b[A-Z]{3}\b/);
                  if (m && (!code || (window.iataSet && window.iataSet.has(m[0])))){ code = m[0]; break; }
                }
              }
            }
            if (!code){ code = findNearLabelIATACode(['AEROPUERTO DE LLEGADA'], text) || ''; }
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

          // 5) Pax total
          let pax = findNearLabelValue(['PASAJEROS','PAX'], /\b\d{1,4}\b/, text); setVal('pax-total', pax || '');
          // 5.0) Tripulación total
          try {
            const crew = findNearLabelValue(['TRIPULACION','TRIPULACIÓN','CREW'], /\b\d{1,3}\b/, text);
            if (crew) setVal('mf-crew-total', crew);
          } catch(_){ }

          // 5.1) Piloto al mando y No. de licencia
          try {
            const nameRx = /\b[A-ZÁÉÍÓÚÑ](?:\.|\s)\s?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ]+\b/;
            const pilot = findNearLabelValue(['PILOTO AL MANDO','PILOTO','CAPITAN','CAPITÁN'], nameRx, text);
            if (pilot) setVal('mf-pilot', pilot);
          } catch(_){ }
          // Refuerzo V2: si aún no hay valor, intentar nombre completo en MAYÚSCULAS cercano a la etiqueta
          try { const cur = document.getElementById('mf-pilot')?.value || ''; if (!cur){ const p2 = window._mfExtractPilotUpperNearLabel?.(text) || ''; if (p2) setVal('mf-pilot', p2); } } catch(_){ }
          // Refuerzo: si no se obtuvo, intentar nombre completo en MAYÚSCULAS junto a la etiqueta
          try { const cur = document.getElementById('mf-pilot')?.value || ''; if (!cur){ const p2 = window._mfExtractPilotUpperNearLabel?.(text) || ''; if (p2) setVal('mf-pilot', p2); } } catch(_){ }
          // Refuerzo: fallback a nombre completo en MAYÚSCULAS si falta
          try { const cur = document.getElementById('mf-pilot')?.value || ''; if (!cur){ const p2 = window._mfExtractPilotUpperNearLabel?.(text) || ''; if (p2) setVal('mf-pilot', p2); } } catch(_){ }
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
        } catch(e) {
          if (status) status.textContent = 'Error al llenar campos: ' + (e?.message||e);
        }
      }

      async function handleScanPdf(){
        try {
          const file = upload && upload.files && upload.files[0];
          if (!file){ if (status) status.textContent = 'Seleccione un PDF antes de escanear.'; return; }
          const name = file.name||''; const type = file.type||'';
          const isPdf = /\.pdf$/i.test(name) || /application\/pdf/i.test(type);
          if (!isPdf){ if (status) status.textContent = 'El archivo no es PDF. Use "Escaneo alternativo (OCR)".'; return; }
          setProgress(5, 'Preparando...'); if (status) status.textContent = '';
          setProgress(12, 'OCR en PDF...');
          // Ensure catalogs are ready to improve matching accuracy
          try { await _v2CatalogsReady; } catch(_){ }
          // Priorizar OCR porque reportaste mejor precisión; si falla, retroceder a texto del PDF
          let text = await ocrPdfOrImageV2(file, 2);
          if (!text || text.replace(/\s+/g,'').length < 30){
            setProgress(48, 'OCR limitado; extrayendo texto del PDF...');
            text = await extractPdfTextV2(file);
          }
          setProgress(70, 'Procesando...');
          fillFieldsFromTextV2(text||'');
          // Post-procesado de horas para salidas: N/A donde aplica
          try {
            const isArr = !!(document.getElementById('mf-dir-arr')?.checked);
            if (!isArr){
              const naIds = ['mf-slot-coordinated','mf-termino-pernocta']; naIds.forEach(id=>{ const el=document.getElementById(id); if(el){ el.value=''; el.setCustomValidity(''); } });
            }
          } catch(_){ }
          setProgress(95, 'Casi listo...');
          setProgress(100, 'Completado');
          // Force fast finish to avoid lingering at 99%
          try { _v2Tar = 100; _v2EffTar = 100; } catch(_){ }
          setTimeout(hideProgress, 900);
          if (status) status.textContent = text ? 'Escaneo completado (V2).' : 'No se recuperó texto útil.';
        } catch(e){ if (status) status.textContent = 'Error en escaneo V2.'; hideProgress(); }
      }

      async function handleScanOcr(){
        try {
          const file = upload && upload.files && upload.files[0];
          if (!file){ if (status) status.textContent = 'Seleccione un archivo (PDF o imagen) antes de OCR.'; return; }
          setProgress(15, 'Preparando OCR...'); if (status) status.textContent = '';
          const pagesSel = document.getElementById('manifest-ocr-pages');
          const maxPages = parseInt((pagesSel && pagesSel.value)||'2', 10) || 2;
          // Ensure catalogs are ready to improve matching accuracy
          try { await _v2CatalogsReady; } catch(_){ }
          const text = await ocrPdfOrImageV2(file, maxPages);
          setProgress(85, 'Procesando...');
          fillFieldsFromTextV2(text||'');
          setProgress(100, 'Completado');
          try { _v2Tar = 100; _v2EffTar = 100; } catch(_){ }
          setTimeout(hideProgress, 900);
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
      // Feedback en cambio de archivo
      document.addEventListener('change', function(e){
        const t = e.target;
        if (t && t.id === 'manifest-upload'){
          const f = t.files && t.files[0]; if (status) status.textContent = f ? `Archivo listo: ${f.name}` : 'No se seleccionó archivo.';
          // Preguntar y bloquear dirección al seleccionar archivo (siempre preguntar por cada archivo)
          try {
            if (f){
              window._mfDirectionLocked = false;
              const resp = window.confirm('¿El documento a escanear es de LLEGADA?\nAceptar = Llegada, Cancelar = Salida');
              const dirArr = document.getElementById('mf-dir-arr');
              const dirDep = document.getElementById('mf-dir-dep');
              if (dirArr && dirDep){
                if (resp){ dirArr.checked = true; dirDep.checked = false; dirDep.disabled = true; dirArr.disabled = false; dirArr.dispatchEvent(new Event('change', { bubbles:true })); }
                else { dirArr.checked = false; dirDep.checked = true; dirArr.disabled = true; dirDep.disabled = false; dirDep.dispatchEvent(new Event('change', { bubbles:true })); }
                window._mfDirectionLocked = true;
                try { (window.applyManifestDirection||applyManifestDirection)?.(); } catch(_){ }
              }
            }
          } catch(_){ }
          if (f) renderPreviewV2(f);
        }
      });
    } catch(_){}
  };

  // Activar V2 al cargar DOM
  document.addEventListener('DOMContentLoaded', function(){ try { window.setupManifestsUI_v2?.(); } catch(_){} });
  // Removed custom time picker for mf-slot-assigned; using native input type=time for consistency
})();
