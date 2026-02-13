export interface IElectronAPI {
    sendMessage: (channel: string, data: any) => void;
    onMessage: (channel: string, callback: (event: any, ...args: any[]) => void) => () => void;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getSessions: () => Promise<any[]>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
