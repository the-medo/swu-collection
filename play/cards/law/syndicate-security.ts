import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const syndicateSecurity = {
  cardId: 'syndicate-security',
  name: 'Syndicate Security',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;
