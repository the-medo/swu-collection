import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDroidStarfighter = {
  cardId: 'droid-starfighter',
  name: 'Droid Starfighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
