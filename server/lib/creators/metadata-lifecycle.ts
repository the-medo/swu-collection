import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import {
  creation,
  creationRevision,
  creatorChannel,
  creatorOauthState,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import { creationReport } from '../../db/schema/creation_report.ts';
import { creatorVideoJob } from '../../db/schema/creator_video_job.ts';
import type { CreationDocument, CreationField } from '../../../shared/creators/contracts.ts';
import type { Database, Transaction } from './types.ts';
import { removeCreatorPublication } from './publication.ts';
import { documentFromVideo, type VideoMetadata } from './video.ts';

export const providerFields = [
  'title',
  'summary',
  'videoDescription',
  'coverUrl',
  'language',
  'chapters',
] as const satisfies readonly CreationField[];

export function refreshedVideoDocument(
  document: CreationDocument,
  metadata: VideoMetadata,
  protectedFields: CreationField[],
): CreationDocument {
  const fresh = documentFromVideo(metadata, { fallbackLanguage: document.language });
  const changes = Object.fromEntries(
    providerFields
      .filter(field => !protectedFields.includes(field))
      .map(field => [field, fresh[field]]),
  );
  return { ...document, ...changes };
}

/** Retention/removal also scrubs edited copies of provider text. SWUBASE-authored body remains. */
export function scrubVideoDocument(document: CreationDocument): CreationDocument {
  return {
    ...document,
    title: 'YouTube video unavailable',
    summary: '',
    videoDescription: '',
    coverUrl: '',
    chapters: [],
    language: 'en',
  };
}

export async function removeVideoMetadata(
  tx: Transaction,
  row: typeof creation.$inferSelect,
  reason: 'unavailable' | 'expired' | 'authorization_removed',
  at: string,
) {
  const protectedFields = row.manuallyEditedFields.filter(
    field => !providerFields.some(providerField => providerField === field),
  );
  await removeCreatorPublication(tx, row.id);
  await tx
    .update(creation)
    .set({
      draft: scrubVideoDocument(row.draft),
      manuallyEditedFields: protectedFields,
      sourceStatus: reason,
      sourceMetadataAt: null,
      sourceCheckedAt: at,
      revision: row.revision + 1,
      updatedAt: at,
    })
    .where(eq(creation.id, row.id));
  // Historical snapshots must not retain the deleted provider data.
  const history = await tx
    .select()
    .from(creationRevision)
    .where(eq(creationRevision.creationId, row.id));
  for (const revision of history)
    await tx
      .update(creationRevision)
      .set({
        document: scrubVideoDocument(revision.document),
        manuallyEditedFields: revision.manuallyEditedFields.filter(
          field => !providerFields.some(providerField => providerField === field),
        ),
      })
      .where(
        and(
          eq(creationRevision.creationId, row.id),
          eq(creationRevision.revision, revision.revision),
        ),
      );
  await tx.insert(creationRevision).values({
    creationId: row.id,
    revision: row.revision + 1,
    document: scrubVideoDocument(row.draft),
    manuallyEditedFields: protectedFields,
  });
  await tx
    .update(creationReport)
    .set({ title: 'YouTube video unavailable' })
    .where(eq(creationReport.creationId, row.id));
  if (row.sourceVideoId)
    await tx
      .update(creatorVideoJob)
      .set({
        metadata: null,
        analysis: null,
        issues: [],
        metadataFetchedAt: null,
      })
      .where(eq(creatorVideoJob.videoId, row.sourceVideoId));
}

/** Caller holds the profile lock. A public channel association survives loss of OAuth. */
export async function disconnectYoutubeInTransaction(
  tx: Transaction,
  creatorId: string,
  channelId: string,
  reason: 'revoked' | 'disconnected' | 'expired',
  at: string,
) {
  await tx
    .delete(creatorYoutube)
    .where(and(eq(creatorYoutube.creatorId, creatorId), eq(creatorYoutube.channelId, channelId)));
  await tx
    .update(creatorChannel)
    .set({
      origin: 'public',
      disconnectedAt: at,
      disconnectReason: reason,
    })
    .where(
      and(
        eq(creatorChannel.creatorId, creatorId),
        eq(creatorChannel.channelId, channelId),
        inArray(creatorChannel.origin, ['oauth', 'public']),
      ),
    );
  await tx.delete(creatorOauthState).where(eq(creatorOauthState.creatorId, creatorId));
  await tx
    .update(creatorYoutubeChannel)
    .set({
      title: '',
      avatarUrl: '',
      metadataUpdatedAt: null,
      metadataCheckedAt: null,
      metadataOrigin: null,
    })
    .where(
      and(
        eq(creatorYoutubeChannel.channelId, channelId),
        eq(creatorYoutubeChannel.metadataOrigin, 'oauth'),
      ),
    );
  const rows = await tx
    .select()
    .from(creation)
    .where(
      and(
        eq(creation.creatorId, creatorId),
        eq(creation.sourceDataOrigin, 'oauth'),
        or(eq(creation.sourceChannelId, channelId), isNull(creation.sourceChannelId)),
        or(isNull(creation.sourceStatus), ne(creation.sourceStatus, 'authorization_removed')),
      ),
    )
    .for('update');
  for (const row of rows) await removeVideoMetadata(tx, row, 'authorization_removed', at);
}

export async function disconnectYoutube(
  database: Database,
  connection: typeof creatorYoutube.$inferSelect,
  reason: 'revoked' | 'expired',
  at: string,
) {
  return database.transaction(async tx => {
    await tx
      .select()
      .from(creatorProfile)
      .where(eq(creatorProfile.id, connection.creatorId))
      .for('update');
    const [current] = await tx
      .select()
      .from(creatorYoutube)
      .where(
        and(
          eq(creatorYoutube.channelId, connection.channelId),
          eq(creatorYoutube.creatorId, connection.creatorId),
          eq(creatorYoutube.accessToken, connection.accessToken),
        ),
      )
      .for('update');
    // A callback/refresh that completed during the provider request wins.
    if (!current) return false;
    await disconnectYoutubeInTransaction(tx, current.creatorId, current.channelId, reason, at);
    return true;
  });
}
