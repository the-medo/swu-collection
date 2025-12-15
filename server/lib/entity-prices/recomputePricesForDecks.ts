import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckCard, type DeckCard } from '../../db/schema/deck_card.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { inArray, and, eq } from 'drizzle-orm';
import { cardStandardVariant } from '../../db/schema/card_standard_variant.ts';
import { cardVariantPrice, type CardVariantPrice } from '../../db/schema/card_variant_price.ts';

/**
 * Recompute data preparation for provided deck IDs: loads decks, their cards,
 * and latest entity_price (if any) for type='deck'.
 */
export const recomputePricesForDecks = async (deckIds: string[]): Promise<void> => {
  if (deckIds.length === 0) return;

  // 1) Fetch all needed data at once, using left joins for standard variant and prices
  const rows = await db
    .select({
      deckId: deck.id,
      deckCard: {
        deckId: deckCard.deckId,
        cardId: deckCard.cardId,
        board: deckCard.board,
        note: deckCard.note,
        quantity: deckCard.quantity,
      },
      standardVariant: {
        cardId: cardStandardVariant.cardId,
        variantId: cardStandardVariant.variantId,
      },
      cardVariantPrice: {
        cardId: cardVariantPrice.cardId,
        variantId: cardVariantPrice.variantId,
        sourceType: cardVariantPrice.sourceType,
        sourceLink: cardVariantPrice.sourceLink,
        sourceProductId: cardVariantPrice.sourceProductId,
        updatedAt: cardVariantPrice.updatedAt,
        data: cardVariantPrice.data,
        price: cardVariantPrice.price,
      },
    })
    .from(deck)
    .innerJoin(deckCard, eq(deck.id, deckCard.deckId))
    .leftJoin(cardStandardVariant, eq(deckCard.cardId, cardStandardVariant.cardId))
    .leftJoin(
      cardVariantPrice,
      and(
        eq(cardVariantPrice.cardId, cardStandardVariant.cardId),
        eq(cardVariantPrice.variantId, cardStandardVariant.variantId),
      ),
    )
    .where(inArray(deck.id, deckIds));

  // 2) Group by deck_id, then by source_type
  const grouped: Record<
    string,
    Record<string, { deckCard: DeckCard; cardVariantPrice: Partial<CardVariantPrice> | null }[]>
  > = {};
  // Also collect a base set of deck cards per deck (deduplicated by cardId+board)
  const baseCardsByDeck: Record<string, Record<string, DeckCard>> = {};

  for (const r of rows) {
    const dId = r.deckId as string;
    // build base card map for total deck quantities (independent of price sources)
    if (!baseCardsByDeck[dId]) baseCardsByDeck[dId] = {};
    const baseKey = `${r.deckCard.cardId}#${r.deckCard.board}`;
    if (!baseCardsByDeck[dId][baseKey]) {
      baseCardsByDeck[dId][baseKey] = r.deckCard as DeckCard;
    }
    const cvp = (r.cardVariantPrice ?? null) as Partial<CardVariantPrice> | null;
    const sourceType = cvp?.sourceType ?? null;
    if (!sourceType) {
      // no price for this row -> cannot attribute to a source; skip in per-source aggregation
      continue;
    }
    if (!grouped[dId]) grouped[dId] = {};
    if (!grouped[dId][sourceType]) grouped[dId][sourceType] = [];
    grouped[dId][sourceType].push({
      deckCard: r.deckCard as DeckCard,
      cardVariantPrice: cvp,
    });
  }

  // 3) For each deck and source type, compute final totals and missing price counts
  type UpsertRow = {
    entityId: string;
    sourceType: string;
    type: 'deck';
    updatedAt: Date;
    data: string;
    dataMissing: string;
    price: string;
    priceMissing: number;
  };

  const upserts: UpsertRow[] = [];

  for (const [dId, bySource] of Object.entries(grouped)) {
    // compute base quantity for this deck (sum of all deck card quantities)
    const baseQty = Object.values(baseCardsByDeck[dId] ?? {}).reduce(
      (acc, dc) => acc + (dc.quantity ?? 0),
      0,
    );
    for (const [sourceType, items] of Object.entries(bySource)) {
      let total = 0;
      let pricedQty = 0;
      for (const item of items) {
        const qty = item.deckCard.quantity ?? 0;
        const raw = (item.cardVariantPrice?.price ?? null) as unknown as string | number | null;
        const priceNum = raw === null ? null : Number(raw);
        if (priceNum !== null && !Number.isNaN(priceNum)) {
          total += priceNum * qty;
          pricedQty += qty;
        }
      }
      const missing = Math.max(0, baseQty - pricedQty);
      const totalStr = (Math.round(total * 100) / 100).toFixed(2);
      upserts.push({
        entityId: dId,
        sourceType,
        type: 'deck',
        updatedAt: new Date(),
        data: JSON.stringify({}),
        dataMissing: JSON.stringify({}),
        price: totalStr,
        priceMissing: missing,
      });
    }
  }

  // 4) Upsert into entity_price
  for (const row of upserts) {
    await db
      .insert(entityPrice)
      .values(row)
      .onConflictDoUpdate({
        target: [entityPrice.entityId, entityPrice.sourceType],
        set: {
          type: row.type,
          updatedAt: row.updatedAt,
          data: row.data,
          dataMissing: row.dataMissing,
          price: row.price,
          priceMissing: row.priceMissing,
        },
      });
  }
};

export default recomputePricesForDecks;
