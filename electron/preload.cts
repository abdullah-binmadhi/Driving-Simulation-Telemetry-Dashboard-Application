// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (channel: string, data: any) => ipcRenderer.send(channel, data),
    onMessage: (channel: string, func: (...args: any[]) => void) => {
        const subscription = (_event: any, ...args: any[]) => func(_event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => {
            ipcRenderer.removeListener(channel, subscription);
        };
    },
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    getSessions: () => ipcRenderer.invoke('get-sessions'),
    getSessionTelemetry: (sessionId: number) => ipcRenderer.invoke('get-session-telemetry', sessionId),
    exportSessionCSV: (sessionId: number) => ipcRenderer.invoke('export-session-csv', sessionId),
    toggleSimulationMode: (enabled: boolean) => ipcRenderer.invoke('toggle-simulation-mode', enabled),
    startSession: () => ipcRenderer.invoke('start-session'),
    stopSession: () => ipcRenderer.invoke('stop-session'),
    updateSimulationTransmission: (type: 'automatic' | 'manual') => ipcRenderer.invoke('update-simulation-transmission', type),
});
