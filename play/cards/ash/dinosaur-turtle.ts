import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const dinosaurTurtle = {
  cardId: 'dinosaur-turtle',
  name: 'Dinosaur Turtle',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Creature'],
  cost: 6,
  power: 7,
  hp: 7,
  arena: 'ground',
} as const satisfies UnitDefinition;
