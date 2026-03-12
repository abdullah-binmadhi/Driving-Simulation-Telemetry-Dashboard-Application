declare module 'ml-knn' {
    export default class KNN {
        constructor(dataset: number[][], labels: number[], options?: { k?: number, distance?: (a: number[], b: number[]) => number });
        predict(dataset: number[] | number[][]): number[];
    }
}
