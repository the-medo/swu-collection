import type { CardDataWithVariants, CardVariant, ParsedCardData } from '../types.ts';

export function mergeParsedCardAndVariants(
  variants: CardVariant[],
  c: ParsedCardData,
): CardDataWithVariants {
  return {
    cardId: c.cardId,
    updatedAt: c.updatedAt,
    name: c.name,
    title: c.title,
    subtitle: c.subtitle,
    variants: variants,

    type: c.type,
    rarity: c.rarity,
    cost: c.cost,
    hp: c.hp,
    power: c.power,
    upgradeHp: c.upgradeHp,
    upgradePower: c.upgradePower,

    deployBox: c.deployBox,
    epicAction: c.epicAction,
    rules: c.rules,
    text: c.text,

    front: {
      horizontal: c.front.horizontal,
    },
    back: c.back
      ? {
          horizontal: c.back.horizontal,
          type: c.back.type,
        }
      : null,

    arenas: c.arenas,
    aspects: c.aspects,
    keywords: c.keywords,
    traits: c.traits,
  };
}
