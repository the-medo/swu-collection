import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const republicAurekStarfighter = {
  cardId: 'republic-aurek-starfighter',
  name: 'Republic Aurek Starfighter',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
