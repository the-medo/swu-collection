import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const callousBountyHunter = {
  cardId: 'callous-bounty-hunter',
  name: 'Callous Bounty Hunter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
