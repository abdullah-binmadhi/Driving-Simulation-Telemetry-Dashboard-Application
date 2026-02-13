import { useEffect } from 'react';
import { useTelemetryStore } from '../stores/telemetryStore';
import { TelemetryData } from '../types/telemetry';

export const useTelemetryListener = () => {
    const updateTelemetry = useTelemetryStore((state) => state.updateTelemetry);
    const setConnectionStatus = useTelemetryStore((state) => state.setConnectionStatus);

    useEffect(() => {
        if (!window.electronAPI) return;

        const removeListener = window.electronAPI.onMessage('telemetry-update', (event, data: TelemetryData) => {
            updateTelemetry(data);
            setConnectionStatus(true, data.game);
        });

        return () => {
            removeListener();
        };
    }, [updateTelemetry, setConnectionStatus]);
};
