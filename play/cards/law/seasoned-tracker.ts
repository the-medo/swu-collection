import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const seasonedTracker = {
  cardId: 'seasoned-tracker',
  name: 'Seasoned Tracker',
  kind: 'unit',
  aspects: [],
  traits: ['Bounty Hunter'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;
