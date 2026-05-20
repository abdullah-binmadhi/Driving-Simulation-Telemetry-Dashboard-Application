import { EventEmitter } from 'events';
import { app } from 'electron';
import db from './database/db.js';
import type { TelemetryData } from '../src/types/telemetry.js';

export class SessionManager extends EventEmitter {
    private currentSessionId: number | null = null;
    private buffer: TelemetryData[] = [];
    private readonly BATCH_SIZE = 120; // Insert every ~2 seconds if 60Hz
    private lastActivityTime: number = Date.now();
    private isRecording = false;
    private manualStartRequested = false;
    private insertStatement: any = null;


    // Session Stats
    private sessionCoastTime = 0;
    private sessionDistance = 0;
    private sessionStartTime = 0;
    private startFuel = 0;
    private lastFuel = 0;
    private lastTimestamp = 0;
    private lastData: TelemetryData | null = null;

    constructor() {
        super();
        this.initStatements();
    }

    private initStatements() {
        try {
            this.insertStatement = db.prepare(`
                INSERT INTO telemetry (
                    session_id, timestamp, speed, rpm, gear, throttle, brake, clutch, steering,
                    gForceX, gForceY, gForceZ, fuel, engineTemp,
                    pos_x, pos_y, pos_z,
                    throttle_delta, brake_delta, steering_delta, speed_delta,
                    gforce_combined, slip_angle_estimate, is_coasting, is_wots, is_braking, is_turning,
                    jerk_x, jerk_y, distance_traveled, turn_radius, pedal_overlap, is_trail_braking,
                    oversteer_correction, understeer_plough, coasting_time_pct, brake_bias_utilization,
                    true_tire_wear_fl, true_tire_wear_fr, true_tire_wear_rl, true_tire_wear_rr, actual_slip_ratio
                ) VALUES (
                    @session_id, @timestamp, @speed, @rpm, @gear, @throttle, @brake, @clutch, @steering,
                    @gForceX, @gForceY, @gForceZ, @fuel, @engineTemp,
                    @pos_x, @pos_y, @pos_z,
                    @throttle_delta, @brake_delta, @steering_delta, @speed_delta,
                    @gforce_combined, @slip_angle_estimate, @is_coasting, @is_wots, @is_braking, @is_turning,
                    @jerk_x, @jerk_y, @distance_traveled, @turn_radius, @pedal_overlap, @is_trail_braking,
                    @oversteer_correction, @understeer_plough, @coasting_time_pct, @brake_bias_utilization,
                    @trueTireWearFL, @trueTireWearFR, @trueTireWearRL, @trueTireWearRR, @actualSlipRatio
                )
            `);
        } catch (e) {
            console.error('Failed to prepare telemetry insert statement:', e);
        }
    }

    public processData(data: TelemetryData) {
        // Start session only if manually requested and we have valid data
        if (!this.isRecording && this.manualStartRequested && data.speed > -1) {
            this.startSession(data);
            this.manualStartRequested = false;
        }

        if (this.isRecording) {
            // ML Feature Calculation
            if (this.lastData && this.lastTimestamp > 0) {
                const dt = (data.timestamp - this.lastTimestamp) / 1000;
                if (dt > 0 && dt < 1) { // Sanity check for massive time jumps
                    data.throttleDelta = (data.throttle - this.lastData.throttle) / dt;
                    data.brakeDelta = (data.brake - this.lastData.brake) / dt;
                    data.steeringDelta = (data.steering - this.lastData.steering) / dt;
                    data.speedDelta = (data.speed - this.lastData.speed) / dt;
                    data.jerkX = ((data.gForceX || 0) - (this.lastData.gForceX || 0)) / dt;
                    data.jerkY = ((data.gForceY || 0) - (this.lastData.gForceY || 0)) / dt;
                } else {
                    data.throttleDelta = 0; data.brakeDelta = 0; data.steeringDelta = 0;
                    data.speedDelta = 0; data.jerkX = 0; data.jerkY = 0;
                }
            } else {
                data.throttleDelta = 0;
                data.brakeDelta = 0;
                data.steeringDelta = 0;
                data.speedDelta = 0;
                data.jerkX = 0;
                data.jerkY = 0;
            }

            data.gforceCombined = Math.sqrt(Math.pow(data.gForceX || 0, 2) + Math.pow(data.gForceY || 0, 2));
            // Slip angle proxy: atan(lateralG / (longitudinalG + ε)) in degrees
            // Positive = understeer tendency, negative = oversteer tendency
            data.slipAngleEstimate = Math.atan2(
                Math.abs(data.gForceX || 0),
                Math.abs(data.gForceY || 0) + 0.001
            ) * (180 / Math.PI);
            data.isCoasting = (data.throttle < 0.05 && data.brake < 0.05 && data.speed > 5) ? 1 : 0;
            data.isWots = (data.throttle > 0.95) ? 1 : 0;
            data.isBraking = (data.brake > 0.05) ? 1 : 0;
            data.isTurning = (Math.abs(data.steering) > 0.05) ? 1 : 0;

            // Extract Ground Truth ML Labels from incoming payload
            data.trueTireWearFL = data.tireWear ? data.tireWear[0] : 1;
            data.trueTireWearFR = data.tireWear ? data.tireWear[1] : 1;
            data.trueTireWearRL = data.tireWear ? data.tireWear[2] : 1;
            data.trueTireWearRR = data.tireWear ? data.tireWear[3] : 1;
            // The actual slip ratio might not be perfectly provided by the game yet,
            // but we can set up the DB flow and calculate it natively when the Lua script exports slip nodes.
            data.actualSlipRatio = data.actualSlipRatio || 0;

            this.lastData = data; // Keep reference instead of clone to save GC
            this.buffer.push({ ...data }); // Only clone once when pushing to buffer

            // Stats Calculation and Spatial Distance
            const now = data.timestamp;
            if (this.lastTimestamp > 0) {
                const dt = (now - this.lastTimestamp) / 1000; // seconds
                if (dt > 0 && dt < 1) { // Sanity check for dt
                    // Distance: speed (km/h) / 3.6 = m/s * dt = meters
                    this.sessionDistance += (data.speed / 3.6) * dt;

                    // Coasting: Throttle & Brake < 5%
                    if (data.throttle < 0.05 && data.brake < 0.05 && data.speed > 5) {
                        this.sessionCoastTime += (dt * 1000); // ms
                    }
                }
            }

            data.distanceTraveled = this.sessionDistance;

            // Turn Radius = V^2 / Ac. Ac is LatG * 9.81
            const velocityMS = data.speed / 3.6;
            const latG = Math.abs(data.gForceX || 0) * 9.81;
            data.turnRadius = latG > 0.1 ? (Math.pow(velocityMS, 2) / latG) : 0;

            data.pedalOverlap = data.throttle * data.brake;
            data.isTrailBraking = (data.brake > 0.05 && Math.abs(data.steering) > 0.1) ? 1 : 0;

            // Behavioral States
            data.oversteerCorrection = (Math.abs(data.steering) > 0.3 && Math.abs(data.gForceX || 0) > 0.5 && (Math.sign(data.steering) !== Math.sign(data.gForceX || 0))) ? 1 : 0;
            data.understeerPlough = (Math.abs(data.steering) > 0.6 && Math.abs(data.gForceX || 0) < 0.4) ? 1 : 0;
            data.coastingTimePct = this.sessionCoastTime > 0 ? (this.sessionCoastTime / (Date.now() - this.sessionStartTime)) * 100 : 0;
            data.brakeBiasUtilization = (data.brake > 0) ? Math.min(1, data.brake / (velocityMS / 30 + 0.1)) : 0;

            this.lastTimestamp = now;
            this.lastFuel = data.fuel || 0;
            this.lastActivityTime = Date.now();

            if (this.buffer.length >= this.BATCH_SIZE) {
                this.flushBuffer();
            }

            // Auto-stop logic (simple timeout for now, can be improved)
        }
    }

    public beginManualSession() {
        if (!this.isRecording) {
            this.manualStartRequested = true;
        }
    }

    private startSession(data: TelemetryData) {
        console.log('Starting new session...');
        this.isRecording = true;
        this.sessionCoastTime = 0;
        this.sessionDistance = 0;
        this.sessionStartTime = Date.now();
        this.startFuel = data.fuel || 0;
        this.lastFuel = this.startFuel;
        this.lastTimestamp = data.timestamp;
        this.lastData = null; // Reset starting data

        try {
            const stmt = db.prepare(`
        INSERT INTO sessions (game, vehicle, start_time, notes)
        VALUES (?, ?, ?, ?)
      `);
            const vehicle = 'Unknown';
            const result = stmt.run(data.game, vehicle, Date.now(), 'Auto-started session');
            this.currentSessionId = result.lastInsertRowid as number;

            this.emit('session-started', { id: this.currentSessionId });
        } catch (e) {
            console.error('Failed to start session:', e);
            this.isRecording = false;
        }
    }

    public stopSession() {
        if (!this.isRecording || !this.currentSessionId) return null;

        const id = this.currentSessionId;
        console.log('Stopping session...');
        this.flushBuffer();

        // Get final fuel
        // We don't have the *last* data point here easily unless we store it. 
        // But we can approximate with what's in buffer or just ignore precise fuel for now if buffer flushed.
        // Better: let's use the last known data point in buffer if available, or just not update fuel if we can't.
        // actually we can just store `lastFuel` in processData.

        try {
            // Calculate final stats
            const score = Math.min(100, Math.max(0, 100 - Math.random() * 20)); // Placeholder

            // Fuel Used (Approximate, might be % or Liters depending on game)
            // We need the last data point's fuel. 
            // Since we don't have easy access to "last packet" here without storing it, 
            // let's just assume we can get it from the last buffer item if exists, 
            // OR we should have stored `currentFuel` in class.
            // Let's simplified: we assume we tracked consumption or just update logic next time.
            // For now, let's just leave fuel_used as 0 unless we track `lastFuel` in state.

            // Let's assume we want to write what we have:
            const distanceKm = this.sessionDistance / 1000;
            const fuelUsed = Math.max(0, this.startFuel - this.lastFuel);
            // Efficiency: km / unit. Avoid divide by zero.
            const efficiency = fuelUsed > 0 ? distanceKm / fuelUsed : 0;

            const endStmt = db.prepare(`
        UPDATE sessions 
        SET end_time = ?, duration = ? - start_time, score = ?, 
            distance_traveled = ?, coast_time = ?, fuel_used = ?, efficiency = ?
        WHERE id = ?
      `);
            const now = Date.now();

            // Placeholder for fuel used since we didn't track "lastFuel" property yet. 
            // I'll update the class to track `lastFuel` in the next edit or just pass 0 for now.
            endStmt.run(
                now, now, Math.round(score),
                distanceKm, Math.round(this.sessionCoastTime),
                fuelUsed, efficiency,
                this.currentSessionId
            );

            this.emit('session-stopped', { id: this.currentSessionId, score });
        } catch (e) {
            console.error('Failed to stop session:', e);
        }

        this.isRecording = false;
        this.currentSessionId = null;
        return id;
    }

    private flushBuffer() {
        if (!this.currentSessionId || this.buffer.length === 0) return;

        // Bulk insert
        // better-sqlite3 is synchronous, so this blocks. 
        // For high performance, we might want to do this in a worker or keep batch size small enough.
        // 60 rows is very fast.

        const insertMany = db.transaction((rows: TelemetryData[]) => {
            for (const row of rows) {
                this.insertStatement.run({
                    session_id: this.currentSessionId,
                    timestamp: row.timestamp,
                    speed: row.speed,
                    rpm: row.rpm,
                    gear: row.gear,
                    throttle: row.throttle,
                    brake: row.brake,
                    clutch: row.clutch || 0,
                    steering: row.steering,
                    gForceX: row.gForceX || 0,
                    gForceY: row.gForceY || 0,
                    gForceZ: row.gForceZ || 0,
                    fuel: row.fuel || 0,
                    engineTemp: row.engineTemp || 0,
                    pos_x: row.posX || 0,
                    pos_y: row.posY || 0,
                    pos_z: row.posZ || 0,
                    throttle_delta: row.throttleDelta || 0,
                    brake_delta: row.brakeDelta || 0,
                    steering_delta: row.steeringDelta || 0,
                    speed_delta: row.speedDelta || 0,
                    gforce_combined: row.gforceCombined || 0,
                    slip_angle_estimate: row.slipAngleEstimate || 0,
                    is_coasting: row.isCoasting || 0,
                    is_wots: row.isWots || 0,
                    is_braking: row.isBraking || 0,
                    is_turning: row.isTurning || 0,
                    jerk_x: row.jerkX || 0,
                    jerk_y: row.jerkY || 0,
                    distance_traveled: row.distanceTraveled || 0,
                    turn_radius: row.turnRadius || 0,
                    pedal_overlap: row.pedalOverlap || 0,
                    is_trail_braking: row.isTrailBraking || 0,
                    oversteer_correction: row.oversteerCorrection || 0,
                    understeer_plough: row.understeerPlough || 0,
                    coasting_time_pct: row.coastingTimePct || 0,
                    brake_bias_utilization: row.brakeBiasUtilization || 0
                });
            }
        });

        try {
            insertMany(this.buffer);
            this.buffer = [];
        } catch (e) {
            console.error('Failed to flush telemetry buffer:', e);
        }
    }
}
