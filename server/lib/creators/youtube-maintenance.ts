import {
  AUTH_CHECK_MS,
  METADATA_REFRESH_MS,
  METADATA_RETENTION_MS,
  RETRY_MS,
} from './youtube-lifecycle-policy.ts';
import { isDeepStrictEqual } from 'node:util';
import { and, asc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  creation,
  creationRevision,
  creatorOauthState,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import {
  creatorChannelResolution,
  creatorVideoJob as jobs,
} from '../../db/schema/creator_video_job.ts';
import { creationReport } from '../../db/schema/creation_report.ts';
import type { Database } from './types.ts';
import {
  disconnectYoutube,
  refreshedVideoDocument,
  removeVideoMetadata,
} from './metadata-lifecycle.ts';
import { refreshYoutubeAccess } from './youtube-access.ts';
import { exchangeYoutubeToken, YoutubeAccessRevoked } from './youtube-credentials.ts';
import { youtubeClient } from './worker/providers.ts';
import { assertCreationTextAllowed } from './moderation.ts';
import { ProfanityError } from '../moderation/content.ts';
import { removeCreatorPublication } from './publication.ts';

export function createYoutubeMaintenance(
  options: {
    database?: Database;
    youtube?: Pick<ReturnType<typeof youtubeClient>, 'video' | 'channels'>;
    exchange?: typeof exchangeYoutubeToken;
    clock?: () => number;
  } = {},
) {
  const database = options.database ?? db;
  const clock = options.clock ?? Date.now;
  const provider = () => options.youtube ?? youtubeClient(process.env.YOUTUBE_API_KEY ?? '');
  return async function maintain(limit = 50, dryRun = false) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500)
      throw new Error('invalid_maintenance_limit');
    const time = clock(),
      at = new Date(time).toISOString();
    const before = (age: number) => new Date(time - age).toISOString();
    const expired = and(
      isNotNull(creation.sourceVideoId),
      eq(creation.sourceStatus, 'active'),
      or(
        lt(creation.sourceMetadataAt, before(METADATA_RETENTION_MS)),
        isNull(creation.sourceMetadataAt),
      ),
    );
    const dueVideo = and(
      isNotNull(creation.sourceVideoId),
      sql`${creation.sourceStatus} IS DISTINCT FROM 'authorization_removed'`,
      or(
        isNull(creation.sourceCheckedAt),
        and(
          eq(creation.sourceStatus, 'unavailable'),
          lt(creation.sourceCheckedAt, before(METADATA_REFRESH_MS)),
        ),
        and(
          sql`${creation.sourceStatus} IS DISTINCT FROM 'unavailable'`,
          lt(creation.sourceCheckedAt, before(RETRY_MS)),
        ),
      ),
      or(
        isNull(creation.sourceMetadataAt),
        lt(creation.sourceMetadataAt, before(METADATA_REFRESH_MS)),
      ),
    );
    const dueChannel = and(
      or(
        isNull(creatorYoutubeChannel.metadataCheckedAt),
        lt(creatorYoutubeChannel.metadataCheckedAt, before(RETRY_MS)),
      ),
      or(
        isNull(creatorYoutubeChannel.metadataUpdatedAt),
        lt(creatorYoutubeChannel.metadataUpdatedAt, before(METADATA_REFRESH_MS)),
      ),
    );
    const dueConnection = and(
      lt(creatorYoutube.checkedAt, before(AUTH_CHECK_MS)),
      or(
        isNull(creatorYoutube.lastCheckAttemptAt),
        lt(creatorYoutube.lastCheckAttemptAt, before(RETRY_MS)),
      ),
    );
    if (dryRun) {
      const counts = await database.execute(sql`SELECT
        (SELECT count(*)::int FROM ${creation} WHERE ${dueVideo}) AS videos,
        (SELECT count(*)::int FROM ${creatorYoutubeChannel} WHERE ${dueChannel}) AS channels,
        (SELECT count(*)::int FROM ${creatorYoutube} WHERE ${dueConnection}) AS connections,
        (SELECT count(*)::int FROM ${creation} WHERE ${expired}) AS expired`);
      return { dryRun: true, due: counts[0], limit };
    }
    const result = {
      videosRefreshed: 0,
      videosRemoved: 0,
      channelsRefreshed: 0,
      connectionsChecked: 0,
      connectionsRemoved: 0,
      expired: 0,
      failed: 0,
    };
    // A transaction advisory lock avoids overlapping schedulers. Provider requests have timeouts;
    // the small transaction holds only this lock, not user/content rows.
    return database.transaction(async lock => {
      const locked = await lock.execute(
        sql`SELECT pg_try_advisory_xact_lock(873125905) AS acquired`,
      );
      if (!locked[0]?.acquired) return { ...result, alreadyRunning: true };
      // Cleanup does not require keys or healthy providers and is independent of the refresh budget.
      const overdue = await database
        .select({ id: creation.id, creatorId: creation.creatorId })
        .from(creation)
        .where(expired);
      for (const candidate of overdue)
        await database.transaction(async tx => {
          await tx
            .select()
            .from(creatorProfile)
            .where(eq(creatorProfile.id, candidate.creatorId))
            .for('update');
          const [row] = await tx
            .select()
            .from(creation)
            .where(and(eq(creation.id, candidate.id), expired))
            .for('update');
          if (row) {
            await removeVideoMetadata(tx, row, 'expired', at);
            result.expired++;
          }
        });
      await database
        .update(jobs)
        .set({ metadata: null, analysis: null, issues: [], metadataFetchedAt: null })
        .where(
          and(
            or(
              isNotNull(jobs.metadata),
              isNotNull(jobs.analysis),
              sql`jsonb_array_length(${jobs.issues}) > 0`,
            ),
            sql`coalesce(${jobs.metadataFetchedAt}, ${jobs.createdAt}) < ${before(METADATA_RETENTION_MS)}`,
          ),
        );
      await database
        .update(creatorYoutubeChannel)
        .set({ title: '', avatarUrl: '', metadataOrigin: null, metadataUpdatedAt: null })
        .where(lt(creatorYoutubeChannel.metadataUpdatedAt, before(METADATA_RETENTION_MS)));
      await database
        .delete(creatorChannelResolution)
        .where(lt(creatorChannelResolution.resolvedAt, before(METADATA_RETENTION_MS)));
      await database.delete(creatorOauthState).where(lt(creatorOauthState.expiresAt, at));

      // An extended scheduler/provider outage must not retain unverified consent indefinitely.
      const expiredConnections = await database
        .select()
        .from(creatorYoutube)
        .where(lt(creatorYoutube.checkedAt, before(METADATA_RETENTION_MS)));
      for (const connection of expiredConnections)
        if (await disconnectYoutube(database, connection, 'expired', at))
          result.connectionsRemoved++;

      // Confirmed invalid_grant/scope loss removes consent; outages only retry until the deadline.
      const connections = await database
        .select()
        .from(creatorYoutube)
        .where(dueConnection)
        .orderBy(
          sql`${creatorYoutube.lastCheckAttemptAt} ASC NULLS FIRST`,
          asc(creatorYoutube.channelId),
        )
        .limit(limit);
      for (const connection of connections) {
        try {
          await refreshYoutubeAccess(
            database,
            connection,
            at,
            options.exchange ?? exchangeYoutubeToken,
          );
          result.connectionsChecked++;
        } catch (error) {
          if (error instanceof YoutubeAccessRevoked) result.connectionsRemoved++;
          else result.failed++;
        }
      }

      const channels = await database
        .select()
        .from(creatorYoutubeChannel)
        .where(dueChannel)
        .orderBy(
          sql`${creatorYoutubeChannel.metadataCheckedAt} ASC NULLS FIRST`,
          asc(creatorYoutubeChannel.channelId),
        )
        .limit(Math.min(limit, 50));
      if (channels.length) {
        try {
          const fresh = new Map(
            (await provider().channels(channels.map(channel => channel.channelId))).map(channel => [
              channel.channelId,
              channel,
            ]),
          );
          for (const channel of channels) {
            const value = fresh.get(channel.channelId);
            await database
              .update(creatorYoutubeChannel)
              .set({
                title: value?.title ?? '',
                avatarUrl: value?.avatarUrl ?? '',
                metadataUpdatedAt: at,
                metadataCheckedAt: at,
                metadataOrigin: 'public',
              })
              .where(
                and(
                  eq(creatorYoutubeChannel.channelId, channel.channelId),
                  sql`${creatorYoutubeChannel.metadataUpdatedAt} IS NOT DISTINCT FROM ${channel.metadataUpdatedAt}`,
                ),
              );
            result.channelsRefreshed++;
          }
        } catch {
          result.failed++;
          for (const channel of channels)
            await database
              .update(creatorYoutubeChannel)
              .set({ metadataCheckedAt: at })
              .where(eq(creatorYoutubeChannel.channelId, channel.channelId));
        }
      }

      const candidates = await database
        .select()
        .from(creation)
        .where(dueVideo)
        .orderBy(sql`${creation.sourceCheckedAt} ASC NULLS FIRST`, asc(creation.id))
        .limit(limit);
      for (const candidate of candidates) {
        try {
          const metadata = await provider().video(candidate.sourceVideoId!);
          await database.transaction(async tx => {
            await tx
              .select()
              .from(creatorProfile)
              .where(eq(creatorProfile.id, candidate.creatorId))
              .for('update');
            const [row] = await tx
              .select()
              .from(creation)
              .where(eq(creation.id, candidate.id))
              .for('update');
            if (
              !row ||
              row.sourceStatus === 'authorization_removed' ||
              row.sourceVideoId !== candidate.sourceVideoId ||
              row.sourceMetadataAt !== candidate.sourceMetadataAt
            )
              return;
            if (!metadata || (row.sourceChannelId && metadata.channelId !== row.sourceChannelId)) {
              if (row.sourceStatus === 'active') {
                await removeVideoMetadata(tx, row, 'unavailable', at);
                result.videosRemoved++;
              } else
                await tx
                  .update(creation)
                  .set({ sourceCheckedAt: at })
                  .where(eq(creation.id, row.id));
              return;
            }
            const draft = refreshedVideoDocument(row.draft, metadata, row.manuallyEditedFields);
            let published =
              row.published &&
              refreshedVideoDocument(row.published, metadata, row.publishedManuallyEditedFields);
            if (published) {
              try {
                assertCreationTextAllowed(published);
              } catch (error) {
                if (!(error instanceof ProfanityError)) throw error;
                await removeCreatorPublication(tx, row.id);
                published = null;
              }
            }
            const draftChanged = !isDeepStrictEqual(draft, row.draft);
            const publishedChanged = !isDeepStrictEqual(published, row.published);
            const revision = row.revision + (draftChanged ? 1 : 0);
            await tx
              .update(creation)
              .set({
                draft,
                published,
                publishedRevision: published
                  ? isDeepStrictEqual(draft, published)
                    ? revision
                    : row.publishedRevision
                  : null,
                revision,
                ...(draftChanged || publishedChanged ? { updatedAt: at } : {}),
                ...(published && publishedChanged ? { publicUpdatedAt: at } : {}),
                sourceDataOrigin: 'public',
                sourceMetadataAt: at,
                sourceCheckedAt: at,
                sourceStatus: 'active',
                sourceChannelId: metadata.channelId,
              })
              .where(eq(creation.id, row.id));
            const history = await tx
              .select()
              .from(creationRevision)
              .where(eq(creationRevision.creationId, row.id));
            for (const old of history)
              await tx
                .update(creationRevision)
                .set({
                  document: refreshedVideoDocument(
                    old.document,
                    metadata,
                    old.manuallyEditedFields,
                  ),
                })
                .where(
                  and(
                    eq(creationRevision.creationId, row.id),
                    eq(creationRevision.revision, old.revision),
                  ),
                );
            if (draftChanged)
              await tx.insert(creationRevision).values({
                creationId: row.id,
                revision,
                document: draft,
                manuallyEditedFields: row.manuallyEditedFields,
              });
            if (draftChanged)
              await tx
                .delete(creationRevision)
                .where(
                  and(
                    eq(creationRevision.creationId, row.id),
                    lt(creationRevision.revision, revision - 30),
                    sql`${creationRevision.revision} IS DISTINCT FROM ${row.publishedRevision}`,
                  ),
                );
            await tx
              .update(creationReport)
              .set({ title: published?.title ?? draft.title })
              .where(eq(creationReport.creationId, row.id));
            // Never renew the age of stale classifier evidence or issue URLs by refreshing metadata.
            await tx
              .update(jobs)
              .set({ metadata: null, analysis: null, issues: [], metadataFetchedAt: null })
              .where(eq(jobs.videoId, metadata.id));
            result.videosRefreshed++;
          });
        } catch {
          result.failed++;
          await database
            .update(creation)
            .set({ sourceCheckedAt: at })
            .where(
              and(
                eq(creation.id, candidate.id),
                sql`${creation.sourceCheckedAt} IS NOT DISTINCT FROM ${candidate.sourceCheckedAt}`,
              ),
            );
        }
      }
      return result;
    });
  };
}
