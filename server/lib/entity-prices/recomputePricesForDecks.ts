import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { deckCard, type DeckCard } from '../../db/schema/deck_card.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { inArray, and, eq, sql } from 'drizzle-orm';
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
    if (r.deckCard.board === 3) continue;

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
  const usedDecks: Set<string> = new Set();

  for (const [dId, bySource] of Object.entries(grouped)) {
    usedDecks.add(dId);

    // compute base quantity for this deck (sum of all deck card quantities)
    const baseQty = Object.values(baseCardsByDeck[dId] ?? {}).reduce(
      (acc, dc) => acc + (dc.quantity ?? 0),
      0,
    );
    for (const [sourceType, items] of Object.entries(bySource)) {
      // Overall price (using main price field)
      let total = 0;
      let pricedQty = 0;

      // Aggregation for per-key data totals and missing counts
      const keyTotals: Record<string, number> = {};
      const keyPricedQty: Record<string, number> = {};
      const candidateKeys = new Set<string>();

      for (const item of items) {
        const qty = item.deckCard.quantity ?? 0;

        // 1) Main price aggregation
        const raw = (item.cardVariantPrice?.price ?? null) as unknown as string | number | null;
        const priceNum = raw === null ? null : Number(raw);
        if (priceNum !== null && !Number.isNaN(priceNum)) {
          total += priceNum * qty;
          pricedQty += qty;
        }

        // 2) Per-key data aggregation
        const dataRaw = item.cardVariantPrice?.data ?? null;
        let dataObj: any = null;
        if (dataRaw && typeof dataRaw === 'object') {
          dataObj = dataRaw;
        } else if (typeof dataRaw === 'string') {
          try {
            const parsed = JSON.parse(dataRaw);
            if (parsed && typeof parsed === 'object') dataObj = parsed;
          } catch {
            // ignore malformed JSON
          }
        }

        if (dataObj && typeof dataObj === 'object') {
          for (const [k, v] of Object.entries<any>(dataObj)) {
            if (v === null || v === undefined || v === '') {
              // Treat null/undefined/empty as missing value for a numeric-like key
              candidateKeys.add(k);
              continue;
            }
            const num = Number(v as any);
            if (!Number.isNaN(num)) {
              candidateKeys.add(k);
              keyTotals[k] = (keyTotals[k] ?? 0) + num * qty;
              keyPricedQty[k] = (keyPricedQty[k] ?? 0) + qty;
            }
            // Non-numeric (e.g., strings like 'subTypeName') are ignored completely
          }
        }
      }

      // Build output objects
      const dataOut: Record<string, number> = {};
      for (const [k, sum] of Object.entries(keyTotals)) {
        // round to 2 decimals
        dataOut[k] = Math.round(sum * 100) / 100;
      }

      const dataMissingOut: Record<string, number> = {};
      for (const k of candidateKeys) {
        const priced = keyPricedQty[k] ?? 0;
        const missingForKey = Math.max(0, baseQty - priced);
        dataMissingOut[k] = missingForKey;
      }

      const missing = Math.max(0, baseQty - pricedQty);
      const totalStr = (Math.round(total * 100) / 100).toFixed(2);
      upserts.push({
        entityId: dId,
        sourceType,
        type: 'deck',
        updatedAt: new Date(),
        data: JSON.stringify(dataOut),
        dataMissing: JSON.stringify(dataMissingOut),
        price: totalStr,
        priceMissing: missing,
      });
    }
  }

  deckIds.forEach(dId => {
    if (!usedDecks.has(dId)) {
      ['cardmarket', 'tcgplayer'].forEach(sourceType => {
        upserts.push({
          entityId: dId,
          sourceType,
          type: 'deck',
          updatedAt: new Date(),
          data: '{}',
          dataMissing: '{}',
          price: '0.00',
          priceMissing: 0,
        });
      });
    }
  });

  // 4) Upsert into entity_price (single multi-row statement)
  if (upserts.length > 0) {
    await db
      .insert(entityPrice)
      .values(upserts)
      .onConflictDoUpdate({
        target: [entityPrice.entityId, entityPrice.sourceType],
        // Use PostgreSQL "excluded" values to update from the incoming row per conflict
        set: {
          type: sql`excluded.type`,
          updatedAt: sql`excluded.updated_at`,
          data: sql`excluded.data`,
          dataMissing: sql`excluded.data_missing`,
          price: sql`excluded.price`,
          priceMissing: sql`excluded.price_missing`,
        },
      });
  }
};

export default recomputePricesForDecks;
