// Atenciones Médicas AIFA 2022 (ECharts)
// Gráfica: Barras apiladas por tipo con etiquetas de valor y total; meses con etiqueta completa.
(function(){
  'use strict';

  const DATA = [
    { mes: 'ABRIL', aifa: 29, otra: 117, pasajeros: 36, visitantes: 36, total: 218 },
    { mes: 'MAYO', aifa: 34, otra: 106, pasajeros: 23, visitantes: 12, total: 175 },
    { mes: 'JUNIO', aifa: 68, otra: 82, pasajeros: 16, visitantes: 5, total: 171 },
    { mes: 'JULIO', aifa: 41, otra: 71, pasajeros: 20, visitantes: 7, total: 139 },
    { mes: 'AGOSTO', aifa: 39, otra: 80, pasajeros: 10, visitantes: 4, total: 133 },
    { mes: 'SEPTIEMBRE', aifa: 15, otra: 155, pasajeros: 85, visitantes: 0, total: 255 },
    { mes: 'OCTUBRE', aifa: 34, otra: 112, pasajeros: 77, visitantes: 9, total: 232 },
    { mes: 'NOVIEMBRE', aifa: 47, otra: 91, pasajeros: 63, visitantes: 8, total: 209 },
    { mes: 'DICIEMBRE', aifa: 66, otra: 95, pasajeros: 94, visitantes: 9, total: 264 },
  ];

  let chart = null;
  const state = { rendering: false, needs: false };

  function computeTotals(){ return DATA.map(d => Number(d.total) || 0); }
  function updateTopBadge(labels, totals){
    let topIdx = 0, topVal = -Infinity;
    totals.forEach((v,i)=>{ if (v>topVal) { topVal=v; topIdx=i; } });
    const topBadge = document.getElementById('medicas-top-badge');
    if (topBadge) topBadge.textContent = `Top mes: ${labels[topIdx]} (${topVal})`;
  }

  function buildOption(labels, totals, showPct, showAlways, titleText, subtitleText, layout){
    // Paleta corporativa sobria
    const COLORS = {
      aifa:       { top: '#34d399', bottom: '#0f766e' },  // emerald -> teal
      otra:       { top: '#a5b4fc', bottom: '#4f46e5' },  // indigo light -> indigo
      pasajeros:  { top: '#93c5fd', bottom: '#1d4ed8' },  // blue light -> blue
      visitantes: { top: '#cbd5e1', bottom: '#475569' }   // slate light -> slate
    };

    function grad(top, bottom){
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: top },
        { offset: 1, color: bottom }
      ]);
    }

    function tinted(bg, alpha){
      return `rgba(${parseInt(bg.slice(1,3),16)}, ${parseInt(bg.slice(3,5),16)}, ${parseInt(bg.slice(5,7),16)}, ${alpha})`;
    }

    const series = [
      { name: 'AIFA',        key: 'aifa',       data: DATA.map(d=>d.aifa),       itemStyle:{ color: grad(COLORS.aifa.top, COLORS.aifa.bottom), borderRadius: 2 } },
      { name: 'Otra Empresa', key: 'otra',       data: DATA.map(d=>d.otra),       itemStyle:{ color: grad(COLORS.otra.top, COLORS.otra.bottom), borderRadius: 2 } },
      { name: 'Pasajeros',    key: 'pasajeros',  data: DATA.map(d=>d.pasajeros),  itemStyle:{ color: grad(COLORS.pasajeros.top, COLORS.pasajeros.bottom), borderRadius: 2 } },
      { name: 'Visitantes',   key: 'visitantes', data: DATA.map(d=>d.visitantes), itemStyle:{ color: grad(COLORS.visitantes.top, COLORS.visitantes.bottom), borderRadius: 2 } }
    ].map(s => ({
      ...s,
      type: 'bar',
      stack: 'medicas',
      barMaxWidth: 36,
      barCategoryGap: '28%',
      emphasis: { focus: 'series', itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
      label: {
        show: !!showAlways,
        position: 'inside',
        color: '#0f172a',
        backgroundColor: tinted((s.key==='aifa'?COLORS.aifa.top:s.key==='otra'?COLORS.otra.top:s.key==='pasajeros'?COLORS.pasajeros.top:COLORS.visitantes.top), 0.22),
        borderRadius: 8,
        padding: [2,8],
        fontWeight: '700',
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowBlur: 2,
        textBorderColor: 'rgba(255,255,255,0.9)',
        textBorderWidth: 1,
        formatter: (p)=>{
          const val = Number(p.value||0);
          if (!val) return '';
          const idx = p.dataIndex;
          const pct = totals[idx] > 0 ? Math.round((val / totals[idx]) * 100) : 0;
          const num = val.toLocaleString('es-MX');
          if (showPct && pct >= 5) return `${num} (${pct}%)`;
          return `${num}`;
        }
      }
    }));

    // Serie de totales (invisible) para mostrar etiqueta encima (sticky-like)
    const totalSeries = {
      name: 'Total',
      type: 'bar',
      stack: 'totalOverlay',
      data: totals,
      barGap: '-100%',
      itemStyle: { color: 'transparent' },
      label: {
        show: true,
        position: 'top',
        distance: 12,
        fontWeight: '800',
        color: '#0f172a',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10,
        padding: [3,10],
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowBlur: 2,
        formatter: (p)=> (Number(p.value||0)).toLocaleString('es-MX')
      },
      tooltip: { show: false },
      emphasis: { disabled: true },
      z: 10
    };

    const palette = [COLORS.aifa.bottom, COLORS.otra.bottom, COLORS.pasajeros.bottom, COLORS.visitantes.bottom];
    const legendConfig = layout?.legend || { top: 34, type: 'scroll', itemGap: 20 };
    const gridTop = layout?.gridTop ?? 80;
    const gridBottom = layout?.gridBottom ?? 30;

    return {
      title: {
        text: titleText || 'Atenciones Médicas AIFA 2022',
        subtext: subtitleText || '',
        top: 6,
        left: 'center',
        textStyle: { fontWeight: 800, color: '#0f172a', fontSize: 16 },
        subtextStyle: { color: '#475569', fontSize: 11 }
      },
      color: palette,
      animationDuration: 900,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#0f172a',
        borderColor: '#0f172a',
        textStyle: { color: '#fff' },
        padding: 10
      },
      legend: { ...legendConfig, textStyle: { color: '#334155' } },
      grid: { left: 44, right: 28, top: gridTop, bottom: gridBottom },
      xAxis: { type: 'category', data: labels, axisTick: { alignWithLabel: true }, axisLabel: { color: '#475569' } },
      yAxis: { type: 'value', axisLabel: { color: '#475569' }, splitLine: { lineStyle: { color: 'rgba(15,23,42,0.07)' } } },
      series: [...series, totalSeries]
    };
  }

  function linearRegression(yValues){
    // Simple linear regression for equally spaced x (0..n-1)
    const n = yValues.length;
    const sumX = (n-1)*n/2;
    const sumY = yValues.reduce((a,b)=>a+b,0);
    const sumXY = yValues.reduce((acc, y, i)=> acc + i*y, 0);
    const sumXX = yValues.reduce((acc, _, i)=> acc + i*i, 0);
    const denom = n*sumXX - sumX*sumX || 1;
    const m = (n*sumXY - sumX*sumY) / denom;
    const b = (sumY - m*sumX) / n;
    return yValues.map((_, i)=> m*i + b);
  }

  function renderChart(){
    const el = document.getElementById('medicasChart');
    if (!el || !window.echarts) return;

    if (chart && typeof chart.dispose === 'function') {
      try { chart.dispose(); } catch(_) {}
      chart = null;
    }

  const labels = DATA.map(d => d.mes);
  const totals = computeTotals();

    chart = echarts.init(el, null, { renderer: 'canvas' });
    const showAlways = !!document.getElementById('medicasLabelsAlways')?.checked;
    const showPct = !!document.getElementById('medicasShowPct')?.checked;

    // Filtro por tipo
    const typeSelect = document.getElementById('medicasTipo');
    const selected = (typeSelect && typeSelect.value) || 'all';

    // Layout responsivo para legend/grid
    const w = el.clientWidth || window.innerWidth || 1200;
    const isMobile = w < 576;
    const isTablet = w >= 576 && w < 992;
    const layout = isMobile
      ? { legend: { type: 'scroll', bottom: 6, left: 'center', orient: 'horizontal', itemGap: 12, pageIconSize: 10 }, gridTop: 70, gridBottom: 72 }
      : isTablet
        ? { legend: { type: 'scroll', top: 36, left: 'center', orient: 'horizontal', itemGap: 18, pageIconSize: 10 }, gridTop: 88, gridBottom: 36 }
        : { legend: { type: 'scroll', top: 34, left: 'center', orient: 'horizontal', itemGap: 22, pageIconSize: 10 }, gridTop: 86, gridBottom: 30 };

    // Título/subtítulo según filtro
  const baseTitle = 'Atenciones Médicas AIFA 2022';
  let subTitle = '';
    let option = buildOption(labels, totals, showPct, showAlways, baseTitle, subTitle, layout);
  let badgeTotals = totals;

    if (selected !== 'all') {
      // Mostrar solo una barra por mes del tipo seleccionado + línea de tendencia
      const keyMap = { aifa: 'aifa', otra: 'otra', pasajeros: 'pasajeros', visitantes: 'visitantes' };
      const key = keyMap[selected] || 'aifa';
      const yVals = DATA.map(d => Number(d[key]) || 0);
  const trend = linearRegression(yVals);
  badgeTotals = yVals;

      const seriesName = option.series.find(s => s.key === key || (s.type==='bar' && s.name.toLowerCase().includes(key))).name;
      const colorIdx = ['aifa','otra','pasajeros','visitantes'].indexOf(key);
      const color = option.color?.[colorIdx] || '#1d4ed8';

      subTitle = `Tipo: ${seriesName}`;
      const shortName = seriesName; // already concise (e.g., "AIFA", "Pasajeros")
      option.series = [
        {
          name: shortName,
          type: 'bar',
          stack: 'one',
          data: yVals,
          barMaxWidth: 36,
          itemStyle: option.series[colorIdx]?.itemStyle || {},
          label: option.series[colorIdx]?.label || {
            show: !!showAlways,
            position: 'inside',
            color: '#0f172a',
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderRadius: 8,
            padding: [2,8],
            fontWeight: '700',
            shadowColor: 'rgba(0,0,0,0.12)',
            shadowBlur: 2,
            formatter: (p)=>{
              const val = Number(p.value||0);
              if (!val) return '';
              const num = val.toLocaleString('es-MX');
              const pct = Math.round((val/(Math.max(...yVals)||1))*100);
              return (showPct && pct >= 5) ? `${num} (${pct}%)` : `${num}`;
            }
          }
        },
        {
          name: 'Tendencia',
          type: 'line',
          data: trend,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 3, color },
          itemStyle: { color },
          yAxisIndex: 0
        }
      ];
      // Actualiza título con subtítulo en opción filtrada
      option.title = {
        text: baseTitle,
        subtext: subTitle,
        top: 6,
        left: 'center',
        textStyle: { fontWeight: 800, color: '#0f172a', fontSize: 16 },
        subtextStyle: { color: '#475569', fontSize: 11 }
      };
    }

  // Actualiza Top mes con el conjunto actualmente visible
  updateTopBadge(labels, badgeTotals);

  chart.setOption(option);

    // Responsive
    if (!el._resizeBound) {
      el._resizeBound = true;
      window.addEventListener('resize', ()=>{ chart && chart.resize(); });
    }
  }

  let resizeTimer = null;
  function safeRender(){
    if (state.rendering) { state.needs = true; return; }
    state.rendering = true;
    try { renderChart(); }
    finally {
      state.rendering = false;
      if (state.needs) { state.needs = false; setTimeout(safeRender, 0); }
    }
  }

  let wired = false;
  function init(){
    if (!wired) {
      wired = true;
      window.addEventListener('resize', ()=>{
        const active = document.getElementById('medicas-section')?.classList.contains('active');
        if (!active) return;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(()=> safeRender(), 140);
      });
      const sw = document.getElementById('medicasLabelsAlways');
      if (sw && !sw._medBound) { sw._medBound = true; sw.addEventListener('change', ()=> safeRender()); }
      const sp = document.getElementById('medicasShowPct');
      if (sp && !sp._medBound) { sp._medBound = true; sp.addEventListener('change', ()=> safeRender()); }
      const st = document.getElementById('medicasTipo');
      if (st && !st._medBound) { st._medBound = true; st.addEventListener('change', ()=> safeRender()); }
    }
    safeRender();
  }

  document.addEventListener('click', (e)=>{
    if (e.target.closest('[data-section="medicas"]')) setTimeout(()=>safeRender(), 60);
  });
  document.addEventListener('DOMContentLoaded', ()=>{ init(); });
})();
