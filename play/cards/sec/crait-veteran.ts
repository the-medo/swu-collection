import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const craitVeteran = {
  cardId: 'crait-veteran',
  name: 'Crait Veteran',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Resistance', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;
