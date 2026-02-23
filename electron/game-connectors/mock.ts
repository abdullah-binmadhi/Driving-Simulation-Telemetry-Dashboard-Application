import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';

export class MockConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Simulation Mode';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    // Physics State
    private time = 0;
    private speed = 0;
    private gear = 1;
    private rpm = 1000;
    private engineTemp = 80;
    private tireTemp = [70, 70, 70, 70];
    private brakeTemp = [100, 100, 100, 100];
    private distanceTraveled = 0;
    private lapTime = 0;
    private bestLap = 0;
    private lastLap = 0;

    // Track Mapping (Figure-8 layout)
    private posX = 0;
    private posZ = 0;
    private heading = 0;

    constructor() {
        super();
    }

    start() {
        if (this.isRunning) return;

        console.log('[Mock] Starting Procedural Realistic Simulation...');
        this.isRunning = true;
        this.emit('status', 'connected');

        this.interval = setInterval(() => {
            if (!this.isRunning) return;
            this.emitNextFrame();
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

    private emitNextFrame() {
        const dt = 1 / 60; // 60 FPS
        this.time += dt;
        this.lapTime += dt;

        // --- Driver Behavior Model (Based on a ~20s lap loop) ---
        const loopTime = this.time % 20; // 20 second loop

        let throttleTarget = 0;
        let brakeTarget = 0;
        let steeringTarget = 0;

        if (loopTime < 5) {
            // Straight: 100% throttle
            throttleTarget = 1.0;
            brakeTarget = 0.0;
            steeringTarget = 0.0;
        } else if (loopTime < 7) {
            // Heavy Braking zone into a corner
            throttleTarget = 0.0;
            brakeTarget = 0.8 + (Math.sin(this.time * 5) * 0.05); // slight modulate
            steeringTarget = 0.0;
        } else if (loopTime < 11) {
            // Trail braking into a right corner
            throttleTarget = (loopTime - 7) * 0.1; // slow throttle build
            brakeTarget = Math.max(0, 0.5 - (loopTime - 7) * 0.2); // trailing off
            steeringTarget = Math.min(1.0, (loopTime - 7) * 0.5); // turning right
        } else if (loopTime < 14) {
            // Short straight
            throttleTarget = 1.0;
            brakeTarget = 0.0;
            steeringTarget = Math.max(0, 1.0 - (loopTime - 11) * 0.5); // returning to center
        } else if (loopTime < 16) {
            // Braking into left corner
            throttleTarget = 0.0;
            brakeTarget = 0.9;
            steeringTarget = 0.0;
        } else {
            // Long left corner exit
            throttleTarget = Math.min(1.0, (loopTime - 16) * 0.25);
            brakeTarget = 0.0;
            steeringTarget = -Math.min(1.0, (loopTime - 16) * 0.4); // turning left
        }

        // Add micro-adjustments for realism
        const throttle = Math.max(0, Math.min(1, throttleTarget + Math.sin(this.time * 12) * 0.02));
        const brake = Math.max(0, Math.min(1, brakeTarget + Math.cos(this.time * 8) * 0.01));
        const steering = Math.max(-1, Math.min(1, steeringTarget + Math.sin(this.time * 15) * 0.02));

        // --- Vehicle Physics Model ---

        // Acceleration = throttle * power_factor - air_drag - rolling_resistance - brake * brake_factor
        let acceleration = (throttle * 8.0) - (this.speed * this.speed * 0.003) - (this.speed * 0.02) - (brake * 15.0);

        // Prevent reversing for now
        if (this.speed <= 0.1 && acceleration < 0) {
            acceleration = 0;
            this.speed = 0;
        }

        this.speed += acceleration * dt; // speed in m/s

        // RPM and Gear Logic (Simple automatic transmission)
        let clutch = 0;
        const speedKmh = this.speed * 3.6;

        const gearRatios = [0, 3.5, 2.1, 1.5, 1.1, 0.9, 0.7]; // Example ratios
        const finalDrive = 3.5;
        const wheelCircumference = 2.0; // meters

        // Calculate theoretical RPM based on wheel speed and current gear
        let targetRpm = Math.max(800, (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference);

        // Auto shift up
        if (targetRpm > 7000 && this.gear < 6) {
            this.gear++;
            clutch = 1.0; // Spike clutch on shift
            targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
        }
        // Auto shift down
        else if (targetRpm < 3000 && this.gear > 1 && brake > 0.1) {
            this.gear--;
            clutch = 1.0;
            targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
        }

        // Smooth RPM slightly to simulate engine inertia
        this.rpm = this.rpm + (targetRpm - this.rpm) * 0.2;

        // Spatial Movement Model (X, Z map movement based on heading and speed)
        // Adjust heading based on steering and speed (tighter turn at low speed for same steering angle)
        const turnRate = steering * (this.speed > 0 ? (10 / (this.speed + 5)) : 0);
        this.heading += turnRate * dt;

        this.posX += Math.cos(this.heading) * this.speed * dt;
        this.posZ += Math.sin(this.heading) * this.speed * dt;
        this.distanceTraveled += this.speed * dt;

        // Kinematics (G-Forces)
        const gForceLong = acceleration / 9.81;
        const gForceLat = (this.speed * this.speed * turnRate) / 9.81; // Centripetal accel

        // Fake Lap completion trigger (loop crossed start line)
        if (loopTime < dt * 2 && this.time > 1) { // Just looped
            this.lastLap = this.lapTime;
            if (this.bestLap === 0 || this.lapTime < this.bestLap) {
                this.bestLap = this.lapTime;
            }
            this.lapTime = 0;
        }

        // Temperatures (very basic buildup)
        this.engineTemp = 80 + (this.rpm / 8000) * 20 + Math.sin(this.time) * 2;
        this.tireTemp = this.tireTemp.map(t => Math.max(70, Math.min(120, t + (Math.abs(gForceLat) * dt) - ((t - 70) * dt * 0.1))));
        this.brakeTemp = this.brakeTemp.map(t => Math.max(50, Math.min(600, t + (brake * 50 * dt) - ((t - 50) * dt * 0.5))));

        // Suspension and Wheel Speeds
        const weightTransferLong = gForceLong * 0.1;
        const weightTransferLat = gForceLat * 0.1;

        const suspFL = 0.5 - weightTransferLong + weightTransferLat;
        const suspFR = 0.5 - weightTransferLong - weightTransferLat;
        const suspRL = 0.5 + weightTransferLong + weightTransferLat;
        const suspRR = 0.5 + weightTransferLong - weightTransferLat;

        // Slip slightly on heavy throttle or braking
        const slip = (throttle * 2.0) - (brake * 1.5) + (Math.random() * 0.5 - 0.25);
        const wheelSpd = this.speed + (this.gear <= 2 && throttle > 0.8 ? slip : 0);

        const frame: TelemetryData = {
            timestamp: Date.now(),
            game: 'Simulation Mode',
            speed: this.speed * 3.6, // GUI expects km/h or mph, but our speed is m/s. Multiply by 3.6 for km/h.
            rpm: this.rpm,
            gear: this.gear,
            throttle: throttle,
            brake: brake,
            clutch: clutch,
            steering: steering,

            gForceX: gForceLat,  // Lateral
            gForceY: gForceLong, // Longitudinal
            gForceZ: 1.0,        // Gravity

            lapTime: this.lapTime,
            bestLap: this.bestLap,
            lastLap: this.lastLap,

            carDamage: { engine: 0, transmission: 0, suspension: 0, brakes: 0, aero: 0 },
            fuel: 50 - (this.distanceTraveled / 1000), // slowly drains
            engineTemp: this.engineTemp,

            tireTemp: [this.tireTemp[0], this.tireTemp[1], this.tireTemp[2], this.tireTemp[3]],
            tireWear: [100, 100, 100, 100], // 100% health

            posX: this.posX,
            posY: 0, // Flat track
            posZ: this.posZ
        };

        this.emit('data', frame);
    }
}
