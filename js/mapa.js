;(function(){
  const sec = document.getElementById('mapa-section');
  if (!sec) return;

  // Ensure Leaflet assets exist; if not, add from CDN at runtime once
  function ensureLeaflet(){
    return new Promise((resolve) => {
      if (window.L && document.getElementById('leaflet-css')) { resolve(); return; }
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = ()=> resolve();
      document.body.appendChild(script);
    });
  }

  let map, markersLayer;
  let resizeObserverStarted = false;
  const debouncedInvalidate = (window.AIFA?.debounce || ((fn)=>fn))(()=>{ try { map?.invalidateSize(); } catch(_){} }, 200);

  // Configure your points here. id maps to a local PDF path to open
  const POINTS = [
    { id: 1, name: 'Punto 1', lat: 19.7407, lng: -99.0134, pdf: 'pdfs/Mapa_rutas_nacionales.pdf' },
    // Add more points: { id: 2, name: 'Punto 2', lat: ..., lng: ..., pdf: 'pdfs/otro.pdf' }
  ];

  function initMap(){
    if (map) return;
    const container = document.getElementById('mapa-container');
    if (!container) return;
    map = L.map(container, { zoomControl: true, attributionControl: false }).setView([19.7407, -99.0134], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    // Numbered markers
    const icon = (num)=> L.divIcon({ className: 'aifa-marker', html: `<div class="pin">${num}</div>`, iconSize: [24,24], iconAnchor: [12,24] });
    POINTS.forEach(p => {
      const m = L.marker([p.lat, p.lng], { icon: icon(p.id) }).addTo(markersLayer);
      m.bindTooltip(`${p.id}. ${p.name}`, { permanent: false });
      m.on('click', ()=> { if (p.pdf) window.AIFA?.openPdfLightbox(p.pdf); });
    });

    // Invalidate map size on section becoming visible
    if (!resizeObserverStarted) {
      resizeObserverStarted = true;
      const obs = new ResizeObserver(()=> debouncedInvalidate());
      obs.observe(container);
      document.addEventListener('click', (e)=>{
        const link = e.target.closest('[data-section="mapa"]');
        if (link) setTimeout(()=> debouncedInvalidate(), 120);
      });
    }
  }

  async function boot(){
    try { await ensureLeaflet(); initMap(); }
    catch(e){ console.warn('Mapa interactivo no disponible:', e); }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();

/* Minimal styles for markers; include inline until CSS is updated */
(function(){
  const css = `.aifa-marker .pin{background:#0d6efd;color:#fff;border-radius:12px;padding:2px 6px;font:600 12px/20px system-ui;box-shadow:0 2px 6px rgba(0,0,0,.25)}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
})();
