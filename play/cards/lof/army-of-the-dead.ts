import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const armyOfTheDead = {
  cardId: 'army-of-the-dead',
  name: 'Army of the Dead',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Night'],
  cost: 6,
  power: 7,
  hp: 6,
  arena: 'ground',
} as const satisfies UnitDefinition;
