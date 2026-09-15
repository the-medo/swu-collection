import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const fallenJedi = {
  cardId: 'fallen-jedi',
  name: 'Fallen Jedi',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Jedi'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
