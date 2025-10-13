;(function(){
  // This module now supports multiple single-page viewers on the same page
  // Any element with class .pdf-singlepage-viewer[data-src] will be initialized

  const viewers = new Map(); // container -> state
  function getDPR(){
    const isPhone = (window.innerWidth || 0) <= 576;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    // Clamp DPR on phones to reduce canvas cost (keeps text readable and scroll suave)
    return isPhone ? Math.min(1.5, dpr) : dpr;
  }

  // Lazy-load PDF.js from CDN if not present
  function ensurePdfJs(){
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        try { window['pdfjsLib'].GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch(_) {}
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Resolve a destination (named string or explicit array) to a 1-based page number
  async function resolveDestToPageNum(pdfDoc, dest){
    try {
      let explicit = dest;
      if (!explicit) return null;
      if (typeof explicit === 'string') {
  explicit = await pdfDoc.getDestination(explicit);
      }
      if (!explicit) return null;
      const first = explicit[0];
      // If it's a reference, ask the doc for the page index
      if (first && typeof first === 'object' && typeof first.num === 'number') {
  const idx = await pdfDoc.getPageIndex(first);
        return (typeof idx === 'number') ? idx + 1 : null;
      }
      // Some PDFs could provide a direct page index/number
      if (typeof first === 'number') {
        // Heuristic: 0-based vs 1-based
        if (first >= 1 && first <= pdfDoc.numPages) return first;
        if (first >= 0 && first < pdfDoc.numPages) return first + 1;
      }
      return null;
    } catch (e) {
      console.warn('resolveDestToPageNum error:', e);
      return null;
    }
  }

  async function renderPage(container){
    const state = viewers.get(container);
    if (!state) return;
    const { pdfDoc, canvas, linksLayer } = state;
    if (!pdfDoc || !canvas) return;
    const num = state.currentPageNum || 1;
    const page = await pdfDoc.getPage(num);
    const view = page.getViewport({ scale: 1 });
    // fit-to-width scale, adjusted by devicePixelRatio for sharpness
  const cssW = container.clientWidth || view.width;
    const scale = cssW / view.width;
    const dpr = getDPR();
    const viewport = page.getViewport({ scale: scale * dpr });
    const ctx = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    // CSS size stays at 100% width; height auto to keep aspect; account for DPR
    canvas.style.width = '100%';
  const cssH = Math.round((view.height * scale));
  canvas.style.height = cssH + 'px';

    // clear links layer
    linksLayer.innerHTML = '';
    // ensure links layer sits above the canvas
    linksLayer.style.zIndex = '2';
    // and matches the CSS size
  linksLayer.style.width = '100%';
  linksLayer.style.height = cssH + 'px';

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Enable internal links only (keep the magic):
    // Parse annotations, create clickable overlays for Link annotations that target a page.
    const anns = await page.getAnnotations({ intent: 'display' });
    linksLayer.style.pointerEvents = 'auto';
    anns.forEach(a => {
      if (a.subtype === 'Link' && (a.dest || a.url || a.unsafeUrl)){
        const rect = pdfjsLib.Util.normalizeRect(a.rect);
        const [x1, y1, x2, y2] = rect;
        // Transform PDF coords to viewport coords
        const transform = viewport.transform;
        const pt1 = pdfjsLib.Util.applyTransform([x1, y1], transform);
        const pt2 = pdfjsLib.Util.applyTransform([x2, y2], transform);
        const left = Math.min(pt1[0], pt2[0]);
        const top = Math.min(pt1[1], pt2[1]);
        const width = Math.abs(pt1[0] - pt2[0]);
        const height = Math.abs(pt1[1] - pt2[1]);
        // Use percentages so the overlay scales perfectly with responsive canvas
        const leftPct = (left / viewport.width) * 100;
        const topPct = (top / viewport.height) * 100;
        const widthPct = (width / viewport.width) * 100;
        const heightPct = (height / viewport.height) * 100;
        const btn = document.createElement('a');
        btn.href = '#';
        btn.setAttribute('aria-label','Ir a la diapositiva vinculada');
        btn.style.position = 'absolute';
        btn.style.left = leftPct + '%';
        btn.style.top = topPct + '%';
        btn.style.width = widthPct + '%';
        btn.style.height = heightPct + '%';
        btn.style.display = 'block';
        btn.style.pointerEvents = 'auto';
        btn.style.background = 'rgba(0,0,0,0)'; // invisible
        btn.addEventListener('click', async (e)=>{
          e.preventDefault();
          try {
            // 1) Internal named/explicit destination
            if (a.dest) {
              const pageNum = await resolveDestToPageNum(pdfDoc, a.dest);
              if (pageNum) { state.currentPageNum = pageNum; await renderPage(container); return; }
            }
            // 2) URL with internal page anchor (e.g., #page=5)
            const url = a.url || a.unsafeUrl || '';
            if (url && /[#?]page=([0-9]+)/i.test(url)){
              const m = url.match(/[#?]page=([0-9]+)/i);
              const pageNum = parseInt(m[1], 10);
              if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pdfDoc.numPages){ state.currentPageNum = pageNum; await renderPage(container); return; }
            }
          } catch(_) {}
        });
        linksLayer.appendChild(btn);
      }
    });
  }

  async function initContainer(container){
    try {
      await ensurePdfJs();
      const src = container.getAttribute('data-src');
      if (!src) return;
      const canvas = container.querySelector('canvas');
      const linksLayer = container.querySelector('.links-layer');
      const pdfDoc = await pdfjsLib.getDocument(src).promise;
      viewers.set(container, { pdfDoc, canvas, linksLayer, currentPageNum: 1 });
      await renderPage(container);
    } catch (e){ console.warn('PDF singlepage init error:', e); }
  }

  function initAll(){
    const list = document.querySelectorAll('.pdf-singlepage-viewer[data-src]');
    list.forEach(c => { if (!viewers.has(c)) initContainer(c); });
  }

  // Re-render on resize to keep fit-to-width
  let rAF = 0;
  window.addEventListener('resize', () => {
    if (rAF) cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(()=> { viewers.forEach((_, c) => renderPage(c)); });
  });

  // Init on DOM ready and when navigating to the section
  document.addEventListener('DOMContentLoaded', initAll);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="frecuencias-semana"], [data-section="puntualidad-agosto"]')) setTimeout(initAll, 50); });
})();
