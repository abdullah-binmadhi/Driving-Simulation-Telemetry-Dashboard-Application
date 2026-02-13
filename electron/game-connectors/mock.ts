import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MockConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Simulation Mode';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    // Load static data
    // In a real app we might load this async, here we just require it or import it.
    // We'll use fs to read it to ensure it's fresh.
    private sessionData: TelemetryData[] = [];
    private currentIndex = 0;

    constructor() {
        super();
        this.loadData();
    }

    private loadData() {
        try {
            // We use a relative path. In production, this needs care, but for dev:
            // This is a simple require since we are in Electron/Node
            const dataPath = path.join(__dirname, 'simulated-session.json');
            // Check if file exists, if not, fallback to empty or generate
            if (fs.existsSync(dataPath)) {
                this.sessionData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            } else {
                console.error('Mock data file not found:', dataPath);
            }
        } catch (e) {
            console.error('Failed to load mock data:', e);
        }
    }

    start() {
        if (this.isRunning) return;

        console.log('[Mock] Starting Simulation Replay...');
        console.log(`[Mock] Loaded ${this.sessionData.length} frames.`);

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
        if (this.sessionData.length === 0) return;

        const frame = this.sessionData[this.currentIndex];

        // Update timestamp to be "now"
        const liveFrame = {
            ...frame,
            timestamp: Date.now()
        };

        this.emit('data', liveFrame);

        // Advance cursor
        this.currentIndex++;
        if (this.currentIndex >= this.sessionData.length) {
            this.currentIndex = 0; // Loop
        }
    }
}
