import { EventEmitter } from 'events';
import { BeamNGConnector } from './beamng.js';
import { AssettoCorsaConnector } from './assetto-corsa.js';
import { MockConnector } from './mock.js';
import { GameConnector } from '../connector-interface.js';
import type { TelemetryData } from '../../src/types/telemetry.js';

export class ConnectionManager extends EventEmitter {
    private connectors: GameConnector[] = [];
    private mockConnector: MockConnector;
    private activeGame: string | null = null;
    private isSimulationMode = false;

    constructor() {
        super();
        this.mockConnector = new MockConnector();
        this.connectors = [
            new BeamNGConnector(),
            new AssettoCorsaConnector()
        ];
    }

    start() {
        this.setupConnector(this.mockConnector);
        this.connectors.forEach(c => this.setupConnector(c));

        // Start normal connectors by default
        if (!this.isSimulationMode) {
            this.connectors.forEach(c => c.start());
        } else {
            this.mockConnector.start();
        }
    }

    private setupConnector(connector: GameConnector) {
        connector.on('data', (data: TelemetryData) => {
            // Priority Check
            if (this.isSimulationMode && connector.name !== 'Simulation Mode') return;
            if (!this.isSimulationMode && connector.name === 'Simulation Mode') return;

            // Simple auto-detection for normal mode
            if (!this.isSimulationMode) {
                if (this.activeGame && this.activeGame !== connector.name) {
                    // Conflict resolution could go here
                }
                this.activeGame = connector.name;
            } else {
                this.activeGame = 'Simulation';
            }

            this.emit('data', data);
        });

        connector.on('status', (status) => {
            this.emit('status', { game: connector.name, status });
        });
    }

    setSimulationMode(enabled: boolean) {
        if (this.isSimulationMode === enabled) return;

        console.log(`Switching Simulation Mode: ${enabled}`);
        this.isSimulationMode = enabled;

        if (enabled) {
            // Stop real, start mock
            this.connectors.forEach(c => c.stop());
            this.mockConnector.start();
        } else {
            // Stop mock, start real
            this.mockConnector.stop();
            this.connectors.forEach(c => c.start());
        }
    }

    stop() {
        this.mockConnector.stop();
        this.connectors.forEach(c => c.stop());
    }

    setSimulationTransmission(type: 'automatic' | 'manual') {
        if (this.mockConnector) {
            this.mockConnector.setTransmissionType(type);
        }
    }
}
