/* ===================================================================
   AIFA OPERACIONES — Asistente IA de Agenda de Comités
   js/agenda-assistant.js

   • Responde preguntas en lenguaje natural sobre sesiones y comités
   • Soporta voz (Web Speech API): input por micrófono + respuesta TTS
   • Filtra automáticamente según el área del usuario
   • Funciona en celular y escritorio
   =================================================================== */

(function () {
    'use strict';

    /* ── Estado interno ─────────────────────────────────────────── */
    const _aga = {
        recognition : null,
        listening   : false,
        synth       : window.speechSynthesis || null,
    };

    /* ── Acceso a los datos ya cargados por agenda.js ───────────── */
    function _agaData() {
        return (typeof _ag !== 'undefined')
            ? _ag
            : { comites: [], reuniones: [], ready: false };
    }

    /* ── Normalizar texto (quitar tildes, pasar a minús) ─────────── */
    function _norm(s) {
        return (s || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }

    /* ── Sinónimos de área para detección en texto libre ─────────── */
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

    /* ── Buscar comité por nombre / siglas (fuzzy por palabras) ─── */
    function _matchComite(q) {
        const { comites } = _agaData();
        const words = _norm(q).split(' ').filter(w => w.length > 2);
        if (!words.length) return null;
        let best = null, bestScore = 0;
        comites.forEach(c => {
            const cn = _norm((c.nombre || '') + ' ' + (c.acronimo || ''));
            const score = words.filter(w => cn.includes(w)).length;
            if (score > bestScore) { bestScore = score; best = c; }
        });
        return bestScore > 0 ? best : null;
    }

    /* ── Helpers de fecha ───────────────────────────────────────── */
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
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
        return d;
    }
    function _endOfWeek() {
        const d = _startOfWeek(); d.setDate(d.getDate() + 6); return d;
    }

    /* ══════════════════════════════════════════════════════════════
       MOTOR DE RESPUESTA — detección de intención + extracción de entidades
    ══════════════════════════════════════════════════════════════ */
    function _agaAnswer(rawQuery) {
        const { comites, reuniones, ready } = _agaData();
        if (!ready) return 'Los datos todavía se están cargando. Dame un momento e intenta de nuevo.';

        const q     = _norm(rawQuery);
        const today = new Date(); today.setHours(0,0,0,0);

        const userArea = (typeof _agUserArea === 'function') ? _agUserArea() : null;
        const isAdmin  = (typeof _agIsAdmin  === 'function') ? _agIsAdmin()  : true;

        /* Sesiones próximas (no canceladas) */
        const upcoming = reuniones
            .filter(r => {
                const d = new Date(r.fecha_sesion + 'T00:00:00');
                return d >= today && r.estatus !== 'Cancelada';
            })
            .sort((a,b) => a.fecha_sesion.localeCompare(b.fecha_sesion));

        /* ── SALUDO ───────────────────────────────────────────── */
        if (/^(hola|hi|hey|buenas?|buenos?)/.test(q)) {
            const h = new Date().getHours();
            const gr = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
            const txt = userArea
                ? `soy el asistente del área **${userArea}**`
                : 'soy el asistente de la Agenda de Comités';
            return `👋 ${gr}! ${txt}.\n\nPuedo ayudarte a saber:\n• ¿Cuándo es la próxima sesión?\n• ¿A qué hora es el comité de calidad?\n• ¿Qué sesiones hay esta semana?\n• Resumen de sesiones pendientes\n• ¿Qué es el comité GSO?\n\nTambién puedes usar el 🎤 micrófono para preguntar.`;
        }

        /* ── AYUDA ────────────────────────────────────────────── */
        if (/ayuda|help|que puedes|que sabes|para que sirves/.test(q)) {
            return `💡 **Qué puedo hacer:**\n\n• **Próxima sesión** — "¿Cuándo es la próxima sesión?"\n• **Hora** — "¿A qué hora es el comité de calidad?"\n• **Esta semana** — "¿Qué hay esta semana?"\n• **Este mes** — "Sesiones de este mes"\n• **Resumen** — "¿Cuántas sesiones faltan?"\n• **Info** — "¿Qué es el comité DCS?"\n• **Lista** — "¿Qué comités tiene operación?"\n\nUsa el micrófono 🎤 para hablar directamente.`;
        }

        /* ── PRÓXIMA sesión ───────────────────────────────────── */
        if (/proxi(m|n)|siguient|cuand(o es|o hay|o sera)|cuando|prox/.test(q)) {
            const comite = _matchComite(q);
            const area   = _matchArea(q) || (!isAdmin && !comite ? userArea : null);
            let pool = upcoming;
            if (comite) pool = pool.filter(r => r.comite_id === comite.id);
            else if (area) pool = pool.filter(r => r.area === area);

            if (!pool.length) {
                if (comite) return `📭 No hay sesiones próximas para **${comite.acronimo || comite.nombre}**.`;
                if (area)   return `📭 No hay sesiones próximas para el área **${area}**.`;
                return '📭 No hay sesiones próximas registradas.';
            }
            const r    = pool[0];
            const c    = comites.find(x => x.id === r.comite_id) || {};
            const diff = _daysFromNow(r.fecha_sesion);
            const diffTxt = diff === 0 ? '¡es **hoy**! 🎉' : diff === 1 ? 'es **mañana**' : `es en **${diff} días**`;
            const hora    = r.hora_inicio ? ` a las **${r.hora_inicio.slice(0,5)} h**` : '';
            const label   = comite ? `del comité **${c.acronimo||c.nombre}**` : area ? `del área **${area}**` : '';
            return `📅 La próxima sesión ${label} ${diffTxt}.\n**${_fmtDate(r.fecha_sesion)}**${hora}.\n_Sesión ${r.numero_sesion||'—'} · ${r.estatus}_`;
        }

        /* ── HORA de una sesión ───────────────────────────────── */
        if (/que hora|a que hora|horario|hora de|hora es/.test(q)) {
            const comite = _matchComite(q);
            const area   = _matchArea(q) || (!isAdmin && !comite ? userArea : null);
            let pool = upcoming;
            if (comite) pool = pool.filter(r => r.comite_id === comite.id);
            else if (area) pool = pool.filter(r => r.area === area);

            if (!pool.length) return '⏰ No encontré sesiones próximas para consultar la hora.';
            const r = pool[0];
            const c = comites.find(x => x.id === r.comite_id) || {};
            const comiteNombre = c.acronimo || c.nombre || 'el comité';
            if (!r.hora_inicio) {
                return `⏰ La sesión de **${comiteNombre}** (${_fmtDate(r.fecha_sesion)}) todavía no tiene hora registrada.`;
            }
            return `⏰ La próxima sesión de **${comiteNombre}** es el **${_fmtDate(r.fecha_sesion)}** a las **${r.hora_inicio.slice(0,5)} h**.`;
        }

        /* ── ESTA SEMANA ──────────────────────────────────────── */
        if (/esta semana|semana/.test(q)) {
            const sw = _startOfWeek(), ew = _endOfWeek();
            let pool = upcoming.filter(r => {
                const d = new Date(r.fecha_sesion + 'T00:00:00');
                return d >= sw && d <= ew;
            });
            const area = _matchArea(q) || (!isAdmin ? userArea : null);
            if (area) pool = pool.filter(r => r.area === area);

            if (!pool.length) return '📆 No hay sesiones esta semana' + (area ? ` para **${area}**` : '') + '.';
            const lines = pool.map(r => {
                const c = comites.find(x => x.id === r.comite_id) || {};
                return `• **${_fmtDate(r.fecha_sesion)}**${r.hora_inicio ? ' · ' + r.hora_inicio.slice(0,5) + 'h' : ''} — ${c.acronimo || c.nombre || 'Comité'} [${r.area}]`;
            });
            return `📆 **Sesiones esta semana (${pool.length}):**\n${lines.join('\n')}`;
        }

        /* ── ESTE MES ─────────────────────────────────────────── */
        if (/este mes|mes actual|del mes|cuantos hay/.test(q)) {
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
                return `• ${_fmtDate(r.fecha_sesion)}${r.hora_inicio ? ' · ' + r.hora_inicio.slice(0,5) + 'h' : ''} — **${c.acronimo || c.nombre}**`;
            });
            return `📅 **Sesiones pendientes en ${MESES[mm]} (${pool.length}):**\n${lines.join('\n')}`;
        }

        /* ── RESUMEN / CUÁNTAS FALTAN ─────────────────────────── */
        if (/resumen|cuantas|total|faltan|pendiente/.test(q)) {
            const area = _matchArea(q);
            let pool = area
                ? upcoming.filter(r => r.area === area)
                : (!isAdmin && userArea ? upcoming.filter(r => r.area === userArea) : upcoming);

            if (!pool.length) return '✅ ¡No quedan sesiones pendientes!';
            const porArea = {};
            pool.forEach(r => { porArea[r.area] = (porArea[r.area] || 0) + 1; });
            const lines = Object.entries(porArea)
                .sort((a,b) => b[1] - a[1])
                .map(([a, n]) => `• **${a}**: ${n} sesión${n > 1 ? 'es' : ''}`);
            return `📊 **${pool.length} sesión${pool.length > 1 ? 'es' : ''} pendiente${pool.length > 1 ? 's' : ''}:**\n${lines.join('\n')}`;
        }

        /* ── INFO DE UN COMITÉ ────────────────────────────────── */
        if (/que es|informacion|de que trata|fundamento|descripcion|objetivo|quien preside/.test(q)) {
            const comite = _matchComite(q);
            if (!comite) return '🔍 ¿De qué comité necesitas información? Dime el nombre o las siglas.';
            let resp = `📋 **${comite.nombre}**\n`;
            if (comite.acronimo)   resp += `_${comite.acronimo}_\n`;
            if (comite.area)       resp += `Área: **${comite.area}**\n`;
            if (comite.frecuencia) resp += `Frecuencia: ${comite.frecuencia}\n`;
            if (comite.presidente) resp += `Presidente: ${comite.presidente}\n`;
            if (comite.hora_sesion) resp += `Hora habitual: ${comite.hora_sesion.slice(0,5)} h\n`;
            if (comite.descripcion) resp += `\n${comite.descripcion}`;
            return resp;
        }

        /* ── LISTAR COMITÉS DE UN ÁREA ───────────────────────── */
        if (/comites?\s*(de|del|en)?|lista|listar|hay comit/.test(q) || _matchArea(q)) {
            const area  = _matchArea(q) || (!isAdmin ? userArea : null);
            const lista = area ? comites.filter(c => c.area === area) : comites;
            if (!lista.length) return '🔍 No encontré comités para ese criterio.';
            const lines = lista.map(c => `• **${c.acronimo || '#' + c.numero}** — ${c.nombre}`);
            const label = area ? `del área **${area}**` : '(todas las áreas)';
            return `🗂️ **Comités ${label} (${lista.length}):**\n${lines.join('\n')}`;
        }

        /* ── BUSCAR por nombre específico ─────────────────────── */
        const comite = _matchComite(q);
        if (comite) {
            const pool  = upcoming.filter(r => r.comite_id === comite.id);
            const next  = pool[0];
            let resp = `📋 **${comite.acronimo || comite.nombre}** — ${comite.nombre}\nÁrea: **${comite.area}**`;
            if (next) {
                const diff = _daysFromNow(next.fecha_sesion);
                resp += `\nPróxima sesión: **${_fmtDate(next.fecha_sesion)}**`;
                if (next.hora_inicio) resp += ` a las **${next.hora_inicio.slice(0,5)} h**`;
                resp += ` _(en ${diff} días)_`;
            } else {
                resp += '\nSin sesiones próximas registradas.';
            }
            return resp;
        }

        /* ── Fallback ─────────────────────────────────────────── */
        return `🤔 No entendí bien tu pregunta. Prueba con:\n• "¿Cuándo es la próxima sesión?"\n• "¿A qué hora es el comité de calidad?"\n• "Sesiones de esta semana"\n\nO escribe **ayuda** para ver todo lo que puedo hacer.`;
    }

    /* ══════════════════════════════════════════════════════════════
       RENDER — markdown básico a HTML seguro
    ══════════════════════════════════════════════════════════════ */
    function _renderMd(text) {
        return text
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.+?)_/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    /* ══════════════════════════════════════════════════════════════
       TTS — Texto a voz (respuesta hablada)
    ══════════════════════════════════════════════════════════════ */
    function _agaSpeak(text) {
        if (!_aga.synth) return;
        _aga.synth.cancel();
        const plain = text
            .replace(/\*\*/g,'').replace(/_/g,'')
            .replace(/[📅📋📆📊🗂️💡👋⏰✅🎉📭🔍]/gu, '');
        const utt = new SpeechSynthesisUtterance(plain);
        utt.lang = 'es-MX'; utt.rate = 1.05;
        const voices = _aga.synth.getVoices();
        const esVoice = voices.find(v => v.lang.startsWith('es') && v.localService)
                     || voices.find(v => v.lang.startsWith('es'));
        if (esVoice) utt.voice = esVoice;
        _aga.synth.speak(utt);
    }

    /* ══════════════════════════════════════════════════════════════
       CHAT UI — añadir mensaje
    ══════════════════════════════════════════════════════════════ */
    function _agaAddMsg(role, text, speak) {
        const box = document.getElementById('_aga-messages');
        if (!box) return;
        const div = document.createElement('div');
        div.className = `_aga-msg _aga-msg-${role}`;
        div.innerHTML = `<div class="_aga-bubble">${_renderMd(text)}</div>`;
        box.appendChild(div);
        div.scrollIntoView({ behavior:'smooth', block:'end' });
        if (role === 'bot' && speak) _agaSpeak(text);
    }

    /* ══════════════════════════════════════════════════════════════
       VOZ — reconocimiento (input)
    ══════════════════════════════════════════════════════════════ */
    function _agaStartVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            _agaAddMsg('bot', 'El reconocimiento de voz no está disponible en este navegador. Prueba con Chrome o Edge.', false);
            return;
        }
        if (_aga.listening) {
            _aga.recognition?.stop();
            return;
        }
        const r = new SR();
        r.lang = 'es-MX'; r.interimResults = false; r.maxAlternatives = 1;
        _aga.recognition = r;
        _aga.listening = true;
        _agaMicState(true);

        r.onresult = e => {
            const txt = e.results[0][0].transcript;
            const inp = document.getElementById('_aga-input');
            if (inp) inp.value = txt;
            _agaSend();
        };
        r.onerror = e => {
            _aga.listening = false; _agaMicState(false);
            if (e.error !== 'no-speech') {
                _agaAddMsg('bot', 'No pude escucharte. Inténtalo de nuevo.', false);
            }
        };
        r.onend = () => { _aga.listening = false; _agaMicState(false); };
        r.start();
    }
    window._agaStartVoice = _agaStartVoice;

    function _agaMicState(on) {
        const btn = document.getElementById('_aga-mic-btn');
        if (!btn) return;
        btn.classList.toggle('_aga-mic-on', on);
        btn.title = on ? 'Escuchando… (toca para cancelar)' : 'Hablar por voz';
        btn.querySelector('i').className = on ? 'fas fa-circle text-danger' : 'fas fa-microphone';
    }

    /* ══════════════════════════════════════════════════════════════
       ENVIAR consulta
    ══════════════════════════════════════════════════════════════ */
    function _agaSend() {
        const inp = document.getElementById('_aga-input');
        const text = inp?.value.trim();
        if (!text) return;
        if (inp) inp.value = '';

        _agaAddMsg('user', text, false);

        /* Indicador "pensando" */
        const box = document.getElementById('_aga-messages');
        const typing = document.createElement('div');
        typing.className = '_aga-msg _aga-msg-bot _aga-typing';
        typing.innerHTML = '<div class="_aga-bubble"><span></span><span></span><span></span></div>';
        box?.appendChild(typing);
        typing.scrollIntoView({ behavior:'smooth', block:'end' });

        setTimeout(async () => {
            if (typeof _agEnsureData === 'function') await _agEnsureData();
            typing.remove();
            const answer = _agaAnswer(text);
            const speakOn = document.getElementById('_aga-speak-btn')?.dataset.on === '1';
            _agaAddMsg('bot', answer, speakOn);
        }, 300);
    }
    window._agaSend = _agaSend;

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
        panel.id   = '_aga-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Asistente de Agenda AIFA');

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
              <button id="_aga-speak-btn" class="_aga-ibtn" title="Activar respuesta por voz" data-on="0"
                onclick="_agaToggleVoiceOut(this)" aria-pressed="false">
                <i class="fas fa-volume-mute"></i>
              </button>
              <button class="_aga-ibtn" title="Limpiar conversación"
                onclick="document.getElementById('_aga-messages').innerHTML=''" aria-label="Limpiar">
                <i class="fas fa-broom"></i>
              </button>
              <button class="_aga-ibtn" title="Cerrar asistente"
                onclick="document.getElementById('_aga-panel').classList.remove('_aga-open')" aria-label="Cerrar">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div id="_aga-messages" class="_aga-msgs" role="log" aria-live="polite" aria-label="Mensajes del asistente"></div>

          <!-- Sugerencias rápidas -->
          <div class="_aga-chips">
            <button class="_aga-chip" onclick="_agaQuick('¿Cuándo es la próxima sesión?')">Próxima sesión</button>
            <button class="_aga-chip" onclick="_agaQuick('¿Qué hay esta semana?')">Esta semana</button>
            <button class="_aga-chip" onclick="_agaQuick('Resumen de pendientes')">Pendientes</button>
            <button class="_aga-chip" onclick="_agaQuick('Lista de comités')">Comités</button>
          </div>

          <div class="_aga-foot">
            <button id="_aga-mic-btn" class="_aga-ibtn _aga-mic" title="Hablar por voz"
              onclick="window._agaStartVoice()" aria-label="Activar micrófono">
              <i class="fas fa-microphone"></i>
            </button>
            <input id="_aga-input" class="_aga-inp" type="text" autocomplete="off"
              placeholder="Escribe tu pregunta…"
              onkeydown="if(event.key==='Enter')window._agaSend()"
              aria-label="Pregunta al asistente">
            <button class="_aga-send" onclick="window._agaSend()" title="Enviar" aria-label="Enviar">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>`;

        document.body.appendChild(panel);

        /* Pequeño delay para que la transición CSS se vea */
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.classList.add('_aga-open');
                document.getElementById('_aga-input')?.focus();
                /* Bienvenida */
                setTimeout(async () => {
                    if (typeof _agEnsureData === 'function') await _agEnsureData();
                    _agaAddMsg('bot', _agaAnswer('hola'), false);
                }, 120);
            });
        });
    };

    /* Chip de sugerencia rápida */
    window._agaQuick = function(txt) {
        const inp = document.getElementById('_aga-input');
        if (inp) inp.value = txt;
        _agaSend();
    };

    /* Toggle voz de salida */
    window._agaToggleVoiceOut = function(btn) {
        const on = btn.dataset.on === '1' ? '0' : '1';
        btn.dataset.on = on;
        btn.classList.toggle('_aga-voice-on', on === '1');
        btn.setAttribute('aria-pressed', on === '1');
        btn.title  = on === '1' ? 'Voz activada (toca para desactivar)' : 'Activar respuesta por voz';
        btn.querySelector('i').className = on === '1' ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        if (on === '1') _agaAddMsg('bot', '🔊 Respuesta por voz activada.', false);
    };

    /* ══════════════════════════════════════════════════════════════
       CSS
    ══════════════════════════════════════════════════════════════ */
    const CSS = `
/* ── FAB ───────────────────────────────────────────────────────── */
#_aga-fab {
    position:fixed; bottom:24px; right:24px; z-index:1055;
    width:54px; height:54px; border-radius:50%;
    background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);
    color:#fff; border:none; cursor:pointer;
    box-shadow:0 4px 18px rgba(26,115,232,.5);
    display:flex; align-items:center; justify-content:center;
    font-size:1.3rem;
    transition:transform .18s, box-shadow .18s;
}
#_aga-fab:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(26,115,232,.6); }
#_aga-fab:focus-visible { outline:3px solid #93c5fd; outline-offset:3px; }

/* ── Panel ─────────────────────────────────────────────────────── */
#_aga-panel {
    position:fixed; bottom:88px; right:24px; z-index:1054;
    width:340px; max-width:calc(100vw - 32px);
    height:520px; max-height:calc(100dvh - 110px);
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
        max-width:100dvw; max-height:100dvh;
        border-radius:0;
    }
    #_aga-fab { bottom:16px; right:16px; }
}

/* ── Header ────────────────────────────────────────────────────── */
._aga-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:12px 14px; gap:8px; flex-shrink:0;
    background:linear-gradient(135deg,#1a73e8 0%,#0d47a1 100%);
    color:#fff;
}
._aga-head-l { display:flex; align-items:center; gap:10px; }
._aga-head-r { display:flex; align-items:center; gap:6px; }
._aga-avatar {
    width:38px; height:38px; border-radius:50%;
    background:rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; font-size:1rem;
    flex-shrink:0;
}
._aga-name   { font-weight:700; font-size:.87rem; }
._aga-online { font-size:.67rem; opacity:.85; display:flex; align-items:center; gap:4px; }
._aga-dot    { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; }

/* ── Icon buttons ──────────────────────────────────────────────── */
._aga-ibtn {
    background:rgba(255,255,255,.15); border:none; color:#fff;
    width:28px; height:28px; border-radius:50%; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:.78rem; transition:background .15s;
    flex-shrink:0;
}
._aga-ibtn:hover { background:rgba(255,255,255,.3); }
._aga-ibtn:focus-visible { outline:2px solid #93c5fd; outline-offset:2px; }
._aga-ibtn._aga-voice-on { background:rgba(74,222,128,.35); }
._aga-ibtn._aga-mic-on   { background:rgba(239,68,68,.4); animation:_aga-pulse 1.2s infinite; }

/* ── Messages ──────────────────────────────────────────────────── */
._aga-msgs {
    flex:1; overflow-y:auto; padding:12px 12px 4px;
    display:flex; flex-direction:column; gap:8px;
    background:#f8fafc;
    scroll-behavior:smooth;
}
._aga-msg { display:flex; }
._aga-msg-user { justify-content:flex-end; }
._aga-msg-bot  { justify-content:flex-start; }
._aga-bubble {
    max-width:84%; padding:9px 13px; border-radius:14px;
    font-size:.79rem; line-height:1.6; word-break:break-word;
}
._aga-msg-user ._aga-bubble {
    background:#1a73e8; color:#fff;
    border-bottom-right-radius:3px;
}
._aga-msg-bot ._aga-bubble {
    background:#fff; color:#1e293b;
    border-bottom-left-radius:3px;
    box-shadow:0 1px 5px rgba(0,0,0,.08);
}

/* Typing dots */
._aga-typing ._aga-bubble {
    display:flex; gap:5px; align-items:center; padding:11px 15px;
}
._aga-typing ._aga-bubble span {
    width:7px; height:7px; border-radius:50%; background:#94a3b8;
    animation:_aga-bounce .9s infinite;
}
._aga-typing ._aga-bubble span:nth-child(2) { animation-delay:.15s; }
._aga-typing ._aga-bubble span:nth-child(3) { animation-delay:.30s; }

/* ── Chips de sugerencias ──────────────────────────────────────── */
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

/* ── Footer ────────────────────────────────────────────────────── */
._aga-foot {
    display:flex; align-items:center; gap:6px;
    padding:8px 10px; background:#fff;
    border-top:1px solid #e5e7eb; flex-shrink:0;
}
._aga-foot ._aga-ibtn._aga-mic {
    background:#f1f5f9; color:#475569;
    width:34px; height:34px; font-size:.88rem;
}
._aga-foot ._aga-ibtn._aga-mic:hover   { background:#e2e8f0; }
._aga-foot ._aga-ibtn._aga-mic-on { background:#fee2e2; color:#dc2626; }
._aga-inp {
    flex:1; border:1.5px solid #e2e8f0; border-radius:20px;
    padding:7px 14px; font-size:.8rem; outline:none;
    background:#f8fafc; transition:border-color .15s;
    min-width:0;
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

/* ── Animaciones ───────────────────────────────────────────────── */
@keyframes _aga-bounce {
    0%,60%,100% { transform:translateY(0); }
    30%          { transform:translateY(-6px); }
}
@keyframes _aga-pulse {
    0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,.4); }
    50%     { box-shadow:0 0 0 7px rgba(239,68,68,0); }
}`;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    /* ══════════════════════════════════════════════════════════════
       FAB — botón flotante
    ══════════════════════════════════════════════════════════════ */
    function _injectFAB() {
        if (document.getElementById('_aga-fab')) return;
        const btn = document.createElement('button');
        btn.id   = '_aga-fab';
        btn.title = 'Asistente de Agenda AIFA';
        btn.setAttribute('aria-label', 'Abrir asistente de Agenda');
        btn.innerHTML = '<i class="fas fa-robot"></i>';
        btn.addEventListener('click', window.agaOpen);
        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectFAB);
    } else {
        _injectFAB();
    }

})();
