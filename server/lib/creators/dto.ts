import { METADATA_RETENTION_MS } from './youtube-lifecycle-policy.ts';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  creation,
  creatorProfile,
  creatorChannel,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import type { Creation, CreatorProfile } from '../../../shared/creators/contracts.ts';
import { resolveReferences } from './references.ts';
import type { Database } from './types.ts';

export function createCreatorDtos(database: Database) {
  const publicDto = async (
    row: typeof creation.$inferSelect,
    profile: typeof creatorProfile.$inferSelect,
    edit = false,
  ): Promise<Creation> => {
    const document = edit ? row.draft : row.published!;
    const references = await resolveReferences(document.references, database);
    return {
      id: row.id,
      creatorId: row.creatorId,
      authorId: row.authorId,
      revision: edit ? row.revision : row.publishedRevision!,
      document: edit
        ? document
        : {
            ...document,
            references: references.map(({ type, id, startSeconds }) => ({
              type,
              id,
              startSeconds,
            })),
          },
      sourceVerified: !!row.sourceVideoId,
      publishedAt: row.publishedAt,
      updatedAt: edit ? row.updatedAt : (row.publicUpdatedAt ?? row.publishedAt!),
      ...(edit
        ? {
            hasUnpublishedChanges: row.revision !== row.publishedRevision,
            manuallyEditedFields: row.manuallyEditedFields,
            sourceStatus: row.sourceStatus,
          }
        : {}),
      creator: {
        slug: profile.slug,
        name: profile.profile.name,
        avatarUrl: profile.profile.avatarUrl,
      },
      references,
    };
  };
  async function profileDto(
    row: typeof creatorProfile.$inferSelect,
    knownChannels?: CreatorProfile['youtube'],
  ): Promise<CreatorProfile> {
    const youtube =
      knownChannels ??
      (await database
        .select({
          channelId: creatorChannel.channelId,
          title: sql<string>`CASE WHEN ${creatorYoutubeChannel.metadataUpdatedAt} > now() - (${METADATA_RETENTION_MS}::double precision * interval '1 millisecond') THEN ${creatorYoutubeChannel.title} ELSE '' END`,
        })
        .from(creatorChannel)
        .innerJoin(
          creatorYoutubeChannel,
          eq(creatorYoutubeChannel.channelId, creatorChannel.channelId),
        )
        .where(
          and(
            eq(creatorChannel.creatorId, row.id),
            inArray(creatorChannel.origin, ['oauth', 'public']),
          ),
        ));
    return {
      ...row.profile,
      id: row.id,
      slug: row.slug,
      ownerId: row.ownerId,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      youtube,
    };
  }
  async function profileDtos(rows: (typeof creatorProfile.$inferSelect)[]) {
    if (!rows.length) return [];
    const channels = await database
      .select({
        creatorId: creatorChannel.creatorId,
        channelId: creatorChannel.channelId,
        title: sql<string>`CASE WHEN ${creatorYoutubeChannel.metadataUpdatedAt} > now() - (${METADATA_RETENTION_MS}::double precision * interval '1 millisecond') THEN ${creatorYoutubeChannel.title} ELSE '' END`,
      })
      .from(creatorChannel)
      .innerJoin(
        creatorYoutubeChannel,
        eq(creatorYoutubeChannel.channelId, creatorChannel.channelId),
      )
      .where(
        and(
          inArray(creatorChannel.origin, ['oauth', 'public']),
          inArray(
            creatorChannel.creatorId,
            rows.map(row => row.id),
          ),
        ),
      );
    const byCreator = new Map<string, CreatorProfile['youtube']>();
    for (const channel of channels)
      byCreator.set(channel.creatorId, [
        ...(byCreator.get(channel.creatorId) ?? []),
        { channelId: channel.channelId, title: channel.title },
      ]);
    return Promise.all(rows.map(row => profileDto(row, byCreator.get(row.id) ?? [])));
  }
  return { publicDto, profileDto, profileDtos };
}
