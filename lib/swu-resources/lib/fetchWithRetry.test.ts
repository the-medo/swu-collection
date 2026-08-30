import { describe, expect, mock, test } from 'bun:test';
import { fetchWithRetry } from './fetchWithRetry.ts';

describe('fetchWithRetry', () => {
  test('retries three times with a five-second wait and returns a recovered response', async () => {
    const recoveredResponse = new Response('{}', { status: 200 });
    const fetchImplementation = mock(async () => {
      if (fetchImplementation.mock.calls.length < 4) {
        return new Response('', { status: 503 });
      }
      return recoveredResponse;
    });
    const wait = mock(async () => {});

    const response = await fetchWithRetry('https://example.test/card', {
      fetchImplementation,
      wait,
    });

    expect(response).toBe(recoveredResponse);
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledWith(5_000);
  });

  test('throws the final error after all retries are exhausted', async () => {
    const fetchImplementation = mock(async () => {
      throw new Error('connection reset');
    });
    const wait = mock(async () => {});

    await expect(
      fetchWithRetry('https://example.test/card', { fetchImplementation, wait }),
    ).rejects.toThrow('connection reset');
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    expect(wait).toHaveBeenCalledTimes(3);
  });
});
