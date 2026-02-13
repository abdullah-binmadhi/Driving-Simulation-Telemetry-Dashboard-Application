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
}

interface SessionState {
    sessions: Session[];
    selectedSession: Session | null;
    isLoading: boolean;
    loadSessions: () => Promise<void>;
    selectSession: (session: Session) => void;
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
    selectSession: (session) => set({ selectedSession: session }),
}));
