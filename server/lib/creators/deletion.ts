import { createHash } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  creation,
  creatorChannel,
  creatorMember,
  creatorProfile,
  creatorYoutube,
} from '../../db/schema/creator_hub.ts';
import type {
  CreatorDeletion,
  CreatorDeletionPreview,
} from '../../../shared/creators/contracts.ts';
import type { Database, Transaction } from './types.ts';
import { CreatorError } from './errors.ts';
import { requireCreator } from './permissions.ts';
import { lockPersonalOwner } from './ownership.ts';
import { disconnectYoutubeInTransaction } from './metadata-lifecycle.ts';

async function deletionState(
  tx: Transaction,
  profile: typeof creatorProfile.$inferSelect,
  lock = false,
) {
  const itemQuery = tx
    .select({
      id: creation.id,
      authorId: creation.authorId,
      revision: creation.revision,
      ownershipRevision: creation.ownershipRevision,
      publishedRevision: creation.publishedRevision,
      publishedAt: creation.publishedAt,
      updatedAt: creation.updatedAt,
      keepable: sql<boolean>`${creation.authorId} = ${profile.ownerId}
      AND ${creation.draft}->>'medium' = 'article'
      AND (${creation.published} IS NULL OR ${creation.published}->>'medium' = 'article')
      AND ${creation.sourceVideoId} IS NULL`,
    })
    .from(creation)
    .where(eq(creation.creatorId, profile.id))
    .orderBy(asc(creation.id));
  // Only deletion takes locks; its content locks also serialize moderation.
  const items = lock ? await itemQuery.for('update') : await itemQuery;
  const channels = await tx
    .select({ id: creatorChannel.channelId })
    .from(creatorChannel)
    .where(eq(creatorChannel.creatorId, profile.id))
    .orderBy(asc(creatorChannel.channelId));
  const editors = await tx
    .select({ id: creatorMember.userId })
    .from(creatorMember)
    .where(eq(creatorMember.creatorId, profile.id))
    .orderBy(asc(creatorMember.userId));
  const keepable = items.filter(item => item.keepable);
  const preview: CreatorDeletionPreview = {
    name: profile.profile.name,
    slug: profile.slug,
    snapshot: createHash('sha256')
      .update(
        JSON.stringify({
          id: profile.id,
          owner: profile.ownerId,
          revision: profile.revision,
          items,
          channels,
          editors,
        }),
      )
      .digest('hex'),
    total: items.length,
    drafts: items.filter(item => item.publishedRevision === null).length,
    keepableArticles: keepable.length,
    keepableDrafts: keepable.filter(item => item.publishedRevision === null).length,
    channels: channels.length,
    editors: editors.length,
  };
  return { preview, keepable };
}

export function createDeletionService(database: Database) {
  return {
    async deletionPreview(creatorId: string, viewerId: string) {
      return database.transaction(
        async tx => {
          const profile = await requireCreator(tx, creatorId, viewerId, true);
          return (await deletionState(tx, profile)).preview;
        },
        { isolationLevel: 'repeatable read', accessMode: 'read only' },
      );
    },
    async deleteProfile(creatorId: string, viewerId: string, input: CreatorDeletion) {
      return database.transaction(async tx => {
        // Match personal saves/transfers: user -> profile -> content.
        await lockPersonalOwner(tx, viewerId);
        const [existing] = await tx
          .select({ id: creatorProfile.id })
          .from(creatorProfile)
          .where(eq(creatorProfile.id, creatorId))
          .for('update');
        // A stale tab must not imply its preservation choice was applied.
        if (!existing) throw new CreatorError('This creator profile no longer exists.', 404);
        const profile = await requireCreator(tx, creatorId, viewerId, true);
        if (input.confirmation !== profile.slug)
          throw new CreatorError('Enter the creator profile address to confirm deletion.', 400);
        const { preview, keepable } = await deletionState(tx, profile, true);
        if (preview.snapshot !== input.snapshot)
          throw new CreatorError(
            'This profile or its content changed. Review the updated deletion summary.',
            409,
          );
        if (input.keepMyArticles && keepable.length) {
          await tx
            .update(creation)
            .set({
              creatorId: null,
              ownerUserId: viewerId,
              ownershipRevision: sql`${creation.ownershipRevision} + 1`,
            })
            .where(
              and(
                eq(creation.creatorId, creatorId),
                inArray(
                  creation.id,
                  keepable.map(item => item.id),
                ),
              ),
            );
        }
        // Use the same credential/metadata cleanup as an explicit disconnect.
        const connections = await tx
          .select({ channelId: creatorYoutube.channelId })
          .from(creatorYoutube)
          .where(eq(creatorYoutube.creatorId, creatorId));
        for (const connection of connections)
          await disconnectYoutubeInTransaction(
            tx,
            creatorId,
            connection.channelId,
            'disconnected',
            new Date().toISOString(),
          );
        // Cascades remove remaining content, history, follows, members, channel
        // associations and pending jobs. User-owned decks and the account survive.
        await tx
          .delete(creatorProfile)
          .where(and(eq(creatorProfile.id, creatorId), eq(creatorProfile.ownerId, viewerId)));
        return true;
      });
    },
  };
}
