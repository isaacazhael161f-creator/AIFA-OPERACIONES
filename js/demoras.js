;(function(){
  const sec = document.getElementById('demoras-section');
  if (!sec) return;
    // Fallback de datos local (para mantener el módulo autosuficiente)
    const LOCAL_DEMORAS = {
        periodo: 'Octubre 2025',
        causas: [
            { causa: 'Repercusión', demoras: 479 },
            { causa: 'Compañía', demoras: 164 },
            { causa: 'Evento Circunstancial', demoras: 4 },
            { causa: 'Combustible', demoras: 2 },
            { causa: 'Autoridad', demoras: 4 },
            { causa: 'Meteorología', demoras: 13 },
            { causa: 'Aeropuerto', demoras: 1 }
        ]
    };

  const DEMORAS_META = {
    'repercusión': {
      descripcion: 'Se origina en otros aeropuertos y su consecuente llegada tardía al AIFA.'
    },
    'compañía': {
      descripcion: 'Las principales causas son mantenimiento no programado, espera de tripulación, conveniencia de la aerolínea y flujo lento de pasajeros.'
    },
    'evento circunstancial': {
      descripcion: 'Se origina por pasajeros disruptivos, pasajeros o tripulantes enfermos, pasajeros con poca movilidad, así como, espera por tráfico aéreo.'
    },
    'meteorología': {
      descripcion: 'Sucede por esperar mejores condiciones meteorológicas en el aeropuerto de destino, principalmente lluvia y bancos de niebla.'
    },
    'autoridad': {
      descripcion: 'Demoras relacionadas con inspecciones o procesos a cargo de la autoridad.',
      incidentes: [
        '5X 3621 de 07 Oct. 2025 (36 min.)',
        '5X 321 de 10 Oct. 2025 (34 min.)',
        '5X 321 de 17 Oct. 2025 (22 min.)',
        '5X 321 de 27 Oct. 2025 (25 min.)'
      ],
      observaciones: 'Inspección tardía de carga por falta de equipo de Rayos "X".'
    },
    'combustible': {
      descripcion: 'Demoras causadas por disponibilidad o gestión de combustible.',
      incidentes: [
        'VB 7438 de 02 Oct. 2025 (24 min.)',
        'E7 615 de 03 Oct. 2025 (37 min.)'
      ]
    },
    'aeropuerto': {
      descripcion: 'Demoras derivadas de infraestructura o servicios del propio aeropuerto.',
      incidentes: [
        'VB 9312 de 03 Oct. 2025 (24 min.)'
      ],
      observaciones: 'Falla en aeropasillo 107-A del sistema de auto nivelación del contacto EK-3 que restringe su movimiento.'
    }
  };

  const DEMORAS_ICONS = {
    'repercusión': 'fa-route',
    'compañía': 'fa-building',
    'evento circunstancial': 'fa-triangle-exclamation',
    'combustible': 'fa-gas-pump',
    'autoridad': 'fa-shield-halved',
    'meteorología': 'fa-cloud-rain',
    'aeropuerto': 'fa-tower-broadcast'
  };

  let demorasStatsMap = {};
  let demorasPeriodo = '';

  // Función para destruir/limpiar la gráfica de demoras (canvas)
  window.destroyDemorasCharts = function() {
    console.log('🗑️ Limpiando gráfica de demoras (canvas)...');
    try {
      const c = document.getElementById('delaysPieChart');
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        const w = c.clientWidth || 400;
        const h = c.clientHeight || 300;
        c.width = Math.max(1, Math.floor(w * dpr));
        c.height = Math.max(1, Math.floor(h * dpr));
        const g = c.getContext('2d');
        if (g) { g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h); }
      }
    } catch(e) { console.warn('Error limpiando canvas demoras:', e); }
  };

  function drawPie(canvas, labels, values, colors, title, onSliceClick){
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 360;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,w,h);

    const total = (values||[]).reduce((a,b)=> a + (Number(b)||0), 0);
    const cx = Math.floor(w*0.42), cy = Math.floor(h*0.55);
    const r = Math.max(40, Math.min(w,h)*0.32);
    const slices = [];
    let focusedSliceIndex = 0;

    // Título
    if (title) {
      g.fillStyle = '#495057';
      g.font = '600 14px Roboto, Arial';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(title, 8, 8);
    }

    let start = -Math.PI/2; // iniciar arriba
    for (let i=0;i<labels.length;i++){
      const v = Number(values[i]||0);
      const frac = total>0 ? v/total : 0;
      const end = start + frac * Math.PI*2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.fillStyle = colors[i % colors.length];
      g.arc(cx, cy, r, start, end);
      g.closePath();
      g.fill();
      // borde blanco fino
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
      // etiqueta si el sector es suficientemente grande
      if (frac >= 0.08) {
        const mid = (start + end)/2;
        const lx = cx + (r*0.62) * Math.cos(mid);
        const ly = cy + (r*0.62) * Math.sin(mid);
        const pct = Math.round(frac*100) + '%';
        g.fillStyle = '#ffffff';
        g.font = '600 12px Roboto, Arial';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pct, lx, ly);
      }
      slices.push({ start, end, label: labels[i] || '', value: v, index: i });
      start = end;
    }

    if (typeof onSliceClick === 'function') {
      const triggerSlice = (label) => {
        if (typeof onSliceClick === 'function') onSliceClick(label);
      };
      canvas.classList.add('demoras-hover');
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${title || 'Distribución de demoras'}: selecciona una causa con clic o teclado.`);
      canvas.setAttribute('title', 'Haz clic o usa las flechas y Enter para explorar las causas');
      canvas.onclick = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
        const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
        const nx = x / (canvas.width / (canvas.clientWidth || 1));
        const ny = y / (canvas.height / (canvas.clientHeight || 1));
        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > r) return;
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI/2) angle += Math.PI*2;
        for (const slice of slices) {
          if (angle >= slice.start && angle <= slice.end) {
            focusedSliceIndex = slice.index;
            triggerSlice(slice.label);
            break;
          }
        }
      };
      canvas.onkeydown = (ev) => {
        if (!slices.length) return;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
          ev.preventDefault();
          focusedSliceIndex = (focusedSliceIndex + 1) % slices.length;
          triggerSlice(slices[focusedSliceIndex].label);
        } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          focusedSliceIndex = (focusedSliceIndex - 1 + slices.length) % slices.length;
          triggerSlice(slices[focusedSliceIndex].label);
        } else if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          triggerSlice(slices[focusedSliceIndex].label);
        }
      };
    } else {
      canvas.classList.remove('demoras-hover');
      canvas.onclick = null;
      canvas.onkeydown = null;
      canvas.removeAttribute('tabindex');
      canvas.removeAttribute('role');
      canvas.removeAttribute('aria-label');
      canvas.removeAttribute('title');
    }
  }

  function normalizeCausaKey(name){
    return (name || '').toString().trim().toLowerCase();
  }

  function renderDemorasLegend(data, colors){
    const legendEl = document.getElementById('demoras-chart-legend');
    if (!legendEl) return;
    legendEl.innerHTML = '';
    if (!Array.isArray(data) || !data.length) {
      legendEl.classList.add('d-none');
      return;
    }
    legendEl.classList.remove('d-none');
    data.forEach((item, idx) => {
      const key = normalizeCausaKey(item.causa);
      const stats = demorasStatsMap[key];
      const pct = stats ? stats.porcentaje : '0.0';
      const swatchColor = colors[idx % colors.length];
      const node = document.createElement('div');
      node.className = 'demoras-legend-item';
      node.innerHTML = `
        <span class="demoras-legend-swatch" style="background:${swatchColor};"></span>
        <span class="demoras-legend-text"><strong>${item.causa}</strong><span>${item.demoras} demoras · ${pct}%</span></span>
      `;
      node.dataset.causa = item.causa;
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `Ver detalle de ${item.causa}`);
      node.addEventListener('click', () => showDemorasDetail(item.causa, { fromLegend: true }));
      node.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          showDemorasDetail(item.causa, { fromLegend: true });
        }
      });
      legendEl.appendChild(node);
    });
  }

  function showDemorasDetail(causa, options = {}){
    const key = normalizeCausaKey(causa);
    const meta = DEMORAS_META[key];
    const stats = demorasStatsMap[key];
  const { skipHintDismiss = false } = options;
    const titleEl = document.getElementById('demoras-detail-title');
    const descEl = document.getElementById('demoras-detail-description');
    const incidentesBox = document.getElementById('demoras-detail-incidentes');
    const incidentesList = document.getElementById('demoras-detail-incidentes-list');
    const obsBox = document.getElementById('demoras-detail-observaciones');
    const obsText = document.getElementById('demoras-detail-observaciones-text');
    const metricEl = document.getElementById('demoras-detail-metric');
    const cardEl = document.getElementById('demoras-detail-card');
    const hintBar = document.getElementById('demoras-interactive-hint');
    const chartWrapper = document.getElementById('demoras-chart-wrapper');
    const tagsEl = document.getElementById('demoras-detail-tags');
    const iconEl = document.getElementById('demoras-detail-icon');

    if (!titleEl || !descEl) return;

    const hasCausa = Boolean(causa);
    titleEl.textContent = hasCausa ? causa : 'Selecciona una causa';

    if (meta && meta.descripcion) {
      descEl.textContent = meta.descripcion;
      descEl.classList.remove('text-muted');
    } else {
      descEl.textContent = hasCausa ? 'Motivo no documentado. Puedes actualizarlo más tarde.' : 'Haz clic en cualquier causa para ver el detalle.';
      descEl.classList.add('text-muted');
    }

    if (iconEl) {
      const iconClass = DEMORAS_ICONS[key] || 'fa-chart-pie';
      iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;
    }

    if (incidentesBox && incidentesList) {
      incidentesList.innerHTML = '';
      if (meta && Array.isArray(meta.incidentes) && meta.incidentes.length) {
        meta.incidentes.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          incidentesList.appendChild(li);
        });
        incidentesBox.classList.remove('d-none');
      } else {
        incidentesBox.classList.add('d-none');
      }
    }

    if (obsBox && obsText) {
      if (meta && meta.observaciones) {
        obsText.textContent = meta.observaciones;
        obsBox.classList.remove('d-none');
      } else {
        obsText.textContent = '';
        obsBox.classList.add('d-none');
      }
    }

    if (metricEl) {
      metricEl.classList.remove('is-muted');
      if (stats && hasCausa) {
        metricEl.textContent = `${stats.demoras} demoras · ${stats.porcentaje}%`;
      } else if (hasCausa) {
        metricEl.textContent = stats && typeof stats.demoras !== 'undefined' ? `${stats.demoras} demoras` : '--';
        metricEl.classList.add('is-muted');
      } else {
        metricEl.textContent = '--';
        metricEl.classList.add('is-muted');
      }
    }

    if (tagsEl) {
      tagsEl.innerHTML = '';
      if (hasCausa) {
        const chips = [];
        if (stats) {
          chips.push({ icon: 'fa-chart-pie', text: `${stats.porcentaje}% del total` });
          chips.push({ icon: 'fa-clock', text: `${stats.demoras} demoras` });
        }
        const incidentesCount = meta && Array.isArray(meta.incidentes) ? meta.incidentes.length : 0;
        chips.push({
          icon: 'fa-list-ul',
          text: incidentesCount ? `${incidentesCount} incidente${incidentesCount === 1 ? '' : 's'}` : 'Sin incidentes registrados'
        });
        chips.push({
          icon: meta && meta.observaciones ? 'fa-note-sticky' : 'fa-circle-check',
          text: meta && meta.observaciones ? 'Con observaciones' : 'Sin observaciones'
        });
        if (demorasPeriodo) {
          chips.push({ icon: 'fa-calendar-alt', text: `Periodo ${demorasPeriodo}` });
        }
        chips.forEach(chip => {
          const span = document.createElement('span');
          span.className = 'demoras-detail-chip';
          if (chip.icon) {
            span.innerHTML = `<i class="fas ${chip.icon}" aria-hidden="true"></i>${chip.text}`;
          } else {
            span.textContent = chip.text;
          }
          tagsEl.appendChild(span);
        });
        tagsEl.classList.remove('d-none');
      } else {
        tagsEl.classList.add('d-none');
      }
    }

    if (cardEl) {
      cardEl.classList.toggle('has-data', hasCausa);
      cardEl.classList.toggle('is-empty', !hasCausa);
    }

    const tbody = document.getElementById('demoras-tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => {
        const cell = tr.firstElementChild;
        const matches = normalizeCausaKey(cell?.textContent) === key;
        tr.classList.toggle('active', matches);
      });
    }

    const legendItems = document.querySelectorAll('#demoras-chart-legend .demoras-legend-item');
    legendItems.forEach(item => {
      const matches = normalizeCausaKey(item.dataset.causa || '') === key;
      item.classList.toggle('active', matches);
    });

    if (!hasCausa) {
      legendItems.forEach(item => item.classList.remove('active'));
    }

    if (!skipHintDismiss) {
      if (hintBar) hintBar.classList.add('dismissed');
      if (chartWrapper) chartWrapper.classList.add('hint-dismissed');
    }
  }

  // Define global renderDemoras so other code can call it
  window.renderDemoras = function renderDemoras(data) {
    try {
                const demorasData = (function(){
                    if (Array.isArray(data)) return { periodo: (window.staticData?.demoras?.periodo || LOCAL_DEMORAS.periodo), causas: data };
                    if (window.staticData && window.staticData.demoras) return window.staticData.demoras;
                    return LOCAL_DEMORAS;
                })();
                const d = demorasData.causas || [];
        const tbody = document.getElementById('demoras-tbody');
        const tfoot = document.getElementById('demoras-tfoot');
                const title = document.getElementById('demoras-title');
    if (tbody) tbody.innerHTML = '';
    demorasStatsMap = Object.create(null);
    demorasPeriodo = demorasData.periodo || '';
    const total = (d||[]).reduce((acc, r) => acc + (Number(r.demoras||0)), 0);
                if (title) { title.textContent = `Análisis de Demoras${demorasData.periodo? ' · ' + demorasData.periodo : ''}`; }
        (d||[]).forEach(r => {
            if (tbody) {
                const delays = Number(r.demoras||0);
                const pct = ((delays / Math.max(1, total)) * 100).toFixed(1);
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${r.causa}</td><td>${r.demoras}</td><td>${pct}%</td>`;
                tr.tabIndex = 0;
                demorasStatsMap[normalizeCausaKey(r.causa)] = { demoras: delays, porcentaje: pct };
                tr.addEventListener('click', () => showDemorasDetail(r.causa, { fromTable: true }));
                tr.addEventListener('keydown', (ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    showDemorasDetail(r.causa, { fromTable: true });
                  }
                });
                tbody.appendChild(tr);
            }
        });
        if (tfoot) tfoot.innerHTML = `<tr class="table-light"><th>Total</th><th>${total}</th><th>100%</th></tr>`;
    // Pastel (canvas)
    const pie = document.getElementById('delaysPieChart');
    if (pie) {
      const labels = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => tr.children[0]?.textContent || '');
      const values = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => parseFloat(tr.children[1]?.textContent||'0')||0);
      const baseColors = ['#0d6efd','#6610f2','#6f42c1','#d63384','#dc3545','#fd7e14','#ffc107','#198754','#20c997','#0dcaf0'];
      const onSliceSelect = (label) => showDemorasDetail(label, { fromChart: true });
      drawPie(pie, labels, values, baseColors, 'Demoras en vuelos de salida', onSliceSelect);
      renderDemorasLegend(d, baseColors);
      window._delaysPieDrawn = true;
    }
    const hintBar = document.getElementById('demoras-interactive-hint');
    if (hintBar) hintBar.classList.remove('dismissed');
    const chartWrapper = document.getElementById('demoras-chart-wrapper');
    if (chartWrapper) chartWrapper.classList.remove('hint-dismissed');
    if (d && d.length) {
      showDemorasDetail(d[0].causa, { skipHintDismiss: true, isAuto: true });
    } else {
      showDemorasDetail('', { skipHintDismiss: true, isAuto: true });
    }

    const hintCTA = document.getElementById('demoras-hint-cta');
    if (hintCTA) {
      hintCTA.onclick = () => {
        const firstRow = document.querySelector('#demoras-tbody tr');
        if (firstRow) {
          firstRow.focus();
          firstRow.click();
        }
      };
    }
    } catch (e) { console.warn('renderDemoras error:', e); }
  };

  function safeRender(){ try { window.renderDemoras(); } catch(_){} }
  document.addEventListener('DOMContentLoaded', safeRender);
  document.addEventListener('click', (e)=>{ if (e.target.closest('[data-section="demoras"]')) setTimeout(safeRender, 50); });
    // Nota: evitamos observar cambios en tbody para no provocar bucles de re-render.
})();
