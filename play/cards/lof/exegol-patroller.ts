import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const exegolPatroller = {
  cardId: 'exegol-patroller',
  name: 'Exegol Patroller',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Sith', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'space',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
