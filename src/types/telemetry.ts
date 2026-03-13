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
    tireTemp?: [number, number, number, number];    // Core temperature (°C)
    tireSurfaceTemp?: [number, number, number, number]; // Surface temperature (°C)
    tireWear?: [number, number, number, number];    // 0.0 - 1.0 (1.0 = New)
    tirePressure?: [number, number, number, number]; // PSI

    // Timing
    lapTime?: number;    // Current lap time in ms
    lastLap?: number;
    bestLap?: number;

    // Car Health (0.0 - 1.0, where 1.0 is 100%)
    carDamage?: {
        engine: number;
        transmission: number;
        suspension: number;
        brakes: number;
        aero: number;
    };

    // Position (if available)
    posX?: number;
    posY?: number;
    posZ?: number;

    // Derived Machine Learning Features (Calculated in backend)
    throttleDelta?: number;
    brakeDelta?: number;
    steeringDelta?: number;
    speedDelta?: number;
    gforceCombined?: number;
    slipAngleEstimate?: number;

    // Advanced Kinematics & Driver Behavior
    jerkX?: number;             // Rate of change of Lateral G (Smoothness)
    jerkY?: number;             // Rate of change of Longitudinal G
    distanceTraveled?: number;   // Cumulative meters in the session
    turnRadius?: number;         // Estimated corner radius based on speed & Lat G
    pedalOverlap?: number;       // Throttle * Brake 

    // Categorical ML Flags (1 or 0)
    isCoasting?: number;
    isWots?: number;
    isBraking?: number;
    isTurning?: number;
    isTrailBraking?: number;

    // Complex Driver Behavioral States
    oversteerCorrection?: number;
    understeerPlough?: number;
    coastingTimePct?: number;
    brakeBiasUtilization?: number;
}
