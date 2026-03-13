import { create } from 'zustand';
import type { TelemetryData } from '../types/telemetry';

interface MultiTraceDataPoint {
    timestamp: number;
    speed: number;
    rpm: number;
    throttle: number; // 0-100%
    brake: number;    // 0-100%
}

interface TelemetryState {
    data: TelemetryData | null;
    isConnected: boolean;
    activeGame: string | null;
    history: MultiTraceDataPoint[];
    updateTelemetry: (data: TelemetryData) => void;
    setConnectionStatus: (status: boolean, game?: string) => void;
    resetHistory: () => void;
}

const MAX_HISTORY = 100;
const HISTORY_THROTTLE = 100; // 10Hz
let lastHistoryUpdate = 0;

export const useTelemetryStore = create<TelemetryState>((set) => ({
    data: null,
    isConnected: false,
    activeGame: null,
    history: [],
    updateTelemetry: (data) => set((state) => {
        const now = Date.now();
        let newHistory = state.history;

        if (now - lastHistoryUpdate >= HISTORY_THROTTLE) {
            newHistory = [...state.history, {
                timestamp: data.timestamp,
                speed: data.speed,
                rpm: data.rpm,
                throttle: data.throttle * 100,
                brake: data.brake * 100
            }];
            if (newHistory.length > MAX_HISTORY) {
                newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
            }
            lastHistoryUpdate = now;
        }

        return { data, history: newHistory };
    }),
    setConnectionStatus: (isConnected, activeGame) => set({ isConnected, activeGame: activeGame || null }),
    resetHistory: () => set({ history: [] })
}));
