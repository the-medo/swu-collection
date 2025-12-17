import { db } from '../../db';
import { collection } from '../../db/schema/collection.ts';
import { collectionCard } from '../../db/schema/collection_card.ts';
import { entityPrice } from '../../db/schema/entity_price.ts';
import { cardVariantPrice, type CardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { CollectionCard } from '../../../types/CollectionCard.ts';

/**
 * Recompute prices for provided collection IDs.
 * Joins collection_card directly to card_variant_price using (cardId, variantId).
 * Ignores collection_card.price (user-defined) and uses market price mapping instead.
 */
export const recomputePricesForCollections = async (collectionIds: string[]): Promise<void> => {
  if (collectionIds.length === 0) return;

  const rows = await db
    .select({
      collectionId: collection.id,
      cc: {
        collectionId: collectionCard.collectionId,
        cardId: collectionCard.cardId,
        variantId: collectionCard.variantId,
        foil: collectionCard.foil,
        condition: collectionCard.condition,
        language: collectionCard.language,
        amount: collectionCard.amount,
      },
      cvp: {
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
    .from(collection)
    .innerJoin(collectionCard, eq(collection.id, collectionCard.collectionId))
    .leftJoin(
      cardVariantPrice,
      and(
        eq(cardVariantPrice.cardId, collectionCard.cardId),
        eq(cardVariantPrice.variantId, collectionCard.variantId),
      ),
    )
    .where(inArray(collection.id, collectionIds));

  type Item = {
    amount: number;
    cvp: Partial<CardVariantPrice> | null;
  };

  const countedCards = new Set<string>();
  const grouped: Record<string, Record<string, Item[]>> = {};
  const baseAmountByCollection: Record<string, Record<string, number>> = {};
  let totalQty = 0;

  for (const r of rows) {
    const cId = r.collectionId as string;
    const amount = (r.cc.amount ?? 0) as number;
    const cvp = (r.cvp ?? null) as Partial<CardVariantPrice> | null;
    const sourceType = cvp?.sourceType!;

    const cardKey = `${r.cc.cardId}|${r.cc.variantId}|${r.cc.foil}|${r.cc.condition}|${r.cc.language}`;
    if (!countedCards.has(cardKey)) {
      totalQty += amount;
      countedCards.add(cardKey);
    }

    if (!baseAmountByCollection[cId]) baseAmountByCollection[cId] = {};
    baseAmountByCollection[cId][sourceType] =
      (baseAmountByCollection[cId][sourceType] ?? 0) + amount;

    if (!sourceType) continue;
    if (!grouped[cId]) grouped[cId] = {};
    if (!grouped[cId][sourceType]) grouped[cId][sourceType] = [];
    grouped[cId][sourceType].push({ amount, cvp });
  }

  type UpsertRow = {
    entityId: string;
    sourceType: string;
    type: 'collection';
    updatedAt: Date;
    data: string;
    dataMissing: string;
    price: string;
    priceMissing: number;
  };

  const upserts: UpsertRow[] = [];
  const usedCollections = new Set<string>();

  for (const [cId, bySource] of Object.entries(grouped)) {
    usedCollections.add(cId);

    for (const [sourceType, items] of Object.entries(bySource)) {
      const baseQty = baseAmountByCollection[cId][sourceType] ?? 0;

      let total = 0;
      let pricedQty = 0;

      const keyTotals: Record<string, number> = {};
      const keyPricedQty: Record<string, number> = {};
      const candidateKeys = new Set<string>();

      for (const item of items) {
        const qty = item.amount ?? 0;

        const raw = item.cvp?.price;
        const priceNum = raw === null ? null : Number(raw);
        if (priceNum !== null && !Number.isNaN(priceNum)) {
          total += priceNum * qty;
          pricedQty += qty;
        }

        const dataRaw = item.cvp?.data ?? null;
        let dataObj: any = null;
        if (dataRaw && typeof dataRaw === 'object') {
          dataObj = dataRaw;
        } else if (typeof dataRaw === 'string') {
          try {
            const parsed = JSON.parse(dataRaw);
            if (parsed && typeof parsed === 'object') dataObj = parsed;
          } catch {
            // ignore
          }
        }
        if (dataObj && typeof dataObj === 'object') {
          for (const [k, v] of Object.entries(dataObj)) {
            if (v === null || v === undefined || v === '') {
              candidateKeys.add(k);
              continue;
            }
            const num = Number(v);
            if (!Number.isNaN(num)) {
              candidateKeys.add(k);
              keyTotals[k] = (keyTotals[k] ?? 0) + num * qty;
              keyPricedQty[k] = (keyPricedQty[k] ?? 0) + qty;
            }
          }
        }
      }

      const dataOut: Record<string, number> = {};
      for (const [k, sum] of Object.entries(keyTotals)) {
        dataOut[k] = Math.round(sum * 100) / 100;
      }

      const dataMissingOut: Record<string, number> = {};
      for (const k of candidateKeys) {
        const priced = keyPricedQty[k] ?? 0;
        const missingForKey = Math.max(0, totalQty - priced);
        dataMissingOut[k] = missingForKey;
      }

      const missing = Math.max(0, totalQty - pricedQty);
      const totalStr = (Math.round(total * 100) / 100).toFixed(2);

      upserts.push({
        entityId: cId,
        sourceType,
        type: 'collection',
        updatedAt: new Date(),
        data: JSON.stringify(dataOut),
        dataMissing: JSON.stringify(dataMissingOut),
        price: totalStr,
        priceMissing: missing,
      });
    }
  }

  // For collections that had no priced rows at all, write empty rows for default sources
  collectionIds.forEach(cId => {
    if (!usedCollections.has(cId)) {
      ['cardmarket', 'tcgplayer'].forEach(sourceType => {
        upserts.push({
          entityId: cId,
          sourceType,
          type: 'collection',
          updatedAt: new Date(),
          data: '{}',
          dataMissing: '{}',
          price: '0.00',
          priceMissing: 0,
        });
      });
    }
  });

  if (upserts.length > 0) {
    await db
      .insert(entityPrice)
      .values(upserts)
      .onConflictDoUpdate({
        target: [entityPrice.entityId, entityPrice.sourceType],
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

export default recomputePricesForCollections;
