import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import db, { initDatabase } from './database/db.js';
import { ConnectionManager } from './game-connectors/connection-manager.js';
import { SessionManager } from './session-manager.js';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        frame: false, // Frameless window for custom title bar
        titleBarStyle: 'hidden',
    });

    // Window controls
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('window-close', () => mainWindow.close());

    // Database IPC
    ipcMain.handle('get-sessions', async () => {
        const stmt = db.prepare('SELECT * FROM sessions ORDER BY start_time DESC LIMIT 50');
        return stmt.all();
    });

    // and load the index.html of the app.
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    initDatabase();
    createWindow();

    // Start Connection Manager
    const connectionManager = new ConnectionManager();
    const sessionManager = new SessionManager();

    connectionManager.start();

    connectionManager.on('data', (data) => {
        sessionManager.processData(data);

        // Send to renderer
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send('telemetry-update', data);
        }
    });

    connectionManager.on('status', (status) => {
        console.log('Connection Status:', status);
        // Could send status to UI too
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
