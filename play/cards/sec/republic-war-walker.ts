import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const republicWarWalker = {
  cardId: 'republic-war-walker',
  name: 'Republic War Walker',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Walker'],
  cost: 6,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
