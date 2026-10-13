import { db } from '../../db/index.ts';
import type { Database } from './types.ts';
import { CreatorError } from './errors.ts';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import {
  creation,
  creationRevision,
  creatorProfile,
  creatorYoutube,
} from '../../db/schema/creator_hub.ts';
import type { CreationDocument } from '../../../shared/creators/contracts.ts';
import { youtubeVideoId } from '../../../shared/creators/youtube.ts';
import { createCreatorDtos } from './dto.ts';
import { creationListSelection, publicCreation } from './list.ts';
import { requireCreator } from './permissions.ts';
import { writeCreatorPublication, removeCreatorPublication } from './publication.ts';
import { now } from './types.ts';
import { trackManualEdits } from './manual-edits.ts';

export function createCreationsService(database: Database = db) {
  const { publicDto } = createCreatorDtos(database);
  return {
    async studio(creatorId: string, viewerId: string, page = 1) {
      await requireCreator(database, creatorId, viewerId);
      const rows = await database
        .select(creationListSelection(true))
        .from(creation)
        .innerJoin(creatorProfile, eq(creation.creatorId, creatorProfile.id))
        .where(eq(creation.creatorId, creatorId))
        .orderBy(desc(creation.updatedAt), desc(creation.id))
        .limit(25)
        .offset((page - 1) * 24);
      return {
        items: rows.slice(0, 24),
        hasMore: rows.length > 24,
      };
    },
    async get(id: string, viewerId?: string, edit = false) {
      const [row] = await database
        .select({ item: creation, profile: creatorProfile })
        .from(creation)
        .innerJoin(creatorProfile, eq(creation.creatorId, creatorProfile.id))
        .where(and(eq(creation.id, id), edit ? undefined : publicCreation()));
      if (!row || (!edit && !row.item.published))
        throw new CreatorError('Publication not found.', 404);
      if (edit) {
        if (!viewerId) throw new CreatorError('Sign in to edit.', 401);
        await requireCreator(database, row.item.creatorId, viewerId);
      }
      return publicDto(row.item, row.profile, edit);
    },
    async save(
      creatorId: string,
      viewerId: string,
      document: CreationDocument,
      id?: string,
      revision?: number,
      sourceVideoId?: string,
      sourceChannelId?: string,
      sourceDataOrigin: 'public' | 'oauth' = 'oauth',
    ) {
      return database.transaction(async tx => {
        await requireCreator(tx, creatorId, viewerId, !!sourceChannelId, true);
        if (sourceChannelId) {
          const [channel] = await tx
            .select({ id: creatorYoutube.channelId })
            .from(creatorYoutube)
            .where(
              and(
                eq(creatorYoutube.channelId, sourceChannelId),
                eq(creatorYoutube.creatorId, creatorId),
              ),
            );
          if (!channel)
            throw new CreatorError(
              'This channel was disconnected. Reconnect before importing.',
              409,
            );
        }
        let manuallyEditedFields: typeof creation.$inferSelect.manuallyEditedFields = [];
        if (id) {
          const [existing] = await tx
            .select()
            .from(creation)
            .where(and(eq(creation.id, id), eq(creation.creatorId, creatorId)));
          if (
            existing?.sourceVideoId &&
            (document.medium !== 'video' ||
              youtubeVideoId(document.sourceUrl) !== existing.sourceVideoId)
          )
            throw new CreatorError(
              'An imported video must keep its original YouTube source. Create a separate creation to share another resource.',
            );
          if (existing?.sourceVideoId)
            manuallyEditedFields = trackManualEdits(
              existing.draft,
              document,
              existing.manuallyEditedFields,
            );
        }
        const [row] = id
          ? await tx
              .update(creation)
              .set({
                draft: document,
                manuallyEditedFields,
                updatedAt: now(),
                revision: sql`${creation.revision} + 1`,
              })
              .where(
                and(
                  eq(creation.id, id),
                  eq(creation.creatorId, creatorId),
                  eq(creation.revision, revision!),
                ),
              )
              .returning()
          : await tx
              .insert(creation)
              .values({
                creatorId,
                authorId: viewerId,
                draft: document,
                sourceVideoId,
                ...(sourceVideoId
                  ? {
                      sourceChannelId,
                      sourceDataOrigin,
                      sourceMetadataAt: now(),
                      sourceCheckedAt: now(),
                      sourceStatus: 'active' as const,
                    }
                  : {}),
              })
              .returning();
        if (!row)
          throw new CreatorError(
            'This draft changed. Reload it before saving; your edits have been kept.',
            409,
          );
        await tx
          .insert(creationRevision)
          .values({ creationId: row.id, revision: row.revision, document, manuallyEditedFields });
        // Retain the latest 30 saves and the currently published version.
        await tx
          .delete(creationRevision)
          .where(
            and(
              eq(creationRevision.creationId, row.id),
              lt(creationRevision.revision, row.revision - 30),
              sql`${creationRevision.revision} IS DISTINCT FROM ${row.publishedRevision}`,
            ),
          );
        return { id: row.id, revision: row.revision };
      });
    },
    async publish(id: string, viewerId: string, revision: number, unpublish = false) {
      return database.transaction(async tx => {
        const [item] = await tx.select().from(creation).where(eq(creation.id, id));
        if (!item) throw new CreatorError('Publication not found.', 404);
        await requireCreator(tx, item.creatorId, viewerId, false, true);
        const [row] = await tx.select().from(creation).where(eq(creation.id, id)).for('update');
        if (!row || row.revision !== revision)
          throw new CreatorError('This draft changed. Reload before publishing.', 409);
        if (unpublish) await removeCreatorPublication(tx, id);
        else await writeCreatorPublication(tx, row);
      });
    },
    async revisions(id: string, viewerId: string) {
      const [item] = await database.select().from(creation).where(eq(creation.id, id));
      if (!item) throw new CreatorError('Publication not found.', 404);
      await requireCreator(database, item.creatorId, viewerId);
      return database
        .select({
          revision: creationRevision.revision,
          document: creationRevision.document,
          createdAt: creationRevision.createdAt,
        })
        .from(creationRevision)
        .where(eq(creationRevision.creationId, id))
        .orderBy(desc(creationRevision.revision))
        .limit(32);
    },
  };
}
