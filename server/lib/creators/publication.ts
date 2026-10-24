import type { CardCatalogReader } from '../cards/cardListProvider.ts';
import { METADATA_RETENTION_MS } from './youtube-lifecycle-policy.ts';
import { eq } from 'drizzle-orm';
import {
  creation,
  creationReference,
  creationTag,
  creatorProfile,
} from '../../db/schema/creator_hub.ts';
import { isPostEmpty } from '../../../shared/posts/content.ts';
import type { Transaction as Tx } from './types.ts';
import { now } from './types.ts';
import { CreatorError } from './errors.ts';
import { resolveReferences } from './references.ts';
import { assertCreationTextAllowed } from './moderation.ts';

export async function removeCreatorPublication(tx: Tx, id: string) {
  await tx
    .update(creation)
    .set({
      published: null,
      publishedRevision: null,
      publishedManuallyEditedFields: [],
      publishedAt: null,
      publicUpdatedAt: null,
    })
    .where(eq(creation.id, id));
  await tx.delete(creationTag).where(eq(creationTag.creationId, id));
  await tx.delete(creationReference).where(eq(creationReference.creationId, id));
}

export async function writeCreatorPublication(
  tx: Tx,
  row: typeof creation.$inferSelect,
  catalog?: CardCatalogReader,
) {
  if (row.sourceVideoId && row.sourceStatus && row.sourceStatus !== 'active')
    throw new CreatorError('This YouTube video is unavailable or its stored metadata was removed.');
  if (
    row.sourceVideoId &&
    Date.parse(row.sourceMetadataAt ?? row.createdAt) <= Date.now() - METADATA_RETENTION_MS
  )
    throw new CreatorError('YouTube metadata needs refreshing before this video can be published.');
  const document = row.draft;
  assertCreationTextAllowed(document);
  if (document.medium === 'article' && isPostEmpty(document.body))
    throw new CreatorError('Write your article before publishing.');
  const [profile] = row.creatorId
    ? await tx
        .select({ ownerId: creatorProfile.ownerId })
        .from(creatorProfile)
        .where(eq(creatorProfile.id, row.creatorId))
    : [];
  if (
    (
      await resolveReferences(document.references, tx, catalog, {
        creatorId: row.creatorId ?? undefined,
        ownerId: profile?.ownerId,
      })
    ).length !== document.references.length
  )
    throw new CreatorError(
      'A linked subject is unavailable. Use a public deck or an unlisted deck owned by this creator.',
    );
  await tx.delete(creationTag).where(eq(creationTag.creationId, row.id));
  await tx.insert(creationTag).values(
    [...new Set([`medium:${document.medium}`, ...document.tags])].map(tagId => ({
      creationId: row.id,
      tagId,
    })),
  );
  await tx.delete(creationReference).where(eq(creationReference.creationId, row.id));
  const references = [
    ...new Map(document.references.map(ref => [`${ref.type}:${ref.id}`, ref])).values(),
  ];
  if (references.length)
    await tx
      .insert(creationReference)
      .values(
        references.map(ref => ({ creationId: row.id, entityType: ref.type, entityId: ref.id })),
      );
  const [updated] = await tx
    .update(creation)
    .set({
      published: document,
      publishedManuallyEditedFields: row.manuallyEditedFields,
      publishedRevision: row.revision,
      publishedAt: row.publishedAt ?? now(),
      publicUpdatedAt: now(),
    })
    .where(eq(creation.id, row.id))
    .returning();
  return updated;
}
