import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const hyperspaceWayfarer = {
  cardId: 'hyperspace-wayfarer',
  name: 'Hyperspace Wayfarer',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 6,
  power: 4,
  hp: 10,
  arena: 'space',
} as const satisfies UnitDefinition;
