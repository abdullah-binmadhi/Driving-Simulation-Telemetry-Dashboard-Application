import { EventEmitter } from 'events';
import { app } from 'electron';
import db from './database/db.js';
import type { TelemetryData } from '../src/types/telemetry.js';

export class SessionManager extends EventEmitter {
    private currentSessionId: number | null = null;
    private buffer: TelemetryData[] = [];
    private readonly BATCH_SIZE = 60; // Insert every ~1 second if 60Hz
    private lastActivityTime: number = Date.now();
    private isRecording = false;
    private manualStartRequested = false;


    // Session Stats
    private sessionCoastTime = 0;
    private sessionDistance = 0;
    private startFuel = 0;
    private lastFuel = 0;
    private lastTimestamp = 0;

    constructor() {
        super();
    }

    public processData(data: TelemetryData) {
        // Start session only if manually requested and we have valid data
        if (!this.isRecording && this.manualStartRequested && data.speed > -1) {
            this.startSession(data);
            this.manualStartRequested = false;
        }

        if (this.isRecording) {
            this.buffer.push(data);

            // Stats Calculation
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
        this.startFuel = data.fuel || 0;
        this.lastFuel = this.startFuel;
        this.lastTimestamp = data.timestamp;

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

        const insert = db.prepare(`
      INSERT INTO telemetry (
        session_id, timestamp, speed, rpm, gear, throttle, brake, steering, 
        gForceX, gForceY, gForceZ, fuel, engineTemp
      ) VALUES (
        @session_id, @timestamp, @speed, @rpm, @gear, @throttle, @brake, @steering,
        @gForceX, @gForceY, @gForceZ, @fuel, @engineTemp
      )
    `);

        const insertMany = db.transaction((rows: TelemetryData[]) => {
            for (const row of rows) {
                insert.run({
                    session_id: this.currentSessionId,
                    timestamp: row.timestamp,
                    speed: row.speed,
                    rpm: row.rpm,
                    gear: row.gear,
                    throttle: row.throttle,
                    brake: row.brake,
                    steering: row.steering,
                    gForceX: row.gForceX || 0,
                    gForceY: row.gForceY || 0,
                    gForceZ: row.gForceZ || 0,
                    fuel: row.fuel || 0,
                    engineTemp: row.engineTemp || 0
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
