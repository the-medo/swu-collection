import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const vandorRangeTroopers = {
  cardId: 'vandor-range-troopers',
  name: 'Vandor Range Troopers',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 4,
  power: 4,
  hp: 6,
  arena: 'ground',
} as const satisfies UnitDefinition;
