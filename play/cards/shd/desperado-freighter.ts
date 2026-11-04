import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDesperadoFreighter = {
  cardId: 'desperado-freighter',
  name: 'Desperado Freighter',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'space',
} as const satisfies UnitDefinition;
