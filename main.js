const { app, BrowserWindow, shell, Menu, protocol, webFrame, ipcMain } = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;
const url = require('url');
const path = require('path');

// const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid');

app.setAsDefaultProtocolClient('nano'); // Register handler for nano: links

console.log(`Starting ledger@!`);

const ledger = require('./desktop-app/src/lib/ledger');

ledger.initialize();

// const Ledger = new ledger();

// Ledger.loadLedger();

let mainWindow;

// global['LedgerTransport'] = TransportNodeHid;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 600, webPreferences: { webSecurity: false } });
  // const options = { extraHeaders: "pragma: no-cache\n" };
  // mainWindow.loadURL('https://nanovault.io', options);
  mainWindow.loadURL('http://localhost:4200/');
  // mainWindow.loadURL(url.format({
  //   pathname: path.join(__dirname, 'dist/index.html'),
  //   protocol: 'file:',
  //   slashes: true
  // }));

  // mainWindow.LedgerTransport = TransportU2F;
  // mainWindow.webContents.

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });

  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  const menuTemplate = getApplicationMenu();

  // Create our menu entries so that we can use MAC shortcuts
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.on('ready', () => {
  // Once the app is ready, launch the wallet window
  createWindow();

  // Detect when the application has been loaded using an nano: link, send it to the wallet to load
  app.on('open-url', (event, path) => {
    if (!mainWindow) {
      createWindow();
    }
    if (!mainWindow.webContents.isLoading()) {
      mainWindow.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('protocol-load', { detail: '${path}' }));`);
    }
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('protocol-load', { detail: '${path}' }));`);
    });
    event.preventDefault();
  });

  // Check for any updates on GitHub
  checkForUpdates();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify()
    .then(() => {})
    .catch(console.log);
}

// Build up the menu bar options based on platform
function getApplicationMenu() {
  const template = [
    {
      label: 'Edit',
      submenu: [
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {role: 'pasteandmatchstyle'},
        {role: 'delete'},
        {role: 'selectall'}
      ]
    },
    {
      label: 'View',
      submenu: [
        {role: 'reload'},
        {role: 'forcereload'},
        {role: 'toggledevtools'},
        {type: 'separator'},
        {role: 'resetzoom'},
        {role: 'zoomin'},
        {role: 'zoomout'},
        {type: 'separator'},
        {role: 'togglefullscreen'}
      ]
    },
    {
      role: 'window',
      submenu: [
        {role: 'minimize'},
        {role: 'close'}
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'View GitHub',
          click () { loadExternal('https://github.com/BitDesert/Nault') }
        },
        {
          label: 'Submit Issue',
          click () { loadExternal('https://github.com/BitDesert/Nault/issues/new') }
        },
        {type: 'separator'},
        {
          type: 'normal',
          label: `Nault Version: ${autoUpdater.currentVersion}`,
        },
        {
          label: 'View Latest Updates',
          click () { loadExternal('https://github.com/BitDesert/Nault/releases') }
        },
        {type: 'separator'},
        {
          label: `Check for Updates...`,
          click (menuItem, browserWindow) {
            checkForUpdates();
          }
        },
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: 'Nault',
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
          label: `Check for Updates...`,
          click (menuItem, browserWindow) {
            checkForUpdates();
          }
        },
        {type: 'separator'},
        // {role: 'services', submenu: []},
        // {type: 'separator'},
        {role: 'hide'},
        {role: 'hideothers'},
        {role: 'unhide'},
        {type: 'separator'},
        {role: 'quit'}
      ]
    });

    // Edit menu
    template[1].submenu.push(
      {type: 'separator'},
      {
        label: 'Speech',
        submenu: [
          {role: 'startspeaking'},
          {role: 'stopspeaking'}
        ]
      }
    );

    // Window menu
    template[3].submenu = [
      {role: 'close'},
      {role: 'minimize'},
      {role: 'zoom'},
      {type: 'separator'},
      {role: 'front'}
    ];
  }

  return template;
}

function loadExternal(url) {
  shell.openExternal(url);
}
