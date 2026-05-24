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
// Disabled as we use electron-builder with NSIS
// if (process.platform === 'win32') {
//     if (require('electron-squirrel-startup')) {
//         app.quit();
//     }
// }

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
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

    ipcMain.handle('export-session-csv', async (event, sessionId: number) => {
        
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Export Session CSV (ML-Ready)',
            defaultPath: `session-${sessionId}.csv`,
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });

        if (canceled || !filePath) return { success: false, message: 'Cancelled' };

        try {
            // Fetch session metadata
            const sessionStmt = db.prepare(
                'SELECT game, track, vehicle, start_time, end_time, duration, distance_traveled, avg_speed, top_speed, score, notes, coast_time, fuel_used, efficiency FROM sessions WHERE id = ?'
            );
            const sessionMeta = sessionStmt.get(sessionId) as any;

            // Fetch all telemetry rows
            const stmt = db.prepare('SELECT * FROM telemetry WHERE session_id = ? ORDER BY timestamp ASC');
            const data = stmt.all(sessionId) as any[];

            if (data.length === 0) return { success: false, message: 'No telemetry data found for this session' };

            // --- Build CSV with session metadata header ---
            const lines: string[] = [];

            // Metadata header rows (commented with # for Pandas skiprows compatibility)
            if (sessionMeta) {
                lines.push(`# session_id,${sessionId}`);
                lines.push(`# game,${sessionMeta.game || 'unknown'}`);
                lines.push(`# track,${sessionMeta.track || 'unknown'}`);
                lines.push(`# vehicle,${sessionMeta.vehicle || 'unknown'}`);
                lines.push(`# start_time,${sessionMeta.start_time}`);
                lines.push(`# end_time,${sessionMeta.end_time || ''}`);
                lines.push(`# duration_ms,${sessionMeta.duration || ''}`);
                lines.push(`# distance_traveled_m,${sessionMeta.distance_traveled || ''}`);
                lines.push(`# avg_speed_kmh,${sessionMeta.avg_speed || ''}`);
                lines.push(`# top_speed_kmh,${sessionMeta.top_speed || ''}`);
                lines.push(`# score,${sessionMeta.score || ''}`);
                lines.push(`# coast_time_ms,${sessionMeta.coast_time || ''}`);
                lines.push(`# fuel_used,${sessionMeta.fuel_used || ''}`);
                lines.push(`# efficiency,${sessionMeta.efficiency || ''}`);
                lines.push(`# notes,${(sessionMeta.notes || '').replace(/,/g, ';')}`);
                lines.push(`# exported_at,${new Date().toISOString()}`);
                lines.push(`# total_rows,${data.length}`);
                lines.push('#');
            }

            // Column headers: ALL columns except internal IDs, using EXACT DB names
            // Exclude session_id and id (internal), keep everything else
            const firstRow = data[0];
            const excludeCols = new Set(['session_id', 'id']);
            const columns = Object.keys(firstRow).filter(k => !excludeCols.has(k));
            lines.push(columns.join(','));

            // Data rows — preserve full float precision, no rounding
            for (const row of data) {
                const values = columns.map(col => {
                    const val = row[col];
                    if (val === null || val === undefined) return '';
                    if (typeof val === 'number') return String(val); // Full precision
                    if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                    return String(val);
                });
                lines.push(values.join(','));
            }

            const csvContent = lines.join('\n');
            await fs.promises.writeFile(filePath, csvContent, 'utf-8');

            return {
                success: true,
                message: `Exported ${data.length} rows × ${columns.length} columns to ${filePath}`,
                rowCount: data.length,
                columnCount: columns.length,
                columns: columns
            };
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

    let lastEmitTime = 0;
    const EMIT_INTERVAL = 50; // 20Hz in ms (Reduced from 33ms/30Hz for performance)

    connectionManager.on('data', (data) => {
        sessionManager.processData(data);

        // Send to renderer with throttling
        const now = Date.now();
        if (now - lastEmitTime >= EMIT_INTERVAL) {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].webContents.send('telemetry-update', data);
            }
            lastEmitTime = now;
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

ipcMain.handle('update-simulation-transmission', (_, type: 'automatic' | 'manual') => {
    if (connectionManager) {
        connectionManager.setSimulationTransmission(type);
        return { success: true };
    }
    return { success: false, message: 'Connection manager not initialized' };
});

ipcMain.handle('update-simulation-behavior', (_, behavior: any) => {
    if (connectionManager) {
        connectionManager.setSimulationBehavior(behavior);
        return { success: true };
    }
    return { success: false, message: 'Connection manager not initialized' };
});

// Manual Session Control IPC
ipcMain.handle('start-session', (_event, meta?: { track?: string; vehicle?: string }) => {
    if (sessionManager) {
        sessionManager.beginManualSession(meta?.track, meta?.vehicle);
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
