export interface TelemetryData {
    game: string;
    timestamp: number;

    // Physics
    speed: number;       // km/h
    rpm: number;
    gear: number;        // 0 = R, 1 = N, 2 = 1st, etc. (or standard: 0=R, 1=N, 2=1...)
    // Actually, let's standardize: -1=R, 0=N, 1=1st...
    throttle: number;    // 0.0 - 1.0
    brake: number;       // 0.0 - 1.0
    clutch: number;      // 0.0 - 1.0
    steering: number;    // -1.0 (left) to 1.0 (right)

    // G-Forces
    gForceX: number;     // Lateral
    gForceY: number;     // Longitudinal
    gForceZ: number;     // Vertical

    // Optional / Game dependent
    fuel?: number;
    engineTemp?: number;
    oilTemp?: number;

    // Tires (FL, FR, RL, RR)
    tireTemp?: [number, number, number, number];
    tireWear?: [number, number, number, number]; // 0.0 - 1.0 (1.0 = 100% wear/dead or 100% health? usually 100% health in sims, let's assume 1.0 = New)

    // Timing
    lapTime?: number;    // Current lap time in ms
    lastLap?: number;
    bestLap?: number;

    // Position (if available)
    posX?: number;
    posY?: number;
    posZ?: number;
}
