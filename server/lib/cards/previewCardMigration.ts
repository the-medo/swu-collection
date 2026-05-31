import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { cardList } from '../../db/lists.ts';
import { cardPools, cardPoolCards } from '../../db/schema/card_pool.ts';
import { collectionCard } from '../../db/schema/collection_card.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { previewCard } from '../../db/schema/preview_card.ts';
import type { PreviewCard } from '../../db/schema/preview_card.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from './selectDefaultVariant.ts';
import { normalizePreviewCardPayload } from './previewCardPayload.ts';
import { updateDeckInformation } from '../decks/updateDeckInformation.ts';

export type PreviewCardMigrationSummary = {
  previewCardId: string;
  fromCardId: string;
  officialCardId: string;
  sameCardId: boolean;
  deckLeader1Updated: number;
  deckLeader2Updated: number;
  deckBaseUpdated: number;
  deckCardsMerged: number;
  cardPoolCardsUpdated: number;
  cardPoolLeadersUpdated: number;
  collectionCardsMerged: number;
  deckInformationUpdated: number;
  affectedDeckIds: string[];
};

export type PreviewCardReconciliationMatch = {
  previewCardId: string;
  previewName: string;
  officialCardId: string | null;
  reason: 'cardId' | 'set-cardNo' | 'no-match' | 'invalid-payload';
  message?: string;
};

export class PreviewCardMigrationError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PreviewCardMigrationError';
  }
}

function createMigrationSummary(
  previewCardId: string,
  fromCardId: string,
  officialCardId: string,
): PreviewCardMigrationSummary {
  return {
    previewCardId,
    fromCardId,
    officialCardId,
    sameCardId: fromCardId === officialCardId,
    deckLeader1Updated: 0,
    deckLeader2Updated: 0,
    deckBaseUpdated: 0,
    deckCardsMerged: 0,
    cardPoolCardsUpdated: 0,
    cardPoolLeadersUpdated: 0,
    collectionCardsMerged: 0,
    deckInformationUpdated: 0,
    affectedDeckIds: [],
  };
}

function addAffectedDeckId(affectedDeckIds: Set<string>, deckId: string | null | undefined) {
  if (deckId) affectedDeckIds.add(deckId);
}

export function replaceCardIdInCommaList(
  value: string | null | undefined,
  fromCardId: string,
  toCardId: string,
): string | null {
  if (!value) return value ?? null;

  const replacedIds = value
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(id => (id === fromCardId ? toCardId : id));

  const uniqueIds = replacedIds.filter((id, index) => replacedIds.indexOf(id) === index);
  return uniqueIds.join(',');
}

export function buildPreviewVariantIdMap(
  preview: CardDataWithVariants<CardListVariants>,
  official: CardDataWithVariants<CardListVariants>,
): Record<string, string> {
  const officialVariants = Object.values(official.variants).filter(variant => !!variant);
  const officialDefaultVariantId = selectDefaultVariant(official);
  const previewDefaultVariantId = selectDefaultVariant(preview);

  return Object.fromEntries(
    Object.entries(preview.variants).map(([previewVariantId, previewVariant]) => {
      const matchingOfficialVariant = officialVariants.find(
        officialVariant => officialVariant.variantName === previewVariant?.variantName,
      );

      if (matchingOfficialVariant) {
        return [previewVariantId, matchingOfficialVariant.variantId];
      }

      if (previewVariantId === previewDefaultVariantId && officialDefaultVariantId) {
        return [previewVariantId, officialDefaultVariantId];
      }

      return [previewVariantId, officialDefaultVariantId ?? previewVariantId];
    }),
  );
}

function mapVariantId(variantMap: Record<string, string>, variantId: string): string {
  return variantMap[variantId] ?? variantId;
}

function getOfficialCard(officialCardId: string) {
  const officialCard = cardList[officialCardId];
  if (!officialCard) {
    throw new PreviewCardMigrationError(
      400,
      `Official card ${officialCardId} was not found in the official card list`,
    );
  }

  return officialCard;
}

export async function migratePreviewCardToOfficial(
  previewCardRowId: string,
  officialCardIdInput: string,
): Promise<{ previewCard: PreviewCard; migration: PreviewCardMigrationSummary }> {
  const officialCardId = officialCardIdInput.trim();
  const officialCard = getOfficialCard(officialCardId);
  const affectedDeckIds = new Set<string>();

  const result = await db.transaction(async tx => {
    const [previewRow] = await tx
      .select()
      .from(previewCard)
      .where(eq(previewCard.id, previewCardRowId))
      .limit(1);

    if (!previewRow) {
      throw new PreviewCardMigrationError(404, 'Preview card not found');
    }

    let previewPayload: CardDataWithVariants<CardListVariants>;
    try {
      previewPayload = normalizePreviewCardPayload(previewRow.payload);
    } catch (error) {
      throw new PreviewCardMigrationError(
        400,
        `Preview payload is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const fromCardId = previewRow.cardId;
    const now = new Date();
    const nowIso = now.toISOString();
    const migration = createMigrationSummary(previewRow.id, fromCardId, officialCardId);
    const variantMap = buildPreviewVariantIdMap(previewPayload, officialCard);

    if (fromCardId !== officialCardId) {
      const leader1Decks = await tx
        .update(deck)
        .set({ leaderCardId1: officialCardId, updatedAt: now })
        .where(eq(deck.leaderCardId1, fromCardId))
        .returning({ id: deck.id });
      leader1Decks.forEach(row => addAffectedDeckId(affectedDeckIds, row.id));
      migration.deckLeader1Updated = leader1Decks.length;

      const leader2Decks = await tx
        .update(deck)
        .set({ leaderCardId2: officialCardId, updatedAt: now })
        .where(eq(deck.leaderCardId2, fromCardId))
        .returning({ id: deck.id });
      leader2Decks.forEach(row => addAffectedDeckId(affectedDeckIds, row.id));
      migration.deckLeader2Updated = leader2Decks.length;

      const baseDecks = await tx
        .update(deck)
        .set({ baseCardId: officialCardId, updatedAt: now })
        .where(eq(deck.baseCardId, fromCardId))
        .returning({ id: deck.id });
      baseDecks.forEach(row => addAffectedDeckId(affectedDeckIds, row.id));
      migration.deckBaseUpdated = baseDecks.length;

      const oldDeckCards = await tx.select().from(deckCard).where(eq(deckCard.cardId, fromCardId));
      for (const oldDeckCard of oldDeckCards) {
        await tx
          .insert(deckCard)
          .values({
            ...oldDeckCard,
            cardId: officialCardId,
          })
          .onConflictDoUpdate({
            target: [deckCard.deckId, deckCard.cardId, deckCard.board],
            set: {
              quantity: sql`${deckCard.quantity} + EXCLUDED.quantity`,
              note: sql`CASE WHEN ${deckCard.note} = '' THEN EXCLUDED.note ELSE ${deckCard.note} END`,
            },
          });

        await tx
          .delete(deckCard)
          .where(
            and(
              eq(deckCard.deckId, oldDeckCard.deckId),
              eq(deckCard.cardId, fromCardId),
              eq(deckCard.board, oldDeckCard.board),
            ),
          );

        addAffectedDeckId(affectedDeckIds, oldDeckCard.deckId);
        migration.deckCardsMerged++;
      }

      if (oldDeckCards.length > 0) {
        await tx
          .update(deck)
          .set({ updatedAt: now })
          .where(
            inArray(
              deck.id,
              oldDeckCards.map(row => row.deckId),
            ),
          );
      }

      const updatedCardPoolCards = await tx
        .update(cardPoolCards)
        .set({ cardId: officialCardId })
        .where(eq(cardPoolCards.cardId, fromCardId))
        .returning({ cardPoolId: cardPoolCards.cardPoolId });
      migration.cardPoolCardsUpdated = updatedCardPoolCards.length;

      const poolsWithLeaders = await tx
        .select({ id: cardPools.id, leaders: cardPools.leaders })
        .from(cardPools)
        .where(sql`${cardPools.leaders} like ${`%${fromCardId}%`}`);

      for (const pool of poolsWithLeaders) {
        const leaders = replaceCardIdInCommaList(pool.leaders, fromCardId, officialCardId);
        if (leaders === pool.leaders) continue;

        await tx
          .update(cardPools)
          .set({ leaders, updatedAt: nowIso })
          .where(eq(cardPools.id, pool.id));
        migration.cardPoolLeadersUpdated++;
      }
    }

    const oldCollectionCards = await tx
      .select()
      .from(collectionCard)
      .where(eq(collectionCard.cardId, fromCardId));

    for (const oldCollectionCard of oldCollectionCards) {
      const officialVariantId = mapVariantId(variantMap, oldCollectionCard.variantId);
      const destinationMatchesSource =
        oldCollectionCard.cardId === officialCardId &&
        oldCollectionCard.variantId === officialVariantId;

      if (destinationMatchesSource) continue;

      await tx
        .insert(collectionCard)
        .values({
          ...oldCollectionCard,
          cardId: officialCardId,
          variantId: officialVariantId,
        })
        .onConflictDoUpdate({
          target: [
            collectionCard.collectionId,
            collectionCard.cardId,
            collectionCard.variantId,
            collectionCard.foil,
            collectionCard.condition,
            collectionCard.language,
          ],
          set: {
            amount: sql`${collectionCard.amount} + EXCLUDED.amount`,
            amount2: sql`CASE WHEN ${collectionCard.amount2} IS NULL AND EXCLUDED.amount2 IS NULL THEN NULL ELSE COALESCE(${collectionCard.amount2}, 0) + COALESCE(EXCLUDED.amount2, 0) END`,
            note: sql`CASE WHEN ${collectionCard.note} IS NULL OR ${collectionCard.note} = '' THEN EXCLUDED.note ELSE ${collectionCard.note} END`,
            price: sql`COALESCE(${collectionCard.price}, EXCLUDED.price)`,
          },
        });

      await tx
        .delete(collectionCard)
        .where(
          and(
            eq(collectionCard.collectionId, oldCollectionCard.collectionId),
            eq(collectionCard.cardId, fromCardId),
            eq(collectionCard.variantId, oldCollectionCard.variantId),
            eq(collectionCard.foil, oldCollectionCard.foil),
            eq(collectionCard.condition, oldCollectionCard.condition),
            oldCollectionCard.language === null
              ? isNull(collectionCard.language)
              : eq(collectionCard.language, oldCollectionCard.language),
          ),
        );

      migration.collectionCardsMerged++;
    }

    const [updatedPreviewCard] = await tx
      .update(previewCard)
      .set({
        status: 'migrated',
        officialCardId,
        updatedAt: nowIso,
      })
      .where(eq(previewCard.id, previewRow.id))
      .returning();

    if (!updatedPreviewCard) {
      throw new PreviewCardMigrationError(404, 'Preview card not found');
    }

    migration.affectedDeckIds = Array.from(affectedDeckIds).sort();

    return {
      previewCard: updatedPreviewCard,
      migration,
    };
  });

  for (const deckId of result.migration.affectedDeckIds) {
    try {
      await updateDeckInformation(deckId);
      result.migration.deckInformationUpdated++;
    } catch (error) {
      console.error(
        `Failed to refresh deck information after preview card migration: ${deckId}`,
        error,
      );
    }
  }

  return result;
}

export function findOfficialMatchForPreviewCard(
  preview: PreviewCard,
  officialCards: CardList = cardList,
): PreviewCardReconciliationMatch {
  try {
    const payload = normalizePreviewCardPayload(preview.payload);

    if (officialCards[preview.cardId]) {
      return {
        previewCardId: preview.id,
        previewName: payload.name,
        officialCardId: preview.cardId,
        reason: 'cardId',
      };
    }

    const defaultPreviewVariantId = selectDefaultVariant(payload);
    const defaultPreviewVariant = defaultPreviewVariantId
      ? payload.variants[defaultPreviewVariantId]
      : undefined;

    if (defaultPreviewVariant?.set && defaultPreviewVariant.cardNo > 0) {
      for (const [officialCardId, officialCard] of Object.entries(officialCards)) {
        const matchingVariant = Object.values(officialCard?.variants ?? {}).find(
          variant =>
            variant?.set === defaultPreviewVariant.set &&
            variant.cardNo === defaultPreviewVariant.cardNo,
        );

        if (officialCard && matchingVariant) {
          return {
            previewCardId: preview.id,
            previewName: payload.name,
            officialCardId,
            reason: 'set-cardNo',
          };
        }
      }
    }

    return {
      previewCardId: preview.id,
      previewName: payload.name,
      officialCardId: null,
      reason: 'no-match',
    };
  } catch (error) {
    return {
      previewCardId: preview.id,
      previewName: preview.cardId,
      officialCardId: null,
      reason: 'invalid-payload',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function reconcilePreviewCards(
  options: {
    apply?: boolean;
    logger?: Pick<Console, 'log' | 'error'>;
  } = {},
) {
  const logger = options.logger ?? console;
  const activePreviewCards = await db
    .select()
    .from(previewCard)
    .where(eq(previewCard.status, 'active'));
  const matches: PreviewCardReconciliationMatch[] = [];

  for (const row of activePreviewCards) {
    const match = findOfficialMatchForPreviewCard(row);
    matches.push(match);

    if (!match.officialCardId) {
      logger.log(
        `[skip] ${row.cardId}: ${match.reason}${match.message ? ` (${match.message})` : ''}`,
      );
      continue;
    }

    logger.log(`[match:${match.reason}] ${row.cardId} -> ${match.officialCardId}`);

    if (options.apply) {
      await migratePreviewCardToOfficial(row.id, match.officialCardId);
      logger.log(`[migrated] ${row.cardId}`);
    }
  }

  return matches;
}

if (import.meta.main) {
  const apply = process.argv.includes('--apply');
  await reconcilePreviewCards({ apply });
}
