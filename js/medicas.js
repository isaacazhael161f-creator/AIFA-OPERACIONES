'use strict';

(function(){
  const ATENCIONES_URL = 'data/atenciones_medicas.json';
  const TIPO_URL = 'data/tipo_atencion_medica.json';
  const COMP_URL = 'data/atenciones_medicas_año.json';
  const MONTH_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

  const ATENCIONES_KEYS = ['aifa', 'otra_empresa', 'pasajeros', 'visitantes'];
  const ATENCIONES_LABELS = {
    aifa: 'AIFA',
    otra_empresa: 'Otra Empresa',
    pasajeros: 'Pasajeros',
    visitantes: 'Visitantes'
  };
  const ATENCIONES_COLORS = {
    aifa: ['#34d399', '#0f766e'],
    otra_empresa: ['#a5b4fc', '#4f46e5'],
    pasajeros: ['#93c5fd', '#1d4ed8'],
    visitantes: ['#cbd5e1', '#475569']
  };
  const TIPO_COLORS = {
    traslado: ['#60a5fa', '#1d4ed8'],
    ambulatorio: ['#fbbf24', '#d97706']
  };
  const COMP_COLORS = ['#0284c7', '#ec4899', '#22c55e', '#f97316', '#8b5cf6', '#facc15'];

  let rawAtenciones = [];
  let rawTipo = [];
  let rawComp = [];
  const compByYear = new Map();
  let atencionesChart = null;
  let tipoChart = null;
  let compChart = null;
  let atencionesYear = 'all';
  let tipoYear = 'all';
  let compActiveYears = new Set();
  let pendingAtenciones = false;
  let pendingTipo = false;
  let pendingComp = false;
  let eventsBound = false;

  function parseValue(value){
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function createGradient(top, bottom){
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: top },
      { offset: 1, color: bottom }
    ]);
  }

  function formatLabel(item){
    return `${item.mes}\n${item.anio}`;
  }

  function sortRecords(list){
    return [...list].sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio;
      return MONTH_ORDER.indexOf(a.mes) - MONTH_ORDER.indexOf(b.mes);
    });
  }

  function uniqueYears(list){
    return Array.from(new Set(list.map((item) => item.anio))).sort((a, b) => a - b);
  }

  function populateYearOptions(selectId, years){
    const select = document.getElementById(selectId);
    if (!select || select.dataset.populated === 'true') return;
    const fragment = document.createDocumentFragment();
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = year;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
    select.dataset.populated = 'true';
  }

  function prepareCompIndex(){
    compByYear.clear();
    rawComp.forEach((item) => {
      const year = Number(item.anio);
      if (!Number.isFinite(year)) return;
      const value = parseValue(item.total);
      if (!compByYear.has(year)) {
        compByYear.set(year, {});
      }
      compByYear.get(year)[item.mes] = value;
    });
  }

  function getActiveCompYears(){
    return Array.from(compActiveYears)
      .map((year) => Number(year))
      .filter((year) => Number.isFinite(year))
      .sort((a, b) => a - b);
  }

  function populateCompYears(years){
    const container = document.getElementById('medicas-comp-years');
    if (!container) return;
    const sorted = [...years].sort((a, b) => a - b);
    container.innerHTML = '';

    sorted.forEach((year) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check form-check-inline m-0';

      const checkboxId = `medicas-comp-year-${year}`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'form-check-input';
      input.id = checkboxId;
      input.value = String(year);
      input.checked = true;

      const label = document.createElement('label');
      label.className = 'form-check-label small fw-semibold';
      label.htmlFor = checkboxId;
      label.textContent = year;

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });

    const syncActiveYears = () => {
      const inputs = container.querySelectorAll('input[type="checkbox"]');
      compActiveYears = new Set();
      inputs.forEach((input) => {
        if (input.checked) compActiveYears.add(input.value);
      });
      renderComp();
    };

    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', syncActiveYears);
    });

    const selectAllBtn = document.getElementById('medicas-comp-select-all');
    if (selectAllBtn && !selectAllBtn.dataset.bound){
      selectAllBtn.dataset.bound = 'true';
      selectAllBtn.addEventListener('click', () => {
        container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          input.checked = true;
        });
        syncActiveYears();
      });
    }

    const selectNoneBtn = document.getElementById('medicas-comp-select-none');
    if (selectNoneBtn && !selectNoneBtn.dataset.bound){
      selectNoneBtn.dataset.bound = 'true';
      selectNoneBtn.addEventListener('click', () => {
        container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          input.checked = false;
        });
        syncActiveYears();
      });
    }

    compActiveYears = new Set(sorted.map((year) => String(year)));
    syncActiveYears();
  }

  function buildAtencionesDataset(year){
    const filtered = rawAtenciones.filter((item) => year === 'all' ? true : item.anio === Number(year));
    return sortRecords(filtered).map((item) => {
      const aifa = parseValue(item.aifa);
      const otra = parseValue(item.otra_empresa);
      const pax = parseValue(item.pasajeros);
      const visitors = parseValue(item.visitantes);
      const providedTotal = parseValue(item.total);
      const fallbackTotal = [aifa, otra, pax, visitors].reduce((sum, val) => sum + (Number.isFinite(val) ? val : 0), 0);
      return {
        mes: item.mes,
        anio: item.anio,
        aifa,
        otra_empresa: otra,
        pasajeros: pax,
        visitantes: visitors,
        total: Number.isFinite(providedTotal) ? providedTotal : fallbackTotal
      };
    });
  }

  function updateAtencionesSummary(dataset){
    const summaryEl = document.getElementById('medicas-atenciones-resumen');
    if (!summaryEl) return;
    if (!dataset.length){
      summaryEl.textContent = 'Sin datos disponibles';
      return;
    }
    const total = dataset.reduce((sum, item) => sum + (item.total || 0), 0);
    const peak = dataset.reduce((acc, item) => {
      if ((item.total || 0) > acc.value){
        return { value: item.total || 0, label: `${item.mes} ${item.anio}` };
      }
      return acc;
    }, { value: -Infinity, label: '' });
    const totalText = total.toLocaleString('es-MX');
    if (peak.value > 0){
      summaryEl.textContent = `Total periodo: ${totalText} | Pico: ${peak.label} (${peak.value.toLocaleString('es-MX')})`;
    } else {
      summaryEl.textContent = `Total periodo: ${totalText}`;
    }
  }

  function buildAtencionesOption(dataset){
    const labels = dataset.map(formatLabel);
    const totals = dataset.map((item) => item.total || 0);
    const needsZoom = labels.length > 18;
    const zoomEnd = needsZoom ? Math.min(100, Math.round((18 / labels.length) * 100)) : 100;

    const series = ATENCIONES_KEYS.map((key) => {
      const [top, bottom] = ATENCIONES_COLORS[key];
      return {
        name: ATENCIONES_LABELS[key],
        type: 'bar',
        stack: 'atenciones',
        barGap: '12%',
        barCategoryGap: '32%',
        itemStyle: { color: createGradient(top, bottom), borderRadius: 2 },
        emphasis: { focus: 'series' },
        data: dataset.map((item) => {
          const value = item[key];
          return Number.isFinite(value) ? value : null;
        })
      };
    });

    series.push({
      name: 'Total',
      type: 'bar',
      stack: 'overlay',
      data: totals,
      barGap: '-100%',
      itemStyle: { color: 'transparent' },
      label: {
        show: true,
        position: 'top',
        distance: 10,
        fontWeight: 700,
        color: '#0f172a',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        padding: [3, 8],
        formatter: (params) => (Number(params.value) || 0).toLocaleString('es-MX')
      },
      tooltip: { show: false },
      emphasis: { disabled: true },
      z: 10
    });

    return {
      title: {
        text: 'Atenciones médicas en el AIFA',
        subtext: dataset.length ? (atencionesYear === 'all' ? 'Periodo 2022-2025' : `Año ${atencionesYear}`) : 'Sin registros',
        left: 'center',
        top: 6,
        itemGap: 4,
        textStyle: { fontWeight: 800, color: '#0f172a', fontSize: 18 },
        subtextStyle: { color: '#475569', fontSize: 12 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const header = `${params[0].axisValueLabel.replace('\n', ' ')}<br>`;
          const lines = params.filter((entry) => entry.seriesName !== 'Total').map((entry) => {
            const value = Number(entry.value);
            if (!Number.isFinite(value)) return '';
            return `${entry.marker} ${entry.seriesName}: ${value.toLocaleString('es-MX')}`;
          }).filter(Boolean);
          const total = totals[idx] || 0;
          lines.push(`<strong>Total: ${total.toLocaleString('es-MX')}</strong>`);
          return header + lines.join('<br>');
        }
      },
      legend: {
        top: needsZoom ? 54 : 40,
        left: 'center',
        itemGap: 20,
        textStyle: { color: '#334155' },
        selected: { Total: false }
      },
      grid: { left: 48, right: 24, top: needsZoom ? 94 : 80, bottom: needsZoom ? 70 : 40 },
      dataZoom: needsZoom ? [
        { type: 'slider', bottom: 16, height: 20, start: 0, end: zoomEnd },
        { type: 'inside', start: 0, end: zoomEnd }
      ] : [],
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { alignWithLabel: true },
        axisLabel: { interval: 0, color: '#475569' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#475569' },
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.08)' } }
      },
      series
    };
  }

  function ensureAtencionesChart(){
    const el = document.getElementById('medicasAtencionesChart');
    if (!el || !window.echarts) return null;
    if (!atencionesChart){
      atencionesChart = echarts.init(el, null, { renderer: 'canvas' });
    }
    return atencionesChart;
  }

  function renderAtenciones(){
    const pane = document.getElementById('medicas-atenciones-pane');
    if (!pane){
      pendingAtenciones = false;
      return;
    }
    if (!pane.classList.contains('active')){
      pendingAtenciones = true;
      return;
    }
    const dataset = buildAtencionesDataset(atencionesYear);
    updateAtencionesSummary(dataset);
    const instance = ensureAtencionesChart();
    if (!instance) return;
    const option = buildAtencionesOption(dataset);
    instance.setOption(option, true);
    instance.resize();
    pendingAtenciones = false;
  }

  function buildTipoDataset(year){
    const filtered = rawTipo.filter((item) => year === 'all' ? true : item.anio === Number(year));
    return sortRecords(filtered).map((item) => {
      const traslado = parseValue(item.traslado) ?? 0;
      const ambulatorio = parseValue(item.ambulatorio) ?? 0;
      const providedTotal = parseValue(item.total);
      const total = Number.isFinite(providedTotal) ? providedTotal : traslado + ambulatorio;
      const share = total > 0 ? (traslado / total) * 100 : null;
      return {
        mes: item.mes,
        anio: item.anio,
        traslado,
        ambulatorio,
        total,
        share
      };
    });
  }

  function updateTipoSummary(dataset){
    const summaryEl = document.getElementById('medicas-tipo-resumen');
    if (!summaryEl) return;
    if (!dataset.length){
      summaryEl.textContent = 'Sin datos disponibles';
      return;
    }
    const totals = dataset.reduce((acc, item) => {
      acc.traslado += item.traslado || 0;
      acc.ambulatorio += item.ambulatorio || 0;
      return acc;
    }, { traslado: 0, ambulatorio: 0 });
    const overall = totals.traslado + totals.ambulatorio;
    const share = overall > 0 ? (totals.traslado / overall) * 100 : 0;
    const hotspot = dataset.reduce((acc, item) => {
      if ((item.share || 0) > acc.value){
        return { value: item.share || 0, label: `${item.mes} ${item.anio}` };
      }
      return acc;
    }, { value: -1, label: '' });
    const trasladoText = totals.traslado.toLocaleString('es-MX');
    const ambulatorioText = totals.ambulatorio.toLocaleString('es-MX');
    const shareText = share.toFixed(1);
    if (hotspot.value >= 0){
      summaryEl.textContent = `Traslados: ${trasladoText} | Ambulatorios: ${ambulatorioText} | % traslados: ${shareText}% | Pico de proporción: ${hotspot.label} (${hotspot.value.toFixed(1)}%)`;
    } else {
      summaryEl.textContent = `Traslados: ${trasladoText} | Ambulatorios: ${ambulatorioText} | % traslados: ${shareText}%`;
    }
  }

  function buildTipoOption(dataset){
    const labels = dataset.map(formatLabel);
    const needsZoom = labels.length > 18;
    const zoomEnd = needsZoom ? Math.min(100, Math.round((18 / labels.length) * 100)) : 100;
    const shareByIndex = dataset.map((item) => item.share);

    return {
      title: {
        text: 'Tipo de atención médica',
        subtext: dataset.length ? (tipoYear === 'all' ? 'Periodo 2022-2025' : `Año ${tipoYear}`) : 'Sin registros',
        left: 'center',
        top: 6,
        itemGap: 4,
        textStyle: { fontWeight: 800, color: '#0f172a', fontSize: 18 },
        subtextStyle: { color: '#475569', fontSize: 12 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const idx = params[0].dataIndex;
          const header = `${params[0].axisValueLabel.replace('\n', ' ')}<br>`;
          const lines = params
            .filter((entry) => entry.seriesType === 'bar')
            .map((entry) => `${entry.marker} ${entry.seriesName}: ${(Number(entry.value) || 0).toLocaleString('es-MX')}`);
          const share = shareByIndex[idx];
          if (Number.isFinite(share)){
            lines.push(`<span style="display:inline-block;margin-right:4px;width:10px;height:10px;border-radius:50%;background:#2563eb;"></span>% Traslados: ${share.toFixed(1)}%`);
          }
          const total = (dataset[idx]?.total || 0).toLocaleString('es-MX');
          lines.push(`<strong>Total: ${total}</strong>`);
          return header + lines.join('<br>');
        }
      },
      legend: {
        top: needsZoom ? 54 : 40,
        left: 'center',
        itemGap: 20,
        textStyle: { color: '#334155' }
      },
      grid: { left: 52, right: 48, top: needsZoom ? 94 : 80, bottom: needsZoom ? 70 : 40 },
      dataZoom: needsZoom ? [
        { type: 'slider', bottom: 16, height: 20, start: 0, end: zoomEnd },
        { type: 'inside', start: 0, end: zoomEnd }
      ] : [],
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { alignWithLabel: true },
        axisLabel: { interval: 0, color: '#475569' }
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: '#475569' },
          splitLine: { lineStyle: { color: 'rgba(15,23,42,0.08)' } }
        },
        {
          type: 'value',
          axisLabel: { color: '#475569', formatter: '{value}%' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Traslado',
          type: 'bar',
          stack: 'total',
          barGap: '12%',
          barCategoryGap: '32%',
          itemStyle: { color: createGradient(TIPO_COLORS.traslado[0], TIPO_COLORS.traslado[1]), borderRadius: 2 },
          emphasis: { focus: 'series' },
          data: dataset.map((item) => Number.isFinite(item.traslado) ? item.traslado : null)
        },
        {
          name: 'Ambulatorio',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: createGradient(TIPO_COLORS.ambulatorio[0], TIPO_COLORS.ambulatorio[1]), borderRadius: 2 },
          emphasis: { focus: 'series' },
          data: dataset.map((item) => Number.isFinite(item.ambulatorio) ? item.ambulatorio : null)
        },
        {
          name: '% Traslado',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          data: shareByIndex.map((value) => Number.isFinite(value) ? Number(value.toFixed(2)) : null)
        }
      ]
    };
  }

  function updateCompSummary(activeYears){
    const summaryEl = document.getElementById('medicas-comp-resumen');
    if (!summaryEl) return;
    if (!activeYears.length){
      summaryEl.textContent = 'Selecciona al menos un año para comparar.';
      return;
    }

    let totalAccum = 0;
    let best = { value: Number.NEGATIVE_INFINITY, month: '', year: '' };

    activeYears.forEach((year) => {
      const yearData = compByYear.get(year);
      if (!yearData) return;
      MONTH_ORDER.forEach((month) => {
        const val = yearData[month];
        if (Number.isFinite(val)){
          totalAccum += val;
          if (val > best.value){
            best = { value: val, month, year };
          }
        }
      });
    });

    const totalText = totalAccum.toLocaleString('es-MX');
    if (Number.isFinite(best.value) && best.value >= 0){
      summaryEl.textContent = `Total comparado: ${totalText} | Pico: ${best.month} ${best.year} (${best.value.toLocaleString('es-MX')})`;
    } else {
      summaryEl.textContent = `Total comparado: ${totalText} | Sin registros destacados`;
    }
  }

  function buildCompOption(activeYears){
    const labels = [...MONTH_ORDER];
    const hasSelection = activeYears.length > 0;
    const series = hasSelection ? activeYears.map((year, index) => {
      const yearData = compByYear.get(year) || {};
      const data = labels.map((month) => {
        const value = yearData[month];
        if (Number.isFinite(value)) return value;
        return value === 0 ? 0 : null;
      });
      const color = COMP_COLORS[index % COMP_COLORS.length];
      return {
        name: String(year),
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color },
        itemStyle: { color },
        areaStyle: { opacity: 0.12, color },
        data
      };
    }) : [];

    return {
      title: {
        text: 'Atenciones médicas (comparación mensual)',
        subtext: hasSelection ? 'Totales mensuales por año' : 'Selecciona al menos un año',
        left: 'center',
        top: 6,
        itemGap: 4,
        textStyle: { fontWeight: 800, color: '#0f172a', fontSize: 18 },
        subtextStyle: { color: '#475569', fontSize: 12 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const month = params[0].axisValue || '';
          const header = `<strong>${month}</strong>`;
          const lines = params.map((entry) => {
            const value = Number(entry.value);
            if (Number.isFinite(value)){
              return `${entry.marker} ${entry.seriesName}: ${value.toLocaleString('es-MX')}`;
            }
            return `${entry.marker} ${entry.seriesName}: Sin dato`;
          });
          return `${header}<br>${lines.join('<br>')}`;
        }
      },
      legend: {
        top: 40,
        left: 'center',
        itemGap: 20,
        textStyle: { color: '#334155' },
        data: activeYears.map((year) => String(year))
      },
      grid: { left: 52, right: 28, top: 90, bottom: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { alignWithLabel: true },
        axisLabel: {
          interval: 0,
          color: '#475569',
          formatter: (value) => (value ? value.slice(0, 3) : value)
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#475569' },
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.08)' } }
      },
      series
    };
  }

  function ensureCompChart(){
    const el = document.getElementById('medicasCompChart');
    if (!el || !window.echarts) return null;
    if (!compChart){
      compChart = echarts.init(el, null, { renderer: 'canvas' });
    }
    return compChart;
  }

  function renderComp(){
    const pane = document.getElementById('medicas-comp-pane');
    if (!pane){
      pendingComp = false;
      return;
    }
    if (!pane.classList.contains('active')){
      pendingComp = true;
      return;
    }
    const activeYears = getActiveCompYears();
    updateCompSummary(activeYears);
    const instance = ensureCompChart();
    if (!instance) return;
    const option = buildCompOption(activeYears);
    instance.setOption(option, true);
    instance.resize();
    pendingComp = false;
  }

  function ensureTipoChart(){
    const el = document.getElementById('medicasTipoChart');
    if (!el || !window.echarts) return null;
    if (!tipoChart){
      tipoChart = echarts.init(el, null, { renderer: 'canvas' });
    }
    return tipoChart;
  }

  function renderTipo(){
    const pane = document.getElementById('medicas-tipo-pane');
    if (!pane){
      pendingTipo = false;
      return;
    }
    if (!pane.classList.contains('active')){
      pendingTipo = true;
      return;
    }
    const dataset = buildTipoDataset(tipoYear);
    updateTipoSummary(dataset);
    const instance = ensureTipoChart();
    if (!instance) return;
    const option = buildTipoOption(dataset);
    instance.setOption(option, true);
    instance.resize();
    pendingTipo = false;
  }

  async function loadJSON(url){
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload) ? payload.filter((item) => item && item.mes && item.anio) : [];
    } catch (error) {
      console.error(`No se pudo cargar ${url}`, error);
      return [];
    }
  }

  function bindEvents(){
    if (eventsBound) return;
    eventsBound = true;

    const atencionesSelect = document.getElementById('medicas-atenciones-year');
    if (atencionesSelect){
      atencionesSelect.addEventListener('change', (event) => {
        atencionesYear = event.target.value || 'all';
        renderAtenciones();
      });
    }

    const tipoSelect = document.getElementById('medicas-tipo-year');
    if (tipoSelect){
      tipoSelect.addEventListener('change', (event) => {
        tipoYear = event.target.value || 'all';
        renderTipo();
      });
    }

    const tabs = document.getElementById('medicasTabs');
    if (tabs){
      tabs.addEventListener('shown.bs.tab', (event) => {
        const targetId = event?.target?.id;
        if (targetId === 'medicas-atenciones-tab' || pendingAtenciones){
          setTimeout(() => renderAtenciones(), 60);
        }
        if (targetId === 'medicas-tipo-tab' || pendingTipo){
          setTimeout(() => renderTipo(), 60);
        }
        if (targetId === 'medicas-comp-tab' || pendingComp){
          setTimeout(() => renderComp(), 60);
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-section="medicas"]')){
        setTimeout(() => {
          if (pendingAtenciones) renderAtenciones();
          if (pendingTipo) renderTipo();
          if (pendingComp) renderComp();
        }, 120);
      }
    });

    window.addEventListener('resize', () => {
      if (atencionesChart && document.getElementById('medicas-atenciones-pane')?.classList.contains('active')){
        atencionesChart.resize();
      }
      if (tipoChart && document.getElementById('medicas-tipo-pane')?.classList.contains('active')){
        tipoChart.resize();
      }
      if (compChart && document.getElementById('medicas-comp-pane')?.classList.contains('active')){
        compChart.resize();
      }
    });
  }

  async function init(){
    const [atencionesData, tipoData, compData] = await Promise.all([
      loadJSON(ATENCIONES_URL),
      loadJSON(TIPO_URL),
      loadJSON(COMP_URL)
    ]);

    rawAtenciones = atencionesData;
    rawTipo = tipoData;
    rawComp = compData;

    populateYearOptions('medicas-atenciones-year', uniqueYears(rawAtenciones));
    populateYearOptions('medicas-tipo-year', uniqueYears(rawTipo));

    prepareCompIndex();
    compActiveYears = new Set();
    if (rawComp.length){
      populateCompYears(uniqueYears(rawComp));
    } else {
      const summaryEl = document.getElementById('medicas-comp-resumen');
      if (summaryEl) summaryEl.textContent = 'Sin datos disponibles para comparar.';
    }

    bindEvents();
    renderAtenciones();
    renderTipo();
  }

  document.addEventListener('DOMContentLoaded', () => { init(); });
})();
