import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const ravenousRathtar = {
  cardId: 'ravenous-rathtar',
  name: 'Ravenous Rathtar',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 6,
  power: 8,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;
