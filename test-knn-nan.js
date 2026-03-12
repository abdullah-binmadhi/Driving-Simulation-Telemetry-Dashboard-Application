import KNN from 'ml-knn';

console.log("Testing KNN with NaN inputs");

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

try {
    const predictedClassIdx = knn.predict([NaN, NaN])[0];
    console.log("Predicted:", predictedClassIdx);
} catch (e) {
    console.error("CRASH:", e.message);
}
