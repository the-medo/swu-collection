import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const rogueClassStarfighter = {
  cardId: 'rogue-class-starfighter',
  name: 'Rogue-class Starfighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
