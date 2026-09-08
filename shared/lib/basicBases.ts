import { SwuAspect, SwuSet } from '../../types/enums.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';

export const basicBases: Record<string, true | undefined> = {
  'shield-generator-complex': true, // vigilance
  'theed-palace': true, // command
  'massassi-temple': true, // aggression
  'mos-eisley': true, // cunning
};

export const basicBaseForAspect: Record<SwuAspect | string, string> = {
  [SwuAspect.VIGILANCE]: 'shield-generator-complex',
  [SwuAspect.COMMAND]: 'theed-palace',
  [SwuAspect.AGGRESSION]: 'massassi-temple',
  [SwuAspect.CUNNING]: 'mos-eisley',
  [SwuAspect.HEROISM]: '',
  [SwuAspect.VILLAINY]: '',
  ['Vigilance-Force']: 'nightsister-lair',
  ['Command-Force']: 'jedi-temple',
  ['Aggression-Force']: 'fortress-vader',
  ['Cunning-Force']: 'crystal-caves',
  ['Vigilance-AspectIgnore']: 'daimyo-s-palace',
  ['Command-AspectIgnore']: 'aldhani-garrison',
  ['Aggression-AspectIgnore']: 'stygeon-spire',
  ['Cunning-AspectIgnore']: 'canto-bight',
};

export const basicForceBaseForAspect: Record<string, string> = {
  ['Vigilance-Force']: 'nightsister-lair',
  ['Command-Force']: 'jedi-temple',
  ['Aggression-Force']: 'fortress-vader',
  ['Cunning-Force']: 'crystal-caves',
};

export const basicAspectIgnoreBaseForAspect: Record<string, string> = {
  ['Vigilance-AspectIgnore']: 'daimyo-s-palace',
  ['Command-AspectIgnore']: 'aldhani-garrison',
  ['Aggression-AspectIgnore']: 'stygeon-spire',
  ['Cunning-AspectIgnore']: 'canto-bight',
};

export const homeworldBaseTraits = ['Tatooine', 'Naboo', 'Kashyyyk', 'Endor'] as const;

export type HomeworldBaseTrait = (typeof homeworldBaseTraits)[number];

export const homeworldBasicBasesByTrait = {
  Tatooine: {
    [SwuAspect.VIGILANCE]: 'dune-sea',
    [SwuAspect.COMMAND]: 'tusken-camp',
    [SwuAspect.AGGRESSION]: 'jundland-wastes',
    [SwuAspect.CUNNING]: 'mos-eisley',
  },
  Naboo: {
    [SwuAspect.VIGILANCE]: 'great-grass-plains',
    [SwuAspect.COMMAND]: 'theed-palace',
    [SwuAspect.AGGRESSION]: 'bioweapons-lab',
    [SwuAspect.CUNNING]: 'otoh-gunga',
  },
  Kashyyyk: {
    [SwuAspect.VIGILANCE]: 'kachirho',
    [SwuAspect.COMMAND]: 'origin-tree',
    [SwuAspect.AGGRESSION]: 'shadowlands',
    [SwuAspect.CUNNING]: 'kyyyalstaad-swamp',
  },
  Endor: {
    [SwuAspect.VIGILANCE]: 'shield-generator-complex',
    [SwuAspect.COMMAND]: 'bright-tree-village',
    [SwuAspect.AGGRESSION]: 'dendroid-wilds',
    [SwuAspect.CUNNING]: 'research-station-9',
  },
} as const satisfies Record<
  HomeworldBaseTrait,
  Record<SwuAspect.VIGILANCE | SwuAspect.COMMAND | SwuAspect.AGGRESSION | SwuAspect.CUNNING, string>
>;

export const getHomeworldBasicBaseIdsForTrait = (trait: HomeworldBaseTrait): string[] =>
  Object.values(homeworldBasicBasesByTrait[trait]);

export const homeworldBasicBaseIds = homeworldBaseTraits.flatMap(getHomeworldBasicBaseIdsForTrait);

// Older official base records omit their printed planet traits, so keep the
// known compatible non-HMW bases alongside the Homeworlds basics.
const additionalHomeworldBaseIdsByTrait = {
  Tatooine: ['daimyo-s-palace', 'great-pit-of-carkoon'],
  Naboo: ['lake-country'],
  Kashyyyk: [],
  Endor: [],
} as const satisfies Record<HomeworldBaseTrait, readonly string[]>;

export const homeworldBaseTraitByCardId = homeworldBaseTraits.reduce(
  (traitsByCardId, trait) => {
    [
      ...getHomeworldBasicBaseIdsForTrait(trait),
      ...additionalHomeworldBaseIdsByTrait[trait],
    ].forEach(cardId => {
      traitsByCardId[cardId] = trait;
    });
    return traitsByCardId;
  },
  {} as Record<string, HomeworldBaseTrait | undefined>,
);

export const getHomeworldBaseTrait = (cardId: string | undefined) =>
  cardId ? homeworldBaseTraitByCardId[cardId] : undefined;

export const baseSpecialNames: Record<string, string> = {
  // basic Vigilance bases
  'capital-city': 'Vigilance',
  'city-in-the-clouds': 'Vigilance',
  'dagobah-swamp': 'Vigilance',
  'remnant-science-facility': 'Vigilance',
  'remote-village': 'Vigilance',
  'shield-generator-complex': 'Vigilance',
  sundari: 'Vigilance',
  'the-crystal-city': 'Vigilance',
  'rix-road': 'Vigilance',
  'uscru-entertainment-district': 'Vigilance',
  'fortress-of-the-great-mothers': 'Vigilance',
  'nevarro-city--restored': 'Vigilance',
  'dune-sea': 'Vigilance',
  'great-grass-plains': 'Vigilance',
  kachirho: 'Vigilance',
  //force Vigilance bases
  'nightsister-lair': 'Vigilance-Force',
  'shadowed-undercity': 'Vigilance-Force',
  // aspect ignore base
  'daimyo-s-palace': 'Vigilance-AspectIgnore',
  'coaxium-mine': 'Vigilance-AspectIgnore',

  // basic Command bases
  'command-center': 'Command',
  'echo-base': 'Command',
  'lair-of-grievous': 'Command',
  'maz-kanata-s-castle': 'Command',
  'nevarro-city': 'Command',
  'resistance-headquarters': 'Command',
  'theed-palace': 'Command',
  'tipoca-city': 'Command',
  'republic-city': 'Command',
  'senate-rotunda': 'Command',
  'emperor-s-throne-room': 'Command',
  'kryze-castle': 'Command',
  'bright-tree-village': 'Command',
  'origin-tree': 'Command',
  'tusken-camp': 'Command',
  //force Command bases
  'jedi-temple': 'Command-Force',
  'starlight-temple': 'Command-Force',
  // aspect ignore base
  'aldhani-garrison': 'Command-AspectIgnore',
  'imperial-command-complex': 'Command-AspectIgnore',

  // basic Aggresion bases
  'catacombs-of-cadera': 'Aggression',
  'death-watch-hideout': 'Aggression',
  'kcm-mining-facility': 'Aggression',
  'kestro-city': 'Aggression',
  'massassi-temple': 'Aggression',
  'nadiri-dockyards': 'Aggression',
  'spice-mines': 'Aggression',
  'the-nest': 'Aggression',
  'imperial-prison-complex': 'Aggression',
  'naval-intelligence-hq': 'Aggression',
  'ancient-henge': 'Aggression',
  'dragonsnake-bog': 'Aggression',
  'bioweapons-lab': 'Aggression',
  'dendroid-wilds': 'Aggression',
  'jundland-wastes': 'Aggression',
  shadowlands: 'Aggression',
  // force Aggresion bases
  'fortress-vader': 'Aggression-Force',
  'strangled-cliffs': 'Aggression-Force',
  // aspect ignore base
  'stygeon-spire': 'Aggression-AspectIgnore',
  'contested-caverns': 'Aggression-AspectIgnore',

  // basic Cunning bases
  'administrator-s-tower': 'Cunning',
  'chopper-base': 'Cunning',
  'coronet-city': 'Cunning',
  'jabba-s-palace': 'Cunning',
  'level-1313': 'Cunning',
  'mos-eisley': 'Cunning',
  'pyke-palace': 'Cunning',
  'amnesty-housing': 'Cunning',
  'mount-tantiss': 'Cunning',
  'emperor-s-observatory': 'Cunning',
  freetown: 'Cunning',
  'kyyyalstaad-swamp': 'Cunning',
  'otoh-gunga': 'Cunning',
  'research-station-9': 'Cunning',
  // force Cunning bases
  'crystal-caves': 'Cunning-Force',
  'the-holy-city': 'Cunning-Force',
  // aspect ignore base
  'canto-bight': 'Cunning-AspectIgnore',
  'partisan-hideout': 'Cunning-AspectIgnore',
};

export const baseSpecialNameValues = new Set(Object.values(baseSpecialNames));

export const allBasesBySpecialName = Object.entries(baseSpecialNames).reduce(
  (p, [cardId, specialName]) => {
    if (!p[specialName]) p[specialName] = [];
    return Object.assign(p, { [specialName]: [...p[specialName], cardId] });
  },
  {} as Record<string, string[]>,
);

export const getBasesBySpecialName = (specialName: string) => allBasesBySpecialName[specialName];

export const getSpecialBaseName = (baseCardId: string | undefined) =>
  baseCardId
    ? baseSpecialNameValues.has(baseCardId)
      ? baseCardId
      : baseSpecialNames[baseCardId]
    : undefined;

export const getBaseKey = (baseCardId: string | undefined | null): string => {
  return getSpecialBaseName(baseCardId ?? undefined) ?? baseCardId ?? '';
};

export const getBasicBaseIdsForSet = (set: SwuSet, cardList: CardList, single: boolean = false) => {
  const byAspect: Partial<Record<SwuAspect, true>> = {};

  const basicBaseIds: string[] = [];
  const candidateBaseIds =
    set === SwuSet.HMW ? homeworldBasicBaseIds : Object.keys(baseSpecialNames);

  candidateBaseIds.forEach(baseCardId => {
    const card = cardList[baseCardId];
    if (!card || (set !== SwuSet.HMW && card.set !== set)) return;
    const aspect = card?.aspects[0];
    if (!aspect || (set !== SwuSet.HMW && single && byAspect[aspect])) return;
    byAspect[aspect] = true;
    basicBaseIds.push(baseCardId);
  });
  return basicBaseIds;
};

export const specialBaseSortValues: Record<string, number | undefined> = {
  'lake-country': -1,
  'echo-caverns': -2,
  'forward-command-post': -2,
};

export const sortBasesBySpecialSortValues = (
  a: string | undefined = '',
  b: string | undefined = '',
): number => (specialBaseSortValues[b] ?? 0) - (specialBaseSortValues[a] ?? 0);
