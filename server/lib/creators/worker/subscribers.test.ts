import { expect, test } from 'bun:test';
import { youtubeClient } from './providers.ts';

test('channel statistics request public subscriber counts and preserve unknown or hidden values', async () => {
  const original = globalThis.fetch;
  const ids = ['a', 'b', 'c', 'd', 'e'].map(letter => `UC${letter.repeat(22)}`);
  try {
    globalThis.fetch = (async url => {
      expect(new URL(String(url)).searchParams.get('part')).toBe('snippet,statistics');
      return Response.json({
        items: ids.map((id, index) => ({
          id,
          snippet: { title: id },
          statistics: [
            { subscriberCount: '123000', hiddenSubscriberCount: false },
            { subscriberCount: '999999', hiddenSubscriberCount: true },
            {},
            { subscriberCount: '0' },
            { subscriberCount: '8000000000' },
          ][index],
        })),
      });
    }) as typeof fetch;
    expect((await youtubeClient('fixture').channels(ids)).map(row => row.subscriberCount)).toEqual([
      123000,
      null,
      null,
      0,
      8_000_000_000,
    ]);
    for (const subscriberCount of ['-1', '1.5', 'unknown', '9007199254740992']) {
      globalThis.fetch = (async () =>
        Response.json({
          items: [
            {
              id: ids[0],
              snippet: { title: 'Invalid statistics' },
              statistics: { subscriberCount },
            },
          ],
        })) as typeof fetch;
      await expect(youtubeClient('fixture').channels([ids[0]])).rejects.toThrow();
    }
  } finally {
    globalThis.fetch = original;
  }
});
