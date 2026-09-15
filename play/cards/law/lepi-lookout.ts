import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const lepiLookout = {
  cardId: 'lepi-lookout',
  name: 'Lepi Lookout',
  kind: 'unit',
  aspects: ['Vigilance', 'Command'],
  traits: ['Underworld'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  keywords: ['Shielded', 'Overwhelm'],
} as const satisfies UnitDefinition;
