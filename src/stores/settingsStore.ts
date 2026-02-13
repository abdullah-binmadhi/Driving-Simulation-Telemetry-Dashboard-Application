import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameSettings {
    beamngPort: number;
    assettoCorsaEnabled: boolean;
}

interface AppSettings {
    theme: 'dark' | 'light';
    unitSystem: 'metric' | 'imperial';
}

interface SettingsState {
    game: GameSettings;
    app: AppSettings;
    updateGameSettings: (settings: Partial<GameSettings>) => void;
    updateAppSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            game: {
                beamngPort: 4444,
                assettoCorsaEnabled: true,
            },
            app: {
                theme: 'dark',
                unitSystem: 'metric',
            },
            updateGameSettings: (settings) =>
                set((state) => ({
                    game: { ...state.game, ...settings },
                })),
            updateAppSettings: (settings) =>
                set((state) => ({
                    app: { ...state.app, ...settings },
                })),
        }),
        {
            name: 'driving-telemetry-settings',
        }
    )
);
