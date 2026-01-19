; (function () {
  const sec = document.getElementById('demoras-section');
  if (!sec) return;

  const DEMORAS_MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const DEMORAS_MONTH_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const demorasState = {
    initialized: false,
    periods: [],
    activeKey: null
  };
  const DEMORAS_DATA_PATH = 'data/demoras.json';
  let demorasDataCache = null;
  let demorasDataPromise = null;
  let demorasDataLoadError = null;

  // Fallback de datos local (para mantener el módulo autosuficiente)
  const LOCAL_DEMORAS = {
    year: '2025',
    periodo: 'Noviembre 2025',
    causas: [
      { causa: 'Repercusión', demoras: 507 },
      { causa: 'Compañía', demoras: 190 },
      { causa: 'Evento Circunstancial', demoras: 3 },
      { causa: 'Combustible', demoras: 1 },
      { causa: 'Autoridad', demoras: 0 },
      { causa: 'Meteorología', demoras: 12 },
      { causa: 'Aeropuerto', demoras: 1 }
    ]
  };

  function normalizeDetailValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value
        .map((entry) => normalizeDetailValue(entry))
        .filter(Boolean)
        .join(' · ');
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (!keys.length) return '';
      const preferredOrder = ['vuelo', 'flight', 'fecha', 'hora', 'detalle', 'descripcion', 'motivo', 'observacion', 'nota', 'comentario', 'ubicacion', 'causa', 'accion', 'resultado', 'tiempo', 'aerolinea'];
      const used = new Set();
      const segments = [];
      preferredOrder.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(value, key)) return;
        const normalized = normalizeDetailValue(value[key]);
        if (!normalized) return;
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        segments.push(`${label}: ${normalized}`);
        used.add(key);
      });
      keys.forEach((key) => {
        if (used.has(key)) return;
        const normalized = normalizeDetailValue(value[key]);
        if (!normalized) return;
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        segments.push(`${label}: ${normalized}`);
      });
      return segments.join(' · ');
    }
    return String(value).trim();
  }

  function normalizeDetailList(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => normalizeDetailValue(entry)).filter(Boolean);
    }
    const normalized = normalizeDetailValue(value);
    return normalized ? [normalized] : [];
  }

  function explodeDetailEntries(entries) {
    const output = [];
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      if (typeof entry === 'string') {
        entry.split(/\n+/).forEach((chunk) => {
          const trimmed = chunk.trim();
          if (trimmed) output.push(trimmed);
        });
      } else if (entry !== null && entry !== undefined) {
        const text = String(entry).trim();
        if (text) output.push(text);
      }
    });
    return output;
  }

  function getReportMonthTarget() {
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const year = target.getFullYear();
    const monthIndex = target.getMonth();
    const monthNumber = monthIndex + 1;
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const sortStamp = (year * 100) + monthNumber;
    return {
      year,
      monthIndex,
      monthNumber,
      key,
      sortStamp,
      monthName: DEMORAS_MONTH_FULL[monthIndex]
    };
  }

  function periodMatchesTarget(period, target) {
    if (!period || !target) return false;
    const sortOrder = Number(period.sortOrder);
    if (Number.isFinite(sortOrder) && sortOrder === target.sortStamp) return true;
    const key = (period.key || '').toString().toLowerCase();
    if (key === target.key.toLowerCase()) return true;
    const label = (period.label || period.periodo || '').toString().toLowerCase();
    if (label.includes(String(target.year)) && label.includes(target.monthName)) return true;
    return false;
  }

  function getCurrentMonthStamp() {
    const today = new Date();
    return (today.getFullYear() * 100) + (today.getMonth() + 1);
  }

  function shouldDisablePeriod(period) {
    if (!period) return false;
    if (period.scope === 'annual' || period.scope === 'current') return false;
    const sortOrder = Number(period.sortOrder);
    if (Number.isFinite(sortOrder)) {
      return sortOrder >= getCurrentMonthStamp();
    }
    return false;
  }

  function resolveDemorasDataUrl(force) {
    const base = DEMORAS_DATA_PATH;
    try {
      if (window.location && window.location.protocol === 'file:') {
        return base;
      }
    } catch (_) { /* noop */ }
    if (!force) return base;
    const ts = Date.now();
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}v=${ts}`;
  }

  function loadDemorasData(force = false) {
    // If we have cached data and not forcing refresh, return it
    if (!force && demorasDataCache) return Promise.resolve(demorasDataCache);
    if (!force && demorasDataPromise) return demorasDataPromise;

    try {
      // Use DataManager if available to fetch from Supabase
      if (window.dataManager) {
        demorasDataPromise = window.dataManager.getDelays()
          .then((data) => {
            if (!data) return [];

            // Group by "Month Year"
            const grouped = {};
            data.forEach(item => {
              const periodKey = `${item.month} ${item.year}`;
              if (!grouped[periodKey]) {
                grouped[periodKey] = {
                  periodo: periodKey,
                  year: item.year,
                  causas: []
                };
              }

              // Add entry
              grouped[periodKey].causas.push({
                causa: item.cause,
                demoras: item.count || 0,
                descripcion: item.description || '',
                observaciones: item.observations || ''
              });
            });

            // Convert to array
            const periods = Object.values(grouped);

            // Sort causal list within each period by count desc
            periods.forEach(p => {
              p.causas.sort((a, b) => b.demoras - a.demoras);
            });

            const result = { periods: periods };
            demorasDataCache = result;
            demorasDataLoadError = null;
            demorasDataPromise = null;
            return result;
          })
          .catch((error) => {
            console.error("Error loading delays from Supabase, falling back to local/JSON", error);
            // Fallback to original JSON method if Supabase fails
            return fetchOriginalJson(force);
          });
        return demorasDataPromise;
      } else {
        return fetchOriginalJson(force);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function fetchOriginalJson(force) {
    const url = resolveDemorasDataUrl(force);
    return fetch(url, { cache: force ? 'no-store' : 'default' })
      .then((response) => {
        if (!response.ok) throw new Error(`No se pudo cargar demoras (${response.status})`);
        return response.json();
      })
      .then((json) => {
        demorasDataCache = json;
        return json;
      });
  }

  function getDemorasBaseDataset() {
    if (demorasDataCache && typeof demorasDataCache === 'object') return demorasDataCache;
    if (window.staticData?.demoras) return window.staticData.demoras;
    return LOCAL_DEMORAS;
  }

  function normalizeDemorasCausas(entries = []) {
    return (Array.isArray(entries) ? entries : []).map((item) => {
      const incidentesSource = Array.isArray(item?.incidentesList) && item.incidentesList.length
        ? item.incidentesList
        : item?.incidentes;
      const observacionesSource = Array.isArray(item?.observacionesList) && item.observacionesList.length
        ? item.observacionesList
        : item?.observaciones;
      const incidentes = normalizeDetailList(incidentesSource);
      const observacionesList = normalizeDetailList(observacionesSource);
      const observaciones = observacionesList.length
        ? observacionesList.join('\n')
        : (typeof item?.observaciones === 'string' ? item.observaciones.trim() : '');
      const descripcion = typeof item?.descripcion === 'string' ? item.descripcion : '';
      return {
        causa: item?.causa || 'Sin causa',
        demoras: Number(item?.demoras) || 0,
        incidentes,
        observaciones,
        observacionesList,
        descripcion
      };
    });
  }

  function extractYearFromString(value) {
    const match = /(?:(?:19|20)\d{2})/.exec((value || '').toString());
    return match ? match[0] : '';
  }

  function extractMonthIndex(value) {
    if (!value) return null;
    const isoMatch = /(?:-|\/)(\d{1,2})(?!.*\d)/.exec(value);
    if (isoMatch) {
      const month = Number(isoMatch[1]);
      if (Number.isFinite(month) && month >= 1 && month <= 12) return month - 1;
    }
    const lower = value.toString().toLowerCase();
    const nameIdx = DEMORAS_MONTH_FULL.findIndex((name) => lower.includes(name));
    return nameIdx >= 0 ? nameIdx : null;
  }

  function deriveShortLabel(label) {
    if (!label) return 'Periodo';
    const lower = label.toString().toLowerCase();
    const idx = DEMORAS_MONTH_FULL.findIndex((name) => lower.includes(name));
    if (idx >= 0) return DEMORAS_MONTH_ABBR[idx];
    return label;
  }

  function derivePeriodSortOrder(entry, fallbackOrder) {
    const token = entry?.key || entry?.periodo || entry?.label || '';
    const iso = /((?:19|20)\d{2})[-/](\d{1,2})/.exec(token);
    if (iso) {
      const year = Number(iso[1]);
      const month = Number(iso[2]);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        return (year * 100) + month;
      }
    }
    const year = Number(extractYearFromString(token));
    const monthIdx = extractMonthIndex(token);
    if (Number.isFinite(year) && monthIdx !== null) {
      return (year * 100) + (monthIdx + 1);
    }
    if (Number.isFinite(entry?.sortOrder)) return Number(entry.sortOrder);
    return fallbackOrder;
  }

  function normalizeDemorasPeriodEntry(entry, idx, dataset) {
    const causas = normalizeDemorasCausas(entry?.causas);
    if (!causas.length) return null;
    const key = entry?.key || entry?.id || entry?.code || entry?.periodo || `period-${idx}`;
    const label = entry?.label || entry?.periodo || `Periodo ${idx + 1}`;
    const periodo = entry?.periodo || label;
    const shortLabel = entry?.shortLabel || deriveShortLabel(label);
    const year = entry?.year || dataset?.year || extractYearFromString(key) || extractYearFromString(periodo);
    const sortOrder = derivePeriodSortOrder({ key, periodo, label, sortOrder: entry?.sortOrder }, idx);
    return {
      key,
      label,
      periodo,
      shortLabel,
      year,
      scope: entry?.scope || 'monthly',
      causas,
      sortOrder
    };
  }

  function buildDemorasAnnualPeriod(periods, dataset) {
    if (!Array.isArray(periods) || !periods.length) return null;
    const totals = new Map();
    periods.forEach((period) => {
      if (!Array.isArray(period?.causas)) return;
      period.causas.forEach((item) => {
        const causeName = item?.causa || 'Sin causa';
        const amount = Number(item?.demoras) || 0;
        totals.set(causeName, (totals.get(causeName) || 0) + amount);
      });
    });
    if (!totals.size) return null;
    const causas = Array.from(totals.entries())
      .map(([causa, demoras]) => ({ causa, demoras }))
      .sort((a, b) => b.demoras - a.demoras);
    const inferredYear = dataset?.year || periods.find((p) => p.year)?.year || '';
    const label = inferredYear ? `Año ${inferredYear}` : 'Año completo';
    return {
      key: inferredYear ? `annual-${inferredYear}` : 'annual-total',
      label,
      periodo: label,
      shortLabel: inferredYear ? `Año ${inferredYear}` : 'Año',
      scope: 'annual',
      year: inferredYear,
      causas,
      sortOrder: Number.MAX_SAFE_INTEGER
    };
  }

  function buildCurrentSnapshotPeriod(dataset) {
    if (!dataset || !Array.isArray(dataset.causas) || !dataset.causas.length) return null;
    const baseKey = dataset.periodKey || dataset.currentKey || dataset.key || dataset.periodo || 'actual';
    const key = `current-${baseKey}`;
    const snapshotEntry = normalizeDemorasPeriodEntry({
      key,
      label: dataset.periodo || 'Vista general',
      periodo: dataset.periodo || 'Vista general',
      shortLabel: dataset.snapshotShortLabel || 'General',
      scope: 'current',
      causas: dataset.causas,
      year: dataset.year
    }, -1, dataset);
    return snapshotEntry;
  }

  function buildDemorasPeriodsFromDataset(dataset = getDemorasBaseDataset()) {
    const safeDataset = dataset || {};
    const raw = Array.isArray(dataset.periods)
      ? dataset.periods
      : (Array.isArray(dataset.months) ? dataset.months : []);
    let normalized = raw
      .map((period, idx) => normalizeDemorasPeriodEntry(period, idx, safeDataset))
      .filter(Boolean);

    const snapshot = buildCurrentSnapshotPeriod(dataset);
    if (snapshot) {
      const exists = normalized.some((period) => period.key === snapshot.key || period.periodo === snapshot.periodo);
      if (!exists) {
        normalized = [snapshot, ...normalized];
      } else {
        normalized = normalized.map((period) => (period.key === snapshot.key ? { ...period, scope: 'current' } : period));
      }
    }

    if (!normalized.length && Array.isArray(dataset.causas)) {
      const fallback = normalizeDemorasPeriodEntry({
        key: 'current-period',
        label: dataset.periodo || 'Periodo actual',
        shortLabel: 'Actual',
        periodo: dataset.periodo || 'Periodo actual',
        causas: dataset.causas,
        year: dataset.year
      }, 0, safeDataset);
      if (fallback) normalized.push(fallback);
    }

    if (!normalized.length) {
      const localPeriod = normalizeDemorasPeriodEntry({
        key: 'fallback-local',
        label: LOCAL_DEMORAS.periodo,
        periodo: LOCAL_DEMORAS.periodo,
        shortLabel: 'Actual',
        causas: LOCAL_DEMORAS.causas,
        year: LOCAL_DEMORAS.year
      }, 0, LOCAL_DEMORAS);
      if (localPeriod) normalized.push(localPeriod);
    }

    normalized.sort((a, b) => b.sortOrder - a.sortOrder);
    const currentIdx = normalized.findIndex((period) => period.scope === 'current');
    if (currentIdx > 0) {
      const [currentPeriod] = normalized.splice(currentIdx, 1);
      normalized.unshift(currentPeriod);
    }
    const annual = buildDemorasAnnualPeriod(normalized.filter((p) => p.scope !== 'annual'), safeDataset);
    return annual ? [annual, ...normalized] : normalized;
  }

  function findDefaultDemorasPeriod(periods = demorasState.periods) {
    const available = periods.filter((p) => p.scope !== 'annual');
    if (!available.length) return periods[0] || null;
    const allowed = available.filter((period) => !shouldDisablePeriod(period));
    const pool = allowed.length ? allowed : available;
    const target = getReportMonthTarget();
    const targetMatch = pool.find((period) => periodMatchesTarget(period, target));
    if (targetMatch) return targetMatch;
    const currentSnapshot = pool.find((period) => period.scope === 'current');
    if (currentSnapshot) return currentSnapshot;
    return pool.reduce((best, current) => {
      if (!best) return current;
      return (Number(current.sortOrder) || 0) > (Number(best.sortOrder) || 0) ? current : best;
    }, pool[0]);
  }

  function rebuildDemorasState(dataset) {
    const periods = buildDemorasPeriodsFromDataset(dataset);
    demorasState.periods = periods;
    demorasState.initialized = true;
    if (periods.some((period) => period.key === demorasState.activeKey)) {
      return;
    }
    const preferred = findDefaultDemorasPeriod(periods);
    demorasState.activeKey = preferred?.key || periods[0]?.key || null;
  }

  function ensureDemorasState(dataset) {
    if (dataset) {
      rebuildDemorasState(dataset);
      return;
    }
    if (demorasState.initialized) return;
    rebuildDemorasState(getDemorasBaseDataset());
  }

  function getActiveDemorasPeriodData() {
    ensureDemorasState();
    if (!demorasState.periods.length) return null;
    if (!demorasState.activeKey) {
      const preferred = findDefaultDemorasPeriod() || demorasState.periods[0];
      demorasState.activeKey = preferred?.key || null;
      return preferred;
    }
    const match = demorasState.periods.find((period) => period.key === demorasState.activeKey);
    if (match) return match;
    const fallback = findDefaultDemorasPeriod() || demorasState.periods[0];
    demorasState.activeKey = fallback?.key || null;
    return fallback;
  }

  function syncDemorasActiveUI(activeKey, periodoLabel) {
    const container = document.getElementById('demoras-period-controls');
    if (container) {
      const buttons = container.querySelectorAll('.demoras-period-btn');
      buttons.forEach((btn) => {
        const isActive = btn.dataset.periodKey === activeKey;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      container.classList.toggle('d-none', demorasState.periods.length <= 1);
    }
    const labelEl = document.getElementById('demoras-period-active-label');
    if (labelEl) {
      labelEl.textContent = periodoLabel || 'Selecciona un periodo';
    }
  }

  function renderDemorasPeriodControls() {
    ensureDemorasState();
    const container = document.getElementById('demoras-period-controls');
    if (!container) return;
    container.innerHTML = '';
    if (demorasState.periods.length <= 1) {
      container.classList.add('d-none');
      return;
    }
    demorasState.periods.forEach((period) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'demoras-period-btn';
      if (period.scope === 'annual') btn.classList.add('demoras-period-btn-annual');
      if (period.scope === 'current') btn.classList.add('demoras-period-btn-current');
      if (period.key === demorasState.activeKey) btn.classList.add('active');
      btn.dataset.periodKey = period.key;
      btn.textContent = period.shortLabel || period.label || 'Periodo';
      const disabled = shouldDisablePeriod(period);
      if (disabled) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.setAttribute('aria-pressed', period.key === demorasState.activeKey ? 'true' : 'false');
      let title = period.periodo || period.label || 'Periodo de demoras';
      if (disabled) {
        title += ' · Disponible al cierre del mes.';
      }
      btn.title = title;
      container.appendChild(btn);
    });
    if (!container._wired) {
      container.addEventListener('click', (event) => {
        const btn = event.target.closest('.demoras-period-btn');
        if (!btn || btn.disabled || btn.classList.contains('is-disabled')) return;
        const key = btn.dataset.periodKey;
        if (key) selectDemorasPeriod(key);
      });
      container._wired = true;
    }
  }

  function selectDemorasPeriod(key) {
    ensureDemorasState();
    if (!key || demorasState.activeKey === key) return;
    const target = demorasState.periods.find((period) => period.key === key);
    if (!target) return;
    demorasState.activeKey = key;
    window.renderDemoras(target);
  }

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
  window.destroyDemorasCharts = function () {
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
        if (g) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); }
      }
    } catch (e) { console.warn('Error limpiando canvas demoras:', e); }
  };

  function drawPie(canvas, labels, values, colors, title, onSliceClick) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 360;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const total = (values || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const cx = Math.floor(w * 0.42), cy = Math.floor(h * 0.55);
    const r = Math.max(40, Math.min(w, h) * 0.32);
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

    let start = -Math.PI / 2; // iniciar arriba
    for (let i = 0; i < labels.length; i++) {
      const v = Number(values[i] || 0);
      const frac = total > 0 ? v / total : 0;
      const end = start + frac * Math.PI * 2;
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
        const mid = (start + end) / 2;
        const lx = cx + (r * 0.62) * Math.cos(mid);
        const ly = cy + (r * 0.62) * Math.sin(mid);
        const pct = Math.round(frac * 100) + '%';
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
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) return;
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;
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

  function normalizeCausaKey(name) {
    return (name || '').toString().trim().toLowerCase();
  }

  function renderDemorasLegend(data, colors) {
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

  function showDemorasDetail(causa, options = {}) {
    const key = normalizeCausaKey(causa);
    const stats = demorasStatsMap[key];
    const detail = stats?.detail || null;
    const incidentesListNormalized = explodeDetailEntries(Array.isArray(detail?.incidentes) ? detail.incidentes : []);
    const resolvedObservation = typeof detail?.observaciones === 'string' ? detail.observaciones.trim() : '';
    const observacionesListNormalized = Array.isArray(detail?.observacionesList)
      ? detail.observacionesList.filter(Boolean)
      : [];
    const observationEntries = explodeDetailEntries(
      observacionesListNormalized.length
        ? observacionesListNormalized
        : (resolvedObservation ? [resolvedObservation] : [])
    );
    const hasObservationEntries = observationEntries.length > 0;
    const descriptionText = typeof detail?.descripcion === 'string' ? detail.descripcion.trim() : '';
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

    if (descriptionText) {
      descEl.textContent = descriptionText;
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
      if (incidentesListNormalized.length) {
        incidentesListNormalized.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          incidentesList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'demoras-empty-entry';
        li.textContent = hasCausa
          ? 'Sin casos registrados para este motivo.'
          : 'Selecciona una causa para ver los casos registrados.';
        incidentesList.appendChild(li);
      }
      incidentesBox.classList.remove('d-none');
    }

    if (obsBox && obsText) {
      obsText.innerHTML = '';
      if (hasObservationEntries) {
        const bulletPattern = /^\s*(\d+)\.\s*/;
        const paragraphItems = [];
        const bulletItems = [];
        observationEntries.forEach((entry) => {
          if (!entry) return;
          const match = entry.match(bulletPattern);
          if (match) {
            const cleaned = entry.replace(bulletPattern, '').trim();
            bulletItems.push({
              step: match[1],
              text: cleaned || entry.replace(/^\s*/, '')
            });
          } else {
            paragraphItems.push(entry);
          }
        });

        paragraphItems.forEach((text) => {
          const p = document.createElement('p');
          p.textContent = text;
          obsText.appendChild(p);
        });

        if (bulletItems.length) {
          const list = document.createElement('ul');
          list.className = 'demoras-timeline demoras-observaciones-timeline';
          bulletItems.forEach(({ step, text }) => {
            const li = document.createElement('li');
            if (step) {
              li.dataset.step = step;
            }
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            li.appendChild(paragraph);
            list.appendChild(li);
          });
          obsText.appendChild(list);
        }

        if (!obsText.childElementCount) {
          obsText.textContent = 'Sin observaciones registradas para este motivo.';
        }
      } else if (hasCausa) {
        obsText.textContent = 'Sin observaciones registradas para este motivo.';
      } else {
        obsText.textContent = 'Selecciona una causa para ver las observaciones asociadas.';
      }
      obsBox.classList.remove('d-none');
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
        const incidentesCount = incidentesListNormalized.length;
        chips.push({
          icon: 'fa-list-ul',
          text: incidentesCount ? `${incidentesCount} incidente${incidentesCount === 1 ? '' : 's'}` : 'Sin incidentes registrados'
        });
        const hasObservaciones = hasObservationEntries;
        chips.push({
          icon: hasObservaciones ? 'fa-note-sticky' : 'fa-circle-check',
          text: hasObservaciones ? 'Con observaciones' : 'Sin observaciones'
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

  function resolveDemorasDataset(data) {
    ensureDemorasState();
    if (Array.isArray(data)) {
      return {
        key: null,
        label: 'Datos personalizados',
        periodo: window.staticData?.demoras?.periodo || LOCAL_DEMORAS.periodo,
        scope: 'custom',
        causas: normalizeDemorasCausas(data)
      };
    }
    if (data && Array.isArray(data.causas)) {
      return {
        key: data.key || data.id || data.periodKey || null,
        label: data.label || data.periodo || 'Periodo',
        periodo: data.periodo || data.label || 'Periodo',
        shortLabel: data.shortLabel,
        scope: data.scope || 'custom',
        causas: normalizeDemorasCausas(data.causas)
      };
    }
    return getActiveDemorasPeriodData() || {
      key: null,
      label: LOCAL_DEMORAS.periodo,
      periodo: LOCAL_DEMORAS.periodo,
      scope: 'fallback',
      causas: normalizeDemorasCausas(LOCAL_DEMORAS.causas)
    };
  }

  // Define global renderDemoras so other code can call it
  window.renderDemoras = function renderDemoras(data) {
    try {
      const demorasData = resolveDemorasDataset(data);
      const d = demorasData.causas || [];
      const tbody = document.getElementById('demoras-tbody');
      const tfoot = document.getElementById('demoras-tfoot');
      const title = document.getElementById('demoras-title');
      if (tbody) tbody.innerHTML = '';
      demorasStatsMap = Object.create(null);
      demorasPeriodo = demorasData.periodo || '';
      if (demorasData.key && demorasState.periods.some((period) => period.key === demorasData.key)) {
        demorasState.activeKey = demorasData.key;
      }
      const total = (d || []).reduce((acc, r) => acc + (Number(r.demoras || 0)), 0);
      if (title) { title.textContent = `Análisis de Demoras${demorasData.periodo ? ' · ' + demorasData.periodo : ''}`; }
      (d || []).forEach(r => {
        if (tbody) {
          const delays = Number(r.demoras || 0);
          const pct = ((delays / Math.max(1, total)) * 100).toFixed(1);
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${r.causa}</td><td>${r.demoras}</td><td>${pct}%</td>`;
          tr.tabIndex = 0;
          demorasStatsMap[normalizeCausaKey(r.causa)] = {
            demoras: delays,
            porcentaje: pct,
            detail: r
          };
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
        const values = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => parseFloat(tr.children[1]?.textContent || '0') || 0);
        const baseColors = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'];
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
        const preferred = d.find((item) => {
          const hasIncidentes = Array.isArray(item?.incidentes) && item.incidentes.some((value) => {
            if (typeof value === 'string') return value.trim().length > 0;
            return value !== null && value !== undefined;
          });
          const hasObservaciones = (Array.isArray(item?.observacionesList) && item.observacionesList.length > 0)
            || (typeof item?.observaciones === 'string' && item.observaciones.trim().length > 0);
          return hasIncidentes || hasObservaciones;
        }) || d[0];
        const autoCausa = preferred?.causa || d[0]?.causa || '';
        showDemorasDetail(autoCausa, { skipHintDismiss: true, isAuto: true });
      } else {
        showDemorasDetail('', { skipHintDismiss: true, isAuto: true });
      }

      syncDemorasActiveUI(demorasState.activeKey, demorasPeriodo || demorasData.label);

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

  function refreshDemorasView(dataset) {
    try {
      ensureDemorasState(dataset);
      renderDemorasPeriodControls();
      window.renderDemoras();
    } catch (error) {
      console.warn('No se pudo actualizar la vista de Demoras:', error);
    }
  }

  function safeRender() {
    loadDemorasData()
      .then((dataset) => refreshDemorasView(dataset))
      .catch((error) => {
        console.warn('demoras.json no disponible, usando datos locales.', error);
        refreshDemorasView();
      });
  }
  document.addEventListener('DOMContentLoaded', safeRender);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-section="demoras"]')) setTimeout(safeRender, 50); });
  // Nota: evitamos observar cambios en tbody para no provocar bucles de re-render.
})();
