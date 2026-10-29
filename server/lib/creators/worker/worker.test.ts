import { expect, test } from 'bun:test';
import {
  budgetMicros,
  costMicros,
  WorkerError,
  type Classification,
  type VideoMetadata,
} from './contracts.ts';
import { descriptionDeckLinks, shouldPublish, validatedClassification } from './metadata.ts';
import {
  durationSeconds,
  geminiRequest,
  generateClassification,
  youtubeClient,
} from './providers.ts';
import { directoryChannelIds } from './store.ts';
import { monitoredWorkerCommand, workerCommand } from './command.ts';
import type { CardList } from '../../../../lib/swu-resources/types.ts';
import { getDeckBuilderForSource, parseImportedDeck } from '../../decks/deckBuilders.ts';

const metadata: VideoMetadata = {
  id: 'abcdefghijk',
  channelId: 'UCabcdefghijklmnopqrstuv',
  title: 'Star Wars Unlimited deck guide',
  description: 'Han Solo, Audacious Smuggler',
  durationSeconds: 100,
  language: 'en',
  publishedAt: '2026-10-01T00:00:00Z',
  thumbnail: '',
};
const classification: Classification = {
  relevance: 'primary',
  confidence: 0.98,
  evidence: metadata.title,
  reason: 'Explicit SWU title',
  language: 'en',
  tags: [{ id: 'purpose:deck-guide', confidence: 0.99 }],
  leaders: [],
  sets: [],
};

test('metadata requests contain only text, a bounded output and the current taxonomy', () => {
  const request = JSON.parse(geminiRequest(metadata, {}));
  expect(request.tools).toBeUndefined();
  expect(request.contents[0].parts.every((p: object) => Object.keys(p).join() === 'text')).toBe(
    true,
  );
  expect(request.generationConfig.maxOutputTokens).toBe(4096);
  expect(JSON.stringify(request)).not.toContain('fileData');
  expect(JSON.stringify(request)).not.toContain('inlineData');
  expect(JSON.stringify(request)).toContain('format:eternal');
  expect(() => geminiRequest({ ...metadata, description: 'x'.repeat(70_000) }, {})).toThrow(
    'metadata_request_too_large',
  );
});

test('only literal supported deck URLs are imported, with duplicates and unsafe IDs excluded', () => {
  const result = descriptionDeckLinks(
    'Deck: https://swudb.com/deck/AbC123.\nhttps://www.swudb.com/deck/AbC123?utm_source=youtube\nhttps://swuforge.com/decks/a-b\nhttps://melee.gg/Decklist/View/1234\nhttps://holoscan.net/decks/holo\nhttps://www.protectthepod.com/pool/pod-1/deck\nhttps://swudb.com@evil.test/deck/bad\nhttps://swudb.com:3000/deck/bad\nhttps://swudb.com/deck/%2fadmin\nhttps://evil.test/deck/x',
  );
  expect(result.links.map(l => l.source)).toEqual([
    'swudb',
    'swuforge',
    'melee',
    'holoscan',
    'protect-the-pod',
  ]);
  expect(result.links[0].sourceDeckId).toBe('AbC123');
  expect(result.overflow).toBe(false);
  expect(
    descriptionDeckLinks(
      Array.from({ length: 12 }, (_, i) => `https://swudb.com/deck/a${i}`).join('\n'),
    ).overflow,
  ).toBe(true);
});

test('unfounded evidence, retired tags and ambiguous leader printings cannot auto-link', () => {
  const cards = {
    han1: { type: 'Leader', name: 'Han Solo', subtitle: 'Audacious Smuggler' },
    han2: { type: 'Leader', name: 'Han Solo', subtitle: 'Worth the Risk' },
  } as unknown as CardList;
  const result = validatedClassification(
    {
      ...classification,
      tags: [
        ...classification.tags,
        { id: 'purpose:deck-tech', confidence: 1 },
        { id: 'format:premier', confidence: 0.6 },
      ],
      leaders: [
        { id: 'han1', evidence: 'Han Solo' },
        { id: 'han2', evidence: 'Han Solo' },
        { id: 'invented', evidence: metadata.title },
      ],
    },
    metadata,
    cards,
  );
  expect(result.tags).toEqual(classification.tags);
  expect(result.leaders).toEqual([]);
  expect(
    validatedClassification(
      { ...classification, leaders: [{ id: 'han1', evidence: metadata.description }] },
      metadata,
      cards,
    ).leaders,
  ).toHaveLength(1);
  expect(shouldPublish({ ...classification, evidence: '', tags: [] })).toBe(true);
  expect(shouldPublish({ ...classification, relevance: 'uncertain', confidence: 0.1 })).toBe(true);
  expect(shouldPublish({ ...classification, relevance: 'partial', confidence: 0.65 })).toBe(true);
  expect(shouldPublish({ ...classification, relevance: 'unrelated', confidence: 0.65 })).toBe(true);
  expect(shouldPublish({ ...classification, relevance: 'unrelated', confidence: 0.9 })).toBe(false);
  expect(shouldPublish(classification)).toBe(true);
});

test('channel identities, duration and cumulative budget inputs are bounded', () => {
  expect(
    directoryChannelIds([
      { url: `https://youtube.com/channel/${metadata.channelId}/videos` },
      { url: `https://youtube.com.evil.test/channel/${metadata.channelId}` },
      { url: `https://evil@youtube.com/channel/${metadata.channelId}` },
    ]),
  ).toEqual([metadata.channelId]);
  expect(durationSeconds('P1DT1H2M3S')).toBe(90123);
  expect(durationSeconds('PT2M3S')).toBe(123);
  expect(budgetMicros('5')).toBe(5_000_000);
  expect(() => budgetMicros('41')).toThrow();
  expect(() => budgetMicros('NaN')).toThrow();
  expect(costMicros({ input: 1000, output: 100, thinking: 50 })).toBe(675);
});

test('a negative classification conflicting with an SWU set or deck link is eligible to publish', () => {
  for (const video of [
    { ...metadata, title: 'Homeworlds deck guide' },
    { ...metadata, description: 'Deck: https://swuforge.com/decks/abc123' },
  ]) {
    const result = validatedClassification(
      { ...classification, relevance: 'unrelated' },
      video,
      {},
    );
    expect(result.relevance).toBe('uncertain');
    expect(shouldPublish(result)).toBe(true);
  }
});

test('deck IDs prefer standard printings over colliding promo numbers in either order', () => {
  const entries = [
    [
      'ahsoka',
      {
        type: 'Leader',
        variants: { normal: { set: 'twi', cardNo: 11, baseSet: true, variantName: 'Standard' } },
      },
    ],
    [
      'b1',
      {
        type: 'Unit',
        variants: { promo: { set: 'twi', cardNo: 11, baseSet: true, variantName: 'OP Promo' } },
      },
    ],
  ] as const;
  const external = {
    metadata: { name: '', author: '' },
    leader: { id: 'TWI_011', count: 1 },
    deck: [],
    sideboard: [],
  };
  for (const rows of [entries, [...entries].reverse()]) {
    const parsed = parseImportedDeck(external, Object.fromEntries(rows) as unknown as CardList);
    expect(parsed.leaderCardId1).toBe('ahsoka');
  }
  const ambiguous = Object.fromEntries(
    entries.map(([id, card]) => [
      id,
      {
        ...card,
        variants: { variant: { set: 'twi', cardNo: 11, baseSet: true, variantName: 'OP Promo' } },
      },
    ]),
  ) as unknown as CardList;
  expect(parseImportedDeck(external, ambiguous).leaderCardId1).toBeUndefined();
});

test('provider requests never follow redirects, expose keys in URLs or return raw provider errors', async () => {
  const original = globalThis.fetch;
  const requests: { url: string; init: RequestInit }[] = [];
  try {
    globalThis.fetch = (async (url, init) => {
      requests.push({ url: String(url), init: init! });
      return new Response(JSON.stringify({ error: 'secret-value reflected by upstream' }), {
        status: 403,
      });
    }) as typeof fetch;
    await expect(youtubeClient('secret-value').video(metadata.id)).rejects.toThrow(
      'youtube_http_403',
    );
    await expect(
      generateClassification('secret-value', geminiRequest(metadata, {})),
    ).rejects.toThrow('gemini_http_403');
    const privateDeck = await getDeckBuilderForSource('swudb')
      .fetchDeck('test')
      .catch(e => e);
    expect(privateDeck.reason).toBe('unavailable');
    expect(privateDeck.status).toBe(502);
    for (const request of requests.slice(0, 2)) {
      expect(request.url).not.toContain('secret-value');
      expect(request.init.redirect).toBe('error');
    }
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 5 },
          candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }],
        }),
      )) as unknown as typeof fetch;
    expect(await generateClassification('key', '{}')).toEqual({
      value: null,
      usage: { input: 100, output: 10, thinking: 5 },
    });
  } finally {
    globalThis.fetch = original;
  }
});

test('stale directory links and missing playlists are reported without failing a successful tick', async () => {
  const calls: string[] = [];
  const code = await monitoredWorkerCommand(
    async () => ({
      discovery: {
        channels: 1,
        enqueued: 0,
        conflicts: ['channel'],
        incomplete: [],
        unresolvedHandles: ['handle'],
        missingChannels: ['gone'],
        unavailablePlaylists: [{ channelId: 'empty', playlistId: 'missing' }],
      },
    }),
    {
      started: () => {},
      finished: () => {
        calls.push('ok');
      },
      crashed: () => {
        calls.push('failed');
      },
    },
    async () => {},
    () => {},
  );
  expect(code).toBe(0);
  expect(calls).toEqual(['ok']);
});

test('cron finishes on success/no-work/budget stop, crashes on failure, always flushes', async () => {
  for (const failure of [false, true]) {
    const calls: string[] = [];
    const code = await monitoredWorkerCommand(
      async () => {
        if (failure) throw new Error('sensitive query payload');
        return {
          run: {
            processed: 0,
            published: 0,
            review: 0,
            skipped: 0,
            failed: 0,
            waiting: 0,
            budgetStopped: true,
          },
        };
      },
      {
        started: () => {
          calls.push('started');
        },
        finished: () => {
          calls.push('finished');
        },
        crashed: error => {
          expect(error.message).not.toContain('sensitive');
          calls.push('crashed');
        },
      },
      async () => {
        calls.push('flush');
      },
      () => {},
    );
    expect(code).toBe(failure ? 1 : 0);
    expect(calls).toEqual(['started', failure ? 'crashed' : 'finished', 'flush']);
  }
  const calls: string[] = [];
  expect(
    await monitoredWorkerCommand(
      async () => {
        throw new WorkerError('gemini_http_429');
      },
      {
        started: () => {},
        finished: () => {},
        crashed: e => {
          calls.push(e.message);
        },
      },
      async () => {},
      () => {},
    ),
  ).toBe(1);
  expect(calls).toEqual(['gemini_http_429']);
});

test('maintenance runs without classification and its failures reach the cron monitor', async () => {
  const calls: unknown[] = [];
  const maintenance = {
    videosRefreshed: 0,
    videosRemoved: 0,
    channelsRefreshed: 0,
    connectionsChecked: 0,
    connectionsRemoved: 0,
    expired: 0,
    failed: 1,
  };
  const worker = {
    maintain: async (limit: number, dryRun = false) => {
      calls.push({ limit, dryRun });
      return maintenance;
    },
  } as unknown as Parameters<typeof workerCommand>[1];
  await workerCommand(['maintain', '--dry-run'], worker);
  expect(calls).toEqual([{ limit: 50, dryRun: true }]);
  const errors: string[] = [];
  expect(
    await monitoredWorkerCommand(
      () => workerCommand(['maintain', '--limit', '5'], worker),
      {
        started() {},
        finished() {
          throw new Error('Unexpected success');
        },
        crashed(error) {
          errors.push(error.message);
        },
      },
      async () => {
        calls.push('flush');
      },
      () => {},
    ),
  ).toBe(1);
  expect(errors).toEqual(['creator_youtube_maintenance_failed']);
  expect(calls.at(-1)).toBe('flush');
});
