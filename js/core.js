// Core utilities, shared state, and lightweight bootstrapping (no UI changes)
window.AIFA = window.AIFA || {};

// Shared static data and small helpers that other modules rely on
;(function(){
  const A = window.AIFA;
  // Expose a read-only view of staticData if script.js defined it; else define minimal
  if (!A.staticData) {
    A.staticData = (typeof window.staticData !== 'undefined') ? window.staticData : { mensual2025: {}, operacionesTotales: {}, demoras: {} };
  }
  // Global charts registry per section
  A.charts = A.charts || {};

  // Small helpers reused by modules
  A.hexToRgba = function(hex, alpha = 1){ try{ const h=(hex||'').toString().trim().replace('#',''); const r=parseInt(h.slice(0,2),16)||0, g=parseInt(h.slice(2,4),16)||0, b=parseInt(h.slice(4,6),16)||0; return `rgba(${r},${g},${b},${alpha})`; }catch(_){ return `rgba(0,0,0,${alpha})`; } };
  A.formatCompact = function(v, kind='int'){ const n=Number(v||0); if(kind==='ton'){ if (Math.abs(n)>=1000) return (n/1000).toFixed(1)+'k'; return n.toFixed(n<100?2:1); } if(kind==='pax'){ if (Math.abs(n)>=1_000_000) return (n/1_000_000).toFixed(1)+'M'; if (Math.abs(n)>=1000) return (n/1000).toFixed(1)+'k'; return String(Math.round(n)); } if (Math.abs(n)>=1000) return (n/1000).toFixed(1)+'k'; return String(Math.round(n)); };
  A.formatFull = function(v, kind='int'){ const n=Number(v??0); if (kind==='ton') return new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(n); return new Intl.NumberFormat('es-MX').format(Math.round(n)); };

  // Debounce/throttle utils for noisy inputs
  A.debounce = function(fn, wait = 150){
    let t = 0; let lastArgs; let lastThis;
    return function(...args){
      lastArgs = args; lastThis = this;
      clearTimeout(t);
      t = setTimeout(()=>{ fn.apply(lastThis, lastArgs); }, wait);
    };
  };
  A.throttle = function(fn, interval = 120){
    let last = 0; let pending = null; let lastThis;
    const invoke = (ctx, args)=>{ last = Date.now(); pending = null; fn.apply(ctx, args); };
    return function(...args){
      const now = Date.now(); lastThis = this;
      if (now - last >= interval) { invoke(lastThis, args); }
      else if (!pending) { pending = setTimeout(()=> invoke(lastThis, args), interval - (now - last)); }
    };
  };

  // Simple performance logger: wraps a function and prints duration
  A.withPerf = function(name, fn){
    return function(...args){
      const t0 = performance.now();
      try { return fn.apply(this, args); }
      finally {
        const dt = performance.now() - t0;
        // Compact prefix to group logs
        console.log(`[perf] ${name}: ${dt.toFixed(1)}ms`);
      }
    };
  };

  // Open a PDF in the global lightbox
  A.openPdfLightbox = function(url){
    try {
      const lb = document.getElementById('pdf-lightbox');
      const content = document.getElementById('lightbox-content');
      if (!lb || !content || !url) return;
      content.innerHTML = `<iframe src="${url}" width="100%" height="100%" class="border-0"></iframe>`;
      lb.classList.remove('hidden');
    } catch (e) { console.warn('openPdfLightbox error:', e); }
  };

  // Minimal pub/sub for cross-module events, without external deps
  const listeners = {};
  A.on = function(evt, fn){ (listeners[evt] = listeners[evt] || []).push(fn); };
  A.emit = function(evt, payload){ (listeners[evt]||[]).forEach(fn=>{ try{ fn(payload); }catch(e){ console.warn('AIFA.emit handler error', e); } }); };
})();
