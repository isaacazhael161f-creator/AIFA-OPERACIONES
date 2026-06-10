;(function(){
  const sec = document.getElementById('operaciones-totales-section');
  if (!sec) return;
  function rerender(){ try { if (typeof window.renderOperacionesTotales==='function') window.renderOperacionesTotales(); if (typeof window.updateOpsSummary==='function') window.updateOpsSummary(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', rerender);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="operaciones-totales"]')) setTimeout(rerender, 50); });
  const themeBtn = document.getElementById('theme-toggler'); if (themeBtn) themeBtn.addEventListener('click', ()=> setTimeout(rerender, 250));
})();
