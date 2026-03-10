import { useTelemetryStore } from '../stores/telemetryStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { TelemetryData } from '../types/telemetry';

class BrowserSimulator {
    private isRunning = false;
    private interval: number | null = null;

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
    private posX = 0;
    private posZ = 0;
    private heading = 0;
    private clutchTimer = 0;

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        useTelemetryStore.getState().setConnectionStatus(true, 'Browser Simulation');

        this.interval = window.setInterval(() => {
            if (!this.isRunning) return;
            this.emitNextFrame();
        }, 1000 / 60); // 60Hz
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            window.clearInterval(this.interval);
            this.interval = null;
        }
        useTelemetryStore.getState().setConnectionStatus(false, '');
    }

    private emitNextFrame() {
        const settings = useSettingsStore.getState();
        const transmissionType = settings.game.transmissionType || 'automatic';
        const drivingBehavior = settings.game.drivingBehavior || 'Normal';

        const dt = 1 / 60;
        this.time += dt;
        this.lapTime += dt;

        const loopTime = this.time % 20;

        let throttleTarget = 0;
        let brakeTarget = 0;
        let steeringTarget = 0;

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

        let noiseLevel = 0.02;
        let performanceMultiplier = 1.0;
        let healthDamageRate = 1.0;

        switch (drivingBehavior) {
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
                brakeTarget = brakeTarget > 0 ? 1.0 : 0.0;
                performanceMultiplier = 1.1;
                healthDamageRate = 5.0;
                break;
            case 'Slow':
                throttleTarget *= 0.6;
                performanceMultiplier = 0.5;
                break;
            case 'New driver':
                noiseLevel = 0.04;
                brakeTarget *= 1.3;
                performanceMultiplier = 0.8;
                healthDamageRate = 1.2;
                break;
            case 'Professional':
                noiseLevel = 0.005;
                performanceMultiplier = 1.2;
                healthDamageRate = 0.8;
                break;
        }

        const throttle = Math.max(0, Math.min(1, throttleTarget + Math.sin(this.time * 12) * noiseLevel));
        const brake = Math.max(0, Math.min(1, brakeTarget + Math.cos(this.time * 8) * noiseLevel));
        let steering = Math.max(-1, Math.min(1, steeringTarget + Math.sin(this.time * 15) * noiseLevel));

        if (drivingBehavior === 'Drunk' || drivingBehavior === 'High') {
            steering += Math.sin(this.time * 2) * noiseLevel * 5;
        }

        let acceleration = (throttle * 8.0 * performanceMultiplier) - (this.speed * this.speed * 0.003) - (this.speed * 0.02) - (brake * 15.0);

        if (this.speed <= 0.1 && acceleration < 0) {
            acceleration = 0;
            this.speed = 0;
        }

        this.speed += acceleration * dt;

        let clutch = 0;
        const gearRatios = [0, 3.5, 2.1, 1.5, 1.1, 0.9, 0.7];
        const finalDrive = 3.5;
        const wheelCircumference = 2.0;

        let targetRpm = Math.max(800, (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference);

        if (transmissionType === 'automatic') {
            if (targetRpm > 7000 && this.gear < 6) {
                this.gear++;
                this.clutchTimer = 0.2;
                targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
            } else if (targetRpm < 3000 && this.gear > 1 && brake > 0.1) {
                this.gear--;
                this.clutchTimer = 0.2;
                targetRpm = (this.speed * 60 * gearRatios[this.gear] * finalDrive) / wheelCircumference;
            }
        } else {
            const shiftingWindow = loopTime;
            const isShiftingUp = (shiftingWindow > 3.0 && shiftingWindow < 3.5) || (shiftingWindow > 6.0 && shiftingWindow < 6.5);
            const isShiftingDown = (shiftingWindow > 14.5 && shiftingWindow < 15.0) || (shiftingWindow > 15.5 && shiftingWindow < 16.0);

            if (isShiftingUp || isShiftingDown) {
                this.clutchTimer = 0.5;
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
        this.heading += turnRate * dt;

        this.posX += Math.cos(this.heading) * this.speed * dt;
        this.posZ += Math.sin(this.heading) * this.speed * dt;
        this.distanceTraveled += this.speed * dt;

        const gForceLong = acceleration / 9.81;
        const gForceLat = (this.speed * this.speed * turnRate) / 9.81;

        this.engineTemp = 80 + (this.rpm / 8000) * 20 + Math.sin(this.time) * 2;
        this.tireTemp = this.tireTemp.map(t => Math.max(70, Math.min(120, t + (Math.abs(gForceLat) * dt * performanceMultiplier) - ((t - 70) * dt * 0.1))));
        this.brakeTemp = this.brakeTemp.map(t => Math.max(50, Math.min(600, t + (brake * 50 * dt * performanceMultiplier) - ((t - 50) * dt * 0.5))));

        const slipAngleEstimate = Math.abs(gForceLat) * 5 + (this.speed > 20 ? Math.random() * 2 : 0);
        const oversteerCorrection = (gForceLat > 1.2 && steering < -0.2) ? Math.abs(steering) : 0;
        const understeerPlough = (gForceLat > 1.0 && Math.abs(steering) > 0.8) ? 0.5 : 0;
        const coastingTimePct = (throttle === 0 && brake === 0) ? 1.0 : 0.0;

        const wearBase = this.distanceTraveled * 0.000001 * healthDamageRate;
        const carDamage = {
            engine: Math.max(0, 1.0 - wearBase - (this.engineTemp > 110 ? 0.001 * healthDamageRate : 0)),
            transmission: Math.max(0, 1.0 - wearBase * 0.5 - (clutch > 0.8 && throttle > 0.8 ? 0.0005 * healthDamageRate : 0)),
            suspension: Math.max(0, 1.0 - wearBase * 0.2 - (Math.abs(gForceLat) > 1.5 ? 0.0001 * healthDamageRate : 0)),
            brakes: Math.max(0, 1.0 - wearBase * 1.5 - (brake > 0.8 ? 0.0002 * healthDamageRate : 0)),
            aero: Math.max(0, 1.0 - wearBase * 0.1 - (this.speed > 50 && drivingBehavior === 'New driver' ? 0.00001 : 0))
        };

        const frame: TelemetryData = {
            timestamp: Date.now(),
            game: 'Simulation Mode',
            speed: Math.max(0, this.speed * 3.6),
            rpm: Math.max(0, this.rpm),
            gear: this.gear,
            throttle: throttle,
            brake: brake,
            clutch: clutch,
            steering: steering,
            gForceX: gForceLat,
            gForceY: gForceLong,
            gForceZ: 1.0,
            lapTime: this.lapTime,
            bestLap: this.bestLap,
            lastLap: this.lastLap,
            carDamage,
            fuel: 50 - (this.distanceTraveled / 1000),
            engineTemp: this.engineTemp,
            tireTemp: [this.tireTemp[0], this.tireTemp[1], this.tireTemp[2], this.tireTemp[3]],
            tireWear: [100, 100, 100, 100],
            posX: this.posX,
            posY: 0,
            posZ: this.posZ,
            slipAngleEstimate,
            oversteerCorrection,
            understeerPlough,
            coastingTimePct
        };

        useTelemetryStore.getState().updateTelemetry(frame);
    }
}

export const browserSimulator = new BrowserSimulator();
