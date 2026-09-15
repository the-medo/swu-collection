import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const beachPatrolAtAct = {
  cardId: 'beach-patrol-at-act',
  name: 'Beach Patrol AT-ACT',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 8,
  power: 8,
  hp: 9,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;
