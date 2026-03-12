import { kmeans } from 'ml-kmeans';

try {
    const data = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; 
    kmeans(data, 4, { initialization: 'kmeans++' }); 
    console.log("Success");
} catch (e) {
    console.log("KMeans Crash:", e.message);
}
