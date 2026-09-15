import type { UnitDefinition } from '../definition.ts';

// Official text and Dooku's phase-duration erratum are pinned in leader-exploit.json.
export const hailfireTank = {
  cardId: 'hailfire-tank',
  name: 'Hailfire Tank',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Vehicle', 'Tank'],
  cost: 8,
  power: 7,
  hp: 6,
  arena: 'ground',
  exploit: 2,
} as const satisfies UnitDefinition;
