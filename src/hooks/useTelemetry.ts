import { useEffect } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';
import type { TelemetryData } from '../types/telemetry';

export const useTelemetryListener = () => {
    const updateTelemetry = useTelemetryStore((state) => state.updateTelemetry);
    const setConnectionStatus = useTelemetryStore((state) => state.setConnectionStatus);

    useEffect(() => {
        if (!window.electronAPI) return;

        const removeListener = window.electronAPI.onMessage('telemetry-update', (_event, data: TelemetryData) => {
            updateTelemetry(data);
            setConnectionStatus(true, data.game);
        });

        return () => {
            removeListener();
            setConnectionStatus(false);
        };
    }, [updateTelemetry, setConnectionStatus]);
};
