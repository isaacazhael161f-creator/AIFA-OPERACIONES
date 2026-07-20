/**
 * session-timeout.js  –  AIFA Operaciones
 * ─────────────────────────────────────────────────────────────────────────
 * Cierra la sesión automáticamente tras TIMEOUT_MS de inactividad.
 *
 * Flujo (inspirado en apps bancarias / institucionales):
 *   1. El usuario está activo → temporizador se reinicia en cada evento.
 *   2. A los (TIMEOUT_MS - WARNING_MS) aparece un modal de advertencia
 *      con una cuenta regresiva en tiempo real.
 *   3. Si el usuario hace clic en "Continuar sesión" → se cancela el cierre.
 *   4. Si la cuenta llega a 0 → se ejecuta performLogout() y el modal
 *      cambia a pantalla de "Sesión expirada, vuelve a iniciar sesión".
 *
 * Eventos que reinician el temporizador:
 *   mousemove, mousedown, keydown, touchstart, scroll, click, visibilitychange
 *
 * Configuración:
 *   TIMEOUT_MS  = tiempo total de inactividad antes del cierre  (10 min)
 *   WARNING_MS  = con cuánta antelación se muestra el aviso      (1 min)
 */

;(function () {
    'use strict';

    // ── Configuración ─────────────────────────────────────────────────────
    const TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutos
    const WARNING_MS =  1 * 60 * 1000;   //  1 minuto de advertencia previa
    const STORAGE_KEY = 'aifa.activity.last';   // se usa para sincronizar entre pestañas

    // ── Estado interno ────────────────────────────────────────────────────
    let _warningTimer  = null;
    let _logoutTimer   = null;
    let _countdownInt  = null;
    let _active        = false;  // true sólo cuando el usuario tiene sesión abierta
    let _modalInst     = null;   // instancia Bootstrap del modal

    // ── Elementos del DOM ─────────────────────────────────────────────────
    const MODAL_ID       = 'session-timeout-modal';
    const COUNTDOWN_ID   = 'session-timeout-countdown';
    const CONTINUE_ID    = 'session-timeout-continue';
    const STATE_WARN_CLS = 'sto-state-warning';
    const STATE_OUT_CLS  = 'sto-state-expired';

    // ── Helpers ───────────────────────────────────────────────────────────
    function now() { return Date.now(); }

    function resetTimers() {
        clearTimeout(_warningTimer);
        clearTimeout(_logoutTimer);
        clearInterval(_countdownInt);

        if (!_active) return;

        localStorage.setItem(STORAGE_KEY, String(now()));

        _warningTimer = setTimeout(showWarning, TIMEOUT_MS - WARNING_MS);
        _logoutTimer  = setTimeout(doLogout,   TIMEOUT_MS);
    }

    function getModal() {
        const el = document.getElementById(MODAL_ID);
        if (!el) return null;
        if (!_modalInst) {
            _modalInst = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
        }
        return _modalInst;
    }

    // ── Muestra el aviso con cuenta regresiva ─────────────────────────────
    function showWarning() {
        const modal = getModal();
        if (!modal) return;

        const el = document.getElementById(MODAL_ID);
        el.classList.remove(STATE_OUT_CLS);
        el.classList.add(STATE_WARN_CLS);

        const contBtn = document.getElementById(CONTINUE_ID);
        if (contBtn) contBtn.classList.remove('d-none');

        let remaining = Math.round(WARNING_MS / 1000);
        updateCountdown(remaining);

        clearInterval(_countdownInt);
        _countdownInt = setInterval(() => {
            remaining -= 1;
            updateCountdown(remaining);
            if (remaining <= 0) {
                clearInterval(_countdownInt);
            }
        }, 1000);

        modal.show();
    }

    function updateCountdown(secs) {
        const el = document.getElementById(COUNTDOWN_ID);
        if (!el) return;
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        el.textContent = m > 0
            ? `${m}:${String(s).padStart(2, '0')} min`
            : `${s} seg`;
        // Pulso rojo cuando quedan ≤15 s
        el.classList.toggle('sto-countdown-urgent', secs <= 15);
    }

    // ── Cierre de sesión por inactividad ──────────────────────────────────
    function doLogout() {
        clearInterval(_countdownInt);
        _active = false;

        // Cambiar el modal a estado "expirado"
        const el = document.getElementById(MODAL_ID);
        if (el) {
            el.classList.remove(STATE_WARN_CLS);
            el.classList.add(STATE_OUT_CLS);
            const contBtn = document.getElementById(CONTINUE_ID);
            if (contBtn) contBtn.classList.add('d-none');
        }

        // Ejecutar logout de la app
        if (typeof window.performLogout === 'function') {
            window.performLogout();
        } else {
            // Fallback mínimo
            try { window.supabaseClient?.auth?.signOut(); } catch (_) {}
            try { sessionStorage.clear(); } catch (_) {}
            const main  = document.getElementById('main-app');
            const login = document.getElementById('login-screen');
            if (main)  main.classList.add('hidden');
            if (login) login.classList.remove('hidden');
        }
    }

    // ── "Continuar sesión" ────────────────────────────────────────────────
    function continueSession() {
        clearInterval(_countdownInt);
        getModal()?.hide();

        const el = document.getElementById(MODAL_ID);
        if (el) {
            el.classList.remove(STATE_WARN_CLS, STATE_OUT_CLS);
        }
        resetTimers();
    }

    // ── Eventos de actividad del usuario ──────────────────────────────────
    const ACTIVITY_EVENTS = [
        'mousemove', 'mousedown', 'keydown',
        'touchstart', 'scroll', 'click'
    ];

    function onActivity() {
        // No reiniciar si el modal de advertencia ya está visible
        const el = document.getElementById(MODAL_ID);
        if (el && el.classList.contains(STATE_WARN_CLS)) return;
        resetTimers();
    }

    function bindActivityListeners() {
        ACTIVITY_EVENTS.forEach(evt =>
            document.addEventListener(evt, onActivity, { passive: true })
        );
        // Sincronizar entre pestañas del mismo navegador
        window.addEventListener('storage', e => {
            if (e.key === STORAGE_KEY) resetTimers();
        });
        // Cuando la pestaña vuelve a primer plano, verificar si ya expiró
        document.addEventListener('visibilitychange', () => {
            if (document.hidden || !_active) return;
            const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
            if (now() - last >= TIMEOUT_MS) {
                doLogout();
            }
        });
    }

    function unbindActivityListeners() {
        ACTIVITY_EVENTS.forEach(evt =>
            document.removeEventListener(evt, onActivity)
        );
    }

    // ── API pública ───────────────────────────────────────────────────────

    /** Inicia la vigilancia de inactividad (llamar al hacer login). */
    window.SessionTimeout = {
        start() {
            _active = true;
            bindActivityListeners();
            resetTimers();
        },

        /** Detiene todo (llamar al hacer logout manual). */
        stop() {
            _active = false;
            clearTimeout(_warningTimer);
            clearTimeout(_logoutTimer);
            clearInterval(_countdownInt);
            unbindActivityListeners();
            getModal()?.hide();
            _modalInst = null;
        },

        /** Reinicia el contador (útil tras una acción explícita del usuario). */
        reset: resetTimers,

        continueSession
    };

    // ── Bootstrap: escuchar aifa:login / aifa:logout ──────────────────────
    window.addEventListener('aifa:login', () => {
        // Si la sesión acababa de expirar, recargar para datos frescos
        if (window._sessionExpiredReload) {
            window._sessionExpiredReload = false;
            location.reload();
            return;
        }
        window.SessionTimeout.start();
    });

    // También arrancar si ya hay sesión activa cuando carga el script
    document.addEventListener('DOMContentLoaded', () => {
        // Botón "Continuar sesión"
        const btn = document.getElementById(CONTINUE_ID);
        if (btn) btn.addEventListener('click', () => window.SessionTimeout.continueSession());

        // Botón "Iniciar sesión" en estado expirado
        const reloginBtn = document.getElementById('session-timeout-relogin');
        if (reloginBtn) reloginBtn.addEventListener('click', () => {
            getModal()?.hide();
            const el = document.getElementById(MODAL_ID);
            if (el) el.classList.remove(STATE_WARN_CLS, STATE_OUT_CLS);
            // Marcar que al hacer login exitoso se recargará la página
            window._sessionExpiredReload = true;
        });

        // Si ya tiene sesión guardada (recarga de página)
        const user = sessionStorage.getItem('currentUser') || sessionStorage.getItem('user');
        if (user) window.SessionTimeout.start();
    });

})();
