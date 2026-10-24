import { expect, test } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../db/index.ts';
import { user } from '../../../db/schema/auth-schema.ts';
import {
  creation,
  creationReference,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
  creatorChannel,
} from '../../../db/schema/creator_hub.ts';
import {
  creatorVideoJob as jobs,
  creatorVideoSpend as spend,
  creatorImportedDeck,
  creatorClaimedDeck,
  creatorChannelResolution,
} from '../../../db/schema/creator_video_job.ts';
import { deck } from '../../../db/schema/deck.ts';
import { deckCard } from '../../../db/schema/deck_card.ts';
import { deckImportSource } from '../../../db/schema/deck_import_source.ts';
import { deckInformation } from '../../../db/schema/deck_information.ts';
import { creatorProfileSchema } from '../../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../../shared/posts/content.ts';
import { getMergedCardList } from '../../cards/cardListProvider.ts';
import { DeckBuilderError, type ExternalDeck } from '../../decks/deckBuilders.ts';
import { createVideoWorker } from './worker.ts';
import { createWorkerStore } from './store.ts';
import {
  ANALYSIS_VERSION,
  MAX_ATTEMPTS,
  RESERVATION_MICROS,
  type Analysis,
  type Classification,
  type VideoMetadata,
  WorkerError,
} from './contracts.ts';
import type { youtubeClient } from './providers.ts';
import { metadataHash, videoDocument } from './metadata.ts';
import { importVideoDeck } from './decks.ts';

test.skipIf(process.env.CREATOR_WORKER_DB_TEST !== '1')(
  'durable metadata ingestion, publication, recovery, deck ownership and spending',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const random = () => crypto.randomUUID().replaceAll('-', '');
    const ownerId = `creator-worker-test-${random()}`;
    const profileIds = [crypto.randomUUID(), crypto.randomUUID()];
    const channels = [0, 1, 2].map(() => `UC${random().slice(0, 22)}`);
    const fixtureHandle = `Worker${random().slice(0, 12)}`;
    const handleUrl = `https://www.youtube.com/@${fixtureHandle}`;
    const originalResolutions = await db.select().from(creatorChannelResolution);
    const touchedHandles = new Set<string>();
    let scannedChannels: string[] = [];
    const videoIds: string[] = [],
      sourceIds = [random(), random(), random()];
    const store = createWorkerStore();
    let generated = 0,
      deckFetches = 0;
    const metadata = new Map<string, VideoMetadata>();
    const classifications = new Map<string, Classification>();
    const good: Classification = {
      relevance: 'primary',
      confidence: 0.99,
      evidence: 'Star Wars Unlimited deck guide',
      reason: 'SWU title',
      language: 'en',
      tags: [
        { id: 'purpose:deck-guide', confidence: 0.99 },
        { id: 'format:premier', confidence: 0.99 },
      ],
      leaders: [],
      sets: [],
    };
    const api: ReturnType<typeof youtubeClient> = {
      channels: async () => [],
      channelForHandle: async handle => {
        touchedHandles.add(`https://www.youtube.com/@${encodeURIComponent(handle)}`);
        return handle === fixtureHandle
          ? channels[2]
          : (originalResolutions.find(
              r => r.url === `https://www.youtube.com/@${encodeURIComponent(handle)}`,
            )?.channelId ?? null);
      },
      video: async id => metadata.get(id) ?? null,
      playlists: async ids => {
        scannedChannels = ids;
        return ids.map(channelId => ({ channelId, playlistId: channelId }));
      },
      uploads: async id => ({
        nextPageToken: undefined,
        videos: [...metadata.values()]
          .filter(m => m.channelId === id)
          .map(m => ({ id: m.id, publishedAt: m.publishedAt })),
      }),
    };
    const generate = async (_key: string, body: string) => {
      generated++;
      const input = JSON.parse(JSON.parse(body).contents[0].parts[0].text).metadata;
      const id = input.description.split('\n')[0];
      return {
        value: classifications.get(id) ?? good,
        usage: { input: 100, output: 50, thinking: 5 },
      };
    };
    const add = async (profile = 0, classification = good, description = '') => {
      const id = random().slice(0, 11);
      videoIds.push(id);
      metadata.set(id, {
        id,
        channelId: channels[profile],
        title: good.evidence,
        description: `${id}\n${description}`,
        durationSeconds: 600,
        language: 'en',
        publishedAt: '2026-10-01T12:00:00Z',
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      });
      classifications.set(id, classification);
      await store.enqueue([
        { videoId: id, channelId: channels[profile], creatorId: profileIds[profile] },
      ]);
      return id;
    };
    const jobFor = async (id: string) =>
      (await db.select().from(jobs).where(eq(jobs.videoId, id)))[0];
    const creationFor = async (id: string) =>
      (await db.select().from(creation).where(eq(creation.sourceVideoId, id)))[0];
    const deleteFixtureDecks = async (ids: string[]) => {
      if (!ids.length) return;
      await db.delete(deckCard).where(inArray(deckCard.deckId, ids));
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, ids));
      await db.delete(deckImportSource).where(inArray(deckImportSource.deckId, ids));
      await db.delete(deck).where(inArray(deck.id, ids));
    };
    try {
      await db.insert(user).values({
        id: ownerId,
        name: 'Worker fixture',
        displayName: ownerId,
        email: `${ownerId}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      for (let i = 0; i < 2; i++) {
        const profile = creatorProfileSchema.parse({
          slug: `worker-${profileIds[i]}`,
          name: 'Worker fixture',
          bio: emptyPostDocument(),
          languages: ['en'],
          specialties: [],
          links: [
            `https://www.youtube.com/channel/${channels[i]}`,
            ...(i === 0 ? [handleUrl] : []),
          ].map(url => ({
            label: 'YouTube',
            url,
          })),
        });
        await db.insert(creatorProfile).values({
          id: profileIds[i],
          slug: profile.slug,
          ownerId: i === 1 ? ownerId : null,
          profile,
        });
      }
      const worker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async () => {
          deckFetches++;
          throw new Error('Unexpected deck fetch');
        },
      });
      // Owned profile links alone cannot claim someone else's channel.
      expect(
        await worker.enqueueInventory({
          videos: [{ videoId: '01234567890', channelId: channels[1] }],
        }),
      ).toMatchObject({ enqueued: 0, ignored: 1 });
      await db.insert(creatorYoutubeChannel).values({ channelId: channels[1], title: 'Fixture' });
      await db
        .insert(creatorChannel)
        .values({ channelId: channels[1], creatorId: profileIds[1], origin: 'oauth' });
      await db.insert(creatorYoutube).values({
        channelId: channels[1],
        creatorId: profileIds[1],
        accessToken: 'test-only',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
      const pausedVideo = await add(1);
      await db
        .update(creatorYoutubeChannel)
        .set({ autoImportEnabled: false })
        .where(eq(creatorYoutubeChannel.channelId, channels[1]));
      await worker.discover('2026-09-01T00:00:00Z');
      expect(scannedChannels).not.toContain(channels[1]);
      expect(scannedChannels).toContain(channels[0]);
      expect(
        await worker.enqueueInventory({
          videos: [{ videoId: pausedVideo, channelId: channels[1] }],
        }),
      ).toMatchObject({ enqueued: 0, ignored: 1 });
      expect(await worker.run(1, pausedVideo)).toMatchObject({ processed: 0 });
      expect((await jobFor(pausedVideo)).attempts).toBe(0);
      expect(generated).toBe(0);
      await db
        .update(creatorYoutubeChannel)
        .set({ autoImportEnabled: true })
        .where(eq(creatorYoutubeChannel.channelId, channels[1]));
      await db.delete(jobs).where(eq(jobs.videoId, pausedVideo));
      metadata.delete(pausedVideo);
      const secondChannelVideo = random().slice(0, 11);
      videoIds.push(secondChannelVideo);
      expect(
        await worker.enqueueInventory({
          videos: [
            {
              videoId: secondChannelVideo,
              channelId: channels[2],
              creatorId: 'forged-inventory-owner',
            },
          ],
        }),
      ).toMatchObject({ enqueued: 1, ignored: 0 });
      expect((await jobFor(secondChannelVideo)).creatorId).toBe(profileIds[0]);
      const inventoryIds = Array.from({ length: 4 }, () => random().slice(0, 11));
      videoIds.push(...inventoryIds);
      expect(
        await worker.enqueueInventory({
          videos: inventoryIds.map(videoId => ({ videoId, channelId: channels[2] })),
          swuVideoIds: inventoryIds.slice(0, 3),
          excludedVideoIds: [inventoryIds[1]],
          needsReviewVideoIds: [inventoryIds[2]],
        }),
      ).toMatchObject({ enqueued: 1, ignored: 3 });
      expect(await jobFor(inventoryIds[0])).toBeDefined();
      for (const id of inventoryIds.slice(1)) expect(await jobFor(id)).toBeUndefined();
      const first = await add(0, good, '0:00 Introduction\n1:20 Cards\n30:00 Out of range');
      const simultaneous = await Promise.all([worker.run(1, first), worker.run(1, first)]);
      expect(simultaneous.reduce((n, r) => n + r.published, 0)).toBe(1);
      expect(generated).toBe(1);
      const published = await creationFor(first);
      expect(published.published?.chapters).toEqual([
        { title: 'Introduction', startSeconds: 0 },
        { title: 'Cards', startSeconds: 80 },
      ]);
      expect(new Date(published.publishedAt!).toISOString()).toBe('2026-10-01T12:00:00.000Z');
      expect(await worker.run(1, first)).toMatchObject({ processed: 0 });
      expect(generated).toBe(1);
      await db
        .update(creation)
        .set({ published: null, publishedAt: null })
        .where(eq(creation.id, published.id));
      expect(await store.retry(first)).toEqual([]);
      expect((await creationFor(first)).published).toBeNull();

      const uncertain = await add(0, {
        ...good,
        relevance: 'uncertain',
        confidence: 0.65,
        evidence: '',
        tags: [],
      });
      expect(await worker.run(1, uncertain)).toMatchObject({ published: 1, review: 0 });
      expect((await creationFor(uncertain)).published?.tags).toEqual([]);
      expect(await worker.run(1, uncertain)).toMatchObject({ processed: 0 });
      const uncertainWithDeck = await add(
        0,
        { ...good, confidence: 0.65 },
        `https://swudb.com/deck/${sourceIds[2]}`,
      );
      let uncertainDeckFetches = 0;
      const uncertainDeckWorker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async () => {
          uncertainDeckFetches++;
          throw new DeckBuilderError('missing', 404);
        },
      });
      expect(await uncertainDeckWorker.run(1, uncertainWithDeck)).toMatchObject({
        published: 1,
        review: 0,
      });
      expect(uncertainDeckFetches).toBe(1);
      expect((await jobFor(uncertainWithDeck)).issues).toContainEqual({
        code: 'deck_not_found',
        source: 'swudb',
        sourceDeckId: sourceIds[2],
      });
      const rejectedText = await add(0, good, `fuck\nhttps://swudb.com/deck/${sourceIds[2]}`);
      expect(await worker.run(1, rejectedText)).toMatchObject({ review: 1, published: 0 });
      expect((await creationFor(rejectedText)).published).toBeNull();
      expect((await creationFor(rejectedText)).draft.videoDescription).toContain('fuck');
      expect((await jobFor(rejectedText)).issues).toContainEqual({ code: 'video_text_rejected' });
      const unrelated = await add(0, { ...good, relevance: 'unrelated' });
      expect(await worker.run(1, unrelated)).toMatchObject({ skipped: 1 });
      expect(await creationFor(unrelated)).toBeUndefined();
      expect(deckFetches).toBe(0);
      const noBudget = await add();
      const beforeBudget = generated;
      expect(
        await createVideoWorker({ youtube: api, generate, capMicros: 0 }).run(1, noBudget),
      ).toMatchObject({ budgetStopped: true });
      expect((await jobFor(noBudget)).attempts).toBe(0);
      expect(generated).toBe(beforeBudget);

      // Two concurrent budget requests cannot both spend the last reservation.
      const total = await store.report();
      const cap =
        Number(total.spending.chargedMicros) +
        Number(total.spending.heldMicros) +
        RESERVATION_MICROS;
      const reservations = await Promise.allSettled([
        store.reserve(noBudget, cap),
        store.reserve(noBudget, cap),
      ]);
      expect(reservations.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const held = reservations.find(
        r => r.status === 'fulfilled',
      )! as PromiseFulfilledResult<string>;
      await store.settle(held.value, null);
      expect(Number((await store.report()).spending.heldMicros)).toBeGreaterThanOrEqual(
        RESERVATION_MICROS,
      );
      const rejected = await add(),
        untouched = await add();
      let rejectedCalls = 0;
      const rejectedWorker = createVideoWorker({
        youtube: api,
        generate: async () => {
          rejectedCalls++;
          throw new WorkerError('gemini_http_403', false);
        },
      });
      const originalClaim = rejectedWorker.store.claim;
      const batch = [rejected, untouched];
      rejectedWorker.store.claim = async () => {
        const id = batch.shift();
        return id ? originalClaim(id) : null;
      };
      expect(await rejectedWorker.run(10)).toMatchObject({
        failed: 1,
        processed: 1,
        stoppedBy: 'gemini_http_403',
      });
      expect(rejectedCalls).toBe(1);
      expect((await jobFor(rejected)).attempts).toBe(0);
      expect((await jobFor(rejected)).status).toBe('pending');
      expect((await store.report()).attention.find(j => j.videoId === rejected)?.lastError).toBe(
        'gemini_http_403',
      );
      await db
        .update(jobs)
        .set({
          createdAt: new Date(Date.now() - 8 * 86400_000).toISOString(),
          availableAt: new Date().toISOString(),
        })
        .where(eq(jobs.videoId, rejected));
      rejectedWorker.store.claim = originalClaim;
      expect(await rejectedWorker.run(1, rejected)).toMatchObject({ stoppedBy: 'gemini_http_403' });
      expect((await jobFor(rejected)).status).toBe('failed');
      expect((await jobFor(untouched)).attempts).toBe(0);
      expect(
        (await db.select().from(spend).where(eq(spend.videoId, rejected)))[0].chargedMicros,
      ).toBe(0);
      // A single request rejected for its payload must not block the next valid video.
      const invalidPayload = await add(),
        nextValid = await add();
      let payloadCalls = 0;
      const payloadWorker = createVideoWorker({
        youtube: api,
        generate: async (...args) => {
          if (payloadCalls++ === 0) throw new WorkerError('gemini_http_413', false);
          return generate(...args);
        },
      });
      const payloadClaim = payloadWorker.store.claim;
      const payloadBatch = [invalidPayload, nextValid];
      payloadWorker.store.claim = async () => {
        const id = payloadBatch.shift();
        return id ? payloadClaim(id) : null;
      };
      expect(await payloadWorker.run(10)).toMatchObject({ processed: 2, failed: 1, published: 1 });
      expect((await jobFor(invalidPayload)).attempts).toBe(MAX_ATTEMPTS);
      expect((await jobFor(nextValid)).status).toBe('published');
      expect(
        (await db.select().from(spend).where(eq(spend.videoId, invalidPayload)))[0].chargedMicros,
      ).toBe(0);
      const timedOut = await add();
      const timeoutWorker = createVideoWorker({
        youtube: api,
        generate: async () => {
          throw new WorkerError('gemini_request_failed');
        },
      });
      expect(await timeoutWorker.run(1, timedOut)).toMatchObject({ failed: 1 });
      expect(
        (await db.select().from(spend).where(eq(spend.videoId, timedOut)))[0].chargedMicros,
      ).toBeNull();
      const live = await add();
      const liveWorker = createVideoWorker({
        youtube: {
          ...api,
          video: async () => {
            throw new WorkerError('video_not_ready');
          },
        },
        generate,
      });
      expect(await liveWorker.run(1, live)).toMatchObject({ waiting: 1 });
      await db
        .update(jobs)
        .set({
          createdAt: new Date(Date.now() - 31 * 86400_000).toISOString(),
          availableAt: new Date().toISOString(),
        })
        .where(eq(jobs.videoId, live));
      expect(await liveWorker.run(1, live)).toMatchObject({ skipped: 1 });
      expect((await jobFor(live)).lastError).toBe('video_wait_expired');
      const interrupted = await add();
      const oldClaim = await store.claim(interrupted);
      await db
        .update(jobs)
        .set({ leaseUntil: new Date(Date.now() - 1000).toISOString() })
        .where(eq(jobs.videoId, interrupted));
      const newClaim = await store.claim(interrupted);
      expect(newClaim!.claimId).not.toBe(oldClaim!.claimId);
      await expect(store.checkpoint(oldClaim!, {})).rejects.toThrow('job_claim_lost');
      await db
        .update(jobs)
        .set({ attempts: 3, leaseUntil: new Date(Date.now() - 1000).toISOString() })
        .where(eq(jobs.videoId, interrupted));
      expect(await store.claim(interrupted)).toBeNull();
      expect((await jobFor(interrupted)).status).toBe('failed');

      const cards = await getMergedCardList();
      const fixtureCard = (type: string) =>
        Object.entries(cards).find(
          ([, c]) => c?.type === type && Object.values(c.variants).some(v => v?.baseSet),
        )!;
      const leader = fixtureCard('Leader'),
        base = fixtureCard('Base'),
        unit = fixtureCard('Unit');
      const externalId = (card: typeof leader) => {
        const v = Object.values(card[1]!.variants).find(v => v?.baseSet)!;
        return `${v.set}_${v.cardNo}`;
      };
      const sourceDeck: ExternalDeck = {
        metadata: { name: 'Worker fixture deck', author: '' },
        leader: { id: externalId(leader), count: 1 },
        base: { id: externalId(base), count: 1 },
        deck: [{ id: externalId(unit), count: 2 }],
        sideboard: [{ id: externalId(unit), count: 1 }],
      };
      const systemVideo = await add(0, good, `https://swudb.com/deck/${sourceIds[0]}`);
      const ownedVideo = await add(
        1,
        good,
        `https://swudb.com/deck/${sourceIds[0]}\nhttps://swudb.com/deck/${sourceIds[1]}`,
      );
      let failSecondDeck = true;
      const deckWorker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async (_source, id) => {
          if (id === sourceIds[1] && failSecondDeck) throw new Error('fixture network failure');
          return sourceDeck;
        },
      });
      expect(await deckWorker.run(1, systemVideo)).toMatchObject({ published: 1 });
      const systemDeck = (
        await db
          .select({ deck })
          .from(creatorImportedDeck)
          .innerJoin(deck, eq(deck.id, creatorImportedDeck.deckId))
          .where(
            and(
              eq(creatorImportedDeck.userId, 'swubase'),
              eq(creatorImportedDeck.sourceDeckId, sourceIds[0]),
            ),
          )
      )[0].deck;
      expect(systemDeck.public).toBe(1);
      expect(systemDeck.userId).toBe('swubase');
      expect((await creationFor(systemVideo)).published?.references).toContainEqual({
        type: 'leader',
        id: leader[0],
        startSeconds: null,
      });
      const beforeDeckRetry = generated;
      expect(await deckWorker.run(1, ownedVideo)).toMatchObject({ failed: 1 });
      expect(generated).toBe(beforeDeckRetry + 1);
      expect((await jobFor(ownedVideo)).analysis).not.toBeNull();
      const [alreadyImported] = await db
        .select()
        .from(creatorImportedDeck)
        .where(
          and(
            eq(creatorImportedDeck.userId, ownerId),
            eq(creatorImportedDeck.sourceDeckId, sourceIds[0]),
          ),
        );
      expect(
        (await db.select().from(deck).where(eq(deck.id, alreadyImported.deckId!)))[0].public,
      ).toBe(2);
      expect(alreadyImported.pendingPublication).toBe(true);
      // Simulate interruption between the committed import and derived information repair.
      await db.delete(deckInformation).where(eq(deckInformation.deckId, alreadyImported.deckId!));
      failSecondDeck = false;
      await store.retry(ownedVideo);
      expect(await deckWorker.run(1, ownedVideo)).toMatchObject({ published: 1 });
      expect(generated).toBe(beforeDeckRetry + 1);
      const ownedDecks = await db.select().from(deck).where(eq(deck.userId, ownerId));
      expect(ownedDecks).toHaveLength(2);
      expect(ownedDecks.every(d => d.public === 1)).toBe(true);
      expect(
        await db
          .select()
          .from(deckInformation)
          .where(eq(deckInformation.deckId, alreadyImported.deckId!)),
      ).toHaveLength(1);
      expect(
        (await db.select().from(deckCard).where(eq(deckCard.deckId, alreadyImported.deckId!)))
          .map(c => [c.board, c.quantity])
          .sort(),
      ).toEqual([
        [1, 2],
        [2, 1],
      ]);
      expect(
        await db
          .select()
          .from(creationReference)
          .where(
            and(
              eq(creationReference.creationId, (await creationFor(ownedVideo)).id),
              eq(creationReference.entityType, 'deck'),
            ),
          ),
      ).toHaveLength(2);
      // Owner-unlisting still suppresses reuse until a claim explicitly marks the mapping.
      await db
        .update(deck)
        .set({ public: 2, updatedAt: new Date() })
        .where(eq(deck.id, alreadyImported.deckId!));
      const hiddenVideo = await add(1, good, `https://swudb.com/deck/${sourceIds[0]}`);
      expect(await deckWorker.run(1, hiddenVideo)).toMatchObject({ published: 1 });
      expect(
        (await creationFor(hiddenVideo)).published!.references.filter(ref => ref.type === 'deck'),
      ).toHaveLength(0);
      await db.insert(creatorClaimedDeck).values({ deckId: alreadyImported.deckId! });
      // A claimed/transferred import has a durable mapping and stays unlisted on reuse.
      await db
        .update(deck)
        .set({ public: 2, updatedAt: new Date() })
        .where(eq(deck.id, alreadyImported.deckId!));
      const unlistedVideo = await add(1, good, `https://swudb.com/deck/${sourceIds[0]}`);
      expect(await deckWorker.run(1, unlistedVideo)).toMatchObject({ published: 1 });
      expect((await creationFor(unlistedVideo)).published!.references).toContainEqual({
        type: 'deck',
        id: alreadyImported.deckId!,
        startSeconds: null,
      });
      expect(
        (await db.select().from(deck).where(eq(deck.id, alreadyImported.deckId!)))[0].public,
      ).toBe(2);
      expect(await db.select().from(deck).where(eq(deck.userId, ownerId))).toHaveLength(2);
      const ownedJob = (await store.claim(await add(1)))!;
      const analysis: Analysis = {
        ...good,
        version: ANALYSIS_VERSION,
        metadataHash: metadataHash(metadata.get(ownedVideo)!),
      };
      await db
        .update(deck)
        .set({ public: 0, name: 'Creator edited this' })
        .where(eq(deck.id, alreadyImported.deckId!));
      await expect(
        importVideoDeck({
          database: db,
          job: ownedJob,
          ownerId,
          source: 'swudb',
          sourceDeckId: sourceIds[0],
          sourceDeck,
          cards,
          analysis,
        }),
      ).rejects.toThrow('deck_removed_or_not_public');

      // Broken links cannot permanently block an otherwise valid video.
      const broken = await add(1, good, `https://swudb.com/deck/${sourceIds[2]}`);
      await db.update(jobs).set({ attempts: 2 }).where(eq(jobs.videoId, broken));
      const brokenWorker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async () => {
          throw new Error('provider offline');
        },
      });
      expect(await brokenWorker.run(1, broken)).toMatchObject({ published: 1 });
      expect((await jobFor(broken)).issues[0].code).toBe('deck_provider_failed_after_retries');
      const privateLink = await add(1, good, `https://swudb.com/deck/${sourceIds[2]}`);
      const privateWorker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async () => {
          throw new DeckBuilderError('private', 502, 'unavailable');
        },
      });
      expect(await privateWorker.run(1, privateLink)).toMatchObject({ published: 1 });
      expect((await jobFor(privateLink)).issues[0].code).toBe('deck_not_available');

      // Moderation rejects this deck permanently without delaying the video or its other decks.
      const moderated = await add(
        1,
        good,
        `https://swudb.com/deck/${sourceIds[2]}\nhttps://swudb.com/deck/${sourceIds[1]}`,
      );
      const moderationFetches: string[] = [];
      const moderationWorker = createVideoWorker({
        youtube: api,
        generate,
        fetchDeck: async (_source, id) => {
          moderationFetches.push(id);
          return {
            ...sourceDeck,
            metadata: {
              name: id === sourceIds[2] ? 'fuck' : sourceDeck.metadata.name,
              author: '',
            },
          };
        },
      });
      expect(await moderationWorker.run(1, moderated)).toMatchObject({ published: 1, failed: 0 });
      expect((await jobFor(moderated)).attempts).toBe(1);
      expect((await jobFor(moderated)).issues).toEqual([
        { code: 'deck_text_rejected', source: 'swudb', sourceDeckId: sourceIds[2] },
      ]);
      expect(
        await db
          .select()
          .from(creatorImportedDeck)
          .where(eq(creatorImportedDeck.sourceDeckId, sourceIds[2])),
      ).toHaveLength(0);
      expect(await db.select().from(deck).where(eq(deck.userId, ownerId))).toHaveLength(2);
      const linkedDecks = (await creationFor(moderated)).published!.references.filter(
        reference => reference.type === 'deck',
      );
      expect(linkedDecks).toHaveLength(1);
      expect(ownedDecks.map(deck => deck.id)).toContain(linkedDecks[0].id);
      expect(await moderationWorker.run(1, moderated)).toMatchObject({ processed: 0 });
      expect(moderationFetches).toEqual([sourceIds[2], sourceIds[1]]);

      // Staged decks stay unlisted on a publication conflict or a rolled-back publication.
      const stagedVideo = await add(1),
        stagedJob = (await store.claim(stagedVideo))!;
      const staged = await importVideoDeck({
        database: db,
        job: stagedJob,
        ownerId,
        source: 'swudb',
        sourceDeckId: sourceIds[2],
        sourceDeck,
        cards,
        analysis,
      });
      expect(staged.deck.public).toBe(2);
      const doc = videoDocument(metadata.get(stagedVideo)!, analysis, 'en', [
        { type: 'deck', id: staged.deck.id, startSeconds: null },
      ]);
      await db.insert(creation).values({
        creatorId: profileIds[1],
        authorId: ownerId,
        sourceVideoId: stagedVideo,
        draft: { ...doc, references: [] },
      });
      expect(await store.publish(stagedJob, doc, true, [])).toBe('skipped');
      expect((await db.select().from(deck).where(eq(deck.id, staged.deck.id)))[0].public).toBe(2);
      const rollbackVideo = await add(1),
        rollbackJob = (await store.claim(rollbackVideo))!;
      await expect(
        store.publish(
          rollbackJob,
          {
            ...doc,
            sourceUrl: `https://www.youtube.com/watch?v=${rollbackVideo}`,
            references: [
              ...doc.references,
              { type: 'leader', id: 'does-not-exist', startSeconds: null },
            ],
          },
          true,
          [],
        ),
      ).rejects.toThrow('A linked subject is unavailable');
      expect((await db.select().from(deck).where(eq(deck.id, staged.deck.id)))[0].public).toBe(2);
      expect(await creationFor(rollbackVideo)).toBeUndefined();
      // An owner editing an unlisted import prevents automatic promotion too.
      await db
        .update(deck)
        .set({
          name: 'Owner changed staged deck',
          createdAt: new Date(Date.now() - 8 * 86400_000),
          updatedAt: new Date(Date.now() + 1000),
        })
        .where(eq(deck.id, staged.deck.id));
      expect(
        await store.publish(
          rollbackJob,
          { ...doc, sourceUrl: `https://www.youtube.com/watch?v=${rollbackVideo}` },
          true,
          [],
        ),
      ).toBe('published');
      expect((await db.select().from(deck).where(eq(deck.id, staged.deck.id)))[0].public).toBe(2);
      expect(
        (await creationFor(rollbackVideo)).published!.references.some(r => r.id === staged.deck.id),
      ).toBe(false);
      expect((await jobFor(rollbackVideo)).issues).toContainEqual({
        code: 'deck_changed_before_publication',
        deckId: staged.deck.id,
        source: 'swudb',
        sourceDeckId: sourceIds[2],
      });
      expect((await store.report()).stagedDecks.unreferencedOlderThan7Days).toBeGreaterThanOrEqual(
        1,
      );
      expect(await db.select().from(deck).where(eq(deck.userId, ownerId))).toHaveLength(3);
      expect(
        (await db.select().from(deck).where(eq(deck.id, alreadyImported.deckId!)))[0].name,
      ).toBe('Creator edited this');
      await deleteFixtureDecks([alreadyImported.deckId!]);
      await expect(
        importVideoDeck({
          database: db,
          job: ownedJob,
          ownerId,
          source: 'swudb',
          sourceDeckId: sourceIds[0],
          sourceDeck,
          cards,
          analysis,
        }),
      ).rejects.toThrow('deck_removed_or_not_public');

      // Reports remain inspectable after a backfill larger than the default page.
      const reportIds = Array.from({ length: 101 }, () => random().slice(0, 11));
      videoIds.push(...reportIds);
      await db.insert(jobs).values(
        reportIds.map(videoId => ({
          videoId,
          creatorId: profileIds[0],
          channelId: channels[0],
          status: 'failed' as const,
          attempts: 3,
          lastError: 'fixture_report_error',
        })),
      );
      const page1 = await store.report(1, 'failed'),
        page2 = await store.report(2, 'failed');
      expect(page1.attention).toHaveLength(100);
      expect(page1.attentionHasMore).toBe(true);
      expect(page1.attentionTotal).toBeGreaterThanOrEqual(101);
      expect(page2.attention.length).toBeGreaterThan(0);
      expect(
        page2.attention.some(j => page1.attention.some(first => first.videoId === j.videoId)),
      ).toBe(false);

      // An old analysis cannot publish when the source becomes private or the channel changes.
      const unavailable = await add();
      metadata.delete(unavailable);
      expect(await worker.run(1, unavailable)).toMatchObject({ skipped: 1 });
      const mismatch = await add();
      metadata.get(mismatch)!.channelId = channels[1];
      expect(await worker.run(1, mismatch)).toMatchObject({ failed: 1 });
      expect((await jobFor(mismatch)).lastError).toBe('video_channel_mismatch');

      // Test only the sanitizer block, in a transaction that is always rolled back.
      const sanitizer = (await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text()).match(
        /DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/,
      )![0];
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql.raw(sanitizer));
          expect(await tx.select().from(jobs)).toHaveLength(0);
          expect(await tx.select().from(spend)).toHaveLength(0);
          expect(await tx.select().from(creatorImportedDeck)).toHaveLength(0);
          expect(await tx.select().from(creatorChannelResolution)).toHaveLength(0);
          throw new Error('rollback sanitizer fixture');
        }),
      ).rejects.toThrow('rollback sanitizer fixture');
    } finally {
      if (touchedHandles.size) {
        await db
          .delete(creatorChannelResolution)
          .where(inArray(creatorChannelResolution.url, [...touchedHandles]));
        const restore = originalResolutions.filter(r => touchedHandles.has(r.url));
        if (restore.length) await db.insert(creatorChannelResolution).values(restore);
      }
      const imported = await db
        .select({ id: deckImportSource.deckId })
        .from(deckImportSource)
        .where(inArray(deckImportSource.sourceDeckId, sourceIds));
      await db.delete(creatorProfile).where(inArray(creatorProfile.id, profileIds));
      await db
        .delete(creatorImportedDeck)
        .where(inArray(creatorImportedDeck.sourceDeckId, sourceIds));
      await deleteFixtureDecks(imported.map(d => d.id));
      if (videoIds.length) await db.delete(spend).where(inArray(spend.videoId, videoIds));
      await db.delete(user).where(eq(user.id, ownerId));
      await db
        .delete(creatorYoutubeChannel)
        .where(inArray(creatorYoutubeChannel.channelId, channels));
    }
  },
  60_000,
);
