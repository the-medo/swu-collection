import { metadataHash } from './metadata.ts';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { creatorVideoJob as jobs } from '../../../db/schema/creator_video_job.ts';
import { MAX_ATTEMPTS, WorkerError, type Analysis, type VideoMetadata } from './contracts.ts';
import { failureDisposition } from './policy.ts';
import { now, lease, ownedClaim, type Job } from './state.ts';
import type { Database } from '../types.ts';
import { creatorYoutubeChannel } from '../../../db/schema/creator_hub.ts';

export function createQueueStore(database: Database) {
  return {
    async enqueue(
      items: { videoId: string; creatorId: string; channelId: string }[],
      manuallyRequested = false,
    ) {
      if (!items.length) return 0;
      const insert = database
        .insert(jobs)
        .values(items.map(item => ({ ...item, manuallyRequested })));
      const rows = await (
        manuallyRequested
          ? insert.onConflictDoUpdate({
              target: jobs.videoId,
              set: { manuallyRequested: true, availableAt: now(), updatedAt: now() },
              setWhere: sql`${jobs.creatorId} = excluded.creator_id AND ${jobs.channelId} = excluded.channel_id
          AND ${jobs.status} IN ('pending', 'failed') AND ${jobs.attempts} < ${MAX_ATTEMPTS}
          AND NOT ${jobs.manuallyRequested}`,
            })
          : insert.onConflictDoNothing()
      ).returning({ id: jobs.videoId });
      return rows.length;
    },
    async claim(videoId?: string): Promise<Job | null> {
      return database.transaction(async tx => {
        await tx
          .update(jobs)
          .set({
            status: 'failed',
            claimId: null,
            leaseUntil: null,
            lastError: 'job_lease_expired',
            updatedAt: now(),
          })
          .where(
            and(
              eq(jobs.status, 'processing'),
              sql`${jobs.leaseUntil} < now()`,
              sql`${jobs.attempts} >= ${MAX_ATTEMPTS}`,
            ),
          );
        const [job] = await tx
          .select()
          .from(jobs)
          .where(
            and(
              sql`${jobs.attempts} < ${MAX_ATTEMPTS}`,
              sql`((${jobs.status} IN ('pending', 'failed') AND ${jobs.availableAt} <= now()) OR (${jobs.status} = 'processing' AND ${jobs.leaseUntil} < now()))`,
              videoId ? eq(jobs.videoId, videoId) : undefined,
              sql`(${jobs.manuallyRequested} OR NOT EXISTS (
                SELECT 1 FROM ${creatorYoutubeChannel} WHERE ${creatorYoutubeChannel.channelId} = ${jobs.channelId}
                AND NOT ${creatorYoutubeChannel.autoImportEnabled}
              ))`,
            ),
          )
          .orderBy(asc(jobs.createdAt), asc(jobs.videoId))
          .limit(1)
          .for('update', { skipLocked: true });
        if (!job) return null;
        const [claimed] = await tx
          .update(jobs)
          .set({
            status: 'processing',
            attempts: job.attempts + 1,
            claimId: crypto.randomUUID(),
            leaseUntil: lease(),
            lastError: null,
            updatedAt: now(),
          })
          .where(eq(jobs.videoId, job.videoId))
          .returning();
        return claimed;
      });
    },
    async checkpoint(job: Job, values: { metadata?: VideoMetadata; analysis?: Analysis }) {
      const rows = await database
        .update(jobs)
        .set({
          ...values,
          ...(values.metadata
            ? {
                metadataFetchedAt: now(),
                issues: [],
                ...(job.analysis?.metadataHash === metadataHash(values.metadata)
                  ? {}
                  : { analysis: null }),
              }
            : {}),
          leaseUntil: lease(),
          updatedAt: now(),
        })
        .where(ownedClaim(job))
        .returning({ id: jobs.videoId });
      if (!rows.length) throw new WorkerError('job_claim_lost', false);
    },
    async finish(
      job: Job,
      status: 'skipped',
      code: 'existing_creation_preserved' | 'video_unavailable' | 'not_swu',
    ) {
      await database
        .update(jobs)
        .set({
          status,
          lastError: code,
          claimId: null,
          leaseUntil: null,
          updatedAt: now(),
          ...(code === 'video_unavailable'
            ? { metadata: null, analysis: null, issues: [], metadataFetchedAt: null }
            : {}),
        })
        .where(ownedClaim(job));
    },
    async fail(job: Job, error: WorkerError) {
      const disposition = failureDisposition(job, error);
      await database
        .update(jobs)
        .set({
          ...disposition.update,
          claimId: null,
          leaseUntil: null,
          updatedAt: now(),
        })
        .where(ownedClaim(job));
      return disposition;
    },
    async retry(videoId: string, reclassify = false) {
      // Never resurrect publications/drafts after a creator has edited, deleted or unpublished them.
      return database
        .update(jobs)
        .set({
          status: 'pending',
          attempts: 0,
          availableAt: now(),
          lastError: null,
          ...(reclassify ? { analysis: null } : {}),
        })
        .where(
          and(
            eq(jobs.videoId, videoId),
            reclassify
              ? and(
                  or(
                    inArray(jobs.status, ['failed', 'pending']),
                    and(
                      eq(jobs.status, 'skipped'),
                      inArray(jobs.lastError, [
                        'not_swu',
                        'video_unavailable',
                        'video_wait_expired',
                      ]),
                    ),
                  ),
                  isNull(jobs.creationId),
                )
              : inArray(jobs.status, ['failed', 'pending']),
          ),
        )
        .returning({ videoId: jobs.videoId });
    },
  };
}
