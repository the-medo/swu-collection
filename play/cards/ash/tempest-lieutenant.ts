import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const tempestLieutenant = {
  cardId: 'tempest-lieutenant',
  name: 'Tempest Lieutenant',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
