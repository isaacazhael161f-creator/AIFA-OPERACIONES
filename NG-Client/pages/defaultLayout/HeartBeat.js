/** This file contains code for use in the window renderer process to respond to heartbeat commands */
const electron = require('electron');
const remote = require('@electron/remote');

const ipcRenderer = electron.ipcRenderer;

const windowId = remote.getCurrentWindow().getTitle();
ipcRenderer.on(('HeartBeat-' + windowId), (event, arg) => {
  ipcRenderer.send('HeartBeat-' + windowId, {id: windowId, status: 'ok', time: new Date()});
});
