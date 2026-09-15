import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const snowtrooper = {
  cardId: 'snowtrooper',
  name: 'Snowtrooper',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;
