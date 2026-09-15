import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const snowtrooperVanguard = {
  cardId: 'snowtrooper-vanguard',
  name: 'Snowtrooper Vanguard',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;
