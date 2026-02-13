import { EventEmitter } from 'events';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MockConnector extends EventEmitter implements GameConnector {
    public readonly name = 'Simulation Mode';
    private isRunning = false;
    private interval: NodeJS.Timeout | null = null;

    // Load static data
    private sessionData: TelemetryData[] = [];
    private currentIndex = 0;

    constructor() {
        super();
        this.loadData();
    }

    private loadData() {
        try {
            const pathsToTry = [
                path.join(__dirname, 'simulated-session.json'),
            ];

            // In packaged app, we use extraResources which puts the file in resources/simulated-session.json
            if (app && app.isPackaged) {
                pathsToTry.unshift(path.join(process.resourcesPath, 'simulated-session.json'));
            } else if (app) {
                // Dev mode fallback
                pathsToTry.push(path.join(app.getAppPath(), 'dist-electron', 'electron', 'game-connectors', 'simulated-session.json'));
                pathsToTry.push(path.join(app.getAppPath(), 'electron', 'game-connectors', 'simulated-session.json'));
            }

            let dataPath = '';
            for (const p of pathsToTry) {
                if (fs.existsSync(p)) {
                    dataPath = p;
                    break;
                }
            }

            if (dataPath) {
                console.log(`[Mock] Loading data from: ${dataPath}`);
                this.sessionData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            } else {
                console.error('[Mock] Data file not found. Tried:', pathsToTry);
            }
        } catch (e) {
            console.error('[Mock] Failed to load mock data:', e);
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
