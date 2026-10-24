import { z } from 'zod';
import { and, asc, eq, inArray, isNotNull, isNull, notExists, or, sql } from 'drizzle-orm';
import { user } from '../../db/schema/auth-schema.ts';
import { creation, creationReference } from '../../db/schema/creator_hub.ts';
import {
  creatorClaimedDeck,
  creatorImportedDeck,
  creatorVideoJob,
} from '../../db/schema/creator_video_job.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../../db/schema/deck_folder.ts';
import type { Transaction } from './types.ts';
import { descriptionDeckLinks } from './worker/metadata.ts';

export const youtubeDeckFolderName = 'Youtube Connection Decklists';

/** The caller holds the creator lock; keep the original deck IDs used by its videos. */
export async function transferCreatorDecks(tx: Transaction, creatorId: string, userId: string) {
  const videos = await tx
    .select({ draft: creation.draft, published: creation.published })
    .from(creation)
    .where(and(eq(creation.creatorId, creatorId), isNotNull(creation.sourceVideoId)));
  const ids = [
    ...new Set(
      videos.flatMap(video =>
        [...video.draft.references, ...(video.published?.references ?? [])]
          .filter(ref => ref.type === 'deck' && z.uuid().safeParse(ref.id).success)
          .map(ref => ref.id),
      ),
    ),
  ];
  // Imports can stage decks before a video exists. Move those originals too,
  // so restarting a fenced job never makes a second copy under the new owner.
  const unfinished = await tx
    .select({ metadata: creatorVideoJob.metadata })
    .from(creatorVideoJob)
    .where(
      and(
        eq(creatorVideoJob.creatorId, creatorId),
        isNull(creatorVideoJob.creationId),
        inArray(creatorVideoJob.status, ['pending', 'processing', 'failed']),
      ),
    );
  const sources = [
    ...new Map(
      unfinished
        .flatMap(job => descriptionDeckLinks(job.metadata?.description ?? '').links)
        .map(link => [`${link.source}:${link.sourceDeckId}`, link]),
    ).values(),
  ];
  if (sources.length) {
    const staged = await tx
      .select({ id: deck.id })
      .from(creatorImportedDeck)
      .innerJoin(deck, eq(deck.id, creatorImportedDeck.deckId))
      .where(
        and(
          eq(creatorImportedDeck.userId, 'swubase'),
          eq(creatorImportedDeck.pendingPublication, true),
          eq(deck.userId, 'swubase'),
          eq(deck.public, 2),
          sql`${deck.createdAt} = ${deck.updatedAt}`,
          or(
            ...sources.map(source =>
              and(
                eq(creatorImportedDeck.source, source.source),
                eq(creatorImportedDeck.sourceDeckId, source.sourceDeckId),
              ),
            ),
          ),
          notExists(
            tx
              .select({ id: creationReference.creationId })
              .from(creationReference)
              .where(
                and(
                  eq(creationReference.entityType, 'deck'),
                  eq(creationReference.entityId, sql`${deck.id}::text`),
                ),
              ),
          ),
        ),
      );
    for (const row of staged) if (!ids.includes(row.id)) ids.push(row.id);
  }
  if (!ids.length) return 0;
  // Same owner lock as folder mutations, without blocking inserts' FK key-share locks.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('no key update');
  const decks = await tx
    .select({ id: deck.id })
    .from(deck)
    .where(
      and(
        inArray(deck.id, ids),
        eq(deck.userId, 'swubase'),
        isNull(deck.cardPoolId),
        inArray(deck.public, [1, 2]),
      ),
    )
    .orderBy(asc(deck.id))
    .for('update');
  if (!decks.length) return 0;
  let [folder] = await tx
    .select()
    .from(deckFolder)
    .where(
      and(
        eq(deckFolder.userId, userId),
        eq(deckFolder.name, youtubeDeckFolderName),
        isNull(deckFolder.parentId),
        notExists(
          tx
            .select({ id: deckFolderShare.id })
            .from(deckFolderShare)
            .where(eq(deckFolderShare.folderId, deckFolder.id)),
        ),
      ),
    )
    .orderBy(asc(deckFolder.createdAt), asc(deckFolder.id))
    .limit(1);
  if (!folder) {
    const [last] = await tx
      .select({ position: sql<number>`coalesce(max(${deckFolder.position}), -1)` })
      .from(deckFolder)
      .where(and(eq(deckFolder.userId, userId), isNull(deckFolder.parentId)));
    [folder] = await tx
      .insert(deckFolder)
      .values({ userId, name: youtubeDeckFolderName, position: Number(last.position) + 1 })
      .returning();
  }
  const transferredIds = decks.map(row => row.id);
  await tx
    .update(deck)
    .set({ userId, public: 2, updatedAt: new Date() })
    .where(inArray(deck.id, transferredIds));
  await tx
    .insert(deckFolderDeck)
    .values(transferredIds.map(deckId => ({ deckId, folderId: folder.id })))
    .onConflictDoUpdate({ target: deckFolderDeck.deckId, set: { folderId: folder.id } });
  await tx
    .insert(creatorClaimedDeck)
    .values(transferredIds.map(deckId => ({ deckId })))
    .onConflictDoNothing();
  // A future import by this owner reuses their deck without changing its visibility.
  // Other creators must no longer reuse the former system-owned mapping.
  const mappings = await tx
    .delete(creatorImportedDeck)
    .where(
      and(
        eq(creatorImportedDeck.userId, 'swubase'),
        inArray(creatorImportedDeck.deckId, transferredIds),
      ),
    )
    .returning();
  if (mappings.length)
    await tx
      .insert(creatorImportedDeck)
      .values(
        mappings.map(mapping => ({
          ...mapping,
          userId,
          pendingPublication: false,
        })),
      )
      .onConflictDoNothing();
  return decks.length;
}
