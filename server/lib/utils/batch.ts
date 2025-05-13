/**
 * Utility function to split an array into batches of a specified size
 * @param array - The array to split
 * @param batchSize - The maximum size of each batch
 * @returns An array of batches
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}