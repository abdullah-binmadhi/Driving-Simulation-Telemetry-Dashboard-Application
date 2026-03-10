import { useEffect } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { TelemetryData } from '../types/telemetry';

export const useTelemetryListener = () => {
    const updateTelemetry = useTelemetryStore((state) => state.updateTelemetry);
    const setConnectionStatus = useTelemetryStore((state) => state.setConnectionStatus);
    const isSimMode = useSettingsStore((state) => state.game.simulationEnabled);

    useEffect(() => {
        if (window.electronAPI) {
            const removeListener = window.electronAPI.onMessage('telemetry-update', (_event, data: TelemetryData) => {
                updateTelemetry(data);
                setConnectionStatus(true, data.game);
            });

            return () => {
                removeListener();
                setConnectionStatus(false, '');
            };
        } else {
            // Browser Fallback logic
            if (isSimMode) {
                import('../utils/browserSimulator').then(({ browserSimulator }) => {
                    browserSimulator.start();
                });
                return () => {
                    import('../utils/browserSimulator').then(({ browserSimulator }) => {
                        browserSimulator.stop();
                    });
                };
            }
        }
    }, [updateTelemetry, setConnectionStatus, isSimMode]);
};
