import { EventEmitter } from 'events';
import type { TelemetryData } from '../src/types/telemetry.js';

export interface GameConnector extends EventEmitter {
    start(): void;
    stop(): void;
    readonly name: string;
}
