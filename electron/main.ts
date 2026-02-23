import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db, { initDatabase } from './database/db.js';
import { ConnectionManager } from './game-connectors/connection-manager.js';
import { SessionManager } from './session-manager.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    if (require('electron-squirrel-startup')) {
        app.quit();
    }
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
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

    ipcMain.handle('get-session-telemetry', async (_, sessionId: number) => {
        const stmt = db.prepare('SELECT * FROM telemetry WHERE session_id = ? ORDER BY timestamp ASC');
        return stmt.all(sessionId);
    });

    ipcMain.handle('export-session-csv', async (_, sessionId: number) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export Session CSV',
            defaultPath: `session-${sessionId}.csv`,
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });

        if (canceled || !filePath) return { success: false, message: 'Cancelled' };

        try {
            const stmt = db.prepare('SELECT * FROM telemetry WHERE session_id = ? ORDER BY timestamp ASC');
            const data = stmt.all(sessionId) as any[];

            if (data.length === 0) return { success: false, message: 'No data found' };

            // Format timestamps for easier reading in CSV
            const formattedData = data.map(row => {
                const date = new Date(Number(row.timestamp));
                const timeStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
                return { ...row, timestamp: timeStr };
            });

            // Generate CSV manually
            const headers = Object.keys(formattedData[0]).join(',');
            const rows = formattedData.map(row => Object.values(row).join(','));
            const csvContent = [headers, ...rows].join('\n');

            await fs.promises.writeFile(filePath, csvContent, 'utf-8');
            return { success: true, message: 'Export successful' };
        } catch (error: any) {
            console.error('Export failed:', error);
            return { success: false, message: error.message };
        }
    });

    // and load the index.html of the app.
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// Global reference to prevent garbage collection and access from IPC
let connectionManager: ConnectionManager;
let sessionManager: SessionManager;

app.on('ready', () => {
    initDatabase();
    createWindow();

    // Start Connection Manager
    connectionManager = new ConnectionManager();
    sessionManager = new SessionManager();

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

// Simulation Mode IPC
ipcMain.handle('toggle-simulation-mode', (_, enabled: boolean) => {
    if (connectionManager) {
        connectionManager.setSimulationMode(enabled);
        return { success: true };
    }
    return { success: false, message: 'Connection manager not initialized' };
});

// Manual Session Control IPC
ipcMain.handle('start-session', () => {
    if (sessionManager) {
        sessionManager.beginManualSession();
        return { success: true };
    }
    return { success: false, message: 'Session manager not initialized' };
});

ipcMain.handle('stop-session', () => {
    if (sessionManager) {
        const id = sessionManager.stopSession();
        return { success: true, sessionId: id };
    }
    return { success: false, message: 'Session manager not initialized' };
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
