import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { cardList } from '../../db/lists.ts';
import { selectDefaultVariant } from './selectDefaultVariant.ts';
import { cardStandardVariant } from '../../db/schema/card_standard_variant.ts';

export async function updateCardStandardVariants() {
  const standardVariants = Object.entries(cardList).map(([cardId, card]) => {
    const sv = card ? selectDefaultVariant(card) : '';

    return { cardId, variantId: sv ?? '' };
  });

  // Insert or update variantId when cardId already exists
  await db
    .insert(cardStandardVariant)
    .values(standardVariants)
    .onConflictDoUpdate({
      target: cardStandardVariant.cardId,
      set: { variantId: sql`excluded.variant_id` },
    });
}
