import type { CardDataWithVariants, CardListVariants, CardVariant } from '../types.ts';

const printingKey = (variant: CardVariant) =>
  JSON.stringify([variant.set, variant.fullSetName, variant.cardNo, variant.variantName]);

export function mergeCardData(
  incoming: CardDataWithVariants,
  previous?: CardDataWithVariants<CardListVariants>,
  options: { updateRarity?: boolean } = {},
): CardDataWithVariants<CardListVariants> {
  const oldVariants = Object.values(previous?.variants ?? {}).filter(
    (variant): variant is CardVariant => !!variant,
  );
  const variants: CardListVariants = {};

  for (const variant of incoming.variants) {
    let existing = previous?.variants[variant.variantId];
    if (!existing) {
      let matches = oldVariants.filter(old => old.swuId === variant.swuId);
      if (!matches.length) {
        matches = oldVariants.filter(old => printingKey(old) === printingKey(variant));
      }
      if (matches.length > 1) {
        throw new Error(`Ambiguous existing printing for ${incoming.cardId}: ${variant.variantId}`);
      }
      existing = matches[0];
    }
    const variantId = existing?.variantId ?? variant.variantId;
    if (variants[variantId]) {
      throw new Error(`Duplicate incoming printing for ${incoming.cardId}: ${variantId}`);
    }
    // Image paths describe the newly staged assets; persisted variant IDs stay stable.
    variants[variantId] = { ...variant, variantId };
  }

  for (const old of oldVariants) {
    variants[old.variantId] ??= old;
  }

  for (const identity of [(v: CardVariant) => String(v.swuId), printingKey]) {
    const seen = new Map<string, CardVariant>();
    for (const variant of Object.values(variants) as CardVariant[]) {
      const key = identity(variant);
      const other = seen.get(key);
      if (other) {
        const oldVariant = previous?.variants[variant.variantId];
        const oldOther = previous?.variants[other.variantId];
        // Leave existing legacy duplicates alone, but never introduce new ones.
        if (!oldVariant || !oldOther || identity(oldVariant) !== identity(oldOther)) {
          throw new Error(`Duplicate printing for ${incoming.cardId}: ${key}`);
        }
      }
      seen.set(key, variant);
    }
  }

  return {
    ...incoming,
    cardUid: [...new Set([...incoming.cardUid, ...(previous?.cardUid ?? [])])],
    set: incoming.set ?? previous?.set,
    // Rarity is shared with older sets' sealed pools until it exists per printing.
    rarity: options.updateRarity ? incoming.rarity : (previous?.rarity ?? incoming.rarity),
    rules: incoming.rules?.trim() ? incoming.rules : (previous?.rules ?? incoming.rules),
    variants,
  };
}
