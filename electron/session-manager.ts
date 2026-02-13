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

    constructor() {
        super();
    }

    public processData(data: TelemetryData) {
        // Auto-start session if moving and not recording
        if (!this.isRecording && data.speed > 5) {
            this.startSession(data);
        }

        if (this.isRecording) {
            this.buffer.push(data);
            this.lastActivityTime = Date.now();

            if (this.buffer.length >= this.BATCH_SIZE) {
                this.flushBuffer();
            }

            // Auto-stop if idle for 30 seconds
            // Note: This check depends on how often processData is called.
            // If game pauses, we might not get data. 
            // Ideally we check this via a separate interval or rely on data stream.
        }
    }

    private startSession(data: TelemetryData) {
        console.log('Starting new session...');
        this.isRecording = true;
        try {
            const stmt = db.prepare(`
        INSERT INTO sessions (game, vehicle, start_time, notes)
        VALUES (?, ?, ?, ?)
      `);
            // We don't have vehicle info in TelemetryData yet, maybe extract from somewhere or default
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
        if (!this.isRecording || !this.currentSessionId) return;

        console.log('Stopping session...');
        this.flushBuffer();

        try {
            // Update session end time and stats
            // Calculate simple score: 100 - (harsh events count * penalty)
            // For now, let's just use a placeholder random score or based on avg speed for testing
            const score = Math.min(100, Math.max(0, 100 - Math.random() * 20)); // Placeholder

            const endStmt = db.prepare(`
        UPDATE sessions 
        SET end_time = ?, duration = ? - start_time, score = ?
        WHERE id = ?
      `);
            const now = Date.now();
            endStmt.run(now, now, Math.round(score), this.currentSessionId);

            this.emit('session-stopped', { id: this.currentSessionId, score });
        } catch (e) {
            console.error('Failed to stop session:', e);
        }

        this.isRecording = false;
        this.currentSessionId = null;
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
