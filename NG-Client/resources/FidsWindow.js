}"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FidsWindow = void 0;
const electron = require("electron");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const url = require("url");
const uuid = require("uuid");
const LoggerService_1 = require("../services/logger/LoggerService");
const MetricResources_1 = require("../tools/MetricResources");
const MonitorUtils_1 = require("./../tools/utils/MonitorUtils");
const WindowResources_1 = require("./../tools/WindowResources");
const ConfigController_1 = require("./Config/ConfigController");
const EventUtils_1 = require("./EventUtils");
const MetricController_1 = require("./Metric/MetricController");
const EventLogger_1 = require("../services/logger/EventLogger");
const lodash_1 = require("lodash");
const MonitorManager_1 = require("./MonitorManager");
/**
 * Wrapper class which holds two electron BrowserWindows (Main and Hold page windows)
 *
 * @export
 * @class FidsWindow
 */
class FidsWindow {
    /**
     * Creates an instance of FidsWindow.
     * Create a main and hold page browser window
     *
     * @param {FidsWindowProperties} properties
     * @memberof FidsWindow
     */
    constructor(properties) {
        this.logger = LoggerService_1.LoggerService.Instance.createLogger(FidsWindow.name);
        this.metricController = MetricController_1.MetricController.Instance;
        this.configController = ConfigController_1.ConfigController.Instance;
        this.eventLogger = EventLogger_1.EventLogger.Instance;
        this.properties = properties;
        this.id = this.properties.name;
        this.closed$ = new rxjs_1.ReplaySubject();
        this.metricController.updateWebComponentMetric(this.id, 'url', this.properties.mainLayout.url);
        this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.CREATED);
        this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.CREATED);
    }
    /**
     * Opens main and hold page
     *
     * @memberof FidsWindow
     */
    open() {
        // Moved to top since we listen for this subject to close subscriptions we setup below
        if (!this.closed$.closed) {
            this.closed$.next(true);
            this.closed$.complete();
        }
        this.closed$ = new rxjs_1.ReplaySubject();
        // Change metric state to Starting
        if (!this.mainLayout) {
            this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.STARTING);
            this.mainLayout = this.createWindowFromConfig(this.properties.mainLayout, FidsWindow.MAIN_LAYOUT_NAME);
            this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.ACTIVE);
        }
        if (!this.defaultLayout) {
            this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.STARTING);
            this.defaultLayout = this.createHoldWindowFromConfig(this.properties.defaultLayout, this.properties.mainLayout, FidsWindow.DEFAULT_LAYOUT_NAME);
            this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.ACTIVE);
        }
        this.setupListeners();
    }
    /**
     * Closes main and hold page,
     *
     * @param {boolean} [showDefaultLayout]
     * @memberof FidsWindow
     */
    close() {
        // Change metric state to Stopping
        if (this.mainLayout) {
            this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.STOPPING);
            this.mainLayout.destroy();
            this.mainLayout = null;
            clearInterval(this.properties.mainLayout.timer);
            this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.STOPPED);
        }
        if (this.defaultLayout) {
            this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.STOPPING);
            this.defaultLayout.destroy();
            this.defaultLayout = null;
            clearInterval(this.properties.defaultLayout.timer);
            this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.STOPPED);
        }
        this.closed$.next(true);
        this.closed$.complete();
    }
    /**
     * Refreshes main and hold page
     *
     * @memberof FidsWindow
     */
    refresh() {
        if (this.mainLayout) {
            this.mainLayout.reload();
        }
        if (this.defaultLayout) {
            this.defaultLayout.reload();
        }
    }
    /**
     * Updates the url of the main layout and loads the new page
     *
     * @memberof FidsWindow
     */
    updateUrl(newUrl, requiresReload, currentUrl) {
        this.properties.mainLayout.url = newUrl;
        if (this.mainLayout && requiresReload) {
            this.mainLayout.loadURL((new url.URL(this.properties.mainLayout.url)).href);
        }
        else if (this.mainLayout && !requiresReload) {
            this.mainLayout.webContents.send('offlineDataURLChange', { url: currentUrl });
        }
    }
    /**
     * Checks if main page is open
     *
     * @returns
     * @memberof FidsWindow
     */
    isMainLayoutOpen() {
        return this.mainLayout && this.mainLayout.isVisible();
    }
    /**
     * Checks if hole page is open
     *
     * @returns
     * @memberof FidsWindow
     */
    isDefaultLayoutOpen() {
        return this.defaultLayout && this.defaultLayout.isVisible();
    }
    /** toggles dev tools on the main page */
    toggleMainLayoutDevTools() {
        this.mainLayout.webContents.toggleDevTools();
    }
    /** toggles dev tools on the hold page */
    toggleDefaultLayoutDevTools() {
        this.defaultLayout.webContents.toggleDevTools();
    }
    /**
     * Opens dev tools for main and hold page
     *
     * @memberof FidsWindow
     */
    openDevTools() {
        if (this.mainLayout) {
            this.mainLayout.webContents.openDevTools();
        }
        if (this.defaultLayout) {
            this.defaultLayout.webContents.openDevTools();
        }
    }
    /**
     * Closes dev tools for main and hold page
     *
     * @memberof FidsWindow
     */
    closeDevTools() {
        if (this.mainLayout) {
            this.mainLayout.webContents.closeDevTools();
        }
        if (this.defaultLayout) {
            this.defaultLayout.webContents.closeDevTools();
        }
    }
    setupListeners() {
        const controllerPropertyNames = this.configController.get('window.properties').split(',');
        const propertyListeners = [];
        for (const propertyName of controllerPropertyNames) {
            propertyListeners.push(this.configController.propertyChannel(propertyName));
        }
        const systemProps = this.configController.get('system', { isObject: true });
        if (!(0, lodash_1.isNil)(systemProps)) {
            Object.getOwnPropertyNames(systemProps).forEach((key) => {
                propertyListeners.push(this.configController.propertyChannel(`system.${key}`));
            });
        }
        this.logger.info(`[${this.id}] starting window configuration listener. [${controllerPropertyNames}]`);
        (0, rxjs_1.merge)(...propertyListeners)
            .pipe((0, operators_1.takeUntil)(this.closed$), (0, operators_1.debounceTime)(1000))
            .subscribe(() => {
            this.logger.info(`[${this.id}] found config update. Sending new load to window`);
            const configuration = MonitorUtils_1.MonitorUtils.getConfigurationForMonitor(this.configController, this.id);
            if (this.mainLayout) {
                this.mainLayout.webContents.send(WindowResources_1.WindowSendCommand.NEW_CONFIG, configuration);
            }
            if (this.defaultLayout) {
                this.defaultLayout.webContents.send(WindowResources_1.WindowSendCommand.NEW_CONFIG, configuration);
            }
        }, () => {
            this.logger.info(`[${this.id}] window configuration listener has stopped.`);
        });
    }
    /**
     * Creates a electron browser window based on the passed properties
     *
     * @private
     * @param {WindowProperties} windowProperties
     * @param {Name} name
     * @returns
     * @memberof FidsWindow
     */
    createWindowFromConfig(windowProperties, name) {
        let eventObj = {};
        const newWindow = new electron.BrowserWindow({
            frame: windowProperties.frame,
            height: windowProperties.height,
            kiosk: windowProperties.kioskMode,
            title: windowProperties.title,
            width: windowProperties.width,
            x: windowProperties.xPosition,
            y: windowProperties.yPosition,
            minWidth: windowProperties.top  ,
            minHeight: windowProperties.top   ,
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                partition: uuid.v4().toUpperCase(),
                contextIsolation: false,
            },
        });
        newWindow.webContents.backgroundThrottling = false;
        MonitorManager_1.MonitorManager.electronIdToMonitorCustomProps.set(newWindow.webContents.id, {
            monitorName: this.id,
        });
        if (windowProperties.debug === true) {
            this.logger.info(`Opening debug console on [${name}] as debug property is set.`);
            newWindow.webContents.openDevTools();
        }
        newWindow.setKiosk(windowProperties.kioskMode);
        newWindow.setFullScreen(windowProperties.fullscreen);
        newWindow.setAlwaysOnTop(windowProperties.alwaysOnTop, 'normal');
        newWindow.on('unresponsive', () => {
            this.metricController.updateWebComponentMetric(this.id, 'state', MetricResources_1.WindowState.CRASHED);
        });
        // TODO move this to a function and apply also to default window,
        //  log all requests and responses, make referer include the controller id ?
        let corrId = '';
        newWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            const headers = details.requestHeaders; // TS7017, RequestHeaders is empty interface.
            headers['apt_correlation_id'] = uuid.v4().toUpperCase();
            corrId = headers['apt_correlation_id'];
            headers['Referer'] = name;
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
        newWindow.webContents.session.webRequest.onSendHeaders((details) => {
            const override = {
                type: 'InOut',
                clientId: this.configController.get('id'),
                correlationId: (0, lodash_1.get)(details, 'headers.APT_CORRELATION_ID'),
                processName: this.id,
            };
            const reqHeaders = JSON.stringify((0, lodash_1.get)(details, 'requestHeaders'));
            const message = `OUTGOING: ${(0, lodash_1.get)(details, 'method')} ${(0, lodash_1.get)(details, 'url')} Headers: ${reqHeaders}`;
            this.logger.info(`${message}`, override);
        });
        newWindow.webContents.session.webRequest.onCompleted((details) => {
            const override = {
                type: 'InOut',
                clientId: this.configController.get('id'),
                correlationId: (0, lodash_1.get)(details, 'headers.APT_CORRELATION_ID'),
                processName: this.id,
            };
            const resHeaders = JSON.stringify((0, lodash_1.get)(details, 'responseHeaders'));
            const message = `INCOMING: ${(0, lodash_1.get)(details, 'statusLine')} ${(0, lodash_1.get)(details, 'url')} Headers: ${resHeaders}`;
            this.logger.info(`${message}`, override);
        });
        // PTR 17523479 Remove blocking x-frame-options from stopping external content from displaying
        newWindow.webContents.session.webRequest.onHeadersReceived((detail, callback) => {
            const xFrameOriginKey = Object.keys(detail.responseHeaders).find((header) => {
                return String(header).match(/^x-frame-options$/i) != null;
            });
            if (xFrameOriginKey) {
                delete detail.responseHeaders[xFrameOriginKey];
            }
            callback({ cancel: false, responseHeaders: detail.responseHeaders });
        });
        newWindow.webContents.on('did-fail-load', (err) => {
            eventObj = {
                type: 'LAYOUT_FAILED',
                description: `Electron web content failed to load for: ${windowUrl}`,
                correlationId: corrId,
            };
            this.eventLogger.error(eventObj);
        });
        // Add event loggings
        this.addBasicBrowserLogging(newWindow, name);
        const windowUrl = url.parse(windowProperties.url).href;
        this.logger.info(`[${this.id}] [main] setting url: ${windowUrl}`);
        newWindow.loadURL(windowUrl);
        // create heartBeat interval
        const heartBeatChannel = 'HeartBeat-' + newWindow.getTitle();
        // Listen for heartbeat config
        this.configController.propertyChannel('heartbeat.interval')
            .pipe((0, operators_1.takeUntil)(this.closed$))
            .subscribe((newHeartbeat) => {
            // clear old interval if it exists
            if (windowProperties.timer) {
                clearInterval(windowProperties.timer);
            }
            const newHeartbeatValue = parseInt(newHeartbeat.value, 10);
            windowProperties.timer = this.createHeartbeatInterval(heartBeatChannel, newWindow, newHeartbeatValue);
        });
        // Grab heartbeat interval from config
        const heartbeatValue = parseInt(this.configController.get('heartbeat.interval'), 10);
        // setup heartbeat interval
        windowProperties.timer = this.createHeartbeatInterval(heartBeatChannel, newWindow, heartbeatValue);
        // Log heartbeat response
        electron.ipcMain.on(heartBeatChannel, (event, arg) => {
            this.handleHeartBeat(arg);
        });
        // Wait 'layout.timeout' and if the layout is not in the READY state then we considered the layout to have failed
        setTimeout(() => {
            if ((0, lodash_1.get)(this.metricController.getMetric(MetricResources_1.MetricType.WebComponent, this.id), 'state') !== MetricResources_1.WindowState.READY) {
                eventObj = {
                    type: 'LAYOUT_FAILED',
                    description: ` Layout ${this.id} failed to render.`,
                    correlationId: corrId,
                };
                this.eventLogger.error(eventObj);
            }
        }, Number(this.configController.get('layout.timeout')));
        return newWindow;
    }
    /**
     * Create heartbeat for rendering engine based on config props.
     * @param heartBeatChannel The IPC channel name
     * @param heartbeatConfig The config prop holding the heartbeat interval (in seconds)
     * @param windowProperties Props for the window
     * @param newWindow Window being created
     */
    createHeartbeat(heartBeatChannel, heartbeatConfig, windowProperties, newWindow) {
        // This is the function that will be recalled to send the hearbeat periodically
        // interval: the interval (in ms)
        // sendHB: send heartbeat function reference (since this.sendHeartbeat is out of scope here)
        const timeoutfunct = (interval, sendHB) => {
            windowProperties.timer = setTimeout((_) => {
                sendHB(heartBeatChannel, newWindow);
                timeoutfunct(interval, sendHB);
            }, interval);
        };
        // Watch the heartbeat interval value and update the timeout if outdated
        this.configController.propertyChannel(heartbeatConfig)
            .subscribe((newIntervalObj) => {
            const value = (0, lodash_1.get)(newIntervalObj, 'value', '5');
            // If there is already a heartbeat subscription, make sure to unsubscribe
            if (windowProperties.timer) {
                clearTimeout(windowProperties.timer);
                windowProperties.timer = null;
            }
            // Create a new timer if needed
            if (value && parseInt(value, 10) && parseInt(value, 10) > 0) {
                const newInterval = parseInt(value, 10) * 1000;
                timeoutfunct(newInterval, this.sendHeartBeat);
            }
        });
    }
    createHeartbeatInterval(channel, window, interval) {
        // create new interval only if > 0
        if (channel && window && interval > 0) {
            return setInterval(() => {
                this.sendHeartBeat(channel, window);
            }, interval);
        }
        return null;
    }
    /*
      Create amadeus hold window from configuration
     */
    createHoldWindowFromConfig(holdWindowProperties, windowProperties, name) {
        const newWindow = new electron.BrowserWindow({
            frame: holdWindowProperties.frame || windowProperties.frame,
            height: holdWindowProperties.height || windowProperties.height,
            kiosk: holdWindowProperties.kioskMode || windowProperties.kioskMode,
            title: `${this.properties.name}-${holdWindowProperties.title || windowProperties.title}`,
            width: holdWindowProperties.width || windowProperties.width,
            x: holdWindowProperties.xPosition || windowProperties.xPosition,
            y: holdWindowProperties.yPosition || windowProperties.yPosition,
            minWidth: windowProperties.width,
            minHeight: windowProperties.height,
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                partition: uuid.v4().toUpperCase(),
                contextIsolation: false,
            },
        });
        MonitorManager_1.MonitorManager.electronIdToMonitorCustomProps.set(newWindow.webContents.id, {
            monitorName: this.id,
        });
        this.setHoldProps(newWindow, holdWindowProperties, windowProperties);
        newWindow.on('unresponsive', () => {
            this.metricController.updateWebComponentMetric(this.id, 'holdPageState', MetricResources_1.WindowState.CRASHED);
        });
        // Add event loggings
        this.addBasicBrowserLogging(newWindow, name);
        // Use the required url for the defaultLayout page
        const windowUrl = url.parse(holdWindowProperties.url).href;
        this.logger.info(`[${this.id}][hold] setting url: ${windowUrl}`);
        newWindow.loadURL(windowUrl);
        const heartBeatChannel = 'HeartBeat-' + newWindow.getTitle();
        // Listen for heartbeat config
        this.configController.propertyChannel('heartbeat.hold.interval')
            .pipe((0, operators_1.takeUntil)(this.closed$))
            .subscribe((newHeartbeat) => {
            // clear old interval if it exists
            if (holdWindowProperties.timer) {
                clearInterval(holdWindowProperties.timer);
            }
            const newHeartbeatValue = parseInt(newHeartbeat.value, 10);
            holdWindowProperties.timer = this.createHeartbeatInterval(heartBeatChannel, newWindow, newHeartbeatValue);
        });
        // Grab heartbeat interval from config
        const heartbeatValue = parseInt(this.configController.get('heartbeat.hold.interval'), 10);
        // setup heartbeat interval
        holdWindowProperties.timer = this.createHeartbeatInterval(heartBeatChannel, newWindow, heartbeatValue);
        // Log heartbeat response
        electron.ipcMain.on(heartBeatChannel, (event, arg) => {
            // Change the ID to show which monitor the hold screen is for
            this.handleHeartBeat(arg);
        });
        return newWindow;
    }
    // Function to set the hold page electron props
    setHoldProps(newWindow, holdWindowProperties, windowProperties) {
        // set the kioskMode property
        if (holdWindowProperties.kioskMode === undefined || holdWindowProperties.kioskMode === null) {
            newWindow.setKiosk(windowProperties.kioskMode);
        }
        else {
            newWindow.setKiosk(holdWindowProperties.kioskMode);
        }
        // set the fullscreen property
        if (holdWindowProperties.fullscreen === undefined || holdWindowProperties.fullscreen === null) {
            newWindow.setFullScreen(windowProperties.fullscreen);
        }
        else {
            newWindow.setFullScreen(holdWindowProperties.fullscreen);
        }
        // set the alwaysOnTop property
        if (holdWindowProperties.alwaysOnTop === undefined || holdWindowProperties.alwaysOnTop === null) {
            newWindow.setAlwaysOnTop(windowProperties.alwaysOnTop, 'normal');
        }
        else {
            newWindow.setAlwaysOnTop(holdWindowProperties.alwaysOnTop, 'normal');
        }
    }
    /**
     * Adds basic logging to each event of the passed in browser
     *
     * @private
     * @param {electron.BrowserWindow} browser
     * @memberof FidsWindow
     */
    addBasicBrowserLogging(browser, name) {
        EventUtils_1.EventUtils.BrowserWindowEvents.forEach((eventType) => {
            browser.on(eventType.eventName, () => {
                this.logger.log(eventType.logLevel, `[${this.properties.name}] [${name}] Browser Window Event ${eventType.eventName} has occured`);
            });
        });
        EventUtils_1.EventUtils.WebContentEvents.forEach((eventType) => {
            browser.on(eventType.eventName, () => {
                this.logger.log(eventType.logLevel, `[${this.properties.name}] [${name}] Web Component Event ${eventType.eventName} has occured`);
            });
        });
    }
    /**
     * Sends heartbeat command to mainLayout
     *
     * @private
     * @param {string} channel
     * @param {electron.BrowserWindow} window
     * @memberof FidsWindow
     */
    sendHeartBeat(channel, window) {
        window.webContents.send(channel, 'heartBeat');
    }
    /**
     * Handle heartbeat message
     *
     * @private
     * @param {*} message
     * @param idOverride String to override id in log message
     * @memberof FidsWindow
     */
    handleHeartBeat(message) {
        const windowId = message.id;
        const status = message.status;
        const time = message.time;
        this.logger.info(`HEARTBEAT: [${windowId}] [${status}] [${time}]`);
        this.metricController.updateWebComponentMetric(windowId, 'lastHeartbeat', time);
    }
}
exports.FidsWindow = FidsWindow;
FidsWindow.MAIN_LAYOUT_NAME = 'MainLayout';
FidsWindow.DEFAULT_LAYOUT_NAME = 'DefaultLayout';
//# sourceMappingURL=FidsWindow.js.ma