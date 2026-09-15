import type { UnitDefinition } from '../definition.ts';

// ASH . V8 rules; printed text pinned in meta combat fixture.
export const unsanctionedPatrol = {
  cardId: 'unsanctioned-patrol',
  name: 'Unsanctioned Patrol',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'space',
  keywords: ['Support', 'Saboteur'],
} as const satisfies UnitDefinition;
