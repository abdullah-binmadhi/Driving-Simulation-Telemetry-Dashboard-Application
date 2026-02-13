import dgram from 'dgram';
import { EventEmitter } from 'events';
import { TelemetryData } from '../../src/types/telemetry.js';

export class BeamNGConnector extends EventEmitter {
    public readonly name = 'BeamNG.drive';
    private socket: dgram.Socket | null = null;
    private port: number;
    private isConnected: boolean = false;

    constructor(port: number = 4444) {
        super();
        this.port = port;
    }

    start() {
        if (this.socket) {
            // Already running or not properly cleaned up
            try { this.socket.close(); } catch (e) { /* ignore */ }
        }

        this.socket = dgram.createSocket('udp4');

        this.socket.on('error', (err) => {
            console.error(`BeamNG connector error:\n${err.stack}`);
            this.stop(); // Use stop() to clean up
            this.emit('status', 'error');
        });

        this.socket.on('message', (msg, rinfo) => {
            if (!this.isConnected) {
                this.isConnected = true;
                this.emit('status', 'connected');
                console.log(`BeamNG connected from ${rinfo.address}:${rinfo.port}`);
            }

            try {
                const data = this.parseOutGauge(msg);
                this.emit('data', data);
            } catch (e) {
                console.error('Error parsing BeamNG packet:', e);
            }
        });

        this.socket.on('listening', () => {
            const address = this.socket?.address();
            if (address) {
                console.log(`BeamNG connector listening ${address.address}:${address.port}`);
                this.emit('status', 'listening');
            }
        });

        try {
            this.socket.bind(this.port);
        } catch (e) {
            console.error('Failed to bind BeamNG socket:', e);
            this.emit('status', 'error');
        }
    }

    stop() {
        if (this.socket) {
            try {
                this.socket.close();
            } catch (e) {
                console.error('Error closing BeamNG socket:', e);
            }
            this.socket = null;
        }
        this.isConnected = false;
        this.emit('status', 'disconnected');
    }

    private parseOutGauge(buffer: Buffer): TelemetryData {
        // OutGauge structure (from LFS/BeamNG docs)
        // struct OutGaugePack {
        //     unsigned int time;      // 0-3
        //     char car[4];            // 4-7
        //     unsigned short flags;   // 8-9
        //     char gear;              // 10
        //     char plid;              // 11
        //     float speed;            // 12-15
        //     float rpm;              // 16-19
        //     float turbo;            // 20-23
        //     float engTemp;          // 24-27
        //     float fuel;             // 28-31
        //     float oilPressure;      // 32-35
        //     float oilTemp;          // 36-39
        //     unsigned int dashLights;// 40-43
        //     unsigned int showLights;// 44-47
        //     float throttle;         // 48-51
        //     float brake;            // 52-55
        //     float clutch;           // 56-59
        //     char display1[16];      // 60-75
        //     char display2[16];      // 76-91
        //     int id;                 // 92-95
        // }

        if (buffer.length < 96) {
            // Just a sanity check, though standard OutGauge is 96 bytes.
        }

        // const time = buffer.readUInt32LE(0);
        // const car = buffer.slice(4, 8).toString();
        const gear = buffer.readInt8(10); // 0=R, 1=N, 2=1st... (LFS standard)

        const normalizedGear = gear - 1;

        const speed = buffer.readFloatLE(12); // m/s usually? top speed of 300kmh is ~83m/s

        const speedKmh = speed * 3.6;

        const rpm = buffer.readFloatLE(16);
        const engTemp = buffer.readFloatLE(24);
        const fuel = buffer.readFloatLE(28);

        const throttle = buffer.readFloatLE(48); // 0-1
        const brake = buffer.readFloatLE(52);    // 0-1
        const clutch = buffer.readFloatLE(56);   // 0-1

        return {
            game: 'BeamNG.drive',
            timestamp: Date.now(),
            speed: speedKmh,
            rpm: rpm,
            gear: normalizedGear,
            throttle: throttle,
            brake: brake,
            clutch: clutch,
            steering: 0,
            gForceX: 0,
            gForceY: 0,
            gForceZ: 0,
            engineTemp: engTemp,
            fuel: fuel
        };
    }
}
