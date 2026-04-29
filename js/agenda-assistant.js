/* ===================================================================
   AIFA OPERACIONES â€” Asistente IA con Google Gemini
   js/agenda-assistant.js  (v4 â€” Gemini 2.0 Flash)
   =================================================================== */


(function () {
    'use strict';

    /* ── Configuración ──────────────────────────────────────────── */
    const _KEY_STORE   = 'aifa.gemini.key';
    const _GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=';
    const _MAX_HISTORY = 20;

    let _history = [];

    /* ── Cliente Supabase ────────────────────────────────────────── */
    function _sb() {
        return window.supabaseClient || window.dataManager?.client || null;
    }

    /* ── API Key helpers ─────────────────────────────────────────── */
    function _getKey() { return localStorage.getItem(_KEY_STORE) || ''; }
    function _saveKey(k) { localStorage.setItem(_KEY_STORE, k.trim()); }

    /* ── Formateadores ───────────────────────────────────────────── */
    const MESES = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    function _fmtDate(ds) {
        const d = new Date(ds + 'T00:00:00');
        return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    }
    function _daysFromNow(ds) {
        const d = new Date(ds + 'T00:00:00'), t = new Date();
        t.setHours(0, 0, 0, 0);
        return Math.ceil((d - t) / 86400000);
    }

    /* ══════════════════════════════════════════════════════════════
       CONTEXTO — reúne datos reales para el system prompt
    ══════════════════════════════════════════════════════════════ */
    async function _buildContext() {
        const parts = [];

        const now = new Date();
        parts.push(`Fecha y hora actual: ${now.toLocaleDateString('es-MX', {
            weekday:'long', day:'2-digit', month:'long', year:'numeric'
        })}, ${now.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}.`);

        try {
            const role  = sessionStorage.getItem('user_role')  || '';
            const area  = sessionStorage.getItem('user_area')  || '';
            const email = sessionStorage.getItem('user_email') || '';
            if (email) parts.push(`Usuario en sesión: ${email}${role ? ` (${role})` : ''}${area ? `, área ${area}` : ''}.`);
        } catch (_) {}

        try {
            const ag = (typeof _ag !== 'undefined') ? _ag : null;
            if (ag && ag.comites && ag.comites.length) {
                const today = new Date().toISOString().slice(0, 10);
                const resumen = ag.comites.slice(0, 40).map(c => {
                    const upcoming = (ag.reuniones || [])
                        .filter(r => r.comite_id === c.id && r.fecha_sesion >= today)
                        .sort((a, b) => a.fecha_sesion.localeCompare(b.fecha_sesion));
                    const prox = upcoming[0];
                    return `- ${c.acronimo || c.numero || '?'} | ${c.nombre} | Área: ${c.area}`
                         + (prox ? ` | Próxima: ${_fmtDate(prox.fecha_sesion)} (en ${_daysFromNow(prox.fecha_sesion)} días), estatus: ${prox.estatus}` : ' | Sin sesiones próximas');
                }).join('\n');
                parts.push(`\nComités registrados (${ag.comites.length}):\n${resumen}`);

                const en30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
                const proximas = (ag.reuniones || [])
                    .filter(r => r.fecha_sesion >= today && r.fecha_sesion <= en30)
                    .sort((a, b) => a.fecha_sesion.localeCompare(b.fecha_sesion))
                    .slice(0, 20);
                if (proximas.length) {
                    const sesStr = proximas.map(r => {
                        const c = ag.comites.find(x => x.id === r.comite_id);
                        return `- ${_fmtDate(r.fecha_sesion)}${r.hora_inicio ? ' a las '+r.hora_inicio.slice(0,5) : ''}: ${c ? (c.acronimo || c.nombre) : '?'} — ${r.estatus}`;
                    }).join('\n');
                    parts.push(`\nSesiones próximas (30 días):\n${sesStr}`);
                }
            }
        } catch (_) {}

        try {
            const sb = _sb();
            if (sb) {
                const { data: ops } = await sb.from('annual_operations')
                    .select('year, total_ops, total_pax')
                    .order('year', { ascending: false }).limit(3);
                if (ops && ops.length) {
                    const opsStr = ops.map(o =>
                        `${o.year}: ${(o.total_ops||0).toLocaleString('es-MX')} ops, ${(o.total_pax||0).toLocaleString('es-MX')} pax`
                    ).join(' | ');
                    parts.push(`\nOperaciones anuales AIFA: ${opsStr}`);
                }
            }
        } catch (_) {}

        return parts.join('\n');
    }

    /* ══════════════════════════════════════════════════════════════
       GEMINI — llamada a la API REST
    ══════════════════════════════════════════════════════════════ */
    async function _callGemini(userText) {
        const apiKey = _getKey();
        if (!apiKey) throw new Error('NO_KEY');

        const context = await _buildContext();

        const systemInstruction = {
            parts: [{
                text: `Eres el Asistente IA del sistema AIFA Operaciones del Aeropuerto Internacional Felipe Ángeles (AIFA), México.\n\nRol: Ayudar a los usuarios con información sobre agenda de comités, sesiones, acuerdos y operaciones del aeropuerto.\n\nInstrucciones:\n- Responde siempre en español, de forma concisa y profesional.\n- Usa los datos de contexto para dar respuestas precisas y actualizadas.\n- Si no tienes la información exacta, dilo claramente.\n- Formatea con listas o negritas cuando ayude a la claridad.\n- No inventes datos de operaciones o fechas que no estén en el contexto.\n\nContexto actual del sistema:\n${context}`
            }]
        };

        const contents = [
            ..._history.slice(-_MAX_HISTORY),
            { role: 'user', parts: [{ text: userText }] }
        ];

        const res = await fetch(_GEMINI_URL + encodeURIComponent(apiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err && err.error ? err.error.message : ('HTTP ' + res.status);
            if (res.status === 400 && msg.toLowerCase().includes('api key')) throw new Error('INVALID_KEY');
            throw new Error(msg);
        }

        const json = await res.json();
        const text = (json.candidates && json.candidates[0] && json.candidates[0].content &&
                      json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
                      json.candidates[0].content.parts[0].text) || '(sin respuesta)';

        _history.push({ role: 'user',  parts: [{ text: userText }] });
        _history.push({ role: 'model', parts: [{ text }] });
        if (_history.length > _MAX_HISTORY * 2) _history = _history.slice(-_MAX_HISTORY * 2);

        return text;
    }

    /* ══════════════════════════════════════════════════════════════
       RENDER — markdown básico a HTML seguro
    ══════════════════════════════════════════════════════════════ */
    function _renderMd(text) {
        return text
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
            .replace(/\*(.+?)\*/g,'<em>$1</em>')
            .replace(/`(.+?)`/g,'<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:.9em">$1</code>')
            .replace(/\n/g,'<br>');
    }

    /* ══════════════════════════════════════════════════════════════
       CHAT UI helpers
    ══════════════════════════════════════════════════════════════ */
    function _addMsg(role, text) {
        const box = document.getElementById('_aga-messages');
        if (!box) return;
        const div = document.createElement('div');
        div.className = '_aga-msg _aga-msg-' + role;
        div.innerHTML = '<div class="_aga-bubble">' + _renderMd(text) + '</div>';
        box.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    /* ── Panel de API Key ────────────────────────────────────────── */
    function _showKeyPanel() {
        const existing = document.getElementById('_aga-keydlg');
        if (existing) { existing.remove(); return; }
        const dlg = document.createElement('div');
        dlg.id = '_aga-keydlg';
        dlg.innerHTML =
            '<div style="padding:14px 16px">' +
              '<p style="font-size:.78rem;color:#475569;margin:0 0 8px">' +
                '<strong>API Key de Gemini</strong><br>' +
                'Obtén tu clave gratis en ' +
                '<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style="color:#1a73e8">Google AI Studio</a>.' +
                ' Se guarda solo en este navegador.' +
              '</p>' +
              '<div style="display:flex;gap:6px">' +
                '<input id="_aga-keyinp" type="password" placeholder="AIza…" value="' + _getKey() + '" ' +
                  'style="flex:1;border:1.5px solid #cbd5e1;border-radius:8px;padding:6px 10px;font-size:.8rem;outline:none;min-width:0" ' +
                  'onkeydown="if(event.key===\'Enter\')window._agaSaveKey()">' +
                '<button onclick="window._agaSaveKey()" ' +
                  'style="background:#4285f4;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:.78rem;cursor:pointer;white-space:nowrap">' +
                  'Guardar' +
                '</button>' +
              '</div>' +
              '<p id="_aga-keystatus" style="font-size:.72rem;margin:6px 0 0;color:#059669"></p>' +
            '</div>';
        dlg.style.cssText = 'position:absolute;bottom:54px;left:0;right:0;background:#fff;border-top:1px solid #e2e8f0;box-shadow:0 -4px 16px rgba(0,0,0,.1);z-index:10;';
        document.getElementById('_aga-panel').appendChild(dlg);
        setTimeout(() => document.getElementById('_aga-keyinp').focus(), 60);
    }

    function _updateOnlineLabel() {
        const lbl = document.getElementById('_aga-online-lbl');
        if (!lbl) return;
        if (_getKey()) {
            lbl.textContent = 'Gemini 2.0 Flash · activo';
            lbl.style.color = '';
        } else {
            lbl.textContent = 'Configura tu API Key';
            lbl.style.color = '#fbbf24';
        }
    }

    window._agaSaveKey = function () {
        const val = (document.getElementById('_aga-keyinp') || {}).value;
        if (!val || !val.trim()) return;
        _saveKey(val.trim());
        const st = document.getElementById('_aga-keystatus');
        if (st) { st.textContent = '✓ Guardada correctamente'; st.style.color = '#059669'; }
        setTimeout(function() { const d = document.getElementById('_aga-keydlg'); if(d) d.remove(); }, 900);
        _updateOnlineLabel();
    };

    /* ══════════════════════════════════════════════════════════════
       SEND — llama a Gemini y muestra la respuesta
    ══════════════════════════════════════════════════════════════ */
    async function _agaSend() {
        const inp  = document.getElementById('_aga-input');
        const text = inp ? inp.value.trim() : '';
        if (!text) return;
        inp.value = '';

        const keydlg = document.getElementById('_aga-keydlg');
        if (keydlg) keydlg.remove();

        _addMsg('user', text);

        const box = document.getElementById('_aga-messages');
        const typing = document.createElement('div');
        typing.className = '_aga-msg _aga-msg-bot _aga-typing';
        typing.innerHTML = '<div class="_aga-bubble"><span></span><span></span><span></span></div>';
        if (box) { box.appendChild(typing); typing.scrollIntoView({ behavior:'smooth', block:'end' }); }

        try {
            if (typeof _agEnsureData === 'function') await _agEnsureData();
            const answer = await _callGemini(text);
            typing.remove();
            _addMsg('bot', answer);
        } catch (err) {
            typing.remove();
            if (err.message === 'NO_KEY') {
                _addMsg('bot', '🔑 **Falta la API Key de Gemini.**\n\nHaz clic en el ícono 🔑 en la parte superior del chat para configurarla.\nEs gratis en [Google AI Studio](https://aistudio.google.com/app/apikey).');
            } else if (err.message === 'INVALID_KEY') {
                _addMsg('bot', '❌ **API Key inválida.** Verifica que sea correcta en Google AI Studio y vuelve a guardarla con el ícono 🔑.');
            } else {
                _addMsg('bot', '⚠️ Error al consultar a Gemini: ' + (err.message || err));
            }
        }
    }
    window._agaSend = _agaSend;

    window._agaQuick = function (txt) {
        const inp = document.getElementById('_aga-input');
        if (inp) inp.value = txt;
        _agaSend();
    };

    /* ══════════════════════════════════════════════════════════════
       PANEL — montar / abrir / cerrar
    ══════════════════════════════════════════════════════════════ */
    window.agaOpen = function () {
        const existing = document.getElementById('_aga-panel');
        if (existing) {
            existing.classList.toggle('_aga-open');
            if (existing.classList.contains('_aga-open')) {
                const inp = document.getElementById('_aga-input');
                if (inp) inp.focus();
            }
            return;
        }

        const panel = document.createElement('div');
        panel.id = '_aga-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Asistente AIFA Gemini');

        const keyStatus = _getKey() ? 'Gemini 2.0 Flash · activo' : 'Configura tu API Key';
        const keyColor  = _getKey() ? '' : 'color:#fbbf24';

        panel.innerHTML =
          '<div class="_aga-head">' +
            '<div class="_aga-head-l">' +
              '<div class="_aga-avatar" style="font-weight:800;font-size:1.1rem">G</div>' +
              '<div>' +
                '<div class="_aga-name">Asistente AIFA</div>' +
                '<div class="_aga-online">' +
                  '<span class="_aga-dot"></span>' +
                  '<span id="_aga-online-lbl" style="' + keyColor + '">' + keyStatus + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="_aga-head-r">' +
              '<button class="_aga-ibtn" title="API Key de Gemini" onclick="_showKeyPanel()" aria-label="Configurar API Key">' +
                '<i class="fas fa-key"></i>' +
              '</button>' +
              '<button class="_aga-ibtn" title="Limpiar conversación" aria-label="Limpiar"' +
                ' onclick="document.getElementById(\'_aga-messages\').innerHTML=\'\'">' +
                '<i class="fas fa-broom"></i>' +
              '</button>' +
              '<button class="_aga-ibtn" title="Cerrar" aria-label="Cerrar"' +
                ' onclick="document.getElementById(\'_aga-panel\').classList.remove(\'_aga-open\')">' +
                '<i class="fas fa-times"></i>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="_aga-messages" class="_aga-msgs" role="log" aria-live="polite"></div>' +
          '<div class="_aga-chips">' +
            '<button class="_aga-chip" onclick="_agaQuick(\'¿Cuándo es la próxima sesión de comité?\')">📅 Próxima sesión</button>' +
            '<button class="_aga-chip" onclick="_agaQuick(\'¿Qué sesiones hay esta semana?\')">📆 Esta semana</button>' +
            '<button class="_aga-chip" onclick="_agaQuick(\'Lista de comités con sesiones pendientes\')">📊 Pendientes</button>' +
            '<button class="_aga-chip" onclick="_agaQuick(\'¿Cuántos vuelos operó el AIFA en 2025?\')">✈️ Operaciones</button>' +
          '</div>' +
          '<div class="_aga-foot">' +
            '<input id="_aga-input" class="_aga-inp" type="text" autocomplete="off"' +
              ' placeholder="Pregúntale algo a Gemini…"' +
              ' onkeydown="if(event.key===\'Enter\')window._agaSend()"' +
              ' aria-label="Pregunta al asistente">' +
            '<button class="_aga-send" onclick="window._agaSend()" title="Enviar" aria-label="Enviar">' +
              '<i class="fas fa-paper-plane"></i>' +
            '</button>' +
          '</div>';

        document.body.appendChild(panel);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                panel.classList.add('_aga-open');
                const inp = document.getElementById('_aga-input');
                if (inp) inp.focus();
                setTimeout(function() {
                    if (!_getKey()) {
                        _addMsg('bot', '¡Hola! Soy el Asistente IA del AIFA con **Google Gemini**.\n\nPara empezar, configura tu **API Key** haciendo clic en el ícono 🔑 de arriba. Es gratuita en [Google AI Studio](https://aistudio.google.com/app/apikey).');
                    } else {
                        _addMsg('bot', '¡Hola! Soy el Asistente IA del AIFA con **Google Gemini**.\n\nTengo acceso a la agenda de comités y datos de operaciones en tiempo real. ¿En qué te puedo ayudar?');
                    }
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
    background:linear-gradient(135deg,#4285f4 0%,#1a56db 50%,#0d47a1 100%);
    color:#fff; border:none; cursor:pointer;
    box-shadow:0 4px 18px rgba(66,133,244,.5);
    display:flex; align-items:center; justify-content:center;
    transition:transform .18s, box-shadow .18s;
    font-weight:800; font-size:1.15rem; font-family:'Google Sans',Arial,sans-serif;
}
#_aga-fab:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(66,133,244,.65); }
#_aga-fab:focus-visible { outline:3px solid #93c5fd; outline-offset:3px; }
#_aga-fab.hidden { opacity:0; visibility:hidden; pointer-events:none; }

#_aga-panel {
    position:fixed; bottom:88px; right:24px; z-index:1054;
    width:380px; max-width:calc(100vw - 32px);
    height:580px; max-height:calc(100dvh - 110px);
    background:#fff; border-radius:18px;
    box-shadow:0 10px 48px rgba(0,0,0,.22);
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
    background:linear-gradient(135deg,#4285f4 0%,#1a56db 60%,#0d47a1 100%); color:#fff;
}
._aga-head-l { display:flex; align-items:center; gap:10px; }
._aga-head-r { display:flex; align-items:center; gap:6px; }
._aga-avatar {
    width:38px; height:38px; border-radius:50%;
    background:rgba(255,255,255,.2);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
._aga-name   { font-weight:700; font-size:.87rem; }
._aga-online { font-size:.67rem; opacity:.9; display:flex; align-items:center; gap:4px; }
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
    max-width:90%; padding:9px 13px; border-radius:14px;
    font-size:.8rem; line-height:1.65; word-break:break-word;
}
._aga-msg-user ._aga-bubble { background:#4285f4; color:#fff; border-bottom-right-radius:3px; }
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
    border-radius:20px; padding:3px 10px; font-size:.7rem;
    cursor:pointer; transition:background .13s, transform .1s; white-space:nowrap;
}
._aga-chip:hover { background:#dbeafe; transform:translateY(-1px); }
._aga-chip:focus-visible { outline:2px solid #4285f4; }
._aga-foot {
    display:flex; align-items:center; gap:6px;
    padding:8px 10px; background:#fff; border-top:1px solid #e5e7eb; flex-shrink:0;
}
._aga-inp {
    flex:1; border:1.5px solid #e2e8f0; border-radius:20px;
    padding:7px 14px; font-size:.8rem; outline:none;
    background:#f8fafc; transition:border-color .15s; min-width:0;
}
._aga-inp:focus { border-color:#4285f4; background:#fff; }
._aga-send {
    width:34px; height:34px; border-radius:50%; border:none;
    background:linear-gradient(135deg,#4285f4,#1a56db);
    color:#fff; cursor:pointer; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:.82rem; transition:opacity .15s;
}
._aga-send:hover { opacity:.85; }
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
            if (panel) panel.classList.remove('_aga-open');
        }
    }

    function _injectFAB() {
        if (document.getElementById('_aga-fab')) return;
        const btn = document.createElement('button');
        btn.id    = '_aga-fab';
        btn.title = 'Asistente IA AIFA (Gemini)';
        btn.setAttribute('aria-label', 'Abrir Asistente IA con Gemini');
        btn.textContent = 'G';
        btn.addEventListener('click', window.agaOpen);
        document.body.appendChild(btn);

        _updateFabVisibility();

        document.querySelectorAll('.content-section').forEach(function(sec) {
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