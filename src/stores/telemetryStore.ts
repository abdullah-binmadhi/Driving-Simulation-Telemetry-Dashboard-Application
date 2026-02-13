import { create } from 'zustand';
import { TelemetryData } from '../types/telemetry';

interface TelemetryState {
    data: TelemetryData | null;
    isConnected: boolean;
    activeGame: string | null;
    updateTelemetry: (data: TelemetryData) => void;
    setConnectionStatus: (status: boolean, game?: string) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
    data: null,
    isConnected: false,
    activeGame: null,
    updateTelemetry: (data) => set({ data }),
    setConnectionStatus: (isConnected, activeGame) => set({ isConnected, activeGame }),
}));

// Setup listener in a separate file or hook, but for now we can't put side effects in store definition easily.
// We'll use a hook `useTelemetryListener` in the component tree.
