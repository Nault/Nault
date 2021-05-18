import 'babel-polyfill';

import { app, BrowserWindow, shell, Menu, screen, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as url from 'url';
import * as path from 'path';
import { initialize } from './lib/ledger';
import * as settings from 'electron-settings';
const log = require('electron-log');
// Don't want errors to display when checking for update
// Too annoying if there would be long-term problems with the source
// Error would pop up on every launch
let showUpdateErrors = false;
let saveTimeout = null;
let isDownloading = false;
const nano_schemes = ['nano', 'nanorep', 'nanoseed', 'nanokey', 'nanosign', 'nanoprocess'];

/**
 * By default, the logger writes logs to the following locations:
  on Linux: ~/.config/nault/logs/{process type}.log
  on macOS: ~/Library/Logs/nault/{process type}.log
  on Windows: %USERPROFILE%\AppData\Roaming\nault\logs\{process type}.log

  error, warn, info, verbose, debug, silly
 * */

 // determine log location
let logLocation = 'Unknown';
switch (process.platform) {
  case 'win32':
    logLocation = '%USERPROFILE%\\AppData\\Roaming\\nault\\logs\\main.log';
    break;
  case 'linux':
    logLocation = '~/.config/nault/logs/main.log';
    break;
  case 'darwin':
    logLocation = '~/Library/Logs/nault/main.log';
    break;
}

// Keep track of window size and position
function windowStateKeeper() {
  let window, windowState;
  let newWidth = 1000;
  let newHeight = 600;
  try {
    const mainScreen = screen.getPrimaryDisplay();
    const dimensions = mainScreen.size;
    newWidth = Math.max(newWidth, Math.round(dimensions.width * 0.8));
    newHeight = Math.max(newHeight, Math.round(dimensions.height * 0.85));
  } catch {log.warn('Could not calculate default screen size')}

  async function setBounds() {
    // Restore from appConfig
    if (settings.hasSync(`windowState.${'main'}`)) {
      windowState = settings.getSync(`windowState.${'main'}`);
      return;
    }
    // Default
    windowState = {
      x: undefined,
      y: undefined,
      width: newWidth,
      height: newHeight,
    };
  }
  function saveState() {
    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(
      () => {
        if (!windowState.isMaximized) {
          windowState = window.getBounds();
        }
        windowState.isMaximized = window.isMaximized();
        settings.setSync(`windowState.${'main'}`, windowState);
      },
      100
    );
  }
  function track(win) {
    window = win;
    ['resize', 'move'].forEach(event => {
      win.on(event, saveState);
    });
  }
  setBounds();
  return({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    isMaximized: windowState.isMaximized,
    track,
  });
}

class AppUpdater {
  constructor() {
    // We want the user to proactively download the install
    autoUpdater.autoDownload = false;
    autoUpdater.logger = log;

    autoUpdater.on('update-available', (event, releaseNotes, releaseName) => {
      if (isDownloading) return;
      const dialogOpts = {
        type: 'info',
        buttons: ['Update', 'Ask Later'],
        title: 'New Version',
        message: 'An update for Nault is available!',
        detail: 'Do you want to download and install it?'
      }

      isDownloading = true;
      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          showUpdateErrors = true; // enable errors
          autoUpdater.downloadUpdate();
        } else {
          isDownloading = false;
        }
      })
    })

    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
      autoUpdater.quitAndInstall(true, true);
    })

    autoUpdater.on('download-progress', (progressObj) => {
      sendStatusToWindow(progressObj);
    })

    autoUpdater.on('error', message => {
      log.error('There was a problem updating the application');
      log.error(message);
      isDownloading = false;

      if (!showUpdateErrors) {
        return;
      }
      mainWindow.setTitle(`Nault - ${autoUpdater.currentVersion}`); // reset title
      showUpdateErrors = false; // disable errors
      const dialogOpts = {
        type: 'error',
        buttons: ['OK'],
        title: 'Update Error',
        message: 'Something went wrong while downloading Nault.',
        detail: `You will be notified again on next start.\nMore details in the log at: ${logLocation}`
      }

      dialog.showMessageBox(dialogOpts).then((returnValue) => {})
    })
  }
}
new AppUpdater();

// Register handler for nano: links
if (process.platform === 'darwin') {
  nano_schemes.forEach((scheme) => app.setAsDefaultProtocolClient(scheme));
} else {
  const args = process.argv[1] ? [path.resolve(process.argv[1])] : [];
  nano_schemes.forEach((scheme) => app.setAsDefaultProtocolClient(scheme, process.execPath, args));
}

// Initialize Ledger device detection
initialize();

let mainWindow: BrowserWindow;

function createWindow () {
  // Get window state
  const mainWindowStateKeeper = windowStateKeeper();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: mainWindowStateKeeper.x,
    y: mainWindowStateKeeper.y,
    width: mainWindowStateKeeper.width,
    height: mainWindowStateKeeper.height,
    webPreferences:
    {
      webSecurity: false,
      devTools: true,
      nodeIntegration: true
    }
  });

  // Track window state
  mainWindowStateKeeper.track(mainWindow);

  // mainWindow.loadURL('http://localhost:4200/'); // Only use this for development
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '../../dist/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Detect link clicks to new windows and open them in the default browser
  mainWindow.webContents.on('new-window', function(e, externalurl) {
    e.preventDefault();
    shell.openExternal(externalurl);
  });

  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.setTitle(`Nault - ${autoUpdater.currentVersion}`);
  });

  const menuTemplate = getApplicationMenu();

  // Create our menu entries so that we can use MAC shortcuts
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function sendStatusToWindow(progressObj) {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + Math.round(progressObj.percent) + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';

  log.info(log_message);
  // sending message to ipcRenderer can be done as well but not sure where and how to display it
  // using the title bar instead
  // mainWindow.webContents.send('downloading', Math.round(progressObj.percent));
  mainWindow.setTitle(`Nault - ${autoUpdater.currentVersion} - Downloading Update: ${Math.round(progressObj.percent)} %`);
}

// run only one app
const appLock = app.requestSingleInstanceLock();

if (!appLock) {
  app.quit();
} else {
  app.on('ready', () => {
    // Once the app is ready, launch the wallet window
    createWindow();

    // on windows, handle deep links on launch
    if (process.platform === 'win32') {
      const deeplink = findDeeplink(process.argv);
      if (deeplink) handleDeeplink(deeplink);
    }

    // Check for any updates on GitHub
    checkForUpdates();
  });

  // Refocus the window if the user attempts to open Nault while it is already open
  app.on('second-instance', (event, argv, workingDirectory) => {
    if (mainWindow) {

      // Detect on windows when the application has been loaded using a nano: link, send it to the wallet to load
      if (process.platform === 'win32') {
        const deeplink = findDeeplink(argv);
        if (deeplink) handleDeeplink(deeplink);
      }

      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // Detect on macos when the application has been loaded using a nano: link, send it to the wallet to load
  app.on('will-finish-launching', () => {
    app.on('open-url', (event, eventpath) => {
      if (!mainWindow) {
        createWindow();
      }
      handleDeeplink(eventpath);
      event.preventDefault();
    });
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createWindow();
    }
  });
}

function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

// Build up the menu bar options based on platform
function getApplicationMenu() {
  const template: any = [
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
          label: 'Nault Help Docs',
          click () { loadExternal('https://docs.nault.cc/'); }
        },
        {
          label: 'Reddit (r/nanocurrency)',
          click () { loadExternal('https://www.reddit.com/r/nanocurrency'); }
        },
        {
          label: 'Discord (#nault)',
          click () { loadExternal('https://discord.nanocenter.org/'); }
        },
        {type: 'separator'},
        {
          label: 'View GitHub',
          click () { loadExternal('https://github.com/Nault/Nault'); }
        },
        {
          label: 'Submit a bug report',
          click () { loadExternal('https://github.com/Nault/Nault/issues/new'); }
        },
        {
          label: 'Release notes',
          click () { loadExternal('https://github.com/Nault/Nault/releases'); }
        },
        {type: 'separator'},
        {
          label: `Check for Updates`,
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
          label: `Check for Updates`,
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

function loadExternal(externalurl: string) {
  shell.openExternal(externalurl);
}

let deeplinkReady = false;
ipcMain.once('deeplink-ready', () => deeplinkReady = true);
function handleDeeplink(deeplink: string) {
  if (!deeplinkReady) {
    ipcMain.once('deeplink-ready', (e) => {
      mainWindow.webContents.send('deeplink', deeplink);
    });
  } else {
    mainWindow.webContents.send('deeplink', deeplink);
  }
}

function findDeeplink(argv: string[]) {
  const nano_scheme = new RegExp(`^(${nano_schemes.join('|')}):.+$`, 'g');
  return argv.find((s) => nano_scheme.test(s));
}
