"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var electron_updater_1 = require("electron-updater");
var url = require("url");
var path = require("path");
// const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid');
electron_1.app.setAsDefaultProtocolClient('xrb'); // Register handler for xrb: links
console.log("Starting ledger@!");
var ledger_1 = require("./lib/ledger");
// const ledger = require('./src-desktop/ledger');
ledger_1.initialize();
// const Ledger = new ledger();
// Ledger.loadLedger();
var mainWindow;
// global['LedgerTransport'] = TransportNodeHid;
function createWindow() {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({ width: 1000, height: 600, webPreferences: { webSecurity: false, devTools: true } });
    // const options = { extraHeaders: "pragma: no-cache\n" };
    // mainWindow.loadURL('https://nanovault.io', options);
    // mainWindow.loadURL('http://localhost:4200/');
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, '../../dist/index.html'),
        protocol: 'file:',
        slashes: true
    }));
    // mainWindow.LedgerTransport = TransportU2F;
    // mainWindow.webContents.
    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    mainWindow.webContents.on('new-window', function (e, url) {
        e.preventDefault();
        electron_1.shell.openExternal(url);
    });
    var menuTemplate = getApplicationMenu();
    // Create our menu entries so that we can use MAC shortcuts
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(menuTemplate));
}
electron_1.app.on('ready', function () {
    // Once the app is ready, launch the wallet window
    createWindow();
    // Detect when the application has been loaded using an xrb: link, send it to the wallet to load
    electron_1.app.on('open-url', function (event, path) {
        if (!mainWindow) {
            createWindow();
        }
        if (!mainWindow.webContents.isLoading()) {
            mainWindow.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('protocol-load', { detail: '" + path + "' }));");
        }
        mainWindow.webContents.once('did-finish-load', function () {
            mainWindow.webContents.executeJavaScript("window.dispatchEvent(new CustomEvent('protocol-load', { detail: '" + path + "' }));");
        });
        event.preventDefault();
    });
    // Check for any updates on GitHub
    checkForUpdates();
});
// Quit when all windows are closed.
electron_1.app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
function checkForUpdates() {
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify()
        .then(function () { })
        .catch(console.log);
}
// Build up the menu bar options based on platform
function getApplicationMenu() {
    var template = [
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'View GitHub',
                    click: function () { loadExternal('https://github.com/cronoh/nanovault'); }
                },
                {
                    label: 'Submit Issue',
                    click: function () { loadExternal('https://github.com/cronoh/nanovault/issues/new'); }
                },
                { type: 'separator' },
                {
                    type: 'normal',
                    label: "NanoVault Version: " + electron_updater_1.autoUpdater.currentVersion,
                },
                {
                    label: 'View Latest Updates',
                    click: function () { loadExternal('https://github.com/cronoh/nanovault/releases'); }
                },
                { type: 'separator' },
                {
                    label: "Check for Updates...",
                    click: function (menuItem, browserWindow) {
                        checkForUpdates();
                    }
                },
            ]
        }
    ];
    if (process.platform === 'darwin') {
        template.unshift({
            label: 'NanoVault',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                {
                    label: "Check for Updates...",
                    click: function (menuItem, browserWindow) {
                        checkForUpdates();
                    }
                },
                { type: 'separator' },
                // {role: 'services', submenu: []},
                // {type: 'separator'},
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
        // Edit menu
        template[1].submenu.push({ type: 'separator' }, {
            label: 'Speech',
            submenu: [
                { role: 'startspeaking' },
                { role: 'stopspeaking' }
            ]
        });
        // Window menu
        template[3].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }
    return template;
}
function loadExternal(url) {
    electron_1.shell.openExternal(url);
}
//# sourceMappingURL=desktop-app.js.map