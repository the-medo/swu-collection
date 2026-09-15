import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const outerRimMystic = {
  cardId: 'outer-rim-mystic',
  name: 'Outer Rim Mystic',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Force', 'Fringe'],
  cost: 3,
  power: 2,
  hp: 6,
  arena: 'ground',
} as const satisfies UnitDefinition;
