import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetResourcefulPursuers = {
  cardId: 'resourceful-pursuers',
  name: 'Resourceful Pursuers',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Bounty Hunter'],
  cost: 5,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;
