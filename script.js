/**
 * =================================================================================
 * CONFIGURACIÓN DE DATOS ESTÁTICOS
 * =================================================================================
 */
const SPANISH_MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const SPANISH_MONTH_ABBRS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const SPANISH_WEEKDAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

function normalizeDate(date) {
    if (!(date instanceof Date)) return null;
    const time = date.getTime();
    if (Number.isNaN(time)) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const APP_SIGNATURE_STORAGE_KEY = 'aifa.app.signature';
const APP_UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;
let appUpdateCheckTimer = null;
let appUpdateWatchersBound = false;
let appReloadScheduled = false;

function resolveDefaultInstallTabId() {
    try {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '').toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) return 'install-ios-pane';
        if (/android/.test(ua)) return 'install-android-pane';
        if (/macintosh/.test(ua) && /safari/.test(ua) && !/chrome|crios|fxios/.test(ua)) {
            return 'install-desktop-safari-pane';
        }
    } catch (_) {}
    return 'install-desktop-chrome-pane';
}

function updateInstallSupportAlert(state) {
    try {
        const alertEl = document.getElementById('install-app-support');
        if (!alertEl) return;
        let message = '';
        let type = 'info';
        switch (state) {
            case 'installed':
                type = 'success';
                message = 'Esta sesion ya ejecuta Operaciones AIFA como app. Usa los accesos creados por tu sistema.';
                break;
            case 'prompt-ready':
                type = 'success';
                message = 'Este navegador permite instalacion directa. Usa el boton "Instalar app" o "Intentar instalacion".';
                break;
            case 'manual':
                type = 'warning';
                message = 'Este navegador no muestra aviso automatico. Sigue las instrucciones del apartado correspondiente.';
                break;
            default:
                message = 'Puedes instalar la app desde el boton "Instalar app" cuando este disponible o seguir las instrucciones manuales.';
                break;
        }
        alertEl.className = 'alert alert-' + type + ' small mb-3';
        alertEl.textContent = message;
        alertEl.classList.remove('d-none');
    } catch (err) {
        console.warn('updateInstallSupportAlert failed:', err);
    }
}

function showInstallInstructions(options = {}) {
    try {
        const modalEl = document.getElementById('install-app-modal');
        if (!modalEl) return;
        const targetTabId = options.tabId || resolveDefaultInstallTabId();
        if (targetTabId && typeof bootstrap !== 'undefined' && bootstrap.Tab) {
            const tabTrigger = modalEl.querySelector('[data-bs-target="#' + targetTabId + '"]');
            if (tabTrigger) {
                bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
            }
        }
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            installAppModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            installAppModalInstance.show();
        } else {
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
        }
    } catch (err) {
        console.warn('showInstallInstructions failed:', err);
    }
}

function registerServiceWorkerIfNeeded() {
    try {
        if (!('serviceWorker' in navigator)) return null;
        if (typeof window !== 'undefined' && window.__NO_SW__) return null;
        if (location.protocol === 'file:') return null;
        return navigator.serviceWorker.register('sw.js').catch((err) => {
            console.warn('Service worker registration failed:', err);
            return null;
        });
    } catch (err) {
        console.warn('registerServiceWorkerIfNeeded failed:', err);
        return null;
    }
}

function scheduleAppReload(reason) {
    if (appReloadScheduled) return;
    appReloadScheduled = true;
    try { console.info('Scheduling app reload:', reason); } catch (_) {}
    try { showGlobalLoader('Actualizando Operaciones AIFA...'); } catch (_) {}
    setTimeout(() => {
        window.location.reload();
    }, 400);
}

const isAndroidDevice = (typeof navigator !== 'undefined') && /Android/i.test(navigator.userAgent || '');
const ANDROID_AUTO_REFRESH_THRESHOLD = 3 * 60 * 1000;
const OPERATIONAL_REFRESH_DEBOUNCE = 60 * 1000;
const OPERATIONAL_REFRESH_INTERVAL = 6 * 60 * 1000;
let androidVisibilityHiddenAt = Date.now();
let lastOperationalAutoRefresh = 0;
let operationalRefreshInFlight = null;
let androidAutoRefreshIntervalId = null;

async function fetchAppSignature() {
    const resources = ['script.js', 'manifest.webmanifest'];
    for (const resource of resources) {
        try {
            const response = await fetch(`${resource}?ts=${Date.now()}`, { cache: 'no-store' });
            if (!response || !response.ok) continue;
            const signature = response.headers.get('etag') || response.headers.get('last-modified');
            if (signature) return `${resource}:${signature}`;
            const text = await response.text();
            return `${resource}:${await sha256(text)}`;
        } catch (err) {
            console.warn('fetchAppSignature failed for', resource, err);
        }
    }
    return null;
}

async function checkForAppUpdates(force = false) {
    if (appReloadScheduled) return;
    try {
        const signature = await fetchAppSignature();
        if (!signature) return;
        const stored = (() => {
            try { return localStorage.getItem(APP_SIGNATURE_STORAGE_KEY); } catch (_) { return null; }
        })();
        if (stored && stored !== signature) {
            try { localStorage.setItem(APP_SIGNATURE_STORAGE_KEY, signature); } catch (_) {}
            scheduleAppReload('asset-signature-change');
            return;
        }
        if (!stored || force) {
            try { localStorage.setItem(APP_SIGNATURE_STORAGE_KEY, signature); } catch (_) {}
        } else {
            try { localStorage.setItem(APP_SIGNATURE_STORAGE_KEY, signature); } catch (_) {}
        }
    } catch (err) {
        console.warn('checkForAppUpdates failed:', err);
    }
}

function startAppUpdatePolling() {
    if (appUpdateCheckTimer) clearInterval(appUpdateCheckTimer);
    checkForAppUpdates().catch(() => {});
    appUpdateCheckTimer = setInterval(() => {
        checkForAppUpdates().catch(() => {});
    }, APP_UPDATE_CHECK_INTERVAL);
    if (!appUpdateWatchersBound) {
        appUpdateWatchersBound = true;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkForAppUpdates().catch(() => {});
            }
        });
        window.addEventListener('focus', () => {
            checkForAppUpdates().catch(() => {});
        });
    }
}

function setupServiceWorkerLifecycle(registrationPromise) {
    if (!('serviceWorker' in navigator)) return;

    let controllerChangeSeen = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controllerChangeSeen) {
            controllerChangeSeen = true;
            return;
        }
        scheduleAppReload('controller-change');
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (!event || !event.data) return;
        if (event.data.type === 'SW_ACTIVATED') {
            checkForAppUpdates(true).catch(() => {});
        }
    });

    const monitorRegistration = (registration) => {
        if (!registration) return;
        const requestSkipWaiting = (worker) => {
            try {
                if (worker && typeof worker.postMessage === 'function') {
                    worker.postMessage({ type: 'SKIP_WAITING' });
                }
            } catch (_) {}
        };
        if (registration.waiting) {
            requestSkipWaiting(registration.waiting);
        }
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    requestSkipWaiting(registration.waiting || newWorker);
                }
            });
        });
    };

    if (registrationPromise && typeof registrationPromise.then === 'function') {
        registrationPromise.then(monitorRegistration).catch((err) => {
            console.warn('SW registration monitoring failed:', err);
        });
    } else if (navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(monitorRegistration).catch((err) => {
            console.warn('getRegistration failed:', err);
        });
    }
}

function setupPwaInstallExperience() {
    try {
        const swRegistrationPromise = registerServiceWorkerIfNeeded();
        setupServiceWorkerLifecycle(swRegistrationPromise);
        startAppUpdatePolling();

        const installBtn = document.getElementById('install-app-btn');
        const modalInstallBtn = document.getElementById('install-app-modal-install-btn');
        const sidebarLink = document.querySelector('[data-install-app-info]');

        const showInstallButton = () => {
            if (installBtn) installBtn.classList.remove('d-none');
        };
        const hideInstallButton = () => {
            if (installBtn) installBtn.classList.add('d-none');
        };

        const attemptInstallPrompt = async () => {
            if (!deferredPwaInstallEvent) {
                updateInstallSupportAlert('manual');
                showInstallInstructions();
                return;
            }
            try {
                if (installBtn) installBtn.disabled = true;
                if (modalInstallBtn) modalInstallBtn.disabled = true;
                deferredPwaInstallEvent.prompt();
                const choice = await deferredPwaInstallEvent.userChoice;
                deferredPwaInstallEvent = null;
                if (choice && choice.outcome === 'accepted') {
                    updateInstallSupportAlert('installed');
                    hideInstallButton();
                    showNotification('Instalacion iniciada. Busca Operaciones AIFA en tus apps.', 'success');
                    if (installAppModalInstance && typeof installAppModalInstance.hide === 'function') {
                        installAppModalInstance.hide();
                    }
                    return;
                }
                updateInstallSupportAlert('manual');
                showNotification('Instalacion cancelada. Puedes intentarlo despues o seguir las instrucciones manuales.', 'warning');
                showInstallInstructions();
            } catch (err) {
                console.warn('PWA install prompt failed:', err);
                updateInstallSupportAlert('manual');
                showNotification('No se pudo iniciar la instalacion automatica. Usa las instrucciones manuales.', 'error');
                showInstallInstructions();
            } finally {
                if (installBtn) installBtn.disabled = false;
                if (modalInstallBtn) modalInstallBtn.disabled = false;
            }
        };

        const bindClick = (element) => {
            if (!element || element.dataset.installBound === '1') return;
            element.dataset.installBound = '1';
            element.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (deferredPwaInstallEvent) {
                    attemptInstallPrompt();
                } else {
                    showInstallInstructions();
                }
            });
        };

        bindClick(installBtn);
        bindClick(modalInstallBtn);
        if (sidebarLink && sidebarLink.dataset.installBound !== '1') {
            sidebarLink.dataset.installBound = '1';
            sidebarLink.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                showInstallInstructions();
            });
        }

        const isStandalone = (() => {
            try {
                const mq = window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
                const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
                return mq || iosStandalone;
            } catch (_) {
                return false;
            }
        })();

        if (isStandalone) {
            hideInstallButton();
            updateInstallSupportAlert('installed');
        } else {
            showInstallButton();
            if ('beforeinstallprompt' in window) {
                updateInstallSupportAlert('pending');
            } else {
                updateInstallSupportAlert('manual');
            }
        }

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPwaInstallEvent = event;
            showInstallButton();
            updateInstallSupportAlert('prompt-ready');
            if (installBtn) {
                installBtn.dataset.installReady = '1';
            }
        });

        window.addEventListener('appinstalled', () => {
            deferredPwaInstallEvent = null;
            updateInstallSupportAlert('installed');
            hideInstallButton();
            showNotification('Operaciones AIFA se instalo en este dispositivo.', 'success');
            if (installAppModalInstance && typeof installAppModalInstance.hide === 'function') {
                installAppModalInstance.hide();
            }
            checkForAppUpdates(true).catch(() => {});
        });

        if (typeof window !== 'undefined') {
            window.showInstallInstructions = showInstallInstructions;
        }
        return swRegistrationPromise;
    } catch (err) {
        console.warn('setupPwaInstallExperience failed:', err);
        return null;
    }
}

function parseIsoDay(iso) {
    if (typeof iso !== 'string') return null;
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some(num => !Number.isFinite(num))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

let WEEKDAY_FORMATTER;
try {
    WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-MX', { weekday: 'long' });
} catch (_) {
    WEEKDAY_FORMATTER = null;
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatShortSpanishDate(date) {
    if (!(date instanceof Date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = SPANISH_MONTH_ABBRS[date.getMonth()] || '';
    const year = date.getFullYear();
    return month ? `${day} ${month} ${year}` : `${day} ${year}`;
}

function formatWeeklyDayLabel(isoDate, fallback = '') {
    if (!isoDate) {
        const fallbackStr = fallback || '';
        return { day: fallbackStr, date: '', combined: fallbackStr };
    }
    const date = parseIsoDay(isoDate);
    const fallbackStr = fallback || isoDate || '';
    if (!date) return { day: fallbackStr, date: '', combined: fallbackStr };
    let weekday = '';
    try {
        weekday = WEEKDAY_FORMATTER ? WEEKDAY_FORMATTER.format(date) : '';
    } catch (_) {
        weekday = '';
    }
    if (!weekday) {
        weekday = SPANISH_WEEKDAY_NAMES[date.getDay()] || '';
    }
    const prettyWeekday = capitalizeFirst(weekday);
    const prettyDate = formatShortSpanishDate(date);
    const combined = prettyWeekday && prettyDate
        ? `${prettyWeekday} (${prettyDate})`
        : (prettyWeekday || prettyDate || fallbackStr);
    return {
        day: prettyWeekday || fallbackStr,
        date: prettyDate,
        combined,
        fallback: fallbackStr
    };
}

function isDateInRange(target, startIso, endIso) {
    const start = parseIsoDay(startIso);
    const end = parseIsoDay(endIso);
    const day = normalizeDate(target);
    if (!start || !end || !day) return false;
    const startDay = normalizeDate(start);
    const endDay = normalizeDate(end);
    return startDay && endDay ? (day >= startDay && day <= endDay) : false;
}

function buildWeekRangeLabel(startIso, endIso) {
    const start = parseIsoDay(startIso);
    const end = parseIsoDay(endIso);
    if (!start || !end) return '';
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = SPANISH_MONTH_NAMES[start.getMonth()] || '';
    const endMonth = SPANISH_MONTH_NAMES[end.getMonth()] || '';
    if (start.getFullYear() === end.getFullYear()) {
        if (start.getMonth() === end.getMonth()) {
            return `${startDay} al ${endDay} de ${endMonth} de ${end.getFullYear()}`;
        }
        return `${startDay} de ${startMonth} al ${endDay} de ${endMonth} de ${end.getFullYear()}`;
    }
    return `${startDay} de ${startMonth} de ${start.getFullYear()} al ${endDay} de ${endMonth} de ${end.getFullYear()}`;
}

function describeWeekRange(startIso, endIso) {
    const rangeText = buildWeekRangeLabel(startIso, endIso);
    return rangeText ? `Comparativo semanal del ${rangeText}` : '';
}

const LANDSCAPE_HINT_SECTIONS = new Set([
    'operaciones-totales',
    'parte-operaciones',
    'inicio',
    'itinerario',
    'itinerario-mensual',
    'frecuencias-semana',
    'puntualidad-agosto',
    'demoras',
    'comparativa',
    'manifiestos'
]);

const LANDSCAPE_HINT_MESSAGES = {
    'operaciones-totales': 'Gira tu dispositivo a horizontal para revisar el resumen completo de operaciones.',
    'parte-operaciones': 'Gira tu dispositivo para ver el parte de operaciones sin recortes.',
    'inicio': 'Las tablas del itinerario diario se consultan mejor con el teléfono en horizontal.',
    'itinerario': 'Gira tu dispositivo para explorar las gráficas con más espacio.',
    'itinerario-mensual': 'Usa la orientación horizontal para revisar todo el itinerario mensual.',
    'frecuencias-semana': 'Gira tu teléfono para comparar las frecuencias semanales cómodamente.',
    'puntualidad-agosto': 'La vista de puntualidad se muestra completa en horizontal.',
    'demoras': 'Gira tu dispositivo para ver todos los detalles de las demoras.',
    'comparativa': 'Gira tu teléfono para analizar la comparativa completa.',
    'manifiestos': 'Los manifiestos se leen mejor con el dispositivo en horizontal.'
};

let currentSectionKey = 'operaciones-totales';
let orientationHintMuteUntil = 0;
let orientationQuickToggleEl = null;

const ORIENTATION_LOCK_ERROR_MESSAGE = 'No fue posible forzar la orientación. Activa la rotación automática de tu dispositivo.';

function isLikelyPhoneViewport() {
    try {
        if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
            return navigator.userAgentData.mobile;
        }
        const ua = (navigator.userAgent || navigator.vendor || '').trim();
        const tabletIndicators = /(iPad|Tablet|Tab(?! key)|Kindle|Silk|PlayBook|Nexus\s?(7|9|10)|SM-T|Lenovo\sTab|Pixel\sC)/i;
        if (tabletIndicators.test(ua)) {
            return false;
        }
        if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
            return false;
        }
        if (/\b(Mobi|iPhone|Phone)\b/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua))) {
            return true;
        }
        const innerWidth = window.innerWidth || 0;
        const outerWidth = window.outerWidth || 0;
        const screenWidth = window.screen && window.screen.width ? window.screen.width : innerWidth;
        const screenHeight = window.screen && window.screen.height ? window.screen.height : (window.innerHeight || screenWidth);
        const minScreen = Math.min(screenWidth, screenHeight);
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = minScreen / dpr;
        const widthCandidates = [innerWidth, outerWidth, logicalWidth, screenWidth].filter((value) => value && Number.isFinite(value));
        const effectiveWidth = widthCandidates.length ? Math.min(...widthCandidates) : 0;
        return effectiveWidth > 0 && effectiveWidth <= 640;
    } catch (_) {
        return false;
    }
}

function isPortraitViewport() {
    try {
        const innerW = window.innerWidth || 0;
        const innerH = window.innerHeight || 0;
        const screenW = window.screen && window.screen.width ? window.screen.width : innerW;
        const screenH = window.screen && window.screen.height ? window.screen.height : innerH;
        const width = Math.min(innerW || screenW, screenW || innerW);
        const height = Math.max(innerH || screenH, screenH || innerH);
        if (!width || !height) return false;
        return height >= width;
    } catch (_) {
        return false;
    }
}

function hideOrientationHint() {
    const hint = document.getElementById('orientation-hint');
    if (!hint) return;
    hint.classList.remove('visible');
    hint.setAttribute('aria-hidden', 'true');
}

async function attemptOrientationLock() {
    if (!('orientation' in screen) || typeof screen.orientation.lock !== 'function') {
        throw new Error('unsupported');
    }
    const alreadyLandscape = !isPortraitViewport();
    let fullscreenRequested = false;
    let lockSucceeded = false;
    let lastError = null;
    const rootEl = document.documentElement || document.body;
    if (!document.fullscreenElement && rootEl && rootEl.requestFullscreen) {
        try {
            await rootEl.requestFullscreen({ navigationUI: 'hide' });
            fullscreenRequested = true;
        } catch (_) {
            /* ignore fullscreen failures */
        }
    }
    try {
        await screen.orientation.lock('landscape');
        lockSucceeded = true;
    } catch (err) {
        lastError = err;
        if (err && (err.name === 'NotSupportedError' || err.name === 'NotAllowedError')) {
            try {
                await screen.orientation.lock('landscape-primary');
                lockSucceeded = true;
                lastError = null;
            } catch (secondaryErr) {
                lastError = secondaryErr;
            }
        }
    }
    const exitFullscreenIfNeeded = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    };
    if (fullscreenRequested && document.exitFullscreen) {
        if (lockSucceeded && !alreadyLandscape) {
            setTimeout(exitFullscreenIfNeeded, 600);
        } else {
            exitFullscreenIfNeeded();
        }
    }
    if (!lockSucceeded) {
        throw (lastError || new Error('orientation lock failed'));
    }
}

async function handleOrientationQuickToggleClick(event) {
    event.preventDefault();
    try {
        await attemptOrientationLock();
        orientationHintMuteUntil = Date.now() + 300000;
        hideOrientationHint();
        setTimeout(() => refreshOrientationHint(currentSectionKey), 700);
    } catch (err) {
        orientationHintMuteUntil = 0;
        const message = (err && err.message === 'unsupported')
            ? 'Tu navegador no permite ajustar la orientación automáticamente. Activa la rotación manualmente.'
            : ORIENTATION_LOCK_ERROR_MESSAGE;
        window.alert(message);
    }
}

function refreshOrientationHint(sectionKey) {
    const hint = document.getElementById('orientation-hint');
    if (!hint) return;
    const effectiveSection = sectionKey || currentSectionKey;
    const app = document.getElementById('main-app');
    if (app && app.classList.contains('hidden')) {
        hideOrientationHint();
        return;
    }
    const now = Date.now();
    const requiresLandscape = LANDSCAPE_HINT_SECTIONS.has(effectiveSection);
    const quickToggle = orientationQuickToggleEl || document.getElementById('orientation-quick-toggle');
    if (quickToggle) {
        orientationQuickToggleEl = quickToggle;
        const showButton = requiresLandscape && isLikelyPhoneViewport();
        quickToggle.classList.toggle('visible', showButton);
        quickToggle.setAttribute('aria-hidden', showButton ? 'false' : 'true');
        quickToggle.disabled = !showButton;
        quickToggle.tabIndex = showButton ? 0 : -1;
    }
    const shouldShow = requiresLandscape && isLikelyPhoneViewport() && isPortraitViewport() && now >= orientationHintMuteUntil;
    if (!shouldShow) {
        if (!isPortraitViewport()) {
            orientationHintMuteUntil = 0;
        }
        hideOrientationHint();
        return;
    }
    const messageEl = hint.querySelector('.orientation-hint-message');
    if (messageEl) {
        const message = LANDSCAPE_HINT_MESSAGES[effectiveSection] || 'Gira tu dispositivo para ver la información completa.';
        messageEl.textContent = message;
    }
    hint.classList.add('visible');
    hint.setAttribute('aria-hidden', 'false');
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const dismissBtn = document.querySelector('[data-dismiss-orientation]');
        if (dismissBtn && !dismissBtn._wired) {
            dismissBtn._wired = 1;
            dismissBtn.addEventListener('click', () => {
                orientationHintMuteUntil = Date.now() + 60000;
                hideOrientationHint();
            });
        }
        const hint = document.getElementById('orientation-hint');
        if (hint && !hint._wired) {
            hint._wired = 1;
            hint.addEventListener('click', (ev) => {
                if (ev.target === hint) {
                    orientationHintMuteUntil = Date.now() + 60000;
                    hideOrientationHint();
                }
            });
        }
        const quickToggle = document.getElementById('orientation-quick-toggle');
        if (quickToggle && !quickToggle._wired) {
            quickToggle._wired = 1;
            orientationQuickToggleEl = quickToggle;
            quickToggle.disabled = true;
            quickToggle.tabIndex = -1;
            quickToggle.setAttribute('aria-hidden', 'true');
            quickToggle.addEventListener('click', handleOrientationQuickToggleClick);
        }
        refreshOrientationHint(currentSectionKey);
    } catch (_) { /* ignore wiring issues */ }
});

['orientationchange', 'resize'].forEach((evt) => {
    window.addEventListener(evt, () => {
        refreshOrientationHint();
    }, { passive: true });
});

try {
    const screenOrientation = window.screen && window.screen.orientation;
    if (screenOrientation && typeof screenOrientation.addEventListener === 'function') {
        screenOrientation.addEventListener('change', () => refreshOrientationHint(), { passive: true });
    }
} catch (_) { /* ignore screen orientation detection issues */ }

function escapeHTML(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function hasWeekData(week) {
    return Array.isArray(week?.dias) && week.dias.some(day => day && (day.comercial || day.general || day.carga));
}

function deepCloneWeek(week) {
    if (!week) return { id: null, rango: {}, dias: [] };
    const clone = {
        id: week.id || null,
        rango: week.rango ? { ...week.rango } : {},
        dias: Array.isArray(week.dias)
            ? week.dias.map(day => {
                if (!day) return day;
                const labelParts = formatWeeklyDayLabel(day.fecha, day.label);
                return {
                    ...day,
                    label: labelParts.day,
                    labelDate: labelParts.date,
                    labelFull: labelParts.combined,
                    comercial: day?.comercial ? { ...day.comercial } : {},
                    general: day?.general ? { ...day.general } : {},
                    carga: day?.carga ? { ...day.carga } : {}
                };
            })
            : []
    };
    if (week.meta) clone.meta = { ...week.meta };
    return clone;
}

const WEEKLY_OPERATIONS_DATASETS = [

    {
        id: '2025-12-01',
        rango: {
            inicio: '2025-12-01',
            fin: '2025-12-07',
            descripcion: describeWeekRange('2025-12-01', '2025-12-07'),
            nota: 'Semana del (1 al 7 de diciembre de 2025).'
        },
        dias: [
            {
                fecha: '2025-12-01',
                label: '01 Dic 2025',
                comercial: { operaciones: 154, pasajeros: 22766},
                general: { operaciones: 8, pasajeros: 27 },
                carga: { operaciones: 22, toneladas: 872, corteFecha: '2025-11-30', corteNota: 'Cifras del 30 de noviembre de 2025.' }
            },

            {
                fecha: '2025-12-02',
                label: '02 Dic 2025',
                comercial: { operaciones: 130, pasajeros: 17667},
                general: { operaciones: 3, pasajeros: 4 },
                carga: { operaciones: 22, toneladas: 872, corteFecha: '2025-11-30', corteNota: 'Cifras del 30 de noviembre de 2025.' }
            },


            {
                fecha: '2025-12-03',
                label: '03 Dic 2025',
                comercial: { operaciones: 145, pasajeros: 19149},
                general: { operaciones: 9, pasajeros: 332 },
                carga: { operaciones: 6, toneladas: 40, corteFecha: '2025-12-03', corteNota: 'Cifras del 03 de diciembre de 2025.' }
            },





        ]
    },

    {
        id: '2025-11-24',
        rango: {
            inicio: '2025-11-24',
            fin: '2025-11-30',
            descripcion: describeWeekRange('2025-11-24', '2025-11-30'),
            nota: 'Semana del (24 al 30 de noviembre de 2025).'
        },
        dias: [
            {
                fecha: '2025-11-24',
                label: '24 Nov 2025',
                comercial: { operaciones: 145, pasajeros: 16066 },
                general: { operaciones: 7, pasajeros: 16 },
                carga: { operaciones: 31, toneladas: 802, corteFecha: '2025-11-23', corteNota: 'Cifras del 23 de noviembre de 2025.' }
            },

         
{
                fecha: '2025-11-25',
                label: '25 Nov 2025',
                comercial: { operaciones: 143, pasajeros: 20441},
                general: { operaciones: 8, pasajeros: 18 },
                carga: { operaciones: 26, toneladas: 690, corteFecha: '2025-11-25', corteNota: 'Cifras del 25 de noviembre de 2025.' }
            },


            {
                fecha: '2025-11-26',
                label: '26 Nov 2025',
                comercial: { operaciones: 149, pasajeros: 20080},
                general: { operaciones: 23, pasajeros: 44 },
                carga: { operaciones: 26, toneladas: 690, corteFecha: '2025-11-25', corteNota: 'Cifras del 25 de noviembre de 2025.' }
            },

            

{
                fecha: '2025-11-27',
                label: '27 Nov 2025',
                comercial: { operaciones: 146, pasajeros: 21113},
                general: { operaciones: 0, pasajeros: 0 },
                carga: { operaciones: 26, toneladas: 690, corteFecha: '2025-11-25', corteNota: 'Cifras del 25 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-28',
                label: '28 Nov 2025',
                comercial: { operaciones: 146, pasajeros: 21241},
                general: { operaciones: 6, pasajeros: 57 },
                carga: { operaciones: 30, toneladas: 957, corteFecha: '2025-11-27', corteNota: 'Cifras del 27 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-29',
                label: '29 Nov 2025',
                comercial: { operaciones: 135, pasajeros: 18639},
                general: { operaciones: 4, pasajeros: 18 },
                carga: { operaciones: 30, toneladas: 957, corteFecha: '2025-11-27', corteNota: 'Cifras del 27 de noviembre de 2025.' }
            }




        ]
    },

    {
        id: '2025-11-17',
        rango: {
            inicio: '2025-11-17',
            fin: '2025-11-23',
            descripcion: describeWeekRange('2025-11-17', '2025-11-23'),
            nota: 'Semana del (17 al 23 de noviembre de 2025). Datos en Integración.'
        },
        dias: [
            {
                fecha: '2025-11-17',
                label: '17 Nov 2025',
                comercial: { operaciones: 156, pasajeros: 21082 },
                general: { operaciones: 6, pasajeros: 19 },
                carga: { operaciones: 21, toneladas: 706, corteFecha: '2025-11-13', corteNota: 'Cifras del 13 de noviembre de 2025.' }
            },


            {
                fecha: '2025-11-18',
                label: '18 Nov 2025',
                comercial: { operaciones: 146, pasajeros: 21670},
                general: { operaciones: 17, pasajeros: 36 },
                carga: { operaciones: 17, toneladas: 654, corteFecha: '2025-11-17', corteNota: 'Cifras del 17 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-19',
                label: '19 Nov 2025',
                comercial: { operaciones: 151, pasajeros: 19479},
                general: { operaciones: 10, pasajeros: 31 },
                carga: { operaciones: 12, toneladas: 423, corteFecha: '2025-11-19', corteNota: 'Cifras del 19 de noviembre de 2025.' }
            },

        
            {
                fecha: '2025-11-20',
                label: '20 Nov 2025',
                comercial: { operaciones: 150, pasajeros: 19728},
                general: { operaciones: 19, pasajeros: 39 },
                carga: { operaciones: 12, toneladas: 423, corteFecha: '2025-11-19', corteNota: 'Cifras del 19 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-21',
                label: '21 Nov 2025',
                comercial: { operaciones: 150, pasajeros: 20384},
                general: { operaciones: 7, pasajeros: 29 },
                carga: { operaciones: 31, toneladas: 802, corteFecha: '2025-11-20', corteNota: 'Cifras del 20 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-22',
                label: '22 Nov 2025',
                comercial: { operaciones: 143, pasajeros: 19503},
                general: { operaciones: 5, pasajeros: 13 },
                carga: { operaciones: 31, toneladas: 802, corteFecha: '2025-11-20', corteNota: 'Cifras del 20 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-23',
                label: '23 Nov 2025',
                comercial: { operaciones: 158, pasajeros: 18222},
                general: { operaciones: 2, pasajeros: 7 },
                carga: { operaciones: 31, toneladas: 802, corteFecha: '2025-11-20', corteNota: 'Cifras del 20 de noviembre de 2025.' }
            }
        ]
    },

    


    {
        id: '2025-11-10',
        rango: {
            inicio: '2025-11-10',
            fin: '2025-11-16',
            descripcion: describeWeekRange('2025-11-10', '2025-11-16'),
            nota: 'Semana del (10 al 16 de noviembre de 2025).'
        },
        dias: [
            {
                fecha: '2025-11-10',
                label: '10 Nov 2025',
                comercial: { operaciones: 152, pasajeros: 22119 },
                general: { operaciones: 9, pasajeros: 19 },
                carga: { operaciones: 31, toneladas: 1079, corteFecha: '2025-11-09', corteNota: 'Cifras del 09 de noviembre de 2025.' }
            },
            {
                fecha: '2025-11-11',
                label: '11 Nov 2025',
                comercial: { operaciones: 139, pasajeros: 18904 },
                general: { operaciones: 5, pasajeros: 14 },
                carga: { operaciones: 31, toneladas: 1079, corteFecha: '2025-11-09', corteNota: 'Cifras del 09 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-12',
                label: '12 Nov 2025',
                comercial: { operaciones: 149, pasajeros: 20757},
                general: { operaciones: 9, pasajeros: 31 },
                carga: { operaciones: 20, toneladas: 636, corteFecha: '2025-11-11', corteNota: 'Cifras del 11 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-13',
                label: '13 Nov 2025',
                comercial: { operaciones: 161, pasajeros: 22643},
                general: { operaciones: 9, pasajeros: 59 },
                carga: { operaciones: 20, toneladas: 636, corteFecha: '2025-11-11', corteNota: 'Cifras del 11 de noviembre de 2025.' }
            },
           
{
                fecha: '2025-11-14',
                label: '14 Nov 2025',
                comercial: { operaciones: 156, pasajeros: 23383},
                general: { operaciones: 7, pasajeros: 10 },
                carga: { operaciones: 21, toneladas: 706, corteFecha: '2025-11-13', corteNota: 'Cifras del 13 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-15',
                label: '15 Nov 2025',
                comercial: { operaciones: 145, pasajeros: 20880},
                general: { operaciones: 6, pasajeros: 59 },
                carga: { operaciones: 21, toneladas: 706, corteFecha: '2025-11-13', corteNota: 'Cifras del 13 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-16',
                label: '16 Nov 2025',
                comercial: { operaciones: 149, pasajeros: 19802},
                general: { operaciones: 12, pasajeros: 28 },
                carga: { operaciones: 21, toneladas: 706, corteFecha: '2025-11-13', corteNota: 'Cifras del 13 de noviembre de 2025.' }
            }




        ]
    },

    
    {
        id: '2025-11-03',
        rango: {
            inicio: '2025-11-03',
            fin: '2025-11-09',
            descripcion: describeWeekRange('2025-11-03', '2025-11-09'),
            nota: 'Semana del (3 al 9 de noviembre de 2025)'
        },
        dias: [
            {
                fecha: '2025-11-03',
                label: '03 Nov 2025',
                comercial: { operaciones: 150, pasajeros: 21525 },
                general: { operaciones: 18, pasajeros: 44 },
                carga: { operaciones: 32, toneladas: 1121, corteFecha: '2025-10-30', corteNota: 'Cifras del 30 de octubre de 2025.' }
            },
            {
                fecha: '2025-11-04',
                label: '04 Nov 2025',
                comercial: { operaciones: 142, pasajeros: 18746 },
                general: { operaciones: 14, pasajeros: 81 },
                carga: { operaciones: 22, toneladas: 753, corteFecha: '2025-11-02', corteNota: 'Cifras del 02 de noviembre de 2025.' }
            },
            {
                fecha: '2025-11-05',
                label: '05 Nov 2025',
                comercial: { operaciones: 154, pasajeros: 21097 },
                general: { operaciones: 8, pasajeros: 23 },
                carga: { operaciones: 23, toneladas: 747, corteFecha: '2025-11-04', corteNota: 'Cifras del 04 de noviembre de 2025.' }
            },

{
                fecha: '2025-11-06',
                label: '06 Nov 2025',
                comercial: { operaciones: 154, pasajeros: 21458},
                general: { operaciones: 14, pasajeros: 21 },
                carga: { operaciones: 23, toneladas: 775, corteFecha: '2025-11-04', corteNota: 'Cifras del 04 de noviembre de 2025.' }
            },

{
                fecha: '2025-11-07',
                label: '07 Nov 2025',
                comercial: { operaciones: 148, pasajeros: 21548},
                general: { operaciones: 8, pasajeros: 18 },
                carga: { operaciones: 16, toneladas: 424, corteFecha: '2025-11-06', corteNota: 'Cifras del 06 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-08',
                label: '08 Nov 2025',
                comercial: { operaciones: 136, pasajeros: 17658},
                general: { operaciones: 10, pasajeros: 23 },
                carga: { operaciones: 16, toneladas: 424, corteFecha: '2025-11-06', corteNota: 'Cifras del 06 de noviembre de 2025.' }
            },

            {
                fecha: '2025-11-09',
                label: '09 Nov 2025',
                comercial: { operaciones: 154, pasajeros: 22170},
                general: { operaciones: 5, pasajeros: 14 },
                carga: { operaciones: 16, toneladas: 424, corteFecha: '2025-11-06', corteNota: 'Cifras del 06 de noviembre de 2025.' }
            }



        ]
    },
    {
        id: '2025-10-27',
        rango: {
            inicio: '2025-10-27',
            fin: '2025-11-02',
            descripcion: describeWeekRange('2025-10-27', '2025-11-02'),
            nota: ''
        },
        dias: [
            {
                fecha: '2025-10-27',
                label: '27 Oct 2025',
                comercial: { operaciones: 142, pasajeros: 20580},
                general: { operaciones: 18, pasajeros: 121},
                carga: { operaciones: 21, toneladas: 620, corteFecha: '2025-10-23', corteNota: 'Cifras del 26 de octubre de 2025.' }
            },
            {
                fecha: '2025-10-28',
                label: '28 Oct 2025',
                comercial: { operaciones: 121, pasajeros: 16962 },
                general: { operaciones: 11, pasajeros: 27 },
                carga: { operaciones: 21, toneladas: 620, corteFecha: '2025-10-26', corteNota: 'Toneladas actualizadas al 26 de octubre de 2025 (ultimo corte disponible).' }
            },
            {
                fecha: '2025-10-29',
                label: '29 Oct 2025',
                comercial: { operaciones: 136, pasajeros: 18143 },
                general: { operaciones: 3, pasajeros: 6 },
                carga: { operaciones: 14, toneladas: 379, corteFecha: '2025-10-28', corteNota: 'Toneladas actualizadas al 28 de octubre de 2025 (ultimo corte disponible).' }
            },
            {
                fecha: '2025-10-30',
                label: '30 Oct 2025',
                comercial: { operaciones: 146, pasajeros: 20253},
                general: { operaciones: 9, pasajeros: 233},
                carga: { operaciones: 14, toneladas: 379, corteFecha: '2025-10-28', corteNota: 'Cifras del 28 de octubre de 2025' }
            },
            {
                fecha: '2025-10-31',
                label: '31 Oct 2025',
                comercial: { operaciones: 161, pasajeros: 21611 },
                general: { operaciones: 14, pasajeros: 31 },
                carga: { operaciones: 32, toneladas: 1121, corteFecha: '2025-10-30', corteNota: 'Cifras del 30 de octubre de 2025.' }
            },
            {
                fecha: '2025-11-01',
                label: '01 Nov 2025',
                comercial: { operaciones: 145, pasajeros: 17186 },
                general: { operaciones: 3, pasajeros: 47 },
                carga: { operaciones: 32, toneladas: 1121, corteFecha: '2025-10-30', corteNota: 'Cifras del 30 de octubre de 2025.' }
            },
            {
                fecha: '2025-11-02',
                label: '02 Nov 2025',
                comercial: { operaciones: 160, pasajeros: 20977},
                general: { operaciones: 17, pasajeros: 209 },
                carga: { operaciones: 32, toneladas: 1121, corteFecha: '2025-10-30', corteNota: 'Cifras del 30 de octubre de 2025.' }
            }
        ]
    },
    {
        id: '2025-10-20',
        rango: {
            inicio: '2025-10-20',
            fin: '2025-10-26',
            descripcion: describeWeekRange('2025-10-20', '2025-10-26'),
            nota: 'Datos consolidados al 26 de octubre de 2025.'
        },
        dias: []
    }
];

function getWeekStartDate(week) {
    if (!week) return null;
    const startIso = week?.rango?.inicio || (typeof week?.id === 'string' ? week.id : null);
    return parseIsoDay(startIso || '');
}

function getMonthlyOrdinalFromDate(date) {
    if (!(date instanceof Date)) return null;
    const day = Number(date.getDate()) || 1;
    const ordinal = Math.floor((day - 1) / 7) + 1;
    return Math.max(1, Math.min(6, ordinal));
}

function buildWeeklyOrdinalMetadata() {
    const map = Object.create(null);
    WEEKLY_OPERATIONS_DATASETS.forEach((week) => {
        if (!week || !week.id) return;
        const start = getWeekStartDate(week);
        if (!start) return;
        const monthName = SPANISH_MONTH_NAMES[start.getMonth()] || '';
        map[week.id] = {
            ordinal: getMonthlyOrdinalFromDate(start),
            monthName,
            year: start.getFullYear()
        };
    });
    return map;
}

const WEEKLY_ORDINAL_METADATA = buildWeeklyOrdinalMetadata();

function formatSpanishOrdinalFeminine(n) {
    if (!Number.isFinite(n) || n <= 0) return '';
    const lookup = { 1: '1ª', 2: '2ª', 3: '3ª', 4: '4ª', 5: '5ª' };
    if (lookup[n]) return lookup[n];
    return `${n}ª`;
}

function resolveCurrentOperationsWeek(referenceDate = new Date()) {
    const today = normalizeDate(referenceDate instanceof Date ? referenceDate : new Date());
    const orderedWeeks = [...WEEKLY_OPERATIONS_DATASETS].sort((a, b) => {
        const aEnd = parseIsoDay(a?.rango?.fin || '') || new Date(0);
        const bEnd = parseIsoDay(b?.rango?.fin || '') || new Date(0);
        return bEnd - aEnd;
    });

    const currentWeek = orderedWeeks.find(week => week?.rango && isDateInRange(today, week.rango.inicio, week.rango.fin)) || null;
    const datasetWithData = currentWeek && hasWeekData(currentWeek)
        ? currentWeek
        : orderedWeeks.find(hasWeekData) || null;

    if (!datasetWithData) {
        const fallbackRange = currentWeek?.rango ? { ...currentWeek.rango } : { descripcion: 'Sin datos semanales disponibles', nota: '' };
        const noticeRange = currentWeek?.rango ? buildWeekRangeLabel(currentWeek.rango.inicio, currentWeek.rango.fin) : '';
        return {
            id: currentWeek?.id || null,
            rango: fallbackRange,
            dias: [],
            meta: {
                targetWeekId: currentWeek?.id || null,
                resolvedWeekId: null,
                isFallback: false,
                requestedRange: currentWeek?.rango ? { ...currentWeek.rango } : null,
                notice: noticeRange ? `Sin datos confirmados para la semana del ${noticeRange}.` : 'Sin datos semanales disponibles.'
            }
        };
    }

    const resolved = deepCloneWeek(datasetWithData);
    if (!resolved.meta) resolved.meta = {};
    resolved.meta.targetWeekId = currentWeek?.id || null;
    resolved.meta.resolvedWeekId = datasetWithData.id || null;
    resolved.meta.requestedRange = currentWeek?.rango ? { ...currentWeek.rango } : null;
    resolved.meta.isFallback = !!(currentWeek && currentWeek.id !== datasetWithData.id);
    if (!resolved.rango.descripcion && datasetWithData?.rango) {
        resolved.rango.descripcion = describeWeekRange(datasetWithData.rango.inicio, datasetWithData.rango.fin);
    }
    if (resolved.meta.isFallback && currentWeek?.rango && datasetWithData?.rango) {
        const targetLabel = buildWeekRangeLabel(currentWeek.rango.inicio, currentWeek.rango.fin);
        const resolvedLabel = buildWeekRangeLabel(datasetWithData.rango.inicio, datasetWithData.rango.fin);
        resolved.meta.notice = `Sin datos confirmados para la semana del ${targetLabel}. Se muestra la semana del ${resolvedLabel}.`;
    }
    return resolved;
}


// Datos Anuales
const staticData = {
    operacionesTotales: {
        comercial: [ { periodo: '2022', operaciones: 8996, pasajeros: 912415 }, { periodo: '2023', operaciones: 23211, pasajeros: 2631261 }, { periodo: '2024', operaciones: 51734, pasajeros: 6318454 }, { periodo: '2025', operaciones: 47746, pasajeros: 6328669} ],
        carga: [ { periodo: '2022', operaciones: 8, toneladas: 5.19 }, { periodo: '2023', operaciones: 5578, toneladas: 186319.83}, { periodo: '2024', operaciones: 13219, toneladas: 447341.17 }, { periodo: '2025', operaciones: 10777, toneladas: 363975.08} ],
        general: [ { periodo: '2022', operaciones: 458, pasajeros: 1385 }, { periodo: '2023', operaciones: 2212, pasajeros: 8160 }, { periodo: '2024', operaciones: 2777, pasajeros: 29637 }, { periodo: '2025', operaciones: 2796, pasajeros: 19718} ]
    },
    operacionesSemanasCatalogo: WEEKLY_OPERATIONS_DATASETS.map(deepCloneWeek),
    operacionesSemanaActual: resolveCurrentOperationsWeek(),
    // Datos mensuales 2025 (hasta septiembre): Comercial y Carga
    mensual2025: {
        comercial: [
            { mes: '01', label: 'Enero', operaciones: 4488 },
            { mes: '02', label: 'Febrero', operaciones: 4016 },
            { mes: '03', label: 'Marzo', operaciones: 4426 },
            { mes: '04', label: 'Abril', operaciones: 4575 },
            { mes: '05', label: 'Mayo', operaciones: 4443 },
            { mes: '06', label: 'Junio', operaciones: 4129 },
            { mes: '07', label: 'Julio', operaciones: 4430 },
            { mes: '08', label: 'Agosto', operaciones: 4500 },
            { mes: '09', label: 'Septiembre', operaciones: 4135 },
            { mes: '10', label: 'Octubre', operaciones: 4291 },
            { mes: '11', label: 'Noviembre', operaciones: 4313 }
        ],
        // Pasajeros de aviación comercial por mes (con proyección conservadora 81% donde indica)
        comercialPasajeros: [
            { mes: '01', label: 'Enero', pasajeros: 565716 },
            { mes: '02', label: 'Febrero', pasajeros: 488440 },
            { mes: '03', label: 'Marzo', pasajeros: 570097 },
            { mes: '04', label: 'Abril', pasajeros: 621197 },
            { mes: '05', label: 'Mayo', pasajeros: 586299 },
            { mes: '06', label: 'Junio', pasajeros: 541400 },
            { mes: '07', label: 'Julio', pasajeros: 604758 },
            { mes: '08', label: 'Agosto', pasajeros: 630952 },
            { mes: '09', label: 'Septiembre', pasajeros: 546457 },
            { mes: '10', label: 'Octubre', pasajeros: 584629 },
            { mes: '11', label: 'Noviembre', pasajeros: 588724 },
            { mes: '12', label: 'Diciembre (Proy.)', pasajeros: 704718 }
        ],
        carga: [
            { mes: '01', label: 'Enero', operaciones: 880 },
            { mes: '02', label: 'Febrero', operaciones: 803 },
            { mes: '03', label: 'Marzo', operaciones: 916 },
            { mes: '04', label: 'Abril', operaciones: 902 },
            { mes: '05', label: 'Mayo', operaciones: 1006 },
            { mes: '06', label: 'Junio', operaciones: 1014 },
            { mes: '07', label: 'Julio', operaciones: 1021 },
            { mes: '08', label: 'Agosto', operaciones: 1082 },
            { mes: '09', label: 'Septiembre', operaciones: 992},
            { mes: '10', label: 'Octubre', operaciones: 1155 },
            { mes: '11', label: 'Noviembre', operaciones: 1006 }
        ],
        // Toneladas por mes (con nulos cuando no hay datos)
        cargaToneladas: [
            { mes: '01', label: 'Enero', toneladas: 27764.47},
            { mes: '02', label: 'Febrero', toneladas: 26628.78},
            { mes: '03', label: 'Marzo', toneladas: 33154.97},
            { mes: '04', label: 'Abril', toneladas: 30785.67 },
            { mes: '05', label: 'Mayo', toneladas: 34190.60 },
            { mes: '06', label: 'Junio', toneladas: 37708.07 },
            { mes: '07', label: 'Julio', toneladas: 35649.92 },
            { mes: '08', label: 'Agosto', toneladas: 35737.78 },
            { mes: '09', label: 'Septiembre', toneladas: 31076.71 },
            { mes: '10', label: 'Octubre', toneladas: 37273.41},
            { mes: '11', label: 'Noviembre', toneladas: 34004.70 },
            { mes: '12', label: 'Diciembre', toneladas: null }
        ],
        // Aviación general (operaciones y pasajeros)
        general: {
            operaciones: [
                { mes: '01', label: 'Enero', operaciones: 251 },
                { mes: '02', label: 'Febrero', operaciones: 242 },
                { mes: '03', label: 'Marzo', operaciones: 272 },
                { mes: '04', label: 'Abril', operaciones: 249 },
                { mes: '05', label: 'Mayo', operaciones: 226 },
                { mes: '06', label: 'Junio', operaciones: 209 },
                { mes: '07', label: 'Julio', operaciones: 234 },
                { mes: '08', label: 'Agosto', operaciones: 282 },
                { mes: '09', label: 'Septiembre', operaciones: 249 },
                { mes: '10', label: 'Octubre', operaciones: 315 },
                { mes: '11', label: 'Noviembre', operaciones: 267 },
                { mes: '12', label: 'Diciembre', operaciones: null }
            ],
            pasajeros: [
                { mes: '01', label: 'Enero', pasajeros: 2353 },
                { mes: '02', label: 'Febrero', pasajeros: 1348 },
                { mes: '03', label: 'Marzo', pasajeros: 1601 },
                { mes: '04', label: 'Abril', pasajeros: 1840 },
                { mes: '05', label: 'Mayo', pasajeros: 1576 },
                { mes: '06', label: 'Junio', pasajeros: 3177 },
                { mes: '07', label: 'Julio', pasajeros: 1515 },
                { mes: '08', label: 'Agosto', pasajeros: 3033 },
                { mes: '09', label: 'Septiembre', pasajeros: 948 },
                { mes: '10', label: 'Octubre', pasajeros: 1298},
                { mes: '11', label: 'Noviembre', pasajeros: 1029 },
                { mes: '12', label: 'Diciembre', pasajeros: null }
            ]
        }
    },
    mensualYear: '2025',
    demoras: {
        periodo: "Noviembre 2025",
        causas: [ { causa: 'Repercusión', demoras: 507 }, { causa: 'Compañía', demoras: 190 }, { causa: 'Evento Circunstancial', demoras: 3 }, { causa: 'Combustible', demoras: 1 }, { causa: 'Autoridad', demoras: 0 }, { causa: 'Meteorología', demoras: 12 }, { causa: 'Aeropuerto', demoras: 1 }, ]
    }
};

function getOpsAvailableYearsFromTotals(source = staticData?.operacionesTotales) {
    const groups = ['comercial', 'carga', 'general'];
    const years = new Set();
    groups.forEach((key) => {
        const entries = source?.[key];
        if (!Array.isArray(entries)) return;
        entries.forEach((entry) => {
            const year = entry?.periodo;
            if (year === undefined || year === null) return;
            years.add(String(year));
        });
    });
    return Array.from(years).sort((a, b) => Number(a) - Number(b));
}

function deriveLatestOpsYearFromStaticData() {
    try {
        const years = getOpsAvailableYearsFromTotals();
        if (years.length) return years[years.length - 1];
    } catch (_) {}
    return String(new Date().getFullYear());
}

function getOpsActiveMonthlyYear() {
    if (staticData?.mensualYear) return String(staticData.mensualYear);
    return deriveLatestOpsYearFromStaticData();
}

const AVIATION_ANALYTICS_SCOPES = ['comercial','general','carga'];
const AVIATION_ANALYTICS_MONTH_KEYS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const AVIATION_ANALYTICS_MONTH_LABELS = AVIATION_ANALYTICS_MONTH_KEYS.map((m) => m.charAt(0).toUpperCase() + m.slice(1));
const DEFAULT_AVIATION_ANALYTICS_CUTOFF_INDEX = AVIATION_ANALYTICS_MONTH_KEYS.length - 1;
const AVIATION_ANALYTICS_DATA_PATH = 'data/aviacion_analytics.json';
let AVIATION_ANALYTICS_CUTOFF_YEAR = deriveLatestOpsYearFromStaticData();
let AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX = DEFAULT_AVIATION_ANALYTICS_CUTOFF_INDEX;
let AVIATION_ANALYTICS_DATA = null;
let aviationAnalyticsDataPromise = null;
let aviationAnalyticsLoadError = null;
let AVIATION_ANALYTICS_DATA_SIGNATURE = null;
const AVIATION_ANALYTICS_AUTO_REFRESH_INTERVAL = 2 * 60 * 1000;
let aviationAnalyticsAutoRefreshTimer = null;
let aviationAnalyticsRefreshInFlight = null;
let aviationAnalyticsVisibilityWatcherBound = false;

function resolveAviationAnalyticsDataUrl(cacheBust = false) {
    const basePath = AVIATION_ANALYTICS_DATA_PATH;
    if (!cacheBust) return basePath;
    try {
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            return basePath;
        }
    } catch (_) {
        return basePath;
    }
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}ts=${Date.now()}`;
}

function getCurrentMonthIndex() {
    try {
        const today = new Date();
        const month = today.getMonth();
        return Number.isFinite(month) ? month : null;
    } catch (_) {
        return null;
    }
}

function hasMeaningfulAviationValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, ''));
        return Number.isFinite(parsed);
    }
    return false;
}

function clampAnalyticsCutoffToCurrentDate(candidateIndex, yearKey) {
    if (!Number.isFinite(candidateIndex)) return candidateIndex;
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        if (Number(yearKey) !== currentYear) return candidateIndex;
        const currentMonthIndex = now.getMonth();
        const maxClosedIndex = currentMonthIndex - 1;
        if (maxClosedIndex < 0) return -1;
        return Math.min(candidateIndex, maxClosedIndex);
    } catch (_) {
        return candidateIndex;
    }
}

function determineAviationAnalyticsCutoff(rawPayload = {}, targetYear) {
    const yearKey = targetYear ? String(targetYear) : null;
    if (!yearKey) return null;
    for (let idx = AVIATION_ANALYTICS_MONTH_KEYS.length - 1; idx >= 0; idx -= 1) {
        const monthKey = AVIATION_ANALYTICS_MONTH_KEYS[idx];
        const hasData = AVIATION_ANALYTICS_SCOPES.some((scopeKey) => {
            const scopePayload = rawPayload[scopeKey];
            if (!scopePayload || typeof scopePayload !== 'object') return false;
            return Object.values(scopePayload).some((metricPayload) => {
                if (!metricPayload || typeof metricPayload !== 'object') return false;
                const yearPayload = metricPayload[yearKey];
                if (!yearPayload || typeof yearPayload !== 'object') return false;
                if (!Object.prototype.hasOwnProperty.call(yearPayload, monthKey)) return false;
                return hasMeaningfulAviationValue(yearPayload[monthKey]);
            });
        });
        if (hasData) {
            return clampAnalyticsCutoffToCurrentDate(idx, yearKey);
        }
    }
    return null;
}

function deriveLatestAviationAnalyticsYear(rawPayload = {}) {
    try {
        const years = new Set();
        AVIATION_ANALYTICS_SCOPES.forEach((scopeKey) => {
            const scopePayload = rawPayload?.[scopeKey];
            if (!scopePayload || typeof scopePayload !== 'object') return;
            Object.values(scopePayload).forEach((metricPayload) => {
                if (!metricPayload || typeof metricPayload !== 'object') return;
                Object.keys(metricPayload).forEach((yearKey) => {
                    if (yearKey === 'acumulado') return;
                    if (/^\d{4}$/.test(yearKey)) years.add(yearKey);
                });
            });
        });
        if (!years.size) return null;
        return Array.from(years).sort((a, b) => Number(a) - Number(b)).pop() || null;
    } catch (err) {
        console.warn('deriveLatestAviationAnalyticsYear failed:', err);
        return null;
    }
}

function transformAviationAnalyticsSource(source = {}) {
    const months = AVIATION_ANALYTICS_MONTH_KEYS.slice();
    const monthLabels = AVIATION_ANALYTICS_MONTH_LABELS.slice();
    const result = { months, monthLabels, years: [], metrics: [] };
    const metricKeys = Object.keys(source).filter((key) => source[key] && typeof source[key] === 'object');
    const yearSet = new Set();
    const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    metricKeys.forEach((metric) => {
        const metricSource = source[metric] || {};
        result[metric] = { years: Object.create(null), acumulado: Number(metricSource.acumulado || 0) };
        Object.entries(metricSource).forEach(([year, payload]) => {
            if (year === 'acumulado') return;
            const yearData = { total: Number((payload && payload.total_por_ano) || 0), months: Object.create(null) };
            months.forEach((month) => {
                yearData.months[month] = toNumber(payload ? payload[month] : null);
            });
            result[metric].years[year] = yearData;
            yearSet.add(String(year));
        });
        result.metrics.push(metric);
    });

    result.years = Array.from(yearSet).sort((a, b) => Number(a) - Number(b));
    return result;
}

function applyAviationAnalyticsCutoff(dataset, targetYear, lastClosedMonthIndex) {
    if (!dataset || !dataset.metrics || typeof lastClosedMonthIndex !== 'number') return;
    const months = Array.isArray(dataset.months) ? dataset.months : [];
    if (!months.length) return;
    const normalizedIndex = Math.min(lastClosedMonthIndex, months.length - 1);
    const cutoff = Math.max(-1, normalizedIndex);
    const monthsToNull = cutoff >= 0 ? months.slice(cutoff + 1) : months.slice(0);
    dataset.metrics.forEach((metric) => {
        const metricData = dataset[metric];
        if (!metricData || !metricData.years) return;
        const yearData = metricData.years[targetYear];
        if (!yearData || !yearData.months) return;
        monthsToNull.forEach((monthKey) => {
            yearData.months[monthKey] = null;
        });
    });
    recomputeAviationMetricTotals(dataset);
}

function recomputeAviationMetricTotals(dataset) {
    if (!dataset || !dataset.metrics) return;
    dataset.metrics.forEach((metric) => {
        const metricData = dataset[metric];
        if (!metricData || !metricData.years) return;
        let acumulado = 0;
        Object.values(metricData.years).forEach((yearData) => {
            if (!yearData || !yearData.months) return;
            let total = 0;
            Object.values(yearData.months).forEach((value) => {
                if (isFiniteNumber(value)) total += value;
            });
            yearData.total = total;
            if (isFiniteNumber(total)) acumulado += total;
        });
        metricData.acumulado = acumulado;
    });
}

function buildAviationAnalyticsDataset(rawPayload = {}) {
    const safePayload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
    const target = Object.create(null);
    const cutoffIndex = determineAviationAnalyticsCutoff(safePayload, AVIATION_ANALYTICS_CUTOFF_YEAR);
    const effectiveCutoff = Number.isFinite(cutoffIndex) ? cutoffIndex : DEFAULT_AVIATION_ANALYTICS_CUTOFF_INDEX;
    const sanitizedCutoff = Math.max(-1, Math.min(effectiveCutoff, AVIATION_ANALYTICS_MONTH_KEYS.length - 1));
    AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX = sanitizedCutoff;
    AVIATION_ANALYTICS_SCOPES.forEach((scopeKey) => {
        target[scopeKey] = transformAviationAnalyticsSource(safePayload[scopeKey] || {});
        applyAviationAnalyticsCutoff(target[scopeKey], AVIATION_ANALYTICS_CUTOFF_YEAR, sanitizedCutoff);
    });
    return target;
}

function normalizeAnalyticsTotal(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function normalizeAnalyticsMonthly(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function deriveOpsYearlySeriesFromAnalytics(dataset, scopeKey, metricMappings = []) {
    const scopeData = dataset && dataset[scopeKey];
    if (!scopeData) return [];
    const years = Array.isArray(scopeData.years) ? scopeData.years.map((year) => String(year)) : [];
    return years.map((year) => {
        const entry = { periodo: year };
        metricMappings.forEach(({ metricKey, prop }) => {
            const metricData = scopeData[metricKey];
            const total = metricData?.years?.[year]?.total;
            entry[prop] = normalizeAnalyticsTotal(total);
        });
        return entry;
    });
}

function deriveOpsMonthlySeriesFromAnalytics(dataset, scopeKey, metricKey, valueProp, year, cutoffIndex) {
    const scopeData = dataset && dataset[scopeKey];
    const metricData = scopeData?.[metricKey];
    const yearData = metricData?.years?.[year];
    return AVIATION_ANALYTICS_MONTH_KEYS.map((monthKey, index) => {
        const raw = yearData?.months ? yearData.months[monthKey] : null;
        let value = normalizeAnalyticsMonthly(raw);
        const baseLabel = AVIATION_ANALYTICS_MONTH_LABELS[index] || monthKey;
        const isProjection = index > cutoffIndex || value === null;
        if (index > cutoffIndex) {
            value = null;
        }
        return {
            mes: String(index + 1).padStart(2, '0'),
            label: isProjection ? `${baseLabel} (Proy.)` : baseLabel,
            [valueProp]: value
        };
    });
}

function syncOperationsDataFromAnalyticsDataset(dataset) {
    if (!dataset) return;
    try {
        const cutoffIndex = Number.isFinite(AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX)
            ? AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX
            : (AVIATION_ANALYTICS_MONTH_KEYS.length - 1);
        const targetYear = AVIATION_ANALYTICS_CUTOFF_YEAR;

        const comercialYearly = deriveOpsYearlySeriesFromAnalytics(dataset, 'comercial', [
            { metricKey: 'operaciones', prop: 'operaciones' },
            { metricKey: 'pasajeros', prop: 'pasajeros' }
        ]);
        const cargaYearly = deriveOpsYearlySeriesFromAnalytics(dataset, 'carga', [
            { metricKey: 'operaciones', prop: 'operaciones' },
            { metricKey: 'tons_transportadas', prop: 'toneladas' }
        ]);
        const generalYearly = deriveOpsYearlySeriesFromAnalytics(dataset, 'general', [
            { metricKey: 'operaciones', prop: 'operaciones' },
            { metricKey: 'pasajeros', prop: 'pasajeros' }
        ]);

        if (!staticData.operacionesTotales) {
            staticData.operacionesTotales = { comercial: [], carga: [], general: [] };
        }
        staticData.operacionesTotales.comercial = comercialYearly;
        staticData.operacionesTotales.carga = cargaYearly;
        staticData.operacionesTotales.general = generalYearly;

        const comercialMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'comercial', 'operaciones', 'operaciones', targetYear, cutoffIndex);
        const comercialPaxMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'comercial', 'pasajeros', 'pasajeros', targetYear, cutoffIndex);
        const cargaMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'carga', 'operaciones', 'operaciones', targetYear, cutoffIndex);
        const cargaTonMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'carga', 'tons_transportadas', 'toneladas', targetYear, cutoffIndex);
        const generalOpsMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'general', 'operaciones', 'operaciones', targetYear, cutoffIndex);
        const generalPaxMonthly = deriveOpsMonthlySeriesFromAnalytics(dataset, 'general', 'pasajeros', 'pasajeros', targetYear, cutoffIndex);

        if (!staticData.mensual2025) {
            staticData.mensual2025 = {
                comercial: [],
                comercialPasajeros: [],
                carga: [],
                cargaToneladas: [],
                general: { operaciones: [], pasajeros: [] }
            };
        }
        staticData.mensual2025.comercial = comercialMonthly;
        staticData.mensual2025.comercialPasajeros = comercialPaxMonthly;
        staticData.mensual2025.carga = cargaMonthly;
        staticData.mensual2025.cargaToneladas = cargaTonMonthly;
        if (!staticData.mensual2025.general) {
            staticData.mensual2025.general = { operaciones: [], pasajeros: [] };
        }
        staticData.mensual2025.general.operaciones = generalOpsMonthly;
        staticData.mensual2025.general.pasajeros = generalPaxMonthly;
        staticData.mensualYear = targetYear;

        const updatedYears = new Set();
        [comercialYearly, cargaYearly, generalYearly].forEach((collection) => {
            if (!Array.isArray(collection)) return;
            collection.forEach((entry) => {
                if (!entry) return;
                const year = entry.periodo;
                if (year === undefined || year === null) return;
                updatedYears.add(String(year));
            });
        });
        if (updatedYears.size) {
            syncOpsYearSelection(Array.from(updatedYears));
        }
        syncOpsMonthlyYearState(targetYear);

        if (typeof renderOperacionesTotales === 'function') {
            try {
                renderOperacionesTotales();
            } catch (err) {
                console.warn('renderOperacionesTotales sync failed:', err);
            }
        }
    } catch (err) {
        console.warn('syncOperationsDataFromAnalyticsDataset failed:', err);
    }
}

function computeAviationAnalyticsSignature(payload) {
    if (!payload || typeof payload !== 'object') return null;
    try {
        return JSON.stringify(payload);
    } catch (_) {
        return null;
    }
}

function setAviationAnalyticsDatasetFromPayload(rawPayload) {
    const safePayload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
    const derivedYear = deriveLatestAviationAnalyticsYear(safePayload);
    if (derivedYear) {
        AVIATION_ANALYTICS_CUTOFF_YEAR = String(derivedYear);
    }
    const signature = computeAviationAnalyticsSignature(safePayload);
    const dataset = buildAviationAnalyticsDataset(safePayload);
    AVIATION_ANALYTICS_DATA = dataset;
    AVIATION_ANALYTICS_DATA_SIGNATURE = signature;
    syncOperationsDataFromAnalyticsDataset(dataset);
    return dataset;
}

function ensureAviationAnalyticsData() {
    if (AVIATION_ANALYTICS_DATA) {
        return Promise.resolve(AVIATION_ANALYTICS_DATA);
    }
    if (aviationAnalyticsDataPromise) {
        return aviationAnalyticsDataPromise;
    }
    aviationAnalyticsDataPromise = fetch(AVIATION_ANALYTICS_DATA_PATH, { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then((rawPayload) => setAviationAnalyticsDatasetFromPayload(rawPayload))
        .then((dataset) => {
            aviationAnalyticsLoadError = null;
            return dataset;
        })
        .catch((err) => {
            aviationAnalyticsLoadError = err;
            console.warn('Failed to load aviation analytics data:', err);
            return null;
        })
        .finally(() => {
            if (!AVIATION_ANALYTICS_DATA) {
                aviationAnalyticsDataPromise = null;
            }
        });
    return aviationAnalyticsDataPromise;
}

function refreshAviationAnalyticsDataIfChanged(options = {}) {
    const { notifyOnChange = true, force = false } = options;
    if (aviationAnalyticsRefreshInFlight) {
        return aviationAnalyticsRefreshInFlight;
    }
    const requestPromise = fetch(resolveAviationAnalyticsDataUrl(true), { cache: 'no-store' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then((rawPayload) => {
            const signature = computeAviationAnalyticsSignature(rawPayload);
            if (!force && signature && signature === AVIATION_ANALYTICS_DATA_SIGNATURE) {
                return false;
            }
            setAviationAnalyticsDatasetFromPayload(rawPayload);
            rerenderAviationAnalyticsModules(true);
            if (notifyOnChange) {
                showNotification('Los datos de aviación se actualizaron automáticamente.', 'success');
            }
            return true;
        })
        .catch((err) => {
            console.warn('refreshAviationAnalyticsDataIfChanged failed:', err);
            return false;
        })
        .finally(() => {
            aviationAnalyticsRefreshInFlight = null;
        });
    aviationAnalyticsRefreshInFlight = requestPromise;
    return requestPromise;
}

function startAviationAnalyticsAutoRefresh() {
    if (typeof window === 'undefined') return;
    if (aviationAnalyticsAutoRefreshTimer) {
        clearInterval(aviationAnalyticsAutoRefreshTimer);
    }
    const poll = (notify = true) => {
        refreshAviationAnalyticsDataIfChanged({ notifyOnChange: notify }).catch(() => {});
    };
    poll(false);
    aviationAnalyticsAutoRefreshTimer = window.setInterval(() => poll(true), AVIATION_ANALYTICS_AUTO_REFRESH_INTERVAL);
    if (!aviationAnalyticsVisibilityWatcherBound) {
        aviationAnalyticsVisibilityWatcherBound = true;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                poll(false);
            }
        });
        window.addEventListener('focus', () => poll(false));
    }
}

const AVIATION_ANALYTICS_SCOPE_LABELS = {
    comercial: 'aviación comercial',
    general: 'aviación general',
    carga: 'aviación de carga'
};

const AVIATION_ANALYTICS_METRIC_META = {
    operaciones: { label: 'Operaciones', color: '#1e88e5', numberOptions: { maximumFractionDigits: 0 }, averageNumberOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
    pasajeros: { label: 'Pasajeros', color: '#8e24aa', numberOptions: { maximumFractionDigits: 0 }, averageNumberOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
    tons_transportadas: { label: 'Toneladas transportadas', color: '#ff7043', numberOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }, averageNumberOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } }
};

const aviationAnalyticsState = {
    comercial: { metric: 'operaciones', view: 'anual', year: null, comparison: 'previous' },
    general: { metric: 'operaciones', view: 'anual', year: null, comparison: 'previous' },
    carga: { metric: 'operaciones', view: 'anual', year: null, comparison: 'previous' }
};

const aviationAnalyticsCharts = { comercial: null, general: null, carga: null };

const AVIATION_ANALYTICS_UI = {
    comercial: {
        metrics: ['operaciones','pasajeros'],
        metricSelectId: 'ag-metric-select',
        viewSelectId: 'ag-view-select',
        yearSelectId: 'ag-year-select',
        comparisonSelectId: 'ag-comparison-select',
        resetBtnId: 'ag-reset-btn',
        yearGroupId: 'ag-year-group',
        comparisonGroupId: 'ag-comparison-group',
        summaryContainerId: 'ag-summary-cards',
        chartTagId: 'ag-chart-tag',
        chartSubtitleId: 'ag-chart-subtitle',
        chartCanvasId: 'ag-chart',
        insightsId: 'ag-insights',
        tableWrapperId: 'ag-table-wrapper',
        dataTableId: 'ag-data-table',
        footnoteId: 'ag-footnote',
        emptyStateId: 'ag-empty-state',
        tableTagId: 'ag-table-tag',
        tableCaptionId: 'ag-table-caption',
        tabButtonId: 'aviacion-comercial-tab',
        tabPaneId: 'aviacion-comercial-pane',
        elements: null
    },
    general: {
        metrics: ['operaciones','pasajeros'],
        metricSelectId: 'gen-metric-select',
        viewSelectId: 'gen-view-select',
        yearSelectId: 'gen-year-select',
        comparisonSelectId: 'gen-comparison-select',
        resetBtnId: 'gen-reset-btn',
        yearGroupId: 'gen-year-group',
        comparisonGroupId: 'gen-comparison-group',
        summaryContainerId: 'gen-summary-cards',
        chartTagId: 'gen-chart-tag',
        chartSubtitleId: 'gen-chart-subtitle',
        chartCanvasId: 'gen-chart',
        insightsId: 'gen-insights',
        tableWrapperId: 'gen-table-wrapper',
        dataTableId: 'gen-data-table',
        footnoteId: 'gen-footnote',
        emptyStateId: 'gen-empty-state',
        tableTagId: 'gen-table-tag',
        tableCaptionId: 'gen-table-caption',
        tabButtonId: 'aviacion-general-tab',
        tabPaneId: 'aviacion-general-pane',
        elements: null
    },
    carga: {
        metrics: ['operaciones','tons_transportadas'],
        metricSelectId: 'cargo-metric-select',
        viewSelectId: 'cargo-view-select',
        yearSelectId: 'cargo-year-select',
        comparisonSelectId: 'cargo-comparison-select',
        resetBtnId: 'cargo-reset-btn',
        yearGroupId: 'cargo-year-group',
        comparisonGroupId: 'cargo-comparison-group',
        summaryContainerId: 'cargo-summary-cards',
        chartTagId: 'cargo-chart-tag',
        chartSubtitleId: 'cargo-chart-subtitle',
        chartCanvasId: 'cargo-chart',
        insightsId: 'cargo-insights',
        tableWrapperId: 'cargo-table-wrapper',
        dataTableId: 'cargo-data-table',
        footnoteId: 'cargo-footnote',
        emptyStateId: 'cargo-empty-state',
        tableTagId: 'cargo-table-tag',
        tableCaptionId: 'cargo-table-caption',
        tabButtonId: 'aviacion-carga-tab',
        tabPaneId: 'aviacion-carga-pane',
        elements: null
    }
};

function setAviationAnalyticsUnavailableState(message) {
    const note = message || 'No se pudo cargar data/aviacion_analytics.json. Verifica el archivo.';
    Object.values(AVIATION_ANALYTICS_UI || {}).forEach((config) => {
        if (!config || !config.emptyStateId) return;
        const emptyState = document.getElementById(config.emptyStateId);
        if (!emptyState) return;
        emptyState.textContent = note;
        emptyState.classList.remove('d-none');
    });
}

const dashboardData = {
    users: {
        // NOTA: las contraseñas en texto plano no se usan para validar; se migran a hash en tiempo de ejecución y se descartan
        "David Pacheco": { password: "2468", canViewItinerarioMensual: true },
        "Isaac López": { password: "18052003", canViewItinerarioMensual: false },
        "Mauro Hernández": { password: "Mauro123", canViewItinerarioMensual: true },
        "Emily Beltrán": { password: "Emily67", canViewItinerarioMensual: true },
        "Director General": { password: "Dirección71", canViewItinerarioMensual: true },
        "Director de Operación": { password: "OperacionesNLU", canViewItinerarioMensual: true },
        "Jefe Mateos": { password: "2025M", canViewItinerarioMensual: true },
        "Usuario1": { password: "AIFAOps", canViewItinerarioMensual: true },
        "Dilery Urenda": { password: "DileryNLU", canViewItinerarioMensual: true },
        "Fernanda Ficachi": { password: "GerenciaMedicos", canViewItinerarioMensual: true },
        "Isaac Hernández": { password: "CoordIsaac", canViewItinerarioMensual: true },
        "Darwin Cala": { password: "CCO2025", canViewItinerarioMensual: true },
        "Germán Nuñez": {
            password: "DrGerman12",
            canViewItinerarioMensual: false,
            allowedSections: ["medicas"],
            defaultSection: "medicas"
        }
    },
    pdfSections: { "itinerario-mensual": { title: "Itinerario Mensual", url: "pdfs/itinerario_mensual.pdf" } }
};
let allFlightsData = [];
let summaryDetailMode = 'airline';
let summarySelectedAirline = null;
let summarySelectedPosition = null;
let summarySelectionLocked = false;
const SERVICIO_MEDICO_DIRECTORIO_DATA_PATH = 'data/directorio.json';
const SERVICIO_MEDICO_DIRECTORIO_DEFAULT_BASE = 'pdfs/directorio';
const servicioMedicoDirectorioState = {
    cache: null,
    lastFetch: 0,
    inFlight: null
};
let userSectionWhitelist = null;
let userDefaultSectionKey = 'operaciones-totales';

function sanitizeDirectorioEntry(raw) {
    if (!raw || typeof raw !== 'object') {
        return { asunto: 'Sin asunto', responsable: '', estado: '', documentos: [] };
    }
    const documentos = Array.isArray(raw.documentos)
        ? raw.documentos
            .filter(item => typeof item === 'string' && item.trim().length)
            .map(item => item.trim())
        : [];
    return {
        asunto: (raw.asunto || 'Sin asunto').toString().trim() || 'Sin asunto',
        responsable: (raw.responsable || '').toString().trim(),
        estado: (raw.estado || '').toString().trim(),
        documentos
    };
}

function getDirectorioDocBasePath() {
    try {
        const listEl = document.getElementById('medicas-directorio-list');
        if (!listEl) return SERVICIO_MEDICO_DIRECTORIO_DEFAULT_BASE;
        const base = (listEl.dataset.docBase || '').trim();
        const sanitized = base.replace(/\\/g, '/').replace(/\s+/g, '');
        return sanitized || SERVICIO_MEDICO_DIRECTORIO_DEFAULT_BASE;
    } catch (err) {
        console.warn('getDirectorioDocBasePath failed:', err);
        return SERVICIO_MEDICO_DIRECTORIO_DEFAULT_BASE;
    }
}

function buildDirectorioDocUrl(filename) {
    if (!filename || typeof filename !== 'string') return null;
    const trimmed = filename.trim();
    if (!trimmed) return null;
    if (/^(https?:|data:)/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
        return trimmed.replace(/\\/g, '/');
    }
    const normalized = trimmed.replace(/\\/g, '/');
    const encodedSegments = normalized
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment.trim()));
    const base = getDirectorioDocBasePath().replace(/\\/g, '/').replace(/\/+$/, '');
    return `${base}/${encodedSegments.join('/')}`;
}

function setDirectorioAlert(message, tone = 'info') {
    const alertEl = document.getElementById('medicas-directorio-alert');
    if (!alertEl) return;
    if (!message) {
        alertEl.classList.add('d-none');
        alertEl.textContent = '';
        return;
    }
    alertEl.className = `alert alert-${tone}`;
    alertEl.textContent = message;
    alertEl.classList.remove('d-none');
}

function toggleDirectorioLoader(visible) {
    const loader = document.getElementById('medicas-directorio-loader');
    if (!loader) return;
    loader.classList.toggle('d-none', !visible);
    loader.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function renderServicioMedicoDirectorio(entries) {
    const listEl = document.getElementById('medicas-directorio-list');
    const emptyEl = document.getElementById('medicas-directorio-empty');
    if (!listEl) return;
    toggleDirectorioLoader(false);
    if (!Array.isArray(entries) || !entries.length) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('d-none');
        return;
    }
    if (emptyEl) emptyEl.classList.add('d-none');
    const escapeHtml = escapeHTML;
    const markup = entries.map((entry) => {
        const docs = entry.documentos.length
            ? entry.documentos.map((doc, docIndex) => {
                const safeLabel = escapeHtml(doc);
                const docUrl = buildDirectorioDocUrl(doc);
                const docNumber = docIndex + 1;
                if (docUrl) {
                    return `
                        <a class="btn btn-outline-primary btn-sm directorio-doc-link" href="${escapeHtml(docUrl)}" target="_blank" rel="noopener noreferrer" data-directorio-doc="${escapeHtml(doc)}">
                            <i class="fas fa-file-pdf me-1" aria-hidden="true"></i>${safeLabel}
                            <span class="visually-hidden">(Documento ${docNumber})</span>
                        </a>`;
                }
                return `
                    <button type="button" class="btn btn-outline-secondary btn-sm directorio-doc-fallback" data-directorio-doc="${escapeHtml(doc)}">
                        <i class="fas fa-file-circle-xmark me-1" aria-hidden="true"></i>${safeLabel}
                    </button>`;
            }).join('')
            : '<span class="badge bg-light text-muted">Sin documentos adjuntos</span>';
        const responsableLine = entry.responsable
            ? `<p class="mb-1 small text-muted"><i class="fas fa-user-tie me-1" aria-hidden="true"></i>${escapeHtml(entry.responsable)}</p>`
            : '';
        const estadoBadge = entry.estado
            ? `<span class="badge bg-primary-subtle text-primary">${escapeHtml(entry.estado)}</span>`
            : '';
        return `
            <div class="col-12">
                <div class="border rounded-3 p-3 h-100 directorio-entry">
                    <div class="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-2">
                        <div>
                            <p class="text-uppercase small text-muted mb-1">Asunto</p>
                            <h4 class="h6 mb-0">${escapeHtml(entry.asunto)}${estadoBadge ? ' ' + estadoBadge : ''}</h4>
                        </div>
                    </div>
                    ${responsableLine}
                    <div class="mt-3">
                        <p class="mb-2 fw-semibold small text-muted"><i class="fas fa-folder-open me-1" aria-hidden="true"></i>Documentos</p>
                        <div class="d-flex flex-wrap gap-2">${docs}</div>
                    </div>
                </div>
            </div>`;
    }).join('');
    listEl.innerHTML = markup;
}

async function loadServicioMedicoDirectorio(options = {}) {
    const listEl = document.getElementById('medicas-directorio-list');
    if (!listEl) return;
    const { force = false } = options;
    setDirectorioAlert('', 'info');
    if (!force && Array.isArray(servicioMedicoDirectorioState.cache) && servicioMedicoDirectorioState.cache.length) {
        renderServicioMedicoDirectorio(servicioMedicoDirectorioState.cache);
        return;
    }
    toggleDirectorioLoader(true);
    try {
        if (servicioMedicoDirectorioState.inFlight && !force) {
            await servicioMedicoDirectorioState.inFlight;
            renderServicioMedicoDirectorio(servicioMedicoDirectorioState.cache || []);
            return;
        }
        const fetchPromise = fetch(SERVICIO_MEDICO_DIRECTORIO_DATA_PATH, { cache: 'no-store' })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((payload) => {
                const entries = Array.isArray(payload) ? payload.map(sanitizeDirectorioEntry) : [];
                servicioMedicoDirectorioState.cache = entries;
                servicioMedicoDirectorioState.lastFetch = Date.now();
                return entries;
            });
        servicioMedicoDirectorioState.inFlight = fetchPromise;
        const entries = await fetchPromise;
        renderServicioMedicoDirectorio(entries);
    } catch (err) {
        console.warn('loadServicioMedicoDirectorio failed:', err);
        setDirectorioAlert('No se pudo cargar el directorio. Intenta nuevamente.', 'warning');
        toggleDirectorioLoader(false);
        const emptyEl = document.getElementById('medicas-directorio-empty');
        if (emptyEl) emptyEl.classList.remove('d-none');
    } finally {
        servicioMedicoDirectorioState.inFlight = null;
    }
}

function initServicioMedicoDirectorio() {
    const reloadBtn = document.getElementById('medicas-directorio-reload');
    if (reloadBtn && !reloadBtn._wired) {
        reloadBtn._wired = 1;
        reloadBtn.addEventListener('click', () => {
            loadServicioMedicoDirectorio({ force: true }).catch((err) => console.warn('reload directorio failed:', err));
        });
    }
    loadServicioMedicoDirectorio().catch((err) => console.warn('init directorio failed:', err));
}

function handleDirectorioDocClick(target) {
    if (!target) return;
    const docName = target.getAttribute('data-directorio-doc');
    const url = buildDirectorioDocUrl(docName);
    if (!url) {
        setDirectorioAlert('No se pudo abrir el documento solicitado.', 'warning');
        return;
    }
    try {
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
        console.warn('handleDirectorioDocClick failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initServicioMedicoDirectorio();
});

document.addEventListener('click', (event) => {
    const trigger = event.target?.closest?.('.directorio-doc-fallback, .directorio-doc-link');
    if (!trigger) return;
    const isAnchorWithHref = trigger.tagName === 'A' && trigger.getAttribute('href');
    if (isAnchorWithHref) return; // let browser handle real links
    event.preventDefault();
    handleDirectorioDocClick(trigger);
});

function normalizeSectionKey(key) {
    return (key || '').toString().trim();
}

function resetSectionPermissions() {
    userSectionWhitelist = null;
    userDefaultSectionKey = 'operaciones-totales';
    document.querySelectorAll('.menu-item[data-section]').forEach((item) => item.classList.remove('perm-hidden'));
    document.querySelectorAll('.content-section').forEach((section) => section.classList.remove('perm-hidden'));
}

function isSectionAllowed(sectionKey) {
    if (!sectionKey) return true;
    if (!Array.isArray(userSectionWhitelist) || !userSectionWhitelist.length) return true;
    return userSectionWhitelist.includes(sectionKey);
}

function getDefaultAllowedSection() {
    if (Array.isArray(userSectionWhitelist) && userSectionWhitelist.length) {
        if (userDefaultSectionKey && userSectionWhitelist.includes(userDefaultSectionKey)) {
            return userDefaultSectionKey;
        }
        return userSectionWhitelist[0];
    }
    return 'operaciones-totales';
}

function applySectionPermissions(userName) {
    resetSectionPermissions();
    const users = dashboardData?.users || {};
    const user = users[userName];
    const rawWhitelist = Array.isArray(user?.allowedSections)
        ? user.allowedSections.map((section) => normalizeSectionKey(section)).filter(Boolean)
        : [];

    if (rawWhitelist.length) {
        userSectionWhitelist = [...new Set(rawWhitelist)];
        const preferred = normalizeSectionKey(user?.defaultSection);
        userDefaultSectionKey = preferred && userSectionWhitelist.includes(preferred)
            ? preferred
            : userSectionWhitelist[0];

        document.querySelectorAll('.menu-item[data-section]').forEach((item) => {
            const sectionKey = normalizeSectionKey(item.dataset.section);
            if (!userSectionWhitelist.includes(sectionKey)) {
                item.classList.add('perm-hidden');
            }
        });
        document.querySelectorAll('.content-section').forEach((sectionEl) => {
            const key = normalizeSectionKey((sectionEl.id || '').replace(/-section$/, ''));
            if (!userSectionWhitelist.includes(key)) {
                sectionEl.classList.add('perm-hidden');
                sectionEl.classList.remove('active');
            }
        });

        if (!isSectionAllowed(currentSectionKey)) {
            const fallback = getDefaultAllowedSection();
            const fallbackLink = document.querySelector(`.menu-item[data-section="${fallback}"]`);
            showSection(fallback, fallbackLink);
        }
    }
}
// Hashes de contraseñas (generados en cliente al inicio y luego se descartan passwords en claro)
const AUTH_HASHES = Object.create(null);
const SECRET_PW_SALT = 'aifa.ops.local.pw.v1';

async function initAuthHashes(){
    try {
        const entries = Object.entries(dashboardData.users || {});
        for (const [name, info] of entries){
            if (!info) continue;
            const pw = typeof info.password === 'string' ? info.password : '';
            const norm = (name||'').toString().trim().toLowerCase();
            if (pw) {
                const h = await sha256(pw + '|' + norm + '|' + SECRET_PW_SALT);
                AUTH_HASHES[name] = h;
            }
            // eliminar password en claro para evitar abusos posteriores
            try { delete info.password; } catch(_) { info.password = undefined; }
        }
    } catch(_){ /* noop */ }
}
let authHashesInitPromise = null;
function ensureAuthHashes(){
    if (!authHashesInitPromise){
        authHashesInitPromise = initAuthHashes().catch(err => {
            authHashesInitPromise = null;
            throw err;
        });
    }
    return authHashesInitPromise;
}
let passengerAirlines = ["Viva", "Volaris", "Aeromexico", "Mexicana de Aviación", "Aeurus", "Arajet"];
let cargoAirlines = ["MasAir", "China Southerrn", "Lufthansa", "Kalitta Air", "Aerounión", "Emirates Airlines", "Atlas Air", "Silk Way West Airlines", "Cathay Pacific", "United Parcel Service", "Turkish Airlines", "Cargojet Airways", "Air Canada", "Cargolux"];
const airlineColors = { "Viva": "#00b200", "Volaris": "#6f2da8", "Aeromexico": "#00008b", "Mexicana de Aviación": "#a52a2a", "Aerus": "#ff4500", "Arajet": "#00ced1", "MasAir": "#4682b4", "China Southerrn": "#c71585", "Lufthansa": "#ffcc00", "Kalitta Air": "#dc143c", "Aerounión": "#2e8b57", "Emirates Airlines": "#d4af37", "Atlas Air": "#808080", "Silk Way West Airlines": "#f4a460", "Cathay Pacific": "#006400", "United Parcel Service": "#5f4b32", "Turkish Airlines": "#e81123", "Cargojet Airways": "#f0e68c", "Air Canada": "#f00", "Cargolux": "#00a0e2" };

const passengerAirlinesNormalized = new Set(passengerAirlines.map(normalizeAirlineName));
const cargoAirlinesNormalized = new Set(cargoAirlines.map(normalizeAirlineName));

const cargoPositionCodes = new Set([
    '601','602','603','604','605','606',
    '601A','602A','603A','604A','605A',
    '601B','602B','603B','604B'
]);

const semicontactoPositionCodes = new Set([
    '501','502','503','504','505'
]);

const remotePositionCodes = new Set([
    '506','507','508','509','510','511','512','513','514',
    '506A','507A','508A','506B','507B'
]);

const cobusAttentionPositions = new Set([
    '115','115A','115B','116','116A','116B',
    '509','510','511','512','513','514'
]);

const positionCategoryLabels = {
    cargo: 'Carga',
    semicontacto: 'Semicontacto',
    remote: 'Remota',
    terminal: 'Edificio terminal'
};

function normalizePositionValue(value) {
    return (value || '').toString().trim().toUpperCase();
}

function classifyPositionStand(value) {
    const normalized = normalizePositionValue(value);
    if (!normalized) return 'terminal';
    if (cargoPositionCodes.has(normalized)) return 'cargo';
    if (semicontactoPositionCodes.has(normalized)) return 'semicontacto';
    if (remotePositionCodes.has(normalized)) return 'remote';
    return 'terminal';
}

function getPositionCategoryLabel(category) {
    return positionCategoryLabels[category] || positionCategoryLabels.terminal;
}
// ===================== Logos de Aerolíneas =====================
// Mapa flexible: nombre normalizado (minúsculas, sin acentos) -> slug de archivo
// Nota: ahora usamos una lista de candidatos por aerolínea (archivos reales en images/airlines)
const airlineLogoFileMap = {
    // Pasajeros
    'viva aerobus': ['logo_viva.png'],
    'volaris': ['logo_volaris.png'],
    // usar primero archivos que EXISTEN en /images/airlines para evitar 404
    'aeromexico': ['logo_aeromexico.png','logo_aeromexico.jpg'],
    'aeroméxico': ['logo_aeromexico.png','logo_aeromexico.jpg'],
    'mexicana de aviacion': ['logo_mexicana.png','logo_mexicana_de_aviacion.png'],
    'mexicana de aviación': ['logo_mexicana.png','logo_mexicana_de_aviacion.png'],
    'aerus': ['logo_aerus.png'],
    'aeurus': ['logo_aerus.png'],
    'arajet': ['logo_arajet.png','logo_arajet.jpg'],
    // Air China (archivo no sigue prefijo logo_)
    'air china': ['logo_air_china.png'],
    // Carga y otras
    'masair': ['logo_mas.png','logo_masair.png'],
    'amerijet international': ['logo_amerijet_international.png'],
    'cargojet': ['logo_cargojet.png'],
    'cargolux': ['logo_cargolux.png'],
    'cathay pacific': ['logo_cathay_pacific.png','logo_cathay.png'],
    'conviasa': ['logo_conviasa.png'],
    'estafeta': ['logo_estafeta.jpg'],
    'ethiopian airlines': ['logo_ethiopian_airlines.png'],
    'kalitta air': ['logo_kalitta_air.jpg','logo_kalitta.png'],
    'lufthansa': ['logo_lufthansa.png'],
    'lufthansa cargo': ['logo_lufthansa.png'],
    'silk way west airlines': ['logo_silk_way_west_airlines.png','logo_silkway.png'],
    'sun country airlines': ['logo_sun_country_airlines.png'],
    'omni air': ['logo_omni_air.png','logo_omni_air1.png'],
    'omni air international': ['logo_omni_air.png','logo_omni_air1.png'],
    'omni air internacional': ['logo_omni_air.png','logo_omni_air1.png'],
    'united parcel service': ['logo_united_parcel_service.png'],
    'ups': ['logo_united_parcel_service.png'],
    'ifl group': ['lofo_ifl_group.png'],
    'china southern': ['logo_china_southern.png'],
    'china southerrn': ['logo_china_southern.png'],
    'ukraine international airlines': ['logo_ukraine_international_airlines.png'],
    // Ajustes específicos por archivos presentes
    'air canada': ['logo_air_canada_.png'],
    'air france': ['logo_air_france_.png'],
    'aerounion': ['loho_aero_union.png'],
    'aerounión': ['loho_aero_union.png'],
    'dhl guatemala': ['logo_dhl_guatemala_.png'],
    // TSM Airline (archivo real: logo_tsm_airlines.png)
    'tsm': ['logo_tsm_airlines.png'],
    'tsm airline': ['logo_tsm_airlines.png'],
    'tsm airlines': ['logo_tsm_airlines.png']
};
// Compat: entradas antiguas -> slug "base" sin extensión
const airlineLogoSlugMap = {
    'viva': 'logo_viva',
    'viva aerobus': 'logo_viva',
    'volaris': 'logo_volaris',
    'aeromexico': 'logo_aeromexico',
    'aeroméxico': 'logo_aeromexico',
    'mexicana de aviacion': 'logo_mexicana',
    'mexicana de aviación': 'logo_mexicana',
    'aerus': 'logo_aerus',
    'aeurus': 'logo_aerus',
    'arajet': 'logo_arajet',
    'masair': 'logo_masair',
    'mas air': 'logo_masair',
    'china southern': 'logo_china_southern',
    'china southerrn': 'logo_china_southern', // corrección tipográfica
    'lufthansa': 'logo_lufthansa',
    'lufthansa cargo': 'logo_lufthansa',
    'kalitta air': 'logo_kalitta',
    'aerounion': 'logo_aerounion',
    'aerounión': 'logo_aerounion',
    'emirates': 'logo_emirates',
    'emirates airlines': 'logo_emirates',
    'emirates skycargo': 'logo_emirates',
    'atlas air': 'logo_atlas',
    'silk way west airlines': 'logo_silkway',
    'silk way west': 'logo_silkway',
    'cathay pacific': 'logo_cathay',
    'cathay pacific cargo': 'logo_cathay',
    'united parcel service': 'logo_ups',
    'ups': 'logo_ups',
    'omni air': 'logo_omni_air',
    'omni air international': 'logo_omni_air',
    'omni air internacional': 'logo_omni_air',
    'turkish airlines': 'logo_turkish',
    'turkish cargo': 'logo_turkish',
    'cargojet airways': 'logo_cargojet',
    'cargojet': 'logo_cargojet',
    'air canada': 'logo_air_canada',
    'air canada cargo': 'logo_air_canada',
    'cargolux': 'logo_cargolux',
    'ukraine international airlines': 'logo_ukraine_international_airlines',
    // Compat adicionales
    'air china': 'air_china',
    'tsm': 'logo_tsm_airlines',
    'tsm airline': 'logo_tsm_airlines',
    'tsm airlines': 'logo_tsm_airlines'
};

// Algunas marcas tienen logos con proporciones que se perciben más pequeños; dales un boost
const BOOST_LOGO_SET = new Set([
    'cathay pacific',
    'atlas air',
    'air canada',
    'air france',
    'mexicana de aviacion',
    'mexicana de aviación',
    'mexicana',
    'ukraine international airlines'
]);

function getLogoSizeClass(airlineName, context = 'table') {
    const key = normalizeAirlineName(airlineName || '');
    // Por defecto usamos grande; si está en la lista, usamos XL
    if (BOOST_LOGO_SET.has(key)) return 'xl';
    // Para consistencia visual, tanto en resumen como en tablas usamos 'lg'
    return 'lg';
}

function normalizeAirlineName(name = ''){
    const s = (name || '').toString().trim().toLowerCase();
    // quitar acentos simples
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function getAirlineAccentColor(name){
    if (!name) return '#0d6efd';
    if (airlineColors && Object.prototype.hasOwnProperty.call(airlineColors, name)) {
        return airlineColors[name];
    }
    const normalizedTarget = normalizeAirlineName(name);
    for (const key in airlineColors) {
        if (!Object.prototype.hasOwnProperty.call(airlineColors, key)) continue;
        if (normalizeAirlineName(key) === normalizedTarget) {
            return airlineColors[key];
        }
    }
    return '#0d6efd';
}
function getAirlineLogoCandidates(airline){
    const key = normalizeAirlineName(airline);
    const files = airlineLogoFileMap[key];
    const candidates = [];
    if (Array.isArray(files) && files.length) {
        files.forEach(f=>{ candidates.push(`images/airlines/${f}`); });
    } else {
        // Generar a partir del nombre normalizado
        const base = 'logo_' + key.replace(/\s+/g, '_');
        candidates.push(`images/airlines/${base}.png`);
        candidates.push(`images/airlines/${base}.jpg`);
        candidates.push(`images/airlines/${base}.svg`);
        // Variaciones conocidas (solo archivos que existen en repo)
        if (base.includes('aerounion')) candidates.push('images/airlines/loho_aero_union.png');
        if (base.includes('masair')) candidates.push('images/airlines/logo_mas.png');
        if (base.includes('silk_way_west') && !base.includes('silkway')) candidates.push('images/airlines/logo_silk_way_west_airlines.png');
        if (base.includes('air_canada')) candidates.push('images/airlines/logo_air_canada_.png');
        if (base.includes('air_france')) candidates.push('images/airlines/logo_air_france_.png');
        if (base.includes('ifl_group')) candidates.push('images/airlines/lofo_ifl_group.png');
        if (base.includes('omni_air')) candidates.push('images/airlines/logo_omni_air1.png');
    }
    // quitar duplicados conservando orden
    return [...new Set(candidates)];
}
function getAirlineLogoPath(airline){
    const cands = getAirlineLogoCandidates(airline);
    return cands.length ? cands[0] : null;
}
function hexToRgba(hex, alpha){
    const match = /^#?([0-9a-f]{6})$/i.exec((hex||'').trim());
    if (!match) return `rgba(13,110,253,${alpha})`;
    const value = parseInt(match[1], 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}
// Fallback para logos: si .png falla probamos .svg una vez; si también falla, ocultamos el <img>
function handleLogoError(imgEl){
    try{
        const list = (imgEl.dataset.cands || '').split('|').filter(Boolean);
        let idx = parseInt(imgEl.dataset.candIdx || '0', 10);
        if (list.length && idx < list.length - 1){
            idx += 1;
            imgEl.dataset.candIdx = String(idx);
            imgEl.src = list[idx];
            return;
        }
        // última oportunidad: alternar extensión png<->jpg<->svg en el mismo nombre
        const current = imgEl.getAttribute('src') || '';
        const nextByExt = current.endsWith('.png') ? current.replace(/\.png$/i, '.jpg')
                          : current.endsWith('.jpg') ? current.replace(/\.jpg$/i, '.svg')
                          : null;
        if (nextByExt) { imgEl.src = nextByExt; return; }
        // sin recurso: ocultar img y mantener visible el texto/color
        imgEl.style.display = 'none';
        const cell = imgEl.closest('.airline-cell');
        if (cell) cell.classList.remove('has-logo');
        const row = imgEl.closest('tr');
        if (row) row.style.removeProperty('--airline-color');
        const header = imgEl.closest('.airline-header');
        if (header) header.classList.remove('airline-has-logo');
    }catch(_){ imgEl.style.display = 'none'; }
}
// Marcar celdas/headers cuando el logo carga correctamente para ocultar texto/color
function logoLoaded(imgEl){
    try{
        const cell = imgEl.closest('.airline-cell');
        if (cell) cell.classList.add('has-logo');
        // Marcar el header para ocultar el nombre cuando hay logo, sin aplicar fondos adicionales
        const header = imgEl.closest('.airline-header');
        if (header) header.classList.add('airline-has-logo');
    }catch(_){ }
}
function formatYMDToDMY(ymd){
    if (!ymd) return '';
    const parts = String(ymd).split('-');
    if (parts.length !== 3) return '';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function flightsToCSV(rows, type){
    const headers = type === 'pax'
        ? ['Aerolínea','Aeronave','Vuelo Lleg.','Fecha Lleg.','Hora Lleg.','Origen','Banda','Posición','Vuelo Sal.','Fecha Sal.','Hora Sal.','Destino']
        : ['Aerolínea','Aeronave','Vuelo Lleg.','Fecha Lleg.','Hora Lleg.','Origen','Posición','Vuelo Sal.','Fecha Sal.','Hora Sal.','Destino'];
    const esc = (v) => {
        const s = (v==null?'':String(v));
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
        return s;
    };
    const lines = [headers.join(',')];
    for (const f of rows){
        if (type === 'pax') {
            lines.push([
                f.aerolinea||'', f.aeronave||'', f.vuelo_llegada||'', f.fecha_llegada||'', f.hora_llegada||'', f.origen||'', f.banda_reclamo||'', f.posicion||'', f.vuelo_salida||'', f.fecha_salida||'', f.hora_salida||'', f.destino||''
            ].map(esc).join(','));
        } else {
            lines.push([
                f.aerolinea||'', f.aeronave||'', f.vuelo_llegada||'', f.fecha_llegada||'', f.hora_llegada||'', f.origen||'', f.posicion||'', f.vuelo_salida||'', f.fecha_salida||'', f.hora_salida||'', f.destino||''
            ].map(esc).join(','));
        }
    }
    return lines.join('\n');
}
function downloadCSV(name, content){
    try {
        // Prepend UTF-8 BOM for better compatibility with Excel on Windows
        const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click();
        setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
    } catch(_) {}
}
function wireItineraryExports(){
    const btnP = document.getElementById('export-pax-full');
    const btnC = document.getElementById('export-cargo-full');
    const btnPdfP = document.getElementById('export-pax-pdf');
    const btnPdfC = document.getElementById('export-cargo-pdf');
    if (btnP && !btnP._wired){ btnP._wired = 1; btnP.addEventListener('click', ()=>{
        const rows = (allFlightsData||[]).filter(f=> (String(f.categoria||'').toLowerCase()==='pasajeros') || passengerAirlines.includes(f.aerolinea));
        const csv = flightsToCSV(rows, 'pax');
        downloadCSV('itinerario_pasajeros.csv', csv);
    }); }
    if (btnC && !btnC._wired){ btnC._wired = 1; btnC.addEventListener('click', ()=>{
        const rows = (allFlightsData||[]).filter(f=> (String(f.categoria||'').toLowerCase()==='carga') || cargoAirlines.includes(f.aerolinea));
        const csv = flightsToCSV(rows, 'cargo');
        downloadCSV('itinerario_carga.csv', csv);
    }); }
    // PDF (como se ve en pantalla)
    const captureToPDF = async (containerId, fileName) => {
        try {
            if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) { console.warn('jsPDF/html2canvas no disponible'); return; }
            const { jsPDF } = window.jspdf;
            const root = document.getElementById(containerId);
            if (!root) return;
            // Esperar a que se hayan renderizado las tablas
            await new Promise(r => setTimeout(r, 60));
            // Clonar el bloque visible para evitar cortes por overflow y fijar ancho
            const clone = root.cloneNode(true);
            clone.style.maxHeight = 'unset';
            clone.style.overflow = 'visible';
            clone.style.boxShadow = 'none';
            clone.style.border = 'none';
            clone.style.background = getComputedStyle(document.body).backgroundColor || '#fff';
            // Asegurar que la tabla ocupe el ancho completo del clon
            const table = clone.querySelector('table');
            if (table) { table.style.width = '100%'; table.style.minWidth = 'auto'; }
            // Insertar fuera de pantalla para medir correctamente
            const holder = document.createElement('div');
            holder.style.position = 'fixed';
            holder.style.left = '-99999px';
            holder.style.top = '0';
            holder.style.zIndex = '-1';
            holder.appendChild(clone);
            document.body.appendChild(holder);
            const dpr = Math.min(2.5, window.devicePixelRatio || 1);
            const canvas = await html2canvas(clone, { scale: dpr, backgroundColor: clone.style.background || '#ffffff', useCORS: true, logging: false, windowWidth: Math.max(clone.scrollWidth, clone.clientWidth) });
            document.body.removeChild(holder);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            // Escalar imagen al ancho de página
            const imgW = pageW - margin*2;
            const imgH = canvas.height * (imgW / canvas.width);
            let y = margin;
            let x = margin;
            let remaining = imgH;
            let imgY = 0; // offset dentro de la imagen
            // Añadir título
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            const title = (fileName || '').replace(/\.pdf$/i,'');
            pdf.text(title, margin, y);
            y += 6;
            // Si la imagen es más alta que la página, partirla en slices verticales
            const sliceH = pageH - y - margin;
            const ratio = canvas.width / imgW; // pixeles por mm
            while (remaining > 0) {
                const hThis = Math.min(sliceH, remaining);
                // Extraer porción del canvas a un subcanvas para no dibujar fuera
                const sub = document.createElement('canvas');
                sub.width = canvas.width;
                sub.height = Math.round(hThis * ratio);
                const sctx = sub.getContext('2d');
                sctx.drawImage(canvas, 0, Math.round(imgY * ratio), canvas.width, sub.height, 0, 0, sub.width, sub.height);
                const subImg = sub.toDataURL('image/png');
                pdf.addImage(subImg, 'PNG', x, y, imgW, hThis);
                remaining -= hThis;
                imgY += hThis;
                if (remaining > 1) { pdf.addPage(); y = margin; x = margin; }
            }
            pdf.save(fileName || 'tabla.pdf');
        } catch (e) {
            console.warn('PDF export failed:', e);
            try {
                const toastEl = document.getElementById('action-toast');
                if (toastEl && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
                    toastEl.querySelector('.toast-body').textContent = 'No se pudo generar el PDF. Intenta de nuevo.';
                    const t = new bootstrap.Toast(toastEl); t.show();
                }
            } catch(_){}
        }
    };
    if (btnPdfP && !btnPdfP._wired) { btnPdfP._wired = 1; btnPdfP.addEventListener('click', ()=> captureToPDF('passenger-itinerary-container', 'itinerario_pasajeros.pdf')); }
    if (btnPdfC && !btnPdfC._wired) { btnPdfC._wired = 1; btnPdfC.addEventListener('click', ()=> captureToPDF('cargo-itinerary-container', 'itinerario_carga.pdf')); }
}
document.addEventListener('DOMContentLoaded', wireItineraryExports);

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('sidebar-nav').addEventListener('click', handleNavigation);
    document.getElementById('airline-filter').addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // search input for banda de reclamo (specific) and a global search box
    const claimInput = document.getElementById('claim-filter'); if (claimInput) claimInput.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    const globalSearch = document.getElementById('global-search'); if (globalSearch) globalSearch.addEventListener('input', (window.AIFA?.debounce||((f)=>f))(applyFilters, 200));
    // position select (populated from JSON)
    const posSelect = document.getElementById('position-filter'); if (posSelect) posSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const originSelect = document.getElementById('origin-filter'); if (originSelect) originSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const destinationSelect = document.getElementById('destination-filter'); if (destinationSelect) destinationSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // hour filters (Inicio)
    const hourSelect = document.getElementById('hour-filter'); if (hourSelect) hourSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    const hourTypeSelect = document.getElementById('hour-type-filter'); if (hourTypeSelect) hourTypeSelect.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // date filter (Inicio)
    const dateFilter = document.getElementById('date-filter'); if (dateFilter) dateFilter.addEventListener('change', (window.AIFA?.throttle||((f)=>f))(applyFilters, 120));
    // Botón de tema eliminado: no enlazar listener si no existe
    const themeBtnEl = document.getElementById('theme-toggler');
    if (themeBtnEl) themeBtnEl.addEventListener('click', toggleTheme);
    const clearBtn = document.getElementById('clear-filters'); if (clearBtn) clearBtn.addEventListener('click', clearFilters);
    document.getElementById('sidebar-toggler').addEventListener('click', toggleSidebar);
    // Exportar todas las gráficas (Operaciones Totales)
    const opsExportAllBtn = document.getElementById('ops-export-all-btn');
    if (opsExportAllBtn) opsExportAllBtn.addEventListener('click', exportAllChartsPDF);

    const opsTooltipsToggleBtn = document.getElementById('ops-tooltips-toggle-btn');
    if (opsTooltipsToggleBtn && !opsTooltipsToggleBtn._wired) {
        opsTooltipsToggleBtn._wired = 1;
        opsTooltipsToggleBtn.addEventListener('click', () => {
            opsTooltipsAlwaysOn = !opsTooltipsAlwaysOn;
            updateOpsTooltipToggleButton();
            applyOpsTooltipsStateToCharts();
        });
        updateOpsTooltipToggleButton();
    }
    
    // Botón de reinicialización de gráficas global
    const chartsResetBtn = document.getElementById('charts-reset-btn');
    if (chartsResetBtn) {
        chartsResetBtn.addEventListener('click', resetAllCharts);
        
        // Hacer el botón siempre visible para pruebas (opcional)
        chartsResetBtn.style.display = 'inline-block';
    }
    
    // Botones específicos de reinicialización por sección
    const resetOperacionesBtn = document.getElementById('reset-operaciones-btn');
    if (resetOperacionesBtn) resetOperacionesBtn.addEventListener('click', resetOperacionesCharts);
    
    const resetItinerarioBtn = document.getElementById('reset-itinerario-btn');
    if (resetItinerarioBtn) resetItinerarioBtn.addEventListener('click', resetItinerarioCharts);
    
    const resetDemorasBtn = document.getElementById('reset-demoras-btn');
    if (resetDemorasBtn) resetDemorasBtn.addEventListener('click', resetDemorasCharts);
    
    // Atajos de teclado para reinicializar gráficas
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (window.innerWidth <= 991.98 && sidebar && overlay && sidebar.classList.contains('visible')) {
                sidebar.classList.remove('visible');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        }
        if (e.ctrlKey && e.shiftKey) {
            const sectionId = getActiveSectionKey();
            
            if (e.key === 'R') {
                e.preventDefault();
                console.log('🔄 Reinicialización forzada por atajo de teclado');
                resetAllCharts();
            } else if (e.key === 'O' && sectionId === 'operaciones-totales') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Operaciones por atajo (Ctrl+Shift+O)');
                resetOperacionesCharts();
            } else if (e.key === 'I' && sectionId === 'itinerario') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Itinerario por atajo (Ctrl+Shift+I)');
                resetItinerarioCharts();
            } else if (e.key === 'D' && sectionId === 'demoras') {
                e.preventDefault();
                console.log('🔄 Reinicialización de Demoras por atajo (Ctrl+Shift+D)');
                resetDemorasCharts();
            }
        }
    });

    // Logout en botón de encabezado (móvil) y delegación global por data-action="logout"
    const mobileLogoutBtn = document.querySelector('.logout-button-mobile');
    if (mobileLogoutBtn && !mobileLogoutBtn._wired) {
        mobileLogoutBtn._wired = 1;
        mobileLogoutBtn.addEventListener('click', function(e){ e.preventDefault(); performLogout(); });
    }
    document.addEventListener('click', function(e){
        const a = e.target && e.target.closest && e.target.closest('[data-action="logout"]');
        if (a) { e.preventDefault(); performLogout(); }
    });

// Función de diagnóstico global (para usar en consola)
window.diagnoseCharts = function() {
    console.log('🔍 === DIAGNÓSTICO DE GRÁFICAS ===');
    
    const activeSection = document.querySelector('.content-section.active');
    console.log('Sección activa:', getActiveSectionKey() || activeSection?.id || 'ninguna');
    
    console.log('📊 Gráficas de Operaciones Totales:');
    console.log('opsCharts:', Object.keys(opsCharts));
    
    console.log('📈 Instancias de Chart.js:');
    if (window.Chart && window.Chart.instances) {
        console.log('Chart instances:', Object.keys(window.Chart.instances));
    }
    
    console.log('🎯 Canvas elements:');
    const canvases = ['commercial-ops-chart', 'commercial-pax-chart', 'cargo-ops-chart', 'cargo-tons-chart', 'general-ops-chart', 'general-pax-chart', 'paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart', 'delaysPieChart'];
    canvases.forEach(id => {
        const canvas = document.getElementById(id);
        const chart = canvas ? Chart.getChart(canvas) : null;
        console.log(`${id}: canvas=${!!canvas}, chart=${!!chart}`);
    });
    
    console.log('🔧 Funciones globales:');
    console.log('renderOperacionesTotales:', typeof window.renderOperacionesTotales);
    console.log('renderItineraryCharts:', typeof window.renderItineraryCharts);
    console.log('renderDemoras:', typeof window.renderDemoras);
    console.log('destroyItinerarioCharts:', typeof window.destroyItinerarioCharts);
    
    console.log('=== FIN DIAGNÓSTICO ===');
};
    
    setupBodyEventListeners();
    setupLightboxListeners();
    // Inicializar UI de Manifiestos (desacoplado al módulo)
    try { if (typeof window.setupManifestsUI === 'function') window.setupManifestsUI(); } catch(_) {}
    // Frecuencias: navegación de semana
    const prevW = document.getElementById('freq-prev-week'); if (prevW) prevW.addEventListener('click', ()=> changeFreqWeek(-7));
    const nextW = document.getElementById('freq-next-week'); if (nextW) nextW.addEventListener('click', ()=> changeFreqWeek(7));
    // Picos diarios: listeners
    const peakDate = document.getElementById('peak-date'); if (peakDate) peakDate.addEventListener('change', renderDailyPeaks);
    const prevD = document.getElementById('peak-prev-day'); if (prevD) prevD.addEventListener('click', ()=> shiftPeakDate(-1));
    const nextD = document.getElementById('peak-next-day'); if (nextD) nextD.addEventListener('click', ()=> shiftPeakDate(1));
    // Itinerario tabs: re-render heatmaps when switching into them
    const itineraryTab = document.getElementById('itineraryTab');
    // PDFs restaurados en Itinerario: no es necesario recalcular heatmaps al cambiar de pestaña
    if (itineraryTab) {
        itineraryTab.addEventListener('click', ()=>{});
    }
}
function animateLoginTitle() {
    const titleElement = document.getElementById('login-title');
    if (!titleElement) return;
        // Mantener el título solicitado
        titleElement.textContent = "OPERACIONES AIFA";
}

// Funciones específicas para reinicializar gráficas por sección
function resetOperacionesCharts() {
    console.log('🔄 Reinicializando gráficas de Operaciones Totales...');
    
    const btn = document.getElementById('reset-operaciones-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráficas existentes
        destroyOpsCharts();
        
        // Limpiar canvas específicos
        const canvasIds = [
            'commercial-ops-chart', 'commercial-pax-chart',
            'cargo-ops-chart', 'cargo-tons-chart',
            'general-ops-chart', 'general-pax-chart'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
        });
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                renderOperacionesTotales();
                updateOpsSummary();
                console.log('✅ Gráficas de Operaciones Totales reinicializadas');
                showNotification('Gráficas de Operaciones reinicializadas', 'success');
            } catch (error) {
                console.error('❌ Error al recrear gráficas de operaciones:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetOperacionesCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

function resetItinerarioCharts() {
    console.log('🔄 Reinicializando gráficas de Itinerario...');
    
    const btn = document.getElementById('reset-itinerario-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráficas de itinerario
        if (window.destroyItinerarioCharts && typeof window.destroyItinerarioCharts === 'function') {
            window.destroyItinerarioCharts();
        }
        
        // Limpiar canvas específicos del itinerario
        const canvasIds = ['paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart'];
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
        });
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                if (window.renderItineraryCharts && typeof window.renderItineraryCharts === 'function') {
                    window.renderItineraryCharts();
                    console.log('✅ Gráficas de Itinerario reinicializadas');
                    showNotification('Gráficas de Itinerario reinicializadas', 'success');
                } else {
                    throw new Error('Función renderItineraryCharts no disponible');
                }
            } catch (error) {
                console.error('❌ Error al recrear gráficas de itinerario:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetItinerarioCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

function resetDemorasCharts() {
    console.log('🔄 Reinicializando gráfica de Demoras...');
    
    const btn = document.getElementById('reset-demoras-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    
    try {
        // Mostrar indicador de carga
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reiniciando...';
            btn.disabled = true;
        }
        
        // Destruir gráfica de demoras existente
        if (window.opsCharts && window.opsCharts.delaysPieChart) {
            try { 
                window.opsCharts.delaysPieChart.destroy(); 
                delete window.opsCharts.delaysPieChart;
            } catch(_) {}
        }
        
        // Limpiar canvas de demoras
        const canvas = document.getElementById('delaysPieChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        
        // Recrear después de un breve delay
        setTimeout(() => {
            try {
                if (window.renderDemoras && typeof window.renderDemoras === 'function') {
                    window.renderDemoras();
                    console.log('✅ Gráfica de Demoras reinicializada');
                    showNotification('Gráfica de Demoras reinicializada', 'success');
                } else {
                    throw new Error('Función renderDemoras no disponible');
                }
            } catch (error) {
                console.error('❌ Error al recrear gráfica de demoras:', error);
                showNotification('Error al recrear gráfica: ' + error.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error crítico en resetDemorasCharts:', error);
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

// Función de diagnóstico global (para usar en consola)
window.diagnoseCharts = function() {
    console.log('🔍 === DIAGNÓSTICO DE GRÁFICAS ===');
    
    const activeSection = document.querySelector('.content-section.active');
    console.log('Sección activa:', activeSection?.id || 'ninguna');
    
    console.log('📊 Gráficas de Operaciones Totales:');
    console.log('opsCharts:', Object.keys(opsCharts));
    
    console.log('📈 Instancias de Chart.js:');
    if (window.Chart && window.Chart.instances) {
        console.log('Chart instances:', Object.keys(window.Chart.instances));
    }
    
    console.log('🎯 Canvas elements:');
    const canvases = ['commercial-ops-chart', 'commercial-pax-chart', 'cargo-ops-chart', 'cargo-tons-chart', 'general-ops-chart', 'general-pax-chart', 'paxArrivalsChart', 'paxDeparturesChart', 'cargoArrivalsChart', 'cargoDeparturesChart', 'delaysPieChart'];
    canvases.forEach(id => {
        const canvas = document.getElementById(id);
        const chart = canvas ? Chart.getChart(canvas) : null;
        console.log(`${id}: canvas=${!!canvas}, chart=${!!chart}`);
    });
    
    console.log('🔧 Funciones globales:');
    console.log('renderOperacionesTotales:', typeof window.renderOperacionesTotales);
    console.log('renderItineraryCharts:', typeof window.renderItineraryCharts);
    console.log('renderDemoras:', typeof window.renderDemoras);
    console.log('destroyItinerarioCharts:', typeof window.destroyItinerarioCharts);
    
    console.log('=== FIN DIAGNÓSTICO ===');
};

// Exponer funciones específicas globalmente
window.resetOperacionesCharts = resetOperacionesCharts;
window.resetItinerarioCharts = resetItinerarioCharts;
window.resetDemorasCharts = resetDemorasCharts;

// Función de ayuda para mostrar atajos de teclado
window.showChartShortcuts = function() {
    console.log('⌨️ ATAJOS DE TECLADO PARA GRÁFICAS:');
    console.log('Ctrl+Shift+R: Reinicializar TODAS las gráficas');
    console.log('Ctrl+Shift+O: Reinicializar gráficas de Operaciones (en sección activa)');
    console.log('Ctrl+Shift+I: Reinicializar gráficas de Itinerario (en sección activa)');
    console.log('Ctrl+Shift+D: Reinicializar gráfica de Demoras (en sección activa)');
    console.log('');
    console.log('🔧 FUNCIONES DISPONIBLES EN CONSOLA:');
    console.log('diagnoseCharts() - Diagnóstico completo del estado de gráficas');
    console.log('resetOperacionesCharts() - Reinicializar solo Operaciones');
    console.log('resetItinerarioCharts() - Reinicializar solo Itinerario');
    console.log('resetDemorasCharts() - Reinicializar solo Demoras');
    console.log('showChartShortcuts() - Mostrar esta ayuda');
};

function animateCounter(elementId, endValue, duration = 2500, isDecimal = false) {
    const element = document.getElementById(elementId);
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = progress * endValue;
        if (isDecimal) {
            element.textContent = new Intl.NumberFormat('es-MX', {maximumFractionDigits: 2, minimumFractionDigits: 2}).format(currentValue);
        } else {
            element.textContent = new Intl.NumberFormat('es-MX').format(Math.floor(currentValue));
        }
        if (progress < 1) { window.requestAnimationFrame(step); }
    };
    window.requestAnimationFrame(step);
}
// --- Seguridad de login en cliente (mejor esfuerzo, no sustituye backend) ---
const LOGIN_LOCK_KEY = 'aifa.lock.count';
const LOGIN_LOCK_TS  = 'aifa.lock.until';
const SESSION_TOKEN  = 'aifa.session.token';
const SESSION_USER   = 'currentUser';
const SECRET_SALT    = 'aifa.ops.local.salt.v1'; // cambia en prod

// Fallback SHA-256 for contexts without crypto.subtle
const SHA256_FALLBACK_INIT = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];
const SHA256_FALLBACK_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function utf8ToBinaryString(str) {
    const s = String(str ?? '');
    if (typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(s);
        let out = '';
        for (let i = 0; i < bytes.length; i += 1) {
            out += String.fromCharCode(bytes[i]);
        }
        return out;
    }
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
        const code = s.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code >= 0xd800 && code <= 0xdbff) {
            const next = s.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                const combined = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
                bytes.push(
                    0xf0 | (combined >> 18),
                    0x80 | ((combined >> 12) & 0x3f),
                    0x80 | ((combined >> 6) & 0x3f),
                    0x80 | (combined & 0x3f)
                );
                i += 1;
            } else {
                bytes.push(0xef, 0xbf, 0xbd);
            }
        } else if (code >= 0xdc00 && code <= 0xdfff) {
            bytes.push(0xef, 0xbf, 0xbd);
        } else {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    let out = '';
    for (let i = 0; i < bytes.length; i += 1) {
        out += String.fromCharCode(bytes[i]);
    }
    return out;
}

function sha256Fallback(str) {
    const binary = utf8ToBinaryString(str);
    const words = [];
    const maxWord = Math.pow(2, 32);
    let result = '';
    let message = binary + '\x80';
    while (message.length % 64 !== 56) {
        message += '\x00';
    }
    for (let i = 0; i < message.length; i += 1) {
        const j = message.charCodeAt(i);
        words[i >> 2] = (words[i >> 2] || 0) | (j << ((3 - i) % 4) * 8);
    }
    const bitLength = binary.length * 8;
    words[words.length] = (bitLength / maxWord) | 0;
    words[words.length] = bitLength >>> 0;

    const hash = SHA256_FALLBACK_INIT.slice();
    const w = new Array(64);
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));

    for (let i = 0; i < words.length; i += 16) {
        for (let t = 0; t < 16; t += 1) {
            w[t] = words[i + t] | 0;
        }
        for (let t = 16; t < 64; t += 1) {
            const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
            const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
        }

        let a = hash[0];
        let b = hash[1];
        let c = hash[2];
        let d = hash[3];
        let e = hash[4];
        let f = hash[5];
        let g = hash[6];
        let h = hash[7];

        for (let t = 0; t < 64; t += 1) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + SHA256_FALLBACK_K[t] + w[t]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        hash[0] = (hash[0] + a) | 0;
        hash[1] = (hash[1] + b) | 0;
        hash[2] = (hash[2] + c) | 0;
        hash[3] = (hash[3] + d) | 0;
        hash[4] = (hash[4] + e) | 0;
        hash[5] = (hash[5] + f) | 0;
        hash[6] = (hash[6] + g) | 0;
        hash[7] = (hash[7] + h) | 0;
    }

    for (let i = 0; i < 8; i += 1) {
        for (let j = 3; j >= 0; j -= 1) {
            const byte = (hash[i] >> (j * 8)) & 0xff;
            result += (byte < 16 ? '0' : '') + byte.toString(16);
        }
    }
    return result;
}

async function sha256(str){
    const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) || null;
    if (cryptoObj && cryptoObj.subtle && typeof TextEncoder !== 'undefined') {
        const enc = new TextEncoder().encode(str);
        const buf = await cryptoObj.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    return sha256Fallback(str);
}

async function makeToken(username){
    const ts = Date.now().toString();
    const sign = await sha256(username + '|' + ts + '|' + SECRET_SALT);
    return `${username}.${ts}.${sign}`;
}

async function verifyToken(token){
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [u, ts, sig] = parts;
    const expect = await sha256(u + '|' + ts + '|' + SECRET_SALT);
    // expira en 12h
    const expired = (Date.now() - Number(ts)) > (12*60*60*1000);
    return (!expired && sig === expect);
}

function getLockInfo(){
    const count = parseInt(localStorage.getItem(LOGIN_LOCK_KEY)||'0',10) || 0;
    const until = parseInt(localStorage.getItem(LOGIN_LOCK_TS)||'0',10) || 0;
    return { count, until };
}
function setLockInfo(count, until){
    localStorage.setItem(LOGIN_LOCK_KEY, String(count));
    localStorage.setItem(LOGIN_LOCK_TS, String(until));
}

async function handleLogin(e) {
    e.preventDefault();
    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    loginButton.classList.add('loading');
    showGlobalLoader('Verificando credenciales...');

    try{
        await ensureAuthHashes();
        const { count, until } = getLockInfo();
        const now = Date.now();
        if (until && now < until) {
            const secs = Math.ceil((until-now)/1000);
            throw new Error(`Demasiados intentos. Intenta en ${secs}s`);
        }

        const usernameInput = (document.getElementById('username').value || '').toString();
        const password = document.getElementById('password').value;
        const normalized = usernameInput.trim().toLowerCase();
        const matchedKey = Object.keys(dashboardData.users).find(k => (k || '').toString().trim().toLowerCase() === normalized);
        const user = matchedKey ? dashboardData.users[matchedKey] : undefined;

        // Comparar hash de la contraseña ingresada contra el hash inicializado
        let passOk = false;
        if (matchedKey) {
            const inputHash = await sha256(password + '|' + normalized + '|' + SECRET_PW_SALT);
            const storedHash = AUTH_HASHES[matchedKey];
            passOk = !!(storedHash && storedHash === inputHash);
        }
        if (!passOk) {
            // incrementar lock con backoff exponencial
            const nextCount = Math.min(8, (count||0)+1);
            const waitMs = Math.min(300000, Math.pow(2, nextCount) * 1000); // hasta 5 min
            setLockInfo(nextCount, Date.now() + waitMs);
            throw new Error('Usuario o contraseña incorrectos');
        }

        // Éxito: limpiar lockout y emitir token firmado
        setLockInfo(0, 0);
        const token = await makeToken(matchedKey);
        sessionStorage.setItem(SESSION_USER, matchedKey);
        sessionStorage.setItem(SESSION_TOKEN, token);
        showMainApp();
    } catch(err){
        const msg = (err && err.message) ? err.message : 'Error de autenticación';
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) errorDiv.textContent = msg;
        const loginButton = document.getElementById('login-button');
        if (loginButton) loginButton.classList.remove('loading');
    } finally {
        hideGlobalLoader();
    }
}

function resetLoginFormState() {
    try {
        const form = document.getElementById('login-form');
        if (form && typeof form.reset === 'function') form.reset();
    } catch (_) {}
    const loginButton = document.getElementById('login-button');
    if (loginButton) loginButton.classList.remove('loading');
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.textContent = '';
}

function updateClock() {
    const clockElement = document.getElementById('formal-clock');
    if (clockElement) {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
        const utcElement = document.getElementById('utc-clock');
        if (utcElement) {
            const nowUtc = new Date();
            utcElement.textContent = nowUtc.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
        }
}
function initializeTheme() {
    // Forzar tema claro permanentemente
    document.body.classList.remove('dark-mode');
    try { localStorage.setItem('theme', 'light'); } catch(_) {}
}
function toggleTheme() {
    // No-op: tema fijo claro
}
function updateThemeIcon(isDarkMode) {
    // No-op: sin botón de tema
}
function initializeSidebarState() {
    const isMobile = window.innerWidth <= 991.98;
    if (isMobile) {
        document.body.classList.remove('sidebar-collapsed');
        document.body.classList.remove('sidebar-open');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('visible');
        if (overlay) overlay.classList.remove('active');
        return;
    }
    const savedState = localStorage.getItem('sidebarState') || 'collapsed';
    if (savedState === 'collapsed') document.body.classList.add('sidebar-collapsed');
    else document.body.classList.remove('sidebar-collapsed');
}
function toggleSidebar() {
    const isMobile = window.innerWidth <= 991.98;
    if (isMobile) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar || !overlay) return;
        const willShow = !sidebar.classList.contains('visible');
        if (willShow) {
            document.body.classList.remove('sidebar-collapsed');
        }
        sidebar.classList.toggle('visible', willShow);
        overlay.classList.toggle('active', willShow);
        document.body.classList.toggle('sidebar-open', willShow);
    } else {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
    }
}
function getChartColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return {
        grid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        ticks: isDarkMode ? '#bbb' : '#666',
        labels: isDarkMode ? '#e8eaed' : '#343a40',
        tooltip: { backgroundColor: isDarkMode ? '#151d27' : '#fff', titleColor: isDarkMode ? '#e8eaed' : '#333', bodyColor: isDarkMode ? '#e8eaed' : '#333', }
    };
}
function captureItineraryFilterSelections() {
    const getValue = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
        return el.value;
    };
    return {
        airline: getValue('airline-filter'),
        position: getValue('position-filter'),
        origin: getValue('origin-filter'),
        destination: getValue('destination-filter'),
        claim: getValue('claim-filter'),
        date: getValue('date-filter'),
        hour: getValue('hour-filter'),
        hourType: getValue('hour-type-filter')
    };
}

function restoreItineraryFilterSelections(state = {}) {
    const setSelectValue = (id, value, fallback = 'all') => {
        if (value == null || value === undefined) return;
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            const exists = Array.from(el.options || []).some(opt => opt.value === value);
            el.value = exists ? value : fallback;
        } else if ('value' in el) {
            el.value = value;
        }
    };
    setSelectValue('airline-filter', state.airline, 'all');
    setSelectValue('position-filter', state.position, 'all');
    setSelectValue('origin-filter', state.origin, 'all');
    setSelectValue('destination-filter', state.destination, 'all');
    const claimInput = document.getElementById('claim-filter');
    if (claimInput && Object.prototype.hasOwnProperty.call(state, 'claim')) {
        claimInput.value = state.claim != null ? state.claim : '';
    }
    if (state.date) {
        const dateInput = document.getElementById('date-filter');
        if (dateInput) dateInput.value = state.date;
    }
    setSelectValue('hour-filter', state.hour, 'all');
    setSelectValue('hour-type-filter', state.hourType, 'both');
}

async function loadItineraryData(options = {}) {
    const preserveFilters = !!options.preserveFilters;
    const previousFilters = preserveFilters ? captureItineraryFilterSelections() : null;
    try {
        const response = await fetch('data/itinerario.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allFlightsData = await response.json();
    // Pre-cargar filtro de fecha con 'hoy' si está vacío
    try {
        const dateInput = document.getElementById('date-filter');
        if (dateInput && !dateInput.value) {
            const d = new Date();
            const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            dateInput.value = ymd;
        }
    } catch (_) {}
    if (!preserveFilters) {
        displaySummaryTable(allFlightsData, { selectedAirline: 'all' });
    }
    populateAirlineFilter();
    populatePositionFilter();
    populateOriginFilter();
    populateDestinationFilter();
    if (preserveFilters && previousFilters) {
        restoreItineraryFilterSelections(previousFilters);
    }
    applyFilters(); 
    // actualizar estadísticas diarias una vez cargado el itinerario
    computeDailyStats();
    try { renderFrecuenciasSemana(); } catch(_) {}
    try { ensurePeakDate(); renderDailyPeaks(); } catch(_) {}
    } catch (error) {
        console.error("Error al cargar itinerario:", error);
        const passengerContainer = document.getElementById('passenger-itinerary-container');
        if(passengerContainer && !preserveFilters) { passengerContainer.innerHTML = `<div class="alert alert-danger">Error al cargar datos del itinerario.</div>`; }
    }
    return allFlightsData;
}
function updateAirlineQuickSummary(options = {}) {
    const card = document.getElementById('airline-summary-card');
    if (!card) return;
    const clearStyles = () => {
        ['--airline-summary-accent','--airline-summary-bg-strong','--airline-summary-bg-soft','--airline-summary-border','--airline-summary-shadow'].forEach(prop => card.style.removeProperty(prop));
    };
    const airlineNameRaw = (options.airline || '').toString().trim();
    const isAllAirlines = !airlineNameRaw || airlineNameRaw === 'all';
    const flights = Array.isArray(options.flights) ? options.flights : [];
    const passengerCount = Math.max(0, Number(options.passengerCount || 0));
    const cargoCount = Math.max(0, Number(options.cargoCount || 0));
    const generalCount = Math.max(0, flights.length - passengerCount - cargoCount);

    clearStyles();

    if (!flights.length) {
        card.classList.add('is-empty');
        const message = isAllAirlines
            ? '<i class="fas fa-plane-slash me-2"></i>No se encontraron vuelos con los filtros seleccionados.'
            : `<i class="fas fa-plane-slash me-2"></i>${escapeHTML(airlineNameRaw)} no tiene vuelos programados con los filtros seleccionados.`;
        card.innerHTML = `<div class="airline-summary-placeholder">${message}</div>`;
        return;
    }

    card.classList.remove('is-empty');

    const accent = isAllAirlines ? '#0d6efd' : getAirlineAccentColor(airlineNameRaw);
    card.style.setProperty('--airline-summary-accent', accent);
    card.style.setProperty('--airline-summary-bg-strong', hexToRgba(accent, 0.18));
    card.style.setProperty('--airline-summary-bg-soft', hexToRgba(accent, 0.05));
    card.style.setProperty('--airline-summary-border', hexToRgba(accent, 0.3));
    card.style.setProperty('--airline-summary-shadow', hexToRgba(accent, 0.2));

    const logoCandidates = isAllAirlines ? [] : getAirlineLogoCandidates(airlineNameRaw);
    const logoPath = logoCandidates[0];
    const dataCands = logoCandidates.join('|');
    const logoMarkup = isAllAirlines
        ? '<div class="airline-summary-logo-icon"><i class="fas fa-globe-americas"></i></div>'
        : (logoPath
            ? `<img class="airline-summary-logo-img" src="${escapeHTML(logoPath)}" alt="Logo ${escapeHTML(airlineNameRaw)}" data-cands="${escapeHTML(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : `<span class="airline-summary-logo-fallback">${escapeHTML((airlineNameRaw || '?').charAt(0) || '?')}</span>`);

    const formatter = new Intl.NumberFormat('es-MX');
    const fmt = (value) => formatter.format(Number(value || 0));

    const arrivals = flights.reduce((total, flight) => total + (String(flight?.vuelo_llegada || flight?.hora_llegada || '').trim() ? 1 : 0), 0);
    const departures = flights.reduce((total, flight) => total + (String(flight?.vuelo_salida || flight?.hora_salida || '').trim() ? 1 : 0), 0);
    const operations = arrivals + departures;

    let dateLabel = '';
    if (options.selectedDate) {
        dateLabel = formatYMDToDMY(options.selectedDate);
    }
    if (!dateLabel) {
        if (isAllAirlines) {
            dateLabel = 'Sin filtro de fecha';
        } else {
            const sample = flights.find(f => (f && (f.fecha_llegada || f.fecha_salida)));
            if (sample) dateLabel = (sample.fecha_llegada || sample.fecha_salida || '').toString();
            if (!dateLabel) dateLabel = 'Sin fecha definida';
        }
    }

    const typeMap = {
        passenger: { label: 'Pasajeros', icon: 'fas fa-users', variant: 'passenger' },
        cargo: { label: 'Carga', icon: 'fas fa-boxes', variant: 'cargo' },
        general: { label: 'Aviación general', icon: 'fas fa-paper-plane', variant: 'general' },
        mixed: { label: 'Mixta', icon: 'fas fa-layer-group', variant: 'mixed' },
        empty: { label: 'Sin vuelos', icon: 'fas fa-plane-slash', variant: 'empty' }
    };

    let typeVariant = 'mixed';
    if (!isAllAirlines) {
        if (passengerCount > 0 && cargoCount === 0 && generalCount === 0) typeVariant = 'passenger';
        else if (cargoCount > 0 && passengerCount === 0 && generalCount === 0) typeVariant = 'cargo';
        else if (generalCount > 0 && passengerCount === 0 && cargoCount === 0) typeVariant = 'general';
        else if (!flights.length) typeVariant = 'empty';
    }
    let typeInfo = typeMap[typeVariant] || typeMap.mixed;
    if (isAllAirlines) {
        typeInfo = { label: 'Vista general', icon: 'fas fa-globe-americas', variant: 'mixed' };
    }

    const metricsHtml = [
        { icon: 'fas fa-plane', label: 'Vuelos', value: flights.length },
        { icon: 'fas fa-plane-arrival', label: 'Llegadas', value: arrivals },
        { icon: 'fas fa-plane-departure', label: 'Salidas', value: departures },
        { icon: 'fas fa-route', label: 'Operaciones', value: operations }
    ].map(metric => `
        <div class="airline-summary-metric">
            <span class="label">${metric.icon ? `<i class="${metric.icon} icon"></i>` : ''}${escapeHTML(metric.label)}</span>
            <span class="value">${fmt(metric.value)}</span>
        </div>
    `).join('');
    const breakdownChips = [
        { label: 'Pasajeros', value: passengerCount, variant: 'passenger', icon: 'fas fa-users' },
        { label: 'Carga', value: cargoCount, variant: 'cargo', icon: 'fas fa-box-open' },
        { label: 'General', value: generalCount, variant: 'general', icon: 'fas fa-paper-plane' }
    ].filter(item => item.value > 0).map(item => `
        <span class="airline-summary-chip" data-variant="${item.variant}">${item.icon ? `<i class="${item.icon}"></i>` : ''}${escapeHTML(item.label)} <strong>${fmt(item.value)}</strong></span>
    `).join('');
    const dateHtml = dateLabel ? `<span class="airline-summary-date">${escapeHTML(dateLabel)}</span>` : '';
    const displayTitle = isAllAirlines ? 'Todas las aerolíneas' : airlineNameRaw;

    card.innerHTML = `
        <div class="airline-summary-body">
            <div class="airline-summary-main">
                <div class="airline-summary-logo">${logoMarkup}</div>
                <div class="airline-summary-text">
                    <div class="airline-summary-title">${escapeHTML(displayTitle)}</div>
                    <div class="airline-summary-meta">
                        ${dateHtml}
                        <span class="airline-summary-type" data-variant="${typeInfo.variant}"><i class="${typeInfo.icon}"></i>${escapeHTML(typeInfo.label)}</span>
                    </div>
                </div>
            </div>
            <div class="airline-summary-metrics">${metricsHtml}</div>
            ${breakdownChips ? `<div class="airline-summary-breakdown">${breakdownChips}</div>` : ''}
        </div>
    `;
    card.classList.remove('is-highlight');
    void card.offsetWidth;
    card.classList.add('is-highlight');
    setTimeout(() => card.classList.remove('is-highlight'), 650);
}

function renderItineraryAirlineDetail(config = {}) {
    const container = document.getElementById('itinerary-airline-detail');
    if (!container) return;
    cleanupDynamicTableHeader('itinerary-detail');
    const airlineNameRaw = (config.airline || '').toString().trim();
    if (!airlineNameRaw || airlineNameRaw === 'all') {
        container.classList.add('d-none');
        container.innerHTML = '';
        return;
    }
    const flights = Array.isArray(config.flights) ? config.flights : [];
    const passengerFlights = Array.isArray(config.passengerFlights) ? config.passengerFlights : [];
    const cargoFlights = Array.isArray(config.cargoFlights) ? config.cargoFlights : [];
    const fmt = new Intl.NumberFormat('es-MX');
    const escapeHtml = escapeHTML;
    if (!flights.length) {
        container.classList.remove('d-none');
        container.innerHTML = `<div class="alert alert-warning mb-0">No hay operaciones para ${escapeHtml(airlineNameRaw)} con los filtros actuales.</div>`;
        return;
    }

    const timeToMinutes = (value) => {
        const match = /^\s*(\d{1,2})\s*:\s*(\d{2})/.exec(String(value || ''));
        if (!match) return Number.MAX_SAFE_INTEGER;
        const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
        const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
        return hours * 60 + minutes;
    };

    let arrivals = 0;
    let departures = 0;
    flights.forEach((flight) => {
        if (String(flight?.vuelo_llegada || flight?.hora_llegada || '').trim()) arrivals += 1;
        if (String(flight?.vuelo_salida || flight?.hora_salida || '').trim()) departures += 1;
    });
    const operations = arrivals + departures;
    const passengerCount = passengerFlights.length;
    const cargoCount = cargoFlights.length;
    const generalCount = Math.max(0, flights.length - passengerCount - cargoCount);
    const accentColor = getAirlineAccentColor(airlineNameRaw) || '#0d6efd';
    const accentBg = hexToRgba(accentColor, 0.12);
    const accentBorder = hexToRgba(accentColor, 0.35);
    const accentShadow = hexToRgba(accentColor, 0.18);
    const dateLabel = config.selectedDate ? formatYMDToDMY(config.selectedDate) : '';
    const subtitleParts = [
        `Incluye ${fmt.format(arrivals)} llegadas y ${fmt.format(departures)} salidas`,
        `${fmt.format(flights.length)} vuelos listados`
    ];
    if (dateLabel) subtitleParts.push(`Fecha ${escapeHtml(dateLabel)}`);
    const subtitle = subtitleParts.join(' · ');

    const sortFlights = [...flights].sort((a, b) => {
        const aTime = Math.min(timeToMinutes(a?.hora_llegada), timeToMinutes(a?.hora_salida));
        const bTime = Math.min(timeToMinutes(b?.hora_llegada), timeToMinutes(b?.hora_salida));
        if (aTime !== bTime) return aTime - bTime;
        return String(a?.vuelo_llegada || a?.vuelo_salida || '').localeCompare(String(b?.vuelo_llegada || b?.vuelo_salida || ''), undefined, { sensitivity: 'base' });
    });
    const rows = sortFlights.map((flight, index) => {
        const airlineName = (flight && flight.aerolinea) ? String(flight.aerolinea) : 'Sin aerolínea';
        const logoCandidates = getAirlineLogoCandidates(airlineName) || [];
        const logoPath = logoCandidates[0] || '';
        const dataCands = logoCandidates.join('|');
        const sizeClass = getLogoSizeClass(airlineName, 'table');
        const logoHtml = logoPath
            ? `<img class="airline-logo ${escapeHtml(sizeClass)}" src="${escapeHtml(logoPath)}" alt="Logo ${escapeHtml(airlineName)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : '';
        const rowColor = airlineColors[airlineName] || '#0d6efd';
        const delay = (index * 0.05).toFixed(2);
        const cell = (field) => {
            const value = field === undefined || field === null || String(field).trim() === '' ? '-' : field;
            return escapeHtml(String(value));
        };
        const positionDisplay = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
        const positionCell = positionDisplay ? escapeHtml(positionDisplay) : '-';
        return `<tr class="animated-row" style="--delay:${delay}s; --airline-color:${rowColor};"><td><div class="airline-cell">${logoHtml}<span class="airline-name">${escapeHtml(airlineName)}</span></div></td><td>${cell(flight?.aeronave)}</td><td>${cell(flight?.vuelo_llegada)}</td><td>${cell(flight?.fecha_llegada)}</td><td>${cell(flight?.hora_llegada)}</td><td class="col-origen">${cell(flight?.origen)}</td><td class="text-center">${cell(flight?.banda_reclamo)}</td><td>${positionCell}</td><td>${cell(flight?.vuelo_salida)}</td><td>${cell(flight?.fecha_salida)}</td><td>${cell(flight?.hora_salida)}</td><td class="col-destino">${cell(flight?.destino)}</td></tr>`;
    }).join('');

    const breakdownChips = [
        { label: 'Pasajeros', value: passengerCount, icon: 'fas fa-users', variant: 'passenger' },
        { label: 'Carga', value: cargoCount, icon: 'fas fa-box-open', variant: 'cargo' },
        { label: 'General', value: generalCount, icon: 'fas fa-paper-plane', variant: 'general' }
    ].filter(item => item.value > 0).map(item => `<span class="itinerary-airline-chip" data-variant="${item.variant}"><i class="${item.icon}"></i>${escapeHtml(item.label)} <strong>${fmt.format(item.value)}</strong></span>`).join('');

    container.classList.remove('d-none');
    container.innerHTML = `
    <div class="card itinerary-airline-card" style="--itinerary-airline-accent:${accentColor}; --itinerary-airline-accent-bg:${accentBg}; --itinerary-airline-accent-border:${accentBorder}; --itinerary-airline-accent-shadow:${accentShadow};">
            <div class="card-body">
                <div class="itinerary-airline-card-head">
                    <div>
                        <div class="itinerary-airline-title">Itinerario de ${escapeHtml(airlineNameRaw)}</div>
                        <div class="itinerary-airline-sub">${subtitle}</div>
                    </div>
                    <div class="itinerary-airline-pills">
                        <span class="itinerary-pill"><i class="fas fa-plane"></i>${fmt.format(operations)} operaciones</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-arrival"></i>${fmt.format(arrivals)} llegadas</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-departure"></i>${fmt.format(departures)} salidas</span>
                    </div>
                </div>
                <div class="itinerary-airline-toolbar-detail">
                    <div class="itinerary-airline-breakdown">${breakdownChips || '<span class="text-muted small">Sin desglose por tipo disponible.</span>'}</div>
                    <button type="button" class="btn btn-sm btn-outline-primary" data-action="clear-airline-filter"><i class="fas fa-undo me-1"></i>Ver todas las aerolíneas</button>
                </div>
                <div class="table-responsive itinerary-airline-table">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Aerolínea</th>
                                <th>Aeronave</th>
                                <th>Vuelo Lleg.</th>
                                <th>Fecha Lleg.</th>
                                <th>Hora Lleg.</th>
                                <th class="col-origen">Origen</th>
                                <th>Banda</th>
                                <th>Posición</th>
                                <th>Vuelo Sal.</th>
                                <th>Fecha Sal.</th>
                                <th>Hora Sal.</th>
                                <th class="col-destino">Destino</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="12" class="text-center text-muted">Sin vuelos disponibles.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const clearBtn = container.querySelector('[data-action="clear-airline-filter"]');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const select = document.getElementById('airline-filter');
            if (!select) return;
            select.value = 'all';
            applyFilters();
        });
    }
    setupDynamicTableHeader(container.querySelector('table'), 'itinerary-detail');
}
function applyFilters() {
    const t0 = performance.now();
    const selectedAirlineRaw = document.getElementById('airline-filter').value;
    const selectedAirline = (selectedAirlineRaw || '').toString().trim();
    const claimFilterValue = document.getElementById('claim-filter') ? document.getElementById('claim-filter').value.trim().toLowerCase() : '';
    const globalSearchValue = document.getElementById('global-search') ? document.getElementById('global-search').value.trim().toLowerCase() : '';
    // date filter (Inicio)
    const dateEl = document.getElementById('date-filter');
    const selectedDate = dateEl ? (dateEl.value || '').toString().trim() : '';
    // hour filters (Inicio)
    const hourSelectEl = document.getElementById('hour-filter');
    const hourTypeEl = document.getElementById('hour-type-filter');
    const selectedHour = hourSelectEl ? hourSelectEl.value : 'all'; // 'all' or '00'..'23'
    const hourType = hourTypeEl ? hourTypeEl.value : 'both';         // 'both' | 'arr' | 'dep'
    // position is now a select populated from JSON
    const posFilterVal = document.getElementById('position-filter') ? document.getElementById('position-filter').value : 'all';
    // origin/destination filters (new selects)
    const originFilterVal = document.getElementById('origin-filter') ? document.getElementById('origin-filter').value : 'all';
    const destinationFilterVal = document.getElementById('destination-filter') ? document.getElementById('destination-filter').value : 'all';
    // helpers for robust parsing
    const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const parseDMY = (s) => {
        if (!s) return null;
        const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(String(s).trim());
        if (!m) return null;
        const dd = parseInt(m[1],10), mm = parseInt(m[2],10), yy = parseInt(m[3],10);
        return new Date(yy, mm-1, dd);
    };
    const getHourInt = (s) => {
        const m = /^(\s*)(\d{1,2})\s*:\s*(\d{2})/.exec((s||'').toString());
        if (!m) return null;
        const h = Math.max(0, Math.min(23, parseInt(m[2],10)));
        return h;
    };
    const getMinutes = (s) => {
        const m = /^(\s*)(\d{1,2})\s*:\s*(\d{2})/.exec((s||'').toString());
        if (!m) return Number.MAX_SAFE_INTEGER;
        const h = Math.max(0, Math.min(23, parseInt(m[2],10)));
        const mi = Math.max(0, Math.min(59, parseInt(m[3],10)));
        return h*60 + mi;
    };

    let filteredData = allFlightsData;
    if (selectedAirline && selectedAirline !== 'all') { filteredData = filteredData.filter(flight => (flight.aerolinea || '').toString().trim() === selectedAirline); }
    // date filter: match dd/mm/yyyy in data vs yyyy-mm-dd in input
    if (selectedDate) {
        const selYMD = selectedDate; // yyyy-mm-dd from input
        const matchDate = (f) => {
            const ymdArr = (() => { const d = parseDMY(f.fecha_llegada); return d ? toYMD(d) : null; })();
            const ymdDep = (() => { const d = parseDMY(f.fecha_salida); return d ? toYMD(d) : null; })();
            if (hourType === 'arr') return ymdArr === selYMD;
            if (hourType === 'dep') return ymdDep === selYMD;
            return (ymdArr === selYMD) || (ymdDep === selYMD);
        };
        filteredData = filteredData.filter(matchDate);
    }
    // If date filter yields no data, auto-relax it to ensure content is shown (mobile first-load fix)
    if (selectedDate && filteredData.length === 0) {
        // Find the date with most flights in allFlightsData
        const freq = new Map();
        const inc = (d)=>{ if (!d) return; const k = String(d).trim(); if (!k) return; freq.set(k, (freq.get(k)||0)+1); };
        for (const f of (allFlightsData||[])) { inc(f.fecha_llegada); inc(f.fecha_salida); }
        let bestDMY=null, bestN=-1; for (const [dmy,n] of freq) { if (n>bestN) { bestN=n; bestDMY=dmy; } }
        const dateElFix = document.getElementById('date-filter');
        if (bestDMY) {
            const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(bestDMY);
            if (m) {
                const ymd = `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
                if (dateElFix) dateElFix.value = ymd;
                return applyFilters();
            }
        }
        // No best date: clear date filter and re-apply
        if (dateElFix) dateElFix.value = '';
        return applyFilters();
    }
    // Prefer categorization via 'categoria' field when available
    let passengerFlights = filteredData.filter(f => (f.categoria && f.categoria.toLowerCase() === 'pasajeros') || passengerAirlines.includes(f.aerolinea));
    let cargoFlights = filteredData.filter(f => (f.categoria && f.categoria.toLowerCase() === 'carga') || cargoAirlines.includes(f.aerolinea));
    if (claimFilterValue !== '') { passengerFlights = passengerFlights.filter(flight => (flight.banda_reclamo || '').toString().toLowerCase().includes(claimFilterValue)); }
    // position filter (select) - applies to both (value 'all' means no filter)
    if (posFilterVal && posFilterVal !== 'all') {
        const posLower = posFilterVal.toString().toLowerCase();
        passengerFlights = passengerFlights.filter(f => (f.posicion || '').toString().toLowerCase() === posLower);
        cargoFlights = cargoFlights.filter(f => (f.posicion || '').toString().toLowerCase() === posLower);
    }
    // origin filter (exact match, case-insensitive, trimming)
    if (originFilterVal && originFilterVal !== 'all') {
        const o = originFilterVal.toString().trim().toLowerCase();
        const matchOrigin = (f) => (f.origen || '').toString().trim().toLowerCase() === o;
        passengerFlights = passengerFlights.filter(matchOrigin);
        cargoFlights = cargoFlights.filter(matchOrigin);
    }
    // destination filter
    if (destinationFilterVal && destinationFilterVal !== 'all') {
        const d = destinationFilterVal.toString().trim().toLowerCase();
        const matchDest = (f) => (f.destino || '').toString().trim().toLowerCase() === d;
        passengerFlights = passengerFlights.filter(matchDest);
        cargoFlights = cargoFlights.filter(matchDest);
    }
    // Global text search across common fields (moved before hour filter)
    if (globalSearchValue !== '') {
        const term = globalSearchValue;
        const matchFn = (f) => {
            return ((f.aerolinea || '').toString().toLowerCase().includes(term)) || ((f.origen || '').toString().toLowerCase().includes(term)) || ((f.destino || '').toString().toLowerCase().includes(term)) || ((f.vuelo_llegada || '').toString().toLowerCase().includes(term)) || ((f.vuelo_salida || '').toString().toLowerCase().includes(term)) || ((f.banda_reclamo || '').toString().toLowerCase().includes(term));
        };
        passengerFlights = passengerFlights.filter(matchFn);
        cargoFlights = cargoFlights.filter(matchFn);
    }
    // Snapshot del subconjunto antes del filtro por hora (para sincronizar gráficas)
    try {
        window.currentItineraryPreHour = {
            pax: [...(passengerFlights||[])],
            cargo: [...(cargoFlights||[])],
            combined: [...(passengerFlights||[]), ...(cargoFlights||[])]
        };
    } catch(_) {}
    // hour filter: ensure hour is associated to the same date side that matched
    if (selectedHour && selectedHour !== 'all') {
        const hhNum = parseInt(selectedHour, 10);
        const selYMD = selectedDate || '';
        const matchHour = (f) => {
            const hl = getHourInt(f.hora_llegada);
            const hs = getHourInt(f.hora_salida);
            // derive dates in yyyy-mm-dd for each side
            const toYMD = (s) => {
                const m = /^([0-9]{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s||'').toString().trim());
                if (!m) return null;
                return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
            };
            const ymdArr = toYMD(f.fecha_llegada);
            const ymdDep = toYMD(f.fecha_salida);
            if (hourType === 'arr') return (hl === hhNum) && (!selYMD || ymdArr === selYMD);
            if (hourType === 'dep') return (hs === hhNum) && (!selYMD || ymdDep === selYMD);
            // both: accept either side but bind hour to the same side date when date is selected
            const okArr = (hl === hhNum) && (!selYMD || ymdArr === selYMD);
            const okDep = (hs === hhNum) && (!selYMD || ymdDep === selYMD);
            return okArr || okDep;
        };
        passengerFlights = passengerFlights.filter(matchHour);
        cargoFlights = cargoFlights.filter(matchHour);
    }
    // (global search ya aplicado antes del filtro por hora)
    // Mostrar/ocultar tablas según categoría si hay filtro de aerolínea específico
    const passBlock = document.getElementById('itinerary-passenger-block');
    const cargoBlock = document.getElementById('itinerary-cargo-block');
    const filterControls = document.getElementById('filter-controls');
    const toolbar = document.querySelector('.itinerary-airline-toolbar');
    const isSpecificAirline = !!selectedAirline && selectedAirline !== 'all';
    const hasPassengerFlights = passengerFlights.length > 0;
    const hasCargoFlights = cargoFlights.length > 0;
    if (isSpecificAirline) {
        if (passBlock) passBlock.style.display = 'none';
        if (cargoBlock) cargoBlock.style.display = 'none';
        if (filterControls) filterControls.classList.add('d-none');
        if (toolbar) toolbar.classList.add('airline-selected');
    } else {
        if (passBlock) passBlock.style.display = '';
        if (cargoBlock) cargoBlock.style.display = '';
        if (filterControls) filterControls.classList.remove('d-none');
        if (toolbar) toolbar.classList.remove('airline-selected');
    }

    // If an hour is selected, sort results ascending by the chosen time field
    if (selectedHour && selectedHour !== 'all') {
        const byArr = (a,b)=> getMinutes(a.hora_llegada) - getMinutes(b.hora_llegada);
        const byDep = (a,b)=> getMinutes(a.hora_salida) - getMinutes(b.hora_salida);
        if (hourType === 'arr') {
            passengerFlights.sort(byArr); cargoFlights.sort(byArr);
        } else if (hourType === 'dep') {
            passengerFlights.sort(byDep); cargoFlights.sort(byDep);
        } else {
            // both: sort by min of arr/dep time
            const byEither = (a,b)=> {
                const aMin = Math.min(getMinutes(a.hora_llegada), getMinutes(a.hora_salida));
                const bMin = Math.min(getMinutes(b.hora_llegada), getMinutes(b.hora_salida));
                return aMin - bMin;
            };
            passengerFlights.sort(byEither); cargoFlights.sort(byEither);
        }
    }

    displayPassengerTable(passengerFlights);
    displayCargoTable(cargoFlights);
    // update summary based on currently visible (fully filtered) data
    displaySummaryTable([...(passengerFlights||[]), ...(cargoFlights||[])], { selectedAirline });
    updateAirlineQuickSummary({
        airline: selectedAirline,
        flights: Array.isArray(filteredData) ? filteredData : [],
        passengerCount: passengerFlights.length,
        cargoCount: cargoFlights.length,
        selectedDate
    });
    renderItineraryAirlineDetail({
        airline: selectedAirline,
        flights: Array.isArray(filteredData) ? filteredData : [],
        passengerFlights,
        cargoFlights,
        selectedDate
    });
    // Expose the filtered subset to sync charts in 'Gráficas Itinerario'
    try {
        window.currentItineraryFilterState = {
            selectedDate,
            hourType: hourType || 'both',
            selectedHour: selectedHour || 'all',
            origin: originFilterVal || 'all',
            destination: destinationFilterVal || 'all'
        };
        window.currentItineraryFiltered = {
            flightsPax: passengerFlights,
            flightsCargo: cargoFlights,
            flightsCombined: [...(passengerFlights||[]), ...(cargoFlights||[])]
        };
        const sync = (window.syncItineraryFiltersToCharts !== false); // default true
        if (sync && isItineraryChartsPaneActive() && typeof window.renderItineraryCharts === 'function') {
            clearTimeout(window._itSyncTimer);
            window._itSyncTimer = setTimeout(() => { try { window.renderItineraryCharts(); } catch(_) {} }, 80);
        }
    } catch(_) {}
    console.log(`[perf] filtros itinerario: ${(performance.now()-t0).toFixed(1)}ms · pax=${passengerFlights.length} carga=${cargoFlights.length}`);
    // Nota: el resumen diario por aerolínea fue removido del UI; no renderizamos conteos aquí.
    // Si se requiere reinstalar, reimplementar renderItinerarioSummary y descomentar la línea siguiente:
    // renderItinerarioSummary(filteredData);
}

function populateAirlineFilter(flights = []) {
  const sel = document.getElementById('airline-filter');
  if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const names = data
    .map(f => (f.aerolinea || f.aerolínea || f.airline || '').trim())
    .filter(Boolean);
  const unique = Array.from(new Set(names)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
  sel.innerHTML = '<option value="all" selected>Todas las Aerolíneas</option>' +
    unique.map(a => `<option value="${a}">${a}</option>`).join('');
}

function populatePositionFilter(flights = []) {
  const sel = document.getElementById('position-filter');
  if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
        const vals = data
        .map((f) => normalizePositionValue(f.posicion || f.posición || f.stand || ''))
        .filter(Boolean);
  const unique = Array.from(new Set(vals)).sort();
  sel.innerHTML = '<option value="all" selected>Todas las posiciones</option>' +
    unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

// Nuevos: llenar selects de Origen/Destino
function populateOriginFilter(flights = []) {
    const sel = document.getElementById('origin-filter');
    if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const vals = data.map(f => (f.origen||'').toString().trim()).filter(Boolean);
    const unique = Array.from(new Set(vals)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
    sel.innerHTML = '<option value="all" selected>Todos los orígenes</option>' +
        unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

function populateDestinationFilter(flights = []) {
    const sel = document.getElementById('destination-filter');
    if (!sel) return;
    const data = Array.isArray(flights) && flights.length ? flights : allFlightsData;
    const vals = data.map(f => (f.destino||'').toString().trim()).filter(Boolean);
    const unique = Array.from(new Set(vals)).sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
    sel.innerHTML = '<option value="all" selected>Todos los destinos</option>' +
        unique.map(v => `<option value="${v}">${v}</option>`).join('');
}

function clearFilters() {
    const airline = document.getElementById('airline-filter'); if (airline) airline.value = 'all';
    const pos = document.getElementById('position-filter'); if (pos) pos.value = 'all';
    const ori = document.getElementById('origin-filter'); if (ori) ori.value = 'all';
    const des = document.getElementById('destination-filter'); if (des) des.value = 'all';
    const claim = document.getElementById('claim-filter'); if (claim) claim.value = '';
    const date = document.getElementById('date-filter'); if (date) date.value = '';
    const hourSel = document.getElementById('hour-filter'); if (hourSel) hourSel.value = 'all';
    const hourTypeSel = document.getElementById('hour-type-filter'); if (hourTypeSel) hourTypeSel.value = 'both';
    applyFilters();
    // visual confirmation: temporary highlight and toast
    const btn = document.getElementById('clear-filters');
    if (btn) {
        btn.classList.add('btn-success');
        setTimeout(() => btn.classList.remove('btn-success'), 900);
    }
    const toastEl = document.getElementById('action-toast');
    if (toastEl && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        try { const t = new bootstrap.Toast(toastEl); t.show(); } catch(e) { /* ignore */ }
    }
}

function viewFlightsForAirline(airline) {
    // set airline filter and re-run
    try {
        summaryDetailMode = 'airline';
        summarySelectedAirline = airline;
        summarySelectedPosition = null;
        summarySelectionLocked = true;
    } catch(_) {}
    const select = document.getElementById('airline-filter');
    if (!select) return;
    // ensure option exists
    let exists = Array.from(select.options).find(o => o.value === airline);
    if (!exists) {
        const opt = document.createElement('option'); opt.value = airline; opt.textContent = airline; select.appendChild(opt);
    }
    select.value = airline;
    applyFilters();
    // programmatically switch to interactive tab (itinerario section view already shows tables)
    // scroll passenger table into view
    const passengerEl = document.getElementById('passenger-itinerary-container');
    if (passengerEl) passengerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function displaySummaryTableLegacy(flights, options) {
    // Legacy placeholder: delega a la nueva implementación modernizada.
    displaySummaryTable(flights, options);
}
function displaySummaryTable(flights, options = {}) {
    const container = document.getElementById('summary-table-container');
    if (!container) return;

    const escapeHtml = escapeHTML;
    const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(Number(value || 0));
    const selectedAirlineRaw = options.selectedAirline !== undefined
        ? options.selectedAirline
        : (document.getElementById('airline-filter')?.value ?? 'all');
    const selectedAirline = (selectedAirlineRaw || '').toString().trim();
    const hasSpecificAirline = selectedAirline && selectedAirline !== 'all';
    const selectedAirlineEscaped = hasSpecificAirline ? escapeHtml(selectedAirline) : '';

    if (!Array.isArray(flights) || flights.length === 0) {
        const emptyMessage = hasSpecificAirline
            ? `No hay operaciones para ${selectedAirlineEscaped} con los filtros actuales.`
            : 'No se encontraron operaciones.';
        container.innerHTML = `<div class="alert alert-info bg-transparent text-body">${emptyMessage}</div>`;
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const totals = {
        arrivals: 0,
        departures: 0,
        flights: 0,
        passengerFlights: 0,
        cargoFlights: 0,
        generalFlights: 0,
        passengerOps: { arrivals: 0, departures: 0 },
        cargoOps: { arrivals: 0, departures: 0 },
        generalOps: { arrivals: 0, departures: 0 }
    };
    const summaryMap = new Map();
    const positionMap = new Map();

    flights.forEach((flight) => {
        const airlineName = (flight && flight.aerolinea ? String(flight.aerolinea).trim() : '') || 'Sin aerolínea';
        let entry = summaryMap.get(airlineName);
        if (!entry) {
            entry = { arrivals: 0, departures: 0, flights: [], passengerFlights: 0, cargoFlights: 0, generalFlights: 0 };
            summaryMap.set(airlineName, entry);
        }
        entry.flights.push(flight);
        totals.flights += 1;

    const hasArrival = !!String(flight?.vuelo_llegada || flight?.hora_llegada || '').trim();
    const hasDeparture = !!String(flight?.vuelo_salida || flight?.hora_salida || '').trim();
        if (hasArrival) {
            entry.arrivals += 1;
            totals.arrivals += 1;
        }
        if (hasDeparture) {
            entry.departures += 1;
            totals.departures += 1;
        }

        const categoryRaw = (flight?.categoria || flight?.category || '').toString().trim().toLowerCase();
        let isPassengerFlight = false;
        let isCargoFlight = false;
        if (categoryRaw.includes('pasaj')) isPassengerFlight = true;
        if (categoryRaw.includes('carg')) isCargoFlight = true;

        const normalizedAirline = normalizeAirlineName(airlineName);
        if (!isPassengerFlight && !isCargoFlight) {
            if (passengerAirlinesNormalized.has(normalizedAirline) && !cargoAirlinesNormalized.has(normalizedAirline)) {
                isPassengerFlight = true;
            } else if (cargoAirlinesNormalized.has(normalizedAirline) && !passengerAirlinesNormalized.has(normalizedAirline)) {
                isCargoFlight = true;
            } else if (entry.passengerFlights > entry.cargoFlights) {
                isPassengerFlight = true;
            } else if (entry.cargoFlights > entry.passengerFlights) {
                isCargoFlight = true;
            }
        }
        if (isPassengerFlight && isCargoFlight) {
            if (cargoAirlinesNormalized.has(normalizedAirline) && !passengerAirlinesNormalized.has(normalizedAirline)) {
                isPassengerFlight = false;
            } else {
                isCargoFlight = false;
            }
        }
        const isGeneralFlight = !isPassengerFlight && !isCargoFlight;

        if (isPassengerFlight) {
            entry.passengerFlights += 1;
            totals.passengerFlights += 1;
            if (hasArrival) totals.passengerOps.arrivals += 1;
            if (hasDeparture) totals.passengerOps.departures += 1;
        }
        if (isCargoFlight) {
            entry.cargoFlights += 1;
            totals.cargoFlights += 1;
            if (hasArrival) totals.cargoOps.arrivals += 1;
            if (hasDeparture) totals.cargoOps.departures += 1;
        }
        if (isGeneralFlight) {
            entry.generalFlights += 1;
            totals.generalFlights += 1;
            if (hasArrival) totals.generalOps.arrivals += 1;
            if (hasDeparture) totals.generalOps.departures += 1;
        }

        const positionNormalized = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
        if (positionNormalized) {
            const positionCategory = classifyPositionStand(positionNormalized);
            const needsAttention = cobusAttentionPositions.has(positionNormalized);
            let posEntry = positionMap.get(positionNormalized);
            if (!posEntry) {
                posEntry = {
                    position: positionNormalized,
                    arrivals: 0,
                    departures: 0,
                    flights: [],
                    airlines: new Set(),
                    category: positionCategory,
                    attention: needsAttention
                };
                positionMap.set(positionNormalized, posEntry);
            }
            if (!posEntry.category) posEntry.category = positionCategory;
            if (needsAttention) posEntry.attention = true;
            if (hasArrival) posEntry.arrivals += 1;
            if (hasDeparture) posEntry.departures += 1;
            posEntry.flights.push(flight);
            posEntry.airlines.add(airlineName);
        }
    });

    const airlines = Array.from(summaryMap.entries()).map(([airline, data]) => {
        const passengerFlights = data.passengerFlights || 0;
        const cargoFlights = data.cargoFlights || 0;
        const generalFlights = data.generalFlights || 0;
        const normalized = normalizeAirlineName(airline);
        let type = 'passenger';
        if (generalFlights > 0 && generalFlights >= passengerFlights && generalFlights >= cargoFlights) {
            type = 'general';
        } else if (cargoFlights > passengerFlights) {
            type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights > 0) {
            type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights === 0 && generalFlights > 0) {
            type = 'general';
        } else if (cargoFlights === passengerFlights && cargoFlights !== 0) {
            if (cargoAirlinesNormalized.has(normalized) && !passengerAirlinesNormalized.has(normalized)) type = 'cargo';
        } else if (passengerFlights === 0 && cargoFlights === 0) {
            if (cargoAirlinesNormalized.has(normalized) && !passengerAirlinesNormalized.has(normalized)) type = 'cargo';
            else if (generalFlights > 0) type = 'general';
        }
        return {
            airline,
            arrivals: data.arrivals,
            departures: data.departures,
            total: data.flights.length,
            flights: data.flights,
            passengerFlights,
            cargoFlights,
            generalFlights,
            type
        };
    });

    if (!airlines.length) {
        container.innerHTML = '<div class="alert alert-info bg-transparent text-body">No se encontraron operaciones.</div>';
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const passengerAirlineCards = airlines.filter((item) => item.type === 'passenger');
    const cargoAirlineCards = airlines.filter((item) => item.type === 'cargo');
    const generalAirlineCards = airlines.filter((item) => item.type === 'general');

    const sortAirlineList = (list) => list.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.airline.localeCompare(b.airline, 'es', { sensitivity: 'base' });
    });
    sortAirlineList(passengerAirlineCards);
    sortAirlineList(cargoAirlineCards);
    sortAirlineList(generalAirlineCards);

    const airlineDataMap = new Map();
    airlines.forEach((item) => airlineDataMap.set(item.airline, item));

    const positions = Array.from(positionMap.entries()).map(([positionKey, data]) => {
        const airlinesList = Array.from(data.airlines || []).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        const category = data.category || classifyPositionStand(positionKey);
        return {
            position: data.position || positionKey,
            normalizedPosition: positionKey,
            arrivals: data.arrivals,
            departures: data.departures,
            total: data.flights.length,
            flights: data.flights,
            airlines: airlinesList,
            category,
            categoryLabel: getPositionCategoryLabel(category),
            attention: !!data.attention
        };
    }).filter((item) => item.total > 0).sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.position.localeCompare(b.position, undefined, { sensitivity: 'base' });
    });

    const maxPositionTotal = positions.reduce((max, item) => Math.max(max, item.total), 0);

    const getPositionIntensity = (value) => {
        if (!maxPositionTotal) return 'low';
        const ratio = value / maxPositionTotal;
        if (ratio >= 0.66) return 'high';
        if (ratio >= 0.33) return 'medium';
        return 'low';
    };

    const groupedPositions = positions.reduce((accumulator, item) => {
        const key = item.category || 'terminal';
        if (!accumulator[key]) accumulator[key] = [];
        accumulator[key].push(item);
        return accumulator;
    }, { cargo: [], semicontacto: [], remote: [], terminal: [] });

    const positionGroupTitles = {
        cargo: 'Posiciones de carga',
        semicontacto: 'Posiciones de semicontacto',
        remote: 'Posiciones remotas',
        terminal: 'Posiciones edificio terminal'
    };

    const renderPositionGroup = (category) => {
        const items = groupedPositions[category] || [];
        if (!items.length) return '';
        const label = positionGroupTitles[category] || getPositionCategoryLabel(category);
        const badgesHtml = items.map((p) => {
            const badgeIntensity = getPositionIntensity(p.total);
            const categoryLabel = p.categoryLabel || getPositionCategoryLabel(p.category);
            let airlineList = 'Sin aerolíneas';
            if (p.airlines.length) {
                const maxAirlines = 6;
                const preview = p.airlines.slice(0, maxAirlines);
                airlineList = preview.join(', ');
                if (p.airlines.length > maxAirlines) {
                    const remaining = p.airlines.length - maxAirlines;
                    airlineList += ` y ${remaining} más`;
                }
            }
            const tooltipParts = [
                `Categoría: ${categoryLabel}`,
                `Llegadas: ${formatNumber(p.arrivals)}`,
                `Salidas: ${formatNumber(p.departures)}`,
                `Aerolíneas: ${airlineList}`
            ];
            if (p.attention) tooltipParts.push('Atención: COBUS');
            const tooltip = tooltipParts.join(' · ');
            const tooltipEscaped = escapeHtml(tooltip);
            const attentionAttr = p.attention ? ' data-special="cobus"' : '';
            const attentionBadge = p.attention ? '<span class="summary-position-flag"><i class="fas fa-bus"></i> COBUS</span>' : '';
            return `<span class="summary-position-badge" role="button" tabindex="0" data-position="${escapeHtml(p.position)}" data-category="${escapeHtml(p.category)}" data-intensity="${escapeHtml(badgeIntensity)}"${attentionAttr} data-bs-toggle="tooltip" data-bs-title="${tooltipEscaped}" title="${tooltipEscaped}">${escapeHtml(p.position)} <strong>${formatNumber(p.total)}</strong>${attentionBadge}</span>`;
        }).join('');
        return `
        <div class="summary-position-group" data-category="${escapeHtml(category)}">
            <div class="summary-position-group-label">${escapeHtml(label)}</div>
            <div class="summary-position-group-row">
                ${badgesHtml}
            </div>
        </div>`;
    };

    const renderAirlineSection = (title, list, sectionType) => {
        if (!list.length) return '';
        const cardsMarkup = list.map((item) => {
            const logoCandidates = getAirlineLogoCandidates(item.airline) || [];
            const logoPath = logoCandidates[0] || '';
            const dataCands = logoCandidates.join('|');
            const sizeClass = getLogoSizeClass(item.airline, 'summary');
            const logoHtml = logoPath
                ? `<img class="airline-logo ${escapeHtml(sizeClass)}" src="${escapeHtml(logoPath)}" alt="Logo ${escapeHtml(item.airline)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
                : `<span class="summary-airline-fallback">${escapeHtml(item.airline.charAt(0) || '?')}</span>`;
            const accentColor = airlineColors[item.airline] || '#0d6efd';
            return `
            <div class="col-6 col-md-4 col-lg-3 col-xl-2 summary-airline-col" data-airline="${escapeHtml(item.airline)}" data-section="${escapeHtml(sectionType)}">
                <div class="card summary-airline-card h-100" role="button" tabindex="0" data-airline="${escapeHtml(item.airline)}" data-section="${escapeHtml(sectionType)}" aria-label="${escapeHtml(item.airline)}: ${formatNumber(item.total)} vuelos" style="--summary-airline-color:${accentColor};">
                    <div class="summary-airline-card-body card-body">
                        <div class="summary-airline-logo">${logoHtml}</div>
                        <div class="summary-airline-total">${formatNumber(item.total)}</div>
                        <div class="summary-airline-total-label">Vuelos</div>
                        <span class="visually-hidden">${escapeHtml(item.airline)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        return `
        <div class="summary-airline-section" data-section="${escapeHtml(sectionType)}">
            <div class="summary-section-label">${title}</div>
            <div class="row g-3 summary-airline-grid">
                ${cardsMarkup}
            </div>
        </div>`;
    };

    const totalFlights = totals.flights;
    const totalOperations = totals.arrivals + totals.departures;
    const passengerOperations = totals.passengerOps.arrivals + totals.passengerOps.departures;
    const cargoOperations = totals.cargoOps.arrivals + totals.cargoOps.departures;
    const generalOperations = totals.generalOps.arrivals + totals.generalOps.departures;
    const cardTitle = hasSpecificAirline
        ? `Operaciones de ${selectedAirlineEscaped}`
        : 'Operaciones del día';
    const summarySubtitle = hasSpecificAirline
        ? `Incluye ${formatNumber(totals.arrivals)} llegadas y ${formatNumber(totals.departures)} salidas (${formatNumber(totalFlights)} vuelos de ${selectedAirlineEscaped}).`
        : `Incluye ${formatNumber(totals.arrivals)} llegadas y ${formatNumber(totals.departures)} salidas (${formatNumber(totalFlights)} vuelos listados).`;
    let html = `
    <div class="card summary-total-card mb-3">
        <div class="card-body d-flex flex-wrap align-items-center gap-3">
            <div class="summary-total-icon"><i class="fas fa-chart-line"></i></div>
            <div>
                <div class="summary-total-title">${cardTitle}</div>
                <div class="summary-total-sub">${summarySubtitle}</div>
            </div>
            <div class="summary-total-stats ms-auto d-flex flex-wrap gap-2">
                <span class="summary-pill summary-pill-total" title="Llegadas + salidas"><i class="fas fa-plane"></i>Operaciones ${formatNumber(totalOperations)}</span>
                <span class="summary-pill summary-pill-passenger" title="Llegadas + salidas de vuelos de pasajeros"><i class="fas fa-users"></i>Pasajeros ${formatNumber(passengerOperations)}</span>
                <span class="summary-pill summary-pill-cargo" title="Llegadas + salidas de vuelos de carga"><i class="fas fa-box-open"></i>Carga ${formatNumber(cargoOperations)}</span>
                ${generalOperations > 0 ? `<span class="summary-pill summary-pill-general" title="Llegadas + salidas de aviación general"><i class="fas fa-paper-plane"></i>General ${formatNumber(generalOperations)}</span>` : ''}
            </div>
        </div>
    </div>`;

    if (positions.length) {
        html += `
        <div class="card summary-positions-card mb-3">
            <div class="card-body">
                <div class="summary-positions-header d-flex align-items-start gap-2 mb-2">
                    <div class="summary-positions-icon"><i class="fas fa-map-marked-alt"></i></div>
                    <div>
                        <div class="summary-positions-title">Posiciones activas</div>
                        <div class="summary-positions-sub">Vuelos programados por stand</div>
                    </div>
                </div>
                <div class="summary-position-groups">
                    ${renderPositionGroup('terminal')}
                    ${renderPositionGroup('semicontacto')}
                    ${renderPositionGroup('cargo')}
                    ${renderPositionGroup('remote')}
                </div>
            </div>
        </div>`;
    }
    html += `
    <div class="summary-selection-controls d-flex justify-content-end align-items-center mb-3">
        <button type="button" class="btn btn-sm btn-outline-secondary summary-reset-btn d-none" id="summary-selection-reset">
            <i class="fas fa-arrow-left"></i>Regresar
        </button>
    </div>`;

    html += '<div class="summary-airline-sections">';
    html += renderAirlineSection('Pasajeros', passengerAirlineCards, 'passenger');
    html += renderAirlineSection('Carga', cargoAirlineCards, 'cargo');
    html += renderAirlineSection('General', generalAirlineCards, 'general');
    html += '</div>';
    html += '<div id="summary-airline-detail" class="mt-4"></div>';

    container.innerHTML = html;

    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipEls = container.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipEls.forEach((el) => {
            try { new bootstrap.Tooltip(el); } catch (_) {}
        });
    }

    const detailEl = container.querySelector('#summary-airline-detail');
    if (!detailEl) {
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        return;
    }

    const renderEmptyDetail = (message) => {
        const text = message || 'Selecciona una aerolínea o posición para ver el detalle.';
        detailEl.innerHTML = `<div class="alert alert-info">${escapeHtml(text)}</div>`;
    };

    const cards = Array.from(container.querySelectorAll('.summary-airline-card'));
    const positionBadges = Array.from(container.querySelectorAll('.summary-position-badge'));
    const positionDataMap = new Map();
    positions.forEach((item) => positionDataMap.set(item.position, item));
    const positionsCard = container.querySelector('.summary-positions-card');
    const positionGroups = positionsCard ? Array.from(positionsCard.querySelectorAll('.summary-position-group')) : [];
    const summarySections = Array.from(container.querySelectorAll('.summary-airline-section'));
    const cardWrappers = cards.map((card) => card?.closest('.summary-airline-col') || null);
    const resetBtn = container.querySelector('#summary-selection-reset');

    const timeToMinutes = (value) => {
        const match = /^\s*(\d{1,2})\s*:\s*(\d{2})/.exec(String(value || ''));
        if (!match) return Number.MAX_SAFE_INTEGER;
        const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
        const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
        return hours * 60 + minutes;
    };

    const buildFlightRows = (flightList) => {
        if (!Array.isArray(flightList) || flightList.length === 0) return '';
        const sortedFlights = [...flightList].sort((a, b) => {
            const aTime = Math.min(timeToMinutes(a?.hora_llegada), timeToMinutes(a?.hora_salida));
            const bTime = Math.min(timeToMinutes(b?.hora_llegada), timeToMinutes(b?.hora_salida));
            if (aTime !== bTime) return aTime - bTime;
            return String(a?.vuelo_llegada || a?.vuelo_salida || '').localeCompare(String(b?.vuelo_llegada || b?.vuelo_salida || ''), undefined, { sensitivity: 'base' });
        });
        return sortedFlights.map((flight, idx) => {
            const cell = (field) => {
                const value = field === undefined || field === null || String(field).trim() === '' ? '-' : field;
                return escapeHtml(String(value));
            };
            const airlineName = (flight && flight.aerolinea) ? String(flight.aerolinea) : 'Sin aerolínea';
            const rowLogoCandidates = getAirlineLogoCandidates(airlineName) || [];
            const rowLogoPath = rowLogoCandidates[0] || '';
            const rowDataCands = rowLogoCandidates.join('|');
            const rowSizeClass = getLogoSizeClass(airlineName, 'table');
            const rowLogoHtml = rowLogoPath
                ? `<img class="airline-logo ${escapeHtml(rowSizeClass)}" src="${escapeHtml(rowLogoPath)}" alt="Logo ${escapeHtml(airlineName)}" data-cands="${escapeHtml(rowDataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
                : '';
            const rowColor = airlineColors[airlineName] || '#ccc';
            const delay = (idx * 0.06).toFixed(2);
            const positionDisplay = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
            const positionCell = positionDisplay ? escapeHtml(positionDisplay) : '-';
            return `<tr class="animated-row" style="--delay:${delay}s; --airline-color:${rowColor};"><td><div class="airline-cell">${rowLogoHtml}<span class="airline-name">${escapeHtml(airlineName)}</span></div></td><td>${cell(flight?.aeronave)}</td><td>${cell(flight?.vuelo_llegada)}</td><td>${cell(flight?.fecha_llegada)}</td><td>${cell(flight?.hora_llegada)}</td><td class="col-origen">${cell(flight?.origen)}</td><td class="text-center">${cell(flight?.banda_reclamo)}</td><td>${positionCell}</td><td>${cell(flight?.vuelo_salida)}</td><td>${cell(flight?.fecha_salida)}</td><td>${cell(flight?.hora_salida)}</td><td class="col-destino">${cell(flight?.destino)}</td></tr>`;
        }).join('');
    };

    const setActiveCard = (airlineName) => {
        cards.forEach((card) => {
            const isActive = !!airlineName && card.dataset.airline === airlineName;
            card.classList.toggle('active', isActive);
            card.classList.toggle('border-primary', isActive);
            card.classList.toggle('shadow-sm', isActive);
        });
    };

    const setActivePosition = (position) => {
        positionBadges.forEach((badge) => {
            const isActive = !!position && badge.dataset.position === position;
            badge.classList.toggle('active', isActive);
        });
    };

    const refreshPositionGroupVisibility = () => {
        if (!positionGroups || !positionGroups.length) return;
        positionGroups.forEach((group) => {
            const hasVisibleBadge = Array.from(group.querySelectorAll('.summary-position-badge')).some((badge) => !badge.classList.contains('d-none'));
            group.classList.toggle('d-none', !hasVisibleBadge);
        });
    };

    const renderAirlineDetail = (item) => {
        if (!item) {
            renderEmptyDetail('Selecciona una aerolínea para ver el detalle.');
            return;
        }

        const flights = Array.isArray(item.flights) ? item.flights : [];
        const totalFlights = Number(item.total || flights.length || 0);
        const arrivals = Number(item.arrivals || 0);
        const departures = Number(item.departures || 0);
        const passengerFlights = Number(item.passengerFlights || 0);
        const cargoFlights = Number(item.cargoFlights || 0);
        const generalFlights = Number(item.generalFlights || 0);

        const logoCandidates = getAirlineLogoCandidates(item.airline) || [];
        const logoPath = logoCandidates[0] || '';
        const dataCands = logoCandidates.join('|');
        const sizeClass = getLogoSizeClass(item.airline, 'summary');
        const detailLogo = logoPath
            ? `<img class="airline-logo ${escapeHtml(sizeClass)}" src="${escapeHtml(logoPath)}" alt="Logo ${escapeHtml(item.airline)}" data-cands="${escapeHtml(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : `<span class="summary-airline-fallback">${escapeHtml(item.airline.charAt(0) || '?')}</span>`;
        const accentColor = airlineColors[item.airline] || '#0d6efd';

        const breakdownChips = [
            { label: 'Pasajeros', value: passengerFlights, icon: 'fas fa-users text-primary' },
            { label: 'Carga', value: cargoFlights, icon: 'fas fa-box-open text-warning' },
            { label: 'General', value: generalFlights, icon: 'fas fa-paper-plane text-info' }
        ].filter((chip) => chip.value > 0).map((chip) => `
            <span class="badge bg-light border text-body d-inline-flex align-items-center gap-1">
                <i class="${chip.icon}"></i>${escapeHtml(chip.label)} <strong>${formatNumber(chip.value)}</strong>
            </span>
        `).join('');

        detailEl.innerHTML = `
        <div class="card summary-detail-card" style="--summary-airline-color:${accentColor};">
            <div class="summary-detail-hero d-flex flex-wrap align-items-center gap-3">
                <div class="summary-detail-logo">${detailLogo}</div>
                <div>
                    <div class="summary-detail-title">${escapeHtml(item.airline)}</div>
                    <div class="summary-detail-sub">${formatNumber(totalFlights)} vuelos listados · ${formatNumber(arrivals)} llegadas · ${formatNumber(departures)} salidas</div>
                </div>
            </div>
            <div class="card-body">
                <div class="summary-detail-actions d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div class="small text-muted d-flex align-items-center gap-2">
                        <i class="fas fa-table"></i>
                        <span>Las tablas interactivas ya están filtradas con esta aerolínea.</span>
                    </div>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <button type="button" class="btn btn-sm btn-primary" data-action="summary-go-tables"><i class="fas fa-arrow-down-short-wide me-1"></i>Ir a tablas</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-action="summary-reset-airline"><i class="fas fa-undo me-1"></i>Ver todas</button>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-12 col-md-4">
                        <div class="p-3 border rounded-3 bg-light-subtle h-100">
                            <div class="text-muted text-uppercase small fw-semibold mb-1"><i class="fas fa-plane me-1"></i>Vuelos</div>
                            <div class="h4 mb-0">${formatNumber(totalFlights)}</div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="p-3 border rounded-3 bg-light-subtle h-100">
                            <div class="text-muted text-uppercase small fw-semibold mb-1"><i class="fas fa-plane-arrival me-1"></i>Llegadas</div>
                            <div class="h4 mb-0">${formatNumber(arrivals)}</div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="p-3 border rounded-3 bg-light-subtle h-100">
                            <div class="text-muted text-uppercase small fw-semibold mb-1"><i class="fas fa-plane-departure me-1"></i>Salidas</div>
                            <div class="h4 mb-0">${formatNumber(departures)}</div>
                        </div>
                    </div>
                </div>
                ${breakdownChips ? `<div class="d-flex flex-wrap align-items-center gap-2 mt-3">${breakdownChips}</div>` : ''}
            </div>
        </div>`;

        const scrollBtn = detailEl.querySelector('[data-action="summary-go-tables"]');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', () => {
                const passengerEl = document.getElementById('passenger-itinerary-container');
                if (passengerEl) passengerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        const resetSelectionBtn = detailEl.querySelector('[data-action="summary-reset-airline"]');
        if (resetSelectionBtn) {
            resetSelectionBtn.addEventListener('click', () => {
                summarySelectionLocked = false;
                summaryDetailMode = 'airline';
                summarySelectedAirline = null;
                summarySelectedPosition = null;
                const select = document.getElementById('airline-filter');
                if (select) {
                    select.value = 'all';
                }
                applyFilters();
            });
        }
    };

    const renderPositionDetail = (item) => {
        if (!item) {
            renderEmptyDetail('Selecciona una posición para ver el detalle.');
            return;
        }
        const rows = buildFlightRows(item.flights);
        const accentColor = (() => {
            if (!item.flights || !item.flights.length) return '#0d6efd';
            const firstAirline = item.flights.find((flight) => airlineColors[flight?.aerolinea]);
            return firstAirline ? airlineColors[firstAirline.aerolinea] : '#0d6efd';
        })();
        const categoryLabel = escapeHtml(item.categoryLabel || getPositionCategoryLabel(item.category));
        const attentionBadge = item.attention ? '<span class="summary-detail-flag"><i class="fas fa-bus"></i> Cobus</span>' : '';
        detailEl.innerHTML = `
        <div class="card summary-detail-card" style="--summary-airline-color:${accentColor};">
            <div class="summary-detail-hero d-flex flex-wrap align-items-center gap-3">
                <div class="summary-detail-logo position-logo"><i class="fas fa-map-marker-alt"></i></div>
                <div>
                    <div class="summary-detail-title">Posición ${escapeHtml(item.position)}</div>
                    <div class="summary-detail-sub">Vuelos programados: ${formatNumber(item.total)} · ${categoryLabel}</div>
                    ${attentionBadge}
                </div>
            </div>
            <div class="card-body">
                <div class="summary-detail-actions d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                    <div class="small text-muted">Incluye vuelos filtrados en la vista actual.</div>
                    <button type="button" class="btn btn-sm btn-outline-primary summary-detail-filter-position"><i class="fas fa-sliders-h me-1"></i>Filtrar por posición</button>
                </div>
                <div class="summary-detail-table table-container-tech">
                    <div class="table-responsive vertical-scroll">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th>Aerolínea</th>
                                    <th>Aeronave</th>
                                    <th>Vuelo Lleg.</th>
                                    <th>Fecha Lleg.</th>
                                    <th>Hora Lleg.</th>
                                    <th class="col-origen">Origen</th>
                                    <th>Banda</th>
                                    <th>Posición</th>
                                    <th>Vuelo Sal.</th>
                                    <th>Fecha Sal.</th>
                                    <th>Hora Sal.</th>
                                    <th class="col-destino">Destino</th>
                                </tr>
                            </thead>
                            <tbody>${rows || '<tr><td colspan="12" class="text-center text-muted">Sin vuelos programados para esta posición.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
        const filterBtn = detailEl.querySelector('.summary-detail-filter-position');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                const select = document.getElementById('position-filter');
                if (!select) return;
                const existingOption = Array.from(select.options).find((opt) => opt.value === item.position);
                if (!existingOption) {
                    const option = new Option(item.position, item.position, true, true);
                    select.add(option);
                }
                select.value = item.position;
                summaryDetailMode = 'position';
                summarySelectedPosition = item.position;
                summarySelectedAirline = null;
                applyFilters();
            });
        }
    };

    const getSelectedCardSection = () => {
        const card = cards.find((entry) => entry?.dataset?.airline === summarySelectedAirline);
        return card?.dataset?.section || null;
    };

    const updateResetButton = (hasSelection, isAirline) => {
        if (!resetBtn) return;
        if (!hasSelection) {
            resetBtn.classList.add('d-none');
            return;
        }
        const label = isAirline ? 'Regresar a todas las aerolíneas' : 'Regresar a todas las posiciones';
        resetBtn.innerHTML = `<i class="fas fa-arrow-left"></i>${label}`;
        resetBtn.classList.remove('d-none');
    };

    const updateSelectionLayout = () => {
        const hasAirlineSelection = summaryDetailMode === 'airline' && !!summarySelectedAirline && airlineDataMap.has(summarySelectedAirline);
        const hasPositionSelection = summaryDetailMode === 'position' && !!summarySelectedPosition && positionDataMap.has(summarySelectedPosition);
        const hasLockedSelection = summarySelectionLocked && (hasAirlineSelection || hasPositionSelection);

        updateResetButton(hasLockedSelection, hasAirlineSelection);

        cardWrappers.forEach((wrapper) => {
            if (!wrapper) return;
            wrapper.classList.remove('d-none');
        });
        summarySections.forEach((section) => section.classList.remove('d-none'));
        positionBadges.forEach((badge) => badge.classList.remove('d-none'));
        if (positionsCard) {
            positionsCard.classList.remove('d-none');
            positionsCard.classList.remove('compact');
        }
        positionGroups.forEach((group) => group.classList.remove('d-none'));
        refreshPositionGroupVisibility();

        if (!hasLockedSelection) return;

        if (hasAirlineSelection) {
            const selectedSection = getSelectedCardSection();
            cardWrappers.forEach((wrapper) => {
                if (!wrapper) return;
                const matches = wrapper.dataset.airline === summarySelectedAirline;
                wrapper.classList.toggle('d-none', !matches);
            });
            summarySections.forEach((section) => {
                if (!section) return;
                const matches = section.dataset.section === selectedSection;
                section.classList.toggle('d-none', !matches);
            });
            if (positionsCard) positionsCard.classList.add('d-none');
            refreshPositionGroupVisibility();
            return;
        }

        if (hasPositionSelection && positionsCard) {
            summarySections.forEach((section) => section.classList.add('d-none'));
            cardWrappers.forEach((wrapper) => {
                if (!wrapper) return;
                wrapper.classList.add('d-none');
            });
            const badges = Array.from(positionsCard.querySelectorAll('.summary-position-badge'));
            badges.forEach((badge) => {
                const matches = badge.dataset.position === summarySelectedPosition;
                badge.classList.toggle('d-none', !matches);
            });
            positionsCard.classList.remove('d-none');
            positionsCard.classList.add('compact');
            refreshPositionGroupVisibility();
        }
    };

    const ensureDetailVisible = () => {
        const hasAirlineSelection = summarySelectedAirline && airlineDataMap.has(summarySelectedAirline);
        const hasPositionSelection = summarySelectedPosition && positionDataMap.has(summarySelectedPosition);

        if (summarySelectionLocked && summaryDetailMode === 'airline' && hasAirlineSelection) {
            setActiveCard(summarySelectedAirline);
            setActivePosition(null);
            renderAirlineDetail(airlineDataMap.get(summarySelectedAirline));
            return;
        }

        if (summarySelectionLocked && summaryDetailMode === 'position' && hasPositionSelection) {
            setActiveCard(null);
            setActivePosition(summarySelectedPosition);
            renderPositionDetail(positionDataMap.get(summarySelectedPosition));
            return;
        }

        if (summarySelectionLocked) {
            summarySelectionLocked = false;
        }
        summaryDetailMode = 'airline';
        summarySelectedAirline = null;
        summarySelectedPosition = null;
        setActiveCard(null);
        setActivePosition(null);
        renderEmptyDetail();
    };

    cards.forEach((card) => {
        const airlineName = card.dataset.airline;
        if (!airlineName) return;
        const toggleDetail = () => {
            if (!airlineDataMap.has(airlineName)) return;
            const isActive = summarySelectionLocked && summaryDetailMode === 'airline' && summarySelectedAirline === airlineName;
            if (isActive) {
                summarySelectionLocked = false;
                summarySelectedAirline = null;
                summarySelectedPosition = null;
                const select = document.getElementById('airline-filter');
                if (select && select.value !== 'all') {
                    select.value = 'all';
                    applyFilters();
                    return;
                }
                ensureDetailVisible();
                updateSelectionLayout();
                return;
            }
            summaryDetailMode = 'airline';
            summarySelectedAirline = airlineName;
            summarySelectedPosition = null;
            summarySelectionLocked = true;
            viewFlightsForAirline(airlineName);
        };
        card.addEventListener('click', toggleDetail);
        card.addEventListener('keypress', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                toggleDetail();
            }
        });
    });

    positionBadges.forEach((badge) => {
        const positionKey = badge.dataset.position;
        if (!positionKey) return;
        const showPositionDetail = () => {
            const data = positionDataMap.get(positionKey);
            if (!data) return;
            summaryDetailMode = 'position';
            summarySelectedPosition = positionKey;
            summarySelectedAirline = null;
            summarySelectionLocked = true;
            setActiveCard(null);
            setActivePosition(positionKey);
            renderPositionDetail(data);
            updateSelectionLayout();
        };
        badge.addEventListener('click', (ev) => {
            ev.preventDefault();
            showPositionDetail();
        });
        badge.addEventListener('keypress', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                showPositionDetail();
            }
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            summarySelectionLocked = false;
            summaryDetailMode = 'airline';
            summarySelectedAirline = null;
            summarySelectedPosition = null;
            const select = document.getElementById('airline-filter');
            if (select && select.value !== 'all') {
                select.value = 'all';
                applyFilters();
                return;
            }
            setActiveCard(null);
            setActivePosition(null);
            renderEmptyDetail();
            updateSelectionLayout();
        });
    }

    ensureDetailVisible();
    updateSelectionLayout();
}

const dynamicTableHeaderRegistry = new Map();

function cleanupDynamicTableHeader(key) {
    if (!key) return;
    const state = dynamicTableHeaderRegistry.get(key);
    if (!state) return;
    try { state.cleanup(); } catch (_) { /* ignore cleanup errors */ }
    dynamicTableHeaderRegistry.delete(key);
}

function setupDynamicTableHeader(table, key) {
    if (!key) return;
    cleanupDynamicTableHeader(key);
    if (!table || !table.tHead) return;
    const state = createFloatingTableHeader(table, key);
    if (state) {
        dynamicTableHeaderRegistry.set(key, state);
    }
}

function getDynamicTableHeaderOffset() {
    let offset = 0;
    try {
        const rootStyles = getComputedStyle(document.documentElement);
        const cssVar = parseFloat(rootStyles.getPropertyValue('--dynamic-table-header-offset'));
        if (!Number.isNaN(cssVar)) {
            offset = cssVar;
        }
    } catch (_) { /* ignore */ }
    const headerEl = document.querySelector('.header');
    if (headerEl) {
        const headerStyles = getComputedStyle(headerEl);
        if (headerStyles.position === 'fixed' || headerStyles.position === 'sticky') {
            const headerRect = headerEl.getBoundingClientRect();
            if (headerRect.height > 0) {
                offset = Math.max(offset, headerRect.height);
            }
        }
    }
    return offset;
}

function createFloatingTableHeader(table, contextKey) {
    const scrollHost = table.closest('.h-scroll-area') || table.closest('.table-responsive') || table.parentElement;
    const overlay = document.createElement('div');
    overlay.className = 'floating-table-header';
    overlay.setAttribute('aria-hidden', 'true');
    if (contextKey) {
        overlay.dataset.headerContext = contextKey;
        overlay.classList.add(`floating-table-header--${contextKey}`);
    }

    const overlayTable = document.createElement('table');
    const tableClass = table.className ? `${table.className} floating-header-table`.trim() : 'floating-header-table';
    overlayTable.className = tableClass;
    overlayTable.appendChild(table.tHead.cloneNode(true));
    overlay.appendChild(overlayTable);
    overlayTable.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

    try {
        const computed = getComputedStyle(table);
        overlayTable.style.borderCollapse = computed.borderCollapse;
        overlayTable.style.borderSpacing = computed.borderSpacing;
        overlayTable.style.margin = '0';
    } catch (_) { /* ignore */ }

    overlay.style.left = '0px';
    overlay.style.top = '0px';
    overlay.style.width = '0px';
    overlayTable.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    const state = {
        table,
        overlay,
        overlayTable,
        scrollHost,
        headerHeight: 0,
        destroyed: false
    };

    let syncScheduled = false;

    const syncWidths = () => {
        if (state.destroyed) return;
        const head = table.tHead;
        const cloneHead = overlayTable.tHead;
        if (!head || !cloneHead) return;
        const sourceCells = Array.from(head.querySelectorAll('th'));
        const cloneCells = Array.from(cloneHead.querySelectorAll('th'));
        if (!sourceCells.length || sourceCells.length !== cloneCells.length) return;
        sourceCells.forEach((cell, index) => {
            const width = cell.getBoundingClientRect().width;
            cloneCells[index].style.width = `${width}px`;
            cloneCells[index].style.minWidth = `${width}px`;
            cloneCells[index].style.maxWidth = `${width}px`;
        });
        const tableRect = table.getBoundingClientRect();
        if (tableRect.width > 0) {
            overlayTable.style.width = `${tableRect.width}px`;
        }
        const headRect = head.getBoundingClientRect();
        state.headerHeight = headRect.height || overlayTable.getBoundingClientRect().height || 0;
    };

    const updatePosition = () => {
        if (state.destroyed) return;
        const rect = table.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            overlay.classList.remove('is-visible');
            return;
        }
        const offset = getDynamicTableHeaderOffset();
        const headerHeight = state.headerHeight || (table.tHead ? table.tHead.getBoundingClientRect().height : 0);
        const shouldShow = rect.top < offset && (rect.bottom - headerHeight) > offset;
        if (!shouldShow) {
            overlay.classList.remove('is-visible');
            return;
        }
        overlay.classList.add('is-visible');
        overlay.style.top = `${offset}px`;
        overlay.style.left = `${Math.round(rect.left)}px`;
        overlay.style.width = `${Math.round(rect.width)}px`;
    };

    const scheduleSync = () => {
        if (syncScheduled) return;
        syncScheduled = true;
        requestAnimationFrame(() => {
            syncScheduled = false;
            syncWidths();
            updatePosition();
        });
    };

    const handleWindowScroll = () => updatePosition();
    const handleWindowResize = () => scheduleSync();
    const handleHostScroll = () => updatePosition();

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('resize', handleWindowResize);
    if (scrollHost) {
        scrollHost.addEventListener('scroll', handleHostScroll, { passive: true });
    }

    let resizeObserver = null;
    if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(scheduleSync);
        resizeObserver.observe(table);
        if (table.parentElement) resizeObserver.observe(table.parentElement);
    }

    scheduleSync();

    state.cleanup = () => {
        if (state.destroyed) return;
        state.destroyed = true;
        window.removeEventListener('scroll', handleWindowScroll);
        window.removeEventListener('resize', handleWindowResize);
        if (scrollHost) scrollHost.removeEventListener('scroll', handleHostScroll);
        if (resizeObserver) resizeObserver.disconnect();
        overlay.remove();
    };

    state.update = updatePosition;
    state.sync = scheduleSync;

    return state;
}

function displayPassengerTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('passenger-itinerary-container');
    if (!container) return;
    cleanupDynamicTableHeader('passenger-itinerary');
    const flightsList = Array.isArray(flights) ? flights : [];
    const formatter = new Intl.NumberFormat('es-MX');
    const fmt = (value) => formatter.format(Math.max(0, Number(value || 0)));
    const arrivals = flightsList.reduce((total, flight) => total + (String(flight?.vuelo_llegada || flight?.hora_llegada || '').trim() ? 1 : 0), 0);
    const departures = flightsList.reduce((total, flight) => total + (String(flight?.vuelo_salida || flight?.hora_salida || '').trim() ? 1 : 0), 0);
    const operations = arrivals + departures;
    const uniqueAirlines = new Set(flightsList.map(f => (f?.aerolinea || '').toString().trim()).filter(Boolean));
    const hasFlights = flightsList.length > 0;
    const accentColor = '#0d6efd';
    const accentBg = hexToRgba(accentColor, 0.12);
    const accentBorder = hexToRgba(accentColor, 0.28);
    const accentShadow = hexToRgba(accentColor, 0.22);
    const subtitle = hasFlights
        ? `Incluye ${fmt(arrivals)} llegadas y ${fmt(departures)} salidas · ${fmt(flightsList.length)} vuelos listados`
        : 'No se encontraron vuelos de pasajeros con los filtros actuales.';
    const overviewText = hasFlights
        ? `Vista general · ${fmt(uniqueAirlines.size)} aerolíneas`
        : 'Sin vuelos para mostrar con los filtros actuales.';

    const formatCell = (value) => {
        const raw = value == null ? '' : String(value).trim();
        return raw ? escapeHTML(raw) : '-';
    };

    const rowsHtml = flightsList.map((flight, index) => {
        const airlineNameRaw = (flight?.aerolinea || '').toString().trim();
        const displayAirline = airlineNameRaw || 'Sin aerolínea';
        const positionDisplay = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
        const airlineAccent = airlineColors[displayAirline] || '#0d6efd';
        const rowColor = escapeHTML(airlineAccent);
        const rowHover = escapeHTML(hexToRgba(airlineAccent, 0.12));
        const rowHoverDark = escapeHTML(hexToRgba(airlineAccent, 0.24));
        const candidates = getAirlineLogoCandidates(displayAirline) || [];
        const logoPath = candidates[0];
        const dataCands = candidates.join('|');
        const sizeClass = escapeHTML(getLogoSizeClass(displayAirline, 'table'));
        const logoHtml = logoPath
            ? `<img class="airline-logo ${sizeClass}" src="${escapeHTML(logoPath)}" alt="Logo ${escapeHTML(displayAirline)}" data-cands="${escapeHTML(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : '';
        const delay = (index * 0.05).toFixed(2);
        return `<tr class="animated-row" style="--delay:${delay}s; --airline-color:${rowColor}; --airline-row-hover:${rowHover}; --airline-row-hover-dark:${rowHoverDark};">
            <td><div class="airline-cell${logoHtml ? ' has-logo' : ''}">${logoHtml}<span class="airline-dot" style="background:${rowColor};"></span><span class="airline-name">${escapeHTML(displayAirline)}</span></div></td>
            <td>${formatCell(flight?.aeronave)}</td>
            <td>${formatCell(flight?.vuelo_llegada)}</td>
            <td>${formatCell(flight?.fecha_llegada)}</td>
            <td>${formatCell(flight?.hora_llegada)}</td>
            <td class="col-origen">${formatCell(flight?.origen)}</td>
            <td class="text-center">${formatCell(flight?.banda_reclamo)}</td>
            <td>${positionDisplay ? escapeHTML(positionDisplay) : '-'}</td>
            <td>${formatCell(flight?.vuelo_salida)}</td>
            <td>${formatCell(flight?.fecha_salida)}</td>
            <td>${formatCell(flight?.hora_salida)}</td>
            <td class="col-destino">${formatCell(flight?.destino)}</td>
        </tr>`;
    }).join('');

    const rows = rowsHtml || '<tr><td colspan="12" class="text-center text-muted py-4">No se encontraron vuelos de pasajeros.</td></tr>';

    container.innerHTML = `
        <div class="card itinerary-airline-card itinerary-general-card itinerary-general-card--pax" style="--itinerary-airline-accent:${accentColor}; --itinerary-airline-accent-bg:${accentBg}; --itinerary-airline-accent-border:${accentBorder}; --itinerary-airline-accent-shadow:${accentShadow};">
            <div class="card-body">
                <div class="itinerary-airline-card-head">
                    <div>
                        <div class="itinerary-airline-title">Itinerario de Pasajeros</div>
                        <div class="itinerary-airline-sub">${subtitle}</div>
                    </div>
                    <div class="itinerary-airline-pills">
                        <span class="itinerary-pill"><i class="fas fa-plane"></i>${fmt(operations)} operaciones</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-arrival"></i>${fmt(arrivals)} llegadas</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-departure"></i>${fmt(departures)} salidas</span>
                    </div>
                </div>
                <div class="itinerary-airline-toolbar-detail">
                    <div class="text-muted small d-flex align-items-center gap-2">
                        <i class="fas fa-users"></i>
                        <span>${overviewText}</span>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button id="export-pax-full" class="btn btn-sm btn-outline-primary" title="Descargar CSV (toda la tabla)"><i class="fas fa-file-csv me-1"></i>CSV</button>
                    </div>
                </div>
                <div class="table-responsive itinerary-airline-table">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Aerolínea</th>
                                <th>Aeronave</th>
                                <th>Vuelo Lleg.</th>
                                <th>Fecha Lleg.</th>
                                <th>Hora Lleg.</th>
                                <th class="col-origen">Origen</th>
                                <th>Banda</th>
                                <th>Posición</th>
                                <th>Vuelo Sal.</th>
                                <th>Fecha Sal.</th>
                                <th>Hora Sal.</th>
                                <th class="col-destino">Destino</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const tableEl = container.querySelector('table');
    if (tableEl) {
        setupDynamicTableHeader(tableEl, 'passenger-itinerary');
    }
    wireItineraryExports();
    console.log(`[perf] pasajeros tabla: ${(performance.now()-t0).toFixed(1)}ms, filas=${flightsList.length}`);
}
function displayCargoTable(flights) {
    const t0 = performance.now();
    const container = document.getElementById('cargo-itinerary-container');
    if (!container) return;
    cleanupDynamicTableHeader('cargo-itinerary');
    const flightsList = Array.isArray(flights) ? flights : [];
    const formatter = new Intl.NumberFormat('es-MX');
    const fmt = (value) => formatter.format(Math.max(0, Number(value || 0)));
    const arrivals = flightsList.reduce((total, flight) => total + (String(flight?.vuelo_llegada || flight?.hora_llegada || '').trim() ? 1 : 0), 0);
    const departures = flightsList.reduce((total, flight) => total + (String(flight?.vuelo_salida || flight?.hora_salida || '').trim() ? 1 : 0), 0);
    const operations = arrivals + departures;
    const uniqueAirlines = new Set(flightsList.map(f => (f?.aerolinea || '').toString().trim()).filter(Boolean));
    const hasFlights = flightsList.length > 0;
    const accentColor = '#f97316';
    const accentBg = hexToRgba(accentColor, 0.14);
    const accentBorder = hexToRgba(accentColor, 0.32);
    const accentShadow = hexToRgba(accentColor, 0.22);
    const subtitle = hasFlights
        ? `Incluye ${fmt(arrivals)} llegadas y ${fmt(departures)} salidas · ${fmt(flightsList.length)} vuelos listados`
        : 'No se encontraron vuelos de carga con los filtros actuales.';
    const overviewText = hasFlights
        ? `Vista general · ${fmt(uniqueAirlines.size)} aerolíneas`
        : 'Sin vuelos para mostrar con los filtros actuales.';

    const formatCell = (value) => {
        const raw = value == null ? '' : String(value).trim();
        return raw ? escapeHTML(raw) : '-';
    };

    const rowsHtml = flightsList.map((flight, index) => {
        const airlineNameRaw = (flight?.aerolinea || '').toString().trim();
        const displayAirline = airlineNameRaw || 'Sin aerolínea';
        const positionDisplay = normalizePositionValue(flight?.posicion || flight?.posición || flight?.stand || '');
        const airlineAccent = airlineColors[displayAirline] || '#f97316';
        const rowColor = escapeHTML(airlineAccent);
        const rowHover = escapeHTML(hexToRgba(airlineAccent, 0.14));
        const rowHoverDark = escapeHTML(hexToRgba(airlineAccent, 0.26));
        const candidates = getAirlineLogoCandidates(displayAirline) || [];
        const logoPath = candidates[0];
        const dataCands = candidates.join('|');
        const sizeClass = escapeHTML(getLogoSizeClass(displayAirline, 'table'));
        const logoHtml = logoPath
            ? `<img class="airline-logo ${sizeClass}" src="${escapeHTML(logoPath)}" alt="Logo ${escapeHTML(displayAirline)}" data-cands="${escapeHTML(dataCands)}" data-cand-idx="0" onerror="handleLogoError(this)" onload="logoLoaded(this)">`
            : '';
        const delay = (index * 0.05).toFixed(2);
        return `<tr class="animated-row" style="--delay:${delay}s; --airline-color:${rowColor}; --airline-row-hover:${rowHover}; --airline-row-hover-dark:${rowHoverDark};">
            <td><div class="airline-cell${logoHtml ? ' has-logo' : ''}">${logoHtml}<span class="airline-dot" style="background:${rowColor};"></span><span class="airline-name">${escapeHTML(displayAirline)}</span></div></td>
            <td>${formatCell(flight?.aeronave)}</td>
            <td>${formatCell(flight?.vuelo_llegada)}</td>
            <td>${formatCell(flight?.fecha_llegada)}</td>
            <td>${formatCell(flight?.hora_llegada)}</td>
            <td class="col-origen">${formatCell(flight?.origen)}</td>
            <td>${positionDisplay ? escapeHTML(positionDisplay) : '-'}</td>
            <td>${formatCell(flight?.vuelo_salida)}</td>
            <td>${formatCell(flight?.fecha_salida)}</td>
            <td>${formatCell(flight?.hora_salida)}</td>
            <td class="col-destino">${formatCell(flight?.destino)}</td>
        </tr>`;
    }).join('');

    const rows = rowsHtml || '<tr><td colspan="11" class="text-center text-muted py-4">No se encontraron vuelos de carga.</td></tr>';

    container.innerHTML = `
        <div class="card itinerary-airline-card itinerary-general-card itinerary-general-card--cargo" style="--itinerary-airline-accent:${accentColor}; --itinerary-airline-accent-bg:${accentBg}; --itinerary-airline-accent-border:${accentBorder}; --itinerary-airline-accent-shadow:${accentShadow};">
            <div class="card-body">
                <div class="itinerary-airline-card-head">
                    <div>
                        <div class="itinerary-airline-title">Itinerario de Carga</div>
                        <div class="itinerary-airline-sub">${subtitle}</div>
                    </div>
                    <div class="itinerary-airline-pills">
                        <span class="itinerary-pill"><i class="fas fa-plane"></i>${fmt(operations)} operaciones</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-arrival"></i>${fmt(arrivals)} llegadas</span>
                        <span class="itinerary-pill"><i class="fas fa-plane-departure"></i>${fmt(departures)} salidas</span>
                    </div>
                </div>
                <div class="itinerary-airline-toolbar-detail">
                    <div class="text-muted small d-flex align-items-center gap-2">
                        <i class="fas fa-box-open"></i>
                        <span>${overviewText}</span>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button id="export-cargo-full" class="btn btn-sm btn-outline-primary" title="Descargar CSV (toda la tabla)"><i class="fas fa-file-csv me-1"></i>CSV</button>
                    </div>
                </div>
                <div class="table-responsive itinerary-airline-table">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Aerolínea</th>
                                <th>Aeronave</th>
                                <th>Vuelo Lleg.</th>
                                <th>Fecha Lleg.</th>
                                <th>Hora Lleg.</th>
                                <th class="col-origen">Origen</th>
                                <th>Posición</th>
                                <th>Vuelo Sal.</th>
                                <th>Fecha Sal.</th>
                                <th>Hora Sal.</th>
                                <th class="col-destino">Destino</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    const tableEl = container.querySelector('table');
    if (tableEl) {
        setupDynamicTableHeader(tableEl, 'cargo-itinerary');
    }
    wireItineraryExports();
    console.log(`[perf] carga tabla: ${(performance.now()-t0).toFixed(1)}ms, filas=${flightsList.length}`);
}

// FIX: Loader global
function showGlobalLoader(text='Cargando...') {
  const el = document.getElementById('global-loader'); if (!el) return;
  const t = document.getElementById('global-loader-text'); if (t) t.textContent = text;
  el.dataset.startedAt = String(Date.now());
  el.classList.remove('hidden');
}
function hideGlobalLoader() {
  const el = document.getElementById('global-loader'); if (!el) return;
  const minVisible = 300;
  const started = parseInt(el.dataset.startedAt || '0', 10);
  const elapsed = Date.now() - started;
  const doHide = () => el.classList.add('hidden');
  if (elapsed < minVisible) setTimeout(doHide, minVisible - elapsed); else doHide();
}

// [extraído] Itinerario charts moved to js/itinerario.js


// =================================================================================
// FUNCIONES FALTANTES PARA ESTABILIZAR LA APP Y EVITAR ERRORES EN TIEMPO DE EJECUCIÓN
// =================================================================================

const SECTION_HOST_OVERRIDES = { itinerario: 'inicio' };

function resolveSectionHostKey(sectionKey) {
    if (!sectionKey) return null;
    return SECTION_HOST_OVERRIDES[sectionKey] || sectionKey;
}

function isItineraryChartsPaneActive() {
    const pane = document.getElementById('graficas-itinerario-pane');
    return !!(pane && pane.classList.contains('show') && pane.classList.contains('active'));
}

function activateItinerarioGraphsTab() {
    try {
        const tabBtn = document.getElementById('graficas-itinerario-tab');
        if (!tabBtn) return;
        if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
            bootstrap.Tab.getOrCreateInstance(tabBtn).show();
        } else {
            tabBtn.click();
        }
    } catch (err) {
        console.warn('activateItinerarioGraphsTab failed:', err);
    }
}

function initItinerarioGraphsTabBridge() {
    const tabBtn = document.getElementById('graficas-itinerario-tab');
    if (!tabBtn || tabBtn.dataset.bound) return;
    tabBtn.dataset.bound = '1';
    tabBtn.addEventListener('shown.bs.tab', () => {
        try {
            if (typeof window.renderItineraryCharts === 'function') {
                setTimeout(() => window.renderItineraryCharts(), 60);
            }
        } catch (err) {
            console.warn('renderItineraryCharts on tab show failed:', err);
        }
    });
}

document.addEventListener('DOMContentLoaded', initItinerarioGraphsTabBridge);

// Navegación: mostrar sección y marcar menú activo
function showSection(sectionKey, linkEl) {
    try {
        let targetKey = sectionKey || currentSectionKey || getDefaultAllowedSection();
        if (!isSectionAllowed(targetKey)) {
            const fallback = getDefaultAllowedSection();
            if (!fallback) return;
            targetKey = fallback;
            if (!linkEl) {
                linkEl = document.querySelector(`.menu-item[data-section="${fallback}"]`);
            }
        }
        if (!linkEl && targetKey) {
            linkEl = document.querySelector(`.menu-item[data-section="${targetKey}"]`);
        }
        const displayKey = resolveSectionHostKey(targetKey);
        const targetId = `${displayKey}-section`;
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        if (targetKey) currentSectionKey = targetKey;
        // Marcar menú
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        if (linkEl) linkEl.classList.add('active');
        // Actualizar hash
        try { history.replaceState(null, '', `#${targetKey}`); } catch(_) {}
        // Cerrar sidebar en móvil
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay && sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
        refreshOrientationHint(currentSectionKey);
    } catch (e) { console.warn('showSection error:', e); }
}

function getActiveSectionKey() {
    if (currentSectionKey) return currentSectionKey;
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return '';
    return (activeSection.id || '').replace(/-section$/, '');
}

function handleNavigation(e) {
    const a = e.target.closest('a.menu-item');
    if (!a) return;
    e.preventDefault();
    const action = a.dataset.action;
    const section = a.dataset.section;
    if (action === 'logout') { performLogout(); return; }
    if (section) {
        showSection(section, a);
        if (section === 'itinerario') {
            activateItinerarioGraphsTab();
        }
        // ensure sidebar closes after selecting on any device and collapse on desktop
        try {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) { sidebar.classList.remove('visible'); overlay.classList.remove('active'); }
            const isMobile = window.innerWidth <= 991.98;
            if (!isMobile) { document.body.classList.add('sidebar-collapsed'); try { localStorage.setItem('sidebarState','collapsed'); } catch(_) {} }
        } catch(_) {}
        // Hooks ligeros al entrar a ciertas vistas
        if (section === 'operaciones-totales') { 
            try { 
                updateOpsSummary(); 
                renderOperacionesTotales(); 
                // Detectar errores en gráficas después de un momento
                setTimeout(detectChartErrors, 500);
            } catch(_) {} 
        }
        else { try { stopOpsAnim(); } catch(_) {} }
        if (section === 'itinerario') { 
            try { 
                if (typeof window.renderItineraryCharts === 'function') {
                    setTimeout(() => window.renderItineraryCharts(), 50);
                }
                setTimeout(detectChartErrors, 500);
            } catch(_) {} 
        }
        if (section === 'demoras') { 
            try { 
                setTimeout(()=>{
                    renderDemoras();
                    setTimeout(detectChartErrors, 500);
                }, 50); 
            } catch(_) {} 
        }
        if (section === 'fauna') {
            try {
                // Give the layout a moment before rendering charts
                setTimeout(() => {
                    if (typeof window.dispatchEvent === 'function') {
                        // Let fauna.js listen for this to re-render if needed
                        const ev = new Event('fauna:visible');
                        window.dispatchEvent(ev);
                    }
                }, 60);
            } catch(_) {}
        }
    }
}

// Logout centralizado
function performLogout(){
    hideGlobalLoader();
    resetLoginFormState();
    resetSectionPermissions();
    try { destroyOpsCharts(); } catch(_){ }
    try {
        if (typeof window.destroyItinerarioCharts === 'function') {
            window.destroyItinerarioCharts();
        }
    } catch (_) {}
    try { window._itineraryChartsOk = false; } catch (_) {}
    try { window._delaysPieDrawn = false; } catch (_) {}
    checkForAppUpdates(true).catch(() => {});
    startAppUpdatePolling();
    try { sessionStorage.removeItem('currentUser'); } catch(_) {}
    try { sessionStorage.removeItem('aifa.user'); } catch(_) {}
    const mainApp = document.getElementById('main-app');
    const login = document.getElementById('login-screen');
    if (mainApp) mainApp.classList.add('hidden');
    if (login) login.classList.remove('hidden');
    const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = '';
    // cerrar sidebar/overlay si estuvieran abiertos
    try {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('visible');
        if (overlay) overlay.classList.remove('active');
    } catch(_) {}
    try {
        document.body.classList.remove('sidebar-open');
        document.body.classList.remove('sidebar-collapsed');
    } catch (_) {}
    try {
        currentSectionKey = 'operaciones-totales';
        orientationHintMuteUntil = 0;
        refreshOrientationHint(currentSectionKey);
    } catch (_) {}
    try {
        updateParteOperacionesAvailabilityBanner(undefined, { skipBanner: true });
    } catch (_) {}
}

let gsoNavVisibilityController = null;

function showGsoContent(){
    try {
        const hero = document.querySelector('#fauna-section .gso-media-wrapper');
        const quick = document.querySelector('#fauna-section .gso-quick-links');
        const tabsBar = document.getElementById('gsoTab');
        const tabContent = document.getElementById('gsoTabContent');
        if (hero) hero.classList.add('d-none');
        if (quick) quick.classList.add('d-none');
        if (tabsBar) tabsBar.classList.remove('d-none');
        if (tabContent) tabContent.classList.remove('d-none');
        const activeLinkId = tabsBar?.querySelector('.nav-link.active')?.id || '';
        if (gsoNavVisibilityController && activeLinkId) {
            gsoNavVisibilityController.update(activeLinkId);
        }
    } catch (err) {
        console.warn('showGsoContent failed:', err);
    }
}

function showGsoMenu(){
    try {
        const hero = document.querySelector('#fauna-section .gso-media-wrapper');
        const quick = document.querySelector('#fauna-section .gso-quick-links');
        const tabsBar = document.getElementById('gsoTab');
        const tabContent = document.getElementById('gsoTabContent');
        if (hero) hero.classList.remove('d-none');
        if (quick) quick.classList.remove('d-none');
        if (tabsBar) tabsBar.classList.add('d-none');
        if (tabContent) tabContent.classList.add('d-none');

        if (tabsBar) {
            tabsBar.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                link.setAttribute('aria-selected', 'false');
                link.setAttribute('tabindex', '-1');
            });
        }
        if (tabContent) {
            tabContent.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
        }
        document.querySelectorAll('.gso-nav-btn[data-nav-button]').forEach(btn => btn.classList.remove('active'));
        if (gsoNavVisibilityController) {
            gsoNavVisibilityController.reset();
        }
    } catch (err) {
        console.warn('showGsoMenu failed:', err);
    }
}

function initializeGsoQuickLinks(){
    try {
        const quickButtons = document.querySelectorAll('.gso-nav-btn[data-nav-button]');
        if (!quickButtons.length) return;

        const triggerNavById = (id)=>{
            if (!id) return;
            const navBtn = document.getElementById(id);
            if (!navBtn) return;
            if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
                bootstrap.Tab.getOrCreateInstance(navBtn).show();
            } else {
                navBtn.click();
            }
        };

        quickButtons.forEach(btn => {
            btn.addEventListener('click', (ev)=>{
                ev.preventDefault();
                const navId = btn.getAttribute('data-nav-button');
                showGsoContent();
                triggerNavById(navId);
                if (gsoNavVisibilityController && navId) {
                    gsoNavVisibilityController.update(navId);
                }
            });
        });

        const gsoTab = document.getElementById('gsoTab');
        const gsoNavLinks = gsoTab ? Array.from(gsoTab.querySelectorAll('.nav-link')) : [];
        if (gsoNavLinks.length) {
            gsoNavVisibilityController = {
                update(activeId){
                    const targetId = activeId || (gsoNavLinks.find(link => link.classList.contains('active'))?.id || '');
                    if (!targetId) {
                        gsoNavVisibilityController.reset();
                        return;
                    }
                    gsoNavLinks.forEach(link => {
                        const isActive = link.id === targetId;
                        link.classList.toggle('d-none', !isActive);
                        if (!isActive) {
                            link.setAttribute('aria-hidden', 'true');
                        } else {
                            link.removeAttribute('aria-hidden');
                        }
                    });
                },
                reset(){
                    gsoNavLinks.forEach(link => {
                        link.classList.remove('d-none');
                        link.removeAttribute('aria-hidden');
                    });
                }
            };
            gsoNavVisibilityController.reset();
        }
        if (gsoTab) {
            gsoTab.addEventListener('shown.bs.tab', (event)=>{
                const activeId = event?.target?.id || '';
                quickButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-nav-button') === activeId);
                });
                const activeLink = event?.target;
                if (activeLink) {
                    activeLink.setAttribute('tabindex', '0');
                }
                showGsoContent();
                if (gsoNavVisibilityController) {
                    gsoNavVisibilityController.update(activeId);
                }
                // Re-render fauna charts once the tab content is fully visible
                setTimeout(() => {
                    try {
                        if (typeof window.dispatchEvent === 'function') {
                            window.dispatchEvent(new Event('fauna:visible'));
                        }
                    } catch (_) {}
                }, 90);
            });
        }

        const backButtons = document.querySelectorAll('#gsoTabContent .gso-return-btn');
        backButtons.forEach(btn => {
            btn.addEventListener('click', (ev)=>{
                ev.preventDefault();
                showGsoMenu();
                const hero = document.querySelector('#fauna-section .gso-media-wrapper');
                if (hero) {
                    hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    } catch (err) {
        console.warn('initializeGsoQuickLinks failed:', err);
    }
}

// Fecha en la barra superior
function updateDate() {
    try {
        const el = document.getElementById('current-date');
        if (!el) return;
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        let txt = fmt.format(now);
        // Capitalizar primera letra
        txt = txt.charAt(0).toUpperCase() + txt.slice(1);
        el.textContent = txt;
    } catch (e) { /* ignore */ }
}

// Close sidebar when tapping overlay on mobile
document.addEventListener('DOMContentLoaded', function(){
    try {
        const overlay = document.getElementById('sidebar-overlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar && !overlay._wired){
            overlay._wired = 1;
            overlay.addEventListener('click', function(){
                sidebar.classList.remove('visible');
                overlay.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            });
        }
    } catch(_) {}
});

// Resumen y gráficas de Operaciones Totales (restauración completa con filtros, animaciones y colores)
const opsCharts = {};
let opsViewportFrame = null;
let opsTooltipsAlwaysOn = false;
let deferredPwaInstallEvent = null;
let installAppModalInstance = null;

function updateOpsTooltipToggleButton() {
    const btn = document.getElementById('ops-tooltips-toggle-btn');
    if (!btn) return;
    const enabled = !!opsTooltipsAlwaysOn;
    const iconClass = enabled ? 'fa-eye' : 'fa-eye-slash';
    const labelText = enabled ? 'Ocultar tooltips' : 'Tooltips fijos';
    btn.classList.toggle('btn-primary', enabled);
    btn.classList.toggle('btn-outline-secondary', !enabled);
    btn.classList.toggle('active', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.setAttribute('data-enabled', enabled ? 'true' : 'false');
    btn.title = enabled ? 'Ocultar tooltips siempre visibles' : 'Mostrar tooltips siempre visibles';
    btn.innerHTML = `<i class="fas ${iconClass} me-1"></i>${labelText}`;
}

function applyOpsTooltipsStateToCharts() {
    Object.values(opsCharts).forEach((chart) => {
        if (!chart) return;
        try {
            const tooltipCfg = chart.options?.plugins?.tooltip;
            if (tooltipCfg) {
                const desired = !opsTooltipsAlwaysOn;
                if (tooltipCfg.enabled !== desired) {
                    tooltipCfg.enabled = desired;
                }
            }
            const bubbleCfg = chart.options?.plugins?.dataBubble;
            if (bubbleCfg) {
                const defaultShow = bubbleCfg.defaultShow;
                const desiredBubble = opsTooltipsAlwaysOn ? false : (defaultShow === undefined ? true : defaultShow);
                if (bubbleCfg.show !== desiredBubble) {
                    bubbleCfg.show = desiredBubble;
                }
            }
            const dataset = chart.data?.datasets?.[0];
            if (dataset && dataset.aifaTooltipConfig) {
                const labels = Array.isArray(chart.data?.labels) ? chart.data.labels : [];
                const labelCount = labels.length;
                const xTitle = chart.options?.scales?.x?.title?.text || '';
                const xTitleString = typeof xTitle === 'string' ? xTitle.toLowerCase() : '';
                const isMonthlyAxis = xTitleString.includes('mes');
                const isWeeklyAxis = xTitleString.includes('semana') || xTitleString.includes('sem ') || xTitleString.includes('día') || xTitleString.includes('dia');
                const weeklyDense = isWeeklyAxis && labelCount >= 6;
                const resolvedHint = (() => {
                    if ((isMonthlyAxis && opsTooltipsAlwaysOn) || weeklyDense) return 'micro';
                    if (labelCount >= 30 || (isMonthlyAxis && labelCount >= 24)) return 'micro';
                    if (labelCount >= 22 || (isMonthlyAxis && labelCount >= 18)) return 'mini';
                    if (labelCount >= 16 || isMonthlyAxis) return 'compact';
                    return 'default';
                })();
                if (dataset.aifaTooltipConfig.sizeHint !== resolvedHint) {
                    dataset.aifaTooltipConfig.sizeHint = resolvedHint;
                }
            }
        } catch (_) { /* noop */ }
        try {
            chart.update('none');
        } catch (_) {
            try { chart.draw(); } catch (_) { /* noop */ }
        }
    });
}

const fallbackPercentFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const opsPersistentTooltipPlugin = {
    id: 'opsPersistentTooltip',
    afterDatasetsDraw(chart) {
        try {
            if (!opsTooltipsAlwaysOn) return;
            const dataset = chart.data?.datasets?.[0];
            const meta = chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
            if (!dataset || !meta || !Array.isArray(meta.data)) return;
            if (typeof chart.isDatasetVisible === 'function' && !chart.isDatasetVisible(0)) return;
            const cfg = dataset.aifaTooltipConfig;
            if (!cfg) return;
            const ctx = chart.ctx;
            if (!ctx) return;
            const chartArea = chart.chartArea || { left: 0, right: chart.width, top: 0, bottom: chart.height };
            const theme = cfg.theme || {};
            const border = theme.borderColor || 'rgba(20, 27, 39, 0.85)';
            const formatValue = typeof cfg.formatValue === 'function' ? cfg.formatValue : (value) => String(value ?? '');
            const formatVariation = typeof cfg.formatVariation === 'function'
                ? cfg.formatVariation
                : (delta) => {
                    if (!Number.isFinite(delta)) return '';
                    const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
                    return `${sign}${fallbackPercentFormatter.format(Math.abs(delta))}%`;
                };
            const getVariation = typeof cfg.getVariation === 'function' ? cfg.getVariation : () => null;
            const variationLabel = cfg.variationLabel || 'Δ%';

            ctx.save();
                const sizeHint = String(cfg.sizeHint || 'default');
                const tooltipStyles = {
                    micro: {
                        headerFont: '600 7px "Roboto", "Segoe UI", Arial, sans-serif',
                        bodyFont: '500 7px "Roboto", "Segoe UI", Arial, sans-serif',
                        headerLineHeight: 8,
                        bodyLineHeight: 8,
                        headerPadX: 4,
                        headerPadY: 2,
                        bodyPadX: 4,
                        bodyPadY: 3,
                        pointerWidth: 8,
                        pointerHeight: 4,
                        cornerRadius: 6,
                        preferredOffset: 8,
                        shadowBlur: 4,
                        shadowOffsetY: 1
                    },
                    mini: {
                        headerFont: '600 9px "Roboto", "Segoe UI", Arial, sans-serif',
                        bodyFont: '500 9px "Roboto", "Segoe UI", Arial, sans-serif',
                        headerLineHeight: 11,
                        bodyLineHeight: 12,
                        headerPadX: 8,
                        headerPadY: 4,
                        bodyPadX: 8,
                        bodyPadY: 6,
                        pointerWidth: 12,
                        pointerHeight: 5,
                        cornerRadius: 8,
                        preferredOffset: 12,
                        shadowBlur: 8,
                        shadowOffsetY: 2
                    },
                    compact: {
                        headerFont: '600 10px "Roboto", "Segoe UI", Arial, sans-serif',
                        bodyFont: '500 10px "Roboto", "Segoe UI", Arial, sans-serif',
                        headerLineHeight: 12,
                        bodyLineHeight: 13,
                        headerPadX: 10,
                        headerPadY: 5,
                        bodyPadX: 10,
                        bodyPadY: 8,
                        pointerWidth: 14,
                        pointerHeight: 6,
                        cornerRadius: 10,
                        preferredOffset: 14,
                        shadowBlur: 10,
                        shadowOffsetY: 3
                    },
                    default: {
                        headerFont: '600 11px "Roboto", "Segoe UI", Arial, sans-serif',
                        bodyFont: '500 11px "Roboto", "Segoe UI", Arial, sans-serif',
                        headerLineHeight: 14,
                        bodyLineHeight: 15,
                        headerPadX: 12,
                        headerPadY: 7,
                        bodyPadX: 14,
                        bodyPadY: 10,
                        pointerWidth: 16,
                        pointerHeight: 8,
                        cornerRadius: 12,
                        preferredOffset: 18,
                        shadowBlur: 12,
                        shadowOffsetY: 4
                    }
                };
                const style = tooltipStyles[sizeHint] || tooltipStyles.default;
                const isMicro = sizeHint === 'micro';
                const placedRects = [];
                const headerFont = style.headerFont;
                const bodyFont = style.bodyFont;
                const headerLineHeight = style.headerLineHeight;
                const bodyLineHeight = style.bodyLineHeight;
                const headerPadX = style.headerPadX;
                const headerPadY = style.headerPadY;
                const bodyPadX = style.bodyPadX;
                const bodyPadY = style.bodyPadY;
                const pointerWidth = style.pointerWidth;
                const pointerHeight = style.pointerHeight;
                const cornerRadius = style.cornerRadius;
                const preferredOffset = style.preferredOffset;
            const isDark = document.body.classList.contains('dark-mode');
            const defaultCardBg = isDark ? 'rgba(17,27,39,0.94)' : '#ffffff';
            const bodyTextDefault = isDark ? '#e2e8f0' : '#1f2937';
            const borderTone = isDark ? 'rgba(100,116,139,0.35)' : 'rgba(148,163,184,0.35)';
            const shadowColor = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.18)';

            meta.data.forEach((point, index) => {
                if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return;
                const rawValue = Array.isArray(dataset.data) ? dataset.data[index] : null;
                if (rawValue == null || Number.isNaN(rawValue)) return;
                const axisLabel = Array.isArray(chart.data?.labels) ? chart.data.labels[index] : null;
                const headerText = axisLabel != null ? String(axisLabel) : (dataset.label || '');
                const bodyLines = [];
                const valueText = formatValue(rawValue);
                if (valueText) {
                    if (isMicro) {
                        const microLabel = (() => {
                            const labelRaw = typeof dataset.label === 'string' ? dataset.label.trim() : '';
                            if (!labelRaw) return '';
                            if (labelRaw.length <= 12) return labelRaw;
                            const words = labelRaw.split(/\s+/).filter(Boolean);
                            if (words.length >= 2) {
                                const acronym = words.map((word) => word[0]).join('').toUpperCase();
                                if (acronym.length >= 2 && acronym.length <= 6) return acronym;
                            }
                            return `${labelRaw.slice(0, 9)}...`;
                        })();
                        if (microLabel) {
                            bodyLines.push({ text: microLabel, color: bodyTextDefault });
                        }
                        bodyLines.push({ text: valueText, color: bodyTextDefault });
                    } else {
                        bodyLines.push({ text: `${dataset.label}: ${valueText}`, color: bodyTextDefault });
                    }
                }
                const variationRaw = getVariation(index);
                if (variationRaw != null) {
                    const formattedVariation = formatVariation(variationRaw);
                    if (formattedVariation) {
                        const upColor = isDark ? '#4ade80' : '#16a34a';
                        const downColor = isDark ? '#f87171' : '#dc2626';
                        const neutralColor = bodyTextDefault;
                        const deltaColor = variationRaw > 0 ? upColor : variationRaw < 0 ? downColor : neutralColor;
                        const variationLine = isMicro ? `Δ ${formattedVariation}` : `${variationLabel}: ${formattedVariation}`;
                        bodyLines.push({ text: variationLine, color: deltaColor });
                    }
                }
                if (!bodyLines.length) {
                    const fallbackText = isMicro ? (dataset.label || '') : (dataset.label || '');
                    if (fallbackText) {
                        bodyLines.push({ text: fallbackText, color: bodyTextDefault });
                    }
                }

                ctx.font = headerFont;
                ctx.textBaseline = 'top';
                ctx.textAlign = 'center';
                const headerTextWidth = headerText ? ctx.measureText(headerText).width : 0;
                const headerHeight = headerText ? (headerPadY * 2) + headerLineHeight : 0;
                const headerWidth = headerText ? headerTextWidth + headerPadX * 2 : 0;

                ctx.font = bodyFont;
                ctx.textAlign = 'left';
                let maxBodyWidth = 0;
                bodyLines.forEach((line) => {
                    const width = ctx.measureText(line.text).width;
                    if (width > maxBodyWidth) maxBodyWidth = width;
                });
                const bodyWidth = maxBodyWidth + bodyPadX * 2;
                const bodyHeight = bodyLines.length ? (bodyPadY * 2) + (bodyLines.length * bodyLineHeight) : 0;

                const boxWidth = Math.max(headerWidth, bodyWidth);
                const boxHeight = headerHeight + bodyHeight;
                if (!(boxWidth > 0 && boxHeight > 0)) return;

                const makePlacement = (x, y, below) => ({
                    boxX: x,
                    boxY: y,
                    left: x,
                    right: x + boxWidth,
                    top: below ? y - pointerHeight : y,
                    bottom: below ? y + boxHeight : y + boxHeight + pointerHeight,
                    below
                });
                const intersects = (candidate) => placedRects.some((prev) => !(prev.right <= candidate.left || prev.left >= candidate.right || prev.bottom <= candidate.top || prev.top >= candidate.bottom));

                let boxX = point.x - boxWidth / 2;
                let boxY = point.y + preferredOffset;
                let placedBelow = true;
                const clampHorizontal = () => {
                    if (boxX < chartArea.left + 2) boxX = chartArea.left + 2;
                    if (boxX + boxWidth > chartArea.right - 2) boxX = chartArea.right - boxWidth - 2;
                };

                clampHorizontal();
                if (boxY + boxHeight + pointerHeight > chartArea.bottom - 4) {
                    boxY = point.y - boxHeight - preferredOffset;
                    placedBelow = false;
                    if (boxY < chartArea.top + 4) {
                        boxY = chartArea.top + 4;
                        placedBelow = true;
                    }
                }

                clampHorizontal();

                if (isMicro) {
                    const minX = chartArea.left + 2;
                    let maxX = chartArea.right - boxWidth - 2;
                    if (maxX < minX) maxX = minX;
                    if (boxX < minX) boxX = minX;
                    if (boxX > maxX) boxX = maxX;
                    let placement = makePlacement(boxX, boxY, placedBelow);
                    if (intersects(placement)) {
                        const candidates = [placement];
                        const fitWithinBounds = (candidate) => {
                            let nextX = candidate.boxX;
                            if (nextX < minX) nextX = minX;
                            if (nextX > maxX) nextX = maxX;
                            let nextY = candidate.boxY;
                            if (candidate.below) {
                                const maxY = chartArea.bottom - pointerHeight - boxHeight - 4;
                                const minY = chartArea.top + pointerHeight + 4;
                                if (nextY > maxY) nextY = maxY;
                                if (nextY < minY) nextY = minY;
                            } else {
                                const minY = chartArea.top + 4;
                                const maxY = chartArea.bottom - boxHeight - pointerHeight - 4;
                                if (nextY < minY) nextY = minY;
                                if (nextY > maxY) nextY = maxY;
                            }
                            return makePlacement(nextX, nextY, candidate.below);
                        };
                        const addCandidate = (x, y, below) => {
                            candidates.push(fitWithinBounds(makePlacement(x, y, below)));
                        };
                        addCandidate(boxX, point.y - boxHeight - preferredOffset, false);
                        addCandidate(boxX, point.y + preferredOffset, true);
                        const step = boxHeight + pointerHeight + 6;
                        const horizontalStep = Math.max(10, Math.round(boxWidth + 8));
                        for (let offset = 1; offset <= 4; offset += 1) {
                            addCandidate(boxX, point.y + preferredOffset + offset * step, true);
                            addCandidate(boxX, point.y - boxHeight - preferredOffset - offset * step, false);
                            addCandidate(boxX + offset * horizontalStep, point.y + preferredOffset, true);
                            addCandidate(boxX - offset * horizontalStep, point.y + preferredOffset, true);
                            addCandidate(boxX + offset * horizontalStep, point.y - boxHeight - preferredOffset, false);
                            addCandidate(boxX - offset * horizontalStep, point.y - boxHeight - preferredOffset, false);
                        }
                        let bestCandidate = placement;
                        let bestScore = Number.POSITIVE_INFINITY;
                        for (let c = 0; c < candidates.length; c += 1) {
                            const candidate = candidates[c];
                            let overlapScore = 0;
                            for (let i = 0; i < placedRects.length; i += 1) {
                                const prev = placedRects[i];
                                const overlapWidth = Math.max(0, Math.min(prev.right, candidate.right) - Math.max(prev.left, candidate.left));
                                const overlapHeight = Math.max(0, Math.min(prev.bottom, candidate.bottom) - Math.max(prev.top, candidate.top));
                                if (overlapWidth > 0 && overlapHeight > 0) {
                                    overlapScore += overlapWidth * overlapHeight;
                                }
                            }
                            if (overlapScore < bestScore) {
                                bestScore = overlapScore;
                                bestCandidate = candidate;
                                if (bestScore === 0) break;
                            }
                        }
                        placement = bestCandidate;
                    }
                    boxX = placement.boxX;
                    boxY = placement.boxY;
                    placedBelow = placement.below;
                    placedRects.push(placement);
                } else {
                    placedRects.push(makePlacement(boxX, boxY, placedBelow));
                }

                const datasetColor = typeof dataset.borderColor === 'string' ? dataset.borderColor : null;
                const cardBg = cfg.backgroundColor || defaultCardBg;
                const headerBg = datasetColor ? hexToRgba(datasetColor, isDark ? 0.75 : 0.85) : (isDark ? 'rgba(59,130,246,0.65)' : 'rgba(59,130,246,0.82)');
                const headerTextColor = '#ffffff';
                const bodyTextColor = cfg.bodyColor || bodyTextDefault;
                const outlineColor = border || borderTone;

                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = style.shadowBlur;
                ctx.shadowOffsetY = style.shadowOffsetY;

                const drawRoundedRect = () => {
                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
                    } else {
                        const r = Math.min(cornerRadius, boxWidth / 2, boxHeight / 2);
                        ctx.moveTo(boxX + r, boxY);
                        ctx.lineTo(boxX + boxWidth - r, boxY);
                        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + r);
                        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - r);
                        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - r, boxY + boxHeight);
                        ctx.lineTo(boxX + r, boxY + boxHeight);
                        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - r);
                        ctx.lineTo(boxX, boxY + r);
                        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
                        ctx.closePath();
                    }
                };

                drawRoundedRect();
                ctx.fillStyle = cardBg;
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;

                let pointerPath = null;
                const pointerCenter = Math.max(boxX + pointerWidth / 2 + 4, Math.min(point.x, boxX + boxWidth - pointerWidth / 2 - 4));
                if (placedBelow) {
                    const baseY = boxY;
                    const tipY = baseY - pointerHeight;
                    pointerPath = { points: [[pointerCenter, tipY], [pointerCenter - pointerWidth / 2, baseY], [pointerCenter + pointerWidth / 2, baseY]] };
                } else {
                    const baseY = boxY + boxHeight;
                    const tipY = baseY + pointerHeight;
                    pointerPath = { points: [[pointerCenter, tipY], [pointerCenter + pointerWidth / 2, baseY], [pointerCenter - pointerWidth / 2, baseY]] };
                }

                if (pointerPath) {
                    ctx.fillStyle = cardBg;
                    ctx.beginPath();
                    const [p0, p1, p2] = pointerPath.points;
                    ctx.moveTo(p0[0], p0[1]);
                    ctx.lineTo(p1[0], p1[1]);
                    ctx.lineTo(p2[0], p2[1]);
                    ctx.closePath();
                    ctx.fill();
                }

                if (outlineColor) {
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = outlineColor;
                    drawRoundedRect();
                    ctx.stroke();
                    if (pointerPath) {
                        ctx.beginPath();
                        const [p0, p1, p2] = pointerPath.points;
                        ctx.moveTo(p0[0], p0[1]);
                        ctx.lineTo(p1[0], p1[1]);
                        ctx.lineTo(p2[0], p2[1]);
                        ctx.closePath();
                        ctx.stroke();
                    }
                }

                if (headerHeight) {
                    ctx.beginPath();
                    const topRadius = cornerRadius;
                    ctx.moveTo(boxX, boxY + headerHeight);
                    ctx.lineTo(boxX, boxY + topRadius);
                    ctx.quadraticCurveTo(boxX, boxY, boxX + topRadius, boxY);
                    ctx.lineTo(boxX + boxWidth - topRadius, boxY);
                    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + topRadius);
                    ctx.lineTo(boxX + boxWidth, boxY + headerHeight);
                    ctx.closePath();
                    ctx.fillStyle = headerBg;
                    ctx.fill();
                }

                if (headerHeight) {
                    ctx.font = headerFont;
                    ctx.fillStyle = headerTextColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(headerText, boxX + boxWidth / 2, boxY + headerPadY);
                }

                ctx.font = bodyFont;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                let textY = boxY + headerHeight + bodyPadY;
                const textX = boxX + bodyPadX;
                bodyLines.forEach((line) => {
                    ctx.fillStyle = line.color || bodyTextColor;
                    ctx.fillText(line.text, textX, textY);
                    textY += bodyLineHeight;
                });
            });

            ctx.restore();
        } catch (_) { /* noop */ }
    }
};

function resetOpsChartViewport(chart) {
    try {
        if (!chart || !chart.canvas) return;
        const canvas = chart.canvas;
        const container = canvas.parentElement;
        if (!container) return;
        container.classList.remove('chart-scrollable');
        container.removeAttribute('data-scroll-mode');
        container.removeAttribute('data-scroll-width');
        container.style.removeProperty('--chart-width');
        container.style.removeProperty('overflow-x');
        canvas.style.removeProperty('max-width');
        if (typeof container.scrollTo === 'function') {
            container.scrollTo({ left: 0, behavior: 'instant' });
        } else {
            container.scrollLeft = 0;
        }
    } catch (_) { /* noop */ }
}

function adjustOpsChartViewport(chart) {
    try {
        if (!chart || !chart.canvas) return;
        const canvas = chart.canvas;
        const container = canvas.parentElement;
        if (!container) return;
        const labelCount = Array.isArray(chart.data?.labels) ? chart.data.labels.length : 0;
        const viewport = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0, 0);
        const containerWidth = container.clientWidth || viewport || 360;
        const isMobile = viewport <= 640;
        const isTablet = viewport > 640 && viewport <= 992;
    const unit = isMobile ? 68 : (isTablet ? 58 : 50);
    const approxWidth = labelCount > 1 ? Math.min(1400, Math.max(containerWidth, labelCount * unit)) : containerWidth;
    const shouldScroll = approxWidth > containerWidth * 1.05 && labelCount > 9;
        const prevMode = container.getAttribute('data-scroll-mode') || 'off';
        const prevWidth = parseInt(container.getAttribute('data-scroll-width') || '0', 10);

        if (shouldScroll) {
            const widthValue = Math.round(approxWidth);
            container.classList.add('chart-scrollable');
            container.setAttribute('data-scroll-mode', 'on');
            container.setAttribute('data-scroll-width', String(widthValue));
            container.style.setProperty('--chart-width', `${widthValue}px`);
            container.style.overflowX = 'auto';
            canvas.style.maxWidth = 'none';
            requestAnimationFrame(() => {
                try { chart.resize(); } catch (_) {}
            });
        } else if (prevMode !== 'off') {
            resetOpsChartViewport(chart);
            requestAnimationFrame(() => {
                try { chart.resize(); } catch (_) {}
            });
        }
    } catch (err) {
        console.warn('adjustOpsChartViewport error:', err);
    }
}

function scheduleOpsViewportUpdate() {
    if (opsViewportFrame) cancelAnimationFrame(opsViewportFrame);
    opsViewportFrame = requestAnimationFrame(() => {
        opsViewportFrame = null;
        Object.values(opsCharts).forEach((chart) => adjustOpsChartViewport(chart));
    });
}

window.addEventListener('resize', () => scheduleOpsViewportUpdate(), { passive: true });

function drawLineChart(canvasId, labels, values, opts){
    const c = document.getElementById(canvasId); if (!c) return;
    const dpr=window.devicePixelRatio||1; const w=c.clientWidth||640, h=c.clientHeight||380;
    c.width=Math.max(1,Math.floor(w*dpr)); c.height=Math.max(1,Math.floor(h*dpr));
    const g=c.getContext('2d'); if (!g) return; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
    const title = opts?.title || ''; const color = opts?.color || '#1e88e5'; const fillColor = opts?.fillColor || 'rgba(30,136,229,0.15)'; const xTitle = opts?.xTitle || ''; const yTitle = opts?.yTitle || '';
    const margin = { top: 48, right: 16, bottom: 32, left: 44 };
    const innerW = Math.max(1,w-margin.left-margin.right), innerH = Math.max(1,h-margin.top-margin.bottom);
    const x0 = margin.left, y0=h-margin.bottom;
    // Título
    if (title){ g.fillStyle='#495057'; g.font='600 14px Roboto, Arial'; g.textAlign='left'; g.textBaseline='top'; g.fillText(title, margin.left, 10); }
    // Escalas
    const maxV = Math.max(0, ...values); const nice = (function(m){ if(m<=5) return 5; if(m<=10) return 10; if(m<=20) return 20; if(m<=50) return 50; if(m<=100) return 100; const p=Math.pow(10, Math.floor(Math.log10(m))); return Math.ceil(m/p)*p; })(maxV);
    // Ejes y grid
    g.strokeStyle='rgba(0,0,0,0.2)'; g.lineWidth=1; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x0+innerW,y0); g.moveTo(x0,y0); g.lineTo(x0,y0-innerH); g.stroke();
    // Grid Y
    g.font='10px Roboto, Arial'; g.textAlign='right'; g.textBaseline='middle'; g.fillStyle='#6c757d';
    const tickCount=4; const step=nice/tickCount;
    for(let i=0;i<=tickCount;i++){ const v=i*step; const y=y0-(v/nice)*innerH; g.strokeStyle='rgba(0,0,0,0.06)'; g.beginPath(); g.moveTo(x0,y); g.lineTo(x0+innerW,y); g.stroke(); g.fillText(String(Math.round(v)), x0-6, y); }
    // Eje X labels
    g.textAlign='center'; g.textBaseline='top';
    const n=labels.length; const stepX = innerW/(Math.max(1,n-1));
    const labelEvery = n>12 ? Math.ceil(n/12) : 1;
    for(let i=0;i<n;i+=labelEvery){ const x = x0 + i*stepX; g.fillStyle='#6c757d'; g.fillText(labels[i], x, y0+6); }
    // Serie
    const points = values.map((v,i)=>({ x: x0 + i*stepX, y: y0 - ( (v/nice)*innerH ) }));
    // Área
    g.beginPath(); g.moveTo(points[0]?.x||x0, y0); points.forEach(p=> g.lineTo(p.x,p.y)); g.lineTo(points[points.length-1]?.x||x0, y0); g.closePath(); g.fillStyle=fillColor; g.fill();
    // Línea
    g.beginPath(); points.forEach((p,i)=>{ if(i===0) g.moveTo(p.x,p.y); else g.lineTo(p.x,p.y); }); g.strokeStyle=color; g.lineWidth=2; g.stroke();
    // Puntos
    g.fillStyle=color; points.forEach(p=>{ g.beginPath(); g.arc(p.x,p.y,2.5,0,Math.PI*2); g.fill(); });
    // Títulos de ejes
    if (yTitle){ g.save(); g.translate(12, margin.top + innerH/2); g.rotate(-Math.PI/2); g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#495057'; g.font='600 12px Roboto, Arial'; g.fillText(yTitle, 0, 0); g.restore(); }
    if (xTitle){ g.fillStyle='#495057'; g.font='600 12px Roboto, Arial'; g.textAlign='center'; g.textBaseline='top'; g.fillText(xTitle, x0 + innerW/2, h-16); }
}
const OPS_ALL_MONTH_CODES = ['01','02','03','04','05','06','07','08','09','10','11','12'];

function computeStaticMonthlyCutoff() {
    try {
        const monthly = staticData?.mensual2025;
        if (!monthly) return null;
        const candidates = [
            getLastConsolidatedMonth(monthly.comercial, 'operaciones'),
            getLastConsolidatedMonth(monthly.comercialPasajeros, 'pasajeros'),
            getLastConsolidatedMonth(monthly.carga, 'operaciones'),
            getLastConsolidatedMonth(monthly.cargaToneladas, 'toneladas'),
            getLastConsolidatedMonth(monthly.general?.operaciones, 'operaciones'),
            getLastConsolidatedMonth(monthly.general?.pasajeros, 'pasajeros')
        ].filter((value) => Number.isFinite(value) && value > 0);
        if (!candidates.length) return null;
        return Math.max(...candidates);
    } catch (_) {
        return null;
    }
}

function getAllowedMonthsForYear(year) {
    const codes = OPS_ALL_MONTH_CODES.slice();
    if (!year) return codes;
    if (String(year) !== String(AVIATION_ANALYTICS_CUTOFF_YEAR)) return codes;
    let cutoffIndex = Number.isFinite(AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX)
        ? AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX
        : null;
    if (!Number.isFinite(cutoffIndex) || cutoffIndex < 0) {
        const fallback = computeStaticMonthlyCutoff();
        if (Number.isFinite(fallback) && fallback > 0) {
            cutoffIndex = fallback - 1;
        }
    }
    if (!Number.isFinite(cutoffIndex) || cutoffIndex < 0) return [];
    const normalizedCutoff = Math.min(cutoffIndex, codes.length - 1);
    if (normalizedCutoff < 0) return [];
    return codes.slice(0, normalizedCutoff + 1);
}

function createAllowedMonthsSet(year) {
    return new Set(getAllowedMonthsForYear(year).map((code) => String(code).padStart(2, '0')));
}

const initialAllowedMonths = createAllowedMonthsSet(getOpsActiveMonthlyYear());

function createDefaultOpsYearsSet() {
    const derived = getOpsAvailableYearsFromTotals();
    if (derived.length) return new Set(derived);
    return new Set([deriveLatestOpsYearFromStaticData()]);
}

const opsUIState = {
    mode: 'weekly', // 'yearly' | 'monthly' | 'weekly'
    sections: { comercial: true, carga: true, general: true },
    years: createDefaultOpsYearsSet(),
    months2025: new Set(initialAllowedMonths),
    allowedMonthsSnapshot: new Set(initialAllowedMonths),
    preset: 'full', // 'ops' | 'full'
    weeklyDay: 'all',
    weeklyWeekId: 'auto'
};

Object.defineProperty(opsUIState, 'activeMonthlyYear', {
    get() {
        return staticData?.mensualYear ? String(staticData.mensualYear) : getOpsActiveMonthlyYear();
    },
    set(value) {
        staticData.mensualYear = value ? String(value) : getOpsActiveMonthlyYear();
    }
});

function refreshOpsYearFilters(availableYears) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('ops-years-filters');
    if (!container) return;
    const years = Array.isArray(availableYears) && availableYears.length
        ? availableYears
        : getOpsAvailableYearsFromTotals();
    if (!years.length) return;
    const selected = (opsUIState?.years instanceof Set && opsUIState.years.size)
        ? opsUIState.years
        : new Set(years.map((year) => String(year)));
    const markup = years.map((year) => {
        const yearKey = String(year);
        const checked = selected.has(yearKey) ? 'checked' : '';
        const id = `filter-year-${yearKey}`;
        return `
        <div class="form-check m-0">
            <input class="form-check-input" type="checkbox" id="${id}" data-year="${yearKey}" ${checked}>
            <label class="form-check-label" for="${id}">${yearKey}</label>
        </div>`;
    }).join('');
    container.innerHTML = markup;
    const disableYears = opsUIState.mode !== 'yearly';
    container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.disabled = disableYears;
    });
    const yearsHint = document.getElementById('years-disabled-hint');
    if (yearsHint) yearsHint.classList.toggle('d-none', !disableYears);
}

function syncOpsYearSelection(availableYears) {
    if (!Array.isArray(availableYears) || !availableYears.length) return;
    const normalized = Array.from(new Set(availableYears.map((year) => String(year))))
        .sort((a, b) => Number(a) - Number(b));
    const normalizedSet = new Set(normalized);
    let selection = opsUIState?.years instanceof Set ? new Set(Array.from(opsUIState.years).map((year) => String(year))) : new Set();
    if (!selection.size) {
        selection = new Set(normalized);
    } else {
        const next = new Set();
        selection.forEach((year) => {
            if (normalizedSet.has(year)) next.add(year);
        });
        if (!next.size) {
            normalized.forEach((year) => next.add(year));
        } else {
            normalized.forEach((year) => {
                if (!next.has(year)) next.add(year);
            });
        }
        selection = next;
    }
    opsUIState.years = selection;
    refreshOpsYearFilters(normalized);
}

function refreshOpsMonthsSelectionUI() {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('ops-months-2025');
    if (!panel) return;
    const activeYear = opsUIState?.activeMonthlyYear ? String(opsUIState.activeMonthlyYear) : getOpsActiveMonthlyYear();
    const allowed = createAllowedMonthsSet(activeYear);
    opsUIState.allowedMonthsSnapshot = new Set(allowed);
    const selection = opsUIState?.months2025 instanceof Set ? opsUIState.months2025 : new Set();
    const normalizedSelection = new Set();
    selection.forEach((code) => {
        const normalized = String(code || '').padStart(2, '0');
        if (allowed.has(normalized)) normalizedSelection.add(normalized);
    });
    if (!normalizedSelection.size && allowed.size) {
        allowed.forEach((code) => normalizedSelection.add(String(code).padStart(2, '0')));
    }
    opsUIState.months2025 = normalizedSelection;

    const selectAllBtn = document.getElementById('months-select-all');
    if (selectAllBtn) selectAllBtn.disabled = !allowed.size;
    const selectNoneBtn = document.getElementById('months-select-none');
    if (selectNoneBtn) selectNoneBtn.disabled = !allowed.size;

    panel.querySelectorAll('input[type="checkbox"][data-month]').forEach((input) => {
        const code = String(input.dataset.month || '').padStart(2, '0');
        const isAllowed = allowed.has(code);
        input.disabled = !isAllowed;
        input.checked = isAllowed && normalizedSelection.has(code);
        const label = input.closest('label');
        if (label) {
            label.classList.toggle('opacity-50', !isAllowed);
            label.classList.toggle('pe-none', !isAllowed);
        }
    });
}

function refreshOpsMonthlyYearLabels(year) {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('ops-months-2025');
    if (!container) return;
    const activeYear = year ? String(year) : getOpsActiveMonthlyYear();
    const headingYear = container.querySelector('#ops-months-year-label');
    if (headingYear) headingYear.textContent = activeYear;
    const helper = container.querySelector('#ops-months-year-helper');
    if (helper) {
        helper.textContent = `Selecciona los meses que deseas visualizar en ${activeYear}; las gráficas solo mostrarán datos de los meses marcados.`;
    }
}

function syncOpsMonthlyYearState(year) {
    const normalized = year ? String(year) : getOpsActiveMonthlyYear();
    const previous = opsUIState?.activeMonthlyYear ? String(opsUIState.activeMonthlyYear) : null;
    const yearChanged = !previous || previous !== normalized;
    opsUIState.activeMonthlyYear = normalized;
    staticData.mensualYear = normalized;
    refreshOpsMonthlyYearLabels(normalized);
    let selectionReset = false;
    const previousAllowed = opsUIState?.allowedMonthsSnapshot instanceof Set
        ? new Set(Array.from(opsUIState.allowedMonthsSnapshot).map((code) => String(code || '').padStart(2, '0')))
        : new Set();
    const allowed = createAllowedMonthsSet(normalized);
    opsUIState.allowedMonthsSnapshot = new Set(allowed);
    if (!(opsUIState.months2025 instanceof Set)) {
        opsUIState.months2025 = new Set(allowed);
        selectionReset = true;
    } else {
        const currentSelection = new Set();
        opsUIState.months2025.forEach((code) => {
            currentSelection.add(String(code || '').padStart(2, '0'));
        });
        const hadFullSelectionBefore = previousAllowed.size > 0
            && previousAllowed.size === currentSelection.size
            && Array.from(previousAllowed).every((code) => currentSelection.has(String(code).padStart(2, '0')));
        const nextSelection = new Set();
        currentSelection.forEach((code) => {
            if (allowed.has(code)) nextSelection.add(code);
        });
        if (hadFullSelectionBefore && allowed.size > previousAllowed.size) {
            nextSelection.clear();
            allowed.forEach((code) => nextSelection.add(String(code).padStart(2, '0')));
        } else if (!nextSelection.size && allowed.size) {
            allowed.forEach((code) => nextSelection.add(String(code).padStart(2, '0')));
        }
        let changed = yearChanged || currentSelection.size !== nextSelection.size;
        if (!changed) {
            nextSelection.forEach((code) => {
                if (!currentSelection.has(code)) changed = true;
            });
        }
        if (changed) {
            opsUIState.months2025 = nextSelection;
            selectionReset = true;
        }
    }
    if (selectionReset) {
        refreshOpsMonthsSelectionUI();
    }
}

function getWeeklyDatasetsCatalog() {
    const catalog = staticData?.operacionesSemanasCatalogo;
    if (!Array.isArray(catalog)) return [];
    return catalog.map(deepCloneWeek);
}

function getWeeklyDatasetById(weekId) {
    if (!weekId) return null;
    return getWeeklyDatasetsCatalog().find(week => week.id === weekId) || null;
}

function getActiveWeeklyDataset() {
    const resolvedCurrent = staticData?.operacionesSemanaActual ? deepCloneWeek(staticData.operacionesSemanaActual) : deepCloneWeek(null);
    const desiredId = opsUIState?.weeklyWeekId;
    if (!desiredId || desiredId === 'auto' || desiredId === 'current') {
        return resolvedCurrent;
    }
    const selected = getWeeklyDatasetById(desiredId);
    if (selected) {
        if (!selected.meta) selected.meta = {};
        selected.meta.selectedFromCatalog = true;
        return selected;
    }
    return resolvedCurrent;
}

function formatWeekLabel(week) {
    if (!week) return 'Semana';
    const custom = week?.rango?.descripcion;
    if (custom) {
        return custom.replace(/^Comparativo semanal del\s+/i, '');
    }
    const label = buildWeekRangeLabel(week?.rango?.inicio, week?.rango?.fin);
    if (label) return label;
    return week?.id || 'Semana';
}

function formatWeekOrdinalLabel(week) {
    if (!week || !week.id) return '';
    const meta = WEEKLY_ORDINAL_METADATA[week.id];
    if (!meta) {
        const fallbackDate = getWeekStartDate(week);
        const fallbackMonth = fallbackDate ? SPANISH_MONTH_NAMES[fallbackDate.getMonth()] : '';
        if (!fallbackMonth) return '';
        return `Semana de ${capitalizeFirst(fallbackMonth)}${fallbackDate ? ` ${fallbackDate.getFullYear()}` : ''}`;
    }
    const ordinal = formatSpanishOrdinalFeminine(meta.ordinal);
    const monthName = capitalizeFirst(meta.monthName || '');
    const yearPart = meta.year ? ` ${meta.year}` : '';
    return ordinal && monthName ? `${ordinal} semana de ${monthName}${yearPart}` : '';
}

function formatWeekOptionLabel(week) {
    const ordinalLabel = formatWeekOrdinalLabel(week);
    const rangeLabel = formatWeekLabel(week);
    if (ordinalLabel && rangeLabel) return `${ordinalLabel} · ${rangeLabel}`;
    return ordinalLabel || rangeLabel || week?.id || 'Semana';
}

function getLatestCargoLegendInfo(week) {
    if (!week) return null;
    const days = Array.isArray(week.dias) ? [...week.dias] : [];
    if (!days.length) return null;
    days.sort((a, b) => {
        const dateA = parseIsoDay(a?.fecha || '') || new Date(0);
        const dateB = parseIsoDay(b?.fecha || '') || new Date(0);
        return dateB - dateA;
    });
    for (const day of days) {
        const note = day?.carga?.corteNota;
        if (note) {
            return {
                note,
                corteFecha: day?.carga?.corteFecha || null,
                sourceDate: day?.fecha || null
            };
        }
    }
    return null;
}

function updateCargoLegend(week) {
    const legendEl = document.getElementById('cargo-legend');
    const cargoNoteSmall = document.querySelector('#cargo-update-note small');
    const info = getLatestCargoLegendInfo(week || getActiveWeeklyDataset());

    if (info) {
        if (legendEl) {
            const legendText = escapeHTML(info.note);
            legendEl.innerHTML = `<strong>Leyenda:</strong> ${legendText}`;
            legendEl.classList.remove('d-none');
        }
        if (cargoNoteSmall) {
            if (info.corteFecha) {
                const formatted = formatSpanishDate(info.corteFecha);
                if (formatted) {
                    cargoNoteSmall.innerHTML = `Datos actualizados al <strong>${escapeHTML(formatted)}</strong>`;
                } else {
                    cargoNoteSmall.textContent = info.note;
                }
            } else if (info.note) {
                cargoNoteSmall.textContent = info.note;
            }
        }
    } else {
        if (legendEl) {
            legendEl.innerHTML = '';
            legendEl.classList.add('d-none');
        }
        if (cargoNoteSmall) {
            cargoNoteSmall.innerHTML = 'Datos actualizados disponibles próximamente';
        }
    }
}

function formatSpanishDate(iso) {
    if (!iso || typeof iso !== 'string') return '';
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    const year = parts[0];
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!year || !month || !day) return iso;
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = months[month - 1] || '';
    return monthName ? `${day} de ${monthName} de ${year}` : iso;
}

function updateOperationsSummaryTitle() {
    const el = document.getElementById('operations-summary-title');
    if (!el) return;
    try {
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const iso = yesterday.toISOString().slice(0, 10);
        const label = formatSpanishDate(iso);
        if (label) {
            el.textContent = `Resumen de operaciones del ${label}`;
        }
    } catch (_) { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', updateOperationsSummaryTitle);

function ensureNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function getWeeklyValue(day, category, metric) {
    if (!day || !category) return 0;
    const segment = day[category];
    if (!segment || typeof segment !== 'object') return 0;
    return ensureNumber(segment[metric]);
}

function computeWeeklyVariation(day, category, metric, previousDay) {
    if (!day || !previousDay) return null;
    const current = getWeeklyValue(day, category, metric);
    const prior = getWeeklyValue(previousDay, category, metric);
    if (!Number.isFinite(prior) || prior === 0) return null;
    const delta = ((current - prior) / Math.abs(prior)) * 100;
    return Number.isFinite(delta) ? delta : null;
}

function computeSequentialPercent(values = []) {
    const arr = Array.isArray(values) ? values : [];
    return arr.map((value, index) => {
        if (index === 0) return null;
        const current = ensureNumber(value);
        const previous = ensureNumber(arr[index - 1]);
        if (!previous) return null;
        const delta = ((current - previous) / Math.abs(previous)) * 100;
        return Number.isFinite(delta) ? delta : null;
    });
}

const OPS_MONTH_NAME_LABELS = SPANISH_MONTH_NAMES.map((name) => capitalizeFirst(name));

function cloneOpsYearlyDataset(source) {
    const cloneArray = (input) => Array.isArray(input) ? input.map((item) => ({ ...item })) : [];
    return {
        comercial: cloneArray(source?.comercial),
        carga: cloneArray(source?.carga),
        general: cloneArray(source?.general)
    };
}

function cloneOpsMonthlyDataset(source) {
    const cloneArray = (input) => Array.isArray(input) ? input.map((item) => ({ ...item })) : [];
    const general = source?.general || {};
    return {
        comercial: cloneArray(source?.comercial),
        comercialPasajeros: cloneArray(source?.comercialPasajeros),
        carga: cloneArray(source?.carga),
        cargaToneladas: cloneArray(source?.cargaToneladas),
        general: {
            operaciones: cloneArray(general?.operaciones),
            pasajeros: cloneArray(general?.pasajeros)
        }
    };
}

function getLastConsolidatedMonth(collection, valueKey) {
    if (!Array.isArray(collection)) return 0;
    return collection.reduce((maxMonth, entry) => {
        if (!entry) return maxMonth;
        const label = typeof entry.label === 'string' ? entry.label.toLowerCase() : '';
        if (label.includes('proy')) return maxMonth;
        const raw = entry[valueKey];
        if (raw === null || raw === undefined || raw === '') return maxMonth;
        const monthValue = Number(entry.mes);
        if (!Number.isFinite(monthValue)) return maxMonth;
        return Math.max(maxMonth, monthValue);
    }, 0);
}

function getOpsMonthLabel(monthCode) {
    const monthNumber = Number(monthCode);
    if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return `Mes ${monthCode}`;
    }
    return OPS_MONTH_NAME_LABELS[monthNumber - 1] || `Mes ${monthCode}`;
}

function collectOpsWeeklySources() {
    const sources = [];
    const seenIds = new Set();
    const pushWeek = (week) => {
        if (!week) return;
        const id = week.id || null;
        if (id && seenIds.has(id)) return;
        if (id) seenIds.add(id);
        sources.push(week);
    };

    const current = staticData?.operacionesSemanaActual ? deepCloneWeek(staticData.operacionesSemanaActual) : null;
    if (current) pushWeek(current);

    const catalog = getWeeklyDatasetsCatalog();
    catalog.forEach((week) => pushWeek(week));

    if (!sources.length && current) sources.push(current);
    return sources;
}

function getOpsAggregatedData() {
    const monthlyBase = cloneOpsMonthlyDataset(staticData?.mensual2025 || {});
    const yearlyBase = cloneOpsYearlyDataset(staticData?.operacionesTotales || {});
    const weeklySources = collectOpsWeeklySources();
    if (!weeklySources.length) {
        return { monthly: monthlyBase, yearly: yearlyBase };
    }

    const monthTotals = new Map();
    const seenDailyKeys = new Set();

    weeklySources.forEach((week) => {
        if (!Array.isArray(week?.dias)) return;
        week.dias.forEach((day) => {
            const iso = day?.fecha;
            if (!iso || seenDailyKeys.has(iso)) return;
            const parsed = parseIsoDay(iso);
            if (!parsed) return;
            seenDailyKeys.add(iso);
            const year = parsed.getFullYear();
            const monthCode = String(parsed.getMonth() + 1).padStart(2, '0');
            const key = `${year}-${monthCode}`;
            if (!monthTotals.has(key)) {
                monthTotals.set(key, {
                    year,
                    month: monthCode,
                    totals: {
                        comercial: { operaciones: 0, pasajeros: 0 },
                        general: { operaciones: 0, pasajeros: 0 },
                        carga: { operaciones: 0, toneladas: 0 }
                    }
                });
            }
            const bucket = monthTotals.get(key);
            const addValue = (category, metric, raw) => {
                const num = Number(raw);
                if (!Number.isFinite(num)) return;
                bucket.totals[category][metric] += num;
            };
            addValue('comercial', 'operaciones', day?.comercial?.operaciones);
            addValue('comercial', 'pasajeros', day?.comercial?.pasajeros);
            addValue('general', 'operaciones', day?.general?.operaciones);
            addValue('general', 'pasajeros', day?.general?.pasajeros);
            addValue('carga', 'operaciones', day?.carga?.operaciones);
            addValue('carga', 'toneladas', day?.carga?.toneladas);
        });
    });

    if (!monthTotals.size) {
        return { monthly: monthlyBase, yearly: yearlyBase };
    }

    const ensureSorted = (collection) => {
        if (Array.isArray(collection)) {
            collection.sort((a, b) => Number(a.mes) - Number(b.mes));
        }
    };

    const yearDiffs = new Map();
    const ensureYearContribution = (year) => {
        const key = String(year);
        if (!yearDiffs.has(key)) {
            yearDiffs.set(key, {
                comercial: { operaciones: 0, pasajeros: 0 },
                general: { operaciones: 0, pasajeros: 0 },
                carga: { operaciones: 0, toneladas: 0 }
            });
        }
        return yearDiffs.get(key);
    };

    const monthCutoffs = {
        comercialOps: getLastConsolidatedMonth(monthlyBase.comercial, 'operaciones'),
        comercialPax: getLastConsolidatedMonth(monthlyBase.comercialPasajeros, 'pasajeros'),
        cargaOps: getLastConsolidatedMonth(monthlyBase.carga, 'operaciones'),
        cargaTon: getLastConsolidatedMonth(monthlyBase.cargaToneladas, 'toneladas'),
        generalOps: getLastConsolidatedMonth(monthlyBase.general.operaciones, 'operaciones'),
        generalPax: getLastConsolidatedMonth(monthlyBase.general.pasajeros, 'pasajeros')
    };

    const yearlyCandidates = Array.isArray(yearlyBase?.comercial)
        ? yearlyBase.comercial.map((entry) => Number(entry?.periodo)).filter(Number.isFinite)
        : [];
    const dailyYearCandidates = Array.from(monthTotals.values())
        .map((bucket) => Number(bucket?.year))
        .filter(Number.isFinite);
    const aggregationYearPool = [...yearlyCandidates, ...dailyYearCandidates];
    const aggregationYear = aggregationYearPool.length
        ? Math.max(...aggregationYearPool)
        : (new Date()).getFullYear();

    const applyMetric = ({
        collection,
        cutoff,
        valueKey,
        aggregatedValue,
        monthCode,
        monthNum,
        monthLabel,
        yearKey,
        categoryKey,
        metricKey
    }) => {
        if (!Array.isArray(collection)) return;
        if (!Number.isFinite(aggregatedValue)) return;
        if (monthNum <= cutoff) return;
        const normalizedValue = Math.abs(aggregatedValue) < 1e-6 ? 0 : aggregatedValue;
        let entry = collection.find((item) => item?.mes === monthCode) || null;
        const prevRaw = entry ? Number(entry[valueKey]) : 0;
        const prevValue = Number.isFinite(prevRaw) ? prevRaw : 0;
        if (!entry) {
            if (normalizedValue === 0) return;
            entry = { mes: monthCode, label: monthLabel };
            collection.push(entry);
        }
        if (!entry.label || entry.label.toLowerCase().includes('proy')) {
            entry.label = monthLabel;
        }
        entry[valueKey] = normalizedValue;
        const diff = normalizedValue - prevValue;
        if (Math.abs(diff) >= 1e-6) {
            const yearContribution = ensureYearContribution(yearKey);
            yearContribution[categoryKey][metricKey] += diff;
        }
    };

    monthTotals.forEach((bucket) => {
        if (bucket.year !== aggregationYear) return;
        const monthCode = bucket.month;
        const monthNum = Number(monthCode);
        if (!Number.isFinite(monthNum)) return;
        const monthLabel = getOpsMonthLabel(monthCode);
        const yearKey = String(bucket.year);
        const totals = bucket.totals;

        applyMetric({
            collection: monthlyBase.comercial,
            cutoff: monthCutoffs.comercialOps,
            valueKey: 'operaciones',
            aggregatedValue: totals.comercial.operaciones,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'comercial',
            metricKey: 'operaciones'
        });

        applyMetric({
            collection: monthlyBase.comercialPasajeros,
            cutoff: monthCutoffs.comercialPax,
            valueKey: 'pasajeros',
            aggregatedValue: totals.comercial.pasajeros,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'comercial',
            metricKey: 'pasajeros'
        });

        applyMetric({
            collection: monthlyBase.carga,
            cutoff: monthCutoffs.cargaOps,
            valueKey: 'operaciones',
            aggregatedValue: totals.carga.operaciones,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'carga',
            metricKey: 'operaciones'
        });

        applyMetric({
            collection: monthlyBase.cargaToneladas,
            cutoff: monthCutoffs.cargaTon,
            valueKey: 'toneladas',
            aggregatedValue: totals.carga.toneladas,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'carga',
            metricKey: 'toneladas'
        });

        applyMetric({
            collection: monthlyBase.general.operaciones,
            cutoff: monthCutoffs.generalOps,
            valueKey: 'operaciones',
            aggregatedValue: totals.general.operaciones,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'general',
            metricKey: 'operaciones'
        });

        applyMetric({
            collection: monthlyBase.general.pasajeros,
            cutoff: monthCutoffs.generalPax,
            valueKey: 'pasajeros',
            aggregatedValue: totals.general.pasajeros,
            monthCode,
            monthNum,
            monthLabel,
            yearKey,
            categoryKey: 'general',
            metricKey: 'pasajeros'
        });
    });

    ensureSorted(monthlyBase.comercial);
    ensureSorted(monthlyBase.comercialPasajeros);
    ensureSorted(monthlyBase.carga);
    ensureSorted(monthlyBase.cargaToneladas);
    ensureSorted(monthlyBase.general.operaciones);
    ensureSorted(monthlyBase.general.pasajeros);

    yearDiffs.forEach((diffs, yearKey) => {
        const adjustYearEntry = (collection, valueKey, delta) => {
            if (!Number.isFinite(delta) || Math.abs(delta) < 1e-6) return;
            let entry = Array.isArray(collection)
                ? collection.find((item) => String(item?.periodo) === yearKey)
                : null;
            if (!entry) {
                entry = { periodo: yearKey };
                collection.push(entry);
            }
            const previousRaw = Number(entry[valueKey]);
            const previous = Number.isFinite(previousRaw) ? previousRaw : 0;
            entry[valueKey] = previous + delta;
        };

        adjustYearEntry(yearlyBase.comercial, 'operaciones', diffs.comercial.operaciones);
        adjustYearEntry(yearlyBase.comercial, 'pasajeros', diffs.comercial.pasajeros);
        adjustYearEntry(yearlyBase.carga, 'operaciones', diffs.carga.operaciones);
        adjustYearEntry(yearlyBase.carga, 'toneladas', diffs.carga.toneladas);
        adjustYearEntry(yearlyBase.general, 'operaciones', diffs.general.operaciones);
        adjustYearEntry(yearlyBase.general, 'pasajeros', diffs.general.pasajeros);
    });

    const sortYearly = (collection) => {
        if (!Array.isArray(collection)) return;
        collection.sort((a, b) => Number(a.periodo) - Number(b.periodo));
    };
    sortYearly(yearlyBase.comercial);
    sortYearly(yearlyBase.carga);
    sortYearly(yearlyBase.general);

    return {
        monthly: monthlyBase,
        yearly: yearlyBase
    };
}
// Animación segura para íconos viajeros en Operaciones Totales
if (!window._opsAnim) window._opsAnim = { running: false };
function startOpsAnim() {
    window._opsAnim.running = true;
    Object.values(opsCharts).forEach((chart) => {
        if (!chart) return;
        const traveler = chart.$traveler;
        if (traveler && typeof traveler.start === 'function') traveler.start();
    });
}
function stopOpsAnim() {
    window._opsAnim.running = false;
    Object.values(opsCharts).forEach((chart) => {
        if (!chart) return;
        const traveler = chart.$traveler;
        if (traveler && typeof traveler.stop === 'function') traveler.stop();
    });
}
function destroyOpsCharts() {
    stopOpsAnim();
    Object.keys(opsCharts).forEach((k) => {
        try {
            if (opsCharts[k]) {
                resetOpsChartViewport(opsCharts[k]);
                opsCharts[k].destroy();
            }
        } catch (_) { /* noop */ }
        delete opsCharts[k];
    });
}

// Función global para reinicializar todas las gráficas cuando fallan
function resetAllCharts() {
    const btn = document.getElementById('charts-reset-btn');
    let originalHTML = '';
    
    try {
        console.log('🔄 REINICIALIZACIÓN COMPLETA DE GRÁFICAS...');
        
        // Mostrar indicador de carga
        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i><span class="d-none d-md-inline">Reiniciando...</span>';
            btn.disabled = true;
        }
        
        // FASE 1: DESTRUCCIÓN COMPLETA
        console.log('🗑️ FASE 1: Destrucción completa de gráficas...');
        
        // Destruir gráficas de Operaciones Totales
        destroyOpsCharts();
        
        // Destruir gráficas de Itinerario
        if (window.destroyItinerarioCharts && typeof window.destroyItinerarioCharts === 'function') {
            window.destroyItinerarioCharts();
        }
        
        // Destruir todas las instancias de Chart.js globalmente
        if (window.Chart && Chart.instances) {
            Object.values(Chart.instances).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try { chart.destroy(); } catch(_) {}
                }
            });
        }
        
        // Limpiar completamente window.opsCharts
        if (window.opsCharts) {
            Object.keys(window.opsCharts).forEach(key => {
                try { 
                    if (window.opsCharts[key] && typeof window.opsCharts[key].destroy === 'function') {
                        window.opsCharts[key].destroy(); 
                    }
                    delete window.opsCharts[key];
                } catch(_) {}
            });
        }
        
        // Limpiar animaciones pendientes
        stopOpsAnim();
        
        // FASE 2: LIMPIEZA DE CANVAS
        console.log('🧹 FASE 2: Limpieza de canvas...');
        const canvasIds = [
            'commercial-ops-chart', 'commercial-pax-chart',
            'cargo-ops-chart', 'cargo-tons-chart', 
            'general-ops-chart', 'general-pax-chart',
            'paxArrivalsChart', 'paxDeparturesChart', 
            'cargoArrivalsChart', 'cargoDeparturesChart',
            'delaysPieChart'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                // Limpiar completamente el canvas
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Resetear dimensiones del canvas
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                
                // Remover cualquier referencia de Chart.js
                if (canvas.chart) {
                    delete canvas.chart;
                }
            }
        });
        
        // FASE 3: RECREACIÓN COMPLETA
        console.log('🏗️ FASE 3: Esperando para recreación completa...');
        
        setTimeout(() => {
            try {
                const activeSection = document.querySelector('.content-section.active');
                console.log('Sección activa detectada:', activeSection?.id);
                
                if (!activeSection) {
                    throw new Error('No se detectó sección activa');
                }
                
                const sectionId = getActiveSectionKey() || activeSection.id.replace('-section', '');
                console.log(`🔨 Recreando gráficas para sección: ${sectionId}`);
                
                // Recrear según la sección activa
                if (sectionId === 'operaciones-totales') {
                    console.log('📊 Recreando Operaciones Totales...');
                    
                    // Forzar re-carga completa de datos y gráficas
                    try {
                        updateOpsSummary();
                    } catch (e) {
                        console.warn('Error en updateOpsSummary:', e);
                    }
                    
                    try {
                        renderOperacionesTotales();
                    } catch (e) {
                        console.error('Error en renderOperacionesTotales:', e);
                        throw e;
                    }
                    
                } else if (sectionId === 'itinerario') {
                    console.log('📈 Recreando Itinerario...');
                    
                    if (window.renderItineraryCharts && typeof window.renderItineraryCharts === 'function') {
                        try {
                            // Forzar re-carga de datos del itinerario
                            window.renderItineraryCharts();
                        } catch (e) {
                            console.error('Error en renderItineraryCharts:', e);
                            throw e;
                        }
                    } else {
                        throw new Error('Función renderItineraryCharts no disponible');
                    }
                    
                } else if (sectionId === 'demoras') {
                    console.log('🕒 Recreando Demoras...');
                    
                    if (window.renderDemoras && typeof window.renderDemoras === 'function') {
                        try {
                            window.renderDemoras();
                        } catch (e) {
                            console.error('Error en renderDemoras:', e);
                            throw e;
                        }
                    } else {
                        throw new Error('Función renderDemoras no disponible');
                    }
                } else {
                    console.log(`ℹ️ Sección ${sectionId} no requiere gráficas especiales`);
                }
                
                // FASE 4: VERIFICACIÓN FINAL
                setTimeout(() => {
                    console.log('🔍 FASE 4: Verificación final...');
                    
                    // Verificar que las gráficas se crearon correctamente
                    const success = verifyChartsCreated(sectionId);
                    
                    if (success) {
                        console.log('✅ REINICIALIZACIÓN COMPLETA EXITOSA');
                        showNotification('Gráficas completamente reinicializadas', 'success');
                    } else {
                        console.warn('⚠️ Algunas gráficas no se crearon correctamente');
                        showNotification('Reinicialización parcial - algunas gráficas pueden tener problemas', 'warning');
                    }
                    
                    detectChartErrors();
                }, 800);
                
            } catch (error) {
                console.error('❌ ERROR EN RECREACIÓN:', error);
                showNotification('Error al recrear gráficas: ' + error.message, 'error');
            } finally {
                // Restaurar botón después de todo el proceso
                setTimeout(() => {
                    if (btn && originalHTML) {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    }
                }, 1000);
            }
        }, 500); // Aumentado el tiempo de espera
        
    } catch (error) {
        console.error('❌ ERROR CRÍTICO EN REINICIALIZACIÓN:', error);
        showNotification('Error crítico: ' + error.message, 'error');
        
        // Restaurar botón en caso de error inmediato
        if (btn && originalHTML) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const alertType = type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info';
    const notification = document.createElement('div');
    notification.className = `alert alert-${alertType} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 350px;';
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Detectar errores en gráficas y mostrar botón de reset automáticamente
function detectChartErrors() {
    const btn = document.getElementById('charts-reset-btn');
    if (!btn) return;
    
    try {
        const activeSection = document.querySelector('.content-section.active');
        if (!activeSection) {
            btn.style.display = 'none';
            return;
        }
        
        const sectionId = getActiveSectionKey() || activeSection.id.replace('-section', '');
        let hasErrors = false;
        let errorInfo = '';
        
        console.log(`🔍 Detectando errores en sección: ${sectionId}`);
        
        if (sectionId === 'operaciones-totales') {
            const expectedCanvases = [
                'commercial-ops-chart', 'commercial-pax-chart',
                'cargo-ops-chart', 'cargo-tons-chart',
                'general-ops-chart', 'general-pax-chart'
            ];
            
            const missingCharts = [];
            expectedCanvases.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    missingCharts.push(`Canvas ${canvasId} no encontrado`);
                    hasErrors = true;
                } else if (!opsCharts[canvasId.replace('-chart', 'Chart')]) {
                    missingCharts.push(`Gráfica ${canvasId} no inicializada`);
                    hasErrors = true;
                }
            });
            
            if (missingCharts.length > 0) {
                errorInfo = `Operaciones: ${missingCharts.length} gráficas con problemas`;
            }
            
        } else if (sectionId === 'itinerario') {
            const expectedCanvases = [
                'paxArrivalsChart', 'paxDeparturesChart', 
                'cargoArrivalsChart', 'cargoDeparturesChart'
            ];
            
            const missingCharts = [];
            expectedCanvases.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) {
                    missingCharts.push(`Canvas ${canvasId} no encontrado`);
                    hasErrors = true;
                }
            });
            // Para Itinerario usamos renderizado por canvas personalizado; usamos una bandera global
            if (!window._itineraryChartsOk) {
                hasErrors = true;
                missingCharts.push('Gráficas de itinerario no dibujadas');
            }

            if (missingCharts.length > 0) {
                errorInfo = `Itinerario: ${missingCharts.length} gráficas con problemas`;
            }
            
        } else if (sectionId === 'demoras') {
            const canvas = document.getElementById('delaysPieChart');
            if (!canvas) {
                hasErrors = true;
                errorInfo = 'Demoras: Canvas no encontrado';
            } else if (!window._delaysPieDrawn) {
                hasErrors = true;
                errorInfo = 'Demoras: Gráfica no dibujada';
            }
        }
        
        // Mostrar/ocultar botón según el estado
        if (hasErrors) {
            btn.style.display = 'inline-block';
            btn.title = `Reinicializar gráficas - ${errorInfo}`;
            console.warn(`⚠️ ${errorInfo}`);
        } else {
            btn.style.display = 'none';
            console.log(`✅ Todas las gráficas de ${sectionId} están funcionando`);
        }
        
    } catch (error) {
        console.error('Error en detectChartErrors:', error);
        // En caso de error, mostrar el botón por seguridad
        btn.style.display = 'inline-block';
        btn.title = 'Reinicializar gráficas - Error de detección';
    }
}
function renderOperacionesTotales() {
    try {
        const theme = getChartColors();
        updateOpsTooltipToggleButton();
        const aifa = window.AIFA || {};
        const formatCompact = aifa.formatCompact || ((value, kind = 'int') => {
            const num = Number(value || 0);
            const abs = Math.abs(num);
            if (kind === 'ton') {
                if (abs >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                const decimals = abs < 10 ? 2 : 1;
                return num.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
            }
            if (kind === 'pax' || kind === 'int') {
                if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
                if (abs >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
                return Math.round(num).toLocaleString('es-MX');
            }
            return Math.round(num).toLocaleString('es-MX');
        });
        const formatFull = aifa.formatFull || ((value, kind = 'int') => {
            const num = Number(value || 0);
            if (kind === 'ton') {
                return num.toLocaleString('es-MX', { maximumFractionDigits: 3 });
            }
            return Math.round(num).toLocaleString('es-MX');
        });
        const percentFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const formatPercentDelta = (value) => {
            if (!Number.isFinite(value)) return null;
            const sign = value > 0 ? '+' : value < 0 ? '-' : '';
            return `${sign}${percentFormatter.format(Math.abs(value))}%`;
        };
        const hexToRgba = aifa.hexToRgba || ((hex, alpha = 1) => {
            try {
                const clean = (hex || '').toString().trim().replace('#', '');
                const r = parseInt(clean.slice(0, 2), 16) || 0;
                const g = parseInt(clean.slice(2, 4), 16) || 0;
                const b = parseInt(clean.slice(4, 6), 16) || 0;
                return `rgba(${r},${g},${b},${alpha})`;
            } catch (err) {
                return `rgba(0,0,0,${alpha})`;
            }
        });

        // Helpers de colores con gradientes por canvas
            function makeGradient(canvas, c1, c2){
            const ctx = canvas.getContext('2d');
            const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
            g.addColorStop(0, c1);
            g.addColorStop(1, c2);
            return g;
        }
            function shouldEnableTraveler(opts){
                return opts !== false;
            }
            function normalizeTravelerOpts(raw){
                const base = { speed: 24000, scale: 1, type: 'plane', alpha: 0.9 };
                if (!raw || typeof raw !== 'object') return { ...base };
                const parsed = { ...base };
                if (Number.isFinite(raw.speed) && raw.speed > 500) parsed.speed = raw.speed;
                if (Number.isFinite(raw.scale) && raw.scale > 0) parsed.scale = Math.max(0.4, Math.min(raw.scale, 3));
                if (typeof raw.type === 'string') parsed.type = raw.type;
                if (Number.isFinite(raw.alpha) && raw.alpha >= 0 && raw.alpha <= 1) parsed.alpha = raw.alpha;
                return parsed;
            }
            function getTravelerPointXY(point){
                if (!point) return null;
                if (typeof point.x === 'number' && typeof point.y === 'number') {
                    return { x: point.x, y: point.y };
                }
                if (typeof point.tooltipPosition === 'function') {
                    return point.tooltipPosition();
                }
                const model = point._model || point.$context;
                if (model && typeof model.x === 'number' && typeof model.y === 'number') {
                    return { x: model.x, y: model.y };
                }
                return null;
            }
            function drawTravelerIcon(ctx, type){
                ctx.font = '14px system-ui, Segoe UI, Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (type === 'person') {
                    const isDark = document.body.classList.contains('dark-mode');
                    const tone = isDark ? '#e9ecef' : '#1f2937';
                    ctx.strokeStyle = tone;
                    ctx.fillStyle = tone;
                    ctx.lineWidth = 2.0;
                    ctx.beginPath(); ctx.arc(0, -5, 2.6, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(5, 2.5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(-3.5, 0.8); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(5.5, 9); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-2.8, 10.2); ctx.stroke();
                } else {
                    const emoji = type === 'suitcase' ? '🧳' : type === 'box' ? '📦' : '✈';
                    ctx.fillText(emoji, 0, 0);
                }
            }
            function resizeTravelerOverlay(chart, state){
                if (!state || !state.overlay) return;
                const canvas = chart.canvas;
                const width = chart.width || (canvas && canvas.clientWidth) || 0;
                const height = chart.height || (canvas && canvas.clientHeight) || 0;
                if (!width || !height) return;
                const ratio = chart.currentDevicePixelRatio || window.devicePixelRatio || 1;
                if (state.width === width && state.height === height && state.ratio === ratio) return;
                state.width = width;
                state.height = height;
                state.ratio = ratio;
                const overlay = state.overlay;
                overlay.width = Math.max(1, Math.round(width * ratio));
                overlay.height = Math.max(1, Math.round(height * ratio));
                overlay.style.width = `${width}px`;
                overlay.style.height = `${height}px`;
                const ctx = overlay.getContext('2d');
                if (ctx && ctx.resetTransform) ctx.resetTransform();
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
                state.ctx = ctx;
            }
            function destroyTravelerState(chart){
                const state = chart.$traveler;
                if (!state) return;
                if (state.stop) state.stop();
                if (state.overlay && state.overlay.parentNode) {
                    state.overlay.parentNode.removeChild(state.overlay);
                }
                if (state.autoPosition && state.parent) {
                    state.parent.style.position = state.parentOriginalPosition;
                }
                delete chart.$traveler;
            }
            function ensureTravelerState(chart, opts){
                if (!shouldEnableTraveler(opts)) {
                    destroyTravelerState(chart);
                    return null;
                }
                let state = chart.$traveler;
                const canvas = chart.canvas;
                if (!canvas || !canvas.parentNode) return null;
                const parent = canvas.parentNode;
                if (!state) {
                    const overlay = document.createElement('canvas');
                    overlay.className = 'traveler-overlay';
                    overlay.style.position = 'absolute';
                    overlay.style.left = '0';
                    overlay.style.top = '0';
                    overlay.style.pointerEvents = 'none';
                    overlay.style.zIndex = '3';
                    parent.appendChild(overlay);
                    let autoPosition = false;
                    let parentOriginalPosition = parent.style.position || '';
                    if (window.getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                        autoPosition = true;
                    }
                    state = chart.$traveler = {
                        overlay,
                        parent,
                        ctx: overlay.getContext('2d'),
                        running: false,
                        raf: 0,
                        startTs: 0,
                        width: 0,
                        height: 0,
                        ratio: 1,
                        opts: normalizeTravelerOpts(opts),
                        autoPosition,
                        parentOriginalPosition,
                        loop: null,
                        start: null,
                        stop: null
                    };
                    state.loop = function loop(ts){
                        if (!state.running) return;
                        if (!chart.canvas || !chart.canvas.isConnected) {
                            state.stop();
                            return;
                        }
                        resizeTravelerOverlay(chart, state);
                        renderTravelerFrame(chart, state, ts);
                        state.raf = requestAnimationFrame(loop);
                    };
                    state.start = function(){
                        if (state.running) return;
                        state.running = true;
                        state.startTs = performance.now();
                        cancelAnimationFrame(state.raf);
                        state.raf = requestAnimationFrame(state.loop);
                    };
                    state.stop = function(){
                        if (!state.running && !state.raf) return;
                        state.running = false;
                        if (state.raf) cancelAnimationFrame(state.raf);
                        state.raf = 0;
                        if (state.ctx) {
                            state.ctx.clearRect(0, 0, state.width || 0, state.height || 0);
                        }
                    };
                } else {
                    state.opts = normalizeTravelerOpts(opts);
                }
                resizeTravelerOverlay(chart, state);
                return state;
            }
            function renderTravelerFrame(chart, state, ts){
                const ctx = state.ctx;
                if (!ctx) return;
                const meta = chart.getDatasetMeta ? chart.getDatasetMeta(0) : null;
                const points = meta && meta.data ? meta.data : null;
                const area = chart.chartArea;
                ctx.clearRect(0, 0, state.width || chart.width || 0, state.height || chart.height || 0);
                if (!points || points.length < 2 || !area) return;
                const opts = state.opts || {};
                const speed = Math.max(600, opts.speed || 24000);
                const duration = speed;
                if (!state.startTs) state.startTs = ts;
                const cycle = ((ts - state.startTs) % duration) / duration;
                const total = points.length;
                const fracIndex = cycle * (total - 1);
                const idx0 = Math.floor(fracIndex);
                const idx1 = Math.min(total - 1, idx0 + 1);
                const p0 = getTravelerPointXY(points[idx0]);
                const p1 = getTravelerPointXY(points[idx1]);
                if (!p0 || !p1) return;
                const localT = fracIndex - idx0;
                const x = p0.x + (p1.x - p0.x) * localT;
                const y = p0.y + (p1.y - p0.y) * localT;
                ctx.save();
                ctx.globalAlpha = Number.isFinite(opts.alpha) ? opts.alpha : 0.9;
                ctx.translate(x, y);
                const scale = opts.scale || 1;
                ctx.scale(scale, scale);
                drawTravelerIcon(ctx, opts.type || 'plane');
                ctx.restore();
            }
            const TravelerPlugin = {
                id: 'travelerPlugin',
                afterInit(chart, args, opts){
                    const state = ensureTravelerState(chart, opts);
                    if (state && window._opsAnim && window._opsAnim.running) {
                        state.start();
                    }
                },
                afterUpdate(chart, args, opts){
                    const state = ensureTravelerState(chart, opts);
                    if (state && window._opsAnim && window._opsAnim.running) {
                        state.start();
                    }
                },
                afterResize(chart){
                    const state = chart.$traveler;
                    if (state) {
                        resizeTravelerOverlay(chart, state);
                    }
                },
                beforeDraw(chart, args, opts){
                    if (opts === false) {
                        destroyTravelerState(chart);
                    }
                },
                beforeDestroy(chart){
                    destroyTravelerState(chart);
                }
            };

            // Etiquetas rectangulares con período y valor completo (con anti-encimado)
            const DataBubblePlugin = {
                id: 'dataBubble',
                afterDatasetsDraw(chart, args, opts){
                    try{
                        if (!opts || opts.show === false) return;
                        const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
                        if (!ds) return;
                        const meta = chart.getDatasetMeta(0);
                        const values = (ds.data||[]).map(v => Number(v)||0);
                        const points = meta && meta.data ? meta.data : [];
                        const ctx = chart.ctx;
                        const labels = (chart.data && chart.data.labels) || [];
                        const borderColor = (opts.borderColor || ds.borderColor || '#0d6efd');
                        const fillColor = (opts.fillColor || ds.borderColor || '#0d6efd');
                        const textColor = (opts.textColor || '#ffffff');
                        const corner = 10;
                        const onlyMax = !!opts.onlyMax;
                        const area = chart.chartArea;
                        const small = !!opts.small;
                        const minGapX = Number(opts.minGapX || 16);

                        // hallar índice máximo si aplica
                        let maxIdx = -1; if (onlyMax) { let mv=-Infinity; values.forEach((v,i)=>{ if(v>mv){ mv=v; maxIdx=i; } }); }

                        ctx.save();
                        ctx.font = `${small ? '600 10px' : '600 12px'} system-ui, Segoe UI, Roboto, Arial`;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        let lastShownX = -Infinity;
                        let lastPlacedBelow = false;
                        const placed = [];
                        const offsetUp = Number(opts.offsetY || 40);
                        const defaultOffsetBelow = small ? 30 : 26;
                        const offsetBelow = Number(opts.offsetBelow || defaultOffsetBelow);

                        const intersects = (a, b) => !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

                        for (let i=0;i<points.length;i++){
                            if (onlyMax && i!==maxIdx) continue;
                            const v = values[i]; if (!isFinite(v) || v===0) continue;
                            const p = points[i]; if (!p) continue;

                            // Evitar encimado entre etiquetas en modo "small"
                            if (!onlyMax && minGapX > 0) {
                                const prevVal = i>0 ? values[i-1] : -Infinity;
                                const nextVal = i<values.length-1 ? values[i+1] : -Infinity;
                                const isPeakLocal = v>=prevVal && v>=nextVal;
                                if ((p.x - lastShownX) < minGapX && !isPeakLocal) { continue; }
                            }

                            const period = (labels[i] != null) ? String(labels[i]) : '';
                            const valueTxt = formatFull(v, (opts.format||'int'));
                            const line1 = period;
                            const line2 = valueTxt;
                            const padX = small ? 8 : 10;
                            const padY = small ? 4 : 6;
                            const maxLineW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width);
                            const w = Math.ceil(maxLineW) + padX*2;
                            const lineH = 12 + 2; // font size + spacing
                            const h = (small ? 6 : 8) + lineH*2; // dos líneas con padding
                            let x = p.x; let y = p.y - offsetUp; // por defecto arriba del punto
                            let rx = Math.round(x - w/2), ry = Math.round(y - h/2);
                            // Decidir ubicación arriba/abajo: evita encimado alternando cuando están muy cerca
                            let placeBelow = false;
                            if (area && ry < area.top + 2) {
                                placeBelow = true;
                            } else if (minGapX > 0 && (p.x - lastShownX) < minGapX) {
                                placeBelow = !lastPlacedBelow; // alternar
                            }
                            if (placeBelow) { y = p.y + offsetBelow; rx = Math.round(x - w/2); ry = Math.round(y - h/2); }
                            // Limitar horizontalmente dentro del área del gráfico
                            if (area) {
                                if (rx < area.left + 2) rx = Math.round(area.left + 2);
                                if (rx + w > area.right - 2) rx = Math.round(area.right - 2 - w);
                            }

                            // Evitar encimado mediante detección de colisiones con otras etiquetas colocadas
                            let rect = { x: rx, y: ry, w, h };
                            let tries = 0;
                            while (placed.some(r => intersects(r, rect)) && tries < 6) {
                                tries++;
                                if (tries === 1) {
                                    // primer intento: alternar arriba/abajo
                                    placeBelow = !placeBelow;
                                    y = placeBelow ? (p.y + offsetBelow) : (p.y - offsetUp);
                                } else if (tries === 2) {
                                    // segundo: pequeño empuje vertical adicional
                                    const bump = small ? 10 : 12;
                                    y += placeBelow ? bump : -bump;
                                } else if (tries === 3) {
                                    // tercero: pequeño corrimiento horizontal hacia la izquierda
                                    x -= Math.min(12, Math.max(0, x - (area ? area.left + 10 : 10)));
                                } else {
                                    // cuarto: corrimiento horizontal hacia la derecha si es posible
                                    x += 12;
                                }
                                rx = Math.round(x - w/2);
                                ry = Math.round(y - h/2);
                                if (area) {
                                    if (rx < area.left + 2) rx = Math.round(area.left + 2);
                                    if (rx + w > area.right - 2) rx = Math.round(area.right - 2 - w);
                                    if (ry < area.top + 2) ry = Math.round(area.top + 2);
                                    if (ry + h > area.bottom - 2) ry = Math.round(area.bottom - 2 - h);
                                }
                                rect = { x: rx, y: ry, w, h };
                            }
                            // sombra sutil
                            ctx.save();
                            ctx.shadowColor = 'rgba(0,0,0,0.18)';
                            ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
                            // rect redondeado relleno con color de serie
                            const r = corner;
                            ctx.fillStyle = fillColor;
                            ctx.beginPath();
                            ctx.moveTo(rx + r, ry);
                            ctx.lineTo(rx + w - r, ry);
                            ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
                            ctx.lineTo(rx + w, ry + h - r);
                            ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
                            ctx.lineTo(rx + r, ry + h);
                            ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
                            ctx.lineTo(rx, ry + r);
                            ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                            ctx.closePath();
                            ctx.fill();
                            ctx.restore();
                            // borde
                            ctx.beginPath();
                            ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
                            ctx.moveTo(rx + r, ry);
                            ctx.lineTo(rx + w - r, ry);
                            ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
                            ctx.lineTo(rx + w, ry + h - r);
                            ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
                            ctx.lineTo(rx + r, ry + h);
                            ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
                            ctx.lineTo(rx, ry + r);
                            ctx.quadraticCurveTo(rx, ry, rx + r, ry);
                            ctx.closePath();
                            ctx.stroke();
                            // texto
                            ctx.fillStyle = textColor;
                            const cx = rx + w/2, cy = ry + h/2;
                            ctx.fillText(line1, cx, cy - 5);
                            ctx.fillText(line2, cx, cy + 9);
                            lastShownX = cx;
                            lastPlacedBelow = placeBelow;
                            placed.push(rect);
                        }
                        ctx.restore();
                    } catch(_){ /* noop */ }
                }
            };

            // Renderizado manual de todas las etiquetas del eje X para evitar auto-salto
            const CustomXAxisLabelsPlugin = {
                id: 'customXAxisLabels',
                afterDraw(chart, args, opts){
                    try {
                        if (!opts || opts.enabled !== true) return;
                        const scale = chart.scales?.x;
                        if (!scale) return;
                        const rawLabels = Array.isArray(opts.labels) ? opts.labels : [];
                        if (!rawLabels.length) return;

                        const sanitized = rawLabels.map((entry) => {
                            if (Array.isArray(entry)) {
                                return entry.map((line) => (line == null ? '' : String(line)));
                            }
                            return [(entry == null ? '' : String(entry))];
                        });

                        const ctx = chart.ctx;
                        ctx.save();
                        const fontSize = Math.max(8, Number(opts.fontSize) || 12);
                        const fontFamily = opts.fontFamily || 'system-ui, Segoe UI, Roboto, Arial';
                        const fontWeight = opts.fontWeight || '500';
                        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                        ctx.fillStyle = opts.color || '#6b7280';
                        const lineHeight = Math.max(10, Number(opts.lineHeight) || Math.round(fontSize * 1.18));
                        const rotationDeg = Number.isFinite(opts.rotationDegrees) ? opts.rotationDegrees : 0;
                        const rotationRad = rotationDeg * (Math.PI / 180);
                        const align = rotationDeg > 0 ? 'right' : rotationDeg < 0 ? 'left' : 'center';
                        ctx.textAlign = align;
                        ctx.textBaseline = 'top';
                        const baseOffset = Number.isFinite(opts.baseOffset) ? opts.baseOffset : 8;
                        const capLeft = scale.left + 4;
                        const capRight = scale.right - 4;

                        sanitized.forEach((tickLines, idx) => {
                            if (!tickLines || !tickLines.length) return;
                            const xBase = scale.getPixelForTick(idx);
                            if (!Number.isFinite(xBase)) return;
                            const yBase = scale.bottom + baseOffset;
                            ctx.save();
                            let drawX = xBase;
                            if (!rotationRad && align === 'center') {
                                const widest = tickLines.reduce((acc, text) => Math.max(acc, ctx.measureText(text).width), 0);
                                const overflowLeft = drawX - widest / 2 - capLeft;
                                if (overflowLeft < 0) drawX -= overflowLeft;
                                const overflowRight = (drawX + widest / 2) - capRight;
                                if (overflowRight > 0) drawX -= overflowRight;
                            } else {
                                if (drawX < capLeft) drawX = capLeft;
                                if (drawX > capRight) drawX = capRight;
                            }
                            ctx.translate(drawX, yBase);
                            if (rotationRad) ctx.rotate(rotationRad);
                            tickLines.forEach((text, lineIdx) => {
                                ctx.fillText(text, 0, lineIdx * lineHeight);
                            });
                            ctx.restore();
                        });

                        ctx.restore();
                    } catch (_) { /* noop */ }
                }
            };

            // Resalta el pico máximo con un glow sutil (debajo de etiquetas)
            const PeakGlowPlugin = {
                id: 'peakGlow',
                beforeDatasetsDraw(chart, args, opts){
                    try {
                        const ds = chart.data && chart.data.datasets && chart.data.datasets[0];
                        if (!ds) return;
                        const meta = chart.getDatasetMeta(0);
                        const data = (ds.data||[]).map(v => Number(v)||0);
                        if (!meta || !meta.data || !meta.data.length) return;
                        let maxVal = -Infinity, maxIdx = -1;
                        for (let i=0;i<data.length;i++){ if (data[i] > maxVal){ maxVal=data[i]; maxIdx=i; } }
                        if (maxIdx < 0) return;
                        const pt = meta.data[maxIdx]; if (!pt) return;
                        const ctx = chart.ctx;
                        ctx.save();
                        ctx.fillStyle = (opts && opts.color) ? hexToRgba(opts.color, 0.14) : 'rgba(0,0,0,0.10)';
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, 10, 0, Math.PI*2);
                        ctx.fill();
                        ctx.restore();
                    } catch(_) { /* noop */ }
                }
            };

            function makePeakCfg(canvas, labels, data, label, stroke, fillTop, fillBottom, animProfile, fmtType='int', traveler, xTitle='Periodo', titleText, extraTooltip, tickDetails=null){
                const bg = makeGradient(canvas, fillTop, fillBottom);
                const border = stroke;
                const processedData = Array.isArray(data)
                    ? data.map((value) => {
                        const num = Number(value);
                        return Number.isFinite(num) ? num : null;
                    })
                    : [];
                const numericData = processedData.filter((value) => value !== null);
                const maxVal = numericData.length ? Math.max(...numericData) : 0;
                const minVal = numericData.length ? Math.min(...numericData) : 0;
                const range = Math.max(0, maxVal - minVal);
                const lowerBand = range > 0
                    ? Math.max(range * 0.55, maxVal * 0.04)
                    : (maxVal > 0 ? maxVal * 0.25 : 10);
                const upperBand = range > 0
                    ? Math.max(range * 0.18, maxVal * 0.06)
                    : (maxVal > 0 ? maxVal * 0.18 : 10);
                let yAxisMin = Math.max(0, minVal - lowerBand);
                let yAxisMax = maxVal + upperBand;
                if (!Number.isFinite(yAxisMin)) yAxisMin = 0;
                if (!Number.isFinite(yAxisMax) || yAxisMax <= yAxisMin) {
                    const fallbackRange = maxVal > 0 ? Math.abs(maxVal) * 0.25 : 10;
                    yAxisMax = yAxisMin + fallbackRange;
                }
                const isDark = document.body.classList.contains('dark-mode');
                const emoji = fmtType==='pax' ? '🚶' : (fmtType==='ton' ? '🧳' : '✈');
                const finalTitle = titleText || `${emoji} ${label}`;
                const anim = Object.assign({ duration: 2600, easing: 'easeInOutCubic', stagger: 50 }, animProfile||{});
                const disableMotion = !!anim.disableMotion;
                if (disableMotion) {
                    anim.duration = 0;
                    anim.stagger = 0;
                }
                delete anim.disableMotion;
                const labelCount = Array.isArray(labels) ? labels.length : 0;
                const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0, 0);
                const isMobile = viewportWidth < 576;
                const isTablet = !isMobile && viewportWidth < 992;
                const smallMode = labelCount > 8;
                const canvasBaseWidth = (canvas && canvas.clientWidth) ? canvas.clientWidth : (canvas && canvas.width ? canvas.width : viewportWidth || 1024);
                const densityUnit = isMobile ? 64 : (isTablet ? 56 : 48);
                const denseThreshold = isMobile ? 8 : (isTablet ? 12 : 16);
                const targetWidth = labelCount > denseThreshold
                    ? Math.min(1300, Math.max(canvasBaseWidth, labelCount * densityUnit))
                    : canvasBaseWidth;
                const widthForSpacing = Math.max(canvasBaseWidth, targetWidth);
                const isYearAxis = Array.isArray(labels) && labels.length>0 && labels.every(l => /^\d{4}$/.test(String(l)));
                const steps = Math.max(1, (labelCount || 1) - 1);
                const approxStep = Math.max(1, (widthForSpacing - 60) / steps);
                const dynMinGapX = Math.max(16, smallMode ? approxStep * (isMobile ? 0.8 : 0.68) : approxStep * (isMobile ? 0.7 : 0.5));
                const dynOffsetY = isYearAxis ? (isMobile ? 44 : 40) : (isMobile ? 34 : (isTablet ? 38 : 44));
                const dynOffsetBelow = isYearAxis ? (isMobile ? 28 : 26) : (isMobile ? 24 : (isTablet ? 26 : 28));
                const xTickFont = isMobile ? 10 : (isTablet ? 11 : 12);
                const yTickFont = isMobile ? 10 : (isTablet ? 11 : 12);
                const yTickPadding = isMobile ? 6 : (isTablet ? 8 : 10);
                const maxTicks = isMobile ? 6 : (isTablet ? 8 : 12);
                let padTop = isMobile ? 52 : (isTablet ? 60 : 68);
                const padRight = isMobile ? 12 : (isTablet ? 14 : 16);
                let padBottom = isMobile ? 28 : (isTablet ? 24 : 22);
                const padLeft = isMobile ? 8 : 10;

                const radiusScale = isMobile ? 0.7 : (isTablet ? 0.85 : 1);
                const pointRadius = processedData.map((v) => {
                    const safeValue = Number.isFinite(v) ? v : 0;
                    const t = maxVal>0 ? (safeValue/maxVal) : 0;
                    const base = (2 + Math.min(3, t*2.5)) * radiusScale;
                    const baseline = Math.max(2.5 * radiusScale, base);
                    if (safeValue === maxVal && maxVal>0) {
                        return Math.max(baseline, 5.5 * radiusScale);
                    }
                    return baseline;
                });
                const pointHoverRadius = processedData.map((v) => {
                    const safeValue = Number.isFinite(v) ? v : 0;
                    const isPeak = safeValue === maxVal && maxVal > 0;
                    return isPeak ? Math.max(5, 6 * radiusScale) : Math.max(3, 4 * radiusScale);
                });

                if (isYearAxis) {
                    padTop += isMobile ? 18 : 12;
                    padBottom += isMobile ? 12 : 8;
                }

                const denseXAxis = !isYearAxis && labelCount >= 10;
                if (denseXAxis) {
                    padBottom = Math.max(padBottom, isMobile ? 62 : (isTablet ? 54 : 46));
                }
                const xMaxRotation = isYearAxis ? 0 : (denseXAxis ? (isMobile ? 48 : (isTablet ? 30 : 22)) : (isMobile ? 36 : (isTablet ? 20 : 0)));
                const xMinRotation = isYearAxis ? 0 : (denseXAxis ? (isMobile ? 24 : (isTablet ? 14 : 10)) : (isMobile ? 12 : 0));
                const tickPadding = isYearAxis ? 0 : (isMobile ? 8 : (isTablet ? 7 : (denseXAxis ? 4 : 6)));

                const monthLookup = {
                    'enero': 'Ene', 'febrero': 'Feb', 'marzo': 'Mar', 'abril': 'Abr',
                    'mayo': 'May', 'junio': 'Jun', 'julio': 'Jul', 'agosto': 'Ago',
                    'septiembre': 'Sep', 'setiembre': 'Sep', 'octubre': 'Oct', 'noviembre': 'Nov', 'diciembre': 'Dic'
                };
                const normalizeMonthToken = (token) => {
                    if (!token) return '';
                    try {
                        return token
                            .toString()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z]/gi, '')
                            .toLowerCase();
                    } catch (_) {
                        return token.toString().replace(/[^a-z]/gi, '').toLowerCase();
                    }
                };
                const formatTickLabel = (value) => {
                    if (value == null) return value;
                    const raw = typeof value === 'string' ? value : String(value);
                    const trimmed = raw.trim();
                    if (!trimmed) return trimmed;
                    if (/^\d{4}$/.test(trimmed)) return trimmed;
                    const rawTokens = trimmed.split(/\s+/).filter(Boolean);
                    const primaryToken = rawTokens.length ? rawTokens[0] : trimmed;
                    const normalizedPrimary = normalizeMonthToken(primaryToken);
                    let monthAbbr = monthLookup[normalizedPrimary];
                    if (!monthAbbr) {
                        const normalizedFull = normalizeMonthToken(trimmed.replace(/\s*\(.+\)$/, ''));
                        if (normalizedFull && monthLookup[normalizedFull]) {
                            monthAbbr = monthLookup[normalizedFull];
                        }
                    }
                    if (!monthAbbr && rawTokens.length > 1) {
                        const fallbackPrimary = normalizeMonthToken(rawTokens[0]);
                        if (fallbackPrimary && monthLookup[fallbackPrimary]) {
                            monthAbbr = monthLookup[fallbackPrimary];
                        }
                    }
                    if (monthAbbr) {
                        if (rawTokens.length > 1) {
                            const remainder = rawTokens.slice(1).join(' ');
                            return remainder ? [monthAbbr, remainder] : monthAbbr;
                        }
                        return monthAbbr;
                    }
                    if (isMobile && trimmed.length > 10){
                        const tokens = trimmed.split(/\s+/).filter(Boolean);
                        if (tokens.length > 1){
                            const mid = Math.ceil(tokens.length / 2);
                            return [tokens.slice(0, mid).join(' '), tokens.slice(mid).join(' ')];
                        }
                        return trimmed.length > 12 ? `${trimmed.slice(0, 9)}...` : trimmed;
                    }
                    if (isTablet && trimmed.length > 14){
                        const tokens = trimmed.split(/\s+/).filter(Boolean);
                        if (tokens.length > 1){
                            const mid = Math.ceil(tokens.length / 2);
                            return [tokens.slice(0, mid).join(' '), tokens.slice(mid).join(' ')];
                        }
                    }
                    if (denseXAxis && !/\s/.test(trimmed) && trimmed.length > (isMobile ? 5 : 6)){
                        const mid = Math.ceil(trimmed.length / 2);
                        const first = trimmed.slice(0, mid);
                        const second = trimmed.slice(mid);
                        return second ? [first, second] : [trimmed];
                    }
                    return trimmed;
                };

                const resolvedTitle = (()=>{
                    if (!isMobile || typeof finalTitle !== 'string') return finalTitle;
                    const clean = finalTitle.trim();
                    if (clean.length <= 24) return clean;
                    const parts = clean.split(/\s+/).filter(Boolean);
                    if (parts.length <= 1) return clean.length > 26 ? `${clean.slice(0, 24)}...` : clean;
                    const half = Math.ceil(parts.length / 2);
                    return [parts.slice(0, half).join(' '), parts.slice(half).join(' ')];
                })();

                // Opciones específicas para las burbujas en ejes de años (4-5 puntos)
                const bubbleShow = !isMobile || labelCount <= 12;
                const bubbleOpts = {
                    show: bubbleShow,
                    defaultShow: bubbleShow,
                    borderColor: border,
                    fillColor: border,
                    textColor: '#ffffff',
                    format: fmtType,
                    minGapX: Math.min(140, dynMinGapX),
                    small: isYearAxis ? true : (isMobile ? true : smallMode),
                    offsetY: dynOffsetY,
                    offsetBelow: dynOffsetBelow,
                    onlyMax: isMobile && labelCount > 12
                };

                const resolvedTickDetails = (Array.isArray(tickDetails) && tickDetails.length === labelCount)
                    ? tickDetails
                    : null;
                const useCustomXAxis = !isYearAxis && (denseXAxis || labelCount >= 6 || !!resolvedTickDetails);
                if (useCustomXAxis) {
                    padBottom = Math.max(padBottom, isMobile ? 70 : (isTablet ? 60 : 52));
                }
                const multilineLabels = labels.map((labelValue, idx) => {
                    if (resolvedTickDetails) {
                        const detail = resolvedTickDetails[idx];
                        if (Array.isArray(detail)) return detail.map((entry) => (entry == null ? '' : String(entry)));
                        return [detail == null ? '' : String(detail)];
                    }
                    const formatted = formatTickLabel(labelValue);
                    if (Array.isArray(formatted)) {
                        return formatted.map((entry) => (entry == null ? '' : String(entry)));
                    }
                    const text = formatted == null ? '' : String(formatted);
                    return [text];
                });
                const xAxisRotationDegrees = useCustomXAxis ? (denseXAxis ? (isMobile ? 38 : (isTablet ? 28 : 20)) : 0) : 0;
                const xAxisLineHeight = Math.round((xTickFont || 12) * (isMobile ? 1.28 : 1.18));
                const xAxisBaseOffset = useCustomXAxis ? (denseXAxis ? (isMobile ? 20 : 16) : (isMobile ? 14 : 12)) : 8;
                const xAxisLabelPluginConfig = useCustomXAxis ? {
                    enabled: true,
                    labels: multilineLabels,
                    fontSize: xTickFont,
                    fontFamily: 'system-ui, Segoe UI, Roboto, Arial',
                    fontWeight: '500',
                    color: theme.ticks,
                    rotationDegrees: xAxisRotationDegrees,
                    lineHeight: xAxisLineHeight,
                    baseOffset: xAxisBaseOffset
                } : false;

                // Plugin ligero para dar un extra de alto a la escala X en ejes anuales y evitar cortes
                const YearAxisFitPlugin = isYearAxis ? {
                    id: 'yearAxisFit',
                    afterFit(scale) {
                        try {
                            if (scale && scale.isHorizontal && scale.isHorizontal()) {
                                scale.height += isMobile ? 10 : 6;
                            }
                        } catch(_) {}
                    }
                } : null;
                const travelerEnabled = traveler && typeof traveler === 'object';
                const tooltipSizeHint = (() => {
                    const xTitleString = typeof xTitle === 'string' ? xTitle.toLowerCase() : '';
                    const isMonthlyAxis = xTitleString.includes('mes');
                    const isWeeklyAxis = xTitleString.includes('semana') || xTitleString.includes('sem ') || xTitleString.includes('día') || xTitleString.includes('dia');
                    const weeklyDense = isWeeklyAxis && labelCount >= 6;
                    const preferMicro = (isMonthlyAxis && opsTooltipsAlwaysOn) || weeklyDense;
                    if (preferMicro) return 'micro';
                    if (labelCount >= 30 || (isMonthlyAxis && labelCount >= 24)) return 'micro';
                    if (labelCount >= 22 || (isMonthlyAxis && labelCount >= 18)) return 'mini';
                    if (labelCount >= 16 || isMonthlyAxis) return 'compact';
                    return 'default';
                })();
                const variationAccessor = Array.isArray(extraTooltip?.variations)
                    ? (idx) => extraTooltip.variations[idx]
                    : () => null;
                const variationLabelText = extraTooltip?.variationLabel || 'Δ% vs período anterior';
                const formatYAxisTick = (value) => {
                    if (!Number.isFinite(value)) return value;
                    try {
                        return formatCompact ? formatCompact(value, fmtType) : value;
                    } catch (_) {
                        return value;
                    }
                };
                return {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [{
                            label,
                            data: processedData,
                            borderColor: border,
                            backgroundColor: bg,
                            borderWidth: 3,
                            pointBackgroundColor: border,
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1,
                            pointRadius,
                            pointHoverRadius,
                            tension: 0.25,
                            fill: true,
                            clip: false,
                            aifaTooltipConfig: {
                                theme: theme.tooltip,
                                formatValue: (value) => formatFull(value, fmtType),
                                getVariation: variationAccessor,
                                variationLabel: variationLabelText,
                                formatVariation: formatPercentDelta,
                                sizeHint: tooltipSizeHint
                            }
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: padTop, right: padRight, bottom: padBottom, left: padLeft } },
                        animation: disableMotion ? false : {
                            duration: anim.duration,
                            easing: anim.easing,
                            delay: (ctx) => ctx.type === 'data' ? (ctx.dataIndex * (anim.stagger||0)) : 0
                        },
                        animations: disableMotion ? {} : {
                            y: { easing: anim.easing, duration: anim.duration },
                            tension: { from: 0.6, to: 0.25, duration: Math.min(1200, anim.duration), easing: 'easeOutQuad' }
                        },
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: resolvedTitle,
                                align: 'start',
                                color: theme.labels,
                                padding: { top: 6, bottom: 8 },
                                font: { size: isMobile ? 13 : 14, weight: '600' }
                            },
                            tooltip: {
                                enabled: !opsTooltipsAlwaysOn,
                                backgroundColor: theme.tooltip.backgroundColor,
                                titleColor: theme.tooltip.titleColor,
                                bodyColor: theme.tooltip.bodyColor,
                                callbacks: {
                                    label: (ctx) => {
                                        const v = ctx.parsed.y;
                                        let line = `${ctx.dataset.label}: ${formatFull(v, fmtType)}`;
                                        const variationData = Array.isArray(extraTooltip?.variations) ? extraTooltip.variations : null;
                                        if (variationData) {
                                            const delta = variationData[ctx.dataIndex];
                                            if (delta != null) {
                                                const labelTxt = extraTooltip?.variationLabel || 'Δ% vs período anterior';
                                                const formattedDelta = formatPercentDelta(delta);
                                                if (formattedDelta) {
                                                    line += ` (${labelTxt}: ${formattedDelta})`;
                                                }
                                            }
                                        }
                                        return line;
                                    }
                                }
                            },
                            // Desactivamos completamente chartjs-plugin-datalabels
                            datalabels: false,
                            travelerPlugin: travelerEnabled ? traveler : false,
                            dataBubble: bubbleOpts,
                            customXAxisLabels: xAxisLabelPluginConfig
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                offset: false,
                                ticks: {
                                    display: !useCustomXAxis,
                                    color: theme.ticks,
                                    // No omitir etiquetas; las partimos en varias líneas si es necesario.
                                    autoSkip: false,
                                    maxTicksLimit: labels?.length || maxTicks,
                                    autoSkipPadding: tickPadding,
                                    stepSize: 1,
                                    source: 'labels',
                                    font: { size: xTickFont },
                                    minRotation: xMinRotation,
                                    maxRotation: xMaxRotation,
                                    callback: (val, index) => {
                                        let rawValue = val;
                                        if (typeof val === 'number' && Array.isArray(labels) && labels[val] != null) {
                                            rawValue = labels[val];
                                        } else if (labels && typeof index === 'number' && labels[index] != null && rawValue == null) {
                                            rawValue = labels[index];
                                        }
                                        if (Array.isArray(tickDetails)) {
                                            let detail = null;
                                            if (typeof index === 'number' && index >= 0) {
                                                detail = tickDetails[index];
                                            }
                                            if ((!detail || !detail.length) && typeof val === 'number' && val >= 0) {
                                                detail = tickDetails[val];
                                            }
                                            if ((!detail || !detail.length) && rawValue != null) {
                                                const lookupIndex = Array.isArray(labels) ? labels.indexOf(rawValue) : -1;
                                                if (lookupIndex >= 0) detail = tickDetails[lookupIndex];
                                            }
                                            if (detail && detail.length) return detail;
                                        }
                                        return formatTickLabel(rawValue);
                                    }
                                },
                                title: { display: true, text: xTitle, color: theme.labels, font: { weight: '600' } },
                                afterBuildTicks(scale){
                                    try {
                                        if (!Array.isArray(labels) || !labels.length) return;
                                        const normalized = labels.map((labelText, idx) => ({ value: idx, label: labelText }));
                                        if (Array.isArray(tickDetails) && tickDetails.length === normalized.length) {
                                            scale.ticks = normalized.map((tick, idx) => ({
                                                value: tick.value,
                                                label: tickDetails[idx]
                                            }));
                                        } else {
                                            scale.ticks = normalized;
                                        }
                                        if (scale?.options?.ticks) {
                                            scale.options.ticks.autoSkip = false;
                                            scale.options.ticks.maxTicksLimit = normalized.length;
                                            scale.options.ticks.sampleSize = normalized.length;
                                            scale.options.ticks.stepSize = 1;
                                            scale.options.ticks.display = !useCustomXAxis;
                                        }
                                        if (typeof scale.autoSkip === 'boolean') {
                                            scale.autoSkip = false;
                                        }
                                        if (typeof scale.tickAutoSkip === 'boolean') {
                                            scale.tickAutoSkip = false;
                                        }
                                        if (typeof scale.ticksLength === 'number') {
                                            scale.ticksLength = normalized.length;
                                        }
                                        if (typeof scale.tickAutoSkipEnabled === 'function') {
                                            scale.tickAutoSkipEnabled = () => false;
                                        }
                                        if (scale._cache && typeof scale._cache === 'object') {
                                            scale._cache.ticks = normalized;
                                            scale._cache.labels = labels;
                                        }
                                        if (typeof scale.min === 'number') scale.min = 0;
                                        if (typeof scale.max === 'number') scale.max = normalized.length ? normalized.length - 1 : scale.max;
                                    } catch (_) { /* noop */ }
                                }
                            },
                            y: {
                                beginAtZero: false,
                                min: yAxisMin,
                                max: yAxisMax,
                                grid: {
                                    color: theme.grid,
                                    drawBorder: false,
                                    borderDash: [4, 4],
                                    zeroLineColor: theme.grid
                                },
                                ticks: {
                                    color: theme.ticks,
                                    font: { size: yTickFont },
                                    padding: yTickPadding,
                                    maxTicksLimit: isMobile ? 5 : 8,
                                    callback: formatYAxisTick
                                }
                            }
                        }
                    },
                    plugins: [opsPersistentTooltipPlugin, PeakGlowPlugin]
                        .concat(travelerEnabled ? [TravelerPlugin] : [])
                        .concat([DataBubblePlugin])
                        .concat(useCustomXAxis ? [CustomXAxisLabelsPlugin] : [])
                        .concat(YearAxisFitPlugin ? [YearAxisFitPlugin] : [])
                };
            }

        // Preparar datos según modo
    const opsAggregated = getOpsAggregatedData();
    const yearly = opsAggregated.yearly;
    const monthly = opsAggregated.monthly;
    const weekly = getActiveWeeklyDataset();
        const mode = opsUIState.mode || 'yearly';
        const useMonthly = mode === 'monthly';
        const useWeekly = mode === 'weekly';

        // Construir labels y series
    let labels = [];
    let tickDetails = null;
        const series = {
            comercialOps: [], comercialPax: [],
            cargaOps: [], cargaTon: [],
            generalOps: [], generalPax: []
        };

        const variations = {
            comercialOps: [], comercialPax: [],
            cargaOps: [], cargaTon: [],
            generalOps: [], generalPax: []
        };

        if (useWeekly) {
            const days = Array.isArray(weekly?.dias) ? weekly.dias : [];
            const selectedDay = opsUIState.weeklyDay || 'all';
            let filteredDays = days.filter(d => selectedDay === 'all' ? true : d?.fecha === selectedDay);
            if (!filteredDays.length) filteredDays = days;
            const prevDayMap = new Map();
            for (let i = 0; i < days.length; i++) {
                const current = days[i];
                const prev = i > 0 ? days[i - 1] : null;
                if (current?.fecha) prevDayMap.set(current.fecha, prev || null);
            }
            const labelInfo = filteredDays.map((d, idx) => {
                const fallback = `Día ${idx + 1}`;
                const dayLabel = (d?.label && d.label.trim()) ? d.label.trim() : (d?.fecha || fallback);
                const dateLabel = (d?.labelDate && d.labelDate.trim())
                    ? d.labelDate.trim()
                    : (() => {
                        if (!d?.fecha) return '';
                        const parsed = parseIsoDay(d.fecha);
                        return parsed ? formatShortSpanishDate(parsed) : '';
                    })();
                return {
                    day: dayLabel,
                    date: dateLabel
                };
            });
            labels = labelInfo.map(info => info.day || '');
            tickDetails = labelInfo.map(info => {
                const lines = [];
                if (info.day) lines.push(info.day);
                if (info.date && info.date !== info.day) lines.push(info.date);
                return lines.length ? lines : [info.day];
            });
            const seriesBuilders = [
                ['comercialOps', 'comercial', 'operaciones'],
                ['comercialPax', 'comercial', 'pasajeros'],
                ['cargaOps', 'carga', 'operaciones'],
                ['cargaTon', 'carga', 'toneladas'],
                ['generalOps', 'general', 'operaciones'],
                ['generalPax', 'general', 'pasajeros']
            ];
            seriesBuilders.forEach(([key, category, metric]) => {
                series[key] = filteredDays.map(d => getWeeklyValue(d, category, metric));
                variations[key] = filteredDays.map(d => {
                    const previous = d?.fecha ? prevDayMap.get(d.fecha) : null;
                    return computeWeeklyVariation(d, category, metric, previous);
                });
            });
        } else if (!useMonthly) {
            const selYears = Array.from(opsUIState.years).sort();
            labels = selYears;
            const pick = (arr, key) => selYears.map(y => (arr.find(d=> String(d.periodo)===y)?.[key] ?? 0));
            series.comercialOps = pick(yearly.comercial, 'operaciones');
            series.comercialPax = pick(yearly.comercial, 'pasajeros');
            series.cargaOps     = pick(yearly.carga, 'operaciones');
            series.cargaTon     = pick(yearly.carga, 'toneladas');
            series.generalOps   = pick(yearly.general, 'operaciones');
            series.generalPax   = pick(yearly.general, 'pasajeros');
            variations.comercialOps = computeSequentialPercent(series.comercialOps);
            variations.comercialPax = computeSequentialPercent(series.comercialPax);
            variations.cargaOps     = computeSequentialPercent(series.cargaOps);
            variations.cargaTon     = computeSequentialPercent(series.cargaTon);
            variations.generalOps   = computeSequentialPercent(series.generalOps);
            variations.generalPax   = computeSequentialPercent(series.generalPax);
        } else {
            const selMonths = Array.from(opsUIState.months2025).sort();
            labels = monthly.comercial.filter(m => selMonths.includes(m.mes)).map(m => m.label);
            // Comercial
            series.comercialOps = monthly.comercial.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.comercialPax = monthly.comercialPasajeros.filter(m => selMonths.includes(m.mes)).map(m => m.pasajeros || 0);
            // Carga
            series.cargaOps = monthly.carga.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.cargaTon = monthly.cargaToneladas.filter(m => selMonths.includes(m.mes)).map(m => m.toneladas || 0);
            // General
            series.generalOps = monthly.general.operaciones.filter(m => selMonths.includes(m.mes)).map(m => m.operaciones || 0);
            series.generalPax = monthly.general.pasajeros.filter(m => selMonths.includes(m.mes)).map(m => m.pasajeros || 0);
            variations.comercialOps = computeSequentialPercent(series.comercialOps);
            variations.comercialPax = computeSequentialPercent(series.comercialPax);
            variations.cargaOps     = computeSequentialPercent(series.cargaOps);
            variations.cargaTon     = computeSequentialPercent(series.cargaTon);
            variations.generalOps   = computeSequentialPercent(series.generalOps);
            variations.generalPax   = computeSequentialPercent(series.generalPax);
    }

    const periodLabel = useWeekly ? 'Día' : (useMonthly ? 'Mes' : 'Año');

    let variationLabel;
    if (useWeekly) variationLabel = 'Δ% vs día previo';
    else if (useMonthly) variationLabel = 'Δ% vs mes previo';
    else variationLabel = 'Δ% vs año previo';

    const getVariationPayload = (arr) => (Array.isArray(arr) && arr.length ? { variations: arr, variationLabel } : null);

    // Destruir charts previos y renderizar visibles
        destroyOpsCharts();
        const showComBase = !!opsUIState.sections.comercial;
        const showCarBase = !!opsUIState.sections.carga;
        const showGenBase = !!opsUIState.sections.general;
        const presetMode = opsUIState.preset || 'full';
        const showOpsCharts = presetMode === 'full' || presetMode === 'ops';
        const showPassengerCharts = presetMode === 'full' || presetMode === 'pax';
        const showCargoTonCharts = presetMode === 'full' || presetMode === 'cargoTon';

        const showCommercialSection = showComBase && (showOpsCharts || showPassengerCharts);
        const showCargoSection = showCarBase && (showOpsCharts || showCargoTonCharts);
        const showGeneralSection = showGenBase && (showOpsCharts || showPassengerCharts);

        // Helpers para mostrar/ocultar grupos y charts específicos
        const setVisible = (selector, vis) => { const el = document.querySelector(selector); if (el) el.style.display = vis ? '' : 'none'; };
        setVisible('#commercial-heading', showCommercialSection);
        setVisible('#commercial-group', showCommercialSection);
        setVisible('#cargo-heading', showCargoSection);
        setVisible('#cargo-update-note', showCargoSection);
        setVisible('#cargo-group', showCargoSection);
        setVisible('#general-heading', showGeneralSection);
        setVisible('#general-group', showGeneralSection);

        setVisible('#commercial-group canvas#commercialOpsChart', showCommercialSection && showOpsCharts);
        setVisible('#commercial-group canvas#commercialPaxChart', showCommercialSection && showPassengerCharts);
        setVisible('#cargo-group canvas#cargoOpsChart', showCargoSection && showOpsCharts);
        setVisible('#cargo-group canvas#cargoTonsChart', showCargoSection && showCargoTonCharts);
        setVisible('#general-group canvas#generalOpsChart', showGeneralSection && showOpsCharts);
        setVisible('#general-group canvas#generalPaxChart', showGeneralSection && showPassengerCharts);

            // Comercial
        if (showCommercialSection) {
            const c1 = document.getElementById('commercialOpsChart');
            const c2 = document.getElementById('commercialPaxChart');
            if (showOpsCharts && c1) opsCharts.commercialOpsChart = new Chart(c1, makePeakCfg(
                c1, labels, series.comercialOps,
                'Operaciones', '#1e88e5', 'rgba(66,165,245,0.35)', 'rgba(21,101,192,0.05)',
                { easing:'easeOutQuart', duration: 4800, stagger: 110, disableMotion: true },
                'int', { type:'plane', speed: 20000, scale: 1.25 }, periodLabel, '✈ Operaciones (Comercial)',
                getVariationPayload(variations.comercialOps),
                tickDetails
            ));
            if (showPassengerCharts && c2) opsCharts.commercialPaxChart = new Chart(c2, makePeakCfg(
                c2, labels, series.comercialPax,
                'Pasajeros', '#1565c0', 'rgba(33,150,243,0.35)', 'rgba(13,71,161,0.05)',
                { easing:'easeOutElastic', duration: 5200, stagger: 160, disableMotion: true },
                'pax', { type:'person', speed: 22000, scale: 0.9 }, periodLabel, '🚶 Pasajeros (Comercial)',
                getVariationPayload(variations.comercialPax),
                tickDetails
            ));
        }
            // Carga
        if (showCargoSection) {
            const k1 = document.getElementById('cargoOpsChart');
            const k2 = document.getElementById('cargoTonsChart');
            if (showOpsCharts && k1) opsCharts.cargoOpsChart = new Chart(k1, makePeakCfg(
                k1, labels, series.cargaOps,
                'Operaciones', '#fb8c00', 'rgba(255,183,77,0.35)', 'rgba(239,108,0,0.05)',
                { easing:'easeOutBack', duration: 5000, stagger: 140, disableMotion: true },
                'int', { type:'plane', speed: 24000, scale: 1.35 }, periodLabel, '✈ Operaciones (Carga)',
                getVariationPayload(variations.cargaOps),
                tickDetails
            ));
            if (showCargoTonCharts && k2) opsCharts.cargoTonsChart = new Chart(k2, makePeakCfg(
                k2, labels, series.cargaTon,
                'Toneladas', '#f57c00', 'rgba(255,204,128,0.35)', 'rgba(230,81,0,0.05)',
                { easing:'easeOutCubic', duration: 5600, stagger: 170, disableMotion: true },
                'ton', { type:'suitcase', speed: 26000, scale: 1.5 }, periodLabel, '🧳 Toneladas (Carga)',
                getVariationPayload(variations.cargaTon),
                tickDetails
            ));
        }
            // General
        if (showGeneralSection) {
            const g1 = document.getElementById('generalOpsChart');
            const g2 = document.getElementById('generalPaxChart');
            if (showOpsCharts && g1) opsCharts.generalOpsChart = new Chart(g1, makePeakCfg(
                g1, labels, series.generalOps,
                'Operaciones', '#2e7d32', 'rgba(129,199,132,0.35)', 'rgba(27,94,32,0.05)',
                { easing:'easeOutQuart', duration: 4800, stagger: 130, disableMotion: true },
                'int', { type:'plane', speed: 22000, scale: 1.3 }, periodLabel, '✈ Operaciones (General)',
                getVariationPayload(variations.generalOps),
                tickDetails
            ));
            if (showPassengerCharts && g2) opsCharts.generalPaxChart = new Chart(g2, makePeakCfg(
                g2, labels, series.generalPax,
                'Pasajeros', '#1b5e20', 'rgba(165,214,167,0.35)', 'rgba(27,94,32,0.05)',
                { easing:'easeOutElastic', duration: 5200, stagger: 160, disableMotion: true },
                'pax', { type:'person', speed: 23000, scale: 0.9 }, periodLabel, '🚶 Pasajeros (General)',
                getVariationPayload(variations.generalPax),
                tickDetails
            ));
        }

    updateCargoLegend(useWeekly ? weekly : getActiveWeeklyDataset());

    // Iniciar animación de viajeros
    startOpsAnim();
    applyOpsTooltipsStateToCharts();

    // Actualizar resumen en función del modo/filtros
        try { updateOpsSummary(); } catch(_) {}
        scheduleOpsViewportUpdate();
    } catch (e) { console.warn('renderOperacionesTotales error:', e); }
    
    // Detectar errores después de renderizar
    setTimeout(detectChartErrors, 300);
}

// Exponer función globalmente para reinicialización
window.renderOperacionesTotales = renderOperacionesTotales;

function updateOpsSummary() {
    try {
        const container = document.getElementById('ops-summary');
        if (!container) return;

        const fmtInt = (value) => Number(value || 0).toLocaleString('es-MX');
        const fmtTon = (value) => Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
        const makeCard = (iconClass, label, value, subLabel, extraClasses = []) => {
            const classes = ['ops-summary-pill', ...extraClasses.filter(Boolean)].join(' ');
            return `
            <div class="${classes}" role="group" aria-label="${label}">
                <span class="pill-icon"><i class="${iconClass}" aria-hidden="true"></i></span>
                <div class="pill-text">
                    <span class="pill-label">${label}</span>
                    <span class="pill-value">${value}</span>
                    ${subLabel ? `<span class="pill-sub">${subLabel}</span>` : ''}
                </div>
            </div>`;
        };

        let headerMarkup = '';
        let captionMarkup = '';
        let cards = [];
        let recommendationMarkup = '';
        const sections = opsUIState.sections || {};
        const showCom = sections.comercial !== false;
        const showCar = sections.carga !== false;
        const showGen = sections.general !== false;
        const heroBackgroundImage = 'images/fondo-aifa.jpg';
        const buildHero = (variant, iconClass, periodLabel, detailText, badgeLabel) => {
            const detail = (detailText || '').trim();
            const badge = (badgeLabel || '').trim();
            return `
            <div class="ops-summary-hero ${variant}" style="--ops-hero-media-image: url('${heroBackgroundImage}')">
                <div class="ops-summary-hero-media" aria-hidden="true">
                    <div class="ops-summary-hero-overlay"></div>
                </div>
                <span class="ops-summary-hero-icon" aria-hidden="true">
                    <span class="ops-summary-hero-icon-inner"><i class="${iconClass}" aria-hidden="true"></i></span>
                </span>
                <div class="ops-summary-hero-body">
                    <span class="ops-summary-hero-kicker">Periodo activo</span>
                    <span class="ops-summary-hero-period">${periodLabel}</span>
                    ${detail ? `<span class="ops-summary-hero-caption">${detail}</span>` : ''}
                </div>
                ${badge ? `<span class="ops-summary-hero-badge">${badge}</span>` : ''}
            </div>`;
        };

        const opsAggregated = getOpsAggregatedData();
        const yData = opsAggregated.yearly;
        const monthlyAggregated = opsAggregated.monthly;
        const mode = opsUIState.mode || 'yearly';
        const activeMonthlyYear = getOpsActiveMonthlyYear();

        if (mode === 'yearly') {
            const years = Array.from(opsUIState.years).sort();
            if (!years.length) {
                container.innerHTML = '<div class="ops-summary-empty text-muted">Selecciona al menos un año para ver el resumen.</div>';
                return;
            }

            const sumForYears = (collection, key) => collection
                .filter(entry => years.includes(String(entry.periodo)))
                .reduce((acc, entry) => acc + Number(entry?.[key] ?? 0), 0);

            const commercialOps = sumForYears(yData.comercial, 'operaciones');
            const commercialPax = sumForYears(yData.comercial, 'pasajeros');
            const cargoOps = sumForYears(yData.carga, 'operaciones');
            const cargoTon = sumForYears(yData.carga, 'toneladas');
            const generalOps = sumForYears(yData.general, 'operaciones');
            const generalPax = sumForYears(yData.general, 'pasajeros');

            const firstYear = years[0];
            const lastYear = years[years.length - 1];
            const periodLabel = years.length === 1
                ? `Año ${firstYear}`
                : `Años ${firstYear}–${lastYear}`;
            const badgeLabel = years.length === 1 ? 'Vista anual' : `${years.length} años acumulados`;
            const detail = years.length === 1
                ? `Periodo seleccionado: ${firstYear}`
                : `Periodos seleccionados: ${years.join(' · ')}`;

            headerMarkup = buildHero('ops-summary-hero--yearly', 'fas fa-calendar-alt', periodLabel, detail, badgeLabel);
            captionMarkup = '';
            if (showCom) {
                cards.push(
                    makeCard('fas fa-plane-departure', 'Comercial', fmtInt(commercialOps), 'Operaciones acumuladas', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-friends', 'Comercial', fmtInt(commercialPax), 'Pasajeros acumulados', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-passengers'])
                );
            }
            if (showCar) {
                cards.push(
                    makeCard('fas fa-box-open', 'Carga', fmtInt(cargoOps), 'Operaciones acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-weight-hanging', 'Carga', fmtTon(cargoTon), 'Toneladas acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ton'])
                );
            }
            if (showGen) {
                cards.push(
                    makeCard('fas fa-paper-plane', 'General', fmtInt(generalOps), 'Operaciones acumuladas', ['ops-summary-pill--general', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-check', 'General', fmtInt(generalPax), 'Pasajeros acumulados', ['ops-summary-pill--general', 'ops-summary-pill--metric-passengers'])
                );
            }
        } else if (mode === 'monthly') {
            const monthly = monthlyAggregated;
            const selectedMonths = Array.from(opsUIState.months2025).sort();
            if (!selectedMonths.length) {
                container.innerHTML = `<div class="ops-summary-empty text-muted">Selecciona al menos un mes de ${activeMonthlyYear} para ver el resumen.</div>`;
                return;
            }
            const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const entriesForMonth = (code) => [
                monthly.comercial.find(entry => entry.mes === code),
                monthly.comercialPasajeros.find(entry => entry.mes === code),
                monthly.carga.find(entry => entry.mes === code),
                monthly.cargaToneladas.find(entry => entry.mes === code),
                ...(Array.isArray(monthly.general?.operaciones) ? [monthly.general.operaciones.find(entry => entry.mes === code)] : []),
                ...(Array.isArray(monthly.general?.pasajeros) ? [monthly.general.pasajeros.find(entry => entry.mes === code)] : [])
            ].filter(Boolean);
            const entryHasRealData = (entry) => {
                if (!entry) return false;
                if (typeof entry.label === 'string' && entry.label.toLowerCase().includes('proy')) return false;
                return Object.entries(entry)
                    .filter(([key]) => key !== 'mes' && key !== 'label')
                    .some(([, value]) => value !== null && value !== undefined && value !== '');
            };
            const hasRealData = (code) => entriesForMonth(code).some(entryHasRealData);
            const monthsWithData = selectedMonths.filter(hasRealData);
            if (!monthsWithData.length) {
                container.innerHTML = '<div class="ops-summary-empty text-muted">No hay datos confirmados para los meses seleccionados.</div>';
                return;
            }
            const monthsWithoutData = selectedMonths.filter(code => !monthsWithData.includes(code));
            const labelForMonth = (code) => {
                const entry = entriesForMonth(code).find(item => item?.label) || {};
                if (entry.label) {
                    return entry.label.replace('(Proy.)', '').replace('Proy.', '').trim();
                }
                const idx = Number(code) - 1;
                return monthNames[idx] || code;
            };

            const sum = (arr, key) => arr
                .filter(item => monthsWithData.includes(item.mes))
                .reduce((acc, item) => acc + Number(item[key] ?? 0), 0);

            const commercialOps = sum(monthly.comercial, 'operaciones');
            const commercialPax = sum(monthly.comercialPasajeros, 'pasajeros');
            const cargoOps = sum(monthly.carga, 'operaciones');
            const cargoTon = sum(monthly.cargaToneladas, 'toneladas');
            const generalOps = sum(monthly.general.operaciones, 'operaciones');
            const generalPax = sum(monthly.general.pasajeros, 'pasajeros');

            const availableLabels = monthsWithData.map(labelForMonth);
            const listPreview = availableLabels.slice(0, 4).join(', ');
            const extraCount = availableLabels.length - 4;
            const extraLabel = extraCount > 0 ? ` y +${extraCount}` : '';

            const periodTitle = monthsWithData.length === 1 ? (availableLabels[0] || `Mes con datos ${activeMonthlyYear}`) : `${monthsWithData.length} meses con datos ${activeMonthlyYear}`;
            const summaryPreview = availableLabels.length <= 4 ? availableLabels.join(', ') : `${listPreview}${extraLabel}`;
            const showingAllMonths = monthsWithData.length === 12;
            const detail = showingAllMonths
                ? `Los datos mostrados incluyen los 12 meses seleccionados de ${activeMonthlyYear}.`
                : `Los datos mostrados corresponden a los meses seleccionados con datos confirmados: ${summaryPreview}.`;
            const badgeLabel = showingAllMonths
                ? `Cobertura anual ${activeMonthlyYear}`
                : `${monthsWithData.length} ${monthsWithData.length === 1 ? 'mes con datos' : 'meses con datos'}`;
            headerMarkup = buildHero('ops-summary-hero--monthly', 'fas fa-calendar-week', periodTitle, detail, badgeLabel);
            captionMarkup = monthsWithoutData.length
                ? `<div class="text-warning small mt-2">Los meses seleccionados sin datos confirmados no se muestran en las gráficas: ${monthsWithoutData.map(labelForMonth).join(', ')}</div>`
                : '';
            if (showCom) {
                cards.push(
                    makeCard('fas fa-plane-departure', 'Comercial', fmtInt(commercialOps), 'Operaciones acumuladas', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-friends', 'Comercial', fmtInt(commercialPax), 'Pasajeros acumulados', ['ops-summary-pill--comercial', 'ops-summary-pill--metric-passengers'])
                );
            }
            if (showCar) {
                cards.push(
                    makeCard('fas fa-box-open', 'Carga', fmtInt(cargoOps), 'Operaciones acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-weight-hanging', 'Carga', fmtTon(cargoTon), 'Toneladas acumuladas', ['ops-summary-pill--carga', 'ops-summary-pill--metric-ton'])
                );
            }
            if (showGen) {
                cards.push(
                    makeCard('fas fa-paper-plane', 'General', fmtInt(generalOps), 'Operaciones acumuladas', ['ops-summary-pill--general', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-check', 'General', fmtInt(generalPax), 'Pasajeros acumulados', ['ops-summary-pill--general', 'ops-summary-pill--metric-passengers'])
                );
            }
        } else {
            const weekly = getActiveWeeklyDataset();
            const days = Array.isArray(weekly?.dias) ? weekly.dias : [];
            if (!days.length) {
                container.innerHTML = '<div class="ops-summary-empty text-muted">No hay datos semanales disponibles.</div>';
                return;
            }
            const selectedDay = opsUIState.weeklyDay || 'all';
            let targetDays = days.filter(d => selectedDay === 'all' ? true : d?.fecha === selectedDay);
            if (!targetDays.length) targetDays = days;
            const sumCat = (category, metric) => targetDays.reduce((acc, day) => acc + getWeeklyValue(day, category, metric), 0);
            const commercialOps = sumCat('comercial', 'operaciones');
            const commercialPax = sumCat('comercial', 'pasajeros');
            const cargoOps = sumCat('carga', 'operaciones');
            const cargoTon = sumCat('carga', 'toneladas');
            const generalOps = sumCat('general', 'operaciones');
            const generalPax = sumCat('general', 'pasajeros');

            const range = weekly?.rango || {};
            const firstTargetDay = targetDays[0] || {};
            const fullDayLabel = firstTargetDay?.labelFull || '';
            const fallbackDayLabel = firstTargetDay?.label || '';
            const fallbackIsoLabel = firstTargetDay?.fecha ? formatSpanishDate(firstTargetDay.fecha) : '';
            const rangeLabel = selectedDay !== 'all'
                ? (fullDayLabel || fallbackDayLabel || fallbackIsoLabel || 'Jornada seleccionada')
                : (range.descripcion || (range.inicio && range.fin ? `Semana del ${formatSpanishDate(range.inicio)} al ${formatSpanishDate(range.fin)}` : 'Semana reciente'));
            const extraNotes = [];
            if (weekly?.meta?.notice) extraNotes.push(weekly.meta.notice);
            if (range?.nota) extraNotes.push(range.nota);
            const captionText = extraNotes.length ? extraNotes.map(escapeHtml).join('<br>') : '';
            const suffixOps = selectedDay === 'all' ? 'Operaciones semana' : 'Operaciones del día';
            const suffixPax = selectedDay === 'all' ? 'Pasajeros semana' : 'Pasajeros del día';
            const suffixTon = selectedDay === 'all' ? 'Toneladas semana' : 'Toneladas del día';

            const badgeLabel = selectedDay === 'all' ? 'Vista semanal' : 'Vista por día';
            headerMarkup = buildHero('ops-summary-hero--weekly', selectedDay === 'all' ? 'fas fa-calendar-week' : 'fas fa-calendar-day', rangeLabel, captionText, badgeLabel);
            captionMarkup = '';
            if (showCom) {
                cards.push(
                    makeCard('fas fa-plane-departure', 'Comercial', fmtInt(commercialOps), suffixOps, ['ops-summary-pill--comercial', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-friends', 'Comercial', fmtInt(commercialPax), suffixPax, ['ops-summary-pill--comercial', 'ops-summary-pill--metric-passengers'])
                );
            }
            if (showCar) {
                cards.push(
                    makeCard('fas fa-box-open', 'Carga', fmtInt(cargoOps), suffixOps, ['ops-summary-pill--carga', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-weight-hanging', 'Carga', fmtTon(cargoTon), suffixTon, ['ops-summary-pill--carga', 'ops-summary-pill--metric-ton'])
                );
            }
            if (showGen) {
                cards.push(
                    makeCard('fas fa-paper-plane', 'General', fmtInt(generalOps), suffixOps, ['ops-summary-pill--general', 'ops-summary-pill--metric-ops']),
                    makeCard('fas fa-user-check', 'General', fmtInt(generalPax), suffixPax, ['ops-summary-pill--general', 'ops-summary-pill--metric-passengers'])
                );
            }
            // recommendation intentionally removed per latest UI guidance
        }

        if (!cards.length) {
            container.innerHTML = '<div class="ops-summary-empty text-muted">Activa al menos una categoría para ver las tarjetas.</div>';
            return;
        }

        const generalOnly = cards.length > 0 && cards.every(card => card.includes('ops-summary-pill--general'));
        const gridClass = generalOnly ? 'ops-summary-grid ops-summary-grid--general-only' : 'ops-summary-grid';

        container.innerHTML = `
            <div class="ops-summary-wrapper">
                ${headerMarkup}
                ${captionMarkup}
                <div class="${gridClass}">
                    ${cards.join('')}
                </div>
                ${recommendationMarkup}
            </div>
        `;
    } catch (e) { /* ignore */ }
}

// Exponer función globalmente para reinicialización
window.updateOpsSummary = updateOpsSummary;

// Función para verificar que las gráficas se crearon correctamente
function verifyChartsCreated(sectionId) {
    console.log(`🔍 Verificando gráficas de sección: ${sectionId}`);
    
    if (sectionId === 'operaciones-totales') {
        const sections = opsUIState.sections || {};
        const showCom = sections.comercial !== false;
        const showCar = sections.carga !== false;
        const showGen = sections.general !== false;
        const presetMode = opsUIState.preset || 'full';
        const showOpsCharts = presetMode === 'full' || presetMode === 'ops';
        const showPassengerCharts = presetMode === 'full' || presetMode === 'pax';
        const showCargoTonCharts = presetMode === 'full' || presetMode === 'cargoTon';

        const expectedCharts = [];
        if (showCom && showOpsCharts) expectedCharts.push('commercialOpsChart');
        if (showCom && showPassengerCharts) expectedCharts.push('commercialPaxChart');
        if (showCar && showOpsCharts) expectedCharts.push('cargoOpsChart');
        if (showCar && showCargoTonCharts) expectedCharts.push('cargoTonsChart');
        if (showGen && showOpsCharts) expectedCharts.push('generalOpsChart');
        if (showGen && showPassengerCharts) expectedCharts.push('generalPaxChart');

        if (!expectedCharts.length) {
            console.log('ℹ️ Vista seleccionada no requiere gráficas en Operaciones Totales.');
            return true;
        }

        let createdCount = 0;
        expectedCharts.forEach(chartKey => {
            if (opsCharts[chartKey] && opsCharts[chartKey].data) {
                createdCount++;
                console.log(`✅ ${chartKey} creado correctamente`);
            } else {
                console.warn(`❌ ${chartKey} NO se creó`);
            }
        });

        return createdCount === expectedCharts.length;
        
    } else if (sectionId === 'itinerario') {
        const expectedCanvases = [
            'paxArrivalsChart', 'paxDeparturesChart',
            'cargoArrivalsChart', 'cargoDeparturesChart'
        ];
        
        let createdCount = 0;
        expectedCanvases.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            const chart = canvas ? Chart.getChart(canvas) : null;
            if (chart && chart.data) {
                createdCount++;
                console.log(`✅ ${canvasId} creado correctamente`);
            } else {
                console.warn(`❌ ${canvasId} NO se creó`);
            }
        });
        
        return createdCount === expectedCanvases.length;
        
    } else if (sectionId === 'demoras') {
        const hasChart = window.opsCharts && window.opsCharts.delaysPieChart;
        if (hasChart) {
            console.log(`✅ delaysPieChart creado correctamente`);
        } else {
            console.warn(`❌ delaysPieChart NO se creó`);
        }
        return hasChart;
    }
    
    return true; // Para otras secciones sin gráficas específicas
}

// Demoras: renderizar tabla y gráfica simple
// [extraído] renderDemoras moved to js/demoras.js

// Estadística diaria mínima para tarjetas de Operaciones Totales
function computeDailyStats() {
    try {
        // Heurística: usa flights del día "hoy" y cuenta por categoría
        const today = new Date();
        const y = today.getFullYear(), m = String(today.getMonth()+1).padStart(2,'0'), d = String(today.getDate()).padStart(2,'0');
        const dmy = `${d}/${m}/${y}`;
        const isPax = f => (String(f.categoria||'').toLowerCase()==='pasajeros');
        const isCargo = f => (String(f.categoria||'').toLowerCase()==='carga');
        let c = { ayer: 0, hoy: 0, trend: '=' }, k={ ayer:0, hoy:0, trend:'=' }, g={ ayer:0, hoy:0, trend:'=' };
        const countFor = (ymd, pred) => allFlightsData.filter(f => (f.fecha_llegada===ymd || f.fecha_salida===ymd) && pred(f)).length;
        c.hoy = countFor(dmy, isPax); k.hoy = countFor(dmy, isCargo);
        // Ayer
        const ay = new Date(today); ay.setDate(today.getDate()-1);
        const y2 = ay.getFullYear(), m2 = String(ay.getMonth()+1).padStart(2,'0'), d2 = String(ay.getDate()).padStart(2,'0');
        const dmy2 = `${d2}/${m2}/${y2}`;
        c.ayer = countFor(dmy2, isPax); k.ayer = countFor(dmy2, isCargo);
        // General: lo que no cae en pax/carga
        const isGen = f => !isPax(f) && !isCargo(f);
        g.hoy = countFor(dmy, isGen); g.ayer = countFor(dmy2, isGen);
        const trend = (h,a) => h>a ? '↑' : h<a ? '↓' : '=';
        c.trend = trend(c.hoy, c.ayer); k.trend = trend(k.hoy, k.ayer); g.trend = trend(g.hoy, g.ayer);
        const set = (id,v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('daily-comercial-hoy', c.hoy); set('daily-comercial-ayer', c.ayer); set('daily-comercial-trend', c.trend);
        set('daily-carga-hoy', k.hoy); set('daily-carga-ayer', k.ayer); set('daily-carga-trend', k.trend);
        set('daily-general-hoy', g.hoy); set('daily-general-ayer', g.ayer); set('daily-general-trend', g.trend);
        return { comercial: c, carga: k, general: g };
    } catch (e) { console.warn('computeDailyStats error:', e); return { comercial:{ayer:0,hoy:0,trend:'='}, carga:{ayer:0,hoy:0,trend:'='}, general:{ayer:0,hoy:0,trend:'='} }; }
}

// Lightbox para PDFs
function setupLightboxListeners() {
    try {
        const lb = document.getElementById('pdf-lightbox'); if (!lb) return;
        const closeBtn = document.getElementById('lightbox-close');
        const content = document.getElementById('lightbox-content');
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.pdf-zoom-btn');
            if (!btn) return;
            e.preventDefault();
            const container = btn.closest('.pdf-container');
            const frame = container && container.querySelector('iframe');
            if (frame) {
                content.innerHTML = `<iframe src="${frame.src}" width="100%" height="100%" class="border-0"></iframe>`;
                lb.classList.remove('hidden');
                return;
            }
            // Fallback: canvas-based single-page viewer
            const viewer = container && container.querySelector('.pdf-singlepage-viewer[data-src]');
            const url = viewer && viewer.getAttribute('data-src');
            if (url) {
                content.innerHTML = `<iframe src="${url}" width="100%" height="100%" class="border-0"></iframe>`;
                lb.classList.remove('hidden');
            }
        });
        const hide = () => lb.classList.add('hidden');
        if (closeBtn) closeBtn.addEventListener('click', hide);
        lb.addEventListener('click', (e)=>{ if (e.target === lb) hide(); });
    } catch (e) { /* ignore */ }
}

// Controles de scroll horizontal para tablas de itinerario
function updateScrollControlsFor(containerId) {
    const area = document.getElementById(containerId);
    if (!area) return;
    const wrapper = area.closest('.itinerary-horizontal');
    if (!wrapper) return;
    const leftBtn = wrapper.querySelector('.scroll-left');
    const rightBtn = wrapper.querySelector('.scroll-right');
    const range = wrapper.querySelector('.scroll-range');
    const max = Math.max(0, area.scrollWidth - area.clientWidth);
    const setState = () => {
        const m = Math.max(0, area.scrollWidth - area.clientWidth);
        if (range) { range.max = String(m); range.value = String(area.scrollLeft); }
        if (leftBtn) leftBtn.disabled = area.scrollLeft <= 0;
        if (rightBtn) rightBtn.disabled = area.scrollLeft >= m - 5;
    };
    const scrollBy = (dx) => { area.scrollBy({ left: dx, behavior: 'smooth' }); setTimeout(setState, 120); };
    if (leftBtn && !leftBtn._wired) { leftBtn._wired = 1; leftBtn.addEventListener('click', ()=> scrollBy(-240)); }
    if (rightBtn && !rightBtn._wired) { rightBtn._wired = 1; rightBtn.addEventListener('click', ()=> scrollBy(240)); }
    if (range && !range._wired) { range._wired = 1; range.addEventListener('input', ()=> area.scrollTo({ left: Number(range.value)||0 })); }
    if (!area._wheelWired) {
        area._wheelWired = 1;
        area.addEventListener('wheel', (ev)=>{
            // Sólo desplazar horizontalmente si el usuario mantiene Shift o si hay deltaX notable
            const horiz = Math.abs(ev.deltaX) > Math.abs(ev.deltaY);
            if (ev.shiftKey || horiz) {
                area.scrollLeft += ev.deltaX || (ev.shiftKey ? ev.deltaY : 0);
                setState();
                // Si estamos forzando scroll horizontal por Shift, prevenimos el vertical
                if (ev.shiftKey) ev.preventDefault();
            }
        }, { passive:false });
    }
    setState();
}

function setupBodyEventListeners() {
    try {
        // Sidebar overlay click
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay && !overlay._wired) { overlay._wired = 1; overlay.addEventListener('click', ()=> {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('visible');
            overlay.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }); }
        // Scroll controls ranges
        document.querySelectorAll('.itinerary-horizontal .h-scroll-area').forEach(area => {
            try { updateScrollControlsFor(area.id); } catch(_) {}
        });
    } catch (e) { /* ignore */ }
}

// Permitir que el arrastre horizontal sobre la tabla (área de scroll vertical) mueva el scroll horizontal exterior
function enableTwoAxisTableScroll(hAreaId, tableContainerId) {
    try {
        const hArea = document.getElementById(hAreaId);
        const container = document.getElementById(tableContainerId);
        if (!hArea || !container) return;
        const vScroll = container.querySelector('.vertical-scroll');
        if (!vScroll || vScroll._twoAxisWired) return;
        vScroll._twoAxisWired = true;

        let startX = 0, startY = 0, lastX = 0, deciding = true, horiz = false;

        const onStart = (ev) => {
            try {
                const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
                startX = lastX = t.clientX; startY = t.clientY; deciding = true; horiz = false;
            } catch(_) {}
        };
        const onMove = (ev) => {
            try {
                const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
                const dx = t.clientX - lastX;
                const dy = t.clientY - startY; // respecto al inicio para decidir dirección
                if (deciding) {
                    if (Math.abs(dx) > Math.abs(dy) + 4) { horiz = true; deciding = false; }
                    else if (Math.abs(dy) > Math.abs(dx) + 4) { horiz = false; deciding = false; }
                }
                if (horiz) {
                    // mover scroll horizontal exterior y evitar scroll vertical cuando estamos en modo horizontal
                    ev.preventDefault();
                    hArea.scrollLeft -= dx;
                    lastX = t.clientX;
                    try { updateScrollControlsFor(hAreaId); } catch(_) {}
                }
            } catch(_) {}
        };
        const onEnd = () => { deciding = true; horiz = false; };

        vScroll.addEventListener('touchstart', onStart, { passive: true });
        vScroll.addEventListener('touchmove', onMove, { passive: false });
        vScroll.addEventListener('touchend', onEnd, { passive: true });
        vScroll.addEventListener('touchcancel', onEnd, { passive: true });
    } catch(_) {}
}

// Exportar todas las gráficas en un solo PDF (dos por página, centradas)
async function exportAllChartsPDF() {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) { console.warn('jsPDF no disponible'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p','mm','a4');
        const chartMeta = [
            { id:'commercialOpsChart', title:'Operaciones - Aviación Comercial' },
            { id:'commercialPaxChart', title:'Pasajeros - Aviación Comercial' },
            { id:'cargoOpsChart', title:'Operaciones - Carga Aérea' },
            { id:'cargoTonsChart', title:'Toneladas - Carga Aérea' },
            { id:'generalOpsChart', title:'Operaciones - Aviación General' },
            { id:'generalPaxChart', title:'Pasajeros - Aviación General' }
        ];

        const visibleCharts = [];
        chartMeta.forEach(({ id, title }) => {
            const canvas = document.getElementById(id);
            const hiddenGroup = canvas?.closest('#commercial-group,#cargo-group,#general-group');
            if (!canvas || canvas.closest('.col-lg-6')?.style.display === 'none' || hiddenGroup?.style.display === 'none') return;
            visibleCharts.push({ canvas, title });
        });
        if (!visibleCharts.length) { console.warn('No hay gráficas visibles para exportar'); return; }

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const marginX = 14;
        const marginTop = 18;
        const slotGap = 10;
        const slotsPerPage = 2;
        const slotHeight = (pageH - marginTop * 2 - slotGap) / slotsPerPage;
        const titleFontSize = 12;
        const titleOffset = 4;
        const imagePadding = 6;

        visibleCharts.forEach(({ canvas, title }, index) => {
            const slotIndex = index % slotsPerPage;
            if (index > 0 && slotIndex === 0) doc.addPage();

            const slotTop = marginTop + slotIndex * (slotHeight + slotGap);
            const availableWidth = pageW - marginX * 2;
            const ratio = canvas.height && canvas.width ? (canvas.height / canvas.width) : 0.6;
            const maxImageHeight = slotHeight - (titleFontSize + titleOffset + imagePadding);
            let renderWidth = availableWidth;
            let renderHeight = renderWidth * ratio;
            if (renderHeight > maxImageHeight) {
                renderHeight = maxImageHeight;
                renderWidth = renderHeight / (ratio || 1);
            }
            const imageX = (pageW - renderWidth) / 2;
            const titleY = slotTop + titleFontSize;
            const imageY = titleY + titleOffset;

            const img = canvas.toDataURL('image/png', 1.0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(titleFontSize);
            doc.text(title, pageW / 2, titleY, { align: 'center' });
            doc.addImage(img, 'PNG', imageX, imageY, renderWidth, renderHeight, undefined, 'FAST');
        });

        doc.save('operaciones_totales.pdf');
    } catch (e) { console.warn('exportAllChartsPDF error:', e); }
}

// Login sky animation (dawn / day / dusk / night)
const LOGIN_SKY_STATE_CLASSES = ['night','dawn','day','dusk'];
const LOGIN_PLANE_REFRESH_MS = 45000;
let loginSkyCurrentState = null;
let loginSkyIntervalId = null;
let loginPlaneProfileTimer = null;

function getLoginSkyState(now = new Date()) {
    try {
        const hours = now.getHours() + (now.getMinutes() / 60);
        if (hours >= 5 && hours < 7) return 'dawn';
        if (hours >= 7 && hours < 18) return 'day';
        if (hours >= 18 && hours < 20) return 'dusk';
        return 'night';
    } catch (_) {
        return 'day';
    }
}

function initLoginSkyScene() {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky || sky.dataset.sceneReady) return;
        sky.dataset.sceneReady = '1';

        const overlay = document.querySelector('.login-overlay');
        const logoSrc = 'images/aifa-logo.png';
        if (overlay && !overlay.querySelector('.sky-top-logo')) {
            const overlayLogo = document.createElement('img');
            overlayLogo.src = logoSrc;
            overlayLogo.alt = 'Aeropuerto Internacional Felipe Ángeles';
            overlayLogo.className = 'sky-top-logo';
            overlayLogo.setAttribute('aria-hidden', 'true');
            overlay.appendChild(overlayLogo);
        }
        if (!sky.querySelector('.sun')) {
            const sun = document.createElement('div');
            sun.className = 'sun';
            sun.setAttribute('aria-hidden', 'true');
            sky.appendChild(sun);
        }
        if (!sky.querySelector('.moon')) {
            const moon = document.createElement('div');
            moon.className = 'moon';
            moon.setAttribute('aria-hidden', 'true');
            sky.appendChild(moon);
        }

        if (!sky.dataset.stars) {
            const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const starLimit = reduceMotion ? 20 : (window.matchMedia && window.matchMedia('(max-width: 480px)').matches ? 28 : 40);
            for (let i = 0; i < starLimit; i++) {
                const star = document.createElement('span');
                star.className = 'star' + (Math.random() > 0.78 ? ' big' : '');
                star.style.left = `${Math.random() * 100}%`;
                star.style.top = `${Math.random() * 60}%`;
                star.style.setProperty('--tw', `${2.8 + Math.random() * 3.6}s`);
                star.style.setProperty('--td', `${Math.random() * 6}s`);
                star.setAttribute('aria-hidden', 'true');
                sky.appendChild(star);
            }
            sky.dataset.stars = '1';
        }

        if (!sky.dataset.clouds) {
            const cloudConfigs = [
                { top: '8vh', dur: 72, delay: -12, y: '-8vh' },
                { top: '20vh', dur: 68, delay: -4, y: '-3vh' },
                { top: '34vh', dur: 82, delay: -18, y: '1vh' },
                { top: '48vh', dur: 74, delay: -26, y: '4vh' },
                { top: '60vh', dur: 88, delay: -6, y: '6vh' }
            ];
            cloudConfigs.forEach(cfg => {
                const cloud = document.createElement('div');
                cloud.className = 'cloud';
                cloud.style.top = cfg.top;
                cloud.style.setProperty('--dur', `${cfg.dur}s`);
                cloud.style.setProperty('--delay', `${cfg.delay}s`);
                cloud.style.setProperty('--y', cfg.y);
                cloud.setAttribute('aria-hidden', 'true');
                sky.appendChild(cloud);
            });
            sky.dataset.clouds = '1';
        }

        if (!sky.dataset.lights) {
            const lights = document.createElement('div');
            lights.className = 'airport-lights';
            lights.setAttribute('aria-hidden', 'true');
            const palette = ['ap-yellow', 'ap-blue', 'ap-green'];
            const total = 18;
            for (let i = 0; i < total; i++) {
                const light = document.createElement('span');
                light.className = `ap-light ${palette[i % palette.length]}`;
                light.style.left = `${-5 + Math.random() * 110}%`;
                light.style.setProperty('--d', `${Math.random() * 4}s`);
                light.style.setProperty('--s', (0.8 + Math.random() * 0.8).toFixed(2));
                light.setAttribute('aria-hidden', 'true');
                lights.appendChild(light);
            }
            sky.appendChild(lights);
            sky.dataset.lights = '1';
        }

        if (!sky.dataset.planes) {
            const planeConfigs = [
                { depth: 'far', top: '28vh', flight: 38, delay: -16, scale: 0.8, tilt: 6, y: -6, bob: 9 },
                { depth: 'mid', top: '42vh', flight: 26, delay: -8, scale: 1, tilt: 8, y: -1, bob: 7 },
                { depth: 'near', top: '58vh', flight: 32, delay: -4, scale: 1.16, tilt: 10, y: 1, bob: 6 },
                { depth: 'mid', top: '34vh', flight: 30, delay: -22, scale: 0.92, tilt: 7, y: -4, bob: 8, reverse: true }
            ];
            planeConfigs.forEach(cfg => {
                const plane = document.createElement('div');
                plane.className = 'plane';
                plane.classList.add(cfg.depth || 'mid');
                if (cfg.reverse) plane.classList.add('reverse');
                plane.setAttribute('aria-hidden', 'true');
                plane.style.top = cfg.top;
                if (typeof cfg.scale === 'number') plane.style.setProperty('--scale', String(cfg.scale));

                const osc = document.createElement('span');
                osc.className = 'osc';
                const iconWrap = document.createElement('span');
                iconWrap.className = 'icon';
                const icon = document.createElement('i');
                icon.className = 'fas fa-plane';
                icon.setAttribute('aria-hidden', 'true');
                iconWrap.appendChild(icon);
                osc.appendChild(iconWrap);

                const trail = document.createElement('span');
                trail.className = 'trail';
                trail.setAttribute('aria-hidden', 'true');
                osc.appendChild(trail);

                plane.appendChild(osc);
                ['nav-red','nav-green','beacon','strobe','landing'].forEach(cls => {
                    const light = document.createElement('span');
                    light.className = `light ${cls}`;
                    light.setAttribute('aria-hidden', 'true');
                    plane.appendChild(light);
                });

                plane.dataset.baseFlight = String(cfg.flight);
                plane.dataset.baseDelay = String(cfg.delay);
                plane.dataset.baseTilt = String(cfg.tilt);
                plane.dataset.baseY = String(cfg.y ?? 0);
                plane.dataset.baseBob = String(cfg.bob ?? 7);

                applyPlaneFlightProfile(plane);
                sky.appendChild(plane);
            });
            sky.dataset.planes = '1';
            if (!loginPlaneProfileTimer) {
                loginPlaneProfileTimer = window.setInterval(refreshPlaneFlightProfiles, LOGIN_PLANE_REFRESH_MS);
            }
        }
    } catch (e) {
        console.warn('initLoginSkyScene error:', e);
    }
}

function applyLoginSkyState(state) {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky) return;
        LOGIN_SKY_STATE_CLASSES.forEach(cls => {
            sky.classList.toggle(cls, cls === state);
        });
        const overlay = document.querySelector('.login-overlay');
        if (overlay) {
            LOGIN_SKY_STATE_CLASSES.forEach(cls => {
                overlay.classList.toggle(cls, cls === state);
            });
        }
    } catch (e) {
        console.warn('applyLoginSkyState error:', e);
    }
}

function updateLoginSkyScene(force = false) {
    try {
        const nextState = getLoginSkyState();
        if (!force && nextState === loginSkyCurrentState) return;
        applyLoginSkyState(nextState);
        loginSkyCurrentState = nextState;
    } catch (e) {
        console.warn('updateLoginSkyScene error:', e);
    }
}

function applyPlaneFlightProfile(plane) {
    try {
        const baseFlight = parseFloat(plane.dataset.baseFlight) || 30;
        const baseDelay = parseFloat(plane.dataset.baseDelay) || 0;
        const baseTilt = parseFloat(plane.dataset.baseTilt) || 6;
        const baseY = parseFloat(plane.dataset.baseY) || 0;
        const baseBob = parseFloat(plane.dataset.baseBob) || 7;

        const speedFactor = 0.85 + Math.random() * 0.3; // velocidades distintas 
        const delayJitter = (Math.random() * 6) - 3; // evita trenes equiespaciados
        const crosswind = (Math.random() * 2 - 1) * 0.6; // ligera variación en el bamboleo
        const verticalDrift = baseY + (Math.random() * 1.6 - 0.8); // altitud relativa
        const tiltDrift = baseTilt + (Math.random() * 1.8 - 0.9); // nariz leve arriba/abajo

        plane.style.setProperty('--flight', `${(baseFlight * speedFactor).toFixed(1)}s`);
        plane.style.setProperty('--delay', `${(baseDelay + delayJitter).toFixed(1)}s`);
        plane.style.setProperty('--tilt', `${tiltDrift.toFixed(1)}deg`);
        plane.style.setProperty('--y', `${verticalDrift.toFixed(1)}vh`);
        plane.style.setProperty('--bobTime', `${Math.max(4.5, baseBob + crosswind).toFixed(1)}s`);
    } catch (e) {
        console.warn('applyPlaneFlightProfile error:', e);
    }
}

function refreshPlaneFlightProfiles() {
    try {
        const sky = document.getElementById('login-sky');
        if (!sky) return;
        sky.querySelectorAll('.plane').forEach(applyPlaneFlightProfile);
    } catch (e) {
        console.warn('refreshPlaneFlightProfiles error:', e);
    }
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateLoginSkyScene(true);
        refreshPlaneFlightProfiles();
    }
});

// Sesión y login
function showMainApp() {
    const login = document.getElementById('login-screen');
    const main = document.getElementById('main-app');
    // Validar sesión firmada
    const token = sessionStorage.getItem(SESSION_TOKEN);
    const name = sessionStorage.getItem(SESSION_USER) || '';
    // Si no hay token válido, volver a login
    verifyToken(token).then(valid => {
        if (!valid) {
            try { sessionStorage.removeItem(SESSION_USER); sessionStorage.removeItem(SESSION_TOKEN); } catch(_) {}
            if (main) main.classList.add('hidden');
            if (login) login.classList.remove('hidden');
            return;
        }
        checkForAppUpdates().catch(() => {});
        const mainWasHidden = main ? main.classList.contains('hidden') : false;
        if (login) login.classList.add('hidden');
        if (main) main.classList.remove('hidden');
        // Usuario actual
        const userEl = document.getElementById('current-user'); if (userEl) userEl.textContent = name;
        applySectionPermissions(name);
        // Permisos: Itinerario mensual
        const menu = document.getElementById('itinerario-mensual-menu');
        if (menu) {
            const u = dashboardData.users[name];
            const can = !!(u && u.canViewItinerarioMensual);
            menu.style.display = can ? '' : 'none';
        }
        try {
            ensureOpsEntryPanel();
            const hasSummary = !!(parteOperacionesSummaryCache && Array.isArray(parteOperacionesSummaryCache.dates));
            updateParteOperacionesAvailabilityBanner(parteOperacionesSummaryCache, { skipBanner: !hasSummary });
        } catch (_) {}
        if (mainWasHidden) {
            try {
                const startLink = document.querySelector('.menu-item[data-section="operaciones-totales"]');
                if (startLink && startLink.dataset?.section) {
                    showSection(startLink.dataset.section, startLink);
                }
            } catch (_) {}
            try {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('visible');
                if (overlay) overlay.classList.remove('active');
                const isMobile = window.innerWidth <= 991.98;
                if (isMobile) {
                    document.body.classList.remove('sidebar-collapsed');
                    document.body.classList.remove('sidebar-open');
                } else {
                    document.body.classList.add('sidebar-collapsed');
                    try { localStorage.setItem('sidebarState', 'collapsed'); } catch (_) {}
                }
            } catch (_) {}
        }

        const refreshOpsAfterLogin = () => {
            const opsSection = document.getElementById('operaciones-totales-section');
            if (!opsSection || !opsSection.classList.contains('active')) return;
            try { updateOpsSummary(); } catch (err) { console.warn('updateOpsSummary after login failed:', err); }
            try { renderOperacionesTotales(); } catch (err) { console.warn('renderOperacionesTotales after login failed:', err); }
            try { setTimeout(() => { try { detectChartErrors(); } catch (_) {} }, 400); } catch (_) {}
        };
        const shouldRefreshOps = mainWasHidden || !Object.keys(opsCharts || {}).length;
        if (shouldRefreshOps) {
            setTimeout(refreshOpsAfterLogin, 120);
        }
    }).catch(()=>{
        if (main) main.classList.add('hidden');
        if (login) login.classList.remove('hidden');
    });
}

function checkSession() {
    try {
        const token = sessionStorage.getItem(SESSION_TOKEN);
        const name = sessionStorage.getItem(SESSION_USER);
        if (!token || !name) return;
        // Validar token antes de mostrar
        verifyToken(token).then(valid => { if (valid) showMainApp(); }).catch(()=>{});
    } catch (e) { /* ignore */ }
}

// PDFs dinámicos (ligero)
function createPdfSections() {
    try {
        // Por ahora, solo aseguramos que el título del menú coincida con la sección
        const cfg = dashboardData && dashboardData.pdfSections ? dashboardData.pdfSections['itinerario-mensual'] : null;
        if (cfg) {
            const menu = document.getElementById('itinerario-mensual-menu');
            if (menu) menu.querySelector('span').textContent = cfg.title;
            const frame = document.querySelector('#itinerario-mensual-section iframe');
            if (frame) frame.src = cfg.url;
        }
    } catch (e) { /* ignore */ }
}

// Placeholders seguros para funciones referenciadas
function initFrecuenciasSemana() {}
function renderFrecuenciasSemana() {}
function changeFreqWeek(_delta) {}
function ensurePeakDate() {}
function renderDailyPeaks() {}
function initPeakDateControls() {}

// ================== Aviación General: comparativo dinámico ==================
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function formatNumberMX(value, options = {}) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    const baseOptions = { maximumFractionDigits: 0 };
    const finalOptions = Object.assign({}, baseOptions, options || {});
    return new Intl.NumberFormat('es-MX', finalOptions).format(numeric);
}

function formatMetricValue(value, metricMeta, overrides = {}) {
    const options = Object.assign({}, metricMeta?.numberOptions || {}, overrides || {});
    return formatNumberMX(value, options);
}

function normalizeMetricValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function computeDelta(current, previous) {
    if (!isFiniteNumber(current) || !isFiniteNumber(previous)) return null;
    const abs = current - previous;
    const pct = previous === 0 ? null : (abs / previous) * 100;
    return { abs, pct };
}

function buildAnnualRows(metricData = {}, orderedYears = []) {
    const rows = [];
    let previousValue = null;
    orderedYears.forEach((year) => {
        const payload = metricData.years ? metricData.years[year] : null;
        const rawTotal = normalizeMetricValue(payload ? payload.total : null);
        const value = isFiniteNumber(rawTotal) ? rawTotal : 0;
        const deltaPrevYear = isFiniteNumber(previousValue) ? computeDelta(value, previousValue) : null;
        rows.push({ year, value, deltaPrevYear });
        previousValue = isFiniteNumber(value) ? value : previousValue;
    });
    return rows;
}

function buildMonthlyRows(metricData = {}, year, comparisonYear, months = [], labels = []) {
    const rows = [];
    const yearInfo = metricData.years ? metricData.years[year] : null;
    if (!yearInfo) return rows;
    const comparisonInfo = comparisonYear && metricData.years ? metricData.years[comparisonYear] : null;
    let prevValidValue = null;
    months.forEach((month, index) => {
        const current = normalizeMetricValue(yearInfo.months ? yearInfo.months[month] : null);
        const compareRaw = comparisonInfo ? normalizeMetricValue(comparisonInfo.months ? comparisonInfo.months[month] : null) : null;
        const currentValue = isFiniteNumber(current) ? current : null;
        const compareValue = isFiniteNumber(compareRaw) ? compareRaw : null;
        const deltaPrev = isFiniteNumber(currentValue) && isFiniteNumber(prevValidValue) ? computeDelta(currentValue, prevValidValue) : null;
        const deltaCompare = isFiniteNumber(currentValue) && isFiniteNumber(compareValue) ? computeDelta(currentValue, compareValue) : null;
        rows.push({
            key: month,
            label: labels[index] || month.charAt(0).toUpperCase() + month.slice(1),
            value: currentValue,
            compareValue,
            deltaPrev,
            deltaCompare
        });
        if (isFiniteNumber(currentValue)) prevValidValue = currentValue;
    });
    return rows;
}

function formatNumberCell(value, metricMeta, options) {
    return isFiniteNumber(value) ? formatMetricValue(value, metricMeta, options) : '<span class="text-muted">-</span>';
}

function renderVariationAbs(delta, metricMeta) {
    if (!delta || !isFiniteNumber(delta.abs)) return '<span class="text-muted">-</span>';
    const type = delta.abs > 0 ? 'up' : (delta.abs < 0 ? 'down' : 'flat');
    const icon = type === 'up' ? 'fas fa-arrow-up' : (type === 'down' ? 'fas fa-arrow-down' : 'fas fa-minus');
    const sign = delta.abs > 0 ? '+' : (delta.abs < 0 ? '-' : '');
    const valueText = `${sign}${formatMetricValue(Math.abs(delta.abs), metricMeta)}`;
    return `<span class="ag-variation-pill ${type}"><i class="${icon}" aria-hidden="true"></i><span>${valueText}</span></span>`;
}

function renderVariationPct(delta) {
    if (!delta || !isFiniteNumber(delta.abs)) return '<span class="text-muted">-</span>';
    if (!isFiniteNumber(delta.pct)) return '<span class="ag-variation-pill flat">NA</span>';
    const type = delta.pct > 0 ? 'up' : (delta.pct < 0 ? 'down' : 'flat');
    const icon = type === 'up' ? 'fas fa-arrow-up' : (type === 'down' ? 'fas fa-arrow-down' : 'fas fa-minus');
    const sign = delta.pct > 0 ? '+' : (delta.pct < 0 ? '-' : '');
    const valueText = `${sign}${Math.abs(delta.pct).toFixed(1)}%`;
    return `<span class="ag-variation-pill ${type}"><i class="${icon}" aria-hidden="true"></i><span>${valueText}</span></span>`;
}

function getMaxValue(values = []) {
    return values.reduce((max, value) => (isFiniteNumber(value) && value > max ? value : max), 0);
}

function buildTrendFromDelta(delta, contextLabel, metricMeta) {
    if (!delta || !isFiniteNumber(delta.abs)) return null;
    const type = delta.abs > 0 ? 'up' : (delta.abs < 0 ? 'down' : 'flat');
    const icon = type === 'up' ? 'fas fa-arrow-up' : (type === 'down' ? 'fas fa-arrow-down' : 'fas fa-minus');
    const sign = delta.abs > 0 ? '+' : (delta.abs < 0 ? '-' : '');
    const absText = `${sign}${formatMetricValue(Math.abs(delta.abs), metricMeta)}`;
    let pctText = '';
    if (isFiniteNumber(delta.pct)) {
        pctText = `${sign}${Math.abs(delta.pct).toFixed(1)}%`;
    }
    const context = contextLabel ? ` vs ${contextLabel}` : '';
    const details = pctText ? `${absText}${context} (${pctText})` : `${absText}${context}`;
    return { type, icon, text: details.trim() };
}

function renderSummaryTrend(trend) {
    if (!trend || !trend.text) return '';
    const type = trend.type || 'flat';
    const icon = trend.icon || 'fas fa-minus';
    return `<span class="ag-summary-trend ${type}"><i class="${icon}" aria-hidden="true"></i><span>${trend.text}</span></span>`;
}

function renderAviationAnalyticsSummary(container, { view, metricMeta, annualRows, monthlyRows, year, comparisonYear, metricData }) {
    if (!container) return;
    const cards = [];
    const metricLabelLower = (metricMeta?.label || 'indicador').toLowerCase();

    if (view === 'anual') {
        const acumulado = Number(metricData?.acumulado || 0);
        const yearsRangeStart = annualRows.length ? annualRows[0].year : '';
        const yearsRangeEnd = annualRows.length ? annualRows[annualRows.length - 1].year : '';
        const avgAnnual = annualRows.length ? acumulado / annualRows.length : 0;
        const latestRow = annualRows[annualRows.length - 1] || null;
        const prevRow = annualRows.length > 1 ? annualRows[annualRows.length - 2] : null;
        let bestRow = null;
        let worstRow = null;
        annualRows.forEach((row) => {
            if (!bestRow || row.value > bestRow.value) bestRow = row;
            if (!worstRow || row.value < worstRow.value) worstRow = row;
        });
        cards.push({
            variant: '',
            heading: 'Acumulado histórico',
            value: formatMetricValue(acumulado, metricMeta),
            caption: yearsRangeStart && yearsRangeEnd ? `${metricLabelLower} ${yearsRangeStart} - ${yearsRangeEnd}` : `Total histórico de ${metricLabelLower}`,
            trend: avgAnnual > 0 ? { type: 'flat', icon: 'fas fa-chart-line', text: `Promedio anual ${formatMetricValue(avgAnnual, metricMeta)}` } : null
        });
        if (latestRow) {
            cards.push({
                variant: 'contrast',
                heading: `Último año (${latestRow.year})`,
                value: formatMetricValue(latestRow.value, metricMeta),
                caption: `Participación anual de ${metricLabelLower}`,
                trend: buildTrendFromDelta(latestRow.deltaPrevYear, prevRow ? prevRow.year : null, metricMeta) || { type: 'flat', icon: 'fas fa-minus', text: 'Sin referencia previa' }
            });
        }
        if (bestRow && worstRow && bestRow.year !== worstRow.year) {
            cards.push({
                variant: 'alert',
                heading: `Año más alto (${bestRow.year})`,
                value: formatMetricValue(bestRow.value, metricMeta),
                caption: `Referencia: ${worstRow.year}`,
                trend: buildTrendFromDelta(computeDelta(bestRow.value, worstRow.value), worstRow.year, metricMeta)
            });
        }
    } else {
        const baseTotal = monthlyRows.reduce((sum, row) => sum + (isFiniteNumber(row.value) ? row.value : 0), 0);
        const baseMonths = monthlyRows.filter((row) => isFiniteNumber(row.value)).length;
        const baseAverage = baseMonths ? baseTotal / baseMonths : 0;
        const comparisonTotal = comparisonYear ? monthlyRows.reduce((sum, row) => sum + (isFiniteNumber(row.compareValue) ? row.compareValue : 0), 0) : null;
        const comparisonMonths = comparisonYear ? monthlyRows.filter((row) => isFiniteNumber(row.compareValue)).length : 0;
        const comparisonAverage = comparisonMonths ? comparisonTotal / comparisonMonths : null;
        const deltaTotal = comparisonYear && isFiniteNumber(baseTotal) && isFiniteNumber(comparisonTotal) ? computeDelta(baseTotal, comparisonTotal) : null;
        const deltaAverage = comparisonYear && isFiniteNumber(baseAverage) && isFiniteNumber(comparisonAverage) ? computeDelta(baseAverage, comparisonAverage) : null;
        let bestMonth = null;
        monthlyRows.forEach((row) => {
            if (isFiniteNumber(row.value) && (!bestMonth || row.value > bestMonth.value)) bestMonth = row;
        });
        cards.push({
            variant: '',
            heading: `Total ${year || ''}`.trim(),
            value: formatMetricValue(baseTotal, metricMeta),
            caption: `Acumulado anual de ${metricLabelLower}`,
            trend: comparisonYear ? buildTrendFromDelta(deltaTotal, comparisonYear, metricMeta) : null
        });
        cards.push({
            variant: 'contrast',
            heading: 'Promedio mensual',
            value: baseMonths ? formatMetricValue(baseAverage, metricMeta, metricMeta?.averageNumberOptions || { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-',
            caption: baseMonths ? `${baseMonths} meses con datos` : 'Sin registros mensuales',
            trend: comparisonYear ? buildTrendFromDelta(deltaAverage, comparisonYear, metricMeta) : null
        });
        if (bestMonth) {
            const trend = comparisonYear ? buildTrendFromDelta(bestMonth.deltaCompare, comparisonYear, metricMeta) : buildTrendFromDelta(bestMonth.deltaPrev, 'mes previo', metricMeta);
            cards.push({
                variant: 'alert',
                heading: 'Mes más activo',
                value: bestMonth.label,
                caption: `${formatMetricValue(bestMonth.value, metricMeta)} ${metricLabelLower}`,
                trend: trend || null
            });
        }
    }

    container.innerHTML = cards.length
        ? cards.map((card) => `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="ag-summary-card"${card.variant ? ` data-variant="${card.variant}"` : ''}>
                    <div class="ag-summary-heading">${card.heading}</div>
                    <div class="ag-summary-value">${card.value}</div>
                    ${card.caption ? `<div class="ag-summary-caption">${card.caption}</div>` : ''}
                    ${card.trend ? renderSummaryTrend(card.trend) : ''}
                </div>
            </div>`).join('')
        : '<div class="col-12"><div class="alert alert-warning">No hay datos para mostrar.</div></div>';
}

function renderAviationAnalyticsTable(elements, { view, metricMeta, annualRows, monthlyRows, year, comparisonYear }) {
    if (!elements) return;
    const { table, thead, tbody, emptyState, wrapper } = elements;
    if (!table || !thead || !tbody) return;

    if (view === 'anual') {
        if (!annualRows.length) {
            thead.innerHTML = '';
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('d-none');
            if (wrapper) wrapper.classList.add('d-none');
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');
        if (wrapper) wrapper.classList.remove('d-none');
        thead.innerHTML = `
            <tr>
                <th>Año</th>
                <th class="text-end">${metricMeta?.label || 'Indicador'}</th>
                <th class="text-end">Δ vs año previo</th>
                <th class="text-end">Δ% vs año previo</th>
            </tr>`;
        tbody.innerHTML = annualRows.map((row) => `
            <tr>
                <td>${row.year}</td>
                <td class="text-end">${formatNumberCell(row.value, metricMeta)}</td>
                <td class="text-end">${renderVariationAbs(row.deltaPrevYear, metricMeta)}</td>
                <td class="text-end">${renderVariationPct(row.deltaPrevYear)}</td>
            </tr>`).join('');
    } else {
        if (!monthlyRows.length) {
            thead.innerHTML = '';
            tbody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('d-none');
            if (wrapper) wrapper.classList.add('d-none');
            return;
        }
        if (emptyState) emptyState.classList.add('d-none');
        if (wrapper) wrapper.classList.remove('d-none');
        const comparisonLabel = comparisonYear ? String(comparisonYear) : '';
        let head = `
            <tr>
                <th>Mes</th>
                <th class="text-end">${metricMeta?.label || 'Indicador'} ${year || ''}</th>
                <th class="text-end">Δ vs mes previo</th>
                <th class="text-end">Δ% vs mes previo</th>`;
        if (comparisonYear) {
            head += `
                <th class="text-end">${metricMeta?.label || 'Indicador'} ${comparisonLabel}</th>
                <th class="text-end">Δ vs ${comparisonLabel}</th>
                <th class="text-end">Δ% vs ${comparisonLabel}</th>`;
        }
        head += '\n            </tr>';
        thead.innerHTML = head;
        tbody.innerHTML = monthlyRows.map((row) => {
            const baseCells = `
                <td>${row.label}</td>
                <td class="text-end">${formatNumberCell(row.value, metricMeta)}</td>
                <td class="text-end">${renderVariationAbs(row.deltaPrev, metricMeta)}</td>
                <td class="text-end">${renderVariationPct(row.deltaPrev)}</td>`;
            const comparisonCells = comparisonYear ? `
                <td class="text-end">${formatNumberCell(row.compareValue, metricMeta)}</td>
                <td class="text-end">${renderVariationAbs(row.deltaCompare, metricMeta)}</td>
                <td class="text-end">${renderVariationPct(row.deltaCompare)}</td>` : '';
            return `<tr>${baseCells}${comparisonCells}</tr>`;
        }).join('');
    }
}

function renderAviationAnalyticsChart(moduleKey, canvas, { view, metricMeta, annualRows, monthlyRows, year, comparisonYear }, forceResize) {
    if (!canvas) return;
    const chartRef = aviationAnalyticsCharts[moduleKey];
    if (chartRef) {
        try { chartRef.destroy(); } catch (_) {}
        aviationAnalyticsCharts[moduleKey] = null;
    }

    if (view === 'anual') {
        const labels = annualRows.map((row) => row.year);
        const data = annualRows.map((row) => (isFiniteNumber(row.value) ? row.value : null));
        const hasData = data.some((value) => isFiniteNumber(value));
        if (!labels.length || !hasData) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            return;
        }
        const barColor = metricMeta?.color || '#1e88e5';
        aviationAnalyticsCharts[moduleKey] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: `${metricMeta?.label || 'Indicador'} por año`,
                    data,
                    backgroundColor: barColor,
                    borderRadius: 8,
                    maxBarThickness: 42
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, metricMeta)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 0 } },
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (val) => formatMetricValue(val, metricMeta) }
                    }
                }
            }
        });
    } else {
        const labels = monthlyRows.map((row) => row.label);
        const primaryColor = metricMeta?.color || '#1e88e5';
        const primaryData = monthlyRows.map((row) => (isFiniteNumber(row.value) ? row.value : null));
        const comparisonData = monthlyRows.map((row) => (isFiniteNumber(row.compareValue) ? row.compareValue : null));
        const hasPrimary = primaryData.some((value) => isFiniteNumber(value));
        const hasComparison = comparisonYear && comparisonData.some((value) => isFiniteNumber(value));
        if (!labels.length || (!hasPrimary && !hasComparison)) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
            return;
        }
        const datasets = [{
            label: year || 'Año base',
            data: primaryData,
            borderColor: primaryColor,
            backgroundColor: hexToRgba(primaryColor, 0.18),
            tension: 0.35,
            fill: false,
            spanGaps: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 2
        }];
        if (hasComparison) {
            datasets.push({
                label: comparisonYear,
                data: comparisonData,
                borderColor: '#6c757d',
                backgroundColor: hexToRgba('#6c757d', 0.12),
                tension: 0.3,
                fill: false,
                spanGaps: true,
                borderDash: [6, 4],
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBorderWidth: 1.5
            });
        }
        const maxValue = Math.max(getMaxValue(primaryData), getMaxValue(comparisonData));
        aviationAnalyticsCharts[moduleKey] = new Chart(canvas, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, metricMeta)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 0 } },
                    y: {
                        beginAtZero: true,
                        suggestedMax: maxValue ? maxValue * 1.1 : undefined,
                        ticks: { callback: (val) => formatMetricValue(val, metricMeta) }
                    }
                }
            }
        });
    }

    if (aviationAnalyticsCharts[moduleKey] && forceResize) {
        setTimeout(() => {
            try { aviationAnalyticsCharts[moduleKey].resize(); } catch (_) {}
        }, 120);
    }
}

function renderAviationAnalyticsInsights(container, { view, metricMeta, metricKey, annualRows, monthlyRows, year, comparisonYear, metricData, moduleKey }) {
    if (!container) return;
    const insights = [];
    const metricLabel = metricMeta?.label || 'Indicador';
    const metricLabelLower = metricLabel.toLowerCase();
    const scopeLabel = moduleKey && AVIATION_ANALYTICS_SCOPE_LABELS[moduleKey]
        ? AVIATION_ANALYTICS_SCOPE_LABELS[moduleKey]
        : 'aviación';
    const subject = `${metricLabelLower} de ${scopeLabel}`;

    if (view === 'anual') {
        const latestRow = annualRows[annualRows.length - 1];
        const prevRow = annualRows.length > 1 ? annualRows[annualRows.length - 2] : null;
        if (latestRow && prevRow && latestRow.deltaPrevYear) {
            const delta = latestRow.deltaPrevYear;
            if (isFiniteNumber(delta.abs) && delta.abs !== 0) {
                const direction = delta.abs > 0 ? 'creció' : 'disminuyó';
                const amount = formatMetricValue(Math.abs(delta.abs), metricMeta);
                const pctText = isFiniteNumber(delta.pct) ? ` (${Math.abs(delta.pct).toFixed(1)}%)` : '';
                insights.push(`El total de ${subject} en ${latestRow.year} ${direction} ${amount}${pctText} frente a ${prevRow.year}.`);
            } else {
                insights.push(`El total de ${subject} en ${latestRow.year} se mantuvo estable respecto a ${prevRow.year}.`);
            }
        }
        let bestRow = null;
        let worstRow = null;
        annualRows.forEach((row) => {
            if (!bestRow || row.value > bestRow.value) bestRow = row;
            if (!worstRow || row.value < worstRow.value) worstRow = row;
        });
        if (bestRow && worstRow && bestRow.year !== worstRow.year) {
            const diff = computeDelta(bestRow.value, worstRow.value);
            if (diff && isFiniteNumber(diff.abs) && diff.abs !== 0) {
                const amount = formatMetricValue(Math.abs(diff.abs), metricMeta);
                const pctText = isFiniteNumber(diff.pct) ? ` (${Math.abs(diff.pct).toFixed(1)}%)` : '';
                insights.push(`El año ${bestRow.year} registró el mayor volumen de ${subject}, superando a ${worstRow.year} en ${amount}${pctText}.`);
            }
        }
        const acumulado = Number(metricData?.acumulado || 0);
        if (acumulado && annualRows.length) {
            const avgAnnual = acumulado / annualRows.length;
            insights.push(`El promedio anual registrado de ${subject} es ${formatMetricValue(avgAnnual, metricMeta)} ${metricLabelLower}.`);
        }
    } else {
        const baseTotal = monthlyRows.reduce((sum, row) => sum + (isFiniteNumber(row.value) ? row.value : 0), 0);
        const comparisonTotal = comparisonYear ? monthlyRows.reduce((sum, row) => sum + (isFiniteNumber(row.compareValue) ? row.compareValue : 0), 0) : null;
        if (comparisonYear && isFiniteNumber(baseTotal) && isFiniteNumber(comparisonTotal)) {
            const delta = computeDelta(baseTotal, comparisonTotal);
            if (delta) {
                const direction = delta.abs >= 0 ? 'incremento' : 'reducción';
                const amount = formatMetricValue(Math.abs(delta.abs), metricMeta);
                const pctText = isFiniteNumber(delta.pct) ? ` (${Math.abs(delta.pct).toFixed(1)}%)` : '';
                insights.push(`El acumulado de ${subject} en ${year} mostró un ${direction} de ${amount}${pctText} frente a ${comparisonYear}.`);
            }
        } else if (isFiniteNumber(baseTotal)) {
            insights.push(`El acumulado de ${subject} en ${year} suma ${formatMetricValue(baseTotal, metricMeta)} ${metricLabelLower}.`);
        }
        const bestMonth = monthlyRows.reduce((acc, row) => {
            if (isFiniteNumber(row.value) && (!acc || row.value > acc.value)) return row;
            return acc;
        }, null);
        if (bestMonth) {
            const baseText = `${formatMetricValue(bestMonth.value, metricMeta)} ${metricLabelLower}`;
            const detailParts = [];
            if (comparisonYear && bestMonth.deltaCompare && isFiniteNumber(bestMonth.deltaCompare.abs) && bestMonth.deltaCompare.abs !== 0) {
                const amount = formatMetricValue(Math.abs(bestMonth.deltaCompare.abs), metricMeta);
                const pctText = isFiniteNumber(bestMonth.deltaCompare.pct) ? ` (${Math.abs(bestMonth.deltaCompare.pct).toFixed(1)}%)` : '';
                detailParts.push(bestMonth.deltaCompare.abs > 0
                    ? `superó el dato homólogo de ${comparisonYear} en ${amount}${pctText} ${metricLabelLower}`
                    : `quedó por debajo del dato homólogo de ${comparisonYear} en ${amount}${pctText} ${metricLabelLower}`);
            } else if (bestMonth.deltaPrev && isFiniteNumber(bestMonth.deltaPrev.abs) && bestMonth.deltaPrev.abs !== 0) {
                const amount = formatMetricValue(Math.abs(bestMonth.deltaPrev.abs), metricMeta);
                const pctText = isFiniteNumber(bestMonth.deltaPrev.pct) ? ` (${Math.abs(bestMonth.deltaPrev.pct).toFixed(1)}%)` : '';
                detailParts.push(bestMonth.deltaPrev.abs > 0
                    ? `representó un aumento de ${amount}${pctText} ${metricLabelLower} frente al mes previo`
                    : `registró una disminución de ${amount}${pctText} ${metricLabelLower} frente al mes previo`);
            }
            const formattedDetailParts = detailParts.map((text) => {
                if (!text) return '';
                return text.charAt(0).toUpperCase() + text.slice(1);
            }).filter(Boolean);
            const detailText = formattedDetailParts.length ? ` ${formattedDetailParts.join('. ')}.` : '';
            insights.push(`El mes con mayor actividad de ${subject} fue ${bestMonth.label} con ${baseText}.${detailText}`);
        }
        const dropMonth = monthlyRows.reduce((acc, row, index) => {
            if (row.deltaPrev && isFiniteNumber(row.deltaPrev.abs) && row.deltaPrev.abs < 0) {
                if (!acc || row.deltaPrev.abs < acc.deltaPrev.abs) {
                    return { ...row, index };
                }
            }
            return acc;
        }, null);
        if (dropMonth) {
            const prevLabel = dropMonth.index > 0 ? monthlyRows[dropMonth.index - 1].label : 'el mes previo';
            const amount = formatMetricValue(Math.abs(dropMonth.deltaPrev.abs), metricMeta);
            const pctText = isFiniteNumber(dropMonth.deltaPrev.pct) ? ` (${Math.abs(dropMonth.deltaPrev.pct).toFixed(1)}%)` : '';
            insights.push(`La mayor caída mensual de ${subject} ocurrió en ${dropMonth.label}, con una disminución de ${amount}${pctText} ${metricLabelLower} respecto a ${prevLabel}.`);
        }
    }

    if (!insights.length) {
        container.classList.add('d-none');
        container.innerHTML = '';
    } else {
        container.classList.remove('d-none');
        container.innerHTML = `<strong>Hallazgos clave</strong><ul>${insights.map((item) => `<li>${item}</li>`).join('')}</ul>`;
    }
}

function renderAviationAnalyticsLabels(labels, { view, metricMeta, year, comparisonYear, availableYears, state }) {
    if (!labels) return;
    const { chartTag, chartSubtitle, tableTag, tableCaption, footnote } = labels;
    const metricLabelLower = (metricMeta?.label || 'indicador').toLowerCase();
    const firstYear = availableYears.length ? availableYears[0] : '';
    const lastYear = availableYears.length ? availableYears[availableYears.length - 1] : '';
    const rangeText = firstYear && lastYear ? `${firstYear}-${lastYear}` : (firstYear || lastYear || '');

    if (chartTag) chartTag.textContent = view === 'anual' ? 'Vista anual' : 'Vista mensual';
    if (chartSubtitle) {
        chartSubtitle.textContent = view === 'anual'
            ? `Desempeño anual de ${metricLabelLower}${rangeText ? ` ${rangeText}` : ''}.`
            : `Detalle mensual de ${metricLabelLower} ${year || ''}${comparisonYear ? ` vs ${comparisonYear}` : ''}.`;
    }
    if (tableCaption) {
        tableCaption.textContent = view === 'anual'
            ? `Comparativo anual de ${metricLabelLower}.`
            : `Detalle mensual de ${year || ''} (${metricLabelLower}).`;
    }
    if (tableTag) tableTag.textContent = view === 'anual' ? 'Variación interanual' : 'Variación mes a mes';
    if (footnote) {
        if (view === 'anual') {
            footnote.textContent = 'Selecciona "Detalle mensual" para desglosar por mes y comparar periodos específicos.';
        } else if (comparisonYear) {
            footnote.textContent = `Comparación activa: ${year} vs ${comparisonYear}. Ajusta la referencia para explorar otros periodos.`;
        } else if (state?.comparison === 'previous') {
            footnote.textContent = 'No hay datos del año previo para comparar. Selecciona otro año de referencia o "Sin comparación".';
        } else {
            footnote.textContent = 'Selecciona un año de referencia o elige "Sin comparación" para enfocar solo el año base.';
        }
    }
}

function resolveComparisonYear(mode, year) {
    if (!year) return null;
    if (mode === 'none') return null;
    if (mode === 'previous') {
        const target = String(Number(year) - 1);
        return target;
    }
    return mode || null;
}

function updateComparisonOptions(moduleKey, selectEl, availableYears = [], selectedYear) {
    const state = aviationAnalyticsState[moduleKey];
    if (!selectEl || !state) return;
    const yearOptions = availableYears.map((year) => String(year));
    const previousValue = selectEl.value || state.comparison || 'previous';
    const selectedStr = selectedYear ? String(selectedYear) : null;
    selectEl.innerHTML = '';

    const optionPrevious = new Option('Año anterior', 'previous');
    selectEl.appendChild(optionPrevious);
    const optionNone = new Option('Sin comparación', 'none');
    selectEl.appendChild(optionNone);

    yearOptions.forEach((year) => {
        const opt = new Option(year === selectedStr ? `${year} (actual)` : year, year);
        selectEl.appendChild(opt);
    });

    let targetValue = previousValue;
    if (targetValue === selectedStr) {
        targetValue = 'none';
    } else if (targetValue && !yearOptions.includes(targetValue) && targetValue !== 'previous' && targetValue !== 'none') {
        targetValue = 'previous';
    }

    selectEl.value = targetValue;
    state.comparison = targetValue;
}

function renderAviationAnalyticsModule(moduleKey, forceResize = false) {
    try {
        const config = AVIATION_ANALYTICS_UI[moduleKey];
        const dataset = AVIATION_ANALYTICS_DATA[moduleKey];
        const state = aviationAnalyticsState[moduleKey];
        if (!config || !dataset || !state || !config.elements) return;

        const elements = config.elements;
        const availableYears = (dataset.years || []).map((year) => String(year));
        const moduleMetrics = (config.metrics && config.metrics.length ? config.metrics : dataset.metrics) || ['operaciones'];
        if (!moduleMetrics.includes(state.metric)) {
            state.metric = moduleMetrics[0];
        }
        const metricKey = state.metric;
        const view = state.view === 'mensual' ? 'mensual' : 'anual';
        state.view = view;
        const metricData = dataset[metricKey] || { years: {} };

        if (elements.metricSelect) elements.metricSelect.value = metricKey;
        if (elements.viewSelect) elements.viewSelect.value = view;

        if (view === 'mensual') {
            if (!state.year || !metricData.years[state.year]) {
                const fallback = availableYears[availableYears.length - 1] || null;
                state.year = fallback || null;
                if (elements.yearSelect && state.year) elements.yearSelect.value = state.year;
            }
            updateComparisonOptions(moduleKey, elements.comparisonSelect, availableYears, state.year);
        } else if (!state.year) {
            state.year = availableYears[availableYears.length - 1] || null;
            if (elements.yearSelect && state.year) elements.yearSelect.value = state.year;
        }

        let comparisonYear = null;
        const comparisonYearCandidate = resolveComparisonYear(state.comparison, state.year);
        if (comparisonYearCandidate && availableYears.includes(String(comparisonYearCandidate))) {
            comparisonYear = comparisonYearCandidate;
        } else if (state.comparison && state.comparison !== 'none' && state.comparison !== 'previous') {
            state.comparison = 'none';
            if (elements.comparisonSelect) elements.comparisonSelect.value = 'none';
        }
        const annualRows = buildAnnualRows(metricData, availableYears);
        const useClosedMonths = view === 'mensual' && (
            state.year === AVIATION_ANALYTICS_CUTOFF_YEAR ||
            comparisonYear === AVIATION_ANALYTICS_CUTOFF_YEAR
        );
        const monthsForRows = useClosedMonths
            ? dataset.months.slice(0, AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX + 1)
            : dataset.months;
        const monthLabelsForRows = useClosedMonths
            ? dataset.monthLabels.slice(0, AVIATION_ANALYTICS_LAST_CLOSED_MONTH_INDEX + 1)
            : dataset.monthLabels;
        const monthlyRows = view === 'mensual' && state.year
            ? buildMonthlyRows(metricData, state.year, comparisonYear, monthsForRows, monthLabelsForRows)
            : [];
        const metricMeta = AVIATION_ANALYTICS_METRIC_META[metricKey] || { label: 'Indicador', color: '#1e88e5' };

        renderAviationAnalyticsSummary(elements.summaryCards, { view, metricMeta, annualRows, monthlyRows, year: state.year, comparisonYear, metricData });
        renderAviationAnalyticsTable(elements.table, { view, metricMeta, annualRows, monthlyRows, year: state.year, comparisonYear });
        renderAviationAnalyticsChart(moduleKey, elements.chartCanvas, { view, metricMeta, annualRows, monthlyRows, year: state.year, comparisonYear }, forceResize);
        renderAviationAnalyticsInsights(elements.insights, { view, metricMeta, metricKey, annualRows, monthlyRows, year: state.year, comparisonYear, metricData, moduleKey });
        renderAviationAnalyticsLabels(elements.labels, { view, metricMeta, year: state.year, comparisonYear, availableYears, state });

        if (elements.yearGroup) elements.yearGroup.classList.toggle('d-none', view !== 'mensual');
        if (elements.comparisonGroup) elements.comparisonGroup.classList.toggle('d-none', view !== 'mensual');
        if (elements.yearSelect && state.year) elements.yearSelect.value = state.year;
        if (elements.comparisonSelect) elements.comparisonSelect.value = state.comparison;
    } catch (err) {
        console.warn('renderAviationAnalyticsModule error:', err);
    }
}

function rerenderAviationAnalyticsModules(forceResizeForActive = false) {
    Object.keys(AVIATION_ANALYTICS_UI).forEach((moduleKey) => {
        const config = AVIATION_ANALYTICS_UI[moduleKey];
        if (!config || !config.elements) return;
        const tabPane = document.getElementById(config.tabPaneId);
        const isActive = tabPane && tabPane.classList.contains('show') && tabPane.classList.contains('active');
        const shouldForceResize = forceResizeForActive && !!isActive;
        renderAviationAnalyticsModule(moduleKey, shouldForceResize);
    });
}

function initAviationAnalyticsModule(moduleKey) {
    try {
        const config = AVIATION_ANALYTICS_UI[moduleKey];
        const dataset = AVIATION_ANALYTICS_DATA[moduleKey];
        const state = aviationAnalyticsState[moduleKey];
        if (!config || !dataset || !state) return;

        const metricSelect = document.getElementById(config.metricSelectId);
        const viewSelect = document.getElementById(config.viewSelectId);
        const yearSelect = document.getElementById(config.yearSelectId);
        const comparisonSelect = document.getElementById(config.comparisonSelectId);
        if (!metricSelect || !viewSelect || !yearSelect || !comparisonSelect) return;

        const resetBtn = document.getElementById(config.resetBtnId);
        const yearGroup = document.getElementById(config.yearGroupId);
        const comparisonGroup = document.getElementById(config.comparisonGroupId);
        const summaryCards = document.getElementById(config.summaryContainerId);
        const chartCanvas = document.getElementById(config.chartCanvasId);
        const insights = document.getElementById(config.insightsId);
        const tableWrapper = document.getElementById(config.tableWrapperId);
        const dataTable = document.getElementById(config.dataTableId);
        const emptyState = document.getElementById(config.emptyStateId);
        const footnote = document.getElementById(config.footnoteId);
        const chartTag = document.getElementById(config.chartTagId);
        const chartSubtitle = document.getElementById(config.chartSubtitleId);
        const tableTag = document.getElementById(config.tableTagId);
        const tableCaption = document.getElementById(config.tableCaptionId);
        const tabButton = document.getElementById(config.tabButtonId);

        config.elements = {
            metricSelect,
            viewSelect,
            yearSelect,
            comparisonSelect,
            resetBtn,
            yearGroup,
            comparisonGroup,
            summaryCards,
            chartCanvas,
            insights,
            table: {
                table: dataTable,
                thead: dataTable ? dataTable.querySelector('thead') : null,
                tbody: dataTable ? dataTable.querySelector('tbody') : null,
                emptyState,
                wrapper: tableWrapper
            },
            labels: {
                chartTag,
                chartSubtitle,
                tableTag,
                tableCaption,
                footnote
            },
            tabButton
        };

        const availableYearsRaw = dataset.years || [];
        const availableYears = availableYearsRaw.map((year) => String(year));
        yearSelect.innerHTML = availableYears.map((year) => `<option value="${year}">${year}</option>`).join('');
        const defaultYear = availableYears[availableYears.length - 1] || '';
        state.year = defaultYear || null;
        if (state.year) yearSelect.value = state.year;

        const moduleMetrics = (config.metrics && config.metrics.length ? config.metrics : dataset.metrics) || ['operaciones'];
        if (!moduleMetrics.includes(state.metric)) {
            state.metric = moduleMetrics[0];
        }
        metricSelect.innerHTML = moduleMetrics.map((metricKey) => `<option value="${metricKey}">${AVIATION_ANALYTICS_METRIC_META[metricKey]?.label || metricKey}</option>`).join('');

        metricSelect.value = state.metric;
        viewSelect.value = state.view;
        updateComparisonOptions(moduleKey, comparisonSelect, availableYears, state.year);

        metricSelect.addEventListener('change', () => {
            const selected = metricSelect.value;
            state.metric = moduleMetrics.includes(selected) ? selected : moduleMetrics[0];
            metricSelect.value = state.metric;
            renderAviationAnalyticsModule(moduleKey, true);
        });

        viewSelect.addEventListener('change', () => {
            state.view = viewSelect.value === 'mensual' ? 'mensual' : 'anual';
            renderAviationAnalyticsModule(moduleKey, true);
        });

        yearSelect.addEventListener('change', () => {
            state.year = yearSelect.value || null;
            updateComparisonOptions(moduleKey, comparisonSelect, availableYears, state.year);
            renderAviationAnalyticsModule(moduleKey, true);
        });

        comparisonSelect.addEventListener('change', () => {
            state.comparison = comparisonSelect.value || 'previous';
            renderAviationAnalyticsModule(moduleKey);
        });

        if (resetBtn && !resetBtn.dataset.bound) {
            resetBtn.dataset.bound = '1';
            resetBtn.addEventListener('click', (event) => {
                event.preventDefault();
                state.metric = moduleMetrics[0];
                state.view = 'anual';
                state.year = defaultYear || null;
                state.comparison = 'previous';
                metricSelect.value = state.metric;
                viewSelect.value = 'anual';
                if (state.year) yearSelect.value = state.year;
                updateComparisonOptions(moduleKey, comparisonSelect, availableYears, state.year);
                renderAviationAnalyticsModule(moduleKey, true);
            });
        }

        if (tabButton && !tabButton.dataset.bound) {
            tabButton.dataset.bound = '1';
            tabButton.addEventListener('shown.bs.tab', () => renderAviationAnalyticsModule(moduleKey, true));
        }
    } catch (err) {
        console.warn('initAviationAnalyticsModule error:', err);
    }
}

async function initializeAviationAnalyticsModules() {
    try {
        const dataset = await ensureAviationAnalyticsData();
        if (!dataset) {
            setAviationAnalyticsUnavailableState('No se pudo cargar data/aviacion_analytics.json. Revisa el archivo y vuelve a intentarlo.');
            return;
        }
        Object.keys(AVIATION_ANALYTICS_UI).forEach((moduleKey) => initAviationAnalyticsModule(moduleKey));
        rerenderAviationAnalyticsModules(true);
        startAviationAnalyticsAutoRefresh();
    } catch (err) {
        console.warn('initializeAviationAnalyticsModules error:', err);
        setAviationAnalyticsUnavailableState('No se pudieron inicializar los tableros de aviación.');
    }
}

document.addEventListener('DOMContentLoaded', initializeAviationAnalyticsModules);

// ================== Operaciones Totales: wiring de filtros del modal ==================
document.addEventListener('DOMContentLoaded', () => {
    try {
        initLoginSkyScene();
        updateLoginSkyScene(true);
        if (!loginSkyIntervalId) {
            loginSkyIntervalId = window.setInterval(() => updateLoginSkyScene(), 60000);
        }
    } catch (_) {}
    try {
        // Inicializar hashes de autenticación lo antes posible
    ensureAuthHashes();
    const toggleMonthly = document.getElementById('toggle-monthly-2025');
    const toggleWeekly = document.getElementById('toggle-weekly-view');
    const toggleYearly = document.getElementById('toggle-yearly-view');
        const weeklyWeekFilter = document.getElementById('weekly-week-filter');
        const weeklyWeekSelect = document.getElementById('weekly-week-select');
        const weeklyWeekPicker = document.getElementById('weekly-week-picker');
        const weeklyWeekHint = document.getElementById('weekly-week-hint');
        const weeklyDayFilter = document.getElementById('weekly-day-filter');
        const weeklyDaySelect = document.getElementById('weekly-day-select');
        const yearsHint = document.getElementById('years-disabled-hint');
        const monthsPanel = document.getElementById('ops-months-2025');
        const monthsAll = document.getElementById('months-select-all');
        const monthsNone = document.getElementById('months-select-none');
        const sectionsBox = document.getElementById('ops-sections-filters');
        const yearsBox = document.getElementById('ops-years-filters');
    const presetOps = document.getElementById('preset-ops');
    const presetPassengers = document.getElementById('preset-passengers');
    const presetCargoTon = document.getElementById('preset-cargo-ton');
    const presetFull = document.getElementById('preset-full');

        refreshOpsYearFilters();
        refreshOpsMonthlyYearLabels();
        refreshOpsMonthsSelectionUI();

        function refreshDisabledYears(disabled){
            yearsBox?.querySelectorAll('input[type="checkbox"]').forEach(inp => { inp.disabled = disabled; });
            if (yearsHint) yearsHint.classList.toggle('d-none', !disabled);
        }

        function syncToggleStates(){
            if (toggleWeekly) {
                const usable = !toggleWeekly.disabled;
                toggleWeekly.checked = usable && opsUIState.mode === 'weekly';
            }
            if (toggleMonthly) toggleMonthly.checked = opsUIState.mode === 'monthly';
            if (toggleYearly) toggleYearly.checked = opsUIState.mode === 'yearly';
        }

        let adjustingMode = false;

        function getSortedWeeklyCatalog(withDataOnly = false){
            const catalog = getWeeklyDatasetsCatalog();
            if (!Array.isArray(catalog)) return [];
            const sorted = catalog.slice().sort((a, b) => {
                const aEnd = parseIsoDay(a?.rango?.fin || '') || new Date(0);
                const bEnd = parseIsoDay(b?.rango?.fin || '') || new Date(0);
                return bEnd - aEnd;
            });
            return withDataOnly ? sorted.filter(hasWeekData) : sorted;
        }

        function cleanWeekRangeLabel(label = '') {
            return label
                .replace(/^Semana\s+del\s+/i, '')
                .replace(/^Comparativo semanal del\s+/i, '')
                .replace(/\.$/, '')
                .trim();
        }

        function buildWeekGroupsByMonth(weeks){
            const groups = [];
            weeks.forEach((week) => {
                const startDate = getWeekStartDate(week) || parseIsoDay(week?.rango?.fin || '') || parseIsoDay(week?.dias?.[0]?.fecha || '');
                const monthKey = startDate ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}` : 'otros';
                let group = groups.find((entry) => entry.key === monthKey);
                if (!group) {
                    const monthName = startDate ? capitalizeFirst(SPANISH_MONTH_NAMES[startDate.getMonth()] || '') : 'Sin fecha';
                    const label = startDate ? `${monthName} ${startDate.getFullYear()}` : 'Semanas sin rango definido';
                    group = { key: monthKey, label, weeks: [], sortDate: startDate || new Date(0) };
                    groups.push(group);
                }
                group.weeks.push(week);
            });
            groups.sort((a, b) => b.sortDate - a.sortDate);
            return groups;
        }

        function renderWeeklyWeekPicker(weeks, options = {}) {
            if (!weeklyWeekPicker) return;
            const { autoLabel = '', hasAny = false, currentHasData = false } = options;
            const activeWeekId = opsUIState.weeklyWeekId || 'auto';
            weeklyWeekPicker.innerHTML = '';

            const createChip = ({ id, title, subtitle, badge, disabled = false }) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'weekly-week-chip';
                button.dataset.weekId = id;
                if (badge) {
                    button.classList.add('weekly-week-chip--has-badge');
                }
                if (id === activeWeekId) {
                    button.classList.add('is-active');
                }
                if (disabled) {
                    button.classList.add('is-disabled');
                    button.disabled = true;
                }
                button.setAttribute('aria-pressed', id === activeWeekId ? 'true' : 'false');
                button.innerHTML = `
                    <span class="chip-title">${escapeHTML(title)}</span>
                    ${subtitle ? `<span class="chip-subtitle">${escapeHTML(subtitle)}</span>` : ''}
                    ${badge ? `<span class="chip-badge">${escapeHTML(badge)}</span>` : ''}
                `;
                return button;
            };

            const fragment = document.createDocumentFragment();
            const autoRow = document.createElement('div');
            autoRow.className = 'weekly-week-chip-row weekly-week-chip-row-auto';
            autoRow.appendChild(createChip({
                id: 'auto',
                title: 'Semana actual',
                subtitle: currentHasData && autoLabel ? autoLabel : 'Selección automática',
                badge: 'AUTO',
                disabled: !currentHasData && !weeks.length
            }));
            fragment.appendChild(autoRow);

            if (!weeks.length) {
                const emptyState = document.createElement('p');
                emptyState.className = 'text-muted small mb-0';
                emptyState.textContent = currentHasData ? 'Solo hay datos de la semana actual.' : 'Aún no hay semanas con datos en el catálogo.';
                weeklyWeekPicker.classList.add('is-empty');
                fragment.appendChild(emptyState);
            } else {
                weeklyWeekPicker.classList.remove('is-empty');
                const groups = buildWeekGroupsByMonth(weeks);
                groups.forEach((group) => {
                    const wrapper = document.createElement('div');
                    const label = document.createElement('div');
                    label.className = 'weekly-week-month-label';
                    label.textContent = group.label;
                    wrapper.appendChild(label);
                    const row = document.createElement('div');
                    row.className = 'weekly-week-chip-row';
                    group.weeks.forEach((week) => {
                        const ordinalLabel = formatWeekOrdinalLabel(week);
                        const rangeLabel = cleanWeekRangeLabel(formatWeekLabel(week));
                        row.appendChild(createChip({
                            id: week.id,
                            title: ordinalLabel || rangeLabel || 'Semana',
                            subtitle: ordinalLabel && rangeLabel && ordinalLabel !== rangeLabel ? rangeLabel : (ordinalLabel || rangeLabel || ''),
                            badge: null
                        }));
                    });
                    wrapper.appendChild(row);
                    fragment.appendChild(wrapper);
                });
            }

            weeklyWeekPicker.appendChild(fragment);
            if (weeklyWeekHint) {
                weeklyWeekHint.textContent = hasAny || currentHasData
                    ? 'Selecciona la semana que desees analizar.'
                    : 'No hay semanas disponibles; agrega datos para habilitar este filtro.';
            }
        }

        function populateWeeklyWeekOptions(){
            if (!weeklyWeekSelect) return { weeks: [], hasAny: false, currentHasData: false };
            const currentWeekRaw = staticData?.operacionesSemanaActual || null;
            const currentWeek = currentWeekRaw ? deepCloneWeek(currentWeekRaw) : null;
            const currentHasData = hasWeekData(currentWeek);
            const sorted = getSortedWeeklyCatalog(true);
            const hasAny = sorted.length > 0 || currentHasData;
            weeklyWeekSelect.innerHTML = '';
            const autoOpt = document.createElement('option');
            autoOpt.value = 'auto';
            const autoLabel = currentWeek ? formatWeekOptionLabel(currentWeek) : '';
            autoOpt.textContent = currentHasData && autoLabel ? `Semana actual (${autoLabel})` : 'Semana actual (automático)';
            weeklyWeekSelect.appendChild(autoOpt);
            const seen = new Set();
            const distinctWeeks = [];
            sorted.forEach(week => {
                if (!week?.id || seen.has(week.id)) return;
                seen.add(week.id);
                distinctWeeks.push(week);
                const opt = document.createElement('option');
                opt.value = week.id;
                let label = formatWeekOptionLabel(week);
                if (currentWeek && week.id === currentWeek.id && label) label += ' (actual)';
                opt.textContent = label || week.id;
                weeklyWeekSelect.appendChild(opt);
            });
            let desired = opsUIState.weeklyWeekId || 'auto';
            if (desired !== 'auto' && !seen.has(desired)) {
                desired = 'auto';
            }
            opsUIState.weeklyWeekId = desired;
            weeklyWeekSelect.value = desired;
            weeklyWeekSelect.disabled = !hasAny;
            if (toggleWeekly) {
                toggleWeekly.disabled = !hasAny;
            }
            renderWeeklyWeekPicker(distinctWeeks, { hasAny, currentHasData, autoLabel });
            return { weeks: distinctWeeks, hasAny, currentHasData };
        }

        function populateWeeklyDayOptions(){
            if (!weeklyDaySelect) return { hasDays: false };
            const activeWeek = getActiveWeeklyDataset();
            const days = Array.isArray(activeWeek?.dias) ? activeWeek.dias : [];
            weeklyDaySelect.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = 'all';
            optAll.textContent = 'Semana completa';
            weeklyDaySelect.appendChild(optAll);
            days.forEach(day => {
                if (!day?.fecha) return;
                const opt = document.createElement('option');
                opt.value = day.fecha;
                opt.textContent = day.labelFull || day.label || day.fecha;
                weeklyDaySelect.appendChild(opt);
            });
            if (!days.some(day => day?.fecha === opsUIState.weeklyDay)) {
                opsUIState.weeklyDay = 'all';
            }
            weeklyDaySelect.value = opsUIState.weeklyDay;
            weeklyDaySelect.disabled = !days.length || opsUIState.mode !== 'weekly';
            return { hasDays: days.length > 0, week: activeWeek };
        }

        function syncWeeklyControls(){
            const isWeekly = opsUIState.mode === 'weekly';
            if (weeklyWeekFilter) weeklyWeekFilter.classList.toggle('d-none', !isWeekly);
            if (weeklyDayFilter) weeklyDayFilter.classList.toggle('d-none', !isWeekly);
            if (!isWeekly) {
                opsUIState.weeklyDay = 'all';
                if (weeklyDaySelect) weeklyDaySelect.value = 'all';
            }
            syncToggleStates();
        }

        function forceMode(newMode){
            if (!['weekly','monthly','yearly'].includes(newMode)) return;
            if (newMode === 'weekly' && toggleWeekly && toggleWeekly.disabled) {
                newMode = 'monthly';
                if (!toggleMonthly || toggleMonthly.disabled) newMode = 'yearly';
            }
            adjustingMode = true;
            let availability = { weeks: [], hasAny: true, currentHasData: false };
            try {
                opsUIState.mode = newMode;
                refreshDisabledYears(newMode !== 'yearly');
                if (monthsPanel) monthsPanel.style.display = newMode === 'monthly' ? '' : 'none';
                syncToggleStates();
                availability = populateWeeklyWeekOptions();
                if (opsUIState.mode === 'weekly' && opsUIState.weeklyWeekId === 'auto' && !availability.currentHasData && availability.weeks.length) {
                    opsUIState.weeklyWeekId = availability.weeks[0].id;
                    availability = populateWeeklyWeekOptions();
                }
                syncWeeklyControls();
                populateWeeklyDayOptions();
            } finally {
                adjustingMode = false;
            }
            if (opsUIState.mode === 'weekly' && !availability.hasAny) {
                const fallback = (toggleMonthly && !toggleMonthly.disabled) ? 'monthly' : 'yearly';
                if (fallback !== 'weekly') {
                    forceMode(fallback);
                    return;
                }
            }
            renderOperacionesTotales();
        }

        if (weeklyDaySelect && !weeklyDaySelect.dataset.bound) {
            weeklyDaySelect.dataset.bound = '1';
            weeklyDaySelect.addEventListener('change', () => {
                opsUIState.weeklyDay = weeklyDaySelect.value || 'all';
                if (opsUIState.mode === 'weekly') {
                    renderOperacionesTotales();
                }
            });
        }

        if (weeklyWeekSelect && !weeklyWeekSelect.dataset.bound) {
            weeklyWeekSelect.dataset.bound = '1';
            weeklyWeekSelect.addEventListener('change', () => {
                opsUIState.weeklyWeekId = weeklyWeekSelect.value || 'auto';
                opsUIState.weeklyDay = 'all';
                if (weeklyDaySelect) weeklyDaySelect.value = 'all';
                populateWeeklyWeekOptions();
                populateWeeklyDayOptions();
                if (opsUIState.mode === 'weekly') {
                    renderOperacionesTotales();
                }
            });
        }

        if (weeklyWeekPicker && !weeklyWeekPicker.dataset.bound) {
            weeklyWeekPicker.dataset.bound = '1';
            weeklyWeekPicker.addEventListener('click', (event) => {
                const chip = event.target.closest('[data-week-id]');
                if (!chip || chip.classList.contains('is-disabled')) return;
                const targetWeek = chip.dataset.weekId || 'auto';
                if (targetWeek === opsUIState.weeklyWeekId) return;
                opsUIState.weeklyWeekId = targetWeek;
                if (weeklyWeekSelect) {
                    weeklyWeekSelect.value = targetWeek;
                }
                opsUIState.weeklyDay = 'all';
                if (weeklyDaySelect) weeklyDaySelect.value = 'all';
                populateWeeklyWeekOptions();
                populateWeeklyDayOptions();
                if (opsUIState.mode === 'weekly') {
                    renderOperacionesTotales();
                }
            });
        }

        if (toggleMonthly && !toggleMonthly._wired) {
            toggleMonthly._wired = 1;
            toggleMonthly.addEventListener('change', () => forceMode('monthly'));
        }

        if (toggleWeekly && !toggleWeekly._wired) {
            toggleWeekly._wired = 1;
            toggleWeekly.addEventListener('change', () => forceMode('weekly'));
        }

        if (toggleYearly && !toggleYearly._wired) {
            toggleYearly._wired = 1;
            toggleYearly.addEventListener('change', () => forceMode('yearly'));
        }

        // Inicial: sincronizar modo actual
        const initialAvailability = populateWeeklyWeekOptions();
        populateWeeklyDayOptions();
        syncWeeklyControls();
        refreshDisabledYears(opsUIState.mode !== 'yearly');
        if (monthsPanel) monthsPanel.style.display = opsUIState.mode === 'monthly' ? '' : 'none';
        syncToggleStates();
        if (opsUIState.mode === 'weekly' && !initialAvailability.hasAny) {
            const fallback = (toggleMonthly && !toggleMonthly.disabled) ? 'monthly' : 'yearly';
            if (fallback !== 'weekly') forceMode(fallback);
        }

        if (sectionsBox && !sectionsBox._wired) {
            sectionsBox._wired = 1;
            sectionsBox.addEventListener('change', () => {
                opsUIState.sections.comercial = document.getElementById('filter-section-comercial')?.checked !== false;
                opsUIState.sections.carga = document.getElementById('filter-section-carga')?.checked !== false;
                opsUIState.sections.general = document.getElementById('filter-section-general')?.checked !== false;
                renderOperacionesTotales();
            });
        }

        if (yearsBox && !yearsBox._wired) {
            yearsBox._wired = 1;
            yearsBox.addEventListener('change', () => {
                const ys = new Set();
                yearsBox.querySelectorAll('input[type="checkbox"]').forEach(inp => { if (inp.checked) ys.add(String(inp.dataset.year)); });
                opsUIState.years = ys;
                renderOperacionesTotales();
            });
        }

        function readMonths(){
            const sel = new Set();
            const activeYear = opsUIState?.activeMonthlyYear ? String(opsUIState.activeMonthlyYear) : getOpsActiveMonthlyYear();
            const allowed = createAllowedMonthsSet(activeYear);
            monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach((inp) => {
                if (!inp.checked) return;
                const code = String(inp.dataset.month || '').padStart(2, '0');
                if (allowed.size && !allowed.has(code)) return;
                sel.add(code);
            });
            if (!sel.size && allowed.size) {
                allowed.forEach((code) => sel.add(String(code).padStart(2, '0')));
            }
            opsUIState.months2025 = sel;
        }
        if (monthsPanel && !monthsPanel._wired) {
            monthsPanel._wired = 1;
            monthsPanel.addEventListener('change', (e) => {
                if (e.target && e.target.matches('input[type="checkbox"][data-month]')) {
                    readMonths();
                    renderOperacionesTotales();
                }
            });
        }
        if (monthsAll && !monthsAll._wired) {
            monthsAll._wired = 1;
            monthsAll.addEventListener('click', () => {
                const activeYear = opsUIState?.activeMonthlyYear ? String(opsUIState.activeMonthlyYear) : getOpsActiveMonthlyYear();
                const allowed = createAllowedMonthsSet(activeYear);
                monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach((inp) => {
                    const code = String(inp.dataset.month || '').padStart(2, '0');
                    inp.checked = allowed.has(code);
                });
                readMonths();
                renderOperacionesTotales();
            });
        }
        if (monthsNone && !monthsNone._wired) {
            monthsNone._wired = 1;
            monthsNone.addEventListener('click', () => {
                monthsPanel?.querySelectorAll('input[type="checkbox"]').forEach((inp) => {
                    inp.checked = false;
                });
                readMonths();
                renderOperacionesTotales();
            });
        }

    if (presetOps && !presetOps._wired) { presetOps._wired = 1; presetOps.addEventListener('click', ()=>{ opsUIState.preset='ops'; renderOperacionesTotales(); }); }
    if (presetPassengers && !presetPassengers._wired) { presetPassengers._wired = 1; presetPassengers.addEventListener('click', ()=>{ opsUIState.preset='pax'; renderOperacionesTotales(); }); }
    if (presetCargoTon && !presetCargoTon._wired) { presetCargoTon._wired = 1; presetCargoTon.addEventListener('click', ()=>{ opsUIState.preset='cargoTon'; renderOperacionesTotales(); }); }
    if (presetFull && !presetFull._wired) { presetFull._wired = 1; presetFull.addEventListener('click', ()=>{ opsUIState.preset='full'; renderOperacionesTotales(); }); }
    } catch (_) {}
});

// Manifiestos: UI mínima (preview de imagen y tabla local)
function setupManifestsUI() {
    try {
        const up = document.getElementById('manifest-upload');
        const prevImg = document.getElementById('manifest-preview');
        const placeholder = document.getElementById('manifest-preview-placeholder');
        const runBtn = document.getElementById('manifest-run-ocr');
    const loadEx = document.getElementById('manifest-load-example');
        const tableBody = document.querySelector('#manifest-records-table tbody');
        const saveBtn = document.getElementById('manifest-save');
        const clearBtn = document.getElementById('manifest-clear');
        const exportBtn = document.getElementById('manifest-export-json');
        const dirArr = document.getElementById('mf-dir-arr');
    const dirDep = document.getElementById('mf-dir-dep');
    const form = document.getElementById('manifest-form');
    // Estado: imagen actual (solo imágenes)
    let currentImageURL = '';
        // Carga de catálogo: airlines.csv (IATA,ICAO,Name)
        let airlinesCatalog = [];
    let iataToIcao = new Map();
    let icaoSet = new Set();
    // Catálogos de aeronaves
    let aircraftByReg = new Map(); // reg -> { type, ownerIATA }
    let typeByCode = new Map();    // IATA code -> { ICAO, Name }
    // Aeropuertos
    let airportByIATA = new Map(); // IATA -> Name
    let airportByName = new Map(); // lowercase Name -> IATA
    let iataSet = new Set();
        // OCR helpers locales
        function hasWordFactory(text){ const U=(text||'').toUpperCase(); return (w)=> U.includes(String(w||'').toUpperCase()); }
        function tokenizeUpper(text){ return (text||'').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean); }
        const timeRx = /\b(?:([01]?\d|2[0-3])[:hH\.]\s?([0-5]\d))(?:\s?(?:hrs|hr|h))?\b/;
        function findNearLabelValue(labels, valueRegex, text){
            try{
                const lines = (text||'').split(/\r?\n/);
                for (let i=0;i<lines.length;i++){
                    const u = lines[i].toUpperCase();
                    if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                        const m0 = lines[i].match(valueRegex); if (m0) return m0[0];
                        const n = lines[i+1]||''; const m1 = n.match(valueRegex); if (m1) return m1[0];
                    }
                }
            }catch(_){ }
            return '';
        }
        function findNearLabelIATACode(labels, text){
            const rxIATA = /\b[A-Z]{3}\b/g;
            try{
                const lines = (text||'').split(/\r?\n/);
                for (let i=0;i<lines.length;i++){
                    const u = lines[i].toUpperCase();
                    if (labels.some(lbl => u.includes(String(lbl||'').toUpperCase()))){
                        const search = (s)=>{ const arr = s.match(rxIATA)||[]; return arr.find(c=> iataSet.has(c)); };
                        const hit = search(lines[i]) || search(lines[i+1]||'');
                        if (hit) return hit;
                    }
                }
            }catch(_){ }
            return '';
        }
        function preprocessImage(imgEl){
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const w = imgEl.naturalWidth || imgEl.width;
                const h = imgEl.naturalHeight || imgEl.height;
                canvas.width = w; canvas.height = h;
                ctx.drawImage(imgEl, 0, 0, w, h);
                const imgData = ctx.getImageData(0,0,w,h);
                const d = imgData.data;
                let sum = 0;
                for (let i=0;i<d.length;i+=4){
                    const r=d[i], g=d[i+1], b=d[i+2];
                    let y = 0.299*r + 0.587*g + 0.114*b;
                    y = (y-128)*1.1 + 128; // contraste
                    sum += y;
                    d[i]=d[i+1]=d[i+2]=y;
                }
                const avg = sum / (d.length/4);
                const thresh = Math.max(96, Math.min(160, avg));
                for (let i=0;i<d.length;i+=4){
                    const y = d[i];
                    const v = y > thresh ? 255 : 0;
                    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
                }
                ctx.putImageData(imgData,0,0);
                return canvas.toDataURL('image/png');
            } catch(e){ console.warn('preprocessImage failed:', e); return imgEl.src; }
        }
        async function loadAirlinesCatalog(){
            try {
                const res = await fetch('data/master/airlines.csv', { cache:'no-store' });
                const text = await res.text();
                const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
                // Esperado: header IATA,ICAO,Name
                const out = [];
                for (let i=1;i<lines.length;i++){
                    const raw = lines[i];
                    const parts = raw.split(',');
                    if (parts.length < 3) continue;
                    const IATA = (parts[0]||'').trim();
                    const ICAO = (parts[1]||'').trim();
                    const Name = parts.slice(2).join(',').trim().replace(/^"|"$/g,'');
                    if (ICAO && /^[A-Za-z]{3}$/.test(ICAO)) {
                        const icao = ICAO.toUpperCase();
                        const iata = (IATA||'').toUpperCase();
                        out.push({ IATA: iata, ICAO: icao, Name });
                        icaoSet.add(icao);
                        if (iata && /^[A-Z0-9]{2}$/.test(iata)) iataToIcao.set(iata, icao);
                    }
                }
                airlinesCatalog = out;
                // Poblar datalist
                const dl = document.getElementById('airlines-icao-list');
                if (dl){ dl.innerHTML = out.map(r=>`<option value="${r.ICAO}">${r.Name}</option>`).join(''); }
            } catch (e) { console.warn('No se pudo cargar airlines.csv', e); }
        }
        async function loadAircraftCatalog(){
            try {
                // aircraft.csv: Registration,Aircraft Type,Aircraft Owner,Max Capacity,Usage,MTOW,Winglets,Aircraft Groups
                const resA = await fetch('data/master/aircraft.csv', { cache:'no-store' });
                const textA = await resA.text();
                const linesA = textA.split(/\r?\n/).filter(l=>l.trim());
                const regOptions = [];
                for (let i=1;i<linesA.length;i++){
                    const row = linesA[i];
                    const parts = row.split(',');
                    if (parts.length < 3) continue;
                    const reg = (parts[0]||'').trim().toUpperCase();
                    const type = (parts[1]||'').trim().toUpperCase(); // IATA code (e.g., 32N, E90, 77F)
                    const ownerIATA = (parts[2]||'').trim().toUpperCase();
                    if (reg) { aircraftByReg.set(reg, { type, ownerIATA }); regOptions.push(`<option value="${reg}"></option>`); }
                }
                const dlReg = document.getElementById('aircraft-reg-list');
                if (dlReg) dlReg.innerHTML = regOptions.join('');
            } catch(e){ console.warn('No se pudo cargar aircraft.csv', e); }
            try {
                // aircraft type.csv: IATA code, ICAO Code, Name, ...
                const resT = await fetch('data/master/aircraft type.csv', { cache:'no-store' });
                const textT = await resT.text();
                const linesT = textT.split(/\r?\n/).filter(l=>l.trim());
                const typeOptions = [];
                for (let i=1;i<linesT.length;i++){
                    const row = linesT[i];
                    // split conservando posibles comas en Name entre comillas simples: el dataset parece simple; usamos split directo
                    const parts = row.split(',');
                    if (parts.length < 2) continue;
                    const codeIATA = (parts[0]||'').trim().toUpperCase();
                    const icao = (parts[1]||'').trim().toUpperCase();
                    const name = (parts[2]||'').trim();
                    if (codeIATA) { typeByCode.set(codeIATA, { ICAO: icao, Name: name }); }
                    if (icao) typeOptions.push(`<option value="${icao}">${name?name:''}</option>`);
                }
                const dlType = document.getElementById('aircraft-type-icao-list');
                if (dlType) dlType.innerHTML = typeOptions.join('');
            } catch(e){ console.warn('No se pudo cargar aircraft type.csv', e); }
        }
        async function loadAirportsCatalog(){
            try {
                const res = await fetch('data/master/airports.csv', { cache:'no-store' });
                const text = await res.text();
                const lines = text.split(/\r?\n/).filter(l=>l.trim());
                // Pequeño parser CSV que respeta comillas para obtener columnas exactas
                function parseCSVLine(line){
                    const cols = [];
                    let cur = '';
                    let inQuotes = false;
                    for (let idx = 0; idx < line.length; idx++){
                        const ch = line[idx];
                        if (ch === '"'){
                            if (inQuotes && line[idx+1] === '"') { cur += '"'; idx++; }
                            else { inQuotes = !inQuotes; }
                        } else if (ch === ',' && !inQuotes) {
                            cols.push(cur); cur = '';
                        } else {
                            cur += ch;
                        }
                    }
                    cols.push(cur);
                    return cols;
                }
                const optsIATA = [];
                const optsName = [];
                for (let i=1; i<lines.length; i++){
                    const row = lines[i];
                    const parts = parseCSVLine(row);
                    // Esperado: IATA, ICAO, Name, Country, City, Security level
                    if (parts.length < 3) continue;
                    const IATA = (parts[0]||'').trim().toUpperCase();
                    // const ICAO = (parts[1]||'').trim().toUpperCase(); // no usado aquí
                    const Name = (parts[2]||'').trim().replace(/^"|"$/g,''); // SOLO Name
                    if (!IATA || !Name) continue;
                    airportByIATA.set(IATA, Name);
                    airportByName.set(Name.toLowerCase(), IATA);
                    iataSet.add(IATA);
                    optsIATA.push(`<option value="${IATA}">${Name}</option>`);
                    optsName.push(`<option value="${Name}">${IATA}</option>`);
                }
                const dlIATA = document.getElementById('airports-iata-list');
                const dlName = document.getElementById('airports-name-list');
                if (dlIATA) dlIATA.innerHTML = optsIATA.join('');
                if (dlName) dlName.innerHTML = optsName.join('');
            } catch(e){ console.warn('No se pudo cargar airports.csv', e); }
        }

        // Toggle de campos según tipo (Llegada/Salida)
        function applyManifestDirection() {
            const isArrival = dirArr && dirArr.checked;
            // Mostrar/ocultar contenedores marcados
            document.querySelectorAll('[data-dir="arrival-only"]').forEach(el => { el.style.display = isArrival ? '' : 'none'; });
            document.querySelectorAll('[data-dir="departure-only"]').forEach(el => { el.style.display = isArrival ? 'none' : ''; });
            // required dinámicos
            const eta = document.getElementById('mf-time-arr');
            const etd = document.getElementById('mf-time-dep');
            const dest = document.getElementById('mf-final-dest');
            const destCode = document.getElementById('mf-final-dest-code');
            const originName = document.getElementById('mf-origin-name');
            const originCode = document.getElementById('mf-origin-code');
            const nextStopCode = document.getElementById('mf-next-stop-code');
            // Llegada movement fields
            const arrOriginName = document.getElementById('mf-arr-origin-name');
            const arrOriginCode = document.getElementById('mf-arr-origin-code');
            const arrSlotAssigned = document.getElementById('mf-arr-slot-assigned');
            const arrSlotCoordinated = document.getElementById('mf-arr-slot-coordinated');
            const arrLastStop = document.getElementById('mf-arr-last-stop');
            const arrLastStopCode = document.getElementById('mf-arr-last-stop-code');
            const arrArriboPos = document.getElementById('mf-arr-arribo-posicion');
            const arrInicioDes = document.getElementById('mf-arr-inicio-desembarque');
            if (eta) eta.required = !!isArrival;
            if (originName) originName.required = !isArrival; // solo en salida según ejemplo
            if (originCode) originCode.required = !isArrival;
            if (nextStopCode) nextStopCode.required = false; // opcional
            if (etd) etd.required = !isArrival;
            if (dest) dest.required = !isArrival;
            if (destCode) destCode.required = !isArrival;
            // Llegada: por ahora, campos informativos (no obligatorios)
            [arrOriginName, arrOriginCode, arrSlotAssigned, arrSlotCoordinated, arrLastStop, arrLastStopCode, arrArriboPos, arrInicioDes]
                .forEach(el => { if (el) el.required = false; });
            // Título
            const title = document.getElementById('mf-title');
            if (title) title.value = isArrival ? 'MANIFIESTO DE LLEGADA' : 'MANIFIESTO DE SALIDA';
        }
        // Inicial y wiring
        if (dirArr && !dirArr._wired) { dirArr._wired = 1; dirArr.addEventListener('change', applyManifestDirection); }
        if (dirDep && !dirDep._wired) { dirDep._wired = 1; dirDep.addEventListener('change', applyManifestDirection); }
        // Ejecutar una vez al cargar
        applyManifestDirection();

    // Cargar catálogo al entrar a la sección (solo cuando se sirve por http/https)
    if (location.protocol !== 'file:') {
        loadAirlinesCatalog();
        loadAircraftCatalog();
        loadAirportsCatalog();
    }

    function setPreview(src){ if (prevImg){ prevImg.src = src; prevImg.style.display = 'block'; } if (placeholder) placeholder.style.display = 'none'; if (runBtn) runBtn.disabled = false; currentImageURL = src; }
        if (up && !up._wired) { up._wired = 1; up.addEventListener('change', async (e)=>{
            const f = e.target.files && e.target.files[0]; if (!f) return;
            const url = URL.createObjectURL(f);
            setPreview(url);
        }); }
        if (loadEx && !loadEx._wired) { loadEx._wired = 1; loadEx.addEventListener('click', (e)=>{ e.preventDefault(); setPreview('examples/manifiesto1.jpg'); }); }
        if (runBtn && !runBtn._wired) {
            runBtn._wired = 1;
            runBtn.addEventListener('click', async ()=>{
                const s = document.getElementById('manifest-ocr-status');
                try {
                    if (!prevImg || !prevImg.src) { if (s) s.textContent = 'Cargue una imagen primero.'; return; }
                    if (s) s.textContent = 'Preprocesando imagen para OCR...';
                    const processed = preprocessImage(prevImg);
                    if (!window.Tesseract) { if (s) s.textContent = 'OCR no disponible (Tesseract.js no cargado).'; return; }
                    if (s) s.textContent = 'Reconociendo texto (OCR spa+eng)...';
                    const { data } = await Tesseract.recognize(processed, 'spa+eng', { logger: m => {}, tessedit_pageseg_mode: 6, user_defined_dpi: 300 });
                    const text = (data && data.text) ? data.text.trim() : '';
                    if (s) s.textContent = text ? ('Texto detectado (resumen):\n' + (text.slice(0,600)) + (text.length>600?'...':'')) : 'No se detectó texto.';
                    const hasWord = hasWordFactory(text);
                    const upperTokens = tokenizeUpper(text);

                    // 1) Inferir dirección (Llegada/Salida)
                    const isArrivalDoc = hasWord('LLEGADA') || hasWord('ARRIVAL');
                    const isDepartureDoc = hasWord('SALIDA') || hasWord('DEPARTURE');
                    if (isArrivalDoc && dirArr) { dirArr.checked = true; dirArr.dispatchEvent(new Event('change', { bubbles: true })); }
                    else if (isDepartureDoc && dirDep) { dirDep.checked = true; dirDep.dispatchEvent(new Event('change', { bubbles: true })); }

                    const currentIsArrival = dirArr && dirArr.checked;

                    // 2) Transportista OACI (3 letras) si aparece un código reconocido o desde prefijo de vuelo
                    try {
                        let carrierICAO = '';
                        const foundICAO = upperTokens.find(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && icaoSet.has(t));
                        if (foundICAO) carrierICAO = foundICAO;
                        let flightStr = findNearLabelValue(['vuelo','n° vuelo','no. vuelo','flight','flt'], /[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?/i, text);
                        if (!flightStr){
                            const m = text.match(/\b[A-Z]{2,3}\s?-?\s?\d{2,5}[A-Z]?\b/);
                            if (m) flightStr = m[0];
                        }
                        if (flightStr){
                            const cleaned = flightStr.replace(/\s|-/g,'');
                            const pref3 = cleaned.slice(0,3).toUpperCase();
                            const pref2 = cleaned.slice(0,2).toUpperCase();
                            if (!carrierICAO && icaoSet.has(pref3)) carrierICAO = pref3;
                            if (!carrierICAO && iataToIcao.has(pref2)) carrierICAO = iataToIcao.get(pref2) || '';
                            setVal('mf-flight', flightStr.trim());
                        }
                        if (carrierICAO) setVal('mf-carrier-3l', carrierICAO);
                    } catch(_){ }

                    // 3) Matrícula (varios formatos comunes)
                    try {
                        // Algunos patrones típicos: XA-ABC, XB-ABC, XC-ABC (MX), N123AB (US), HP-1234, HK-1234, LV-ABC, CC-ABC, PR-ABC, CP-XXXX, YV-XXXX, OB-XXXX, TG-XXXX, etc.
                        const tailPatterns = [
                            /\bX[A-C]-?[A-Z0-9]{3,5}\b/gi,   // México XA/XB/XC
                            /\bN\d{1,5}[A-Z]{0,2}\b/gi,      // USA
                            /\bH[KP]-?\d{3,5}\b/gi,          // Panamá/Colombia
                            /\bLV-?[A-Z0-9]{3,4}\b/gi,        // Argentina
                            /\bCC-?[A-Z0-9]{3,4}\b/gi,        // Chile
                            /\bPR-?[A-Z0-9]{3,4}\b/gi,        // Brasil
                            /\bCP-?\d{3,5}\b/gi,             // Bolivia
                            /\bYV-?\d{3,5}\b/gi,             // Venezuela
                            /\bOB-?\d{3,5}\b/gi,             // Perú
                            /\bTG-?\d{3,5}\b/gi,             // Guatemala
                            /\bXA[A-Z0-9]{0,}\b/gi            // fallback México
                        ];
                        let foundTail = '';
                        for (const rx of tailPatterns){ const m = text.match(rx); if (m && m.length){ foundTail = m[0].toUpperCase().replace(/\s+/g,''); break; } }
                        if (foundTail) setVal('mf-tail', foundTail);
                    } catch(_){}

                    // 4) Aeropuertos (por código IATA reconocido y/o por nombre) y horarios
                    try {
                        // Proximidad a etiquetas
                        const originCandLbl = findNearLabelIATACode(['origen','procedencia','from','procedencia del vuelo'], text);
                        const lastStopCandLbl = findNearLabelIATACode(['ultima escala','escala anterior','last stop','escala'], text);
                        const finalDestCandLbl = findNearLabelIATACode(['destino','to','destino del vuelo'], text);
                        const arrivalMainCandLbl = currentIsArrival ? findNearLabelIATACode(['aeropuerto de llegada','aeropuerto destino','aeropuerto de arribo','aeropuerto destino del vuelo'], text) : '';
                        // Buscar candidatos por tokens de 3 letras que existan en catálogo
                        const airportCodes = upperTokens.filter(t => t.length === 3 && /^[A-Z]{3}$/.test(t) && iataSet.has(t));
                        // Heurística por palabras clave en líneas
                        const rawLines = text.split(/\r?\n/);
                        let originCand = '';
                        let lastStopCand = '';
                        let finalDestCand = '';
                        let forcedLastStopFromOrigin = false;
                        for (const line of rawLines){
                            const u = line.toUpperCase();
                            // Origen/Procedencia
                            if (/ORIGEN|PROCEDENCIA|FROM\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) originCand = code;
                            }
                            // Última escala
                            if (/ULTIMA\s+ESCALA|LAST\s+STOP|ESCALA\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) lastStopCand = code;
                            }
                            // Destino
                            if (/DESTINO|TO\b/.test(u)){
                                const code = Array.from(iataSet).find(c => u.includes(c));
                                if (code) finalDestCand = code;
                            }
                        }
                        // Preferir lo encontrado por etiqueta
                        originCand = originCandLbl || originCand;
                        lastStopCand = lastStopCandLbl || lastStopCand;
                        finalDestCand = finalDestCandLbl || finalDestCand;
                        // Si aún no tenemos candidatos, usar los primeros tokens
                        if (!originCand && airportCodes[0]) originCand = airportCodes[0];
                        if (!lastStopCand && airportCodes[1]) lastStopCand = airportCodes[1];
                        if (!finalDestCand && airportCodes[2]) finalDestCand = airportCodes[2];

                        const airportCounts = airportCodes.reduce((acc, code)=>{
                            acc[code] = (acc[code] || 0) + 1;
                            return acc;
                        }, {});
                        const uniqueAirports = Object.keys(airportCounts);
                        const lastStopFromLabel = !!lastStopCandLbl;

                        if (currentIsArrival && !lastStopFromLabel){
                            const originCandidate = originCand || airportCodes[0] || '';
                            const arrivalMainGuess = arrivalMainCandLbl || '';
                            const isLikelyDirect = uniqueAirports.length <= 2;
                            if (!lastStopCand && originCandidate){
                                lastStopCand = originCandidate;
                                forcedLastStopFromOrigin = true;
                            } else if (originCandidate){
                                const alignsWithArrivalAirport = arrivalMainGuess && lastStopCand && lastStopCand === arrivalMainGuess;
                                const looksLikeDirect = isLikelyDirect && lastStopCand && lastStopCand !== originCandidate;
                                if (alignsWithArrivalAirport || looksLikeDirect){
                                    if (lastStopCand !== originCandidate){
                                        lastStopCand = originCandidate;
                                    }
                                    forcedLastStopFromOrigin = true;
                                }
                            }
                        }

                        if (currentIsArrival){
                            if (originCand) setVal('mf-arr-origin-code', originCand);
                            if (lastStopCand) {
                                setVal('mf-arr-last-stop-code', lastStopCand);
                                if (forcedLastStopFromOrigin){
                                    const nameEl = document.getElementById('mf-arr-last-stop');
                                    const hasName = ((nameEl && nameEl.value) || '').trim();
                                    if (!hasName){
                                        const originNameEl = document.getElementById('mf-arr-origin-name');
                                        const fallbackName = airportByIATA.get(lastStopCand) || ((originNameEl && originNameEl.value) || '');
                                        if (fallbackName) setVal('mf-arr-last-stop', fallbackName);
                                    }
                                }
                            }
                        } else {
                            if (originCand) setVal('mf-origin-code', originCand);
                            if (lastStopCand) setVal('mf-next-stop-code', lastStopCand);
                            if (finalDestCand){
                                setVal('mf-final-dest-code', finalDestCand);
                                const name = airportByIATA.get(finalDestCand) || '';
                                if (name) setVal('mf-final-dest', name);
                            }
                        }
                        // Horarios cercanos a etiquetas
                        const setTimeIf = (id, labels) => { const v = findNearLabelValue(labels, timeRx, text); if (v) setVal(id, v); };
                        if (currentIsArrival){
                            setTimeIf('mf-arr-slot-assigned', ['slot asignado']);
                            setTimeIf('mf-arr-slot-coordinated', ['slot coordinado']);
                            setTimeIf('mf-arr-arribo-posicion', ['entrada a la posicion','arribo a la posicion','arribo posicion']);
                            setTimeIf('mf-arr-inicio-desembarque', ['termino maniobras de desembarque','inicio de desembarque','inicio desembarque']);
                            setTimeIf('mf-arr-inicio-pernocta', ['inicio de pernocta','inicio pernocta']);
                        } else {
                            setTimeIf('mf-slot-assigned', ['slot asignado']);
                            setTimeIf('mf-slot-coordinated', ['slot coordinado']);
                            setTimeIf('mf-inicio-embarque', ['inicio de maniobras de embarque','inicio de embarque']);
                            setTimeIf('mf-salida-posicion', ['salida de la posicion','salida posicion']);
                            setTimeIf('mf-termino-pernocta', ['termino de pernocta','término de pernocta','fin pernocta']);
                        }
                    } catch(_){}

                    if (s) s.textContent += '\n\nAutorrelleno aplicado (si hubo coincidencias).';
                } catch(err){ if (s) s.textContent = 'Error en OCR: ' + (err?.message || err); }
            });
        }

        // Validación y autofill del transportista por OACI (3 letras)
        (function wireCarrierAutofill(){
            const carrier = document.getElementById('mf-carrier-3l');
            if (!carrier || carrier._wired) return; carrier._wired = 1;
            const opName = document.getElementById('mf-operator-name');
            const airlineName = document.getElementById('mf-airline');
            const setFromICAO = (val) => {
                const code = (val||'').toString().trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
                if (carrier.value !== code) carrier.value = code;
                if (code.length !== 3) return;
                const rec = airlinesCatalog.find(a=> a.ICAO === code);
                if (rec){
                    if (opName && !opName.value) opName.value = rec.Name;
                    if (airlineName && !airlineName.value) airlineName.value = rec.Name;
                }
            };
            carrier.addEventListener('input', ()=> setFromICAO(carrier.value));
            carrier.addEventListener('change', ()=> setFromICAO(carrier.value));
            // Si el usuario selecciona desde datalist
            carrier.addEventListener('blur', ()=> setFromICAO(carrier.value));
        })();

        // Autofill por Matrícula -> Equipo (Registration) y posible transportista via owner IATA
        (function wireTailAutofill(){
            const tail = document.getElementById('mf-tail');
            if (!tail || tail._wired) return; tail._wired = 1;
            const equipo = document.getElementById('mf-aircraft'); // Equipo (texto)
            const carrier = document.getElementById('mf-carrier-3l');
            const setFromTail = (val)=>{
                const reg = (val||'').toString().trim().toUpperCase();
                if (!reg) return;
                const rec = aircraftByReg.get(reg);
                if (!rec) return;
                // Equipo desde Aircraft Type -> preferir ICAO de 'aircraft type.csv', luego nombre, luego IATA type
                const t = typeByCode.get(rec.type);
                if (t){
                    const preferred = t.ICAO || t.Name || rec.type;
                    if (equipo) equipo.value = preferred;
                } else {
                    if (equipo && !equipo.value) equipo.value = rec.type; // fallback
                }
                // Si el carrier (OACI 3 letras) está vacío, podemos intentar inferir vía airlines.csv por owner IATA -> ICAO
                if (carrier && !carrier.value && rec.ownerIATA){
                    // Buscar primer airline cuyo IATA coincida para inferir su ICAO (no siempre exacto, pero ayuda)
                    const cand = airlinesCatalog.find(a => (a.IATA||'').toUpperCase() === rec.ownerIATA);
                    if (cand && cand.ICAO && /^[A-Z]{3}$/.test(cand.ICAO)) carrier.value = cand.ICAO;
                }
            };
            tail.addEventListener('input', ()=> setFromTail(tail.value));
            tail.addEventListener('change', ()=> setFromTail(tail.value));
            tail.addEventListener('blur', ()=> setFromTail(tail.value));
            // Permitir que el usuario elija manualmente el Equipo (ICAO) desde datalist sin bloquear su decisión
            if (equipo && !equipo._wired){ equipo._wired = 1; equipo.addEventListener('input', ()=> { equipo.value = (equipo.value||'').toUpperCase(); }); }
        })();

        // Auto-vincular campos de aeropuertos (código y nombre, ida y vuelta)
        (function wireAirportFields(){
            function link(nameId, codeId){
                const nameEl = document.getElementById(nameId);
                const codeEl = document.getElementById(codeId);
                if (!nameEl || !codeEl) return;
                if (!nameEl._wired){
                    nameEl._wired = 1;
                    nameEl.addEventListener('input', ()=>{
                        const s = (nameEl.value||'').trim().toLowerCase();
                        const iata = airportByName.get(s);
                        if (iata && !codeEl.value) codeEl.value = iata;
                    });
                }
                if (!codeEl._wired){
                    codeEl._wired = 1;
                    codeEl.addEventListener('input', ()=>{
                        const c = (codeEl.value||'').trim().toUpperCase();
                        codeEl.value = c.replace(/[^A-Z]/g,'').slice(0,3);
                        const name = airportByIATA.get(codeEl.value);
                        if (name && !nameEl.value) nameEl.value = name;
                    });
                }
            }
            // Salida
            link('mf-origin-name','mf-origin-code');
            link('mf-next-stop','mf-next-stop-code');
            // Destino final: vincular nombre <-> código (nuevo campo)
            link('mf-final-dest','mf-final-dest-code');
            // Llegada
            link('mf-arr-origin-name','mf-arr-origin-code');
            link('mf-arr-last-stop','mf-arr-last-stop-code');
        })();

        function readForm(){
            const g = id => document.getElementById(id)?.value || '';
            const direction = (dirArr && dirArr.checked) ? 'Llegada' : 'Salida';
            return {
                direction,
                // Encabezado extra
                title: g('mf-title'),
                docDate: g('mf-doc-date'),
                folio: g('mf-folio'),
                // Transportista / operador
                carrier3L: g('mf-carrier-3l'),
                operatorName: g('mf-operator-name'),
                airline: g('mf-airline'),
                flight: g('mf-flight'),
                tail: g('mf-tail'),
                aircraft: g('mf-aircraft'),
                originName: g('mf-origin-name'),
                originCode: g('mf-origin-code'),
                crewTotal: g('mf-crew-total'),
                baggageKg: g('mf-baggage-kg'),
                baggagePieces: g('mf-baggage-pcs'),
                cargoKg: g('mf-cargo'),
                cargoPieces: g('mf-cargo-pieces'),
                cargoVol: g('mf-cargo-volume'),
                mailKg: g('mf-mail'),
                mailPieces: g('mf-mail-pieces'),
                dangerousGoods: !!document.getElementById('mf-dangerous-goods')?.checked,
                liveAnimals: !!document.getElementById('mf-live-animals')?.checked,
                humanRemains: !!document.getElementById('mf-human-remains')?.checked,
                pilot: g('mf-pilot'),
                pilotLicense: g('mf-pilot-license'),
                agent: g('mf-agent'),
                signature: g('mf-signature'),
                notes: g('mf-notes'),
                // Movimiento (Salida)
                nextStop: g('mf-next-stop'),
                nextStopCode: g('mf-next-stop-code'),
                finalDest: g('mf-final-dest'),
                finalDestCode: g('mf-final-dest-code'),
                slotAssigned: g('mf-slot-assigned'),
                slotCoordinated: g('mf-slot-coordinated'),
                terminoPernocta: g('mf-termino-pernocta'),
                inicioEmbarque: g('mf-inicio-embarque'),
                salidaPosicion: g('mf-salida-posicion'),
                // Movimiento (Llegada)
                arrOriginName: g('mf-arr-origin-name'),
                arrOriginCode: g('mf-arr-origin-code'),
                arrSlotAssigned: g('mf-arr-slot-assigned'),
                arrSlotCoordinated: g('mf-arr-slot-coordinated'),
                arrLastStop: g('mf-arr-last-stop'),
                arrLastStopCode: g('mf-arr-last-stop-code'),
                arrArriboPosicion: g('mf-arr-arribo-posicion'),
                arrInicioDesembarque: g('mf-arr-inicio-desembarque'),
                arrInicioPernocta: g('mf-arr-inicio-pernocta'),
                // Pasajeros por categoría
                paxTUA: g('pax-tua'),
                paxDiplomaticos: g('pax-diplomaticos'),
                paxComision: g('pax-comision'),
                paxInfantes: g('pax-infantes'),
                paxTransitos: g('pax-transitos'),
                paxConexiones: g('pax-conexiones'),
                paxExentos: g('pax-exentos'),
                paxTotal: g('pax-total'),
                // Observaciones extra
                obsTransito: g('mf-obs-transito'),
                paxDNI: g('mf-pax-dni'),
                // Firmas
                signOperator: g('mf-sign-operator'),
                signCoordinator: g('mf-sign-coordinator'),
                signAdmin: g('mf-sign-admin'),
                signAdminDate: g('mf-sign-admin-date'),
                image: (function(){ try { const cv=document.getElementById('manifest-preview-canvas'); if (cv && !cv.classList.contains('d-none')) return cv.toDataURL('image/png'); const im=document.getElementById('manifest-preview'); return (im && !im.classList.contains('d-none')) ? (im.src||'') : ''; } catch(_){ return ''; } })()
            };
        }
    function loadRecords(){ try { return JSON.parse(localStorage.getItem('aifa.manifests')||'[]'); } catch(_) { return []; } }
        function saveRecords(arr){ try { localStorage.setItem('aifa.manifests', JSON.stringify(arr)); } catch(_) {} }
        function renderTable(){
            if (!tableBody) return;
            const rows = loadRecords();
            tableBody.innerHTML = rows.map(r => `
                <tr>
                    <td>${r.direction||''}</td>
                    <td>${(r.carrier3L? (r.carrier3L.toUpperCase()+ ' - ') : '') + (r.airline||r.operatorName||'')}</td>
                    <td>${r.flight||''}</td>
                    <td>${r.tail||''}</td>
                    <td></td>
                    <td></td>
                    <td>${(r.originCode||'')}/${r.finalDest||''}</td>
                    <td>${r.pax||''}</td>
                    <td>${r.cargoKg||''}/${r.mailKg||''}</td>
                    <td>${r.image?'<img src="'+r.image+'" style="height:30px">':''}</td>
                </tr>`).join('');
        }
        // Auto-cálculo de Total de pasajeros por categoría
        function recalcPaxTotal(){
            const ids = ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'];
            const sum = ids.reduce((a,id)=> a + (parseInt(document.getElementById(id)?.value||'0',10)||0), 0);
            const out = document.getElementById('pax-total');
            if (out) out.value = String(sum);
        }
        ['pax-tua','pax-diplomaticos','pax-comision','pax-infantes','pax-transitos','pax-conexiones','pax-exentos'].forEach(id=>{
            const el = document.getElementById(id);
            if (el && !el._wired){ el._wired = 1; el.addEventListener('input', recalcPaxTotal); }
        });
        recalcPaxTotal();

        if (saveBtn && !saveBtn._wired) { saveBtn._wired = 1; saveBtn.addEventListener('click', ()=>{ recalcPaxTotal(); const recs = loadRecords(); recs.unshift(readForm()); saveRecords(recs.slice(0,200)); renderTable(); }); }
        if (clearBtn && !clearBtn._wired) { clearBtn._wired = 1; clearBtn.addEventListener('click', ()=>{ document.getElementById('manifest-form')?.reset(); applyManifestDirection(); clearDynamicTables(); calculateTotals(); updateDemorasTotal(); }); }
        if (exportBtn && !exportBtn._wired) { exportBtn._wired = 1; exportBtn.addEventListener('click', ()=>{ const data = JSON.stringify(loadRecords(), null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'manifiestos.json'; a.click(); }); }
        renderTable();

        // Tabla de demoras
        const demoraTbody = document.querySelector('#tabla-demoras tbody');
        const addDemoraBtn = document.getElementById('add-demora-row');
        const clearDemorasBtn = document.getElementById('clear-demoras');
        function addDemoraRow(data={}){
            if (!demoraTbody) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form-control form-control-sm demora-codigo" value="${data.codigo||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm demora-minutos" value="${data.minutos||''}"></td>
                <td><input type="text" class="form-control form-control-sm demora-descripcion" value="${data.descripcion||''}"></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-demora-row"><i class="fas fa-times"></i></button></td>`;
            demoraTbody.appendChild(tr);
        }
        function updateDemorasTotal(){
            const total = Array.from(document.querySelectorAll('.demora-minutos')).reduce((acc, inp)=> acc + (parseFloat(inp.value)||0), 0);
            const out = document.getElementById('total-demora-minutos');
            if (out) out.value = String(total);
        }
        function clearDemoras(){ if (demoraTbody) demoraTbody.innerHTML = ''; updateDemorasTotal(); }
        if (addDemoraBtn && !addDemoraBtn._wired){ addDemoraBtn._wired = 1; addDemoraBtn.addEventListener('click', ()=> addDemoraRow()); }
        if (clearDemorasBtn && !clearDemorasBtn._wired){ clearDemorasBtn._wired = 1; clearDemorasBtn.addEventListener('click', clearDemoras); }
        // Evitar listeners globales duplicados si la UI se inicializa más de una vez
        window._manifListeners = window._manifListeners || { clicks: false, inputs: false };
        if (!window._manifListeners.clicks){
            window._manifListeners.clicks = true;
            document.addEventListener('click', (e)=>{
                const btn = e.target.closest('.remove-demora-row');
                if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); updateDemorasTotal(); }
                const btn2 = e.target.closest('.remove-embarque-row');
                if (btn2) { const tr2 = btn2.closest('tr'); if (tr2) tr2.remove(); calculateTotals(); }
            });
        }
        if (!window._manifListeners.inputs){
            window._manifListeners.inputs = true;
            document.addEventListener('input', (e)=>{
                if (e.target && e.target.classList && e.target.classList.contains('demora-minutos')) { updateDemorasTotal(); }
                if (e.target && e.target.closest && e.target.closest('#tabla-embarque')) { calculateTotals(); }
            });
        }

        function readDemorasFromTable(){
            const rows = Array.from(document.querySelectorAll('#tabla-demoras tbody tr'));
            return rows.map(tr => ({
                causa: tr.querySelector('.demora-descripcion')?.value || tr.children[2]?.textContent || '',
                demoras: parseFloat(tr.querySelector('.demora-minutos')?.value || tr.children[1]?.textContent || '0') || 0
            }));
        }

        // Tabla de embarque por estación
        const embarqueTbody = document.querySelector('#tabla-embarque tbody');
        const addEmbarqueBtn = document.getElementById('add-embarque-row');
        const clearEmbarqueBtn = document.getElementById('clear-embarque');
        function addEmbarqueRow(data={}){
            if (!embarqueTbody) return;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="form-control form-control-sm embarque-estacion" value="${data.estacion||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-nacional" value="${data.paxNacional||''}"></td>
                <td><input type="number" min="0" class="form-control form-control-sm embarque-pax-internacional" value="${data.paxInternacional||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-equipaje" value="${data.equipaje||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-carga" value="${data.carga||''}"></td>
                <td><input type="number" step="0.01" min="0" class="form-control form-control-sm embarque-correo" value="${data.correo||''}"></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger remove-embarque-row"><i class="fas fa-times"></i></button></td>`;
            embarqueTbody.appendChild(tr);
            calculateTotals();
        }
        function clearEmbarque(){ if (embarqueTbody) embarqueTbody.innerHTML = ''; calculateTotals(); }
        if (addEmbarqueBtn && !addEmbarqueBtn._wired){ addEmbarqueBtn._wired = 1; addEmbarqueBtn.addEventListener('click', ()=> addEmbarqueRow()); }
        if (clearEmbarqueBtn && !clearEmbarqueBtn._wired){ clearEmbarqueBtn._wired = 1; clearEmbarqueBtn.addEventListener('click', clearEmbarque); }
        document.addEventListener('click', (e)=>{
            const btn = e.target.closest('.remove-embarque-row');
            if (btn) { const tr = btn.closest('tr'); if (tr) tr.remove(); calculateTotals(); }
        });

        function clearDynamicTables(){
            clearDemoras();
            clearEmbarque();
        }
    } catch (e) { /* ignore */ }
}

let parteOperacionesSummaryCache = null;
let parteOperacionesSummaryCacheFetchedAt = 0;
let parteOperacionesSummarySelectedDate = null;
let parteOperacionesSummaryAvailableDates = [];
let parteOperacionesAllowedYears = new Set();
let parteOperacionesSummaryTitleDefault = null;
let parteOperacionesSummaryBaseCache = null;
let parteOperacionesCustomEntriesStore = null;
const PARTE_OPERACIONES_CUSTOM_KEY = 'parteOps.customEntries.v1';
const PARTE_OPERACIONES_EDITORS = ['isaac lópez'];
const PARTE_OPERACIONES_REMOTE_ENDPOINT = '/api/parte-operaciones/custom';
const PARTE_OPERACIONES_REMOTE_SYNC_TTL = 2 * 60 * 1000;
const PARTE_OPERACIONES_DIRTY_KEY = 'parteOps.unsyncedDates.v1';
let parteOperacionesRemoteLocalBlockLogged = false;
const parteOperacionesRemoteState = {
    enabled: true,
    healthy: false,
    lastSync: 0,
    syncPromise: null,
    lastError: null
};
let parteOperacionesDirtyDates = new Set();
let parteOperacionesDirtyLedgerLoaded = false;
const parteOperacionesEntryState = {
    initialized: false,
    panel: null,
    tableBody: null,
    dateInput: null,
    feedback: null
};
const parteOperacionesDateFormatter = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});
const parteOperacionesTitleFormatter = new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});
const parteOperacionesAnnualState = {
    chart: null,
    lastSignature: null
};
const PARTE_OPERACIONES_MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
const PARTE_OPERACIONES_MIN_DAYS_PER_MONTH = 27;

function isLikelyLocalDevelopmentHost(hostname = '', port = '') {
    const normalizedHost = (hostname || '').toString().trim().toLowerCase();
    if (!normalizedHost) return false;
    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '0.0.0.0' || normalizedHost === '::1' || normalizedHost === '[::1]') {
        return true;
    }
    if (normalizedHost.endsWith('.local')) return true;
    if (/^192\.168\./.test(normalizedHost) || /^10\./.test(normalizedHost) || /^172\.(1[6-9]|2\d|3[01])\./.test(normalizedHost)) {
        return true;
    }
    const numericPort = Number(port);
    if (Number.isFinite(numericPort) && numericPort >= 5500 && numericPort <= 5599) {
        return true;
    }
    return false;
}

function isValidParteOperacionesDate(value){
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function ensureParteOperacionesDirtyLedger(){
    if (parteOperacionesDirtyLedgerLoaded) return parteOperacionesDirtyDates;
    parteOperacionesDirtyLedgerLoaded = true;
    try {
        const raw = localStorage.getItem(PARTE_OPERACIONES_DIRTY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parteOperacionesDirtyDates = new Set(parsed.filter(isValidParteOperacionesDate));
            }
        }
    } catch (_) {}
    return parteOperacionesDirtyDates;
}

function persistParteOperacionesDirtyLedger(){
    if (!parteOperacionesDirtyLedgerLoaded) return;
    try {
        const payload = JSON.stringify(Array.from(parteOperacionesDirtyDates));
        localStorage.setItem(PARTE_OPERACIONES_DIRTY_KEY, payload);
    } catch (_) {}
}

function markParteOperacionesDateDirty(date){
    if (!isValidParteOperacionesDate(date)) return;
    ensureParteOperacionesDirtyLedger();
    parteOperacionesDirtyDates.add(date);
    persistParteOperacionesDirtyLedger();
}

function clearParteOperacionesDateDirty(date){
    if (!isValidParteOperacionesDate(date)) return;
    ensureParteOperacionesDirtyLedger();
    if (parteOperacionesDirtyDates.delete(date)) {
        persistParteOperacionesDirtyLedger();
    }
}

function sanitizeParteOperacionesItem(item){
    if (!item || typeof item !== 'object') {
        return { tipo: 'Sin clasificar', llegada: 0, salida: 0, subtotal: 0 };
    }
    const sanitized = {
        tipo: (item?.tipo ?? 'Sin clasificar').toString().trim(),
        llegada: Number(item?.llegada) || 0,
        salida: Number(item?.salida) || 0,
        subtotal: Number(item?.subtotal) || 0
    };
    if (item.__custom) sanitized.__custom = true;
    return sanitized;
}

function normalizeParteOperacionesType(value){
    return (value || '')
        .toString()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function shouldUseParteOperacionesRemoteBackend(){
    if (typeof window === 'undefined') return false;
    if (window.location && window.location.protocol === 'file:') return false;
    if (window.location) {
        const { hostname, port } = window.location;
        if (isLikelyLocalDevelopmentHost(hostname, port)) {
            if (!parteOperacionesRemoteLocalBlockLogged) {
                parteOperacionesRemoteLocalBlockLogged = true;
                console.info('Sincronización remota de parte de operaciones desactivada en este entorno local (sin API disponible).');
            }
            return false;
        }
    }
    if (typeof fetch !== 'function') return false;
    return parteOperacionesRemoteState.enabled;
}

async function upsertParteOperacionesRemoteEntries(date, rows, options = {}){
    if (!isValidParteOperacionesDate(date)) return false;
    if (!shouldUseParteOperacionesRemoteBackend()) return false;
    try {
        const res = await fetch(PARTE_OPERACIONES_REMOTE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, entries: rows })
        });
        if (res.status === 404) {
            parteOperacionesRemoteState.enabled = false;
            throw new Error('Endpoint no disponible (404)');
        }
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        parteOperacionesRemoteState.healthy = true;
        parteOperacionesRemoteState.lastError = null;
        parteOperacionesRemoteState.lastSync = 0;
        return true;
    } catch (err) {
        parteOperacionesRemoteState.lastError = err;
        parteOperacionesRemoteState.healthy = false;
        if (!options.silent) {
            console.warn('upsertParteOperacionesRemoteEntries failed:', err);
        }
        return false;
    }
}

async function deleteParteOperacionesRemoteEntries(date, options = {}){
    if (!isValidParteOperacionesDate(date)) return false;
    if (!shouldUseParteOperacionesRemoteBackend()) return false;
    try {
        const endpoint = `${PARTE_OPERACIONES_REMOTE_ENDPOINT}/${encodeURIComponent(date)}`;
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (res.status === 404) {
            parteOperacionesRemoteState.enabled = false;
            throw new Error('Endpoint no disponible (404)');
        }
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        parteOperacionesRemoteState.healthy = true;
        parteOperacionesRemoteState.lastError = null;
        parteOperacionesRemoteState.lastSync = 0;
        return true;
    } catch (err) {
        parteOperacionesRemoteState.lastError = err;
        parteOperacionesRemoteState.healthy = false;
        if (!options.silent) {
            console.warn('deleteParteOperacionesRemoteEntries failed:', err);
        }
        return false;
    }
}

async function flushParteOperacionesDirtyDates(options = {}){
    if (!shouldUseParteOperacionesRemoteBackend()) return false;
    const ledger = ensureParteOperacionesDirtyLedger();
    if (!ledger.size) return false;
    let flushed = false;
    for (const date of Array.from(ledger)) {
        const store = ensureParteOperacionesCustomStore();
        const entries = Array.isArray(store?.dates?.[date]) ? store.dates[date] : [];
        let success = false;
        if (entries.length) {
            success = await upsertParteOperacionesRemoteEntries(date, entries, { silent: true });
        } else {
            success = await deleteParteOperacionesRemoteEntries(date, { silent: true });
        }
        if (success) {
            clearParteOperacionesDateDirty(date);
            flushed = true;
        } else {
            break;
        }
    }
    if (flushed && !options.skipResync) {
        await syncParteOperacionesRemoteStore({ force: true, silent: true, skipFlush: true });
    }
    return flushed;
}

async function syncParteOperacionesRemoteStore(options = {}){
    if (!shouldUseParteOperacionesRemoteBackend()) return false;
    const now = Date.now();
    if (!options.force && parteOperacionesRemoteState.lastSync && (now - parteOperacionesRemoteState.lastSync) < PARTE_OPERACIONES_REMOTE_SYNC_TTL) {
        return parteOperacionesRemoteState.healthy;
    }
    if (parteOperacionesRemoteState.syncPromise) {
        return parteOperacionesRemoteState.syncPromise;
    }
    const runner = (async () => {
        if (!options.skipFlush) {
            try {
                await flushParteOperacionesDirtyDates({ skipResync: true });
            } catch (err) {
                console.warn('flushParteOperacionesDirtyDates failed:', err);
            }
        }
        try {
            const res = await fetch(PARTE_OPERACIONES_REMOTE_ENDPOINT, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });
            if (res.status === 404) {
                parteOperacionesRemoteState.enabled = false;
                throw new Error('Endpoint no disponible (404)');
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const payload = await res.json();
            const remoteDates = payload?.dates && typeof payload.dates === 'object' ? payload.dates : {};
            const dirtyLedger = ensureParteOperacionesDirtyLedger();
            const currentStore = ensureParteOperacionesCustomStore();
            const safeDates = {};
            Object.entries(remoteDates).forEach(([dateKey, entries]) => {
                if (!isValidParteOperacionesDate(dateKey)) return;
                if (dirtyLedger.has(dateKey)) {
                    if (Array.isArray(currentStore?.dates?.[dateKey])) {
                        safeDates[dateKey] = currentStore.dates[dateKey].map(sanitizeParteOperacionesItem);
                    }
                    return;
                }
                if (Array.isArray(entries) && entries.length) {
                    safeDates[dateKey] = entries.map(sanitizeParteOperacionesItem);
                }
            });
            if (currentStore?.dates) {
                Object.entries(currentStore.dates).forEach(([dateKey, entries]) => {
                    if (!safeDates[dateKey] && dirtyLedger.has(dateKey)) {
                        safeDates[dateKey] = entries.map(sanitizeParteOperacionesItem);
                    }
                });
            }
            parteOperacionesCustomEntriesStore = { dates: safeDates };
            saveParteOperacionesCustomStore();
            parteOperacionesRemoteState.healthy = true;
            parteOperacionesRemoteState.lastSync = Date.now();
            parteOperacionesRemoteState.lastError = null;
            rebuildParteOperacionesCacheFromLocal();
            return true;
        } catch (err) {
            parteOperacionesRemoteState.lastError = err;
            parteOperacionesRemoteState.healthy = false;
            if (!options.silent) {
                console.warn('syncParteOperacionesRemoteStore failed:', err);
            }
            return false;
        } finally {
            parteOperacionesRemoteState.syncPromise = null;
        }
    })();
    parteOperacionesRemoteState.syncPromise = runner;
    return runner;
}

function normalizeParteOperacionesSummary(raw){
    const empty = { dates: [], byDate: {}, isLegacy: false, availableRange: null };
    if (!raw) return empty;

    if (raw?.dias && typeof raw.dias === 'object'){
        const entries = Object.entries(raw.dias)
            .filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
            .sort((a, b) => a[0].localeCompare(b[0]));
        const byDate = {};
        for (const [dateKey, value] of entries){
            const operaciones = Array.isArray(value?.operaciones) ? value.operaciones.map(sanitizeParteOperacionesItem) : [];
            const totalGeneral = Number(value?.total_general) || 0;
            byDate[dateKey] = { operaciones, total_general: totalGeneral };
        }
        const dates = entries.map(([date]) => date);
        const availableRange = dates.length ? { inicio: dates[0], fin: dates[dates.length - 1] } : null;
        return { dates, byDate, isLegacy: false, availableRange };
    }

    if (Array.isArray(raw?.operaciones)){
        const operaciones = raw.operaciones.map(sanitizeParteOperacionesItem);
        const totalGeneral = Number(raw?.total_general) || 0;
        return { dates: ['legacy'], byDate: { legacy: { operaciones, total_general: totalGeneral } }, isLegacy: true, availableRange: null };
    }

    return empty;
}

function ensureParteOperacionesCustomStore(){
    if (parteOperacionesCustomEntriesStore) return parteOperacionesCustomEntriesStore;
    parteOperacionesCustomEntriesStore = { dates: {} };
    try {
        const raw = localStorage.getItem(PARTE_OPERACIONES_CUSTOM_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.dates) {
                parteOperacionesCustomEntriesStore = parsed;
            }
        }
    } catch (_) {}
    return parteOperacionesCustomEntriesStore;
}

function saveParteOperacionesCustomStore(){
    if (!parteOperacionesCustomEntriesStore) return;
    try {
        localStorage.setItem(PARTE_OPERACIONES_CUSTOM_KEY, JSON.stringify(parteOperacionesCustomEntriesStore));
    } catch (_) {}
}

function mergeParteOperacionesCustomEntries(summary){
    if (!summary || !summary.byDate) return summary;
    const store = ensureParteOperacionesCustomStore();
    const combined = JSON.parse(JSON.stringify(summary));
    combined.byDate = combined.byDate || {};
    combined.dates = Array.isArray(combined.dates) ? combined.dates.slice() : [];
    Object.entries(store?.dates || {}).forEach(([dateKey, entries]) => {
        if (!Array.isArray(entries) || !entries.length) return;
        if (!combined.byDate[dateKey]) {
            combined.byDate[dateKey] = { operaciones: [], total_general: 0 };
            if (!combined.dates.includes(dateKey)) combined.dates.push(dateKey);
        }
        const target = combined.byDate[dateKey];
        const baseOps = Array.isArray(target.operaciones) ? target.operaciones : [];
        const normalizedBase = baseOps.map(sanitizeParteOperacionesItem);
        const normalizedCustom = entries.map(entry => Object.assign({}, sanitizeParteOperacionesItem(entry), { __custom: true }));
        const merged = [...normalizedBase];
        normalizedCustom.forEach(customItem => {
            const baseKey = normalizeParteOperacionesType(customItem.tipo);
            const existingIdx = merged.findIndex(it => normalizeParteOperacionesType(it.tipo) === baseKey);
            if (existingIdx === -1) {
                merged.push(customItem);
                return;
            }
            const existing = merged[existingIdx];
            merged[existingIdx] = {
                tipo: existing.tipo,
                llegada: existing.llegada + customItem.llegada,
                salida: existing.salida + customItem.salida,
                subtotal: existing.subtotal + customItem.subtotal,
                __custom: existing.__custom || customItem.__custom
            };
        });
        target.operaciones = merged;
        if (typeof target.total_general !== 'number' || Number.isNaN(target.total_general)) {
            target.total_general = 0;
        }
        const customTotals = normalizedCustom.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
        target.total_general = Math.max(target.total_general, merged.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0));
        if (customTotals > 0 && target.total_general < customTotals) {
            target.total_general = customTotals;
        }
    });
    combined.dates.sort();
    return combined;
}

function rebuildParteOperacionesCacheFromLocal(){
    if (!parteOperacionesSummaryBaseCache && !parteOperacionesSummaryCache) return;
    const source = parteOperacionesSummaryBaseCache || parteOperacionesSummaryCache;
    parteOperacionesSummaryCache = mergeParteOperacionesCustomEntries(source);
    syncParteOperacionesCalendarControls(parteOperacionesSummaryCache);
    renderParteOperacionesSummaryForCurrentSelection();
}

function formatParteOperacionesDate(dateStr){
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    const jsDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(jsDate.getTime())) return dateStr;
    let formatted = parteOperacionesDateFormatter.format(jsDate);
    if (formatted) {
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return formatted;
}

function formatParteOperacionesDateForTitle(dateStr){
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    const jsDate = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(jsDate.getTime())) return '';
    let formatted = parteOperacionesTitleFormatter.format(jsDate);
    if (formatted) {
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return formatted;
}

function getDefaultParteOperacionesDate(summary){
    if (!summary || !Array.isArray(summary.dates) || !summary.dates.length) return null;
    const { dates, byDate } = summary;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterdayTime = today.getTime() - 24 * 60 * 60 * 1000;

    for (let i = dates.length - 1; i >= 0; i -= 1){
        const iso = dates[i];
        if (!byDate?.[iso]) continue;
        const parsed = new Date(`${iso}T00:00:00`);
        if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= yesterdayTime){
            return iso;
        }
    }

    for (let i = dates.length - 1; i >= 0; i -= 1){
        const iso = dates[i];
        if (byDate?.[iso]) return iso;
    }

    return dates[dates.length - 1];
}

function canCurrentUserEditParteOperaciones(){
    const name = (sessionStorage.getItem(SESSION_USER) || '').toLowerCase();
    if (!name) return false;
    return PARTE_OPERACIONES_EDITORS.includes(name);
}

function getCurrentParteOperacionesEditor(){
    return sessionStorage.getItem(SESSION_USER) || '';
}

function ensureOpsEntryPanel(){
    if (parteOperacionesEntryState.initialized) return parteOperacionesEntryState;
    parteOperacionesEntryState.initialized = true;
    parteOperacionesEntryState.panel = document.getElementById('ops-entry-panel');
    parteOperacionesEntryState.tableBody = document.querySelector('#ops-entry-table tbody');
    parteOperacionesEntryState.dateInput = document.getElementById('ops-entry-date');
    parteOperacionesEntryState.feedback = document.getElementById('ops-entry-feedback');
    parteOperacionesEntryState.addBtn = document.getElementById('ops-entry-add-row');
    parteOperacionesEntryState.resetBtn = document.getElementById('ops-entry-reset-table');
    parteOperacionesEntryState.saveBtn = document.getElementById('ops-entry-save');
    parteOperacionesEntryState.clearDayBtn = document.getElementById('ops-entry-clear-day');
    parteOperacionesEntryState.todayBtn = document.getElementById('ops-entry-today');
    parteOperacionesEntryState.syncBtn = document.getElementById('ops-entry-sync-summary');
    if (parteOperacionesEntryState.addBtn && !parteOperacionesEntryState.addBtn._wired) {
        parteOperacionesEntryState.addBtn._wired = 1;
        parteOperacionesEntryState.addBtn.addEventListener('click', () => addParteOperacionesEntryRow());
    }
    if (parteOperacionesEntryState.resetBtn && !parteOperacionesEntryState.resetBtn._wired) {
        parteOperacionesEntryState.resetBtn._wired = 1;
        parteOperacionesEntryState.resetBtn.addEventListener('click', () => resetParteOperacionesEntryTable());
    }
    if (parteOperacionesEntryState.saveBtn && !parteOperacionesEntryState.saveBtn._wired) {
        parteOperacionesEntryState.saveBtn._wired = 1;
        parteOperacionesEntryState.saveBtn.addEventListener('click', () => {
            saveParteOperacionesEntriesForCurrentDate().catch((err) => {
                console.warn('saveParteOperacionesEntriesForCurrentDate failed:', err);
            });
        });
    }
    if (parteOperacionesEntryState.clearDayBtn && !parteOperacionesEntryState.clearDayBtn._wired) {
        parteOperacionesEntryState.clearDayBtn._wired = 1;
        parteOperacionesEntryState.clearDayBtn.addEventListener('click', () => {
            clearParteOperacionesEntriesForCurrentDate().catch((err) => {
                console.warn('clearParteOperacionesEntriesForCurrentDate failed:', err);
            });
        });
    }
    if (parteOperacionesEntryState.todayBtn) parteOperacionesEntryState.todayBtn.addEventListener('click', () => setParteOperacionesEntryDate(new Date()));
    if (parteOperacionesEntryState.syncBtn) parteOperacionesEntryState.syncBtn.addEventListener('click', () => {
        if (parteOperacionesSummarySelectedDate) {
            setParteOperacionesEntryDate(parteOperacionesSummarySelectedDate);
        } else {
            setParteOperacionesEntryDate(new Date());
        }
    });
    document.addEventListener('click', (event) => {
        if (event.target.closest('.ops-entry-remove-row')) {
            const tr = event.target.closest('tr');
            if (tr && parteOperacionesEntryState.tableBody) {
                tr.remove();
                updateParteOperacionesEntryTotals(tr.closest('table'));
            }
        }
    });
    document.addEventListener('input', (event) => {
        const table = event.target.closest('#ops-entry-table');
        if (table) {
            if (event.target.matches('#ops-entry-table tbody tr td:nth-child(4) input')) {
                event.target.dataset.manual = event.target.value ? '1' : '';
            }
            updateParteOperacionesEntryTotals(table);
        }
    });
    if (parteOperacionesEntryState.dateInput && !parteOperacionesEntryState.dateInput.value) {
        setParteOperacionesEntryDate(new Date());
    }
    return parteOperacionesEntryState;
}

function setParteOperacionesEntryDate(value){
    const st = ensureOpsEntryPanel();
    if (!st.dateInput) return;
    if (value instanceof Date) {
        const copy = new Date(value.getTime());
        copy.setHours(0,0,0,0);
        st.dateInput.value = copy.toISOString().slice(0,10);
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        st.dateInput.value = value;
    }
    loadParteOperacionesEntriesForDate(st.dateInput.value);
}

function addParteOperacionesEntryRow(data = {}){
    const st = ensureOpsEntryPanel();
    if (!st.tableBody) return;
    const tr = document.createElement('tr');
    const llegada = Number(data.llegada);
    const salida = Number(data.salida);
    const subtotalValue = Number.isFinite(Number(data.subtotal)) ? Number(data.subtotal) : '';
    const autoSubtotal = (Number.isFinite(llegada) ? llegada : 0) + (Number.isFinite(salida) ? salida : 0);
    const manualAttr = subtotalValue !== '' && subtotalValue !== autoSubtotal ? 'data-manual="1"' : '';
    tr.innerHTML = `
        <td>
            <input type="text" class="form-control form-control-sm" list="ops-entry-type-suggestions" value="${data.tipo || ''}" placeholder="Ej. Aviación de pasajeros" required>
        </td>
        <td><input type="number" min="0" class="form-control form-control-sm" value="${data.llegada ?? ''}" aria-label="Llegadas"></td>
        <td><input type="number" min="0" class="form-control form-control-sm" value="${data.salida ?? ''}" aria-label="Salidas"></td>
        <td><input type="number" min="0" class="form-control form-control-sm" value="${subtotalValue === '' ? '' : subtotalValue}" aria-label="Subtotal" ${manualAttr}></td>
        <td class="text-center"><button type="button" class="btn btn-outline-danger btn-sm ops-entry-remove-row" title="Eliminar fila"><i class="fas fa-times"></i></button></td>`;
    st.tableBody.appendChild(tr);
    updateParteOperacionesEntryTotals(st.tableBody.closest('table'));
}

function resetParteOperacionesEntryTable(){
    const st = ensureOpsEntryPanel();
    if (!st.tableBody) return;
    st.tableBody.innerHTML = '';
    addParteOperacionesEntryRow();
}

function readParteOperacionesEntryTable(){
    const st = ensureOpsEntryPanel();
    if (!st.tableBody) return [];
    const rows = Array.from(st.tableBody.querySelectorAll('tr'));
    return rows.map(row => {
        const inputs = row.querySelectorAll('input');
        const tipo = inputs[0]?.value || '';
        const llegada = Number(inputs[1]?.value) || 0;
        const salida = Number(inputs[2]?.value) || 0;
        let subtotal = Number(inputs[3]?.value);
        if (!Number.isFinite(subtotal) || subtotal <= 0) {
            subtotal = llegada + salida;
        }
        return sanitizeParteOperacionesItem({ tipo, llegada, salida, subtotal, __custom: true });
    }).filter(item => item.tipo);
}

function updateParteOperacionesEntryTotals(table){
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length < 4) return;
        const llegada = Number(inputs[1].value) || 0;
        const salida = Number(inputs[2].value) || 0;
        const subtotalInput = inputs[3];
        if (!subtotalInput.dataset.manual) {
            subtotalInput.value = llegada + salida;
        }
    });
}

function loadParteOperacionesEntriesForDate(date){
    const st = ensureOpsEntryPanel();
    if (!st.tableBody) return;
    const store = ensureParteOperacionesCustomStore();
    const entries = Array.isArray(store?.dates?.[date]) ? store.dates[date] : [];
    st.tableBody.innerHTML = '';
    if (!entries.length) {
        addParteOperacionesEntryRow();
        return;
    }
    entries.forEach(entry => addParteOperacionesEntryRow(entry));
    if (st.feedback) st.feedback.textContent = entries.length ? `Se cargaron ${entries.length} filas guardadas para ${date}` : '';
}

async function clearParteOperacionesEntriesForCurrentDate(){
    const st = ensureOpsEntryPanel();
    if (!st.dateInput) return;
    const date = (st.dateInput.value || '').trim();
    if (!isValidParteOperacionesDate(date)) {
        setParteOperacionesFeedback('Selecciona una fecha válida para eliminar.', 'danger');
        return;
    }
    const store = ensureParteOperacionesCustomStore();
    if (store.dates[date]) {
        delete store.dates[date];
        saveParteOperacionesCustomStore();
    }
    const useRemote = shouldUseParteOperacionesRemoteBackend();
    if (useRemote) {
        markParteOperacionesDateDirty(date);
    }
    loadParteOperacionesEntriesForDate(date);
    setParteOperacionesFeedback('Eliminando captura...', 'muted');
    let remoteSynced = false;
    if (useRemote) {
        remoteSynced = await deleteParteOperacionesRemoteEntries(date);
        if (remoteSynced) {
            clearParteOperacionesDateDirty(date);
            await syncParteOperacionesRemoteStore({ force: true, silent: true, skipFlush: true }).catch(() => {});
        }
    }
    setParteOperacionesFeedback(
        remoteSynced ? 'Se eliminaron las capturas y se sincronizaron con el servidor.'
            : (useRemote ? 'Captura eliminada localmente. Pendiente de sincronizar con el servidor.' : 'Captura eliminada.'),
        remoteSynced ? 'success' : (useRemote ? 'warning' : 'success')
    );
    rebuildParteOperacionesCacheFromLocal();
    loadParteOperacionesSummary({ force: true, silent: true, skipRemoteSync: remoteSynced }).catch(() => {});
}

async function saveParteOperacionesEntriesForCurrentDate(){
    const st = ensureOpsEntryPanel();
    if (!st.dateInput) return;
    const date = (st.dateInput.value || '').trim();
    if (!isValidParteOperacionesDate(date)) {
        setParteOperacionesFeedback('Selecciona una fecha válida para guardar.', 'danger');
        return;
    }
    const rows = readParteOperacionesEntryTable();
    if (!rows.length) {
        setParteOperacionesFeedback('Agrega al menos una fila para guardar.', 'danger');
        return;
    }
    const store = ensureParteOperacionesCustomStore();
    store.dates[date] = rows;
    saveParteOperacionesCustomStore();
    const useRemote = shouldUseParteOperacionesRemoteBackend();
    if (useRemote) {
        markParteOperacionesDateDirty(date);
    }
    setParteOperacionesFeedback('Guardando captura...', 'muted');
    let remoteSynced = false;
    if (useRemote) {
        remoteSynced = await upsertParteOperacionesRemoteEntries(date, rows);
        if (remoteSynced) {
            clearParteOperacionesDateDirty(date);
            await syncParteOperacionesRemoteStore({ force: true, silent: true, skipFlush: true }).catch(() => {});
        }
    }
    setParteOperacionesFeedback(
        remoteSynced ? `Captura guardada y sincronizada (${rows.length} filas).`
            : (useRemote ? `Captura guardada localmente (${rows.length} filas). Se sincronizará cuando haya conexión.`
                : `Captura guardada (${rows.length} filas).`),
        remoteSynced ? 'success' : (useRemote ? 'warning' : 'success')
    );
    rebuildParteOperacionesCacheFromLocal();
    loadParteOperacionesSummary({ force: true, silent: true, skipRemoteSync: remoteSynced }).catch(() => {});
}

function setParteOperacionesFeedback(message, tone = 'muted'){
    const st = ensureOpsEntryPanel();
    if (!st.feedback) return;
    st.feedback.textContent = message || '';
    st.feedback.className = `small text-${tone} mt-2 mb-0`;
}

const PARTE_OPERACIONES_LOADER_DELAY = 2600;
const PARTE_OPERACIONES_LOADER_DEFAULT_MESSAGE = 'Preparando el total de vuelos del día...';
let parteOperacionesLoaderTimer = null;
let parteOperacionesLoaderPendingCallback = null;

function setParteOperacionesLoaderMessage(message){
    const textEl = document.getElementById('operations-summary-loader-text');
    if (textEl) {
        textEl.textContent = message || PARTE_OPERACIONES_LOADER_DEFAULT_MESSAGE;
    }
}

function showParteOperacionesLoader(message){
    const loader = document.getElementById('operations-summary-loader');
    const container = document.getElementById('operations-summary-table');
    setParteOperacionesLoaderMessage(message);
    if (container) {
        container.classList.add('is-loading');
        container.setAttribute('aria-busy', 'true');
    }
    if (loader) {
        loader.classList.remove('d-none');
        loader.classList.remove('hidden');
        loader.setAttribute('aria-hidden', 'false');
        loader.setAttribute('aria-busy', 'true');
    }
}

function hideParteOperacionesLoader(){
    const loader = document.getElementById('operations-summary-loader');
    const container = document.getElementById('operations-summary-table');
    if (container) {
        container.classList.remove('is-loading');
        container.removeAttribute('aria-busy');
    }
    if (loader) {
        loader.classList.add('hidden');
        loader.classList.remove('d-none');
        loader.setAttribute('aria-hidden', 'true');
        loader.setAttribute('aria-busy', 'false');
    }
    setParteOperacionesLoaderMessage(PARTE_OPERACIONES_LOADER_DEFAULT_MESSAGE);
}

function scheduleParteOperacionesRender(callback, loaderMessage){
    if (parteOperacionesLoaderTimer) {
        clearTimeout(parteOperacionesLoaderTimer);
        parteOperacionesLoaderTimer = null;
    }
    parteOperacionesLoaderPendingCallback = typeof callback === 'function' ? callback : null;
    const loader = document.getElementById('operations-summary-loader');
    const container = document.getElementById('operations-summary-table');
    if (!loader && !container) {
        if (parteOperacionesLoaderPendingCallback) {
            parteOperacionesLoaderPendingCallback();
        }
        parteOperacionesLoaderPendingCallback = null;
        return;
    }
    showParteOperacionesLoader(loaderMessage);
    const delay = Number.isFinite(PARTE_OPERACIONES_LOADER_DELAY) ? Math.max(0, PARTE_OPERACIONES_LOADER_DELAY) : 0;
    if (delay === 0) {
        const cbImmediate = parteOperacionesLoaderPendingCallback;
        parteOperacionesLoaderPendingCallback = null;
        if (typeof cbImmediate === 'function') {
            cbImmediate();
        }
        hideParteOperacionesLoader();
        return;
    }
    parteOperacionesLoaderTimer = setTimeout(() => {
        parteOperacionesLoaderTimer = null;
        const cb = parteOperacionesLoaderPendingCallback;
        parteOperacionesLoaderPendingCallback = null;
        if (typeof cb === 'function') {
            cb();
        }
        hideParteOperacionesLoader();
    }, delay);
}

function updateParteOperacionesAvailabilityBanner(summary, options = {}){
    const bannerWrapper = document.querySelector('.ops-worknote');
    const panelState = ensureOpsEntryPanel();
    const canEdit = canCurrentUserEditParteOperaciones();
    const activeUserLabel = document.getElementById('ops-entry-active-user');
    if (activeUserLabel) activeUserLabel.textContent = getCurrentParteOperacionesEditor() || 'Sin sesión';
    if (panelState.panel) {
        panelState.panel.classList.toggle('d-none', !canEdit);
    }
    if (canEdit && panelState.tableBody && !panelState.tableBody.children.length) {
        addParteOperacionesEntryRow();
    }
    const skipBanner = !!options.skipBanner;
    if (!bannerWrapper || skipBanner) return;
    const hasData = Array.isArray(summary?.dates) && summary.dates.length > 0;
    if (!hasData) {
        bannerWrapper.classList.add('d-none');
        return;
    }
    bannerWrapper.classList.remove('d-none');
}

function updateParteOperacionesTitle(isoDate){
    const titleEl = document.getElementById('operations-summary-title');
    if (!titleEl) return;
    if (parteOperacionesSummaryTitleDefault === null) {
        parteOperacionesSummaryTitleDefault = titleEl.dataset?.defaultTitle?.trim()
            || titleEl.textContent?.trim()
            || 'Resumen de operaciones';
        titleEl.dataset.defaultTitle = parteOperacionesSummaryTitleDefault;
    }
    if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        const formatted = formatParteOperacionesDateForTitle(isoDate);
        if (formatted) {
            titleEl.textContent = `${parteOperacionesSummaryTitleDefault} del ${formatted}`;
            return;
        }
    }
    titleEl.textContent = parteOperacionesSummaryTitleDefault;
}

function attachParteOperacionesCalendarListeners(){
    const dateInput = document.getElementById('operations-summary-date');
    if (dateInput && !dateInput._wired){
        dateInput._wired = true;
        dateInput.addEventListener('change', (event)=>{
            handleParteOperacionesDateChange(event.target.value, { source: 'input' });
        });
    }
    const prevBtn = document.getElementById('operations-summary-prev');
    if (prevBtn && !prevBtn._wired){
        prevBtn._wired = true;
        prevBtn.addEventListener('click', ()=>{
            if (!parteOperacionesSummaryCache || parteOperacionesSummaryCache.isLegacy) return;
            const idx = parteOperacionesSummaryAvailableDates.indexOf(parteOperacionesSummarySelectedDate);
            if (idx > 0) {
                handleParteOperacionesDateChange(parteOperacionesSummaryAvailableDates[idx - 1], { source: 'nav' });
            }
        });
    }
    const nextBtn = document.getElementById('operations-summary-next');
    if (nextBtn && !nextBtn._wired){
        nextBtn._wired = true;
        nextBtn.addEventListener('click', ()=>{
            if (!parteOperacionesSummaryCache || parteOperacionesSummaryCache.isLegacy) return;
            const idx = parteOperacionesSummaryAvailableDates.indexOf(parteOperacionesSummarySelectedDate);
            if (idx >= 0 && idx < parteOperacionesSummaryAvailableDates.length - 1) {
                handleParteOperacionesDateChange(parteOperacionesSummaryAvailableDates[idx + 1], { source: 'nav' });
            }
        });
    }
    const todayBtn = document.getElementById('operations-summary-today');
    if (todayBtn && !todayBtn._wired){
        todayBtn._wired = true;
        todayBtn.addEventListener('click', ()=>{
            if (!parteOperacionesSummaryCache || parteOperacionesSummaryCache.isLegacy) return;
            if (parteOperacionesSummaryAvailableDates.length) {
                const latest = parteOperacionesSummaryAvailableDates[parteOperacionesSummaryAvailableDates.length - 1];
                handleParteOperacionesDateChange(latest, { source: 'today' });
            }
        });
    }
}

function getParteOperacionesAvailableYears(summary){
    if (!summary || !Array.isArray(summary.dates)) return [];
    const years = summary.dates
        .map((date) => {
            if (typeof date !== 'string') return null;
            const match = /^\s*(\d{4})/.exec(date);
            return match ? match[1] : null;
        })
        .filter(Boolean);
    return Array.from(new Set(years));
}

function resolveParteOperacionesCalendarRange(summary){
    const years = getParteOperacionesAvailableYears(summary);
    if (!years.length) return null;
    const sortedYears = [...years].sort();
    const firstYear = sortedYears[0];
    const lastYear = sortedYears[sortedYears.length - 1];
    const buildBounds = (year) => ({
        min: `${year}-01-01`,
        max: `${year}-12-31`
    });
    return firstYear === lastYear
        ? buildBounds(firstYear)
        : { min: `${firstYear}-01-01`, max: `${lastYear}-12-31` };
}

function syncParteOperacionesCalendarControls(summary){
    attachParteOperacionesCalendarListeners();
    const controlsWrapper = document.querySelector('[data-ops-calendar-controls]');
    const hasCalendar = summary && !summary.isLegacy && Array.isArray(summary.dates) && summary.dates.length > 0;
    if (controlsWrapper) {
        controlsWrapper.classList.toggle('d-none', !hasCalendar);
    }
    updateParteOperacionesAvailabilityBanner(summary);
    parteOperacionesSummaryAvailableDates = Array.isArray(summary?.dates) ? summary.dates.slice() : [];
    parteOperacionesAllowedYears = hasCalendar
        ? new Set(getParteOperacionesAvailableYears(summary))
        : new Set();
    const dateInput = document.getElementById('operations-summary-date');
    if (dateInput) {
        if (hasCalendar) {
            const calendarRange = resolveParteOperacionesCalendarRange(summary);
            if (calendarRange) {
                dateInput.min = calendarRange.min;
                dateInput.max = calendarRange.max;
            } else {
                dateInput.min = summary.dates[0];
                dateInput.max = summary.dates[summary.dates.length - 1];
            }
            dateInput.disabled = false;
        } else {
            dateInput.value = '';
            dateInput.min = '';
            dateInput.max = '';
            dateInput.disabled = true;
        }
    }
    refreshParteOperacionesNavState();
    if (!hasCalendar) {
        const label = document.getElementById('operations-summary-date-human');
        if (label) {
            label.textContent = summary?.isLegacy ? 'Último registro disponible' : 'Sin registros disponibles';
        }
    }
}

function refreshParteOperacionesNavState(){
    const prevBtn = document.getElementById('operations-summary-prev');
    const nextBtn = document.getElementById('operations-summary-next');
    if (!prevBtn && !nextBtn) return;
    if (!parteOperacionesSummaryAvailableDates.length || (parteOperacionesSummaryCache && parteOperacionesSummaryCache.isLegacy)){
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }
    const idx = parteOperacionesSummaryAvailableDates.indexOf(parteOperacionesSummarySelectedDate);
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx === -1 || idx >= parteOperacionesSummaryAvailableDates.length - 1;
}

function renderParteOperacionesSummaryForCurrentSelection(){
    renderParteOperacionesAnnualAnalysis(parteOperacionesSummaryCache);
    if (!parteOperacionesSummaryCache) {
        renderParteOperacionesSummary(null, {});
        return;
    }
    const { dates, byDate, isLegacy } = parteOperacionesSummaryCache;
    if (!Array.isArray(dates) || !dates.length) {
        const label = document.getElementById('operations-summary-date-human');
        if (label) label.textContent = 'Sin registros disponibles';
        renderParteOperacionesSummary(null, {});
        refreshParteOperacionesNavState();
        return;
    }
    let target = parteOperacionesSummarySelectedDate;
    if (!target || !byDate[target]) {
        target = getDefaultParteOperacionesDate(parteOperacionesSummaryCache) || dates[dates.length - 1];
    }
    parteOperacionesSummarySelectedDate = target;
    if (isLegacy) {
        const label = document.getElementById('operations-summary-date-human');
        if (label) label.textContent = 'Último registro disponible';
        renderParteOperacionesSummary(byDate[target], { friendlyDate: null, isoDate: null, isLegacy: true });
        refreshParteOperacionesNavState();
        return;
    }
    const dateInput = document.getElementById('operations-summary-date');
    if (dateInput && dateInput.value !== target) {
        dateInput.value = target;
    }
    const friendly = formatParteOperacionesDate(target) || 'Sin información disponible';
    const label = document.getElementById('operations-summary-date-human');
    if (label) label.textContent = friendly;
    renderParteOperacionesSummary(byDate[target], { friendlyDate: friendly, isoDate: target });
    refreshParteOperacionesNavState();
}

function handleParteOperacionesDateChange(dateStr, options = {}){
    if (!parteOperacionesSummaryCache || parteOperacionesSummaryCache.isLegacy) return;
    if (!Array.isArray(parteOperacionesSummaryAvailableDates) || !parteOperacionesSummaryAvailableDates.length) return;
    let target = (dateStr || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || !parteOperacionesSummaryCache.byDate[target]) {
        const fallback = getDefaultParteOperacionesDate(parteOperacionesSummaryCache);
        if (parteOperacionesSummaryCache.byDate[fallback]) {
            target = fallback;
        } else {
            const firstValid = parteOperacionesSummaryAvailableDates.find(d => parteOperacionesSummaryCache.byDate[d]);
            if (firstValid) target = firstValid;
        }
    }
    if (!parteOperacionesSummaryCache.byDate[target]) return;
    parteOperacionesSummarySelectedDate = target;
    const dateInput = document.getElementById('operations-summary-date');
    if (dateInput && !options.skipInputUpdate && dateInput.value !== target) {
        dateInput.value = target;
    }
    const friendly = formatParteOperacionesDate(target) || 'Sin información disponible';
    const label = document.getElementById('operations-summary-date-human');
    if (label) label.textContent = friendly;
    const summaryForDate = parteOperacionesSummaryCache.byDate[target];
    const loaderMessage = friendly ? `Preparando el total de vuelos del día: ${friendly}` : PARTE_OPERACIONES_LOADER_DEFAULT_MESSAGE;
    scheduleParteOperacionesRender(() => {
        renderParteOperacionesSummary(summaryForDate, { friendlyDate: friendly, isoDate: target });
    }, loaderMessage);
    refreshParteOperacionesNavState();
}

async function loadParteOperacionesSummary(options = {}){
    const { force = false, silent = false, skipRemoteSync = false } = options;
    const container = document.getElementById('operations-summary-table');
    if (!container) return;
    if (!skipRemoteSync) {
        try {
            await syncParteOperacionesRemoteStore({ silent: true });
        } catch (err) {
            console.warn('syncParteOperacionesRemoteStore before load failed:', err);
        }
    }
    if (!force && parteOperacionesSummaryCache){
        const isStale = parteOperacionesSummaryCacheFetchedAt && (Date.now() - parteOperacionesSummaryCacheFetchedAt > OPERATIONAL_REFRESH_INTERVAL);
        if (!isStale) {
            syncParteOperacionesCalendarControls(parteOperacionesSummaryCache);
            renderParteOperacionesSummaryForCurrentSelection();
            return;
        }
    }
    if (!silent) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
                <div class="mt-2">Cargando resumen operativo...</div>
            </div>
        `;
    }
    if (typeof location !== 'undefined' && location.protocol === 'file:'){
        container.innerHTML = '<div class="alert alert-info mb-0">Inicia el servidor local para visualizar el resumen.</div>';
        return;
    }
    try {
        const res = await fetch('data/resumen_parte_operaciones.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const normalized = normalizeParteOperacionesSummary(raw);
        parteOperacionesSummaryBaseCache = normalized;
        const merged = mergeParteOperacionesCustomEntries(normalized);
        const previousSelection = parteOperacionesSummarySelectedDate;
        parteOperacionesSummaryCache = merged;
        parteOperacionesSummaryCacheFetchedAt = Date.now();
        syncParteOperacionesCalendarControls(merged);
        if (merged.isLegacy) {
            parteOperacionesSummarySelectedDate = merged.dates[0] || null;
        } else if (previousSelection && merged.byDate[previousSelection]) {
            parteOperacionesSummarySelectedDate = previousSelection;
        } else if (parteOperacionesSummaryAvailableDates.length) {
        parteOperacionesSummarySelectedDate = getDefaultParteOperacionesDate(merged) || parteOperacionesSummaryAvailableDates[parteOperacionesSummaryAvailableDates.length - 1];
        } else {
            parteOperacionesSummarySelectedDate = null;
        }
        renderParteOperacionesSummaryForCurrentSelection();
    } catch (err) {
        console.warn('loadParteOperacionesSummary failed:', err);
        if (!silent) {
            container.innerHTML = '<div class="alert alert-warning mb-0">No se pudo cargar el resumen. Intenta nuevamente.</div>';
        }
    }
}

function formatParteOperacionesMonthLabel(monthKey){
    if (!PARTE_OPERACIONES_MONTH_KEY_PATTERN.test(monthKey)) return monthKey;
    const [yearStr, monthStr] = monthKey.split('-');
    const monthIndex = Number(monthStr) - 1;
    if (monthIndex < 0 || monthIndex > 11) return monthKey;
    const monthName = SPANISH_MONTH_NAMES[monthIndex] || '';
    return monthName ? `${capitalizeFirst(monthName)} ${yearStr}` : monthKey;
}

function formatParteOperacionesMonthShortLabel(monthKey){
    if (!PARTE_OPERACIONES_MONTH_KEY_PATTERN.test(monthKey)) return monthKey;
    const monthIndex = Number(monthKey.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) return monthKey;
    return SPANISH_MONTH_ABBRS[monthIndex] || monthKey;
}

function resolveParteOperacionesSubtotal(item){
    const llegada = Number(item?.llegada) || 0;
    const salida = Number(item?.salida) || 0;
    const rawSubtotal = Number(item?.subtotal);
    if (Number.isFinite(rawSubtotal) && rawSubtotal >= 0) {
        return rawSubtotal;
    }
    return llegada + salida;
}

function classifyParteOperacionesAnnualType(value){
    const normalized = normalizeParteOperacionesType(value);
    if (!normalized) return 'otros';
    if (normalized.includes('pasaj')) return 'comercial';
    if (normalized.includes('carga')) return 'carga';
    if (normalized.includes('general')) return 'general';
    return 'otros';
}

function computeParteOperacionesAnnualDataset(summary, options = {}){
    if (!summary || !summary.byDate) return null;
    const referenceSummary = options.referenceSummary || (options.preferBaseCache ? parteOperacionesSummaryBaseCache : null);
    const entries = Object.entries(summary.byDate)
        .filter(([dateKey]) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
        .sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) return null;
    const monthMap = new Map();
    const dailySummaries = [];
    entries.forEach(([dateKey, entry]) => {
        const monthKey = dateKey.slice(0, 7);
        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, { key: monthKey, sums: { comercial: 0, carga: 0, general: 0, total: 0 }, days: 0 });
        }
        const bucket = monthMap.get(monthKey);
        bucket.days += 1;
        const referenceEntry = referenceSummary?.byDate?.[dateKey];
        const opsSource = referenceEntry || entry;
        const ops = Array.isArray(opsSource?.operaciones) ? opsSource.operaciones : [];
        let computedDailyTotal = 0;
        const dailyBreakdown = { comercial: 0, carga: 0, general: 0, otros: 0 };
        ops.forEach((item) => {
            const subtotal = resolveParteOperacionesSubtotal(item);
            computedDailyTotal += subtotal;
            const typeKey = classifyParteOperacionesAnnualType(item?.tipo);
            if (typeKey === 'comercial' || typeKey === 'carga' || typeKey === 'general') {
                bucket.sums[typeKey] += subtotal;
                dailyBreakdown[typeKey] += subtotal;
            } else {
                dailyBreakdown.otros += subtotal;
            }
        });
        const reportedTotal = Number(opsSource?.total_general);
        const hasValidReportedTotal = Number.isFinite(reportedTotal) && reportedTotal >= 0;
        let dayTotal = hasValidReportedTotal ? Math.max(reportedTotal, computedDailyTotal) : computedDailyTotal;
        let daySource = hasValidReportedTotal && reportedTotal >= computedDailyTotal ? 'reported' : 'computed';
        if (referenceEntry) {
            const refReported = Number(referenceEntry.total_general);
            const referenceTotal = Number.isFinite(refReported) && refReported >= 0
                ? Math.max(refReported, computedDailyTotal)
                : computedDailyTotal;
            dayTotal = referenceTotal;
            daySource = 'reference';
        }
        bucket.sums.total += dayTotal;
        dailySummaries.push({
            date: dateKey,
            monthKey,
            total: dayTotal,
            reportedTotal: hasValidReportedTotal ? reportedTotal : null,
            computedTotal: computedDailyTotal,
            referenceTotal: referenceEntry ? Number(referenceEntry.total_general) || computedDailyTotal : null,
            breakdown: dailyBreakdown,
            source: daySource
        });
    });
    const months = Array.from(monthMap.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((entry) => {
            const divisor = Math.max(1, entry.days);
            return {
                key: entry.key,
                label: formatParteOperacionesMonthLabel(entry.key),
                shortLabel: formatParteOperacionesMonthShortLabel(entry.key),
                dayCount: entry.days,
                averages: {
                    comercial: entry.sums.comercial / divisor,
                    carga: entry.sums.carga / divisor,
                    general: entry.sums.general / divisor,
                    total: entry.sums.total / divisor
                }
            };
        });
    const qualifiedMonths = months.filter((month) => month.dayCount >= PARTE_OPERACIONES_MIN_DAYS_PER_MONTH);
    if (!qualifiedMonths.length) return null;
    const aggregates = qualifiedMonths.reduce((acc, month) => {
        acc.comercial += month.averages.comercial;
        acc.carga += month.averages.carga;
        acc.general += month.averages.general;
        acc.total += month.averages.total;
        return acc;
    }, { comercial: 0, carga: 0, general: 0, total: 0 });
    const monthCount = qualifiedMonths.length;
    const overall = {
        comercial: aggregates.comercial / monthCount,
        carga: aggregates.carga / monthCount,
        general: aggregates.general / monthCount,
        total: aggregates.total / monthCount
    };
    const coverageLabel = monthCount === 1
        ? qualifiedMonths[0].label
        : `${qualifiedMonths[0].label} — ${qualifiedMonths[monthCount - 1].label}`;
    const sampleDays = qualifiedMonths.reduce((acc, month) => acc + (month.dayCount || 0), 0);
    const qualifiedMonthKeys = new Set(qualifiedMonths.map((month) => month.key));
    const relevantDays = dailySummaries.filter((day) => qualifiedMonthKeys.has(day.monthKey));
    const pickPeak = (days, metricFn) => {
        return days.reduce((best, candidate) => {
            const value = metricFn(candidate);
            if (!Number.isFinite(value)) return best;
            if (!best) {
                return { entry: candidate, value };
            }
            if (value > best.value || (value === best.value && candidate.date > best.entry.date)) {
                return { entry: candidate, value };
            }
            return best;
        }, null);
    };
    const peakDayTuple = pickPeak(relevantDays, (day) => Number(day.total));
    const peakCommercialTuple = pickPeak(relevantDays, (day) => Number(day.breakdown?.comercial));
    const peakDayEntry = peakDayTuple ? { ...peakDayTuple.entry, total: peakDayTuple.value } : null;
    const peakCommercialEntry = peakCommercialTuple && peakCommercialTuple.value > 0
        ? { ...peakCommercialTuple.entry, comercial: peakCommercialTuple.value }
        : null;
    const enrichPeak = (entry) => {
        if (!entry || !entry.date) return null;
        const dateObj = parseIsoDay(entry.date);
        const formatted = dateObj ? capitalizeFirst(parteOperacionesDateFormatter.format(dateObj)) : entry.date;
        const weekday = dateObj && WEEKDAY_FORMATTER ? capitalizeFirst(WEEKDAY_FORMATTER.format(dateObj)) : '';
        const normalizedTotal = Number(entry.total);
        const normalizeOptionalNumber = (value) => {
            if (value === null || value === undefined) return null;
            const numericValue = Number(value);
            return Number.isFinite(numericValue) ? numericValue : null;
        };
        const normalizedReported = normalizeOptionalNumber(entry.reportedTotal);
        const normalizedComputed = normalizeOptionalNumber(entry.computedTotal);
        return {
            ...entry,
            total: Number.isFinite(normalizedTotal) ? normalizedTotal : 0,
            reportedTotal: Number.isFinite(normalizedReported) ? normalizedReported : null,
            computedTotal: Number.isFinite(normalizedComputed) ? normalizedComputed : null,
            formatted,
            weekday
        };
    };
    const peakDayInfo = enrichPeak(peakDayEntry);
    const peakCommercialInfo = enrichPeak(peakCommercialEntry);
    const signature = JSON.stringify({
        months: qualifiedMonths.map((month) => [month.key, month.averages, month.dayCount]),
        peakDay: peakDayEntry ? [peakDayEntry.date, Number(peakDayEntry.total) || 0] : null,
        peakCommercial: peakCommercialEntry ? [peakCommercialEntry.date, Number(peakCommercialEntry.comercial) || 0] : null
    });
    return {
        months: qualifiedMonths,
        overall,
        monthCount,
        coverageLabel,
        sampleDays,
        signature,
        peakDay: peakDayInfo,
        peakCommercialDay: peakCommercialInfo
    };
}

function updateParteOperacionesAnnualChart(dataset, formatter){
    const canvas = document.getElementById('ops-annual-averages-chart');
    if (!canvas || typeof Chart !== 'function') return;
    if (parteOperacionesAnnualState.chart) {
        parteOperacionesAnnualState.chart.destroy();
        parteOperacionesAnnualState.chart = null;
    }
    if (!dataset || !dataset.months?.length) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
        return;
    }
    const labels = dataset.months.map((month) => month.shortLabel);
    const series = [
        { key: 'comercial', label: 'Aviación comercial', color: '#1565c0' },
        { key: 'carga', label: 'Aviación de carga', color: '#ef6c00' },
        { key: 'general', label: 'Aviación general', color: '#2e7d32' },
        { key: 'total', label: 'Promedio general', color: '#455a64' }
    ];
    const datasets = series.map((serie) => ({
        label: serie.label,
        data: dataset.months.map((month) => {
            const value = Number(month.averages?.[serie.key]) || 0;
            return Number(value.toFixed(2));
        }),
        borderColor: serie.color,
        backgroundColor: serie.color,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
    }));
    const ctx = canvas.getContext('2d');
    parteOperacionesAnnualState.chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const raw = Number(context.parsed.y) || 0;
                            const formatted = formatter ? formatter.format(Math.round(raw)) : raw;
                            return `${context.dataset.label}: ${formatted} ops`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
                            return formatter ? formatter.format(value) : value;
                        }
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderParteOperacionesAnnualAnalysis(summary){
    const cardsHost = document.getElementById('ops-annual-averages-cards');
    const tableHost = document.getElementById('ops-annual-averages-table');
    const chartCanvas = document.getElementById('ops-annual-averages-chart');
    if (!cardsHost && !tableHost && !chartCanvas) return;
    const dataset = computeParteOperacionesAnnualDataset(summary, { preferBaseCache: true });
    const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
    if (!dataset) {
        if (cardsHost) {
            cardsHost.innerHTML = `<div class="alert alert-light border text-muted mb-0">Aún no hay meses con al menos ${PARTE_OPERACIONES_MIN_DAYS_PER_MONTH} días registrados. Completa el mes para habilitar el análisis anual.</div>`;
        }
        if (tableHost) {
            tableHost.innerHTML = `<div class="alert alert-light border text-muted mb-0">Sin datos históricos suficientes para mostrar promedios mensuales (se requieren ${PARTE_OPERACIONES_MIN_DAYS_PER_MONTH} días capturados por mes).</div>`;
        }
        updateParteOperacionesAnnualChart(null, numberFormatter);
        parteOperacionesAnnualState.lastSignature = null;
        return;
    }
    const shouldUpdateDom = dataset.signature !== parteOperacionesAnnualState.lastSignature;
    if (shouldUpdateDom) {
        if (cardsHost) {
            const cardConfig = [
                { key: 'comercial', label: 'Aviación comercial', icon: 'fas fa-user-friends', tone: 'comercial' },
                { key: 'carga', label: 'Aviación de carga', icon: 'fas fa-box-open', tone: 'carga' },
                { key: 'general', label: 'Aviación general', icon: 'fas fa-paper-plane', tone: 'general' },
                { key: 'total', label: 'Promedio general', icon: 'fas fa-chart-line', tone: 'total' }
            ];
            const monthLabel = dataset.monthCount === 1 ? 'mes' : 'meses';
            const cards = cardConfig.map((card) => {
                const value = Math.round(Number(dataset.overall?.[card.key]) || 0);
                return `
                    <div class="annual-analysis-card annual-analysis-card--${card.tone}">
                        <span class="annual-analysis-card__eyebrow"><i class="${card.icon} me-2" aria-hidden="true"></i>${card.label}</span>
                        <p class="annual-analysis-card__value">${numberFormatter.format(value)}</p>
                        <div class="annual-analysis-card__trend">
                            <span class="annual-analysis-card__pill"><i class="fas fa-calendar-week" aria-hidden="true"></i>${dataset.monthCount} ${monthLabel}</span>
                            <span>Promedio mensual</span>
                        </div>
                    </div>
                `;
            });
            if (dataset.peakDay) {
                const peak = dataset.peakDay;
                const peakTotal = numberFormatter.format(Math.round(Number(peak.total) || 0));
                const pillLabel = peak.formatted ? escapeHTML(peak.formatted) : escapeHTML(peak.date || '');
                const breakdownParts = [];
                if (peak.breakdown) {
                    const formattedComercial = Math.round(Number(peak.breakdown.comercial) || 0);
                    const formattedCarga = Math.round(Number(peak.breakdown.carga) || 0);
                    const formattedGeneral = Math.round(Number(peak.breakdown.general) || 0);
                    const formattedOtros = Math.round(Number(peak.breakdown.otros) || 0);
                    if (formattedComercial > 0) breakdownParts.push(`Comercial ${numberFormatter.format(formattedComercial)} ops`);
                    if (formattedCarga > 0) breakdownParts.push(`Carga ${numberFormatter.format(formattedCarga)} ops`);
                    if (formattedGeneral > 0) breakdownParts.push(`General ${numberFormatter.format(formattedGeneral)} ops`);
                    if (formattedOtros > 0) breakdownParts.push(`Otros ${numberFormatter.format(formattedOtros)} ops`);
                }
                const breakdownText = breakdownParts.join(' · ');
                cards.push(`
                    <div class="annual-analysis-card annual-analysis-card--peak">
                        <span class="annual-analysis-card__eyebrow"><i class="fas fa-calendar-day me-2" aria-hidden="true"></i>Día con más operaciones</span>
                        <p class="annual-analysis-card__value">${peakTotal}</p>
                        <div class="annual-analysis-card__trend">
                            <span class="annual-analysis-card__pill"><i class="fas fa-calendar-alt" aria-hidden="true"></i>${pillLabel}</span>
                            <span>Pico anual</span>
                        </div>
                        ${breakdownText ? `<small class="annual-analysis-card__note">${breakdownText}</small>` : ''}
                    </div>
                `);
            }
            if (dataset.peakCommercialDay) {
                const peak = dataset.peakCommercialDay;
                const commercialValue = numberFormatter.format(Math.round(Number(peak.comercial) || 0));
                const pillLabel = peak.formatted ? escapeHTML(peak.formatted) : escapeHTML(peak.date || '');
                const totalOps = Number(peak.total) || 0;
                const totalText = numberFormatter.format(Math.round(totalOps));
                const share = totalOps > 0 ? Math.round((Number(peak.comercial) / totalOps) * 100) : null;
                const noteParts = [`Total diario ${totalText} ops`];
                if (Number.isFinite(share) && share >= 0) noteParts.push(`${share}% comercial`);
                const noteHtml = noteParts.length ? `<small class="annual-analysis-card__note">${escapeHTML(noteParts.join(' · '))}</small>` : '';
                const trendLabel = escapeHTML(peak.weekday || 'Mayor actividad comercial');
                cards.push(`
                    <div class="annual-analysis-card annual-analysis-card--peak-commercial">
                        <span class="annual-analysis-card__eyebrow"><i class="fas fa-user-friends me-2" aria-hidden="true"></i>Día con más operaciones comerciales</span>
                        <p class="annual-analysis-card__value">${commercialValue}</p>
                        <div class="annual-analysis-card__trend">
                            <span class="annual-analysis-card__pill"><i class="fas fa-calendar-alt" aria-hidden="true"></i>${pillLabel}</span>
                            <span>${trendLabel}</span>
                        </div>
                        ${noteHtml}
                    </div>
                `);
            }
            cardsHost.innerHTML = cards.join('');
        }
        if (tableHost) {
            const rows = dataset.months.map((month) => `
                <tr>
                    <th scope="row">${month.label}</th>
                    <td class="text-center">${numberFormatter.format(Math.round(month.averages.comercial || 0))}</td>
                    <td class="text-center">${numberFormatter.format(Math.round(month.averages.carga || 0))}</td>
                    <td class="text-center">${numberFormatter.format(Math.round(month.averages.general || 0))}</td>
                    <td class="text-center fw-semibold">${numberFormatter.format(Math.round(month.averages.total || 0))}</td>
                </tr>
            `).join('');
            const totalsRow = `
                <tr class="table-secondary fw-semibold">
                    <th scope="row">Promedio anual</th>
                    <td class="text-center">${numberFormatter.format(Math.round(dataset.overall.comercial || 0))}</td>
                    <td class="text-center">${numberFormatter.format(Math.round(dataset.overall.carga || 0))}</td>
                    <td class="text-center">${numberFormatter.format(Math.round(dataset.overall.general || 0))}</td>
                    <td class="text-center">${numberFormatter.format(Math.round(dataset.overall.total || 0))}</td>
                </tr>
            `;
            const coverageText = dataset.coverageLabel
                ? `<p class="small text-muted mt-2 mb-0"><i class="fas fa-calendar me-1"></i>Cobertura: ${dataset.coverageLabel} · ${dataset.sampleDays} ${dataset.sampleDays === 1 ? 'día' : 'días'} analizados · Regla mínima: ${PARTE_OPERACIONES_MIN_DAYS_PER_MONTH} días/mes</p>`
                : '';
            tableHost.innerHTML = `
                <table class="table table-striped table-hover align-middle mb-0">
                    <caption>Promedio mensual de operaciones</caption>
                    <thead class="table-light">
                        <tr>
                            <th scope="col">Mes</th>
                            <th scope="col" class="text-center">Comercial</th>
                            <th scope="col" class="text-center">Carga</th>
                            <th scope="col" class="text-center">General</th>
                            <th scope="col" class="text-center">Total</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>${totalsRow}</tfoot>
                </table>
                ${coverageText}
            `;
        }
        parteOperacionesAnnualState.lastSignature = dataset.signature;
    }
    updateParteOperacionesAnnualChart(dataset, numberFormatter);
}

function renderParteOperacionesSummary(data, metadata = {}){
    if (parteOperacionesLoaderTimer) {
        clearTimeout(parteOperacionesLoaderTimer);
        parteOperacionesLoaderTimer = null;
    }
    parteOperacionesLoaderPendingCallback = null;
    hideParteOperacionesLoader();
    const container = document.getElementById('operations-summary-table');
    if (!container) return;
    updateParteOperacionesAvailabilityBanner(parteOperacionesSummaryCache);
    if (!data){
        updateParteOperacionesTitle(metadata?.isoDate);
        container.innerHTML = '<div class="alert alert-info mb-0">No hay información disponible.</div>';
        return;
    }
    const ops = Array.isArray(data?.operaciones) ? data.operaciones : [];
    const formatter = new Intl.NumberFormat('es-MX');
    const normalizeKey = (value)=> {
        return (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    };
    const typeConfig = {
        'aviacion de pasajeros': {
            cardClass: 'ops-mini-card--comercial',
            iconClass: 'ops-type-icon--comercial',
            icon: 'fas fa-user-friends',
            progressClass: 'bg-primary'
        },
        'aviacion de carga': {
            cardClass: 'ops-mini-card--carga',
            iconClass: 'ops-type-icon--carga',
            icon: 'fas fa-box-open',
            progressClass: 'bg-warning'
        },
        'aviacion general': {
            cardClass: 'ops-mini-card--general',
            iconClass: 'ops-type-icon--general',
            icon: 'fas fa-paper-plane',
            progressClass: 'bg-success'
        },
        default: {
            cardClass: 'ops-mini-card--neutral',
            iconClass: 'ops-type-icon--neutral',
            icon: 'fas fa-plane',
            progressClass: 'bg-secondary'
        }
    };
    const totals = ops.reduce((acc, item)=>{
        const llegada = Number(item?.llegada) || 0;
        const salida = Number(item?.salida) || 0;
        const rawSubtotal = Number(item?.subtotal);
        const subtotal = Number.isFinite(rawSubtotal) && rawSubtotal > 0 ? rawSubtotal : (llegada + salida);
        acc.llegada += llegada;
        acc.salida += salida;
        acc.subtotal += subtotal;
        return acc;
    }, { llegada: 0, salida: 0, subtotal: 0 });
    const totalGeneralFallback = Number(data?.total_general);
    const totalGeneral = Number.isFinite(totalGeneralFallback) && totalGeneralFallback >= 0 ? totalGeneralFallback : (totals.subtotal || (totals.llegada + totals.salida));
    const friendlyDate = metadata?.friendlyDate || '';

    if (!ops.length){
        updateParteOperacionesTitle(metadata?.isoDate);
        container.innerHTML = `
            <div class="card shadow-sm border-0 ops-summary-table">
                <div class="card-body p-0">
                    <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-bottom">
                        <div>
                            <h3 class="h5 mb-1">Resumen operativo diario</h3>
                            <p class="small text-muted mb-0">Fuente: parte de operaciones</p>
                            ${friendlyDate ? `<p class="small text-primary mb-0 mt-1 d-flex align-items-center gap-2"><i class="fas fa-calendar-day"></i><span>${friendlyDate}</span></p>` : ''}
                        </div>
                        <div class="text-md-end">
                            <span class="badge bg-primary text-white fs-6">${formatter.format(totalGeneral)} operaciones</span>
                        </div>
                    </div>
                    <div class="px-4 py-4">
                        <div class="alert alert-info mb-0">No hay información capturada para esta fecha.</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const enriched = ops.map(item => {
        const tipo = (item?.tipo || 'Sin clasificar').toString().trim();
        const key = normalizeKey(tipo);
        const cfg = typeConfig[key] || typeConfig.default;
        const llegada = Number(item?.llegada) || 0;
        const salida = Number(item?.salida) || 0;
        const rawSubtotal = Number(item?.subtotal);
        const subtotal = Number.isFinite(rawSubtotal) && rawSubtotal > 0 ? rawSubtotal : (llegada + salida);
        const share = totalGeneral > 0 ? (subtotal / totalGeneral) * 100 : 0;
        const shareRounded = Math.min(100, Math.max(0, Number.isFinite(share) ? share : 0));
        const shareLabel = shareRounded.toFixed(1);
        return { tipo, llegada, salida, subtotal, cfg, shareRounded, shareLabel };
    });

    const cardsMarkup = enriched.map(entry => {
        const { tipo, llegada, salida, subtotal, cfg, shareLabel, shareRounded } = entry;
        const shareSentence = `Participación ${shareLabel}%`;
        return `
            <div class="ops-mini-card ${cfg.cardClass}">
                <div class="ops-mini-card__icon"><i class="${cfg.icon}" aria-hidden="true"></i></div>
                <div class="ops-mini-card__body">
                    <p class="ops-mini-card__label">${tipo}</p>
                    <h4 class="ops-mini-card__value">${formatter.format(subtotal)}</h4>
                    <div class="ops-mini-card__meta">
                        <span><i class="fas fa-plane-arrival me-1"></i>${formatter.format(llegada)}</span>
                        <span><i class="fas fa-plane-departure me-1"></i>${formatter.format(salida)}</span>
                    </div>
                    <div class="ops-mini-card__footer">
                        <span class="badge rounded-pill bg-white text-dark ops-mini-card__badge" title="${shareSentence}">${shareSentence}</span>
                    </div>
                    <div class="ops-mini-card__progress">
                        <div class="progress progress-thin" role="progressbar" aria-label="${shareSentence}" aria-valuenow="${shareRounded}" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-bar ${cfg.progressClass}" style="width:${shareRounded}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const rows = enriched.map(entry => {
        const { tipo, llegada, salida, subtotal, cfg, shareLabel, shareRounded } = entry;
        const shareSentence = `Participación ${shareLabel}%`;
        return `
            <tr>
                <th scope="row">
                    <div class="d-flex align-items-center gap-2">
                        <span class="ops-type-icon ${cfg.iconClass}"><i class="${cfg.icon}" aria-hidden="true"></i></span>
                        <span>${tipo}</span>
                    </div>
                </th>
                <td class="text-center">${formatter.format(llegada)}</td>
                <td class="text-center">${formatter.format(salida)}</td>
                <td class="text-center fw-semibold">${formatter.format(subtotal)}</td>
                <td class="text-center">
                    <span class="badge bg-light text-dark border">${shareLabel}%</span>
                    <div class="progress progress-thin mt-1" role="progressbar" aria-label="${shareSentence}" aria-valuenow="${shareRounded}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-bar ${cfg.progressClass}" style="width:${shareRounded}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    const totalPercentLabel = totalGeneral > 0 ? '100%' : '0%';

    updateParteOperacionesTitle(metadata?.isoDate);

    container.innerHTML = `
        <div class="card shadow-sm border-0 ops-summary-table">
            <div class="card-body p-0">
                <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-4 py-3 border-bottom">
                    <div>
                        <h3 class="h5 mb-1">Resumen operativo diario</h3>
                        <p class="small text-muted mb-0">Fuente: parte de operaciones</p>
                        ${friendlyDate ? `<p class="small text-primary mb-0 mt-1 d-flex align-items-center gap-2"><i class="fas fa-calendar-day"></i><span>${friendlyDate}</span></p>` : ''}
                    </div>
                    <div class="text-md-end">
                        <span class="badge bg-primary text-white fs-6">${formatter.format(totalGeneral)} operaciones</span>
                    </div>
                </div>
                <div class="px-4 pt-4 pb-2">
                    <div class="ops-mini-grid">
                        ${cardsMarkup}
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle mb-0">
                        <caption class="text-muted small px-4 pt-3">Desglose por tipo de operación</caption>
                        <thead class="table-light">
                            <tr>
                                <th scope="col">Tipo</th>
                                <th scope="col" class="text-center">Llegadas</th>
                                <th scope="col" class="text-center">Salidas</th>
                                <th scope="col" class="text-center">Subtotal</th>
                                <th scope="col" class="text-center">Participación</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                        <tfoot>
                            <tr class="table-secondary fw-semibold">
                                <th scope="row">Total general</th>
                                <td class="text-center">${formatter.format(totals.llegada)}</td>
                                <td class="text-center">${formatter.format(totals.salida)}</td>
                                <td class="text-center">${formatter.format(totalGeneral)}</td>
                                <td class="text-center">${totalPercentLabel}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function refreshOperationalData(options = {}) {
    if (operationalRefreshInFlight) return operationalRefreshInFlight;
    const preserveFilters = options.preserveFilters !== false;
    const silentSummary = options.silentSummary !== false;
    const reason = options.reason || 'auto';
    try { console.info(`[auto-refresh] Actualizando datos (${reason})`); } catch (_) {}
    lastOperationalAutoRefresh = Date.now();
    const runner = (async () => {
        const tasks = [];
        try {
            tasks.push(loadItineraryData({ preserveFilters }));
        } catch (err) {
            console.warn('Auto refresh: loadItineraryData falló', err);
        }
        try {
            tasks.push(loadParteOperacionesSummary({ force: true, silent: silentSummary }));
        } catch (err) {
            console.warn('Auto refresh: loadParteOperacionesSummary falló', err);
        }
        if (tasks.length) {
            await Promise.allSettled(tasks);
        }
    })();
    operationalRefreshInFlight = runner;
    runner.finally(() => {
        operationalRefreshInFlight = null;
    });
    return runner;
}

function canTriggerAndroidAutoRefresh(trigger, now = Date.now()) {
    if (!isAndroidDevice) return false;
    if (document.visibilityState === 'prerender') return false;
    if (now - lastOperationalAutoRefresh < OPERATIONAL_REFRESH_DEBOUNCE) return false;
    if (trigger === 'interval') return true;
    const gap = androidVisibilityHiddenAt ? now - androidVisibilityHiddenAt : Number.POSITIVE_INFINITY;
    return gap >= ANDROID_AUTO_REFRESH_THRESHOLD;
}

function maybeTriggerAndroidAutoRefresh(trigger) {
    if (!isAndroidDevice) return;
    if (document.readyState === 'loading') return;
    if (!canTriggerAndroidAutoRefresh(trigger)) return;
    refreshOperationalData({ preserveFilters: true, silentSummary: true, reason: `android-${trigger}` }).catch((err) => {
        console.warn('Android auto-refresh error:', err);
    });
}

function handleAndroidVisibilityChange() {
    if (!isAndroidDevice) return;
    if (document.hidden) {
        androidVisibilityHiddenAt = Date.now();
        return;
    }
    maybeTriggerAndroidAutoRefresh('visibility');
}

function handleAndroidFocus() {
    if (!isAndroidDevice) return;
    maybeTriggerAndroidAutoRefresh('focus');
}

function startAndroidAutoRefreshTimer() {
    if (!isAndroidDevice) return;
    if (androidAutoRefreshIntervalId) return;
    androidAutoRefreshIntervalId = setInterval(() => {
        maybeTriggerAndroidAutoRefresh('interval');
    }, OPERATIONAL_REFRESH_INTERVAL);
}

if (isAndroidDevice) {
    try {
        document.addEventListener('visibilitychange', handleAndroidVisibilityChange, { passive: true });
        window.addEventListener('focus', handleAndroidFocus, { passive: true });
        window.addEventListener('pageshow', (event) => {
            if (event && event.persisted) {
                maybeTriggerAndroidAutoRefresh('pageshow');
            }
        }, { passive: true });
    } catch (err) {
        console.warn('Android auto-refresh listeners failed:', err);
    }
}

        // Inicialización principal de la aplicación cuando el DOM está listo
        document.addEventListener('DOMContentLoaded', () => {
            try {
                setupEventListeners();
            } catch (err) {
                console.warn('setupEventListeners failed:', err);
            }

            try {
                animateLoginTitle();
            } catch (err) {
                console.warn('animateLoginTitle failed:', err);
            }

            try {
                initializeTheme();
                initializeSidebarState();
            } catch (err) {
                console.warn('Theme/sidebar init failed:', err);
            }

            try {
                setupPwaInstallExperience();
            } catch (err) {
                console.warn('setupPwaInstallExperience failed:', err);
            }

            try {
                updateDate();
                updateClock();
                setInterval(updateClock, 1000);
            } catch (err) {
                console.warn('Clock/date init failed:', err);
            }

            try {
                ensureAuthHashes();
            } catch (err) {
                console.warn('ensureAuthHashes eager init failed:', err);
            }

            try {
                loadItineraryData();
            } catch (err) {
                console.warn('loadItineraryData failed:', err);
            }

            try {
                createPdfSections();
            } catch (err) {
                console.warn('createPdfSections failed:', err);
            }

            try {
                loadParteOperacionesSummary();
            } catch (err) {
                console.warn('loadParteOperacionesSummary failed:', err);
            }

            try {
                checkSession();
            } catch (err) {
                console.warn('checkSession failed:', err);
            }

            try {
                initializeGsoQuickLinks();
            } catch (err) {
                console.warn('initializeGsoQuickLinks init failed:', err);
            }

            try {
                showGsoMenu();
            } catch (err) {
                console.warn('showGsoMenu init failed:', err);
            }

            try {
                if (isAndroidDevice) startAndroidAutoRefreshTimer();
            } catch (err) {
                console.warn('Android auto-refresh timer init failed:', err);
            }
        });

