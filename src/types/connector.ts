import { EventEmitter } from 'events';
import { TelemetryData } from './telemetry';

export interface GameConnector extends EventEmitter {
    start(): void;
    stop(): void;
    readonly name: string;
}
