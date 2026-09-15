import type { UnitDefinition } from '../definition.ts';

// ASH 040. Printed text is pinned in meta-continuous fixture.
export const poeDameronILlComeBackForYou = {
  cardId: 'poe-dameron--i-ll-come-back-for-you',
  name: "Poe Dameron, I'll Come Back For You",
  kind: 'unit',
  aspects: ['Aggression', 'Cunning', 'Heroism'],
  traits: ['Resistance'],
  cost: 2,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  auras: [
    {
      id: 'lose-sentinel',
      filter: {},
      losesKeywords: ['Sentinel'],
    },
  ],
} as const satisfies UnitDefinition;
