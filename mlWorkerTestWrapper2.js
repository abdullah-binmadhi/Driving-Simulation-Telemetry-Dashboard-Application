import { RandomForestRegression } from 'ml-random-forest';
import KNN from 'ml-knn';
import { PCA } from 'ml-pca';
import SVM from 'ml-svm';
import { kmeans } from 'ml-kmeans';
import MLR from 'ml-regression-multivariate-linear';

console.log("Mocking worker...");
global.self = { postMessage: (m) => console.log("Worker posted:", m.type) };

const originalMin = Math.min;
Math.min = function(...args) {
    if (args.length === 0) {
        console.trace("Empty Math.min called!");
    }
    return originalMin.apply(this, args);
};

const rawData = [];
// Simulate edge case, e.g. very short data but >= 50
for(let i = 0; i < 55; i++) {
    rawData.push({ timestamp: i * 16, speed: 50, throttle: 20, brake: i%2===0?0:20, steering: 0 });
}

const e = { data: { type: 'ANALYZE_SESSION', payload: { sessionArray: rawData } } };

const workerFn = async (e) => {
    try {
        const rawData = e.data.payload.sessionArray;

        const validData = rawData.filter((d) => 
            d.speed !== undefined && !isNaN(d.speed) &&
            d.throttle !== undefined && !isNaN(d.throttle) &&
            d.brake !== undefined && !isNaN(d.brake) &&
            d.steering !== undefined && !isNaN(d.steering)
        );

        if (validData.length < 50) {
            self.postMessage({ type: 'ERROR', error: 'Not enough valid numerical rows for ML.' });
            return;
        }

        const timestamps = validData.map(d => Number(d.timestamp) || 0);
        const speeds = validData.map(d => Math.min(Math.max((Number(d.speed) || 0), 0), 300));
        const throttles = validData.map(d => Number(d.throttle) || 0);
        const brakes = validData.map(d => Number(d.brake) || 0);
        const steerings = validData.map(d => {
            const s = Number(d.steering) || 0;
            return (s > 1 || s < -1) ? s / 360 : s; 
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
        for (let i = 0; i < speeds.length; i++) {
            xSafety.push([speeds[i], throttles[i], brakes[i], steerings[i], jerks[i]]);
            yCost.push([0]);
        }

        new MLR(xSafety, yCost);

        const means = [];
        const stds = [];
        for (let col = 0; col < 5; col++) {
             const colVals = xSafety.map(row => row[col]);
             const mean = colVals.reduce((a, b) => a + b, 0) / colVals.length;
             const std = Math.sqrt(colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / colVals.length) || 1;
             means.push(mean);
             stds.push(std);
        }
        
        const pcaDataMatrix = xSafety.map(row => row.map((val, col) => (val - means[col]) / stds[col]));
        const pca = new PCA(pcaDataMatrix);
        const reduced = pca.predict(pcaDataMatrix).to2DArray();

        const svmX = [];
        const svmY = [];
        for (let i = 0; i < throttles.length; i += 5) { // With 55 elements, i=0,5,10...50 -> 11 elements
            const isOverlap = (throttles[i] > 10 && brakes[i] > 10) ? 1 : -1;
            svmX.push([throttles[i], brakes[i]]);
            svmY.push(isOverlap);
        }

        const svm = new SVM({ kernel: 'linear' });
        svm.train(svmX, svmY);

        const kmeansData = [];
        const maxSpeed = Math.max(...speeds) || 1;
        const maxSteerAbs = Math.max(...steerings.map(Math.abs)) || 1;
        const maxJerk = Math.max(...jerks) || 1;

        for (let i = 0; i < speeds.length; i += 10) { // With 55 elements, i=0,10,20,30,40,50 -> 6 elements
            kmeansData.push([ (speeds[i] || 0) / maxSpeed, Math.abs(steerings[i] || 0) / maxSteerAbs, (jerks[i] || 0) / maxJerk ]);
        }
        kmeans(kmeansData, 4, { initialization: 'kmeans++' });

        const rfFeatures = [];
        const rfTargets = [];
        for (let i = 0; i < speeds.length; i += 5) {
            rfFeatures.push([speeds[i] || 0, Math.abs(steerings[i] || 0), jerks[i] || 0]);
            rfTargets.push(0.01);
        }
        const rfConfig = new RandomForestRegression({ seed: 42, maxFeatures: 2, replacement: true, nEstimators: 10 });
        rfConfig.train(rfFeatures, rfTargets);

        const knnTrainX = [[-15,-5],[-12,0],[-5,-2],[-2,5],[5,-5],[10,0],[15,5],[20,10]];
        const knnTrainY = [0,0,1,1,2,2,3,3];
        const knn = new KNN(knnTrainX, knnTrainY, { k: 2 });
        const sessionAvgX = reduced.reduce((sum, r) => sum + r[0], 0) / reduced.length;
        const sessionAvgY = reduced.reduce((sum, r) => sum + r[1], 0) / reduced.length;
        knn.predict([sessionAvgX, sessionAvgY]);

        console.log("Success");
    } catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e.stack);
    }
};

workerFn(e);
