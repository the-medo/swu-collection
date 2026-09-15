import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const quarrenContractor = {
  cardId: 'quarren-contractor',
  name: 'Quarren Contractor',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Underworld'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel', 'Grit'],
} as const satisfies UnitDefinition;
