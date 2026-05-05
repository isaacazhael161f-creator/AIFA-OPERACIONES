// Inicio section: summary table, filters and itinerary tables/charts orchestration
;(function(){
  if (!document.getElementById('inicio-section')) return; // load only if section exists

  // Delegate to existing global functions defined in script.js to avoid behavior changes
  document.addEventListener('DOMContentLoaded', function(){
    try {
      // If the main script already loaded itinerary and filters, do nothing here.
      // Otherwise, attempt minimal init.
      if (typeof window.applyFilters === 'function' && typeof window.displaySummaryTable === 'function') {
        // No-op: script.js owns the behavior
      } else {
        // Minimal fallback: show a friendly note (keeps UI stable)
        const cont = document.getElementById('summary-table-container');
        if (cont && !cont.children.length) {
          cont.innerHTML = '<div class="alert alert-info bg-transparent text-body">Cargando resumen…</div>';
        }
      }
    } catch(_) {}
  });

  // Persist "Resumen por Aerolínea" collapse state across navigation/reloads
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const id = 'summary-collapse';
      const el = document.getElementById(id);
      if (!el) return;
      const KEY = 'aifa.inicio.summary.open';
      // Restore state
      try {
        const saved = localStorage.getItem(KEY);
        if (saved === '0') el.classList.remove('show');
        else if (saved === '1') el.classList.add('show');
      } catch(_) {}
      // Listen to Bootstrap collapse events if available
      const onShown = ()=>{ try { localStorage.setItem(KEY, '1'); } catch(_) {} };
      const onHidden = ()=>{ try { localStorage.setItem(KEY, '0'); } catch(_) {} };
      if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
        el.addEventListener('shown.bs.collapse', onShown);
        el.addEventListener('hidden.bs.collapse', onHidden);
      } else {
        // Fallback: observe class changes
        const obs = new MutationObserver(()=>{
          try { localStorage.setItem(KEY, el.classList.contains('show') ? '1' : '0'); } catch(_) {}
        });
        obs.observe(el, { attributes:true, attributeFilter:['class'] });
      }
    } catch(_) {}
  });
})();
