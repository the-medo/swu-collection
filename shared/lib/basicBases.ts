import { SwuAspect, SwuSet } from '../../types/enums.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';

export const basicBases: Record<string, true | undefined> = {
  'capital-city': true, // vigilance
  'command-center': true, // command
  'catacombs-of-cadera': true, // aggression
  'administrator-s-tower': true, // cunning
};

export const basicBaseForAspect: Record<SwuAspect | string, string> = {
  [SwuAspect.VIGILANCE]: 'capital-city',
  [SwuAspect.COMMAND]: 'command-center',
  [SwuAspect.AGGRESSION]: 'catacombs-of-cadera',
  [SwuAspect.CUNNING]: 'administrator-s-tower',
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
  //force Vigilance bases
  'nightsister-lair': 'Vigilance-Force',
  'shadowed-undercity': 'Vigilance-Force',
  // aspect ignore base
  'daimyo-s-palace': 'Vigilance-AspectIgnore',

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
  //force Command bases
  'jedi-temple': 'Command-Force',
  'starlight-temple': 'Command-Force',
  // aspect ignore base
  'aldhani-garrison': 'Command-AspectIgnore',

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
  // force Aggresion bases
  'fortress-vader': 'Aggression-Force',
  'strangled-cliffs': 'Aggression-Force',
  // aspect ignore base
  'stygeon-spire': 'Aggression-AspectIgnore',

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
  // force Cunning bases
  'crystal-caves': 'Cunning-Force',
  'the-holy-city': 'Cunning-Force',
  // aspect ignore base
  'canto-bight': 'Cunning-AspectIgnore',
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
  Object.keys(baseSpecialNames).forEach(baseCardId => {
    const card = cardList[baseCardId];
    if (card?.set !== set) return;
    const aspect = card?.aspects[0];
    if (!aspect || (single && byAspect[aspect])) return;
    byAspect[aspect] = true;
    basicBaseIds.push(baseCardId);
  });
  return basicBaseIds;
};
