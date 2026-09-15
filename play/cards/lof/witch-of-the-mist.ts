import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const witchOfTheMist = {
  cardId: 'witch-of-the-mist',
  name: 'Witch of the Mist',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Night'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
