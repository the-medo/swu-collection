import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const defenseFleetXWing = {
  cardId: 'defense-fleet-x-wing',
  name: 'Defense Fleet X-Wing',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 1,
  hp: 4,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
