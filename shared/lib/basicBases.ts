import { SwuAspect } from '../../types/enums.ts';

export const basicBases: Record<string, true | undefined> = {
  'capital-city': true, // vigilance
  'command-center': true, // command
  'catacombs-of-cadera': true, // aggression
  'administrator-s-tower': true, // cunning
};

export const basicBaseForAspect: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: 'capital-city',
  [SwuAspect.COMMAND]: 'command-center',
  [SwuAspect.AGGRESSION]: 'catacombs-of-cadera',
  [SwuAspect.CUNNING]: 'administrator-s-tower',
  [SwuAspect.HEROISM]: '',
  [SwuAspect.VILLAINY]: '',
};

export const basicForceBaseForAspect: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: 'nightsister-lair',
  [SwuAspect.COMMAND]: 'jedi-temple',
  [SwuAspect.AGGRESSION]: 'fortress-vader',
  [SwuAspect.CUNNING]: 'crystal-caves',
  [SwuAspect.HEROISM]: '',
  [SwuAspect.VILLAINY]: '',
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
  //force Vigilance bases
  'nightsister-lair': 'Vigilance-Force',
  'shadowed-undercity': 'Vigilance-Force',

  // basic Command bases
  'command-center': 'Command',
  'echo-base': 'Command',
  'lair-of-grievous': 'Command',
  'maz-kanata-s-castle': 'Command',
  'nevarro-city': 'Command',
  'resistance-headquarters': 'Command',
  'theed-palace': 'Command',
  'tipoca-city': 'Command',
  //force Command bases
  'jedi-temple': 'Command-Force',
  'starlight-temple': 'Command-Force',

  // basic Aggresion bases
  'catacombs-of-cadera': 'Aggression',
  'death-watch-hideout': 'Aggression',
  'kcm-mining-facility': 'Aggression',
  'kestro-city': 'Aggression',
  'massassi-temple': 'Aggression',
  'nadiri-dockyards': 'Aggression',
  'spice-mines': 'Aggression',
  'the-nest': 'Aggression',
  // force Aggresion bases
  'fortress-vader': 'Aggression-Force',
  'strangled-cliffs': 'Aggression-Force',

  // basic Cunning bases
  'administrator-s-tower': 'Cunning',
  'chopper-base': 'Cunning',
  'coronet-city': 'Cunning',
  'jabba-s-palace': 'Cunning',
  'level-1313': 'Cunning',
  'mos-eisley': 'Cunning',
  'pyke-palace': 'Cunning',
  // force Cunning bases
  'crystal-caves': 'Cunning-Force',
  'the-holy-city': 'Cunning-Force',
};

export const baseSpecialNameValues = new Set(Object.values(baseSpecialNames));

export const getSpecialBaseName = (baseCardId: string | undefined) =>
  baseCardId
    ? baseSpecialNameValues.has(baseCardId)
      ? baseCardId
      : baseSpecialNames[baseCardId]
    : undefined;
