import { kmeans } from 'ml-kmeans';

try {
    const data = [[1, 2], [2, 3], [3, 4]]; // N = 3
    kmeans(data, 4, { initialization: 'kmeans++' }); // K = 4
    console.log("Success");
} catch (e) {
    console.log("KMeans Crash:", e.message);
}
