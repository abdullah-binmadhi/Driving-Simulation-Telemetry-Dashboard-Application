import { RandomForestRegression } from 'ml-random-forest';
import KNN from 'ml-knn';
import { PCA } from 'ml-pca';
import SVM from 'ml-svm';
import { kmeans } from 'ml-kmeans';
import MLR from 'ml-regression-multivariate-linear';

console.log("Mocking worker...");
global.self = {
    postMessage: (m) => console.log("Worker posted:", m.type),
};

const rawData = [];
for(let i = 0; i < 60; i++) {
    // Generate a perfectly smooth normal driving line
    rawData.push({
        timestamp: i * 16,
        speed: 50,
        throttle: 20,
        brake: 0,
        steering: 0
    });
}

const e = {
    data: {
        type: 'ANALYZE_SESSION',
        payload: {
            sessionArray: rawData
        }
    }
};

// Paste the worker function here:
const workerFn = async (e) => {
    try {
        const rawData = e.data.payload.sessionArray;

        const validData = rawData;
        const timestamps = validData.map(d => Number(d.timestamp) || 0);
        const speeds_unclamped = validData.map(d => Number(d.speed) || 0);
        const speeds = speeds_unclamped.map(s => Math.min(Math.max(s, 0), 300));

        const throttles = validData.map(d => Number(d.throttle) || 0);
        const brakes = validData.map(d => Number(d.brake) || 0);
        const steerings_unclamped = validData.map(d => Number(d.steering) || 0);
        const steerings = steerings_unclamped.map(s => {
            if (s > 1 || s < -1) return s / 360; 
            return s; 
        });

        const jerks = [0];
        const accelerations = [0];
        for (let i = 1; i < speeds.length; i++) {
            const dt = (timestamps[i] - timestamps[i - 1]) / 1000 || 0.016;
            const a1 = (speeds[i] - speeds[i - 1]) / dt;
            accelerations.push(a1);
            const a0 = i > 1 ? (speeds[i - 1] - speeds[i - 2]) / dt : 0;
            jerks.push(Math.abs((a1 - a0) / dt) || 0);
        }

        const xSafety = [];
        const yCost = [];
        let totalDeductions = 0;
        let deductionsDetail = new Set();

        const S_THRESH = 130;
        const J_THRESH = 20;

        for (let i = 0; i < speeds.length; i++) {
            xSafety.push([speeds[i], throttles[i], brakes[i], steerings[i], jerks[i]]);
            let cost = 0;
            if (speeds[i] > S_THRESH) { cost += 2; }
            if (jerks[i] > J_THRESH) { cost += 3; }
            if (i > 0 && Math.abs(steerings[i] - steerings[i - 1]) > 0.5) { cost += 1; }
            yCost.push([cost]);
            totalDeductions += cost;
        }

        console.log("Testing MLR");
        const mlr = new MLR(xSafety, yCost);

        const means = [];
        const stds = [];
        for (let col = 0; col < 5; col++) {
             const colVals = xSafety.map(row => row[col]);
             const mean = colVals.reduce((a, b) => a + b, 0) / colVals.length;
             const std = Math.sqrt(colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / colVals.length) || 1;
             means.push(mean);
             stds.push(std);
        }
        
        console.log("Testing PCA");
        const pcaDataMatrix = xSafety.map(row => row.map((val, col) => (val - means[col]) / stds[col]));
        const pca = new PCA(pcaDataMatrix);
        const reduced = pca.predict(pcaDataMatrix).to2DArray();

        console.log("Testing SVM");
        let overlapEvents = 0;
        const svmX = [];
        const svmY = [];
        for (let i = 0; i < throttles.length; i += 5) {
            const isOverlap = (throttles[i] > 10 && brakes[i] > 10) ? 1 : -1;
            svmX.push([throttles[i], brakes[i]]);
            svmY.push(isOverlap);
            if (isOverlap === 1) overlapEvents++;
        }

        const svm = new SVM({ kernel: 'linear' });
        svm.train(svmX, svmY);

        console.log("Testing KMeans");
        const kmeansData = [];
        const maxSpeed = Math.max(...speeds) || 1;
        const maxSteerAbs = Math.max(...steerings.map(Math.abs)) || 1;
        const maxJerk = Math.max(...jerks) || 1;

        for (let i = 0; i < speeds.length; i += 10) {
            kmeansData.push([
                (speeds[i] || 0) / maxSpeed,
                Math.abs(steerings[i] || 0) / maxSteerAbs,
                (jerks[i] || 0) / maxJerk
            ]);
        }

        const ans = kmeans(kmeansData, 4, { initialization: 'kmeans++' });

        console.log("Testing Random Forest");
        const rfFeatures = [];
        const rfTargets = [];
        
        for (let i = 0; i < speeds.length; i += 5) {
            rfFeatures.push([speeds[i] || 0, Math.abs(steerings[i] || 0), jerks[i] || 0]);
            rfTargets.push(0.01);
        }
        
        const rfConfig = new RandomForestRegression({ seed: 42, maxFeatures: 2, replacement: true, nEstimators: 10 });
        rfConfig.train(rfFeatures, rfTargets);

        console.log("Testing KNN");
        const knownDrivers = [
            { x: -15, y: -5, label: "Smooth Professional" },
            { x: -12, y: 0, label: "Smooth Professional" },
            { x: -5, y: -2, label: "Cautious Amateur" },
            { x: -2, y: 5, label: "Cautious Amateur" },
            { x: 5, y: -5, label: "Aggressive Amateur" },
            { x: 10, y: 0, label: "Aggressive Amateur" },
            { x: 15, y: 5, label: "Erratic Novice" },
            { x: 20, y: 10, label: "Erratic Novice" }
        ];
        
        const knnTrainX = knownDrivers.map(d => [d.x, d.y]);
        const labelMap = ["Smooth Professional", "Cautious Amateur", "Aggressive Amateur", "Erratic Novice"];
        const knnTrainY = knownDrivers.map(d => labelMap.indexOf(d.label));
        
        const knn = new KNN(knnTrainX, knnTrainY, { k: 2 });

        console.log("Success");
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e.stack);
    }
};

workerFn(e);
