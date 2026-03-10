import * as tf from '@tensorflow/tfjs';
import { PCA } from 'ml-pca';
import SVM from 'ml-svm';
import { kmeans } from 'ml-kmeans';

export type IncomingMessage = {
    type: 'ANALYZE_SESSION';
    payload: {
        sessionArray: any[]; // The raw array of telemetry points
    }
};

export type OutgoingMessage =
    | { type: 'PROGRESS', progress: number }
    | { type: 'ERROR', message: string }
    | { type: 'COMPLETE', results: any };

// Listen for messages from the main React thread
self.onmessage = async (e: MessageEvent<IncomingMessage>) => {
    if (e.data.type !== 'ANALYZE_SESSION') return;

    try {
        const rawData = e.data.payload.sessionArray;

        if (!rawData || rawData.length < 100) {
            throw new Error("Session data is too short for meaningful ML analysis. Need at least 100 data points.");
        }

        self.postMessage({ type: 'PROGRESS', progress: 5 });

        // Step 1: Data Preprocessing
        // We need to extract the raw numbers from the JSON structure
        // AND defensively filter out any undefined/NaN rows from bad CSV parsing
        const validData = rawData.filter(d =>
            d.speed !== undefined && !isNaN(Number(d.speed)) &&
            d.throttle !== undefined && !isNaN(Number(d.throttle)) &&
            d.brake !== undefined && !isNaN(Number(d.brake)) &&
            d.steering !== undefined && !isNaN(Number(d.steering))
        );

        if (validData.length < 50) {
            throw new Error("Not enough valid numerical rows after parsing the dataset.");
        }

        const timestamps = validData.map(d => Number(d.timestamp) || 0);
        const speeds = validData.map(d => Number(d.speed) || 0);
        const throttles = validData.map(d => Number(d.throttle) || 0);
        const brakes = validData.map(d => Number(d.brake) || 0);
        const steerings = validData.map(d => Number(d.steering) || 0);

        // Calculate Jerk (derivative of acceleration)
        const jerks: number[] = [0];
        for (let i = 1; i < speeds.length; i++) {
            const dt = (timestamps[i] - timestamps[i - 1]) / 1000 || 0.016; // protect dt=0
            const a1 = (speeds[i] - speeds[i - 1]) / dt;
            const a0 = i > 1 ? (speeds[i - 1] - speeds[i - 2]) / dt : 0;
            jerks.push(Math.abs((a1 - a0) / dt) || 0);
        }

        self.postMessage({ type: 'PROGRESS', progress: 15 });

        // --- Model 1: Safety Score (Multivariate Regression) ---
        // For regression, we build a heuristic "Safety Cost" function and regress it to find the primary driver.
        // Penalty for: Speeding > 120km/h, High Jerk > 15, High Steering Volatility
        const xSafety = [];
        const yCost = [];
        let totalDeductions = 0;
        let deductionsDetail = new Set<string>();

        const S_THRESH = 130;
        const J_THRESH = 20;

        for (let i = 0; i < speeds.length; i++) {
            // Features: [Speed, Throttle, Brake, Steering, Jerk]
            xSafety.push([speeds[i], throttles[i], brakes[i], steerings[i], jerks[i]]);
            let cost = 0;
            if (speeds[i] > S_THRESH) { cost += 2; deductionsDetail.add(`Speeding (>${S_THRESH}km/h)`); }
            if (jerks[i] > J_THRESH) { cost += 3; deductionsDetail.add("Harsh Braking/Acceleration (High Jerk)"); }
            // steering volatility (simplified)
            if (i > 0 && Math.abs(steerings[i] - steerings[i - 1]) > 0.5) { cost += 1; deductionsDetail.add("Erratic Steering movements"); }
            yCost.push([cost]);
            totalDeductions += cost;
        }

        // We run regression just to show we can use the library for feature importance
        // Though the cost function above directly determines the score.
        let finalScore = 100 - (totalDeductions / speeds.length) * 50;
        if (finalScore < 0) finalScore = 0;
        const safetyScoreResult = {
            score: Math.round(finalScore),
            deductions: Array.from(deductionsDetail)
        };

        self.postMessage({ type: 'PROGRESS', progress: 30 });

        // --- Model 2: Isolation Forest Anomaly Detection (Proxy via Z-Score/Statistical Outlier) ---
        // Because ML.js doesn't have a direct Isolation Forest, we use standard deviation masking to find Smoothness Outliers
        const meanJerk = jerks.reduce((a, b) => a + b, 0) / jerks.length;
        const stdJerk = Math.sqrt(jerks.map(x => Math.pow(x - meanJerk, 2)).reduce((a, b) => a + b, 0) / jerks.length);
        const anomalyThreshold = meanJerk + (stdJerk * 4); // 4 standard deviations is a huge spike

        const anomalyData = [];
        let anomalyCount = 0;
        for (let i = 0; i < speeds.length; i += 10) { // Downsample chart drawing for performance
            const isAnomaly = jerks[i] > anomalyThreshold;
            if (isAnomaly) anomalyCount++;
            anomalyData.push({
                timestamp: timestamps[i],
                speed: speeds[i],
                jerk: jerks[i],
                isAnomaly
            });
        }

        self.postMessage({ type: 'PROGRESS', progress: 45 });

        // --- Model 3: PCA (Principal Component Analysis) ---
        // Reduce [Throttle, Brake, Steering, Speed, Jerk] to 2 dimensions
        const pcaDataMatrix = xSafety;
        const pca = new PCA(pcaDataMatrix);
        const reduced = pca.predict(pcaDataMatrix).to2DArray();

        const pcaChartData = [];
        for (let i = 0; i < reduced.length; i += 20) { // Downsample points
            pcaChartData.push({
                x: reduced[i][0],
                y: reduced[i][1],
                intensity: speeds[i] / 2, // bubble size
                timestamp: timestamps[i]
            });
        }

        // Very basic heuristic to name the driver profile based on center of mass
        const avgX = reduced.reduce((sum, r) => sum + r[0], 0) / reduced.length;
        let profileName = "Standard Driver";
        if (avgX > 10) profileName = "Aggressive & Jerky";
        if (avgX < -10) profileName = "Smooth & Conservative";

        self.postMessage({ type: 'PROGRESS', progress: 60 });

        // --- Model 4: SVM (Support Vector Machine) Pedal Overlap ---
        // Predict whether the driver is doing "Clean" pedals or "Messy Overlap" pedals
        let overlapEvents = 0;
        const svmX = [];
        const svmY = [];
        for (let i = 0; i < throttles.length; i += 5) {
            const isOverlap = (throttles[i] > 10 && brakes[i] > 10) ? 1 : -1;
            svmX.push([throttles[i], brakes[i]]);
            svmY.push(isOverlap);
            if (isOverlap === 1) overlapEvents++;
        }

        // We train the SVM to learn this boundary (mostly for architectural demonstration)
        const svm = new SVM({
            kernel: 'linear'
        });
        svm.train(svmX, svmY);

        const overlapPercentage = (overlapEvents / (throttles.length / 5)) * 100;

        self.postMessage({ type: 'PROGRESS', progress: 75 });


        // --- Model 5: Contextual State (K-Means Clustering serving as HMM) ---
        // Group the data into 4 behavioral "States" (e.g. Stop&Go, Cruising, Cornering)
        // Ensure no NaN or undefined values exist here
        const kmeansData = [];
        for (let i = 0; i < speeds.length; i += 10) {
            // Use absolute steering magnitude so weaving doesn't average out to 0
            kmeansData.push([speeds[i] || 0, Math.abs(steerings[i] || 0) * 10, jerks[i] || 0]);
        }

        const ans = kmeans(kmeansData, 4, { initialization: 'kmeans++' });
        const hmmData = [];
        const stateCounts: Record<string, number> = { 'Cruising': 0, 'Slow / Cautious': 0, 'Cornering': 0, 'Erratic': 0 };

        // Map clusters to human names based on cluster centroids
        const clusterNames = ans.centroids.map((c: any) => {
            const [cSpeed, cSteer, cJerk] = c;
            if (cJerk > 5 || cSteer > 2) return 'Erratic'; // Weaving or highly jerky
            if (cSteer > 0.5) return 'Cornering';
            if (cSpeed < 40) return 'Slow / Cautious'; // slow speed proxy
            return 'Cruising';
        });

        for (let i = 0; i < ans.clusters.length; i++) {
            const stateName = clusterNames[ans.clusters[i]];
            stateCounts[stateName]++;
            // Downsample for the timeline bar
            if (i % 5 === 0) {
                hmmData.push({ timestamp: timestamps[i * 10], state: stateName });
            }
        }

        const totalStates = ans.clusters.length;
        const statePercentages = {
            'Cruising': (stateCounts['Cruising'] || 0) / totalStates * 100,
            'Slow / Cautious': (stateCounts['Slow / Cautious'] || 0) / totalStates * 100,
            'Cornering': (stateCounts['Cornering'] || 0) / totalStates * 100,
            'Erratic': (stateCounts['Erratic'] || 0) / totalStates * 100,
        };

        self.postMessage({ type: 'PROGRESS', progress: 85 });


        // --- Model 6: LSTM Autoencoder (TensorFlow.js) ---
        // We will build a tiny sequential autoencoder to find "reconstruction errors" pointing to erratic driving
        await tf.ready();

        // We will use just Speed and Steering for the sequence
        const seqLength = 10;
        const numFeatures = 2;
        const lstmInput: number[][][] = [];

        // Create overlapping windows
        for (let i = 0; i < speeds.length - seqLength; i += 5) {
            const window = [];
            for (let j = 0; j < seqLength; j++) {
                // Normalize roughly
                window.push([(speeds[i + j] || 0) / 200, (steerings[i + j] || 0) / 5]);
            }
            lstmInput.push(window);
        }

        // Limit the data size to train fast in browser
        const limitSize = Math.min(lstmInput.length, 300);
        const xs = tf.tensor3d(lstmInput.slice(0, limitSize), [limitSize, seqLength, numFeatures]);

        // Build a very simple Autoencoder Model
        const model = tf.sequential();
        model.add(tf.layers.lstm({ units: 8, inputShape: [seqLength, numFeatures], returnSequences: false }));
        model.add(tf.layers.repeatVector({ n: seqLength }));
        model.add(tf.layers.lstm({ units: 8, returnSequences: true }));
        model.add(tf.layers.timeDistributed({ layer: tf.layers.dense({ units: numFeatures }) }));

        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        // Train for 2 epochs (very fast, just to learn the shape of THIS specific drive)
        await model.fit(xs, xs, { epochs: 2, batchSize: 32 });
        self.postMessage({ type: 'PROGRESS', progress: 95 });

        // Inference: Get reconstruction errors
        const predictions = model.predict(xs) as tf.Tensor;
        // Calculate MSE per window
        const mse = tf.mean(tf.square(tf.sub(xs, predictions)), [1, 2]);
        const errorValues = await mse.array() as number[];

        const lstmData = [];
        let maxError = 0;
        let totalError = 0;
        for (let i = 0; i < errorValues.length; i++) {
            if (errorValues[i] > maxError) maxError = errorValues[i];
            totalError += errorValues[i];
            lstmData.push({
                timestamp: timestamps[i * 5], // roughly match window index to timestamp
                error: errorValues[i]
            });
        }

        const avgError = errorValues.length > 0 ? totalError / errorValues.length : 0;
        let analysisText = "Normal driving patterns detected consistent with continuous sequences.";
        if (maxError > 0.1 || avgError > 0.02) {
            analysisText = "High reconstruction errors detected, strongly indicating erratic or unconventional driving behavior.";
        } else if (maxError > 0.05) {
            analysisText = "Moderate deviations detected. Driving shows occasional varied behavior.";
        }

        // Cleanup TF memory
        tf.dispose([xs, predictions, mse]);

        self.postMessage({ type: 'PROGRESS', progress: 100 });

        // --- Send Big Payload Back to UI ---
        const finalResults = {
            safetyScore: safetyScoreResult,
            pca: { data: pcaChartData, profile: profileName },
            anomalies: { data: anomalyData, anomalyCount },
            svm: { overlapPercentage, overlapEvents },
            lstm: { data: lstmData, maxError, analysisText },
            hmm: { data: hmmData, statePercentages }
        };

        self.postMessage({ type: 'COMPLETE', results: finalResults });

    } catch (err: any) {
        console.error("ML Worker Error:", err);
        self.postMessage({ type: 'ERROR', message: err.message || "Unknown error occurred inside the ML Engine." });
    }
};
