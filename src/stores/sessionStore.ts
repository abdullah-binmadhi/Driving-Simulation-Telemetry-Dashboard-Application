import { create } from 'zustand';

export interface Session {
    id: number;
    game: string;
    vehicle: string;
    start_time: number;
    end_time: number;
    duration: number;
    score: number;
    notes: string;
    coast_time?: number;
    fuel_used?: number;
    efficiency?: number;
    distance_traveled?: number;
}

interface SessionState {
    sessions: Session[];
    selectedSession: Session | null;
    telemetryLogs: any[]; // Replace 'any' with TelemetryData if available
    isLoading: boolean;
    loadSessions: () => Promise<void>;
    selectSession: (session: Session) => void;
    exportSession: (sessionId: number) => Promise<{ success: boolean; message: string }>;
}

// Mock data for now, will replace with IPC calls to DB
const mockSessions: Session[] = [
    {
        id: 1,
        game: 'BeamNG.drive',
        vehicle: 'ETK K-Series',
        start_time: Date.now() - 3600000,
        end_time: Date.now() - 3000000,
        duration: 600000,
        score: 85,
        notes: 'Test session'
    }
];

export const useSessionStore = create<SessionState>((set) => ({
    sessions: [],
    selectedSession: null,
    telemetryLogs: [],
    isLoading: false,
    loadSessions: async () => {
        set({ isLoading: true });
        try {
            if (window.electronAPI) {
                const sessions = await window.electronAPI.getSessions();
                set({ sessions, isLoading: false });
            } else {
                // Fallback for non-Electron env (dev in browser)
                set({ sessions: mockSessions, isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load sessions', error);
            set({ isLoading: false });
        }
    },
    selectSession: async (session) => {
        set({ selectedSession: session, telemetryLogs: [] }); // Clear previous logs
        if (session && window.electronAPI) {
            try {
                const logs = await window.electronAPI.getSessionTelemetry(session.id);
                set({ telemetryLogs: logs });
            } catch (error) {
                console.error('Failed to load session logs', error);
            }
        }
    },
    exportSession: async (sessionId) => {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.exportSessionCSV(sessionId);
                return result;
            } catch (error) {
                console.error('Failed to export session', error);
                return { success: false, message: 'Export failed' };
            }
        }
        return { success: false, message: 'Electron API not available' };
    },
}));
