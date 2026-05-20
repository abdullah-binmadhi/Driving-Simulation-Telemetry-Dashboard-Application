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
    heading: number;
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
        heading: 0, pitch: 0, roll: 0,
    };

    // High Fidelity State (from Lua bridge)
    private bridgeState: Partial<TelemetryData> | null = null;
    private lastBridgeUpdate = 0;
    private emitInterval: NodeJS.Timeout | null = null;

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
        if (buffer.length < 60) return;
        let offset = 0;
        if (buffer.readUInt32LE(0) < 10_000_000 && buffer.length >= 64) offset = 4;

        const posX = buffer.readFloatLE(offset + 0);
        const posY = buffer.readFloatLE(offset + 4);
        const posZ = buffer.readFloatLE(offset + 8);
        const velX = buffer.readFloatLE(offset + 12);
        const velY = buffer.readFloatLE(offset + 16);
        const velZ = buffer.readFloatLE(offset + 20);
        const accX = buffer.readFloatLE(offset + 36);
        const accY = buffer.readFloatLE(offset + 40);
        const accZ = buffer.readFloatLE(offset + 44);
        const heading = buffer.length >= offset + 52 ? buffer.readFloatLE(offset + 48) : 0;
        const pitch = buffer.length >= offset + 56 ? buffer.readFloatLE(offset + 52) : 0;
        const roll = buffer.length >= offset + 60 ? buffer.readFloatLE(offset + 56) : 0;

        this.simState = { posX, posY, posZ, velX, velY, velZ, accX, accY, accZ, heading, pitch, roll };
    }

    private parseBridge(buffer: Buffer): void {
        try {
            const data = JSON.parse(buffer.toString());
            this.bridgeState = data;
            this.lastBridgeUpdate = Date.now();
        } catch (e) {
            // Silently fail if JSON is malformed
        }
    }

    private buildFrame(): TelemetryData {
        const { speed, rpm, gear, throttle, brake, clutch, fuel, engineTemp } = this.gaugeState;
        const { posX, posY, posZ, velX, velZ, accX, accY, accZ } = this.simState;

        // Base Frame
        const frame: TelemetryData = {
            game: 'BeamNG.drive',
            timestamp: Date.now(),
            speed,
            rpm,
            gear,
            throttle,
            brake,
            clutch,
            steering: Math.max(-1, Math.min(1, velX / (Math.abs(velZ) + 0.1))), // fallback estimate
            gForceX: accX / G,
            gForceY: -accZ / G,
            gForceZ: (accY + G) / G,
            engineTemp,
            fuel,
            posX,
            posY,
            posZ,
        };

        // If high-fidelity bridge is active (within 1 second), override/enrich data
        if (this.bridgeState && Date.now() - this.lastBridgeUpdate < 1000) {
            Object.assign(frame, this.bridgeState);
            // Ensure timestamp is current system time even if bridge sends game time
            frame.timestamp = Date.now();
        }

        return frame;
    }
}
