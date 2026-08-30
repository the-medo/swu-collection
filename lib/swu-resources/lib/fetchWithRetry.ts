import { delay } from './delay.ts';

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 5_000;

type FetchWithRetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  fetchImplementation?: typeof fetch;
  wait?: (ms: number) => Promise<unknown>;
};

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const retries = options.retries ?? DEFAULT_RETRY_COUNT;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const wait = options.wait ?? delay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchImplementation(url);
      if (response.ok) return response;

      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      if (attempt === retries) throw error;

      console.error(
        `Official card API request failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${retryDelayMs / 1_000} seconds: ${url}`,
        error,
      );
      await wait(retryDelayMs);
    }
  }

  throw new Error('Official card API request exhausted retries');
}
