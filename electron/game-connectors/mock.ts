import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';

export class MockConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Simulation Mode';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    // Simulation state
    private speed = 0;
    private rpm = 800;
    private gear = 1;
    private throttle = 0;
    private brake = 0;
    private distance = 0;
    private time = 0;

    constructor() {
        super();
    }

    start() {
        if (this.isRunning) return;

        console.log('Starting Simulation Mode...');
        this.isRunning = true;
        this.emit('status', 'connected');

        // Reset state
        this.speed = 0;
        this.rpm = 800;
        this.time = 0;

        this.interval = setInterval(() => {
            if (!this.isRunning) return;
            this.updatePhysics();
            this.emitData();
        }, 1000 / 60); // 60Hz
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.emit('status', 'disconnected');
        console.log('Simulation Mode stopped');
    }

    private updatePhysics() {
        this.time += 1 / 60;

        // Simple sine wave driving pattern
        // Accelerate for 10s, Coast 5s, Brake 5s, Repeat
        const cycleTime = this.time % 20;

        if (cycleTime < 10) {
            // Accelerating
            this.throttle = Math.min(1, this.throttle + 0.05);
            this.brake = Math.max(0, this.brake - 0.1);
        } else if (cycleTime < 15) {
            // Coasting
            this.throttle = Math.max(0, this.throttle - 0.1);
            this.brake = 0;
        } else {
            // Braking
            this.throttle = 0;
            this.brake = Math.min(1, this.brake + 0.05);
        }

        // Physics approximation
        if (this.throttle > 0) {
            this.rpm += this.throttle * 100;
            this.speed += this.throttle * 0.5;
        }

        if (this.brake > 0) {
            this.speed -= this.brake * 1.5;
            this.rpm -= this.brake * 200;
        }

        // Drag
        this.speed -= 0.05;
        this.rpm -= 10;

        // Limits
        if (this.speed < 0) this.speed = 0;
        if (this.rpm < 800) this.rpm = 800;
        if (this.rpm > 7000) this.rpm = 7000;

        // Auto shift (Simple)
        if (this.rpm > 6500 && this.gear < 6) {
            this.gear++;
            this.rpm -= 2000;
        } else if (this.rpm < 2000 && this.gear > 1) {
            this.gear--;
            this.rpm += 1500;
        }
    }

    private emitData() {
        const data: TelemetryData = {
            game: 'Simulation',
            timestamp: Date.now(),
            speed: Math.max(0, this.speed), // km/h
            rpm: this.rpm,
            gear: this.gear,
            throttle: this.throttle,
            brake: this.brake,
            clutch: 0,
            steering: Math.sin(this.time) * 0.5, // Weave slightly
            gForceX: Math.cos(this.time) * 0.5,
            gForceY: (this.throttle - this.brake) * 0.8, // Long G approx
            gForceZ: 1,
            engineTemp: 90 + Math.random() * 5,
            fuel: 50 - (this.time * 0.01) // Consume fuel
        };

        this.emit('data', data);
    }
}
