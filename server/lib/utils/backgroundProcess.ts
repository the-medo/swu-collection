// backgroundProcess.ts
// A simple utility for running functions in the background without blocking the main thread

/**
 * Runs a function in the background without blocking the main thread
 * @param fn The function to run in the background
 * @param args The arguments to pass to the function
 * @returns A promise that resolves immediately
 */
export function runInBackground<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  ...args: T
): void {
  // Use setTimeout with 0ms delay to run the function in the next event loop tick
  setTimeout(() => {
    fn(...args).catch(error => {
      console.error('Background process error:', error);
    });
  }, 0);
}