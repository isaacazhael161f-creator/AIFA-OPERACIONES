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
})();
