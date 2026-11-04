import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetBlackSunStarfighter = {
  cardId: 'black-sun-starfighter',
  name: 'Black Sun Starfighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 2,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
