import type { UnitDefinition } from '../definition.ts';

// ASH . V8 rules; printed text pinned in meta combat fixture.
export const fennecShandTheGalaxyIsDangerous = {
  cardId: 'fennec-shand--the-galaxy-is-dangerous',
  name: 'Fennec Shand, The Galaxy Is Dangerous',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur', 'Ambush'],
} as const satisfies UnitDefinition;
