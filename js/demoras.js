; (function () {
  const sec = document.getElementById('demoras-section');
  if (!sec) return;

  const DEMORAS_MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const DEMORAS_MONTH_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const demorasState = {
    initialized: false,
    periods: [],
    activeKey: null,
    navYear: null
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

    // When forcing, clear cache and pending promise so fresh data is fetched
    if (force) { demorasDataCache = null; demorasDataPromise = null; }

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

  function buildDemorasAnnualPeriod(periods, dataset, targetYear) {
    if (!Array.isArray(periods) || !periods.length) return null;
    // Filter to the target year if provided
    const filtered = targetYear
      ? periods.filter((p) => String(p.year) === String(targetYear))
      : periods;
    if (!filtered.length) return null;
    const totals = new Map();
    filtered.forEach((period) => {
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
    const inferredYear = targetYear || dataset?.year || filtered.find((p) => p.year)?.year || '';
    const label = inferredYear ? `Año ${inferredYear}` : 'Año completo';
    return {
      key: inferredYear ? `annual-${inferredYear}` : 'annual-total',
      label,
      periodo: label,
      shortLabel: inferredYear ? `Año ${inferredYear}` : 'Año',
      scope: 'annual',
      year: inferredYear,
      causas,
      sortOrder: inferredYear ? (Number(inferredYear) * 100 + 99) : Number.MAX_SAFE_INTEGER
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
    // Build one annual period per distinct year so years don't get mixed
    const monthlyPeriods = normalized.filter((p) => p.scope !== 'annual');
    const distinctYears = [...new Set(monthlyPeriods.map((p) => p.year).filter(Boolean))];
    distinctYears.sort((a, b) => Number(b) - Number(a)); // descending: 2026, 2025, ...
    const annualPeriods = distinctYears
      .map((yr) => buildDemorasAnnualPeriod(monthlyPeriods, safeDataset, yr))
      .filter(Boolean);
    // Fallback: if no year info, build a single combined annual as before
    if (!annualPeriods.length) {
      const annual = buildDemorasAnnualPeriod(monthlyPeriods, safeDataset);
      return annual ? [annual, ...normalized] : normalized;
    }
    return [...annualPeriods, ...normalized];
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

    const annualByYear = {};
    const monthsByYear = {};
    demorasState.periods.forEach((period) => {
      const yr = String(period.year || 'Sin año');
      if (period.scope === 'annual') {
        annualByYear[yr] = period;
      } else {
        if (!monthsByYear[yr]) monthsByYear[yr] = [];
        monthsByYear[yr].push(period);
      }
    });

    const allYears = [...new Set([
      ...Object.keys(annualByYear),
      ...Object.keys(monthsByYear)
    ])].sort((a, b) => Number(b) - Number(a));

    if (!allYears.length) {
      container.classList.add('d-none');
      return;
    }

    const activePeriod = demorasState.periods.find((period) => period.key === demorasState.activeKey) || null;
    const activeYear = String(activePeriod?.year || '');
    if (!demorasState.navYear || !allYears.includes(String(demorasState.navYear))) {
      demorasState.navYear = allYears.includes(activeYear) ? activeYear : allYears[0];
    }

    const navYear = String(demorasState.navYear);
    const yearMonths = (monthsByYear[navYear] || []).slice().sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const yearAnnual = annualByYear[navYear] || null;

    const periodsForYear = [];
    if (yearAnnual) periodsForYear.push(yearAnnual);
    periodsForYear.push(...yearMonths);

    const firstEnabledPeriod = periodsForYear.find((p) => !shouldDisablePeriod(p)) || periodsForYear[0] || null;
    const activeInYear = periodsForYear.some((p) => p.key === demorasState.activeKey);
    const selectedPeriodKey = activeInYear
      ? demorasState.activeKey
      : (firstEnabledPeriod?.key || periodsForYear[0]?.key || '');

    const shell = document.createElement('div');
    shell.className = 'dem-combo-shell';

    const comboRow = document.createElement('div');
    comboRow.className = 'dem-combo-row';

    const yearField = document.createElement('label');
    yearField.className = 'dem-combo-field';
    yearField.innerHTML = '<span class="dem-combo-caption"><i class="fas fa-calendar-alt me-1" aria-hidden="true"></i>Año</span>';
    const yearSelect = document.createElement('select');
    yearSelect.className = 'dem-combo-select';
    yearSelect.dataset.role = 'dem-year-select';
    allYears.forEach((yr) => {
      const opt = document.createElement('option');
      opt.value = String(yr);
      opt.textContent = String(yr);
      if (String(yr) === navYear) opt.selected = true;
      yearSelect.appendChild(opt);
    });
    yearField.appendChild(yearSelect);

    const periodField = document.createElement('label');
    periodField.className = 'dem-combo-field dem-combo-field-period';
    periodField.innerHTML = '<span class="dem-combo-caption"><i class="fas fa-clock me-1" aria-hidden="true"></i>Periodo</span>';
    const periodSelect = document.createElement('select');
    periodSelect.className = 'dem-combo-select';
    periodSelect.dataset.role = 'dem-period-select';

    periodsForYear.forEach((period) => {
      const opt = document.createElement('option');
      const isAnnual = period.scope === 'annual';
      const disabled = shouldDisablePeriod(period);
      opt.value = period.key;
      opt.disabled = disabled;
      opt.textContent = isAnnual
        ? `Año ${navYear}`
        : (period.periodo || period.label || period.shortLabel || 'Periodo');
      opt.title = period.periodo || period.label || 'Periodo de demoras';
      if (period.key === selectedPeriodKey) opt.selected = true;
      periodSelect.appendChild(opt);
    });

    periodField.appendChild(periodSelect);
    comboRow.appendChild(yearField);
    comboRow.appendChild(periodField);
    shell.appendChild(comboRow);
    container.appendChild(shell);

    if (!container._wired) {
      container.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement)) return;

        if (target.dataset.role === 'dem-year-select') {
          const yr = String(target.value || '').trim();
          if (!yr || yr === String(demorasState.navYear || '')) return;
          demorasState.navYear = yr;

          const annual = annualByYear[yr] || null;
          const months = (monthsByYear[yr] || []).slice().sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
          const list = [];
          if (annual) list.push(annual);
          list.push(...months);
          const firstEnabled = list.find((p) => !shouldDisablePeriod(p)) || list[0] || null;
          if (firstEnabled && firstEnabled.key !== demorasState.activeKey) {
            demorasState.activeKey = firstEnabled.key;
            renderDemorasPeriodControls();
            window.renderDemoras(firstEnabled);
            return;
          }
          renderDemorasPeriodControls();
          return;
        }

        if (target.dataset.role !== 'dem-period-select') return;
        const key = String(target.value || '').trim();
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
    if (target.year) demorasState.navYear = String(target.year);
    demorasState.activeKey = key;
    renderDemorasPeriodControls();
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
  const DEMORAS_COLOR_MAP = {
    'repercusión': '#2563eb',
    'compañía': '#7c3aed',
    'meteorología': '#06b6d4',
    'evento circunstancial': '#f97316',
    'autoridad': '#ef4444',
    'aeropuerto': '#f59e0b',
    'combustible': '#10b981'
  };
  const DEMORAS_FALLBACK_COLORS = ['#2563eb', '#7c3aed', '#06b6d4', '#f97316', '#ef4444', '#f59e0b', '#10b981', '#0f766e', '#64748b'];

  let demorasStatsMap = {};
  let demorasPeriodo = '';
  let demorasViewMeta = null;

  function formatDemorasNumber(value) {
    return new Intl.NumberFormat('es-MX').format(Number(value) || 0);
  }

  function getDemorasPalette(data = []) {
    return data.map((item, idx) => {
      const key = normalizeCausaKey(item?.causa);
      return DEMORAS_COLOR_MAP[key] || DEMORAS_FALLBACK_COLORS[idx % DEMORAS_FALLBACK_COLORS.length];
    });
  }

  function buildDemorasViewMeta(demorasData, total, causeCount) {
    const scope = demorasData?.scope || 'monthly';
    const year = demorasData?.year || extractYearFromString(demorasData?.periodo || demorasData?.label || '') || '';
    const monthlyPeriods = demorasState.periods.filter((period) => period.scope !== 'annual' && String(period.year || '') === String(year || ''));
    const monthlyCount = monthlyPeriods.length;
    const isAnnual = scope === 'annual';
    const isCurrent = scope === 'current';

    if (isAnnual) {
      return {
        scope: 'annual',
        scopeLabel: 'Vista acumulada anual',
        scopeChip: 'Acumulado anual',
        titleSuffix: year ? `Acumulado anual ${year}` : 'Acumulado anual',
        periodLabel: demorasData?.periodo || (year ? `Año ${year}` : 'Año completo'),
        note: monthlyCount
          ? `Integra ${monthlyCount} ${monthlyCount === 1 ? 'mes registrado' : 'meses registrados'} del ${year}.`
          : 'Consolida toda la informacion disponible del año seleccionado.',
        tableTitle: 'Demoras acumuladas en vuelos de salida',
        chartTitle: 'Distribucion acumulada anual de demoras',
        metricChip: `${formatDemorasNumber(total)} demoras acumuladas`,
        causeChip: `${causeCount} causas con participacion`
      };
    }

    return {
      scope: isCurrent ? 'current' : 'monthly',
      scopeLabel: isCurrent ? 'Corte operativo del periodo' : 'Vista mensual',
      scopeChip: isCurrent ? 'Corte del periodo' : 'Mensual',
      titleSuffix: demorasData?.periodo || 'Vista mensual',
      periodLabel: demorasData?.periodo || demorasData?.label || 'Periodo mensual',
      note: year
        ? `Corresponde a un periodo puntual dentro de ${year}; usalo para comparar el comportamiento mes contra mes.`
        : 'Corresponde a un periodo puntual; usalo para comparar variaciones en el tiempo.',
      tableTitle: 'Demoras mensuales en vuelos de salida',
      chartTitle: 'Distribucion mensual de demoras',
      metricChip: `${formatDemorasNumber(total)} demoras del periodo`,
      causeChip: `${causeCount} causas activas`
    };
  }

  function updateDemorasPeriodSummary(meta) {
    const summary = document.querySelector('#demoras-section .demoras-period-summary');
    const captionEl = document.querySelector('#demoras-section .demoras-period-caption');
    const valueEl = document.getElementById('demoras-period-active-label');
    if (captionEl) {
      captionEl.textContent = meta?.scope === 'annual' ? 'Vista acumulada' : 'Periodo seleccionado';
    }
    if (valueEl) {
      valueEl.textContent = meta?.periodLabel || 'Selecciona un periodo';
    }
    if (!summary) return;

    let metaEl = document.getElementById('demoras-period-meta');
    if (!metaEl) {
      metaEl = document.createElement('div');
      metaEl.id = 'demoras-period-meta';
      metaEl.className = 'demoras-period-meta';
      summary.appendChild(metaEl);
    }
    if (!meta) {
      metaEl.innerHTML = '';
      return;
    }

    metaEl.innerHTML = `
      <span class="demoras-period-badge ${meta.scope === 'annual' ? 'is-annual' : 'is-monthly'}">${meta.scopeLabel}</span>
      <span class="demoras-period-chip">${meta.metricChip}</span>
      <span class="demoras-period-chip">${meta.causeChip}</span>
      <span class="demoras-period-note">${meta.note}</span>`;
  }

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
    const cx = Math.floor(w * 0.5), cy = Math.floor(h * 0.56);
    const r = Math.max(56, Math.min(w, h) * 0.36);
    const innerR = Math.max(28, r * 0.54);
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
        const lx = cx + (r * 0.72) * Math.cos(mid);
        const ly = cy + (r * 0.72) * Math.sin(mid);
        const pct = Math.round(frac * 100) + '%';
        g.fillStyle = '#ffffff';
        g.font = '700 12px Poppins, Nunito Sans, Arial';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(pct, lx, ly);
      }
      slices.push({ start, end, label: labels[i] || '', value: v, index: i });
      start = end;
    }

    // Centro tipo dona para reforzar lectura del total
    const dark = document.body.classList.contains('dark-mode');
    g.beginPath();
    g.arc(cx, cy, innerR, 0, Math.PI * 2);
    g.fillStyle = dark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(248, 250, 252, 0.98)';
    g.fill();
    g.strokeStyle = dark ? 'rgba(96, 165, 250, 0.28)' : 'rgba(37, 99, 235, 0.22)';
    g.lineWidth = 1.5;
    g.stroke();

    g.fillStyle = dark ? '#e2e8f0' : '#0f2d57';
    g.font = '800 16px Poppins, Nunito Sans, Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(formatDemorasNumber(total), cx, cy - 7);
    g.fillStyle = dark ? '#93c5fd' : '#2563eb';
    g.font = '600 11px Poppins, Nunito Sans, Arial';
    g.fillText('demoras', cx, cy + 11);

    if (typeof onSliceClick === 'function') {
      const triggerSlice = (label) => {
        if (typeof onSliceClick === 'function') onSliceClick(label);
      };
      canvas.classList.add('demoras-hover');
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${title || 'Distribución de demoras'}: selecciona una causa con click o teclado.`);
      canvas.setAttribute('title', 'Haz click o usa las flechas y Enter para explorar las causas');
      canvas.onclick = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
        const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
        const nx = x / (canvas.width / (canvas.clientWidth || 1));
        const ny = y / (canvas.height / (canvas.clientHeight || 1));
        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r || dist < innerR) return;
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
      const pctNumber = Math.max(0, Math.min(100, Number(pct) || 0));
      const swatchColor = colors[idx % colors.length];
      const node = document.createElement('div');
      node.className = 'demoras-legend-item';
      node.innerHTML = `
        <span class="demoras-legend-rank">#${idx + 1}</span>
        <span class="demoras-legend-swatch" style="background:${swatchColor};"></span>
        <span class="demoras-legend-text">
          <strong>${item.causa}</strong>
          <span>${formatDemorasNumber(item.demoras)} demoras · ${pct}%</span>
          <span class="demoras-legend-bar"><span style="width:${pctNumber}%; background:${swatchColor};"></span></span>
        </span>
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
      descEl.textContent = hasCausa ? 'Motivo no documentado. Puedes actualizarlo más tarde.' : 'Haz click en cualquier causa para ver el detalle.';
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
          chips.push({
            icon: demorasViewMeta?.scope === 'annual' ? 'fa-layer-group' : 'fa-calendar-alt',
            text: demorasViewMeta?.scopeChip ? `${demorasViewMeta.scopeChip} · ${demorasPeriodo}` : `Periodo ${demorasPeriodo}`
          });
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
        year: data.year,
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
      const tableTitle = document.getElementById('demoras-table-title');
      if (tbody) tbody.innerHTML = '';
      demorasStatsMap = Object.create(null);
      demorasPeriodo = demorasData.periodo || '';
      if (demorasData.key && demorasState.periods.some((period) => period.key === demorasData.key)) {
        demorasState.activeKey = demorasData.key;
      }
      const total = (d || []).reduce((acc, r) => acc + (Number(r.demoras || 0)), 0);
      demorasViewMeta = buildDemorasViewMeta(demorasData, total, d.length);
      const sectionEl = document.getElementById('demoras-section');
      if (sectionEl) {
        sectionEl.dataset.demorasScope = demorasViewMeta?.scope || 'monthly';
        sectionEl.dataset.demorasYear = demorasData?.year ? String(demorasData.year) : '';
      }
      if (title) { title.textContent = `Análisis de Demoras${demorasViewMeta?.titleSuffix ? ' · ' + demorasViewMeta.titleSuffix : ''}`; }
      if (tableTitle) {
        tableTitle.textContent = demorasViewMeta?.tableTitle || 'Demoras en vuelos de salida';
      }
      (d || []).forEach((r, idx) => {
        if (tbody) {
          const delays = Number(r.demoras || 0);
          const pct = ((delays / Math.max(1, total)) * 100).toFixed(1);
          const tr = document.createElement('tr');
          if (idx === 0) tr.classList.add('is-top-cause');
          tr.innerHTML = `<td>${r.causa}</td><td>${formatDemorasNumber(r.demoras)}</td><td>${pct}%</td>`;
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
      if (tfoot) tfoot.innerHTML = `<tr class="table-light"><th>Total</th><th>${formatDemorasNumber(total)}</th><th>100%</th></tr>`;
      // Pastel (canvas)
      const pie = document.getElementById('delaysPieChart');
      if (pie) {
        const labels = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => tr.children[0]?.textContent || '');
        const values = Array.from(document.querySelectorAll('#demoras-tbody tr')).map(tr => parseFloat((tr.children[1]?.textContent || '0').toString().replace(/,/g, '')) || 0);
        const baseColors = getDemorasPalette(d);
        const onSliceSelect = (label) => showDemorasDetail(label, { fromChart: true });
        drawPie(pie, labels, values, baseColors, demorasViewMeta?.chartTitle || 'Demoras en vuelos de salida', onSliceSelect);
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
      updateDemorasPeriodSummary(demorasViewMeta);

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

  function safeRender(force = false) {
    loadDemorasData(force)
      .then((dataset) => refreshDemorasView(dataset))
      .catch((error) => {
        console.warn('demoras.json no disponible, usando datos locales.', error);
        refreshDemorasView();
      });
  }
  document.addEventListener('DOMContentLoaded', () => safeRender(false));
  // Al hacer click en el menú de Demoras, forzar re-fetch para que siempre muestre datos frescos
  document.addEventListener('click', (e) => { if (e.target.closest('[data-section="demoras"]')) setTimeout(() => safeRender(true), 50); });
  // Nota: evitamos observar cambios en tbody para no provocar bucles de re-render.
})();
