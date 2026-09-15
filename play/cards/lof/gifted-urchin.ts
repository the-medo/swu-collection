import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const giftedUrchin = {
  cardId: 'gifted-urchin',
  name: 'Gifted Urchin',
  kind: 'unit',
  aspects: [],
  traits: ['Force', 'Fringe'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
