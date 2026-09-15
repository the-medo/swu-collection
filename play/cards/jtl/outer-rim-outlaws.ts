import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const outerRimOutlaws = {
  cardId: 'outer-rim-outlaws',
  name: 'Outer Rim Outlaws',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;
