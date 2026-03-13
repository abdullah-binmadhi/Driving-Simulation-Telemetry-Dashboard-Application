import dgram from 'dgram';
import { EventEmitter } from 'events';
import { TelemetryData } from '../../src/types/telemetry.js';

// ──────────────────────────────────────────────────────────────────────────────
// BeamNG.drive Telemetry Connector
//
// Uses two concurrent UDP sockets:
//   • OutGauge (port 4444) – instrument cluster data (RPM, speed, gear, pedals,
//                              fuel, engine temp)
//   • OutSim   (port 4442) – physics data (position, velocity, acceleration →
//                              G-forces, steering estimate)
//
// To enable in BeamNG.drive:
//   Options → Gameplay → OutGauge: IP 127.0.0.1 / Port 4444
//   Options → Gameplay → OutSim:   IP 127.0.0.1 / Port 4442
// ──────────────────────────────────────────────────────────────────────────────

const G = 9.80665; // m/s² per G

/**
 * OutGauge packet layout (LFS/BeamNG standard, 96 bytes):
 * Offset  Type    Field
 *   0     uint32  time
 *   4     char[4] car
 *   8     uint16  flags
 *  10     int8    gear   (0=R, 1=N, 2=1st…)
 *  11     int8    plid
 *  12     float   speed  (m/s)
 *  16     float   rpm
 *  20     float   turbo
 *  24     float   engTemp
 *  28     float   fuel   (0–1)
 *  32     float   oilPressure
 *  36     float   oilTemp
 *  40     uint32  dashLights
 *  44     uint32  showLights
 *  48     float   throttle (0–1)
 *  52     float   brake    (0–1)
 *  56     float   clutch   (0–1)
 *  60     char[16] display1
 *  76     char[16] display2
 *  92     int32   id
 */

/**
 * OutSim packet layout (BeamNG, 60 bytes minimum):
 * Offset  Type    Field
 *   0     float   posX   (world X, metres)
 *   4     float   posY   (world Y, metres)
 *   8     float   posZ   (world Z, metres)
 *  12     float   velX   (vehicle-local velocity X, m/s)
 *  16     float   velY   (vehicle-local velocity Y, m/s)
 *  20     float   velZ   (vehicle-local velocity Z, m/s)
 *  24     float   rotX   (angular velocity X, rad/s)
 *  28     float   rotY   (angular velocity Y, rad/s)
 *  32     float   rotZ   (angular velocity Z, rad/s)
 *  36     float   accX   (local acceleration X – lateral,   m/s²)
 *  40     float   accY   (local acceleration Y – vertical,  m/s²)
 *  44     float   accZ   (local acceleration Z – longitudinal, m/s²)
 *  48     float   heading (radians)
 *  52     float   pitch   (radians)
 *  56     float   roll    (radians)
 * (Some BeamNG versions append extra fields – we only read the first 60 bytes)
 */

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
    velX: number;        // lateral velocity (m/s)
    velY: number;        // vertical velocity (m/s)
    velZ: number;        // longitudinal velocity (m/s)
    accX: number;        // lateral acceleration (m/s²)
    accY: number;        // vertical acceleration (m/s²)
    accZ: number;        // longitudinal acceleration (m/s²)
    heading: number;     // rad
    pitch: number;       // rad
    roll: number;        // rad
}

export class BeamNGConnector extends EventEmitter {
    public readonly name = 'BeamNG.drive';

    private outGaugeSocket: dgram.Socket | null = null;
    private outSimSocket: dgram.Socket | null = null;

    private readonly outGaugePort: number;
    private readonly outSimPort: number;

    private isConnected = false;

    // Partial state from each source – merged every OutGauge tick
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

    // Steering estimation: track last two positions to derive heading change
    private prevVelX = 0;
    private prevVelZ = 0;

    constructor(outGaugePort = 4444, outSimPort = 4442) {
        super();
        this.outGaugePort = outGaugePort;
        this.outSimPort = outSimPort;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    start() {
        this.startSocket('outGauge', this.outGaugePort);
        this.startSocket('outSim', this.outSimPort);
    }

    stop() {
        this.closeSocket('outGauge');
        this.closeSocket('outSim');
        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    // ── Socket Management ─────────────────────────────────────────────────────

    private startSocket(type: 'outGauge' | 'outSim', port: number) {
        const socketKey = type === 'outGauge' ? 'outGaugeSocket' : 'outSimSocket';

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
                console.log(`BeamNG connected via ${type}`);
            }

            try {
                if (type === 'outGauge') {
                    this.parseOutGauge(msg);
                    // Emit a merged frame on every outGauge tick (instrument rate)
                    this.emit('data', this.buildFrame());
                } else {
                    this.parseOutSim(msg);
                    // outSim only updates the sim state cache – no separate emit
                }
            } catch (e) {
                console.error(`Error parsing BeamNG ${type} packet:`, e);
            }
        });

        socket.on('listening', () => {
            const addr = socket.address();
            console.log(`BeamNG ${type} listening on ${addr.address}:${addr.port}`);
            this.emit('status', 'listening');
        });

        try {
            socket.bind(port);
        } catch (e) {
            console.error(`Failed to bind BeamNG ${type} socket on port ${port}:`, e);
            this.emit('status', 'error');
        }
    }

    private closeSocket(type: 'outGauge' | 'outSim') {
        const socketKey = type === 'outGauge' ? 'outGaugeSocket' : 'outSimSocket';
        if (this[socketKey]) {
            try { (this[socketKey] as dgram.Socket).close(); } catch { /* ignore */ }
            this[socketKey] = null;
        }
    }

    // ── Packet Parsers ────────────────────────────────────────────────────────

    private parseOutGauge(buffer: Buffer): void {
        if (buffer.length < 96) return;

        const rawGear = buffer.readInt8(10);
        // LFS/BeamNG OutGauge: 0 = Reverse, 1 = Neutral, 2 = 1st gear…
        // Normalize to: -1 = R, 0 = N, 1 = 1st…
        const gear = rawGear === 0 ? -1 : rawGear - 1;

        const speed  = buffer.readFloatLE(12) * 3.6;  // m/s → km/h
        const rpm    = buffer.readFloatLE(16);
        const engTemp = buffer.readFloatLE(24);
        const fuel   = buffer.readFloatLE(28);         // 0–1 fraction

        const throttle = buffer.readFloatLE(48);       // 0–1
        const brake    = buffer.readFloatLE(52);       // 0–1
        const clutch   = buffer.readFloatLE(56);       // 0–1

        this.gaugeState = { speed, rpm, gear, throttle, brake, clutch, fuel, engineTemp: engTemp };
    }

    private parseOutSim(buffer: Buffer): void {
        // Minimum 60 bytes for the fields we care about
        if (buffer.length < 60) return;

        // Some BeamNG versions prepend a 4-byte time field before the OSS data.
        // Detect by checking if the first 4 bytes look like a small integer (time in ms)
        // vs a float coordinate. We do this heuristically: if readUInt32LE(0) < 1e7
        // it is likely a time stamp, so offset by 4.
        let offset = 0;
        const firstUint = buffer.readUInt32LE(0);
        if (firstUint < 10_000_000 && buffer.length >= 64) {
            offset = 4;
        }

        const posX = buffer.readFloatLE(offset + 0);
        const posY = buffer.readFloatLE(offset + 4);
        const posZ = buffer.readFloatLE(offset + 8);

        const velX = buffer.readFloatLE(offset + 12);
        const velY = buffer.readFloatLE(offset + 16);
        const velZ = buffer.readFloatLE(offset + 20);

        // rotX/Y/Z – skipped for now (offset 24-35)

        const accX = buffer.readFloatLE(offset + 36); // lateral      m/s²
        const accY = buffer.readFloatLE(offset + 40); // vertical     m/s²
        const accZ = buffer.readFloatLE(offset + 44); // longitudinal m/s²

        const heading = buffer.length >= offset + 52 ? buffer.readFloatLE(offset + 48) : 0;
        const pitch   = buffer.length >= offset + 56 ? buffer.readFloatLE(offset + 52) : 0;
        const roll    = buffer.length >= offset + 60 ? buffer.readFloatLE(offset + 56) : 0;

        this.prevVelX = this.simState.velX;
        this.prevVelZ = this.simState.velZ;

        this.simState = { posX, posY, posZ, velX, velY, velZ, accX, accY, accZ, heading, pitch, roll };
    }

    // ── Frame Builder ─────────────────────────────────────────────────────────

    private buildFrame(): TelemetryData {
        const { speed, rpm, gear, throttle, brake, clutch, fuel, engineTemp } = this.gaugeState;
        const { posX, posY, posZ, velX, velZ, accX, accY, accZ } = this.simState;

        // G-Forces: convert m/s² → G (lateral is accX, longitudinal is accZ)
        const gForceX = accX / G;          // Lateral G  (+ = right turn)
        const gForceY = -accZ / G;         // Longitudinal G (+ = braking, - = accel)
        const gForceZ = (accY + G) / G;    // Vertical G  (1.0 at rest)

        // Steering estimate: use the lateral / forward velocity ratio
        // This gives a value in [-1, 1] based on slip angle direction
        const forwardSpeed = Math.abs(velZ);
        const steering = forwardSpeed > 1.0
            ? Math.max(-1, Math.min(1, velX / forwardSpeed))
            : 0;

        return {
            game: 'BeamNG.drive',
            timestamp: Date.now(),
            speed,
            rpm,
            gear,
            throttle,
            brake,
            clutch,
            steering,
            gForceX,
            gForceY,
            gForceZ,
            engineTemp,
            fuel,
            // Track position (metres, world space)
            posX,
            posY,
            posZ,
        };
    }
}
