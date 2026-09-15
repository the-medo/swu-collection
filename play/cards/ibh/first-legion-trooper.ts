import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const firstLegionTrooper = {
  cardId: 'first-legion-trooper',
  name: 'First Legion Trooper',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
