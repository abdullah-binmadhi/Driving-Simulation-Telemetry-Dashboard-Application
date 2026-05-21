import dgram from 'dgram';
import { EventEmitter } from 'events';
import { TelemetryData } from '../../src/types/telemetry.js';

// ──────────────────────────────────────────────────────────────────────────────
// BeamNG.drive Telemetry Connector (V2 - High Fidelity)
//
// Uses three concurrent UDP sockets:
//   • Custom Bridge (port 4440) – JSON-based deep telemetry (Tires, Health, etc.)
//   • OutGauge      (port 4444) – instrument cluster data
//   • OutSim        (port 4442) – physics data
//
// HOW TO ENABLE HIGH-FIDELITY TIRES/HEALTH:
// 1. Copy 'telemetry.lua' to your BeamNG vehicle extensions folder.
// 2. Load it in-game via 'v.extensions.load("telemetry")'.
// ──────────────────────────────────────────────────────────────────────────────

const G = 9.80665; // m/s² per G

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const numberOrUndefined = (value: unknown): number | undefined => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeArray = (value: unknown, fallback: [number, number, number, number]): [number, number, number, number] => {
    if (!Array.isArray(value)) return fallback;

    return [0, 1, 2, 3].map((index) => {
        const numberValue = numberOrUndefined(value[index]);
        return numberValue ?? fallback[index];
    }) as [number, number, number, number];
};

const normalizeHealth = (value: unknown, fallback = 1): number => {
    const numberValue = numberOrUndefined(value) ?? fallback;
    return clamp(numberValue > 1 ? numberValue / 100 : numberValue, 0, 1);
};

const normalizeSteering = (value: unknown): number | undefined => {
    const numberValue = numberOrUndefined(value);
    if (numberValue === undefined) return undefined;

    // Bridge v1 used BeamNG's steering-wheel degrees. The app expects -1..1.
    if (Math.abs(numberValue) > 1) {
        return clamp(numberValue / 450, -1, 1);
    }

    return clamp(numberValue, -1, 1);
};

interface OutGaugeState {
    speed: number;       // km/h
    rpm: number;
    gear: number;
    throttle: number;
    brake: number;
    clutch: number;
    fuel: number;
    engineTemp: number;
}

interface OutSimState {
    posX: number;
    posY: number;
    posZ: number;
    velX: number;
    velY: number;
    velZ: number;
    accX: number;
    accY: number;
    accZ: number;
    yaw: number;
    yawRate: number;
    pitch: number;
    roll: number;
}

export class BeamNGConnector extends EventEmitter {
    public readonly name = 'BeamNG.drive';

    private outGaugeSocket: dgram.Socket | null = null;
    private outSimSocket: dgram.Socket | null = null;
    private bridgeSocket: dgram.Socket | null = null;

    private readonly outGaugePort: number;
    private readonly outSimPort: number;
    private readonly bridgePort: number;

    private isConnected = false;

    // Standard states
    private gaugeState: OutGaugeState = {
        speed: 0, rpm: 0, gear: 0,
        throttle: 0, brake: 0, clutch: 0,
        fuel: 0, engineTemp: 80,
    };

    private simState: OutSimState = {
        posX: 0, posY: 0, posZ: 0,
        velX: 0, velY: 0, velZ: 0,
        accX: 0, accY: 0, accZ: 0,
        yaw: 0, yawRate: 0, pitch: 0, roll: 0,
    };

    // High Fidelity State (from Lua bridge)
    private bridgeState: Partial<TelemetryData> | null = null;
    private lastBridgeUpdate = 0;
    private emitInterval: NodeJS.Timeout | null = null;
    private lastMotionFrame: TelemetryData | null = null;

    constructor(outGaugePort = 4444, outSimPort = 4442, bridgePort = 4440) {
        super();
        this.outGaugePort = outGaugePort;
        this.outSimPort = outSimPort;
        this.bridgePort = bridgePort;
    }

    start() {
        this.startSocket('outGauge', this.outGaugePort);
        this.startSocket('outSim', this.outSimPort);
        this.startSocket('bridge', this.bridgePort);

        // Start ML synchronized emitter (60Hz = ~16ms) to ensure perfectly timestamped frames
        this.emitInterval = setInterval(() => {
            if (this.isConnected) {
                this.emit('data', this.buildFrame());
            }
        }, 16);
    }

    stop() {
        this.closeSocket('outGauge');
        this.closeSocket('outSim');
        this.closeSocket('bridge');

        if (this.emitInterval) {
            clearInterval(this.emitInterval);
            this.emitInterval = null;
        }

        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    private startSocket(type: 'outGauge' | 'outSim' | 'bridge', port: number) {
        let socketKey: 'outGaugeSocket' | 'outSimSocket' | 'bridgeSocket';
        if (type === 'outGauge') socketKey = 'outGaugeSocket';
        else if (type === 'outSim') socketKey = 'outSimSocket';
        else socketKey = 'bridgeSocket';

        if (this[socketKey]) {
            try { (this[socketKey] as dgram.Socket).close(); } catch { /* ignore */ }
        }

        const socket = dgram.createSocket('udp4');
        this[socketKey] = socket;

        socket.on('error', (err) => {
            console.error(`BeamNG ${type} error:\n${err.stack}`);
            this.emit('status', 'error');
        });

        socket.on('message', (msg) => {
            if (!this.isConnected) {
                this.isConnected = true;
                this.emit('status', 'connected');
            }

            try {
                if (type === 'outGauge') {
                    this.parseOutGauge(msg);
                } else if (type === 'outSim') {
                    this.parseOutSim(msg);
                } else if (type === 'bridge') {
                    this.parseBridge(msg);
                }
            } catch (e) {
                console.error(`Error parsing BeamNG ${type} packet:`, e);
            }
        });

        socket.on('listening', () => {
            console.log(`BeamNG ${type} listening on port ${port}`);
        });

        try {
            socket.bind(port);
        } catch (e) {
            console.error(`Failed to bind BeamNG ${type} socket on port ${port}`);
        }
    }

    private closeSocket(type: 'outGauge' | 'outSim' | 'bridge') {
        let socketKey: 'outGaugeSocket' | 'outSimSocket' | 'bridgeSocket';
        if (type === 'outGauge') socketKey = 'outGaugeSocket';
        else if (type === 'outSim') socketKey = 'outSimSocket';
        else socketKey = 'bridgeSocket';

        if (this[socketKey]) {
            try { (this[socketKey] as dgram.Socket).close(); } catch { /* ignore */ }
            this[socketKey] = null;
        }
    }

    private parseOutGauge(buffer: Buffer): void {
        if (buffer.length < 96) return;
        const rawGear = buffer.readInt8(10);
        const gear = rawGear === 0 ? -1 : rawGear - 1;
        const speed = buffer.readFloatLE(12) * 3.6;
        const rpm = buffer.readFloatLE(16);
        const engTemp = buffer.readFloatLE(24);
        const fuel = buffer.readFloatLE(28);
        const throttle = buffer.readFloatLE(48);
        const brake = buffer.readFloatLE(52);
        const clutch = buffer.readFloatLE(56);

        this.gaugeState = { speed, rpm, gear, throttle, brake, clutch, fuel, engineTemp: engTemp };
    }

    private parseOutSim(buffer: Buffer): void {
        if (buffer.length < 64) return;
        const offset = buffer.subarray(0, 4).toString('ascii') === 'BNG1' ? 4 : 0;

        const posX = buffer.readFloatLE(offset + 0);
        const posY = buffer.readFloatLE(offset + 4);
        const posZ = buffer.readFloatLE(offset + 8);
        const velX = buffer.readFloatLE(offset + 12);
        const velY = buffer.readFloatLE(offset + 16);
        const velZ = buffer.readFloatLE(offset + 20);
        const accX = buffer.readFloatLE(offset + 24);
        const accY = buffer.readFloatLE(offset + 28);
        const accZ = buffer.readFloatLE(offset + 32);
        const roll = buffer.length >= offset + 52 ? buffer.readFloatLE(offset + 48) : 0;
        const pitch = buffer.length >= offset + 56 ? buffer.readFloatLE(offset + 52) : 0;
        const yaw = buffer.length >= offset + 60 ? buffer.readFloatLE(offset + 56) : 0;
        const yawRate = buffer.length >= offset + 72 ? buffer.readFloatLE(offset + 68) : 0;

        this.simState = { posX, posY, posZ, velX, velY, velZ, accX, accY, accZ, yaw, yawRate, pitch, roll };
    }

    private parseBridge(buffer: Buffer): void {
        try {
            const data = JSON.parse(buffer.toString());
            this.bridgeState = this.normalizeBridgeData(data);
            this.lastBridgeUpdate = Date.now();
        } catch (e) {
            // Silently fail if JSON is malformed
        }
    }

    private normalizeBridgeData(data: Record<string, unknown>): Partial<TelemetryData> {
        const normalized: Partial<TelemetryData> = { ...data, bridgeActive: true } as Partial<TelemetryData>;

        const steering = normalizeSteering(data.steering ?? data.steeringInput ?? data.steering_input);
        if (steering !== undefined) normalized.steering = steering;

        normalized.throttle = clamp(numberOrUndefined(data.throttle ?? data.throttleInput ?? data.throttle_input) ?? this.gaugeState.throttle, 0, 1);
        normalized.brake = clamp(numberOrUndefined(data.brake ?? data.brakeInput ?? data.brake_input) ?? this.gaugeState.brake, 0, 1);
        normalized.clutch = clamp(numberOrUndefined(data.clutch ?? data.clutchInput ?? data.clutch_input) ?? this.gaugeState.clutch, 0, 1);

        normalized.tireTemp = normalizeArray(data.tireTemp ?? data.tireTemps ?? data.tire_temps, [0, 0, 0, 0]);
        normalized.tireSurfaceTemp = normalizeArray(data.tireSurfaceTemp ?? data.tireSurfaceTemps ?? data.tire_surface, [0, 0, 0, 0]);
        normalized.tireWear = normalizeArray(data.tireWear ?? data.tire_wear, [1, 1, 1, 1])
            .map((value) => normalizeHealth(value)) as [number, number, number, number];
        normalized.tirePressure = normalizeArray(data.tirePressure ?? data.tirePressures ?? data.tire_pressures, [0, 0, 0, 0])
            .map((value) => clamp(value, 0, 200)) as [number, number, number, number];

        const damage = data.carDamage as Partial<NonNullable<TelemetryData['carDamage']>> | undefined;
        if (damage) {
            normalized.carDamage = {
                engine: normalizeHealth(damage.engine),
                transmission: normalizeHealth(damage.transmission),
                suspension: normalizeHealth(damage.suspension),
                brakes: normalizeHealth(damage.brakes),
                aero: normalizeHealth(damage.aero),
            };
        }

        return normalized;
    }

    private buildFrame(): TelemetryData {
        const { speed, rpm, gear, throttle, brake, clutch, fuel, engineTemp } = this.gaugeState;
        const { posX, posY, posZ, velX, velZ, accX, accY, accZ, yaw, yawRate } = this.simState;

        // Base Frame
        const frame: TelemetryData = {
            game: 'BeamNG.drive',
            timestamp: Date.now(),
            bridgeActive: false,
            speed,
            rpm,
            gear,
            throttle,
            brake,
            clutch,
            steering: clamp(velX / (Math.abs(velZ) + 0.1), -1, 1), // fallback estimate
            gForceX: accX / G,
            gForceY: -accZ / G,
            gForceZ: (accY + G) / G,
            engineTemp,
            fuel,
            posX,
            posY,
            posZ,
            yaw,
            yawRate,
        };

        // If high-fidelity bridge is active (within 1 second), override/enrich data
        if (this.bridgeState && Date.now() - this.lastBridgeUpdate < 1000) {
            Object.assign(frame, this.bridgeState);
            // Ensure timestamp is current system time even if bridge sends game time
            frame.timestamp = Date.now();
        }

        this.enrichMotion(frame);
        return frame;
    }

    private enrichMotion(frame: TelemetryData) {
        const previous = this.lastMotionFrame;
        const dt = previous ? (frame.timestamp - previous.timestamp) / 1000 : 0;
        const speedMS = Math.max(0, frame.speed || 0) / 3.6;

        let longitudinalG = frame.gForceY || 0;
        let lateralG = frame.gForceX || 0;
        let verticalG = frame.gForceZ || 0;
        let yawRate = frame.yawRate || 0;

        if (previous && dt > 0 && dt < 1) {
            const previousSpeedMS = Math.max(0, previous.speed || 0) / 3.6;
            const speedDerivedLongG = (speedMS - previousSpeedMS) / dt / G;
            if (Math.abs(longitudinalG) < 0.005 && Math.abs(speedDerivedLongG) > 0.005) {
                longitudinalG = speedDerivedLongG;
            }

            if (Math.abs(yawRate) < 0.001 && frame.yaw !== undefined && previous.yaw !== undefined) {
                let yawDelta = frame.yaw - previous.yaw;
                if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
                if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
                yawRate = yawDelta / dt;
                frame.yawRate = yawRate;
            }
        }

        const yawDerivedLatG = yawRate * speedMS / G;
        if (Math.abs(lateralG) < 0.005 && Math.abs(yawDerivedLatG) > 0.005) {
            lateralG = yawDerivedLatG;
        }

        if (Math.abs(lateralG) < 0.005 && Math.abs(frame.steering) > 0.03 && frame.speed > 8) {
            lateralG = clamp(frame.steering * Math.pow(frame.speed / 85, 2) * 1.35, -2.5, 2.5);
        }

        if (Math.abs(verticalG) < 0.005) {
            verticalG = 1;
        }

        frame.gForceX = lateralG;
        frame.gForceY = longitudinalG;
        frame.gForceZ = verticalG;
        frame.gforceCombined = Math.sqrt(lateralG ** 2 + longitudinalG ** 2);
        frame.slipAngleEstimate = clamp(Math.atan2(Math.abs(lateralG), Math.abs(longitudinalG) + 0.001) * (180 / Math.PI), 0, 90);
        frame.actualSlipRatio = frame.actualSlipRatio ?? clamp(
            Math.abs(lateralG) * 0.08 +
            Math.max(0, frame.throttle - 0.6) * 0.05 +
            Math.max(0, frame.brake - 0.5) * 0.04,
            0,
            1
        );

        this.lastMotionFrame = { ...frame };
    }
}
