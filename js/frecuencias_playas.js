/**
 * frecuencias_playas.js
 * Muestra un resumen de frecuencias semanales hacia destinos de playa
 * (nacionales e internacionales) en la sección Frecuencias Semanales.
 */
(function () {
    const PANE_ID = 'frecuencias-playas-pane';
    const TAB_ID  = 'frecuencias-playas-tab';

    // ── Destinos playa nacionales (IATA) ──────────────────────────────────
    const BEACH_NAC = new Set([
        'CUN', 'PVR', 'SJD', 'ACA', 'MZT', 'HUX',
        'ZIH', 'ZLO', 'CZM', 'LTO', 'LAP', 'CTM', 'TQO', 'PXM'
    ]);

    // ── Destinos playa internacionales (IATA) ─────────────────────────────
    const BEACH_INT = new Set([
        'PUJ', 'HAV', 'SJU', 'BGI', 'HNL', 'KIN',
        'LIR', 'MBJ', 'NAS', 'FPO', 'SDQ', 'CZM', 'MIA'
    ]);

    // Nombres de display con tilde
    const CITY_NAMES = {
        CUN: 'Cancún',       PVR: 'Puerto Vallarta', SJD: 'Los Cabos',
        ACA: 'Acapulco',     MZT: 'Mazatlán',        HUX: 'Huatulco',
        ZIH: 'Zihuatanejo',  ZLO: 'Manzanillo',      CZM: 'Cozumel',
        LTO: 'Loreto',       LAP: 'La Paz',           CTM: 'Chetumal',
        TQO: 'Tulum',        PXM: 'Puerto Escondido',
        PUJ: 'Punta Cana',   HAV: 'La Habana',        SJU: 'San Juan',
        BGI: 'Barbados',     HNL: 'Honolulú',         KIN: 'Kingston',
        LIR: 'Liberia',      MBJ: 'Montego Bay',      NAS: 'Nassau',
        FPO: 'Freeport',     SDQ: 'Santo Domingo',    MIA: 'Miami'
    };

    // Colores de aerolínea (slug → color)
    const AIRLINE_COLORS = {
        'aeromexico': '#0b2161',  'aeromexico-connect': '#0b2161',
        'volaris': '#a300e6',     'viva-aerobus': '#00a850',
        'viva': '#00a850',        'mexicana': '#008375',
        'copa-airlines': '#00529b', 'copa': '#00529b',
        'arajet': '#632683',      'magnicharters': '#1d3c6e',
        'default': '#6c757d'
    };

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

    let _loaded = false;
    let _allData = [];   // merged rows from nac + int

    // ── Slugify helper ────────────────────────────────────────────────────
    function slugify(str) {
        return (str || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function airlineColor(airline) {
        const slug = slugify(airline);
        for (const key of Object.keys(AIRLINE_COLORS)) {
            if (slug.includes(key)) return AIRLINE_COLORS[key];
        }
        return AIRLINE_COLORS.default;
    }

    // ── DOM helpers ───────────────────────────────────────────────────────
    const el = id => document.getElementById(id);

    function showLoading(show) {
        const loading = el('playas-loading');
        const content = el('playas-content');
        if (!loading || !content) return;
        loading.classList.toggle('d-none', !show);
        content.classList.toggle('d-none', show);
    }

    function showError(msg) {
        const div = el('playas-error');
        if (!div) return;
        div.textContent = msg;
        div.classList.remove('d-none');
        el('playas-loading')?.classList.add('d-none');
    }

    // ── Load & render ─────────────────────────────────────────────────────
    async function load() {
        if (!window.dataManager) {
            showError('Servicio de datos no disponible. Recarga la página.');
            return;
        }
        try {
            const [nacRows, intRows] = await Promise.all([
                window.dataManager.getWeeklyFrequencies(),
                window.dataManager.getWeeklyFrequenciesInt()
            ]);

            // Tag type and filter to beach destinations
            const nac = (nacRows || [])
                .filter(r => r.iata && BEACH_NAC.has(r.iata.toUpperCase()))
                .map(r => ({ ...r, _tipo: 'Nacional' }));

            const int_ = (intRows || [])
                .filter(r => r.iata && BEACH_INT.has(r.iata.toUpperCase()))
                .map(r => ({ ...r, _tipo: 'Internacional' }));

            _allData = [...nac, ...int_];
            _loaded = true;
            render(_allData);
        } catch (err) {
            console.error('frecuencias_playas error:', err);
            showError('Error al cargar los datos. Verifica la conexión.');
        }
    }

    function render(data) {
        // Apply tipo filter
        const tipoSel = (el('playas-filter-tipo')?.value || '').trim();
        const filtered = tipoSel ? data.filter(r => r._tipo === tipoSel) : data;

        // Sort: Nacional first, then by city name
        filtered.sort((a, b) => {
            if (a._tipo !== b._tipo) return a._tipo === 'Nacional' ? -1 : 1;
            const cityA = CITY_NAMES[a.iata] || a.city || a.iata || '';
            const cityB = CITY_NAMES[b.iata] || b.city || b.iata || '';
            return cityA.localeCompare(cityB, 'es');
        });

        renderCards(filtered);
        renderTable(filtered);
        showLoading(false);
    }

    function renderCards(data) {
        const container = el('playas-cards');
        if (!container) return;
        container.innerHTML = '';

        // Aggregate by destination
        const byDest = {};
        data.forEach(r => {
            const key = r.iata || r.city;
            if (!byDest[key]) {
                byDest[key] = {
                    iata: r.iata,
                    city: CITY_NAMES[r.iata] || r.city || r.iata,
                    tipo: r._tipo,
                    total: 0,
                    airlines: new Set()
                };
            }
            byDest[key].total += Number(r.weekly_total) || 0;
            if (r.airline) byDest[key].airlines.add(r.airline);
        });

        const sorted = Object.values(byDest).sort((a, b) => {
            if (a.tipo !== b.tipo) return a.tipo === 'Nacional' ? -1 : 1;
            return a.city.localeCompare(b.city, 'es');
        });

        if (sorted.length === 0) {
            container.innerHTML = '<div class="col-12 text-muted small py-2"><i class="fas fa-info-circle me-1"></i>Sin destinos de playa disponibles.</div>';
            return;
        }

        sorted.forEach(dest => {
            const isNac = dest.tipo === 'Nacional';
            const accent = isNac ? '#dc3545' : '#0d6efd';
            const badgeCls = isNac ? 'bg-danger' : 'bg-primary';
            const airlines = [...dest.airlines].join(' · ') || '—';

            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = `
                <div class="card h-100 border-0 shadow-sm" style="border-top:3px solid ${accent};">
                    <div class="card-body p-2 p-md-3">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <span class="badge ${badgeCls} text-white" style="font-size:.65rem;">${dest.tipo}</span>
                            <span class="text-muted fw-bold" style="font-size:.7rem;">${dest.iata || ''}</span>
                        </div>
                        <div class="fw-bold mb-1" style="font-size:.9rem;line-height:1.2;">${dest.city}</div>
                        <div class="d-flex align-items-baseline gap-1 mb-1">
                            <span class="fw-bold fs-5" style="color:${accent};">${dest.total}</span>
                            <span class="text-muted small">frec/sem</span>
                        </div>
                        <div class="text-muted" style="font-size:.68rem;line-height:1.3;">${airlines}</div>
                    </div>
                </div>`;
            container.appendChild(col);
        });
    }

    function renderTable(data) {
        const tbody = el('playas-tbody');
        const badge = el('playas-total-badge');
        if (!tbody) return;

        tbody.innerHTML = '';
        const totalFreq = data.reduce((s, r) => s + (Number(r.weekly_total) || 0), 0);
        if (badge) badge.textContent = `${data.length} registros · ${totalFreq} frecuencias`;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted py-4"><i class="fas fa-umbrella-beach me-2"></i>Sin frecuencias de playa para mostrar.</td></tr>';
            return;
        }

        data.forEach(item => {
            const color = item.color || airlineColor(item.airline || '');
            const textColor = '#ffffff';
            const isNac = item._tipo === 'Nacional';
            const city = CITY_NAMES[item.iata] || item.city || item.iata || '—';

            const tr = document.createElement('tr');

            // Destino
            const tdDest = document.createElement('td');
            tdDest.style.verticalAlign = 'middle';
            tdDest.innerHTML = `<div class="fw-semibold">${city}</div><small class="text-muted">${item.iata || ''}</small>`;
            tr.appendChild(tdDest);

            // Tipo
            const tdTipo = document.createElement('td');
            tdTipo.className = 'text-center';
            tdTipo.style.verticalAlign = 'middle';
            tdTipo.innerHTML = isNac
                ? '<span class="badge bg-danger" style="font-size:.68rem;">Nacional</span>'
                : '<span class="badge bg-primary" style="font-size:.68rem;">Internacional</span>';
            tr.appendChild(tdTipo);

            // Aerolínea
            const tdAl = document.createElement('td');
            tdAl.style.backgroundColor = '#fff';
            tdAl.style.borderLeft = `5px solid ${color}`;
            tdAl.style.color = color;
            tdAl.style.verticalAlign = 'middle';
            tdAl.className = 'text-center fw-semibold';
            if (item.logo) {
                tdAl.innerHTML = `<img src="images/airlines/${item.logo}" alt="${item.airline}" title="${item.airline}" style="height:22px;max-width:90px;object-fit:contain;">`;
            } else {
                tdAl.textContent = item.airline || '—';
                tdAl.style.fontSize = '0.82rem';
            }
            tr.appendChild(tdAl);

            // Días L–D
            DAYS.forEach(day => {
                const td = document.createElement('td');
                td.className = 'text-center border-start';
                td.style.backgroundColor = color;
                td.style.color = textColor;
                td.style.verticalAlign = 'middle';
                td.style.fontSize = '0.85rem';
                const v = item[day] || 0;
                td.textContent = v > 0 ? v : '–';
                tr.appendChild(td);
            });

            // Total
            const tdTot = document.createElement('td');
            tdTot.className = 'text-center fw-bold border-start';
            tdTot.style.backgroundColor = color;
            tdTot.style.color = textColor;
            tdTot.style.verticalAlign = 'middle';
            tdTot.textContent = item.weekly_total || 0;
            tr.appendChild(tdTot);

            tbody.appendChild(tr);
        });
    }

    // ── Wire events ───────────────────────────────────────────────────────
    function wireEvents() {
        // Re-render on filter change
        const tipoSel = el('playas-filter-tipo');
        if (tipoSel) {
            tipoSel.addEventListener('change', () => {
                if (_loaded) render(_allData);
            });
        }

        // Load when tab becomes visible
        document.addEventListener('shown.bs.tab', evt => {
            if (evt.target && evt.target.id === TAB_ID) {
                if (!_loaded) {
                    load();
                }
            }
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────
    function init() {
        const pane = el(PANE_ID);
        if (!pane) return;
        wireEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
