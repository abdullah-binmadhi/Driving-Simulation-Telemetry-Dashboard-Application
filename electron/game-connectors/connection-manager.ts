import { EventEmitter } from 'events';
import { BeamNGConnector } from './beamng';
import { AssettoCorsaConnector } from './assetto-corsa';
import { GameConnector } from '../../src/types/connector';
import type { TelemetryData } from '../../src/types/telemetry';

export class ConnectionManager extends EventEmitter {
    private connectors: GameConnector[] = [];
    private activeGame: string | null = null;

    constructor() {
        super();
        this.connectors = [
            new BeamNGConnector(),
            new AssettoCorsaConnector()
        ];
    }

    start() {
        this.connectors.forEach(connector => {
            connector.start();

            connector.on('data', (data: TelemetryData) => {
                // Simple auto-detection: if we get data, that's the active game
                if (this.activeGame && this.activeGame !== connector.name) {
                    // Switching games? Or multiple running?
                    // For now, let's just accept data from any.
                }
                this.activeGame = connector.name;
                this.emit('data', data);
            });

            connector.on('status', (status) => {
                this.emit('status', { game: connector.name, status });
            });
        });
    }

    stop() {
        this.connectors.forEach(c => c.stop());
    }
}
