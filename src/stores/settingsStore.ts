import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameSettings {
    beamngPort: number;
    assettoCorsaEnabled: boolean;
    simulationEnabled: boolean;
    transmissionType: 'automatic' | 'manual';
    drivingBehavior: 'Drunk' | 'High' | 'Reckless' | 'Normal' | 'Slow' | 'New driver' | 'Professional';
}

interface AppSettings {
    theme: 'dark' | 'light';
    unitSystem: 'metric' | 'imperial';
}

interface DriverSettings {
    name: string;
    team: string;
    carNumber: string;
    carModel: string;
}

interface SessionSettings {
    trackName: string;
    sessionType: 'Practice' | 'Qualifying' | 'Race';
    weather: 'Sunny' | 'Rain' | 'Cloudy' | 'Night';
}

interface SettingsState {
    game: GameSettings;
    app: AppSettings;
    driver: DriverSettings;
    session: SessionSettings;
    updateGameSettings: (settings: Partial<GameSettings>) => void;
    updateAppSettings: (settings: Partial<AppSettings>) => void;
    updateDriverSettings: (settings: Partial<DriverSettings>) => void;
    updateSessionSettings: (settings: Partial<SessionSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            game: {
                beamngPort: 4444,
                assettoCorsaEnabled: true,
                simulationEnabled: false,
                transmissionType: 'automatic',
                drivingBehavior: 'Normal',
            },
            app: {
                theme: 'dark',
                unitSystem: 'metric',
            },
            driver: {
                name: 'Driver 1',
                team: 'Racing Team',
                carNumber: '44',
                carModel: 'GT3 Cup',
            },
            session: {
                trackName: 'Silverstone',
                sessionType: 'Practice',
                weather: 'Sunny',
            },
            updateGameSettings: (settings) =>
                set((state) => ({
                    game: { ...state.game, ...settings },
                })),
            updateAppSettings: (settings) =>
                set((state) => ({
                    app: { ...state.app, ...settings },
                })),
            updateDriverSettings: (settings) =>
                set((state) => ({
                    driver: { ...state.driver, ...settings },
                })),
            updateSessionSettings: (settings) =>
                set((state) => ({
                    session: { ...state.session, ...settings },
                })),
        }),
        {
            name: 'driving-telemetry-settings',
        }
    )
);
