const fs = require('fs');
const path = require('path');

// Simulation parameters
const TOTAL_SECONDS = 60; // 1 minute loop
const FPS = 60;
const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

const data = [];

// Physics State
let speed = 0;
let rpm = 800;
let gear = 0; // 0=N, 1=1st
let throttle = 0;
let brake = 0;
let distance = 0;

// Tire State [FL, FR, RL, RR]
let tireTemps = [80, 80, 80, 80]; // Celsius
let tireWear = [1.0, 1.0, 1.0, 1.0]; // 1.0 = 100% Health

// Timing
let lapTime = 0;

function updatePhysics() {
    // Simple acceleration logic
    if (throttle > 0) {
        rpm += throttle * 100;
        speed += throttle * 0.5;
    } else {
        rpm -= 50;
        speed -= 0.2;
    }

    // Braking
    if (brake > 0) {
        speed -= brake * 1.5;
        rpm -= 100;
        // Brake heats up tires slightly
        tireTemps = tireTemps.map(t => t + brake * 0.1);
    }

    // Drag / Cooling
    rpm = Math.max(800, Math.min(rpm, 7500));
    speed = Math.max(0, Math.min(speed, 200));

    // Tire Cooling
    tireTemps = tireTemps.map(t => Math.max(80, t - 0.05));

    // Cornering simulation (G-Force effects on tires)
    const time = data.length / FPS;
    const steering = Math.sin(time) * 0.5;
    const gForceX = steering * (speed / 50);
    const gForceY = throttle - brake; // Simplified

    // Tire Wear Logic (wear down slightly when moving/turning)
    if (speed > 10) {
        const wearAmount = 0.00001 + (Math.abs(gForceX) * 0.00005);
        tireWear = tireWear.map(w => Math.max(0, w - wearAmount));

        // Heat tires when turning
        if (Math.abs(gForceX) > 0.5) {
            const load = Math.abs(gForceX);
            if (gForceX > 0) {
                // Turning Right -> Load on Left tires
                tireTemps[0] += load * 0.2; // FL
                tireTemps[2] += load * 0.2; // RL
            } else {
                // Turning Left -> Load on Right tires
                tireTemps[1] += load * 0.2; // FR
                tireTemps[3] += load * 0.2; // RR
            }
        }
    }

    // Shifting
    if (rpm > 7000 && gear < 6) {
        gear++;
        rpm = 4500;
    } else if (rpm < 3000 && gear > 1) {
        gear--;
        rpm = 6000;
    }

    // Lap Timing
    lapTime += 1000 / FPS; // ms
    if (lapTime > 90000) lapTime = 0; // Reset every 90s (mock lap)

    return {
        game: 'Simulation',
        timestamp: 0, // Will be offset at runtime
        speed: speed,
        rpm: Math.floor(rpm),
        gear: gear,
        throttle: throttle,
        brake: brake,
        clutch: 0,
        steering: steering,
        gForceX: gForceX,
        gForceY: gForceY,
        gForceZ: 0,
        fuel: 45.5 - (data.length * 0.001), // Consuming fuel
        engineTemp: 90 + (rpm / 7500) * 10,
        oilTemp: 100 + (rpm / 7500) * 5,
        tireTemp: [...tireTemps],
        tireWear: [...tireWear],
        lapTime: lapTime,
        bestLap: 85400, // 1:25.400 static best
    };
}

// Generate loop
for (let i = 0; i < TOTAL_FRAMES; i++) {
    // Scripted behavior
    const t = i / FPS;

    // Accelerate for 10s
    if (t < 10) {
        throttle = 1;
        brake = 0;
    }
    // Brake for turn
    else if (t < 12) {
        throttle = 0;
        brake = 0.8;
    }
    // Turn and Accelerate
    else if (t < 20) {
        throttle = 0.7;
        brake = 0;
    }
    // Coast
    else if (t < 25) {
        throttle = 0;
        brake = 0;
    }
    // Random inputs
    else {
        throttle = (Math.sin(t) + 1) / 2;
        brake = 0;
    }

    data.push(updatePhysics());
}

const outputPath = path.join(__dirname, 'simulated-session.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`Generated ${data.length} frames of mock data to ${outputPath}`);
