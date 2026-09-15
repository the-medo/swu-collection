import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const magistrateSScout = {
  cardId: 'magistrate-s-scout',
  name: "Magistrate's Scout",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;
