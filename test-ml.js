import { PCA } from 'ml-pca';
import SVM from 'ml-svm';
import { kmeans } from 'ml-kmeans';
import MLR from 'ml-regression-multivariate-linear';
import { RandomForestRegression } from 'ml-random-forest';
import KNN from 'ml-knn';

console.log("Starting test...");
try {
    const xSafety = [[1,2,3,4,5], [2,3,4,5,6], [3,4,5,6,7], [1,1,1,1,1], [0,0,0,0,0]];
    const yCost = [[1], [2], [3], [4], [5]];
    const mlr = new MLR(xSafety, yCost);
    console.log("MLR OK");

    const pca = new PCA(xSafety);
    console.log("PCA OK");

    const svm = new SVM({ kernel: 'linear' });
    svm.train([[1,2], [2,3], [1,1], [0,0]], [1, -1, 1, -1]); // Mixed classes ok
    console.log("SVM 1 OK");
    
    try {
        const svm2 = new SVM({ kernel: 'linear' });
        svm2.train([[1,2], [2,3], [1,1], [0,0]], [-1, -1, -1, -1]); // Single class test
        console.log("SVM 2 OK");
    } catch (e) {
        console.log("SVM 2 Err:", e.message);
    }
    
    // Test RF
    const rf = new RandomForestRegression({ seed: 42, maxFeatures: 2, nEstimators: 10 });
    rf.train([[1,2,3], [2,3,4]], [1, 2]);
    console.log("RF OK");

    // Test KNN
    const knnTrainX = [[1,2], [2,3], [3,4]];
    const knnTrainY = [0, 1, 2];
    const knn = new KNN(knnTrainX, knnTrainY, { k: 2 });
    knn.predict([1, 2]);
    console.log("KNN OK");
    
    // Test KMeans
    kmeans([[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]], 4, { initialization: 'kmeans++' });
    console.log("KMeans OK");
    
} catch (e) {
    console.error("Crash:", e.message);
}
