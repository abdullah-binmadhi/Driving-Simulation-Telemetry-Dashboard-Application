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
    startSession: (params?: { track?: string; vehicle?: string }) => Promise<{ success: boolean; message?: string }>;
    stopSession: () => Promise<{ success: boolean; sessionId?: number; message?: string }>;
    updateSimulationTransmission: (type: 'automatic' | 'manual') => Promise<{ success: boolean; message?: string }>;
    updateSimulationBehavior: (behavior: string) => Promise<{ success: boolean; message?: string }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
