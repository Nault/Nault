const { app, BrowserWindow, shell, Menu } = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;

let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1000, height: 600});
  const options = { extraHeaders: "pragma: no-cache\n" };
  mainWindow.loadURL('https://nanovault.io', options);
  // mainWindow.loadURL('http://localhost:4200/');
  // TODO: Use environment to load config which holds the actual url to load for the app

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts
    Menu.setApplicationMenu(Menu.buildFromTemplate([
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
      }
    ]));
  }
}

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
  createWindow();
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});
