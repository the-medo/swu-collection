import { SwuSet } from '../../../types/enums.ts';

// Logical-card simulation, not a reconstruction of printing sheets. Cosmetic
// treatments are not persisted, but their independent slots can repeat a card.
// Article text: guaranteed HS common from LAW, ~1/3 before LAW, Prestige ~1/18.
// https://starwarsunlimited.com/articles/a-shift-from-what-was
// Its comparison chart, rows "Rare Variants" and "Legendary Variants", gives
// the HS R/L rates for both eras and the modern HS foil R/L rates:
// https://cdn.starwarsunlimited.com//SWH_07_Article_Booster_Changes_Diagram_EN_NEW_c8f6d83d49.png
// FFG's clarification to TCGplayer confirms that non-foil HS R/L cards already
// replaced uncommons before LAW (the article's opening update):
// https://www.tcgplayer.com/content/article/What-s-Inside-a-Booster-Pack-of-Star-Wars-Unlimited/22458bf5-c19a-48b4-94a5-bfde461e2a90/
// Leader odds, the legacy aggregate foil mix, and modern foil C/U/S
// proportions retain simulator estimates, not published physical collation.
// Prestige cards are sampled uniformly within the eligible set printings.
const legacyRules = {
  hyperspaceCommonChance: 1 / 3,
  hyperspaceRareChance: 1 / 21,
  hyperspaceLegendaryChance: 1 / 53,
  prestigeChance: 0,
  foilRareChance: 0.06,
  foilLegendaryChance: 0.02,
  hyperspaceFoilOnly: false,
};

const modernRules = {
  hyperspaceCommonChance: 1,
  hyperspaceRareChance: 1 / 12,
  hyperspaceLegendaryChance: 1 / 48,
  prestigeChance: 1 / 18,
  foilRareChance: 1 / 24,
  foilLegendaryChance: 1 / 96,
  hyperspaceFoilOnly: true,
};

const boosterPackRules: Partial<Record<SwuSet, typeof legacyRules>> = {
  [SwuSet.LOF]: legacyRules,
  [SwuSet.SEC]: legacyRules,
  [SwuSet.LAW]: modernRules,
  [SwuSet.ASH]: modernRules,
  [SwuSet.HMW]: modernRules,
};

export const getBoosterPackRules = (set: SwuSet) => {
  const rules = boosterPackRules[set];
  if (!rules) throw new Error(`No booster pack rules found for set ${set}`);
  return rules;
};
