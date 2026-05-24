import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';

export class MockConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Simulation Mode';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    // Physics State
    private time = 0;
    private transmissionType: 'automatic' | 'manual' = 'automatic';
    private drivingBehavior: 'Drunk' | 'High' | 'Reckless' | 'Normal' | 'Slow' | 'New driver' | 'Professional' = 'Normal';
    private speed = 0;
    private gear = 1;
    private rpm = 1000;
    private engineTemp = 80;
    private tireTemp = [70, 70, 70, 70];
    private tireWearState = [100, 100, 100, 100]; // 100 = new, 0 = destroyed
    private brakeTemp = [100, 100, 100, 100];
    private oilTempState = 80;
    private distanceTraveled = 0;
    private lapTime = 0;
    private bestLap = Infinity;
    private lastLap = 0;
    private lapCount = 0;
    private lastLoopTime = 0;

    // Track Mapping (Figure-8 layout)
    private posX = 0;
    private posZ = 0;
    private heading = 0;
    private clutchTimer = 0;

    constructor() {
        super();
    }

    start() {
        if (this.isRunning) return;

        console.log('[Mock] Starting Procedural Realistic Simulation...');
        this.isRunning = true;

        // Reset session state
        this.time = 0;
        this.speed = 0;
        this.gear = 1;
        this.rpm = 1000;
        this.engineTemp = 80;
        this.oilTempState = 80;
        this.tireTemp = [70, 70, 70, 70];
        this.tireWearState = [100, 100, 100, 100];
        this.brakeTemp = [100, 100, 100, 100];
        this.distanceTraveled = 0;
        this.lapTime = 0;
        this.bestLap = Infinity;
        this.lastLap = 0;
        this.lapCount = 0;
        this.lastLoopTime = 0;
        this.posX = 0;
        this.posZ = 0;
        this.heading = 0;
        this.clutchTimer = 0;

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

    setTransmissionType(type: 'automatic' | 'manual') {
        this.transmissionType = type;
        console.log(`[Mock] Transmission set to: ${type}`);
    }

    setDrivingBehavior(behavior: 'Drunk' | 'High' | 'Reckless' | 'Normal' | 'Slow' | 'New driver' | 'Professional') {
        this.drivingBehavior = behavior;
        console.log(`[Mock] Driving behavior set to: ${behavior}`);
    }

    private emitNextFrame() {
        const dt = 1 / 60; // 60 FPS
        this.time += dt;
        this.lapTime += dt;

        // --- Lap detection (20s loop wraps → new lap) ---
        const loopTime = this.time % 20;
        if (loopTime < this.lastLoopTime) {
            // Completed a lap
            this.lastLap = this.lapTime;
            this.bestLap = Math.min(this.bestLap, this.lapTime);
            this.lapTime = 0;
            this.lapCount++;
        }
        this.lastLoopTime = loopTime;

        // --- Driver Behavior Model (Based on a ~20s lap loop) ---
        let throttleTarget = 0;
        let brakeTarget = 0;
        let steeringTarget = 0;

        // Base line pathing (Professional/Normal)
        if (loopTime < 5) {
            throttleTarget = 1.0;
            brakeTarget = 0.0;
            steeringTarget = 0.0;
        } else if (loopTime < 7) {
            throttleTarget = 0.0;
            brakeTarget = 0.8;
            steeringTarget = 0.0;
        } else if (loopTime < 11) {
            throttleTarget = (loopTime - 7) * 0.1;
            brakeTarget = Math.max(0, 0.5 - (loopTime - 7) * 0.2);
            steeringTarget = Math.min(1.0, (loopTime - 7) * 0.5);
        } else if (loopTime < 14) {
            throttleTarget = 1.0;
            brakeTarget = 0.0;
            steeringTarget = Math.max(0, 1.0 - (loopTime - 11) * 0.5);
        } else if (loopTime < 16) {
            throttleTarget = 0.0;
            brakeTarget = 0.9;
            steeringTarget = 0.0;
        } else {
            throttleTarget = Math.min(1.0, (loopTime - 16) * 0.25);
            brakeTarget = 0.0;
            steeringTarget = -Math.min(1.0, (loopTime - 16) * 0.4);
        }

        // Apply Behavior Modifications
        let noiseLevel = 0.02;
        let performanceMultiplier = 1.0;
        let healthDamageRate = 1.0;

        switch (this.drivingBehavior) {
            case 'Drunk':
                noiseLevel = 0.15;
                performanceMultiplier = 0.7;
                healthDamageRate = 3.0;
                break;
            case 'High':
                noiseLevel = 0.08;
                performanceMultiplier = 0.8;
                healthDamageRate = 1.5;
                break;
            case 'Reckless':
                noiseLevel = 0.05;
                throttleTarget = Math.min(1.0, throttleTarget * 1.2);
                brakeTarget = brakeTarget > 0 ? 1.0 : 0.0; // All or nothing braking
                performanceMultiplier = 1.1; // pushing hard
                healthDamageRate = 5.0; // crashing often
                break;
            case 'Slow':
                throttleTarget *= 0.6;
                performanceMultiplier = 0.5;
                break;
            case 'New driver':
                noiseLevel = 0.04;
                brakeTarget *= 1.3; // panic braking
                performanceMultiplier = 0.8;
                healthDamageRate = 1.2;
                break;
            case 'Professional':
                noiseLevel = 0.005;
                performanceMultiplier = 1.2;
                healthDamageRate = 0.8;
                break;
        }

        // Add micro-adjustments and behavior noise
        const throttle = Math.max(0, Math.min(1, throttleTarget + Math.sin(this.time * 12) * noiseLevel));
        const brake = Math.max(0, Math.min(1, brakeTarget + Math.cos(this.time * 8) * noiseLevel));
        let steering = Math.max(-1, Math.min(1, steeringTarget + Math.sin(this.time * 15) * noiseLevel));

        // Unpredictable swerving for Drunk/High
        if (this.drivingBehavior === 'Drunk' || this.drivingBehavior === 'High') {
            steering += Math.sin(this.time * 2) * noiseLevel * 5;
        }

        // --- Vehicle Physics Model ---
        let acceleration = (throttle * 8.0 * performanceMultiplier) - (this.speed * this.speed * 0.003) - (this.speed * 0.02) - (brake * 15.0);

        if (this.speed <= 0.1 && acceleration < 0) {
            acceleration = 0;
            this.speed = 0;
        }

        this.speed += acceleration * dt;

        // RPM and Gear Logic
        let clutch = 0;
        const gearRatios = [0, 3.5, 2.1, 1.5, 1.1, 0.9, 0.7];
        const finalDrive = 3.5;
        const wheelCircumference = 2.0;

        let targetRpm = Math.max(800, (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference);

        if (this.transmissionType === 'automatic') {
            if (targetRpm > 7000 && this.gear < 6) {
                this.gear++;
                this.clutchTimer = 0.2; // 200ms
                targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
            } else if (targetRpm < 3000 && this.gear > 1 && brake > 0.1) {
                this.gear--;
                this.clutchTimer = 0.2;
                targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
            }
        } else {
            // Manual Transmission
            const shiftingWindow = loopTime;
            const isShiftingUp = (shiftingWindow > 3.0 && shiftingWindow < 3.5) || (shiftingWindow > 6.0 && shiftingWindow < 6.5);
            const isShiftingDown = (shiftingWindow > 14.5 && shiftingWindow < 15.0) || (shiftingWindow > 15.5 && shiftingWindow < 16.0);

            if (isShiftingUp || isShiftingDown) {
                this.clutchTimer = 0.5; // Manual shifts take longer
                if (isShiftingUp && this.gear < 6 && targetRpm > 5000) {
                    this.gear++;
                } else if (isShiftingDown && this.gear > 1 && targetRpm < 5000) {
                    this.gear--;
                }
            }
            targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
        }

        if (this.clutchTimer > 0) {
            clutch = 1.0;
            this.clutchTimer -= dt;
        }

        this.rpm = this.rpm + (targetRpm - this.rpm) * 0.2;

        const turnRate = steering * (this.speed > 0 ? (10 / (this.speed + 5)) : 0);
        const yawRate = turnRate; // rad/s — same as turn rate for simple model
        this.heading += turnRate * dt;

        this.posX += Math.cos(this.heading) * this.speed * dt;
        this.posZ += Math.sin(this.heading) * this.speed * dt;
        this.distanceTraveled += this.speed * dt;

        const gForceLong = acceleration / 9.81;
        const gForceLat = (this.speed * this.speed * turnRate) / 9.81;

        // Temperatures and Damage
        this.engineTemp = 80 + (this.rpm / 8000) * 20 + Math.sin(this.time) * 2;
        this.oilTempState = 85 + (this.rpm / 8000) * 30 + Math.sin(this.time * 0.7) * 3; // oil lags behind coolant
        this.tireTemp = this.tireTemp.map(t => Math.max(70, Math.min(120, t + (Math.abs(gForceLat) * dt * performanceMultiplier) - ((t - 70) * dt * 0.1))));
        this.brakeTemp = this.brakeTemp.map(t => Math.max(50, Math.min(600, t + (brake * 50 * dt * performanceMultiplier) - ((t - 50) * dt * 0.5))));

        // Realistic tire wear: cumulative G-force × speed × surface abrasion
        // Each tire wears independently based on load (FL/FR take more cornering load)
        const wearRateBase = 0.000008 * healthDamageRate * performanceMultiplier;
        const gSum = Math.abs(gForceLat) + Math.abs(gForceLong);
        const wearThisFrame = gSum * (this.speed * 3.6) * wearRateBase * dt * 60;
        // Front tires wear faster (steering + braking load), rears slightly less
        this.tireWearState[0] -= wearThisFrame * 1.15; // FL — most loaded in left corners
        this.tireWearState[1] -= wearThisFrame * 1.10; // FR
        this.tireWearState[2] -= wearThisFrame * 0.85; // RL
        this.tireWearState[3] -= wearThisFrame * 0.80; // RR
        this.tireWearState = this.tireWearState.map(w => Math.max(0, w)) as [number, number, number, number];

        // Advanced Telemetry Calculations
        const slipAngleEstimate = Math.abs(gForceLat) * 5 + (this.speed > 20 ? Math.random() * 2 : 0);
        const oversteerCorrection = (gForceLat > 1.2 && steering < -0.2) ? Math.abs(steering) : 0;
        const understeerPlough = (gForceLat > 1.0 && Math.abs(steering) > 0.8) ? 0.5 : 0;
        const coastingTimePct = (throttle === 0 && brake === 0) ? 1.0 : 0.0;

        // Health impact based on behavior
        const wearBase = this.distanceTraveled * 0.000001 * healthDamageRate;
        const carDamage = {
            engine: Math.max(0, 1.0 - wearBase - (this.engineTemp > 110 ? 0.001 * healthDamageRate : 0)),
            transmission: Math.max(0, 1.0 - wearBase * 0.5 - (clutch > 0.8 && throttle > 0.8 ? 0.0005 * healthDamageRate : 0)),
            suspension: Math.max(0, 1.0 - wearBase * 0.2 - (Math.abs(gForceLat) > 1.5 ? 0.0001 * healthDamageRate : 0)),
            brakes: Math.max(0, 1.0 - wearBase * 1.5 - (brake > 0.8 ? 0.0002 * healthDamageRate : 0)),
            aero: Math.max(0, 1.0 - wearBase * 0.1 - (this.speed > 50 && this.drivingBehavior === 'New driver' ? 0.00001 : 0))
        };

        const frame: TelemetryData = {
            timestamp: Date.now(),
            bridgeActive: true,
            game: 'Simulation Mode',
            speed: this.speed * 3.6,
            rpm: this.rpm,
            gear: this.gear,
            throttle: throttle,
            brake: brake,
            clutch: clutch,
            steering: steering,
            gForceX: gForceLat,
            gForceY: gForceLong,
            gForceZ: 1.0,
            yawRate,
            carDamage,
            fuel: 50 - (this.distanceTraveled / 1000),
            engineTemp: this.engineTemp,
            oilTemp: this.oilTempState,
            tireTemp: [this.tireTemp[0], this.tireTemp[1], this.tireTemp[2], this.tireTemp[3]],
            tireTempFL: this.tireTemp[0],
            tireTempFR: this.tireTemp[1],
            tireTempRL: this.tireTemp[2],
            tireTempRR: this.tireTemp[3],
            tireSurfaceTemp: this.tireTemp.map((temp, index) => temp + (brake * 8) + (this.brakeTemp[index] - 100) * 0.02) as [number, number, number, number],
            tireSurfaceTempFL: this.tireTemp[0] + (brake * 8) + (this.brakeTemp[0] - 100) * 0.02,
            tireSurfaceTempFR: this.tireTemp[1] + (brake * 8) + (this.brakeTemp[1] - 100) * 0.02,
            tireSurfaceTempRL: this.tireTemp[2] + (brake * 8) + (this.brakeTemp[2] - 100) * 0.02,
            tireSurfaceTempRR: this.tireTemp[3] + (brake * 8) + (this.brakeTemp[3] - 100) * 0.02,
            tireWear: [this.tireWearState[0], this.tireWearState[1], this.tireWearState[2], this.tireWearState[3]],
            tirePressure: this.tireTemp.map((temp, index) => 30 + (temp - 70) * 0.035 + Math.sin(this.time + index) * 0.15) as [number, number, number, number],
            tirePressureFL: 30 + (this.tireTemp[0] - 70) * 0.035 + Math.sin(this.time) * 0.15,
            tirePressureFR: 30 + (this.tireTemp[1] - 70) * 0.035 + Math.sin(this.time + 1) * 0.15,
            tirePressureRL: 30 + (this.tireTemp[2] - 70) * 0.035 + Math.sin(this.time + 2) * 0.15,
            tirePressureRR: 30 + (this.tireTemp[3] - 70) * 0.035 + Math.sin(this.time + 3) * 0.15,
            posX: this.posX,
            posY: 0,
            posZ: this.posZ,
            yaw: this.heading,
            lapTime: this.lapTime * 1000, // convert to ms
            lastLap: this.lastLap * 1000,
            bestLap: this.bestLap === Infinity ? undefined : this.bestLap * 1000,
            slipAngleEstimate,
            pedalOverlap: (throttle * brake),
            oversteerCorrection,
            understeerPlough,
            coastingTimePct
        };



        this.emit('data', frame);
    }
}
