import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const eWebGunner = {
  cardId: 'e-web-gunner',
  name: 'E-Web Gunner',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 0,
  hp: 4,
  arena: 'ground',
  raid: 4,
} as const satisfies UnitDefinition;
