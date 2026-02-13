export interface IElectronAPI {
    sendMessage: (channel: string, data: any) => void;
    onMessage: (channel: string, callback: (event: any, ...args: any[]) => void) => () => void;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getSessions: () => Promise<any[]>;
    getSessionTelemetry: (sessionId: number) => Promise<any[]>;
    exportSessionCSV: (sessionId: number) => Promise<{ success: boolean; message: string }>;
    toggleSimulationMode: (enabled: boolean) => Promise<{ success: boolean; message?: string }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
