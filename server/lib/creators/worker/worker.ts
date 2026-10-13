import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../db/index.ts';
import { creation, creatorProfile } from '../../../db/schema/creator_hub.ts';
import { getMergedCardList } from '../../cards/cardListProvider.ts';
import { getDeckBuilderForSource } from '../../decks/deckBuilders.ts';
import type { EntityReference } from '../../../../shared/creators/contracts.ts';
import {
  classificationSchema,
  ANALYSIS_VERSION,
  budgetMicros,
  errorCode,
  WorkerError,
  isRejectedGeminiRequest,
  type Analysis,
  type JobStatus,
  type WorkerIssue,
  type WorkerCode,
} from './contracts.ts';
import {
  createWorkerStore,
  eligibleChannels,
  refreshDirectoryHandles,
  type Database,
  type Job,
} from './store.ts';
import {
  descriptionDeckLinks,
  metadataHash,
  shouldPublish,
  validatedClassification,
  videoDocument,
} from './metadata.ts';
import { generateClassification, geminiRequest, youtubeClient } from './providers.ts';
import { importVideoDeck } from './decks.ts';
import { deckDisposition } from './policy.ts';
import { assertCreationTextAllowed } from '../moderation.ts';
import { ProfanityError } from '../../moderation/content.ts';
import { createVideoDiscovery } from './discovery.ts';
import { assertChannelImportAllowed } from './channel-policy.ts';
import { createYoutubeMaintenance } from '../youtube-maintenance.ts';

export function createVideoWorker(
  options: {
    database?: Database;
    youtube?: ReturnType<typeof youtubeClient>;
    generate?: typeof generateClassification;
    cards?: typeof getMergedCardList;
    fetchDeck?: (
      source: Parameters<typeof getDeckBuilderForSource>[0],
      id: string,
    ) => ReturnType<NonNullable<ReturnType<typeof getDeckBuilderForSource>>['fetchDeck']>;
    capMicros?: number;
  } = {},
) {
  const database = options.database ?? db;
  const store = createWorkerStore(database);
  const youtube = () => options.youtube ?? youtubeClient(process.env.YOUTUBE_API_KEY ?? '');
  const getCards = options.cards ?? getMergedCardList;
  const generate = options.generate ?? generateClassification;
  const fetchDeck =
    options.fetchDeck ?? ((source, id) => getDeckBuilderForSource(source)!.fetchDeck(id));

  async function processJob(job: Job): Promise<JobStatus> {
    const [existing] = await database
      .select({ id: creation.id })
      .from(creation)
      .where(eq(creation.sourceVideoId, job.videoId));
    if (existing) {
      await store.finish(job, 'skipped', 'existing_creation_preserved');
      return 'skipped';
    }
    await assertChannelImportAllowed(database, job);
    // Always recheck visibility/channel; cached metadata must not publish a now-private video.
    const metadata = await youtube().video(job.videoId);
    if (!metadata) {
      await store.finish(job, 'skipped', 'video_unavailable');
      return 'skipped';
    }
    if (metadata.channelId !== job.channelId)
      throw new WorkerError('video_channel_mismatch', false);
    await store.checkpoint(job, { metadata });
    const cards = await getCards();
    let analysis: Analysis;
    if (
      job.analysis?.version === ANALYSIS_VERSION &&
      job.analysis.metadataHash === metadataHash(metadata)
    ) {
      analysis = { ...job.analysis, ...validatedClassification(job.analysis, metadata, cards) };
    } else {
      const body = geminiRequest(metadata, cards);
      const reservation = await store.reserve(job.videoId, options.capMicros ?? budgetMicros());
      let response: Awaited<ReturnType<typeof generateClassification>>;
      try {
        response = await generate(process.env.GEMINI_API_KEY ?? '', body);
      } catch (error) {
        if (error instanceof WorkerError && isRejectedGeminiRequest(error.code))
          await store.releaseRejectedRequest(reservation);
        throw error;
      }
      await store.settle(reservation, response.usage);
      const parsed = classificationSchema.safeParse(response.value);
      if (!parsed.success) throw new WorkerError('gemini_invalid_classification');
      analysis = {
        ...validatedClassification(parsed.data, metadata, cards),
        version: ANALYSIS_VERSION,
        metadataHash: metadataHash(metadata),
      };
      await store.checkpoint(job, { analysis });
    }
    if (!shouldPublish(analysis)) {
      await store.finish(job, 'skipped', 'not_swu');
      return 'skipped';
    }
    const [profile] = await database
      .select()
      .from(creatorProfile)
      .where(eq(creatorProfile.id, job.creatorId));
    if (!profile) throw new WorkerError('creator_missing', false);
    let autoPublish = true;
    const references: EntityReference[] = [];
    const issues: WorkerIssue[] = [];
    try {
      assertCreationTextAllowed(
        videoDocument(metadata, analysis, profile.profile.languages[0] ?? 'en'),
      );
    } catch (error) {
      if (!(error instanceof ProfanityError)) throw error;
      autoPublish = false;
      issues.push({ code: 'video_text_rejected' });
    }
    const links = descriptionDeckLinks(metadata.description);
    if (links.overflow) issues.push({ code: 'deck_link_limit_reached' });
    if (autoPublish) {
      for (const link of links.links) {
        await store.checkpoint(job, {});
        try {
          const sourceDeck = await fetchDeck(link.source, link.sourceDeckId);
          const imported = await importVideoDeck({
            database,
            job,
            ownerId: profile.ownerId,
            source: link.source,
            sourceDeckId: link.sourceDeckId,
            sourceDeck,
            cards,
            analysis,
          });
          references.push({ type: 'deck', id: imported.deck.id, startSeconds: null });
          for (const id of [imported.deck.leaderCardId1, imported.deck.leaderCardId2])
            if (id) references.push({ type: 'leader', id, startSeconds: null });
          if (imported.assumedFormat)
            issues.push({
              code: 'deck_format_defaulted_to_premier',
              source: link.source,
              sourceDeckId: link.sourceDeckId,
            });
        } catch (error) {
          const disposition = deckDisposition(error, job.attempts);
          if (disposition.action === 'retry') throw disposition.error;
          issues.push({
            code: disposition.code,
            source: link.source,
            sourceDeckId: link.sourceDeckId,
            ...(disposition.code === 'deck_provider_failed_after_retries' ? { url: link.url } : {}),
          });
        }
      }
    } else {
      issues.push(
        ...links.links.map(link => ({
          code: 'deck_link_pending_review' as const,
          source: link.source,
          sourceDeckId: link.sourceDeckId,
          url: link.url,
        })),
      );
    }
    const document = videoDocument(
      metadata,
      analysis,
      profile.profile.languages[0] ?? 'en',
      references,
    );
    return store.publish(job, document, autoPublish, issues);
  }

  return {
    store,
    maintain: createYoutubeMaintenance({ database, youtube: options.youtube }),
    discover: createVideoDiscovery(database, youtube),
    async enqueueInventory(value: unknown) {
      const videoId = z.string().regex(/^[\w-]{11}$/);
      const inventory = z
        .object({
          videos: z
            .array(
              z.object({
                videoId,
                channelId: z.string().regex(/^UC[\w-]{22}$/),
              }),
            )
            .max(10_000),
          swuVideoIds: z.array(videoId).max(10_000).optional(),
          excludedVideoIds: z.array(videoId).max(10_000).optional(),
          needsReviewVideoIds: z.array(videoId).max(10_000).optional(),
        })
        .parse(value);
      const approved = inventory.swuVideoIds && new Set(inventory.swuVideoIds);
      const excluded = new Set([
        ...(inventory.excludedVideoIds ?? []),
        ...(inventory.needsReviewVideoIds ?? []),
      ]);
      const unresolvedHandles = await refreshDirectoryHandles(database, youtube().channelForHandle);
      const eligible = await eligibleChannels(database);
      let enqueued = 0,
        ignored = 0;
      for (let i = 0; i < inventory.videos.length; i += 100) {
        const items = inventory.videos.slice(i, i + 100).flatMap(v => {
          const creatorId = eligible.channels.get(v.channelId);
          if (
            !creatorId ||
            eligible.paused.has(v.channelId) ||
            excluded.has(v.videoId) ||
            (approved && !approved.has(v.videoId))
          ) {
            ignored++;
            return [];
          }
          // Resolve the creator from the live directory, never from an input file's claimed owner.
          return [{ ...v, creatorId }];
        });
        enqueued += await store.enqueue(items);
      }
      return { enqueued, ignored, conflicts: eligible.conflicts, unresolvedHandles };
    },
    async run(limit = 10, videoId?: string) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new WorkerError('invalid_worker_limit', false);
      if (videoId && !/^[\w-]{11}$/.test(videoId)) throw new WorkerError('invalid_video_id', false);
      // Fail before claiming/reserving if credentials are missing. Injected providers support offline tests.
      if (!options.youtube && !process.env.YOUTUBE_API_KEY)
        throw new WorkerError('youtube_key_missing', false);
      if (!options.generate && !process.env.GEMINI_API_KEY)
        throw new WorkerError('gemini_key_missing', false);
      budgetMicros();
      await refreshDirectoryHandles(database, youtube().channelForHandle);
      const result = {
        processed: 0,
        published: 0,
        review: 0,
        skipped: 0,
        failed: 0,
        waiting: 0,
        budgetStopped: false,
      };
      let stoppedBy: WorkerCode | undefined;
      for (let i = 0; i < limit; i++) {
        const job = await store.claim(videoId);
        if (!job) break;
        try {
          const status = await processJob(job);
          if (status === 'published' || status === 'review' || status === 'skipped')
            result[status]++;
        } catch (error) {
          const safe = error instanceof WorkerError ? error : new WorkerError(errorCode(error));
          const disposition = await store.fail(job, safe);
          if (disposition.count) result[disposition.count]++;
          if (disposition.stopBatch) {
            stoppedBy = safe.code;
            result.budgetStopped = disposition.budgetStopped;
            if (!disposition.budgetStopped) result.processed++;
            break;
          }
        }
        result.processed++;
      }
      return { ...result, ...(stoppedBy ? { stoppedBy } : {}) };
    },
  };
}
