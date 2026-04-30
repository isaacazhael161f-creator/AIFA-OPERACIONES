/* ===================================================================
   AIFA OPERACIONES — Asistente IA Integral
   js/agenda-assistant.js  (v3 — sin voz, alcance completo)

   Dominios de conocimiento:
     1. Destinos / Aeropuertos de AIFA
     2. Aerolíneas (pasajeros, carga, nacionales, internacionales)
     3. Frecuencias semanales y vuelos programados por destino
     4. Operaciones anuales / mensuales
     5. Agenda de Comités (sesiones, acuerdos)
   =================================================================== */

(function () {
    'use strict';

    /* ── Caché de datos cargados bajo demanda ───────────────────── */
    const _cache = {
        airports  : null,  // tabla aeropuertos
        airlines  : null,  // tabla Aerolíneas (mensual histórico)
        freqNac   : null,  // weekly_frequencies (nacional) – semana más reciente
        freqInt   : null,  // weekly_frequencies_int (internacional)
        freqCargo : null,  // weekly_frequencies_cargo (carga)
        annualOps : null,  // tabla annual_operations
    };

    /* ── Historial multi-turno ───────────────────────────────────── */
    const _convHistory = []; // { role: 'user'|'assistant', content: '...' }

    /* ══════════════════════════════════════════════════════════════
       GROQ — llamada a la API REST (OpenAI-compatible)
    ══════════════════════════════════════════════════════════════ */
    const GROQ_MODEL   = 'llama-3.3-70b-versatile';
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

    function _groqKey() {
        return localStorage.getItem('_aga_groq_key') || '';
    }

    async function _buildSystemPrompt() {
        const { comites, reuniones, ready } = _agData();
        const today    = new Date();
        const todayStr = today.toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        const userEmail = sessionStorage.getItem('user')
            ? (() => { try { return JSON.parse(sessionStorage.getItem('user')).email || ''; } catch { return ''; } })()
            : '';
        const userArea = typeof _agUserArea === 'function' ? _agUserArea() : '';

        let ctx = `Eres el asistente virtual de AIFA (Aeropuerto Internacional Felipe Ángeles). Respondes en español, de forma clara y concisa. Usa emojis con moderación.\n`;
        ctx += `Fecha de hoy: ${todayStr}.\n`;
        if (userEmail) ctx += `Usuario activo: ${userEmail}${userArea ? ` · Área: ${userArea}` : ''}.\n`;

        if (ready && comites.length) {
            ctx += `\n=== COMITÉS REGISTRADOS (${comites.length}) ===\n`;
            comites.forEach(c => {
                ctx += `• [${c.area}] ${c.acronimo ? c.acronimo + ' — ' : ''}${c.nombre}`;
                if (c.frecuencia) ctx += ` · ${c.frecuencia}`;
                if (c.presidente) ctx += ` · Presidente: ${c.presidente}`;
                ctx += '\n';
            });
        }

        if (ready && reuniones.length) {
            const limit = new Date(today.getTime() + 60 * 86400000);
            const upcoming = reuniones
                .filter(r => {
                    const d = new Date(r.fecha_sesion + 'T00:00:00');
                    return d >= today && d <= limit && r.estatus !== 'Cancelada';
                })
                .sort((a, b) => a.fecha_sesion.localeCompare(b.fecha_sesion))
                .slice(0, 30);

            if (upcoming.length) {
                ctx += `\n=== SESIONES PRÓXIMAS (60 días) ===\n`;
                upcoming.forEach(r => {
                    const c = comites.find(x => x.id === r.comite_id);
                    ctx += `• ${r.fecha_sesion}${r.hora_inicio ? ' ' + r.hora_inicio.slice(0,5) : ''} — `;
                    ctx += `${c ? (c.acronimo || c.nombre) : '?'} [${r.area}] · Sesión ${r.numero_sesion || '—'} · ${r.estatus}`;
                    if (r.observaciones) ctx += ` · Obs: ${r.observaciones}`;
                    ctx += '\n';
                });
            }
        }

        ctx += `\nSi te preguntan sobre datos que no aparecen en este contexto, responde lo que sepas de AIFA en general o indica que no tienes esa información disponible.`;
        return ctx;
    }

    async function _callGroq(userMessage) {
        const key = _groqKey();
        if (!key) return null; // sin key → fallback rule-based

        const systemPrompt = await _buildSystemPrompt();

        // Mantener máximo 20 turnos en el historial
        const historySlice = _convHistory.slice(-20);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...historySlice,
            { role: 'user', content: userMessage },
        ];

        const resp = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json',
                'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
                model      : GROQ_MODEL,
                messages,
                temperature: 0.7,
                max_tokens : 1024,
            }),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            if (resp.status === 401) throw new Error('API Key inválida. Configúrala con el ícono 🔑 del chat.');
            throw new Error(err?.error?.message || `Error ${resp.status} de Groq`);
        }

        const json   = await resp.json();
        const answer = json?.choices?.[0]?.message?.content?.trim();
        if (!answer) throw new Error('Groq no devolvió respuesta');
        return answer;
    }

    /* ── Cliente Supabase ────────────────────────────────────────── */
    function _sb() {
        return window.supabaseClient
            || window.dataManager?.client
            || null;
    }

    /* ── Normalizar texto ────────────────────────────────────────── */
    function _n(s) {
        return (s || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }

    /* ── Número formateado ───────────────────────────────────────── */
    function _fmt(n) {
        return typeof n === 'number'
            ? n.toLocaleString('es-MX')
            : (n ?? '—');
    }

    /* ══════════════════════════════════════════════════════════════
       LOADERS — carga lazy desde Supabase (con caché)
    ══════════════════════════════════════════════════════════════ */

    async function _loadAirports() {
        if (_cache.airports) return _cache.airports;
        const sb = _sb();
        if (!sb) return [];
        const { data } = await sb.from('aeropuertos').select('*').order('iata');
        _cache.airports = data || [];
        return _cache.airports;
    }

    async function _loadAirlines() {
        if (_cache.airlines) return _cache.airlines;
        const sb = _sb();
        if (!sb) return [];
        const { data } = await sb.from('Aerolíneas').select('*');
        if (!data?.length) { _cache.airlines = []; return []; }
        _cache.airlines = data.map(row => {
            const nombre = (row['AEROLINEA'] || row['AEROLINEA '] || 'Desconocida')
                .replace(/\bAEROUNION\b/gi, 'AEROUNIÓN')
                .replace(/\bAEROLINEAS\b/gi, 'AEROLÍNEAS')
                .replace(/\bAEROLINEA\b/gi, 'AEROLÍNEA')
                .replace(/\bAEREO\b/gi, 'AÉREO')
                .replace(/\bMAS DE CARGA\b/gi, 'MÁS DE CARGA')
                .replace(/\bCOMPANIA\b/gi, 'COMPAÑÍA')
                .replace(/\bCOMPAÑIA\b/gi, 'COMPAÑÍA')
                .replace(/\bMEXICO\b/gi, 'MÉXICO');
            const servicio = row['TIPO DE SERVICIO'] || '';
            const monthly  = {};
            const years    = { '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
            Object.keys(row).forEach(k => {
                const m = /^([a-z]{3})-(\d{2})$/.exec(k.toLowerCase().trim());
                if (m) {
                    const val = parseFloat(row[k]) || 0;
                    monthly[k.toLowerCase()] = val;
                    const yr = '20' + m[2];
                    if (yr in years) years[yr] += val;
                }
            });
            return { nombre, servicio, monthly, years };
        });
        return _cache.airlines;
    }

    async function _loadFreqLatest(table) {
        const key = table === 'weekly_frequencies'      ? 'freqNac'
                  : table === 'weekly_frequencies_int'   ? 'freqInt'
                  :                                        'freqCargo';
        if (_cache[key]) return _cache[key];
        const sb = _sb();
        if (!sb) return [];
        /* Semana más reciente disponible */
        const { data: latest } = await sb
            .from(table)
            .select('valid_from')
            .order('valid_from', { ascending: false })
            .limit(1);
        if (!latest?.length) { _cache[key] = []; return []; }
        const { data } = await sb
            .from(table)
            .select('*')
            .eq('valid_from', latest[0].valid_from);
        _cache[key] = data || [];
        return _cache[key];
    }

    async function _loadAnnualOps() {
        if (_cache.annualOps) return _cache.annualOps;
        const sb = _sb();
        if (!sb) return [];
        const { data } = await sb
            .from('annual_operations')
            .select('*')
            .order('year', { ascending: false });
        _cache.annualOps = data || [];
        return _cache.annualOps;
    }

    /* ── Acceso a datos de agenda cargados por agenda.js ─────────── */
    function _agData() {
        return (typeof _ag !== 'undefined')
            ? _ag
            : { comites: [], reuniones: [], ready: false };
    }

    /* ══════════════════════════════════════════════════════════════
       HELPERS — fechas y agenda
    ══════════════════════════════════════════════════════════════ */
    const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const MESES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];

    function _fmtDate(ds) {
        const d = new Date(ds + 'T00:00:00');
        return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
    }
    function _daysFromNow(ds) {
        const d = new Date(ds + 'T00:00:00'), t = new Date();
        t.setHours(0,0,0,0);
        return Math.ceil((d - t) / 86400000);
    }
    function _startOfWeek() {
        const d = new Date(); d.setHours(0,0,0,0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d;
    }
    function _endOfWeek() { const d = _startOfWeek(); d.setDate(d.getDate() + 6); return d; }

    const AREA_SYNS = {
        DO  : ['operacion','operaciones','do ','operativo'],
        DA  : ['administracion','administrativa','da '],
        DPE : ['planeacion','planeamiento','dpe','planeacion estrategica'],
        DCS : ['comercial','comerciales','dcs'],
        GSO : ['seguridad','seguridad operacional','gso'],
        UT  : ['transparencia','ut '],
        GC  : ['calidad','gestion de calidad','gc '],
        AFAC: ['afac','autoridad federal'],
    };
    function _matchArea(n) {
        for (const [key, syns] of Object.entries(AREA_SYNS)) {
            if (syns.some(s => n.includes(s) || n === s.trim())) return key;
        }
        return null;
    }
    function _matchComite(q) {
        const { comites } = _agData();
        const words = _n(q).split(' ').filter(w => w.length > 2);
        if (!words.length) return null;
        let best = null, bestScore = 0;
        comites.forEach(c => {
            const cn = _n((c.nombre || '') + ' ' + (c.acronimo || ''));
            const score = words.filter(w => cn.includes(w)).length;
            if (score > bestScore) { bestScore = score; best = c; }
        });
        return bestScore > 0 ? best : null;
    }

    /* ══════════════════════════════════════════════════════════════
       MOTOR DE RESPUESTA — Groq primero, rule-based como fallback
    ══════════════════════════════════════════════════════════════ */
    async function _agaAnswer(rawQuery) {
        const q = _n(rawQuery);

        // Respuesta de bienvenida (sin consumir API)
        if (/^(hola|hi|hey|buenas?|buenos?)/.test(q)) {
            const key = _groqKey();
            const h   = new Date().getHours();
            const gr  = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
            if (!key) {
                return `👋 ${gr}! Soy el asistente de AIFA.\n\nPara activar respuestas con **IA real** (Groq), toca el ícono 🔑 en la parte superior del chat e ingresa tu API Key.\n\nMientras tanto, puedo responder preguntas básicas de la **Agenda de Comités**.`;
            }
            return `👋 ${gr}! Soy el asistente de AIFA con **Groq ${GROQ_MODEL}**.\n\nPuedo ayudarte con:\n• Agenda de comités y sesiones\n• Operaciones del aeropuerto\n• Aerolíneas y destinos\n• Cualquier pregunta sobre AIFA`;
        }

        // Intentar Groq
        try {
            const groqAnswer = await _callGroq(rawQuery);
            if (groqAnswer) {
                // Guardar en historial
                _convHistory.push({ role: 'user',      content: rawQuery   });
                _convHistory.push({ role: 'assistant',  content: groqAnswer });
                // Limitar a 40 mensajes (20 turnos)
                if (_convHistory.length > 40) _convHistory.splice(0, _convHistory.length - 40);
                return groqAnswer;
            }
        } catch (err) {
            // Error de autenticación o red → mostrar al usuario
            return `⚠️ ${err.message}`;
        }

        // Sin key → rule-based
        if (/ayuda|help|que puedes|para que sirves|como funciona|que sabes/.test(q)) {
            return `💡 **¿Qué puedo hacer?**\n\n**📅 Próximas sesiones:**\n• "¿Cuándo es la próxima sesión?"\n• "¿Cuándo es el COCOA?"\n\n**⏰ Horarios:**\n• "¿A qué hora es el comité de calidad?"\n\n**📆 Esta semana / mes:**\n• "¿Qué sesiones hay esta semana?"\n\n**🗂️ Comités:**\n• "Lista de comités"\n• "Comités de DO"\n\n_Activa la IA con el ícono 🔑 para respuestas mucho más completas._`;
        }
        return _respAgenda(q);
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: DESTINOS
    ══════════════════════════════════════════════════════════════ */
    async function _respDestinos(q) {
        const [freqNac, freqInt, freqCargo] = await Promise.all([
            _loadFreqLatest('weekly_frequencies'),
            _loadFreqLatest('weekly_frequencies_int'),
            _loadFreqLatest('weekly_frequencies_cargo'),
        ]);

        const toMap = rows => {
            const m = new Map();
            rows.forEach(r => { if (r.city && !m.has(r.iata)) m.set(r.iata, r.city); });
            return m;
        };
        const nacMap   = toMap(freqNac);
        const intMap   = toMap(freqInt);
        const cargoMap = toMap(freqCargo);

        const isNac   = /nacionales?|domestico|interior/.test(q);
        const isInt   = /internacionales?|exterior/.test(q);
        const isCargo = /carga/.test(q);

        const fmtList = (map, emoji, label) => {
            const sorted = [...map.entries()].sort((a,b) => a[1].localeCompare(b[1]));
            const lines  = sorted.map(([iata, city]) => `• **${city}** _(${iata})_`);
            return `${emoji} **${label} (${sorted.length}):**\n${lines.join('\n')}`;
        };

        if (isNac)   return fmtList(nacMap,   '🇲🇽', 'Destinos nacionales de AIFA');
        if (isInt)   return fmtList(intMap,   '🌎', 'Destinos internacionales de AIFA');
        if (isCargo) return fmtList(cargoMap, '📦', 'Destinos de carga de AIFA');

        /* Resumen general */
        const allDest = new Set([...nacMap.keys(), ...intMap.keys(), ...cargoMap.keys()]);
        return `✈️ **Destinos operados desde AIFA:**\n\n• 🇲🇽 **Nacionales:** ${nacMap.size} destinos\n• 🌎 **Internacionales:** ${intMap.size} destinos\n• 📦 **Carga:** ${cargoMap.size} destinos\n\n**Total: ${allDest.size} destinos únicos.**\n\n_Pregunta más: "Destinos nacionales", "Destinos internacionales", "Vuelos a [ciudad]"_`;
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: VUELOS A UN DESTINO ESPECÍFICO
    ══════════════════════════════════════════════════════════════ */
    async function _respVuelosADestino(q) {
        const [freqNac, freqInt, freqCargo] = await Promise.all([
            _loadFreqLatest('weekly_frequencies'),
            _loadFreqLatest('weekly_frequencies_int'),
            _loadFreqLatest('weekly_frequencies_cargo'),
        ]);

        const destWord = _extractDestino(q);
        if (!destWord) {
            return `✈️ ¿A qué destino quieres consultar vuelos?\nEjemplo: "Vuelos a Palenque" o "Frecuencias a Monterrey"`;
        }

        const match = r => _n(r.city || '').includes(destWord)
                        || _n(r.iata  || '').includes(destWord)
                        || _n(r.state || '').includes(destWord);

        const nacRows   = freqNac.filter(match);
        const intRows   = freqInt.filter(match);
        const cargoRows = freqCargo.filter(match);
        const allRows   = [...nacRows, ...intRows, ...cargoRows];

        if (!allRows.length) {
            const allCities = [
                ...freqNac.map(r => r.city),
                ...freqInt.map(r => r.city),
                ...freqCargo.map(r => r.city),
            ].filter(Boolean);
            const similar = [...new Set(allCities)]
                .filter(c => _n(c).includes(destWord.slice(0,4)))
                .slice(0, 5);
            let msg = `🔍 No encontré vuelos a **"${destWord}"** en el itinerario actual.`;
            if (similar.length) msg += `\n\n¿Quisiste decir?\n${similar.map(c => `• ${c}`).join('\n')}`;
            return msg;
        }

        const cityName  = allRows[0].city;
        const iataCode  = allRows[0].iata;
        const weekLabel = allRows[0].week_label;

        let resp = `✈️ **Vuelos desde AIFA a ${cityName}** _(${iataCode})_\n_Semana: ${weekLabel}_\n\n`;

        const DIAS_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        const DIAS_KEYS   = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        const fmtRow = (r, tipo) => {
            const operaDias = DIAS_KEYS.map((d,i) => r[d] > 0 ? DIAS_LABELS[i] : null).filter(Boolean);
            return `• **${r.airline}** — ${operaDias.length ? operaDias.join(', ') : 'sin días registrados'} · _${r.weekly_total} frecuencias/semana_ [${tipo}]`;
        };

        const groupByAirline = rows => {
            const byAl = {};
            rows.forEach(r => {
                if (!byAl[r.airline]) { byAl[r.airline] = { ...r }; }
                else { byAl[r.airline].weekly_total += r.weekly_total; }
            });
            return Object.values(byAl);
        };

        if (nacRows.length) {
            resp += `🇲🇽 **Nacional:**\n`;
            groupByAirline(nacRows).forEach(r => { resp += fmtRow(r, 'PAX') + '\n'; });
        }
        if (intRows.length) {
            resp += `\n🌎 **Internacional:**\n`;
            groupByAirline(intRows).forEach(r => { resp += fmtRow(r, 'INT') + '\n'; });
        }
        if (cargoRows.length) {
            resp += `\n📦 **Carga:**\n`;
            groupByAirline(cargoRows).forEach(r => { resp += fmtRow(r, 'CARGA') + '\n'; });
        }

        const totalSemanal = allRows.reduce((s,r) => s + (r.weekly_total || 0), 0);
        resp += `\n**Total: ${totalSemanal} frecuencias/semana**`;
        return resp;
    }

    /* ── Extraer nombre de destino ───────────────────────────────── */
    function _extractDestino(q) {
        const patterns = [
            /(?:vuelos?|frecuencias?|ruta|destino|programa\w*\s+a|viaje\s+a|salida\s+a)\s+(?:a\s+)?(?:el\s+|la\s+|los\s+|las\s+)?([a-záéíóúüñ\s]{3,25?})(?:\s*[\?.!,]|$)/i,
            /\ba\s+([a-záéíóúüñ\s]{4,20?})\s*(?:\?|\.|\!|$)/i,
        ];
        for (const p of patterns) {
            const m = p.exec(q);
            if (m?.[1]) {
                const dest = m[1].trim().replace(/\s+/g, ' ');
                const STOPS = new Set(['aifa','vuelos','frecuencias','programados','tiene','hay','cuantos','semana','diarios','destino','destinos']);
                if (!STOPS.has(dest)) return dest;
            }
        }
        const STOPS = new Set(['vuelos','frecuencias','programados','programadas','destino','hacia','tiene','hay','aifa','cuantos','cuantas','ruta','rutas','semana','semanas','diarios','diarias','vuela','esta','quiero','saber']);
        const words = q.split(' ').filter(w => w.length >= 4 && !STOPS.has(w));
        return words[0] || null;
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: AEROLÍNEAS (lista por tipo)
    ══════════════════════════════════════════════════════════════ */
    async function _respAerolineas(q) {
        const airlines = await _loadAirlines();
        if (!airlines.length) return '⚠️ No se pudieron cargar los datos de aerolíneas. Intenta de nuevo.';

        const isNac   = /nacionales?|domestica|interior|pasajeros?/.test(q);
        const isInt   = /internacionales?|exterior/.test(q);
        const isCargo = /carga/.test(q);

        let filtradas = airlines;
        if (isCargo) {
            filtradas = airlines.filter(a => _n(a.servicio).includes('carga'));
        } else if (isInt) {
            filtradas = airlines.filter(a => _n(a.servicio).includes('internacional'));
        } else if (isNac) {
            filtradas = airlines.filter(a => {
                const s = _n(a.servicio);
                return s.includes('nacional') || s.includes('pasajero') || (s.includes('regular') && !s.includes('carga'));
            });
        }

        /* Solo las que tienen actividad reciente */
        const activas = filtradas.filter(a => (a.years['2025']||0) + (a.years['2026']||0) > 0);
        const lista   = activas.length ? activas : filtradas;
        if (!lista.length) return `🔍 No encontré aerolíneas para ese criterio. Prueba: "aerolíneas de pasajeros", "de carga" o "internacionales".`;

        const tipoLabel = isCargo ? 'de carga' : isInt ? 'internacionales' : isNac ? 'nacionales de pasajeros' : 'que operan en AIFA';
        const lines = lista
            .sort((a,b) => ((b.years['2025']||0)+(b.years['2026']||0)) - ((a.years['2025']||0)+(a.years['2026']||0)))
            .map(a => {
                const total = (a.years['2025']||0) + (a.years['2026']||0);
                return `• **${a.nombre}**${total > 0 ? ` — _${_fmt(total)} ops (2025–2026)_` : ''}`;
            });

        let resp = `✈️ **Aerolíneas ${tipoLabel} (${lista.length}):**\n${lines.join('\n')}`;
        if (activas.length && activas.length < filtradas.length) {
            resp += `\n\n_Con actividad reciente. Total en catálogo: ${filtradas.length}_`;
        }
        return resp;
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: INFO / OPS DE UNA AEROLÍNEA ESPECÍFICA
    ══════════════════════════════════════════════════════════════ */
    async function _respInfoAerolinea(q) {
        const airlines = await _loadAirlines();
        if (!airlines.length) return '⚠️ No se pudieron cargar datos de aerolíneas.';

        const words = q.split(' ').filter(w => w.length > 3);
        let best = null, bestScore = 0;
        airlines.forEach(a => {
            const nm = _n(a.nombre);
            const score = words.filter(w => nm.includes(w)).length;
            if (score > bestScore) { bestScore = score; best = a; }
        });

        if (!best || bestScore === 0) {
            return `🔍 No identifiqué la aerolínea. Intenta: "operaciones de Volaris en 2025" o "info de Aeroméxico".`;
        }

        const [freqNac, freqInt, freqCargo] = await Promise.all([
            _loadFreqLatest('weekly_frequencies'),
            _loadFreqLatest('weekly_frequencies_int'),
            _loadFreqLatest('weekly_frequencies_cargo'),
        ]);
        const nm = _n(best.nombre);
        const matchAl = r => _n(r.airline).includes(nm) || nm.includes(_n(r.airline).slice(0,6));
        const destinos = [
            ...freqNac.filter(matchAl).map(r => r.city),
            ...freqInt.filter(matchAl).map(r => r.city),
            ...freqCargo.filter(matchAl).map(r => r.city),
        ].filter(Boolean);
        const uniqueDest = [...new Set(destinos)];

        let resp = `✈️ **${best.nombre}**\n`;
        if (best.servicio) resp += `Tipo de servicio: _${best.servicio}_\n`;
        resp += `\n📊 **Operaciones por año:**\n`;
        ['2023','2024','2025','2026'].forEach(yr => {
            const tot = best.years[yr] || 0;
            if (tot > 0) resp += `• **${yr}:** ${_fmt(tot)} operaciones\n`;
        });
        if (uniqueDest.length) {
            resp += `\n🗺️ **Destinos actuales (${uniqueDest.length}):**\n`;
            resp += uniqueDest.map(c => `• ${c}`).join('\n');
        } else {
            resp += `\n_Sin frecuencias semanales activas registradas actualmente._`;
        }
        return resp;
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: OPERACIONES ANUALES
    ══════════════════════════════════════════════════════════════ */
    async function _respOperaciones(q) {
        const annualRows = await _loadAnnualOps();
        const yr1Match   = /\b(20\d{2})\b/.exec(q);
        const yr1        = yr1Match ? yr1Match[1] : null;
        const restQ      = yr1 ? q.replace(yr1, '') : q;
        const yr2Match   = /\b(20\d{2})\b/.exec(restQ);
        const yr2        = yr2Match ? yr2Match[1] : null;
        const isVs       = /vs|versus|comparar|comparativa|frente a/.test(q);

        if (annualRows.length) {
            if (yr1 && !isVs) {
                const row = annualRows.find(r => String(r.year) === yr1);
                if (!row) return `📊 No hay datos registrados para el año **${yr1}**.`;
                const total = row.total_ops || row.total_operations || row.operaciones || 0;
                let resp = `📊 **Operaciones en ${yr1}: ${_fmt(total)}**\n`;
                if (row.arrivals)   resp += `• Llegadas: ${_fmt(row.arrivals)}\n`;
                if (row.departures) resp += `• Salidas:  ${_fmt(row.departures)}\n`;
                if (row.passengers) resp += `• Pasajeros transportados: ${_fmt(row.passengers)}\n`;
                return resp;
            }
            if (isVs && yr1 && yr2) {
                const r1 = annualRows.find(r => String(r.year) === yr1);
                const r2 = annualRows.find(r => String(r.year) === yr2);
                if (!r1 || !r2) return `📊 No se encontraron datos para comparar ${yr1} vs ${yr2}.`;
                const v1 = r1.total_ops||r1.total_operations||0, v2 = r2.total_ops||r2.total_operations||0;
                const diff = v1 - v2;
                const pct  = v2 > 0 ? ((diff/v2)*100).toFixed(1) : '—';
                const icon = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';
                return `${icon} **${yr1} vs ${yr2}:**\n• ${yr1}: ${_fmt(v1)} ops\n• ${yr2}: ${_fmt(v2)} ops\n• Diferencia: **${diff > 0 ? '+' : ''}${_fmt(diff)}** (${pct}%)`;
            }
            /* Resumen general */
            const sorted = [...annualRows].sort((a,b) => b.year - a.year).slice(0, 6);
            const lines  = sorted.map(r => {
                const t = r.total_ops||r.total_operations||r.operaciones||0;
                return `• **${r.year}:** ${_fmt(t)} operaciones`;
            });
            const best = [...annualRows].sort((a,b) =>
                (b.total_ops||b.total_operations||0) - (a.total_ops||a.total_operations||0)
            )[0];
            return `📊 **Operaciones anuales en AIFA:**\n${lines.join('\n')}\n\n_Año récord: **${best.year}** · ${_fmt(best.total_ops||best.total_operations||0)} ops_`;
        }

        /* Fallback: calcular desde tabla Aerolíneas */
        const airlines = await _loadAirlines();
        if (!airlines.length) return '⚠️ No hay datos de operaciones disponibles.';
        const totByYear = { '2023':0, '2024':0, '2025':0, '2026':0 };
        airlines.forEach(a => {
            Object.keys(totByYear).forEach(yr => { totByYear[yr] += (a.years[yr]||0); });
        });
        if (yr1 && totByYear[yr1] !== undefined) {
            return `📊 **Operaciones en ${yr1}: ${_fmt(totByYear[yr1])}**\n_Dato calculado sumando todas las aerolíneas del catálogo._`;
        }
        const lines = Object.entries(totByYear).filter(([,v]) => v > 0)
            .sort((a,b) => b[0].localeCompare(a[0]))
            .map(([yr,v]) => `• **${yr}:** ${_fmt(v)} operaciones`);
        const best = Object.entries(totByYear).sort((a,b) => b[1]-a[1])[0];
        return `📊 **Operaciones anuales en AIFA:**\n${lines.join('\n')}\n\n_Año con más operaciones registradas: **${best[0]}** · ${_fmt(best[1])}_`;
    }

    /* ══════════════════════════════════════════════════════════════
       RESPUESTA: AGENDA DE COMITÉS
    ══════════════════════════════════════════════════════════════ */
    function _respAgenda(q) {
        const { comites, reuniones, ready } = _agData();
        if (!ready) return '⏳ Los datos de Agenda están cargando. Espera un momento e inténtalo de nuevo.';

        const today    = new Date(); today.setHours(0,0,0,0);
        const userArea = (typeof _agUserArea === 'function') ? _agUserArea() : null;
        const isAdmin  = (typeof _agIsAdmin  === 'function') ? _agIsAdmin()  : true;

        const upcoming = reuniones
            .filter(r => new Date(r.fecha_sesion + 'T00:00:00') >= today && r.estatus !== 'Cancelada')
            .sort((a,b) => a.fecha_sesion.localeCompare(b.fecha_sesion));

        /* PRÓXIMA sesión */
        if (/proxi(m|n)|siguient|cuand(o es|o hay|o sera)|cuando|prox/.test(q)) {
            const comite = _matchComite(q);
            const area   = _matchArea(q) || (!isAdmin && !comite ? userArea : null);
            let pool = upcoming;
            if (comite) pool = pool.filter(r => r.comite_id === comite.id);
            else if (area) pool = pool.filter(r => r.area === area);
            if (!pool.length) return `📭 No hay sesiones próximas ${comite ? 'para **'+(comite.acronimo||comite.nombre)+'**' : ''}.`;
            const r = pool[0];
            const c = comites.find(x => x.id === r.comite_id) || {};
            const diff    = _daysFromNow(r.fecha_sesion);
            const diffTxt = diff === 0 ? '¡es **hoy**! 🎉' : diff === 1 ? 'es **mañana**' : `es en **${diff} días**`;
            const hora    = r.hora_inicio ? ` a las **${r.hora_inicio.slice(0,5)} h**` : '';
            return `📅 La próxima sesión ${diffTxt}.\n**${_fmtDate(r.fecha_sesion)}**${hora}.\n_${c.acronimo||c.nombre||'—'} · Sesión ${r.numero_sesion||'—'} · ${r.estatus}_`;
        }
        /* HORA */
        if (/que hora|a que hora|horario de|hora de|a que hora es/.test(q)) {
            const comite = _matchComite(q);
            const area   = _matchArea(q) || (!isAdmin && !comite ? userArea : null);
            let pool = upcoming;
            if (comite) pool = pool.filter(r => r.comite_id === comite.id);
            else if (area) pool = pool.filter(r => r.area === area);
            if (!pool.length) return '⏰ No encontré sesiones próximas para consultar la hora.';
            const r = pool[0];
            const c = comites.find(x => x.id === r.comite_id) || {};
            if (!r.hora_inicio) return `⏰ La sesión de **${c.acronimo||c.nombre}** (${_fmtDate(r.fecha_sesion)}) aún no tiene hora registrada.`;
            return `⏰ La próxima sesión de **${c.acronimo||c.nombre}** es el **${_fmtDate(r.fecha_sesion)}** a las **${r.hora_inicio.slice(0,5)} h**.`;
        }
        /* ESTA SEMANA */
        if (/esta semana|semana/.test(q)) {
            const sw = _startOfWeek(), ew = _endOfWeek();
            let pool = upcoming.filter(r => {
                const d = new Date(r.fecha_sesion + 'T00:00:00');
                return d >= sw && d <= ew;
            });
            const area = _matchArea(q) || (!isAdmin ? userArea : null);
            if (area) pool = pool.filter(r => r.area === area);
            if (!pool.length) return '📆 No hay sesiones esta semana.';
            const lines = pool.map(r => {
                const c = comites.find(x => x.id === r.comite_id) || {};
                return `• **${_fmtDate(r.fecha_sesion)}**${r.hora_inicio ? ' · '+r.hora_inicio.slice(0,5)+'h' : ''} — ${c.acronimo||c.nombre||'—'} [${r.area}]`;
            });
            return `📆 **Sesiones esta semana (${pool.length}):**\n${lines.join('\n')}`;
        }
        /* ESTE MES */
        if (/este mes|mes actual|del mes/.test(q)) {
            const mm = today.getMonth(), yy = today.getFullYear();
            let pool = upcoming.filter(r => {
                const d = new Date(r.fecha_sesion + 'T00:00:00');
                return d.getMonth() === mm && d.getFullYear() === yy;
            });
            const area = _matchArea(q) || (!isAdmin ? userArea : null);
            if (area) pool = pool.filter(r => r.area === area);
            if (!pool.length) return '📅 No hay sesiones pendientes este mes.';
            const lines = pool.map(r => {
                const c = comites.find(x => x.id === r.comite_id) || {};
                return `• ${_fmtDate(r.fecha_sesion)}${r.hora_inicio ? ' · '+r.hora_inicio.slice(0,5)+'h' : ''} — **${c.acronimo||c.nombre}**`;
            });
            return `📅 **Sesiones pendientes en ${MESES[mm]} (${pool.length}):**\n${lines.join('\n')}`;
        }
        /* RESUMEN */
        if (/resumen|cuantas|total|faltan|pendiente/.test(q)) {
            const area = _matchArea(q);
            let pool   = area ? upcoming.filter(r => r.area === area)
                              : (!isAdmin && userArea ? upcoming.filter(r => r.area === userArea) : upcoming);
            if (!pool.length) return '✅ ¡No quedan sesiones pendientes!';
            const porArea = {};
            pool.forEach(r => { porArea[r.area] = (porArea[r.area]||0) + 1; });
            const lines = Object.entries(porArea).sort((a,b)=>b[1]-a[1])
                .map(([a,n]) => `• **${a}**: ${n} sesión${n>1?'es':''}`);
            return `📊 **${pool.length} sesión${pool.length>1?'es':''} pendiente${pool.length>1?'s':''}:**\n${lines.join('\n')}`;
        }
        /* INFO COMITÉ */
        if (/que es|informacion|descripcion|objetivo|quien preside/.test(q)) {
            const comite = _matchComite(q);
            if (!comite) return '🔍 ¿De qué comité necesitas información? Dime el nombre o las siglas.';
            let resp = `📋 **${comite.nombre}**\n`;
            if (comite.acronimo)    resp += `_${comite.acronimo}_\n`;
            if (comite.area)        resp += `Área: **${comite.area}**\n`;
            if (comite.frecuencia)  resp += `Frecuencia: ${comite.frecuencia}\n`;
            if (comite.presidente)  resp += `Presidente: ${comite.presidente}\n`;
            if (comite.hora_sesion) resp += `Hora habitual: ${comite.hora_sesion.slice(0,5)} h\n`;
            if (comite.descripcion) resp += `\n${comite.descripcion}`;
            return resp;
        }
        /* LISTAR COMITÉS */
        if (/comites?\s*(de|del|en)?|lista.*comite|listar.*comite|hay comit/.test(q) || _matchArea(q)) {
            const area  = _matchArea(q) || (!isAdmin ? userArea : null);
            const lista = area ? comites.filter(c => c.area === area) : comites;
            if (!lista.length) return '🔍 No encontré comités para ese criterio.';
            const lines = lista.map(c => `• **${c.acronimo||'#'+c.numero}** — ${c.nombre}`);
            return `🗂️ **Comités ${area ? 'del área **'+area+'**' : '(todas las áreas)'} (${lista.length}):**\n${lines.join('\n')}`;
        }
        /* Por nombre de comité */
        const comite = _matchComite(q);
        if (comite) {
            const next = upcoming.find(r => r.comite_id === comite.id);
            let resp = `📋 **${comite.acronimo||comite.nombre}** — ${comite.nombre}\nÁrea: **${comite.area}**`;
            if (next) {
                resp += `\nPróxima sesión: **${_fmtDate(next.fecha_sesion)}**`;
                if (next.hora_inicio) resp += ` a las **${next.hora_inicio.slice(0,5)} h**`;
                resp += ` _(en ${_daysFromNow(next.fecha_sesion)} días)_`;
            } else {
                resp += '\nSin sesiones próximas registradas.';
            }
            return resp;
        }
        return `🤔 No entendí esa consulta de Agenda. Prueba:\n• "¿Cuándo es la próxima sesión?"\n• "Sesiones de esta semana"\n• "Lista de comités de DO"`;
    }

    /* ══════════════════════════════════════════════════════════════
       RENDER — markdown básico a HTML seguro
    ══════════════════════════════════════════════════════════════ */
    function _renderMd(text) {
        return text
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/_(.+?)_/g,'<em>$1</em>')
            .replace(/\n/g,'<br>');
    }

    /* ══════════════════════════════════════════════════════════════
       CHAT UI
    ══════════════════════════════════════════════════════════════ */
    function _agaAddMsg(role, text) {
        const box = document.getElementById('_aga-messages');
        if (!box) return;
        const div = document.createElement('div');
        div.className = `_aga-msg _aga-msg-${role}`;
        div.innerHTML = `<div class="_aga-bubble">${_renderMd(text)}</div>`;
        box.appendChild(div);
        div.scrollIntoView({ behavior:'smooth', block:'end' });
    }

    async function _agaSend() {
        const inp  = document.getElementById('_aga-input');
        const text = inp?.value.trim();
        if (!text) return;
        inp.value = '';
        _agaAddMsg('user', text);

        const box    = document.getElementById('_aga-messages');
        const typing = document.createElement('div');
        typing.className = '_aga-msg _aga-msg-bot _aga-typing';
        typing.innerHTML = '<div class="_aga-bubble"><span></span><span></span><span></span></div>';
        box?.appendChild(typing);
        typing.scrollIntoView({ behavior:'smooth', block:'end' });

        try {
            if (typeof _agEnsureData === 'function') await _agEnsureData();
            const answer = await _agaAnswer(text);
            typing.remove();
            _agaAddMsg('bot', answer);
        } catch(err) {
            typing.remove();
            _agaAddMsg('bot', `⚠️ Error al procesar la consulta: ${err.message || err}`);
        }
    }
    window._agaSend = _agaSend;

    window._agaQuick = function(txt) {
        const inp = document.getElementById('_aga-input');
        if (inp) inp.value = txt;
        _agaSend();
    };

    /* Configurar API Key de Groq */
    window._agaConfigKey = function() {
        const current = _groqKey();
        const newKey  = prompt(
            '🔑 Ingresa tu API Key de Groq\n(obtén una gratis en console.groq.com)\n\nDeja vacío para borrarla.',
            current ? '••••••••' + current.slice(-4) : ''
        );
        if (newKey === null) return; // canceló
        const trimmed = newKey.trim();
        if (!trimmed || trimmed.startsWith('••')) {
            // No cambiar si dejó el placeholder
            if (!trimmed) {
                localStorage.removeItem('_aga_groq_key');
                _agaAddMsg('bot', '🔑 API Key eliminada. El asistente usará respuestas básicas.');
            }
            return;
        }
        localStorage.setItem('_aga_groq_key', trimmed);
        _convHistory.length = 0; // resetear historial al cambiar key
        _agaAddMsg('bot', `✅ API Key guardada. Ahora uso **Groq ${GROQ_MODEL}**.\n\n¿En qué te puedo ayudar?`);
    };

    /* Limpiar historial de conversación */
    window._agaConvClear = function() {
        _convHistory.length = 0;
    };

    /* ══════════════════════════════════════════════════════════════
       PANEL — montar / abrir / cerrar
    ══════════════════════════════════════════════════════════════ */
    window.agaOpen = function () {
        const existing = document.getElementById('_aga-panel');
        if (existing) {
            existing.classList.toggle('_aga-open');
            if (existing.classList.contains('_aga-open')) {
                document.getElementById('_aga-input')?.focus();
            }
            return;
        }

        const panel = document.createElement('div');
        panel.id = '_aga-panel';
        panel.setAttribute('role',       'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Asistente AIFA');

        panel.innerHTML = `
          <div class="_aga-head">
            <div class="_aga-head-l">
              <div class="_aga-avatar"><i class="fas fa-robot"></i></div>
              <div>
                <div class="_aga-name">Asistente AIFA</div>
                <div class="_aga-online"><span class="_aga-dot"></span>Agenda de Comités</div>
              </div>
            </div>
            <div class="_aga-head-r">
              <button class="_aga-ibtn" title="Configurar API Key de Groq"
                onclick="window._agaConfigKey()" aria-label="Configurar API Key">
                🔑
              </button>
              <button class="_aga-ibtn" title="Limpiar conversación"
                onclick="document.getElementById('_aga-messages').innerHTML='';window._agaConvClear()" aria-label="Limpiar">
                <i class="fas fa-broom"></i>
              </button>
              <button class="_aga-ibtn" title="Cerrar"
                onclick="document.getElementById('_aga-panel').classList.remove('_aga-open')" aria-label="Cerrar">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div id="_aga-messages" class="_aga-msgs" role="log" aria-live="polite"></div>

          <div class="_aga-chips">
            <button class="_aga-chip" onclick="_agaQuick('¿Cuándo es la próxima sesión?')">📅 Próxima sesión</button>
            <button class="_aga-chip" onclick="_agaQuick('¿Qué sesiones hay esta semana?')">📆 Esta semana</button>
            <button class="_aga-chip" onclick="_agaQuick('Sesiones pendientes')">📊 Pendientes</button>
            <button class="_aga-chip" onclick="_agaQuick('Lista de comités')">🗂️ Comités</button>
          </div>

          <div class="_aga-foot">
            <input id="_aga-input" class="_aga-inp" type="text" autocomplete="off"
              placeholder="Escribe tu pregunta…"
              onkeydown="if(event.key==='Enter')window._agaSend()"
              aria-label="Pregunta al asistente">
            <button class="_aga-send" onclick="window._agaSend()" title="Enviar" aria-label="Enviar">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>`;

        document.body.appendChild(panel);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.classList.add('_aga-open');
                document.getElementById('_aga-input')?.focus();
                setTimeout(async () => {
                    if (typeof _agEnsureData === 'function') await _agEnsureData();
                    _agaAddMsg('bot', await _agaAnswer('hola'));
                }, 120);
            });
        });
    };

    /* ══════════════════════════════════════════════════════════════
       CSS
    ══════════════════════════════════════════════════════════════ */
    const CSS = `
#_aga-fab {
    position:fixed; bottom:24px; right:24px; z-index:1055;
    width:54px; height:54px; border-radius:50%;
    background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);
    color:#fff; border:none; cursor:pointer;
    box-shadow:0 4px 18px rgba(26,115,232,.5);
    display:flex; align-items:center; justify-content:center; font-size:1.3rem;
    transition:transform .18s, box-shadow .18s;
}
#_aga-fab:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(26,115,232,.6); }
#_aga-fab:focus-visible { outline:3px solid #93c5fd; outline-offset:3px; }
#_aga-fab.hidden { opacity:0; visibility:hidden; pointer-events:none; }

#_aga-panel {
    position:fixed; bottom:88px; right:24px; z-index:1054;
    width:360px; max-width:calc(100vw - 32px);
    height:560px; max-height:calc(100dvh - 110px);
    background:#fff; border-radius:18px;
    box-shadow:0 10px 48px rgba(0,0,0,.2);
    display:flex; flex-direction:column; overflow:hidden;
    transform:scale(.9) translateY(16px); opacity:0; pointer-events:none;
    transition:transform .24s cubic-bezier(.34,1.56,.64,1), opacity .18s ease;
}
#_aga-panel._aga-open {
    transform:scale(1) translateY(0); opacity:1; pointer-events:all;
}
@media (max-width:479px) {
    #_aga-panel {
        bottom:0; right:0; left:0; top:0;
        width:100dvw; height:100dvh;
        max-width:100dvw; max-height:100dvh; border-radius:0;
    }
    #_aga-fab { bottom:16px; right:16px; }
}
._aga-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 14px; gap:8px; flex-shrink:0;
    background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%); color:#fff;
}
._aga-head-l { display:flex; align-items:center; gap:10px; }
._aga-head-r { display:flex; align-items:center; gap:6px; }
._aga-avatar {
    width:38px; height:38px; border-radius:50%;
    background:rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;
}
._aga-name   { font-weight:700; font-size:.87rem; }
._aga-online { font-size:.67rem; opacity:.85; display:flex; align-items:center; gap:4px; }
._aga-dot    { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; }
._aga-ibtn {
    background:rgba(255,255,255,.15); border:none; color:#fff;
    width:28px; height:28px; border-radius:50%; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:.78rem; transition:background .15s; flex-shrink:0;
}
._aga-ibtn:hover { background:rgba(255,255,255,.3); }
._aga-ibtn:focus-visible { outline:2px solid #93c5fd; outline-offset:2px; }
._aga-msgs {
    flex:1; overflow-y:auto; padding:12px 12px 4px;
    display:flex; flex-direction:column; gap:8px;
    background:#f8fafc; scroll-behavior:smooth;
}
._aga-msg { display:flex; }
._aga-msg-user { justify-content:flex-end; }
._aga-msg-bot  { justify-content:flex-start; }
._aga-bubble {
    max-width:88%; padding:9px 13px; border-radius:14px;
    font-size:.79rem; line-height:1.65; word-break:break-word;
}
._aga-msg-user ._aga-bubble { background:#1a73e8; color:#fff; border-bottom-right-radius:3px; }
._aga-msg-bot  ._aga-bubble {
    background:#fff; color:#1e293b;
    border-bottom-left-radius:3px; box-shadow:0 1px 5px rgba(0,0,0,.08);
}
._aga-typing ._aga-bubble { display:flex; gap:5px; align-items:center; padding:11px 15px; }
._aga-typing ._aga-bubble span {
    width:7px; height:7px; border-radius:50%; background:#94a3b8;
    animation:_aga-bounce .9s infinite;
}
._aga-typing ._aga-bubble span:nth-child(2) { animation-delay:.15s; }
._aga-typing ._aga-bubble span:nth-child(3) { animation-delay:.30s; }
._aga-chips {
    display:flex; flex-wrap:wrap; gap:5px; padding:6px 10px 4px;
    background:#f8fafc; border-top:1px solid #e5e7eb; flex-shrink:0;
}
._aga-chip {
    background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;
    border-radius:20px; padding:3px 10px; font-size:.71rem;
    cursor:pointer; transition:background .13s, transform .1s; white-space:nowrap;
}
._aga-chip:hover { background:#dbeafe; transform:translateY(-1px); }
._aga-chip:focus-visible { outline:2px solid #1a73e8; }
._aga-foot {
    display:flex; align-items:center; gap:6px;
    padding:8px 10px; background:#fff; border-top:1px solid #e5e7eb; flex-shrink:0;
}
._aga-inp {
    flex:1; border:1.5px solid #e2e8f0; border-radius:20px;
    padding:7px 14px; font-size:.8rem; outline:none;
    background:#f8fafc; transition:border-color .15s; min-width:0;
}
._aga-inp:focus { border-color:#1a73e8; background:#fff; }
._aga-send {
    width:34px; height:34px; border-radius:50%; border:none;
    background:#1a73e8; color:#fff; cursor:pointer; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:.82rem; transition:background .15s;
}
._aga-send:hover { background:#1557b0; }
._aga-send:focus-visible { outline:3px solid #93c5fd; }
@keyframes _aga-bounce {
    0%,60%,100% { transform:translateY(0); }
    30%          { transform:translateY(-6px); }
}`;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    /* ══════════════════════════════════════════════════════════════
       FAB — visible solo en la sección Agenda de Comités
    ══════════════════════════════════════════════════════════════ */
    function _isAgendaActive() {
        return !!document.querySelector('#agenda-section.active');
    }

    function _updateFabVisibility() {
        const fab   = document.getElementById('_aga-fab');
        const panel = document.getElementById('_aga-panel');
        if (!fab) return;
        if (_isAgendaActive()) {
            fab.classList.remove('hidden');
        } else {
            fab.classList.add('hidden');
            panel?.classList.remove('_aga-open');
        }
    }

    function _injectFAB() {
        if (document.getElementById('_aga-fab')) return;
        const btn = document.createElement('button');
        btn.id    = '_aga-fab';
        btn.title = 'Asistente Agenda';
        btn.setAttribute('aria-label', 'Abrir Asistente Agenda de Comités');
        btn.innerHTML = '<i class="fas fa-robot"></i>';
        btn.addEventListener('click', window.agaOpen);
        document.body.appendChild(btn);

        // Estado inicial
        _updateFabVisibility();

        // Observar cambios de clase en todas las secciones
        document.querySelectorAll('.content-section').forEach(sec => {
            new MutationObserver(_updateFabVisibility).observe(sec, {
                attributes: true, attributeFilter: ['class']
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectFAB);
    } else {
        _injectFAB();
    }

})();
