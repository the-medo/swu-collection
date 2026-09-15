import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const chandrilanSponsor = {
  cardId: 'chandrilan-sponsor',
  name: 'Chandrilan Sponsor',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Official'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
