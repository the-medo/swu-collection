import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const followerOfTheCode = {
  cardId: 'follower-of-the-code',
  name: 'Follower of the Code',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Droid', 'Bounty Hunter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  restore: 1,
} as const satisfies UnitDefinition;
