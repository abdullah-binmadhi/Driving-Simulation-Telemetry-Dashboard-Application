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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const signalSign = (value: number) => (Math.abs(value) < 0.001 ? 0 : Math.sign(value));

const enrichTelemetry = (incoming: TelemetryData, previous: TelemetryData | null): TelemetryData => {
    const data: TelemetryData = {
        ...incoming,
        steering: clamp(Math.abs(incoming.steering) > 1 ? incoming.steering / 450 : incoming.steering, -1, 1),
        throttle: clamp(incoming.throttle || 0, 0, 1),
        brake: clamp(incoming.brake || 0, 0, 1),
        clutch: clamp(incoming.clutch || 0, 0, 1),
    };

    const dt = previous ? (data.timestamp - previous.timestamp) / 1000 : 0;
    if (previous && dt > 0 && dt < 1) {
        data.throttleDelta = data.throttleDelta ?? ((data.throttle - previous.throttle) / dt);
        data.brakeDelta = data.brakeDelta ?? ((data.brake - previous.brake) / dt);
        data.steeringDelta = data.steeringDelta ?? ((data.steering - previous.steering) / dt);
        data.speedDelta = data.speedDelta ?? ((data.speed - previous.speed) / dt);
        data.jerkX = data.jerkX ?? (((data.gForceX || 0) - (previous.gForceX || 0)) / dt);
        data.jerkY = data.jerkY ?? (((data.gForceY || 0) - (previous.gForceY || 0)) / dt);
    } else {
        data.throttleDelta = data.throttleDelta ?? 0;
        data.brakeDelta = data.brakeDelta ?? 0;
        data.steeringDelta = data.steeringDelta ?? 0;
        data.speedDelta = data.speedDelta ?? 0;
        data.jerkX = data.jerkX ?? 0;
        data.jerkY = data.jerkY ?? 0;
    }

    const speed = Math.max(0, data.speed || 0);
    const speedMS = speed / 3.6;
    const steeringAbs = Math.abs(data.steering);
    const latG = data.gForceX || 0;
    const latGAbs = Math.abs(latG);
    const longGAbs = Math.abs(data.gForceY || 0);
    const expectedLatG = clamp(steeringAbs * (0.35 + speed / 85), 0, 2.4);
    const responseRatio = expectedLatG > 0.08 ? latGAbs / expectedLatG : 1;
    const activeCorner = speed > 18 && steeringAbs > 0.08;
    const counterSteer =
        activeCorner &&
        signalSign(data.steering) !== 0 &&
        signalSign(latG) !== 0 &&
        signalSign(data.steering) !== signalSign(latG);
    const yawRateAbs = Math.abs(data.yawRate || 0);
    const expectedYawRate = steeringAbs * Math.max(0.08, speedMS / 38);

    const understeerRaw = activeCorner && steeringAbs > 0.28
        ? clamp(
            (0.72 - responseRatio) * 1.7 +
            (steeringAbs - 0.45) * 0.9 +
            (data.throttle > 0.35 ? 0.15 : 0) +
            (yawRateAbs > 0 && yawRateAbs < expectedYawRate * 0.55 ? 0.25 : 0),
            0,
            1
        )
        : 0;

    const oversteerRaw = activeCorner && latGAbs > 0.28
        ? clamp(
            (counterSteer ? 0.55 : 0) +
            (responseRatio - 1.35) * 0.75 +
            (yawRateAbs > expectedYawRate * 1.45 ? 0.3 : 0) +
            (longGAbs > 0.35 && data.brake > 0.05 ? 0.12 : 0),
            0,
            1
        )
        : 0;

    data.gforceCombined = data.gforceCombined ?? Math.sqrt(latGAbs ** 2 + longGAbs ** 2);
    data.slipAngleEstimate = clamp(Math.atan2(latGAbs, longGAbs + 0.001) * (180 / Math.PI), 0, 90);
    data.isCoasting = data.isCoasting ?? (data.throttle < 0.05 && data.brake < 0.05 && speed > 5 ? 1 : 0);
    data.isWots = data.isWots ?? (data.throttle > 0.95 ? 1 : 0);
    data.isBraking = data.isBraking ?? (data.brake > 0.05 ? 1 : 0);
    data.isTurning = data.isTurning ?? (activeCorner ? 1 : 0);
    data.isTrailBraking = data.isTrailBraking ?? (data.brake > 0.08 && steeringAbs > 0.12 && speed > 20 ? 1 : 0);
    data.pedalOverlap = data.pedalOverlap ?? (data.throttle * data.brake);
    data.turnRadius = data.turnRadius ?? (latGAbs > 0.04 ? speedMS ** 2 / (latGAbs * 9.81) : 0);
    data.brakeBiasUtilization = data.brakeBiasUtilization ?? (data.brake > 0 ? clamp(data.brake / (speedMS / 30 + 0.1), 0, 1) : 0);
    data.oversteerCorrection = Math.max(oversteerRaw, (previous?.oversteerCorrection || 0) * 0.78);
    data.understeerPlough = Math.max(understeerRaw, (previous?.understeerPlough || 0) * 0.78);

    return data;
};

export const useTelemetryStore = create<TelemetryState>((set) => ({
    data: null,
    isConnected: false,
    activeGame: null,
    history: [],
    updateTelemetry: (incoming) => set((state) => {
        const data = enrichTelemetry(incoming, state.data);
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
