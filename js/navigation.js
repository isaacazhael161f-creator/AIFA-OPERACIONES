// Minimal navigation delegator so we can later move logic out of script.js safely
;(function(){
  document.addEventListener('DOMContentLoaded', function(){
    // No-op: keep existing handlers from script.js. This file is a placeholder split point.
  });
})();

// Accordion behavior for top-level sidebar groups:
// When one group opens, all other top-level groups collapse automatically.
;(function(){
  var TOP_LEVEL_IDS = [
    'sg-archivo', 'sg-auditoria', 'sg-gpyc',
    'sg-sso', 'sg-ssa', 'sg-ssc', 'sg-si', 'sg-sge'
  ];

  document.addEventListener('DOMContentLoaded', function(){
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    nav.addEventListener('show.bs.collapse', function(e){
      if (TOP_LEVEL_IDS.indexOf(e.target.id) === -1) return;
      TOP_LEVEL_IDS.forEach(function(id){
        if (id === e.target.id) return;
        var el = document.getElementById(id);
        if (el && el.classList.contains('show')) {
          var instance = bootstrap.Collapse.getInstance(el);
          if (instance) instance.hide();
        }
      });
    });
  });
})();
