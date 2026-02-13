import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';

export class AssettoCorsaConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Assetto Corsa';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    start() {
        if (process.platform !== 'win32') {
            console.warn('Assetto Corsa connector only supports Windows.');
            this.emit('status', 'unavailable');
            return;
        }

        // TODO: Implement Windows Shared Memory access
        // We would need a native module here like 'mmf' or 'koffi' to access
        // 'Local\\acpmf_physics', 'Local\\acpmf_graphics', 'Local\\acpmf_static'

        console.log('Assetto Corsa connector started (Mock for now)');
        this.isRunning = true;
        this.emit('status', 'listening');

        // Mock data for development if enabled
        // this.startMockData();
    }

    stop() {
        this.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        this.emit('status', 'disconnected');
    }

    private startMockData() {
        this.interval = setInterval(() => {
            if (!this.isRunning) return;

            const data: TelemetryData = {
                game: 'Assetto Corsa',
                timestamp: Date.now(),
                speed: 100 + Math.random() * 20,
                rpm: 4000 + Math.random() * 1000,
                gear: 3,
                throttle: 0.8,
                brake: 0,
                clutch: 0,
                steering: Math.sin(Date.now() / 1000) * 0.5,
                gForceX: 0,
                gForceY: 0,
                gForceZ: 0
            };

            this.emit('data', data);
        }, 1000 / 60); // 60Hz
    }
}
