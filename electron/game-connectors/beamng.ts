import dgram from 'dgram';
import { EventEmitter } from 'events';
import { TelemetryData } from '../../src/types/telemetry.js';
import { GameConnector } from '../connector-interface.js';

export class BeamNGConnector extends EventEmitter {
    public readonly name = 'BeamNG.drive';
    private socket: dgram.Socket;
    private port: number;
    private isConnected: boolean = false;

    constructor(port: number = 4444) {
        super();
        this.port = port;
        this.socket = dgram.createSocket('udp4');
    }

    start() {
        this.socket.on('error', (err) => {
            console.error(`BeamNG connector error:\n${err.stack}`);
            this.socket.close();
            this.isConnected = false;
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
            const address = this.socket.address();
            console.log(`BeamNG connector listening ${address.address}:${address.port}`);
            this.emit('status', 'listening');
        });

        this.socket.bind(this.port);
    }

    stop() {
        this.socket.close();
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

        // Note: OutGauge is ~96 bytes. BeamNG might send slightly different depending on version, 
        // but the core fields usually align.

        if (buffer.length < 96) {
            // Just a sanity check, though standard OutGauge is 96 bytes.
        }

        const time = buffer.readUInt32LE(0);
        // const car = buffer.slice(4, 8).toString();
        const gear = buffer.readInt8(10); // 0=R, 1=N, 2=1st... (LFS standard)
        // BeamNG might map differently. Usually: 0=R, 1=N, 2=1...
        // Let's normalize to: -1=R, 0=N, 1=1...
        // If LFS standard: 0=R, 1=N, 2=1... -> map to -1, 0, 1...
        const normalizedGear = gear - 1;

        const speed = buffer.readFloatLE(12); // m/s usually? Or km/h? OutGauge doc says m/s usually?
        // BeamNG Lua usually sends m/s.
        const speedKmh = speed * 3.6;

        const rpm = buffer.readFloatLE(16);
        const engTemp = buffer.readFloatLE(24);
        const fuel = buffer.readFloatLE(28);
        // const oilTemp = buffer.readFloatLE(36);

        const throttle = buffer.readFloatLE(48); // 0-1 (approx, scale might be 0-100 or 0-1)
        const brake = buffer.readFloatLE(52);    // 0-1
        const clutch = buffer.readFloatLE(56);   // 0-1

        return {
            game: 'BeamNG.drive',
            timestamp: Date.now(),
            speed: speedKmh,
            rpm: rpm,
            gear: normalizedGear,
            throttle: throttle, // Verify range during testing
            brake: brake,
            clutch: clutch,
            steering: 0, // OutGauge doesn't include steering angle by default :(
            gForceX: 0,
            gForceY: 0,
            gForceZ: 0,
            engineTemp: engTemp,
            fuel: fuel
        };
    }
}
