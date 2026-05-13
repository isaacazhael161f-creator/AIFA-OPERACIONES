/**
 * frecuencias-estadisticas.js
 * Estadística de Frecuencias Semanales — AIFA
 * Procesa y visualiza datos de las 3 tablas: weekly_frequencies (nacional),
 * weekly_frequencies_int (internacional) y weekly_frequencies_cargo (carga).
 */

'use strict';

const FreqStats = (() => {

    // ─── Chart instances ────────────────────────────────────────────────────
    let chartTrend    = null;
    let chartAirlines = null;
    let chartDays     = null;
    let chartRadar    = null;

    // ─── Raw data cache ─────────────────────────────────────────────────────
    let _raw = { nac: [], int: [], carga: [] };
    let _initialized = false;
    let _airlines = [];        // from data/airlines.json
    let _airlineCache = {};    // normalized name cache
    const AIRLINE_LOGO_FIXES = {
        'masair': { canonical: 'MasAir', logo: 'images/airlines/logo_mas_air.png', color: '#00a550', textColor: '#ffffff', iata: 'M7' },
        'mas air': { canonical: 'MasAir', logo: 'images/airlines/logo_mas_air.png', color: '#00a550', textColor: '#ffffff', iata: 'M7' },
        'china southern': { canonical: 'China Southern', logo: 'images/airlines/logo_china_southern.png', color: '#002a5c', textColor: '#ffffff', iata: 'CZ' },
        'china southern airlines': { canonical: 'China Southern', logo: 'images/airlines/logo_china_southern.png', color: '#002a5c', textColor: '#ffffff', iata: 'CZ' },
        'china southern cargo': { canonical: 'China Southern', logo: 'images/airlines/logo_china_southern.png', color: '#002a5c', textColor: '#ffffff', iata: 'CZ' },
        'china southerrn': { canonical: 'China Southern', logo: 'images/airlines/logo_china_southern.png', color: '#002a5c', textColor: '#ffffff', iata: 'CZ' },
        'aerotransporte de carga union': { canonical: 'Aerotransporte de Carga Unión', logo: 'images/airlines/logo_aerotransporte_de_carga_unión.png', color: '#00529b', textColor: '#ffffff', iata: 'R6' },
        'aerotransporte de carga union sa de cv': { canonical: 'Aerotransporte de Carga Unión', logo: 'images/airlines/logo_aerotransporte_de_carga_unión.png', color: '#00529b', textColor: '#ffffff', iata: 'R6' },
        'aerounion': { canonical: 'Aerotransporte de Carga Unión', logo: 'images/airlines/logo_aerounión.png', color: '#00529b', textColor: '#ffffff', iata: 'R6' },
        'aero union': { canonical: 'Aerotransporte de Carga Unión', logo: 'images/airlines/logo_aerounión.png', color: '#00529b', textColor: '#ffffff', iata: 'R6' }
    };

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const DAY_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

    const COLORS = {
        nac:   { border: '#2563eb', bg: 'rgba(37,99,235,0.15)'  },
        int:   { border: '#16a34a', bg: 'rgba(22,163,74,0.15)'  },
        carga: { border: '#d97706', bg: 'rgba(217,119,6,0.15)'  },
        total: { border: '#7c3aed', bg: 'rgba(124,58,237,0.12)' }
    };

    // ─── Public init ────────────────────────────────────────────────────────
    async function init() {
        if (_initialized) { render(); return; }

        setLoadingText('Cargando frecuencias…');

        // Retry until window.dataManager is ready (same pattern app uses)
        let attempts = 0;
        while (!window.dataManager || !window.dataManager.client) {
            attempts++;
            if (attempts > 20) {
                setLoadingText('Error: Supabase no disponible. Recargue la página.', true);
                return;
            }
            await new Promise(r => setTimeout(r, 400));
        }

        try {
            const TIMEOUT_MS = 20000;
            function withTimeout(promise, ms) {
                return Promise.race([
                    promise,
                    new Promise(function(_, reject) {
                        setTimeout(function() { reject(new Error('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.')); }, ms);
                    })
                ]);
            }

            setLoadingText('Cargando Nacional…');
            const nac = await withTimeout(window.dataManager.getWeeklyFrequencies(null), TIMEOUT_MS);
            setLoadingText('Cargando Internacional…');
            const int_ = await withTimeout(window.dataManager.getWeeklyFrequenciesInt(null), TIMEOUT_MS);
            setLoadingText('Cargando Carga…');
            const cargo = await withTimeout(window.dataManager.getWeeklyFrequenciesCargo(null), TIMEOUT_MS);

            _raw.nac   = nac   || [];
            _raw.int   = int_  || [];
            _raw.carga = cargo || [];

            // Load airline metadata for logo / alias normalization.
            // Priority: Supabase catalogo_aerolineas → local data/airlines.json
            try {
                if (!_airlines.length) {
                    let loaded = false;
                    // 1. Try Supabase (catalogo_aerolineas table)
                    const sb = window.supabaseClient;
                    if (sb) {
                        const { data: dbRows, error: dbErr } = await sb
                            .from('catalogo_aerolineas')
                            .select('id,nombre,iata,icao,tipo,logo,logo_url,color,color_texto,aliases')
                            .eq('activa', true)
                            .order('nombre');
                        if (!dbErr && Array.isArray(dbRows) && dbRows.length) {
                            // Normalise to the same shape as airlines.json
                            _airlines = dbRows.map(r => ({
                                id:        r.id,
                                name:      r.nombre,
                                iata:      r.iata,
                                icao:      r.icao,
                                type:      r.tipo  || [],
                                // logo_url takes priority over the filename logo
                                logo:      r.logo_url || (r.logo || null),
                                color:     r.color      || '#6c757d',
                                textColor: r.color_texto || '#ffffff',
                                aliases:   r.aliases || []
                            }));
                            loaded = true;
                            console.log(`[FreqStats] Aerolíneas cargadas desde Supabase: ${_airlines.length}`);
                        }
                    }
                    // 2. Fallback: local JSON
                    if (!loaded) {
                        const resp = await fetch('data/airlines.json');
                        _airlines = await resp.json();
                        console.log(`[FreqStats] Aerolíneas cargadas desde airlines.json: ${_airlines.length}`);
                    }
                    _airlineCache = {}; // reset on fresh load
                }
            } catch(_e) {
                console.warn('[FreqStats] Error cargando catálogo de aerolíneas:', _e);
                _airlines = [];
            }

            _initialized = true;

            if (!_raw.nac.length && !_raw.int.length && !_raw.carga.length) {
                setLoadingText('Sin datos: no se encontraron registros de frecuencias semanales.', true);
                return;
            }

            setLoading(false);
            render();

        } catch(err) {
            console.error('FreqStats error:', err);
            setLoadingText('Error al cargar: ' + err.message, true);
        }
    }

    function refresh() { _initialized = false; _airlineCache = {}; init(); }

    // ─── Airline resolver ────────────────────────────────────────────────────
    /** Returns { canonical, logo, color, textColor, iata } for a raw airline name */
    function resolveAirline(rawName) {
        const normalizeAirlineName = (value) => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const key = normalizeAirlineName(rawName);
        if (_airlineCache[key]) return _airlineCache[key];
        if (AIRLINE_LOGO_FIXES[key]) return (_airlineCache[key] = AIRLINE_LOGO_FIXES[key]);

        for (const a of _airlines) {
            const aliases = (a.aliases || []).map(normalizeAirlineName);
            const nameKey = normalizeAirlineName(a.name || '');
            if (aliases.includes(key) || nameKey === key) {
                // logo may be a filename (prefix with path) or an absolute URL (use as-is)
                const logoRaw = a.logo || null;
                const logoPath = logoRaw
                    ? (logoRaw.startsWith('http') || logoRaw.startsWith('/') ? logoRaw : `images/airlines/${logoRaw}`)
                    : null;
                const result = {
                    canonical: a.name,
                    logo:      logoPath,
                    color:     a.color     || '#6c757d',
                    textColor: a.textColor || '#fff',
                    iata:      a.iata
                };
                return (_airlineCache[key] = result);
            }
        }
        const fallback = { canonical: rawName || 'Desconocida', logo: null, color: '#6c757d', textColor: '#fff', iata: null };
        return (_airlineCache[key] = fallback);
    }

    /** HTML for an airline logo (falls back to svg placeholder) */
    function airlineLogo(logoPath, size) {
        size = size || 26;
        const src = logoPath || 'images/airlines/default-airline-logo.svg';
        return `<img src="${src}" onerror="this.src='images/airlines/default-airline-logo.svg'" 
            style="height:${size}px;max-width:${size * 2.4}px;object-fit:contain;vertical-align:middle">`;
    }

    /**
     * Canonical city names & image overrides keyed by IATA code.
     * img:    filename stem inside images/destinos/     (national, without .jpg)
     * intImg: filename stem inside images/destinos_int/ (international, without .jpg)
     */
    const CITY_BY_IATA = {
        // ── Nacional ─────────────────────────────────────────────────────────
        'ZIH': { name: 'Zihuatanejo',      img: 'Zihuatanejo'      }, // Ixtapa Zihuatanejo / Zihuatanjeo / Zihuatanjeo
        'BJX': { name: 'León',             img: 'León'             }, // Bajío / Bajio / El Bajío
        'LAP': { name: 'La Paz',           img: 'La paz'           }, // filename has lowercase p
        'GDL': { name: 'Guadalajara',      img: 'Guadalajara'      },
        'MTY': { name: 'Monterrey',        img: 'Monterrey'        },
        'TIJ': { name: 'Tijuana',          img: 'Tijuana'          },
        'CUN': { name: 'Cancún',           img: 'Cancún'           },
        'MID': { name: 'Mérida',           img: 'Mérida'           },
        'OAX': { name: 'Oaxaca',           img: 'Oaxaca'           },
        'VER': { name: 'Veracruz',         img: 'Veracruz'         },
        'VSA': { name: 'Villahermosa',     img: 'Villahermosa'     },
        'MZT': { name: 'Mazatlán',         img: 'Mazatlán'         },
        'PVR': { name: 'Puerto Vallarta',  img: 'Puerto Vallarta'  },
        'ZLO': { name: 'Manzanillo',       img: null               },
        'SJD': { name: 'Los Cabos',        img: 'Los Cabos'        },
        'HMO': { name: 'Hermosillo',       img: 'Hermosillo'       },
        'CUL': { name: 'Culiacán',         img: 'Culiacán'         },
        'CUU': { name: 'Chihuahua',        img: 'Chihuahua'        },
        'CJT': { name: 'Ciudad Juárez',    img: 'Ciudad Juárez'    },
        'JUZ': { name: 'Ciudad Juárez',    img: 'Ciudad Juárez'    }, // alternate code
        'CEN': { name: 'Ciudad Obregón',   img: 'Ciudad Obregón'   },
        'TRC': { name: 'Torreón',          img: null               },
        'AGU': { name: 'Aguascalientes',   img: null               },
        'ZCL': { name: 'Zacatecas',        img: null               },
        'CPE': { name: 'Campeche',         img: 'Campeche'         },
        'CTM': { name: 'Chetumal',         img: 'Chetumal'         },
        'TAM': { name: 'Tampico',          img: 'Tampico'          },
        'SLP': { name: 'San Luis Potosí',  img: 'San Luis Potosí'  },
        'DGO': { name: 'Durango',          img: 'Durango'          },
        'CLQ': { name: 'Colima',           img: 'Colima'           },
        'TPQ': { name: 'Tepic',            img: 'Tepic'            },
        'SLW': { name: 'Saltillo',         img: 'Saltillo'         },
        'NLD': { name: 'Nuevo Laredo',     img: 'Nuevo Laredo'     },
        'REX': { name: 'Reynosa',          img: 'Reynosa'          },
        'MAM': { name: 'Matamoros',        img: 'Matamoros'        },
        'VIC': { name: 'Ciudad Victoria',  img: 'Ciudad Victoria'  },
        'TLC': { name: 'Toluca',           img: null               },
        'ACN': { name: 'Acapulco',         img: 'Acapulco'         },
        'ACA': { name: 'Acapulco',         img: 'Acapulco'         },
        'HUX': { name: 'Huatulco',         img: 'Huatulco'         },
        'PXM': { name: 'Puerto Escondido', img: 'Puerto Escondido' },
        'IXE': { name: 'Ixtepec',          img: 'Ixtepec'          },
        'TGZ': { name: 'Tuxtla Gutiérrez', img: 'Tuxtla Gutiérrez' }, // correct IATA for Chiapas
        'TUX': { name: 'Tuxtla Gutiérrez', img: 'Tuxtla Gutiérrez' }, // alias seen in some DBs
        'PAL': { name: 'Palenque',         img: 'Palenque'         },
        'TKM': { name: 'Tulum',            img: 'Tulum'            },
        // ── Internacional ─────────────────────────────────────────────────────
        'BOG': { name: 'Bogotá',           intImg: 'Bogotá'        },
        'CCS': { name: 'Caracas',          intImg: 'Caracas'       },
        'HAV': { name: 'La Habana',        intImg: 'La Habana'     },
        'PUJ': { name: 'Punta Cana',       intImg: 'Punta Cana'    },
        'SDQ': { name: 'Santo Domingo',    intImg: 'Santo Domingo' },
    };

    /** Returns canonical { name, imgStem } for a given IATA + raw city string. */
    function canonicalCity(iata, city) {
        const entry = iata && CITY_BY_IATA[iata.toUpperCase()];
        if (entry) return { name: entry.name, imgStem: entry.img };
        const c = (city || '').trim();
        return { name: c || iata || '?', imgStem: null };
    }

    /**
     * Normalize a city name to a deduplication key.
     * Strips accents, lowercases, trims — so "Mérida" and "Merida" → same key.
     */
    function normCityKey(c) {
        return (c || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }
    /** Returns whichever city string retains accent marks (preferred for display). */
    function bestCityDisplay(existing, incoming) {
        const stripped = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const inAcc = incoming !== stripped(incoming);
        const exAcc = existing !== stripped(existing);
        return (inAcc && !exAcc) ? incoming : existing;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────
    // Espera el cliente Supabase (igual que el resto de la app usa dataManager)
    async function waitForClient(maxMs) {
        maxMs = maxMs || 8000;
        const start = Date.now();
        return new Promise(function(resolve, reject) {
            function check() {
                // Preferir dataManager.client (ya autenticado), luego supabaseClient directo
                var c = (window.dataManager && window.dataManager.client)
                    ? window.dataManager.client
                    : window.supabaseClient;
                if (c) { resolve(c); return; }
                if (Date.now() - start > maxMs) {
                    reject(new Error('Supabase no disponible. Asegúrese de haber iniciado sesión.'));
                    return;
                }
                setTimeout(check, 400);
            }
            check();
        });
    }

    async function fetchAll(client, table) {
        let all = [], from = 0;
        while (true) {
            const { data, error } = await client.from(table).select('*').range(from, from + 999);
            if (error) throw new Error('Tabla "' + table + '": ' + error.message);
            all = all.concat(data || []);
            if (!data || data.length < 1000) break;
            from += 1000;
        }
        return all;
    }

    function rowTotal(row) {
        return DAYS.reduce((s, d) => s + (Number(row[d]) || 0), 0);
    }

    /** Group rows by week_label, return sorted array { label, validFrom, total } */
    function groupByWeek(rows) {
        const map = {};
        rows.forEach(r => {
            const lbl = r.week_label || 'Sin etiqueta';
            if (!map[lbl]) map[lbl] = { label: lbl, validFrom: r.valid_from || '', total: 0 };
            map[lbl].total += rowTotal(r);
        });
        return Object.values(map).sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    }

    /** All unique week_labels from all types, sorted */
    function allWeeks() {
        const set = new Map();
        [..._raw.nac, ..._raw.int, ..._raw.carga].forEach(r => {
            const k = r.week_label || '';
            if (k && !set.has(k)) set.set(k, r.valid_from || '');
        });
        return [...set.entries()]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(e => ({ label: e[0], validFrom: e[1] }));
    }

    /** Returns rows for a specific week label, or latest if null */
    function rowsForWeek(type, weekLabel) {
        const src = _raw[type];
        const chosen = weekLabel || latestWeekLabel(src);
        return src.filter(r => r.week_label === chosen);
    }

    function latestWeekLabel(rows) {
        if (!rows.length) return null;
        const sorted = [...rows].sort((a, b) => (b.valid_from || '').localeCompare(a.valid_from || ''));
        return sorted[0].week_label;
    }

    function latestLabel() {
        const all = [..._raw.nac, ..._raw.int, ..._raw.carga];
        if (!all.length) return null;
        return all.sort((a, b) => (b.valid_from || '').localeCompare(a.valid_from || ''))[0].week_label;
    }

    function previousLabel(current) {
        const weeks = allWeeks();
        const idx = weeks.findIndex(w => w.label === current);
        return idx > 0 ? weeks[idx - 1].label : null;
    }

    function deltaArrow(now, prev) {
        if (prev == null || prev === 0) return { html: '—', cls: 'text-muted' };
        const pct = ((now - prev) / prev * 100).toFixed(1);
        if (now > prev) return { html: `+${pct}% <i class="fas fa-arrow-up"></i>`, cls: 'text-success' };
        if (now < prev) return { html: `${pct}% <i class="fas fa-arrow-down"></i>`, cls: 'text-danger' };
        return { html: '0%', cls: 'text-muted' };
    }

    // ─── Render ─────────────────────────────────────────────────────────────
    function render() {
        const selectedWeek = document.getElementById('freq-stats-week-select')?.value || latestLabel();

        // Populate week selector
        populateWeekSelect(selectedWeek);

        // Data for selected week
        const nacRows   = rowsForWeek('nac',   selectedWeek);
        const intRows   = rowsForWeek('int',   selectedWeek);
        const crgRows   = rowsForWeek('carga', selectedWeek);

        const totNac   = nacRows.reduce((s, r) => s + rowTotal(r), 0);
        const totInt   = intRows.reduce((s, r) => s + rowTotal(r), 0);
        const totCrg   = crgRows.reduce((s, r) => s + rowTotal(r), 0);
        const totAll   = totNac + totInt + totCrg;

        // Airlines count (unique)
        const airlines = new Set([
            ...nacRows.map(r => r.airline),
            ...intRows.map(r => r.airline),
            ...crgRows.map(r => r.airline)
        ]);
        // Routes count (unique IATA)
        const routes = new Set([
            ...nacRows.map(r => r.iata),
            ...intRows.map(r => r.iata),
            ...crgRows.map(r => r.iata)
        ]);

        // Busiest day
        const allRows  = [...nacRows, ...intRows, ...crgRows];
        const dayTots  = DAYS.map((d, i) => ({
            name: DAY_LABELS[i],
            total: allRows.reduce((s, r) => s + (Number(r[d]) || 0), 0)
        }));
        const busiestDay = dayTots.reduce((a, b) => a.total >= b.total ? a : b, { name: '—', total: 0 });

        // Previous week delta
        const prevLabel = previousLabel(selectedWeek);
        const prevNac   = _raw.nac.filter(r => r.week_label === prevLabel).reduce((s, r) => s + rowTotal(r), 0);
        const prevInt   = _raw.int.filter(r => r.week_label === prevLabel).reduce((s, r) => s + rowTotal(r), 0);
        const prevCrg   = _raw.carga.filter(r => r.week_label === prevLabel).reduce((s, r) => s + rowTotal(r), 0);
        const prevAll   = prevNac + prevInt + prevCrg;

        const dAll = deltaArrow(totAll, prevAll || null);
        const dNac = deltaArrow(totNac, prevNac || null);
        const dInt = deltaArrow(totInt, prevInt || null);
        const dCrg = deltaArrow(totCrg, prevCrg || null);

        // ── KPI cards ──
        setKPI('kpi-freq-total',    totAll, dAll);
        setKPI('kpi-freq-nac',      totNac, dNac);
        setKPI('kpi-freq-int',      totInt, dInt);
        setKPI('kpi-freq-carga',    totCrg, dCrg);
        setText('kpi-freq-airlines', airlines.size);
        setText('kpi-freq-routes',   routes.size);
        setText('kpi-freq-busiest',  busiestDay.name);

        // ── Trend chart ──
        renderTrendChart();

        // ── Airlines bar chart ──
        renderAirlinesChart([...nacRows, ...intRows, ...crgRows]);

        // ── Day distribution chart ──
        renderDayChart(dayTots);

        // ── Radar chart: day distribution by type ──
        renderRadarChart(nacRows, intRows, crgRows);

        // ── Top routes table ──
        renderTopRoutes(nacRows, intRows, crgRows);

        // ── Week comparison table ──
        renderWeekComparison(selectedWeek, prevLabel);

        // ── Destination × Airline Evolution ──
        renderDestinationAnalysis();

        // ── Cobertura por estado ──
        renderEstadosCobertura(nacRows);

        // ── Monthly Analysis ──
        renderMonthlyAnalysis();
    }

    function populateWeekSelect(selectedWeek) {
        const sel = document.getElementById('freq-stats-week-select');
        if (!sel) return;
        const weeks = allWeeks();
        sel.innerHTML = weeks.map(w =>
            `<option value="${w.label}" ${w.label === selectedWeek ? 'selected' : ''}>${w.label}</option>`
        ).join('');
    }

    function setKPI(id, value, delta) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<span class="fs-3 fw-bold">${value.toLocaleString()}</span>
            <small class="${delta.cls} ms-2" style="font-size:.8rem">${delta.html}</small>`;
    }

    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // Trend: all weeks, one line per type
    function renderTrendChart() {
        const ctx = document.getElementById('chart-freq-trend')?.getContext('2d');
        if (!ctx) return;
        if (chartTrend) { chartTrend.destroy(); chartTrend = null; }

        const weeks = allWeeks();
        const labels = weeks.map(w => w.label);

        const groupNac   = Object.fromEntries(groupByWeek(_raw.nac).map(w => [w.label, w.total]));
        const groupInt   = Object.fromEntries(groupByWeek(_raw.int).map(w => [w.label, w.total]));
        const groupCargo = Object.fromEntries(groupByWeek(_raw.carga).map(w => [w.label, w.total]));

        chartTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Nacional',
                        data: labels.map(l => groupNac[l] || 0),
                        borderColor: COLORS.nac.border,
                        backgroundColor: COLORS.nac.bg,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4
                    },
                    {
                        label: 'Internacional',
                        data: labels.map(l => groupInt[l] || 0),
                        borderColor: COLORS.int.border,
                        backgroundColor: COLORS.int.bg,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4
                    },
                    {
                        label: 'Carga',
                        data: labels.map(l => groupCargo[l] || 0),
                        borderColor: COLORS.carga.border,
                        backgroundColor: COLORS.carga.bg,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => {
                                const ds = ctx.dataset.data;
                                const prev = ds[ctx.dataIndex - 1];
                                if (prev == null || prev === 0) return '';
                                const pct = ((ctx.parsed.y - prev) / prev * 100).toFixed(1);
                                return `Δ vs semana anterior: ${pct > 0 ? '+' : ''}${pct}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 45, font: { size: 10 } } },
                    y: { beginAtZero: true, title: { display: true, text: 'Frecuencias' } }
                }
            }
        });
    }

    // Top 10 airlines by frequency (combined)
    function renderAirlinesChart(rows) {
        const ctx = document.getElementById('chart-freq-airlines')?.getContext('2d');
        if (!ctx) return;
        if (chartAirlines) { chartAirlines.destroy(); chartAirlines = null; }

        const map = {};
        rows.forEach(r => {
            const a = r.airline || 'Desconocida';
            map[a] = (map[a] || 0) + rowTotal(r);
        });
        const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12);

        chartAirlines = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(e => e[0]),
                datasets: [{
                    label: 'Frecuencias',
                    data: sorted.map(e => e[1]),
                    backgroundColor: sorted.map((_, i) =>
                        `hsl(${200 + i * 15}, 70%, ${50 + (i % 3) * 8}%)`),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, title: { display: true, text: 'Frecuencias semanales' } }
                }
            }
        });
    }

    // Day distribution bar
    function renderDayChart(dayTots) {
        const ctx = document.getElementById('chart-freq-days')?.getContext('2d');
        if (!ctx) return;
        if (chartDays) { chartDays.destroy(); chartDays = null; }

        const max = Math.max(...dayTots.map(d => d.total), 1);

        chartDays = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dayTots.map(d => d.name),
                datasets: [{
                    label: 'Frecuencias',
                    data: dayTots.map(d => d.total),
                    backgroundColor: dayTots.map(d =>
                        d.total === max ? 'rgba(239,68,68,0.8)' : 'rgba(37,99,235,0.65)'),
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: ctx => {
                                const pct = (ctx.parsed.y / dayTots.reduce((s,d) => s + d.total, 0) * 100).toFixed(1);
                                return `${pct}% del total semanal`;
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Radar: day distribution by type
    function renderRadarChart(nacRows, intRows, crgRows) {
        const ctx = document.getElementById('chart-freq-radar')?.getContext('2d');
        if (!ctx) return;
        if (chartRadar) { chartRadar.destroy(); chartRadar = null; }

        const sum = (rows, day) => rows.reduce((s, r) => s + (Number(r[day]) || 0), 0);
        const nacData   = DAYS.map(d => sum(nacRows, d));
        const intData   = DAYS.map(d => sum(intRows, d));
        const crgData   = DAYS.map(d => sum(crgRows, d));

        chartRadar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: DAY_LABELS,
                datasets: [
                    {
                        label: 'Nacional',
                        data: nacData,
                        borderColor: COLORS.nac.border,
                        backgroundColor: COLORS.nac.bg,
                        pointRadius: 3
                    },
                    {
                        label: 'Internacional',
                        data: intData,
                        borderColor: COLORS.int.border,
                        backgroundColor: COLORS.int.bg,
                        pointRadius: 3
                    },
                    {
                        label: 'Carga',
                        data: crgData,
                        borderColor: COLORS.carga.border,
                        backgroundColor: COLORS.carga.bg,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    r: { beginAtZero: true, ticks: { stepSize: 2 } }
                }
            }
        });
    }

    // Top routes table
    function renderTopRoutes(nacRows, intRows, crgRows) {
        const tbody = document.getElementById('tbody-freq-routes');
        if (!tbody) return;

        const map = {};
        const add = (rows, type) => rows.forEach(r => {
            const cityRaw = (r.city || '—');
            const k = `${r.iata || '—'}|${normCityKey(cityRaw)}`;
            if (!map[k]) map[k] = { iata: r.iata || '—', city: cityRaw, nac: 0, int: 0, carga: 0 };
            else map[k].city = bestCityDisplay(map[k].city, cityRaw);
            map[k][type] += rowTotal(r);
        });
        add(nacRows,  'nac');
        add(intRows,  'int');
        add(crgRows,  'carga');

        const sorted = Object.values(map)
            .map(r => ({ ...r, total: r.nac + r.int + r.carga }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 20);

        tbody.innerHTML = sorted.map((r, i) => `
            <tr>
                <td class="text-center fw-semibold">${i + 1}</td>
                <td><span class="badge bg-secondary">${r.iata}</span></td>
                <td>${r.city}</td>
                <td class="text-center">${r.nac || '—'}</td>
                <td class="text-center">${r.int || '—'}</td>
                <td class="text-center">${r.carga || '—'}</td>
                <td class="text-center fw-bold">${r.total}</td>
            </tr>
        `).join('');
    }

    // Week-over-week comparison table
    function renderWeekComparison(currentLabel, prevLabel) {
        const tbody = document.getElementById('tbody-freq-comparison');
        if (!tbody) return;

        const weeks = allWeeks();
        // Show last 8 weeks
        const last8 = weeks.slice(-8);

        const nacByWeek   = Object.fromEntries(groupByWeek(_raw.nac).map(w   => [w.label, w.total]));
        const intByWeek   = Object.fromEntries(groupByWeek(_raw.int).map(w   => [w.label, w.total]));
        const crgByWeek   = Object.fromEntries(groupByWeek(_raw.carga).map(w => [w.label, w.total]));

        tbody.innerHTML = last8.map((w, i) => {
            const n = nacByWeek[w.label] || 0;
            const it = intByWeek[w.label] || 0;
            const c = crgByWeek[w.label] || 0;
            const tot = n + it + c;

            const prev = last8[i - 1];
            let delta = { html: '—', cls: 'text-muted' };
            if (prev) {
                const prevTot = (nacByWeek[prev.label] || 0) + (intByWeek[prev.label] || 0) + (crgByWeek[prev.label] || 0);
                delta = deltaArrow(tot, prevTot);
            }

            const isSelected = w.label === currentLabel;
            return `
                <tr class="${isSelected ? 'table-primary fw-bold' : ''}">
                    <td>${isSelected ? '<i class="fas fa-caret-right me-1 text-primary"></i>' : ''}${w.label}</td>
                    <td class="text-center">${n}</td>
                    <td class="text-center">${it}</td>
                    <td class="text-center">${c}</td>
                    <td class="text-center fw-bold">${tot}</td>
                    <td class="text-center ${delta.cls}" style="font-size:.85rem">${delta.html}</td>
                </tr>
            `;
        }).join('');
    }

    // ─── Destination × Airline Evolution ────────────────────────────────────
    // ─── Cobertura por estado de la República Mexicana ───────────────────────

    /**
     * IATA → estado de la República Mexicana (32 estados)
     * Se usa solo para datos nacionales (_raw.nac)
     */
    const STATE_BY_IATA = {
        // Aguascalientes
        'AGU': 'Aguascalientes',
        // Baja California
        'TIJ': 'Baja California', 'MXL': 'Baja California', 'SNQ': 'Baja California',
        // Baja California Sur
        'SJD': 'Baja California Sur', 'LAP': 'Baja California Sur', 'LTO': 'Baja California Sur',
        // Campeche
        'CPE': 'Campeche', 'CME': 'Campeche',
        // Chiapas
        'TGZ': 'Chiapas', 'TUX': 'Chiapas', 'PAL': 'Chiapas',
        // Chihuahua
        'CUU': 'Chihuahua', 'CJT': 'Chihuahua', 'JUZ': 'Chihuahua',
        // Ciudad de México
        'MEX': 'Ciudad de México',
        // Coahuila
        'SLW': 'Coahuila', 'TRC': 'Coahuila',
        // Colima
        'CLQ': 'Colima',
        // Durango
        'DGO': 'Durango',
        // Guanajuato
        'BJX': 'Guanajuato',
        // Guerrero
        'ACA': 'Guerrero', 'ACN': 'Guerrero', 'ZIH': 'Guerrero',
        // Hidalgo — sin aeropuerto comercial activo
        // Jalisco
        'GDL': 'Jalisco', 'PVR': 'Jalisco',
        // Estado de México
        'TLC': 'Estado de México',
        // Michoacán
        'MLM': 'Michoacán',
        // Morelos — sin aeropuerto comercial activo
        // Nayarit
        'TPQ': 'Nayarit',
        // Nuevo León
        'MTY': 'Nuevo León', 'NLD': 'Nuevo León',
        // Oaxaca
        'OAX': 'Oaxaca', 'HUX': 'Oaxaca', 'PXM': 'Oaxaca', 'IXE': 'Oaxaca',
        // Puebla
        'PBC': 'Puebla',
        // Querétaro
        'QRO': 'Querétaro',
        // Quintana Roo
        'CUN': 'Quintana Roo', 'CTM': 'Quintana Roo', 'TKM': 'Quintana Roo',
        // San Luis Potosí
        'SLP': 'San Luis Potosí',
        // Sinaloa
        'MZT': 'Sinaloa', 'CUL': 'Sinaloa', 'LMM': 'Sinaloa',
        // Sonora
        'HMO': 'Sonora', 'CEN': 'Sonora', 'GYM': 'Sonora',
        // Tabasco
        'VSA': 'Tabasco',
        // Tamaulipas
        'TAM': 'Tamaulipas', 'REX': 'Tamaulipas', 'MAM': 'Tamaulipas', 'VIC': 'Tamaulipas',
        // Tlaxcala — sin aeropuerto comercial activo
        // Veracruz
        'VER': 'Veracruz', 'MIE': 'Veracruz', 'XAL': 'Veracruz',
        // Yucatán
        'MID': 'Yucatán',
        // Zacatecas
        'ZCL': 'Zacatecas',
    };

    /** All 32 Mexican states (sorted alphabetically) */
    const ALL_32_STATES = [
        'Aguascalientes','Baja California','Baja California Sur','Campeche',
        'Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango',
        'Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán',
        'Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
        'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco',
        'Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'
    ];

    function renderEstadosCobertura(nacRows) {
        const container = document.getElementById('freq-estados-cobertura');
        if (!container) return;

        // Build state → routes map using current week's national rows
        const stateMap = {}; // state → { routes: Set<"IATA – City">, freqs: number }
        nacRows.forEach(r => {
            const iata  = (r.iata || '').toUpperCase();
            const state = STATE_BY_IATA[iata];
            if (!state) return;
            if (!stateMap[state]) stateMap[state] = { routes: new Set(), freqs: 0 };
            const city = canonicalCity(iata, r.city).name;
            stateMap[state].routes.add(iata + ' – ' + city);
            stateMap[state].freqs += rowTotal(r);
        });

        const coveredStates = Object.keys(stateMap).sort();
        const uncoveredStates = ALL_32_STATES.filter(s => !stateMap[s]);
        const coveredCount = coveredStates.length;

        // KPI bar
        const pctCovered = Math.round((coveredCount / 32) * 100);

        // Covered states cards
        const coveredHtml = coveredStates.map(state => {
            const d = stateMap[state];
            const routesList = [...d.routes].sort().map(r =>
                `<span class="badge me-1 mb-1" style="background:#dbeafe;color:#1d4ed8;font-weight:600;font-size:.7rem;">${r}</span>`
            ).join('');
            return `<div class="col-md-6 col-lg-4">
<div class="card border-0 shadow-sm h-100" style="border-left:4px solid #2563eb!important;">
    <div class="card-body py-2 px-3">
        <div class="d-flex justify-content-between align-items-start mb-1">
            <span class="fw-bold text-dark" style="font-size:.88rem;">${state}</span>
            <span class="badge rounded-pill bg-primary ms-2">${d.routes.size} ruta${d.routes.size !== 1 ? 's' : ''}</span>
        </div>
        <div class="mb-1 text-muted" style="font-size:.72rem;">${d.freqs.toLocaleString('en-US')} frecuencias</div>
        <div class="d-flex flex-wrap">${routesList}</div>
    </div>
</div></div>`;
        }).join('');

        // Uncovered states pills
        const uncoveredHtml = uncoveredStates.map(s =>
            `<span class="badge me-1 mb-1" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-size:.76rem;">${s}</span>`
        ).join('');

        container.innerHTML = `
<div class="mb-3 p-3 rounded-3" style="background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);color:#fff;">
    <div class="d-flex align-items-center gap-3 flex-wrap">
        <div>
            <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.8px;opacity:.8;">ESTADOS CON VUELOS</div>
            <div style="font-size:2.4rem;font-weight:900;line-height:1;">${coveredCount}<span style="font-size:1.1rem;font-weight:400;opacity:.75;margin-left:4px">/ 32</span></div>
        </div>
        <div class="flex-grow-1" style="min-width:180px;">
            <div class="d-flex justify-content-between mb-1" style="font-size:.75rem;opacity:.85;">
                <span>${pctCovered}% de cobertura nacional</span>
                <span>${uncoveredStates.length} sin vuelos</span>
            </div>
            <div style="background:rgba(255,255,255,.25);border-radius:6px;height:10px;">
                <div style="background:#fff;width:${pctCovered}%;height:100%;border-radius:6px;transition:width .6s;"></div>
            </div>
        </div>
        <div style="text-align:right;">
            <div style="font-size:.7rem;opacity:.75;">DESTINOS NACIONALES</div>
            <div style="font-size:1.4rem;font-weight:800;">${nacRows.length > 0 ? [...new Set(nacRows.map(r => r.iata).filter(i => STATE_BY_IATA[(i||'').toUpperCase()]))].length : 0}</div>
        </div>
    </div>
</div>

<div class="row g-2 mb-3">${coveredHtml}</div>

${uncoveredStates.length > 0 ? `
<div class="p-3 rounded-3" style="background:#f8fafc;border:1px solid #e2e8f0;">
    <div class="fw-semibold text-muted mb-2" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.5px;">
        <i class="fas fa-map-marker-alt me-1 text-danger opacity-50"></i>
        Estados sin vuelos desde AIFA esta semana (${uncoveredStates.length})
    </div>
    <div class="d-flex flex-wrap">${uncoveredHtml}</div>
</div>` : `<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>¡Cobertura total! Vuelos a los 32 estados de la República.</div>`}`;
    }

    // ─── Destination Analysis ────────────────────────────────────────────────
    function renderDestinationAnalysis() {
        const thead    = document.getElementById('thead-dest-analysis');
        const tbody    = document.getElementById('tbody-dest-analysis');
        const alertsEl = document.getElementById('dest-analysis-alerts');
        if (!thead || !tbody) return;

        const typeFilter = (document.getElementById('dest-analysis-type')?.value   || 'all').trim();
        const textFilter = (document.getElementById('dest-analysis-filter')?.value || '').toLowerCase().trim();

        // Collect all rows for selected type(s)
        let rows = [];
        if (typeFilter === 'all' || typeFilter === 'nac')   rows = rows.concat(_raw.nac.map(r   => ({ ...r, _type: 'nac'   })));
        if (typeFilter === 'all' || typeFilter === 'int')   rows = rows.concat(_raw.int.map(r   => ({ ...r, _type: 'int'   })));
        if (typeFilter === 'all' || typeFilter === 'carga') rows = rows.concat(_raw.carga.map(r  => ({ ...r, _type: 'carga' })));

        // Build sorted week list
        const weekMap = new Map();
        rows.forEach(r => { if (r.week_label && !weekMap.has(r.week_label)) weekMap.set(r.week_label, r.valid_from || ''); });
        const weeks = [...weekMap.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([label]) => label);

        if (!weeks.length) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td class="text-muted text-center p-3">Sin datos disponibles.</td></tr>';
            if (alertsEl) alertsEl.innerHTML = '';
            return;
        }

        // Build structure: destKey → { iata, city, airlines: { airline → { weekLabel → freq } } }
        const destMap = {};
        rows.forEach(r => {
            const destKey = (r.iata || '?') + '|' + (r.city || r.iata || '?');
            const airline = r.airline || 'Desconocida';
            const freq    = rowTotal(r);
            if (!destMap[destKey]) destMap[destKey] = { iata: r.iata || '?', city: r.city || r.iata || '?', airlines: {} };
            if (!destMap[destKey].airlines[airline]) destMap[destKey].airlines[airline] = {};
            destMap[destKey].airlines[airline][r.week_label] = (destMap[destKey].airlines[airline][r.week_label] || 0) + freq;
        });

        // Sort destinations by grand total desc
        const destsSorted = Object.values(destMap).sort((a, b) => {
            const sum = obj => Object.values(obj.airlines).reduce((s, wd) => s + Object.values(wd).reduce((x, y) => x + y, 0), 0);
            return sum(b) - sum(a);
        });

        // Apply text filter
        const filtered = textFilter
            ? destsSorted.filter(d =>
                d.city.toLowerCase().includes(textFilter) ||
                d.iata.toLowerCase().includes(textFilter) ||
                Object.keys(d.airlines).some(a => a.toLowerCase().includes(textFilter)))
            : destsSorted;

        // ── Build alerts: biggest movers between last two weeks ──────────────
        if (alertsEl) {
            if (weeks.length >= 2) {
                const wPrev = weeks[weeks.length - 2];
                const wCurr = weeks[weeks.length - 1];
                const airlineDeltas = {};
                const airlineByDest = {}; // track top destination per airline
                Object.values(destMap).forEach(dest => {
                    Object.entries(dest.airlines).forEach(([airline, wd]) => {
                        const prev = wd[wPrev] || 0;
                        const curr = wd[wCurr] || 0;
                        if (!airlineDeltas[airline]) airlineDeltas[airline] = { prev: 0, curr: 0, dests: [] };
                        airlineDeltas[airline].prev += prev;
                        airlineDeltas[airline].curr += curr;
                        const delta = curr - prev;
                        if (delta !== 0) airlineDeltas[airline].dests.push({ city: dest.city, iata: dest.iata, prev, curr, delta });
                    });
                });
                const movers = Object.entries(airlineDeltas)
                    .map(([airline, v]) => ({ airline, ...v, delta: v.curr - v.prev }))
                    .filter(v => v.delta !== 0 && (v.prev > 0 || v.curr > 0))
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .slice(0, 6);

                if (movers.length) {
                    const cards = movers.map(m => {
                        const pct    = m.prev > 0 ? ((m.delta / m.prev) * 100).toFixed(1) : (m.curr > 0 ? 100 : 0);
                        const up     = m.delta > 0;
                        const lvl    = up ? 'success' : 'danger';
                        const icon   = up ? 'fa-arrow-up' : 'fa-arrow-down';
                        const dir    = up ? 'incrementó' : 'disminuyó';
                        const sign   = up ? '+' : '';
                        // top 2 impacted destinations
                        const topD   = m.dests.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2)
                            .map(d => `<small class="badge bg-light text-dark border">${d.iata} ${d.city} (${d.prev}→${d.curr})</small>`).join(' ');
                        return `<div class="alert alert-${lvl} py-2 px-3 mb-0 flex-shrink-0" style="font-size:.81rem;min-width:240px;max-width:440px">
    <div><i class="fas ${icon} me-1"></i><strong>${m.airline}</strong> <span class="fw-semibold">${dir} ${Math.abs(m.delta)} freq</span> (${sign}${pct}%)</div>
    <div class="mt-1">${wPrev} → ${wCurr} &nbsp;·&nbsp; ${m.prev} → ${m.curr} freq totales</div>
    ${topD ? '<div class="mt-1">' + topD + '</div>' : ''}
</div>`;
                    }).join('');
                    alertsEl.innerHTML = `<div class="d-flex flex-wrap gap-2 mb-3">${cards}</div>`;
                } else {
                    alertsEl.innerHTML = `<div class="alert alert-info py-2 px-3 mb-3" style="font-size:.82rem"><i class="fas fa-check-circle me-1"></i>Sin variaciones entre <strong>${wPrev}</strong> y <strong>${wCurr}</strong>.</div>`;
                }
            } else {
                alertsEl.innerHTML = '';
            }
        }

        // ── Build thead ──────────────────────────────────────────────────────
        thead.innerHTML = `<tr style="font-size:.72rem">
    <th class="text-uppercase text-start" style="background:#212529;color:#fff;min-width:110px;position:sticky;left:0;z-index:3">Destino</th>
    <th class="text-uppercase text-start" style="background:#212529;color:#fff;min-width:130px">Aerolínea</th>
    ${weeks.map(w => `<th class="text-center text-uppercase" style="background:#212529;color:#fff;min-width:88px">${w}</th>`).join('')}
    <th class="text-center text-uppercase" style="background:#212529;color:#fff;min-width:90px">Tendencia</th>
</tr>`;

        // ── Build tbody ──────────────────────────────────────────────────────
        function trendHtml(firstVal, lastVal, compact) {
            if (!firstVal && !lastVal) return '<span class="text-muted">—</span>';
            if (!firstVal) return '<span class="text-success fw-semibold">Nuevo <i class="fas fa-star"></i></span>';
            const pct = ((lastVal - firstVal) / firstVal * 100).toFixed(1);
            if (Number(pct) > 0)  return compact
                ? `<span class="text-success">+${pct}%<i class="fas fa-arrow-up ms-1"></i></span>`
                : `<span class="text-success fw-semibold">+${pct}% <i class="fas fa-arrow-up"></i></span>`;
            if (Number(pct) < 0)  return compact
                ? `<span class="text-danger">${pct}%<i class="fas fa-arrow-down ms-1"></i></span>`
                : `<span class="text-danger fw-semibold">${pct}% <i class="fas fa-arrow-down"></i></span>`;
            return '<span class="text-muted">Sin cambio</span>';
        }

        let html = '';
        let allExpanded = false;

        filtered.forEach((dest, di) => {
            const airlineEntries = Object.entries(dest.airlines).sort((a, b) => {
                const sum = wd => Object.values(wd).reduce((s, x) => s + x, 0);
                return sum(b[1]) - sum(a[1]);
            });

            // Destination totals per week
            const destWeek = {};
            weeks.forEach(w => { destWeek[w] = airlineEntries.reduce((s, [, wd]) => s + (wd[w] || 0), 0); });

            const firstVal = destWeek[weeks[0]] || 0;
            const lastVal  = destWeek[weeks[weeks.length - 1]] || 0;
            const collapseId = `da-col-${di}`;

            // Destination summary row (clickable to expand)
            html += `<tr class="table-light" data-bs-toggle="collapse" data-bs-target="#${collapseId}"
    style="cursor:pointer;font-size:.82rem">
    <td style="position:sticky;left:0;background:#f8f9fa;font-weight:600">
        <i class="fas fa-chevron-right me-1 da-chevron" id="chv-${di}" style="font-size:.65rem;transition:transform .2s"></i>
        <span class="badge bg-secondary me-1">${dest.iata}</span>${dest.city}
    </td>
    <td class="text-muted" style="font-size:.75rem">${airlineEntries.length} aerolínea${airlineEntries.length !== 1 ? 's' : ''}</td>
    ${weeks.map((w, wi) => {
        const curr = destWeek[w] || 0;
        const prev = wi > 0 ? (destWeek[weeks[wi - 1]] || 0) : null;
        const d    = prev != null ? deltaArrow(curr, prev) : { html: '', cls: '' };
        return `<td class="text-center fw-bold">${curr > 0 ? curr.toLocaleString() : '<span class=\'text-muted\'>—</span>'} <span class="${d.cls}" style="font-size:.68rem">${d.html}</span></td>`;
    }).join('')}
    <td class="text-center">${trendHtml(firstVal, lastVal, false)}</td>
</tr>
<tr><td colspan="${2 + weeks.length + 1}" class="p-0 border-0">
    <div class="collapse" id="${collapseId}">
        <table class="table table-sm table-bordered mb-0" style="font-size:.78rem">
            <thead>
                <tr class="table-secondary" style="font-size:.7rem">
                    <th style="min-width:110px"></th>
                    <th style="min-width:130px">Aerolínea</th>
                    ${weeks.map(w => `<th class="text-center" style="min-width:88px">${w}</th>`).join('')}
                    <th class="text-center" style="min-width:90px">Tendencia</th>
                </tr>
            </thead>
            <tbody>
            ${airlineEntries.map(([airline, wd]) => {
                const alFirst = wd[weeks[0]] || 0;
                const alLast  = wd[weeks[weeks.length - 1]] || 0;
                const cells = weeks.map((w, wi) => {
                    const curr = wd[w] || 0;
                    const prev = wi > 0 ? (wd[weeks[wi - 1]] || 0) : null;
                    let bg = '';
                    let ico = '';
                    if (prev != null && curr !== prev) {
                        if (curr > prev) { bg = 'class="table-success"'; ico = '<i class="fas fa-arrow-up text-success" style="font-size:.65rem"></i>'; }
                        else              { bg = 'class="table-danger"';  ico = '<i class="fas fa-arrow-down text-danger" style="font-size:.65rem"></i>'; }
                    }
                    const abs = curr > 0 ? curr.toLocaleString() : '<span class=\'text-muted\'>—</span>';
                    const diffLabel = (prev != null && curr !== prev) ? `<sup style="font-size:.6rem;margin-left:2px">${curr > prev ? '+' : ''}${curr - prev}</sup>` : '';
                    return `<td class="text-center" ${bg} style="min-width:88px">${abs}${diffLabel} ${ico}</td>`;
                }).join('');
                return `<tr>
    <td style="padding-left:2rem;color:#888;min-width:110px"><i class="fas fa-plane-departure" style="font-size:.6rem"></i></td>
    <td style="min-width:130px">${airline}</td>
    ${cells}
    <td class="text-center" style="min-width:90px">${trendHtml(alFirst, alLast, true)}</td>
</tr>`;
            }).join('')}
            </tbody>
        </table>
    </div>
</td></tr>`;
        });

        // Empty state
        if (!filtered.length) {
            html = `<tr><td colspan="${2 + weeks.length + 1}" class="text-muted text-center p-3">Sin resultados para los filtros seleccionados.</td></tr>`;
        }

        tbody.innerHTML = html;

        // Rotate chevrons on collapse events
        filtered.forEach((_, di) => {
            const collapseEl = document.getElementById(`da-col-${di}`);
            const chv = document.getElementById(`chv-${di}`);
            if (!collapseEl || !chv) return;
            collapseEl.addEventListener('show.bs.collapse', () => { chv.style.transform = 'rotate(90deg)'; });
            collapseEl.addEventListener('hide.bs.collapse', () => { chv.style.transform = 'rotate(0deg)'; });
        });

        // Expand / collapse all button
        const btnAll = document.getElementById('btn-dest-expand-all');
        if (btnAll) {
            btnAll.onclick = function() {
                allExpanded = !allExpanded;
                document.querySelectorAll('#tbody-dest-analysis .collapse').forEach(el => {
                    const bsCol = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
                    allExpanded ? bsCol.show() : bsCol.hide();
                });
                btnAll.innerHTML = allExpanded
                    ? '<i class="fas fa-compress-alt"></i>'
                    : '<i class="fas fa-expand-alt"></i>';
            };
        }
    }

    // ─── Monthly Analysis by Airline and Route ──────────────────────────────
    function renderMonthlyAnalysis() {
        const theadAirlines = document.getElementById('thead-monthly-airlines');
        const tbodyAirlines = document.getElementById('tbody-monthly-airlines');
        const theadRoutes   = document.getElementById('thead-monthly-routes');
        const tbodyRoutes   = document.getElementById('tbody-monthly-routes');
        if (!theadAirlines || !tbodyAirlines || !theadRoutes || !tbodyRoutes) return;

        const typeFilter = (document.getElementById('monthly-analysis-type')?.value || 'all').trim();
        const textFilter = (document.getElementById('monthly-analysis-filter')?.value || '').toLowerCase().trim();

        const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        function getMonthKey(vf) { return vf ? String(vf).slice(0, 7) : null; }
        function monthLabel(yyyymm) {
            const p = yyyymm.split('-');
            return MONTH_NAMES_ES[parseInt(p[1], 10) - 1] + ' ' + p[0];
        }

        // Collect rows for selected type(s)
        let rows = [];
        if (typeFilter === 'all' || typeFilter === 'nac')   rows = rows.concat(_raw.nac.map(r   => ({ ...r, _type: 'nac'   })));
        if (typeFilter === 'all' || typeFilter === 'int')   rows = rows.concat(_raw.int.map(r   => ({ ...r, _type: 'int'   })));
        if (typeFilter === 'all' || typeFilter === 'carga') rows = rows.concat(_raw.carga.map(r  => ({ ...r, _type: 'carga' })));

        // Sorted unique months
        const monthSet = new Set();
        rows.forEach(r => { const mk = getMonthKey(r.valid_from); if (mk) monthSet.add(mk); });
        const months = [...monthSet].sort();

        const colCount = 2 + months.length + 1;
        if (!months.length) {
            const empty = '<tr><td class="text-muted text-center p-3">Sin datos disponibles.</td></tr>';
            theadAirlines.innerHTML = ''; tbodyAirlines.innerHTML = empty;
            theadRoutes.innerHTML   = ''; tbodyRoutes.innerHTML   = empty;
            renderAirlinesOverview({}, months);
            return;
        }

        // ── Build airline map (normalized via resolveAirline) ─────────────────
        // key = canonical name, value = { meta, months, types, routes }
        const airlineMap = {};
        rows.forEach(r => {
            const mk      = getMonthKey(r.valid_from);
            if (!mk) return;
            const meta    = resolveAirline(r.airline || 'Desconocida');
            const airline = meta.canonical;
            const canon   = canonicalCity(r.iata, r.city); // IATA-first canonical lookup
            // Route key: IATA alone is enough to deduplicate — city variants collapse
            const rk = (r.iata || '?').toUpperCase();
            if (!airlineMap[airline]) airlineMap[airline] = { meta, months: {}, types: new Set(), routes: {} };
            airlineMap[airline].months[mk] = (airlineMap[airline].months[mk] || 0) + rowTotal(r);
            airlineMap[airline].types.add(r._type);
            if (!airlineMap[airline].routes[rk])
                airlineMap[airline].routes[rk] = { iata: r.iata || '?', city: canon.name, months: {}, types: new Set() };
            airlineMap[airline].routes[rk].months[mk] = (airlineMap[airline].routes[rk].months[mk] || 0) + rowTotal(r);
            airlineMap[airline].routes[rk].types.add(r._type);
        });

        // ── Build route map; airline sub-entries also normalized ───────────────
        const routeMap = {};
        rows.forEach(r => {
            const mk      = getMonthKey(r.valid_from);
            if (!mk) return;
            const canon   = canonicalCity(r.iata, r.city);
            const rk      = (r.iata || '?').toUpperCase();
            const meta    = resolveAirline(r.airline || 'Desconocida');
            const airline = meta.canonical;
            if (!routeMap[rk]) routeMap[rk] = { iata: r.iata || '?', city: canon.name, months: {}, types: new Set(), airlines: {} };
            routeMap[rk].months[mk] = (routeMap[rk].months[mk] || 0) + rowTotal(r);
            routeMap[rk].types.add(r._type);
            if (!routeMap[rk].airlines[airline]) routeMap[rk].airlines[airline] = { meta, months: {}, types: new Set() };
            routeMap[rk].airlines[airline].months[mk] = (routeMap[rk].airlines[airline].months[mk] || 0) + rowTotal(r);
            routeMap[rk].airlines[airline].types.add(r._type);
        });

        // ── Shared helpers ────────────────────────────────────────────────────
        function trendCell(values) {
            const firstNZ = values.find(v => v > 0) || 0;
            const lastNZ  = [...values].reverse().find(v => v > 0) || 0;
            if (!firstNZ && !lastNZ) return '<span class="text-muted">—</span>';
            if (!firstNZ) return '<span class="text-success fw-semibold">Nuevo <i class="fas fa-star"></i></span>';
            const pct = ((lastNZ - firstNZ) / firstNZ * 100).toFixed(1);
            if (Number(pct) > 0) return `<span class="text-success fw-semibold">+${pct}%&nbsp;<i class="fas fa-arrow-up"></i></span>`;
            if (Number(pct) < 0) return `<span class="text-danger fw-semibold">${pct}%&nbsp;<i class="fas fa-arrow-down"></i></span>`;
            return '<span class="text-muted">Estable</span>';
        }
        function deltaCell(curr, prev) {
            const val = curr > 0 ? curr.toLocaleString() : '<span class="text-muted">—</span>';
            if (prev == null) return `<td class="text-center">${val}</td>`;
            if (curr > prev) return `<td class="text-center table-success">${val}<sup style="font-size:.6rem;margin-left:2px">+${curr-prev}</sup>&nbsp;<i class="fas fa-arrow-up text-success" style="font-size:.6rem"></i></td>`;
            if (curr < prev) return `<td class="text-center table-danger">${val}<sup style="font-size:.6rem;margin-left:2px">-${prev-curr}</sup>&nbsp;<i class="fas fa-arrow-down text-danger" style="font-size:.6rem"></i></td>`;
            return `<td class="text-center">${val}</td>`;
        }
        function typeBadges(typesSet) {
            const b = [];
            if (typesSet.has('nac'))   b.push('<span class="badge" style="background:#2563eb;font-size:.6rem">Nac</span>');
            if (typesSet.has('int'))   b.push('<span class="badge" style="background:#16a34a;font-size:.6rem">Int</span>');
            if (typesSet.has('carga')) b.push('<span class="badge" style="background:#d97706;font-size:.6rem">Carga</span>');
            return b.join(' ');
        }
        function buildThead(rowLabel) {
            return `<tr style="font-size:.72rem">
<th style="background:#212529;color:#fff;min-width:220px;position:sticky;left:0;z-index:3" class="text-uppercase">${rowLabel}</th>
<th class="text-center text-uppercase" style="background:#212529;color:#fff;min-width:72px">Tipo</th>
${months.map(mk => `<th class="text-center text-uppercase" style="background:#212529;color:#fff;min-width:85px">${monthLabel(mk)}</th>`).join('')}
<th class="text-center text-uppercase" style="background:#212529;color:#fff;min-width:88px">Tendencia</th>
</tr>`;
        }
        function buildSubTable(subEntries, labelFn) {
            if (!subEntries.length) return '';
            return `<table class="table table-sm table-bordered mb-0" style="font-size:.76rem;background:#fafafa">
<thead><tr style="background:#e9ecef;font-size:.68rem">
<th style="min-width:220px;padding-left:2.5rem;font-weight:600">Detalle</th>
<th class="text-center" style="min-width:64px">Tipo</th>
${months.map(mk => `<th class="text-center" style="min-width:85px">${monthLabel(mk)}</th>`).join('')}
<th class="text-center" style="min-width:88px">Tendencia</th>
</tr></thead><tbody>
${subEntries.map(sub => {
    const cells = sub.values.map((v,i) => deltaCell(v, i>0 ? sub.values[i-1] : null)).join('');
    return `<tr><td style="padding-left:2.5rem">${labelFn(sub)}</td><td class="text-center">${typeBadges(sub.types)}</td>${cells}<td class="text-center">${trendCell(sub.values)}</td></tr>`;
}).join('')}
</tbody></table>`;
        }

        // ── Airlines table ────────────────────────────────────────────────────
        theadAirlines.innerHTML = buildThead('Aerolínea');

        const airlinesSorted = Object.entries(airlineMap)
            .filter(([name, data]) => !textFilter ||
                name.toLowerCase().includes(textFilter) ||
                Object.values(data.routes).some(rt =>
                    rt.city.toLowerCase().includes(textFilter) || rt.iata.toLowerCase().includes(textFilter)))
            .map(([name, data]) => ({ name, data, total: Object.values(data.months).reduce((s,v) => s+v, 0) }))
            .sort((a, b) => b.total - a.total);

        if (!airlinesSorted.length) {
            tbodyAirlines.innerHTML = `<tr><td colspan="${colCount}" class="text-muted text-center p-3">Sin resultados.</td></tr>`;
        } else {
            let html = '';
            airlinesSorted.forEach((entry, idx) => {
                const values      = months.map(mk => entry.data.months[mk] || 0);
                const cells       = values.map((v,i) => deltaCell(v, i>0 ? values[i-1] : null)).join('');
                const colId       = `ma-al-${idx}`;
                const rowBg       = idx % 2 !== 0 ? '#f9f9f9' : '#fff';
                const routeCount  = Object.keys(entry.data.routes).length;
                const logoHtml    = airlineLogo(entry.data.meta.logo, 24);
                const routeSubs   = Object.values(entry.data.routes)
                    .map(rt => ({ iata: rt.iata, city: rt.city, types: rt.types, values: months.map(mk => rt.months[mk] || 0) }))
                    .sort((a,b) => b.values.reduce((s,v)=>s+v,0) - a.values.reduce((s,v)=>s+v,0));

                html += `<tr data-bs-toggle="collapse" data-bs-target="#${colId}"
    style="cursor:pointer;background:${rowBg};font-size:.82rem">
<td style="position:sticky;left:0;background:${rowBg};padding:.45rem .5rem">
    <i class="fas fa-chevron-right" id="ma-chv-${idx}" style="font-size:.6rem;transition:transform .2s;color:#adb5bd;margin-right:4px"></i>
    ${logoHtml}
    <span class="fw-bold ms-1">${entry.name}</span>
    <small class="text-muted ms-2">(${routeCount} ruta${routeCount!==1?'s':''})</small>
</td>
<td class="text-center">${typeBadges(entry.data.types)}</td>
${cells}
<td class="text-center">${trendCell(values)}</td>
</tr>
<tr class="border-0"><td colspan="${colCount}" class="p-0 border-0">
<div class="collapse" id="${colId}">${buildSubTable(routeSubs, sub =>
    `<span class="badge bg-secondary me-1" style="font-size:.6rem">${sub.iata}</span>${sub.city}`)}</div>
</td></tr>`;
            });
            tbodyAirlines.innerHTML = html;
            airlinesSorted.forEach((_, idx) => {
                const el  = document.getElementById(`ma-al-${idx}`);
                const chv = document.getElementById(`ma-chv-${idx}`);
                if (!el || !chv) return;
                el.addEventListener('show.bs.collapse', () => chv.style.transform = 'rotate(90deg)');
                el.addEventListener('hide.bs.collapse', () => chv.style.transform = '');
            });
        }

        // ── Routes table ──────────────────────────────────────────────────────
        theadRoutes.innerHTML = buildThead('Ruta (Destino)');

        const routesSorted = Object.values(routeMap)
            .filter(r => !textFilter ||
                r.city.toLowerCase().includes(textFilter) ||
                r.iata.toLowerCase().includes(textFilter) ||
                Object.keys(r.airlines).some(a => a.toLowerCase().includes(textFilter)))
            .map(r => ({ ...r, total: Object.values(r.months).reduce((s,v) => s+v, 0) }))
            .sort((a,b) => b.total - a.total);

        if (!routesSorted.length) {
            tbodyRoutes.innerHTML = `<tr><td colspan="${colCount}" class="text-muted text-center p-3">Sin resultados.</td></tr>`;
        } else {
            let html = '';
            routesSorted.forEach((route, idx) => {
                const values       = months.map(mk => route.months[mk] || 0);
                const cells        = values.map((v,i) => deltaCell(v, i>0 ? values[i-1] : null)).join('');
                const colId        = `ma-rt-${idx}`;
                const rowBg        = idx % 2 !== 0 ? '#f9f9f9' : '#fff';
                const airlineSubs  = Object.entries(route.airlines)
                    .map(([name, al]) => ({ name, meta: al.meta, types: al.types, values: months.map(mk => al.months[mk] || 0) }))
                    .sort((a,b) => b.values.reduce((s,v)=>s+v,0) - a.values.reduce((s,v)=>s+v,0));

                html += `<tr data-bs-toggle="collapse" data-bs-target="#${colId}"
    style="cursor:pointer;background:${rowBg};font-size:.82rem">
<td style="position:sticky;left:0;background:${rowBg};padding:.45rem .5rem">
    <i class="fas fa-chevron-right" id="ma-rchv-${idx}" style="font-size:.6rem;transition:transform .2s;color:#adb5bd;margin-right:4px"></i>
    <span class="badge bg-secondary me-1">${route.iata}</span><span class="fw-bold">${route.city}</span>
    <small class="text-muted ms-2">(${airlineSubs.length} aerolínea${airlineSubs.length!==1?'s':''})</small>
</td>
<td class="text-center">${typeBadges(route.types)}</td>
${cells}
<td class="text-center">${trendCell(values)}</td>
</tr>
<tr class="border-0"><td colspan="${colCount}" class="p-0 border-0">
<div class="collapse" id="${colId}">${buildSubTable(airlineSubs, sub =>
    `${airlineLogo(sub.meta ? sub.meta.logo : null, 20)}<span class="ms-1">${sub.name}</span>`)}</div>
</td></tr>`;
            });
            tbodyRoutes.innerHTML = html;
            routesSorted.forEach((_, idx) => {
                const el  = document.getElementById(`ma-rt-${idx}`);
                const chv = document.getElementById(`ma-rchv-${idx}`);
                if (!el || !chv) return;
                el.addEventListener('show.bs.collapse', () => chv.style.transform = 'rotate(90deg)');
                el.addEventListener('hide.bs.collapse', () => chv.style.transform = '');
            });
        }

        // ── Rutas activas esta semana (latest valid_from en datos raw) ─────────
        const _rvf = [..._raw.nac, ..._raw.int, ..._raw.carga]
            .filter(r => r.valid_from)
            .reduce((mx, r) => r.valid_from > mx ? r.valid_from : mx, '');
        const _rlbl = ([..._raw.nac, ..._raw.int, ..._raw.carga]
            .find(r => r.valid_from === _rvf) || {}).week_label || _rvf;
        const _activeNow = {};  // { canonicalAirline → Set<IATA> }
        [..._raw.nac, ..._raw.int, ..._raw.carga]
            .filter(r => r.valid_from === _rvf && rowTotal(r) > 0)
            .forEach(r => {
                const canon = resolveAirline(r.airline || 'Desconocida').canonical;
                const iata  = (r.iata || '?').toUpperCase();
                if (!_activeNow[canon]) _activeNow[canon] = new Set();
                _activeNow[canon].add(iata);
            });

        // ── Overview cards tab ────────────────────────────────────────────────
        renderAirlinesOverview(airlineMap, months, _activeNow, _rlbl);
    }

    // ─── Airlines Overview (resumen con tarjetas) ────────────────────────────

    // Lookup destination image path; uses IATA override first, then city name.
    // Returns { src, fallback } — src is the best guess, fallback tries the other folder.
    function destImageSrc(iata, city) {
        const entry = iata && CITY_BY_IATA[iata.toUpperCase()];
        if (entry) {
            if (entry.intImg) return { src: `images/destinos_int/${entry.intImg}.jpg`, fallback: null };
            if (entry.img)    return { src: `images/destinos/${entry.img}.jpg`,        fallback: `images/destinos_int/${entry.img}.jpg` };
        }
        const name = (city || '').trim();
        return { src: `images/destinos/${name}.jpg`, fallback: `images/destinos_int/${name}.jpg` };
    }

    function renderAirlinesOverview(airlineMap, months, activeThisWeek, latestWeekLbl) {
        const container = document.getElementById('monthly-airlines-overview');
        if (!container) return;

        const keys = Object.keys(airlineMap || {});
        if (!keys.length) {
            container.innerHTML = '<p class="text-muted text-center py-4">Sin datos disponibles.</p>';
            return;
        }

        const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        function monthShort(yyyymm) {
            const p = (yyyymm || '').split('-');
            return MONTH_NAMES_ES[parseInt(p[1], 10) - 1] || yyyymm;
        }

        // Sort airlines by grand total desc
        const sorted = keys
            .map(name => {
                const data             = airlineMap[name];
                const values           = (months || []).map(mk => data.months[mk] || 0);
                const total            = values.reduce((s, v) => s + v, 0);
                const routeCount       = Object.keys(data.routes || {}).length;
                const activeSet        = (activeThisWeek || {})[name] || new Set();
                const activeRouteCount = activeSet.size;
                return { name, data, values, total, routeCount, activeRouteCount, activeSet };
            })
            .sort((a, b) => b.total - a.total);

        const maxTotal = sorted[0]?.total || 1;

        function trendBadge(values) {
            const first = values.find(v => v > 0) || 0;
            const last  = [...values].reverse().find(v => v > 0) || 0;
            if (!first && !last) return '';
            if (!first) return '<span class="badge bg-success ms-1">Nuevo</span>';
            const pct = ((last - first) / first * 100).toFixed(1);
            if (Number(pct) > 0) return `<span class="badge bg-success ms-1">+${pct}% <i class="fas fa-arrow-up"></i></span>`;
            if (Number(pct) < 0) return `<span class="badge bg-danger ms-1">${pct}% <i class="fas fa-arrow-down"></i></span>`;
            return '<span class="badge bg-secondary ms-1">Estable</span>';
        }
        function typePills(typesSet) {
            const b = [];
            if (typesSet.has('nac'))   b.push('<span class="badge rounded-pill" style="background:#2563eb">Nacional</span>');
            if (typesSet.has('int'))   b.push('<span class="badge rounded-pill" style="background:#16a34a">Internacional</span>');
            if (typesSet.has('carga')) b.push('<span class="badge rounded-pill" style="background:#d97706">Carga</span>');
            return b.join(' ');
        }

        const cards = sorted.map((entry, idx) => {
            const meta    = entry.data.meta;
            const pctBar  = Math.max(4, Math.round((entry.total / maxTotal) * 100));
            const logoSrc = meta.logo || 'images/airlines/default-airline-logo.svg';

            // Mini month bars
            const maxMonth = Math.max(...entry.values, 1);
            const miniBars = (months || []).map((mk, i) => {
                const v   = entry.values[i];
                const h   = Math.max(2, Math.round((v / maxMonth) * 40));
                const col = i > 0
                    ? (v > entry.values[i-1] ? '#22c55e' : v < entry.values[i-1] ? '#ef4444' : '#94a3b8')
                    : '#94a3b8';
                return `<div title="${monthShort(mk)}: ${v}" style="display:inline-block;width:18px;height:${h}px;background:${col};border-radius:2px 2px 0 0;margin:0 1px;vertical-align:bottom"></div>`;
            }).join('');

            const monthBreakdown = (months || []).map((mk, i) => {
                const v = entry.values[i];
                const prev = i > 0 ? entry.values[i-1] : null;
                let cls = 'text-muted';
                if (prev !== null) cls = v > prev ? 'text-success' : v < prev ? 'text-danger' : 'text-muted';
                return `<div style="text-align:center;min-width:52px">
<div style="font-size:.65rem;color:#6c757d">${monthShort(mk)}</div>
<div class="fw-bold ${cls}" style="font-size:.82rem">${v > 0 ? v.toLocaleString() : '—'}</div>
</div>`;
            }).join('');

            return `<div class="col">
<div class="card h-100 border-0 shadow-sm ov-airline-card"
    data-ov-idx="${idx}"
    style="border-top:3px solid ${meta.color} !important;cursor:pointer;transition:box-shadow .2s,transform .15s"
    onmouseenter="this.style.boxShadow='0 6px 24px rgba(0,0,0,.18)';this.style.transform='translateY(-2px)'"
    onmouseleave="this.style.boxShadow='';this.style.transform=''">
    <div class="card-body p-3">
        <!-- Header -->
        <div class="d-flex align-items-center gap-2 mb-2">
            <div style="width:72px;height:36px;display:flex;align-items:center;justify-content:center;background:#f8f9fa;border-radius:6px;padding:3px;flex-shrink:0">
                <img src="${logoSrc}" onerror="this.src='images/airlines/default-airline-logo.svg'"
                    style="max-width:66px;max-height:30px;object-fit:contain">
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-bold text-truncate" style="font-size:.88rem" title="${entry.name}">${entry.name}</div>
                <div class="mt-1">${typePills(entry.data.types)}</div>
            </div>
            <i class="fas fa-chevron-down ov-chv-${idx}" style="color:#adb5bd;font-size:.75rem;transition:transform .2s;flex-shrink:0"></i>
        </div>
        <!-- KPIs -->
        <div class="d-flex gap-3 mb-2">
            <div>
                <div style="font-size:.65rem;text-transform:uppercase;color:#6c757d;letter-spacing:.05em">Rutas activas</div>
                <div class="fw-bold" style="font-size:1.35rem;line-height:1.1;color:${meta.color}">${entry.activeRouteCount}</div>
                ${entry.routeCount > entry.activeRouteCount ? `<div style="font-size:.6rem;color:#9ca3af">${entry.routeCount} históricas</div>` : ''}
            </div>
            <div>
                <div style="font-size:.65rem;text-transform:uppercase;color:#6c757d;letter-spacing:.05em">Total freq</div>
                <div class="fw-bold" style="font-size:1.35rem;line-height:1.1">${entry.total.toLocaleString()}</div>
            </div>
            <div class="align-self-end">${trendBadge(entry.values)}</div>
        </div>
        <!-- Volume bar -->
        <div style="background:#e9ecef;border-radius:4px;height:5px;margin-bottom:10px">
            <div style="background:${meta.color};width:${pctBar}%;height:100%;border-radius:4px;transition:width .5s"></div>
        </div>
        <!-- Mini bars + month values -->
        <div style="margin-bottom:8px;display:flex;align-items:flex-end;height:44px">${miniBars}</div>
        <div class="d-flex flex-wrap gap-1">${monthBreakdown}</div>
    </div>
</div>
</div>`;
        }).join('');

        // Routes drill-down panel (shared, rendered below cards)
        container.innerHTML = `
<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3" id="ov-cards-grid">${cards}</div>
<div id="ov-routes-panel" style="display:none" class="mt-4">
    <div id="ov-routes-panel-inner"></div>
</div>`;

        // Store data for click handler
        container._ovSorted  = sorted;
        container._ovMonths  = months;
        container._ovSelected = null;

        // Delegated click listener on the cards grid
        const grid = document.getElementById('ov-cards-grid');
        if (grid) {
            grid.addEventListener('click', e => {
                const card = e.target.closest('.ov-airline-card');
                if (!card) return;
                ovSelectAirline(Number(card.dataset.ovIdx));
            });
        }

        function ovSelectAirline(idx) {
            const panel  = document.getElementById('ov-routes-panel');
            const inner  = document.getElementById('ov-routes-panel-inner');
            if (!panel || !inner) return;

            // Toggle off if same card clicked again
            if (container._ovSelected === idx) {
                container._ovSelected = null;
                panel.style.display = 'none';
                document.querySelectorAll('.ov-airline-card').forEach(c => {
                    c.style.outline = '';
                    const ci = c.dataset.ovIdx;
                    const chv = c.querySelector(`.ov-chv-${ci}`);
                    if (chv) chv.style.transform = '';
                });
                return;
            }
            container._ovSelected = idx;

            // Highlight selected card
            document.querySelectorAll('.ov-airline-card').forEach(c => {
                const ci = c.dataset.ovIdx;
                const chv = c.querySelector(`.ov-chv-${ci}`);
                if (Number(ci) === idx) {
                    c.style.outline = `2px solid ${sorted[idx].data.meta.color}`;
                    if (chv) chv.style.transform = 'rotate(180deg)';
                } else {
                    c.style.outline = '';
                    if (chv) chv.style.transform = '';
                }
            });

            const entry  = sorted[idx];
            const meta   = entry.data.meta;
            const mths   = container._ovMonths || [];

            // Sort routes: activas esta semana primero, luego históricas
            const routesSorted = Object.values(entry.data.routes)
                .map(rt => {
                    const vals         = mths.map(mk => rt.months[mk] || 0);
                    const iataUp       = (rt.iata || '?').toUpperCase();
                    const isActive     = entry.activeSet.has(iataUp);
                    const lastActiveMk = isActive ? null
                        : ([...mths].reverse().find(mk => (rt.months[mk] || 0) > 0) || null);
                    return { ...rt, values: vals, total: vals.reduce((s,v)=>s+v,0), isActive, lastActiveMk };
                })
                .sort((a, b) => {
                    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                    return b.total - a.total;
                });

            function routeTrendBadge(values) {
                const first = values.find(v => v > 0) || 0;
                const last  = [...values].reverse().find(v => v > 0) || 0;
                if (!first && !last) return '';
                if (!first) return '<span class="badge bg-success" style="font-size:.6rem">Nuevo</span>';
                const pct = ((last - first) / first * 100).toFixed(1);
                if (Number(pct) > 0) return `<span class="badge bg-success" style="font-size:.6rem">+${pct}%</span>`;
                if (Number(pct) < 0) return `<span class="badge bg-danger" style="font-size:.6rem">${pct}%</span>`;
                return '';
            }

            function buildRouteCard(rt) {
                const { src: imgSrc, fallback: imgFallback } = destImageSrc(rt.iata, rt.city);
                const defFallback = 'images/icons/destino-default.svg';
                const onerrorAttr = imgFallback
                    ? `this.src='${imgFallback}';this.onerror=function(){this.onerror=null;this.src='${defFallback}'}`
                    : `this.onerror=null;this.src='${defFallback}'`;

                const monthCells = mths.map((mk, i) => {
                    const v    = rt.values[i];
                    const prev = i > 0 ? rt.values[i-1] : null;
                    let bg = 'transparent', ico = '';
                    if (prev !== null && v !== prev) {
                        bg  = v > prev ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)';
                        ico = v > prev ? '<i class="fas fa-arrow-up text-success" style="font-size:.55rem"></i>'
                                       : '<i class="fas fa-arrow-down text-danger" style="font-size:.55rem"></i>';
                    }
                    return `<div style="text-align:center;min-width:44px;padding:3px 4px;border-radius:4px;background:${bg}">
<div style="font-size:.6rem;color:rgba(255,255,255,.65)">${monthShort(mk)}</div>
<div style="font-size:.8rem;font-weight:700;color:#fff">${v > 0 ? v : '—'} ${ico}</div>
</div>`;
                }).join('');

                const topBadge = rt.isActive
                    ? `<div style="position:absolute;top:8px;right:10px;background:rgba(0,0,0,.55);color:#fff;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:20px;backdrop-filter:blur(4px)">${rt.total} freq</div>`
                    : `<div style="position:absolute;top:8px;right:10px;background:rgba(100,60,0,.85);color:#fde68a;font-size:.63rem;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap"><i class="fas fa-history" style="font-size:.55rem"></i> Operó hasta ${rt.lastActiveMk ? monthShort(rt.lastActiveMk) + ' ' + rt.lastActiveMk.split('-')[0] : '—'}</div>`;

                return `<div class="col"><div class="card border-0 overflow-hidden" style="border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.18);${!rt.isActive ? 'opacity:.7' : ''}">
    <div style="position:relative;height:150px;overflow:hidden;flex-shrink:0">
        <img src="${imgSrc}" onerror="${onerrorAttr}"
            style="width:100%;height:100%;object-fit:cover;display:block;${!rt.isActive ? 'filter:grayscale(60%)' : ''}">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.1) 55%,transparent 100%)"></div>
        <div style="position:absolute;bottom:10px;left:12px;right:8px">
            <div style="font-size:1rem;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.1">${rt.city}</div>
            <span style="font-size:.65rem;background:rgba(255,255,255,.2);color:#fff;border-radius:4px;padding:1px 6px;backdrop-filter:blur(4px)">${rt.iata}</span>
            <span style="float:right;margin-top:2px">${rt.isActive ? routeTrendBadge(rt.values) : ''}</span>
        </div>
        ${topBadge}
    </div>
    <div style="background:#1e293b;padding:8px 10px;display:flex;flex-wrap:wrap;gap:2px">${monthCells}</div>
</div></div>`;
            }

            const activeRoutes   = routesSorted.filter(r => r.isActive);
            const inactiveRoutes = routesSorted.filter(r => !r.isActive);

            const activeCount   = activeRoutes.length;
            const inactiveCount = inactiveRoutes.length;
            const activeIatas   = activeRoutes.map(r => `<strong>${r.iata}</strong> ${r.city}`).join(' · ');
            const routeSummary  = `${activeCount} ruta${activeCount !== 1 ? 's' : ''} activa${activeCount !== 1 ? 's' : ''}`
                + (inactiveCount > 0 ? ` · <span style="color:#9ca3af;font-size:.8rem">${inactiveCount} histórica${inactiveCount !== 1 ? 's' : ''}</span>` : '')
                + ` · ${entry.total.toLocaleString()} frecuencias totales`;

            const contextNote = inactiveCount > 0 ? `
<div class="alert alert-info py-2 px-3 mb-3 small" style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);border-radius:8px;color:#93c5fd">
    <div class="mb-1"><i class="fas fa-check-circle me-1 text-success"></i><strong>Destinos activos (contemplados en el total):</strong> ${activeIatas}</div>
    <div><i class="fas fa-history me-1" style="color:#fde68a"></i><span style="color:#fbbf24">Destinos históricos: no operan en la semana actual y <strong>no están incluidos</strong> en el conteo de frecuencias totales.</span></div>
</div>` : '';

            const inactiveSection = inactiveCount > 0 ? `
<hr style="border-color:rgba(255,255,255,.12);margin:18px 0 10px">
<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3">${inactiveRoutes.map(buildRouteCard).join('')}</div>` : '';

            inner.innerHTML = `
<div style="border-left:4px solid ${meta.color};padding-left:14px;margin-bottom:12px">
    <div class="d-flex align-items-center gap-2">
        <img src="${meta.logo || 'images/airlines/default-airline-logo.svg'}"
            onerror="this.src='images/airlines/default-airline-logo.svg'"
            style="height:28px;max-width:80px;object-fit:contain">
        <div>
            <span class="fw-bold" style="font-size:1.05rem">${entry.name}</span>
            <span class="text-muted ms-2" style="font-size:.85rem">${routeSummary}</span>
        </div>
    </div>
</div>
${contextNote}
<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3">${activeRoutes.map(buildRouteCard).join('')}</div>
${inactiveSection}`;

            panel.style.display = 'block';
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ─── Destinos por Semana (diff semana-a-semana) ──────────────────────────
    function renderDestSummary() {
        const content = document.getElementById('dest-summary-content');
        if (!content) return;

        const weeks = allWeeks();
        if (!weeks.length) {
            content.innerHTML = '<p class="text-muted text-center p-4">Sin datos disponibles.</p>';
            return;
        }

        // Populate week selector
        const sel = document.getElementById('dest-summary-week-sel');
        if (sel) {
            const currentVal = sel.value;
            sel.innerHTML = weeks.map(w =>
                `<option value="${w.label}">${w.label}</option>`
            ).join('');
            sel.value = currentVal && weeks.some(w => w.label === currentVal)
                ? currentVal : weeks[weeks.length - 1].label;
        }

        const selectedWeek = sel ? sel.value : weeks[weeks.length - 1].label;
        const prevWeek     = previousLabel(selectedWeek);

        function getDestMap(type, weekLabel) {
            if (!weekLabel) return new Map();
            const rows = _raw[type].filter(r => r.week_label === weekLabel);
            const map  = new Map();
            rows.forEach(r => {
                const key = (r.iata || '').toUpperCase() || normCityKey(r.city);
                if (!map.has(key)) {
                    const { name } = canonicalCity(r.iata, r.city);
                    map.set(key, { iata: r.iata || '?', city: name || r.city || '?', freqs: 0 });
                }
                map.get(key).freqs += rowTotal(r);
            });
            return map;
        }

        // Inauguration: earliest valid_from across ALL weeks for each dest
        function getInaugMap(type) {
            const map = new Map();
            _raw[type].forEach(r => {
                const key = (r.iata || '').toUpperCase() || normCityKey(r.city);
                const vf  = r.valid_from || '';
                if (!map.has(key) || vf < map.get(key).vf) {
                    map.set(key, { vf, label: r.week_label || vf });
                }
            });
            return map;
        }

        function computeDiff(curr, prev) {
            const sortFn = (a, b) => a.city.localeCompare(b.city, 'es');
            const added = [], removed = [], unchanged = [];
            curr.forEach((dest, key) => {
                (prev.size && !prev.has(key) ? added : unchanged).push(dest);
            });
            if (prev.size) prev.forEach((dest, key) => { if (!curr.has(key)) removed.push(dest); });
            return { added: added.sort(sortFn), removed: removed.sort(sortFn), unchanged: unchanged.sort(sortFn) };
        }

        const PANELS = [
            { type: 'nac',   label: 'Nacional',               icon: 'fa-plane',           accent: '#2563eb' },
            { type: 'int',   label: 'Internacional Pasajeros', icon: 'fa-plane-departure', accent: '#059669' },
            { type: 'carga', label: 'Carga',                   icon: 'fa-box',             accent: '#d97706' }
        ];

        function chip(dest, status, inaugLabel) {
            const ST = {
                added:     { bg: '#dcfce7', color: '#166534', border: '#86efac', icon: 'fa-plus-circle' },
                removed:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: 'fa-minus-circle' },
                unchanged: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: null }
            };
            const s    = ST[status];
            const icon = s.icon ? `<i class="fas ${s.icon} me-1" style="font-size:.6rem;opacity:.8"></i>` : '';
            const esc  = (inaugLabel || '').replace(/"/g, '&quot;');
            const ecity = (dest.city || '').replace(/"/g, '&quot;');
            return `<span class="d-inline-flex align-items-center px-2 py-1 rounded-pill me-1 mb-1 _dest-chip"
                style="font-size:.7rem;font-weight:600;background:${s.bg};color:${s.color};border:1px solid ${s.border};white-space:nowrap;line-height:1.4;cursor:pointer;user-select:none"
                data-inaug="${esc}" data-iata="${dest.iata}" data-city="${ecity}"
                >${icon}<span style="opacity:.65;font-size:.6rem;margin-right:3px">${dest.iata}</span>${dest.city}</span>`;
        }

        function panelHtml(panel, diff, curr, prev, inaugMap) {
            const total    = curr.size;
            const prevSize = prev.size;
            let deltaHtml  = '';
            if (prevSize) {
                const d  = total - prevSize;
                const dc = d > 0 ? '#16a34a' : d < 0 ? '#dc2626' : '#94a3b8';
                const di = d > 0 ? 'fa-arrow-up' : d < 0 ? 'fa-arrow-down' : 'fa-minus';
                deltaHtml = `<span class="ms-2" style="font-size:.82rem;color:${dc};font-weight:700">
                    <i class="fas ${di} me-1" style="font-size:.7rem"></i>${d > 0 ? '+' : ''}${d} vs semana ant.
                </span>`;
            }
            const pills = [
                diff.added.length   ? `<span class="badge rounded-pill me-1" style="background:#dcfce7;color:#166534;border:1px solid #86efac;font-size:.68rem"><i class="fas fa-plus me-1"></i>${diff.added.length} nuevo${diff.added.length !== 1 ? 's' : ''}</span>` : '',
                diff.removed.length ? `<span class="badge rounded-pill" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-size:.68rem"><i class="fas fa-minus me-1"></i>${diff.removed.length} eliminado${diff.removed.length !== 1 ? 's' : ''}</span>` : ''
            ].filter(Boolean).join('');

            function getKey(d) { return (d.iata || '').toUpperCase() || normCityKey(d.city); }
            const chips = [
                ...diff.added.map(d     => chip(d, 'added',     (inaugMap.get(getKey(d)) || {}).label)),
                ...diff.unchanged.map(d => chip(d, 'unchanged', (inaugMap.get(getKey(d)) || {}).label)),
                ...diff.removed.map(d   => chip(d, 'removed',   (inaugMap.get(getKey(d)) || {}).label))
            ].join('');

            return `<div class="card border-0 shadow-sm h-100" style="border-radius:.85rem;overflow:hidden">
                <div class="card-header border-0 py-3 px-4" style="background:${panel.accent}14">
                    <div class="d-flex align-items-center flex-wrap gap-2">
                        <span class="fw-bold" style="color:${panel.accent};font-size:.95rem"><i class="fas ${panel.icon} me-2"></i>${panel.label}</span>
                        <span class="fw-bold ms-1" style="font-size:1.6rem;color:#0f172a;line-height:1">${total}</span>
                        <span class="text-muted" style="font-size:.78rem">destinos</span>
                        ${deltaHtml}
                        <div class="ms-auto">${pills}</div>
                    </div>
                </div>
                <div class="card-body px-4 py-3">
                    <div class="d-flex flex-wrap" style="gap:0">${chips || '<span class="text-muted small">Sin datos para esta semana.</span>'}</div>
                    <div class="mt-2" style="font-size:.65rem;color:#cbd5e1"><i class="fas fa-hand-pointer me-1"></i>Haz clic en un destino para ver su fecha de inauguración</div>
                </div>
            </div>`;
        }

        const panels = PANELS.map(p => {
            const curr     = getDestMap(p.type, selectedWeek);
            const prev     = getDestMap(p.type, prevWeek);
            const diff     = computeDiff(curr, prev);
            const inaugMap = getInaugMap(p.type);
            return `<div class="col-12 col-xl-4">${panelHtml(p, diff, curr, prev, inaugMap)}</div>`;
        }).join('');

        content.innerHTML = `<div class="row g-3">${panels}</div>`;
        _bindDestChipClicks(content);
    }

    function _bindDestChipClicks(container) {
        let popup = document.getElementById('_dest-inaug-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = '_dest-inaug-popup';
            popup.style.cssText = 'display:none;position:fixed;z-index:9999;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);border:1px solid #e2e8f0;padding:16px 18px 12px;min-width:240px;max-width:310px';
            popup.innerHTML =
                `<div style="position:absolute;top:8px;right:10px;cursor:pointer;color:#94a3b8;font-size:.85rem" onclick="document.getElementById('_dest-inaug-popup').style.display='none'"><i class="fas fa-times"></i></div>
                <div id="_dest-inaug-title" style="font-weight:700;font-size:.95rem;color:#0f172a;margin-bottom:10px;padding-right:18px"></div>
                <div style="font-size:.72rem;color:#64748b;margin-bottom:3px"><i class="fas fa-calendar-day me-2" style="color:#6366f1"></i>Primera semana registrada:</div>
                <div id="_dest-inaug-week" style="font-size:.8rem;font-weight:600;color:#1e293b;line-height:1.45;margin-bottom:10px"></div>
                <div style="font-size:.64rem;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px"><i class="fas fa-database me-1"></i>Primer registro en datos AIFA</div>`;
            document.body.appendChild(popup);
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#_dest-inaug-popup') && !e.target.closest('._dest-chip')) {
                    popup.style.display = 'none';
                }
            });
        }

        container.querySelectorAll('._dest-chip').forEach(function(chip) {
            chip.addEventListener('click', function(e) {
                e.stopPropagation();
                const inaug = chip.dataset.inaug || 'Sin datos';
                document.getElementById('_dest-inaug-title').textContent = chip.dataset.iata + ' · ' + chip.dataset.city;
                document.getElementById('_dest-inaug-week').textContent  = inaug;
                popup.style.display = 'block';
                const rect = chip.getBoundingClientRect();
                const pw   = popup.offsetWidth || 260;
                let left   = rect.left + rect.width / 2 - pw / 2;
                left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
                let top = rect.bottom + 8;
                if (top + 170 > window.innerHeight) top = rect.top - 170;
                popup.style.left = left + 'px';
                popup.style.top  = top + 'px';
            });
        });
    }

    // ─── UI helpers ─────────────────────────────────────────────────────────
    function setLoading(on) {
        const el = document.getElementById('freq-stats-loading');
        const ct = document.getElementById('freq-stats-content');
        if (el) el.classList.toggle('d-none', !on);
        if (ct) ct.classList.toggle('d-none', on);
    }

    // Muestra un mensaje en el spinner (sin ocultar nada)
    function setLoadingText(msg, isError) {
        const el = document.getElementById('freq-stats-loading');
        if (!el) return;
        el.classList.remove('d-none');
        document.getElementById('freq-stats-content') && document.getElementById('freq-stats-content').classList.add('d-none');
        if (isError) {
            el.innerHTML = '<div class="alert alert-danger d-inline-flex align-items-center gap-2"><i class="fas fa-exclamation-triangle"></i><span>' + msg + '</span></div>' +
                '<div class="mt-2"><button class="btn btn-sm btn-outline-secondary" onclick="FreqStats.refresh()"><i class="fas fa-redo me-1"></i>Reintentar</button></div>';
        } else {
            el.innerHTML = '<div class="spinner-border text-primary mb-2"></div><p class="text-muted small">' + msg + '</p>';
        }
    }

    function showError(msg) {
        setLoadingText(msg, true);
    }

    // ─── Expose ─────────────────────────────────────────────────────────────
    return { init, refresh, render, renderDestAnalysis: renderDestinationAnalysis, renderMonthlyAnalysis, renderAirlinesOverview, renderDestSummary };

})();

// ─── Hook: activate on tab click ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Estadísticas tab → full init (charts, KPIs, etc.)
    const tabBtn = document.getElementById('frecuencias-estadisticas-tab');
    if (tabBtn) {
        tabBtn.addEventListener('shown.bs.tab', () => FreqStats.init());
    }
    // Análisis tab → init data then render monthly analysis + dest summary
    const analisisBtn = document.getElementById('frecuencias-analisis-tab');
    if (analisisBtn) {
        analisisBtn.addEventListener('shown.bs.tab', () => {
            FreqStats.init().then(() => {
                try { FreqStats.renderMonthlyAnalysis(); } catch(_) {}
                try { FreqStats.renderDestSummary(); } catch(_) {}
            }).catch(() => {
                try { FreqStats.renderMonthlyAnalysis(); } catch(_) {}
            });
        });
    }
    // Destinos/Semana sub-tab → render on show
    const destTabBtn = document.getElementById('monthly-tab-dest');
    if (destTabBtn) {
        destTabBtn.addEventListener('shown.bs.tab', () => {
            try { FreqStats.renderDestSummary(); } catch(_) {}
        });
    }
    // Hook week selector change
    document.addEventListener('change', e => {
        if (e.target && e.target.id === 'freq-stats-week-select') FreqStats.render();
        // Destination analysis type filter
        if (e.target && e.target.id === 'dest-analysis-type') {
            try { FreqStats.renderDestAnalysis(); } catch(_) {}
        }
        if (e.target && e.target.id === 'monthly-analysis-type') {
            try { FreqStats.renderMonthlyAnalysis(); } catch(_) {}
        }
        // Destinos/Semana week selector
        if (e.target && e.target.id === 'dest-summary-week-sel') {
            try { FreqStats.renderDestSummary(); } catch(_) {}
        }
    });

    // Hook destination analysis text filter (debounced)
    document.addEventListener('input', (() => {
        let tDest = null, tMonth = null;
        return e => {
            if (e.target && e.target.id === 'dest-analysis-filter') {
                clearTimeout(tDest);
                tDest = setTimeout(() => { try { FreqStats.renderDestAnalysis(); } catch(_) {} }, 280);
            }
            if (e.target && e.target.id === 'monthly-analysis-filter') {
                clearTimeout(tMonth);
                tMonth = setTimeout(() => { try { FreqStats.renderMonthlyAnalysis(); } catch(_) {} }, 280);
            }
        };
    })());

    // Also refresh on section navigation
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-section="frecuencias-semana"]');
        if (link) {
            const tab = document.getElementById('frecuencias-estadisticas-tab');
            if (tab && tab.classList.contains('active')) setTimeout(() => FreqStats.init(), 100);
        }
    });
});
