import { and, eq, exists, or, sql } from 'drizzle-orm';
import {
  creatorClaimedDeck,
  creatorImportedDeck,
  creatorVideoJob,
} from '../../../db/schema/creator_video_job.ts';
import { creatorProfile } from '../../../db/schema/creator_hub.ts';
import { deck } from '../../../db/schema/deck.ts';
import { deckImportSource } from '../../../db/schema/deck_import_source.ts';
import {
  getDeckBuilderForSource,
  parseImportedDeck,
  type ExternalDeck,
} from '../../decks/deckBuilders.ts';
import { insertImportedDeck } from '../../decks/importDeck.ts';
import { updateDeckInformation } from '../../decks/updateDeckInformation.ts';
import type { CardList } from '../../../../lib/swu-resources/types.ts';
import type { DeckBuilderSource } from '../../../../types/DeckImport.ts';
import { WorkerError, type Analysis } from './contracts.ts';
import { eligibleChannels, type Database, type Job } from './store.ts';

export function importedDeckFormat(analysis: Analysis, secondLeader?: string) {
  if (secondLeader) return 2;
  const formats = analysis.tags.filter(t => t.id.startsWith('format:')).map(t => t.id);
  if (formats.length === 1)
    return (
      (
        {
          'format:premier': 1,
          'format:eternal': 6,
          'format:sealed': 3,
          'format:draft': 4,
        } as Record<string, number>
      )[formats[0]] ?? null
    );
  return null;
}

/** Atomic source mapping and deck insertion; repeats never overwrite a user's deck. */
export async function importVideoDeck(args: {
  database: Database;
  job: Job;
  ownerId: string | null;
  source: DeckBuilderSource;
  sourceDeckId: string;
  sourceDeck: ExternalDeck;
  cards: CardList;
  analysis: Analysis;
}) {
  const { database, job, ownerId, source, sourceDeckId, sourceDeck, cards, analysis } = args;
  const userId = ownerId ?? 'swubase';
  const builder = getDeckBuilderForSource(source)!;
  const parsedDeck = parseImportedDeck(sourceDeck, cards);
  if (
    parsedDeck.errors.length ||
    !parsedDeck.cards.length ||
    !parsedDeck.leaderCardId1 ||
    !parsedDeck.baseCardId ||
    cards[parsedDeck.leaderCardId1]?.type !== 'Leader' ||
    cards[parsedDeck.baseCardId]?.type !== 'Base' ||
    (parsedDeck.leaderCardId2 && cards[parsedDeck.leaderCardId2]?.type !== 'Leader')
  )
    throw new WorkerError('deck_incomplete_or_unknown_cards', false);
  const format = importedDeckFormat(analysis, parsedDeck.leaderCardId2);
  const result = await database.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(creatorProfile)
      .where(eq(creatorProfile.id, job.creatorId))
      .for('update');
    if (
      !profile ||
      profile.ownerId !== ownerId ||
      (await eligibleChannels(tx)).channels.get(job.channelId) !== job.creatorId
    )
      throw new WorkerError('channel_no_longer_eligible', false);
    const [claim] = await tx
      .select({ videoId: creatorVideoJob.videoId })
      .from(creatorVideoJob)
      .where(
        and(
          eq(creatorVideoJob.videoId, job.videoId),
          eq(creatorVideoJob.claimId, job.claimId!),
          eq(creatorVideoJob.status, 'processing'),
        ),
      )
      .for('update');
    if (!claim) throw new WorkerError('job_claim_lost', false);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`creator-import:${userId}:${source}:${sourceDeckId}`}, 0))`,
    );
    const key = and(
      eq(creatorImportedDeck.userId, userId),
      eq(creatorImportedDeck.source, source),
      eq(creatorImportedDeck.sourceDeckId, sourceDeckId),
    );
    const [mapping] = await tx.select().from(creatorImportedDeck).where(key);
    if (mapping) {
      const [existing] = mapping.deckId
        ? await tx
            .select()
            .from(deck)
            .where(
              and(
                eq(deck.id, mapping.deckId),
                eq(deck.userId, userId),
                or(
                  eq(deck.public, 1),
                  mapping.pendingPublication
                    ? and(eq(deck.public, 2), sql`${deck.updatedAt} = ${deck.createdAt}`)
                    : and(
                        eq(deck.public, 2),
                        exists(
                          tx
                            .select({ id: creatorClaimedDeck.deckId })
                            .from(creatorClaimedDeck)
                            .where(eq(creatorClaimedDeck.deckId, deck.id)),
                        ),
                      ),
                ),
              ),
            )
            .for('share')
        : [];
      if (!existing) throw new WorkerError('deck_removed_or_not_public', false);
      return existing;
    }
    const [existing] = await tx
      .select({ deck })
      .from(deckImportSource)
      .innerJoin(deck, eq(deck.id, deckImportSource.deckId))
      .where(
        and(
          eq(deckImportSource.source, source),
          eq(deckImportSource.sourceDeckId, sourceDeckId),
          eq(deck.userId, userId),
          eq(deck.public, 1),
        ),
      )
      .limit(1)
      .for('share', { of: deck });
    const imported =
      existing?.deck ??
      (await insertImportedDeck(tx, {
        userId,
        builder,
        deckId: sourceDeckId,
        parsedDeck,
        format: format ?? 1,
        visibility: 2,
      }));
    await tx
      .insert(creatorImportedDeck)
      .values({ userId, source, sourceDeckId, deckId: imported.id, pendingPublication: !existing });
    return imported;
  });
  // Re-run even for a reused mapping: a crash after insertion may have left this row absent.
  await updateDeckInformation(result.id);
  return { deck: result, assumedFormat: format === null };
}
